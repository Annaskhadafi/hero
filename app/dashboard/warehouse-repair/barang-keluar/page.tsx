import { getWarehouseRepairOutbound, getWarehouseRepairItems } from "@/app/actions/warehouse-repair"
import { WarehouseRepairOutboundTable } from "@/components/warehouse-repair"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { redirect } from "next/navigation"

export default async function WarehouseRepairBarangKeluarPage() {
  const access = await getCurrentMenuPermission("warehouse_repair_barang_keluar")
  if (!access.canView) {
    redirect("/dashboard")
  }
  const [outbound, items] = await Promise.all([
    getWarehouseRepairOutbound(),
    getWarehouseRepairItems(),
  ])
  return <WarehouseRepairOutboundTable outbound={outbound} items={items} access={access} />
}
