import { AdminPageShell } from "@/components/admin-page-shell"
import { getHseInventories, runHseInventoryReminderCheck, getHseUserEmails } from "@/app/actions/hse-inventaris"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { InventarisClient } from "./inventaris-client"

export const dynamic = "force-dynamic"

export default async function HseInventarisPage() {
  // Jalankan scan & kirim pengingat email otomatis sebelum memuat halaman
  await runHseInventoryReminderCheck()

  const [inventoriesResult, access, userEmailsResult] = await Promise.all([
    getHseInventories(),
    getCurrentMenuPermission("hse_inventaris"),
    getHseUserEmails(),
  ])

  const inventories = inventoriesResult.success ? (inventoriesResult.data ?? []) : []
  const userEmails = userEmailsResult.success ? (userEmailsResult.data ?? []) : []

  return (
    <AdminPageShell
      eyebrow="HSE Module"
      title="Daftar Inventaris"
      description="Kelola dan pantau daftar inventaris aset HSE, masa berlaku, dan expired otomatis."
    >
      <div className="mt-4">
        <InventarisClient data={inventories} access={access} userEmails={userEmails} />
      </div>
    </AdminPageShell>
  )
}
