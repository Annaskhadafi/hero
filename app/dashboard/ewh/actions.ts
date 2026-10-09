'use server'

import { db } from '@/db'
import { ewhDailySnapshots, ewhShiftConfig, unitUtilityDaily, unitMaster, ewhTeams, ewhTeamMembers } from '@/db/schema/ewh'
import {
  activities,
  attendanceRecords,
  dailyActivitySessions,
  dailyActivitySessionItems,
  dailyActivitySessionTeamMembers,
  dailyActivitySessionItemTeamMembers,
  employees,
  masterDepartments,
  sites,
} from '@/db/schema/hero'
import { timesheetAttendanceRealOverrides } from '@/db/schema/timesheet'
import { overtimeCommandLetters, overtimeCommandLetterParticipants } from '@/db/schema/hero'
import { and, eq, gte, lte, sql, inArray, isNull, or, ilike } from 'drizzle-orm'
import {
  calculateEwhDay,
  categorizeSessionActivity,
  parseDateYMD,
  EWH_ACTIVITY_COLUMNS,
  type EwhActivityKey,
} from '@/lib/ewh/calculate-ewh'
import { calculateUnitUtility, type SessionItemEntry } from '@/lib/ewh/calculate-unit-utility'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { isServicemanEmployee } from '@/lib/employee-role-utils'
import { revalidatePath } from 'next/cache'

// ============================================================
// TYPES
// ============================================================

export interface EwhSummaryRow {
  employeeId: number
  employeeName: string
  employeeSn: string
  section: string
  department: string
  shiftCode: string
  clockIn: string | null
  clockOut: string | null
  availabilityMinutes: number
  clockDurationMinutes: number
  breakMinutes: number
  effectiveMinutes: number
  idleMinutes: number
  ewhPercent: number
  ewhPercentStr: string
  activitySessionCount: number
  checkedItemCount: number
  totalItemCount: number
  overtimeMinutes: number
  workDate: Date
  period: string
  activityMap?: Partial<Record<EwhActivityKey, number>>
  activitiesSummary?: Array<{ key: EwhActivityKey; label: string; count: number }>
}

export interface UnitUtilitySummaryRow {
  unitNumber: string
  unitId: number | null
  unitName: string | null
  unitType: string | null
  totalUsageMinutes: number
  utilityPercent: number
  utilityPercentStr: string
  operatorCount: number
  activityEntryCount: number
  breakdownMinutes: number
  standbyMinutes: number
  operators: {
    employeeId: number
    employeeName: string
    section: string
    activityLabel: string
    durationMinutes: number
    startedAt: Date | null
    endedAt: Date | null
  }[]
}

// ============================================================
// RECALCULATE EWH (dipanggil realtime dari berbagai trigger)
// ============================================================

/**
 * Recalculate snapshot EWH untuk satu karyawan pada satu hari kerja tertentu.
 * Dipanggil dari:
 * - Attendance real override save / attendanceRecords
 * - Daily Activity session submit/approve
 * - SPL status change (approved/rejected)
 */
