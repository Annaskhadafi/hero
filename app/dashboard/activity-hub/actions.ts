'use server'

import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { db } from '@/db'
import { getPublicAppUrl } from '@/lib/auth-config'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import {
  sendDailyActivityStepApprovalEmail,
  sendDailyActivityCompletedEmail,
  sendDailyActivityRejectedEmail,
  sendDailyActivityRevertedEmail,
  publishInAppApprovalNotification,
} from '@/lib/activity-overtime-workflow-email'
import {
  type DailyActivityWorkflowSettings,
  DEFAULT_DAILY_ACTIVITY_SETTINGS,
} from '@/lib/workflow-settings-defaults'

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Ignore when executed outside Next.js request context (e.g. tests)
  }
}

async function withDbRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 300): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (err: any) {
      attempt++
      const errStr = String(err?.message || err?.cause?.message || err || '').toLowerCase()
      const isNetworkError =
        err?.code === 'ECONNRESET' ||
        err?.code === '53300' ||
        errStr.includes('econnreset') ||
        errStr.includes('connection terminated') ||
        errStr.includes('timeout exceeded') ||
        errStr.includes('trying to connect') ||
        errStr.includes('too many clients') ||
        errStr.includes('sorry, too many clients') ||
        errStr.includes('connection reset') ||
        errStr.includes('remaining connection slots are reserved')
      if (attempt <= retries && isNetworkError) {
        await new Promise((res) => setTimeout(res, delayMs * attempt))
        continue
      }
      throw err
    }
  }
}
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getServerSession } from '@/lib/auth-session'
import {
  getUserSignatureAction as getUserSignatureActionInternal,
  saveUserSignatureAction as saveUserSignatureActionInternal,
} from '@/app/actions/user-signature'
import { timesheetAttendanceRealOverrides } from '@/db/schema/timesheet'
import {
  activities,
  activityLibraries,
  activityModifiers,
  activityPhotos,
  activityRouteGroups,
  activityRouteItems,
  activityRouteTemplates,
  activitySectionPointOverrides,
  approvals,
  dailyActivityApprovals,
  dailyActivityConfigs,
  dailyActivitySessionItems,
  dailyActivitySessionTeamMembers,
  dailyActivitySessionSignoffs,
  dailyActivitySessions,
  employees,
  jobAssignments,
  masterDepartments,
  masterPositions,
  masterSections,
  overtimeCommandLetterItems,
  overtimeCommandLetterParticipants,
  overtimeCommandLetters,
  overtimeRequestLeaderPermissions,
  penaltyEvents,
  pointDisputes,
  pointEvents,
  sites,
  streakRecords,
  hcContractReviewSettings,
  emailTemplates,
} from '@/db/schema/hero'
import {
  type ActivityLibraryImportState,
  getActivityLibraryImportValue,
  parseActivityLibraryBoolean,
  parseActivityLibraryCsv,
  parseActivityLibraryInteger,
} from '@/lib/activity-library-import'
import {
  DAILY_ACTIVITY_REVALIDATE_PATHS,
  ensureDailyActivitySeedData,
  getDailyActivityConfigMap,
  getManagedEmployeeIdsForLead,
} from '@/lib/daily-activity'
import { auth } from '@/lib/auth'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { resolveApprovalRouteForActivity, serializeApprovalRoute } from '@/lib/approval-engine'
import { logAuditEvent } from '@/lib/audit-logger'
import {
  cancelLegacyApprovalSubmission,
  createLegacyApprovalRequest,
} from '@/lib/legacy-approval-engine'
import { createNotificationEventForEmployee, sendPushNotification } from '@/lib/push-notifications'
import { uploadAnyFileToS3 } from '@/lib/s3-storage'
import { buildWorkflowEmailContent, getAppUrl, sendWorkflowEmail } from '@/lib/workflow-email'
import { assertNoSplOverlap, buildSplParticipantSnapshots, getSiteSplPolicy } from '@/lib/spl-data'
import { validateSplRequestWindow } from '@/lib/spl-policy'
import { getHeadLocationManagedEmployeeIds } from '@/lib/overtime-request-data'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { evaluatePointThresholdBadges } from '@/lib/hero-admin'

const MAX_ACTIVITY_PHOTO_SIZE = 5 * 1024 * 1024
const MAX_SIGNATURE_FILE_SIZE = 2 * 1024 * 1024

const optionalPositiveInt = z.preprocess((value) => {
  if (value === '' || value == null || value === '0') {
    return undefined
  }

  return value
}, z.coerce.number().int().positive().optional())

const formBoolean = (defaultValue = false) =>
  z.preprocess((value) => {
    if (value === '' || value == null) {
      return defaultValue
    }

    if (typeof value === 'string') {
      return value === 'true' || value === 'on'
    }

    return Boolean(value)
  }, z.boolean())

const manageLibrarySchema = z.object({
  intent: z.enum(['create', 'update', 'delete']),
  id: optionalPositiveInt,
  activityCode: z.string().trim().min(2).max(24).optional().default(''),
  activityName: z.string().trim().min(3).max(160).optional().default(''),
  category: z.string().trim().min(3).max(50).optional().default('Technical'),
  siteId: optionalPositiveInt,
  siteIds: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return []
      return value
        .split(',')
        .map((part) => parseInt(part.trim(), 10))
        .filter((part) => Number.isInteger(part) && (part > 0 || part === -1))
    }),
  departmentId: optionalPositiveInt,
  departmentIds: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return []
      return value
        .split(',')
        .map((part) => parseInt(part.trim(), 10))
        .filter((part) => Number.isInteger(part) && part > 0)
    }),
  sectionId: optionalPositiveInt,
  sectionIds: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return []
      return value
        .split(',')
        .map((part) => parseInt(part.trim(), 10))
        .filter((part) => Number.isInteger(part) && part > 0)
    }),
  basePoints: z.coerce.number().int().min(0).max(500).optional().default(5),
  complexityLevel: z.coerce.number().int().min(1).max(5).optional().default(1),
  maxDailyCount: z.coerce.number().int().min(1).max(20).optional().default(3),
  maxPointsPerDay: z.coerce.number().int().min(1).max(1000).optional().default(50),
  slaHours: z.coerce.number().int().min(1).max(240).optional().default(24),
  requiresPhoto: formBoolean(false),
  requiresEquipmentNo: formBoolean(false),
  requiresDuration: formBoolean(true),
  requiresLocationGps: formBoolean(false),
  requiresMaterialUsed: formBoolean(false),
  requiresTireCount: formBoolean(false),
  isAssignable: formBoolean(true),
  isSelfInput: formBoolean(true),
  approvalRequired: formBoolean(true),
  autoApproveIfGpsValid: formBoolean(false),
  isActive: formBoolean(true),
  createdByEmployeeId: optionalPositiveInt,
  isGroupActivity: formBoolean(false),
  routeGroupIds: z.string().optional().transform(v => {
    if (!v) return []
    return v.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n))
  }),
  childActivityIds: z.string().optional().transform(v => {
    if (!v) return []
    return v.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n))
  }),
}).transform(data => {
  if (!data.isGroupActivity) {
    data.routeGroupIds = []
    data.childActivityIds = []
  }
  return data
})

const manageAssignmentSchema = z.object({
  intent: z.enum(['create', 'update-status', 'delete']),
  id: optionalPositiveInt,
  assignedByEmployeeId: z.coerce.number().int().positive().optional(),
  assignedToEmployeeId: z.coerce.number().int().positive().optional(),
  siteId: z.coerce.number().int().positive().optional(),
  libraryActivityId: optionalPositiveInt,
  customJobName: z.string().trim().max(160).optional().default(''),
  priority: z.string().trim().min(3).max(40).optional().default('Normal'),
  estimatedDuration: z.coerce.number().int().min(5).max(720).optional().default(60),
  notes: z.string().trim().max(1000).optional().default(''),
  assignmentType: z.string().trim().min(3).max(40).optional().default('individual'),
  assignedDate: z.string().trim().optional().default(''),
  deadline: z.string().trim().optional().default(''),
  status: z.string().trim().min(3).max(40).optional().default('NOT_STARTED'),
  isMandatory: formBoolean(false),
  isRecurring: formBoolean(false),
  recurrenceRule: z.string().trim().max(160).optional().default(''),
})

const manageRouteTemplateSchema = z.object({
  intent: z.enum(['create', 'update', 'delete']),
  id: optionalPositiveInt,
  routeCode: z.string().trim().min(2).max(40).optional().default(''),
  routeName: z.string().trim().min(3).max(160).optional().default(''),
  description: z.string().trim().max(600).optional().default(''),
  siteId: optionalPositiveInt,
  departmentId: optionalPositiveInt,
  sectionId: optionalPositiveInt,
  positionId: optionalPositiveInt,
  shiftCode: z.string().trim().min(2).max(24).optional().default('ALL'),
  versionLabel: z.string().trim().min(1).max(24).optional().default('v1'),
  mobileEnabled: formBoolean(true),
  approvalRequired: formBoolean(false),
  isActive: formBoolean(true),
})

const manageRouteGroupSchema = z.object({
  intent: z.enum(['create', 'update', 'delete']),
  id: optionalPositiveInt,
  routeTemplateId: optionalPositiveInt,
  groupKey: z.string().trim().min(2).max(40).optional().default(''),
  groupName: z.string().trim().min(2).max(120).optional().default(''),
  description: z.string().trim().max(400).optional().default(''),
  sortOrder: z.coerce.number().int().min(1).max(999).optional().default(1),
  isRequired: formBoolean(true),
})

const manageRouteItemSchema = z.object({
  intent: z.enum(['create', 'update', 'delete']),
  id: optionalPositiveInt,
  routeGroupId: optionalPositiveInt,
  libraryActivityId: optionalPositiveInt,
  itemCode: z.string().trim().max(40).optional().default(''),
  itemLabel: z.string().trim().min(2).max(160).optional().default(''),
  itemDescription: z.string().trim().max(600).optional().default(''),
  pointOverride: z.preprocess((value) => {
    if (value === '' || value == null) return undefined
    return value
  }, z.coerce.number().int().min(0).max(1000).optional()),
  sortOrder: z.coerce.number().int().min(1).max(999).optional().default(1),
  requiresUnit: formBoolean(false),
  requiresTime: formBoolean(true),
  requiresRemark: formBoolean(false),
  requiresPhoto: formBoolean(false),
  requiresChecklistEvidence: formBoolean(false),
  isOptional: formBoolean(false),
  allowCustomUnit: formBoolean(true),
})

const manageSectionOverrideSchema = z.object({
  intent: z.enum(['create', 'update', 'delete']),
  id: optionalPositiveInt,
  siteId: optionalPositiveInt,
  departmentId: optionalPositiveInt,
  sectionId: optionalPositiveInt,
  positionId: optionalPositiveInt,
  libraryActivityId: optionalPositiveInt,
  overrideLabel: z.string().trim().max(160).optional().default(''),
  overridePoints: z.preprocess((value) => {
    if (value === '' || value == null) return undefined
    return value
  }, z.coerce.number().int().min(0).max(1000).optional()),
  reason: z.string().trim().max(600).optional().default(''),
  isActive: formBoolean(true),
})

const overtimeCommandLetterLineSchema = z.object({
  assignedEmployeeId: z.coerce.number().int().positive(),
  routeTemplateId: optionalPositiveInt,
  routeItemId: optionalPositiveInt,
  libraryActivityId: optionalPositiveInt,
  lineLabel: z.string().trim().min(2).max(160),
  lineDescription: z.string().trim().max(600).optional().default(''),
  targetUnit: z.string().trim().max(120).optional().default(''),
  estimatedMinutes: z.coerce.number().int().min(1).max(1440).optional().default(60),
  plannedPoints: z.coerce.number().int().min(0).max(2000).optional().default(0),
  sortOrder: z.coerce.number().int().min(1).max(999).optional().default(1),
  isCustomLine: z.boolean().optional().default(false),
})

const manageOvertimeCommandLetterSchema = z.object({
  intent: z.enum(['create', 'update', 'delete']),
  id: optionalPositiveInt,
  title: z.string().trim().min(3).max(180).optional().default(''),
  workDate: z.string().trim().optional().default(''),
  plannedStartAt: z.string().trim().optional().default(''),
  plannedEndAt: z.string().trim().optional().default(''),
  status: z.enum(['draft', 'returned']).optional().default('draft'),
  requestNotes: z.string().trim().max(1200).optional().default(''),
  executionNotes: z.string().trim().max(1200).optional().default(''),
  sectionId: optionalPositiveInt,
  positionId: optionalPositiveInt,
  origin: z.enum(['employee_request', 'leader_command']).optional().default('leader_command'),
  requestKind: z.enum(['base', 'extension']).optional().default('base'),
  parentSplId: optionalPositiveInt,
  replacementOffDate: z.string().trim().optional().default(''),
  submitNow: formBoolean(false),
  lineItemsJson: z.string().trim().max(120000).optional().default('[]'),
})

const transitionOvertimeCommandLetterStatusSchema = z.object({
  id: z.coerce.number().int().positive(),
  targetStatus: z.enum(['submitted', 'closed']),
})

const manageOvertimeRequestLeaderPermissionSchema = z.object({
  leaderEmployeeId: z.coerce.number().int().positive(),
  isActive: formBoolean(false),
  note: z.string().trim().max(600).optional().default(''),
})

const submitActivitySchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  assignmentId: optionalPositiveInt,
  libraryActivityId: optionalPositiveInt,
  routeTemplateId: optionalPositiveInt,
  overtimeCommandLetterId: optionalPositiveInt,
  sourceMode: z.enum(['assigned', 'self_input', 'custom']).optional().default('self_input'),
  customActivityName: z.string().trim().max(160).optional().default(''),
  customActivityDescription: z.string().trim().max(1200).optional().default(''),
  routeShiftCode: z.string().trim().max(24).optional().default(''),
  routeSummaryRemark: z.string().trim().max(1200).optional().default(''),
  routeSessionItemsJson: z.string().trim().max(120000).optional().default(''),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1),
  equipmentNo: z.string().trim().max(80).optional().default(''),
  tireCount: z.coerce.number().int().min(0).max(100).optional().default(0),
  materialUsed: z.string().trim().max(500).optional().default(''),
  notes: z.string().trim().max(1200).optional().default(''),
  gpsLat: z.string().trim().max(80).optional().default(''),
  gpsLng: z.string().trim().max(80).optional().default(''),
  gpsValid: formBoolean(false),
  photoUrl: z.string().trim().max(1000).optional().default(''),
  photoUrlsJson: z.string().trim().max(200000).optional().default('[]'),
  teamMemberEmployeeIdsJson: z.string().trim().max(10000).optional().default('[]'),
})

const createConfigSchema = z.object({
  configKey: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9_]+$/i, 'Config Key hanya boleh berisi huruf, angka, dan underscore (_)'),
  configLabel: z.string().trim().min(2).max(160),
  configValue: z.string().trim().max(10000).optional().default(''),
  valueType: z.enum(['boolean', 'number', 'text', 'json']).default('text'),
  description: z.string().trim().max(600).optional().default(''),
  siteId: optionalPositiveInt,
  isActive: z.boolean().default(true),
})

const updateConfigSchema = z.object({
  id: z.coerce.number().int().positive(),
  configLabel: z.string().trim().min(2).max(160),
  configValue: z.string().trim().max(10000).optional().default(''),
  valueType: z.enum(['boolean', 'number', 'text', 'json']).default('text'),
  description: z.string().trim().max(600).optional().default(''),
  siteId: optionalPositiveInt,
  isActive: z.boolean().default(true),
})

const deleteConfigSchema = z.object({
  id: z.coerce.number().int().positive(),
})

const manageModifierSchema = z.object({
  intent: z.enum(['create', 'update', 'delete']),
  id: optionalPositiveInt,
  siteId: optionalPositiveInt,
  createdByEmployeeId: optionalPositiveInt,
  eventName: z.string().trim().min(3).max(160).optional().default(''),
  description: z.string().trim().max(600).optional().default(''),
  multiplier: z.coerce.number().int().min(100).max(500).optional().default(100),
  startDate: z.string().trim().optional().default(''),
  endDate: z.string().trim().optional().default(''),
  isActive: formBoolean(true),
})

const submitDisputeSchema = z.object({
  penaltyEventId: z.coerce.number().int().positive(),
  employeeId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(20).max(1200),
  evidenceUrls: z.string().trim().max(4000).optional().default(''),
})

const resolveDisputeSchema = z.object({
  disputeId: z.coerce.number().int().positive(),
  resolvedByEmployeeId: z.coerce.number().int().positive(),
  decision: z.enum(['approved', 'rejected']),
  resolutionNotes: z.string().trim().min(5).max(1200),
})

type DailyActivitySubmitActionState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

type DailyActivityDocumentSignoffActionState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

const routeSessionItemSchema = z.object({
  routeItemId: optionalPositiveInt,
  overtimeCommandLetterItemId: optionalPositiveInt,
  libraryActivityId: optionalPositiveInt,
  snapshotLabel: z.string().trim().min(1).max(160),
  snapshotGroupName: z.string().trim().max(160).optional().default(''),
  snapshotPayload: z.record(z.string(), z.unknown()).optional().default({}),
  unitNumber: z.string().trim().max(80).optional().default(''),
  remark: z.string().trim().max(600).optional().default(''),
  startedAt: z.string().trim().optional().default(''),
  endedAt: z.string().trim().optional().default(''),
  isChecked: z.boolean(),
  actualPoints: z.coerce.number().int().min(0).max(1000).optional(),
  tireCount: z.coerce.number().int().min(0).max(100).optional().default(0),
  materialUsed: z.string().trim().max(500).optional().default(''),
  sortOrder: z.coerce.number().int().min(1).max(999).optional().default(1),
})

const updateDailyActivitySessionDocumentSignoffSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  signoffSection: z.enum(['employee', 'hr']),
  employeeSignerName: z.string().trim().max(120).optional().default(''),
  customerSignerName: z.string().trim().max(120).optional().default(''),
  hrCheckerName: z.string().trim().max(120).optional().default(''),
  hrChecklistStatus: z.enum(['pending', 'checked', 'revision']).optional().default('pending'),
  hrChecklistNote: z.string().trim().max(1200).optional().default(''),
})

function revalidateDailyActivitySurfaces() {
  for (const path of DAILY_ACTIVITY_REVALIDATE_PATHS) {
    safeRevalidatePath(path)
  }
}

async function getAuthenticatedEmployeeContext() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.email) {
    throw new Error('Login session not found.')
  }

  const [employeeByAuthUserId] = session.user.id
    ? await db
        .select({
          id: employees.id,
          authUserId: employees.authUserId,
          email: employees.email,
          name: employees.name,
          role: employees.role,
          accessRole: employees.accessRole,
          siteId: employees.siteId,
          departmentId: employees.departmentId,
          sectionId: employees.sectionId,
          positionId: employees.positionId,
          totalPoints: employees.totalPoints,
          directManagerId: employees.directManagerId,
        })
        .from(employees)
        .where(eq(employees.authUserId, session.user.id))
        .limit(1)
    : []
  const [employee] =
    employeeByAuthUserId != null
      ? [employeeByAuthUserId]
      : await db
          .select({
            id: employees.id,
            authUserId: employees.authUserId,
            email: employees.email,
            name: employees.name,
            role: employees.role,
            accessRole: employees.accessRole,
            siteId: employees.siteId,
            departmentId: employees.departmentId,
            sectionId: employees.sectionId,
            positionId: employees.positionId,
            totalPoints: employees.totalPoints,
            directManagerId: employees.directManagerId,
          })
          .from(employees)
          .where(sql`lower(${employees.email}) = ${session.user.email.trim().toLowerCase()}`)
          .limit(1)

  if (employee) {
    if (!employee.authUserId && session.user.id) {
      await db
        .update(employees)
        .set({ authUserId: session.user.id })
        .where(eq(employees.id, employee.id))
    }

    return {
      ...employee,
      authUserId: employee.authUserId ?? session.user.id ?? null,
    }
  }

  throw new Error('Profil karyawan login tidak ditemukan.')
}

function getReadableActionError(error: unknown, fallbackMessage: string) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallbackMessage
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallbackMessage
}

function normalizeEvidenceUrls(value: string) {
  if (value.trim().length === 0) {
    return JSON.stringify([])
  }

  const urls = value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5)

  return JSON.stringify(urls)
}

function buildDailySessionCode(
  employeeId: number,
  routeTemplateId: number | null,
  overtimeCommandLetterId: number | null,
  workDate: Date
) {
  const dateCode = workDate.toISOString().slice(0, 10).replaceAll('-', '')
  return `DAS-${dateCode}-${employeeId}-${routeTemplateId ?? 0}-${overtimeCommandLetterId ?? 0}`
}

function buildSplNumber(
  siteId: number,
  employeeId: number,
  workDate: Date,
  plannedStartAt: Date,
  plannedEndAt: Date
) {
  const dateCode = workDate.toISOString().slice(0, 10).replaceAll('-', '')
  const timeCode = (value: Date) =>
    `${String(value.getHours()).padStart(2, '0')}${String(value.getMinutes()).padStart(2, '0')}`
  return `SPL-${siteId}-${employeeId}-${dateCode}-${timeCode(plannedStartAt)}-${timeCode(plannedEndAt)}`
}

function parseRouteSessionItems(value: string) {
  if (value.trim().length === 0) {
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('Payload checklist route tidak valid.')
  }

  return z.array(routeSessionItemSchema).parse(parsed)
}

function parseOvertimeCommandLetterLines(value: string) {
  let parsed: unknown = []

  try {
    parsed = value.trim().length === 0 ? [] : JSON.parse(value)
  } catch {
    throw new Error('Payload line SPL tidak valid.')
  }

  return z.array(overtimeCommandLetterLineSchema).parse(parsed)
}

function canManageOvertimeRequestSettings(
  employee: Awaited<ReturnType<typeof getAuthenticatedEmployeeContext>>
) {
  return ['Super Admin', 'Site Admin', 'HC Manager'].includes(employee.accessRole)
}

async function getOvertimeRequestLeaderPermission(
  employee: Awaited<ReturnType<typeof getAuthenticatedEmployeeContext>>
) {
  const [permission] = await db
    .select({
      id: overtimeRequestLeaderPermissions.id,
      isActive: overtimeRequestLeaderPermissions.isActive,
    })
    .from(overtimeRequestLeaderPermissions)
    .where(
      and(
        eq(overtimeRequestLeaderPermissions.siteId, employee.siteId),
        eq(overtimeRequestLeaderPermissions.leaderEmployeeId, employee.id)
      )
    )
    .limit(1)

  return permission ?? null
}

async function assertOvertimeRequestCreationAccess(
  employee: Awaited<ReturnType<typeof getAuthenticatedEmployeeContext>>
) {
  const permission = await getOvertimeRequestLeaderPermission(employee)

  if (permission?.isActive) {
    return permission
  }

  throw new Error('Anda belum dipilih sebagai pemberi perintah lembur pada Settings SPL.')
}

async function sendSplSubmissionEmail(input: {
  email: string
  requesterName: string
  splNumber: string
  title: string
  requestKind: 'base' | 'extension'
}) {
  if (!input.email) return
  const content = buildWorkflowEmailContent({
    title: input.requestKind === 'extension' ? 'Extension SPL diajukan' : 'SPL diajukan',
    intro: `${input.splNumber} - ${input.title} sudah masuk ke Approval Engine.`,
    ctaLabel: 'Lihat Riwayat SPL',
    ctaUrl: getAppUrl('/mobile/overtime?tab=history'),
  })
  await sendWorkflowEmail({
    to: input.email,
    actorEmail: input.email,
    templateCode: input.requestKind === 'extension' ? 'spl_extension_submitted' : 'spl_submitted',
    templateName: input.requestKind === 'extension' ? 'SPL Extension Submitted' : 'SPL Submitted',
    variables: { splNumber: input.splNumber, requesterName: input.requesterName, duration: '' },
    fallbackSubject: `${input.splNumber} menunggu approval`,
    fallbackHtml: content.html,
    fallbackText: content.text,
  })
}

async function uploadSignatureFile(file: FormDataEntryValue | null, prefix: string) {
  if (!(file instanceof File) || file.size === 0) {
    return null
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Signature file must be an image.')
  }

  if (file.size > MAX_SIGNATURE_FILE_SIZE) {
    throw new Error('Signature file too large. Max 2MB.')
  }

  const uploaded = await uploadAnyFileToS3(file, prefix)
  return uploaded.url
}

const overtimeCommandLetterStatusTransitions: Record<string, readonly string[]> = {
  draft: ['submitted'],
  returned: ['submitted'],
  approved: ['closed'],
} as const

type DailyActivityTx = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function syncDailyRouteSessionForActivity(params: {
  tx: DailyActivityTx
  activityId: number
  employee: Awaited<ReturnType<typeof getAuthenticatedEmployeeContext>>
  payload: z.infer<typeof submitActivitySchema>
  submissionTime: Date
  startTime: Date
}) {
  const routeItems = parseRouteSessionItems(params.payload.routeSessionItemsJson)
  const hasRoutePayload =
    Boolean(params.payload.routeTemplateId) ||
    Boolean(params.payload.overtimeCommandLetterId) ||
    routeItems.length > 0

  if (!hasRoutePayload) {
    return null
  }

  const workDate = startOfDay(params.startTime)
  const workDateEnd = endOfDay(params.startTime)
  const [existingSession] = await params.tx
    .select({
      id: dailyActivitySessions.id,
      sessionCode: dailyActivitySessions.sessionCode,
    })
    .from(dailyActivitySessions)
    .where(
      and(
        eq(dailyActivitySessions.employeeId, params.employee.id),
        gte(dailyActivitySessions.workDate, workDate),
        lte(dailyActivitySessions.workDate, workDateEnd),
        params.payload.routeTemplateId
          ? eq(dailyActivitySessions.routeTemplateId, params.payload.routeTemplateId)
          : sql`${dailyActivitySessions.routeTemplateId} is null`,
        params.payload.overtimeCommandLetterId
          ? eq(
              dailyActivitySessions.overtimeCommandLetterId,
              params.payload.overtimeCommandLetterId
            )
          : sql`${dailyActivitySessions.overtimeCommandLetterId} is null`
      )
    )
    .orderBy(desc(dailyActivitySessions.updatedAt))
    .limit(1)

  const sessionValues = {
    siteId: params.employee.siteId,
    employeeId: params.employee.id,
    activityId: params.activityId,
    departmentId: params.employee.departmentId ?? null,
    sectionId: params.employee.sectionId ?? null,
    positionId: params.employee.positionId ?? null,
    routeTemplateId: params.payload.routeTemplateId ?? null,
    overtimeCommandLetterId: params.payload.overtimeCommandLetterId ?? null,
    legacyAssignmentId: params.payload.assignmentId ?? null,
    shiftCode: params.payload.routeShiftCode || 'ALL',
    workDate,
    status: routeItems.some((item) => item.isChecked) ? 'submitted' : 'draft',
    submissionSource:
      params.payload.overtimeCommandLetterId != null
        ? 'spl_route'
        : params.payload.routeTemplateId
          ? 'route'
          : params.payload.sourceMode,
    startedAt: params.startTime,
    submittedAt: params.submissionTime,
    approvedAt: null,
    summaryRemark: params.payload.routeSummaryRemark,
    updatedAt: new Date(),
  }

  const sessionId =
    existingSession?.id ??
    (
      await params.tx
        .insert(dailyActivitySessions)
        .values({
          ...sessionValues,
          sessionCode: buildDailySessionCode(
            params.employee.id,
            params.payload.routeTemplateId ?? null,
            params.payload.overtimeCommandLetterId ?? null,
            workDate
          ),
          createdAt: new Date(),
        })
        .returning({ id: dailyActivitySessions.id })
    )[0].id

  if (existingSession) {
    await params.tx
      .update(dailyActivitySessions)
      .set(sessionValues)
      .where(eq(dailyActivitySessions.id, existingSession.id))
  }

  await params.tx
    .delete(dailyActivitySessionItems)
    .where(eq(dailyActivitySessionItems.sessionId, sessionId))

  if (routeItems.length > 0) {
    const splLineRows =
      params.payload.overtimeCommandLetterId == null
        ? []
        : await params.tx
            .select({
              id: overtimeCommandLetterItems.id,
              routeItemId: overtimeCommandLetterItems.routeItemId,
              libraryActivityId: overtimeCommandLetterItems.libraryActivityId,
            })
            .from(overtimeCommandLetterItems)
            .where(
              eq(
                overtimeCommandLetterItems.overtimeCommandLetterId,
                params.payload.overtimeCommandLetterId
              )
            )
            .orderBy(asc(overtimeCommandLetterItems.sortOrder), asc(overtimeCommandLetterItems.id))

    const unusedLineIds = new Set(splLineRows.map((row) => row.id))

    function matchSplLine(item: (typeof routeItems)[number]) {
      if (item.overtimeCommandLetterItemId != null) {
        return item.overtimeCommandLetterItemId
      }

      const matched =
        splLineRows.find(
          (row) =>
            unusedLineIds.has(row.id) &&
            row.routeItemId != null &&
            item.routeItemId != null &&
            row.routeItemId === item.routeItemId
        ) ??
        splLineRows.find(
          (row) =>
            unusedLineIds.has(row.id) &&
            row.libraryActivityId != null &&
            item.libraryActivityId != null &&
            row.libraryActivityId === item.libraryActivityId
        ) ??
        null

      if (matched) {
        unusedLineIds.delete(matched.id)
      }

      return matched?.id ?? null
    }

    await params.tx.insert(dailyActivitySessionItems).values(
      routeItems.map((item) => ({
        sessionId,
        routeItemId: item.routeItemId ?? null,
        libraryActivityId: item.libraryActivityId ?? null,
        overtimeCommandLetterItemId: matchSplLine(item),
        snapshotLabel: item.snapshotLabel,
        snapshotGroupName: item.snapshotGroupName,
        snapshotPayload: JSON.stringify(item.snapshotPayload ?? {}),
        startedAt: item.startedAt ? parseDateTime(item.startedAt, 'Checklist start time') : null,
        endedAt: item.endedAt ? parseDateTime(item.endedAt, 'Checklist end time') : null,
        checkedAt: item.isChecked ? params.submissionTime : null,
        unitNumber: item.unitNumber,
        remark: item.remark,
        actualPoints: item.isChecked ? (item.actualPoints ?? 0) : 0,
        tireCount: item.isChecked ? (item.tireCount ?? 0) : 0,
        isChecked: item.isChecked,
        isCustomItem: false,
        photoCount: 0,
        sortOrder: item.sortOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    )
  }

  return sessionId
}

function normalizeImportLookup(value: string | number | null | undefined) {
  return `${value ?? ''}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
}

function resolveMasterReference(
  value: string,
  rows: Array<{ id: number; code: string; name: string }>
) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const numericId = Number(trimmed)
  if (Number.isInteger(numericId) && numericId > 0) {
    return rows.find((row) => row.id === numericId)?.id ?? null
  }

  const normalized = normalizeImportLookup(trimmed)
  return (
    rows.find(
      (row) =>
        normalizeImportLookup(row.code) === normalized ||
        normalizeImportLookup(row.name) === normalized
    )?.id ?? null
  )
}

function resolveSiteReference(
  value: string,
  rows: Array<{ id: number; contractNumber: string; name: string; location: string }>
) {
  const trimmed = value.trim()
  if (!trimmed) return null

  const numericId = Number(trimmed)
  if (Number.isInteger(numericId) && numericId > 0) {
    return rows.find((row) => row.id === numericId)?.id ?? null
  }

  const normalized = normalizeImportLookup(trimmed)
  return (
    rows.find(
      (row) =>
        normalizeImportLookup(row.name) === normalized ||
        normalizeImportLookup(row.location) === normalized ||
        normalizeImportLookup(row.contractNumber) === normalized
    )?.id ?? null
  )
}

async function getImportCsvText(formData: FormData) {
  const file = formData.get('file')
  if (
    file &&
    typeof file === 'object' &&
    'size' in file &&
    'text' in file &&
    typeof file.text === 'function' &&
    Number(file.size) > 0
  ) {
    return file.text()
  }

  const rawCsv = formData.get('rawCsv')
  return typeof rawCsv === 'string' ? rawCsv : ''
}

function parseDateTime(value: string, label: string, baseDate?: Date | string) {
  if (!value) throw new Error(`${label} tidak valid.`)
  const trimmed = value.trim()
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const today = baseDate
      ? typeof baseDate === 'string'
        ? baseDate.slice(0, 10)
        : baseDate.toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
    const timePart = trimmed.length === 5 ? `${trimmed}:00` : trimmed
    const combined = new Date(`${today}T${timePart}`)
    if (!Number.isNaN(combined.getTime())) {
      return combined
    }
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} tidak valid.`)
  }

  return parsed
}

function startOfDay(reference: Date) {
  return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate())
}

function endOfDay(reference: Date) {
  return new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
    23,
    59,
    59,
    999
  )
}

function getSubmissionCategory(submissionTime: Date, activityEndTime: Date) {
  const sameDay =
    submissionTime.getFullYear() === activityEndTime.getFullYear() &&
    submissionTime.getMonth() === activityEndTime.getMonth() &&
    submissionTime.getDate() === activityEndTime.getDate()

  if (!sameDay) {
    return 'backdated'
  }

  const minutes = submissionTime.getHours() * 60 + submissionTime.getMinutes()
  if (minutes <= 12 * 60) {
    return 'on_time_morning'
  }
  if (minutes <= 17 * 60) {
    return 'on_time'
  }
  if (minutes <= 20 * 60) {
    return 'late_minor'
  }

  return 'late_major'
}

function getPenaltyPoints(category: string, configMap: Map<string, number>) {
  switch (category) {
    case 'late_minor':
      return Math.abs(configMap.get('penalty_pen_02') ?? -2)
    case 'late_major':
      return Math.abs(configMap.get('penalty_pen_03') ?? -5)
    case 'backdated':
      return 10
    default:
      return 0
  }
}

async function updateStreakForEmployee(employeeId: number, activityDate: Date) {
  const [existing] = await db
    .select()
    .from(streakRecords)
    .where(eq(streakRecords.employeeId, employeeId))
    .limit(1)

  if (!existing) {
    await db.insert(streakRecords).values({
      employeeId,
      streakStartDate: activityDate,
      currentStreakDays: 1,
      longestStreakDays: 1,
      lastActivityDate: activityDate,
      streakBonusActive: false,
      updatedAt: new Date(),
    })

    return
  }

  const lastDate = existing.lastActivityDate ? startOfDay(existing.lastActivityDate) : null
  const currentDate = startOfDay(activityDate)
  const diffDays =
    lastDate == null
      ? 0
      : Math.round((currentDate.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000))
  const currentStreak =
    diffDays <= 0 ? existing.currentStreakDays : diffDays === 1 ? existing.currentStreakDays + 1 : 1
  const longestStreak = Math.max(existing.longestStreakDays, currentStreak)

  await db
    .update(streakRecords)
    .set({
      currentStreakDays: currentStreak,
      longestStreakDays: longestStreak,
      lastActivityDate: activityDate,
      streakBonusActive: currentStreak >= 5,
      updatedAt: new Date(),
    })
    .where(eq(streakRecords.id, existing.id))
}

export async function awardSessionPointsToTeam(sessionId: number, tx: any = db) {
  try {
    const [session] = await tx
      .select({
        id: dailyActivitySessions.id,
        sessionCode: dailyActivitySessions.sessionCode,
        employeeId: dailyActivitySessions.employeeId,
        activityId: dailyActivitySessions.activityId,
        workDate: dailyActivitySessions.workDate,
      })
      .from(dailyActivitySessions)
      .where(eq(dailyActivitySessions.id, sessionId))
      .limit(1)

    if (!session) return

    // 1. Calculate points
    let pointsToAward = 0
    if (session.activityId) {
      const [act] = await tx
        .select({ pointsAwarded: activities.pointsAwarded })
        .from(activities)
        .where(eq(activities.id, session.activityId))
        .limit(1)
      if (act && act.pointsAwarded > 0) {
        pointsToAward = act.pointsAwarded
      }
    }

    if (pointsToAward <= 0) {
      const items = await tx
        .select({
          actualPoints: dailyActivitySessionItems.actualPoints,
          isChecked: dailyActivitySessionItems.isChecked,
        })
        .from(dailyActivitySessionItems)
        .where(eq(dailyActivitySessionItems.sessionId, sessionId))

      const checkedItems = items.filter((i: any) => i.isChecked)
      const sumPoints = checkedItems.reduce((acc: number, curr: any) => acc + (curr.actualPoints || 0), 0)
      pointsToAward = sumPoints > 0 ? sumPoints : 10
    }

    // 2. Fetch team members
    const teamRows = await tx
      .select({ employeeId: dailyActivitySessionTeamMembers.employeeId })
      .from(dailyActivitySessionTeamMembers)
      .where(eq(dailyActivitySessionTeamMembers.sessionId, sessionId))

    const allRecipientIds = Array.from(new Set([session.employeeId, ...teamRows.map((r: any) => r.employeeId)]))
    const now = new Date()

    for (const recipientId of allRecipientIds) {
      // Check idempotency - has this session already awarded points to this employee?
      const [existingEvent] = await tx
        .select({ id: pointEvents.id })
        .from(pointEvents)
        .where(
          and(
            eq(pointEvents.employeeId, recipientId),
            eq(pointEvents.sourceType, 'daily_activity_session'),
            eq(pointEvents.sourceId, session.id)
          )
        )
        .limit(1)

      if (existingEvent) {
        continue
      }

      const [empState] = await tx
        .select({ id: employees.id, totalPoints: employees.totalPoints })
        .from(employees)
        .where(eq(employees.id, recipientId))
        .limit(1)

      if (!empState) continue

      const updatedBalance = Math.max(0, (empState.totalPoints || 0) + pointsToAward)

      await tx.insert(pointEvents).values({
        employeeId: recipientId,
        transactionType: 'reward',
        sourceType: 'daily_activity_session',
        sourceId: session.id,
        category: 'Daily Activity',
        label: `${session.sessionCode || 'DAR'} • Approved${allRecipientIds.length > 1 ? ' (Tim)' : ''}`,
        points: pointsToAward,
        balanceAfter: updatedBalance,
        metadata: JSON.stringify({
          sessionId: session.id,
          sessionCode: session.sessionCode,
          isTeam: allRecipientIds.length > 1,
          primaryEmployeeId: session.employeeId,
        }),
        createdAt: now,
      })

      await tx
        .update(employees)
        .set({ totalPoints: updatedBalance })
        .where(eq(employees.id, recipientId))

      // Update streak
      try {
        await updateStreakForEmployee(recipientId, session.workDate || now)
      } catch (streakErr) {
        console.error(`Error updating streak for employee ${recipientId}:`, streakErr)
      }

      // Check badge thresholds
      try {
        await evaluatePointThresholdBadges(tx, recipientId, updatedBalance)
      } catch (badgeErr) {
        console.error(`Error evaluating badge for employee ${recipientId}:`, badgeErr)
      }
    }
  } catch (err) {
    console.error('Error awarding session points to team:', err)
  }
}

