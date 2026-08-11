import { getAssets, getMasterSectionOptions } from './actions'
import { AssetsTable } from './components/assets-table'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Asset Management - Central Service | HERO',
  description: 'Manajemen aset tools dan peralatan Central Service',
}

export default async function CentralServiceAssetsPage() {
  const access = await getCurrentMenuPermission('central-service-assets')

  if (!access.canView) {
    redirect('/403')
  }

  const [assetsResult, masterSections] = await Promise.all([getAssets(), getMasterSectionOptions()])

  const assets = assetsResult.success && assetsResult.data ? assetsResult.data : []

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Asset Management</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Manajemen inventaris tools dan peralatan Central Service
          </p>
        </div>
        <AssetsTable data={assets} masterSections={masterSections} />
      </div>
    </div>
  )
}
