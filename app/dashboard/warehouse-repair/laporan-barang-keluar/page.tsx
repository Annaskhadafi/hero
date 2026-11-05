import {
  getWarehouseRepairOutbound,
  getWarehouseRepairItems,
  getWarehouseRepairTypes,
  getWarehouseRepairUnits,
} from "@/app/actions/warehouse-repair"
import { WarehouseRepairReportsTable } from "@/components/warehouse-repair"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { redirect } from "next/navigation"

export default async function WarehouseRepairLaporanBarangKeluarPage() {
  const access = await getCurrentMenuPermission("warehouse_repair_laporan_barang_keluar")
  if (!access.canView) {
    redirect("/dashboard")
  }
  const [outbound, items, types, units] = await Promise.all([
    getWarehouseRepairOutbound(),
    getWarehouseRepairItems(),
    getWarehouseRepairTypes(),
    getWarehouseRepairUnits(),
  ])
  return (
    <WarehouseRepairReportsTable
      reportType="outbound"
      outbound={outbound}
      items={items}
      types={types}
      units={units}
      access={access}
    />
  )
}
