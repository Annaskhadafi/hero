"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, PackageCheck } from "lucide-react";

import { CargoManifestRowActions } from "@/components/cargo-manifest-panels";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { Button } from "@/components/ui/button";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CargoManifestRecord } from "@/app/actions/cargo-manifest";

const columns = [
  "Detail",
  "No. Manifest",
  "Tanggal",
  "Site",
  "Section",
  "Attention",
  "Transport Via",
  "Tujuan",
  "Items",
  "Status",
  "Aksi",
];

type CargoManifestTableProps = {
  manifests: CargoManifestRecord[];
};

export function CargoManifestTable({ manifests }: CargoManifestTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const siteOptions = useMemo(
    () => Array.from(new Set(manifests.map((manifest) => manifest.siteName).filter((site): site is string => Boolean(site)))).sort(),
    [manifests],
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(manifests.map((manifest) => manifest.status).filter(Boolean))).sort(),
    [manifests],
  );
  const totalItems = manifests.reduce((total, manifest) => total + manifest.items.length, 0);

  const toggleRow = (id: number) => {
    const nextExpanded = new Set(expandedRows);
    if (nextExpanded.has(id)) {
      nextExpanded.delete(id);
    } else {
      nextExpanded.add(id);
    }
    setExpandedRows(nextExpanded);
  };

  return (
    <MinimalTableShell
      label="cargo manifest"
      fileName="cargo-manifest"
      searchPlaceholder="Cari manifest, site, tujuan..."
      filters={
        <>
          <TableMultiFilter
            label="site"
            filterKey="site"
            options={siteOptions.map((site) => ({ value: site, label: site }))}
          />
          <TableMultiFilter
            label="status"
            filterKey="status"
            options={statusOptions.map((status) => ({ value: status, label: status }))}
          />
        </>
      }
      scorecards={[
        {
          label: "Manifest",
          value: manifests.length,
          description: "Total dokumen manifest",
          icon: <PackageCheck className="size-4 text-primary" />,
          tone: "info",
        },
        {
          label: "Items",
          value: totalItems,
          description: "Total barang tercatat",
          tone: "default",
        },
        {
          label: "Sites",
          value: siteOptions.length,
          description: "Site dengan manifest aktif",
          tone: "success",
        },
        {
          label: "Status",
          value: statusOptions.length,
          description: "Variasi status dokumen",
          tone: "warning",
        },
      ]}
      columnOptions={columns.map((column, index) => ({ key: column, label: column, required: index <= 1 }))}
      tableViewportClassName="max-h-[72vh]"
      dateFilter
    >
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {manifests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                Belum ada data manifest
              </TableCell>
            </TableRow>
          ) : (
            manifests.map((manifest) => (
              <Fragment key={manifest.id}>
                <TableRow
                  data-date-value={manifest.createdAt.toISOString()}
                  data-filter-site={manifest.siteName ?? ""}
                  data-filter-status={manifest.status}
                >
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="denseIcon"
                      onClick={() => toggleRow(manifest.id)}
                      aria-label="Toggle detail barang"
                    >
                      {expandedRows.has(manifest.id) ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-semibold text-primary">{manifest.manifestNumber}</span>
                  </TableCell>
                  <TableCell>{manifest.date}</TableCell>
                  <TableCell>{manifest.siteName || "-"}</TableCell>
                  <TableCell>{manifest.sectionName || "-"}</TableCell>
                  <TableCell>{manifest.attention || "-"}</TableCell>
                  <TableCell>{manifest.transportVia || "-"}</TableCell>
                  <TableCell>
                    <span className="max-w-[200px] truncate block text-xs" title={manifest.finalDestination || undefined}>
                      {manifest.finalDestination || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="tabular-nums text-xs text-muted-foreground">{manifest.items.length} item</span>
                  </TableCell>
                  <TableCell>
                    <AdminStatusBadge value={manifest.status} />
                  </TableCell>
                  <TableCell>
                    <CargoManifestRowActions row={manifest} />
                  </TableCell>
                </TableRow>
                {expandedRows.has(manifest.id) ? (
                  <TableRow data-date-value={manifest.createdAt.toISOString()} data-filter-site={manifest.siteName ?? ""} data-filter-status={manifest.status}>
                    <TableCell colSpan={columns.length} className="bg-surface-container-low p-4">
                      <div className="rounded-[1rem] bg-white p-3 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10)]">
                        <h4 className="mb-2 text-sm font-semibold">Detail Barang</h4>
                        {manifest.items.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Tidak ada item</p>
                        ) : (
                          <div className="overflow-auto rounded-xl border border-border/70">
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                  <TableHead>No</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Serial Number</TableHead>
                                  <TableHead>Qty</TableHead>
                                  <TableHead>Brand</TableHead>
                                  <TableHead>Remark</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {manifest.items.map((item, index) => (
                                  <TableRow key={`${manifest.id}-${item.no}-${index}`}>
                                    <TableCell>{item.no}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>{item.serialNumber || "-"}</TableCell>
                                    <TableCell>{item.qty}</TableCell>
                                    <TableCell>{item.brand || "-"}</TableCell>
                                    <TableCell>{item.remark || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </MinimalTableShell>
  );
}
