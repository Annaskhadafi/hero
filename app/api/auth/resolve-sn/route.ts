import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { centralServiceEmployees } from '@/db/schema/central-service'
import { employees, hrEmployees } from '@/db/schema/hero'
import { eq, or, sql } from 'drizzle-orm'
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

    const [hrEmp] = await db
      .select({ email: hrEmployees.email, fullName: hrEmployees.fullName })
      .from(hrEmployees)
      .where(snMatches(hrEmployees.employeeId, snVariants))
      .limit(1)

    if (hrEmp?.email) {
      return NextResponse.json({ email: hrEmp.email, name: hrEmp.fullName })
    }

    if (hrEmp && !hrEmp.email) {
      return NextResponse.json(
        { error: 'SN ditemukan tapi belum terdaftar email. Hubungi admin untuk aktivasi akun.' },
        { status: 404 }
      )
    }

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

    const [legacyEmp] = await db
      .select({ email: employees.email, name: employees.name })
      .from(employees)
      .where(snMatches(employees.employeeSn, snVariants))
      .limit(1)

    if (legacyEmp?.email) {
      return NextResponse.json({ email: legacyEmp.email, name: legacyEmp.name })
    }

    if (legacyEmp && !legacyEmp.email) {
      return NextResponse.json(
        { error: 'SN ditemukan tapi belum terdaftar email. Hubungi admin untuk aktivasi akun.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  } catch (error) {
    console.error('resolve-sn error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
