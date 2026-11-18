import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { getAssetBorrows, getAssetBorrowFormData } from './actions'
import { AssetBorrowDashboard } from './components/asset-borrow-dashboard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Asset Borrow | HERO',
  description: 'Pengajuan dan riwayat peminjaman aset operasional dengan persetujuan holder fisik di PT Chitra Paratama',
}

export default async function AssetBorrowPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/dashboard/assets/borrow')
  }

  // Check menu permission for asset_borrow
  const permission = await getCurrentMenuPermission('asset_borrow')
  if (permission && !permission.canView) {
    redirect('/dashboard')
  }

  const [borrowsRes, formDataRes] = await Promise.all([
    getAssetBorrows(),
    getAssetBorrowFormData(),
  ])

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <AssetBorrowDashboard
          initialData={borrowsRes}
          masterAssets={formDataRes.assets || []}
          employees={formDataRes.employees || []}
        />
      </div>
    </div>
  )
}
