import Fuse from "fuse.js";
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
export type AttendanceValidationFlag = "missing-clock-in" | "missing-clock-out" | "late" | "early-out" | "invalid-work-hours" | "low-confidence";
export type AttendanceImportAlias = {
  employeeId: number;
  aliasName?: string | null;
  aliasSn?: string | null;
};
export type AttendancePreviewRow = AttendanceImportRawRow & {
  importRowId?: string;
  employeeId: number | null;
  matchedName: string;
  duplicate: boolean;
  unmatched: boolean;
  crossSite: boolean;
  matchMethod?: "sn" | "name" | "alias" | "fuse" | "none";
  matchScore?: number;
  matchWarning?: string;
  validationFlags?: AttendanceValidationFlag[];
  workMinutes?: number | null;
};
export type AttendanceValidationSummary = Record<"matched" | "skipped" | "conflict" | "duplicate" | "crossSite" | "lowConfidence" | "missingClockIn" | "missingClockOut" | "late" | "earlyOut" | "invalidWorkHours", number>;
export type AttendancePreviewConflict = {
  employeeId: number;
  employeeName: string;
  day: number;
  scheduleCode: string;
  reason: string;
};

const blockedScheduleCodes = new Set(["OFF", "FB", "Sakit", "Libur"]);

export function normalizeAttendanceImportIdentity(value: string | null | undefined) {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (!normalized) return "";
  const compact = normalized.replace(/[^a-z0-9]/g, "");
  return compact || normalized;
}

function normalizeTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!/^\d{1,2}:\d{2}$/.test(trimmed)) throw new Error(`Invalid time value: ${value}`);
  const [hour, minute] = trimmed.split(":").map(Number);
  if (hour > 23 || minute > 59) throw new Error(`Invalid time value: ${value}`);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

type EmployeeMatcher = {
  employee: AttendanceImportEmployee;
  normalizedName: string;
  normalizedSn: string;
  aliasName: string;
  aliasSn: string;
  siteRank: number;
};

function buildEmployeeMatcher(employees: AttendanceImportEmployee[], siteId: number, aliases: AttendanceImportAlias[] = []) {
  const byEmployee = new Map(employees.map((employee) => [employee.id, employee]));
  const matchers = employees.map((employee) => ({
    employee,
    normalizedName: normalizeAttendanceImportIdentity(employee.name),
    normalizedSn: normalizeAttendanceImportIdentity(employee.employeeSn),
    aliasName: "",
    aliasSn: "",
    siteRank: employee.siteId === siteId ? 0 : 1,
  }));
  for (const alias of aliases) {
    const employee = byEmployee.get(alias.employeeId);
    if (!employee) continue;
    matchers.push({
      employee,
      normalizedName: normalizeAttendanceImportIdentity(employee.name),
      normalizedSn: normalizeAttendanceImportIdentity(employee.employeeSn),
      aliasName: normalizeAttendanceImportIdentity(alias.aliasName),
      aliasSn: normalizeAttendanceImportIdentity(alias.aliasSn),
      siteRank: employee.siteId === siteId ? 0 : 1,
    });
  }
  const bySn = new Map(matchers.filter((item) => item.normalizedSn).map((item) => [item.normalizedSn, item.employee]));
  const byName = new Map(matchers.filter((item) => item.normalizedName).map((item) => [item.normalizedName, item.employee]));
  const byAliasSn = new Map(matchers.filter((item) => item.aliasSn).map((item) => [item.aliasSn, item.employee]));
  const byAliasName = new Map(matchers.filter((item) => item.aliasName).map((item) => [item.aliasName, item.employee]));
  const fuse = new Fuse(matchers, { keys: ["normalizedName", "normalizedSn", "aliasName", "aliasSn"], threshold: 0.32, ignoreLocation: true, minMatchCharLength: 3, includeScore: true });
  return { bySn, byName, byAliasSn, byAliasName, fuse };
}

function matchEmployee(input: { snKey: string; nameKey: string }, matcher: ReturnType<typeof buildEmployeeMatcher>) {
  if (input.snKey && matcher.bySn.has(input.snKey)) return { employee: matcher.bySn.get(input.snKey)!, matchMethod: "sn" as const, matchScore: 0 };
  if (input.nameKey && matcher.byName.has(input.nameKey)) return { employee: matcher.byName.get(input.nameKey)!, matchMethod: "name" as const, matchScore: 0 };
  if (input.snKey && matcher.byAliasSn.has(input.snKey)) return { employee: matcher.byAliasSn.get(input.snKey)!, matchMethod: "alias" as const, matchScore: 0 };
  if (input.nameKey && matcher.byAliasName.has(input.nameKey)) return { employee: matcher.byAliasName.get(input.nameKey)!, matchMethod: "alias" as const, matchScore: 0 };
  const query = [input.snKey, input.nameKey].filter(Boolean).join(" ");
  if (!query) return { employee: null, matchMethod: "none" as const, matchScore: undefined };
  const result = matcher.fuse.search(query).sort((left, right) => (left.score ?? 1) - (right.score ?? 1) || left.item.siteRank - right.item.siteRank)[0];
  if (!result || (result.score ?? 1) > 0.32) return { employee: null, matchMethod: "none" as const, matchScore: result?.score };
  return { employee: result.item.employee, matchMethod: "fuse" as const, matchScore: result.score ?? 0 };
}

