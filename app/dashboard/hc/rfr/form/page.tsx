import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { employees, masterDepartments, masterSections } from '@/db/schema/hero'
import { eq, or, sql } from 'drizzle-orm'
import { RfrClientForm } from './client-form'

export default async function RfrCreateFormPage() {
  const session = await getServerSession()
  let defaultRequestorName = session?.user?.name || ''
  let defaultSectionDepartment = ''

  if (session?.user?.email || session?.user?.employeeSn) {
    const userEmail = session.user.email
    const employeeSn = session.user.employeeSn ? String(session.user.employeeSn) : ''

    try {
      const rows = await db
        .select({
          name: employees.name,
          departmentName: sql<string | null>`coalesce(${masterDepartments.name}, ${employees.department})`,
          sectionName: sql<string | null>`coalesce(${masterSections.name}, ${employees.section})`,
        })
        .from(employees)
        .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
        .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
        .where(
          or(
            userEmail ? eq(employees.email, userEmail) : undefined,
            employeeSn ? eq(employees.employeeSn, employeeSn) : undefined
          )
        )
        .limit(1)

      if (rows.length > 0) {
        const emp = rows[0]
        if (emp.name) defaultRequestorName = emp.name
        const sec = emp.sectionName?.trim()
        const dept = emp.departmentName?.trim()
        if (sec && dept) {
          defaultSectionDepartment = `${sec} / ${dept}`
        } else if (sec) {
          defaultSectionDepartment = sec
        } else if (dept) {
          defaultSectionDepartment = dept
        }
      }
    } catch (err) {
      console.error('Error fetching employee details for RFR form defaults:', err)
    }
  }

  return (
    <RfrClientForm
      defaultRequestorName={defaultRequestorName}
      defaultSectionDepartment={defaultSectionDepartment}
    />
  )
}
