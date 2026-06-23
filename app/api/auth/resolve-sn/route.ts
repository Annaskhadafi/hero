import { NextRequest, NextResponse } from 'next/server'
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

  return [...variants]
    .map((variant) => variant.trim().toUpperCase())
    .filter(Boolean)
}

function snMatches(column: AnyColumn, snVariants: string[]) {
  const normalizedColumn = sql<string>`upper(trim(${column}))`
  return or(...snVariants.map((variant) => eq(normalizedColumn, variant)))
}

export async function POST(req: NextRequest) {
  try {
    const { sn } = await req.json()
    if (!sn || typeof sn !== 'string') {
      return NextResponse.json({ error: 'SN required' }, { status: 400 })
    }

    const snVariants = buildSnLookupVariants(sn)

    // 1. Cari via employees → user (authUserId) untuk dapet email login yg cocok better-auth
    const [matched] = await db
      .select({ email: user.email, fullName: employees.name })
      .from(employees)
      .leftJoin(user, eq(employees.authUserId, user.id))
      .where(and(snMatches(employees.employeeSn, snVariants), sql`${user.email} is not null`))
      .limit(1)

    if (matched?.email) {
      return NextResponse.json({ email: matched.email, name: matched.fullName })
    }

    // 2. Fallback ke centralServiceEmployees
    const [centralServiceEmp] = await db
      .select({ email: centralServiceEmployees.email, fullName: centralServiceEmployees.fullName })
      .from(centralServiceEmployees)
      .where(snMatches(centralServiceEmployees.employeeSn, snVariants))
      .limit(1)

    if (centralServiceEmp?.email) {
      return NextResponse.json({ email: centralServiceEmp.email, name: centralServiceEmp.fullName })
    }

    if (centralServiceEmp && !centralServiceEmp.email) {
      return NextResponse.json(
        { error: 'SN ditemukan tapi belum terdaftar email. Hubungi admin untuk aktivasi akun.' },
        { status: 404 }
      )
    }

    // 3. Final fallback — employees.email (mungkin ga cocok better-auth)
    const [empEmail] = await db
      .select({ email: employees.email, name: employees.name })
      .from(employees)
      .where(and(snMatches(employees.employeeSn, snVariants), sql`${employees.email} is not null`))
      .limit(1)

    if (empEmail?.email) {
      return NextResponse.json({ email: empEmail.email, name: empEmail.name })
    }

    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  } catch (error) {
    console.error('resolve-sn error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
