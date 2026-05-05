"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { CargoManifestRowActions } from "@/components/cargo-manifest-panels";
import type { CargoManifestRecord } from "@/app/actions/cargo-manifest";

type CargoManifestTableProps = {
  manifests: CargoManifestRecord[];
};

export function CargoManifestTable({ manifests }: CargoManifestTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

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
    <div className="rounded-lg border border-border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10 px-3 py-3 text-left font-medium"></th>
              <th className="px-3 py-3 text-left font-medium">No. Manifest</th>
              <th className="px-3 py-3 text-left font-medium">Tanggal</th>
              <th className="px-3 py-3 text-left font-medium">Attention</th>
              <th className="px-3 py-3 text-left font-medium">Transport Via</th>
              <th className="px-3 py-3 text-left font-medium">Tujuan</th>
              <th className="px-3 py-3 text-left font-medium">Items</th>
              <th className="px-3 py-3 text-left font-medium">Status</th>
              <th className="px-3 py-3 text-left font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {manifests.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-muted-foreground">
                  Belum ada data manifest
                </td>
              </tr>
            ) : (
              manifests.map((m) => (
                <>
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
                      <td colSpan={9} className="px-3 py-4">
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
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
