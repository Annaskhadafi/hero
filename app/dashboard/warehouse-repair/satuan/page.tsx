import { getWarehouseRepairUnits } from "@/app/actions/warehouse-repair"
import { WarehouseRepairMasterTable } from "@/components/warehouse-repair/warehouse-repair-master-tables"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { redirect } from "next/navigation"

export default async function WarehouseRepairSatuanPage() {
  const access = await getCurrentMenuPermission("warehouse_repair_satuan")
  if (!access.canView) {
    redirect("/dashboard")
  }
  const units = await getWarehouseRepairUnits()
  return <WarehouseRepairMasterTable type="units" data={units} access={access} />
}
