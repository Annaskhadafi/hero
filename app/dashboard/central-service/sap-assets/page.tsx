import { AdminPageShell } from '@/components/admin-page-shell'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { getSapAssetInventory } from '@/lib/sap-asset-inventory'
import { redirect } from 'next/navigation'

import { SapAssetInventoryClient } from './sap-asset-inventory-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'SAP Asset Inventory - HERO',
  description: 'View One Chitra SAP assets with location and reference summaries.',
}

export default async function SapAssetInventoryPage() {
  const permission = await getCurrentMenuPermission('sap_asset_inventory')
  // SAP asset rows do not carry a HERO site key, so only an explicit global grant is safe.
  if (!permission.canView || permission.dataScope !== 'global') redirect('/dashboard')

  const data = await getSapAssetInventory()

  return (
    <AdminPageShell
      eyebrow="Central Service • SAP"
      title="SAP Asset Inventory"
      description="View One Chitra SAP assets with location, class, holder, and cost center summaries."
    >
      <SapAssetInventoryClient data={data} />
    </AdminPageShell>
  )
}
