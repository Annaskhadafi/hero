import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import {
  getFuelDashboardData,
  getFuelEquipmentList,
  getFuelTransactions,
} from '@/app/actions/fuel-management'
import { FuelManagementClient } from '@/components/fuel-management/fuel-management-client'

export const metadata = {
  title: 'Fuel Management | HERO Dashboard',
  description: 'Monitoring kondisi BBM, stok tangki, penerimaan Fuel In, dan pengisian Fuel Out ke unit.',
}

export default async function DashboardFuelManagementPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/sign-in')
  }

  const access = await getCurrentMenuPermission('fuel_management')
  if (!access.canView) {
    redirect('/dashboard')
  }

  const [dashboardData, equipmentList, recentTx] = await Promise.all([
    getFuelDashboardData(),
    getFuelEquipmentList(),
    getFuelTransactions(),
  ])

  return (
    <div className="p-4 sm:p-6 bg-slate-50/60 min-h-screen">
      <FuelManagementClient
        initialDashboard={dashboardData}
        vehicles={equipmentList}
        initialTransactions={recentTx}
        isMobileView={false}
      />
    </div>
  )
}
