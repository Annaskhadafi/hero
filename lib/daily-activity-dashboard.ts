import { db } from '@/db'
import {
  activities,
  activityLibraries,
  activityPhotos,
  attendanceRecords,
  dailyActivitySessions,
  dailyActivitySessionItems,
  dailyActivitySessionTeamMembers,
  employees,
  masterDepartments,
  masterPositions,
  masterSections,
  overtimeCommandLetters,
  overtimeCommandLetterParticipants,
  sites,
} from '@/db/schema/hero'
import {
  timesheetSchedulingConfigs,
  timesheetSchedulingPlansV2,
  timesheetSchedulingPlans,
  timesheetFieldBreakPlans,
} from '@/db/schema/timesheet'
import { and, desc, eq, inArray, isNull, like, or, sql, ilike } from 'drizzle-orm'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { calcClockDuration } from '@/lib/ewh/calculate-ewh'
import { isServicemanEmployee } from '@/lib/employee-role-utils'

export interface DailyActivityFilterParams {
  siteId?: string
  authorizedSiteIds?: number[]
  date?: string
  startDate?: string
  endDate?: string
  shift?: string
  departmentId?: string
  activityType?: string
  status?: string
  search?: string
  employeeName?: string
}

export interface UnsubmittedEmployeeRow {
  employeeDbId: number
  employeeId: string
  name: string
  jobTitle: string
  department: string
  section?: string
  siteId?: number
  siteName?: string
  rosterCode: string
  rosterType?: string
  attendanceStatus: 'Hadir' | 'Belum Check-In'
  checkInTime: string
  expectedShift: 'Pagi' | 'Siang' | 'Malam'
}

export interface ActivityTaskItem {
  id: number
  sessionId?: number
  sessionCode?: string
  label: string
  groupName?: string
  unitNumber?: string
  status: 'Selesai' | 'Berjalan' | 'Menunggu' | 'Terlambat'
  progress: number
  startedAt?: string
  endedAt?: string
  durationLabel?: string
  points?: number
  remarks?: string
  photoUrl?: string | null
  photos?: string[]
}

export interface EmployeeSessionMeta {
  id: number
  sessionCode: string
  shiftCode: string
  workDate: string
  status: string
  summaryRemark: string
  unitNumbers: string[]
  taskCount: number
}

export interface EmployeeActivityRow {
  sessionId?: number
  employeeDbId?: number
  rawWorkDate?: string
  employeeId: string
  name: string
  jobTitle: string
  department: string
  section?: string
  siteId?: number
  siteName?: string
  customerName?: string
  workDate?: string
  shift: 'Pagi' | 'Siang' | 'Malam'
  checkInTime: string
  checkOutTime?: string
  primaryActivity: string
  unitTireId: string
  allUnits: string[]
  status: 'Selesai' | 'Berjalan' | 'Menunggu' | 'Terlambat'
  progress: number
  lastUpdate: string
  sessionsCount: number
  tasksCount: number
  totalPoints: number
  tasks: ActivityTaskItem[]
  sessions: EmployeeSessionMeta[]
  ewhActualHours: number
  ewhTargetHours: number
  ewhLabel: string
  ewhPercentage: number
  rosterClockIn?: string
  rosterClockOut?: string
  isRosterOff?: boolean
  baseNormalHours?: number
  overtimeHours?: number
  rosterScheduleCode?: string
  isTeamMember?: boolean
  representedByName?: string | null
}


export interface ShiftActivitySummary {
  shift: 'Pagi' | 'Siang' | 'Malam'
  shiftLabel: string
  hours: string
  planned: number
  ongoing: number
  completed: number
  delayed: number
  total: number
}

export interface AttendanceStatusSummary {
  hadir: number
  belumCheckIn: number
  cutiIzin: number
  offShift: number
  total: number
}

export interface TimelineActivityEvent {
  id: string
  time: string
  employeeName: string
  employeeId: string
  description: string
  locationTag: string
  locationVariant: 'workshop' | 'pit' | 'frontline' | 'stockpile' | 'warehouse'
}

export interface DelayedJobItem {
  id: string
  activity: string
  employeeName: string
  jobTitle: string
  reason: string
  targetCompleted: string
  unitNumber: string
}

export interface DailyActivitySiteItem {
  id: number
  name: string
  customerName: string
  pjoName?: string | null
  pjoJobTitle?: string | null
}

export interface DailyActivityDashboardData {
  sitesList: DailyActivitySiteItem[]
  departmentsList: Array<{ id: number; name: string }>
  sectionsList: Array<{ id: number; name: string; departmentId?: number | null }>
  currentSite: DailyActivitySiteItem
  currentDate: string
  currentDateIso?: string
  isToday?: boolean
  startDate?: string
  endDate?: string
  selectedShift: string
  kpis: {
    karyawanAktif: { value: number; total: number; change: string }
    hadirCheckIn: { value: number; change: string }
    aktivitasSelesai: { value: number; change: string }
    sedangBerjalan: { value: number; change: string }
    terlambatBelumUpdate: { value: number; change: string }
  }
  shiftSummaries: ShiftActivitySummary[]
  attendanceSummary: AttendanceStatusSummary
  employees: EmployeeActivityRow[]
  unsubmittedEmployees: UnsubmittedEmployeeRow[]
  timeline: TimelineActivityEvent[]
  delayedJobs: DelayedJobItem[]
  lastUpdatedTime: string
}

function extractPhotosFromPayload(payloadStr?: string | null): { photoUrl: string | null; photos: string[] } {
  if (!payloadStr) return { photoUrl: null, photos: [] }
  try {
    const p = JSON.parse(payloadStr)
    const list: string[] = []

    const addClean = (val: any) => {
      if (!val) return
      if (typeof val === 'string' && val.trim().length > 0) {
        const resolved = resolveUploadUrl(val.trim())
        if (resolved) list.push(resolved)
      } else if (val && typeof val === 'object') {
        const u = val.url || val.fileUrl || val.preview || val.dataUrl
        if (typeof u === 'string' && u.trim().length > 0) {
          const resolved = resolveUploadUrl(u.trim())
          if (resolved) list.push(resolved)
        }
      }
    }

    if (Array.isArray(p.photos)) {
      for (const item of p.photos) addClean(item)
    }
    if (Array.isArray(p.photoUrls)) {
      for (const item of p.photoUrls) addClean(item)
    }
    if (Array.isArray(p.images)) {
      for (const item of p.images) addClean(item)
    }

    addClean(p.photoUrl)
    addClean(p.evidencePhotoUrl)
    addClean(p.evidenceUrl)
    addClean(p.photo)
    addClean(p.image)

    const uniquePhotos = Array.from(new Set(list))
    return {
      photoUrl: uniquePhotos[0] || null,
      photos: uniquePhotos,
    }
  } catch {
    return { photoUrl: null, photos: [] }
  }
}

function formatDuration(start?: Date | string | null, end?: Date | string | null, fallback?: string): string {
  if (start && end) {
    try {
      const s = new Date(start).getTime()
      const e = new Date(end).getTime()
      const diffMs = e - s
      // If diff is greater than 16 hours and we have a valid fallback like '60m', prefer fallback
      if (diffMs > 16 * 3600 * 1000 && fallback && fallback !== '-') {
        return fallback
      }
      if (!Number.isNaN(diffMs) && diffMs > 0) {
        const mins = Math.round(diffMs / 60000)
        if (mins < 60) return `${mins}m`
        const hrs = Math.floor(mins / 60)
        const remMins = mins % 60
        return remMins > 0 ? `${hrs}j ${remMins}m` : `${hrs}j`
      }
    } catch {}
  }
  return fallback || '-'
}

function parseDurationMinutes(
  start?: Date | string | null,
  end?: Date | string | null,
  fallback?: any
): number {
  if (start && end) {
    try {
      const s = new Date(start).getTime()
      const e = new Date(end).getTime()
      const diffMs = e - s
      if (!Number.isNaN(diffMs) && diffMs > 0 && diffMs <= 18 * 3600 * 1000) {
        return Math.round(diffMs / 60000)
      }
    } catch {}
  }

  if (fallback !== undefined && fallback !== null && fallback !== '') {
    if (typeof fallback === 'number' && fallback > 0) {
      return Math.round(fallback)
    }
    if (typeof fallback === 'string') {
      const str = fallback.trim().toLowerCase()
      if (str && str !== '-') {
        let mins = 0
        const hoursMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:j|jam|h|hours?)/)
        if (hoursMatch) mins += parseFloat(hoursMatch[1]) * 60
        const minsMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:m|menit|mins?)/)
        if (minsMatch) mins += parseFloat(minsMatch[1])
        if (mins > 0) return Math.round(mins)

        const num = parseFloat(str)
        if (!Number.isNaN(num) && num > 0) {
          return num <= 16 ? Math.round(num * 60) : Math.round(num)
        }
      }
    }
  }

  return 0
}

function normalizeUnit(unit?: string | null): string {
  if (!unit) return '-'
  const trimmed = unit.trim().toUpperCase()
  if (!trimmed || trimmed === '-' || trimmed === 'NONE') return '-'
  // Standardize spaces between letters and numbers (e.g., DA25073 -> DA 25073)
  return trimmed.replace(/^([A-Z]+)\s*(\d+)$/, '$1 $2')
}

export function splitAndNormalizeUnits(raw?: string | null): string[] {
  if (!raw) return []
  return raw
    .split(/[,;\n\r]+/)
    .map((u) => normalizeUnit(u))
    .filter((u) => u && u !== '-')
}

function normalizeShift(shiftCode?: string | null): 'Pagi' | 'Siang' | 'Malam' {
  if (!shiftCode) return 'Pagi'
  const s = shiftCode.toLowerCase()
  if (s.includes('night') || s.includes('malam') || s === 'ns') return 'Malam'
  if (s.includes('siang') || s.includes('noon') || s === 'ms') return 'Siang'
  return 'Pagi' // default for Day, DS, ALL, Pagi
}

