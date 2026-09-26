import { CheckCircle2, Clock3, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MyDayStatCardsProps {
  jobsCompleted: number;
  jobsAssigned: number;
  pointsToday: number;
  pendingApprovalCount: number;
  penaltyToday: number;
}

export function MyDayStatCards({
  jobsCompleted,
  jobsAssigned,
  pointsToday,
  pendingApprovalCount,
  penaltyToday,
}: MyDayStatCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* 1. Pekerjaan */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pekerjaan</span>
          <CheckCircle2 className="size-4 text-blue-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {jobsCompleted}
          </span>
          <span className="text-xs text-slate-400">/ {jobsAssigned} selesai</span>
        </div>
      </div>

      {/* 2. Poin Hari Ini */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Poin Hari Ini</span>
          <Sparkles className="size-4 text-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {pointsToday}
          </span>
          <span className="text-xs font-medium text-slate-400">pts</span>
        </div>
      </div>

      {/* 3. Menunggu Approval */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Menunggu Approval</span>
          <Clock3 className="size-4 text-amber-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span
            className={cn(
              "text-2xl font-bold tracking-tight",
              pendingApprovalCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"
            )}
          >
            {pendingApprovalCount}
          </span>
          <span className="text-xs text-slate-400">aktivitas</span>
        </div>
      </div>

      {/* 4. Penalty */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Penalty</span>
          <ShieldAlert className={cn("size-4", penaltyToday > 0 ? "text-rose-500" : "text-slate-400")} />
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span
            className={cn(
              "text-2xl font-bold tracking-tight",
              penaltyToday > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"
            )}
          >
            {penaltyToday > 0 ? `-${penaltyToday}` : "0"}
          </span>
          <span className="text-xs font-medium text-slate-400">pts</span>
        </div>
      </div>
    </div>
  );
}
