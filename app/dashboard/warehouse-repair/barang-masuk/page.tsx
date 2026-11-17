import { getWarehouseRepairInbound, getWarehouseRepairItems } from "@/app/actions/warehouse-repair"
import { WarehouseRepairInboundTable } from "@/components/warehouse-repair"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { redirect } from "next/navigation"

export default async function WarehouseRepairBarangMasukPage() {
  const access = await getCurrentMenuPermission("warehouse_repair_barang_masuk")
  if (!access.canView) {
    redirect("/dashboard")
  }
  const [inbound, items] = await Promise.all([
    getWarehouseRepairInbound(),
    getWarehouseRepairItems(),
  ])
  return <WarehouseRepairInboundTable inbound={inbound} items={items} access={access} />
}