function minutesFromTime(value: string) {
  if (!value) return null;
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function buildValidationFlags(row: { status: string; clockIn: string; clockOut: string }, match: { matchMethod: string; matchScore?: number }, workingHours: { start: string; end: string }) {
  const flags: AttendanceValidationFlag[] = [];
  const start = minutesFromTime(row.clockIn);
  const end = minutesFromTime(row.clockOut);
  const normalStart = minutesFromTime(workingHours.start) ?? 480;
  const normalEnd = minutesFromTime(workingHours.end) ?? 1020;
  let workMinutes: number | null = null;

  if (row.status === "present" && !row.clockIn) flags.push("missing-clock-in");
  if (row.status === "present" && !row.clockOut) flags.push("missing-clock-out");
  if (start != null && end != null) {
    workMinutes = end >= start ? end - start : end + 1440 - start;
    if (workMinutes < 60 || workMinutes > 18 * 60) flags.push("invalid-work-hours");
    if (start > normalStart + 15) flags.push("late");
    if (end < normalEnd - 15) flags.push("early-out");
  }
  if (match.matchMethod === "fuse" && (match.matchScore ?? 1) > 0.2) flags.push("low-confidence");

  return { flags, workMinutes };
}

function emptyValidationSummary(): AttendanceValidationSummary {
  return { matched: 0, skipped: 0, conflict: 0, duplicate: 0, crossSite: 0, lowConfidence: 0, missingClockIn: 0, missingClockOut: 0, late: 0, earlyOut: 0, invalidWorkHours: 0 };
}

export function buildAttendanceImportPreview(params: {
  rows: AttendanceImportRawRow[];
  employees: AttendanceImportEmployee[];
  aliases?: AttendanceImportAlias[];
  siteId: number;
  siteName?: string;
  fixedSchedule: Array<{ employeeId: number; schedule: string[] }>;
  workingHours?: { start: string; end: string };
}) {
  const matcher = buildEmployeeMatcher(params.employees, params.siteId, params.aliases);
  const fixedByEmployee = new Map(params.fixedSchedule.map((row) => [row.employeeId, row.schedule]));
  const seen = new Set<string>();
  const conflicts: AttendancePreviewConflict[] = [];
  const validationSummary = emptyValidationSummary();
  const workingHours = params.workingHours ?? { start: "08:00", end: "17:00" };

  const previewRows: AttendancePreviewRow[] = params.rows.map((raw, index) => {
    const row = { ...raw, clockIn: normalizeTime(raw.clockIn), clockOut: normalizeTime(raw.clockOut) };
    const snKey = normalizeAttendanceImportIdentity(row.employeeSn);
    const nameKey = normalizeAttendanceImportIdentity(row.employeeName);
    const match = matchEmployee({ snKey, nameKey }, matcher);
    const employee = match.employee;
    const duplicateKey = `${employee?.id ?? (snKey || nameKey)}:${row.day}`;
    const duplicate = seen.has(duplicateKey);
    seen.add(duplicateKey);
    const crossSite = Boolean(employee?.siteId != null && employee.siteId !== params.siteId);
    const scheduleCode = employee ? fixedByEmployee.get(employee.id)?.[row.day - 1] : undefined;
    const validation = buildValidationFlags(row, match, workingHours);

    if (employee && row.status === "present" && scheduleCode && blockedScheduleCodes.has(scheduleCode)) {
      conflicts.push({
        employeeId: employee.id,
        employeeName: employee.name,
        day: row.day,
        scheduleCode,
        reason: `Attendance overlaps ${scheduleCode} schedule`,
      });
    }

    if (employee && !crossSite && !duplicate) validationSummary.matched += 1;
    if (!employee || crossSite || duplicate) validationSummary.skipped += 1;
    if (duplicate) validationSummary.duplicate += 1;
    if (crossSite) validationSummary.crossSite += 1;
    if (validation.flags.includes("low-confidence")) validationSummary.lowConfidence += 1;
    if (validation.flags.includes("missing-clock-in")) validationSummary.missingClockIn += 1;
    if (validation.flags.includes("missing-clock-out")) validationSummary.missingClockOut += 1;
    if (validation.flags.includes("late")) validationSummary.late += 1;
    if (validation.flags.includes("early-out")) validationSummary.earlyOut += 1;
    if (validation.flags.includes("invalid-work-hours")) validationSummary.invalidWorkHours += 1;

    return {
      ...row,
      importRowId: `${index + 1}`,
      employeeId: employee?.id ?? null,
      matchedName: employee?.name ?? "",
      duplicate,
      unmatched: !employee,
      crossSite,
      matchMethod: match.matchMethod,
      matchScore: match.matchScore,
      matchWarning: validation.flags.includes("low-confidence") ? "Low confidence fuzzy match" : undefined,
      validationFlags: validation.flags,
      workMinutes: validation.workMinutes,
    };
  });

  validationSummary.conflict = conflicts.length;

  return {
    previewRows,
    conflicts,
    validationSummary,
    matchedCount: previewRows.filter((row) => row.employeeId && !row.crossSite && !row.duplicate).length,
    unmatchedCount: previewRows.filter((row) => row.unmatched || row.crossSite || row.duplicate).length,
    cellCount: previewRows.filter((row) => row.employeeId && !row.crossSite && !row.duplicate).length,
    conflictCount: conflicts.length,
  };
}
