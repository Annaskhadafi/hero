"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Upload, AlertCircle, CheckCircle2 } from "lucide-react";

import { importTrainingRecordsAction } from "@/app/dashboard/admin-actions";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  INITIAL_TRAINING_RECORD_IMPORT_STATE,
  parseTrainingRecordCsv,
  autoMapTrainingRecordHeaders,
  TRAINING_RECORD_EXAMPLE_CSV,
  TRAINING_RECORD_IMPORT_FIELDS,
} from "@/lib/training-record-import";

function downloadCsv(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function exportTrainingRecordsToCsv(records: any[]) {
  const headers = [
    "SN",
    "Nama Karyawan",
    "Department",
    "Section",
    "Training",
    "Provider",
    "Tanggal",
    "Bulan",
    "Tahun",
    "Expired At",
    "Status",
  ];

  const escapeCsv = (val: any) => {
    const s = String(val ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = records.map((r) =>
    [
      escapeCsv(r.employeeSn || ""),
      escapeCsv(r.employeeName || ""),
      escapeCsv(r.department || ""),
      escapeCsv(r.section || ""),
      escapeCsv(r.trainingName || ""),
      escapeCsv(r.provider || ""),
      escapeCsv(r.completedDate || ""),
      escapeCsv(r.completedMonth || ""),
      escapeCsv(r.completedYear ?? ""),
      escapeCsv(
        r.expiresAt
          ? new Date(r.expiresAt).toLocaleDateString("en-CA", { timeZone: "Asia/Makassar" })
          : ""
      ),
      escapeCsv(r.status || ""),
    ].join(",")
  );

  const csvContent = [headers.map((h) => `"${h}"`).join(","), ...rows].join("\r\n");
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadCsv(csvContent, `training-records-${dateStr}.csv`);
}

export function TrainingRecordImportExport({
  records = [],
  canEdit = true,
}: {
  records?: any[];
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rawCsv, setRawCsv] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [actionState, formAction, isPending] = useActionState(
    importTrainingRecordsAction,
    INITIAL_TRAINING_RECORD_IMPORT_STATE
  );
  const parsedImport = useMemo(() => parseTrainingRecordCsv(rawCsv), [rawCsv]);

  // Auto-map headers whenever parsed headers change
  useEffect(() => {
    if (parsedImport.headers.length > 0) {
      const autoMapped = autoMapTrainingRecordHeaders(parsedImport.headers);
      setMapping(autoMapped as Record<string, string>);
    } else {
      setMapping({});
    }
  }, [parsedImport.headers]);

  useEffect(() => {
    if (actionState.status === "success") {
      setRawCsv("");
      setMapping({});
      setOpen(false);
      startRefreshTransition(() => router.refresh());
    }
  }, [actionState.status, router, startRefreshTransition]);

  const isTrainingMapped = Boolean(mapping.trainingName);
  const isYearMapped = Boolean(mapping.completedYear);
  const canSubmit = isTrainingMapped && isYearMapped && parsedImport.records.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Example CSV download */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 rounded-lg"
        onClick={() => downloadCsv(TRAINING_RECORD_EXAMPLE_CSV, "training-record-example.csv")}
      >
        <FileSpreadsheet className="mr-2 size-4 text-emerald-600" />
        Example CSV
      </Button>

      {/* Export CSV button with Tanggal & Bulan */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9 rounded-lg"
        onClick={() => exportTrainingRecordsToCsv(records)}
      >
        <Download className="mr-2 size-4 text-primary" />
        Export CSV
      </Button>

      {/* Import Dialog */}
      {canEdit && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" size="sm" className="h-9 rounded-lg">
              <Upload className="mr-2 size-4" />
              Import Data
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Import Training Records</DialogTitle>
              <DialogDescription>
                Upload file CSV atau Excel riwayat training karyawan. Anda dapat menyesuaikan pemetaan (mapping) kolom sebelum data diproses.
              </DialogDescription>
            </DialogHeader>

            <form action={formAction} className="space-y-4">
              <input type="hidden" name="mapping" value={JSON.stringify(mapping)} />

              <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                {/* Left column: File input and Paste */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">File CSV / Excel</p>
                    <Input
                      name="file"
                      type="file"
                      accept=".csv,text/csv,.xlsx,.xls"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const lowerName = file.name.toLowerCase();
                        if (lowerName.endsWith(".xls") || lowerName.endsWith(".xlsx")) {
                          const buffer = await file.arrayBuffer();
                          const XLSX = await import("xlsx");
                          const workbook = XLSX.read(buffer, { type: "array" });
                          const firstSheet = workbook.SheetNames[0];
                          const worksheet = workbook.Sheets[firstSheet];
                          const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(
                            worksheet,
                            { header: 1, raw: false, defval: "", blankrows: false }
                          );

                          const knownHeaders = [
                            "nama",
                            "employee",
                            "training",
                            "sertifikasi",
                            "tahun",
                            "completed year",
                            "provider",
                            "bulan",
                            "tanggal",
                            "status",
                          ];
                          let headerIndex = 0;
                          for (let i = 0; i < Math.min(rows.length, 10); i++) {
                            const row = rows[i];
                            if (
                              row &&
                              row.some((cell) => {
                                const val = String(cell || "").toLowerCase();
                                return knownHeaders.some((kh) => val.includes(kh));
                              })
                            ) {
                              headerIndex = i;
                              break;
                            }
                          }

                          const normalized = rows
                            .slice(headerIndex)
                            .map((r: any[]) => r.map((c: any) => `${c ?? ""}`.trim()))
                            .filter((r: string[]) => r.some((c: string) => c.length > 0));
                          const csv = normalized
                            .map((r: string[]) =>
                              r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")
                            )
                            .join("\n");
                          setRawCsv(csv);
                        } else {
                          setRawCsv(await file.text());
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Paste data CSV</p>
                    <Textarea
                      name="rawCsv"
                      value={rawCsv}
                      onChange={(event) => setRawCsv(event.target.value)}
                      className="min-h-64 font-mono text-xs"
                      placeholder={TRAINING_RECORD_EXAMPLE_CSV}
                    />
                  </div>
                </div>

                {/* Right column: Mapping & Preview tabs */}
                <div className="space-y-3">
                  <Tabs defaultValue="mapping" className="w-full space-y-3">
                    <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low p-2">
                      <TabsList className="bg-surface-container-highest/60">
                        <TabsTrigger value="mapping" className="text-xs">
                          Mapping Kolom {isTrainingMapped && isYearMapped ? "✓" : "(!)"}
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="text-xs">
                          Preview ({parsedImport.records.length} baris)
                        </TabsTrigger>
                      </TabsList>
                      <Badge variant="outline" className="rounded-full text-xs">
                        {parsedImport.records.length > 0
                          ? `${parsedImport.records.length} baris siap`
                          : "Belum ada data"}
                      </Badge>
                    </div>

                    {/* Mapping Tab */}
                    <TabsContent value="mapping" className="space-y-2 mt-0">
                      <div className="rounded-lg border border-[rgba(66,71,80,0.12)] bg-surface-container-lowest p-2 text-xs text-muted-foreground">
                        Cocokkan kolom dari file Excel/CSV ke field database HERO. Kolom bertanda <span className="text-rose-500 font-bold">*</span> wajib dipetakan.
                      </div>

                      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                        {TRAINING_RECORD_IMPORT_FIELDS.map((field) => {
                          const currentMapped = mapping[field.key] ?? "";
                          return (
                            <div
                              key={field.key}
                              className="flex items-center justify-between gap-2 rounded-lg border border-[rgba(66,71,80,0.12)] bg-surface-container-lowest p-2.5 px-3 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-foreground">
                                    {field.label}
                                  </span>
                                  {field.required ? (
                                    <span className="text-rose-500 font-bold">*</span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">(opsional)</span>
                                  )}
                                  {currentMapped ? (
                                    <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 ml-auto mr-2" />
                                  ) : field.required ? (
                                    <AlertCircle className="size-3.5 text-amber-500 shrink-0 ml-auto mr-2" />
                                  ) : null}
                                </div>
                                <span className="block text-[11px] text-muted-foreground truncate">
                                  Field: {field.key}
                                </span>
                              </div>
                              <select
                                value={currentMapped}
                                onChange={(e) =>
                                  setMapping((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                className="h-8 w-[190px] truncate rounded-md border border-[rgba(66,71,80,0.15)] bg-background px-2 text-xs shadow-none"
                              >
                                <option value="">– Tidak Dipetakan –</option>
                                {parsedImport.headers.map((h) => (
                                  <option key={h} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>

                    {/* Preview Tab */}
                    <TabsContent value="preview" className="mt-0">
                      <div className="max-h-[320px] overflow-auto rounded-xl border border-[rgba(66,71,80,0.12)]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {parsedImport.headers.length > 0 ? (
                                parsedImport.headers.slice(0, 10).map((header) => (
                                  <TableHead key={header} className="whitespace-nowrap text-xs">
                                    {header}
                                  </TableHead>
                                ))
                              ) : (
                                <TableHead>Belum ada kolom</TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {parsedImport.records.length > 0 ? (
                              parsedImport.records.slice(0, 8).map((record, index) => (
                                <TableRow key={`${index}-${record[parsedImport.headers[0]] ?? "row"}`}>
                                  {parsedImport.headers.slice(0, 10).map((header) => (
                                    <TableCell key={`${index}-${header}`} className="whitespace-nowrap text-xs">
                                      {record[header] || "-"}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell className="text-sm text-muted-foreground" colSpan={4}>
                                  Download Example CSV, isi data, lalu upload atau paste.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              {(!isTrainingMapped || !isYearMapped) && parsedImport.headers.length > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-2.5 text-xs text-amber-700">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>
                    Pastikan kolom <strong>Training</strong> dan <strong>Tahun</strong> sudah dipetakan pada tab Mapping Kolom.
                  </span>
                </div>
              )}

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

              <Button
                type="submit"
                className="w-full rounded-xl"
                disabled={isPending || isRefreshing || !canSubmit}
              >
                {isPending || isRefreshing ? "Importing..." : "Import Training Records"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
