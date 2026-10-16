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

export interface PenaltyEventItem {
  id: number;
  employeeName?: string | null;
  penaltyCode: string;
  description?: string | null;
  pointsDeducted: number;
  disputeStatus?: string | null;
}

export function ActivityPenaltyEventsTable({
  events,
}: {
  events: PenaltyEventItem[];
}) {
  const [sortField, setSortField] = React.useState<string>("penaltyCode");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortedEvents = React.useMemo(() => {
    return [...events].sort((a, b) => {
      let aVal: any = a[sortField as keyof PenaltyEventItem];
      let bVal: any = b[sortField as keyof PenaltyEventItem];

      if (typeof aVal === "string") {
        const cmp = aVal.localeCompare(bVal || "");
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (typeof aVal === "number") {
        return sortDir === "asc" ? aVal - (bVal || 0) : (bVal || 0) - aVal;
      }
      return 0;
    });
  }, [events, sortField, sortDir]);

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
                onClick={() => handleSort("employeeName")}
              >
                Employee
                {sortField === "employeeName" ? (
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
                onClick={() => handleSort("penaltyCode")}
              >
                Penalty
                {sortField === "penaltyCode" ? (
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
                onClick={() => handleSort("pointsDeducted")}
              >
                Points
                {sortField === "pointsDeducted" ? (
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
                onClick={() => handleSort("disputeStatus")}
              >
                Status
                {sortField === "disputeStatus" ? (
                  sortDir === "asc" ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                ) : (
                  <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                )}
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedEvents.length > 0 ? (
            sortedEvents.map((event) => (
              <TableRow key={event.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                <TableCell className="font-medium text-slate-900">{event.employeeName ?? "-"}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-semibold text-slate-800">{event.penaltyCode}</p>
                    <p className="text-xs text-muted-foreground">{event.description}</p>
                  </div>
                </TableCell>
                <TableCell className="font-bold text-rose-600">-{event.pointsDeducted}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs font-medium">{event.disputeStatus || "Normal"}</Badge>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-muted-foreground text-xs">
                Belum ada data penalty event tercatat.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
