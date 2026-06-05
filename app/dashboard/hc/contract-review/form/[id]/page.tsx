import { ContractReviewClientForm } from "../client-form"
import { getContractReviewById } from "@/app/actions/contract-review"
import { db } from "@/db"
import { hrEmployees, hrDepartments, hrPositions, hrOrgNodes } from "@/db/schema/hero"
import { eq } from "drizzle-orm"
import { notFound } from "next/navigation"

export const metadata = {
  title: "Form Contract Review - HC",
}

export default async function ContractReviewEditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const id = parseInt(resolvedParams.id)
  if (isNaN(id)) return notFound()

  const reviewResult = await getContractReviewById(id)
  if (!reviewResult.success || !reviewResult.data) return notFound()

  const employees = await db
    .select({
      id: hrEmployees.id,
      name: hrEmployees.fullName,
      employeeId: hrEmployees.employeeId,
      department: hrDepartments.name,
      position: hrPositions.levelName,
      rank: hrPositions.rankName,
      joinDate: hrEmployees.joinDate,
      orgNodeId: hrEmployees.orgNodeId,
      departmentId: hrEmployees.departmentId,
      sectionId: hrEmployees.sectionId,
      isManagerial: hrPositions.isManagerial,
    })
    .from(hrEmployees)
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
    .where(eq(hrEmployees.isActive, true))

  const orgNodes = await db.select({
    id: hrOrgNodes.id,
    parentNodeId: hrOrgNodes.parentNodeId,
  }).from(hrOrgNodes)

  return (
    <ContractReviewClientForm employees={employees} orgNodes={orgNodes} initialData={reviewResult.data} />
  )
}
