import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import {
  getFuelDashboardData,
  getFuelEquipmentList,
  getFuelTransactions,
} from '@/app/actions/fuel-management'
import { FuelManagementClient } from '@/components/fuel-management/fuel-management-client'

export const metadata = {
  title: 'Fuel Management Mobile | HERO',
  description: 'Monitoring dan pencatatan pergerakan BBM Fuel In & Fuel Out di mobile HERO.',
}

export default async function MobileFuelManagementPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/sign-in')
  }

  const [dashboardData, equipmentList, recentTx] = await Promise.all([
    getFuelDashboardData(),
    getFuelEquipmentList(),
    getFuelTransactions(),
  ])

  return (
    <FuelManagementClient
      initialDashboard={dashboardData}
      vehicles={equipmentList}
      initialTransactions={recentTx}
      isMobileView={true}
    />
  )
}
