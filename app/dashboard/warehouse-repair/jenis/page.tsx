import { getWarehouseRepairTypes } from "@/app/actions/warehouse-repair"
import { WarehouseRepairMasterTable } from "@/components/warehouse-repair/warehouse-repair-master-tables"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { redirect } from "next/navigation"

export default async function WarehouseRepairJenisPage() {
  const access = await getCurrentMenuPermission("warehouse_repair_jenis")
  if (!access.canView) {
    redirect("/dashboard")
  }
  const types = await getWarehouseRepairTypes()
  return <WarehouseRepairMasterTable type="types" data={types} access={access} />
}
