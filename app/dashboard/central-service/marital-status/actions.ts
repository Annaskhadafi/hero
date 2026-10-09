'use server';

import { db } from '@/db';
import { maritalStatusRequests, employees, approvals } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentEmployee } from '@/lib/get-current-employee';
import { ensureMaritalStatusRequestSchema } from '@/lib/marital-status-data';
import { createNotificationEventForEmployee } from '@/lib/push-notifications';
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center';
import { resolveApprovalRouteForActivity } from '@/lib/approval-engine';
import {
  sendMaritalStatusApprovalRequestedEmail,
  sendMaritalStatusApprovedEmail,
  sendMaritalStatusRejectedEmail,
  sendMaritalStatusRevertedEmail,
} from '@/lib/marital-status-email';

export interface SubmitMaritalStatusInput {
  targetMaritalStatus: string;
  reason: string;
  approver1Id: number;
  approver2Id: number;
  signatureUrl?: string;
  notes?: string;
  siteId?: number;
}

export async function submitMaritalStatusRequestAction(input: SubmitMaritalStatusInput) {
  try {
    await ensureMaritalStatusRequestSchema();
    const currentEmployee = await getCurrentEmployee();
    if (!currentEmployee) {
      return { success: false, error: 'User tidak terautentikasi.' };
    }

    if (!input.targetMaritalStatus?.trim()) {
      return { success: false, error: 'Status Pernikahan Tujuan wajib dipilih.' };
    }

    if (!input.reason?.trim()) {
      return { success: false, error: 'Alasan perubahan status pernikahan wajib diisi.' };
    }

    if (!input.approver1Id || !input.approver2Id) {
      return { success: false, error: 'Pemeriksa (Level 1) dan Atasan Langsung (Level 2) wajib dipilih.' };
    }

    // Fetch employee current profile
    const [empProfile] = await db
      .select({
        name: employees.name,
        employeeSn: employees.employeeSn,
        maritalStatus: employees.maritalStatus,
        siteId: employees.siteId,
      })
      .from(employees)
      .where(eq(employees.id, currentEmployee.id))
      .limit(1);

    if (!empProfile) {
      return { success: false, error: 'Data karyawan tidak ditemukan.' };
    }

    // Fetch approvers profiles
    const [app1Profile] = await db
      .select({ name: employees.name, email: employees.email })
      .from(employees)
      .where(eq(employees.id, input.approver1Id))
      .limit(1);

    const [app2Profile] = await db
      .select({ name: employees.name, email: employees.email })
      .from(employees)
      .where(eq(employees.id, input.approver2Id))
      .limit(1);

    if (!app1Profile || !app2Profile) {
      return { success: false, error: 'Data pemeriksa / atasan yang dipilih tidak ditemukan.' };
    }

    // Generate Request Number: MAR-YYYY-0001
    const currentYear = new Date().getFullYear();
    const [lastReq] = await db
      .select({ requestNumber: maritalStatusRequests.requestNumber })
      .from(maritalStatusRequests)
      .orderBy(desc(maritalStatusRequests.id))
      .limit(1);

    let nextSeq = 1;
    if (lastReq?.requestNumber) {
      const match = lastReq.requestNumber.match(/MAR-\d{4}-(\d+)/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }
    const requestNumber = `MAR-${currentYear}-${String(nextSeq).padStart(4, '0')}`;

    const currentMaritalStatus = empProfile.maritalStatus || 'Belum Diisi';

    const [newRequest] = await db
      .insert(maritalStatusRequests)
      .values({
        requestNumber,
        employeeId: currentEmployee.id,
        siteId: input.siteId ?? empProfile.siteId ?? null,
        currentMaritalStatus,
        targetMaritalStatus: input.targetMaritalStatus.trim(),
        reason: input.reason.trim(),
        status: 'pending_approval',
        signatureUrl: input.signatureUrl || null,
        notes: input.notes?.trim() || '',
      })
      .returning();

    // Resolve default route snapshot via Approval Engine
    const resolvedRoute = await resolveApprovalRouteForActivity({
      employeeId: currentEmployee.id,
      activityType: 'marital_status',
      priority: 'normal',
      overtimeMinutes: 0,
      siteId: input.siteId ?? empProfile.siteId ?? null,
      transactionType: 'marital_status',
    });
    const routeSnapshot = JSON.stringify(resolvedRoute);

    // Create approval steps
    // Level 1: Mengetahui (PJO / HSE / Leader)
    await db.insert(approvals).values({
      maritalStatusRequestId: newRequest.id,
      activityType: 'marital_status',
      requestNumber,
      activityTitle: `Permohonan Status Pernikahan: ${newRequest.requestNumber}`,
      formName: 'Permohonan Perubahan Status Pernikahan',
      createdBy: currentEmployee.id,
      level: 1,
      approverName: app1Profile.name,
      approverEmployeeId: input.approver1Id,
      approverEmail: app1Profile.email,
      status: 'pending',
      submittedAt: new Date(),
      resolutionSource: 'direct_select',
      routeSnapshot,
    });

    // Level 2: Menyetujui (Section Head)
    await db.insert(approvals).values({
      maritalStatusRequestId: newRequest.id,
      activityType: 'marital_status',
      requestNumber,
      activityTitle: `Permohonan Status Pernikahan: ${newRequest.requestNumber}`,
      formName: 'Permohonan Perubahan Status Pernikahan',
      createdBy: currentEmployee.id,
      level: 2,
      approverName: app2Profile.name,
      approverEmployeeId: input.approver2Id,
      approverEmail: app2Profile.email,
      status: 'waiting',
      submittedAt: new Date(),
      resolutionSource: 'direct_select',
      routeSnapshot,
    });

    // Send Notification Bell & Email to Level 1 Approver
    try {
      if (app1Profile.email) {
        await createNotificationEventForEmployee({
          employeeId: input.approver1Id,
          eventType: 'marital_status_approval_requested',
          category: 'approval_requests',
          title: 'Permohonan Perubahan Status Pernikahan',
          body: `${empProfile.name} mengajukan perubahan status pernikahan (${currentMaritalStatus} ➔ ${input.targetMaritalStatus}).`,
          url: `/dashboard/approval`,
        });
        await notifyWorkflowBellRecipients({
          recipientEmails: [app1Profile.email],
          eventType: 'marital_status_approval_requested',
          category: 'approval_requests',
          title: 'Permohonan Perubahan Status Pernikahan',
          body: `${empProfile.name} mengajukan permohonan perubahan status pernikahan baru.`,
          url: `/dashboard/approval`,
        });
        await sendMaritalStatusApprovalRequestedEmail(app1Profile.email, {
          requestNumber,
          employeeName: empProfile.name,
          employeeSn: empProfile.employeeSn,
          currentMaritalStatus,
          targetMaritalStatus: input.targetMaritalStatus.trim(),
          reason: input.reason.trim(),
          approverName: app1Profile.name,
          approvalLevel: 1,
        });
      }
    } catch (notifErr) {
      console.warn('[submitMaritalStatusRequestAction] Notification warning:', notifErr);
    }

    revalidateMaritalStatusPaths();

    return {
      success: true,
      requestNumber: newRequest.requestNumber,
      id: newRequest.id,
    };
  } catch (error: any) {
    console.error('Error submitting marital status request:', error);
    return { success: false, error: error.message || 'Gagal mengajukan permohonan perubahan status pernikahan.' };
  }
}

export async function approveMaritalStatusStepAction(
  requestId: number,
  stepId: number,
  decisionNote?: string,
  signatureUrl?: string
) {
  try {
    await ensureMaritalStatusRequestSchema();
    const currentEmployee = await getCurrentEmployee();
    if (!currentEmployee) {
      return { success: false, error: 'User tidak terautentikasi.' };
    }

    let [targetStep] = await db
      .select()
      .from(approvals)
      .where(and(eq(approvals.id, stepId), eq(approvals.maritalStatusRequestId, requestId)))
      .limit(1);

    if (!targetStep) {
      const [byStepId] = await db
        .select()
        .from(approvals)
        .where(eq(approvals.id, stepId))
        .limit(1);
      targetStep = byStepId;
    }

    if (!targetStep) {
      return { success: false, error: 'Langkah persetujuan tidak ditemukan.' };
    }

    if (targetStep.status !== 'pending') {
      return { success: false, error: 'Langkah persetujuan ini sudah diproses sebelumnya.' };
    }

    // Update current step to approved
    await db
      .update(approvals)
      .set({
        status: 'approved',
        reviewedAt: new Date(),
        decisionNote: decisionNote?.trim() || 'Disetujui',
        ...(signatureUrl && { signatureUrl }),
      })
      .where(eq(approvals.id, stepId));

    // Fetch all steps for this request
    const allSteps = await db
      .select()
      .from(approvals)
      .where(eq(approvals.maritalStatusRequestId, requestId))
      .orderBy(approvals.level);

    const level2Step = allSteps.find((s) => s.level === 2);
    const isLevel1 = targetStep.level === 1;

    const [request] = await db
      .select()
      .from(maritalStatusRequests)
      .where(eq(maritalStatusRequests.id, requestId))
      .limit(1);

    if (!request) return { success: false, error: 'Permohonan tidak ditemukan.' };

    if (isLevel1 && level2Step && level2Step.approverEmployeeId) {
      if (level2Step.status === 'waiting') {
        await db
          .update(approvals)
          .set({ status: 'pending', submittedAt: new Date() })
          .where(eq(approvals.id, level2Step.id));
      }
      // Notify Level 2 Approver (Section Head)
      try {
        if (level2Step.approverEmail) {
          await createNotificationEventForEmployee({
            employeeId: level2Step.approverEmployeeId,
            eventType: 'marital_status_approval_requested',
            category: 'approval_requests',
            title: 'Persetujuan Perubahan Status Pernikahan',
            body: `Permohonan ${request.requestNumber} telah diketahuinya dan memerlukan persetujuan Anda.`,
            url: `/dashboard/approval`,
          });
          await notifyWorkflowBellRecipients({
            recipientEmails: [level2Step.approverEmail],
            eventType: 'marital_status_approval_requested',
            category: 'approval_requests',
            title: 'Persetujuan Perubahan Status Pernikahan',
            body: `Permohonan ${request.requestNumber} memerlukan persetujuan Atasan Langsung.`,
            url: `/dashboard/approval`,
          });

          // Fetch submitter info for email details
          const [subEmp] = await db
            .select({ name: employees.name, employeeSn: employees.employeeSn })
            .from(employees)
            .where(eq(employees.id, request.employeeId))
            .limit(1);

          await sendMaritalStatusApprovalRequestedEmail(level2Step.approverEmail, {
            requestNumber: request.requestNumber,
            employeeName: subEmp?.name || 'Karyawan',
            employeeSn: subEmp?.employeeSn || '-',
            currentMaritalStatus: request.currentMaritalStatus,
            targetMaritalStatus: request.targetMaritalStatus,
            reason: request.reason,
            approverName: level2Step.approverName,
            approvalLevel: 2,
          });
        }
      } catch (e) {
        console.warn('Notification to Level 2 failed:', e);
      }
    } else {
      // All steps completed -> Approved
      await db
        .update(maritalStatusRequests)
        .set({
          status: 'approved',
          updatedAt: new Date(),
        })
        .where(eq(maritalStatusRequests.id, requestId));

      // Synchronize employee's marital status in hero_employees
      try {
        await db
          .update(employees)
          .set({
            maritalStatus: request.targetMaritalStatus,
          })
          .where(eq(employees.id, request.employeeId));
      } catch (updateEmpErr) {
        console.warn('[approveMaritalStatusStepAction] Profile sync warning:', updateEmpErr);
      }

      // Fetch requester info
      const [reqEmp] = await db
        .select({ name: employees.name, email: employees.email })
        .from(employees)
        .where(eq(employees.id, request.employeeId))
        .limit(1);

      // Send Notification to Requester
      try {
        await createNotificationEventForEmployee({
          employeeId: request.employeeId,
          eventType: 'marital_status_request_approved',
          category: 'approval_requests',
          title: 'Permohonan Perubahan Status Pernikahan Disetujui',
          body: `Permohonan ${request.requestNumber} telah disetujui sepenuhnya. Data status pernikahan Anda telah diperbarui menjadi ${request.targetMaritalStatus}.`,
          url: `/dashboard/central-service/marital-status`,
        });

        if (reqEmp?.email) {
          await sendMaritalStatusApprovedEmail(reqEmp.email, {
            requestNumber: request.requestNumber,
            employeeName: reqEmp.name,
            employeeSn: '',
            currentMaritalStatus: request.currentMaritalStatus,
            targetMaritalStatus: request.targetMaritalStatus,
            reason: request.reason,
          });
        }
      } catch (e) {
        console.warn('Notification to requester failed:', e);
      }
    }

    revalidateMaritalStatusPaths();
    return { success: true };
  } catch (error: any) {
    console.error('Error approving marital status step:', error);
    return { success: false, error: error.message || 'Gagal menyetujui permohonan.' };
  }
}

export async function rejectMaritalStatusStepAction(
  requestId: number,
  stepId: number,
  rejectionReason: string
) {
  try {
    await ensureMaritalStatusRequestSchema();
    const currentEmployee = await getCurrentEmployee();
    if (!currentEmployee) {
      return { success: false, error: 'User tidak terautentikasi.' };
    }

    if (!rejectionReason?.trim()) {
      return { success: false, error: 'Alasan penolakan wajib diisi.' };
    }

    // Update step to rejected
    await db
      .update(approvals)
      .set({
        status: 'rejected',
        reviewedAt: new Date(),
        decisionNote: rejectionReason.trim(),
        rejectionReason: rejectionReason.trim(),
      })
      .where(eq(approvals.id, stepId));

    // Set request status to rejected
    const [request] = await db
      .update(maritalStatusRequests)
      .set({
        status: 'rejected',
        updatedAt: new Date(),
      })
      .where(eq(maritalStatusRequests.id, requestId))
      .returning();

    if (request) {
      // Fetch requester info
      const [reqEmp] = await db
        .select({ name: employees.name, email: employees.email })
        .from(employees)
        .where(eq(employees.id, request.employeeId))
        .limit(1);

      // Notify requester
      try {
        await createNotificationEventForEmployee({
          employeeId: request.employeeId,
          eventType: 'marital_status_request_rejected',
          category: 'approval_requests',
          title: 'Permohonan Perubahan Status Pernikahan Ditolak',
          body: `Permohonan ${request.requestNumber} tidak disetujui. Catatan: ${rejectionReason}`,
          url: `/dashboard/central-service/marital-status`,
        });

        if (reqEmp?.email) {
          await sendMaritalStatusRejectedEmail(reqEmp.email, {
            requestNumber: request.requestNumber,
            employeeName: reqEmp.name,
            employeeSn: '',
            currentMaritalStatus: request.currentMaritalStatus,
            targetMaritalStatus: request.targetMaritalStatus,
            reason: request.reason,
            rejectionReason: rejectionReason.trim(),
          });
        }
      } catch (e) {
        console.warn('Notification to requester failed:', e);
      }
    }

    revalidateMaritalStatusPaths();
    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting marital status step:', error);
    return { success: false, error: error.message || 'Gagal menolak permohonan.' };
  }
}

export async function revertMaritalStatusStepAction(
  requestId: number,
  stepId: number,
  revertReason: string
) {
  try {
    await ensureMaritalStatusRequestSchema();
    const currentEmployee = await getCurrentEmployee();
    if (!currentEmployee) {
      return { success: false, error: 'User tidak terautentikasi.' };
    }

    if (!revertReason?.trim()) {
      return { success: false, error: 'Alasan pengembalian / revisi wajib diisi.' };
    }

    // Update step to reverted
    await db
      .update(approvals)
      .set({
        status: 'reverted',
        reviewedAt: new Date(),
        decisionNote: revertReason.trim(),
        rejectionReason: revertReason.trim(),
      })
      .where(eq(approvals.id, stepId));

    // Set request status to reverted
    const [request] = await db
      .update(maritalStatusRequests)
      .set({
        status: 'reverted',
        updatedAt: new Date(),
      })
      .where(eq(maritalStatusRequests.id, requestId))
      .returning();

    if (request) {
      const [reqEmp] = await db
        .select({ name: employees.name, email: employees.email })
        .from(employees)
        .where(eq(employees.id, request.employeeId))
        .limit(1);

      try {
        await createNotificationEventForEmployee({
          employeeId: request.employeeId,
          eventType: 'marital_status_request_rejected',
          category: 'approval_requests',
          title: 'Permohonan Perubahan Status Pernikahan Dikembalikan',
          body: `Permohonan ${request.requestNumber} dikembalikan untuk revisi. Catatan: ${revertReason.trim()}`,
          url: `/dashboard/central-service/marital-status`,
        });

        if (reqEmp?.email) {
          await sendMaritalStatusRevertedEmail(reqEmp.email, {
            requestNumber: request.requestNumber,
            employeeName: reqEmp.name,
            employeeSn: '',
            currentMaritalStatus: request.currentMaritalStatus,
            targetMaritalStatus: request.targetMaritalStatus,
            reason: request.reason,
            revertReason: revertReason.trim(),
          });
        }
      } catch (e) {
        console.warn('Notification to requester failed:', e);
      }
    }

    revalidateMaritalStatusPaths();
    return { success: true };
  } catch (error: any) {
    console.error('Error reverting marital status step:', error);
    return { success: false, error: error.message || 'Gagal mengembalikan permohonan.' };
  }
}

export async function deleteMaritalStatusRequestAction(id: number) {
  try {
    await ensureMaritalStatusRequestSchema();
    const currentEmployee = await getCurrentEmployee();
    if (!currentEmployee) {
      return { success: false, error: 'User tidak terautentikasi.' };
    }

    // Delete approvals
    await db.delete(approvals).where(eq(approvals.maritalStatusRequestId, id));

    // Delete request
    await db.delete(maritalStatusRequests).where(eq(maritalStatusRequests.id, id));

    revalidateMaritalStatusPaths();
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting marital status request:', error);
    return { success: false, error: error.message || 'Gagal menghapus permohonan.' };
  }
}

function revalidateMaritalStatusPaths() {
  try {
    revalidatePath('/dashboard/central-service/marital-status');
    revalidatePath('/mobile/central-service/marital-status');
    revalidatePath('/dashboard/approval');
    revalidatePath('/print/central-service/marital-status');
  } catch (e) {
    // ignore outside request context
  }
}
