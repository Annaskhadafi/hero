import { eq, and, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const employeeId = Number(url.searchParams.get('employeeId'))
  if (!employeeId) return Response.json({ name: null, email: null }, { status: 400 })

  try {
    // 1. Get employee info (department for fallback)
    const [emp] = await db
      .select({
        managerId: employees.directManagerId,
        department: employees.department,
        section: employees.section,
      })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1)

    if (!emp) return Response.json({ name: null, email: null })

    // 2. Try directManagerId first
    if (emp.managerId) {
      const [mgr] = await db
        .select({ name: employees.name, email: employees.email })
        .from(employees)
        .where(eq(employees.id, emp.managerId))
        .limit(1)
      if (mgr) return Response.json(mgr)
    }

    // 3. Fallback: find manager/head in same department
    const dept = emp.department?.trim()
    if (dept) {
      const heads = await db
        .select({ name: employees.name, email: employees.email })
        .from(employees)
        .where(
          and(
            eq(employees.isActive, true),
            eq(employees.department, dept),
            or(
              sql`LOWER(${employees.jobTitle}) LIKE '%manager%'`,
              sql`LOWER(${employees.jobTitle}) LIKE '%head%'`,
              sql`LOWER(${employees.role}) LIKE '%manager%'`,
              sql`LOWER(${employees.role}) LIKE '%head%'`,
              sql`LOWER(${employees.jobTitle}) LIKE '%supervisor%'`,
              sql`LOWER(${employees.jobTitle}) LIKE '%coordinator%'`,
            ),
          )
        )
        .limit(1)

      if (heads.length > 0) return Response.json(heads[0])
    }

    // 4. No manager found
    return Response.json({ name: '(tidak ada atasan)', email: '(tidak ada email)' })
  } catch {
    return Response.json({ name: '(error)', email: '(error)' })
  }
}
