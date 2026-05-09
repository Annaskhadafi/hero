import { z } from "zod";

export const attendanceImportRawRowSchema = z.object({
  employeeSn: z.string().optional().default(""),
  employeeName: z.string().optional().default(""),
  siteName: z.string().optional().default(""),
  day: z.coerce.number().int().min(1).max(31),
  status: z.enum(["present", "empty", "sick", "leave", "absent"]).default("present"),
  clockIn: z.string().max(8).optional().default(""),
  clockOut: z.string().max(8).optional().default(""),
  note: z.string().max(240).optional().default(""),
});

export const attendanceImportRawRowsSchema = z.array(attendanceImportRawRowSchema);

export type AttendanceImportRawRow = z.infer<typeof attendanceImportRawRowSchema>;
export type AttendanceImportEmployee = {
  id: number;
  name: string;
  employeeSn?: string | null;
  siteId?: number | null;
  siteName?: string | null;
};
export type AttendancePreviewRow = AttendanceImportRawRow & {
  employeeId: number | null;
  matchedName: string;
  duplicate: boolean;
  unmatched: boolean;
  crossSite: boolean;
};
export type AttendancePreviewConflict = {
  employeeId: number;
  employeeName: string;
  day: number;
  scheduleCode: string;
  reason: string;
};

const blockedScheduleCodes = new Set(["OFF", "FB", "Sakit", "Libur"]);

export function normalizeAttendanceImportIdentity(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^\d{1,2}:\d{2}$/.test(trimmed)) throw new Error(`Invalid time value: ${value}`);
  const [hour, minute] = trimmed.split(":").map(Number);
  if (hour > 23 || minute > 59) throw new Error(`Invalid time value: ${value}`);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function buildAttendanceImportPreview(params: {
  rows: AttendanceImportRawRow[];
  employees: AttendanceImportEmployee[];
  siteId: number;
  siteName?: string;
  fixedSchedule: Array<{ employeeId: number; schedule: string[] }>;
}) {
  const bySn = new Map<string, AttendanceImportEmployee>();
  const byName = new Map<string, AttendanceImportEmployee>();
  for (const employee of params.employees) {
    const sn = normalizeAttendanceImportIdentity(employee.employeeSn);
    if (sn) bySn.set(sn, employee);
    byName.set(normalizeAttendanceImportIdentity(employee.name), employee);
  }

  const fixedByEmployee = new Map(params.fixedSchedule.map((row) => [row.employeeId, row.schedule]));
  const seen = new Set<string>();
  const conflicts: AttendancePreviewConflict[] = [];

  const previewRows: AttendancePreviewRow[] = params.rows.map((raw) => {
    const row = { ...raw, clockIn: normalizeTime(raw.clockIn), clockOut: normalizeTime(raw.clockOut) };
    const snKey = normalizeAttendanceImportIdentity(row.employeeSn);
    const nameKey = normalizeAttendanceImportIdentity(row.employeeName);
    const employee = (snKey ? bySn.get(snKey) : undefined) ?? byName.get(nameKey) ?? null;
    const duplicateKey = `${employee?.id ?? (snKey || nameKey)}:${row.day}`;
    const duplicate = seen.has(duplicateKey);
    seen.add(duplicateKey);
    const crossSite = Boolean(employee?.siteId != null && employee.siteId !== params.siteId);
    const scheduleCode = employee ? fixedByEmployee.get(employee.id)?.[row.day - 1] : undefined;

    if (employee && row.status === "present" && scheduleCode && blockedScheduleCodes.has(scheduleCode)) {
      conflicts.push({
        employeeId: employee.id,
        employeeName: employee.name,
        day: row.day,
        scheduleCode,
        reason: `Attendance overlaps ${scheduleCode} schedule`,
      });
    }

    return {
      ...row,
      employeeId: employee?.id ?? null,
      matchedName: employee?.name ?? "",
      duplicate,
      unmatched: !employee,
      crossSite,
    };
  });

  return {
    previewRows,
    conflicts,
    matchedCount: previewRows.filter((row) => row.employeeId && !row.crossSite && !row.duplicate).length,
    unmatchedCount: previewRows.filter((row) => row.unmatched || row.crossSite || row.duplicate).length,
    cellCount: previewRows.filter((row) => row.employeeId && !row.crossSite && !row.duplicate).length,
    conflictCount: conflicts.length,
  };
}
