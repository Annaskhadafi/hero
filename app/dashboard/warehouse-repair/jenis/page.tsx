import { getWarehouseRepairTypes } from "@/app/actions/warehouse-repair"
import { WarehouseRepairTypesTable } from "@/components/warehouse-repair"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { redirect } from "next/navigation"

export default async function WarehouseRepairJenisPage() {
  const access = await getCurrentMenuPermission("warehouse_repair_jenis")
  if (!access.canView) {
    redirect("/dashboard")
  }
  const types = await getWarehouseRepairTypes()
  return <WarehouseRepairTypesTable types={types} access={access} />
}
