import { and, eq, inArray } from 'drizzle-orm'

import { db } from '@/db'
import { overtimeCommandLetterItems, overtimeCommandLetters } from '@/db/schema/hero'
import {
  timesheetAttendanceRealOverrides,
  timesheetSchedulingConfigs,
  timesheetSchedulingPlans,
  timesheetSchedulingPlansV2,
  timesheetSchedulingStatuses,
} from '@/db/schema/timesheet'
import { normalizeSplPolicy, classifySplCategory, sixOneOffCreditMinutes, splCategoryAllowed } from '@/lib/spl-policy'
import { normalizeSiteOvertimeConfig } from '@/lib/timesheet/overtime-policy'

type ScheduleRow = { employeeId: number; schedule: string[] }

const makassarDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Makassar',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function splDateKey(value: Date) {
  return makassarDate.format(value)
}

function addDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

function nextPeriod(period: string) {
  const [year, month] = period.split('-').map(Number)
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`
}

export async function getSiteSplPolicy(siteId: number) {
  const [config] = await db
    .select({ overtimeConfig: timesheetSchedulingConfigs.overtimeConfig })
    .from(timesheetSchedulingConfigs)
    .where(eq(timesheetSchedulingConfigs.siteId, siteId))
    .limit(1)
  return normalizeSiteOvertimeConfig(config?.overtimeConfig).splPolicy
}

async function getScheduleRows(siteId: number, periods: string[]) {
  const [v2, v1] = await Promise.all([
    db
      .select({ period: timesheetSchedulingPlansV2.period, status: timesheetSchedulingPlansV2.status, draft: timesheetSchedulingPlansV2.draftSchedule, active: timesheetSchedulingPlansV2.activeSchedule })
      .from(timesheetSchedulingPlansV2)
      .where(and(eq(timesheetSchedulingPlansV2.siteId, siteId), inArray(timesheetSchedulingPlansV2.period, periods))),
    db
      .select({ period: timesheetSchedulingPlans.period, draft: timesheetSchedulingPlans.draftSchedule, fixed: timesheetSchedulingPlans.fixedSchedule })
      .from(timesheetSchedulingPlans)
      .where(and(eq(timesheetSchedulingPlans.siteId, siteId), inArray(timesheetSchedulingPlans.period, periods))),
  ])
  const byPeriod = new Map<string, ScheduleRow[]>()
  for (const plan of v1) byPeriod.set(plan.period, (plan.fixed as ScheduleRow[]).length ? (plan.fixed as ScheduleRow[]) : (plan.draft as ScheduleRow[]))
  for (const plan of v2) {
    const rows = plan.status === 'active' && (plan.active as ScheduleRow[]).length ? plan.active : plan.draft
    byPeriod.set(plan.period, rows as ScheduleRow[])
  }
  return byPeriod
}

function scheduleCode(rows: Map<string, ScheduleRow[]>, employeeId: number, date: Date) {
  const key = splDateKey(date)
  const [period, day] = [key.slice(0, 7), Number(key.slice(8, 10))]
  return rows.get(period)?.find((row) => row.employeeId === employeeId)?.schedule[day - 1] ?? ''
}

export async function buildSplParticipantSnapshots(input: {
  siteId: number
  employeeIds: number[]
  workDate: Date
  plannedStartAt: Date
  plannedEndAt: Date
  replacementOffDate?: Date | null
}) {
  const workPeriod = splDateKey(input.workDate).slice(0, 7)
  const previousPeriod = splDateKey(addDays(input.workDate, -30)).slice(0, 7)
  const replacementPeriod = input.replacementOffDate
    ? splDateKey(input.replacementOffDate).slice(0, 7)
    : null
  const periods = [...new Set([previousPeriod, workPeriod, replacementPeriod].filter(Boolean) as string[])]
  const [configRow, schedules, attendance, statusRows] = await Promise.all([
    db
      .select({ rosterType: timesheetSchedulingConfigs.rosterType, overtimeConfig: timesheetSchedulingConfigs.overtimeConfig })
      .from(timesheetSchedulingConfigs)
      .where(eq(timesheetSchedulingConfigs.siteId, input.siteId))
      .limit(1)
      .then((rows) => rows[0]),
    getScheduleRows(input.siteId, periods),
    db
      .select({ period: timesheetAttendanceRealOverrides.period, day: timesheetAttendanceRealOverrides.day, employeeId: timesheetAttendanceRealOverrides.employeeId, status: timesheetAttendanceRealOverrides.status, clockIn: timesheetAttendanceRealOverrides.clockIn, clockOut: timesheetAttendanceRealOverrides.clockOut })
      .from(timesheetAttendanceRealOverrides)
      .where(and(eq(timesheetAttendanceRealOverrides.siteId, input.siteId), inArray(timesheetAttendanceRealOverrides.period, periods), inArray(timesheetAttendanceRealOverrides.employeeId, input.employeeIds))),
    db
      .select({ period: timesheetSchedulingStatuses.period, finalizedAt: timesheetSchedulingStatuses.finalizedAt })
      .from(timesheetSchedulingStatuses)
      .where(and(eq(timesheetSchedulingStatuses.siteId, input.siteId), inArray(timesheetSchedulingStatuses.period, periods))),
  ])
  const overtimeConfig = normalizeSiteOvertimeConfig(configRow?.overtimeConfig)
  const policy = normalizeSplPolicy(overtimeConfig.splPolicy)
  const rosterType = configRow?.rosterType ?? '5:2'
  const attendanceKeys = new Set(
    attendance
      .filter((row) => Boolean(row.clockIn && row.clockOut) || row.status === 'present')
      .map((row) => `${row.employeeId}:${row.period}-${String(row.day).padStart(2, '0')}`)
  )
  const payrollPeriod = statusRows.find((row) => row.period === workPeriod)?.finalizedAt
    ? nextPeriod(workPeriod)
    : workPeriod
  if (
    replacementPeriod &&
    statusRows.find((row) => row.period === replacementPeriod)?.finalizedAt
  ) {
    throw new Error('Periode OFF pengganti sudah finalized. Pilih tanggal pada periode yang masih terbuka.')
  }

  return input.employeeIds.map((employeeId) => {
    const code = scheduleCode(schedules, employeeId, input.workDate)
    const shiftCode = code === 'NS' ? 'NS' : 'DS'
    let workStreakDays = 0
    for (let offset = 1; offset <= 30; offset += 1) {
      const date = addDays(input.workDate, -offset)
      const previousCode = scheduleCode(schedules, employeeId, date)
      if (!previousCode || ['OFF', 'Libur', 'FB'].includes(previousCode) || !attendanceKeys.has(`${employeeId}:${splDateKey(date)}`)) break
      workStreakDays += 1
    }
    const category = classifySplCategory({
      scheduleCode: code,
      shiftCode,
      plannedStartAt: input.plannedStartAt,
      plannedEndAt: input.plannedEndAt,
      policy,
    })
    if (!splCategoryAllowed(category, policy)) throw new Error(`Kategori SPL ${category} belum diaktifkan untuk site ini.`)
    const fixedCredit = category === 'off_day' && rosterType === '6:1' ? sixOneOffCreditMinutes(workStreakDays) : null
    if (fixedCredit === 360 && !input.replacementOffDate) throw new Error('Tanggal OFF pengganti wajib dipilih untuk tukar libur roster 6:1.')
    if (input.replacementOffDate) {
      const days = Math.ceil((input.replacementOffDate.getTime() - input.workDate.getTime()) / 86_400_000)
      if (days < 1 || days > policy.replacementOffMaxDays) throw new Error(`OFF pengganti wajib 1-${policy.replacementOffMaxDays} hari setelah pekerjaan.`)
      if (['OFF', 'Libur', 'FB'].includes(scheduleCode(schedules, employeeId, input.replacementOffDate))) throw new Error('OFF pengganti harus memilih hari kerja roster.')
    }
    return {
      employeeId,
      category,
      shiftCode,
      rosterType,
      scheduleCode: code,
      workStreakDays,
      overtimeCreditMinutes: fixedCredit,
      replacementOffDate: input.replacementOffDate ?? null,
      workPeriod,
      payrollPeriod,
      evidenceStatus: 'pending',
    }
  })
}

export async function assertNoSplOverlap(input: {
  splId?: number | null
  employeeIds: number[]
  plannedStartAt: Date
  plannedEndAt: Date
}) {
  const rows = await db
    .select({ id: overtimeCommandLetters.id, employeeId: overtimeCommandLetterItems.assignedEmployeeId })
    .from(overtimeCommandLetters)
    .innerJoin(overtimeCommandLetterItems, eq(overtimeCommandLetterItems.overtimeCommandLetterId, overtimeCommandLetters.id))
    .where(
      and(
        inArray(overtimeCommandLetters.status, ['draft', 'submitted', 'approved', 'closed']),
        inArray(overtimeCommandLetterItems.assignedEmployeeId, input.employeeIds),
      )
    )
  const conflictingIds = [...new Set(rows.filter((row) => row.id !== input.splId).map((row) => row.id))]
  if (!conflictingIds.length) return
  const conflicts = await db
    .select({ id: overtimeCommandLetters.id, start: overtimeCommandLetters.plannedStartAt, end: overtimeCommandLetters.plannedEndAt })
    .from(overtimeCommandLetters)
    .where(inArray(overtimeCommandLetters.id, conflictingIds))
  if (conflicts.some((row) => row.start && row.end && row.start < input.plannedEndAt && row.end > input.plannedStartAt)) {
    throw new Error('Waktu SPL tumpang tindih dengan SPL aktif employee yang sama.')
  }
}
