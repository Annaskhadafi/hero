import { Clock3, ImageIcon, MapPinned } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

type ActivityItem = {
  id: number;
  activityCode: string;
  title: string;
  status: string;
  statusLabel: string;
  priority: string;
  sourceMode: string;
  unitNumber: string;
  startTime: Date;
  endTime: Date;
  submissionTime: Date | null;
  photoCount: number;
  remarks: string;
  pointsAwarded: number;
  penaltyDeducted: number;
  pointsNet: number;
  durationLabel: string;
};

type ActivityDayGroup = {
  key: string;
  label: string;
  activityCount: number;
  pointsNet: number;
  items: ActivityItem[];
};

type ActivityEmployeeGroup = {
  employeeId: number;
  employeeName: string;
  employeeRole: string;
  totalActivities: number;
  totalPointsNet: number;
  days: ActivityDayGroup[];
};

function statusBadgeClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("approved")) {
    return "bg-emerald-100 text-emerald-900";
  }

  if (normalized.includes("pending")) {
    return "bg-amber-100 text-amber-900";
  }

  if (normalized.includes("reject")) {
    return "bg-rose-100 text-rose-900";
  }

  return "bg-slate-100 text-slate-800";
}

export function ActivityTeamLogPanel({
  groups,
  emptyMessage,
}: {
  groups: ActivityEmployeeGroup[];
  emptyMessage: string;
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-[1.25rem] bg-surface-container-low px-4 py-8 text-center text-sm font-medium text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-3">
      {groups.map((group) => (
        <AccordionItem
          key={group.employeeId}
          value={`employee-${group.employeeId}`}
          className="overflow-hidden rounded-[1.25rem] border-0 bg-surface-container-lowest shadow-[0_18px_42px_rgba(8,32,51,0.08)]"
        >
          <AccordionTrigger className="px-4 py-4 hover:no-underline">
            <div className="flex flex-1 flex-col gap-3 text-left sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold text-foreground">{group.employeeName}</p>
                  <Badge variant="outline">{group.employeeRole || "Team Member"}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {group.days.length} hari aktif • {group.totalActivities} activity
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="border-0 bg-sky-100 text-sky-900">
                  {group.totalActivities} log
                </Badge>
                <Badge
                  className={
                    group.totalPointsNet >= 0
                      ? "border-0 bg-emerald-100 text-emerald-900"
                      : "border-0 bg-rose-100 text-rose-900"
                  }
                >
                  {group.totalPointsNet >= 0 ? "+" : ""}
                  {group.totalPointsNet} pts
                </Badge>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-3">
              {group.days.length > 0 ? (
                group.days.map((day) => (
                  <section key={day.key} className="rounded-[1rem] bg-surface-container-low p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{day.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {day.activityCount} activity
                        </p>
                      </div>
                      <Badge
                        className={
                          day.pointsNet >= 0
                            ? "border-0 bg-emerald-100 text-emerald-900"
                            : "border-0 bg-rose-100 text-rose-900"
                        }
                      >
                        {day.pointsNet >= 0 ? "+" : ""}
                        {day.pointsNet} pts
                      </Badge>
                    </div>

                    <div className="mt-3 space-y-2">
                      {day.items.map((item) => (
                        <article
                          key={item.id}
                          className="rounded-[0.9rem] bg-white px-3 py-3 shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">{item.title}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {item.activityCode} • {item.priority} • {item.sourceMode}
                              </p>
                            </div>
                            <Badge className={statusBadgeClass(item.statusLabel)}>{item.statusLabel}</Badge>
                          </div>

                          <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                            <span className="flex items-center gap-1.5">
                              <Clock3 className="size-3.5" />
                              {item.durationLabel} •{" "}
                              {item.startTime.toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              -{" "}
                              {item.endTime.toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MapPinned className="size-3.5" />
                              Unit {item.unitNumber || "-"}
                            </span>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Badge
                              className={
                                item.pointsNet >= 0
                                  ? "border-0 bg-emerald-100 text-emerald-900"
                                  : "border-0 bg-rose-100 text-rose-900"
                              }
                            >
                              {item.pointsNet >= 0 ? "+" : ""}
                              {item.pointsNet} pts
                            </Badge>
                            {item.photoCount > 0 ? (
                              <Badge variant="outline">
                                <ImageIcon className="mr-1 size-3.5" />
                                {item.photoCount} foto
                              </Badge>
                            ) : null}
                            {item.submissionTime ? (
                              <Badge variant="outline">
                                Submit{" "}
                                {item.submissionTime.toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </Badge>
                            ) : null}
                          </div>

                          {item.remarks ? (
                            <p className="mt-3 text-xs leading-5 text-muted-foreground">{item.remarks}</p>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </section>
                ))
              ) : (
                <div className="rounded-[1rem] bg-surface-container-low px-4 py-6 text-center text-sm text-muted-foreground">
                  Belum ada activity bawahan pada range hari ini.
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
