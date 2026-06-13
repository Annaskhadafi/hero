import { ContractReviewClientForm } from "../client-form"
import { getContractReviewById, getContractReviewSettings } from "@/app/actions/contract-review"
import { db } from "@/db"
import { hrEmployees, hrDepartments, hrPositions, hrOrgNodes, masterSections } from "@/db/schema/hero"
import { centralServiceEmployees } from "@/db/schema/central-service"
import { hcContractReviewApprovals } from "@/db/schema/hero"
import { asc, eq } from "drizzle-orm"
import { notFound } from "next/navigation"

export const metadata = {
  title: "Form Contract Review - HC",
}

export default async function ContractReviewEditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const id = parseInt(resolvedParams.id)
  if (isNaN(id)) return notFound()

  const [reviewResult, approvalSettings] = await Promise.all([
    getContractReviewById(id),
    getContractReviewSettings(),
  ])
  if (!reviewResult.success || !reviewResult.data) return notFound()

  const [hrEmps, csEmps, orgNodes, allApprovals] = await Promise.all([
    db
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
      .where(eq(hrEmployees.isActive, true)),
    db
      .select({
        employeeSn: centralServiceEmployees.employeeSn,
        position: centralServiceEmployees.position,
        section: centralServiceEmployees.section,
        siteName: centralServiceEmployees.siteName,
      })
      .from(centralServiceEmployees),
    db.select({
      id: hrOrgNodes.id,
      parentNodeId: hrOrgNodes.parentNodeId,
    }).from(hrOrgNodes),
    db
      .select()
      .from(hcContractReviewApprovals)
      .where(eq(hcContractReviewApprovals.reviewId, id))
      .orderBy(asc(hcContractReviewApprovals.stepOrder)),
  ])

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
      siteName: cs?.siteName || "",
    }
  })

  return (
    <ContractReviewClientForm employees={employees} orgNodes={orgNodes} initialData={reviewResult.data} approvalSettings={approvalSettings as any} approvalHistory={allApprovals as any[]} />
  )
}
