import { ContractReviewClientForm } from "./client-form"
import { db } from "@/db"
import { hrEmployees, hrDepartments, hrPositions, hrOrgNodes, masterSections } from "@/db/schema/hero"
import { centralServiceEmployees } from "@/db/schema/central-service"
import { eq } from "drizzle-orm"

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

  const csEmps = await db
    .select({
      employeeSn: centralServiceEmployees.employeeSn,
      position: centralServiceEmployees.position,
      section: centralServiceEmployees.section,
      siteName: centralServiceEmployees.siteName,
    })
    .from(centralServiceEmployees)

  const csBySn = new Map<string, typeof csEmps[number]>()
  for (const c of csEmps) {
    csBySn.set(c.employeeSn, c)
    csBySn.set(`EMP-${c.employeeSn}`, c)
  }

  const employees = hrEmps.map((emp) => {
    const cs = csBySn.get(emp.employeeId)
    return {
      ...emp,
      position: emp.position || cs?.position || "",
      section: emp.section || cs?.section || "",
      department: emp.department || "Central Services",
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
