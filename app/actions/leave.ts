"use server";

import { db } from "@/db";
import {
  hcLeaveTypes,
  hcLeaveBalances,
  hcLeaveRequests,
  hrEmployees,
  hrDepartments,
  hrSections,
} from "@/db/schema/hero";
import { eq, desc, and, sql, count, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  buildWorkflowEmailContent,
  getAppUrl,
  getHrEmployeeContactById,
  getHumanCapitalRecipientEmails,
  sendWorkflowEmail,
  sendWorkflowEmailToMany,
} from "@/lib/workflow-email";
import { notifyWorkflowBellRecipients } from "@/lib/workflow-notification-center";
import { getEmployeeTargetByEmail } from "@/lib/push-notifications";
import { createLegacyApprovalRequest } from "@/lib/legacy-approval-engine";

// ─── Leave Types ────────────────────────────────────────────────────────

export async function getLeaveTypes() {
  return await db
    .select({
      id: hcLeaveTypes.id,
      code: hcLeaveTypes.code,
      name: hcLeaveTypes.name,
      defaultDaysPerYear: hcLeaveTypes.defaultDaysPerYear,
      isPaid: hcLeaveTypes.isPaid,
      requiresApproval: hcLeaveTypes.requiresApproval,
      isActive: hcLeaveTypes.isActive,
    })
    .from(hcLeaveTypes)
    .where(eq(hcLeaveTypes.isActive, true))
    .orderBy(hcLeaveTypes.name);
}

// ─── Leave Requests ─────────────────────────────────────────────────────

