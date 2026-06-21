import { ContractReviewClientForm } from "../client-form"
import { getContractReviewById, getContractReviewSettings } from "@/app/actions/contract-review"
import { db } from "@/db"
import { employees, hrPositions, hrOrgNodes, masterDepartments, masterSections } from "@/db/schema/hero"
import { centralServiceEmployees } from "@/db/schema/central-service"
import { hcContractReviewApprovals } from "@/db/schema/hero"
import { asc, eq, inArray } from "drizzle-orm"
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

  const [hrEmps, csEmps, orgNodes, allApprovals, sectionRows, departmentRows] = await Promise.all([
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
        orgNodeId: employees.orgNodeId,
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
    db.select({
      id: hrOrgNodes.id,
      parentNodeId: hrOrgNodes.parentNodeId,
    }).from(hrOrgNodes),
    db
      .select()
      .from(hcContractReviewApprovals)
      .where(eq(hcContractReviewApprovals.reviewId, id))
      .orderBy(asc(hcContractReviewApprovals.stepOrder)),
    db.select().from(masterSections),
    db.select().from(masterDepartments),
  ])

  const csBySn = new Map<string, typeof csEmps[number]>()
  for (const c of csEmps) {
    csBySn.set(c.employeeSn, c)
    csBySn.set(`EMP-${c.employeeSn}`, c)
  }

  const employeeList = hrEmps.map((emp) => {
    const cs = csBySn.get(emp.employeeId)
    return {
      ...emp,
      position: emp.position || cs?.position || "",
      section: emp.section || cs?.section || "",
      department: emp.department || "Central Services",
      siteName: cs?.siteName || "",
    }
  })

  const headEmployeeIds = Array.from(
    new Set(
      [...sectionRows.map((row) => row.headEmployeeId), ...departmentRows.map((row) => row.headEmployeeId)].filter(
        (value): value is number => value != null,
      ),
    ),
  )

  const headUsers =
    headEmployeeIds.length === 0
      ? []
      : await db
          .select({
            id: employees.id,
            name: employees.name,
            email: employees.email,
            jobTitle: employees.jobTitle,
          })
          .from(employees)
          .where(inArray(employees.id, headEmployeeIds))

  const headUserMap = new Map(headUsers.map((item) => [item.id, item]))
  const masterHeadMap = {
    sections: Object.fromEntries(
      sectionRows.map((row) => [
        String(row.id),
        {
          headEmployeeId: row.headEmployeeId,
          headName: row.headEmployeeId ? headUserMap.get(row.headEmployeeId)?.name ?? "" : "",
          headEmail: row.headEmployeeId ? headUserMap.get(row.headEmployeeId)?.email ?? "" : "",
          headTitle: row.headEmployeeId ? headUserMap.get(row.headEmployeeId)?.jobTitle ?? "Section Head" : "Section Head",
          departmentId: row.departmentId,
        },
      ]),
    ),
    departments: Object.fromEntries(
      departmentRows.map((row) => [
        String(row.id),
        {
          headEmployeeId: row.headEmployeeId,
          headName: row.headEmployeeId ? headUserMap.get(row.headEmployeeId)?.name ?? "" : "",
          headEmail: row.headEmployeeId ? headUserMap.get(row.headEmployeeId)?.email ?? "" : "",
          headTitle: row.headEmployeeId ? headUserMap.get(row.headEmployeeId)?.jobTitle ?? "Department Head" : "Department Head",
        },
      ]),
    ),
  }

  return (
    <ContractReviewClientForm employees={employeeList} orgNodes={orgNodes} initialData={reviewResult.data} approvalSettings={approvalSettings as any} approvalHistory={allApprovals as any[]} masterHeadMap={masterHeadMap} />
  )
}
