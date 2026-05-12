"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AttendancePreviewConflict, AttendancePreviewRow } from "@/lib/timesheet/attendance-import";

export function AttendanceImportPreviewDialog({ open, preview, employees, mode, disabled, onModeChange, onApply, onDiscard, onFixMatch, onRequestClose }: {
  open: boolean;
  preview: { previewId: number; matchedCount: number; unmatchedCount: number; cellCount: number; conflictCount: number; validationSummary?: unknown; previewRows: AttendancePreviewRow[]; conflicts: AttendancePreviewConflict[] } | null;
  employees?: Array<{ id: number; name: string }>;
  mode: "skip-conflicts" | "overwrite-conflicts";
  disabled?: boolean;
  onModeChange: (mode: "skip-conflicts" | "overwrite-conflicts") => void;
  onApply: () => void;
  onDiscard: () => void;
  onFixMatch?: (importRowId: string, employeeId: number) => void;
  onRequestClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onRequestClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Attendance import preview</DialogTitle></DialogHeader>
        {!preview ? null : (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2 text-sm">
              <div className="rounded-lg border p-3"><div className="text-muted-foreground">Matched</div><div className="text-xl font-semibold">{preview.matchedCount}</div></div>
              <div className="rounded-lg border p-3"><div className="text-muted-foreground">Skipped</div><div className="text-xl font-semibold">{preview.unmatchedCount}</div></div>
              <div className="rounded-lg border p-3"><div className="text-muted-foreground">Cells</div><div className="text-xl font-semibold">{preview.cellCount}</div></div>
              <div className="rounded-lg border p-3"><div className="text-muted-foreground">Conflicts</div><div className="text-xl font-semibold text-orange-700">{preview.conflictCount}</div></div>
            </div>
            {preview.conflictCount ? <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800">{preview.conflictCount} conflicts found. Review before applying overwrite.</div> : null}
            <div className="max-h-48 overflow-auto rounded-lg border text-sm">
              <div className="border-b bg-muted/40 px-3 py-2 font-semibold">Matched sample</div>
              {preview.previewRows.filter((row) => row.employeeId && !row.duplicate && !row.crossSite).slice(0, 20).map((row, index) => (
                <div key={index} className="flex justify-between gap-3 border-b px-3 py-2 last:border-b-0">
                  <span>{row.employeeSn || row.employeeName || "Unknown"} day {row.day}</span>
                  <span className="text-muted-foreground">{row.matchedName} · {row.matchMethod ?? "match"}{row.matchScore ? ` ${(row.matchScore * 100).toFixed(0)}%` : ""}</span>
                </div>
              ))}
              {!preview.previewRows.some((row) => row.employeeId && !row.duplicate && !row.crossSite) ? <div className="px-3 py-2 text-muted-foreground">No matched rows.</div> : null}
            </div>
            <div className="max-h-56 overflow-auto rounded-lg border text-sm">
              <div className="border-b bg-muted/40 px-3 py-2 font-semibold">Need Fix</div>
              {preview.previewRows.filter((row) => row.unmatched || row.duplicate || row.crossSite || row.validationFlags?.length).slice(0, 20).map((row, index) => (
                <div key={index} className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 last:border-b-0">
                  <div><span>{row.employeeSn || row.employeeName || "Unknown"} day {row.day}</span><p className="text-xs text-muted-foreground">{row.unmatched ? "unmatched" : row.duplicate ? "duplicate" : row.crossSite ? "cross-site" : row.validationFlags?.join(", ")}</p></div>
                  {row.importRowId && onFixMatch ? (
                    <Select disabled={disabled} onValueChange={(value) => onFixMatch(row.importRowId!, Number(value))}>
                      <SelectTrigger className="w-56"><SelectValue placeholder="Fix employee" /></SelectTrigger>
                      <SelectContent>{(employees ?? []).map((employee) => <SelectItem key={employee.id} value={String(employee.id)}>{employee.name}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : null}
                </div>
              ))}
              {!preview.previewRows.some((row) => row.unmatched || row.duplicate || row.crossSite || row.validationFlags?.length) ? <div className="px-3 py-2 text-muted-foreground">No rows need fix.</div> : null}
            </div>
            <div className="max-h-48 overflow-auto rounded-lg border text-sm">
              <div className="border-b bg-muted/40 px-3 py-2 font-semibold">Validation Flags</div>
              {preview.previewRows.filter((row) => row.validationFlags?.length).slice(0, 20).map((row, index) => (
                <div key={index} className="flex justify-between border-b px-3 py-2 last:border-b-0">
                  <span>{row.matchedName || row.employeeName || row.employeeSn || "Unknown"} day {row.day}</span>
                  <span className="text-amber-700">{row.validationFlags?.join(", ")}</span>
                </div>
              ))}
              {!preview.previewRows.some((row) => row.validationFlags?.length) ? <div className="px-3 py-2 text-muted-foreground">No validation flags.</div> : null}
            </div>
            <div className="max-h-48 overflow-auto rounded-lg border text-sm">
              <div className="border-b bg-muted/40 px-3 py-2 font-semibold">Conflicts</div>
              {preview.conflicts.slice(0, 20).map((conflict, index) => (
                <div key={index} className="flex justify-between border-b px-3 py-2 last:border-b-0">
                  <span>{conflict.employeeName} day {conflict.day}</span>
                  <span className="text-orange-700">{conflict.scheduleCode} · {conflict.reason}</span>
                </div>
              ))}
              {!preview.conflicts.length ? <div className="px-3 py-2 text-muted-foreground">No conflicts.</div> : null}
            </div>
            <div className="flex items-center justify-between gap-3">
              <Select value={mode} onValueChange={onModeChange}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip-conflicts">Skip conflicts (recommended)</SelectItem>
                  <SelectItem value="overwrite-conflicts">Overwrite conflicts</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onDiscard} disabled={disabled}>Discard preview</Button>
                <Button onClick={onApply} disabled={disabled}>Apply import</Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
