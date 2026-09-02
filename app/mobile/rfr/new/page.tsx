import { getServerSession } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { employees, masterDepartments, masterSections } from '@/db/schema/hero'
import { eq, or, sql } from 'drizzle-orm'
import { MobileRfrCreateFormClient } from './mobile-form-client'

export const revalidate = 0

export default async function MobileRfrCreatePage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  let defaultRequestorName = session?.user?.name || ''
  let defaultSectionDepartment = ''
  let defaultEmployeeId: number | null = null

  if (session?.user?.email || session?.user?.employeeSn) {
    const userEmail = session.user.email
    const employeeSn = session.user.employeeSn ? String(session.user.employeeSn) : ''

    try {
      const rows = await db
        .select({
          id: employees.id,
          name: employees.name,
          departmentName: sql<string | null>`coalesce(${masterDepartments.name}, ${employees.department})`,
          sectionName: sql<string | null>`coalesce(${masterSections.name}, ${employees.section})`,
        })
        .from(employees)
        .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
        .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
        .where(
          or(
            userEmail ? eq(employees.email, userEmail) : sql`false`,
            employeeSn ? eq(employees.employeeSn, employeeSn) : sql`false`
          )
        )
        .limit(1)

      if (rows.length > 0) {
        defaultEmployeeId = rows[0].id
        if (rows[0].name) defaultRequestorName = rows[0].name
        const sec = rows[0].sectionName || ''
        const dep = rows[0].departmentName || ''
        if (sec && dep) {
          defaultSectionDepartment = `${sec} / ${dep}`
        } else {
          defaultSectionDepartment = sec || dep || ''
        }
      }
    } catch (err) {
      console.error('Error fetching employee for mobile RFR:', err)
    }
  }

  return (
    <div className="pb-12 max-w-md mx-auto">
      <MobileRfrCreateFormClient
        defaultRequestorName={defaultRequestorName}
        defaultSectionDepartment={defaultSectionDepartment}
        defaultEmployeeId={defaultEmployeeId}
      />
    </div>
  )
}
