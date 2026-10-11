import { redirect } from "next/navigation"
import { Metadata } from "next"
import { getServerSession } from "@/lib/auth-session"
import { getRewardStoreData, getAdminRedemptionsList } from "@/app/actions/reward-store"
import { getCurrentEmployeeAccessRole } from "@/lib/get-current-employee"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { MobileRewardStorePageClient } from "@/components/mobile/mobile-reward-store-page-client"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Toko Hadiah Poin - HERO Mobile",
  description: "Katalog penukaran tiket poin hadiah HERO Arcade Prize Counter",
}

export default async function MobileRewardStorePage() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    redirect("/sign-in")
  }

  const [rewardData, role, allRedemptions, menuPerm] = await Promise.all([
    getRewardStoreData(),
    getCurrentEmployeeAccessRole(),
    getAdminRedemptionsList(),
    getCurrentMenuPermission("reward_store"),
  ])

  // Manajemen barang tambah/edit/delete HANYA di Desktop khusus Super Admin
  const isSuperAdmin = role === "Super Admin"
  const canManage = false
  const canReviewClaims = isSuperAdmin || menuPerm.canEdit || menuPerm.canSelectAll

  return (
    <MobileRewardStorePageClient
      catalog={rewardData.catalog}
      myRedemptions={rewardData.myRedemptions}
      allRedemptions={allRedemptions}
      currentEmployee={rewardData.currentEmployee}
      canManage={canManage}
      canReviewClaims={canReviewClaims}
    />
  )
}
