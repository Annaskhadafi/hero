'use server'

import { logAuditEvent } from '@/lib/audit-logger'
import {
  notifyPasswordReset,
  notifyRoleChanged,
  notifyAccountBanned,
} from '@/lib/user-notifications'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import Fuse from 'fuse.js'

async function getCurrentActorEmail(): Promise<string | undefined> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    return session?.user?.email ?? undefined
  } catch {
    return undefined
  }
}

import { randomUUID } from 'crypto'
import { and, asc, desc, eq, inArray, isNull, isNotNull, ne, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { hashPassword } from 'better-auth/crypto'
import { db } from '@/db'
import { account, session, user } from '@/db/schema/auth'
import {
  activities,
  approvals,
  attendanceRecords,
  dailyReports,
  employees,
  hrDepartments,
  hrEmployeeStatuses,
  hrEmployees,
  hrOrgNodes,
  hrPositions,
  hrSections,
  hrSites,
  hrWorkLocations,
  hseIncidents,
  hseObservations,
  masterDepartments,
  masterPositions,
  masterSections,
  navbarMenuItems,
  navbarThemes,
  orgChartNodes,
  orgChartStructures,
  pointEvents,
  penaltyEvents,
  pointDisputes,
  levels,
  badges,
  employeeBadges,
  roleMenuPermissions,
  securityRolePermissions,
  securityRoles,
  sites,
  sioCertifications,
  timesheetEntries,
  trainingRecords,
  wellnessRecords,
} from '@/db/schema/hero'
import {
  indonesiaHolidays,
  timesheetAttendanceEmployeeAliases,
  timesheetAttendanceImportPreviews,
  timesheetAttendanceImportTemplates,
  timesheetAttendanceRealOverrides,
  timesheetFieldBreakPlans,
  timesheetSchedulingConfigs,
  timesheetSchedulingPlans,
  timesheetSchedulingStatuses,
} from '@/db/schema/timesheet'
import { fetchIndonesiaHolidays } from '@/lib/openholiday'
import {
  buildAttendanceImportPreview,
  attendanceImportRawRowsSchema,
  type AttendancePreviewConflict,
  type AttendancePreviewRow,
} from '@/lib/timesheet/attendance-import'
import { ensureSchedulingTimesheetTables } from '@/lib/timesheet/scheduling-infrastructure'
import {
  ensureHeroGovernanceSeedData,
  ensureHeroSeedData,
  evaluatePointThresholdBadges,
} from '@/lib/hero-admin'
import { createNotificationEventForEmployee, sendPushNotification } from '@/lib/push-notifications'
import {
  getMappedValue,
  parseCsvToRecords,
  type UserImportMapping,
} from '@/lib/security-user-import'
import {
  autoMapTrainingRecordHeaders,
  getTrainingRecordImportValue,
  INITIAL_TRAINING_RECORD_IMPORT_STATE,
  parseTrainingRecordCsv,
  type TrainingRecordImportState,
} from '@/lib/training-record-import'
import { normalizeBirthDateValue } from '@/lib/birth-date'
import {
  type ApprovalRouteResolution,
  type ResolvedApprovalStep,
  resolveApprovalRouteForActivity,
  serializeApprovalRoute,
} from '@/lib/approval-engine'
import {
  cancelFormSubmissionDraft,
  cloneFormTemplateVersion,
  createFormTemplateField,
  createFormTemplateSection,
  createWorkflowCondition,
  publishFormTemplateVersion,
  runApprovalAutomationTick,
  saveFormTemplateLayout,
  saveActivityDraftSubmission,
  syncActivityWorkflowArtifacts,
} from '@/lib/approval-blueprint'
import { appendApprovalNoteEntry } from '@/lib/approval-notes'
import { getCurrentMenuPermission } from '@/lib/hero-access'

async function requireSchedulingTimesheetAccess(permission: 'edit' | 'finalize' = 'edit') {
  const access = await getCurrentMenuPermission('scheduling_timesheet')
  const allowed =
    permission === 'finalize'
      ? access.canDelete || access.canSelectAll
      : access.canEdit || access.canDelete || access.canSelectAll
  if (!allowed) throw new Error('Unauthorized scheduling timesheet access')
  return access
}

async function getCurrentActorUserId(actorEmail?: string) {
  const actor = actorEmail
    ? await db.select({ id: user.id }).from(user).where(eq(user.email, actorEmail)).limit(1)
    : []
  return actor[0]?.id ?? null
}

async function assertSchedulingPeriodOpen(siteId: number, period: string) {
  await ensureSchedulingTimesheetTables()
  const [status] = await db
    .select()
    .from(timesheetSchedulingStatuses)
    .where(
      and(
        eq(timesheetSchedulingStatuses.siteId, siteId),
        eq(timesheetSchedulingStatuses.period, period)
      )
    )
    .limit(1)
  if (
    status?.finalizedAt ||
    status?.scheduleStatus === 'finalized' ||
    status?.attendanceStatus === 'finalized'
  ) {
    throw new Error('Scheduling period is finalized. Reopen before editing.')
  }
}

const indonesiaHolidaySyncSchema = z.object({ year: z.number().int().min(2000).max(2100) })
const indonesiaHolidayPeriodSchema = z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) })

export async function syncIndonesiaHolidaysAction(
  input: z.infer<typeof indonesiaHolidaySyncSchema>
) {
  const payload = indonesiaHolidaySyncSchema.parse(input)
  await requireSchedulingTimesheetAccess('edit')
  await ensureSchedulingTimesheetTables()
  const holidays = await fetchIndonesiaHolidays(payload.year)
  await upsertIndonesiaHolidays(holidays)

  revalidatePath('/dashboard/scheduling-timesheet')
  return { ok: true, count: holidays.length }
}

async function upsertIndonesiaHolidays(
  holidays: Awaited<ReturnType<typeof fetchIndonesiaHolidays>>
) {
  const now = new Date()

  if (holidays.length) {
    await db
      .insert(indonesiaHolidays)
      .values(
        holidays.map((holiday) => ({
          date: holiday.date,
          name: holiday.name,
          localName: holiday.localName,
          source: 'api-hari-libur',
          sourceId: holiday.sourceId,
          types: holiday.types,
          nationwide: holiday.nationwide,
          rawPayload: holiday.rawPayload,
          syncedAt: now,
          updatedAt: now,
        }))
      )
      .onConflictDoUpdate({
        target: [indonesiaHolidays.date, indonesiaHolidays.source],
        set: {
          name: sql`excluded.name`,
          localName: sql`excluded.local_name`,
          sourceId: sql`excluded.source_id`,
          types: sql`excluded.types`,
          nationwide: sql`excluded.nationwide`,
          rawPayload: sql`excluded.raw_payload`,
          syncedAt: now,
          updatedAt: now,
        },
      })
  }
}

export async function getIndonesiaHolidaysAction(
  input: z.infer<typeof indonesiaHolidayPeriodSchema>
) {
  const payload = indonesiaHolidayPeriodSchema.parse(input)
  await requireSchedulingTimesheetAccess('edit')
  await ensureSchedulingTimesheetTables()
  const [year, month] = payload.period.split('-').map(Number)
  const start = `${payload.period}-01`
  const end = `${payload.period}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`
  let rows = await db
    .select({
      date: indonesiaHolidays.date,
      name: indonesiaHolidays.name,
      localName: indonesiaHolidays.localName,
    })
    .from(indonesiaHolidays)
    .where(
      and(
        eq(indonesiaHolidays.source, 'api-hari-libur'),
        sql`${indonesiaHolidays.date} >= ${start}`,
        sql`${indonesiaHolidays.date} <= ${end}`
      )
    )
    .orderBy(asc(indonesiaHolidays.date))

  if (rows.length === 0) {
    const holidays = await fetchIndonesiaHolidays(year)
    await upsertIndonesiaHolidays(holidays)
    rows = await db
      .select({
        date: indonesiaHolidays.date,
        name: indonesiaHolidays.name,
        localName: indonesiaHolidays.localName,
      })
      .from(indonesiaHolidays)
      .where(
        and(
          eq(indonesiaHolidays.source, 'api-hari-libur'),
          sql`${indonesiaHolidays.date} >= ${start}`,
          sql`${indonesiaHolidays.date} <= ${end}`
        )
      )
      .orderBy(asc(indonesiaHolidays.date))
  }

  return rows.map((holiday) => ({ ...holiday, day: Number(holiday.date.slice(-2)) }))
}

const createActivitySchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  activityCode: z.string().trim().min(2).max(4),
  activityType: z.string().trim().min(3),
  title: z.string().trim().min(5),
  unitNumber: z.string().trim().min(2),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1),
  priority: z.string().trim().min(3),
  overtimeMinutes: z.coerce.number().int().min(0).max(720),
  remarks: z.string().trim().min(3),
})

const scheduleCodeSchema = z.enum(['IN', 'DS', 'NS', 'OFF', 'FB', 'Libur', 'Sakit', 'Emergency'])
const schedulingPlanRowSchema = z.object({
  employeeId: z.number().int(),
  schedule: z.array(scheduleCodeSchema),
})
const schedulingEmployeeProfileSchema = z.object({
  employeeId: z.number().int(),
  section: z.string().max(80),
  positionOnSite: z.string().max(120),
  kimperLv: z.boolean(),
  kimperTh: z.boolean(),
})

const saveSchedulingTimesheetPlanSchema = z.object({
  siteId: z.number().int().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  siteScheduleType: z.enum(['office', 'shift', 'hybrid']),
  draftSchedule: z.array(schedulingPlanRowSchema),
  fixedSchedule: z.array(schedulingPlanRowSchema),
  employeeProfiles: z.array(schedulingEmployeeProfileSchema),
  fieldBreakConfig: z
    .object({
      workWeeks: z.number().int().min(1),
      breakWeeks: z.number().int().min(1),
    })
    .nullable(),
})

export async function saveSchedulingTimesheetPlanAction(
  input: z.infer<typeof saveSchedulingTimesheetPlanSchema>
) {
  const payload = saveSchedulingTimesheetPlanSchema.parse(input)
  await requireSchedulingTimesheetAccess('edit')
  await ensureSchedulingTimesheetTables()
  await assertSchedulingPeriodOpen(payload.siteId, payload.period)
  const actorEmail = await getCurrentActorEmail()
  const savedByUserId = await getCurrentActorUserId(actorEmail)
  const now = new Date()

  await db.transaction(async (tx) => {
    await tx
      .insert(timesheetSchedulingPlans)
      .values({
        siteId: payload.siteId,
        period: payload.period,
        siteScheduleType: payload.siteScheduleType,
        draftSchedule: payload.draftSchedule,
        fixedSchedule: payload.fixedSchedule,
        employeeProfiles: payload.employeeProfiles,
        fieldBreakConfig: payload.fieldBreakConfig,
        savedByUserId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [timesheetSchedulingPlans.siteId, timesheetSchedulingPlans.period],
        set: {
          siteScheduleType: payload.siteScheduleType,
          draftSchedule: payload.draftSchedule,
          fixedSchedule: payload.fixedSchedule,
          employeeProfiles: payload.employeeProfiles,
          fieldBreakConfig: payload.fieldBreakConfig,
          savedByUserId,
          updatedAt: now,
        },
      })

    await tx
      .insert(timesheetSchedulingStatuses)
      .values({
        siteId: payload.siteId,
        period: payload.period,
        scheduleStatus: 'saved',
        lastSavedAt: now,
        savedByUserId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [timesheetSchedulingStatuses.siteId, timesheetSchedulingStatuses.period],
        set: { scheduleStatus: 'saved', lastSavedAt: now, savedByUserId, updatedAt: now },
      })
  })

  await logAuditEvent({
    actorEmail,
    action: 'timesheet.schedule_saved',
    entityType: 'timesheet_scheduling',
    entityLabel: `${payload.siteId}:${payload.period}`,
    description: `Saved scheduling plan (${payload.fixedSchedule.length} rows).`,
  })

  revalidatePath('/dashboard/scheduling-timesheet')

  return { ok: true }
}

const saveTimesheetFieldBreakPlansSchema = z.object({
  siteId: z.number().int().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  plans: z.array(
    z.object({
      employeeId: z.number().int().positive(),
      employeeName: z.string().min(1).max(200),
      sectionName: z.string().max(160),
      rosterSection: z.string().max(120),
      onSiteDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable(),
      dayCount: z.number().int().min(1).max(365).nullable(),
      fieldBreakDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable(),
    })
  ),
})

export async function saveTimesheetFieldBreakPlansAction(
  input: z.infer<typeof saveTimesheetFieldBreakPlansSchema>
) {
  const payload = saveTimesheetFieldBreakPlansSchema.parse(input)
  await requireSchedulingTimesheetAccess('edit')
  await ensureSchedulingTimesheetTables()
  await assertSchedulingPeriodOpen(payload.siteId, payload.period)
  const actorEmail = await getCurrentActorEmail()
  const savedByUserId = await getCurrentActorUserId(actorEmail)
  const now = new Date()

  await db.transaction(async (tx) => {
    for (const plan of payload.plans) {
      await tx
        .insert(timesheetFieldBreakPlans)
        .values({
          siteId: payload.siteId,
          period: payload.period,
          employeeId: plan.employeeId,
          employeeName: plan.employeeName,
          sectionName: plan.sectionName,
          rosterSection: plan.rosterSection,
          onSiteDate: plan.onSiteDate,
          dayCount: plan.dayCount,
          fieldBreakDate: plan.fieldBreakDate,
          savedByUserId,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            timesheetFieldBreakPlans.siteId,
            timesheetFieldBreakPlans.period,
            timesheetFieldBreakPlans.employeeId,
          ],
          set: {
            employeeName: plan.employeeName,
            sectionName: plan.sectionName,
            rosterSection: plan.rosterSection,
            onSiteDate: plan.onSiteDate,
            dayCount: plan.dayCount,
            fieldBreakDate: plan.fieldBreakDate,
            savedByUserId,
            updatedAt: now,
          },
        })
    }

    await tx
      .insert(timesheetSchedulingStatuses)
      .values({
        siteId: payload.siteId,
        period: payload.period,
        scheduleStatus: 'saved',
        lastSavedAt: now,
        savedByUserId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [timesheetSchedulingStatuses.siteId, timesheetSchedulingStatuses.period],
        set: { scheduleStatus: 'saved', lastSavedAt: now, savedByUserId, updatedAt: now },
      })
  })

  await logAuditEvent({
    actorEmail,
    action: 'timesheet.field_break_saved',
    entityType: 'timesheet_scheduling',
    entityLabel: `${payload.siteId}:${payload.period}`,
    description: `Saved field break plans (${payload.plans.length} rows).`,
  })
  revalidatePath('/dashboard/scheduling-timesheet')

  return { ok: true }
}

const attendanceRealStatusSchema = z.enum(['present', 'empty', 'sick', 'leave', 'absent', 'off'])
const saveAttendanceRealOverridesSchema = z.object({
  siteId: z.number().int().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  overrides: z.array(
    z.object({
      employeeId: z.number().int().positive(),
      day: z.number().int().min(1).max(31),
      status: attendanceRealStatusSchema,
      clockIn: z.string().max(8).default(''),
      clockOut: z.string().max(8).default(''),
      note: z.string().max(240).default(''),
      source: z.enum(['manual', 'excel', 'attendance']).default('manual'),
    })
  ),
})

export async function saveAttendanceRealOverridesAction(
  input: z.infer<typeof saveAttendanceRealOverridesSchema>
) {
  const payload = saveAttendanceRealOverridesSchema.parse(input)
  await requireSchedulingTimesheetAccess('edit')
  await ensureSchedulingTimesheetTables()
  await assertSchedulingPeriodOpen(payload.siteId, payload.period)
  const actorEmail = await getCurrentActorEmail()
  const savedByUserId = await getCurrentActorUserId(actorEmail)
  const now = new Date()

  if (!payload.overrides.length) return { ok: true, savedCount: 0 }

  // Ensure site exists - check hrSites (new) or legacy sites table
  const [existingHrSite] = await db
    .select({ id: hrSites.id })
    .from(hrSites)
    .where(eq(hrSites.id, payload.siteId))
    .limit(1)
  const [existingLegacySite] = await db
    .select({ id: sites.id })
    .from(sites)
    .where(eq(sites.id, payload.siteId))
    .limit(1)
  if (!existingHrSite && !existingLegacySite) {
    // Auto-create in legacy sites table as fallback
    await db.execute(sql`
      INSERT INTO hero_sites (id, name, location, customer_name, contract_number, is_active, created_at)
      VALUES (${payload.siteId}, ${'Site ' + payload.siteId}, "" , ${'Site ' + payload.siteId}, "", true, NOW())
      ON CONFLICT (id) DO NOTHING
    `)
  }

  // Filter overrides to only include valid employee IDs that exist in DB
  const employeeIds = [...new Set(payload.overrides.map((o) => o.employeeId))]
  const [validLegacyEmployees, validHrEmployees] = await Promise.all([
    db.select({ id: employees.id }).from(employees).where(inArray(employees.id, employeeIds)),
    db.select({ id: hrEmployees.id }).from(hrEmployees).where(inArray(hrEmployees.id, employeeIds)),
  ])
  const validEmployeeIds = new Set([
    ...validLegacyEmployees.map((e) => e.id),
    ...validHrEmployees.map((e) => e.id),
  ])
  const validOverrides = payload.overrides.filter((o) => validEmployeeIds.has(o.employeeId))

  if (!validOverrides.length) return { ok: true, savedCount: 0 }

  await db.transaction(async (tx) => {
    await tx
      .insert(timesheetAttendanceRealOverrides)
      .values(
        validOverrides.map((override) => ({
          siteId: payload.siteId,
          period: payload.period,
          employeeId: override.employeeId,
          day: override.day,
          status: override.status,
          clockIn: override.clockIn,
          clockOut: override.clockOut,
          note: override.note,
          source: override.source,
          savedByUserId,
          updatedAt: now,
        }))
      )
      .onConflictDoUpdate({
        target: [
          timesheetAttendanceRealOverrides.siteId,
          timesheetAttendanceRealOverrides.period,
          timesheetAttendanceRealOverrides.employeeId,
          timesheetAttendanceRealOverrides.day,
        ],
        set: {
          status: sql`excluded.status`,
          clockIn: sql`excluded.clock_in`,
          clockOut: sql`excluded.clock_out`,
          note: sql`excluded.note`,
          source: sql`excluded.source`,
          savedByUserId,
          updatedAt: now,
        },
      })

    await tx
      .insert(timesheetSchedulingStatuses)
      .values({
        siteId: payload.siteId,
        period: payload.period,
        attendanceStatus: 'saved',
        lastSavedAt: now,
        savedByUserId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [timesheetSchedulingStatuses.siteId, timesheetSchedulingStatuses.period],
        set: { attendanceStatus: 'saved', lastSavedAt: now, savedByUserId, updatedAt: now },
      })
  })

  await logAuditEvent({
    actorEmail,
    action: 'timesheet.attendance_saved',
    entityType: 'timesheet_scheduling',
    entityLabel: `${payload.siteId}:${payload.period}`,
    description: `Saved attendance overrides (${payload.overrides.length} cells).`,
  })
  revalidatePath('/dashboard/scheduling-timesheet')

  return { ok: true, savedCount: validOverrides.length }
}

const finalizeSchedulingPeriodSchema = z.object({
  siteId: z.number().int().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  reason: z.string().max(500).optional().default(''),
})

const reopenSchedulingPeriodSchema = z.object({
  siteId: z.number().int().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  reason: z.string().trim().min(1).max(500),
})

export async function finalizeSchedulingPeriodAction(
  input: z.infer<typeof finalizeSchedulingPeriodSchema>
) {
  const payload = finalizeSchedulingPeriodSchema.parse(input)
  await requireSchedulingTimesheetAccess('finalize')
  await ensureSchedulingTimesheetTables()
  const actorEmail = await getCurrentActorEmail()
  const savedByUserId = await getCurrentActorUserId(actorEmail)
  const now = new Date()

  await db
    .insert(timesheetSchedulingStatuses)
    .values({
      siteId: payload.siteId,
      period: payload.period,
      scheduleStatus: 'finalized',
      attendanceStatus: 'finalized',
      importStatus: 'finalized',
      finalizedAt: now,
      savedByUserId,
      metadata: { finalizedReason: payload.reason },
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [timesheetSchedulingStatuses.siteId, timesheetSchedulingStatuses.period],
      set: {
        scheduleStatus: 'finalized',
        attendanceStatus: 'finalized',
        importStatus: 'finalized',
        finalizedAt: now,
        savedByUserId,
        metadata: { finalizedReason: payload.reason },
        updatedAt: now,
      },
    })

  await logAuditEvent({
    actorEmail,
    action: 'timesheet.period_finalized',
    entityType: 'timesheet_scheduling',
    entityLabel: `${payload.siteId}:${payload.period}`,
    description: `Finalized scheduling period. ${payload.reason}`.trim(),
    severity: 'warning',
  })
  revalidatePath('/dashboard/scheduling-timesheet')
  return { ok: true }
}

export async function reopenSchedulingPeriodAction(
  input: z.infer<typeof reopenSchedulingPeriodSchema>
) {
  const payload = reopenSchedulingPeriodSchema.parse(input)
  await requireSchedulingTimesheetAccess('finalize')
  await ensureSchedulingTimesheetTables()
  const actorEmail = await getCurrentActorEmail()
  const savedByUserId = await getCurrentActorUserId(actorEmail)
  const now = new Date()

  await db
    .insert(timesheetSchedulingStatuses)
    .values({
      siteId: payload.siteId,
      period: payload.period,
      scheduleStatus: 'reopened',
      attendanceStatus: 'reopened',
      importStatus: 'none',
      finalizedAt: null,
      savedByUserId,
      metadata: { reopenedReason: payload.reason },
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [timesheetSchedulingStatuses.siteId, timesheetSchedulingStatuses.period],
      set: {
        scheduleStatus: 'reopened',
        attendanceStatus: 'reopened',
        importStatus: 'none',
        finalizedAt: null,
        savedByUserId,
        metadata: { reopenedReason: payload.reason },
        updatedAt: now,
      },
    })

  await logAuditEvent({
    actorEmail,
    action: 'timesheet.period_reopened',
    entityType: 'timesheet_scheduling',
    entityLabel: `${payload.siteId}:${payload.period}`,
    description: `Reopened scheduling period. ${payload.reason}`,
    severity: 'warning',
  })
  revalidatePath('/dashboard/scheduling-timesheet')
  return { ok: true }
}

const createAttendanceImportPreviewSchema = z.object({
  siteId: z.number().int().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  filename: z.string().min(1).max(240),
  rows: attendanceImportRawRowsSchema,
  fixedSchedule: z.array(schedulingPlanRowSchema).default([]),
  detection: z
    .object({
      sheetName: z.string().default(''),
      kind: z.string().default('auto'),
      confidence: z.number().default(0),
      warnings: z.array(z.string()).default([]),
    })
    .optional(),
})

const attendanceImportPreviewIdSchema = z.object({ previewId: z.number().int().positive() })
const applyAttendanceImportPreviewSchema = attendanceImportPreviewIdSchema.extend({
  mode: z.enum(['skip-conflicts', 'overwrite-conflicts']).default('skip-conflicts'),
})
const clearAttendanceRealOverridesSchema = z.object({
  siteId: z.number().int().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  source: z.enum(['excel', 'manual', 'attendance', 'all']).default('excel'),
})
const updateAttendanceImportPreviewMatchSchema = z.object({
  previewId: z.number().int().positive(),
  importRowId: z.string().min(1),
  employeeId: z.number().int().positive(),
  saveAlias: z.boolean().default(true),
})
const attendanceImportHistorySchema = z.object({
  siteId: z.number().int().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/),
})
const saveAttendanceEmployeeAliasSchema = z.object({
  siteId: z.number().int().positive(),
  employeeId: z.number().int().positive(),
  aliasName: z.string().max(160).default(''),
  aliasSn: z.string().max(80).default(''),
  source: z.string().max(80).default('manual'),
})
const deleteAttendanceEmployeeAliasSchema = z.object({ aliasId: z.number().int().positive() })