export async function recalculateEwhForEmployee(
  employeeId: number,
  siteId: number,
  workDate: Date
): Promise<void> {
  const period = `${workDate.getFullYear()}-${String(workDate.getMonth() + 1).padStart(2, '0')}`
  const dayStart = new Date(workDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(workDate)
  dayEnd.setHours(23, 59, 59, 999)

  // 1. Ambil attendance real override untuk hari ini
  const day = workDate.getDate()
  const [attendance] = await db
    .select({
      clockIn: timesheetAttendanceRealOverrides.clockIn,
      clockOut: timesheetAttendanceRealOverrides.clockOut,
      shiftCode: timesheetAttendanceRealOverrides.status,
    })
    .from(timesheetAttendanceRealOverrides)
    .where(
      and(
        eq(timesheetAttendanceRealOverrides.siteId, siteId),
        eq(timesheetAttendanceRealOverrides.employeeId, employeeId),
        eq(timesheetAttendanceRealOverrides.period, period),
        eq(timesheetAttendanceRealOverrides.day, day)
      )
    )
    .limit(1)

  let clockIn = attendance?.clockIn || null
  let clockOut = attendance?.clockOut || null

  // Fallback ke attendanceRecords jika override kosong
  if (!clockIn || !clockOut) {
    const rawAtts = await db
      .select({
        eventType: attendanceRecords.eventType,
        eventTime: attendanceRecords.eventTime,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          gte(attendanceRecords.eventTime, dayStart),
          lte(attendanceRecords.eventTime, dayEnd)
        )
      )
      .orderBy(attendanceRecords.eventTime)

    for (const att of rawAtts) {
      const timeStr = `${String(att.eventTime.getHours()).padStart(2, '0')}:${String(att.eventTime.getMinutes()).padStart(2, '0')}`
      if (att.eventType.toLowerCase().includes('in') && !clockIn) {
        clockIn = timeStr
      } else if (att.eventType.toLowerCase().includes('out')) {
        clockOut = timeStr
      }
    }
  }

  // 2. Ambil konfigurasi break shift (default 60 menit)
  const shiftCode = 'DS' // default; bisa disesuaikan dari attendance/schedule
  const [shiftCfg] = await db
    .select({ breakMinutes: ewhShiftConfig.breakMinutes })
    .from(ewhShiftConfig)
    .where(
      and(
        eq(ewhShiftConfig.siteId, siteId),
        eq(ewhShiftConfig.isActive, true),
        inArray(ewhShiftConfig.shiftCode, [shiftCode, 'ALL'])
      )
    )
    .limit(1)
  const breakMinutes = shiftCfg?.breakMinutes ?? 60

  // 3. Hitung EWH
  const result = calculateEwhDay({
    clockIn,
    clockOut,
    breakMinutes,
  })

  // 4. Hitung activity session counts (termasuk session di mana employee terdaftar sebagai anggota tim)
  const sessions = await db
    .select({ id: dailyActivitySessions.id })
    .from(dailyActivitySessions)
    .where(
      and(
        or(
          eq(dailyActivitySessions.employeeId, employeeId),
          inArray(
            dailyActivitySessions.id,
            db
              .select({ sessionId: dailyActivitySessionTeamMembers.sessionId })
              .from(dailyActivitySessionTeamMembers)
              .where(eq(dailyActivitySessionTeamMembers.employeeId, employeeId))
          ),
          inArray(
            dailyActivitySessions.id,
            db
              .select({ sessionId: dailyActivitySessionItems.sessionId })
              .from(dailyActivitySessionItems)
              .innerJoin(
                dailyActivitySessionItemTeamMembers,
                eq(dailyActivitySessionItems.id, dailyActivitySessionItemTeamMembers.itemId)
              )
              .where(eq(dailyActivitySessionItemTeamMembers.employeeId, employeeId))
          )
        ),
        eq(dailyActivitySessions.siteId, siteId),
        gte(dailyActivitySessions.workDate, dayStart),
        lte(dailyActivitySessions.workDate, dayEnd)
      )
    )
  const sessionIds = sessions.map((s) => s.id)
  let checkedItemCount = 0
  let totalItemCount = 0
  if (sessionIds.length > 0) {
    const [itemCounts] = await db
      .select({
        total: sql<number>`count(*)`,
        checked: sql<number>`count(*) filter (where ${dailyActivitySessionItems.isChecked} = true)`,
      })
      .from(dailyActivitySessionItems)
      .where(inArray(dailyActivitySessionItems.sessionId, sessionIds))
    checkedItemCount = Number(itemCounts?.checked ?? 0)
    totalItemCount = Number(itemCounts?.total ?? 0)
  }

  // 5. Hitung overtime dari approved SPL
  const [otResult] = await db
    .select({
      totalOtMinutes: sql<number>`
        coalesce(sum(
          extract(epoch from (${overtimeCommandLetters.plannedEndAt} - ${overtimeCommandLetters.plannedStartAt})) / 60
        ), 0)
      `,
    })
    .from(overtimeCommandLetterParticipants)
    .innerJoin(
      overtimeCommandLetters,
      eq(overtimeCommandLetterParticipants.overtimeCommandLetterId, overtimeCommandLetters.id)
    )
    .where(
      and(
        eq(overtimeCommandLetterParticipants.employeeId, employeeId),
        eq(overtimeCommandLetters.status, 'approved'),
        gte(overtimeCommandLetters.workDate, dayStart),
        lte(overtimeCommandLetters.workDate, dayEnd)
      )
    )
  const overtimeMinutes = Math.round(Number(otResult?.totalOtMinutes ?? 0))

  // 6. Upsert snapshot
  await db
    .insert(ewhDailySnapshots)
    .values({
      employeeId,
      siteId,
      workDate: dayStart,
      period,
      shiftCode,
      clockIn: attendance?.clockIn || null,
      clockOut: attendance?.clockOut || null,
      availabilityMinutes: result.availabilityMinutes,
      clockDurationMinutes: result.clockDurationMinutes,
      breakMinutes: result.breakMinutes,
      effectiveMinutes: result.effectiveMinutes,
      idleMinutes: result.idleMinutes,
      ewhPercent: result.ewhPercentStr,
      activitySessionCount: sessions.length,
      checkedItemCount,
      totalItemCount,
      overtimeMinutes,
      calculatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [ewhDailySnapshots.employeeId, ewhDailySnapshots.workDate],
      set: {
        clockIn: attendance?.clockIn || null,
        clockOut: attendance?.clockOut || null,
        availabilityMinutes: result.availabilityMinutes,
        clockDurationMinutes: result.clockDurationMinutes,
        breakMinutes: result.breakMinutes,
        effectiveMinutes: result.effectiveMinutes,
        idleMinutes: result.idleMinutes,
        ewhPercent: result.ewhPercentStr,
        activitySessionCount: sessions.length,
        checkedItemCount,
        totalItemCount,
        overtimeMinutes,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      },
    })
}

/**
 * Recalculate unit utility untuk satu unitNumber pada satu hari kerja tertentu.
 * Dipanggil realtime setiap kali session item dengan unitNumber di-save.
 */
export async function recalculateUnitUtility(
  unitNumber: string,
  siteId: number,
  workDate: Date
): Promise<void> {
  if (!unitNumber.trim()) return

  const period = `${workDate.getFullYear()}-${String(workDate.getMonth() + 1).padStart(2, '0')}`
  const dayStart = new Date(workDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(workDate)
  dayEnd.setHours(23, 59, 59, 999)

  // Ambil semua session items yang memiliki unitNumber ini pada hari ini
  const items = await db
    .select({
      sessionItemId: dailyActivitySessionItems.id,
      sessionCode: dailyActivitySessions.sessionCode,
      employeeId: dailyActivitySessions.employeeId,
      employeeName: employees.name,
      section: employees.section,
      activityLabel: dailyActivitySessionItems.snapshotLabel,
      startedAt: dailyActivitySessionItems.startedAt,
      endedAt: dailyActivitySessionItems.endedAt,
      isChecked: dailyActivitySessionItems.isChecked,
      unitNumber: dailyActivitySessionItems.unitNumber,
      remark: dailyActivitySessionItems.remark,
    })
    .from(dailyActivitySessionItems)
    .innerJoin(
      dailyActivitySessions,
      eq(dailyActivitySessionItems.sessionId, dailyActivitySessions.id)
    )
    .innerJoin(employees, eq(dailyActivitySessions.employeeId, employees.id))
    .where(
      and(
        eq(dailyActivitySessionItems.unitNumber, unitNumber),
        eq(dailyActivitySessions.siteId, siteId),
        gte(dailyActivitySessions.workDate, dayStart),
        lte(dailyActivitySessions.workDate, dayEnd)
      )
    )

  const typedItems: SessionItemEntry[] = items.map((item) => ({
    sessionItemId: item.sessionItemId,
    sessionCode: item.sessionCode,
    employeeId: item.employeeId,
    employeeName: item.employeeName,
    section: item.section ?? '',
    activityLabel: item.activityLabel,
    startedAt: item.startedAt,
    endedAt: item.endedAt,
    isChecked: item.isChecked,
    unitNumber: item.unitNumber,
    remark: item.remark ?? undefined,
  }))

  const result = calculateUnitUtility(unitNumber, typedItems)

  // Resolve ke unit master jika ada
  const [masterUnit] = await db
    .select({ id: unitMaster.id })
    .from(unitMaster)
    .where(
      and(
        eq(unitMaster.siteId, siteId),
        sql`lower(${unitMaster.unitCode}) = ${unitNumber.toLowerCase()}`
      )
    )
    .limit(1)

  const operatorSnapshot = result.operators.map((op) => ({
    employeeId: op.employeeId,
    employeeName: op.employeeName,
    section: op.section,
    activityLabel: op.activityLabel,
    sessionCode: op.sessionCode,
    startedAt: op.startedAt?.toISOString() ?? null,
    endedAt: op.endedAt?.toISOString() ?? null,
    durationMinutes: op.durationMinutes,
    operationMode: op.operationMode,
  }))

  await db
    .insert(unitUtilityDaily)
    .values({
      unitNumber,
      unitId: masterUnit?.id ?? null,
      siteId,
      workDate: dayStart,
      period,
      totalUsageMinutes: result.totalUsageMinutes,
      utilityPercent: result.utilityPercentStr,
      operatorCount: result.operatorCount,
      activityEntryCount: result.activityEntryCount,
      breakdownMinutes: result.breakdownMinutes,
      standbyMinutes: result.standbyMinutes,
      operatorSnapshot,
      calculatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [unitUtilityDaily.unitNumber, unitUtilityDaily.siteId, unitUtilityDaily.workDate],
      set: {
        unitId: masterUnit?.id ?? null,
        totalUsageMinutes: result.totalUsageMinutes,
        utilityPercent: result.utilityPercentStr,
        operatorCount: result.operatorCount,
        activityEntryCount: result.activityEntryCount,
        breakdownMinutes: result.breakdownMinutes,
        standbyMinutes: result.standbyMinutes,
        operatorSnapshot,
        calculatedAt: new Date(),
        updatedAt: new Date(),
      },
    })
}

// ============================================================
// READ ACTIONS
// ============================================================

/**
 * Ambil summary EWH semua karyawan untuk satu site satu period (atau Semua Site jika siteIdParam = 'ALL' / null).
 * Menghubungkan Master Data hero_employees dengan real attendance, daily activities, dan approved SPL.
 */
export async function getEwhSummaryAction(
  siteIdParam?: number | null | string,
  period: string = '',
  departmentIdParam?: number | null | string
) {
  let parsedSiteId: number | null = null
  if (siteIdParam && siteIdParam !== 'ALL' && siteIdParam !== 'all') {
    const parsed = typeof siteIdParam === 'number' ? siteIdParam : parseInt(String(siteIdParam), 10)
    if (!isNaN(parsed) && parsed > 0) parsedSiteId = parsed
  }

  let parsedDeptId: number | null = null
  if (departmentIdParam && departmentIdParam !== 'ALL' && departmentIdParam !== 'all') {
    const parsed = typeof departmentIdParam === 'number' ? departmentIdParam : parseInt(String(departmentIdParam), 10)
    if (!isNaN(parsed) && parsed > 0) parsedDeptId = parsed
  }

  let deptNameFilter: string | null = null
  if (parsedDeptId) {
    const [dept] = await db
      .select({ name: masterDepartments.name })
      .from(masterDepartments)
      .where(eq(masterDepartments.id, parsedDeptId))
      .limit(1)
    if (dept) deptNameFilter = dept.name
  }

  const [yearStr, monthStr] = period.split('-')
  const year = parseInt(yearStr, 10) || new Date().getFullYear()
  const month = parseInt(monthStr, 10) || new Date().getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

  // 1. Query Master Data Karyawan Aktif
  const empWhere = [
    eq(employees.isActive, true),
    eq(employees.employmentStatus, 'active'),
  ]
  if (parsedSiteId !== null) {
    empWhere.push(eq(employees.siteId, parsedSiteId))
  }
  if (parsedDeptId) {
    empWhere.push(
      or(
        eq(employees.departmentId, parsedDeptId),
        deptNameFilter ? ilike(employees.department, `%${deptNameFilter}%`) : undefined
      )!
    )
  }

  const rawTargetEmployees = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      jobTitle: employees.jobTitle,
      role: employees.role,
      section: employees.section,
      department: employees.department,
      departmentId: employees.departmentId,
      siteId: employees.siteId,
    })
    .from(employees)
    .where(and(...empWhere))
    .orderBy(employees.name)

  // Check any employee who submitted Daily Activity or was included as a team member in this period
  const periodSessionEmpRecords = await db
    .select({ employeeId: dailyActivitySessions.employeeId })
    .from(dailyActivitySessions)
    .where(
      and(
        parsedSiteId !== null ? eq(dailyActivitySessions.siteId, parsedSiteId) : undefined,
        gte(dailyActivitySessions.workDate, monthStart),
        lte(dailyActivitySessions.workDate, monthEnd)
      )!
    )
  const periodTeamEmpRecords = await db
    .select({ employeeId: dailyActivitySessionTeamMembers.employeeId })
    .from(dailyActivitySessionTeamMembers)
    .innerJoin(
      dailyActivitySessions,
      eq(dailyActivitySessionTeamMembers.sessionId, dailyActivitySessions.id)
    )
    .where(
      and(
        parsedSiteId !== null ? eq(dailyActivitySessions.siteId, parsedSiteId) : undefined,
        gte(dailyActivitySessions.workDate, monthStart),
        lte(dailyActivitySessions.workDate, monthEnd)
      )!
    )
  const periodItemTeamEmpRecords = await db
    .select({ employeeId: dailyActivitySessionItemTeamMembers.employeeId })
    .from(dailyActivitySessionItemTeamMembers)
    .innerJoin(
      dailyActivitySessionItems,
      eq(dailyActivitySessionItemTeamMembers.itemId, dailyActivitySessionItems.id)
    )
    .innerJoin(
      dailyActivitySessions,
      eq(dailyActivitySessionItems.sessionId, dailyActivitySessions.id)
    )
    .where(
      and(
        parsedSiteId !== null ? eq(dailyActivitySessions.siteId, parsedSiteId) : undefined,
        gte(dailyActivitySessions.workDate, monthStart),
        lte(dailyActivitySessions.workDate, monthEnd)
      )!
    )
  const activeSessionEmpIdSet = new Set([
    ...periodSessionEmpRecords.map((s) => s.employeeId),
    ...periodTeamEmpRecords.map((t) => t.employeeId),
    ...periodItemTeamEmpRecords.map((t) => t.employeeId),
  ])

  // Focus EWH calculations strictly on Servicemen across all sites & departments
  // (Technical, PJO, and Repair/Retread are excluded to maintain true EWH ratio and powerman)
  const targetEmployees = rawTargetEmployees.filter((e) => isServicemanEmployee(e))

  if (targetEmployees.length === 0) {
    return { success: true as const, rows: [] }
  }

  const targetEmpIds = targetEmployees.map((e) => e.id)

  // 2. Fetch parallel data
  const attOverrideWhere = [
    eq(timesheetAttendanceRealOverrides.period, period),
    inArray(timesheetAttendanceRealOverrides.employeeId, targetEmpIds),
  ]
  if (parsedSiteId !== null) {
    attOverrideWhere.push(eq(timesheetAttendanceRealOverrides.siteId, parsedSiteId))
  }

  const rawAttWhere = [
    inArray(attendanceRecords.employeeId, targetEmpIds),
    gte(attendanceRecords.eventTime, monthStart),
    lte(attendanceRecords.eventTime, monthEnd),
  ]
  if (parsedSiteId !== null) {
    rawAttWhere.push(eq(attendanceRecords.siteId, parsedSiteId))
  }

  const sessionsWhere = [
    or(
      inArray(dailyActivitySessions.employeeId, targetEmpIds),
      inArray(
        dailyActivitySessions.id,
        db
          .select({ sessionId: dailyActivitySessionTeamMembers.sessionId })
          .from(dailyActivitySessionTeamMembers)
          .where(inArray(dailyActivitySessionTeamMembers.employeeId, targetEmpIds))
      ),
      inArray(
        dailyActivitySessions.id,
        db
          .select({ sessionId: dailyActivitySessionItems.sessionId })
          .from(dailyActivitySessionItems)
          .innerJoin(
            dailyActivitySessionItemTeamMembers,
            eq(dailyActivitySessionItems.id, dailyActivitySessionItemTeamMembers.itemId)
          )
          .where(inArray(dailyActivitySessionItemTeamMembers.employeeId, targetEmpIds))
      )
    ),
    gte(dailyActivitySessions.workDate, monthStart),
    lte(dailyActivitySessions.workDate, monthEnd),
  ]
  if (parsedSiteId !== null) {
    sessionsWhere.push(eq(dailyActivitySessions.siteId, parsedSiteId))
  }

  const directActsWhere = [
    inArray(activities.employeeId, targetEmpIds),
    isNull(activities.deletedAt),
    or(
      and(gte(activities.startTime, monthStart), lte(activities.startTime, monthEnd)),
      and(gte(activities.submissionTime, monthStart), lte(activities.submissionTime, monthEnd))
    ),
  ]
  if (parsedSiteId !== null) {
    directActsWhere.push(eq(activities.siteId, parsedSiteId))
  }

  const [
    attOverrides,
    rawAttRecords,
    sessions,
    directActs,
    approvedOt,
    shiftConfigs,
  ] = await Promise.all([
    // Attendance real overrides
    db
      .select({
        employeeId: timesheetAttendanceRealOverrides.employeeId,
        day: timesheetAttendanceRealOverrides.day,
        clockIn: timesheetAttendanceRealOverrides.clockIn,
        clockOut: timesheetAttendanceRealOverrides.clockOut,
        status: timesheetAttendanceRealOverrides.status,
      })
      .from(timesheetAttendanceRealOverrides)
      .where(and(...attOverrideWhere)),

    // Raw biometric / face attendance logs
    db
      .select({
        employeeId: attendanceRecords.employeeId,
        eventTime: attendanceRecords.eventTime,
        eventType: attendanceRecords.eventType,
      })
      .from(attendanceRecords)
      .where(and(...rawAttWhere)),

    // Daily activity sessions
    db
      .select({
        id: dailyActivitySessions.id,
        employeeId: dailyActivitySessions.employeeId,
        workDate: dailyActivitySessions.workDate,
        startedAt: dailyActivitySessions.startedAt,
        submittedAt: dailyActivitySessions.submittedAt,
      })
      .from(dailyActivitySessions)
      .where(and(...sessionsWhere)),

    // Direct Activities
    db
      .select({
        id: activities.id,
        employeeId: activities.employeeId,
        title: activities.title,
        customActivityName: activities.customActivityName,
        startTime: activities.startTime,
        endTime: activities.endTime,
        submissionTime: activities.submissionTime,
      })
      .from(activities)
      .where(and(...directActsWhere)),

    // Approved Overtime (SPL)
    db
      .select({
        employeeId: overtimeCommandLetterParticipants.employeeId,
        workDate: overtimeCommandLetters.workDate,
        plannedStartAt: overtimeCommandLetters.plannedStartAt,
        plannedEndAt: overtimeCommandLetters.plannedEndAt,
      })
      .from(overtimeCommandLetterParticipants)
      .innerJoin(
        overtimeCommandLetters,
        eq(overtimeCommandLetterParticipants.overtimeCommandLetterId, overtimeCommandLetters.id)
      )
      .where(
        and(
          inArray(overtimeCommandLetterParticipants.employeeId, targetEmpIds),
          eq(overtimeCommandLetters.status, 'approved'),
          gte(overtimeCommandLetters.workDate, monthStart),
          lte(overtimeCommandLetters.workDate, monthEnd)
        )
      ),

    // Shift config break minutes
    db
      .select({ breakMinutes: ewhShiftConfig.breakMinutes, shiftCode: ewhShiftConfig.shiftCode })
      .from(ewhShiftConfig)
      .where(
        and(
          parsedSiteId !== null ? eq(ewhShiftConfig.siteId, parsedSiteId) : undefined,
          eq(ewhShiftConfig.isActive, true)
        )!
      ),
  ])

  // Fetch session items count & labels + session team members
  let sessionItems: Array<{ sessionId: number; label: string; isChecked: boolean }> = []
  let sessionTeamMembers: Array<{ sessionId: number; employeeId: number }> = []
  if (sessions.length > 0) {
    const sIds = sessions.map((s) => s.id)
    const [fetchedItems, fetchedTeamMembers, fetchedItemTeamMembers] = await Promise.all([
      db
        .select({
          sessionId: dailyActivitySessionItems.sessionId,
          label: dailyActivitySessionItems.snapshotLabel,
          isChecked: dailyActivitySessionItems.isChecked,
        })
        .from(dailyActivitySessionItems)
        .where(inArray(dailyActivitySessionItems.sessionId, sIds)),
      db
        .select({
          sessionId: dailyActivitySessionTeamMembers.sessionId,
          employeeId: dailyActivitySessionTeamMembers.employeeId,
        })
        .from(dailyActivitySessionTeamMembers)
        .where(inArray(dailyActivitySessionTeamMembers.sessionId, sIds)),
      db
        .select({
          sessionId: dailyActivitySessionItems.sessionId,
          employeeId: dailyActivitySessionItemTeamMembers.employeeId,
        })
        .from(dailyActivitySessionItemTeamMembers)
        .innerJoin(
          dailyActivitySessionItems,
          eq(dailyActivitySessionItemTeamMembers.itemId, dailyActivitySessionItems.id)
        )
        .where(inArray(dailyActivitySessionItems.sessionId, sIds)),
    ])
    sessionItems = fetchedItems
    sessionTeamMembers = [...fetchedTeamMembers, ...fetchedItemTeamMembers]
  }

  const sessionTeamMemberMap = new Map<number, Set<number>>()
  sessionTeamMembers.forEach((tm) => {
    let set = sessionTeamMemberMap.get(tm.sessionId)
    if (!set) {
      set = new Set()
      sessionTeamMemberMap.set(tm.sessionId, set)
    }
    set.add(tm.employeeId)
  })

  const sessionItemsMap = new Map<number, { total: number; checked: number; items: typeof sessionItems }>()
  sessionItems.forEach((it) => {
    const curr = sessionItemsMap.get(it.sessionId) || { total: 0, checked: 0, items: [] }
    curr.total += 1
    if (it.isChecked) curr.checked += 1
    curr.items.push(it)
    sessionItemsMap.set(it.sessionId, curr)
  })

  const defaultBreakMinutes = shiftConfigs.find((c) => c.shiftCode === 'ALL' || c.shiftCode === 'DS')?.breakMinutes ?? 60

  // 3. Build live summary rows
  const resultRows: EwhSummaryRow[] = []
  const snapshotsToUpsert: any[] = []

  for (const emp of targetEmployees) {
    for (let day = 1; day <= daysInMonth; day++) {
      const workDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0))
      const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))

      // A. Attendance override
      const attOverride = attOverrides.find((a) => a.employeeId === emp.id && a.day === day)
      let clockIn = attOverride?.clockIn || null
      let clockOut = attOverride?.clockOut || null
      let shiftCode = attOverride?.status || 'DS'

      // B. Raw attendance fallback
      if (!clockIn || !clockOut) {
        const dayLogs = rawAttRecords.filter((r) => {
          if (r.employeeId !== emp.id) return false
          const p = parseDateYMD(r.eventTime)
          return p ? p.day === day && p.month === month && p.year === year : false
        })
        for (const log of dayLogs) {
          const timeStr = `${String(log.eventTime.getHours()).padStart(2, '0')}:${String(log.eventTime.getMinutes()).padStart(2, '0')}`
          if (log.eventType.toLowerCase().includes('in') && !clockIn) {
            clockIn = timeStr
          } else if (log.eventType.toLowerCase().includes('out')) {
            clockOut = timeStr
          }
        }
      }

      // C. Daily Activity Sessions (author OR team member)
      const daySessions = sessions.filter((s) => {
        const isMember = s.employeeId === emp.id || sessionTeamMemberMap.get(s.id)?.has(emp.id)
        if (!isMember) return false
        const p = parseDateYMD(s.workDate)
        return p ? p.day === day && p.month === month && p.year === year : false
      })

      let checkedItemCount = 0
      let totalItemCount = 0
      const activityMap: Partial<Record<EwhActivityKey, number>> = {}

      for (const s of daySessions) {
        const counts = sessionItemsMap.get(s.id)
        if (counts) {
          checkedItemCount += counts.checked
          totalItemCount += counts.total
          for (const it of counts.items) {
            const actKey = categorizeSessionActivity(it.label)
            activityMap[actKey] = (activityMap[actKey] || 0) + 1
          }
        }
      }

      // D. Direct Activities
      const dayDirect = directActs.filter((a) => {
        if (a.employeeId !== emp.id) return false
        const p = parseDateYMD(a.startTime || a.submissionTime)
        return p ? p.day === day && p.month === month && p.year === year : false
      })
      for (const d of dayDirect) {
        const actKey = categorizeSessionActivity(d.title || d.customActivityName || '')
        activityMap[actKey] = (activityMap[actKey] || 0) + 1
      }

      const activitiesSummary = Object.entries(activityMap).map(([k, count]) => {
        const col = EWH_ACTIVITY_COLUMNS.find((c) => c.key === k)
        return {
          key: k as EwhActivityKey,
          label: col?.label || k,
          count: count || 0,
        }
      })

      // E. Overtime (SPL)
      const dayOt = approvedOt.filter((o) => {
        if (o.employeeId !== emp.id) return false
        const p = parseDateYMD(o.workDate)
        return p ? p.day === day && p.month === month && p.year === year : false
      })
      let overtimeMinutes = 0
      for (const ot of dayOt) {
        if (ot.plannedStartAt && ot.plannedEndAt) {
          const startObj = new Date(ot.plannedStartAt)
          const endObj = new Date(ot.plannedEndAt)
          if (!isNaN(startObj.getTime()) && !isNaN(endObj.getTime())) {
            let startMin = startObj.getHours() * 60 + startObj.getMinutes()
            let endMin = endObj.getHours() * 60 + endObj.getMinutes()
            if (endMin <= startMin) {
              endMin += 1440 // Overnight shift crossing midnight
            }
            const diff = endMin - startMin
            if (diff > 0 && diff <= 1440) overtimeMinutes += Math.round(diff)
          }
        }
      }

      const hasActivity = daySessions.length > 0 || dayDirect.length > 0
      const hasAttendance = Boolean(clockIn || clockOut)
      const hasOt = overtimeMinutes > 0

      // Only include day if employee was present or had logs
      if (!hasAttendance && !hasActivity && !hasOt) {
        continue
      }

      // Calculate EWH
      const result = calculateEwhDay({
        clockIn,
        clockOut,
        breakMinutes: defaultBreakMinutes,
      })

      const row: EwhSummaryRow = {
        employeeId: emp.id,
        employeeName: emp.name,
        employeeSn: emp.employeeSn || '',
        section: emp.section || '',
        department: emp.department || '',
        shiftCode,
        clockIn,
        clockOut,
        availabilityMinutes: result.availabilityMinutes,
        clockDurationMinutes: result.clockDurationMinutes,
        breakMinutes: result.breakMinutes,
        effectiveMinutes: result.effectiveMinutes,
        idleMinutes: result.idleMinutes,
        ewhPercent: result.ewhPercent,
        ewhPercentStr: result.ewhPercentStr,
        activitySessionCount: daySessions.length,
        checkedItemCount,
        totalItemCount,
        overtimeMinutes,
        workDate,
        period,
        activityMap,
        activitiesSummary,
      }

      resultRows.push(row)

      snapshotsToUpsert.push({
        employeeId: emp.id,
        siteId: emp.siteId || parsedSiteId || 1,
        workDate,
        period,
        shiftCode,
        clockIn,
        clockOut,
        availabilityMinutes: result.availabilityMinutes,
        clockDurationMinutes: result.clockDurationMinutes,
        breakMinutes: result.breakMinutes,
        effectiveMinutes: result.effectiveMinutes,
        idleMinutes: result.idleMinutes,
        ewhPercent: result.ewhPercentStr,
        activitySessionCount: daySessions.length,
        checkedItemCount,
        totalItemCount,
        overtimeMinutes,
        calculatedAt: new Date(),
      })
    }
  }

  // Background persistence to ewhDailySnapshots
  if (snapshotsToUpsert.length > 0) {
    try {
      await Promise.all(
        snapshotsToUpsert.map((s) =>
          db
            .insert(ewhDailySnapshots)
            .values(s)
            .onConflictDoUpdate({
              target: [ewhDailySnapshots.employeeId, ewhDailySnapshots.workDate],
              set: {
                clockIn: s.clockIn,
                clockOut: s.clockOut,
                availabilityMinutes: s.availabilityMinutes,
                clockDurationMinutes: s.clockDurationMinutes,
                breakMinutes: s.breakMinutes,
                effectiveMinutes: s.effectiveMinutes,
                idleMinutes: s.idleMinutes,
                ewhPercent: s.ewhPercent,
                activitySessionCount: s.activitySessionCount,
                checkedItemCount: s.checkedItemCount,
                totalItemCount: s.totalItemCount,
                overtimeMinutes: s.overtimeMinutes,
                calculatedAt: new Date(),
                updatedAt: new Date(),
              },
            })
        )
      )
    } catch (err) {
      console.warn('EWH snapshots background sync non-critical warning:', err)
    }
  }

  return {
    success: true as const,
    rows: resultRows,
  }
}

