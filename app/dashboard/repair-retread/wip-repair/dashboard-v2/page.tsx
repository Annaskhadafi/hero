import { Suspense } from "react"
import { Loader2 } from "lucide-react"

import { getWipRepairData, getWipRepairWorkOrderDetails } from "@/app/actions/wip-repair"
import { WipProductionDashboardV2 } from "./_components/wip-production-dashboard-v2"

async function DashboardContent() {
  const [data, workOrderDetails] = await Promise.all([
    getWipRepairData(),
    getWipRepairWorkOrderDetails(),
  ])

  return <WipProductionDashboardV2 data={data} workOrderDetails={workOrderDetails} />
}

export default function WipDashboardV2Page() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 p-3 sm:p-4 md:p-6">
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center gap-2 rounded-xl bg-white text-slate-500 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin" />
            Memuat WIP Dashboard V2...
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  )
}
