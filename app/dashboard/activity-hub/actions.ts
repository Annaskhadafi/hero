"use server";

import { and, asc, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
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
  overtimeCommandLetters,
  overtimeRequestLeaderPermissions,
  penaltyEvents,
  pointDisputes,
  pointEvents,
  sites,
  streakRecords,
} from "@/db/schema/hero";
import {
  type ActivityLibraryImportState,
  getActivityLibraryImportValue,
  parseActivityLibraryBoolean,
  parseActivityLibraryCsv,
  parseActivityLibraryInteger,
} from "@/lib/activity-library-import";
import {
  DAILY_ACTIVITY_REVALIDATE_PATHS,
  ensureDailyActivitySeedData,
  getDailyActivityConfigMap,
  getManagedEmployeeIdsForLead,
} from "@/lib/daily-activity";
import { auth } from "@/lib/auth";
import { uploadAnyFileToS3 } from "@/lib/s3-storage";

const MAX_ACTIVITY_PHOTO_SIZE = 5 * 1024 * 1024;
const MAX_SIGNATURE_FILE_SIZE = 2 * 1024 * 1024;

const optionalPositiveInt = z.preprocess(
  (value) => {
    if (value === "" || value == null || value === "0") {
      return undefined;
    }

    return value;
  },
  z.coerce.number().int().positive().optional(),
);

const formBoolean = (defaultValue = false) =>
  z.preprocess((value) => {
    if (value === "" || value == null) {
      return defaultValue;
    }

    if (typeof value === "string") {
      return value === "true" || value === "on";
    }

    return Boolean(value);
  }, z.boolean());

const manageLibrarySchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: optionalPositiveInt,
  activityCode: z.string().trim().min(2).max(24).optional().default(""),
  activityName: z.string().trim().min(3).max(160).optional().default(""),
  category: z.string().trim().min(3).max(50).optional().default("Technical"),
  siteId: optionalPositiveInt,
  departmentId: optionalPositiveInt,
  sectionId: optionalPositiveInt,
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
  isAssignable: formBoolean(true),
  isSelfInput: formBoolean(true),
  approvalRequired: formBoolean(true),
  autoApproveIfGpsValid: formBoolean(false),
  isActive: formBoolean(true),
  createdByEmployeeId: optionalPositiveInt,
});

const manageAssignmentSchema = z.object({
  intent: z.enum(["create", "update-status", "delete"]),
  id: optionalPositiveInt,
  assignedByEmployeeId: z.coerce.number().int().positive().optional(),
  assignedToEmployeeId: z.coerce.number().int().positive().optional(),
  siteId: z.coerce.number().int().positive().optional(),
  libraryActivityId: optionalPositiveInt,
  customJobName: z.string().trim().max(160).optional().default(""),
  priority: z.string().trim().min(3).max(40).optional().default("Normal"),
  estimatedDuration: z.coerce.number().int().min(5).max(720).optional().default(60),
  notes: z.string().trim().max(1000).optional().default(""),
  assignmentType: z.string().trim().min(3).max(40).optional().default("individual"),
  assignedDate: z.string().trim().optional().default(""),
  deadline: z.string().trim().optional().default(""),
  status: z.string().trim().min(3).max(40).optional().default("NOT_STARTED"),
  isMandatory: formBoolean(false),
  isRecurring: formBoolean(false),
  recurrenceRule: z.string().trim().max(160).optional().default(""),
});

const manageRouteTemplateSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: optionalPositiveInt,
  routeCode: z.string().trim().min(2).max(40).optional().default(""),
  routeName: z.string().trim().min(3).max(160).optional().default(""),
  description: z.string().trim().max(600).optional().default(""),
  siteId: optionalPositiveInt,
  departmentId: optionalPositiveInt,
  sectionId: optionalPositiveInt,
  positionId: optionalPositiveInt,
  shiftCode: z.string().trim().min(2).max(24).optional().default("ALL"),
  versionLabel: z.string().trim().min(1).max(24).optional().default("v1"),
  mobileEnabled: formBoolean(true),
  approvalRequired: formBoolean(false),
  isActive: formBoolean(true),
});

const manageRouteGroupSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: optionalPositiveInt,
  routeTemplateId: optionalPositiveInt,
  groupKey: z.string().trim().min(2).max(40).optional().default(""),
  groupName: z.string().trim().min(2).max(120).optional().default(""),
  description: z.string().trim().max(400).optional().default(""),
  sortOrder: z.coerce.number().int().min(1).max(999).optional().default(1),
  isRequired: formBoolean(true),
});

const manageRouteItemSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: optionalPositiveInt,
  routeGroupId: optionalPositiveInt,
  libraryActivityId: optionalPositiveInt,
  itemCode: z.string().trim().max(40).optional().default(""),
  itemLabel: z.string().trim().min(2).max(160).optional().default(""),
  itemDescription: z.string().trim().max(600).optional().default(""),
  pointOverride: z.preprocess(
    (value) => {
      if (value === "" || value == null) return undefined;
      return value;
    },
    z.coerce.number().int().min(0).max(1000).optional(),
  ),
  sortOrder: z.coerce.number().int().min(1).max(999).optional().default(1),
  requiresUnit: formBoolean(false),
  requiresTime: formBoolean(true),
  requiresRemark: formBoolean(false),
  requiresPhoto: formBoolean(false),
  requiresChecklistEvidence: formBoolean(false),
  isOptional: formBoolean(false),
  allowCustomUnit: formBoolean(true),
});

const manageSectionOverrideSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: optionalPositiveInt,
  siteId: optionalPositiveInt,
  departmentId: optionalPositiveInt,
  sectionId: optionalPositiveInt,
  positionId: optionalPositiveInt,
  libraryActivityId: optionalPositiveInt,
  overrideLabel: z.string().trim().max(160).optional().default(""),
  overridePoints: z.preprocess(
    (value) => {
      if (value === "" || value == null) return undefined;
      return value;
    },
    z.coerce.number().int().min(0).max(1000).optional(),
  ),
  reason: z.string().trim().max(600).optional().default(""),
  isActive: formBoolean(true),
});

const overtimeCommandLetterLineSchema = z.object({
  assignedEmployeeId: z.coerce.number().int().positive(),
  routeTemplateId: optionalPositiveInt,
  routeItemId: optionalPositiveInt,
  libraryActivityId: optionalPositiveInt,
  lineLabel: z.string().trim().min(2).max(160),
  lineDescription: z.string().trim().max(600).optional().default(""),
  targetUnit: z.string().trim().max(120).optional().default(""),
  estimatedMinutes: z.coerce.number().int().min(1).max(1440).optional().default(60),
  plannedPoints: z.coerce.number().int().min(0).max(2000).optional().default(0),
  sortOrder: z.coerce.number().int().min(1).max(999).optional().default(1),
  isCustomLine: z.boolean().optional().default(false),
});

const manageOvertimeCommandLetterSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: optionalPositiveInt,
  title: z.string().trim().min(3).max(180).optional().default(""),
  workDate: z.string().trim().optional().default(""),
  plannedStartAt: z.string().trim().optional().default(""),
  plannedEndAt: z.string().trim().optional().default(""),
  status: z.string().trim().min(3).max(40).optional().default("draft"),
  requestNotes: z.string().trim().max(1200).optional().default(""),
  executionNotes: z.string().trim().max(1200).optional().default(""),
  sectionId: optionalPositiveInt,
  positionId: optionalPositiveInt,
  lineItemsJson: z.string().trim().max(120000).optional().default("[]"),
});

const transitionOvertimeCommandLetterStatusSchema = z.object({
  id: z.coerce.number().int().positive(),
  targetStatus: z.enum(["draft", "submitted", "approved", "closed"]),
});

const manageOvertimeRequestLeaderPermissionSchema = z.object({
  leaderEmployeeId: z.coerce.number().int().positive(),
  isActive: formBoolean(false),
  note: z.string().trim().max(600).optional().default(""),
});

const submitActivitySchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  assignmentId: optionalPositiveInt,
  libraryActivityId: optionalPositiveInt,
  routeTemplateId: optionalPositiveInt,
  overtimeCommandLetterId: optionalPositiveInt,
  sourceMode: z.enum(["assigned", "self_input", "custom"]).optional().default("self_input"),
  customActivityName: z.string().trim().max(160).optional().default(""),
  customActivityDescription: z.string().trim().max(1200).optional().default(""),
  routeShiftCode: z.string().trim().max(24).optional().default(""),
  routeSummaryRemark: z.string().trim().max(1200).optional().default(""),
  routeSessionItemsJson: z.string().trim().max(120000).optional().default(""),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1),
  equipmentNo: z.string().trim().max(80).optional().default(""),
  materialUsed: z.string().trim().max(500).optional().default(""),
  notes: z.string().trim().max(1200).optional().default(""),
  gpsLat: z.string().trim().max(80).optional().default(""),
  gpsLng: z.string().trim().max(80).optional().default(""),
  gpsValid: formBoolean(false),
  photoUrl: z.string().trim().max(1000).optional().default(""),
});

