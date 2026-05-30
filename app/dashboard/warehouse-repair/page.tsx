import { getWarehouseRepairDashboardData } from "@/app/actions/warehouse-repair"
import { WarehouseRepairClient } from "./_components/warehouse-repair-client"

export default async function WarehouseRepairPage() {
  const data = await getWarehouseRepairDashboardData()
  return <WarehouseRepairClient mode="overview" data={data} />
}
