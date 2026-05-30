import { getWarehouseRepairPageData } from "@/app/actions/warehouse-repair"
import { WarehouseRepairClient } from "../_components/warehouse-repair-client"

export default async function WarehouseRepairBarangPage() {
  const data = await getWarehouseRepairPageData()
  return <WarehouseRepairClient mode="items" data={data} />
}
