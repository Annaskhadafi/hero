import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1800px] space-y-7 px-4 py-6 sm:px-6 lg:px-8 xl:px-8">
      <div className="flex flex-col gap-4 rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-slate-200/60 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-96" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </Card>
        <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </Card>
      </div>

      <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-[200px] w-full" />
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </Card>
        <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </Card>
      </div>

      <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
        <Skeleton className="h-5 w-32 mb-4" />
        <Skeleton className="h-[200px] w-full" />
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </Card>
        <Card className="p-5 shadow-sm ring-1 ring-slate-200/60">
          <Skeleton className="h-5 w-32 mb-4" />
          <Skeleton className="h-[200px] w-full" />
        </Card>
      </div>
    </div>
  );
}
