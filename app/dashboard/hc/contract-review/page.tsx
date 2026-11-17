import { getContractReviewSettings, getContractReviews, getExpiringContractEmployees } from "@/app/actions/contract-review"
import { ContractReviewClientPage } from "./client-page"
import { db } from "@/db"
import { employees, hrPositions, masterSections } from "@/db/schema/hero"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { getCurrentEmployeeAccessRole, getCurrentMenuPermission, isSuperAdminRole } from "@/lib/hero-access"

export const metadata = {
  title: "Employee Contract Review - HC",
}

function populateEmailsFromEmployees(settings: any, empList: any[]) {
  const nameToEmail = new Map<string, string>()
  for (const emp of empList) {
    if (emp.name && emp.email) nameToEmail.set(emp.name, emp.email)
  }
  const s = { ...settings }
  s.approvalMatrix = { ...s.approvalMatrix }
  s.approvalMatrix.managerEmail = s.approvalMatrix.managerEmail || nameToEmail.get(s.approvalMatrix.managerName) || ''
  s.approvalMatrix.hrEmail = s.approvalMatrix.hrEmail || nameToEmail.get(s.approvalMatrix.hrName) || ''
  s.approvalMatrix.sectionHeads = { ...s.approvalMatrix.sectionHeads }
  for (const key of ['repairRetread', 'serviceMvc', 'serviceOthers'] as const) {
    const sh = s.approvalMatrix.sectionHeads[key]
    s.approvalMatrix.sectionHeads[key] = {
      ...sh,
      email: sh.email || nameToEmail.get(sh.name) || '',
    }
  }
  return s
}

export default async function ContractReviewPage() {
  const [access, role] = await Promise.all([
    getCurrentMenuPermission('hc_contract_review'),
    getCurrentEmployeeAccessRole(),
  ])
  if (!access.canView) {
    redirect('/dashboard')
  }

  const [reviewsResult, settings, expiringEmployees, employeeList] = await Promise.all([
    getContractReviews(),
    getContractReviewSettings(),
    getExpiringContractEmployees(),
    db
      .select({
        id: employees.id,
        name: employees.name,
        employeeId: employees.employeeSn,
        email: employees.email,
        jobTitle: employees.jobTitle,
        position: hrPositions.levelName,
        rank: hrPositions.rankName,
        section: masterSections.name,
      })
      .from(employees)
      .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .where(eq(employees.isActive, true)),
  ])
  const reviews = reviewsResult.success ? reviewsResult.data : []
  const enrichedSettings = populateEmailsFromEmployees(settings, employeeList)

  return (
    <ContractReviewClientPage
      reviews={reviews as any[]}
      employees={employeeList}
      settings={enrichedSettings as any}
      expiringEmployees={expiringEmployees as any[]}
      isSuperAdmin={isSuperAdminRole(role)}
    />
  )
}
