'use server';

import { generateSummary, submitSummary, approveSummaryStep, getSummaryDetails } from '@/lib/summary-engine';
import { sendSummaryApprovedEmail, sendSummaryPendingApprovalEmail } from '@/lib/summary-email';
import { revalidatePath } from 'next/cache';

export async function generateSummaryAction(sectionId: number, employeeId: number) {
  try {
    const result = await generateSummary(sectionId, employeeId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }
    revalidatePath('/dashboard/summary');
    return { success: true, ...result };
  } catch (error) {
    console.error('Generate summary error:', error);
    return { success: false, error: 'Gagal generate summary' };
  }
}

export async function submitSummaryAction(summaryId: number, signatureUrl: string) {
  try {
    const result = await submitSummary(summaryId, signatureUrl);
    if ('error' in result) {
      return { success: false, error: result.error };
    }

    // Send email to first approver (Section Head)
    const summaryDetails = await getSummaryDetails(summaryId);
    if (summaryDetails && summaryDetails.approvals.length > 0) {
      const firstApprover = summaryDetails.approvals[0];
      if (firstApprover.approverEmployeeId) {
        await sendSummaryPendingApprovalEmail(summaryDetails, firstApprover.approverEmployeeId, 1).catch(console.error);
      }
    }

    revalidatePath('/dashboard/summary');
    return { success: true };
  } catch (error) {
    console.error('Submit summary error:', error);
    return { success: false, error: 'Gagal submit summary' };
  }
}

export async function approveSummaryAction(
  summaryId: number,
  level: number,
  approverEmployeeId: number,
  signatureUrl: string,
  decisionNote?: string
) {
  try {
    const result = await approveSummaryStep(summaryId, level, approverEmployeeId, signatureUrl, decisionNote);

    if (result.allApproved) {
      // Send email to HSE: summary fully approved
      const summaryDetails = await getSummaryDetails(summaryId);
      if (summaryDetails) {
        await sendSummaryApprovedEmail(summaryDetails).catch(console.error);
      }
    } else {
      // Send email to next approver
      const summaryDetails = await getSummaryDetails(summaryId);
      if (summaryDetails) {
        const nextLevel = level + 1;
        const nextApprover = summaryDetails.approvals.find((a) => a.level === nextLevel);
        if (nextApprover?.approverEmployeeId) {
          await sendSummaryPendingApprovalEmail(summaryDetails, nextApprover.approverEmployeeId, nextLevel).catch(console.error);
        }
      }
    }

    revalidatePath('/dashboard/summary');
    revalidatePath('/dashboard/approval');
    return { success: true, allApproved: result.allApproved };
  } catch (error) {
    console.error('Approve summary error:', error);
    return { success: false, error: 'Gagal approve summary' };
  }
}