export async function getLeaveRequests(filters?: {
  status?: string;
  departmentId?: number;
}) {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(hcLeaveRequests.status, filters.status));
  }
  if (filters?.departmentId) {
    conditions.push(eq(hrEmployees.departmentId, filters.departmentId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return await db
    .select({
      id: hcLeaveRequests.id,
      employeeId: hrEmployees.employeeId,
      employeeName: hrEmployees.fullName,
      departmentName: hrDepartments.name,
      sectionName: hrSections.name,
      leaveTypeName: hcLeaveTypes.name,
      startDate: hcLeaveRequests.startDate,
      endDate: hcLeaveRequests.endDate,
      totalDays: hcLeaveRequests.totalDays,
      reason: hcLeaveRequests.reason,
      attachmentUrl: hcLeaveRequests.attachmentUrl,
      status: hcLeaveRequests.status,
      approvedBy: hcLeaveRequests.approvedBy,
      approvedAt: hcLeaveRequests.approvedAt,
      rejectionReason: hcLeaveRequests.rejectionReason,
      createdAt: hcLeaveRequests.createdAt,
    })
    .from(hcLeaveRequests)
    .innerJoin(hrEmployees, eq(hcLeaveRequests.employeeId, hrEmployees.id))
    .leftJoin(hcLeaveTypes, eq(hcLeaveRequests.leaveTypeId, hcLeaveTypes.id))
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .leftJoin(hrSections, eq(hrEmployees.sectionId, hrSections.id))
    .where(whereClause)
    .orderBy(desc(hcLeaveRequests.createdAt));
}

// ─── Leave Balances ─────────────────────────────────────────────────────

export async function getLeaveBalances(employeeId?: number) {
  const conditions = [];

  if (employeeId) {
    conditions.push(eq(hcLeaveBalances.employeeId, employeeId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return await db
    .select({
      id: hcLeaveBalances.id,
      employeeId: hcLeaveBalances.employeeId,
      employeeName: hrEmployees.fullName,
      leaveTypeId: hcLeaveBalances.leaveTypeId,
      leaveTypeName: hcLeaveTypes.name,
      year: hcLeaveBalances.year,
      totalDays: hcLeaveBalances.totalDays,
      usedDays: hcLeaveBalances.usedDays,
      carryOverDays: hcLeaveBalances.carryOverDays,
      remainingDays: sql<number>`${hcLeaveBalances.totalDays} + ${hcLeaveBalances.carryOverDays} - ${hcLeaveBalances.usedDays}`,
    })
    .from(hcLeaveBalances)
    .innerJoin(hcLeaveTypes, eq(hcLeaveBalances.leaveTypeId, hcLeaveTypes.id))
    .innerJoin(hrEmployees, eq(hcLeaveBalances.employeeId, hrEmployees.id))
    .where(whereClause)
    .orderBy(hcLeaveBalances.year, hcLeaveTypes.name);
}

// ─── Leave Stats ────────────────────────────────────────────────────────

export async function getLeaveStats() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);
  const todayStr = now.toISOString().split("T")[0];

  const [pendingResult] = await db
    .select({ value: count() })
    .from(hcLeaveRequests)
    .where(eq(hcLeaveRequests.status, "pending"));

  const [approvedThisMonthResult] = await db
    .select({ value: count() })
    .from(hcLeaveRequests)
    .where(
      and(
        eq(hcLeaveRequests.status, "approved"),
        gte(hcLeaveRequests.approvedAt, monthStart),
        lte(hcLeaveRequests.approvedAt, monthEnd),
      ),
    );

  const [rejectedResult] = await db
    .select({ value: count() })
    .from(hcLeaveRequests)
    .where(eq(hcLeaveRequests.status, "rejected"));

  const [totalResult] = await db
    .select({ value: count() })
    .from(hcLeaveRequests);

  const [onLeaveTodayResult] = await db
    .select({ value: count() })
    .from(hcLeaveRequests)
    .where(
      and(
        eq(hcLeaveRequests.status, "approved"),
        lte(hcLeaveRequests.startDate, todayStr),
        gte(hcLeaveRequests.endDate, todayStr),
      ),
    );

  return {
    pending: pendingResult?.value ?? 0,
    approvedThisMonth: approvedThisMonthResult?.value ?? 0,
    rejected: rejectedResult?.value ?? 0,
    total: totalResult?.value ?? 0,
    onLeaveToday: onLeaveTodayResult?.value ?? 0,
  };
}

// ─── Create Leave Request ───────────────────────────────────────────────

async function notifyLeaveRequestSubmitted(input: {
  employeeName: string;
  employeeEmail: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
}) {
  const recipients = await getHumanCapitalRecipientEmails();
  if (recipients.length === 0) return;

  const emailContent = buildWorkflowEmailContent({
    title: `Pengajuan cuti ${input.leaveTypeName} baru`,
    intro: `${input.employeeName} mengirim pengajuan cuti dan menunggu review tim HC.`,
    details: [
      `Jenis cuti: ${input.leaveTypeName}`,
      `Tanggal: ${input.startDate} s/d ${input.endDate}`,
      `Total hari: ${input.totalDays}`,
      input.reason ? `Alasan: ${input.reason}` : null,
    ],
    ctaLabel: "Buka Dashboard Leave",
    ctaUrl: getAppUrl("/dashboard/hc/leave"),
  });

  await sendWorkflowEmailToMany({
    recipients,
    actorEmail: input.employeeEmail,
    templateCode: "leave_request_submitted",
    templateName: "Leave Request Submitted",
    variables: {
      employeeName: input.employeeName,
      leaveTypeName: input.leaveTypeName,
      startDate: input.startDate,
      endDate: input.endDate,
      totalDays: input.totalDays,
      reason: input.reason ? `Alasan: ${input.reason}` : "",
    },
    fallbackSubject: `Pengajuan cuti ${input.leaveTypeName} baru`,
    fallbackHtml: emailContent.html,
    fallbackText: emailContent.text,
  });
}

async function notifyLeaveRequestDecision(input: {
  employeeName: string;
  employeeEmail: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  status: "approved" | "rejected";
  approverName?: string;
  rejectionReason?: string;
}) {
  if (!input.employeeEmail) return;

  const statusLabel = input.status === "approved" ? "disetujui" : "ditolak";
  const emailContent = buildWorkflowEmailContent({
    title: `Pengajuan cuti ${statusLabel}`,
    greeting: `Halo ${input.employeeName},`,
    intro: `Pengajuan cuti ${input.leaveTypeName} Anda telah ${statusLabel}.`,
    details: [
      `Tanggal: ${input.startDate} s/d ${input.endDate}`,
      input.approverName ? `Diproses oleh: ${input.approverName}` : null,
      input.rejectionReason ? `Catatan: ${input.rejectionReason}` : null,
    ],
    ctaLabel: "Buka Dashboard Leave",
    ctaUrl: getAppUrl("/dashboard/hc/leave"),
  });

  await sendWorkflowEmail({
    to: input.employeeEmail,
    templateCode: "leave_request_decision",
    templateName: "Leave Request Decision",
    variables: {
      employeeName: input.employeeName,
      leaveTypeName: input.leaveTypeName,
      decisionLabel: statusLabel,
      startDate: input.startDate,
      endDate: input.endDate,
      approverName: input.approverName ? `Diproses oleh: ${input.approverName}` : "",
      rejectionReason: input.rejectionReason ? `Catatan: ${input.rejectionReason}` : "",
    },
    fallbackSubject: `Pengajuan cuti ${statusLabel}`,
    fallbackHtml: emailContent.html,
    fallbackText: emailContent.text,
  });
}

async function notifyLeaveBell(input: {
  recipientEmails: string[];
  eventType: string;
  title: string;
  body: string;
  url: string;
  metadata?: Record<string, unknown>;
}) {
  await notifyWorkflowBellRecipients({
    recipientEmails: input.recipientEmails,
    eventType: input.eventType,
    category: "approval_requests",
    title: input.title,
    body: input.body,
    url: input.url,
    tagPrefix: "leave-request",
    metadata: input.metadata,
  });
}

export async function createLeaveRequest(data: {
  employeeId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  attachmentUrl?: string;
}) {
  const [[employee], [leaveType]] = await Promise.all([
    db
      .select({
        name: hrEmployees.fullName,
        email: hrEmployees.email,
      })
      .from(hrEmployees)
      .where(eq(hrEmployees.id, data.employeeId))
      .limit(1),
    db
      .select({
        name: hcLeaveTypes.name,
      })
      .from(hcLeaveTypes)
      .where(eq(hcLeaveTypes.id, data.leaveTypeId))
      .limit(1),
  ]);

  const [created] = await db
    .insert(hcLeaveRequests)
    .values({
      employeeId: data.employeeId,
      approvalSubmissionId: null,
      leaveTypeId: data.leaveTypeId,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays: data.totalDays,
      reason: data.reason || "",
      attachmentUrl: data.attachmentUrl || "",
      status: "pending",
    })
    .returning();

  const requesterEmployee = employee?.email
    ? await getEmployeeTargetByEmail(employee.email)
    : null;

  if (requesterEmployee) {
    const { submission } = await createLegacyApprovalRequest({
      templateKey: "leave-permission",
      requesterEmployeeId: requesterEmployee.id,
      siteId: null,
      activityType: "leave-permission",
      transactionType: "leave_request",
      referenceId: created.id,
      payloadSnapshot: {
        legacyRecordId: created.id,
        employeeId: data.employeeId,
        employeeName: employee?.name || `Employee #${data.employeeId}`,
        leaveTypeId: data.leaveTypeId,
        leaveTypeName: leaveType?.name || "Leave",
        startDate: data.startDate,
        endDate: data.endDate,
        totalDays: data.totalDays,
        reason: data.reason || "",
      },
      previewSnapshot: {
        title: `Leave Request - ${leaveType?.name || "Leave"}`,
        summary: `${employee?.name || `Employee #${data.employeeId}`} mengajukan cuti ${data.startDate} s/d ${data.endDate}.`,
        workDate: data.startDate,
      },
    });

    await db
      .update(hcLeaveRequests)
      .set({
        approvalSubmissionId: submission.id,
        updatedAt: new Date(),
      })
      .where(eq(hcLeaveRequests.id, created.id));
  }

  revalidatePath("/dashboard/hc/leave");

  try {
    await notifyLeaveRequestSubmitted({
      employeeName: employee?.name || `Employee #${data.employeeId}`,
      employeeEmail: employee?.email || "",
      leaveTypeName: leaveType?.name || "Leave",
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays: data.totalDays,
      reason: data.reason,
    });
  } catch (emailError) {
    console.error("Leave submit email error:", emailError);
  }

  try {
    const recipients = await getHumanCapitalRecipientEmails();
    await notifyLeaveBell({
      recipientEmails: recipients,
      eventType: "leave_request_submitted",
      title: `Pengajuan cuti ${leaveType?.name || "Leave"} baru`,
      body: `${employee?.name || `Employee #${data.employeeId}`} mengajukan cuti ${data.startDate} s/d ${data.endDate}.`,
      url: "/dashboard/hc/leave",
      metadata: {
        employeeName: employee?.name || `Employee #${data.employeeId}`,
        leaveTypeName: leaveType?.name || "Leave",
      },
    });
  } catch (notificationError) {
    console.error("Leave submit bell error:", notificationError);
  }

  return created;
}

// ─── Update Leave Request Status ────────────────────────────────────────

export async function updateLeaveRequestStatus(
  id: number,
  status: "approved" | "rejected",
  approvedBy?: string,
  rejectionReason?: string,
) {
  const [updated] = await db
    .update(hcLeaveRequests)
    .set({
      status,
      approvedBy: approvedBy || "",
      approvedAt: new Date(),
      rejectionReason: rejectionReason || "",
      updatedAt: new Date(),
    })
    .where(eq(hcLeaveRequests.id, id))
    .returning();

  // If approved, update the leave balance
  if (status === "approved" && updated) {
    const [balance] = await db
      .select()
      .from(hcLeaveBalances)
      .where(
        and(
          eq(hcLeaveBalances.employeeId, updated.employeeId),
          eq(hcLeaveBalances.leaveTypeId, updated.leaveTypeId),
          eq(hcLeaveBalances.year, new Date(updated.startDate).getFullYear()),
        ),
      )
      .limit(1);

    if (balance) {
      await db
        .update(hcLeaveBalances)
        .set({
          usedDays: balance.usedDays + updated.totalDays,
          updatedAt: new Date(),
        })
        .where(eq(hcLeaveBalances.id, balance.id));
    }
  }

  revalidatePath("/dashboard/hc/leave");

  if (updated) {
    const employeeContact = await getHrEmployeeContactById(updated.employeeId);
    const [leaveType] = await db
      .select({ name: hcLeaveTypes.name })
      .from(hcLeaveTypes)
      .where(eq(hcLeaveTypes.id, updated.leaveTypeId))
      .limit(1);

    try {
      await notifyLeaveRequestDecision({
        employeeName: employeeContact.name,
        employeeEmail: employeeContact.email,
        leaveTypeName: leaveType?.name || "Leave",
        startDate: updated.startDate,
        endDate: updated.endDate,
        status,
        approverName: approvedBy,
        rejectionReason,
      });
    } catch (emailError) {
      console.error("Leave decision email error:", emailError);
    }

    try {
      const statusLabel = status === "approved" ? "disetujui" : "ditolak";
      await notifyLeaveBell({
        recipientEmails: [employeeContact.email],
        eventType: "leave_request_decision",
        title: `Pengajuan cuti ${statusLabel}`,
        body: `Pengajuan cuti ${leaveType?.name || "Leave"} Anda ${statusLabel}.${rejectionReason ? ` Catatan: ${rejectionReason}` : ""}`,
        url: "/dashboard/hc/leave",
        metadata: {
          leaveTypeName: leaveType?.name || "Leave",
          decision: status,
        },
      });
    } catch (notificationError) {
      console.error("Leave decision bell error:", notificationError);
    }
  }

  return updated;
}

// ─── Delete Leave Request ───────────────────────────────────────────────

export async function deleteLeaveRequest(id: number) {
  await db.delete(hcLeaveRequests).where(eq(hcLeaveRequests.id, id));
  revalidatePath("/dashboard/hc/leave");
  return { success: true };
}

// ─── Init Leave Balances ────────────────────────────────────────────────

export async function initLeaveBalances(employeeId: number, year?: number) {
  const targetYear = year ?? new Date().getFullYear();
  const activeTypes = await db
    .select()
    .from(hcLeaveTypes)
    .where(eq(hcLeaveTypes.isActive, true));

  const results = [];

  for (const lt of activeTypes) {
    const [existing] = await db
      .select()
      .from(hcLeaveBalances)
      .where(
        and(
          eq(hcLeaveBalances.employeeId, employeeId),
          eq(hcLeaveBalances.leaveTypeId, lt.id),
          eq(hcLeaveBalances.year, targetYear),
        ),
      )
      .limit(1);

    if (!existing) {
      const [created] = await db
        .insert(hcLeaveBalances)
        .values({
          employeeId,
          leaveTypeId: lt.id,
          year: targetYear,
          totalDays: lt.defaultDaysPerYear,
          usedDays: 0,
          carryOverDays: 0,
        })
        .returning();
      results.push(created);
    }
  }

  revalidatePath("/dashboard/hc/leave");
  return results;
}

// ─── Update Leave Balance ───────────────────────────────────────────────

export async function updateLeaveBalance(
  id: number,
  data: {
    totalDays?: number;
    usedDays?: number;
    carryOverDays?: number;
  },
) {
  const [updated] = await db
    .update(hcLeaveBalances)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(hcLeaveBalances.id, id))
    .returning();

  revalidatePath("/dashboard/hc/leave");
  return updated;
}
