import {
  getWarehouseRepairInbound,
  getWarehouseRepairItems,
  getWarehouseRepairTypes,
  getWarehouseRepairUnits,
} from "@/app/actions/warehouse-repair"
import { WarehouseRepairReportsTable } from "@/components/warehouse-repair"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { redirect } from "next/navigation"

export default async function WarehouseRepairLaporanBarangMasukPage() {
  const access = await getCurrentMenuPermission("warehouse_repair_laporan_barang_masuk")
  if (!access.canView) {
    redirect("/dashboard")
  }
  const [inbound, items, types, units] = await Promise.all([
    getWarehouseRepairInbound(),
    getWarehouseRepairItems(),
    getWarehouseRepairTypes(),
    getWarehouseRepairUnits(),
  ])
  return (
    <WarehouseRepairReportsTable
      reportType="inbound"
      inbound={inbound}
      items={items}
      types={types}
      units={units}
      access={access}
    />
  )
}
