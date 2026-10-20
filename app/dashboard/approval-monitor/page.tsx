import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getCurrentEmployeeByEmail } from '@/lib/get-current-employee'
import { isSuperAdminRole } from '@/lib/hero-access'
import { getApprovalMonitoringData } from '@/lib/approval-workspace'
import { getEmployeeOptionsAction } from './actions'
import { ApprovalMonitorClientView } from './client-view'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Approval Monitor (Super Admin) | HERO',
  description: 'Pusat Pemantauan dan Pengendalian Seluruh Proses Approval Perusahaan',
}

export default async function ApprovalMonitorPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.email) {
    redirect('/auth/signin?callbackUrl=/dashboard/approval-monitor')
  }

  const currentEmp = await getCurrentEmployeeByEmail(session.user.email)
  const isSuperAdmin = isSuperAdminRole(currentEmp?.accessRole)

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-900 shadow-sm max-w-md">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-xl font-bold">Akses Khusus Super Admin</h2>
          <p className="mt-2 text-sm text-red-700">
            Halaman Approval Monitor ini hanya dapat diakses oleh peran Super Admin untuk keperluan monitoring dan tata kelola approval perusahaan.
          </p>
        </div>
      </div>
    )
  }

  const [initialData, employees] = await Promise.all([
    getApprovalMonitoringData(),
    getEmployeeOptionsAction(),
  ])

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      <ApprovalMonitorClientView
        initialData={initialData}
        employees={employees}
        currentUser={{
          name: currentEmp?.name || session.user.name || 'Super Admin',
          email: session.user.email,
        }}
      />
    </div>
  )
}
