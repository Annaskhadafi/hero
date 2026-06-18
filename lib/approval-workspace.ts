import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  approvalAttachments,
  approvalMatrices,
  approvalMatrixSteps,
  approvals,
  employees,
  formSubmissions,
  formTemplates,
  orgChartStructures,
  sites,
} from "@/db/schema/hero";
import type { ApprovalRouteResolution } from "@/lib/approval-engine";
import { parseApprovalNoteEntries } from "@/lib/approval-notes";
import { ensureHeroSeedData } from "@/lib/hero-admin";

type ApprovalRecordRow = {
  approvalId: number;
  activityId: number;
  submissionId: number | null;
  requestNumber: string | null;
  formName: string;
  approvalStepId: number | null;
  level: number;
  status: string;
  approverName: string;
  approverEmployeeId: number | null;
  submittedAt: Date;
  reviewedAt: Date | null;
  overtimeMinutes: number;
  resolutionSource: string;
  routeSnapshot: string;
  decisionNote: string;
  activityCode: string;
  activityType: string;
  activityTitle: string;
  unitNumber: string;
  activityStatus: string;
  priority: string;
  remarks: string;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
  requesterName: string;
  requesterEmail: string;
  requesterDepartment: string;
  requesterSection: string;
  requesterJobTitle: string;
  siteName: string;
};

type RawApprovalRecordRow = {
  approvalId: number;
  approvalActivityId: number | null;
  submissionId: number | null;
  approvalStepId: number | null;
  level: number;
  status: string;
  approverName: string;
  approverEmployeeId: number | null;
  submittedAt: Date;
  reviewedAt: Date | null;
  overtimeMinutes: number;
  resolutionSource: string;
  routeSnapshot: string;
  decisionNote: string;
  activityCode: string | null;
  activityType: string | null;
  activityTitle: string | null;
  unitNumber: string | null;
  activityStatus: string | null;
  priority: string | null;
  remarks: string | null;
  startTime: Date | null;
  endTime: Date | null;
  createdAt: Date | null;
  activityEmployeeId: number | null;
  activitySiteId: number | null;
  requesterEmployeeId: number | null;
  submissionSiteId: number | null;
  requestNumber: string | null;
  submissionStatus: string | null;
  payloadSnapshot: string | null;
  previewSnapshot: string | null;
  submissionCreatedAt: Date | null;
  submissionSubmittedAt: Date | null;
  templateName: string | null;
  templateKey: string | null;
};

type ApprovalQueueItem = ApprovalRecordRow & {
  dueAt: Date;
  dueState: "closed" | "overdue" | "due_soon" | "on_track";
  slaHours: number;
  route: ApprovalRouteResolution | null;
  currentStepLabel: string;
  commentsCount: number;
  isPending: boolean;
};

type ApprovalComment = {
  id: string;
  at: Date;
  actor: string;
  role: string;
  kind: string;
  message: string;
};

type ApprovalTimelineItem = {
  id: string;
  at: Date;
  label: string;
  detail: string;
  tone: string;
};

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

function minutesToHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)} jam`;
}

function getShiftLabel(startTime: Date) {
  const hour = startTime.getHours();

  if (hour >= 6 && hour < 15) {
    return "Shift Pagi";
  }

  if (hour >= 15 && hour < 23) {
    return "Shift Sore";
  }

  return "Shift Malam";
}

function getTodayWindow(reference = new Date()) {
  return {
    start: new Date(reference.getFullYear(), reference.getMonth(), reference.getDate()),
    end: new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + 1),
  };
}

function mapRequestStatus(activityStatus: string) {
  const normalized = activityStatus.trim().toLowerCase();

  if (normalized === "approved") {
    return "approved";
  }

  if (normalized === "rejected") {
    return "rejected";
  }

  if (normalized === "needs correction") {
    return "needs_revision";
  }

  if (normalized === "cancelled") {
    return "cancelled";
  }

  if (normalized.startsWith("pending")) {
    return "in_review";
  }

  return "submitted";
}

function parseJsonObject<T extends Record<string, unknown>>(
  value: string,
  fallback: T,
) {
  if (!value.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

async function normalizeApprovalRows(rawRows: RawApprovalRecordRow[]) {
  const requesterIds = Array.from(
    new Set(
      rawRows
        .map((row) => row.activityEmployeeId ?? row.requesterEmployeeId)
        .filter((value): value is number => value != null),
    ),
  );
  const siteIds = Array.from(
    new Set(
      rawRows
        .map((row) => row.activitySiteId ?? row.submissionSiteId)
        .filter((value): value is number => value != null),
    ),
  );

  const [requesters, siteRows] = await Promise.all([
    requesterIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: employees.id,
            name: employees.name,
            email: employees.email,
            department: employees.department,
            section: employees.section,
            jobTitle: employees.jobTitle,
          })
          .from(employees)
          .where(inArray(employees.id, requesterIds)),
    siteIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: sites.id,
            name: sites.name,
          })
          .from(sites)
          .where(inArray(sites.id, siteIds)),
  ]);

  const requesterMap = new Map(requesters.map((item) => [item.id, item]));
  const siteMap = new Map(siteRows.map((item) => [item.id, item]));

  return rawRows.map((row) => {
    const payload = parseJsonObject<Record<string, unknown>>(
      row.payloadSnapshot ?? "",
      {},
    );
    const preview = parseJsonObject<Record<string, unknown>>(
      row.previewSnapshot ?? "",
      {},
    );
    const requester =
      requesterMap.get(row.activityEmployeeId ?? row.requesterEmployeeId ?? -1) ??
      null;
    const site =
      siteMap.get(row.activitySiteId ?? row.submissionSiteId ?? -1) ?? null;
    const effectiveStartTime =
      row.startTime ?? row.submissionSubmittedAt ?? row.submissionCreatedAt ?? row.submittedAt;
    const effectiveEndTime =
      row.endTime ?? row.submissionSubmittedAt ?? row.submissionCreatedAt ?? row.submittedAt;
    const effectiveCreatedAt =
      row.createdAt ?? row.submissionCreatedAt ?? row.submissionSubmittedAt ?? row.submittedAt;
    const requestId = row.approvalActivityId ?? row.submissionId ?? row.approvalId;
    const titleFromSnapshot =
      typeof preview.title === "string"
        ? preview.title
        : typeof payload.title === "string"
          ? payload.title
          : null;
    const summaryFromSnapshot =
      typeof preview.summary === "string"
        ? preview.summary
        : typeof payload.reason === "string"
          ? payload.reason
          : null;
    const priorityFromSnapshot =
      typeof payload.priority === "string" ? payload.priority : null;
    const unitNumberFromSnapshot =
      typeof payload.unitNumber === "string" ? payload.unitNumber : null;
    const siteNameFromSnapshot =
      typeof preview.siteName === "string"
        ? preview.siteName
        : typeof payload.siteName === "string"
          ? payload.siteName
          : null;

    return {
      approvalId: row.approvalId,
      activityId: requestId,
      submissionId: row.submissionId,
      requestNumber: row.requestNumber,
      formName: row.templateName ?? (row.approvalActivityId ? "Daily Activity" : "Workflow Request"),
      approvalStepId: row.approvalStepId,
      level: row.level,
      status: row.status,
      approverName: row.approverName,
      approverEmployeeId: row.approverEmployeeId,
      submittedAt: row.submittedAt,
      reviewedAt: row.reviewedAt,
      overtimeMinutes: row.overtimeMinutes,
      resolutionSource: row.resolutionSource,
      routeSnapshot: row.routeSnapshot,
      decisionNote: row.decisionNote,
      activityCode:
        row.activityCode ??
        row.requestNumber ??
        `REQ-${String(requestId).padStart(5, "0")}`,
      activityType: row.activityType ?? row.templateKey ?? row.templateName ?? "request",
      activityTitle: row.activityTitle ?? titleFromSnapshot ?? row.templateName ?? "Untitled Request",
      unitNumber: row.unitNumber ?? unitNumberFromSnapshot ?? "-",
      activityStatus: row.activityStatus ?? row.submissionStatus ?? "submitted",
      priority: row.priority ?? priorityFromSnapshot ?? "Normal",
      remarks: row.remarks ?? summaryFromSnapshot ?? "",
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      createdAt: effectiveCreatedAt,
      requesterName: requester?.name ?? "Unknown Requester",
      requesterEmail: requester?.email ?? "",
      requesterDepartment: requester?.department ?? "",
      requesterSection: requester?.section ?? "",
      requesterJobTitle: requester?.jobTitle ?? "",
      siteName: site?.name ?? siteNameFromSnapshot ?? "-",
    } satisfies ApprovalRecordRow;
  });
}

function getSlaHours(row: ApprovalRecordRow, route: ApprovalRouteResolution | null) {
  const matchedStep =
    route?.steps.find(
      (step) =>
        step.stepOrder === row.level &&
        (row.approvalStepId == null || step.approvalMatrixStepId === row.approvalStepId),
    ) ?? null;

  return matchedStep?.slaHours ?? 24;
}

function getCurrentStepLabel(row: ApprovalRecordRow, route: ApprovalRouteResolution | null) {
  const matchedStep =
    route?.steps.find(
      (step) =>
        step.stepOrder === row.level &&
        (row.approvalStepId == null || step.approvalMatrixStepId === row.approvalStepId),
    ) ?? null;

  return matchedStep?.label ?? `Level ${row.level} Review`;
}

function enrichApprovalRow(row: ApprovalRecordRow, now: Date): ApprovalQueueItem {
  const route = parseApprovalRouteSnapshot(row.routeSnapshot);
  const slaHours = getSlaHours(row, route);
  const dueAt = new Date(row.submittedAt.getTime() + slaHours * 60 * 60 * 1000);
  const isPending = row.status === "pending";
  const timeLeft = dueAt.getTime() - now.getTime();

  let dueState: ApprovalQueueItem["dueState"] = "closed";
  if (isPending) {
    if (timeLeft < 0) {
      dueState = "overdue";
    } else if (timeLeft <= 6 * 60 * 60 * 1000) {
      dueState = "due_soon";
    } else {
      dueState = "on_track";
    }
  }

  return {
    ...row,
    dueAt,
    dueState,
    slaHours,
    route,
    currentStepLabel: getCurrentStepLabel(row, route),
    commentsCount: parseApprovalNoteEntries(row.decisionNote, row.approverName).length,
    isPending,
  };
}

function buildApprovalComments(rows: ApprovalQueueItem[]) {
  if (rows.length === 0) {
    return [] as ApprovalComment[];
  }

  const [seedRow] = rows;
  const comments: ApprovalComment[] = [];

  comments.push({
    id: `request-${seedRow.activityId}`,
    at: seedRow.createdAt,
    actor: seedRow.requesterName,
    role: seedRow.requesterJobTitle,
    kind: "submitted",
    message: seedRow.remarks || `${seedRow.activityType} diajukan untuk direview.`,
  });

  for (const row of rows) {
    const notes = parseApprovalNoteEntries(row.decisionNote, row.approverName);
    for (const [index, note] of notes.entries()) {
      comments.push({
        id: `approval-${row.approvalId}-${index}`,
        at: note.at ? new Date(note.at) : row.reviewedAt ?? row.submittedAt,
        actor: note.actor,
        role: `Step ${row.level} • ${row.currentStepLabel}`,
        kind: note.kind,
        message: note.message,
      });
    }
  }

  return comments.sort((left, right) => right.at.getTime() - left.at.getTime());
}

function buildApprovalTimeline(rows: ApprovalQueueItem[]) {
  if (rows.length === 0) {
    return [] as ApprovalTimelineItem[];
  }

  const [seedRow] = rows;
  const timeline: ApprovalTimelineItem[] = [
    {
      id: `activity-created-${seedRow.activityId}`,
      at: seedRow.createdAt,
      label: "Request dibuat",
      detail: `${seedRow.requesterName} mengirim ${seedRow.activityType} • ${seedRow.activityTitle}`,
      tone: "submitted",
    },
  ];

  for (const row of rows) {
    timeline.push({
      id: `approval-assigned-${row.approvalId}`,
      at: row.submittedAt,
      label: `Step ${row.level} masuk inbox`,
      detail: `${row.currentStepLabel} dialokasikan ke ${row.approverName}`,
      tone: row.dueState === "overdue" ? "overdue" : row.status,
    });

    const notes = parseApprovalNoteEntries(row.decisionNote, row.approverName);
    for (const [index, note] of notes.entries()) {
      timeline.push({
        id: `approval-note-${row.approvalId}-${index}`,
        at: note.at ? new Date(note.at) : row.reviewedAt ?? row.submittedAt,
        label: `${note.actor} • ${note.kind.replaceAll("_", " ")}`,
        detail: note.message,
        tone: note.kind,
      });
    }

    if (row.reviewedAt && notes.length === 0 && row.status !== "pending") {
      timeline.push({
        id: `approval-reviewed-${row.approvalId}`,
        at: row.reviewedAt,
        label: `Step ${row.level} ${row.status.replaceAll("_", " ")}`,
        detail: `${row.approverName} menyelesaikan ${row.currentStepLabel}`,
        tone: row.status,
      });
    }
  }

  return timeline.sort((left, right) => right.at.getTime() - left.at.getTime());
}

function buildWorkflowPreview(rows: ApprovalQueueItem[]) {
  if (rows.length === 0) {
    return {
      matrixName: null as string | null,
      structureName: null as string | null,
      warnings: [] as string[],
      steps: [] as Array<{
        stepOrder: number;
        label: string;
        approverName: string;
        resolutionSource: string;
        slaHours: number;
        fallbackLabel: string | null;
        escalationLabel: string | null;
        status: string;
      }>,
    };
  }

  const [seedRow] = rows;
  const route = seedRow.route;

  if (!route) {
    return {
      matrixName: null,
      structureName: null,
      warnings: ["Snapshot route tidak tersedia. Workflow ditampilkan dari approval item yang sudah tercatat."],
      steps: rows
        .slice()
        .sort((left, right) => left.level - right.level)
        .map((row) => ({
          stepOrder: row.level,
          label: row.currentStepLabel,
          approverName: row.approverName,
          resolutionSource: row.resolutionSource,
          slaHours: row.slaHours,
          fallbackLabel: null,
          escalationLabel: null,
          status: row.status,
        })),
    };
  }

  return {
    matrixName: route.matrixName,
    structureName: route.structureName,
    warnings: route.warnings,
    steps: route.steps.map((step) => {
      const matchedApproval =
        rows.find(
          (row) =>
            row.level === step.stepOrder &&
            (step.approvalMatrixStepId == null || row.approvalStepId === step.approvalMatrixStepId),
        ) ?? null;

      return {
        stepOrder: step.stepOrder,
        label: step.label,
        approverName: step.approverName,
        resolutionSource: step.resolutionSource,
        slaHours: step.slaHours,
        fallbackLabel: step.fallbackLabel,
        escalationLabel: step.escalationLabel,
        status: matchedApproval?.status ?? "waiting",
      };
    }),
  };
}

async function fetchApprovalRows() {
  const rawRows = await db
    .select({
      approvalId: approvals.id,
      approvalActivityId: approvals.activityId,
      submissionId: approvals.submissionId,
      approvalStepId: approvals.approvalStepId,
      level: approvals.level,
      status: approvals.status,
      approverName: approvals.approverName,
      approverEmployeeId: approvals.approverEmployeeId,
      submittedAt: approvals.submittedAt,
      reviewedAt: approvals.reviewedAt,
      overtimeMinutes: approvals.overtimeMinutes,
      resolutionSource: approvals.resolutionSource,
      routeSnapshot: approvals.routeSnapshot,
      decisionNote: approvals.decisionNote,
      activityCode: activities.activityCode,
      activityType: activities.activityType,
      activityTitle: activities.title,
      unitNumber: activities.unitNumber,
      activityStatus: activities.status,
      priority: activities.priority,
      remarks: activities.remarks,
      startTime: activities.startTime,
      endTime: activities.endTime,
      createdAt: activities.createdAt,
      activityEmployeeId: activities.employeeId,
      activitySiteId: activities.siteId,
      requesterEmployeeId: formSubmissions.requesterEmployeeId,
      submissionSiteId: formSubmissions.siteId,
      requestNumber: formSubmissions.requestNumber,
      submissionStatus: formSubmissions.requestStatus,
      payloadSnapshot: formSubmissions.payloadSnapshot,
      previewSnapshot: formSubmissions.previewSnapshot,
      submissionCreatedAt: formSubmissions.createdAt,
      submissionSubmittedAt: formSubmissions.submittedAt,
      templateName: formTemplates.name,
      templateKey: formTemplates.templateKey,
    })
    .from(approvals)
    .leftJoin(activities, eq(approvals.activityId, activities.id))
    .leftJoin(formSubmissions, eq(approvals.submissionId, formSubmissions.id))
    .leftJoin(formTemplates, eq(formSubmissions.templateId, formTemplates.id))
    .orderBy(desc(approvals.submittedAt), desc(approvals.id));

  return normalizeApprovalRows(rawRows);
}

async function fetchApprovalRowsForUser(
  email: string,
  currentEmployee: { id: number; name: string } | null,
) {
  const normalizedEmail = normalizeMatchValue(email);
  const normalizedEmployeeName = normalizeMatchValue(currentEmployee?.name);
  const rows = await fetchApprovalRows();

  return rows
    .filter((row) => {
      if (normalizeMatchValue(row.requesterEmail) === normalizedEmail) {
        return true;
      }

      if (currentEmployee?.id != null && row.approverEmployeeId === currentEmployee.id) {
        return true;
      }

      if (
        normalizedEmployeeName &&
        normalizeMatchValue(row.approverName) === normalizedEmployeeName
      ) {
        return true;
      }

      return false;
    })
    .slice(0, 240);
}

export async function getApprovalWorkbenchData() {
  await ensureHeroSeedData();

  const now = new Date();
  const { start: startOfToday, end: endOfToday } = getTodayWindow(now);
  const approvalRows = await fetchApprovalRows();
  const queue = approvalRows
    .map((row) => enrichApprovalRow(row, now))
    .sort((left, right) => {
      if (left.isPending !== right.isPending) {
        return left.isPending ? -1 : 1;
      }

      if (left.dueState !== right.dueState) {
        const rank: Record<ApprovalQueueItem["dueState"], number> = {
          overdue: 0,
          due_soon: 1,
          on_track: 2,
          closed: 3,
        };
        return rank[left.dueState] - rank[right.dueState];
      }

      return right.submittedAt.getTime() - left.submittedAt.getTime();
    });

  const distinctRequestStatuses = new Map<number, string>();
  for (const item of queue) {
    if (!distinctRequestStatuses.has(item.activityId)) {
      distinctRequestStatuses.set(item.activityId, mapRequestStatus(item.activityStatus));
    }
  }

  const focusItem = queue.find((item) => item.isPending) ?? queue[0] ?? null;
  const relatedApprovals = focusItem
    ? queue
        .filter((item) => item.activityId === focusItem.activityId)
        .sort((left, right) => left.level - right.level || left.approvalId - right.approvalId)
    : [];
  const [focusSubmission] =
    focusItem == null
      ? [null]
      : await db
          .select({
            id: formSubmissions.id,
            requestNumber: formSubmissions.requestNumber,
          })
          .from(formSubmissions)
          .where(
            focusItem.submissionId != null
              ? eq(formSubmissions.id, focusItem.submissionId)
              : eq(formSubmissions.legacyActivityId, focusItem.activityId),
          )
          .orderBy(desc(formSubmissions.updatedAt), desc(formSubmissions.id))
          .limit(1);
  const focusAttachments =
    focusSubmission == null
      ? []
      : await db
          .select({
            id: approvalAttachments.id,
            attachmentKind: approvalAttachments.attachmentKind,
            fileName: approvalAttachments.fileName,
            mimeType: approvalAttachments.mimeType,
            fileUrl: approvalAttachments.fileUrl,
            createdAt: approvalAttachments.createdAt,
          })
          .from(approvalAttachments)
          .where(eq(approvalAttachments.submissionId, focusSubmission.id))
          .orderBy(desc(approvalAttachments.createdAt), desc(approvalAttachments.id));

  return {
    metrics: {
      totalApprovals: queue.length,
      pendingApprovals: queue.filter((item) => item.isPending).length,
      dueSoon: queue.filter((item) => item.dueState === "due_soon").length,
      overdue: queue.filter((item) => item.dueState === "overdue").length,
      needsRevision: Array.from(distinctRequestStatuses.values()).filter(
        (status) => status === "needs_revision",
      ).length,
      approvedToday: queue.filter(
        (item) =>
          item.status === "approved" &&
          item.reviewedAt != null &&
          item.reviewedAt >= startOfToday &&
          item.reviewedAt < endOfToday,
      ).length,
    },
    queue,
    focus:
      focusItem == null
        ? null
        : {
            approvalId: focusItem.approvalId,
            activityId: focusItem.activityId,
            requestNumber: focusSubmission?.requestNumber ?? null,
            title: focusItem.activityTitle,
            formName: "Daily Activity",
            activityType: focusItem.activityType,
            requesterName: focusItem.requesterName,
            requesterJobTitle: focusItem.requesterJobTitle,
            requesterDepartment: focusItem.requesterDepartment,
            requesterSection: focusItem.requesterSection,
            siteName: focusItem.siteName,
            unitNumber: focusItem.unitNumber,
            priority: focusItem.priority,
            overtimeLabel: minutesToHours(focusItem.overtimeMinutes),
            shiftLabel: getShiftLabel(focusItem.startTime),
            startTime: focusItem.startTime,
            endTime: focusItem.endTime,
            currentStepLabel: focusItem.currentStepLabel,
            currentApprover: focusItem.approverName,
            dueAt: focusItem.dueAt,
            dueState: focusItem.dueState,
            activityStatus: focusItem.activityStatus,
            previewFields: [
              { label: "Tanggal kerja", value: focusItem.startTime.toLocaleDateString("id-ID") },
              { label: "Shift", value: getShiftLabel(focusItem.startTime) },
              { label: "Site", value: focusItem.siteName },
              { label: "Department", value: focusItem.requesterDepartment || "-" },
              { label: "Section", value: focusItem.requesterSection || "-" },
              { label: "Unit / Area", value: focusItem.unitNumber },
              { label: "Activity Type", value: focusItem.activityType },
              { label: "Deskripsi kerja", value: focusItem.activityTitle },
              { label: "Start", value: focusItem.startTime.toLocaleString("id-ID") },
              { label: "End", value: focusItem.endTime.toLocaleString("id-ID") },
              { label: "Overtime", value: minutesToHours(focusItem.overtimeMinutes) },
              { label: "Remark", value: focusItem.remarks || "-" },
            ],
            attachments: focusAttachments,
            comments: buildApprovalComments(relatedApprovals),
            timeline: buildApprovalTimeline(relatedApprovals),
            workflow: buildWorkflowPreview(relatedApprovals),
          },
  };
}

function normalizeMatchValue(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getDateKey(value: Date) {
  return `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, "0")}-${`${value.getDate()}`.padStart(2, "0")}`;
}

function formatDateLabel(value: Date) {
  return value.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTimeRange(startTime: Date, endTime: Date) {
  return `${startTime.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${endTime.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatLastDecision(notes: ApprovalComment[]) {
  const latestDecision =
    notes.find((note) =>
      ["approved", "rejected", "needs_correction"].includes(note.kind),
    ) ?? notes[0] ?? null;

  return latestDecision?.message ?? "Belum ada keputusan akhir.";
}

async function getEmployeeByEmail(email: string) {
  const [employee] = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      jobTitle: employees.jobTitle,
    })
    .from(employees)
    .where(sql`lower(${employees.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);

  return employee ?? null;
}

export async function getApprovalCenterData(email: string) {
  const now = new Date();
  const currentEmployee = await getEmployeeByEmail(email);
  const approvalRows = await fetchApprovalRowsForUser(email, currentEmployee);
  const queue = approvalRows
    .map((row) => enrichApprovalRow(row, now))
    .sort((left, right) => right.submittedAt.getTime() - left.submittedAt.getTime());

  const normalizedEmail = normalizeMatchValue(email);
  const normalizedEmployeeName = normalizeMatchValue(currentEmployee?.name);

  const inboxRows = queue.filter(
    (item) =>
      item.isPending &&
      ((currentEmployee?.id != null && item.approverEmployeeId === currentEmployee.id) ||
        (normalizedEmployeeName && normalizeMatchValue(item.approverName) === normalizedEmployeeName)),
  );

  const inboxGroupsMap = new Map<
    string,
    {
      id: string;
      requesterName: string;
      requesterJobTitle: string;
      requesterEmail: string;
      siteName: string;
      workDate: Date;
      workDateLabel: string;
      activityCount: number;
      dueSoonCount: number;
      overdueCount: number;
      totalOvertimeMinutes: number;
      items: Array<{
        approvalId: number;
        activityId: number;
        title: string;
        activityType: string;
        unitNumber: string;
        priority: string;
        currentStepLabel: string;
        remarks: string;
        submittedAt: Date;
        dueAt: Date;
        dueState: ApprovalQueueItem["dueState"];
        timeRange: string;
        shiftLabel: string;
        overtimeLabel: string;
        requesterName: string;
        requesterJobTitle: string;
        siteName: string;
        notes: ApprovalComment[];
        lastNote: ApprovalComment | null;
      }>;
    }
  >();

  for (const item of inboxRows) {
    const groupKey = `${normalizeMatchValue(item.requesterEmail)}:${getDateKey(item.startTime)}`;
    const notes = buildApprovalComments([item]);
    const group = inboxGroupsMap.get(groupKey) ?? {
      id: groupKey,
      requesterName: item.requesterName,
      requesterJobTitle: item.requesterJobTitle,
      requesterEmail: item.requesterEmail,
      siteName: item.siteName,
      workDate: item.startTime,
      workDateLabel: formatDateLabel(item.startTime),
      activityCount: 0,
      dueSoonCount: 0,
      overdueCount: 0,
      totalOvertimeMinutes: 0,
      items: [],
    };

    group.activityCount += 1;
    group.totalOvertimeMinutes += item.overtimeMinutes;
    if (item.dueState === "due_soon") {
      group.dueSoonCount += 1;
    }
    if (item.dueState === "overdue") {
      group.overdueCount += 1;
    }
    group.items.push({
      approvalId: item.approvalId,
      activityId: item.activityId,
      title: item.activityTitle,
      activityType: item.activityType,
      unitNumber: item.unitNumber,
      priority: item.priority,
      currentStepLabel: item.currentStepLabel,
      remarks: item.remarks,
      submittedAt: item.submittedAt,
      dueAt: item.dueAt,
      dueState: item.dueState,
      timeRange: formatTimeRange(item.startTime, item.endTime),
      shiftLabel: getShiftLabel(item.startTime),
      overtimeLabel: minutesToHours(item.overtimeMinutes),
      requesterName: item.requesterName,
      requesterJobTitle: item.requesterJobTitle,
      siteName: item.siteName,
      notes,
      lastNote: notes[0] ?? null,
    });
    inboxGroupsMap.set(groupKey, group);
  }

  const inboxGroups = Array.from(inboxGroupsMap.values())
    .map((group) => ({
      ...group,
      totalOvertimeLabel: minutesToHours(group.totalOvertimeMinutes),
      items: group.items.sort((left, right) => right.submittedAt.getTime() - left.submittedAt.getTime()),
    }))
    .sort((left, right) => right.workDate.getTime() - left.workDate.getTime());

  const requestActivityMap = new Map<number, ApprovalQueueItem[]>();
  for (const item of queue) {
    if (normalizeMatchValue(item.requesterEmail) !== normalizedEmail) {
      continue;
    }

    const current = requestActivityMap.get(item.activityId) ?? [];
    current.push(item);
    requestActivityMap.set(item.activityId, current);
  }

  const historyGroupsMap = new Map<
    string,
    {
      id: string;
      workDate: Date;
      workDateLabel: string;
      activityCount: number;
      approvedCount: number;
      rejectedCount: number;
      revisionCount: number;
      pendingCount: number;
      items: Array<{
        activityId: number;
        title: string;
        activityType: string;
        unitNumber: string;
        siteName: string;
        priority: string;
        status: string;
        statusLabel: string;
        submittedAt: Date;
        timeRange: string;
        shiftLabel: string;
        pendingWith: string;
        currentStepLabel: string;
        workflowLabel: string;
        lastDecision: string;
        notes: ApprovalComment[];
        steps: Array<{
          approvalId: number;
          approverName: string;
          level: number;
          label: string;
          status: string;
          reviewedAt: Date | null;
        }>;
      }>;
    }
  >();

  for (const relatedRows of requestActivityMap.values()) {
    const sortedRows = relatedRows
      .slice()
      .sort((left, right) => left.level - right.level || left.approvalId - right.approvalId);
    const seed = sortedRows[0];
    const currentPending = sortedRows.find((item) => item.status === "pending") ?? null;
    const latestApproval = sortedRows[sortedRows.length - 1] ?? null;
    const notes = buildApprovalComments(sortedRows);
    const status = mapRequestStatus(seed.activityStatus);
    const groupKey = getDateKey(seed.startTime);
    const group = historyGroupsMap.get(groupKey) ?? {
      id: groupKey,
      workDate: seed.startTime,
      workDateLabel: formatDateLabel(seed.startTime),
      activityCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      revisionCount: 0,
      pendingCount: 0,
      items: [],
    };

    group.activityCount += 1;
    if (status === "approved") {
      group.approvedCount += 1;
    } else if (status === "rejected") {
      group.rejectedCount += 1;
    } else if (status === "needs_revision") {
      group.revisionCount += 1;
    } else {
      group.pendingCount += 1;
    }

    group.items.push({
      activityId: seed.activityId,
      title: seed.activityTitle,
      activityType: seed.activityType,
      unitNumber: seed.unitNumber,
      siteName: seed.siteName,
      priority: seed.priority,
      status,
      statusLabel: seed.activityStatus,
      submittedAt: seed.createdAt,
      timeRange: formatTimeRange(seed.startTime, seed.endTime),
      shiftLabel: getShiftLabel(seed.startTime),
      pendingWith: currentPending?.approverName ?? latestApproval?.approverName ?? "-",
      currentStepLabel: currentPending?.currentStepLabel ?? latestApproval?.currentStepLabel ?? "-",
      workflowLabel: currentPending?.route?.matrixName ?? latestApproval?.route?.matrixName ?? "Workflow Activity",
      lastDecision: formatLastDecision(notes),
      notes,
      steps: sortedRows.map((row) => ({
        approvalId: row.approvalId,
        approverName: row.approverName,
        level: row.level,
        label: row.currentStepLabel,
        status: row.status,
        reviewedAt: row.reviewedAt,
      })),
    });

    historyGroupsMap.set(groupKey, group);
  }

  const historyGroups = Array.from(historyGroupsMap.values())
    .map((group) => ({
      ...group,
      items: group.items.sort((left, right) => right.submittedAt.getTime() - left.submittedAt.getTime()),
    }))
    .sort((left, right) => right.workDate.getTime() - left.workDate.getTime());

  const historyItems = historyGroups.flatMap((group) => group.items);

  return {
    currentUserName: currentEmployee?.name ?? email,
    inboxMetrics: {
      pendingGroups: inboxGroups.length,
      pendingActivities: inboxRows.length,
      dueSoon: inboxRows.filter((item) => item.dueState === "due_soon").length,
      overdue: inboxRows.filter((item) => item.dueState === "overdue").length,
    },
    historyMetrics: {
      total: historyItems.length,
      approved: historyItems.filter((item) => item.status === "approved").length,
      rejected: historyItems.filter((item) => item.status === "rejected").length,
      needsRevision: historyItems.filter((item) => item.status === "needs_revision").length,
      inReview: historyItems.filter((item) => item.status === "in_review" || item.status === "submitted").length,
    },
    inboxGroups,
    historyGroups,
  };
}

export async function getRequestCenterData(email?: string) {
  await ensureHeroSeedData();

  const activitiesRows = await db
    .select({
      id: activities.id,
      activityCode: activities.activityCode,
      activityType: activities.activityType,
      title: activities.title,
      unitNumber: activities.unitNumber,
      status: activities.status,
      priority: activities.priority,
      startTime: activities.startTime,
      endTime: activities.endTime,
      remarks: activities.remarks,
      createdAt: activities.createdAt,
      requesterId: employees.id,
      requesterName: employees.name,
      requesterEmail: employees.email,
      requesterJobTitle: employees.jobTitle,
      siteName: sites.name,
    })
    .from(activities)
    .innerJoin(employees, eq(activities.employeeId, employees.id))
    .innerJoin(sites, eq(activities.siteId, sites.id))
    .orderBy(desc(activities.createdAt), desc(activities.id));

  const approvalRows = (await fetchApprovalRows()).map((row) => enrichApprovalRow(row, new Date()));
  const filteredActivities = email
    ? activitiesRows.filter((row) => row.requesterEmail.toLowerCase() === email.trim().toLowerCase())
    : activitiesRows;

  const activityRequests = filteredActivities.map((activity) => {
    const relatedApprovals = approvalRows
      .filter((approval) => approval.activityId === activity.id)
      .sort((left, right) => left.level - right.level || left.approvalId - right.approvalId);
    const currentPending = relatedApprovals.find((approval) => approval.status === "pending") ?? null;
    const latestApproval = relatedApprovals[relatedApprovals.length - 1] ?? null;
    const route = currentPending?.route ?? latestApproval?.route ?? null;

    return {
      activityId: activity.id,
      requestNumber: null as string | null,
      formName: "Daily Activity",
      activityCode: activity.activityCode,
      title: activity.title,
      activityType: activity.activityType,
      unitNumber: activity.unitNumber,
      requesterName: activity.requesterName,
      requesterJobTitle: activity.requesterJobTitle,
      siteName: activity.siteName,
      priority: activity.priority,
      status: mapRequestStatus(activity.status),
      activityStatus: activity.status,
      submissionId: null as number | null,
      submittedAt: activity.createdAt,
      lastUpdatedAt:
        currentPending?.submittedAt ??
        latestApproval?.reviewedAt ??
        latestApproval?.submittedAt ??
        activity.createdAt,
      pendingWith: currentPending?.approverName ?? "-",
      currentStepLabel: currentPending?.currentStepLabel ?? latestApproval?.currentStepLabel ?? "-",
      progressLabel: route ? `${relatedApprovals.filter((item) => item.status === "approved").length}/${route.steps.length} step` : `${relatedApprovals.filter((item) => item.status === "approved").length} step`,
      workflowLabel: route?.matrixName ?? "Legacy fallback",
      canCancel: false,
    };
  });

  const draftRows = await db
    .select({
      submissionId: formSubmissions.id,
      activityId: formSubmissions.legacyActivityId,
      requestStatus: formSubmissions.requestStatus,
      requestNumber: formSubmissions.requestNumber,
      submittedAt: formSubmissions.submittedAt,
      cancelledAt: formSubmissions.cancelledAt,
      createdAt: formSubmissions.createdAt,
      updatedAt: formSubmissions.updatedAt,
      requesterName: employees.name,
      requesterEmail: employees.email,
      requesterJobTitle: employees.jobTitle,
      siteName: sites.name,
      formName: formTemplates.name,
      payloadSnapshot: formSubmissions.payloadSnapshot,
    })
    .from(formSubmissions)
    .innerJoin(formTemplates, eq(formSubmissions.templateId, formTemplates.id))
    .innerJoin(employees, eq(formSubmissions.requesterEmployeeId, employees.id))
    .leftJoin(sites, eq(formSubmissions.siteId, sites.id))
    .where(
      isNull(formSubmissions.legacyActivityId),
    )
    .orderBy(desc(formSubmissions.updatedAt), desc(formSubmissions.id));

  const filteredDraftRows = email
    ? draftRows.filter((row) => row.requesterEmail.toLowerCase() === email.trim().toLowerCase())
    : draftRows;

  const draftRequests = filteredDraftRows.map((row) => {
    const payload = JSON.parse(row.payloadSnapshot || "{}") as Record<string, string>;
    const requestStatus = row.requestStatus;
    const pendingWithLabel =
      requestStatus === "draft"
        ? "Requester workspace"
        : requestStatus === "in_review"
          ? "Approval Inbox"
          : requestStatus === "needs_revision"
            ? "Requester revision"
            : "-";
    const stepLabel =
      requestStatus === "draft"
        ? "Draft belum disubmit"
        : requestStatus === "cancelled"
          ? "Request dibatalkan"
          : requestStatus === "approved"
            ? "Approval selesai"
            : requestStatus === "rejected"
              ? "Request ditolak"
              : requestStatus === "needs_revision"
                ? "Perlu revisi"
                : "Sedang direview";

    return {
      activityId: row.activityId ?? row.submissionId,
      requestNumber: row.requestNumber || null,
      formName: row.formName,
      activityCode: payload.activityCode ?? "-",
      title: payload.title ?? "Untitled Draft",
      activityType: payload.activityType ?? "-",
      unitNumber: payload.unitNumber ?? "-",
      requesterName: row.requesterName,
      requesterJobTitle: row.requesterJobTitle,
      siteName: row.siteName ?? "-",
      priority: payload.priority ?? "Normal",
      status: requestStatus,
      activityStatus: requestStatus,
      submissionId: row.submissionId,
      submittedAt: row.submittedAt ?? row.createdAt,
      lastUpdatedAt: row.cancelledAt ?? row.updatedAt ?? row.createdAt,
      pendingWith: pendingWithLabel,
      currentStepLabel: stepLabel,
      progressLabel:
        requestStatus === "draft"
          ? "0 step"
          : requestStatus === "approved"
            ? "Completed"
            : requestStatus === "cancelled"
              ? "Cancelled"
              : "In workflow",
      workflowLabel: row.formName,
      canCancel: requestStatus === "draft" || requestStatus === "in_review",
    };
  });

  const requests = [...draftRequests, ...activityRequests].sort(
    (left, right) => right.lastUpdatedAt.getTime() - left.lastUpdatedAt.getTime(),
  );

  return {
    scopeLabel: email ? "My Request Center" : "Request Center",
    metrics: {
      draft: requests.filter((request) => request.status === "draft").length,
      submitted: requests.filter((request) => request.status === "submitted").length,
      inReview: requests.filter((request) => request.status === "in_review").length,
      needsRevision: requests.filter((request) => request.status === "needs_revision").length,
      approved: requests.filter((request) => request.status === "approved").length,
      rejected: requests.filter((request) => request.status === "rejected").length,
      cancelled: requests.filter((request) => request.status === "cancelled").length,
    },
    requests,
  };
}

export async function getFormStudioOverviewData() {
  await ensureHeroSeedData();

  const [structures, matrices, steps] = await Promise.all([
    db.select().from(orgChartStructures),
    db.select().from(approvalMatrices),
    db.select().from(approvalMatrixSteps),
  ]);

  return {
    metrics: {
      activeStructures: structures.filter((item) => item.isActive).length,
      activeMatrices: matrices.filter((item) => item.isActive).length,
      workflowSteps: steps.length,
      liveTemplates: 1,
    },
    templates: [
      {
        name: "Daily Activity",
        category: "Operations",
        status: "live",
        version: "v1 route-enabled",
        workflowMode: "Org Template",
        fields: "12 field inti",
        remark: "Submit activity sudah memakai route engine, snapshot workflow, dan review approve/reject/revisi.",
      },
      {
        name: "Overtime Request",
        category: "Operations",
        status: "partial",
        version: "v0.2 blueprint",
        workflowMode: "Org Template",
        fields: "siap dipisah dari activity",
        remark: "Perhitungan overtime sudah hidup di approval outcome, tapi form template dedicated belum dipisah.",
      },
      {
        name: "Daily Report",
        category: "Reporting",
        status: "partial",
        version: "v0.1 mapped",
        workflowMode: "Manual / Org Hybrid",
        fields: "header + section summary",
        remark: "Data report sudah ada, namun belum masuk builder template versioned.",
      },
      {
        name: "HSE Observation",
        category: "HSE",
        status: "backlog",
        version: "v0.0",
        workflowMode: "Org Template",
        fields: "backlog",
        remark: "Masih menunggu persistence layer template, validation rule, dan attachment rule.",
      },
      {
        name: "Procurement Request",
        category: "Finance / SCM",
        status: "backlog",
        version: "v0.0",
        workflowMode: "Manual Workflow",
        fields: "backlog",
        remark: "Disiapkan untuk workflow lintas fungsi dengan approver manual dan condition logic nominal.",
      },
    ],
    capabilities: [
      {
        capability: "Template catalog",
        status: "live",
        detail: "Catalog form approval sudah disiapkan sebagai surface terpisah di dashboard.",
      },
      {
        capability: "Versioning & publish flow",
        status: "partial",
        detail: "Blueprint dan surface sudah siap, persistence `formTemplateVersions` belum diaktifkan ke DB runtime.",
      },
      {
        capability: "Field / section builder",
        status: "backlog",
        detail: "Masih menunggu layer entity form template agar builder tidak hardcode.",
      },
      {
        capability: "Preview mode",
        status: "live",
        detail: "Preview request sudah tampil di Approval Inbox untuk Daily Activity.",
      },
      {
        capability: "Clone template",
        status: "backlog",
        detail: "Belum dipasang karena template version store belum active.",
      },
    ],
  };
}

export async function getWorkflowStudioOverviewData() {
  await ensureHeroSeedData();

  const [structures, matrices, steps] = await Promise.all([
    db.select().from(orgChartStructures),
    db.select().from(approvalMatrices),
    db.select().from(approvalMatrixSteps),
  ]);

  return {
    metrics: {
      orgStructures: structures.length,
      approvalMatrices: matrices.length,
      routedSteps: steps.length,
      supportedConditions: 7,
    },
    workflowModes: [
      {
        title: "Org Template Mode",
        status: "live",
        summary: "Resolver approval sudah memilih approver dari struktur organisasi + matrix + snapshot route.",
      },
      {
        title: "Manual Workflow Mode",
        status: "partial",
        summary: "Approval Matrix editor sudah memungkinkan susun step, fallback, escalation, dan SLA secara manual.",
      },
      {
        title: "Notification & Reminder",
        status: "partial",
        summary: "Email log dan due-state inbox sudah ada, namun reminder scheduler & in-app notification belum penuh.",
      },
      {
        title: "Parallel / Multi Approval",
        status: "backlog",
        summary: "Schema step mode sudah ada, tetapi runtime saat ini masih sequential-first.",
      },
    ],
    conditions: [
      { field: "Site", status: "live", detail: "Tersedia di approval matrix scope." },
      { field: "Department", status: "live", detail: "Tersedia di approval matrix scope." },
      { field: "Section", status: "live", detail: "Tersedia di approval matrix scope." },
      { field: "Requester Position", status: "live", detail: "Tersedia di approval matrix scope." },
      { field: "Activity Type", status: "live", detail: "Tersedia di approval matrix scope." },
      { field: "Priority", status: "live", detail: "Sudah dipakai resolver route." },
      { field: "Overtime Threshold", status: "live", detail: "Min/max overtime sudah dipakai resolver route." },
      { field: "Grouped AND / OR Builder", status: "backlog", detail: "Belum ada visual rule builder." },
    ],
  };
}
