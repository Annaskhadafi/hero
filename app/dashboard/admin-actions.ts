"use server";

import { randomUUID } from "crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db";
import { account, session, user } from "@/db/schema/auth";
import {
  activities,
  approvals,
  attendanceRecords,
  dailyReports,
  employees,
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
  timesheetEntries,
  trainingRecords,
  wellnessRecords,
} from "@/db/schema/hero";
import {
  ensureHeroGovernanceSeedData,
  ensureHeroSeedData,
  evaluatePointThresholdBadges,
} from "@/lib/hero-admin";
import {
  createNotificationEventForEmployee,
  sendPushNotification,
} from "@/lib/push-notifications";
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

const bulkApproveApprovalSchema = z.object({
  approvalIds: z.array(z.coerce.number().int().positive()).min(1),
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

const optionalFormString = z.preprocess(
  (value) => (value === null || value === undefined ? undefined : value),
  z.string().trim().optional(),
);

const optionalPositiveInt = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

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
});

const manageSecurityRoleSchema = z.object({
  intent: z.enum([
    "create-role",
    "duplicate-role",
    "delete-role",
    "save-menu-permissions",
  ]),
  roleId: optionalFormString,
  roleName: optionalFormString,
  description: optionalFormString,
  scope: optionalFormString,
  sourceRoleId: optionalFormString,
  permissionsJson: optionalFormString,
});

const optionalRecordId = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

const optionalEmployeeId = z.preprocess(
  (value) => (value === "" || value === "none" || value === null || value === undefined ? null : value),
  z.coerce.number().int().positive().nullable(),
);

const manageHseObservationSchema = z.object({
  intent: z.enum(["create", "update", "update-status", "delete"]),
  id: optionalRecordId,
  siteId: z.coerce.number().int().positive().optional(),
  employeeId: optionalEmployeeId.optional().default(null),
  category: z.string().trim().max(120).optional().default("Observation"),
  title: z.string().trim().max(200).optional().default(""),
  location: z.string().trim().max(200).optional().default(""),
  severity: z.string().trim().max(50).optional().default("Low"),
  status: z.string().trim().max(50).optional().default("open"),
  notes: z.string().trim().max(1000).optional().default(""),
  observedAt: z.string().trim().optional().default(""),
});

const manageHseIncidentSchema = z.object({
  intent: z.enum(["create", "update", "update-status", "delete"]),
  id: optionalRecordId,
  siteId: z.coerce.number().int().positive().optional(),
  type: z.string().trim().max(120).optional().default("Incident"),
  title: z.string().trim().max(200).optional().default(""),
  unitNumber: z.string().trim().max(120).optional().default("-"),
  impact: z.string().trim().max(500).optional().default(""),
  status: z.string().trim().max(50).optional().default("investigating"),
  reportedAt: z.string().trim().optional().default(""),
});

const manageTrainingRecordSchema = z.object({
  intent: z.enum(["create", "update", "update-status", "delete"]),
  id: optionalRecordId,
  employeeId: z.coerce.number().int().positive().optional(),
  trainingName: z.string().trim().max(200).optional().default(""),
  provider: z.string().trim().max(160).optional().default(""),
  expiresAt: z.string().trim().optional().default(""),
  status: z.string().trim().max(50).optional().default("active"),
});

const manageWellnessRecordSchema = z.object({
  intent: z.enum(["create", "update", "update-status", "delete"]),
  id: optionalRecordId,
  employeeId: z.coerce.number().int().positive().optional(),
  metricType: z.string().trim().max(120).optional().default("Fit for Work"),
  metricValue: z.string().trim().max(120).optional().default(""),
  status: z.string().trim().max(50).optional().default("healthy"),
  notes: z.string().trim().max(1000).optional().default(""),
  recordedAt: z.string().trim().optional().default(""),
});

const manageAttendanceRecordSchema = z.object({
  intent: z.enum(["create", "update", "update-status", "delete"]),
  id: optionalRecordId,
  employeeId: z.coerce.number().int().positive().optional(),
  siteId: z.coerce.number().int().positive().optional(),
  eventType: z.string().trim().max(80).optional().default("checked-in"),
  eventTime: z.string().trim().optional().default(""),
  status: z.string().trim().max(80).optional().default("verified"),
  locationNote: z.string().trim().max(1000).optional().default(""),
  photoUrl: z.string().trim().max(1000).optional().default(""),
  latitude: z.string().trim().max(80).optional().default(""),
  longitude: z.string().trim().max(80).optional().default(""),
});

