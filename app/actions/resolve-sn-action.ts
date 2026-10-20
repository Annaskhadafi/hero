'use server'

import { db } from '@/db'
import { centralServiceEmployees } from '@/db/schema/central-service'
import { employees } from '@/db/schema/hero'
import { user } from '@/db/schema/auth'
import { and, eq, or, sql } from 'drizzle-orm'
import type { AnyColumn } from 'drizzle-orm'

function buildSnLookupVariants(sn: string) {
  const trimmedSn = sn.trim()
  const upperSn = trimmedSn.toUpperCase()
  const withoutEmployeePrefix = upperSn.replace(/^EMP[-\s]*/i, '')
  const withoutLeadingZeroes = withoutEmployeePrefix.replace(/^0+/, '')
  const variants = new Set([
    trimmedSn,
    upperSn,
    withoutEmployeePrefix,
    withoutLeadingZeroes,
  ])

  if (withoutEmployeePrefix) {
    variants.add(`EMP-${withoutEmployeePrefix}`)
    if (withoutLeadingZeroes) {
      variants.add(`EMP-${withoutLeadingZeroes}`)
      variants.add(withoutLeadingZeroes.padStart(5, '0'))
      variants.add(`EMP-${withoutLeadingZeroes.padStart(5, '0')}`)
      variants.add(withoutLeadingZeroes.padStart(6, '0'))
      variants.add(`EMP-${withoutLeadingZeroes.padStart(6, '0')}`)
    }
  }

  return [...variants].map((variant) => variant.trim().toUpperCase()).filter(Boolean)
}

function snMatches(column: AnyColumn, snVariants: string[]) {
  const normalizedColumn = sql<string>`upper(trim(${column}))`
  const strippedColumn = sql<string>`ltrim(replace(upper(trim(${column})), 'EMP-', ''), '0')`

  const rawMatches = snVariants.map((variant) => eq(normalizedColumn, variant))
  const strippedVariants = snVariants.map((v) => v.replace(/^EMP[-\s]*/i, '').replace(/^0+/, '')).filter(Boolean)
  const strippedMatches = strippedVariants.map((sv) => eq(strippedColumn, sv))
  const emailMatches = strippedVariants.map((sv) => sql<boolean>`upper(trim(${column})) LIKE ${sv.toUpperCase() + '@%'}`)

  return or(...rawMatches, ...strippedMatches, ...emailMatches)
}

function isDbConnectionError(err: any): boolean {
  if (!err) return false
  const msg = (err.message || '').toLowerCase()
  const code = (err.code || '').toLowerCase()
  return (
    msg.includes('connection terminated') ||
    msg.includes('timeout') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('closed unexpectedly') ||
    code === '57p01' ||
    code === '57p02' ||
    code === '57p03'
  )
}

