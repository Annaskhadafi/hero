"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Upload } from "lucide-react";

import { importActivityLibraryAction } from "@/app/dashboard/activity-hub/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTIVITY_LIBRARY_EXAMPLE_CSV,
  buildActivityLibraryCsv,
  getActivityLibraryImportValue,
  INITIAL_ACTIVITY_LIBRARY_IMPORT_STATE,
  parseActivityLibraryCsv,
  type ActivityLibraryCsvRow,
} from "@/lib/activity-library-import";

type ActivityLibraryRow = {
  id: number;
  activityCode: string;
  activityName: string;
  category: string;
  siteName: string | null;
  departmentName: string | null;
  sectionName: string | null;
  basePoints: number;
  complexityLevel: number;
  requiresPhoto: boolean;
  requiresEquipmentNo: boolean;
  requiresDuration: boolean;
  requiresLocationGps: boolean;
  requiresMaterialUsed: boolean;
  requiresTireCount: boolean;
  maxDailyCount: number;
  maxPointsPerDay: number;
  isAssignable: boolean;
  isSelfInput: boolean;
  approvalRequired: boolean;
  autoApproveIfGpsValid: boolean;
  slaHours: number;
  isActive: boolean;
};

function downloadCsv(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsvRows(rows: ActivityLibraryRow[]): ActivityLibraryCsvRow[] {
  return rows.map((row) => ({
    activityCode: row.activityCode,
    activityName: row.activityName,
    category: row.category,
    site: (row as any).siteNames ?? row.siteName ?? "",
    department: (row as any).departmentNames ?? row.departmentName ?? "",
    section: (row as any).sectionNames ?? row.sectionName ?? "",
    basePoints: row.basePoints,
    complexityLevel: row.complexityLevel,
    maxDailyCount: row.maxDailyCount,
    maxPointsPerDay: row.maxPointsPerDay,
    slaHours: row.slaHours,
    requiresPhoto: row.requiresPhoto,
    requiresEquipmentNo: row.requiresEquipmentNo,
    requiresDuration: row.requiresDuration,
    requiresLocationGps: row.requiresLocationGps,
    requiresMaterialUsed: row.requiresMaterialUsed,
    requiresTireCount: row.requiresTireCount,
    isAssignable: row.isAssignable,
    isSelfInput: row.isSelfInput,
    approvalRequired: row.approvalRequired,
    autoApproveIfGpsValid: row.autoApproveIfGpsValid,
    isActive: row.isActive,
  }));
}

export function ActivityLibraryImportExport({
  rows,
  currentEmployeeId,
  mode = "full",
}: {
  rows: ActivityLibraryRow[];
  currentEmployeeId: number | null;
  mode?: "full" | "import";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rawCsv, setRawCsv] = useState("");
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [actionState, formAction, isPending] = useActionState(
    importActivityLibraryAction,
    INITIAL_ACTIVITY_LIBRARY_IMPORT_STATE,
  );
  const parsedImport = useMemo(() => parseActivityLibraryCsv(rawCsv), [rawCsv]);
  const duplicateCodes = useMemo(() => {
    const counter = new Map<string, number>();

    for (const record of parsedImport.records) {
      const code = getActivityLibraryImportValue(record, "activityCode").trim();
      if (!code) continue;

      const normalized = code.toLowerCase();
      counter.set(normalized, (counter.get(normalized) ?? 0) + 1);
    }

    return Array.from(counter.entries())
      .filter(([, count]) => count > 1)
      .map(([code, count]) => ({ code, count }));
  }, [parsedImport]);
  const previewHeaders = parsedImport.headers.slice(0, 8);

  useEffect(() => {
    if (actionState.status === "success") {
      setRawCsv("");
      setOpen(false);
      startRefreshTransition(() => router.refresh());
    }
  }, [actionState.status, router, startRefreshTransition]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {mode === "full" ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="dense"
            onClick={() => downloadCsv(buildActivityLibraryCsv(toCsvRows(rows)), "activity-library-export.csv")}
          >
            <Download className="size-4" />
            Excel
          </Button>
          <Button
            type="button"
            variant="outline"
            size="dense"
            onClick={() => downloadCsv(ACTIVITY_LIBRARY_EXAMPLE_CSV, "activity-library-example.csv")}
          >
            <FileSpreadsheet className="size-4" />
            Template CSV
          </Button>
        </>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            type="button"
            size="dense"
          >
            <Upload className="size-4" />
            Import
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl border-0 bg-surface-container-lowest p-0 shadow-[0_28px_90px_rgba(8,32,51,0.22)]">
          <DialogHeader>
            <div className="rounded-t-[1.75rem] bg-[linear-gradient(135deg,rgba(0,52,97,0.96),rgba(0,75,135,0.92))] px-6 py-5 text-white">
              <DialogTitle className="text-xl">Import Kamus Aktivitas</DialogTitle>
              <DialogDescription className="mt-2 text-white/80">
                Support CSV comma atau semicolon. `activityCode` sama akan update record lama, bukan duplicate.
              </DialogDescription>
            </div>
          </DialogHeader>

          <form action={formAction} className="space-y-4 px-6 pb-6">
            <input type="hidden" name="createdByEmployeeId" value={currentEmployeeId ?? ""} />

            <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-3">
                <div className="rounded-[1.25rem] bg-surface-container-low p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <div className="mb-3">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Step 1</p>
                    <p className="text-sm font-semibold text-foreground">Upload file CSV</p>
                  </div>
                  <Input
                    name="file"
                    type="file"
                    accept=".csv,text/csv"
                    className="border-0 bg-white shadow-[0_10px_24px_rgba(8,32,51,0.08)]"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setRawCsv(await file.text());
                    }}
                  />
                  <p className="mt-3 text-xs text-muted-foreground">
                    Pakai file export existing atau `Template CSV`. Delimiter `;` juga didukung.
                  </p>
                </div>

                <div className="rounded-[1.25rem] bg-surface-container-low p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <div className="mb-3">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Step 2</p>
                    <p className="text-sm font-semibold text-foreground">Paste data langsung</p>
                  </div>
                  <Textarea
                    name="rawCsv"
                    value={rawCsv}
                    onChange={(event) => setRawCsv(event.target.value)}
                    className="min-h-64 border-0 bg-white font-mono text-xs shadow-[0_10px_24px_rgba(8,32,51,0.08)]"
                    placeholder={ACTIVITY_LIBRARY_EXAMPLE_CSV}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-[1.25rem] bg-surface-container-low p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Preview</p>
                      <p className="text-lg font-semibold text-foreground">Cek data sebelum import</p>
                    </div>
                    <Badge variant="outline" className="rounded-full border-0 bg-white px-3 py-1 shadow-[0_8px_18px_rgba(8,32,51,0.08)]">
                      {parsedImport.records.length > 0 ? "Siap import" : "Belum ada data"}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_10px_24px_rgba(8,32,51,0.08)]">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Rows</p>
                      <p className="mt-1 font-display text-2xl font-black text-foreground">{parsedImport.records.length}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_10px_24px_rgba(8,32,51,0.08)]">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Columns</p>
                      <p className="mt-1 font-display text-2xl font-black text-foreground">{parsedImport.headers.length}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 shadow-[0_10px_24px_rgba(8,32,51,0.08)]">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">Duplicate Code</p>
                      <p className="mt-1 font-display text-2xl font-black text-foreground">{duplicateCodes.length}</p>
                    </div>
                  </div>
                </div>

                {duplicateCodes.length > 0 ? (
                  <Alert className="border-0 bg-amber-50 text-amber-900 shadow-[0_10px_24px_rgba(8,32,51,0.08)]">
                    <AlertDescription>
                      Ditemukan {duplicateCodes.length} `activityCode` duplicate. Import pakai baris terakhir untuk kode yang sama.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="max-h-[320px] overflow-auto rounded-[1.25rem] border border-border/70 bg-white shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-surface-container-low">
                        {previewHeaders.length > 0 ? (
                          previewHeaders.map((header) => (
                            <TableHead key={header}>{header}</TableHead>
                          ))
                        ) : (
                          <TableHead>Belum ada kolom</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedImport.records.length > 0 ? (
                        parsedImport.records.slice(0, 5).map((record, index) => (
                          <TableRow key={`${index}-${record[parsedImport.headers[0]] ?? "row"}`} className="hover:bg-surface-container-low/60">
                            {previewHeaders.map((header) => (
                              <TableCell key={`${index}-${header}`} className="whitespace-nowrap text-xs">
                                {record[header] || "-"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={Math.max(previewHeaders.length, 1)} className="text-sm text-muted-foreground">
                            Download Example CSV, isi data, lalu upload/paste.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {actionState.status !== "idle" ? (
              <Alert
                className={
                  actionState.status === "error"
                    ? "border-0 bg-red-50 text-red-700 shadow-[0_10px_24px_rgba(8,32,51,0.08)]"
                    : "border-0 bg-emerald-50 text-emerald-700 shadow-[0_10px_24px_rgba(8,32,51,0.08)]"
                }
              >
                <AlertDescription>
                  {actionState.message}
                  {actionState.status === "success" ? (
                    <span>
                      {" "}
                      Baru: {actionState.importedCount ?? 0}, update: {actionState.updatedCount ?? 0},
                      skip: {actionState.skippedCount ?? 0}.
                    </span>
                  ) : null}
                </AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              className="h-12 w-full rounded-2xl bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] text-white shadow-[0_16px_34px_rgba(0,52,97,0.24)]"
              disabled={isPending || isRefreshing}
            >
              {isPending || isRefreshing ? "Importing..." : "Import ke Kamus Aktivitas"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