/**
 * Ambil detail EWH per karyawan per period.
 */
export async function getEwhDetailAction(employeeId: number, period: string) {
  const [emp] = await db
    .select({ siteId: employees.siteId, departmentId: employees.departmentId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1)

  if (!emp) return { success: true as const, rows: [] }

  const summaryRes = await getEwhSummaryAction(emp.siteId || 1, period, emp.departmentId)
  const rows = summaryRes.rows.filter((r) => r.employeeId === employeeId)

  return {
    success: true as const,
    rows: rows.map((r, idx) => ({
      id: idx + 1,
      workDate: r.workDate,
      clockIn: r.clockIn,
      clockOut: r.clockOut,
      clockDurationMinutes: r.clockDurationMinutes,
      breakMinutes: r.breakMinutes,
      effectiveMinutes: r.effectiveMinutes,
      idleMinutes: r.idleMinutes,
      ewhPercent: typeof r.ewhPercent === 'number' ? r.ewhPercent : parseFloat(String(r.ewhPercent)),
      overtimeMinutes: r.overtimeMinutes,
    })),
  }
}

/**
 * Ambil summary Unit Utility per site per tanggal.
 */
export async function getUnitUtilitySummaryAction(siteId: number, workDate: Date) {
  const dayStart = new Date(workDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(workDate)
  dayEnd.setHours(23, 59, 59, 999)

  const rows = await db
    .select({
      id: unitUtilityDaily.id,
      unitNumber: unitUtilityDaily.unitNumber,
      unitId: unitUtilityDaily.unitId,
      unitName: unitMaster.unitName,
      unitType: unitMaster.unitType,
      totalUsageMinutes: unitUtilityDaily.totalUsageMinutes,
      utilityPercent: unitUtilityDaily.utilityPercent,
      operatorCount: unitUtilityDaily.operatorCount,
      activityEntryCount: unitUtilityDaily.activityEntryCount,
      breakdownMinutes: unitUtilityDaily.breakdownMinutes,
      standbyMinutes: unitUtilityDaily.standbyMinutes,
      operatorSnapshot: unitUtilityDaily.operatorSnapshot,
    })
    .from(unitUtilityDaily)
    .leftJoin(unitMaster, eq(unitUtilityDaily.unitId, unitMaster.id))
    .where(
      and(
        eq(unitUtilityDaily.siteId, siteId),
        gte(unitUtilityDaily.workDate, dayStart),
        lte(unitUtilityDaily.workDate, dayEnd)
      )
    )
    .orderBy(sql`${unitUtilityDaily.utilityPercent}::numeric desc`)

  return {
    success: true as const,
    rows: rows.map((r) => ({
      ...r,
      utilityPercent: parseFloat(r.utilityPercent),
    })),
  }
}

// ============================================================
// UNIT MASTER CRUD
// ============================================================

export async function getUnitMasterAction(siteId: number) {
  const units = await db
    .select()
    .from(unitMaster)
    .where(eq(unitMaster.siteId, siteId))
    .orderBy(unitMaster.unitCode)
  return { success: true as const, units }
}

export async function createUnitAction(data: {
  siteId: number
  unitCode: string
  unitName: string
  unitType: string
  unitModel?: string
  unitYear?: number
  licensePlate?: string
  capacity?: string
  capacityUnit?: string
  department?: string
  notes?: string
}) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) throw new Error('Unauthorized')

  const [unit] = await db
    .insert(unitMaster)
    .values({
      siteId: data.siteId,
      unitCode: data.unitCode.toUpperCase().trim(),
      unitName: data.unitName.trim(),
      unitType: data.unitType,
      unitModel: data.unitModel ?? '',
      unitYear: data.unitYear ?? null,
      licensePlate: data.licensePlate ?? '',
      capacity: data.capacity ?? '',
      capacityUnit: data.capacityUnit ?? 'ton',
      department: data.department ?? '',
      notes: data.notes ?? '',
    })
    .returning()

  revalidatePath('/dashboard/unit-utility/master')
  return { success: true as const, unit }
}

