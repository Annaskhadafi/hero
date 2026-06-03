"use client";

import { useCallback, useMemo, useState } from "react";
import { AdminPageShell } from "@/components/admin-page-shell";
import {
  EnterpriseScorecards,
  EnterpriseRecordDialog,
  EnterpriseFormGrid,
  EnterpriseActionButtons,
} from "@/components/ui/enterprise-table-kit";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  IconClock,
  IconClipboardCheck,
  IconUsers,
  IconPlus,
  IconClipboardText,
} from "@tabler/icons-react";
import {
  createOffboardingRequest,
  deleteOffboarding,
  getOffboardingById,
  approveOffboarding,
  completeClearanceItem,
  uncompleteClearanceItem,
  completeOffboarding,
  updateExitInterview,
} from "@/app/actions/offboarding";

// ─── Types ──────────────────────────────────────────────────────────────────

type OffboardingRecord = {
  id: number;
  employeeId: number;
  employeeCode: string | null;
  employeeName: string | null;
  departmentName: string | null;
  positionName: string | null;
  requestType: string;
  reason: string;
  requestedLastWorkingDay: string | Date;
  actualLastWorkingDay: string | Date | null;
  status: string;
  approvedBy: string;
  approvedAt: string | Date | null;
  exitInterviewNotes: string;
  exitInterviewDate: string | Date | null;
  exitInterviewBy: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  clearanceTotal: number;
  clearanceCompleted: number;
};

type ClearanceItem = {
  id: number;
  offboardingId: number;
  sortOrder: number;
  category: string;
  title: string;
  description: string;
  assignedTo: string;
  isCompleted: boolean;
  completedAt: string | null;
  completedBy: string;
  notes: string;
  createdAt: string;
};

type OffboardingStats = {
  pending: number;
  inClearance: number;
  completedThisMonth: number;
  total: number;
};

type EmployeeOption = {
  id: number;
  employeeId: string;
  fullName: string;
  departmentId: number | null;
  departmentName: string | null;
  positionName: string | null;
};

