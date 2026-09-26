"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Eye,
  MapPin,
  MapPinned,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MyDayDetailDialog,
  type MyDayDetailActivity,
} from "@/components/my-day/my-day-detail-dialog";
import { MyDayEmptyState } from "@/components/my-day/my-day-empty-state";

interface MyDayActivityLogTableProps {
  activities: MyDayDetailActivity[];
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
  emptyAction?: React.ReactNode;
}

function statusBadgeClass(status: string) {
  const normalized = (status || "").toLowerCase();

  if (
    normalized.includes("approved") ||
    normalized.includes("selesai") ||
    normalized.includes("done")
  ) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50 font-semibold";
  }

  if (
    normalized.includes("pending") ||
    normalized.includes("review") ||
    normalized.includes("menunggu") ||
    normalized.includes("submitted")
  ) {
    return "bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50 font-semibold";
  }

  if (
    normalized.includes("reject") ||
    normalized.includes("tolak") ||
    normalized.includes("batal")
  ) {
    return "bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/50 font-semibold";
  }

  return "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-medium";
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

function formatSafeIso(d: Date | string | null | undefined): string {
  if (!d) return "";
  const dateObj = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return "";
  return dateObj.toISOString();
}

function renderApprovalProcessCell(activity: MyDayDetailActivity) {
  const approvals = activity.approvals || [];
  const statusStr = (activity.statusLabel || activity.status || "").toLowerCase();

  // If activity has approval steps
  if (approvals.length > 0) {
    const rejectedStep = approvals.find((a) =>
      (a.status || "").toLowerCase().includes("reject")
    );
    const pendingStep = approvals.find(
      (a) => (a.status || "").toLowerCase() === "pending"
    );
    const isAllApproved = approvals.every(
      (a) => (a.status || "").toLowerCase() === "approved"
    );

    if (rejectedStep) {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
            <XCircle className="size-3.5 text-rose-600 shrink-0" />
            <span>Ditolak pada {rejectedStep.stepLabel}</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Oleh:{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {rejectedStep.approverName || "Reviewer"}
            </span>
          </p>
        </div>
      );
    }

    if (isAllApproved || statusStr.includes("approved") || statusStr.includes("selesai")) {
      const lastApproved = [...approvals]
        .reverse()
        .find((a) => (a.status || "").toLowerCase() === "approved");
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
            <span>Disetujui Lengkap</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            Oleh:{" "}
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {lastApproved?.approverName || "Atasan Langsung"}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            {approvals.map((st, i) => (
              <span
                key={st.id || i}
                title={`${st.stepLabel}: ${st.approverName} (Approved)`}
                className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
              >
                <CheckCircle2 className="size-2.5 text-emerald-600" />
                {st.stepLabel || `Tier ${st.stepOrder}`}
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (pendingStep) {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
            <span className="relative flex size-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-amber-500"></span>
            </span>
            <span>{pendingStep.stepLabel || "Menunggu Approval"}</span>
          </div>
          <p className="text-[11px] text-slate-700 dark:text-slate-300">
            Posisi:{" "}
            <span className="font-bold text-slate-900 dark:text-white">
              {pendingStep.approverName ||
                activity.pendingApproverName ||
                "Approver L1"}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            {approvals.map((st, i) => {
              const isDone = (st.status || "").toLowerCase() === "approved";
              const isCurrent = (st.status || "").toLowerCase() === "pending";
              return (
                <span
                  key={st.id || i}
                  title={`${st.stepLabel}: ${st.approverName} (${st.status})`}
                  className={
                    isDone
                      ? "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                      : isCurrent
                      ? "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700 animate-pulse"
                      : "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                  }
                >
                  {isDone ? (
                    <CheckCircle2 className="size-2.5 text-emerald-600" />
                  ) : isCurrent ? (
                    <Clock3 className="size-2.5 text-amber-600" />
                  ) : null}
                  {st.stepLabel || `Tier ${st.stepOrder}`}
                </span>
              );
            })}
          </div>
        </div>
      );
    }
  }

  // Fallback for standalone activities or sessions without structured multi-tier approvals
  if (
    statusStr.includes("approved") ||
    statusStr.includes("selesai") ||
    statusStr.includes("done")
  ) {
    return (
      <div className="space-y-0.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
          <span>Disetujui</span>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Verifikasi Selesai
        </p>
      </div>
    );
  }

  if (
    statusStr.includes("pending") ||
    statusStr.includes("submitted") ||
    statusStr.includes("review")
  ) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
          <span className="relative flex size-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full size-2 bg-amber-500"></span>
          </span>
          <span>Menunggu Review</span>
        </div>
        <p className="text-[11px] text-slate-700 dark:text-slate-300">
          Posisi:{" "}
          <span className="font-bold text-slate-900 dark:text-white">
            {activity.pendingApproverName || "Approver L1 (Foreman)"}
          </span>
        </p>
      </div>
    );
  }

  if (
    statusStr.includes("reject") ||
    statusStr.includes("tolak") ||
    statusStr.includes("batal")
  ) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
        <XCircle className="size-3.5 text-rose-600 shrink-0" />
        <span>Ditolak</span>
      </div>
    );
  }

  return (
    <div className="text-xs text-slate-400 dark:text-slate-500">
      <span>Belum Diajukan</span>
    </div>
  );
}

