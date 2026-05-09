"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function SchedulingStatusRail({ status, conflicts }: { status?: { scheduleStatus?: string; attendanceStatus?: string; importStatus?: string; conflictCount?: number; lastSavedAt?: string | null; lastImportedAt?: string | null; finalizedAt?: string | null } | null; conflicts: number }) {
  const finalized = Boolean(status?.finalizedAt || status?.scheduleStatus === "finalized" || status?.attendanceStatus === "finalized");
  return (
    <Card className="flex flex-wrap items-center gap-2 p-3 text-xs">
      <Badge variant={finalized ? "destructive" : "secondary"}>{finalized ? "Finalized" : "Open"}</Badge>
      <span>Settings: DB</span>
      <span>Schedule: {status?.scheduleStatus ?? "draft"}</span>
      <span>Attendance: {status?.attendanceStatus ?? "draft"}</span>
      <span>Import: {status?.importStatus ?? "none"}</span>
      <span className={conflicts ? "font-semibold text-orange-700" : "text-muted-foreground"}>Conflicts: {conflicts || status?.conflictCount || 0}</span>
      {status?.lastSavedAt ? <span>Saved: {new Date(status.lastSavedAt).toLocaleString("id-ID")}</span> : null}
      {status?.lastImportedAt ? <span>Imported: {new Date(status.lastImportedAt).toLocaleString("id-ID")}</span> : null}
    </Card>
  );
}
