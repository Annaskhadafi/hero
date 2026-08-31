'use server'

import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { db } from '@/db'
import { getPublicAppUrl } from '@/lib/auth-config'
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
        .filter((part) => Number.isInteger(part) && part > 0)
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

function parseDateTime(value: string, label: string) {
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

export async function manageActivityLibraryAction(formData: FormData) {
  await ensureDailyActivitySeedData()

  const payload = manageLibrarySchema.parse(Object.fromEntries(formData))

  if (payload.intent === 'delete') {
    if (!payload.id) {
      throw new Error('Library activity tidak valid.')
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
    siteId: siteIds[0] ?? null,
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
      const existingTemplates = await db
        .select({ id: activityRouteTemplates.id })
        .from(activityRouteTemplates)
        .where(eq(activityRouteTemplates.routeName, groupName))
        .limit(1)

      let autoTemplateId = existingTemplates[0]?.id
      if (!autoTemplateId) {
        const insertedTemplate = await db.insert(activityRouteTemplates).values({
          routeCode: `GRP-${payload.activityCode}`,
          routeName: groupName,
          description: `Auto-generated group for ${payload.activityName}`,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning({ id: activityRouteTemplates.id })
        autoTemplateId = insertedTemplate[0]?.id
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
        }

        if (autoGroupId) {
          await db.delete(activityRouteItems).where(eq(activityRouteItems.routeGroupId, autoGroupId))

          const childLibraries = await db
            .select()
            .from(activityLibraries)
            .where(inArray(activityLibraries.id, payload.childActivityIds))

          if (childLibraries.length > 0) {
            await db.insert(activityRouteItems).values(
              childLibraries.map((lib, idx) => ({
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
    ? parseDateTime(payload.plannedStartAt, 'Jam mulai SPL')
    : null
  const plannedEndAt = payload.plannedEndAt
    ? parseDateTime(payload.plannedEndAt, 'Jam selesai SPL')
    : null

  if (plannedStartAt && plannedEndAt && plannedEndAt <= plannedStartAt) {
    throw new Error('Jam selesai SPL harus setelah jam mulai.')
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
      if (Number(evidence?.checkedCount ?? 0) < 1 || Number(evidence?.photoCount ?? 0) < 1) {
        throw new Error(
          'SPL belum dapat ditutup: aktivitas selesai dan minimal satu foto wajib tersedia.'
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

  const teamMemberIds: number[] = JSON.parse(payload.teamMemberEmployeeIdsJson || '[]')
  const targetMemberIds = teamMemberIds.length > 0 ? [employeeId, ...teamMemberIds] : [employeeId]
  const allTargetEmployees = await db
    .select()
    .from(employees)
    .where(inArray(employees.id, targetMemberIds))

  if (allTargetEmployees.length !== targetMemberIds.length) {
    throw new Error('Beberapa anggota tim tidak ditemukan.')
  }

  // Verify that team members belong to the same site and section as the submitter
  for (const emp of allTargetEmployees) {
    if (emp.id !== employeeId) {
      if (emp.siteId !== employee.siteId || emp.sectionId !== employee.sectionId) {
        throw new Error(`Anggota tim ${emp.name} tidak berada di site dan section yang sama.`)
      }
    }
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

  for (const emp of allTargetEmployees) {
    const [existingOverlap] = await db
      .select({
        id: activities.id,
        title: activities.title,
      })
      .from(activities)
      .where(
        and(
          eq(activities.employeeId, emp.id),
          sql`${activities.startTime} < ${endTime} and ${activities.endTime} > ${startTime}`
        )
      )
      .orderBy(desc(activities.startTime))
      .limit(1)

    if (existingOverlap) {
      throw new Error(`Waktu bertabrakan dengan aktivitas ${existingOverlap.title} untuk ${emp.name}.`)
    }
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

  if (payload.overtimeCommandLetterId != null) {
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

  if (requiresEvidencePhoto && uploadedPhotoUrls.length === 0) {
    throw new Error('Foto wajib diupload untuk activity / checklist yang dipilih.')
  }

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

  for (const info of memberActivityInfos) {
    const empId = info.memberEmployee.id
    await updateStreakForEmployee(empId, endTime)

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

    await logAuditEvent({
      actorEmail: employee.email,
      action: 'daily_activity.submitted',
      entityType: 'daily_activity',
      entityLabel: `${info.createdActivityId}`,
      description: `${info.activityTitle} disubmit untuk ${info.memberEmployee.name} dengan status ${info.activityStatus}.`,
    })

    if (info.needsApproval) {
      try {
        const candidateApproverEmails: string[] = []

        for (const approver of info.firstApprovers) {
          if (approver.approverEmail) {
            candidateApproverEmails.push(approver.approverEmail)
          }
          if (approver.approverEmployeeId) {
            const [emp] = await db
              .select({ email: employees.email })
              .from(employees)
              .where(eq(employees.id, approver.approverEmployeeId))
              .limit(1)
            if (emp?.email) {
              candidateApproverEmails.push(emp.email)
            }
          }
          if (approver.approverName && approver.approverName.includes('@')) {
            candidateApproverEmails.push(approver.approverName)
          }
        }

        // Also query super admins so super admin accounts receive real-time bell notifications
        const superAdmins = await db
          .select({ email: employees.email })
          .from(employees)
          .where(eq(employees.accessRole, 'superadmin'))

        for (const sa of superAdmins) {
          if (sa.email) candidateApproverEmails.push(sa.email)
        }

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

      const firstApprover = info.firstApprovers[0]
      if (firstApprover) {
        try {
          const [approverContact] = await db
            .select({ email: employees.email })
            .from(employees)
            .where(eq(employees.id, firstApprover.approverEmployeeId!))
            .limit(1)

          if (approverContact?.email) {
            const emailContent = buildWorkflowEmailContent({
              title: 'Daily Activity menunggu approval',
              greeting: `Halo ${firstApprover.approverName || 'Approver'},`,
              intro: `${employee.name} mengirim daily activity baru untuk ${info.memberEmployee.name} dan membutuhkan review Anda.`,
              details: [
                `Karyawan: ${info.memberEmployee.name}`,
                `Aktivitas: ${info.activityTitle}`,
                `Kategori: ${activityType}`,
                `Waktu: ${submissionTime.toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}`,
                payload.notes ? `Catatan: ${payload.notes}` : null,
              ],
              ctaLabel: 'Buka Approval',
              ctaUrl: getAppUrl('/dashboard/approval'),
            })

            await sendWorkflowEmail({
              to: approverContact.email,
              actorEmail: employee.email,
              templateCode: 'daily_activity_pending_approval',
              templateName: 'Daily Activity Pending Approval',
              variables: {
                employeeName: info.memberEmployee.name,
                activityTitle: info.activityTitle,
                activityType,
                submissionTime: submissionTime.toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }),
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
      }
    }
  }

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
  { stepOrder: 2, stepLabel: 'Leader / Supervisor', approverRole: 'leader' },
  { stepOrder: 3, stepLabel: 'Section Head', approverRole: 'section_head' },
  { stepOrder: 4, stepLabel: 'Manager / HC', approverRole: 'manager' },
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
  if (!sectionHeadName && sessionEmployee?.sectionId) {
    const [sectionRow] = await db
      .select({ headEmployeeId: masterSections.headEmployeeId })
      .from(masterSections)
      .where(eq(masterSections.id, sessionEmployee.sectionId))
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

  // Resolve leader approver
  let leaderEmployeeId = directManager?.id ?? null
  let leaderName = directManager?.name ?? settings.approvalMatrix?.fieldPicName ?? 'Leader Lapangan'
  let leaderEmail = directManager?.email || settings.approvalMatrix?.fieldPicEmail || ''

  // If section head still empty, fallback to settings.approvalMatrix.managerName or Section Head default
  if (!sectionHeadName) {
    sectionHeadName = settings.approvalMatrix?.managerName || 'Section Head'
    sectionHeadEmail = settings.approvalMatrix?.managerEmail || ''
  }

  const approvers: Array<{
    stepOrder: number
    stepLabel: string
    approverRole: string
    approverEmployeeId: number | null
    approverName: string
    approverEmail: string
  }> = [
    {
      stepOrder: 1,
      stepLabel: 'Karyawan Sign',
      approverRole: 'employee',
      approverEmployeeId: sessionEmployee?.id ?? null,
      approverName: sessionEmployee?.name ?? 'Karyawan',
      approverEmail: sessionEmployee?.email || '',
    },
    {
      stepOrder: 2,
      stepLabel: 'Leader / Supervisor',
      approverRole: 'leader',
      approverEmployeeId: leaderEmployeeId,
      approverName: leaderName,
      approverEmail: leaderEmail,
    },
    {
      stepOrder: 3,
      stepLabel: 'Section Head',
      approverRole: 'section_head',
      approverEmployeeId: sectionHeadEmployeeId,
      approverName: sectionHeadName,
      approverEmail: sectionHeadEmail,
    },
  ]

  let step1Token = ''
  for (const step of approvers) {
    const token = randomUUID()
    if (step.stepOrder === 1) step1Token = token
    await db.insert(dailyActivityApprovals).values({
      sessionId,
      stepOrder: step.stepOrder,
      stepLabel: step.stepLabel,
      approvalToken: token,
      approverName: step.approverName,
      approverEmail: step.approverEmail,
      approverRole: step.approverRole,
      status: step.stepOrder === 1 ? 'pending' : 'waiting',
      createdAt: new Date(),
    })
  }

  // Send initial email to Step 1 (Serviceman / Employee)
  if (step1Token && sessionEmployee?.email) {
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
        approverName: sessionEmployee?.name || 'Karyawan',
        approverEmail: sessionEmployee.email,
        approvalStep: 'Karyawan Sign',
        approvalToken: step1Token,
      })
    } catch (emailErr) {
      console.error('Error sending initial step 1 approval email:', emailErr)
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

    const [approvalRow] = await db
      .select()
      .from(dailyActivityApprovals)
      .where(eq(dailyActivityApprovals.id, payload.approvalId))
      .limit(1)

    if (!approvalRow) {
      throw new Error('Step approval tidak ditemukan.')
    }

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
        await sendDailyActivityRevertedEmail({
          sessionId: payload.sessionId,
          sessionCode: session.sessionCode || `ACT-${payload.sessionId}`,
          targetApproverName: step1.approverName || 'Karyawan',
          targetApproverEmail: step1.approverEmail,
          managerName: currentEmployee.name || 'Department Head',
          revertReason: payload.remarks,
        })
      }

      safeRevalidatePath(`/dashboard/activity-hub/document/${payload.sessionId}`)
      safeRevalidatePath(`/dashboard/activity-hub/document/${payload.sessionId}/approval`)

      return {
        status: 'success',
        message: 'Dokumen berhasil dikembalikan (revert) ke tahap awal untuk revisi.',
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
    const signatureUrl = payload.action === 'approve' ? (payload.signatureDataUrl || null) : null

    await db
      .update(dailyActivityApprovals)
      .set({
        status: payload.action === 'approve' ? 'approved' : 'rejected',
        signatureDataUrl: signatureUrl,
        remarks: payload.remarks,
        approverEmployeeId: currentEmployee.id,
        signedAt: payload.action === 'approve' ? now : null,
      })
      .where(eq(dailyActivityApprovals.id, payload.approvalId))

    if (payload.action === 'reject') {
      await db
        .update(dailyActivityApprovals)
        .set({ status: 'cancelled', remarks: '' })
        .where(
          and(
            eq(dailyActivityApprovals.sessionId, payload.sessionId),
            sql`${dailyActivityApprovals.stepOrder} > ${approvalRow.stepOrder}`
          )
        )
      await db
        .update(dailyActivitySessions)
        .set({ status: 'rejected', updatedAt: now })
        .where(eq(dailyActivitySessions.id, payload.sessionId))

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
          remarks: payload.remarks,
        })
      }

      await notifyWorkflowBellRecipients({
        recipientEmails: [empRow?.email].filter(Boolean),
        eventType: 'daily_activity_rejected',
        category: 'approval_requests',
        title: `Daily Activity Ditolak: ${session.sessionCode || ''}`,
        body: `Laporan aktivitas harian Anda ditolak oleh ${currentEmployee.name || 'Approver'}.${payload.remarks ? ` Alasan: ${payload.remarks}` : ''}`,
        url: `/dashboard/activity-hub/document/${payload.sessionId}`,
        tagPrefix: 'daily-activity-rejected',
        metadata: { sessionId: payload.sessionId },
      }).catch((bellErr) => console.error('Error notifying bell on reject:', bellErr))
    }

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

      if (nextStep) {
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
        // Final approval (Step 4 completed)
        await db
          .update(dailyActivitySessions)
          .set({ status: 'approved', approvedAt: now, updatedAt: now })
          .where(eq(dailyActivitySessions.id, payload.sessionId))

        const [empRow] = await db
          .select({ name: employees.name, email: employees.email })
          .from(employees)
          .where(eq(employees.id, session.employeeId))
          .limit(1)

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

          await notifyWorkflowBellRecipients({
            recipientEmails: [empRow.email],
            eventType: 'daily_activity_approved',
            category: 'approval_requests',
            title: `Daily Activity Disetujui: ${session.sessionCode || ''}`,
            body: `Daily Activity untuk sesi ${session.sessionCode || ''} telah disetujui sepenuhnya.`,
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

export async function getDailyActivityApprovalData(sessionId: number) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.email) return null

  const normalizedEmail = session.user.email.trim().toLowerCase()
  const [currentEmployeeByAuth] = session.user.id
    ? await db
        .select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
          siteId: employees.siteId,
          accessRole: employees.accessRole,
        })
        .from(employees)
        .where(eq(employees.authUserId, session.user.id))
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
    name: session.user.name || 'Admin',
    email: session.user.email,
    siteId: null,
    accessRole: (session.user as any)?.role || 'Super Admin',
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
    .where(eq(dailyActivitySessions.id, sessionId))
    .limit(1)

  if (!header) return null

  const isAdmin = ['Super Admin', 'Site Admin', 'HC Manager', 'Admin'].includes(
    currentEmployee.accessRole || ''
  )

  const approvals = await db
    .select()
    .from(dailyActivityApprovals)
    .where(eq(dailyActivityApprovals.sessionId, sessionId))
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
        eq(dailyActivitySessionItems.sessionId, sessionId),
        eq(dailyActivitySessionItems.isChecked, true)
      )
    )
    .orderBy(asc(dailyActivitySessionItems.sortOrder), asc(dailyActivitySessionItems.id))

  const sessionItems = itemRows.map((item) => {
    const durationMinutes =
      item.startedAt && item.endedAt && item.endedAt > item.startedAt
        ? Math.round((item.endedAt.getTime() - item.startedAt.getTime()) / 60000)
        : 0
    const hours = Math.floor(durationMinutes / 60)
    const mins = durationMinutes % 60
    return {
      id: item.id,
      label: item.snapshotLabel,
      group: item.snapshotGroupName || '',
      unitNumber: item.unitNumber || '',
      remark: item.remark || '',
      duration: durationMinutes > 0 ? (hours > 0 ? `${hours}j ${mins}m` : `${mins}m`) : '-',
      points: item.actualPoints || 0,
      sortOrder: item.sortOrder,
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

  return {
    sessionId: header.sessionId,
    sessionCode: header.sessionCode,
    workDate: header.workDate,
    shiftCode: header.shiftCode,
    status: header.status,
    submittedAt: header.submittedAt,
    approvedAt: header.approvedAt,
    employee: {
      id: header.employeeId,
      name: header.employeeName,
      sn: header.employeeSn,
      department: header.department,
      section: header.section,
      jobTitle: header.jobTitle,
    },
    site: {
      id: header.siteId,
      name: header.siteName,
      customerName: header.customerName,
    },
    totals: {
      itemCount,
      totalPoints,
    },
    sessionItems,
    approvals: approvals.map((a) => ({
      id: a.id,
      stepOrder: a.stepOrder,
      stepLabel: a.stepLabel,
      approverEmployeeId: a.approverEmployeeId,
      approverName: a.approverName,
      approverEmail: a.approverEmail,
      approverRole: a.approverRole,
      status: a.status,
      signatureDataUrl: a.signatureDataUrl ?? null,
      remarks: a.remarks,
      signedAt: a.signedAt,
    })),
    permissions: {
      canApprove,
      isCurrentEmployee: header.employeeId === currentEmployee.id,
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
    await db
      .update(dailyActivityApprovals)
      .set({
        status: 'approved',
        signatureDataUrl: payload.signatureDataUrl,
        remarks: payload.remarks ?? '',
        signedAt: now,
      })
      .where(eq(dailyActivityApprovals.id, approval.id))

    // Check for next step
    const [nextStep] = await db
      .select()
      .from(dailyActivityApprovals)
      .where(
        and(
          eq(dailyActivityApprovals.sessionId, approval.sessionId),
          sql`${dailyActivityApprovals.stepOrder} > ${approval.stepOrder}`
        )
      )
      .orderBy(asc(dailyActivityApprovals.stepOrder))
      .limit(1)

    if (nextStep) {
      if (nextStep.status !== 'approved') {
        await db
          .update(dailyActivityApprovals)
          .set({ status: 'pending' })
          .where(eq(dailyActivityApprovals.id, nextStep.id))
      }

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
      // All steps completed!
      await db
        .update(dailyActivitySessions)
        .set({ status: 'approved', approvedAt: now })
        .where(eq(dailyActivitySessions.id, approval.sessionId))

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

        if (sessionRow?.employeeEmail) {
          await sendDailyActivityCompletedEmail({
            sessionId: approval.sessionId,
            sessionCode: sessionRow.sessionCode || `ACT-${approval.sessionId}`,
            employeeName: sessionRow.employeeName || 'Karyawan',
            employeeEmail: sessionRow.employeeEmail,
            workDate: sessionRow.workDate,
          })

          await notifyWorkflowBellRecipients({
            recipientEmails: [sessionRow.employeeEmail],
            eventType: 'daily_activity_approved',
            category: 'approval_requests',
            title: `Daily Activity Disetujui: ${sessionRow.sessionCode || ''}`,
            body: `Laporan aktivitas harian Anda telah disetujui secara lengkap oleh seluruh approver.`,
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

    if (approval.stepOrder < 2) {
      return { success: false as const, error: 'Hanya jabatan Leader ke atas yang dapat mengembalikan (revert) dokumen untuk revisi.' }
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
  items?: Array<{
    id?: number
    label: string
    unitNumber?: string
    duration?: string
    points?: number
    remark?: string
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
}) {
  try {
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

    if (existingSession && (existingSession.status || '').toLowerCase() === 'rejected') {
      return {
        success: false as const,
        error: 'Aksi ditolak: Dokumen yang sudah ditolak (rejected) tidak dapat diedit atau diajukan ulang. Silakan buat dokumen baru.',
      }
    }

    const isCurrentlyReverted = (existingSession?.status || '').toLowerCase() === 'reverted'

    if (isCurrentlyReverted) {
      sessionUpdates.status = 'Submitted'

      const revertedSteps = await db
        .select()
        .from(dailyActivityApprovals)
        .where(
          and(
            eq(dailyActivityApprovals.sessionId, payload.sessionId),
            eq(dailyActivityApprovals.status, 'reverted')
          )
        )
        .orderBy(asc(dailyActivityApprovals.stepOrder))

      if (revertedSteps.length > 0) {
        const targetStep = revertedSteps[0]
        await db
          .update(dailyActivityApprovals)
          .set({
            status: 'pending',
            signatureDataUrl: null,
            signedAt: null,
          })
          .where(eq(dailyActivityApprovals.id, targetStep.id))

        const [sessionEmp] = existingSession?.employeeId
          ? await db.select({ name: employees.name, email: employees.email }).from(employees).where(eq(employees.id, existingSession.employeeId)).limit(1)
          : []

        const [siteRow] = existingSession?.siteId
          ? await db.select({ name: sites.name }).from(sites).where(eq(sites.id, existingSession.siteId)).limit(1)
          : []

        try {
          if (targetStep.approverEmail) {
            await sendDailyActivityStepApprovalEmail({
              sessionId: payload.sessionId,
              sessionCode: existingSession?.sessionCode || `ACT-${payload.sessionId}`,
              employeeName: sessionEmp?.name || 'Karyawan',
              workDate: existingSession?.workDate,
              siteName: siteRow?.name || '-',
              approverName: targetStep.approverName || 'Approver',
              approverEmail: targetStep.approverEmail,
              approvalStep: targetStep.stepLabel,
              approvalToken: targetStep.approvalToken,
            })
          }
        } catch (mailErr) {
          console.error('Error sending smart resume daily activity email:', mailErr)
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
        .select({ id: dailyActivitySessionItems.id })
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

      // Update or insert items
      for (let idx = 0; idx < payload.items.length; idx++) {
        const item = payload.items[idx]
        if (item.id && item.id > 0) {
          await db
            .update(dailyActivitySessionItems)
            .set({
              snapshotLabel: item.label,
              unitNumber: item.unitNumber ?? '',
              actualPoints: item.points ?? 0,
              remark: (payload.itemRemarks?.[item.id] ?? item.remark ?? '').substring(0, 600),
              sortOrder: idx + 1,
              updatedAt: new Date(),
            })
            .where(eq(dailyActivitySessionItems.id, item.id))
        } else if (item.label?.trim()) {
          await db.insert(dailyActivitySessionItems).values({
            sessionId: payload.sessionId,
            snapshotLabel: item.label.trim(),
            snapshotGroupName: 'Technical',
            unitNumber: item.unitNumber ?? '',
            actualPoints: item.points ?? 5,
            isChecked: true,
            sortOrder: idx + 1,
            remark: (item.remark ?? '').substring(0, 600),
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

            if (nextStep) {
              if (nextStep.status !== 'approved') {
                await db
                  .update(dailyActivityApprovals)
                  .set({ status: 'pending' })
                  .where(eq(dailyActivityApprovals.id, nextStep.id))

                if (nextStep.approverEmail) {
                  await sendDailyActivityStepApprovalEmail({
                    sessionId: payload.sessionId,
                    sessionCode: session?.sessionCode || `ACT-${payload.sessionId}`,
                    employeeName: sessionEmployee?.name || 'Karyawan',
                    workDate: session?.workDate,
                    siteName: siteRow?.name || '-',
                    approverName: nextStep.approverName || 'Approver',
                    approverEmail: nextStep.approverEmail,
                    approvalStep: nextStep.stepLabel,
                    approvalToken: nextStep.approvalToken,
                  })
                }
              }
            } else {
              // Final Step 4 approved
              await db
                .update(dailyActivitySessions)
                .set({ status: 'approved', approvedAt: new Date(), updatedAt: new Date() })
                .where(eq(dailyActivitySessions.id, payload.sessionId))

              if (sessionEmployee?.email) {
                await sendDailyActivityCompletedEmail({
                  sessionId: payload.sessionId,
                  sessionCode: session?.sessionCode || `ACT-${payload.sessionId}`,
                  employeeName: sessionEmployee.name || 'Karyawan',
                  employeeEmail: sessionEmployee.email,
                  workDate: session?.workDate,
                })
              }
            }
          }
        }
      }
    }

    safeRevalidatePath(`/dashboard/activity-hub/document/${payload.sessionId}`)
    safeRevalidatePath(`/dashboard/activity-hub/document/${payload.sessionId}/approval`)
    safeRevalidatePath(`/dashboard/activity-hub/approval`)

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

export async function createDailyActivitySessionAction(input: {
  employeeId: number
  workDate: string
  shiftCode: string
  siteId?: number | null
  leaderEmployeeId?: number | null
  leaderName?: string | null
  superiorEmployeeId?: number | null
  superiorName?: string | null
  managerEmployeeId?: number | null
  managerName?: string | null
  items?: Array<{
    label: string
    unitNumber?: string
    duration?: string
    points?: number
    remark?: string
  }>
}) {
  try {
    let targetEmpId = input.employeeId
    if (!targetEmpId) {
      const context = await getAuthenticatedEmployeeContext()
      targetEmpId = context.id
    }

    const [emp] = await db
      .select()
      .from(employees)
      .where(eq(employees.id, targetEmpId))
      .limit(1)

    if (!emp) {
      return { success: false as const, error: 'Karyawan tidak ditemukan.' }
    }

    // Fallback siteId if none is provided
    let siteId = input.siteId || emp.siteId
    if (!siteId) {
      const [firstSite] = await db.select({ id: sites.id }).from(sites).limit(1)
      siteId = firstSite?.id || 1
    }

    const dateFormatted = input.workDate ? input.workDate.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const sessionCode = `DAS-${dateFormatted}-${emp.employeeSn || emp.id}-${Math.floor(100 + Math.random() * 900)}`

    const parsedWorkDate = input.workDate
      ? new Date(`${input.workDate}T00:00:00.000Z`)
      : new Date()

    let validDeptId: number | null = null
    if (emp.departmentId) {
      const [dept] = await db.select({ id: masterDepartments.id }).from(masterDepartments).where(eq(masterDepartments.id, emp.departmentId)).limit(1)
      if (dept) validDeptId = dept.id
    }

    let validSecId: number | null = null
    if (emp.sectionId) {
      const [sec] = await db.select({ id: masterSections.id }).from(masterSections).where(eq(masterSections.id, emp.sectionId)).limit(1)
      if (sec) validSecId = sec.id
    }

    let validPosId: number | null = null
    if (emp.positionId) {
      const [pos] = await db.select({ id: masterPositions.id }).from(masterPositions).where(eq(masterPositions.id, emp.positionId)).limit(1)
      if (pos) validPosId = pos.id
    }

    const [created] = await db
      .insert(dailyActivitySessions)
      .values({
        employeeId: targetEmpId,
        sessionCode,
        workDate: parsedWorkDate,
        shiftCode: input.shiftCode || 'ALL',
        siteId,
        departmentId: validDeptId,
        sectionId: validSecId,
        positionId: validPosId,
        status: 'submitted',
        submittedAt: new Date(),
      })
      .returning()

    // Insert activity items if provided
    if (input.items && input.items.length > 0) {
      const itemsToInsert = input.items
        .filter((it) => it.label && it.label.trim().length > 0)
        .map((it, idx) => ({
          sessionId: created.id,
          snapshotLabel: it.label.trim(),
          snapshotGroupName: 'General',
          unitNumber: it.unitNumber?.trim() || '',
          remark: it.remark?.trim() || '',
          actualPoints: Number(it.points) || 5,
          isChecked: true,
          sortOrder: idx + 1,
          snapshotPayload: JSON.stringify({ duration: it.duration || '60m' }),
          startedAt: new Date(parsedWorkDate.getTime() + 8 * 3600000),
          endedAt: new Date(parsedWorkDate.getTime() + 9 * 3600000),
        }))

      if (itemsToInsert.length > 0) {
        await db.insert(dailyActivitySessionItems).values(itemsToInsert)
      }
    }

    const workflowSettings = await getDailyActivityWorkflowSettings()

    // 1. Resolve Leader
    let leaderEmpId = input.leaderEmployeeId
    let leaderName = input.leaderName
    let leaderEmail = ''

    if (leaderEmpId) {
      const [found] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email })
        .from(employees)
        .where(eq(employees.id, leaderEmpId))
        .limit(1)
      if (found) {
        leaderName = found.name
        leaderEmail = found.email || ''
      }
    } else if (emp.directManagerId) {
      const [found] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email })
        .from(employees)
        .where(eq(employees.id, emp.directManagerId))
        .limit(1)
      if (found) {
        leaderEmpId = found.id
        leaderName = found.name
        leaderEmail = found.email || ''
      }
    }
    if (!leaderName) {
      leaderName = 'Leader Lapangan'
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
      // Lookup in Workflow Settings Matrix by section or department
      const empSectionLower = (emp.section || '').trim().toLowerCase()
      const empDeptLower = (emp.department || '').trim().toLowerCase()

      const matchedSecConfig = (workflowSettings.approvalMatrix.sectionHeads || []).find((sh) => {
        const secLower = (sh.section || '').trim().toLowerCase()
        return secLower && (secLower === empSectionLower || empSectionLower.includes(secLower) || secLower.includes(empSectionLower) || secLower === empDeptLower)
      })

      if (matchedSecConfig?.name) {
        superiorName = matchedSecConfig.name
        superiorEmail = matchedSecConfig.email || ''
        if (matchedSecConfig.email) {
          const [matEmp] = await db
            .select({ id: employees.id })
            .from(employees)
            .where(sql`LOWER(TRIM(${employees.email})) = ${matchedSecConfig.email.trim().toLowerCase()}`)
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

    // Generate sequential approval steps (Karyawan, Leader / PJO, Section Head)
    await db.insert(dailyActivityApprovals).values([
      {
        sessionId: created.id,
        stepOrder: 1,
        stepLabel: 'Karyawan Sign',
        approverRole: 'employee',
        approverEmployeeId: targetEmpId,
        approverName: emp.name,
        approverEmail: emp.email || '',
        status: 'pending',
        approvalToken: step1Token,
        createdAt: new Date(),
      },
      {
        sessionId: created.id,
        stepOrder: 2,
        stepLabel: 'Leader / PJO',
        approverRole: 'leader',
        approverEmployeeId: leaderEmpId ?? null,
        approverName: leaderName,
        approverEmail: leaderEmail,
        status: 'waiting',
        approvalToken: step2Token,
        createdAt: new Date(),
      },
      {
        sessionId: created.id,
        stepOrder: 3,
        stepLabel: 'Section Head',
        approverRole: 'section_head',
        approverEmployeeId: superiorEmpId ?? null,
        approverName: superiorName,
        approverEmail: superiorEmail,
        status: 'waiting',
        approvalToken: step3Token,
        createdAt: new Date(),
      },
    ])

    // Send Step 1 email and in-app notification
    const [siteRow] = created.siteId
      ? await db.select({ name: sites.name }).from(sites).where(eq(sites.id, created.siteId)).limit(1)
      : []

    try {
      if (emp.email) {
        await publishInAppApprovalNotification({
          recipientEmail: emp.email,
          title: `Daily Activity: ${created.sessionCode}`,
          body: `Laporan aktivitas ${emp.name} telah dibuat dan siap disetujui.`,
          url: `/dashboard/activity-hub/document/${created.id}/approval`,
          eventType: 'daily_activity_created',
        })
        await sendDailyActivityStepApprovalEmail({
          sessionId: created.id,
          sessionCode: created.sessionCode,
          employeeName: emp.name,
          workDate: parsedWorkDate,
          siteName: siteRow?.name || '-',
          approverName: emp.name,
          approverEmail: emp.email,
          approvalStep: 'Karyawan Sign',
          approvalToken: step1Token,
        })
      }
    } catch (notifyErr) {
      console.warn('Non-blocking notification warning:', notifyErr)
    }

    try {
      safeRevalidatePath('/dashboard/activity-hub/approval')
      safeRevalidatePath('/dashboard/approval')
    } catch {}

    return { success: true as const, sessionId: created.id }
  } catch (err: any) {
    console.error('Error creating daily activity session:', err)
    return { success: false as const, error: err.message || 'Gagal membuat aktivitas harian.' }
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

export async function batchApproveDailyActivitySessionsAction(sessionIds: number[], remarks?: string) {
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

    if (!empRecord?.signatureDataUrl) {
      return {
        success: false as const,
        needsSignatureRegistration: true as const,
        error: 'Anda belum mendaftarkan tanda tangan. Daftarkan tanda tangan terlebih dahulu.',
      }
    }

    const sigUrl = empRecord.signatureDataUrl
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

      // Approve this step
      await db
        .update(dailyActivityApprovals)
        .set({
          status: 'approved',
          signatureDataUrl: sigUrl,
          signedAt: now,
          approverName: empRecord.name || waitingStep.approverName,
          approverEmployeeId: empRecord.id,
          remarks: remarks || 'Approved',
        })
        .where(eq(dailyActivityApprovals.id, waitingStep.id))

      // Check next step
      const [nextStep] = await db
        .select()
        .from(dailyActivityApprovals)
        .where(
          and(
            eq(dailyActivityApprovals.sessionId, sessionId),
            eq(dailyActivityApprovals.stepOrder, waitingStep.stepOrder + 1)
          )
        )
        .limit(1)

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

      if (nextStep) {
        // Next step is now active and pending approval
        await db
          .update(dailyActivityApprovals)
          .set({ status: 'pending' })
          .where(eq(dailyActivityApprovals.id, nextStep.id))

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
        // Final approval -> Complete session status
        await db
          .update(dailyActivitySessions)
          .set({
            status: 'Approved',
            approvedAt: now,
          })
          .where(eq(dailyActivitySessions.id, sessionId))

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

    const emp = await getCurrentEmployee()
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
        .set({ status: 'Rejected' })
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

    const emp = await getCurrentEmployee()
    if (!emp) {
      return { success: false as const, error: 'Sesi login tidak ditemukan.' }
    }

    const now = new Date()

    for (const sessionId of sessionIds) {
      // Find current active step (pending/waiting) to mark as reverted with the revert note
      const [activeStep] = await db
        .select()
        .from(dailyActivityApprovals)
        .where(
          and(
            eq(dailyActivityApprovals.sessionId, sessionId),
            sql`${dailyActivityApprovals.stepOrder} > 1`,
            or(
              eq(dailyActivityApprovals.status, 'pending'),
              eq(dailyActivityApprovals.status, 'waiting')
            )
          )
        )
        .orderBy(asc(dailyActivityApprovals.stepOrder))
        .limit(1)

      if (activeStep) {
        await db
          .update(dailyActivityApprovals)
          .set({
            status: 'reverted',
            remarks: remarks || `Dokumen dikembalikan oleh ${emp.name} untuk revisi.`,
            signedAt: null,
            signatureDataUrl: null,
            approverName: emp.name,
            approverEmployeeId: emp.id,
          })
          .where(eq(dailyActivityApprovals.id, activeStep.id))
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
        .select({ sessionCode: dailyActivitySessions.sessionCode })
        .from(dailyActivitySessions)
        .where(eq(dailyActivitySessions.id, sessionId))
        .limit(1)

      try {
        if (step1?.approverEmail) {
          await sendDailyActivityRevertedEmail({
            sessionId,
            sessionCode: sessionRow?.sessionCode || `ACT-${sessionId}`,
            targetApproverName: step1.approverName || 'Karyawan',
            targetApproverEmail: step1.approverEmail,
            managerName: emp.name || 'Atasan',
            revertReason: remarks || 'Dokumen dikembalikan untuk revisi.',
          })

          await notifyWorkflowBellRecipients({
            recipientEmails: [step1.approverEmail],
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

export async function singleApproveDailyActivityAction(sessionId: number, remarks?: string) {
  return batchApproveDailyActivitySessionsAction([sessionId], remarks)
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



