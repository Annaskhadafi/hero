"use client";

import { Fragment, useState } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { Rows3, ChevronDown, ChevronUp, History, FileText } from "lucide-react";
import { ApdInventoryGroupedRow } from "@/lib/apd-inventory-data";

interface ApdInventoryTableProps {
  data: ApdInventoryGroupedRow[];
}

export function ApdInventoryTable({ data }: ApdInventoryTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (employeeId: number, itemName: string) => {
    const key = `${employeeId}-${itemName}`;
    setExpandedRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const columns = [
    { key: "sn", label: "SN Karyawan" },
    { key: "name", label: "Nama Karyawan" },
    { key: "item", label: "Nama Barang" },
    { key: "category", label: "Kategori" },
    { key: "status", label: "Status" },
    { key: "assign", label: "Tanggal Assign" },
    { key: "due", label: "Due Date Pergantian" },
    { key: "history", label: "Riwayat" },
  ];

  return (
    <Card className="surface-module-card overflow-hidden rounded-[1.2rem] border-0 p-0">
      <div className="flex flex-col gap-3 bg-surface-container-low px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface-container-lowest text-muted-foreground shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]">
              <Rows3 className="size-4" aria-hidden="true" />
            </span>
            <h3 className="truncate font-display text-base font-semibold tracking-normal text-foreground">
              Daftar Inventory
            </h3>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Semua data aset APD, material, dan tools karyawan.
          </p>
        </div>
        <span className="surface-chip inline-flex h-8 w-fit items-center rounded-full px-3 text-xs font-semibold text-muted-foreground">
          {data.length} data
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <MinimalTableShell
          label="daftar inventory"
          fileName="Daftar Inventory APD"
          searchPlaceholder="Cari di daftar inventory..."
          summaryClassName="bg-transparent px-1 py-0 shadow-none"
          columnOptions={columns.map((c) => ({ key: c.key, label: c.label, required: c.key === "sn" || c.key === "name" }))}
          showImport={false}
        >
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead key={column.key} className="h-10 text-[0.68rem] font-semibold uppercase text-muted-foreground">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => {
                const rowKey = `${row.employeeId}-${row.itemName}`;
                const isExpanded = expandedRows[rowKey];

                let dueLabel: React.ReactNode = "-";
                if (row.nextReplacementDue) {
                  const formatted = format(new Date(row.nextReplacementDue), "dd MMM yyyy", { locale: id });
                  const now = new Date();
                  const due = new Date(row.nextReplacementDue);
                  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
                  
                  if (row.status === "ACTIVE" && diffDays <= 7) {
                    dueLabel = (
                      <div className="flex flex-col gap-1">
                        <span>{formatted}</span>
                        <Badge variant="destructive" className="w-fit text-[10px]">Butuh Pergantian</Badge>
                      </div>
                    );
                  } else {
                    dueLabel = formatted;
                  }
                }

                return (
                  <Fragment key={rowKey}>
                    <TableRow 
                      className={`transition-colors cursor-pointer hover:bg-muted/35 ${isExpanded ? "bg-muted/35" : ""}`}
                      onClick={() => toggleRow(row.employeeId, row.itemName)}
                    >
                      <TableCell className="py-3.5 align-top text-sm whitespace-normal font-medium">{row.employeeSn}</TableCell>
                      <TableCell className="py-3.5 align-top text-sm whitespace-normal">{row.employeeName}</TableCell>
                      <TableCell className="py-3.5 align-top text-sm whitespace-normal">{row.itemName}</TableCell>
                      <TableCell className="py-3.5 align-top text-sm whitespace-normal">{row.itemCategory}</TableCell>
                      <TableCell className="py-3.5 align-top text-sm whitespace-normal">
                        <Badge variant={row.status === "ACTIVE" ? "default" : "secondary"}>
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 align-top text-sm whitespace-normal">
                        {row.assignedAt ? format(new Date(row.assignedAt), "dd MMM yyyy", { locale: id }) : "-"}
                      </TableCell>
                      <TableCell className="py-3.5 align-top text-sm whitespace-normal">{dueLabel}</TableCell>
                      <TableCell className="py-3.5 align-middle text-sm">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="h-7 px-2.5 rounded-md gap-1.5 bg-muted/60 text-xs font-semibold hover:bg-muted"
                        >
                          <History className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{row.history.length}</span>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                    
                    {isExpanded && (
                      <TableRow data-table-detail-row="true" className="border-b bg-muted/20">
                        <TableCell colSpan={8} className="px-4 py-3">
                          <div className="rounded-md border bg-background">
                            <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/10">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                History Perubahan
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {row.history.length} log
                              </span>
                            </div>
                            {row.history.length ? (
                              <div className="max-h-72 flex flex-col overflow-y-auto">
                                <div className="grid gap-2 px-3 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider sm:grid-cols-[120px_minmax(0,1fr)_130px_120px] border-b bg-muted/5">
                                  <div>Tanggal Distribusi</div>
                                  <div>Keterangan Distribusi</div>
                                  <div>Tanggal Sebelumnya</div>
                                  <div className="text-right">Lampiran Dokumen</div>
                                </div>
                                <div className="divide-y">
                                  {row.history.map((historyItem, index) => {
                                    const prevHistory = row.history[index + 1];
                                    const prevDate = prevHistory?.assignedAt 
                                      ? format(new Date(prevHistory.assignedAt), "dd/MM/yyyy", { locale: id }) 
                                      : "-";
                                    
                                    const isBaru = index === row.history.length - 1;
                                    
                                    return (
                                      <div key={historyItem.id} className="grid gap-2 px-3 py-2.5 text-xs sm:grid-cols-[120px_minmax(0,1fr)_130px_120px] items-center hover:bg-muted/30 transition-colors">
                                        <div className="text-muted-foreground font-medium">
                                          {historyItem.assignedAt ? format(new Date(historyItem.assignedAt), "dd/MM/yyyy", { locale: id }) : "-"}
                                        </div>
                                        <div className="min-w-0 flex flex-col items-start justify-center">
                                          <div className="flex items-center gap-2">
                                            <Badge variant={isBaru ? "default" : "secondary"} className="h-5 text-[10px] px-1.5 font-medium">
                                              {isBaru ? "Baru" : "Pergantian"}
                                            </Badge>
                                            {historyItem.size && <span className="font-medium text-slate-700">Size: {historyItem.size}</span>}
                                          </div>
                                          {historyItem.remarks && (
                                            <p className="mt-1 text-muted-foreground truncate w-full" title={historyItem.remarks}>
                                              {historyItem.remarks}
                                            </p>
                                          )}
                                        </div>
                                        <div className="text-muted-foreground">
                                          {prevDate}
                                        </div>
                                        <div className="text-right">
                                          {historyItem.attachmentUrl ? (
                                            <Button variant="link" size="sm" className="h-6 px-0 text-xs font-medium text-blue-600 hover:text-blue-700" asChild>
                                              <a href={historyItem.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                                <FileText className="mr-1.5 h-3.5 w-3.5" />
                                                Lihat Dokumen
                                              </a>
                                            </Button>
                                          ) : (
                                            <span className="text-muted-foreground/50 text-[10px] italic">Tidak ada</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                                Belum ada history perubahan.
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </MinimalTableShell>
      </div>
    </Card>
  );
}
