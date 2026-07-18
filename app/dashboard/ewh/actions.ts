'use server'

import { db } from '@/db'
import { ewhDailySnapshots, ewhShiftConfig, unitUtilityDaily, unitMaster, ewhTeams, ewhTeamMembers } from '@/db/schema/ewh'
import {
  dailyActivitySessions,
  dailyActivitySessionItems,
  employees,
  sites,
} from '@/db/schema/hero'
import { timesheetAttendanceRealOverrides } from '@/db/schema/timesheet'
import { overtimeCommandLetters, overtimeCommandLetterParticipants } from '@/db/schema/hero'
import { and, eq, gte, lte, sql, inArray } from 'drizzle-orm'
import { calculateEwhDay } from '@/lib/ewh/calculate-ewh'
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
        eq(ewhDailySnapshots.period, period)
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
    .where(and(eq(employees.siteId, siteId), eq(employees.employmentStatus, 'active')))
    .orderBy(employees.name)
  return { success: true as const, employees: list }
}

