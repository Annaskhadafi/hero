import { db } from '@/db'
import {
  activities,
  activityPhotos,
  attendanceRecords,
  dailyActivitySessions,
  dailyActivitySessionItems,
  employees,
  masterDepartments,
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
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { calcClockDuration } from '@/lib/ewh/calculate-ewh'

export interface TopActivityItem {
  rank: number
  name: string
  count: number
  totalMinutes: number
  totalHours: number
  averageHoursPerTask: number
  averageMinutesPerTask: number
  percentageOfTotalWork: number
}

export interface DailyEwhTrendPoint {
  date: string
  displayDate: string
  effectiveHours: number
  targetHours: number
  ewhPercentage: number
  shift: string
  tasksCount: number
  status: string
  isRosterOff: boolean
  overtimeHours: number
}

export interface EmployeeHistoryTaskItem {
  id: number
  label: string
  unitNumber: string
  durationLabel: string
  durationMinutes: number
  durationHours: number
  status: string
  points: number
  remarks?: string
  photoUrl?: string | null
}

export interface EmployeeHistoryDayLog {
  date: string
  displayDate: string
  dayOfWeek: string
  shift: string
  checkInTime: string
  checkOutTime: string
  effectiveHours: number
  targetHours: number
  ewhPercentage: number
  isRosterOff: boolean
  overtimeHours: number
  status: string
  tasks: EmployeeHistoryTaskItem[]
}

export interface EmployeeEwhAnalyticsResult {
  employee: {
    id: number
    employeeSn: string
    name: string
    jobTitle: string
    department: string
    section?: string
    siteId?: number
    siteName?: string
    rosterType?: string
  }
  summaryKpis: {
    totalEffectiveHours: number
    totalTargetHours: number
    overallEwhPercentage: number
    totalDaysWorked: number
    totalSessionsCount: number
    totalTasksCompleted: number
    averageDailyHours: number
    totalPoints: number
    totalOvertimeHours: number
  }
  topActivities: TopActivityItem[]
  dailyTrend: DailyEwhTrendPoint[]
  historyLogs: EmployeeHistoryDayLog[]
}

function normalizeUnit(unit?: string | null): string {
  if (!unit) return '-'
  const trimmed = unit.trim().toUpperCase()
  if (!trimmed || trimmed === '-' || trimmed === 'NONE') return '-'
  return trimmed.replace(/^([A-Z]+)\s*(\d+)$/, '$1 $2')
}

function parseDurationMinutes(start?: Date | string | null, end?: Date | string | null, fallback?: any): number {
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
    if (typeof fallback === 'number' && fallback > 0) return Math.round(fallback)
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

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '-'
  const hrs = Math.floor(minutes / 60)
  const remMins = minutes % 60
  if (hrs === 0) return `${remMins}m`
  return remMins > 0 ? `${hrs}j ${remMins}m` : `${hrs}j`
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

function formatDateDisplay(date?: Date | string | null): string {
  if (!date) return '-'
  try {
    const d = new Date(date)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return '-'
  }
}

function getDayNameId(date?: Date | string | null): string {
  if (!date) return '-'
  try {
    const d = new Date(date)
    return d.toLocaleDateString('id-ID', { weekday: 'long' })
  } catch {
    return '-'
  }
}

export async function getEmployeeEwhAnalytics(
  employeeDbId: number,
  startDate?: string,
  endDate?: string
): Promise<EmployeeEwhAnalyticsResult | null> {
  // 1. Fetch Employee Profile
  const [emp] = await db
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
    .where(eq(employees.id, employeeDbId))
    .limit(1)

  if (!emp) return null

  // 2. Fetch Sessions & Items
  const sessionConditions = [
    eq(dailyActivitySessions.employeeId, employeeDbId),
    isNull(dailyActivitySessions.deletedAt),
  ]
  if (startDate && endDate) {
    sessionConditions.push(
      sql`date(${dailyActivitySessions.workDate}) >= ${startDate} and date(${dailyActivitySessions.workDate}) <= ${endDate}`
    )
  } else if (startDate) {
    sessionConditions.push(sql`date(${dailyActivitySessions.workDate}) >= ${startDate}`)
  } else if (endDate) {
    sessionConditions.push(sql`date(${dailyActivitySessions.workDate}) <= ${endDate}`)
  }

  const rawSessions = await db
    .select({
      id: dailyActivitySessions.id,
      sessionCode: dailyActivitySessions.sessionCode,
      workDate: dailyActivitySessions.workDate,
      shiftCode: dailyActivitySessions.shiftCode,
      status: dailyActivitySessions.status,
      summaryRemark: dailyActivitySessions.summaryRemark,
      startedAt: dailyActivitySessions.startedAt,
      submittedAt: dailyActivitySessions.submittedAt,
      updatedAt: dailyActivitySessions.updatedAt,
    })
    .from(dailyActivitySessions)
    .where(and(...sessionConditions))
    .orderBy(desc(dailyActivitySessions.workDate))

  const sessionIds = rawSessions.map((s) => s.id)

  const rawSessionItems = sessionIds.length > 0
    ? await db
        .select({
          id: dailyActivitySessionItems.id,
          sessionId: dailyActivitySessionItems.sessionId,
          snapshotLabel: dailyActivitySessionItems.snapshotLabel,
          snapshotGroupName: dailyActivitySessionItems.snapshotGroupName,
          unitNumber: dailyActivitySessionItems.unitNumber,
          startedAt: dailyActivitySessionItems.startedAt,
          endedAt: dailyActivitySessionItems.endedAt,
          actualPoints: dailyActivitySessionItems.actualPoints,
          remark: dailyActivitySessionItems.remark,
          isChecked: dailyActivitySessionItems.isChecked,
          snapshotPayload: dailyActivitySessionItems.snapshotPayload,
        })
        .from(dailyActivitySessionItems)
        .where(inArray(dailyActivitySessionItems.sessionId, sessionIds))
    : []

  const itemsBySessionId = new Map<number, typeof rawSessionItems>()
  for (const item of rawSessionItems) {
    if (item.sessionId) {
      const list = itemsBySessionId.get(item.sessionId) || []
      list.push(item)
      itemsBySessionId.set(item.sessionId, list)
    }
  }

  // 3. Fetch Standalone Activities
  const actConditions = [
    eq(activities.employeeId, employeeDbId),
    isNull(activities.deletedAt),
  ]
  if (startDate && endDate) {
    actConditions.push(
      sql`date(${activities.startTime}) >= ${startDate} and date(${activities.startTime}) <= ${endDate}`
    )
  } else if (startDate) {
    actConditions.push(sql`date(${activities.startTime}) >= ${startDate}`)
  } else if (endDate) {
    actConditions.push(sql`date(${activities.startTime}) <= ${endDate}`)
  }

  const rawActivities = await db
    .select({
      id: activities.id,
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
    .where(and(...actConditions))
    .orderBy(desc(activities.startTime))

  // 4. Fetch Attendance Records
  const attConditions = [eq(attendanceRecords.employeeId, employeeDbId)]
  if (startDate && endDate) {
    attConditions.push(
      sql`date(${attendanceRecords.eventTime}) >= ${startDate} and date(${attendanceRecords.eventTime}) <= ${endDate}`
    )
  } else if (startDate) {
    attConditions.push(sql`date(${attendanceRecords.eventTime}) >= ${startDate}`)
  } else if (endDate) {
    attConditions.push(sql`date(${attendanceRecords.eventTime}) <= ${endDate}`)
  }

  const rawAttendance = await db
    .select({
      eventType: attendanceRecords.eventType,
      eventTime: attendanceRecords.eventTime,
    })
    .from(attendanceRecords)
    .where(and(...attConditions))
    .orderBy(attendanceRecords.eventTime)

  const attendanceByDate = new Map<string, { checkIn: Date | null; checkOut: Date | null }>()
  for (const ev of rawAttendance) {
    if (!ev.eventTime) continue
    const evTime = new Date(ev.eventTime)
    const dStr = evTime.toISOString().split('T')[0]
    const curr = attendanceByDate.get(dStr) || { checkIn: null, checkOut: null }
    const evType = (ev.eventType || '').toLowerCase()
    if (evType.includes('in')) {
      if (!curr.checkIn || evTime < curr.checkIn) curr.checkIn = evTime
    } else if (evType.includes('out')) {
      if (!curr.checkOut || evTime > curr.checkOut) curr.checkOut = evTime
    }
    attendanceByDate.set(dStr, curr)
  }

  // 5. Fetch Site Scheduling Config & Roster Plans
  const [siteConfig] = emp.siteId
    ? await db
        .select({
          siteId: timesheetSchedulingConfigs.siteId,
          scheduleType: timesheetSchedulingConfigs.scheduleType,
          rosterType: timesheetSchedulingConfigs.rosterType,
          fieldBreakConfig: timesheetSchedulingConfigs.fieldBreakConfig,
        })
        .from(timesheetSchedulingConfigs)
        .where(eq(timesheetSchedulingConfigs.siteId, emp.siteId))
        .limit(1)
    : [null]

  const fbConfig = (siteConfig?.fieldBreakConfig as Record<string, any>) || {}
  const readFb = (k: string, fb: string) => (typeof fbConfig[k] === 'string' && fbConfig[k].trim() ? fbConfig[k].trim() : fb)

  // Standard shift hours from config (Balikpapan 08:00-17:00 -> 8h net; Site 06:00-18:00 -> 11h net)
  const siteDayIn = readFb('dayShiftClockIn', '08:00')
  const siteDayOut = readFb('dayShiftClockOut', '17:00')
  const defaultRosterNet = Math.max(1, (calcClockDuration(siteDayIn, siteDayOut) / 60) - 1)
  const isPola52 = (siteConfig?.rosterType || '5:2') === '5:2' || siteConfig?.scheduleType === 'office'
  const standardNormalHours = isPola52 ? 8 : (defaultRosterNet > 0 ? defaultRosterNet : 11)

  // 6. Fetch Approved SPL / Overtime
  const rawSpl = await db
    .select({
      workDate: overtimeCommandLetters.workDate,
      plannedStartAt: overtimeCommandLetters.plannedStartAt,
      plannedEndAt: overtimeCommandLetters.plannedEndAt,
      overtimeCreditMinutes: overtimeCommandLetterParticipants.overtimeCreditMinutes,
    })
    .from(overtimeCommandLetterParticipants)
    .innerJoin(
      overtimeCommandLetters,
      eq(overtimeCommandLetterParticipants.overtimeCommandLetterId, overtimeCommandLetters.id)
    )
    .where(
      and(
        eq(overtimeCommandLetterParticipants.employeeId, employeeDbId),
        sql`lower(${overtimeCommandLetters.status}) in ('approved', 'completed', 'submitted')`
      )
    )

  const splByDate = new Map<string, number>()
  for (const spl of rawSpl) {
    if (!spl.workDate) continue
    const dStr = new Date(spl.workDate).toISOString().split('T')[0]
    let mins = 0
    if (spl.overtimeCreditMinutes && spl.overtimeCreditMinutes > 0) {
      mins = spl.overtimeCreditMinutes
    } else if (spl.plannedStartAt && spl.plannedEndAt) {
      const diffM = Math.round((new Date(spl.plannedEndAt).getTime() - new Date(spl.plannedStartAt).getTime()) / 60000)
      if (diffM > 0 && diffM <= 18 * 60) mins = diffM
    }
    if (mins > 0) {
      splByDate.set(dStr, (splByDate.get(dStr) || 0) + mins)
    }
  }

  // 7. Group Data By Date
  const dateEntries = new Map<string, {
    date: string
    sessions: typeof rawSessions
    standaloneActs: typeof rawActivities
  }>()

  for (const s of rawSessions) {
    const dStr = s.workDate ? new Date(s.workDate).toISOString().split('T')[0] : ''
    if (!dStr) continue
    const curr = dateEntries.get(dStr) || { date: dStr, sessions: [], standaloneActs: [] }
    curr.sessions.push(s)
    dateEntries.set(dStr, curr)
  }

  for (const act of rawActivities) {
    const dStr = act.startTime ? new Date(act.startTime).toISOString().split('T')[0] : ''
    if (!dStr) continue
    const curr = dateEntries.get(dStr) || { date: dStr, sessions: [], standaloneActs: [] }
    curr.standaloneActs.push(act)
    dateEntries.set(dStr, curr)
  }

  // 8. Process Each Date & Aggregate Top Activities
  const activityMap = new Map<string, { count: number; totalMinutes: number }>()

  const historyLogs: EmployeeHistoryDayLog[] = []
  const dailyTrend: DailyEwhTrendPoint[] = []

  let totalEffectiveMinutesAll = 0
  let totalTargetHoursAll = 0
  let totalTasksCompletedAll = 0
  let totalPointsAll = 0
  let totalOvertimeHoursAll = 0

  const sortedDates = Array.from(dateEntries.keys()).sort((a, b) => b.localeCompare(a))

  for (const dStr of sortedDates) {
    const entry = dateEntries.get(dStr)!
    const firstSession = entry.sessions[0]
    const dayTasks: EmployeeHistoryTaskItem[] = []
    let dayEffectiveMinutes = 0
    let dayPoints = 0

    // Process session items
    for (const s of entry.sessions) {
      const items = itemsBySessionId.get(s.id) || []
      for (const item of items) {
        let parsedPayload: any = {}
        try {
          parsedPayload = JSON.parse(item.snapshotPayload || '{}')
        } catch {}

        const durationMins = parseDurationMinutes(item.startedAt || s.startedAt, item.endedAt, parsedPayload.duration)
        if (durationMins > 0) dayEffectiveMinutes += durationMins

        const pts = item.actualPoints || 0
        dayPoints += pts

        const label = (item.snapshotLabel || item.remark || 'Aktivitas Operasional').trim()
        const normUnit = normalizeUnit(item.unitNumber || parsedPayload.unitNumber)

        dayTasks.push({
          id: item.id,
          label,
          unitNumber: normUnit,
          durationLabel: formatDuration(durationMins),
          durationMinutes: durationMins,
          durationHours: Math.round((durationMins / 60) * 10) / 10,
          status: item.isChecked ? 'Selesai' : 'Berjalan',
          points: pts,
          remarks: item.remark || parsedPayload.remark || undefined,
        })

        // Accumulate in activityMap for ranking
        const actKey = label
        const currAct = activityMap.get(actKey) || { count: 0, totalMinutes: 0 }
        currAct.count += 1
        currAct.totalMinutes += durationMins
        activityMap.set(actKey, currAct)
      }
    }

    // Process standalone activities
    for (const act of entry.standaloneActs) {
      const durationMins = parseDurationMinutes(act.startTime, act.endTime)
      if (durationMins > 0) dayEffectiveMinutes += durationMins

      const pts = act.pointsAwarded || 0
      dayPoints += pts

      const label = act.title.trim()
      const normUnit = normalizeUnit(act.unitNumber)

      dayTasks.push({
        id: act.id,
        label,
        unitNumber: normUnit,
        durationLabel: formatDuration(durationMins),
        durationMinutes: durationMins,
        durationHours: Math.round((durationMins / 60) * 10) / 10,
        status: act.status || 'Selesai',
        points: pts,
        remarks: act.remarks || undefined,
      })

      const actKey = label
      const currAct = activityMap.get(actKey) || { count: 0, totalMinutes: 0 }
      currAct.count += 1
      currAct.totalMinutes += durationMins
      activityMap.set(actKey, currAct)
    }

    // Fallback if no specific task items found: calculate session timestamps
    if (dayEffectiveMinutes === 0 && entry.sessions.length > 0) {
      for (const s of entry.sessions) {
        if (s.startedAt && (s.submittedAt || s.updatedAt)) {
          const sStart = new Date(s.startedAt).getTime()
          const sEnd = new Date(s.submittedAt || s.updatedAt || s.startedAt).getTime()
          const diffMs = sEnd - sStart
          if (diffMs > 0 && diffMs <= 18 * 3600 * 1000) {
            dayEffectiveMinutes += Math.round(diffMs / 60000)
          }
        }
      }
    }

    // Check attendance for this date
    const att = attendanceByDate.get(dStr)
    let checkOutEvent = att?.checkOut
    let hasValidCheckout = false
    let actualAttendanceHours: number | null = null

    if (att?.checkIn && checkOutEvent) {
      const inMs = new Date(att.checkIn).getTime()
      const outMs = new Date(checkOutEvent).getTime()
      const diffMs = outMs - inMs
      if (diffMs > 0) {
        const grossHours = diffMs / (3600 * 1000)
        if (grossHours >= 4 && grossHours <= 18) {
          hasValidCheckout = true
          actualAttendanceHours = Math.round(Math.max(1, grossHours - 1) * 10) / 10
        }
      }
    }

    // Check if weekend / off
    const dateObj = new Date(`${dStr}T00:00:00Z`)
    const dayOfWeekNum = dateObj.getUTCDay()
    const isWeekend = isPola52 ? (dayOfWeekNum === 0 || dayOfWeekNum === 6) : (dayOfWeekNum === 0)
    const isRosterOff = isWeekend

    // Overtime from SPL or excess presence
    const splMins = splByDate.get(dStr) || 0
    const splOtHours = Math.round((splMins / 60) * 10) / 10

    let overtimeHours = 0
    let targetHours: number

    const ewhActualHours = Math.round((dayEffectiveMinutes / 60) * 10) / 10

    if (isRosterOff) {
      const presenceOt = actualAttendanceHours !== null ? actualAttendanceHours : 0
      overtimeHours = Math.max(splOtHours, presenceOt, ewhActualHours)
      targetHours = overtimeHours > 0 ? overtimeHours : (actualAttendanceHours || standardNormalHours)
    } else {
      let presenceOt = 0
      if (hasValidCheckout && actualAttendanceHours !== null && actualAttendanceHours > standardNormalHours) {
        presenceOt = Math.round((actualAttendanceHours - standardNormalHours) * 10) / 10
      }
      overtimeHours = Math.max(presenceOt, splOtHours)
      targetHours = standardNormalHours + overtimeHours
    }

    const ewhTargetHours = Number(targetHours.toFixed(1))
    const ewhPercentage = ewhTargetHours > 0 ? Math.min(100, Math.round((ewhActualHours / ewhTargetHours) * 100)) : 0

    totalEffectiveMinutesAll += dayEffectiveMinutes
    totalTargetHoursAll += ewhTargetHours
    totalTasksCompletedAll += dayTasks.length
    totalPointsAll += dayPoints
    totalOvertimeHoursAll += overtimeHours

    const shiftCode = firstSession?.shiftCode || 'Day'
    const shiftLabel = shiftCode.toLowerCase().includes('night') ? 'Malam' : shiftCode.toLowerCase().includes('noon') ? 'Siang' : 'Pagi'

    historyLogs.push({
      date: dStr,
      displayDate: formatDateDisplay(dStr),
      dayOfWeek: getDayNameId(dStr),
      shift: shiftLabel,
      checkInTime: att?.checkIn ? formatTimeHHmm(att.checkIn) : '-',
      checkOutTime: hasValidCheckout && checkOutEvent ? formatTimeHHmm(checkOutEvent) : '-',
      effectiveHours: ewhActualHours,
      targetHours: ewhTargetHours,
      ewhPercentage,
      isRosterOff,
      overtimeHours,
      status: entry.sessions.every((s) => s.status === 'completed' || s.status === 'approved') ? 'Selesai' : 'Berjalan',
      tasks: dayTasks,
    })

    dailyTrend.push({
      date: dStr,
      displayDate: dStr.slice(5).replace('-', '/'),
      effectiveHours: ewhActualHours,
      targetHours: ewhTargetHours,
      ewhPercentage,
      shift: shiftLabel,
      tasksCount: dayTasks.length,
      status: entry.sessions.every((s) => s.status === 'completed' || s.status === 'approved') ? 'Selesai' : 'Berjalan',
      isRosterOff,
      overtimeHours,
    })
  }

  // Sort dailyTrend chronologically for line/bar charts
  dailyTrend.reverse()

  // 9. Format Top Activities (Sorted by frequency/count desc)
  const totalEffectiveHoursAll = Math.round((totalEffectiveMinutesAll / 60) * 10) / 10
  const topActivitiesList: TopActivityItem[] = []

  const sortedActEntries = Array.from(activityMap.entries()).sort((a, b) => {
    if (b[1].count !== a[1].count) return b[1].count - a[1].count
    return b[1].totalMinutes - a[1].totalMinutes
  })

  let rank = 1
  for (const [name, stats] of sortedActEntries) {
    const actTotalHours = Math.round((stats.totalMinutes / 60) * 10) / 10
    const avgMinutes = stats.count > 0 ? Math.round(stats.totalMinutes / stats.count) : 0
    const avgHours = Math.round((avgMinutes / 60) * 10) / 10
    const pct = totalEffectiveMinutesAll > 0 ? Math.round((stats.totalMinutes / totalEffectiveMinutesAll) * 1000) / 10 : 0

    topActivitiesList.push({
      rank: rank++,
      name,
      count: stats.count,
      totalMinutes: stats.totalMinutes,
      totalHours: actTotalHours,
      averageHoursPerTask: avgHours,
      averageMinutesPerTask: avgMinutes,
      percentageOfTotalWork: pct,
    })
  }

  // 10. Summary KPIs
  const totalDaysWorked = sortedDates.length
  const overallEwhPercentage = totalTargetHoursAll > 0
    ? Math.min(100, Math.round((totalEffectiveHoursAll / totalTargetHoursAll) * 100))
    : 0
  const averageDailyHours = totalDaysWorked > 0
    ? Math.round((totalEffectiveHoursAll / totalDaysWorked) * 10) / 10
    : 0

  return {
    employee: {
      id: emp.id,
      employeeSn: emp.employeeSn,
      name: emp.name,
      jobTitle: emp.jobTitle || 'Technician',
      department: emp.deptName || emp.department || 'Central Services',
      section: emp.sectionName || emp.section || undefined,
      siteId: emp.siteId ?? undefined,
      siteName: emp.siteName ?? undefined,
      rosterType: emp.rosterType,
    },
    summaryKpis: {
      totalEffectiveHours: totalEffectiveHoursAll,
      totalTargetHours: Math.round(totalTargetHoursAll * 10) / 10,
      overallEwhPercentage,
      totalDaysWorked,
      totalSessionsCount: rawSessions.length,
      totalTasksCompleted: totalTasksCompletedAll,
      averageDailyHours,
      totalPoints: totalPointsAll,
      totalOvertimeHours: Math.round(totalOvertimeHoursAll * 10) / 10,
    },
    topActivities: topActivitiesList,
    dailyTrend,
    historyLogs,
  }
}