export async function updateUnitAction(
  id: number,
  data: Partial<{
    unitName: string
    unitType: string
    unitModel: string
    unitYear: number
    licensePlate: string
    capacity: string
    capacityUnit: string
    department: string
    notes: string
    isActive: boolean
  }>
) {
  await getCurrentEmployee()
  await db
    .update(unitMaster)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(unitMaster.id, id))
  revalidatePath('/dashboard/unit-utility/master')
  return { success: true as const }
}

export async function deleteUnitAction(id: number) {
  await getCurrentEmployee()
  await db.delete(unitMaster).where(eq(unitMaster.id, id))
  revalidatePath('/dashboard/unit-utility/master')
  return { success: true as const }
}

// ============================================================
// EWH SHIFT CONFIG CRUD
// ============================================================

export async function getEwhShiftConfigAction(siteId: number) {
  const configs = await db
    .select()
    .from(ewhShiftConfig)
    .where(and(eq(ewhShiftConfig.siteId, siteId), eq(ewhShiftConfig.isActive, true)))
    .orderBy(ewhShiftConfig.shiftCode)
  return { success: true as const, configs }
}

export async function upsertEwhShiftConfigAction(data: {
  siteId: number
  shiftCode: 'DS' | 'NS' | 'ALL'
  breakMinutes: number
}) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) throw new Error('Unauthorized')

  await db
    .insert(ewhShiftConfig)
    .values({
      siteId: data.siteId,
      shiftCode: data.shiftCode,
      breakMinutes: data.breakMinutes,
      createdByEmployeeId: currentEmployee.id,
    })
    .onConflictDoUpdate({
      target: [ewhShiftConfig.siteId, ewhShiftConfig.shiftCode],
      set: { breakMinutes: data.breakMinutes, updatedAt: new Date() },
    })

  revalidatePath('/dashboard/ewh')
  return { success: true as const }
}

