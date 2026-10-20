import { AdminPageShell } from "@/components/admin-page-shell"
import { getOperationalCrudOptions } from "@/lib/hero-admin"
import { getCurrentEmployeeAccessRole } from "@/lib/get-current-employee"
import { getRewardStoreData, getAdminRedemptionsList } from "@/app/actions/reward-store"
import { RewardStoreTab } from "@/app/dashboard/leaderboard/reward-store-tab"

import { getCurrentMenuPermission } from "@/lib/hero-access"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Toko Hadiah & Reward Store - HERO",
  description: "Katalog penukaran poin hadiah, kelola stok merchandise, dan persetujuan klaim hadiah karyawan.",
}

export default async function RewardStorePage() {
  const [role, rewardData, allRedemptions, crudOptions, menuPerm] = await Promise.all([
    getCurrentEmployeeAccessRole(),
    getRewardStoreData(),
    getAdminRedemptionsList(),
    getOperationalCrudOptions(),
    getCurrentMenuPermission("reward_store"),
  ])

  // canManage: Super Admin can do everything, or roles with edit/canSelectAll permission can review claims
  const isSuperAdmin = role === "Super Admin"
  const canManage = isSuperAdmin
  const canReviewClaims = isSuperAdmin || menuPerm.canEdit || menuPerm.canSelectAll

  return (
    <AdminPageShell
      eyebrow="Gamifikasi & Penghargaan"
      title="HERO Arcade Prize Counter & Store"
      description="Tukarkan akumulasi poin kinerja dengan merchandise, voucher, atau klaim event akhir tahun. Kelola katalog barang dan persetujuan klaim secara terpusat."
      badge="Coming Soon"
    >
      <div className="space-y-4">
        <RewardStoreTab
          catalog={rewardData.catalog}
          myRedemptions={rewardData.myRedemptions}
          allRedemptions={allRedemptions}
          currentEmployee={rewardData.currentEmployee}
          canManage={canManage}
          canReviewClaims={canReviewClaims}
          siteOptions={crudOptions.sites}
          departmentOptions={crudOptions.departments}
          sectionOptions={crudOptions.sections}
        />
      </div>
    </AdminPageShell>
  )
}
