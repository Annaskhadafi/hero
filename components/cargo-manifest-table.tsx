"use client";

import { useState } from "react";
import { Fragment } from "react";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { CargoManifestRowActions } from "@/components/cargo-manifest-panels";
import type { CargoManifestRecord } from "@/app/actions/cargo-manifest";

type CargoManifestTableProps = {
  manifests: CargoManifestRecord[];
};

export function CargoManifestTable({ manifests }: CargoManifestTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [filterSite, setFilterSite] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  const filteredManifests = manifests.filter(m => {
    if (filterSite && m.siteName !== filterSite) return false;
    if (filterDateFrom && new Date(m.createdAt) < new Date(filterDateFrom)) return false;
    if (filterDateTo && new Date(m.createdAt) > new Date(filterDateTo + "T23:59:59")) return false;
    return true;
  });

  const uniqueSites = Array.from(new Set(manifests.map(m => m.siteName).filter(Boolean))).sort();

  const handleExportCSV = () => {
    const headers = ["No. Manifest", "Tanggal", "Site", "Attention", "Transport Via", "Tujuan", "Items", "Status", "Created At"];
    const rows = filteredManifests.map(m => [
      m.manifestNumber,
      m.date,
      m.siteName || "-",
      m.attention || "-",
      m.transportVia || "-",
      m.finalDestination || "-",
      m.items.length.toString(),
      m.status,
      new Date(m.createdAt).toLocaleString("id-ID")
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cargo-manifest-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="flex gap-3">
          <div className="grid gap-1.5">
            <label className="text-xs font-medium">Filter Site</label>
            <select
              value={filterSite}
              onChange={(e) => setFilterSite(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Semua Site</option>
              {uniqueSites.map((site, idx) => <option key={`site-${idx}`} value={site}>{site}</option>)}
            </select>
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs font-medium">Dari Tanggal</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-xs font-medium">Sampai Tanggal</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
        </div>
        <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>
      <div className="rounded-lg border border-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10 px-3 py-3 text-left font-medium"></th>
              <th className="px-3 py-3 text-left font-medium">No. Manifest</th>
              <th className="px-3 py-3 text-left font-medium">Tanggal</th>
              <th className="px-3 py-3 text-left font-medium">Site</th>
              <th className="px-3 py-3 text-left font-medium">Attention</th>
              <th className="px-3 py-3 text-left font-medium">Transport Via</th>
              <th className="px-3 py-3 text-left font-medium">Tujuan</th>
              <th className="px-3 py-3 text-left font-medium">Items</th>
              <th className="px-3 py-3 text-left font-medium">Status</th>
              <th className="px-3 py-3 text-left font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredManifests.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-muted-foreground">
                  Belum ada data manifest
                </td>
              </tr>
            ) : (
              filteredManifests.map((m) => (
                <Fragment key={m.id}>
                  <tr key={m.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-3 py-3">
                      <button
                        onClick={() => toggleRow(m.id)}
                        className="rounded p-1 hover:bg-muted"
                        aria-label="Toggle details"
                      >
                        {expandedRows.has(m.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {m.manifestNumber}
                      </span>
                    </td>
                      <td className="px-3 py-3">{m.date}</td>
                      <td className="px-3 py-3">{m.siteName || "-"}</td>
                      <td className="px-3 py-3">{m.attention || "?"}</td>
                    <td className="px-3 py-3">{m.transportVia || "?"}</td>
                    <td className="px-3 py-3">{m.finalDestination || "?"}</td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-muted-foreground">
                        {m.items.length} item
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <AdminStatusBadge value={m.status} />
                    </td>
                    <td className="px-3 py-3">
                      <CargoManifestRowActions row={m} />
                    </td>
                  </tr>
                  {expandedRows.has(m.id) && (
                    <tr key={`${m.id}-details`} className="border-b border-border bg-muted/10">
                      <td colSpan={10} className="px-3 py-4">
                        <div className="ml-8">
                          <h4 className="mb-2 text-sm font-semibold">Detail Barang:</h4>
                          {m.items.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Tidak ada item</p>
                          ) : (
                            <div className="overflow-x-auto rounded border border-border">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-muted/40">
                                    <th className="border-b border-border px-2 py-2 text-left font-medium">No</th>
                                    <th className="border-b border-border px-2 py-2 text-left font-medium">Description</th>
                                    <th className="border-b border-border px-2 py-2 text-left font-medium">Serial Number</th>
                                    <th className="border-b border-border px-2 py-2 text-left font-medium">Qty</th>
                                    <th className="border-b border-border px-2 py-2 text-left font-medium">Brand</th>
                                    <th className="border-b border-border px-2 py-2 text-left font-medium">Remark</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {m.items.map((item, idx) => (
                                    <tr key={idx} className="border-b border-border last:border-0">
                                      <td className="px-2 py-2">{item.no}</td>
                                      <td className="px-2 py-2">{item.description}</td>
                                      <td className="px-2 py-2">{item.serialNumber || "?"}</td>
                                      <td className="px-2 py-2">{item.qty}</td>
                                      <td className="px-2 py-2">{item.brand || "?"}</td>
                                      <td className="px-2 py-2">{item.remark || "?"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
