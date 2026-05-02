"use client"

import { TableFilterPresets } from "@/components/table-filter-presets"
import { TableMultiFilter } from "@/components/ui/table-multi-filter"

export function RequestCenterFilters({ sites, statuses }: { sites: string[]; statuses: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <TableMultiFilter
        label="site"
        filterKey="site"
        options={sites.map((site) => ({ value: site, label: site }))}
      />
      <TableMultiFilter
        label="status"
        filterKey="status"
        options={statuses.map((status) => ({ value: status, label: status }))}
      />
      <TableFilterPresets
        presets={[
          { label: "Perlu revisi", filters: { status: "needs_revision" } },
          { label: "Ditinjau", filters: { status: "in_review" } },
        ]}
      />
    </div>
  )
}
