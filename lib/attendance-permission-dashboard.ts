import { db } from '@/db'
import { employees, sites } from '@/db/schema/hero'
import { attendancePermissionRequests, timesheetAttendanceRealOverrides } from '@/db/schema/timesheet'
import { ensureSchedulingTimesheetTables } from '@/lib/timesheet/scheduling-infrastructure'
import { and, desc, eq, inArray, sql, gte, lte } from 'drizzle-orm'

export type AttendancePermissionRow = {
  id: number
  date: string
  dayName: string
  type: 'Sakit' | 'Terlambat'
  employeeName: string
  employeeSn: string
  department: string
  siteName: string
  siteLocation: string
  category: string
  returnTime: string
  note: string
  attachment: string
  status: string
  requestId?: number
}

export type IzinDashboardKpis = {
  total: number
  sick: number
  late: number
  departments: number
  pending: number
  approved: number
  rejected: number
  thisMonth: number
}

export type IzinDashboardCharts = {
  sickByCategory: { label: string; value: number }[]
  lateByReason: { label: string; value: number }[]
  frequentLateEmployees: { label: string; value: number }[]
  frequentSickEmployees: { label: string; value: number }[]
  byDepartment: { label: string; value: number }[]
  sickByDay: { label: string; value: number }[]
  monthlyTrend: { label: string; sick: number; late: number }[]
  siteDistribution: { label: string; value: number }[]
  byLocation: { label: string; value: number }[]
}

function readNotePart(note: string, label: string) {
  const part = note.split('|').map((item) => item.trim()).find((item) => item.startsWith(label))
  return part?.slice(label.length).trim() ?? ''
}

function dayName(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'long' })
}

function topCounts(rows: AttendancePermissionRow[], getter: (row: AttendancePermissionRow) => string, limit = 8) {
  return Array.from(
    rows.reduce((map, row) => {
      const key = getter(row) || '-'
      map.set(key, (map.get(key) ?? 0) + 1)
      return map
    }, new Map<string, number>())
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit)
}

function monthlyTrend(rows: AttendancePermissionRow[]) {
  const map = new Map<string, { sick: number; late: number }>()
  for (const row of rows) {
    const d = row.date.slice(0, 7)
    if (!map.has(d)) map.set(d, { sick: 0, late: 0 })
    const entry = map.get(d)!
    if (row.type === 'Sakit') entry.sick++
    else entry.late++
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([label, val]) => ({ label, ...val }))
}

export type IzinDashboardFilters = {
  dateFrom?: string
  dateTo?: string
  siteId?: string
}

