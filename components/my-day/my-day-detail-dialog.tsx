"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  MapPin,
  MapPinned,
  Printer,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Wrench,
  X,
  ZoomIn,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface LightboxPhoto {
  url: string;
  label: string;
  unitNumber?: string;
  time?: string;
  remarks?: string;
}

export interface MyDayDetailActivity {
  id: number;
  sessionId?: number | null;
  sessionCode?: string | null;
  workDate?: Date | string | null;
  shiftCode?: string | null;
  activityCode?: string | null;
  activityType?: string | null;
  title: string;
  label?: string | null;
  unitNumber?: string | null;
  sourceMode?: string | null;
  status?: string | null;
  statusLabel?: string | null;
  priority?: string | null;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  submissionTime?: Date | string | null;
  submissionCategory?: string | null;
  pointsAwarded?: number | null;
  penaltyDeducted?: number | null;
  pointsNet?: number | null;
  equipmentNo?: string | null;
  materialUsed?: string | null;
  gpsValid?: boolean | null;
  photoCount?: number | null;
  remarks?: string | null;
  assignmentId?: number | null;
  isTeamActivity?: boolean | null;
  teamNameList?: string | null;
  libraryName?: string | null;
  photos?: Array<{ id: number; url: string; caption?: string }>;
  durationMinutes?: number | null;
  durationLabel?: string | null;
  itemCount?: number | null;
  items?: Array<{
    id: number;
    sessionId?: number | null;
    snapshotLabel?: string | null;
    snapshotGroupName?: string | null;
    unitNumber?: string | null;
    remark?: string | null;
    actualPoints?: number | null;
    startedAt?: Date | string | null;
    endedAt?: Date | string | null;
    snapshotPayload?: string | null;
    photoUrl?: string | null;
    photos?: string[];
  }>;
  approvals?: Array<{
    id: number;
    sessionId?: number | null;
    stepOrder: number;
    stepLabel: string;
    status: string;
    approverName: string;
    approverRole?: string | null;
    signedAt?: Date | string | null;
  }>;
  pendingApproverName?: string | null;
  authorEmployeeId?: number | null;
  employeeName?: string | null;
}

