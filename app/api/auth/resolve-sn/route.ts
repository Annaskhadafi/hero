import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { employees, hrEmployees } from '@/db/schema/hero'
import { inArray } from 'drizzle-orm'

function buildSnLookupVariants(sn: string) {
  const trimmedSn = sn.trim()
  const upperSn = trimmedSn.toUpperCase()
  const withoutEmployeePrefix = upperSn.replace(/^EMP-/i, '')
  const variants = new Set([trimmedSn, upperSn, withoutEmployeePrefix])

  if (withoutEmployeePrefix) {
    variants.add(`EMP-${withoutEmployeePrefix}`)
  }

  return [...variants].filter(Boolean)
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
      .where(inArray(hrEmployees.employeeId, snVariants))
      .limit(1)

    if (hrEmp?.email) {
      return NextResponse.json({ email: hrEmp.email, name: hrEmp.fullName })
    }

    const [legacyEmp] = await db
      .select({ email: employees.email, name: employees.name })
      .from(employees)
      .where(inArray(employees.employeeSn, snVariants))
      .limit(1)

    if (legacyEmp?.email) {
      return NextResponse.json({ email: legacyEmp.email, name: legacyEmp.name })
    }

    return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
  } catch (error) {
    console.error('resolve-sn error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