export async function createAttendanceImportPreviewAction(
  input: z.infer<typeof createAttendanceImportPreviewSchema>
) {
  const payload = createAttendanceImportPreviewSchema.parse(input)
  await requireSchedulingTimesheetAccess('edit')
  await ensureSchedulingTimesheetTables()
  await assertSchedulingPeriodOpen(payload.siteId, payload.period)
  const actorEmail = await getCurrentActorEmail()
  const savedByUserId = await getCurrentActorUserId(actorEmail)
  const now = new Date()
  const [legacyEmployeeRows, hrEmployeeRows] = await Promise.all([
    db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        siteId: employees.siteId,
        siteName: sites.name,
      })
      .from(employees)
      .leftJoin(sites, eq(employees.siteId, sites.id)),
    db
      .select({
        id: hrEmployees.id,
        name: hrEmployees.fullName,
        employeeSn: hrEmployees.employeeId,
        siteId: hrEmployees.siteId,
        siteName: hrSites.name,
      })
      .from(hrEmployees)
      .leftJoin(hrSites, eq(hrEmployees.siteId, hrSites.id))
      .where(eq(hrEmployees.isActive, true)),
  ])
  // Merge, prefer hrEmployees if same id exists
  const hrEmployeeIdSet = new Set(hrEmployeeRows.map((e) => e.id))
  const siteEmployees = [
    ...hrEmployeeRows,
    ...legacyEmployeeRows.filter((e) => !hrEmployeeIdSet.has(e.id)),
  ]
  const aliases = await db
    .select({
      employeeId: timesheetAttendanceEmployeeAliases.employeeId,
      aliasName: timesheetAttendanceEmployeeAliases.aliasName,
      aliasSn: timesheetAttendanceEmployeeAliases.aliasSn,
    })
    .from(timesheetAttendanceEmployeeAliases)
    .where(eq(timesheetAttendanceEmployeeAliases.siteId, payload.siteId))
  const [hrSiteRow] = await db
    .select({ name: hrSites.name })
    .from(hrSites)
    .where(eq(hrSites.id, payload.siteId))
    .limit(1)
  const [legacySiteRow] = await db
    .select({ name: sites.name })
    .from(sites)
    .where(eq(sites.id, payload.siteId))
    .limit(1)
  const site = hrSiteRow ?? legacySiteRow
  const detection = payload.detection ?? {
    sheetName: '',
    kind: 'auto',
    confidence: 0,
    warnings: [],
  }
  const headerSignature = `${detection.kind}:${detection.sheetName}`
  let templateId: number | null = null
  const preview = buildAttendanceImportPreview({
    rows: payload.rows,
    employees: siteEmployees,
    aliases,
    siteId: payload.siteId,
    siteName: site?.name,
    fixedSchedule: payload.fixedSchedule,
  })
  let previewId = 0

  await db.transaction(async (tx) => {
    const [template] = await tx
      .insert(timesheetAttendanceImportTemplates)
      .values({
        siteId: payload.siteId,
        templateName: headerSignature || payload.filename,
        sourceType: 'attendance',
        sheetName: detection.sheetName,
        templateKind: detection.kind,
        headerSignature,
        confidence: Math.round(detection.confidence),
        usageCount: 1,
        lastUsedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          timesheetAttendanceImportTemplates.siteId,
          timesheetAttendanceImportTemplates.templateName,
        ],
        set: {
          sheetName: detection.sheetName,
          templateKind: detection.kind,
          headerSignature,
          confidence: Math.round(detection.confidence),
          usageCount: sql`${timesheetAttendanceImportTemplates.usageCount} + 1`,
          lastUsedAt: now,
          updatedAt: now,
        },
      })
      .returning({ id: timesheetAttendanceImportTemplates.id })
    templateId = template?.id ?? null
    const [inserted] = await tx
      .insert(timesheetAttendanceImportPreviews)
      .values({
        siteId: payload.siteId,
        period: payload.period,
        filename: payload.filename,
        status: 'preview',
        matchedCount: preview.matchedCount,
        unmatchedCount: preview.unmatchedCount,
        cellCount: preview.cellCount,
        conflictCount: preview.conflictCount,
        previewRows: preview.previewRows,
        conflicts: preview.conflicts,
        templateId,
        templateKind: detection.kind,
        sheetName: detection.sheetName,
        detectionSummary: detection,
        validationSummary: preview.validationSummary,
        uploadedByUserId: savedByUserId,
        createdAt: now,
      })
      .returning({ id: timesheetAttendanceImportPreviews.id })
    previewId = inserted.id
    await tx
      .insert(timesheetSchedulingStatuses)
      .values({
        siteId: payload.siteId,
        period: payload.period,
        importStatus: 'preview',
        conflictCount: preview.conflictCount,
        lastImportedAt: now,
        savedByUserId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [timesheetSchedulingStatuses.siteId, timesheetSchedulingStatuses.period],
        set: {
          importStatus: 'preview',
          conflictCount: preview.conflictCount,
          lastImportedAt: now,
          savedByUserId,
          updatedAt: now,
        },
      })
  })

  await logAuditEvent({
    actorEmail,
    action: 'timesheet.import_previewed',
    entityType: 'timesheet_scheduling_import',
    entityLabel: `${payload.siteId}:${payload.period}:${previewId}`,
    description: `Previewed attendance import (${preview.cellCount} cells, ${preview.conflictCount} conflicts).`,
  })
  revalidatePath('/dashboard/scheduling-timesheet')
  return { ok: true, previewId, ...preview }
}

export async function applyAttendanceImportPreviewAction(
  input: z.infer<typeof applyAttendanceImportPreviewSchema>
) {
  const payload = applyAttendanceImportPreviewSchema.parse(input)
  await requireSchedulingTimesheetAccess('edit')
  await ensureSchedulingTimesheetTables()
  const actorEmail = await getCurrentActorEmail()
  const savedByUserId = await getCurrentActorUserId(actorEmail)
  const now = new Date()
  const [preview] = await db
    .select()
    .from(timesheetAttendanceImportPreviews)
    .where(eq(timesheetAttendanceImportPreviews.id, payload.previewId))
    .limit(1)
  if (!preview || preview.status !== 'preview') throw new Error('Import preview not found.')
  await assertSchedulingPeriodOpen(preview.siteId, preview.period)
  const rows = preview.previewRows as AttendancePreviewRow[]
  const conflicts = preview.conflicts as AttendancePreviewConflict[]
  const conflictKeys = new Set(
    conflicts.map((conflict) => `${conflict.employeeId}:${conflict.day}`)
  )
  const writableRows = rows.filter(
    (row) =>
      row.employeeId &&
      !row.unmatched &&
      !row.duplicate &&
      !row.crossSite &&
      (payload.mode === 'overwrite-conflicts' || !conflictKeys.has(`${row.employeeId}:${row.day}`))
  )

  await db.transaction(async (tx) => {
    if (writableRows.length) {
      await tx
        .insert(timesheetAttendanceRealOverrides)
        .values(
          writableRows.map((row) => ({
            siteId: preview.siteId,
            period: preview.period,
            employeeId: row.employeeId!,
            day: row.day,
            status: row.status,
            clockIn: row.clockIn,
            clockOut: row.clockOut,
            note: row.note,
            source: 'excel' as const,
            importPreviewId: payload.previewId,
            validationFlags: row.validationFlags ?? [],
            workMinutes: row.workMinutes ?? null,
            savedByUserId,
            updatedAt: now,
          }))
        )
        .onConflictDoUpdate({
          target: [
            timesheetAttendanceRealOverrides.siteId,
            timesheetAttendanceRealOverrides.period,
            timesheetAttendanceRealOverrides.employeeId,
            timesheetAttendanceRealOverrides.day,
          ],
          set: {
            status: sql`excluded.status`,
            clockIn: sql`excluded.clock_in`,
            clockOut: sql`excluded.clock_out`,
            note: sql`excluded.note`,
            source: sql`excluded.source`,
            importPreviewId: payload.previewId,
            validationFlags: sql`excluded.validation_flags`,
            workMinutes: sql`excluded.work_minutes`,
            savedByUserId,
            updatedAt: now,
          },
        })
    }
    await tx
      .update(timesheetAttendanceImportPreviews)
      .set({ status: 'applied', appliedAt: now })
      .where(eq(timesheetAttendanceImportPreviews.id, payload.previewId))
    await tx
      .insert(timesheetSchedulingStatuses)
      .values({
        siteId: preview.siteId,
        period: preview.period,
        attendanceStatus: 'saved',
        importStatus: 'applied',
        conflictCount: payload.mode === 'skip-conflicts' ? conflicts.length : 0,
        lastImportedAt: now,
        lastSavedAt: now,
        savedByUserId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [timesheetSchedulingStatuses.siteId, timesheetSchedulingStatuses.period],
        set: {
          attendanceStatus: 'saved',
          importStatus: 'applied',
          conflictCount: payload.mode === 'skip-conflicts' ? conflicts.length : 0,
          lastImportedAt: now,
          lastSavedAt: now,
          savedByUserId,
          updatedAt: now,
        },
      })
  })

  await logAuditEvent({
    actorEmail,
    action: 'timesheet.import_applied',
    entityType: 'timesheet_scheduling_import',
    entityLabel: String(payload.previewId),
    description: `Applied attendance import (${writableRows.length} cells, mode ${payload.mode}).`,
  })
  revalidatePath('/dashboard/scheduling-timesheet')
  return { ok: true, savedCount: writableRows.length, rows: writableRows }
}

export async function updateAttendanceImportPreviewMatchAction(
  input: z.infer<typeof updateAttendanceImportPreviewMatchSchema>
) {
  const payload = updateAttendanceImportPreviewMatchSchema.parse(input)
  await requireSchedulingTimesheetAccess('edit')
  await ensureSchedulingTimesheetTables()
  const actorEmail = await getCurrentActorEmail()
  const savedByUserId = await getCurrentActorUserId(actorEmail)
  const now = new Date()
  const [preview] = await db
    .select()
    .from(timesheetAttendanceImportPreviews)
    .where(eq(timesheetAttendanceImportPreviews.id, payload.previewId))
    .limit(1)
  if (!preview || preview.status !== 'preview') throw new Error('Import preview not found.')
  await assertSchedulingPeriodOpen(preview.siteId, preview.period)
  const [employee] = await db
    .select({ id: employees.id, name: employees.name })
    .from(employees)
    .where(eq(employees.id, payload.employeeId))
    .limit(1)
  if (!employee) throw new Error('Employee not found.')
  const rows = preview.previewRows as AttendancePreviewRow[]
  const nextRows = rows.map((row) =>
    row.importRowId === payload.importRowId
      ? {
          ...row,
          employeeId: employee.id,
          matchedName: employee.name,
          unmatched: false,
          crossSite: false,
          duplicate: false,
          matchMethod: 'alias' as const,
          matchScore: 0,
          matchWarning: undefined,
          validationFlags: (row.validationFlags ?? []).filter((flag) => flag !== 'low-confidence'),
        }
      : row
  )
  const fixedRow = nextRows.find((row) => row.importRowId === payload.importRowId)
  if (!fixedRow) throw new Error('Preview row not found.')

  await db.transaction(async (tx) => {
    await tx
      .update(timesheetAttendanceImportPreviews)
      .set({
        previewRows: nextRows,
        matchedCount: nextRows.filter((row) => row.employeeId && !row.crossSite && !row.duplicate)
          .length,
        unmatchedCount: nextRows.filter((row) => row.unmatched || row.crossSite || row.duplicate)
          .length,
      })
      .where(eq(timesheetAttendanceImportPreviews.id, payload.previewId))
    if (payload.saveAlias && (fixedRow.employeeName || fixedRow.employeeSn)) {
      await tx
        .insert(timesheetAttendanceEmployeeAliases)
        .values({
          siteId: preview.siteId,
          employeeId: employee.id,
          aliasName: fixedRow.employeeName,
          aliasSn: fixedRow.employeeSn,
          source: 'preview-fix',
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            timesheetAttendanceEmployeeAliases.siteId,
            timesheetAttendanceEmployeeAliases.aliasName,
            timesheetAttendanceEmployeeAliases.aliasSn,
          ],
          set: { employeeId: employee.id, source: 'preview-fix', updatedAt: now },
        })
    }
  })

  await logAuditEvent({
    actorEmail,
    action: 'timesheet.import_previewed',
    entityType: 'timesheet_scheduling_import',
    entityLabel: String(payload.previewId),
    description: `Fixed attendance preview match for ${employee.name}.`,
  })
  revalidatePath('/dashboard/scheduling-timesheet')
  return { ok: true, previewRows: nextRows, savedByUserId }
}

export async function rollbackAttendanceImportPreviewAction(
  input: z.infer<typeof attendanceImportPreviewIdSchema>
) {
  const payload = attendanceImportPreviewIdSchema.parse(input)
  await requireSchedulingTimesheetAccess('edit')
  await ensureSchedulingTimesheetTables()
  const actorEmail = await getCurrentActorEmail()
  const savedByUserId = await getCurrentActorUserId(actorEmail)
  const now = new Date()
  const [preview] = await db
    .select()
    .from(timesheetAttendanceImportPreviews)
    .where(eq(timesheetAttendanceImportPreviews.id, payload.previewId))
    .limit(1)
  if (!preview || preview.status !== 'applied') throw new Error('Applied import not found.')
  await assertSchedulingPeriodOpen(preview.siteId, preview.period)

  await db.transaction(async (tx) => {
    await tx
      .delete(timesheetAttendanceRealOverrides)
      .where(eq(timesheetAttendanceRealOverrides.importPreviewId, payload.previewId))
    await tx
      .update(timesheetAttendanceImportPreviews)
      .set({ status: 'rolled_back', rolledBackAt: now })
      .where(eq(timesheetAttendanceImportPreviews.id, payload.previewId))
    await tx
      .insert(timesheetSchedulingStatuses)
      .values({
        siteId: preview.siteId,
        period: preview.period,
        importStatus: 'rolled_back',
        savedByUserId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [timesheetSchedulingStatuses.siteId, timesheetSchedulingStatuses.period],
        set: { importStatus: 'rolled_back', savedByUserId, updatedAt: now },
      })
  })

  await logAuditEvent({
    actorEmail,
    action: 'timesheet.import_discarded',
    entityType: 'timesheet_scheduling_import',
    entityLabel: String(payload.previewId),
    description: 'Rolled back attendance import batch.',
  })
  revalidatePath('/dashboard/scheduling-timesheet')
  return { ok: true }
}

export async function getAttendanceImportHistoryAction(
  input: z.infer<typeof attendanceImportHistorySchema>
) {
  const payload = attendanceImportHistorySchema.parse(input)
  await requireSchedulingTimesheetAccess('edit')
  await ensureSchedulingTimesheetTables()
  return db
    .select({
      id: timesheetAttendanceImportPreviews.id,
      filename: timesheetAttendanceImportPreviews.filename,
      status: timesheetAttendanceImportPreviews.status,
      matchedCount: timesheetAttendanceImportPreviews.matchedCount,
      unmatchedCount: timesheetAttendanceImportPreviews.unmatchedCount,
      cellCount: timesheetAttendanceImportPreviews.cellCount,
      conflictCount: timesheetAttendanceImportPreviews.conflictCount,
      templateKind: timesheetAttendanceImportPreviews.templateKind,
      sheetName: timesheetAttendanceImportPreviews.sheetName,
      validationSummary: timesheetAttendanceImportPreviews.validationSummary,
      createdAt: timesheetAttendanceImportPreviews.createdAt,
      appliedAt: timesheetAttendanceImportPreviews.appliedAt,
      rolledBackAt: timesheetAttendanceImportPreviews.rolledBackAt,
    })
    .from(timesheetAttendanceImportPreviews)
    .where(
      and(
        eq(timesheetAttendanceImportPreviews.siteId, payload.siteId),
        eq(timesheetAttendanceImportPreviews.period, payload.period)
      )
    )
    .orderBy(desc(timesheetAttendanceImportPreviews.createdAt))
    .limit(10)
}

export async function saveAttendanceEmployeeAliasAction(
  input: z.infer<typeof saveAttendanceEmployeeAliasSchema>
) {
  const payload = saveAttendanceEmployeeAliasSchema.parse(input)
  await requireSchedulingTimesheetAccess('edit')
  await ensureSchedulingTimesheetTables()
  const now = new Date()
  await db
    .insert(timesheetAttendanceEmployeeAliases)
    .values({
      siteId: payload.siteId,
      employeeId: payload.employeeId,
      aliasName: payload.aliasName,
      aliasSn: payload.aliasSn,
      source: payload.source,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        timesheetAttendanceEmployeeAliases.siteId,
        timesheetAttendanceEmployeeAliases.aliasName,
        timesheetAttendanceEmployeeAliases.aliasSn,
      ],
      set: { employeeId: payload.employeeId, source: payload.source, updatedAt: now },
    })
  revalidatePath('/dashboard/scheduling-timesheet')
  return { ok: true }
}

export async function deleteAttendanceEmployeeAliasAction(
  input: z.infer<typeof deleteAttendanceEmployeeAliasSchema>
) {
  const payload = deleteAttendanceEmployeeAliasSchema.parse(input)
  await requireSchedulingTimesheetAccess('edit')
  await ensureSchedulingTimesheetTables()
  await db
    .delete(timesheetAttendanceEmployeeAliases)
    .where(eq(timesheetAttendanceEmployeeAliases.id, payload.aliasId))
  revalidatePath('/dashboard/scheduling-timesheet')
  return { ok: true }
}

export async function discardAttendanceImportPreviewAction(
  input: z.infer<typeof attendanceImportPreviewIdSchema>
) {
  const payload = attendanceImportPreviewIdSchema.parse(input)
  await requireSchedulingTimesheetAccess('edit')
  await ensureSchedulingTimesheetTables()
  const actorEmail = await getCurrentActorEmail()
  const savedByUserId = await getCurrentActorUserId(actorEmail)
  const now = new Date()
  const [preview] = await db
    .select()
    .from(timesheetAttendanceImportPreviews)
    .where(eq(timesheetAttendanceImportPreviews.id, payload.previewId))
    .limit(1)
  if (!preview || preview.status !== 'preview') throw new Error('Import preview not found.')
  await assertSchedulingPeriodOpen(preview.siteId, preview.period)

  await db.transaction(async (tx) => {
    await tx
      .update(timesheetAttendanceImportPreviews)
      .set({ status: 'discarded' })
      .where(eq(timesheetAttendanceImportPreviews.id, payload.previewId))
    await tx
      .insert(timesheetSchedulingStatuses)
      .values({
        siteId: preview.siteId,
        period: preview.period,
        importStatus: 'discarded',
        savedByUserId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [timesheetSchedulingStatuses.siteId, timesheetSchedulingStatuses.period],
        set: { importStatus: 'discarded', savedByUserId, updatedAt: now },
      })
  })

  await logAuditEvent({
    actorEmail,
    action: 'timesheet.import_discarded',
    entityType: 'timesheet_scheduling_import',
    entityLabel: String(payload.previewId),
    description: 'Discarded attendance import preview.',
  })
  revalidatePath('/dashboard/scheduling-timesheet')
  return { ok: true }
}

export async function clearAttendanceRealOverridesAction(
  input: z.infer<typeof clearAttendanceRealOverridesSchema>
) {
  const payload = clearAttendanceRealOverridesSchema.parse(input)
  await requireSchedulingTimesheetAccess('edit')
  await ensureSchedulingTimesheetTables()
  await assertSchedulingPeriodOpen(payload.siteId, payload.period)
  const actorEmail = await getCurrentActorEmail()
  const savedByUserId = await getCurrentActorUserId(actorEmail)
  const now = new Date()
  const conditions = [
    eq(timesheetAttendanceRealOverrides.siteId, payload.siteId),
    eq(timesheetAttendanceRealOverrides.period, payload.period),
  ]
  if (payload.source !== 'all')
    conditions.push(eq(timesheetAttendanceRealOverrides.source, payload.source))

  await db.transaction(async (tx) => {
    await tx.delete(timesheetAttendanceRealOverrides).where(and(...conditions))
    await tx
      .update(timesheetAttendanceImportPreviews)
      .set({ status: 'discarded' })
      .where(
        and(
          eq(timesheetAttendanceImportPreviews.siteId, payload.siteId),
          eq(timesheetAttendanceImportPreviews.period, payload.period),
          eq(timesheetAttendanceImportPreviews.status, 'preview')
        )
      )
    await tx
      .insert(timesheetSchedulingStatuses)
      .values({
        siteId: payload.siteId,
        period: payload.period,
        attendanceStatus: 'draft',
        importStatus: 'none',
        conflictCount: 0,
        savedByUserId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [timesheetSchedulingStatuses.siteId, timesheetSchedulingStatuses.period],
        set: {
          attendanceStatus: 'draft',
          importStatus: 'none',
          conflictCount: 0,
          savedByUserId,
          updatedAt: now,
        },
      })
  })

  await logAuditEvent({
    actorEmail,
    action: 'timesheet.attendance_cleared',
    entityType: 'timesheet_scheduling',
    entityLabel: `${payload.siteId}:${payload.period}`,
    description: `Cleared ${payload.source} attendance overrides.`,
  })
  revalidatePath('/dashboard/scheduling-timesheet')
  return { ok: true }
}

const saveSchedulingConfigSchema = z.object({
  siteId: z.number().int().positive(),
  scheduleType: z.enum(['office', 'shift', 'hybrid']),
  rosterType: z.string().max(40),
  msaType: z.string().max(60),
  mealsType: z.string().max(60),
  overtimeType: z.string().max(60),
  fieldBreakConfig: z.unknown().optional().nullable(),
  allowanceVariables: z.array(z.unknown()).default([]),
  overtimeVariables: z.array(z.unknown()).default([]),
})

export async function saveSchedulingConfigAction(
  input: z.infer<typeof saveSchedulingConfigSchema>
) {
  const payload = saveSchedulingConfigSchema.parse(input)
  await requireSchedulingTimesheetAccess('edit')
  await ensureSchedulingTimesheetTables()
  const actorEmail = await getCurrentActorEmail()
  const savedByUserId = await getCurrentActorUserId(actorEmail)
  const now = new Date()
  // Validate site exists in hrSites (new) or sites (legacy)
  const [hrSite] = await db
    .select({ id: hrSites.id })
    .from(hrSites)
    .where(eq(hrSites.id, payload.siteId))
    .limit(1)
  const [legacySite] = await db
    .select({ id: sites.id })
    .from(sites)
    .where(eq(sites.id, payload.siteId))
    .limit(1)
  if (!hrSite && !legacySite) return { ok: false, error: 'Site not found' }

  await db
    .insert(timesheetSchedulingConfigs)
    .values({ ...payload, savedByUserId, updatedAt: now })
    .onConflictDoUpdate({
      target: [timesheetSchedulingConfigs.siteId],
      set: {
        scheduleType: payload.scheduleType,
        rosterType: payload.rosterType,
        msaType: payload.msaType,
        mealsType: payload.mealsType,
        overtimeType: payload.overtimeType,
        fieldBreakConfig: payload.fieldBreakConfig,
        allowanceVariables: payload.allowanceVariables,
        overtimeVariables: payload.overtimeVariables,
        savedByUserId,
        updatedAt: now,
      },
    })

  await logAuditEvent({
    actorEmail,
    action: 'timesheet.config_saved',
    entityType: 'timesheet_scheduling_config',
    entityLabel: String(payload.siteId),
    description: 'Saved scheduling timesheet configuration.',
  })
  revalidatePath('/dashboard/scheduling-timesheet')
  return { ok: true }
}

const saveActivityDraftSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  activityCode: z.string().trim().max(4).optional().default(''),
  activityType: z.string().trim().max(100).optional().default(''),
  title: z.string().trim().max(200).optional().default(''),
  unitNumber: z.string().trim().max(100).optional().default(''),
  startTime: z.string().trim().optional().default(''),
  endTime: z.string().trim().optional().default(''),
  priority: z.string().trim().max(50).optional().default('Normal'),
  overtimeMinutes: z.coerce.number().int().min(0).max(720).optional().default(0),
  remarks: z.string().trim().max(1000).optional().default(''),
})

const reviewApprovalSchema = z.object({
  approvalId: z.coerce.number().int().positive(),
  decision: z.enum(['approved', 'rejected', 'needs_correction']),
  note: z.preprocess(
    (value) => (value === null || value === undefined ? undefined : value),
    z.string().trim().max(1000).optional().default('')
  ),
})

