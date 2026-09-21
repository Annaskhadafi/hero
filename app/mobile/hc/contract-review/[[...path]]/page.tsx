import { redirect, notFound } from 'next/navigation'

import { ContractReviewClientForm } from '@/app/dashboard/hc/contract-review/form/client-form'
import { getContractReviewById, getContractReviewSettings } from '@/app/actions/contract-review'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { db } from '@/db'
import { centralServiceEmployees } from '@/db/schema/central-service'
import { employees, hrPositions, masterDepartments, masterSections } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'

export const metadata = { title: 'Contract Review - Mobile' }

export default async function MobileContractReviewPage({
  params,
}: {
  params: Promise<{ path?: string[] }>
}) {
  const session = await getServerSession()
  if (!session?.user) redirect('/sign-in')

  const access = await getCurrentMenuPermission('hc_contract_review')
  if (!access.canView) redirect('/mobile/dashboard')

  const path = (await params).path ?? []
  if (path[0] !== 'form' || !path[1] || !/^\d+$/.test(path[1])) notFound()

  const reviewId = Number(path[1])
  const [reviewResult, settings, hrEmps, csEmps] = await Promise.all([
    getContractReviewById(reviewId),
    getContractReviewSettings(),
    db
      .select({
        id: employees.id,
        name: employees.name,
        employeeId: employees.employeeSn,
        department: masterDepartments.name,
        position: hrPositions.levelName,
        rank: hrPositions.rankName,
        section: masterSections.name,
        joinDate: employees.joinDate,
        departmentId: employees.departmentId,
        sectionId: employees.sectionId,
        isManagerial: hrPositions.isManagerial,
      })
      .from(employees)
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .where(eq(employees.isActive, true)),
    db
      .select({
        employeeSn: centralServiceEmployees.employeeSn,
        position: centralServiceEmployees.position,
        section: centralServiceEmployees.section,
        siteName: centralServiceEmployees.siteName,
      })
      .from(centralServiceEmployees),
  ])

  if (!reviewResult.success || !reviewResult.data) notFound()

  const csBySn = new Map<string, (typeof csEmps)[number]>()
  for (const employee of csEmps) {
    csBySn.set(employee.employeeSn, employee)
    csBySn.set(`EMP-${employee.employeeSn}`, employee)
  }

  const employeeList = hrEmps.map((employee) => {
    const centralService = csBySn.get(employee.employeeId)
    return {
      ...employee,
      position: employee.position || centralService?.position || '',
      section: employee.section || centralService?.section || '',
      department: employee.department || 'Central Services',
      siteName: centralService?.siteName || '',
    }
  })

  return (
    <div className="min-h-[calc(100dvh-7rem)] bg-slate-50">
      <ContractReviewClientForm
        employees={employeeList}
        initialData={reviewResult.data}
        approvalSettings={settings as any}
      />
    </div>
  )
}