const manageTimesheetEntrySchema = z.object({
  intent: z.enum(["create", "update", "update-status", "delete"]),
  id: optionalRecordId,
  employeeId: z.coerce.number().int().positive().optional(),
  siteId: z.coerce.number().int().positive().optional(),
  periodLabel: z.string().trim().max(160).optional().default(""),
  regularMinutes: z.coerce.number().int().min(0).max(43200).optional().default(0),
  overtimeMinutes: z.coerce.number().int().min(0).max(43200).optional().default(0),
  overtimeAmount: z.coerce.number().int().min(0).max(1_000_000_000).optional().default(0),
  status: z.string().trim().max(50).optional().default("pending"),
});

const manageDailyReportSchema = z.object({
  intent: z.enum(["create", "update", "update-status", "delete"]),
  id: optionalRecordId,
  siteId: z.coerce.number().int().positive().optional(),
  reportDate: z.string().trim().optional().default(""),
  customerName: z.string().trim().max(200).optional().default(""),
  totalSections: z.coerce.number().int().min(1).max(50).optional().default(4),
  readySections: z.coerce.number().int().min(0).max(50).optional().default(0),
  jobsCompleted: z.coerce.number().int().min(0).max(10000).optional().default(0),
  manpowerPresent: z.coerce.number().int().min(0).max(10000).optional().default(0),
  hseSummary: z.string().trim().max(1000).optional().default(""),
  status: z.string().trim().max(50).optional().default("draft"),
});

const managePointEventSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: optionalRecordId,
  employeeId: z.coerce.number().int().positive().optional(),
  category: z.string().trim().max(120).optional().default("Manual Adjustment"),
  label: z.string().trim().max(200).optional().default(""),
  points: z.coerce.number().int().min(-10000).max(10000).optional().default(0),
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

