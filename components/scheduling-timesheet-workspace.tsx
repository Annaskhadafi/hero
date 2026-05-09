"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { CalendarDays, Calculator, Check, Clock3, Download, RefreshCw, Save, Settings2, Upload, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { applyAttendanceImportPreviewAction, createAttendanceImportPreviewAction, discardAttendanceImportPreviewAction, finalizeSchedulingPeriodAction, reopenSchedulingPeriodAction, saveAttendanceRealOverridesAction, saveSchedulingConfigAction, saveSchedulingTimesheetPlanAction, saveTimesheetFieldBreakPlansAction } from "@/app/dashboard/admin-actions";
import { AttendanceRealBulkToolbar } from "@/components/timesheet/attendance-real-tab";
import { AttendanceImportPreviewDialog } from "@/components/timesheet/attendance-import-preview-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { attendanceStatusLabel, calculateAttendanceOvertime, normalizeAttendanceStatus, type AttendanceCellStatus } from "@/lib/timesheet/attendance-real";
import type { AttendancePreviewConflict, AttendancePreviewRow } from "@/lib/timesheet/attendance-import";

type EmployeeOption = {
  id: number;
  name: string;
  email: string;
  role: string;
  section?: string | null;
  siteId: number | null;
  locationName?: string | null;
};

type SiteOption = {
  id: number;
  name: string;
  customerName: string;
};

type SavedScheduleRow = {
  employeeId: number;
  schedule: string[];
};

type SavedSchedulingPlan = {
  siteId: number;
  period: string;
  siteScheduleType: string;
  draftSchedule: SavedScheduleRow[];
  fixedSchedule: SavedScheduleRow[];
  employeeProfiles: EmployeeScheduleProfile[];
  fieldBreakConfig: { workWeeks: number; breakWeeks: number } | null;
  updatedAt: string;
};

type EmployeeScheduleProfile = {
  employeeId: number;
  section: string;
  positionOnSite: string;
  kimperLv: boolean;
  kimperTh: boolean;
};

type ScheduleCode = "IN" | "DS" | "NS" | "OFF" | "FB" | "Libur" | "Sakit" | "Emergency";
type SiteScheduleType = "shift" | "office";
type SiteRosterType = "5:2" | "6:1" | "vale";
type SiteMsaType = "staff-nonstaff" | "same-all" | "none";
type SiteMealsType = "field-break" | "workday" | "none";
type SiteOvertimeType = "five-hour" | "roster" | "none";

type SiteSchedulingConfig = {
  scheduleType: SiteScheduleType;
  rosterType: SiteRosterType;
  msaType: SiteMsaType;
  mealsType: SiteMealsType;
  overtimeType: SiteOvertimeType;
};

type SavedFieldBreakPlan = {
  siteId: number;
  period: string;
  employeeId: number;
  employeeName: string;
  sectionName: string;
  rosterSection: string;
  onSiteDate: string;
  dayCount: number;
  fieldBreakDate: string;
  updatedAt: string;
};

type AttendanceRealRecord = {
  employeeId: number;
  siteId: number;
  eventType: string;
  eventTime: string;
  status: string;
  locationNote: string;
  photoUrl?: string | null;
  latitude?: string | null;
  longitude?: string | null;
};

type ManualAttendanceCell = {
  status: AttendanceCellStatus;
  clockIn: string;
  clockOut: string;
  note: string;
  source?: "attendance" | "manual" | "excel";
};

type SavedAttendanceOverride = {
  siteId: number;
  period: string;
  employeeId: number;
  day: number;
  status: string;
  clockIn: string;
  clockOut: string;
  note: string;
  source?: string;
  updatedAt: string;
};

type AllowanceVariable = { project: string; msaStaff: number; msaNonStaff: number; mealsStaff: number; mealsNonStaff: number };
type OvertimeVariable = { roster: SiteRosterType; dayType: "work" | "off"; totalHours: number; overtimeHours: number };

type BackupAssignment = {
  id: string;
  employeeName: string;
  backupName: string;
  type: "Tukar Libur" | "Field Break";
  dateRange: string;
};

type FieldBreakConfig = {
  siteId: string;
  workWeeks: number;
  breakWeeks: number;
};

type FieldBreakDraft = {
  employeeId: number;
  onSiteDate: string;
  dayCount: number;
};

const sectionOptions = ["Service Operation", "Repair Retread", "Crew Office"];
const employmentPositionLabels = ["permanent", "contract", "kontrak", "permanen", "staff", "non staff", "non-staff", "outsource"];
const defaultPositionLabels = ["REPAIRMAN", "TYREMAN", "Operation"];
const rosterSectionStyles: Record<string, { title: string; head: string; day: string; total: string }> = {
  "Service Operation": { title: "ROSTER CREW SERVICEMAN", head: "bg-sky-50 text-sky-950", day: "bg-sky-100/50 text-sky-950", total: "bg-slate-50 text-slate-900" },
  "Repair Retread": { title: "ROSTER CREW REPAIRMAN", head: "bg-emerald-50 text-emerald-950", day: "bg-emerald-100/50 text-emerald-950", total: "bg-slate-50 text-slate-900" },
  "Crew Office": { title: "ROSTER CREW OFFICE", head: "bg-orange-50 text-orange-950", day: "bg-orange-100/50 text-orange-950", total: "bg-slate-50 text-slate-900" },
};

const codeCycle: ScheduleCode[] = ["IN", "DS", "NS", "OFF", "FB", "Libur", "Sakit", "Emergency"];
const defaultSiteConfig: SiteSchedulingConfig = {
  scheduleType: "office",
  rosterType: "5:2",
  msaType: "staff-nonstaff",
  mealsType: "field-break",
  overtimeType: "five-hour",
};

const defaultAllowanceVariables: AllowanceVariable[] = [
  { project: "AMM MIFA", msaStaff: 45000, msaNonStaff: 35000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: "AMM Tabang", msaStaff: 55000, msaNonStaff: 40000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: "BSI Banyuwangi", msaStaff: 0, msaNonStaff: 30000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: "CDE Bengkulu", msaStaff: 45000, msaNonStaff: 35000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: "CK BIB", msaStaff: 45000, msaNonStaff: 35000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: "CK BMB", msaStaff: 40000, msaNonStaff: 30000, mealsStaff: 50000, mealsNonStaff: 50000 },
  { project: "CK KIM", msaStaff: 45000, msaNonStaff: 35000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: "CK MHU", msaStaff: 40000, msaNonStaff: 30000, mealsStaff: 50000, mealsNonStaff: 50000 },
  { project: "CK MIFA", msaStaff: 45000, msaNonStaff: 35000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: "CK NCN", msaStaff: 45000, msaNonStaff: 35000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: "KPUC Malinau", msaStaff: 0, msaNonStaff: 35000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: "MTN Berau", msaStaff: 0, msaNonStaff: 35000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: "MTN ME", msaStaff: 0, msaNonStaff: 30000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: "PPA BIB", msaStaff: 45000, msaNonStaff: 30000, mealsStaff: 30000, mealsNonStaff: 30000 },
  { project: "PPA Tanjung Enim", msaStaff: 0, msaNonStaff: 30000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: "PKA Musi Rawas", msaStaff: 0, msaNonStaff: 30000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: "Sangatta", msaStaff: 40000, msaNonStaff: 30000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: "Sebamban", msaStaff: 40000, msaNonStaff: 0, mealsStaff: 60000, mealsNonStaff: 0 },
  { project: "Tanjung Adaro", msaStaff: 40000, msaNonStaff: 30000, mealsStaff: 60000, mealsNonStaff: 50000 },
  { project: "TU Batu Hijau", msaStaff: 0, msaNonStaff: 50000, mealsStaff: 0, mealsNonStaff: 35000 },
  { project: "TU Gresik", msaStaff: 0, msaNonStaff: 60000, mealsStaff: 0, mealsNonStaff: 30000 },
  { project: "Vale Sorowako", msaStaff: 60000, msaNonStaff: 60000, mealsStaff: 0, mealsNonStaff: 30000 },
];

const defaultOvertimeVariables: OvertimeVariable[] = [
  ...Array.from({ length: 10 }, (_, index) => ({ roster: "5:2" as const, dayType: "work" as const, totalHours: index + 1, overtimeHours: index * 2 + 1.5 })),
  ...Array.from({ length: 16 }, (_, index) => ({ roster: "5:2" as const, dayType: "off" as const, totalHours: index + 1, overtimeHours: index < 8 ? (index + 1) * 2 : 19 + (index - 8) * 4 })),
  ...Array.from({ length: 10 }, (_, index) => ({ roster: "6:1" as const, dayType: "work" as const, totalHours: index + 1, overtimeHours: index * 2 + 1.5 })),
  ...Array.from({ length: 12 }, (_, index) => ({ roster: "6:1" as const, dayType: "off" as const, totalHours: index + 1, overtimeHours: index < 8 ? (index + 1) * 2 : 17 + (index - 8) * 4 })),
  ...Array.from({ length: 20 }, (_, index) => ({ roster: "vale" as const, dayType: "work" as const, totalHours: (index + 1) / 2, overtimeHours: index + 0.75 })),
  ...Array.from({ length: 32 }, (_, index) => ({ roster: "vale" as const, dayType: "off" as const, totalHours: (index + 1) / 2, overtimeHours: index < 16 ? (index + 1) / 2 * 2 : 17.5 + (index - 16) * 2 })),
];

const overtimeRules = [
  { roster: "Rooster Kerja 5 : 2", work: "Hari masuk dihitung 5 jam dasar", off: "Libur/OFF tidak dihitung jam dasar" },
  { roster: "Rooster Kerja 6 : 1", work: "Hari masuk dihitung 5 jam dasar", off: "Backup otomatis masuk list pengganti" },
  { roster: "Rooster Kerja Vale Sorowako", work: "Status cell sama: ?, OFF, FB, Sakit, Emergency, Libur", off: "Nilai overtime siap disambung ke setting variabel" },
];

function normalizeLocation(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function normalizeRosterSection(value?: string | null) {
  const normalized = normalizeLocation(value ?? "");
  if (normalized.includes("repair") || normalized.includes("retread")) return "Repair Retread";
  if (normalized.includes("technical")) return "Crew Office";
  if (normalized.includes("tyreman") || normalized.includes("tyre")) return "Service Operation";
  if (normalized.includes("serviceoperation") || normalized.includes("serviceman") || normalized.includes("servicemvc") || normalized.includes("serviceoperationmvc") || normalized.includes("serviceoperationother") || normalized.includes("serviceoperationothers")) return "Service Operation";

  return "Crew Office";
}

function isEmploymentPositionLabel(value?: string | null) {
  const normalized = normalizeLocation(value ?? "");
  if (!normalized) return true;

  return employmentPositionLabels.some((label) => normalized.includes(normalizeLocation(label)));
}

function resolvePositionOnSite(position?: string | null, fallback?: string | null) {
  if (!isEmploymentPositionLabel(position)) return position ?? "";
  if (!isEmploymentPositionLabel(fallback)) return fallback ?? "";

  return "Jabatan belum diisi";
}

function defaultPositionOnSite(section?: string | null) {
  const normalized = normalizeLocation(section ?? "");
  if (normalized.includes("repair") || normalized.includes("retread")) return "REPAIRMAN";
  if (normalized.includes("service")) return "TYREMAN";
  if (normalized.includes("technical")) return "Operation";

  return "Operation";
}

function isDefaultPositionOnSite(value?: string | null) {
  return defaultPositionLabels.some((label) => normalizeLocation(label) === normalizeLocation(value ?? ""));
}

function positionOptionsForSection(section?: string | null) {
  return Array.from(new Set([defaultPositionOnSite(section), "Leader", "Sub Leader"]));
}

function isLeadershipPosition(value?: string | null) {
  const normalized = normalizeLocation(value ?? "");
  return normalized === "leader" || normalized === "subleader";
}

function daysInMonth(period: string) {
  const [year, month] = period.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function isWeekend(period: string, day: number) {
  const [year, month] = period.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.getDay() === 0 || date.getDay() === 6;
}

function buildSchedule(employeeIndex: number, day: number, scheduleType: SiteScheduleType, period: string): ScheduleCode {
  if (scheduleType === "office") return isWeekend(period, day) ? "OFF" : "IN";
  if ((day + employeeIndex) % 9 === 0) return "OFF";
  if (day >= 18 && day <= 28 && employeeIndex % 5 === 1) return "FB";
  return (day + employeeIndex) % 2 === 0 ? "DS" : "NS";
}

function buildFieldBreakSchedule(day: number, workWeeks: number, breakWeeks: number): ScheduleCode | null {
  const safeWorkWeeks = Math.max(1, workWeeks);
  const safeBreakWeeks = Math.max(1, breakWeeks);
  const cycleDays = (safeWorkWeeks + safeBreakWeeks) * 7;
  const cycleDay = (day - 1) % cycleDays;

  return cycleDay >= safeWorkWeeks * 7 ? "FB" : null;
}

function codeClass(code: ScheduleCode) {
  if (code === "IN") return "bg-white text-emerald-700 hover:bg-emerald-50 ring-1 ring-inset ring-emerald-200/50";
  if (code === "DS") return "bg-sky-100 text-sky-800 hover:bg-sky-200";
  if (code === "NS") return "bg-indigo-600 text-white hover:bg-indigo-700";
  if (code === "OFF") return "bg-rose-100 text-rose-700 hover:bg-rose-200";
  if (code === "FB") return "bg-amber-100 text-amber-900 hover:bg-amber-200";
  if (code === "Libur") return "bg-slate-100 text-slate-700";
  if (code === "Sakit") return "bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200";
  return "bg-pink-100 text-pink-800 hover:bg-pink-200";
}

function codeLabel(code: ScheduleCode) {
  return code === "IN" ? <Check className="mx-auto size-4" /> : code;
}

function weekdayLabel(period: string, day: number) {
  const [year, month] = period.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(year, month - 1, day));
}

function hoursFromCode(code: ScheduleCode) {
  return code === "IN" || code === "DS" || code === "NS" || code === "FB" ? 5 : 0;
}

function rosterSectionLabel(section: string) {
  if (section === "Service Operation") return "Roster Serviceman";
  if (section === "Repair Retread") return "Crew Repair";
  return "Crew Office";
}

function calculateOvertimeFromVariables(schedule: ScheduleCode[], period: string, rosterType: SiteRosterType, overtimeVariables: OvertimeVariable[]) {
  return schedule.reduce((sum, code, index) => {
    const totalHours = hoursFromCode(code);
    if (totalHours <= 0) return sum;

    const dayType = isWeekend(period, index + 1) ? "off" : "work";
    const variable = overtimeVariables.find((item) => item.roster === rosterType && item.dayType === dayType && item.totalHours === totalHours);

    return sum + (variable?.overtimeHours ?? Math.max(0, totalHours - 5));
  }, 0);
}

function activeShiftCode(code?: ScheduleCode) {
  return code === "DS" || code === "NS" || code === "IN" ? code : "IN";
}

function dayFromDate(value: string, period: string) {
  if (!value || !value.startsWith(period)) return null;
  return Number(value.slice(-2));
}

function dateRangeDays(from: string, to: string, period: string, dayCount: number) {
  const startDay = dayFromDate(from, period);
  const endDay = dayFromDate(to || from, period);
  if (!startDay || !endDay) return [];
  const start = Math.max(1, Math.min(startDay, endDay));
  const end = Math.min(dayCount, Math.max(startDay, endDay));
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function money(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function addDays(value: string, days: number) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatShortDate(value: string) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "2-digit" }).format(date).replace(/ /g, "-");
}

