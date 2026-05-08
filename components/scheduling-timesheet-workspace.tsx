"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CalendarDays, Calculator, Check, Clock3, Download, RefreshCw, Save, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveSchedulingTimesheetPlanAction } from "@/app/dashboard/admin-actions";

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

const sectionOptions = ["Service Operation", "Repair/Retread", "Crew Office"];

const codeCycle: ScheduleCode[] = ["IN", "DS", "NS", "OFF", "FB", "Libur", "Sakit", "Emergency"];

const projectRates = [
  { project: "CK BIB", msaStaff: 45000, msaNonStaff: 35000, mealsStaff: 30000, mealsNonStaff: 30000 },
  { project: "CK BMB", msaStaff: 40000, msaNonStaff: 30000, mealsStaff: 50000, mealsNonStaff: 50000 },
  { project: "Vale Sorowako", msaStaff: 60000, msaNonStaff: 60000, mealsStaff: 0, mealsNonStaff: 30000 },
  { project: "Tanjung Adaro", msaStaff: 40000, msaNonStaff: 30000, mealsStaff: 60000, mealsNonStaff: 50000 },
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
  if (normalized.includes("service") || normalized.includes("serviceman") || normalized.includes("operation")) return "Service Operation";
  if (normalized.includes("repair") || normalized.includes("retread")) return "Repair/Retread";

  return "Crew Office";
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
  if (code === "IN") return "bg-white text-emerald-700 hover:bg-emerald-50";
  if (code === "DS") return "bg-sky-100 text-sky-800 hover:bg-sky-200";
  if (code === "NS") return "bg-indigo-600 text-white hover:bg-indigo-700";
  if (code === "OFF") return "bg-red-500 text-white";
  if (code === "FB") return "bg-yellow-300 text-slate-950";
  if (code === "Libur") return "bg-slate-100 text-slate-700";
  if (code === "Sakit") return "bg-fuchsia-200 text-fuchsia-950";
  return "bg-pink-300 text-pink-950";
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

export function SchedulingTimesheetWorkspace({ employees, sites, savedPlans = [] }: { employees: EmployeeOption[]; sites: SiteOption[]; savedPlans?: SavedSchedulingPlan[] }) {
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
  const [siteScheduleTypes, setSiteScheduleTypes] = useState<Record<string, SiteScheduleType>>({});
  const [isSavingSchedule, startSavingSchedule] = useTransition();
  const dayCount = daysInMonth(period);
  const days = Array.from({ length: dayCount }, (_, index) => index + 1);
  const site = sites.find((item) => String(item.id) === siteId);
  const rate = projectRates.find((item) => item.project === site?.name) ?? projectRates[0];
  const savedPlan = savedPlans.find((plan) => String(plan.siteId) === siteId && plan.period === period);

  useEffect(() => {
    if (!savedPlan) return;

    const nextDraftOverrides: Record<string, ScheduleCode> = {};
    const nextPermanentBase: Record<string, ScheduleCode> = {};

    savedPlan.draftSchedule.forEach((row) => row.schedule.forEach((code, index) => {
      if (codeCycle.includes(code as ScheduleCode)) nextDraftOverrides[`${row.employeeId}-${index + 1}`] = code as ScheduleCode;
    }));
    savedPlan.fixedSchedule.forEach((row) => row.schedule.forEach((code, index) => {
      if (codeCycle.includes(code as ScheduleCode)) nextPermanentBase[`${row.employeeId}-${index + 1}`] = code as ScheduleCode;
    }));

    setOverrides(nextDraftOverrides);
    setPermanentBase(nextPermanentBase);
    setPermanentOverrides({});
    setEmployeeProfiles(Object.fromEntries((savedPlan.employeeProfiles ?? []).map((profile) => {
      const employee = employees.find((item) => item.id === profile.employeeId);
      const detectedSection = normalizeRosterSection(employee?.section || employee?.role);
      const section = profile.section === "Crew Office" && detectedSection !== "Crew Office" ? detectedSection : profile.section;

      return [profile.employeeId, { ...profile, section }];
    })));
    setIsGenerated(true);
    setScheduleSavedAt(new Date(savedPlan.updatedAt).toLocaleString("id-ID"));
    setSiteScheduleTypes((current) => ({ ...current, [siteId]: savedPlan.siteScheduleType === "shift" ? "shift" : "office" }));
    if (savedPlan.fieldBreakConfig) {
      setFieldBreakConfigs((current) => ({
        ...current,
        [siteId]: { siteId, workWeeks: savedPlan.fieldBreakConfig?.workWeeks ?? 1, breakWeeks: savedPlan.fieldBreakConfig?.breakWeeks ?? 1 },
      }));
    }
  }, [savedPlan, siteId]);

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

  const rows = visibleEmployees.map((employee, employeeIndex) => {
    const schedule = days.map((day) => {
      const fieldBreakConfig = fieldBreakConfigs[String(employee.siteId ?? siteId)];
      const fieldBreakCode = fieldBreakConfig ? buildFieldBreakSchedule(day, fieldBreakConfig.workWeeks, fieldBreakConfig.breakWeeks) : null;
      const scheduleType = siteScheduleTypes[siteId] ?? "office";

      return overrides[`${employee.id}-${day}`] ?? fieldBreakCode ?? buildSchedule(employeeIndex, day, scheduleType, period);
    });
    const workDays = schedule.filter((code) => code === "IN" || code === "DS" || code === "NS" || code === "FB").length;
    const fieldBreakDays = schedule.filter((code) => code === "FB").length;
    const totalHours = schedule.reduce((sum, code) => sum + hoursFromCode(code), 0);
    const staff = /manager|supervisor|lead|staff|admin/i.test(employee.role);
    const msa = workDays * (staff ? rate.msaStaff : rate.msaNonStaff);
    const meals = fieldBreakDays * (staff ? rate.mealsStaff : rate.mealsNonStaff);
    const overtime = 0;
    const profile = employeeProfiles[employee.id] ?? {
      employeeId: employee.id,
      section: normalizeRosterSection(employee.section || employee.role),
      positionOnSite: employee.role || "Crew",
      kimperLv: false,
      kimperTh: false,
    };
    return { employee, schedule, workDays, fieldBreakDays, totalHours, staff, msa, meals, overtime, profile };
  });

  const permanentRows = rows.map((row) => ({
    ...row,
    schedule: row.schedule.map((code, index) => permanentOverrides[`${row.employee.id}-${index + 1}`] ?? permanentBase[`${row.employee.id}-${index + 1}`] ?? code),
  })).map((row) => ({
    ...row,
    workDays: row.schedule.filter((code) => code === "IN" || code === "DS" || code === "NS" || code === "FB").length,
    fieldBreakDays: row.schedule.filter((code) => code === "FB").length,
    totalHours: row.schedule.reduce((sum, code) => sum + hoursFromCode(code), 0),
  }));
  const dailyShiftTotals = days.map((day, index) => ({
    day,
    ds: rows.filter((row) => row.schedule[index] === "DS").length,
    ns: rows.filter((row) => row.schedule[index] === "NS").length,
  }));
  const permanentDailyShiftTotals = days.map((day, index) => ({
    day,
    ds: permanentRows.filter((row) => row.schedule[index] === "DS").length,
    ns: permanentRows.filter((row) => row.schedule[index] === "NS").length,
  }));

  const selectedEmployee = visibleEmployees.find((employee) => employee.id === selectedEmployeeId) ?? null;
  const selectedCode = selectedCell ? overrides[`${selectedCell.employeeId}-${selectedCell.day}`] ?? rows.find((row) => row.employee.id === selectedCell.employeeId)?.schedule[selectedCell.day - 1] : undefined;

  function cycleCell(employeeId: number, day: number) {
    const key = `${employeeId}-${day}`;
    const current = overrides[key] ?? rows.find((row) => row.employee.id === employeeId)?.schedule[day - 1] ?? "IN";
    const next = codeCycle[(codeCycle.indexOf(current) + 1) % codeCycle.length];
    setOverrides((currentOverrides) => ({ ...currentOverrides, [key]: next }));
    setSelectedCell({ employeeId, day });
  }

  function cyclePermanentCell(employeeId: number, day: number) {
    const key = `${employeeId}-${day}`;
    const current = permanentOverrides[key] ?? permanentRows.find((row) => row.employee.id === employeeId)?.schedule[day - 1] ?? "IN";
    const next = codeCycle[(codeCycle.indexOf(current) + 1) % codeCycle.length];

    setPermanentOverrides((currentOverrides) => ({ ...currentOverrides, [key]: next }));
  }

  function saveScheduleToPermanent() {
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

  function setSelectedCode(code: ScheduleCode) {
    if (!selectedCell) return;
    setOverrides((currentOverrides) => ({ ...currentOverrides, [`${selectedCell.employeeId}-${selectedCell.day}`]: code }));
  }

  function openEmployeeForm(employeeId: number) {
    const employee = visibleEmployees.find((item) => item.id === employeeId);
    const profile = employeeProfiles[employeeId];
    setSelectedEmployeeId(employeeId);
    setProfileSection(profile?.section ?? "Crew Office");
    setProfilePositionOnSite(profile?.positionOnSite ?? employee?.role ?? "Crew");
    setProfileKimperLv(profile?.kimperLv ?? false);
    setProfileKimperTh(profile?.kimperTh ?? false);
    setLeaveFrom("");
    setLeaveTo("");
    setFieldBreakFrom("");
    setFieldBreakTo("");
    setBackupEmployeeId("");
  }

  function exportPdf() {
    const title = `Scheduling Time Sheet - ${site?.name ?? "Semua Site"} - ${period}`;
    const scheduleRows = rows.map((row) => `
      <tr>
        <td>${row.employee.name}</td>
        <td>${row.employee.id}</td>
        <td>${row.employee.locationName || site?.name || "-"}</td>
        ${row.schedule.map((code) => `<td class="cell ${code.toLowerCase()}">${code === "IN" ? "✓" : code}</td>`).join("")}
        <td>${row.totalHours}</td>
      </tr>
    `).join("");
    const dayHeaders = days.map((day) => `<th>${day}</th>`).join("");
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
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; }
            h1 { font-size: 18px; margin: 0 0 4px; }
            p { margin: 0 0 12px; color: #475569; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; font-size: 9px; page-break-inside: auto; }
            th { background: #84cc16; color: #0f172a; }
            th:first-child, td:first-child { text-align: left; min-width: 120px; }
            th, td { border: 1px solid #94a3b8; padding: 4px; text-align: center; }
            .cell.in { color: #047857; font-weight: 700; }
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
          <p>Roster: ${roster} • Karyawan: ${rows.length} • Total jam: ${rows.reduce((sum, row) => sum + row.totalHours, 0)}</p>
          <table>
            <thead><tr><th>Name</th><th>SN</th><th>LOC</th>${dayHeaders}<th>Total</th></tr></thead>
            <tbody>${scheduleRows}</tbody>
          </table>
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
  function applyEmployeeEdit() {
    if (!selectedEmployee) return;
    const backup = visibleEmployees.find((employee) => String(employee.id) === backupEmployeeId) ?? null;
    const nextOverrides: Record<string, ScheduleCode> = {};
    const leaveDays = dateRangeDays(leaveFrom, leaveTo, period, dayCount);
    const fieldBreakDays = dateRangeDays(fieldBreakFrom, fieldBreakTo, period, dayCount);

    for (const day of leaveDays) nextOverrides[`${selectedEmployee.id}-${day}`] = "Libur";
    for (const day of fieldBreakDays) nextOverrides[`${selectedEmployee.id}-${day}`] = "FB";
    if (backup) {
      for (const day of [...leaveDays, ...fieldBreakDays]) nextOverrides[`${backup.id}-${day}`] = "IN";
    }

    setOverrides((currentOverrides) => ({ ...currentOverrides, ...nextOverrides }));
    setEmployeeProfiles((currentProfiles) => ({
      ...currentProfiles,
      [selectedEmployee.id]: {
        employeeId: selectedEmployee.id,
        section: profileSection,
        positionOnSite: profilePositionOnSite || selectedEmployee.role || "Crew",
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

  return (
    <div className="space-y-4">
      <Card className="surface-module-card rounded-[1.2rem] border-0 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
          <div className="space-y-2">
            <Label>Site</Label>
            <Select value={siteId} onValueChange={setSiteId}>
              <SelectTrigger><SelectValue placeholder="Pilih site" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Pilih site dahulu</SelectItem>
                {sites.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Periode</Label>
            <Input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tipe Site</Label>
            <Select value={siteScheduleTypes[siteId] ?? "office"} onValueChange={(value) => setSiteScheduleTypes((current) => ({ ...current, [siteId]: value as SiteScheduleType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="office">Office / Non Shift</SelectItem>
                <SelectItem value="shift">Shift DS / NS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rooster</Label>
            <Select value={roster} onValueChange={setRoster}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="5:2">Rooster 5 : 2</SelectItem>
                <SelectItem value="6:1">Rooster 6 : 1</SelectItem>
                <SelectItem value="vale">Vale Sorowako</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="h-10" disabled={siteId === "all"} onClick={() => { setOverrides({}); setPermanentOverrides({}); setSelectedCell(null); setIsGenerated(true); }}>
              <RefreshCw className="mr-2 size-4" /> Generate Auto Scheduling
            </Button>
            <Button className="h-10" variant="outline" disabled={rows.length === 0} onClick={exportPdf}>
              <Download className="mr-2 size-4" /> Export PDF
            </Button>
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
          <Card key={label} className="surface-module-card rounded-[1.1rem] border-0 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-2xl font-semibold text-foreground">{String(value)}</p>
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
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-surface-container-low p-1 lg:w-[920px] lg:grid-cols-5">
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="permanent">Schedule Tetap</TabsTrigger>
          <TabsTrigger value="field-break">Schedule Field Break</TabsTrigger>
          <TabsTrigger value="allowance">MSA + Meals</TabsTrigger>
          <TabsTrigger value="overtime">Overtime</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-3">
          <Card className="surface-module-card flex flex-wrap items-center justify-between gap-3 rounded-[1rem] border-0 p-3">
            <div>
              <p className="font-semibold text-foreground">Save Schedule ke Schedule Tetap</p>
              <p className="text-sm text-muted-foreground">Generate/edit draft dulu, lalu save agar jadi baseline Schedule Tetap.</p>
            </div>
            <Button disabled={rows.length === 0 || isSavingSchedule} onClick={saveScheduleToPermanent}>
              <Save className="mr-2 size-4" /> {isSavingSchedule ? "Menyimpan..." : "Save ke Schedule Tetap"}
            </Button>
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
          <Card className="surface-module-card overflow-hidden rounded-[1.2rem] border-0 p-0">
            <div className="overflow-auto">
              <table className="min-w-max border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="sticky left-0 z-20 min-w-44 bg-slate-800 px-3 py-2 text-left">Name</th>
                    <th className="min-w-16 px-3 py-2">LV</th>
                    <th className="min-w-16 px-3 py-2">TH</th>
                    <th className="min-w-24 px-3 py-2">SN</th>
                    <th className="min-w-36 px-3 py-2">Posisi On Site</th>
                    {days.map((day) => <th key={day} className="min-w-12 border-l border-slate-600 bg-lime-500 px-2 py-2 text-slate-950"><div>{weekdayLabel(period, day)}</div><div className="font-normal">{day}</div></th>)}
                    <th className="min-w-20 px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionOptions.map((section) => {
                    const sectionRows = rows.filter((row) => row.profile.section === section);
                    if (sectionRows.length === 0) return null;

                    return [
                      <tr key={`${section}-header`} className="bg-slate-950 text-white"><td colSpan={days.length + 6} className="px-3 py-2 font-semibold uppercase tracking-[0.14em]">ROSTER CREW {section} {period}</td></tr>,
                      ...sectionRows.map((row) => (
                        <tr key={row.employee.id} className="border-b border-slate-200">
                          <td className="sticky left-0 z-10 bg-white px-3 py-2 font-semibold"><button className="text-left font-semibold text-slate-900 underline-offset-4 hover:underline" onClick={() => openEmployeeForm(row.employee.id)}>{row.employee.name}</button></td>
                          <td className="px-3 py-2 text-center">{row.profile.kimperLv ? "✓" : ""}</td>
                          <td className="px-3 py-2 text-center">{row.profile.kimperTh ? "✓" : ""}</td>
                          <td className="px-3 py-2 text-center">{row.employee.id}</td>
                          <td className="px-3 py-2 text-center">{row.profile.positionOnSite}</td>
                          {row.schedule.map((code, index) => <td key={`${row.employee.id}-${index}`} className="border-l border-slate-200 p-0 text-center"><button className={`h-8 w-full px-2 font-medium ${codeClass(code)}`} onClick={() => cycleCell(row.employee.id, index + 1)}>{codeLabel(code)}</button></td>)}
                          <td className="px-3 py-2 text-center font-semibold">{row.totalHours}</td>
                        </tr>
                      )),
                    ];
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-sky-50 font-semibold text-sky-900">
                    <td className="sticky left-0 z-10 bg-sky-50 px-3 py-2 text-left">Total DS</td>
                    <td colSpan={4} className="px-3 py-2 text-center">Day Shift</td>
                    {dailyShiftTotals.map((item) => <td key={`ds-${item.day}`} className="border-l border-slate-200 px-2 py-2 text-center">{item.ds}</td>)}
                    <td className="px-3 py-2 text-center">{dailyShiftTotals.reduce((sum, item) => sum + item.ds, 0)}</td>
                  </tr>
                  <tr className="border-t border-slate-200 bg-indigo-50 font-semibold text-indigo-900">
                    <td className="sticky left-0 z-10 bg-indigo-50 px-3 py-2 text-left">Total NS</td>
                    <td colSpan={4} className="px-3 py-2 text-center">Night Shift</td>
                    {dailyShiftTotals.map((item) => <td key={`ns-${item.day}`} className="border-l border-slate-200 px-2 py-2 text-center">{item.ns}</td>)}
                    <td className="px-3 py-2 text-center">{dailyShiftTotals.reduce((sum, item) => sum + item.ns, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
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
              <Button disabled={permanentRows.length === 0 || isSavingSchedule} onClick={savePermanentSchedule}>
                <Save className="mr-2 size-4" /> {isSavingSchedule ? "Menyimpan..." : "Save Schedule Tetap"}
              </Button>
            </div>
          </Card>
          <Card className="surface-module-card overflow-hidden rounded-[1.2rem] border-0 p-0">
            <div className="overflow-auto">
              <table className="min-w-max border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="sticky left-0 z-20 min-w-44 bg-slate-800 px-3 py-2 text-left">Name</th>
                    <th className="min-w-16 px-3 py-2">LV</th>
                    <th className="min-w-16 px-3 py-2">TH</th>
                    <th className="min-w-24 px-3 py-2">SN</th>
                    <th className="min-w-36 px-3 py-2">Posisi On Site</th>
                    {days.map((day) => <th key={day} className="min-w-12 border-l border-slate-600 bg-lime-500 px-2 py-2 text-slate-950"><div>{weekdayLabel(period, day)}</div><div className="font-normal">{day}</div></th>)}
                    <th className="min-w-20 px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionOptions.map((section) => {
                    const sectionRows = permanentRows.filter((row) => row.profile.section === section);
                    if (sectionRows.length === 0) return null;

                    return [
                      <tr key={`${section}-fixed-header`} className="bg-slate-950 text-white"><td colSpan={days.length + 6} className="px-3 py-2 font-semibold uppercase tracking-[0.14em]">ROSTER CREW {section} {period}</td></tr>,
                      ...sectionRows.map((row) => (
                        <tr key={row.employee.id} className="border-b border-slate-200">
                          <td className="sticky left-0 z-10 bg-white px-3 py-2 font-semibold"><button className="text-left font-semibold text-slate-900 underline-offset-4 hover:underline" onClick={() => openEmployeeForm(row.employee.id)}>{row.employee.name}</button></td>
                          <td className="px-3 py-2 text-center">{row.profile.kimperLv ? "✓" : ""}</td>
                          <td className="px-3 py-2 text-center">{row.profile.kimperTh ? "✓" : ""}</td>
                          <td className="px-3 py-2 text-center">{row.employee.id}</td>
                          <td className="px-3 py-2 text-center">{row.profile.positionOnSite}</td>
                          {row.schedule.map((code, index) => <td key={`${row.employee.id}-fixed-${index}`} className="border-l border-slate-200 p-0 text-center"><button className={`h-8 w-full px-2 font-medium ${codeClass(code)}`} onClick={() => cyclePermanentCell(row.employee.id, index + 1)}>{codeLabel(code)}</button></td>)}
                          <td className="px-3 py-2 text-center font-semibold">{row.totalHours}</td>
                        </tr>
                      )),
                    ];
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 bg-sky-50 font-semibold text-sky-900">
                    <td className="sticky left-0 z-10 bg-sky-50 px-3 py-2 text-left">Total DS</td>
                    <td colSpan={4} className="px-3 py-2 text-center">Day Shift</td>
                    {permanentDailyShiftTotals.map((item) => <td key={`fixed-ds-${item.day}`} className="border-l border-slate-200 px-2 py-2 text-center">{item.ds}</td>)}
                    <td className="px-3 py-2 text-center">{permanentDailyShiftTotals.reduce((sum, item) => sum + item.ds, 0)}</td>
                  </tr>
                  <tr className="border-t border-slate-200 bg-indigo-50 font-semibold text-indigo-900">
                    <td className="sticky left-0 z-10 bg-indigo-50 px-3 py-2 text-left">Total NS</td>
                    <td colSpan={4} className="px-3 py-2 text-center">Night Shift</td>
                    {permanentDailyShiftTotals.map((item) => <td key={`fixed-ns-${item.day}`} className="border-l border-slate-200 px-2 py-2 text-center">{item.ns}</td>)}
                    <td className="px-3 py-2 text-center">{permanentDailyShiftTotals.reduce((sum, item) => sum + item.ns, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="field-break" className="space-y-4">
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
              <Button className="h-10" onClick={saveFieldBreakConfig}>Sync Schedule</Button>
            </div>
          </Card>
          <SummaryTable columns={["Site", "Minggu Masuk", "Minggu Libur", "Status"]} rows={Object.values(fieldBreakConfigs).map((config) => [sites.find((item) => String(item.id) === config.siteId)?.name ?? config.siteId, config.workWeeks, config.breakWeeks, "Sync ke Schedule + Schedule Tetap"])} />
        </TabsContent>

        <TabsContent value="allowance">
          <SummaryTable columns={["Employee", "Jabatan", "Staff", "Hari MSA", "FB", "MSA", "Meals", "Total"]} rows={rows.map((row) => [row.employee.name, row.employee.role, row.staff ? "Staff" : "Non Staff", row.workDays, row.fieldBreakDays, money(row.msa), money(row.meals), money(row.msa + row.meals)])} />
        </TabsContent>

        <TabsContent value="overtime" className="space-y-4">
          <SummaryTable columns={["Employee", "Jabatan", "Total Jam", "Jam Dasar", "Overtime", "Roster"]} rows={rows.map((row) => [row.employee.name, row.employee.role, row.totalHours, row.workDays * 5, row.overtime, roster])} />
          <div className="grid gap-3 lg:grid-cols-3">
            {overtimeRules.map((rule) => <Card key={rule.roster} className="surface-module-card rounded-[1rem] border-0 p-4"><p className="font-semibold">{rule.roster}</p><p className="mt-2 text-sm text-muted-foreground">Hari kerja: {rule.work}</p><p className="text-sm text-muted-foreground">Hari libur: {rule.off}</p></Card>)}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={selectedEmployeeId !== null} onOpenChange={(open) => !open && setSelectedEmployeeId(null)}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Edit Schedule {selectedEmployee?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="rounded-xl bg-surface-container-low p-3 text-sm text-muted-foreground">
              Tukar libur akan set range menjadi `Libur`. Field break akan set range menjadi `FB`. Backup dipilih dari list karyawan site ini dan otomatis masuk list.
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Section Roster</Label>
                <Select value={profileSection} onValueChange={setProfileSection}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{sectionOptions.map((section) => <SelectItem key={section} value={section}>{section}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Posisi On Site</Label>
                <Input value={profilePositionOnSite} onChange={(event) => setProfilePositionOnSite(event.target.value)} placeholder="Foreman, Operator, Admin, dll" />
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