async function applyApprovalDecision(params: {
  approvalId: number;
  decision: "approved" | "rejected" | "needs_correction";
  note: string;
}) {
  const trimmedNote = params.note.trim();

  if (params.decision === "rejected" && !trimmedNote) {
    throw new Error("Komentar penolakan wajib diisi.");
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
    .limit(1);

  if (!approval) {
    throw new Error("Approval tidak ditemukan.");
  }

  if (approval.status !== "pending") {
    return false;
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
      params.decision === "approved"
        ? "Approval diteruskan sesuai workflow."
        : params.decision === "rejected"
          ? "Request ditolak pada step ini."
          : "Request dikembalikan untuk revisi.";

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
      .where(eq(approvals.id, approval.approvalId));

    if (params.decision === "needs_correction") {
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

    if (params.decision === "rejected") {
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

    if (approval.submissionTime != null) {
      const [existingAwardEvent] = await tx
        .select({ id: pointEvents.id })
        .from(pointEvents)
        .where(
          and(
            eq(pointEvents.sourceType, "activity"),
            eq(pointEvents.sourceId, approval.activityId),
          ),
        )
        .limit(1);

      if (!existingAwardEvent) {
        const netPoints = approval.pointsAwarded - approval.penaltyDeducted;
        const [employeePointState] = await tx
          .select({
            totalPoints: employees.totalPoints,
          })
          .from(employees)
          .where(eq(employees.id, approval.employeeId))
          .limit(1);

        if (employeePointState) {
          const updatedBalance = Math.max(0, employeePointState.totalPoints + netPoints);

          await tx.insert(pointEvents).values({
            employeeId: approval.employeeId,
            transactionType: netPoints >= 0 ? "reward" : "penalty",
            sourceType: "activity",
            sourceId: approval.activityId,
            category: "Daily Activity Approval",
            label: `${approval.activityTitle} • Approved`,
            points: netPoints,
            balanceAfter: updatedBalance,
            metadata: JSON.stringify({
              approvalId: approval.approvalId,
              approvalLevel: approval.level,
              penaltyDeducted: approval.penaltyDeducted,
            }),
            createdAt: now,
          });

          await tx
            .update(employees)
            .set({
              totalPoints: updatedBalance,
            })
            .where(eq(employees.id, approval.employeeId));
          
          await evaluatePointThresholdBadges(tx, approval.employeeId, updatedBalance);
        }
      }
    }

    await tx
      .update(activities)
      .set({
        status: "Approved",
      })
      .where(eq(activities.id, approval.activityId));
  });

  await syncActivityWorkflowArtifacts(approval.activityId);
  await runApprovalAutomationTick();

  return true;
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
    "/mobile",
    "/mobile/dashboard",
    "/mobile/activity",
    "/mobile/menu",
    "/mobile/approval",
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
  await applyApprovalDecision({
    approvalId: payload.approvalId,
    decision: payload.decision,
    note: payload.note,
  });

  revalidateAdminSurfaces();
}

export async function approveApprovalGroupAction(formData: FormData) {
  await ensureHeroSeedData();

  const payload = bulkApproveApprovalSchema.parse({
    approvalIds: formData.getAll("approvalIds"),
    note: formData.get("note"),
  });

  for (const approvalId of payload.approvalIds) {
    await applyApprovalDecision({
      approvalId,
      decision: "approved",
      note: payload.note,
    });
  }

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
      siteId: formData.get("siteId"),
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

      const [[currentDefaultSite], [selectedSite], [existingEmployee], [existingAuthUser], [role]] =
        await Promise.all([
          db.select().from(sites).limit(1),
          payload.siteId
            ? db.select().from(sites).where(eq(sites.id, payload.siteId)).limit(1)
            : Promise.resolve([]),
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

      const defaultSite =
        selectedSite ??
        currentDefaultSite ??
        (
          await db
            .insert(sites)
            .values({
              name: payload.workLocation?.trim() || "Default Site",
              location: payload.workLocation?.trim() || "Default Site",
              customerName: "PT Chitra Paratama",
              contractNumber: "MANUAL-DEFAULT",
              isActive: true,
            })
            .returning()
        )[0];

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
        siteId: employees.siteId,
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
      const [selectedSite] = payload.siteId
        ? await db.select().from(sites).where(eq(sites.id, payload.siteId)).limit(1)
        : [];
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
          siteId: selectedSite?.id ?? employee.siteId,
          section,
          department,
          role: jobTitle,
          jobTitle,
          workLocation: selectedSite?.name || payload.workLocation || "",
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

function parseOperationalDate(value: string, fallback = new Date()) {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Tanggal tidak valid.");
  }

  return parsed;
}

function getRequiredId(id: number | undefined, label = "Data") {
  if (!id) {
    throw new Error(`${label} tidak valid.`);
  }

  return id;
}

function revalidateOperationalPages(...paths: string[]) {
  for (const path of paths) {
    revalidatePath(path);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/analytics");
}

async function getActiveSiteEmployeeIds(siteId: number) {
  const rows = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(eq(employees.siteId, siteId), eq(employees.isActive, true)));

  return rows.map((row) => row.id);
}

async function notifyEmployeesForHseAlert(input: {
  siteId: number;
  title: string;
  body: string;
  eventType: string;
}) {
  const employeeIds = await getActiveSiteEmployeeIds(input.siteId);

  await Promise.all(
    employeeIds.map(async (employeeId) => {
      const event = await createNotificationEventForEmployee({
        employeeId,
        eventType: input.eventType,
        category: "hse_alerts",
        title: input.title,
        body: input.body,
        url: "/mobile/hse",
      });

      if (!event) {
        return;
      }

      await sendPushNotification({
        employeeId,
        category: "hse_alerts",
        title: input.title,
        body: input.body,
        url: "/mobile/hse",
        tag: `hse-${event.id}`,
        notificationEventId: event.id,
      });
    }),
  );
}

async function notifyEmployeeForPointUpdate(input: {
  employeeId: number;
  title: string;
  body: string;
}) {
  const event = await createNotificationEventForEmployee({
    employeeId: input.employeeId,
    eventType: "points_updated",
    category: "points_updates",
    title: input.title,
    body: input.body,
    url: "/mobile/gamification",
  });

  if (!event) {
    return;
  }

  await sendPushNotification({
    employeeId: input.employeeId,
    category: "points_updates",
    title: input.title,
    body: input.body,
    url: "/mobile/gamification",
    tag: `points-${event.id}`,
    notificationEventId: event.id,
  });
}

export async function manageHseObservationAction(formData: FormData): Promise<AdminMutationState> {
  try {
    const payload = manageHseObservationSchema.parse(Object.fromEntries(formData));
    await ensureHeroSeedData();

    if (payload.intent === "create") {
      if (!payload.siteId || !payload.title || !payload.location || !payload.notes) {
        return { status: "error", message: "Site, judul, lokasi, dan catatan wajib diisi." };
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
      });

      await notifyEmployeesForHseAlert({
        siteId: payload.siteId,
        title: `HSE alert: ${payload.title}`,
        body: `${payload.severity} di ${payload.location}. ${payload.notes.slice(0, 96)}`,
        eventType: "hse_observation_created",
      });

      revalidateOperationalPages("/dashboard/hse");
      return { status: "success", message: "Observasi HSE berhasil ditambahkan." };
    }

    const id = getRequiredId(payload.id, "Observasi HSE");

    if (payload.intent === "update-status") {
      await db.update(hseObservations).set({ status: payload.status }).where(eq(hseObservations.id, id));

      const [currentObservation] = await db
        .select({
          siteId: hseObservations.siteId,
          title: hseObservations.title,
          location: hseObservations.location,
        })
        .from(hseObservations)
        .where(eq(hseObservations.id, id))
        .limit(1);

      if (currentObservation) {
        await notifyEmployeesForHseAlert({
          siteId: currentObservation.siteId,
          title: `HSE update: ${currentObservation.title}`,
          body: `Status berubah ke ${payload.status.replaceAll("_", " ")} di ${currentObservation.location}.`,
          eventType: "hse_observation_status_changed",
        });
      }

      revalidateOperationalPages("/dashboard/hse");
      return { status: "success", message: "Status observasi HSE diperbarui." };
    }

    if (payload.intent === "update") {
      if (!payload.siteId || !payload.title || !payload.location || !payload.notes) {
        return { status: "error", message: "Site, judul, lokasi, dan catatan wajib diisi." };
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
        .where(eq(hseObservations.id, id));

      revalidateOperationalPages("/dashboard/hse");
      return { status: "success", message: "Detail observasi HSE diperbarui." };
    }

    await db.delete(hseObservations).where(eq(hseObservations.id, id));
    revalidateOperationalPages("/dashboard/hse");
    return { status: "success", message: "Observasi HSE dihapus." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Gagal memproses observasi HSE.",
    };
  }
}

export async function manageHseIncidentAction(formData: FormData): Promise<AdminMutationState> {
  try {
    const payload = manageHseIncidentSchema.parse(Object.fromEntries(formData));
    await ensureHeroSeedData();

    if (payload.intent === "create") {
      if (!payload.siteId || !payload.title || !payload.impact) {
        return { status: "error", message: "Site, judul, dan impact wajib diisi." };
      }

      await db.insert(hseIncidents).values({
        siteId: payload.siteId,
        type: payload.type,
        title: payload.title,
        unitNumber: payload.unitNumber,
        impact: payload.impact,
        status: payload.status,
        reportedAt: parseOperationalDate(payload.reportedAt),
      });

      await notifyEmployeesForHseAlert({
        siteId: payload.siteId,
        title: `Incident HSE: ${payload.title}`,
        body: `${payload.type} · ${payload.impact.slice(0, 96)}`,
        eventType: "hse_incident_created",
      });

      revalidateOperationalPages("/dashboard/hse");
      return { status: "success", message: "Incident HSE berhasil ditambahkan." };
    }

    const id = getRequiredId(payload.id, "Incident HSE");

    if (payload.intent === "update-status") {
      await db.update(hseIncidents).set({ status: payload.status }).where(eq(hseIncidents.id, id));

      const [currentIncident] = await db
        .select({
          siteId: hseIncidents.siteId,
          title: hseIncidents.title,
          unitNumber: hseIncidents.unitNumber,
        })
        .from(hseIncidents)
        .where(eq(hseIncidents.id, id))
        .limit(1);

      if (currentIncident) {
        await notifyEmployeesForHseAlert({
          siteId: currentIncident.siteId,
          title: `Incident update: ${currentIncident.title}`,
          body: `Status berubah ke ${payload.status.replaceAll("_", " ")} untuk ${currentIncident.unitNumber}.`,
          eventType: "hse_incident_status_changed",
        });
      }

      revalidateOperationalPages("/dashboard/hse");
      return { status: "success", message: "Status incident HSE diperbarui." };
    }

    if (payload.intent === "update") {
      if (!payload.siteId || !payload.title || !payload.impact) {
        return { status: "error", message: "Site, judul, dan impact wajib diisi." };
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
        .where(eq(hseIncidents.id, id));

      revalidateOperationalPages("/dashboard/hse");
      return { status: "success", message: "Detail incident HSE diperbarui." };
    }

    await db.delete(hseIncidents).where(eq(hseIncidents.id, id));
    revalidateOperationalPages("/dashboard/hse");
    return { status: "success", message: "Incident HSE dihapus." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Gagal memproses incident HSE.",
    };
  }
}

export async function manageTrainingRecordAction(formData: FormData): Promise<AdminMutationState> {
  try {
    const payload = manageTrainingRecordSchema.parse(Object.fromEntries(formData));
    await ensureHeroSeedData();

    if (payload.intent === "create") {
      if (!payload.employeeId || !payload.trainingName || !payload.provider || !payload.expiresAt) {
        return { status: "error", message: "Karyawan, training, provider, dan expiry wajib diisi." };
      }

      await db.insert(trainingRecords).values({
        employeeId: payload.employeeId,
        trainingName: payload.trainingName,
        provider: payload.provider,
        expiresAt: parseOperationalDate(payload.expiresAt),
        status: payload.status,
      });

      revalidateOperationalPages("/dashboard/hc");
      return { status: "success", message: "Training record berhasil ditambahkan." };
    }

    const id = getRequiredId(payload.id, "Training record");

    if (payload.intent === "update-status") {
      await db.update(trainingRecords).set({ status: payload.status }).where(eq(trainingRecords.id, id));
      revalidateOperationalPages("/dashboard/hc");
      return { status: "success", message: "Status training diperbarui." };
    }

    if (payload.intent === "update") {
      if (!payload.employeeId || !payload.trainingName || !payload.provider || !payload.expiresAt) {
        return { status: "error", message: "Karyawan, training, provider, dan expiry wajib diisi." };
      }

      await db
        .update(trainingRecords)
        .set({
          employeeId: payload.employeeId,
          trainingName: payload.trainingName,
          provider: payload.provider,
          expiresAt: parseOperationalDate(payload.expiresAt),
          status: payload.status,
        })
        .where(eq(trainingRecords.id, id));

      revalidateOperationalPages("/dashboard/hc");
      return { status: "success", message: "Detail training diperbarui." };
    }

    await db.delete(trainingRecords).where(eq(trainingRecords.id, id));
    revalidateOperationalPages("/dashboard/hc");
    return { status: "success", message: "Training record dihapus." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Gagal memproses training record.",
    };
  }
}

export async function manageWellnessRecordAction(formData: FormData): Promise<AdminMutationState> {
  try {
    const payload = manageWellnessRecordSchema.parse(Object.fromEntries(formData));
    await ensureHeroSeedData();

    if (payload.intent === "create") {
      if (!payload.employeeId || !payload.metricValue || !payload.notes) {
        return { status: "error", message: "Karyawan, nilai metrik, dan catatan wajib diisi." };
      }

      await db.insert(wellnessRecords).values({
        employeeId: payload.employeeId,
        metricType: payload.metricType,
        metricValue: payload.metricValue,
        status: payload.status,
        notes: payload.notes,
        recordedAt: parseOperationalDate(payload.recordedAt),
      });

      revalidateOperationalPages("/dashboard/hc");
      return { status: "success", message: "Wellness record berhasil ditambahkan." };
    }

    const id = getRequiredId(payload.id, "Wellness record");

    if (payload.intent === "update-status") {
      await db.update(wellnessRecords).set({ status: payload.status }).where(eq(wellnessRecords.id, id));
      revalidateOperationalPages("/dashboard/hc");
      return { status: "success", message: "Status wellness diperbarui." };
    }

    if (payload.intent === "update") {
      if (!payload.employeeId || !payload.metricValue || !payload.notes) {
        return { status: "error", message: "Karyawan, nilai metrik, dan catatan wajib diisi." };
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
        .where(eq(wellnessRecords.id, id));

      revalidateOperationalPages("/dashboard/hc");
      return { status: "success", message: "Detail wellness diperbarui." };
    }

    await db.delete(wellnessRecords).where(eq(wellnessRecords.id, id));
    revalidateOperationalPages("/dashboard/hc");
    return { status: "success", message: "Wellness record dihapus." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Gagal memproses wellness record.",
    };
  }
}

export async function manageAttendanceRecordAction(formData: FormData): Promise<AdminMutationState> {
  try {
    const payload = manageAttendanceRecordSchema.parse(Object.fromEntries(formData));
    await ensureHeroSeedData();

    if (payload.intent === "create") {
      if (!payload.employeeId || !payload.siteId || !payload.eventTime || !payload.locationNote) {
        return { status: "error", message: "Karyawan, site, waktu, dan catatan lokasi wajib diisi." };
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
      });

      revalidateOperationalPages("/dashboard/hc", "/dashboard/attendance/records");
      return { status: "success", message: "Attendance record berhasil ditambahkan." };
    }

    const id = getRequiredId(payload.id, "Attendance record");

    if (payload.intent === "update-status") {
      await db.update(attendanceRecords).set({ status: payload.status }).where(eq(attendanceRecords.id, id));
      revalidateOperationalPages("/dashboard/hc", "/dashboard/attendance/records");
      return { status: "success", message: "Status attendance diperbarui." };
    }

    if (payload.intent === "update") {
      if (!payload.employeeId || !payload.siteId || !payload.eventTime || !payload.locationNote) {
        return { status: "error", message: "Karyawan, site, waktu, dan catatan lokasi wajib diisi." };
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
        .where(eq(attendanceRecords.id, id));

      revalidateOperationalPages("/dashboard/hc", "/dashboard/attendance/records");
      return { status: "success", message: "Detail attendance diperbarui." };
    }

    await db.delete(attendanceRecords).where(eq(attendanceRecords.id, id));
    revalidateOperationalPages("/dashboard/hc", "/dashboard/attendance/records");
    return { status: "success", message: "Attendance record dihapus." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Gagal memproses attendance record.",
    };
  }
}

export async function manageTimesheetEntryAction(formData: FormData): Promise<AdminMutationState> {
  try {
    const payload = manageTimesheetEntrySchema.parse(Object.fromEntries(formData));
    await ensureHeroSeedData();

    if (payload.intent === "create") {
      if (!payload.employeeId || !payload.siteId || !payload.periodLabel) {
        return { status: "error", message: "Karyawan, site, dan periode wajib diisi." };
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
      });

      revalidateOperationalPages("/dashboard/timesheet");
      return { status: "success", message: "Timesheet entry berhasil ditambahkan." };
    }

    const id = getRequiredId(payload.id, "Timesheet entry");

    if (payload.intent === "update-status") {
      await db
        .update(timesheetEntries)
        .set({ status: payload.status, updatedAt: new Date() })
        .where(eq(timesheetEntries.id, id));
      revalidateOperationalPages("/dashboard/timesheet");
      return { status: "success", message: "Status timesheet diperbarui." };
    }

    if (payload.intent === "update") {
      if (!payload.employeeId || !payload.siteId || !payload.periodLabel) {
        return { status: "error", message: "Karyawan, site, dan periode wajib diisi." };
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
        .where(eq(timesheetEntries.id, id));

      revalidateOperationalPages("/dashboard/timesheet");
      return { status: "success", message: "Detail timesheet diperbarui." };
    }

    await db.delete(timesheetEntries).where(eq(timesheetEntries.id, id));
    revalidateOperationalPages("/dashboard/timesheet");
    return { status: "success", message: "Timesheet entry dihapus." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Gagal memproses timesheet.",
    };
  }
}

export async function manageDailyReportAction(formData: FormData): Promise<AdminMutationState> {
  try {
    const payload = manageDailyReportSchema.parse(Object.fromEntries(formData));
    await ensureHeroSeedData();

    if (payload.intent === "create") {
      if (!payload.siteId || !payload.reportDate || !payload.customerName || !payload.hseSummary) {
        return { status: "error", message: "Site, tanggal, customer, dan HSE summary wajib diisi." };
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
      });

      revalidateOperationalPages("/dashboard/reports");
      return { status: "success", message: "Daily report berhasil ditambahkan." };
    }

    const id = getRequiredId(payload.id, "Daily report");

    if (payload.intent === "update-status") {
      await db.update(dailyReports).set({ status: payload.status }).where(eq(dailyReports.id, id));
      revalidateOperationalPages("/dashboard/reports");
      return { status: "success", message: "Status daily report diperbarui." };
    }

    if (payload.intent === "update") {
      if (!payload.siteId || !payload.reportDate || !payload.customerName || !payload.hseSummary) {
        return { status: "error", message: "Site, tanggal, customer, dan HSE summary wajib diisi." };
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
        .where(eq(dailyReports.id, id));

      revalidateOperationalPages("/dashboard/reports");
      return { status: "success", message: "Detail daily report diperbarui." };
    }

    await db.delete(dailyReports).where(eq(dailyReports.id, id));
    revalidateOperationalPages("/dashboard/reports");
    return { status: "success", message: "Daily report dihapus." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Gagal memproses daily report.",
    };
  }
}

export async function managePointEventAction(formData: FormData): Promise<AdminMutationState> {
  try {
    const payload = managePointEventSchema.parse(Object.fromEntries(formData));
    await ensureHeroSeedData();

    if (payload.intent === "create") {
      if (!payload.employeeId || !payload.label || payload.points === 0) {
        return { status: "error", message: "Karyawan, label, dan poin selain 0 wajib diisi." };
      }

      await db.transaction(async (tx) => {
        await tx.insert(pointEvents).values({
          employeeId: payload.employeeId!,
          category: payload.category,
          label: payload.label,
          points: payload.points,
          createdAt: new Date(),
        });
        const [updatedEmployee] = await tx
          .update(employees)
          .set({ totalPoints: sql`${employees.totalPoints} + ${payload.points}` })
          .where(eq(employees.id, payload.employeeId!))
          .returning({ totalPoints: employees.totalPoints });
        
        await evaluatePointThresholdBadges(tx, payload.employeeId!, updatedEmployee.totalPoints);
      });

      await notifyEmployeeForPointUpdate({
        employeeId: payload.employeeId,
        title: payload.points > 0 ? "Points added" : "Points adjusted",
        body: `${payload.label} • ${payload.points > 0 ? "+" : ""}${payload.points} poin.`,
      });

      revalidateOperationalPages("/dashboard/leaderboard");
      return { status: "success", message: "Point event berhasil ditambahkan." };
    }

    const id = getRequiredId(payload.id, "Point event");

    if (payload.intent === "update") {
      if (!payload.employeeId || !payload.label || payload.points === 0) {
        return { status: "error", message: "Karyawan, label, dan poin selain 0 wajib diisi." };
      }

      const [existingEvent] = await db.select().from(pointEvents).where(eq(pointEvents.id, id)).limit(1);

      if (!existingEvent) {
        return { status: "error", message: "Point event tidak ditemukan." };
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
          .where(eq(pointEvents.id, id));

        await tx
          .update(employees)
          .set({ totalPoints: sql`${employees.totalPoints} - ${existingEvent.points}` })
          .where(eq(employees.id, existingEvent.employeeId));

        await tx
          .update(employees)
          .set({ totalPoints: sql`${employees.totalPoints} + ${payload.points}` })
          .where(eq(employees.id, payload.employeeId!));
      });

      await notifyEmployeeForPointUpdate({
        employeeId: payload.employeeId,
        title: "Points updated",
        body: `${payload.label} disesuaikan menjadi ${payload.points > 0 ? "+" : ""}${payload.points} poin.`,
      });

      revalidateOperationalPages("/dashboard/leaderboard");
      return { status: "success", message: "Detail point event diperbarui." };
    }

    const [event] = await db.select().from(pointEvents).where(eq(pointEvents.id, id)).limit(1);

    if (!event) {
      return { status: "error", message: "Point event tidak ditemukan." };
    }

    await db.transaction(async (tx) => {
      await tx.delete(pointEvents).where(eq(pointEvents.id, id));
      await tx
        .update(employees)
        .set({ totalPoints: sql`${employees.totalPoints} - ${event.points}` })
        .where(eq(employees.id, event.employeeId));
    });

    revalidateOperationalPages("/dashboard/leaderboard");
    return { status: "success", message: "Point event dihapus dan poin karyawan disesuaikan." };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Gagal memproses point event.",
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

const managePenaltyEventSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  penaltyCode: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional().default(""),
  pointsDeducted: z.coerce.number().int().min(1).max(10000),
});

const resolveDisputeSchema = z.object({
  disputeId: z.coerce.number().int().positive(),
  status: z.enum(["accepted", "rejected"]),
  resolutionNotes: z.string().trim().max(1000).optional().default(""),
});

export async function createPenaltyEvent(
  _previousState: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    const payload = managePenaltyEventSchema.parse({
      employeeId: formData.get("employeeId"),
      penaltyCode: formData.get("penaltyCode"),
      description: formData.get("description"),
      pointsDeducted: formData.get("pointsDeducted"),
    });

    await db.transaction(async (tx) => {
      const [employee] = await tx
        .select({ siteId: employees.siteId })
        .from(employees)
        .where(eq(employees.id, payload.employeeId))
        .limit(1);

      if (!employee) {
        throw new Error("Employee not found.");
      }

      await tx.insert(penaltyEvents).values({
        employeeId: payload.employeeId,
        siteId: employee.siteId,
        penaltyCode: payload.penaltyCode,
        penaltyType: "manual",
        description: payload.description,
        pointsDeducted: payload.pointsDeducted,
      });

      await tx
        .update(employees)
        .set({ totalPoints: sql`${employees.totalPoints} - ${payload.pointsDeducted}` })
        .where(eq(employees.id, payload.employeeId));
    });

    revalidatePath("/dashboard/leaderboard");
    return { status: "success", message: "Penalty berhasil ditambahkan." };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "error", message: error.issues[0]?.message ?? "Input tidak valid." };
    }
    return { status: "error", message: "Gagal memproses penalty event." };
  }
}

export async function resolveDisputeAction(
  _previousState: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    const payload = resolveDisputeSchema.parse({
      disputeId: formData.get("disputeId"),
      status: formData.get("status"),
      resolutionNotes: formData.get("resolutionNotes"),
    });

    const [dispute] = await db
      .select()
      .from(pointDisputes)
      .innerJoin(penaltyEvents, eq(pointDisputes.penaltyEventId, penaltyEvents.id))
      .where(eq(pointDisputes.id, payload.disputeId))
      .limit(1);

    if (!dispute) return { status: "error", message: "Dispute tidak ditemukan." };
    if (dispute.hero_point_disputes.status !== "pending") {
      return { status: "error", message: "Dispute sudah diproses." };
    }

    await db.transaction(async (tx) => {
      await tx.update(pointDisputes).set({
        status: payload.status,
        resolutionNotes: payload.resolutionNotes,
        resolvedAt: new Date(),
      }).where(eq(pointDisputes.id, payload.disputeId));

      if (payload.status === "accepted") {
        // Refund points if accepted
        const [updatedEmployee] = await tx
          .update(employees)
          .set({ totalPoints: sql`${employees.totalPoints} + ${dispute.hero_penalty_events.pointsDeducted}` })
          .where(eq(employees.id, dispute.hero_penalty_events.employeeId))
          .returning({ totalPoints: employees.totalPoints });
          
        await evaluatePointThresholdBadges(tx, dispute.hero_penalty_events.employeeId, updatedEmployee.totalPoints);
      }

      await tx.update(penaltyEvents).set({ isDisputed: false })
        .where(eq(penaltyEvents.id, dispute.hero_penalty_events.id));
    });

    revalidatePath("/dashboard/leaderboard");
    return { status: "success", message: `Dispute berhasil di-${payload.status}.` };
  } catch (error) {
    return { status: "error", message: "Gagal memproses dispute." };
  }
}

export async function exportPointsExcel() {
  // Stub for Excel export. This would typically return a URL or trigger a client-side download based on provided filters.
  // In a Server Action, we either send data down or handle via a dedicated API route. We will wire this up later.
  return { status: "success", data: "Data exported" };
}

const manageLevelSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, "Nama level harus diisi"),
  minPoints: z.coerce.number().min(0, "Poin minimum harus >= 0"),
  description: z.string().optional().default(""),
  colorCode: z.string().min(1, "Kode warna harus diisi"),
  isActive: z.coerce.boolean().default(true),
});

