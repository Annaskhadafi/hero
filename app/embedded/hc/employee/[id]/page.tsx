import { getEmployeeFullProfile } from "@/app/actions/employee-profile"
import { getContractReviewApprovalByToken } from "@/app/actions/contract-review"
import { EmployeeProfileClientPage } from "@/app/dashboard/hc/employee/[id]/client-page"
import { getServerSession } from "@/lib/auth-session"
import { notFound, redirect } from "next/navigation"

export const metadata = {
  title: "Profil & Produktivitas Karyawan - Embed",
}

export default async function EmbeddedEmployeeProfilePage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ view?: string; contractReviewToken?: string }> }) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const hrEmployeeId = parseInt(resolvedParams.id, 10)
  if (isNaN(hrEmployeeId)) notFound()

  const session = await getServerSession()
  if (!session?.user) {
    const token = resolvedSearchParams.contractReviewToken
    const tokenResult = token ? await getContractReviewApprovalByToken(token) : null
    const tokenEmployeeId = (tokenResult?.data as any)?.review?.employeeId
    if (!tokenResult?.success || Number(tokenEmployeeId) !== hrEmployeeId) redirect('/sign-in')
  }

  const data = await getEmployeeFullProfile(hrEmployeeId)
  if (!data) notFound()

  return <EmployeeProfileClientPage profile={data as any} hrEmployeeId={hrEmployeeId} embedded embeddedView={resolvedSearchParams.view === 'tabs' ? 'tabs' : 'full'} />
}
