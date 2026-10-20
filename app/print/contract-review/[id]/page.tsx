import { notFound } from 'next/navigation'
import { getContractReviewById } from '@/app/actions/contract-review'
import { db } from '@/db'
import { employees, hrPositions, masterDepartments, masterSections, hcContractReviewApprovals } from '@/db/schema/hero'
import { eq, asc } from 'drizzle-orm'
import { ContractReviewPrintView } from './print-view'

export const dynamic = 'force-dynamic'

export default async function PrintContractReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ embedded?: string }>
}) {
  const { id } = await params
  const { embedded } = (await searchParams) || {}
  const reviewId = parseInt(id)
  if (isNaN(reviewId)) return notFound()

  const reviewResult = await getContractReviewById(reviewId)
  if (!reviewResult.success || !reviewResult.data) return notFound()

  const review = reviewResult.data

  let selectedEmp: any = null
  if (review.employeeId) {
    const [emp] = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeId: employees.employeeSn,
        department: masterDepartments.name,
        position: hrPositions.levelName,
        section: masterSections.name,
      })
      .from(employees)
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .where(eq(employees.id, review.employeeId))
      .limit(1)

    if (emp) {
      selectedEmp = emp
    }
  }

  const approvals = await db
    .select()
    .from(hcContractReviewApprovals)
    .where(eq(hcContractReviewApprovals.reviewId, reviewId))
    .orderBy(asc(hcContractReviewApprovals.stepOrder))

  return (
    <ContractReviewPrintView
      review={review}
      selectedEmp={selectedEmp}
      approvals={approvals}
      isEmbedded={embedded === '1'}
    />
  )
}
