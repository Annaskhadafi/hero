import { ContractReviewClientForm } from "./client-form"
import { db } from "@/db"
import { hrEmployees, hrDepartments, hrPositions, hrOrgNodes, masterSections, employees as userMgmtEmployees } from "@/db/schema/hero"
import { eq, or, sql } from "drizzle-orm"

export const metadata = {
  title: "Form Contract Review - HC",
}

export default async function ContractReviewFormPage() {
  const hrEmps = await db
    .select({
      id: hrEmployees.id,
      name: hrEmployees.fullName,
      employeeId: hrEmployees.employeeId,
      department: hrDepartments.name,
      position: hrPositions.levelName,
      rank: hrPositions.rankName,
      section: masterSections.name,
      joinDate: hrEmployees.joinDate,
      orgNodeId: hrEmployees.orgNodeId,
      departmentId: hrEmployees.departmentId,
      sectionId: hrEmployees.sectionId,
      isManagerial: hrPositions.isManagerial,
    })
    .from(hrEmployees)
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
    .leftJoin(masterSections, eq(hrEmployees.sectionId, masterSections.id))
    .where(eq(hrEmployees.isActive, true))

  // Also fetch User Management employees as fallback (Central Service employees live here)
  const umEmps = await db
    .select({
      employeeSn: userMgmtEmployees.employeeSn,
      jobTitle: userMgmtEmployees.jobTitle,
      section: userMgmtEmployees.section,
      department: userMgmtEmployees.department,
    })
    .from(userMgmtEmployees)
    .where(eq(userMgmtEmployees.isActive, true))

  // Merge: if hrEmployees has position, use it; otherwise fallback to userMgmt jobTitle
  const snToUm = new Map<string, typeof umEmps[number]>()
  for (const u of umEmps) {
    const plain = u.employeeSn.replace(/^EMP-/i, "")
    snToUm.set(plain, u)
    snToUm.set(u.employeeSn, u)
  }

  const employees = hrEmps.map((emp) => {
    const um = snToUm.get(emp.employeeId)
    const hasPosition = Boolean(emp.position)
    return {
      ...emp,
      position: hasPosition ? emp.position : (um?.jobTitle || emp.position || ""),
      section: emp.section || um?.section || "",
      department: emp.department || um?.department || "",
    }
  })

  const orgNodes = await db.select({
    id: hrOrgNodes.id,
    parentNodeId: hrOrgNodes.parentNodeId,
  }).from(hrOrgNodes)

  return (
    <ContractReviewClientForm employees={employees} orgNodes={orgNodes} />
  )
}