// ============================================================
// EWH TEAM CRUD
// ============================================================

export async function getEwhTeamsAction(siteIdParam?: number | null | string) {
  let parsedSiteId: number | null = null
  if (siteIdParam && siteIdParam !== 'ALL' && siteIdParam !== 'all') {
    const parsed = typeof siteIdParam === 'number' ? siteIdParam : parseInt(String(siteIdParam), 10)
    if (!isNaN(parsed) && parsed > 0) parsedSiteId = parsed
  }

  const whereConditions = parsedSiteId !== null ? [eq(ewhTeams.siteId, parsedSiteId)] : []

  const teams = await db
    .select()
    .from(ewhTeams)
    .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    .orderBy(ewhTeams.name)

  const teamsWithMembers = await Promise.all(
    teams.map(async (t) => {
      const members = await db
        .select({
          id: ewhTeamMembers.id,
          employeeId: ewhTeamMembers.employeeId,
          role: ewhTeamMembers.role,
          name: employees.name,
          employeeSn: employees.employeeSn,
          jobTitle: employees.jobTitle,
        })
        .from(ewhTeamMembers)
        .innerJoin(employees, eq(employees.id, ewhTeamMembers.employeeId))
        .where(eq(ewhTeamMembers.teamId, t.id))
      return { ...t, members }
    })
  )

  return { success: true as const, teams: teamsWithMembers }
}

export async function createEwhTeamAction(data: {
  name: string
  siteId: number
  section: string
  employeeIds: number[]
}) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) throw new Error('Unauthorized')

  const [team] = await db
    .insert(ewhTeams)
    .values({
      name: data.name.trim(),
      siteId: data.siteId,
      section: data.section.trim(),
    })
    .returning()

  if (data.employeeIds.length > 0) {
    await db.insert(ewhTeamMembers).values(
      data.employeeIds.map((empId) => ({
        teamId: team.id,
        employeeId: empId,
        role: 'member',
      }))
    )
  }

  revalidatePath('/dashboard/ewh')
  return { success: true as const, team }
}

export async function updateEwhTeamAction(
  teamId: number,
  data: {
    name: string
    section: string
    employeeIds: number[]
  }
) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) throw new Error('Unauthorized')

  await db
    .update(ewhTeams)
    .set({
      name: data.name.trim(),
      section: data.section.trim(),
      updatedAt: new Date(),
    })
    .where(eq(ewhTeams.id, teamId))

  // Sync members
  await db.delete(ewhTeamMembers).where(eq(ewhTeamMembers.teamId, teamId))
  if (data.employeeIds.length > 0) {
    await db.insert(ewhTeamMembers).values(
      data.employeeIds.map((empId) => ({
        teamId,
        employeeId: empId,
        role: 'member',
      }))
    )
  }

  revalidatePath('/dashboard/ewh')
  return { success: true as const }
}

export async function deleteEwhTeamAction(teamId: number) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) throw new Error('Unauthorized')

  await db.delete(ewhTeams).where(eq(ewhTeams.id, teamId))
  revalidatePath('/dashboard/ewh')
  return { success: true as const }
}

export async function getEwhEmployeesAction(
  siteIdParam?: number | null | string,
  departmentIdParam?: number | null | string
) {
  let parsedSiteId: number | null = null
  if (siteIdParam && siteIdParam !== 'ALL' && siteIdParam !== 'all') {
    const parsed = typeof siteIdParam === 'number' ? siteIdParam : parseInt(String(siteIdParam), 10)
    if (!isNaN(parsed) && parsed > 0) parsedSiteId = parsed
  }

  let parsedDeptId: number | null = null
  if (departmentIdParam && departmentIdParam !== 'ALL' && departmentIdParam !== 'all') {
    const parsed = typeof departmentIdParam === 'number' ? departmentIdParam : parseInt(String(departmentIdParam), 10)
    if (!isNaN(parsed) && parsed > 0) parsedDeptId = parsed
  }

  let deptNameFilter: string | null = null
  if (parsedDeptId) {
    const [dept] = await db
      .select({ name: masterDepartments.name })
      .from(masterDepartments)
      .where(eq(masterDepartments.id, parsedDeptId))
      .limit(1)
    if (dept) deptNameFilter = dept.name
  }

  const whereConditions = [
    eq(employees.isActive, true),
    eq(employees.employmentStatus, 'active'),
  ]

  if (parsedSiteId !== null) {
    whereConditions.push(eq(employees.siteId, parsedSiteId))
  }

  if (parsedDeptId) {
    whereConditions.push(
      or(
        eq(employees.departmentId, parsedDeptId),
        deptNameFilter ? ilike(employees.department, `%${deptNameFilter}%`) : undefined
      )!
    )
  }

  const rawList = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      jobTitle: employees.jobTitle,
      role: employees.role,
      department: employees.department,
      section: employees.section,
    })
    .from(employees)
    .where(and(...whereConditions))
    .orderBy(employees.name)

  const list = rawList.filter((e) => isServicemanEmployee(e))
  return { success: true as const, employees: list }
}

// ============================================================
// EWH MONTHLY MATRIX (UTILITIES & EFFECTIVE WORKING HOURS)
// ============================================================


export interface EwhMatrixDayRow {
  day: number
  dateStr: string
  p5m: number
  checkPressure: number
  adjustPressure: number
  reseal: number
  assembly: number
  disassembly: number
  mounting: number
  dismounting: number
  pmCheck: number
  cleanUp: number
  maintenanceRim: number
  retorque: number
  durasiKerjaHours: number
  ewhHoursPerPerson: number
  ewhRatioPercent: number
  workerCount: number
}

export interface EwhWeeklyBreakdownItem {
  weekNumber: number
  label: string
  rangeStr: string
  startDay: number
  endDay: number
  p5m: number
  checkPressure: number
  adjustPressure: number
  reseal: number
  assembly: number
  disassembly: number
  mounting: number
  dismounting: number
  pmCheck: number
  cleanUp: number
  maintenanceRim: number
  retorque: number
  totalHours: number
  ewhHoursPerPerson: number
  ewhRatioPercent: number
  workerCount: number
}

export interface EwhMtdSummary {
  cutoffDay: number
  cutoffDateStr: string
  totalHours: number
  mtdEwhAverage: number
  mtdEfficiencyPercent: number
  activeDaysCount: number
  workerCount: number
  activities: Record<EwhActivityKey, number>
}

export interface EwhYtdMonthItem {
  monthIndex: number // 1..12
  period: string     // "2026-01"
  monthName: string  // "Januari"
  shortMonth: string // "Jan"
  totalHours: number
  powerman: number
  ewhAverage: number
  efficiencyPercent: number
  totalActivities: number
  isCurrentOrPast: boolean
}

export interface EwhYtdSummary {
  year: number
  months: EwhYtdMonthItem[]
  ytdTotalHours: number
  ytdAverageEwh: number
  ytdAverageEfficiency: number
  activeMonthsCount: number
}

export interface EwhSiteMonthlyMatrixResult {
  success: boolean
  siteId: number | null
  siteName: string
  departmentId: number | null
  departmentName: string
  period: string
  powerman: number
  defaultPowerman: number
  shiftHours: number // 22 (2 shift)
  matrix: EwhMatrixDayRow[]
  weeklyBreakdown: EwhWeeklyBreakdownItem[]
  mtdSummary: EwhMtdSummary
  ytdSummary: EwhYtdSummary
  sumRow: {
    p5m: number
    checkPressure: number
    adjustPressure: number
    reseal: number
    assembly: number
    disassembly: number
    mounting: number
    dismounting: number
    pmCheck: number
    cleanUp: number
    maintenanceRim: number
    retorque: number
    totalDurasiKerjaHours: number
    monthlyEwhAverage: number
    monthlyEfficiencyPercent: number
  }
  chartData: Array<{
    name: string
    shortName: string
    value: number
    color?: string
  }>
  allSites: Array<{ id: number; name: string }>
  allDepartments: Array<{ id: number; code: string; name: string }>
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const MONTH_SHORTS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des',
]

