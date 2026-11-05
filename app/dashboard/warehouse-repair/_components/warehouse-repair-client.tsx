"use client"

/**
 * @deprecated Use modular components from `@/components/warehouse-repair` instead.
 */
import { WarehouseRepairOverview } from "@/components/warehouse-repair"

export function WarehouseRepairClient({ data, access }: { mode?: string; data: any; access?: any }) {
  return <WarehouseRepairOverview data={data} access={access} />
}
