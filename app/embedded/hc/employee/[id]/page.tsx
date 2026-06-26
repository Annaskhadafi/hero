import { getEmployeeFullProfile } from "@/app/actions/employee-profile"
import { EmployeeProfileClientPage } from "@/app/dashboard/hc/employee/[id]/client-page"
import { getServerSession } from "@/lib/auth-session"
import { notFound, redirect } from "next/navigation"

export const metadata = {
  title: "Profil & Produktivitas Karyawan - Embed",
}

export default async function EmbeddedEmployeeProfilePage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ view?: string }> }) {
  const session = await getServerSession()
  if (!session?.user) redirect('/sign-in')

  const resolvedParams = await params
  const hrEmployeeId = parseInt(resolvedParams.id, 10)
  if (isNaN(hrEmployeeId)) notFound()

  const data = await getEmployeeFullProfile(hrEmployeeId)
  if (!data) notFound()
  const resolvedSearchParams = await searchParams

  return <EmployeeProfileClientPage profile={data as any} hrEmployeeId={hrEmployeeId} embedded embeddedView={resolvedSearchParams.view === 'tabs' ? 'tabs' : 'full'} />
}
