import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const employeeId = Number(url.searchParams.get('employeeId'))
  if (!employeeId) return Response.json({ name: null, email: null }, { status: 400 })

  try {
    const [emp] = await db
      .select({ managerId: employees.directManagerId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1)

    if (!emp?.managerId) return Response.json({ name: null, email: null })

    const [mgr] = await db
      .select({ name: employees.name, email: employees.email })
      .from(employees)
      .where(eq(employees.id, emp.managerId))
      .limit(1)

    return Response.json(mgr ?? { name: null, email: null })
  } catch {
    return Response.json({ name: null, email: null })
  }
}