type OffboardingDetail = OffboardingRecord & {
  clearanceItems: ClearanceItem[];
};

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "pending", label: "Menunggu Persetujuan" },
  { value: "in_clearance", label: "Dalam Proses Clearance" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

const REQUEST_TYPE_OPTIONS = [
  { value: "resignation", label: "Resign" },
  { value: "termination", label: "Terminasi" },
  { value: "retirement", label: "Pensiun" },
  { value: "end_of_contract", label: "Habis Kontrak" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | Date | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateInputValue(date: string | Date | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <Badge
          variant="outline"
          className="border-amber-300 bg-amber-50 text-amber-700"
        >
          Menunggu
        </Badge>
      );
    case "approved":
      return (
        <Badge
          variant="outline"
          className="border-blue-300 bg-blue-50 text-blue-700"
        >
          Disetujui
        </Badge>
      );
    case "in_clearance":
      return (
        <Badge
          variant="outline"
          className="border-sky-300 bg-sky-50 text-sky-700"
        >
          Dalam Clearance
        </Badge>
      );
    case "completed":
      return (
        <Badge
          variant="outline"
          className="border-emerald-300 bg-emerald-50 text-emerald-700"
        >
          Selesai
        </Badge>
      );
    case "cancelled":
      return (
        <Badge
          variant="outline"
          className="border-gray-300 bg-gray-50 text-gray-700"
        >
          Dibatalkan
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function requestTypeBadge(type: string) {
  switch (type) {
    case "resignation":
      return (
        <Badge
          variant="outline"
          className="border-violet-300 bg-violet-50 text-violet-700"
        >
          Resign
        </Badge>
      );
    case "termination":
      return (
        <Badge
          variant="outline"
          className="border-rose-300 bg-rose-50 text-rose-700"
        >
          Terminasi
        </Badge>
      );
    case "retirement":
      return (
        <Badge
          variant="outline"
          className="border-teal-300 bg-teal-50 text-teal-700"
        >
          Pensiun
        </Badge>
      );
    case "end_of_contract":
      return (
        <Badge
          variant="outline"
          className="border-orange-300 bg-orange-50 text-orange-700"
        >
          Habis Kontrak
        </Badge>
      );
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

function requestTypeLabel(type: string) {
  switch (type) {
    case "resignation":
      return "Resign";
    case "termination":
      return "Terminasi";
    case "retirement":
      return "Pensiun";
    case "end_of_contract":
      return "Habis Kontrak";
    default:
      return type;
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function OffboardingClientPage({
  records: initialRecords,
  stats: initialStats,
  employees,
}: {
  records: OffboardingRecord[];
  stats: OffboardingStats;
  employees: EmployeeOption[];
}) {
  // ── State ───────────────────────────────────────────────────────────────
  const [records, setRecords] =
    useState<OffboardingRecord[]>(initialRecords);
  const [stats, setStats] = useState<OffboardingStats>(initialStats);

  // Dialogs
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<OffboardingRecord | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewDetail, setViewDetail] = useState<OffboardingDetail | null>(null);
  const [viewClearance, setViewClearance] = useState<ClearanceItem[]>([]);

  // Exit interview editing
  const [eiDate, setEiDate] = useState("");
  const [eiBy, setEiBy] = useState("");
  const [eiNotes, setEiNotes] = useState("");
  const [isEditingEI, setIsEditingEI] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // Add form
  const [newEmployeeId, setNewEmployeeId] = useState("");
  const [newRequestType, setNewRequestType] = useState("resignation");
  const [newReason, setNewReason] = useState("");
  const [newLastWorkingDay, setNewLastWorkingDay] = useState("");

  // ── Scorecards ──────────────────────────────────────────────────────────

  const scorecards = useMemo(
    () => [
      {
        label: "Menunggu Persetujuan",
        value: stats.pending,
        tone: "warning" as const,
        icon: <IconClock className="size-5 text-amber-600" />,
      },
      {
        label: "Dalam Proses Clearance",
        value: stats.inClearance,
        tone: "info" as const,
        icon: <IconClipboardText className="size-5 text-sky-600" />,
      },
      {
        label: "Selesai Bulan Ini",
        value: stats.completedThisMonth,
        tone: "success" as const,
        icon: <IconClipboardCheck className="size-5 text-emerald-600" />,
      },
      {
        label: "Total",
        value: stats.total,
        tone: "default" as const,
        icon: <IconUsers className="size-5 text-foreground/60" />,
      },
    ],
    [stats]
  );

  // ── View Handler ────────────────────────────────────────────────────────

  const handleView = useCallback(async (rec: OffboardingRecord) => {
    const full = await getOffboardingById(rec.id);
    if (full) {
      const clearanceItems = full.clearanceItems as unknown as ClearanceItem[];
      setViewDetail({
        ...(full as unknown as OffboardingRecord),
        clearanceItems,
        clearanceTotal: clearanceItems.length,
        clearanceCompleted: clearanceItems.filter((item) => item.isCompleted).length,
      });
      setViewClearance(clearanceItems);
      setEiDate(dateInputValue(full.exitInterviewDate));
      setEiBy(full.exitInterviewBy || "");
      setEiNotes(full.exitInterviewNotes || "");
      setIsEditingEI(false);
      setIsViewOpen(true);
    }
  }, []);

  // ── Add Handler ─────────────────────────────────────────────────────────

  const handleAdd = useCallback(async () => {
    if (!newEmployeeId || !newLastWorkingDay) return;
    setIsLoading(true);
    try {
      const created = await createOffboardingRequest({
        employeeId: newEmployeeId,
        requestType: newRequestType,
        reason: newReason,
        requestedLastWorkingDay: newLastWorkingDay,
      });

      const emp = employees.find(
        (e) => e.id.toString() === newEmployeeId
      );
      const newRecord: OffboardingRecord = {
        id: created.id,
        employeeId: parseInt(newEmployeeId, 10),
        employeeCode: emp?.employeeId ?? "",
        employeeName: emp?.fullName ?? "",
        departmentName: emp?.departmentName ?? null,
        positionName: emp?.positionName ?? null,
        requestType: newRequestType,
        reason: newReason,
        requestedLastWorkingDay: newLastWorkingDay,
        actualLastWorkingDay: null,
        status: "pending",
        approvedBy: "",
        approvedAt: null,
        exitInterviewNotes: "",
        exitInterviewDate: null,
        exitInterviewBy: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        clearanceTotal: 10,
        clearanceCompleted: 0,
      };

      setRecords((prev) => [newRecord, ...prev]);
      setStats((prev) => ({
        ...prev,
        pending: prev.pending + 1,
        total: prev.total + 1,
      }));
      setIsAddOpen(false);
      resetAddForm();
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  }, [newEmployeeId, newRequestType, newReason, newLastWorkingDay, employees]);

  const resetAddForm = useCallback(() => {
    setNewEmployeeId("");
    setNewRequestType("resignation");
    setNewReason("");
    setNewLastWorkingDay("");
  }, []);

  // ── Delete Handler ──────────────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsLoading(true);
    try {
      await deleteOffboarding(deleteTarget.id);
      setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setStats((prev) => {
        const wasPending = deleteTarget.status === "pending";
        const wasInClearance = deleteTarget.status === "in_clearance";
        return {
          ...prev,
          pending: wasPending ? prev.pending - 1 : prev.pending,
          inClearance: wasInClearance ? prev.inClearance - 1 : prev.inClearance,
          total: prev.total - 1,
        };
      });
      setIsDeleteOpen(false);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  }, [deleteTarget]);

  // ── Approve Handler ─────────────────────────────────────────────────────

  const handleApprove = useCallback(async (id: number) => {
    setIsLoading(true);
    try {
      await approveOffboarding(id, "Admin");
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "in_clearance",
                approvedBy: "Admin",
                approvedAt: new Date().toISOString(),
              }
            : r
        )
      );
      setStats((prev) => ({
        ...prev,
        pending: prev.pending - 1,
        inClearance: prev.inClearance + 1,
      }));
      // Refresh view detail if open
      if (viewDetail?.id === id) {
        setViewDetail((prev) =>
          prev ? { ...prev, status: "in_clearance" } : prev
        );
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  }, [viewDetail]);

  // ── Complete Offboarding Handler ────────────────────────────────────────

  const handleComplete = useCallback(async (id: number) => {
    setIsLoading(true);
    try {
      await completeOffboarding(id);
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "completed",
                actualLastWorkingDay: new Date().toISOString().split("T")[0],
              }
            : r
        )
      );
      setStats((prev) => ({
        ...prev,
        inClearance: prev.inClearance - 1,
        completedThisMonth: prev.completedThisMonth + 1,
      }));
      if (viewDetail?.id === id) {
        setViewDetail((prev) =>
          prev ? { ...prev, status: "completed" } : prev
        );
      }
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  }, [viewDetail]);

  // ── Clearance Item Toggle ───────────────────────────────────────────────

  const handleToggleClearance = useCallback(
    async (item: ClearanceItem, checked: boolean) => {
      // Optimistic update
      setViewClearance((prev) =>
        prev.map((c) =>
          c.id === item.id
            ? {
                ...c,
                isCompleted: checked,
                completedAt: checked ? new Date().toISOString() : null,
              }
            : c
        )
      );

      try {
        if (checked) {
          await completeClearanceItem(item.id, "Admin");
        } else {
          await uncompleteClearanceItem(item.id);
        }

        // Update clearance progress in records list
        setRecords((prev) =>
          prev.map((r) => {
            if (r.id !== item.offboardingId) return r;
            const delta = checked ? 1 : -1;
            return {
              ...r,
              clearanceCompleted: Math.max(
                0,
                Math.min(r.clearanceTotal, r.clearanceCompleted + delta)
              ),
            };
          })
        );
      } catch (err) {
        // Revert
        setViewClearance((prev) =>
          prev.map((c) =>
            c.id === item.id ? { ...c, isCompleted: !checked } : c
          )
        );
        console.error(err);
      }
    },
    []
  );

  // ── Save Exit Interview ─────────────────────────────────────────────────

  const handleSaveExitInterview = useCallback(async () => {
    if (!viewDetail) return;
    setIsLoading(true);
    try {
      await updateExitInterview(viewDetail.id, {
        exitInterviewDate: eiDate,
        exitInterviewBy: eiBy,
        exitInterviewNotes: eiNotes,
      });
      setViewDetail((prev) =>
        prev
          ? {
              ...prev,
              exitInterviewDate: eiDate,
              exitInterviewBy: eiBy,
              exitInterviewNotes: eiNotes,
            }
          : prev
      );
      setRecords((prev) =>
        prev.map((r) =>
          r.id === viewDetail.id
            ? {
                ...r,
                exitInterviewDate: eiDate,
                exitInterviewBy: eiBy,
                exitInterviewNotes: eiNotes,
              }
            : r
        )
      );
      setIsEditingEI(false);
    } catch (err) {
      console.error(err);
      alert("Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  }, [viewDetail, eiDate, eiBy, eiNotes]);

  // ── View progress ───────────────────────────────────────────────────────

  const viewProgress = useMemo(() => {
    if (viewClearance.length === 0) return { done: 0, total: 0 };
    const done = viewClearance.filter((c) => c.isCompleted).length;
    return { done, total: viewClearance.length };
  }, [viewClearance]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <AdminPageShell
      eyebrow="HC &bull; Offboarding"
      title="Manajemen Offboarding"
      description="Kelola proses offboarding karyawan, checklist clearance, dan exit interview."
    >
      <div className="space-y-4">
        {/* Scorecards */}
        <EnterpriseScorecards items={scorecards} />

        {/* Filters & Add Button */}
        <div className="flex flex-wrap items-center gap-2">
          <TableMultiFilter
            label="Status"
            filterKey="offboarding-status"
            options={STATUS_OPTIONS}
          />
          <TableMultiFilter
            label="Tipe Pengajuan"
            filterKey="offboarding-request-type"
            options={REQUEST_TYPE_OPTIONS}
          />
          <div className="flex-1" />
          <Button
            onClick={() => {
              resetAddForm();
              setIsAddOpen(true);
            }}
          >
            <IconPlus className="size-4 mr-1.5" />
            Ajukan Offboarding
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-3 text-center">No</th>
                <th className="px-3 py-3">NIK</th>
                <th className="px-3 py-3">Nama Karyawan</th>
                <th className="px-3 py-3">Departemen</th>
                <th className="px-3 py-3">Posisi</th>
                <th className="px-3 py-3">Tipe Pengajuan</th>
                <th className="px-3 py-3">Hari Kerja Terakhir</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Progress</th>
                <th className="px-3 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-3 py-12 text-center text-muted-foreground"
                  >
                    Belum ada data offboarding.
                  </td>
                </tr>
              ) : (
                records.map((rec, idx) => (
                  <tr
                    key={rec.id}
                    className="border-b transition-colors hover:bg-muted/30"
                    data-filter-offboarding-status={rec.status}
                    data-filter-offboarding-request-type={rec.requestType}
                    data-date-value={rec.requestedLastWorkingDay}
                  >
                    <td className="px-3 py-2.5 text-center text-muted-foreground">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {rec.employeeCode}
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      {rec.employeeName}
                    </td>
                    <td className="px-3 py-2.5">
                      {rec.departmentName ?? "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      {rec.positionName ?? "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      {requestTypeBadge(rec.requestType)}
                    </td>
                    <td
                      className="px-3 py-2.5"
                      data-date-value={rec.requestedLastWorkingDay}
                    >
                      {formatDate(rec.requestedLastWorkingDay)}
                    </td>
                    <td className="px-3 py-2.5">
                      {statusBadge(rec.status)}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress
                          value={
                            rec.clearanceTotal > 0
                              ? Math.round(
                                  (rec.clearanceCompleted /
                                    rec.clearanceTotal) *
                                    100
                                )
                              : 0
                          }
                          className="h-2 flex-1"
                        />
                        <span className="text-xs font-semibold tabular-nums text-right whitespace-nowrap">
                          {rec.clearanceCompleted}/{rec.clearanceTotal}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <EnterpriseActionButtons
                        access={{
                          canView: true,
                          canEdit: true,
                          canDelete: true,
                        }}
                        onView={() => handleView(rec)}
                        onEdit={() => handleView(rec)}
                        onDelete={() => {
                          setDeleteTarget(rec);
                          setIsDeleteOpen(true);
                        }}
                        labels={{
                          view: "Lihat detail",
                          edit: "Edit data",
                          delete: "Hapus data",
                        }}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── View Detail Dialog ───────────────────────────────────────── */}
        <EnterpriseRecordDialog
          open={isViewOpen}
          onOpenChange={setIsViewOpen}
          title={`Offboarding: ${viewDetail?.employeeName ?? ""}`}
          description={`NIK: ${viewDetail?.employeeCode ?? ""} | ${requestTypeLabel(viewDetail?.requestType ?? "")}`}
          mode="view"
        >
          {viewDetail && (
            <div className="space-y-6">
              {/* Request Info */}
              <div>
                <Label className="text-sm font-semibold">
                  Informasi Pengajuan
                </Label>
                <EnterpriseFormGrid className="mt-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Nama Karyawan
                    </Label>
                    <p className="font-medium">
                      {viewDetail.employeeName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Departemen
                    </Label>
                    <p className="font-medium">
                      {viewDetail.departmentName ?? "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Posisi
                    </Label>
                    <p className="font-medium">
                      {viewDetail.positionName ?? "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Tipe Pengajuan
                    </Label>
                    <div className="mt-0.5">
                      {requestTypeBadge(viewDetail.requestType)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Hari Kerja Terakhir (Diminta)
                    </Label>
                    <p className="font-medium">
                      {formatDate(viewDetail.requestedLastWorkingDay)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Hari Kerja Terakhir (Aktual)
                    </Label>
                    <p className="font-medium">
                      {formatDate(viewDetail.actualLastWorkingDay)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Status
                    </Label>
                    <div className="mt-0.5">
                      {statusBadge(viewDetail.status)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Disetujui Oleh
                    </Label>
                    <p className="font-medium">
                      {viewDetail.approvedBy || "-"}
                    </p>
                  </div>
                </EnterpriseFormGrid>

                {viewDetail.reason && (
                  <div className="mt-3">
                    <Label className="text-xs text-muted-foreground">
                      Alasan
                    </Label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">
                      {viewDetail.reason}
                    </p>
                  </div>
                )}

                {/* Action buttons based on status */}
                {viewDetail.status === "pending" && (
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApprove(viewDetail.id)}
                      disabled={isLoading}
                    >
                      {isLoading
                        ? "Memproses..."
                        : "Setujui & Mulai Clearance"}
                    </Button>
                  </div>
                )}
                {viewDetail.status === "in_clearance" && (
                  <div className="mt-4 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleComplete(viewDetail.id)}
                      disabled={
                        isLoading ||
                        viewProgress.done < viewProgress.total
                      }
                    >
                      {isLoading
                        ? "Memproses..."
                        : "Selesaikan Offboarding"}
                    </Button>
                    {viewProgress.done < viewProgress.total && (
                      <span className="text-xs text-muted-foreground self-center">
                        Semua item clearance harus selesai terlebih dahulu
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Exit Interview Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold">
                    Exit Interview
                  </Label>
                  {!isEditingEI && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingEI(true)}
                    >
                      Edit
                    </Button>
                  )}
                </div>

                {isEditingEI ? (
                  <div className="space-y-3">
                    <EnterpriseFormGrid>
                      <div className="space-y-2">
                        <Label className="text-xs">
                          Tanggal Exit Interview
                        </Label>
                        <Input
                          type="date"
                          value={eiDate}
                          onChange={(e) => setEiDate(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">
                          Diwawancarai Oleh
                        </Label>
                        <Input
                          value={eiBy}
                          onChange={(e) => setEiBy(e.target.value)}
                          placeholder="Nama pewawancara"
                          className="h-8 text-sm"
                        />
                      </div>
                    </EnterpriseFormGrid>
                    <div className="space-y-2">
                      <Label className="text-xs">
                        Catatan Exit Interview
                      </Label>
                      <Textarea
                        value={eiNotes}
                        onChange={(e) => setEiNotes(e.target.value)}
                        placeholder="Catatan hasil exit interview..."
                        rows={4}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsEditingEI(false);
                          setEiDate(dateInputValue(viewDetail.exitInterviewDate));
                          setEiBy(viewDetail.exitInterviewBy || "");
                          setEiNotes(viewDetail.exitInterviewNotes || "");
                        }}
                      >
                        Batal
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveExitInterview}
                        disabled={isLoading}
                      >
                        {isLoading ? "Menyimpan..." : "Simpan"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <EnterpriseFormGrid>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Tanggal
                      </Label>
                      <p className="font-medium">
                        {formatDate(viewDetail.exitInterviewDate)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Diwawancarai Oleh
                      </Label>
                      <p className="font-medium">
                        {viewDetail.exitInterviewBy || "-"}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs text-muted-foreground">
                        Catatan
                      </Label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">
                        {viewDetail.exitInterviewNotes || "-"}
                      </p>
                    </div>
                  </EnterpriseFormGrid>
                )}
              </div>

              {/* Clearance Checklist */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold">
                    Checklist Clearance
                  </Label>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    {viewProgress.done}/{viewProgress.total} selesai
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Progress
                    value={
                      viewProgress.total > 0
                        ? Math.round(
                            (viewProgress.done / viewProgress.total) * 100
                          )
                        : 0
                    }
                    className="h-2.5 flex-1"
                  />
                  <span className="text-sm font-semibold tabular-nums">
                    {viewProgress.total > 0
                      ? Math.round(
                          (viewProgress.done / viewProgress.total) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>

                <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
                  {viewClearance.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Tidak ada item clearance.
                    </p>
                  ) : (
                    viewClearance.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                          item.isCompleted
                            ? "bg-emerald-50/50 border-emerald-200"
                            : "bg-white"
                        }`}
                      >
                        <Checkbox
                          checked={item.isCompleted}
                          onCheckedChange={(checked) =>
                            handleToggleClearance(item, checked as boolean)
                          }
                          className="mt-0.5"
                          disabled={
                            viewDetail.status !== "in_clearance" &&
                            viewDetail.status !== "completed"
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0.5"
                            >
                              {item.category}
                            </Badge>
                            <p
                              className={`text-sm font-medium ${
                                item.isCompleted
                                  ? "line-through text-muted-foreground"
                                  : ""
                              }`}
                            >
                              {item.title}
                            </p>
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                            <span className="text-xs text-muted-foreground">
                              Ditugaskan: {item.assignedTo}
                            </span>
                            {item.isCompleted && item.completedAt && (
                              <span className="text-xs text-emerald-600">
                                Selesai: {formatDate(item.completedAt)}
                                {item.completedBy
                                  ? ` oleh ${item.completedBy}`
                                  : ""}
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              Catatan: {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </EnterpriseRecordDialog>

        {/* ── Add Request Dialog ────────────────────────────────────────── */}
        <EnterpriseRecordDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          title="Ajukan Offboarding Baru"
          description="Pilih karyawan dan isi informasi pengajuan offboarding."
          mode="form"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Batal
              </Button>
              <Button
                onClick={handleAdd}
                disabled={
                  isLoading || !newEmployeeId || !newLastWorkingDay
                }
              >
                {isLoading ? "Mengajukan..." : "Ajukan Offboarding"}
              </Button>
            </div>
          }
        >
          <EnterpriseFormGrid>
            <div className="space-y-2">
              <Label>Karyawan *</Label>
              <Select
                value={newEmployeeId}
                onValueChange={setNewEmployeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih karyawan" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {employees.map((emp) => (
                    <SelectItem
                      key={emp.id}
                      value={emp.id.toString()}
                    >
                      {emp.employeeId} - {emp.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipe Pengajuan *</Label>
              <Select
                value={newRequestType}
                onValueChange={setNewRequestType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Hari Kerja Terakhir *</Label>
              <Input
                type="date"
                value={newLastWorkingDay}
                onChange={(e) => setNewLastWorkingDay(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Alasan</Label>
              <Textarea
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="Alasan pengajuan offboarding..."
                rows={3}
              />
            </div>
          </EnterpriseFormGrid>
        </EnterpriseRecordDialog>

        {/* ── Delete Confirm Dialog ─────────────────────────────────────── */}
        <EnterpriseRecordDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Hapus Offboarding"
          description={`Apakah Anda yakin ingin menghapus data offboarding ${deleteTarget?.employeeName ?? ""}? Semua item clearance terkait juga akan dihapus.`}
          mode="delete"
          footer={
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
              >
                {isLoading ? "Menghapus..." : "Hapus"}
              </Button>
            </div>
          }
        >
          <p className="text-sm text-muted-foreground">
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </EnterpriseRecordDialog>
      </div>
    </AdminPageShell>
  );
}
