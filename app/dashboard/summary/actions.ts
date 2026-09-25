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

import { db } from '@/db';
import { employees, sites, masterSections, masterDepartments, employeeAssets } from '@/db/schema/hero';
import { eq, and, asc, ilike, desc } from 'drizzle-orm';

export async function getPendingRequestsAction(sectionId: number, targetSite: string) {
  try {
    const requests = await getPendingRequestsForSection(sectionId, targetSite);
    return { success: true, requests };
  } catch (error: any) {
    console.error('Get pending requests error:', error);
    return { success: false, error: error.message || 'Gagal mengambil data pengajuan' };
  }
}

export async function getAvailableEmployeesForSummaryAction(sectionId?: number) {
  try {
    const rows = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        sectionId: employees.sectionId,
        sectionName: masterSections.name,
        departmentId: employees.departmentId,
        departmentName: masterDepartments.name,
        siteId: employees.siteId,
        siteName: sites.name,
        employmentStatus: employees.employmentStatus,
      })
      .from(employees)
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .orderBy(asc(employees.name));

    // Also get safety shoes sizes for all employees
    const shoeAssets = await db
      .select({
        employeeId: employeeAssets.employeeId,
        size: employeeAssets.size,
      })
      .from(employeeAssets)
      .where(ilike(employeeAssets.itemName, '%sepatu%'))
      .orderBy(desc(employeeAssets.assignedAt));

    const shoeSizeMap = new Map<number, string>();
    for (const asset of shoeAssets) {
      if (asset.employeeId && asset.size && !shoeSizeMap.has(asset.employeeId)) {
        shoeSizeMap.set(asset.employeeId, asset.size);
      }
    }

    const result = rows.map((emp) => ({
      ...emp,
      safetyShoesSize: shoeSizeMap.get(emp.id) || '',
    }));

    return { success: true, employees: result };
  } catch (error: any) {
    console.error('Get available employees for summary error:', error);
    return { success: false, error: error.message || 'Gagal mengambil daftar karyawan' };
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