const bulkApproveApprovalSchema = z.object({
  approvalIds: z.array(z.coerce.number().int().positive()).min(1),
  note: z.preprocess(
    (value) => (value === null || value === undefined ? undefined : value),
    z.string().trim().max(1000).optional().default('')
  ),
})

const approvalCommentSchema = z.object({
  approvalId: z.coerce.number().int().positive(),
  comment: z.string().trim().min(3).max(1000),
})

const cancelDraftSchema = z.object({
  submissionId: z.coerce.number().int().positive(),
})

const createFormSectionSchema = z.object({
  versionId: z.coerce.number().int().positive(),
  label: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().default(''),
  isCollapsible: z
    .preprocess((value) => value === 'on' || value === 'true', z.boolean())
    .optional()
    .default(false),
})

const createFormFieldSchema = z.object({
  versionId: z.coerce.number().int().positive(),
  sectionId: z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.coerce.number().int().positive().nullable()
  ),
  label: z.string().trim().min(2).max(120),
  fieldKey: z.string().trim().max(80).optional().default(''),
  fieldType: z.string().trim().min(2).max(80),
  placeholder: z.string().trim().max(200).optional().default(''),
  helpText: z.string().trim().max(500).optional().default(''),
  defaultValue: z.string().trim().max(500).optional().default(''),
  isRequired: z
    .preprocess((value) => value === 'on' || value === 'true', z.boolean())
    .optional()
    .default(false),
  optionLines: z.string().trim().max(3000).optional().default(''),
  validationRuleType: z.string().trim().max(80).optional().default(''),
  validationOperator: z.string().trim().max(40).optional().default('='),
  validationValue: z.string().trim().max(500).optional().default(''),
  validationMessage: z.string().trim().max(500).optional().default(''),
  allowedMimeTypes: z.string().trim().max(300).optional().default(''),
  maxSizeMb: z.coerce.number().min(0).max(100).optional().default(10),
})

const formTemplateVersionSchema = z.object({
  versionId: z.coerce.number().int().positive(),
})

const saveFormLayoutSchema = z.object({
  versionId: z.coerce.number().int().positive(),
  layoutJson: z.string().trim().min(2),
})

const createWorkflowConditionSchema = z.object({
  workflowVersionId: z.coerce.number().int().positive(),
  parentConditionId: z.preprocess(
    (value) => (value === '' || value == null ? null : value),
    z.coerce.number().int().positive().nullable()
  ),
  fieldKey: z.string().trim().min(2).max(120),
  operator: z.string().trim().min(1).max(40),
  compareValue: z.string().trim().max(500).optional().default(''),
  logicalJoin: z.enum(['AND', 'OR']).optional().default('AND'),
  groupLabel: z.string().trim().max(120).optional().default('Custom Condition Group'),
})

const importUsersSchema = z.object({
  rawCsv: z.string().trim().min(1, 'CSV file is required.'),
  mappingJson: z.string().trim().min(2, 'Mapping import belum lengkap.'),
})

export type ImportUsersActionState = {
  status: 'idle' | 'success' | 'error'
  message: string
  importedCount?: number
  updatedCount?: number
  skippedCount?: number
}

export type AdminMutationState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

const optionalFormString = z.preprocess(
  (value) => (value === null || value === undefined ? undefined : value),
  z.string().trim().optional()
)

const optionalPositiveInt = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : value),
  z.coerce.number().int().positive().optional()
)

const navbarThemeSchema = z.object({
  headerBackgroundColor: z
    .string()
    .trim()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Header color must be a valid hex color.'),
})

const manageSecurityUserSchema = z.object({
  intent: z.enum([
    'create-user',
    'update-profile',
    'ban-user',
    'delete-user',
    'change-role',
    'change-password',
  ]),
  employeeId: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number().int().positive().optional()
  ),
  siteId: optionalPositiveInt,
  fullName: optionalFormString,
  employeeSn: optionalFormString,
  profileImage: optionalFormString,
  joinYear: optionalFormString,
  birthPlaceDate: optionalFormString,
  domicile: optionalFormString,
  directManagerId: optionalFormString,
  section: optionalFormString,
  department: optionalFormString,
  jobTitle: optionalFormString,
  workLocation: optionalFormString,
  phoneNumber: optionalFormString,
  email: optionalFormString,
  employmentStatus: optionalFormString,
  employeeStatusType: optionalFormString,
  accessRole: optionalFormString,
  password: optionalFormString,
  newPassword: optionalFormString,
  levelName: optionalFormString,
  gender: optionalFormString,
  religion: optionalFormString,
  education: optionalFormString,
  maritalStatus: optionalFormString,
  pointOfHire: optionalFormString,
  joinDate: optionalFormString,
  contractDurationStart: optionalFormString,
  contractDurationEnd: optionalFormString,
  permanentDate: optionalFormString,
  birthDate: optionalFormString,
})

const manageSecurityRoleSchema = z.object({
  intent: z.enum(['create-role', 'duplicate-role', 'delete-role', 'save-menu-permissions']),
  roleId: optionalFormString,
  roleName: optionalFormString,
  description: optionalFormString,
  scope: optionalFormString,
  sourceRoleId: optionalFormString,
  permissionsJson: optionalFormString,
})

const optionalRecordId = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : value),
  z.coerce.number().int().positive().optional()
)

const optionalEmployeeId = z.preprocess(
  (value) =>
    value === '' || value === 'none' || value === null || value === undefined ? null : value,
  z.coerce.number().int().positive().nullable()
)

const manageHseObservationSchema = z.object({
  intent: z.enum(['create', 'update', 'update-status', 'delete']),
  id: optionalRecordId,
  siteId: z.coerce.number().int().positive().optional(),
  employeeId: optionalEmployeeId.optional().default(null),
  category: z.string().trim().max(120).optional().default('Observation'),
  title: z.string().trim().max(200).optional().default(''),
  location: z.string().trim().max(200).optional().default(''),
  severity: z.string().trim().max(50).optional().default('Low'),
  status: z.string().trim().max(50).optional().default('open'),
  notes: z.string().trim().max(1000).optional().default(''),
  observedAt: z.string().trim().optional().default(''),
})

const manageHseIncidentSchema = z.object({
  intent: z.enum(['create', 'update', 'update-status', 'delete']),
  id: optionalRecordId,
  siteId: z.coerce.number().int().positive().optional(),
  type: z.string().trim().max(120).optional().default('Incident'),
  title: z.string().trim().max(200).optional().default(''),
  unitNumber: z.string().trim().max(120).optional().default('-'),
  impact: z.string().trim().max(500).optional().default(''),
  status: z.string().trim().max(50).optional().default('investigating'),
  reportedAt: z.string().trim().optional().default(''),
})

const manageTrainingRecordSchema = z.object({
  intent: z.enum(['create', 'update', 'update-status', 'delete']),
  id: optionalRecordId,
  employeeId: z.coerce.number().int().positive().optional(),
  trainingName: z.string().trim().max(200).optional().default(''),
  provider: z.string().trim().max(160).optional().default('-'),
  completedYear: z.coerce
    .number()
    .int()
    .min(1900)
    .max(2100)
    .optional()
    .default(new Date().getFullYear()),
  expiresAt: z.string().trim().optional().default(''),
  status: z.string().trim().max(50).optional().default('active'),
})

const manageWellnessRecordSchema = z.object({
  intent: z.enum(['create', 'update', 'update-status', 'delete']),
  id: optionalRecordId,
  employeeId: z.coerce.number().int().positive().optional(),
  metricType: z.string().trim().max(120).optional().default('Fit for Work'),
  metricValue: z.string().trim().max(120).optional().default(''),
  status: z.string().trim().max(50).optional().default('healthy'),
  notes: z.string().trim().max(1000).optional().default(''),
  recordedAt: z.string().trim().optional().default(''),
})

const manageAttendanceRecordSchema = z.object({
  intent: z.enum(['create', 'update', 'update-status', 'delete']),
  id: optionalRecordId,
  employeeId: z.coerce.number().int().positive().optional(),
  siteId: z.coerce.number().int().positive().optional(),
  eventType: z.string().trim().max(80).optional().default('checked-in'),
  eventTime: z.string().trim().optional().default(''),
  status: z.string().trim().max(80).optional().default('verified'),
  locationNote: z.string().trim().max(1000).optional().default(''),
  photoUrl: z.string().trim().max(1000).optional().default(''),
  latitude: z.string().trim().max(80).optional().default(''),
  longitude: z.string().trim().max(80).optional().default(''),
})

const manageTimesheetEntrySchema = z.object({
  intent: z.enum(['create', 'update', 'update-status', 'delete']),
  id: optionalRecordId,
  employeeId: z.coerce.number().int().positive().optional(),
  siteId: z.coerce.number().int().positive().optional(),
  periodLabel: z.string().trim().max(160).optional().default(''),
  regularMinutes: z.coerce.number().int().min(0).max(43200).optional().default(0),
  overtimeMinutes: z.coerce.number().int().min(0).max(43200).optional().default(0),
  overtimeAmount: z.coerce.number().int().min(0).max(1_000_000_000).optional().default(0),
  status: z.string().trim().max(50).optional().default('pending'),
})

const manageDailyReportSchema = z.object({
  intent: z.enum(['create', 'update', 'update-status', 'delete']),
  id: optionalRecordId,
  siteId: z.coerce.number().int().positive().optional(),
  reportDate: z.string().trim().optional().default(''),
  customerName: z.string().trim().max(200).optional().default(''),
  totalSections: z.coerce.number().int().min(1).max(50).optional().default(4),
  readySections: z.coerce.number().int().min(0).max(50).optional().default(0),
  jobsCompleted: z.coerce.number().int().min(0).max(10000).optional().default(0),
  manpowerPresent: z.coerce.number().int().min(0).max(10000).optional().default(0),
  hseSummary: z.string().trim().max(1000).optional().default(''),
  status: z.string().trim().max(50).optional().default('draft'),
})

const managePointEventSchema = z.object({
  intent: z.enum(['create', 'update', 'delete']),
  id: optionalRecordId,
  employeeId: z.coerce.number().int().positive().optional(),
  category: z.string().trim().max(120).optional().default('Manual Adjustment'),
  label: z.string().trim().max(200).optional().default(''),
  points: z.coerce.number().int().min(-10000).max(10000).optional().default(0),
})

function parseDateTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw new Error('Activity date is invalid.')
  }

  return date
}

function getPointsForPriority(priority: string) {
  switch (priority.toLowerCase()) {
    case 'emergency':
      return 20
    case 'safety':
      return 10
    default:
      return 5
  }
}

function getPeriodLabel(date: Date) {
  const month = date.toLocaleString('en-US', { month: 'long' })
  const week = Math.max(1, Math.ceil(date.getDate() / 7))
  return `${month} ${date.getFullYear()} â€¢ Week ${week}`
}

function getPendingActivityStatus(level: number) {
  if (level > 0) {
    return `Pending L${level}`
  }

  return 'Pending Approval'
}

function getRouteStepGroup(steps: ResolvedApprovalStep[], stepOrder: number) {
  return steps.filter((step) => step.stepOrder === stepOrder)
}

function getNextRouteStepGroup(steps: ResolvedApprovalStep[], currentStepOrder: number) {
  const nextStepOrder =
    steps
      .map((step) => step.stepOrder)
      .filter((stepOrder) => stepOrder > currentStepOrder)
      .sort((left, right) => left - right)[0] ?? null

  return nextStepOrder == null ? [] : getRouteStepGroup(steps, nextStepOrder)
}

async function createPendingApprovalsForStepGroup(params: {
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
  activityId: number
  stepGroup: ResolvedApprovalStep[]
  approvalRoute: ApprovalRouteResolution
  submittedAt: Date
  overtimeMinutes: number
}) {
  if (params.stepGroup.length === 0) {
    return
  }

  const existingApprovals = await params.tx
    .select({
      id: approvals.id,
      level: approvals.level,
      approvalStepId: approvals.approvalStepId,
    })
    .from(approvals)
    .where(
      and(
        eq(approvals.activityId, params.activityId),
        eq(approvals.level, params.stepGroup[0].stepOrder)
      )
    )

  const existingStepIds = new Set(
    existingApprovals.map((row) => `${row.level}:${row.approvalStepId ?? 'none'}`)
  )

  const rowsToInsert = params.stepGroup
    .filter(
      (step) => !existingStepIds.has(`${step.stepOrder}:${step.approvalMatrixStepId ?? 'none'}`)
    )
    .map((step) => ({
      activityId: params.activityId,
      level: step.stepOrder,
      approverName: step.approverName,
      approverEmployeeId: step.approverEmployeeId,
      approverNodeId: step.approverNodeId,
      approvalMatrixId: params.approvalRoute.matrixId,
      approvalStepId: step.approvalMatrixStepId,
      status: 'pending',
      submittedAt: params.submittedAt,
      overtimeMinutes: params.overtimeMinutes,
      resolutionSource: step.resolutionSource,
      routeSnapshot: serializeApprovalRoute(params.approvalRoute),
    }))

  if (rowsToInsert.length > 0) {
    await params.tx.insert(approvals).values(rowsToInsert)
  }
}

function parseApprovalRouteSnapshot(routeSnapshot: string) {
  const trimmedSnapshot = routeSnapshot.trim()

  if (!trimmedSnapshot) {
    return null
  }

  try {
    return JSON.parse(trimmedSnapshot) as ApprovalRouteResolution
  } catch {
    return null
  }
}

