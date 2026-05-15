import { NextRequest, NextResponse } from ''next/server''
import { db } from ''@/db''
import { employees, hrEmployees } from ''@/db/schema/hero''
import { eq } from ''drizzle-orm''

export async function POST(req: NextRequest) {
  try {
    const { sn } = await req.json()
    if (!sn || typeof sn !== ''string'') {
      return NextResponse.json({ error: ''SN required'' }, { status: 400 })
    }

    const normalizedSn = sn.trim().toUpperCase()

    const [hrEmp] = await db
      .select({ email: hrEmployees.email, fullName: hrEmployees.fullName })
      .from(hrEmployees)
      .where(eq(hrEmployees.employeeId, normalizedSn))
      .limit(1)

    if (hrEmp?.email) {
      return NextResponse.json({ email: hrEmp.email, name: hrEmp.fullName })
    }

    const [hrEmpOrig] = await db
      .select({ email: hrEmployees.email, fullName: hrEmployees.fullName })
      .from(hrEmployees)
      .where(eq(hrEmployees.employeeId, sn.trim()))
      .limit(1)

    if (hrEmpOrig?.email) {
      return NextResponse.json({ email: hrEmpOrig.email, name: hrEmpOrig.fullName })
    }

    const [legacyEmp] = await db
      .select({ email: employees.email, name: employees.name })
      .from(employees)
      .where(eq(employees.employeeSn, normalizedSn))
      .limit(1)

    if (legacyEmp?.email) {
      return NextResponse.json({ email: legacyEmp.email, name: legacyEmp.name })
    }

    return NextResponse.json({ error: ''Employee not found'' }, { status: 404 })
  } catch (error) {
    console.error(''resolve-sn error:'', error)
    return NextResponse.json({ error: ''Internal server error'' }, { status: 500 })
  }
}