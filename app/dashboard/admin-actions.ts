"use server";

import { randomUUID } from "crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db";
import { account, session, user } from "@/db/schema/auth";
import {
  activities,
  approvals,
  employees,
  masterDepartments,
  masterPositions,
  masterSections,
  navbarMenuItems,
  navbarThemes,
  orgChartNodes,
  orgChartStructures,
  pointEvents,
  roleMenuPermissions,
  securityRolePermissions,
  securityRoles,
  sites,
  timesheetEntries,
} from "@/db/schema/hero";
import {
  ensureHeroGovernanceSeedData,
  ensureHeroSeedData,
} from "@/lib/hero-admin";
import {
  getMappedValue,
  parseCsv,
  type UserImportMapping,
} from "@/lib/security-user-import";
import { normalizeBirthDateValue } from "@/lib/birth-date";
import {
  type ApprovalRouteResolution,
  type ResolvedApprovalStep,
  resolveApprovalRouteForActivity,
  serializeApprovalRoute,
} from "@/lib/approval-engine";
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
} from "@/lib/approval-blueprint";
import { appendApprovalNoteEntry } from "@/lib/approval-notes";

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
});

const saveActivityDraftSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  activityCode: z.string().trim().max(4).optional().default(""),
  activityType: z.string().trim().max(100).optional().default(""),
  title: z.string().trim().max(200).optional().default(""),
  unitNumber: z.string().trim().max(100).optional().default(""),
  startTime: z.string().trim().optional().default(""),
  endTime: z.string().trim().optional().default(""),
  priority: z.string().trim().max(50).optional().default("Normal"),
  overtimeMinutes: z.coerce.number().int().min(0).max(720).optional().default(0),
  remarks: z.string().trim().max(1000).optional().default(""),
});

const reviewApprovalSchema = z.object({
  approvalId: z.coerce.number().int().positive(),
  decision: z.enum(["approved", "rejected", "needs_correction"]),
  note: z.string().trim().max(1000).optional().default(""),
});

const approvalCommentSchema = z.object({
  approvalId: z.coerce.number().int().positive(),
  comment: z.string().trim().min(3).max(1000),
});

const cancelDraftSchema = z.object({
  submissionId: z.coerce.number().int().positive(),
});

const createFormSectionSchema = z.object({
  versionId: z.coerce.number().int().positive(),
  label: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().default(""),
  isCollapsible: z.preprocess((value) => value === "on" || value === "true", z.boolean()).optional().default(false),
});

const createFormFieldSchema = z.object({
  versionId: z.coerce.number().int().positive(),
  sectionId: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.coerce.number().int().positive().nullable(),
  ),
  label: z.string().trim().min(2).max(120),
  fieldKey: z.string().trim().max(80).optional().default(""),
  fieldType: z.string().trim().min(2).max(80),
  placeholder: z.string().trim().max(200).optional().default(""),
  helpText: z.string().trim().max(500).optional().default(""),
  defaultValue: z.string().trim().max(500).optional().default(""),
  isRequired: z.preprocess((value) => value === "on" || value === "true", z.boolean()).optional().default(false),
  optionLines: z.string().trim().max(3000).optional().default(""),
  validationRuleType: z.string().trim().max(80).optional().default(""),
  validationOperator: z.string().trim().max(40).optional().default("="),
  validationValue: z.string().trim().max(500).optional().default(""),
  validationMessage: z.string().trim().max(500).optional().default(""),
  allowedMimeTypes: z.string().trim().max(300).optional().default(""),
  maxSizeMb: z.coerce.number().min(0).max(100).optional().default(10),
});

const formTemplateVersionSchema = z.object({
  versionId: z.coerce.number().int().positive(),
});

const saveFormLayoutSchema = z.object({
  versionId: z.coerce.number().int().positive(),
  layoutJson: z.string().trim().min(2),
});

const createWorkflowConditionSchema = z.object({
  workflowVersionId: z.coerce.number().int().positive(),
  parentConditionId: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.coerce.number().int().positive().nullable(),
  ),
  fieldKey: z.string().trim().min(2).max(120),
  operator: z.string().trim().min(1).max(40),
  compareValue: z.string().trim().max(500).optional().default(""),
  logicalJoin: z.enum(["AND", "OR"]).optional().default("AND"),
  groupLabel: z.string().trim().max(120).optional().default("Custom Condition Group"),
});

const importUsersSchema = z.object({
  rawCsv: z.string().trim().min(1, "File CSV wajib diisi."),
  mappingJson: z.string().trim().min(2, "Mapping import belum lengkap."),
});

export type ImportUsersActionState = {
  status: "idle" | "success" | "error";
  message: string;
  importedCount?: number;
  updatedCount?: number;
  skippedCount?: number;
};

export type AdminMutationState = {
  status: "idle" | "success" | "error";
  message: string;
};

const navbarThemeSchema = z.object({
  headerBackgroundColor: z
    .string()
    .trim()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Warna header harus berupa hex color yang valid."),
});

const manageSecurityUserSchema = z.object({
  intent: z.enum([
    "create-user",
    "update-profile",
    "ban-user",
    "delete-user",
    "change-role",
    "change-password",
  ]),
  employeeId: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.number().int().positive().optional(),
  ),
  fullName: z.string().trim().optional(),
  employeeSn: z.string().trim().optional(),
  profileImage: z.string().trim().optional(),
  joinYear: z.string().trim().optional(),
  birthPlaceDate: z.string().trim().optional(),
  domicile: z.string().trim().optional(),
  directManagerId: z.string().trim().optional(),
  section: z.string().trim().optional(),
  department: z.string().trim().optional(),
  jobTitle: z.string().trim().optional(),
  workLocation: z.string().trim().optional(),
  phoneNumber: z.string().trim().optional(),
  email: z.string().trim().optional(),
  employmentStatus: z.string().trim().optional(),
  employeeStatusType: z.string().trim().optional(),
  accessRole: z.string().trim().optional(),
  password: z.string().trim().optional(),
  newPassword: z.string().trim().optional(),
});

const manageSecurityRoleSchema = z.object({
  intent: z.enum([
    "create-role",
    "duplicate-role",
    "delete-role",
    "save-menu-permissions",
  ]),
  roleId: z.string().trim().optional(),
  roleName: z.string().trim().optional(),
  description: z.string().trim().optional(),
  scope: z.string().trim().optional(),
  sourceRoleId: z.string().trim().optional(),
  permissionsJson: z.string().trim().optional(),
});

function parseDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal aktivitas tidak valid.");
  }

  return date;
}

function getPointsForPriority(priority: string) {
  switch (priority.toLowerCase()) {
    case "emergency":
      return 20;
    case "safety":
      return 10;
    default:
      return 5;
  }
}

