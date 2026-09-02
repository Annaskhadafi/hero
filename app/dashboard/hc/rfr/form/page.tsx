import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { employees, masterDepartments, masterSections, hcRfrRequests, hcRfrApprovals } from '@/db/schema/hero'
import { eq, or, sql } from 'drizzle-orm'
import { RfrClientForm } from './client-form'

type PageProps = {
  searchParams: Promise<{
    id?: string
  }>
}

export default async function RfrCreateFormPage({ searchParams }: PageProps) {
  const params = await searchParams
  const idStr = params?.id
  let initialData: any = null
  let initialApprovals: any[] = []

  if (idStr) {
    const id = parseInt(idStr, 10)
    if (!isNaN(id)) {
      try {
        const rows = await db
          .select()
          .from(hcRfrRequests)
          .where(eq(hcRfrRequests.id, id))
          .limit(1)
        if (rows.length > 0) {
          initialData = rows[0]
          initialApprovals = await db
            .select()
            .from(hcRfrApprovals)
            .where(eq(hcRfrApprovals.rfrId, id))
            .orderBy(hcRfrApprovals.stepOrder)
        }
      } catch (err) {
        console.error('Error fetching RFR request for edit:', err)
      }
    }
  }

  const session = await getServerSession()
  let defaultRequestorEmployeeId: number | undefined = undefined
  let defaultRequestorName = session?.user?.name || ''
  let defaultRequestorJobTitle = ''
  let defaultSectionDepartment = ''

  if (session?.user?.email || session?.user?.employeeSn) {
    const userEmail = session.user.email
    const employeeSn = session.user.employeeSn ? String(session.user.employeeSn) : ''

    try {
      const rows = await db
        .select({
          id: employees.id,
          name: employees.name,
          jobTitle: employees.jobTitle,
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
        if (emp.id) defaultRequestorEmployeeId = emp.id
        if (emp.name) defaultRequestorName = emp.name
        if (emp.jobTitle) defaultRequestorJobTitle = emp.jobTitle
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
      defaultRequestorEmployeeId={defaultRequestorEmployeeId}
      defaultRequestorName={defaultRequestorName}
      defaultRequestorJobTitle={defaultRequestorJobTitle}
      defaultSectionDepartment={defaultSectionDepartment}
      initialData={initialData}
      initialApprovals={initialApprovals}
    />
  )
}