async function applyApprovalDecision(params: {
  approvalId: number
  decision: 'approved' | 'rejected' | 'needs_correction'
  note: string
}) {
  const trimmedNote = params.note.trim()

  if (params.decision === 'rejected' && !trimmedNote) {
    throw new Error('Rejection comment is required.')
  }

  const [approval] = await db
    .select({
      approvalId: approvals.id,
      level: approvals.level,
      status: approvals.status,
      approverName: approvals.approverName,
      approvalStepId: approvals.approvalStepId,
      routeSnapshot: approvals.routeSnapshot,
      decisionNote: approvals.decisionNote,
      overtimeMinutes: approvals.overtimeMinutes,
      activityId: activities.id,
      activityTitle: activities.title,
      activityType: activities.activityType,
      priority: activities.priority,
      startTime: activities.startTime,
      endTime: activities.endTime,
      submissionTime: activities.submissionTime,
      pointsAwarded: activities.pointsAwarded,
      penaltyDeducted: activities.penaltyDeducted,
      employeeId: activities.employeeId,
      siteId: activities.siteId,
    })
    .from(approvals)
    .innerJoin(activities, eq(approvals.activityId, activities.id))
    .where(eq(approvals.id, params.approvalId))
    .limit(1)

  if (!approval) {
    throw new Error('Approval not found.')
  }

  if (approval.status !== 'pending') {
    return false
  }

  const now = new Date()
  const approvalRoute = parseApprovalRouteSnapshot(approval.routeSnapshot)
  const currentStepIndex =
    approvalRoute?.steps.findIndex(
      (step) =>
        step.stepOrder === approval.level &&
        (approval.approvalStepId == null || step.approvalMatrixStepId === approval.approvalStepId)
    ) ?? -1
  const currentStep =
    approvalRoute != null && currentStepIndex >= 0
      ? (approvalRoute.steps[currentStepIndex] ?? null)
      : null
  const currentStepGroup =
    approvalRoute != null && currentStep != null
      ? getRouteStepGroup(approvalRoute.steps, currentStep.stepOrder)
      : []
  const nextStepGroup =
    approvalRoute != null && currentStep != null
      ? getNextRouteStepGroup(approvalRoute.steps, currentStep.stepOrder)
      : []

  await db.transaction(async (tx) => {
    const defaultDecisionMessage =
      params.decision === 'approved'
        ? 'Approval diteruskan sesuai workflow.'
        : params.decision === 'rejected'
          ? 'Request ditolak pada step ini.'
          : 'Request dikembalikan untuk revisi.'

    await tx
      .update(approvals)
      .set({
        status: params.decision,
        reviewedAt: now,
        decisionNote: appendApprovalNoteEntry(approval.decisionNote, {
          kind: params.decision,
          actor: approval.approverName,
          message: trimmedNote || defaultDecisionMessage,
          at: now.toISOString(),
        }),
      })
      .where(eq(approvals.id, approval.approvalId))

    if (params.decision === 'needs_correction') {
      if (currentStepGroup.length > 1) {
        await tx
          .update(approvals)
          .set({
            status: 'skipped',
            reviewedAt: now,
          })
          .where(
            and(
              eq(approvals.activityId, approval.activityId),
              eq(approvals.level, approval.level),
              eq(approvals.status, 'pending')
            )
          )
      }

      await tx
        .update(activities)
        .set({
          status: 'Needs Correction',
        })
        .where(eq(activities.id, approval.activityId))

      return
    }

    if (params.decision === 'rejected') {
      if (currentStepGroup.length > 1) {
        await tx
          .update(approvals)
          .set({
            status: 'skipped',
            reviewedAt: now,
          })
          .where(
            and(
              eq(approvals.activityId, approval.activityId),
              eq(approvals.level, approval.level),
              eq(approvals.status, 'pending')
            )
          )
      }

      await tx
        .update(activities)
        .set({
          status: 'Rejected',
        })
        .where(eq(activities.id, approval.activityId))

      return
    }

    if (
      currentStep != null &&
      normalizeLookupValue(currentStep.approvalMode) !== 'parallel_any' &&
      normalizeLookupValue(currentStep.approvalMode) !== 'any_one'
    ) {
      const sameLevelApprovals = await tx
        .select({
          id: approvals.id,
          status: approvals.status,
        })
        .from(approvals)
        .where(
          and(eq(approvals.activityId, approval.activityId), eq(approvals.level, approval.level))
        )

      if (sameLevelApprovals.some((row) => row.status === 'pending')) {
        await tx
          .update(activities)
          .set({
            status: getPendingActivityStatus(approval.level),
          })
          .where(eq(activities.id, approval.activityId))

        return
      }
    }

    if (
      currentStep != null &&
      (normalizeLookupValue(currentStep.approvalMode) === 'parallel_any' ||
        normalizeLookupValue(currentStep.approvalMode) === 'any_one')
    ) {
      await tx
        .update(approvals)
        .set({
          status: 'skipped',
          reviewedAt: now,
          decisionNote: appendApprovalNoteEntry('', {
            kind: 'system',
            actor: approval.approverName,
            message: 'Step parallel-any diselesaikan oleh approver lain pada level yang sama.',
            at: now.toISOString(),
          }),
        })
        .where(
          and(
            eq(approvals.activityId, approval.activityId),
            eq(approvals.level, approval.level),
            eq(approvals.status, 'pending')
          )
        )
    }

    if (nextStepGroup.length > 0 && approvalRoute != null) {
      await createPendingApprovalsForStepGroup({
        tx,
        activityId: approval.activityId,
        stepGroup: nextStepGroup,
        approvalRoute,
        submittedAt: now,
        overtimeMinutes: approval.overtimeMinutes,
      })

      await tx
        .update(activities)
        .set({
          status: getPendingActivityStatus(nextStepGroup[0].stepOrder),
        })
        .where(eq(activities.id, approval.activityId))

      return
    }

    if (approvalRoute == null || currentStepIndex < 0) {
      const fallbackRoute = await resolveApprovalRouteForActivity({
        employeeId: approval.employeeId,
        activityType: approval.activityType,
        priority: approval.priority,
        overtimeMinutes: approval.overtimeMinutes,
        transactionType: 'activity',
        at: approval.endTime,
      })
      const fallbackNextStep = fallbackRoute.steps.find((step) => step.stepOrder > approval.level)

      if (fallbackNextStep) {
        const fallbackNextGroup = getRouteStepGroup(fallbackRoute.steps, fallbackNextStep.stepOrder)
        await createPendingApprovalsForStepGroup({
          tx,
          activityId: approval.activityId,
          stepGroup: fallbackNextGroup,
          approvalRoute: fallbackRoute,
          submittedAt: now,
          overtimeMinutes: approval.overtimeMinutes,
        })

        await tx
          .update(activities)
          .set({
            status: getPendingActivityStatus(fallbackNextStep.stepOrder),
          })
          .where(eq(activities.id, approval.activityId))

        return
      }
    }

    const durationMinutes = Math.max(
      0,
      Math.round((approval.endTime.getTime() - approval.startTime.getTime()) / 60000)
    )
    const regularMinutes = Math.max(0, durationMinutes - approval.overtimeMinutes)
    const overtimeRate = 70000
    const periodLabel = getPeriodLabel(approval.endTime)

    const [existingTimesheet] = await tx
      .select({
        id: timesheetEntries.id,
        regularMinutes: timesheetEntries.regularMinutes,
        overtimeMinutes: timesheetEntries.overtimeMinutes,
        overtimeAmount: timesheetEntries.overtimeAmount,
      })
      .from(timesheetEntries)
      .where(
        and(
          eq(timesheetEntries.employeeId, approval.employeeId),
          eq(timesheetEntries.siteId, approval.siteId),
          eq(timesheetEntries.periodLabel, periodLabel)
        )
      )
      .limit(1)

    if (existingTimesheet) {
      await tx
        .update(timesheetEntries)
        .set({
          regularMinutes: existingTimesheet.regularMinutes + regularMinutes,
          overtimeMinutes: existingTimesheet.overtimeMinutes + approval.overtimeMinutes,
          overtimeAmount:
            existingTimesheet.overtimeAmount +
            Math.round((approval.overtimeMinutes / 60) * overtimeRate),
          status: 'ready_for_payroll',
          updatedAt: now,
        })
        .where(eq(timesheetEntries.id, existingTimesheet.id))
    } else {
      await tx.insert(timesheetEntries).values({
        employeeId: approval.employeeId,
        siteId: approval.siteId,
        periodLabel,
        regularMinutes,
        overtimeMinutes: approval.overtimeMinutes,
        overtimeAmount: Math.round((approval.overtimeMinutes / 60) * overtimeRate),
        status: 'ready_for_payroll',
        updatedAt: now,
      })
    }

    if (approval.submissionTime != null) {
      const [existingAwardEvent] = await tx
        .select({ id: pointEvents.id })
        .from(pointEvents)
        .where(
          and(eq(pointEvents.sourceType, 'activity'), eq(pointEvents.sourceId, approval.activityId))
        )
        .limit(1)

      if (!existingAwardEvent) {
        const netPoints = approval.pointsAwarded - approval.penaltyDeducted
        const [employeePointState] = await tx
          .select({
            totalPoints: employees.totalPoints,
          })
          .from(employees)
          .where(eq(employees.id, approval.employeeId))
          .limit(1)

        if (employeePointState) {
          const updatedBalance = Math.max(0, employeePointState.totalPoints + netPoints)

          await tx.insert(pointEvents).values({
            employeeId: approval.employeeId,
            transactionType: netPoints >= 0 ? 'reward' : 'penalty',
            sourceType: 'activity',
            sourceId: approval.activityId,
            category: 'Daily Activity Approval',
            label: `${approval.activityTitle} â€¢ Approved`,
            points: netPoints,
            balanceAfter: updatedBalance,
            metadata: JSON.stringify({
              approvalId: approval.approvalId,
              approvalLevel: approval.level,
              penaltyDeducted: approval.penaltyDeducted,
            }),
            createdAt: now,
          })

          await tx
            .update(employees)
            .set({
              totalPoints: updatedBalance,
            })
            .where(eq(employees.id, approval.employeeId))

          await evaluatePointThresholdBadges(tx, approval.employeeId, updatedBalance)
        }
      }
    }

    await tx
      .update(activities)
      .set({
        status: 'Approved',
      })
      .where(eq(activities.id, approval.activityId))
  })

  await syncActivityWorkflowArtifacts(approval.activityId)
  await runApprovalAutomationTick()

  return true
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function parseJoinYear(value: string) {
  const digits = value.replace(/\D/g, '')
  const parsed = Number.parseInt(digits, 10)

  if (Number.isNaN(parsed) || parsed < 1980 || parsed > 2100) {
    return new Date().getFullYear()
  }

  return parsed
}

function normalizeEmploymentStatus(value: string) {
  const normalized = value.trim().toLowerCase()

  if (!normalized) {
    return { status: 'active', isActive: true }
  }

  if (
    normalized.includes('inactive') ||
    normalized.includes('nonaktif') ||
    normalized.includes('suspend') ||
    normalized.includes('resign')
  ) {
    return {
      status: normalized.includes('resign') ? 'resigned' : 'inactive',
      isActive: false,
    }
  }

  if (normalized.includes('probation')) {
    return { status: 'probation', isActive: true }
  }

  if (normalized.includes('cuti') || normalized.includes('leave')) {
    return { status: 'on_leave', isActive: true }
  }

  if (normalized.includes('contract') || normalized.includes('kontrak')) {
    return { status: 'contract', isActive: true }
  }

  return { status: normalized.replace(/\s+/g, '_'), isActive: true }
}

function parseOptionalManagerId(value: string | undefined) {
  if (!value || value === 'none') {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function normalizeLookupValue(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function extractActivitySupplementalPayload(formData: FormData) {
  const checklistCompletion = formData
    .getAll('checklistCompletion')
    .map((value) => `${value}`.trim())
    .filter(Boolean)
  const additionalWatchers = formData
    .getAll('additionalWatchers')
    .map((value) => `${value}`.trim())
    .filter(Boolean)

  return {
    workDate: `${formData.get('workDate') ?? ''}`.trim(),
    shift: `${formData.get('shift') ?? ''}`.trim(),
    riskCategory: `${formData.get('riskCategory') ?? ''}`.trim(),
    referenceCode: `${formData.get('referenceCode') ?? ''}`.trim(),
    manpowerInvolved: `${formData.get('manpowerInvolved') ?? ''}`.trim(),
    checklistCompletion,
    department: `${formData.get('department') ?? ''}`.trim(),
    section: `${formData.get('section') ?? ''}`.trim(),
    photoAttachmentUrl: `${formData.get('photoAttachmentUrl') ?? ''}`.trim(),
    documentAttachmentUrl: `${formData.get('documentAttachmentUrl') ?? ''}`.trim(),
    signatureName: `${formData.get('signatureName') ?? ''}`.trim(),
    latitude: `${formData.get('latitude') ?? ''}`.trim(),
    longitude: `${formData.get('longitude') ?? ''}`.trim(),
    additionalWatchers,
  }
}

async function resolveEmployeeGovernanceIds(params: {
  department: string
  section: string
  jobTitle: string
}) {
  const [departments, sections, positions] = await Promise.all([
    db.select({ id: masterDepartments.id, name: masterDepartments.name }).from(masterDepartments),
    db
      .select({
        id: masterSections.id,
        name: masterSections.name,
        departmentId: masterSections.departmentId,
      })
      .from(masterSections),
    db
      .select({
        id: masterPositions.id,
        name: masterPositions.name,
        departmentId: masterPositions.departmentId,
      })
      .from(masterPositions),
  ])

  const department =
    departments.find(
      (item) => normalizeLookupValue(item.name) === normalizeLookupValue(params.department)
    ) ?? null
  const section =
    sections.find(
      (item) =>
        normalizeLookupValue(item.name) === normalizeLookupValue(params.section) &&
        (department?.id == null || item.departmentId === department.id)
    ) ?? null
  const position =
    positions.find(
      (item) =>
        normalizeLookupValue(item.name) === normalizeLookupValue(params.jobTitle) &&
        (department?.id == null || item.departmentId === department.id)
    ) ?? null

  return {
    departmentId: department?.id ?? null,
    sectionId: section?.id ?? null,
    positionId: position?.id ?? null,
  }
}

async function resolveDefaultOrgNodeId(positionId: number | null) {
  if (positionId == null) {
    return null
  }

  const [node] = await db
    .select({ id: orgChartNodes.id })
    .from(orgChartNodes)
    .leftJoin(orgChartStructures, eq(orgChartNodes.structureId, orgChartStructures.id))
    .where(eq(orgChartNodes.positionId, positionId))
    .orderBy(desc(orgChartStructures.isDefault), asc(orgChartNodes.id))
    .limit(1)

  return node?.id ?? null
}

async function resolveHrEmployeeGovernanceIds(params: {
  department: string
  section: string
  jobTitle: string
  siteId: number | null
  statusName?: string
}) {
  const [departments, sections, positions, orgNodes, statuses] = await Promise.all([
    db.select({ id: hrDepartments.id, name: hrDepartments.name }).from(hrDepartments),
    db
      .select({ id: hrSections.id, name: hrSections.name, departmentId: hrSections.departmentId })
      .from(hrSections),
    db.select({ id: hrPositions.id, name: hrPositions.rankName }).from(hrPositions),
    db
      .select({
        id: hrOrgNodes.id,
        departmentId: hrOrgNodes.departmentId,
        sectionId: hrOrgNodes.sectionId,
        siteId: hrOrgNodes.siteId,
      })
      .from(hrOrgNodes),
    db
      .select({ code: hrEmployeeStatuses.code, name: hrEmployeeStatuses.name })
      .from(hrEmployeeStatuses),
  ])

  const department =
    departments.find(
      (item) => normalizeLookupValue(item.name) === normalizeLookupValue(params.department)
    ) ?? null
  const section =
    sections.find(
      (item) =>
        normalizeLookupValue(item.name) === normalizeLookupValue(params.section) &&
        (department?.id == null || item.departmentId === department.id)
    ) ?? null
  const position =
    positions.find(
      (item) => normalizeLookupValue(item.name) === normalizeLookupValue(params.jobTitle)
    ) ?? null
  const orgNode =
    orgNodes.find(
      (item) =>
        (params.siteId == null || item.siteId === params.siteId) &&
        (section?.id == null || item.sectionId === section.id) &&
        (department?.id == null || item.departmentId === department.id)
    ) ?? null
  const status =
    statuses.find(
      (item) => normalizeLookupValue(item.name) === normalizeLookupValue(params.statusName)
    ) ??
    statuses.find(
      (item) => normalizeLookupValue(item.code) === normalizeLookupValue(params.statusName)
    ) ??
    statuses.find((item) => normalizeLookupValue(item.name).includes('permanen')) ??
    null

  return {
    departmentId: department?.id ?? null,
    sectionId: section?.id ?? null,
    positionId: position?.id ?? null,
    orgNodeId: orgNode?.id ?? null,
    demographicEmployeeStatusCode: status?.code ?? null,
  }
}

function parseJoinDateFromYear(value: string | undefined) {
  return `${parseJoinYear(value ?? '')}-01-01`
}

function parseRoleId(value: string | undefined) {
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function normalizeProfileImageValue(value: string | undefined) {
  const trimmedValue = value?.trim() ?? ''

  if (!trimmedValue) {
    return ''
  }

  if (trimmedValue.startsWith('data:image/')) {
    if (trimmedValue.length > 3_000_000) {
      throw new Error('Profile photo too large. Max 2MB.')
    }

    return trimmedValue
  }

  try {
    const parsedUrl = new URL(trimmedValue)

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('URL protocol is not supported.')
    }

    return parsedUrl.toString()
  } catch {
    throw new Error('Profile photo format is invalid.')
  }
}

function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase()
}

function buildDefaultUserManagementPassword(employeeSn: string | null | undefined) {
  const normalizedSn = (employeeSn ?? '').trim().replace(/^EMP-/i, '')
  return `Chitra#${normalizedSn}`
}

async function upsertCredentialAccount({
  authUserId,
  email,
  password,
  now,
  employeeSn,
}: {
  authUserId: string
  email: string
  password: string
  now: Date
  employeeSn?: string | null
}) {
  const normalizedEmail = normalizeAuthEmail(email)
  const passwordHash = await hashPassword(password)

  const upsertOne = async (accountId: string) => {
    const [existingCredential] = await db
      .select({ id: account.id })
      .from(account)
      .where(
        and(
          eq(account.providerId, 'credential'),
          or(
            eq(account.userId, authUserId),
            eq(account.accountId, accountId)
          )
        )
      )
      .limit(1)

    const credentialValues = {
      accountId,
      providerId: 'credential' as const,
      userId: authUserId,
      password: passwordHash,
      updatedAt: now,
    }

    if (existingCredential) {
      await db.update(account).set(credentialValues).where(eq(account.id, existingCredential.id))
    } else {
      await db.insert(account).values({
        id: randomUUID(),
        ...credentialValues,
        createdAt: now,
      })
    }
  }

  // Create credential for email login
  await upsertOne(normalizedEmail)

  // Create credential for SN login (supports login with SN as username)
  const normalizedSn = (employeeSn ?? '').trim()
  if (normalizedSn && normalizedSn !== normalizedEmail) {
    await upsertOne(normalizedSn)
  }
}

// ─── Bulk Provisioning Types & Helpers ───────────────────────────────────────

export interface BulkProvisionResult {
  success: boolean
  total: number
  created: number
  skipped: number
  failed: number
  failures: Array<{ employeeId: string; error: string }>
  interrupted: boolean
}

function determinePassword(employee: {
  emailPasswordMigration: string | null
  employeeId: string
}): string {
  const migration = employee.emailPasswordMigration?.trim()
  if (migration && migration.length > 0) return migration
  const normalizedSn = employee.employeeId.trim().replace(/^EMP-/i, '')
  return `Chitra#${normalizedSn}`
}

function isValidEmailFormat(email: string): boolean {
  const parts = email.split('@')
  if (parts.length !== 2) return false
  const [local, domain] = parts
  return local.length > 0 && domain.length > 0 && domain.includes('.')
}

export async function bulkProvisionAuthAccountsAction(): Promise<BulkProvisionResult> {
  // 1. Verify admin session
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return {
      success: false,
      total: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      failures: [],
      interrupted: false,
    }
  }

  // 2. Query eligible employees: email not null, not empty (trimmed), authUserId is null
  const eligibleEmployees = await db
    .select({
      id: hrEmployees.id,
      employeeId: hrEmployees.employeeId,
      fullName: hrEmployees.fullName,
      email: hrEmployees.email,
      emailPasswordMigration: hrEmployees.emailPasswordMigration,
      authUserId: hrEmployees.authUserId,
    })
    .from(hrEmployees)
    .where(
      and(
        isNotNull(hrEmployees.email),
        ne(sql`TRIM(${hrEmployees.email})`, ''),
        isNull(hrEmployees.authUserId)
      )
    )
    .orderBy(asc(hrEmployees.id))
    .limit(500)

  // 3. Return early if no eligible employees found
  if (eligibleEmployees.length === 0) {
    return {
      success: true,
      total: 0,
      created: 0,
      skipped: 0,
      failed: 0,
      failures: [],
      interrupted: false,
    }
  }

  // 4. Sequential processing loop with error isolation and circuit breaker
  let created = 0
  let skipped = 0
  let failed = 0
  const failures: Array<{ employeeId: string; error: string }> = []
  let interrupted = false
  let consecutiveFailures = 0

  for (const emp of eligibleEmployees) {
    // Circuit breaker: halt after 10 consecutive failures
    if (consecutiveFailures >= 10) {
      interrupted = true
      break
    }

    try {
      // Validate email format
      const email = emp.email!.trim()
      if (!isValidEmailFormat(email)) {
        failed++
        consecutiveFailures++
        failures.push({
          employeeId: emp.employeeId,
          error: 'Invalid email format',
        })
        continue
      }

      // Determine password
      const plainPassword = determinePassword({
        emailPasswordMigration: emp.emailPasswordMigration,
        employeeId: emp.employeeId,
      })

      // Hash password
      let hashedPassword: string
      try {
        hashedPassword = await hashPassword(plainPassword)
      } catch (hashErr) {
        failed++
        consecutiveFailures++
        failures.push({
          employeeId: emp.employeeId,
          error: `Password hashing failed: ${hashErr instanceof Error ? hashErr.message : String(hashErr)}`,
        })
        continue
      }

      // Create or find auth user
      const authUserId = randomUUID()
      const now = new Date()
      const normalizedEmail = normalizeAuthEmail(email)

      let finalAuthUserId: string
      let wasExistingUser = false

      // Try to find existing auth user by email
      const [existingAuthUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, normalizedEmail))
        .limit(1)

      if (existingAuthUser) {
        finalAuthUserId = existingAuthUser.id
        wasExistingUser = true
      } else {
        // Create new auth user
        try {
          await db.insert(user).values({
            id: authUserId,
            name: emp.fullName ?? normalizedEmail,
            email: normalizedEmail,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
          })
          finalAuthUserId = authUserId
        } catch (insertErr: any) {
          // Handle unique constraint violation — retrieve existing user
          if (
            insertErr?.code === '23505' ||
            insertErr?.message?.includes('unique') ||
            insertErr?.message?.includes('duplicate')
          ) {
            const [conflictUser] = await db
              .select({ id: user.id })
              .from(user)
              .where(eq(user.email, normalizedEmail))
              .limit(1)

            if (conflictUser) {
              finalAuthUserId = conflictUser.id
              wasExistingUser = true
            } else {
              failed++
              consecutiveFailures++
              failures.push({
                employeeId: emp.employeeId,
                error: `Auth user creation failed: unique constraint but user not found`,
              })
              continue
            }
          } else {
            // Check for connection errors
            if (isConnectionError(insertErr)) {
              interrupted = true
              failed++
              failures.push({
                employeeId: emp.employeeId,
                error: `Database connection error: ${insertErr.message}`,
              })
              break
            }
            failed++
            consecutiveFailures++
            failures.push({
              employeeId: emp.employeeId,
              error: `Auth user creation failed: ${insertErr instanceof Error ? insertErr.message : String(insertErr)}`,
            })
            continue
          }
        }
      }

      // Upsert credential account
      try {
        await upsertCredentialAccount({
          authUserId: finalAuthUserId,
          email: normalizedEmail,
          password: plainPassword,
          now: new Date(),
          employeeSn: emp.employeeId,
        })
      } catch (credErr: any) {
        if (isConnectionError(credErr)) {
          interrupted = true
          failed++
          failures.push({
            employeeId: emp.employeeId,
            error: `Database connection error: ${credErr.message}`,
          })
          break
        }
        failed++
        consecutiveFailures++
        failures.push({
          employeeId: emp.employeeId,
          error: `Credential account creation failed: ${credErr instanceof Error ? credErr.message : String(credErr)}`,
        })
        continue
      }

      // Update employee authUserId
      try {
        await db
          .update(hrEmployees)
          .set({ authUserId: finalAuthUserId })
          .where(eq(hrEmployees.id, emp.id))
      } catch (linkErr: any) {
        if (isConnectionError(linkErr)) {
          interrupted = true
          failed++
          failures.push({
            employeeId: emp.employeeId,
            error: `Database connection error: ${linkErr.message}`,
          })
          break
        }
        // Record failure but do NOT rollback auth records (per design)
        failed++
        consecutiveFailures++
        failures.push({
          employeeId: emp.employeeId,
          error: `Employee link update failed: ${linkErr instanceof Error ? linkErr.message : String(linkErr)}`,
        })
        continue
      }

      // Success — increment appropriate counter and reset circuit breaker
      if (wasExistingUser) {
        skipped++
      } else {
        created++
      }
      consecutiveFailures = 0
    } catch (unexpectedErr: any) {
      // Catch-all for unexpected errors
      if (isConnectionError(unexpectedErr)) {
        interrupted = true
        failed++
        failures.push({
          employeeId: emp.employeeId,
          error: `Database connection error: ${unexpectedErr.message}`,
        })
        break
      }
      failed++
      consecutiveFailures++
      failures.push({
        employeeId: emp.employeeId,
        error: `Unexpected error: ${unexpectedErr instanceof Error ? unexpectedErr.message : String(unexpectedErr)}`,
      })
    }
  }

  // 5. Audit log: record admin trigger with summary
  await logAuditEvent({
    actorEmail: session.user.email,
    action: 'user.bulk_auth_provisioned',
    entityType: 'auth_accounts',
    entityLabel: 'bulk-provision',
    description: `Bulk provisioned auth accounts: ${created} created, ${skipped} skipped, ${failed} failed.`,
  })

  return {
    success: !interrupted,
    total: created + skipped + failed,
    created,
    skipped,
    failed,
    failures,
    interrupted,
  }
}

/** Check if an error is a database connection error */
function isConnectionError(err: any): boolean {
  if (!err) return false
  const msg = (err.message || '').toLowerCase()
  const code = err.code || ''
  return (
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    (msg.includes('connection') && msg.includes('terminat')) ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === '57P01' || // admin shutdown
    code === '57P03' // cannot connect now
  )
}

// ─────────────────────────────────────────────────────────────────────────────

async function ensureAuthUserForHrEmployee(employee: {
  id: number
  authUserId: string | null
  name: string
  email: string
}) {
  if (employee.authUserId) {
    await db
      .update(user)
      .set({ name: employee.name, email: employee.email, updatedAt: new Date() })
      .where(eq(user.id, employee.authUserId))
    return employee.authUserId
  }

  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, employee.email))
    .limit(1)

  if (existingUser) {
    await db
      .update(user)
      .set({ name: employee.name, updatedAt: new Date() })
      .where(eq(user.id, existingUser.id))
    await db
      .update(hrEmployees)
      .set({ authUserId: existingUser.id })
      .where(eq(hrEmployees.id, employee.id))
    return existingUser.id
  }

  const authUserId = randomUUID()
  const now = new Date()

  await db.insert(user).values({
    id: authUserId,
    name: employee.name,
    email: employee.email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  await db.update(hrEmployees).set({ authUserId }).where(eq(hrEmployees.id, employee.id))
  return authUserId
}

async function ensureAuthUserForEmployee(employee: {
  id: number
  authUserId: string | null
  name: string
  email: string
}) {
  if (employee.authUserId) {
    await db
      .update(user)
      .set({
        name: employee.name,
        email: employee.email,
        updatedAt: new Date(),
      })
      .where(eq(user.id, employee.authUserId))

    return employee.authUserId
  }

  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, employee.email))
    .limit(1)

  if (existingUser) {
    await db
      .update(user)
      .set({
        name: employee.name,
        updatedAt: new Date(),
      })
      .where(eq(user.id, existingUser.id))

    await db
      .update(employees)
      .set({ authUserId: existingUser.id })
      .where(eq(employees.id, employee.id))

    return existingUser.id
  }

  const authUserId = randomUUID()
  const now = new Date()

  await db.insert(user).values({
    id: authUserId,
    name: employee.name,
    email: employee.email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })

  await db.update(employees).set({ authUserId }).where(eq(employees.id, employee.id))

  return authUserId
}

function revalidateAdminSurfaces() {
  const paths = [
    '/dashboard/analytics',
    '/dashboard/activity-hub/my-day',
    '/dashboard/activity-hub/team-board',
    '/dashboard/approval',
    '/dashboard/request-center',
    '/dashboard/form-studio',
    '/dashboard/workflow-studio',
    '/dashboard/notifications',
    '/dashboard/timesheet',
    '/dashboard/reports',
    '/dashboard/leaderboard',
    '/dashboard/security',
    '/dashboard/security/users',
    '/mobile',
    '/mobile/dashboard',
    '/mobile/activity',
    '/mobile/approval',
  ]

  for (const path of paths) {
    revalidatePath(path)
  }
}