function getPeriodLabel(date: Date) {
  const month = date.toLocaleString("en-US", { month: "long" });
  const week = Math.max(1, Math.ceil(date.getDate() / 7));
  return `${month} ${date.getFullYear()} • Week ${week}`;
}

function getPendingActivityStatus(level: number) {
  if (level > 0) {
    return `Pending L${level}`;
  }

  return "Pending Approval";
}

function getRouteStepGroup(steps: ResolvedApprovalStep[], stepOrder: number) {
  return steps.filter((step) => step.stepOrder === stepOrder);
}

function getNextRouteStepGroup(steps: ResolvedApprovalStep[], currentStepOrder: number) {
  const nextStepOrder =
    steps
      .map((step) => step.stepOrder)
      .filter((stepOrder) => stepOrder > currentStepOrder)
      .sort((left, right) => left - right)[0] ?? null;

  return nextStepOrder == null ? [] : getRouteStepGroup(steps, nextStepOrder);
}

async function createPendingApprovalsForStepGroup(params: {
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
  activityId: number;
  stepGroup: ResolvedApprovalStep[];
  approvalRoute: ApprovalRouteResolution;
  submittedAt: Date;
  overtimeMinutes: number;
}) {
  if (params.stepGroup.length === 0) {
    return;
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
        eq(approvals.level, params.stepGroup[0].stepOrder),
      ),
    );

  const existingStepIds = new Set(
    existingApprovals.map((row) => `${row.level}:${row.approvalStepId ?? "none"}`),
  );

  const rowsToInsert = params.stepGroup
    .filter(
      (step) => !existingStepIds.has(`${step.stepOrder}:${step.approvalMatrixStepId ?? "none"}`),
    )
    .map((step) => ({
      activityId: params.activityId,
      level: step.stepOrder,
      approverName: step.approverName,
      approverEmployeeId: step.approverEmployeeId,
      approverNodeId: step.approverNodeId,
      approvalMatrixId: params.approvalRoute.matrixId,
      approvalStepId: step.approvalMatrixStepId,
      status: "pending",
      submittedAt: params.submittedAt,
      overtimeMinutes: params.overtimeMinutes,
      resolutionSource: step.resolutionSource,
      routeSnapshot: serializeApprovalRoute(params.approvalRoute),
    }));

  if (rowsToInsert.length > 0) {
    await params.tx.insert(approvals).values(rowsToInsert);
  }
}

function parseApprovalRouteSnapshot(routeSnapshot: string) {
  const trimmedSnapshot = routeSnapshot.trim();

  if (!trimmedSnapshot) {
    return null;
  }

  try {
    return JSON.parse(trimmedSnapshot) as ApprovalRouteResolution;
  } catch {
    return null;
  }
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function parseJoinYear(value: string) {
  const digits = value.replace(/\D/g, "");
  const parsed = Number.parseInt(digits, 10);

  if (Number.isNaN(parsed) || parsed < 1980 || parsed > 2100) {
    return new Date().getFullYear();
  }

  return parsed;
}

function normalizeEmploymentStatus(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return { status: "active", isActive: true };
  }

  if (
    normalized.includes("inactive") ||
    normalized.includes("nonaktif") ||
    normalized.includes("suspend") ||
    normalized.includes("resign")
  ) {
    return {
      status: normalized.includes("resign") ? "resigned" : "inactive",
      isActive: false,
    };
  }

  if (normalized.includes("probation")) {
    return { status: "probation", isActive: true };
  }

  if (normalized.includes("cuti") || normalized.includes("leave")) {
    return { status: "on_leave", isActive: true };
  }

  if (normalized.includes("contract") || normalized.includes("kontrak")) {
    return { status: "contract", isActive: true };
  }

  return { status: normalized.replace(/\s+/g, "_"), isActive: true };
}

function parseOptionalManagerId(value: string | undefined) {
  if (!value || value === "none") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeLookupValue(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function extractActivitySupplementalPayload(formData: FormData) {
  const checklistCompletion = formData
    .getAll("checklistCompletion")
    .map((value) => `${value}`.trim())
    .filter(Boolean);
  const additionalWatchers = formData
    .getAll("additionalWatchers")
    .map((value) => `${value}`.trim())
    .filter(Boolean);

  return {
    workDate: `${formData.get("workDate") ?? ""}`.trim(),
    shift: `${formData.get("shift") ?? ""}`.trim(),
    riskCategory: `${formData.get("riskCategory") ?? ""}`.trim(),
    referenceCode: `${formData.get("referenceCode") ?? ""}`.trim(),
    manpowerInvolved: `${formData.get("manpowerInvolved") ?? ""}`.trim(),
    checklistCompletion,
    department: `${formData.get("department") ?? ""}`.trim(),
    section: `${formData.get("section") ?? ""}`.trim(),
    photoAttachmentUrl: `${formData.get("photoAttachmentUrl") ?? ""}`.trim(),
    documentAttachmentUrl: `${formData.get("documentAttachmentUrl") ?? ""}`.trim(),
    signatureName: `${formData.get("signatureName") ?? ""}`.trim(),
    latitude: `${formData.get("latitude") ?? ""}`.trim(),
    longitude: `${formData.get("longitude") ?? ""}`.trim(),
    additionalWatchers,
  };
}

async function resolveEmployeeGovernanceIds(params: {
  department: string;
  section: string;
  jobTitle: string;
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
  ]);

  const department =
    departments.find((item) => normalizeLookupValue(item.name) === normalizeLookupValue(params.department)) ??
    null;
  const section =
    sections.find(
      (item) =>
        normalizeLookupValue(item.name) === normalizeLookupValue(params.section) &&
        (department?.id == null || item.departmentId === department.id),
    ) ?? null;
  const position =
    positions.find(
      (item) =>
        normalizeLookupValue(item.name) === normalizeLookupValue(params.jobTitle) &&
        (department?.id == null || item.departmentId === department.id),
    ) ?? null;

  return {
    departmentId: department?.id ?? null,
    sectionId: section?.id ?? null,
    positionId: position?.id ?? null,
  };
}

async function resolveDefaultOrgNodeId(positionId: number | null) {
  if (positionId == null) {
    return null;
  }

  const [node] = await db
    .select({ id: orgChartNodes.id })
    .from(orgChartNodes)
    .leftJoin(orgChartStructures, eq(orgChartNodes.structureId, orgChartStructures.id))
    .where(eq(orgChartNodes.positionId, positionId))
    .orderBy(desc(orgChartStructures.isDefault), asc(orgChartNodes.id))
    .limit(1);

  return node?.id ?? null;
}

function parseRoleId(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeProfileImageValue(value: string | undefined) {
  const trimmedValue = value?.trim() ?? "";

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.startsWith("data:image/")) {
    if (trimmedValue.length > 3_000_000) {
      throw new Error("Foto profile terlalu besar. Maksimal 2MB.");
    }

    return trimmedValue;
  }

  try {
    const parsedUrl = new URL(trimmedValue);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Protocol URL tidak didukung.");
    }

    return parsedUrl.toString();
  } catch {
    throw new Error("Format foto profile tidak valid.");
  }
}

