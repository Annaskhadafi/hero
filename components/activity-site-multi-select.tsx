"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";

export function ActivitySiteMultiSelect({
  sites,
  defaultSelected = [],
  label = "Lokasi kerja / Site",
}: {
  sites: Array<{ id: number; name: string; location?: string | null }>;
  defaultSelected?: number[];
  label?: string;
}) {
  const [selected, setSelected] = useState<number[]>(defaultSelected);
  const isGlobal = selected.length === 0;

  function toggleSite(id: number) {
    setSelected((current) =>
      current.includes(id) ? current.filter((siteId) => siteId !== id) : [...current, id]
    );
  }

  const selectedNames = sites
    .filter((site) => selected.includes(site.id))
    .map((site) => site.name)
    .join(", ");

  return (
    <Label className="grid gap-2 text-sm font-semibold">
      {label}
      {/* Multi-site: daftar id site dipisah koma; kosong = global semua site */}
      <input type="hidden" name="siteIds" value={selected.join(",")} />
      {/* Legacy single site (site pertama terpilih) agar kolom lama tetap terisi */}
      <input type="hidden" name="siteId" value={selected[0] ? String(selected[0]) : ""} />
      <div className="max-h-60 overflow-y-auto rounded-lg border border-border/70 bg-background p-2">
        <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface-container-low">
          <input
            type="checkbox"
            checked={isGlobal}
            onChange={() => setSelected([])}
            className="size-4 rounded border-border accent-primary"
          />
          <span className="font-medium">Global - semua site</span>
        </label>
        {sites.map((site) => (
          <label
            key={site.id}
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface-container-low"
          >
            <input
              type="checkbox"
              checked={selected.includes(site.id)}
              onChange={() => toggleSite(site.id)}
              className="size-4 rounded border-border accent-primary"
            />
            <span>{site.name}</span>
            {site.location ? (
              <span className="text-xs text-muted-foreground">{site.location}</span>
            ) : null}
          </label>
        ))}
      </div>
      <p className="text-xs font-normal text-muted-foreground">
        {isGlobal
          ? "Aktivitas tersedia di seluruh site yang terdaftar di database."
          : `${selected.length} site dipilih: ${selectedNames}`}
      </p>
    </Label>
  );
}