export async function createActivityAction(formData: FormData) {
  await ensureHeroSeedData()

  const supplementalPayload = extractActivitySupplementalPayload(formData)
  const payload = createActivitySchema.parse({
    employeeId: formData.get('employeeId'),
    activityCode: formData.get('activityCode'),
    activityType: formData.get('activityType'),
    title: formData.get('title'),
    unitNumber: formData.get('unitNumber'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    priority: formData.get('priority'),
    overtimeMinutes: formData.get('overtimeMinutes'),
    remarks: formData.get('remarks'),
  })

  const startTime = parseDateTime(payload.startTime)
  const endTime = parseDateTime(payload.endTime)

  if (endTime <= startTime) {
    throw new Error('End time must be greater than start time.')
  }

  const [employee] = await db
    .select({
      id: employees.id,
      siteId: employees.siteId,
      name: employees.name,
      totalPoints: employees.totalPoints,
    })
    .from(employees)
    .where(eq(employees.id, payload.employeeId))
    .limit(1)

  if (!employee) {
    throw new Error('Employee not found.')
  }

  const approvalRoute = await resolveApprovalRouteForActivity({
    employeeId: employee.id,
    activityType: payload.activityType,
    priority: payload.priority,
    overtimeMinutes: payload.overtimeMinutes,
    transactionType: 'activity',
    at: endTime,
  })
  const firstStep = approvalRoute.steps[0]

  if (!firstStep) {
    throw new Error('Approval route for this activity not found.')
  }
  const firstGroup = getRouteStepGroup(approvalRoute.steps, firstStep.stepOrder)

  const points = getPointsForPriority(payload.priority)
  let createdActivityId: number | null = null

  await db.transaction(async (tx) => {
    const [activity] = await tx
      .insert(activities)
      .values({
        siteId: employee.siteId,
        employeeId: employee.id,
        activityCode: payload.activityCode.toUpperCase(),
        activityType: payload.activityType,
        title: payload.title,
        unitNumber: payload.unitNumber,
        startTime,
        endTime,
        status: getPendingActivityStatus(firstStep.stepOrder),
        priority: payload.priority,
        remarks: payload.remarks,
        pointsAwarded: points,
      })
      .returning({ id: activities.id })
    createdActivityId = activity.id

    await createPendingApprovalsForStepGroup({
      tx,
      activityId: activity.id,
      stepGroup: firstGroup,
      approvalRoute,
      submittedAt: endTime,
      overtimeMinutes: payload.overtimeMinutes,
    })

    await tx.insert(pointEvents).values({
      employeeId: employee.id,
      category: 'Activity Input',
      label: `${payload.activityType} â€¢ ${payload.unitNumber}`,
      points,
    })

    await tx
      .update(employees)
      .set({
        totalPoints: employee.totalPoints + points,
      })
      .where(eq(employees.id, employee.id))
  })

  if (createdActivityId != null) {
    await syncActivityWorkflowArtifacts(createdActivityId, supplementalPayload)
  }

  revalidateAdminSurfaces()
}

export async function saveActivityDraftAction(formData: FormData) {
  await ensureHeroSeedData()

  const payload = saveActivityDraftSchema.parse({
    employeeId: formData.get('employeeId'),
    activityCode: formData.get('activityCode'),
    activityType: formData.get('activityType'),
    title: formData.get('title'),
    unitNumber: formData.get('unitNumber'),
    startTime: formData.get('startTime'),
    endTime: formData.get('endTime'),
    priority: formData.get('priority'),
    overtimeMinutes: formData.get('overtimeMinutes'),
    remarks: formData.get('remarks'),
  })

  await saveActivityDraftSubmission({
    ...payload,
    supplementalPayload: extractActivitySupplementalPayload(formData),
  })

  revalidateAdminSurfaces()
}

export async function reviewApprovalAction(formData: FormData) {
  await ensureHeroSeedData()

  const payload = reviewApprovalSchema.parse({
    approvalId: formData.get('approvalId'),
    decision: formData.get('decision'),
    note: formData.get('note'),
  })
  await applyApprovalDecision({
    approvalId: payload.approvalId,
    decision: payload.decision,
    note: payload.note,
  })

  revalidateAdminSurfaces()
}

export async function approveApprovalGroupAction(formData: FormData) {
  await ensureHeroSeedData()

  const payload = bulkApproveApprovalSchema.parse({
    approvalIds: formData.getAll('approvalIds'),
    note: formData.get('note'),
  })

  for (const approvalId of payload.approvalIds) {
    await applyApprovalDecision({
      approvalId,
      decision: 'approved',
      note: payload.note,
    })
  }

  revalidateAdminSurfaces()
}

export async function addApprovalCommentAction(formData: FormData) {
  await ensureHeroSeedData()

  const payload = approvalCommentSchema.parse({
    approvalId: formData.get('approvalId'),
    comment: formData.get('comment'),
  })

  const [approval] = await db
    .select({
      id: approvals.id,
      approverName: approvals.approverName,
      decisionNote: approvals.decisionNote,
    })
    .from(approvals)
    .where(eq(approvals.id, payload.approvalId))
    .limit(1)

  if (!approval) {
    throw new Error('Approval not found to add comment.')
  }

  await db
    .update(approvals)
    .set({
      decisionNote: appendApprovalNoteEntry(approval.decisionNote, {
        kind: 'comment',
        actor: approval.approverName,
        message: payload.comment,
      }),
    })
    .where(eq(approvals.id, approval.id))

  const [activityApproval] = await db
    .select({ activityId: approvals.activityId })
    .from(approvals)
    .where(eq(approvals.id, approval.id))
    .limit(1)

  if (activityApproval) {
    await syncActivityWorkflowArtifacts(activityApproval.activityId)
  }

  revalidateAdminSurfaces()
}

export async function cancelDraftSubmissionAction(formData: FormData) {
  await ensureHeroSeedData()

  const payload = cancelDraftSchema.parse({
    submissionId: formData.get('submissionId'),
  })

  await cancelFormSubmissionDraft(payload.submissionId)
  revalidateAdminSurfaces()
}

export async function createFormSectionAction(formData: FormData) {
  await ensureHeroSeedData()

  const payload = createFormSectionSchema.parse({
    versionId: formData.get('versionId'),
    label: formData.get('label'),
    description: formData.get('description'),
    isCollapsible: formData.get('isCollapsible'),
  })

  await createFormTemplateSection(payload)
  revalidateAdminSurfaces()
}

export async function createFormFieldAction(formData: FormData) {
  await ensureHeroSeedData()

  const payload = createFormFieldSchema.parse({
    versionId: formData.get('versionId'),
    sectionId: formData.get('sectionId'),
    label: formData.get('label'),
    fieldKey: formData.get('fieldKey'),
    fieldType: formData.get('fieldType'),
    placeholder: formData.get('placeholder'),
    helpText: formData.get('helpText'),
    defaultValue: formData.get('defaultValue'),
    isRequired: formData.get('isRequired'),
    optionLines: formData.get('optionLines'),
    validationRuleType: formData.get('validationRuleType'),
    validationOperator: formData.get('validationOperator'),
    validationValue: formData.get('validationValue'),
    validationMessage: formData.get('validationMessage'),
    allowedMimeTypes: formData.get('allowedMimeTypes'),
    maxSizeMb: formData.get('maxSizeMb'),
  })

  await createFormTemplateField(payload)
  revalidateAdminSurfaces()
}

export async function saveFormTemplateLayoutAction(formData: FormData) {
  await ensureHeroSeedData()

  const payload = saveFormLayoutSchema.parse({
    versionId: formData.get('versionId'),
    layoutJson: formData.get('layoutJson'),
  })
  const layout = z
    .object({
      sections: z.array(
        z.object({ id: z.number().int().positive(), sortOrder: z.number().int().positive() })
      ),
      fields: z.array(
        z.object({
          id: z.number().int().positive(),
          sectionId: z.number().int().positive().nullable(),
          sortOrder: z.number().int().positive(),
        })
      ),
    })
    .parse(JSON.parse(payload.layoutJson))

  await saveFormTemplateLayout({
    versionId: payload.versionId,
    sections: layout.sections,
    fields: layout.fields,
  })
  revalidateAdminSurfaces()
}

export async function publishFormTemplateVersionAction(formData: FormData) {
  await ensureHeroSeedData()

  const payload = formTemplateVersionSchema.parse({
    versionId: formData.get('versionId'),
  })

  await publishFormTemplateVersion(payload.versionId)
  revalidateAdminSurfaces()
}

export async function cloneFormTemplateVersionAction(formData: FormData) {
  await ensureHeroSeedData()

  const payload = formTemplateVersionSchema.parse({
    versionId: formData.get('versionId'),
  })

  await cloneFormTemplateVersion(payload.versionId)
  revalidateAdminSurfaces()
}

export async function createWorkflowConditionAction(formData: FormData) {
  await ensureHeroSeedData()

  const payload = createWorkflowConditionSchema.parse({
    workflowVersionId: formData.get('workflowVersionId'),
    parentConditionId: formData.get('parentConditionId'),
    fieldKey: formData.get('fieldKey'),
    operator: formData.get('operator'),
    compareValue: formData.get('compareValue'),
    logicalJoin: formData.get('logicalJoin'),
    groupLabel: formData.get('groupLabel'),
  })

  await createWorkflowCondition(payload)
  revalidateAdminSurfaces()
}

export async function runApprovalAutomationAction() {
  await ensureHeroSeedData()
  await runApprovalAutomationTick()
  revalidateAdminSurfaces()
}

export async function importSecurityUsersAction(
  _previousState: ImportUsersActionState,
  formData: FormData
): Promise<ImportUsersActionState> {
  try {
    await ensureHeroGovernanceSeedData()

    const payload = importUsersSchema.parse({
      rawCsv: formData.get('rawCsv'),
      mappingJson: formData.get('mappingJson'),
    })

    const mapping = JSON.parse(payload.mappingJson) as UserImportMapping
    const { records, headers } = parseCsvToRecords(payload.rawCsv)

    if (records.length === 0) {
      return { status: 'error', message: 'CSV has no data rows to import.' }
    }

    const [[defaultHrSite], [defaultLegacySite]] = await Promise.all([
      db.select().from(hrSites).limit(1),
      db.select().from(sites).limit(1),
    ])

    if (!defaultHrSite) {
      return { status: 'error', message: 'Site HR default belum tersedia untuk import user.' }
    }

    const existingEmployees = await db
      .select({
        id: hrEmployees.id,
        authUserId: hrEmployees.authUserId,
        employeeId: hrEmployees.employeeId,
        fullName: hrEmployees.fullName,
        email: hrEmployees.email,
      })
      .from(hrEmployees)
    const existingLegacyEmployees = await db
      .select({
        id: employees.id,
        authUserId: employees.authUserId,
        employeeSn: employees.employeeSn,
        email: employees.email,
      })
      .from(employees)
    const existingAuthUsers = await db.select({ id: user.id, email: user.email }).from(user)
    const authUserByEmail = new Map(
      existingAuthUsers.map((authUser) => [normalizeEmail(authUser.email), authUser])
    )
    const employeeByEmail = new Map(
      existingEmployees
        .filter((employee) => employee.email)
        .map((employee) => [normalizeEmail(employee.email ?? ''), employee])
    )
    const employeeBySn = new Map(
      existingEmployees.map((employee) => [normalizeLookupValue(employee.employeeId), employee])
    )
    const legacyByEmail = new Map(
      existingLegacyEmployees.map((employee) => [normalizeEmail(employee.email), employee])
    )
    const legacyBySn = new Map(
      existingLegacyEmployees.map((employee) => [
        normalizeLookupValue(employee.employeeSn),
        employee,
      ])
    )

    let importedCount = 0
    let updatedCount = 0
    let skippedCount = 0

    for (const record of records) {
      const fullName = getMappedValue(record, headers, mapping, 'fullName').trim()
      const employeeSn = getMappedValue(record, headers, mapping, 'employeeSn').trim()
      let email = normalizeEmail(getMappedValue(record, headers, mapping, 'email'))
      if (!email || !isValidEmailFormat(email)) {
        email = normalizeEmail(`${employeeSn}@chitraparatama.co.id`)
      }

      if (!fullName || !employeeSn) {
        skippedCount += 1
        continue
      }

      const department = getMappedValue(record, headers, mapping, 'department') || 'General'
      const section = getMappedValue(record, headers, mapping, 'section') || department
      const jobTitle = getMappedValue(record, headers, mapping, 'jobTitle') || 'Staff'
      const levelName = getMappedValue(record, headers, mapping, 'levelName') || 'Rookie'
      const workLocation = getMappedValue(record, headers, mapping, 'workLocation') || ''
      const accessRole = getMappedValue(record, headers, mapping, 'accessRole') || 'User'
      const employeeStatusType =
        getMappedValue(record, headers, mapping, 'employeeStatusType') || 'Permanen | Staff'
      const gender = getMappedValue(record, headers, mapping, 'gender')
      const religion = getMappedValue(record, headers, mapping, 'religion')
      const education = getMappedValue(record, headers, mapping, 'education')
      const maritalStatus = getMappedValue(record, headers, mapping, 'maritalStatus')
      const pointOfHire = getMappedValue(record, headers, mapping, 'pointOfHire')
      const joinDate = getMappedValue(record, headers, mapping, 'joinDate')
      const contractDurationStart = getMappedValue(record, headers, mapping, 'contractDurationStart')
      const contractDurationEnd = getMappedValue(record, headers, mapping, 'contractDurationEnd')
      const permanentDate = getMappedValue(record, headers, mapping, 'permanentDate')
      const birthDate = getMappedValue(record, headers, mapping, 'birthDate')

      const hrGovernanceIds = await resolveHrEmployeeGovernanceIds({
        department,
        section,
        jobTitle,
        siteId: defaultHrSite.id,
        statusName: employeeStatusType,
      })
      const legacyGovernanceIds = await resolveEmployeeGovernanceIds({
        department,
        section,
        jobTitle,
      })
      const existing =
        employeeBySn.get(normalizeLookupValue(employeeSn)) ?? employeeByEmail.get(email)
      const existingAuthUser = authUserByEmail.get(email)

      let linkedAuthUserId = existing?.authUserId ?? existingAuthUser?.id ?? null
      if (!linkedAuthUserId) {
        const password = buildDefaultUserManagementPassword(employeeSn)
        const newAuthUserId = randomUUID()
        await db.insert(user).values({
          id: newAuthUserId,
          name: fullName,
          email,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        await upsertCredentialAccount({
          authUserId: newAuthUserId,
          email,
          password,
          now: new Date(),
          employeeSn,
        })
        linkedAuthUserId = newAuthUserId
        authUserByEmail.set(email, { id: newAuthUserId, email })
      }

      const hrValues = {
        authUserId: linkedAuthUserId,
        employeeId: employeeSn,
        fullName,
        email,
        siteId: defaultHrSite.id,
        joinDate: joinDate || null,
        birthDate: birthDate || null,
        departmentId: hrGovernanceIds.departmentId,
        sectionId: hrGovernanceIds.sectionId,
        positionId: hrGovernanceIds.positionId,
        orgNodeId: hrGovernanceIds.orgNodeId,
        demographicEmployeeStatusCode: hrGovernanceIds.demographicEmployeeStatusCode,
        accountStatus: 'active',
        isActive: true,
        updatedAt: new Date(),
      }
      const legacyValues = {
        authUserId: linkedAuthUserId,
        siteId: defaultLegacySite?.id ?? 1,
        name: fullName,
        email,
        employeeSn,
        joinYear: joinDate ? new Date(joinDate).getFullYear() : new Date().getFullYear(),
        birthPlaceDate: birthDate || '',
        domicile: '',
        departmentId: legacyGovernanceIds.departmentId,
        sectionId: legacyGovernanceIds.sectionId,
        positionId: legacyGovernanceIds.positionId,
        orgNodeId: await resolveDefaultOrgNodeId(legacyGovernanceIds.positionId),
        gender: gender || '',
        religion: religion || '',
        education: education || '',
        maritalStatus: maritalStatus || '',
        pointOfHire: pointOfHire || '',
        joinDate: joinDate || null,
        contractDurationStart: contractDurationStart || null,
        contractDurationEnd: contractDurationEnd || null,
        permanentDate: permanentDate || null,
        birthDate: birthDate || null,
        section,
        department,
        role: jobTitle,
        jobTitle,
        levelName,
        accessRole,
        workLocation: workLocation || defaultHrSite.name,
        phoneNumber: '',
        employmentStatus: 'active',
        employeeStatusType,
        isActive: true,
      }

      if (existing) {
        await db.update(hrEmployees).set(hrValues).where(eq(hrEmployees.id, existing.id))
        updatedCount += 1
      } else {
        const [inserted] = await db
          .insert(hrEmployees)
          .values(hrValues)
          .returning({ id: hrEmployees.id })
        employeeBySn.set(normalizeLookupValue(employeeSn), {
          ...hrValues,
          id: inserted.id,
          authUserId: linkedAuthUserId,
        })
        importedCount += 1
      }

      const existingLegacy =
        legacyBySn.get(normalizeLookupValue(employeeSn)) ?? legacyByEmail.get(email)
      if (existingLegacy) {
        await db.update(employees).set(legacyValues).where(eq(employees.id, existingLegacy.id))
      } else if (defaultLegacySite) {
        await db.insert(employees).values({
          ...legacyValues,
          totalPoints: 0,
          fitStatus: 'fit',
        })
      }
    }

    const actorEmail = await getCurrentActorEmail()
    await logAuditEvent({
      actorEmail,
      action: 'user.bulk_imported',
      entityType: 'user_import',
      entityLabel: 'security_users_csv',
      description: `Imported ${importedCount} users, updated ${updatedCount}, skipped ${skippedCount}.`,
    })

    revalidateAdminSurfaces()

    return {
      status: 'success',
      message: 'User import processed successfully.',
      importedCount,
      updatedCount,
      skippedCount,
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'An issue occurred while importing users.',
    }
  }
}

export async function manageSecurityUserAction(
  _previousState: AdminMutationState,
  formData: FormData
): Promise<AdminMutationState> {
  try {
    await ensureHeroGovernanceSeedData()

    const payload = manageSecurityUserSchema.parse({
      intent: formData.get('intent'),
      employeeId: formData.get('employeeId'),
      siteId: formData.get('siteId'),
      fullName: formData.get('fullName'),
      employeeSn: formData.get('employeeSn'),
      profileImage: formData.get('profileImage'),
      joinYear: formData.get('joinYear'),
      birthPlaceDate: formData.get('birthPlaceDate'),
      domicile: formData.get('domicile'),
      directManagerId: formData.get('directManagerId'),
      section: formData.get('section'),
      department: formData.get('department'),
      jobTitle: formData.get('jobTitle'),
      workLocation: formData.get('workLocation'),
      phoneNumber: formData.get('phoneNumber'),
      email: formData.get('email'),
      employmentStatus: formData.get('employmentStatus'),
      accessRole: formData.get('accessRole'),
      password: formData.get('password'),
      newPassword: formData.get('newPassword'),
      employeeStatusType: formData.get('employeeStatusType'),
    })

    if (payload.intent === 'create-user') {
      const fullName = payload.fullName?.trim() ?? ''
      const email = normalizeEmail(payload.email ?? '')
      const employeeSn = payload.employeeSn?.trim() ?? ''
      const password = payload.password?.trim() || buildDefaultUserManagementPassword(employeeSn)
      const department = payload.department?.trim() || 'General'
      const section = payload.section?.trim() || department
      const jobTitle = payload.jobTitle?.trim() || 'Staff'
      const normalizedStatus = normalizeEmploymentStatus(payload.employmentStatus ?? 'active')
      const profileImage = normalizeProfileImageValue(payload.profileImage)

      if (!fullName || !email || !payload.accessRole) {
        return { status: 'error', message: 'Full name, email, and role are required.' }
      }

      if (!employeeSn) {
        return { status: 'error', message: 'SN is required for default password.' }
      }

      if (password.length < 8) {
        return { status: 'error', message: 'Initial password minimum 8 characters.' }
      }

      const [
        [currentDefaultSite],
        [selectedSite],
        [currentDefaultLegacySite],
        [existingHrEmployee],
        [existingLegacyEmployee],
        [existingAuthUser],
        [role],
      ] = await Promise.all([
        db.select().from(hrSites).limit(1),
        payload.siteId
          ? db.select().from(hrSites).where(eq(hrSites.id, payload.siteId)).limit(1)
          : Promise.resolve([]),
        db.select().from(sites).limit(1),
        db
          .select({ id: hrEmployees.id })
          .from(hrEmployees)
          .where(or(eq(hrEmployees.email, email), eq(hrEmployees.employeeId, employeeSn)))
          .limit(1),
        db
          .select({ id: employees.id })
          .from(employees)
          .where(or(eq(employees.email, email), eq(employees.employeeSn, employeeSn)))
          .limit(1),
        db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1),
        db.select().from(securityRoles).where(eq(securityRoles.name, payload.accessRole)).limit(1),
      ])

      if (existingHrEmployee || existingLegacyEmployee || existingAuthUser) {
        return { status: 'error', message: 'Email or SN is already used by another user.' }
      }

      if (!role) {
        return { status: 'error', message: 'Selected role is invalid.' }
      }

      const defaultSite = selectedSite ?? currentDefaultSite
      if (!defaultSite) {
        return { status: 'error', message: 'Site HR default belum tersedia.' }
      }

      const authUserId = randomUUID()
      const now = new Date()
      const hrGovernanceIds = await resolveHrEmployeeGovernanceIds({
        department,
        section,
        jobTitle,
        siteId: defaultSite.id,
        statusName: payload.employeeStatusType ?? normalizedStatus.status,
      })
      const legacyGovernanceIds = await resolveEmployeeGovernanceIds({
        department,
        section,
        jobTitle,
      })
      const orgNodeId = await resolveDefaultOrgNodeId(legacyGovernanceIds.positionId)

      await db.insert(user).values({
        id: authUserId,
        name: fullName,
        email,
        emailVerified: true,
        image: profileImage || null,
        createdAt: now,
        updatedAt: now,
      })

      await upsertCredentialAccount({ authUserId, email, password, now, employeeSn })

      await db.insert(hrEmployees).values({
        authUserId,
        employeeId: employeeSn,
        fullName,
        email,
        siteId: defaultSite.id,
        joinDate: parseJoinDateFromYear(payload.joinYear),
        birthDate: normalizeBirthDateValue(payload.birthPlaceDate?.trim() || '') || null,
        departmentId: hrGovernanceIds.departmentId,
        sectionId: hrGovernanceIds.sectionId,
        positionId: hrGovernanceIds.positionId,
        orgNodeId: hrGovernanceIds.orgNodeId,
        demographicEmployeeStatusCode: hrGovernanceIds.demographicEmployeeStatusCode,
        accountStatus: normalizedStatus.status,
        isActive: normalizedStatus.isActive,
        createdAt: now,
        updatedAt: now,
      })

      if (currentDefaultLegacySite) {
        await db.insert(employees).values({
          authUserId,
          siteId: currentDefaultLegacySite.id,
          name: fullName,
          email,
          employeeSn,
          joinYear: parseJoinYear(payload.joinYear ?? ''),
          birthPlaceDate: normalizeBirthDateValue(payload.birthPlaceDate?.trim() || ''),
          domicile: payload.domicile?.trim() || 'Belum diisi',
          departmentId: legacyGovernanceIds.departmentId,
          sectionId: legacyGovernanceIds.sectionId,
          positionId: legacyGovernanceIds.positionId,
          orgNodeId,
          section,
          department,
          role: jobTitle,
          jobTitle,
          workLocation: defaultSite.name,
          phoneNumber: payload.phoneNumber?.trim() || '',
          employmentStatus: normalizedStatus.status,
          employeeStatusType: payload.employeeStatusType || 'Permanen | Staff',
          accessRole: role.name,
          levelName: 'Rookie',
          totalPoints: 0,
          fitStatus: 'fit',
          isActive: normalizedStatus.isActive,
        })
      }

      revalidateAdminSurfaces()
      return { status: 'success', message: 'New user created successfully.' }
    }

    if (!payload.employeeId) {
      return { status: 'error', message: 'Invalid user.' }
    }

    const [employee] = await db
      .select({
        id: hrEmployees.id,
        authUserId: hrEmployees.authUserId,
        employeeSn: hrEmployees.employeeId,
        name: hrEmployees.fullName,
        email: hrEmployees.email,
        siteId: hrEmployees.siteId,
        workLocationId: hrEmployees.workLocationId,
        accessRole: sql<string>`coalesce(${employees.accessRole}, ${hrPositions.levelName}, 'User')`,
        legacyEmployeeId: employees.id,
      })
      .from(hrEmployees)
      .leftJoin(
        employees,
        or(eq(employees.employeeSn, hrEmployees.employeeId), eq(employees.email, hrEmployees.email))
      )
      .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
      .where(eq(hrEmployees.id, payload.employeeId))
      .limit(1)

    if (!employee) {
      return { status: 'error', message: 'User not found.' }
    }

    if (payload.intent === 'update-profile') {
      const email = normalizeEmail(payload.email ?? employee.email ?? '')
      const department = payload.department || 'General'
      const section = payload.section || department
      const jobTitle = payload.jobTitle || 'Staff'
      const levelName = payload.levelName || 'Rookie'
      const gender = payload.gender ?? ''
      const religion = payload.religion ?? ''
      const education = payload.education ?? ''
      const maritalStatus = payload.maritalStatus ?? ''
      const pointOfHire = payload.pointOfHire ?? ''
      const joinDate = payload.joinDate || null
      const contractDurationStart = payload.contractDurationStart || null
      const contractDurationEnd = payload.contractDurationEnd || null
      const permanentDate = payload.permanentDate || null
      const birthDateValue = payload.birthDate || null
      const normalizedStatus = normalizeEmploymentStatus(payload.employmentStatus ?? 'active')
      const directManagerId = parseOptionalManagerId(payload.directManagerId)
      const profileImage = normalizeProfileImageValue(payload.profileImage)
      const [selectedSite] = payload.siteId
        ? await db.select().from(hrSites).where(eq(hrSites.id, payload.siteId)).limit(1)
        : []
      const [selectedWorkLocation] = payload.workLocation
        ? await db
            .select({ id: hrWorkLocations.id, name: hrWorkLocations.name })
            .from(hrWorkLocations)
            .where(eq(hrWorkLocations.name, payload.workLocation))
            .limit(1)
        : []
      const hrGovernanceIds = await resolveHrEmployeeGovernanceIds({
        department,
        section,
        jobTitle,
        siteId: selectedSite?.id ?? employee.siteId,
        statusName: payload.employeeStatusType ?? normalizedStatus.status,
      })
      const legacyGovernanceIds = await resolveEmployeeGovernanceIds({
        department,
        section,
        jobTitle,
      })
      const legacyOrgNodeId = await resolveDefaultOrgNodeId(legacyGovernanceIds.positionId)

      if (directManagerId === employee.id) {
        return { status: 'error', message: 'Direct supervisor cannot be yourself.' }
      }

      await db
        .update(hrEmployees)
        .set({
          fullName: payload.fullName || employee.name,
          employeeId: payload.employeeSn || employee.employeeSn,
          joinDate: joinDate || parseJoinDateFromYear(payload.joinYear),
          birthDate: birthDateValue || normalizeBirthDateValue(payload.birthPlaceDate || '') || null,
          departmentId: hrGovernanceIds.departmentId,
          sectionId: hrGovernanceIds.sectionId,
          positionId: hrGovernanceIds.positionId,
          orgNodeId: hrGovernanceIds.orgNodeId,
          siteId: selectedSite?.id ?? employee.siteId,
          workLocationId: selectedWorkLocation?.id ?? employee.workLocationId,
          email,
          demographicEmployeeStatusCode: hrGovernanceIds.demographicEmployeeStatusCode,
          accountStatus: normalizedStatus.status,
          isActive: normalizedStatus.isActive,
          updatedAt: new Date(),
        })
        .where(eq(hrEmployees.id, employee.id))

      if (employee.legacyEmployeeId) {
        await db
          .update(employees)
          .set({
            name: payload.fullName || employee.name,
            employeeSn: payload.employeeSn || employee.employeeSn,
            joinDate,
            joinYear: joinDate ? new Date(joinDate).getFullYear() : parseJoinYear(payload.joinYear ?? ''),
            birthDate: birthDateValue,
            birthPlaceDate: birthDateValue || normalizeBirthDateValue(payload.birthPlaceDate || ''),
            domicile: payload.domicile || 'Belum diisi',
            directManagerId,
            departmentId: legacyGovernanceIds.departmentId,
            sectionId: legacyGovernanceIds.sectionId,
            positionId: legacyGovernanceIds.positionId,
            orgNodeId: legacyOrgNodeId,
            section,
            department,
            role: jobTitle,
            jobTitle,
            levelName,
            gender,
            religion,
            education,
            maritalStatus,
            pointOfHire,
            contractDurationStart,
            contractDurationEnd,
            permanentDate,
            workLocation: selectedWorkLocation?.name || payload.workLocation || selectedSite?.name || '',
            phoneNumber: payload.phoneNumber || '',
            email,
            employmentStatus: normalizedStatus.status,
            employeeStatusType: payload.employeeStatusType ?? 'Permanen | Staff',
            isActive: normalizedStatus.isActive,
          })
          .where(eq(employees.id, employee.legacyEmployeeId))
      }

      if (employee.authUserId) {
        await db
          .update(user)
          .set({
            name: payload.fullName || employee.name,
            email,
            image: profileImage || null,
            updatedAt: new Date(),
          })
          .where(eq(user.id, employee.authUserId))
      }

      const actorEmail = await getCurrentActorEmail()
      await logAuditEvent({
        actorEmail,
        action: 'user.updated',
        entityType: 'user',
        entityLabel: payload.fullName || employee.name,
        description: `Updated profile for ${payload.fullName || employee.name} (${email}).`,
      })

      revalidateAdminSurfaces()
      return { status: 'success', message: 'User profile updated successfully.' }
    }

    if (payload.intent === 'ban-user') {
      await db
        .update(hrEmployees)
        .set({
          isActive: false,
          accountStatus: 'inactive',
          updatedAt: new Date(),
        })
        .where(eq(hrEmployees.id, employee.id))

      if (employee.legacyEmployeeId) {
        await db
          .update(employees)
          .set({ isActive: false, employmentStatus: 'inactive' })
          .where(eq(employees.id, employee.legacyEmployeeId))
      }

      if (employee.authUserId) {
        await db.delete(session).where(eq(session.userId, employee.authUserId))
      }

      // Audit log
      const actorEmail = await getCurrentActorEmail()
      await logAuditEvent({
        actorEmail,
        action: 'user.banned',
        entityType: 'user',
        entityLabel: employee.name,
        description: `Banned user ${employee.name} (${employee.email})`,
        severity: 'critical',
      })

      // Notify user
      await notifyAccountBanned({
        employeeId: employee.id,
        employeeName: employee.name,
        bannedByName: 'Admin',
      })

      revalidateAdminSurfaces()
      return { status: 'success', message: 'User banned successfully.' }
    }

    if (payload.intent === 'delete-user') {
      await db
        .update(hrEmployees)
        .set({
          isActive: false,
          accountStatus: 'inactive',
          updatedAt: new Date(),
        })
        .where(eq(hrEmployees.id, employee.id))

      if (employee.legacyEmployeeId) {
        await db
          .update(employees)
          .set({ isActive: false, employmentStatus: 'inactive' })
          .where(eq(employees.id, employee.legacyEmployeeId))
      }

      if (employee.authUserId) {
        await db.delete(session).where(eq(session.userId, employee.authUserId))
      }

      const actorEmail = await getCurrentActorEmail()
      await logAuditEvent({
        actorEmail,
        action: 'user.deleted',
        entityType: 'user',
        entityLabel: employee.name,
        description: `Deactivated user ${employee.name} (${employee.email}) and revoked sessions.`,
        severity: 'critical',
      })

      revalidateAdminSurfaces()
      return { status: 'success', message: 'User deactivated successfully.' }
    }

    if (payload.intent === 'change-role') {
      if (!payload.accessRole) {
        return { status: 'error', message: 'New role must be selected.' }
      }

      const [role] = await db
        .select()
        .from(securityRoles)
        .where(eq(securityRoles.name, payload.accessRole))
        .limit(1)

      if (!role) {
        return { status: 'error', message: 'Selected role is invalid.' }
      }

      if (employee.legacyEmployeeId) {
        await db
          .update(employees)
          .set({ accessRole: role.name })
          .where(eq(employees.id, employee.legacyEmployeeId))
      }

      // Kill session so user must re-login with new role
      if (employee.authUserId) {
        await db.delete(session).where(eq(session.userId, employee.authUserId))
      }

      // Audit log
      const actorEmail = await getCurrentActorEmail()
      await logAuditEvent({
        actorEmail,
        action: 'user.role_changed',
        entityType: 'user',
        entityLabel: employee.name,
        description: `Changed role from ${employee.accessRole} to ${role.name}`,
        severity: 'warning',
      })

      // Notify user
      await notifyRoleChanged({
        employeeId: employee.id,
        employeeName: employee.name,
        oldRole: employee.accessRole,
        newRole: role.name,
        changedByName: 'Admin',
      })

      revalidateAdminSurfaces()
      return {
        status: 'success',
        message: `Role berhasil diubah dari ${employee.accessRole} ke ${role.name}. User harus login ulang.`,
      }
    }

    if (payload.intent === 'change-password') {
      const newPassword = payload.newPassword ?? ''

      if (newPassword.length < 8) {
        return {
          status: 'error',
          message: 'Password baru minimal 8 karakter.',
        }
      }

      const latestEmployee = {
        ...employee,
        name: payload.fullName || employee.name,
        email: normalizeEmail(payload.email ?? employee.email ?? ''),
      }
      const authUserId = await ensureAuthUserForHrEmployee(latestEmployee)
      const now = new Date()

      await upsertCredentialAccount({
        authUserId,
        email: latestEmployee.email,
        password: newPassword,
        now,
        employeeSn: employee.employeeSn,
      })

      await db.delete(session).where(eq(session.userId, authUserId))

      // Audit log
      const actorEmail = await getCurrentActorEmail()
      await logAuditEvent({
        actorEmail,
        action: 'user.password_reset',
        entityType: 'user',
        entityLabel: employee.name,
        description: `Reset password for ${employee.name} (${employee.email})`,
        severity: 'warning',
      })

      // Notify user
      await notifyPasswordReset({
        employeeId: employee.id,
        employeeName: employee.name,
        resetByName: 'Admin',
      })

      revalidateAdminSurfaces()
      return { status: 'success', message: 'User password changed successfully.' }
    }

    return { status: 'error', message: 'User action intent not recognized.' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'An issue occurred while processing user.',
    }
  }
}

export async function manageSecurityRoleAction(
  _previousState: AdminMutationState,
  formData: FormData
): Promise<AdminMutationState> {
  try {
    await ensureHeroGovernanceSeedData()

    const payload = manageSecurityRoleSchema.parse({
      intent: formData.get('intent'),
      roleId: formData.get('roleId'),
      roleName: formData.get('roleName'),
      description: formData.get('description'),
      scope: formData.get('scope'),
      sourceRoleId: formData.get('sourceRoleId'),
      permissionsJson: formData.get('permissionsJson'),
    })

    if (payload.intent === 'create-role') {
      const roleName = payload.roleName?.trim() ?? ''

      if (!roleName) {
        return { status: 'error', message: 'Role name is required.' }
      }

      const [existingRole] = await db
        .select()
        .from(securityRoles)
        .where(eq(securityRoles.name, roleName))
        .limit(1)

      if (existingRole) {
        return { status: 'error', message: 'Role name is already taken.' }
      }

      const [createdRole] = await db
        .insert(securityRoles)
        .values({
          name: roleName,
          description: payload.description?.trim() || 'New role from role management page.',
          scope: payload.scope?.trim() || 'site',
        })
        .returning()

      const menuItems = await db.select().from(navbarMenuItems)
      if (menuItems.length > 0) {
        await db.insert(roleMenuPermissions).values(
          menuItems.map((menuItem) => ({
            roleId: createdRole.id,
            menuItemId: menuItem.id,
            canView: false,
            canEdit: false,
            canDelete: false,
            canSelectAll: false,
          }))
        )
      }

      revalidateAdminSurfaces()
      return { status: 'success', message: 'New role created successfully.' }
    }

    if (payload.intent === 'duplicate-role') {
      const sourceRoleId = parseRoleId(payload.sourceRoleId)
      const roleName = payload.roleName?.trim() ?? ''

      if (!sourceRoleId || !roleName) {
        return {
          status: 'error',
          message: 'Source role and duplicate role name are required.',
        }
      }

      const [sourceRole, existingRole] = await Promise.all([
        db.select().from(securityRoles).where(eq(securityRoles.id, sourceRoleId)).limit(1),
        db.select().from(securityRoles).where(eq(securityRoles.name, roleName)).limit(1),
      ])

      if (!sourceRole[0]) {
        return { status: 'error', message: 'Source role not found.' }
      }

      if (existingRole[0]) {
        return { status: 'error', message: 'Duplicate role name is already taken.' }
      }

      const [duplicatedRole] = await db
        .insert(securityRoles)
        .values({
          name: roleName,
          description: payload.description?.trim() || `${sourceRole[0].description} (Copy)`,
          scope: payload.scope?.trim() || sourceRole[0].scope,
        })
        .returning()

      const [sourceMenuPermissions, sourceRolePermissions] = await Promise.all([
        db.select().from(roleMenuPermissions).where(eq(roleMenuPermissions.roleId, sourceRoleId)),
        db
          .select()
          .from(securityRolePermissions)
          .where(eq(securityRolePermissions.roleId, sourceRoleId)),
      ])

      if (sourceMenuPermissions.length > 0) {
        await db.insert(roleMenuPermissions).values(
          sourceMenuPermissions.map((permission) => ({
            roleId: duplicatedRole.id,
            menuItemId: permission.menuItemId,
            canView: permission.canView,
            canEdit: permission.canEdit,
            canDelete: permission.canDelete,
            canSelectAll: permission.canSelectAll,
          }))
        )
      }

      if (sourceRolePermissions.length > 0) {
        await db.insert(securityRolePermissions).values(
          sourceRolePermissions.map((permission) => ({
            roleId: duplicatedRole.id,
            permissionId: permission.permissionId,
          }))
        )
      }

      revalidateAdminSurfaces()
      return { status: 'success', message: 'Role duplicated successfully.' }
    }

    if (payload.intent === 'delete-role') {
      const roleId = parseRoleId(payload.roleId)

      if (!roleId) {
        return { status: 'error', message: 'Invalid role.' }
      }

      const roles = await db.select().from(securityRoles)
      if (roles.length <= 1) {
        return {
          status: 'error',
          message: 'Minimal harus ada satu role aktif.',
        }
      }

      const [role] = await db
        .select()
        .from(securityRoles)
        .where(eq(securityRoles.id, roleId))
        .limit(1)

      if (!role) {
        return { status: 'error', message: 'Role not found.' }
      }

      const fallbackRole = roles.find((item) => item.id !== role.id)
      if (!fallbackRole) {
        return {
          status: 'error',
          message: 'Replacement role is not available.',
        }
      }

      await db
        .update(employees)
        .set({ accessRole: fallbackRole.name })
        .where(eq(employees.accessRole, role.name))

      await db.delete(securityRoles).where(eq(securityRoles.id, role.id))

      revalidateAdminSurfaces()
      return {
        status: 'success',
        message: `Role berhasil dihapus. User lama dipindah ke ${fallbackRole.name}.`,
      }
    }

    if (payload.intent === 'save-menu-permissions') {
      const roleId = parseRoleId(payload.roleId)

      if (!roleId || !payload.permissionsJson) {
        return {
          status: 'error',
          message: 'Data permission role belum lengkap.',
        }
      }

      const matrix = JSON.parse(payload.permissionsJson) as Array<{
        menuItemId: number
        canView: boolean
        canEdit: boolean
        canDelete: boolean
        canSelectAll: boolean
      }>

      for (const item of matrix) {
        const [existingPermission] = await db
          .select({ id: roleMenuPermissions.id })
          .from(roleMenuPermissions)
          .where(
            and(
              eq(roleMenuPermissions.roleId, roleId),
              eq(roleMenuPermissions.menuItemId, item.menuItemId)
            )
          )
          .limit(1)

        if (existingPermission) {
          await db
            .update(roleMenuPermissions)
            .set({
              canView: item.canView,
              canEdit: item.canEdit,
              canDelete: item.canDelete,
              canSelectAll: item.canSelectAll,
            })
            .where(eq(roleMenuPermissions.id, existingPermission.id))
        } else {
          await db.insert(roleMenuPermissions).values({
            roleId,
            menuItemId: item.menuItemId,
            canView: item.canView,
            canEdit: item.canEdit,
            canDelete: item.canDelete,
            canSelectAll: item.canSelectAll,
          })
        }
      }

      revalidateAdminSurfaces()
      return {
        status: 'success',
        message: 'Checklist RBAC role berhasil disimpan.',
      }
    }

    return { status: 'error', message: 'Intent role action tidak dikenali.' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'An issue occurred while processing role.',
    }
  }
}

function parseOperationalDate(value: string, fallback = new Date()) {
  if (!value) {
    return fallback
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Tanggal tidak valid.')
  }

  return parsed
}

function parseOptionalOperationalDate(value: string) {
  if (!value) {
    return null
  }

  return parseOperationalDate(value)
}

function getRequiredId(id: number | undefined, label = 'Data') {
  if (!id) {
    throw new Error(`${label} tidak valid.`)
  }

  return id
}

function revalidateOperationalPages(...paths: string[]) {
  for (const path of paths) {
    revalidatePath(path)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/analytics')
}

async function getActiveSiteEmployeeIds(siteId: number) {
  const rows = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(eq(employees.siteId, siteId), eq(employees.isActive, true)))

  return rows.map((row) => row.id)
}

async function notifyEmployeesForHseAlert(input: {
  siteId: number
  title: string
  body: string
  eventType: string
}) {
  const employeeIds = await getActiveSiteEmployeeIds(input.siteId)

  await Promise.all(
    employeeIds.map(async (employeeId) => {
      const event = await createNotificationEventForEmployee({
        employeeId,
        eventType: input.eventType,
        category: 'hse_alerts',
        title: input.title,
        body: input.body,
        url: '/mobile/hse',
      })

      if (!event) {
        return
      }

      await sendPushNotification({
        employeeId,
        category: 'hse_alerts',
        title: input.title,
        body: input.body,
        url: '/mobile/hse',
        tag: `hse-${event.id}`,
        notificationEventId: event.id,
      })
    })
  )
}

async function notifyEmployeeForPointUpdate(input: {
  employeeId: number
  title: string
  body: string
}) {
  const event = await createNotificationEventForEmployee({
    employeeId: input.employeeId,
    eventType: 'points_updated',
    category: 'points_updates',
    title: input.title,
    body: input.body,
    url: '/mobile/gamification',
  })

  if (!event) {
    return
  }

  await sendPushNotification({
    employeeId: input.employeeId,
    category: 'points_updates',
    title: input.title,
    body: input.body,
    url: '/mobile/gamification',
    tag: `points-${event.id}`,
    notificationEventId: event.id,
  })
}

export async function manageHseObservationAction(formData: FormData): Promise<AdminMutationState> {
  try {
    const payload = manageHseObservationSchema.parse(Object.fromEntries(formData))
    await ensureHeroSeedData()

    if (payload.intent === 'create') {
      if (!payload.siteId || !payload.title || !payload.location || !payload.notes) {
        return { status: 'error', message: 'Site, judul, lokasi, dan catatan wajib diisi.' }
      }

      await db.insert(hseObservations).values({
        siteId: payload.siteId,
        employeeId: payload.employeeId ?? null,
        category: payload.category,
        title: payload.title,
        location: payload.location,
        severity: payload.severity,
        status: payload.status,
        notes: payload.notes,
        observedAt: parseOperationalDate(payload.observedAt),
      })

      await notifyEmployeesForHseAlert({
        siteId: payload.siteId,
        title: `HSE alert: ${payload.title}`,
        body: `${payload.severity} di ${payload.location}. ${payload.notes.slice(0, 96)}`,
        eventType: 'hse_observation_created',
      })

      revalidateOperationalPages('/dashboard/hse')
      return { status: 'success', message: 'Observasi HSE berhasil ditambahkan.' }
    }

    const id = getRequiredId(payload.id, 'Observasi HSE')

    if (payload.intent === 'update-status') {
      await db
        .update(hseObservations)
        .set({ status: payload.status })
        .where(eq(hseObservations.id, id))

      const [currentObservation] = await db
        .select({
          siteId: hseObservations.siteId,
          title: hseObservations.title,
          location: hseObservations.location,
        })
        .from(hseObservations)
        .where(eq(hseObservations.id, id))
        .limit(1)

      if (currentObservation) {
        await notifyEmployeesForHseAlert({
          siteId: currentObservation.siteId,
          title: `HSE update: ${currentObservation.title}`,
          body: `Status berubah ke ${payload.status.replaceAll('_', ' ')} di ${currentObservation.location}.`,
          eventType: 'hse_observation_status_changed',
        })
      }

      revalidateOperationalPages('/dashboard/hse')
      return { status: 'success', message: 'Status observasi HSE diperbarui.' }
    }

    if (payload.intent === 'update') {
      if (!payload.siteId || !payload.title || !payload.location || !payload.notes) {
        return { status: 'error', message: 'Site, judul, lokasi, dan catatan wajib diisi.' }
      }

      await db
        .update(hseObservations)
        .set({
          siteId: payload.siteId,
          employeeId: payload.employeeId ?? null,
          category: payload.category,
          title: payload.title,
          location: payload.location,
          severity: payload.severity,
          status: payload.status,
          notes: payload.notes,
          observedAt: parseOperationalDate(payload.observedAt),
        })
        .where(eq(hseObservations.id, id))

      revalidateOperationalPages('/dashboard/hse')
      return { status: 'success', message: 'Detail observasi HSE diperbarui.' }
    }

    await db.delete(hseObservations).where(eq(hseObservations.id, id))
    revalidateOperationalPages('/dashboard/hse')
    return { status: 'success', message: 'Observasi HSE dihapus.' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Gagal memproses observasi HSE.',
    }
  }
}

export async function manageHseIncidentAction(formData: FormData): Promise<AdminMutationState> {
  try {
    const payload = manageHseIncidentSchema.parse(Object.fromEntries(formData))
    await ensureHeroSeedData()

    if (payload.intent === 'create') {
      if (!payload.siteId || !payload.title || !payload.impact) {
        return { status: 'error', message: 'Site, judul, dan impact wajib diisi.' }
      }

      await db.insert(hseIncidents).values({
        siteId: payload.siteId,
        type: payload.type,
        title: payload.title,
        unitNumber: payload.unitNumber,
        impact: payload.impact,
        status: payload.status,
        reportedAt: parseOperationalDate(payload.reportedAt),
      })

      await notifyEmployeesForHseAlert({
        siteId: payload.siteId,
        title: `Incident HSE: ${payload.title}`,
        body: `${payload.type} Â· ${payload.impact.slice(0, 96)}`,
        eventType: 'hse_incident_created',
      })

      revalidateOperationalPages('/dashboard/hse')
      return { status: 'success', message: 'Incident HSE berhasil ditambahkan.' }
    }

    const id = getRequiredId(payload.id, 'Incident HSE')

    if (payload.intent === 'update-status') {
      await db.update(hseIncidents).set({ status: payload.status }).where(eq(hseIncidents.id, id))

      const [currentIncident] = await db
        .select({
          siteId: hseIncidents.siteId,
          title: hseIncidents.title,
          unitNumber: hseIncidents.unitNumber,
        })
        .from(hseIncidents)
        .where(eq(hseIncidents.id, id))
        .limit(1)

      if (currentIncident) {
        await notifyEmployeesForHseAlert({
          siteId: currentIncident.siteId,
          title: `Incident update: ${currentIncident.title}`,
          body: `Status berubah ke ${payload.status.replaceAll('_', ' ')} untuk ${currentIncident.unitNumber}.`,
          eventType: 'hse_incident_status_changed',
        })
      }

      revalidateOperationalPages('/dashboard/hse')
      return { status: 'success', message: 'Status incident HSE diperbarui.' }
    }

    if (payload.intent === 'update') {
      if (!payload.siteId || !payload.title || !payload.impact) {
        return { status: 'error', message: 'Site, judul, dan impact wajib diisi.' }
      }

      await db
        .update(hseIncidents)
        .set({
          siteId: payload.siteId,
          type: payload.type,
          title: payload.title,
          unitNumber: payload.unitNumber,
          impact: payload.impact,
          status: payload.status,
          reportedAt: parseOperationalDate(payload.reportedAt),
        })
        .where(eq(hseIncidents.id, id))

      revalidateOperationalPages('/dashboard/hse')
      return { status: 'success', message: 'Detail incident HSE diperbarui.' }
    }

    await db.delete(hseIncidents).where(eq(hseIncidents.id, id))
    revalidateOperationalPages('/dashboard/hse')
    return { status: 'success', message: 'Incident HSE dihapus.' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Gagal memproses incident HSE.',
    }
  }
}

export async function manageTrainingRecordAction(formData: FormData): Promise<AdminMutationState> {
  try {
    const payload = manageTrainingRecordSchema.parse(Object.fromEntries(formData))
    await ensureHeroSeedData()

    if (payload.intent === 'create') {
      if (!payload.employeeId || !payload.trainingName) {
        return { status: 'error', message: 'Karyawan dan training wajib diisi.' }
      }

      await db.insert(trainingRecords).values({
        employeeId: payload.employeeId,
        trainingName: payload.trainingName,
        provider: payload.provider,
        completedYear: payload.completedYear,
        expiresAt: parseOptionalOperationalDate(payload.expiresAt),
        status: payload.status,
      })

      revalidateOperationalPages('/dashboard/hc', '/dashboard/training-records', '/mobile/training')
      return { status: 'success', message: 'Training record berhasil ditambahkan.' }
    }

    const id = getRequiredId(payload.id, 'Training record')

    if (payload.intent === 'update-status') {
      await db
        .update(trainingRecords)
        .set({ status: payload.status })
        .where(eq(trainingRecords.id, id))
      revalidateOperationalPages('/dashboard/hc', '/dashboard/training-records', '/mobile/training')
      return { status: 'success', message: 'Status training diperbarui.' }
    }

    if (payload.intent === 'update') {
      if (!payload.employeeId || !payload.trainingName) {
        return { status: 'error', message: 'Karyawan dan training wajib diisi.' }
      }

      await db
        .update(trainingRecords)
        .set({
          employeeId: payload.employeeId,
          trainingName: payload.trainingName,
          provider: payload.provider,
          completedYear: payload.completedYear,
          expiresAt: parseOptionalOperationalDate(payload.expiresAt),
          status: payload.status,
        })
        .where(eq(trainingRecords.id, id))

      revalidateOperationalPages('/dashboard/hc', '/dashboard/training-records', '/mobile/training')
      return { status: 'success', message: 'Detail training diperbarui.' }
    }

    await db.delete(trainingRecords).where(eq(trainingRecords.id, id))
    revalidateOperationalPages('/dashboard/hc', '/dashboard/training-records', '/mobile/training')
    return { status: 'success', message: 'Training record dihapus.' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Gagal memproses training record.',
    }
  }
}

function normalizeTrainingRecordKey(value: string) {
  let s = value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ")
  const words = s.split(" ")
  if (words.length > 0) {
    const first = words[0]
    if (first === "m" || first === "muhammad" || first === "mohammad" || first === "muhamad" || first === "mochamad") {
      words[0] = "m"
    }
    s = words.join(" ")
  }
  return s
}

function inferTrainingStatus(expiresAt: Date | null) {
  if (!expiresAt) {
    return 'active'
  }

  const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (daysUntilExpiry <= 7) {
    return 'urgent'
  }

  if (daysUntilExpiry <= 30) {
    return 'expiring_soon'
  }

  return 'active'
}

export async function importTrainingRecordsAction(
  _previousState: TrainingRecordImportState = INITIAL_TRAINING_RECORD_IMPORT_STATE,
  formData: FormData
): Promise<TrainingRecordImportState> {
  try {
    await ensureHeroSeedData()

    const rawCsv = `${formData.get('rawCsv') ?? ''}`.trim()
    if (!rawCsv) {
      return {
        status: 'error',
        message: 'CSV training belum diisi.',
      }
    }

    const parsed = parseTrainingRecordCsv(rawCsv)
    if (parsed.records.length === 0) {
      return {
        status: 'error',
        message: 'Training CSV is empty or header cannot be read.',
      }
    }

    const mapping = autoMapTrainingRecordHeaders(parsed.headers)
    if (!mapping.trainingName || !mapping.completedYear) {
      return {
        status: 'error',
        message: 'Header minimal wajib ada: Training dan Tahun.',
      }
    }

    const employeeRows = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        employeeSn: employees.employeeSn,
        department: employees.department,
      })
      .from(employees)
      .where(eq(employees.isActive, true))

    const existingRows = await db
      .select({
        id: trainingRecords.id,
        employeeId: trainingRecords.employeeId,
        trainingName: trainingRecords.trainingName,
        completedYear: trainingRecords.completedYear,
      })
      .from(trainingRecords)

    const employeeBySn = new Map(
      employeeRows
        .filter((employee) => employee.employeeSn.trim())
        .map((employee) => [normalizeTrainingRecordKey(employee.employeeSn), employee])
    )
    const employeeByEmail = new Map(
      employeeRows
        .filter((employee) => employee.email.trim())
        .map((employee) => [normalizeTrainingRecordKey(employee.email), employee])
    )
    const fuse = new Fuse(
      employeeRows.map(emp => ({
        ...emp,
        normalizedName: normalizeTrainingRecordKey(emp.name)
      })),
      {
        keys: ['normalizedName'],
        threshold: 0.35,
        includeScore: true,
      }
    )

    const employeesByName = employeeRows.reduce<Map<string, typeof employeeRows>>(
      (map, employee) => {
        const key = normalizeTrainingRecordKey(employee.name)
        const current = map.get(key) ?? []
        current.push(employee)
        map.set(key, current)
        return map
      },
      new Map()
    )
    const existingByCompositeKey = new Map(
      existingRows.map((row) => [
        `${row.employeeId}:${normalizeTrainingRecordKey(row.trainingName)}:${row.completedYear}`,
        row,
      ])
    )

    let importedCount = 0
    let updatedCount = 0
    let skippedCount = 0

    for (const row of parsed.records) {
      const employeeSn = getTrainingRecordImportValue(row, mapping, 'employeeSn')
      const employeeName = getTrainingRecordImportValue(row, mapping, 'employeeName')
      const email = getTrainingRecordImportValue(row, mapping, 'email')
      const department = normalizeTrainingRecordKey(
        getTrainingRecordImportValue(row, mapping, 'department')
      )
      const trainingName = getTrainingRecordImportValue(row, mapping, 'trainingName')
      const provider = getTrainingRecordImportValue(row, mapping, 'provider') || '-'
      const completedYearValue = getTrainingRecordImportValue(row, mapping, 'completedYear')
      const expiresAtValue = getTrainingRecordImportValue(row, mapping, 'expiresAt')
      const rawStatus = getTrainingRecordImportValue(row, mapping, 'status')

      if (!trainingName || !completedYearValue) {
        skippedCount += 1
        continue
      }

      const completedYear = Number.parseInt(completedYearValue, 10)
      if (!Number.isInteger(completedYear) || completedYear < 1900 || completedYear > 2100) {
        skippedCount += 1
        continue
      }

      const expiresAt = parseOptionalOperationalDate(expiresAtValue)
      const status = rawStatus || inferTrainingStatus(expiresAt)

      const employeeCandidatesFromName = employeeName
        ? [...(employeesByName.get(normalizeTrainingRecordKey(employeeName)) ?? [])]
        : []

      let employee =
        (employeeSn ? employeeBySn.get(normalizeTrainingRecordKey(employeeSn)) : undefined) ??
        (email ? employeeByEmail.get(normalizeTrainingRecordKey(email)) : undefined) ??
        (employeeCandidatesFromName.length === 1
          ? employeeCandidatesFromName[0]
          : undefined)

      if (!employee && employeeName) {
        const results = fuse.search(normalizeTrainingRecordKey(employeeName))
        if (results.length > 0 && (results[0].score ?? 1) <= 0.35) {
          employee = results[0].item
        }
      }

      if (!employee) {
        skippedCount += 1
        continue
      }



      const compositeKey = `${employee.id}:${normalizeTrainingRecordKey(trainingName)}:${completedYear}`
      const existing = existingByCompositeKey.get(compositeKey)

      if (existing) {
        await db
          .update(trainingRecords)
          .set({
            provider,
            expiresAt,
            status,
          })
          .where(eq(trainingRecords.id, existing.id))
        updatedCount += 1
        continue
      }

      await db.insert(trainingRecords).values({
        employeeId: employee.id,
        trainingName,
        provider,
        completedYear,
        expiresAt,
        status,
      })
      importedCount += 1
    }

    revalidateOperationalPages('/dashboard/hc', '/dashboard/training-records', '/mobile/training')

    return {
      status: 'success',
      message: 'Import training selesai diproses.',
      importedCount,
      updatedCount,
      skippedCount,
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Gagal import training records.',
    }
  }
}

