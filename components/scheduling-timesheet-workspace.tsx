'use client'

import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Fuse from 'fuse.js'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CalendarDays,
  Calculator,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Upload,
  Lock,
  Trash2,
  Undo2,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { Switch } from '@/components/ui/switch'
import { SearchableSelect } from '@/components/ui/searchable-select'
import {
  applyAttendanceImportPreviewAction,
  applyMealsConfigToAllSitesAction,
  clearAttendanceRealOverridesAction,
  createAttendanceImportPreviewAction,
  deleteSchedulingTimesheetPlanAction,
  discardAttendanceImportPreviewAction,
  getAttendanceImportHistoryAction,
  getIndonesiaHolidaysAction,
  reopenSchedulingPeriodAction,
  rollbackAttendanceImportPreviewAction,
  saveAttendanceRealOverridesAction,
  logClientActionAction,
  saveSchedulingConfigAction,
  saveSchedulingTimesheetPlanAction,
  saveTimesheetFieldBreakPlansAction,
  saveTimesheetPayrollSnapshotAction,
  submitSchedulingPeriodForReviewAction,
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
  isThirteenOneOffDay,
  isWeekend,
  swapScheduleCodes,
  type HolidayLike,
} from '@/lib/timesheet-scheduling'
import { AttendanceRealBulkToolbar } from '@/components/timesheet/attendance-real-tab'
import { AttendanceImportPreviewDialog } from '@/components/timesheet/attendance-import-preview-dialog'
import { AttendanceSummaryBar } from '@/components/timesheet/attendance-summary-bar'
import { AttendanceSourceIndicator } from '@/components/timesheet/attendance-source-indicator'
import { exportRowsToFile, MinimalTableShell } from '@/components/ui/minimal-table-shell'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  attendanceStatusLabel,
  calculateAttendanceOvertime,
  minutesFromTime,
  normalizeAttendanceStatus,
  type AttendanceCellStatus,
} from '@/lib/timesheet/attendance-real'
import {
  addMonths,
  generateFieldBreakYearPlans,
  validateFieldBreakCapacity,
} from '@/lib/timesheet/field-break-generator'
import { getScheduleV2DayCount } from '@/lib/timesheet/schedule-v2'
import type {
  AttendancePreviewConflict,
  AttendancePreviewRow,
} from '@/lib/timesheet/attendance-import'
import {
  DEFAULT_SITE_OVERTIME_CONFIG,
  calculateOvertime,
  classifyOvertimePolicyDay,
  legacyOvertimeResult,
  normalizeSiteOvertimeConfig,
  overtimeRuleTotalHours,
  type ApprovedSplWindow,
  type OvertimeCalculationResult,
  type OvertimeDayKey,
  type OvertimeInterval,
  type OvertimeShiftKey,
  type SiteOvertimeConfig,
} from '@/lib/timesheet/overtime-policy'
import {
  DEFAULT_EMPLOYEE_BENEFIT_CONFIG,
  getEmployeeBenefitRule,
  getSpecialAllowanceAmount,
  isMsaEligibleDay,
  isMealsEligibleScheduleCode,
  isNonLocalEmployee,
  normalizeEmployeeBenefitConfig,
  type EmployeeBenefitConfig,
  type EmployeeBenefitRule,
} from '@/lib/timesheet/employee-benefit-policy'
import {
  getPunctualityDetail,
  resolveConfiguredShiftClockIn,
} from '@/lib/timesheet/attendance-punctuality'
import {
  DEFAULT_QUOTATION_BILLING_STATUS_CONFIG,
  normalizeQuotationBillingStatusConfig,
  type QuotationBillingStatusConfig,
} from '@/lib/service360-quotation-attendance'

type EmployeeOption = {
  id: number
  name: string
  email: string
  employeeSn?: string | null
  role: string
  departmentId?: number | null
  sectionId?: number | null
  department?: string | null
  section?: string | null
  manpower?: string | null
  pointOfHire?: string | null
  workLocation?: string | null
  siteLocation?: string | null
  siteId: number | null
  locationName?: string | null
}

type SiteOption = {
  id: number
  name: string
  location?: string | null
  customerName: string
  headEmployeeId?: number | null
}

type FieldBreakTimelineView = 'month' | 'quarter' | 'semester' | 'year'

function getFieldBreakTimelineDays(period: string, view: FieldBreakTimelineView) {
  const [yearStr, monthStr] = period.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!year || !month) return []
  const startMonth =
    view === 'quarter'
      ? Math.floor((month - 1) / 3) * 3 + 1
      : view === 'semester'
        ? month <= 6
          ? 1
          : 7
        : view === 'year'
          ? 1
          : month
  const totalMonths = view === 'month' ? 1 : view === 'quarter' ? 3 : view === 'semester' ? 6 : 12
  const days: Array<{ date: string; day: number; month: string; weekday: string }> = []
  for (let offset = 0; offset < totalMonths; offset++) {
    const date = new Date(Date.UTC(year, startMonth - 1 + offset, 1))
    const y = date.getUTCFullYear()
    const m = date.getUTCMonth() + 1
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
    const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date)
    for (let day = 1; day <= lastDay; day++) {
      const current = new Date(Date.UTC(y, m - 1, day))
      days.push({
        date: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        day,
        month: monthLabel,
        weekday: new Intl.DateTimeFormat('id-ID', { weekday: 'narrow', timeZone: 'UTC' }).format(
          current
        ),
      })
    }
  }
  return days
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
  sourceVersion?: 'v1' | 'v2'
}

type EmployeeScheduleProfile = {
  employeeId: number
  section: string
  positionOnSite: string
  kimperLv: boolean
  kimperTh: boolean
  isLokal?: boolean
}

type ScheduleCode = 'IN' | 'DS' | 'NS' | 'OFF' | 'FB' | 'ST' | 'Libur' | 'Sakit' | 'Emergency'
type SiteScheduleType = 'shift' | 'office' | 'hybrid'
type SiteRosterType = '5:2' | '6:1' | '13:1' | 'vale'
type DefaultShiftType = 'day-shift' | 'night-shift'
type SiteMsaType = 'staff-nonstaff' | 'same-all' | 'none'
type SiteMealsType = 'field-break' | 'workday' | 'none'
type SiteOvertimeType = 'five-hour' | 'roster' | 'none'

const scheduleTypeLabel = (value: string) => (value === 'office' ? 'Non Shift' : value)

type SiteSchedulingConfig = {
  scheduleType: SiteScheduleType
  rosterType: SiteRosterType
  msaType: SiteMsaType
  mealsType: SiteMealsType
  overtimeType: SiteOvertimeType
  defaultShiftType: DefaultShiftType
  defaultClockIn: string
  defaultClockOut: string
  dayShiftClockIn: string
  dayShiftClockOut: string
  nightShiftClockIn: string
  nightShiftClockOut: string
  day6WorkingTimeEnabled: boolean
  day6DayShiftClockIn: string
  day6DayShiftClockOut: string
  day6NightShiftClockIn: string
  day6NightShiftClockOut: string
  day7WorkingTimeEnabled: boolean
  day7DayShiftClockIn: string
  day7DayShiftClockOut: string
  day7NightShiftClockIn: string
  day7NightShiftClockOut: string
  defaultEarlyOvertimeHours: number
  defaultOvertimeEnd: string
  lokasiKhususRate: number
  lokasiKhususRateStaff: number
  lokasiKhususRateNonStaff: number
  lokasiKhususEnabled: boolean
  fieldBreakWorkMonths: number
  fieldBreakBreakDays: number
  employeeBenefitConfig: EmployeeBenefitConfig
  quotationBillingConfig: QuotationBillingStatusConfig
  overtimeConfig: SiteOvertimeConfig
  pdfConfig: PdfConfig
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
  fieldBreakEndDate: string
  source: 'auto' | 'manual'
  isLocked: boolean
  notes: string
  updatedAt: string
}