export async function manageActivityLibraryAction(formData: FormData) {
  await ensureDailyActivitySeedData()

  const payload = manageLibrarySchema.parse(Object.fromEntries(formData))

  if (payload.intent === 'delete') {
    if (!payload.id) {
      throw new Error('Library activity tidak valid.')
    }

    const [existingLib] = await db
      .select()
      .from(activityLibraries)
      .where(eq(activityLibraries.id, payload.id))
      .limit(1)

    if (existingLib) {
      await db
        .delete(activityRouteTemplates)
        .where(
          or(
            eq(activityRouteTemplates.routeCode, `GRP-${existingLib.activityCode}`),
            eq(activityRouteTemplates.routeName, `Group: ${existingLib.activityName}`)
          )
        )
      await db
        .delete(activityRouteItems)
        .where(eq(activityRouteItems.libraryActivityId, existingLib.id))
    }

    await db.delete(activityLibraries).where(eq(activityLibraries.id, payload.id))
    revalidateDailyActivitySurfaces()
    return
  }

  const siteIds =
    payload.siteIds.length > 0
      ? [...new Set(payload.siteIds)]
      : payload.siteId
        ? [payload.siteId]
        : []

  const siteId = siteIds.includes(-1) ? null : (siteIds[0] ?? null)

  const departmentIds =
    payload.departmentIds.length > 0
      ? [...new Set(payload.departmentIds)]
      : payload.departmentId
        ? [payload.departmentId]
        : []

  const sectionIds =
    payload.sectionIds.length > 0
      ? [...new Set(payload.sectionIds)]
      : payload.sectionId
        ? [payload.sectionId]
        : []

  const values = {
    activityCode: payload.activityCode,
    activityName: payload.activityName,
    category: payload.category,
    departmentId: departmentIds[0] ?? payload.departmentId ?? null,
    departmentIds,
    sectionId: sectionIds[0] ?? payload.sectionId ?? null,
    sectionIds,
    siteId,
    siteIds,
    basePoints: payload.basePoints,
    complexityLevel: payload.complexityLevel,
    requiresPhoto: payload.requiresPhoto,
    requiresEquipmentNo: payload.requiresEquipmentNo,
    requiresDuration: payload.requiresDuration,
    requiresLocationGps: payload.requiresLocationGps,
    requiresMaterialUsed: payload.requiresMaterialUsed,
    requiresTireCount: payload.requiresTireCount,
    maxDailyCount: payload.maxDailyCount,
    maxPointsPerDay: payload.maxPointsPerDay,
    isAssignable: payload.isAssignable,
    isSelfInput: payload.isSelfInput,
    approvalRequired: payload.approvalRequired,
    autoApproveIfGpsValid: payload.autoApproveIfGpsValid,
    slaHours: payload.slaHours,
    isActive: payload.isActive,
    createdByEmployeeId: payload.createdByEmployeeId ?? null,
    updatedAt: new Date(),
  }

  let libraryActivityId = payload.id

  const [existingLib] = libraryActivityId
    ? await db
        .select({
          id: activityLibraries.id,
          activityCode: activityLibraries.activityCode,
          activityName: activityLibraries.activityName,
        })
        .from(activityLibraries)
        .where(eq(activityLibraries.id, libraryActivityId))
        .limit(1)
    : [null]

  if (payload.intent === 'create') {
    const inserted = await db.insert(activityLibraries).values({
      ...values,
      createdAt: new Date(),
    }).returning({ id: activityLibraries.id })
    libraryActivityId = inserted[0]?.id
  } else {
    if (!libraryActivityId) {
      throw new Error('Library activity tidak valid.')
    }

    await db.update(activityLibraries).set(values).where(eq(activityLibraries.id, libraryActivityId))
  }

  if (libraryActivityId) {
    const existingItems = await db
      .select({ id: activityRouteItems.id, routeGroupId: activityRouteItems.routeGroupId })
      .from(activityRouteItems)
      .where(eq(activityRouteItems.libraryActivityId, libraryActivityId))

    const submittedGroupIds = payload.routeGroupIds || []
    
    // Items to delete (if they belong to a group that was unselected)
    const itemsToDelete = existingItems.filter(item => !submittedGroupIds.includes(item.routeGroupId))
    if (itemsToDelete.length > 0) {
      await db.delete(activityRouteItems).where(
        inArray(activityRouteItems.id, itemsToDelete.map(item => item.id))
      )
    }

    // Groups to insert (if they don't have an existing item for this library activity)
    const existingGroupIds = existingItems.map(item => item.routeGroupId)
    const groupsToInsert = submittedGroupIds.filter(id => !existingGroupIds.includes(id))

    if (groupsToInsert.length > 0) {
      await db.insert(activityRouteItems).values(
        groupsToInsert.map(groupId => ({
          routeGroupId: groupId,
          libraryActivityId: libraryActivityId,
          itemCode: payload.activityCode,
          itemLabel: payload.activityName,
          requiresTime: payload.requiresDuration,
          requiresPhoto: payload.requiresPhoto,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      )
    }

    if (payload.isGroupActivity && payload.childActivityIds.length > 0) {
      const groupName = `Group: ${payload.activityName}`
      const searchCodes = Array.from(
        new Set([`GRP-${payload.activityCode}`, existingLib ? `GRP-${existingLib.activityCode}` : null].filter(Boolean))
      ) as string[]
      const searchNames = Array.from(
        new Set([groupName, existingLib ? `Group: ${existingLib.activityName}` : null].filter(Boolean))
      ) as string[]

      const existingTemplates = await db
        .select({ id: activityRouteTemplates.id })
        .from(activityRouteTemplates)
        .where(
          or(
            inArray(activityRouteTemplates.routeCode, searchCodes),
            inArray(activityRouteTemplates.routeName, searchNames)
          )
        )
        .limit(1)

      const templateSiteId = siteIds.length === 1 && !siteIds.includes(-1) ? siteIds[0] : null
      const templateDeptId = departmentIds.length === 1 ? departmentIds[0] : null
      const templateSecId = sectionIds.length === 1 ? sectionIds[0] : null

      let autoTemplateId = existingTemplates[0]?.id
      if (!autoTemplateId) {
        const insertedTemplate = await db.insert(activityRouteTemplates).values({
          routeCode: `GRP-${payload.activityCode}`,
          routeName: groupName,
          description: `Auto-generated group for ${payload.activityName}`,
          isActive: true,
          mobileEnabled: true,
          siteId: templateSiteId,
          departmentId: templateDeptId,
          sectionId: templateSecId,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning({ id: activityRouteTemplates.id })
        autoTemplateId = insertedTemplate[0]?.id
      } else {
        await db.update(activityRouteTemplates).set({
          routeCode: `GRP-${payload.activityCode}`,
          routeName: groupName,
          isActive: true,
          mobileEnabled: true,
          siteId: templateSiteId,
          departmentId: templateDeptId,
          sectionId: templateSecId,
          updatedAt: new Date(),
        }).where(eq(activityRouteTemplates.id, autoTemplateId))
      }

      if (autoTemplateId) {
        const existingGroups = await db
          .select({ id: activityRouteGroups.id })
          .from(activityRouteGroups)
          .where(eq(activityRouteGroups.routeTemplateId, autoTemplateId))
          .limit(1)

        let autoGroupId = existingGroups[0]?.id
        if (!autoGroupId) {
          const insertedGroup = await db.insert(activityRouteGroups).values({
            routeTemplateId: autoTemplateId,
            groupKey: `GRP-${payload.activityCode}`,
            groupName: payload.activityName,
            sortOrder: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning({ id: activityRouteGroups.id })
          autoGroupId = insertedGroup[0]?.id
        } else {
          await db.update(activityRouteGroups).set({
            groupKey: `GRP-${payload.activityCode}`,
            groupName: payload.activityName,
            updatedAt: new Date(),
          }).where(eq(activityRouteGroups.id, autoGroupId))
        }

        if (autoGroupId) {
          await db.delete(activityRouteItems).where(eq(activityRouteItems.routeGroupId, autoGroupId))

          const childLibraries = await db
            .select()
            .from(activityLibraries)
            .where(inArray(activityLibraries.id, payload.childActivityIds))

          if (childLibraries.length > 0) {
            const childLibMap = new Map(childLibraries.map((lib) => [lib.id, lib]))
            const orderedLibs = payload.childActivityIds
              .map((id) => childLibMap.get(id))
              .filter((lib): lib is typeof childLibraries[0] => Boolean(lib))

            await db.insert(activityRouteItems).values(
              orderedLibs.map((lib, idx) => ({
                routeGroupId: autoGroupId,
                libraryActivityId: lib.id,
                itemCode: lib.activityCode,
                itemLabel: lib.activityName,
                requiresTime: lib.requiresDuration,
                requiresPhoto: lib.requiresPhoto,
                sortOrder: idx + 1,
                createdAt: new Date(),
                updatedAt: new Date(),
              }))
            )
          }
        }
      }
    } else if (!payload.isGroupActivity || (payload.childActivityIds && payload.childActivityIds.length === 0)) {
      const searchCodes = [
        `GRP-${payload.activityCode}`,
        existingLib ? `GRP-${existingLib.activityCode}` : null,
      ].filter(Boolean) as string[]
      const searchNames = [
        `Group: ${payload.activityName}`,
        existingLib ? `Group: ${existingLib.activityName}` : null,
      ].filter(Boolean) as string[]

      await db
        .delete(activityRouteTemplates)
        .where(
          or(
            inArray(activityRouteTemplates.routeCode, searchCodes),
            inArray(activityRouteTemplates.routeName, searchNames)
          )
        )
    }
  }

  revalidateDailyActivitySurfaces()
}

export async function manageActivityRouteTemplateAction(formData: FormData) {
  await ensureDailyActivitySeedData()

  const payload = manageRouteTemplateSchema.parse(Object.fromEntries(formData))
  const currentEmployee = await getAuthenticatedEmployeeContext()

  if (payload.intent === 'delete') {
    if (!payload.id) {
      throw new Error('Route template tidak valid.')
    }

    await db.delete(activityRouteTemplates).where(eq(activityRouteTemplates.id, payload.id))
    revalidateDailyActivitySurfaces()
    return
  }

  const values = {
    siteId: payload.siteId ?? null,
    departmentId: payload.departmentId ?? null,
    sectionId: payload.sectionId ?? null,
    positionId: payload.positionId ?? null,
    routeCode: payload.routeCode,
    routeName: payload.routeName,
    shiftCode: payload.shiftCode,
    description: payload.description,
    mobileEnabled: payload.mobileEnabled,
    approvalRequired: payload.approvalRequired,
    versionLabel: payload.versionLabel,
    effectiveTo: null,
    isActive: payload.isActive,
    createdByEmployeeId: currentEmployee.id,
    updatedAt: new Date(),
  }

  if (payload.intent === 'create') {
    await db.insert(activityRouteTemplates).values({
      ...values,
      effectiveFrom: new Date(),
      createdAt: new Date(),
    })
  } else {
    if (!payload.id) {
      throw new Error('Route template tidak valid.')
    }

    await db
      .update(activityRouteTemplates)
      .set(values)
      .where(eq(activityRouteTemplates.id, payload.id))
  }

  revalidateDailyActivitySurfaces()
}

export async function manageActivityRouteGroupAction(formData: FormData) {
  await ensureDailyActivitySeedData()

  const payload = manageRouteGroupSchema.parse(Object.fromEntries(formData))

  if (payload.intent === 'delete') {
    if (!payload.id) {
      throw new Error('Route group tidak valid.')
    }

    await db.delete(activityRouteGroups).where(eq(activityRouteGroups.id, payload.id))
    revalidateDailyActivitySurfaces()
    return
  }

  if (!payload.routeTemplateId && payload.intent === 'create') {
    throw new Error('Route template wajib dipilih.')
  }

  const values = {
    routeTemplateId: payload.routeTemplateId ?? undefined,
    groupKey: payload.groupKey,
    groupName: payload.groupName,
    description: payload.description,
    sortOrder: payload.sortOrder,
    isRequired: payload.isRequired,
    updatedAt: new Date(),
  }

  if (payload.intent === 'create') {
    await db.insert(activityRouteGroups).values({
      routeTemplateId: payload.routeTemplateId!,
      groupKey: payload.groupKey,
      groupName: payload.groupName,
      description: payload.description,
      sortOrder: payload.sortOrder,
      isRequired: payload.isRequired,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  } else {
    if (!payload.id) {
      throw new Error('Route group tidak valid.')
    }

    await db.update(activityRouteGroups).set(values).where(eq(activityRouteGroups.id, payload.id))
  }

  revalidateDailyActivitySurfaces()
}

export async function manageActivityRouteItemAction(formData: FormData) {
  await ensureDailyActivitySeedData()

  const payload = manageRouteItemSchema.parse(Object.fromEntries(formData))

  if (payload.intent === 'delete') {
    if (!payload.id) {
      throw new Error('Route item tidak valid.')
    }

    await db.delete(activityRouteItems).where(eq(activityRouteItems.id, payload.id))
    revalidateDailyActivitySurfaces()
    return
  }

  if (!payload.routeGroupId && payload.intent === 'create') {
    throw new Error('Route group wajib dipilih.')
  }

  const values = {
    routeGroupId: payload.routeGroupId ?? undefined,
    libraryActivityId: payload.libraryActivityId ?? null,
    itemCode: payload.itemCode,
    itemLabel: payload.itemLabel,
    itemDescription: payload.itemDescription,
    pointOverride: payload.pointOverride ?? null,
    sortOrder: payload.sortOrder,
    requiresUnit: payload.requiresUnit,
    requiresTime: payload.requiresTime,
    requiresRemark: payload.requiresRemark,
    requiresPhoto: payload.requiresPhoto,
    requiresChecklistEvidence: payload.requiresChecklistEvidence,
    isOptional: payload.isOptional,
    allowCustomUnit: payload.allowCustomUnit,
    updatedAt: new Date(),
  }

  if (payload.intent === 'create') {
    await db.insert(activityRouteItems).values({
      routeGroupId: payload.routeGroupId!,
      libraryActivityId: payload.libraryActivityId ?? null,
      itemCode: payload.itemCode,
      itemLabel: payload.itemLabel,
      itemDescription: payload.itemDescription,
      pointOverride: payload.pointOverride ?? null,
      sortOrder: payload.sortOrder,
      requiresUnit: payload.requiresUnit,
      requiresTime: payload.requiresTime,
      requiresRemark: payload.requiresRemark,
      requiresPhoto: payload.requiresPhoto,
      requiresChecklistEvidence: payload.requiresChecklistEvidence,
      isOptional: payload.isOptional,
      allowCustomUnit: payload.allowCustomUnit,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  } else {
    if (!payload.id) {
      throw new Error('Route item tidak valid.')
    }

    await db.update(activityRouteItems).set(values).where(eq(activityRouteItems.id, payload.id))
  }

  revalidateDailyActivitySurfaces()
}

export async function manageActivitySectionOverrideAction(formData: FormData) {
  await ensureDailyActivitySeedData()

  const payload = manageSectionOverrideSchema.parse(Object.fromEntries(formData))
  const currentEmployee = await getAuthenticatedEmployeeContext()

  if (payload.intent === 'delete') {
    if (!payload.id) {
      throw new Error('Override section tidak valid.')
    }

    await db
      .delete(activitySectionPointOverrides)
      .where(eq(activitySectionPointOverrides.id, payload.id))
    revalidateDailyActivitySurfaces()
    return
  }

  if (!payload.libraryActivityId) {
    throw new Error('Library activity wajib dipilih.')
  }

  const values = {
    siteId: payload.siteId ?? null,
    departmentId: payload.departmentId ?? null,
    sectionId: payload.sectionId ?? null,
    positionId: payload.positionId ?? null,
    libraryActivityId: payload.libraryActivityId,
    overrideLabel: payload.overrideLabel,
    overridePoints: payload.overridePoints ?? null,
    reason: payload.reason,
    isActive: payload.isActive,
    createdByEmployeeId: currentEmployee.id,
    updatedAt: new Date(),
  }

  if (payload.intent === 'create') {
    await db.insert(activitySectionPointOverrides).values({
      ...values,
      createdAt: new Date(),
    })
  } else {
    if (!payload.id) {
      throw new Error('Override section tidak valid.')
    }

    await db
      .update(activitySectionPointOverrides)
      .set(values)
      .where(eq(activitySectionPointOverrides.id, payload.id))
  }

  revalidateDailyActivitySurfaces()
}

export async function importActivityLibraryAction(
  _state: ActivityLibraryImportState,
  formData: FormData
): Promise<ActivityLibraryImportState> {
  try {
    await ensureDailyActivitySeedData()

    const rawCsv = (await getImportCsvText(formData)).trim()
    if (!rawCsv) {
      return {
        status: 'error',
        message: 'CSV is empty. Upload a file or paste example data first.',
      }
    }

    const parsed = parseActivityLibraryCsv(rawCsv)
    if (parsed.records.length === 0) {
      return {
        status: 'error',
        message: 'CSV tidak punya baris data.',
      }
    }

    const createdByEmployeeIdValue = Number(formData.get('createdByEmployeeId'))
    const createdByEmployeeId =
      Number.isInteger(createdByEmployeeIdValue) && createdByEmployeeIdValue > 0
        ? createdByEmployeeIdValue
        : null
    const [departmentRows, sectionRows, siteRows] = await Promise.all([
      db
        .select({
          id: masterDepartments.id,
          code: masterDepartments.code,
          name: masterDepartments.name,
        })
        .from(masterDepartments),
      db
        .select({
          id: masterSections.id,
          code: masterSections.code,
          name: masterSections.name,
          departmentId: masterSections.departmentId,
        })
        .from(masterSections),
      db
        .select({
          id: sites.id,
          contractNumber: sites.contractNumber,
          name: sites.name,
          location: sites.location,
        })
        .from(sites),
    ])

    let importedCount = 0
    let updatedCount = 0
    let skippedCount = 0
    let duplicateCodeCount = 0
    const recordsByActivityCode = new Map<string, Record<string, string>>()

    for (const row of parsed.records) {
      const activityCode = getActivityLibraryImportValue(row, 'activityCode')
      const normalizedActivityCode = activityCode.trim().toLowerCase()

      if (!normalizedActivityCode) {
        continue
      }

      if (recordsByActivityCode.has(normalizedActivityCode)) {
        duplicateCodeCount += 1
      }

      recordsByActivityCode.set(normalizedActivityCode, row)
    }

    for (const row of recordsByActivityCode.values()) {
      const activityCode = getActivityLibraryImportValue(row, 'activityCode')
      const activityName = getActivityLibraryImportValue(row, 'activityName')

      if (!activityCode || !activityName) {
        skippedCount += 1
        continue
      }

      const sectionId = resolveMasterReference(
        getActivityLibraryImportValue(row, 'section'),
        sectionRows
      )
      const section = sectionId ? sectionRows.find((item) => item.id === sectionId) : null
      const siteId = resolveSiteReference(getActivityLibraryImportValue(row, 'site'), siteRows)
      const departmentId =
        resolveMasterReference(getActivityLibraryImportValue(row, 'department'), departmentRows) ??
        section?.departmentId ??
        null
      const values = {
        activityCode,
        activityName,
        category: getActivityLibraryImportValue(row, 'category') || 'Technical',
        siteId,
        siteIds: siteId ? [siteId] : [],
        departmentId,
        sectionId,
        basePoints: parseActivityLibraryInteger(
          getActivityLibraryImportValue(row, 'basePoints'),
          5,
          0,
          500
        ),
        complexityLevel: parseActivityLibraryInteger(
          getActivityLibraryImportValue(row, 'complexityLevel'),
          1,
          1,
          5
        ),
        requiresPhoto: parseActivityLibraryBoolean(
          getActivityLibraryImportValue(row, 'requiresPhoto'),
          false
        ),
        requiresEquipmentNo: parseActivityLibraryBoolean(
          getActivityLibraryImportValue(row, 'requiresEquipmentNo'),
          false
        ),
        requiresDuration: parseActivityLibraryBoolean(
          getActivityLibraryImportValue(row, 'requiresDuration'),
          true
        ),
        requiresLocationGps: parseActivityLibraryBoolean(
          getActivityLibraryImportValue(row, 'requiresLocationGps'),
          false
        ),
        requiresMaterialUsed: parseActivityLibraryBoolean(
          getActivityLibraryImportValue(row, 'requiresMaterialUsed'),
          false
        ),
        requiresTireCount: parseActivityLibraryBoolean(
          getActivityLibraryImportValue(row, 'requiresTireCount'),
          false
        ),
        maxDailyCount: parseActivityLibraryInteger(
          getActivityLibraryImportValue(row, 'maxDailyCount'),
          3,
          1,
          20
        ),
        maxPointsPerDay: parseActivityLibraryInteger(
          getActivityLibraryImportValue(row, 'maxPointsPerDay'),
          50,
          1,
          1000
        ),
        isAssignable: parseActivityLibraryBoolean(
          getActivityLibraryImportValue(row, 'isAssignable'),
          true
        ),
        isSelfInput: parseActivityLibraryBoolean(
          getActivityLibraryImportValue(row, 'isSelfInput'),
          true
        ),
        approvalRequired: parseActivityLibraryBoolean(
          getActivityLibraryImportValue(row, 'approvalRequired'),
          true
        ),
        autoApproveIfGpsValid: parseActivityLibraryBoolean(
          getActivityLibraryImportValue(row, 'autoApproveIfGpsValid'),
          false
        ),
        slaHours: parseActivityLibraryInteger(
          getActivityLibraryImportValue(row, 'slaHours'),
          24,
          1,
          240
        ),
        isActive: parseActivityLibraryBoolean(getActivityLibraryImportValue(row, 'isActive'), true),
        createdByEmployeeId,
        updatedAt: new Date(),
      }

      const [existing] = await db
        .select({ id: activityLibraries.id })
        .from(activityLibraries)
        .where(eq(activityLibraries.activityCode, activityCode))
        .limit(1)

      if (existing) {
        await db.update(activityLibraries).set(values).where(eq(activityLibraries.id, existing.id))
        updatedCount += 1
      } else {
        await db.insert(activityLibraries).values({
          ...values,
          createdAt: new Date(),
        })
        importedCount += 1
      }
    }

    revalidateDailyActivitySurfaces()

    return {
      status: 'success',
      message:
        duplicateCodeCount > 0
          ? `Import Kamus Aktivitas selesai. ${duplicateCodeCount} baris duplicate activityCode digabung, pakai baris terakhir.`
          : 'Import Kamus Aktivitas selesai.',
      importedCount,
      updatedCount,
      skippedCount,
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Import Kamus Aktivitas gagal.',
    }
  }
}

export async function manageJobAssignmentAction(formData: FormData) {
  await ensureDailyActivitySeedData()

  const payload = manageAssignmentSchema.parse(Object.fromEntries(formData))
  const currentEmployee = await getAuthenticatedEmployeeContext()

  if (payload.intent === 'delete') {
    if (!payload.id) {
      throw new Error('Pekerjaan aktual tidak valid.')
    }

    await db.delete(jobAssignments).where(eq(jobAssignments.id, payload.id))
    revalidateDailyActivitySurfaces()
    return
  }

  if (payload.intent === 'update-status') {
    if (!payload.id) {
      throw new Error('Pekerjaan aktual tidak valid.')
    }

    await db
      .update(jobAssignments)
      .set({
        status: payload.status,
        updatedAt: new Date(),
      })
      .where(eq(jobAssignments.id, payload.id))

    revalidateDailyActivitySurfaces()
    return
  }

  if (!payload.assignedByEmployeeId || !payload.assignedToEmployeeId || !payload.siteId) {
    throw new Error('Pekerjaan aktual harus memiliki pemberi tugas, penerima tugas, dan site.')
  }

  const managedEmployeeIds = await getManagedEmployeeIdsForLead(currentEmployee.id)
  if (!managedEmployeeIds.includes(payload.assignedToEmployeeId)) {
    throw new Error(
      'Anda hanya bisa membuat assignment untuk bawahan yang ada di struktur organisasi.'
    )
  }

  const [assignee] = await db
    .select({
      id: employees.id,
      siteId: employees.siteId,
      isActive: employees.isActive,
    })
    .from(employees)
    .where(eq(employees.id, payload.assignedToEmployeeId))
    .limit(1)

  if (!assignee?.isActive) {
    throw new Error('Target subordinate for assignment is inactive or not found.')
  }

  if (payload.libraryActivityId) {
    const [library] = await db
      .select({ siteId: activityLibraries.siteId, siteIds: activityLibraries.siteIds })
      .from(activityLibraries)
      .where(eq(activityLibraries.id, payload.libraryActivityId))
      .limit(1)

    if (library) {
      const librarySiteIds = library.siteIds ?? (library.siteId ? [library.siteId] : [])
      if (assignee.siteId != null && librarySiteIds.length > 0 && !librarySiteIds.includes(assignee.siteId)) {
        throw new Error('Activity library tidak tersedia untuk site assignment ini.')
      }
    }
  }

  await db.insert(jobAssignments).values({
    assignedByEmployeeId: currentEmployee.id,
    assignedToEmployeeId: assignee.id,
    siteId: assignee.siteId,
    libraryActivityId: payload.libraryActivityId ?? null,
    customJobName: payload.customJobName,
    priority: payload.priority,
    estimatedDuration: payload.estimatedDuration,
    notes: payload.notes,
    assignmentType: payload.assignmentType,
    assignedDate: payload.assignedDate
      ? parseDateTime(payload.assignedDate, 'Tanggal assignment')
      : new Date(),
    deadline: payload.deadline ? parseDateTime(payload.deadline, 'Deadline') : null,
    status: payload.status,
    isMandatory: payload.isMandatory,
    isRecurring: payload.isRecurring,
    recurrenceRule: payload.recurrenceRule,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  revalidateDailyActivitySurfaces()
}

export async function manageOvertimeCommandLetterAction(formData: FormData) {
  await ensureDailyActivitySeedData()

  const payload = manageOvertimeCommandLetterSchema.parse(Object.fromEntries(formData))
  const currentEmployee = await getAuthenticatedEmployeeContext()
  if (payload.origin === 'leader_command')
    await assertOvertimeRequestCreationAccess(currentEmployee)

  const existingDocument =
    payload.id == null
      ? null
      : ((
          await db
            .select({
              id: overtimeCommandLetters.id,
              splNumber: overtimeCommandLetters.splNumber,
              siteId: overtimeCommandLetters.siteId,
              requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
              approvedByEmployeeId: overtimeCommandLetters.approvedByEmployeeId,
              status: overtimeCommandLetters.status,
            })
            .from(overtimeCommandLetters)
            .where(eq(overtimeCommandLetters.id, payload.id))
            .limit(1)
        )[0] ?? null)

  if (payload.intent === 'delete') {
    if (!payload.id) {
      throw new Error('SPL tidak valid.')
    }

    if (!existingDocument || existingDocument.siteId !== currentEmployee.siteId) {
      throw new Error('Dokumen SPL tidak ditemukan di site Anda.')
    }

    if (
      existingDocument.requestedByEmployeeId !== currentEmployee.id &&
      !canManageOvertimeRequestSettings(currentEmployee)
    ) {
      throw new Error('Anda tidak bisa menghapus dokumen SPL milik leader lain.')
    }

    if (!['draft', 'returned'].includes(existingDocument.status.toLowerCase())) {
      throw new Error('SPL yang sudah diajukan tidak dapat dihapus.')
    }

    await db.delete(overtimeCommandLetters).where(eq(overtimeCommandLetters.id, payload.id))
    revalidateDailyActivitySurfaces()
    return
  }

  const lineItems = parseOvertimeCommandLetterLines(payload.lineItemsJson)
  if (lineItems.length === 0) {
    throw new Error('SPL must have at least one work line.')
  }

  const selectedEmployeeIds = Array.from(new Set(lineItems.map((item) => item.assignedEmployeeId)))
  if (payload.origin === 'employee_request') {
    if (selectedEmployeeIds.length !== 1 || selectedEmployeeIds[0] !== currentEmployee.id) {
      throw new Error('Pengajuan SPL karyawan hanya dapat dibuat untuk akun sendiri.')
    }
  } else {
    const managedEmployeeIdSet = new Set(
      await getHeadLocationManagedEmployeeIds(currentEmployee.siteId, currentEmployee.id)
    )
    if (selectedEmployeeIds.some((employeeId) => !managedEmployeeIdSet.has(employeeId))) {
      throw new Error('Perintah SPL hanya dapat dibuat untuk bawahan aktif Anda.')
    }
  }

  if (!payload.workDate) {
    throw new Error('Tanggal kerja SPL wajib diisi.')
  }

  const workDate = parseDateTime(payload.workDate, 'Tanggal kerja SPL')
  const plannedStartAt = payload.plannedStartAt
    ? parseDateTime(payload.plannedStartAt, 'Jam mulai SPL', workDate)
    : null
  let plannedEndAt = payload.plannedEndAt
    ? parseDateTime(payload.plannedEndAt, 'Jam selesai SPL', workDate)
    : null

  if (plannedStartAt && plannedEndAt && plannedEndAt <= plannedStartAt) {
    const nextDayEnd = new Date(plannedEndAt.getTime() + 24 * 60 * 60 * 1000)
    if (nextDayEnd > plannedStartAt) {
      plannedEndAt = nextDayEnd
    } else {
      throw new Error('Jam selesai SPL harus setelah jam mulai.')
    }
  }
  if (!plannedStartAt || !plannedEndAt) throw new Error('Jam mulai dan selesai SPL wajib diisi.')
  if (
    payload.origin === 'employee_request' &&
    [plannedStartAt, plannedEndAt].some(
      (value) => value.getMinutes() % 30 !== 0 || value.getSeconds() !== 0
    )
  ) {
    throw new Error('Jam mulai dan selesai SPL harus menggunakan interval 30 menit.')
  }
  const policy = await getSiteSplPolicy(currentEmployee.siteId)
  const requestWindowError = validateSplRequestWindow({
    now: new Date(),
    workDate,
    plannedStartAt,
    plannedEndAt,
    policy,
  })
  if (requestWindowError) throw new Error(requestWindowError)
  await assertNoSplOverlap({
    splId: payload.id,
    employeeIds: selectedEmployeeIds,
    plannedStartAt,
    plannedEndAt,
  })
  const replacementOffDate = payload.replacementOffDate
    ? parseDateTime(payload.replacementOffDate, 'Tanggal OFF pengganti')
    : null
  if (payload.requestKind === 'extension') {
    if (!payload.parentSplId) throw new Error('Extension wajib terhubung ke SPL awal.')
    const [parent] = await db
      .select({ id: overtimeCommandLetters.id, status: overtimeCommandLetters.status })
      .from(overtimeCommandLetters)
      .where(eq(overtimeCommandLetters.id, payload.parentSplId))
      .limit(1)
    if (!parent || !['approved', 'closed'].includes(parent.status)) {
      throw new Error('Extension hanya dapat dibuat dari SPL approved atau closed.')
    }
  }
  const participantSnapshots = await buildSplParticipantSnapshots({
    siteId: currentEmployee.siteId,
    employeeIds: selectedEmployeeIds,
    workDate,
    plannedStartAt,
    plannedEndAt,
    replacementOffDate,
  })

  const values = {
    siteId: currentEmployee.siteId,
    departmentId: currentEmployee.departmentId ?? null,
    sectionId: payload.sectionId ?? currentEmployee.sectionId ?? null,
    positionId: payload.positionId ?? currentEmployee.positionId ?? null,
    requestedByEmployeeId: currentEmployee.id,
    approvedByEmployeeId: existingDocument?.approvedByEmployeeId ?? null,
    title: payload.title,
    workDate,
    plannedStartAt,
    plannedEndAt,
    status: existingDocument?.status ?? 'draft',
    requestNotes: payload.requestNotes,
    executionNotes: payload.executionNotes,
    origin: payload.origin,
    requestKind: payload.requestKind,
    parentSplId: payload.parentSplId ?? null,
    updatedAt: new Date(),
  }

  let overtimeCommandLetterId = payload.id ?? null
  let splNumber = existingDocument?.splNumber ?? null

  await db.transaction(async (tx) => {
    if (payload.intent === 'create') {
      const [created] = await tx
        .insert(overtimeCommandLetters)
        .values({
          ...values,
          splNumber: buildSplNumber(
            currentEmployee.siteId,
            currentEmployee.id,
            workDate,
            plannedStartAt,
            plannedEndAt
          ),
          createdAt: new Date(),
        })
        .returning({
          id: overtimeCommandLetters.id,
          splNumber: overtimeCommandLetters.splNumber,
        })

      overtimeCommandLetterId = created.id
      splNumber = created.splNumber
    } else {
      if (!payload.id) {
        throw new Error('SPL tidak valid.')
      }

      if (!existingDocument || existingDocument.siteId !== currentEmployee.siteId) {
        throw new Error('Dokumen SPL tidak ditemukan di site Anda.')
      }

      if (!['draft', 'returned'].includes(existingDocument.status.toLowerCase())) {
        throw new Error('SPL hanya dapat diedit saat draft atau returned.')
      }

      if (
        existingDocument.requestedByEmployeeId !== currentEmployee.id &&
        !canManageOvertimeRequestSettings(currentEmployee)
      ) {
        throw new Error('Anda tidak bisa mengubah dokumen SPL milik leader lain.')
      }

      await tx
        .update(overtimeCommandLetters)
        .set(values)
        .where(eq(overtimeCommandLetters.id, payload.id))

      await tx
        .delete(overtimeCommandLetterItems)
        .where(eq(overtimeCommandLetterItems.overtimeCommandLetterId, payload.id))

      overtimeCommandLetterId = payload.id
    }

    await tx.insert(overtimeCommandLetterItems).values(
      lineItems.map((item, index) => ({
        overtimeCommandLetterId: overtimeCommandLetterId!,
        assignedEmployeeId: item.assignedEmployeeId,
        routeTemplateId: item.routeTemplateId ?? null,
        routeItemId: item.routeItemId ?? null,
        libraryActivityId: item.libraryActivityId ?? null,
        lineLabel: item.lineLabel,
        lineDescription: item.lineDescription,
        targetUnit: item.targetUnit,
        estimatedMinutes: item.estimatedMinutes,
        plannedPoints: item.plannedPoints,
        sortOrder: item.sortOrder || index + 1,
        isCustomLine: item.isCustomLine,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    )
    if (payload.intent !== 'create') {
      await tx
        .delete(overtimeCommandLetterParticipants)
        .where(
          eq(overtimeCommandLetterParticipants.overtimeCommandLetterId, overtimeCommandLetterId!)
        )
    }
    await tx.insert(overtimeCommandLetterParticipants).values(
      participantSnapshots.map((participant) => ({
        overtimeCommandLetterId: overtimeCommandLetterId!,
        ...participant,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))
    )
  })

  if (payload.submitNow && overtimeCommandLetterId && splNumber) {
    const { submission } = await createLegacyApprovalRequest({
      templateKey: 'overtime-command-letter',
      requesterEmployeeId: currentEmployee.id,
      siteId: currentEmployee.siteId,
      activityType: 'overtime_command_letter',
      transactionType: 'overtime_request',
      priority: 'normal',
      referenceId: overtimeCommandLetterId,
      payloadSnapshot: {
        legacyRecordId: overtimeCommandLetterId,
        splNumber,
        title: payload.title,
        workDate: workDate.toISOString(),
        origin: payload.origin,
        requestKind: payload.requestKind,
      },
      previewSnapshot: {
        title: payload.title,
        splNumber,
        plannedStartAt: plannedStartAt.toISOString(),
        plannedEndAt: plannedEndAt.toISOString(),
      },
      overtimeMinutes: Math.round((plannedEndAt.getTime() - plannedStartAt.getTime()) / 60000),
    })
    await db
      .update(overtimeCommandLetters)
      .set({ requestSubmissionId: submission.id, status: 'submitted', updatedAt: new Date() })
      .where(eq(overtimeCommandLetters.id, overtimeCommandLetterId))
    await sendSplSubmissionEmail({
      email: currentEmployee.email,
      requesterName: currentEmployee.name,
      splNumber,
      title: payload.title,
      requestKind: payload.requestKind,
    })
  }

  revalidateDailyActivitySurfaces()
}

type MobileSplSubmitState = {
  status: 'idle' | 'success' | 'error'
  message: string
  summary?: {
    id: number
    splNumber: string
    title: string
    status: string
    workDate: string
    plannedStartAt: string
    plannedEndAt: string
    totalMinutes: number
  }
}

type MobileSplSummaryRow = {
  id: number
  splNumber: string
  title: string
  status: string
  workDate: Date
  plannedStartAt: Date | null
  plannedEndAt: Date | null
}

function mobileSplSuccess(row: MobileSplSummaryRow): MobileSplSubmitState {
  if (!row.plannedStartAt || !row.plannedEndAt) {
    throw new Error('Ringkasan SPL yang baru diajukan tidak ditemukan.')
  }

  return {
    status: 'success',
    message: 'SPL sudah diajukan.',
    summary: {
      ...row,
      workDate: row.workDate.toISOString(),
      plannedStartAt: row.plannedStartAt.toISOString(),
      plannedEndAt: row.plannedEndAt.toISOString(),
      totalMinutes: Math.round(
        (row.plannedEndAt.getTime() - row.plannedStartAt.getTime()) / 60_000
      ),
    },
  }
}

async function findIdenticalMobileSpl(employeeId: number, formData: FormData) {
  const plannedStartAt = new Date(String(formData.get('plannedStartAt') ?? ''))
  const plannedEndAt = new Date(String(formData.get('plannedEndAt') ?? ''))
  const parentSplId = Number(formData.get('parentSplId') ?? 0)

  if (Number.isNaN(plannedStartAt.getTime()) || Number.isNaN(plannedEndAt.getTime())) return null

  const [row] = await db
    .select({
      id: overtimeCommandLetters.id,
      splNumber: overtimeCommandLetters.splNumber,
      title: overtimeCommandLetters.title,
      status: overtimeCommandLetters.status,
      workDate: overtimeCommandLetters.workDate,
      plannedStartAt: overtimeCommandLetters.plannedStartAt,
      plannedEndAt: overtimeCommandLetters.plannedEndAt,
    })
    .from(overtimeCommandLetters)
    .where(
      and(
        eq(overtimeCommandLetters.requestedByEmployeeId, employeeId),
        eq(overtimeCommandLetters.origin, 'employee_request'),
        eq(overtimeCommandLetters.plannedStartAt, plannedStartAt),
        eq(overtimeCommandLetters.plannedEndAt, plannedEndAt),
        eq(overtimeCommandLetters.requestKind, String(formData.get('requestKind') ?? 'base')),
        parentSplId > 0
          ? eq(overtimeCommandLetters.parentSplId, parentSplId)
          : isNull(overtimeCommandLetters.parentSplId),
        inArray(overtimeCommandLetters.status, ['draft', 'submitted', 'approved', 'closed'])
      )
    )
    .orderBy(desc(overtimeCommandLetters.id))
    .limit(1)

  return row ?? null
}

export async function submitMobileOvertimeRequestAction(
  _previousState: MobileSplSubmitState,
  formData: FormData
): Promise<MobileSplSubmitState> {
  let currentEmployee: Awaited<ReturnType<typeof getAuthenticatedEmployeeContext>> | null = null

  try {
    currentEmployee = await getAuthenticatedEmployeeContext()
    const existing = await findIdenticalMobileSpl(currentEmployee.id, formData)
    if (existing) return mobileSplSuccess(existing)

    await manageOvertimeCommandLetterAction(formData)
    const created = await findIdenticalMobileSpl(currentEmployee.id, formData)
    if (!created) throw new Error('Ringkasan SPL yang baru diajukan tidak ditemukan.')
    return mobileSplSuccess(created)
  } catch (error) {
    if (currentEmployee) {
      const existing = await findIdenticalMobileSpl(currentEmployee.id, formData)
      if (existing) return mobileSplSuccess(existing)
    }

    return {
      status: 'error',
      message: getReadableActionError(error, 'SPL gagal diajukan.'),
    }
  }
}

export async function manageOvertimeRequestLeaderPermissionAction(formData: FormData) {
  await ensureDailyActivitySeedData()

  const payload = manageOvertimeRequestLeaderPermissionSchema.parse(Object.fromEntries(formData))
  const currentEmployee = await getAuthenticatedEmployeeContext()

  if (!canManageOvertimeRequestSettings(currentEmployee)) {
    throw new Error('You do not have access to change overtime leader settings.')
  }

  const [leader] = await db
    .select({
      id: employees.id,
      siteId: employees.siteId,
      isActive: employees.isActive,
    })
    .from(employees)
    .where(eq(employees.id, payload.leaderEmployeeId))
    .limit(1)

  if (!leader || !leader.isActive || leader.siteId !== currentEmployee.siteId) {
    throw new Error('Leader yang dipilih tidak valid untuk site ini.')
  }

  const managedEmployeeIds = await getHeadLocationManagedEmployeeIds(
    currentEmployee.siteId,
    leader.id
  )
  if (managedEmployeeIds.length === 0) {
    throw new Error('Orang ini bukan bagian hierarchy Head Area atau belum punya bawahan aktif.')
  }

  const [existingPermission] = await db
    .select({
      id: overtimeRequestLeaderPermissions.id,
    })
    .from(overtimeRequestLeaderPermissions)
    .where(
      and(
        eq(overtimeRequestLeaderPermissions.siteId, currentEmployee.siteId),
        eq(overtimeRequestLeaderPermissions.leaderEmployeeId, payload.leaderEmployeeId)
      )
    )
    .limit(1)

  if (existingPermission) {
    await db
      .update(overtimeRequestLeaderPermissions)
      .set({
        isActive: payload.isActive,
        note: payload.note,
        enabledByEmployeeId: currentEmployee.id,
        updatedAt: new Date(),
      })
      .where(eq(overtimeRequestLeaderPermissions.id, existingPermission.id))
  } else {
    await db.insert(overtimeRequestLeaderPermissions).values({
      siteId: currentEmployee.siteId,
      leaderEmployeeId: payload.leaderEmployeeId,
      enabledByEmployeeId: currentEmployee.id,
      note: payload.note,
      isActive: payload.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  revalidateDailyActivitySurfaces()
  safeRevalidatePath('/dashboard/overtime-requests')
}

export async function transitionOvertimeCommandLetterStatusAction(formData: FormData) {
  await ensureDailyActivitySeedData()

  const payload = transitionOvertimeCommandLetterStatusSchema.parse(Object.fromEntries(formData))
  const currentEmployee = await getAuthenticatedEmployeeContext()
  const [document] = await db
    .select({
      id: overtimeCommandLetters.id,
      splNumber: overtimeCommandLetters.splNumber,
      title: overtimeCommandLetters.title,
      siteId: overtimeCommandLetters.siteId,
      requestSubmissionId: overtimeCommandLetters.requestSubmissionId,
      workDate: overtimeCommandLetters.workDate,
      plannedStartAt: overtimeCommandLetters.plannedStartAt,
      plannedEndAt: overtimeCommandLetters.plannedEndAt,
      status: overtimeCommandLetters.status,
      requestKind: overtimeCommandLetters.requestKind,
      requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
      approvedByEmployeeId: overtimeCommandLetters.approvedByEmployeeId,
    })
    .from(overtimeCommandLetters)
    .where(eq(overtimeCommandLetters.id, payload.id))
    .limit(1)

  if (!document || document.siteId !== currentEmployee.siteId) {
    throw new Error('Dokumen SPL tidak ditemukan di site Anda.')
  }

  const canManageDocument =
    document.requestedByEmployeeId === currentEmployee.id ||
    canManageOvertimeRequestSettings(currentEmployee)
  if (!canManageDocument) {
    throw new Error('Anda tidak punya akses untuk mengubah status SPL ini.')
  }

  const currentStatus = document.status
    .trim()
    .toLowerCase() as keyof typeof overtimeCommandLetterStatusTransitions
  const allowedTransitions = overtimeCommandLetterStatusTransitions[currentStatus]

  if (!allowedTransitions?.includes(payload.targetStatus)) {
    throw new Error(
      `Transisi status dari ${document.status} ke ${payload.targetStatus} tidak diizinkan.`
    )
  }

  if (payload.targetStatus === 'submitted') {
    if (!document.plannedStartAt || !document.plannedEndAt) {
      throw new Error('Jam mulai dan selesai SPL wajib diisi sebelum diajukan.')
    }
    const policy = await getSiteSplPolicy(document.siteId)
    const requestWindowError = validateSplRequestWindow({
      now: new Date(),
      workDate: document.workDate,
      plannedStartAt: document.plannedStartAt,
      plannedEndAt: document.plannedEndAt,
      policy,
    })
    if (requestWindowError) throw new Error(requestWindowError)
    await cancelLegacyApprovalSubmission(
      document.requestSubmissionId,
      'SPL diperbarui dan diajukan ulang.'
    )
    const { submission } = await createLegacyApprovalRequest({
      templateKey: 'overtime-command-letter',
      requesterEmployeeId: currentEmployee.id,
      siteId: document.siteId,
      activityType: 'overtime_command_letter',
      transactionType: 'overtime_request',
      priority: 'normal',
      referenceId: document.id,
      payloadSnapshot: {
        legacyRecordId: document.id,
        splNumber: document.splNumber,
        title: document.title,
        workDate: document.workDate.toISOString(),
      },
      previewSnapshot: {
        title: document.title,
        splNumber: document.splNumber,
        plannedStartAt: document.plannedStartAt?.toISOString() ?? null,
        plannedEndAt: document.plannedEndAt?.toISOString() ?? null,
      },
      overtimeMinutes: document.plannedEndAt && document.plannedStartAt 
        ? Math.round((document.plannedEndAt.getTime() - document.plannedStartAt.getTime()) / 60000) 
        : 0,
    })

    await db
      .update(overtimeCommandLetters)
      .set({
        requestSubmissionId: submission.id,
        status: 'submitted',
        approvedByEmployeeId: null,
        updatedAt: new Date(),
      })
      .where(eq(overtimeCommandLetters.id, payload.id))
    await sendSplSubmissionEmail({
      email: currentEmployee.email,
      requesterName: currentEmployee.name,
      splNumber: document.splNumber,
      title: document.title,
      requestKind: document.requestKind === 'extension' ? 'extension' : 'base',
    })
  } else {
    const lineRows = await db
      .select({ id: overtimeCommandLetterItems.id })
      .from(overtimeCommandLetterItems)
      .where(eq(overtimeCommandLetterItems.overtimeCommandLetterId, document.id))
    const lineIds = lineRows.map((row) => row.id)
    const checkedRows = lineIds.length
      ? await db
          .select({
            overtimeCommandLetterItemId: dailyActivitySessionItems.overtimeCommandLetterItemId,
          })
          .from(dailyActivitySessionItems)
          .where(
            and(
              inArray(dailyActivitySessionItems.overtimeCommandLetterItemId, lineIds),
              eq(dailyActivitySessionItems.isChecked, true)
            )
          )
      : []
    const checkedLineIds = new Set(checkedRows.map((row) => row.overtimeCommandLetterItemId))
    if (lineIds.some((lineId) => !checkedLineIds.has(lineId))) {
      throw new Error('SPL belum dapat ditutup karena masih ada pekerjaan yang belum selesai.')
    }

    const participants = await db
      .select({
        id: overtimeCommandLetterParticipants.id,
        employeeId: overtimeCommandLetterParticipants.employeeId,
        workPeriod: overtimeCommandLetterParticipants.workPeriod,
      })
      .from(overtimeCommandLetterParticipants)
      .where(eq(overtimeCommandLetterParticipants.overtimeCommandLetterId, document.id))
    const day = document.workDate.getDate()
    for (const participant of participants) {
      const [attendance] = await db
        .select({
          clockIn: timesheetAttendanceRealOverrides.clockIn,
          clockOut: timesheetAttendanceRealOverrides.clockOut,
        })
        .from(timesheetAttendanceRealOverrides)
        .where(
          and(
            eq(timesheetAttendanceRealOverrides.siteId, document.siteId),
            eq(timesheetAttendanceRealOverrides.period, participant.workPeriod),
            eq(timesheetAttendanceRealOverrides.employeeId, participant.employeeId),
            eq(timesheetAttendanceRealOverrides.day, day)
          )
        )
        .limit(1)
      const [evidence] = await db
        .select({
          checkedCount: sql<number>`count(*) filter (where ${dailyActivitySessionItems.isChecked} = true)`,
          photoCount: sql<number>`coalesce(sum(${dailyActivitySessionItems.photoCount}), 0)`,
        })
        .from(dailyActivitySessions)
        .innerJoin(
          dailyActivitySessionItems,
          eq(dailyActivitySessionItems.sessionId, dailyActivitySessions.id)
        )
        .where(
          and(
            eq(dailyActivitySessions.overtimeCommandLetterId, document.id),
            eq(dailyActivitySessions.employeeId, participant.employeeId)
          )
        )
      if (!attendance?.clockIn || !attendance.clockOut) {
        throw new Error(
          'SPL belum dapat ditutup: clock-in dan clock-out Attendance Real belum lengkap.'
        )
      }
      if (Number(evidence?.checkedCount ?? 0) < 1) {
        throw new Error(
          'SPL belum dapat ditutup: aktivitas pekerjaan belum selesai.'
        )
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .update(overtimeCommandLetters)
        .set({ status: 'closed', updatedAt: new Date() })
        .where(eq(overtimeCommandLetters.id, payload.id))
      await tx
        .update(overtimeCommandLetterParticipants)
        .set({ evidenceStatus: 'complete', updatedAt: new Date() })
        .where(eq(overtimeCommandLetterParticipants.overtimeCommandLetterId, document.id))
    })
  }

  await logAuditEvent({
    actorEmail: currentEmployee.email,
    action: 'spl.status_changed',
    entityType: 'overtime_command_letter',
    entityLabel: document.splNumber,
    description: `Status SPL diubah dari ${document.status} menjadi ${payload.targetStatus}.`,
  })

  revalidateDailyActivitySurfaces()
}

export async function submitDailyActivityAction(formData: FormData) {
  await ensureDailyActivitySeedData()

  const payload = submitActivitySchema.parse(Object.fromEntries(formData))
  const photoFiles = formData
    .getAll('photoFiles')
    .filter((file): file is File => file instanceof File && file.size > 0)
  const legacyPhotoFile = formData.get('photoFile')
  if (legacyPhotoFile instanceof File && legacyPhotoFile.size > 0) {
    photoFiles.unshift(legacyPhotoFile)
  }
  const employee = await getAuthenticatedEmployeeContext()
  const employeeId = employee.id

  if (payload.employeeId !== employeeId) {
    throw new Error('Activity hanya bisa disubmit untuk akun Anda sendiri.')
  }

  const rawTeamMemberIds: number[] = JSON.parse(payload.teamMemberEmployeeIdsJson || '[]')
  // Exclude submitter's own ID, filter valid numeric IDs, and deduplicate
  const cleanTeamMemberIds = Array.from(
    new Set(rawTeamMemberIds.filter((id) => typeof id === 'number' && id > 0 && id !== employeeId))
  )
  const targetMemberIds = [employeeId, ...cleanTeamMemberIds]
  const allTargetEmployees = await db
    .select()
    .from(employees)
    .where(inArray(employees.id, targetMemberIds))

  if (allTargetEmployees.length !== targetMemberIds.length) {
    throw new Error('Beberapa anggota tim tidak ditemukan.')
  }

  // Sort them so that submitter (employeeId) is always first
  allTargetEmployees.sort((a, b) => {
    if (a.id === employeeId) return -1
    if (b.id === employeeId) return 1
    return 0
  })

  const teamNameList = allTargetEmployees.map((emp) => emp.name).join(', ')

  const startTime = parseDateTime(payload.startTime, 'Waktu mulai')
  const endTime = parseDateTime(payload.endTime, 'Waktu selesai')
  if (endTime <= startTime) {
    throw new Error('Waktu selesai harus setelah waktu mulai.')
  }

  // Batch overlap check — single query for all target employees instead of N sequential queries
  const overlapRows = await db
    .select({ id: activities.id, title: activities.title, employeeId: activities.employeeId })
    .from(activities)
    .where(
      and(
        inArray(activities.employeeId, allTargetEmployees.map((e) => e.id)),
        sql`${activities.startTime} < ${endTime} and ${activities.endTime} > ${startTime}`,
        isNull(activities.deletedAt)
      )
    )
    .limit(allTargetEmployees.length)

  if (overlapRows.length > 0) {
    const firstOverlap = overlapRows[0]
    const conflictEmp = allTargetEmployees.find((e) => e.id === firstOverlap.employeeId)
    throw new Error(`Waktu bertabrakan dengan aktivitas ${firstOverlap.title}${conflictEmp ? ` untuk ${conflictEmp.name}` : ''}.`)
  }

  if (payload.assignmentId) {
    const [assignmentActivity] = await db
      .select({ id: activities.id })
      .from(activities)
      .where(eq(activities.assignmentId, payload.assignmentId))
      .limit(1)

    if (assignmentActivity) {
      throw new Error('Pekerjaan aktual ini sudah pernah disubmit.')
    }
  }

  const [selectedAssignment] =
    payload.assignmentId == null
      ? [null]
      : await db
          .select({
            id: jobAssignments.id,
            priority: jobAssignments.priority,
            assignedToEmployeeId: jobAssignments.assignedToEmployeeId,
            libraryActivityId: jobAssignments.libraryActivityId,
            customJobName: jobAssignments.customJobName,
          })
          .from(jobAssignments)
          .where(eq(jobAssignments.id, payload.assignmentId))
          .limit(1)

  if (payload.sourceMode === 'assigned' && !selectedAssignment) {
    throw new Error('Pekerjaan aktual belum dipilih.')
  }

  if (selectedAssignment && selectedAssignment.assignedToEmployeeId !== employeeId) {
    throw new Error('Pekerjaan aktual tidak sesuai dengan karyawan login.')
  }

  const routeSessionItems = parseRouteSessionItems(payload.routeSessionItemsJson)
  const isChecklistOnlySubmission =
    routeSessionItems.some((item) => item.isChecked) &&
    (payload.overtimeCommandLetterId != null || payload.routeTemplateId != null)

  const effectiveLibraryActivityId =
    payload.sourceMode === 'assigned'
      ? (selectedAssignment?.libraryActivityId ?? null)
      : payload.sourceMode === 'custom'
        ? null
        : (payload.libraryActivityId ?? null)

  const [library] =
    effectiveLibraryActivityId == null
      ? [null]
      : await db
          .select()
          .from(activityLibraries)
          .where(eq(activityLibraries.id, effectiveLibraryActivityId))
          .limit(1)

  if (payload.sourceMode === 'self_input' && !library && !isChecklistOnlySubmission) {
    throw new Error('Library activity has not been selected.')
  }

  if (payload.sourceMode === 'assigned' && selectedAssignment?.libraryActivityId && !library) {
    throw new Error('Library assignment tidak ditemukan.')
  }

  if (payload.sourceMode === 'assigned' && !library && !selectedAssignment?.customJobName.trim()) {
    throw new Error('Pekerjaan aktual belum punya activity library atau custom job.')
  }

  if (library?.siteId && library.siteId !== employee.siteId) {
    throw new Error("Library activity is not available for this user's site.")
  }

  if (payload.sourceMode === 'custom') {
    if (payload.customActivityName.trim().length === 0) {
      throw new Error('Nama custom activity wajib diisi.')
    }
  }

  const isSelfInputWithoutChecklist =
    payload.sourceMode === 'self_input' &&
    (!routeSessionItems || routeSessionItems.length === 0 || routeSessionItems.every((i) => !i.isChecked))

  if (payload.overtimeCommandLetterId != null && !isSelfInputWithoutChecklist) {
    const [spl] = await db
      .select({
        id: overtimeCommandLetters.id,
        siteId: overtimeCommandLetters.siteId,
        status: overtimeCommandLetters.status,
        workDate: overtimeCommandLetters.workDate,
        plannedStartAt: overtimeCommandLetters.plannedStartAt,
      })
      .from(overtimeCommandLetters)
      .where(eq(overtimeCommandLetters.id, payload.overtimeCommandLetterId))
      .limit(1)

    if (
      !spl ||
      spl.siteId !== employee.siteId ||
      !['submitted', 'approved'].includes(spl.status.toLowerCase())
    ) {
      throw new Error('SPL tidak valid atau belum diajukan untuk site Anda.')
    }
    if (
      startOfDay(spl.plannedStartAt ?? spl.workDate).getTime() !== startOfDay(startTime).getTime()
    ) {
      throw new Error('Tanggal aktivitas tidak sesuai dengan tanggal SPL.')
    }

    const assignedLines = await db
      .select({ id: overtimeCommandLetterItems.id })
      .from(overtimeCommandLetterItems)
      .where(
        and(
          eq(overtimeCommandLetterItems.overtimeCommandLetterId, spl.id),
          eq(overtimeCommandLetterItems.assignedEmployeeId, employee.id)
        )
      )
    const assignedLineIds = new Set(assignedLines.map((line) => line.id))
    if (
      assignedLineIds.size === 0 ||
      routeSessionItems.some(
        (item) =>
          item.overtimeCommandLetterItemId == null ||
          !assignedLineIds.has(item.overtimeCommandLetterItemId)
      )
    ) {
      throw new Error('Checklist SPL tidak sesuai dengan penugasan karyawan login.')
    }
  }

  if (payload.routeTemplateId != null) {
    const [routeTemplate] = await db
      .select({ siteId: activityRouteTemplates.siteId, isActive: activityRouteTemplates.isActive })
      .from(activityRouteTemplates)
      .where(eq(activityRouteTemplates.id, payload.routeTemplateId))
      .limit(1)
    if (
      !routeTemplate?.isActive ||
      (routeTemplate.siteId != null && routeTemplate.siteId !== employee.siteId)
    ) {
      throw new Error('Route activity tidak tersedia untuk site Anda.')
    }
  }
  const checklistRequiresPhoto = routeSessionItems.some(
    (item) => item.isChecked && item.snapshotPayload?.requiresPhoto === true
  )
  const requiresEvidencePhoto = Boolean(library?.requiresPhoto) || checklistRequiresPhoto

  const dayStart = startOfDay(startTime)
  const dayEnd = endOfDay(startTime)
  const configMap = await getDailyActivityConfigMap()

  if (payload.sourceMode === 'custom') {
    const [customCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(activities)
      .where(
        and(
          eq(activities.employeeId, employeeId),
          eq(activities.sourceMode, 'custom'),
          gte(activities.startTime, dayStart),
          lte(activities.startTime, dayEnd)
        )
      )

    const customLimit = configMap.get('custom_activity_daily_limit') || 3
    if ((customCount?.count ?? 0) >= customLimit) {
      throw new Error(`Batas custom activity per hari adalah ${customLimit}.`)
    }
  }

  const submissionTime = new Date()
  const submissionCategory = getSubmissionCategory(submissionTime, endTime)
  const penaltyPoints = getPenaltyPoints(submissionCategory, configMap)

  const [activeModifier] = await db
    .select()
    .from(activityModifiers)
    .where(
      and(
        eq(activityModifiers.isActive, true),
        lte(activityModifiers.startDate, submissionTime),
        or(
          gte(activityModifiers.endDate, submissionTime),
          sql`${activityModifiers.endDate} is null`
        )
      )
    )
    .orderBy(desc(activityModifiers.multiplier))
    .limit(1)

  const basePoints = payload.sourceMode === 'custom' ? 0 : (library?.basePoints ?? 0)
  const modifierMultiplier = activeModifier?.multiplier ?? 100
  const multiplierBonus = Math.round((basePoints * Math.max(0, modifierMultiplier - 100)) / 100)
  const morningBonus = submissionCategory === 'on_time_morning' ? 5 : 0
  const projectedReward =
    submissionCategory === 'backdated' ? 0 : basePoints + multiplierBonus + morningBonus
  const projectedNet = projectedReward - penaltyPoints
  const autoApprove =
    Boolean(library?.autoApproveIfGpsValid) && payload.gpsValid && payload.sourceMode !== 'custom'
  const isSplEvidenceSubmission = payload.overtimeCommandLetterId != null
  const needsApproval =
    !isSplEvidenceSubmission &&
    (payload.sourceMode === 'custom' || library?.approvalRequired !== false)
  const activityStatus = isSplEvidenceSubmission
    ? 'Submitted'
    : autoApprove
      ? 'Approved'
      : needsApproval
        ? 'Pending L1'
        : 'Approved'
  const pointsAwarded = Math.max(projectedReward, 0)

  const directPhotoUrls = z
    .array(z.string().url().max(2000))
    .parse(JSON.parse(payload.photoUrlsJson || '[]'))
  const uploadedPhotoUrls = payload.photoUrl.trim()
    ? [payload.photoUrl.trim(), ...directPhotoUrls]
    : [...directPhotoUrls]
  for (const photoFile of photoFiles) {
    if (!photoFile.type.startsWith('image/')) {
      throw new Error('Documentation file must be an image.')
    }

    if (photoFile.size > MAX_ACTIVITY_PHOTO_SIZE) {
      throw new Error('Documentation photo too large. Max 5MB.')
    }

    const uploaded = await uploadAnyFileToS3(photoFile, 'activity-photos')
    uploadedPhotoUrls.push(uploaded.url)
  }

  // Photo evidence is optional across all activity modes
  let createdActivityId: number | null = null
  let reusedExistingActivity: boolean = false
  let pendingApproverName: string | null = null
  let pendingApproverEmail: string | null = null
  const activityTitle =
    library?.activityName ||
    selectedAssignment?.customJobName.trim() ||
    payload.customActivityName.trim() ||
    routeSessionItems.find((item) => item.isChecked)?.snapshotLabel ||
    'Checklist activity'
  const activityCode =
    library?.activityCode ??
    (isChecklistOnlySubmission
      ? payload.overtimeCommandLetterId
        ? 'SPL-CHECKLIST'
        : 'ROUTE-CHECKLIST'
      : payload.sourceMode === 'assigned'
        ? 'ASN-001'
        : 'CUS-001')
  const activityType =
    library?.category ??
    (isChecklistOnlySubmission
      ? payload.overtimeCommandLetterId
        ? 'SPL Checklist'
        : 'Route Checklist'
      : payload.sourceMode === 'assigned'
        ? 'Assigned'
        : 'Custom')
  const memberRoutes = await Promise.all(
    allTargetEmployees.map(async (emp) => {
      const route = needsApproval
        ? await resolveApprovalRouteForActivity({
            employeeId: emp.id,
            activityType,
            priority: selectedAssignment?.priority ?? 'normal',
            transactionType: 'activity',
            overtimeMinutes: 0,
            at: endTime,
          })
        : null
      return { employeeId: emp.id, route }
    })
  )

  for (const emp of allTargetEmployees) {
    const memberRouteObj = memberRoutes.find((r) => r.employeeId === emp.id)
    const route = memberRouteObj?.route ?? null
    const firstApprovalStep = route?.steps[0]?.stepOrder ?? null
    const firstApprovers =
      firstApprovalStep == null
        ? []
        : route!.steps.filter(
            (step) => step.stepOrder === firstApprovalStep && step.approverEmployeeId != null
          )
    if (needsApproval && firstApprovers.length === 0) {
      throw new Error(`Approval route Daily Activity belum memiliki approver aktif untuk ${emp.name}.`)
    }
  }

  const memberActivityInfos: Array<{
    memberEmployee: typeof employee
    createdActivityId: number
    activityTitle: string
    activityStatus: string
    needsApproval: boolean
    approvalRoute: any
    firstApprovers: any[]
    projectedNet: number
    pointsAwarded: number
  }> = []

  await db.transaction(async (tx) => {
    if (isSplEvidenceSubmission) {
      await tx.execute(
        sql`select pg_advisory_xact_lock(${employeeId}, ${payload.overtimeCommandLetterId!})`
      )
    }

    for (const memberEmployee of allTargetEmployees) {
      const empId = memberEmployee.id
      const memberRouteObj = memberRoutes.find((r) => r.employeeId === empId)
      const approvalRoute = memberRouteObj?.route ?? null
      const firstApprovalStep = approvalRoute?.steps[0]?.stepOrder ?? null
      const firstApprovers =
        firstApprovalStep == null
          ? []
          : approvalRoute!.steps.filter(
              (step) => step.stepOrder === firstApprovalStep && step.approverEmployeeId != null
            )

      if (isSplEvidenceSubmission) {
        const [existingSession] = await tx
          .select({
            activityId: dailyActivitySessions.activityId,
            status: dailyActivitySessions.status,
          })
          .from(dailyActivitySessions)
          .where(
            and(
              eq(dailyActivitySessions.employeeId, empId),
              eq(
                dailyActivitySessions.overtimeCommandLetterId,
                payload.overtimeCommandLetterId!
              )
            )
          )
          .orderBy(desc(dailyActivitySessions.updatedAt))
          .limit(1)

        if (
          existingSession?.activityId &&
          ['submitted', 'approved'].includes(existingSession.status.toLowerCase())
        ) {
          const existingPhotos = await tx
            .select({ fileUrl: activityPhotos.fileUrl })
            .from(activityPhotos)
            .where(eq(activityPhotos.activityId, existingSession.activityId))
          const existingUrls = new Set(existingPhotos.map((photo) => photo.fileUrl))
          const newPhotoUrls = Array.from(new Set(uploadedPhotoUrls)).filter(
            (fileUrl) => !existingUrls.has(fileUrl)
          )

          if (newPhotoUrls.length > 0) {
            await tx.insert(activityPhotos).values(
              newPhotoUrls.map((fileUrl, index) => ({
                activityId: existingSession.activityId!,
                fileUrl,
                caption: `Upload field documentation ${existingPhotos.length + index + 1}`,
                uploadedAt: submissionTime,
              }))
            )
            await tx
              .update(activities)
              .set({ photoCount: existingPhotos.length + newPhotoUrls.length })
              .where(eq(activities.id, existingSession.activityId))
          }

          if (empId === employeeId) {
            createdActivityId = existingSession.activityId
            reusedExistingActivity = true
          }
          continue
        }
      }

      const [createdActivity] = await tx
        .insert(activities)
        .values({
          siteId: memberEmployee.siteId,
          employeeId: empId,
          activityCode,
          activityType,
          title: activityTitle,
          unitNumber: payload.equipmentNo || '-',
          libraryActivityId: effectiveLibraryActivityId,
          assignmentId: empId === employeeId ? (payload.assignmentId ?? null) : null,
          sourceMode: payload.sourceMode,
          customActivityName: payload.customActivityName,
          customActivityDescription: payload.customActivityDescription,
          startTime,
          endTime,
          status: activityStatus,
          priority:
            selectedAssignment?.priority ?? (payload.sourceMode === 'assigned' ? 'High' : 'Normal'),
          submissionTime,
          submissionCategory,
          equipmentNo: payload.equipmentNo,
          materialUsed: payload.materialUsed,
          tireCount: payload.tireCount,
          gpsLat: payload.gpsLat,
          gpsLng: payload.gpsLng,
          gpsValid: payload.gpsValid,
          photoCount: uploadedPhotoUrls.length,
          remarks: payload.notes,
          pointsAwarded,
          penaltyDeducted: penaltyPoints,
          isTeamActivity: allTargetEmployees.length > 1,
          teamNameList: allTargetEmployees.length > 1 ? teamNameList : '',
          createdAt: startTime,
        })
        .returning({ id: activities.id })

      if (empId === employeeId) {
        createdActivityId = createdActivity.id
      }

      memberActivityInfos.push({
        memberEmployee: memberEmployee as any,
        createdActivityId: createdActivity.id,
        activityTitle,
        activityStatus,
        needsApproval,
        approvalRoute,
        firstApprovers,
        projectedNet,
        pointsAwarded,
      })

      await syncDailyRouteSessionForActivity({
        tx,
        activityId: createdActivity.id,
        employee: memberEmployee as any,
        payload: {
          ...payload,
          routeSummaryRemark: payload.routeSummaryRemark || payload.notes,
        },
        submissionTime,
        startTime,
      })

      if (uploadedPhotoUrls.length > 0) {
        await tx.insert(activityPhotos).values(
          uploadedPhotoUrls.map((fileUrl, index) => ({
            activityId: createdActivity.id,
            fileUrl,
            caption: `Upload field documentation ${index + 1}`,
            uploadedAt: submissionTime,
          }))
        )
      }

      if (penaltyPoints > 0) {
        await tx.insert(penaltyEvents).values({
          employeeId: empId,
          siteId: memberEmployee.siteId,
          activityId: createdActivity.id,
          penaltyCode:
            submissionCategory === 'late_minor'
              ? 'PEN-02'
              : submissionCategory === 'late_major'
                ? 'PEN-03'
                : 'PEN-01',
          penaltyType: submissionCategory,
          referenceDate: submissionTime,
          pointsDeducted: penaltyPoints,
          description: `Penalty otomatis karena submission ${submissionCategory}.`,
          isDisputed: false,
          disputeStatus: 'none',
          createdAt: submissionTime,
        })
      }

      if (isSplEvidenceSubmission) {
        // Approval SPL owns the decision for its linked Daily Activity evidence.
      } else if (autoApprove || !needsApproval) {
        await tx
          .update(dailyActivitySessions)
          .set({ status: 'approved', approvedAt: submissionTime, updatedAt: submissionTime })
          .where(eq(dailyActivitySessions.activityId, createdActivity.id))
        const updatedBalance = Math.max(0, memberEmployee.totalPoints + projectedNet)

        await tx.insert(pointEvents).values({
          employeeId: empId,
          transactionType: projectedNet >= 0 ? 'reward' : 'penalty',
          sourceType: 'activity',
          sourceId: createdActivity.id,
          category: 'Daily Activity',
          label: `${activityTitle} • Auto approved`,
          points: pointsAwarded,
          balanceAfter: updatedBalance,
          metadata: JSON.stringify({
            submissionCategory,
            modifierMultiplier,
            morningBonus,
            penaltyPoints,
          }),
          createdAt: submissionTime,
        })

        await tx
          .update(employees)
          .set({
            totalPoints: updatedBalance,
          })
          .where(eq(employees.id, empId))
      } else {
        const routeSnapshot = serializeApprovalRoute(approvalRoute!)
        await tx.insert(approvals).values(
          firstApprovers.map((approver) => ({
            activityId: createdActivity.id,
            level: approver.stepOrder,
            approverName: approver.approverName,
            approverEmployeeId: approver.approverEmployeeId,
            approvalMatrixId: approvalRoute!.matrixId,
            approvalStepId: approver.approvalMatrixStepId,
            status: 'pending',
            submittedAt: submissionTime,
            reviewedAt: null,
            overtimeMinutes: 0,
            resolutionSource: approver.resolutionSource,
            routeSnapshot,
            decisionNote: '',
            createdAt: submissionTime,
          }))
        )
      }
    }

    if (payload.assignmentId) {
      await tx
        .update(jobAssignments)
        .set({
          status: autoApprove ? 'APPROVED' : 'SUBMITTED',
          updatedAt: new Date(),
        })
        .where(eq(jobAssignments.id, payload.assignmentId))
    }
  })

  if (reusedExistingActivity) {
    revalidateDailyActivitySurfaces()
    return
  }

  // Run all post-submit side effects in parallel across members — do NOT block the response
  await Promise.allSettled(
    memberActivityInfos.map(async (info) => {
      const empId = info.memberEmployee.id

      // Streak + EWH recalc — non-blocking, errors are swallowed
      await Promise.allSettled([
        updateStreakForEmployee(empId, endTime),
        (async () => {
          try {
            const { recalculateEwhForEmployee, recalculateUnitUtility } = await import('@/app/dashboard/ewh/actions')
            await recalculateEwhForEmployee(empId, info.memberEmployee.siteId, startTime)
            const uniqueUnits = Array.from(new Set(
              routeSessionItems
                .map((item) => item.unitNumber?.trim())
                .filter((unit): unit is string => typeof unit === 'string' && unit.length > 0)
            ))
            await Promise.allSettled(
              uniqueUnits.map((unit) => recalculateUnitUtility(unit, info.memberEmployee.siteId, startTime))
            )
          } catch (err) {
            console.error(`[EWH/Utility] Recalculate failed for ${info.memberEmployee.name}:`, err)
          }
        })(),
        logAuditEvent({
          actorEmail: employee.email,
          action: 'daily_activity.submitted',
          entityType: 'daily_activity',
          entityLabel: `${info.createdActivityId}`,
          description: `${info.activityTitle} disubmit untuk ${info.memberEmployee.name} dengan status ${info.activityStatus}.`,
        }),
      ])

      if (info.needsApproval) {
        // Batch-fetch all approver emails in one query instead of N sequential lookups
        const approverEmpIds = info.firstApprovers
          .map((a: any) => a.approverEmployeeId)
          .filter((id: any): id is number => typeof id === 'number' && id > 0)

        const [approverEmailRows, superAdmins] = await Promise.all([
          approverEmpIds.length > 0
            ? db.select({ email: employees.email }).from(employees).where(inArray(employees.id, approverEmpIds))
            : Promise.resolve([] as Array<{ email: string | null }>),
          db.select({ email: employees.email }).from(employees).where(eq(employees.accessRole, 'superadmin')),
        ])

        const candidateApproverEmails: string[] = []
        for (const approver of info.firstApprovers) {
          if (approver.approverEmail) candidateApproverEmails.push(approver.approverEmail)
          if (approver.approverName?.includes('@')) candidateApproverEmails.push(approver.approverName)
        }
        for (const row of approverEmailRows) {
          if (row.email) candidateApproverEmails.push(row.email)
        }
        for (const sa of superAdmins) {
          if (sa.email) candidateApproverEmails.push(sa.email)
        }

        await Promise.allSettled([
          // Bell notification
          (async () => {
            try {
              await notifyWorkflowBellRecipients({
                recipientEmails: candidateApproverEmails,
                eventType: 'daily_activity_pending_approval',
                category: 'approval_requests',
                title: 'Daily Activity Menunggu Approval',
                body: `${info.memberEmployee.name} - ${info.activityTitle}`,
                url: '/dashboard/approval',
                tagPrefix: 'daily-activity-pending',
                metadata: { activityId: info.createdActivityId },
              })
            } catch (notificationError) {
              console.error('Failed to dispatch Daily Activity approval notification', notificationError)
            }
          })(),
          // Email to first approver
          (async () => {
            const firstApprover = info.firstApprovers[0]
            if (!firstApprover) return
            try {
              const [approverContact] = approverEmailRows.filter(
                (r) => r.email != null
              )
              const approverContactEmail = approverEmailRows.find((r) => r.email)?.email ??
                (firstApprover.approverEmail || null)

              if (approverContactEmail) {
                const emailContent = buildWorkflowEmailContent({
                  title: 'Daily Activity menunggu approval',
                  greeting: `Halo ${firstApprover.approverName || 'Approver'},`,
                  intro: `${employee.name} mengirim daily activity baru untuk ${info.memberEmployee.name} dan membutuhkan review Anda.`,
                  details: [
                    `Karyawan: ${info.memberEmployee.name}`,
                    `Aktivitas: ${info.activityTitle}`,
                    `Kategori: ${activityType}`,
                    `Waktu: ${submissionTime.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}`,
                    payload.notes ? `Catatan: ${payload.notes}` : null,
                  ],
                  ctaLabel: 'Buka Approval',
                  ctaUrl: getAppUrl('/dashboard/approval'),
                })

                await sendWorkflowEmail({
                  to: approverContactEmail,
                  actorEmail: employee.email,
                  templateCode: 'daily_activity_pending_approval',
                  templateName: 'Daily Activity Pending Approval',
                  variables: {
                    employeeName: info.memberEmployee.name,
                    activityTitle: info.activityTitle,
                    activityType,
                    submissionTime: submissionTime.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
                    notes: payload.notes ? `Catatan: ${payload.notes}` : '',
                  },
                  fallbackSubject: `Daily Activity menunggu approval - ${info.memberEmployee.name}`,
                  fallbackHtml: emailContent.html,
                  fallbackText: emailContent.text,
                })
              }
            } catch (emailError) {
              console.error('Failed to send daily activity approval email', emailError)
            }
          })(),
        ])
      }
    })
  )

  revalidateDailyActivitySurfaces()

  if (createdActivityId == null) {
    throw new Error('Activity failed to create.')
  }
}

export async function submitDailyActivityWithStateAction(
  _previousState: DailyActivitySubmitActionState,
  formData: FormData
): Promise<DailyActivitySubmitActionState> {
  try {
    await submitDailyActivityAction(formData)

    return {
      status: 'success',
      message: 'Activity berhasil disimpan ke Daily Activity System.',
    }
  } catch (error) {
    return {
      status: 'error',
      message: getReadableActionError(
        error,
        'Activity gagal disimpan. Cek field wajib dan coba lagi.'
      ),
    }
  }
}

export async function updateDailyActivitySessionDocumentSignoffAction(formData: FormData) {
  await ensureDailyActivitySeedData()

  const payload = updateDailyActivitySessionDocumentSignoffSchema.parse(
    Object.fromEntries(formData)
  )
  const currentEmployee = await getAuthenticatedEmployeeContext()

  const [sessionRow] = await db
    .select({
      id: dailyActivitySessions.id,
      employeeId: dailyActivitySessions.employeeId,
      siteId: dailyActivitySessions.siteId,
    })
    .from(dailyActivitySessions)
    .where(eq(dailyActivitySessions.id, payload.sessionId))
    .limit(1)

  if (!sessionRow) {
    throw new Error('Session dokumen tidak ditemukan.')
  }

  const isOwner =
    sessionRow.employeeId === currentEmployee.id && sessionRow.siteId === currentEmployee.siteId
  const canReviewHr =
    sessionRow.siteId === currentEmployee.siteId &&
    ['Super Admin', 'Site Admin', 'HC Manager'].includes(currentEmployee.accessRole)
  if (
    (payload.signoffSection === 'employee' && !isOwner) ||
    (payload.signoffSection === 'hr' && !canReviewHr)
  ) {
    throw new Error('Anda tidak punya akses untuk dokumen session ini.')
  }

  const [existingSignoff] = await db
    .select()
    .from(dailyActivitySessionSignoffs)
    .where(eq(dailyActivitySessionSignoffs.sessionId, payload.sessionId))
    .limit(1)

  const employeeSignatureUrl =
    payload.signoffSection === 'employee'
      ? await uploadSignatureFile(
          formData.get('employeeSignatureFile'),
          'daily-activity-signatures/employee'
        )
      : null
  const hrSignatureUrl =
    payload.signoffSection === 'hr'
      ? await uploadSignatureFile(formData.get('hrSignatureFile'), 'daily-activity-signatures/hr')
      : null

  const now = new Date()
  const nextEmployeeSignatureUrl =
    employeeSignatureUrl ?? existingSignoff?.employeeSignatureUrl ?? ''
  const nextHrSignatureUrl = hrSignatureUrl ?? existingSignoff?.hrSignatureUrl ?? ''
  const hasEmployeeSignoff = Boolean(payload.employeeSignerName.trim() || nextEmployeeSignatureUrl)
  const hasHrSignoff = Boolean(
    payload.hrCheckerName.trim() ||
    nextHrSignatureUrl ||
    payload.hrChecklistStatus !== 'pending' ||
    payload.hrChecklistNote.trim()
  )

  const values = {
    employeeSignerName:
      payload.signoffSection === 'employee'
        ? payload.employeeSignerName
        : (existingSignoff?.employeeSignerName ?? ''),
    employeeSignatureUrl: nextEmployeeSignatureUrl,
    employeeSignedAt:
      payload.signoffSection === 'employee' && hasEmployeeSignoff
        ? (existingSignoff?.employeeSignedAt ?? now)
        : (existingSignoff?.employeeSignedAt ?? null),
    customerSignerName:
      payload.signoffSection === 'employee'
        ? payload.customerSignerName
        : (existingSignoff?.customerSignerName ?? ''),
    customerSignatureUrl: '',
    customerSignedAt: null,
    hrCheckerName:
      payload.signoffSection === 'hr'
        ? currentEmployee.name
        : (existingSignoff?.hrCheckerName ?? ''),
    hrChecklistStatus:
      payload.signoffSection === 'hr'
        ? payload.hrChecklistStatus
        : (existingSignoff?.hrChecklistStatus ?? 'pending'),
    hrChecklistNote:
      payload.signoffSection === 'hr'
        ? payload.hrChecklistNote
        : (existingSignoff?.hrChecklistNote ?? ''),
    hrSignatureUrl: nextHrSignatureUrl,
    hrCheckedAt:
      payload.signoffSection === 'hr' && hasHrSignoff
        ? (existingSignoff?.hrCheckedAt ?? now)
        : (existingSignoff?.hrCheckedAt ?? null),
    updatedAt: now,
  }

  if (existingSignoff) {
    await db
      .update(dailyActivitySessionSignoffs)
      .set(values)
      .where(eq(dailyActivitySessionSignoffs.id, existingSignoff.id))
  } else {
    await db.insert(dailyActivitySessionSignoffs).values({
      sessionId: payload.sessionId,
      ...values,
      createdAt: now,
    })
  }

  revalidateDailyActivitySurfaces()
  safeRevalidatePath(`/dashboard/activity-hub/document/${payload.sessionId}`)
  safeRevalidatePath(`/mobile/activity/document/${payload.sessionId}`)
}

export async function updateDailyActivitySessionDocumentSignoffWithStateAction(
  _previousState: DailyActivityDocumentSignoffActionState,
  formData: FormData
): Promise<DailyActivityDocumentSignoffActionState> {
  try {
    await updateDailyActivitySessionDocumentSignoffAction(formData)

    return {
      status: 'success',
      message: 'Signoff dokumen berhasil diperbarui.',
    }
  } catch (error) {
    return {
      status: 'error',
      message: getReadableActionError(error, 'Signoff dokumen gagal disimpan.'),
    }
  }
}

export async function createDailyActivityConfigAction(input: FormData | {
  configKey: string
  configLabel: string
  configValue: string
  valueType: 'boolean' | 'number' | 'text' | 'json'
  description?: string
  siteId?: number | null
  isActive?: boolean
}) {
  await ensureDailyActivitySeedData()

  const perm = await getCurrentMenuPermission('activity_configuration')
  if (!perm.canEdit) {
    throw new Error('Permission denied: Anda tidak memiliki hak akses untuk menambah rule global.')
  }

  const currentEmployee = await getAuthenticatedEmployeeContext()

  let rawData: any
  if (input instanceof FormData) {
    rawData = {
      configKey: input.get('configKey'),
      configLabel: input.get('configLabel'),
      configValue: input.get('configValue'),
      valueType: input.get('valueType') || 'text',
      description: input.get('description'),
      siteId: input.get('siteId') || undefined,
      isActive: input.get('isActive') === 'true' || input.get('isActive') === 'on' || input.get('isActive') === '1',
    }
  } else {
    rawData = input
  }

  const payload = createConfigSchema.parse(rawData)

  const [existing] = await db
    .select({ id: dailyActivityConfigs.id })
    .from(dailyActivityConfigs)
    .where(eq(dailyActivityConfigs.configKey, payload.configKey))
    .limit(1)

  if (existing) {
    throw new Error(`Config key "${payload.configKey}" sudah digunakan. Gunakan key lain.`)
  }

  await db.insert(dailyActivityConfigs).values({
    siteId: payload.siteId ?? null,
    configKey: payload.configKey,
    configLabel: payload.configLabel,
    configValue: payload.configValue,
    valueType: payload.valueType,
    description: payload.description,
    isEditableBySectionHead: false,
    isActive: payload.isActive,
    updatedByEmployeeId: currentEmployee?.id ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  revalidateDailyActivitySurfaces()
  return { success: true, message: 'Rule global berhasil ditambahkan.' }
}

export async function updateDailyActivityConfigAction(input: FormData | {
  id: number
  configLabel?: string
  configValue?: string
  valueType?: 'boolean' | 'number' | 'text' | 'json'
  description?: string
  siteId?: number | null
  isActive?: boolean
}) {
  await ensureDailyActivitySeedData()

  const perm = await getCurrentMenuPermission('activity_configuration')
  if (!perm.canEdit) {
    throw new Error('Permission denied: Anda tidak memiliki hak akses untuk mengubah rule global.')
  }

  const currentEmployee = await getAuthenticatedEmployeeContext()

  let rawData: any
  if (input instanceof FormData) {
    rawData = {
      id: input.get('id'),
      configLabel: input.get('configLabel') || undefined,
      configValue: input.get('configValue'),
      valueType: input.get('valueType') || undefined,
      description: input.get('description') || undefined,
      siteId: input.get('siteId') || undefined,
      isActive: input.has('isActive')
        ? input.get('isActive') === 'true' || input.get('isActive') === 'on' || input.get('isActive') === '1'
        : false,
    }
  } else {
    rawData = input
  }

  const configId = Number(rawData.id)
  if (!configId || isNaN(configId)) {
    throw new Error('ID konfigurasi tidak valid.')
  }

  const [existingConfig] = await db
    .select()
    .from(dailyActivityConfigs)
    .where(eq(dailyActivityConfigs.id, configId))
    .limit(1)

  if (!existingConfig) {
    throw new Error('Rule konfigurasi tidak ditemukan.')
  }

  const configLabel = rawData.configLabel ? String(rawData.configLabel).trim() : existingConfig.configLabel
  const configValue = rawData.configValue !== undefined && rawData.configValue !== null ? String(rawData.configValue).trim() : existingConfig.configValue
  const valueType = rawData.valueType ? String(rawData.valueType) : existingConfig.valueType
  const description = rawData.description !== undefined && rawData.description !== null ? String(rawData.description).trim() : existingConfig.description
  const siteId = rawData.siteId !== undefined && rawData.siteId !== null && rawData.siteId !== '' ? Number(rawData.siteId) : existingConfig.siteId
  const isActive = rawData.isActive !== undefined ? Boolean(rawData.isActive) : existingConfig.isActive

  await db
    .update(dailyActivityConfigs)
    .set({
      configLabel,
      configValue,
      valueType,
      description,
      siteId,
      isActive,
      updatedByEmployeeId: currentEmployee?.id ?? null,
      updatedAt: new Date(),
    })
    .where(eq(dailyActivityConfigs.id, configId))

  revalidateDailyActivitySurfaces()
  return { success: true, message: 'Rule global berhasil diperbarui.' }
}

export async function deleteDailyActivityConfigAction(input: FormData | { id: number }) {
  await ensureDailyActivitySeedData()

  const perm = await getCurrentMenuPermission('activity_configuration')
  if (!perm.canDelete) {
    throw new Error('Permission denied: Anda tidak memiliki hak akses untuk menghapus rule global.')
  }

  let id: number
  if (input instanceof FormData) {
    id = Number(input.get('id'))
  } else {
    id = input.id
  }

  const payload = deleteConfigSchema.parse({ id })

  await db.delete(dailyActivityConfigs).where(eq(dailyActivityConfigs.id, payload.id))

  revalidateDailyActivitySurfaces()
  return { success: true, message: 'Rule global berhasil dihapus.' }
}

export async function manageActivityModifierAction(formData: FormData) {
  await ensureDailyActivitySeedData()

  const payload = manageModifierSchema.parse(Object.fromEntries(formData))

  if (payload.intent === 'delete') {
    if (!payload.id) {
      throw new Error('Modifier tidak valid.')
    }

    await db.delete(activityModifiers).where(eq(activityModifiers.id, payload.id))
    revalidateDailyActivitySurfaces()
    return
  }

  const values = {
    siteId: payload.siteId ?? null,
    eventName: payload.eventName,
    description: payload.description,
    multiplier: payload.multiplier,
    startDate: payload.startDate ? parseDateTime(payload.startDate, 'Tanggal mulai') : new Date(),
    endDate: payload.endDate ? parseDateTime(payload.endDate, 'Tanggal selesai') : null,
    isActive: payload.isActive,
    createdByEmployeeId: payload.createdByEmployeeId ?? null,
  }

  if (payload.intent === 'create') {
    await db.insert(activityModifiers).values({
      ...values,
      createdAt: new Date(),
    })
  } else {
    if (!payload.id) {
      throw new Error('Modifier tidak valid.')
    }

    await db.update(activityModifiers).set(values).where(eq(activityModifiers.id, payload.id))
  }

  revalidateDailyActivitySurfaces()
}

export async function submitPointDisputeAction(formData: FormData) {
  await ensureDailyActivitySeedData()

  const payload = submitDisputeSchema.parse(Object.fromEntries(formData))
  const currentEmployee = await getAuthenticatedEmployeeContext()

  const [penalty] = await db
    .select({
      id: penaltyEvents.id,
      employeeId: penaltyEvents.employeeId,
      disputeStatus: penaltyEvents.disputeStatus,
    })
    .from(penaltyEvents)
    .where(eq(penaltyEvents.id, payload.penaltyEventId))
    .limit(1)

  if (!penalty || penalty.employeeId !== currentEmployee.id) {
    throw new Error('Penalty event tidak ditemukan.')
  }

  const [existingDispute] = await db
    .select({
      id: pointDisputes.id,
      status: pointDisputes.status,
    })
    .from(pointDisputes)
    .where(eq(pointDisputes.penaltyEventId, payload.penaltyEventId))
    .orderBy(desc(pointDisputes.createdAt))
    .limit(1)

  if (existingDispute?.status === 'pending' || penalty.disputeStatus === 'pending') {
    throw new Error('Penalty ini sudah memiliki dispute yang masih diproses.')
  }

  await db.transaction(async (tx) => {
    await tx.insert(pointDisputes).values({
      penaltyEventId: payload.penaltyEventId,
      employeeId: currentEmployee.id,
      reason: payload.reason,
      evidenceUrls: normalizeEvidenceUrls(payload.evidenceUrls),
      status: 'pending',
      resolutionNotes: '',
      resolvedByEmployeeId: null,
      resolvedAt: null,
      createdAt: new Date(),
    })

    await tx
      .update(penaltyEvents)
      .set({
        isDisputed: true,
        disputeStatus: 'pending',
        resolvedAt: null,
      })
      .where(eq(penaltyEvents.id, payload.penaltyEventId))
  })

  revalidateDailyActivitySurfaces()
}

export async function resolvePointDisputeAction(formData: FormData) {
  await ensureDailyActivitySeedData()

  const payload = resolveDisputeSchema.parse(Object.fromEntries(formData))

  const [dispute] = await db
    .select({
      id: pointDisputes.id,
      status: pointDisputes.status,
      penaltyEventId: pointDisputes.penaltyEventId,
      employeeId: pointDisputes.employeeId,
      penaltyCode: penaltyEvents.penaltyCode,
      pointsDeducted: penaltyEvents.pointsDeducted,
    })
    .from(pointDisputes)
    .innerJoin(penaltyEvents, eq(pointDisputes.penaltyEventId, penaltyEvents.id))
    .where(eq(pointDisputes.id, payload.disputeId))
    .limit(1)

  if (!dispute) {
    throw new Error('Dispute tidak ditemukan.')
  }

  if (dispute.status !== 'pending') {
    throw new Error('Dispute ini sudah pernah diproses.')
  }

  await db.transaction(async (tx) => {
    const resolvedAt = new Date()

    await tx
      .update(pointDisputes)
      .set({
        status: payload.decision,
        resolvedByEmployeeId: payload.resolvedByEmployeeId,
        resolutionNotes: payload.resolutionNotes,
        resolvedAt,
      })
      .where(eq(pointDisputes.id, payload.disputeId))

    await tx
      .update(penaltyEvents)
      .set({
        isDisputed: true,
        disputeStatus: payload.decision,
        resolvedAt,
      })
      .where(eq(penaltyEvents.id, dispute.penaltyEventId))

    if (payload.decision === 'approved' && dispute.pointsDeducted > 0) {
      const [existingRestoreEvent] = await tx
        .select({ id: pointEvents.id })
        .from(pointEvents)
        .where(
          and(
            eq(pointEvents.sourceType, 'point_dispute'),
            eq(pointEvents.sourceId, payload.disputeId)
          )
        )
        .limit(1)

      if (!existingRestoreEvent) {
        const [employee] = await tx
          .select({
            id: employees.id,
            totalPoints: employees.totalPoints,
          })
          .from(employees)
          .where(eq(employees.id, dispute.employeeId))
          .limit(1)

        if (employee) {
          const updatedBalance = employee.totalPoints + dispute.pointsDeducted

          await tx.insert(pointEvents).values({
            employeeId: dispute.employeeId,
            transactionType: 'reward',
            sourceType: 'point_dispute',
            sourceId: payload.disputeId,
            category: 'Dispute Adjustment',
            label: `Restorasi ${dispute.penaltyCode} setelah dispute disetujui`,
            points: dispute.pointsDeducted,
            balanceAfter: updatedBalance,
            metadata: JSON.stringify({
              penaltyEventId: dispute.penaltyEventId,
              decision: payload.decision,
            }),
            createdAt: resolvedAt,
          })

          await tx
            .update(employees)
            .set({ totalPoints: updatedBalance })
            .where(eq(employees.id, dispute.employeeId))
        }
      }
    }
  })

  revalidateDailyActivitySurfaces()
}

// ─── Daily Activity Multi-Step Approval ──────────────────────────────────────

const DAILY_ACTIVITY_APPROVAL_STEPS = [
  { stepOrder: 1, stepLabel: 'Karyawan Sign', approverRole: 'employee' },
  { stepOrder: 2, stepLabel: 'Leader / PJO', approverRole: 'leader' },
] as const

const approvalStepActionSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  approvalId: z.coerce.number().int().positive(),
  action: z.enum(['approve', 'reject', 'revert']),
  signatureDataUrl: z.string().trim().max(500000).optional().default(''),
  remarks: z.string().trim().max(2000).optional().default(''),
})

export async function initDailyActivityApprovalsAction(sessionId: number) {
  const currentEmployee = await getAuthenticatedEmployeeContext()

  const [session] = await db
    .select({
      id: dailyActivitySessions.id,
      sessionCode: dailyActivitySessions.sessionCode,
      workDate: dailyActivitySessions.workDate,
      employeeId: dailyActivitySessions.employeeId,
      siteId: dailyActivitySessions.siteId,
    })
    .from(dailyActivitySessions)
    .where(eq(dailyActivitySessions.id, sessionId))
    .limit(1)

  if (!session) {
    throw new Error('Session aktivitas tidak ditemukan.')
  }

  const isAdmin = ['Super Admin', 'Site Admin', 'HC Manager'].includes(
    currentEmployee.accessRole
  )
  const isOwner = session.employeeId === currentEmployee.id
  const canManage = isOwner || isAdmin

  if (!canManage) {
    throw new Error('Anda tidak punya akses untuk session ini.')
  }

  const [existing] = await db
    .select({ count: sql<number>`count(*)` })
    .from(dailyActivityApprovals)
    .where(eq(dailyActivityApprovals.sessionId, sessionId))

  if (existing && existing.count > 0) {
    return { success: true, message: 'Approval steps sudah ada.' }
  }

  const [sessionEmployee] = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      signatureDataUrl: employees.signatureDataUrl,
      directManagerId: employees.directManagerId,
      departmentId: employees.departmentId,
      sectionId: employees.sectionId,
      department: employees.department,
      section: employees.section,
    })
    .from(employees)
    .where(eq(employees.id, session.employeeId))
    .limit(1)

  const settings = await getDailyActivityWorkflowSettings()

  const [directManager] = sessionEmployee?.directManagerId
    ? await db
        .select({ id: employees.id, name: employees.name, email: employees.email })
        .from(employees)
        .where(eq(employees.id, sessionEmployee.directManagerId))
        .limit(1)
    : []

  // Resolve section name from masterSections or sessionEmployee.section
  let sectionName = sessionEmployee?.section || ''
  if (!sectionName && sessionEmployee?.sectionId) {
    const [secRow] = await db
      .select({ name: masterSections.name })
      .from(masterSections)
      .where(eq(masterSections.id, sessionEmployee.sectionId))
      .limit(1)
    if (secRow?.name) sectionName = secRow.name
  }

  // Check if settings.approvalMatrix has a matching section head
  let sectionHeadName = ''
  let sectionHeadEmail = ''
  let sectionHeadEmployeeId: number | null = null

  if (sectionName && settings.approvalMatrix?.sectionHeads) {
    const secList = Array.isArray(settings.approvalMatrix.sectionHeads)
      ? settings.approvalMatrix.sectionHeads
      : Object.values(settings.approvalMatrix.sectionHeads)

    const matched: any = secList.find((sh: any) =>
      sh.section && (
        sectionName.toLowerCase().includes(sh.section.toLowerCase()) ||
        sh.section.toLowerCase().includes(sectionName.toLowerCase())
      )
    )

    if (matched && matched.email) {
      sectionHeadName = matched.name
      sectionHeadEmail = matched.email
      const [empMatch] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email })
        .from(employees)
        .where(sql`LOWER(TRIM(${employees.email})) = ${String(matched.email).trim().toLowerCase()}`)
        .limit(1)
      if (empMatch) {
        sectionHeadEmployeeId = empMatch.id
        sectionHeadName = empMatch.name || sectionHeadName
      }
    }
  }

  // Fallback to database masterSections headEmployeeId if not matched in workflow settings
  if (!sectionHeadName && (sessionEmployee?.sectionId || sessionEmployee?.section)) {
    const [sectionRow] = sessionEmployee.sectionId
      ? await db
          .select({ headEmployeeId: masterSections.headEmployeeId })
          .from(masterSections)
          .where(eq(masterSections.id, sessionEmployee.sectionId))
          .limit(1)
      : await db
          .select({ headEmployeeId: masterSections.headEmployeeId })
          .from(masterSections)
          .where(sql`LOWER(TRIM(${masterSections.name})) = ${(sessionEmployee.section || '').trim().toLowerCase()}`)
          .limit(1)

    if (sectionRow?.headEmployeeId) {
      const [secEmp] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email })
        .from(employees)
        .where(eq(employees.id, sectionRow.headEmployeeId))
        .limit(1)
      if (secEmp) {
        sectionHeadEmployeeId = secEmp.id
        sectionHeadName = secEmp.name
        sectionHeadEmail = secEmp.email || ''
      }
    }
  }

  // Fallback to masterDepartments headEmployeeId if still empty
  if (!sectionHeadName && (sessionEmployee?.departmentId || sessionEmployee?.department)) {
    const [deptRow] = sessionEmployee.departmentId
      ? await db
          .select({ headEmployeeId: masterDepartments.headEmployeeId })
          .from(masterDepartments)
          .where(eq(masterDepartments.id, sessionEmployee.departmentId))
          .limit(1)
      : await db
          .select({ headEmployeeId: masterDepartments.headEmployeeId })
          .from(masterDepartments)
          .where(sql`LOWER(TRIM(${masterDepartments.name})) = ${(sessionEmployee.department || '').trim().toLowerCase()}`)
          .limit(1)

    if (deptRow?.headEmployeeId) {
      const [deptEmp] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email })
        .from(employees)
        .where(eq(employees.id, deptRow.headEmployeeId))
        .limit(1)
      if (deptEmp) {
        sectionHeadEmployeeId = deptEmp.id
        sectionHeadName = deptEmp.name
        sectionHeadEmail = deptEmp.email || ''
      }
    }
  }

  // 1. Resolve PJO / Head Location dari Master Data Location (sites.headEmployeeId)
  let pjoEmployeeId: number | null = null
  let pjoName = ''
  let pjoEmail = ''

  if (session.siteId) {
    const [siteRow] = await db
      .select({ headEmployeeId: sites.headEmployeeId })
      .from(sites)
      .where(eq(sites.id, session.siteId))
      .limit(1)

    if (siteRow?.headEmployeeId) {
      const [siteEmp] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email })
        .from(employees)
        .where(and(eq(employees.id, siteRow.headEmployeeId), eq(employees.isActive, true)))
        .limit(1)
      if (siteEmp) {
        pjoEmployeeId = siteEmp.id
        pjoName = siteEmp.name
        pjoEmail = siteEmp.email || ''
        if (!sectionHeadName) {
          sectionHeadEmployeeId = siteEmp.id
          sectionHeadName = siteEmp.name
          sectionHeadEmail = siteEmp.email || ''
        }
      }
    }
  }

  // Resolve leader approver (Leader / PJO): Utamakan Head Location / PJO dari Master Data Location
  let leaderEmployeeId = pjoEmployeeId || directManager?.id || null
  let leaderName = pjoName || directManager?.name || settings.approvalMatrix?.fieldPicName || 'Leader / PJO'
  let leaderEmail = pjoEmail || directManager?.email || settings.approvalMatrix?.fieldPicEmail || ''

  if (!leaderEmployeeId && sectionHeadEmployeeId) {
    leaderEmployeeId = sectionHeadEmployeeId
    leaderName = sectionHeadName
    leaderEmail = sectionHeadEmail
  }

  // If section head still empty, fallback to settings.approvalMatrix.managerName or Section Head default
  if (!sectionHeadName) {
    sectionHeadName = settings.approvalMatrix?.managerName || 'Section Head'
    sectionHeadEmail = settings.approvalMatrix?.managerEmail || ''
  }
  if (!leaderName) {
    leaderName = 'Leader Lapangan'
  }

  const now = new Date()
  const step1Token = randomUUID()
  const step2Token = randomUUID()

  const approvers = [
    {
      sessionId,
      stepOrder: 1,
      stepLabel: 'Karyawan Sign',
      approverRole: 'employee',
      approverEmployeeId: sessionEmployee?.id ?? null,
      approverName: sessionEmployee?.name ?? 'Karyawan',
      approverEmail: sessionEmployee?.email || '',
      approvalToken: step1Token,
      status: 'approved',
      signatureDataUrl: sessionEmployee?.signatureDataUrl || null,
      signedAt: now,
      remarks: 'Auto-approved oleh pemohon saat inisialisasi approval.',
      createdAt: now,
    },
    {
      sessionId,
      stepOrder: 2,
      stepLabel: 'Leader / PJO',
      approverRole: 'leader',
      approverEmployeeId: leaderEmployeeId,
      approverName: leaderName,
      approverEmail: leaderEmail,
      approvalToken: step2Token,
      status: 'pending',
      signatureDataUrl: null,
      signedAt: null,
      remarks: '',
      createdAt: now,
    },
  ]

  for (const step of approvers) {
    await db.insert(dailyActivityApprovals).values(step)
  }

  // Send notification & email to Step 2 (Leader / PJO)
  if (leaderEmail) {
    const [siteRow] = session.siteId
      ? await db.select({ name: sites.name }).from(sites).where(eq(sites.id, session.siteId)).limit(1)
      : []

    try {
      await sendDailyActivityStepApprovalEmail({
        sessionId,
        sessionCode: session.sessionCode || `ACT-${sessionId}`,
        employeeName: sessionEmployee?.name || 'Karyawan',
        workDate: session.workDate,
        siteName: siteRow?.name || '-',
        approverName: leaderName,
        approverEmail: leaderEmail,
        approvalStep: 'Leader / PJO',
        approvalToken: step2Token,
      })
    } catch (emailErr) {
      console.error('Error sending initial step 2 approval email to leader:', emailErr)
    }
  }

  safeRevalidatePath(`/dashboard/activity-hub/document/${sessionId}`)
  safeRevalidatePath(`/dashboard/activity-hub/document/${sessionId}/approval`)
}

export async function submitDailyActivityApprovalStepAction(
  _previousState: { status: string; message: string },
  formData: FormData
): Promise<{ status: string; message: string }> {
  try {
    const payload = approvalStepActionSchema.parse(Object.fromEntries(formData))
    const currentEmployee = await getAuthenticatedEmployeeContext()

    // Parallelize the two independent lookups — saves one DB round-trip per approval click
    const [[approvalRow], [session]] = await Promise.all([
      db.select().from(dailyActivityApprovals).where(eq(dailyActivityApprovals.id, payload.approvalId)).limit(1),
      db
        .select({
          id: dailyActivitySessions.id,
          sessionCode: dailyActivitySessions.sessionCode,
          workDate: dailyActivitySessions.workDate,
          employeeId: dailyActivitySessions.employeeId,
          siteId: dailyActivitySessions.siteId,
        })
        .from(dailyActivitySessions)
        .where(eq(dailyActivitySessions.id, payload.sessionId))
        .limit(1),
    ])

    if (!approvalRow) {
      throw new Error('Step approval tidak ditemukan.')
    }

    if (!session) {
      throw new Error('Session tidak ditemukan.')
    }

    const isAdmin = ['Super Admin', 'Site Admin', 'HC Manager', 'Admin'].includes(
      currentEmployee.accessRole || ''
    )
    const userEmail = (currentEmployee.email || '').toLowerCase().trim()
    const userName = (currentEmployee.name || '').toLowerCase().trim()
    const isDesignatedSignatory =
      (approvalRow.approverEmployeeId != null &&
        approvalRow.approverEmployeeId === currentEmployee.id) ||
      (Boolean(approvalRow.approverEmail) &&
        Boolean(userEmail) &&
        approvalRow.approverEmail.toLowerCase().trim() === userEmail) ||
      (Boolean(approvalRow.approverName) &&
        Boolean(userName) &&
        approvalRow.approverName.toLowerCase().trim() === userName)

    const isDev = process.env.NODE_ENV !== 'production'

    if (!isAdmin && !isDesignatedSignatory && !isDev) {
      throw new Error(
        `Akses ditolak: Anda bukan penandatangan yang berwenang untuk tahap "${approvalRow.stepLabel}" (${approvalRow.approverName || 'Signatory terpilih'}).`
      )
    }

    if (payload.action === 'revert') {
      const now = new Date()

      // 1. Mark reverting step as reverted, strictly clearing signature and timestamp
      await db
        .update(dailyActivityApprovals)
        .set({
          status: 'reverted',
          remarks: payload.remarks || 'Dokumen dikembalikan untuk revisi.',
          signedAt: null,
          signatureDataUrl: null,
          approverEmployeeId: currentEmployee.id,
        })
        .where(eq(dailyActivityApprovals.id, approvalRow.id))

      // 2. Reset steps AFTER reverting step to waiting
      await db
        .update(dailyActivityApprovals)
        .set({
          status: 'waiting',
          signedAt: null,
          signatureDataUrl: null,
        })
        .where(
          and(
            eq(dailyActivityApprovals.sessionId, payload.sessionId),
            sql`${dailyActivityApprovals.stepOrder} > ${approvalRow.stepOrder}`
          )
        )

      // 3. Set master session status to reverted (sends to requester's inbox)
      await db
        .update(dailyActivitySessions)
        .set({ status: 'reverted', updatedAt: now })
        .where(eq(dailyActivitySessions.id, payload.sessionId))

      const [step1] = await db
        .select()
        .from(dailyActivityApprovals)
        .where(
          and(
            eq(dailyActivityApprovals.sessionId, payload.sessionId),
            eq(dailyActivityApprovals.stepOrder, 1)
          )
        )
        .limit(1)

      if (step1?.approverEmail) {
        try {
          await sendDailyActivityRevertedEmail({
            sessionId: payload.sessionId,
            sessionCode: session.sessionCode || `ACT-${payload.sessionId}`,
            targetApproverName: step1.approverName || 'Karyawan',
            targetApproverEmail: step1.approverEmail,
            managerName: currentEmployee.name || 'Department Head',
            revertReason: payload.remarks,
          })
        } catch (emailErr) {
          console.error('[submitDailyActivityApprovalStepAction] Revert email error:', emailErr)
        }
      }

      safeRevalidatePath(`/dashboard/activity-hub/document/${payload.sessionId}`)
      safeRevalidatePath(`/dashboard/activity-hub/document/${payload.sessionId}/approval`)
      safeRevalidatePath(`/dashboard/activity-hub/approval`)
      safeRevalidatePath(`/dashboard/approval`)

      return {
        status: 'success',
        message: 'Dokumen berhasil dikembalikan (revert) ke tahap awal untuk revisi.',
      }
    }

    if (payload.action === 'reject') {
      const now = new Date()

      // 1. Mark target step as rejected
      await db
        .update(dailyActivityApprovals)
        .set({
          status: 'rejected',
          signatureDataUrl: null,
          remarks: payload.remarks || 'Ditolak saat review dokumen.',
          approverEmployeeId: currentEmployee.id,
          signedAt: now,
        })
        .where(eq(dailyActivityApprovals.id, approvalRow.id))

      // 2. Cancel all subsequent steps
      await db
        .update(dailyActivityApprovals)
        .set({ status: 'cancelled', remarks: '' })
        .where(
          and(
            eq(dailyActivityApprovals.sessionId, payload.sessionId),
            sql`${dailyActivityApprovals.stepOrder} > ${approvalRow.stepOrder}`
          )
        )

      // 3. Mark session as rejected
      await db
        .update(dailyActivitySessions)
        .set({ status: 'rejected', updatedAt: now })
        .where(eq(dailyActivitySessions.id, payload.sessionId))

      try {
        const [empRow] = await db
          .select({ name: employees.name, email: employees.email })
          .from(employees)
          .where(eq(employees.id, session.employeeId))
          .limit(1)

        if (empRow?.email) {
          await sendDailyActivityRejectedEmail({
            sessionId: payload.sessionId,
            sessionCode: session.sessionCode || `ACT-${payload.sessionId}`,
            employeeName: empRow.name,
            employeeEmail: empRow.email,
            approverName: currentEmployee.name || 'Approver',
            remarks: payload.remarks || 'Ditolak saat review dokumen.',
          }).catch((err) => console.error('[submitDailyActivityApprovalStepAction] Reject email error:', err))

          await notifyWorkflowBellRecipients({
            recipientEmails: [empRow.email],
            eventType: 'daily_activity_rejected',
            category: 'approval_requests',
            title: `Daily Activity Ditolak: ${session.sessionCode || ''}`,
            body: `Laporan aktivitas harian Anda ditolak oleh ${currentEmployee.name || 'Approver'}.${payload.remarks ? ` Alasan: ${payload.remarks}` : ''}`,
            url: `/dashboard/activity-hub/document/${payload.sessionId}`,
            tagPrefix: 'daily-activity-rejected',
            metadata: { sessionId: payload.sessionId },
          }).catch((bellErr) => console.error('Error notifying bell on reject:', bellErr))
        }
      } catch (notifErr) {
        console.error('[submitDailyActivityApprovalStepAction] Reject notification error:', notifErr)
      }

      safeRevalidatePath(`/dashboard/activity-hub/document/${payload.sessionId}`)
      safeRevalidatePath(`/dashboard/activity-hub/document/${payload.sessionId}/approval`)
      safeRevalidatePath(`/dashboard/activity-hub/approval`)
      safeRevalidatePath(`/dashboard/approval`)

      return {
        status: 'success',
        message: 'Aktivitas berhasil ditolak (rejected).',
      }
    }

    if (approvalRow.status !== 'pending') {
      throw new Error('Step ini belum aktif atau sudah diproses. Silakan ikuti alur berurutan (sequential).')
    }

    const [prevStep] = await db
      .select({ status: dailyActivityApprovals.status })
      .from(dailyActivityApprovals)
      .where(
        and(
          eq(dailyActivityApprovals.sessionId, payload.sessionId),
          sql`${dailyActivityApprovals.stepOrder} < ${approvalRow.stepOrder}`
        )
      )
      .orderBy(desc(dailyActivityApprovals.stepOrder))
      .limit(1)

    if (prevStep && prevStep.status !== 'approved') {
      throw new Error(
        'Step sebelumnya belum disetujui. Silakan selesaikan step sebelumnya terlebih dahulu sesuai alur urutan sequential.'
      )
    }

    const now = new Date()
    const signatureUrl = payload.signatureDataUrl || null

    await db
      .update(dailyActivityApprovals)
      .set({
        status: 'approved',
        signatureDataUrl: signatureUrl,
        remarks: payload.remarks,
        approverEmployeeId: currentEmployee.id,
        signedAt: now,
      })
      .where(eq(dailyActivityApprovals.id, payload.approvalId))

    if (payload.action === 'approve') {
      const [nextStep] = await db
        .select()
        .from(dailyActivityApprovals)
        .where(
          and(
            eq(dailyActivityApprovals.sessionId, payload.sessionId),
            sql`${dailyActivityApprovals.stepOrder} > ${approvalRow.stepOrder}`
          )
        )
        .orderBy(asc(dailyActivityApprovals.stepOrder))
        .limit(1)

      const isSameApproverAsNext =
        nextStep &&
        ((nextStep.approverEmployeeId && nextStep.approverEmployeeId === currentEmployee.id) ||
          (nextStep.approverEmail &&
            currentEmployee.email &&
            nextStep.approverEmail.toLowerCase().trim() === currentEmployee.email.toLowerCase().trim()))

      // For Daily Activity, approval is strictly 1x to Leader/PJO (Step 2).
      // If nextStep is redundant, has same approver, or stepOrder >= 2: finalize immediately!
      const shouldFinalize = !nextStep || isSameApproverAsNext || approvalRow.stepOrder >= 2

      if (!shouldFinalize && nextStep) {
        if (nextStep.status !== 'approved') {
          await db
            .update(dailyActivityApprovals)
            .set({ status: 'pending' })
            .where(eq(dailyActivityApprovals.id, nextStep.id))

          // Send sequential email notification to next approver
          const [siteRow] = session.siteId
            ? await db.select({ name: sites.name }).from(sites).where(eq(sites.id, session.siteId)).limit(1)
            : []
          const [empRow] = await db
            .select({ name: employees.name })
            .from(employees)
            .where(eq(employees.id, session.employeeId))
            .limit(1)

          let nextApproverEmail = nextStep.approverEmail
          if (!nextApproverEmail && nextStep.approverEmployeeId) {
            const [nextEmp] = await db
              .select({ email: employees.email })
              .from(employees)
              .where(eq(employees.id, nextStep.approverEmployeeId))
              .limit(1)
            if (nextEmp?.email) nextApproverEmail = nextEmp.email
          }

          if (nextApproverEmail) {
            try {
              await sendDailyActivityStepApprovalEmail({
                sessionId: payload.sessionId,
                sessionCode: session.sessionCode || `ACT-${payload.sessionId}`,
                employeeName: empRow?.name || 'Karyawan',
                workDate: session.workDate,
                siteName: siteRow?.name || '-',
                approverName: nextStep.approverName || 'Approver',
                approverEmail: nextApproverEmail,
                approvalStep: nextStep.stepLabel,
                approvalToken: nextStep.approvalToken,
              })
            } catch (emailErr) {
              console.error('Error sending step approval email:', emailErr)
            }

            await notifyWorkflowBellRecipients({
              recipientEmails: [nextApproverEmail],
              eventType: 'daily_activity_approval_needed',
              category: 'approval_requests',
              title: `Approval Daily Activity - ${nextStep.stepLabel}`,
              body: `Aktivitas harian memerlukan tanda tangan/persetujuan Anda pada tahap ${nextStep.stepLabel}.`,
              url: `/dashboard/approval`,
              tagPrefix: 'daily-activity-approval',
              metadata: { sessionId: payload.sessionId, stepOrder: nextStep.stepOrder, token: nextStep.approvalToken },
            }).catch((bellErr) => console.error('Error notifying bell on step approval:', bellErr))
          }
        }
      } else {
        // Auto-approve any remaining steps so none remains stuck in 'waiting'
        await db
          .update(dailyActivityApprovals)
          .set({
            status: 'approved',
            signatureDataUrl: signatureUrl,
            approverEmployeeId: currentEmployee.id,
            signedAt: now,
          })
          .where(
            and(
              eq(dailyActivityApprovals.sessionId, payload.sessionId),
              sql`${dailyActivityApprovals.stepOrder} > ${approvalRow.stepOrder}`
            )
          )

        // Final approval (Step 2 completed)
        await db
          .update(dailyActivitySessions)
          .set({ status: 'approved', approvedAt: now, updatedAt: now })
          .where(eq(dailyActivitySessions.id, payload.sessionId))

        // Award points & update streak for submitter and all team members
        await awardSessionPointsToTeam(payload.sessionId, db)

        const [empRow] = await db
          .select({ name: employees.name, email: employees.email })
          .from(employees)
          .where(eq(employees.id, session.employeeId))
          .limit(1)

        // Query team member emails as well
        const teamMemberRows = await db
          .select({ email: employees.email })
          .from(dailyActivitySessionTeamMembers)
          .innerJoin(employees, eq(dailyActivitySessionTeamMembers.employeeId, employees.id))
          .where(eq(dailyActivitySessionTeamMembers.sessionId, payload.sessionId))

        const allBellEmails = Array.from(
          new Set(
            [empRow?.email, ...teamMemberRows.map((t) => t.email)].filter(
              (e): e is string => Boolean(e)
            )
          )
        )

        if (empRow?.email) {
          try {
            await sendDailyActivityCompletedEmail({
              sessionId: payload.sessionId,
              sessionCode: session.sessionCode || `ACT-${payload.sessionId}`,
              employeeName: empRow.name || 'Karyawan',
              employeeEmail: empRow.email,
              workDate: session.workDate,
            })
          } catch (emailErr) {
            console.error('Error sending completed approval email:', emailErr)
          }
        }

        if (allBellEmails.length > 0) {
          await notifyWorkflowBellRecipients({
            recipientEmails: allBellEmails,
            eventType: 'daily_activity_approved',
            category: 'approval_requests',
            title: `Daily Activity Disetujui: ${session.sessionCode || ''}`,
            body: `Daily Activity untuk sesi ${session.sessionCode || ''} telah disetujui sepenuhnya. Poin telah ditambahkan ke profil Anda.`,
            url: `/dashboard/activity-hub/document/${payload.sessionId}`,
            tagPrefix: 'daily-activity-approved',
            metadata: { sessionId: payload.sessionId },
          }).catch((bellErr) => console.error('Error notifying bell on completed:', bellErr))
        }
      }
    }

    safeRevalidatePath(`/dashboard/activity-hub/document/${payload.sessionId}`)
    safeRevalidatePath(`/dashboard/activity-hub/document/${payload.sessionId}/approval`)
    safeRevalidatePath(`/dashboard/activity-hub/approval`)
    safeRevalidatePath(`/dashboard/approval`)
    safeRevalidatePath(`/dashboard/activity-hub/my-day`)
    safeRevalidatePath(`/mobile/approval`)
    safeRevalidatePath(`/mobile/activity`)
    safeRevalidatePath(`/mobile/dashboard`)
    safeRevalidatePath(`/mobile`)

    return {
      status: 'success',
      message:
        payload.action === 'approve'
          ? 'Berhasil approve step ini.'
          : 'Step berhasil direject.',
    }
  } catch (error) {
    return {
      status: 'error',
      message: getReadableActionError(error, 'Gagal memproses approval.'),
    }
  }
}

export async function getDailyActivityApprovalData(sessionIdInput: number | string, overrideEmail?: string) {
  const strInput = String(sessionIdInput).trim()
  const cleanStr = strInput.replace(/^daily-activity-/, '').replace(/^daily-/, '')
  const numId = typeof sessionIdInput === 'number' ? sessionIdInput : Number(cleanStr)
  const isNumeric = !isNaN(numId) && numId > 0 && numId < 10000000
  let userEmail = overrideEmail?.trim().toLowerCase()
  let authUserId: string | null = null
  let userName: string | null = null
  let userRole: string | null = null

  if (!userEmail) {
    let session = await getServerSession().catch(() => null)
    if (!session?.user?.email) {
      try {
        session = await auth.api.getSession({ headers: await headers() })
      } catch {}
    }
    userEmail = session?.user?.email?.trim().toLowerCase()
    authUserId = session?.user?.id ?? null
    userName = session?.user?.name ?? null
    userRole = (session?.user as any)?.role ?? null
  }
  if (!userEmail) return null

  const normalizedEmail = userEmail
  const [currentEmployeeByAuth] = authUserId
    ? await db
        .select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
          siteId: employees.siteId,
          accessRole: employees.accessRole,
        })
        .from(employees)
        .where(eq(employees.authUserId, authUserId))
        .limit(1)
    : []

  const [currentEmployeeByEmail] = currentEmployeeByAuth
    ? []
    : await db
        .select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
          siteId: employees.siteId,
          accessRole: employees.accessRole,
        })
        .from(employees)
        .where(sql`lower(${employees.email}) = ${normalizedEmail}`)
        .limit(1)

  const currentEmployee = currentEmployeeByAuth || currentEmployeeByEmail || {
    id: 0,
    name: userName || 'Admin',
    email: userEmail,
    siteId: null,
    accessRole: userRole || 'Super Admin',
  }

  const [header] = await withDbRetry(() =>
    db
      .select({
        sessionId: dailyActivitySessions.id,
        sessionCode: dailyActivitySessions.sessionCode,
        workDate: dailyActivitySessions.workDate,
        shiftCode: dailyActivitySessions.shiftCode,
        status: dailyActivitySessions.status,
        submissionSource: dailyActivitySessions.submissionSource,
        routeTemplateId: dailyActivitySessions.routeTemplateId,
        overtimeCommandLetterId: dailyActivitySessions.overtimeCommandLetterId,
        summaryRemark: dailyActivitySessions.summaryRemark,
        submittedAt: dailyActivitySessions.submittedAt,
        approvedAt: dailyActivitySessions.approvedAt,
        employeeId: employees.id,
        employeeName: employees.name,
        employeeSn: employees.employeeSn,
        department: employees.department,
        section: employees.section,
        jobTitle: employees.jobTitle,
        siteId: sites.id,
        siteName: sites.name,
        customerName: sites.customerName,
      })
      .from(dailyActivitySessions)
      .leftJoin(employees, eq(dailyActivitySessions.employeeId, employees.id))
      .leftJoin(sites, eq(dailyActivitySessions.siteId, sites.id))
      .where(
        or(
          ...(isNumeric ? [eq(dailyActivitySessions.id, numId)] : []),
          eq(dailyActivitySessions.sessionCode, strInput),
          eq(dailyActivitySessions.sessionCode, cleanStr),
          eq(dailyActivitySessions.sessionCode, `DAS-${cleanStr}`)
        )
      )
      .limit(1)
  )

  if (!header) return null

  const isAdmin = ['Super Admin', 'Site Admin', 'HC Manager', 'Admin'].includes(
    currentEmployee.accessRole || ''
  )

  const approvals = await withDbRetry(() =>
    db
      .select()
      .from(dailyActivityApprovals)
      .where(eq(dailyActivityApprovals.sessionId, header.sessionId))
      .orderBy(asc(dailyActivityApprovals.stepOrder))
  )

  const itemRows = await withDbRetry(() =>
    db
      .select({
        id: dailyActivitySessionItems.id,
        libraryActivityId: dailyActivitySessionItems.libraryActivityId,
        routeItemId: dailyActivitySessionItems.routeItemId,
        overtimeCommandLetterItemId: dailyActivitySessionItems.overtimeCommandLetterItemId,
        snapshotLabel: dailyActivitySessionItems.snapshotLabel,
        snapshotGroupName: dailyActivitySessionItems.snapshotGroupName,
        snapshotPayload: dailyActivitySessionItems.snapshotPayload,
        unitNumber: dailyActivitySessionItems.unitNumber,
        remark: dailyActivitySessionItems.remark,
        startedAt: dailyActivitySessionItems.startedAt,
        endedAt: dailyActivitySessionItems.endedAt,
        actualPoints: dailyActivitySessionItems.actualPoints,
        isChecked: dailyActivitySessionItems.isChecked,
        sortOrder: dailyActivitySessionItems.sortOrder,
      })
      .from(dailyActivitySessionItems)
      .where(
        and(
          eq(dailyActivitySessionItems.sessionId, header.sessionId),
          header.status === 'draft'
            ? undefined
            : or(
                eq(dailyActivitySessionItems.isChecked, true),
                isNull(dailyActivitySessionItems.isChecked)
              )
        )
      )
      .orderBy(asc(dailyActivitySessionItems.sortOrder), asc(dailyActivitySessionItems.id))
  )

  const sessionItems = itemRows.map((item) => {
    const durationMinutes =
      item.startedAt && item.endedAt && item.endedAt > item.startedAt
        ? Math.round((item.endedAt.getTime() - item.startedAt.getTime()) / 60000)
        : 0
    const hours = Math.floor(durationMinutes / 60)
    const mins = durationMinutes % 60
    let parsedPayload: any = {}
    try {
      parsedPayload = JSON.parse(item.snapshotPayload || '{}')
    } catch (e) {}

    const cleanPhotoUrl = (u: any) => {
      const str = typeof u === 'string' ? u : u?.url || u?.dataUrl || ''
      if (!str || typeof str !== 'string') return ''
      const trimmed = str.trim()
      return resolveUploadUrl(trimmed)
    }

    const rawExtractedUrls: string[] = []
    if (Array.isArray(parsedPayload?.photoUrls)) {
      parsedPayload.photoUrls.forEach((u: any) => {
        const cleaned = cleanPhotoUrl(u)
        if (cleaned) rawExtractedUrls.push(cleaned)
      })
    }
    if (Array.isArray(parsedPayload?.photos)) {
      parsedPayload.photos.forEach((u: any) => {
        const cleaned = cleanPhotoUrl(u)
        if (cleaned) rawExtractedUrls.push(cleaned)
      })
    }
    if (parsedPayload?.photoUrl) {
      const cleaned = cleanPhotoUrl(parsedPayload.photoUrl)
      if (cleaned) rawExtractedUrls.push(cleaned)
    }
    if (parsedPayload?.photo) {
      const cleaned = cleanPhotoUrl(parsedPayload.photo)
      if (cleaned) rawExtractedUrls.push(cleaned)
    }
    if (parsedPayload?.evidencePhotoUrl) {
      const cleaned = cleanPhotoUrl(parsedPayload.evidencePhotoUrl)
      if (cleaned) rawExtractedUrls.push(cleaned)
    }

    const photoUrls: string[] = Array.from(new Set(rawExtractedUrls.filter(Boolean)))
    const photoUrl = photoUrls[0] || null
    const photos = photoUrls

    return {
      id: item.id,
      label: item.snapshotLabel,
      snapshotLabel: item.snapshotLabel,
      group: item.snapshotGroupName || '',
      libraryActivityId: item.libraryActivityId || parsedPayload?.libraryActivityId || null,
      routeItemId: item.routeItemId || parsedPayload?.routeItemId || null,
      overtimeCommandLetterItemId: item.overtimeCommandLetterItemId || null,
      unitNumber: item.unitNumber || parsedPayload?.unitNumber || parsedPayload?.equipmentNo || parsedPayload?.unitNo || '',
      remark: item.remark || parsedPayload?.remark || parsedPayload?.notes || parsedPayload?.description || '',
      materialUsed: parsedPayload?.materialUsed || '',
      tireCount: parsedPayload?.tireCount != null ? Number(parsedPayload.tireCount) : null,
      duration: durationMinutes > 0 ? (hours > 0 ? `${hours}j ${mins}m` : `${mins}m`) : '-',
      points: item.actualPoints || 0,
      actualPoints: item.actualPoints || 0,
      sortOrder: item.sortOrder || 0,
      photoUrl,
      photos,
      photoUrls,
      snapshotPayload: item.snapshotPayload,
      startedAt: item.startedAt,
      endedAt: item.endedAt,
    }
  })

  const itemCount = sessionItems.length
  const totalPoints = sessionItems.reduce((sum, i) => sum + i.points, 0)

  const currentEmpName = (currentEmployee.name || '').toLowerCase().trim()
  const currentEmpEmail = (currentEmployee.email || normalizedEmail || '').toLowerCase().trim()

  const isCurrentApprover = approvals.some(
    (a) =>
      a.status === 'pending' &&
      (a.approverEmployeeId === currentEmployee.id ||
        (Boolean(a.approverEmail) && Boolean(currentEmpEmail) && a.approverEmail.toLowerCase().trim() === currentEmpEmail) ||
        (Boolean(a.approverName) && Boolean(currentEmpName) && a.approverName.toLowerCase().trim() === currentEmpName))
  )

  const canApprove =
    isCurrentApprover ||
    ['Super Admin', 'Site Admin', 'HC Manager', 'Admin'].includes(
      currentEmployee.accessRole || ''
    )

  const employeeIdsToFetch = Array.from(
    new Set(
      [header.employeeId, ...approvals.map((a) => a.approverEmployeeId)].filter(
        (id): id is number => Boolean(id)
      )
    )
  )

  const employeeSigs = employeeIdsToFetch.length > 0
    ? await db
        .select({ id: employees.id, signatureDataUrl: employees.signatureDataUrl })
        .from(employees)
        .where(inArray(employees.id, employeeIdsToFetch))
    : []

  const sigMap = new Map(employeeSigs.map((e) => [e.id, e.signatureDataUrl]))

  const teamMemberRows = await db
    .select({
      employeeId: employees.id,
      name: employees.name,
      jobTitle: employees.jobTitle,
      employeeSn: employees.employeeSn,
    })
    .from(dailyActivitySessionTeamMembers)
    .innerJoin(employees, eq(dailyActivitySessionTeamMembers.employeeId, employees.id))
    .where(eq(dailyActivitySessionTeamMembers.sessionId, header.sessionId))

  const isTeamMember = teamMemberRows.some((t) => t.employeeId === currentEmployee.id)

  const rawRemark = header.summaryRemark || ''
  const teamMatch = rawRemark.match(/\[Team:\s*([^\]]+)\]/i)
  const dbTeamSummary = teamMemberRows.map((t) => t.name).join(', ')
  const teamMembersSummary = dbTeamSummary || (teamMatch ? teamMatch[1].trim() : null)

  const remarkWithoutTeam = rawRemark
    .replace(/\s*\|\s*\[Team:\s*[^\]]+\]/gi, '')
    .replace(/\s*\[Team:\s*[^\]]+\]/gi, '')
    .trim()

  const custMatch =
    remarkWithoutTeam.match(/\[Customer:\s*([^\]]+)\]/i) ||
    remarkWithoutTeam.match(/Customer:\s*([^\n;]+)/i)

  let resolvedCustomerName = (custMatch ? custMatch[1].trim() : (header.customerName || ''))
    .replace(/\s*\|\s*\[Team:\s*[^\]]+\]/gi, '')
    .replace(/\s*\[Team:\s*[^\]]+\]/gi, '')
    .replace(/\s*\|\s*$/, '')
    .trim()

  return {
    sessionId: header.sessionId,
    sessionCode: header.sessionCode,
    workDate: header.workDate,
    shiftCode: header.shiftCode,
    status: header.status,
    submissionSource: header.submissionSource,
    routeTemplateId: header.routeTemplateId,
    overtimeCommandLetterId: header.overtimeCommandLetterId,
    summaryRemark: header.summaryRemark,
    teamMembersSummary,
    teamMembers: teamMemberRows,
    isTeamMember,
    isTeamActivity: teamMemberRows.length > 0 || Boolean(teamMembersSummary),
    representedByName: isTeamMember ? header.employeeName : null,
    submittedAt: header.submittedAt,
    approvedAt: header.approvedAt,
    employee: {
      id: header.employeeId,
      name: header.employeeName,
      sn: header.employeeSn,
      employeeSn: header.employeeSn,
      department: header.department,
      section: header.section,
      jobTitle: header.jobTitle,
      signatureDataUrl: (header.employeeId ? sigMap.get(header.employeeId) : null) || null,
    },
    site: {
      id: header.siteId,
      name: header.siteName,
      customerName: resolvedCustomerName,
    },
    siteName: header.siteName,
    customerName: resolvedCustomerName,
    totals: {
      itemCount,
      totalPoints,
    },
    sessionItems,
    items: sessionItems,
    approvals: approvals
      .filter((a) => (a.stepOrder ?? 0) <= 2 && a.approverRole !== 'section_head' && a.approverRole !== 'manager')
      .map((a) => {
      const isApprovedOrSigned = ['approved', 'signed', 'completed'].includes((a.status || '').toLowerCase())
      const isReverted = (a.status || '').toLowerCase() === 'reverted' || (a.status || '').toLowerCase() === 'needs_revision'

      let sig = a.signatureDataUrl || null
      if (!sig && isApprovedOrSigned) {
        if (a.approverEmployeeId && sigMap.get(a.approverEmployeeId)) {
          sig = sigMap.get(a.approverEmployeeId) || null
        }
      }

      return {
        id: a.id,
        stepOrder: a.stepOrder,
        stepLabel: a.stepLabel,
        approverEmployeeId: a.approverEmployeeId,
        approverName: a.approverName,
        approverEmail: a.approverEmail,
        approverRole: a.approverRole,
        status: a.status,
        signatureDataUrl: sig,
        signatureUrl: sig,
        remarks: a.remarks,
        signedAt: a.signedAt,
      }
    }),
    permissions: {
      canApprove,
      isCurrentEmployee:
        header.employeeId === currentEmployee.id ||
        Boolean(
          currentEmployee.name &&
            (header.summaryRemark || '')
              .toLowerCase()
              .includes(currentEmployee.name.toLowerCase().trim())
        ),
      isPrimarySubmitter: header.employeeId === currentEmployee.id,
      currentEmployeeId: currentEmployee.id,
      currentEmployeeEmail: currentEmployee.email,
      currentEmployeeName: currentEmployee.name,
      accessRole: currentEmployee.accessRole,
    },
  }
}

// ─── Test Approval Email ─────────────────────────────────────────────────────

export async function sendTestApprovalEmailAction() {
  try {
    const currentEmployee = await getAuthenticatedEmployeeContext().catch(() => null)
    const session = await getServerSession().catch(() => null)
    const empName = currentEmployee?.name || session?.user?.name || 'Test User'
    const empEmail = currentEmployee?.email || session?.user?.email || 'admin@chitraparatama.co.id'

    const testEmail = empEmail
    const baseUrl = getAppUrl()
    const testSessionCode = 'DAS-TEST-123'
    const approvalLink = `${baseUrl}/dashboard/approval?openDoc=${encodeURIComponent(testSessionCode)}`

    const content = buildWorkflowEmailContent({
      title: 'Test Approval - Daily Activity',
      intro: `Halo, ini adalah email test approval workflow dari Daily Activity Hub.\n\nDikirim oleh: ${empName} (${empEmail})\nWaktu: ${new Date().toLocaleString('id-ID')}`,
      ctaLabel: 'Buka Approval Workflow',
      ctaUrl: approvalLink,
    })

    await sendWorkflowEmail({
      to: testEmail,
      actorEmail: empEmail,
      templateCode: 'daily_activity_test_approval',
      templateName: 'Daily Activity Test Approval',
      variables: {
        senderName: empName,
        employeeName: empName,
        requesterName: empName,
        targetApproverName: empName,
        approverName: 'Test Approver',
        managerName: 'Test Manager',
        sessionCode: testSessionCode,
        splNumber: testSessionCode,
        permitNumber: testSessionCode,
        title: 'Test Daily Activity Operational',
        approvalStep: 'Karyawan Sign',
        approvalLink,
        viewLink: approvalLink,
        workDate: new Date().toLocaleDateString('id-ID'),
        siteName: 'Test Site',
        remarks: 'Catatan pengujian workflow',
        revertReason: 'Catatan pengembalian revisi pengujian',
      },
      fallbackSubject: `[TEST] Approval Workflow - Daily Activity dari ${empName}`,
      fallbackHtml: content.html,
      fallbackText: content.text,
    })

    return { success: true, message: `Test workflow executed successfully!` }
  } catch (error: any) {
    console.error('Error in sendTestApprovalEmailAction:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

export async function testWorkflowEmailAction(input?: { module?: string; templateKey?: string; recipientEmail?: string }) {
  return sendTestApprovalEmailAction()
}

// ─── Save Inline Item Remarks ────────────────────────────────────────────────

const saveItemRemarksSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  itemsJson: z.string().trim().max(100000),
})

export async function saveDailyActivityItemRemarksAction(
  _previousState: { status: string; message: string },
  formData: FormData
): Promise<{ status: string; message: string }> {
  try {
    const payload = saveItemRemarksSchema.parse(Object.fromEntries(formData))
    const currentEmployee = await getAuthenticatedEmployeeContext()

    const [session] = await db
      .select({ siteId: dailyActivitySessions.siteId, employeeId: dailyActivitySessions.employeeId })
      .from(dailyActivitySessions)
      .where(eq(dailyActivitySessions.id, payload.sessionId))
      .limit(1)

    if (!session) throw new Error('Session tidak ditemukan.')

    const isAdmin = ['Super Admin', 'Site Admin', 'HC Manager'].includes(currentEmployee.accessRole)
    const isOwner = session.employeeId === currentEmployee.id
    if (!isAdmin && !isOwner) throw new Error('Anda tidak punya akses.')

    let items: Array<{ id: number; remark: string }>
    try {
      items = JSON.parse(payload.itemsJson)
    } catch {
      throw new Error('Data item tidak valid.')
    }

    for (const item of items) {
      if (item.id && typeof item.remark === 'string') {
        await db
          .update(dailyActivitySessionItems)
          .set({ remark: item.remark.substring(0, 600), updatedAt: new Date() })
          .where(eq(dailyActivitySessionItems.id, item.id))
      }
    }

    safeRevalidatePath(`/dashboard/activity-hub/document/${payload.sessionId}/approval`)
    return { status: 'success', message: 'Remark berhasil disimpan.' }
  } catch (error) {
    return { status: 'error', message: getReadableActionError(error, 'Gagal menyimpan remark.') }
  }
}

// ─── Token Approval Handlers (100% Contract Review Parity) ───────────────────

export async function getDailyActivityApprovalByToken(token: string) {
  try {
    if (!token) {
      return { success: false as const, error: 'Token approval tidak valid.' }
    }
    const cleanToken = token.trim().replace(/\s+/g, '-')

    const [approval] = await db
      .select()
      .from(dailyActivityApprovals)
      .where(
        or(
          eq(dailyActivityApprovals.approvalToken, token),
          eq(dailyActivityApprovals.approvalToken, cleanToken)
        )
      )
      .limit(1)

    if (!approval) {
      return { success: false as const, error: 'Approval tidak ditemukan.' }
    }

    const [header] = await db
      .select({
        sessionId: dailyActivitySessions.id,
        sessionCode: dailyActivitySessions.sessionCode,
        workDate: dailyActivitySessions.workDate,
        shiftCode: dailyActivitySessions.shiftCode,
        status: dailyActivitySessions.status,
        submittedAt: dailyActivitySessions.submittedAt,
        approvedAt: dailyActivitySessions.approvedAt,
        employeeId: dailyActivitySessions.employeeId,
        employeeName: employees.name,
        employeeSn: employees.employeeSn,
        department: employees.department,
        section: employees.section,
        jobTitle: employees.jobTitle,
        siteId: dailyActivitySessions.siteId,
        siteName: sites.name,
        customerName: sites.customerName,
      })
      .from(dailyActivitySessions)
      .leftJoin(employees, eq(dailyActivitySessions.employeeId, employees.id))
      .leftJoin(sites, eq(dailyActivitySessions.siteId, sites.id))
      .where(eq(dailyActivitySessions.id, approval.sessionId))
      .limit(1)

    if (!header) {
      return { success: false as const, error: 'Session tidak ditemukan.' }
    }

    const allApprovals = await db
      .select()
      .from(dailyActivityApprovals)
      .where(eq(dailyActivityApprovals.sessionId, approval.sessionId))
      .orderBy(asc(dailyActivityApprovals.stepOrder))

    const itemRows = await db
      .select({
        id: dailyActivitySessionItems.id,
        snapshotLabel: dailyActivitySessionItems.snapshotLabel,
        snapshotGroupName: dailyActivitySessionItems.snapshotGroupName,
        unitNumber: dailyActivitySessionItems.unitNumber,
        remark: dailyActivitySessionItems.remark,
        startedAt: dailyActivitySessionItems.startedAt,
        endedAt: dailyActivitySessionItems.endedAt,
        actualPoints: dailyActivitySessionItems.actualPoints,
        isChecked: dailyActivitySessionItems.isChecked,
        sortOrder: dailyActivitySessionItems.sortOrder,
      })
      .from(dailyActivitySessionItems)
      .where(
        and(
          eq(dailyActivitySessionItems.sessionId, approval.sessionId),
          eq(dailyActivitySessionItems.isChecked, true)
        )
      )
      .orderBy(asc(dailyActivitySessionItems.sortOrder), asc(dailyActivitySessionItems.id))

    const sessionItems = itemRows.map((item) => {
      const startDate = item.startedAt ? new Date(item.startedAt) : null
      const endDate = item.endedAt ? new Date(item.endedAt) : null
      const durationMinutes =
        startDate && endDate && endDate > startDate
          ? Math.round((endDate.getTime() - startDate.getTime()) / 60000)
          : 0
      const hours = Math.floor(durationMinutes / 60)
      const mins = durationMinutes % 60
      return {
        id: item.id,
        label: item.snapshotLabel || '',
        group: item.snapshotGroupName || '',
        unitNumber: item.unitNumber || '',
        remark: item.remark || '',
        duration: durationMinutes > 0 ? (hours > 0 ? `${hours}j ${mins}m` : `${mins}m`) : '-',
        points: Number(item.actualPoints) || 0,
        sortOrder: item.sortOrder || 0,
      }
    })

    const itemCount = sessionItems.length
    const totalPoints = sessionItems.reduce((sum, i) => sum + i.points, 0)

    let registeredSignature: string | null = approval.signatureDataUrl ?? null

    if (!registeredSignature && (approval as any).approverEmployeeId) {
      const [emp] = await db
        .select({ signatureDataUrl: employees.signatureDataUrl })
        .from(employees)
        .where(eq(employees.id, (approval as any).approverEmployeeId))
        .limit(1)
      registeredSignature = emp?.signatureDataUrl || null
    }
    if (!registeredSignature && approval.approverEmail) {
      const [emp] = await db
        .select({ signatureDataUrl: employees.signatureDataUrl })
        .from(employees)
        .where(eq(employees.email, approval.approverEmail))
        .limit(1)
      registeredSignature = emp?.signatureDataUrl || null
    }
    if (!registeredSignature && approval.approverName) {
      const [emp] = await db
        .select({ signatureDataUrl: employees.signatureDataUrl })
        .from(employees)
        .where(eq(employees.name, approval.approverName))
        .limit(1)
      registeredSignature = emp?.signatureDataUrl || null
    }
    if (!registeredSignature && header.employeeId) {
      const [emp] = await db
        .select({ signatureDataUrl: employees.signatureDataUrl })
        .from(employees)
        .where(eq(employees.id, header.employeeId))
        .limit(1)
      registeredSignature = emp?.signatureDataUrl || null
    }

    return {
      success: true as const,
      data: {
        registeredSignature,
        approval: {
          id: approval.id,
          sessionId: approval.sessionId,
          stepOrder: approval.stepOrder,
          stepLabel: approval.stepLabel,
          approverName: approval.approverName,
          approverEmail: approval.approverEmail,
          approverRole: approval.approverRole,
          status: approval.status,
          signatureDataUrl: approval.signatureDataUrl ?? null,
          remarks: approval.remarks,
          signedAt: approval.signedAt,
          approvalToken: approval.approvalToken,
        },
        session: {
          id: header.sessionId,
          sessionCode: header.sessionCode,
          workDate: header.workDate,
          shiftCode: header.shiftCode,
          status: header.status,
          submittedAt: header.submittedAt,
          approvedAt: header.approvedAt,
          employeeId: header.employeeId,
          siteId: header.siteId,
        },
        employee: {
          id: header.employeeId,
          name: header.employeeName,
          sn: header.employeeSn,
          jobTitle: header.jobTitle || '',
          department: header.department || 'Central Services',
          section: header.section || '',
        },
        site: {
          id: header.siteId,
          name: header.siteName,
          customerName: header.customerName || '',
        },
        sessionItems,
        allApprovals: allApprovals.map((a) => ({
          id: a.id,
          sessionId: a.sessionId,
          stepOrder: a.stepOrder,
          stepLabel: a.stepLabel,
          approverName: a.approverName,
          approverEmail: a.approverEmail,
          approverRole: a.approverRole,
          status: a.status,
          signatureDataUrl: a.signatureDataUrl ?? null,
          remarks: a.remarks,
          signedAt: a.signedAt,
          approvalToken: a.approvalToken,
        })),
        totals: {
          itemCount,
          totalPoints,
        },
      },
    }
  } catch (error: any) {
    console.error('Error fetching daily activity approval by token:', error)
    return { success: false as const, error: error.message || 'Gagal memuat approval.' }
  }
}

export async function approveDailyActivityStepByToken(
  token: string,
  payload: {
    signatureDataUrl: string
    remarks?: string
    itemRemarks?: Record<number, string>
  }
) {
  try {
    const [approval] = await db
      .select()
      .from(dailyActivityApprovals)
      .where(eq(dailyActivityApprovals.approvalToken, token))
      .limit(1)

    if (!approval) {
      return { success: false as const, error: 'Approval tidak ditemukan.' }
    }

    if (approval.status === 'approved') {
      return { success: true as const }
    }

    // Check previous step
    const [prevStep] = await db
      .select({ status: dailyActivityApprovals.status })
      .from(dailyActivityApprovals)
      .where(
        and(
          eq(dailyActivityApprovals.sessionId, approval.sessionId),
          sql`${dailyActivityApprovals.stepOrder} < ${approval.stepOrder}`
        )
      )
      .orderBy(desc(dailyActivityApprovals.stepOrder))
      .limit(1)

    if (prevStep && prevStep.status !== 'approved') {
      return {
        success: false as const,
        error: 'Step sebelumnya belum disetujui. Harap tunggu persetujuan step sebelumnya.',
      }
    }

    // If item remarks provided, update them
    if (payload.itemRemarks && typeof payload.itemRemarks === 'object') {
      for (const [itemIdStr, remarkText] of Object.entries(payload.itemRemarks || {})) {
        const itemId = parseInt(itemIdStr, 10)
        if (itemId && typeof remarkText === 'string') {
          await db
            .update(dailyActivitySessionItems)
            .set({ remark: remarkText.substring(0, 600), updatedAt: new Date() })
            .where(
              and(
                eq(dailyActivitySessionItems.id, itemId),
                eq(dailyActivitySessionItems.sessionId, approval.sessionId)
              )
            )
        }
      }
    }

    const now = new Date()
    let currentStepToApprove = approval
    let nextStep: any = null
    let isCompleted = false

    while (currentStepToApprove) {
      await db
        .update(dailyActivityApprovals)
        .set({
          status: 'approved',
          signatureDataUrl: payload.signatureDataUrl,
          remarks: payload.remarks ?? '',
          signedAt: now,
        })
        .where(eq(dailyActivityApprovals.id, currentStepToApprove.id))

      // Check for next step
      const [candidateNext] = await db
        .select()
        .from(dailyActivityApprovals)
        .where(
          and(
            eq(dailyActivityApprovals.sessionId, approval.sessionId),
            sql`${dailyActivityApprovals.stepOrder} > ${currentStepToApprove.stepOrder}`
          )
        )
        .orderBy(asc(dailyActivityApprovals.stepOrder))
        .limit(1)

      if (!candidateNext) {
        isCompleted = true
        break
      }

      const isSameApprover =
        (candidateNext.approverEmployeeId &&
          currentStepToApprove.approverEmployeeId &&
          candidateNext.approverEmployeeId === currentStepToApprove.approverEmployeeId) ||
        (candidateNext.approverEmail &&
          currentStepToApprove.approverEmail &&
          candidateNext.approverEmail.toLowerCase().trim() ===
            currentStepToApprove.approverEmail.toLowerCase().trim()) ||
        (candidateNext.approverName &&
          currentStepToApprove.approverName &&
          candidateNext.approverName.toLowerCase().trim() ===
            currentStepToApprove.approverName.toLowerCase().trim())

      if (isSameApprover) {
        currentStepToApprove = candidateNext
      } else {
        nextStep = candidateNext
        if (nextStep.status !== 'approved') {
          await db
            .update(dailyActivityApprovals)
            .set({ status: 'pending' })
            .where(eq(dailyActivityApprovals.id, nextStep.id))
        }
        break
      }
    }

    if (!isCompleted && nextStep) {
      // Notify next approver with email + bell notification
      let nextApproverEmail = nextStep.approverEmail
      if (!nextApproverEmail && nextStep.approverEmployeeId) {
        const [nextEmp] = await db
          .select({ email: employees.email })
          .from(employees)
          .where(eq(employees.id, nextStep.approverEmployeeId))
          .limit(1)
        if (nextEmp?.email) nextApproverEmail = nextEmp.email
      }

      if (nextApproverEmail) {
        const baseUrl = getAppUrl()
        const approvalLink = `${baseUrl}/review/daily-activity/${nextStep.approvalToken}`

        await notifyWorkflowBellRecipients({
          recipientEmails: [nextApproverEmail],
          eventType: 'daily_activity_approval_needed',
          category: 'approval_requests',
          title: `Approval Daily Activity - ${nextStep.stepLabel}`,
          body: `Aktivitas harian memerlukan tanda tangan/persetujuan Anda pada tahap ${nextStep.stepLabel}.`,
          url: approvalLink,
          tagPrefix: 'daily-activity-approval',
          metadata: {
            sessionId: approval.sessionId,
            stepOrder: nextStep.stepOrder,
            token: nextStep.approvalToken,
          },
        }).catch((bellErr) => {
          console.error('Error notifying workflow bell recipients:', bellErr)
        })

        try {
          const [sessionRow] = await db
            .select({
              sessionCode: dailyActivitySessions.sessionCode,
              workDate: dailyActivitySessions.workDate,
              employeeName: employees.name,
              siteName: sites.name,
            })
            .from(dailyActivitySessions)
            .leftJoin(employees, eq(dailyActivitySessions.employeeId, employees.id))
            .leftJoin(sites, eq(dailyActivitySessions.siteId, sites.id))
            .where(eq(dailyActivitySessions.id, approval.sessionId))
            .limit(1)

          await sendDailyActivityStepApprovalEmail({
            sessionId: approval.sessionId,
            sessionCode: sessionRow?.sessionCode || `ACT-${approval.sessionId}`,
            employeeName: sessionRow?.employeeName || 'Karyawan',
            workDate: sessionRow?.workDate,
            siteName: sessionRow?.siteName || '-',
            approverName: nextStep.approverName || 'Approver',
            approverEmail: nextApproverEmail,
            approvalStep: nextStep.stepLabel,
            approvalToken: nextStep.approvalToken,
          })
        } catch (emailErr) {
          console.error('Error sending next step approval email:', emailErr)
        }
      }
    } else {
      // Auto-approve any remaining steps just in case
      await db
        .update(dailyActivityApprovals)
        .set({
          status: 'approved',
          signatureDataUrl: payload.signatureDataUrl,
          signedAt: now,
        })
        .where(
          and(
            eq(dailyActivityApprovals.sessionId, approval.sessionId),
            eq(dailyActivityApprovals.status, 'waiting')
          )
        )

      // All steps completed!
      await db
        .update(dailyActivitySessions)
        .set({ status: 'approved', approvedAt: now, updatedAt: now })
        .where(eq(dailyActivitySessions.id, approval.sessionId))

      // Award points & update streak for submitter and all team members
      await awardSessionPointsToTeam(approval.sessionId, db)

      try {
        const [sessionRow] = await db
          .select({
            sessionCode: dailyActivitySessions.sessionCode,
            workDate: dailyActivitySessions.workDate,
            employeeName: employees.name,
            employeeEmail: employees.email,
          })
          .from(dailyActivitySessions)
          .leftJoin(employees, eq(dailyActivitySessions.employeeId, employees.id))
          .where(eq(dailyActivitySessions.id, approval.sessionId))
          .limit(1)

        const teamMemberRows = await db
          .select({ email: employees.email })
          .from(dailyActivitySessionTeamMembers)
          .innerJoin(employees, eq(dailyActivitySessionTeamMembers.employeeId, employees.id))
          .where(eq(dailyActivitySessionTeamMembers.sessionId, approval.sessionId))

        const allBellEmails = Array.from(
          new Set(
            [sessionRow?.employeeEmail, ...teamMemberRows.map((t) => t.email)].filter(
              (e): e is string => Boolean(e)
            )
          )
        )

        if (sessionRow?.employeeEmail) {
          try {
            await sendDailyActivityCompletedEmail({
              sessionId: approval.sessionId,
              sessionCode: sessionRow.sessionCode || `ACT-${approval.sessionId}`,
              employeeName: sessionRow.employeeName || 'Karyawan',
              employeeEmail: sessionRow.employeeEmail,
              workDate: sessionRow.workDate,
            })
          } catch (emailErr) {
            console.error('Error sending completed approval email:', emailErr)
          }
        }

        if (allBellEmails.length > 0) {
          await notifyWorkflowBellRecipients({
            recipientEmails: allBellEmails,
            eventType: 'daily_activity_approved',
            category: 'approval_requests',
            title: `Daily Activity Disetujui: ${sessionRow?.sessionCode || ''}`,
            body: `Laporan aktivitas harian Anda telah disetujui secara lengkap oleh seluruh approver. Poin telah ditambahkan ke profil Anda.`,
            url: `/dashboard/activity-hub/document/${approval.sessionId}`,
            tagPrefix: 'daily-activity-approved',
            metadata: { sessionId: approval.sessionId },
          }).catch((bellErr) => {
            console.error('Error notifying workflow bell recipients on completed:', bellErr)
          })
        }
      } catch (emailErr) {
        console.error('Error sending completed approval email:', emailErr)
      }
    }

    safeRevalidatePath(`/dashboard/activity-hub/document/${approval.sessionId}`)
    safeRevalidatePath(`/dashboard/activity-hub/document/${approval.sessionId}/approval`)
    safeRevalidatePath(`/dashboard/activity-hub/approval`)
    safeRevalidatePath(`/dashboard/approval`)
    safeRevalidatePath(`/dashboard/activity-hub/my-day`)
    safeRevalidatePath(`/review/daily-activity/${token}`)

    return { success: true as const }
  } catch (error: any) {
    console.error('Error approving daily activity step:', error)
    return { success: false as const, error: error.message || 'Gagal memproses persetujuan.' }
  }
}

export async function rejectDailyActivityStepByToken(
  token: string,
  payload: { remarks?: string }
) {
  try {
    const [approval] = await db
      .select()
      .from(dailyActivityApprovals)
      .where(eq(dailyActivityApprovals.approvalToken, token))
      .limit(1)

    if (!approval) {
      return { success: false as const, error: 'Approval tidak ditemukan.' }
    }

    const now = new Date()
    await db
      .update(dailyActivityApprovals)
      .set({
        status: 'rejected',
        remarks: payload.remarks ?? '',
        signedAt: now,
      })
      .where(eq(dailyActivityApprovals.id, approval.id))

    // Cancel subsequent steps
    await db
      .update(dailyActivityApprovals)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(dailyActivityApprovals.sessionId, approval.sessionId),
          sql`${dailyActivityApprovals.stepOrder} > ${approval.stepOrder}`
        )
      )

    // Mark session as rejected
    await db
      .update(dailyActivitySessions)
      .set({ status: 'rejected' })
      .where(eq(dailyActivitySessions.id, approval.sessionId))

    try {
      const [sessionRow] = await db
        .select({
          sessionCode: dailyActivitySessions.sessionCode,
          employeeName: employees.name,
          employeeEmail: employees.email,
        })
        .from(dailyActivitySessions)
        .leftJoin(employees, eq(dailyActivitySessions.employeeId, employees.id))
        .where(eq(dailyActivitySessions.id, approval.sessionId))
        .limit(1)

      if (sessionRow?.employeeEmail) {
        await sendDailyActivityRejectedEmail({
          sessionId: approval.sessionId,
          sessionCode: sessionRow.sessionCode || `ACT-${approval.sessionId}`,
          employeeName: sessionRow.employeeName || 'Karyawan',
          employeeEmail: sessionRow.employeeEmail,
          approverName: approval.approverName || 'Approver',
          remarks: payload.remarks,
        })

        await notifyWorkflowBellRecipients({
          recipientEmails: [sessionRow.employeeEmail],
          eventType: 'daily_activity_rejected',
          category: 'approval_requests',
          title: `Daily Activity Ditolak: ${sessionRow.sessionCode || ''}`,
          body: `Laporan aktivitas harian Anda ditolak oleh ${approval.approverName || 'Approver'}.${payload.remarks ? ` Alasan: ${payload.remarks}` : ''}`,
          url: `/dashboard/activity-hub/document/${approval.sessionId}`,
          tagPrefix: 'daily-activity-rejected',
          metadata: { sessionId: approval.sessionId },
        }).catch((bellErr) => {
          console.error('Error notifying workflow bell recipients on rejected:', bellErr)
        })
      }
    } catch (emailErr) {
      console.error('Error sending rejected approval email:', emailErr)
    }

    safeRevalidatePath(`/dashboard/activity-hub/document/${approval.sessionId}`)
    safeRevalidatePath(`/dashboard/activity-hub/document/${approval.sessionId}/approval`)
    safeRevalidatePath(`/dashboard/activity-hub/approval`)
    safeRevalidatePath(`/review/daily-activity/${token}`)

    return { success: true as const }
  } catch (error: any) {
    console.error('Error rejecting daily activity step:', error)
    return { success: false as const, error: error.message || 'Gagal menolak approval.' }
  }
}

