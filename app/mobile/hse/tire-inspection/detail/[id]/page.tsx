import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/auth-session"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { getInspectionDetail } from "@/app/dashboard/hse/tire-inspection/actions"
import { TireInspectionDetailClient } from "@/app/dashboard/hse/tire-inspection/detail/[id]/client-page"

export default async function MobileTireInspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession()
  if (!session?.user?.email) redirect("/sign-in")

  const resolvedParams = await params
  const [detail, access] = await Promise.all([
    getInspectionDetail(resolvedParams.id),
    getCurrentMenuPermission("hse_tire_inspection"),
  ])

  return (
    <div className="space-y-4 pb-24">
      <div className="px-5 pt-4 no-print">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]/60 mb-1">HSE • TIRE INSPECTION</p>
        <h1 className="text-xl font-black leading-tight text-[#082033]">Detail Laporan</h1>
      </div>

      <div className="px-5">
        <TireInspectionDetailClient detail={detail} access={access} basePath="/mobile/hse/tire-inspection" />
      </div>
    </div>
  )
}
