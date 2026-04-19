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
  INITIAL_ACTIVITY_LIBRARY_IMPORT_STATE,
  parseActivityLibraryCsv,
  type ActivityLibraryCsvRow,
} from "@/lib/activity-library-import";

type ActivityLibraryRow = {
  id: number;
  activityCode: string;
  activityName: string;
  category: string;
  departmentName: string | null;
  sectionName: string | null;
  basePoints: number;
  complexityLevel: number;
  requiresPhoto: boolean;
  requiresEquipmentNo: boolean;
  requiresDuration: boolean;
  requiresLocationGps: boolean;
  requiresMaterialUsed: boolean;
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
    department: row.departmentName ?? "",
    section: row.sectionName ?? "",
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
}: {
  rows: ActivityLibraryRow[];
  currentEmployeeId: number | null;
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

  useEffect(() => {
    if (actionState.status === "success") {
      setRawCsv("");
      setOpen(false);
      startRefreshTransition(() => router.refresh());
    }
  }, [actionState.status, router, startRefreshTransition]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 rounded-lg"
        onClick={() => downloadCsv(buildActivityLibraryCsv(toCsvRows(rows)), "activity-library-export.csv")}
      >
        <Download className="mr-2 size-4" />
        Export Data
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 rounded-lg"
        onClick={() => downloadCsv(ACTIVITY_LIBRARY_EXAMPLE_CSV, "activity-library-example.csv")}
      >
        <FileSpreadsheet className="mr-2 size-4" />
        Example CSV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" className="h-9 rounded-lg">
            <Upload className="mr-2 size-4" />
            Import Data
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Import Activity Library</DialogTitle>
            <DialogDescription>
              Upload CSV dari Example CSV. Data dengan activityCode sama akan update, bukan duplicate.
            </DialogDescription>
          </DialogHeader>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="createdByEmployeeId" value={currentEmployeeId ?? ""} />

            <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium">File CSV</p>
                  <Input
                    name="file"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setRawCsv(await file.text());
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Paste data</p>
                  <Textarea
                    name="rawCsv"
                    value={rawCsv}
                    onChange={(event) => setRawCsv(event.target.value)}
                    className="min-h-64 font-mono text-xs"
                    placeholder={ACTIVITY_LIBRARY_EXAMPLE_CSV}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low p-3">
                  <div>
                    <p className="text-sm font-semibold">Preview Import</p>
                    <p className="text-xs text-muted-foreground">
                      {parsedImport.records.length} baris, {parsedImport.headers.length} kolom.
                    </p>
                  </div>
                  <Badge variant="outline" className="rounded-full">
                    {parsedImport.records.length > 0 ? "Siap cek" : "Belum ada data"}
                  </Badge>
                </div>

                <div className="max-h-[320px] overflow-auto rounded-xl border border-[rgba(66,71,80,0.12)]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {parsedImport.headers.length > 0 ? (
                          parsedImport.headers.slice(0, 8).map((header) => (
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
                          <TableRow key={`${index}-${record[parsedImport.headers[0]] ?? "row"}`}>
                            {parsedImport.headers.slice(0, 8).map((header) => (
                              <TableCell key={`${index}-${header}`} className="whitespace-nowrap text-xs">
                                {record[header] || "-"}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell className="text-sm text-muted-foreground">
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
                    ? "border-red-200 text-red-700"
                    : "border-emerald-200 text-emerald-700"
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

            <Button type="submit" className="w-full rounded-xl" disabled={isPending || isRefreshing}>
              {isPending || isRefreshing ? "Importing..." : "Import Activity Library"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

