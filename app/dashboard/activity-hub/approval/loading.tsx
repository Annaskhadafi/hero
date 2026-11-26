import { Skeleton } from "@/components/ui/skeleton"

export default function ApprovalListingLoading() {
  return (
    <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6 animate-in fade-in duration-150">
      {/* Top Header / Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-56 rounded-lg bg-slate-200/80 dark:bg-slate-800" />
            <Skeleton className="h-5 w-24 rounded-full bg-indigo-100/60 dark:bg-indigo-950" />
          </div>
          <Skeleton className="h-4 w-80 rounded-md bg-slate-100 dark:bg-slate-800/60" />
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg bg-slate-200/80 dark:bg-slate-800" />
          <Skeleton className="h-9 w-32 rounded-lg bg-blue-200/80 dark:bg-blue-900" />
        </div>
      </div>

      {/* KPI Scorecards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200/70 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-16 bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="mt-2 space-y-1">
              <Skeleton className="h-6 w-12 bg-slate-200/80 dark:bg-slate-800" />
              <Skeleton className="h-2.5 w-20 bg-slate-100 dark:bg-slate-800/60" />
            </div>
          </div>
        ))}
      </div>

      {/* Table Container Skeleton */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800/80">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Skeleton className="h-9 w-full rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
            <Skeleton className="h-9 w-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
            <Skeleton className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>

        {/* Rows Skeleton */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-36 bg-slate-200/70 dark:bg-slate-800" />
                  <Skeleton className="h-3 w-24 bg-slate-100 dark:bg-slate-800/60" />
                </div>
              </div>
              <Skeleton className="h-6 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-4 w-28 bg-slate-100 dark:bg-slate-800" />
              <Skeleton className="h-7 w-20 rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
