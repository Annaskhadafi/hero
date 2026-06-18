import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  approvalRequestActors,
  approvals,
  formSubmissions,
  formTemplateVersions,
  formTemplates,
  inboxItems,
  notificationDeliveries,
  notificationEvents,
  reminderJobs,
  requestStatusHistories,
  employees,
} from "@/db/schema/hero";
import {
  ensureApprovalBlueprintSeedData,
} from "@/lib/approval-blueprint";
import {
  getAppUrl,
  buildWorkflowEmailContent,
  sendWorkflowEmail,
} from "@/lib/workflow-email";
import {
  sendPushNotification,
  getEmployeeTargetByEmail,
} from "@/lib/push-notifications";
import type {
  ApprovalRouteResolution,
  ResolvedApprovalStep,
} from "@/lib/approval-engine";
import { resolveApprovalRouteForActivity } from "@/lib/approval-engine";

type LegacyApprovalTemplateKey =
  | "attendance-permission"
  | "leave-permission"
  | "offboarding-request";

type LegacyApprovalTemplateConfig = {
  templateKey: LegacyApprovalTemplateKey;
  name: string;
  category: string;
  description: string;
  workflowMode: "manual_workflow" | "org_template";
  requestPrefix: string;
};

const LEGACY_APPROVAL_TEMPLATE_CONFIGS: Record<
  LegacyApprovalTemplateKey,
  LegacyApprovalTemplateConfig
> = {
  "attendance-permission": {
    templateKey: "attendance-permission",
    name: "Attendance Permission",
    category: "HC",
    description:
      "Pengajuan izin attendance legacy yang kini masuk Approval Engine terpusat.",
    workflowMode: "manual_workflow",
    requestPrefix: "ATT",
  },
  "leave-permission": {
    templateKey: "leave-permission",
    name: "Leave / Permission",
    category: "HC",
    description: "Permohonan cuti, izin, dan approval lintas atasan/HC.",
    workflowMode: "manual_workflow",
    requestPrefix: "LEV",
  },
  "offboarding-request": {
    templateKey: "offboarding-request",
    name: "Offboarding Request",
    category: "HC",
    description:
      "Permintaan offboarding legacy yang kini memakai Approval Engine terpusat.",
    workflowMode: "manual_workflow",
    requestPrefix: "OFF",
  },
};

type CreateLegacyApprovalRequestInput = {
  templateKey: LegacyApprovalTemplateKey;
  requesterEmployeeId: number;
  siteId?: number | null;
  activityType: string;
  transactionType?: string | null;
  priority?: string | null;
  referenceId: number;
  payloadSnapshot: Record<string, unknown>;
  previewSnapshot: Record<string, unknown>;
  submittedAt?: Date;
};

function getRouteStepGroup(steps: ResolvedApprovalStep[], stepOrder: number) {
  return steps.filter((step) => step.stepOrder === stepOrder);
}

function getNextRouteStepGroup(
  steps: ResolvedApprovalStep[],
  currentStepOrder: number,
) {
  const nextStepOrder =
    steps
      .map((step) => step.stepOrder)
      .filter((stepOrder) => stepOrder > currentStepOrder)
      .sort((left, right) => left - right)[0] ?? null;

  return nextStepOrder == null ? [] : getRouteStepGroup(steps, nextStepOrder);
}

function serializeApprovalRoute(route: ApprovalRouteResolution) {
  return JSON.stringify({
    matrixId: route.matrixId,
    matrixName: route.matrixName,
    structureId: route.structureId,
    structureName: route.structureName,
    transactionType: route.transactionType,
    warnings: route.warnings,
    steps: route.steps.map((step) => ({
      stepOrder: step.stepOrder,
      label: step.label,
      approvalMode: step.approvalMode,
      approverName: step.approverName,
      approverEmployeeId: step.approverEmployeeId,
      approverNodeId: step.approverNodeId,
      approvalMatrixStepId: step.approvalMatrixStepId,
      resolutionSource: step.resolutionSource,
      canDelegate: step.canDelegate,
      slaHours: step.slaHours,
      nodeLabel: step.nodeLabel,
      fallbackLabel: step.fallbackLabel,
      escalationLabel: step.escalationLabel,
    })),
  });
}