export async function resolveSnAction(sn: string) {
  if (!sn || typeof sn !== 'string') {
    return { success: false, error: 'SN required' }
  }

  const snVariants = buildSnLookupVariants(sn)

  try {
    // 1. Check employees table joined with user auth
    let matched: any = null
    try {
      const [row] = await db
        .select({
          id: employees.id,
          employeeSn: employees.employeeSn,
          email: user.email,
          fullName: employees.name,
          isActive: employees.isActive,
          employmentStatus: employees.employmentStatus,
        })
        .from(employees)
        .leftJoin(user, eq(employees.authUserId, user.id))
        .where(and(snMatches(employees.employeeSn, snVariants), sql`${user.email} is not null`))
        .orderBy(
          sql`case when ${employees.isActive} = true and lower(${employees.employmentStatus}) <> 'inactive' then 0 else 1 end`,
          sql`case when ${employees.authUserId} is not null then 0 else 1 end`,
          employees.id,
        )
        .limit(1)
      matched = row
    } catch (e: any) {
      console.warn('resolveSnAction step 1 error:', e)
      if (isDbConnectionError(e)) {
        return { success: false, error: 'Koneksi ke server database mengalami kendala/timeout. Silakan coba lagi.' }
      }
    }

    if (matched?.email) {
      if (matched.isActive === false || matched.employmentStatus === 'inactive') {
        return {
          success: false,
          error:
            'Akun Anda telah dinonaktifkan oleh administrator. Silakan hubungi tim HR / Admin.',
        }
      }
      return { success: true, email: matched.email, name: matched.fullName }
    }

    // 2. Direct employees table email lookup
    let empDirect: any = null
    try {
      const [row] = await db
        .select({
          id: employees.id,
          employeeSn: employees.employeeSn,
          email: employees.email,
          fullName: employees.name,
          isActive: employees.isActive,
          employmentStatus: employees.employmentStatus,
        })
        .from(employees)
        .where(or(snMatches(employees.employeeSn, snVariants), snMatches(employees.email, snVariants)))
        .orderBy(
          sql`case when ${employees.isActive} = true and lower(${employees.employmentStatus}) <> 'inactive' then 0 else 1 end`,
          sql`case when ${employees.authUserId} is not null then 0 else 1 end`,
          employees.id,
        )
        .limit(1)
      empDirect = row
    } catch (e: any) {
      console.warn('resolveSnAction step 2 error:', e)
      if (isDbConnectionError(e)) {
        return { success: false, error: 'Koneksi ke server database mengalami kendala/timeout. Silakan coba lagi.' }
      }
    }

    if (empDirect?.email) {
      if (empDirect.isActive === false || empDirect.employmentStatus === 'inactive') {
        return {
          success: false,
          error:
            'Akun Anda telah dinonaktifkan oleh administrator. Silakan hubungi tim HR / Admin.',
        }
      }
      return { success: true, email: empDirect.email, name: empDirect.fullName }
    }

    // 3. Fallback to centralServiceEmployees (wrapped safely)
    try {
      const [centralServiceEmp] = await db
        .select({ email: centralServiceEmployees.email, fullName: centralServiceEmployees.fullName })
        .from(centralServiceEmployees)
        .where(or(snMatches(centralServiceEmployees.employeeSn, snVariants), snMatches(centralServiceEmployees.email, snVariants)))
        .orderBy(centralServiceEmployees.id)
        .limit(1)

      if (centralServiceEmp?.email) {
        return { success: true, email: centralServiceEmp.email, name: centralServiceEmp.fullName }
      }
    } catch (e: any) {
      console.warn('resolveSnAction step 3 (centralService) skipped:', e)
      if (isDbConnectionError(e)) {
        return { success: false, error: 'Koneksi ke server database mengalami kendala/timeout. Silakan coba lagi.' }
      }
    }

    // 4. Direct user (auth) table lookup by email prefix / exact match
    try {
      const cleanSn = sn.trim().toLowerCase()
      const cleanStripped = cleanSn.replace(/^emp[-\s]*/i, '').replace(/^0+/, '')
      const [authUser] = await db
        .select({ email: user.email, name: user.name })
        .from(user)
        .where(
          or(
            eq(sql`lower(trim(${user.email}))`, cleanSn),
            sql`lower(trim(${user.email})) LIKE ${cleanSn + '@%'}`,
            cleanStripped ? sql`lower(trim(${user.email})) LIKE ${cleanStripped + '@%'}` : sql`1=0`,
            cleanStripped ? sql`lower(trim(${user.email})) LIKE ${'%' + cleanStripped + '%'} ` : sql`1=0`,
          ),
        )
        .limit(1)

      if (authUser?.email) {
        return { success: true, email: authUser.email, name: authUser.name || 'Karyawan' }
      }
    } catch (e: any) {
      console.warn('resolveSnAction step 4 (direct user) skipped:', e)
      if (isDbConnectionError(e)) {
        return { success: false, error: 'Koneksi ke server database mengalami kendala/timeout. Silakan coba lagi.' }
      }
    }

    return { success: false, error: `SN '${sn}' tidak ditemukan di database karyawan.` }
  } catch (error) {
    console.error('resolveSnAction unexpected error:', error)
    return { success: false, error: 'Gagal mencari data SN Karyawan.' }
  }
}