export async function manageWellnessRecordAction(formData: FormData): Promise<AdminMutationState> {
  try {
    const payload = manageWellnessRecordSchema.parse(Object.fromEntries(formData))
    await ensureHeroSeedData()

    if (payload.intent === 'create') {
      if (!payload.employeeId || !payload.metricValue || !payload.notes) {
        return { status: 'error', message: 'Karyawan, nilai metrik, dan catatan wajib diisi.' }
      }

      await db.insert(wellnessRecords).values({
        employeeId: payload.employeeId,
        metricType: payload.metricType,
        metricValue: payload.metricValue,
        status: payload.status,
        notes: payload.notes,
        recordedAt: parseOperationalDate(payload.recordedAt),
      })

      revalidateOperationalPages('/dashboard/hc')
      return { status: 'success', message: 'Wellness record berhasil ditambahkan.' }
    }

    const id = getRequiredId(payload.id, 'Wellness record')

    if (payload.intent === 'update-status') {
      await db
        .update(wellnessRecords)
        .set({ status: payload.status })
        .where(eq(wellnessRecords.id, id))
      revalidateOperationalPages('/dashboard/hc')
      return { status: 'success', message: 'Status wellness diperbarui.' }
    }

    if (payload.intent === 'update') {
      if (!payload.employeeId || !payload.metricValue || !payload.notes) {
        return { status: 'error', message: 'Karyawan, nilai metrik, dan catatan wajib diisi.' }
      }

      await db
        .update(wellnessRecords)
        .set({
          employeeId: payload.employeeId,
          metricType: payload.metricType,
          metricValue: payload.metricValue,
          status: payload.status,
          notes: payload.notes,
          recordedAt: parseOperationalDate(payload.recordedAt),
        })
        .where(eq(wellnessRecords.id, id))

      revalidateOperationalPages('/dashboard/hc')
      return { status: 'success', message: 'Detail wellness diperbarui.' }
    }

    await db.delete(wellnessRecords).where(eq(wellnessRecords.id, id))
    revalidateOperationalPages('/dashboard/hc')
    return { status: 'success', message: 'Wellness record dihapus.' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Gagal memproses wellness record.',
    }
  }
}

