import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import {
  getAssetTransfers,
  getMasterAssetsForTransfer,
  getEmployeesForTransfer,
  getSitesForTransfer,
} from './actions'
import { AssetTransferDashboard } from './components/asset-transfer-dashboard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Asset Transfer | HERO',
  description: 'Pengajuan dan riwayat mutasi / transfer aset antar pemegang dan lokasi site di PT Chitra Paratama',
}

export default async function AssetTransferPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/dashboard/assets/transfer')
  }

  // Check menu permission
  const permission = await getCurrentMenuPermission('asset_transfer')
  if (permission && !permission.canView) {
    redirect('/dashboard')
  }

  const [initialData, masterAssetsRes, employeesRes, sitesRes] = await Promise.all([
    getAssetTransfers(),
    getMasterAssetsForTransfer(),
    getEmployeesForTransfer(),
    getSitesForTransfer(),
  ])

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <AssetTransferDashboard
          initialData={initialData}
          masterAssets={masterAssetsRes.data || []}
          employees={employeesRes.data || []}
          sites={sitesRes.data || []}
        />
      </div>
    </div>
  )
}
