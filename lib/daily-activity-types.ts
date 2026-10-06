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

export function getCurrentWeekRange(referenceDate: Date = new Date()): { startDate: string; endDate: string } {
  const d = new Date(referenceDate)
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