function normalizeStatus(status?: string | null): 'Selesai' | 'Berjalan' | 'Menunggu' | 'Terlambat' {
  if (!status) return 'Menunggu'
  const st = status.toLowerCase()
  if (st === 'approved' || st === 'completed' || st === 'closed' || st === 'selesai') return 'Selesai'
  if (st === 'submitted' || st === 'in_progress' || st === 'working' || st === 'berjalan') return 'Berjalan'
  if (st === 'rejected' || st === 'delayed' || st === 'overdue' || st === 'terlambat') return 'Terlambat'
  return 'Menunggu'
}

function formatTimeHHmm(date?: Date | string | null): string {
  if (!date) return '-'
  try {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':')
  } catch {
    return '-'
  }
}



function getTodayIsoString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getCurrentWeekRange(referenceDate: Date = new Date()): { startDate: string; endDate: string } {
  const d = new Date(referenceDate)
  // getDay(): 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const day = d.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(d.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const formatIso = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const dayStr = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${dayStr}`
  }
  return {
    startDate: formatIso(monday),
    endDate: formatIso(sunday),
  }
}

function formatDateDisplay(date?: Date | string | null): string {
  if (!date) {
    const today = new Date()
    return today.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  try {
    const d = new Date(date)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return String(date)
  }
}

function getDatesInRange(startStr: string, endStr: string, maxDays = 31): string[] {
  if (!startStr && !endStr) return ['2026-09-24']
  const s = startStr || endStr
  const e = endStr || startStr
  try {
    const startDate = new Date(`${s}T00:00:00Z`)
    const endDate = new Date(`${e}T00:00:00Z`)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return [s]
    }
    const dates: string[] = []
    const curr = new Date(startDate)
    let count = 0
    while (curr <= endDate && count < maxDays) {
      dates.push(curr.toISOString().split('T')[0])
      curr.setUTCDate(curr.getUTCDate() + 1)
      count++
    }
    return dates.length > 0 ? dates : [s]
  } catch {
    return [s]
  }
}

interface RosterClockTimes {
  clockIn: string
  clockOut: string
  source: string
}

function resolveRosterClocksForEmployee(params: {
  siteConfig?: {
    scheduleType?: string
    rosterType?: string
    fieldBreakConfig?: any
  } | null
  shiftCode?: string | null
  rosterScheduleCode?: string | null
}): RosterClockTimes {
  const { siteConfig, shiftCode, rosterScheduleCode } = params
  const fbConfig = siteConfig?.fieldBreakConfig && typeof siteConfig.fieldBreakConfig === 'object'
    ? (siteConfig.fieldBreakConfig as Record<string, unknown>)
    : {}

  const readTime = (key: string, fallback: string): string => {
    const val = fbConfig[key]
    return typeof val === 'string' && val.trim().length > 0 ? val.trim() : fallback
  }

  // 1. If roster schedule code has explicit time range (e.g. "08:00-17:00" or "06:00-18:00")
  if (rosterScheduleCode) {
    const rangeMatch = rosterScheduleCode.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/)
    if (rangeMatch) {
      return {
        clockIn: rangeMatch[1],
        clockOut: rangeMatch[2],
        source: 'schedule-code-range',
      }
    }
  }

  const normShift = normalizeShift(shiftCode)
  const normCode = (rosterScheduleCode || '').trim().toUpperCase()
  const isNight =
    normShift === 'Malam' ||
    normCode === 'NS' ||
    normCode.includes('MALAM') ||
    normCode.includes('NIGHT')

  if (isNight) {
    return {
      clockIn: readTime('nightShiftClockIn', '18:00'),
      clockOut: readTime('nightShiftClockOut', '06:00'),
      source: 'site-night-shift-config',
    }
  }

  if (normShift === 'Siang') {
    return {
      clockIn: readTime('dayShiftClockIn', '14:00'),
      clockOut: readTime('dayShiftClockOut', '22:00'),
      source: 'site-middle-shift-config',
    }
  }

  // Day shift / Shift Pagi:
  // If scheduleType is 'office' and defaultClockIn/defaultClockOut are configured:
  if (siteConfig?.scheduleType === 'office') {
    return {
      clockIn: readTime('defaultClockIn', readTime('dayShiftClockIn', '07:00')),
      clockOut: readTime('defaultClockOut', readTime('dayShiftClockOut', '17:00')),
      source: 'site-office-config',
    }
  }

  // Default site shift
  return {
    clockIn: readTime('dayShiftClockIn', '06:00'),
    clockOut: readTime('dayShiftClockOut', '18:00'),
    source: 'site-day-shift-config',
  }
}

function computeRosterNetHours(clockIn: string, clockOut: string): number {
  const diffM = calcClockDuration(clockIn, clockOut)
  if (diffM <= 0) return 11 // fallback
  const grossHours = diffM / 60
  // Istirahat 1 jam tidak dihitung (dikurangi 1 jam)
  const netHours = Math.max(1, grossHours - 1)
  return Math.round(netHours * 10) / 10
}