export async function manageAttendanceRecordAction(
  formData: FormData
): Promise<AdminMutationState> {
  try {
    const payload = manageAttendanceRecordSchema.parse(Object.fromEntries(formData))
    await ensureHeroSeedData()

    if (payload.intent === 'create') {
      if (!payload.employeeId || !payload.siteId || !payload.eventTime || !payload.locationNote) {
        return {
          status: 'error',
          message: 'Karyawan, site, waktu, dan catatan lokasi wajib diisi.',
        }
      }

      await db.insert(attendanceRecords).values({
        employeeId: payload.employeeId,
        siteId: payload.siteId,
        eventType: payload.eventType,
        eventTime: parseOperationalDate(payload.eventTime),
        status: payload.status,
        locationNote: payload.locationNote,
        photoUrl: payload.photoUrl || null,
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
      })

      revalidateOperationalPages('/dashboard/hc', '/dashboard/attendance/records')
      return { status: 'success', message: 'Attendance record berhasil ditambahkan.' }
    }

    const id = getRequiredId(payload.id, 'Attendance record')

    if (payload.intent === 'update-status') {
      await db
        .update(attendanceRecords)
        .set({ status: payload.status })
        .where(eq(attendanceRecords.id, id))
      revalidateOperationalPages('/dashboard/hc', '/dashboard/attendance/records')
      return { status: 'success', message: 'Status attendance diperbarui.' }
    }

    if (payload.intent === 'update') {
      if (!payload.employeeId || !payload.siteId || !payload.eventTime || !payload.locationNote) {
        return {
          status: 'error',
          message: 'Karyawan, site, waktu, dan catatan lokasi wajib diisi.',
        }
      }

      await db
        .update(attendanceRecords)
        .set({
          employeeId: payload.employeeId,
          siteId: payload.siteId,
          eventType: payload.eventType,
          eventTime: parseOperationalDate(payload.eventTime),
          status: payload.status,
          locationNote: payload.locationNote,
          photoUrl: payload.photoUrl || null,
          latitude: payload.latitude || null,
          longitude: payload.longitude || null,
        })
        .where(eq(attendanceRecords.id, id))

      revalidateOperationalPages('/dashboard/hc', '/dashboard/attendance/records')
      return { status: 'success', message: 'Detail attendance diperbarui.' }
    }

    await db.delete(attendanceRecords).where(eq(attendanceRecords.id, id))
    revalidateOperationalPages('/dashboard/hc', '/dashboard/attendance/records')
    return { status: 'success', message: 'Attendance record dihapus.' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Gagal memproses attendance record.',
    }
  }
}

export async function manageTimesheetEntryAction(formData: FormData): Promise<AdminMutationState> {
  try {
    const payload = manageTimesheetEntrySchema.parse(Object.fromEntries(formData))
    await ensureHeroSeedData()

    if (payload.intent === 'create') {
      if (!payload.employeeId || !payload.siteId || !payload.periodLabel) {
        return { status: 'error', message: 'Karyawan, site, dan periode wajib diisi.' }
      }

      await db.insert(timesheetEntries).values({
        employeeId: payload.employeeId,
        siteId: payload.siteId,
        periodLabel: payload.periodLabel,
        regularMinutes: payload.regularMinutes,
        overtimeMinutes: payload.overtimeMinutes,
        overtimeAmount: payload.overtimeAmount,
        status: payload.status,
        updatedAt: new Date(),
      })

      revalidateOperationalPages('/dashboard/timesheet')
      return { status: 'success', message: 'Timesheet entry berhasil ditambahkan.' }
    }

    const id = getRequiredId(payload.id, 'Timesheet entry')

    if (payload.intent === 'update-status') {
      await db
        .update(timesheetEntries)
        .set({ status: payload.status, updatedAt: new Date() })
        .where(eq(timesheetEntries.id, id))
      revalidateOperationalPages('/dashboard/timesheet')
      return { status: 'success', message: 'Status timesheet diperbarui.' }
    }

    if (payload.intent === 'update') {
      if (!payload.employeeId || !payload.siteId || !payload.periodLabel) {
        return { status: 'error', message: 'Karyawan, site, dan periode wajib diisi.' }
      }

      await db
        .update(timesheetEntries)
        .set({
          employeeId: payload.employeeId,
          siteId: payload.siteId,
          periodLabel: payload.periodLabel,
          regularMinutes: payload.regularMinutes,
          overtimeMinutes: payload.overtimeMinutes,
          overtimeAmount: payload.overtimeAmount,
          status: payload.status,
          updatedAt: new Date(),
        })
        .where(eq(timesheetEntries.id, id))

      revalidateOperationalPages('/dashboard/timesheet')
      return { status: 'success', message: 'Detail timesheet diperbarui.' }
    }

    await db.delete(timesheetEntries).where(eq(timesheetEntries.id, id))
    revalidateOperationalPages('/dashboard/timesheet')
    return { status: 'success', message: 'Timesheet entry dihapus.' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Gagal memproses timesheet.',
    }
  }
}

export async function manageDailyReportAction(formData: FormData): Promise<AdminMutationState> {
  try {
    const payload = manageDailyReportSchema.parse(Object.fromEntries(formData))
    await ensureHeroSeedData()

    if (payload.intent === 'create') {
      if (!payload.siteId || !payload.reportDate || !payload.customerName || !payload.hseSummary) {
        return { status: 'error', message: 'Site, tanggal, customer, dan HSE summary wajib diisi.' }
      }

      await db.insert(dailyReports).values({
        siteId: payload.siteId,
        reportDate: parseOperationalDate(payload.reportDate),
        customerName: payload.customerName,
        totalSections: payload.totalSections,
        readySections: Math.min(payload.readySections, payload.totalSections),
        jobsCompleted: payload.jobsCompleted,
        manpowerPresent: payload.manpowerPresent,
        hseSummary: payload.hseSummary,
        status: payload.status,
      })

      revalidateOperationalPages('/dashboard/reports')
      return { status: 'success', message: 'Daily report berhasil ditambahkan.' }
    }

    const id = getRequiredId(payload.id, 'Daily report')

    if (payload.intent === 'update-status') {
      await db.update(dailyReports).set({ status: payload.status }).where(eq(dailyReports.id, id))
      revalidateOperationalPages('/dashboard/reports')
      return { status: 'success', message: 'Status daily report diperbarui.' }
    }

    if (payload.intent === 'update') {
      if (!payload.siteId || !payload.reportDate || !payload.customerName || !payload.hseSummary) {
        return { status: 'error', message: 'Site, tanggal, customer, dan HSE summary wajib diisi.' }
      }

      await db
        .update(dailyReports)
        .set({
          siteId: payload.siteId,
          reportDate: parseOperationalDate(payload.reportDate),
          customerName: payload.customerName,
          totalSections: payload.totalSections,
          readySections: Math.min(payload.readySections, payload.totalSections),
          jobsCompleted: payload.jobsCompleted,
          manpowerPresent: payload.manpowerPresent,
          hseSummary: payload.hseSummary,
          status: payload.status,
        })
        .where(eq(dailyReports.id, id))

      revalidateOperationalPages('/dashboard/reports')
      return { status: 'success', message: 'Detail daily report diperbarui.' }
    }

    await db.delete(dailyReports).where(eq(dailyReports.id, id))
    revalidateOperationalPages('/dashboard/reports')
    return { status: 'success', message: 'Daily report dihapus.' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Gagal memproses daily report.',
    }
  }
}

export async function managePointEventAction(formData: FormData): Promise<AdminMutationState> {
  try {
    const payload = managePointEventSchema.parse(Object.fromEntries(formData))
    await ensureHeroSeedData()

    if (payload.intent === 'create') {
      if (!payload.employeeId || !payload.label || payload.points === 0) {
        return { status: 'error', message: 'Karyawan, label, dan poin selain 0 wajib diisi.' }
      }

      await db.transaction(async (tx) => {
        await tx.insert(pointEvents).values({
          employeeId: payload.employeeId!,
          category: payload.category,
          label: payload.label,
          points: payload.points,
          createdAt: new Date(),
        })
        const [updatedEmployee] = await tx
          .update(employees)
          .set({ totalPoints: sql`${employees.totalPoints} + ${payload.points}` })
          .where(eq(employees.id, payload.employeeId!))
          .returning({ totalPoints: employees.totalPoints })

        await evaluatePointThresholdBadges(tx, payload.employeeId!, updatedEmployee.totalPoints)
      })

      await notifyEmployeeForPointUpdate({
        employeeId: payload.employeeId,
        title: payload.points > 0 ? 'Points added' : 'Points adjusted',
        body: `${payload.label} â€¢ ${payload.points > 0 ? '+' : ''}${payload.points} poin.`,
      })

      revalidateOperationalPages('/dashboard/leaderboard')
      return { status: 'success', message: 'Point event berhasil ditambahkan.' }
    }

    const id = getRequiredId(payload.id, 'Point event')

    if (payload.intent === 'update') {
      if (!payload.employeeId || !payload.label || payload.points === 0) {
        return { status: 'error', message: 'Karyawan, label, dan poin selain 0 wajib diisi.' }
      }

      const [existingEvent] = await db
        .select()
        .from(pointEvents)
        .where(eq(pointEvents.id, id))
        .limit(1)

      if (!existingEvent) {
        return { status: 'error', message: 'Point event tidak ditemukan.' }
      }

      await db.transaction(async (tx) => {
        await tx
          .update(pointEvents)
          .set({
            employeeId: payload.employeeId!,
            category: payload.category,
            label: payload.label,
            points: payload.points,
          })
          .where(eq(pointEvents.id, id))

        await tx
          .update(employees)
          .set({ totalPoints: sql`${employees.totalPoints} - ${existingEvent.points}` })
          .where(eq(employees.id, existingEvent.employeeId))

        await tx
          .update(employees)
          .set({ totalPoints: sql`${employees.totalPoints} + ${payload.points}` })
          .where(eq(employees.id, payload.employeeId!))
      })

      await notifyEmployeeForPointUpdate({
        employeeId: payload.employeeId,
        title: 'Points updated',
        body: `${payload.label} disesuaikan menjadi ${payload.points > 0 ? '+' : ''}${payload.points} poin.`,
      })

      revalidateOperationalPages('/dashboard/leaderboard')
      return { status: 'success', message: 'Detail point event diperbarui.' }
    }

    const [event] = await db.select().from(pointEvents).where(eq(pointEvents.id, id)).limit(1)

    if (!event) {
      return { status: 'error', message: 'Point event tidak ditemukan.' }
    }

    await db.transaction(async (tx) => {
      await tx.delete(pointEvents).where(eq(pointEvents.id, id))
      await tx
        .update(employees)
        .set({ totalPoints: sql`${employees.totalPoints} - ${event.points}` })
        .where(eq(employees.id, event.employeeId))
    })

    revalidateOperationalPages('/dashboard/leaderboard')
    return { status: 'success', message: 'Point event dihapus dan poin karyawan disesuaikan.' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Gagal memproses point event.',
    }
  }
}

type PointEventImportPayload = {
  headers: string[]
  rows: string[][]
  mapping: Record<string, string>
}

function findMappedColumnIndex(headers: string[], mappedHeader: string | undefined) {
  return mappedHeader ? headers.findIndex((header) => header === mappedHeader) : -1
}

function parseImportedPointValue(value: string) {
  const normalized = value.replace(/[^0-9.-]+/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : NaN
}

export async function importPointEventsAction(
  payload: PointEventImportPayload
): Promise<AdminMutationState> {
  try {
    await ensureHeroSeedData()

    const employeeIndex = findMappedColumnIndex(payload.headers, payload.mapping.employee)
    const categoryIndex = findMappedColumnIndex(payload.headers, payload.mapping.category)
    const labelIndex = findMappedColumnIndex(payload.headers, payload.mapping.label)
    const pointsIndex = findMappedColumnIndex(payload.headers, payload.mapping.points)

    if ([employeeIndex, categoryIndex, labelIndex, pointsIndex].some((index) => index < 0)) {
      return {
        status: 'error',
        message: 'Mapping Employee, Category, Label, dan Points wajib lengkap.',
      }
    }

    const directory = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
      })
      .from(employees)

    const employeeByName = new Map(
      directory.map((employee) => [employee.name.trim().toLowerCase(), employee])
    )
    const employeeByEmail = new Map(
      directory
        .filter((employee) => employee.email)
        .map((employee) => [employee.email!.trim().toLowerCase(), employee])
    )

    let importedCount = 0
    const failures: string[] = []

    for (const [rowIndex, row] of payload.rows.entries()) {
      const employeeRef = row[employeeIndex]?.trim()
      const category = row[categoryIndex]?.trim()
      const label = row[labelIndex]?.trim()
      const pointValue = row[pointsIndex]?.trim()

      if (!employeeRef && !category && !label && !pointValue) {
        continue
      }

      const employee = employeeRef?.includes('@')
        ? employeeByEmail.get(employeeRef.toLowerCase())
        : employeeByName.get((employeeRef ?? '').toLowerCase())
      const points = parseImportedPointValue(pointValue ?? '')

      if (!employee) {
        failures.push(`Baris ${rowIndex + 2}: employee "${employeeRef}" tidak ditemukan.`)
        continue
      }

      if (!category || !label || !Number.isFinite(points) || points === 0) {
        failures.push(`Baris ${rowIndex + 2}: Category, Label, atau Points tidak valid.`)
        continue
      }

      await db.transaction(async (tx) => {
        await tx.insert(pointEvents).values({
          employeeId: employee.id,
          category,
          label,
          points,
          createdAt: new Date(),
        })

        const [updatedEmployee] = await tx
          .update(employees)
          .set({ totalPoints: sql`${employees.totalPoints} + ${points}` })
          .where(eq(employees.id, employee.id))
          .returning({ totalPoints: employees.totalPoints })

        await evaluatePointThresholdBadges(tx, employee.id, updatedEmployee.totalPoints)
      })

      importedCount += 1
    }

    revalidateOperationalPages('/dashboard/leaderboard')

    if (importedCount === 0) {
      return {
        status: 'error',
        message: failures[0] ?? 'Tidak ada point event yang berhasil diimport.',
      }
    }

    return {
      status: 'success',
      message:
        failures.length > 0
          ? `${importedCount} point event berhasil diimport. ${failures.length} baris dilewati.`
          : `${importedCount} point event berhasil diimport.`,
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Gagal import point events.',
    }
  }
}

export async function updateNavbarThemeAction(
  _previousState: AdminMutationState,
  formData: FormData
): Promise<AdminMutationState> {
  try {
    const payload = navbarThemeSchema.parse({
      headerBackgroundColor: formData.get('headerBackgroundColor'),
    })

    await ensureHeroGovernanceSeedData()

    const [latestTheme] = await db
      .select()
      .from(navbarThemes)
      .orderBy(desc(navbarThemes.createdAt))
      .limit(1)

    if (!latestTheme) {
      return { status: 'error', message: 'Theme navbar belum tersedia.' }
    }

    await db
      .update(navbarThemes)
      .set({
        headerBackgroundColor: payload.headerBackgroundColor,
      })
      .where(eq(navbarThemes.id, latestTheme.id))

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/settings/navbar')

    return {
      status: 'success',
      message: 'Warna header navbar berhasil diperbarui.',
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 'error',
        message: error.issues[0]?.message ?? 'Input warna header tidak valid.',
      }
    }

    console.error('updateNavbarThemeAction error', error)
    return {
      status: 'error',
      message: 'Gagal memperbarui warna header navbar.',
    }
  }
}

const managePenaltyEventSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  penaltyCode: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional().default(''),
  pointsDeducted: z.coerce.number().int().min(1).max(10000),
})

const resolveDisputeSchema = z.object({
  disputeId: z.coerce.number().int().positive(),
  status: z.enum(['accepted', 'rejected']),
  resolutionNotes: z.string().trim().max(1000).optional().default(''),
})

export async function createPenaltyEvent(
  _previousState: AdminMutationState,
  formData: FormData
): Promise<AdminMutationState> {
  try {
    const payload = managePenaltyEventSchema.parse({
      employeeId: formData.get('employeeId'),
      penaltyCode: formData.get('penaltyCode'),
      description: formData.get('description'),
      pointsDeducted: formData.get('pointsDeducted'),
    })

    await db.transaction(async (tx) => {
      const [employee] = await tx
        .select({ siteId: employees.siteId })
        .from(employees)
        .where(eq(employees.id, payload.employeeId))
        .limit(1)

      if (!employee) {
        throw new Error('Employee not found.')
      }

      await tx.insert(penaltyEvents).values({
        employeeId: payload.employeeId,
        siteId: employee.siteId,
        penaltyCode: payload.penaltyCode,
        penaltyType: 'manual',
        description: payload.description,
        pointsDeducted: payload.pointsDeducted,
      })

      await tx
        .update(employees)
        .set({ totalPoints: sql`${employees.totalPoints} - ${payload.pointsDeducted}` })
        .where(eq(employees.id, payload.employeeId))
    })

    revalidatePath('/dashboard/leaderboard')
    return { status: 'success', message: 'Penalty berhasil ditambahkan.' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: 'error', message: error.issues[0]?.message ?? 'Input tidak valid.' }
    }
    return { status: 'error', message: 'Gagal memproses penalty event.' }
  }
}

export async function resolveDisputeAction(
  _previousState: AdminMutationState,
  formData: FormData
): Promise<AdminMutationState> {
  try {
    const payload = resolveDisputeSchema.parse({
      disputeId: formData.get('disputeId'),
      status: formData.get('status'),
      resolutionNotes: formData.get('resolutionNotes'),
    })

    const [dispute] = await db
      .select()
      .from(pointDisputes)
      .innerJoin(penaltyEvents, eq(pointDisputes.penaltyEventId, penaltyEvents.id))
      .where(eq(pointDisputes.id, payload.disputeId))
      .limit(1)

    if (!dispute) return { status: 'error', message: 'Dispute tidak ditemukan.' }
    if (dispute.hero_point_disputes.status !== 'pending') {
      return { status: 'error', message: 'Dispute sudah diproses.' }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(pointDisputes)
        .set({
          status: payload.status,
          resolutionNotes: payload.resolutionNotes,
          resolvedAt: new Date(),
        })
        .where(eq(pointDisputes.id, payload.disputeId))

      if (payload.status === 'accepted') {
        // Refund points if accepted
        const [updatedEmployee] = await tx
          .update(employees)
          .set({
            totalPoints: sql`${employees.totalPoints} + ${dispute.hero_penalty_events.pointsDeducted}`,
          })
          .where(eq(employees.id, dispute.hero_penalty_events.employeeId))
          .returning({ totalPoints: employees.totalPoints })

        await evaluatePointThresholdBadges(
          tx,
          dispute.hero_penalty_events.employeeId,
          updatedEmployee.totalPoints
        )
      }

      await tx
        .update(penaltyEvents)
        .set({ isDisputed: false })
        .where(eq(penaltyEvents.id, dispute.hero_penalty_events.id))
    })

    revalidatePath('/dashboard/leaderboard')
    return { status: 'success', message: `Dispute berhasil di-${payload.status}.` }
  } catch (error) {
    return { status: 'error', message: 'Gagal memproses dispute.' }
  }
}