export async function getAttendancePermissionDashboardData(filters: IzinDashboardFilters = {}) {
  await ensureSchedulingTimesheetTables()

  const requestConditions = []
  if (filters.dateFrom) requestConditions.push(gte(attendancePermissionRequests.startDate, filters.dateFrom))
  if (filters.dateTo) requestConditions.push(lte(attendancePermissionRequests.startDate, filters.dateTo))
  if (filters.siteId) requestConditions.push(eq(attendancePermissionRequests.siteId, Number(filters.siteId)))

  const requests = await db
    .select({
      id: attendancePermissionRequests.id,
      permissionType: attendancePermissionRequests.permissionType,
      startDate: attendancePermissionRequests.startDate,
      endDate: attendancePermissionRequests.endDate,
      sickCategory: attendancePermissionRequests.sickCategory,
      lateReason: attendancePermissionRequests.lateReason,
      returnTime: attendancePermissionRequests.returnTime,
      reason: attendancePermissionRequests.reason,
      attachmentUrl: attendancePermissionRequests.attachmentUrl,
      status: attendancePermissionRequests.status,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      department: employees.department,
      siteName: sites.name,
      siteLocation: sites.location,
    })
    .from(attendancePermissionRequests)
    .innerJoin(employees, eq(attendancePermissionRequests.employeeId, employees.id))
    .leftJoin(sites, eq(attendancePermissionRequests.siteId, sites.id))
    .where(requestConditions.length ? and(...requestConditions) : undefined)
    .orderBy(desc(attendancePermissionRequests.createdAt))

  const overrideConditions = [
    inArray(timesheetAttendanceRealOverrides.status, ['sick', 'leave']),
    sql`${timesheetAttendanceRealOverrides.note} ilike 'Izin %'`,
  ]
  if (filters.dateFrom) overrideConditions.push(sql`${timesheetAttendanceRealOverrides.period} || '-' || LPAD(${timesheetAttendanceRealOverrides.day}::text, 2, '0') >= ${filters.dateFrom}`)
  if (filters.dateTo) overrideConditions.push(sql`${timesheetAttendanceRealOverrides.period} || '-' || LPAD(${timesheetAttendanceRealOverrides.day}::text, 2, '0') <= ${filters.dateTo}`)
  if (filters.siteId) overrideConditions.push(eq(timesheetAttendanceRealOverrides.siteId, Number(filters.siteId)))

  const overrides = await db
    .select({
      id: timesheetAttendanceRealOverrides.id,
      period: timesheetAttendanceRealOverrides.period,
      day: timesheetAttendanceRealOverrides.day,
      status: timesheetAttendanceRealOverrides.status,
      clockIn: timesheetAttendanceRealOverrides.clockIn,
      note: timesheetAttendanceRealOverrides.note,
      updatedAt: timesheetAttendanceRealOverrides.updatedAt,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      department: employees.department,
      siteName: sites.name,
      siteLocation: sites.location,
    })
    .from(timesheetAttendanceRealOverrides)
    .innerJoin(employees, eq(timesheetAttendanceRealOverrides.employeeId, employees.id))
    .leftJoin(sites, eq(timesheetAttendanceRealOverrides.siteId, sites.id))
    .where(and(...overrideConditions))
    .orderBy(desc(timesheetAttendanceRealOverrides.updatedAt))

  const approvedRows: AttendancePermissionRow[] = overrides.map((row) => {
    const date = `${row.period}-${String(row.day).padStart(2, '0')}`
    const type = row.note.includes('Izin Terlambat') ? 'Terlambat' : 'Sakit'
    const category =
      type === 'Sakit'
        ? readNotePart(row.note, 'Kategori Sakit:')
        : readNotePart(row.note, 'Alasan Terlambat:')

    return {
      id: row.id,
      date,
      dayName: dayName(date),
      type,
      employeeName: row.employeeName,
      employeeSn: row.employeeSn,
      department: row.department,
      siteName: row.siteName ?? '-',
      siteLocation: row.siteLocation ?? '-',
      category,
      returnTime: readNotePart(row.note, 'Jam Kembali/Masuk:') || row.clockIn,
      note: readNotePart(row.note, 'Catatan:'),
      attachment: readNotePart(row.note, 'Lampiran:'),
      status: 'Approved / masuk attendance',
    }
  })

  const requestRows: AttendancePermissionRow[] = requests.map((row) => {
    const startDate = String(row.startDate)
    const type = row.permissionType === 'late' ? 'Terlambat' : 'Sakit'
    return {
      id: row.id,
      requestId: row.id,
      date: startDate,
      dayName: dayName(startDate),
      type,
      employeeName: row.employeeName,
      employeeSn: row.employeeSn,
      department: row.department,
      siteName: row.siteName ?? '-',
      siteLocation: row.siteLocation ?? '-',
      category: type === 'Sakit' ? row.sickCategory : row.lateReason,
      returnTime: row.returnTime,
      note: row.reason,
      attachment: row.attachmentUrl,
      status: row.status,
    }
  })

  const requestKeys = new Set(requestRows.map((row) => `${row.employeeName}:${row.date}:${row.type}`))
  const rows = [
    ...requestRows,
    ...approvedRows.filter((row) => !requestKeys.has(`${row.employeeName}:${row.date}:${row.type}`)),
  ]

  const sickRows = rows.filter((row) => row.type === 'Sakit')
  const lateRows = rows.filter((row) => row.type === 'Terlambat')
  const pendingRows = rows.filter((row) => row.status === 'pending')
  const nonPendingRows = rows.filter((row) => row.status !== 'pending')
  const rejectedRows: AttendancePermissionRow[] = []

  const now = new Date()
  const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisMonthRows = rows.filter((row) => row.date.startsWith(thisMonthStr))

  const employeeSites = await db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .orderBy(sites.name)

  return {
    rows,
    sites: employeeSites,
    kpis: {
      total: rows.length,
      sick: sickRows.length,
      late: lateRows.length,
      departments: new Set(rows.map((row) => row.department).filter(Boolean)).size,
      pending: pendingRows.length,
      approved: nonPendingRows.length,
      rejected: rejectedRows.length,
      thisMonth: thisMonthRows.length,
    },
    charts: {
      sickByCategory: topCounts(sickRows, (row) => row.category),
      lateByReason: topCounts(lateRows, (row) => row.category),
      frequentLateEmployees: topCounts(lateRows, (row) => row.employeeName),
      frequentSickEmployees: topCounts(sickRows, (row) => row.employeeName),
      byDepartment: topCounts(rows, (row) => row.department),
      sickByDay: topCounts(sickRows, (row) => row.dayName, 7),
      monthlyTrend: monthlyTrend(rows),
      siteDistribution: topCounts(rows, (row) => row.siteName),
      byLocation: topCounts(rows, (row) => row.siteLocation),
    },
  }
}
