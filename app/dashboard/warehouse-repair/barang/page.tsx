import { getWarehouseRepairItems, getWarehouseRepairTypes, getWarehouseRepairUnits } from "@/app/actions/warehouse-repair"
import { WarehouseRepairItemsTable } from "@/components/warehouse-repair"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { redirect } from "next/navigation"

export default async function WarehouseRepairBarangPage() {
  const access = await getCurrentMenuPermission("warehouse_repair_barang")
  if (!access.canView) {
    redirect("/dashboard")
  }
  const [items, types, units] = await Promise.all([
    getWarehouseRepairItems(),
    getWarehouseRepairTypes(),
    getWarehouseRepairUnits(),
  ])
  return <WarehouseRepairItemsTable items={items} types={types} units={units} access={access} />
}
