import { getDailyActivityApprovalData } from '@/app/dashboard/activity-hub/actions'
import { getEmployeesForContract } from '@/app/actions/employee'
import { getOrgChartData } from '@/app/actions/org-chart'
import { DailyActivityApprovalForm } from '@/components/daily-activity-approval-form'
import { getServerSession } from '@/lib/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Approval Daily Activity - HERO',
}

export default async function DailyActivityApprovalPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const session = await getServerSession()
  const { sessionId } = await params
  const sessionIdNum = Number(sessionId)

  const [data, employeesRaw, orgNodes] = await Promise.all([
    getDailyActivityApprovalData(sessionIdNum, session?.user?.email),
    getEmployeesForContract(),
    getOrgChartData(),
  ])

  if (!data) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-bold text-slate-800">Dokumen Daily Activity tidak ditemukan</h2>
        <p className="text-sm text-slate-500 mt-1">Sesi aktivitas dengan ID {sessionId} tidak ada atau sudah dihapus.</p>
      </div>
    )
  }

  const employees = employeesRaw.map((e) => ({
    id: e.id,
    name: e.fullName,
    employeeSn: e.employeeId,
    jobTitle: e.jobTitle,
    department: e.departmentName,
    section: e.sectionName,
  }))

  return (
    <DailyActivityApprovalForm
      data={data as any}
      employees={employees}
      orgNodes={orgNodes}
    />
  )
}