const updateConfigSchema = z.object({
  id: z.coerce.number().int().positive(),
  configValue: z.string().trim().min(1).max(160),
  isActive: formBoolean(true),
});

const manageModifierSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: optionalPositiveInt,
  siteId: optionalPositiveInt,
  createdByEmployeeId: optionalPositiveInt,
  eventName: z.string().trim().min(3).max(160).optional().default(""),
  description: z.string().trim().max(600).optional().default(""),
  multiplier: z.coerce.number().int().min(100).max(500).optional().default(100),
  startDate: z.string().trim().optional().default(""),
  endDate: z.string().trim().optional().default(""),
  isActive: formBoolean(true),
});

const submitDisputeSchema = z.object({
  penaltyEventId: z.coerce.number().int().positive(),
  employeeId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(20).max(1200),
  evidenceUrls: z.string().trim().max(4000).optional().default(""),
});

const resolveDisputeSchema = z.object({
  disputeId: z.coerce.number().int().positive(),
  resolvedByEmployeeId: z.coerce.number().int().positive(),
  decision: z.enum(["approved", "rejected"]),
  resolutionNotes: z.string().trim().min(5).max(1200),
});

type DailyActivitySubmitActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

type DailyActivityDocumentSignoffActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const routeSessionItemSchema = z.object({
  routeItemId: optionalPositiveInt,
  overtimeCommandLetterItemId: optionalPositiveInt,
  libraryActivityId: optionalPositiveInt,
  snapshotLabel: z.string().trim().min(1).max(160),
  snapshotGroupName: z.string().trim().max(160).optional().default(""),
  snapshotPayload: z.record(z.string(), z.unknown()).optional().default({}),
  unitNumber: z.string().trim().max(80).optional().default(""),
  remark: z.string().trim().max(600).optional().default(""),
  startedAt: z.string().trim().optional().default(""),
  endedAt: z.string().trim().optional().default(""),
  isChecked: z.boolean(),
  actualPoints: z.coerce.number().int().min(0).max(1000).optional(),
  sortOrder: z.coerce.number().int().min(1).max(999).optional().default(1),
});

const updateDailyActivitySessionDocumentSignoffSchema = z.object({
  sessionId: z.coerce.number().int().positive(),
  employeeSignerName: z.string().trim().max(120).optional().default(""),
  customerSignerName: z.string().trim().max(120).optional().default(""),
  hrCheckerName: z.string().trim().max(120).optional().default(""),
  hrChecklistStatus: z.enum(["pending", "checked", "revision"]).optional().default("pending"),
  hrChecklistNote: z.string().trim().max(1200).optional().default(""),
});

function revalidateDailyActivitySurfaces() {
  for (const path of DAILY_ACTIVITY_REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

async function getAuthenticatedEmployeeContext() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.email) {
    throw new Error("Sesi login tidak ditemukan.");
  }

  const [employeeByAuthUserId] =
    session.user.id
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
      : [];
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
          .limit(1);

  if (employee) {
    if (!employee.authUserId && session.user.id) {
      await db
        .update(employees)
        .set({ authUserId: session.user.id })
        .where(eq(employees.id, employee.id));
    }

    return {
      ...employee,
      authUserId: employee.authUserId ?? session.user.id ?? null,
    };
  }

  throw new Error("Profil karyawan login tidak ditemukan.");
}

function getReadableActionError(
  error: unknown,
  fallbackMessage: string,
) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? fallbackMessage;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}

function normalizeEvidenceUrls(value: string) {
  if (value.trim().length === 0) {
    return JSON.stringify([]);
  }

  const urls = value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  return JSON.stringify(urls);
}

function buildDailySessionCode(employeeId: number, routeTemplateId: number | null, workDate: Date) {
  const dateCode = workDate.toISOString().slice(0, 10).replaceAll("-", "");
  return `DAS-${dateCode}-${employeeId}-${routeTemplateId ?? 0}`;
}

function buildSplNumber(siteId: number, employeeId: number, workDate: Date) {
  const dateCode = workDate.toISOString().slice(0, 10).replaceAll("-", "");
  const entropy = `${Date.now()}`.slice(-4);
  return `SPL-${siteId}-${employeeId}-${dateCode}-${entropy}`;
}

function parseRouteSessionItems(value: string) {
  if (value.trim().length === 0) {
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Payload checklist route tidak valid.");
  }

  return z.array(routeSessionItemSchema).parse(parsed);
}

function parseOvertimeCommandLetterLines(value: string) {
  let parsed: unknown = [];

  try {
    parsed = value.trim().length === 0 ? [] : JSON.parse(value);
  } catch {
    throw new Error("Payload line SPL tidak valid.");
  }

  return z.array(overtimeCommandLetterLineSchema).parse(parsed);
}

function canManageOvertimeRequestSettings(
  employee: Awaited<ReturnType<typeof getAuthenticatedEmployeeContext>>,
) {
  return ["Super Admin", "Site Admin", "HC Manager"].includes(employee.accessRole);
}

async function getOvertimeRequestLeaderPermission(
  employee: Awaited<ReturnType<typeof getAuthenticatedEmployeeContext>>,
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
        eq(overtimeRequestLeaderPermissions.leaderEmployeeId, employee.id),
      ),
    )
    .limit(1);

  return permission ?? null;
}

async function assertOvertimeRequestCreationAccess(
  employee: Awaited<ReturnType<typeof getAuthenticatedEmployeeContext>>,
) {
  const permission = await getOvertimeRequestLeaderPermission(employee);

  if (permission?.isActive) {
    return permission;
  }

  if (canManageOvertimeRequestSettings(employee)) {
    return permission;
  }

  throw new Error("Anda belum diizinkan membuat pengajuan lembur. Aktifkan leader ini di pengaturan dulu.");
}

async function uploadSignatureFile(file: FormDataEntryValue | null, prefix: string) {
  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("File tanda tangan harus berupa gambar.");
  }

  if (file.size > MAX_SIGNATURE_FILE_SIZE) {
    throw new Error("File tanda tangan terlalu besar. Maksimal 2MB.");
  }

  const uploaded = await uploadAnyFileToS3(file, prefix);
  return uploaded.url;
}

const overtimeCommandLetterStatusTransitions: Record<string, readonly string[]> = {
  draft: ["submitted"],
  submitted: ["draft", "approved"],
  approved: ["submitted", "closed"],
  closed: ["approved"],
} as const;