export async function revertDailyActivityStepByToken(
  token: string,
  payload: { remarks?: string }
) {
  try {
    const [approval] = await db
      .select()
      .from(dailyActivityApprovals)
      .where(eq(dailyActivityApprovals.approvalToken, token))
      .limit(1)

    if (!approval) {
      return { success: false as const, error: 'Approval tidak ditemukan.' }
    }

    const now = new Date()

    // 1. Mark reverting step as reverted, clearing signature & timestamp
    await db
      .update(dailyActivityApprovals)
      .set({
        status: 'reverted',
        remarks: payload.remarks || `Dokumen dikembalikan oleh ${approval.stepLabel} untuk revisi.`,
        signatureDataUrl: null,
        signedAt: null,
      })
      .where(eq(dailyActivityApprovals.id, approval.id))

    // 2. Set steps AFTER reverting step to waiting
    await db
      .update(dailyActivityApprovals)
      .set({
        status: 'waiting',
        signatureDataUrl: null,
        signedAt: null,
      })
      .where(
        and(
          eq(dailyActivityApprovals.sessionId, approval.sessionId),
          sql`${dailyActivityApprovals.stepOrder} > ${approval.stepOrder}`
        )
      )

    // 3. Set master session status to reverted (sends to requester's inbox)
    await db
      .update(dailyActivitySessions)
      .set({ status: 'reverted', updatedAt: now })
      .where(eq(dailyActivitySessions.id, approval.sessionId))

    const [step1] = await db
      .select()
      .from(dailyActivityApprovals)
      .where(
        and(
          eq(dailyActivityApprovals.sessionId, approval.sessionId),
          eq(dailyActivityApprovals.stepOrder, 1)
        )
      )
      .limit(1)

    const [sessionRow] = await db
      .select({ sessionCode: dailyActivitySessions.sessionCode })
      .from(dailyActivitySessions)
      .where(eq(dailyActivitySessions.id, approval.sessionId))
      .limit(1)

    try {
      if (step1?.approverEmail) {
        await sendDailyActivityRevertedEmail({
          sessionId: approval.sessionId,
          sessionCode: sessionRow?.sessionCode || `ACT-${approval.sessionId}`,
          targetApproverName: step1.approverName || 'Karyawan',
          targetApproverEmail: step1.approverEmail,
          managerName: approval.approverName || approval.stepLabel,
          revertReason: payload.remarks,
        })

        await notifyWorkflowBellRecipients({
          recipientEmails: [step1.approverEmail],
          eventType: 'daily_activity_reverted',
          category: 'approval_requests',
          title: `Daily Activity Perlu Revisi: ${sessionRow?.sessionCode || ''}`,
          body: `Laporan aktivitas harian Anda dikembalikan oleh ${approval.approverName || approval.stepLabel} untuk direvisi.${payload.remarks ? ` Alasan: ${payload.remarks}` : ''}`,
          url: `/dashboard/activity-hub/document/${approval.sessionId}`,
          tagPrefix: 'daily-activity-reverted',
          metadata: { sessionId: approval.sessionId },
        }).catch((bellErr) => {
          console.error('Error notifying workflow bell recipients on reverted:', bellErr)
        })
      }
    } catch (emailErr) {
      console.error('Error sending reverted approval email:', emailErr)
    }

    safeRevalidatePath(`/dashboard/activity-hub/document/${approval.sessionId}`)
    safeRevalidatePath(`/dashboard/activity-hub/document/${approval.sessionId}/approval`)
    safeRevalidatePath(`/dashboard/activity-hub/approval`)
    safeRevalidatePath(`/review/daily-activity/${token}`)

    return { success: true as const }
  } catch (error: any) {
    console.error('Error reverting daily activity step:', error)
    return { success: false as const, error: error.message || 'Gagal mengembalikan approval.' }
  }
}

