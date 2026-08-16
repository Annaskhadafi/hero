import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Top Header / Breadcrumb & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-48 rounded-lg bg-slate-200/80 dark:bg-slate-800" />
          <Skeleton className="h-4 w-72 rounded-md bg-slate-100 dark:bg-slate-800/60" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg bg-slate-200/80 dark:bg-slate-800" />
          <Skeleton className="h-9 w-32 rounded-lg bg-slate-200/80 dark:bg-slate-800" />
        </div>
      </div>

      {/* KPI / Metric Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24 bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="mt-3 space-y-2">
              <Skeleton className="h-8 w-20 bg-slate-200/80 dark:bg-slate-800" />
              <Skeleton className="h-3.5 w-32 bg-slate-100 dark:bg-slate-800/60" />
            </div>
          </div>
        ))}
      </div>

      {/* Operational Toolbar & Table Container */}
      <div className="rounded-xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-950">
        {/* Command Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5 flex-1 max-w-sm">
            <Skeleton className="h-9 w-full rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-lg bg-slate-100 dark:bg-slate-800" />
            <Skeleton className="h-9 w-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
            <Skeleton className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
            <Skeleton className="h-4 w-32 bg-slate-200/70 dark:bg-slate-800" />
            <Skeleton className="h-4 w-24 bg-slate-200/70 dark:bg-slate-800" />
            <Skeleton className="h-4 w-36 bg-slate-200/70 dark:bg-slate-800 hidden sm:block" />
            <Skeleton className="h-4 w-20 bg-slate-200/70 dark:bg-slate-800 hidden md:block" />
            <Skeleton className="h-4 w-16 bg-slate-200/70 dark:bg-slate-800" />
          </div>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 dark:border-slate-900"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-36 bg-slate-200/80 dark:bg-slate-800" />
                  <Skeleton className="h-3 w-24 bg-slate-100 dark:bg-slate-800/60" />
                </div>
              </div>
              <Skeleton className="h-4 w-28 bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-4 w-32 bg-slate-100 dark:bg-slate-800 hidden sm:block" />
              <Skeleton className="h-6 w-20 rounded-full bg-slate-100 dark:bg-slate-800 hidden md:block" />
              <Skeleton className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
