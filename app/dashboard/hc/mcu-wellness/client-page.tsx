"use client";

import { Fragment, useMemo, useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  HeartPulse,
  Loader2,
  Plus,
  TrendingUp,
  Upload,
  Stethoscope,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getMcuWellnessList,
  getMcuDetail,
  setMcuStatus,
  scheduleEmployeeMcu,
  uploadMcuResultFile,
  createManualMcu,
  saveAiResultForEmployee,
  getHealthDashboardData,
  sendMcuReminderNow,
  sendBulkMcuReminders,
  type McuListRow,
  type McuReminderRow,
} from "@/app/actions/mcu-wellness";
import { AdminPageShell } from "@/components/admin-page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format, parseISO, differenceInCalendarDays } from "date-fns";

import {
  MCU_CATEGORY_LABELS,
  MCU_METRIC_CATEGORIES,
  MCU_METRIC_KEYS,
  MCU_METRIC_LABELS,
  type McuAiExtraction,
  type McuMetricEntry,
} from "@/lib/mcu-wellness-ai";

type FilterOptions = {
  departments: Array<{ id: number; name: string }>;
  sections: Array<{ id: number; name: string }>;
};

type Clinic = {
  id: number;
  name: string;
  email: string;
  paketOptions: string[] | null;
};

type Props = {
  initialMcuList: McuListRow[];
  filterOptions: FilterOptions;
  clinics: Clinic[];
  initialReminders: McuReminderRow[];
  initialReminderScorecards: {
    total: number;
    overdue: number;
    due: number;
    upcoming: number;
    noRecord: number;
  };
  initialDashboardData: Awaited<ReturnType<typeof getHealthDashboardData>>;
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-sky-50 text-sky-700 border-sky-200" },
  done: { label: "Done", className: "bg-slate-100 text-slate-700 border-slate-200" },
  fit: { label: "Fit", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  unfit: { label: "Unfit", className: "bg-rose-50 text-rose-700 border-rose-200" },
  pending_review: { label: "Perlu Review", className: "bg-amber-50 text-amber-700 border-amber-200" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-500 border-slate-200" },
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  try {
    return format(parseISO(value), "dd MMM yyyy");
  } catch {
    return value;
  }
}

function getReminderBadge(row: McuListRow) {
  if (!row.nextMcuDue) {
    return <Badge variant="outline" className="bg-slate-50 text-slate-600">Belum ada</Badge>;
  }
  try {
    const due = parseISO(row.nextMcuDue);
    const days = differenceInCalendarDays(due, new Date());
    if (days < 0) {
      return (
        <Badge className="bg-rose-50 text-rose-700 border-rose-200">
          Overdue {Math.abs(days)} hari
        </Badge>
      );
    }
    if (days <= 30) {
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200">
          Due {days} hari
        </Badge>
      );
    }
    if (days <= 90) {
      return (
        <Badge className="bg-sky-50 text-sky-700 border-sky-200">
          {days} hari lagi
        </Badge>
      );
    }
    return <Badge variant="outline" className="bg-slate-50 text-slate-600">{days} hari</Badge>;
  } catch {
    return <Badge variant="outline">{row.nextMcuDue}</Badge>;
  }
}

// ─── Tab 1: MCU Karyawan ────────────────────────────────────────────────

function McuKaryawanTab({
  rows,
  filterOptions,
  clinics,
}: {
  rows: McuListRow[];
  filterOptions: FilterOptions;
  clinics: Clinic[];
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<{
    mcuId: number;
    metrics: Array<{ category: string; metricKey: string; metricValue: string; metricUnit: string; flag: string }>;
    employee: { name: string; employeeSn: string; departmentName: string; sectionName: string; jobTitle: string; fitStatus: string } | null;
    mcu: Record<string, unknown>;
  } | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docName, setDocName] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Schedule dialog
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleEmployee, setScheduleEmployee] = useState<McuListRow | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    clinicId: "",
    paketMcu: "",
    scheduledDate: "",
  });

  // Manual MCU dialog
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    employeeId: "",
    employeeName: "",
    mcuDate: "",
    clinicName: "",
    paketMcu: "",
    examinedBy: "",
    notes: "",
    status: "done",
  });

  // Upload dialog
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<McuListRow | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Status dialog
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<McuListRow | null>(null);
  const [statusValue, setStatusValue] = useState("done");

  const access = { canView: true, canEdit: true, canDelete: false };

  const handleExpand = async (row: McuListRow) => {
    if (!row.id) return;
    if (expandedId === row.id) {
      setExpandedId(null);
      return;
    }
    setLoading(true);
    try {
      const res = await getMcuDetail(row.id);
      if (res) {
        setDetail({
          mcuId: row.id,
          metrics: res.metrics as Array<{ category: string; metricKey: string; metricValue: string; metricUnit: string; flag: string }>,
          employee: res.employee as unknown as { name: string; employeeSn: string; departmentName: string; sectionName: string; jobTitle: string; fitStatus: string },
          mcu: res.mcu as Record<string, unknown>,
        });
        setExpandedId(row.id);
      }
    } catch (e) {
      toast.error("Gagal memuat detail MCU");
    } finally {
      setLoading(false);
    }
  };

  const openSchedule = (row: McuListRow) => {
    setScheduleEmployee(row);
    setScheduleForm({ clinicId: "", paketMcu: "", scheduledDate: format(new Date(), "yyyy-MM-dd") });
    setScheduleOpen(true);
  };

  const submitSchedule = async () => {
    if (!scheduleEmployee || !scheduleForm.scheduledDate) return;
    const clinic = clinics.find((c) => String(c.id) === scheduleForm.clinicId);
    try {
      await scheduleEmployeeMcu(scheduleEmployee.employeeId, {
        clinicId: scheduleForm.clinicId ? Number(scheduleForm.clinicId) : null,
        clinicName: clinic?.name ?? "",
        clinicEmail: clinic?.email ?? "",
        paketMcu: scheduleForm.paketMcu || clinic?.paketOptions?.[0] || "",
        scheduledDate: parseISO(scheduleForm.scheduledDate),
      });
      toast.success("MCU dijadwalkan untuk " + scheduleEmployee.employeeName);
      setScheduleOpen(false);
      window.location.reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menjadwalkan MCU");
    }
  };

  const openManual = () => {
    setManualForm({
      employeeId: "",
      employeeName: "",
      mcuDate: format(new Date(), "yyyy-MM-dd"),
      clinicName: "",
      paketMcu: "",
      examinedBy: "",
      notes: "",
      status: "done",
    });
    setManualOpen(true);
  };

  const submitManual = async () => {
    if (!manualForm.employeeId || !manualForm.mcuDate) {
      toast.error("Karyawan dan tanggal MCU wajib diisi");
      return;
    }
    try {
      await createManualMcu(Number(manualForm.employeeId), {
        clinicName: manualForm.clinicName,
        paketMcu: manualForm.paketMcu,
        mcuDate: manualForm.mcuDate,
        status: manualForm.status,
        examinedBy: manualForm.examinedBy,
        notes: manualForm.notes,
      });
      toast.success("Record MCU berhasil dibuat");
      setManualOpen(false);
      window.location.reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat record MCU");
    }
  };

  const openUpload = (row: McuListRow) => {
    setUploadTarget(row);
    setUploadFile(null);
    setUploadOpen(true);
  };

  const submitUpload = async () => {
    if (!uploadTarget || !uploadFile) {
      toast.error("Pilih file hasil MCU");
      return;
    }
    if (!uploadTarget.id) {
      toast.error("Karyawan belum punya record MCU. Buat record manual dulu.");
      return;
    }
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        await uploadMcuResultFile(
          uploadTarget.id,
          base64,
          uploadFile.name,
          uploadFile.type || "application/pdf",
        );
        toast.success("File hasil MCU diunggah");
        setUploadOpen(false);
        window.location.reload();
      };
      reader.readAsDataURL(uploadFile);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal unggah file");
    }
  };

  const openStatus = (row: McuListRow) => {
    setStatusTarget(row);
    setStatusValue(row.status || "done");
    setStatusOpen(true);
  };

  const submitStatus = async () => {
    if (!statusTarget) return;
    try {
      await setMcuStatus(statusTarget.id, statusValue);
      toast.success("Status MCU diperbarui");
      setStatusOpen(false);
      window.location.reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal update status");
    }
  };

  const scorecards = [
    { label: "Total Karyawan", value: rows.length, tone: "default" as const, icon: <HeartPulse className="size-5" /> },
    { label: "Fit", value: rows.filter((r) => r.status === "fit").length, tone: "success" as const, icon: <Activity className="size-5" /> },
    { label: "Unfit", value: rows.filter((r) => r.status === "unfit").length, tone: "danger" as const, icon: <AlertTriangle className="size-5" /> },
    { label: "Perlu Review", value: rows.filter((r) => r.status === "pending_review").length, tone: "warning" as const, icon: <Stethoscope className="size-5" /> },
  ];

  return (
    <MinimalTableShell
      label="MCU Karyawan"
      title="Daftar MCU Karyawan"
      description="Riwayat Medical Check Up tahunan karyawan aktif."
      fileName="mcu-karyawan"
      searchPlaceholder="Cari nama / SN / jabatan..."
      access={access}
      scorecards={scorecards}
      dateFilter={true}
      primaryAction={
        <Button onClick={openManual} className="bg-[#0f172a] text-white hover:bg-[#1e293b]">
          <Plus className="size-4" /> Tambah Record MCU
        </Button>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Nama</TableHead>
            <TableHead>SN</TableHead>
            <TableHead>Dept / Section</TableHead>
            <TableHead>Terakhir MCU</TableHead>
            <TableHead>Reminder MCU</TableHead>
            <TableHead>Doc MCU</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                Belum ada data MCU karyawan.
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => {
            const isExpanded = expandedId === row.id;
            return (
              <Fragment key={row.employeeId}>
                <TableRow data-date-value={row.mcuDate ?? ""}>
                  <TableCell className="p-2">
                    <button
                      type="button"
                      onClick={() => handleExpand(row)}
                      className="grid size-6 place-items-center rounded hover:bg-slate-100"
                      aria-label={isExpanded ? "Tutup detail" : "Buka detail"}
                    >
                      {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">{row.employeeName}</TableCell>
                  <TableCell className="text-muted-foreground">{row.employeeSn || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <div className="text-xs leading-4">
                      <div>{row.departmentName || "-"}</div>
                      <div className="text-muted-foreground">{row.sectionName || "-"}</div>
                    </div>
                  </TableCell>
                  <TableCell data-date-value={row.mcuDate ?? ""}>{formatDate(row.mcuDate)}</TableCell>
                  <TableCell>{getReminderBadge(row)}</TableCell>
                  <TableCell>
                    {row.resultFileUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDocUrl(row.resultFileUrl);
                          setDocName(row.resultFileName || "Dokumen MCU");
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[#0f172a] hover:bg-slate-100"
                      >
                        <FileText className="size-4" /> Lihat
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const s = STATUS_BADGE[row.status] ?? STATUS_BADGE.done;
                      return (
                        <Badge variant="outline" className={s.className}>
                          {s.label}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleExpand(row)} title="Lihat detail">
                        <Eye className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openSchedule(row)} title="Jadwalkan MCU">
                        <CalendarClock className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openUpload(row)} title="Upload hasil MCU">
                        <Upload className="size-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openStatus(row)} title="Set status">
                        <Stethoscope className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                {isExpanded && detail && detail.mcuId === row.id && (
                  <TableRow key={`detail-${row.employeeId}`} data-table-detail-row="true">
                    <TableCell colSpan={9} className="bg-slate-50/60 p-4">
                      <div className="space-y-4">
                        {/* AI Summary */}
                        {(row.aiKesimpulan || row.aiSaran) && (
                          <div className="grid gap-3 lg:grid-cols-3">
                            <div className="rounded-xl bg-white p-3 shadow-sm lg:col-span-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kesimpulan AI</p>
                              <p className="mt-1 text-sm text-foreground">{row.aiKesimpulan || "-"}</p>
                            </div>
                            <div className="rounded-xl bg-white p-3 shadow-sm">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saran AI</p>
                              <p className="mt-1 text-sm text-foreground">{row.aiSaran || "-"}</p>
                            </div>
                          </div>
                        )}

                        {/* Metrics per category */}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Hasil Pemeriksaan per Kategori
                          </p>
                          {MCU_METRIC_CATEGORIES.map((cat) => {
                            const catMetrics = detail.metrics.filter((m) => m.category === cat);
                            return (
                              <div key={cat} className="rounded-xl bg-white p-3 shadow-sm">
                                <p className="text-sm font-semibold text-foreground">{MCU_CATEGORY_LABELS[cat]}</p>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                  {MCU_METRIC_KEYS[cat].map((key) => {
                                    const m = catMetrics.find((x) => x.metricKey === key);
                                    return (
                                      <div key={key} className="rounded-lg border border-slate-100 p-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                          {MCU_METRIC_LABELS[key] ?? key}
                                        </p>
                                        <p className="mt-0.5 text-sm font-medium text-foreground">
                                          {m?.metricValue ? `${m.metricValue}${m.metricUnit ? ` ${m.metricUnit}` : ""}` : "-"}
                                        </p>
                                        {m?.flag && m.flag !== "normal" && (
                                          <Badge className="mt-1 bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                                            {m.flag}
                                          </Badge>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                          {detail.metrics.length === 0 && (
                            <p className="text-sm text-muted-foreground">Belum ada metrics. Jalankan AI Analisa untuk ekstrak otomatis.</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {isExpanded && loading && (
                  <TableRow data-table-detail-row="true">
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-4">
                      Memuat detail...
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      {/* Doc Viewer Popup */}
      <Dialog open={!!docUrl} onOpenChange={(o) => { if (!o) { setDocUrl(null); setDocName(""); } }}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden p-0">
          <DialogHeader className="px-5 pt-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5" /> {docName}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[72vh] w-full bg-slate-100">
            {docUrl && (
              <iframe src={docUrl} className="h-full w-full" title={docName} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Jadwalkan MCU</DialogTitle>
            <DialogDescription>
              {scheduleEmployee ? `Untuk ${scheduleEmployee.employeeName} (${scheduleEmployee.employeeSn})` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Klinik</Label>
              <Select value={scheduleForm.clinicId} onValueChange={(v) => setScheduleForm({ ...scheduleForm, clinicId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih klinik..." /></SelectTrigger>
                <SelectContent>
                  {clinics.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Paket MCU</Label>
              <Input
                value={scheduleForm.paketMcu}
                onChange={(e) => setScheduleForm({ ...scheduleForm, paketMcu: e.target.value })}
                placeholder="Mis. Standard / Executive"
              />
            </div>
            <div>
              <Label className="text-xs">Tanggal Jadwal</Label>
              <Input
                type="date"
                value={scheduleForm.scheduledDate}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Batal</Button>
            <Button onClick={submitSchedule}>Jadwalkan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual MCU Dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Record MCU Manual</DialogTitle>
            <DialogDescription>Buat record MCU untuk karyawan tanpa upload dokumen.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Karyawan</Label>
              <SearchableSelect
                label="Karyawan"
                value={manualForm.employeeId}
                onValueChange={(v) => {
                  const emp = rows.find((r) => r.employeeId === Number(v));
                  setManualForm({ ...manualForm, employeeId: v, employeeName: emp?.employeeName ?? "" });
                }}
                options={rows.map((r) => ({
                  value: String(r.employeeId),
                  label: `${r.employeeName}${r.employeeSn ? ` (${r.employeeSn})` : ""}`,
                }))}
                placeholder="Pilih karyawan..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tanggal MCU</Label>
                <Input type="date" value={manualForm.mcuDate} onChange={(e) => setManualForm({ ...manualForm, mcuDate: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={manualForm.status} onValueChange={(v) => setManualForm({ ...manualForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="fit">Fit</SelectItem>
                    <SelectItem value="unfit">Unfit</SelectItem>
                    <SelectItem value="pending_review">Perlu Review</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Klinik</Label>
              <Input value={manualForm.clinicName} onChange={(e) => setManualForm({ ...manualForm, clinicName: e.target.value })} placeholder="Nama klinik..." />
            </div>
            <div>
              <Label className="text-xs">Paket MCU</Label>
              <Input value={manualForm.paketMcu} onChange={(e) => setManualForm({ ...manualForm, paketMcu: e.target.value })} placeholder="Mis. Standard" />
            </div>
            <div>
              <Label className="text-xs">Diperiksa Oleh</Label>
              <Input value={manualForm.examinedBy} onChange={(e) => setManualForm({ ...manualForm, examinedBy: e.target.value })} placeholder="Nama dokter/klinik..." />
            </div>
            <div>
              <Label className="text-xs">Catatan</Label>
              <Textarea rows={2} value={manualForm.notes} onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>Batal</Button>
            <Button onClick={submitManual}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Hasil MCU</DialogTitle>
            <DialogDescription>
              {uploadTarget ? `Untuk ${uploadTarget.employeeName}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!uploadTarget?.id && (
              <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-700">
                Karyawan belum punya record MCU. Buat record manual dulu sebelum upload.
              </p>
            )}
            <div>
              <Label className="text-xs">File Hasil MCU (PDF / JPG / PNG)</Label>
              <Input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Batal</Button>
            <Button onClick={submitUpload} disabled={!uploadFile || !uploadTarget?.id}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Status MCU</DialogTitle>
            <DialogDescription>
              {statusTarget ? `${statusTarget.employeeName}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={statusValue} onValueChange={setStatusValue}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="fit">Fit</SelectItem>
                <SelectItem value="unfit">Unfit</SelectItem>
                <SelectItem value="pending_review">Perlu Review</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOpen(false)}>Batal</Button>
            <Button onClick={submitStatus}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MinimalTableShell>
  );
}

// ─── Tab 2: Reminder MCU ────────────────────────────────────────────────

function ReminderStatusBadge({ status }: { status: McuReminderRow["reminderStatus"] }) {
  const map: Record<string, { label: string; className: string }> = {
    overdue: { label: "Overdue", className: "bg-rose-50 text-rose-700 border-rose-200" },
    due: { label: "Due", className: "bg-amber-50 text-amber-700 border-amber-200" },
    upcoming: { label: "Upcoming", className: "bg-sky-50 text-sky-700 border-sky-200" },
    none: { label: "Aman", className: "bg-slate-50 text-slate-600 border-slate-200" },
  };
  const s = map[status] ?? map.none;
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

function McuReminderTab({
  reminders,
  scorecards: initialScorecards,
  filterOptions,
  clinics,
}: {
  reminders: McuReminderRow[];
  scorecards: Props["initialReminderScorecards"];
  filterOptions: FilterOptions;
  clinics: Clinic[];
}) {
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<McuReminderRow | null>(null);
  const [scheduleForm, setScheduleForm] = useState({ clinicId: "", paketMcu: "", scheduledDate: "" });
  const [sendingReminder, setSendingReminder] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);

  const filtered = useMemo(() => {
    return reminders.filter((r) => {
      if (deptFilter !== "all" && r.departmentName !== deptFilter) return false;
      if (sectionFilter !== "all" && r.sectionName !== sectionFilter) return false;
      if (statusFilter !== "all" && r.reminderStatus !== statusFilter) return false;
      return true;
    });
  }, [reminders, deptFilter, sectionFilter, statusFilter]);

  const filteredScorecards = useMemo(() => {
    return {
      total: filtered.length,
      overdue: filtered.filter((r) => r.reminderStatus === "overdue").length,
      due: filtered.filter((r) => r.reminderStatus === "due").length,
      upcoming: filtered.filter((r) => r.reminderStatus === "upcoming").length,
      noRecord: filtered.filter((r) => !r.lastMcuDate).length,
    };
  }, [filtered]);

  const deptNames = useMemo(() => Array.from(new Set(reminders.map((r) => r.departmentName).filter(Boolean))), [reminders]);
  const sectionNames = useMemo(() => Array.from(new Set(reminders.map((r) => r.sectionName).filter(Boolean))), [reminders]);

  const scorecardItems = [
    { label: "Total Karyawan", value: filteredScorecards.total, tone: "default" as const, icon: <HeartPulse className="size-5" /> },
    { label: "Overdue", value: filteredScorecards.overdue, tone: "danger" as const, icon: <AlertTriangle className="size-5" /> },
    { label: "Due (30 hari)", value: filteredScorecards.due, tone: "warning" as const, icon: <Bell className="size-5" /> },
    { label: "Belum Punya MCU", value: filteredScorecards.noRecord, tone: "info" as const, icon: <CalendarClock className="size-5" /> },
  ];

  const openSchedule = (row: McuReminderRow) => {
    setScheduleTarget(row);
    setScheduleForm({ clinicId: "", paketMcu: "", scheduledDate: format(new Date(), "yyyy-MM-dd") });
    setScheduleOpen(true);
  };

  const submitSchedule = async () => {
    if (!scheduleTarget || !scheduleForm.scheduledDate) return;
    const clinic = clinics.find((c) => String(c.id) === scheduleForm.clinicId);
    try {
      await scheduleEmployeeMcu(scheduleTarget.employeeId, {
        clinicId: scheduleForm.clinicId ? Number(scheduleForm.clinicId) : null,
        clinicName: clinic?.name ?? "",
        clinicEmail: clinic?.email ?? "",
        paketMcu: scheduleForm.paketMcu || clinic?.paketOptions?.[0] || "",
        scheduledDate: parseISO(scheduleForm.scheduledDate),
      });
      toast.success("MCU dijadwalkan untuk " + scheduleTarget.employeeName);
      setScheduleOpen(false);
      window.location.reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menjadwalkan MCU");
    }
  };

  const handleSendReminder = async (row: McuReminderRow) => {
    setSendingReminder(true);
    try {
      const r = await sendMcuReminderNow(row.employeeId);
      if (r.status === "sent") toast.success(`Reminder terkirim ke ${row.employeeName}`);
      else if (r.status === "skipped") toast.warning(`Reminder dilewati: ${r.reason}`);
      else toast.error(`Gagal: ${r.reason}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal kirim reminder");
    } finally {
      setSendingReminder(false);
    }
  };

  const handleSendBulkReminders = async () => {
    const overdueAndDueIds = filtered
      .filter((r) => r.reminderStatus === "overdue" || r.reminderStatus === "due")
      .map((r) => r.employeeId);
    if (overdueAndDueIds.length === 0) {
      toast.info("Tidak ada karyawan overdue/due untuk diingatkan");
      return;
    }
    setSendingBulk(true);
    try {
      const r = await sendBulkMcuReminders(overdueAndDueIds);
      toast.success(`Reminder terkirim: ${r.sent}, dilewati: ${r.skipped}, gagal: ${r.failed}`);
      window.location.reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal kirim bulk reminder");
    } finally {
      setSendingBulk(false);
    }
  };

  const access = { canView: true, canEdit: true, canDelete: false };

  return (
    <MinimalTableShell
      label="Reminder MCU"
      title="Reminder MCU Tahunan"
      description="Daftar karyawan aktif dengan status reminder MCU tahunan (setahun sekali)."
      fileName="reminder-mcu"
      searchPlaceholder="Cari nama karyawan..."
      access={access}
      scorecards={scorecardItems}
      dateFilter={false}
      primaryAction={
        <Button
          onClick={handleSendBulkReminders}
          disabled={sendingBulk}
          className="bg-[#0f172a] text-white hover:bg-[#1e293b]"
        >
          <Bell className="size-4" /> {sendingBulk ? "Mengirim..." : "Kirim Semua Reminder"}
        </Button>
      }
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Semua Dept" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Departemen</SelectItem>
              {deptNames.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Semua Section" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Section</SelectItem>
              {sectionNames.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Semua Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="due">Due</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="none">Aman</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
            <TableHead>SN</TableHead>
            <TableHead>Dept / Section</TableHead>
            <TableHead>Terakhir MCU</TableHead>
            <TableHead>Jatuh Tempo Berikutnya</TableHead>
            <TableHead>Hari Lagi</TableHead>
            <TableHead>Status Reminder</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                Tidak ada karyawan dengan filter ini.
              </TableCell>
            </TableRow>
          )}
          {filtered.map((row) => (
            <TableRow key={row.employeeId}>
              <TableCell className="font-medium">{row.employeeName}</TableCell>
              <TableCell className="text-muted-foreground">{row.employeeSn || "-"}</TableCell>
              <TableCell className="text-muted-foreground">
                <div className="text-xs leading-4">
                  <div>{row.departmentName || "-"}</div>
                  <div className="text-muted-foreground">{row.sectionName || "-"}</div>
                </div>
              </TableCell>
              <TableCell>{formatDate(row.lastMcuDate)}</TableCell>
              <TableCell>{formatDate(row.nextMcuDue)}</TableCell>
              <TableCell>
                {row.daysUntilDue !== null ? (
                  <span className={row.daysUntilDue < 0 ? "text-rose-600 font-medium" : ""}>
                    {row.daysUntilDue < 0 ? `${Math.abs(row.daysUntilDue)} hari lalu` : `${row.daysUntilDue} hari`}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell><ReminderStatusBadge status={row.reminderStatus} /></TableCell>
              <TableCell className="text-right">
                <div className="inline-flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openSchedule(row)} title="Jadwalkan MCU">
                    <CalendarClock className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSendReminder(row)}
                    disabled={sendingReminder}
                    title="Kirim Reminder"
                  >
                    <Bell className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Jadwalkan MCU</DialogTitle>
            <DialogDescription>
              {scheduleTarget ? `Untuk ${scheduleTarget.employeeName} (${scheduleTarget.employeeSn})` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Klinik</Label>
              <Select value={scheduleForm.clinicId} onValueChange={(v) => setScheduleForm({ ...scheduleForm, clinicId: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih klinik..." /></SelectTrigger>
                <SelectContent>
                  {clinics.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Paket MCU</Label>
              <Input
                value={scheduleForm.paketMcu}
                onChange={(e) => setScheduleForm({ ...scheduleForm, paketMcu: e.target.value })}
                placeholder="Mis. Standard / Executive"
              />
            </div>
            <div>
              <Label className="text-xs">Tanggal Jadwal</Label>
              <Input
                type="date"
                value={scheduleForm.scheduledDate}
                onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Batal</Button>
            <Button onClick={submitSchedule}>Jadwalkan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MinimalTableShell>
  );
}

// ─── Tab 3: Analisa AI ──────────────────────────────────────────────────

type EditableMetric = { value: string; unit: string; flag: string };
type EditableMetrics = Partial<Record<string, Partial<Record<string, EditableMetric>>>>;

function McuAiTab({ rows }: { rows: McuListRow[] }) {
  const [employeeId, setEmployeeId] = useState<string>("");
  const [mcuDate, setMcuDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [examinedBy, setExaminedBy] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message: string }>({ type: "idle", message: "" });
  const [extraction, setExtraction] = useState<McuAiExtraction | null>(null);
  const [model, setModel] = useState<string>("");
  const [editKesimpulan, setEditKesimpulan] = useState("");
  const [editSaran, setEditSaran] = useState("");
  const [editKategori, setEditKategori] = useState<string>("Perlu Review");
  const [editMetrics, setEditMetrics] = useState<EditableMetrics>({});

  const handleFileChange = (f: File | null) => {
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setFilePreview(null);
    }
  };

  const runAnalysis = async () => {
    if (!file) {
      toast.error("Pilih file hasil MCU terlebih dahulu");
      setAiStatus({ type: "error", message: "Pilih file hasil MCU terlebih dahulu." });
      return;
    }
    if (!filePreview) return;
    if (!employeeId) {
      toast.error("Pilih karyawan terlebih dahulu");
      setAiStatus({ type: "error", message: "Pilih karyawan terlebih dahulu." });
      return;
    }
    setAnalyzing(true);
    setExtraction(null);
    setAiStatus({ type: "loading", message: "Langkah 1/2: OCR — mengekstrak teks dari dokumen via Mistral OCR... (PDF diupload ke S3 dulu)" });
    try {
      const base64 = filePreview.split(",")[1] ?? filePreview;
      const res = await fetch("/api/mcu-wellness/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: base64,
          mimeType: file.type || "application/pdf",
          fileName: file.name,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errMsg = err.error || `HTTP ${res.status}`;
        const hint = err.hint ? `\n${err.hint}` : "";
        throw new Error(errMsg + hint);
      }
      const data = await res.json();
      const ext = data.extraction as McuAiExtraction;
      setExtraction(ext);
      setModel(data.model || "");
      setEditKesimpulan(ext.kesimpulan || "");
      setEditSaran(ext.saran || "");
      setEditKategori(ext.kategori || "Perlu Review");
      const m: EditableMetrics = {};
      for (const cat of MCU_METRIC_CATEGORIES) {
        const catMap = ext.metrics?.[cat];
        if (!catMap) continue;
        m[cat] = {};
        for (const [key, entry] of Object.entries(catMap)) {
          if (entry) {
            m[cat]![key] = {
              value: entry.value || "",
              unit: entry.unit || "",
              flag: entry.flag || "normal",
            };
          }
        }
      }
      setEditMetrics(m);
      setAiStatus({
        type: "success",
        message: `AI selesai! Model: ${data.model}. Kategori: ${ext.kategori}. OCR: ${data.ocrPages || "?"} halaman. Review & edit hasil di bawah, lalu Simpan.`,
      });
      toast.success("AI extraction selesai. Review hasil sebelum simpan.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal menjalankan AI analisa";
      setAiStatus({ type: "error", message: msg });
      toast.error(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const saveResult = async () => {
    if (!employeeId) {
      toast.error("Pilih karyawan");
      return;
    }
    if (!extraction) {
      toast.error("Jalankan AI analisa terlebih dahulu");
      return;
    }
    setSaving(true);
    try {
      // Upload file dulu kalau ada
      let fileUrl = "";
      let fileName = "";
      const emp = rows.find((r) => r.employeeId === Number(employeeId));
      const existingMcuId = emp?.id;
      if (file && filePreview) {
        const base64 = filePreview.split(",")[1] ?? filePreview;
        if (existingMcuId) {
          try {
            fileUrl = await uploadMcuResultFile(
              existingMcuId,
              base64,
              file.name,
              file.type || "application/pdf",
            );
            fileName = file.name;
          } catch {
            // ignore upload error, still save AI result
          }
        }
      }

      // Build final extraction dari edit state
      const finalMetrics: McuAiExtraction["metrics"] = {};
      for (const cat of MCU_METRIC_CATEGORIES) {
        const catEdit = editMetrics[cat];
        if (!catEdit) continue;
        finalMetrics[cat] = {};
        for (const key of MCU_METRIC_KEYS[cat]) {
          const e = catEdit[key];
          if (e) {
            finalMetrics[cat]![key] = {
              value: e.value,
              unit: e.unit,
              flag: e.flag as McuMetricEntry["flag"],
            } as McuMetricEntry;
          }
        }
      }
      const finalExtraction: McuAiExtraction = {
        kesimpulan: editKesimpulan,
        saran: editSaran,
        kategori: editKategori as McuAiExtraction["kategori"],
        metrics: finalMetrics,
      };

      await saveAiResultForEmployee(Number(employeeId), finalExtraction, model, {
        mcuDate,
        examinedBy,
        notes,
        resultFileUrl: fileUrl,
        resultFileName: fileName,
      });
      toast.success("Hasil AI analisa tersimpan untuk karyawan");
      // Reset
      setExtraction(null);
      setEditMetrics({});
      setFile(null);
      setFilePreview(null);
      window.location.reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan hasil AI");
    } finally {
      setSaving(false);
    }
  };

  const updateMetric = (cat: string, key: string, field: keyof EditableMetric, value: string) => {
    setEditMetrics((prev) => ({
      ...prev,
      [cat]: {
        ...(prev[cat] ?? {}),
        [key]: {
          value: prev[cat]?.[key]?.value ?? "",
          unit: prev[cat]?.[key]?.unit ?? "",
          flag: prev[cat]?.[key]?.flag ?? "normal",
          [field]: value,
        },
      },
    }));
  };

  return (
    <div className="space-y-4">
      {/* Step 1: Input */}
      <div className="rounded-[1.1rem] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_12px_28px_rgba(0,52,97,0.06)]">
        <h3 className="font-display text-lg font-semibold">Step 1: Upload & Pilih Karyawan</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload dokumen hasil MCU (PDF/gambar), pilih karyawan, lalu jalankan AI untuk ekstrak otomatis.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Karyawan</Label>
              <SearchableSelect
                label="Karyawan"
                value={employeeId}
                onValueChange={setEmployeeId}
                options={rows.map((r) => ({
                  value: String(r.employeeId),
                  label: `${r.employeeName}${r.employeeSn ? ` (${r.employeeSn})` : ""}`,
                }))}
                placeholder="Pilih karyawan..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tanggal MCU</Label>
                <Input type="date" value={mcuDate} onChange={(e) => setMcuDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Diperiksa Oleh</Label>
                <Input value={examinedBy} onChange={(e) => setExaminedBy(e.target.value)} placeholder="Nama dokter/klinik..." />
              </div>
            </div>
            <div>
              <Label className="text-xs">Catatan</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan tambahan..." />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">File Hasil MCU (PDF / JPG / PNG / WEBP)</Label>
              <Input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </div>
            {filePreview && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                {file?.type.startsWith("image/") ? (
                  <img src={filePreview} alt="Preview" className="max-h-48 w-full rounded object-contain" />
                ) : (
                  <iframe src={filePreview} className="h-48 w-full rounded" title="Preview" />
                )}
              </div>
            )}
            <Button
              onClick={runAnalysis}
              disabled={!file || analyzing || !employeeId}
              className="w-full bg-[#0f172a] text-white hover:bg-[#1e293b]"
            >
              {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Stethoscope className="size-4" />}
              {analyzing ? "Menjalankan AI... (mohon tunggu)" : "Jalankan AI Analisa"}
            </Button>
            {aiStatus.type !== "idle" && (
              <div
                className={
                  "rounded-lg p-3 text-xs font-medium " +
                  (aiStatus.type === "loading"
                    ? "bg-sky-50 text-sky-700 border border-sky-200"
                    : aiStatus.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : aiStatus.type === "error"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "")
                }
              >
                {aiStatus.type === "loading" && <Loader2 className="mr-1.5 inline size-3.5 animate-spin" />}
                {aiStatus.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step 2: Review hasil */}
      {extraction && (
        <div className="rounded-[1.1rem] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_12px_28px_rgba(0,52,97,0.06)]">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Step 2: Review & Edit Hasil AI</h3>
            <Badge variant="outline" className="bg-sky-50 text-sky-700">{model || "AI"}</Badge>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="space-y-2 lg:col-span-2">
              <div>
                <Label className="text-xs">Kesimpulan</Label>
                <Textarea rows={3} value={editKesimpulan} onChange={(e) => setEditKesimpulan(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Saran</Label>
                <Textarea rows={3} value={editSaran} onChange={(e) => setEditSaran(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Kategori Hasil</Label>
              <Select value={editKategori} onValueChange={setEditKategori}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fit">Fit</SelectItem>
                  <SelectItem value="Unfit">Unfit</SelectItem>
                  <SelectItem value="Perlu Review">Perlu Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Metrics per kategori */}
          <div className="mt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hasil Pemeriksaan per Kategori (editable)</p>
            {MCU_METRIC_CATEGORIES.map((cat) => (
              <div key={cat} className="rounded-xl border border-slate-100 p-3">
                <p className="text-sm font-semibold text-foreground">{MCU_CATEGORY_LABELS[cat]}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {MCU_METRIC_KEYS[cat].map((key) => {
                    const m = editMetrics[cat]?.[key];
                    return (
                      <div key={key} className="rounded-lg border border-slate-100 p-2 space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {MCU_METRIC_LABELS[key] ?? key}
                        </p>
                        <Input
                          className="h-7 text-xs"
                          value={m?.value ?? ""}
                          onChange={(e) => updateMetric(cat, key, "value", e.target.value)}
                          placeholder="nilai"
                        />
                        <div className="flex gap-1">
                          <Input
                            className="h-7 text-xs"
                            value={m?.unit ?? ""}
                            onChange={(e) => updateMetric(cat, key, "unit", e.target.value)}
                            placeholder="unit"
                          />
                          <Select
                            value={m?.flag ?? "normal"}
                            onValueChange={(v) => updateMetric(cat, key, "flag", v)}
                          >
                            <SelectTrigger className="h-7 w-[90px] text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="tinggi">Tinggi</SelectItem>
                              <SelectItem value="rendah">Rendah</SelectItem>
                              <SelectItem value="abnormal">Abnormal</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setExtraction(null); setEditMetrics({}); }}>
              Batal
            </Button>
            <Button onClick={saveResult} disabled={saving || !employeeId} className="bg-[#0f172a] text-white hover:bg-[#1e293b]">
              {saving ? "Menyimpan..." : "Simpan Hasil AI"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Dashboard Kesehatan ──────────────────────────────────────────

type DashboardData = Props["initialDashboardData"];

function HealthDashboardTab({
  initialData,
  filterOptions,
  rows,
}: {
  initialData: DashboardData;
  filterOptions: FilterOptions;
  rows: McuListRow[];
}) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>("all");
  const [deptId, setDeptId] = useState<string>("all");
  const [employeeId, setEmployeeId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await getHealthDashboardData({
          category: category !== "all" ? category : null,
          departmentId: deptId !== "all" ? Number(deptId) : null,
          employeeId: employeeId !== "all" ? Number(employeeId) : null,
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
        });
        if (!cancelled) setData(result);
      } catch {
        // keep previous data
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [category, deptId, employeeId, dateFrom, dateTo]);

  const kpi = data.kpi;
  const scorecards = [
    { label: "Fit", value: kpi.fit, tone: "success" as const, icon: <Activity className="size-5" /> },
    { label: "Unfit", value: kpi.unfit, tone: "danger" as const, icon: <AlertTriangle className="size-5" /> },
    { label: "Perlu Review", value: kpi.pending, tone: "warning" as const, icon: <Stethoscope className="size-5" /> },
    { label: "Scheduled", value: kpi.scheduled, tone: "info" as const, icon: <CalendarClock className="size-5" /> },
  ];

  // Abnormal by category chart
  const abnormalData = data.abnormalByCategory.map((c) => ({
    name: MCU_CATEGORY_LABELS[c.category as keyof typeof MCU_CATEGORY_LABELS] ?? c.category,
    abnormal: Number(c.abnormalCount),
    total: Number(c.totalCount),
  }));

  // Tren per category+metricKey (numeric values only) over mcuDate
  const trendData = useMemo(() => {
    const byKey = new Map<string, Array<{ date: string; value: number; employeeName: string }>>();
    for (const t of data.trends) {
      const num = parseFloat(t.metricValue);
      if (isNaN(num)) continue;
      const key = `${t.category}::${t.metricKey}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key)!.push({
        date: t.mcuDate ? format(parseISO(t.mcuDate), "yyyy-MM-dd") : "",
        value: num,
        employeeName: t.employeeName,
      });
    }
    // sort by date and aggregate per date (avg)
    const result: Array<{ key: string; label: string; category: string; points: Array<{ date: string; value: number }> }> = [];
    for (const [key, arr] of byKey.entries()) {
      const [cat, mk] = key.split("::");
      const byDate = new Map<string, number[]>();
      for (const p of arr) {
        if (!p.date) continue;
        if (!byDate.has(p.date)) byDate.set(p.date, []);
        byDate.get(p.date)!.push(p.value);
      }
      const points = Array.from(byDate.entries())
        .map(([date, vals]) => ({ date, value: vals.reduce((a, b) => a + b, 0) / vals.length }))
        .sort((a, b) => a.date.localeCompare(b.date));
      result.push({
        key,
        label: `${MCU_CATEGORY_LABELS[cat as keyof typeof MCU_CATEGORY_LABELS] ?? cat} · ${MCU_METRIC_LABELS[mk] ?? mk}`,
        category: cat,
        points,
      });
    }
    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [data.trends]);

  const filteredTrends = category !== "all" ? trendData.filter((t) => t.category === category) : trendData;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-[1.1rem] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_12px_28px_rgba(0,52,97,0.06)]">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs">Kategori</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kategori</SelectItem>
                {MCU_METRIC_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{MCU_CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Departemen</Label>
            <Select value={deptId} onValueChange={setDeptId}>
              <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Departemen</SelectItem>
                {filterOptions.departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Karyawan</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-8 w-[200px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Karyawan</SelectItem>
                {rows.map((r) => (
                  <SelectItem key={r.employeeId} value={String(r.employeeId)}>
                    {r.employeeName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Dari Tanggal</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-[150px] text-xs" />
          </div>
          <div>
            <Label className="text-xs">Sampai Tanggal</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-[150px] text-xs" />
          </div>
          {loading && <span className="text-xs text-muted-foreground">Memuat...</span>}
        </div>
      </div>

      {/* KPI Scorecards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {scorecards.map((s) => (
          <div
            key={s.label}
            className={
              "rounded-[1.1rem] p-4 " +
              (s.tone === "success"
                ? "bg-emerald-50 text-emerald-950 shadow-[inset_0_0_0_1px_rgba(5,150,105,0.16),0_12px_28px_rgba(5,150,105,0.08)]"
                : s.tone === "danger"
                ? "bg-rose-50 text-rose-950 shadow-[inset_0_0_0_1px_rgba(225,29,72,0.16),0_12px_28px_rgba(225,29,72,0.08)]"
                : s.tone === "warning"
                ? "bg-amber-50 text-amber-950 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.16),0_12px_28px_rgba(217,119,6,0.08)]"
                : "bg-sky-50 text-sky-950 shadow-[inset_0_0_0_1px_rgba(2,132,199,0.16),0_12px_28px_rgba(2,132,199,0.08)]")
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{s.label}</p>
                <div className="font-display text-2xl font-semibold tabular-nums">{s.value}</div>
              </div>
              <span className="grid size-10 place-items-center rounded-xl bg-white/70">{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Abnormal by Category Chart */}
      <div className="rounded-[1.1rem] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_12px_28px_rgba(0,52,97,0.06)]">
        <h3 className="font-display text-base font-semibold">Abnormalitas per Kategori</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Jumlah metric abnormal vs total per kategori.</p>
        <div className="mt-3 h-64 w-full">
          {abnormalData.length === 0 ? (
            <div className="grid h-full place-items-center text-sm text-muted-foreground">Belum ada data metrics.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={abnormalData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#cbd5e1" name="Total" radius={[4, 4, 0, 0]} />
                <Bar dataKey="abnormal" fill="#ef4444" name="Abnormal" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Trend per metric */}
      <div className="rounded-[1.1rem] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.10),0_12px_28px_rgba(0,52,97,0.06)]">
        <h3 className="font-display text-base font-semibold flex items-center gap-2">
          <TrendingUp className="size-4" /> Tren Metric Kesehatan
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Rata-rata nilai per tanggal MCU (nilai numerik saja).</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {filteredTrends.length === 0 && (
            <div className="col-span-full grid place-items-center rounded-lg border border-dashed py-8 text-sm text-muted-foreground">
              Belum ada data tren. Jalankan AI Analisa untuk mengisi metrics.
            </div>
          )}
          {filteredTrends.map((t) => (
            <div key={t.key} className="rounded-xl border border-slate-100 p-3">
              <p className="text-xs font-semibold text-foreground">{t.label}</p>
              <div className="mt-2 h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={t.points} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Client Page ───────────────────────────────────────────────────

export function McuWellnessClientPage({
  initialMcuList,
  filterOptions,
  clinics,
  initialReminders,
  initialReminderScorecards,
  initialDashboardData,
}: Props) {
  const [activeTab, setActiveTab] = useState("karyawan");

  return (
    <AdminPageShell
      eyebrow="HC • Wellness"
      title="MCU Wellness Advance"
      description="Medical Check Up tahunan karyawan, AI extraction, dan health trend dashboard."
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="karyawan">
            <HeartPulse className="size-4" /> MCU Karyawan
          </TabsTrigger>
          <TabsTrigger value="reminder">
            <Bell className="size-4" /> Reminder MCU
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Stethoscope className="size-4" /> Analisa AI
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <Activity className="size-4" /> Dashboard Kesehatan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="karyawan">
          <McuKaryawanTab rows={initialMcuList} filterOptions={filterOptions} clinics={clinics} />
        </TabsContent>

        <TabsContent value="reminder">
          <McuReminderTab
            reminders={initialReminders}
            scorecards={initialReminderScorecards}
            filterOptions={filterOptions}
            clinics={clinics}
          />
        </TabsContent>

        <TabsContent value="ai">
          <McuAiTab rows={initialMcuList} />
        </TabsContent>

        <TabsContent value="dashboard">
          <HealthDashboardTab
            initialData={initialDashboardData}
            filterOptions={filterOptions}
            rows={initialMcuList}
          />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