function attendanceKey(employeeId: number, day: number) {
  return `${employeeId}-${day}`;
}

function attendanceCellClass(status: AttendanceCellStatus) {
  if (status === "present") return "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-200";
  if (status === "sick") return "bg-amber-100 text-amber-950 ring-1 ring-amber-200";
  if (status === "leave") return "bg-sky-100 text-sky-950 ring-1 ring-sky-200";
  if (status === "absent") return "bg-rose-100 text-rose-950 ring-1 ring-rose-200";
  return "bg-red-100 text-red-950 ring-1 ring-red-200";
}

function timeFromIso(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
}

export function SchedulingTimesheetWorkspace({ employees, sites, savedPlans = [], fieldBreakPlans = [], attendanceRecords = [], attendanceOverrides = [], schedulingConfigs = [], schedulingStatuses = [] }: { employees: EmployeeOption[]; sites: SiteOption[]; savedPlans?: SavedSchedulingPlan[]; fieldBreakPlans?: SavedFieldBreakPlan[]; attendanceRecords?: AttendanceRealRecord[]; attendanceOverrides?: SavedAttendanceOverride[]; schedulingConfigs?: Array<{ siteId: number; scheduleType?: string; rosterType?: string; msaType?: string; mealsType?: string; overtimeType?: string; allowanceVariables?: unknown; overtimeVariables?: unknown }>; schedulingStatuses?: Array<{ siteId: number; period: string; scheduleStatus: string; attendanceStatus: string; importStatus: string; conflictCount: number; lastSavedAt?: string | null; lastImportedAt?: string | null; finalizedAt?: string | null }>; importPreviews?: unknown[] }) {
  const [period, setPeriod] = useState("2026-05");
  const [siteId, setSiteId] = useState(String(sites[0]?.id ?? "all"));
  const [roster, setRoster] = useState("5:2");
  const [selectedCell, setSelectedCell] = useState<{ employeeId: number; day: number } | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, ScheduleCode>>({});
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [fieldBreakFrom, setFieldBreakFrom] = useState("");
  const [fieldBreakTo, setFieldBreakTo] = useState("");
  const [backupEmployeeId, setBackupEmployeeId] = useState("");
  const [backupAssignments, setBackupAssignments] = useState<BackupAssignment[]>([]);
  const [employeeProfiles, setEmployeeProfiles] = useState<Record<number, EmployeeScheduleProfile>>({});
  const [profileSection, setProfileSection] = useState("Crew Office");
  const [profilePositionOnSite, setProfilePositionOnSite] = useState("");
  const [profileKimperLv, setProfileKimperLv] = useState(false);
  const [profileKimperTh, setProfileKimperTh] = useState(false);
  const [permanentBase, setPermanentBase] = useState<Record<string, ScheduleCode>>({});
  const [permanentOverrides, setPermanentOverrides] = useState<Record<string, ScheduleCode>>({});
  const [scheduleSavedAt, setScheduleSavedAt] = useState<string | null>(null);
  const [fieldBreakConfigs, setFieldBreakConfigs] = useState<Record<string, FieldBreakConfig>>({});
  const [fieldBreakSiteId, setFieldBreakSiteId] = useState(String(sites[0]?.id ?? ""));
  const [fieldBreakWorkWeeks, setFieldBreakWorkWeeks] = useState(4);
  const [fieldBreakRestWeeks, setFieldBreakRestWeeks] = useState(2);
  const [fieldBreakDrafts, setFieldBreakDrafts] = useState<Record<number, FieldBreakDraft>>({});
  const [isSavingFieldBreak, startSavingFieldBreak] = useTransition();
  const [siteScheduleTypes, setSiteScheduleTypes] = useState<Record<string, SiteScheduleType>>({});
  const [siteConfigs, setSiteConfigs] = useState<Record<string, SiteSchedulingConfig>>({});
  const [allowanceVariables, setAllowanceVariables] = useState<AllowanceVariable[]>(defaultAllowanceVariables);
  const [overtimeVariables, setOvertimeVariables] = useState<OvertimeVariable[]>(defaultOvertimeVariables);
  const [manualAttendance, setManualAttendance] = useState<Record<string, ManualAttendanceCell>>({});
  const [selectedAttendanceCell, setSelectedAttendanceCell] = useState<{ employeeId: number; day: number } | null>(null);
  const [multiSelectAttendance, setMultiSelectAttendance] = useState(false);
  const [selectedAttendanceKeys, setSelectedAttendanceKeys] = useState<string[]>([]);
  const [attendanceImportPreview, setAttendanceImportPreview] = useState<{ previewId: number; matchedCount: number; unmatchedCount: number; cellCount: number; conflictCount: number; previewRows: AttendancePreviewRow[]; conflicts: AttendancePreviewConflict[] } | null>(null);
  const [attendanceImportMode, setAttendanceImportMode] = useState<"skip-conflicts" | "overwrite-conflicts">("skip-conflicts");
  const [showConflictsOnly, setShowConflictsOnly] = useState(false);
  const [attendanceSavedAt, setAttendanceSavedAt] = useState<string | null>(null);
  const [isAttendanceDirty, setIsAttendanceDirty] = useState(false);
  const [isSavingAttendance, startSavingAttendance] = useTransition();
  const [isSavingSchedule, startSavingSchedule] = useTransition();
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [finalizeReason, setFinalizeReason] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [discardImportDialogOpen, setDiscardImportDialogOpen] = useState(false);
  const [overwriteImportDialogOpen, setOverwriteImportDialogOpen] = useState(false);
  const dayCount = daysInMonth(period);
  const days = Array.from({ length: dayCount }, (_, index) => index + 1);
  const site = sites.find((item) => String(item.id) === siteId);
  const siteConfig = siteConfigs[siteId] ?? defaultSiteConfig;
  const siteNameOptions = sites.map((item) => item.name).filter(Boolean);
  const rate = allowanceVariables.find((item) => normalizeLocation(item.project) === normalizeLocation(site?.name ?? "")) ?? defaultAllowanceVariables[0];
  const savedPlan = savedPlans.find((plan) => String(plan.siteId) === siteId && plan.period === period);
  const currentStatus = schedulingStatuses.find((status) => String(status.siteId) === siteId && status.period === period) ?? null;
  const isFinalized = Boolean(currentStatus?.finalizedAt || currentStatus?.scheduleStatus === "finalized" || currentStatus?.attendanceStatus === "finalized");
  function guardOpenPeriod(actionLabel: string) {
    if (!isFinalized) return true;
    toast.error(`${actionLabel} blocked`, { description: "Period finalized. Reopen before editing." });
    return false;
  }
  const attendanceByCell = useMemo(() => {
    const map = new Map<string, { clockIn?: AttendanceRealRecord; clockOut?: AttendanceRealRecord; records: AttendanceRealRecord[] }>();

    for (const record of attendanceRecords) {
      if (String(record.siteId) !== siteId) continue;
      if (!record.eventTime.startsWith(period)) continue;
      const day = dayFromDate(record.eventTime.slice(0, 10), period);
      if (!day) continue;
      const key = attendanceKey(record.employeeId, day);
      const existing = map.get(key) ?? { records: [] };
      existing.records.push(record);
      const eventType = normalizeLocation(record.eventType);
      if (eventType.includes("out") || eventType.includes("pulang") || eventType.includes("checkout")) existing.clockOut = record;
      else existing.clockIn = record;
      map.set(key, existing);
    }

    return map;
  }, [attendanceRecords, period, siteId]);

  useEffect(() => {
    const firstConfig = schedulingConfigs.find((config) => String(config.siteId) === siteId);
    setAllowanceVariables(Array.isArray(firstConfig?.allowanceVariables) && firstConfig.allowanceVariables.length ? firstConfig.allowanceVariables as AllowanceVariable[] : defaultAllowanceVariables);
    setOvertimeVariables(Array.isArray(firstConfig?.overtimeVariables) && firstConfig.overtimeVariables.length ? firstConfig.overtimeVariables as OvertimeVariable[] : defaultOvertimeVariables);
  }, [schedulingConfigs, siteId]);

  useEffect(() => {
    const scoped = attendanceOverrides.filter((override) => String(override.siteId) === siteId && override.period === period);
    setManualAttendance(Object.fromEntries(scoped.map((override) => [attendanceKey(override.employeeId, override.day), {
      status: normalizeAttendanceStatus(override.status),
      clockIn: override.clockIn,
      clockOut: override.clockOut,
      note: override.note,
      source: override.source === "excel" || override.source === "attendance" ? override.source : "manual",
    }])));
    setAttendanceSavedAt(scoped.reduce<string | null>((latest, override) => latest && latest > override.updatedAt ? latest : override.updatedAt, null));
    setIsAttendanceDirty(false);
    setSelectedAttendanceKeys([]);
  }, [attendanceOverrides, period, siteId]);

  useEffect(() => {
    if (siteId === "all") return;

    const savedConfig = schedulingConfigs.find((config) => String(config.siteId) === siteId);
    const config = savedConfig ? { scheduleType: savedConfig.scheduleType as SiteScheduleType, rosterType: savedConfig.rosterType as SiteRosterType, msaType: savedConfig.msaType as SiteMsaType, mealsType: savedConfig.mealsType as SiteMealsType, overtimeType: savedConfig.overtimeType as SiteOvertimeType } : defaultSiteConfig;
    setSiteConfigs((current) => ({ ...current, [siteId]: config }));
    setRoster(config.rosterType);
    setSiteScheduleTypes((current) => ({ ...current, [siteId]: config.scheduleType }));
  }, [siteId, schedulingConfigs]);

  useEffect(() => {
    if (!savedPlan) return;

    const nextDraftOverrides: Record<string, ScheduleCode> = {};
    const nextPermanentBase: Record<string, ScheduleCode> = {};

    const hasFieldBreakSetting = fieldBreakPlans.some((plan) => String(plan.siteId) === siteId && plan.period === period);

    savedPlan.draftSchedule.forEach((row) => row.schedule.forEach((code, index) => {
      if (code === "FB" && !hasFieldBreakSetting) return;
      if (codeCycle.includes(code as ScheduleCode)) nextDraftOverrides[`${row.employeeId}-${index + 1}`] = code as ScheduleCode;
    }));
    savedPlan.fixedSchedule.forEach((row) => row.schedule.forEach((code, index) => {
      if (code === "FB" && !hasFieldBreakSetting) return;
      if (codeCycle.includes(code as ScheduleCode)) nextPermanentBase[`${row.employeeId}-${index + 1}`] = code as ScheduleCode;
    }));

    setOverrides(nextDraftOverrides);
    setPermanentBase(nextPermanentBase);
    setPermanentOverrides({});
    setEmployeeProfiles(Object.fromEntries((savedPlan.employeeProfiles ?? []).map((profile) => {
      const employee = employees.find((item) => item.id === profile.employeeId);
      const detectedSection = normalizeRosterSection(employee?.section || employee?.role);
      const section = detectedSection || profile.section;

      return [profile.employeeId, { ...profile, section }];
    })));
    setIsGenerated(true);
    setScheduleSavedAt(new Date(savedPlan.updatedAt).toLocaleString("id-ID"));
    setSiteScheduleTypes((current) => ({ ...current, [siteId]: savedPlan.siteScheduleType === "shift" ? "shift" : "office" }));
  }, [fieldBreakPlans, period, savedPlan, siteId]);

  const visibleEmployees = useMemo(() => {
    if (!isGenerated) return [];
    if (siteId === "all") return [];

    const selectedSite = sites.find((item) => String(item.id) === siteId);
    const siteTerms = [selectedSite?.name, selectedSite?.customerName]
      .filter(Boolean)
      .map((value) => normalizeLocation(value ?? ""));

    const filtered = employees.filter((employee) => {
      if (String(employee.siteId) === siteId) return true;
      const employeeLocation = normalizeLocation(employee.locationName ?? "");
      return siteTerms.some((term) => term && (employeeLocation.includes(term) || term.includes(employeeLocation)));
    });

    return filtered.length > 0 ? filtered : employees;
  }, [employees, isGenerated, siteId, sites]);

  const rosterSectionByEmployee = new Map(visibleEmployees.map((employee) => {
    const profile = employeeProfiles[employee.id];
    return [employee.id, normalizeRosterSection(profile?.section || employee.section || employee.role)];
  }));
  const rosterSectionCounts = visibleEmployees.reduce<Record<string, number>>((counts, employee) => {
    const rosterSection = rosterSectionByEmployee.get(employee.id) ?? "Crew Office";
    counts[rosterSection] = (counts[rosterSection] ?? 0) + 1;
    return counts;
  }, {});

  const rows = visibleEmployees.map((employee, employeeIndex) => {
    const employeeRosterSection = rosterSectionByEmployee.get(employee.id) ?? "Crew Office";
    const forceDayShift = (employeeRosterSection === "Service Operation" || employeeRosterSection === "Repair Retread") && (rosterSectionCounts[employeeRosterSection] ?? 0) < 3;
    const schedule = days.map((day) => {
      const fieldBreakConfig = fieldBreakConfigs[String(employee.siteId ?? siteId)];
      const fieldBreakCode = fieldBreakConfig ? buildFieldBreakSchedule(day, fieldBreakConfig.workWeeks, fieldBreakConfig.breakWeeks) : null;
      const scheduleType = siteScheduleTypes[siteId] ?? "office";
      const generatedCode = forceDayShift ? "DS" : buildSchedule(employeeIndex, day, scheduleType, period);
      const code = overrides[`${employee.id}-${day}`] ?? fieldBreakCode ?? generatedCode;

      return code === "FB" && !fieldBreakConfig ? generatedCode : code;
    });
    const workDays = schedule.filter((code) => code === "IN" || code === "DS" || code === "NS" || code === "FB").length;
    const fieldBreakDays = schedule.filter((code) => code === "FB").length;
    const totalHours = schedule.reduce((sum, code) => sum + hoursFromCode(code), 0);
    const staff = /manager|supervisor|lead|staff|admin/i.test(employee.role);
    const msa = siteConfig.msaType === "none" ? 0 : workDays * (siteConfig.msaType === "same-all" ? rate.msaNonStaff : staff ? rate.msaStaff : rate.msaNonStaff);
    const mealsBaseDays = siteConfig.mealsType === "workday" ? workDays : fieldBreakDays;
    const meals = siteConfig.mealsType === "none" ? 0 : mealsBaseDays * (staff ? rate.mealsStaff : rate.mealsNonStaff);
    const overtime = siteConfig.overtimeType === "none" ? 0 : calculateOvertimeFromVariables(schedule, period, siteConfig.rosterType, overtimeVariables);
    const profile = employeeProfiles[employee.id] ?? {
      employeeId: employee.id,
      section: normalizeRosterSection(employee.section || employee.role),
      positionOnSite: defaultPositionOnSite(employee.section || employee.role),
      kimperLv: false,
      kimperTh: false,
    };
    const rosterSection = normalizeRosterSection(profile.section || employee.section || employee.role);
    const sectionLabel = employee.section || rosterSection;
    const positionOnSite = isLeadershipPosition(profile.positionOnSite) ? profile.positionOnSite : defaultPositionOnSite(sectionLabel);
    return { employee, schedule, workDays, fieldBreakDays, totalHours, staff, msa, meals, overtime, profile: { ...profile, section: rosterSection, positionOnSite }, sectionLabel, rosterSection };
  });

  function renderRosterTable(
    tableRows: typeof rows,
    section: string,
    keyPrefix: string,
    onCellClick: (employeeId: number, day: number) => void,
  ) {
    const sectionRows = tableRows.filter((row) => row.rosterSection === section);
    if (sectionRows.length === 0) return null;

    const styles = rosterSectionStyles[section] ?? rosterSectionStyles["Crew Office"];
    const showOperatorTotals = section === "Service Operation" || section === "Repair Retread";
    const sectionTotals = days.map((day, index) => ({
      day,
      ds: sectionRows.filter((row) => row.schedule[index] === "DS").length,
      ns: sectionRows.filter((row) => row.schedule[index] === "NS").length,
      dayOperator: sectionRows.filter((row) => row.schedule[index] === "DS" && row.profile.kimperLv && row.profile.kimperTh).length,
      nightOperator: sectionRows.filter((row) => row.schedule[index] === "NS" && row.profile.kimperLv && row.profile.kimperTh).length,
      off: sectionRows.filter((row) => row.schedule[index] === "OFF").length,
      manpower: sectionRows.filter((row) => row.schedule[index] === "DS" || row.schedule[index] === "NS" || row.schedule[index] === "IN").length,
    }));

    return (
      <Card key={`${keyPrefix}-${section}`} className="surface-module-card overflow-hidden rounded-[1.2rem] border-0 p-0">
        <div className="overflow-auto">
          <table className="min-w-max border-collapse text-xs">
            <thead>
              <tr className={styles.head}>
                <th colSpan={days.length + 7} className="px-3 py-2 text-left text-base font-bold uppercase tracking-tight">{styles.title} {period}</th>
              </tr>
              <tr className={styles.head}>
                <th className="sticky left-0 z-20 min-w-44 px-3 py-2 text-left">Nama</th>
                <th className="min-w-16 px-3 py-2">LV</th>
                <th className="min-w-16 px-3 py-2">TH</th>
                <th className="min-w-24 px-3 py-2">SN</th>
                <th className="min-w-36 px-3 py-2">Section</th>
                <th className="min-w-36 px-3 py-2">Posisi On Site</th>
                {days.map((day) => <th key={day} className={`min-w-12 border-l border-slate-400 px-2 py-2 ${styles.day}`}><div>{weekdayLabel(period, day)}</div><div className="font-normal">{day}</div></th>)}
                <th className="min-w-20 px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {sectionRows.map((row) => (
                <tr key={`${keyPrefix}-${row.employee.id}`} className="border-b border-slate-200">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 font-semibold"><button className="text-left font-semibold text-slate-900 underline-offset-4 hover:underline" onClick={() => openEmployeeForm(row.employee.id)}>{row.employee.name}</button></td>
                  <td className="px-3 py-2 text-center">{row.profile.kimperLv ? "✓" : ""}</td>
                  <td className="px-3 py-2 text-center">{row.profile.kimperTh ? "✓" : ""}</td>
                  <td className="px-3 py-2 text-center">{row.employee.id}</td>
                  <td className="px-3 py-2 text-center">{row.sectionLabel}</td>
                  <td className="px-3 py-2 text-center font-semibold uppercase">{row.profile.positionOnSite}</td>
                  {row.schedule.map((code, index) => <td key={`${keyPrefix}-${row.employee.id}-${index}`} className="border-l border-slate-200 p-0 text-center"><button className={`h-8 w-full px-2 font-medium ${codeClass(code)}`} onClick={() => onCellClick(row.employee.id, index + 1)}>{codeLabel(code)}</button></td>)}
                  <td className="px-3 py-2 text-center font-semibold">{row.totalHours}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={`border-t-2 border-slate-300 font-semibold ${styles.total}`}>
                <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-left">Dayshift</td>
                <td colSpan={5} className="px-3 py-2 text-center">Day Shift</td>
                {sectionTotals.map((item) => <td key={`${keyPrefix}-${section}-ds-${item.day}`} className="border-l border-slate-200 px-2 py-2 text-center">{item.ds}</td>)}
                <td className="px-3 py-2 text-center">{sectionTotals.reduce((sum, item) => sum + item.ds, 0)}</td>
              </tr>
              <tr className={`border-t border-slate-200 font-semibold ${styles.total}`}>
                <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-left">Nightshift</td>
                <td colSpan={5} className="px-3 py-2 text-center">Night Shift</td>
                {sectionTotals.map((item) => <td key={`${keyPrefix}-${section}-ns-${item.day}`} className="border-l border-slate-200 px-2 py-2 text-center">{item.ns}</td>)}
                <td className="px-3 py-2 text-center">{sectionTotals.reduce((sum, item) => sum + item.ns, 0)}</td>
              </tr>
              {showOperatorTotals ? (
                <tr className="border-t border-slate-300 bg-white font-semibold text-slate-950">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 text-left">Day Operator</td>
                  <td colSpan={5} className="px-3 py-2 text-center">KIMPER LV + TH</td>
                  {sectionTotals.map((item) => <td key={`${keyPrefix}-${section}-day-operator-${item.day}`} className="border-l border-slate-200 px-2 py-2 text-center">{item.dayOperator}</td>)}
                  <td className="px-3 py-2 text-center">{sectionTotals.reduce((sum, item) => sum + item.dayOperator, 0)}</td>
                </tr>
              ) : null}
              {showOperatorTotals ? (
                <tr className="border-t border-slate-300 bg-slate-300 font-semibold text-slate-950">
                  <td className="sticky left-0 z-10 bg-slate-300 px-3 py-2 text-left">Night Operator</td>
                  <td colSpan={5} className="px-3 py-2 text-center">KIMPER LV + TH</td>
                  {sectionTotals.map((item) => <td key={`${keyPrefix}-${section}-night-operator-${item.day}`} className="border-l border-slate-400 px-2 py-2 text-center">{item.nightOperator}</td>)}
                  <td className="px-3 py-2 text-center">{sectionTotals.reduce((sum, item) => sum + item.nightOperator, 0)}</td>
                </tr>
              ) : null}
              <tr className={`border-t border-slate-200 font-semibold text-red-700 ${styles.total}`}>
                <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-left">OFF</td>
                <td colSpan={5} className="px-3 py-2 text-center">OFF</td>
                {sectionTotals.map((item) => <td key={`${keyPrefix}-${section}-off-${item.day}`} className="border-l border-slate-200 px-2 py-2 text-center">{item.off}</td>)}
                <td className="px-3 py-2 text-center">{sectionTotals.reduce((sum, item) => sum + item.off, 0)}</td>
              </tr>
              <tr className="border-t-2 border-slate-400 bg-white font-bold text-slate-950">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 text-left">TOTAL MAN POWER</td>
                <td colSpan={5} className="px-3 py-2 text-center">Aktif</td>
                {sectionTotals.map((item) => <td key={`${keyPrefix}-${section}-mp-${item.day}`} className="border-l border-slate-200 px-2 py-2 text-center">{item.manpower}</td>)}
                <td className="px-3 py-2 text-center">{sectionRows.length}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    );
  }

  const permanentRows = rows.map((row) => ({
    ...row,
    schedule: row.schedule.map((code, index) => {
      const fieldBreakConfig = fieldBreakConfigs[String(row.employee.siteId ?? siteId)];
      const savedCode = permanentOverrides[`${row.employee.id}-${index + 1}`] ?? permanentBase[`${row.employee.id}-${index + 1}`] ?? code;

      return savedCode === "FB" && !fieldBreakConfig ? code : savedCode;
    }),
  })).map((row) => ({
    ...row,
    workDays: row.schedule.filter((code) => code === "IN" || code === "DS" || code === "NS" || code === "FB").length,
    fieldBreakDays: row.schedule.filter((code) => code === "FB").length,
    totalHours: row.schedule.reduce((sum, code) => sum + hoursFromCode(code), 0),
  }));
  const selectedEmployee = visibleEmployees.find((employee) => employee.id === selectedEmployeeId) ?? null;
  const selectedCode = selectedCell ? overrides[`${selectedCell.employeeId}-${selectedCell.day}`] ?? rows.find((row) => row.employee.id === selectedCell.employeeId)?.schedule[selectedCell.day - 1] : undefined;
  const savedFieldBreakByEmployee = new Map(fieldBreakPlans.filter((plan) => String(plan.siteId) === fieldBreakSiteId && plan.period === period).map((plan) => [plan.employeeId, plan]));
  const fieldBreakRows = rows.map((row, index) => {
    const savedPlan = savedFieldBreakByEmployee.get(row.employee.id);
    const draft = fieldBreakDrafts[row.employee.id];
    const onSiteDate = draft?.onSiteDate ?? savedPlan?.onSiteDate ?? addDays(`${period}-01`, index * 7);
    const dayCountValue = draft?.dayCount ?? savedPlan?.dayCount ?? 90;
    const fieldBreakDate = addDays(onSiteDate, dayCountValue);

    return { ...row, onSiteDate, dayCount: dayCountValue, fieldBreakDate, savedAt: savedPlan?.updatedAt ?? null };
  });
  const servicemanKimperCoverage = days.map((day, index) => {
    const serviceRows = rows.filter((row) => row.rosterSection === "Service Operation" && row.profile.kimperLv && row.profile.kimperTh);

    return {
      day,
      hasDayShift: serviceRows.some((row) => row.schedule[index] === "DS"),
      hasNightShift: serviceRows.some((row) => row.schedule[index] === "NS"),
    };
  });
  const missingServicemanKimperDays = servicemanKimperCoverage.filter((item) => !item.hasDayShift || !item.hasNightShift);

  function cycleCell(employeeId: number, day: number) {
    if (!guardOpenPeriod("Edit schedule")) return;
    const key = `${employeeId}-${day}`;
    const current = overrides[key] ?? rows.find((row) => row.employee.id === employeeId)?.schedule[day - 1] ?? "IN";
    const next = codeCycle[(codeCycle.indexOf(current) + 1) % codeCycle.length];
    setOverrides((currentOverrides) => ({ ...currentOverrides, [key]: next }));
    setSelectedCell({ employeeId, day });
  }

  function cyclePermanentCell(employeeId: number, day: number) {
    if (!guardOpenPeriod("Edit fixed schedule")) return;
    const key = `${employeeId}-${day}`;
    const current = permanentOverrides[key] ?? permanentRows.find((row) => row.employee.id === employeeId)?.schedule[day - 1] ?? "IN";
    const next = codeCycle[(codeCycle.indexOf(current) + 1) % codeCycle.length];

    setPermanentOverrides((currentOverrides) => ({ ...currentOverrides, [key]: next }));
  }

  function saveScheduleToPermanent() {
    if (!guardOpenPeriod("Save schedule")) return;
    const nextBase = rows.reduce<Record<string, ScheduleCode>>((base, row) => {
      row.schedule.forEach((code, index) => {
        base[`${row.employee.id}-${index + 1}`] = code;
      });

      return base;
    }, {});

    setPermanentBase(nextBase);
    setPermanentOverrides({});
    setScheduleSavedAt(new Date().toLocaleString("id-ID"));
    persistSchedulePlan(nextBase);
  }

  function savePermanentSchedule() {
    if (!guardOpenPeriod("Save fixed schedule")) return;
    const nextBase = permanentRows.reduce<Record<string, ScheduleCode>>((base, row) => {
      row.schedule.forEach((code, index) => {
        base[`${row.employee.id}-${index + 1}`] = code;
      });

      return base;
    }, {});

    setPermanentBase(nextBase);
    setPermanentOverrides({});
    setScheduleSavedAt(new Date().toLocaleString("id-ID"));
    persistSchedulePlan(nextBase);
  }

  function persistSchedulePlan(nextFixedBase: Record<string, ScheduleCode>) {
    const numericSiteId = Number(siteId);
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0) return;

    const fixedRows = rows.map((row) => ({
      employeeId: row.employee.id,
      schedule: row.schedule.map((code, index) => nextFixedBase[`${row.employee.id}-${index + 1}`] ?? code),
    }));

    startSavingSchedule(async () => {
      await saveSchedulingTimesheetPlanAction({
        siteId: numericSiteId,
        period,
        siteScheduleType: siteScheduleTypes[siteId] ?? "office",
        draftSchedule: rows.map((row) => ({ employeeId: row.employee.id, schedule: row.schedule })),
        fixedSchedule: fixedRows,
        employeeProfiles: rows.map((row) => employeeProfiles[row.employee.id] ?? row.profile),
        fieldBreakConfig: fieldBreakConfigs[siteId]
          ? { workWeeks: fieldBreakConfigs[siteId].workWeeks, breakWeeks: fieldBreakConfigs[siteId].breakWeeks }
          : null,
      });
    });
  }

  function saveFieldBreakConfig() {
    if (!fieldBreakSiteId) return;

    setFieldBreakConfigs((currentConfigs) => ({
      ...currentConfigs,
      [fieldBreakSiteId]: {
        siteId: fieldBreakSiteId,
        workWeeks: fieldBreakWorkWeeks,
        breakWeeks: fieldBreakRestWeeks,
      },
    }));
    setOverrides({});
    setSelectedCell(null);
  }

  function updateFieldBreakDraft(employeeId: number, key: keyof FieldBreakDraft, value: string | number) {
    if (!guardOpenPeriod("Edit field break")) return;
    setFieldBreakDrafts((current) => {
      const existing = current[employeeId] ?? { employeeId, onSiteDate: `${period}-01`, dayCount: 90 };

      return {
        ...current,
        [employeeId]: {
          ...existing,
          [key]: key === "dayCount" ? Number(value || 1) : String(value),
        },
      };
    });
  }

  function syncFieldBreakPlansToDatabase() {
    if (!guardOpenPeriod("Sync field break")) return;
    const numericSiteId = Number(fieldBreakSiteId);
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0 || fieldBreakRows.length === 0) return;

    startSavingFieldBreak(async () => {
      await saveTimesheetFieldBreakPlansAction({
        siteId: numericSiteId,
        period,
        plans: fieldBreakRows.map((row) => ({
          employeeId: row.employee.id,
          employeeName: row.employee.name,
          sectionName: row.sectionLabel,
          rosterSection: row.rosterSection,
          onSiteDate: row.onSiteDate,
          dayCount: row.dayCount,
          fieldBreakDate: row.fieldBreakDate,
        })),
      });

      saveFieldBreakConfig();
    });
  }

  function saveSiteConfig() {
    if (!guardOpenPeriod("Save site settings")) return;
    if (siteId === "all") return;

    void saveSchedulingConfigAction({ siteId: Number(siteId), ...siteConfig, fieldBreakConfig: fieldBreakConfigs[siteId] ?? null, allowanceVariables, overtimeVariables });
    setRoster(siteConfig.rosterType);
    setSiteScheduleTypes((current) => ({ ...current, [siteId]: siteConfig.scheduleType }));
    setOverrides({});
    setPermanentOverrides({});
    setSelectedCell(null);
  }

  function updateSiteConfig<Key extends keyof SiteSchedulingConfig>(key: Key, value: SiteSchedulingConfig[Key]) {
    if (!guardOpenPeriod("Edit site settings")) return;
    if (siteId === "all") return;

    setSiteConfigs((current) => ({
      ...current,
      [siteId]: { ...(current[siteId] ?? defaultSiteConfig), [key]: value },
    }));
  }

  function updateAllowanceVariable(index: number, key: keyof AllowanceVariable, value: string | number) {
    setAllowanceVariables((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: key === "project" ? String(value) : Number(value || 0) } : item));
  }

  function addAllowanceVariable() {
    setAllowanceVariables((current) => [...current, { project: site?.name ?? siteNameOptions[0] ?? "Project Baru", msaStaff: 0, msaNonStaff: 0, mealsStaff: 0, mealsNonStaff: 0 }]);
  }

  function removeAllowanceVariable(index: number) {
    setAllowanceVariables((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function saveAllowanceVariables() {
    void saveSchedulingConfigAction({ siteId: Number(siteId), ...siteConfig, fieldBreakConfig: fieldBreakConfigs[siteId] ?? null, allowanceVariables, overtimeVariables });
  }

  function resetAllowanceVariables() {
    setAllowanceVariables(defaultAllowanceVariables);
    void saveSchedulingConfigAction({ siteId: Number(siteId), ...siteConfig, fieldBreakConfig: fieldBreakConfigs[siteId] ?? null, allowanceVariables: defaultAllowanceVariables, overtimeVariables });
  }

  function updateOvertimeVariable(index: number, key: keyof OvertimeVariable, value: string | number) {
    setOvertimeVariables((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: key === "totalHours" || key === "overtimeHours" ? Number(value || 0) : value } as OvertimeVariable : item));
  }

  function addOvertimeVariable() {
    setOvertimeVariables((current) => [...current, { roster: siteConfig.rosterType, dayType: "work", totalHours: 0, overtimeHours: 0 }]);
  }

  function removeOvertimeVariable(index: number) {
    setOvertimeVariables((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function saveOvertimeVariables() {
    void saveSchedulingConfigAction({ siteId: Number(siteId), ...siteConfig, fieldBreakConfig: fieldBreakConfigs[siteId] ?? null, allowanceVariables, overtimeVariables });
  }

  function resetOvertimeVariables() {
    setOvertimeVariables(defaultOvertimeVariables);
    void saveSchedulingConfigAction({ siteId: Number(siteId), ...siteConfig, fieldBreakConfig: fieldBreakConfigs[siteId] ?? null, allowanceVariables, overtimeVariables: defaultOvertimeVariables });
  }

  function setSelectedCode(code: ScheduleCode) {
    if (!guardOpenPeriod("Edit schedule")) return;
    if (!selectedCell) return;
    setOverrides((currentOverrides) => ({ ...currentOverrides, [`${selectedCell.employeeId}-${selectedCell.day}`]: code }));
  }

  function handleProfileSectionChange(section: string) {
    setProfileSection(section);
    if (isDefaultPositionOnSite(profilePositionOnSite) || isEmploymentPositionLabel(profilePositionOnSite)) {
      setProfilePositionOnSite(defaultPositionOnSite(section));
    }
  }

  function openEmployeeForm(employeeId: number) {
    const employee = visibleEmployees.find((item) => item.id === employeeId);
    const profile = employeeProfiles[employeeId];
    setSelectedEmployeeId(employeeId);
    setProfileSection(normalizeRosterSection(profile?.section || employee?.section || employee?.role));
    setProfilePositionOnSite(isLeadershipPosition(profile?.positionOnSite) ? profile?.positionOnSite ?? "Leader" : defaultPositionOnSite(employee?.section || profile?.section || employee?.role));
    setProfileKimperLv(profile?.kimperLv ?? false);
    setProfileKimperTh(profile?.kimperTh ?? false);
    setLeaveFrom("");
    setLeaveTo("");
    setFieldBreakFrom("");
    setFieldBreakTo("");
    setBackupEmployeeId("");
  }

  function rosterSectionTotals(sectionRows: typeof rows) {
    return days.map((day, index) => ({
      day,
      ds: sectionRows.filter((row) => row.schedule[index] === "DS").length,
      ns: sectionRows.filter((row) => row.schedule[index] === "NS").length,
      dayOperator: sectionRows.filter((row) => row.schedule[index] === "DS" && row.profile.kimperLv && row.profile.kimperTh).length,
      nightOperator: sectionRows.filter((row) => row.schedule[index] === "NS" && row.profile.kimperLv && row.profile.kimperTh).length,
      off: sectionRows.filter((row) => row.schedule[index] === "OFF").length,
      manpower: sectionRows.filter((row) => row.schedule[index] === "DS" || row.schedule[index] === "NS" || row.schedule[index] === "IN").length,
    }));
  }

  function rosterExportColumns() {
    return ["Nama", "LV", "TH", "SN", "Section", "Posisi On Site", ...days.map(String), "Total"];
  }

  function rosterExportRows(tableRows = rows) {
    return sectionOptions.flatMap((section) => {
      const sectionRows = tableRows.filter((row) => row.rosterSection === section);
      if (sectionRows.length === 0) return [];

      const styles = rosterSectionStyles[section] ?? rosterSectionStyles["Crew Office"];
      const totals = rosterSectionTotals(sectionRows);
      const showOperatorTotals = section === "Service Operation" || section === "Repair Retread";
      const rowsBySection: Array<Array<string | number>> = [
        [styles.title, "", "", "", "", period, ...days.map(() => ""), ""],
        ...sectionRows.map((row) => [row.employee.name, row.profile.kimperLv ? "?" : "", row.profile.kimperTh ? "?" : "", row.employee.id, row.sectionLabel, row.profile.positionOnSite, ...row.schedule, row.totalHours]),
        ["Dayshift", "", "", "", "", "Day Shift", ...totals.map((item) => item.ds), totals.reduce((sum, item) => sum + item.ds, 0)],
        ["Nightshift", "", "", "", "", "Night Shift", ...totals.map((item) => item.ns), totals.reduce((sum, item) => sum + item.ns, 0)],
      ];

      if (showOperatorTotals) {
        rowsBySection.push(
          ["Day Operator", "", "", "", "", "KIMPER LV + TH", ...totals.map((item) => item.dayOperator), totals.reduce((sum, item) => sum + item.dayOperator, 0)],
          ["Night Operator", "", "", "", "", "KIMPER LV + TH", ...totals.map((item) => item.nightOperator), totals.reduce((sum, item) => sum + item.nightOperator, 0)],
        );
      }

      rowsBySection.push(
        ["OFF", "", "", "", "", "OFF", ...totals.map((item) => item.off), totals.reduce((sum, item) => sum + item.off, 0)],
        ["TOTAL MAN POWER", "", "", "", "", "Aktif", ...totals.map((item) => item.manpower), sectionRows.length],
      );

      return rowsBySection;
    });
  }

  function exportRosterPdf(tabTitle = "Schedule", tableRows = rows) {
    const title = `${tabTitle} - ${site?.name ?? "Semua Site"} - ${period}`;
    const dayHeaders = days.map((day) => `<th><div>${weekdayLabel(period, day)}</div><div>${day}</div></th>`).join("");
    const rosterTables = sectionOptions.map((section) => {
      const sectionRows = tableRows.filter((row) => row.rosterSection === section);
      if (sectionRows.length === 0) return "";

      const styles = rosterSectionStyles[section] ?? rosterSectionStyles["Crew Office"];
      const totals = rosterSectionTotals(sectionRows);
      const showOperatorTotals = section === "Service Operation" || section === "Repair Retread";
      const bodyRows = sectionRows.map((row) => `
        <tr><td>${row.employee.name}</td><td>${row.profile.kimperLv ? "?" : ""}</td><td>${row.profile.kimperTh ? "?" : ""}</td><td>${row.employee.id}</td><td>${row.sectionLabel}</td><td>${row.profile.positionOnSite}</td>${row.schedule.map((code) => `<td class="cell ${code.toLowerCase()}">${codeLabel(code)}</td>`).join("")}<td>${row.totalHours}</td></tr>
      `).join("");
      const totalRow = (label: string, subLabel: string, key: "ds" | "ns" | "dayOperator" | "nightOperator" | "off" | "manpower", className = "") => `
        <tr class="total ${className}"><td>${label}</td><td colspan="5">${subLabel}</td>${totals.map((item) => `<td>${item[key]}</td>`).join("")}<td>${key === "manpower" ? sectionRows.length : totals.reduce((sum, item) => sum + item[key], 0)}</td></tr>
      `;

      return `<table class="roster"><thead><tr><th class="title" colspan="${days.length + 7}">${styles.title} ${period}</th></tr><tr><th>Nama</th><th>LV</th><th>TH</th><th>SN</th><th>Section</th><th>Posisi On Site</th>${dayHeaders}<th>Total</th></tr></thead><tbody>${bodyRows}</tbody><tfoot>${totalRow("Dayshift", "Day Shift", "ds")}${totalRow("Nightshift", "Night Shift", "ns")}${showOperatorTotals ? totalRow("Day Operator", "KIMPER LV + TH", "dayOperator", "operator-day") + totalRow("Night Operator", "KIMPER LV + TH", "nightOperator", "operator-night") : ""}${totalRow("OFF", "OFF", "off", "off-total")}${totalRow("TOTAL MAN POWER", "Aktif", "manpower", "manpower")}</tfoot></table>`;
    }).join("");
    const backupRows = backupAssignments.map((item) => `
      <tr><td>${item.employeeName}</td><td>${item.backupName}</td><td>${item.type}</td><td>${item.dateRange}</td></tr>
    `).join("") || `<tr><td colspan="4">Belum ada backup.</td></tr>`;
    const printable = window.open("", "_blank", "width=1200,height=800");
    if (!printable) return;

    printable.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { size: A4 landscape; margin: 4mm; }
            html, body { width: 289mm; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            h1 { font-size: 10px; margin: 0 0 2px; }
            p { margin: 0 0 4px; color: #475569; font-size: 7px; }
            table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 4.5px; line-height: 1.05; page-break-inside: avoid; margin-bottom: 6px; }
            th { background: #bae6fd; color: #0f172a; }
            .title { text-align: left; font-size: 7px; background: #bfdbfe; }
            th:first-child, td:first-child { text-align: left; width: 23mm; }
            th:nth-child(2), td:nth-child(2), th:nth-child(3), td:nth-child(3) { width: 5mm; }
            th:nth-child(4), td:nth-child(4) { width: 9mm; }
            th:nth-child(5), td:nth-child(5) { width: 18mm; }
            th:nth-child(6), td:nth-child(6) { width: 13mm; }
            th:last-child, td:last-child { width: 7mm; }
            th, td { border: 0.5px solid #94a3b8; padding: 1px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            tfoot .total { background: #f8fafc; font-weight: 700; }
            .operator-day { background: #ffffff; }
            .operator-night { background: #cbd5e1; }
            .off-total { color: #b91c1c; }
            .manpower { background: #ffffff; color: #0f172a; }
            .cell.in { color: #047857; font-weight: 700; }
            .cell.ds { background: #bae6fd; }
            .cell.ns { background: #22c55e; }
            .cell.off { background: #ef4444; color: white; }
            .cell.fb { background: #fde047; }
            .cell.libur { background: #e2e8f0; }
            .cell.sakit { background: #f5d0fe; }
            .cell.emergency { background: #f9a8d4; }
            .section { margin-top: 14px; }
            .backup th { background: #1e293b; color: white; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Roster: ${roster} ? Karyawan: ${tableRows.length} ? Total jam: ${tableRows.reduce((sum, row) => sum + row.totalHours, 0)}</p>
          ${rosterTables}
          <div class="section">
            <h1>List Pengganti / Backup</h1>
            <table class="backup"><thead><tr><th>Karyawan</th><th>Backup</th><th>Tipe</th><th>Range</th></tr></thead><tbody>${backupRows}</tbody></table>
          </div>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    printable.document.close();
  }

  function exportCsv(tabTitle: string, columns: string[], exportRows: Array<Array<string | number>>) {
    const csv = [columns, ...exportRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tabTitle}-${site?.name ?? "Semua Site"}-${period}.csv`.replace(/[^a-z0-9._-]+/gi, "-");
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportSummaryPdf(tabTitle: string, columns: string[], exportRows: Array<Array<string | number>>) {
    const title = `${tabTitle} - ${site?.name ?? "Semua Site"} - ${period}`;
    const printable = window.open("", "_blank", "width=1200,height=800");
    if (!printable) return;

    printable.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${title}</title>
          <style>@page { size: A4 landscape; margin: 10mm; } body { font-family: Arial, sans-serif; color: #0f172a; } h1 { font-size: 18px; } table { width: 100%; border-collapse: collapse; font-size: 10px; } th { background: #1e293b; color: white; } th, td { border: 1px solid #94a3b8; padding: 6px; text-align: left; }</style>
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            <thead><tr>${columns.map((column) => `<th>${column}</th>`).join("")}</tr></thead>
            <tbody>${exportRows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody>
          </table>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    printable.document.close();
  }

  function TabExportActions({ tabTitle, tableRows = rows, columns, exportRows }: { tabTitle: string; tableRows?: typeof rows; columns?: string[]; exportRows?: Array<Array<string | number>> }) {
    const excelColumns = columns ?? rosterExportColumns();
    const excelRows = exportRows ?? rosterExportRows(tableRows);

    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={tableRows.length === 0 && excelRows.length === 0} onClick={() => (columns && exportRows ? exportSummaryPdf(tabTitle, excelColumns, excelRows) : exportRosterPdf(tabTitle, tableRows))}>
          <Download className="mr-2 size-4" /> Export PDF
        </Button>
        <Button size="sm" variant="outline" disabled={excelRows.length === 0} onClick={() => exportCsv(tabTitle, excelColumns, excelRows)}>
          <Download className="mr-2 size-4" /> Export CSV
        </Button>
      </div>
    );
  }

  function applyEmployeeEdit() {
    if (!guardOpenPeriod("Edit employee schedule")) return;
    if (!selectedEmployee) return;
    const backup = visibleEmployees.find((employee) => String(employee.id) === backupEmployeeId) ?? null;
    const nextOverrides: Record<string, ScheduleCode> = {};
    const leaveDays = dateRangeDays(leaveFrom, leaveTo, period, dayCount);
    const fieldBreakDays = dateRangeDays(fieldBreakFrom, fieldBreakTo, period, dayCount);

    const selectedRow = rows.find((row) => row.employee.id === selectedEmployee.id);
    const backupRow = backup ? rows.find((row) => row.employee.id === backup.id) : null;

    for (const day of leaveDays) {
      const selectedCodeForDay = selectedRow?.schedule[day - 1];
      const backupCodeForDay = backupRow?.schedule[day - 1];

      nextOverrides[`${selectedEmployee.id}-${day}`] = backup ? activeShiftCode(backupCodeForDay) : "Libur";
      if (backup) nextOverrides[`${backup.id}-${day}`] = selectedCodeForDay ?? "Libur";
    }
    for (const day of fieldBreakDays) nextOverrides[`${selectedEmployee.id}-${day}`] = "FB";
    if (backup) {
      for (const day of fieldBreakDays) nextOverrides[`${backup.id}-${day}`] = "IN";
    }

    setOverrides((currentOverrides) => ({ ...currentOverrides, ...nextOverrides }));
    setEmployeeProfiles((currentProfiles) => ({
      ...currentProfiles,
      [selectedEmployee.id]: {
        employeeId: selectedEmployee.id,
        section: profileSection,
        positionOnSite: profilePositionOnSite || defaultPositionOnSite(profileSection),
        kimperLv: profileKimperLv,
        kimperTh: profileKimperTh,
      },
    }));

    const newAssignments: BackupAssignment[] = [];
    if (backup && leaveDays.length > 0) {
      newAssignments.push({
        id: `${Date.now()}-leave`,
        employeeName: selectedEmployee.name,
        backupName: backup.name,
        type: "Tukar Libur",
        dateRange: `${leaveFrom} s/d ${leaveTo || leaveFrom}`,
      });
    }
    if (backup && fieldBreakDays.length > 0) {
      newAssignments.push({
        id: `${Date.now()}-fb`,
        employeeName: selectedEmployee.name,
        backupName: backup.name,
        type: "Field Break",
        dateRange: `${fieldBreakFrom} s/d ${fieldBreakTo || fieldBreakFrom}`,
      });
    }
    if (newAssignments.length > 0) setBackupAssignments((current) => [...newAssignments, ...current]);
    setSelectedEmployeeId(null);
  }

  function getAttendanceCell(employeeId: number, day: number): ManualAttendanceCell {
    const key = attendanceKey(employeeId, day);
    const manual = manualAttendance[key];
    if (manual) return manual;

    const real = attendanceByCell.get(key);
    if (!real) return { status: "empty", clockIn: "", clockOut: "", note: "", source: "attendance" };

    const status = normalizeAttendanceStatus(real.clockIn?.status ?? real.clockOut?.status ?? real.records[0]?.status);
    return {
      status,
      clockIn: timeFromIso(real.clockIn?.eventTime),
      clockOut: timeFromIso(real.clockOut?.eventTime),
      note: real.clockIn?.locationNote || real.clockOut?.locationNote || real.records[0]?.locationNote || "Face/location attendance",
      source: "attendance",
    };
  }

  function updateAttendanceCell(employeeId: number, day: number, patch: Partial<ManualAttendanceCell>) {
    if (!guardOpenPeriod("Edit attendance")) return;
    const key = attendanceKey(employeeId, day);
    setManualAttendance((current) => ({
      ...current,
      [key]: { ...getAttendanceCell(employeeId, day), source: "manual", ...patch },
    }));
    setIsAttendanceDirty(true);
  }

  function cycleAttendanceCell(employeeId: number, day: number) {
    if (!guardOpenPeriod("Edit attendance")) return;
    const current = getAttendanceCell(employeeId, day);
    const cycle: AttendanceCellStatus[] = ["present", "sick", "leave", "absent", "empty"];
    const nextStatus = cycle[(cycle.indexOf(current.status) + 1) % cycle.length];
    updateAttendanceCell(employeeId, day, {
      status: nextStatus,
      clockIn: nextStatus === "present" ? current.clockIn || "08:00" : "",
      clockOut: nextStatus === "present" ? current.clockOut || "17:00" : "",
      source: "manual",
    });
  }

  function toggleAttendanceSelection(employeeId: number, day: number) {
    if (!guardOpenPeriod("Select attendance")) return;
    const key = attendanceKey(employeeId, day);
    setSelectedAttendanceKeys((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  function applyBulkAttendance(patch: Partial<ManualAttendanceCell>) {
    if (!guardOpenPeriod("Bulk edit attendance")) return;
    setManualAttendance((current) => {
      const next = { ...current };
      for (const key of selectedAttendanceKeys) {
        const [employeeId, day] = key.split("-").map(Number);
        next[key] = { ...getAttendanceCell(employeeId, day), source: "manual", ...patch };
      }
      return next;
    });
    setIsAttendanceDirty(true);
  }

  function clearAttendanceSelection() {
    setSelectedAttendanceKeys([]);
    setMultiSelectAttendance(false);
  }

  async function importAttendanceExcel(file: File | null) {
    if (!file || !guardOpenPeriod("Import attendance")) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const rawRows = records.flatMap((record) => {
      const employeeSn = String(record.SN ?? record.sn ?? record.EmployeeSN ?? record.employeeSn ?? "");
      const employeeName = String(record.Nama ?? record.nama ?? record.Employee ?? record.employee ?? "");
      const siteName = String(record.Site ?? record.site ?? record.Project ?? record.project ?? "");
      return days.map((day) => {
        const raw = String(record[`D${day}`] ?? record[String(day)] ?? record[`Tgl ${day}`] ?? "").trim();
        const clockIn = String(record[`Masuk ${day}`] ?? record[`In ${day}`] ?? "").trim();
        const clockOut = String(record[`Pulang ${day}`] ?? record[`Out ${day}`] ?? "").trim();
        if (!raw && !clockIn && !clockOut) return null;
        return { employeeSn, employeeName, siteName, day, status: normalizeAttendanceStatus(raw || (clockIn ? "Masuk" : "")), clockIn, clockOut, note: raw };
      }).filter(Boolean);
    });
    const numericSiteId = Number(siteId);
    const result = await createAttendanceImportPreviewAction({ siteId: numericSiteId, period, filename: file.name, rows: rawRows as any, fixedSchedule: rows.map((row) => ({ employeeId: row.employee.id, schedule: row.schedule })) });
      setAttendanceImportPreview({ previewId: result.previewId, matchedCount: result.matchedCount, unmatchedCount: result.unmatchedCount, cellCount: result.cellCount, conflictCount: result.conflictCount, previewRows: result.previewRows, conflicts: result.conflicts });
      toast.success("Import preview ready");
    } catch (error) {
      toast.error("Import preview failed", { description: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  function applyAttendanceImportPreview() {
    if (!attendanceImportPreview || !guardOpenPeriod("Apply attendance import")) return;
    if (attendanceImportMode === "overwrite-conflicts" && attendanceImportPreview.conflictCount > 0) {
      setOverwriteImportDialogOpen(true);
      return;
    }
    confirmApplyAttendanceImportPreview();
  }

  function confirmApplyAttendanceImportPreview() {
    if (!attendanceImportPreview || !guardOpenPeriod("Apply attendance import")) return;
    startSavingAttendance(async () => {
      try {
        const result = await applyAttendanceImportPreviewAction({ previewId: attendanceImportPreview.previewId, mode: attendanceImportMode });
        const next: Record<string, ManualAttendanceCell> = {};
        for (const row of result.rows) {
          next[attendanceKey(row.employeeId!, row.day)] = { status: row.status, clockIn: row.clockIn, clockOut: row.clockOut, note: row.note, source: "excel" };
        }
        setManualAttendance((current) => ({ ...current, ...next }));
        setAttendanceImportPreview(null);
        setAttendanceSavedAt(new Date().toISOString());
        setIsAttendanceDirty(false);
        toast.success("Attendance import applied");
      } catch (error) {
        toast.error("Apply import failed", { description: error instanceof Error ? error.message : "Unknown error" });
      }
    });
  }

  function saveAttendanceReal() {
    if (!guardOpenPeriod("Save attendance")) return;
    const numericSiteId = Number(siteId);
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0 || isFinalized) return;
    const overrides = Object.entries(manualAttendance).map(([key, cell]) => {
      const [employeeId, day] = key.split("-").map(Number);
      return { employeeId, day, status: cell.status, clockIn: cell.clockIn, clockOut: cell.clockOut, note: cell.note, source: cell.source ?? "manual" };
    });

    startSavingAttendance(async () => {
      try {
        const result = await saveAttendanceRealOverridesAction({ siteId: numericSiteId, period, overrides });
        if (result.ok) {
          setAttendanceSavedAt(new Date().toISOString());
          setIsAttendanceDirty(false);
          toast.success("Attendance saved");
        }
      } catch (error) {
        toast.error("Save attendance failed", { description: error instanceof Error ? error.message : "Unknown error" });
      }
    });
  }

  function discardAttendanceImportPreview() {
    if (!attendanceImportPreview) return;
    startSavingAttendance(async () => {
      try {
        await discardAttendanceImportPreviewAction({ previewId: attendanceImportPreview.previewId });
        setAttendanceImportPreview(null);
        setDiscardImportDialogOpen(false);
        toast.success("Import preview discarded");
      } catch (error) {
        toast.error("Discard failed", { description: error instanceof Error ? error.message : "Unknown error" });
      }
    });
  }

  const attendanceConflicts = rows.flatMap((row) => row.schedule.map((code, index) => {
    const day = index + 1;
    const cell = getAttendanceCell(row.employee.id, day);
    return cell.status === "present" && ["OFF", "FB", "Sakit", "Libur"].includes(code) ? { employeeId: row.employee.id, employeeName: row.employee.name, day, scheduleCode: code, currentCell: cell } : null;
  }).filter(Boolean) as Array<{ employeeId: number; employeeName: string; day: number; scheduleCode: string; currentCell: ManualAttendanceCell }>);

  function clearAttendanceConflict(employeeId: number, day: number) {
    updateAttendanceCell(employeeId, day, { status: "empty", clockIn: "", clockOut: "", note: "" });
  }

  function markConflictScheduleWorking(employeeId: number, day: number) {
    if (!guardOpenPeriod("Resolve conflict")) return;
    const key = `${employeeId}-${day}`;
    const workingCode: ScheduleCode = siteConfig.scheduleType === "shift" ? "DS" : "IN";
    setOverrides((currentOverrides) => ({ ...currentOverrides, [key]: workingCode }));
    setSelectedCell({ employeeId, day });
  }

  function clearAllAttendanceConflicts() {
    if (!guardOpenPeriod("Clear conflicts")) return;
    for (const conflict of attendanceConflicts) clearAttendanceConflict(conflict.employeeId, conflict.day);
  }

  function markAllConflictSchedulesWorking() {
    if (!guardOpenPeriod("Resolve conflicts")) return;
    const workingCode: ScheduleCode = siteConfig.scheduleType === "shift" ? "DS" : "IN";
    setOverrides((currentOverrides) => {
      const next = { ...currentOverrides };
      for (const conflict of attendanceConflicts) next[attendanceKey(conflict.employeeId, conflict.day)] = workingCode;
      return next;
    });
  }
  const conflictKeySet = new Set(attendanceConflicts.map((conflict) => attendanceKey(conflict.employeeId, conflict.day)));
  const displayedAttendanceRows = showConflictsOnly ? rows.filter((row) => days.some((day) => conflictKeySet.has(attendanceKey(row.employee.id, day)))) : rows;

  function submitFinalizePeriod() {
    const numericSiteId = Number(siteId);
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0) return;
    startSavingSchedule(async () => {
      try {
        await finalizeSchedulingPeriodAction({ siteId: numericSiteId, period, reason: finalizeReason });
        toast.success("Period finalized");
        window.location.reload();
      } catch (error) {
        toast.error("Finalize failed", { description: error instanceof Error ? error.message : "Unknown error" });
      }
    });
  }

  function submitReopenPeriod() {
    const numericSiteId = Number(siteId);
    const reason = reopenReason.trim();
    if (!reason || !Number.isFinite(numericSiteId) || numericSiteId <= 0) return;
    startSavingSchedule(async () => {
      try {
        await reopenSchedulingPeriodAction({ siteId: numericSiteId, period, reason });
        toast.success("Period reopened");
        window.location.reload();
      } catch (error) {
        toast.error("Reopen failed", { description: error instanceof Error ? error.message : "Unknown error" });
      }
    });
  }

  function downloadAttendanceTemplate() {
    const templateRows = visibleEmployees.map((employee) => {
      const row: Record<string, string | number> = {
        Nama: employee.name,
        SN: employee.id,
        Jabatan: employee.role,
        Site: employee.locationName ?? site?.name ?? "",
      };

      for (const day of days) {
        row[`D${day}`] = "";
        row[`Masuk ${day}`] = "";
        row[`Pulang ${day}`] = "";
      }

      return row;
    });
    const helperRows = [
      { Status: "Masuk", Keterangan: "Cell hijau. Bisa isi jam Masuk/Pulang." },
      { Status: "Sakit", Keterangan: "Cell kuning." },
      { Status: "Izin", Keterangan: "Cell biru." },
      { Status: "Alpha", Keterangan: "Cell rose." },
      { Status: "-", Keterangan: "Kosong / belum ada data." },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(templateRows), "Attendance Real");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(helperRows), "Panduan");
    XLSX.writeFile(workbook, `attendance-real-template-${period}.xlsx`);
  }

  const attendanceStats = rows.reduce((stats, row) => {
    for (const day of days) {
      const status = getAttendanceCell(row.employee.id, day).status;
      stats[status] += 1;
    }
    return stats;
  }, { present: 0, empty: 0, sick: 0, leave: 0, absent: 0 } as Record<AttendanceCellStatus, number>);
  const selectedAttendanceEmployee = selectedAttendanceCell ? visibleEmployees.find((employee) => employee.id === selectedAttendanceCell.employeeId) : null;
  const selectedAttendanceValue = selectedAttendanceCell ? getAttendanceCell(selectedAttendanceCell.employeeId, selectedAttendanceCell.day) : null;
  const attendanceOvertimeRows = rows.map((row) => {
    const baseHours = row.workDays * 5;
    const calculated = calculateAttendanceOvertime(days.map((day) => getAttendanceCell(row.employee.id, day)), baseHours);

    return { ...row, attendanceTotalHours: calculated.totalHours, attendanceBaseHours: calculated.baseHours, attendanceOvertime: calculated.overtime };
  });

  return (
    <div className="space-y-4">
      {isFinalized ? <Alert><Lock className="h-4 w-4" /><AlertDescription>Period finalized. Reopen before editing/importing/saving.</AlertDescription></Alert> : null}
      <Card className="surface-module-card rounded-[1.2rem] border-0 p-5 shadow-sm ring-1 ring-black/5">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">Parameter Jadwal</h2>
          <p className="text-sm text-muted-foreground">Pilih site dan periode untuk mengelola atau membuat jadwal baru.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Site</Label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Pilih site" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Pilih site dahulu</SelectItem>
                {sites.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Periode</Label>
            <Input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className="h-10" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Tipe Site</Label>
            <Select value={siteConfig.scheduleType} onValueChange={(value) => updateSiteConfig("scheduleType", value as SiteScheduleType)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="office">Office / Non Shift</SelectItem>
                <SelectItem value="shift">Shift DS / NS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Rooster</Label>
            <Select value={siteConfig.rosterType} onValueChange={(value) => updateSiteConfig("rosterType", value as SiteRosterType)}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5:2">Rooster 5 : 2</SelectItem>
                <SelectItem value="6:1">Rooster 6 : 1</SelectItem>
                <SelectItem value="vale">Vale Sorowako</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 lg:pt-0">
            <Button className="h-10 w-full lg:w-auto" disabled={siteId === "all" || isFinalized} onClick={() => { saveSiteConfig(); setIsGenerated(true); }}>
              <RefreshCw className="mr-2 size-4" /> Generate Auto Scheduling
            </Button>
            {isFinalized ? <Button variant="outline" disabled={isSavingSchedule} onClick={() => setReopenDialogOpen(true)}>Reopen</Button> : <Button variant="outline" disabled={siteId === "all" || isSavingSchedule} onClick={() => setFinalizeDialogOpen(true)}>Finalize</Button>}
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Karyawan", value: rows.length, Icon: CalendarDays },
          { label: "Total jam schedule", value: rows.reduce((sum, row) => sum + row.totalHours, 0), Icon: Clock3 },
          { label: "Estimasi MSA + Meals", value: money(rows.reduce((sum, row) => sum + row.msa + row.meals, 0)), Icon: Calculator },
          { label: "Backup list", value: backupAssignments.length, Icon: Settings2 },
        ].map(({ label, value, Icon }) => (
          <Card key={label} className="surface-module-card rounded-[1.2rem] border-0 p-5 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
              <div className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Icon className="size-4" />
              </div>
            </div>
            <p className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">{String(value)}</p>
          </Card>
        ))}
      </div>

      {backupAssignments.length > 0 ? (
        <Card className="surface-module-card rounded-[1.1rem] border-0 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">List Pengganti / Backup</p>
              <p className="text-sm text-muted-foreground">Terisi otomatis dari form edit nama karyawan.</p>
            </div>
            <Badge variant="outline">{backupAssignments.length} assignment</Badge>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {backupAssignments.map((item) => (
              <div key={item.id} className="rounded-xl bg-surface-container-low p-3 text-sm">
                <p className="font-semibold text-foreground">{item.backupName}</p>
                <p className="text-muted-foreground">Backup untuk {item.employeeName}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">{item.type} • {item.dateRange}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-2xl bg-surface-container-low p-1 lg:w-auto">
          <TabsTrigger value="settings">Setting</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="attendance-real">Attendance Real</TabsTrigger>
          <TabsTrigger value="permanent">Schedule Tetap</TabsTrigger>
          <TabsTrigger value="field-break">Schedule Field Break</TabsTrigger>
          <TabsTrigger value="allowance">MSA + Meals</TabsTrigger>
          <TabsTrigger value="overtime">Overtime</TabsTrigger>
          <TabsTrigger value="variables">Variabel</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card className="surface-module-card rounded-[1.2rem] border-0 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">Konfigurasi Per Site</p>
                <p className="text-sm text-muted-foreground">Default variabel untuk semua tab. Tersimpan per site, tidak perlu set ulang saat ganti bulan.</p>
              </div>
              <Button disabled={siteId === "all" || isFinalized} onClick={saveSiteConfig}><Save className="mr-2 size-4" /> Simpan Setting Site</Button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-2">
                <Label>Tipe Shift</Label>
                <Select value={siteConfig.scheduleType} onValueChange={(value) => updateSiteConfig("scheduleType", value as SiteScheduleType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="office">Office / Non Shift</SelectItem><SelectItem value="shift">Shift DS / NS</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipe Roster</Label>
                <Select value={siteConfig.rosterType} onValueChange={(value) => updateSiteConfig("rosterType", value as SiteRosterType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="5:2">Roster 5 : 2</SelectItem><SelectItem value="6:1">Roster 6 : 1</SelectItem><SelectItem value="vale">Vale Sorowako</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipe MSA</Label>
                <Select value={siteConfig.msaType} onValueChange={(value) => updateSiteConfig("msaType", value as SiteMsaType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="staff-nonstaff">Rate Staff / Non Staff</SelectItem><SelectItem value="same-all">Sama Semua</SelectItem><SelectItem value="none">Tidak dihitung</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipe Meals</Label>
                <Select value={siteConfig.mealsType} onValueChange={(value) => updateSiteConfig("mealsType", value as SiteMealsType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="field-break">Hanya Field Break</SelectItem><SelectItem value="workday">Semua Hari Kerja</SelectItem><SelectItem value="none">Tidak dihitung</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Hitungan Overtime</Label>
                <Select value={siteConfig.overtimeType} onValueChange={(value) => updateSiteConfig("overtimeType", value as SiteOvertimeType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="five-hour">Total jam - 5 jam dasar</SelectItem><SelectItem value="roster">Ikut roster</SelectItem><SelectItem value="none">Tidak dihitung</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="variables" className="space-y-4">
          <Card className="surface-module-card rounded-[1.2rem] border-0 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="font-semibold text-foreground">Setting Variabel MSA, Meals, Overtime</p><p className="text-sm text-muted-foreground">Nama projek dipilih dari Master Site agar matching rate lebih akurat.</p></div>
              <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={resetAllowanceVariables}>Reset MSA/Meals</Button><Button onClick={saveAllowanceVariables}><Save className="mr-2 size-4" /> Simpan MSA/Meals</Button></div>
            </div>
            <div className="mt-4 overflow-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead><tr className="bg-surface-container-low text-left text-xs uppercase tracking-[0.12em] text-muted-foreground"><th className="px-3 py-2">No</th><th className="px-3 py-2">Nama Site / Projek</th><th className="px-3 py-2">MSA Staff</th><th className="px-3 py-2">MSA Non Staff</th><th className="px-3 py-2">Meals Staff</th><th className="px-3 py-2">Meals Non Staff</th><th className="px-3 py-2">Aksi</th></tr></thead>
                <tbody>{allowanceVariables.map((item, index) => {
                  const projectOptions = siteNameOptions.includes(item.project) ? siteNameOptions : [item.project, ...siteNameOptions];

                  return <tr key={`${item.project}-${index}`} className="border-b border-slate-100"><td className="px-3 py-2">{index + 1}</td><td className="px-3 py-2"><Select value={item.project} onValueChange={(value) => updateAllowanceVariable(index, "project", value)}><SelectTrigger><SelectValue placeholder="Pilih site" /></SelectTrigger><SelectContent>{projectOptions.map((siteName) => <SelectItem key={siteName} value={siteName}>{siteName}</SelectItem>)}</SelectContent></Select></td><td className="px-3 py-2"><Input type="number" value={item.msaStaff} onChange={(event) => updateAllowanceVariable(index, "msaStaff", event.target.value)} /></td><td className="px-3 py-2"><Input type="number" value={item.msaNonStaff} onChange={(event) => updateAllowanceVariable(index, "msaNonStaff", event.target.value)} /></td><td className="px-3 py-2"><Input type="number" value={item.mealsStaff} onChange={(event) => updateAllowanceVariable(index, "mealsStaff", event.target.value)} /></td><td className="px-3 py-2"><Input type="number" value={item.mealsNonStaff} onChange={(event) => updateAllowanceVariable(index, "mealsNonStaff", event.target.value)} /></td><td className="px-3 py-2"><Button size="sm" variant="outline" onClick={() => removeAllowanceVariable(index)}>Hapus</Button></td></tr>;
                })}</tbody>
              </table>
            </div>
            <Button className="mt-3" variant="outline" onClick={addAllowanceVariable}>Tambah Project</Button>
          </Card>

          <Card className="surface-module-card rounded-[1.2rem] border-0 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="font-semibold text-foreground">Variabel Hitungan Overtime</p><p className="text-sm text-muted-foreground">Atur hitungan lembur per roster dan hari kerja/libur.</p></div>
              <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={resetOvertimeVariables}>Reset Overtime</Button><Button onClick={saveOvertimeVariables}><Save className="mr-2 size-4" /> Simpan Overtime</Button></div>
            </div>
            <div className="mt-4 overflow-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead><tr className="bg-surface-container-low text-left text-xs uppercase tracking-[0.12em] text-muted-foreground"><th className="px-3 py-2">Roster</th><th className="px-3 py-2">Tipe Hari</th><th className="px-3 py-2">Total Jam</th><th className="px-3 py-2">Hitungan Lembur</th><th className="px-3 py-2">Aksi</th></tr></thead>
                <tbody>{overtimeVariables.map((item, index) => <tr key={`${item.roster}-${item.dayType}-${item.totalHours}-${index}`} className="border-b border-slate-100"><td className="px-3 py-2"><Select value={item.roster} onValueChange={(value) => updateOvertimeVariable(index, "roster", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="5:2">5 : 2</SelectItem><SelectItem value="6:1">6 : 1</SelectItem><SelectItem value="vale">Vale Sorowako</SelectItem></SelectContent></Select></td><td className="px-3 py-2"><Select value={item.dayType} onValueChange={(value) => updateOvertimeVariable(index, "dayType", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="work">Hari Kerja</SelectItem><SelectItem value="off">Hari Libur</SelectItem></SelectContent></Select></td><td className="px-3 py-2"><Input type="number" step="0.5" value={item.totalHours} onChange={(event) => updateOvertimeVariable(index, "totalHours", event.target.value)} /></td><td className="px-3 py-2"><Input type="number" step="0.5" value={item.overtimeHours} onChange={(event) => updateOvertimeVariable(index, "overtimeHours", event.target.value)} /></td><td className="px-3 py-2"><Button size="sm" variant="outline" onClick={() => removeOvertimeVariable(index)}>Hapus</Button></td></tr>)}</tbody>
              </table>
            </div>
            <Button className="mt-3" variant="outline" onClick={addOvertimeVariable}>Tambah Overtime</Button>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-3">
          <Card className="surface-module-card flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border-0 p-3">
            <div>
              <p className="font-semibold text-foreground">Save Schedule ke Schedule Tetap</p>
              <p className="text-sm text-muted-foreground">Generate/edit draft dulu, lalu save agar jadi baseline Schedule Tetap.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TabExportActions tabTitle="Schedule" tableRows={rows} />
              <Button disabled={rows.length === 0 || isSavingSchedule || isFinalized} onClick={saveScheduleToPermanent}>
                <Save className="mr-2 size-4" /> {isSavingSchedule ? "Menyimpan..." : "Save ke Schedule Tetap"}
              </Button>
            </div>
          </Card>
          {selectedCell ? (
            <Card className="surface-module-card flex flex-wrap items-center gap-3 rounded-[1rem] border-0 p-3">
              <Badge variant="outline">Edit cell: hari {selectedCell.day}</Badge>
              <Select value={selectedCode} onValueChange={(value) => setSelectedCode(value as ScheduleCode)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>{codeCycle.map((code) => <SelectItem key={code} value={code}>{code === "IN" ? "✓ Masuk" : code}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">Shift pakai DS/NS. Office pakai ✓, weekend OFF; weekend lembur bisa diedit manual ke ✓/DS/NS.</p>
            </Card>
          ) : null}
          <div className="space-y-5">
            {sectionOptions.map((section) => renderRosterTable(rows, section, "draft", cycleCell))}
          </div>
        </TabsContent>

        <TabsContent value="attendance-real" className="space-y-3">
          <Card className="surface-module-card flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border-0 p-3">
            <div>
              <p className="font-semibold text-foreground">Attendance Real</p>
              <p className="text-sm text-muted-foreground">Terhubung dari attendance face/location. Cell bisa diedit manual atau diisi via Excel.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" disabled={isFinalized}>
                <Label className="h-10 cursor-pointer px-4">
                  <Upload className="mr-2 size-4" /> Import Excel
                  <Input disabled={isFinalized} className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={(event) => { void importAttendanceExcel(event.target.files?.[0] ?? null); event.currentTarget.value = ""; }} />
                </Label>
              </Button>
              <Button variant="outline" onClick={downloadAttendanceTemplate}>
                <Download className="mr-2 size-4" /> Template Excel
              </Button>
              <Button disabled={!isAttendanceDirty || isSavingAttendance || siteId === "all" || isFinalized} onClick={saveAttendanceReal}>
                <Save className="mr-2 size-4" /> {isSavingAttendance ? "Menyimpan..." : "Save Attendance Real"}
              </Button>
              <TabExportActions tabTitle="Attendance Real" columns={["Nama", "Masuk", "Belum", "Sakit", "Izin", "Alpha", "Manual", "Excel", "FaceLoc"]} exportRows={rows.map((row) => {
                const cells = days.map((day) => getAttendanceCell(row.employee.id, day));
                const statuses = cells.map((cell) => cell.status);
                return [row.employee.name, statuses.filter((status) => status === "present").length, statuses.filter((status) => status === "empty").length, statuses.filter((status) => status === "sick").length, statuses.filter((status) => status === "leave").length, statuses.filter((status) => status === "absent").length, cells.filter((cell) => cell.source === "manual").length, cells.filter((cell) => cell.source === "excel").length, cells.filter((cell) => cell.source === "attendance").length];
              })} />
            </div>
          </Card>
          {(attendanceImportPreview || attendanceSavedAt || isAttendanceDirty) ? (
            <Card className="surface-module-card flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border-0 p-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {isAttendanceDirty ? <Badge variant="outline">Belum tersimpan</Badge> : <Badge variant="outline">Tersimpan</Badge>}
                {attendanceSavedAt ? <span className="text-muted-foreground">Last save: {new Date(attendanceSavedAt).toLocaleString("id-ID")}</span> : null}
              </div>
              {attendanceImportPreview ? <span className="text-muted-foreground">Import preview: {attendanceImportPreview.matchedCount} matched, {attendanceImportPreview.cellCount} cells, {attendanceImportPreview.conflictCount} conflicts</span> : null}
            </Card>
          ) : null}
          {attendanceConflicts.length ? (
            <Card className="surface-module-card rounded-[1rem] border-0 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="font-semibold text-orange-800">{attendanceConflicts.length} attendance conflicts</p><p className="text-sm text-muted-foreground">Present attendance on OFF/FB/Sakit/Libur schedule cells.</p></div>
                <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setShowConflictsOnly((value) => !value)}>{showConflictsOnly ? "Show all" : "Show conflicts only"}</Button><Button size="sm" variant="outline" disabled={isFinalized} onClick={clearAllAttendanceConflicts}>Clear attendance for all conflicts</Button><Button size="sm" disabled={isFinalized} onClick={markAllConflictSchedulesWorking}>Use attendance / mark schedule working</Button></div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {attendanceConflicts.slice(0, 12).map((conflict) => <div key={`${conflict.employeeId}-${conflict.day}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-orange-50 p-2 text-sm"><span>{conflict.employeeName} · day {conflict.day} · {conflict.scheduleCode} · {attendanceStatusLabel(conflict.currentCell.status)}</span><span className="flex gap-2"><Button size="sm" variant="outline" disabled={isFinalized} onClick={() => clearAttendanceConflict(conflict.employeeId, conflict.day)}>Clear attendance</Button><Button size="sm" variant="outline" disabled={isFinalized} onClick={() => markConflictScheduleWorking(conflict.employeeId, conflict.day)}>Mark schedule working</Button></span></div>)}
              </div>
            </Card>
          ) : null}
          <AttendanceRealBulkToolbar
            enabled={multiSelectAttendance}
            selectedCount={selectedAttendanceKeys.length}
            onToggle={() => setMultiSelectAttendance((value) => !value)}
            onSetPresent={() => applyBulkAttendance({ status: "present", clockIn: "08:00", clockOut: "17:00" })}
            onSetSick={() => applyBulkAttendance({ status: "sick", clockIn: "", clockOut: "" })}
            onSetLeave={() => applyBulkAttendance({ status: "leave", clockIn: "", clockOut: "" })}
            onSetEmpty={() => applyBulkAttendance({ status: "empty", clockIn: "", clockOut: "", note: "" })}
            onClear={clearAttendanceSelection}
          />
          <div className="grid gap-3 md:grid-cols-5">
            {[
              ["Masuk", attendanceStats.present, "bg-emerald-100 text-emerald-950"],
              ["-", attendanceStats.empty, "bg-red-100 text-red-950"],
              ["Sakit", attendanceStats.sick, "bg-amber-100 text-amber-950"],
              ["Izin", attendanceStats.leave, "bg-sky-100 text-sky-950"],
              ["Alpha", attendanceStats.absent, "bg-rose-100 text-rose-950"],
            ].map(([label, value, className]) => <Card key={String(label)} className={`rounded-[1rem] border-0 p-4 ${className}`}><p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-75">{label}</p><p className="mt-2 font-display text-2xl font-semibold">{String(value)}</p></Card>)}
          </div>
          <Card className="surface-module-card overflow-hidden rounded-[1.2rem] border-0 p-0">
            <div className="max-w-full overflow-x-auto overflow-y-visible">
              <table className="w-max min-w-[1400px] table-fixed border-separate border-spacing-0 text-xs">
                <thead><tr className="bg-surface-container-low text-left uppercase tracking-[0.12em] text-muted-foreground"><th className="sticky left-0 z-30 w-[220px] min-w-[220px] bg-surface-container-low px-3 py-3 shadow-[8px_0_16px_-14px_rgba(15,23,42,0.55)]">Nama</th>{days.map((day) => <th key={day} className="w-[52px] min-w-[52px] px-1 py-3 text-center">{day}<br /><span className="normal-case tracking-normal">{weekdayLabel(period, day)}</span></th>)}</tr></thead>
                <tbody>{displayedAttendanceRows.map((row) => <tr key={row.employee.id} className="border-b border-slate-100"><td className="sticky left-0 z-20 min-w-[220px] bg-white px-3 py-2 font-semibold text-foreground shadow-[8px_0_16px_-14px_rgba(15,23,42,0.55)]">{row.employee.name}<p className="text-[10px] font-normal text-muted-foreground">{row.employee.role}</p></td>{days.map((day) => {
                  const cell = getAttendanceCell(row.employee.id, day);
                  const isSelected = selectedAttendanceKeys.includes(attendanceKey(row.employee.id, day));
                  const isConflict = cell.status === "present" && ["OFF", "Libur", "Sakit", "FB"].includes(row.schedule[day - 1]);
                  return <td key={day} className="w-[52px] min-w-[52px] px-1 py-2 align-top"><button className={`relative h-[76px] w-[44px] rounded-xl px-2 py-2 text-left text-[11px] font-semibold ${attendanceCellClass(cell.status)} ${isSelected ? "outline outline-2 outline-slate-900 outline-offset-2" : ""} ${isConflict ? "ring-2 ring-orange-400" : ""}`} onClick={() => multiSelectAttendance ? toggleAttendanceSelection(row.employee.id, day) : setSelectedAttendanceCell({ employeeId: row.employee.id, day })} onDoubleClick={() => cycleAttendanceCell(row.employee.id, day)} title={isConflict ? `Conflict schedule ${row.schedule[day - 1]} vs attendance masuk` : cell.note || attendanceStatusLabel(cell.status)}>{isConflict ? <span className="absolute right-1 top-1 text-[10px]">!</span> : null}<span>{attendanceStatusLabel(cell.status)}</span>{cell.clockIn || cell.clockOut ? <span className="mt-1 block font-mono text-[10px]">{cell.clockIn || "--:--"}-{cell.clockOut || "--:--"}</span> : null}</button></td>;
                })}</tr>)}</tbody>
              </table>
            </div>
          </Card>
          <Card className="surface-module-card rounded-[1rem] border-0 p-4">
            <p className="font-semibold text-foreground">Input manual cepat</p>
            <p className="mt-1 text-sm text-muted-foreground">Klik cell untuk edit jam/status. Double-click untuk cycle: Masuk → Sakit → Izin → Alpha → -. Excel mendukung kolom `Nama`, `D1..D31`, `Masuk 1`, `Pulang 1`.</p>
          </Card>
        </TabsContent>

        <TabsContent value="permanent" className="space-y-3">
          <Card className="surface-module-card rounded-[1rem] border-0 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">Schedule Tetap</p>
                <p className="mt-1 text-sm text-muted-foreground">Generated dari tab Schedule. Klik cell untuk edit, lalu save di sini sebagai final tetap.</p>
                {scheduleSavedAt ? <p className="mt-1 text-xs text-muted-foreground">Terakhir save: {scheduleSavedAt}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <TabExportActions tabTitle="Schedule Tetap" tableRows={permanentRows} />
                <Button disabled={permanentRows.length === 0 || isSavingSchedule || isFinalized} onClick={savePermanentSchedule}>
                  <Save className="mr-2 size-4" /> {isSavingSchedule ? "Menyimpan..." : "Save Schedule Tetap"}
                </Button>
              </div>
            </div>
          </Card>
          <div className="space-y-5">
            {sectionOptions.map((section) => renderRosterTable(permanentRows, section, "fixed", cyclePermanentCell))}
          </div>
        </TabsContent>

        <TabsContent value="field-break" className="space-y-4">
          <Card className="surface-module-card flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border-0 p-3">
            <div><p className="font-semibold text-foreground">Schedule Field Break</p><p className="text-sm text-muted-foreground">Atur estimasi FB per karyawan, simpan ke database, lalu sync ke Schedule dan Schedule Tetap.</p></div>
            <TabExportActions tabTitle="Schedule Field Break" columns={["Nama", "Section", "Roster", "On Site", "Day", "FB", "Updated"]} exportRows={fieldBreakRows.map((row) => [row.employee.name, row.sectionLabel, rosterSectionLabel(row.rosterSection), formatShortDate(row.onSiteDate), row.dayCount, formatShortDate(row.fieldBreakDate), row.savedAt ? new Date(row.savedAt).toLocaleString("id-ID") : "Belum tersimpan"])} />
          </Card>
          <Card className="surface-module-card rounded-[1.2rem] border-0 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_160px_160px_auto] lg:items-end">
              <div className="space-y-2">
                <Label>Site Field Break</Label>
                <Select value={fieldBreakSiteId} onValueChange={setFieldBreakSiteId}>
                  <SelectTrigger><SelectValue placeholder="Pilih site" /></SelectTrigger>
                  <SelectContent>{sites.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Minggu Masuk</Label>
                <Input min={1} type="number" value={fieldBreakWorkWeeks} onChange={(event) => setFieldBreakWorkWeeks(Number(event.target.value || 1))} />
              </div>
              <div className="space-y-2">
                <Label>Minggu Libur</Label>
                <Input min={1} type="number" value={fieldBreakRestWeeks} onChange={(event) => setFieldBreakRestWeeks(Number(event.target.value || 1))} />
              </div>
              <Button className="h-10" disabled={isSavingFieldBreak || fieldBreakRows.length === 0 || isFinalized} onClick={syncFieldBreakPlansToDatabase}>{isSavingFieldBreak ? "Menyimpan..." : "Simpan DB + Sync"}</Button>
            </div>
          </Card>
          <Card className="surface-module-card overflow-hidden rounded-[1.2rem] border-0 p-0">
            <div className="overflow-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead><tr className="bg-surface-container-low text-left text-xs uppercase tracking-[0.12em] text-muted-foreground"><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Section</th><th className="px-4 py-3">Roster</th><th className="px-4 py-3">On Site</th><th className="px-4 py-3">Day</th><th className="px-4 py-3">FB</th></tr></thead>
                <tbody>{fieldBreakRows.map((row) => <tr key={row.employee.id} className="border-b border-slate-100 hover:bg-muted/35"><td className="px-4 py-3 font-medium">{row.employee.name}</td><td className="px-4 py-3">{row.sectionLabel}</td><td className="px-4 py-3">{rosterSectionLabel(row.rosterSection)}</td><td className="px-4 py-3"><Input type="date" value={row.onSiteDate} onChange={(event) => updateFieldBreakDraft(row.employee.id, "onSiteDate", event.target.value)} /></td><td className="px-4 py-3"><Input min={1} type="number" value={row.dayCount} onChange={(event) => updateFieldBreakDraft(row.employee.id, "dayCount", event.target.value)} /></td><td className="px-4 py-3 font-semibold">{formatShortDate(row.fieldBreakDate)}</td></tr>)}</tbody>
              </table>
            </div>
          </Card>
          <SummaryTable columns={["Nama", "Section", "Roster", "On Site", "Day", "FB", "History"]} rows={fieldBreakRows.map((row) => [row.employee.name, row.sectionLabel, rosterSectionLabel(row.rosterSection), formatShortDate(row.onSiteDate), row.dayCount, formatShortDate(row.fieldBreakDate), row.savedAt ? `Tersimpan ${new Date(row.savedAt).toLocaleString("id-ID")}` : "Belum tersimpan"])} />
        </TabsContent>

        <TabsContent value="allowance" className="space-y-4">
          <Card className="surface-module-card flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border-0 p-3">
            <div><p className="font-semibold text-foreground">Export MSA + Meals</p><p className="text-sm text-muted-foreground">Export khusus tab allowance.</p></div>
            <TabExportActions tabTitle="MSA Meals" columns={["Employee", "Jabatan", "Staff", "Hari MSA", "FB", "MSA", "Meals", "Total"]} exportRows={rows.map((row) => [row.employee.name, row.employee.role, row.staff ? "Staff" : "Non Staff", row.workDays, row.fieldBreakDays, money(row.msa), money(row.meals), money(row.msa + row.meals)])} />
          </Card>
          <SummaryTable columns={["Employee", "Jabatan", "Staff", "Hari MSA", "FB", "MSA", "Meals", "Total"]} rows={rows.map((row) => [row.employee.name, row.employee.role, row.staff ? "Staff" : "Non Staff", row.workDays, row.fieldBreakDays, money(row.msa), money(row.meals), money(row.msa + row.meals)])} />
        </TabsContent>

        <TabsContent value="overtime" className="space-y-4">
          <Card className="surface-module-card flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border-0 p-3">
            <div><p className="font-semibold text-foreground">Export Overtime</p><p className="text-sm text-muted-foreground">Overtime otomatis dari Attendance Real: jam pulang - jam masuk, lalu dibandingkan jam dasar schedule.</p></div>
            <TabExportActions tabTitle="Overtime" columns={["Employee", "Jabatan", "Jam Attendance Real", "Jam Dasar", "Overtime", "Roster"]} exportRows={attendanceOvertimeRows.map((row) => [row.employee.name, row.employee.role, row.attendanceTotalHours, row.attendanceBaseHours, row.attendanceOvertime, roster])} />
          </Card>
          <SummaryTable columns={["Employee", "Jabatan", "Jam Attendance Real", "Jam Dasar", "Overtime", "Roster"]} rows={attendanceOvertimeRows.map((row) => [row.employee.name, row.employee.role, row.attendanceTotalHours, row.attendanceBaseHours, row.attendanceOvertime, roster])} />
          <div className="grid gap-3 lg:grid-cols-3">
            {overtimeRules.map((rule) => <Card key={rule.roster} className="surface-module-card rounded-[1rem] border-0 p-4"><p className="font-semibold">{rule.roster}</p><p className="mt-2 text-sm text-muted-foreground">Hari kerja: {rule.work}</p><p className="text-sm text-muted-foreground">Hari libur: {rule.off}</p></Card>)}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={selectedAttendanceCell !== null} onOpenChange={(open) => !open && setSelectedAttendanceCell(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Attendance Real {selectedAttendanceEmployee?.name}</DialogTitle>
          </DialogHeader>
          {selectedAttendanceCell && selectedAttendanceValue ? (
            <div className="grid gap-4 py-2">
              <div className="rounded-2xl bg-surface-container-low p-3 text-sm text-muted-foreground">
                Tanggal {selectedAttendanceCell.day} • jam ini dipakai otomatis untuk hitung Overtime.
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2"><Label>Status</Label><Select value={selectedAttendanceValue.status} onValueChange={(value) => updateAttendanceCell(selectedAttendanceCell.employeeId, selectedAttendanceCell.day, { status: value as AttendanceCellStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="present">Masuk</SelectItem><SelectItem value="sick">Sakit</SelectItem><SelectItem value="leave">Izin</SelectItem><SelectItem value="absent">Alpha</SelectItem><SelectItem value="empty">-</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Jam Masuk</Label><Input type="time" value={selectedAttendanceValue.clockIn} onChange={(event) => updateAttendanceCell(selectedAttendanceCell.employeeId, selectedAttendanceCell.day, { clockIn: event.target.value, status: event.target.value ? "present" : selectedAttendanceValue.status })} /></div>
                <div className="space-y-2"><Label>Jam Pulang</Label><Input type="time" value={selectedAttendanceValue.clockOut} onChange={(event) => updateAttendanceCell(selectedAttendanceCell.employeeId, selectedAttendanceCell.day, { clockOut: event.target.value, status: event.target.value ? "present" : selectedAttendanceValue.status })} /></div>
              </div>
              <div className="space-y-2"><Label>Catatan</Label><Input value={selectedAttendanceValue.note} onChange={(event) => updateAttendanceCell(selectedAttendanceCell.employeeId, selectedAttendanceCell.day, { note: event.target.value })} placeholder="Face loc / izin / sakit / manual" /></div>
              <div className="flex justify-end"><Button onClick={() => setSelectedAttendanceCell(null)}>Simpan</Button></div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={selectedEmployeeId !== null} onOpenChange={(open) => !open && setSelectedEmployeeId(null)}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Edit Schedule {selectedEmployee?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="rounded-xl bg-surface-container-low p-3 text-sm text-muted-foreground">
              Tukar libur akan menukar status hari dengan pengganti terpilih. Section Roster bisa memindahkan orang ke Roster Serviceman, Crew Office, atau Crew Repair.
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Section Roster</Label>
                <Select value={profileSection} onValueChange={handleProfileSectionChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{sectionOptions.map((section) => <SelectItem key={section} value={section}>{rosterSectionLabel(section)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Posisi On Site</Label>
                <Select value={profilePositionOnSite} onValueChange={setProfilePositionOnSite}>
                  <SelectTrigger><SelectValue placeholder="Pilih posisi on site" /></SelectTrigger>
                  <SelectContent>{positionOptionsForSection(profileSection).map((position) => <SelectItem key={position} value={position}>{position}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>KIMPER LV</Label>
                <Select value={profileKimperLv ? "yes" : "no"} onValueChange={(value) => setProfileKimperLv(value === "yes")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="yes">Ada</SelectItem><SelectItem value="no">Tidak</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>KIMPER TH</Label>
                <Select value={profileKimperTh ? "yes" : "no"} onValueChange={(value) => setProfileKimperTh(value === "yes")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="yes">Ada</SelectItem><SelectItem value="no">Tidak</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tukar Libur Dari</Label>
                <Input type="date" value={leaveFrom} onChange={(event) => setLeaveFrom(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tukar Libur Sampai</Label>
                <Input type="date" value={leaveTo} onChange={(event) => setLeaveTo(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Field Break Dari</Label>
                <Input type="date" value={fieldBreakFrom} onChange={(event) => setFieldBreakFrom(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Field Break Sampai</Label>
                <Input type="date" value={fieldBreakTo} onChange={(event) => setFieldBreakTo(event.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pengganti / Backup</Label>
              <Select value={backupEmployeeId} onValueChange={setBackupEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Pilih nama karyawan backup" /></SelectTrigger>
                <SelectContent>
                  {visibleEmployees.filter((employee) => employee.id !== selectedEmployeeId).map((employee) => (
                    <SelectItem key={employee.id} value={String(employee.id)}>{employee.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedEmployeeId(null)}>Batal</Button>
              <Button onClick={applyEmployeeEdit}>Simpan Schedule</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AttendanceImportPreviewDialog open={Boolean(attendanceImportPreview)} preview={attendanceImportPreview} mode={attendanceImportMode} disabled={isSavingAttendance || isFinalized} onModeChange={setAttendanceImportMode} onApply={applyAttendanceImportPreview} onDiscard={discardAttendanceImportPreview} onRequestClose={() => setDiscardImportDialogOpen(true)} />
      <AlertDialog open={discardImportDialogOpen} onOpenChange={setDiscardImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Discard import preview?</AlertDialogTitle><AlertDialogDescription>Preview data will be removed. Imported attendance will not be applied.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={discardAttendanceImportPreview}>Discard preview</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={overwriteImportDialogOpen} onOpenChange={setOverwriteImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Overwrite attendance conflicts?</AlertDialogTitle><AlertDialogDescription>{attendanceImportPreview?.conflictCount ?? 0} conflicting cells will overwrite current values.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { setOverwriteImportDialogOpen(false); confirmApplyAttendanceImportPreview(); }}>Overwrite conflicts</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Finalize period</DialogTitle></DialogHeader>
          <div className="space-y-3"><Alert><Lock className="h-4 w-4" /><AlertDescription>Finalized periods are locked for schedule, attendance, import, and settings edits.</AlertDescription></Alert><Input placeholder="Reason (optional)" value={finalizeReason} onChange={(event) => setFinalizeReason(event.target.value)} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setFinalizeDialogOpen(false)}>Cancel</Button><Button onClick={submitFinalizePeriod} disabled={isSavingSchedule}>Finalize</Button></div></div>
        </DialogContent>
      </Dialog>
      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reopen period</DialogTitle></DialogHeader>
          <div className="space-y-3"><Alert><AlertDescription>Reopening is audited. Enter a reason before unlocking edits.</AlertDescription></Alert><Input placeholder="Reason required" value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setReopenDialogOpen(false)}>Cancel</Button><Button onClick={submitReopenPeriod} disabled={isSavingSchedule || !reopenReason.trim()}>Reopen</Button></div></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryTable({ columns, rows }: { columns: string[]; rows: Array<Array<string | number>> }) {
  return (
    <Card className="surface-module-card overflow-hidden rounded-[1.2rem] border-0 p-0">
      <div className="overflow-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="bg-surface-container-low text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">{columns.map((column) => <th key={column} className="px-4 py-3 font-semibold">{column}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index} className="border-b border-slate-100 hover:bg-muted/35">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3">{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </Card>
  );
}