interface MyDayDetailDialogProps {
  activity: MyDayDetailActivity | null;
  employee?: {
    id?: number;
    name?: string;
    employeeSn?: string;
    employeeId?: string;
    jobTitle?: string;
    department?: string;
    section?: string;
    totalPoints?: number;
  } | null;
  site?: {
    id?: number;
    name?: string;
    location?: string;
    customerName?: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

function formatSafeTime(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return "-";
  return dateObj.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSafeDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return "-";
  return dateObj.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusBadgeClass(status?: string | null): string {
  const normalized = (status || "").toLowerCase();
  if (
    normalized.includes("approved") ||
    normalized.includes("selesai") ||
    normalized.includes("done")
  ) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
  }
  if (
    normalized.includes("pending") ||
    normalized.includes("review") ||
    normalized.includes("menunggu") ||
    normalized.includes("submitted")
  ) {
    return "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
  }
  if (
    normalized.includes("reject") ||
    normalized.includes("tolak") ||
    normalized.includes("batal")
  ) {
    return "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
  }
  return "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800";
}

export function MyDayDetailDialog({
  activity,
  employee,
  site,
  isOpen,
  onClose,
}: MyDayDetailDialogProps) {
  const [lightboxPhoto, setLightboxPhoto] = React.useState<LightboxPhoto | null>(null);

  if (!activity) return null;

  const currentStatus =
    activity.statusLabel || activity.status || "Submitted";
  const workDateFormatted = formatSafeDate(
    activity.workDate || activity.startTime
  );
  const startTimeFormatted = formatSafeTime(activity.startTime);
  const endTimeFormatted = formatSafeTime(activity.endTime);

  const employeeName =
    activity.employeeName || employee?.name || "Karyawan Hero";
  const employeeSn =
    employee?.employeeSn || employee?.employeeId || "CP-EMP";
  const employeeRole = employee?.jobTitle || "Technician";
  const deptSection =
    [employee?.department, employee?.section].filter(Boolean).join(" / ") ||
    "Operasional Site";
  const siteName = site?.name || "Site Hero";
  const customerName = site?.customerName || site?.location || "PT Chitra Paratama";

  // Parse tasks / items
  const hasItems = Array.isArray(activity.items) && activity.items.length > 0;
  const taskItems = hasItems
    ? activity.items!.map((it, idx) => {
        let photos: string[] = [];
        if (it.photos && it.photos.length > 0) {
          photos = it.photos;
        } else if (it.photoUrl) {
          photos = [it.photoUrl];
        } else if (it.snapshotPayload) {
          try {
            const p = JSON.parse(it.snapshotPayload);
            const raw =
              p.photoUrl ||
              p.evidencePhotoUrl ||
              p.evidenceUrl ||
              p.photoUrls ||
              p.photos ||
              p.image ||
              p.images;
            if (Array.isArray(raw)) {
              photos = raw.filter(Boolean);
            } else if (typeof raw === "string" && raw.trim().length > 0) {
              photos = [raw.trim()];
            }
          } catch {
            // ignore JSON parse error
          }
        }

        return {
          id: it.id || idx + 1,
          label: it.snapshotLabel || `Tugas #${idx + 1}`,
          groupName: it.snapshotGroupName || activity.activityType || "Checklist",
          unitNumber: it.unitNumber || activity.unitNumber || "-",
          startedAt: formatSafeTime(it.startedAt || activity.startTime),
          endedAt: formatSafeTime(it.endedAt || activity.endTime),
          durationLabel: it.startedAt && it.endedAt ? null : activity.durationLabel,
          points: it.actualPoints ?? 5,
          status: activity.status || "Completed",
          remarks: it.remark || "",
          photos,
        };
      })
    : [
        {
          id: activity.id,
          label: activity.title,
          groupName: activity.activityType || activity.sourceMode || "Aktivitas Harian",
          unitNumber: activity.unitNumber || activity.equipmentNo || "-",
          startedAt: startTimeFormatted,
          endedAt: endTimeFormatted,
          durationLabel: activity.durationLabel || "-",
          points: activity.pointsAwarded ?? 0,
          status: currentStatus,
          remarks: activity.remarks || "",
          photos: (activity.photos || []).map((p) => p.url),
        },
      ];

  // Calculate unique units handled
  const allUnits = Array.from(
    new Set(
      [
        activity.unitNumber,
        activity.equipmentNo,
        ...taskItems.map((t) => t.unitNumber),
      ].filter((u) => u && u !== "-" && u.trim().length > 0)
    )
  );

  const totalPoints =
    activity.pointsNet ??
    (activity.pointsAwarded != null
      ? activity.pointsAwarded - (activity.penaltyDeducted || 0)
      : taskItems.reduce((acc, t) => acc + (t.points || 0), 0));

  const handleExportCsv = () => {
    const headers = [
      "No",
      "Jam Kerja",
      "Durasi",
      "Unit",
      "Aktivitas / Tugas",
      "Grup / Kategori",
      "Poin",
      "Status",
      "Catatan Lapangan",
      "Link Foto Bukti",
    ];

    const rows = taskItems.map((t, idx) => [
      `"${idx + 1}"`,
      `"${t.startedAt} - ${t.endedAt}"`,
      `"${t.durationLabel || activity.durationLabel || "-"}"`,
      `"${t.unitNumber || "-"}"`,
      `"${(t.label || "").replace(/"/g, '""')}"`,
      `"${(t.groupName || "-").replace(/"/g, '""')}"`,
      `"${t.points || 0}"`,
      `"${t.status || currentStatus}"`,
      `"${(t.remarks || "-").replace(/"/g, '""')}"`,
      `"${(t.photos || []).join("; ") || "-"}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Daily_Activity_${employeeName.replace(/\s+/g, "_")}_${(activity.sessionCode || activity.activityCode || "Formulir").replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="z-[80]"
          className="w-[96vw] max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl bg-slate-50 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-2xl z-[90]"
        >
          {/* Top Corporate Header */}
          <div className="p-4 sm:p-5 bg-[linear-gradient(135deg,#003461,#004b87)] text-white border-b border-blue-900 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-sky-200 shrink-0 border border-white/15">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold tracking-wider uppercase text-sky-200">
                    PT CHITRA PARATAMA
                  </div>
                  <DialogTitle className="text-base sm:text-lg font-black text-white leading-tight">
                    FORMULIR AKTIVITAS HARIAN (DAILY ACTIVITY REPORT)
                  </DialogTitle>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ekspor CSV</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cetak</span>
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-sky-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Tutup Formulir"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Metadata Badges Bar */}
            <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs text-sky-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-bold bg-white/15 px-2 py-0.5 rounded text-white border border-white/20">
                  SN: {employeeSn}
                </span>
                <span className="font-bold text-white text-sm">
                  {employeeName}
                </span>
                <span className="text-sky-300">&bull;</span>
                <span>{employeeRole}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="bg-sky-400/20 text-sky-200 px-2 py-0.5 rounded font-medium">
                  {siteName}
                </span>
                <span className="bg-white/10 px-2 py-0.5 rounded font-mono">
                  {workDateFormatted}
                </span>
                <span className="bg-white/15 text-sky-100 px-2 py-0.5 rounded font-mono text-[11px] border border-white/20">
                  {startTimeFormatted} - {endTimeFormatted}
                  {activity.durationLabel && ` (${activity.durationLabel})`}
                </span>
                <span className="bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded font-bold uppercase">
                  {currentStatus}
                </span>
                <span className="bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded font-bold font-mono">
                  +{totalPoints} Poin
                </span>
              </div>
            </div>
            <DialogDescription className="sr-only">
              Formulir rincian aktivitas operasional harian karyawan
            </DialogDescription>
          </div>

          {/* Scrollable Document Body */}
          <div className="pdf-wrapper flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-100/70 dark:bg-slate-950/70">
            {/* 1. Official Document Metadata Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="bg-slate-50/80 dark:bg-slate-800/80 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span>A. INFORMASI KARYAWAN &amp; OPERASIONAL LAPANGAN</span>
                <span className="text-[11px] font-mono text-slate-500 font-normal">
                  KODE: {activity.sessionCode || activity.activityCode || `ACT-${activity.id}`}
                </span>
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Nama Karyawan</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{employeeName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Employee SN</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{employeeSn}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Jabatan / Role</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{employeeRole}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Departemen / Section</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{deptSection}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Site Operasional</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{siteName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Customer / Client</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{customerName}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Shift &amp; Jam Operasional</span>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Shift {activity.shiftCode || "1"}
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <span
                      className="font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                    >
                      {startTimeFormatted} - {endTimeFormatted}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Akumulasi Poin</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                    +{totalPoints} Poin
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Units Handled Pill Bar */}
            {allUnits.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Unit Operasional yang Dikerjakan:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {allUnits.map((u) => (
                    <span
                      key={u}
                      className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200/80 shadow-2xs dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                    >
                      {u}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Detailed Activities Table / List */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
              <div className="bg-slate-50/80 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    B. RINCIAN TUGAS &amp; AKTIVITAS LAPANGAN ({taskItems.length} Item)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Total: <strong>{taskItems.length} pekerjaan</strong></span>
                  <span>&bull;</span>
                  <span>Total Poin: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">+{totalPoints}</strong></span>
                </div>
              </div>

              {/* Tasks List */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {taskItems.map((task, idx) => (
                  <div
                    key={`modal-task-${task.id}-${idx}`}
                    className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4"
                  >
                    {/* Left: Task Index, Labels, Metadata, Remarks */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className="size-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700">
                        {idx + 1}
                      </span>
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-snug">
                            {task.label}
                          </h4>
                          {task.groupName && (
                            <span className="text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded">
                              {task.groupName}
                            </span>
                          )}
                          {activity.sessionCode && (
                            <span className="text-[10px] font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200/60 dark:border-blue-800/60">
                              {activity.sessionCode}
                            </span>
                          )}
                        </div>

                        {/* Badges: Unit, Jam, Durasi, Poin, Status */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                          {task.unitNumber && task.unitNumber !== "-" && (
                            <span className="font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200/80 px-2 py-0.5 rounded text-[11px] flex items-center gap-1 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800">
                              <Truck className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                              Unit: {task.unitNumber}
                            </span>
                          )}
                          <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {task.startedAt} - {task.endedAt}
                            {task.durationLabel && task.durationLabel !== "-" && (
                              <span className="text-slate-400 font-sans">({task.durationLabel})</span>
                            )}
                          </span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px] dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                            +{task.points || 0} Poin
                          </span>
                          <Badge
                            className={`rounded-full px-2 py-0.5 text-[11px] border ${getStatusBadgeClass(task.status)}`}
                          >
                            {task.status}
                          </Badge>
                        </div>

                        {/* Remarks / Field notes */}
                        {task.remarks && (
                          <div className="mt-1.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700 rounded-lg p-2.5 leading-relaxed font-sans whitespace-pre-line">
                            <span className="font-semibold text-slate-600 dark:text-slate-400 block text-[10px] uppercase tracking-wider mb-0.5">
                              Catatan / Keterangan Lapangan:
                            </span>
                            {task.remarks}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Evidence Photo Thumbnail */}
                    {(() => {
                      const taskPhotos = task.photos || [];

                      if (taskPhotos.length === 0) {
                        return (
                          <div className="md:w-32 shrink-0 flex items-center justify-center text-slate-400 dark:text-slate-500 text-[11px] italic py-2 md:py-0">
                            Tanpa foto bukti
                          </div>
                        );
                      }

                      return (
                        <div className="md:w-36 shrink-0 flex flex-col items-center md:items-end gap-1.5 select-none">
                          <div className="flex flex-wrap items-center justify-center md:justify-end gap-1.5">
                            {taskPhotos.map((pUrl, pIdx) => (
                              <div
                                key={`${task.id}-photo-${pIdx}`}
                                className="relative w-28 h-20 sm:w-32 sm:h-24 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-sky-500 shadow-2xs hover:shadow-md transition-all bg-slate-900 flex items-center justify-center cursor-pointer group"
                                onClick={() =>
                                  setLightboxPhoto({
                                    url: pUrl,
                                    label: `${task.label}${taskPhotos.length > 1 ? ` (${pIdx + 1}/${taskPhotos.length})` : ""}`,
                                    unitNumber: task.unitNumber,
                                    time: `${task.startedAt} - ${task.endedAt}`,
                                    remarks: task.remarks,
                                  })
                                }
                              >
                                <img
                                  src={pUrl}
                                  alt={`${task.label} #${pIdx + 1}`}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.opacity = "0.3";
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <span className="bg-white/95 text-slate-900 rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                                    <ZoomIn className="w-3 h-3 text-blue-600" /> Perbesar
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <span className="text-[10px] text-sky-700 dark:text-sky-400 font-semibold flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> Foto Bukti{taskPhotos.length > 1 ? ` (${taskPhotos.length})` : ""}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Approval / Verification History */}
            {activity.approvals && activity.approvals.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
                <div className="bg-slate-50/80 dark:bg-slate-800/80 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>C. RIWAYAT APPROVAL &amp; VERIFIKASI</span>
                </div>
                <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800">
                  {activity.approvals.map((app) => (
                    <div key={app.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{app.stepLabel || `Tier #${app.stepOrder}`}</span>
                          <span className="text-slate-400">&bull;</span>
                          <span className="text-slate-600 dark:text-slate-300">{app.approverName}</span>
                        </div>
                        {app.signedAt && (
                          <span className="text-[11px] text-slate-400">
                            Disetujui pada: {formatSafeDate(app.signedAt)} {formatSafeTime(app.signedAt)}
                          </span>
                        )}
                      </div>
                      <Badge className={`rounded-full px-2.5 py-0.5 text-xs border ${getStatusBadgeClass(app.status)}`}>
                        {app.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GPS & Submission Validation Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                {activity.gpsValid ? (
                  <MapPinned className="size-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <MapPin className="size-4 text-amber-500" />
                )}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Verifikasi GPS &amp; Lokasi:
                </span>
                <span
                  className={
                    activity.gpsValid
                      ? "text-emerald-700 dark:text-emerald-400 font-semibold"
                      : "text-amber-700 dark:text-amber-400 font-semibold"
                  }
                >
                  {activity.gpsValid ? "Lokasi GPS Terverifikasi Valid" : "Perlu Verifikasi Lapangan"}
                </span>
              </div>
              {activity.submissionCategory && (
                <div className="text-slate-500 dark:text-slate-400">
                  Kategori Submission: <strong className="text-slate-800 dark:text-slate-200">{activity.submissionCategory}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl">
                Tutup Formulir
              </Button>
              {activity.sessionId && (
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/50"
                >
                  <Link href={`/dashboard/activity-hub/document/${activity.sessionId}`}>
                    <ExternalLink className="size-3.5 mr-1.5" />
                    Buka Dokumen PDF
                  </Link>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="rounded-xl gap-1.5 text-xs text-slate-700 dark:text-slate-300"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                Ekspor Data CSV
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-xl bg-[#1d72f2] hover:bg-blue-600 text-white gap-1.5 text-xs font-semibold"
              >
                <Link href="/dashboard/overtime-requests">
                  <Clock className="w-3.5 h-3.5" />
                  Buat SPL Lembur
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Photo Preview Modal */}
      {lightboxPhoto && (
        <Dialog open={!!lightboxPhoto} onOpenChange={(open) => !open && setLightboxPhoto(null)}>
          <DialogContent
            showCloseButton={false}
            overlayClassName="z-[99] bg-black/80 backdrop-blur-xs"
            className="w-[96vw] max-w-4xl p-0 gap-0 overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl z-[100]"
          >
            <div className="p-3 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <ImageIcon className="size-4 text-sky-400" />
                <span className="font-semibold text-white">{lightboxPhoto.label}</span>
                {lightboxPhoto.unitNumber && lightboxPhoto.unitNumber !== "-" && (
                  <span className="text-slate-400">&bull; Unit: {lightboxPhoto.unitNumber}</span>
                )}
                {lightboxPhoto.time && (
                  <span className="text-slate-400">&bull; {lightboxPhoto.time}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/90 min-h-[300px] max-h-[70vh] overflow-hidden">
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.label}
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
            {lightboxPhoto.remarks && (
              <div className="p-3 bg-slate-900 text-slate-300 text-xs border-t border-slate-800">
                <span className="font-semibold text-slate-400 block mb-0.5">Catatan:</span>
                {lightboxPhoto.remarks}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