async function ensureAuthUserForEmployee(employee: {
  id: number;
  authUserId: string | null;
  name: string;
  email: string;
}) {
  if (employee.authUserId) {
    await db
      .update(user)
      .set({
        name: employee.name,
        email: employee.email,
        updatedAt: new Date(),
      })
      .where(eq(user.id, employee.authUserId));

    return employee.authUserId;
  }

  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, employee.email))
    .limit(1);

  if (existingUser) {
    await db
      .update(user)
      .set({
        name: employee.name,
        updatedAt: new Date(),
      })
      .where(eq(user.id, existingUser.id));

    await db
      .update(employees)
      .set({ authUserId: existingUser.id })
      .where(eq(employees.id, employee.id));

    return existingUser.id;
  }

  const authUserId = randomUUID();
  const now = new Date();

  await db.insert(user).values({
    id: authUserId,
    name: employee.name,
    email: employee.email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  await db
    .update(employees)
    .set({ authUserId })
    .where(eq(employees.id, employee.id));

  return authUserId;
}

function revalidateAdminSurfaces() {
  const paths = [
    "/dashboard/analytics",
    "/dashboard/activity-hub/my-day",
    "/dashboard/activity-hub/team-board",
    "/dashboard/approval",
    "/dashboard/request-center",
    "/dashboard/form-studio",
    "/dashboard/workflow-studio",
    "/dashboard/notifications",
    "/dashboard/timesheet",
    "/dashboard/reports",
    "/dashboard/leaderboard",
    "/dashboard/security",
    "/dashboard/security/users",
  ];

  for (const path of paths) {
    revalidatePath(path);
  }
}

export async function createActivityAction(formData: FormData) {
  await ensureHeroSeedData();

  const supplementalPayload = extractActivitySupplementalPayload(formData);
  const payload = createActivitySchema.parse({
    employeeId: formData.get("employeeId"),
    activityCode: formData.get("activityCode"),
    activityType: formData.get("activityType"),
    title: formData.get("title"),
    unitNumber: formData.get("unitNumber"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    priority: formData.get("priority"),
    overtimeMinutes: formData.get("overtimeMinutes"),
    remarks: formData.get("remarks"),
  });

  const startTime = parseDateTime(payload.startTime);
  const endTime = parseDateTime(payload.endTime);

  if (endTime <= startTime) {
    throw new Error("Waktu selesai harus lebih besar dari waktu mulai.");
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
    .limit(1);

  if (!employee) {
    throw new Error("Karyawan tidak ditemukan.");
  }

  const approvalRoute = await resolveApprovalRouteForActivity({
    employeeId: employee.id,
    activityType: payload.activityType,
    priority: payload.priority,
    overtimeMinutes: payload.overtimeMinutes,
    transactionType: "activity",
    at: endTime,
  });
  const firstStep = approvalRoute.steps[0];

  if (!firstStep) {
    throw new Error("Approval route untuk aktivitas ini tidak ditemukan.");
  }
  const firstGroup = getRouteStepGroup(approvalRoute.steps, firstStep.stepOrder);

  const points = getPointsForPriority(payload.priority);
  let createdActivityId: number | null = null;

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
      .returning({ id: activities.id });
    createdActivityId = activity.id;

    await createPendingApprovalsForStepGroup({
      tx,
      activityId: activity.id,
      stepGroup: firstGroup,
      approvalRoute,
      submittedAt: endTime,
      overtimeMinutes: payload.overtimeMinutes,
    });

    await tx.insert(pointEvents).values({
      employeeId: employee.id,
      category: "Activity Input",
      label: `${payload.activityType} • ${payload.unitNumber}`,
      points,
    });

    await tx
      .update(employees)
      .set({
        totalPoints: employee.totalPoints + points,
      })
      .where(eq(employees.id, employee.id));
  });

  if (createdActivityId != null) {
    await syncActivityWorkflowArtifacts(createdActivityId, supplementalPayload);
  }

  revalidateAdminSurfaces();
}

export async function saveActivityDraftAction(formData: FormData) {
  await ensureHeroSeedData();

  const payload = saveActivityDraftSchema.parse({
    employeeId: formData.get("employeeId"),
    activityCode: formData.get("activityCode"),
    activityType: formData.get("activityType"),
    title: formData.get("title"),
    unitNumber: formData.get("unitNumber"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    priority: formData.get("priority"),
    overtimeMinutes: formData.get("overtimeMinutes"),
    remarks: formData.get("remarks"),
  });

  await saveActivityDraftSubmission({
    ...payload,
    supplementalPayload: extractActivitySupplementalPayload(formData),
  });

  revalidateAdminSurfaces();
}

export async function reviewApprovalAction(formData: FormData) {
  await ensureHeroSeedData();

  const payload = reviewApprovalSchema.parse({
    approvalId: formData.get("approvalId"),
    decision: formData.get("decision"),
    note: formData.get("note"),
  });

  const [approval] = await db
    .select({
      approvalId: approvals.id,
      level: approvals.level,
      status: approvals.status,
      approverName: approvals.approverName,
      approvalMatrixId: approvals.approvalMatrixId,
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
      employeeId: activities.employeeId,
      siteId: activities.siteId,
    })
    .from(approvals)
    .innerJoin(activities, eq(approvals.activityId, activities.id))
    .where(eq(approvals.id, payload.approvalId))
    .limit(1);

  if (!approval) {
    throw new Error("Approval tidak ditemukan.");
  }

  if (approval.status !== "pending") {
    revalidateAdminSurfaces();
    return;
  }

  const now = new Date();
  const approvalRoute = parseApprovalRouteSnapshot(approval.routeSnapshot);
  const currentStepIndex =
    approvalRoute?.steps.findIndex(
      (step) =>
        step.stepOrder === approval.level &&
        (approval.approvalStepId == null || step.approvalMatrixStepId === approval.approvalStepId),
    ) ?? -1;
  const currentStep =
    approvalRoute != null && currentStepIndex >= 0 ? approvalRoute.steps[currentStepIndex] ?? null : null;
  const currentStepGroup =
    approvalRoute != null && currentStep != null
      ? getRouteStepGroup(approvalRoute.steps, currentStep.stepOrder)
      : [];
  const nextStepGroup =
    approvalRoute != null && currentStep != null
      ? getNextRouteStepGroup(approvalRoute.steps, currentStep.stepOrder)
      : [];

  await db.transaction(async (tx) => {
    const defaultDecisionMessage =
      payload.decision === "approved"
        ? "Approval diteruskan sesuai workflow."
        : payload.decision === "rejected"
          ? "Request ditolak pada step ini."
          : "Request dikembalikan untuk revisi.";

    await tx
      .update(approvals)
      .set({
        status: payload.decision,
        reviewedAt: now,
        decisionNote: appendApprovalNoteEntry(approval.decisionNote, {
          kind: payload.decision,
          actor: approval.approverName,
          message: payload.note || defaultDecisionMessage,
          at: now.toISOString(),
        }),
      })
      .where(eq(approvals.id, approval.approvalId));

    if (payload.decision === "needs_correction") {
      if (currentStepGroup.length > 1) {
        await tx
          .update(approvals)
          .set({
            status: "skipped",
            reviewedAt: now,
          })
          .where(
            and(
              eq(approvals.activityId, approval.activityId),
              eq(approvals.level, approval.level),
              eq(approvals.status, "pending"),
            ),
          );
      }

      await tx
        .update(activities)
        .set({
          status: "Needs Correction",
        })
        .where(eq(activities.id, approval.activityId));

      return;
    }

    if (payload.decision === "rejected") {
      if (currentStepGroup.length > 1) {
        await tx
          .update(approvals)
          .set({
            status: "skipped",
            reviewedAt: now,
          })
          .where(
            and(
              eq(approvals.activityId, approval.activityId),
              eq(approvals.level, approval.level),
              eq(approvals.status, "pending"),
            ),
          );
      }

      await tx
        .update(activities)
        .set({
          status: "Rejected",
        })
        .where(eq(activities.id, approval.activityId));

      return;
    }

    if (
      currentStep != null &&
      normalizeLookupValue(currentStep.approvalMode) !== "parallel_any" &&
      normalizeLookupValue(currentStep.approvalMode) !== "any_one"
    ) {
      const sameLevelApprovals = await tx
        .select({
          id: approvals.id,
          status: approvals.status,
        })
        .from(approvals)
        .where(
          and(
            eq(approvals.activityId, approval.activityId),
            eq(approvals.level, approval.level),
          ),
        );

      if (sameLevelApprovals.some((row) => row.status === "pending")) {
        await tx
          .update(activities)
          .set({
            status: getPendingActivityStatus(approval.level),
          })
          .where(eq(activities.id, approval.activityId));

        return;
      }
    }

    if (
      currentStep != null &&
      (normalizeLookupValue(currentStep.approvalMode) === "parallel_any" ||
        normalizeLookupValue(currentStep.approvalMode) === "any_one")
    ) {
      await tx
        .update(approvals)
        .set({
          status: "skipped",
          reviewedAt: now,
          decisionNote: appendApprovalNoteEntry("", {
            kind: "system",
            actor: approval.approverName,
            message: "Step parallel-any diselesaikan oleh approver lain pada level yang sama.",
            at: now.toISOString(),
          }),
        })
        .where(
          and(
            eq(approvals.activityId, approval.activityId),
            eq(approvals.level, approval.level),
            eq(approvals.status, "pending"),
          ),
        );
    }

    if (nextStepGroup.length > 0 && approvalRoute != null) {
      await createPendingApprovalsForStepGroup({
        tx,
        activityId: approval.activityId,
        stepGroup: nextStepGroup,
        approvalRoute,
        submittedAt: now,
        overtimeMinutes: approval.overtimeMinutes,
      });

      await tx
        .update(activities)
        .set({
          status: getPendingActivityStatus(nextStepGroup[0].stepOrder),
        })
        .where(eq(activities.id, approval.activityId));

      return;
    }

    if (approvalRoute == null || currentStepIndex < 0) {
      const fallbackRoute = await resolveApprovalRouteForActivity({
        employeeId: approval.employeeId,
        activityType: approval.activityType,
        priority: approval.priority,
        overtimeMinutes: approval.overtimeMinutes,
        transactionType: "activity",
        at: approval.endTime,
      });
      const fallbackNextStep = fallbackRoute.steps.find((step) => step.stepOrder > approval.level);

      if (fallbackNextStep) {
        const fallbackNextGroup = getRouteStepGroup(fallbackRoute.steps, fallbackNextStep.stepOrder);
        await createPendingApprovalsForStepGroup({
          tx,
          activityId: approval.activityId,
          stepGroup: fallbackNextGroup,
          approvalRoute: fallbackRoute,
          submittedAt: now,
          overtimeMinutes: approval.overtimeMinutes,
        });

        await tx
          .update(activities)
          .set({
            status: getPendingActivityStatus(fallbackNextStep.stepOrder),
          })
          .where(eq(activities.id, approval.activityId));

        return;
      }
    }

    const durationMinutes = Math.max(
      0,
      Math.round((approval.endTime.getTime() - approval.startTime.getTime()) / 60000),
    );
    const regularMinutes = Math.max(0, durationMinutes - approval.overtimeMinutes);
    const overtimeRate = 70000;
    const periodLabel = getPeriodLabel(approval.endTime);

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
          eq(timesheetEntries.periodLabel, periodLabel),
        ),
      )
      .limit(1);

    if (existingTimesheet) {
      await tx
        .update(timesheetEntries)
        .set({
          regularMinutes: existingTimesheet.regularMinutes + regularMinutes,
          overtimeMinutes: existingTimesheet.overtimeMinutes + approval.overtimeMinutes,
          overtimeAmount:
            existingTimesheet.overtimeAmount +
            Math.round((approval.overtimeMinutes / 60) * overtimeRate),
          status: "ready_for_payroll",
          updatedAt: now,
        })
        .where(eq(timesheetEntries.id, existingTimesheet.id));
    } else {
      await tx.insert(timesheetEntries).values({
        employeeId: approval.employeeId,
        siteId: approval.siteId,
        periodLabel,
        regularMinutes,
        overtimeMinutes: approval.overtimeMinutes,
        overtimeAmount: Math.round((approval.overtimeMinutes / 60) * overtimeRate),
        status: "ready_for_payroll",
        updatedAt: now,
      });
    }

    await tx
      .update(activities)
      .set({
        status: "Approved",
      })
      .where(eq(activities.id, approval.activityId));
  });

  await syncActivityWorkflowArtifacts(approval.activityId);

  revalidateAdminSurfaces();
}

