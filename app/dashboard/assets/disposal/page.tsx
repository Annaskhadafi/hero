import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
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
      .where(eq(employees.employmentStatus, 'active'))
      .orderBy(employees.name)
      .limit(300),
  ])

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <AssetDisposalDashboard
          initialItems={disposalsRes.items || []}
          totalItems={disposalsRes.total || 0}
          kpiStats={disposalsRes.kpi}
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