export async function saveDailyActivityApprovalForm(payload: {
  sessionId: number
  employeeId?: number | null
  workDate?: string | Date
  shiftCode?: string
  notes?: string
  summaryRemark?: string
  customerName?: string
  items?: Array<{
    id?: number
    label: string
    group?: string
    libraryActivityId?: number | null
    routeItemId?: number | null
    unitNumber?: string
    duration?: string
    points?: number
    remark?: string
    materialUsed?: string
    startedAt?: string | Date | null
    endedAt?: string | Date | null
    photoUrl?: string | null
    photos?: any[]
  }>
  itemRemarks?: Record<number, string>
  leaderEmployeeId?: number | null
  leaderName?: string
  leaderEmail?: string
  leaderTitle?: string
  superiorEmployeeId?: number | null
  superiorName?: string
  superiorEmail?: string
  superiorTitle?: string
  managerEmployeeId?: number | null
  managerName?: string
  managerEmail?: string
  managerTitle?: string
  leaderSignatureDataUrl?: string
  signatures?: Record<number, string>
  stepRemarks?: Record<number, string>
  teamMemberEmployeeIds?: number[]
  additionalApprovers?: Array<{
    employeeId: number
    name?: string
    role?: string
    stepLabel?: string
  }>
}) {
  try {
    const [existingSession] = await db
      .select({
        id: dailyActivitySessions.id,
        status: dailyActivitySessions.status,
        sessionCode: dailyActivitySessions.sessionCode,
        workDate: dailyActivitySessions.workDate,
        employeeId: dailyActivitySessions.employeeId,
        siteId: dailyActivitySessions.siteId,
      })
      .from(dailyActivitySessions)
      .where(eq(dailyActivitySessions.id, payload.sessionId))
      .limit(1)

    if (!existingSession) {
      return {
        success: false as const,
        error: 'DAR tidak ditemukan atau sudah dihapus. Muat ulang halaman lalu coba lagi.',
      }
    }

    if ((existingSession.status || '').toLowerCase() === 'rejected') {
      return {
        success: false as const,
        error: 'Aksi ditolak: Dokumen yang sudah ditolak (rejected) tidak dapat diedit atau diajukan ulang. Silakan buat dokumen baru.',
      }
    }

    // 1. Update session header if employeeId / workDate / shiftCode provided
    const sessionUpdates: Record<string, any> = { updatedAt: new Date() }
    if (payload.employeeId) {
      sessionUpdates.employeeId = payload.employeeId
      const [emp] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email, siteId: employees.siteId })
        .from(employees)
        .where(eq(employees.id, payload.employeeId))
        .limit(1)
      if (emp?.siteId) sessionUpdates.siteId = emp.siteId
      if (emp) {
        await db
          .update(dailyActivityApprovals)
          .set({
            approverEmployeeId: emp.id,
            approverName: emp.name,
            approverEmail: emp.email,
          })
          .where(
            and(
              eq(dailyActivityApprovals.sessionId, payload.sessionId),
              eq(dailyActivityApprovals.approverRole, 'employee')
            )
          )
      }
    }
    if (payload.workDate) {
      sessionUpdates.workDate = new Date(payload.workDate)
    }
    if (payload.shiftCode) {
      sessionUpdates.shiftCode = payload.shiftCode
    }
    if (payload.teamMemberEmployeeIds !== undefined) {
      let baseRemark = (payload.notes ?? payload.summaryRemark ?? '').replace(/\s*\[Team:\s*[^\]]+\]/gi, '').trim()
      if (payload.teamMemberEmployeeIds.length > 0) {
        const teamEmps = await db
          .select({ name: employees.name })
          .from(employees)
          .where(inArray(employees.id, payload.teamMemberEmployeeIds))
        if (teamEmps.length > 0) {
          const names = teamEmps.map((e) => e.name).join(', ')
          baseRemark = baseRemark ? `${baseRemark} [Team: ${names}]` : `[Team: ${names}]`
        }
      }
      sessionUpdates.summaryRemark = baseRemark.substring(0, 1000)
    } else if (payload.notes !== undefined || payload.summaryRemark !== undefined) {
      sessionUpdates.summaryRemark = (payload.notes ?? payload.summaryRemark ?? '').substring(0, 1000)
    }

    if (payload.customerName !== undefined) {
      const custTrimmed = (payload.customerName || '')
        .replace(/\s*\|\s*\[Team:\s*[^\]]+\]/gi, '')
        .replace(/\s*\[Team:\s*[^\]]+\]/gi, '')
        .replace(/\s*\|\s*$/, '')
        .trim()
      if (custTrimmed) {
        let targetSiteId = sessionUpdates.siteId
        if (!targetSiteId) {
          const [sessRow] = await db
            .select({ siteId: dailyActivitySessions.siteId, employeeId: dailyActivitySessions.employeeId })
            .from(dailyActivitySessions)
            .where(eq(dailyActivitySessions.id, payload.sessionId))
            .limit(1)
          targetSiteId = sessRow?.siteId
          if (!targetSiteId && sessRow?.employeeId) {
            const [empRow] = await db
              .select({ siteId: employees.siteId })
              .from(employees)
              .where(eq(employees.id, sessRow.employeeId))
              .limit(1)
            targetSiteId = empRow?.siteId ?? null
            if (targetSiteId) {
              sessionUpdates.siteId = targetSiteId
            }
          }
        }
        if (targetSiteId) {
          await db
            .update(sites)
            .set({ customerName: custTrimmed })
            .where(eq(sites.id, targetSiteId))
        }
      }
    }

    const currentStatusLower = (existingSession?.status || '').toLowerCase()
    const isCurrentlyReverted =
      currentStatusLower.includes('revert') ||
      currentStatusLower.includes('revision') ||
      currentStatusLower.includes('return')
    const isDraft = currentStatusLower === 'draft'

    if (isCurrentlyReverted || isDraft) {
      sessionUpdates.status = 'submitted'
      sessionUpdates.submittedAt = new Date()
      sessionUpdates.updatedAt = new Date()

      const now = new Date()

      // Fetch all approval steps for this session
      const existingApprovals = await db
        .select()
        .from(dailyActivityApprovals)
        .where(eq(dailyActivityApprovals.sessionId, payload.sessionId))
        .orderBy(asc(dailyActivityApprovals.stepOrder))

      const [sessionEmp] = existingSession?.employeeId
        ? await db
            .select({
              id: employees.id,
              name: employees.name,
              email: employees.email,
              signatureDataUrl: employees.signatureDataUrl,
              siteId: employees.siteId,
            })
            .from(employees)
            .where(eq(employees.id, existingSession.employeeId))
            .limit(1)
        : []

      const leaderSigDataUrl = payload.leaderSignatureDataUrl || (payload.signatures ? payload.signatures[1] : undefined)

      if (existingApprovals.length === 0) {
        // Initialize approval steps for draft submission if not present
        const step1Token = randomUUID()
        const step2Token = randomUUID()

        // Resolve leader
        let leaderEmpId = payload.leaderEmployeeId
        let leaderName = payload.leaderName
        let leaderEmail = payload.leaderEmail || ''

        if (!leaderEmpId && sessionEmp?.siteId) {
          const [siteHead] = await db
            .select({ id: employees.id, name: employees.name, email: employees.email })
            .from(sites)
            .innerJoin(employees, and(eq(employees.id, sites.headEmployeeId), eq(employees.isActive, true)))
            .where(eq(sites.id, sessionEmp.siteId))
            .limit(1)
          if (siteHead) {
            leaderEmpId = siteHead.id
            leaderName = siteHead.name
            leaderEmail = siteHead.email || ''
          }
        }

        const stepsToInsert: any[] = [
          {
            sessionId: payload.sessionId,
            stepOrder: 1,
            stepLabel: 'Karyawan Sign',
            approverRole: 'employee',
            approverEmployeeId: sessionEmp?.id || existingSession.employeeId,
            approverName: sessionEmp?.name || 'Karyawan',
            approverEmail: sessionEmp?.email || '',
            status: 'approved',
            signatureDataUrl: leaderSigDataUrl || sessionEmp?.signatureDataUrl || null,
            signedAt: now,
            remarks: 'Submitted oleh pemohon.',
            approvalToken: step1Token,
            createdAt: now,
          },
          {
            sessionId: payload.sessionId,
            stepOrder: 2,
            stepLabel: 'Leader / PJO',
            approverRole: 'leader',
            approverEmployeeId: leaderEmpId ?? null,
            approverName: leaderName || 'Leader / PJO Site',
            approverEmail: leaderEmail,
            status: 'pending',
            approvalToken: step2Token,
            createdAt: now,
          },
        ]

        await db.insert(dailyActivityApprovals).values(stepsToInsert)

        if (leaderEmail) {
          const [siteRow] = existingSession?.siteId
            ? await db.select({ name: sites.name }).from(sites).where(eq(sites.id, existingSession.siteId)).limit(1)
            : []
          void sendDailyActivityStepApprovalEmail({
            sessionId: payload.sessionId,
            sessionCode: existingSession?.sessionCode || `ACT-${payload.sessionId}`,
            employeeName: sessionEmp?.name || 'Karyawan',
            workDate: existingSession?.workDate,
            siteName: siteRow?.name || '-',
            approverName: leaderName || 'Leader',
            approverEmail: leaderEmail,
            approvalStep: 'Leader / PJO',
            approvalToken: step2Token,
          }).catch((e) => {
            console.error('Error sending step 2 email on draft submit:', e)
          })
        }
      } else {
        // 1. Step 1 (Karyawan Sign) is approved and signed by submitter
        await db
          .update(dailyActivityApprovals)
          .set({
            status: 'approved',
            signedAt: now,
            signatureDataUrl: leaderSigDataUrl || sessionEmp?.signatureDataUrl || null,
            remarks: '',
          })
          .where(
            and(
              eq(dailyActivityApprovals.sessionId, payload.sessionId),
              eq(dailyActivityApprovals.stepOrder, 1)
            )
          )

        // Find the step that was reverted (the approver who requested revision), default to step 2
        const revertedStep = existingApprovals.find(
          (s) => (s.status || '').toLowerCase() === 'reverted' || (s.status || '').toLowerCase() === 'needs_revision'
        )
        const targetStepOrder = revertedStep?.stepOrder && revertedStep.stepOrder > 1 ? revertedStep.stepOrder : 2

        // The target step (the one who reverted or step 2) becomes 'pending'
        await db
          .update(dailyActivityApprovals)
          .set({
            status: 'pending',
            signatureDataUrl: null,
            signedAt: null,
            remarks: '',
          })
          .where(
            and(
              eq(dailyActivityApprovals.sessionId, payload.sessionId),
              eq(dailyActivityApprovals.stepOrder, targetStepOrder)
            )
          )

        // Reset any steps AFTER targetStepOrder to 'waiting'
        await db
          .update(dailyActivityApprovals)
          .set({
            status: 'waiting',
            signatureDataUrl: null,
            signedAt: null,
            remarks: '',
          })
          .where(
            and(
              eq(dailyActivityApprovals.sessionId, payload.sessionId),
              sql`${dailyActivityApprovals.stepOrder} > ${targetStepOrder}`
            )
          )

        const targetStep = existingApprovals.find((s) => s.stepOrder === targetStepOrder)

        // Send email notification to targetStep (the person who will review) without blocking response
        const [siteRow] = existingSession?.siteId
          ? await db.select({ name: sites.name }).from(sites).where(eq(sites.id, existingSession.siteId)).limit(1)
          : []

        if (targetStep?.approverEmail) {
          void sendDailyActivityStepApprovalEmail({
            sessionId: payload.sessionId,
            sessionCode: existingSession?.sessionCode || `ACT-${payload.sessionId}`,
            employeeName: sessionEmp?.name || 'Karyawan',
            workDate: existingSession?.workDate,
            siteName: siteRow?.name || '-',
            approverName: targetStep.approverName || targetStep.stepLabel || 'Approver',
            approverEmail: targetStep.approverEmail,
            approvalStep: targetStep.stepLabel || 'Approval Step',
            approvalToken: targetStep.approvalToken,
          }).catch((mailErr) => {
            console.error('Error sending smart resume daily activity email:', mailErr)
          })
        }
      }
    }

    await db
      .update(dailyActivitySessions)
      .set(sessionUpdates)
      .where(eq(dailyActivitySessions.id, payload.sessionId))

    // 2. Handle items array if provided
    if (payload.items && Array.isArray(payload.items)) {
      const existingDbItems = await db
        .select({ id: dailyActivitySessionItems.id, snapshotPayload: dailyActivitySessionItems.snapshotPayload })
        .from(dailyActivitySessionItems)
        .where(eq(dailyActivitySessionItems.sessionId, payload.sessionId))

      const submittedItemIds = new Set(
        payload.items.filter((i) => i.id != null && i.id > 0).map((i) => i.id as number)
      )

      // Delete items removed from list
      for (const existing of existingDbItems) {
        if (!submittedItemIds.has(existing.id)) {
          await db
            .delete(dailyActivitySessionItems)
            .where(eq(dailyActivitySessionItems.id, existing.id))
        }
      }

      // Pre-fetch all library and route item IDs in batch to eliminate serial DB round-trips
      const allLibIds = payload.items
        .map((i) => Number(i.libraryActivityId))
        .filter((id) => !isNaN(id) && id > 0)
      const allRouteIds = payload.items
        .map((i) => Number(i.routeItemId))
        .filter((id) => !isNaN(id) && id > 0)

      const [validLibRows, validRouteRows] = await Promise.all([
        allLibIds.length > 0
          ? db
              .select({ id: activityLibraries.id })
              .from(activityLibraries)
              .where(inArray(activityLibraries.id, allLibIds))
          : Promise.resolve([] as Array<{ id: number }>),
        allRouteIds.length > 0
          ? db
              .select({ id: activityRouteItems.id })
              .from(activityRouteItems)
              .where(inArray(activityRouteItems.id, allRouteIds))
          : Promise.resolve([] as Array<{ id: number }>),
      ])

      const validLibSet = new Set(validLibRows.map((r) => r.id))
      const validRouteSet = new Set(validRouteRows.map((r) => r.id))

      // Update or insert items
      for (let idx = 0; idx < payload.items.length; idx++) {
        const item = payload.items[idx]
        const parseSafeItemDate = (val: any) => {
          if (!val) return null
          const d = val instanceof Date ? val : new Date(val)
          return isNaN(d.getTime()) ? null : d
        }
        const startedAtDate = parseSafeItemDate(item.startedAt)
        const endedAtDate = parseSafeItemDate(item.endedAt)

        const cleanPhotoUrl = (u: any) => {
          const str = typeof u === 'string' ? u : u?.url || u?.dataUrl || ''
          if (!str || typeof str !== 'string') return ''
          const trimmed = str.trim()
          return resolveUploadUrl(trimmed)
        }

        const rawExtracted: string[] = []
        if (Array.isArray(item.photos)) {
          item.photos.forEach((p: any) => {
            const cleaned = cleanPhotoUrl(p)
            if (cleaned) rawExtracted.push(cleaned)
          })
        }
        if (item.photoUrl) {
          const cleaned = cleanPhotoUrl(item.photoUrl)
          if (cleaned) rawExtracted.push(cleaned)
        }
        const cleanedPhotoUrls = Array.from(new Set(rawExtracted))
        const firstPhotoUrl = cleanedPhotoUrls[0] || null

        const numLibId = item.libraryActivityId ? Number(item.libraryActivityId) : null
        const safeLibraryActivityId = numLibId && validLibSet.has(numLibId) ? numLibId : null

        const numRouteId = item.routeItemId ? Number(item.routeItemId) : null
        const safeRouteItemId = numRouteId && validRouteSet.has(numRouteId) ? numRouteId : null

        const itemPayloadJson = JSON.stringify({
          unitNumber: item.unitNumber ?? '',
          remark: (payload.itemRemarks?.[item.id || 0] ?? item.remark ?? '').substring(0, 600),
          materialUsed: item.materialUsed ?? '',
          startedAt: item.startedAt ?? null,
          endedAt: item.endedAt ?? null,
          photoUrl: firstPhotoUrl,
          photoUrls: cleanedPhotoUrls,
          photo: firstPhotoUrl ? { url: firstPhotoUrl } : undefined,
          photos: cleanedPhotoUrls.map((u) => ({ url: u })),
          libraryActivityId: safeLibraryActivityId,
          routeItemId: safeRouteItemId,
        })

        if (item.id && item.id > 0) {
          await db
            .update(dailyActivitySessionItems)
            .set({
              snapshotLabel: item.label,
              snapshotGroupName: item.group || 'Technical',
              libraryActivityId: safeLibraryActivityId,
              routeItemId: safeRouteItemId,
              unitNumber: item.unitNumber ?? '',
              actualPoints: item.points ?? 0,
              remark: (payload.itemRemarks?.[item.id] ?? item.remark ?? '').substring(0, 600),
              startedAt: startedAtDate,
              endedAt: endedAtDate,
              snapshotPayload: itemPayloadJson,
              sortOrder: idx + 1,
              updatedAt: new Date(),
            })
            .where(eq(dailyActivitySessionItems.id, item.id))
        } else if (item.label?.trim()) {
          await db.insert(dailyActivitySessionItems).values({
            sessionId: payload.sessionId,
            snapshotLabel: item.label.trim(),
            snapshotGroupName: item.group || 'Technical',
            libraryActivityId: safeLibraryActivityId,
            routeItemId: safeRouteItemId,
            unitNumber: item.unitNumber ?? '',
            actualPoints: item.points ?? 5,
            isChecked: true,
            sortOrder: idx + 1,
            remark: (item.remark ?? '').substring(0, 600),
            startedAt: startedAtDate,
            endedAt: endedAtDate,
            snapshotPayload: itemPayloadJson,
          })
        }
      }
    } else if (payload.itemRemarks && typeof payload.itemRemarks === 'object') {
      // Save item remarks alone
      for (const [itemIdStr, remarkText] of Object.entries(payload.itemRemarks || {})) {
        const itemId = parseInt(itemIdStr, 10)
        if (itemId && typeof remarkText === 'string') {
          await db
            .update(dailyActivitySessionItems)
            .set({ remark: remarkText.substring(0, 600), updatedAt: new Date() })
            .where(
              and(
                eq(dailyActivitySessionItems.id, itemId),
                eq(dailyActivitySessionItems.sessionId, payload.sessionId)
              )
            )
        }
      }
    }

    // 3. Update approver records with strict designated signatory binding
    if (payload.leaderEmployeeId || payload.leaderName) {
      const updates: Record<string, any> = {}
      if (payload.leaderName) updates.approverName = payload.leaderName
      if (payload.leaderEmail) updates.approverEmail = payload.leaderEmail
      if (payload.leaderEmployeeId) {
        const [l] = await db
          .select({ id: employees.id, name: employees.name, email: employees.email })
          .from(employees)
          .where(eq(employees.id, payload.leaderEmployeeId))
          .limit(1)
        if (l) {
          updates.approverEmployeeId = l.id
          if (!payload.leaderName) updates.approverName = l.name
          if (!payload.leaderEmail) updates.approverEmail = l.email
        }
      }
      if (Object.keys(updates || {}).length > 0) {
        await db
          .update(dailyActivityApprovals)
          .set(updates)
          .where(
            and(
              eq(dailyActivityApprovals.sessionId, payload.sessionId),
              eq(dailyActivityApprovals.approverRole, 'leader')
            )
          )
      }
    }

    if (payload.superiorEmployeeId || payload.superiorName) {
      const updates: Record<string, any> = {}
      if (payload.superiorName) updates.approverName = payload.superiorName
      if (payload.superiorEmail) updates.approverEmail = payload.superiorEmail
      if (payload.superiorEmployeeId) {
        const [s] = await db
          .select({ id: employees.id, name: employees.name, email: employees.email })
          .from(employees)
          .where(eq(employees.id, payload.superiorEmployeeId))
          .limit(1)
        if (s) {
          updates.approverEmployeeId = s.id
          if (!payload.superiorName) updates.approverName = s.name
          if (!payload.superiorEmail) updates.approverEmail = s.email
        }
      }
      if (Object.keys(updates || {}).length > 0) {
        await db
          .update(dailyActivityApprovals)
          .set(updates)
          .where(
            and(
              eq(dailyActivityApprovals.sessionId, payload.sessionId),
              eq(dailyActivityApprovals.approverRole, 'section_head')
            )
          )
      }
    }

    if (payload.managerEmployeeId || payload.managerName) {
      const updates: Record<string, any> = {}
      if (payload.managerName) updates.approverName = payload.managerName
      if (payload.managerEmail) updates.approverEmail = payload.managerEmail
      if (payload.managerEmployeeId) {
        const [m] = await db
          .select({ id: employees.id, name: employees.name, email: employees.email })
          .from(employees)
          .where(eq(employees.id, payload.managerEmployeeId))
          .limit(1)
        if (m) {
          updates.approverEmployeeId = m.id
          if (!payload.managerName) updates.approverName = m.name
          if (!payload.managerEmail) updates.approverEmail = m.email
        }
      }
      if (Object.keys(updates || {}).length > 0) {
        await db
          .update(dailyActivityApprovals)
          .set(updates)
          .where(
            and(
              eq(dailyActivityApprovals.sessionId, payload.sessionId),
              eq(dailyActivityApprovals.approverRole, 'manager')
            )
          )
      }
    }

    if (payload.additionalApprovers !== undefined && Array.isArray(payload.additionalApprovers)) {
      const extraEmpIds = Array.from(new Set(payload.additionalApprovers.map((a) => Number(a.employeeId)).filter(Boolean)))
      const extraEmps = extraEmpIds.length > 0
        ? await db
            .select({ id: employees.id, name: employees.name, email: employees.email })
            .from(employees)
            .where(inArray(employees.id, extraEmpIds))
        : []
      const extraMap = new Map(extraEmps.map((e) => [e.id, e]))

      // Remove non-approved steps with stepOrder > 2 to re-align cleanly
      await db
        .delete(dailyActivityApprovals)
        .where(
          and(
            eq(dailyActivityApprovals.sessionId, payload.sessionId),
            sql`${dailyActivityApprovals.stepOrder} > 2`,
            ne(dailyActivityApprovals.status, 'approved')
          )
        )

      let startOrder = 3
      for (const extra of payload.additionalApprovers) {
        const extraEmpId = Number(extra.employeeId)
        if (!extraEmpId) continue
        const found = extraMap.get(extraEmpId)
        await db.insert(dailyActivityApprovals).values({
          sessionId: payload.sessionId,
          stepOrder: startOrder,
          stepLabel: extra.stepLabel || `Approver Tambahan (Tahap ${startOrder})`,
          approverRole: extra.role || 'additional_approver',
          approverEmployeeId: extraEmpId,
          approverName: found?.name || extra.name || 'Approver Tambahan',
          approverEmail: found?.email || '',
          status: 'waiting',
          approvalToken: randomUUID(),
          createdAt: new Date(),
        })
        startOrder++
      }
    }

    // 4. If signatures provided, apply and advance sequential workflow
    const [session] = await db
      .select({
        id: dailyActivitySessions.id,
        sessionCode: dailyActivitySessions.sessionCode,
        workDate: dailyActivitySessions.workDate,
        employeeId: dailyActivitySessions.employeeId,
        siteId: dailyActivitySessions.siteId,
      })
      .from(dailyActivitySessions)
      .where(eq(dailyActivitySessions.id, payload.sessionId))
      .limit(1)

    const [siteRow] = session?.siteId
      ? await db.select({ name: sites.name }).from(sites).where(eq(sites.id, session.siteId)).limit(1)
      : []

    const [sessionEmployee] = session?.employeeId
      ? await db.select({ name: employees.name, email: employees.email }).from(employees).where(eq(employees.id, session.employeeId)).limit(1)
      : []

    // If stepRemarks provided alone, save remarks to step approvals
    if (payload.stepRemarks && typeof payload.stepRemarks === 'object') {
      for (const [stepIdStr, remark] of Object.entries(payload.stepRemarks || {})) {
        const stepId = Number(stepIdStr)
        if (stepId && remark !== undefined) {
          await db
            .update(dailyActivityApprovals)
            .set({ remarks: remark })
            .where(eq(dailyActivityApprovals.id, stepId))
        }
      }
    }

    if (payload.signatures && typeof payload.signatures === 'object') {
      for (const [stepIdStr, sigUrl] of Object.entries(payload.signatures || {})) {
        const stepId = Number(stepIdStr)
        if (stepId && sigUrl) {
          const [currentStep] = await db
            .select()
            .from(dailyActivityApprovals)
            .where(eq(dailyActivityApprovals.id, stepId))
            .limit(1)

          if (currentStep && currentStep.status !== 'approved') {
            await db
              .update(dailyActivityApprovals)
              .set({
                signatureDataUrl: sigUrl,
                signedAt: new Date(),
                status: 'approved',
                remarks: payload.stepRemarks?.[stepId] ?? undefined,
              })
              .where(eq(dailyActivityApprovals.id, stepId))

            // Unlock next step
            const [nextStep] = await db
              .select()
              .from(dailyActivityApprovals)
              .where(
                and(
                  eq(dailyActivityApprovals.sessionId, payload.sessionId),
                  sql`${dailyActivityApprovals.stepOrder} > ${currentStep.stepOrder}`
                )
              )
              .orderBy(asc(dailyActivityApprovals.stepOrder))
              .limit(1)

            const shouldFinalize = !nextStep || currentStep.stepOrder >= 2

            if (!shouldFinalize && nextStep) {
              if (nextStep.status !== 'approved') {
                await db
                  .update(dailyActivityApprovals)
                  .set({ status: 'pending' })
                  .where(eq(dailyActivityApprovals.id, nextStep.id))

                if (nextStep.approverEmail) {
                  void sendDailyActivityStepApprovalEmail({
                    sessionId: payload.sessionId,
                    sessionCode: session?.sessionCode || `ACT-${payload.sessionId}`,
                    employeeName: sessionEmployee?.name || 'Karyawan',
                    workDate: session?.workDate,
                    siteName: siteRow?.name || '-',
                    approverName: nextStep.approverName || 'Approver',
                    approverEmail: nextStep.approverEmail,
                    approvalStep: nextStep.stepLabel,
                    approvalToken: nextStep.approvalToken,
                  }).catch(err => {
                    console.error('[saveDailyActivityApprovalForm] Non-blocking step approval email error:', err)
                  })
                }
              }
            } else {
              // Auto-approve any remaining steps with signature & timestamp
              await db
                .update(dailyActivityApprovals)
                .set({
                  status: 'approved',
                  signatureDataUrl: sigUrl,
                  signedAt: new Date(),
                })
                .where(
                  and(
                    eq(dailyActivityApprovals.sessionId, payload.sessionId),
                    sql`${dailyActivityApprovals.stepOrder} > ${currentStep.stepOrder}`
                  )
                )

              // Final Step (Step 2 Leader / PJO) approved
              await db
                .update(dailyActivitySessions)
                .set({ status: 'approved', approvedAt: new Date(), updatedAt: new Date() })
                .where(eq(dailyActivitySessions.id, payload.sessionId))

              if (sessionEmployee?.email) {
                void sendDailyActivityCompletedEmail({
                  sessionId: payload.sessionId,
                  sessionCode: session?.sessionCode || `ACT-${payload.sessionId}`,
                  employeeName: sessionEmployee.name || 'Karyawan',
                  employeeEmail: sessionEmployee.email,
                  workDate: session?.workDate,
                }).catch(err => {
                  console.error('[saveDailyActivityApprovalForm] Non-blocking completed email error:', err)
                })
              }
            }
          }
        }
      }
    }

    safeRevalidatePath(`/mobile/activity`)
    safeRevalidatePath(`/dashboard/activity-hub`)
    safeRevalidatePath(`/dashboard/approval`)

    return { success: true as const }
  } catch (error: any) {
    console.error('Error saving daily activity approval form:', error)
    return { success: false as const, error: error.message || 'Gagal menyimpan form.' }
  }
}

