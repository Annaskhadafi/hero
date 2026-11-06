import { getWarehouseRepairItems, getWarehouseRepairTypes, getWarehouseRepairUnits } from "@/app/actions/warehouse-repair"
import { WarehouseRepairReportsTable } from "@/components/warehouse-repair"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { redirect } from "next/navigation"

export default async function WarehouseRepairLaporanStokPage() {
  const access = await getCurrentMenuPermission("warehouse_repair_laporan_stok")
  if (!access.canView) {
    redirect("/dashboard")
  }
  const [items, types, units] = await Promise.all([
    getWarehouseRepairItems(),
    getWarehouseRepairTypes(),
    getWarehouseRepairUnits(),
  ])
  return (
    <WarehouseRepairReportsTable
      reportType="stock"
      items={items}
      types={types}
      units={units}
      access={access}
    />
  )
}
