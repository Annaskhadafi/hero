'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import * as XLSX from 'xlsx'
import Fuse from 'fuse.js'
import {
  CalendarDays,
  Calculator,
  Check,
  Clock3,
  Download,
  History,
  RefreshCw,
  Save,
  Settings2,
  Upload,
  Lock,
  Trash2,
  Undo2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  applyAttendanceImportPreviewAction,
  clearAttendanceRealOverridesAction,
  createAttendanceImportPreviewAction,
  discardAttendanceImportPreviewAction,
  finalizeSchedulingPeriodAction,
  getAttendanceImportHistoryAction,
  getIndonesiaHolidaysAction,
  reopenSchedulingPeriodAction,
  rollbackAttendanceImportPreviewAction,
  saveAttendanceRealOverridesAction,
  saveSchedulingConfigAction,
  saveSchedulingTimesheetPlanAction,
  saveTimesheetFieldBreakPlansAction,
  syncIndonesiaHolidaysAction,
  updateAttendanceImportPreviewMatchAction,
} from '@/app/dashboard/admin-actions'
import {
  applyHolidayPolicy,
  canSwapOff,
  classifyOvertimeDay,
  dateKey,
  daysInMonth,
  hoursFromCode,
  isHoliday,
  isWeekend,
  swapScheduleCodes,
  type HolidayLike,
} from '@/lib/timesheet-scheduling'
import { AttendanceRealBulkToolbar } from '@/components/timesheet/attendance-real-tab'
import { AttendanceImportPreviewDialog } from '@/components/timesheet/attendance-import-preview-dialog'
import { AttendanceSummaryBar } from '@/components/timesheet/attendance-summary-bar'
import { AttendanceSourceIndicator } from '@/components/timesheet/attendance-source-indicator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  attendanceStatusLabel,
  calculateAttendanceOvertime,
  normalizeAttendanceStatus,
  type AttendanceCellStatus,
} from '@/lib/timesheet/attendance-real'
import { parseAttendanceWorkbook } from '@/lib/timesheet/attendance-template-parser'
import type {
  AttendancePreviewConflict,
  AttendancePreviewRow,
} from '@/lib/timesheet/attendance-import'

type EmployeeOption = {
  id: number
  name: string
  email: string
  employeeSn?: string | null
  role: string
  department?: string | null
  section?: string | null
  siteId: number | null
  locationName?: string | null
}

type SiteOption = {
  id: number
  name: string
  customerName: string
}

type SavedScheduleRow = {
  employeeId: number
  schedule: string[]
}

type SavedSchedulingPlan = {
  siteId: number
  period: string
  siteScheduleType: string
  draftSchedule: SavedScheduleRow[]
  fixedSchedule: SavedScheduleRow[]
  employeeProfiles: EmployeeScheduleProfile[]
  fieldBreakConfig: { workWeeks: number; breakWeeks: number } | null
  updatedAt: string
}

type EmployeeScheduleProfile = {
  employeeId: number
  section: string
  positionOnSite: string
  kimperLv: boolean
  kimperTh: boolean
}

type ScheduleCode = 'IN' | 'DS' | 'NS' | 'OFF' | 'FB' | 'Libur' | 'Sakit' | 'Emergency'
type SiteScheduleType = 'shift' | 'office' | 'hybrid'
type SiteRosterType = '5:2' | '6:1' | 'vale'
type DefaultShiftType = 'day-shift' | 'night-shift'
type SiteMsaType = 'staff-nonstaff' | 'same-all' | 'none'
type SiteMealsType = 'field-break' | 'workday' | 'none'
type SiteOvertimeType = 'five-hour' | 'roster' | 'none'

type SiteSchedulingConfig = {
  scheduleType: SiteScheduleType
  rosterType: SiteRosterType
  msaType: SiteMsaType
  mealsType: SiteMealsType
  overtimeType: SiteOvertimeType
  defaultShiftType: DefaultShiftType
  defaultClockIn: string
  defaultClockOut: string
  defaultEarlyOvertimeHours: number
  defaultOvertimeEnd: string
  lokasiKhususRate: number
  lokasiKhususRateStaff: number
  lokasiKhususRateNonStaff: number
  lokasiKhususEnabled: boolean
}

type SavedFieldBreakPlan = {
  siteId: number
  period: string
  employeeId: number
  employeeName: string
  sectionName: string
  rosterSection: string
  onSiteDate: string
  dayCount: number | null
  fieldBreakDate: string
  updatedAt: string
}

type AttendanceRealRecord = {
  employeeId: number
  siteId: number
  eventType: string
  eventTime: string
  status: string
  locationNote: string
  photoUrl?: string | null
  latitude?: string | null
  longitude?: string | null
}

type ManualAttendanceCell = {
  status: AttendanceCellStatus
  clockIn: string
  clockOut: string
  note: string
  source?: 'attendance' | 'manual' | 'excel'
}

type SavedAttendanceOverride = {
  siteId: number
  period: string
  employeeId: number
  day: number
  status: string
  clockIn: string
  clockOut: string
  note: string
  source?: string
  updatedAt: string
}

type AttendanceImportHistoryItem = {
  id: number
  filename: string
  status: string
  matchedCount: number
  unmatchedCount: number
  cellCount: number
  conflictCount: number
  templateKind: string
  sheetName: string
  validationSummary: unknown
  createdAt: Date | string
  appliedAt: Date | string | null
  rolledBackAt: Date | string | null
}

type AllowanceVariable = {
  project: string
  msaStaff: number
  msaNonStaff: number
  mealsStaff: number
  mealsNonStaff: number
}
type OvertimeVariable = {
  roster: SiteRosterType
  dayType: 'work' | 'off'
  totalHours: number
  overtimeHours: number
}

type BackupAssignment = {
  id: string
  employeeName: string
  backupName: string
  type: 'Tukar Libur' | 'Field Break'
  dateRange: string
}

type FieldBreakDraft = {
  employeeId: number
  onSiteDate: string
  dayCount: number | null
  fieldBreakDate?: string
}

const sectionOptions = ['Service Operation', 'Repair Retread', 'Crew Office']
const employmentPositionLabels = [
  'permanent',
  'contract',
  'kontrak',
  'permanen',
  'staff',
  'non staff',
  'non-staff',
  'outsource',
]
const defaultPositionLabels = ['REPAIRMAN', 'TYREMAN', 'Operation']
const rosterSectionStyles: Record<
  string,
  { title: string; head: string; day: string; total: string }
> = {
  'Service Operation': {
    title: 'Roster Crew Serviceman',
    head: 'bg-sky-50 text-sky-900',
    day: 'bg-sky-50/60 text-sky-900',
    total: 'bg-surface-container-low text-foreground',
  },
  'Repair Retread': {
    title: 'Roster Crew Repairman',
    head: 'bg-emerald-50 text-emerald-900',
    day: 'bg-emerald-50/60 text-emerald-900',
    total: 'bg-surface-container-low text-foreground',
  },
  'Crew Office': {
    title: 'Roster Crew Office',
    head: 'bg-orange-50 text-orange-900',
    day: 'bg-orange-50/60 text-orange-900',
    total: 'bg-surface-container-low text-foreground',
  },
}

const codeCycle: ScheduleCode[] = ['IN', 'DS', 'NS', 'OFF', 'FB', 'Libur', 'Sakit', 'Emergency']
const defaultSiteConfig: SiteSchedulingConfig = {
  scheduleType: 'office',
  rosterType: '5:2',
  msaType: 'staff-nonstaff',
  mealsType: 'field-break',
  overtimeType: 'five-hour',
  defaultShiftType: 'day-shift',
  defaultClockIn: '07:00',
  defaultClockOut: '17:00',
  defaultEarlyOvertimeHours: 1,
  defaultOvertimeEnd: '19:00',
  lokasiKhususRate: 35000,
  lokasiKhususRateStaff: 35000,
  lokasiKhususRateNonStaff: 35000,
  lokasiKhususEnabled: false,
}

const defaultAllowanceVariables: AllowanceVariable[] = [
  { project: 'AMM MIFA', msaStaff: 45000, msaNonStaff: 35000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: 'AMM Tabang', msaStaff: 55000, msaNonStaff: 40000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: 'BSI Banyuwangi', msaStaff: 0, msaNonStaff: 30000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: 'CDE Bengkulu', msaStaff: 45000, msaNonStaff: 35000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: 'CK BIB', msaStaff: 45000, msaNonStaff: 35000, mealsStaff: 0, mealsNonStaff: 0 },
  {
    project: 'CK BMB',
    msaStaff: 40000,
    msaNonStaff: 30000,
    mealsStaff: 50000,
    mealsNonStaff: 50000,
  },
  { project: 'CK KIM', msaStaff: 45000, msaNonStaff: 35000, mealsStaff: 0, mealsNonStaff: 0 },
  {
    project: 'CK MHU',
    msaStaff: 40000,
    msaNonStaff: 30000,
    mealsStaff: 50000,
    mealsNonStaff: 50000,
  },
  { project: 'CK MIFA', msaStaff: 45000, msaNonStaff: 35000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: 'CK NCN', msaStaff: 45000, msaNonStaff: 35000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: 'KPUC Malinau', msaStaff: 0, msaNonStaff: 35000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: 'MTN Berau', msaStaff: 0, msaNonStaff: 35000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: 'MTN ME', msaStaff: 0, msaNonStaff: 30000, mealsStaff: 0, mealsNonStaff: 0 },
  {
    project: 'PPA BIB',
    msaStaff: 45000,
    msaNonStaff: 30000,
    mealsStaff: 30000,
    mealsNonStaff: 30000,
  },
  { project: 'PPA Tanjung Enim', msaStaff: 0, msaNonStaff: 30000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: 'PKA Musi Rawas', msaStaff: 0, msaNonStaff: 30000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: 'Sangatta', msaStaff: 40000, msaNonStaff: 30000, mealsStaff: 0, mealsNonStaff: 0 },
  { project: 'Sebamban', msaStaff: 40000, msaNonStaff: 0, mealsStaff: 60000, mealsNonStaff: 0 },
  {
    project: 'Tanjung Adaro',
    msaStaff: 40000,
    msaNonStaff: 30000,
    mealsStaff: 60000,
    mealsNonStaff: 50000,
  },
  {
    project: 'TU Batu Hijau',
    msaStaff: 0,
    msaNonStaff: 50000,
    mealsStaff: 0,
    mealsNonStaff: 35000,
  },
  { project: 'TU Gresik', msaStaff: 0, msaNonStaff: 60000, mealsStaff: 0, mealsNonStaff: 30000 },
  {
    project: 'Vale Sorowako',
    msaStaff: 60000,
    msaNonStaff: 60000,
    mealsStaff: 0,
    mealsNonStaff: 30000,
  },
]

const defaultOvertimeVariables: OvertimeVariable[] = [
  ...Array.from({ length: 10 }, (_, index) => ({
    roster: '5:2' as const,
    dayType: 'work' as const,
    totalHours: index + 1,
    overtimeHours: index * 2 + 1.5,
  })),
  ...Array.from({ length: 16 }, (_, index) => ({
    roster: '5:2' as const,
    dayType: 'off' as const,
    totalHours: index + 1,
    overtimeHours: index < 8 ? (index + 1) * 2 : 19 + (index - 8) * 4,
  })),
  ...Array.from({ length: 10 }, (_, index) => ({
    roster: '6:1' as const,
    dayType: 'work' as const,
    totalHours: index + 1,
    overtimeHours: index * 2 + 1.5,
  })),
  ...Array.from({ length: 12 }, (_, index) => ({
    roster: '6:1' as const,
    dayType: 'off' as const,
    totalHours: index + 1,
    overtimeHours: index < 8 ? (index + 1) * 2 : 17 + (index - 8) * 4,
  })),
  ...Array.from({ length: 20 }, (_, index) => ({
    roster: 'vale' as const,
    dayType: 'work' as const,
    totalHours: (index + 1) / 2,
    overtimeHours: index + 0.75,
  })),
  ...Array.from({ length: 32 }, (_, index) => ({
    roster: 'vale' as const,
    dayType: 'off' as const,
    totalHours: (index + 1) / 2,
    overtimeHours: index < 16 ? ((index + 1) / 2) * 2 : 17.5 + (index - 16) * 2,
  })),
]

const overtimeRules = [
  {
    roster: 'Rooster Kerja 5 : 2',
    work: 'Hari masuk dihitung 5 jam dasar',
    off: 'Libur/OFF tidak dihitung jam dasar',
  },
  {
    roster: 'Rooster Kerja 6 : 1',
    work: 'Hari masuk dihitung 5 jam dasar',
    off: 'Backup otomatis masuk list pengganti',
  },
  {
    roster: 'Rooster Kerja Vale Sorowako',
    work: 'Status cell sama: ?, OFF, FB, Sakit, Emergency, Libur',
    off: 'Nilai overtime siap disambung ke setting variabel',
  },
]