export async function resubmitDailyActivityApprovalFormAction(payload: Parameters<typeof saveDailyActivityApprovalForm>[0]) {
  return saveDailyActivityApprovalForm(payload)
}

export async function generateTestDailyActivityApproval() {
  try {
    let currentEmployee: { id: number; name: string; email: string; siteId: number | null } | null = null
    try {
      currentEmployee = await getAuthenticatedEmployeeContext()
    } catch {
      // Fallback for background test execution
    }

    if (!currentEmployee) {
      const [fallbackEmp] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email, siteId: employees.siteId })
        .from(employees)
        .where(eq(employees.isActive, true))
        .limit(1)
      if (!fallbackEmp) throw new Error('Employee record tidak ditemukan.')
      currentEmployee = fallbackEmp
    }

    const baseUrl = getPublicAppUrl()
    const testEmail = currentEmployee.email || 'admin@chitraparatama.co.id'

    // Always create a new fresh test session
    const [newSession] = await db
      .insert(dailyActivitySessions)
      .values({
        employeeId: currentEmployee.id,
        siteId: currentEmployee.siteId ?? 1,
        sessionCode: `DAS-TEST-${Date.now().toString().slice(-6)}`,
        workDate: new Date(),
        shiftCode: 'NS',
        status: 'submitted',
        submittedAt: new Date(),
      })
      .returning({ id: dailyActivitySessions.id })

    const testSessionId = newSession.id

    // Insert sample item
    await db.insert(dailyActivitySessionItems).values({
      sessionId: testSessionId,
      snapshotLabel: 'Pemeriksaan Rutin Workshop (TEST)',
      snapshotGroupName: 'Technical',
      unitNumber: 'WS-01',
      actualPoints: 10,
      isChecked: true,
      sortOrder: 1,
      remark: 'Pemeriksaan operasional harian selesai sesuai SOP (Test Approval).',
    })

    const workflowSettings = await getDailyActivityWorkflowSettings()

    // Resolve Section Head name from workflow settings matrix
    const empSectionLower = ((currentEmployee as any).section || '').trim().toLowerCase()
    const empDeptLower = ((currentEmployee as any).department || '').trim().toLowerCase()

    const matchedSecConfig = (workflowSettings.approvalMatrix.sectionHeads || []).find((sh) => {
      const secLower = (sh.section || '').trim().toLowerCase()
      return (
        secLower &&
        (secLower === empSectionLower ||
          empSectionLower.includes(secLower) ||
          secLower.includes(empSectionLower) ||
          secLower === empDeptLower)
      )
    })

    const sectionHeadName = matchedSecConfig?.name || 'Section Head'
    const sectionHeadEmail = matchedSecConfig?.email || testEmail

    const steps = [
      {
        stepOrder: 1,
        stepLabel: 'Karyawan Sign',
        approverRole: 'employee',
        name: currentEmployee.name,
        email: currentEmployee.email || testEmail,
      },
      {
        stepOrder: 2,
        stepLabel: 'Leader / PJO',
        approverRole: 'leader',
        name: 'Leader Operasional',
        email: testEmail,
      },
      {
        stepOrder: 3,
        stepLabel: 'Section Head',
        approverRole: 'section_head',
        name: sectionHeadName,
        email: sectionHeadEmail,
      },
    ]

    const links: Array<{ step: number; role: string; name: string; url: string }> = []

    for (const s of steps) {
      const token = randomUUID()
      await db.insert(dailyActivityApprovals).values({
        sessionId: testSessionId,
        stepOrder: s.stepOrder,
        stepLabel: s.stepLabel,
        approvalToken: token,
        approverName: s.name,
        approverEmail: s.email,
        approverRole: s.approverRole,
        status: s.stepOrder === 1 ? 'pending' : 'waiting',
        createdAt: new Date(),
      })

      links.push({
        step: s.stepOrder,
        role: s.stepLabel,
        name: s.name,
        url: `${baseUrl}/dashboard/activity-hub/document/${testSessionId}/approval`,
      })
    }

    // Send test email notification for Step 1
    const firstStepUrl = links[0]?.url || `${baseUrl}/dashboard/activity-hub/document/${testSessionId}/approval`
    try {
      await sendWorkflowEmail({
        to: currentEmployee.email || 'admin@chitraparatama.co.id',
        templateCode: 'daily_activity_test_notification',
        templateName: 'Daily Activity Test Approval Notification',
        fallbackSubject: `[TEST APPROVAL] Daily Activity Report - ${currentEmployee.name}`,
        fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
  <div style="background:linear-gradient(135deg,#0f172a,#0d9488);padding:24px;border-radius:10px 10px 0 0">
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
    <p style="color:#ccfbf1;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Daily Activity Hub • Test Approval</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
    <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Halo <strong>${currentEmployee.name}</strong>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
      Test Approval Daily Activity Report telah dibuat untuk verifikasi alur multi-level approval & tanda tangan elektronik.
    </p>
    <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin-bottom:24px;border-left:4px solid #0d9488">
      <table cellpadding="4" cellspacing="0" width="100%" style="font-size:13px;color:#334155">
        <tr><td width="140" style="color:#64748b">Kode Sesi:</td><td><strong>DAS-${testSessionId}</strong></td></tr>
        <tr><td style="color:#64748b">Karyawan:</td><td>${currentEmployee.name}</td></tr>
        <tr><td style="color:#64748b">Tahap Pertama:</td><td style="color:#0f766e;font-weight:bold">Karyawan Sign</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:28px 0">
      <a href="${firstStepUrl}" style="background:#0d9488;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Buka Approval Form</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;margin:24px 0 0;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:16px">
      Email ini dikirim secara otomatis oleh Sistem HERO PT Chitra Paratama untuk keperluan Test Approval.
    </p>
  </div>
</div>
        `,
        fallbackText: `Halo ${currentEmployee.name},\n\nTest Approval Daily Activity Report telah dibuat.\n\nSilakan buka tautan berikut untuk menyetujui dan menandatangani:\n${firstStepUrl}\n\nHormat kami,\nPT Chitra Paratama`,
        variables: {
          employeeName: currentEmployee.name,
          requesterName: currentEmployee.name,
          targetApproverName: currentEmployee.name,
          approverName: 'Test Approver',
          managerName: 'Test Manager',
          sessionCode: `DAS-${testSessionId}`,
          splNumber: `DAS-${testSessionId}`,
          permitNumber: `DAS-${testSessionId}`,
          title: 'Pemeriksaan Rutin Workshop (TEST)',
          approvalStep: 'Karyawan Sign',
          approvalLink: firstStepUrl,
          viewLink: firstStepUrl,
          workDate: new Date().toLocaleDateString('id-ID'),
          siteName: 'Site Operasional Test',
          remarks: 'Test approval execution',
          revertReason: 'Test revert execution',
        },
      })
    } catch (mailErr) {
      console.warn('Non-blocking test email error:', mailErr)
    }

    try {
      safeRevalidatePath(`/dashboard/activity-hub/approval`)
      safeRevalidatePath(`/dashboard/activity-hub/document/${testSessionId}/approval`)
    } catch {}

    return {
      success: true as const,
      message: 'Test workflow executed successfully!',
      data: {
        employee: currentEmployee.name,
        sessionId: testSessionId,
        links,
      },
    }
  } catch (error: any) {
    console.error('Error generating test daily activity approval:', error)
    return { success: false as const, message: error instanceof Error ? error.message : 'Unknown error occurred', error: error.message || 'Gagal membuat test approval.' }
  }
}

export async function sendDueDailyActivityReminders() {
  try {
    const baseUrl = getAppUrl()
    const pendingApprovals = await db
      .select({
        approvalId: dailyActivityApprovals.id,
        sessionId: dailyActivityApprovals.sessionId,
        token: dailyActivityApprovals.approvalToken,
        stepLabel: dailyActivityApprovals.stepLabel,
        stepOrder: dailyActivityApprovals.stepOrder,
        approverName: dailyActivityApprovals.approverName,
        approverEmail: dailyActivityApprovals.approverEmail,
        employeeName: employees.name,
        sessionCode: dailyActivitySessions.sessionCode,
      })
      .from(dailyActivityApprovals)
      .innerJoin(
        dailyActivitySessions,
        eq(dailyActivityApprovals.sessionId, dailyActivitySessions.id)
      )
      .innerJoin(employees, eq(dailyActivitySessions.employeeId, employees.id))
      .where(eq(dailyActivityApprovals.status, 'pending'))
      .limit(50)

    let sent = 0
    let skipped = 0

    for (const pending of pendingApprovals) {
      const recipientEmail = pending.approverEmail?.trim() || ''
      if (!recipientEmail) {
        skipped++
        continue
      }
      const approvalLink = `${baseUrl}/review/daily-activity/${pending.token}`

      await sendWorkflowEmail({
        to: recipientEmail,
        templateCode: 'daily_activity_approval_reminder',
        variables: {
          recipientName: pending.approverName || 'Approver',
          approverName: pending.approverName || 'Approver',
          employeeName: pending.employeeName,
          sessionCode: pending.sessionCode,
          stepLabel: pending.stepLabel,
          approvalLink,
        },
        fallbackSubject: `[REMINDER] Persetujuan Daily Activity - ${pending.employeeName} (${pending.sessionCode})`,
        fallbackText: `Halo ${pending.approverName},\n\nIni adalah pengingat persetujuan Daily Activity ${pending.employeeName} (${pending.sessionCode}) pada tahap ${pending.stepLabel}.\n\nSilakan review dan tanda tangani melalui tautan berikut:\n${approvalLink}\n\nTerima kasih.`,
        fallbackHtml: `
          <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
              <span style="background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 9999px; text-transform: uppercase;">Daily Activity Reminder</span>
            </div>
            <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 12px; color: #0f172a;">Pengingat Persetujuan Daily Activity</h2>
            <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-bottom: 16px;">
              Halo <strong>${pending.approverName}</strong>,<br/>
              Pengajuan Daily Activity untuk <strong>${pending.employeeName}</strong> (${pending.sessionCode}) masih menunggu persetujuan Anda pada tahap <strong>${pending.stepLabel}</strong>.
            </p>
            <div style="margin: 24px 0;">
              <a href="${approvalLink}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: bold; border-radius: 8px; text-decoration: none;">
                Review & Setujui Sekarang
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
              Jika tombol di atas tidak dapat diklik, salin dan buka tautan berikut di browser Anda:<br/>
              <a href="${approvalLink}" style="color: #0f766e;">${approvalLink}</a>
            </p>
          </div>
        `,
      })

      await notifyWorkflowBellRecipients({
        recipientEmails: [recipientEmail],
        eventType: 'daily_activity_reminder',
        category: 'approval_requests',
        title: `Reminder Approval: ${pending.employeeName} (${pending.sessionCode})`,
        body: `Mohon segera lakukan approval untuk tahap ${pending.stepLabel}.`,
        url: approvalLink,
        tagPrefix: 'daily-activity-reminder',
        metadata: {
          sessionId: pending.sessionId,
          approvalId: pending.approvalId,
          stepOrder: pending.stepOrder,
        },
      })

      sent++
    }

    try {
      safeRevalidatePath(`/dashboard/activity-hub/approval`)
      safeRevalidatePath(`/dashboard/approval`)
    } catch {}

    return { success: true as const, sent, skipped }
  } catch (error: any) {
    console.error('Error sending daily activity reminders:', error)
    return { success: false as const, error: error.message || 'Gagal mengirim reminder.' }
  }
}

export async function deleteDailyActivitySessionAction(sessionId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const emp = await getCurrentEmployee()
    if (!emp) {
      throw new Error('Sesi login tidak ditemukan.')
    }

    const [sessionRecord] = await db
      .select()
      .from(dailyActivitySessions)
      .where(eq(dailyActivitySessions.id, sessionId))
      .limit(1)

    if (!sessionRecord) {
      throw new Error('Sesi tidak ditemukan.')
    }

    // Delete signoffs, approvals, items and the session record
    await db.delete(dailyActivitySessionSignoffs).where(eq(dailyActivitySessionSignoffs.sessionId, sessionId))
    await db.delete(dailyActivityApprovals).where(eq(dailyActivityApprovals.sessionId, sessionId))
    await db.delete(dailyActivitySessionItems).where(eq(dailyActivitySessionItems.sessionId, sessionId))
    await db.delete(dailyActivitySessions).where(eq(dailyActivitySessions.id, sessionId))

    safeRevalidatePath('/dashboard/activity-hub/approval')
    safeRevalidatePath('/dashboard/activity-hub/my-day')
    safeRevalidatePath('/dashboard/approval')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting daily activity session:', error)
    return { success: false, error: error.message || 'Gagal menghapus sesi.' }
  }
}

export async function deleteBatchDailyActivitySessionsAction(
  sessionIds: number[]
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    const emp = await getCurrentEmployee()
    if (!emp) {
      throw new Error('Sesi login tidak ditemukan.')
    }

    const validIds = (sessionIds || []).filter((id) => Number.isFinite(id) && id > 0)
    if (validIds.length === 0) {
      return { success: true, deletedCount: 0 }
    }

    // Delete signoffs, approvals, items and the session records in batch
    await db.delete(dailyActivitySessionSignoffs).where(inArray(dailyActivitySessionSignoffs.sessionId, validIds))
    await db.delete(dailyActivityApprovals).where(inArray(dailyActivityApprovals.sessionId, validIds))
    await db.delete(dailyActivitySessionItems).where(inArray(dailyActivitySessionItems.sessionId, validIds))
    await db.delete(dailyActivitySessions).where(inArray(dailyActivitySessions.id, validIds))

    safeRevalidatePath('/dashboard/activity-hub/approval')
    safeRevalidatePath('/dashboard/activity-hub/my-day')
    safeRevalidatePath('/dashboard/approval')
    return { success: true, deletedCount: validIds.length }
  } catch (error: any) {
    console.error('Error batch deleting daily activity sessions:', error)
    return { success: false, error: error.message || 'Gagal menghapus sesi batch.' }
  }
}

export async function getDailyActivityApproverCandidatesAction() {
  try {
    const rows = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        employeeSn: employees.employeeSn,
        position: employees.jobTitle,
        role: employees.role,
        department: masterDepartments.name,
        section: masterSections.name,
        siteName: sites.name,
        siteId: employees.siteId,
      })
      .from(employees)
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name))

    return {
      success: true as const,
      data: rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        employeeSn: r.employeeSn,
        position: r.position || r.role || 'Staff',
        department: r.department || '',
        section: r.section || '',
        siteName: r.siteName || '',
        siteId: r.siteId,
        label: `${r.name.toUpperCase()} — ${(r.position || r.role || 'STAFF').toUpperCase()}${r.siteName ? ` [${r.siteName.toUpperCase()}]` : ''}`,
      })),
    }
  } catch (err: any) {
    console.error('getDailyActivityApproverCandidatesAction error:', err)
    return { success: false as const, error: err?.message || 'Gagal memuat kandidat approver.' }
  }
}

export async function createDailyActivitySessionAction(input: {
  employeeId: number
  workDate: string
  shiftCode: string
  submissionSource?: 'assigned' | 'self_input' | 'custom' | null
  siteId?: number | null
  customerName?: string | null
  notes?: string | null
  summaryRemark?: string | null
  leaderEmployeeId?: number | null
  leaderName?: string | null
  superiorEmployeeId?: number | null
  superiorName?: string | null
  managerEmployeeId?: number | null
  managerName?: string | null
  teamMemberEmployeeIds?: number[]
  additionalApprovers?: Array<{
    employeeId: number
    name?: string
    role?: string
    stepLabel?: string
  }>
  items?: Array<{
    label: string
    group?: string
    libraryActivityId?: number | null
    routeItemId?: number | null
    overtimeCommandLetterItemId?: number | null
    unitNumber?: string
    startedAt?: string | Date
    endedAt?: string | Date
    duration?: string
    points?: number
    remark?: string
    materialUsed?: string
    tireCount?: number
    photoUrl?: string | null
    photos?: string[]
  }>
  existingDraftSessionId?: number | null
}) {
  try {
    let targetEmpId = Number(input.employeeId)
    if (!targetEmpId) {
      const context = await getAuthenticatedEmployeeContext()
      targetEmpId = context.id
    }

    const teamMemberIds = Array.from(
      new Set(
        (input.teamMemberEmployeeIds || [])
          .map((id) => Number(id))
          .filter((id) => id && !isNaN(id) && id !== targetEmpId)
      )
    )
    const allEmployeeIds = [targetEmpId, ...teamMemberIds]

    const allEmps = await db
      .select()
      .from(employees)
      .where(inArray(employees.id, allEmployeeIds))

    const primaryEmp = allEmps.find((e) => e.id === targetEmpId)
    if (!primaryEmp) {
      return { success: false as const, error: 'Karyawan tidak ditemukan.' }
    }

    if (allEmps.length !== allEmployeeIds.length) {
      const missingIds = allEmployeeIds.filter((id) => !allEmps.some((employee) => employee.id === id))
      return {
        success: false as const,
        error: `Anggota tim tidak ditemukan: ${missingIds.join(', ')}.`,
      }
    }

    const workflowSettings = await getDailyActivityWorkflowSettings()
    let primaryCreatedSessionId: number | null = null

    if (!input.workDate || !String(input.workDate).trim()) {
      return { success: false as const, error: 'Tanggal kerja wajib diisi.' }
    }
    if (!input.items || input.items.length === 0) {
      return { success: false as const, error: 'Minimal 1 aktivitas wajib diisi.' }
    }
    for (let i = 0; i < input.items.length; i++) {
      const it = input.items[i]
      if (!it.unitNumber || !it.unitNumber.trim()) {
        it.unitNumber = '-'
      }
      if (!it.remark || !it.remark.trim()) {
        it.remark = '-'
      }
    }

    const libIds = input.items
      .map((it) => (it.libraryActivityId ? Number(it.libraryActivityId) : null))
      .filter((id): id is number => id != null && !isNaN(id))

    if (libIds.length > 0) {
      const libRows = await db
        .select({
          id: activityLibraries.id,
          activityCode: activityLibraries.activityCode,
          activityName: activityLibraries.activityName,
          requiresPhoto: activityLibraries.requiresPhoto,
          requiresEquipmentNo: activityLibraries.requiresEquipmentNo,
          requiresDuration: activityLibraries.requiresDuration,
          requiresMaterialUsed: activityLibraries.requiresMaterialUsed,
          requiresLocationGps: activityLibraries.requiresLocationGps,
          requiresTireCount: activityLibraries.requiresTireCount,
        })
        .from(activityLibraries)
        .where(inArray(activityLibraries.id, libIds))

      const libMap = new Map(libRows.map((r) => [r.id, r]))

      for (const it of input.items) {
        if (!it.libraryActivityId) continue
        const lib = libMap.get(Number(it.libraryActivityId))
        if (!lib) continue

        const label = `${lib.activityCode} - ${lib.activityName}`

        if (lib.requiresEquipmentNo && (!it.unitNumber || !it.unitNumber.trim() || it.unitNumber.trim() === '-')) {
          return { success: false as const, error: `Nomor Equipment / Unit wajib diisi untuk "${label}".` }
        }
        if (lib.requiresMaterialUsed && (!it.materialUsed || !it.materialUsed.trim())) {
          return { success: false as const, error: `Material used wajib diisi untuk "${label}".` }
        }
        if (lib.requiresTireCount && (!it.tireCount || Number(it.tireCount) < 1)) {
          return { success: false as const, error: `Jumlah pcs / qty wajib diisi (minimal 1) untuk "${label}".` }
        }
        if (lib.requiresDuration !== false && (!it.startedAt || !it.endedAt)) {
          return { success: false as const, error: `Durasi waktu mulai dan selesai wajib diisi untuk "${label}".` }
        }
      }
    }

    if (!primaryEmp.signatureDataUrl) {
      return {
        success: false as const,
        error: 'Tanda tangan digital pemohon belum terdaftar. Silakan buat/daftarkan tanda tangan terlebih dahulu di menu Profil atau form tanda tangan.',
      }
    }

    // Create ONE session and approval flow for the team DAR submission
    const emp = primaryEmp
    let siteId = input.siteId || emp.siteId
    if (!siteId) {
      const [firstSite] = await db.select({ id: sites.id }).from(sites).limit(1)
      siteId = firstSite?.id || 1
    }

    if (input.customerName && input.customerName.trim() && siteId) {
      const cleanCust = input.customerName
        .replace(/\s*\|\s*\[Team:\s*[^\]]+\]/gi, '')
        .replace(/\s*\[Team:\s*[^\]]+\]/gi, '')
        .replace(/\s*\|\s*$/, '')
        .trim()
      if (cleanCust) {
        await db
          .update(sites)
          .set({ customerName: cleanCust })
          .where(eq(sites.id, siteId))
      }
    }

    const dateFormatted = input.workDate
      ? input.workDate.replace(/-/g, '')
      : new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const sessionCode = `DAS-${dateFormatted}-${emp.employeeSn || emp.id}-${Math.floor(100 + Math.random() * 900)}`

    const parsedWorkDate = input.workDate
      ? new Date(`${input.workDate}T00:00:00.000Z`)
      : new Date()

    // Anti-double-click guard (10 seconds window) to prevent rapid accidental double-submits
    const tenSecondsAgo = new Date(Date.now() - 10000)
    const [recentDoubleSubmit] = await db
      .select({ id: dailyActivitySessions.id, sessionCode: dailyActivitySessions.sessionCode })
      .from(dailyActivitySessions)
      .where(
        and(
          eq(dailyActivitySessions.employeeId, targetEmpId),
          eq(dailyActivitySessions.workDate, parsedWorkDate),
          gte(dailyActivitySessions.createdAt, tenSecondsAgo)
        )
      )
      .limit(1)

    if (recentDoubleSubmit) {
      return {
        success: false as const,
        error: `Laporan aktivitas sedang diproses. Mohon tunggu beberapa saat sebelum mengirim ulang.`,
        existingSessionId: recentDoubleSubmit.id,
      }
    }

    // Parallelize dept/section/position validation — was 3 serial round-trips, now 1 batch
    const [deptRows, secRows, posRows] = await Promise.all([
      emp.departmentId
        ? db.select({ id: masterDepartments.id }).from(masterDepartments).where(eq(masterDepartments.id, emp.departmentId)).limit(1)
        : Promise.resolve([] as Array<{ id: number }>),
      emp.sectionId
        ? db.select({ id: masterSections.id }).from(masterSections).where(eq(masterSections.id, emp.sectionId)).limit(1)
        : Promise.resolve([] as Array<{ id: number }>),
      emp.positionId
        ? db.select({ id: masterPositions.id }).from(masterPositions).where(eq(masterPositions.id, emp.positionId)).limit(1)
        : Promise.resolve([] as Array<{ id: number }>),
    ])
    const validDeptId: number | null = deptRows[0]?.id ?? null
    const validSecId: number | null = secRows[0]?.id ?? null
    const validPosId: number | null = posRows[0]?.id ?? null

    const otherTeamNames = allEmps
      .filter((e) => e.id !== emp.id)
      .map((e) => e.name)
      .filter(Boolean)
      .join(', ')

    let finalSummary = (input.summaryRemark || input.notes || '').trim()
    if (otherTeamNames.length > 0 && !finalSummary.includes('[Team:')) {
      finalSummary = finalSummary
        ? `${finalSummary} | [Team: ${otherTeamNames}]`
        : `[Team: ${otherTeamNames}]`
    }

    const resolvedSubmissionSource =
      input.submissionSource ||
      (input.items && input.items.some((it) => it.routeItemId || it.overtimeCommandLetterItemId)
        ? 'route'
        : input.items && input.items.some((it) => it.libraryActivityId)
          ? 'self_input'
          : 'custom')

    const [created] = await db
      .insert(dailyActivitySessions)
      .values({
        employeeId: emp.id,
        sessionCode,
        workDate: parsedWorkDate,
        shiftCode: input.shiftCode || 'ALL',
        siteId,
        departmentId: validDeptId,
        sectionId: validSecId,
        positionId: validPosId,
        status: 'submitted',
        submissionSource: resolvedSubmissionSource,
        summaryRemark: finalSummary,
        submittedAt: new Date(),
      })
      .returning()

    primaryCreatedSessionId = created.id

    // Insert team members if provided
    if (teamMemberIds.length > 0) {
      const teamRows = teamMemberIds.map((mId) => ({
        sessionId: created.id,
        employeeId: mId,
      }))
      await db.insert(dailyActivitySessionTeamMembers).values(teamRows).onConflictDoNothing()
    }

    // Clean up previous server draft session if this submission originated from a draft
    if (input.existingDraftSessionId) {
      try {
        const draftIdNum = Number(input.existingDraftSessionId)
        if (!isNaN(draftIdNum) && draftIdNum > 0 && draftIdNum !== created.id) {
          await db
            .delete(dailyActivitySessionItems)
            .where(eq(dailyActivitySessionItems.sessionId, draftIdNum))
          await db
            .delete(dailyActivitySessions)
            .where(
              and(
                eq(dailyActivitySessions.id, draftIdNum),
                eq(dailyActivitySessions.employeeId, emp.id),
                eq(dailyActivitySessions.status, 'draft')
              )
            )
        }
      } catch (cleanDraftErr) {
        console.warn('Failed to clean up draft session on createDailyActivitySessionAction:', cleanDraftErr)
      }
    }

    // Insert activity items if provided
    if (input.items && input.items.length > 0) {
      const itemsToInsert = input.items
        .filter((it) => it.label && it.label.trim().length > 0)
        .map((it, idx) => {
          const startedAtDate = it.startedAt
            ? it.startedAt instanceof Date
              ? it.startedAt
              : new Date(it.startedAt)
            : new Date(parsedWorkDate.getTime() + 8 * 3600000)
          const endedAtDate = it.endedAt
            ? it.endedAt instanceof Date
              ? it.endedAt
              : new Date(it.endedAt)
            : new Date(parsedWorkDate.getTime() + 9 * 3600000)

          return {
            sessionId: created.id,
            snapshotLabel: it.label.trim(),
            snapshotGroupName: it.group || 'Technical',
            libraryActivityId: it.libraryActivityId ? Number(it.libraryActivityId) : null,
            routeItemId: it.routeItemId ? Number(it.routeItemId) : null,
            overtimeCommandLetterItemId: it.overtimeCommandLetterItemId
              ? Number(it.overtimeCommandLetterItemId)
              : null,
            unitNumber: it.unitNumber?.trim() || '',
            remark: it.remark?.trim() || '',
            actualPoints: Number(it.points) || 5,
            tireCount: Number(it.tireCount) || 0,
            isChecked: true,
            sortOrder: idx + 1,
            snapshotPayload: JSON.stringify({
              duration: it.duration || '60m',
              materialUsed: it.materialUsed || '',
              tireCount: Number(it.tireCount) || 0,
              photoUrl: it.photoUrl || null,
              photos: it.photos || [],
            }),
            startedAt: startedAtDate,
            endedAt: endedAtDate,
          }
        })

      if (itemsToInsert.length > 0) {
        await db.insert(dailyActivitySessionItems).values(itemsToInsert)
      }
    }

    // 1. Resolve Leader
    let leaderEmpId = input.leaderEmployeeId
    let leaderName = input.leaderName
    let leaderEmail = ''

    if (leaderEmpId) {
      const [found] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email })
        .from(employees)
        .where(and(eq(employees.id, leaderEmpId), eq(employees.isActive, true)))
        .limit(1)
      if (found) {
        leaderName = found.name
        leaderEmail = found.email || ''
      } else {
        leaderEmpId = null
        leaderName = undefined
      }
    }

    // Resolusi PJO / Head Location dari Master Data Location (sites.headEmployeeId)
    const effectiveSiteId = siteId || emp.siteId
    if (!leaderEmpId && effectiveSiteId) {
      const [siteHead] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email })
        .from(sites)
        .innerJoin(employees, and(eq(employees.id, sites.headEmployeeId), eq(employees.isActive, true)))
        .where(eq(sites.id, effectiveSiteId))
        .limit(1)
      if (siteHead) {
        leaderEmpId = siteHead.id
        leaderName = siteHead.name
        leaderEmail = siteHead.email || ''
      }
    }

    if (!leaderEmpId && emp.directManagerId) {
      const [found] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email })
        .from(employees)
        .where(and(eq(employees.id, emp.directManagerId), eq(employees.isActive, true)))
        .limit(1)
      if (found) {
        leaderEmpId = found.id
        leaderName = found.name
        leaderEmail = found.email || ''
      }
    }

    if (!leaderEmpId && !leaderEmail) {
      if (emp.sectionId) {
        const [secLeader] = await db
          .select({ id: employees.id, name: employees.name, email: employees.email })
          .from(employees)
          .where(
            and(
              eq(employees.sectionId, emp.sectionId),
              eq(employees.isActive, true),
              or(
                sql`LOWER(${employees.jobTitle}) LIKE '%leader%'`,
                sql`LOWER(${employees.jobTitle}) LIKE '%supervisor%'`,
                sql`LOWER(${employees.role}) LIKE '%leader%'`,
                sql`LOWER(${employees.role}) LIKE '%admin%'`
              )
            )
          )
          .limit(1)
        if (secLeader) {
          leaderEmpId = secLeader.id
          leaderName = secLeader.name
          leaderEmail = secLeader.email || ''
        }
      }
      if (!leaderEmpId && emp.siteId) {
        const [siteLeader] = await db
          .select({ id: employees.id, name: employees.name, email: employees.email })
          .from(employees)
          .where(
            and(
              eq(employees.siteId, emp.siteId),
              eq(employees.isActive, true),
              or(
                sql`LOWER(${employees.jobTitle}) LIKE '%leader%'`,
                sql`LOWER(${employees.jobTitle}) LIKE '%pjo%'`,
                sql`LOWER(${employees.jobTitle}) LIKE '%admin%'`,
                sql`LOWER(${employees.role}) LIKE '%admin%'`
              )
            )
          )
          .limit(1)
        if (siteLeader) {
          leaderEmpId = siteLeader.id
          leaderName = siteLeader.name
          leaderEmail = siteLeader.email || ''
        }
      }
    }

    if (!leaderName) {
      leaderName = 'Leader / PJO Site'
    }

    // 2. Resolve Section Head (Superior)
    let superiorEmpId = input.superiorEmployeeId
    let superiorName = input.superiorName
    let superiorEmail = ''

    if (superiorEmpId) {
      const [found] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email })
        .from(employees)
        .where(eq(employees.id, superiorEmpId))
        .limit(1)
      if (found) {
        superiorName = found.name
        superiorEmail = found.email || ''
      }
    } else {
      const empSectionLower = (emp.section || '').trim().toLowerCase()
      const empDeptLower = (emp.department || '').trim().toLowerCase()

      const matchedSecConfig = (workflowSettings.approvalMatrix.sectionHeads || []).find((sh) => {
        const secLower = (sh.section || '').trim().toLowerCase()
        return (
          secLower &&
          (secLower === empSectionLower ||
            empSectionLower.includes(secLower) ||
            secLower.includes(empSectionLower) ||
            secLower === empDeptLower)
        )
      })

      if (matchedSecConfig?.name) {
        superiorName = matchedSecConfig.name
        superiorEmail = matchedSecConfig.email || ''
        if (matchedSecConfig.email) {
          const [matEmp] = await db
            .select({ id: employees.id })
            .from(employees)
            .where(
              sql`LOWER(TRIM(${employees.email})) = ${matchedSecConfig.email.trim().toLowerCase()}`
            )
            .limit(1)
          if (matEmp) superiorEmpId = matEmp.id
        }
      } else if (emp.sectionId) {
        const [secRow] = await db
          .select({ headEmployeeId: masterSections.headEmployeeId })
          .from(masterSections)
          .where(eq(masterSections.id, emp.sectionId))
          .limit(1)
        if (secRow?.headEmployeeId) {
          const [headEmp] = await db
            .select({ id: employees.id, name: employees.name, email: employees.email })
            .from(employees)
            .where(eq(employees.id, secRow.headEmployeeId))
            .limit(1)
          if (headEmp) {
            superiorEmpId = headEmp.id
            superiorName = headEmp.name
            superiorEmail = headEmp.email || ''
          }
        }
      }
    }
    if (!superiorName) {
      superiorName = 'Section Head'
    }

    const step1Token = randomUUID()
    const step2Token = randomUUID()
    const step3Token = randomUUID()

    // Generate sequential approval steps:
    // Generate sequential approval steps:
    // Step 1: Karyawan Sign (pending signature by employee)
    // Step 2: Leader / PJO (waiting for Step 1 approval)
    const now = new Date()

    const approvalStepsToInsert: any[] = [
      {
        sessionId: created.id,
        stepOrder: 1,
        stepLabel: 'Karyawan Sign',
        approverRole: 'employee',
        approverEmployeeId: emp.id,
        approverName: emp.name,
        approverEmail: emp.email || '',
        status: 'approved',
        signatureDataUrl: primaryEmp.signatureDataUrl,
        signedAt: now,
        remarks: 'Auto-approved oleh pemohon saat submit Daily Activity.',
        approvalToken: step1Token,
        createdAt: now,
      },
      {
        sessionId: created.id,
        stepOrder: 2,
        stepLabel: 'Leader / PJO',
        approverRole: 'leader',
        approverEmployeeId: leaderEmpId ?? null,
        approverName: leaderName,
        approverEmail: leaderEmail,
        status: 'pending',
        approvalToken: step2Token,
        createdAt: now,
      },
    ]

    if (input.additionalApprovers && Array.isArray(input.additionalApprovers) && input.additionalApprovers.length > 0) {
      const extraEmpIds = Array.from(new Set(input.additionalApprovers.map((a) => Number(a.employeeId)).filter(Boolean)))
      const extraEmps = extraEmpIds.length > 0
        ? await db
            .select({ id: employees.id, name: employees.name, email: employees.email })
            .from(employees)
            .where(inArray(employees.id, extraEmpIds))
        : []
      const extraMap = new Map(extraEmps.map((e) => [e.id, e]))

      let startOrder = 3
      for (const extra of input.additionalApprovers) {
        const extraEmpId = Number(extra.employeeId)
        if (!extraEmpId) continue
        const found = extraMap.get(extraEmpId)
        approvalStepsToInsert.push({
          sessionId: created.id,
          stepOrder: startOrder,
          stepLabel: extra.stepLabel || `Approver Tambahan (Tahap ${startOrder})`,
          approverRole: extra.role || 'additional_approver',
          approverEmployeeId: extraEmpId,
          approverName: found?.name || extra.name || 'Approver Tambahan',
          approverEmail: found?.email || '',
          status: 'waiting',
          approvalToken: randomUUID(),
          createdAt: now,
        })
        startOrder++
      }
    }

    await db.insert(dailyActivityApprovals).values(approvalStepsToInsert)

    // Send Step 2 email to Leader / PJO
    if (leaderEmail) {
      const [siteRow] = siteId
        ? await db.select({ name: sites.name }).from(sites).where(eq(sites.id, siteId)).limit(1)
        : []

      void sendDailyActivityStepApprovalEmail({
        sessionId: created.id,
        sessionCode: created.sessionCode || `ACT-${created.id}`,
        employeeName: emp.name || 'Karyawan',
        workDate: parsedWorkDate,
        siteName: siteRow?.name || '-',
        approverName: leaderName,
        approverEmail: leaderEmail,
        approvalStep: 'Leader / PJO',
        approvalToken: step2Token,
      }).catch((emailErr) => {
        console.error('Error sending step 2 approval email to leader:', emailErr)
      })
    }

    // Send in-app notification to Leader & submitter & team members — fire all in parallel
    try {
      const notificationJobs: Promise<any>[] = []

      if (leaderEmail) {
        notificationJobs.push(publishInAppApprovalNotification({
          recipientEmail: leaderEmail,
          title: `Daily Activity Menunggu Approval: ${created.sessionCode}`,
          body: `Laporan aktivitas harian dari ${emp.name} telah diajukan dan menunggu persetujuan Anda.`,
          url: `/dashboard/approval`,
          eventType: 'daily_activity_submitted',
        }))
      }

      if (emp.email) {
        notificationJobs.push(publishInAppApprovalNotification({
          recipientEmail: emp.email,
          title: `Daily Activity Diajukan: ${created.sessionCode}`,
          body: `Laporan aktivitas harian Anda berhasil diajukan dan diteruskan ke ${leaderName} untuk persetujuan.`,
          url: `/dashboard/approval`,
          eventType: 'daily_activity_submitted',
        }))
      }

      // Notify other team members if any
      for (const targetEmp of allEmps) {
        if (targetEmp.email && targetEmp.id !== emp.id) {
          notificationJobs.push(publishInAppApprovalNotification({
            recipientEmail: targetEmp.email,
            title: `Daily Activity Tim: ${created.sessionCode}`,
            body: `Laporan aktivitas tim Anda telah diajukan oleh ${emp.name} dan sedang di-review oleh ${leaderName}.`,
            url: `/mobile/activity`,
            eventType: 'daily_activity_submitted',
          }))
        }
      }

      // Notifications run after the database commit without delaying the submit response.
      void Promise.allSettled(notificationJobs).catch((notifyErr) => {
        console.warn('Non-blocking notification warning:', notifyErr)
      })
    } catch (notifyErr) {
      console.warn('Non-blocking notification warning:', notifyErr)
    }

    // Recalculate EWH for submitter and all team members in background
    (async () => {
      try {
        const { recalculateEwhForEmployee, recalculateUnitUtility } = await import('@/app/dashboard/ewh/actions')
        for (const targetEmp of allEmps) {
          await recalculateEwhForEmployee(targetEmp.id, targetEmp.siteId || siteId || 1, parsedWorkDate)
        }
        const uniqueUnits = Array.from(
          new Set(
            (input.items || [])
              .map((item) => item.unitNumber?.trim())
              .filter((unit): unit is string => typeof unit === 'string' && unit.length > 0)
          )
        )
        if (uniqueUnits.length > 0) {
          await Promise.allSettled(
            uniqueUnits.map((unit) => recalculateUnitUtility(unit, siteId || emp.siteId || 1, parsedWorkDate))
          )
        }
      } catch (ewhErr) {
        console.warn('Non-blocking EWH recalculation warning:', ewhErr)
      }
    })()

    try {
      safeRevalidatePath('/dashboard/activity-hub')
      safeRevalidatePath('/dashboard/activity-hub/my-day')
      safeRevalidatePath('/dashboard/activity-hub/approval')
      safeRevalidatePath('/dashboard/activity-hub/team-board')
      safeRevalidatePath('/dashboard/approval')
      safeRevalidatePath('/mobile')
      safeRevalidatePath('/mobile/activity')
      safeRevalidatePath('/mobile/approval')
    } catch {}

    return { success: true as const, sessionId: primaryCreatedSessionId }
  } catch (err: any) {
    console.error('Error creating daily activity session:', err)
    return { success: false as const, error: err.message || 'Gagal membuat aktivitas harian.' }
  }
}

/**
 * SERVER-SIDE DRAFT SAVE
 * Persists the DAR form payload to the database as a 'draft' session.
 * This prevents data loss when mobile browser is killed, session expires, or
 * network interruption occurs mid-form. The draft is recoverable on next visit.
 *
 * Returns the sessionId so the client can track/restore it.
 */
export async function saveActivityDraftToServerAction(input: {
  employeeId: number
  workDate: string
  shiftCode: string
  submissionSource?: 'assigned' | 'self_input' | 'custom' | null
  siteId?: number | null
  notes?: string | null
  summaryRemark?: string | null
  teamMemberEmployeeIds?: number[]
  items?: Array<{
    label: string
    group?: string
    libraryActivityId?: number | null
    unitNumber?: string
    startedAt?: string | Date
    endedAt?: string | Date
    points?: number
    remark?: string
    materialUsed?: string
    tireCount?: number
    photoUrl?: string | null
    photos?: string[]
  }>
  existingDraftSessionId?: number | null
}): Promise<{ success: true; sessionId: number } | { success: false; error: string }> {
  try {
    const context = await getAuthenticatedEmployeeContext()
    const targetEmpId = Number(input.employeeId)
    if (!targetEmpId || context.id !== targetEmpId) {
      return { success: false, error: 'Akun tidak valid untuk menyimpan draft.' }
    }

    const parsedWorkDate = input.workDate
      ? new Date(`${input.workDate}T00:00:00.000Z`)
      : new Date()

    const summaryNote = (input.summaryRemark || input.notes || '').trim()
    const resolvedSubmissionSource =
      input.submissionSource ||
      (input.items && input.items.some((it) => it.libraryActivityId) ? 'self_input' : 'custom')

    // Try to update existing draft first
    if (input.existingDraftSessionId) {
      const [existing] = await db
        .select({ id: dailyActivitySessions.id, status: dailyActivitySessions.status })
        .from(dailyActivitySessions)
        .where(
          and(
            eq(dailyActivitySessions.id, input.existingDraftSessionId),
            eq(dailyActivitySessions.employeeId, targetEmpId)
          )
        )
        .limit(1)

      if (existing && existing.status === 'draft') {
        await db
          .update(dailyActivitySessions)
          .set({
            shiftCode: input.shiftCode || 'ALL',
            workDate: parsedWorkDate,
            summaryRemark: summaryNote,
            submissionSource: resolvedSubmissionSource,
            updatedAt: new Date(),
          })
          .where(eq(dailyActivitySessions.id, existing.id))

        // Replace session items
        await db.delete(dailyActivitySessionItems).where(eq(dailyActivitySessionItems.sessionId, existing.id))

        const itemsToInsert = (input.items ?? [])
          .filter((it) => it.label?.trim())
          .map((it, idx) => ({
            sessionId: existing.id,
            snapshotLabel: it.label.trim(),
            snapshotGroupName: it.group || 'Technical',
            libraryActivityId: it.libraryActivityId ? Number(it.libraryActivityId) : null,
            unitNumber: it.unitNumber?.trim() || '',
            remark: it.remark?.trim() || '',
            actualPoints: Number(it.points) || 0,
            tireCount: Number(it.tireCount) || 0,
            isChecked: true,
            sortOrder: idx + 1,
            snapshotPayload: JSON.stringify({
              materialUsed: it.materialUsed || '',
              photoUrl: it.photoUrl || null,
              photos: it.photos || [],
            }),
            startedAt: it.startedAt ? new Date(it.startedAt) : null,
            endedAt: it.endedAt ? new Date(it.endedAt) : null,
          }))

        if (itemsToInsert.length > 0) {
          await db.insert(dailyActivitySessionItems).values(itemsToInsert)
        }

        if (input.teamMemberEmployeeIds !== undefined) {
          await db.delete(dailyActivitySessionTeamMembers).where(eq(dailyActivitySessionTeamMembers.sessionId, existing.id))
          if (input.teamMemberEmployeeIds.length > 0) {
            await db.insert(dailyActivitySessionTeamMembers).values(
              input.teamMemberEmployeeIds.map((mId) => ({ sessionId: existing.id, employeeId: mId }))
            ).onConflictDoNothing()
          }
        }

        return { success: true, sessionId: existing.id }
      }
    }

    // Create new draft session
    const dateFormatted = input.workDate
      ? input.workDate.replace(/-/g, '')
      : new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const sessionCode = `DFT-${dateFormatted}-${context.id}-${Math.floor(100 + Math.random() * 900)}`

    const [created] = await db
      .insert(dailyActivitySessions)
      .values({
        employeeId: targetEmpId,
        sessionCode,
        workDate: parsedWorkDate,
        shiftCode: input.shiftCode || 'ALL',
        siteId: input.siteId || context.siteId,
        departmentId: context.departmentId ?? null,
        sectionId: context.sectionId ?? null,
        positionId: context.positionId ?? null,
        status: 'draft',
        submissionSource: resolvedSubmissionSource,
        summaryRemark: summaryNote,
        submittedAt: null,
      })
      .returning()

    if (input.teamMemberEmployeeIds && input.teamMemberEmployeeIds.length > 0) {
      await db.insert(dailyActivitySessionTeamMembers).values(
        input.teamMemberEmployeeIds.map((mId) => ({ sessionId: created.id, employeeId: mId }))
      ).onConflictDoNothing()
    }

    const itemsToInsert = (input.items ?? [])
      .filter((it) => it.label?.trim())
      .map((it, idx) => ({
        sessionId: created.id,
        snapshotLabel: it.label.trim(),
        snapshotGroupName: it.group || 'Technical',
        libraryActivityId: it.libraryActivityId ? Number(it.libraryActivityId) : null,
        unitNumber: it.unitNumber?.trim() || '',
        remark: it.remark?.trim() || '',
        actualPoints: Number(it.points) || 0,
        tireCount: Number(it.tireCount) || 0,
        isChecked: true,
        sortOrder: idx + 1,
        snapshotPayload: JSON.stringify({
          materialUsed: it.materialUsed || '',
          photoUrl: it.photoUrl || null,
          photos: it.photos || [],
        }),
        startedAt: it.startedAt ? new Date(it.startedAt) : null,
        endedAt: it.endedAt ? new Date(it.endedAt) : null,
      }))

    if (itemsToInsert.length > 0) {
      await db.insert(dailyActivitySessionItems).values(itemsToInsert)
    }

    return { success: true, sessionId: created.id }
  } catch (err: any) {
    console.error('[saveActivityDraftToServerAction] error:', err)
    return { success: false, error: err.message || 'Gagal menyimpan draft.' }
  }
}

/**
 * Load a saved server-side draft so user can restore form state after page refresh/crash
 */
export async function loadActivityServerDraftAction(
  sessionId: number
): Promise<{
  success: true
  draft: {
    sessionId: number
    sessionCode: string
    workDate: string
    shiftCode: string
    submissionSource: 'assigned' | 'self_input' | 'custom'
    notes: string
    teamMemberEmployeeIds?: number[]
    items: any[]
  }
} | { success: false; error: string }> {
  try {
    const context = await getAuthenticatedEmployeeContext()

    const [session] = await db
      .select()
      .from(dailyActivitySessions)
      .where(
        and(
          eq(dailyActivitySessions.id, sessionId),
          eq(dailyActivitySessions.employeeId, context.id),
          eq(dailyActivitySessions.status, 'draft')
        )
      )
      .limit(1)

    if (!session) {
      return { success: false, error: 'Draft tidak ditemukan atau sudah kadaluarsa.' }
    }

    const [items, teamRows] = await Promise.all([
      db
        .select()
        .from(dailyActivitySessionItems)
        .where(eq(dailyActivitySessionItems.sessionId, session.id))
        .orderBy(asc(dailyActivitySessionItems.sortOrder)),
      db
        .select({ employeeId: dailyActivitySessionTeamMembers.employeeId })
        .from(dailyActivitySessionTeamMembers)
        .where(eq(dailyActivitySessionTeamMembers.sessionId, session.id)),
    ])

    const isCustom =
      session.submissionSource === 'custom' ||
      (!session.submissionSource && !items.some((it) => it.libraryActivityId) && items.length > 0)
    const resolvedSubmissionSource: 'assigned' | 'self_input' | 'custom' =
      session.submissionSource === 'assigned'
        ? 'assigned'
        : isCustom
          ? 'custom'
          : 'self_input'

    return {
      success: true,
      draft: {
        sessionId: session.id,
        sessionCode: session.sessionCode,
        workDate: session.workDate.toISOString().slice(0, 10),
        shiftCode: session.shiftCode || 'ALL',
        submissionSource: resolvedSubmissionSource,
        notes: session.summaryRemark || '',
        teamMemberEmployeeIds: teamRows.map((t) => t.employeeId),
        items: items.map((item) => {
          let payload: any = {}
          try { payload = JSON.parse(item.snapshotPayload || '{}') } catch {}
          return {
            id: item.id,
            label: item.snapshotLabel,
            group: item.snapshotGroupName,
            libraryActivityId: item.libraryActivityId,
            unitNumber: item.unitNumber,
            remark: item.remark,
            points: item.actualPoints,
            tireCount: item.tireCount,
            startedAt: item.startedAt?.toISOString() ?? null,
            endedAt: item.endedAt?.toISOString() ?? null,
            photoUrl: payload.photoUrl ?? null,
            photos: payload.photos ?? [],
            materialUsed: payload.materialUsed ?? '',
          }
        }),
      },
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Gagal memuat draft.' }
  }
}

export async function getEmployeeServerDraftsAction(): Promise<{
  success: boolean
  drafts: Array<{
    id: number
    sessionCode: string
    workDate: string
    shiftCode: string
    summaryRemark: string
    itemCount: number
    title: string
    createdAt: string
    updatedAt: string
    photoUrls?: string[]
  }>
  error?: string
}> {
  try {
    const context = await getAuthenticatedEmployeeContext()
    const rows = await db
      .select({
        id: dailyActivitySessions.id,
        sessionCode: dailyActivitySessions.sessionCode,
        workDate: dailyActivitySessions.workDate,
        shiftCode: dailyActivitySessions.shiftCode,
        summaryRemark: dailyActivitySessions.summaryRemark,
        createdAt: dailyActivitySessions.createdAt,
        updatedAt: dailyActivitySessions.updatedAt,
      })
      .from(dailyActivitySessions)
      .where(
        and(
          eq(dailyActivitySessions.employeeId, context.id),
          eq(dailyActivitySessions.status, 'draft'),
          isNull(dailyActivitySessions.deletedAt)
        )
      )
      .orderBy(desc(dailyActivitySessions.updatedAt), desc(dailyActivitySessions.id))

    const sessionIds = rows.map((r) => r.id)
    const itemsMap = new Map<number, { count: number; firstTitle: string; photos: string[] }>()

    if (sessionIds.length > 0) {
      const items = await db
        .select({
          sessionId: dailyActivitySessionItems.sessionId,
          snapshotLabel: dailyActivitySessionItems.snapshotLabel,
          snapshotPayload: dailyActivitySessionItems.snapshotPayload,
        })
        .from(dailyActivitySessionItems)
        .where(inArray(dailyActivitySessionItems.sessionId, sessionIds))

      items.forEach((it) => {
        if (!it.sessionId) return
        const existing = itemsMap.get(it.sessionId) || { count: 0, firstTitle: '', photos: [] }
        let itemPhotos: string[] = []
        try {
          const payload = JSON.parse(it.snapshotPayload || '{}')
          if (Array.isArray(payload.photos)) {
            itemPhotos = payload.photos.filter((p: any) => typeof p === 'string' && Boolean(p.trim()))
          } else if (payload.photoUrl && typeof payload.photoUrl === 'string') {
            itemPhotos = [payload.photoUrl]
          }
        } catch {}
        itemsMap.set(it.sessionId, {
          count: existing.count + 1,
          firstTitle: existing.firstTitle || it.snapshotLabel || '',
          photos: Array.from(new Set([...existing.photos, ...itemPhotos])),
        })
      })
    }

    const drafts = rows.map((r) => {
      const itemInfo = itemsMap.get(r.id) || { count: 0, firstTitle: '', photos: [] }
      return {
        id: r.id,
        sessionCode: r.sessionCode || `DFT-${r.id}`,
        workDate: r.workDate ? r.workDate.toISOString().slice(0, 10) : '',
        shiftCode: r.shiftCode || 'ALL',
        summaryRemark: r.summaryRemark || '',
        itemCount: itemInfo.count,
        title: itemInfo.firstTitle || r.summaryRemark || `Draft Activity #${r.id}`,
        createdAt: (r.createdAt || new Date()).toISOString(),
        updatedAt: (r.updatedAt || r.createdAt || new Date()).toISOString(),
        photoUrls: itemInfo.photos,
      }
    })

    return { success: true, drafts }
  } catch (err: any) {
    console.error('[getEmployeeServerDraftsAction] error:', err)
    return { success: false, drafts: [], error: err.message || 'Gagal memuat daftar draft.' }
  }
}