function buildRequestNumber(prefix: string, referenceId: number, date: Date) {
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}${String(date.getDate()).padStart(2, "0")}`;
  return `${prefix}-${datePart}-${String(referenceId).padStart(5, "0")}`;
}

async function ensureLegacyTemplateVersion(
  templateKey: LegacyApprovalTemplateKey,
) {
  const config = LEGACY_APPROVAL_TEMPLATE_CONFIGS[templateKey];

  let [template] = await db
    .select()
    .from(formTemplates)
    .where(eq(formTemplates.templateKey, templateKey))
    .limit(1);

  if (!template) {
    [template] = await db
      .insert(formTemplates)
      .values({
        templateKey: config.templateKey,
        category: config.category,
        name: config.name,
        workflowMode: config.workflowMode,
        description: config.description,
        isActive: true,
      })
      .returning();
  }

  let [version] = await db
    .select()
    .from(formTemplateVersions)
    .where(eq(formTemplateVersions.templateId, template.id))
    .orderBy(desc(formTemplateVersions.versionNumber))
    .limit(1);

  if (!version) {
    [version] = await db
      .insert(formTemplateVersions)
      .values({
        templateId: template.id,
        versionNumber: 1,
        schemaSnapshot: JSON.stringify({
          templateKey: config.templateKey,
          fields: [],
        }),
        workflowSnapshot: JSON.stringify({
          type: "approval_engine",
          templateKey: config.templateKey,
        }),
        publishStatus: "published",
      })
      .returning();
  }

  return { template, version, config };
}

async function getSubmissionRequesterContext(requesterEmployeeId: number) {
  const [employee] = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
    })
    .from(employees)
    .where(eq(employees.id, requesterEmployeeId))
    .limit(1);

  if (!employee) {
    throw new Error("Requester employee for approval submission not found.");
  }

  return employee;
}

async function createPendingArtifactsForSubmission(params: {
  submissionId: number;
  route: ApprovalRouteResolution;
  stepGroup: ResolvedApprovalStep[];
  submittedAt: Date;
  requestTitle: string;
  requestPath: string;
  requesterName: string;
}) {
  if (params.stepGroup.length === 0) {
    return;
  }

  const notificationsToSend: Array<{
    approvalId: number;
    approverEmail: string;
    approverName: string;
    approverEmployeeId: number | null;
    dueAt: Date;
    currentStepLabel: string;
    inboxItemId: number;
  }> = [];

  await db.transaction(async (tx) => {
    for (const step of params.stepGroup) {
      const dueAt = new Date(
        params.submittedAt.getTime() + step.slaHours * 60 * 60 * 1000,
      );
      const currentStepLabel =
        step.stepOrder > 0
          ? `Step ${step.stepOrder}: ${step.approverName || "Pending Approval"}`
          : "Pending Approval";

      const [approval] = await tx
        .insert(approvals)
        .values({
          activityId: null,
          submissionId: params.submissionId,
          level: step.stepOrder,
          approverName: step.approverName,
          approverEmployeeId: step.approverEmployeeId ?? null,
          approverNodeId: step.approverNodeId ?? null,
          approvalStepId: step.approvalMatrixStepId ?? null,
          status: "pending",
          submittedAt: params.submittedAt,
          overtimeMinutes: 0,
          resolutionSource: step.resolutionSource,
          routeSnapshot: serializeApprovalRoute(params.route),
          createdAt: params.submittedAt,
        })
        .returning({ id: approvals.id });

      await tx.insert(approvalRequestActors).values({
        submissionId: params.submissionId,
        approvalId: approval.id,
        actorEmployeeId: step.approverEmployeeId ?? null,
        actorRole: "approver",
        assignmentType: step.approvalMode === "parallel" ? "parallel" : "primary",
        status: "pending",
        dueAt,
      });

      const [inboxItem] = await tx
        .insert(inboxItems)
        .values({
          submissionId: params.submissionId,
          approvalId: approval.id,
          assigneeEmployeeId: step.approverEmployeeId ?? null,
          inboxType: "approval",
          status: "pending",
          dueAt,
        })
        .returning({ id: inboxItems.id });

      const [emailEvent] = await tx
        .insert(notificationEvents)
        .values({
          submissionId: params.submissionId,
          inboxItemId: inboxItem.id,
          approvalId: approval.id,
          channel: "email",
          eventType: "approval_assignment",
          recipient: step.approverName,
          payloadSnapshot: JSON.stringify({
            requestTitle: params.requestTitle,
            currentStepLabel,
          }),
          deliveryStatus: "queued",
        })
        .returning({ id: notificationEvents.id });

      await tx.insert(notificationDeliveries).values({
        notificationEventId: emailEvent.id,
        deliveryChannel: "email",
        recipient: step.approverName,
        status: "queued",
      });

      const [inAppEvent] = await tx
        .insert(notificationEvents)
        .values({
          submissionId: params.submissionId,
          inboxItemId: inboxItem.id,
          approvalId: approval.id,
          channel: "in_app",
          eventType: "approval_assignment",
          recipient: step.approverName,
          payloadSnapshot: JSON.stringify({
            requestTitle: params.requestTitle,
            currentStepLabel,
          }),
          deliveryStatus: "queued",
        })
        .returning({ id: notificationEvents.id });

      await tx.insert(notificationDeliveries).values({
        notificationEventId: inAppEvent.id,
        deliveryChannel: "in_app",
        recipient: step.approverName,
        status: "queued",
      });

      const beforeDueReminderAt = new Date(dueAt.getTime() - 4 * 60 * 60 * 1000);
      if (beforeDueReminderAt > params.submittedAt) {
        await tx.insert(reminderJobs).values({
          inboxItemId: inboxItem.id,
          reminderType: "before_due",
          reminderAt: beforeDueReminderAt,
          status: "scheduled",
        });
      }

      await tx.insert(reminderJobs).values({
        inboxItemId: inboxItem.id,
        reminderType: "overdue",
        reminderAt: dueAt,
        status: "scheduled",
      });

      notificationsToSend.push({
        approvalId: approval.id,
        approverEmail: "",
        approverName: step.approverName || "Approver",
        approverEmployeeId: step.approverEmployeeId ?? null,
        dueAt,
        currentStepLabel,
        inboxItemId: inboxItem.id,
      });
    }
  });

  for (const target of notificationsToSend) {
    if (!target.approverEmail && target.approverEmployeeId) {
      const [approver] = await db
        .select({ email: employees.email })
        .from(employees)
        .where(eq(employees.id, target.approverEmployeeId))
        .limit(1)
      target.approverEmail = approver?.email ?? ""
    }

    if (target.approverEmail) {
      try {
        const emailContent = buildWorkflowEmailContent({
          title: `${params.requestTitle} menunggu approval`,
          greeting: `Halo ${target.approverName},`,
          intro: `${params.requesterName} mengirim ${params.requestTitle.toLowerCase()} dan membutuhkan review Anda.`,
          details: [
            `Step: ${target.currentStepLabel}`,
            `Due date: ${target.dueAt.toLocaleString("id-ID")}`,
          ],
          ctaLabel: "Buka Approval Inbox",
          ctaUrl: getAppUrl(params.requestPath),
        });

        await sendWorkflowEmail({
          to: target.approverEmail,
          templateCode: "approval_assignment",
          templateName: "Approval Assignment",
          variables: {
            requestTitle: params.requestTitle,
            approverName: target.approverName,
            requesterName: params.requesterName,
            dueDateTime: target.dueAt.toLocaleString("id-ID"),
            approvalUrl: getAppUrl(params.requestPath),
          },
          fallbackSubject: `${params.requestTitle} menunggu approval`,
          fallbackHtml: emailContent.html,
          fallbackText: emailContent.text,
        });
      } catch (error) {
        console.error("Failed to send legacy approval assignment email", error);
      }
    }

    if (target.approverEmployeeId) {
      try {
        await sendPushNotification({
          employeeId: target.approverEmployeeId,
          category: "approval_requests",
          title: `${params.requestTitle} menunggu approval`,
          body: `${params.requesterName} membutuhkan review Anda.`,
          url: params.requestPath,
          tag: `legacy-approval-${target.approvalId}`,
          metadata: {
            inboxItemId: target.inboxItemId,
            requestTitle: params.requestTitle,
          },
        });
      } catch (error) {
        console.error("Failed to send legacy approval push notification", error);
      }
    } else if (target.approverEmail) {
      const pushTarget = await getEmployeeTargetByEmail(target.approverEmail);
      if (pushTarget) {
        try {
          await sendPushNotification({
            employeeId: pushTarget.id,
            category: "approval_requests",
            title: `${params.requestTitle} menunggu approval`,
            body: `${params.requesterName} membutuhkan review Anda.`,
            url: params.requestPath,
            tag: `legacy-approval-${target.approvalId}`,
            metadata: {
              inboxItemId: target.inboxItemId,
              requestTitle: params.requestTitle,
            },
          });
        } catch (error) {
          console.error("Failed to send fallback legacy approval push notification", error);
        }
      }
    }
  }
}

export async function createLegacyApprovalRequest(
  input: CreateLegacyApprovalRequestInput,
) {
  await ensureApprovalBlueprintSeedData();

  const { template, version, config } = await ensureLegacyTemplateVersion(
    input.templateKey,
  );
  const requester = await getSubmissionRequesterContext(input.requesterEmployeeId);
  const submittedAt = input.submittedAt ?? new Date();

  const route = await resolveApprovalRouteForActivity({
    employeeId: input.requesterEmployeeId,
    activityType: input.activityType,
    priority: input.priority ?? "normal",
    transactionType: input.transactionType ?? undefined,
    overtimeMinutes: 0,
  });

  const requestNumber = buildRequestNumber(
    config.requestPrefix,
    input.referenceId,
    submittedAt,
  );

  const [submission] = await db
    .insert(formSubmissions)
    .values({
      templateId: template.id,
      templateVersionId: version.id,
      requesterEmployeeId: input.requesterEmployeeId,
      siteId: input.siteId ?? null,
      legacyActivityId: null,
      requestNumber,
      requestStatus: "in_review",
      payloadSnapshot: JSON.stringify(input.payloadSnapshot),
      previewSnapshot: JSON.stringify(input.previewSnapshot),
      workflowSnapshot: serializeApprovalRoute(route),
      submittedAt,
      createdAt: submittedAt,
      updatedAt: submittedAt,
    })
    .returning();

  await db.insert(requestStatusHistories).values({
    submissionId: submission.id,
    approvalId: null,
    actorEmployeeId: input.requesterEmployeeId,
    fromStatus: "draft",
    toStatus: "in_review",
    note: "Legacy workflow submitted to centralized Approval Engine.",
    createdAt: submittedAt,
  });

  const firstStep = route.steps[0];
  const firstStepGroup = firstStep
    ? getRouteStepGroup(route.steps, firstStep.stepOrder)
    : [];

  await createPendingArtifactsForSubmission({
    submissionId: submission.id,
    route,
    stepGroup: firstStepGroup,
    submittedAt,
    requestTitle: template.name,
    requestPath: "/dashboard/approval",
    requesterName: requester.name,
  });

  return { submission, route };
}

export async function cancelLegacyApprovalSubmission(
  submissionId: number | null | undefined,
  note = "Superseded by a newer submission.",
) {
  if (!submissionId) {
    return;
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    const [submission] = await tx
      .select({
        id: formSubmissions.id,
        requesterEmployeeId: formSubmissions.requesterEmployeeId,
        requestStatus: formSubmissions.requestStatus,
      })
      .from(formSubmissions)
      .where(eq(formSubmissions.id, submissionId))
      .limit(1);

    if (!submission) {
      return;
    }

    await tx
      .update(formSubmissions)
      .set({
        requestStatus: "cancelled",
        cancelledAt: now,
        updatedAt: now,
      })
      .where(eq(formSubmissions.id, submissionId));

    const pendingApprovals = await tx
      .select({ id: approvals.id })
      .from(approvals)
      .where(
        and(eq(approvals.submissionId, submissionId), eq(approvals.status, "pending")),
      );

    const pendingApprovalIds = pendingApprovals.map((item) => item.id);

    if (pendingApprovalIds.length > 0) {
      await tx
        .update(approvals)
        .set({ status: "cancelled" })
        .where(inArray(approvals.id, pendingApprovalIds));

      const activeInboxItems = await tx
        .select({ id: inboxItems.id })
        .from(inboxItems)
        .where(
          and(
            eq(inboxItems.submissionId, submissionId),
            eq(inboxItems.status, "pending"),
          ),
        );

      const inboxIds = activeInboxItems.map((item) => item.id);
      if (inboxIds.length > 0) {
        await tx
          .update(inboxItems)
          .set({ status: "cancelled", updatedAt: now })
          .where(inArray(inboxItems.id, inboxIds));

        await tx
          .update(reminderJobs)
          .set({
            status: "cancelled",
            executionLog: note,
            updatedAt: now,
          })
          .where(inArray(reminderJobs.inboxItemId, inboxIds));
      }
    }

    await tx.insert(requestStatusHistories).values({
      submissionId,
      approvalId: null,
      actorEmployeeId: submission.requesterEmployeeId,
      fromStatus: submission.requestStatus,
      toStatus: "cancelled",
      note,
      createdAt: now,
    });
  });
}

export async function createNextLegacyApprovalStep(params: {
  submissionId: number;
  route: ApprovalRouteResolution;
  currentStepOrder: number;
  submittedAt: Date;
  requestTitle: string;
  requesterName: string;
}) {
  const nextGroup = getNextRouteStepGroup(params.route.steps, params.currentStepOrder);
  if (nextGroup.length === 0) {
    return;
  }

  await createPendingArtifactsForSubmission({
    submissionId: params.submissionId,
    route: params.route,
    stepGroup: nextGroup,
    submittedAt: params.submittedAt,
    requestTitle: params.requestTitle,
    requestPath: "/dashboard/approval",
    requesterName: params.requesterName,
  });
}