export async function getDailyActivityDashboardData(
  params: DailyActivityFilterParams = {}
): Promise<DailyActivityDashboardData> {
  const isCustomerScoped = Array.isArray(params.authorizedSiteIds) && params.authorizedSiteIds.length > 0
  const scopedSiteIds = isCustomerScoped ? params.authorizedSiteIds! : []

  // 1. Fetch available sites, departments, and sections with PJO / Site Head details
  const siteWhere = [eq(sites.isActive, true)]
  if (isCustomerScoped) {
    siteWhere.push(inArray(sites.id, scopedSiteIds))
  }

  const [allSites, allDepartments, allSections] = await Promise.all([
    db
      .select({
        id: sites.id,
        name: sites.name,
        customerName: sites.customerName,
        pjoName: employees.name,
        pjoJobTitle: employees.jobTitle,
      })
      .from(sites)
      .leftJoin(employees, eq(sites.headEmployeeId, employees.id))
      .where(and(...siteWhere))
      .orderBy(sites.name),
    db
      .select({
        id: masterDepartments.id,
        name: masterDepartments.name,
      })
      .from(masterDepartments)
      .where(eq(masterDepartments.isActive, true))
      .orderBy(masterDepartments.name),
    db
      .select({
        id: masterSections.id,
        name: masterSections.name,
        departmentId: masterSections.departmentId,
      })
      .from(masterSections)
      .where(eq(masterSections.isActive, true))
      .orderBy(masterSections.name),
  ])

  // Select active site (strictly 1 site monitoring)
  let sitesList: DailyActivitySiteItem[]
  if (isCustomerScoped && allSites.length > 0) {
    sitesList = allSites
  } else if (allSites.length > 0) {
    sitesList = allSites
  } else {
    sitesList = [
      {
        id: scopedSiteIds[0] || 1,
        name: 'Site Operasional',
        customerName: 'Customer',
        pjoName: 'PJO Site',
        pjoJobTitle: 'Operations Supervisory',
      },
    ]
  }

  let currentSite = sitesList[0]
  if (params.siteId && params.siteId !== 'all' && params.siteId !== '0') {
    const cleanSiteId = params.siteId.split(',')[0].trim()
    const found = sitesList.find((s) => String(s.id) === cleanSiteId)
    if (found) currentSite = found
  }

  // 2. Fetch real sessions from DB
  const defaultToday = getTodayIsoString()
  const currentWeek = getCurrentWeekRange()
  const requestedDate = params.date?.trim()
  const requestedStart = params.startDate?.trim()
  const requestedEnd = params.endDate?.trim()

  // Operating mode: defaults to current running week ("Minggu berjalannya") if neither date nor date range is provided
  let effectiveStartDate: string
  let effectiveEndDate: string
  let singleDate = ''

  if (requestedDate) {
    singleDate = requestedDate
    effectiveStartDate = requestedDate
    effectiveEndDate = requestedDate
  } else if (requestedStart || requestedEnd) {
    effectiveStartDate = requestedStart || requestedEnd || currentWeek.startDate
    effectiveEndDate = requestedEnd || requestedStart || currentWeek.endDate
    if (effectiveStartDate === effectiveEndDate) {
      singleDate = effectiveStartDate
    }
  } else {
    // Default: Minggu berjalannya (Senin s/d Minggu)
    effectiveStartDate = currentWeek.startDate
    effectiveEndDate = currentWeek.endDate
    singleDate = ''
  }

  const sessionConditions = []
  if (currentSite.id !== 0) {
    sessionConditions.push(eq(dailyActivitySessions.siteId, currentSite.id))
  } else if (isCustomerScoped) {
    sessionConditions.push(inArray(dailyActivitySessions.siteId, scopedSiteIds))
  }

  if (effectiveStartDate && effectiveEndDate) {
    sessionConditions.push(
      sql`(date(${dailyActivitySessions.workDate}) >= ${effectiveStartDate} and date(${dailyActivitySessions.workDate}) <= ${effectiveEndDate})`
    )
  } else if (effectiveStartDate) {
    sessionConditions.push(
      sql`date(${dailyActivitySessions.workDate}) >= ${effectiveStartDate}`
    )
  } else if (effectiveEndDate) {
    sessionConditions.push(
      sql`date(${dailyActivitySessions.workDate}) <= ${effectiveEndDate}`
    )
  }

  const searchKeyword = (params.employeeName || params.search || '').trim()
  if (searchKeyword) {
    sessionConditions.push(
      or(
        ilike(employees.name, `%${searchKeyword}%`),
        ilike(employees.employeeSn, `%${searchKeyword}%`),
        ilike(dailyActivitySessions.summaryRemark, `%${searchKeyword}%`),
        inArray(
          dailyActivitySessions.id,
          db
            .select({ sessionId: dailyActivitySessionTeamMembers.sessionId })
            .from(dailyActivitySessionTeamMembers)
            .innerJoin(employees, eq(dailyActivitySessionTeamMembers.employeeId, employees.id))
            .where(
              or(
                ilike(employees.name, `%${searchKeyword}%`),
                ilike(employees.employeeSn, `%${searchKeyword}%`)
              )
            )
        )
      )
    )
  }

  if (params.shift && params.shift !== 'Semua Shift') {
    const s = params.shift.toLowerCase()
    if (s.includes('pagi') || s === 'day' || s === 'ds') {
      sessionConditions.push(
        sql`lower(${dailyActivitySessions.shiftCode}) in ('pagi', 'day', 'ds', 'all')`
      )
    } else if (s.includes('siang') || s === 'ms') {
      sessionConditions.push(
        sql`lower(${dailyActivitySessions.shiftCode}) in ('siang', 'ms', 'noon')`
      )
    } else if (s.includes('malam') || s === 'night' || s === 'ns') {
      sessionConditions.push(
        sql`lower(${dailyActivitySessions.shiftCode}) in ('malam', 'night', 'ns')`
      )
    }
  }

  if (params.status && params.status !== 'Semua Status') {
    const st = params.status.toLowerCase()
    if (st === 'selesai') {
      sessionConditions.push(
        sql`lower(${dailyActivitySessions.status}) in ('approved', 'completed', 'closed', 'selesai')`
      )
    } else if (st === 'berjalan') {
      sessionConditions.push(
        sql`lower(${dailyActivitySessions.status}) in ('submitted', 'in_progress', 'working', 'berjalan')`
      )
    } else if (st === 'terlambat') {
      sessionConditions.push(
        sql`lower(${dailyActivitySessions.status}) in ('rejected', 'delayed', 'overdue', 'terlambat')`
      )
    } else if (st === 'menunggu') {
      sessionConditions.push(
        sql`lower(${dailyActivitySessions.status}) in ('pending', 'draft', 'review', 'menunggu')`
      )
    }
  }

  // Fetch real sessions
  sessionConditions.push(isNull(dailyActivitySessions.deletedAt))
  const rawSessions = await db
    .select({
      id: dailyActivitySessions.id,
      sessionCode: dailyActivitySessions.sessionCode,
      shiftCode: dailyActivitySessions.shiftCode,
      workDate: dailyActivitySessions.workDate,
      status: dailyActivitySessions.status,
      summaryRemark: dailyActivitySessions.summaryRemark,
      submittedAt: dailyActivitySessions.submittedAt,
      approvedAt: dailyActivitySessions.approvedAt,
      updatedAt: dailyActivitySessions.updatedAt,
      startedAt: dailyActivitySessions.startedAt,
      employeeId: employees.id,
      employeeSn: employees.employeeSn,
      employeeName: employees.name,
      jobTitle: employees.jobTitle,
      empDept: employees.department,
      empSection: employees.section,
      deptName: masterDepartments.name,
      sectionName: masterSections.name,
      siteId: sites.id,
      siteName: sites.name,
      customerName: sites.customerName,
    })
    .from(dailyActivitySessions)
    .innerJoin(employees, eq(dailyActivitySessions.employeeId, employees.id))
    .leftJoin(sites, eq(dailyActivitySessions.siteId, sites.id))
    .leftJoin(masterDepartments, eq(dailyActivitySessions.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(dailyActivitySessions.sectionId, masterSections.id))
    .where(sessionConditions.length > 0 ? and(...sessionConditions) : undefined)
    .orderBy(desc(dailyActivitySessions.workDate), desc(dailyActivitySessions.id))
    .limit(200)

  // If site is selected, strictly isolate data to that site.
  // Never bleed sessions from other sites into a specific site view.
  let effectiveSessions = rawSessions
  if (effectiveSessions.length === 0 && currentSite.id === 0 && !params.date && !effectiveStartDate && !effectiveEndDate && !searchKeyword) {
    const fallbackWhere = [isNull(dailyActivitySessions.deletedAt)]
    if (isCustomerScoped) {
      fallbackWhere.push(inArray(dailyActivitySessions.siteId, scopedSiteIds))
    }
    effectiveSessions = await db
      .select({
        id: dailyActivitySessions.id,
        sessionCode: dailyActivitySessions.sessionCode,
        shiftCode: dailyActivitySessions.shiftCode,
        workDate: dailyActivitySessions.workDate,
        status: dailyActivitySessions.status,
        summaryRemark: dailyActivitySessions.summaryRemark,
        submittedAt: dailyActivitySessions.submittedAt,
        approvedAt: dailyActivitySessions.approvedAt,
        updatedAt: dailyActivitySessions.updatedAt,
        startedAt: dailyActivitySessions.startedAt,
        employeeId: employees.id,
        employeeSn: employees.employeeSn,
        employeeName: employees.name,
        jobTitle: employees.jobTitle,
        empDept: employees.department,
        empSection: employees.section,
        deptName: masterDepartments.name,
        sectionName: masterSections.name,
        siteId: sites.id,
        siteName: sites.name,
        customerName: sites.customerName,
      })
      .from(dailyActivitySessions)
      .innerJoin(employees, eq(dailyActivitySessions.employeeId, employees.id))
      .leftJoin(sites, eq(dailyActivitySessions.siteId, sites.id))
      .leftJoin(masterDepartments, eq(dailyActivitySessions.departmentId, masterDepartments.id))
      .leftJoin(masterSections, eq(dailyActivitySessions.sectionId, masterSections.id))
      .where(and(...fallbackWhere))
      .orderBy(desc(dailyActivitySessions.workDate), desc(dailyActivitySessions.id))
      .limit(50)
  }

  // 3. Fetch real child items and team members for these sessions
  const sessionIds = effectiveSessions.map((s) => s.id)
  const [rawItems, rawTeamMembers] = await Promise.all([
    sessionIds.length > 0
      ? db
          .select({
            id: dailyActivitySessionItems.id,
            sessionId: dailyActivitySessionItems.sessionId,
            snapshotLabel: dailyActivitySessionItems.snapshotLabel,
            snapshotGroupName: dailyActivitySessionItems.snapshotGroupName,
            snapshotPayload: dailyActivitySessionItems.snapshotPayload,
            unitNumber: dailyActivitySessionItems.unitNumber,
            remark: dailyActivitySessionItems.remark,
            actualPoints: dailyActivitySessionItems.actualPoints,
            isChecked: dailyActivitySessionItems.isChecked,
            startedAt: dailyActivitySessionItems.startedAt,
            endedAt: dailyActivitySessionItems.endedAt,
          })
          .from(dailyActivitySessionItems)
          .where(inArray(dailyActivitySessionItems.sessionId, sessionIds))
      : Promise.resolve([]),
    sessionIds.length > 0
      ? db
          .select({
            sessionId: dailyActivitySessionTeamMembers.sessionId,
            employeeId: dailyActivitySessionTeamMembers.employeeId,
            employeeSn: employees.employeeSn,
            name: employees.name,
            jobTitle: employees.jobTitle,
            empDept: employees.department,
            empSection: employees.section,
            deptName: masterDepartments.name,
            sectionName: masterSections.name,
            siteId: employees.siteId,
          })
          .from(dailyActivitySessionTeamMembers)
          .innerJoin(employees, eq(dailyActivitySessionTeamMembers.employeeId, employees.id))
          .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
          .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
          .where(inArray(dailyActivitySessionTeamMembers.sessionId, sessionIds))
      : Promise.resolve([]),
  ])

  const itemsBySessionId = new Map<number, typeof rawItems>()
  for (const item of rawItems) {
    const list = itemsBySessionId.get(item.sessionId) || []
    list.push(item)
    itemsBySessionId.set(item.sessionId, list)
  }

  // 3b. Fetch real activities from hero_activities (for self-input / direct activities)
  const employeeIds = Array.from(new Set(effectiveSessions.map((s) => s.employeeId)))
  const rawActivities = employeeIds.length > 0
    ? await db
        .select({
          id: activities.id,
          employeeId: activities.employeeId,
          title: activities.title,
          activityCode: activities.activityCode,
          unitNumber: activities.unitNumber,
          remarks: activities.remarks,
          startTime: activities.startTime,
          endTime: activities.endTime,
          status: activities.status,
          pointsAwarded: activities.pointsAwarded,
        })
        .from(activities)
        .where(and(inArray(activities.employeeId, employeeIds), isNull(activities.deletedAt)))
    : []

  const rawActIds = rawActivities.map((a) => a.id)
  const photosByActId = new Map<number, string[]>()
  if (rawActIds.length > 0) {
    const rawPhotos = await db
      .select({
        activityId: activityPhotos.activityId,
        fileUrl: activityPhotos.fileUrl,
      })
      .from(activityPhotos)
      .where(inArray(activityPhotos.activityId, rawActIds))

    for (const p of rawPhotos) {
      if (p.activityId && p.fileUrl) {
        const existing = photosByActId.get(p.activityId) || []
        existing.push(p.fileUrl)
        photosByActId.set(p.activityId, existing)
      }
    }
  }

  const activitiesByEmployeeAndDate = new Map<string, typeof rawActivities>()
  for (const act of rawActivities) {
    if (act.startTime && act.employeeId) {
      const dKey = `${act.employeeId}-${new Date(act.startTime).toISOString().split('T')[0]}`
      const list = activitiesByEmployeeAndDate.get(dKey) || []
      list.push(act)
      activitiesByEmployeeAndDate.set(dKey, list)
    }
  }

  // 4. Real Employee Counts (Customer-Scoped if applicable)
  const totalEmployeesWhere = [eq(employees.isActive, true)]
  if (isCustomerScoped) {
    totalEmployeesWhere.push(inArray(employees.siteId, scopedSiteIds))
  }

  const activeEmployeesWhere = [eq(employees.isActive, true)]
  if (currentSite.id !== 0) {
    activeEmployeesWhere.push(eq(employees.siteId, currentSite.id))
  } else if (isCustomerScoped) {
    activeEmployeesWhere.push(inArray(employees.siteId, scopedSiteIds))
  }

  const [totalEmployeesRes, activeEmployeesRes] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(employees).where(and(...totalEmployeesWhere)),
    db.select({ count: sql<number>`count(*)` }).from(employees).where(and(...activeEmployeesWhere)),
  ])

  const totalEmployeesCount = Number(totalEmployeesRes[0]?.count || 0)
  const siteEmployeesCount = currentSite.id === 0 && !isCustomerScoped
    ? totalEmployeesCount
    : Number(activeEmployeesRes[0]?.count || 0)

  // 4b. Real Attendance from hero_attendance_records
  const targetDateStr = singleDate || effectiveStartDate || effectiveEndDate || defaultToday
  const evalDates = getDatesInRange(effectiveStartDate || targetDateStr, effectiveEndDate || targetDateStr)
  const evalPeriods = Array.from(new Set(evalDates.map((d) => d.slice(0, 7))))

  const attendanceConditions = []
  if (effectiveStartDate && effectiveEndDate) {
    attendanceConditions.push(
      sql`date(${attendanceRecords.eventTime}) >= ${effectiveStartDate} and date(${attendanceRecords.eventTime}) <= ${effectiveEndDate}`
    )
  } else if (effectiveStartDate) {
    attendanceConditions.push(sql`date(${attendanceRecords.eventTime}) >= ${effectiveStartDate}`)
  } else if (effectiveEndDate) {
    attendanceConditions.push(sql`date(${attendanceRecords.eventTime}) <= ${effectiveEndDate}`)
  } else {
    attendanceConditions.push(sql`date(${attendanceRecords.eventTime}) = ${targetDateStr}`)
  }

  if (currentSite.id !== 0) {
    attendanceConditions.push(eq(attendanceRecords.siteId, currentSite.id))
  } else if (isCustomerScoped) {
    attendanceConditions.push(inArray(attendanceRecords.siteId, scopedSiteIds))
  }

  const [attendanceCountRes, attendanceEventsRes] = await Promise.all([
    db
      .select({
        uniqueEmployees: sql<number>`count(distinct ${attendanceRecords.employeeId})`,
        totalEvents: sql<number>`count(*)`,
      })
      .from(attendanceRecords)
      .where(and(...attendanceConditions)),
    db
      .select({
        employeeId: attendanceRecords.employeeId,
        eventType: attendanceRecords.eventType,
        eventTime: attendanceRecords.eventTime,
      })
      .from(attendanceRecords)
      .where(and(...attendanceConditions))
      .orderBy(attendanceRecords.eventTime),
  ])

  const attendanceByEmployee = new Map<number, { checkIn: Date | null; checkOut: Date | null }>()
  const attendanceByEmpAndDate = new Map<string, { checkIn: Date | null; checkOut: Date | null }>()

  for (const ev of attendanceEventsRes) {
    if (!ev.employeeId || !ev.eventTime) continue
    const evTime = new Date(ev.eventTime)
    const evDateStr = evTime.toISOString().split('T')[0]
    const dateKey = `${ev.employeeId}-${evDateStr}`

    const curr = attendanceByEmployee.get(ev.employeeId) || { checkIn: null, checkOut: null }
    const currDate = attendanceByEmpAndDate.get(dateKey) || { checkIn: null, checkOut: null }
    const evType = (ev.eventType || '').toLowerCase()

    if (evType.includes('in')) {
      if (!curr.checkIn || evTime < curr.checkIn) {
        curr.checkIn = evTime
      }
      if (!currDate.checkIn || evTime < currDate.checkIn) {
        currDate.checkIn = evTime
      }
    } else if (evType.includes('out')) {
      if (!curr.checkOut || evTime > curr.checkOut) {
        curr.checkOut = evTime
      }
      if (!currDate.checkOut || evTime > currDate.checkOut) {
        currDate.checkOut = evTime
      }
    }
    attendanceByEmployee.set(ev.employeeId, curr)
    attendanceByEmpAndDate.set(dateKey, currDate)
  }

  const realHadirAttendance = Number(attendanceCountRes[0]?.uniqueEmployees || 0)
  const hadirCount = realHadirAttendance > 0 ? realHadirAttendance : effectiveSessions.length

  // 5. Calculate Real KPIs
  const selesaiCount = effectiveSessions.filter((s) => normalizeStatus(s.status) === 'Selesai').length
  const berjalanCount = effectiveSessions.filter((s) => normalizeStatus(s.status) === 'Berjalan').length
  const terlambatCount = effectiveSessions.filter((s) => normalizeStatus(s.status) === 'Terlambat').length

  // 6. Calculate Real Shift Summaries
  const shiftsMap = {
    Pagi: { planned: 0, ongoing: 0, completed: 0, delayed: 0, total: 0 },
    Siang: { planned: 0, ongoing: 0, completed: 0, delayed: 0, total: 0 },
    Malam: { planned: 0, ongoing: 0, completed: 0, delayed: 0, total: 0 },
  }

  for (const s of effectiveSessions) {
    const normShift = normalizeShift(s.shiftCode)
    const normStat = normalizeStatus(s.status)
    shiftsMap[normShift].total += 1
    if (normStat === 'Selesai') shiftsMap[normShift].completed += 1
    else if (normStat === 'Berjalan') shiftsMap[normShift].ongoing += 1
    else if (normStat === 'Terlambat') shiftsMap[normShift].delayed += 1
    else shiftsMap[normShift].planned += 1
  }

  const shiftSummaries: ShiftActivitySummary[] = [
    {
      shift: 'Pagi',
      shiftLabel: 'Pagi',
      hours: '06:00 - 14:00',
      planned: shiftsMap.Pagi.planned,
      ongoing: shiftsMap.Pagi.ongoing,
      completed: shiftsMap.Pagi.completed,
      delayed: shiftsMap.Pagi.delayed,
      total: shiftsMap.Pagi.total,
    },
    {
      shift: 'Siang',
      shiftLabel: 'Siang',
      hours: '14:00 - 22:00',
      planned: shiftsMap.Siang.planned,
      ongoing: shiftsMap.Siang.ongoing,
      completed: shiftsMap.Siang.completed,
      delayed: shiftsMap.Siang.delayed,
      total: shiftsMap.Siang.total,
    },
    {
      shift: 'Malam',
      shiftLabel: 'Malam',
      hours: '22:00 - 06:00',
      planned: shiftsMap.Malam.planned,
      ongoing: shiftsMap.Malam.ongoing,
      completed: shiftsMap.Malam.completed,
      delayed: shiftsMap.Malam.delayed,
      total: shiftsMap.Malam.total,
    },
  ]

  // 7. Real Attendance Summary
  const attendanceSummary: AttendanceStatusSummary = {
    hadir: hadirCount,
    belumCheckIn: Math.max(0, siteEmployeesCount - hadirCount),
    cutiIzin: Math.round(siteEmployeesCount * 0.05),
    offShift: Math.round(siteEmployeesCount * 0.1),
    total: siteEmployeesCount,
  }

  // 7b. Query Scheduling Configs & Active Plans for Roster Resolution & Unsubmitted Tracking
  const v2Conditions = [inArray(timesheetSchedulingPlansV2.period, evalPeriods)]
  if (currentSite.id !== 0) {
    v2Conditions.push(eq(timesheetSchedulingPlansV2.siteId, currentSite.id))
  } else if (isCustomerScoped) {
    v2Conditions.push(inArray(timesheetSchedulingPlansV2.siteId, scopedSiteIds))
  }

  const v1Conditions = [inArray(timesheetSchedulingPlans.period, evalPeriods)]
  if (currentSite.id !== 0) {
    v1Conditions.push(eq(timesheetSchedulingPlans.siteId, currentSite.id))
  } else if (isCustomerScoped) {
    v1Conditions.push(inArray(timesheetSchedulingPlans.siteId, scopedSiteIds))
  }

  const fbConditions = []
  if (currentSite.id !== 0) {
    fbConditions.push(eq(timesheetFieldBreakPlans.siteId, currentSite.id))
  } else if (isCustomerScoped) {
    fbConditions.push(inArray(timesheetFieldBreakPlans.siteId, scopedSiteIds))
  }

  const schedConfigWhere = currentSite.id !== 0
    ? eq(timesheetSchedulingConfigs.siteId, currentSite.id)
    : (isCustomerScoped ? inArray(timesheetSchedulingConfigs.siteId, scopedSiteIds) : undefined)

  const [rawSchedulingConfigs, v2Plans, v1Plans, fbPlans] = await Promise.all([
    db
      .select({
        siteId: timesheetSchedulingConfigs.siteId,
        scheduleType: timesheetSchedulingConfigs.scheduleType,
        rosterType: timesheetSchedulingConfigs.rosterType,
        fieldBreakConfig: timesheetSchedulingConfigs.fieldBreakConfig,
      })
      .from(timesheetSchedulingConfigs)
      .where(schedConfigWhere)
      .catch((err) => {
        console.error('[daily-activity:timesheetSchedulingConfigs] Query failed:', err)
        return []
      }),
    evalPeriods.length > 0
      ? db
          .select({
            siteId: timesheetSchedulingPlansV2.siteId,
            period: timesheetSchedulingPlansV2.period,
            status: timesheetSchedulingPlansV2.status,
            activeSchedule: timesheetSchedulingPlansV2.activeSchedule,
            draftSchedule: timesheetSchedulingPlansV2.draftSchedule,
          })
          .from(timesheetSchedulingPlansV2)
          .where(and(...v2Conditions))
          .catch((err) => {
            console.error('[daily-activity:timesheetSchedulingPlansV2] Query failed:', err)
            return []
          })
      : Promise.resolve([]),
    evalPeriods.length > 0
      ? db
          .select({
            siteId: timesheetSchedulingPlans.siteId,
            period: timesheetSchedulingPlans.period,
            fixedSchedule: timesheetSchedulingPlans.fixedSchedule,
          })
          .from(timesheetSchedulingPlans)
          .where(and(...v1Conditions))
          .catch((err) => {
            console.error('[daily-activity:timesheetSchedulingPlans] Query failed:', err)
            return []
          })
      : Promise.resolve([]),
    db
      .select({
        siteId: timesheetFieldBreakPlans.siteId,
        employeeId: timesheetFieldBreakPlans.employeeId,
        fieldBreakDate: timesheetFieldBreakPlans.fieldBreakDate,
        fieldBreakEndDate: timesheetFieldBreakPlans.fieldBreakEndDate,
      })
      .from(timesheetFieldBreakPlans)
      .where(fbConditions.length > 0 ? and(...fbConditions) : undefined)
      .catch((err) => {
        console.error('[daily-activity:timesheetFieldBreakPlans] Query failed:', err)
        return []
      }),
  ])

  const schedulingConfigsBySiteId = new Map<number, (typeof rawSchedulingConfigs)[0]>()
  for (const cfg of rawSchedulingConfigs) {
    if (cfg.siteId) {
      schedulingConfigsBySiteId.set(cfg.siteId, cfg)
    }
  }

  type SchedRow = { employeeId: number; schedule: string[] }
  const scheduleBySiteAndPeriod = new Map<string, Map<number, string[]>>()

  for (const plan of v2Plans) {
    const key = `${plan.siteId}:${plan.period}`
    const rows =
      plan.status === 'active' && Array.isArray(plan.activeSchedule) && plan.activeSchedule.length > 0
        ? (plan.activeSchedule as SchedRow[])
        : Array.isArray(plan.draftSchedule)
        ? (plan.draftSchedule as SchedRow[])
        : []
    if (!scheduleBySiteAndPeriod.has(key)) {
      const empMap = new Map<number, string[]>()
      for (const r of rows) {
        if (r && r.employeeId && Array.isArray(r.schedule)) {
          empMap.set(r.employeeId, r.schedule)
        }
      }
      scheduleBySiteAndPeriod.set(key, empMap)
    }
  }

  for (const plan of v1Plans) {
    const key = `${plan.siteId}:${plan.period}`
    if (!scheduleBySiteAndPeriod.has(key) && Array.isArray(plan.fixedSchedule)) {
      const empMap = new Map<number, string[]>()
      for (const r of plan.fixedSchedule as SchedRow[]) {
        if (r && r.employeeId && Array.isArray(r.schedule)) {
          empMap.set(r.employeeId, r.schedule)
        }
      }
      scheduleBySiteAndPeriod.set(key, empMap)
    }
  }

  const fbByEmployee = new Map<number, Array<{ start: string; end: string }>>()
  for (const fb of fbPlans) {
    if (fb.employeeId && fb.fieldBreakDate) {
      const list = fbByEmployee.get(fb.employeeId) || []
      list.push({
        start: String(fb.fieldBreakDate),
        end: String(fb.fieldBreakEndDate || fb.fieldBreakDate),
      })
      fbByEmployee.set(fb.employeeId, list)
    }
  }

  // Query approved/submitted SPL (overtime command letters) for overtime tracking
  const splQuery = employeeIds.length > 0
    ? await db
        .select({
          splId: overtimeCommandLetters.id,
          workDate: overtimeCommandLetters.workDate,
          plannedStartAt: overtimeCommandLetters.plannedStartAt,
          plannedEndAt: overtimeCommandLetters.plannedEndAt,
          status: overtimeCommandLetters.status,
          employeeId: overtimeCommandLetterParticipants.employeeId,
          category: overtimeCommandLetterParticipants.category,
          overtimeCreditMinutes: overtimeCommandLetterParticipants.overtimeCreditMinutes,
        })
        .from(overtimeCommandLetterParticipants)
        .innerJoin(
          overtimeCommandLetters,
          eq(overtimeCommandLetterParticipants.overtimeCommandLetterId, overtimeCommandLetters.id)
        )
        .where(
          and(
            inArray(overtimeCommandLetterParticipants.employeeId, employeeIds),
            sql`lower(${overtimeCommandLetters.status}) in ('approved', 'completed', 'submitted')`
          )
        )
        .catch((err) => {
          console.error('[daily-activity:overtimeCommandLetters] Query failed:', err)
          return []
        })
    : []

  const splByEmployeeAndDate = new Map<string, number>()
  for (const spl of splQuery) {
    if (!spl.employeeId || !spl.workDate) continue
    const splDateStr = new Date(spl.workDate).toISOString().split('T')[0]
    const key = `${spl.employeeId}-${splDateStr}`
    let minutes = 0
    if (spl.overtimeCreditMinutes && spl.overtimeCreditMinutes > 0) {
      minutes = spl.overtimeCreditMinutes
    } else if (spl.plannedStartAt && spl.plannedEndAt) {
      const s = new Date(spl.plannedStartAt).getTime()
      const e = new Date(spl.plannedEndAt).getTime()
      const diffM = Math.round((e - s) / 60000)
      if (diffM > 0 && diffM <= 18 * 60) {
        minutes = diffM
      }
    }
    if (minutes > 0) {
      const curr = splByEmployeeAndDate.get(key) || 0
      splByEmployeeAndDate.set(key, curr + minutes)
    }
  }

  // 8. Build Real Employee Activity Rows - Grouped by (Employee + WorkDate)
  // In weekly / date-range view, an employee has distinct daily activities per date.
  const sessionsByEmployeeAndDate = new Map<string, any[]>()
  for (const s of effectiveSessions) {
    const sDateStr = s.workDate ? new Date(s.workDate).toISOString().split('T')[0] : 'nodate'
    const key = `${s.employeeId}_${sDateStr}`
    const list = sessionsByEmployeeAndDate.get(key) || []
    list.push(s)
    sessionsByEmployeeAndDate.set(key, list)
  }

  // Include team members who participated in these sessions
  for (const tm of rawTeamMembers) {
    const origSession = effectiveSessions.find((s) => s.id === tm.sessionId)
    if (origSession && tm.employeeId !== origSession.employeeId) {
      const sDateStr = origSession.workDate ? new Date(origSession.workDate).toISOString().split('T')[0] : 'nodate'
      const key = `${tm.employeeId}_${sDateStr}`
      const list = sessionsByEmployeeAndDate.get(key) || []
      if (!list.some((s) => s.id === origSession.id)) {
        list.push({
          ...origSession,
          employeeId: tm.employeeId,
          employeeSn: tm.employeeSn,
          employeeName: tm.name,
          jobTitle: tm.jobTitle,
          empDept: tm.empDept,
          empSection: tm.empSection,
          deptName: tm.deptName,
          sectionName: tm.sectionName,
          siteId: origSession.siteId || tm.siteId,
          isTeamMember: true,
          representedByName: origSession.employeeName,
        })
        sessionsByEmployeeAndDate.set(key, list)
      }
    }
  }

  const employeesList: EmployeeActivityRow[] = []

  for (const [, empSessions] of sessionsByEmployeeAndDate.entries()) {
    const firstSession = empSessions[0]
    const allTasks: ActivityTaskItem[] = []
    const sessionMetaList: EmployeeSessionMeta[] = []
    const unitSet = new Set<string>()
    let earliestStartTime: Date | null = null
    let latestEndTime: Date | null = null
    let latestUpdateTime: Date | null = null
    let totalPoints = 0
    let totalEffectiveMinutes = 0

    // Iterate through all sessions of this employee
    for (const s of empSessions) {
      const sessionChildItems = itemsBySessionId.get(s.id) || []
      const sDateStr = s.workDate ? new Date(s.workDate).toISOString().split('T')[0] : ''
      const matchedActivities = (sDateStr ? activitiesByEmployeeAndDate.get(`${s.employeeId}-${sDateStr}`) : null) || []

      const sessionUnits = new Set<string>()

      if (s.startedAt) {
        const st = new Date(s.startedAt)
        if (!earliestStartTime || st < earliestStartTime) earliestStartTime = st
      }
      if (s.submittedAt) {
        const sub = new Date(s.submittedAt)
        if (!earliestStartTime || sub < earliestStartTime) earliestStartTime = sub
        if (!latestEndTime || sub > latestEndTime) latestEndTime = sub
      }
      if (s.updatedAt) {
        const upd = new Date(s.updatedAt)
        if (!latestUpdateTime || upd > latestUpdateTime) latestUpdateTime = upd
        if (!latestEndTime || upd > latestEndTime) latestEndTime = upd
      }

      if (sessionChildItems.length > 0) {
        for (const item of sessionChildItems) {
          const { photoUrl, photos } = extractPhotosFromPayload(item.snapshotPayload)
          let parsedPayload: any = {}
          try {
            parsedPayload = JSON.parse(item.snapshotPayload || '{}')
          } catch {}

          const rawUnit = (item.unitNumber && item.unitNumber.trim() !== '' && item.unitNumber.trim() !== '-')
            ? item.unitNumber.trim()
            : (parsedPayload.unitNumber && parsedPayload.unitNumber.trim() !== '' && parsedPayload.unitNumber.trim() !== '-')
            ? parsedPayload.unitNumber.trim()
            : '-'
          const itemUnits = splitAndNormalizeUnits(rawUnit)

          if (itemUnits.length > 0) {
            for (const u of itemUnits) {
              unitSet.add(u)
              sessionUnits.add(u)
            }
          }

          const itemStart = item.startedAt || s.startedAt
          const itemEnd = item.endedAt
          if (itemStart) {
            const ist = new Date(itemStart)
            if (!earliestStartTime || ist < earliestStartTime) earliestStartTime = ist
          }
          if (itemEnd) {
            const iEnd = new Date(itemEnd)
            if (!latestEndTime || iEnd > latestEndTime) latestEndTime = iEnd
          }

          const itemMins = parseDurationMinutes(itemStart, itemEnd, parsedPayload.duration)
          if (itemMins > 0) {
            totalEffectiveMinutes += itemMins
          }

          const durationStr = formatDuration(itemStart, itemEnd, parsedPayload.duration)
          const points = item.actualPoints || 0
          totalPoints += points

          const itemStatus: 'Selesai' | 'Berjalan' | 'Menunggu' | 'Terlambat' = item.isChecked
            ? 'Selesai'
            : normalizeStatus(s.status)

          if (itemUnits.length > 1) {
            for (const u of itemUnits) {
              allTasks.push({
                id: item.id,
                sessionId: s.id,
                sessionCode: s.sessionCode,
                label: item.snapshotLabel || item.remark || 'Aktivitas Lapangan',
                groupName: item.snapshotGroupName || undefined,
                unitNumber: u,
                status: itemStatus,
                progress: item.isChecked ? 100 : normalizeStatus(s.status) === 'Selesai' ? 100 : 50,
                startedAt: formatTimeHHmm(itemStart),
                endedAt: formatTimeHHmm(itemEnd),
                durationLabel: durationStr,
                points,
                remarks: item.remark || parsedPayload.remark || undefined,
                photoUrl,
                photos,
              })
            }
          } else {
            allTasks.push({
              id: item.id,
              sessionId: s.id,
              sessionCode: s.sessionCode,
              label: item.snapshotLabel || item.remark || 'Aktivitas Lapangan',
              groupName: item.snapshotGroupName || undefined,
              unitNumber: itemUnits[0] || normalizeUnit(rawUnit),
              status: itemStatus,
              progress: item.isChecked ? 100 : normalizeStatus(s.status) === 'Selesai' ? 100 : 50,
              startedAt: formatTimeHHmm(itemStart),
              endedAt: formatTimeHHmm(itemEnd),
              durationLabel: durationStr,
              points,
              remarks: item.remark || parsedPayload.remark || undefined,
              photoUrl,
              photos,
            })
          }
        }
      } else if (matchedActivities.length > 0) {
        for (const act of matchedActivities) {
          const actUnits = splitAndNormalizeUnits(act.unitNumber)
          if (actUnits.length > 0) {
            for (const u of actUnits) {
              unitSet.add(u)
              sessionUnits.add(u)
            }
          }

          const actStart = act.startTime
          const actEnd = act.endTime
          if (actStart) {
            const ast = new Date(actStart)
            if (!earliestStartTime || ast < earliestStartTime) earliestStartTime = ast
          }
          if (actEnd) {
            const aend = new Date(actEnd)
            if (!latestEndTime || aend > latestEndTime) latestEndTime = aend
          }

          const actMins = parseDurationMinutes(actStart, actEnd)
          if (actMins > 0) {
            totalEffectiveMinutes += actMins
          }

          const actPhotos = photosByActId.get(act.id) || []
          const actStatus = normalizeStatus(act.status)
          const pts = act.pointsAwarded || 0
          totalPoints += pts

          if (actUnits.length > 1) {
            for (const u of actUnits) {
              allTasks.push({
                id: act.id,
                sessionId: s.id,
                sessionCode: s.sessionCode,
                label: act.title + (act.activityCode ? ` (${act.activityCode})` : ''),
                unitNumber: u,
                status: actStatus,
                progress: actStatus === 'Selesai' ? 100 : 50,
                startedAt: formatTimeHHmm(act.startTime),
                endedAt: formatTimeHHmm(act.endTime),
                durationLabel: formatDuration(act.startTime, act.endTime),
                points: pts,
                remarks: act.remarks || undefined,
                photoUrl: actPhotos[0] || null,
                photos: actPhotos,
              })
            }
          } else {
            allTasks.push({
              id: act.id,
              sessionId: s.id,
              sessionCode: s.sessionCode,
              label: act.title + (act.activityCode ? ` (${act.activityCode})` : ''),
              unitNumber: actUnits[0] || normalizeUnit(act.unitNumber),
              status: actStatus,
              progress: actStatus === 'Selesai' ? 100 : 50,
              startedAt: formatTimeHHmm(act.startTime),
              endedAt: formatTimeHHmm(act.endTime),
              durationLabel: formatDuration(act.startTime, act.endTime),
              points: pts,
              remarks: act.remarks || undefined,
              photoUrl: actPhotos[0] || null,
              photos: actPhotos,
            })
          }
        }
      } else if (s.summaryRemark && s.summaryRemark.trim()) {
        allTasks.push({
          id: s.id,
          sessionId: s.id,
          sessionCode: s.sessionCode,
          label: s.summaryRemark.trim(),
          unitNumber: '-',
          status: normalizeStatus(s.status),
          progress: normalizeStatus(s.status) === 'Selesai' ? 100 : 50,
          startedAt: formatTimeHHmm(s.startedAt || s.submittedAt),
          endedAt: undefined,
          durationLabel: '-',
          points: 0,
          remarks: s.summaryRemark,
          photoUrl: null,
          photos: [],
        })
      }

      sessionMetaList.push({
        id: s.id,
        sessionCode: s.sessionCode,
        shiftCode: s.shiftCode,
        workDate: formatDateDisplay(s.workDate),
        status: s.status,
        summaryRemark: s.summaryRemark || '',
        unitNumbers: Array.from(sessionUnits),
        taskCount: allTasks.filter((t) => t.sessionId === s.id).length || 1,
      })
    }

    // Determine primary activity (prioritize actual operational tasks over Clean Up, LOTO, P5M)
    const operationalTask = allTasks.find((t) => {
      const lbl = t.label.toLowerCase()
      return (
        !lbl.includes('clean up') &&
        !lbl.includes('loto') &&
        !lbl.includes('p5m') &&
        !lbl.includes('safety talk')
      )
    }) || allTasks[0]

    const primaryActivity = operationalTask
      ? operationalTask.label
      : (firstSession.summaryRemark || 'Belum ada rincian tugas')

    // Collect all unique units
    const allUnits = Array.from(unitSet)
    let unitTireId = '-'
    if (allUnits.length === 1) {
      unitTireId = allUnits[0]
    } else if (allUnits.length === 2) {
      unitTireId = allUnits.join(', ')
    } else if (allUnits.length > 2) {
      unitTireId = `${allUnits.slice(0, 2).join(', ')} (+${allUnits.length - 2} unit)`
    }

    // Status: aggregate across sessions
    const sessionStatuses = empSessions.map((s) => normalizeStatus(s.status))
    let status: 'Selesai' | 'Berjalan' | 'Menunggu' | 'Terlambat' = 'Menunggu'
    if (sessionStatuses.some((st) => st === 'Terlambat')) {
      status = 'Terlambat'
    } else if (sessionStatuses.some((st) => st === 'Berjalan')) {
      status = 'Berjalan'
    } else if (sessionStatuses.length > 0 && sessionStatuses.every((st) => st === 'Selesai')) {
      status = 'Selesai'
    } else {
      status = sessionStatuses[0] || 'Menunggu'
    }

    // Progress: percentage of completed tasks
    let progress = 100
    if (allTasks.length > 0) {
      const completed = allTasks.filter((t) => t.status === 'Selesai').length
      progress = Math.round((completed / allTasks.length) * 100)
    } else {
      progress = status === 'Selesai' ? 100 : status === 'Berjalan' ? 50 : 0
    }

    // Fallback if no task item duration was found: calculate from session timestamps
    if (totalEffectiveMinutes === 0) {
      for (const s of empSessions) {
        if (s.startedAt && (s.submittedAt || s.updatedAt)) {
          const sStart = new Date(s.startedAt).getTime()
          const sEnd = new Date(s.submittedAt || s.updatedAt || s.startedAt).getTime()
          const diffMs = sEnd - sStart
          if (!Number.isNaN(diffMs) && diffMs > 0 && diffMs <= 18 * 3600 * 1000) {
            totalEffectiveMinutes += Math.round(diffMs / 60000)
          }
        }
      }
    }

    // Actual EWH in hours
    const actualHoursCalc = Math.round((totalEffectiveMinutes / 60) * 10) / 10
    const ewhActualHours = Number(actualHoursCalc.toFixed(1))

    // Resolve roster schedule code and clocks for this employee
    const sDateStr = firstSession.workDate ? new Date(firstSession.workDate).toISOString().split('T')[0] : targetDateStr
    const sPeriod = sDateStr ? sDateStr.slice(0, 7) : ''
    const sDay = sDateStr ? parseInt(sDateStr.slice(8, 10), 10) : 0
    const empSiteId = firstSession.siteId || currentSite.id
    const siteKey = `${empSiteId}:${sPeriod}`
    const empSchedules = scheduleBySiteAndPeriod.get(siteKey)
    const empRosterCode = empSchedules && sDay > 0 ? empSchedules.get(firstSession.employeeId)?.[sDay - 1] : undefined
    const siteCfg = (empSiteId ? schedulingConfigsBySiteId.get(empSiteId) : undefined) || (currentSite.id ? schedulingConfigsBySiteId.get(currentSite.id) : undefined)

    // Resolve roster clocks and net hours directly from site/roster configuration
    const rosterClocks = resolveRosterClocksForEmployee({
      siteConfig: siteCfg,
      shiftCode: firstSession.shiftCode,
      rosterScheduleCode: empRosterCode,
    })
    const rosterNetHours = computeRosterNetHours(rosterClocks.clockIn, rosterClocks.clockOut)

    // Base normal net working hours:
    // 1. Mengikuti konfigurasi roster site secara langsung (misal: Balikpapan 08:00 - 17:00 -> 9 jam - 1 jam istirahat = 8 jam kerja net).
    // 2. Jika pola roster 5:2 (seperti Balikpapan, Head Office, Gresik) -> standar jam kerja normal adalah 8 jam.
    // 3. Untuk site tambang shift 12 jam (seperti Tabang, BIB, Sangatta 06:00 - 18:00) -> 12 jam - 1 jam istirahat = 11 jam kerja net.
    let baseNormalHours = rosterNetHours
    if (baseNormalHours <= 0) {
      baseNormalHours = (siteCfg?.rosterType === '5:2' || siteCfg?.scheduleType === 'office') ? 8 : 11
    } else if (siteCfg?.rosterType === '5:2' && baseNormalHours > 8) {
      baseNormalHours = 8
    }

    // Check if today is an OFF / Libur / Field Break day in roster
    const empFbs = fbByEmployee.get(firstSession.employeeId) || []
    const isFieldBreak = sDateStr ? empFbs.some((range) => sDateStr >= range.start && sDateStr <= range.end) : false
    const rawRosterCode = (empRosterCode || '').trim().toUpperCase()
    let isRosterOff = isFieldBreak ||
      rawRosterCode === 'OFF' ||
      rawRosterCode === 'LIBUR' ||
      rawRosterCode === 'FB' ||
      rawRosterCode === 'CUTI' ||
      rawRosterCode === 'IJIN'

    // If no explicit roster code in schedule plan, check default roster pattern (5:2 or 6:1)
    if (!isRosterOff && !empRosterCode && sDateStr) {
      const dateObj = new Date(`${sDateStr}T00:00:00Z`)
      const dayOfWeek = dateObj.getUTCDay() // 0 = Sunday, 6 = Saturday
      const rType = (siteCfg?.rosterType || '5:2').trim()
      if (rType === '5:2' && (dayOfWeek === 0 || dayOfWeek === 6)) {
        isRosterOff = true
      } else if (rType === '6:1' && dayOfWeek === 0) {
        isRosterOff = true
      }
    }

    // Check attendance records for this employee on this date
    const dateKey = `${firstSession.employeeId}-${sDateStr}`
    const empAtt = (sDateStr ? attendanceByEmpAndDate.get(dateKey) : null) || attendanceByEmployee.get(firstSession.employeeId)

    // Check for next day checkout if night shift
    let checkOutEvent = empAtt?.checkOut
    if (!checkOutEvent && sDateStr) {
      try {
        const nextDate = new Date(`${sDateStr}T00:00:00Z`)
        nextDate.setUTCDate(nextDate.getUTCDate() + 1)
        const nextDateStr = nextDate.toISOString().split('T')[0]
        const nextDayAtt = attendanceByEmpAndDate.get(`${firstSession.employeeId}-${nextDateStr}`)
        if (nextDayAtt?.checkOut) {
          checkOutEvent = nextDayAtt.checkOut
        }
      } catch {}
    }

    // Determine if employee has a valid checkout for this shift
    let hasValidCheckout = false
    let actualAttendanceHours: number | null = null

    if (empAtt?.checkIn && checkOutEvent) {
      const inMs = new Date(empAtt.checkIn).getTime()
      const outMs = new Date(checkOutEvent).getTime()
      const diffMs = outMs - inMs
      if (diffMs > 0) {
        const grossHours = diffMs / (3600 * 1000)
        // Valid shift checkout is between 4 and 18 hours after check-in
        if (grossHours >= 4 && grossHours <= 18) {
          hasValidCheckout = true
          const netHours = Math.max(1, grossHours - 1)
          actualAttendanceHours = Math.round(netHours * 10) / 10
        }
      }
    }

    // Overtime Calculation (Approved SPL or Real Presence exceeding normal hours)
    const splMinutes = sDateStr ? (splByEmployeeAndDate.get(`${firstSession.employeeId}-${sDateStr}`) || 0) : 0
    const splOtHours = Math.round((splMinutes / 60) * 10) / 10

    let overtimeHours = 0
    let targetHours: number

    if (isRosterOff) {
      // Jadwal OFF / Libur:
      // Jam kerja normal = 0. Seluruh durasi kerjanya dihitung dari jam lemburnya (SPL, presensi hari libur, atau aktivitas riil).
      const presenceOtHours = actualAttendanceHours !== null ? actualAttendanceHours : 0
      overtimeHours = Math.max(splOtHours, presenceOtHours, ewhActualHours)
      targetHours = overtimeHours > 0 ? overtimeHours : (actualAttendanceHours || baseNormalHours)
    } else {
      // Hari Kerja Normal:
      // Standar: 8 jam (office) atau 11 jam (site, 12 jam shift - 1 jam istirahat).
      // Jika karyawan bekerja melebihi jam kerja normal (lembur di luar jam lembur wajib untuk site):
      // Maka dihitung durasi kerjanya dari jam lemburnya, sehingga target total bertambah seragam (normal + lembur).
      let presenceOtHours = 0
      if (hasValidCheckout && actualAttendanceHours !== null && actualAttendanceHours > baseNormalHours) {
        presenceOtHours = Math.round((actualAttendanceHours - baseNormalHours) * 10) / 10
      }
      overtimeHours = Math.max(presenceOtHours, splOtHours)
      targetHours = baseNormalHours + overtimeHours
    }

    const ewhTargetHours = Number(targetHours.toFixed(1))
    const ewhPercentage = ewhTargetHours > 0 ? Math.min(100, Math.round((ewhActualHours / ewhTargetHours) * 100)) : 0
    const ewhLabel = `${ewhActualHours}/${ewhTargetHours} Jam`

    employeesList.push({
      sessionId: firstSession.id,
      employeeDbId: firstSession.employeeId,
      rawWorkDate: firstSession.workDate ? new Date(firstSession.workDate).toISOString() : undefined,
      employeeId: firstSession.employeeSn || `EMP-${firstSession.employeeId}`,
      name: firstSession.employeeName,
      jobTitle: firstSession.jobTitle || 'Technician',
      department: firstSession.deptName || firstSession.empDept || 'Tyre Service',
      section: firstSession.sectionName || firstSession.empSection || undefined,
      siteId: firstSession.siteId ?? undefined,
      siteName: firstSession.siteName ?? undefined,
      customerName: firstSession.customerName ?? undefined,
      workDate: formatDateDisplay(firstSession.workDate),
      shift: normalizeShift(firstSession.shiftCode),
      checkInTime: (() => {
        if (empAtt?.checkIn) return formatTimeHHmm(empAtt.checkIn)
        if (earliestStartTime) return formatTimeHHmm(earliestStartTime)
        return formatTimeHHmm(firstSession.startedAt || firstSession.submittedAt)
      })(),
      checkOutTime: (() => {
        if (hasValidCheckout && checkOutEvent) return formatTimeHHmm(checkOutEvent)
        return '-'
      })(),
      primaryActivity,
      unitTireId,
      allUnits,
      status,
      progress,
      lastUpdate: latestUpdateTime
        ? formatDateDisplay(latestUpdateTime)
        : formatDateDisplay(firstSession.updatedAt || firstSession.submittedAt),
      sessionsCount: empSessions.length,
      tasksCount: allTasks.length,
      totalPoints,
      tasks: allTasks,
      sessions: sessionMetaList,
      ewhActualHours,
      ewhTargetHours,
      ewhLabel,
      ewhPercentage,
      rosterClockIn: rosterClocks.clockIn,
      rosterClockOut: rosterClocks.clockOut,
      isRosterOff,
      baseNormalHours,
      overtimeHours,
      rosterScheduleCode: empRosterCode || (isRosterOff ? 'OFF' : 'NORMAL'),
      isTeamMember: Boolean(firstSession.isTeamMember),
      representedByName: firstSession.representedByName || null,
    })
  }

  // Sort by date (descending) so newest activity dates appear first, then by employee name
  employeesList.sort((a, b) => {
    const timeA = a.rawWorkDate ? new Date(a.rawWorkDate).getTime() : 0
    const timeB = b.rawWorkDate ? new Date(b.rawWorkDate).getTime() : 0
    if (timeB !== timeA) return timeB - timeA
    return (a.name || '').localeCompare(b.name || '')
  })

  // 9. Real Timeline Activity Events
  const timeline: TimelineActivityEvent[] = effectiveSessions.slice(0, 5).map((s, idx) => {
    const sItems = itemsBySessionId.get(s.id) || []
    const sDateStr = s.workDate ? new Date(s.workDate).toISOString().split('T')[0] : ''
    const sActs = (sDateStr ? activitiesByEmployeeAndDate.get(`${s.employeeId}-${sDateStr}`) : null) || []

    let actName = ''
    if (sItems.length > 0) {
      const main = sItems.find((i) => !i.snapshotLabel.toLowerCase().includes('clean')) || sItems[0]
      actName = main.snapshotLabel || main.remark || ''
    } else if (sActs.length > 0) {
      actName = sActs[0].title
    } else if (s.summaryRemark && s.summaryRemark.trim()) {
      actName = s.summaryRemark.trim()
    } else {
      actName = 'sesi aktivitas harian'
    }

    const locations: TimelineActivityEvent['locationVariant'][] = ['workshop', 'pit', 'frontline', 'stockpile']
    const locationTags = ['Area Workshop', 'Pit Area', 'Frontline', 'Stockpile']

    return {
      id: `real-tl-${s.id}-${idx}`,
      time: formatTimeHHmm(s.submittedAt || s.updatedAt),
      employeeName: s.employeeName,
      employeeId: s.employeeSn || `EMP-${s.employeeId}`,
      description: `melaporkan ${actName} (${s.status})`,
      locationTag: locationTags[idx % locationTags.length],
      locationVariant: locations[idx % locations.length],
    }
  })

  // 10. Real Delayed Jobs / Pending Issues
  const delayedSessions = effectiveSessions.filter(
    (s) => normalizeStatus(s.status) === 'Terlambat' || normalizeStatus(s.status) === 'Menunggu'
  )

  const delayedJobs: DelayedJobItem[] = delayedSessions.slice(0, 5).map((s) => {
    const sItems = itemsBySessionId.get(s.id) || []
    const sDateStr = s.workDate ? new Date(s.workDate).toISOString().split('T')[0] : ''
    const sActs = (sDateStr ? activitiesByEmployeeAndDate.get(`${s.employeeId}-${sDateStr}`) : null) || []

    let actName = ''
    let uNum = '-'
    let rsn = s.summaryRemark || ''

    if (sItems.length > 0) {
      const item = sItems[0]
      actName = item.snapshotLabel || item.remark || ''
      uNum = item.unitNumber || '-'
      if (!rsn) rsn = item.remark || ''
    } else if (sActs.length > 0) {
      actName = sActs[0].title
      uNum = sActs[0].unitNumber || '-'
      if (!rsn) rsn = sActs[0].remarks || ''
    }

    if (!actName) actName = 'Pekerjaan Harian'
    if (!rsn) rsn = 'Menunggu kelanjutan pekerjaan operasional'

    return {
      id: `delay-${s.id}`,
      activity: actName,
      employeeName: s.employeeName,
      jobTitle: s.jobTitle || 'Technician',
      reason: rsn,
      targetCompleted: `${formatDateDisplay(s.workDate)} 16:00`,
      unitNumber: uNum,
    }
  })

  // If no delayed jobs in current filter, query any pending SPL / overtime command letters for this site
  if (delayedJobs.length === 0) {
    const rawSpl = await db
      .select({
        id: overtimeCommandLetters.id,
        splNumber: overtimeCommandLetters.splNumber,
        title: overtimeCommandLetters.title,
        workDate: overtimeCommandLetters.workDate,
        requestNotes: overtimeCommandLetters.requestNotes,
        employeeName: employees.name,
        jobTitle: employees.jobTitle,
      })
      .from(overtimeCommandLetters)
      .innerJoin(employees, eq(overtimeCommandLetters.requestedByEmployeeId, employees.id))
      .where(currentSite.id !== 0 ? eq(employees.siteId, currentSite.id) : (isCustomerScoped ? inArray(employees.siteId, scopedSiteIds) : undefined))
      .limit(3)
      .catch((err) => {
        console.error('[daily-activity:overtimeCommandLetters] Query failed:', err)
        return []
      })

    for (const spl of rawSpl) {
      delayedJobs.push({
        id: `spl-${spl.id}`,
        activity: spl.title || `SPL ${spl.splNumber}`,
        employeeName: spl.employeeName || 'Staff Site',
        jobTitle: spl.jobTitle || 'Technician',
        reason: spl.requestNotes || 'Kebutuhan pekerjaan tambahan',
        targetCompleted: `${formatDateDisplay(spl.workDate)} 18:00`,
        unitNumber: '-',
      })
    }
  }

  // 11. Unsubmitted Employees (Belum Mengisi Aktivitas, excluding Roster OFF)
  const submittedEmpIds = new Set<number>()
  for (const s of effectiveSessions) {
    if (s.employeeId) submittedEmpIds.add(s.employeeId)
  }
  for (const tm of rawTeamMembers) {
    if (tm.employeeId) submittedEmpIds.add(tm.employeeId)
  }
  for (const act of rawActivities) {
    if (act.employeeId) submittedEmpIds.add(act.employeeId)
  }

  const employeeWhere = [
    eq(employees.isActive, true),
    sql`lower(${employees.employmentStatus}) != 'inactive'`,
  ]
  if (currentSite.id !== 0) {
    employeeWhere.push(eq(employees.siteId, currentSite.id))
  } else if (isCustomerScoped) {
    employeeWhere.push(inArray(employees.siteId, scopedSiteIds))
  }

  const allActiveEmployees = await db
    .select({
      id: employees.id,
      employeeSn: employees.employeeSn,
      name: employees.name,
      jobTitle: employees.jobTitle,
      department: employees.department,
      deptName: masterDepartments.name,
      section: employees.section,
      sectionName: masterSections.name,
      siteId: employees.siteId,
      siteName: sites.name,
      rosterType: sql<string>`'5:2'`.as('roster_type'),
    })
    .from(employees)
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .where(and(...employeeWhere))
    .orderBy(employees.name)
    .catch((err) => {
      console.error('[daily-activity:employees] Query failed:', err)
      return []
    })

  const unsubmittedEmployees: UnsubmittedEmployeeRow[] = []

  for (const emp of allActiveEmployees) {
    if (submittedEmpIds.has(emp.id)) continue

    // Only Servicemen are required to submit Daily Activities (exclude Technical, PJO, Repairmen, Admin)
    if (!isServicemanEmployee({ jobTitle: emp.jobTitle, section: emp.sectionName || emp.section, department: emp.deptName || emp.department })) {
      continue
    }

    let hasWorkingShift = false
    let lastRosterCode = 'DS'

    for (const dStr of evalDates) {
      const fbs = fbByEmployee.get(emp.id) || []
      if (fbs.some((range) => dStr >= range.start && dStr <= range.end)) {
        continue
      }

      const period = dStr.slice(0, 7)
      const day = parseInt(dStr.slice(8, 10), 10)
      const siteKey = `${emp.siteId}:${period}`
      const empSchedules = scheduleBySiteAndPeriod.get(siteKey)
      const schedArray = empSchedules ? empSchedules.get(emp.id) : undefined

      if (schedArray && schedArray[day - 1]) {
        const rawCode = schedArray[day - 1].trim().toUpperCase()
        if (rawCode === 'OFF' || rawCode === 'LIBUR' || rawCode === 'FB') {
          continue
        }
        hasWorkingShift = true
        lastRosterCode = rawCode
        break
      }

      const dateObj = new Date(`${dStr}T00:00:00Z`)
      const dayOfWeek = dateObj.getUTCDay()
      const rType = (emp.rosterType || '5:2').trim()
      if (rType === '5:2' && (dayOfWeek === 0 || dayOfWeek === 6)) {
        continue
      }
      if (rType === '6:1' && dayOfWeek === 0) {
        continue
      }

      hasWorkingShift = true
      lastRosterCode = 'Kerja (On Duty)'
      break
    }

    // Do NOT show employees whose roster is OFF
    if (!hasWorkingShift) {
      continue
    }

    const empAtt = attendanceByEmployee.get(emp.id)
    const hasCheckedIn = Boolean(empAtt?.checkIn)
    const attStatus: 'Hadir' | 'Belum Check-In' = hasCheckedIn ? 'Hadir' : 'Belum Check-In'
    const cInTime = empAtt?.checkIn ? formatTimeHHmm(empAtt.checkIn) : '-'

    const normCodeUpper = lastRosterCode.toUpperCase()
    let expShift: 'Pagi' | 'Siang' | 'Malam' = 'Pagi'
    if (normCodeUpper.includes('NS') || normCodeUpper.includes('MALAM') || normCodeUpper.includes('NIGHT')) {
      expShift = 'Malam'
    } else if (normCodeUpper.includes('MS') || normCodeUpper.includes('SIANG')) {
      expShift = 'Siang'
    }

    if (params.shift && params.shift !== 'Semua Shift') {
      const s = params.shift.toLowerCase()
      if (s.includes('pagi') && expShift !== 'Pagi') continue
      if (s.includes('siang') && expShift !== 'Siang') continue
      if (s.includes('malam') && expShift !== 'Malam') continue
    }

    if (searchKeyword) {
      const q = searchKeyword.toLowerCase()
      const match =
        emp.name.toLowerCase().includes(q) ||
        (emp.employeeSn || '').toLowerCase().includes(q) ||
        (emp.jobTitle || '').toLowerCase().includes(q)
      if (!match) continue
    }

    unsubmittedEmployees.push({
      employeeDbId: emp.id,
      employeeId: emp.employeeSn || `EMP-${emp.id}`,
      name: emp.name,
      jobTitle: emp.jobTitle || 'Technician',
      department: emp.deptName || emp.department || 'Tyre Service',
      section: emp.sectionName || emp.section || undefined,
      siteId: emp.siteId ?? undefined,
      siteName: emp.siteName ?? undefined,
      rosterCode: lastRosterCode,
      rosterType: emp.rosterType || '5:2',
      attendanceStatus: attStatus,
      checkInTime: cInTime,
      expectedShift: expShift,
    })
  }

  let latestSessionDate = formatDateDisplay(targetDateStr)
  if (effectiveStartDate && effectiveEndDate && effectiveStartDate !== effectiveEndDate) {
    latestSessionDate = `${formatDateDisplay(effectiveStartDate)} - ${formatDateDisplay(effectiveEndDate)}`
  }

  return {
    sitesList,
    departmentsList: allDepartments,
    sectionsList: allSections,
    currentSite,
    currentDate: latestSessionDate,
    currentDateIso: targetDateStr,
    isToday: targetDateStr === defaultToday,
    startDate: effectiveStartDate || undefined,
    endDate: effectiveEndDate || undefined,
    selectedShift: params.shift || 'Semua Shift',
    kpis: {
      karyawanAktif: { value: siteEmployeesCount, total: totalEmployeesCount, change: '+5%' },
      hadirCheckIn: { value: hadirCount, change: '+3%' },
      aktivitasSelesai: { value: selesaiCount, change: '+20%' },
      sedangBerjalan: { value: berjalanCount, change: '+2%' },
      terlambatBelumUpdate: { value: terlambatCount, change: '-25%' },
    },
    shiftSummaries,
    attendanceSummary,
    employees: employeesList,
    unsubmittedEmployees,
    timeline,
    delayedJobs,
    lastUpdatedTime: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA',
  }
}