export async function addApprovalCommentAction(formData: FormData) {
  await ensureHeroSeedData();

  const payload = approvalCommentSchema.parse({
    approvalId: formData.get("approvalId"),
    comment: formData.get("comment"),
  });

  const [approval] = await db
    .select({
      id: approvals.id,
      approverName: approvals.approverName,
      decisionNote: approvals.decisionNote,
    })
    .from(approvals)
    .where(eq(approvals.id, payload.approvalId))
    .limit(1);

  if (!approval) {
    throw new Error("Approval tidak ditemukan untuk ditambahkan komentar.");
  }

  await db
    .update(approvals)
    .set({
      decisionNote: appendApprovalNoteEntry(approval.decisionNote, {
        kind: "comment",
        actor: approval.approverName,
        message: payload.comment,
      }),
    })
    .where(eq(approvals.id, approval.id));

  const [activityApproval] = await db
    .select({ activityId: approvals.activityId })
    .from(approvals)
    .where(eq(approvals.id, approval.id))
    .limit(1);

  if (activityApproval) {
    await syncActivityWorkflowArtifacts(activityApproval.activityId);
  }

  revalidateAdminSurfaces();
}

export async function cancelDraftSubmissionAction(formData: FormData) {
  await ensureHeroSeedData();

  const payload = cancelDraftSchema.parse({
    submissionId: formData.get("submissionId"),
  });

  await cancelFormSubmissionDraft(payload.submissionId);
  revalidateAdminSurfaces();
}