function normalizeLocation(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

// Detect staff/non-staff from "Peran" field in User Management
// "Non Staff ..." = non-staff, "Staff ..." = staff
// Default: non-staff (mayoritas karyawan lapangan)
function isStaffRole(role?: string | null): boolean {
  const r = (role ?? '').toLowerCase().trim()
  // Explicit "non staff" or "non-staff" = non-staff
  if (r.includes('non staff') || r.includes('non-staff') || r.includes('nonstaff')) return false
  // Explicit "staff" without "non" = staff
  if (r.includes('staff')) return true
  // Manager/supervisor/admin = staff
  if (/manager|supervisor|admin|koordinator|coord/i.test(r)) return true
  // Default: non-staff
  return false
}

function normalizeRosterSection(value?: string | null) {
  const normalized = normalizeLocation(value ?? '')
  if (normalized.includes('repair') || normalized.includes('retread')) return 'Repair Retread'
  if (normalized.includes('technical')) return 'Crew Office'
  if (normalized.includes('tyreman') || normalized.includes('tyre')) return 'Service Operation'
  if (
    normalized.includes('serviceoperation') ||
    normalized.includes('serviceman') ||
    normalized.includes('servicemvc') ||
    normalized.includes('serviceoperationmvc') ||
    normalized.includes('serviceoperationother') ||
    normalized.includes('serviceoperationothers')
  )
    return 'Service Operation'

  return 'Crew Office'
}

function isEmploymentPositionLabel(value?: string | null) {
  const normalized = normalizeLocation(value ?? '')
  if (!normalized) return true

  return employmentPositionLabels.some((label) => normalized.includes(normalizeLocation(label)))
}

function resolvePositionOnSite(position?: string | null, fallback?: string | null) {
  if (!isEmploymentPositionLabel(position)) return position ?? ''
  if (!isEmploymentPositionLabel(fallback)) return fallback ?? ''

  return 'Jabatan belum diisi'
}

function defaultPositionOnSite(section?: string | null) {
  const normalized = normalizeLocation(section ?? '')
  if (normalized.includes('repair') || normalized.includes('retread')) return 'REPAIRMAN'
  if (normalized.includes('service')) return 'TYREMAN'
  if (normalized.includes('technical')) return 'Operation'

  return 'Operation'
}

function isDefaultPositionOnSite(value?: string | null) {
  return defaultPositionLabels.some(
    (label) => normalizeLocation(label) === normalizeLocation(value ?? '')
  )
}

function positionOptionsForSection(section?: string | null) {
  return Array.from(new Set([defaultPositionOnSite(section), 'Leader', 'Sub Leader']))
}

function isLeadershipPosition(value?: string | null) {
  const normalized = normalizeLocation(value ?? '')
  return normalized === 'leader' || normalized === 'subleader'
}

function buildSchedule(
  employeeIndex: number,
  day: number,
  scheduleType: SiteScheduleType,
  period: string,
  isStaff?: boolean
): ScheduleCode {
  if (scheduleType === 'office') return isWeekend(period, day) ? 'OFF' : 'IN'
  // Hybrid: staff = office schedule, non-staff = shift schedule
  if (scheduleType === 'hybrid') {
    if (isStaff) return isWeekend(period, day) ? 'OFF' : 'IN'
    if ((day + employeeIndex) % 9 === 0) return 'OFF'
    return (day + employeeIndex) % 2 === 0 ? 'DS' : 'NS'
  }
  if ((day + employeeIndex) % 9 === 0) return 'OFF'
  return (day + employeeIndex) % 2 === 0 ? 'DS' : 'NS'
}

function codeClass(code: ScheduleCode) {
  if (code === 'IN')
    return 'bg-white text-emerald-700 hover:bg-emerald-50 ring-1 ring-inset ring-emerald-200/50'
  if (code === 'DS') return 'bg-sky-100 text-sky-800 hover:bg-sky-200'
  if (code === 'NS') return 'bg-indigo-600 text-white hover:bg-indigo-700'
  if (code === 'OFF') return 'bg-rose-100 text-rose-700 hover:bg-rose-200'
  if (code === 'FB') return 'bg-amber-100 text-amber-900 hover:bg-amber-200'
  if (code === 'Libur') return 'bg-slate-100 text-slate-700'
  if (code === 'Sakit') return 'bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200'
  return 'bg-pink-100 text-pink-800 hover:bg-pink-200'
}

function codeLabel(code: ScheduleCode) {
  return code === 'IN' ? <Check className="mx-auto size-4" /> : code
}

function weekdayLabel(period: string, day: number) {
  const [year, month] = period.split('-').map(Number)

  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(
    new Date(year, month - 1, day)
  )
}

function rosterSectionLabel(section: string) {
  if (section === 'Service Operation') return 'Roster Serviceman'
  if (section === 'Repair Retread') return 'Crew Repair'
  return 'Crew Office'
}

function calculateOvertimeFromVariables(
  schedule: ScheduleCode[],
  period: string,
  rosterType: SiteRosterType,
  overtimeVariables: OvertimeVariable[],
  holidays: HolidayLike[]
) {
  const rawTotal = schedule.reduce((sum, code, index) => {
    const totalHours = hoursFromCode(code)
    if (totalHours <= 0) return sum

    const dayType = classifyOvertimeDay(schedule, period, index, rosterType, holidays)
    const variable = overtimeVariables.find(
      (item) =>
        item.roster === rosterType && item.dayType === dayType && item.totalHours === totalHours
    )

    const rawOt = variable?.overtimeHours ?? Math.max(0, totalHours - 5)
    return sum + rawOt
  }, 0)
  // Apply overtime rounding rules per-day is handled at display level
  // Here we return raw total for schedule-based OT
  return rawTotal
}

function activeShiftCode(code?: ScheduleCode) {
  return code === 'DS' || code === 'NS' || code === 'IN' ? code : 'IN'
}

function dayFromDate(value: string, period: string) {
  if (!value || !value.startsWith(period)) return null
  return Number(value.slice(-2))
}

function dateRangeDays(from: string, to: string, period: string, dayCount: number) {
  const startDay = dayFromDate(from, period)
  const endDay = dayFromDate(to || from, period)
  if (!startDay || !endDay) return []
  const start = Math.max(1, Math.min(startDay, endDay))
  const end = Math.min(dayCount, Math.max(startDay, endDay))
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

function addDays(value: string, days: number) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function formatShortDate(value: string) {
  if (!value) return '-'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
    .format(date)
    .replace(/ /g, '-')
}

function attendanceKey(employeeId: number, day: number) {
  return `${employeeId}-${day}`
}

function attendanceCellClass(status: AttendanceCellStatus) {
  if (status === 'present') return 'bg-emerald-100 text-emerald-950 ring-1 ring-emerald-200'
  if (status === 'sick') return 'bg-amber-100 text-amber-950 ring-1 ring-amber-200'
  if (status === 'leave') return 'bg-sky-100 text-sky-950 ring-1 ring-sky-200'
  if (status === 'absent') return 'bg-rose-100 text-rose-950 ring-1 ring-rose-200'
  return 'bg-red-100 text-red-950 ring-1 ring-red-200'
}

// Overtime rounding rules:
// decimal >= 0.8 -> round up to next whole number
// decimal >= 0.5 -> round to x.5
// decimal < 0.5  -> round down to whole number
function roundOvertimeHours(hours: number): number {
  if (hours <= 0) return 0
  const whole = Math.floor(hours)
  const decimal = hours - whole
  if (decimal >= 0.8) return whole + 1
  if (decimal >= 0.5) return whole + 0.5
  return whole
}

// Extract site name - same logic as User Management
// "Repair & Retread - Sangatta" -> "Sangatta", "Balikpapan" -> "Balikpapan"
function extractSiteNameLocal(loc: string | null | undefined): string {
  if (!loc) return ''
  const parts = loc.split(' - ')
  return parts.length > 1 ? parts[parts.length - 1].trim() : loc.trim()
}

const EMPTY_SAVED_PLANS: SavedSchedulingPlan[] = []
const EMPTY_FIELD_BREAK_PLANS: SavedFieldBreakPlan[] = []
const EMPTY_ATTENDANCE_RECORDS: AttendanceRealRecord[] = []
const EMPTY_ATTENDANCE_OVERRIDES: SavedAttendanceOverride[] = []
const EMPTY_SCHEDULING_CONFIGS: Array<{
  siteId: number
  scheduleType?: string
  rosterType?: string
  msaType?: string
  mealsType?: string
  overtimeType?: string
  fieldBreakConfig?: unknown
  allowanceVariables?: unknown
  overtimeVariables?: unknown
}> = []
const EMPTY_SCHEDULING_STATUSES: Array<{
  siteId: number
  period: string
  scheduleStatus: string
  attendanceStatus: string
  importStatus: string
  conflictCount: number
  lastSavedAt?: string | null
  lastImportedAt?: string | null
  finalizedAt?: string | null
}> = []

const scheduleHolidayCellClass =
  'bg-amber-200 text-amber-950 hover:bg-amber-300 ring-1 ring-inset ring-amber-400'
const attendanceHolidayCellClass = 'bg-amber-200 text-amber-950 ring-1 ring-amber-400'

function currentMonthPeriod() {
  return new Date().toISOString().slice(0, 7)
}

type NativeSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

const nativeSelectClass =
  'flex h-10 w-full rounded-md border-0 border-b-2 border-b-transparent bg-surface-container-low px-3 text-sm shadow-[inset_0_-1px_0_rgba(66,71,80,0.08)] outline-none transition-[background-color,border-color,box-shadow] focus:border-b-primary focus:bg-surface-container-lowest disabled:cursor-not-allowed disabled:opacity-50'

function NativeSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className = '',
  disabled,
}: {
  value?: string
  onValueChange: (value: string) => void
  options: NativeSelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  return (
    <select
      className={`${nativeSelectClass} ${className}`}
      disabled={disabled}
      value={value ?? ''}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

async function fetchHolidayFallback(period: string): Promise<HolidayLike[]> {
  try {
    const response = await fetch(
      `https://api-hari-libur.vercel.app/api?year=${period.slice(0, 4)}`,
      { cache: 'no-store' }
    )
    if (!response.ok) return []
    const payload = await response.json()
    const items = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : []

    return items
      .filter((item: { date?: string; description?: string; name?: string }) => {
        const name = item.description ?? item.name ?? ''
        return (
          typeof item.date === 'string' &&
          item.date.startsWith(period) &&
          !name.toLowerCase().includes('cuti bersama')
        )
      })
      .map((item: { date: string; description?: string; name?: string }) => {
        const name = item.description ?? item.name ?? 'Hari Libur Nasional'
        return {
          date: item.date,
          day: Number(item.date.slice(-2)),
          name,
          localName: name,
        }
      })
  } catch {
    return []
  }
}

function employeeSnLabel(employee: EmployeeOption) {
  return employee.employeeSn?.trim() || String(employee.id)
}

function timeFromIso(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':')
}

type SchedulingTimesheetMode =
  | 'overview'
  | 'setup'
  | 'schedule'
  | 'attendance'
  | 'field-break'
  | 'payroll'

export function SchedulingTimesheetWorkspace({
  mode = 'overview',
  employees,
  sites,
  savedPlans = EMPTY_SAVED_PLANS,
  fieldBreakPlans = EMPTY_FIELD_BREAK_PLANS,
  attendanceRecords = EMPTY_ATTENDANCE_RECORDS,
  attendanceOverrides = EMPTY_ATTENDANCE_OVERRIDES,
  schedulingConfigs = EMPTY_SCHEDULING_CONFIGS,
  schedulingStatuses = EMPTY_SCHEDULING_STATUSES,
  activities = [],
  currentEmployeeSiteId = null,
}: {
  mode?: SchedulingTimesheetMode
  employees: EmployeeOption[]
  sites: SiteOption[]
  currentEmployeeSiteId?: number | null
  savedPlans?: SavedSchedulingPlan[]
  fieldBreakPlans?: SavedFieldBreakPlan[]
  attendanceRecords?: AttendanceRealRecord[]
  attendanceOverrides?: SavedAttendanceOverride[]
  schedulingConfigs?: Array<{
    siteId: number
    scheduleType?: string
    rosterType?: string
    msaType?: string
    mealsType?: string
    overtimeType?: string
    fieldBreakConfig?: unknown
    allowanceVariables?: unknown
    overtimeVariables?: unknown
  }>
  schedulingStatuses?: Array<{
    siteId: number
    period: string
    scheduleStatus: string
    attendanceStatus: string
    importStatus: string
    conflictCount: number
    lastSavedAt?: string | null
    lastImportedAt?: string | null
    finalizedAt?: string | null
  }>
  importPreviews?: unknown[]
  activities?: Array<{
    id: number
    employeeId: number
    activityCode: string
    title: string
    startTime: string
    endTime: string
    status: string
  }>
}) {
  const [period, setPeriod] = useState(currentMonthPeriod)
  const userDefaultSiteId = useMemo(() => {
    return String(currentEmployeeSiteId ?? sites[0]?.id ?? 'all')
  }, [currentEmployeeSiteId, sites])
  const [siteId, setSiteId] = useState(userDefaultSiteId)
  const [roster, setRoster] = useState('5:2')
  const [selectedCell, setSelectedCell] = useState<{ employeeId: number; day: number } | null>(null)
  const [swapTargetEmployeeId, setSwapTargetEmployeeId] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [isGenerated, setIsGenerated] = useState(false)
  const [overrides, setOverrides] = useState<Record<string, ScheduleCode>>({})
  const [leaveFrom, setLeaveFrom] = useState('')
  const [leaveTo, setLeaveTo] = useState('')
  const [fieldBreakFrom, setFieldBreakFrom] = useState('')
  const [fieldBreakTo, setFieldBreakTo] = useState('')
  const [backupEmployeeId, setBackupEmployeeId] = useState('')
  const [backupAssignments, setBackupAssignments] = useState<BackupAssignment[]>([])
  const [employeeProfiles, setEmployeeProfiles] = useState<Record<number, EmployeeScheduleProfile>>(
    {}
  )
  const [profileSection, setProfileSection] = useState('Crew Office')
  const [profilePositionOnSite, setProfilePositionOnSite] = useState('')
  const [profileKimperLv, setProfileKimperLv] = useState(false)
  const [profileKimperTh, setProfileKimperTh] = useState(false)
  const [permanentBase, setPermanentBase] = useState<Record<string, ScheduleCode>>({})
  const [permanentOverrides, setPermanentOverrides] = useState<Record<string, ScheduleCode>>({})
  const [scheduleSavedAt, setScheduleSavedAt] = useState<string | null>(null)
  const [fieldBreakSiteId, setFieldBreakSiteId] = useState(String(sites[0]?.id ?? ''))
  const [fieldBreakDrafts, setFieldBreakDrafts] = useState<Record<number, FieldBreakDraft>>({})
  const [isSavingFieldBreak, startSavingFieldBreak] = useTransition()
  const [siteScheduleTypes, setSiteScheduleTypes] = useState<Record<string, SiteScheduleType>>({})
  const [siteConfigs, setSiteConfigs] = useState<Record<string, SiteSchedulingConfig>>({})
  const [allowanceVariables, setAllowanceVariables] =
    useState<AllowanceVariable[]>(defaultAllowanceVariables)
  const [overtimeVariables, setOvertimeVariables] =
    useState<OvertimeVariable[]>(defaultOvertimeVariables)
  const [holidays, setHolidays] = useState<HolidayLike[]>([])
  const [isSyncingHolidays, startSyncingHolidays] = useTransition()
  const [manualAttendance, setManualAttendance] = useState<Record<string, ManualAttendanceCell>>({})
  const [selectedAttendanceCell, setSelectedAttendanceCell] = useState<{
    employeeId: number
    day: number
  } | null>(null)
  const [multiSelectAttendance, setMultiSelectAttendance] = useState(false)
  const [attendanceView, setAttendanceView] = useState<
    'attendance' | 'msa' | 'lokasi' | 'meals' | 'ovt'
  >('attendance')
  const [selectedAttendanceKeys, setSelectedAttendanceKeys] = useState<string[]>([])
  const [attendanceImportPreview, setAttendanceImportPreview] = useState<{
    previewId: number
    matchedCount: number
    unmatchedCount: number
    cellCount: number
    conflictCount: number
    validationSummary?: unknown
    previewRows: AttendancePreviewRow[]
    conflicts: AttendancePreviewConflict[]
  } | null>(null)
  const [attendanceImportMode, setAttendanceImportMode] = useState<
    'skip-conflicts' | 'overwrite-conflicts'
  >('skip-conflicts')
  const [attendanceImportHistory, setAttendanceImportHistory] = useState<
    AttendanceImportHistoryItem[]
  >([])
  const [selectedActivityCell, setSelectedActivityCell] = useState<{
    employeeId: number
    day: number
  } | null>(null)

  const activitiesByEmployeeDay = useMemo(() => {
    const map = new Map<string, typeof activities>()
    for (const activity of activities) {
      const startDate = new Date(activity.startTime)
      const day = startDate.getDate()
      const activityPeriod = activity.startTime.slice(0, 7)
      const key = `${activity.employeeId}-${activityPeriod}-${day}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(activity)
    }
    return map
  }, [activities])

  const [showConflictsOnly, setShowConflictsOnly] = useState(false)
  const [attendanceSavedAt, setAttendanceSavedAt] = useState<string | null>(null)
  const [isAttendanceDirty, setIsAttendanceDirty] = useState(false)
  const [isSavingAttendance, startSavingAttendance] = useTransition()
  const [isImportingExcel, setIsImportingExcel] = useState(false)
  const [lastImportSuccess, setLastImportSuccess] = useState<{
    filename: string
    matched: number
    unmatched: number
    unmatchedNames?: string[]
  } | null>(null)
  const [isSavingSchedule, startSavingSchedule] = useTransition()
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false)
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false)
  const [finalizeReason, setFinalizeReason] = useState('')
  const [reopenReason, setReopenReason] = useState('')
  const [discardImportDialogOpen, setDiscardImportDialogOpen] = useState(false)
  const [overwriteImportDialogOpen, setOverwriteImportDialogOpen] = useState(false)
  const [clearExcelImportDialogOpen, setClearExcelImportDialogOpen] = useState(false)
  const conflictsDismissKey = `conflicts-dismissed:${siteId}:${period}`
  const [conflictsDismissed, setConflictsDismissedState] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(`conflicts-dismissed:${siteId}:${period}`) === 'true'
  })

  function setConflictsDismissed(value: boolean) {
    setConflictsDismissedState(value)
    if (typeof window !== 'undefined') {
      if (value) {
        localStorage.setItem(conflictsDismissKey, 'true')
      } else {
        localStorage.removeItem(conflictsDismissKey)
      }
    }
  }

  useEffect(() => {
    setSwapTargetEmployeeId('')
  }, [selectedCell?.employeeId, selectedCell?.day])

  const dayCount = daysInMonth(period)
  const days = Array.from({ length: dayCount }, (_, index) => index + 1)
  const holidaysByDay = new Map(
    holidays.map((holiday) => [holiday.day ?? Number(holiday.date.slice(-2)), holiday])
  )
  const site = sites.find((item) => String(item.id) === siteId)
  const siteConfig = siteConfigs[siteId] ?? defaultSiteConfig
  const siteNameOptions = [...new Set(sites.map((item) => extractSiteNameLocal(item.name)).filter(Boolean))]
  const siteExtractedName = extractSiteNameLocal(site?.name)
  const rate =
    allowanceVariables.find(
      (item) => item.project === siteExtractedName
    ) ??
    allowanceVariables.find(
      (item) => normalizeLocation(item.project) === normalizeLocation(siteExtractedName)
    ) ??
    allowanceVariables[0] ??
    defaultAllowanceVariables[0]
  const savedPlan = savedPlans.find(
    (plan) => String(plan.siteId) === siteId && plan.period === period
  )
  const currentStatus =
    schedulingStatuses.find(
      (status) => String(status.siteId) === siteId && status.period === period
    ) ?? null
  const isFinalized = Boolean(
    currentStatus?.finalizedAt ||
    currentStatus?.scheduleStatus === 'finalized' ||
    currentStatus?.attendanceStatus === 'finalized'
  )
  function guardOpenPeriod(actionLabel: string) {
    if (!isFinalized) return true
    toast.error(`${actionLabel} blocked`, {
      description: 'Period finalized. Reopen before editing.',
    })
    return false
  }
  const attendanceByCell = useMemo(() => {
    const map = new Map<
      string,
      {
        clockIn?: AttendanceRealRecord
        clockOut?: AttendanceRealRecord
        records: AttendanceRealRecord[]
      }
    >()

    for (const record of attendanceRecords) {
      if (String(record.siteId) !== siteId) continue
      if (!record.eventTime.startsWith(period)) continue
      const day = dayFromDate(record.eventTime.slice(0, 10), period)
      if (!day) continue
      const key = attendanceKey(record.employeeId, day)
      const existing = map.get(key) ?? { records: [] }
      existing.records.push(record)
      const eventType = normalizeLocation(record.eventType)
      if (
        eventType.includes('out') ||
        eventType.includes('pulang') ||
        eventType.includes('checkout')
      )
        existing.clockOut = record
      else existing.clockIn = record
      map.set(key, existing)
    }

    return map
  }, [attendanceRecords, period, siteId])

  useEffect(() => {
    const firstConfig = schedulingConfigs.find((config) => String(config.siteId) === siteId)
    setAllowanceVariables(
      Array.isArray(firstConfig?.allowanceVariables) && firstConfig.allowanceVariables.length
        ? (firstConfig.allowanceVariables as AllowanceVariable[])
        : defaultAllowanceVariables
    )
    setOvertimeVariables(
      Array.isArray(firstConfig?.overtimeVariables) && firstConfig.overtimeVariables.length
        ? (firstConfig.overtimeVariables as OvertimeVariable[])
        : defaultOvertimeVariables
    )
  }, [schedulingConfigs, siteId])

  useEffect(() => {
    let active = true
    getIndonesiaHolidaysAction({ period })
      .then(async (items) => {
        const nextItems = items.length ? items : await fetchHolidayFallback(period)
        if (active) setHolidays(nextItems)
      })
      .catch(async () => {
        const nextItems = await fetchHolidayFallback(period)
        if (active) setHolidays(nextItems)
      })
    return () => {
      active = false
    }
  }, [period])

  useEffect(() => {
    const scoped = attendanceOverrides.filter(
      (override) => String(override.siteId) === siteId && override.period === period
    )
    setManualAttendance(
      Object.fromEntries(
        scoped.map((override) => [
          attendanceKey(override.employeeId, override.day),
          {
            status: normalizeAttendanceStatus(override.status),
            clockIn: override.clockIn,
            clockOut: override.clockOut,
            note: override.note,
            source:
              override.source === 'excel' || override.source === 'attendance'
                ? override.source
                : 'manual',
          },
        ])
      )
    )
    setAttendanceSavedAt(
      scoped.reduce<string | null>(
        (latest, override) => (latest && latest > override.updatedAt ? latest : override.updatedAt),
        null
      )
    )
    setIsAttendanceDirty(false)
    setSelectedAttendanceKeys([])
    // Reset conflict dismissed state for new site/period
    const dismissKey = `conflicts-dismissed:${siteId}:${period}`
    const isDismissed = typeof window !== 'undefined' && localStorage.getItem(dismissKey) === 'true'
    setConflictsDismissedState(isDismissed)
    void refreshAttendanceImportHistory()
  }, [attendanceOverrides, period, siteId])

  useEffect(() => {
    if (siteId === 'all') return

    const savedConfig = schedulingConfigs.find((config) => String(config.siteId) === siteId)
    const fieldBreakConfig =
      ((savedConfig as Record<string, unknown> | undefined)?.fieldBreakConfig as
        | Record<string, unknown>
        | undefined) ?? {}
    const config = savedConfig
      ? {
          scheduleType: savedConfig.scheduleType as SiteScheduleType,
          rosterType: savedConfig.rosterType as SiteRosterType,
          msaType: savedConfig.msaType as SiteMsaType,
          mealsType: savedConfig.mealsType as SiteMealsType,
          overtimeType: savedConfig.overtimeType as SiteOvertimeType,
          defaultShiftType:
            (fieldBreakConfig.defaultShiftType as DefaultShiftType | undefined) ?? 'day-shift',
          defaultClockIn: (fieldBreakConfig.defaultClockIn as string | undefined) ?? '07:00',
          defaultClockOut: (fieldBreakConfig.defaultClockOut as string | undefined) ?? '17:00',
          defaultEarlyOvertimeHours:
            Number(fieldBreakConfig.defaultEarlyOvertimeHours ?? 1) || 0,
          defaultOvertimeEnd: (fieldBreakConfig.defaultOvertimeEnd as string | undefined) ?? '19:00',
          lokasiKhususRate: Number(fieldBreakConfig.lokasiKhususRate ?? 35000) || 0,
          lokasiKhususRateStaff: Number(fieldBreakConfig.lokasiKhususRateStaff ?? fieldBreakConfig.lokasiKhususRate ?? 35000) || 0,
          lokasiKhususRateNonStaff: Number(fieldBreakConfig.lokasiKhususRateNonStaff ?? fieldBreakConfig.lokasiKhususRate ?? 35000) || 0,
          lokasiKhususEnabled: Boolean(fieldBreakConfig.lokasiKhususEnabled ?? false),
        }
      : defaultSiteConfig
    setSiteConfigs((current) => ({ ...current, [siteId]: config }))
    setRoster(config.rosterType)
    setSiteScheduleTypes((current) => ({ ...current, [siteId]: config.scheduleType }))
  }, [siteId, schedulingConfigs])

  useEffect(() => {
    if (!savedPlan) return

    const nextDraftOverrides: Record<string, ScheduleCode> = {}
    const nextPermanentBase: Record<string, ScheduleCode> = {}

    const hasFieldBreakSetting = fieldBreakPlans.some(
      (plan) => String(plan.siteId) === siteId && plan.period === period
    )

    savedPlan.draftSchedule.forEach((row) =>
      row.schedule.forEach((code, index) => {
        if (code === 'FB' && !hasFieldBreakSetting) return
        if (codeCycle.includes(code as ScheduleCode))
          nextDraftOverrides[`${row.employeeId}-${index + 1}`] = code as ScheduleCode
      })
    )
    savedPlan.fixedSchedule.forEach((row) =>
      row.schedule.forEach((code, index) => {
        if (code === 'FB' && !hasFieldBreakSetting) return
        if (codeCycle.includes(code as ScheduleCode))
          nextPermanentBase[`${row.employeeId}-${index + 1}`] = code as ScheduleCode
      })
    )

    setOverrides(nextDraftOverrides)
    setPermanentBase(nextPermanentBase)
    setPermanentOverrides({})
    setEmployeeProfiles(
      Object.fromEntries(
        (savedPlan.employeeProfiles ?? []).map((profile) => {
          const employee = employees.find((item) => item.id === profile.employeeId)
          const detectedSection = normalizeRosterSection(employee?.section || employee?.role)
          const section = detectedSection || profile.section

          return [profile.employeeId, { ...profile, section }]
        })
      )
    )
    setIsGenerated(true)
    setScheduleSavedAt(new Date(savedPlan.updatedAt).toLocaleString('id-ID'))
    setSiteScheduleTypes((current) => ({
      ...current,
      [siteId]: (savedPlan.siteScheduleType === 'shift' || savedPlan.siteScheduleType === 'hybrid') ? savedPlan.siteScheduleType as SiteScheduleType : 'office',
    }))
  }, [fieldBreakPlans, period, savedPlan, siteId])

  const visibleEmployees = useMemo(() => {
    if (!isGenerated && mode === 'schedule') return []
    if (siteId === 'all') return []

    const selectedSite = sites.find((item) => String(item.id) === siteId)
    if (!selectedSite) return []

    // Extract from selected site name
    const selectedSiteExtracted = extractSiteNameLocal(selectedSite.name)

    const filtered = employees.filter((employee) => {
      // First priority: exact siteId match
      if (String(employee.siteId) === siteId) return true
      // Second priority: employee locationName (already extracted) matches extracted site name
      if (employee.locationName && employee.locationName === selectedSiteExtracted) return true
      return false
    })

    // If no employees match, show all employees for attendance mode
    if (filtered.length === 0 && mode === 'attendance') {
      return employees
    }
    return filtered
  }, [employees, isGenerated, mode, siteId, sites])

  const rosterSectionByEmployee = new Map(
    visibleEmployees.map((employee) => {
      const profile = employeeProfiles[employee.id]
      return [
        employee.id,
        normalizeRosterSection(profile?.section || employee.section || employee.role),
      ]
    })
  )
  const rosterSectionCounts = visibleEmployees.reduce<Record<string, number>>(
    (counts, employee) => {
      const rosterSection = rosterSectionByEmployee.get(employee.id) ?? 'Crew Office'
      counts[rosterSection] = (counts[rosterSection] ?? 0) + 1
      return counts
    },
    {}
  )

  const rows = visibleEmployees.map((employee, employeeIndex) => {
    const employeeRosterSection = rosterSectionByEmployee.get(employee.id) ?? 'Crew Office'
    const forceDayShift =
      (employeeRosterSection === 'Service Operation' ||
        employeeRosterSection === 'Repair Retread') &&
      (rosterSectionCounts[employeeRosterSection] ?? 0) < 3
    const schedule = days.map((day) => {
      const scheduleType = siteScheduleTypes[siteId] ?? 'office'
      const generatedCode = forceDayShift
        ? 'DS'
        : buildSchedule(employeeIndex, day, scheduleType, period, isStaffRole(employee.role))
      const holidayAdjustedCode = applyHolidayPolicy(generatedCode, {
        scheduleType,
        rosterType: siteConfig.rosterType,
        isHoliday: isHoliday(period, day, holidays),
      })

      return overrides[`${employee.id}-${day}`] ?? holidayAdjustedCode
    })
    const workDays = schedule.filter(
      (code) => code === 'IN' || code === 'DS' || code === 'NS' || code === 'FB'
    ).length
    const msaDays = schedule.filter(
      (code, index) =>
        (code === 'IN' || code === 'DS' || code === 'NS' || code === 'FB') &&
        !isHoliday(period, index + 1, holidays)
    ).length
    const fieldBreakDays = schedule.filter((code) => code === 'FB').length
    const totalHours = schedule.reduce((sum, code) => sum + hoursFromCode(code), 0)
    const staff = isStaffRole(employee.role)
    const msa =
      siteConfig.msaType === 'none'
        ? 0
        : msaDays *
          (siteConfig.msaType === 'same-all'
            ? rate.msaNonStaff
            : staff
              ? rate.msaStaff
              : rate.msaNonStaff)
    const mealsBaseDays = siteConfig.mealsType === 'workday' ? msaDays : fieldBreakDays
    const meals =
      siteConfig.mealsType === 'none'
        ? 0
        : mealsBaseDays * (staff ? rate.mealsStaff : rate.mealsNonStaff)
    const overtime =
      siteConfig.overtimeType === 'none'
        ? 0
        : calculateOvertimeFromVariables(
            schedule,
            period,
            siteConfig.rosterType,
            overtimeVariables,
            holidays
          )
    const profile = employeeProfiles[employee.id] ?? {
      employeeId: employee.id,
      section: normalizeRosterSection(employee.section || employee.role),
      positionOnSite: defaultPositionOnSite(employee.section || employee.role),
      kimperLv: false,
      kimperTh: false,
    }
    const rosterSection = normalizeRosterSection(
      profile.section || employee.section || employee.role
    )
    const sectionLabel = employee.section || rosterSection
    const positionOnSite = isLeadershipPosition(profile.positionOnSite)
      ? profile.positionOnSite
      : defaultPositionOnSite(sectionLabel)
    return {
      employee,
      schedule,
      workDays,
      msaDays,
      fieldBreakDays,
      totalHours,
      staff,
      msa,
      meals,
      overtime,
      profile: { ...profile, section: rosterSection, positionOnSite },
      sectionLabel,
      rosterSection,
    }
  })

  function renderRosterTable(
    tableRows: typeof rows,
    section: string,
    keyPrefix: string,
    onCellClick: (employeeId: number, day: number) => void
  ) {
    const sectionRows = tableRows.filter((row) => row.rosterSection === section)
    if (sectionRows.length === 0) return null

    const styles = rosterSectionStyles[section] ?? rosterSectionStyles['Crew Office']
    const showOperatorTotals = section === 'Service Operation' || section === 'Repair Retread'
    const sectionTotals = days.map((day, index) => ({
      day,
      ds: sectionRows.filter((row) => row.schedule[index] === 'DS').length,
      ns: sectionRows.filter((row) => row.schedule[index] === 'NS').length,
      dayOperator: sectionRows.filter(
        (row) => row.schedule[index] === 'DS' && row.profile.kimperLv && row.profile.kimperTh
      ).length,
      nightOperator: sectionRows.filter(
        (row) => row.schedule[index] === 'NS' && row.profile.kimperLv && row.profile.kimperTh
      ).length,
      off: sectionRows.filter((row) => row.schedule[index] === 'OFF').length,
      manpower: sectionRows.filter(
        (row) =>
          row.schedule[index] === 'DS' ||
          row.schedule[index] === 'NS' ||
          row.schedule[index] === 'IN'
      ).length,
    }))

    return (
      <Card
        key={`${keyPrefix}-${section}`}
        className="surface-module-card overflow-hidden rounded-[1.1rem] border-0 p-0"
      >
        <div className="overflow-auto">
          <table className="min-w-max border-collapse text-xs">
            <thead>
              <tr className={styles.head}>
                <th
                  colSpan={days.length + 7}
                  className="px-4 py-2.5 text-left text-sm font-semibold tracking-tight"
                >
                  {styles.title} <span className="ml-1 font-normal opacity-60">{period}</span>
                </th>
              </tr>
              <tr className={`${styles.head} border-b border-black/5`}>
                <th className="sticky left-0 z-20 min-w-44 px-3 py-2 text-left shadow-[4px_0_8px_-4px_rgba(15,23,42,0.08)]">
                  Nama
                </th>
                <th className="min-w-16 px-3 py-2">LV</th>
                <th className="min-w-16 px-3 py-2">TH</th>
                <th className="min-w-24 px-3 py-2">SN</th>
                <th className="min-w-36 px-3 py-2">Section</th>
                <th className="min-w-36 px-3 py-2">Posisi</th>
                {days.map((day) => {
                  const holiday = holidaysByDay.get(day)
                  const holidayName = holiday?.localName ?? holiday?.name
                  return (
                    <th
                      key={day}
                      title={holidayName}
                      className={`min-w-12 border-l border-black/5 px-2 py-2 ${styles.day} ${holiday ? 'bg-amber-100/70 ring-1 ring-amber-300 ring-inset' : ''}`}
                    >
                      <div>{weekdayLabel(period, day)}</div>
                      <div className="font-normal">{day}</div>
                      {holiday ? (
                        <Badge
                          variant="secondary"
                          className="mt-1 px-1 text-[10px]"
                          title={holidayName}
                        >
                          Libur
                        </Badge>
                      ) : null}
                    </th>
                  )
                })}
                <th className="min-w-20 px-3 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {sectionRows.map((row) => (
                <tr key={`${keyPrefix}-${row.employee.id}`} className="border-b border-slate-200">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 font-semibold">
                    <button
                      className="text-left font-semibold text-slate-900 underline-offset-4 hover:underline"
                      onClick={() => openEmployeeForm(row.employee.id)}
                    >
                      {row.employee.name}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center">{row.profile.kimperLv ? '✓' : ''}</td>
                  <td className="px-3 py-2 text-center">{row.profile.kimperTh ? '✓' : ''}</td>
                  <td className="px-3 py-2 text-center">{employeeSnLabel(row.employee)}</td>
                  <td className="px-3 py-2 text-center">{row.sectionLabel}</td>
                  <td className="px-3 py-2 text-center font-semibold uppercase">
                    {row.profile.positionOnSite}
                  </td>
                  {row.schedule.map((code, index) => {
                    const holiday = holidaysByDay.get(index + 1)
                    const holidayName = holiday?.localName ?? holiday?.name
                    return (
                      <td
                        key={`${keyPrefix}-${row.employee.id}-${index}`}
                        className={`border-l border-slate-200 p-0 text-center ${holiday ? 'bg-amber-100 ring-1 ring-amber-300 ring-inset' : ''}`}
                        title={holidayName}
                      >
                        <button
                          className={`h-8 w-full px-2 font-medium ${holiday ? scheduleHolidayCellClass : codeClass(code)}`}
                          onClick={() => onCellClick(row.employee.id, index + 1)}
                          title={holidayName}
                        >
                          {codeLabel(code)}
                        </button>
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-center font-semibold">{row.totalHours}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={`border-t-2 border-slate-300 font-semibold ${styles.total}`}>
                <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-left">Dayshift</td>
                <td colSpan={5} className="px-3 py-2 text-center">
                  Day Shift
                </td>
                {sectionTotals.map((item) => (
                  <td
                    key={`${keyPrefix}-${section}-ds-${item.day}`}
                    className="border-l border-slate-200 px-2 py-2 text-center"
                  >
                    {item.ds}
                  </td>
                ))}
                <td className="px-3 py-2 text-center">
                  {sectionTotals.reduce((sum, item) => sum + item.ds, 0)}
                </td>
              </tr>
              <tr className={`border-t border-slate-200 font-semibold ${styles.total}`}>
                <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-left">Nightshift</td>
                <td colSpan={5} className="px-3 py-2 text-center">
                  Night Shift
                </td>
                {sectionTotals.map((item) => (
                  <td
                    key={`${keyPrefix}-${section}-ns-${item.day}`}
                    className="border-l border-slate-200 px-2 py-2 text-center"
                  >
                    {item.ns}
                  </td>
                ))}
                <td className="px-3 py-2 text-center">
                  {sectionTotals.reduce((sum, item) => sum + item.ns, 0)}
                </td>
              </tr>
              {showOperatorTotals ? (
                <tr className="border-t border-slate-300 bg-white font-semibold text-slate-950">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 text-left">Day Operator</td>
                  <td colSpan={5} className="px-3 py-2 text-center">
                    KIMPER LV + TH
                  </td>
                  {sectionTotals.map((item) => (
                    <td
                      key={`${keyPrefix}-${section}-day-operator-${item.day}`}
                      className="border-l border-slate-200 px-2 py-2 text-center"
                    >
                      {item.dayOperator}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    {sectionTotals.reduce((sum, item) => sum + item.dayOperator, 0)}
                  </td>
                </tr>
              ) : null}
              {showOperatorTotals ? (
                <tr className="border-t border-slate-300 bg-slate-300 font-semibold text-slate-950">
                  <td className="sticky left-0 z-10 bg-slate-300 px-3 py-2 text-left">
                    Night Operator
                  </td>
                  <td colSpan={5} className="px-3 py-2 text-center">
                    KIMPER LV + TH
                  </td>
                  {sectionTotals.map((item) => (
                    <td
                      key={`${keyPrefix}-${section}-night-operator-${item.day}`}
                      className="border-l border-slate-400 px-2 py-2 text-center"
                    >
                      {item.nightOperator}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    {sectionTotals.reduce((sum, item) => sum + item.nightOperator, 0)}
                  </td>
                </tr>
              ) : null}
              <tr
                className={`border-t border-slate-200 font-semibold text-red-700 ${styles.total}`}
              >
                <td className="sticky left-0 z-10 bg-inherit px-3 py-2 text-left">OFF</td>
                <td colSpan={5} className="px-3 py-2 text-center">
                  OFF
                </td>
                {sectionTotals.map((item) => (
                  <td
                    key={`${keyPrefix}-${section}-off-${item.day}`}
                    className="border-l border-slate-200 px-2 py-2 text-center"
                  >
                    {item.off}
                  </td>
                ))}
                <td className="px-3 py-2 text-center">
                  {sectionTotals.reduce((sum, item) => sum + item.off, 0)}
                </td>
              </tr>
              <tr className="border-t-2 border-slate-400 bg-white font-bold text-slate-950">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 text-left">TOTAL MAN POWER</td>
                <td colSpan={5} className="px-3 py-2 text-center">
                  Aktif
                </td>
                {sectionTotals.map((item) => (
                  <td
                    key={`${keyPrefix}-${section}-mp-${item.day}`}
                    className="border-l border-slate-200 px-2 py-2 text-center"
                  >
                    {item.manpower}
                  </td>
                ))}
                <td className="px-3 py-2 text-center">{sectionRows.length}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    )
  }

  const permanentRows = rows
    .map((row) => ({
      ...row,
      schedule: row.schedule.map((code, index) => {
        const day = index + 1
        const key = `${row.employee.id}-${day}`
        const savedCode = permanentOverrides[key] ?? permanentBase[key] ?? code

        return permanentOverrides[key]
          ? savedCode
          : applyHolidayPolicy(savedCode, {
              scheduleType: siteConfig.scheduleType,
              rosterType: siteConfig.rosterType,
              isHoliday: isHoliday(period, day, holidays),
            })
      }),
    }))
    .map((row) => ({
      ...row,
      workDays: row.schedule.filter(
        (code) => code === 'IN' || code === 'DS' || code === 'NS' || code === 'FB'
      ).length,
      msaDays: row.schedule.filter(
        (code, index) =>
          (code === 'IN' || code === 'DS' || code === 'NS' || code === 'FB') &&
          !isHoliday(period, index + 1, holidays)
      ).length,
      fieldBreakDays: row.schedule.filter((code) => code === 'FB').length,
      totalHours: row.schedule.reduce((sum, code) => sum + hoursFromCode(code), 0),
    }))
  const selectedEmployee =
    visibleEmployees.find((employee) => employee.id === selectedEmployeeId) ?? null
  const selectedRow = selectedCell
    ? (rows.find((row) => row.employee.id === selectedCell.employeeId) ?? null)
    : null
  const selectedCode =
    selectedCell && selectedRow
      ? (overrides[`${selectedCell.employeeId}-${selectedCell.day}`] ??
        selectedRow.schedule[selectedCell.day - 1])
      : undefined
  const swapTargetRows =
    selectedCell && selectedRow && selectedCode
      ? rows.filter((row) => {
          if (
            row.employee.id === selectedCell.employeeId ||
            row.rosterSection !== selectedRow.rosterSection
          )
            return false
          const targetCode =
            overrides[`${row.employee.id}-${selectedCell.day}`] ??
            row.schedule[selectedCell.day - 1]
          return canSwapOff(selectedCode, targetCode)
        })
      : []
  const selectedSwapTargetRow =
    swapTargetRows.find((row) => String(row.employee.id) === swapTargetEmployeeId) ?? null
  const savedFieldBreakByEmployee = new Map(
    fieldBreakPlans
      .filter((plan) => String(plan.siteId) === fieldBreakSiteId && plan.period === period)
      .map((plan) => [plan.employeeId, plan])
  )
  const fieldBreakRows = rows.map((row) => {
    const savedPlan = savedFieldBreakByEmployee.get(row.employee.id)
    const draft = fieldBreakDrafts[row.employee.id]
    const onSiteDate = draft?.onSiteDate ?? savedPlan?.onSiteDate ?? ''
    const fieldBreakDate = draft?.fieldBreakDate ?? savedPlan?.fieldBreakDate ?? ''
    const dayCountValue = draft?.dayCount ?? savedPlan?.dayCount ?? null

    return {
      ...row,
      onSiteDate,
      dayCount: dayCountValue,
      fieldBreakDate,
      savedAt: savedPlan?.updatedAt ?? null,
    }
  })
  const servicemanKimperCoverage = days.map((day, index) => {
    const serviceRows = rows.filter(
      (row) =>
        row.rosterSection === 'Service Operation' && row.profile.kimperLv && row.profile.kimperTh
    )

    return {
      day,
      hasDayShift: serviceRows.some((row) => row.schedule[index] === 'DS'),
      hasNightShift: serviceRows.some((row) => row.schedule[index] === 'NS'),
    }
  })
  const missingServicemanKimperDays = servicemanKimperCoverage.filter(
    (item) => !item.hasDayShift || !item.hasNightShift
  )

  function cycleCell(employeeId: number, day: number) {
    if (!guardOpenPeriod('Edit schedule')) return
    const key = `${employeeId}-${day}`
    const current =
      overrides[key] ??
      rows.find((row) => row.employee.id === employeeId)?.schedule[day - 1] ??
      'IN'
    const next = codeCycle[(codeCycle.indexOf(current) + 1) % codeCycle.length]
    setOverrides((currentOverrides) => ({ ...currentOverrides, [key]: next }))
    setSelectedCell({ employeeId, day })
  }

  function cyclePermanentCell(employeeId: number, day: number) {
    if (!guardOpenPeriod('Edit fixed schedule')) return
    const key = `${employeeId}-${day}`
    const current =
      permanentOverrides[key] ??
      permanentRows.find((row) => row.employee.id === employeeId)?.schedule[day - 1] ??
      'IN'
    const next = codeCycle[(codeCycle.indexOf(current) + 1) % codeCycle.length]

    setPermanentOverrides((currentOverrides) => ({ ...currentOverrides, [key]: next }))
  }

  function saveScheduleToPermanent() {
    if (!guardOpenPeriod('Save schedule')) return
    const nextBase = rows.reduce<Record<string, ScheduleCode>>((base, row) => {
      row.schedule.forEach((code, index) => {
        base[`${row.employee.id}-${index + 1}`] = code
      })

      return base
    }, {})

    setPermanentBase(nextBase)
    setPermanentOverrides({})
    setScheduleSavedAt(new Date().toLocaleString('id-ID'))
    persistSchedulePlan(nextBase)
  }

  function savePermanentSchedule() {
    if (!guardOpenPeriod('Save fixed schedule')) return
    const nextBase = permanentRows.reduce<Record<string, ScheduleCode>>((base, row) => {
      row.schedule.forEach((code, index) => {
        base[`${row.employee.id}-${index + 1}`] = code
      })

      return base
    }, {})

    setPermanentBase(nextBase)
    setPermanentOverrides({})
    setScheduleSavedAt(new Date().toLocaleString('id-ID'))
    persistSchedulePlan(nextBase)
  }

  function persistSchedulePlan(nextFixedBase: Record<string, ScheduleCode>) {
    const numericSiteId = Number(siteId)
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0) return

    const fixedRows = rows.map((row) => ({
      employeeId: row.employee.id,
      schedule: row.schedule.map(
        (code, index) => nextFixedBase[`${row.employee.id}-${index + 1}`] ?? code
      ),
    }))

    startSavingSchedule(async () => {
      await saveSchedulingTimesheetPlanAction({
        siteId: numericSiteId,
        period,
        siteScheduleType: siteScheduleTypes[siteId] ?? 'office',
        draftSchedule: rows.map((row) => ({ employeeId: row.employee.id, schedule: row.schedule })),
        fixedSchedule: fixedRows,
        employeeProfiles: rows.map((row) => employeeProfiles[row.employee.id] ?? row.profile),
        fieldBreakConfig: null,
      })
    })
  }

  function syncHolidays() {
    const year = Number(period.slice(0, 4))
    startSyncingHolidays(async () => {
      try {
        await syncIndonesiaHolidaysAction({ year })
        const items = await getIndonesiaHolidaysAction({ period })
        setHolidays(items)
        toast.success('Hari libur nasional disinkronkan')
      } catch (error) {
        toast.error('Sync hari libur gagal', {
          description: error instanceof Error ? error.message : 'OpenHoliday tidak tersedia',
        })
      }
    })
  }

  function updateFieldBreakDraft(
    employeeId: number,
    key: keyof FieldBreakDraft,
    value: string | number
  ) {
    if (!guardOpenPeriod('Edit field break')) return
    setFieldBreakDrafts((current) => {
      const row = fieldBreakRows.find((item) => item.employee.id === employeeId)
      const existing = current[employeeId] ?? {
        employeeId,
        onSiteDate: row?.onSiteDate ?? '',
        dayCount: row?.dayCount ?? null,
        fieldBreakDate: row?.fieldBreakDate ?? '',
      }
      const next = {
        ...existing,
        [key]: key === 'dayCount' ? Number(value) || null : String(value),
      }
      const startTime = next.onSiteDate
        ? new Date(`${next.onSiteDate}T00:00:00`).getTime()
        : Number.NaN
      const endTime = next.fieldBreakDate
        ? new Date(`${next.fieldBreakDate}T00:00:00`).getTime()
        : Number.NaN
      const dayCountValue =
        Number.isFinite(startTime) && Number.isFinite(endTime)
          ? Math.max(1, Math.round((endTime - startTime) / 86400000))
          : null

      return {
        ...current,
        [employeeId]: {
          ...next,
          dayCount: dayCountValue,
        },
      }
    })
  }

  function syncFieldBreakPlansToDatabase() {
    if (!guardOpenPeriod('Sync field break')) return
    const numericSiteId = Number(fieldBreakSiteId)
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0 || fieldBreakRows.length === 0) return

    startSavingFieldBreak(async () => {
      await saveTimesheetFieldBreakPlansAction({
        siteId: numericSiteId,
        period,
        plans: fieldBreakRows.map((row) => ({
          employeeId: row.employee.id,
          employeeName: row.employee.name,
          sectionName: row.sectionLabel,
          rosterSection: row.rosterSection,
          onSiteDate: row.onSiteDate || null,
          dayCount: row.dayCount,
          fieldBreakDate: row.fieldBreakDate || null,
        })),
      })
    })
  }

  function saveSiteConfig() {
    if (!guardOpenPeriod('Save site settings')) return
    if (siteId === 'all') return

    const {
      lokasiKhususEnabled,
      lokasiKhususRate,
      lokasiKhususRateStaff,
      lokasiKhususRateNonStaff,
      defaultShiftType,
      defaultClockIn,
      defaultClockOut,
      defaultEarlyOvertimeHours,
      defaultOvertimeEnd,
      ...dbConfig
    } = siteConfig
    void saveSchedulingConfigAction({
      siteId: Number(siteId),
      ...dbConfig,
      fieldBreakConfig: {
        lokasiKhususEnabled,
        lokasiKhususRate,
        lokasiKhususRateStaff,
        lokasiKhususRateNonStaff,
        defaultShiftType,
        defaultClockIn,
        defaultClockOut,
        defaultEarlyOvertimeHours,
        defaultOvertimeEnd,
      },
      allowanceVariables,
      overtimeVariables,
    })
    setRoster(siteConfig.rosterType)
    setSiteScheduleTypes((current) => ({ ...current, [siteId]: siteConfig.scheduleType }))
    setOverrides({})
    setPermanentOverrides({})
    setSelectedCell(null)
    toast.success('Setting site tersimpan.')
  }

  function updateSiteConfig<Key extends keyof SiteSchedulingConfig>(
    key: Key,
    value: SiteSchedulingConfig[Key]
  ) {
    if (!guardOpenPeriod('Edit site settings')) return
    if (siteId === 'all') return

    setSiteConfigs((current) => ({
      ...current,
      [siteId]: { ...(current[siteId] ?? defaultSiteConfig), [key]: value },
    }))
  }

  function updateAllowanceVariable(
    index: number,
    key: keyof AllowanceVariable,
    value: string | number
  ) {
    setAllowanceVariables((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [key]: key === 'project' ? String(value) : Number(value || 0) }
          : item
      )
    )
  }

  function addAllowanceVariable() {
    setAllowanceVariables((current) => [
      ...current,
      {
        project: extractSiteNameLocal(site?.name) || siteNameOptions[0] || 'Project Baru',
        msaStaff: 0,
        msaNonStaff: 0,
        mealsStaff: 0,
        mealsNonStaff: 0,
      },
    ])
  }

  function removeAllowanceVariable(index: number) {
    setAllowanceVariables((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  function saveAllowanceVariables() {
    const {
      lokasiKhususEnabled: lke,
      lokasiKhususRate: lkr,
      lokasiKhususRateStaff: lkrs,
      lokasiKhususRateNonStaff: lkrns,
      defaultShiftType: dst,
      defaultClockIn: dci,
      defaultClockOut: dco,
      defaultEarlyOvertimeHours: deoh,
      defaultOvertimeEnd: doe,
      ...dbCfg
    } = siteConfig
    void saveSchedulingConfigAction({
      siteId: Number(siteId),
      ...dbCfg,
      fieldBreakConfig: {
        lokasiKhususEnabled: lke,
        lokasiKhususRate: lkr,
        lokasiKhususRateStaff: lkrs,
        lokasiKhususRateNonStaff: lkrns,
        defaultShiftType: dst,
        defaultClockIn: dci,
        defaultClockOut: dco,
        defaultEarlyOvertimeHours: deoh,
        defaultOvertimeEnd: doe,
      },
      allowanceVariables,
      overtimeVariables,
    })
  }

  function resetAllowanceVariables() {
    setAllowanceVariables(defaultAllowanceVariables)
    const {
      lokasiKhususEnabled: lke2,
      lokasiKhususRate: lkr2,
      lokasiKhususRateStaff: lkrs2,
      lokasiKhususRateNonStaff: lkrns2,
      defaultShiftType: dst2,
      defaultClockIn: dci2,
      defaultClockOut: dco2,
      defaultEarlyOvertimeHours: deoh2,
      defaultOvertimeEnd: doe2,
      ...dbCfg2
    } = siteConfig
    void saveSchedulingConfigAction({
      siteId: Number(siteId),
      ...dbCfg2,
      fieldBreakConfig: {
        lokasiKhususEnabled: lke2,
        lokasiKhususRate: lkr2,
        lokasiKhususRateStaff: lkrs2,
        lokasiKhususRateNonStaff: lkrns2,
        defaultShiftType: dst2,
        defaultClockIn: dci2,
        defaultClockOut: dco2,
        defaultEarlyOvertimeHours: deoh2,
        defaultOvertimeEnd: doe2,
      },
      allowanceVariables: defaultAllowanceVariables,
      overtimeVariables,
    })
  }

  function updateOvertimeVariable(
    index: number,
    key: keyof OvertimeVariable,
    value: string | number
  ) {
    setOvertimeVariables((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? ({
              ...item,
              [key]: key === 'totalHours' || key === 'overtimeHours' ? Number(value || 0) : value,
            } as OvertimeVariable)
          : item
      )
    )
  }

  function addOvertimeVariable() {
    setOvertimeVariables((current) => [
      ...current,
      { roster: siteConfig.rosterType, dayType: 'work', totalHours: 0, overtimeHours: 0 },
    ])
  }

  function removeOvertimeVariable(index: number) {
    setOvertimeVariables((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  function saveOvertimeVariables() {
    const {
      lokasiKhususEnabled: lke3,
      lokasiKhususRate: lkr3,
      lokasiKhususRateStaff: lkrs3,
      lokasiKhususRateNonStaff: lkrns3,
      defaultShiftType: dst3,
      defaultClockIn: dci3,
      defaultClockOut: dco3,
      defaultEarlyOvertimeHours: deoh3,
      defaultOvertimeEnd: doe3,
      ...dbCfg3
    } = siteConfig
    void saveSchedulingConfigAction({
      siteId: Number(siteId),
      ...dbCfg3,
      fieldBreakConfig: {
        lokasiKhususEnabled: lke3,
        lokasiKhususRate: lkr3,
        lokasiKhususRateStaff: lkrs3,
        lokasiKhususRateNonStaff: lkrns3,
        defaultShiftType: dst3,
        defaultClockIn: dci3,
        defaultClockOut: dco3,
        defaultEarlyOvertimeHours: deoh3,
        defaultOvertimeEnd: doe3,
      },
      allowanceVariables,
      overtimeVariables,
    })
  }

  function resetOvertimeVariables() {
    setOvertimeVariables(defaultOvertimeVariables)
    const {
      lokasiKhususEnabled: lke4,
      lokasiKhususRate: lkr4,
      lokasiKhususRateStaff: lkrs4,
      lokasiKhususRateNonStaff: lkrns4,
      defaultShiftType: dst4,
      defaultClockIn: dci4,
      defaultClockOut: dco4,
      defaultEarlyOvertimeHours: deoh4,
      defaultOvertimeEnd: doe4,
      ...dbCfg4
    } = siteConfig
    void saveSchedulingConfigAction({
      siteId: Number(siteId),
      ...dbCfg4,
      fieldBreakConfig: {
        lokasiKhususEnabled: lke4,
        lokasiKhususRate: lkr4,
        lokasiKhususRateStaff: lkrs4,
        lokasiKhususRateNonStaff: lkrns4,
        defaultShiftType: dst4,
        defaultClockIn: dci4,
        defaultClockOut: dco4,
        defaultEarlyOvertimeHours: deoh4,
        defaultOvertimeEnd: doe4,
      },
      allowanceVariables,
      overtimeVariables: defaultOvertimeVariables,
    })
  }

  function setSelectedCode(code: ScheduleCode) {
    if (!guardOpenPeriod('Edit schedule')) return
    if (!selectedCell) return
    setOverrides((currentOverrides) => ({
      ...currentOverrides,
      [`${selectedCell.employeeId}-${selectedCell.day}`]: code,
    }))
  }

  function swapSelectedScheduleCell() {
    if (!guardOpenPeriod('Tukar OFF')) return
    if (!selectedCell || !selectedRow || !selectedSwapTargetRow) {
      toast.error('Tukar OFF gagal', {
        description: 'Pilih cell dan target karyawan satu section.',
      })
      return
    }
    if (selectedSwapTargetRow.rosterSection !== selectedRow.rosterSection) {
      toast.error('Tukar OFF gagal', { description: 'Target harus satu section.' })
      return
    }
    const selectedKey = `${selectedCell.employeeId}-${selectedCell.day}`
    const targetKey = `${selectedSwapTargetRow.employee.id}-${selectedCell.day}`
    const sourceCode = overrides[selectedKey] ?? selectedRow.schedule[selectedCell.day - 1]
    const targetCode = overrides[targetKey] ?? selectedSwapTargetRow.schedule[selectedCell.day - 1]
    const swapped = swapScheduleCodes(sourceCode, targetCode)
    if (!swapped) {
      toast.error('Tukar OFF gagal', { description: 'Salah satu schedule harus OFF.' })
      return
    }
    setOverrides((currentOverrides) => ({
      ...currentOverrides,
      [selectedKey]: swapped[0],
      [targetKey]: swapped[1],
    }))
    toast.success('OFF ditukar', {
      description: `${selectedRow.employee.name} ↔ ${selectedSwapTargetRow.employee.name} hari ${selectedCell.day}`,
    })
  }

  function handleProfileSectionChange(section: string) {
    setProfileSection(section)
    if (
      isDefaultPositionOnSite(profilePositionOnSite) ||
      isEmploymentPositionLabel(profilePositionOnSite)
    ) {
      setProfilePositionOnSite(defaultPositionOnSite(section))
    }
  }

  function openEmployeeForm(employeeId: number) {
    const employee = visibleEmployees.find((item) => item.id === employeeId)
    const profile = employeeProfiles[employeeId]
    setSelectedEmployeeId(employeeId)
    setProfileSection(
      normalizeRosterSection(profile?.section || employee?.section || employee?.role)
    )
    setProfilePositionOnSite(
      isLeadershipPosition(profile?.positionOnSite)
        ? (profile?.positionOnSite ?? 'Leader')
        : defaultPositionOnSite(employee?.section || profile?.section || employee?.role)
    )
    setProfileKimperLv(profile?.kimperLv ?? false)
    setProfileKimperTh(profile?.kimperTh ?? false)
    setLeaveFrom('')
    setLeaveTo('')
    setFieldBreakFrom('')
    setFieldBreakTo('')
    setBackupEmployeeId('')
  }

  function rosterSectionTotals(sectionRows: typeof rows) {
    return days.map((day, index) => ({
      day,
      ds: sectionRows.filter((row) => row.schedule[index] === 'DS').length,
      ns: sectionRows.filter((row) => row.schedule[index] === 'NS').length,
      dayOperator: sectionRows.filter(
        (row) => row.schedule[index] === 'DS' && row.profile.kimperLv && row.profile.kimperTh
      ).length,
      nightOperator: sectionRows.filter(
        (row) => row.schedule[index] === 'NS' && row.profile.kimperLv && row.profile.kimperTh
      ).length,
      off: sectionRows.filter((row) => row.schedule[index] === 'OFF').length,
      manpower: sectionRows.filter(
        (row) =>
          row.schedule[index] === 'DS' ||
          row.schedule[index] === 'NS' ||
          row.schedule[index] === 'IN'
      ).length,
    }))
  }

  function rosterExportColumns() {
    return ['Nama', 'LV', 'TH', 'SN', 'Section', 'Posisi On Site', ...days.map(String), 'Total']
  }

  function rosterExportRows(tableRows = rows) {
    return sectionOptions.flatMap((section) => {
      const sectionRows = tableRows.filter((row) => row.rosterSection === section)
      if (sectionRows.length === 0) return []

      const styles = rosterSectionStyles[section] ?? rosterSectionStyles['Crew Office']
      const totals = rosterSectionTotals(sectionRows)
      const showOperatorTotals = section === 'Service Operation' || section === 'Repair Retread'
      const rowsBySection: Array<Array<string | number>> = [
        [styles.title, '', '', '', '', period, ...days.map(() => ''), ''],
        ...sectionRows.map((row) => [
          row.employee.name,
          row.profile.kimperLv ? '?' : '',
          row.profile.kimperTh ? '?' : '',
          employeeSnLabel(row.employee),
          row.sectionLabel,
          row.profile.positionOnSite,
          ...row.schedule,
          row.totalHours,
        ]),
        [
          'Dayshift',
          '',
          '',
          '',
          '',
          'Day Shift',
          ...totals.map((item) => item.ds),
          totals.reduce((sum, item) => sum + item.ds, 0),
        ],
        [
          'Nightshift',
          '',
          '',
          '',
          '',
          'Night Shift',
          ...totals.map((item) => item.ns),
          totals.reduce((sum, item) => sum + item.ns, 0),
        ],
      ]

      if (showOperatorTotals) {
        rowsBySection.push(
          [
            'Day Operator',
            '',
            '',
            '',
            '',
            'KIMPER LV + TH',
            ...totals.map((item) => item.dayOperator),
            totals.reduce((sum, item) => sum + item.dayOperator, 0),
          ],
          [
            'Night Operator',
            '',
            '',
            '',
            '',
            'KIMPER LV + TH',
            ...totals.map((item) => item.nightOperator),
            totals.reduce((sum, item) => sum + item.nightOperator, 0),
          ]
        )
      }

      rowsBySection.push(
        [
          'OFF',
          '',
          '',
          '',
          '',
          'OFF',
          ...totals.map((item) => item.off),
          totals.reduce((sum, item) => sum + item.off, 0),
        ],
        [
          'TOTAL MAN POWER',
          '',
          '',
          '',
          '',
          'Aktif',
          ...totals.map((item) => item.manpower),
          sectionRows.length,
        ]
      )

      return rowsBySection
    })
  }

  function exportRosterPdf(tabTitle = 'Schedule', tableRows = rows) {
    const title = `${tabTitle} - ${site?.name ?? 'Semua Site'} - ${period}`
    const dayHeaders = days
      .map((day) => `<th><div>${weekdayLabel(period, day)}</div><div>${day}</div></th>`)
      .join('')
    const rosterTables = sectionOptions
      .map((section) => {
        const sectionRows = tableRows.filter((row) => row.rosterSection === section)
        if (sectionRows.length === 0) return ''

        const styles = rosterSectionStyles[section] ?? rosterSectionStyles['Crew Office']
        const totals = rosterSectionTotals(sectionRows)
        const showOperatorTotals = section === 'Service Operation' || section === 'Repair Retread'
        const bodyRows = sectionRows
          .map(
            (row) => `
        <tr><td>${row.employee.name}</td><td>${row.profile.kimperLv ? '?' : ''}</td><td>${row.profile.kimperTh ? '?' : ''}</td><td>${employeeSnLabel(row.employee)}</td><td>${row.sectionLabel}</td><td>${row.profile.positionOnSite}</td>${row.schedule.map((code) => `<td class="cell ${code.toLowerCase()}">${codeLabel(code)}</td>`).join('')}<td>${row.totalHours}</td></tr>
      `
          )
          .join('')
        const totalRow = (
          label: string,
          subLabel: string,
          key: 'ds' | 'ns' | 'dayOperator' | 'nightOperator' | 'off' | 'manpower',
          className = ''
        ) => `
        <tr class="total ${className}"><td>${label}</td><td colspan="5">${subLabel}</td>${totals.map((item) => `<td>${item[key]}</td>`).join('')}<td>${key === 'manpower' ? sectionRows.length : totals.reduce((sum, item) => sum + item[key], 0)}</td></tr>
      `

        return `<table class="roster"><thead><tr><th class="title" colspan="${days.length + 7}">${styles.title} ${period}</th></tr><tr><th>Nama</th><th>LV</th><th>TH</th><th>SN</th><th>Section</th><th>Posisi On Site</th>${dayHeaders}<th>Total</th></tr></thead><tbody>${bodyRows}</tbody><tfoot>${totalRow('Dayshift', 'Day Shift', 'ds')}${totalRow('Nightshift', 'Night Shift', 'ns')}${showOperatorTotals ? totalRow('Day Operator', 'KIMPER LV + TH', 'dayOperator', 'operator-day') + totalRow('Night Operator', 'KIMPER LV + TH', 'nightOperator', 'operator-night') : ''}${totalRow('OFF', 'OFF', 'off', 'off-total')}${totalRow('TOTAL MAN POWER', 'Aktif', 'manpower', 'manpower')}</tfoot></table>`
      })
      .join('')
    const backupRows =
      backupAssignments
        .map(
          (item) => `
      <tr><td>${item.employeeName}</td><td>${item.backupName}</td><td>${item.type}</td><td>${item.dateRange}</td></tr>
    `
        )
        .join('') || `<tr><td colspan="4">Belum ada backup.</td></tr>`
    const printable = window.open('', '_blank', 'width=1200,height=800')
    if (!printable) return

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
    `)
    printable.document.close()
  }

  function exportCsv(
    tabTitle: string,
    columns: string[],
    exportRows: Array<Array<string | number>>
  ) {
    const csv = [columns, ...exportRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${tabTitle}-${site?.name ?? 'Semua Site'}-${period}.csv`.replace(
      /[^a-z0-9._-]+/gi,
      '-'
    )
    link.click()
    URL.revokeObjectURL(url)
  }

  function exportSummaryPdf(
    tabTitle: string,
    columns: string[],
    exportRows: Array<Array<string | number>>
  ) {
    const title = `${tabTitle} - ${site?.name ?? 'Semua Site'} - ${period}`
    const printable = window.open('', '_blank', 'width=1200,height=800')
    if (!printable) return

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
            <thead><tr>${columns.map((column) => `<th>${column}</th>`).join('')}</tr></thead>
            <tbody>${exportRows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `)
    printable.document.close()
  }

  function TabExportActions({
    tabTitle,
    tableRows = rows,
    columns,
    exportRows,
  }: {
    tabTitle: string
    tableRows?: typeof rows
    columns?: string[]
    exportRows?: Array<Array<string | number>>
  }) {
    const excelColumns = columns ?? rosterExportColumns()
    const excelRows = exportRows ?? rosterExportRows(tableRows)

    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={tableRows.length === 0 && excelRows.length === 0}
          onClick={() =>
            columns && exportRows
              ? exportSummaryPdf(tabTitle, excelColumns, excelRows)
              : exportRosterPdf(tabTitle, tableRows)
          }
        >
          <Download className="mr-2 size-4" /> Export PDF
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={excelRows.length === 0}
          onClick={() => exportCsv(tabTitle, excelColumns, excelRows)}
        >
          <Download className="mr-2 size-4" /> Export CSV
        </Button>
      </div>
    )
  }

  function applyEmployeeEdit() {
    if (!guardOpenPeriod('Edit employee schedule')) return
    if (!selectedEmployee) return
    const backup =
      visibleEmployees.find((employee) => String(employee.id) === backupEmployeeId) ?? null
    const nextOverrides: Record<string, ScheduleCode> = {}
    const leaveDays = dateRangeDays(leaveFrom, leaveTo, period, dayCount)
    const fieldBreakDays = dateRangeDays(fieldBreakFrom, fieldBreakTo, period, dayCount)

    const selectedRow = rows.find((row) => row.employee.id === selectedEmployee.id)
    const backupRow = backup ? rows.find((row) => row.employee.id === backup.id) : null

    for (const day of leaveDays) {
      const selectedCodeForDay = selectedRow?.schedule[day - 1]
      const backupCodeForDay = backupRow?.schedule[day - 1]

      nextOverrides[`${selectedEmployee.id}-${day}`] = backup
        ? activeShiftCode(backupCodeForDay)
        : 'Libur'
      if (backup) nextOverrides[`${backup.id}-${day}`] = selectedCodeForDay ?? 'Libur'
    }
    for (const day of fieldBreakDays) nextOverrides[`${selectedEmployee.id}-${day}`] = 'FB'
    if (backup) {
      for (const day of fieldBreakDays) nextOverrides[`${backup.id}-${day}`] = 'IN'
    }

    setOverrides((currentOverrides) => ({ ...currentOverrides, ...nextOverrides }))
    setEmployeeProfiles((currentProfiles) => ({
      ...currentProfiles,
      [selectedEmployee.id]: {
        employeeId: selectedEmployee.id,
        section: profileSection,
        positionOnSite: profilePositionOnSite || defaultPositionOnSite(profileSection),
        kimperLv: profileKimperLv,
        kimperTh: profileKimperTh,
      },
    }))

    const newAssignments: BackupAssignment[] = []
    if (backup && leaveDays.length > 0) {
      newAssignments.push({
        id: `${Date.now()}-leave`,
        employeeName: selectedEmployee.name,
        backupName: backup.name,
        type: 'Tukar Libur',
        dateRange: `${leaveFrom} s/d ${leaveTo || leaveFrom}`,
      })
    }
    if (backup && fieldBreakDays.length > 0) {
      newAssignments.push({
        id: `${Date.now()}-fb`,
        employeeName: selectedEmployee.name,
        backupName: backup.name,
        type: 'Field Break',
        dateRange: `${fieldBreakFrom} s/d ${fieldBreakTo || fieldBreakFrom}`,
      })
    }
    if (newAssignments.length > 0)
      setBackupAssignments((current) => [...newAssignments, ...current])
    setSelectedEmployeeId(null)
  }

  function getAttendanceCell(employeeId: number, day: number): ManualAttendanceCell {
    const key = attendanceKey(employeeId, day)
    const manual = manualAttendance[key]
    if (manual) return manual

    const real = attendanceByCell.get(key)
    if (!real) return { status: 'empty', clockIn: '', clockOut: '', note: '', source: 'attendance' }

    const status = normalizeAttendanceStatus(
      real.clockIn?.status ?? real.clockOut?.status ?? real.records[0]?.status
    )
    return {
      status,
      clockIn: timeFromIso(real.clockIn?.eventTime),
      clockOut: timeFromIso(real.clockOut?.eventTime),
      note:
        real.clockIn?.locationNote ||
        real.clockOut?.locationNote ||
        real.records[0]?.locationNote ||
        'Face/location attendance',
      source: 'attendance',
    }
  }

  function updateAttendanceCell(
    employeeId: number,
    day: number,
    patch: Partial<ManualAttendanceCell>
  ) {
    if (!guardOpenPeriod('Edit attendance')) return
    const key = attendanceKey(employeeId, day)
    setManualAttendance((current) => ({
      ...current,
      [key]: { ...getAttendanceCell(employeeId, day), source: 'manual', ...patch },
    }))
    setIsAttendanceDirty(true)
  }

  function cycleAttendanceCell(employeeId: number, day: number) {
    if (!guardOpenPeriod('Edit attendance')) return
    const current = getAttendanceCell(employeeId, day)
    const cycle: AttendanceCellStatus[] = ['present', 'sick', 'leave', 'absent', 'empty']
    const nextStatus = cycle[(cycle.indexOf(current.status) + 1) % cycle.length]
    updateAttendanceCell(employeeId, day, {
      status: nextStatus,
      clockIn: nextStatus === 'present' ? current.clockIn || '08:00' : '',
      clockOut: nextStatus === 'present' ? current.clockOut || '17:00' : '',
      source: 'manual',
    })
  }

  function toggleAttendanceSelection(employeeId: number, day: number) {
    if (!guardOpenPeriod('Select attendance')) return
    const key = attendanceKey(employeeId, day)
    setSelectedAttendanceKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    )
  }

  function applyBulkAttendance(patch: Partial<ManualAttendanceCell>) {
    if (!guardOpenPeriod('Bulk edit attendance')) return
    setManualAttendance((current) => {
      const next = { ...current }
      for (const key of selectedAttendanceKeys) {
        const [employeeId, day] = key.split('-').map(Number)
        next[key] = { ...getAttendanceCell(employeeId, day), source: 'manual', ...patch }
      }
      return next
    })
    setIsAttendanceDirty(true)
  }

  function clearAttendanceSelection() {
    setSelectedAttendanceKeys([])
    setMultiSelectAttendance(false)
  }

  async function refreshAttendanceImportHistory() {
    const numericSiteId = Number(siteId)
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0) return
    try {
      const history = await getAttendanceImportHistoryAction({ siteId: numericSiteId, period })
      setAttendanceImportHistory(history as AttendanceImportHistoryItem[])
    } catch {
      setAttendanceImportHistory([])
    }
  }

  async function importAttendanceExcel(file: File | null) {
    if (!file || !guardOpenPeriod('Import attendance')) return
    const numericSiteId = Number(siteId)
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0) {
      toast.error('Pilih site terlebih dahulu sebelum import.')
      return
    }
    setIsImportingExcel(true)
    setLastImportSuccess(null)
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const allEmployeesForMatch = employees.length > 0 ? employees : visibleEmployees
      console.log('[Import] period:', period, 'employees:', allEmployeesForMatch.length)

      // Parse with current period first
      let activePeriod = period
      let parsed = parseAttendanceWorkbook({
        workbook,
        period: activePeriod,
        employees: allEmployeesForMatch,
      })

      // Auto-detect period from Excel if no rows found
      if (parsed.rows.length === 0) {
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rawRows: string[][] = XLSX.utils
          .sheet_to_json(sheet, { header: 1, defval: '', raw: false })
          .map((r: unknown) => (r as unknown[]).map((c) => String(c ?? '').trim()))
        const monthMap: Record<string, string> = {
          jan: '01',
          feb: '02',
          mar: '03',
          apr: '04',
          may: '05',
          jun: '06',
          jul: '07',
          aug: '08',
          sep: '09',
          oct: '10',
          nov: '11',
          dec: '12',
        }
        for (let i = 1; i < Math.min(rawRows.length, 30); i++) {
          const cell = (rawRows[i]?.[0] ?? '').trim()
          const dateMatch = cell.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/)
          if (dateMatch) {
            const detected = `${dateMatch[3]}-${monthMap[dateMatch[2].toLowerCase()] ?? '01'}`
            if (detected !== activePeriod) {
              console.log('[Import] Period mismatch! UI:', activePeriod, 'Excel:', detected)
              activePeriod = detected
              setPeriod(detected)
              parsed = parseAttendanceWorkbook({
                workbook,
                period: detected,
                employees: allEmployeesForMatch,
              })
              toast.info(`Period disesuaikan ke ${detected} sesuai data Excel.`)
            }
            break
          }
        }
      }

      console.log('[Import] Result:', parsed.detection.kind, 'rows:', parsed.rows.length)
      if (parsed.rows.length === 0) {
        toast.error(
          `Tidak ada data terbaca. Pastikan periode "${period}" sesuai dengan isi Excel.`,
          {
            description: parsed.warnings.join(' '),
          }
        )
        return
      }

      // Build overrides untuk save langsung ke DB
      const importOverrides: Array<{
        employeeId: number
        day: number
        status: 'present' | 'empty' | 'sick' | 'leave' | 'absent'
        clockIn: string
        clockOut: string
        note: string
        source: 'excel'
      }> = []
      const cellUpdates: Record<string, ManualAttendanceCell> = {}
      let matchedCount = 0
      let unmatchedCount = 0
      const unmatchedNames: string[] = []

      // Build Fuse index for fuzzy name matching
      const fuseIndex = allEmployeesForMatch.map((emp) => ({
        employee: emp,
        normalizedName: emp.name.toLowerCase().trim(),
        normalizedSn: (emp.employeeSn || '').toLowerCase().trim(),
      }))
      const nameFuse = new Fuse(fuseIndex, {
        keys: ['normalizedName'],
        threshold: 0.35,
        ignoreLocation: true,
        minMatchCharLength: 3,
        includeScore: true,
      })
      // Build SN lookup map for exact SN matching (Support Finger format)
      const bySn = new Map(
        allEmployeesForMatch
          .filter((emp) => emp.employeeSn)
          .map((emp) => [(emp.employeeSn || '').toLowerCase().trim(), emp])
      )

      for (const row of parsed.rows) {
        const rawName = (row.employeeName || '').toLowerCase().trim()
        const originalName = (row.employeeName || '').trim()
        const rawSn = (row.employeeSn || '').toLowerCase().trim()
        if (!rawName && !rawSn) {
          unmatchedCount++
          continue
        }

        // 1. Try SN exact match first (Support Finger: ID column = employeeSn)
        let matchedEmployee = rawSn ? (bySn.get(rawSn) ?? null) : null
        // 2. Try exact name match
        if (!matchedEmployee && rawName) {
          matchedEmployee =
            allEmployeesForMatch.find((emp) => emp.name.toLowerCase().trim() === rawName) ?? null
        }
        // 3. Fuzzy name match
        if (!matchedEmployee && rawName) {
          const fuseResult = nameFuse.search(rawName)[0]
          if (fuseResult && (fuseResult.score ?? 1) <= 0.35) {
            matchedEmployee = fuseResult.item.employee
          }
        }
        if (!matchedEmployee) {
          unmatchedCount++
          // Collect unique original names (not lowercase) for display
          if (originalName && !unmatchedNames.some((n) => n.toLowerCase() === rawName)) {
            unmatchedNames.push(originalName)
          }
          continue
        }
        if (row.status !== 'present' && !row.clockIn && !row.clockOut) continue

        const status: 'present' | 'empty' = row.clockIn || row.clockOut ? 'present' : 'empty'
        const key = attendanceKey(matchedEmployee.id, row.day)
        cellUpdates[key] = {
          status,
          clockIn: row.clockIn || '',
          clockOut: row.clockOut || '',
          note: row.note || '',
          source: 'excel',
        }
        importOverrides.push({
          employeeId: matchedEmployee.id,
          day: row.day,
          status,
          clockIn: row.clockIn || '',
          clockOut: row.clockOut || '',
          note: row.note || '',
          source: 'excel',
        })
        matchedCount++
      }

      if (matchedCount === 0) {
        console.log(
          '[Import] No matches. unmatchedCount:',
          unmatchedCount,
          'Sample names from Excel:',
          parsed.rows.slice(0, 5).map((r) => r.employeeName)
        )
        console.log(
          '[Import] Sample employee names in system:',
          allEmployeesForMatch.slice(0, 5).map((e) => e.name)
        )
        toast.error('Tidak ada karyawan yang cocok dengan data HERO.', {
          description: `${unmatchedCount} nama tidak ditemukan. Cek console untuk detail.`,
        })
        return
      }

      console.log('[Import] Matched:', matchedCount, 'Unmatched:', unmatchedCount, 'Saving...')

      // Apply ke cell UI langsung agar user lihat hasilnya
      setManualAttendance((current) => ({ ...current, ...cellUpdates }))
      setIsAttendanceDirty(true)

      // Auto-resolve conflicts: mark schedule as working for days with attendance present
      const workingCode: ScheduleCode = siteConfig.scheduleType === 'shift' ? 'DS' : 'IN'
      setOverrides((currentOverrides) => {
        const next = { ...currentOverrides }
        for (const [key, cell] of Object.entries(cellUpdates)) {
          if (cell.status === 'present') {
            const [empId, day] = key.split('-').map(Number)
            const row = rows.find((r) => r.employee.id === empId)
            const code = row?.schedule[day - 1]
            if (code === 'OFF' || code === 'Libur' || code === 'FB' || code === 'Sakit') {
              next[key] = workingCode
            }
          }
        }
        return next
      })

      setLastImportSuccess({
        filename: file.name,
        matched: matchedCount,
        unmatched: unmatchedCount,
        unmatchedNames: unmatchedNames.slice(0, 50),
      })
      toast.success(
        `${matchedCount} data attendance masuk ke cell.${unmatchedNames.length > 0 ? ` ${unmatchedNames.length} karyawan tidak cocok.` : ''}`
      )

      // Save ke database di background
      try {
        const result = await saveAttendanceRealOverridesAction({
          siteId: numericSiteId,
          period: activePeriod,
          overrides: importOverrides,
        })
        if (result.ok) {
          setAttendanceSavedAt(new Date().toISOString())
          setIsAttendanceDirty(false)
          toast.success('Data tersimpan ke database — aman untuk reload.')
        }
      } catch (saveError) {
        console.error('[Import] Save to DB failed:', saveError)
        toast.error(
          'Data tampil di cell tapi BELUM tersimpan ke database. Klik "Save Attendance" untuk retry.',
          {
            duration: 10000,
          }
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error('[Import Attendance Error]', message, error)
      toast.error('Import gagal', {
        description: message || 'Cek console untuk detail error.',
      })
    } finally {
      setIsImportingExcel(false)
    }
  }

  function applyAttendanceImportPreview() {
    if (!attendanceImportPreview || !guardOpenPeriod('Apply attendance import')) return
    if (
      attendanceImportMode === 'overwrite-conflicts' &&
      attendanceImportPreview.conflictCount > 0
    ) {
      setOverwriteImportDialogOpen(true)
      return
    }
    confirmApplyAttendanceImportPreview()
  }

  function confirmApplyAttendanceImportPreview() {
    if (!attendanceImportPreview || !guardOpenPeriod('Apply attendance import')) return
    startSavingAttendance(async () => {
      try {
        const result = await applyAttendanceImportPreviewAction({
          previewId: attendanceImportPreview.previewId,
          mode: attendanceImportMode,
        })
        const next: Record<string, ManualAttendanceCell> = {}
        for (const row of result.rows) {
          next[attendanceKey(row.employeeId!, row.day)] = {
            status: row.status,
            clockIn: row.clockIn,
            clockOut: row.clockOut,
            note: row.note,
            source: 'excel',
          }
        }
        setManualAttendance((current) => ({ ...current, ...next }))
        setAttendanceImportPreview(null)
        setAttendanceSavedAt(new Date().toISOString())
        setIsAttendanceDirty(false)
        await refreshAttendanceImportHistory()
        toast.success('Attendance import applied')
      } catch (error) {
        toast.error('Apply import failed', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  }

  function saveAttendanceReal() {
    if (!guardOpenPeriod('Save attendance')) return
    const numericSiteId = Number(siteId)
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0 || isFinalized) return
    const overrides = Object.entries(manualAttendance).map(([key, cell]) => {
      const [employeeId, day] = key.split('-').map(Number)
      return {
        employeeId,
        day,
        status: cell.status,
        clockIn: cell.clockIn,
        clockOut: cell.clockOut,
        note: cell.note,
        source: cell.source ?? 'manual',
      }
    })

    startSavingAttendance(async () => {
      try {
        const result = await saveAttendanceRealOverridesAction({
          siteId: numericSiteId,
          period,
          overrides,
        })
        if (result.ok) {
          setAttendanceSavedAt(new Date().toISOString())
          setIsAttendanceDirty(false)
          toast.success('Attendance saved')
        }
      } catch (error) {
        toast.error('Save attendance failed', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  }

  function clearImportedAttendance() {
    if (!guardOpenPeriod('Delete Excel import')) return
    const numericSiteId = Number(siteId)
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0 || isFinalized) return
    startSavingAttendance(async () => {
      try {
        await clearAttendanceRealOverridesAction({ siteId: numericSiteId, period, source: 'excel' })
        setManualAttendance((current) =>
          Object.fromEntries(Object.entries(current).filter(([, cell]) => cell.source !== 'excel'))
        )
        setAttendanceImportPreview(null)
        setClearExcelImportDialogOpen(false)
        setAttendanceSavedAt(new Date().toISOString())
        setIsAttendanceDirty(false)
        await refreshAttendanceImportHistory()
        toast.success('Excel import deleted')
      } catch (error) {
        toast.error('Delete Excel import failed', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  }

  function rollbackAttendanceImport(previewId: number) {
    if (!guardOpenPeriod('Rollback attendance import')) return
    startSavingAttendance(async () => {
      try {
        await rollbackAttendanceImportPreviewAction({ previewId })
        setManualAttendance((current) =>
          Object.fromEntries(Object.entries(current).filter(([, cell]) => cell.source !== 'excel'))
        )
        setAttendanceSavedAt(new Date().toISOString())
        await refreshAttendanceImportHistory()
        toast.success('Import rolled back')
      } catch (error) {
        toast.error('Rollback failed', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  }

  async function fixAttendanceImportMatch(importRowId: string, employeeId: number) {
    if (!attendanceImportPreview) return
    try {
      const result = await updateAttendanceImportPreviewMatchAction({
        previewId: attendanceImportPreview.previewId,
        importRowId,
        employeeId,
        saveAlias: true,
      })
      setAttendanceImportPreview((current) =>
        current
          ? { ...current, previewRows: result.previewRows as AttendancePreviewRow[] }
          : current
      )
      toast.success('Employee match saved')
    } catch (error) {
      toast.error('Fix match failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  function discardAttendanceImportPreview() {
    if (!attendanceImportPreview) return
    startSavingAttendance(async () => {
      try {
        await discardAttendanceImportPreviewAction({ previewId: attendanceImportPreview.previewId })
        setAttendanceImportPreview(null)
        setDiscardImportDialogOpen(false)
        await refreshAttendanceImportHistory()
        toast.success('Import preview discarded')
      } catch (error) {
        toast.error('Discard failed', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  }

  const attendanceConflicts = rows.flatMap(
    (row) =>
      row.schedule
        .map((code, index) => {
          const day = index + 1
          const cell = getAttendanceCell(row.employee.id, day)
          return cell.status === 'present' && ['OFF', 'FB', 'Sakit', 'Libur'].includes(code)
            ? {
                employeeId: row.employee.id,
                employeeName: row.employee.name,
                day,
                scheduleCode: code,
                currentCell: cell,
              }
            : null
        })
        .filter(Boolean) as Array<{
        employeeId: number
        employeeName: string
        day: number
        scheduleCode: string
        currentCell: ManualAttendanceCell
      }>
  )

  function clearAttendanceConflict(employeeId: number, day: number) {
    updateAttendanceCell(employeeId, day, { status: 'empty', clockIn: '', clockOut: '', note: '' })
  }

  function markConflictScheduleWorking(employeeId: number, day: number) {
    if (!guardOpenPeriod('Resolve conflict')) return
    const key = `${employeeId}-${day}`
    const workingCode: ScheduleCode = siteConfig.scheduleType === 'shift' ? 'DS' : 'IN'
    setOverrides((currentOverrides) => ({ ...currentOverrides, [key]: workingCode }))
    setSelectedCell({ employeeId, day })
  }

  function clearAllAttendanceConflicts() {
    if (!guardOpenPeriod('Clear conflicts')) return
    for (const conflict of attendanceConflicts)
      clearAttendanceConflict(conflict.employeeId, conflict.day)
    setConflictsDismissed(true)
  }

  function markAllConflictSchedulesWorking() {
    if (!guardOpenPeriod('Resolve conflicts')) return
    const workingCode: ScheduleCode = siteConfig.scheduleType === 'shift' ? 'DS' : 'IN'
    setOverrides((currentOverrides) => {
      const next = { ...currentOverrides }
      for (const conflict of attendanceConflicts)
        next[attendanceKey(conflict.employeeId, conflict.day)] = workingCode
      return next
    })
    setConflictsDismissed(true)
    toast.success(`${attendanceConflicts.length} conflicts resolved.`)
  }
  const conflictKeySet = new Set(
    attendanceConflicts.map((conflict) => attendanceKey(conflict.employeeId, conflict.day))
  )
  const displayedAttendanceRows = showConflictsOnly
    ? rows.filter((row) =>
        days.some((day) => conflictKeySet.has(attendanceKey(row.employee.id, day)))
      )
    : rows

  function submitFinalizePeriod() {
    const numericSiteId = Number(siteId)
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0) return
    startSavingSchedule(async () => {
      try {
        await finalizeSchedulingPeriodAction({
          siteId: numericSiteId,
          period,
          reason: finalizeReason,
        })
        toast.success('Period finalized')
        window.location.reload()
      } catch (error) {
        toast.error('Finalize failed', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  }

  function submitReopenPeriod() {
    const numericSiteId = Number(siteId)
    const reason = reopenReason.trim()
    if (!reason || !Number.isFinite(numericSiteId) || numericSiteId <= 0) return
    startSavingSchedule(async () => {
      try {
        await reopenSchedulingPeriodAction({ siteId: numericSiteId, period, reason })
        toast.success('Period reopened')
        window.location.reload()
      } catch (error) {
        toast.error('Reopen failed', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  }

  async function generateEmployeeOvertimePdf(employee: EmployeeOption) {
    try {
      const { generateOvertimeRecordPdf, buildAttendanceDayData } =
        await import('@/lib/timesheet/generate-attendance-pdf')
      const dayData = buildAttendanceDayData({
        period,
        dayCount,
        getCell: (day) => getAttendanceCell(employee.id, day),
        getScheduleCode: (day) => {
          const row = rows.find((r) => r.employee.id === employee.id)
          return row ? (row.schedule[day - 1] as string) : 'IN'
        },
        holidays,
      })
      const pdf = await generateOvertimeRecordPdf({
        period,
        employeeName: employee.name,
        employeeSn: employee.employeeSn || '',
        department: employee.department || '',
        section: employee.section || '',
        siteName: site?.name || '',
        days: dayData,
        isNonStaff: !isStaffRole(employee.role),
      })
      const blob = new Blob([new Uint8Array(pdf)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `OT_Record_${employee.name.replace(/\s+/g, '_')}_${period}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`PDF Overtime Record ${employee.name} berhasil di-generate.`)
    } catch (error) {
      console.error('[PDF OT Error]', error)
      toast.error('Generate PDF Overtime gagal', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async function generateEmployeeAllowancePdf(employee: EmployeeOption) {
    try {
      const { generateSiteAllowancePdf, buildAttendanceDayData } =
        await import('@/lib/timesheet/generate-attendance-pdf')
      const staff = isStaffRole(employee.role)
      const dayData = buildAttendanceDayData({
        period,
        dayCount,
        getCell: (day) => getAttendanceCell(employee.id, day),
        getScheduleCode: (day) => {
          const row = rows.find((r) => r.employee.id === employee.id)
          return row ? (row.schedule[day - 1] as string) : 'IN'
        },
        holidays,
      })
      const msaRate =
        siteConfig.msaType === 'none'
          ? 0
          : siteConfig.msaType === 'same-all'
            ? rate.msaNonStaff
            : staff
              ? rate.msaStaff
              : rate.msaNonStaff
      const mealsRate =
        siteConfig.mealsType === 'none' ? 0 : staff ? rate.mealsStaff : rate.mealsNonStaff
      const pdf = await generateSiteAllowancePdf({
        period,
        employeeName: employee.name,
        employeeSn: employee.employeeSn || '',
        department: employee.department || '',
        section: employee.section || '',
        siteName: site?.name || '',
        days: dayData,
        lokasiKhususRate: siteConfig.lokasiKhususRate,
        lokasiKhususRateStaff: siteConfig.lokasiKhususRateStaff,
        lokasiKhususRateNonStaff: siteConfig.lokasiKhususRateNonStaff,
        lokasiKhususEnabled: siteConfig.lokasiKhususEnabled,
        msaRate,
        mealsRate,
      })
      const blob = new Blob([new Uint8Array(pdf)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Site_Allowance_${employee.name.replace(/\s+/g, '_')}_${period}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`PDF Site Allowance ${employee.name} berhasil di-generate.`)
    } catch (error) {
      console.error('[PDF Allowance Error]', error)
      toast.error('Generate PDF Allowance gagal', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async function generateEmployeeDailyActivityPdf(employee: EmployeeOption) {
    try {
      const activityKey = `${employee.id}-${period}`
      const monthActivities = activities.filter(
        (activity) => activity.employeeId === employee.id && activity.startTime.startsWith(period)
      )

      if (monthActivities.length === 0) {
        toast.error('Tidak ada aktivitas untuk periode ini.')
        return
      }

      const { generateDailyActivityPdf } = await import(
        '@/lib/timesheet/generate-daily-activity-pdf'
      )
      const pdf = await generateDailyActivityPdf({
        period,
        employeeName: employee.name,
        employeeSn: employee.employeeSn || '',
        department: employee.department || '',
        section: employee.section || '',
        siteName: site?.name || '',
        activities: monthActivities,
      })
      const blob = new Blob([new Uint8Array(pdf)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Daily_Activity_${employee.name.replace(/\s+/g, '_')}_${period}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`PDF Daily Activity ${employee.name} berhasil di-generate.`)
    } catch (error) {
      console.error('[PDF Daily Activity Error]', error)
      toast.error('Generate PDF Daily Activity gagal', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  function downloadAttendanceTemplate() {
    const templateRows = visibleEmployees.map((employee) => {
      const row: Record<string, string | number> = {
        Nama: employee.name,
        SN: employeeSnLabel(employee),
        Jabatan: employee.role,
        Site: employee.locationName ?? site?.name ?? '',
      }

      for (const day of days) {
        row[`D${day}`] = ''
        row[`Masuk ${day}`] = ''
        row[`Pulang ${day}`] = ''
      }

      return row
    })
    const helperRows = [
      { Status: 'Masuk', Keterangan: 'Cell hijau. Bisa isi jam Masuk/Pulang.' },
      { Status: 'Sakit', Keterangan: 'Cell kuning.' },
      { Status: 'Izin', Keterangan: 'Cell biru.' },
      { Status: 'Alpha', Keterangan: 'Cell rose.' },
      { Status: '-', Keterangan: 'Kosong / belum ada data.' },
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(templateRows),
      'Attendance Real'
    )
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(helperRows), 'Panduan')
    XLSX.writeFile(workbook, `attendance-real-template-${period}.xlsx`)
  }

  const attendanceStats = rows.reduce(
    (stats, row) => {
      for (const day of days) {
        const status = getAttendanceCell(row.employee.id, day).status
        stats[status] += 1
      }
      return stats
    },
    { present: 0, empty: 0, sick: 0, leave: 0, absent: 0 } as Record<AttendanceCellStatus, number>
  )

  // Source summary stats for AttendanceSummaryBar (Req 7.1, 7.2, 7.5)
  const attendanceSourceStats = useMemo(() => {
    let faceDays = 0
    let excelDays = 0
    let manualDays = 0
    for (const row of rows) {
      for (const day of days) {
        const cell = getAttendanceCell(row.employee.id, day)
        if (cell.status === 'empty') continue
        if (cell.source === 'attendance') faceDays++
        else if (cell.source === 'excel') excelDays++
        else manualDays++
      }
    }
    const totalFilledDays = faceDays + excelDays + manualDays
    const facePercentage =
      totalFilledDays > 0 ? Math.round((faceDays / totalFilledDays) * 1000) / 10 : 0
    return { faceDays, excelDays, manualDays, totalFilledDays, facePercentage }
  }, [rows, days, manualAttendance, attendanceByCell, period, siteId])

  // Set of employee IDs with zero face attendance records (Req 7.3)
  const employeesWithZeroFace = useMemo(() => {
    const zeroFaceSet = new Set<number>()
    for (const row of rows) {
      let hasFace = false
      for (const day of days) {
        const cell = getAttendanceCell(row.employee.id, day)
        if (cell.source === 'attendance' && cell.status !== 'empty') {
          hasFace = true
          break
        }
      }
      if (!hasFace) zeroFaceSet.add(row.employee.id)
    }
    return zeroFaceSet
  }, [rows, days, manualAttendance, attendanceByCell, period, siteId])

  // Detect Field Break: 14+ consecutive days without attendance = FB period (no MSA/Meals)
  const fieldBreakDaysByEmployee = useMemo(() => {
    const FB_THRESHOLD = 14
    const result = new Map<number, Set<number>>()
    for (const row of rows) {
      const empId = row.employee.id
      const fbDays = new Set<number>()
      // Find consecutive gaps without attendance
      let gapStart = -1
      let gapLength = 0
      for (let d = 1; d <= dayCount; d++) {
        const cell = getAttendanceCell(empId, d)
        const hasAttendance = cell.status === 'present' || cell.clockIn || cell.clockOut
        if (!hasAttendance) {
          if (gapStart === -1) gapStart = d
          gapLength++
        } else {
          // End of gap — if >= 14 days, mark as FB
          if (gapLength >= FB_THRESHOLD) {
            for (let g = gapStart; g < gapStart + gapLength; g++) fbDays.add(g)
          }
          gapStart = -1
          gapLength = 0
        }
      }
      // Check trailing gap
      if (gapLength >= FB_THRESHOLD && gapStart > 0) {
        for (let g = gapStart; g <= dayCount; g++) fbDays.add(g)
      }
      if (fbDays.size > 0) result.set(empId, fbDays)
    }
    return result
  }, [rows, dayCount, getAttendanceCell])

  const selectedAttendanceEmployee = selectedAttendanceCell
    ? visibleEmployees.find((employee) => employee.id === selectedAttendanceCell.employeeId)
    : null
  const selectedAttendanceValue = selectedAttendanceCell
    ? getAttendanceCell(selectedAttendanceCell.employeeId, selectedAttendanceCell.day)
    : null
  const attendanceOvertimeRows = rows.map((row) => {
    const baseHours = row.schedule.reduce((sum, code, index) => {
      if (hoursFromCode(code) <= 0) return sum
      return isHoliday(period, index + 1, holidays) ? sum : sum + 5
    }, 0)
    const calculated = calculateAttendanceOvertime(
      days.map((day) => getAttendanceCell(row.employee.id, day)),
      baseHours
    )

    return {
      ...row,
      attendanceTotalHours: calculated.totalHours,
      attendanceBaseHours: calculated.baseHours,
      attendanceOvertime: calculated.overtime,
    }
  })

  return (
    <div className="space-y-4">
      {isFinalized ? (
        <div className="flex items-center gap-2.5 rounded-[0.9rem] bg-slate-900 px-4 py-3 text-sm font-medium text-white">
          <Lock className="size-4 shrink-0" />
          <span>
            Periode ini sudah di-finalize. Klik <strong>Reopen</strong> untuk membuka kembali
            sebelum mengedit.
          </span>
        </div>
      ) : null}
      <Card className="surface-module-card rounded-[1.1rem] border-0 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="bg-surface-container-low text-primary grid size-9 place-items-center rounded-xl">
              <CalendarDays className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-foreground text-base font-semibold">
                {mode === 'overview' && 'Ringkasan Site'}
                {mode === 'setup' && 'Konfigurasi Site'}
                {mode === 'schedule' && 'Parameter Jadwal'}
                {mode === 'attendance' && 'Attendance Workspace'}
                {mode === 'field-break' && 'Field Break Planning'}
                {mode === 'payroll' && 'MSA + Overtime'}
              </p>
              <p className="text-muted-foreground text-xs">
                Pilih site dan periode untuk melihat data.
              </p>
            </div>
          </div>
          {currentStatus ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="bg-surface-container-low text-muted-foreground ring-border/40 inline-flex items-center rounded-full px-2.5 py-1 font-medium ring-1">
                Schedule: {currentStatus.scheduleStatus || 'none'}
              </span>
              <span className="bg-surface-container-low text-muted-foreground ring-border/40 inline-flex items-center rounded-full px-2.5 py-1 font-medium ring-1">
                Attendance: {currentStatus.attendanceStatus || 'none'}
              </span>
              {currentStatus.finalizedAt ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white">
                  <Lock className="size-3" /> Finalized
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_160px_160px_auto] lg:items-end">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
              Site
            </Label>
            <NativeSelect
              value={siteId}
              onValueChange={setSiteId}
              options={[
                { value: 'all', label: 'Pilih site dahulu' },
                ...sites.map((item) => ({ value: String(item.id), label: extractSiteNameLocal(item.name) || item.name })),
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
              Periode
            </Label>
            <Input
              type="month"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
              Tipe Site
            </Label>
            <NativeSelect
              value={siteConfig.scheduleType}
              onValueChange={(value) => updateSiteConfig('scheduleType', value as SiteScheduleType)}
              options={[
                { value: 'office', label: 'Office / Non Shift' },
                { value: 'shift', label: 'Shift DS / NS' },
                { value: 'hybrid', label: 'Hybrid (Staff: Office, Non Staff: Shift)' },
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
              Roster
            </Label>
            <NativeSelect
              value={siteConfig.rosterType}
              onValueChange={(value) => updateSiteConfig('rosterType', value as SiteRosterType)}
              options={[
                { value: '5:2', label: 'Roster 5 : 2' },
                { value: '6:1', label: 'Roster 6 : 1' },
                { value: 'vale', label: 'Vale Sorowako' },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-2 lg:pt-0">
            {mode === 'schedule' ? (
              <Button
                className="h-10 w-full lg:w-auto"
                disabled={siteId === 'all' || isFinalized}
                onClick={() => {
                  saveSiteConfig()
                  setIsGenerated(true)
                }}
              >
                <RefreshCw className="mr-2 size-4" /> Generate Auto Scheduling
              </Button>
            ) : null}
            {isFinalized ? (
              <Button
                variant="outline"
                disabled={isSavingSchedule}
                onClick={() => setReopenDialogOpen(true)}
              >
                Reopen
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={siteId === 'all' || isSavingSchedule}
                onClick={() => setFinalizeDialogOpen(true)}
              >
                Finalize
              </Button>
            )}
          </div>
        </div>
      </Card>

      {mode === 'schedule' || mode === 'payroll' ? (
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: 'Karyawan', value: rows.length, Icon: CalendarDays },
            {
              label: 'Total jam schedule',
              value: rows.reduce((sum, row) => sum + row.totalHours, 0),
              Icon: Clock3,
            },
            {
              label: 'Estimasi MSA + Meals',
              value: money(rows.reduce((sum, row) => sum + row.msa + row.meals, 0)),
              Icon: Calculator,
            },
            { label: 'Backup list', value: backupAssignments.length, Icon: Settings2 },
          ].map(({ label, value, Icon }) => (
            <Card key={label} className="surface-module-card rounded-[1rem] border-0 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  {label}
                </p>
                <div className="bg-surface-container-low text-muted-foreground flex size-7 items-center justify-center rounded-full">
                  <Icon className="size-3.5" />
                </div>
              </div>
              <p className="font-display text-foreground mt-2 text-2xl font-semibold tracking-tight">
                {String(value)}
              </p>
            </Card>
          ))}
        </div>
      ) : null}

      {backupAssignments.length > 0 && mode === 'schedule' ? (
        <Card className="surface-module-card rounded-[1.1rem] border-0 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-foreground font-semibold">List Pengganti / Backup</p>
              <p className="text-muted-foreground text-sm">
                Terisi otomatis dari form edit nama karyawan.
              </p>
            </div>
            <Badge variant="outline">{backupAssignments.length} assignment</Badge>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {backupAssignments.map((item) => (
              <div key={item.id} className="bg-surface-container-low rounded-xl p-3 text-sm">
                <p className="text-foreground font-semibold">{item.backupName}</p>
                <p className="text-muted-foreground">Backup untuk {item.employeeName}</p>
                <p className="text-muted-foreground mt-1 text-xs tracking-[0.12em] uppercase">
                  {item.type} • {item.dateRange}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {mode === 'setup' ? (
        <section className="space-y-4">
          {/* Config card */}
          <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
            <div className="border-border/40 bg-surface-container-low flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <p className="font-display text-foreground text-base font-semibold">
                  Konfigurasi Site
                </p>
                <p className="text-muted-foreground text-xs">
                  Tersimpan per site — tidak perlu set ulang setiap bulan.
                </p>
              </div>
              <Button size="sm" disabled={siteId === 'all' || isFinalized} onClick={saveSiteConfig}>
                <Save className="mr-2 size-4" /> Simpan Setting
              </Button>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Tipe Shift
                </Label>
                <NativeSelect
                  value={siteConfig.scheduleType}
                  onValueChange={(value) =>
                    updateSiteConfig('scheduleType', value as SiteScheduleType)
                  }
                  options={[
                    { value: 'office', label: 'Office / Non Shift' },
                    { value: 'shift', label: 'Shift DS / NS' },
                    { value: 'hybrid', label: 'Hybrid (Staff: Office, Non Staff: Shift)' },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Tipe Roster
                </Label>
                <NativeSelect
                  value={siteConfig.rosterType}
                  onValueChange={(value) => updateSiteConfig('rosterType', value as SiteRosterType)}
                  options={[
                    { value: '5:2', label: 'Roster 5 : 2' },
                    { value: '6:1', label: 'Roster 6 : 1' },
                    { value: 'vale', label: 'Vale Sorowako' },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Tipe MSA
                </Label>
                <NativeSelect
                  value={siteConfig.msaType}
                  onValueChange={(value) => updateSiteConfig('msaType', value as SiteMsaType)}
                  options={[
                    { value: 'staff-nonstaff', label: 'Rate Staff / Non Staff' },
                    { value: 'same-all', label: 'Sama Semua' },
                    { value: 'none', label: 'Tidak dihitung' },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Tipe Meals
                </Label>
                <NativeSelect
                  value={siteConfig.mealsType}
                  onValueChange={(value) => updateSiteConfig('mealsType', value as SiteMealsType)}
                  options={[
                    { value: 'field-break', label: 'Hanya Field Break' },
                    { value: 'workday', label: 'Semua Hari Kerja' },
                    { value: 'none', label: 'Tidak dihitung' },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Hitungan OT
                </Label>
                <NativeSelect
                  value={siteConfig.overtimeType}
                  onValueChange={(value) =>
                    updateSiteConfig('overtimeType', value as SiteOvertimeType)
                  }
                  options={[
                    { value: 'five-hour', label: 'Total jam - 5 jam dasar' },
                    { value: 'roster', label: 'Ikut roster' },
                    { value: 'none', label: 'Tidak dihitung' },
                  ]}
                />
              </div>
            </div>
            <div className="border-border/30 grid gap-4 border-t px-4 py-4 sm:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Default Shift
                </Label>
                <NativeSelect
                  value={siteConfig.defaultShiftType}
                  onValueChange={(value) =>
                    updateSiteConfig('defaultShiftType', value as DefaultShiftType)
                  }
                  options={[
                    { value: 'day-shift', label: 'Day Shift' },
                    { value: 'night-shift', label: 'Night Shift' },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Jam Masuk
                </Label>
                <Input
                  type="time"
                  value={siteConfig.defaultClockIn}
                  onChange={(event) => updateSiteConfig('defaultClockIn', event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Jam Pulang
                </Label>
                <Input
                  type="time"
                  value={siteConfig.defaultClockOut}
                  onChange={(event) => updateSiteConfig('defaultClockOut', event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Lembur Awal (Jam)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={siteConfig.defaultEarlyOvertimeHours}
                  onChange={(event) =>
                    updateSiteConfig('defaultEarlyOvertimeHours', Number(event.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Batas Jam Lembur
                </Label>
                <Input
                  type="time"
                  value={siteConfig.defaultOvertimeEnd}
                  onChange={(event) => updateSiteConfig('defaultOvertimeEnd', event.target.value)}
                />
              </div>
            </div>
            {/* Tunjangan Lokasi Khusus */}
            <div className="border-border/30 flex flex-wrap items-end gap-4 border-t px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="lokasi-khusus-toggle"
                  checked={siteConfig.lokasiKhususEnabled}
                  onChange={(e) => updateSiteConfig('lokasiKhususEnabled', e.target.checked)}
                  className="border-border size-4 rounded"
                />
                <Label
                  htmlFor="lokasi-khusus-toggle"
                  className="text-foreground cursor-pointer text-sm font-semibold"
                >
                  Tunjangan Lokasi Khusus
                </Label>
                <span className="text-muted-foreground text-[10px]">
                  (Site ini dapat tunjangan pertambangan/remote)
                </span>
              </div>
              {siteConfig.lokasiKhususEnabled ? (
                <>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase">
                      Rate Staff / hari
                    </Label>
                    <Input
                      type="number"
                      value={siteConfig.lokasiKhususRateStaff}
                      onChange={(e) =>
                        updateSiteConfig('lokasiKhususRateStaff', Number(e.target.value) || 0)
                      }
                      className="h-9 w-[140px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase">
                      Rate Non Staff / hari
                    </Label>
                    <Input
                      type="number"
                      value={siteConfig.lokasiKhususRateNonStaff}
                      onChange={(e) =>
                        updateSiteConfig('lokasiKhususRateNonStaff', Number(e.target.value) || 0)
                      }
                      className="h-9 w-[140px]"
                    />
                  </div>
                </>
              ) : null}
            </div>
          </Card>
        </section>
      ) : null}
      {mode === 'setup' ? (
        <section className="space-y-4">
          <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
            <div className="border-border/40 bg-surface-container-low flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <p className="font-display text-foreground text-base font-semibold">
                  Variabel MSA, Meals &amp; Overtime
                </p>
                <p className="text-muted-foreground text-xs">
                  Nama projek dipilih dari Master Site agar matching rate lebih akurat.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={resetAllowanceVariables}>
                  Reset
                </Button>
                <Button size="sm" onClick={saveAllowanceVariables}>
                  <Save className="mr-2 size-4" /> Simpan MSA/Meals
                </Button>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="bg-surface-container-low text-muted-foreground text-left text-[11px] tracking-[0.12em] uppercase">
                    <th className="px-3 py-2.5 font-medium">No</th>
                    <th className="px-3 py-2.5 font-medium">Nama Site / Projek</th>
                    <th className="px-3 py-2.5 font-medium">MSA Staff</th>
                    <th className="px-3 py-2.5 font-medium">MSA Non Staff</th>
                    <th className="px-3 py-2.5 font-medium">Meals Staff</th>
                    <th className="px-3 py-2.5 font-medium">Meals Non Staff</th>
                    <th className="px-3 py-2.5 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {allowanceVariables.map((item, index) => {
                    const projectOptions = siteNameOptions.includes(item.project)
                      ? siteNameOptions
                      : [item.project, ...siteNameOptions]

                    return (
                      <tr
                        key={`${item.project}-${index}`}
                        className="border-border/30 hover:bg-surface-container-low/40 border-b transition"
                      >
                        <td className="px-3 py-2">{index + 1}</td>
                        <td className="px-3 py-2">
                          <NativeSelect
                            value={item.project}
                            onValueChange={(value) =>
                              updateAllowanceVariable(index, 'project', value)
                            }
                            options={projectOptions.map((siteName) => ({
                              value: siteName,
                              label: siteName,
                            }))}
                            placeholder="Pilih site"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={item.msaStaff}
                            onChange={(event) =>
                              updateAllowanceVariable(index, 'msaStaff', event.target.value)
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={item.msaNonStaff}
                            onChange={(event) =>
                              updateAllowanceVariable(index, 'msaNonStaff', event.target.value)
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={item.mealsStaff}
                            onChange={(event) =>
                              updateAllowanceVariable(index, 'mealsStaff', event.target.value)
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            value={item.mealsNonStaff}
                            onChange={(event) =>
                              updateAllowanceVariable(index, 'mealsNonStaff', event.target.value)
                            }
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeAllowanceVariable(index)}
                          >
                            Hapus
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-border/30 border-t px-4 py-3">
              <Button size="sm" variant="outline" onClick={addAllowanceVariable}>
                + Tambah Project
              </Button>
            </div>
          </Card>

          <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
            <div className="border-border/40 bg-surface-container-low flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <p className="font-display text-foreground text-base font-semibold">
                  Variabel Hitungan Overtime
                </p>
                <p className="text-muted-foreground text-xs">
                  Atur hitungan lembur per roster dan hari kerja/libur.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={resetOvertimeVariables}>
                  Reset
                </Button>
                <Button size="sm" onClick={saveOvertimeVariables}>
                  <Save className="mr-2 size-4" /> Simpan Overtime
                </Button>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="bg-surface-container-low text-muted-foreground text-left text-[11px] tracking-[0.12em] uppercase">
                    <th className="px-3 py-2.5 font-medium">Roster</th>
                    <th className="px-3 py-2.5 font-medium">Tipe Hari</th>
                    <th className="px-3 py-2.5 font-medium">Total Jam</th>
                    <th className="px-3 py-2.5 font-medium">Hitungan Lembur</th>
                    <th className="px-3 py-2.5 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {overtimeVariables.map((item, index) => (
                    <tr
                      key={`${item.roster}-${item.dayType}-${item.totalHours}-${index}`}
                      className="border-b border-slate-100"
                    >
                      <td className="px-3 py-2">
                        <NativeSelect
                          value={item.roster}
                          onValueChange={(value) => updateOvertimeVariable(index, 'roster', value)}
                          options={[
                            { value: '5:2', label: '5 : 2' },
                            { value: '6:1', label: '6 : 1' },
                            { value: 'vale', label: 'Vale Sorowako' },
                          ]}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <NativeSelect
                          value={item.dayType}
                          onValueChange={(value) => updateOvertimeVariable(index, 'dayType', value)}
                          options={[
                            { value: 'work', label: 'Hari Kerja' },
                            { value: 'off', label: 'Hari Libur' },
                          ]}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.5"
                          value={item.totalHours}
                          onChange={(event) =>
                            updateOvertimeVariable(index, 'totalHours', event.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.5"
                          value={item.overtimeHours}
                          onChange={(event) =>
                            updateOvertimeVariable(index, 'overtimeHours', event.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeOvertimeVariable(index)}
                        >
                          Hapus
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-border/30 border-t px-4 py-3">
              <Button size="sm" variant="outline" onClick={addOvertimeVariable}>
                + Tambah Overtime
              </Button>
            </div>
          </Card>
        </section>
      ) : null}

      {mode === 'schedule' ? (
        <section className="space-y-3">
          <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
            <div className="border-border/40 bg-surface-container-low flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <p className="font-display text-foreground text-base font-semibold">
                  Draft Schedule
                </p>
                <p className="text-muted-foreground text-xs">
                  Generate → edit → save ke Schedule Tetap.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSyncingHolidays}
                  onClick={syncHolidays}
                >
                  <RefreshCw className="mr-2 size-4" />{' '}
                  {isSyncingHolidays ? 'Sync...' : 'Sync Libur Nasional'}
                </Button>
                <TabExportActions tabTitle="Schedule" tableRows={rows} />
                <Button
                  size="sm"
                  disabled={rows.length === 0 || isSavingSchedule || isFinalized}
                  onClick={saveScheduleToPermanent}
                >
                  <Save className="mr-2 size-4" />{' '}
                  {isSavingSchedule ? 'Menyimpan...' : 'Save ke Schedule Tetap'}
                </Button>
              </div>
            </div>
          </Card>
          {holidays.length ? (
            <Card className="surface-module-card flex flex-wrap gap-2 rounded-[1rem] border-0 p-3 text-sm">
              {holidays.map((holiday) => (
                <Badge key={holiday.date} variant="secondary">
                  {holiday.day}: {holiday.localName || holiday.name}
                </Badge>
              ))}
            </Card>
          ) : null}
          {selectedCell ? (
            <Card className="surface-module-card flex flex-wrap items-center gap-3 rounded-[1rem] border-0 p-3">
              <Badge variant="outline">Edit cell: hari {selectedCell.day}</Badge>
              <NativeSelect
                value={selectedCode}
                onValueChange={(value) => setSelectedCode(value as ScheduleCode)}
                options={codeCycle.map((code) => ({
                  value: code,
                  label: code === 'IN' ? '✓ Masuk' : code,
                }))}
                className="w-[180px]"
              />
              <p className="text-muted-foreground text-sm">
                Shift pakai DS/NS. Office pakai ✓, weekend OFF; weekend lembur bisa diedit manual ke
                ✓/DS/NS.
              </p>
              <div className="flex flex-wrap items-center gap-2 border-l pl-3">
                <span className="text-foreground text-sm font-semibold">
                  Tukar OFF satu section
                </span>
                <NativeSelect
                  value={swapTargetEmployeeId}
                  onValueChange={setSwapTargetEmployeeId}
                  disabled={isFinalized || swapTargetRows.length === 0}
                  className="w-[240px]"
                  placeholder="Pilih target"
                  options={swapTargetRows.map((row) => {
                    const code =
                      overrides[`${row.employee.id}-${selectedCell.day}`] ??
                      row.schedule[selectedCell.day - 1]
                    return {
                      value: String(row.employee.id),
                      label: `${row.employee.name} · ${code}`,
                    }
                  })}
                />
                <Button
                  size="sm"
                  disabled={isFinalized || !swapTargetEmployeeId || swapTargetRows.length === 0}
                  onClick={swapSelectedScheduleCell}
                >
                  Tukar OFF
                </Button>
                <p className="text-muted-foreground text-xs">
                  {swapTargetRows.length
                    ? 'Target hanya karyawan satu section; salah satu cell wajib OFF.'
                    : 'Tidak ada target satu section dengan OFF di hari ini.'}
                </p>
              </div>
            </Card>
          ) : null}
          <div className="space-y-5">
            {sectionOptions.map((section) => renderRosterTable(rows, section, 'draft', cycleCell))}
          </div>
        </section>
      ) : null}

      {mode === 'attendance' ? (
        <section className="space-y-3">
          <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
            <div className="border-border/40 bg-surface-container-low flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <p className="font-display text-foreground text-base font-semibold">
                  Attendance Real
                </p>
                <p className="text-muted-foreground text-xs">
                  Terhubung dari face/location. Edit manual atau import via Excel.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/* Import button with loading + success state */}
                <Button
                  asChild
                  size="sm"
                  variant={lastImportSuccess ? 'default' : 'outline'}
                  disabled={isFinalized || isImportingExcel}
                  className={
                    lastImportSuccess ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''
                  }
                >
                  <Label className="h-9 cursor-pointer px-3">
                    {isImportingExcel ? (
                      <>
                        <RefreshCw className="mr-2 size-4 animate-spin" /> Memproses...
                      </>
                    ) : lastImportSuccess ? (
                      <>
                        <Check className="mr-2 size-4" /> Berhasil ({lastImportSuccess.matched}{' '}
                        matched)
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 size-4" /> Import Excel
                      </>
                    )}
                    <Input
                      disabled={isFinalized || isImportingExcel}
                      className="hidden"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(event) => {
                        void importAttendanceExcel(event.target.files?.[0] ?? null)
                        event.currentTarget.value = ''
                      }}
                    />
                  </Label>
                </Button>
                <Button size="sm" variant="outline" onClick={downloadAttendanceTemplate}>
                  <Download className="mr-2 size-4" /> Template Excel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSavingAttendance || siteId === 'all' || isFinalized}
                  onClick={() => setClearExcelImportDialogOpen(true)}
                >
                  <Trash2 className="mr-2 size-4" /> Delete Excel Import
                </Button>
                <Button
                  size="sm"
                  disabled={
                    !isAttendanceDirty || isSavingAttendance || siteId === 'all' || isFinalized
                  }
                  onClick={saveAttendanceReal}
                >
                  <Save className="mr-2 size-4" />{' '}
                  {isSavingAttendance ? 'Menyimpan...' : 'Save Attendance'}
                </Button>
                <TabExportActions
                  tabTitle="Attendance Real"
                  columns={[
                    'Nama',
                    'Masuk',
                    'Belum',
                    'Sakit',
                    'Izin',
                    'Alpha',
                    'Manual',
                    'Excel',
                    'FaceLoc',
                  ]}
                  exportRows={rows.map((row) => {
                    const cells = days.map((day) => getAttendanceCell(row.employee.id, day))
                    const statuses = cells.map((cell) => cell.status)
                    return [
                      row.employee.name,
                      statuses.filter((status) => status === 'present').length,
                      statuses.filter((status) => status === 'empty').length,
                      statuses.filter((status) => status === 'sick').length,
                      statuses.filter((status) => status === 'leave').length,
                      statuses.filter((status) => status === 'absent').length,
                      cells.filter((cell) => cell.source === 'manual').length,
                      cells.filter((cell) => cell.source === 'excel').length,
                      cells.filter((cell) => cell.source === 'attendance').length,
                    ]
                  })}
                />
              </div>
            </div>
          </Card>
          {lastImportSuccess ? (
            <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
              <div className="flex items-center gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
                  <Check className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-emerald-900">
                    Import berhasil — {lastImportSuccess.matched} karyawan matched
                  </p>
                  <p className="text-xs text-emerald-700">
                    {lastImportSuccess.filename}
                    {lastImportSuccess.unmatchedNames && lastImportSuccess.unmatchedNames.length > 0
                      ? ` · ${lastImportSuccess.unmatchedNames.length} karyawan tidak cocok`
                      : ' · Semua karyawan teridentifikasi'}
                  </p>
                </div>
                <button
                  className="shrink-0 rounded p-1 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-900"
                  onClick={() => setLastImportSuccess(null)}
                  aria-label="Tutup"
                >
                  ✕
                </button>
              </div>
              {lastImportSuccess.unmatchedNames && lastImportSuccess.unmatchedNames.length > 0 ? (
                <div className="border-t border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="mb-2 text-xs font-semibold text-amber-900">
                    {lastImportSuccess.unmatchedNames.length} nama dari Excel tidak ditemukan di
                    sistem:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {lastImportSuccess.unmatchedNames.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-amber-700">
                    Pastikan nama di Excel sama persis dengan nama di Data Induk Karyawan, atau
                    tambahkan alias di menu Setup.
                  </p>
                </div>
              ) : null}
            </Card>
          ) : null}
          {holidays.length ? (
            <Card className="surface-module-card flex flex-wrap gap-2 rounded-[1rem] border-0 p-3 text-sm">
              {holidays.map((holiday) => (
                <Badge
                  key={`attendance-${holiday.date}`}
                  variant="secondary"
                  title={holiday.localName || holiday.name}
                >
                  {holiday.day}: {holiday.localName || holiday.name}
                </Badge>
              ))}
            </Card>
          ) : null}
          {attendanceImportPreview || attendanceSavedAt || isAttendanceDirty ? (
            <div className="bg-surface-container-low flex flex-wrap items-center gap-2 rounded-[0.8rem] px-3 py-2 text-xs">
              {isAttendanceDirty ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800 ring-1 ring-amber-200">
                  Belum tersimpan
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Tersimpan
                </span>
              )}
              {attendanceSavedAt ? (
                <span className="text-muted-foreground">
                  Last save: {new Date(attendanceSavedAt).toLocaleString('id-ID')}
                </span>
              ) : null}
              {attendanceImportPreview ? (
                <span className="text-muted-foreground">
                  Preview: {attendanceImportPreview.matchedCount} matched ·{' '}
                  {attendanceImportPreview.cellCount} cells ·{' '}
                  {attendanceImportPreview.conflictCount} conflicts
                </span>
              ) : null}
            </div>
          ) : null}
          <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
            <div className="border-border/40 bg-surface-container-low flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <div>
                <p className="font-display text-foreground text-sm font-semibold">
                  <History className="mr-1.5 inline size-4" />
                  Import History
                </p>
                <p className="text-muted-foreground text-xs">
                  Rollback hapus batch tertentu; Delete Excel Import hapus semua Excel bulan ini.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void refreshAttendanceImportHistory()}
              >
                Refresh
              </Button>
            </div>
            <div className="divide-border/30 divide-y">
              {attendanceImportHistory.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{item.filename}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.templateKind} · {item.sheetName || 'auto'} ·{' '}
                      {new Date(item.createdAt).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.status}</Badge>
                    <span className="text-muted-foreground">
                      {item.matchedCount} matched · {item.unmatchedCount} fix · {item.conflictCount}{' '}
                      conflict
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSavingAttendance || isFinalized || item.status !== 'applied'}
                      onClick={() => rollbackAttendanceImport(item.id)}
                    >
                      <Undo2 className="mr-2 size-4" />
                      Rollback
                    </Button>
                  </div>
                </div>
              ))}
              {!attendanceImportHistory.length ? (
                <div className="text-muted-foreground px-4 py-6 text-center text-sm">
                  Belum ada import history.
                </div>
              ) : null}
            </div>
          </Card>
          {attendanceConflicts.length && !conflictsDismissed ? (
            <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-amber-900">
                    {attendanceConflicts.length} Attendance Conflict
                  </p>
                  <p className="text-xs text-amber-700">
                    Hadir di hari OFF/FB/Sakit/Libur — perlu resolusi.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowConflictsOnly((value) => !value)}
                  >
                    {showConflictsOnly ? 'Tampilkan semua' : 'Hanya konflik'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isFinalized}
                    onClick={clearAllAttendanceConflicts}
                  >
                    Clear semua attendance
                  </Button>
                  <Button
                    size="sm"
                    disabled={isFinalized}
                    onClick={markAllConflictSchedulesWorking}
                  >
                    Pakai attendance (mark working)
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConflictsDismissed(true)}
                  >
                    Tutup
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {attendanceConflicts.slice(0, 12).map((conflict) => (
                  <div
                    key={`${conflict.employeeId}-${conflict.day}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-orange-50 p-2 text-sm"
                  >
                    <span>
                      {conflict.employeeName} · day {conflict.day} · {conflict.scheduleCode} ·{' '}
                      {attendanceStatusLabel(conflict.currentCell.status)}
                    </span>
                    <span className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isFinalized}
                        onClick={() => clearAttendanceConflict(conflict.employeeId, conflict.day)}
                      >
                        Clear attendance
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isFinalized}
                        onClick={() =>
                          markConflictScheduleWorking(conflict.employeeId, conflict.day)
                        }
                      >
                        Mark schedule working
                      </Button>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
          <AttendanceRealBulkToolbar
            enabled={multiSelectAttendance}
            selectedCount={selectedAttendanceKeys.length}
            onToggle={() => setMultiSelectAttendance((value) => !value)}
            onSetPresent={() =>
              applyBulkAttendance({ status: 'present', clockIn: '08:00', clockOut: '17:00' })
            }
            onSetSick={() => applyBulkAttendance({ status: 'sick', clockIn: '', clockOut: '' })}
            onSetLeave={() => applyBulkAttendance({ status: 'leave', clockIn: '', clockOut: '' })}
            onSetEmpty={() =>
              applyBulkAttendance({ status: 'empty', clockIn: '', clockOut: '', note: '' })
            }
            onClear={clearAttendanceSelection}
          />
          {/* Switch View: Attendance / MSA / Meals / OVT */}
          <div className="bg-surface-container-low flex items-center gap-1.5 rounded-[0.8rem] p-1">
            {(
              [
                { key: 'attendance', label: 'Attendance' },
                { key: 'lokasi', label: 'Lokasi Khusus' },
                { key: 'msa', label: 'MSA' },
                { key: 'meals', label: 'Meals' },
                { key: 'ovt', label: 'Overtime' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setAttendanceView(tab.key)}
                className={`rounded-[0.6rem] px-3.5 py-1.5 text-xs font-semibold transition ${
                  attendanceView === tab.key
                    ? 'bg-foreground text-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-container-lowest'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              [
                'Masuk',
                attendanceStats.present,
                'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
              ],
              ['-', attendanceStats.empty, 'bg-slate-50 text-slate-600 ring-1 ring-slate-200'],
              ['Sakit', attendanceStats.sick, 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'],
              ['Izin', attendanceStats.leave, 'bg-sky-50 text-sky-800 ring-1 ring-sky-200'],
              ['Alpha', attendanceStats.absent, 'bg-rose-50 text-rose-800 ring-1 ring-rose-200'],
            ].map(([label, value, className]) => (
              <Card key={String(label)} className={`rounded-[1rem] border-0 p-4 ${className}`}>
                <p className="text-xs font-semibold tracking-[0.14em] uppercase opacity-75">
                  {label}
                </p>
                <p className="font-display mt-2 text-2xl font-semibold">{String(value)}</p>
              </Card>
            ))}
          </div>
          {/* Face Attendance Source Summary Bar (Req 7.1, 7.2, 7.5) */}
          <AttendanceSummaryBar
            faceDays={attendanceSourceStats.faceDays}
            excelDays={attendanceSourceStats.excelDays}
            manualDays={attendanceSourceStats.manualDays}
            totalFilledDays={attendanceSourceStats.totalFilledDays}
            facePercentage={attendanceSourceStats.facePercentage}
          />
          <Card className="surface-module-card relative overflow-hidden rounded-[1.2rem] border-0 p-0">
            {isImportingExcel ? (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm">
                <RefreshCw className="text-primary size-8 animate-spin" />
                <p className="text-foreground text-sm font-semibold">Memproses file Excel...</p>
                <p className="text-muted-foreground text-xs">
                  Mencocokkan nama karyawan dengan Fuse.js
                </p>
              </div>
            ) : null}
            {/* View title */}
            {attendanceView !== 'attendance' ? (
              <div className="border-border/40 bg-surface-container-low border-b px-4 py-2.5">
                <p className="text-foreground text-xs font-bold tracking-[0.14em] uppercase">
                  {attendanceView === 'msa' &&
                    `MSA SUMMARY — Rate: Staff Rp ${rate.msaStaff.toLocaleString('id-ID')} / Non-Staff Rp ${rate.msaNonStaff.toLocaleString('id-ID')}`}
                  {attendanceView === 'lokasi' &&
                    `TUNJANGAN LOKASI KHUSUS — ${siteConfig.lokasiKhususEnabled ? `Staff: Rp ${siteConfig.lokasiKhususRateStaff.toLocaleString('id-ID')}/hari | Non Staff: Rp ${siteConfig.lokasiKhususRateNonStaff.toLocaleString('id-ID')}/hari` : 'Tidak aktif'}`}
                  {attendanceView === 'meals' &&
                    `MEALS SUMMARY — Rate: Staff Rp ${rate.mealsStaff.toLocaleString('id-ID')} / Non-Staff Rp ${rate.mealsNonStaff.toLocaleString('id-ID')} (${siteConfig.mealsType})`}
                  {attendanceView === 'ovt' && 'OVERTIME SUMMARY'} {period} · {rate.project}
                </p>
              </div>
            ) : null}
            <div className="max-w-full overflow-x-auto overflow-y-visible">
              <table className="w-max min-w-[1400px] table-fixed border-separate border-spacing-0 text-xs">
                <thead>
                  <tr className="bg-surface-container-low text-muted-foreground text-left tracking-[0.12em] uppercase">
                    <th className="bg-surface-container-low sticky left-0 z-30 w-[220px] min-w-[220px] px-3 py-3 shadow-[8px_0_16px_-14px_rgba(15,23,42,0.55)]">
                      Nama
                    </th>
                    {days.map((day) => {
                      const holiday = holidaysByDay.get(day)
                      const holidayName = holiday?.localName ?? holiday?.name
                      return (
                        <th
                          key={day}
                          title={holidayName}
                          className={`w-[52px] min-w-[52px] px-1 py-3 text-center ${holiday ? 'bg-amber-100/70 ring-1 ring-amber-300 ring-inset' : ''}`}
                        >
                          {day}
                          <br />
                          <span className="tracking-normal normal-case">
                            {weekdayLabel(period, day)}
                          </span>
                          {holiday ? (
                            <Badge
                              variant="secondary"
                              className="mt-1 px-1 text-[9px]"
                              title={holidayName}
                            >
                              Libur
                            </Badge>
                          ) : null}
                        </th>
                      )
                    })}
                    {attendanceView !== 'attendance' ? (
                      <th className="w-[80px] min-w-[80px] px-2 py-3 text-right">Total</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Group by Department > Section
                    const grouped = new Map<string, Map<string, typeof displayedAttendanceRows>>()
                    for (const row of displayedAttendanceRows) {
                      const dept = row.employee.department || 'Tanpa Departemen'
                      const section = row.employee.section || row.employee.role || 'Umum'
                      if (!grouped.has(dept)) grouped.set(dept, new Map())
                      const deptMap = grouped.get(dept)!
                      if (!deptMap.has(section)) deptMap.set(section, [])
                      deptMap.get(section)!.push(row)
                    }
                    return Array.from(grouped.entries()).map(([dept, sections]) => (
                      <React.Fragment key={dept}>
                        <tr className="bg-slate-100">
                          <td
                            colSpan={days.length + 1}
                            className="text-foreground sticky left-0 z-20 px-3 py-2 text-[11px] font-bold tracking-[0.14em] uppercase"
                          >
                            {dept}
                          </td>
                        </tr>
                        {Array.from(sections.entries()).map(([section, sectionRows]) => (
                          <React.Fragment key={`${dept}-${section}`}>
                            <tr className="bg-surface-container-low/60">
                              <td
                                colSpan={days.length + 1}
                                className="text-muted-foreground sticky left-0 z-20 px-3 py-1.5 pl-6 text-[10px] font-semibold tracking-[0.12em] uppercase"
                              >
                                {section}{' '}
                                <span className="font-normal">({sectionRows.length})</span>
                              </td>
                            </tr>
                            {sectionRows.map((row) => (
                              <tr
                                key={row.employee.id}
                                className={`group border-b border-slate-100 ${employeesWithZeroFace.has(row.employee.id) ? 'bg-rose-50/40' : ''}`}
                              >
                                <td
                                  className={`text-foreground sticky left-0 z-20 min-w-[220px] px-3 py-2 font-semibold shadow-[8px_0_16px_-14px_rgba(15,23,42,0.55)] ${employeesWithZeroFace.has(row.employee.id) ? 'bg-rose-50/40' : 'bg-white'}`}
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <div>
                                      {row.employee.name}
                                      <p className="text-muted-foreground text-[10px] font-normal">
                                        {row.employee.section || row.employee.role}
                                      </p>
                                    </div>
                                    <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                                      <button
                                        className="text-primary hover:bg-primary/10 rounded px-1.5 py-0.5 text-[9px] font-semibold"
                                        title="Generate Overtime Record PDF"
                                        onClick={() => generateEmployeeOvertimePdf(row.employee)}
                                      >
                                        OT
                                      </button>
                                      <button
                                        className="text-primary hover:bg-primary/10 rounded px-1.5 py-0.5 text-[9px] font-semibold"
                                        title="Generate Site Allowance PDF"
                                        onClick={() => generateEmployeeAllowancePdf(row.employee)}
                                      >
                                      MSA
                                      </button>
                                      <button
                                        className="text-primary hover:bg-primary/10 rounded px-1.5 py-0.5 text-[9px] font-semibold"
                                        title="Generate Daily Activity PDF"
                                        onClick={() => generateEmployeeDailyActivityPdf(row.employee)}
                                      >
                                        DA
                                      </button>
                                    </div>
                                  </div>
                                </td>
                                {days.map((day) => {
                                  const cell = getAttendanceCell(row.employee.id, day)
                                  const scheduleCode = row.schedule[day - 1] as string
                                  const holiday = holidaysByDay.get(day)
                                  const holidayName = holiday?.localName ?? holiday?.name
                                  const isHolidayDay = Boolean(holiday)
                                  const isOff =
                                    scheduleCode === 'OFF' ||
                                    scheduleCode === 'FB' ||
                                    scheduleCode === 'Libur' ||
                                    scheduleCode === 'Sakit'
                                  const staff = isStaffRole(row.employee.role)

                                  // MSA/Meals/OVT view
                                  if (attendanceView !== 'attendance') {
                                    let cellValue: string | number = ''
                                    let cellBg = ''
                                    // Check if this day is in a Field Break period (14+ days no attendance)
                                    const isFieldBreakDay =
                                      fieldBreakDaysByEmployee.get(row.employee.id)?.has(day) ??
                                      false

                                    // Logika tunjangan:
                                    // - OFF roster / Libur nasional = dapat (tidak perlu absen)
                                    // - Hadir (present) = dapat
                                    // - Izin/Sakit/Alpha = tidak dapat
                                    // - Hari kerja kosong (bukan libur nasional) = tidak dapat
                                    // - Field Break period = tidak dapat
                                    const isRosterOff = scheduleCode === 'OFF' || scheduleCode === 'Libur'
                                    const isNationalHoliday = Boolean(isHolidayDay)
                                    const isWorkDay = !isRosterOff
                                    const isAbsent = cell.status === 'leave' || cell.status === 'sick' || cell.status === 'absent'
                                    const isEmptyWorkDay = isWorkDay && !isNationalHoliday && cell.status === 'empty'
                                    const noAllowance = isAbsent || isEmptyWorkDay
                                    const absentLabel = cell.status === 'leave' ? 'Izin' : cell.status === 'sick' ? 'Sakit' : cell.status === 'absent' ? 'Alpha' : '-'

                                    if (attendanceView === 'msa') {
                                      if (isFieldBreakDay && cell.status !== 'present') {
                                        cellValue = 'FB'
                                        cellBg = 'bg-purple-50 text-purple-700'
                                      } else if (noAllowance) {
                                        cellValue = absentLabel
                                        cellBg = 'bg-rose-50 text-rose-700'
                                      } else {
                                        const msaRate =
                                          siteConfig.msaType === 'none'
                                            ? 0
                                            : siteConfig.msaType === 'same-all'
                                              ? rate.msaNonStaff
                                              : staff
                                                ? rate.msaStaff
                                                : rate.msaNonStaff
                                        cellValue = msaRate
                                        cellBg = isNationalHoliday
                                          ? 'bg-amber-50 text-foreground'
                                          : isRosterOff
                                            ? 'bg-slate-50 text-foreground'
                                            : msaRate > 0
                                              ? 'bg-white text-foreground'
                                              : 'bg-slate-50 text-muted-foreground'
                                      }
                                    } else if (attendanceView === 'lokasi') {
                                      if (!siteConfig.lokasiKhususEnabled) {
                                        cellValue = '-'
                                        cellBg = 'bg-slate-50 text-muted-foreground'
                                      } else if (isFieldBreakDay && cell.status !== 'present') {
                                        cellValue = 'FB'
                                        cellBg = 'bg-purple-50 text-purple-700'
                                      } else if (noAllowance) {
                                        cellValue = absentLabel
                                        cellBg = 'bg-rose-50 text-rose-700'
                                      } else {
                                        cellValue = staff ? siteConfig.lokasiKhususRateStaff : siteConfig.lokasiKhususRateNonStaff
                                        cellBg = isNationalHoliday
                                          ? 'bg-amber-50 text-foreground'
                                          : isRosterOff
                                            ? 'bg-slate-50 text-foreground'
                                            : 'bg-white text-foreground'
                                      }
                                    } else if (attendanceView === 'meals') {
                                      if (isFieldBreakDay && cell.status !== 'present') {
                                        cellValue = 'FB'
                                        cellBg = 'bg-purple-50 text-purple-700'
                                      } else if (noAllowance) {
                                        cellValue = absentLabel
                                        cellBg = 'bg-rose-50 text-rose-700'
                                      } else {
                                        const mealsRate =
                                          siteConfig.mealsType === 'none'
                                            ? 0
                                            : staff
                                              ? rate.mealsStaff
                                              : rate.mealsNonStaff
                                        cellValue = mealsRate
                                        cellBg = isNationalHoliday
                                          ? 'bg-amber-50 text-foreground'
                                          : isRosterOff
                                            ? 'bg-slate-50 text-foreground'
                                            : mealsRate > 0
                                              ? 'bg-white text-foreground'
                                              : 'bg-slate-50 text-muted-foreground'
                                      }
                                    } else if (attendanceView === 'ovt') {
                                      // Overtime hanya untuk Non Staff
                                      if (staff) {
                                        cellValue = '-'
                                        cellBg = 'bg-slate-50 text-muted-foreground'
                                      } else if (isOff || cell.status !== 'present') {
                                        cellValue = isOff ? scheduleCode : ''
                                        cellBg = isOff
                                          ? 'bg-rose-50 text-rose-700'
                                          : isHolidayDay
                                            ? 'bg-amber-50 text-amber-700'
                                            : ''
                                      } else {
                                        const clockInMin = cell.clockIn
                                          ? Number(cell.clockIn.split(':')[0]) * 60 +
                                            Number(cell.clockIn.split(':')[1])
                                          : null
                                        const clockOutMin = cell.clockOut
                                          ? Number(cell.clockOut.split(':')[0]) * 60 +
                                            Number(cell.clockOut.split(':')[1])
                                          : null
                                        if (clockInMin != null && clockOutMin != null) {
                                          const worked =
                                            (clockOutMin >= clockInMin
                                              ? clockOutMin - clockInMin
                                              : clockOutMin + 1440 - clockInMin) / 60
                                          const ot = roundOvertimeHours(Math.max(0, worked - 5))
                                          cellValue = ot > 0 ? ot : ''
                                          cellBg =
                                            ot > 0 ? 'bg-white text-foreground font-semibold' : ''
                                        }
                                      }
                                    }

                                    return (
                                      <td
                                        key={day}
                                        className={`w-[52px] min-w-[52px] px-0.5 py-1.5 text-center text-[10px] ${cellBg} ${isHolidayDay ? 'bg-amber-50' : ''}`}
                                        title={holidayName || `${scheduleCode} · ${cell.status}`}
                                      >
                                        {cellValue}
                                      </td>
                                    )
                                  }
                                  // Normal attendance view
                                  const isSelected = selectedAttendanceKeys.includes(
                                    attendanceKey(row.employee.id, day)
                                  )
                                  const isConflict =
                                    cell.status === 'present' &&
                                    ['OFF', 'Libur', 'Sakit', 'FB'].includes(scheduleCode)
                                  return (
                                    <td
                                      key={day}
                                      className={`w-[52px] min-w-[52px] px-1 py-2 align-top ${isHolidayDay ? 'bg-amber-100 ring-1 ring-amber-300 ring-inset' : ''}`}
                                      title={holidayName}
                                    >
                                      <button
                                        className={`relative h-[76px] w-[44px] rounded-xl px-2 py-2 text-left text-[11px] font-semibold ${isHolidayDay ? attendanceHolidayCellClass : attendanceCellClass(cell.status)} ${isSelected ? 'outline outline-2 outline-offset-2 outline-slate-900' : ''} ${isConflict ? 'ring-2 ring-orange-400' : ''}`}
                                        onClick={() =>
                                          multiSelectAttendance
                                            ? toggleAttendanceSelection(row.employee.id, day)
                                            : setSelectedAttendanceCell({
                                                employeeId: row.employee.id,
                                                day,
                                              })
                                        }
                                        onDoubleClick={() =>
                                          cycleAttendanceCell(row.employee.id, day)
                                        }
                                        title={
                                          isConflict
                                            ? `Conflict schedule ${scheduleCode} vs attendance masuk`
                                            : holidayName ||
                                              cell.note ||
                                              attendanceStatusLabel(cell.status)
                                        }
                                      >
                                        {isConflict ? (
                                          <span className="absolute top-1 right-1 text-[10px]">
                                            !
                                          </span>
                                        ) : null}
                                        {isHolidayDay ? (
                                          <span className="absolute top-1 right-1 text-[9px]">
                                            L
                                          </span>
                                        ) : null}
                                        <span>{attendanceStatusLabel(cell.status)}</span>
                                        {cell.clockIn || cell.clockOut ? (
                                          <span className="mt-1 block font-mono text-[10px]">
                                            {cell.clockIn || '--:--'}-{cell.clockOut || '--:--'}
                                          </span>
                                        ) : null}
                                       {cell.status !== 'empty' && cell.source ? (
                                         <span className="absolute right-1 bottom-1">
                                           <AttendanceSourceIndicator
                                             source={cell.source}
                                             timestamp={
                                               cell.clockIn
                                                 ? `${period}-${String(day).padStart(2, '0')}T${cell.clockIn}:00`
                                                 : undefined
                                             }
                                           />
                                         </span>
                                       ) : null}
                                       {(() => {
                                         const activityKey = `${row.employee.id}-${period}-${day}`
                                        const dayActivities = activitiesByEmployeeDay.get(activityKey) || []
                                         if (dayActivities.length === 0) return null
                                         return (
                                            <div
                                             onClick={(e) => {
                                               e.stopPropagation()
                                               setSelectedActivityCell({ employeeId: row.employee.id, day })
                                             }}
                                              className="absolute left-1 bottom-1 flex size-4 items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white cursor-pointer"
                                             title={`${dayActivities.length} aktivitas`}
                                           >
                                             {dayActivities.length}
                                            </div>
                                         )
                                       })()}
                                     </button>
                                    </td>
                                  )
                                })}
                                {/* Total column for MSA/Meals/OVT views */}
                                {attendanceView !== 'attendance'
                                  ? (() => {
                                      const staff = isStaffRole(row.employee.role)
                                      let total = 0
                                      for (const day of days) {
                                        const cell = getAttendanceCell(row.employee.id, day)
                                        const code = row.schedule[day - 1] as string
                                        const isOff2 =
                                          code === 'OFF' ||
                                          code === 'FB' ||
                                          code === 'Libur' ||
                                          code === 'Sakit'
                                        const hol = holidaysByDay.get(day)

                                        // Logika tunjangan summary:
                                        // - OFF roster / Libur nasional = dapat
                                        // - Hadir (present) = dapat
                                        // - Izin/Sakit/Alpha/Empty hari kerja = tidak dapat
                                        // - Field Break = tidak dapat
                                        const isRosterOff2 = code === 'OFF' || code === 'Libur'
                                        const isNationalHoliday2 = Boolean(hol)
                                        const isWorkDay2 = !isRosterOff2
                                        const isAbsent2 = cell.status === 'leave' || cell.status === 'sick' || cell.status === 'absent'
                                        const isEmptyWorkDay2 = isWorkDay2 && !isNationalHoliday2 && cell.status === 'empty'
                                        const noAllowance2 = isAbsent2 || isEmptyWorkDay2

                                        if (attendanceView === 'lokasi') {
                                          if (siteConfig.lokasiKhususEnabled) {
                                            const isFbPeriodLokasi = fieldBreakDaysByEmployee.get(row.employee.id)?.has(day) ?? false
                                            if (!isFbPeriodLokasi && !noAllowance2) {
                                              const isStaffSummary = isStaffRole(row.employee.role)
                                              total += isStaffSummary ? siteConfig.lokasiKhususRateStaff : siteConfig.lokasiKhususRateNonStaff
                                            }
                                          }
                                          continue
                                        }

                                        // Skip Field Break days for MSA/Meals
                                        const isFbPeriod =
                                          fieldBreakDaysByEmployee.get(row.employee.id)?.has(day) ??
                                          false
                                        if (
                                          isFbPeriod &&
                                          (attendanceView === 'msa' || attendanceView === 'meals')
                                        )
                                          continue

                                        // Skip if no allowance (izin/sakit/alpha/empty workday)
                                        if (noAllowance2 && (attendanceView === 'msa' || attendanceView === 'meals'))
                                          continue

                                        // OVT: only count present days
                                        if (
                                          attendanceView === 'ovt' &&
                                          (isOff2 || hol || cell.status !== 'present')
                                        )
                                          continue
                                        if (attendanceView === 'msa') {
                                          total +=
                                            siteConfig.msaType === 'none'
                                              ? 0
                                              : siteConfig.msaType === 'same-all'
                                                ? rate.msaNonStaff
                                                : staff
                                                  ? rate.msaStaff
                                                  : rate.msaNonStaff
                                        } else if (attendanceView === 'meals') {
                                          total +=
                                            siteConfig.mealsType === 'none'
                                              ? 0
                                              : staff
                                                ? rate.mealsStaff
                                                : rate.mealsNonStaff
                                        } else {
                                          // OVT only for non-staff
                                          if (!staff) {
                                            const ci = cell.clockIn
                                              ? Number(cell.clockIn.split(':')[0]) * 60 +
                                                Number(cell.clockIn.split(':')[1])
                                              : null
                                            const co = cell.clockOut
                                              ? Number(cell.clockOut.split(':')[0]) * 60 +
                                                Number(cell.clockOut.split(':')[1])
                                              : null
                                            if (ci != null && co != null) {
                                              const w = (co >= ci ? co - ci : co + 1440 - ci) / 60
                                              total += Math.max(0, w - 5)
                                            }
                                          }
                                        }
                                      }
                                      return (
                                        <td className="text-foreground w-[80px] min-w-[80px] px-2 py-2 text-right text-[11px] font-bold">
                                          {attendanceView === 'ovt'
                                            ? roundOvertimeHours(total)
                                            : `Rp ${total.toLocaleString('id-ID')}`}
                                        </td>
                                      )
                                    })()
                                  : null}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="bg-surface-container-low text-muted-foreground rounded-[0.8rem] px-4 py-3 text-xs">
            <span className="text-foreground font-semibold">Input manual cepat:</span> Klik cell
            untuk edit jam/status. Double-click untuk cycle: Masuk → Sakit → Izin → Alpha → -. Excel
            mendukung kolom{' '}
            <code className="bg-surface-container-lowest rounded px-1 py-0.5 font-mono">Nama</code>,{' '}
            <code className="bg-surface-container-lowest rounded px-1 py-0.5 font-mono">
              D1..D31
            </code>
            ,{' '}
            <code className="bg-surface-container-lowest rounded px-1 py-0.5 font-mono">
              Masuk 1
            </code>
            ,{' '}
            <code className="bg-surface-container-lowest rounded px-1 py-0.5 font-mono">
              Pulang 1
            </code>
            .
          </div>
        </section>
      ) : null}

      {mode === 'schedule' ? (
        <section className="space-y-3">
          <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
            <div className="border-border/40 bg-surface-container-low flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <p className="font-display text-foreground text-base font-semibold">
                  Schedule Tetap
                </p>
                <p className="text-muted-foreground text-xs">
                  Baseline final. Edit cell lalu save di sini.
                  {scheduleSavedAt ? (
                    <span className="text-muted-foreground ml-2">Terakhir: {scheduleSavedAt}</span>
                  ) : null}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <TabExportActions tabTitle="Schedule Tetap" tableRows={permanentRows} />
                <Button
                  size="sm"
                  disabled={permanentRows.length === 0 || isSavingSchedule || isFinalized}
                  onClick={savePermanentSchedule}
                >
                  <Save className="mr-2 size-4" />{' '}
                  {isSavingSchedule ? 'Menyimpan...' : 'Save Schedule Tetap'}
                </Button>
              </div>
            </div>
          </Card>
          <div className="space-y-5">
            {sectionOptions.map((section) =>
              renderRosterTable(permanentRows, section, 'fixed', cyclePermanentCell)
            )}
          </div>
        </section>
      ) : null}

      {mode === 'field-break' ? (
        <section className="space-y-4">
          <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
            <div className="border-border/40 bg-surface-container-low flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <p className="font-display text-foreground text-base font-semibold">
                  Schedule Field Break
                </p>
                <p className="text-muted-foreground text-xs">
                  Isi tanggal on-site dan field break per karyawan, lalu simpan ke database.
                </p>
              </div>
              <TabExportActions
                tabTitle="Schedule Field Break"
                columns={['Nama', 'Section', 'Roster', 'On Site', 'Day', 'FB', 'Updated']}
                exportRows={fieldBreakRows.map((row) => [
                  row.employee.name,
                  row.sectionLabel,
                  rosterSectionLabel(row.rosterSection),
                  formatShortDate(row.onSiteDate),
                  row.dayCount ?? '',
                  formatShortDate(row.fieldBreakDate),
                  row.savedAt ? new Date(row.savedAt).toLocaleString('id-ID') : 'Belum tersimpan',
                ])}
              />
            </div>
            <div className="flex flex-wrap items-end gap-3 p-4">
              <div className="min-w-[200px] flex-1 space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Site Field Break
                </Label>
                <NativeSelect
                  value={fieldBreakSiteId}
                  onValueChange={setFieldBreakSiteId}
                  options={sites.map((item) => ({ value: String(item.id), label: item.name }))}
                  placeholder="Pilih site"
                />
              </div>
              <Button
                disabled={isSavingFieldBreak || fieldBreakRows.length === 0 || isFinalized}
                onClick={syncFieldBreakPlansToDatabase}
              >
                {isSavingFieldBreak ? 'Menyimpan...' : 'Simpan ke Database'}
              </Button>
            </div>
          </Card>
          <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0 p-0">
            <div className="overflow-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="bg-surface-container-low text-muted-foreground text-left text-[11px] tracking-[0.12em] uppercase">
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Section</th>
                    <th className="px-4 py-3 font-medium">Roster</th>
                    <th className="px-4 py-3 font-medium">Mulai On-Site</th>
                    <th className="px-4 py-3 font-medium">Mulai FB</th>
                    <th className="px-4 py-3 font-medium">Hari</th>
                  </tr>
                </thead>
                <tbody>
                  {fieldBreakRows.map((row) => (
                    <tr
                      key={row.employee.id}
                      className="border-border/30 hover:bg-surface-container-low/40 border-t transition"
                    >
                      <td className="px-4 py-3 font-medium">{row.employee.name}</td>
                      <td className="px-4 py-3">{row.sectionLabel}</td>
                      <td className="px-4 py-3">{rosterSectionLabel(row.rosterSection)}</td>
                      <td className="px-4 py-3">
                        <Input
                          type="date"
                          value={row.onSiteDate}
                          onChange={(event) =>
                            updateFieldBreakDraft(row.employee.id, 'onSiteDate', event.target.value)
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="date"
                          min={row.onSiteDate}
                          value={row.fieldBreakDate}
                          onChange={(event) =>
                            updateFieldBreakDraft(
                              row.employee.id,
                              'fieldBreakDate',
                              event.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-4 py-3 font-semibold">{row.dayCount ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <SummaryTable
            columns={['Nama', 'Section', 'Roster', 'On Site', 'Day', 'FB', 'History']}
            rows={fieldBreakRows.map((row) => [
              row.employee.name,
              row.sectionLabel,
              rosterSectionLabel(row.rosterSection),
              formatShortDate(row.onSiteDate),
              row.dayCount ?? '',
              formatShortDate(row.fieldBreakDate),
              row.savedAt
                ? `Tersimpan ${new Date(row.savedAt).toLocaleString('id-ID')}`
                : 'Belum tersimpan',
            ])}
          />
        </section>
      ) : null}

      {mode === 'payroll' ? (
        <section className="space-y-4">
          <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
            <div className="border-border/40 bg-surface-container-low flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <p className="font-display text-foreground text-base font-semibold">
                  Rekap MSA + Meals
                </p>
                <p className="text-muted-foreground text-xs">
                  Allowance per karyawan berdasarkan hari kerja dan field break.
                </p>
              </div>
              <TabExportActions
                tabTitle="MSA Meals"
                columns={[
                  'Employee',
                  'Jabatan',
                  'Staff',
                  'Hari MSA',
                  'FB',
                  'MSA',
                  'Meals',
                  'Total',
                ]}
                exportRows={rows.map((row) => [
                  row.employee.name,
                  row.employee.role,
                  row.staff ? 'Staff' : 'Non Staff',
                  row.msaDays,
                  row.fieldBreakDays,
                  money(row.msa),
                  money(row.meals),
                  money(row.msa + row.meals),
                ])}
              />
            </div>
          </Card>
          <SummaryTable
            columns={['Employee', 'Jabatan', 'Staff', 'Hari MSA', 'FB', 'MSA', 'Meals', 'Total']}
            rows={rows.map((row) => [
              row.employee.name,
              row.employee.role,
              row.staff ? 'Staff' : 'Non Staff',
              row.msaDays,
              row.fieldBreakDays,
              money(row.msa),
              money(row.meals),
              money(row.msa + row.meals),
            ])}
          />
        </section>
      ) : null}

      {mode === 'payroll' ? (
        <section className="space-y-4">
          <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
            <div className="border-border/40 bg-surface-container-low flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <p className="font-display text-foreground text-base font-semibold">
                  Rekap Overtime
                </p>
                <p className="text-muted-foreground text-xs">
                  Dihitung dari Attendance Real: jam pulang − jam masuk vs jam dasar schedule.
                  {attendanceOvertimeRows.every((r) => r.attendanceTotalHours === 0)
                    ? ' ⚠️ Belum ada data attendance — import dulu di tab Attendance.'
                    : ''}
                </p>
              </div>
              <TabExportActions
                tabTitle="Overtime"
                columns={[
                  'Employee',
                  'Jabatan',
                  'Jam Attendance Real',
                  'Jam Dasar',
                  'Overtime',
                  'Roster',
                ]}
                exportRows={attendanceOvertimeRows.map((row) => [
                  row.employee.name,
                  row.employee.role,
                  row.attendanceTotalHours,
                  row.attendanceBaseHours,
                  row.attendanceOvertime,
                  roster,
                ])}
              />
            </div>
          </Card>
          <SummaryTable
            columns={[
              'Employee',
              'Jabatan',
              'Jam Attendance Real',
              'Jam Dasar',
              'Overtime',
              'Roster',
            ]}
            rows={attendanceOvertimeRows.map((row) => [
              row.employee.name,
              row.employee.role,
              row.attendanceTotalHours,
              row.attendanceBaseHours,
              row.attendanceOvertime,
              roster,
            ])}
          />
          <div className="grid gap-3 lg:grid-cols-3">
            {overtimeRules.map((rule) => (
              <Card key={rule.roster} className="surface-module-card rounded-[1rem] border-0 p-4">
                <p className="font-display text-foreground text-sm font-semibold">{rule.roster}</p>
                <p className="text-muted-foreground mt-2 text-xs">
                  <span className="text-foreground font-medium">Hari kerja:</span> {rule.work}
                </p>
                <p className="text-muted-foreground text-xs">
                  <span className="text-foreground font-medium">Hari libur:</span> {rule.off}
                </p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <Dialog
        open={selectedAttendanceCell !== null}
        onOpenChange={(open) => !open && setSelectedAttendanceCell(null)}
      >
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Attendance Real {selectedAttendanceEmployee?.name}</DialogTitle>
          </DialogHeader>
          {selectedAttendanceCell && selectedAttendanceValue ? (
            <div className="grid gap-4 py-2">
              <div className="bg-surface-container-low text-muted-foreground rounded-2xl p-3 text-sm">
                Tanggal {selectedAttendanceCell.day} • jam ini dipakai otomatis untuk hitung
                Overtime.
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <NativeSelect
                    value={selectedAttendanceValue.status}
                    onValueChange={(value) =>
                      updateAttendanceCell(
                        selectedAttendanceCell.employeeId,
                        selectedAttendanceCell.day,
                        { status: value as AttendanceCellStatus }
                      )
                    }
                    options={[
                      { value: 'present', label: 'Masuk' },
                      { value: 'sick', label: 'Sakit' },
                      { value: 'leave', label: 'Izin' },
                      { value: 'absent', label: 'Alpha' },
                      { value: 'empty', label: '-' },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jam Masuk</Label>
                  <Input
                    type="time"
                    value={selectedAttendanceValue.clockIn}
                    onChange={(event) =>
                      updateAttendanceCell(
                        selectedAttendanceCell.employeeId,
                        selectedAttendanceCell.day,
                        {
                          clockIn: event.target.value,
                          status: event.target.value ? 'present' : selectedAttendanceValue.status,
                        }
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jam Pulang</Label>
                  <Input
                    type="time"
                    value={selectedAttendanceValue.clockOut}
                    onChange={(event) =>
                      updateAttendanceCell(
                        selectedAttendanceCell.employeeId,
                        selectedAttendanceCell.day,
                        {
                          clockOut: event.target.value,
                          status: event.target.value ? 'present' : selectedAttendanceValue.status,
                        }
                      )
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Catatan</Label>
                <Input
                  value={selectedAttendanceValue.note}
                  onChange={(event) =>
                    updateAttendanceCell(
                      selectedAttendanceCell.employeeId,
                      selectedAttendanceCell.day,
                      { note: event.target.value }
                    )
                  }
                  placeholder="Face loc / izin / sakit / manual"
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setSelectedAttendanceCell(null)}>Simpan</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedEmployeeId !== null}
        onOpenChange={(open) => !open && setSelectedEmployeeId(null)}
      >
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>Edit Schedule {selectedEmployee?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="bg-surface-container-low text-muted-foreground rounded-xl p-3 text-sm">
              Tukar libur akan menukar status hari dengan pengganti terpilih. Section Roster bisa
              memindahkan orang ke Roster Serviceman, Crew Office, atau Crew Repair.
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Section Roster</Label>
                <NativeSelect
                  value={profileSection}
                  onValueChange={handleProfileSectionChange}
                  options={sectionOptions.map((section) => ({
                    value: section,
                    label: rosterSectionLabel(section),
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Posisi On Site</Label>
                <NativeSelect
                  value={profilePositionOnSite}
                  onValueChange={setProfilePositionOnSite}
                  options={positionOptionsForSection(profileSection).map((position) => ({
                    value: position,
                    label: position,
                  }))}
                  placeholder="Pilih posisi on site"
                />
              </div>
              <div className="space-y-2">
                <Label>KIMPER LV</Label>
                <NativeSelect
                  value={profileKimperLv ? 'yes' : 'no'}
                  onValueChange={(value) => setProfileKimperLv(value === 'yes')}
                  options={[
                    { value: 'yes', label: 'Ada' },
                    { value: 'no', label: 'Tidak' },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>KIMPER TH</Label>
                <NativeSelect
                  value={profileKimperTh ? 'yes' : 'no'}
                  onValueChange={(value) => setProfileKimperTh(value === 'yes')}
                  options={[
                    { value: 'yes', label: 'Ada' },
                    { value: 'no', label: 'Tidak' },
                  ]}
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tukar Libur Dari</Label>
                <Input
                  type="date"
                  value={leaveFrom}
                  onChange={(event) => setLeaveFrom(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tukar Libur Sampai</Label>
                <Input
                  type="date"
                  value={leaveTo}
                  onChange={(event) => setLeaveTo(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Field Break Dari</Label>
                <Input
                  type="date"
                  value={fieldBreakFrom}
                  onChange={(event) => setFieldBreakFrom(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Field Break Sampai</Label>
                <Input
                  type="date"
                  value={fieldBreakTo}
                  onChange={(event) => setFieldBreakTo(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pengganti / Backup</Label>
              <NativeSelect
                value={backupEmployeeId}
                onValueChange={setBackupEmployeeId}
                placeholder="Pilih nama karyawan backup"
                options={visibleEmployees
                  .filter((employee) => employee.id !== selectedEmployeeId)
                  .map((employee) => ({ value: String(employee.id), label: employee.name }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedEmployeeId(null)}>
                Batal
              </Button>
              <Button onClick={applyEmployeeEdit}>Simpan Schedule</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Detail Dialog */}
      <Dialog
        open={selectedActivityCell !== null}
        onOpenChange={(open) => !open && setSelectedActivityCell(null)}
      >
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>
              Daily Activities •{' '}
              {selectedActivityCell
                ? visibleEmployees.find((e) => e.id === selectedActivityCell.employeeId)?.name
                : ''}{' '}
              • Tanggal {selectedActivityCell?.day}
            </DialogTitle>
          </DialogHeader>
          {selectedActivityCell ? (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto py-2">
              {(() => {
                const activityKey = `${selectedActivityCell.employeeId}-${period}-${selectedActivityCell.day}`
                const dayActivities = activitiesByEmployeeDay.get(activityKey) || []
                if (dayActivities.length === 0) {
                  return (
                    <p className="text-center text-sm text-slate-500">Tidak ada aktivitas.</p>
                  )
                }
                return dayActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-slate-900">{activity.title}</h3>
                        <p className="mt-0.5 text-xs text-slate-600">{activity.activityCode}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                          activity.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : activity.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : activity.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {activity.status}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Clock3 className="size-4" />
                        <span>
                          {new Date(activity.startTime).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          -{' '}
                          {new Date(activity.endTime).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              })()}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AttendanceImportPreviewDialog
        open={Boolean(attendanceImportPreview)}
        preview={attendanceImportPreview}
        employees={visibleEmployees.map((employee) => ({ id: employee.id, name: employee.name }))}
        mode={attendanceImportMode}
        disabled={isSavingAttendance || isFinalized}
        onModeChange={setAttendanceImportMode}
        onApply={applyAttendanceImportPreview}
        onDiscard={discardAttendanceImportPreview}
        onFixMatch={(importRowId, employeeId) =>
          void fixAttendanceImportMatch(importRowId, employeeId)
        }
        onRequestClose={() => setDiscardImportDialogOpen(true)}
      />
      <AlertDialog open={discardImportDialogOpen} onOpenChange={setDiscardImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard import preview?</AlertDialogTitle>
            <AlertDialogDescription>
              Preview data will be removed. Imported attendance will not be applied.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={discardAttendanceImportPreview}>
              Discard preview
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={overwriteImportDialogOpen} onOpenChange={setOverwriteImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite attendance conflicts?</AlertDialogTitle>
            <AlertDialogDescription>
              {attendanceImportPreview?.conflictCount ?? 0} conflicting cells will overwrite current
              values.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setOverwriteImportDialogOpen(false)
                confirmApplyAttendanceImportPreview()
              }}
            >
              Overwrite conflicts
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={clearExcelImportDialogOpen} onOpenChange={setClearExcelImportDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Excel Import?</AlertDialogTitle>
            <AlertDialogDescription>
              Only Excel-sourced attendance cells for this site and period will be deleted. Manual
              and face/location cells stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearImportedAttendance}>
              Delete Excel Import
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize period</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                Finalized periods are locked for schedule, attendance, import, and settings edits.
              </AlertDescription>
            </Alert>
            <Input
              placeholder="Reason (optional)"
              value={finalizeReason}
              onChange={(event) => setFinalizeReason(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFinalizeDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitFinalizePeriod} disabled={isSavingSchedule}>
                Finalize
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen period</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Alert>
              <AlertDescription>
                Reopening is audited. Enter a reason before unlocking edits.
              </AlertDescription>
            </Alert>
            <Input
              placeholder="Reason required"
              value={reopenReason}
              onChange={(event) => setReopenReason(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReopenDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={submitReopenPeriod}
                disabled={isSavingSchedule || !reopenReason.trim()}
              >
                Reopen
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryTable({
  columns,
  rows,
}: {
  columns: string[]
  rows: Array<Array<string | number>>
}) {
  return (
    <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0 p-0">
      <div className="overflow-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="bg-surface-container-low text-muted-foreground text-left text-[11px] tracking-[0.12em] uppercase">
              {columns.map((column) => (
                <th key={column} className="px-4 py-2.5 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className="border-border/30 hover:bg-surface-container-low/40 border-t transition"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`px-4 py-3 ${cellIndex === 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-muted-foreground px-4 py-8 text-center text-sm"
                >
                  Belum ada data.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
