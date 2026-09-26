import Link from "next/link";
import { ChevronDown, FileSignature, FileText, ListChecks, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RouteChecklistProps {
  routeChecklist: {
    routeCode: string;
    routeName: string;
    shiftCode: string;
    sectionName?: string | null;
    positionName?: string | null;
    description?: string | null;
    groupCount: number;
    itemCount: number;
    mobileEnabled?: boolean;
    sessionId?: string | number | null;
    activeSpl?: {
      splNumber: string;
      title: string;
      lineCount: number;
      items: Array<{
        id: number;
        lineLabel: string;
        targetUnit?: string | null;
        plannedPoints: number;
      }>;
    } | null;
    groups: Array<{
      id: number;
      groupKey: string;
      groupName: string;
      description?: string | null;
      items: Array<{
        id: number;
        itemCode?: string | null;
        libraryCode?: string | null;
        itemLabel: string;
        itemDescription?: string | null;
        libraryName?: string | null;
        pointOverride?: number | null;
        libraryPoints?: number | null;
      }>;
    }>;
  };
}

export function MyDayRouteChecklist({ routeChecklist }: RouteChecklistProps) {
  return (
    <details className="group rounded-xl border border-slate-200/80 bg-white shadow-2xs transition-all dark:border-slate-800 dark:bg-slate-900">
      <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-2.5 select-none hover:bg-slate-50/60 dark:hover:bg-slate-800/40 rounded-xl transition-colors">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <ListChecks className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="font-semibold text-slate-900 dark:text-white">Route:</span>
          <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{routeChecklist.routeCode}</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-600 dark:text-slate-400">{routeChecklist.routeName}</span>
          <span className="text-slate-400">({routeChecklist.itemCount} item)</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="text-[11px] hidden sm:inline group-open:hidden">Detail</span>
          <ChevronDown className="size-3.5 transition-transform duration-200 group-open:rotate-180" />
        </div>
      </summary>

      <div className="border-t border-slate-100 p-4 sm:p-6 dark:border-slate-800/80 space-y-5">
        {/* Route Details & Action Buttons */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="rounded-md font-semibold text-xs">
                {routeChecklist.routeCode}
              </Badge>
              <Badge variant="outline" className="rounded-md text-xs">
                {routeChecklist.shiftCode}
              </Badge>
              <Badge variant="outline" className="rounded-md text-xs">
                {routeChecklist.sectionName ?? "Semua section"}
              </Badge>
              <Badge variant="outline" className="rounded-md text-xs">
                {routeChecklist.positionName ?? "Semua jabatan"}
              </Badge>
              {routeChecklist.activeSpl ? (
                <Badge className="rounded-md bg-amber-100 text-amber-900 border-0 text-xs">
                  {routeChecklist.activeSpl.splNumber}
                </Badge>
              ) : null}
            </div>

            <p className="max-w-3xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {routeChecklist.description || "Gunakan blok ini sebagai konteks checklist kerja aktif untuk section dan jabatan Anda."}
            </p>

            {routeChecklist.activeSpl ? (
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <Sparkles className="size-3.5" />
                SPL aktif: {routeChecklist.activeSpl.title} ({routeChecklist.activeSpl.lineCount} target line)
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {routeChecklist.sessionId ? (
              <>
                <Button asChild variant="outline" size="sm" className="rounded-xl border-slate-200 dark:border-slate-700 text-xs font-semibold">
                  <Link href={`/dashboard/activity-hub/document/${routeChecklist.sessionId}`}>
                    <FileText className="size-3.5 mr-1" />
                    Dokumen User
                  </Link>
                </Button>
                <Button asChild size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold">
                  <Link href={`/dashboard/activity-hub/document/${routeChecklist.sessionId}/approval`}>
                    <FileSignature className="size-3.5 mr-1" />
                    Approval Workflow
                  </Link>
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {/* Active SPL highlight box */}
        {routeChecklist.activeSpl ? (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs dark:border-amber-900/60 dark:bg-amber-950/40">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-900/40">
              <span className="font-bold text-amber-900 dark:text-amber-200">
                Instruksi SPL: {routeChecklist.activeSpl.splNumber}
              </span>
              <span className="text-amber-700 dark:text-amber-400 font-medium">
                {routeChecklist.activeSpl.items.length} line items
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {routeChecklist.activeSpl.items.map((item) => (
                <div key={item.id} className="rounded-lg bg-white p-2.5 shadow-2xs dark:bg-slate-900">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{item.lineLabel}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Unit: {item.targetUnit || "-"} • <span className="font-semibold text-emerald-600">+{item.plannedPoints} pts</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Groups and Items Grid */}
        <div className="grid gap-3.5 lg:grid-cols-2">
          {routeChecklist.groups.map((group) => (
            <details
              key={group.id}
              className="group/item rounded-xl border border-slate-200/70 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40"
              open
            >
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {group.groupKey}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{group.groupName}</h4>
                  {group.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{group.description}</p>
                  )}
                </div>
                <Badge variant="outline" className="text-[11px] font-medium bg-white dark:bg-slate-900">
                  {group.items.length} item
                </Badge>
              </summary>

              <div className="mt-3 space-y-2 border-t border-slate-200/60 pt-3 dark:border-slate-700/50">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-200/60 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {item.itemCode || item.libraryCode || "ITEM"}
                      </span>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.itemLabel}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {item.itemDescription || item.libraryName || "Tanpa deskripsi tambahan."}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-[11px] font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300">
                      {item.pointOverride ?? item.libraryPoints ?? 0} pts
                    </Badge>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </details>
  );
}