export async function createFormSectionAction(formData: FormData) {
  await ensureHeroSeedData();

  const payload = createFormSectionSchema.parse({
    versionId: formData.get("versionId"),
    label: formData.get("label"),
    description: formData.get("description"),
    isCollapsible: formData.get("isCollapsible"),
  });

  await createFormTemplateSection(payload);
  revalidateAdminSurfaces();
}

export async function createFormFieldAction(formData: FormData) {
  await ensureHeroSeedData();

  const payload = createFormFieldSchema.parse({
    versionId: formData.get("versionId"),
    sectionId: formData.get("sectionId"),
    label: formData.get("label"),
    fieldKey: formData.get("fieldKey"),
    fieldType: formData.get("fieldType"),
    placeholder: formData.get("placeholder"),
    helpText: formData.get("helpText"),
    defaultValue: formData.get("defaultValue"),
    isRequired: formData.get("isRequired"),
    optionLines: formData.get("optionLines"),
    validationRuleType: formData.get("validationRuleType"),
    validationOperator: formData.get("validationOperator"),
    validationValue: formData.get("validationValue"),
    validationMessage: formData.get("validationMessage"),
    allowedMimeTypes: formData.get("allowedMimeTypes"),
    maxSizeMb: formData.get("maxSizeMb"),
  });

  await createFormTemplateField(payload);
  revalidateAdminSurfaces();
}

export async function saveFormTemplateLayoutAction(formData: FormData) {
  await ensureHeroSeedData();

  const payload = saveFormLayoutSchema.parse({
    versionId: formData.get("versionId"),
    layoutJson: formData.get("layoutJson"),
  });
  const layout = z
    .object({
      sections: z.array(z.object({ id: z.number().int().positive(), sortOrder: z.number().int().positive() })),
      fields: z.array(
        z.object({
          id: z.number().int().positive(),
          sectionId: z.number().int().positive().nullable(),
          sortOrder: z.number().int().positive(),
        }),
      ),
    })
    .parse(JSON.parse(payload.layoutJson));

  await saveFormTemplateLayout({
    versionId: payload.versionId,
    sections: layout.sections,
    fields: layout.fields,
  });
  revalidateAdminSurfaces();
}

export async function publishFormTemplateVersionAction(formData: FormData) {
  await ensureHeroSeedData();

  const payload = formTemplateVersionSchema.parse({
    versionId: formData.get("versionId"),
  });

  await publishFormTemplateVersion(payload.versionId);
  revalidateAdminSurfaces();
}

export async function cloneFormTemplateVersionAction(formData: FormData) {
  await ensureHeroSeedData();

  const payload = formTemplateVersionSchema.parse({
    versionId: formData.get("versionId"),
  });

  await cloneFormTemplateVersion(payload.versionId);
  revalidateAdminSurfaces();
}

export async function createWorkflowConditionAction(formData: FormData) {
  await ensureHeroSeedData();

  const payload = createWorkflowConditionSchema.parse({
    workflowVersionId: formData.get("workflowVersionId"),
    parentConditionId: formData.get("parentConditionId"),
    fieldKey: formData.get("fieldKey"),
    operator: formData.get("operator"),
    compareValue: formData.get("compareValue"),
    logicalJoin: formData.get("logicalJoin"),
    groupLabel: formData.get("groupLabel"),
  });

  await createWorkflowCondition(payload);
  revalidateAdminSurfaces();
}

export async function runApprovalAutomationAction() {
  await ensureHeroSeedData();
  await runApprovalAutomationTick();
  revalidateAdminSurfaces();
}

