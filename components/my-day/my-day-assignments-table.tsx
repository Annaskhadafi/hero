"use client";

import * as React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
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
import { MyDayEmptyState } from "@/components/my-day/my-day-empty-state";

export interface MyDayAssignment {
  id: number;
  activityName?: string | null;
  customJobName?: string | null;
  activityCode?: string | null;
  category?: string | null;
  assignmentType?: string | null;
  notes?: string | null;
  statusLabel: string;
  priority: string;
  durationLabel?: string | null;
  deadline?: Date | null;
  createdAt: Date;
  assignedByName?: string | null;
  isMandatory?: boolean;
}

function statusBadgeClass(status: string) {
  const normalized = (status || "").toLowerCase();

  if (normalized.includes("approved") || normalized.includes("selesai") || normalized.includes("done")) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/50 font-semibold";
  }

  if (normalized.includes("pending") || normalized.includes("review") || normalized.includes("menunggu")) {
    return "bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/50 font-semibold";
  }

  if (normalized.includes("reject") || normalized.includes("tolak") || normalized.includes("batal")) {
    return "bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/50 font-semibold";
  }

  return "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-medium";
}

export function MyDayAssignmentsTable({
  assignments,
}: {
  assignments: MyDayAssignment[];
}) {
  const [sortField, setSortField] = React.useState<string>("deadline");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedAssignments = React.useMemo(() => {
    return [...assignments].sort((a, b) => {
      let aVal: any = a[sortField as keyof MyDayAssignment];
      let bVal: any = b[sortField as keyof MyDayAssignment];

      if (sortField === "activity") {
        aVal = (a.activityName ?? a.customJobName) || "";
        bVal = (b.activityName ?? b.customJobName) || "";
      } else if (sortField === "deadline") {
        const aTime = a.deadline ? new Date(a.deadline).getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.deadline ? new Date(b.deadline).getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortDir === "asc" ? aTime - bTime : bTime - aTime;
      }

      if (typeof aVal === "string") {
        const cmp = aVal.localeCompare(bVal || "");
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (typeof aVal === "boolean") {
        return sortDir === "asc" ? (aVal === bVal ? 0 : aVal ? -1 : 1) : (aVal === bVal ? 0 : aVal ? 1 : -1);
      }
      return 0;
    });
  }, [assignments, sortField, sortDir]);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <Table>
        <TableHeader className="bg-slate-50 dark:bg-slate-800/60">
          <TableRow className="border-b border-slate-200 dark:border-slate-700">
            <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-7 text-xs font-bold hover:bg-transparent px-2"
                onClick={() => handleSort("activity")}
              >
                Activity
                {sortField === "activity" ? (
                  sortDir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                ) : (
                  <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                )}
              </Button>
            </TableHead>
            <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-7 text-xs font-bold hover:bg-transparent px-2"
                onClick={() => handleSort("statusLabel")}
              >
                Status
                {sortField === "statusLabel" ? (
                  sortDir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                ) : (
                  <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                )}
              </Button>
            </TableHead>
            <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-7 text-xs font-bold hover:bg-transparent px-2"
                onClick={() => handleSort("priority")}
              >
                Priority
                {sortField === "priority" ? (
                  sortDir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                ) : (
                  <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                )}
              </Button>
            </TableHead>
            <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-7 text-xs font-bold hover:bg-transparent px-2"
                onClick={() => handleSort("deadline")}
              >
                Deadline
                {sortField === "deadline" ? (
                  sortDir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                ) : (
                  <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                )}
              </Button>
            </TableHead>
            <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-7 text-xs font-bold hover:bg-transparent px-2"
                onClick={() => handleSort("assignedByName")}
              >
                PIC
                {sortField === "assignedByName" ? (
                  sortDir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                ) : (
                  <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                )}
              </Button>
            </TableHead>
            <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-7 text-xs font-bold hover:bg-transparent px-2"
                onClick={() => handleSort("isMandatory")}
              >
                Mandatory
                {sortField === "isMandatory" ? (
                  sortDir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                ) : (
                  <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                )}
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAssignments.length > 0 ? (
            sortedAssignments.map((assignment) => (
              <TableRow
                key={assignment.id}
                data-date-value={(assignment.deadline ?? assignment.createdAt).toISOString()}
                data-filter-status={assignment.statusLabel}
                data-filter-priority={assignment.priority}
                data-filter-mandatory={assignment.isMandatory ? "yes" : "optional"}
                className="border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-800/50"
              >
                <TableCell className="align-top py-3.5">
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {(assignment.activityName ?? assignment.customJobName) || "Custom assignment"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {assignment.activityCode ?? "Custom"} • {assignment.category ?? assignment.assignmentType}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {assignment.notes || "Tanpa catatan tambahan."}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="align-top py-3.5">
                  <Badge className={`rounded-full px-2.5 py-0.5 text-xs ${statusBadgeClass(assignment.statusLabel)}`}>
                    {assignment.statusLabel}
                  </Badge>
                </TableCell>
                <TableCell className="align-top py-3.5">
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{assignment.priority}</p>
                    <p className="text-slate-400 dark:text-slate-500">{assignment.durationLabel}</p>
                  </div>
                </TableCell>
                <TableCell className="align-top py-3.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {assignment.deadline
                    ? new Date(assignment.deadline).toLocaleString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </TableCell>
                <TableCell className="align-top py-3.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {assignment.assignedByName}
                </TableCell>
                <TableCell className="align-top py-3.5">
                  <Badge variant="outline" className="rounded-md text-[11px] font-medium">
                    {assignment.isMandatory ? "Wajib" : "Opsional"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="py-8">
                <MyDayEmptyState
                  iconType="jobs"
                  title="Belum ada antrean tugas"
                  description="Foreman belum memberikan tugas khusus untuk shift hari ini."
                />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
