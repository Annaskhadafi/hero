import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { getAllSectionHeads } from '@/lib/sio-reminder'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const employeeId = Number(url.searchParams.get('employeeId'))
  if (!employeeId) return Response.json({ name: null, email: null }, { status: 400 })

  try {
    // 1. Get employee info
    const [emp] = await db
      .select({ department: employees.department, section: employees.section })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1)

    if (!emp) return Response.json({ name: '(tidak ditemukan)', email: '(tidak ditemukan)' })

    // 2. Get all section heads (same data as Reminder Settings)
    const allHeads = await getAllSectionHeads()

    // 3. Find the section head for this employee's department/section
    const dept = emp.department?.trim().toLowerCase() || ''
    const section = emp.section?.trim().toLowerCase() || ''

    // Priority: same department + same section > same department only
    let head = allHeads.find(
      (h) => h.department?.trim().toLowerCase() === dept && h.section?.trim().toLowerCase() === section
    )
    if (!head) {
      head = allHeads.find((h) => h.department?.trim().toLowerCase() === dept)
    }

    if (head) {
      return Response.json({ name: head.name, email: head.email || '(tidak ada email)' })
    }

    return Response.json({ name: '(tidak ada atasan)', email: '(tidak ada email)' })
  } catch {
    return Response.json({ name: '(error)', email: '(error)' })
  }
}
