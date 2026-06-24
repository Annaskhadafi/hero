import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/auth-session"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { TireInspectionCreateClient } from "@/app/dashboard/hse/tire-inspection/create/client-page"

export default async function MobileTireInspectionCreatePage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect("/sign-in")

  const access = await getCurrentMenuPermission("hse_tire_inspection")
  if (!access.canEdit) {
    redirect("/mobile/hse/tire-inspection")
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="px-5 pt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]/60 mb-1">HSE • TIRE INSPECTION</p>
        <h1 className="text-xl font-black leading-tight text-[#082033]">Buat Inspeksi</h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">Isi data lapangan</p>
      </div>

      <div className="px-5">
        <TireInspectionCreateClient basePath="/mobile/hse/tire-inspection" />
      </div>
    </div>
  )
}