export async function importSecurityUsersAction(
  _previousState: ImportUsersActionState,
  formData: FormData,
): Promise<ImportUsersActionState> {
  try {
    await ensureHeroGovernanceSeedData();

    const payload = importUsersSchema.parse({
      rawCsv: formData.get("rawCsv"),
      mappingJson: formData.get("mappingJson"),
    });

    const mapping = JSON.parse(payload.mappingJson) as UserImportMapping;
    const { records } = parseCsv(payload.rawCsv);

    if (records.length === 0) {
      return {
        status: "error",
        message: "CSV tidak memiliki baris data yang bisa diimport.",
      };
    }

    const [defaultSite] = await db.select().from(sites).limit(1);

    if (!defaultSite) {
      return {
        status: "error",
        message: "Site default belum tersedia untuk import user.",
      };
    }

    const existingEmployees = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        totalPoints: employees.totalPoints,
        levelName: employees.levelName,
        fitStatus: employees.fitStatus,
      })
      .from(employees);

    const employeeByEmail = new Map(
      existingEmployees.map((employee) => [normalizeEmail(employee.email), employee]),
    );
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const managerAssignments: { employeeId: number; managerLabel: string }[] = [];

    for (const record of records) {
      const fullName = getMappedValue(record, mapping, "fullName");
      const email = normalizeEmail(getMappedValue(record, mapping, "email"));

      if (!fullName || !email) {
        skippedCount += 1;
        continue;
      }

      const managerLabel = getMappedValue(record, mapping, "directManager");
      const department = getMappedValue(record, mapping, "department") || "General";
      const section = getMappedValue(record, mapping, "section") || department;
      const jobTitle = getMappedValue(record, mapping, "jobTitle") || "Staff";
      const normalizedStatus = normalizeEmploymentStatus(
        getMappedValue(record, mapping, "status"),
      );
      const employeeStatusType = getMappedValue(record, mapping, "employeeStatusType") || "Permanen | Staff";
      const governanceIds = await resolveEmployeeGovernanceIds({
        department,
        section,
        jobTitle,
      });
      const orgNodeId = await resolveDefaultOrgNodeId(governanceIds.positionId);
      const existing = employeeByEmail.get(email);

      const values = {
        siteId: defaultSite.id,
        name: fullName,
        email,
        employeeSn: getMappedValue(record, mapping, "employeeSn"),
        joinYear: parseJoinYear(getMappedValue(record, mapping, "joinYear")),
        birthPlaceDate: normalizeBirthDateValue(getMappedValue(record, mapping, "ttl")),
        domicile: getMappedValue(record, mapping, "domicile") || "Belum diisi",
        sectionId: governanceIds.sectionId,
        section,
        departmentId: governanceIds.departmentId,
        department,
        positionId: governanceIds.positionId,
        orgNodeId,
        role: jobTitle,
        jobTitle,
        workLocation:
          getMappedValue(record, mapping, "workLocation") || defaultSite.name,
        phoneNumber: getMappedValue(record, mapping, "phoneNumber"),
        employmentStatus: normalizedStatus.status,
        employeeStatusType: employeeStatusType,
        isActive: normalizedStatus.isActive,
      };

      if (existing) {
        await db
          .update(employees)
          .set(values)
          .where(eq(employees.id, existing.id));

        updatedCount += 1;

        if (managerLabel) {
          managerAssignments.push({ employeeId: existing.id, managerLabel });
        }

        employeeByEmail.set(email, existing);
        continue;
      }

      const [inserted] = await db
        .insert(employees)
        .values({
          ...values,
          totalPoints: 0,
          levelName: "Rookie",
          fitStatus: "fit",
        })
        .returning({
          id: employees.id,
          name: employees.name,
          email: employees.email,
        });

      importedCount += 1;

      if (managerLabel) {
        managerAssignments.push({ employeeId: inserted.id, managerLabel });
      }

      employeeByEmail.set(email, {
        ...inserted,
        totalPoints: 0,
        levelName: "Rookie",
        fitStatus: "fit",
      });
    }

    if (managerAssignments.length > 0) {
      const refreshedEmployees = await db
        .select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
        })
        .from(employees);

      const managerByEmail = new Map(
        refreshedEmployees.map((employee) => [normalizeEmail(employee.email), employee]),
      );
      const managerByName = new Map(
        refreshedEmployees.map((employee) => [employee.name.trim().toLowerCase(), employee]),
      );

      for (const assignment of managerAssignments) {
        const manager =
          managerByEmail.get(normalizeEmail(assignment.managerLabel)) ??
          managerByName.get(assignment.managerLabel.trim().toLowerCase());

        if (!manager || manager.id === assignment.employeeId) {
          continue;
        }

        await db
          .update(employees)
          .set({ directManagerId: manager.id })
          .where(eq(employees.id, assignment.employeeId));
      }
    }

    revalidateAdminSurfaces();

    return {
      status: "success",
      message: "Import user berhasil diproses.",
      importedCount,
      updatedCount,
      skippedCount,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Terjadi kendala saat import user.",
    };
  }
}