export async function deleteServerActivityDraftAction(sessionId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const context = await getAuthenticatedEmployeeContext()
    const [session] = await db
      .select({ id: dailyActivitySessions.id })
      .from(dailyActivitySessions)
      .where(
        and(
          eq(dailyActivitySessions.id, sessionId),
          eq(dailyActivitySessions.employeeId, context.id),
          eq(dailyActivitySessions.status, 'draft')
        )
      )
      .limit(1)

    if (!session) {
      return { success: false, error: 'Draft tidak ditemukan atau bukan milik akun Anda.' }
    }

    await db.delete(dailyActivitySessionItems).where(eq(dailyActivitySessionItems.sessionId, sessionId))
    await db.delete(dailyActivitySessions).where(eq(dailyActivitySessions.id, sessionId))

    return { success: true }
  } catch (err: any) {
    console.error('[deleteServerActivityDraftAction] error:', err)
    return { success: false, error: err.message || 'Gagal menghapus draft.' }
  }
}

export async function cloneDailyActivityToDraftAction(sessionId: number): Promise<{
  success: boolean
  error?: string
  payload?: any
  title?: string
}> {
  try {
    const context = await getAuthenticatedEmployeeContext()
    const fullData = await getDailyActivityApprovalData(sessionId, context.email)
    if (!fullData || !fullData.sessionId) {
      return { success: false, error: 'Dokumen aktivitas tidak ditemukan.' }
    }

    const session = fullData
    const sessionItems = fullData.sessionItems || []

    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    const formatHourMin = (d: any, defaultVal: string) => {
      if (!d) return defaultVal
      try {
        const parsed = new Date(d)
        if (!isNaN(parsed.getTime())) {
          return `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`
        }
      } catch {}
      return defaultVal
    }

    const defaultStartTime = `${String(now.getHours()).padStart(2, '0')}:00`
    const nextHour = (now.getHours() + 1) % 24
    const defaultEndTime = `${String(nextHour).padStart(2, '0')}:00`

    const hasLibrary = sessionItems.some((it: any) => Boolean(it.libraryActivityId))
    const hasRoute = Boolean(
      session.routeTemplateId ||
      session.overtimeCommandLetterId ||
      sessionItems.some((it: any) => Boolean(it.routeItemId || it.overtimeCommandLetterItemId))
    )

    let resolvedSourceMode: 'assigned' | 'self_input' | 'custom' = 'self_input'
    if (session.submissionSource === 'custom') {
      resolvedSourceMode = 'custom'
    } else if (session.submissionSource === 'self_input') {
      resolvedSourceMode = 'self_input'
    } else if (session.submissionSource === 'assigned' || session.submissionSource === 'route' || session.submissionSource === 'spl_route') {
      if (hasRoute) {
        resolvedSourceMode = 'assigned'
      } else if (hasLibrary) {
        resolvedSourceMode = 'self_input'
      } else {
        resolvedSourceMode = 'custom'
      }
    } else if (hasRoute) {
      resolvedSourceMode = 'assigned'
    } else if (hasLibrary) {
      resolvedSourceMode = 'self_input'
    } else {
      resolvedSourceMode = 'custom'
    }

    const customItem = sessionItems.find((it: any) => !it.libraryActivityId && !it.routeItemId) || sessionItems[0]
    const customItemPhotos = customItem?.photoUrls || (customItem?.photoUrl ? [customItem.photoUrl] : [])
    const title = session.summaryRemark || sessionItems[0]?.label || sessionItems[0]?.snapshotLabel || 'Aktivitas Harian (Salinan)'
    const customName = customItem?.snapshotLabel || customItem?.label || session.summaryRemark || title
    const customDesc = customItem?.remark && customItem.remark !== '-' ? customItem.remark : ''
    const customEquip = customItem?.unitNumber && customItem.unitNumber !== '-' ? customItem.unitNumber : ''
    const customStartTime = customItem?.startedAt ? formatHourMin(customItem.startedAt, defaultStartTime) : defaultStartTime
    const customEndTime = customItem?.endedAt ? formatHourMin(customItem.endedAt, defaultEndTime) : defaultEndTime

    const selfInputActivities = sessionItems.map((item: any, idx: number) => {
      let matUsed = item.materialUsed || ''
      if (!matUsed && item.snapshotPayload) {
        try {
          const parsed = typeof item.snapshotPayload === 'string' ? JSON.parse(item.snapshotPayload) : item.snapshotPayload
          matUsed = parsed?.materialUsed || ''
        } catch {}
      }
      const itemPhotos = item.photoUrls || (item.photoUrl ? [item.photoUrl] : [])
      const itemStart = formatHourMin(item.startedAt, defaultStartTime)
      const itemEnd = formatHourMin(item.endedAt, defaultEndTime)

      return {
        libraryActivityId: item.libraryActivityId ? String(item.libraryActivityId) : '',
        equipmentNo: item.unitNumber && item.unitNumber !== '-' ? item.unitNumber : '',
        startTime: `${todayStr}T${itemStart}`,
        endTime: `${todayStr}T${itemEnd}`,
        materialUsed: matUsed,
        tireCount: item.tireCount ? Number(item.tireCount) : 0,
        notes: item.remark && item.remark !== '-' ? item.remark : '',
        photoName: itemPhotos.length > 0 ? `${itemPhotos.length} foto terlampir` : '',
        photoUrl: itemPhotos[0] || null,
        photoUrls: itemPhotos,
        previewUrls: itemPhotos,
        photo: null,
        photos: [],
      }
    })

    const selectedLibraryActivityIds = Array.from(
      new Set(
        sessionItems
          .map((i: any) => (i.libraryActivityId ? String(i.libraryActivityId) : ''))
          .filter(Boolean)
      )
    )

    const routeSessionItems = sessionItems.map((item: any, idx: number) => {
      const itemPhotos = item.photoUrls || (item.photoUrl ? [item.photoUrl] : [])
      const itemStart = formatHourMin(item.startedAt, defaultStartTime)
      const itemEnd = formatHourMin(item.endedAt, defaultEndTime)

      return {
        routeItemId: item.routeItemId ? Number(item.routeItemId) : null,
        overtimeCommandLetterItemId: item.overtimeCommandLetterItemId ? Number(item.overtimeCommandLetterItemId) : null,
        libraryActivityId: item.libraryActivityId ? Number(item.libraryActivityId) : null,
        snapshotLabel: item.snapshotLabel || item.label || '',
        snapshotGroupName: item.snapshotGroupName || item.group || 'Checklist',
        snapshotPayload: item.snapshotPayload ? (typeof item.snapshotPayload === 'string' ? JSON.parse(item.snapshotPayload || '{}') : item.snapshotPayload) : {},
        unitNumber: item.unitNumber && item.unitNumber !== '-' ? item.unitNumber : '',
        remark: item.remark && item.remark !== '-' ? item.remark : '',
        startedAt: `${todayStr}T${itemStart}`,
        endedAt: `${todayStr}T${itemEnd}`,
        isChecked: Boolean(item.isChecked ?? true),
        actualPoints: Number(item.actualPoints || item.points || 5),
        tireCount: item.tireCount ? Number(item.tireCount) : 0,
        materialUsed: item.materialUsed || '',
        sortOrder: item.sortOrder || idx + 1,
        photoUrls: itemPhotos,
        previewUrls: itemPhotos,
      }
    })

    const leaderApproval = (session.approvals || []).find(
      (a: any) =>
        a.stepOrder === 1 ||
        a.approverRole === 'pjo' ||
        a.approverRole === 'leader' ||
        (a.stepLabel || '').toLowerCase().includes('leader') ||
        (a.stepLabel || '').toLowerCase().includes('pjo')
    )
    const superiorApproval = (session.approvals || []).find(
      (a: any) =>
        a.stepOrder === 2 ||
        a.approverRole === 'superior' ||
        (a.stepLabel || '').toLowerCase().includes('superior')
    )
    const additionalApprovals = (session.approvals || []).filter(
      (a: any) =>
        a.stepOrder > 2 &&
        a.approverEmployeeId &&
        a.approverEmployeeId !== leaderApproval?.approverEmployeeId &&
        a.approverEmployeeId !== superiorApproval?.approverEmployeeId
    )
    const teamMemberEmployeeIds = (session.teamMembers || []).map((t: any) => t.employeeId)

    const clonedPayload = {
      employeeId: context.id,
      workDate: todayStr,
      draftTitle: title,
      sourceMode: resolvedSourceMode,
      assignmentId: session.legacyAssignmentId ? String(session.legacyAssignmentId) : '',
      libraryActivityId: selectedLibraryActivityIds[0] || '',
      selectedLibraryActivityIds,
      selfInputActivities,
      routeTemplateId: session.routeTemplateId ? String(session.routeTemplateId) : '',
      overtimeCommandLetterId: session.overtimeCommandLetterId ? String(session.overtimeCommandLetterId) : '',
      routeShiftCode: session.shiftCode || 'ALL',
      routeSummaryRemark: session.summaryRemark || '',
      routeSessionItems,
      customActivityName: customName,
      customActivityDescription: customDesc,
      equipmentNo: resolvedSourceMode === 'custom' ? customEquip : (sessionItems[0]?.unitNumber && sessionItems[0].unitNumber !== '-' ? sessionItems[0].unitNumber : ''),
      startTime: `${todayStr}T${resolvedSourceMode === 'custom' ? customStartTime : formatHourMin(sessionItems[0]?.startedAt, defaultStartTime)}`,
      endTime: `${todayStr}T${resolvedSourceMode === 'custom' ? customEndTime : formatHourMin(sessionItems[0]?.endedAt, defaultEndTime)}`,
      materialUsed: resolvedSourceMode === 'custom' ? (customItem?.materialUsed || '') : (sessionItems[0]?.materialUsed || ''),
      notes: session.summaryRemark && session.summaryRemark !== '-' ? session.summaryRemark : (customDesc || ''),
      manualLocation: session.site?.name || '',
      locationName: session.site?.name || '',
      gpsLat: '',
      gpsLng: '',
      gpsValid: false,
      boundaryStatus: 'unknown' as const,
      boundaryMessage: '',
      photo: null,
      photos: [],
      photoUrls: resolvedSourceMode === 'custom' ? customItemPhotos : (sessionItems[0]?.photoUrls || (sessionItems[0]?.photoUrl ? [sessionItems[0].photoUrl] : [])),
      photoName: (resolvedSourceMode === 'custom' ? customItemPhotos.length : (sessionItems[0]?.photoUrls?.length || 0)) > 0 ? `${resolvedSourceMode === 'custom' ? customItemPhotos.length : sessionItems[0]?.photoUrls?.length} foto terlampir` : '',
      leaderEmployeeId: leaderApproval?.approverEmployeeId ? String(leaderApproval.approverEmployeeId) : undefined,
      leaderName: leaderApproval?.approverName || undefined,
      superiorEmployeeId: superiorApproval?.approverEmployeeId ? String(superiorApproval.approverEmployeeId) : undefined,
      superiorName: superiorApproval?.approverName || undefined,
      additionalApprovers: additionalApprovals.map((a: any, idx: number) => ({
        id: `clone-extra-${a.id || idx}`,
        employeeId: String(a.approverEmployeeId),
        role: a.approverRole || 'additional_approver',
        stepLabel: a.stepLabel || `Approver Tambahan (Tahap ${a.stepOrder || idx + 3})`,
      })),
      teamMemberEmployeeIds,
      serverDraftSessionId: undefined,
    }

    return {
      success: true,
      payload: clonedPayload,
      title,
    }
  } catch (err: any) {
    console.error('[cloneDailyActivityToDraftAction] error:', err)
    return { success: false, error: err.message || 'Gagal menyalin aktivitas.' }
  }
}

