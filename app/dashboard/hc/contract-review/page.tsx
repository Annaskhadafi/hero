import { getContractReviewSettings, getContractReviews } from "@/app/actions/contract-review"
import { ContractReviewClientPage } from "./client-page"
import { db } from "@/db"
import { employees } from "@/db/schema/hero"
import { eq } from "drizzle-orm"

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
  const [reviewsResult, settings] = await Promise.all([getContractReviews(), getContractReviewSettings()])
  const reviews = reviewsResult.success ? reviewsResult.data : []
  
  const [hrEmps, umEmps] = await Promise.all([
    db
      .select({
        id: employees.id,
        name: employees.name,
        employeeId: employees.employeeSn,
        department: employees.departmentId,
      })
      .from(employees)
      .where(eq(employees.isActive, true)),
    db
      .select({ name: employees.name, email: employees.email })
      .from(employees)
      .where(eq(employees.isActive, true)),
  ])

  const employeeList = hrEmps.map((emp) => ({ ...emp }))
  const enrichedSettings = populateEmailsFromEmployees(settings, umEmps)

  return (
    <ContractReviewClientPage
      reviews={reviews as any[]}
      employees={employeeList}
      settings={enrichedSettings as any}
    />
  )
}