export function MyDayActivityLogTable({
  activities,
  employee,
  site,
  emptyAction,
}: MyDayActivityLogTableProps) {
  const [selectedActivity, setSelectedActivity] =
    React.useState<MyDayDetailActivity | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
            <TableRow className="border-b border-slate-200 dark:border-slate-700">
              <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Activity
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Status
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 min-w-[200px]">
                Proses Approval
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Durasi &amp; Waktu
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Submission &amp; GPS
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Poin Net
              </TableHead>
              <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 text-right pr-4">
                Aksi
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.length > 0 ? (
              activities.map((activity) => {
                const startTimeStr = formatSafeTime(activity.startTime);
                const endTimeStr = formatSafeTime(activity.endTime);
                const dateIso = formatSafeIso(activity.startTime);
                const statusStr =
                  activity.statusLabel || activity.status || "Submitted";

                return (
                  <TableRow
                    key={activity.id}
                    data-date-value={dateIso}
                    data-filter-status={statusStr}
                    data-filter-source={activity.sourceMode || "self_input"}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-800/50"
                  >
                    {/* Activity Title & Code */}
                    <TableCell className="align-top py-3.5">
                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={() => setSelectedActivity(activity)}
                          className="font-semibold text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400 text-left transition-colors cursor-pointer group flex items-center gap-1.5"
                        >
                          <span className="group-hover:underline underline-offset-2">
                            {activity.title}
                          </span>
                        </button>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {activity.activityCode || "ACT"} •{" "}
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {activity.sourceMode}
                          </span>{" "}
                          • Unit {activity.unitNumber || "-"}
                        </p>
                      </div>
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell className="align-top py-3.5">
                      <Badge
                        className={`rounded-full px-2.5 py-0.5 text-xs ${statusBadgeClass(
                          statusStr
                        )}`}
                      >
                        {statusStr}
                      </Badge>
                    </TableCell>

                    {/* Proses Approval (Dimana posisi approval sekarang) */}
                    <TableCell className="align-top py-3.5">
                      {renderApprovalProcessCell(activity)}
                    </TableCell>

                    {/* Duration & Time */}
                    <TableCell className="align-top py-3.5">
                      <div className="text-xs">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                          {activity.durationLabel || "-"}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                          <Clock3 className="size-3 text-slate-400" />
                          {startTimeStr} - {endTimeStr}
                        </p>
                      </div>
                    </TableCell>

                    {/* Submission & GPS */}
                    <TableCell className="align-top py-3.5">
                      <div className="text-xs">
                        <p className="font-medium text-slate-800 dark:text-slate-200">
                          {activity.submissionCategory || "Standard"}
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                          {activity.gpsValid ? (
                            <>
                              <MapPinned className="size-3 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                GPS Valid
                              </span>
                            </>
                          ) : (
                            <>
                              <MapPin className="size-3 text-amber-500" />
                              <span className="text-amber-700 dark:text-amber-400">
                                Perlu review GPS
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </TableCell>

                    {/* Net Points */}
                    <TableCell className="align-top py-3.5">
                      <div className="text-xs">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          +{activity.pointsAwarded ?? 0} pts
                        </span>
                        {(activity.penaltyDeducted ?? 0) > 0 ? (
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                            Penalty -{activity.penaltyDeducted}
                          </p>
                        ) : null}
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                          Net: {activity.pointsNet ?? activity.pointsAwarded ?? 0}{" "}
                          pts
                        </p>
                      </div>
                    </TableCell>

                    {/* Aksi Button */}
                    <TableCell className="align-top py-3.5 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedActivity(activity)}
                          className="h-8 rounded-lg border-blue-200 bg-blue-50/50 text-xs font-semibold text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 cursor-pointer"
                        >
                          <Eye className="size-3.5 mr-1 text-blue-600 dark:text-blue-400" />
                          Detail
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-8">
                  <MyDayEmptyState
                    iconType="activity"
                    title="Belum ada riwayat aktivitas yang disubmit"
                    description="Seluruh riwayat pengerjaan dan status approval aktivitas Anda akan tercatat di sini."
                    action={emptyAction}
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Official Document Detail View Modal */}
      <MyDayDetailDialog
        activity={selectedActivity}
        employee={employee}
        site={site}
        isOpen={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </>
  );
}