// ── User Signature Registry & Batch Approval Actions ─────────────────────────
export async function getUserSignatureAction() {
  return getUserSignatureActionInternal()
}

export async function saveUserSignatureAction(signatureDataUrl: string) {
  return saveUserSignatureActionInternal(signatureDataUrl)
}

export async function deleteUserSignatureAction() {
  try {
    const emp = await getCurrentEmployee()
    if (!emp) {
      return { success: false as const, error: 'Sesi login tidak ditemukan.' }
    }

    await db
      .update(employees)
      .set({
        signatureDataUrl: null,
        signatureRegisteredAt: null,
      })
      .where(eq(employees.id, emp.id))

    safeRevalidatePath('/dashboard/profile')
    safeRevalidatePath('/dashboard/activity-hub/approval')
    safeRevalidatePath('/dashboard/overtime-requests')

    return {
      success: true as const,
    }
  } catch (error: any) {
    console.error('Error deleting user signature:', error)
    return { success: false as const, error: error.message || 'Gagal menghapus tanda tangan.' }
  }
}

export async function batchApproveDailyActivitySessionsAction(
  sessionIds: number[],
  remarks?: string,
  signatureDataUrl?: string
) {
  try {
    if (!sessionIds || sessionIds.length === 0) {
      return { success: false as const, error: 'Pilih minimal satu aktivitas untuk diapprove.' }
    }

    const emp = await getCurrentEmployee()
    if (!emp) {
      return { success: false as const, error: 'Sesi login tidak ditemukan.' }
    }

    const [empRecord] = await db
      .select({
        id: employees.id,
        name: employees.name,
        signatureDataUrl: employees.signatureDataUrl,
      })
      .from(employees)
      .where(eq(employees.id, emp.id))
      .limit(1)

    let sigUrl = empRecord?.signatureDataUrl || signatureDataUrl || null

    if (signatureDataUrl && (!empRecord?.signatureDataUrl || empRecord.signatureDataUrl !== signatureDataUrl)) {
      await db
        .update(employees)
        .set({ signatureDataUrl, signatureRegisteredAt: new Date() })
        .where(eq(employees.id, emp.id))
      sigUrl = signatureDataUrl
    }

    if (!sigUrl) {
      return {
        success: false as const,
        needsSignatureRegistration: true as const,
        error: 'Anda belum mendaftarkan tanda tangan. Daftarkan tanda tangan terlebih dahulu.',
      }
    }

    const now = new Date()
    let approvedCount = 0

    for (const sessionId of sessionIds) {
      // Find the first active step waiting for approval ('pending' first, fallback to 'waiting')
      const [pendingStep] = await db
        .select()
        .from(dailyActivityApprovals)
        .where(
          and(
            eq(dailyActivityApprovals.sessionId, sessionId),
            eq(dailyActivityApprovals.status, 'pending')
          )
        )
        .orderBy(asc(dailyActivityApprovals.stepOrder))
        .limit(1)

      const waitingStep = pendingStep || (await db
        .select()
        .from(dailyActivityApprovals)
        .where(
          and(
            eq(dailyActivityApprovals.sessionId, sessionId),
            eq(dailyActivityApprovals.status, 'waiting')
          )
        )
        .orderBy(asc(dailyActivityApprovals.stepOrder))
        .limit(1))[0]

      if (!waitingStep) continue

      let currentStepToApprove = waitingStep
      let nextStep: any = null
      let isCompleted = false

      while (currentStepToApprove) {
        // Approve this step
        await db
          .update(dailyActivityApprovals)
          .set({
            status: 'approved',
            signatureDataUrl: sigUrl,
            signedAt: now,
            approverName: empRecord?.name || currentStepToApprove.approverName,
            approverEmployeeId: empRecord?.id || emp.id,
            remarks: remarks || 'Approved',
          })
          .where(eq(dailyActivityApprovals.id, currentStepToApprove.id))

        // Find next step
        const [candidateNext] = await db
          .select()
          .from(dailyActivityApprovals)
          .where(
            and(
              eq(dailyActivityApprovals.sessionId, sessionId),
              sql`${dailyActivityApprovals.stepOrder} > ${currentStepToApprove.stepOrder}`
            )
          )
          .orderBy(asc(dailyActivityApprovals.stepOrder))
          .limit(1)

        if (!candidateNext) {
          isCompleted = true
          break
        }

        const isSameApproverAsNext =
          (candidateNext.approverEmployeeId &&
            candidateNext.approverEmployeeId === (empRecord?.id || emp.id)) ||
          (candidateNext.approverEmail &&
            emp.email &&
            candidateNext.approverEmail.toLowerCase().trim() === emp.email.toLowerCase().trim()) ||
          (candidateNext.approverName &&
            empRecord?.name &&
            candidateNext.approverName.toLowerCase().trim() === empRecord.name.toLowerCase().trim())

        if (isSameApproverAsNext) {
          currentStepToApprove = candidateNext
        } else {
          nextStep = candidateNext
          await db
            .update(dailyActivityApprovals)
            .set({ status: 'pending' })
            .where(eq(dailyActivityApprovals.id, nextStep.id))
          break
        }
      }

      const [sessionDoc] = await db
        .select({
          id: dailyActivitySessions.id,
          sessionCode: dailyActivitySessions.sessionCode,
          workDate: dailyActivitySessions.workDate,
          employeeId: dailyActivitySessions.employeeId,
          siteId: dailyActivitySessions.siteId,
        })
        .from(dailyActivitySessions)
        .where(eq(dailyActivitySessions.id, sessionId))
        .limit(1)

      if (!isCompleted && nextStep) {
        if (sessionDoc) {
          const [requester] = await db
            .select({ name: employees.name })
            .from(employees)
            .where(eq(employees.id, sessionDoc.employeeId))
            .limit(1)

          const [siteRow] = sessionDoc.siteId
            ? await db.select({ name: sites.name }).from(sites).where(eq(sites.id, sessionDoc.siteId)).limit(1)
            : []

          try {
            if (nextStep.approverEmail) {
              await publishInAppApprovalNotification({
                recipientEmail: nextStep.approverEmail,
                title: `Approval Needed: Daily Activity ${sessionDoc.sessionCode}`,
                body: `Laporan aktivitas ${requester?.name || 'Karyawan'} menunggu persetujuan Anda (${nextStep.stepLabel}).`,
                url: `/dashboard/activity-hub/document/${sessionDoc.id}/approval`,
                eventType: 'daily_activity_approval_needed',
              })
              await sendDailyActivityStepApprovalEmail({
                sessionId: sessionDoc.id,
                sessionCode: sessionDoc.sessionCode,
                employeeName: requester?.name || 'Karyawan',
                workDate: sessionDoc.workDate ? new Date(sessionDoc.workDate).toISOString() : now.toISOString(),
                siteName: siteRow?.name || '-',
                approverName: nextStep.approverName || 'Approver',
                approverEmail: nextStep.approverEmail,
                approvalStep: nextStep.stepLabel,
                approvalToken: nextStep.approvalToken || '',
              })
            }
          } catch (err) {
            console.error('Error dispatching next step email:', err)
          }
        }
      } else {
        // Auto-approve any remaining steps just in case
        await db
          .update(dailyActivityApprovals)
          .set({
            status: 'approved',
            signatureDataUrl: sigUrl,
            approverEmployeeId: empRecord?.id || emp.id,
            signedAt: now,
          })
          .where(
            and(
              eq(dailyActivityApprovals.sessionId, sessionId),
              eq(dailyActivityApprovals.status, 'waiting')
            )
          )

        // Final approval -> Complete session status
        await db
          .update(dailyActivitySessions)
          .set({
            status: 'Approved',
            approvedAt: now,
            updatedAt: now,
          })
          .where(eq(dailyActivitySessions.id, sessionId))

        // Award points & update streak for submitter and all team members
        await awardSessionPointsToTeam(sessionId, db)

        if (sessionDoc) {
          const [requester] = await db
            .select({ name: employees.name, email: employees.email })
            .from(employees)
            .where(eq(employees.id, sessionDoc.employeeId))
            .limit(1)
          try {
            if (requester?.email) {
              await publishInAppApprovalNotification({
                recipientEmail: requester.email,
                title: `Daily Activity Selesai: ${sessionDoc.sessionCode}`,
                body: `Laporan aktivitas harian Anda telah selesai disetujui secara lengkap.`,
                url: `/dashboard/activity-hub/document/${sessionDoc.id}/approval`,
                eventType: 'daily_activity_completed',
              })
              await sendDailyActivityCompletedEmail({
                sessionId: sessionDoc.id,
                sessionCode: sessionDoc.sessionCode,
                employeeName: requester.name || 'Karyawan',
                employeeEmail: requester.email,
                workDate: sessionDoc.workDate ? new Date(sessionDoc.workDate).toISOString() : now.toISOString(),
              })
            }
          } catch (completedErr) {
            console.warn('Non-blocking completion notification error:', completedErr)
          }
        }
      }

      approvedCount++
    }

    try {
      safeRevalidatePath('/dashboard/activity-hub/approval')
      safeRevalidatePath('/dashboard/activity-hub/my-day')
      safeRevalidatePath('/dashboard/approval')
    } catch {}

    return {
      success: true as const,
      approvedCount,
      totalSelected: sessionIds.length,
    }
  } catch (error: any) {
    console.error('Error batch approving daily activities:', error)
    return { success: false as const, error: error.message || 'Gagal menyetujui aktivitas secara massal.' }
  }
}