type AttendanceRealRecord = {
  id?: number
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
  isLatePending?: boolean
  overtimeHours?: number | null
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
  overtimeHours?: number | string | null
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

type PdfConfigSigner = {
  label: string
  name: string
  employeeId?: number | null
}

type PdfConfig = {
  preparedBy: string
  pjoLeader: string
  approvedBy: string
  customSigners: PdfConfigSigner[]
  logoUrl: string
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
  fieldBreakEndDate?: string
  source?: 'auto' | 'manual'
  isLocked?: boolean
  notes?: string
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

const codeCycle: ScheduleCode[] = [
  'IN',
  'DS',
  'NS',
  'OFF',
  'FB',
  'ST',
  'Libur',
  'Sakit',
  'Emergency',
]
const defaultSiteConfig: SiteSchedulingConfig = {
  scheduleType: 'office',
  rosterType: '5:2',
  msaType: 'staff-nonstaff',
  mealsType: 'workday',
  overtimeType: 'five-hour',
  defaultShiftType: 'day-shift',
  defaultClockIn: '07:00',
  defaultClockOut: '17:00',
  dayShiftClockIn: '08:00',
  dayShiftClockOut: '17:00',
  nightShiftClockIn: '18:00',
  nightShiftClockOut: '06:00',
  day6WorkingTimeEnabled: false,
  day6DayShiftClockIn: '08:00',
  day6DayShiftClockOut: '14:00',
  day6NightShiftClockIn: '20:00',
  day6NightShiftClockOut: '02:00',
  day7WorkingTimeEnabled: false,
  day7DayShiftClockIn: '08:00',
  day7DayShiftClockOut: '14:00',
  day7NightShiftClockIn: '20:00',
  day7NightShiftClockOut: '02:00',
  defaultEarlyOvertimeHours: 1,
  defaultOvertimeEnd: '19:00',
  lokasiKhususRate: 35000,
  lokasiKhususRateStaff: 35000,
  lokasiKhususRateNonStaff: 35000,
  lokasiKhususEnabled: false,
  fieldBreakWorkMonths: 3,
  fieldBreakBreakDays: 14,
  employeeBenefitConfig: DEFAULT_EMPLOYEE_BENEFIT_CONFIG,
  quotationBillingConfig: DEFAULT_QUOTATION_BILLING_STATUS_CONFIG,
  overtimeConfig: normalizeSiteOvertimeConfig(null),
  pdfConfig: { preparedBy: '', pjoLeader: '', approvedBy: '', customSigners: [], logoUrl: '' },
}

function serializeSiteConfig(config: SiteSchedulingConfig) {
  const {
    lokasiKhususEnabled,
    lokasiKhususRate,
    lokasiKhususRateStaff,
    lokasiKhususRateNonStaff,
    defaultShiftType,
    defaultClockIn,
    defaultClockOut,
    dayShiftClockIn,
    dayShiftClockOut,
    nightShiftClockIn,
    nightShiftClockOut,
    day6WorkingTimeEnabled,
    day6DayShiftClockIn,
    day6DayShiftClockOut,
    day6NightShiftClockIn,
    day6NightShiftClockOut,
    day7WorkingTimeEnabled,
    day7DayShiftClockIn,
    day7DayShiftClockOut,
    day7NightShiftClockIn,
    day7NightShiftClockOut,
    defaultEarlyOvertimeHours,
    defaultOvertimeEnd,
    fieldBreakWorkMonths,
    fieldBreakBreakDays,
    employeeBenefitConfig,
    quotationBillingConfig,
    pdfConfig,
    ...dbConfig
  } = config
  return {
    dbConfig,
    pdfConfig,
    fieldBreakConfig: {
      lokasiKhususEnabled,
      lokasiKhususRate,
      lokasiKhususRateStaff,
      lokasiKhususRateNonStaff,
      defaultShiftType,
      defaultClockIn,
      defaultClockOut,
      dayShiftClockIn,
      dayShiftClockOut,
      nightShiftClockIn,
      nightShiftClockOut,
      day6WorkingTimeEnabled,
      day6DayShiftClockIn,
      day6DayShiftClockOut,
      day6NightShiftClockIn,
      day6NightShiftClockOut,
      day7WorkingTimeEnabled,
      day7DayShiftClockIn,
      day7DayShiftClockOut,
      day7NightShiftClockIn,
      day7NightShiftClockOut,
      defaultEarlyOvertimeHours,
      defaultOvertimeEnd,
      fieldBreakWorkMonths,
      fieldBreakBreakDays,
      fieldBreakUnit: config.rosterType === '13:1' ? 'weeks' : 'legacy',
      employeeBenefitConfig,
      quotationBillingConfig,
    },
  }
}

function normalizePdfConfig(
  raw: unknown,
  currentEmployeeName: string,
  siteId: string,
  employees: EmployeeOption[],
  sites: SiteOption[]
): PdfConfig {
  const cfg = (raw ?? {}) as Record<string, unknown>
  const site = sites.find((s) => String(s.id) === siteId)
  const headEmp = site?.headEmployeeId
    ? (employees.find((e) => e.id === site.headEmployeeId)?.name ?? '')
    : ''
  const defaultApprovedBy = site ? `Plant. SPV Department (${site.name})` : ''
  const customSigners = Array.isArray(cfg.customSigners)
    ? (cfg.customSigners as PdfConfigSigner[])
    : []
  return {
    preparedBy: (cfg.preparedBy as string) || currentEmployeeName,
    pjoLeader: (cfg.pjoLeader as string) || headEmp,
    approvedBy: (cfg.approvedBy as string) || defaultApprovedBy,
    customSigners,
    logoUrl: (cfg.logoUrl as string) || '',
  }
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

type ApprovalApproverDraft = {
  pjoLeaderId: number | null
  sectionHeadId: number | null
  departmentHeadId: number | null
}

function approvalEmployeeOptions(
  candidates: EmployeeOption[],
  currentId: number | null,
  currentName: string | null
) {
  const options = new Map(candidates.map((employee) => [employee.id, employee.name]))
  if (currentId && currentName) options.set(currentId, currentName)
  return [...options].map(([id, name]) => ({ value: String(id), label: name }))
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
  rosterType: SiteRosterType,
  isStaff?: boolean,
  rosterCycleStart?: string
): ScheduleCode {
  if (rosterType === '13:1') {
    if (isThirteenOneOffDay(period, day, rosterCycleStart)) return 'OFF'
    if (scheduleType === 'office' || (scheduleType === 'hybrid' && isStaff)) return 'IN'
    return (day + employeeIndex) % 2 === 0 ? 'DS' : 'NS'
  }
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
  if (code === 'ST') return 'bg-purple-100 text-purple-900 hover:bg-purple-200'
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

function payrollSectionLabel(section: string) {
  if (section === 'Service Operation') return 'Serviceman Crew'
  if (section === 'Repair Retread') return 'Repairman Crew'
  return 'Office Crew'
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

function isDateInRange(value: string, from?: string, to?: string) {
  if (!from || !to) return false
  return value >= from && value <= to
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
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  date.setUTCDate(date.getUTCDate() + days)
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

function formatMonthPeriod(value: string) {
  const date = new Date(`${value}-01T00:00:00Z`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        date
      )
}

function attendanceKey(employeeId: number, day: number) {
  return `${employeeId}-${day}`
}

function attendanceCellClass(status: AttendanceCellStatus) {
  if (status === 'present') return 'bg-emerald-100 text-emerald-950 ring-1 ring-emerald-200'
  if (status === 'sick') return 'bg-amber-100 text-amber-950 ring-1 ring-amber-200'
  if (status === 'leave') return 'bg-sky-100 text-sky-950 ring-1 ring-sky-200'
  if (status === 'absent') return 'bg-rose-100 text-rose-950 ring-1 ring-rose-200'
  if (status === 'off') return 'bg-slate-200 text-slate-700 ring-1 ring-slate-300'
  if (status === 'standby') return 'bg-violet-100 text-violet-950 ring-1 ring-violet-200'
  if (status === 'field_break') return 'bg-purple-100 text-purple-950 ring-1 ring-purple-200'
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
const EMPTY_APPROVED_SPL_WINDOWS: ApprovedSplWindow[] = []
const EMPTY_SCHEDULING_CONFIGS: Array<{
  siteId: number
  scheduleType?: string
  rosterType?: string
  msaType?: string
  mealsType?: string
  overtimeType?: string
  overtimeConfig?: unknown
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

const EMPTY_APPROVAL_EMPLOYEES: Array<{ id: number; name: string }> = []
const EMPTY_APPROVAL_SECTIONS: Array<{
  id: number
  siteId: number | null
  pjoLeaderId: number | null
  sectionHeadId: number | null
  departmentHeadId: number | null
}> = []
const EMPTY_ACTIVITIES: Array<{
  id: number
  employeeId: number
  activityCode: string
  title: string
  startTime: string
  endTime: string
  status: string
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
  ariaLabel,
}: {
  value?: string
  onValueChange: (value: string) => void
  options: NativeSelectOption[]
  placeholder?: string
  className?: string
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <select
      aria-label={ariaLabel}
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

function getLocalDateStr(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Makassar'
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

function timeFromIso(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Makassar'
  try {
    return date
      .toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: tz,
      })
      .replace('.', ':')
  } catch {
    return date
      .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      .replace('.', ':')
  }
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
  approvalEmployees = EMPTY_APPROVAL_EMPLOYEES,
  sites,
  savedPlans = EMPTY_SAVED_PLANS,
  fieldBreakPlans: initialFieldBreakPlans = EMPTY_FIELD_BREAK_PLANS,
  attendanceRecords = EMPTY_ATTENDANCE_RECORDS,
  attendanceOverrides = EMPTY_ATTENDANCE_OVERRIDES,
  schedulingConfigs = EMPTY_SCHEDULING_CONFIGS,
  schedulingStatuses = EMPTY_SCHEDULING_STATUSES,
  approvalSections = EMPTY_APPROVAL_SECTIONS,
  approvedSplWindows = EMPTY_APPROVED_SPL_WINDOWS,
  activities = EMPTY_ACTIVITIES,
  currentEmployeeSiteId = null,
  currentEmployeeName = 'User Management',
}: {
  mode?: SchedulingTimesheetMode
  employees: EmployeeOption[]
  approvalEmployees?: Array<{ id: number; name: string }>
  sites: SiteOption[]
  currentEmployeeSiteId?: number | null
  currentEmployeeName?: string
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
    overtimeConfig?: unknown
    fieldBreakConfig?: unknown
    allowanceVariables?: unknown
    overtimeVariables?: unknown
    pdfConfig?: unknown
  }>
  approvalSections?: Array<{
    id: string
    siteId: number
    departmentId: number
    departmentName: string | null
    sectionId: number
    sectionName: string
    matrixId: number | null
    matrixName: string | null
    pjoLeaderId: number | null
    pjoLeaderName: string | null
    sectionHeadId: number | null
    sectionHeadName: string | null
    departmentHeadId: number | null
    departmentHeadName: string | null
  }>
  approvedSplWindows?: ApprovedSplWindow[]
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
  const router = useRouter()
  const [period, setPeriod] = useState(currentMonthPeriod)
  const userDefaultSiteId = useMemo(() => {
    return String(currentEmployeeSiteId ?? sites[0]?.id ?? 'all')
  }, [currentEmployeeSiteId, sites])
  const [siteId, setSiteId] = useState(userDefaultSiteId)
  const [roster, setRoster] = useState('5:2')
  const [selectedCell, setSelectedCell] = useState<{ employeeId: number; day: number } | null>(null)
  const [selectedPermanentCell, setSelectedPermanentCell] = useState<{
    employeeId: number
    day: number
  } | null>(null)
  const [rosterDialogOpen, setRosterDialogOpen] = useState(false)
  const [siteConfigDialogOpen, setSiteConfigDialogOpen] = useState(false)
  const [openScheduleHistorySiteId, setOpenScheduleHistorySiteId] = useState<number | null>(null)
  const [deletedSchedulePlanKeys, setDeletedSchedulePlanKeys] = useState<string[]>([])
  const [deleteScheduleHistoryTarget, setDeleteScheduleHistoryTarget] = useState<{
    siteId: number
    period: string
    siteName: string
  } | null>(null)
  const [swapTargetEmployeeId, setSwapTargetEmployeeId] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)

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
  const [fieldBreakDialogOpen, setFieldBreakDialogOpen] = useState(false)
  const [openFieldBreakHistorySiteId, setOpenFieldBreakHistorySiteId] = useState<number | null>(
    null
  )
  const [fieldBreakDrafts, setFieldBreakDrafts] = useState<Record<number, FieldBreakDraft>>({})
  const [fieldBreakPlans, setFieldBreakPlans] = useState(initialFieldBreakPlans)
  const [fieldBreakSearch, setFieldBreakSearch] = useState('')
  const [fieldBreakSectionFilter, setFieldBreakSectionFilter] = useState('all')
  const [fieldBreakSourceFilter, setFieldBreakSourceFilter] = useState('all')
  const [fieldBreakTimelineView, setFieldBreakTimelineView] =
    useState<FieldBreakTimelineView>('month')
  const [isSavingFieldBreak, startSavingFieldBreak] = useTransition()

  useEffect(() => {
    setFieldBreakPlans((prev) => (prev === initialFieldBreakPlans ? prev : initialFieldBreakPlans))
  }, [initialFieldBreakPlans])

  useEffect(() => {
    if (mode !== 'field-break') return
    const refreshIfCurrentPeriod = (message?: { siteId?: number; period?: string }) => {
      if (message?.siteId != null && String(message.siteId) !== fieldBreakSiteId) {
        return
      }
      if (message?.period && message.period !== period) return
      router.refresh()
    }
    const channel =
      typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('hero-field-break-sync')
    if (channel) channel.onmessage = (event) => refreshIfCurrentPeriod(event.data)
    const interval = window.setInterval(() => refreshIfCurrentPeriod(), 10000)
    return () => {
      window.clearInterval(interval)
      channel?.close()
    }
  }, [fieldBreakSiteId, mode, period, router])
  const [siteScheduleTypes, setSiteScheduleTypes] = useState<Record<string, SiteScheduleType>>({})
  const [siteConfigs, setSiteConfigs] = useState<Record<string, SiteSchedulingConfig>>({})
  const [approvalApprovers, setApprovalApprovers] = useState<Record<string, ApprovalApproverDraft>>(
    {}
  )
  const [setupVariableTab, setSetupVariableTab] = useState<'roster' | 'allowance' | 'overtime'>(
    'roster'
  )
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
  const [attendanceSearch, setAttendanceSearch] = useState('')
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<
    'all' | 'present' | 'sick' | 'leave' | 'absent' | 'off' | 'gb'
  >('all')
  const [importHistoryOpen, setImportHistoryOpen] = useState(false)
  const [overtimePdfOpen, setOvertimePdfOpen] = useState(false)
  const [selectedOvertimeEmployeeIds, setSelectedOvertimeEmployeeIds] = useState<number[]>([])
  const [pdfPreview, setPdfPreview] = useState<{ url: string; title: string } | null>(null)
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

  const [draftOvertimeHours, setDraftOvertimeHours] = useState<string>('')

  useEffect(() => {
    if (selectedAttendanceCell) {
      const cell = getAttendanceCell(selectedAttendanceCell.employeeId, selectedAttendanceCell.day)
      setDraftOvertimeHours(
        cell.overtimeHours !== undefined && cell.overtimeHours !== null
          ? String(cell.overtimeHours)
          : ''
      )
    } else {
      setDraftOvertimeHours('')
    }
  }, [selectedAttendanceCell])
  const [isSavingPayroll, startSavingPayroll] = useTransition()
  const [isImportingExcel, setIsImportingExcel] = useState(false)
  const attendanceFileInputRef = useRef<HTMLInputElement>(null)
  const [lastImportSuccess, setLastImportSuccess] = useState<{
    filename: string
    matched: number
    unmatched: number
    unmatchedNames?: string[]
  } | null>(null)
  const [isSavingSchedule, startSavingSchedule] = useTransition()
  const [isDeletingScheduleHistory, startDeletingScheduleHistory] = useTransition()
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false)
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false)
  const [finalizeReason, setFinalizeReason] = useState('')
  const [reopenReason, setReopenReason] = useState('')
  const [discardImportDialogOpen, setDiscardImportDialogOpen] = useState(false)
  const [overwriteImportDialogOpen, setOverwriteImportDialogOpen] = useState(false)
  const [clearExcelImportDialogOpen, setClearExcelImportDialogOpen] = useState(false)
  const [attendanceWorkspaceOpen, setAttendanceWorkspaceOpen] = useState(false)
  const [payrollWorkspaceOpen, setPayrollWorkspaceOpen] = useState(false)
  const [payrollDetailTab, setPayrollDetailTab] = useState<'allowance' | 'overtime'>('allowance')
  const [openPayrollHistorySiteId, setOpenPayrollHistorySiteId] = useState<number | null>(null)
  const [attendanceCreateOpen, setAttendanceCreateOpen] = useState(false)
  const [attendanceCreateSiteId, setAttendanceCreateSiteId] = useState('')
  const [attendanceCreatePeriod, setAttendanceCreatePeriod] = useState(currentMonthPeriod)
  const [attendanceResetTarget, setAttendanceResetTarget] = useState<{
    siteId: number
    period: string
    recreate: boolean
  } | null>(null)
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
  const days = useMemo(() => Array.from({ length: dayCount }, (_, index) => index + 1), [dayCount])
  const holidaysByDay = useMemo(
    () =>
      new Map(holidays.map((holiday) => [holiday.day ?? Number(holiday.date.slice(-2)), holiday])),
    [holidays]
  )
  const site = useMemo(() => sites.find((item) => String(item.id) === siteId), [siteId, sites])
  const siteConfig = siteConfigs[siteId] ?? defaultSiteConfig
  const siteApprovalSections = useMemo(
    () => approvalSections.filter((row) => row.siteId == null || String(row.siteId) === siteId),
    [approvalSections, siteId]
  )
  const approvalEmployeeChoices = useMemo(
    () =>
      approvalEmployees.map((employee) => ({
        ...employee,
        email: '',
        role: '',
        siteId: null,
      })),
    [approvalEmployees]
  )

  useEffect(() => {
    const nextMap = Object.fromEntries(
      approvalSections.map((row) => [
        row.id,
        {
          pjoLeaderId: row.pjoLeaderId,
          sectionHeadId: row.sectionHeadId,
          departmentHeadId: row.departmentHeadId,
        },
      ])
    )
    setApprovalApprovers((prev) => {
      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(nextMap)
      if (
        prevKeys.length === nextKeys.length &&
        prevKeys.every(
          (k) =>
            prev[k]?.pjoLeaderId === nextMap[k]?.pjoLeaderId &&
            prev[k]?.sectionHeadId === nextMap[k]?.sectionHeadId &&
            prev[k]?.departmentHeadId === nextMap[k]?.departmentHeadId
        )
      ) {
        return prev
      }
      return nextMap
    })
  }, [approvalSections])
  const pdfSignatures = useMemo(() => {
    const cfg = siteConfig.pdfConfig
    const pjoLeaderName =
      cfg.pjoLeader ||
      employees.find((employee) => employee.id === site?.headEmployeeId)?.name ||
      'Belum diset di Master Data Site'
    const approvedByName = cfg.approvedBy || `Plant. SPV Department (${site?.name || 'Site'})`
    return {
      preparedBy: cfg.preparedBy || currentEmployeeName,
      pjoLeader: pjoLeaderName,
      approvedBy: approvedByName,
      customSigners: cfg.customSigners,
      logoUrl: cfg.logoUrl,
    }
  }, [currentEmployeeName, employees, site, siteConfig.pdfConfig])
  const isThirteenOneRoster = siteConfig.rosterType === '13:1'
  const fieldBreakWorkCycleDays = isThirteenOneRoster ? siteConfig.fieldBreakWorkMonths * 7 : 90
  const fieldBreakRestDays = isThirteenOneRoster
    ? siteConfig.fieldBreakBreakDays * 7
    : siteConfig.fieldBreakBreakDays
  const siteNameOptions = useMemo(
    () => [...new Set(sites.map((item) => extractSiteNameLocal(item.name)).filter(Boolean))],
    [sites]
  )
  const siteExtractedName = extractSiteNameLocal(site?.name)
  const rate =
    allowanceVariables.find((item) => item.project === siteExtractedName) ??
    allowanceVariables.find(
      (item) => normalizeLocation(item.project) === normalizeLocation(siteExtractedName)
    ) ??
    allowanceVariables[0] ??
    defaultAllowanceVariables[0]
  const savedPlan = savedPlans.find(
    (plan) =>
      !deletedSchedulePlanKeys.includes(`${plan.siteId}:${plan.period}`) &&
      String(plan.siteId) === siteId &&
      plan.period === period
  )
  const attendanceSiteRows = useMemo(
    () =>
      sites
        .map((item) => ({
          site: item,
          plan: savedPlans.find(
            (plan) =>
              !deletedSchedulePlanKeys.includes(`${plan.siteId}:${plan.period}`) &&
              plan.siteId === item.id &&
              plan.period === period &&
              plan.sourceVersion === 'v2'
          ),
        }))
        .sort(
          (left, right) =>
            Number(Boolean(right.plan)) - Number(Boolean(left.plan)) ||
            left.site.name.localeCompare(right.site.name)
        ),
    [deletedSchedulePlanKeys, period, savedPlans, sites]
  )
  const selectedAttendancePlan =
    mode === 'attendance'
      ? attendanceSiteRows.find((item) => String(item.site.id) === siteId)?.plan
      : null
  const attendanceHistoryRows = useMemo(() => {
    const planRows = savedPlans
      .filter(
        (plan) =>
          !deletedSchedulePlanKeys.includes(`${plan.siteId}:${plan.period}`) &&
          plan.sourceVersion === 'v2'
      )
      .map((plan) => ({
        plan,
        site: sites.find((item) => item.id === plan.siteId),
        status: schedulingStatuses.find(
          (item) => item.siteId === plan.siteId && item.period === plan.period
        ),
      }))
      .sort(
        (left, right) =>
          right.plan.period.localeCompare(left.plan.period) ||
          (left.site?.name ?? '').localeCompare(right.site?.name ?? '')
      )

    if (mode !== 'attendance') return planRows
    const planKeys = new Set(planRows.map(({ plan }) => `${plan.siteId}:${plan.period}`))
    const statusRows = schedulingStatuses
      .filter((status) => !planKeys.has(`${status.siteId}:${status.period}`))
      .map((status) => ({
        plan: {
          siteId: status.siteId,
          period: status.period,
          siteScheduleType: 'office',
          draftSchedule: [],
          fixedSchedule: [],
          employeeProfiles: [],
          fieldBreakConfig: null,
          updatedAt: status.lastSavedAt ?? '',
          sourceVersion: 'v2' as const,
        },
        site: sites.find((site) => site.id === status.siteId),
        status,
      }))
    return [...planRows, ...statusRows].sort(
      (left, right) =>
        right.plan.period.localeCompare(left.plan.period) ||
        (left.site?.name ?? '').localeCompare(right.site?.name ?? '')
    )
  }, [deletedSchedulePlanKeys, mode, savedPlans, schedulingStatuses, sites])
  const payrollHistorySiteRows = useMemo(() => {
    const grouped = new Map<number, typeof attendanceHistoryRows>()
    for (const item of attendanceHistoryRows) {
      const history = grouped.get(item.plan.siteId) ?? []
      history.push(item)
      grouped.set(item.plan.siteId, history)
    }
    return [...grouped.entries()]
      .map(([historySiteId, history]) => ({
        siteId: historySiteId,
        siteName: history[0]?.site?.name ?? `Site ${historySiteId}`,
        history,
      }))
      .sort((left, right) => left.siteName.localeCompare(right.siteName))
  }, [attendanceHistoryRows])
  const payrollHistoryYears = useMemo(
    () =>
      [...new Set(attendanceHistoryRows.map(({ plan }) => plan.period.slice(0, 4)))]
        .sort()
        .reverse(),
    [attendanceHistoryRows]
  )
  const payrollHistoryMonths = useMemo(
    () => [...new Set(attendanceHistoryRows.map(({ plan }) => plan.period.slice(5, 7)))].sort(),
    [attendanceHistoryRows]
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
  const isSubmittedToHr = currentStatus?.scheduleStatus === 'submitted_to_hr'
  function guardOpenPeriod(actionLabel: string) {
    if (!isFinalized) return true
    toast.error(`${actionLabel} blocked`, {
      description: 'Period finalized. Reopen before editing.',
    })
    return false
  }

  function openAttendanceWorkspace(nextSiteId: number, nextPeriod: string) {
    setSiteId(String(nextSiteId))
    setPeriod(nextPeriod)
    setAttendanceWorkspaceOpen(true)
  }

  function openPayrollWorkspace(nextSiteId: number, nextPeriod: string) {
    setSiteId(String(nextSiteId))
    setPeriod(nextPeriod)
    setPayrollDetailTab('allowance')
    setPayrollWorkspaceOpen(true)
  }

  function createAttendanceWorkspace() {
    const numericSiteId = Number(attendanceCreateSiteId)
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0 || !attendanceCreatePeriod) {
      toast.error('Pilih site dan bulan terlebih dahulu.')
      return
    }
    const existingAttendance = attendanceHistoryRows.some(
      (item) => item.plan.siteId === numericSiteId && item.plan.period === attendanceCreatePeriod
    )
    if (existingAttendance) {
      setAttendanceCreateOpen(false)
      openAttendanceWorkspace(numericSiteId, attendanceCreatePeriod)
      return
    }
    startSavingAttendance(async () => {
      try {
        await saveAttendanceRealOverridesAction({
          siteId: numericSiteId,
          period: attendanceCreatePeriod,
          overrides: [],
        })
        setAttendanceCreateOpen(false)
        openAttendanceWorkspace(numericSiteId, attendanceCreatePeriod)
        router.refresh()
        toast.success('Attendance dibuat. Schedule dapat dilengkapi nanti.')
      } catch (error) {
        toast.error('Gagal membuat attendance', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  }

  function clearAttendanceWorkspace() {
    const target = attendanceResetTarget
    if (!target) return
    startSavingAttendance(async () => {
      try {
        await clearAttendanceRealOverridesAction({
          siteId: target.siteId,
          period: target.period,
          source: 'all',
          removeWorkspace: !target.recreate,
        })
        setAttendanceResetTarget(null)
        toast.success(
          target.recreate ? 'Attendance dikosongkan. Silakan isi ulang.' : 'Attendance dihapus.'
        )
        if (target.recreate) openAttendanceWorkspace(target.siteId, target.period)
        else setAttendanceWorkspaceOpen(false)
        router.refresh()
      } catch (error) {
        toast.error('Gagal menghapus attendance', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
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

    // Group records by cell key first
    const grouped = new Map<string, AttendanceRealRecord[]>()
    for (const record of attendanceRecords) {
      if (String(record.siteId) !== siteId) continue
      const dateStr = getLocalDateStr(record.eventTime)
      if (!dateStr || !dateStr.startsWith(period)) continue
      const day = dayFromDate(dateStr, period)
      if (!day) continue
      const key = attendanceKey(record.employeeId, day)
      const list = grouped.get(key) ?? []
      list.push(record)
      grouped.set(key, list)
    }

    for (const [key, records] of grouped.entries()) {
      const sorted = [...records].sort((a, b) => a.eventTime.localeCompare(b.eventTime))

      // Find the latest explicit OUT record (searching backwards from most recent)
      const explicitOut = [...sorted].reverse().find((r) => {
        const ev = normalizeLocation(r.eventType)
        return ev.includes('out') || ev.includes('pulang') || ev.includes('checkout')
      })

      // Find the corresponding IN record prior to or equal to explicitOut (or fallback to first punch)
      const explicitIn = explicitOut
        ? ([...sorted].reverse().find((r) => {
            const ev = normalizeLocation(r.eventType)
            const isOut = ev.includes('out') || ev.includes('pulang') || ev.includes('checkout')
            return !isOut && r.eventTime <= explicitOut.eventTime
          }) ?? sorted[0])
        : sorted[0]

      const last = sorted[sorted.length - 1]
      const firstTime = new Date(explicitIn.eventTime).getTime()
      const lastTime = new Date(last.eventTime).getTime()
      const isValidOut =
        explicitOut ??
        (last !== explicitIn && lastTime - firstTime >= 30 * 60 * 1000 ? last : undefined)

      map.set(key, {
        clockIn: explicitIn,
        clockOut: isValidOut,
        records: sorted,
      })
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
        scoped.map((override) => {
          const status = normalizeAttendanceStatus(override.status)
          const clearsTime = status === 'standby' || status === 'field_break'
          const overtimeHours =
            override.overtimeHours !== null && override.overtimeHours !== undefined
              ? Number(override.overtimeHours)
              : null
          return [
            attendanceKey(override.employeeId, override.day),
            {
              status,
              clockIn: clearsTime ? '' : override.clockIn,
              clockOut: clearsTime ? '' : override.clockOut,
              note: override.note,
              source:
                override.source === 'excel' || override.source === 'attendance'
                  ? override.source
                  : 'manual',
              overtimeHours,
            },
          ]
        })
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
    const savedRosterType = savedConfig?.rosterType as SiteRosterType | undefined
    const hasWeekBasedFieldBreak =
      savedRosterType === '13:1' && fieldBreakConfig.fieldBreakUnit === 'weeks'
    const hasIncorrectThirteenOneDefaults =
      hasWeekBasedFieldBreak &&
      Number(fieldBreakConfig.fieldBreakWorkMonths) === 13 &&
      Number(fieldBreakConfig.fieldBreakBreakDays) === 1
    const config = savedConfig
      ? {
          scheduleType: savedConfig.scheduleType as SiteScheduleType,
          rosterType: savedRosterType ?? '5:2',
          msaType: savedConfig.msaType as SiteMsaType,
          mealsType: (savedConfig.mealsType === 'none'
            ? 'none'
            : savedConfig.mealsType === 'field-break'
              ? 'field-break'
              : 'workday') as SiteMealsType,
          overtimeType: savedConfig.overtimeType as SiteOvertimeType,
          defaultShiftType:
            (fieldBreakConfig.defaultShiftType as DefaultShiftType | undefined) ?? 'day-shift',
          defaultClockIn: (fieldBreakConfig.defaultClockIn as string | undefined) ?? '07:00',
          defaultClockOut: (fieldBreakConfig.defaultClockOut as string | undefined) ?? '17:00',
          dayShiftClockIn:
            (fieldBreakConfig.dayShiftClockIn as string | undefined) ??
            (fieldBreakConfig.defaultClockIn as string | undefined) ??
            '06:00',
          dayShiftClockOut:
            (fieldBreakConfig.dayShiftClockOut as string | undefined) ??
            (fieldBreakConfig.defaultClockOut as string | undefined) ??
            '17:00',
          nightShiftClockIn: (fieldBreakConfig.nightShiftClockIn as string | undefined) ?? '18:00',
          nightShiftClockOut:
            (fieldBreakConfig.nightShiftClockOut as string | undefined) ?? '06:00',
          day6WorkingTimeEnabled: Boolean(fieldBreakConfig.day6WorkingTimeEnabled ?? false),
          day6DayShiftClockIn:
            (fieldBreakConfig.day6DayShiftClockIn as string | undefined) ?? '08:00',
          day6DayShiftClockOut:
            (fieldBreakConfig.day6DayShiftClockOut as string | undefined) ?? '14:00',
          day6NightShiftClockIn:
            (fieldBreakConfig.day6NightShiftClockIn as string | undefined) ?? '20:00',
          day6NightShiftClockOut:
            (fieldBreakConfig.day6NightShiftClockOut as string | undefined) ?? '02:00',
          day7WorkingTimeEnabled: Boolean(fieldBreakConfig.day7WorkingTimeEnabled ?? false),
          day7DayShiftClockIn:
            (fieldBreakConfig.day7DayShiftClockIn as string | undefined) ?? '08:00',
          day7DayShiftClockOut:
            (fieldBreakConfig.day7DayShiftClockOut as string | undefined) ?? '14:00',
          day7NightShiftClockIn:
            (fieldBreakConfig.day7NightShiftClockIn as string | undefined) ?? '20:00',
          day7NightShiftClockOut:
            (fieldBreakConfig.day7NightShiftClockOut as string | undefined) ?? '02:00',
          defaultEarlyOvertimeHours: Number(fieldBreakConfig.defaultEarlyOvertimeHours ?? 1) || 0,
          defaultOvertimeEnd:
            (fieldBreakConfig.defaultOvertimeEnd as string | undefined) ?? '19:00',
          lokasiKhususRate: Number(fieldBreakConfig.lokasiKhususRate ?? 35000) || 0,
          lokasiKhususRateStaff:
            Number(
              fieldBreakConfig.lokasiKhususRateStaff ?? fieldBreakConfig.lokasiKhususRate ?? 35000
            ) || 0,
          lokasiKhususRateNonStaff:
            Number(
              fieldBreakConfig.lokasiKhususRateNonStaff ??
                fieldBreakConfig.lokasiKhususRate ??
                35000
            ) || 0,
          lokasiKhususEnabled: Boolean(fieldBreakConfig.lokasiKhususEnabled ?? false),
          fieldBreakWorkMonths:
            savedRosterType === '13:1' &&
            (!hasWeekBasedFieldBreak || hasIncorrectThirteenOneDefaults)
              ? 12
              : Number(fieldBreakConfig.fieldBreakWorkMonths ?? 3) || 3,
          fieldBreakBreakDays:
            savedRosterType === '13:1' &&
            (!hasWeekBasedFieldBreak || hasIncorrectThirteenOneDefaults)
              ? 2
              : Number(fieldBreakConfig.fieldBreakBreakDays ?? 14) || 14,
          employeeBenefitConfig: normalizeEmployeeBenefitConfig(
            fieldBreakConfig.employeeBenefitConfig,
            {
              enabled: fieldBreakConfig.lokasiKhususEnabled,
              rate: fieldBreakConfig.lokasiKhususRate,
            }
          ),
          quotationBillingConfig: normalizeQuotationBillingStatusConfig(
            fieldBreakConfig.quotationBillingConfig
          ),
          overtimeConfig: normalizeSiteOvertimeConfig(savedConfig.overtimeConfig),
          pdfConfig: normalizePdfConfig(
            savedConfig.pdfConfig,
            currentEmployeeName,
            siteId,
            employees,
            sites
          ),
        }
      : defaultSiteConfig
    setSiteConfigs((current) => ({ ...current, [siteId]: config }))
    setRoster(config.rosterType)
    setSiteScheduleTypes((current) => ({ ...current, [siteId]: config.scheduleType }))
  }, [siteId, schedulingConfigs])

  useEffect(() => {
    if (!savedPlan) {
      setOverrides({})
      setPermanentBase({})
      setPermanentOverrides({})
      setEmployeeProfiles({})
      setScheduleSavedAt(null)
      return
    }

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
    setScheduleSavedAt(new Date(savedPlan.updatedAt).toLocaleString('id-ID'))
    setSiteScheduleTypes((current) => ({
      ...current,
      [siteId]:
        savedPlan.siteScheduleType === 'shift' || savedPlan.siteScheduleType === 'hybrid'
          ? (savedPlan.siteScheduleType as SiteScheduleType)
          : 'office',
    }))
  }, [fieldBreakPlans, period, savedPlan, siteId])

  const selectedSite = useMemo(
    () => sites.find((item) => String(item.id) === siteId),
    [siteId, sites]
  )

  const visibleEmployees = useMemo(() => {
    if (siteId === 'all') return []
    if (!selectedSite) return []

    // Extract from selected site name
    const selectedSiteExtracted = extractSiteNameLocal(selectedSite.location || selectedSite.name)

    const filtered = employees.filter((employee) => {
      // First priority: exact siteId match
      if (String(employee.siteId) === siteId) return true
      // Second priority: employee locationName (already extracted) matches extracted site name
      if (employee.locationName && employee.locationName === selectedSiteExtracted) return true
      return false
    })

    return filtered
  }, [employees, mode, selectedSite, siteId])

  const rosterSectionByEmployee = useMemo(
    () =>
      new Map(
        visibleEmployees.map((employee) => {
          const profile = employeeProfiles[employee.id]
          return [
            employee.id,
            normalizeRosterSection(profile?.section || employee.section || employee.role),
          ]
        })
      ),
    [employeeProfiles, visibleEmployees]
  )
  const rosterSectionCounts = useMemo(
    () =>
      visibleEmployees.reduce<Record<string, number>>((counts, employee) => {
        const rosterSection = rosterSectionByEmployee.get(employee.id) ?? 'Crew Office'
        counts[rosterSection] = (counts[rosterSection] ?? 0) + 1
        return counts
      }, {}),
    [rosterSectionByEmployee, visibleEmployees]
  )
  const fieldBreakPlansByEmployee = useMemo(() => {
    const map = new Map<number, SavedFieldBreakPlan[]>()
    for (const plan of fieldBreakPlans) {
      if (String(plan.siteId) !== siteId || plan.period !== period) continue
      const items = map.get(plan.employeeId) ?? []
      items.push(plan)
      map.set(plan.employeeId, items)
    }
    return map
  }, [fieldBreakPlans, period, siteId])

  const rows = useMemo(
    () =>
      visibleEmployees.map((employee, employeeIndex) => {
        const employeeRosterSection = rosterSectionByEmployee.get(employee.id) ?? 'Crew Office'
        const persistedSchedule = savedPlan
          ? (mode === 'schedule'
              ? savedPlan.draftSchedule
              : savedPlan.fixedSchedule.length
                ? savedPlan.fixedSchedule
                : savedPlan.draftSchedule
            ).find((item) => item.employeeId === employee.id)?.schedule
          : undefined
        const forceDayShift =
          (employeeRosterSection === 'Service Operation' ||
            employeeRosterSection === 'Repair Retread') &&
          (rosterSectionCounts[employeeRosterSection] ?? 0) < 3
        const schedule = days.map((day) => {
          const scheduleType = siteScheduleTypes[siteId] ?? 'office'
          const date = dateKey(period, day)
          const generatedCode = (
            savedPlan
              ? forceDayShift
                ? 'DS'
                : buildSchedule(
                    employeeIndex,
                    day,
                    scheduleType,
                    period,
                    siteConfig.rosterType,
                    isStaffRole(employee.role),
                    (fieldBreakPlansByEmployee.get(employee.id) ?? []).find(
                      (plan) => plan.onSiteDate
                    )?.onSiteDate
                  )
              : ''
          ) as ScheduleCode
          const holidayAdjustedCode = applyHolidayPolicy(generatedCode, {
            scheduleType,
            rosterType: siteConfig.rosterType,
            isHoliday: isHoliday(period, day, holidays),
          })
          const fieldBreakAdjustedCode = (fieldBreakPlansByEmployee.get(employee.id) ?? []).some(
            (plan) =>
              isDateInRange(
                date,
                plan.fieldBreakDate,
                plan.fieldBreakEndDate || plan.fieldBreakDate
              )
          )
            ? 'FB'
            : holidayAdjustedCode

          // ponytail: attendance/benefit views read the fixed Schedule V2 roster; edit view reads draft.
          return mode === 'schedule'
            ? (overrides[`${employee.id}-${day}`] ?? fieldBreakAdjustedCode)
            : ((persistedSchedule?.[day - 1] as ScheduleCode | undefined) ??
                overrides[`${employee.id}-${day}`] ??
                fieldBreakAdjustedCode)
        })
        const workDays = schedule.filter(
          (code) => code === 'IN' || code === 'DS' || code === 'NS' || code === 'FB'
        ).length
        const mealsWorkDays = schedule.filter(
          (code, index) =>
            (code === 'IN' || code === 'DS' || code === 'NS' || code === 'ST') &&
            !isHoliday(period, index + 1, holidays)
        ).length
        const msaDays = schedule.filter((code) => isMsaEligibleDay(code)).length
        const fieldBreakDays = schedule.filter((code) => code === 'FB').length
        const totalHours = schedule.reduce((sum, code) => sum + hoursFromCode(code), 0)
        const staff = isStaffRole(employee.role)
        const benefitRule = getEmployeeBenefitRule(siteConfig.employeeBenefitConfig, {
          manpower: employee.manpower,
          pointOfHire: employee.pointOfHire,
          workLocations: [employee.workLocation, employee.siteLocation, employee.locationName],
        })
        const msa =
          siteConfig.msaType === 'none' || !benefitRule.msa
            ? 0
            : msaDays *
              (siteConfig.msaType === 'same-all'
                ? rate.msaNonStaff
                : staff
                  ? rate.msaStaff
                  : rate.msaNonStaff)
        const mealsBaseDays = mealsWorkDays
        const meals = !benefitRule.meals
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
          specialAllowance: 0,
          overtime,
          profile: { ...profile, section: rosterSection, positionOnSite },
          sectionLabel,
          rosterSection,
        }
      }),
    [
      days,
      employeeProfiles,
      fieldBreakPlansByEmployee,
      holidays,
      mode,
      overtimeVariables,
      overrides,
      period,
      rate.mealsNonStaff,
      rate.mealsStaff,
      rate.msaNonStaff,
      rate.msaStaff,
      rosterSectionByEmployee,
      rosterSectionCounts,
      savedPlan,
      siteConfig.employeeBenefitConfig,
      siteConfig.msaType,
      siteConfig.overtimeType,
      siteConfig.rosterType,
      siteId,
      siteScheduleTypes,
      visibleEmployees,
    ]
  )

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
        className="surface-module-card overflow-hidden rounded-[1rem] border-0 p-0"
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

  const permanentRows =
    mode === 'schedule'
      ? rows
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
            msaDays: row.schedule.filter((code) => isMsaEligibleDay(code)).length,
            fieldBreakDays: row.schedule.filter((code) => code === 'FB').length,
            totalHours: row.schedule.reduce((sum, code) => sum + hoursFromCode(code), 0),
          }))
      : []
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
  const selectedPermanentRow = selectedPermanentCell
    ? (permanentRows.find((row) => row.employee.id === selectedPermanentCell.employeeId) ?? null)
    : null
  const selectedPermanentCode =
    selectedPermanentCell && selectedPermanentRow
      ? (permanentOverrides[`${selectedPermanentCell.employeeId}-${selectedPermanentCell.day}`] ??
        selectedPermanentRow.schedule[selectedPermanentCell.day - 1])
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
  const savedFieldBreakByEmployee = useMemo(
    () =>
      new Map(
        fieldBreakPlans
          .filter((plan) => String(plan.siteId) === fieldBreakSiteId && plan.period === period)
          .map((plan) => [plan.employeeId, plan])
      ),
    [fieldBreakPlans, fieldBreakSiteId, period]
  )
  const lastFieldBreakByEmployee = useMemo(() => {
    const latest = new Map<number, string>()
    const numericSiteId = Number(fieldBreakSiteId)
    for (const plan of savedPlans) {
      if (plan.siteId !== numericSiteId) continue
      for (const row of plan.fixedSchedule) {
        row.schedule.forEach((code, index) => {
          if (code !== 'FB') return
          const date = `${plan.period}-${String(index + 1).padStart(2, '0')}`
          if (date > (latest.get(row.employeeId) ?? '')) latest.set(row.employeeId, date)
        })
      }
    }
    return latest
  }, [fieldBreakSiteId, savedPlans])
  const fieldBreakRows = useMemo(
    () =>
      rows.map((row) => {
        const savedPlan = savedFieldBreakByEmployee.get(row.employee.id)
        const draft = fieldBreakDrafts[row.employee.id]
        const lastFieldBreakDate =
          lastFieldBreakByEmployee.get(row.employee.id) ?? savedPlan?.onSiteDate ?? ''
        const onSiteDate = draft?.onSiteDate ?? lastFieldBreakDate
        const savedNextFieldBreak = draft?.fieldBreakDate ?? savedPlan?.fieldBreakDate ?? ''
        const hasValidSavedNextFieldBreak = Boolean(
          savedNextFieldBreak &&
          (!lastFieldBreakDate ||
            savedNextFieldBreak >= addDays(lastFieldBreakDate, fieldBreakWorkCycleDays))
        )
        const fieldBreakDate = hasValidSavedNextFieldBreak
          ? savedNextFieldBreak
          : lastFieldBreakDate
            ? addDays(lastFieldBreakDate, fieldBreakWorkCycleDays)
            : ''
        const savedFieldBreakEnd = draft?.fieldBreakEndDate ?? savedPlan?.fieldBreakEndDate ?? ''
        const fieldBreakEndDate =
          hasValidSavedNextFieldBreak && savedFieldBreakEnd >= fieldBreakDate
            ? savedFieldBreakEnd
            : fieldBreakDate
              ? addDays(fieldBreakDate, fieldBreakRestDays - 1)
              : ''
        const dayCountValue =
          lastFieldBreakDate && fieldBreakDate
            ? Math.max(
                1,
                Math.round(
                  (new Date(`${fieldBreakDate}T00:00:00Z`).getTime() -
                    new Date(`${lastFieldBreakDate}T00:00:00Z`).getTime()) /
                    86400000
                )
              )
            : null
        const source = draft?.source ?? savedPlan?.source ?? 'manual'
        const isLocked = draft?.isLocked ?? savedPlan?.isLocked ?? false
        const notes = draft?.notes ?? savedPlan?.notes ?? ''

        return {
          ...row,
          lastFieldBreakDate,
          onSiteDate,
          dayCount: dayCountValue,
          fieldBreakDate,
          fieldBreakEndDate,
          source,
          isLocked,
          notes,
          savedAt: savedPlan?.updatedAt ?? null,
        }
      }),
    [
      rows,
      savedFieldBreakByEmployee,
      fieldBreakDrafts,
      lastFieldBreakByEmployee,
      fieldBreakRestDays,
      fieldBreakWorkCycleDays,
    ]
  )
  const fieldBreakTimelineByEmployee = useMemo(() => {
    const map = new Map<number, SavedFieldBreakPlan[]>()
    for (const plan of fieldBreakPlans) {
      if (String(plan.siteId) !== fieldBreakSiteId) continue
      map.set(plan.employeeId, [...(map.get(plan.employeeId) ?? []), plan])
    }
    return map
  }, [fieldBreakPlans, fieldBreakSiteId])
  const fieldBreakSections = useMemo(
    () =>
      Array.from(
        new Set(fieldBreakRows.map((row) => row.rosterSection || row.sectionLabel).filter(Boolean))
      ).sort(),
    [fieldBreakRows]
  )
  const filteredFieldBreakRows = useMemo(() => {
    const query = fieldBreakSearch.trim().toLowerCase()

    return fieldBreakRows.filter((row) => {
      const section = row.rosterSection || row.sectionLabel
      const status = row.isLocked ? 'locked' : row.source
      const searchable =
        `${row.employee.name} ${row.sectionLabel} ${row.rosterSection} ${row.notes}`.toLowerCase()

      return (
        (!query || searchable.includes(query)) &&
        (fieldBreakSectionFilter === 'all' || section === fieldBreakSectionFilter) &&
        (fieldBreakSourceFilter === 'all' || status === fieldBreakSourceFilter)
      )
    })
  }, [fieldBreakRows, fieldBreakSearch, fieldBreakSectionFilter, fieldBreakSourceFilter])
  const fieldBreakCapacity = Math.max(1, Math.floor(fieldBreakRows.length / 6))
  const fieldBreakLockedCount = fieldBreakRows.filter((row) => row.isLocked).length
  const fieldBreakAutoCount = fieldBreakRows.filter(
    (row) => row.source === 'auto' && !row.isLocked
  ).length
  const fieldBreakReadyCount = fieldBreakRows.filter(
    (row) => row.onSiteDate && row.fieldBreakDate && row.fieldBreakEndDate
  ).length
  const currentFieldBreakSite = sites.find((item) => String(item.id) === fieldBreakSiteId)
  const fieldBreakViolations = useMemo(
    () =>
      validateFieldBreakCapacity(
        fieldBreakRows
          .filter((row) => row.fieldBreakDate && row.fieldBreakEndDate)
          .map((row) => ({
            employeeId: row.employee.id,
            employeeName: row.employee.name,
            sectionName: row.sectionLabel,
            rosterSection: row.rosterSection,
            period,
            onSiteDate: row.onSiteDate,
            dayCount: row.dayCount ?? 1,
            fieldBreakDate: row.fieldBreakDate,
            fieldBreakEndDate: row.fieldBreakEndDate,
            source: row.source,
            isLocked: row.isLocked,
            notes: row.notes,
          })),
        fieldBreakRows.length
      ),
    [fieldBreakRows, period]
  )
  const siteSettingRows = useMemo(
    () =>
      sites.map((siteItem) => {
        const siteKey = extractSiteNameLocal(siteItem.location || siteItem.name)
        const siteEmployees = employees.filter(
          (employee) =>
            String(employee.siteId) === String(siteItem.id) || employee.locationName === siteKey
        )
        const siteRosterPlan = savedPlans.find(
          (plan) =>
            !deletedSchedulePlanKeys.includes(`${plan.siteId}:${plan.period}`) &&
            plan.siteId === siteItem.id &&
            plan.period === period
        )
        const siteFieldBreakRows = fieldBreakPlans.filter(
          (plan) => plan.siteId === siteItem.id && plan.period === period
        )
        const siteConfigRow = schedulingConfigs.find((config) => config.siteId === siteItem.id)

        return {
          site: siteItem,
          employeeCount: siteEmployees.length,
          rosterConfigured: Boolean(siteRosterPlan?.fixedSchedule?.length),
          rosterUpdatedAt: siteRosterPlan?.updatedAt ?? '',
          fieldBreakConfigured: siteFieldBreakRows.length > 0,
          fieldBreakCount: siteFieldBreakRows.length,
          fieldBreakLockedCount: siteFieldBreakRows.filter((plan) => plan.isLocked).length,
          hasConfig: Boolean(siteConfigRow),
          scheduleType: (siteConfigRow?.scheduleType ?? 'office') as SiteScheduleType,
          rosterType: (siteConfigRow?.rosterType ?? '5:2') as SiteRosterType,
        }
      }),
    [
      deletedSchedulePlanKeys,
      employees,
      fieldBreakPlans,
      period,
      savedPlans,
      schedulingConfigs,
      sites,
    ]
  )
  const scheduleHistoryRows = savedPlans
    .filter((plan) => !deletedSchedulePlanKeys.includes(`${plan.siteId}:${plan.period}`))
    .map((plan) => {
      const historySite = sites.find((siteItem) => siteItem.id === plan.siteId)
      const siteConfigRow = schedulingConfigs.find((config) => config.siteId === plan.siteId)

      return {
        siteId: plan.siteId,
        siteName: historySite?.name ?? `Site ${plan.siteId}`,
        period: plan.period,
        employeeCount: plan.fixedSchedule.length || plan.draftSchedule.length,
        scheduleType: siteConfigRow?.scheduleType ?? plan.siteScheduleType,
        rosterType: siteConfigRow?.rosterType ?? '5:2',
        updatedAt: plan.updatedAt,
        configured: Boolean(plan.fixedSchedule.length),
      }
    })
    .sort((left, right) => {
      const periodCompare = right.period.localeCompare(left.period)
      if (periodCompare) return periodCompare
      return left.siteName.localeCompare(right.siteName)
    })
  const serviceKimperRows =
    mode === 'schedule'
      ? rows.filter(
          (row) =>
            row.rosterSection === 'Service Operation' &&
            row.profile.kimperLv &&
            row.profile.kimperTh
        )
      : []
  const servicemanKimperCoverage = days.map((day, index) => ({
    day,
    hasDayShift: serviceKimperRows.some((row) => row.schedule[index] === 'DS'),
    hasNightShift: serviceKimperRows.some((row) => row.schedule[index] === 'NS'),
  }))
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
    setSelectedPermanentCell({ employeeId, day })
  }

  function openScheduleHistory(siteIdValue: number, periodValue: string) {
    const nextSiteId = String(siteIdValue)
    const config = schedulingConfigs.find((item) => item.siteId === siteIdValue)

    setSiteId(nextSiteId)
    setPeriod(periodValue)
    if (config) {
      setSiteConfigs((current) => ({
        ...current,
        [nextSiteId]: {
          ...(current[nextSiteId] ?? defaultSiteConfig),
          scheduleType: config.scheduleType as SiteScheduleType,
          rosterType: config.rosterType as SiteRosterType,
        },
      }))
      setRoster(config.rosterType ?? '5:2')
      setSiteScheduleTypes((current) => ({
        ...current,
        [nextSiteId]: config.scheduleType as SiteScheduleType,
      }))
    }
    setSelectedCell(null)
    setSelectedPermanentCell(null)
    setRosterDialogOpen(true)
  }

  function deleteScheduleHistory() {
    if (!deleteScheduleHistoryTarget) return

    const target = deleteScheduleHistoryTarget
    startDeletingScheduleHistory(async () => {
      try {
        const result = await deleteSchedulingTimesheetPlanAction({
          siteId: target.siteId,
          period: target.period,
        })
        if (!result.ok) {
          toast.error('Gagal hapus history roster.')
          return
        }
        setDeletedSchedulePlanKeys((current) => [...current, `${target.siteId}:${target.period}`])
        setDeleteScheduleHistoryTarget(null)
        toast.success('History roster dihapus.')
      } catch (error) {
        toast.error('Gagal hapus history roster', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
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
        fieldBreakEndDate: row?.fieldBreakEndDate ?? '',
        source: row?.source ?? 'manual',
        isLocked: row?.isLocked ?? false,
        notes: row?.notes ?? '',
      }
      const next = {
        ...existing,
        [key]: key === 'dayCount' ? Number(value) || null : String(value),
        source: 'manual' as const,
      }
      if (
        key === 'fieldBreakDate' &&
        row?.lastFieldBreakDate &&
        next.fieldBreakDate &&
        next.fieldBreakDate < addDays(row.lastFieldBreakDate, fieldBreakWorkCycleDays)
      ) {
        next.fieldBreakDate = addDays(row.lastFieldBreakDate, fieldBreakWorkCycleDays)
      }
      const startTime = next.onSiteDate
        ? new Date(`${next.onSiteDate}T00:00:00Z`).getTime()
        : Number.NaN
      const endTime = next.fieldBreakDate
        ? new Date(`${next.fieldBreakDate}T00:00:00Z`).getTime()
        : Number.NaN
      const dayCountValue =
        Number.isFinite(startTime) && Number.isFinite(endTime)
          ? Math.max(1, Math.round((endTime - startTime) / 86400000))
          : null
      const breakEndDate =
        key === 'fieldBreakDate'
          ? addDays(next.fieldBreakDate ?? '', fieldBreakRestDays - 1)
          : next.fieldBreakEndDate || ''

      return {
        ...current,
        [employeeId]: {
          ...next,
          dayCount: dayCountValue,
          fieldBreakEndDate: breakEndDate,
        },
      }
    })
  }

  function updateFieldBreakMeta(
    employeeId: number,
    patch: Partial<Pick<FieldBreakDraft, 'isLocked' | 'notes' | 'source'>>
  ) {
    if (!guardOpenPeriod('Edit field break')) return
    setFieldBreakDrafts((current) => {
      const row = fieldBreakRows.find((item) => item.employee.id === employeeId)
      const existing = current[employeeId] ?? {
        employeeId,
        onSiteDate: row?.onSiteDate ?? '',
        dayCount: row?.dayCount ?? null,
        fieldBreakDate: row?.fieldBreakDate ?? '',
        fieldBreakEndDate: row?.fieldBreakEndDate ?? '',
        source: row?.source ?? 'manual',
        isLocked: row?.isLocked ?? false,
        notes: row?.notes ?? '',
      }
      return { ...current, [employeeId]: { ...existing, ...patch } }
    })
  }

  function generateFieldBreakYear() {
    if (!guardOpenPeriod('Generate field break')) return
    const numericSiteId = Number(fieldBreakSiteId)
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0 || fieldBreakRows.length === 0) return
    const generated = generateFieldBreakYearPlans({
      employees: fieldBreakRows.map((row) => ({
        employeeId: row.employee.id,
        employeeName: row.employee.name,
        sectionName: row.sectionLabel,
        rosterSection: row.rosterSection,
      })),
      startPeriod: period,
      ...(isThirteenOneRoster
        ? {
            workWeeks: siteConfig.fieldBreakWorkMonths,
            breakWeeks: siteConfig.fieldBreakBreakDays,
          }
        : {
            workMonths: siteConfig.fieldBreakWorkMonths,
            breakDays: siteConfig.fieldBreakBreakDays,
          }),
      existingPlans: fieldBreakRows.map((row) => ({
        employeeId: row.employee.id,
        period: period,
        onSiteDate: row.onSiteDate,
        fieldBreakDate: row.fieldBreakDate,
        fieldBreakEndDate: row.fieldBreakEndDate,
        source: row.source,
        isLocked: row.isLocked,
        notes: row.notes,
      })),
    })
    startSavingFieldBreak(async () => {
      try {
        await saveTimesheetFieldBreakPlansAction({
          siteId: numericSiteId,
          period,
          plans: generated.plans.map((plan) => ({
            period: plan.period,
            employeeId: plan.employeeId,
            employeeName: plan.employeeName,
            sectionName: plan.sectionName,
            rosterSection: plan.rosterSection,
            onSiteDate: plan.onSiteDate,
            dayCount: plan.dayCount,
            fieldBreakDate: plan.fieldBreakDate,
            fieldBreakEndDate: plan.fieldBreakEndDate,
            source: plan.source,
            isLocked: plan.isLocked,
            notes: plan.notes,
          })),
        })
        setFieldBreakPlans((current) => {
          const next = [...current]
          for (const plan of generated.plans) {
            const newPlan = { ...plan, siteId: numericSiteId, updatedAt: new Date().toISOString() }
            const existingIdx = next.findIndex(
              (p) =>
                p.employeeId === plan.employeeId &&
                p.period === plan.period &&
                p.siteId === numericSiteId
            )
            if (existingIdx >= 0) {
              next[existingIdx] = { ...next[existingIdx], ...newPlan }
            } else {
              next.push(newPlan as any)
            }
          }
          return next
        })
        // Also update drafts for the current period so Mulai FB updates locally
        setFieldBreakDrafts((current) => {
          const next = { ...current }
          for (const plan of generated.plans.filter((item) => item.period === period)) {
            next[plan.employeeId] = {
              employeeId: plan.employeeId,
              onSiteDate: plan.onSiteDate,
              dayCount: plan.dayCount,
              fieldBreakDate: plan.fieldBreakDate,
              fieldBreakEndDate: plan.fieldBreakEndDate,
              source: plan.source,
              isLocked: plan.isLocked,
              notes: plan.notes,
            }
          }
          return next
        })
        toast.success(`Field break 12 bulan tersimpan. Max aktif bersamaan: ${generated.capacity}`)
      } catch (error) {
        toast.error('Generate field break gagal', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
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
          fieldBreakEndDate: row.fieldBreakEndDate || null,
          source: row.source,
          isLocked: row.isLocked,
          notes: row.notes,
        })),
      })
    })
  }

  async function saveSiteConfig() {
    if (!guardOpenPeriod('Save site settings')) return
    if (siteId === 'all') return
    const { dbConfig, fieldBreakConfig, pdfConfig } = serializeSiteConfig(siteConfig)
    try {
      const result = await saveSchedulingConfigAction({
        siteId: Number(siteId),
        ...dbConfig,
        fieldBreakConfig,
        pdfConfig,
        allowanceVariables,
        overtimeVariables,
        approvalSections: siteApprovalSections.map((row) => ({
          sectionId: row.sectionId,
          departmentId: row.departmentId,
          matrixId: row.matrixId,
          ...(approvalApprovers[row.id] ?? {
            pjoLeaderId: row.pjoLeaderId,
            sectionHeadId: row.sectionHeadId,
            departmentHeadId: row.departmentHeadId,
          }),
        })),
      })
      if (!result.ok) throw new Error(result.error || 'Setting site gagal disimpan.')
      setRoster(siteConfig.rosterType)
      setSiteScheduleTypes((current) => ({ ...current, [siteId]: siteConfig.scheduleType }))
      setOverrides({})
      setPermanentOverrides({})
      setSelectedCell(null)
      toast.success('Setting site tersimpan.')
      router.refresh()
    } catch (error) {
      toast.error('Setting site gagal disimpan', {
        description: error instanceof Error ? error.message : 'Konfigurasi overtime tidak valid.',
      })
    }
  }

  function updateOvertimeEnabled(enabled: boolean) {
    if (!guardOpenPeriod('Edit site settings')) return
    if (siteId === 'all') return
    setSiteConfigs((current) => {
      const currentConfig = current[siteId] ?? defaultSiteConfig
      return {
        ...current,
        [siteId]: {
          ...currentConfig,
          overtimeConfig: { ...currentConfig.overtimeConfig, enabled },
        },
      }
    })
  }

  function updateOvertimeMode(mode: 'template' | 'realtime') {
    if (!guardOpenPeriod('Edit site settings')) return
    if (siteId === 'all') return
    setSiteConfigs((current) => {
      const currentConfig = current[siteId] ?? defaultSiteConfig
      return {
        ...current,
        [siteId]: {
          ...currentConfig,
          overtimeConfig: { ...currentConfig.overtimeConfig, mode },
        },
      }
    })
  }

  function updateApprovalApprover(
    rowId: string,
    key: keyof ApprovalApproverDraft,
    employeeId: number | null
  ) {
    if (!guardOpenPeriod('Edit approval settings')) return
    setApprovalApprovers((current) => ({
      ...current,
      [rowId]: {
        ...(current[rowId] ?? {
          pjoLeaderId: null,
          sectionHeadId: null,
          departmentHeadId: null,
        }),
        [key]: employeeId,
      },
    }))
  }

  function updateSplPolicy<Key extends keyof SiteOvertimeConfig['splPolicy']>(
    key: Key,
    value: SiteOvertimeConfig['splPolicy'][Key]
  ) {
    if (!guardOpenPeriod('Edit SPL policy')) return
    if (siteId === 'all') return
    setSiteConfigs((current) => {
      const currentConfig = current[siteId] ?? defaultSiteConfig
      return {
        ...current,
        [siteId]: {
          ...currentConfig,
          overtimeConfig: {
            ...currentConfig.overtimeConfig,
            splPolicy: { ...currentConfig.overtimeConfig.splPolicy, [key]: value },
          },
        },
      }
    })
  }

  function updateOvertimeInterval(
    dayKey: OvertimeDayKey,
    shiftKey: OvertimeShiftKey,
    index: number,
    field: 'start' | 'end',
    value: string
  ) {
    if (!guardOpenPeriod('Edit site settings')) return
    if (siteId === 'all') return
    setSiteConfigs((current) => {
      const currentConfig = current[siteId] ?? defaultSiteConfig
      const intervals = currentConfig.overtimeConfig[dayKey][shiftKey].map((interval, itemIndex) =>
        itemIndex === index ? { ...interval, [field]: value } : interval
      )
      return {
        ...current,
        [siteId]: {
          ...currentConfig,
          overtimeConfig: {
            ...currentConfig.overtimeConfig,
            [dayKey]: {
              ...currentConfig.overtimeConfig[dayKey],
              [shiftKey]: intervals,
            },
          },
        },
      }
    })
  }

  function resetSiteOvertimeConfig() {
    if (!guardOpenPeriod('Reset overtime settings')) return
    if (siteId === 'all') return
    setSiteConfigs((current) => {
      const currentConfig = current[siteId] ?? defaultSiteConfig
      const overtimeConfig = normalizeSiteOvertimeConfig(DEFAULT_SITE_OVERTIME_CONFIG)
      overtimeConfig.enabled = currentConfig.overtimeConfig.enabled
      return { ...current, [siteId]: { ...currentConfig, overtimeConfig } }
    })
  }

  function updateSiteConfig<Key extends keyof SiteSchedulingConfig>(
    key: Key,
    value: SiteSchedulingConfig[Key]
  ) {
    if (!guardOpenPeriod('Edit site settings')) return
    if (siteId === 'all') return

    setSiteConfigs((current) => {
      const currentConfig = current[siteId] ?? defaultSiteConfig
      const isThirteenOne = key === 'rosterType' && value === '13:1'
      return {
        ...current,
        [siteId]: {
          ...currentConfig,
          [key]: value,
          ...(isThirteenOne ? { fieldBreakWorkMonths: 12, fieldBreakBreakDays: 2 } : {}),
        },
      }
    })
  }

  function updateEmployeeBenefitRule(
    category: keyof EmployeeBenefitConfig,
    patch: Partial<EmployeeBenefitRule>
  ) {
    if (!guardOpenPeriod('Edit employee benefit settings')) return
    if (siteId === 'all') return
    setSiteConfigs((current) => {
      const currentConfig = current[siteId] ?? defaultSiteConfig
      return {
        ...current,
        [siteId]: {
          ...currentConfig,
          employeeBenefitConfig: {
            ...currentConfig.employeeBenefitConfig,
            [category]: { ...currentConfig.employeeBenefitConfig[category], ...patch },
          },
        },
      }
    })
  }

  function updateQuotationBillingRule(key: keyof QuotationBillingStatusConfig, checked: boolean) {
    if (!guardOpenPeriod('Edit quotation billing settings')) return
    if (siteId === 'all') return
    setSiteConfigs((current) => {
      const currentConfig = current[siteId] ?? defaultSiteConfig
      return {
        ...current,
        [siteId]: {
          ...currentConfig,
          quotationBillingConfig: {
            ...currentConfig.quotationBillingConfig,
            [key]: checked,
          },
        },
      }
    })
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

  function updatePdfConfig(key: keyof PdfConfig, value: string | PdfConfigSigner[] | string[]) {
    if (siteId === 'all') return
    setSiteConfigs((current) => {
      const currentConfig = current[siteId] ?? defaultSiteConfig
      return {
        ...current,
        [siteId]: {
          ...currentConfig,
          pdfConfig: { ...currentConfig.pdfConfig, [key]: value },
        },
      }
    })
  }

  function addCustomSigner() {
    updatePdfConfig('customSigners', [
      ...siteConfig.pdfConfig.customSigners,
      { label: '', name: '', employeeId: null },
    ])
  }

  function removeCustomSigner(index: number) {
    updatePdfConfig(
      'customSigners',
      siteConfig.pdfConfig.customSigners.filter((_, i) => i !== index)
    )
  }

  function updateCustomSigner(
    index: number,
    key: keyof PdfConfigSigner,
    value: string | number | null
  ) {
    updatePdfConfig(
      'customSigners',
      siteConfig.pdfConfig.customSigners.map((s, i) => (i === index ? { ...s, [key]: value } : s))
    )
  }

  function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo maksimal 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      updatePdfConfig('logoUrl', reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  function saveAllowanceVariables() {
    const { dbConfig, fieldBreakConfig, pdfConfig } = serializeSiteConfig(siteConfig)
    const sourceSiteId = Number(siteId)
    void saveSchedulingConfigAction({
      siteId: sourceSiteId,
      ...dbConfig,
      fieldBreakConfig,
      pdfConfig,
      allowanceVariables,
      overtimeVariables,
    }).then(async (result) => {
      if (!result?.ok) return
      const applied = await applyMealsConfigToAllSitesAction({
        sourceSiteId,
        mealsType: siteConfig.mealsType,
        allowanceVariables,
      })
      if (applied?.ok) {
        toast.success(
          `Konfigurasi MSA/Meals disimpan dan diterapkan ke ${applied.count} site lainnya.`
        )
      } else {
        toast.error(applied?.error || 'Gagal menerapkan MSA/Meals ke semua site.')
      }
    })
  }

  function resetAllowanceVariables() {
    setAllowanceVariables(defaultAllowanceVariables)
    const { dbConfig, fieldBreakConfig, pdfConfig } = serializeSiteConfig(siteConfig)
    void saveSchedulingConfigAction({
      siteId: Number(siteId),
      ...dbConfig,
      fieldBreakConfig,
      pdfConfig,
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
    const { dbConfig, fieldBreakConfig, pdfConfig } = serializeSiteConfig(siteConfig)
    void saveSchedulingConfigAction({
      siteId: Number(siteId),
      ...dbConfig,
      fieldBreakConfig,
      pdfConfig,
      allowanceVariables,
      overtimeVariables,
    })
  }

  function resetOvertimeVariables() {
    setOvertimeVariables(defaultOvertimeVariables)
    const { dbConfig, fieldBreakConfig, pdfConfig } = serializeSiteConfig(siteConfig)
    void saveSchedulingConfigAction({
      siteId: Number(siteId),
      ...dbConfig,
      fieldBreakConfig,
      pdfConfig,
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

  function setSelectedPermanentCode(code: ScheduleCode) {
    if (!guardOpenPeriod('Edit fixed schedule')) return
    if (!selectedPermanentCell) return
    setPermanentOverrides((currentOverrides) => ({
      ...currentOverrides,
      [`${selectedPermanentCell.employeeId}-${selectedPermanentCell.day}`]: code,
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
    iconOnly = false,
    excelInsteadOfCsv = false,
  }: {
    tabTitle: string
    tableRows?: typeof rows
    columns?: string[]
    exportRows?: Array<Array<string | number>>
    iconOnly?: boolean
    excelInsteadOfCsv?: boolean
  }) {
    const excelColumns = columns ?? rosterExportColumns()
    const excelRows = exportRows ?? rosterExportRows(tableRows)

    return (
      <div className={cn('flex flex-wrap gap-1', excelInsteadOfCsv && 'flex-row-reverse')}>
        <Button
          size={iconOnly ? 'icon' : 'sm'}
          variant="outline"
          disabled={tableRows.length === 0 && excelRows.length === 0}
          aria-label={`Export PDF ${tabTitle}`}
          title={`Export PDF ${tabTitle}`}
          onClick={() =>
            columns && exportRows
              ? exportSummaryPdf(tabTitle, excelColumns, excelRows)
              : exportRosterPdf(tabTitle, tableRows)
          }
        >
          {iconOnly ? <FileText className="size-4" /> : <Download className="mr-2 size-4" />}
          {iconOnly ? <span className="sr-only">Export PDF</span> : 'Export PDF'}
        </Button>
        <Button
          size={iconOnly ? 'icon' : 'sm'}
          variant="outline"
          disabled={excelRows.length === 0}
          onClick={() =>
            excelInsteadOfCsv
              ? exportRowsToFile({ columns: excelColumns, rows: excelRows, fileName: tabTitle })
              : exportCsv(tabTitle, excelColumns, excelRows)
          }
          aria-label={`Export ${excelInsteadOfCsv ? 'Excel' : 'CSV'} ${tabTitle}`}
          title={`Export ${excelInsteadOfCsv ? 'Excel' : 'CSV'} ${tabTitle}`}
        >
          {excelInsteadOfCsv ? (
            <FileSpreadsheet className="size-4" />
          ) : (
            <Download className={cn('size-4', !iconOnly && 'mr-2')} />
          )}
          {iconOnly ? (
            <span className="sr-only">Export {excelInsteadOfCsv ? 'Excel' : 'CSV'}</span>
          ) : excelInsteadOfCsv ? (
            'Export Excel'
          ) : (
            'Export CSV'
          )}
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
        isLokal: !isNonLocalEmployee({
          manpower: selectedEmployee.manpower,
          pointOfHire: selectedEmployee.pointOfHire,
          workLocations: [
            selectedEmployee.workLocation,
            selectedEmployee.siteLocation,
            selectedEmployee.locationName,
          ],
        }),
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

  function getAttendanceCell(
    employeeId: number,
    day: number,
    scheduleCode?: string
  ): ManualAttendanceCell {
    const key = attendanceKey(employeeId, day)
    const manual = manualAttendance[key]
    if (manual) return manual

    const real = attendanceByCell.get(key)
    if (!real) {
      const code = scheduleCode ?? rows.find((r) => r.employee.id === employeeId)?.schedule[day - 1]
      const rosterStatus = normalizeAttendanceStatus(code)
      if (
        rosterStatus === 'off' ||
        rosterStatus === 'field_break' ||
        rosterStatus === 'sick' ||
        rosterStatus === 'leave' ||
        rosterStatus === 'standby'
      ) {
        return {
          status: rosterStatus,
          clockIn: '',
          clockOut: '',
          note: '',
        }
      }
      return { status: 'empty', clockIn: '', clockOut: '', note: '', source: 'attendance' }
    }

    const status = normalizeAttendanceStatus(
      real.clockIn?.status ?? real.clockOut?.status ?? real.records[0]?.status
    )
    const clockIn = timeFromIso(real.clockIn?.eventTime)
    const note =
      real.clockIn?.locationNote ||
      real.clockOut?.locationNote ||
      real.records[0]?.locationNote ||
      'Face/location attendance'
    const punctualityDetail = getPunctualityDetail(note)
    const scheduledClockIn = resolveConfiguredShiftClockIn(scheduleCode, siteConfig)
    const isLatePending =
      status === 'present' &&
      (punctualityDetail?.startsWith('Kehadiran: Terlambat') ||
        (!punctualityDetail &&
          clockIn &&
          scheduledClockIn &&
          minutesFromTime(clockIn) !== null &&
          minutesFromTime(scheduledClockIn) !== null &&
          (minutesFromTime(clockIn) ?? 0) > (minutesFromTime(scheduledClockIn) ?? 0)))
    return {
      status,
      clockIn,
      clockOut: timeFromIso(real.clockOut?.eventTime),
      note,
      source: 'attendance',
      isLatePending: Boolean(isLatePending),
    }
  }

  function updateAttendanceCell(
    employeeId: number,
    day: number,
    patch: Partial<ManualAttendanceCell>
  ) {
    if (!guardOpenPeriod('Edit attendance')) return
    const key = attendanceKey(employeeId, day)
    const statusClearsTime = patch.status === 'standby' || patch.status === 'field_break'
    setManualAttendance((current) => ({
      ...current,
      [key]: {
        ...getAttendanceCell(employeeId, day),
        source: 'manual',
        ...patch,
        ...(statusClearsTime ? { clockIn: '', clockOut: '' } : {}),
      },
    }))
    setIsAttendanceDirty(true)
  }

  function cycleAttendanceCell(employeeId: number, day: number) {
    if (!guardOpenPeriod('Edit attendance')) return
    const current = getAttendanceCell(employeeId, day)
    const cycle: AttendanceCellStatus[] = [
      'present',
      'off',
      'standby',
      'field_break',
      'sick',
      'leave',
      'absent',
      'empty',
    ]
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
      const [XLSX, { parseAttendanceWorkbook }] = await Promise.all([
        import('xlsx'),
        import('@/lib/timesheet/attendance-template-parser'),
      ])
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const allEmployeesForMatch = employees.length > 0 ? employees : visibleEmployees

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

        // Check if this row is an early-morning checkout (< 09:00) without a check-in >= 09:00,
        // following a Night Shift on the previous day.
        const prevDayKey = row.day > 1 ? attendanceKey(matchedEmployee.id, row.day - 1) : null
        const prevCell = prevDayKey ? cellUpdates[prevDayKey] : undefined
        const prevScheduleCode = row.day > 1 ? rows.find((r) => r.employee.id === matchedEmployee.id)?.schedule[row.day - 2] : undefined
        const isPrevNightShift =
          (prevCell && prevCell.clockIn && Number(prevCell.clockIn.split(':')[0]) >= 15) ||
          ['NS', 'NG', 'NIGHT', 'NIGHTSHIFT', 'MALAM', 'SHIFT2'].includes((prevScheduleCode || '').toUpperCase())

        const isEarlyMorningOnly =
          row.clockOut &&
          Number(row.clockOut.split(':')[0]) < 9 &&
          (!row.clockIn || Number(row.clockIn.split(':')[0]) < 9)

        if (isPrevNightShift && isEarlyMorningOnly && prevDayKey) {
          // Map checkout to previous day (the check-in day)
          cellUpdates[prevDayKey] = {
            ...cellUpdates[prevDayKey],
            clockOut: row.clockOut || cellUpdates[prevDayKey].clockOut,
            status: 'present',
          }
          // Day D+1 remains OFF / empty, not marked as present
          continue
        }

        const status: 'present' | 'empty' = row.clockIn ? 'present' : row.clockOut && !isEarlyMorningOnly ? 'present' : 'empty'
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
        toast.error('Tidak ada karyawan yang cocok dengan data HERO.', {
          description: `${unmatchedCount} nama tidak ditemukan. Cek console untuk detail.`,
        })
        return
      }

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

  function saveAttendanceRealWithData(nextManual: Record<string, ManualAttendanceCell>) {
    if (!guardOpenPeriod('Save attendance')) return
    const numericSiteId = Number(siteId)
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0 || isFinalized) return
    const overrides = Object.entries(nextManual).map(([key, cell]) => {
      const [employeeId, day] = key.split('-').map(Number)
      return {
        employeeId,
        day,
        status: cell.status,
        clockIn: cell.clockIn,
        clockOut: cell.clockOut,
        note: cell.note,
        source: cell.source ?? 'manual',
        overtimeHours:
          cell.overtimeHours !== undefined && cell.overtimeHours !== null
            ? cell.overtimeHours
            : null,
      }
    })
    console.log(
      '[CLIENT] overrides payload being sent:',
      overrides.filter((o) => o.overtimeHours !== null)
    )

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
          router.refresh()
          toast.success('Attendance saved')
        }
      } catch (error) {
        toast.error('Save attendance failed', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  }

  function saveAttendanceReal() {
    saveAttendanceRealWithData(manualAttendance)
  }

  function clearImportedAttendance() {
    if (!guardOpenPeriod('Delete Excel import')) return
    const numericSiteId = Number(siteId)
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0 || isFinalized) return
    startSavingAttendance(async () => {
      try {
        await clearAttendanceRealOverridesAction({
          siteId: numericSiteId,
          period,
          source: 'excel',
          removeWorkspace: false,
        })
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

  const attendanceConflicts =
    mode === 'attendance'
      ? rows.flatMap(
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
      : []

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
  const conflictKeySet =
    mode === 'attendance'
      ? new Set(
          attendanceConflicts.map((conflict) => attendanceKey(conflict.employeeId, conflict.day))
        )
      : new Set<string>()
  const displayedAttendanceRows = useMemo(() => {
    let list =
      mode === 'attendance' && showConflictsOnly
        ? rows.filter((row) =>
            days.some((day) => conflictKeySet.has(attendanceKey(row.employee.id, day)))
          )
        : rows

    if (attendanceSearch.trim()) {
      const q = attendanceSearch.trim().toLowerCase()
      list = list.filter(
        (r) =>
          r.employee.name.toLowerCase().includes(q) ||
          (r.employee.section || '').toLowerCase().includes(q) ||
          (r.employee.department || '').toLowerCase().includes(q)
      )
    }

    if (attendanceStatusFilter !== 'all') {
      list = list.filter((r) => {
        const cells = days.map((day) => getAttendanceCell(r.employee.id, day))
        if (attendanceStatusFilter === 'present') return cells.some((c) => c.status === 'present')
        if (attendanceStatusFilter === 'sick') return cells.some((c) => c.status === 'sick')
        if (attendanceStatusFilter === 'leave') return cells.some((c) => c.status === 'leave')
        if (attendanceStatusFilter === 'absent') return cells.some((c) => c.status === 'absent')
        if (attendanceStatusFilter === 'off')
          return cells.some((c) => c.status === 'off')
        if (attendanceStatusFilter === 'gb')
          return (
            cells.some((c) => c.status === 'field_break') ||
            r.schedule.some((code) => String(code) === 'GB' || String(code) === 'FB')
          )
        return true
      })
    }

    return list
  }, [
    mode,
    showConflictsOnly,
    rows,
    conflictKeySet,
    days,
    attendanceSearch,
    attendanceStatusFilter,
    getAttendanceCell,
  ])

  useEffect(() => {
    setSelectedOvertimeEmployeeIds([])
  }, [period, siteId])

  function toggleOvertimeEmployee(employeeId: number) {
    setSelectedOvertimeEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    )
  }

  function toggleAllOvertimeEmployees() {
    const visibleIds = displayedAttendanceRows.map((row) => row.employee.id)
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedOvertimeEmployeeIds.includes(id))
    setSelectedOvertimeEmployeeIds((current) =>
      allSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]))
    )
  }

  function submitFinalizePeriod() {
    const numericSiteId = Number(siteId)
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0) return
    startSavingSchedule(async () => {
      try {
        await submitSchedulingPeriodForReviewAction({
          siteId: numericSiteId,
          period,
          note: finalizeReason,
        })
        toast.success('Period dikirim ke HR untuk review')
        window.location.reload()
      } catch (error) {
        toast.error('Submit review gagal', {
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

  async function buildEmployeeOvertimePdf(employee: EmployeeOption, showTotalOvertime = true) {
    const { generateOvertimeRecordPdf, buildAttendanceDayData } =
      await import('@/lib/timesheet/generate-attendance-pdf')
    const employeeRow = rows.find((row) => row.employee.id === employee.id)
    const employeeSchedule = employeeRow?.schedule ?? []
    const staff = isStaffRole(employee.role)
    const dayData = buildAttendanceDayData({
      period,
      dayCount,
      getCell: (day) => getAttendanceCell(employee.id, day),
      getScheduleCode: (day) => employeeSchedule[day - 1] ?? 'IN',
      holidays,
      getOvertime: (day) => {
        const cell = getAttendanceCell(employee.id, day)
        return calculateDayOvertime(
          employeeSchedule,
          day,
          cell.clockIn,
          cell.clockOut,
          staff,
          employee.id
        )
      },
    }).map((day) => {
      const shiftKey = day.scheduleCode === 'NS' ? 'nightShift' : 'dayShift'
      const dayKey = classifyOvertimePolicyDay({
        schedule: employeeSchedule,
        dayIndex: day.day - 1,
        isHoliday: day.isHoliday,
        rosterType: siteConfig.rosterType,
      })
      const configuredIntervals = siteConfig.overtimeConfig[dayKey]?.[shiftKey] ?? []
      const useDay6WorkingTime = dayKey === 'hariKe6' && siteConfig.day6WorkingTimeEnabled
      const useDay7WorkingTime = dayKey === 'hariKe7' && siteConfig.day7WorkingTimeEnabled
      return {
        ...day,
        // ponytail: keep one shared builder for single and bulk downloads.
        workingTimeFrom: day.isHoliday
          ? ''
          : useDay7WorkingTime
            ? day.scheduleCode === 'NS'
              ? siteConfig.day7NightShiftClockIn
              : siteConfig.day7DayShiftClockIn
            : useDay6WorkingTime
              ? day.scheduleCode === 'NS'
                ? siteConfig.day6NightShiftClockIn
                : siteConfig.day6DayShiftClockIn
              : day.scheduleCode === 'NS'
                ? siteConfig.nightShiftClockIn
                : siteConfig.dayShiftClockIn,
        workingTimeTo: day.isHoliday
          ? ''
          : useDay7WorkingTime
            ? day.scheduleCode === 'NS'
              ? siteConfig.day7NightShiftClockOut
              : siteConfig.day7DayShiftClockOut
            : useDay6WorkingTime
              ? day.scheduleCode === 'NS'
                ? siteConfig.day6NightShiftClockOut
                : siteConfig.day6DayShiftClockOut
              : day.scheduleCode === 'NS'
                ? siteConfig.nightShiftClockOut
                : siteConfig.dayShiftClockOut,
        configuredOvertimeIntervals: configuredIntervals as OvertimeInterval[],
      }
    })
    return generateOvertimeRecordPdf({
      period,
      employeeName: employee.name,
      employeeSn: employee.employeeSn || '',
      department: employee.department || '',
      section: employee.section || '',
      siteName: site?.name || '',
      signatures: { ...pdfSignatures, preparedBy: employee.name },
      days: dayData,
      isNonStaff: !staff,
      showTotalOvertime,
    })
  }

  async function buildEmployeeAllowanceRecordPdf(
    employee: EmployeeOption,
    view: 'msa' | 'meals' | 'lokasi'
  ) {
    const { generateEmployeeAllowanceRecordPdf } =
      await import('@/lib/timesheet/generate-attendance-pdf')
    const dayData = await buildEmployeeAllowanceDayData(employee)
    return generateEmployeeAllowanceRecordPdf({
      view,
      period,
      employeeName: employee.name,
      employeeSn: employee.employeeSn || '',
      department: employee.department || '',
      section: employee.section || '',
      siteName: site?.name || '',
      signatures: { ...pdfSignatures, preparedBy: employee.name },
      days: dayData,
    })
  }

  async function generateEmployeeOvertimePdf(employee: EmployeeOption) {
    try {
      // Sesuaikan record yang di-generate dengan view halaman yang sedang dibuka:
      // Tunjangan Khusus -> TU, MSA -> MSA, Meals -> MLS, selain itu -> Overtime Record.
      if (attendanceView === 'msa' || attendanceView === 'meals' || attendanceView === 'lokasi') {
        const pdf = await buildEmployeeAllowanceRecordPdf(employee, attendanceView)
        const label =
          attendanceView === 'msa' ? 'MSA' : attendanceView === 'meals' ? 'MLS' : 'TU'
        const blob = new Blob([new Uint8Array(pdf)], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${label}_Record_${employee.name.replace(/\s+/g, '_')}_${period}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success(`PDF ${label} Record ${employee.name} berhasil di-generate.`)
        return
      }
      const pdf = await buildEmployeeOvertimePdf(employee)
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
      toast.error('Generate PDF Record gagal', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  type SummaryView = 'ovt' | 'msa' | 'meals' | 'lokasi'

  function currentSummaryView(): SummaryView {
    return attendanceView === 'attendance' ? 'ovt' : attendanceView
  }

  function buildSummaryRows(view: SummaryView, employeeIds?: number[]) {
    const idSet = employeeIds ? new Set(employeeIds) : null
    const sourceRows = idSet ? rows.filter((row) => idSet.has(row.employee.id)) : rows
    const grouped = new Map<string, Map<string, typeof rows>>()
    for (const row of sourceRows) {
      const dept = row.employee.department || 'Tanpa Departemen'
      const section = row.employee.section || row.employee.role || 'Umum'
      if (!grouped.has(dept)) grouped.set(dept, new Map())
      const deptMap = grouped.get(dept)!
      if (!deptMap.has(section)) deptMap.set(section, [])
      deptMap.get(section)!.push(row)
    }
    const result: Array<{
      no: number
      name: string
      sn: string
      loc: string
      department: string
      section: string
      dailyValues: Array<string | number | null>
      total: string
      remark: string
    }> = []
    let no = 1
    for (const [dept, sections] of grouped) {
      for (const [section, sectionRows] of sections) {
        for (const row of sectionRows) {
          const staff = isStaffRole(row.employee.role)
          // Nilai tiap hari — samakan persis dengan tabel di layar
          const dailyValues = days.map((day) => {
            const code = row.schedule[day - 1] as string
            const cell = getAttendanceCell(row.employee.id, day, code)
            const allowance = getAllowanceAmounts(row, day)
            const isFieldBreakDay =
              code === 'FB' ||
              cell.status === 'field_break' ||
              (fieldBreakDaysByEmployee.get(row.employee.id)?.has(day) ?? false)
            const isRosterOff = code === 'OFF' || code === 'Libur'
            const isHolidayDay = Boolean(holidaysByDay.get(day))
            const isAbsent =
              cell.status === 'leave' || cell.status === 'sick' || cell.status === 'absent'
            const isEmptyWorkDay =
              !isRosterOff &&
              !isHolidayDay &&
              code !== 'ST' &&
              cell.status === 'empty'
            const noAllowance = isAbsent || isEmptyWorkDay || code === 'FB'
            const absentLabel =
              cell.status === 'leave'
                ? 'Izin'
                : cell.status === 'sick'
                  ? 'Sakit'
                  : cell.status === 'absent'
                    ? 'Alpha'
                    : '-'

            if (view === 'ovt') {
              if (staff) return '-'
              if (cell.status !== 'present') {
                return ['OFF', 'FB', 'Libur', 'Sakit'].includes(code) ? code : ''
              }
              const overtime = calculateDayOvertime(
                row.schedule,
                day,
                cell.clockIn,
                cell.clockOut,
                staff,
                row.employee.id
              )
              if (overtime.totalHours > 0) return String(overtime.totalHours)
              if (overtime.unauthorizedMinutes > 0) return 'SPL'
              return ''
            }
            if (view === 'msa') {
              if (!allowance.rule.msa || siteConfig.msaType === 'none') return '-'
              if (isFieldBreakDay) return 'FB'
              // Angka polos tanpa separator ribuan agar muat di cell hari yang sempit
              return allowance.msaAmount > 0 ? String(allowance.msaAmount) : '-'
            }
            if (view === 'meals') {
              if (!allowance.rule.meals || siteConfig.mealsType === 'none') return '-'
              if (isFieldBreakDay) return 'FB'
              return String(allowance.mealsAmount)
            }
            // lokasi (Tunjangan Khusus)
            if (!allowance.rule.specialAllowance) return '-'
            if (isFieldBreakDay && cell.status !== 'present') return 'FB'
            if (noAllowance) return absentLabel
            return allowance.specialAllowanceAmount
              ? String(allowance.specialAllowanceAmount)
              : '-'
          })
          // Total — samakan dengan kolom Total di layar
          let total = 0
          for (const day of days) {
            const cell = getAttendanceCell(row.employee.id, day)
            const code = row.schedule[day - 1] as string
            const allowance = getAllowanceAmounts(row, day)
            if (view === 'lokasi') {
              total += allowance.specialAllowanceAmount
              continue
            }
            const isFbPeriod = code === 'FB' || cell.status === 'field_break'
            if (isFbPeriod && (view === 'msa' || view === 'meals')) continue
            if (view === 'ovt' && cell.status !== 'present') continue
            if (view === 'msa') total += allowance.msaAmount
            else if (view === 'meals') total += allowance.mealsAmount
            else if (!staff)
              total += calculateDayOvertime(
                row.schedule,
                day,
                cell.clockIn,
                cell.clockOut,
                staff,
                row.employee.id
              ).totalHours
          }
          const siteNameClean = extractSiteNameLocal(site?.name)
          const rowLoc =
            siteNameClean && siteNameClean !== 'Semua Site'
              ? siteNameClean
              : extractSiteNameLocal(row.employee.siteLocation) ||
                extractSiteNameLocal(row.employee.workLocation) ||
                extractSiteNameLocal(row.employee.locationName) ||
                siteNameClean ||
                ''
          result.push({
            no,
            name: row.employee.name,
            sn: row.employee.employeeSn || '',
            loc: rowLoc,
            department: dept,
            section,
            dailyValues,
            total: view === 'ovt' ? String(roundOvertimeHours(total)) : String(total),
            remark: 'NORMAL',
          })
          no++
        }
      }
    }
    return result
  }

  async function buildSummaryPdf(view: SummaryView, employeeIds?: number[]) {
    const { generateSummaryTablePdf } =
      await import('@/lib/timesheet/generate-attendance-pdf')
    return generateSummaryTablePdf({
      view: view === 'ovt' ? 'ot' : view,
      period,
      siteName: site?.name || '',
      project: rate.project,
      dayCount,
      rows: buildSummaryRows(view, employeeIds),
      signatures: pdfSignatures,
      holidays,
    })
  }

  async function downloadSummaryPdf(view: SummaryView) {
    try {
      const pdf = await buildSummaryPdf(view)
      const blob = new Blob([new Uint8Array(pdf)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const sitePart = (site?.name || 'Semua Site').replace(/\s+/g, '_')
      const label =
        view === 'ovt'
          ? 'Overtime'
          : view === 'msa'
            ? 'MSA'
            : view === 'meals'
              ? 'MLS'
              : 'TU'
      a.download = `${label}_Summary_${sitePart}_${period}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(`PDF ${label} Summary berhasil di-download.`)
    } catch (error) {
      console.error('[PDF Summary Error]', error)
      toast.error('Download PDF Summary gagal', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async function previewEmployeeOvertimePdf(employee: EmployeeOption) {
    try {
      const pdf = await buildEmployeeOvertimePdf(employee, true)
      openPdfPreview(pdf, `OT Record • ${employee.name} • ${period}`)
    } catch (error) {
      console.error('[Preview PDF OT Error]', error)
      toast.error('Preview PDF Overtime gagal', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async function bulkDownloadOvertimePdf(showTotalOvertime: boolean) {
    const selected = rows
      .filter((row) => selectedOvertimeEmployeeIds.includes(row.employee.id))
      .map((row) => row.employee)
    if (!selected.length) {
      toast.error('Pilih minimal satu karyawan untuk bulk download OT PDF.')
      return
    }
    try {
      const { PDFDocument } = await import('pdf-lib')
      const merged = await PDFDocument.create()
      // Halaman awal: semua tabel summary (Overtime, MSA, Meals, Tunjangan Khusus)
      const summaryViews: Array<'ovt' | 'msa' | 'meals' | 'lokasi'> = [
        'ovt',
        'msa',
        'meals',
        'lokasi',
      ]
      for (const summaryView of summaryViews) {
        const summaryPdf = await buildSummaryPdf(
          summaryView,
          selected.map((employee) => employee.id)
        )
        const summarySource = await PDFDocument.load(summaryPdf)
        const summaryPages = await merged.copyPages(
          summarySource,
          summarySource.getPageIndices()
        )
        summaryPages.forEach((page) => merged.addPage(page))
      }
      for (const employee of selected) {
        for (const pdf of [
          await buildEmployeeOvertimePdf(employee, showTotalOvertime),
          await buildEmployeeAllowancePdf(employee),
        ]) {
          const source = await PDFDocument.load(pdf)
          const pages = await merged.copyPages(source, source.getPageIndices())
          pages.forEach((page) => merged.addPage(page))
        }
      }
      const blob = new Blob([new Uint8Array(await merged.save())], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `OT_Benefit_Bulk_${period}_${showTotalOvertime ? 'dengan-total' : 'tanpa-total'}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success(
        `${selected.length} karyawan: 4 summary (OT/MSA/MLS/TU) di awal, lalu OT dan Benefit digabung.`
      )
    } catch (error) {
      console.error('[Bulk PDF OT Error]', error)
      toast.error('Bulk download PDF Overtime gagal', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async function buildEmployeeAllowanceDayData(employee: EmployeeOption) {
    const { buildAttendanceDayData } =
      await import('@/lib/timesheet/generate-attendance-pdf')
    const employeeRow = rows.find((row) => row.employee.id === employee.id)
    if (!employeeRow) throw new Error('Data schedule karyawan tidak ditemukan.')
    return buildAttendanceDayData({
      period,
      dayCount,
      getCell: (day) => getAttendanceCell(employee.id, day),
      getScheduleCode: (day) => employeeRow.schedule[day - 1] as string,
      holidays,
    }).map((day) => {
      const allowance = getAllowanceAmounts(employeeRow, day.day)
      return {
        ...day,
        msaAmount: allowance.msaAmount,
        mealsAmount: allowance.mealsAmount,
        specialAllowanceAmount: allowance.specialAllowanceAmount,
        showMsa: siteConfig.msaType !== 'none' && allowance.rule.msa,
        showMeals: siteConfig.mealsType !== 'none' && allowance.rule.meals,
        showSpecialAllowance: allowance.rule.specialAllowance,
      }
    })
  }

  async function buildEmployeeAllowancePdf(employee: EmployeeOption) {
    const { generateSiteAllowancePdf } =
      await import('@/lib/timesheet/generate-attendance-pdf')
    const dayData = await buildEmployeeAllowanceDayData(employee)
    return generateSiteAllowancePdf({
      period,
      employeeName: employee.name,
      employeeSn: employee.employeeSn || '',
      department: employee.department || '',
      section: employee.section || '',
      siteName: site?.name || '',
      signatures: { ...pdfSignatures, preparedBy: employee.name },
      days: dayData,
    })
  }

  async function previewEmployeeRecordPdf(employee: EmployeeOption) {
    try {
      if (attendanceView === 'msa' || attendanceView === 'meals' || attendanceView === 'lokasi') {
        const pdf = await buildEmployeeAllowanceRecordPdf(employee, attendanceView)
        const label =
          attendanceView === 'msa' ? 'MSA' : attendanceView === 'meals' ? 'MLS' : 'TU'
        openPdfPreview(pdf, `${label} Record • ${employee.name} • ${period}`)
      } else {
        await previewEmployeeOvertimePdf(employee)
      }
    } catch (error) {
      console.error('[Preview PDF Record Error]', error)
      toast.error('Preview PDF Record gagal', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async function generateEmployeeAllowancePdf(employee: EmployeeOption) {
    try {
      const pdf = await buildEmployeeAllowancePdf(employee)
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

      const { generateDailyActivityPdf } =
        await import('@/lib/timesheet/generate-daily-activity-pdf')
      const pdf = await generateDailyActivityPdf({
        period,
        employeeName: employee.name,
        employeeSn: employee.employeeSn || '',
        department: employee.department || '',
        section: employee.section || '',
        siteName: site?.name || '',
        signatures: { ...pdfSignatures, preparedBy: employee.name },
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

  function openPdfPreview(pdf: Uint8Array, title: string) {
    if (pdfPreview) {
      URL.revokeObjectURL(pdfPreview.url)
    }
    const blob = new Blob([new Uint8Array(pdf)], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    setPdfPreview({ url, title })
  }

  async function previewAllSiteOvertimePdf() {
    const allEmployees = rows.map((row) => row.employee)
    if (allEmployees.length === 0) {
      toast.error('Tidak ada karyawan untuk site ini.')
      return
    }
    try {
      const { PDFDocument } = await import('pdf-lib')
      const merged = await PDFDocument.create()
      // Halaman awal: semua tabel summary (Overtime, MSA, Meals, Tunjangan Khusus)
      const summaryViews: Array<'ovt' | 'msa' | 'meals' | 'lokasi'> = [
        'ovt',
        'msa',
        'meals',
        'lokasi',
      ]
      for (const summaryView of summaryViews) {
        const summaryPdf = await buildSummaryPdf(
          summaryView,
          allEmployees.map((employee) => employee.id)
        )
        const summarySource = await PDFDocument.load(summaryPdf)
        const summaryPages = await merged.copyPages(
          summarySource,
          summarySource.getPageIndices()
        )
        summaryPages.forEach((page) => merged.addPage(page))
      }
      for (const employee of allEmployees) {
        for (const pdf of [
          await buildEmployeeOvertimePdf(employee, true),
          await buildEmployeeAllowancePdf(employee),
        ]) {
          const source = await PDFDocument.load(pdf)
          const pages = await merged.copyPages(source, source.getPageIndices())
          pages.forEach((page) => merged.addPage(page))
        }
      }
      openPdfPreview(
        await merged.save(),
        `Priview 4 Summary + OT/Benefit • ${site?.name ?? 'Site'} • ${period} (${allEmployees.length} karyawan)`
      )
    } catch (error) {
      console.error('[Preview PDF Site Error]', error)
      toast.error('Preview PDF site gagal', {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async function downloadAttendanceTemplate() {
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
      { Status: 'ST', Keterangan: 'Standby.' },
      { Status: 'GB', Keterangan: 'Field Break.' },
      { Status: '-', Keterangan: 'Kosong / belum ada data.' },
    ]
    const XLSX = await import('xlsx')
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(templateRows),
      'Attendance Real'
    )
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(helperRows), 'Panduan')
    XLSX.writeFile(workbook, `attendance-real-template-${period}.xlsx`)
  }

  const attendanceStats =
    mode === 'attendance'
      ? rows.reduce(
          (stats, row) => {
            for (const day of days) {
              const status = getAttendanceCell(row.employee.id, day).status
              stats[status] += 1
            }
            return stats
          },
          {
            present: 0,
            late_pending: 0,
            empty: 0,
            sick: 0,
            leave: 0,
            absent: 0,
            off: 0,
            standby: 0,
            field_break: 0,
          } as Record<AttendanceCellStatus, number>
        )
      : ({
          present: 0,
          late_pending: 0,
          empty: 0,
          sick: 0,
          leave: 0,
          absent: 0,
          off: 0,
          standby: 0,
          field_break: 0,
        } as Record<AttendanceCellStatus, number>)

  // Source summary stats for AttendanceSummaryBar (Req 7.1, 7.2, 7.5)
  const attendanceSourceStats = useMemo(() => {
    if (mode !== 'attendance')
      return { faceDays: 0, excelDays: 0, manualDays: 0, totalFilledDays: 0, facePercentage: 0 }
    let faceDays = 0
    let excelDays = 0
    let manualDays = 0
    for (const row of rows) {
      for (const day of days) {
        const cell = getAttendanceCell(row.employee.id, day)
        if (cell.status === 'empty') continue
        if (
          cell.source === 'attendance' &&
          attendanceByCell.has(attendanceKey(row.employee.id, day))
        )
          faceDays++
        else if (cell.source === 'excel') excelDays++
        else if (cell.source === 'manual') manualDays++
      }
    }
    const totalFilledDays = faceDays + excelDays + manualDays
    const facePercentage =
      totalFilledDays > 0 ? Math.round((faceDays / totalFilledDays) * 1000) / 10 : 0
    return { faceDays, excelDays, manualDays, totalFilledDays, facePercentage }
  }, [mode, rows, days, manualAttendance, attendanceByCell, period, siteId])

  // Set of employee IDs with zero face attendance records (Req 7.3)
  const employeesWithZeroFace = useMemo(() => {
    if (mode !== 'attendance') return new Set<number>()
    const zeroFaceSet = new Set<number>()
    for (const row of rows) {
      let hasFace = false
      for (const day of days) {
        const cell = getAttendanceCell(row.employee.id, day)
        if (
          cell.source === 'attendance' &&
          cell.status !== 'empty' &&
          attendanceByCell.has(attendanceKey(row.employee.id, day))
        ) {
          hasFace = true
          break
        }
      }
      if (!hasFace) zeroFaceSet.add(row.employee.id)
    }
    return zeroFaceSet
  }, [mode, rows, days, manualAttendance, attendanceByCell, period, siteId])

  const fieldBreakDaysByEmployee = useMemo(() => {
    const result = new Map<number, Set<number>>()
    for (const plan of fieldBreakPlans) {
      if (String(plan.siteId) !== siteId || plan.period !== period) continue
      const startDay = dayFromDate(plan.fieldBreakDate, period)
      const endDay = dayFromDate(plan.fieldBreakEndDate || plan.fieldBreakDate, period)
      if (!startDay || !endDay) continue
      const days = result.get(plan.employeeId) ?? new Set<number>()
      for (let day = startDay; day <= Math.min(endDay, dayCount); day += 1) {
        days.add(day)
      }
      result.set(plan.employeeId, days)
    }
    return result
  }, [dayCount, fieldBreakPlans, period, siteId])

  const selectedAttendanceEmployee = selectedAttendanceCell
    ? visibleEmployees.find((employee) => employee.id === selectedAttendanceCell.employeeId)
    : null
  const selectedAttendanceValue = selectedAttendanceCell
    ? getAttendanceCell(selectedAttendanceCell.employeeId, selectedAttendanceCell.day)
    : null
  const approvedSplByEmployee = useMemo(() => {
    const result = new Map<number, ApprovedSplWindow[]>()
    for (const window of approvedSplWindows) {
      if (String(window.siteId) !== siteId) continue
      const employeeWindows = result.get(window.employeeId) ?? []
      employeeWindows.push(window)
      result.set(window.employeeId, employeeWindows)
    }
    return result
  }, [approvedSplWindows, siteId])

  function calculateLegacyOvertime(
    schedule: ScheduleCode[],
    day: number,
    clockIn: string,
    clockOut: string
  ) {
    const clockInMinutes = minutesFromTime(clockIn)
    const clockOutMinutes = minutesFromTime(clockOut)
    if (clockInMinutes == null || clockOutMinutes == null) return 0
    const totalHours =
      (clockOutMinutes >= clockInMinutes
        ? clockOutMinutes - clockInMinutes
        : clockOutMinutes + 1440 - clockInMinutes) / 60
    const dayType = classifyOvertimeDay(schedule, period, day - 1, siteConfig.rosterType, holidays)
    const configured = overtimeVariables.find(
      (item) =>
        item.roster === siteConfig.rosterType &&
        item.dayType === dayType &&
        item.totalHours === totalHours
    )
    return roundOvertimeHours(configured?.overtimeHours ?? Math.max(0, totalHours - 8))
  }

  function calculateDayOvertime(
    schedule: ScheduleCode[],
    day: number,
    clockIn: string,
    clockOut: string,
    staff: boolean,
    employeeId: number,
    ignoreOverride = false
  ): OvertimeCalculationResult {
    if (!ignoreOverride) {
      const key = attendanceKey(employeeId, day)
      const cell = manualAttendance[key]
      if (cell && cell.overtimeHours !== undefined && cell.overtimeHours !== null) {
        return legacyOvertimeResult(cell.overtimeHours)
      }
    }

    if (staff || siteConfig.overtimeType === 'none' || (!clockIn && !clockOut)) {
      return legacyOvertimeResult(0)
    }
    const shiftCode = schedule[day - 1] ?? 'IN'
    const defaultIn = shiftCode === 'NS' ? siteConfig.nightShiftClockIn : siteConfig.dayShiftClockIn
    const defaultOut =
      shiftCode === 'NS' ? siteConfig.nightShiftClockOut : siteConfig.dayShiftClockOut
    const effectiveClockIn = clockIn || defaultIn
    const effectiveClockOut = clockOut || defaultOut

    const dayKey = classifyOvertimePolicyDay({
      schedule,
      dayIndex: day - 1,
      isHoliday: isHoliday(period, day, holidays),
      rosterType: siteConfig.rosterType,
    })
    const activeConfig = {
      ...siteConfig.overtimeConfig,
      enabled: true,
    }
    const calculated = calculateOvertime({
      config: activeConfig,
      dayKey,
      shiftCode,
      workDate: `${period}-${String(day).padStart(2, '0')}`,
      clockIn: effectiveClockIn,
      clockOut: effectiveClockOut,
      splWindows: approvedSplByEmployee.get(employeeId) ?? [],
      legacyHours: calculateLegacyOvertime(schedule, day, effectiveClockIn, effectiveClockOut),
    })
    return { ...calculated, totalHours: roundOvertimeHours(calculated.totalHours) }
  }

  function getAllowanceEligibility(row: (typeof rows)[number], day: number) {
    const scheduleCode = row.schedule[day - 1] as string
    const attendanceStatus = getAttendanceCell(row.employee.id, day).status
    const isFieldBreakDay =
      scheduleCode === 'FB' ||
      attendanceStatus === 'field_break' ||
      (fieldBreakDaysByEmployee.get(row.employee.id)?.has(day) ?? false)
    return {
      eligibleMsa: isMsaEligibleDay(scheduleCode, isFieldBreakDay),
      eligibleMeals: isMealsEligibleScheduleCode(scheduleCode, isFieldBreakDay),
    }
  }

  function getAllowanceAmounts(row: (typeof rows)[number], day: number) {
    const staff = isStaffRole(row.employee.role)
    const rule = getEmployeeBenefitRule(siteConfig.employeeBenefitConfig, {
      manpower: row.employee.manpower,
      pointOfHire: row.employee.pointOfHire,
      workLocations: [
        row.employee.workLocation,
        row.employee.siteLocation,
        row.employee.locationName,
      ],
    })
    const eligibility = getAllowanceEligibility(row, day)
    // ponytail: a period is at most 31 days; precompute only if longer payroll periods are added.
    const firstEligibleDay = days.find(
      (candidate) => getAllowanceEligibility(row, candidate).eligibleMsa
    )
    const msaAmount =
      !rule.msa || !eligibility.eligibleMsa || siteConfig.msaType === 'none'
        ? 0
        : siteConfig.msaType === 'same-all'
          ? rate.msaNonStaff
          : staff
            ? rate.msaStaff
            : rate.msaNonStaff
    const mealsAmount =
      siteConfig.mealsType === 'none' || !rule.meals || !eligibility.eligibleMeals
        ? 0
        : staff
          ? rate.mealsStaff
          : rate.mealsNonStaff
    const specialAllowanceAmount = getSpecialAllowanceAmount(
      rule,
      eligibility.eligibleMsa,
      day === firstEligibleDay
    )
    return { ...eligibility, rule, msaAmount, mealsAmount, specialAllowanceAmount }
  }

  const payrollRows =
    mode === 'payroll'
      ? rows.map((row) => {
          const staff = isStaffRole(row.employee.role)
          let msaDays = 0
          let mealsDays = 0
          let msa = 0
          let meals = 0
          let specialAllowance = 0
          let overtime = 0
          for (const day of days) {
            const cell = getAttendanceCell(row.employee.id, day)
            const present = cell.status === 'present'
            const allowance = getAllowanceAmounts(row, day)
            if (allowance.rule.msa && allowance.eligibleMsa) msaDays += 1
            if (allowance.rule.meals && allowance.eligibleMeals) mealsDays += 1
            msa += allowance.msaAmount
            meals += allowance.mealsAmount
            specialAllowance += allowance.specialAllowanceAmount
            if (present)
              overtime += calculateDayOvertime(
                row.schedule,
                day,
                cell.clockIn,
                cell.clockOut,
                staff,
                row.employee.id
              ).totalHours
          }
          return {
            ...row,
            msaDays,
            msa,
            meals,
            specialAllowance,
            overtime: roundOvertimeHours(overtime),
          }
        })
      : rows

  const attendanceOvertimeRows =
    mode === 'payroll'
      ? payrollRows.map((row) => {
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
            attendanceOvertime: row.overtime,
          }
        })
      : []
  const groupedPayrollRows = [...payrollRows].sort(
    (left, right) =>
      sectionOptions.indexOf(left.rosterSection) - sectionOptions.indexOf(right.rosterSection) ||
      left.employee.name.localeCompare(right.employee.name)
  )
  const groupedAttendanceOvertimeRows = [...attendanceOvertimeRows].sort(
    (left, right) =>
      sectionOptions.indexOf(left.rosterSection) - sectionOptions.indexOf(right.rosterSection) ||
      left.employee.name.localeCompare(right.employee.name)
  )

  function buildPayrollSnapshot() {
    let totalMsa = 0
    let totalMeals = 0
    let totalTlk = 0
    let totalOvertimeHours = 0
    const items = payrollRows.flatMap((row) => {
      const staff = isStaffRole(row.employee.role)
      return days.map((day) => {
        const cell = getAttendanceCell(row.employee.id, day)
        const scheduleCode = row.schedule[day - 1] as string
        const allowance = getAllowanceAmounts(row, day)
        const msaAmount = allowance.msaAmount
        const mealsAmount = allowance.mealsAmount
        const tlkAmount = allowance.specialAllowanceAmount
        const overtimeHours =
          cell.status === 'present'
            ? calculateDayOvertime(
                row.schedule,
                day,
                cell.clockIn,
                cell.clockOut,
                staff,
                row.employee.id
              ).totalHours
            : 0

        totalMsa += msaAmount
        totalMeals += mealsAmount
        totalTlk += tlkAmount
        totalOvertimeHours += overtimeHours

        return {
          employeeId: row.employee.id,
          day,
          scheduleCode,
          attendanceStatus: cell.status,
          clockIn: cell.clockIn,
          clockOut: cell.clockOut,
          msaAmount,
          mealsAmount,
          tlkAmount,
          overtimeHours,
          source: cell.source ?? 'attendance',
          notes: cell.note,
        }
      })
    })

    return {
      employeeCount: payrollRows.length,
      totalMsa,
      totalMeals,
      totalTlk,
      totalOvertimeHours: roundOvertimeHours(totalOvertimeHours),
      items,
    }
  }

  function savePayrollSnapshot() {
    const numericSiteId = Number(siteId)
    if (!Number.isFinite(numericSiteId) || numericSiteId <= 0 || rows.length === 0) return
    if (!guardOpenPeriod('Generate payroll')) return
    const snapshot = buildPayrollSnapshot()
    startSavingPayroll(async () => {
      try {
        await saveTimesheetPayrollSnapshotAction({
          siteId: numericSiteId,
          period,
          ...snapshot,
          metadata: {
            rateProject: rate.project,
            attendancePrecedence: 'attendance-wins',
            rosterType: siteConfig.rosterType,
          },
        })
        toast.success('Payroll snapshot tersimpan')
      } catch (error) {
        toast.error('Generate payroll gagal', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    })
  }

  const fieldBreakTimelineDays = useMemo(
    () => getFieldBreakTimelineDays(period, fieldBreakTimelineView),
    [period, fieldBreakTimelineView]
  )

  return (
    <div className="space-y-4">
      {isFinalized && (mode !== 'payroll' || payrollWorkspaceOpen) ? (
        <div className="flex items-center gap-2.5 rounded-[0.9rem] bg-slate-900 px-4 py-3 text-sm font-medium text-white">
          <Lock className="size-4 shrink-0" />
          <span>
            Periode ini sudah di-finalize. Klik <strong>Reopen</strong> untuk membuka kembali
            sebelum mengedit.
          </span>
        </div>
      ) : null}
      {isSubmittedToHr && (mode !== 'payroll' || payrollWorkspaceOpen) ? (
        <div className="flex items-center gap-2.5 rounded-[0.9rem] bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 ring-1 ring-amber-200">
          <Clock3 className="size-4 shrink-0" />
          Periode sedang direview HR. Editing dikunci sampai HR approve atau return.
        </div>
      ) : null}
      {!(
        ['setup', 'schedule', 'field-break', 'attendance', 'payroll'] as SchedulingTimesheetMode[]
      ).includes(mode) ? (
        <Card className="surface-module-card rounded-[1rem] border-0 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="bg-surface-container-low text-primary grid size-9 place-items-center rounded-xl">
                <CalendarDays className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="font-display text-foreground text-base font-semibold">
                  {mode === 'overview' && 'Ringkasan Site'}
                  {mode === 'schedule' && 'Parameter Jadwal'}
                  {mode === 'attendance' && 'Attendance'}
                  {mode === 'field-break' && 'Field Break'}
                  {mode === 'payroll' && 'MSA + Overtime'}
                </p>
                <p className="text-muted-foreground text-xs">
                  Pilih site dan periode untuk melihat data.
                </p>
              </div>
            </div>
            {currentStatus ? (
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {savedPlan?.sourceVersion ? (
                  <span className="bg-surface-container-low text-muted-foreground ring-border/40 inline-flex items-center rounded-full px-2.5 py-1 font-medium ring-1">
                    Source: Schedule {savedPlan.sourceVersion.toUpperCase()}
                  </span>
                ) : null}
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
                  ...sites.map((item) => ({
                    value: String(item.id),
                    label: item.name,
                  })),
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
            {mode !== 'field-break' ? (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Tipe Site
                </Label>
                <NativeSelect
                  value={siteConfig.scheduleType}
                  onValueChange={(value) =>
                    updateSiteConfig('scheduleType', value as SiteScheduleType)
                  }
                  options={[
                    { value: 'office', label: 'Non Shift' },
                    { value: 'shift', label: 'Shift DS / NS' },
                    { value: 'hybrid', label: 'Hybrid (Staff: Office, Non Staff: Shift)' },
                  ]}
                />
              </div>
            ) : null}
            {mode !== 'field-break' ? (
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
                    { value: '13:1', label: 'Roster 13 : 1' },
                    { value: 'vale', label: 'Vale Sorowako' },
                  ]}
                />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-2 lg:pt-0">
              {isFinalized ? (
                <Button
                  variant="outline"
                  disabled={isSavingSchedule}
                  onClick={() => setReopenDialogOpen(true)}
                >
                  Reopen
                </Button>
              ) : isSubmittedToHr ? (
                <Button variant="outline" disabled>
                  Menunggu HR
                </Button>
              ) : (
                <Button
                  variant="outline"
                  disabled={siteId === 'all' || isSavingSchedule}
                  onClick={() => setFinalizeDialogOpen(true)}
                >
                  Submit ke HR
                </Button>
              )}
            </div>
          </div>
        </Card>
      ) : null}

      {mode === 'schedule' ? (
        <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
          <div className="border-border/40 bg-surface-container-low border-b px-4 py-3">
            <p className="font-display text-foreground text-base font-semibold">
              List Setting Roster per Site
            </p>
            <p className="text-muted-foreground text-xs">
              Lihat site yang sudah punya roster bulan ini tanpa filter satu-satu.
            </p>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="bg-surface-container-low text-muted-foreground text-left text-[11px] tracking-[0.12em] uppercase">
                  <th className="px-4 py-3 font-medium">Site</th>
                  <th className="px-4 py-3 font-medium">Karyawan</th>
                  <th className="px-4 py-3 font-medium">Tipe</th>
                  <th className="px-4 py-3 font-medium">Roster</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Updated</th>
                  <th className="px-4 py-3 text-right font-medium">
                    <Settings2 className="ml-auto size-4" aria-label="Aksi" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {siteSettingRows.map((row) => {
                  const rowHistory = scheduleHistoryRows.filter(
                    (history) => history.siteId === row.site.id
                  )
                  const isHistoryOpen = openScheduleHistorySiteId === row.site.id

                  return (
                    <React.Fragment key={`roster-setting-${row.site.id}`}>
                      <tr className="border-border/30 hover:bg-surface-container-low/40 border-t transition">
                        <td className="px-4 py-3 font-semibold">{row.site.name}</td>
                        <td className="px-4 py-3">{row.employeeCount}</td>
                        <td className="px-4 py-3">{scheduleTypeLabel(row.scheduleType)}</td>
                        <td className="px-4 py-3">{row.rosterType}</td>
                        <td className="px-4 py-3">
                          <Badge variant={row.rosterConfigured ? 'default' : 'secondary'}>
                            {row.rosterConfigured ? 'Sudah setting' : 'Belum setting'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {row.rosterUpdatedAt
                            ? new Date(row.rosterUpdatedAt).toLocaleString('id-ID')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              title={`History roster ${row.site.name}`}
                              aria-label={`History roster ${row.site.name}`}
                              onClick={() =>
                                setOpenScheduleHistorySiteId(isHistoryOpen ? null : row.site.id)
                              }
                            >
                              <History className="size-4" />
                              <span className="sr-only">History</span>
                              <span className="text-[11px] font-semibold">{rowHistory.length}</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              title={`${row.rosterConfigured ? 'Atur' : 'Tambah'} setting roster ${row.site.name}`}
                              aria-label={`${row.rosterConfigured ? 'Atur' : 'Tambah'} setting roster ${row.site.name}`}
                              onClick={() => {
                                const nextSiteId = String(row.site.id)
                                setSiteId(nextSiteId)
                                setSiteConfigs((current) => ({
                                  ...current,
                                  [nextSiteId]: {
                                    ...(current[nextSiteId] ?? defaultSiteConfig),
                                    scheduleType: row.scheduleType as SiteScheduleType,
                                    rosterType: row.rosterType as SiteRosterType,
                                  },
                                }))
                                setRoster(row.rosterType)
                                setSiteScheduleTypes((current) => ({
                                  ...current,
                                  [nextSiteId]: row.scheduleType as SiteScheduleType,
                                }))
                                setSelectedCell(null)
                                setSelectedPermanentCell(null)
                                setRosterDialogOpen(true)
                              }}
                            >
                              <Settings2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isHistoryOpen ? (
                        <tr className="border-border/30 bg-surface-container-low/40 border-t">
                          <td colSpan={7} className="p-0">
                            <div className="px-4 py-3">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-display text-foreground text-sm font-semibold">
                                    History Roster Bulanan - {row.site.name}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    Semua roster tersimpan untuk site ini.
                                  </p>
                                </div>
                                <Badge variant="outline">{rowHistory.length} history</Badge>
                              </div>
                              <div className="overflow-auto rounded-xl bg-white">
                                <table className="w-full min-w-[820px] text-sm">
                                  <thead>
                                    <tr className="bg-surface-container-low text-muted-foreground text-left text-[11px] tracking-[0.12em] uppercase">
                                      <th className="px-4 py-3 font-medium">Periode</th>
                                      <th className="px-4 py-3 font-medium">Karyawan</th>
                                      <th className="px-4 py-3 font-medium">Tipe</th>
                                      <th className="px-4 py-3 font-medium">Roster</th>
                                      <th className="px-4 py-3 font-medium">Updated</th>
                                      <th className="px-4 py-3 text-right font-medium">Aksi</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rowHistory.map((history) => (
                                      <tr
                                        key={`schedule-history-${history.siteId}-${history.period}`}
                                        className="border-border/30 border-t"
                                      >
                                        <td className="px-4 py-3 font-semibold">
                                          {history.period}
                                        </td>
                                        <td className="px-4 py-3">{history.employeeCount}</td>
                                        <td className="px-4 py-3">
                                          {scheduleTypeLabel(history.scheduleType)}
                                        </td>
                                        <td className="px-4 py-3">{history.rosterType}</td>
                                        <td className="px-4 py-3">
                                          {history.updatedAt
                                            ? new Date(history.updatedAt).toLocaleString('id-ID')
                                            : '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="flex justify-end gap-2">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() =>
                                                openScheduleHistory(history.siteId, history.period)
                                              }
                                            >
                                              Lihat / Edit
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              disabled={isDeletingScheduleHistory}
                                              onClick={() =>
                                                setDeleteScheduleHistoryTarget({
                                                  siteId: history.siteId,
                                                  period: history.period,
                                                  siteName: history.siteName,
                                                })
                                              }
                                            >
                                              <Trash2 className="mr-2 size-4" />
                                              Hapus
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                    {rowHistory.length === 0 ? (
                                      <tr>
                                        <td
                                          colSpan={6}
                                          className="text-muted-foreground px-4 py-6 text-center text-sm"
                                        >
                                          Belum ada history roster untuk site ini.
                                        </td>
                                      </tr>
                                    ) : null}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {mode === 'payroll' && !payrollWorkspaceOpen ? (
        <MinimalTableShell
          label="Payroll Timesheet"
          title="Payroll Timesheet"
          description="Daftar payroll berdasarkan site dan bulan yang tersedia di Attendance."
          searchPlaceholder="Cari site atau bulan..."
          showImport={false}
          dateFilter={false}
          filters={
            <>
              <select
                data-table-filter-key="year"
                className="border-border/70 h-9 rounded-lg border bg-white px-3 text-sm"
                aria-label="Filter tahun payroll"
              >
                <option value="">Semua tahun</option>
                {payrollHistoryYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                data-table-filter-key="month"
                className="border-border/70 h-9 rounded-lg border bg-white px-3 text-sm"
                aria-label="Filter bulan payroll"
              >
                <option value="">Semua bulan</option>
                {payrollHistoryMonths.map((month) => (
                  <option key={month} value={month}>
                    {new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(
                      new Date(2000, Number(month) - 1, 1)
                    )}
                  </option>
                ))}
              </select>
            </>
          }
        >
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="bg-surface-container-low text-muted-foreground text-left text-[11px] tracking-[0.12em] uppercase">
                <TableHead className="px-4 py-3 font-medium">Site</TableHead>
                <TableHead className="px-4 py-3 font-medium">History Bulan</TableHead>
                <TableHead className="px-4 py-3 font-medium">Attendance</TableHead>
                <TableHead className="px-4 py-3 font-medium">Periode Terbaru</TableHead>
                <TableHead className="px-4 py-3 text-right font-medium">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollHistorySiteRows.map((siteRow) => {
                const latest = siteRow.history[0]
                const savedCount = siteRow.history.filter(
                  ({ status }) => status?.attendanceStatus === 'saved'
                ).length
                const isOpen = openPayrollHistorySiteId === siteRow.siteId
                const years = [
                  ...new Set(siteRow.history.map(({ plan }) => plan.period.slice(0, 4))),
                ]
                const months = [
                  ...new Set(siteRow.history.map(({ plan }) => plan.period.slice(5, 7))),
                ]
                return (
                  <React.Fragment key={`payroll-site-${siteRow.siteId}`}>
                    <TableRow
                      data-filter-year={years.join('|')}
                      data-filter-month={months.join('|')}
                      className="border-border/30 hover:bg-surface-container-low/40 border-t transition"
                    >
                      <TableCell className="px-4 py-3 font-semibold">{siteRow.siteName}</TableCell>
                      <TableCell className="px-4 py-3">{siteRow.history.length} bulan</TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant={savedCount ? 'default' : 'secondary'}>
                          {savedCount}/{siteRow.history.length} tersimpan
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 tabular-nums">
                        {latest ? formatMonthPeriod(latest.plan.period) : '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setOpenPayrollHistorySiteId(isOpen ? null : siteRow.siteId)
                          }
                          aria-expanded={isOpen}
                          aria-label={`History payroll ${siteRow.siteName}`}
                          title={`History payroll ${siteRow.siteName}`}
                        >
                          <History className="size-4" />
                          <span className="text-xs">{siteRow.history.length}</span>
                          <ChevronRight
                            className={cn('size-4 transition-transform', isOpen && 'rotate-90')}
                          />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isOpen ? (
                      <TableRow data-table-detail-row="true">
                        <TableCell colSpan={5} className="bg-surface-container-low/40 px-4 py-3">
                          <div className="overflow-hidden rounded-lg border bg-white">
                            <div className="text-muted-foreground bg-surface-container-low grid grid-cols-[1fr_140px_160px_48px] gap-3 px-3 py-2 text-[11px] font-semibold tracking-[0.1em] uppercase">
                              <span>Bulan</span>
                              <span>Attendance</span>
                              <span>Terakhir diubah</span>
                              <span className="text-right">Aksi</span>
                            </div>
                            {siteRow.history.map(({ plan, status }) => (
                              <div
                                key={`payroll-history-${plan.siteId}-${plan.period}`}
                                className="border-border/40 grid grid-cols-[1fr_140px_160px_48px] items-center gap-3 border-t px-3 py-2.5"
                              >
                                <span className="font-medium">
                                  {formatMonthPeriod(plan.period)}
                                </span>
                                <Badge
                                  variant={
                                    status?.attendanceStatus === 'saved' ? 'default' : 'secondary'
                                  }
                                  className="w-fit"
                                >
                                  {status?.attendanceStatus === 'saved'
                                    ? 'Tersimpan'
                                    : 'Belum diisi'}
                                </Badge>
                                <span className="text-muted-foreground text-xs">
                                  {status?.lastSavedAt
                                    ? new Date(status.lastSavedAt).toLocaleString('id-ID')
                                    : '-'}
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openPayrollWorkspace(plan.siteId, plan.period)}
                                  aria-label={`Lihat payroll ${siteRow.siteName} ${formatMonthPeriod(plan.period)}`}
                                  title="Lihat payroll"
                                >
                                  <Eye className="size-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </React.Fragment>
                )
              })}
              {!payrollHistorySiteRows.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground px-4 py-12 text-center">
                    Belum ada data Attendance untuk diproses ke payroll.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </MinimalTableShell>
      ) : null}

      {mode === 'payroll' && payrollWorkspaceOpen ? (
        <div className="flex min-h-10 items-center gap-2 px-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setPayrollWorkspaceOpen(false)}
            aria-label="Kembali ke list payroll"
            title="Kembali ke list payroll"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <p className="text-foreground min-w-0 truncate text-sm font-semibold">
            {site?.name ?? 'Site'} <span className="text-muted-foreground font-normal">/</span>{' '}
            {formatMonthPeriod(period)}
          </p>
          <span className="text-muted-foreground ml-auto hidden text-xs sm:inline">
            Schedule V2 + Attendance
          </span>
        </div>
      ) : null}

      {mode === 'payroll' && payrollWorkspaceOpen ? (
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: 'Karyawan', value: rows.length, Icon: CalendarDays },
            {
              label: 'Total jam schedule',
              value: payrollRows.reduce((sum, row) => sum + row.totalHours, 0),
              Icon: Clock3,
            },
            {
              label: 'Estimasi Benefit',
              value: money(
                payrollRows.reduce(
                  (sum, row) => sum + row.msa + row.meals + row.specialAllowance,
                  0
                )
              ),
              Icon: Calculator,
            },
            { label: 'Backup list', value: backupAssignments.length, Icon: Settings2 },
          ].map(({ label, value, Icon }) => (
            <Card key={label} className="surface-muted-card rounded-[1rem] border-0 p-4">
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

      {mode === 'field-break' ? (
        <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
          <div className="border-border/40 bg-surface-container-low border-b px-4 py-3">
            <p className="font-display text-foreground text-base font-semibold">
              List Setting Field Break per Site
            </p>
            <p className="text-muted-foreground text-xs">
              Lihat site yang sudah punya schedule break bulan ini tanpa filter satu-satu.
            </p>
          </div>
          <div className="overflow-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="bg-surface-container-low text-muted-foreground text-left text-[11px] tracking-[0.12em] uppercase">
                  <th className="px-4 py-3 font-medium">Site</th>
                  <th className="px-4 py-3 font-medium">Karyawan</th>
                  <th className="px-4 py-3 font-medium">FB Tersetting</th>
                  <th className="px-4 py-3 font-medium">Locked</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Config</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {siteSettingRows.map((row) => {
                  const rowHistory = fieldBreakPlans
                    .filter((plan) => plan.siteId === row.site.id)
                    .sort((left, right) => {
                      const periodCompare = right.period.localeCompare(left.period)
                      if (periodCompare) return periodCompare
                      return left.employeeName.localeCompare(right.employeeName)
                    })
                  const isHistoryOpen = openFieldBreakHistorySiteId === row.site.id

                  return (
                    <React.Fragment key={`field-break-setting-${row.site.id}`}>
                      <tr className="border-border/30 hover:bg-surface-container-low/40 border-t transition">
                        <td className="px-4 py-3 font-semibold">{row.site.name}</td>
                        <td className="px-4 py-3">{row.employeeCount}</td>
                        <td className="px-4 py-3">{row.fieldBreakCount}</td>
                        <td className="px-4 py-3">{row.fieldBreakLockedCount}</td>
                        <td className="px-4 py-3">
                          <Badge variant={row.fieldBreakConfigured ? 'default' : 'secondary'}>
                            {row.fieldBreakConfigured ? 'Sudah setting' : 'Belum setting'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{row.hasConfig ? 'Ada' : '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              title={`History field break ${row.site.name}`}
                              aria-label={`History field break ${row.site.name}`}
                              onClick={() =>
                                setOpenFieldBreakHistorySiteId(isHistoryOpen ? null : row.site.id)
                              }
                            >
                              <History className="size-4" />
                              <span className="sr-only">History</span>
                              <span className="text-[11px] font-semibold">{rowHistory.length}</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              title={`${row.fieldBreakConfigured ? 'Atur' : 'Tambah'} field break ${row.site.name}`}
                              aria-label={`${row.fieldBreakConfigured ? 'Atur' : 'Tambah'} field break ${row.site.name}`}
                              onClick={() => {
                                setSiteId(String(row.site.id))
                                setFieldBreakSiteId(String(row.site.id))
                                setFieldBreakDialogOpen(true)
                              }}
                            >
                              <Settings2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {isHistoryOpen ? (
                        <tr className="border-border/30 bg-surface-container-low/40 border-t">
                          <td colSpan={7} className="p-0">
                            <div className="px-4 py-3">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-display text-foreground text-sm font-semibold">
                                    History Field Break - {row.site.name}
                                  </p>
                                  <p className="text-muted-foreground text-xs">
                                    Riwayat bulanan siapa saja yang libur field break.
                                  </p>
                                </div>
                                <Badge variant="outline">{rowHistory.length} record</Badge>
                              </div>
                              <div className="overflow-auto rounded-xl bg-white">
                                <table className="w-full min-w-[900px] text-sm">
                                  <thead>
                                    <tr className="bg-surface-container-low text-muted-foreground text-left text-[11px] tracking-[0.12em] uppercase">
                                      <th className="px-4 py-3 font-medium">Periode</th>
                                      <th className="px-4 py-3 font-medium">Nama</th>
                                      <th className="px-4 py-3 font-medium">Section</th>
                                      <th className="px-4 py-3 font-medium">Mulai Libur</th>
                                      <th className="px-4 py-3 font-medium">Selesai</th>
                                      <th className="px-4 py-3 font-medium">Locked</th>
                                      <th className="px-4 py-3 font-medium">Updated</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rowHistory.map((history) => (
                                      <tr
                                        key={`field-break-history-${history.siteId}-${history.period}-${history.employeeId}`}
                                        className="border-border/30 border-t"
                                      >
                                        <td className="px-4 py-3 font-semibold">
                                          {history.period}
                                        </td>
                                        <td className="px-4 py-3">{history.employeeName}</td>
                                        <td className="px-4 py-3">
                                          {history.sectionName || history.rosterSection || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                          {history.fieldBreakDate || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                          {history.fieldBreakEndDate || '-'}
                                        </td>
                                        <td className="px-4 py-3">
                                          {history.isLocked ? 'Ya' : 'Tidak'}
                                        </td>
                                        <td className="px-4 py-3">
                                          {history.updatedAt
                                            ? new Date(history.updatedAt).toLocaleString('id-ID')
                                            : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                    {rowHistory.length === 0 ? (
                                      <tr>
                                        <td
                                          colSpan={7}
                                          className="text-muted-foreground px-4 py-6 text-center text-sm"
                                        >
                                          Belum ada history field break untuk site ini.
                                        </td>
                                      </tr>
                                    ) : null}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {backupAssignments.length > 0 && mode === 'schedule' && rosterDialogOpen ? (
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
          <Dialog open={siteConfigDialogOpen} onOpenChange={setSiteConfigDialogOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[1120px]">
              <DialogHeader>
                <DialogTitle>
                  Konfigurasi Site
                  {selectedSite ? ` - ${selectedSite.name}` : ''}
                </DialogTitle>
              </DialogHeader>
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
                  <Button
                    size="sm"
                    disabled={siteId === 'all' || isFinalized}
                    onClick={() => {
                      saveSiteConfig()
                      setSiteConfigDialogOpen(false)
                    }}
                  >
                    <Save className="mr-2 size-4" /> Simpan Setting
                  </Button>
                </div>
                <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4">
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
                        { value: 'office', label: 'Non Shift' },
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
                      onValueChange={(value) =>
                        updateSiteConfig('rosterType', value as SiteRosterType)
                      }
                      options={[
                        { value: '5:2', label: 'Roster 5 : 2' },
                        { value: '6:1', label: 'Roster 6 : 1' },
                        { value: '13:1', label: 'Roster 13 : 1' },
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
                <div className="border-border/30 border-t px-4 py-4">
                  <div className="mb-4">
                    <p className="font-display text-foreground text-sm font-semibold">
                      Approval Daily Activity, Overtime/SPL &amp; Request Barang/APD
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Satu urutan approver per Section. Simpan Setting menyinkronkan ketiga workflow
                      ke Approval Engine.
                    </p>
                  </div>
                  {siteApprovalSections.length > 0 ? (
                    <div className="border-border/40 overflow-x-auto rounded-xl border">
                      <div className="min-w-[920px]">
                        <div className="bg-surface-container-low text-muted-foreground grid grid-cols-[minmax(180px,1fr)_minmax(210px,1fr)_minmax(210px,1fr)_minmax(210px,1fr)] gap-3 px-4 py-2 text-[11px] font-semibold tracking-wide uppercase">
                          <span>Section</span>
                          <span>PJO Leader</span>
                          <span>Section Head</span>
                          <span>Dept Head</span>
                        </div>
                        <div className="divide-border/40 divide-y">
                          {siteApprovalSections.map((row) => (
                            <div
                              key={row.id}
                              className="grid grid-cols-[minmax(180px,1fr)_minmax(210px,1fr)_minmax(210px,1fr)_minmax(210px,1fr)] items-center gap-3 px-4 py-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{row.sectionName}</p>
                                <p className="text-muted-foreground truncate text-xs">
                                  {row.departmentName}
                                </p>
                                <Badge
                                  className="mt-1"
                                  variant={row.matrixId ? 'secondary' : 'outline'}
                                >
                                  {row.matrixName || 'Belum sync'}
                                </Badge>
                              </div>
                              {(
                                [
                                  [
                                    'pjoLeaderId',
                                    approvalEmployeeChoices,
                                    'PJO Leader',
                                    row.pjoLeaderId,
                                    row.pjoLeaderName,
                                  ],
                                  [
                                    'sectionHeadId',
                                    approvalEmployeeChoices,
                                    'Section Head',
                                    row.sectionHeadId,
                                    row.sectionHeadName,
                                  ],
                                  [
                                    'departmentHeadId',
                                    approvalEmployeeChoices,
                                    'Dept Head',
                                    row.departmentHeadId,
                                    row.departmentHeadName,
                                  ],
                                ] as const
                              ).map(([key, candidates, label, masterId, masterName]) => (
                                <SearchableSelect
                                  key={key}
                                  label={`${label} ${row.sectionName}`}
                                  value={String(approvalApprovers[row.id]?.[key] ?? '')}
                                  onValueChange={(value) =>
                                    updateApprovalApprover(
                                      row.id,
                                      key,
                                      value ? Number(value) : null
                                    )
                                  }
                                  options={approvalEmployeeOptions(
                                    candidates,
                                    masterId,
                                    masterName
                                  )}
                                  placeholder="Belum dipilih"
                                  widthClassName="w-full min-w-0"
                                />
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-surface-container-low text-muted-foreground rounded-xl px-4 py-5 text-sm">
                      Belum ada Section dengan anggota aktif pada site ini.
                    </div>
                  )}
                </div>
                <div className="border-border/30 border-t px-4 py-4">
                  <div className="mb-3">
                    <p className="text-foreground text-sm font-semibold">Working Time</p>
                    <p className="text-muted-foreground text-xs">
                      Dipakai mobile attendance dan PDF Overtime. Jam berikut berlaku untuk{' '}
                      <span className="font-semibold">Regular Day</span>.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                        Jam Masuk Day Shift (DS / IN)
                      </Label>
                      <Input
                        type="time"
                        value={siteConfig.dayShiftClockIn}
                        onChange={(event) => {
                          if (event.target.value)
                            updateSiteConfig('dayShiftClockIn', event.target.value)
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                        Jam Pulang Day Shift (DS / IN)
                      </Label>
                      <Input
                        type="time"
                        value={siteConfig.dayShiftClockOut}
                        onChange={(event) => {
                          if (event.target.value)
                            updateSiteConfig('dayShiftClockOut', event.target.value)
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                        Jam Masuk Night Shift (NS)
                      </Label>
                      <Input
                        type="time"
                        value={siteConfig.nightShiftClockIn}
                        onChange={(event) => {
                          if (event.target.value)
                            updateSiteConfig('nightShiftClockIn', event.target.value)
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                        Jam Pulang Night Shift (NS)
                      </Label>
                      <Input
                        type="time"
                        value={siteConfig.nightShiftClockOut}
                        onChange={(event) => {
                          if (event.target.value)
                            updateSiteConfig('nightShiftClockOut', event.target.value)
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="border-border/30 border-t px-4 py-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-foreground text-sm font-semibold">Working Time Day 6</p>
                      <p className="text-muted-foreground text-xs">
                        Dipakai pada hari kerja tepat sebelum OFF/Libur.
                      </p>
                    </div>
                    <label className="text-muted-foreground flex items-center gap-2 text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={siteConfig.day6WorkingTimeEnabled}
                        onChange={(event) =>
                          updateSiteConfig('day6WorkingTimeEnabled', event.target.checked)
                        }
                      />
                      Aktifkan
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(
                      [
                        ['day6DayShiftClockIn', 'Jam Masuk Day Shift (DS / IN)', '08:00'],
                        ['day6DayShiftClockOut', 'Jam Pulang Day Shift (DS / IN)', '14:00'],
                        ['day6NightShiftClockIn', 'Jam Masuk Night Shift (NS)', '20:00'],
                        ['day6NightShiftClockOut', 'Jam Pulang Night Shift (NS)', '02:00'],
                      ] as const
                    ).map(([key, label, fallback]) => (
                      <div className="space-y-1.5" key={key}>
                        <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                          {label}
                        </Label>
                        <Input
                          type="time"
                          value={siteConfig[key] || fallback}
                          onChange={(event) => {
                            if (event.target.value) updateSiteConfig(key, event.target.value)
                          }}
                          disabled={!siteConfig.day6WorkingTimeEnabled}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {siteConfig.rosterType === '13:1' ? (
                  <div className="border-border/30 border-t px-4 py-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-foreground text-sm font-semibold">Working Time Day 7</p>
                        <p className="text-muted-foreground text-xs">
                          Dipakai khusus pada hari kerja ke-7 (Roster 13:1).
                        </p>
                      </div>
                      <label className="text-muted-foreground flex items-center gap-2 text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={siteConfig.day7WorkingTimeEnabled}
                          onChange={(event) =>
                            updateSiteConfig('day7WorkingTimeEnabled', event.target.checked)
                          }
                        />
                        Aktifkan
                      </label>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {(
                        [
                          ['day7DayShiftClockIn', 'Jam Masuk Day Shift (DS / IN)', '08:00'],
                          ['day7DayShiftClockOut', 'Jam Pulang Day Shift (DS / IN)', '14:00'],
                          ['day7NightShiftClockIn', 'Jam Masuk Night Shift (NS)', '20:00'],
                          ['day7NightShiftClockOut', 'Jam Pulang Night Shift (NS)', '02:00'],
                        ] as const
                      ).map(([key, label, fallback]) => (
                        <div className="space-y-1.5" key={key}>
                          <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                            {label}
                          </Label>
                          <Input
                            type="time"
                            value={siteConfig[key] || fallback}
                            onChange={(event) => {
                              if (event.target.value) updateSiteConfig(key, event.target.value)
                            }}
                            disabled={!siteConfig.day7WorkingTimeEnabled}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="border-border/30 grid gap-4 border-t px-4 py-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                      FB Masuk ({isThirteenOneRoster ? 'Minggu' : 'Bulan'})
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={siteConfig.fieldBreakWorkMonths}
                      onChange={(event) =>
                        updateSiteConfig(
                          'fieldBreakWorkMonths',
                          Number(event.target.value) || (isThirteenOneRoster ? 12 : 3)
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                      FB Libur ({isThirteenOneRoster ? 'Minggu' : 'Hari'})
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={siteConfig.fieldBreakBreakDays}
                      onChange={(event) =>
                        updateSiteConfig(
                          'fieldBreakBreakDays',
                          Number(event.target.value) || (isThirteenOneRoster ? 2 : 14)
                        )
                      }
                    />
                    {siteConfig.rosterType === '13:1' ? (
                      <p className="text-muted-foreground text-[11px]">
                        Field Break terpisah: 12 minggu masuk, 2 minggu Field Break.
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="border-border/30 border-t px-4 py-4">
                  <div className="mb-3">
                    <p className="font-display text-foreground text-sm font-semibold">
                      Aturan Tagihan Quotation
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Tentukan status attendance yang tetap masuk hitungan Labour Cost. Masuk dan
                      OFF selalu dihitung, sedangkan Field Break selalu dikecualikan.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {(
                      [
                        ['countEmpty', 'Kosong'],
                        ['countSick', 'Sakit'],
                        ['countLeave', 'Izin'],
                        ['countAbsent', 'Alfa'],
                      ] as const
                    ).map(([key, label]) => (
                      <div
                        key={key}
                        className="bg-surface-container-low flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 py-2"
                      >
                        <Label
                          htmlFor={`quotation-billing-${key}`}
                          className="text-sm font-semibold"
                        >
                          Hitung {label}
                        </Label>
                        <Switch
                          id={`quotation-billing-${key}`}
                          aria-label={`Hitung status ${label} untuk quotation`}
                          checked={siteConfig.quotationBillingConfig[key]}
                          onCheckedChange={(checked) => updateQuotationBillingRule(key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-border/30 border-t px-4 py-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-foreground text-sm font-semibold">
                        Overtime Wajib per Site
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Atur sesi jam OT otomatis untuk site ini. Jam di luar sesi wajib memiliki
                        SPL approved.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button size="sm" variant="outline" onClick={resetSiteOvertimeConfig}>
                        <RotateCcw className="mr-2 size-4" /> Reset Default
                      </Button>
                      <div className="bg-surface-container-low flex items-center gap-3 rounded-xl px-3 py-2">
                        <div>
                          <p className="text-xs font-semibold">Aktifkan Overtime Wajib</p>
                          <p className="text-muted-foreground text-[10px]">
                            {siteConfig.overtimeConfig.enabled ? 'Aktif' : 'Pakai kalkulasi lama'}
                          </p>
                        </div>
                        <Switch
                          aria-label="Aktifkan overtime wajib"
                          checked={siteConfig.overtimeConfig.enabled}
                          onCheckedChange={updateOvertimeEnabled}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="border-border/40 bg-background mb-4 rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Acuan Perhitungan Overtime</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Pilih acuan perhitungan overtime: mengikuti Template/Jam Wajib Roster atau
                          Jam Realtime (Aktual).
                        </p>
                      </div>
                      <div className="bg-surface-container-low flex items-center gap-1 rounded-xl p-1">
                        <button
                          type="button"
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                            (siteConfig.overtimeConfig.mode ?? 'template') === 'template'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                          onClick={() => updateOvertimeMode('template')}
                        >
                          Mengikuti Template (Wajib)
                        </button>
                        <button
                          type="button"
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                            siteConfig.overtimeConfig.mode === 'realtime'
                              ? 'bg-background text-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                          onClick={() => updateOvertimeMode('realtime')}
                        >
                          Realtime (Jam Aktual)
                        </button>
                      </div>
                    </div>
                    <p className="text-muted-foreground/80 mt-2.5 text-[11px] italic">
                      {(siteConfig.overtimeConfig.mode ?? 'template') === 'template'
                        ? '✓ Mengikuti Template: Overtime wajib sesuai konfigurasi template (misal 4 jam) otomatis diakui tanpa perlukan SPL. Hanya jika lembur MELEBIHI jam wajib baru memerlukan SPL.'
                        : '✓ Realtime: Memperhitungkan jam aktual clock in/out dan seluruh jam di luar shift normal memerlukan persetujuan SPL.'}
                    </p>
                  </div>
                  <div className="border-border/40 bg-background mb-4 rounded-xl border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Kebijakan SPL Site</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          Atur break, OFF, batas H+, minimum durasi, dan OFF pengganti.
                        </p>
                      </div>
                      <Switch
                        aria-label="Aktifkan pengajuan SPL"
                        checked={siteConfig.overtimeConfig.splPolicy.enabled}
                        onCheckedChange={(value) => updateSplPolicy('enabled', value)}
                      />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {(
                        [
                          ['allowBreak', 'Jam istirahat'],
                          ['allowOffDay', 'Hari OFF'],
                          ['allowAfterMandatoryOt', 'Setelah OT wajib'],
                        ] as const
                      ).map(([key, label]) => (
                        <label
                          key={key}
                          className="bg-surface-container-low flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold"
                        >
                          {label}
                          <Switch
                            aria-label={`Izinkan SPL ${label}`}
                            checked={siteConfig.overtimeConfig.splPolicy[key]}
                            onCheckedChange={(value) => updateSplPolicy(key, value)}
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {(
                        [
                          ['submissionGraceDays', 'Batas submit H+', 0, 14],
                          ['minimumMinutes', 'Minimum menit', 15, 720],
                          ['replacementOffMaxDays', 'Maks. OFF pengganti', 1, 90],
                        ] as const
                      ).map(([key, label, min, max]) => (
                        <Label key={key} className="space-y-1.5 text-xs font-semibold">
                          {label}
                          <Input
                            type="number"
                            min={min}
                            max={max}
                            value={siteConfig.overtimeConfig.splPolicy[key]}
                            onChange={(event) => updateSplPolicy(key, Number(event.target.value))}
                          />
                        </Label>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {(
                        [
                          ['dayShiftBreak', 'Break DS'],
                          ['nightShiftBreak', 'Break NS'],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="space-y-2">
                          <p className="text-xs font-semibold">{label}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {(['start', 'end'] as const).map((field) => (
                              <Input
                                key={field}
                                type="time"
                                aria-label={`${label} ${field}`}
                                value={siteConfig.overtimeConfig.splPolicy[key][field]}
                                onChange={(event) =>
                                  updateSplPolicy(key, {
                                    ...siteConfig.overtimeConfig.splPolicy[key],
                                    [field]: event.target.value,
                                  })
                                }
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-3">
                    {(
                      [
                        ['hariBiasa', 'Hari Biasa', 'OT sebelum dan sesudah jam kerja normal.'],
                        ['hariLibur', 'Hari Libur', 'Tanggal merah atau schedule OFF/Libur.'],
                        ['hariKe6', 'Hari ke-6', 'Hari kerja tepat sebelum schedule OFF/Libur.'],
                        ...(siteConfig.rosterType === '13:1'
                          ? [
                              [
                                'hariKe7',
                                'Hari ke-7',
                                'Hari kerja ke-7 dalam Roster 13:1.',
                              ] as const,
                            ]
                          : []),
                      ] as const
                    ).map(([dayKey, title, description]) => {
                      const rule = siteConfig.overtimeConfig[dayKey]
                      return (
                        <div
                          key={dayKey}
                          className="border-border/40 bg-background rounded-xl border p-4"
                        >
                          <div className="mb-4">
                            <p className="text-sm font-semibold">{title}</p>
                            <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
                          </div>
                          {(
                            [
                              ['dayShift', 'DS / IN'],
                              ['nightShift', 'NS'],
                            ] as const
                          ).map(([shiftKey, shiftLabel]) => (
                            <div key={shiftKey} className="mb-4 last:mb-0">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-semibold">{shiftLabel}</span>
                                <Badge variant="secondary">
                                  {overtimeRuleTotalHours(rule, shiftKey)} jam
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                {rule[shiftKey].map((interval, index) => (
                                  <div
                                    key={`${shiftKey}-${index}`}
                                    className="grid grid-cols-[1fr_auto_1fr] items-center gap-2"
                                  >
                                    <Input
                                      aria-label={`${title} ${shiftLabel} sesi ${index + 1} mulai`}
                                      type="time"
                                      value={interval.start}
                                      onChange={(event) =>
                                        updateOvertimeInterval(
                                          dayKey,
                                          shiftKey,
                                          index,
                                          'start',
                                          event.target.value
                                        )
                                      }
                                    />
                                    <span className="text-muted-foreground text-xs">s/d</span>
                                    <Input
                                      aria-label={`${title} ${shiftLabel} sesi ${index + 1} selesai`}
                                      type="time"
                                      value={interval.end}
                                      onChange={(event) =>
                                        updateOvertimeInterval(
                                          dayKey,
                                          shiftKey,
                                          index,
                                          'end',
                                          event.target.value
                                        )
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="border-border/30 border-t px-4 py-4">
                  <div className="mb-3">
                    <p className="font-display text-foreground text-sm font-semibold">
                      Benefit Lokal / Non Lokal
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Lokal/non-lokal ditentukan dari POH/Hire dibanding lokasi kerja di Central
                      Service &gt; Employee Data. Manpower dipakai sebagai fallback. Switch Meals
                      menentukan kategori penerima; nominal Staff/Non-Staff mengikuti tabel Setup
                      MSA / Meals.
                    </p>
                  </div>
                  <div className="border-border/40 overflow-x-auto rounded-xl border">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-surface-container-low text-muted-foreground text-left text-[10px] tracking-[0.12em] uppercase">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Kategori</th>
                          <th className="px-3 py-2 text-center font-semibold">MSA</th>
                          <th className="px-3 py-2 text-center font-semibold">Meals</th>
                          <th className="px-3 py-2 text-center font-semibold">Tunjangan Khusus</th>
                          <th className="px-3 py-2 font-semibold">Periode</th>
                          <th className="px-3 py-2 font-semibold">Nominal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          [
                            ['local', 'Karyawan Lokal'],
                            ['nonLocal', 'Karyawan Non Lokal'],
                          ] as const
                        ).map(([category, label]) => {
                          const rule = siteConfig.employeeBenefitConfig[category]
                          return (
                            <tr key={category} className="border-border/30 border-t">
                              <td className="px-3 py-3 font-semibold">{label}</td>
                              <td className="px-3 py-3 text-center">
                                <Switch
                                  aria-label={`Aktifkan MSA ${label}`}
                                  checked={rule.msa}
                                  onCheckedChange={(msa) =>
                                    updateEmployeeBenefitRule(category, { msa })
                                  }
                                />
                              </td>
                              <td className="px-3 py-3 text-center">
                                <Switch
                                  aria-label={`Aktifkan Meals ${label}`}
                                  checked={rule.meals}
                                  onCheckedChange={(meals) =>
                                    updateEmployeeBenefitRule(category, { meals })
                                  }
                                />
                              </td>
                              <td className="px-3 py-3 text-center">
                                <Switch
                                  aria-label={`Aktifkan tunjangan khusus ${label}`}
                                  checked={rule.specialAllowance}
                                  onCheckedChange={(specialAllowance) =>
                                    updateEmployeeBenefitRule(category, { specialAllowance })
                                  }
                                />
                              </td>
                              <td className="px-3 py-3">
                                <NativeSelect
                                  value={rule.specialAllowancePeriod}
                                  onValueChange={(specialAllowancePeriod) =>
                                    updateEmployeeBenefitRule(category, {
                                      specialAllowancePeriod:
                                        specialAllowancePeriod === 'monthly' ? 'monthly' : 'daily',
                                    })
                                  }
                                  options={[
                                    { value: 'daily', label: 'Harian' },
                                    { value: 'monthly', label: 'Bulanan' },
                                  ]}
                                />
                              </td>
                              <td className="px-3 py-3">
                                <Input
                                  aria-label={`Nominal tunjangan khusus ${label}`}
                                  type="number"
                                  min="0"
                                  step="1000"
                                  disabled={!rule.specialAllowance}
                                  value={rule.specialAllowanceAmount}
                                  onChange={(event) =>
                                    updateEmployeeBenefitRule(category, {
                                      specialAllowanceAmount: Math.max(
                                        0,
                                        Math.round(Number(event.target.value) || 0)
                                      ),
                                    })
                                  }
                                  className="h-9 min-w-[150px]"
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="border-border/30 border-t px-4 py-4">
                  <div className="mb-3">
                    <p className="font-display text-foreground text-sm font-semibold">
                      Konfigurasi PDF &amp; Tanda Tangan
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Daftar penandatangan dan logo customer muncul di PDF Overtime Record &amp;
                      Site Allowance.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                        Dibuat oleh
                      </Label>
                      <Input
                        value={siteConfig.pdfConfig.preparedBy}
                        onChange={(e) => updatePdfConfig('preparedBy', e.target.value)}
                        placeholder={currentEmployeeName}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                        PJO / Leader
                      </Label>
                      <SearchableSelect
                        label="PJO Leader"
                        value={
                          employees.find((e) => e.name === siteConfig.pdfConfig.pjoLeader)?.id
                            ? String(
                                employees.find((e) => e.name === siteConfig.pdfConfig.pjoLeader)!.id
                              )
                            : ''
                        }
                        onValueChange={(v) => {
                          const e = employees.find((x) => String(x.id) === v)
                          updatePdfConfig('pjoLeader', e?.name ?? '')
                        }}
                        options={employees.map((e) => ({ value: String(e.id), label: e.name }))}
                        placeholder="Cari PJO/Leader..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                        Approved by
                      </Label>
                      <Input
                        value={siteConfig.pdfConfig.approvedBy}
                        onChange={(e) => updatePdfConfig('approvedBy', e.target.value)}
                        placeholder={`Plant. SPV Department (${site?.name || 'Site'})`}
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-foreground text-xs font-semibold">
                        Penandatangan Tambahan
                      </p>
                      <Button size="sm" variant="outline" onClick={addCustomSigner}>
                        + Tambah TTD
                      </Button>
                    </div>
                    {siteConfig.pdfConfig.customSigners.length > 0 ? (
                      <div className="overflow-auto">
                        <table className="w-full min-w-[500px] text-sm">
                          <thead>
                            <tr className="bg-surface-container-low text-muted-foreground text-left text-[10px] tracking-[0.12em] uppercase">
                              <th className="px-3 py-2 font-medium">Label</th>
                              <th className="px-3 py-2 font-medium">Nama</th>
                              <th className="w-20 px-3 py-2 font-medium">Aksi</th>
                            </tr>
                          </thead>
                          <tbody>
                            {siteConfig.pdfConfig.customSigners.map((s, i) => (
                              <tr
                                key={`pdfsig-${i}`}
                                className="border-border/30 hover:bg-surface-container-low/40 border-b transition"
                              >
                                <td className="px-3 py-2">
                                  <Input
                                    value={s.label}
                                    onChange={(e) => updateCustomSigner(i, 'label', e.target.value)}
                                    placeholder="Misal: Mengetahui"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <Input
                                    value={s.name}
                                    onChange={(e) => updateCustomSigner(i, 'name', e.target.value)}
                                    placeholder="Ketik nama penandatangan"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => removeCustomSigner(i)}
                                  >
                                    <X className="size-3.5" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-4">
                    <p className="text-foreground mb-2 text-xs font-semibold">Logo Customer</p>
                    <p className="text-muted-foreground mb-3 text-xs">
                      Upload logo customer. Muncul di pojok kanan PDF. Format PNG/JPG, maks 2MB.
                    </p>
                    <div className="flex flex-wrap items-center gap-4">
                      <label className="bg-surface-container-low hover:bg-surface-container-high flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition">
                        <Upload className="size-4" /> Pilih Logo
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                      </label>
                      {siteConfig.pdfConfig.logoUrl ? (
                        <div className="relative inline-flex">
                          <img
                            src={siteConfig.pdfConfig.logoUrl}
                            alt="Customer Logo"
                            className="h-14 w-auto rounded-lg border object-contain"
                          />
                          <button
                            type="button"
                            className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-rose-600 text-white hover:bg-rose-700"
                            onClick={() => updatePdfConfig('logoUrl', '')}
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            </DialogContent>
          </Dialog>
        </section>
      ) : null}
      {mode === 'setup' ? (
        <section className="space-y-4">
          <div className="bg-surface-container-low inline-flex rounded-xl p-1">
            <Button
              size="sm"
              variant={setupVariableTab === 'roster' ? 'default' : 'ghost'}
              onClick={() => setSetupVariableTab('roster')}
            >
              Roster Config
            </Button>
            <Button
              size="sm"
              variant={setupVariableTab === 'allowance' ? 'default' : 'ghost'}
              onClick={() => setSetupVariableTab('allowance')}
            >
              MSA / Meals
            </Button>
            <Button
              size="sm"
              variant={setupVariableTab === 'overtime' ? 'default' : 'ghost'}
              onClick={() => setSetupVariableTab('overtime')}
            >
              Setup Overtime
            </Button>
          </div>

          {setupVariableTab === 'roster' ? (
            <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
              <div className="border-border/40 bg-surface-container-low flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                  <p className="font-display text-foreground text-base font-semibold">
                    List Konfigurasi Roster per Site
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Pilih site/lokasi, lalu atur konfigurasi di popup.
                  </p>
                </div>
                <Badge variant="outline">{siteSettingRows.length} site</Badge>
              </div>
              <div className="overflow-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="bg-surface-container-low text-muted-foreground text-left text-[11px] tracking-[0.12em] uppercase">
                      <th className="px-4 py-3 font-medium">Site</th>
                      <th className="px-4 py-3 font-medium">Lokasi</th>
                      <th className="px-4 py-3 font-medium">Karyawan</th>
                      <th className="px-4 py-3 font-medium">Tipe Shift</th>
                      <th className="px-4 py-3 font-medium">Roster</th>
                      <th className="px-4 py-3 font-medium">Status Config</th>
                      <th className="px-4 py-3 text-right font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteSettingRows.map((row) => (
                      <tr
                        key={`setup-config-${row.site.id}`}
                        className="border-border/30 hover:bg-surface-container-low/40 border-t transition"
                      >
                        <td className="px-4 py-3 font-semibold">{row.site.name}</td>
                        <td className="px-4 py-3">{row.site.location || '-'}</td>
                        <td className="px-4 py-3">{row.employeeCount}</td>
                        <td className="px-4 py-3">{scheduleTypeLabel(row.scheduleType)}</td>
                        <td className="px-4 py-3">{row.rosterType}</td>
                        <td className="px-4 py-3">
                          <Badge variant={row.hasConfig ? 'default' : 'secondary'}>
                            {row.hasConfig ? 'Sudah setting' : 'Belum setting'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSiteId(String(row.site.id))
                              setSiteConfigDialogOpen(true)
                            }}
                          >
                            {row.hasConfig ? 'Edit Config' : 'Tambah Config'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {setupVariableTab === 'allowance' ? (
            <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
              <div className="border-border/40 bg-surface-container-low flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                  <p className="font-display text-foreground text-base font-semibold">
                    Variabel MSA &amp; Meals
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
          ) : null}

          {setupVariableTab === 'overtime' ? (
            <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0">
              <div className="border-border/40 bg-surface-container-low flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                  <p className="font-display text-foreground text-base font-semibold">
                    List Perhitungan Payroll Overtime
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Konversi total jam attendance menjadi nilai lembur payroll. Terpisah dari
                    setting sesi jam OT otomatis di atas.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={resetOvertimeVariables}>
                    Reset
                  </Button>
                  <Button size="sm" onClick={saveOvertimeVariables}>
                    <Save className="mr-2 size-4" /> Simpan Perhitungan Payroll
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
                        className="border-border/30 hover:bg-surface-container-low/40 border-b transition"
                      >
                        <td className="px-3 py-2">
                          <NativeSelect
                            value={item.roster}
                            onValueChange={(value) =>
                              updateOvertimeVariable(index, 'roster', value)
                            }
                            options={[
                              { value: '5:2', label: '5 : 2' },
                              { value: '6:1', label: '6 : 1' },
                              { value: '13:1', label: '13 : 1' },
                              { value: 'vale', label: 'Vale Sorowako' },
                            ]}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <NativeSelect
                            value={item.dayType}
                            onValueChange={(value) =>
                              updateOvertimeVariable(index, 'dayType', value)
                            }
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
                  + Tambah Perhitungan Overtime
                </Button>
              </div>
            </Card>
          ) : null}
        </section>
      ) : null}

      {mode === 'schedule' ? (
        <Dialog open={rosterDialogOpen} onOpenChange={setRosterDialogOpen}>
          <DialogContent className="h-[94vh] max-h-[94vh] w-[96vw] max-w-[96vw] overflow-y-auto">
            <DialogHeader>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <DialogTitle>Setting Roster Jadwal Shift</DialogTitle>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {site?.name ?? 'Pilih site'} memakai konfigurasi roster, OT, MSA, dan meals
                    aktif.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                    Pilih Bulan
                  </Label>
                  <Input
                    type="month"
                    value={period}
                    onChange={(event) => {
                      setPeriod(event.target.value)
                      setSelectedCell(null)
                      setSelectedPermanentCell(null)
                    }}
                    className="h-10 w-[180px]"
                  />
                </div>
              </div>
            </DialogHeader>
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
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline">Bulan: {period}</Badge>
                      <Badge variant="outline">
                        Tipe: {scheduleTypeLabel(siteConfig.scheduleType)}
                      </Badge>
                      <Badge variant="outline">Roster: {siteConfig.rosterType}</Badge>
                      <Badge variant="outline">OT: {siteConfig.overtimeType}</Badge>
                      <Badge variant="outline">MSA: {siteConfig.msaType}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={siteId === 'all' || isFinalized}
                      onClick={saveSiteConfig}
                    >
                      <RefreshCw className="mr-2 size-4" /> Generate Auto Scheduling
                    </Button>
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
                      <Save className="mr-2 size-4" /> {isSavingSchedule ? 'Menyimpan...' : 'Save'}
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
                    Shift pakai DS/NS. Office pakai ✓, weekend OFF; weekend lembur bisa diedit
                    manual ke ✓/DS/NS.
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
                {sectionOptions.map((section) =>
                  renderRosterTable(rows, section, 'draft', cycleCell)
                )}
              </div>
            </section>
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
                        <span className="text-muted-foreground ml-2">
                          Terakhir: {scheduleSavedAt}
                        </span>
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
              {selectedPermanentCell ? (
                <Card className="surface-module-card flex flex-wrap items-center gap-3 rounded-[1rem] border-0 p-3">
                  <Badge variant="outline">Edit fixed: hari {selectedPermanentCell.day}</Badge>
                  <NativeSelect
                    value={selectedPermanentCode ?? 'IN'}
                    onValueChange={(value) => setSelectedPermanentCode(value as ScheduleCode)}
                    options={codeCycle.map((code) => ({
                      value: code,
                      label: code === 'IN' ? '✓ Masuk' : code,
                    }))}
                    className="w-[180px]"
                  />
                  <p className="text-muted-foreground text-sm">
                    Klik cell untuk pilih, lalu ubah kode shift di sini. Simpan dengan Save Schedule
                    Tetap.
                  </p>
                </Card>
              ) : null}
              <div className="space-y-5">
                {sectionOptions.map((section) =>
                  renderRosterTable(permanentRows, section, 'fixed', cyclePermanentCell)
                )}
              </div>
            </section>
          </DialogContent>
        </Dialog>
      ) : null}

      {mode === 'attendance' ? (
        attendanceWorkspaceOpen ? (
          <section className="space-y-4">
            {selectedAttendancePlan || siteId !== 'all' ? (
              <section className="space-y-4">
                {/* 1. Header & Actions Bar */}
                <Card className="surface-module-card border-border/60 overflow-hidden rounded-2xl border bg-white p-0 shadow-xs">
                  <div className="flex flex-col gap-4 border-b border-border/50 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-900 text-white shadow-xs">
                        <CalendarDays className="size-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                            Attendance · {site?.name ?? 'Site'}
                          </h2>
                          <Badge variant="outline" className="bg-slate-50 font-mono text-xs font-semibold text-slate-700">
                            {formatMonthPeriod(period)}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Kelola data kehadiran karyawan untuk site dan bulan yang dipilih.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAttendanceWorkspaceOpen(false)}
                        className="h-9 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        <ChevronLeft className="mr-1 size-4" /> Kembali ke list
                      </Button>
                      <div className="hidden h-4 w-px bg-border/60 sm:block" />
                      <Button
                        size="sm"
                        disabled={!isAttendanceDirty || isSavingAttendance || siteId === 'all' || isFinalized}
                        onClick={saveAttendanceReal}
                        className={cn(
                          'h-9 px-4 text-xs font-semibold shadow-xs transition-all',
                          isAttendanceDirty
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 animate-pulse'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        )}
                      >
                        <Save className="mr-1.5 size-4" />
                        {isSavingAttendance ? 'Menyimpan...' : 'Save Attendance'}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-surface-container-low/60 px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant={lastImportSuccess ? 'default' : 'outline'}
                        disabled={isFinalized || isImportingExcel}
                        onClick={() => attendanceFileInputRef.current?.click()}
                        className={cn(
                          'h-8.5 rounded-lg text-xs font-medium',
                          lastImportSuccess ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white'
                        )}
                      >
                        {isImportingExcel ? (
                          <>
                            <RefreshCw className="mr-1.5 size-3.5 animate-spin" /> Memproses...
                          </>
                        ) : lastImportSuccess ? (
                          <>
                            <Check className="mr-1.5 size-3.5" /> Berhasil ({lastImportSuccess.matched} matched)
                          </>
                        ) : (
                          <>
                            <Upload className="mr-1.5 size-3.5 text-slate-500" /> Import Excel
                          </>
                        )}
                      </Button>
                      <Input
                        ref={attendanceFileInputRef}
                        disabled={isFinalized || isImportingExcel}
                        className="sr-only"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(event) => {
                          void importAttendanceExcel(event.target.files?.[0] ?? null)
                          event.currentTarget.value = ''
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void downloadAttendanceTemplate()}
                        className="h-8.5 rounded-lg bg-white text-xs font-medium text-slate-700"
                      >
                        <Download className="mr-1.5 size-3.5 text-slate-500" /> Template Excel
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isSavingAttendance || siteId === 'all' || isFinalized}
                        onClick={() => setClearExcelImportDialogOpen(true)}
                        className="h-8.5 rounded-lg border-rose-200 bg-rose-50/60 text-xs font-medium text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                      >
                        <Trash2 className="mr-1.5 size-3.5" /> Hapus Import
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setImportHistoryOpen((v) => !v)}
                        className={cn(
                          'h-8.5 rounded-lg text-xs font-medium bg-white',
                          importHistoryOpen && 'border-primary bg-primary/5 text-primary'
                        )}
                      >
                        <History className="mr-1.5 size-3.5" />
                        Import History {attendanceImportHistory.length ? `(${attendanceImportHistory.length})` : ''}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOvertimePdfOpen((v) => !v)}
                        className={cn(
                          'h-8.5 rounded-lg text-xs font-medium bg-white',
                          overtimePdfOpen && 'border-primary bg-primary/5 text-primary'
                        )}
                      >
                        <Eye className="mr-1.5 size-3.5 text-slate-500" />
                        Preview & Export PDF {selectedOvertimeEmployeeIds.length ? `(${selectedOvertimeEmployeeIds.length})` : ''}
                      </Button>
                      <TabExportActions
                        tabTitle="Attendance"
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

                {/* 2. Overtime & Benefit PDF Download Panel (Collapsible) */}
                {overtimePdfOpen ? (
                  <Card className="surface-module-card rounded-xl border border-border/60 bg-white p-4 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-display text-sm font-semibold text-foreground">
                          Bulk Download Overtime & Benefit PDF
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">{selectedOvertimeEmployeeIds.length} karyawan dipilih</span> untuk generate dokumen PDF.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={rows.length === 0 || siteId === 'all'}
                          onClick={() => void previewAllSiteOvertimePdf()}
                          className="h-8 rounded-lg text-xs"
                          title={`Preview PDF OT + Benefit untuk semua karyawan site ${site?.name ?? ''}`}
                        >
                          <Eye className="mr-1.5 size-3.5" /> Preview Semua PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={selectedOvertimeEmployeeIds.length === 0}
                          onClick={() => void bulkDownloadOvertimePdf(true)}
                          className="h-8 rounded-lg text-xs"
                        >
                          <Download className="mr-1.5 size-3.5" /> OT + Benefit · Total Overtime
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={selectedOvertimeEmployeeIds.length === 0}
                          onClick={() => void bulkDownloadOvertimePdf(false)}
                          className="h-8 rounded-lg text-xs"
                        >
                          <Download className="mr-1.5 size-3.5" /> OT + Benefit · Tanpa Total Overtime
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : null}

                {/* 3. Import History Panel (Collapsible) */}
                {importHistoryOpen ? (
                  <Card className="surface-module-card overflow-hidden rounded-xl border border-border/60 bg-white p-0 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 bg-surface-container-low px-4 py-3">
                      <div>
                        <p className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                          <History className="mr-1.5 inline size-4" /> Import History
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Rollback hapus batch tertentu; Delete Excel Import hapus semua Excel bulan ini.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void refreshAttendanceImportHistory()}
                        className="h-7.5 rounded-lg text-xs"
                      >
                        Refresh
                      </Button>
                    </div>
                    <div className="divide-y divide-border/30 p-2">
                      {attendanceImportHistory.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg p-2.5 hover:bg-slate-50"
                        >
                          <div>
                            <p className="text-xs font-semibold text-foreground">{item.filename}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {item.templateKind} · {item.sheetName || 'auto'} ·{' '}
                              {new Date(item.createdAt).toLocaleString('id-ID')}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {item.matchedCount} matched · {item.unmatchedCount} fix · {item.conflictCount} conflict
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isSavingAttendance || isFinalized || item.status !== 'applied'}
                              onClick={() => rollbackAttendanceImport(item.id)}
                              className="h-7 rounded-lg text-xs"
                            >
                              <Undo2 className="mr-1.5 size-3.5" /> Rollback
                            </Button>
                          </div>
                        </div>
                      ))}
                      {!attendanceImportHistory.length ? (
                        <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                          Belum ada import history.
                        </div>
                      ) : null}
                    </div>
                  </Card>
                ) : null}

                {/* Import Status Banners */}
                {lastImportSuccess ? (
                  <Card className="surface-module-card overflow-hidden rounded-xl border border-emerald-200/80 bg-white p-0 shadow-xs">
                    <div className="flex items-center gap-3 border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-xs">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
                        <Check className="size-3.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-emerald-900">
                          Import berhasil — {lastImportSuccess.matched} karyawan matched
                        </p>
                        <p className="text-[11px] text-emerald-700">
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
                      <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-xs">
                        <p className="mb-2 font-semibold text-amber-900">
                          {lastImportSuccess.unmatchedNames.length} nama dari Excel tidak ditemukan di sistem:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {lastImportSuccess.unmatchedNames.map((name) => (
                            <span
                              key={name}
                              className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200 ring-inset"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </Card>
                ) : null}

                {/* Holiday Badges */}
                {holidays.length ? (
                  <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50/50 p-2.5 text-xs">
                    <span className="font-semibold text-amber-900 mr-1">Hari Libur Nasional:</span>
                    {holidays.map((holiday) => (
                      <Badge
                        key={`attendance-${holiday.date}`}
                        variant="secondary"
                        className="bg-amber-100/80 text-amber-900 border-amber-300/60"
                        title={holiday.localName || holiday.name}
                      >
                        {holiday.day}: {holiday.localName || holiday.name}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {/* Unsaved & Save status strip */}
                {attendanceImportPreview || attendanceSavedAt || isAttendanceDirty ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-white px-3.5 py-2 text-xs">
                    {isAttendanceDirty ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 font-semibold text-amber-800 ring-1 ring-amber-200 ring-inset">
                        Belum tersimpan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-700 ring-1 ring-emerald-200 ring-inset">
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

                {/* Conflict Resolutions */}
                {attendanceConflicts.length && !conflictsDismissed ? (
                  <Card className="surface-module-card overflow-hidden rounded-xl border border-amber-300 bg-white p-0 shadow-xs">
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
                          className="h-8 rounded-lg text-xs"
                        >
                          {showConflictsOnly ? 'Tampilkan semua' : 'Hanya konflik'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isFinalized}
                          onClick={clearAllAttendanceConflicts}
                          className="h-8 rounded-lg text-xs"
                        >
                          Clear semua attendance
                        </Button>
                        <Button
                          size="sm"
                          disabled={isFinalized}
                          onClick={markAllConflictSchedulesWorking}
                          className="h-8 rounded-lg text-xs bg-amber-600 text-white hover:bg-amber-700"
                        >
                          Pakai attendance (mark working)
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConflictsDismissed(true)}
                          className="h-8 text-xs text-amber-800"
                        >
                          Tutup
                        </Button>
                      </div>
                    </div>
                  </Card>
                ) : null}

                {/* 4. KPI Stat Summary Cards Row */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    {
                      label: 'Karyawan',
                      val: rows.length,
                      sub: 'Total Karyawan',
                      icon: Users,
                      tone: 'text-slate-700 bg-slate-100 border-slate-200',
                    },
                    {
                      label: 'Hadir',
                      val: attendanceStats.present,
                      sub: `${((attendanceStats.present / (attendanceSourceStats.totalFilledDays || 1)) * 100).toFixed(1)}% dari total`,
                      icon: CheckCircle2,
                      tone: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                    },
                    {
                      label: 'Sakit',
                      val: attendanceStats.sick,
                      sub: `${((attendanceStats.sick / (attendanceSourceStats.totalFilledDays || 1)) * 100).toFixed(1)}% dari total`,
                      icon: Pencil,
                      tone: 'text-amber-700 bg-amber-50 border-amber-200',
                    },
                    {
                      label: 'Izin',
                      val: attendanceStats.leave,
                      sub: `${((attendanceStats.leave / (attendanceSourceStats.totalFilledDays || 1)) * 100).toFixed(1)}% dari total`,
                      icon: CalendarDays,
                      tone: 'text-sky-700 bg-sky-50 border-sky-200',
                    },
                    {
                      label: 'Alpha',
                      val: attendanceStats.absent,
                      sub: `${((attendanceStats.absent / (attendanceSourceStats.totalFilledDays || 1)) * 100).toFixed(1)}% dari total`,
                      icon: AlertTriangle,
                      tone: 'text-rose-700 bg-rose-50 border-rose-200',
                    },
                    {
                      label: 'Total Terisi',
                      val: attendanceSourceStats.totalFilledDays,
                      sub: 'Data terisi',
                      icon: FileSpreadsheet,
                      tone: 'text-purple-700 bg-purple-50 border-purple-200',
                    },
                  ].map((item) => (
                    <Card
                      key={item.label}
                      className="surface-module-card border-border/60 flex flex-col justify-between rounded-xl border bg-white p-3.5 shadow-xs transition-all hover:border-border"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                          {item.label}
                        </span>
                        <span className={`grid size-7 place-items-center rounded-lg border ${item.tone}`}>
                          <item.icon className="size-3.5" />
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="font-display text-2xl font-bold tracking-tight text-foreground tabular-nums">
                          {item.val}
                        </p>
                        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{item.sub}</p>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* 5. Face Attendance Summary Bar */}
                <AttendanceSummaryBar
                  faceDays={attendanceSourceStats.faceDays}
                  excelDays={attendanceSourceStats.excelDays}
                  manualDays={attendanceSourceStats.manualDays}
                  totalFilledDays={attendanceSourceStats.totalFilledDays}
                  facePercentage={attendanceSourceStats.facePercentage}
                />

                {/* 6. Command Bar: View Tabs + Search + Filter Status Pills */}
                <Card className="surface-module-card border-border/60 overflow-hidden rounded-xl border bg-white p-3 shadow-xs">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    {/* View Switcher Tabs */}
                    <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                      {[
                        { key: 'attendance', label: 'Attendance' },
                        { key: 'lokasi', label: 'Tunjangan Khusus' },
                        { key: 'msa', label: 'MSA' },
                        { key: 'meals', label: 'Meals' },
                        { key: 'ovt', label: 'Overtime' },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setAttendanceView(tab.key as any)}
                          className={cn(
                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                            attendanceView === tab.key
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900'
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Search & Status Filter Pills */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative min-w-[180px] flex-1 sm:w-[220px]">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Cari nama karyawan..."
                          value={attendanceSearch}
                          onChange={(e) => setAttendanceSearch(e.target.value)}
                          className="h-8.5 rounded-lg border-border/60 bg-white pl-8.5 text-xs"
                        />
                        {attendanceSearch ? (
                          <button
                            onClick={() => setAttendanceSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="size-3.5" />
                          </button>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                        <span className="mr-1 hidden text-[11px] font-semibold text-muted-foreground sm:inline">
                          Status:
                        </span>
                        {[
                          { key: 'all', label: 'Semua' },
                          { key: 'present', label: 'Masuk' },
                          { key: 'sick', label: 'Sakit' },
                          { key: 'leave', label: 'Izin' },
                          { key: 'absent', label: 'Alpha' },
                          { key: 'off', label: 'OFF' },
                          { key: 'gb', label: 'GB (Field Break)' },
                        ].map((f) => (
                          <button
                            key={f.key}
                            onClick={() => setAttendanceStatusFilter(f.key as any)}
                            className={cn(
                              'h-7.5 whitespace-nowrap rounded-lg border px-2.5 text-[11px] font-semibold transition-all',
                              attendanceStatusFilter === f.key
                                ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                                : 'border-border/60 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            )}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* 7. Bulk Action Toolbar */}
                <AttendanceRealBulkToolbar
                  enabled={multiSelectAttendance}
                  selectedCount={selectedAttendanceKeys.length}
                  onToggle={() => setMultiSelectAttendance((value) => !value)}
                  onSetPresent={() =>
                    applyBulkAttendance({
                      status: 'present',
                      clockIn: '08:00',
                      clockOut: '17:00',
                    })
                  }
                  onSetSick={() =>
                    applyBulkAttendance({ status: 'sick', clockIn: '', clockOut: '' })
                  }
                  onSetLeave={() =>
                    applyBulkAttendance({ status: 'leave', clockIn: '', clockOut: '' })
                  }
                  onSetEmpty={() =>
                    applyBulkAttendance({ status: 'empty', clockIn: '', clockOut: '', note: '' })
                  }
                  onClear={clearAttendanceSelection}
                />
                <Card className="surface-module-card relative overflow-hidden rounded-[1.2rem] border-0 p-0 shadow-xs">
                  {isImportingExcel ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white">
                      <RefreshCw className="text-primary size-8 animate-spin" />
                      <p className="text-sm font-semibold text-foreground">
                        Memproses file Excel...
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Mencocokkan nama karyawan dengan Fuse.js
                      </p>
                    </div>
                  ) : null}
                  {/* View title */}
                  {attendanceView !== 'attendance' ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 bg-surface-container-low px-4 py-2.5">
                      <p className="text-xs font-bold tracking-[0.14em] uppercase text-foreground">
                        {attendanceView === 'msa' &&
                          `MSA SUMMARY — Rate: Staff Rp ${rate.msaStaff.toLocaleString('id-ID')} / Non-Staff Rp ${rate.msaNonStaff.toLocaleString('id-ID')}`}
                        {attendanceView === 'lokasi' &&
                          `TUNJANGAN KHUSUS — Lokal: ${siteConfig.employeeBenefitConfig.local.specialAllowance ? `Rp ${siteConfig.employeeBenefitConfig.local.specialAllowanceAmount.toLocaleString('id-ID')}/${siteConfig.employeeBenefitConfig.local.specialAllowancePeriod === 'monthly' ? 'bulan' : 'hari'}` : 'Tidak aktif'} | Non Lokal: ${siteConfig.employeeBenefitConfig.nonLocal.specialAllowance ? `Rp ${siteConfig.employeeBenefitConfig.nonLocal.specialAllowanceAmount.toLocaleString('id-ID')}/${siteConfig.employeeBenefitConfig.nonLocal.specialAllowancePeriod === 'monthly' ? 'bulan' : 'hari'}` : 'Tidak aktif'}`}
                        {attendanceView === 'meals' &&
                          `MEALS SUMMARY — Rate Setup Meals: Staff Rp ${rate.mealsStaff.toLocaleString('id-ID')} / Non-Staff Rp ${rate.mealsNonStaff.toLocaleString('id-ID')}`}
                        {attendanceView === 'ovt' && 'OVERTIME SUMMARY'} {period} · {rate.project}
                      </p>
                      {attendanceView === 'ovt' ||
                      attendanceView === 'msa' ||
                      attendanceView === 'meals' ||
                      attendanceView === 'lokasi' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={rows.length === 0 || siteId === 'all'}
                          onClick={() => void downloadSummaryPdf(attendanceView)}
                          title="Download PDF Summary sesuai tabel di halaman ini"
                        >
                          <Download className="mr-2 size-4" /> Download PDF
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="max-w-full overflow-x-auto overflow-y-visible">
                    <table className="w-max min-w-[1400px] table-fixed border-separate border-spacing-0 text-xs">
                      <thead>
                        <tr className="bg-surface-container-low text-left tracking-[0.12em] uppercase text-muted-foreground">
                          <th className="sticky left-0 z-30 w-[260px] min-w-[260px] bg-surface-container-low px-3 py-3 shadow-[8px_0_16px_-14px_rgba(15,23,42,0.55)]">
                            <label className="flex items-center gap-2 font-semibold">
                              <input
                                type="checkbox"
                                aria-label="Pilih semua karyawan untuk bulk OT PDF"
                                checked={
                                  displayedAttendanceRows.length > 0 &&
                                  displayedAttendanceRows.every((row) =>
                                    selectedOvertimeEmployeeIds.includes(row.employee.id)
                                  )
                                }
                                onChange={toggleAllOvertimeEmployees}
                                className="accent-primary size-3.5"
                              />
                              Nama Karyawan
                            </label>
                          </th>
                          {days.map((day) => {
                            const holiday = holidaysByDay.get(day)
                            const holidayName = holiday?.localName ?? holiday?.name
                            return (
                              <th
                                key={day}
                                title={holidayName}
                                className={`w-[52px] min-w-[52px] px-1 py-3 text-center ${holiday ? 'bg-amber-100 ring-1 ring-amber-300 ring-inset' : ''}`}
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
                          const grouped = new Map<
                            string,
                            Map<string, typeof displayedAttendanceRows>
                          >()
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
                                  className="sticky left-0 z-20 px-3 py-2 text-[11px] font-bold tracking-[0.14em] uppercase text-foreground"
                                >
                                  {dept}
                                </td>
                              </tr>
                              {Array.from(sections.entries()).map(([section, sectionRows]) => (
                                <React.Fragment key={`${dept}-${section}`}>
                                  <tr className="bg-surface-container-low">
                                    <td
                                      colSpan={days.length + 1}
                                      className="sticky left-0 z-20 px-3 py-1.5 pl-6 text-[10px] font-semibold tracking-[0.12em] uppercase text-muted-foreground"
                                    >
                                      {section}{' '}
                                      <span className="font-normal">({sectionRows.length})</span>
                                    </td>
                                  </tr>
                                  {sectionRows.map((row) => (
                                    <tr
                                      key={row.employee.id}
                                      className={`group border-b border-slate-100 ${employeesWithZeroFace.has(row.employee.id) ? 'bg-rose-50' : 'bg-white'}`}
                                    >
                                      <td
                                        className={`sticky left-0 z-20 w-[260px] min-w-[260px] max-w-[260px] px-3 py-2 font-semibold shadow-[8px_0_16px_-14px_rgba(15,23,42,0.55)] ${employeesWithZeroFace.has(row.employee.id) ? 'bg-rose-50' : 'bg-white'}`}
                                      >
                                        <div className="flex flex-col gap-1.5">
                                          <div className="flex items-center justify-between gap-1.5">
                                            <div className="flex items-center gap-2 min-w-0">
                                              <input
                                                type="checkbox"
                                                aria-label={`Pilih ${row.employee.name} untuk bulk OT PDF`}
                                                checked={selectedOvertimeEmployeeIds.includes(
                                                  row.employee.id
                                                )}
                                                onChange={() =>
                                                  toggleOvertimeEmployee(row.employee.id)
                                                }
                                                className="accent-primary size-3.5 shrink-0"
                                              />
                                              <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-semibold text-slate-900" title={row.employee.name}>
                                                  {row.employee.name}
                                                </p>
                                                <p className="truncate text-[10px] font-normal text-muted-foreground">
                                                  {row.employee.section || row.employee.role}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                          {/* PDF Action Buttons (Visible and easy to click) */}
                                          <div className="flex items-center gap-1 pt-0.5 border-t border-slate-100 text-[10px]">
                                            <button
                                              className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                                              title="Preview record PDF karyawan sesuai view ini"
                                              onClick={() => previewEmployeeRecordPdf(row.employee)}
                                            >
                                              Preview
                                            </button>
                                            <button
                                              className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                                              title={
                                                attendanceView === 'msa' ||
                                                attendanceView === 'meals' ||
                                                attendanceView === 'lokasi'
                                                  ? 'Generate record PDF sesuai view ini'
                                                  : 'Generate Overtime Record PDF'
                                              }
                                              onClick={() => generateEmployeeOvertimePdf(row.employee)}
                                            >
                                              {attendanceView === 'msa'
                                                ? 'MSA'
                                                : attendanceView === 'meals'
                                                  ? 'MLS'
                                                  : attendanceView === 'lokasi'
                                                    ? 'TU'
                                                    : 'OT'}
                                            </button>
                                            <button
                                              className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                                              title="Generate Benefit PDF (MSA, Meals, Tunjangan Khusus)"
                                              onClick={() => generateEmployeeAllowancePdf(row.employee)}
                                            >
                                              Benefit
                                            </button>
                                            <button
                                              className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                                              title="Generate Daily Activity PDF"
                                              onClick={() => generateEmployeeDailyActivityPdf(row.employee)}
                                            >
                                              DA
                                            </button>
                                          </div>
                                        </div>
                                      </td>
                                      {days.map((day) => {
                                        const scheduleCode = row.schedule[day - 1] as string
                                        const cell = getAttendanceCell(
                                          row.employee.id,
                                          day,
                                          scheduleCode
                                        )
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
                                          const allowance = getAllowanceAmounts(row, day)
                                          let cellValue: string | number = ''
                                          let cellBg = ''
                                          let cellTitle =
                                            holidayName || `${scheduleCode} · ${cell.status}`
                                          let overtimeMeta = ''
                                          // Check if this day is in a Field Break period (14+ days no attendance)
                                          const isFieldBreakDay =
                                            scheduleCode === 'FB' ||
                                            cell.status === 'field_break' ||
                                            (fieldBreakDaysByEmployee
                                              .get(row.employee.id)
                                              ?.has(day) ??
                                              false)

                                          // MSA adalah tunjangan lokasi: semua hari dibayar kecuali Field Break.
                                          // Meals dan tunjangan khusus tetap mengikuti attendance masing-masing.
                                          const isRosterOff =
                                            scheduleCode === 'OFF' || scheduleCode === 'Libur'
                                          const isNationalHoliday = Boolean(isHolidayDay)
                                          const isWorkDay = !isRosterOff
                                          const isAbsent =
                                            cell.status === 'leave' ||
                                            cell.status === 'sick' ||
                                            cell.status === 'absent'
                                          // 'off' status = manual OFF day, treated like roster OFF (gets allowance)
                                          // 'off' status = manual OFF, treated like roster OFF (not empty workday)
                                          const isEmptyWorkDay =
                                            isWorkDay &&
                                            !isNationalHoliday &&
                                            scheduleCode !== 'ST' &&
                                            cell.status === 'empty'
                                          const noAllowance =
                                            isAbsent || isEmptyWorkDay || scheduleCode === 'FB'
                                          const absentLabel =
                                            cell.status === 'leave'
                                              ? 'Izin'
                                              : cell.status === 'sick'
                                                ? 'Sakit'
                                                : cell.status === 'absent'
                                                  ? 'Alpha'
                                                  : '-'

                                          if (attendanceView === 'msa') {
                                            if (
                                              !allowance.rule.msa ||
                                              siteConfig.msaType === 'none'
                                            ) {
                                              cellValue = '-'
                                              cellBg = 'bg-slate-50 text-muted-foreground'
                                            } else if (isFieldBreakDay) {
                                              cellValue = 'FB'
                                              cellBg = 'bg-purple-50 text-purple-700'
                                            } else {
                                              const msaRate = allowance.msaAmount
                                              cellValue = msaRate > 0 ? msaRate : '-'
                                              cellBg = isNationalHoliday
                                                ? 'bg-amber-50 text-foreground'
                                                : isRosterOff
                                                  ? 'bg-slate-50 text-foreground'
                                                  : msaRate > 0
                                                    ? 'bg-white text-foreground'
                                                    : 'bg-slate-50 text-muted-foreground'
                                            }
                                          } else if (attendanceView === 'lokasi') {
                                            if (!allowance.rule.specialAllowance) {
                                              cellValue = '-'
                                              cellBg = 'bg-slate-50 text-muted-foreground'
                                            } else if (
                                              isFieldBreakDay &&
                                              cell.status !== 'present'
                                            ) {
                                              cellValue = 'FB'
                                              cellBg = 'bg-purple-50 text-purple-700'
                                            } else if (noAllowance) {
                                              cellValue = absentLabel
                                              cellBg = 'bg-rose-50 text-rose-700'
                                            } else {
                                              cellValue = allowance.specialAllowanceAmount || '-'
                                              cellBg = isNationalHoliday
                                                ? 'bg-amber-50 text-foreground'
                                                : isRosterOff
                                                  ? 'bg-slate-50 text-foreground'
                                                  : 'bg-white text-foreground'
                                            }
                                          } else if (attendanceView === 'meals') {
                                            if (
                                              !allowance.rule.meals ||
                                              siteConfig.mealsType === 'none'
                                            ) {
                                              cellValue = '-'
                                              cellBg = 'bg-slate-50 text-muted-foreground'
                                            } else if (isFieldBreakDay) {
                                              cellValue = 'FB'
                                              cellBg = 'bg-purple-50 text-purple-700'
                                            } else {
                                              const mealsRate = allowance.mealsAmount
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
                                            } else if (cell.status !== 'present') {
                                              cellValue = isOff ? scheduleCode : ''
                                              cellBg = isOff
                                                ? 'bg-rose-50 text-rose-700'
                                                : isHolidayDay
                                                  ? 'bg-amber-50 text-amber-700'
                                                  : ''
                                            } else {
                                              const overtime = calculateDayOvertime(
                                                row.schedule,
                                                day,
                                                cell.clockIn,
                                                cell.clockOut,
                                                staff,
                                                row.employee.id
                                              )
                                              cellValue =
                                                overtime.totalHours > 0
                                                  ? overtime.totalHours
                                                  : overtime.unauthorizedMinutes > 0
                                                    ? 'SPL'
                                                    : ''
                                              cellBg =
                                                overtime.unauthorizedMinutes > 0
                                                  ? 'bg-orange-100 text-orange-900 font-semibold'
                                                  : overtime.totalHours > 0
                                                    ? 'bg-white text-foreground font-semibold'
                                                    : ''
                                              overtimeMeta =
                                                overtime.unauthorizedMinutes > 0
                                                  ? `${overtime.source === 'None' ? '' : `${overtime.source} · `}Perlu SPL`
                                                  : overtime.source === 'Auto + SPL'
                                                    ? 'Auto+SPL'
                                                    : overtime.source === 'None'
                                                      ? ''
                                                      : overtime.source
                                              cellTitle = [
                                                `${scheduleCode} · ${cell.status}`,
                                                `Sumber: ${overtime.source}`,
                                                overtime.splNumbers.length
                                                  ? `SPL: ${overtime.splNumbers.join(', ')}`
                                                  : '',
                                                overtime.unauthorizedMinutes > 0
                                                  ? `Perlu SPL: ${overtime.unauthorizedMinutes / 60} jam`
                                                  : '',
                                              ]
                                                .filter(Boolean)
                                                .join(' · ')
                                            }
                                          }

                                          return (
                                            <td
                                              key={day}
                                              className={`w-[52px] min-w-[52px] px-0.5 py-1.5 text-center text-[10px] ${cellBg} ${isHolidayDay ? 'bg-amber-50' : ''}`}
                                              title={cellTitle}
                                            >
                                              <span>{cellValue}</span>
                                              {overtimeMeta ? (
                                                <span className="mt-0.5 block text-[8px] font-medium">
                                                  {overtimeMeta}
                                                </span>
                                              ) : null}
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
                                              className={`relative h-[76px] w-[44px] rounded-xl px-2 py-2 text-left text-[11px] font-semibold ${cell.isLatePending ? 'bg-purple-100 text-purple-950 ring-1 ring-purple-300' : isHolidayDay ? attendanceHolidayCellClass : attendanceCellClass(cell.status)} ${isSelected ? 'outline outline-2 outline-offset-2 outline-slate-900' : ''} ${isConflict ? 'ring-2 ring-orange-400' : ''}`}
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
                                              <span>
                                                {cell.isLatePending
                                                  ? 'Late'
                                                  : attendanceStatusLabel(cell.status)}
                                              </span>
                                              {cell.clockIn || cell.clockOut ? (
                                                <span className="mt-1 block font-mono text-[10px]">
                                                  {cell.clockIn || '--:--'}-
                                                  {cell.clockOut || '--:--'}
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
                                                const dayActivities =
                                                  activitiesByEmployeeDay.get(activityKey) || []
                                                if (dayActivities.length === 0) return null
                                                return (
                                                  <div
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      setSelectedActivityCell({
                                                        employeeId: row.employee.id,
                                                        day,
                                                      })
                                                    }}
                                                    className="absolute bottom-1 left-1 flex size-4 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-[8px] font-bold text-white"
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

                                              const isRosterOff2 =
                                                code === 'OFF' || code === 'Libur'
                                              const allowance = getAllowanceAmounts(row, day)

                                              if (attendanceView === 'lokasi') {
                                                total += allowance.specialAllowanceAmount
                                                continue
                                              }

                                              // Skip Field Break days for MSA/Meals
                                              const isFbPeriod =
                                                code === 'FB' || cell.status === 'field_break'
                                              if (
                                                isFbPeriod &&
                                                (attendanceView === 'msa' ||
                                                  attendanceView === 'meals')
                                              )
                                                continue

                                              // Skip if no allowance (izin/sakit/alpha/empty workday)
                                              // OVT: only count present days
                                              if (
                                                attendanceView === 'ovt' &&
                                                cell.status !== 'present'
                                              )
                                                continue
                                              if (attendanceView === 'msa') {
                                                total += allowance.msaAmount
                                              } else if (attendanceView === 'meals') {
                                                total += allowance.mealsAmount
                                              } else {
                                                // OVT only for non-staff
                                                if (!staff) {
                                                  total += calculateDayOvertime(
                                                    row.schedule,
                                                    day,
                                                    cell.clockIn,
                                                    cell.clockOut,
                                                    staff,
                                                    row.employee.id
                                                  ).totalHours
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
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">Tips Penggunaan:</span>
                    <span>Klik sel untuk edit jam/status · Double-click untuk rotasi cepat (Masuk → Sakit → Izin → Alpha → -).</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                    <span>Format Import Excel:</span>
                    <code className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700">Nama</code>
                    <code className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-700">D1..D31</code>
                  </div>
                </div>
              </section>
            ) : (
              <Card className="surface-module-card rounded-[1.1rem] border-0 p-8 text-center">
                <CalendarDays className="text-muted-foreground mx-auto size-8" aria-hidden="true" />
                <p className="font-display text-foreground mt-3 text-lg font-semibold">
                  Attendance belum memiliki Schedule V2
                </p>
                <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
                  Attendance tetap bisa dibuat dan diisi. Schedule V2 dapat ditambahkan atau
                  dilengkapi kemudian.
                </p>
              </Card>
            )}
          </section>
        ) : (
          <>
            <MinimalTableShell
              label="Attendance"
              title="Attendance"
              description="Kelola attendance per site dan bulan dari Schedule V2 yang sudah aktif."
              searchPlaceholder="Cari site atau bulan..."
              showImport={false}
              dateFilter={false}
              filters={
                <>
                  <select
                    data-table-filter-key="site"
                    className="border-border/70 h-9 rounded-lg border bg-white px-3 text-sm"
                  >
                    <option value="">Semua site</option>
                    {sites.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="month"
                    data-table-filter-key="period"
                    className="h-9 w-[160px]"
                    aria-label="Filter bulan"
                  />
                </>
              }
              primaryAction={
                <Button
                  size="dense"
                  onClick={() => {
                    setAttendanceCreateSiteId(String(currentEmployeeSiteId ?? sites[0]?.id ?? ''))
                    setAttendanceCreatePeriod(currentMonthPeriod)
                    setAttendanceCreateOpen(true)
                  }}
                >
                  <CalendarDays className="size-4" /> Tambah Attendance
                </Button>
              }
            >
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow className="bg-surface-container-low text-muted-foreground text-left text-[11px] tracking-[0.12em] uppercase">
                    <TableHead className="px-4 py-3 font-medium">Site</TableHead>
                    <TableHead className="px-4 py-3 font-medium">Bulan</TableHead>
                    <TableHead className="px-4 py-3 font-medium">Schedule</TableHead>
                    <TableHead className="px-4 py-3 font-medium">Attendance</TableHead>
                    <TableHead className="px-4 py-3 font-medium">Terakhir diubah</TableHead>
                    <TableHead className="px-4 py-3 text-right font-medium">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceHistoryRows.map(({ plan, site: historySite, status }) => (
                    <TableRow
                      key={`${plan.siteId}-${plan.period}`}
                      data-filter-site={historySite?.name ?? ''}
                      data-filter-period={plan.period}
                      className="border-border/30 hover:bg-surface-container-low/40 border-t transition"
                    >
                      <TableCell className="px-4 py-3 font-semibold">
                        {historySite?.name ?? `Site ${plan.siteId}`}
                      </TableCell>
                      <TableCell className="px-4 py-3 tabular-nums">
                        {formatMonthPeriod(plan.period)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant={plan.draftSchedule.length ? 'default' : 'secondary'}>
                          {plan.draftSchedule.length ? 'Aktif' : 'Belum ada'}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant={status?.attendanceStatus === 'saved' ? 'default' : 'secondary'}
                        >
                          {status?.attendanceStatus === 'saved' ? 'Tersimpan' : 'Belum diisi'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground px-4 py-3">
                        {status?.lastSavedAt
                          ? new Date(status.lastSavedAt).toLocaleString('id-ID')
                          : '-'}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => openAttendanceWorkspace(plan.siteId, plan.period)}
                            aria-label="Lihat attendance"
                            title="Lihat attendance"
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => openAttendanceWorkspace(plan.siteId, plan.period)}
                            aria-label="Edit attendance"
                            title="Edit attendance"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() =>
                              setAttendanceResetTarget({
                                siteId: plan.siteId,
                                period: plan.period,
                                recreate: true,
                              })
                            }
                            aria-label="Buat ulang attendance"
                            title="Buat ulang attendance"
                          >
                            <RotateCcw className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() =>
                              setAttendanceResetTarget({
                                siteId: plan.siteId,
                                period: plan.period,
                                recreate: false,
                              })
                            }
                            aria-label="Hapus attendance"
                            title="Hapus attendance"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!attendanceHistoryRows.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-muted-foreground px-4 py-12 text-center"
                      >
                        Belum ada attendance. Klik Tambah Attendance untuk membuat site dan bulan,
                        meskipun Schedule V2 belum tersedia.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </MinimalTableShell>

            <Dialog open={attendanceCreateOpen} onOpenChange={setAttendanceCreateOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Tambah Attendance</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="space-y-2">
                    <Label>Site</Label>
                    <NativeSelect
                      value={attendanceCreateSiteId}
                      onValueChange={setAttendanceCreateSiteId}
                      options={sites.map((item) => ({ value: String(item.id), label: item.name }))}
                      placeholder="Pilih site"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bulan</Label>
                    <Input
                      type="month"
                      value={attendanceCreatePeriod}
                      onChange={(event) => setAttendanceCreatePeriod(event.target.value)}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Attendance bisa dibuat tanpa Schedule V2. Jika schedule belum ada, form memakai
                    daftar karyawan aktif dari site dan dapat dilengkapi kemudian.
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAttendanceCreateOpen(false)}>
                    Batal
                  </Button>
                  <Button disabled={isSavingAttendance} onClick={createAttendanceWorkspace}>
                    {isSavingAttendance ? 'Membuat...' : 'Buka form attendance'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <AlertDialog
              open={Boolean(attendanceResetTarget)}
              onOpenChange={(open) => !open && setAttendanceResetTarget(null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {attendanceResetTarget?.recreate
                      ? 'Buat ulang attendance?'
                      : 'Hapus attendance?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Data attendance manual dan Excel untuk site serta bulan ini akan dihapus.
                    Schedule V2 tetap aman.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAttendanceWorkspace}>
                    {attendanceResetTarget?.recreate ? 'Hapus dan buat ulang' : 'Hapus attendance'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )
      ) : null}

      {mode === 'field-break' ? (
        <Dialog open={fieldBreakDialogOpen} onOpenChange={setFieldBreakDialogOpen}>
          <DialogContent
            className="h-[94vh] max-h-[94vh] w-[96vw] max-w-[96vw] overflow-y-auto"
            onInteractOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
            onFocusOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                Field Break {currentFieldBreakSite ? `- ${currentFieldBreakSite.name}` : ''}
              </DialogTitle>
            </DialogHeader>
            <section className="min-w-0 space-y-3">
              <div className="sticky top-0 z-20 -mx-1 rounded-[1rem] bg-white/95 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(220px,1fr)_160px_160px]">
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                        Site
                      </Label>
                      <NativeSelect
                        value={fieldBreakSiteId}
                        onValueChange={(value) => {
                          setFieldBreakSiteId(value)
                          setSiteId(value)
                        }}
                        options={sites.map((item) => ({
                          value: String(item.id),
                          label: item.name,
                        }))}
                        placeholder="Pilih site"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                        Periode
                      </Label>
                      <div className="bg-surface-container-low flex h-10 items-center rounded-lg px-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Bulan sebelumnya"
                          onClick={() => setPeriod(addMonths(`${period}-01`, -1).slice(0, 7))}
                        >
                          <ChevronLeft className="size-4" />
                        </Button>
                        <span className="min-w-0 flex-1 text-center text-sm font-semibold capitalize">
                          {new Intl.DateTimeFormat('id-ID', {
                            month: 'long',
                            year: 'numeric',
                            timeZone: 'UTC',
                          }).format(new Date(`${period}-01T00:00:00Z`))}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          aria-label="Bulan berikutnya"
                          onClick={() => setPeriod(addMonths(`${period}-01`, 1).slice(0, 7))}
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                        Kapasitas
                      </Label>
                      <div className="bg-surface-container-low text-foreground flex h-10 items-center rounded-lg px-3 text-sm font-semibold tabular-nums">
                        {fieldBreakCapacity} aktif / {fieldBreakRows.length} orang
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <TabExportActions
                      tabTitle="Schedule Field Break"
                      columns={['Nama', 'Section', 'Group', 'On Site', 'Day', 'FB', 'Updated']}
                      exportRows={fieldBreakRows.map((row) => [
                        row.employee.name,
                        row.sectionLabel,
                        row.rosterSection,
                        formatShortDate(row.onSiteDate),
                        row.dayCount ?? '',
                        `${formatShortDate(row.fieldBreakDate)} - ${formatShortDate(row.fieldBreakEndDate)}`,
                        row.savedAt
                          ? new Date(row.savedAt).toLocaleString('id-ID')
                          : 'Belum tersimpan',
                      ])}
                    />
                    <Button
                      variant="outline"
                      disabled={isSavingFieldBreak || fieldBreakRows.length === 0 || isFinalized}
                      onClick={generateFieldBreakYear}
                      className="h-10"
                    >
                      <RefreshCw className="size-4" /> Generate
                    </Button>
                    <Button
                      disabled={isSavingFieldBreak || fieldBreakRows.length === 0 || isFinalized}
                      onClick={syncFieldBreakPlansToDatabase}
                      className="h-10"
                    >
                      <Save className="size-4" />
                      {isSavingFieldBreak ? 'Menyimpan' : 'Simpan'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Siap disimpan', value: fieldBreakReadyCount, Icon: CheckCircle2 },
                  { label: 'Auto generated', value: fieldBreakAutoCount, Icon: RefreshCw },
                  { label: 'Locked manual', value: fieldBreakLockedCount, Icon: Lock },
                  { label: 'Perlu dicek', value: fieldBreakViolations.length, Icon: AlertTriangle },
                ].map(({ label, value, Icon }) => (
                  <div
                    key={label}
                    className="surface-muted-card flex items-center justify-between gap-3 rounded-[1rem] border-0 p-4"
                  >
                    <div>
                      <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
                        {label}
                      </p>
                      <p className="font-display text-foreground mt-1 text-2xl font-semibold tabular-nums">
                        {value}
                      </p>
                    </div>
                    <span className="bg-surface-container-low text-muted-foreground grid size-9 place-items-center rounded-xl">
                      <Icon className="size-4" />
                    </span>
                  </div>
                ))}
              </div>

              {fieldBreakViolations.length > 0 ? (
                <Alert className="border-0 bg-amber-50 text-amber-950 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.18)]">
                  <AlertDescription>
                    {fieldBreakViolations.length} tanggal melebihi limit field break. Cek tanggal{' '}
                    {fieldBreakViolations[0]?.date}.
                  </AlertDescription>
                </Alert>
              ) : null}

              <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0 p-0">
                <div className="bg-surface-container-low flex items-center justify-between gap-3 p-3">
                  <div className="relative w-[220px] shrink-0">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      value={fieldBreakSearch}
                      onChange={(event) => setFieldBreakSearch(event.target.value)}
                      placeholder="Cari karyawan / section"
                      className="h-9 rounded-lg bg-white pl-9 text-[13px]"
                    />
                  </div>
                  <div className="flex shrink-0 flex-nowrap gap-2">
                    <NativeSelect
                      value={fieldBreakTimelineView}
                      onValueChange={(value) =>
                        setFieldBreakTimelineView(value as FieldBreakTimelineView)
                      }
                      className="h-9 w-[118px] shrink-0 bg-white text-[13px]"
                      options={[
                        { value: 'month', label: 'Per bulan' },
                        { value: 'quarter', label: 'Per kuartal' },
                        { value: 'semester', label: 'Per semester' },
                        { value: 'year', label: 'Per tahun' },
                      ]}
                    />
                    <NativeSelect
                      value={fieldBreakSectionFilter}
                      onValueChange={setFieldBreakSectionFilter}
                      className="h-9 w-[150px] shrink-0 bg-white text-[13px]"
                      options={[
                        { value: 'all', label: 'Semua section' },
                        ...fieldBreakSections.map((section) => ({
                          value: section,
                          label: section,
                        })),
                      ]}
                    />
                    <NativeSelect
                      value={fieldBreakSourceFilter}
                      onValueChange={setFieldBreakSourceFilter}
                      className="h-9 w-[130px] shrink-0 bg-white text-[13px]"
                      options={[
                        { value: 'all', label: 'Semua status' },
                        { value: 'auto', label: 'Auto' },
                        { value: 'manual', label: 'Manual' },
                        { value: 'locked', label: 'Locked' },
                      ]}
                    />
                    {fieldBreakSearch ||
                    fieldBreakSectionFilter !== 'all' ||
                    fieldBreakSourceFilter !== 'all' ? (
                      <Button
                        variant="ghost"
                        className="h-9 shrink-0 rounded-lg px-3"
                        onClick={() => {
                          setFieldBreakSearch('')
                          setFieldBreakSectionFilter('all')
                          setFieldBreakSourceFilter('all')
                        }}
                      >
                        <X className="size-4" /> Reset
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="relative max-h-[58vh] max-w-full overflow-x-auto overflow-y-auto">
                  <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="bg-surface-container-low text-muted-foreground sticky top-0 z-10 text-left text-[11px] tracking-[0.12em] uppercase">
                        <th
                          className="bg-surface-container-low border-border/60 sticky left-0 z-40 min-w-[220px] border-r px-4 py-3 font-medium"
                          style={{ left: 0 }}
                        >
                          Nama
                        </th>
                        <th className="px-4 py-3 font-medium">Section / Group</th>
                        <th className="px-4 py-3 font-medium">Last Field Break</th>
                        <th className="px-4 py-3 font-medium">Next Field Break</th>
                        <th className="px-4 py-3 font-medium">Selesai Field Break</th>
                        <th className="px-4 py-3 font-medium">Jeda</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="border-border border-r px-4 py-3 font-medium">Catatan</th>
                        {fieldBreakTimelineDays.map((timelineDay) => (
                          <th
                            key={timelineDay.date}
                            className="border-border min-w-[38px] border-r px-1 py-2 text-center text-[10px] font-semibold whitespace-nowrap"
                          >
                            <div className="text-muted-foreground/80">{timelineDay.month}</div>
                            <div className="mt-1 tabular-nums">{timelineDay.day}</div>
                            <div className="text-muted-foreground/70">{timelineDay.weekday}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFieldBreakRows.map((row) => (
                        <tr
                          key={row.employee.id}
                          className="border-border/30 hover:bg-surface-container-low/40 border-t transition"
                        >
                          <td
                            className="border-border/60 sticky left-0 z-30 min-w-[220px] border-r bg-white px-4 py-3 font-semibold shadow-[10px_0_18px_-16px_rgba(15,23,42,0.18)]"
                            style={{ left: 0 }}
                          >
                            <div className="max-w-[220px] truncate">{row.employee.name}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">{row.sectionLabel || '-'}</div>
                            <div className="text-muted-foreground text-xs">
                              {row.rosterSection || '-'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="date"
                              className="h-9 w-[150px]"
                              value={row.lastFieldBreakDate}
                              readOnly
                              title="Diambil otomatis dari roster aktif Schedule V2."
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="date"
                              className="h-9 w-[150px]"
                              value={row.fieldBreakDate}
                              min={
                                row.lastFieldBreakDate
                                  ? addDays(row.lastFieldBreakDate, fieldBreakWorkCycleDays)
                                  : undefined
                              }
                              onChange={(event) =>
                                updateFieldBreakDraft(
                                  row.employee.id,
                                  'fieldBreakDate',
                                  event.target.value
                                )
                              }
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="date"
                              className="h-9 w-[150px]"
                              value={row.fieldBreakEndDate}
                              min={row.fieldBreakDate || undefined}
                              onChange={(event) =>
                                updateFieldBreakDraft(
                                  row.employee.id,
                                  'fieldBreakEndDate',
                                  event.target.value
                                )
                              }
                            />
                          </td>
                          <td className="px-4 py-3 font-semibold tabular-nums">
                            {row.dayCount ?? '-'}
                          </td>
                          <td className="px-4 py-3">
                            <label className="flex min-h-10 items-center gap-2 text-xs font-semibold">
                              <input
                                type="checkbox"
                                checked={row.isLocked}
                                onChange={(event) =>
                                  updateFieldBreakMeta(row.employee.id, {
                                    isLocked: event.target.checked,
                                    source: 'manual',
                                  })
                                }
                              />
                              <Badge
                                variant={
                                  row.isLocked
                                    ? 'default'
                                    : row.source === 'auto'
                                      ? 'secondary'
                                      : 'outline'
                                }
                                className="rounded-lg"
                              >
                                {row.isLocked
                                  ? 'Locked'
                                  : row.source === 'auto'
                                    ? 'Auto'
                                    : 'Manual'}
                              </Badge>
                            </label>
                          </td>
                          <td className="border-border border-r px-4 py-3">
                            <Input
                              className="h-9 min-w-[220px]"
                              placeholder="Catatan"
                              value={row.notes}
                              onChange={(event) =>
                                updateFieldBreakMeta(row.employee.id, {
                                  notes: event.target.value,
                                  source: 'manual',
                                })
                              }
                            />
                          </td>
                          {fieldBreakTimelineDays.map((timelineDay) => {
                            const isBreak =
                              (row.fieldBreakDate &&
                                row.fieldBreakEndDate &&
                                timelineDay.date >= row.fieldBreakDate &&
                                timelineDay.date <= row.fieldBreakEndDate) ||
                              (fieldBreakTimelineByEmployee.get(row.employee.id) ?? []).some(
                                (plan) =>
                                  plan.fieldBreakDate &&
                                  timelineDay.date >= plan.fieldBreakDate &&
                                  timelineDay.date <=
                                    (plan.fieldBreakEndDate || plan.fieldBreakDate)
                              )
                            return (
                              <td
                                key={timelineDay.date}
                                title={isBreak ? 'Field Break' : timelineDay.date}
                                className={cn(
                                  'border-border h-[52px] min-w-[38px] border-r p-0',
                                  isBreak && 'bg-amber-100'
                                )}
                              >
                                {isBreak ? (
                                  <div className="mx-auto h-2 w-5 rounded-full bg-amber-400 opacity-70" />
                                ) : null}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      {filteredFieldBreakRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8 + fieldBreakTimelineDays.length}
                            className="px-4 py-12 text-center"
                          >
                            <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                              <span className="bg-surface-container-low text-muted-foreground grid size-10 place-items-center rounded-xl">
                                <Users className="size-4" />
                              </span>
                              <p className="text-foreground text-sm font-semibold">
                                Tidak ada baris cocok.
                              </p>
                              <p className="text-muted-foreground text-xs">
                                Reset filter atau pilih site lain.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                <div className="text-muted-foreground flex flex-col gap-2 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <span className="tabular-nums">
                    Menampilkan {filteredFieldBreakRows.length} dari {fieldBreakRows.length}{' '}
                    karyawan.
                  </span>
                  <span>Locked menjaga tanggal manual saat generate ulang.</span>
                </div>
              </Card>
            </section>
          </DialogContent>
        </Dialog>
      ) : null}

      {mode === 'payroll' && payrollWorkspaceOpen ? (
        <div className="border-border/60 flex items-center gap-1 rounded-xl border bg-white p-1.5 shadow-none">
          <Button
            size="sm"
            variant={payrollDetailTab === 'allowance' ? 'secondary' : 'ghost'}
            onClick={() => setPayrollDetailTab('allowance')}
            aria-pressed={payrollDetailTab === 'allowance'}
          >
            Benefit
          </Button>
          <Button
            size="sm"
            variant={payrollDetailTab === 'overtime' ? 'secondary' : 'ghost'}
            onClick={() => setPayrollDetailTab('overtime')}
            aria-pressed={payrollDetailTab === 'overtime'}
          >
            Overtime
          </Button>
          <div className="ml-auto flex items-center gap-1">
            {payrollDetailTab === 'allowance' ? (
              <TabExportActions
                tabTitle="MSA Meals"
                iconOnly
                excelInsteadOfCsv
                columns={[
                  'Section',
                  'Employee',
                  'Jabatan',
                  'Manpower',
                  'Staff',
                  'Hari MSA',
                  'FB',
                  'MSA',
                  'Meals',
                  'Tunjangan Khusus',
                  'Total',
                ]}
                exportRows={groupedPayrollRows.map((row) => [
                  payrollSectionLabel(row.rosterSection),
                  row.employee.name,
                  row.employee.role,
                  row.employee.manpower || 'Lokal',
                  row.staff ? 'Staff' : 'Non Staff',
                  row.msaDays,
                  row.fieldBreakDays,
                  money(row.msa),
                  money(row.meals),
                  money(row.specialAllowance),
                  money(row.msa + row.meals + row.specialAllowance),
                ])}
              />
            ) : (
              <TabExportActions
                tabTitle="Overtime"
                iconOnly
                excelInsteadOfCsv
                columns={[
                  'Section',
                  'Employee',
                  'Jabatan',
                  'Jam Attendance Real',
                  'Jam Dasar',
                  'Overtime',
                  'Roster',
                ]}
                exportRows={groupedAttendanceOvertimeRows.map((row) => [
                  payrollSectionLabel(row.rosterSection),
                  row.employee.name,
                  row.employee.role,
                  row.attendanceTotalHours,
                  row.attendanceBaseHours,
                  row.attendanceOvertime,
                  roster,
                ])}
              />
            )}
            <Button
              size="icon"
              disabled={isSavingPayroll || payrollRows.length === 0 || isFinalized}
              onClick={savePayrollSnapshot}
              aria-label={isSavingPayroll ? 'Menyimpan payroll' : 'Generate payroll'}
              title={isSavingPayroll ? 'Menyimpan payroll' : 'Generate payroll'}
            >
              <Save className="size-4" />
              <span className="sr-only">
                {isSavingPayroll ? 'Menyimpan payroll' : 'Generate payroll'}
              </span>
            </Button>
          </div>
        </div>
      ) : null}

      {mode === 'payroll' && payrollWorkspaceOpen && payrollDetailTab === 'allowance' ? (
        <section className="space-y-3">
          <SummaryTable
            columns={[
              'Employee',
              'Jabatan',
              'Manpower',
              'Staff',
              'Hari MSA',
              'FB',
              'MSA',
              'Meals',
              'Tunjangan Khusus',
              'Total',
            ]}
            sections={groupedPayrollRows.map((row) => payrollSectionLabel(row.rosterSection))}
            rows={groupedPayrollRows.map((row) => [
              row.employee.name,
              row.employee.role,
              row.employee.manpower || 'Lokal',
              row.staff ? 'Staff' : 'Non Staff',
              row.msaDays,
              row.fieldBreakDays,
              money(row.msa),
              money(row.meals),
              money(row.specialAllowance),
              money(row.msa + row.meals + row.specialAllowance),
            ])}
          />
        </section>
      ) : null}

      {mode === 'payroll' && payrollWorkspaceOpen && payrollDetailTab === 'overtime' ? (
        <section className="space-y-3">
          <SummaryTable
            columns={[
              'Employee',
              'Jabatan',
              'Jam Attendance Real',
              'Jam Dasar',
              'Overtime',
              'Roster',
            ]}
            sections={groupedAttendanceOvertimeRows.map((row) =>
              payrollSectionLabel(row.rosterSection)
            )}
            rows={groupedAttendanceOvertimeRows.map((row) => [
              row.employee.name,
              row.employee.role,
              row.attendanceTotalHours,
              row.attendanceBaseHours,
              row.attendanceOvertime,
              roster,
            ])}
          />
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
          {selectedAttendanceCell && selectedAttendanceValue
            ? (() => {
                const employeeRowForDialog = rows.find(
                  (r) => r.employee.id === selectedAttendanceCell.employeeId
                )
                const employeeScheduleForDialog = employeeRowForDialog?.schedule ?? []
                const isStaffForDialog = isStaffRole(selectedAttendanceEmployee?.role || '')
                const defaultOtCalculation = calculateDayOvertime(
                  employeeScheduleForDialog,
                  selectedAttendanceCell.day,
                  selectedAttendanceValue.clockIn,
                  selectedAttendanceValue.clockOut,
                  isStaffForDialog,
                  selectedAttendanceCell.employeeId,
                  true
                )
                const legacyOt = isStaffForDialog
                  ? 0
                  : calculateLegacyOvertime(
                      employeeScheduleForDialog,
                      selectedAttendanceCell.day,
                      selectedAttendanceValue.clockIn,
                      selectedAttendanceValue.clockOut
                    )
                const defaultOtHours = defaultOtCalculation.totalHours > 0 ? defaultOtCalculation.totalHours : legacyOt

                const onSaveAndClose = async () => {
                  const key = attendanceKey(
                    selectedAttendanceCell.employeeId,
                    selectedAttendanceCell.day
                  )
                  // When user hasn't changed anything, treat the shown default value as the intended override
                  const finalOt =
                    draftOvertimeHours === '' ? defaultOtHours : Number(draftOvertimeHours)
                  logClientActionAction(
                    `[CLIENT LOG] onSaveAndClose key=${key} draftOvertimeHours='${draftOvertimeHours}' finalOt=${finalOt}`
                  )
                  // Update local state immediately so UI reflects change
                  const updatedCell: ManualAttendanceCell = {
                    ...getAttendanceCell(
                      selectedAttendanceCell.employeeId,
                      selectedAttendanceCell.day
                    ),
                    ...selectedAttendanceValue,
                    overtimeHours: finalOt,
                    source: 'manual' as const,
                  }
                  setManualAttendance((prev) => ({ ...prev, [key]: updatedCell }))
                  setSelectedAttendanceCell(null)

                  // Save ONLY this single cell directly to the server
                  if (!guardOpenPeriod('Save attendance')) return
                  const numericSiteId = Number(siteId)
                  if (!Number.isFinite(numericSiteId) || numericSiteId <= 0 || isFinalized) return
                  startSavingAttendance(async () => {
                    try {
                      const result = await saveAttendanceRealOverridesAction({
                        siteId: numericSiteId,
                        period,
                        overrides: [
                          {
                            employeeId: selectedAttendanceCell.employeeId,
                            day: selectedAttendanceCell.day,
                            status: updatedCell.status,
                            clockIn: updatedCell.clockIn,
                            clockOut: updatedCell.clockOut,
                            note: updatedCell.note,
                            source: 'manual',
                            overtimeHours: finalOt,
                          },
                        ],
                      })
                      if (result.ok) {
                        router.refresh()
                        toast.success('Attendance saved')
                      }
                    } catch (error) {
                      toast.error('Save attendance failed', {
                        description: error instanceof Error ? error.message : 'Unknown error',
                      })
                    }
                  })
                }

                return (
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
                            { value: 'off', label: 'OFF (tetap dapat tunjangan)' },
                            { value: 'standby', label: 'Standby (ST)' },
                            { value: 'field_break', label: 'Field Break (GB)' },
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
                                status: event.target.value
                                  ? 'present'
                                  : selectedAttendanceValue.status,
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
                                status: event.target.value
                                  ? 'present'
                                  : selectedAttendanceValue.status,
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
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-2">
                        <Label
                          htmlFor="overtime-hours-override"
                          className="text-muted-foreground text-xs font-semibold tracking-wider uppercase"
                        >
                          Total Overtime:
                        </Label>
                        <Input
                          id="overtime-hours-override"
                          type="number"
                          step="1"
                          min="0"
                          max="24"
                          className="h-9 w-24"
                          value={draftOvertimeHours !== '' ? draftOvertimeHours : defaultOtHours}
                          onChange={(event) => {
                            setDraftOvertimeHours(event.target.value)
                          }}
                        />
                        {draftOvertimeHours !== '' &&
                          Number(draftOvertimeHours) !== defaultOtHours && (
                            <span className="text-xs font-medium text-amber-600 italic">
                              (Override)
                            </span>
                          )}
                      </div>
                      <Button onClick={onSaveAndClose}>Simpan</Button>
                    </div>
                  </div>
                )
              })()
            : null}
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
              <div className="space-y-2">
                <Label>Status Manpower</Label>
                <Input
                  value={
                    selectedEmployee &&
                    isNonLocalEmployee({
                      manpower: selectedEmployee.manpower,
                      pointOfHire: selectedEmployee.pointOfHire,
                      workLocations: [
                        selectedEmployee.workLocation,
                        selectedEmployee.siteLocation,
                        selectedEmployee.locationName,
                      ],
                    })
                      ? 'Non Lokal'
                      : 'Lokal'
                  }
                  readOnly
                  disabled
                />
                <p className="text-muted-foreground text-[11px]">
                  Berdasarkan POH/Hire dibanding lokasi kerja di Central Service &gt; Employee Data.
                </p>
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
                  return <p className="text-center text-sm text-slate-500">Tidak ada aktivitas.</p>
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

      <Dialog
        open={Boolean(pdfPreview)}
        onOpenChange={(open) => {
          if (!open && pdfPreview) {
            URL.revokeObjectURL(pdfPreview.url)
            setPdfPreview(null)
          }
        }}
      >
        <DialogContent className="max-w-[96vw] gap-0 overflow-hidden bg-white p-0">
          <DialogHeader className="flex flex-row items-center justify-between border-b p-4">
            <DialogTitle className="truncate pr-4 text-sm font-black text-[#082033]">
              {pdfPreview?.title ?? 'Preview PDF'}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[calc(100vh-140px)] min-h-[70vh] bg-[#f5f7fb]">
            {pdfPreview ? (
              <iframe
                src={pdfPreview.url}
                title={pdfPreview.title}
                className="h-full w-full"
              />
            ) : null}
          </div>
          <div className="flex items-center justify-end gap-2 border-t p-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (pdfPreview) {
                  URL.revokeObjectURL(pdfPreview.url)
                  setPdfPreview(null)
                }
              }}
            >
              <X className="mr-1.5 size-3.5" /> Tutup
            </Button>
            {pdfPreview ? (
              <Button size="sm" asChild>
                <a href={pdfPreview.url} download>
                  <Download className="mr-1.5 size-3.5" /> Download PDF
                </a>
              </Button>
            ) : null}
          </div>
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
      <AlertDialog
        open={Boolean(deleteScheduleHistoryTarget)}
        onOpenChange={(open) => !open && setDeleteScheduleHistoryTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus history roster?</AlertDialogTitle>
            <AlertDialogDescription>
              History roster {deleteScheduleHistoryTarget?.siteName} periode{' '}
              {deleteScheduleHistoryTarget?.period} akan dihapus. Data attendance tidak ikut
              dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingScheduleHistory}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={deleteScheduleHistory} disabled={isDeletingScheduleHistory}>
              Hapus History
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={finalizeDialogOpen} onOpenChange={setFinalizeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit periode ke HR</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Schedule V2 aktif, attendance aktual, conflict, dan payroll snapshot akan divalidasi
                sebelum dikirim.
              </AlertDescription>
            </Alert>
            <Input
              placeholder="Catatan untuk HR (opsional)"
              value={finalizeReason}
              onChange={(event) => setFinalizeReason(event.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFinalizeDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={submitFinalizePeriod} disabled={isSavingSchedule}>
                Submit ke HR
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
  sections,
}: {
  columns: string[]
  rows: Array<Array<string | number>>
  sections?: string[]
}) {
  return (
    <Card className="surface-module-card overflow-hidden rounded-[1.1rem] border-0 p-0">
      <div className="overflow-auto">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="bg-surface-container-low text-muted-foreground text-left text-[11px] tracking-[0.12em] uppercase">
              {columns.map((column) => (
                <TableHead key={column} className="px-4 py-2.5 font-medium">
                  {column}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, index) => (
              <React.Fragment key={index}>
                {sections?.[index] && sections[index] !== sections[index - 1] ? (
                  <TableRow className="bg-surface-container-low/70 border-border/40 border-t">
                    <TableCell
                      colSpan={columns.length}
                      className="text-foreground px-4 py-2 text-[11px] font-semibold tracking-[0.12em] uppercase"
                    >
                      {sections[index]}
                    </TableCell>
                  </TableRow>
                ) : null}
                <TableRow className="border-border/30 hover:bg-surface-container-low/40 border-t transition">
                  {row.map((cell, cellIndex) => (
                    <TableCell
                      key={cellIndex}
                      className={`px-4 py-3 ${cellIndex === 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              </React.Fragment>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground px-4 py-8 text-center text-sm"
                >
                  Belum ada data.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
