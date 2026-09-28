'use server'

import { db } from '@/db'
import { ewhDailySnapshots, ewhShiftConfig, unitUtilityDaily, unitMaster, ewhTeams, ewhTeamMembers } from '@/db/schema/ewh'
import {
  activities,
  dailyActivitySessions,
  dailyActivitySessionItems,
  employees,
  sites,
} from '@/db/schema/hero'
import { timesheetAttendanceRealOverrides } from '@/db/schema/timesheet'
import { overtimeCommandLetters, overtimeCommandLetterParticipants } from '@/db/schema/hero'
import { and, eq, gte, lte, sql, inArray, isNull, or, ilike } from 'drizzle-orm'
import { calculateEwhDay, EWH_ACTIVITY_COLUMNS, type EwhActivityKey } from '@/lib/ewh/calculate-ewh'
import { calculateUnitUtility, type SessionItemEntry } from '@/lib/ewh/calculate-unit-utility'
import { getCurrentEmployee } from '@/lib/get-current-employee'
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
 * - Attendance real override save
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
    clockIn: attendance?.clockIn || null,
    clockOut: attendance?.clockOut || null,
    breakMinutes,
  })

  // 4. Hitung activity session counts
  const sessions = await db
    .select({ id: dailyActivitySessions.id })
    .from(dailyActivitySessions)
    .where(
      and(
        eq(dailyActivitySessions.employeeId, employeeId),
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
 * Ambil summary EWH semua karyawan untuk satu site satu period.
 */
export async function getEwhSummaryAction(siteId: number, period: string) {
  const rows = await db
    .select({
      employeeId: ewhDailySnapshots.employeeId,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      section: employees.section,
      department: employees.department,
      shiftCode: ewhDailySnapshots.shiftCode,
      clockIn: ewhDailySnapshots.clockIn,
      clockOut: ewhDailySnapshots.clockOut,
      availabilityMinutes: ewhDailySnapshots.availabilityMinutes,
      clockDurationMinutes: ewhDailySnapshots.clockDurationMinutes,
      breakMinutes: ewhDailySnapshots.breakMinutes,
      effectiveMinutes: ewhDailySnapshots.effectiveMinutes,
      idleMinutes: ewhDailySnapshots.idleMinutes,
      ewhPercent: ewhDailySnapshots.ewhPercent,
      activitySessionCount: ewhDailySnapshots.activitySessionCount,
      checkedItemCount: ewhDailySnapshots.checkedItemCount,
      totalItemCount: ewhDailySnapshots.totalItemCount,
      overtimeMinutes: ewhDailySnapshots.overtimeMinutes,
      workDate: ewhDailySnapshots.workDate,
      period: ewhDailySnapshots.period,
    })
    .from(ewhDailySnapshots)
    .innerJoin(employees, eq(ewhDailySnapshots.employeeId, employees.id))
    .where(
      and(
        eq(ewhDailySnapshots.siteId, siteId),
        eq(ewhDailySnapshots.period, period),
        or(
          ilike(employees.department, '%service%'),
          ilike(employees.section, '%service%')
        )
      )
    )
    .orderBy(ewhDailySnapshots.workDate, employees.name)

  return {
    success: true as const,
    rows: rows.map((r) => ({
      ...r,
      ewhPercent: parseFloat(r.ewhPercent),
      ewhPercentStr: r.ewhPercent,
    })),
  }
}

/**
 * Ambil detail EWH per karyawan per period.
 */
export async function getEwhDetailAction(employeeId: number, period: string) {
  const rows = await db
    .select()
    .from(ewhDailySnapshots)
    .where(
      and(
        eq(ewhDailySnapshots.employeeId, employeeId),
        eq(ewhDailySnapshots.period, period)
      )
    )
    .orderBy(ewhDailySnapshots.workDate)

  return {
    success: true as const,
    rows: rows.map((r) => ({
      ...r,
      ewhPercent: parseFloat(r.ewhPercent),
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

export async function getEwhTeamsAction(siteId: number) {
  const teams = await db
    .select()
    .from(ewhTeams)
    .where(eq(ewhTeams.siteId, siteId))
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

export async function getEwhEmployeesAction(siteId: number) {
  const list = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      jobTitle: employees.jobTitle,
      department: employees.department,
      section: employees.section,
    })
    .from(employees)
    .where(
      and(
        eq(employees.siteId, siteId),
        eq(employees.employmentStatus, 'active'),
        or(
          ilike(employees.department, '%service%'),
          ilike(employees.section, '%service%')
        )
      )
    )
    .orderBy(employees.name)
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
  siteId: number
  siteName: string
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
}

function categorizeSessionActivity(label: string): EwhActivityKey | null {
  const l = (label || '').toLowerCase().trim()
  if (l.includes('p5m') || l.includes('safety talk') || l.includes('briefing') || l.includes('toolbox') || l.includes('meeting')) return 'p5m'
  if (l.includes('check pressure') || l.includes('pemeriksaan tekanan') || l.includes('cek tekanan') || l.includes('pressure check')) return 'checkPressure'
  if (l.includes('adjust pressure') || l.includes('tambah angin') || l.includes('penyesuaian tekanan') || l.includes('pump') || l.includes('isi angin')) return 'adjustPressure'
  if (l.includes('reseal') || l.includes('re-seal') || l.includes('seal') || l.includes('o-ring')) return 'reseal'
  if (l.includes('disassembly') || l.includes('bongkar ban') || l.includes('dismantle') || l.includes('lepas velg')) return 'disassembly'
  if (l.includes('assembly') || l.includes('rakit ban') || l.includes('perakitan') || l.includes('pasang velg')) return 'assembly'
  if (l.includes('dismounting') || l.includes('lepas ban') || l.includes('copot ban') || l.includes('remove tire') || l.includes('bongkar roda')) return 'dismounting'
  if (l.includes('mounting') || l.includes('pasang ban') || l.includes('install tire') || l.includes('pasang roda')) return 'mounting'
  if (l.includes('pm check') || l.includes('preventive maintenance') || l.includes('daily check') || l.includes('inspeksi') || l.includes('inspection')) return 'pmCheck'
  if (l.includes('clean up') || l.includes('housekeeping') || l.includes('pembersihan') || l.includes('5r') || l.includes('kebersihan')) return 'cleanUp'
  if (l.includes('maintenance rim') || l.includes('velg') || l.includes('rim') || l.includes('cat rim') || l.includes('gerinda')) return 'maintenanceRim'
  if (l.includes('retorque') || l.includes('re-torque') || l.includes('torsi') || l.includes('torque')) return 'retorque'
  return null
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
  siteIdParam?: number | null,
  periodParam?: string | null,
  overridePowerman?: number
): Promise<EwhSiteMonthlyMatrixResult> {
  const allSites = await db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(eq(sites.isActive, true))
    .orderBy(sites.name)

  const activeSiteId = siteIdParam || allSites[0]?.id || 1
  const siteRecord = allSites.find((s) => s.id === activeSiteId) || allSites[0] || { id: activeSiteId, name: `Site #${activeSiteId}` }

  const now = new Date()
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const period = periodParam || defaultPeriod
  const [yearStr, monthStr] = period.split('-')
  const year = parseInt(yearStr, 10) || now.getFullYear()
  const month = parseInt(monthStr, 10) || now.getMonth() + 1

  // Hitung jumlah hari dalam bulan tsb (28-31)
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)

  const yearStart = new Date(year, 0, 1, 0, 0, 0, 0)
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)

  // 1. Query Data Karyawan Departemen Service (Single Source of Truth)
  const serviceEmployees = await db
    .select({
      id: employees.id,
      siteId: employees.siteId,
      department: employees.department,
      section: employees.section,
    })
    .from(employees)
    .where(
      and(
        eq(employees.isActive, true),
        eq(employees.employmentStatus, 'active'),
        or(
          ilike(employees.department, '%service%'),
          ilike(employees.section, '%service%')
        )
      )
    )

  const serviceEmployeeIdSet = new Set(serviceEmployees.map((e) => e.id))
  const siteServiceEmployees = serviceEmployees.filter((e) => e.siteId === activeSiteId)

  // 2. Query Year Sessions & Direct Activities for YTD & Current Month (Khusus Departemen Service)
  const [allYearSessions, allYearDirectActs] = await Promise.all([
    db
      .select({
        id: dailyActivitySessions.id,
        workDate: dailyActivitySessions.workDate,
        employeeId: dailyActivitySessions.employeeId,
        startedAt: dailyActivitySessions.startedAt,
        submittedAt: dailyActivitySessions.submittedAt,
      })
      .from(dailyActivitySessions)
      .where(
        and(
          eq(dailyActivitySessions.siteId, activeSiteId),
          gte(dailyActivitySessions.workDate, yearStart),
          lte(dailyActivitySessions.workDate, yearEnd)
        )
      ),
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
      })
      .from(activities)
      .where(
        and(
          eq(activities.siteId, activeSiteId),
          isNull(activities.deletedAt),
          or(
            and(gte(activities.startTime, yearStart), lte(activities.startTime, yearEnd)),
            and(gte(activities.submissionTime, yearStart), lte(activities.submissionTime, yearEnd))
          )
        )
      ),
  ])

  // Filter aktivitas khusus karyawan Departemen Service
  const yearSessions = allYearSessions.filter((s) => serviceEmployeeIdSet.has(s.employeeId))
  const yearDirectActs = allYearDirectActs.filter((a) => serviceEmployeeIdSet.has(a.employeeId))

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

  // Filter for the selected month
  const monthSessions = yearSessions.filter((s) => {
    const d = new Date(s.workDate)
    return d.getMonth() === month - 1 && d.getFullYear() === year
  })
  const monthSessionItems = yearSessionItems.filter((it) => {
    const d = new Date(it.workDate)
    return d.getMonth() === month - 1 && d.getFullYear() === year
  })
  const monthDirectActs = yearDirectActs.filter((act) => {
    const d = new Date(act.startTime || act.submissionTime || new Date())
    return d.getMonth() === month - 1 && d.getFullYear() === year
  })

  // 3. Hitung Dinamis Powerman Site (Khusus Teknisi / Karyawan Departemen Service di Site ini)
  const activeWorkerIds = new Set<number>()
  monthSessions.forEach((s) => activeWorkerIds.add(s.employeeId))
  monthDirectActs.forEach((a) => activeWorkerIds.add(a.employeeId))

  let defaultPowerman = activeWorkerIds.size

  if (defaultPowerman === 0) {
    // Cek jumlah karyawan aktif Departemen Service di site ini
    if (siteServiceEmployees.length > 0) {
      defaultPowerman = siteServiceEmployees.length
    } else {
      // Cek tim EWH yang terdaftar untuk site ini
      const teamMembers = await db
        .select({ id: ewhTeamMembers.id, employeeId: ewhTeamMembers.employeeId })
        .from(ewhTeamMembers)
        .innerJoin(ewhTeams, eq(ewhTeamMembers.teamId, ewhTeams.id))
        .where(eq(ewhTeams.siteId, activeSiteId))

      const serviceTeamMembers = teamMembers.filter((tm) => serviceEmployeeIdSet.has(tm.employeeId))
      defaultPowerman = serviceTeamMembers.length > 0 ? serviceTeamMembers.length : (siteServiceEmployees.length || 1)
    }
  }

  const powerman = overridePowerman && overridePowerman > 0 ? overridePowerman : defaultPowerman
  const shiftHours = 22 // 2 Shift operasional sehari (22 Jam/Hari)

  // 3. Build Matriks Harian (1..31) dari Data Riil Daily Activity
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

    // Filter Session Items untuk hari ini
    const daySessionItems = monthSessionItems.filter((it) => {
      const d = new Date(it.workDate)
      return d.getDate() === day
    })

    // Filter Direct Activities untuk hari ini
    const dayDirectActs = monthDirectActs.filter((act) => {
      const d = new Date(act.startTime || act.submissionTime || new Date())
      return d.getDate() === day
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

    // Hitung dari Session Items
    daySessionItems.forEach((it) => {
      const cat = categorizeSessionActivity(it.label)
      if (cat) dayCounts[cat] = (dayCounts[cat] || 0) + 1

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
      const d = new Date(s.workDate)
      return d.getDate() === day
    })
    daySessions.forEach((s) => dayWorkers.add(s.employeeId))

    // Hitung dari Direct Activities
    dayDirectActs.forEach((act) => {
      dayWorkers.add(act.employeeId)
      const label = act.customActivityName || act.title || ''
      const cat = categorizeSessionActivity(label)
      if (cat) dayCounts[cat] = (dayCounts[cat] || 0) + 1

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
    const ewhHoursPerPerson = powerman > 0 ? Math.round((durasiKerjaHours / powerman) * 100) / 100 : 0

    matrix.push({
      day,
      dateStr,
      ...dayCounts,
      durasiKerjaHours,
      ewhHoursPerPerson,
      ewhRatioPercent: Math.round(ewhRatio * 100) / 100,
      workerCount: dayWorkers.size || (durasiKerjaHours > 0 ? powerman : 0),
    })
  }

  // 4. Hitung Weekly Breakdown (Minggu 1 s/d Minggu 5)
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
      workerCount: weekWorkers || powerman,
    })
  })

  // 5. Hitung Month to Date (MTD)
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

  // 6. Hitung Year to Date (YTD) (Bulan 1 s/d 12)
  const ytdMonths: EwhYtdMonthItem[] = []
  let ytdTotalHours = 0
  let ytdActiveMonths = 0

  for (let m = 1; m <= 12; m++) {
    const isPastOrCurrent = year < now.getFullYear() || (year === now.getFullYear() && m <= now.getMonth() + 1)
    const mPeriod = `${year}-${String(m).padStart(2, '0')}`
    const mDaysCount = new Date(year, m, 0).getDate()

    // Filter sessions & activities for month m
    const mSessions = yearSessions.filter((s) => {
      const d = new Date(s.workDate)
      return d.getMonth() === m - 1
    })
    const mItems = yearSessionItems.filter((it) => {
      const d = new Date(it.workDate)
      return d.getMonth() === m - 1
    })
    const mDirect = yearDirectActs.filter((act) => {
      const d = new Date(act.startTime || act.submissionTime || new Date())
      return d.getMonth() === m - 1
    })

    const mWorkers = new Set<number>()
    mSessions.forEach((s) => mWorkers.add(s.employeeId))
    mDirect.forEach((a) => mWorkers.add(a.employeeId))

    let mMinutes = 0
    let mActCount = mItems.length + mDirect.length

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

    const mHours = Math.round((mMinutes / 60) * 100) / 100
    const mPowerman = m === month ? powerman : (mWorkers.size || siteServiceEmployees.length || defaultPowerman || 1)
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

  // 7. FORMULA EKSPLISIT USER: =SUM(O6:O36) / 22 / Powerman
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
  }
}


