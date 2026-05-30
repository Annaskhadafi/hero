import { getWarehouseRepairPageData } from "@/app/actions/warehouse-repair"
import { WarehouseRepairClient } from "../_components/warehouse-repair-client"

export default async function WarehouseRepairSatuanPage() {
  const data = await getWarehouseRepairPageData()
  return <WarehouseRepairClient mode="units" data={data} />
}
