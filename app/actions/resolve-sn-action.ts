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
  const variants = new Set([trimmedSn, upperSn, withoutEmployeePrefix])

  if (withoutEmployeePrefix) {
    variants.add(`EMP-${withoutEmployeePrefix}`)
  }

  return [...variants].map((variant) => variant.trim().toUpperCase()).filter(Boolean)
}

function snMatches(column: AnyColumn, snVariants: string[]) {
  const normalizedColumn = sql<string>`upper(trim(${column}))`
  return or(...snVariants.map((variant) => eq(normalizedColumn, variant)))
}

export async function resolveSnAction(sn: string) {
  if (!sn || typeof sn !== 'string') {
    return { success: false, error: 'SN required' }
  }

  const snVariants = buildSnLookupVariants(sn)

  try {
    // 1. Check employees table joined with user auth
    const [matched] = await db
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
      .limit(1)

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
    const [empDirect] = await db
      .select({
        id: employees.id,
        employeeSn: employees.employeeSn,
        email: employees.email,
        fullName: employees.name,
        isActive: employees.isActive,
        employmentStatus: employees.employmentStatus,
      })
      .from(employees)
      .where(snMatches(employees.employeeSn, snVariants))
      .limit(1)

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

    // 3. Fallback to centralServiceEmployees
    const [centralServiceEmp] = await db
      .select({ email: centralServiceEmployees.email, fullName: centralServiceEmployees.fullName })
      .from(centralServiceEmployees)
      .where(snMatches(centralServiceEmployees.employeeSn, snVariants))
      .limit(1)

    if (centralServiceEmp?.email) {
      return { success: true, email: centralServiceEmp.email, name: centralServiceEmp.fullName }
    }

    return { success: false, error: `SN '${sn}' tidak ditemukan di database karyawan.` }
  } catch (error) {
    console.error('resolveSnAction error:', error)
    return { success: false, error: 'Gagal mencari data SN Karyawan.' }
  }
}
