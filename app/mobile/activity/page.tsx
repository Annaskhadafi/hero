import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, CheckCircle2, ClipboardList, FileSignature,
  ListChecks, Plus, Sparkles, Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { MobileActivityLog } from "@/components/mobile/mobile-activity-log";
import { getServerSession } from "@/lib/auth-session";

import { getActivityPagePurpose } from "@/lib/activity-navigation";
import { getDailyActivityEmployeeData } from "@/lib/daily-activity";
import { cn } from "@/lib/utils";

function formatTime(value?: Date | null) {
  if (!value) return "--:--";
  return value.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function statusBadgeClass(status: string) {
  const n = status.toLowerCase();
  if (n.includes("approved")) return "bg-emerald-50 text-emerald-700";
  if (n.includes("pending")) return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-700";
}

export default async function MobileActivityPage() {
  const session = await getServerSession();
  if (!session?.user?.email) redirect("/sign-in");

  const data = await getDailyActivityEmployeeData(session.user.email, { ensureSeed: false });
  if (!data) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-500">
        Data employee belum tersedia untuk akun ini.
      </div>
    );
  }

  const productivityPercent =
    data.summary.jobsAssigned > 0
      ? Math.round((data.summary.jobsCompleted / data.summary.jobsAssigned) * 100)
      : data.activities.length > 0 ? 100 : 0;
  const pagePurpose = getActivityPagePurpose("input");

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <section className="rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-blue-200">Aktivitas Harian</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">{pagePurpose.title}</h1>
          </div>
          <Link
            prefetch={false}
            href="/mobile/activity/input"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10"
            aria-label="Add activity"
          >
            <Plus className="size-5 text-blue-200" />
          </Link>
        </div>

        {/* Productivity Card */}
        <div className="mt-4 rounded-xl bg-white/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-medium text-blue-100">
                <Sparkles className="size-3" /> Productivity
              </span>
              <p className="mt-3 text-3xl font-bold leading-none">{productivityPercent}%</p>
              <p className="mt-2 text-sm text-blue-200">
                {data.summary.jobsCompleted}/{data.summary.jobsAssigned} job tercapai hari ini
              </p>
            </div>
            <Link
              prefetch={false}
              href="/mobile/activity/input"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-xs font-semibold text-blue-700"
            >
              Input <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-white/10 px-3 py-2.5 text-center">
              <p className="text-[10px] font-medium text-blue-200">Points</p>
              <p className="mt-1 text-lg font-bold">{data.summary.pointsToday}</p>
            </div>
            <div className="rounded-lg bg-white/10 px-3 py-2.5 text-center">
              <p className="text-[10px] font-medium text-blue-200">Streak</p>
              <p className="mt-1 text-lg font-bold">{data.summary.streakDays}</p>
            </div>
            <div className="rounded-lg bg-white/10 px-3 py-2.5 text-center">
              <p className="text-[10px] font-medium text-blue-200">Sync</p>
              <p className="mt-1 text-lg font-bold">{data.summary.syncAt}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <ClipboardList className="size-5 text-blue-600" />
          <p className="mt-3 text-xl font-bold text-gray-900">{data.summary.jobsAssigned}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Queue</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <CheckCircle2 className="size-5 text-emerald-600" />
          <p className="mt-3 text-xl font-bold text-gray-900">{data.summary.jobsCompleted}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Done</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <Target className="size-5 text-orange-600" />
          <p className="mt-3 text-xl font-bold text-gray-900">{data.activities.length}</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Log</p>
        </div>
      </div>

      {/* Job List */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Job List Aktual</h2>
          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">{data.assignments.length} item</span>
        </div>

        {data.assignments.length > 0 ? (
          <div className="space-y-2">
            {data.assignments.map((assignment) => (
              <article key={assignment.id} className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{assignment.activityCode ?? "Custom Job"}</p>
                    <h2 className="mt-1 text-sm font-semibold leading-tight text-gray-900">{assignment.customJobName || assignment.activityName || "Pekerjaan Aktual"}</h2>
                    <p className="mt-1 text-xs text-gray-500">{assignment.assignedByName} &bull; {assignment.durationLabel}</p>
                  </div>
                  <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-medium shrink-0", statusBadgeClass(assignment.statusLabel))}>{assignment.statusLabel}</span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-gray-50 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-gray-500">Deadline</p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-900">{formatTime(assignment.deadline)}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2.5">
                    <p className="text-[10px] font-medium text-gray-500">Priority</p>
                    <p className="mt-0.5 text-sm font-semibold text-gray-900">{assignment.priority}</p>
                  </div>
                </div>

                {assignment.notes ? <p className="mt-2 text-xs leading-relaxed text-gray-600">{assignment.notes}</p> : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-500">Belum ada assignment hari ini.</div>
        )}
      </section>

      {/* Daily Route */}
      {data.routeChecklist ? (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Daily Route</h2>
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">{data.routeChecklist.itemCount} item</span>
          </div>

          <article className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{data.routeChecklist.routeCode}</p>
                <h2 className="mt-1 flex items-center gap-2 text-sm font-semibold leading-tight text-gray-900">
                  <ListChecks className="size-4 text-blue-600" /> {data.routeChecklist.routeName}
                </h2>
                <p className="mt-1 text-xs text-gray-500">{data.routeChecklist.sectionName ?? "Semua section"} &bull; {data.routeChecklist.positionName ?? "Semua jabatan"}</p>
              </div>
              <span className="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">{data.routeChecklist.shiftCode}</span>
            </div>

            <div className="mt-4 space-y-3">
              {data.routeChecklist.activeSpl ? (
                <div className="rounded-lg bg-amber-50 px-4 py-3">
                  <p className="text-[10px] font-medium text-amber-700">{data.routeChecklist.activeSpl.splNumber}</p>
                  <p className="mt-1 text-sm font-semibold text-amber-900">{data.routeChecklist.activeSpl.title}</p>
                </div>
              ) : null}
              {data.routeChecklist.sessionId ? (
                <Link prefetch={false} href={`/mobile/activity/document/${data.routeChecklist.sessionId}`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-medium text-white">
                  <FileSignature className="size-4" /> Dokumen User
                </Link>
              ) : null}
              {data.routeChecklist.groups.map((group) => (
                <div key={group.id} className="rounded-lg bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{group.groupKey}</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{group.groupName}</p>
                  <div className="mt-3 space-y-2">
                    {group.items.map((item) => (
                      <div key={item.id} className="rounded-lg bg-white px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">{item.itemLabel}</p>
                            <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.itemDescription || item.libraryName || "Checklist item"}</p>
                          </div>
                          <span className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">{item.pointOverride ?? item.libraryPoints ?? 0} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {/* SPL Aktif */}
      {data.standaloneOvertimeChecklist ? (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] font-medium uppercase tracking-wider text-gray-500">SPL Aktif</h2>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">{data.standaloneOvertimeChecklist.lineCount} line</span>
          </div>

          <article className="rounded-xl border border-gray-100 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{data.standaloneOvertimeChecklist.splNumber}</p>
                <h2 className="mt-1 flex items-center gap-2 text-sm font-semibold leading-tight text-gray-900">
                  <ListChecks className="size-4 text-blue-600" /> {data.standaloneOvertimeChecklist.title}
                </h2>
                <p className="mt-1 text-xs text-gray-500">{data.standaloneOvertimeChecklist.checkedCount}/{data.standaloneOvertimeChecklist.lineCount} line selesai</p>
              </div>
              <span className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">{data.standaloneOvertimeChecklist.progressPercent}%</span>
            </div>

            <div className="mt-4 space-y-3">
              <Link prefetch={false} href="/mobile/activity/input"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-medium text-white">
                <FileSignature className="size-4" /> Isi Evidence SPL
              </Link>
              {data.standaloneOvertimeChecklist.sessionId ? (
                <Link prefetch={false} href={`/mobile/activity/document/${data.standaloneOvertimeChecklist.sessionId}`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-xs font-medium text-blue-700">
                  <FileSignature className="size-4" /> Dokumen User
                </Link>
              ) : null}
              <div className="space-y-2">
                {data.standaloneOvertimeChecklist.items.map((item) => (
                  <div key={item.id} className="rounded-lg bg-gray-50 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{item.lineLabel}</p>
                        <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.lineDescription || item.targetUnit || "Checklist SPL"}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">{item.plannedPoints} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>
      ) : null}

      {/* Activity Log */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[11px] font-medium uppercase tracking-wider text-gray-500">Activity Log</h2>
          <Link prefetch={false} href="/mobile/activity/input"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
            Add Activity <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <MobileActivityLog
          activities={data.activities.map((activity) => ({
            ...activity,
            startTime: activity.startTime.toISOString(),
            endTime: activity.endTime.toISOString(),
            submissionTime: activity.submissionTime?.toISOString() ?? null,
          }))}
        />
      </section>
    </div>
  );
}
