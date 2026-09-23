'use server';

import {
  generateSummary,
  submitSummary,
  approveSummaryStep,
  getSummaryDetails,
  getPendingRequestsForSection,
  deleteSummaryDraft,
  type GenerateSummaryOptions,
} from '@/lib/summary-engine';
import { sendSummaryApprovedEmail, sendSummaryPendingApprovalEmail } from '@/lib/summary-email';
import { revalidatePath } from 'next/cache';

export async function getPendingRequestsAction(sectionId: number, targetSite: string) {
  try {
    const requests = await getPendingRequestsForSection(sectionId, targetSite);
    return { success: true, requests };
  } catch (error: any) {
    console.error('Get pending requests error:', error);
    return { success: false, error: error.message || 'Gagal mengambil data pengajuan' };
  }
}

export async function generateSummaryAction(
  sectionId: number,
  employeeId: number,
  targetSite: string,
  options?: GenerateSummaryOptions
) {
  try {
    const result = await generateSummary(sectionId, employeeId, targetSite, options);
    if ('error' in result) {
      return { success: false, error: result.error };
    }
    revalidatePath('/dashboard/summary');
    revalidatePath('/mobile/summary');
    return { success: true, ...result };
  } catch (error: any) {
    console.error('Generate summary error:', error);
    return { success: false, error: error.message || 'Gagal generate summary' };
  }
}

export async function deleteSummaryDraftAction(summaryId: number) {
  try {
    const result = await deleteSummaryDraft(summaryId);
    if ('error' in result) {
      return { success: false, error: result.error };
    }
    revalidatePath('/dashboard/summary');
    revalidatePath('/mobile/summary');
    revalidatePath('/dashboard/approval');
    return { success: true };
  } catch (error: any) {
    console.error('Delete summary draft error:', error);
    return { success: false, error: error.message || 'Gagal menghapus summary' };
  }
}

export async function submitSummaryAction(summaryId: number, signatureUrl: string) {
  try {
    const result = await submitSummary(summaryId, signatureUrl);
    if ('error' in result) {
      return { success: false, error: result.error };
    }

    revalidatePath('/dashboard/summary');
    revalidatePath('/mobile/summary');
    revalidatePath('/dashboard/approval');
    return { success: true };
  } catch (error: any) {
    console.error('Submit summary error:', error);
    return { success: false, error: error.message || 'Gagal submit summary' };
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

    revalidatePath('/dashboard/summary');
    revalidatePath('/mobile/summary');
    revalidatePath('/dashboard/approval');
    return { success: true, allApproved: result.allApproved };
  } catch (error: any) {
    console.error('Approve summary error:', error);
    return { success: false, error: error.message || 'Gagal approve summary' };
  }
}