export async function batchRejectDailyActivitySessionsAction(sessionIds: number[], remarks?: string) {
  try {
    if (!sessionIds || sessionIds.length === 0) {
      return { success: false as const, error: 'Pilih minimal satu aktivitas.' }
    }

    const emp = (await getCurrentEmployee()) ?? (await getAuthenticatedEmployeeContext().catch(() => null))
    if (!emp) {
      return { success: false as const, error: 'Sesi login tidak ditemukan.' }
    }

    const now = new Date()
    for (const sessionId of sessionIds) {
      const [pendingStep] = await db
        .select()
        .from(dailyActivityApprovals)
        .where(
          and(
            eq(dailyActivityApprovals.sessionId, sessionId),
            eq(dailyActivityApprovals.status, 'pending')
          )
        )
        .orderBy(asc(dailyActivityApprovals.stepOrder))
        .limit(1)

      const targetStep = pendingStep || (await db
        .select()
        .from(dailyActivityApprovals)
        .where(eq(dailyActivityApprovals.sessionId, sessionId))
        .orderBy(desc(dailyActivityApprovals.stepOrder))
        .limit(1))[0]

      if (targetStep) {
        // Target ONLY the active step being rejected
        await db
          .update(dailyActivityApprovals)
          .set({
            status: 'rejected',
            signedAt: now,
            approverName: emp.name,
            approverEmployeeId: emp.id,
            remarks: remarks || 'Ditolak saat review dokumen.',
          })
          .where(eq(dailyActivityApprovals.id, targetStep.id))

        // Set subsequent steps to cancelled with empty remarks so reject note isn't copied to all steps
        await db
          .update(dailyActivityApprovals)
          .set({
            status: 'cancelled',
            remarks: '',
          })
          .where(
            and(
              eq(dailyActivityApprovals.sessionId, sessionId),
              sql`${dailyActivityApprovals.stepOrder} > ${targetStep.stepOrder}`
            )
          )
      }

      await db
        .update(dailyActivitySessions)
        .set({ status: 'rejected', updatedAt: now })
        .where(eq(dailyActivitySessions.id, sessionId))

      // Dispatch rejection notification & email to original requester
      const [sessionDoc] = await db
        .select({
          id: dailyActivitySessions.id,
          sessionCode: dailyActivitySessions.sessionCode,
          employeeId: dailyActivitySessions.employeeId,
        })
        .from(dailyActivitySessions)
        .where(eq(dailyActivitySessions.id, sessionId))
        .limit(1)

      if (sessionDoc?.employeeId) {
        const [requester] = await db
          .select({ name: employees.name, email: employees.email })
          .from(employees)
          .where(eq(employees.id, sessionDoc.employeeId))
          .limit(1)

        if (requester?.email) {
          sendDailyActivityRejectedEmail({
            sessionId: sessionDoc.id,
            sessionCode: sessionDoc.sessionCode || `ACT-${sessionDoc.id}`,
            employeeName: requester.name,
            employeeEmail: requester.email,
            approverName: emp.name || 'Approver',
            remarks: remarks || 'Ditolak saat review dokumen.',
          }).catch((err) => console.error('[batchRejectDailyActivitySessionsAction] Email error:', err))

          notifyWorkflowBellRecipients({
            recipientEmails: [requester.email],
            eventType: 'daily_activity_rejected',
            category: 'approval_requests',
            title: `Daily Activity Ditolak: ${sessionDoc.sessionCode || ''}`,
            body: `Laporan aktivitas harian Anda ditolak oleh ${emp.name || 'Approver'}.${remarks ? ` Alasan: ${remarks}` : ''}`,
            url: `/dashboard/activity-hub/document/${sessionDoc.id}`,
            tagPrefix: 'daily-activity-rejected',
            metadata: { sessionId: sessionDoc.id },
          }).catch((err) => console.error('[batchRejectDailyActivitySessionsAction] Bell error:', err))
        }
      }

      try {
        safeRevalidatePath(`/dashboard/activity-hub/document/${sessionId}`)
        safeRevalidatePath(`/dashboard/activity-hub/document/${sessionId}/approval`)
      } catch {}
    }

    try {
      safeRevalidatePath('/dashboard/activity-hub/approval')
      safeRevalidatePath('/dashboard/activity-hub/my-day')
      safeRevalidatePath('/dashboard/approval')
    } catch {}

    return { success: true as const, rejectedCount: sessionIds.length }
  } catch (error: any) {
    console.error('Error batch rejecting daily activities:', error)
    return { success: false as const, error: error.message || 'Gagal menolak aktivitas.' }
  }
}

export async function batchRevertDailyActivitySessionsAction(sessionIds: number[], remarks?: string) {
  try {
    if (!sessionIds || sessionIds.length === 0) {
      return { success: false as const, error: 'Pilih minimal satu aktivitas.' }
    }

    const emp = (await getCurrentEmployee()) ?? (await getAuthenticatedEmployeeContext().catch(() => null))
    if (!emp) {
      return { success: false as const, error: 'Sesi login tidak ditemukan.' }
    }

    const now = new Date()

    for (const sessionId of sessionIds) {
      // Find current active step: first pending/waiting/submitted step, or fallback to any step
      const [pendingStep] = await db
        .select()
        .from(dailyActivityApprovals)
        .where(
          and(
            eq(dailyActivityApprovals.sessionId, sessionId),
            inArray(dailyActivityApprovals.status, ['pending', 'waiting', 'submitted', 'submitted_for_review'])
          )
        )
        .orderBy(asc(dailyActivityApprovals.stepOrder))
        .limit(1)

      const activeStep = pendingStep || (await db
        .select()
        .from(dailyActivityApprovals)
        .where(eq(dailyActivityApprovals.sessionId, sessionId))
        .orderBy(desc(dailyActivityApprovals.stepOrder))
        .limit(1))[0]

      if (activeStep) {
        await db
          .update(dailyActivityApprovals)
          .set({
            status: 'reverted',
            remarks: remarks || `Dokumen dikembalikan oleh ${emp.name} untuk revisi.`,
            signedAt: now,
            approverName: emp.name,
            approverEmployeeId: emp.id,
          })
          .where(eq(dailyActivityApprovals.id, activeStep.id))

        // Reset subsequent steps (if any) to waiting
        await db
          .update(dailyActivityApprovals)
          .set({
            status: 'waiting',
            remarks: '',
            signedAt: null,
            signatureDataUrl: null,
          })
          .where(
            and(
              eq(dailyActivityApprovals.sessionId, sessionId),
              sql`${dailyActivityApprovals.stepOrder} > ${activeStep.stepOrder}`
            )
          )
      }

      await db
        .update(dailyActivitySessions)
        .set({ status: 'reverted', updatedAt: now })
        .where(eq(dailyActivitySessions.id, sessionId))

      const [step1] = await db
        .select()
        .from(dailyActivityApprovals)
        .where(
          and(
            eq(dailyActivityApprovals.sessionId, sessionId),
            eq(dailyActivityApprovals.stepOrder, 1)
          )
        )
        .limit(1)

      const [sessionRow] = await db
        .select({
          sessionCode: dailyActivitySessions.sessionCode,
          employeeId: dailyActivitySessions.employeeId,
        })
        .from(dailyActivitySessions)
        .where(eq(dailyActivitySessions.id, sessionId))
        .limit(1)

      // Fallback: resolve recipient email from hero_employees if step1 approverEmail is missing
      let recipientEmail = step1?.approverEmail || null
      let recipientName = step1?.approverName || 'Karyawan'

      if (!recipientEmail && sessionRow?.employeeId) {
        const [empRow] = await db
          .select({ name: employees.name, email: employees.email })
          .from(employees)
          .where(eq(employees.id, sessionRow.employeeId))
          .limit(1)

        if (empRow) {
          recipientEmail = empRow.email || null
          recipientName = empRow.name || recipientName
        }
      }

      try {
        if (recipientEmail) {
          await sendDailyActivityRevertedEmail({
            sessionId,
            sessionCode: sessionRow?.sessionCode || `ACT-${sessionId}`,
            targetApproverName: recipientName,
            targetApproverEmail: recipientEmail,
            managerName: emp.name || 'Department Head',
            revertReason: remarks || 'Dokumen dikembalikan untuk revisi.',
          })

          await notifyWorkflowBellRecipients({
            recipientEmails: [recipientEmail],
            eventType: 'daily_activity_reverted',
            category: 'approval_requests',
            title: `Daily Activity Dikembalikan: ${sessionRow?.sessionCode || ''}`,
            body: `Laporan aktivitas harian Anda dikembalikan untuk revisi oleh ${emp.name || 'Atasan'}.${remarks ? ` Catatan: ${remarks}` : ''}`,
            url: `/dashboard/activity-hub/document/${sessionId}`,
            tagPrefix: 'daily-activity-reverted',
            metadata: { sessionId },
          }).catch((bellErr) => console.error('Error notifying bell on batch revert:', bellErr))
        }
      } catch (mailErr) {
        console.error('Error sending daily activity reverted email in batch revert:', mailErr)
      }
    }

    try {
      safeRevalidatePath('/dashboard/activity-hub/approval')
      safeRevalidatePath('/dashboard/activity-hub/my-day')
      safeRevalidatePath('/dashboard/approval')
    } catch {}

    return { success: true as const, revertedCount: sessionIds.length }
  } catch (error: any) {
    console.error('Error batch reverting daily activities:', error)
    return { success: false as const, error: error.message || 'Gagal mengembalikan aktivitas.' }
  }
}

export async function singleApproveDailyActivityAction(sessionId: number, remarks?: string, signatureDataUrl?: string) {
  return batchApproveDailyActivitySessionsAction([sessionId], remarks, signatureDataUrl)
}

export async function singleRejectDailyActivityAction(sessionId: number, remarks?: string) {
  return batchRejectDailyActivitySessionsAction([sessionId], remarks)
}

export async function singleRevertDailyActivityAction(sessionId: number, remarks?: string) {
  return batchRevertDailyActivitySessionsAction([sessionId], remarks)
}

export async function getDailyActivityWorkflowSettings(): Promise<DailyActivityWorkflowSettings> {
  try {
    const [row] = await db
      .select()
      .from(hcContractReviewSettings)
      .where(eq(hcContractReviewSettings.settingKey, 'daily_activity_workflow'))
      .limit(1)

    const stored = (row?.settingValue as Partial<DailyActivityWorkflowSettings> | undefined) ?? {}
    return {
      ...DEFAULT_DAILY_ACTIVITY_SETTINGS,
      ...stored,
      approvalMatrix: {
        ...DEFAULT_DAILY_ACTIVITY_SETTINGS.approvalMatrix,
        ...stored.approvalMatrix,
        sectionHeads: Array.isArray(stored.approvalMatrix?.sectionHeads)
          ? stored.approvalMatrix.sectionHeads
          : DEFAULT_DAILY_ACTIVITY_SETTINGS.approvalMatrix.sectionHeads,
      },
      emailTemplates: {
        ...DEFAULT_DAILY_ACTIVITY_SETTINGS.emailTemplates,
        ...stored.emailTemplates,
      },
      reminderDaysBefore:
        Array.isArray(stored.reminderDaysBefore) && stored.reminderDaysBefore.length > 0
          ? stored.reminderDaysBefore.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v >= 0)
          : DEFAULT_DAILY_ACTIVITY_SETTINGS.reminderDaysBefore,
    }
  } catch (err) {
    console.error('Error fetching Daily Activity workflow settings:', err)
    return DEFAULT_DAILY_ACTIVITY_SETTINGS
  }
}

export async function saveDailyActivityWorkflowSettings(settings: DailyActivityWorkflowSettings) {
  try {
    const [existing] = await db
      .select({ id: hcContractReviewSettings.id })
      .from(hcContractReviewSettings)
      .where(eq(hcContractReviewSettings.settingKey, 'daily_activity_workflow'))
      .limit(1)

    if (existing) {
      await db
        .update(hcContractReviewSettings)
        .set({ settingValue: settings, updatedAt: new Date() })
        .where(eq(hcContractReviewSettings.id, existing.id))
    } else {
      await db.insert(hcContractReviewSettings).values({
        settingKey: 'daily_activity_workflow',
        settingValue: settings,
      })
    }

    // Sync template overrides to central emailTemplates table
    if (settings.emailTemplates) {
      const templateMap: Record<string, { code: string; name: string; desc: string }> = {
        approvalStep: {
          code: 'daily_activity_approval_notification',
          name: 'Daily Activity Approval Notification',
          desc: 'Email ganti giliran / permohonan persetujuan Daily Activity harian karyawan.',
        },
        approvalCompleted: {
          code: 'daily_activity_completed_notification',
          name: 'Daily Activity Approved Notification',
          desc: 'Email pemberitahuan laporan Daily Activity telah selesai disetujui penuh.',
        },
        reminder: {
          code: 'daily_activity_reminder_notification',
          name: 'Daily Activity Reminder Notification',
          desc: 'Email pengingat (reminder) approval Daily Activity yang masih pending.',
        },
      }

      for (const [key, tplInfo] of Object.entries(templateMap)) {
        const customTpl = settings.emailTemplates[key]
        if (customTpl && customTpl.subject) {
          const [existTpl] = await db
            .select({ id: emailTemplates.id })
            .from(emailTemplates)
            .where(eq(emailTemplates.templateCode, tplInfo.code))
            .limit(1)

          if (existTpl) {
            await db
              .update(emailTemplates)
              .set({
                name: tplInfo.name,
                subject: customTpl.subject,
                textContent: customTpl.body,
                updatedAt: new Date(),
              })
              .where(eq(emailTemplates.id, existTpl.id))
          } else {
            await db.insert(emailTemplates).values({
              name: tplInfo.name,
              templateCode: tplInfo.code,
              templateType: 'Notification',
              deliveryChannel: 'email,bell',
              recipientScope: 'approver',
              subject: customTpl.subject,
              textContent: customTpl.body,
              htmlContent: '',
              description: tplInfo.desc,
              isActive: true,
            } as any)
          }
        }
      }
    }

    try {
      safeRevalidatePath('/dashboard/activity-hub/approval')
      safeRevalidatePath('/dashboard/settings/email')
    } catch {}

    return { success: true }
  } catch (err: any) {
    console.error('Error saving Daily Activity workflow settings:', err)
    return { success: false, error: err.message || 'Gagal menyimpan pengaturan.' }
  }
}