export async function manageLevelAction(
  _prevState: AdminMutationState,
  formData: FormData
): Promise<AdminMutationState> {
  try {
    const intent = formData.get("intent");
    const payload = manageLevelSchema.parse({
      id: formData.get("id"),
      name: formData.get("name"),
      minPoints: formData.get("minPoints"),
      description: formData.get("description"),
      colorCode: formData.get("colorCode"),
      isActive: formData.get("isActive") === "true",
    });

    if (intent === "create") {
      await db.insert(levels).values({
        name: payload.name,
        minPoints: payload.minPoints,
        description: payload.description,
        colorCode: payload.colorCode,
        isActive: payload.isActive,
      });
      revalidatePath("/dashboard/leaderboard");
      return { status: "success", message: "Level berhasil dibuat." };
    }

    if (intent === "update" && payload.id) {
      await db
        .update(levels)
        .set({
          name: payload.name,
          minPoints: payload.minPoints,
          description: payload.description,
          colorCode: payload.colorCode,
          isActive: payload.isActive,
        })
        .where(eq(levels.id, payload.id));
      revalidatePath("/dashboard/leaderboard");
      return { status: "success", message: "Level berhasil diupdate." };
    }

    if (intent === "delete" && payload.id) {
      await db.delete(levels).where(eq(levels.id, payload.id));
      revalidatePath("/dashboard/leaderboard");
      return { status: "success", message: "Level berhasil dihapus." };
    }

    return { status: "error", message: "Intent tidak valid." };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const e = error as z.ZodError<any>;
      return { status: "error", message: e.issues[0]?.message || "Input tidak valid." };
    }
    return { status: "error", message: "Gagal menyimpan level." };
  }
}

const manageBadgeSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1, "Nama badge harus diisi"),
  description: z.string().optional().default(""),
  iconUrl: z.string().optional().default("🏆"), // Support lucide/emoji text if no actual file
  colorCode: z.string().min(1, "Kode warna harus diisi"),
  autoAssignRule: z.enum(["none", "points_threshold"]).default("none"),
  autoAssignThreshold: z.coerce.number().default(0),
  isActive: z.coerce.boolean().default(true),
});

export async function manageBadgeAction(
  _prevState: AdminMutationState,
  formData: FormData
): Promise<AdminMutationState> {
  try {
    const intent = formData.get("intent");
    const payload = manageBadgeSchema.parse({
      id: formData.get("id"),
      name: formData.get("name"),
      description: formData.get("description"),
      iconUrl: formData.get("iconUrl"),
      colorCode: formData.get("colorCode"),
      autoAssignRule: formData.get("autoAssignRule"),
      autoAssignThreshold: formData.get("autoAssignThreshold"),
      isActive: formData.get("isActive") === "true",
    });

    if (intent === "create") {
      await db.insert(badges).values({
        name: payload.name,
        description: payload.description,
        iconUrl: payload.iconUrl,
        colorCode: payload.colorCode,
        autoAssignRule: payload.autoAssignRule,
        autoAssignThreshold: payload.autoAssignThreshold,
        isActive: payload.isActive,
      });
      revalidatePath("/dashboard/leaderboard");
      return { status: "success", message: "Badge berhasil dibuat." };
    }

    if (intent === "update" && payload.id) {
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
        .where(eq(badges.id, payload.id));
      revalidatePath("/dashboard/leaderboard");
      return { status: "success", message: "Badge berhasil diupdate." };
    }

    if (intent === "delete" && payload.id) {
      await db.delete(badges).where(eq(badges.id, payload.id));
      revalidatePath("/dashboard/leaderboard");
      return { status: "success", message: "Badge berhasil dihapus." };
    }

    return { status: "error", message: "Intent tidak valid." };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const e = error as z.ZodError<any>;
      return { status: "error", message: e.issues[0]?.message || "Input tidak valid." };
    }
    return { status: "error", message: "Gagal menyimpan badge." };
  }
}
