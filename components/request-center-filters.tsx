"use client"

import { TableFilterPresets } from "@/components/table-filter-presets"

export function RequestCenterFilters({ sites, statuses }: { sites: string[]; statuses: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select data-table-filter-key="site" defaultValue="" className="h-9 rounded-xl border-0 bg-surface-container-lowest px-3 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]">
        <option value="">Semua site</option>
        {sites.map((site) => (
          <option key={site} value={site}>
            {site}
          </option>
        ))}
      </select>
      <select data-table-filter-key="status" defaultValue="" className="h-9 rounded-xl border-0 bg-surface-container-lowest px-3 text-[13px] shadow-[inset_0_0_0_1px_rgba(66,71,80,0.1)]">
        <option value="">Semua status</option>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <TableFilterPresets
        presets={[
          { label: "Perlu revisi", filters: { status: "needs_revision" } },
          { label: "Ditinjau", filters: { status: "in_review" } },
        ]}
      />
    </div>
  )
}
