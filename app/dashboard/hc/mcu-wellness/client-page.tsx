"use client";

import { Fragment, useMemo, useState, useEffect, useRef } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Calendar,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  HeartPulse,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Stethoscope,
  Trash2,
  TrendingUp,
  Upload,
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
  getEmployeeMcuHistory,
  deleteEmployeeMcuRecord,
  setMcuStatus,
  scheduleEmployeeMcu,
  uploadMcuResultFile,
  uploadMcuFileForEmployee,
  createManualMcu,
  saveAiResultForEmployee,
  getHealthDashboardData,
  sendMcuReminderNow,
  sendBulkMcuReminders,
  type McuListRow,
  type McuReminderRow,
} from "@/app/actions/mcu-wellness";
import { uploadFile } from "@/app/actions/upload";
import { resolveUploadUrl } from "@/lib/resolve-upload-url";
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

  // Upload dialog with progressive states
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTarget, setUploadTarget] = useState<McuListRow | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMcuDate, setUploadMcuDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [isUploading, setIsUploading] = useState(false);
  const [autoProcessAi, setAutoProcessAi] = useState(true);
  const [uploadStage, setUploadStage] = useState<"idle" | "uploading" | "ocr" | "ai_mapping" | "saving" | "done" | "error">("idle");
  const [uploadStatusMessage, setUploadStatusMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadElapsed, setUploadElapsed] = useState(0);
  const uploadTimerRef = useRef<NodeJS.Timeout | null>(null);

  // History & Delete state for nested rows
  const [employeeHistory, setEmployeeHistory] = useState<
    Record<
      number,
      Array<{
        mcu: Record<string, unknown>;
        metrics: Array<Record<string, unknown>>;
      }>
    >
  >({});
  const [selectedHistoryMcuId, setSelectedHistoryMcuId] = useState<number | null>(null);
  const [deleteConfirmMcu, setDeleteConfirmMcu] = useState<{
    id: number;
    date: string;
    fileName: string;
    employeeId: number;
    employeeName: string;
  } | null>(null);
  const [isDeletingMcuId, setIsDeletingMcuId] = useState<number | null>(null);

  // Status dialog
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<McuListRow | null>(null);
  const [statusValue, setStatusValue] = useState("done");

  const access = { canView: true, canEdit: true, canDelete: false };

  const handleExpand = async (row: McuListRow) => {
    if (expandedId === row.employeeId) {
      setExpandedId(null);
      return;
    }
    setLoading(true);
    try {
      const history = await getEmployeeMcuHistory(row.employeeId);
      setEmployeeHistory((prev) => ({
        ...prev,
        [row.employeeId]: (history as any) || [],
      }));

      if (history && history.length > 0) {
        const activeItem = history[0];
        setDetail({
          mcuId: Number(activeItem.mcu.id),
          metrics: activeItem.metrics as any,
          employee: {
            name: row.employeeName,
            employeeSn: row.employeeSn,
            departmentName: row.departmentName,
            sectionName: row.sectionName,
            jobTitle: row.jobTitle,
            fitStatus: String(activeItem.mcu.status || ""),
          },
          mcu: activeItem.mcu as any,
        });
        setSelectedHistoryMcuId(Number(activeItem.mcu.id));
      } else if (row.id) {
        const res = await getMcuDetail(row.id);
        if (res) {
          setDetail({
            mcuId: row.id,
            metrics: res.metrics as any,
            employee: res.employee as any,
            mcu: res.mcu as any,
          });
          setSelectedHistoryMcuId(row.id);
        }
      } else {
        setDetail(null);
        setSelectedHistoryMcuId(null);
      }
      setExpandedId(row.employeeId);
    } catch (e) {
      toast.error("Gagal memuat riwayat & detail MCU");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistoryItem = (
    row: McuListRow,
    item: { mcu: Record<string, unknown>; metrics: Array<Record<string, unknown>> }
  ) => {
    setSelectedHistoryMcuId(Number(item.mcu.id));
    setDetail({
      mcuId: Number(item.mcu.id),
      metrics: item.metrics as any,
      employee: {
        name: row.employeeName,
        employeeSn: row.employeeSn,
        departmentName: row.departmentName,
        sectionName: row.sectionName,
        jobTitle: row.jobTitle,
        fitStatus: String(item.mcu.status || ""),
      },
      mcu: item.mcu as any,
    });
  };

  const confirmDeleteMcu = async () => {
    if (!deleteConfirmMcu) return;
    setIsDeletingMcuId(deleteConfirmMcu.id);
    try {
      await deleteEmployeeMcuRecord(deleteConfirmMcu.id);
      toast.success("Record & dokumen MCU berhasil dihapus");

      const empId = deleteConfirmMcu.employeeId;
      const history = await getEmployeeMcuHistory(empId);
      setEmployeeHistory((prev) => ({
        ...prev,
        [empId]: (history as any) || [],
      }));

      if (history && history.length > 0) {
        const nextItem = history[0];
        setDetail({
          mcuId: Number(nextItem.mcu.id),
          metrics: nextItem.metrics as any,
          employee: {
            ...detail?.employee!,
            fitStatus: String(nextItem.mcu.status || ""),
          },
          mcu: nextItem.mcu as any,
        });
        setSelectedHistoryMcuId(Number(nextItem.mcu.id));
      } else {
        setDetail(null);
        setSelectedHistoryMcuId(null);
      }
      setDeleteConfirmMcu(null);
      window.location.reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus record MCU");
    } finally {
      setIsDeletingMcuId(null);
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

  const openUpload = (row: McuListRow, prefillDate?: string) => {
    setUploadTarget(row);
    setUploadFile(null);
    setUploadMcuDate(prefillDate || row.mcuDate || format(new Date(), "yyyy-MM-dd"));
    setIsUploading(false);
    setUploadStage("idle");
    setUploadProgress(0);
    setUploadElapsed(0);
    setUploadStatusMessage("");
    if (uploadTimerRef.current) clearInterval(uploadTimerRef.current);
    setUploadOpen(true);
  };

  const submitUpload = async () => {
    if (!uploadTarget || !uploadFile) {
      toast.error("Pilih file hasil MCU terlebih dahulu");
      return;
    }

    setIsUploading(true);
    setUploadElapsed(0);
    setUploadStage("uploading");
    setUploadProgress(25);
    setUploadStatusMessage("1/4 Mengunggah file dokumen...");

    const startTime = Date.now();
    if (uploadTimerRef.current) clearInterval(uploadTimerRef.current);
    uploadTimerRef.current = setInterval(() => {
      setUploadElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 500);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("employeeId", String(uploadTarget.employeeId));
      formData.append("mcuDate", uploadMcuDate);
      formData.append("autoSave", autoProcessAi ? "true" : "false");

      if (autoProcessAi) {
        setUploadStage("ocr");
        setUploadProgress(50);
        setUploadStatusMessage("2/4 Menjalankan OCR Dokumen via PDF Inspector Microservice (vision.chitraparatama.com)...");

        const analyzeRes = await fetch("/api/mcu-wellness/analyze", {
          method: "POST",
          body: formData,
        });

        if (!analyzeRes.ok) {
          const errData = await analyzeRes.json().catch(() => ({}));
          throw new Error(errData.error || `Proses gagal (HTTP ${analyzeRes.status})`);
        }

        setUploadStage("ai_mapping");
        setUploadProgress(80);
        setUploadStatusMessage("3/4 AI Medical Assistant memetakan diagnosa & metrik laboratorium...");

        await analyzeRes.json();

        setUploadStage("saving");
        setUploadProgress(95);
        setUploadStatusMessage("4/4 Sinkronisasi hasil pemeriksaan & profil karyawan...");
      } else {
        const uploadRes = await fetch("/api/mcu-wellness/analyze", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || "Gagal mengunggah file");
        }
      }

      setUploadStage("done");
      setUploadProgress(100);
      setUploadStatusMessage("✅ Selesai! Hasil MCU berhasil diproses dan disimpan.");
      toast.success("Hasil MCU berhasil diupload" + (autoProcessAi ? " & diekstrak oleh AI" : ""));

      if (uploadTimerRef.current) clearInterval(uploadTimerRef.current);
      setTimeout(() => {
        setUploadOpen(false);
        window.location.reload();
      }, 1200);
    } catch (e: unknown) {
      if (uploadTimerRef.current) clearInterval(uploadTimerRef.current);
      const msg = e instanceof Error ? e.message : "Gagal memproses upload MCU";
      setUploadStage("error");
      setUploadStatusMessage(`Error: ${msg}`);
      toast.error(msg);
    } finally {
      setIsUploading(false);
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
            const isExpanded = expandedId === row.employeeId;
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
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => {
                            setDocUrl(row.resultFileUrl);
                            setDocName(row.resultFileName || "Dokumen MCU");
                          }}
                          title="Lihat dokumen MCU"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7" asChild title="Download dokumen MCU">
                          <a href={row.resultFileUrl} download={row.resultFileName || true}>
                            <Download className="size-4" />
                          </a>
                        </Button>
                      </div>
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
                {isExpanded && (
                  <TableRow key={`detail-${row.employeeId}`} data-table-detail-row="true">
                    <TableCell colSpan={9} className="bg-slate-50/70 p-4 dark:bg-slate-950/40">
                      <div className="space-y-4">
                        {/* 1. Riwayat Dokumen MCU */}
                        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                              <div className="flex size-9 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400">
                                <History className="size-4" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                  Riwayat Dokumen & Hasil MCU ({row.employeeName})
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  Daftar dokumen MCU yang pernah diupload. Klik salah satu periode untuk melihat metrik lab dan diagnosa.
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => openUpload(row)}
                              className="bg-[#0f172a] text-white hover:bg-[#1e293b] text-xs h-8"
                            >
                              <Upload className="mr-1.5 size-3.5" /> + Upload Hasil MCU Baru
                            </Button>
                          </div>

                          {/* History Cards List */}
                          {employeeHistory[row.employeeId] && employeeHistory[row.employeeId].length > 0 ? (
                            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {employeeHistory[row.employeeId].map((histItem) => {
                                const mcuData = histItem.mcu as any;
                                const isSelected = selectedHistoryMcuId === mcuData.id;
                                const badgeInfo = STATUS_BADGE[mcuData.status] ?? STATUS_BADGE.done;
                                return (
                                  <div
                                    key={mcuData.id}
                                    onClick={() => handleSelectHistoryItem(row, histItem)}
                                    className={`group relative cursor-pointer rounded-xl border p-3.5 transition-all duration-200 ${
                                      isSelected
                                        ? "border-sky-500 bg-sky-50/50 shadow-sm ring-1 ring-sky-500/50 dark:border-sky-500 dark:bg-sky-950/30"
                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-850"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="flex size-7 items-center justify-center rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                          <CalendarDays className="size-3.5" />
                                        </div>
                                        <div>
                                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                            {mcuData.mcuDate ? formatDate(mcuData.mcuDate) : "Tanpa Tanggal"}
                                          </p>
                                          <p className="text-[11px] text-muted-foreground">
                                            {mcuData.examinedBy || mcuData.clinicName || "Pemeriksaan MCU"}
                                          </p>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className={`text-[10px] ${badgeInfo.className}`}>
                                        {badgeInfo.label}
                                      </Badge>
                                    </div>

                                    {/* File name & status */}
                                    <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-slate-100/70 px-2.5 py-1.5 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                                      <FileText className="size-3.5 text-sky-600 shrink-0" />
                                      <span className="truncate font-mono text-[11px]" title={mcuData.resultFileName || "Dokumen MCU"}>
                                        {mcuData.resultFileName || (mcuData.resultFileUrl ? "Dokumen_MCU.pdf" : "Belum ada file dokumen")}
                                      </span>
                                    </div>

                                    {/* Action Toolbar */}
                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs dark:border-slate-800">
                                      <span className={`text-[11px] font-medium ${isSelected ? "text-sky-600 dark:text-sky-400 font-semibold" : "text-muted-foreground"}`}>
                                        {isSelected ? "● Periode Aktif" : "Klik untuk Pilih"}
                                      </span>
                                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        {mcuData.resultFileUrl && (
                                          <>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="size-7 text-slate-600 hover:text-sky-600 dark:text-slate-400"
                                              onClick={() => {
                                                setDocUrl(mcuData.resultFileUrl);
                                                setDocName(mcuData.resultFileName || "Dokumen MCU");
                                              }}
                                              title="Lihat PDF Dokumen"
                                            >
                                              <Eye className="size-3.5" />
                                            </Button>
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="size-7 text-slate-600 hover:text-sky-600 dark:text-slate-400"
                                              asChild
                                              title="Download Dokumen"
                                            >
                                              <a href={mcuData.resultFileUrl} download={mcuData.resultFileName || true}>
                                                <Download className="size-3.5" />
                                              </a>
                                            </Button>
                                          </>
                                        )}
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="size-7 text-slate-600 hover:text-sky-600 dark:text-slate-400"
                                          onClick={() => openUpload(row, mcuData.mcuDate || "")}
                                          title="Upload Ulang / Ganti File"
                                        >
                                          <Upload className="size-3.5" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="size-7 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                                          onClick={() =>
                                            setDeleteConfirmMcu({
                                              id: Number(mcuData.id),
                                              date: String(mcuData.mcuDate || "-"),
                                              fileName: String(mcuData.resultFileName || "Dokumen MCU"),
                                              employeeId: row.employeeId,
                                              employeeName: row.employeeName,
                                            })
                                          }
                                          title="Hapus Record & Dokumen"
                                        >
                                          <Trash2 className="size-3.5" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-muted-foreground dark:border-slate-800 dark:bg-slate-900/40">
                              <p>Belum ada riwayat dokumen MCU untuk karyawan ini.</p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openUpload(row)}
                                className="mt-2 text-xs"
                              >
                                <Upload className="mr-1.5 size-3.5" /> Upload Hasil MCU Sekarang
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* 2. AI Summary & Metrics */}
                        {detail && (
                          <>
                            {(detail.mcu?.aiKesimpulan || detail.mcu?.aiSaran) && (
                              <div className="grid gap-3 lg:grid-cols-3">
                                <div className="rounded-xl bg-white p-3.5 shadow-sm border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800 lg:col-span-2">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Kesimpulan AI {detail.mcu?.mcuDate ? `(${formatDate(String(detail.mcu.mcuDate))})` : ""}
                                  </p>
                                  <p className="mt-1 text-sm text-foreground leading-relaxed">{String(detail.mcu?.aiKesimpulan || "-")}</p>
                                </div>
                                <div className="rounded-xl bg-white p-3.5 shadow-sm border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Saran AI</p>
                                  <p className="mt-1 text-sm text-foreground leading-relaxed">{String(detail.mcu?.aiSaran || "-")}</p>
                                </div>
                              </div>
                            )}

                            {/* Metrics per category */}
                            <div className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Hasil Pemeriksaan per Kategori {detail.mcu?.mcuDate ? `• Periode: ${formatDate(String(detail.mcu.mcuDate))}` : ""}
                              </p>
                              {MCU_METRIC_CATEGORIES.map((cat) => {
                                const catMetrics = detail.metrics.filter((m) => m.category === cat);
                                return (
                                  <div key={cat} className="rounded-xl bg-white p-3.5 shadow-sm border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
                                    <p className="text-sm font-semibold text-foreground">{MCU_CATEGORY_LABELS[cat]}</p>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                      {MCU_METRIC_KEYS[cat].map((key) => {
                                        const m = catMetrics.find((x) => x.metricKey === key);
                                        return (
                                          <div key={key} className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/50">
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
                                <div className="rounded-xl bg-white p-4 text-center text-xs text-muted-foreground border border-slate-200/80 dark:bg-slate-900 dark:border-slate-800">
                                  Belum ada rincian metrik untuk periode ini. Jalankan AI Analisa untuk mengekstrak data dari dokumen.
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {isExpanded && loading && (
                  <TableRow data-table-detail-row="true">
                    <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-4">
                      <Loader2 className="mr-1.5 inline size-4 animate-spin" /> Memuat riwayat & detail MCU...
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
          <DialogHeader className="px-5 pt-4 pb-3 border-b flex flex-row items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold truncate pr-4">
              <FileText className="size-5 text-sky-600 shrink-0" />
              <span className="truncate">{docName || "Dokumen MCU"}</span>
            </DialogTitle>
            {docUrl && (
              <div className="flex items-center gap-2 pr-6 shrink-0">
                <Button size="sm" variant="outline" asChild className="h-8 text-xs">
                  <a
                    href={resolveUploadUrl(docUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={docName || true}
                  >
                    <Download className="mr-1.5 size-3.5" /> Download PDF
                  </a>
                </Button>
              </div>
            )}
          </DialogHeader>
          <div className="h-[72vh] w-full bg-slate-100 dark:bg-slate-900">
            {docUrl && (
              <iframe
                src={resolveUploadUrl(docUrl)}
                className="h-full w-full border-0"
                title={docName || "Dokumen MCU"}
              />
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

      {/* Upload Dialog with real-time progressive states */}
      <Dialog open={uploadOpen} onOpenChange={(open) => { if (!isUploading) setUploadOpen(open); }}>
        <DialogContent className="max-w-lg border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Upload className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Upload & Ekstraksi Hasil MCU</DialogTitle>
                <DialogDescription className="text-xs">
                  {uploadTarget ? `${uploadTarget.employeeName} (${uploadTarget.employeeSn || "-"}) • ${uploadTarget.departmentName || "Dept"}` : ""}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {isUploading || uploadStage !== "idle" ? (
            <div className="space-y-4 py-2">
              {/* Progress Card */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                    {uploadStage === "done" ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : uploadStage === "error" ? (
                      <AlertTriangle className="size-4 text-rose-600" />
                    ) : (
                      <Loader2 className="size-4 animate-spin text-sky-600" />
                    )}
                    {uploadStage === "done"
                      ? "Proses Selesai"
                      : uploadStage === "error"
                      ? "Terjadi Kesalahan"
                      : "Sedang Memproses Dokumen..."}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-muted-foreground">
                    <Clock className="size-3.5" /> {uploadElapsed}s • {uploadProgress}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      uploadStage === "error"
                        ? "bg-rose-500"
                        : uploadStage === "done"
                        ? "bg-emerald-500"
                        : "bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500"
                    }`}
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>

                <p className={`mt-2.5 text-xs ${uploadStage === "error" ? "text-rose-600 font-medium" : "text-slate-600 dark:text-slate-300"}`}>
                  {uploadStatusMessage}
                </p>
              </div>

              {/* Multi-step list */}
              <div className="space-y-2.5 rounded-xl border border-slate-100 bg-white p-3.5 text-xs dark:border-slate-800/80 dark:bg-slate-900/30">
                <div className="flex items-center gap-2.5">
                  {uploadProgress >= 35 ? (
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  ) : (
                    <Loader2 className="size-4 animate-spin text-sky-600 shrink-0" />
                  )}
                  <span className={uploadProgress >= 35 ? "text-slate-800 dark:text-slate-200 font-medium" : "text-muted-foreground"}>
                    1. Upload File Dokumen ke Cloud Storage
                  </span>
                </div>

                {autoProcessAi && (
                  <>
                    <div className="flex items-center gap-2.5">
                      {uploadProgress >= 65 ? (
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      ) : uploadStage === "ocr" ? (
                        <Loader2 className="size-4 animate-spin text-sky-600 shrink-0" />
                      ) : (
                        <div className="size-4 rounded-full border-2 border-slate-300 dark:border-slate-700 shrink-0" />
                      )}
                      <span className={uploadProgress >= 65 ? "text-slate-800 dark:text-slate-200 font-medium" : uploadStage === "ocr" ? "text-sky-600 font-medium" : "text-muted-foreground"}>
                        2. OCR Ekstraksi Markdown (PDF Inspector Microservice)
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {uploadProgress >= 85 ? (
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      ) : uploadStage === "ai_mapping" ? (
                        <Loader2 className="size-4 animate-spin text-sky-600 shrink-0" />
                      ) : (
                        <div className="size-4 rounded-full border-2 border-slate-300 dark:border-slate-700 shrink-0" />
                      )}
                      <span className={uploadProgress >= 85 ? "text-slate-800 dark:text-slate-200 font-medium" : uploadStage === "ai_mapping" ? "text-sky-600 font-medium" : "text-muted-foreground"}>
                        3. AI Medical Assistant (Mapping Diagnosa & Metrik Lab)
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {uploadProgress >= 100 ? (
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      ) : uploadStage === "saving" ? (
                        <Loader2 className="size-4 animate-spin text-sky-600 shrink-0" />
                      ) : (
                        <div className="size-4 rounded-full border-2 border-slate-300 dark:border-slate-700 shrink-0" />
                      )}
                      <span className={uploadProgress >= 100 ? "text-slate-800 dark:text-slate-200 font-medium" : uploadStage === "saving" ? "text-sky-600 font-medium" : "text-muted-foreground"}>
                        4. Simpan Record & Update Profil Karyawan
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tanggal / Periode Pemeriksaan MCU
                </Label>
                <Input
                  type="date"
                  value={uploadMcuDate}
                  onChange={(e) => setUploadMcuDate(e.target.value)}
                  className="bg-white dark:bg-slate-900 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Tentukan tanggal pemeriksaan MCU (mis. untuk MCU bulan/tahun tertentu).
                </p>
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-5 text-center dark:border-slate-700 dark:bg-slate-900/40">
                <Input
                  type="file"
                  id="mcu-file-upload-modal"
                  className="hidden"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
                <label htmlFor="mcu-file-upload-modal" className="cursor-pointer block">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                    {uploadFile ? <FileCheck className="size-6 text-emerald-600" /> : <Upload className="size-6 text-slate-500" />}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {uploadFile ? uploadFile.name : "Klik untuk memilih file hasil MCU"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {uploadFile ? `${(uploadFile.size / 1024).toFixed(1)} KB • Siap diproses` : "Mendukung format PDF, JPG, PNG, atau WEBP"}
                  </p>
                </label>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl bg-sky-50/80 p-3.5 text-xs text-sky-900 border border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-900">
                <input
                  type="checkbox"
                  id="auto-ai-modal"
                  checked={autoProcessAi}
                  onChange={(e) => setAutoProcessAi(e.target.checked)}
                  className="mt-0.5 size-4 rounded border-sky-300 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="auto-ai-modal" className="cursor-pointer select-none font-medium leading-relaxed">
                  ⚡ Ekstrak & Mapping Otomatis (PDF Inspector Microservice + AI)
                  <span className="block text-[11px] font-normal text-sky-700 dark:text-sky-300 mt-0.5">
                    Otomatis membaca hasil lab (Tensi, Kolesterol, Asam Urat, EKG, Diabetes, Liver), membuat diagnosa kesimpulan, dan saran tindak lanjut.
                  </span>
                </label>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {uploadStage === "error" ? (
              <>
                <Button variant="outline" onClick={() => setUploadStage("idle")}>
                  Coba Lagi
                </Button>
                <Button variant="destructive" onClick={() => setUploadOpen(false)}>
                  Tutup
                </Button>
              </>
            ) : isUploading ? (
              <Button disabled className="w-full bg-slate-900 text-white">
                <Loader2 className="mr-2 size-4 animate-spin" />
                Memproses ({uploadElapsed}s)...
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setUploadOpen(false)}>
                  Batal
                </Button>
                <Button
                  onClick={submitUpload}
                  disabled={!uploadFile}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Sparkles className="mr-1.5 size-4" />
                  {autoProcessAi ? "Upload & Proses AI" : "Upload Saja"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete MCU Confirmation Dialog */}
      <Dialog open={!!deleteConfirmMcu} onOpenChange={(o) => { if (!o && !isDeletingMcuId) setDeleteConfirmMcu(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <Trash2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">Hapus Record Hasil MCU?</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {deleteConfirmMcu?.employeeName} • Periode: {deleteConfirmMcu?.date}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-2 py-2 text-xs text-slate-600 dark:text-slate-300">
            <p>
              Apakah Anda yakin ingin menghapus record pemeriksaan MCU ini beserta file dokumen{" "}
              <span className="font-mono font-semibold text-foreground">{deleteConfirmMcu?.fileName}</span> dan seluruh data metrik lab yang terhubung?
            </p>
            <p className="font-medium text-rose-600 dark:text-rose-400">
              Tindakan ini permanen dan tidak dapat dibatalkan.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteConfirmMcu(null)} disabled={!!isDeletingMcuId}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteMcu}
              disabled={!!isDeletingMcuId}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeletingMcuId ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Trash2 className="mr-1.5 size-3.5" />}
              {isDeletingMcuId ? "Menghapus..." : "Hapus Record"}
            </Button>
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
  const [analyzingStage, setAnalyzingStage] = useState<"idle" | "reading" | "ocr" | "ai_mapping" | "done" | "error">("idle");
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [analyzingElapsed, setAnalyzingElapsed] = useState(0);
  const analyzingTimerRef = useRef<NodeJS.Timeout | null>(null);
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
    setAnalyzingElapsed(0);
    setAnalyzingStage("reading");
    setAnalyzingProgress(20);
    setAiStatus({ type: "loading", message: "1/3 Mempersiapkan dokumen..." });

    const startTime = Date.now();
    if (analyzingTimerRef.current) clearInterval(analyzingTimerRef.current);
    analyzingTimerRef.current = setInterval(() => {
      setAnalyzingElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 500);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("employeeId", String(employeeId));

      setAnalyzingStage("ocr");
      setAnalyzingProgress(50);
      setAiStatus({
        type: "loading",
        message: "2/3 Menjalankan OCR Dokumen via PDF Inspector Microservice (vision.chitraparatama.com)...",
      });

      const res = await fetch("/api/mcu-wellness/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errMsg = err.error || `HTTP ${res.status}`;
        const hint = err.hint ? `\n${err.hint}` : "";
        throw new Error(errMsg + hint);
      }

      setAnalyzingStage("ai_mapping");
      setAnalyzingProgress(85);
      setAiStatus({
        type: "loading",
        message: "3/3 AI Medical Assistant memetakan diagnosa & metrik laboratorium...",
      });

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
        for (const [key, entry] of Object.entries(catMap || {})) {
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

      setAnalyzingStage("done");
      setAnalyzingProgress(100);
      setAiStatus({
        type: "success",
        message: `✅ Ekstraksi Berhasil! Model: ${data.model}. Kategori: ${ext.kategori}. Halaman: ${data.ocrPages || "?"}. Review & edit hasil di bawah, lalu Simpan.`,
      });
      toast.success("AI mapping selesai. Silakan review hasil sebelum simpan.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Gagal menjalankan AI analisa";
      setAnalyzingStage("error");
      setAiStatus({ type: "error", message: msg });
      toast.error(msg);
    } finally {
      if (analyzingTimerRef.current) clearInterval(analyzingTimerRef.current);
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
      // Upload file via FormData if present
      let fileUrl = "";
      let fileName = "";
      if (file) {
        try {
          const uploadFd = new FormData();
          uploadFd.append("file", file);
          uploadFd.append("uploadTarget", "mcu-wellness");
          const uploadRes = await uploadFile(uploadFd);
          if (uploadRes.success && uploadRes.url) {
            fileUrl = uploadRes.url;
            fileName = file.name;
          }
        } catch {
          // ignore upload error, still save AI result
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
              {analyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {analyzing ? `Memproses Dokumen (${analyzingElapsed}s)...` : "Jalankan OCR & AI Mapping"}
            </Button>

            {analyzing && (
              <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50/70 p-3.5 text-xs text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5 text-sky-900 dark:text-sky-100">
                    <Loader2 className="size-3.5 animate-spin text-sky-600" />
                    {analyzingStage === "reading"
                      ? "1/3 Mempersiapkan File"
                      : analyzingStage === "ocr"
                      ? "2/3 Ekstraksi Markdown (PDF Inspector)"
                      : "3/3 AI Medical Assistant Mapping"}
                  </span>
                  <span className="font-mono text-sky-700 dark:text-sky-300">
                    {analyzingElapsed}s • {analyzingProgress}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-sky-200 dark:bg-sky-900">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 transition-all duration-300"
                    style={{ width: `${analyzingProgress}%` }}
                  />
                </div>
                <p className="text-[11px] text-sky-800 dark:text-sky-300">
                  {aiStatus.message}
                </p>
              </div>
            )}

            {!analyzing && aiStatus.type !== "idle" && (
              <div
                className={
                  "rounded-lg p-3 text-xs font-medium " +
                  (aiStatus.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : aiStatus.type === "error"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-sky-50 text-sky-700 border border-sky-200")
                }
              >
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
