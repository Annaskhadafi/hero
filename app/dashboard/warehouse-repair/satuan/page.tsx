import { getWarehouseRepairUnits } from "@/app/actions/warehouse-repair"
import { WarehouseRepairUnitsTable } from "@/components/warehouse-repair"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { redirect } from "next/navigation"

export default async function WarehouseRepairSatuanPage() {
  const access = await getCurrentMenuPermission("warehouse_repair_satuan")
  if (!access.canView) {
    redirect("/dashboard")
  }
  const units = await getWarehouseRepairUnits()
  return <WarehouseRepairUnitsTable units={units} access={access} />
}
