import { getWarehouseRepairPageData } from "@/app/actions/warehouse-repair"
import { WarehouseRepairClient } from "../_components/warehouse-repair-client"

export default async function WarehouseRepairBarangKeluarPage() {
  const data = await getWarehouseRepairPageData()
  return <WarehouseRepairClient mode="outbound" data={data} />
}