export async function exportPointsExcel() {
  // Stub for Excel export. This would typically return a URL or trigger a client-side download based on provided filters.
  // In a Server Action, we either send data down or handle via a dedicated API route. We will wire this up later.
  return { status: 'success', data: 'Data exported' }
}

const manageLevelSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, 'Nama level harus diisi'),
  minPoints: z.coerce.number().min(0, 'Poin minimum harus >= 0'),
  description: z.string().optional().default(''),
  colorCode: z.string().min(1, 'Kode warna harus diisi'),
  isActive: z.coerce.boolean().default(true),
})

export async function manageLevelAction(
  _prevState: AdminMutationState,
  formData: FormData
): Promise<AdminMutationState> {
  try {
    const intent = formData.get('intent')
    const payload = manageLevelSchema.parse({
      id: formData.get('id'),
      name: formData.get('name'),
      minPoints: formData.get('minPoints'),
      description: formData.get('description'),
      colorCode: formData.get('colorCode'),
      isActive: formData.get('isActive') === 'true',
    })

    if (intent === 'create') {
      await db.insert(levels).values({
        name: payload.name,
        minPoints: payload.minPoints,
        description: payload.description,
        colorCode: payload.colorCode,
        isActive: payload.isActive,
      })
      revalidatePath('/dashboard/leaderboard')
      return { status: 'success', message: 'Level berhasil dibuat.' }
    }

    if (intent === 'update' && payload.id) {
      await db
        .update(levels)
        .set({
          name: payload.name,
          minPoints: payload.minPoints,
          description: payload.description,
          colorCode: payload.colorCode,
          isActive: payload.isActive,
        })
        .where(eq(levels.id, payload.id))
      revalidatePath('/dashboard/leaderboard')
      return { status: 'success', message: 'Level berhasil diupdate.' }
    }

    if (intent === 'delete' && payload.id) {
      await db.delete(levels).where(eq(levels.id, payload.id))
      revalidatePath('/dashboard/leaderboard')
      return { status: 'success', message: 'Level berhasil dihapus.' }
    }

    return { status: 'error', message: 'Intent tidak valid.' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const e = error as z.ZodError<any>
      return { status: 'error', message: e.issues[0]?.message || 'Input tidak valid.' }
    }
    return { status: 'error', message: 'Gagal menyimpan level.' }
  }
}

const manageBadgeSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, 'Nama badge harus diisi'),
  description: z.string().optional().default(''),
  iconUrl: z.string().optional().default('ðŸ†'), // Support lucide/emoji text if no actual file
  colorCode: z.string().min(1, 'Kode warna harus diisi'),
  autoAssignRule: z.enum(['none', 'points_threshold']).default('none'),
  autoAssignThreshold: z.coerce.number().default(0),
  isActive: z.coerce.boolean().default(true),
})

export async function manageBadgeAction(
  _prevState: AdminMutationState,
  formData: FormData
): Promise<AdminMutationState> {
  try {
    const intent = formData.get('intent')
    const payload = manageBadgeSchema.parse({
      id: formData.get('id'),
      name: formData.get('name'),
      description: formData.get('description'),
      iconUrl: formData.get('iconUrl'),
      colorCode: formData.get('colorCode'),
      autoAssignRule: formData.get('autoAssignRule'),
      autoAssignThreshold: formData.get('autoAssignThreshold'),
      isActive: formData.get('isActive') === 'true',
    })

    if (intent === 'create') {
      await db.insert(badges).values({
        name: payload.name,
        description: payload.description,
        iconUrl: payload.iconUrl,
        colorCode: payload.colorCode,
        autoAssignRule: payload.autoAssignRule,
        autoAssignThreshold: payload.autoAssignThreshold,
        isActive: payload.isActive,
      })
      revalidatePath('/dashboard/leaderboard')
      return { status: 'success', message: 'Badge berhasil dibuat.' }
    }

    if (intent === 'update' && payload.id) {
      await db
        .update(badges)
        .set({
          name: payload.name,
          description: payload.description,
          iconUrl: payload.iconUrl,
          colorCode: payload.colorCode,
          autoAssignRule: payload.autoAssignRule,
          autoAssignThreshold: payload.autoAssignThreshold,
          isActive: payload.isActive,
        })
        .where(eq(badges.id, payload.id))
      revalidatePath('/dashboard/leaderboard')
      return { status: 'success', message: 'Badge berhasil diupdate.' }
    }

    if (intent === 'delete' && payload.id) {
      await db.delete(badges).where(eq(badges.id, payload.id))
      revalidatePath('/dashboard/leaderboard')
      return { status: 'success', message: 'Badge berhasil dihapus.' }
    }

    return { status: 'error', message: 'Intent tidak valid.' }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const e = error as z.ZodError<any>
      return { status: 'error', message: e.issues[0]?.message || 'Input tidak valid.' }
    }
    return { status: 'error', message: 'Gagal menyimpan badge.' }
  }
}

export async function bulkUserActionsAction(formData: FormData): Promise<AdminMutationState> {
  try {
    const action = formData.get('action') as string
    const employeeIds = JSON.parse(formData.get('employeeIds') as string) as number[]
    const roleId = Number.parseInt(`${formData.get('roleId') ?? ''}`, 10)

    if (!employeeIds || employeeIds.length === 0) {
      return { status: 'error', message: 'No users selected' }
    }

    const actorEmail = await getCurrentActorEmail()
    const selectedHrEmployees = await db
      .select({
        id: hrEmployees.id,
        authUserId: hrEmployees.authUserId,
        employeeSn: hrEmployees.employeeId,
        email: hrEmployees.email,
      })
      .from(hrEmployees)
      .where(inArray(hrEmployees.id, employeeIds))
    const selectedAuthUserIds = selectedHrEmployees
      .map((employee) => employee.authUserId)
      .filter((id): id is string => id !== null)
    const selectedSnValues = selectedHrEmployees
      .map((employee) => employee.employeeSn)
      .filter(Boolean)
    const selectedEmailValues = selectedHrEmployees
      .map((employee) => employee.email)
      .filter((email): email is string => Boolean(email))

    if (action === 'activate') {
      await db
        .update(hrEmployees)
        .set({ isActive: true, accountStatus: 'active', updatedAt: new Date() })
        .where(inArray(hrEmployees.id, employeeIds))

      if (selectedSnValues.length || selectedEmailValues.length) {
        await db
          .update(employees)
          .set({ isActive: true, employmentStatus: 'active' })
          .where(
            or(
              inArray(employees.employeeSn, selectedSnValues),
              inArray(employees.email, selectedEmailValues)
            )
          )
      }

      await logAuditEvent({
        actorEmail,
        action: 'user.bulk_activated',
        entityType: 'user',
        entityLabel: `${employeeIds.length} users`,
        description: `Bulk activated ${employeeIds.length} users: ${employeeIds.join(', ')}`,
        severity: 'info',
      })

      revalidateAdminSurfaces()
      return { status: 'success', message: `Successfully activated ${employeeIds.length} users` }
    }

    if (action === 'ban') {
      await db
        .update(hrEmployees)
        .set({ isActive: false, accountStatus: 'inactive', updatedAt: new Date() })
        .where(inArray(hrEmployees.id, employeeIds))

      if (selectedSnValues.length || selectedEmailValues.length) {
        await db
          .update(employees)
          .set({ isActive: false, employmentStatus: 'inactive' })
          .where(
            or(
              inArray(employees.employeeSn, selectedSnValues),
              inArray(employees.email, selectedEmailValues)
            )
          )
      }

      if (selectedAuthUserIds.length > 0) {
        await db.delete(session).where(inArray(session.userId, selectedAuthUserIds))
      }

      await logAuditEvent({
        actorEmail,
        action: 'user.bulk_banned',
        entityType: 'user',
        entityLabel: `${employeeIds.length} users`,
        description: `Bulk banned ${employeeIds.length} users: ${employeeIds.join(', ')}`,
        severity: 'warning',
      })

      revalidateAdminSurfaces()
      return { status: 'success', message: `Successfully banned ${employeeIds.length} users` }
    }

    if (action === 'change-role') {
      if (Number.isNaN(roleId)) return { status: 'error', message: 'Role must be selected' }
      const [role] = await db
        .select()
        .from(securityRoles)
        .where(eq(securityRoles.id, roleId))
        .limit(1)
      if (!role) return { status: 'error', message: 'Selected role is invalid' }

      if (selectedSnValues.length || selectedEmailValues.length) {
        await db
          .update(employees)
          .set({ accessRole: role.name })
          .where(
            or(
              inArray(employees.employeeSn, selectedSnValues),
              inArray(employees.email, selectedEmailValues)
            )
          )
      }

      if (selectedAuthUserIds.length > 0) {
        await db.delete(session).where(inArray(session.userId, selectedAuthUserIds))
      }

      await logAuditEvent({
        actorEmail,
        action: 'user.role_changed',
        entityType: 'user',
        entityLabel: `${employeeIds.length} users`,
        description: `Bulk changed role to ${role.name}: ${employeeIds.join(', ')}`,
        severity: 'warning',
      })

      revalidateAdminSurfaces()
      return {
        status: 'success',
        message: `Successfully changed ${employeeIds.length} users to ${role.name}`,
      }
    }

    if (action === 'delete') {
      if (selectedAuthUserIds.length > 0) {
        await db.delete(user).where(inArray(user.id, selectedAuthUserIds))
      }

      if (selectedSnValues.length || selectedEmailValues.length) {
        await db
          .delete(employees)
          .where(
            or(
              inArray(employees.employeeSn, selectedSnValues),
              inArray(employees.email, selectedEmailValues)
            )
          )
      }
      await db.delete(hrEmployees).where(inArray(hrEmployees.id, employeeIds))

      await logAuditEvent({
        actorEmail,
        action: 'user.bulk_deleted',
        entityType: 'user',
        entityLabel: `${employeeIds.length} users`,
        description: `Bulk deleted ${employeeIds.length} users: ${employeeIds.join(', ')}`,
        severity: 'critical',
      })

      revalidateAdminSurfaces()
      return { status: 'success', message: `Successfully deleted ${employeeIds.length} users` }
    }

    return { status: 'error', message: 'Invalid bulk action' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to perform bulk action',
    }
  }
}

// ─── Face Registration Management ────────────────────────────────────────────

export async function getFaceRegistrationStatusAction() {
  const allEmployees = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      faceRegisteredAt: employees.faceRegisteredAt,
    })
    .from(employees)
    .where(eq(employees.isActive, true))
    .orderBy(asc(employees.name))

  const registered = allEmployees.filter((e) => e.faceRegisteredAt !== null)
  const unregistered = allEmployees.filter((e) => e.faceRegisteredAt === null)

  return {
    employees: allEmployees.map((e) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      isRegistered: e.faceRegisteredAt !== null,
      registeredAt: e.faceRegisteredAt?.toISOString() ?? null,
    })),
    stats: {
      registered: registered.length,
      unregistered: unregistered.length,
      total: allEmployees.length,
    },
  }
}

export async function deleteFaceEmbeddingAction(employeeId: number) {
  await db
    .update(employees)
    .set({
      faceEmbedding: null,
      faceRegisteredAt: null,
    })
    .where(eq(employees.id, employeeId))

  revalidatePath('/dashboard')
  return { ok: true }
}

// ─── Photo Fallback Review ───────────────────────────────────────────────────

const reviewFallbackSchema = z.object({
  recordId: z.number().int().positive(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(500).optional(),
})

export async function getPhotoFallbackRecordsAction(filter?: 'pending' | 'approved' | 'rejected') {
  let statusFilter = 'needs-review'
  if (filter === 'approved') statusFilter = 'verified'
  if (filter === 'rejected') statusFilter = 'rejected'

  const records = await db
    .select({
      id: attendanceRecords.id,
      employeeId: attendanceRecords.employeeId,
      employeeName: employees.name,
      eventType: attendanceRecords.eventType,
      eventTime: attendanceRecords.eventTime,
      siteId: attendanceRecords.siteId,
      photoUrl: attendanceRecords.photoUrl,
      status: attendanceRecords.status,
      locationNote: attendanceRecords.locationNote,
    })
    .from(attendanceRecords)
    .leftJoin(employees, eq(attendanceRecords.employeeId, employees.id))
    .where(
      and(
        eq(attendanceRecords.locationNote, 'photo-fallback'),
        filter
          ? eq(attendanceRecords.status, statusFilter)
          : eq(attendanceRecords.status, 'needs-review')
      )
    )
    .orderBy(desc(attendanceRecords.eventTime))

  return records.map((r) => ({
    id: r.id,
    employeeId: r.employeeId,
    employeeName: r.employeeName ?? 'Unknown',
    eventType: r.eventType,
    eventTime: r.eventTime.toISOString(),
    siteId: r.siteId,
    photoUrl: r.photoUrl,
    status: r.status,
  }))
}

export async function reviewFallbackRecordAction(input: z.infer<typeof reviewFallbackSchema>) {
  const payload = reviewFallbackSchema.parse(input)

  const newStatus = payload.action === 'approve' ? 'verified' : 'rejected'

  await db
    .update(attendanceRecords)
    .set({
      status: newStatus,
      locationNote:
        payload.action === 'reject' && payload.reason
          ? `photo-fallback:rejected:${payload.reason}`
          : 'photo-fallback',
    })
    .where(eq(attendanceRecords.id, payload.recordId))

  revalidatePath('/dashboard')
  return { ok: true, newStatus }
}

// ── SIO / POP / POM Certification Server Actions ──

function inferSioStatus(expiryDate: string | null): string {
  if (!expiryDate) return 'active'
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'expired'
  if (days <= 30) return 'expiring_soon'
  return 'active'
}

export async function manageSioCertAction(
  _prevState: AdminMutationState,
  formData: FormData
): Promise<AdminMutationState> {
  try {
    const raw = Object.fromEntries(formData)
    const intent = raw.intent as string
    await ensureHeroSeedData()

    if (intent === 'create') {
      const employeeId = Number(raw.employeeId)
      const certType = raw.certType as string
      const certName = raw.certName as string
      if (!employeeId || !certType || !certName) {
        return { status: 'error', message: 'Karyawan, tipe, dan nama sertifikat wajib diisi.' }
      }
      const expiryDate = (raw.expiryDate as string) || null
      const status = (raw.status as string) || inferSioStatus(expiryDate)
      const insertData: typeof sioCertifications.$inferInsert = {
        employeeId,
        certType,
        certNumber: (raw.certNumber as string) || null,
        certName,
        issuingBody: (raw.issuingBody as string) || null,
        certDate: (raw.certDate as string) || null,
        expiryDate,
        status,
        notes: (raw.notes as string) || null,
        lastSyncFrom: 'manual',
      }
      const [cert] = await db.insert(sioCertifications).values(insertData).returning({ id: sioCertifications.id })

      const awardPoints = raw.awardPoints === 'true'
      if (awardPoints) {
        const pts = certType === 'SIO' ? 50 : 25
        await db.insert(pointEvents).values({
          employeeId,
          transactionType: 'reward',
          sourceType: 'sio_certification',
          sourceId: cert!.id,
          category: 'certification',
          label: `Sertifikasi ${certName} — ${certType}`,
          points: pts,
        })
        await db.update(employees).set({ totalPoints: sql`${employees.totalPoints} + ${pts}` }).where(eq(employees.id, employeeId))
      }

      revalidateSioPaths()
      return { status: 'success', message: 'Sertifikasi berhasil ditambahkan.' + (awardPoints ? ' Poin produktivitas diberikan.' : '') }
    }

    const id = Number(raw.id)
    if (!id) return { status: 'error', message: 'ID tidak valid.' }

    if (intent === 'update-status') {
      await db.update(sioCertifications).set({ status: raw.status as string }).where(eq(sioCertifications.id, id))
      revalidateSioPaths()
      return { status: 'success', message: 'Status diperbarui.' }
    }

    if (intent === 'update') {
      const employeeId = Number(raw.employeeId)
      const certType = raw.certType as string
      const certName = raw.certName as string
      if (!employeeId || !certType || !certName) {
        return { status: 'error', message: 'Karyawan, tipe, dan nama wajib diisi.' }
      }
      const expiryDate = (raw.expiryDate as string) || null
      const status = (raw.status as string) || inferSioStatus(expiryDate)
      await db
        .update(sioCertifications)
        .set({
          employeeId,
          certType,
          certNumber: (raw.certNumber as string) || null,
          certName,
          issuingBody: (raw.issuingBody as string) || null,
          certDate: (raw.certDate as string) || null,
          expiryDate,
          status,
          notes: (raw.notes as string) || null,
        })
        .where(eq(sioCertifications.id, id))
      revalidateSioPaths()
      return { status: 'success', message: 'Sertifikasi diperbarui.' }
    }

    if (intent === 'delete') {
      await db.delete(sioCertifications).where(eq(sioCertifications.id, id))
      revalidateSioPaths()
      return { status: 'success', message: 'Sertifikasi dihapus.' }
    }

    return { status: 'error', message: 'Intent tidak dikenal.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Gagal memproses sertifikasi.' }
  }
}

const INITIAL_SIO_IMPORT_STATE = { status: 'idle' as const, message: '', importedCount: 0, updatedCount: 0, skippedCount: 0 }
type SioImportState = { status: string; message: string; importedCount: number; updatedCount: number; skippedCount: number }

export async function importSioCertAction(
  _previousState: SioImportState,
  formData: FormData
): Promise<SioImportState> {
  try {
    await ensureHeroSeedData()
    const rawCsv = `${formData.get('rawCsv') ?? ''}`.trim()
    if (!rawCsv) return { ...INITIAL_SIO_IMPORT_STATE, status: 'error', message: 'Data CSV kosong.' }

    const { records } = parseSioCsv(rawCsv)
    if (records.length === 0) return { ...INITIAL_SIO_IMPORT_STATE, status: 'error', message: 'Tidak ada record.' }

    const employeeRows = await db
      .select({ id: employees.id, name: employees.name, email: employees.email, employeeSn: employees.employeeSn })
      .from(employees)
      .where(eq(employees.isActive, true))

    const existingRows = await db
      .select({ id: sioCertifications.id, employeeId: sioCertifications.employeeId, certType: sioCertifications.certType, certName: sioCertifications.certName })
      .from(sioCertifications)

    const fuse = new Fuse(
      employeeRows.map((e) => ({ ...e, normalizedName: normalizeSioName(e.name) })),
      { keys: ['normalizedName'], threshold: 0.35, includeScore: true }
    )
    const employeeBySn = new Map(employeeRows.filter((e) => e.employeeSn).map((e) => [normalizeSioName(e.employeeSn), e]))
    const employeeByEmail = new Map(employeeRows.filter((e) => e.email).map((e) => [normalizeSioName(e.email), e]))
    const employeesByName = employeeRows.reduce<Map<string, typeof employeeRows>>((m, e) => {
      const k = normalizeSioName(e.name)
      ;(m.get(k) ?? m.set(k, []).get(k)!).push(e)
      return m
    }, new Map())

    const existingByKey = new Map(existingRows.map((r) => [`${r.employeeId}:${normalizeSioName(r.certType)}:${normalizeSioName(r.certName)}`, r]))

    let importedCount = 0
    let updatedCount = 0
    let skippedCount = 0

    for (const row of records) {
      const sn = normalizeSioName(row.employeeSn || '')
      const name = row.employeeName ? normalizeSioName(row.employeeName) : ''
      const email = row.email ? normalizeSioName(row.email) : ''
      const certType = (row.certType || 'SIO').toUpperCase()
      const certName = (row.certName || '').trim()
      if (!certName) { skippedCount++; continue }

      let employee = employeeBySn.get(sn) ?? employeeByEmail.get(email) ?? undefined
      if (!employee && name) {
        const candidates = employeesByName.get(name)
        if (candidates?.length === 1) employee = candidates[0]
        else {
          const results = fuse.search(name)
          if (results.length > 0 && (results[0].score ?? 1) <= 0.35) employee = results[0].item
        }
      }
      if (!employee) { skippedCount++; continue }

      const certDate = row.certDate || null
      const expiryDate = row.expiryDate || null
      const status = row.status || inferSioStatus(expiryDate)

      const key = `${employee.id}:${normalizeSioName(certType)}:${normalizeSioName(certName)}`
      const existing = existingByKey.get(key)

      if (existing) {
        await db.update(sioCertifications).set({ certNumber: row.certNumber || null, certDate, expiryDate, status, issuingBody: row.issuingBody || null, lastSyncFrom: 'excel' }).where(eq(sioCertifications.id, existing.id))
        updatedCount++
      } else {
        await db.insert(sioCertifications).values({ employeeId: employee.id, certType, certNumber: row.certNumber || null, certName, issuingBody: row.issuingBody || null, certDate, expiryDate, status, lastSyncFrom: 'excel' })
        importedCount++
      }
    }

    revalidateSioPaths()
    return { status: 'success', message: `Import selesai. ${importedCount} baru, ${updatedCount} update, ${skippedCount} skip.`, importedCount, updatedCount, skippedCount }
  } catch (error) {
    return { ...INITIAL_SIO_IMPORT_STATE, status: 'error', message: error instanceof Error ? error.message : 'Gagal import.' }
  }
}

function normalizeSioName(value: string): string {
  let s = value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ')
  const words = s.split(' ')
  if (words.length > 0 && ['m', 'muhammad', 'mohammad', 'muhamad', 'mochamad'].includes(words[0])) words[0] = 'm'
  return words.join(' ')
}

function revalidateSioPaths() {
  revalidatePath('/dashboard/training-records')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/analytics')
}

function parseSioCsv(rawCsv: string) {
  const lines = rawCsv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return { records: [] as any[] }

  const h = lines[0].split(',').map((c) => c.trim().toLowerCase())
  const idx = (name: string) => h.findIndex((c) => c.includes(name))

  const ni = Math.max(idx('name'), 0)
  const si = Math.max(idx('sn'), idx('employee'), 0)
  const ci = Math.max(idx('jenis'), idx('cert_name'), 0)
  const cti = Math.max(idx('cert_type'), idx('tipe'), 0)
  const cni = Math.max(idx('cert_number'), idx('nomor'), 0)
  const ibi = Math.max(idx('issuing_body'), idx('note'), idx('penerbit'), 0)
  const cdi = Math.max(idx('tanggal'), idx('cert_date'), idx('certificate_date'), 0)
  const edi = Math.max(idx('masa'), idx('expiry'), idx('expiry_date'), idx('berlaku'), 0)
  const ei = Math.max(idx('email'), 0)

  const records = lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim())
    return {
      employeeName: ni > 0 && cols[ni] ? cols[ni] : '',
      employeeSn: si > 0 ? cols[si] || '' : '',
      email: ei > 0 ? cols[ei] || '' : '',
      certType: cti > 0 ? cols[cti] || '' : 'SIO',
      certName: ci > 0 ? cols[ci] || '' : '',
      certNumber: cni > 0 ? cols[cni] || '' : '',
      issuingBody: ibi > 0 ? cols[ibi] || '' : '',
      certDate: cdi > 0 ? parseSioExcelDate(cols[cdi]) : null,
      expiryDate: edi > 0 ? parseSioExcelDate(cols[edi]) : null,
      status: '',
    }
  })

  return { records }
}

function parseSioExcelDate(value: string): string | null {
  if (!value || value === '-' || value === '') return null
  const num = Number(value)
  if (!isNaN(num) && num > 40000 && num < 60000) {
    return new Date((num - 25569) * 86400 * 1000).toISOString().split('T')[0]
  }
  const d = new Date(value)
  return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : null
}
