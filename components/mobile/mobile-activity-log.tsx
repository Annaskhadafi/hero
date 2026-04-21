"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, CheckCircle2, Clock3, MapPin, Sparkles } from "lucide-react";

type ActivityLogItem = {
  id: number;
  activityCode?: string | null;
  activityType?: string | null;
  title: string;
  unitNumber?: string | null;
  sourceMode: string;
  status: string;
  statusLabel: string;
  priority?: string | null;
  startTime: string;
  endTime: string;
  submissionTime: string | null;
  submissionCategory?: string | null;
  pointsAwarded: number;
  penaltyDeducted: number;
  equipmentNo?: string | null;
  materialUsed?: string | null;
  gpsValid?: boolean | null;
  photoCount: number;
  remarks?: string | null;
  assignmentId?: number | null;
  libraryName?: string | null;
  durationLabel: string;
  pointsNet: number;
};

type MobileActivityLogProps = {
  activities: ActivityLogItem[];
};

function formatTime(value?: string | null) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("approved")) {
    return "border-0 bg-[#dff4e8] text-[#14532d]";
  }

  if (normalized.includes("pending")) {
    return "border-0 bg-[#fff1cf] text-[#8a5a00]";
  }

  return "border-0 bg-[#eaf4fb] text-[#003f78]";
}

export function MobileActivityLog({ activities }: MobileActivityLogProps) {
  const [selected, setSelected] = useState<ActivityLogItem | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(Math.max(activities.length, 1) / pageSize));
  const paginatedActivities = activities.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages, pageSize]);

  return (
    <>
      {activities.length > 0 ? (
        <div className="space-y-3">
          {paginatedActivities.map((activity) => (
            <button
              key={activity.id}
              type="button"
              onClick={() => setSelected(activity)}
              className="w-full text-left rounded-[1.25rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] transition hover:shadow-[0_18px_36px_rgba(8,32,51,0.12)]"
            >
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#e9f6fd] text-[#003f78]">
                  {activity.photoCount > 0 ? <Camera className="size-4" /> : <CheckCircle2 className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-[#082033]">{activity.title}</h3>
                      <p className="mt-1 text-xs font-semibold text-[#486275]">
                        {activity.activityCode ?? "-"} • {activity.sourceMode} • {activity.unitNumber ?? "-"}
                      </p>
                    </div>
                    <Badge className={statusBadgeClass(activity.statusLabel)}>{activity.statusLabel}</Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-semibold text-[#486275]">
                    <div className="rounded-[0.9rem] bg-[#f6fbff] px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Waktu</p>
                      <p className="mt-1 text-sm text-[#082033]">
                        {formatTime(activity.startTime)} - {formatTime(activity.endTime)}
                      </p>
                    </div>
                    <div className="rounded-[0.9rem] bg-[#f6fbff] px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Net Point</p>
                      <p className="mt-1 text-sm text-[#082033]">
                        {activity.pointsNet >= 0 ? "+" : ""}
                        {activity.pointsNet}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#486275]">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef6fb] px-3 py-1.5">
                      <Clock3 className="size-3.5" />
                      {activity.durationLabel}
                    </span>
                    {activity.photoCount > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef6fb] px-3 py-1.5">
                        <Camera className="size-3.5" />
                        {activity.photoCount} foto
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          ))}
          <div className="flex items-center justify-between rounded-[1rem] bg-white px-4 py-3 text-xs font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <span>
              {Math.min((page - 1) * pageSize + 1, activities.length)}-
              {Math.min(page * pageSize, activities.length)} / {activities.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="h-8 rounded-xl px-3 text-[11px] font-black text-[#003f78]"
              >
                Prev
              </Button>
              <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#486275]">
                Page {page}/{totalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="h-8 rounded-xl px-3 text-[11px] font-black text-[#003f78]"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[1.25rem] bg-white p-5 text-center text-sm font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          Belum ada activity yang disubmit hari ini.
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="w-[min(96vw,640px)] max-w-[min(96vw,640px)] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Detail Activity</DialogTitle>
            <DialogDescription>{selected ? selected.title : ""}</DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="grid gap-4 px-6 pb-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1rem] bg-[#f6fbff] p-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Status</p>
                    <Badge className={statusBadgeClass(selected.statusLabel)}>
                      {selected.statusLabel}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Net Point</p>
                    <p className="text-sm font-black text-[#082033]">
                      {selected.pointsNet >= 0 ? "+" : ""}
                      {selected.pointsNet}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1rem] bg-[#eef6fb] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Activity Code</p>
                    <p className="mt-1 text-sm text-[#082033]">{selected.activityCode ?? "-"}</p>
                  </div>
                  <div className="rounded-[1rem] bg-[#eef6fb] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Source</p>
                    <p className="mt-1 text-sm text-[#082033]">{selected.sourceMode}</p>
                  </div>
                  <div className="rounded-[1rem] bg-[#eef6fb] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Unit</p>
                    <p className="mt-1 text-sm text-[#082033]">{selected.unitNumber ?? "-"}</p>
                  </div>
                  <div className="rounded-[1rem] bg-[#eef6fb] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Priority</p>
                    <p className="mt-1 text-sm text-[#082033]">{selected.priority ?? "-"}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1rem] bg-[#fff8e8] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8a5a00]">Waktu Mulai</p>
                  <p className="mt-1 text-sm text-[#082033]">{formatTime(selected.startTime)}</p>
                </div>
                <div className="rounded-[1rem] bg-[#fff8e8] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8a5a00]">Waktu Selesai</p>
                  <p className="mt-1 text-sm text-[#082033]">{formatTime(selected.endTime)}</p>
                </div>
              </div>

              <div className="rounded-[1rem] bg-[#eef6fb] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Durasi</p>
                <p className="mt-1 text-sm text-[#082033]">{selected.durationLabel}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1rem] bg-[#eef6fb] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Points Awarded</p>
                  <p className="mt-1 text-sm text-[#082033]">{selected.pointsAwarded}</p>
                </div>
                <div className="rounded-[1rem] bg-[#eef6fb] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Penalty</p>
                  <p className="mt-1 text-sm text-[#082033]">{selected.penaltyDeducted}</p>
                </div>
              </div>

              <div className="rounded-[1rem] bg-[#eef6fb] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Library Activity</p>
                <p className="mt-1 text-sm text-[#082033]">{selected.libraryName ?? "-"}</p>
              </div>

              <div className="rounded-[1rem] bg-[#f6fbff] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">GPS</p>
                <p className="mt-1 text-sm text-[#082033]">
                  {selected.gpsValid === false ? "Tidak valid" : selected.gpsValid === true ? "Valid" : "-"}
                </p>
              </div>

              {selected.remarks ? (
                <div className="rounded-[1rem] bg-[#f6fbff] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Remarks</p>
                  <p className="mt-1 text-sm text-[#082033]">{selected.remarks}</p>
                </div>
              ) : null}

              {selected.photoCount > 0 ? (
                <div className="rounded-[1rem] bg-[#eef6fb] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#486275]">Photo Count</p>
                  <p className="mt-1 text-sm text-[#082033]">{selected.photoCount} foto</p>
                </div>
              ) : null}

              <div className="flex justify-end">
                <Button type="button" onClick={() => setSelected(null)}>
                  Tutup
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