export async function getEwhSiteMonthlyMatrixAction(
  siteIdParam?: number | null | string,
  periodParam?: string | null,
  departmentIdParam?: number | null | string
): Promise<EwhSiteMonthlyMatrixResult> {
  const [allSites, allDepartments] = await Promise.all([
    db
      .select({ id: sites.id, name: sites.name })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(sites.name),
    db
      .select({ id: masterDepartments.id, code: masterDepartments.code, name: masterDepartments.name })
      .from(masterDepartments)
      .where(eq(masterDepartments.isActive, true))
      .orderBy(masterDepartments.name),
  ])

  let activeSiteId: number | null = null
  if (siteIdParam && siteIdParam !== 'ALL' && siteIdParam !== 'all') {
    const parsed = typeof siteIdParam === 'number' ? siteIdParam : parseInt(String(siteIdParam), 10)
    if (!isNaN(parsed) && parsed > 0) activeSiteId = parsed
  }

  const siteRecord = activeSiteId
    ? allSites.find((s) => s.id === activeSiteId) || { id: activeSiteId, name: `Site #${activeSiteId}` }
    : { id: 0, name: 'Semua Site' }

  const now = new Date()
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const period = periodParam || defaultPeriod
  const [yearStr, monthStr] = period.split('-')
  const year = parseInt(yearStr, 10) || now.getFullYear()
  const month = parseInt(monthStr, 10) || now.getMonth() + 1

  // Resolve department filter
  let parsedDeptId: number | null = null
  if (departmentIdParam === 'ALL' || departmentIdParam === '' || departmentIdParam === undefined || departmentIdParam === null) {
    parsedDeptId = null
  } else {
    const parsed = typeof departmentIdParam === 'number' ? departmentIdParam : parseInt(String(departmentIdParam), 10)
    if (!isNaN(parsed) && parsed > 0) parsedDeptId = parsed
  }

  const selectedDept = parsedDeptId ? allDepartments.find((d) => d.id === parsedDeptId) : null
  const departmentName = selectedDept ? selectedDept.name : 'Semua Departemen'

  // Hitung jumlah hari dalam bulan tsb (28-31)
  const daysInMonth = new Date(year, month, 0).getDate()
  const yearStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0))
  const yearEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
  const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0))
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

  // 1. Query Data Karyawan Master Data (Single Source of Truth: hero_employees)
  const empWhere = [
    eq(employees.isActive, true),
    eq(employees.employmentStatus, 'active'),
  ]
  if (activeSiteId !== null) {
    empWhere.push(eq(employees.siteId, activeSiteId))
  }
  if (parsedDeptId && selectedDept) {
    empWhere.push(
      or(
        eq(employees.departmentId, parsedDeptId),
        ilike(employees.department, `%${selectedDept.name}%`)
      )!
    )
  }

  const rawTargetEmployees = await db
    .select({
      id: employees.id,
      siteId: employees.siteId,
      departmentId: employees.departmentId,
      department: employees.department,
      section: employees.section,
      jobTitle: employees.jobTitle,
      role: employees.role,
      name: employees.name,
    })
    .from(employees)
    .where(and(...empWhere))

  // 2. Query Year Sessions & Direct Activities for YTD & Current Month + Month Attendance
  const sessionWhere = [
    gte(dailyActivitySessions.workDate, yearStart),
    lte(dailyActivitySessions.workDate, yearEnd),
  ]
  if (activeSiteId !== null) {
    sessionWhere.push(eq(dailyActivitySessions.siteId, activeSiteId))
  }

  const directActsWhere = [
    isNull(activities.deletedAt),
    or(
      and(gte(activities.startTime, yearStart), lte(activities.startTime, yearEnd)),
      and(gte(activities.submissionTime, yearStart), lte(activities.submissionTime, yearEnd))
    ),
  ]
  if (activeSiteId !== null) {
    directActsWhere.push(eq(activities.siteId, activeSiteId))
  }

  const attOverridesWhere = [
    eq(timesheetAttendanceRealOverrides.period, period),
  ]
  if (activeSiteId !== null) {
    attOverridesWhere.push(eq(timesheetAttendanceRealOverrides.siteId, activeSiteId))
  }

  const attRecordsWhere = [
    gte(attendanceRecords.eventTime, monthStart),
    lte(attendanceRecords.eventTime, monthEnd),
  ]
  if (activeSiteId !== null) {
    attRecordsWhere.push(eq(attendanceRecords.siteId, activeSiteId))
  }

  const [allYearSessions, allYearDirectActs, allMonthAttOverrides, allMonthAttRecords] = await Promise.all([
    db
      .select({
        id: dailyActivitySessions.id,
        workDate: dailyActivitySessions.workDate,
        employeeId: dailyActivitySessions.employeeId,
        startedAt: dailyActivitySessions.startedAt,
        submittedAt: dailyActivitySessions.submittedAt,
        siteId: dailyActivitySessions.siteId,
      })
      .from(dailyActivitySessions)
      .where(and(...sessionWhere)),
    db
      .select({
        id: activities.id,
        employeeId: activities.employeeId,
        title: activities.title,
        customActivityName: activities.customActivityName,
        startTime: activities.startTime,
        endTime: activities.endTime,
        submissionTime: activities.submissionTime,
        status: activities.status,
        siteId: activities.siteId,
      })
      .from(activities)
      .where(and(...directActsWhere)),
    db
      .select({
        employeeId: timesheetAttendanceRealOverrides.employeeId,
        day: timesheetAttendanceRealOverrides.day,
        status: timesheetAttendanceRealOverrides.status,
        clockIn: timesheetAttendanceRealOverrides.clockIn,
        clockOut: timesheetAttendanceRealOverrides.clockOut,
      })
      .from(timesheetAttendanceRealOverrides)
      .where(and(...attOverridesWhere)),
    db
      .select({
        employeeId: attendanceRecords.employeeId,
        eventTime: attendanceRecords.eventTime,
        eventType: attendanceRecords.eventType,
      })
      .from(attendanceRecords)
      .where(and(...attRecordsWhere)),
  ])

  // Include any employee who submitted activities or was registered as a team member in the period
  const allYearTeamEmpRecords = await db
    .select({
      employeeId: dailyActivitySessionTeamMembers.employeeId,
      sessionId: dailyActivitySessionTeamMembers.sessionId,
    })
    .from(dailyActivitySessionTeamMembers)
    .innerJoin(
      dailyActivitySessions,
      eq(dailyActivitySessionTeamMembers.sessionId, dailyActivitySessions.id)
    )
    .where(and(...sessionWhere))

  const allYearItemTeamEmpRecords = await db
    .select({
      employeeId: dailyActivitySessionItemTeamMembers.employeeId,
      sessionId: dailyActivitySessionItems.sessionId,
    })
    .from(dailyActivitySessionItemTeamMembers)
    .innerJoin(
      dailyActivitySessionItems,
      eq(dailyActivitySessionItemTeamMembers.itemId, dailyActivitySessionItems.id)
    )
    .innerJoin(
      dailyActivitySessions,
      eq(dailyActivitySessionItems.sessionId, dailyActivitySessions.id)
    )
    .where(and(...sessionWhere))

  const activeSessionEmpIdSet = new Set([
    ...allYearSessions.map((s) => s.employeeId),
    ...allYearTeamEmpRecords.map((t) => t.employeeId),
    ...allYearItemTeamEmpRecords.map((t) => t.employeeId),
  ])

  // EWH dashboard is strictly dedicated to Servicemen across all sites & departments
  // (Technical, PJO, and Repair/Retread are excluded to maintain true EWH ratio and powerman)
  const targetEmployees = rawTargetEmployees.filter((e) => isServicemanEmployee(e))

  const targetEmployeeIdSet = new Set(targetEmployees.map((e) => e.id))

  const sessionTeamMemberMap = new Map<number, Set<number>>()
  const allTeamRows = [...allYearTeamEmpRecords, ...allYearItemTeamEmpRecords]
  allTeamRows.forEach((tm) => {
    let set = sessionTeamMemberMap.get(tm.sessionId)
    if (!set) {
      set = new Set()
      sessionTeamMemberMap.set(tm.sessionId, set)
    }
    set.add(tm.employeeId)
  })

  // Filter aktivitas khusus karyawan terpilih agar matriks dan hover data selalu 100% sinkron
  const yearSessions = allYearSessions.filter((s) => {
    if (targetEmployeeIdSet.has(s.employeeId)) return true
    const tmSet = sessionTeamMemberMap.get(s.id)
    if (tmSet) {
      for (const id of tmSet) {
        if (targetEmployeeIdSet.has(id)) return true
      }
    }
    return false
  })
  const yearDirectActs = allYearDirectActs.filter((a) => targetEmployeeIdSet.has(a.employeeId))
  const monthAttOverrides = allMonthAttOverrides.filter((att) => targetEmployeeIdSet.has(att.employeeId))
  const monthAttRecords = allMonthAttRecords.filter((att) => targetEmployeeIdSet.has(att.employeeId))

  let yearSessionItems: Array<{
    sessionId: number
    workDate: Date
    label: string
    startedAt: Date | null
    endedAt: Date | null
    isChecked: boolean
    actualPoints: number
  }> = []

  if (yearSessions.length > 0) {
    const ySessionIds = yearSessions.map((s) => s.id)
    const rawItems = await db
      .select({
        sessionId: dailyActivitySessionItems.sessionId,
        label: dailyActivitySessionItems.snapshotLabel,
        startedAt: dailyActivitySessionItems.startedAt,
        endedAt: dailyActivitySessionItems.endedAt,
        isChecked: dailyActivitySessionItems.isChecked,
        actualPoints: dailyActivitySessionItems.actualPoints,
      })
      .from(dailyActivitySessionItems)
      .where(inArray(dailyActivitySessionItems.sessionId, ySessionIds))

    const sessionDateMap = new Map(yearSessions.map((s) => [s.id, s.workDate]))
    yearSessionItems = rawItems.map((it) => ({
      ...it,
      workDate: sessionDateMap.get(it.sessionId) || new Date(),
    }))
  }

  // Filter for the selected month using timezone-safe parseDateYMD
  const monthSessions = yearSessions.filter((s) => {
    const p = parseDateYMD(s.workDate)
    return p ? p.month === month && p.year === year : false
  })
  const monthSessionItems = yearSessionItems.filter((it) => {
    const p = parseDateYMD(it.workDate)
    return p ? p.month === month && p.year === year : false
  })
  const monthDirectActs = yearDirectActs.filter((act) => {
    const p = parseDateYMD(act.startTime || act.submissionTime)
    return p ? p.month === month && p.year === year : false
  })

  // 3. Powerman Otomatis dari Master Data Karyawan Aktif (hero_employees)
  const defaultPowerman = targetEmployees.length > 0 ? targetEmployees.length : 1
  const powerman = defaultPowerman
  const shiftHours = 22 // 2 Shift operasional sehari (22 Jam/Hari)

  // 4. Build Matriks Harian (1..31) dari Data Riil Daily Activity & Attendance
  const matrix: EwhMatrixDayRow[] = []
  let totalDurasiHoursSum = 0
  let activeWorkDaysCount = 0

  const sumCounts: Record<EwhActivityKey, number> = {
    p5m: 0,
    checkPressure: 0,
    adjustPressure: 0,
    reseal: 0,
    assembly: 0,
    disassembly: 0,
    mounting: 0,
    dismounting: 0,
    pmCheck: 0,
    cleanUp: 0,
    maintenanceRim: 0,
    retorque: 0,
  }

  for (let day = 1; day <= 31; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    if (day > daysInMonth) {
      matrix.push({
        day,
        dateStr,
        p5m: 0,
        checkPressure: 0,
        adjustPressure: 0,
        reseal: 0,
        assembly: 0,
        disassembly: 0,
        mounting: 0,
        dismounting: 0,
        pmCheck: 0,
        cleanUp: 0,
        maintenanceRim: 0,
        retorque: 0,
        durasiKerjaHours: 0,
        ewhHoursPerPerson: 0,
        ewhRatioPercent: 0,
        workerCount: 0,
      })
      continue
    }

    // Filter Session Items untuk hari ini menggunakan parseDateYMD
    const daySessionItems = monthSessionItems.filter((it) => {
      const p = parseDateYMD(it.workDate)
      return p ? p.day === day : false
    })

    // Filter Direct Activities untuk hari ini menggunakan parseDateYMD
    const dayDirectActs = monthDirectActs.filter((act) => {
      const p = parseDateYMD(act.startTime || act.submissionTime)
      return p ? p.day === day : false
    })

    const dayCounts: Record<EwhActivityKey, number> = {
      p5m: 0,
      checkPressure: 0,
      adjustPressure: 0,
      reseal: 0,
      assembly: 0,
      disassembly: 0,
      mounting: 0,
      dismounting: 0,
      pmCheck: 0,
      cleanUp: 0,
      maintenanceRim: 0,
      retorque: 0,
    }

    let calculatedMinutes = 0
    const dayWorkers = new Set<number>()

    // Kehadiran dari Attendance Override
    monthAttOverrides
      .filter((att) => att.day === day)
      .forEach((att) => {
        const isPresent = Boolean(
          att.clockIn ||
          att.clockOut ||
          ['h', 'ds', 'ns', 'hadir', 'present'].includes((att.status || '').toLowerCase())
        )
        if (isPresent) dayWorkers.add(att.employeeId)
      })

    // Kehadiran dari Biometric Records
    monthAttRecords
      .filter((att) => {
        const p = parseDateYMD(att.eventTime)
        return p ? p.day === day : false
      })
      .forEach((att) => {
        dayWorkers.add(att.employeeId)
      })

    // Hitung dari Session Items
    daySessionItems.forEach((it) => {
      const cat = categorizeSessionActivity(it.label)
      dayCounts[cat] = (dayCounts[cat] || 0) + 1

      let itemDuration = 60
      if (it.startedAt && it.endedAt) {
        const diff = (new Date(it.endedAt).getTime() - new Date(it.startedAt).getTime()) / 60000
        if (diff > 0 && diff <= 720) itemDuration = diff
      } else if (it.actualPoints && it.actualPoints > 0) {
        itemDuration = it.actualPoints * 12
      }
      calculatedMinutes += itemDuration
    })

    const daySessions = monthSessions.filter((s) => {
      const p = parseDateYMD(s.workDate)
      return p ? p.day === day : false
    })
    daySessions.forEach((s) => {
      if (targetEmployeeIdSet.has(s.employeeId)) {
        dayWorkers.add(s.employeeId)
      }
      const tmSet = sessionTeamMemberMap.get(s.id)
      if (tmSet) {
        tmSet.forEach((tmId) => {
          if (targetEmployeeIdSet.has(tmId)) {
            dayWorkers.add(tmId)
          }
        })
      }
      const hasItems = daySessionItems.some((it) => it.sessionId === s.id)
      if (!hasItems) {
        let sessDuration = 60
        if (s.startedAt && s.submittedAt) {
          const diff = (new Date(s.submittedAt).getTime() - new Date(s.startedAt).getTime()) / 60000
          if (diff > 0 && diff <= 720) sessDuration = diff
        }
        calculatedMinutes += sessDuration
      }
    })

    // Hitung dari Direct Activities
    dayDirectActs.forEach((act) => {
      dayWorkers.add(act.employeeId)
      const label = act.customActivityName || act.title || ''
      const cat = categorizeSessionActivity(label)
      dayCounts[cat] = (dayCounts[cat] || 0) + 1

      let actDuration = 60
      if (act.startTime && act.endTime) {
        const diff = (new Date(act.endTime).getTime() - new Date(act.startTime).getTime()) / 60000
        if (diff > 0 && diff <= 720) actDuration = diff
      }
      calculatedMinutes += actDuration
    })

    // Akumulasi sum
    ;(Object.keys(dayCounts) as EwhActivityKey[]).forEach((k) => {
      sumCounts[k] += dayCounts[k]
    })

    const durasiKerjaHours = Math.round((calculatedMinutes / 60) * 100) / 100

    if (durasiKerjaHours > 0) {
      activeWorkDaysCount++
      totalDurasiHoursSum += durasiKerjaHours
    }

    const ewhRatio = powerman > 0 ? (durasiKerjaHours / (shiftHours * powerman)) * 100 : 0
    const ewhHoursPerPerson = powerman > 0 ? Math.round((durasiKerjaHours / shiftHours / powerman) * 100) / 100 : 0

    matrix.push({
      day,
      dateStr,
      ...dayCounts,
      durasiKerjaHours,
      ewhHoursPerPerson,
      ewhRatioPercent: Math.round(ewhRatio * 100) / 100,
      workerCount: dayWorkers.size || (durasiKerjaHours > 0 ? 1 : 0),
    })
  }

  // 5. Hitung Weekly Breakdown (Minggu 1 s/d Minggu 5)
  const weeklyBreakdown: EwhWeeklyBreakdownItem[] = []
  const weekRanges = [
    { weekNumber: 1, label: 'Minggu 1', startDay: 1, endDay: Math.min(7, daysInMonth) },
    { weekNumber: 2, label: 'Minggu 2', startDay: 8, endDay: Math.min(14, daysInMonth) },
    { weekNumber: 3, label: 'Minggu 3', startDay: 15, endDay: Math.min(21, daysInMonth) },
    { weekNumber: 4, label: 'Minggu 4', startDay: 22, endDay: Math.min(28, daysInMonth) },
  ]
  if (daysInMonth > 28) {
    weekRanges.push({ weekNumber: 5, label: 'Minggu 5', startDay: 29, endDay: daysInMonth })
  }

  weekRanges.forEach((wr) => {
    const weekDays = matrix.filter((r) => r.day >= wr.startDay && r.day <= wr.endDay)
    const weekCounts: Record<EwhActivityKey, number> = {
      p5m: 0,
      checkPressure: 0,
      adjustPressure: 0,
      reseal: 0,
      assembly: 0,
      disassembly: 0,
      mounting: 0,
      dismounting: 0,
      pmCheck: 0,
      cleanUp: 0,
      maintenanceRim: 0,
      retorque: 0,
    }
    let weekHours = 0
    let weekWorkers = 0

    weekDays.forEach((d) => {
      ;(Object.keys(weekCounts) as EwhActivityKey[]).forEach((k) => {
        weekCounts[k] += d[k]
      })
      weekHours += d.durasiKerjaHours
      if (d.workerCount > weekWorkers) weekWorkers = d.workerCount
    })

    const weekWorkDays = wr.endDay - wr.startDay + 1
    const weekRatio = powerman > 0 ? (weekHours / (shiftHours * powerman * weekWorkDays)) * 100 : 0
    const weekEwhPerPerson = powerman > 0 ? Math.round((weekHours / (shiftHours * powerman)) * 10) / 10 : 0

    weeklyBreakdown.push({
      weekNumber: wr.weekNumber,
      label: wr.label,
      rangeStr: `Tgl ${wr.startDay} - ${wr.endDay}`,
      startDay: wr.startDay,
      endDay: wr.endDay,
      ...weekCounts,
      totalHours: Math.round(weekHours * 100) / 100,
      ewhHoursPerPerson: weekEwhPerPerson,
      ewhRatioPercent: Math.round(weekRatio * 100) / 100,
      workerCount: weekWorkers || (weekHours > 0 ? 1 : 0),
    })
  })

  // 6. Hitung Month to Date (MTD)
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month
  const mtdCutoffDay = isCurrentMonth ? Math.min(now.getDate(), daysInMonth) : daysInMonth
  const mtdDays = matrix.filter((r) => r.day >= 1 && r.day <= mtdCutoffDay)

  const mtdCounts: Record<EwhActivityKey, number> = {
    p5m: 0,
    checkPressure: 0,
    adjustPressure: 0,
    reseal: 0,
    assembly: 0,
    disassembly: 0,
    mounting: 0,
    dismounting: 0,
    pmCheck: 0,
    cleanUp: 0,
    maintenanceRim: 0,
    retorque: 0,
  }
  let mtdHours = 0
  let mtdActiveDays = 0

  mtdDays.forEach((d) => {
    ;(Object.keys(mtdCounts) as EwhActivityKey[]).forEach((k) => {
      mtdCounts[k] += d[k]
    })
    mtdHours += d.durasiKerjaHours
    if (d.durasiKerjaHours > 0) mtdActiveDays++
  })

  const mtdEwhAverage = powerman > 0 ? Math.round((mtdHours / shiftHours / powerman) * 10) / 10 : 0
  const mtdEfficiency = powerman > 0 && mtdCutoffDay > 0
    ? Math.round((mtdHours / (shiftHours * powerman * mtdCutoffDay)) * 10000) / 100
    : 0

  const mtdSummary: EwhMtdSummary = {
    cutoffDay: mtdCutoffDay,
    cutoffDateStr: `${mtdCutoffDay} ${MONTH_NAMES[month - 1]} ${year}`,
    totalHours: Math.round(mtdHours * 100) / 100,
    mtdEwhAverage,
    mtdEfficiencyPercent: mtdEfficiency,
    activeDaysCount: mtdActiveDays,
    workerCount: powerman,
    activities: mtdCounts,
  }

  // 7. Hitung Year to Date (YTD) (Bulan 1 s/d 12)
  const ytdMonths: EwhYtdMonthItem[] = []
  let ytdTotalHours = 0
  let ytdActiveMonths = 0

  for (let m = 1; m <= 12; m++) {
    const isPastOrCurrent = year < now.getFullYear() || (year === now.getFullYear() && m <= now.getMonth() + 1)
    const mPeriod = `${year}-${String(m).padStart(2, '0')}`
    const mDaysCount = new Date(year, m, 0).getDate()

    // Filter sessions & activities for month m
    const mSessions = yearSessions.filter((s) => {
      const p = parseDateYMD(s.workDate)
      return p ? p.month === m && p.year === year : false
    })
    const mItems = yearSessionItems.filter((it) => {
      const p = parseDateYMD(it.workDate)
      return p ? p.month === m && p.year === year : false
    })
    const mDirect = yearDirectActs.filter((act) => {
      const p = parseDateYMD(act.startTime || act.submissionTime)
      return p ? p.month === m && p.year === year : false
    })

    const mWorkers = new Set<number>()
    mSessions.forEach((s) => mWorkers.add(s.employeeId))
    mDirect.forEach((a) => mWorkers.add(a.employeeId))

    let mMinutes = 0
    const mActCount = mItems.length + mDirect.length

    mItems.forEach((it) => {
      let dur = 60
      if (it.startedAt && it.endedAt) {
        const diff = (new Date(it.endedAt).getTime() - new Date(it.startedAt).getTime()) / 60000
        if (diff > 0 && diff <= 720) dur = diff
      } else if (it.actualPoints && it.actualPoints > 0) {
        dur = it.actualPoints * 12
      }
      mMinutes += dur
    })

    mDirect.forEach((act) => {
      let dur = 60
      if (act.startTime && act.endTime) {
        const diff = (new Date(act.endTime).getTime() - new Date(act.startTime).getTime()) / 60000
        if (diff > 0 && diff <= 720) dur = diff
      }
      mMinutes += dur
    })

    mSessions.forEach((s) => {
      const hasItems = mItems.some((it) => it.sessionId === s.id)
      if (!hasItems) {
        let dur = 60
        if (s.startedAt && s.submittedAt) {
          const diff = (new Date(s.submittedAt).getTime() - new Date(s.startedAt).getTime()) / 60000
          if (diff > 0 && diff <= 720) dur = diff
        }
        mMinutes += dur
      }
    })

    const mHours = Math.round((mMinutes / 60) * 100) / 100
    const mPowerman = powerman
    const mEwh = mPowerman > 0 ? Math.round((mHours / shiftHours / mPowerman) * 10) / 10 : 0
    const mEff = mPowerman > 0 ? Math.round((mHours / (shiftHours * mPowerman * mDaysCount)) * 10000) / 100 : 0

    if (mHours > 0) {
      ytdActiveMonths++
      ytdTotalHours += mHours
    }

    ytdMonths.push({
      monthIndex: m,
      period: mPeriod,
      monthName: MONTH_NAMES[m - 1],
      shortMonth: MONTH_SHORTS[m - 1],
      totalHours: mHours,
      powerman: mPowerman,
      ewhAverage: mEwh,
      efficiencyPercent: mEff,
      totalActivities: mActCount,
      isCurrentOrPast: isPastOrCurrent,
    })
  }

  const ytdAverageEwh = ytdActiveMonths > 0
    ? Math.round((ytdTotalHours / shiftHours / powerman / ytdActiveMonths) * 10) / 10
    : (powerman > 0 ? Math.round((ytdTotalHours / shiftHours / powerman) * 10) / 10 : 0)

  const ytdAverageEfficiency = ytdActiveMonths > 0
    ? Math.round((ytdMonths.filter((m) => m.totalHours > 0).reduce((sum, m) => sum + m.efficiencyPercent, 0) / ytdActiveMonths) * 100) / 100
    : 0

  const ytdSummary: EwhYtdSummary = {
    year,
    months: ytdMonths,
    ytdTotalHours: Math.round(ytdTotalHours * 100) / 100,
    ytdAverageEwh,
    ytdAverageEfficiency,
    activeMonthsCount: ytdActiveMonths,
  }

  // 8. FORMULA EKSPLISIT USER: =SUM(O6:O36) / 22 / Powerman
  const monthlyEwhAverage = powerman > 0
    ? Math.round((totalDurasiHoursSum / shiftHours / powerman) * 10) / 10
    : 0

  const monthlyEfficiencyPercent = powerman > 0 && activeWorkDaysCount > 0
    ? Math.round((totalDurasiHoursSum / (shiftHours * powerman * activeWorkDaysCount)) * 10000) / 100
    : 0

  // Chart Data format for "UTILITIES & EWH [SITE_NAME]"
  const chartData = [
    { name: 'P5M/Safety Talk', shortName: 'P5M/Safety Talk', value: sumCounts.p5m },
    { name: 'Check Pressure/Day', shortName: 'Check Pressure/Day', value: sumCounts.checkPressure },
    { name: 'Adjust Pressure/Tire', shortName: 'Adjust Pressure/Tire', value: sumCounts.adjustPressure },
    { name: 'Reseal/Tire', shortName: 'Reseal/Tire', value: sumCounts.reseal },
    { name: 'Assembly/Tire', shortName: 'Assembly/Tire', value: sumCounts.assembly },
    { name: 'Disassembly/Tire', shortName: 'Disassembly/Tire', value: sumCounts.disassembly },
    { name: 'Mounting/Tire', shortName: 'Mounting/Tire', value: sumCounts.mounting },
    { name: 'Dismounting/Tire', shortName: 'Dismounting/Tire', value: sumCounts.dismounting },
    { name: 'PM Check/Unit', shortName: 'PM Check/Unit', value: sumCounts.pmCheck },
    { name: 'Clean Up/Day', shortName: 'Clean Up/Day', value: sumCounts.cleanUp },
    { name: 'Maintenance Rim', shortName: 'Maintenance Rim', value: sumCounts.maintenanceRim },
    { name: 'Retorque/Tire', shortName: 'Retorque/Tire', value: sumCounts.retorque },
    { name: 'Durasi Kerja/Hours', shortName: 'Durasi Kerja/Hours', value: monthlyEwhAverage, color: '#10b981' },
  ]

  return {
    success: true,
    siteId: activeSiteId,
    siteName: siteRecord.name || `Site #${activeSiteId}`,
    departmentId: parsedDeptId,
    departmentName,
    period,
    powerman,
    defaultPowerman,
    shiftHours,
    matrix,
    weeklyBreakdown,
    mtdSummary,
    ytdSummary,
    sumRow: {
      ...sumCounts,
      totalDurasiKerjaHours: Math.round(totalDurasiHoursSum * 100) / 100,
      monthlyEwhAverage,
      monthlyEfficiencyPercent,
    },
    chartData,
    allSites,
    allDepartments,
  }
}