async function syncDailyRouteSessionForActivity(params: {
  employee: Awaited<ReturnType<typeof getAuthenticatedEmployeeContext>>;
  payload: z.infer<typeof submitActivitySchema>;
  submissionTime: Date;
  startTime: Date;
}) {
  const routeItems = parseRouteSessionItems(params.payload.routeSessionItemsJson);
  const hasRoutePayload =
    Boolean(params.payload.routeTemplateId) ||
    Boolean(params.payload.overtimeCommandLetterId) ||
    routeItems.length > 0;

  if (!hasRoutePayload) {
    return null;
  }

  const workDate = startOfDay(params.startTime);
  const workDateEnd = endOfDay(params.startTime);
  const [existingSession] = await db
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
          ? eq(dailyActivitySessions.overtimeCommandLetterId, params.payload.overtimeCommandLetterId)
          : sql`${dailyActivitySessions.overtimeCommandLetterId} is null`,
      ),
    )
    .orderBy(desc(dailyActivitySessions.updatedAt))
    .limit(1);

  const sessionValues = {
    siteId: params.employee.siteId,
    employeeId: params.employee.id,
    departmentId: params.employee.departmentId ?? null,
    sectionId: params.employee.sectionId ?? null,
    positionId: params.employee.positionId ?? null,
    routeTemplateId: params.payload.routeTemplateId ?? null,
    overtimeCommandLetterId: params.payload.overtimeCommandLetterId ?? null,
    legacyAssignmentId: params.payload.assignmentId ?? null,
    shiftCode: params.payload.routeShiftCode || "ALL",
    workDate,
    status: routeItems.some((item) => item.isChecked) ? "submitted" : "draft",
    submissionSource:
      params.payload.overtimeCommandLetterId != null
        ? "spl_route"
        : params.payload.routeTemplateId
          ? "route"
          : params.payload.sourceMode,
    startedAt: params.startTime,
    submittedAt: params.submissionTime,
    approvedAt: null,
    summaryRemark: params.payload.routeSummaryRemark,
    updatedAt: new Date(),
  };

  const sessionId =
    existingSession?.id ??
    (
      await db
        .insert(dailyActivitySessions)
        .values({
          ...sessionValues,
          sessionCode: buildDailySessionCode(
            params.employee.id,
            params.payload.routeTemplateId ?? null,
            workDate,
          ),
          createdAt: new Date(),
        })
        .returning({ id: dailyActivitySessions.id })
    )[0].id;

  if (existingSession) {
    await db
      .update(dailyActivitySessions)
      .set(sessionValues)
      .where(eq(dailyActivitySessions.id, existingSession.id));
  }

  await db.delete(dailyActivitySessionItems).where(eq(dailyActivitySessionItems.sessionId, sessionId));

  if (routeItems.length > 0) {
    const splLineRows =
      params.payload.overtimeCommandLetterId == null
        ? []
        : await db
            .select({
              id: overtimeCommandLetterItems.id,
              routeItemId: overtimeCommandLetterItems.routeItemId,
              libraryActivityId: overtimeCommandLetterItems.libraryActivityId,
            })
            .from(overtimeCommandLetterItems)
            .where(eq(overtimeCommandLetterItems.overtimeCommandLetterId, params.payload.overtimeCommandLetterId))
            .orderBy(asc(overtimeCommandLetterItems.sortOrder), asc(overtimeCommandLetterItems.id));

    const unusedLineIds = new Set(splLineRows.map((row) => row.id));

    function matchSplLine(item: (typeof routeItems)[number]) {
      if (item.overtimeCommandLetterItemId != null) {
        return item.overtimeCommandLetterItemId;
      }

      const matched =
        splLineRows.find(
          (row) =>
            unusedLineIds.has(row.id) &&
            row.routeItemId != null &&
            item.routeItemId != null &&
            row.routeItemId === item.routeItemId,
        ) ??
        splLineRows.find(
          (row) =>
            unusedLineIds.has(row.id) &&
            row.libraryActivityId != null &&
            item.libraryActivityId != null &&
            row.libraryActivityId === item.libraryActivityId,
        ) ??
        null;

      if (matched) {
        unusedLineIds.delete(matched.id);
      }

      return matched?.id ?? null;
    }

    await db.insert(dailyActivitySessionItems).values(
      routeItems.map((item) => ({
        sessionId,
        routeItemId: item.routeItemId ?? null,
        libraryActivityId: item.libraryActivityId ?? null,
        overtimeCommandLetterItemId: matchSplLine(item),
        snapshotLabel: item.snapshotLabel,
        snapshotGroupName: item.snapshotGroupName,
        snapshotPayload: JSON.stringify(item.snapshotPayload ?? {}),
        startedAt: item.startedAt ? parseDateTime(item.startedAt, "Checklist start time") : null,
        endedAt: item.endedAt ? parseDateTime(item.endedAt, "Checklist end time") : null,
        checkedAt: item.isChecked ? params.submissionTime : null,
        unitNumber: item.unitNumber,
        remark: item.remark,
        actualPoints: item.isChecked ? item.actualPoints ?? 0 : 0,
        isChecked: item.isChecked,
        isCustomItem: false,
        photoCount: 0,
        sortOrder: item.sortOrder,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    );
  }

  return sessionId;
}

function normalizeImportLookup(value: string | number | null | undefined) {
  return `${value ?? ""}`.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

function resolveMasterReference(
  value: string,
  rows: Array<{ id: number; code: string; name: string }>,
) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const numericId = Number(trimmed);
  if (Number.isInteger(numericId) && numericId > 0) {
    return rows.find((row) => row.id === numericId)?.id ?? null;
  }

  const normalized = normalizeImportLookup(trimmed);
  return (
    rows.find(
      (row) =>
        normalizeImportLookup(row.code) === normalized ||
        normalizeImportLookup(row.name) === normalized,
    )?.id ?? null
  );
}

function resolveSiteReference(
  value: string,
  rows: Array<{ id: number; contractNumber: string; name: string; location: string }>,
) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const numericId = Number(trimmed);
  if (Number.isInteger(numericId) && numericId > 0) {
    return rows.find((row) => row.id === numericId)?.id ?? null;
  }

  const normalized = normalizeImportLookup(trimmed);
  return (
    rows.find(
      (row) =>
        normalizeImportLookup(row.name) === normalized ||
        normalizeImportLookup(row.location) === normalized ||
        normalizeImportLookup(row.contractNumber) === normalized,
    )?.id ?? null
  );
}

async function getImportCsvText(formData: FormData) {
  const file = formData.get("file");
  if (
    file &&
    typeof file === "object" &&
    "size" in file &&
    "text" in file &&
    typeof file.text === "function" &&
    Number(file.size) > 0
  ) {
    return file.text();
  }

  const rawCsv = formData.get("rawCsv");
  return typeof rawCsv === "string" ? rawCsv : "";
}

function parseDateTime(value: string, label: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} tidak valid.`);
  }

  return parsed;
}

function startOfDay(reference: Date) {
  return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
}

function endOfDay(reference: Date) {
  return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 23, 59, 59, 999);
}

function getSubmissionCategory(submissionTime: Date, activityEndTime: Date) {
  const sameDay =
    submissionTime.getFullYear() === activityEndTime.getFullYear() &&
    submissionTime.getMonth() === activityEndTime.getMonth() &&
    submissionTime.getDate() === activityEndTime.getDate();

  if (!sameDay) {
    return "backdated";
  }

  const minutes = submissionTime.getHours() * 60 + submissionTime.getMinutes();
  if (minutes <= 12 * 60) {
    return "on_time_morning";
  }
  if (minutes <= 17 * 60) {
    return "on_time";
  }
  if (minutes <= 20 * 60) {
    return "late_minor";
  }

  return "late_major";
}

function getPenaltyPoints(category: string, configMap: Map<string, number>) {
  switch (category) {
    case "late_minor":
      return Math.abs(configMap.get("penalty_pen_02") ?? -2);
    case "late_major":
      return Math.abs(configMap.get("penalty_pen_03") ?? -5);
    case "backdated":
      return 10;
    default:
      return 0;
  }
}

async function resolveApprover(employeeId: number, assignmentId?: number) {
  const [employee] = await db
    .select({
      directManagerId: employees.directManagerId,
      siteId: employees.siteId,
      department: employees.department,
    })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (!employee) {
    return null;
  }

  if (employee.directManagerId) {
    const [directManager] = await db
      .select({
        id: employees.id,
        name: employees.name,
      })
      .from(employees)
      .where(eq(employees.id, employee.directManagerId))
      .limit(1);

    if (directManager) {
      return directManager;
    }
  }

  if (assignmentId) {
    const [assignment] = await db
      .select({
        assignedByEmployeeId: jobAssignments.assignedByEmployeeId,
      })
      .from(jobAssignments)
      .where(eq(jobAssignments.id, assignmentId))
      .limit(1);

    if (assignment?.assignedByEmployeeId) {
      const [approver] = await db
        .select({
          id: employees.id,
          name: employees.name,
        })
        .from(employees)
        .where(eq(employees.id, assignment.assignedByEmployeeId))
        .limit(1);

      if (approver) {
        return approver;
      }
    }
  }

  const [fallbackApprover] = await db
    .select({
      id: employees.id,
      name: employees.name,
    })
    .from(employees)
    .where(
      and(
        eq(employees.siteId, employee.siteId),
        eq(employees.isActive, true),
        or(
          sql`lower(${employees.role}) like '%foreman%'`,
          sql`lower(${employees.role}) like '%leader%'`,
          sql`lower(${employees.accessRole}) like '%admin%'`,
        ),
      ),
    )
    .orderBy(desc(employees.id))
    .limit(1);

  return fallbackApprover ?? null;
}

async function updateStreakForEmployee(employeeId: number, activityDate: Date) {
  const [existing] = await db
    .select()
    .from(streakRecords)
    .where(eq(streakRecords.employeeId, employeeId))
    .limit(1);

  if (!existing) {
    await db.insert(streakRecords).values({
      employeeId,
      streakStartDate: activityDate,
      currentStreakDays: 1,
      longestStreakDays: 1,
      lastActivityDate: activityDate,
      streakBonusActive: false,
      updatedAt: new Date(),
    });

    return;
  }

  const lastDate = existing.lastActivityDate ? startOfDay(existing.lastActivityDate) : null;
  const currentDate = startOfDay(activityDate);
  const diffDays =
    lastDate == null ? 0 : Math.round((currentDate.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));
  const currentStreak =
    diffDays <= 0 ? existing.currentStreakDays : diffDays === 1 ? existing.currentStreakDays + 1 : 1;
  const longestStreak = Math.max(existing.longestStreakDays, currentStreak);

  await db
    .update(streakRecords)
    .set({
      currentStreakDays: currentStreak,
      longestStreakDays: longestStreak,
      lastActivityDate: activityDate,
      streakBonusActive: currentStreak >= 5,
      updatedAt: new Date(),
    })
    .where(eq(streakRecords.id, existing.id));
}

export async function manageActivityLibraryAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = manageLibrarySchema.parse(Object.fromEntries(formData));

  if (payload.intent === "delete") {
    if (!payload.id) {
      throw new Error("Library activity tidak valid.");
    }

    await db.delete(activityLibraries).where(eq(activityLibraries.id, payload.id));
    revalidateDailyActivitySurfaces();
    return;
  }

  const values = {
    activityCode: payload.activityCode,
    activityName: payload.activityName,
    category: payload.category,
    departmentId: payload.departmentId ?? null,
    sectionId: payload.sectionId ?? null,
    siteId: payload.siteId ?? null,
    basePoints: payload.basePoints,
    complexityLevel: payload.complexityLevel,
    requiresPhoto: payload.requiresPhoto,
    requiresEquipmentNo: payload.requiresEquipmentNo,
    requiresDuration: payload.requiresDuration,
    requiresLocationGps: payload.requiresLocationGps,
    requiresMaterialUsed: payload.requiresMaterialUsed,
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
  };

  if (payload.intent === "create") {
    await db.insert(activityLibraries).values({
      ...values,
      createdAt: new Date(),
    });
  } else {
    if (!payload.id) {
      throw new Error("Library activity tidak valid.");
    }

    await db.update(activityLibraries).set(values).where(eq(activityLibraries.id, payload.id));
  }

  revalidateDailyActivitySurfaces();
}

export async function manageActivityRouteTemplateAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = manageRouteTemplateSchema.parse(Object.fromEntries(formData));
  const currentEmployee = await getAuthenticatedEmployeeContext();

  if (payload.intent === "delete") {
    if (!payload.id) {
      throw new Error("Route template tidak valid.");
    }

    await db.delete(activityRouteTemplates).where(eq(activityRouteTemplates.id, payload.id));
    revalidateDailyActivitySurfaces();
    return;
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
  };

  if (payload.intent === "create") {
    await db.insert(activityRouteTemplates).values({
      ...values,
      effectiveFrom: new Date(),
      createdAt: new Date(),
    });
  } else {
    if (!payload.id) {
      throw new Error("Route template tidak valid.");
    }

    await db.update(activityRouteTemplates).set(values).where(eq(activityRouteTemplates.id, payload.id));
  }

  revalidateDailyActivitySurfaces();
}

export async function manageActivityRouteGroupAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = manageRouteGroupSchema.parse(Object.fromEntries(formData));

  if (payload.intent === "delete") {
    if (!payload.id) {
      throw new Error("Route group tidak valid.");
    }

    await db.delete(activityRouteGroups).where(eq(activityRouteGroups.id, payload.id));
    revalidateDailyActivitySurfaces();
    return;
  }

  if (!payload.routeTemplateId && payload.intent === "create") {
    throw new Error("Route template wajib dipilih.");
  }

  const values = {
    routeTemplateId: payload.routeTemplateId ?? undefined,
    groupKey: payload.groupKey,
    groupName: payload.groupName,
    description: payload.description,
    sortOrder: payload.sortOrder,
    isRequired: payload.isRequired,
    updatedAt: new Date(),
  };

  if (payload.intent === "create") {
    await db.insert(activityRouteGroups).values({
      routeTemplateId: payload.routeTemplateId!,
      groupKey: payload.groupKey,
      groupName: payload.groupName,
      description: payload.description,
      sortOrder: payload.sortOrder,
      isRequired: payload.isRequired,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    if (!payload.id) {
      throw new Error("Route group tidak valid.");
    }

    await db.update(activityRouteGroups).set(values).where(eq(activityRouteGroups.id, payload.id));
  }

  revalidateDailyActivitySurfaces();
}

export async function manageActivityRouteItemAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = manageRouteItemSchema.parse(Object.fromEntries(formData));

  if (payload.intent === "delete") {
    if (!payload.id) {
      throw new Error("Route item tidak valid.");
    }

    await db.delete(activityRouteItems).where(eq(activityRouteItems.id, payload.id));
    revalidateDailyActivitySurfaces();
    return;
  }

  if (!payload.routeGroupId && payload.intent === "create") {
    throw new Error("Route group wajib dipilih.");
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
  };

  if (payload.intent === "create") {
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
    });
  } else {
    if (!payload.id) {
      throw new Error("Route item tidak valid.");
    }

    await db.update(activityRouteItems).set(values).where(eq(activityRouteItems.id, payload.id));
  }

  revalidateDailyActivitySurfaces();
}

export async function manageActivitySectionOverrideAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = manageSectionOverrideSchema.parse(Object.fromEntries(formData));
  const currentEmployee = await getAuthenticatedEmployeeContext();

  if (payload.intent === "delete") {
    if (!payload.id) {
      throw new Error("Override section tidak valid.");
    }

    await db.delete(activitySectionPointOverrides).where(eq(activitySectionPointOverrides.id, payload.id));
    revalidateDailyActivitySurfaces();
    return;
  }

  if (!payload.libraryActivityId) {
    throw new Error("Library activity wajib dipilih.");
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
  };

  if (payload.intent === "create") {
    await db.insert(activitySectionPointOverrides).values({
      ...values,
      createdAt: new Date(),
    });
  } else {
    if (!payload.id) {
      throw new Error("Override section tidak valid.");
    }

    await db
      .update(activitySectionPointOverrides)
      .set(values)
      .where(eq(activitySectionPointOverrides.id, payload.id));
  }

  revalidateDailyActivitySurfaces();
}

export async function importActivityLibraryAction(
  _state: ActivityLibraryImportState,
  formData: FormData,
): Promise<ActivityLibraryImportState> {
  try {
    await ensureDailyActivitySeedData();

    const rawCsv = (await getImportCsvText(formData)).trim();
    if (!rawCsv) {
      return {
        status: "error",
        message: "CSV kosong. Upload file atau paste data example dulu.",
      };
    }

    const parsed = parseActivityLibraryCsv(rawCsv);
    if (parsed.records.length === 0) {
      return {
        status: "error",
        message: "CSV tidak punya baris data.",
      };
    }

    const createdByEmployeeIdValue = Number(formData.get("createdByEmployeeId"));
    const createdByEmployeeId =
      Number.isInteger(createdByEmployeeIdValue) && createdByEmployeeIdValue > 0
        ? createdByEmployeeIdValue
        : null;
    const [departmentRows, sectionRows, siteRows] = await Promise.all([
      db
        .select({ id: masterDepartments.id, code: masterDepartments.code, name: masterDepartments.name })
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
    ]);

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let duplicateCodeCount = 0;
    const recordsByActivityCode = new Map<string, Record<string, string>>();

    for (const row of parsed.records) {
      const activityCode = getActivityLibraryImportValue(row, "activityCode");
      const normalizedActivityCode = activityCode.trim().toLowerCase();

      if (!normalizedActivityCode) {
        continue;
      }

      if (recordsByActivityCode.has(normalizedActivityCode)) {
        duplicateCodeCount += 1;
      }

      recordsByActivityCode.set(normalizedActivityCode, row);
    }

    for (const row of recordsByActivityCode.values()) {
      const activityCode = getActivityLibraryImportValue(row, "activityCode");
      const activityName = getActivityLibraryImportValue(row, "activityName");

      if (!activityCode || !activityName) {
        skippedCount += 1;
        continue;
      }

      const sectionId = resolveMasterReference(getActivityLibraryImportValue(row, "section"), sectionRows);
      const section = sectionId ? sectionRows.find((item) => item.id === sectionId) : null;
      const siteId = resolveSiteReference(getActivityLibraryImportValue(row, "site"), siteRows);
      const departmentId =
        resolveMasterReference(getActivityLibraryImportValue(row, "department"), departmentRows) ??
        section?.departmentId ??
        null;
      const values = {
        activityCode,
        activityName,
        category: getActivityLibraryImportValue(row, "category") || "Technical",
        siteId,
        departmentId,
        sectionId,
        basePoints: parseActivityLibraryInteger(getActivityLibraryImportValue(row, "basePoints"), 5, 0, 500),
        complexityLevel: parseActivityLibraryInteger(getActivityLibraryImportValue(row, "complexityLevel"), 1, 1, 5),
        requiresPhoto: parseActivityLibraryBoolean(getActivityLibraryImportValue(row, "requiresPhoto"), false),
        requiresEquipmentNo: parseActivityLibraryBoolean(getActivityLibraryImportValue(row, "requiresEquipmentNo"), false),
        requiresDuration: parseActivityLibraryBoolean(getActivityLibraryImportValue(row, "requiresDuration"), true),
        requiresLocationGps: parseActivityLibraryBoolean(getActivityLibraryImportValue(row, "requiresLocationGps"), false),
        requiresMaterialUsed: parseActivityLibraryBoolean(getActivityLibraryImportValue(row, "requiresMaterialUsed"), false),
        maxDailyCount: parseActivityLibraryInteger(getActivityLibraryImportValue(row, "maxDailyCount"), 3, 1, 20),
        maxPointsPerDay: parseActivityLibraryInteger(getActivityLibraryImportValue(row, "maxPointsPerDay"), 50, 1, 1000),
        isAssignable: parseActivityLibraryBoolean(getActivityLibraryImportValue(row, "isAssignable"), true),
        isSelfInput: parseActivityLibraryBoolean(getActivityLibraryImportValue(row, "isSelfInput"), true),
        approvalRequired: parseActivityLibraryBoolean(getActivityLibraryImportValue(row, "approvalRequired"), true),
        autoApproveIfGpsValid: parseActivityLibraryBoolean(getActivityLibraryImportValue(row, "autoApproveIfGpsValid"), false),
        slaHours: parseActivityLibraryInteger(getActivityLibraryImportValue(row, "slaHours"), 24, 1, 240),
        isActive: parseActivityLibraryBoolean(getActivityLibraryImportValue(row, "isActive"), true),
        createdByEmployeeId,
        updatedAt: new Date(),
      };

      const [existing] = await db
        .select({ id: activityLibraries.id })
        .from(activityLibraries)
        .where(eq(activityLibraries.activityCode, activityCode))
        .limit(1);

      if (existing) {
        await db.update(activityLibraries).set(values).where(eq(activityLibraries.id, existing.id));
        updatedCount += 1;
      } else {
        await db.insert(activityLibraries).values({
          ...values,
          createdAt: new Date(),
        });
        importedCount += 1;
      }
    }

    revalidateDailyActivitySurfaces();

    return {
      status: "success",
      message:
        duplicateCodeCount > 0
          ? `Import Activity Library selesai. ${duplicateCodeCount} baris duplicate activityCode digabung, pakai baris terakhir.`
          : "Import Activity Library selesai.",
      importedCount,
      updatedCount,
      skippedCount,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Import Activity Library gagal.",
    };
  }
}

export async function manageJobAssignmentAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = manageAssignmentSchema.parse(Object.fromEntries(formData));
  const currentEmployee = await getAuthenticatedEmployeeContext();

  if (payload.intent === "delete") {
    if (!payload.id) {
      throw new Error("Assignment tidak valid.");
    }

    await db.delete(jobAssignments).where(eq(jobAssignments.id, payload.id));
    revalidateDailyActivitySurfaces();
    return;
  }

  if (payload.intent === "update-status") {
    if (!payload.id) {
      throw new Error("Assignment tidak valid.");
    }

    await db
      .update(jobAssignments)
      .set({
        status: payload.status,
        updatedAt: new Date(),
      })
      .where(eq(jobAssignments.id, payload.id));

    revalidateDailyActivitySurfaces();
    return;
  }

  if (!payload.assignedByEmployeeId || !payload.assignedToEmployeeId || !payload.siteId) {
    throw new Error("Assignment harus memiliki assigner, assignee, dan site.");
  }

  const managedEmployeeIds = await getManagedEmployeeIdsForLead(currentEmployee.id);
  if (!managedEmployeeIds.includes(payload.assignedToEmployeeId)) {
    throw new Error("Anda hanya bisa membuat assignment untuk bawahan yang ada di struktur organisasi.");
  }

  const [assignee] = await db
    .select({
      id: employees.id,
      siteId: employees.siteId,
      isActive: employees.isActive,
    })
    .from(employees)
    .where(eq(employees.id, payload.assignedToEmployeeId))
    .limit(1);

  if (!assignee?.isActive) {
    throw new Error("Bawahan tujuan assignment tidak aktif atau tidak ditemukan.");
  }

  if (payload.libraryActivityId) {
    const [library] = await db
      .select({ siteId: activityLibraries.siteId })
      .from(activityLibraries)
      .where(eq(activityLibraries.id, payload.libraryActivityId))
      .limit(1);

    if (library?.siteId && library.siteId !== assignee.siteId) {
      throw new Error("Activity library tidak tersedia untuk site assignment ini.");
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
      ? parseDateTime(payload.assignedDate, "Tanggal assignment")
      : new Date(),
    deadline: payload.deadline ? parseDateTime(payload.deadline, "Deadline") : null,
    status: payload.status,
    isMandatory: payload.isMandatory,
    isRecurring: payload.isRecurring,
    recurrenceRule: payload.recurrenceRule,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  revalidateDailyActivitySurfaces();
}

export async function manageOvertimeCommandLetterAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = manageOvertimeCommandLetterSchema.parse(Object.fromEntries(formData));
  const currentEmployee = await getAuthenticatedEmployeeContext();
  await assertOvertimeRequestCreationAccess(currentEmployee);

  const existingDocument =
    payload.id == null
      ? null
      : (
          await db
            .select({
              id: overtimeCommandLetters.id,
              siteId: overtimeCommandLetters.siteId,
              requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
              approvedByEmployeeId: overtimeCommandLetters.approvedByEmployeeId,
              status: overtimeCommandLetters.status,
            })
            .from(overtimeCommandLetters)
            .where(eq(overtimeCommandLetters.id, payload.id))
            .limit(1)
        )[0] ?? null;

  if (payload.intent === "delete") {
    if (!payload.id) {
      throw new Error("SPL tidak valid.");
    }

    if (!existingDocument || existingDocument.siteId !== currentEmployee.siteId) {
      throw new Error("Dokumen SPL tidak ditemukan di site Anda.");
    }

    if (
      existingDocument.requestedByEmployeeId !== currentEmployee.id &&
      !canManageOvertimeRequestSettings(currentEmployee)
    ) {
      throw new Error("Anda tidak bisa menghapus dokumen SPL milik leader lain.");
    }

    await db.delete(overtimeCommandLetters).where(eq(overtimeCommandLetters.id, payload.id));
    revalidateDailyActivitySurfaces();
    return;
  }

  const lineItems = parseOvertimeCommandLetterLines(payload.lineItemsJson);
  if (lineItems.length === 0) {
    throw new Error("SPL minimal punya satu line pekerjaan.");
  }

  const managedEmployeeIds = await getManagedEmployeeIdsForLead(currentEmployee.id);
  if (managedEmployeeIds.length === 0) {
    throw new Error("Leader ini belum punya bawahan aktif untuk pengajuan lembur.");
  }

  const managedEmployeeIdSet = new Set(managedEmployeeIds);
  const selectedEmployeeIds = Array.from(new Set(lineItems.map((item) => item.assignedEmployeeId)));

  if (selectedEmployeeIds.some((employeeId) => !managedEmployeeIdSet.has(employeeId))) {
    throw new Error("Pengajuan lembur hanya boleh dibuat untuk bawahan leader ini.");
  }

  if (!payload.workDate) {
    throw new Error("Tanggal kerja SPL wajib diisi.");
  }

  const workDate = parseDateTime(payload.workDate, "Tanggal kerja SPL");
  const plannedStartAt = payload.plannedStartAt
    ? parseDateTime(payload.plannedStartAt, "Jam mulai SPL")
    : null;
  const plannedEndAt = payload.plannedEndAt
    ? parseDateTime(payload.plannedEndAt, "Jam selesai SPL")
    : null;

  if (plannedStartAt && plannedEndAt && plannedEndAt <= plannedStartAt) {
    throw new Error("Jam selesai SPL harus setelah jam mulai.");
  }

  const values = {
    requestSubmissionId: null,
    siteId: currentEmployee.siteId,
    departmentId: currentEmployee.departmentId ?? null,
    sectionId: payload.sectionId ?? currentEmployee.sectionId ?? null,
    positionId: payload.positionId ?? currentEmployee.positionId ?? null,
    requestedByEmployeeId: currentEmployee.id,
    approvedByEmployeeId:
      payload.status === "approved" || payload.status === "closed"
        ? existingDocument?.approvedByEmployeeId ?? currentEmployee.id
        : null,
    title: payload.title,
    workDate,
    plannedStartAt,
    plannedEndAt,
    status: payload.status,
    requestNotes: payload.requestNotes,
    executionNotes: payload.executionNotes,
    updatedAt: new Date(),
  };

  let overtimeCommandLetterId = payload.id ?? null;

  if (payload.intent === "create") {
    const [created] = await db
      .insert(overtimeCommandLetters)
      .values({
        ...values,
        splNumber: buildSplNumber(currentEmployee.siteId, currentEmployee.id, workDate),
        createdAt: new Date(),
      })
      .returning({ id: overtimeCommandLetters.id });

    overtimeCommandLetterId = created.id;
  } else {
    if (!payload.id) {
      throw new Error("SPL tidak valid.");
    }

    if (!existingDocument || existingDocument.siteId !== currentEmployee.siteId) {
      throw new Error("Dokumen SPL tidak ditemukan di site Anda.");
    }

    if (
      existingDocument.requestedByEmployeeId !== currentEmployee.id &&
      !canManageOvertimeRequestSettings(currentEmployee)
    ) {
      throw new Error("Anda tidak bisa mengubah dokumen SPL milik leader lain.");
    }

    await db
      .update(overtimeCommandLetters)
      .set(values)
      .where(eq(overtimeCommandLetters.id, payload.id));

    await db
      .delete(overtimeCommandLetterItems)
      .where(eq(overtimeCommandLetterItems.overtimeCommandLetterId, payload.id));

    overtimeCommandLetterId = payload.id;
  }

  await db.insert(overtimeCommandLetterItems).values(
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
    })),
  );

  revalidateDailyActivitySurfaces();
}

export async function manageOvertimeRequestLeaderPermissionAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = manageOvertimeRequestLeaderPermissionSchema.parse(Object.fromEntries(formData));
  const currentEmployee = await getAuthenticatedEmployeeContext();

  if (!canManageOvertimeRequestSettings(currentEmployee)) {
    throw new Error("Anda tidak punya akses untuk mengubah setting leader lembur.");
  }

  const [leader] = await db
    .select({
      id: employees.id,
      siteId: employees.siteId,
      isActive: employees.isActive,
    })
    .from(employees)
    .where(eq(employees.id, payload.leaderEmployeeId))
    .limit(1);

  if (!leader || !leader.isActive || leader.siteId !== currentEmployee.siteId) {
    throw new Error("Leader yang dipilih tidak valid untuk site ini.");
  }

  const managedEmployeeIds = await getManagedEmployeeIdsForLead(leader.id);
  if (managedEmployeeIds.length === 0) {
    throw new Error("Leader ini belum punya bawahan aktif.");
  }

  const [existingPermission] = await db
    .select({
      id: overtimeRequestLeaderPermissions.id,
    })
    .from(overtimeRequestLeaderPermissions)
    .where(
      and(
        eq(overtimeRequestLeaderPermissions.siteId, currentEmployee.siteId),
        eq(overtimeRequestLeaderPermissions.leaderEmployeeId, payload.leaderEmployeeId),
      ),
    )
    .limit(1);

  if (existingPermission) {
    await db
      .update(overtimeRequestLeaderPermissions)
      .set({
        isActive: payload.isActive,
        note: payload.note,
        enabledByEmployeeId: currentEmployee.id,
        updatedAt: new Date(),
      })
      .where(eq(overtimeRequestLeaderPermissions.id, existingPermission.id));
  } else {
    await db.insert(overtimeRequestLeaderPermissions).values({
      siteId: currentEmployee.siteId,
      leaderEmployeeId: payload.leaderEmployeeId,
      enabledByEmployeeId: currentEmployee.id,
      note: payload.note,
      isActive: payload.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  revalidateDailyActivitySurfaces();
  revalidatePath("/dashboard/overtime-requests");
}

export async function transitionOvertimeCommandLetterStatusAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = transitionOvertimeCommandLetterStatusSchema.parse(Object.fromEntries(formData));
  const currentEmployee = await getAuthenticatedEmployeeContext();
  const managedEmployeeIds = await getManagedEmployeeIdsForLead(currentEmployee.id);
  const isLead = managedEmployeeIds.length > 0;

  const [document] = await db
    .select({
      id: overtimeCommandLetters.id,
      siteId: overtimeCommandLetters.siteId,
      status: overtimeCommandLetters.status,
      requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
      approvedByEmployeeId: overtimeCommandLetters.approvedByEmployeeId,
    })
    .from(overtimeCommandLetters)
    .where(eq(overtimeCommandLetters.id, payload.id))
    .limit(1);

  if (!document || document.siteId !== currentEmployee.siteId) {
    throw new Error("Dokumen SPL tidak ditemukan di site Anda.");
  }

  if (["approved", "closed"].includes(payload.targetStatus) && !isLead) {
    throw new Error("Hanya lead atau atasan yang bisa approve atau close SPL.");
  }

  if (
    ["draft", "submitted"].includes(payload.targetStatus) &&
    document.requestedByEmployeeId !== currentEmployee.id &&
    !isLead
  ) {
    throw new Error("Anda tidak punya akses untuk mengubah status SPL ini.");
  }

  const currentStatus = document.status.trim().toLowerCase() as keyof typeof overtimeCommandLetterStatusTransitions;
  const allowedTransitions = overtimeCommandLetterStatusTransitions[currentStatus];

  if (!allowedTransitions?.includes(payload.targetStatus)) {
    throw new Error(`Transisi status dari ${document.status} ke ${payload.targetStatus} tidak diizinkan.`);
  }

  await db
    .update(overtimeCommandLetters)
    .set({
      status: payload.targetStatus,
      approvedByEmployeeId:
        payload.targetStatus === "approved" || payload.targetStatus === "closed"
          ? document.approvedByEmployeeId ?? currentEmployee.id
          : null,
      updatedAt: new Date(),
    })
    .where(eq(overtimeCommandLetters.id, payload.id));

  revalidateDailyActivitySurfaces();
}

export async function submitDailyActivityAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = submitActivitySchema.parse(Object.fromEntries(formData));
  const photoFile = formData.get("photoFile");
  const employee = await getAuthenticatedEmployeeContext();
  const employeeId = employee.id;

  if (payload.employeeId !== employeeId) {
    throw new Error("Activity hanya bisa disubmit untuk akun Anda sendiri.");
  }

  const startTime = parseDateTime(payload.startTime, "Waktu mulai");
  const endTime = parseDateTime(payload.endTime, "Waktu selesai");
  if (endTime <= startTime) {
    throw new Error("Waktu selesai harus setelah waktu mulai.");
  }

  const [existingOverlap] = await db
    .select({
      id: activities.id,
      title: activities.title,
    })
    .from(activities)
    .where(
      and(
        eq(activities.employeeId, employeeId),
        sql`${activities.startTime} < ${endTime} and ${activities.endTime} > ${startTime}`,
      ),
    )
    .orderBy(desc(activities.startTime))
    .limit(1);

  if (existingOverlap) {
    throw new Error(`Waktu bertabrakan dengan aktivitas ${existingOverlap.title}.`);
  }

  if (payload.assignmentId) {
    const [assignmentActivity] = await db
      .select({ id: activities.id })
      .from(activities)
      .where(eq(activities.assignmentId, payload.assignmentId))
      .limit(1);

    if (assignmentActivity) {
      throw new Error("Assignment ini sudah pernah disubmit.");
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
          .limit(1);

  if (payload.sourceMode === "assigned" && !selectedAssignment) {
    throw new Error("Assignment belum dipilih.");
  }

  if (selectedAssignment && selectedAssignment.assignedToEmployeeId !== employeeId) {
    throw new Error("Assignment tidak sesuai dengan karyawan login.");
  }

  const effectiveLibraryActivityId =
    payload.sourceMode === "assigned"
      ? selectedAssignment?.libraryActivityId ?? null
      : payload.sourceMode === "custom"
        ? null
        : payload.libraryActivityId ?? null;

  const [library] =
    effectiveLibraryActivityId == null
      ? [null]
      : await db
          .select()
          .from(activityLibraries)
          .where(eq(activityLibraries.id, effectiveLibraryActivityId))
          .limit(1);

  if (payload.sourceMode === "self_input" && !library) {
    throw new Error("Aktivitas library belum dipilih.");
  }

  if (payload.sourceMode === "assigned" && selectedAssignment?.libraryActivityId && !library) {
    throw new Error("Library assignment tidak ditemukan.");
  }

  if (payload.sourceMode === "assigned" && !library && !selectedAssignment?.customJobName.trim()) {
    throw new Error("Assignment belum punya activity library atau custom job.");
  }

  if (library?.siteId && library.siteId !== employee.siteId) {
    throw new Error("Aktivitas library tidak tersedia untuk site user ini.");
  }

  if (payload.sourceMode === "custom") {
    if (payload.customActivityName.trim().length === 0) {
      throw new Error("Nama custom activity wajib diisi.");
    }
  }

  const dayStart = startOfDay(startTime);
  const dayEnd = endOfDay(startTime);
  const configMap = await getDailyActivityConfigMap();

  if (payload.sourceMode === "custom") {
    const [customCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(activities)
      .where(
        and(
          eq(activities.employeeId, employeeId),
          eq(activities.sourceMode, "custom"),
          gte(activities.startTime, dayStart),
          lte(activities.startTime, dayEnd),
        ),
      );

    const customLimit = configMap.get("custom_activity_daily_limit") || 3;
    if ((customCount?.count ?? 0) >= customLimit) {
      throw new Error(`Batas custom activity per hari adalah ${customLimit}.`);
    }
  }

  const submissionTime = new Date();
  const submissionCategory = getSubmissionCategory(submissionTime, endTime);
  const penaltyPoints = getPenaltyPoints(submissionCategory, configMap);

  const [activeModifier] = await db
    .select()
    .from(activityModifiers)
    .where(
      and(
        eq(activityModifiers.isActive, true),
        lte(activityModifiers.startDate, submissionTime),
        or(gte(activityModifiers.endDate, submissionTime), sql`${activityModifiers.endDate} is null`),
      ),
    )
    .orderBy(desc(activityModifiers.multiplier))
    .limit(1);

  const basePoints =
    payload.sourceMode === "custom"
      ? 0
      : library?.basePoints ?? 0;
  const modifierMultiplier = activeModifier?.multiplier ?? 100;
  const multiplierBonus = Math.round((basePoints * Math.max(0, modifierMultiplier - 100)) / 100);
  const morningBonus = submissionCategory === "on_time_morning" ? 5 : 0;
  const projectedReward = submissionCategory === "backdated" ? 0 : basePoints + multiplierBonus + morningBonus;
  const projectedNet = projectedReward - penaltyPoints;
  const autoApprove =
    Boolean(library?.autoApproveIfGpsValid) &&
    payload.gpsValid &&
    payload.sourceMode !== "custom";
  const needsApproval = payload.sourceMode === "custom" || library?.approvalRequired !== false;
  const activityStatus = autoApprove ? "Approved" : needsApproval ? "Pending L1" : "Approved";
  const pointsAwarded = Math.max(projectedReward, 0);

  let uploadedPhotoUrl = payload.photoUrl;
  if (photoFile instanceof File && photoFile.size > 0) {
    if (!photoFile.type.startsWith("image/")) {
      throw new Error("File dokumentasi harus berupa gambar.");
    }

    if (photoFile.size > MAX_ACTIVITY_PHOTO_SIZE) {
      throw new Error("Foto dokumentasi terlalu besar. Maksimal 5MB.");
    }

    const uploaded = await uploadAnyFileToS3(photoFile, "activity-photos");
    uploadedPhotoUrl = uploaded.url;
  }

  await syncDailyRouteSessionForActivity({
    employee,
    payload: {
      ...payload,
      routeSummaryRemark: payload.routeSummaryRemark || payload.notes,
    },
    submissionTime,
    startTime,
  });

  let createdActivityId: number | null = null;
  const activityTitle =
    library?.activityName ||
    selectedAssignment?.customJobName.trim() ||
    payload.customActivityName.trim() ||
    "Custom activity";
  const activityCode =
    library?.activityCode ??
    (payload.sourceMode === "assigned" ? "ASN-001" : "CUS-001");
  const activityType =
    library?.category ??
    (payload.sourceMode === "assigned" ? "Assigned" : "Custom");

  await db.transaction(async (tx) => {
    const [createdActivity] = await tx
      .insert(activities)
      .values({
        siteId: employee.siteId,
        employeeId,
        activityCode,
        activityType,
        title: activityTitle,
        unitNumber: payload.equipmentNo || "-",
        libraryActivityId: effectiveLibraryActivityId,
        assignmentId: payload.assignmentId ?? null,
        sourceMode: payload.sourceMode,
        customActivityName: payload.customActivityName,
        customActivityDescription: payload.customActivityDescription,
        startTime,
        endTime,
        status: activityStatus,
        priority: selectedAssignment?.priority ?? (payload.sourceMode === "assigned" ? "High" : "Normal"),
        submissionTime,
        submissionCategory,
        equipmentNo: payload.equipmentNo,
        materialUsed: payload.materialUsed,
        gpsLat: payload.gpsLat,
        gpsLng: payload.gpsLng,
        gpsValid: payload.gpsValid,
        photoCount: uploadedPhotoUrl ? 1 : 0,
        remarks: payload.notes,
        pointsAwarded,
        penaltyDeducted: penaltyPoints,
        createdAt: startTime,
      })
      .returning({ id: activities.id });

    createdActivityId = createdActivity.id;

    if (uploadedPhotoUrl) {
      await tx.insert(activityPhotos).values({
        activityId: createdActivity.id,
        fileUrl: uploadedPhotoUrl,
        caption: "Upload dokumentasi lapangan",
        uploadedAt: submissionTime,
      });
    }

    if (payload.assignmentId) {
      await tx
        .update(jobAssignments)
        .set({
          status: autoApprove ? "APPROVED" : "SUBMITTED",
          updatedAt: new Date(),
        })
        .where(eq(jobAssignments.id, payload.assignmentId));
    }

    if (penaltyPoints > 0) {
      await tx.insert(penaltyEvents).values({
        employeeId,
        siteId: employee.siteId,
        activityId: createdActivity.id,
        penaltyCode:
          submissionCategory === "late_minor"
            ? "PEN-02"
            : submissionCategory === "late_major"
              ? "PEN-03"
              : "PEN-01",
        penaltyType: submissionCategory,
        referenceDate: submissionTime,
        pointsDeducted: penaltyPoints,
        description: `Penalty otomatis karena submission ${submissionCategory}.`,
        isDisputed: false,
        disputeStatus: "none",
        createdAt: submissionTime,
      });
    }

    if (autoApprove || !needsApproval) {
      const updatedBalance = Math.max(0, employee.totalPoints + projectedNet);

      await tx.insert(pointEvents).values({
        employeeId,
        transactionType: projectedNet >= 0 ? "reward" : "penalty",
        sourceType: "activity",
        sourceId: createdActivity.id,
        category: "Daily Activity",
        label: `${activityTitle} • Auto approved`,
        points: projectedNet,
        balanceAfter: updatedBalance,
        metadata: JSON.stringify({
          submissionCategory,
          modifierMultiplier,
          morningBonus,
          penaltyPoints,
        }),
        createdAt: submissionTime,
      });

      await tx
        .update(employees)
        .set({
          totalPoints: updatedBalance,
        })
        .where(eq(employees.id, employeeId));
    } else {
      const approver = await resolveApprover(employeeId, payload.assignmentId);

      if (approver) {
        await tx.insert(approvals).values({
          activityId: createdActivity.id,
          level: 1,
          approverName: approver.name,
          approverEmployeeId: approver.id,
          status: "pending",
          submittedAt: submissionTime,
          reviewedAt: null,
          overtimeMinutes: 0,
          resolutionSource: "daily_activity",
          routeSnapshot: "",
          decisionNote: "",
          createdAt: submissionTime,
        });
      }
    }
  });

  await updateStreakForEmployee(employeeId, endTime);
  revalidateDailyActivitySurfaces();

  if (createdActivityId == null) {
    throw new Error("Aktivitas gagal dibuat.");
  }
}

export async function submitDailyActivityWithStateAction(
  _previousState: DailyActivitySubmitActionState,
  formData: FormData,
): Promise<DailyActivitySubmitActionState> {
  try {
    await submitDailyActivityAction(formData);

    return {
      status: "success",
      message: "Activity berhasil disimpan ke Daily Activity System.",
    };
  } catch (error) {
    return {
      status: "error",
      message: getReadableActionError(
        error,
        "Activity gagal disimpan. Cek field wajib dan coba lagi.",
      ),
    };
  }
}

export async function updateDailyActivitySessionDocumentSignoffAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = updateDailyActivitySessionDocumentSignoffSchema.parse(Object.fromEntries(formData));
  const currentEmployee = await getAuthenticatedEmployeeContext();

  const [sessionRow] = await db
    .select({
      id: dailyActivitySessions.id,
      employeeId: dailyActivitySessions.employeeId,
      siteId: dailyActivitySessions.siteId,
    })
    .from(dailyActivitySessions)
    .where(eq(dailyActivitySessions.id, payload.sessionId))
    .limit(1);

  if (!sessionRow) {
    throw new Error("Session dokumen tidak ditemukan.");
  }

  if (sessionRow.employeeId !== currentEmployee.id || sessionRow.siteId !== currentEmployee.siteId) {
    throw new Error("Anda tidak punya akses untuk dokumen session ini.");
  }

  const [existingSignoff] = await db
    .select()
    .from(dailyActivitySessionSignoffs)
    .where(eq(dailyActivitySessionSignoffs.sessionId, payload.sessionId))
    .limit(1);

  const [employeeSignatureUrl, hrSignatureUrl] = await Promise.all([
    uploadSignatureFile(formData.get("employeeSignatureFile"), "daily-activity-signatures/employee"),
    uploadSignatureFile(formData.get("hrSignatureFile"), "daily-activity-signatures/hr"),
  ]);

  const now = new Date();
  const nextEmployeeSignatureUrl = employeeSignatureUrl ?? existingSignoff?.employeeSignatureUrl ?? "";
  const nextHrSignatureUrl = hrSignatureUrl ?? existingSignoff?.hrSignatureUrl ?? "";
  const hasEmployeeSignoff = Boolean(payload.employeeSignerName.trim() || nextEmployeeSignatureUrl);
  const hasHrSignoff = Boolean(
    payload.hrCheckerName.trim() ||
      nextHrSignatureUrl ||
      payload.hrChecklistStatus !== "pending" ||
      payload.hrChecklistNote.trim(),
  );

  const values = {
    employeeSignerName: payload.employeeSignerName,
    employeeSignatureUrl: nextEmployeeSignatureUrl,
    employeeSignedAt: hasEmployeeSignoff ? existingSignoff?.employeeSignedAt ?? now : null,
    customerSignerName: payload.customerSignerName,
    customerSignatureUrl: "",
    customerSignedAt: null,
    hrCheckerName: payload.hrCheckerName,
    hrChecklistStatus: payload.hrChecklistStatus,
    hrChecklistNote: payload.hrChecklistNote,
    hrSignatureUrl: nextHrSignatureUrl,
    hrCheckedAt: hasHrSignoff ? existingSignoff?.hrCheckedAt ?? now : null,
    updatedAt: now,
  };

  if (existingSignoff) {
    await db
      .update(dailyActivitySessionSignoffs)
      .set(values)
      .where(eq(dailyActivitySessionSignoffs.id, existingSignoff.id));
  } else {
    await db.insert(dailyActivitySessionSignoffs).values({
      sessionId: payload.sessionId,
      ...values,
      createdAt: now,
    });
  }

  revalidateDailyActivitySurfaces();
  revalidatePath(`/dashboard/activity-hub/document/${payload.sessionId}`);
  revalidatePath(`/mobile/activity/document/${payload.sessionId}`);
}

export async function updateDailyActivitySessionDocumentSignoffWithStateAction(
  _previousState: DailyActivityDocumentSignoffActionState,
  formData: FormData,
): Promise<DailyActivityDocumentSignoffActionState> {
  try {
    await updateDailyActivitySessionDocumentSignoffAction(formData);

    return {
      status: "success",
      message: "Signoff dokumen berhasil diperbarui.",
    };
  } catch (error) {
    return {
      status: "error",
      message: getReadableActionError(error, "Signoff dokumen gagal disimpan."),
    };
  }
}

export async function updateDailyActivityConfigAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = updateConfigSchema.parse(Object.fromEntries(formData));

  await db
    .update(dailyActivityConfigs)
    .set({
      configValue: payload.configValue,
      isActive: payload.isActive,
      updatedAt: new Date(),
    })
    .where(eq(dailyActivityConfigs.id, payload.id));

  revalidateDailyActivitySurfaces();
}

export async function manageActivityModifierAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = manageModifierSchema.parse(Object.fromEntries(formData));

  if (payload.intent === "delete") {
    if (!payload.id) {
      throw new Error("Modifier tidak valid.");
    }

    await db.delete(activityModifiers).where(eq(activityModifiers.id, payload.id));
    revalidateDailyActivitySurfaces();
    return;
  }

  const values = {
    siteId: payload.siteId ?? null,
    eventName: payload.eventName,
    description: payload.description,
    multiplier: payload.multiplier,
    startDate: payload.startDate ? parseDateTime(payload.startDate, "Tanggal mulai") : new Date(),
    endDate: payload.endDate ? parseDateTime(payload.endDate, "Tanggal selesai") : null,
    isActive: payload.isActive,
    createdByEmployeeId: payload.createdByEmployeeId ?? null,
  };

  if (payload.intent === "create") {
    await db.insert(activityModifiers).values({
      ...values,
      createdAt: new Date(),
    });
  } else {
    if (!payload.id) {
      throw new Error("Modifier tidak valid.");
    }

    await db.update(activityModifiers).set(values).where(eq(activityModifiers.id, payload.id));
  }

  revalidateDailyActivitySurfaces();
}

export async function submitPointDisputeAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = submitDisputeSchema.parse(Object.fromEntries(formData));
  const currentEmployee = await getAuthenticatedEmployeeContext();

  const [penalty] = await db
    .select({
      id: penaltyEvents.id,
      employeeId: penaltyEvents.employeeId,
      disputeStatus: penaltyEvents.disputeStatus,
    })
    .from(penaltyEvents)
    .where(eq(penaltyEvents.id, payload.penaltyEventId))
    .limit(1);

  if (!penalty || penalty.employeeId !== currentEmployee.id) {
    throw new Error("Penalty event tidak ditemukan.");
  }

  const [existingDispute] = await db
    .select({
      id: pointDisputes.id,
      status: pointDisputes.status,
    })
    .from(pointDisputes)
    .where(eq(pointDisputes.penaltyEventId, payload.penaltyEventId))
    .orderBy(desc(pointDisputes.createdAt))
    .limit(1);

  if (existingDispute?.status === "pending" || penalty.disputeStatus === "pending") {
    throw new Error("Penalty ini sudah memiliki dispute yang masih diproses.");
  }

  await db.transaction(async (tx) => {
    await tx.insert(pointDisputes).values({
      penaltyEventId: payload.penaltyEventId,
      employeeId: currentEmployee.id,
      reason: payload.reason,
      evidenceUrls: normalizeEvidenceUrls(payload.evidenceUrls),
      status: "pending",
      resolutionNotes: "",
      resolvedByEmployeeId: null,
      resolvedAt: null,
      createdAt: new Date(),
    });

    await tx
      .update(penaltyEvents)
      .set({
        isDisputed: true,
        disputeStatus: "pending",
        resolvedAt: null,
      })
      .where(eq(penaltyEvents.id, payload.penaltyEventId));
  });

  revalidateDailyActivitySurfaces();
}

export async function resolvePointDisputeAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = resolveDisputeSchema.parse(Object.fromEntries(formData));

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
    .limit(1);

  if (!dispute) {
    throw new Error("Dispute tidak ditemukan.");
  }

  if (dispute.status !== "pending") {
    throw new Error("Dispute ini sudah pernah diproses.");
  }

  await db.transaction(async (tx) => {
    const resolvedAt = new Date();

    await tx
      .update(pointDisputes)
      .set({
        status: payload.decision,
        resolvedByEmployeeId: payload.resolvedByEmployeeId,
        resolutionNotes: payload.resolutionNotes,
        resolvedAt,
      })
      .where(eq(pointDisputes.id, payload.disputeId));

    await tx
      .update(penaltyEvents)
      .set({
        isDisputed: true,
        disputeStatus: payload.decision,
        resolvedAt,
      })
      .where(eq(penaltyEvents.id, dispute.penaltyEventId));

    if (payload.decision === "approved" && dispute.pointsDeducted > 0) {
      const [existingRestoreEvent] = await tx
        .select({ id: pointEvents.id })
        .from(pointEvents)
        .where(
          and(
            eq(pointEvents.sourceType, "point_dispute"),
            eq(pointEvents.sourceId, payload.disputeId),
          ),
        )
        .limit(1);

      if (!existingRestoreEvent) {
        const [employee] = await tx
          .select({
            id: employees.id,
            totalPoints: employees.totalPoints,
          })
          .from(employees)
          .where(eq(employees.id, dispute.employeeId))
          .limit(1);

        if (employee) {
          const updatedBalance = employee.totalPoints + dispute.pointsDeducted;

          await tx.insert(pointEvents).values({
            employeeId: dispute.employeeId,
            transactionType: "reward",
            sourceType: "point_dispute",
            sourceId: payload.disputeId,
            category: "Dispute Adjustment",
            label: `Restorasi ${dispute.penaltyCode} setelah dispute disetujui`,
            points: dispute.pointsDeducted,
            balanceAfter: updatedBalance,
            metadata: JSON.stringify({
              penaltyEventId: dispute.penaltyEventId,
              decision: payload.decision,
            }),
            createdAt: resolvedAt,
          });

          await tx
            .update(employees)
            .set({ totalPoints: updatedBalance })
            .where(eq(employees.id, dispute.employeeId));
        }
      }
    }
  });

  revalidateDailyActivitySurfaces();
}
