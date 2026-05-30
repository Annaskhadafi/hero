import { getWarehouseRepairPageData } from "@/app/actions/warehouse-repair"
import { WarehouseRepairClient } from "../_components/warehouse-repair-client"

export default async function WarehouseRepairLaporanBarangMasukPage() {
  const data = await getWarehouseRepairPageData()
  return <WarehouseRepairClient mode="inbound-report" data={data} />
}
