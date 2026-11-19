import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployeeAccessContext, getCurrentMenuPermission, isSuperAdminRole } from '@/lib/hero-access'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq, asc } from 'drizzle-orm'
import { getAssetDisposals, getDisposalFormData } from './actions'
import { AssetDisposalDashboard } from './components/asset-disposal-dashboard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Asset Disposal | HERO',
  description: 'Pengajuan dan pelacakan penghapusan aset dengan verifikasi Finance & Accounting dan otorisasi bertingkat hingga Director di PT Chitra Paratama',
}

export default async function AssetDisposalPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/dashboard/assets/disposal')
  }

  // Check menu permission for asset_disposal
  const permission = await getCurrentMenuPermission('asset_disposal')
  if (permission && !permission.canView) {
    redirect('/dashboard')
  }

  const empContext = await getCurrentEmployeeAccessContext()
  const isSuperAdmin = isSuperAdminRole(empContext?.roleName)

  const [disposalsRes, formDataRes, allEmployees] = await Promise.all([
    getAssetDisposals(),
    getDisposalFormData(),
    db
      .select({
        id: employees.id,
        employeeSn: employees.employeeSn,
        name: employees.name,
        jobTitle: employees.jobTitle,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name))
      .limit(500),
  ])

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <AssetDisposalDashboard
          initialItems={disposalsRes.items || []}
          totalItems={disposalsRes.total || 0}
          kpiStats={disposalsRes.kpi}
          initialData={{
            items: disposalsRes.items || [],
            total: disposalsRes.total || 0,
            kpi: disposalsRes.kpi,
            currentAuth: {
              userId: session.user.id,
              employeeId: formDataRes.currentEmployee?.id || empContext?.employeeId || null,
              isSuperAdmin,
            },
          }}
          sites={formDataRes.sites || []}
          departments={formDataRes.departments || []}
          sections={formDataRes.sections || []}
          assets={formDataRes.assets || []}
          currentEmployee={formDataRes.currentEmployee}
          defaultApprovers={formDataRes.defaultApprovers || []}
          allEmployees={allEmployees || []}
        />
      </div>
    </div>
  )
}
