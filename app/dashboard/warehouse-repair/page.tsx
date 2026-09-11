import { getWarehouseRepairDashboardData } from "@/app/actions/warehouse-repair"
import { WarehouseRepairClient } from "./_components/warehouse-repair-client"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { redirect } from "next/navigation"

export default async function WarehouseRepairPage() {
  const access = await getCurrentMenuPermission("warehouse_repair_dashboard")
  if (!access.canView) {
    redirect("/dashboard")
  }
  const data = await getWarehouseRepairDashboardData()
  return <WarehouseRepairClient mode="overview" data={data} access={access} />
}
