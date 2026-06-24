import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/auth-session"
import { getInspectionList } from "@/app/dashboard/hse/tire-inspection/actions"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { TireInspectionClient } from "@/app/dashboard/hse/tire-inspection/client-page"

export default async function MobileTireInspectionPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect("/sign-in")

  const access = await getCurrentMenuPermission("hse_tire_inspection")
  const inspections = access.canView ? await getInspectionList() : []

  return (
    <div className="space-y-4 pb-24">
      <div className="px-5 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]/60 mb-1">HSE • TIRE INSPECTION</p>
        <h1 className="text-xl font-black leading-tight text-[#082033]">Daftar Inspeksi</h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">Kelola inspeksi dan laporan AI</p>
      </div>

      <div className="px-5">
        {access.canView ? (
          <TireInspectionClient data={inspections} access={access} basePath="/mobile/hse/tire-inspection" />
        ) : (
          <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 text-xs font-semibold leading-5 text-orange-700">
            Akses Tire Site Inspection belum aktif untuk role Anda. Hubungi admin untuk mengaktifkan permission hse_tire_inspection.
          </div>
        )}
      </div>
    </div>
  )
}