export async function manageSecurityUserAction(
  _previousState: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    await ensureHeroGovernanceSeedData();

    const payload = manageSecurityUserSchema.parse({
      intent: formData.get("intent"),
      employeeId: formData.get("employeeId"),
      fullName: formData.get("fullName"),
      employeeSn: formData.get("employeeSn"),
      profileImage: formData.get("profileImage"),
      joinYear: formData.get("joinYear"),
      birthPlaceDate: formData.get("birthPlaceDate"),
      domicile: formData.get("domicile"),
      directManagerId: formData.get("directManagerId"),
      section: formData.get("section"),
      department: formData.get("department"),
      jobTitle: formData.get("jobTitle"),
      workLocation: formData.get("workLocation"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
      employmentStatus: formData.get("employmentStatus"),
      accessRole: formData.get("accessRole"),
      password: formData.get("password"),
      newPassword: formData.get("newPassword"),
      employeeStatusType: formData.get("employeeStatusType"),
    });

    if (payload.intent === "create-user") {
      const fullName = payload.fullName?.trim() ?? "";
      const email = normalizeEmail(payload.email ?? "");
      const password = payload.password ?? "";
      const department = payload.department?.trim() || "General";
      const section = payload.section?.trim() || department;
      const jobTitle = payload.jobTitle?.trim() || "Staff";
      const directManagerId = parseOptionalManagerId(payload.directManagerId);
      const normalizedStatus = normalizeEmploymentStatus(
        payload.employmentStatus ?? "active",
      );
      const profileImage = normalizeProfileImageValue(payload.profileImage);
      const governanceIds = await resolveEmployeeGovernanceIds({
        department,
        section,
        jobTitle,
      });
      const orgNodeId = await resolveDefaultOrgNodeId(governanceIds.positionId);

      if (!fullName || !email || !payload.accessRole) {
        return {
          status: "error",
          message: "Nama lengkap, email, dan role wajib diisi.",
        };
      }

      if (password.length < 8) {
        return {
          status: "error",
          message: "Password awal minimal 8 karakter.",
        };
      }

      const [[defaultSite], [existingEmployee], [existingAuthUser], [role]] =
        await Promise.all([
          db.select().from(sites).limit(1),
          db
            .select({ id: employees.id })
            .from(employees)
            .where(eq(employees.email, email))
            .limit(1),
          db
            .select({ id: user.id })
            .from(user)
            .where(eq(user.email, email))
            .limit(1),
          db
            .select()
            .from(securityRoles)
            .where(eq(securityRoles.name, payload.accessRole))
            .limit(1),
        ]);

      if (!defaultSite) {
        return {
          status: "error",
          message: "Site default belum tersedia untuk membuat user manual.",
        };
      }

      if (existingEmployee || existingAuthUser) {
        return {
          status: "error",
          message: "Email sudah dipakai oleh user lain.",
        };
      }

      if (!role) {
        return {
          status: "error",
          message: "Role yang dipilih tidak valid.",
        };
      }

      const authUserId = randomUUID();
      const now = new Date();
      const passwordHash = await hashPassword(password);

      await db.insert(user).values({
        id: authUserId,
        name: fullName,
        email,
        emailVerified: true,
        image: profileImage || null,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(account).values({
        id: randomUUID(),
        accountId: authUserId,
        providerId: "credential",
        userId: authUserId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(employees).values({
        authUserId,
        siteId: defaultSite.id,
        name: fullName,
        email,
        employeeSn: payload.employeeSn?.trim() || "",
        joinYear: parseJoinYear(payload.joinYear ?? ""),
        birthPlaceDate: normalizeBirthDateValue(payload.birthPlaceDate?.trim() || ""),
        domicile: payload.domicile?.trim() || "Belum diisi",
        directManagerId,
        departmentId: governanceIds.departmentId,
        sectionId: governanceIds.sectionId,
        positionId: governanceIds.positionId,
        orgNodeId,
        section,
        department,
        role: jobTitle,
        jobTitle,
        workLocation: payload.workLocation?.trim() || defaultSite.name,
        phoneNumber: payload.phoneNumber?.trim() || "",
        employmentStatus: normalizedStatus.status,
        employeeStatusType: payload.employeeStatusType || "Permanen | Staff",
        accessRole: role.name,
        levelName: "Rookie",
        totalPoints: 0,
        fitStatus: "fit",
        isActive: normalizedStatus.isActive,
      });

      revalidateAdminSurfaces();
      return { status: "success", message: "User baru berhasil dibuat." };
    }

    if (!payload.employeeId) {
      return { status: "error", message: "User tidak valid." };
    }

    const [employee] = await db
      .select({
        id: employees.id,
        authUserId: employees.authUserId,
        name: employees.name,
        email: employees.email,
      })
      .from(employees)
      .where(eq(employees.id, payload.employeeId))
      .limit(1);

    if (!employee) {
      return { status: "error", message: "User tidak ditemukan." };
    }

    if (payload.intent === "update-profile") {
      const email = payload.email?.toLowerCase() ?? employee.email;
      const department = payload.department || "General";
      const section = payload.section || department;
      const jobTitle = payload.jobTitle || "Staff";
      const normalizedStatus = normalizeEmploymentStatus(
        payload.employmentStatus ?? "active",
      );
      const joinYear = parseJoinYear(payload.joinYear ?? "");
      const directManagerId = parseOptionalManagerId(payload.directManagerId);
      const profileImage = normalizeProfileImageValue(payload.profileImage);
      const governanceIds = await resolveEmployeeGovernanceIds({
        department,
        section,
        jobTitle,
      });
      const orgNodeId = await resolveDefaultOrgNodeId(governanceIds.positionId);

      if (directManagerId === employee.id) {
        return {
          status: "error",
          message: "Atasan langsung tidak boleh diri sendiri.",
        };
      }

      await db
        .update(employees)
        .set({
          name: payload.fullName || employee.name,
          employeeSn: payload.employeeSn || "",
          joinYear,
          birthPlaceDate: normalizeBirthDateValue(payload.birthPlaceDate || ""),
          domicile: payload.domicile || "Belum diisi",
          directManagerId,
          departmentId: governanceIds.departmentId,
          sectionId: governanceIds.sectionId,
          positionId: governanceIds.positionId,
          orgNodeId,
          section,
          department,
          role: jobTitle,
          jobTitle,
          workLocation: payload.workLocation || "",
          phoneNumber: payload.phoneNumber || "",
          email,
          employmentStatus: normalizedStatus.status,
          employeeStatusType: payload.employeeStatusType ?? "Permanen | Staff",
          isActive: normalizedStatus.isActive,
        })
        .where(eq(employees.id, employee.id));

      if (employee.authUserId) {
        await db
          .update(user)
          .set({
            name: payload.fullName || employee.name,
            email,
            image: profileImage || null,
            updatedAt: new Date(),
          })
          .where(eq(user.id, employee.authUserId));
      } else if (profileImage) {
        const authUserId = await ensureAuthUserForEmployee({
          id: employee.id,
          authUserId: employee.authUserId,
          name: payload.fullName || employee.name,
          email,
        });

        await db
          .update(user)
          .set({
            image: profileImage,
            updatedAt: new Date(),
          })
          .where(eq(user.id, authUserId));
      }

      revalidateAdminSurfaces();
      return { status: "success", message: "Profil user berhasil diperbarui." };
    }

    if (payload.intent === "ban-user") {
      await db
        .update(employees)
        .set({
          isActive: false,
          employmentStatus: "inactive",
        })
        .where(eq(employees.id, employee.id));

      if (employee.authUserId) {
        await db.delete(session).where(eq(session.userId, employee.authUserId));
      }

      revalidateAdminSurfaces();
      return { status: "success", message: "User berhasil diban." };
    }

    if (payload.intent === "delete-user") {
      if (employee.authUserId) {
        await db.delete(user).where(eq(user.id, employee.authUserId));
      }

      await db.delete(employees).where(eq(employees.id, employee.id));

      revalidateAdminSurfaces();
      return { status: "success", message: "User berhasil dihapus." };
    }

    if (payload.intent === "change-role") {
      if (!payload.accessRole) {
        return { status: "error", message: "Role baru wajib dipilih." };
      }

      const [role] = await db
        .select()
        .from(securityRoles)
        .where(eq(securityRoles.name, payload.accessRole))
        .limit(1);

      if (!role) {
        return { status: "error", message: "Role yang dipilih tidak valid." };
      }

      await db
        .update(employees)
        .set({ accessRole: role.name })
        .where(eq(employees.id, employee.id));

      revalidateAdminSurfaces();
      return { status: "success", message: "Role user berhasil diganti." };
    }

    if (payload.intent === "change-password") {
      const newPassword = payload.newPassword ?? "";

      if (newPassword.length < 8) {
        return {
          status: "error",
          message: "Password baru minimal 8 karakter.",
        };
      }

      const latestEmployee = {
        ...employee,
        name: payload.fullName || employee.name,
        email: (payload.email ?? employee.email).toLowerCase(),
      };
      const authUserId = await ensureAuthUserForEmployee(latestEmployee);
      const now = new Date();
      const passwordHash = await hashPassword(newPassword);

      const [existingCredential] = await db
        .select({ id: account.id })
        .from(account)
        .where(and(eq(account.userId, authUserId), eq(account.providerId, "credential")))
        .limit(1);

      if (existingCredential) {
        await db
          .update(account)
          .set({
            password: passwordHash,
            updatedAt: now,
          })
          .where(eq(account.id, existingCredential.id));
      } else {
        await db.insert(account).values({
          id: randomUUID(),
          accountId: authUserId,
          providerId: "credential",
          userId: authUserId,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        });
      }

      await db.delete(session).where(eq(session.userId, authUserId));

      revalidateAdminSurfaces();
      return { status: "success", message: "Password user berhasil diganti." };
    }

    return { status: "error", message: "Intent user action tidak dikenali." };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Terjadi kendala saat memproses user.",
    };
  }
}

export async function manageSecurityRoleAction(
  _previousState: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    await ensureHeroGovernanceSeedData();

    const payload = manageSecurityRoleSchema.parse({
      intent: formData.get("intent"),
      roleId: formData.get("roleId"),
      roleName: formData.get("roleName"),
      description: formData.get("description"),
      scope: formData.get("scope"),
      sourceRoleId: formData.get("sourceRoleId"),
      permissionsJson: formData.get("permissionsJson"),
    });

    if (payload.intent === "create-role") {
      const roleName = payload.roleName?.trim() ?? "";

      if (!roleName) {
        return { status: "error", message: "Nama role wajib diisi." };
      }

      const [existingRole] = await db
        .select()
        .from(securityRoles)
        .where(eq(securityRoles.name, roleName))
        .limit(1);

      if (existingRole) {
        return { status: "error", message: "Nama role sudah dipakai." };
      }

      const [createdRole] = await db
        .insert(securityRoles)
        .values({
          name: roleName,
          description:
            payload.description?.trim() || "Role baru dari halaman role management.",
          scope: payload.scope?.trim() || "site",
        })
        .returning();

      const menuItems = await db.select().from(navbarMenuItems);
      if (menuItems.length > 0) {
        await db.insert(roleMenuPermissions).values(
          menuItems.map((menuItem) => ({
            roleId: createdRole.id,
            menuItemId: menuItem.id,
            canView: false,
            canEdit: false,
            canDelete: false,
            canSelectAll: false,
          })),
        );
      }

      revalidateAdminSurfaces();
      return { status: "success", message: "Role baru berhasil dibuat." };
    }

    if (payload.intent === "duplicate-role") {
      const sourceRoleId = parseRoleId(payload.sourceRoleId);
      const roleName = payload.roleName?.trim() ?? "";

      if (!sourceRoleId || !roleName) {
        return {
          status: "error",
          message: "Role sumber dan nama role duplikat wajib diisi.",
        };
      }

      const [sourceRole, existingRole] = await Promise.all([
        db
          .select()
          .from(securityRoles)
          .where(eq(securityRoles.id, sourceRoleId))
          .limit(1),
        db
          .select()
          .from(securityRoles)
          .where(eq(securityRoles.name, roleName))
          .limit(1),
      ]);

      if (!sourceRole[0]) {
        return { status: "error", message: "Role sumber tidak ditemukan." };
      }

      if (existingRole[0]) {
        return { status: "error", message: "Nama role duplikat sudah dipakai." };
      }

      const [duplicatedRole] = await db
        .insert(securityRoles)
        .values({
          name: roleName,
          description:
            payload.description?.trim() || `${sourceRole[0].description} (Copy)`,
          scope: payload.scope?.trim() || sourceRole[0].scope,
        })
        .returning();

      const [sourceMenuPermissions, sourceRolePermissions] = await Promise.all([
        db
          .select()
          .from(roleMenuPermissions)
          .where(eq(roleMenuPermissions.roleId, sourceRoleId)),
        db
          .select()
          .from(securityRolePermissions)
          .where(eq(securityRolePermissions.roleId, sourceRoleId)),
      ]);

      if (sourceMenuPermissions.length > 0) {
        await db.insert(roleMenuPermissions).values(
          sourceMenuPermissions.map((permission) => ({
            roleId: duplicatedRole.id,
            menuItemId: permission.menuItemId,
            canView: permission.canView,
            canEdit: permission.canEdit,
            canDelete: permission.canDelete,
            canSelectAll: permission.canSelectAll,
          })),
        );
      }

      if (sourceRolePermissions.length > 0) {
        await db.insert(securityRolePermissions).values(
          sourceRolePermissions.map((permission) => ({
            roleId: duplicatedRole.id,
            permissionId: permission.permissionId,
          })),
        );
      }

      revalidateAdminSurfaces();
      return { status: "success", message: "Role berhasil diduplikasi." };
    }

    if (payload.intent === "delete-role") {
      const roleId = parseRoleId(payload.roleId);

      if (!roleId) {
        return { status: "error", message: "Role tidak valid." };
      }

      const roles = await db.select().from(securityRoles);
      if (roles.length <= 1) {
        return {
          status: "error",
          message: "Minimal harus ada satu role aktif.",
        };
      }

      const [role] = await db
        .select()
        .from(securityRoles)
        .where(eq(securityRoles.id, roleId))
        .limit(1);

      if (!role) {
        return { status: "error", message: "Role tidak ditemukan." };
      }

      const fallbackRole = roles.find((item) => item.id !== role.id);
      if (!fallbackRole) {
        return {
          status: "error",
          message: "Role pengganti tidak tersedia.",
        };
      }

      await db
        .update(employees)
        .set({ accessRole: fallbackRole.name })
        .where(eq(employees.accessRole, role.name));

      await db.delete(securityRoles).where(eq(securityRoles.id, role.id));

      revalidateAdminSurfaces();
      return {
        status: "success",
        message: `Role berhasil dihapus. User lama dipindah ke ${fallbackRole.name}.`,
      };
    }

    if (payload.intent === "save-menu-permissions") {
      const roleId = parseRoleId(payload.roleId);

      if (!roleId || !payload.permissionsJson) {
        return {
          status: "error",
          message: "Data permission role belum lengkap.",
        };
      }

      const matrix = JSON.parse(payload.permissionsJson) as Array<{
        menuItemId: number;
        canView: boolean;
        canEdit: boolean;
        canDelete: boolean;
        canSelectAll: boolean;
      }>;

      for (const item of matrix) {
        const [existingPermission] = await db
          .select({ id: roleMenuPermissions.id })
          .from(roleMenuPermissions)
          .where(
            and(
              eq(roleMenuPermissions.roleId, roleId),
              eq(roleMenuPermissions.menuItemId, item.menuItemId),
            ),
          )
          .limit(1);

        if (existingPermission) {
          await db
            .update(roleMenuPermissions)
            .set({
              canView: item.canView,
              canEdit: item.canEdit,
              canDelete: item.canDelete,
              canSelectAll: item.canSelectAll,
            })
            .where(eq(roleMenuPermissions.id, existingPermission.id));
        } else {
          await db.insert(roleMenuPermissions).values({
            roleId,
            menuItemId: item.menuItemId,
            canView: item.canView,
            canEdit: item.canEdit,
            canDelete: item.canDelete,
            canSelectAll: item.canSelectAll,
          });
        }
      }

      revalidateAdminSurfaces();
      return {
        status: "success",
        message: "Checklist RBAC role berhasil disimpan.",
      };
    }

    return { status: "error", message: "Intent role action tidak dikenali." };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Terjadi kendala saat memproses role.",
    };
  }
}

export async function updateNavbarThemeAction(
  _previousState: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    const payload = navbarThemeSchema.parse({
      headerBackgroundColor: formData.get("headerBackgroundColor"),
    });

    await ensureHeroGovernanceSeedData();

    const [latestTheme] = await db
      .select()
      .from(navbarThemes)
      .orderBy(desc(navbarThemes.createdAt))
      .limit(1);

    if (!latestTheme) {
      return { status: "error", message: "Theme navbar belum tersedia." };
    }

    await db
      .update(navbarThemes)
      .set({
        headerBackgroundColor: payload.headerBackgroundColor,
      })
      .where(eq(navbarThemes.id, latestTheme.id));

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings/navbar");

    return {
      status: "success",
      message: "Warna header navbar berhasil diperbarui.",
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: "error",
        message: error.issues[0]?.message ?? "Input warna header tidak valid.",
      };
    }

    console.error("updateNavbarThemeAction error", error);
    return {
      status: "error",
      message: "Gagal memperbarui warna header navbar.",
    };
  }
}
