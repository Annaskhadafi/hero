import { getContractReviewApprovalByToken } from '@/app/actions/contract-review'
import { ContractReviewPublicApproval } from './public-approval'
import { db } from '@/db'
import { hrEmployees, hrDepartments, hrPositions } from '@/db/schema/hero'
import { centralServiceEmployees } from '@/db/schema/central-service'
import { eq, or } from 'drizzle-orm'

export default async function ContractReviewPublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = await getContractReviewApprovalByToken(token)

  if (!result.success || !result.data) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Approval tidak ditemukan</h1>
          <p className="mt-2 text-sm text-slate-500">Link tidak valid atau approval sudah tidak tersedia.</p>
        </div>
      </main>
    )
  }

  const data = result.data as any
  const review = data.review

  // Fetch employee details for PDF preview
  let employee: any = null
  if (review?.employeeId) {
    const [hrEmp] = await db
      .select({
        employeeId: hrEmployees.employeeId,
        fullName: hrEmployees.fullName,
        department: hrDepartments.name,
        position: hrPositions.levelName,
      })
      .from(hrEmployees)
      .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
      .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
      .where(eq(hrEmployees.id, review.employeeId))
      .limit(1)

    if (hrEmp) {
      const sn = hrEmp.employeeId?.replace(/^EMP-/i, '') || ''
      const [csEmp] = await db
        .select({ position: centralServiceEmployees.position, section: centralServiceEmployees.section })
        .from(centralServiceEmployees)
        .where(or(eq(centralServiceEmployees.employeeSn, sn), eq(centralServiceEmployees.employeeSn, hrEmp.employeeId || '')))
        .limit(1)

      employee = {
        name: hrEmp.fullName,
        employeeSn: sn,
        position: hrEmp.position || csEmp?.position || '',
        department: hrEmp.department || 'Central Services',
        section: csEmp?.section || '',
      }
    }
  }

  return <ContractReviewPublicApproval token={token} approval={data.approval} review={review} allApprovals={data.allApprovals || []} employee={employee} />
}
