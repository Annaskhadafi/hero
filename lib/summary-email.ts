import { db } from '@/db';
import { employees } from '@/db/schema/hero';
import { sendWorkflowEmail } from '@/lib/workflow-email';
import { eq } from 'drizzle-orm';

type SummaryDetails = {
  id: number;
  summaryNumber: string;
  sectionName: string;
  departmentName: string;
  generatedByName: string;
  generatedByEmployeeId: number;
  items: Array<{
    employeeName: string;
    siteName: string;
    itemName: string;
    quantity: number;
  }>;
};

import { getApdSummaryNotificationConfigData } from '@/lib/hero-admin';

function parseEmailList(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0 && e.includes('@'));
}

export async function sendSummaryApprovedEmail(summary: SummaryDetails) {
  try {
    const config = await getApdSummaryNotificationConfigData();
    if (!config.isActive) {
      console.log('Summary APD email notification is disabled in settings.');
      return;
    }

    const primaryEmails = parseEmailList(config.recipientEmails);
    const ccEmails = parseEmailList(config.ccEmails);

    if (primaryEmails.length === 0) {
      console.log('No Summary APD recipients configured in email settings.');
      return;
    }

    const printUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/print/summary/${summary.id}`;
    const primaryTo = primaryEmails[0];
    const extraCc = Array.from(new Set([...primaryEmails.slice(1), ...ccEmails]));

    await sendWorkflowEmail({
      to: primaryTo,
      cc: extraCc.length > 0 ? extraCc : undefined,
      templateCode: 'apd_summary_approved',
      templateName: 'Summary Permintaan Barang Approved',
      variables: {
        summaryNumber: summary.summaryNumber,
        sectionName: summary.sectionName,
        departmentName: summary.departmentName,
        generatedByName: summary.generatedByName,
        printUrl,
      },
      fallbackSubject: `[HERO] Summary Permintaan APD ${summary.summaryNumber} - ${summary.sectionName} Sudah Disetujui`,
      fallbackHtml: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;border:1px solid #e2e8f0;"><div style="background:#059669;padding:16px 20px;border-radius:8px 8px 0 0;"><h2 style="color:#ffffff;margin:0;font-size:18px;font-weight:700;">HERO &bull; Summary APD Disetujui</h2><p style="color:#a7f3d0;margin:4px 0 0;font-size:12px;">Persetujuan Pengadaan APD</p></div><div style="background:#ffffff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;"><p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px;">Summary Permintaan APD (<b>${summary.summaryNumber}</b>) untuk section <b>${summary.sectionName}</b> (${summary.departmentName}) telah <b>SELESAI DISETUJUI</b> oleh Department Head.</p><div style="text-align:center;margin:28px 0 16px 0;"><a href="${printUrl}" style="background-color:#059669;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;">Cetak / Lihat Dokumen Summary &rarr;</a></div></div></div>`,
      fallbackText: `Summary Permintaan APD (${summary.summaryNumber}) untuk section ${summary.sectionName} (${summary.departmentName}) sudah disetujui penuh oleh Department Head.\n\n${printUrl}`,
    }).catch(console.error);

    console.log(`Summary email sent to configured recipients: ${primaryTo} (CC: ${extraCc.join(', ')})`);
  } catch (error) {
    console.error('Error sending summary email:', error);
  }
}

export async function sendSummaryPendingApprovalEmail(
  summary: SummaryDetails,
  approverEmployeeId: number,
  level: number,
  roleLabel?: string
) {
  try {
    const [approver] = await db.select({
      email: employees.email,
      name: employees.name,
    }).from(employees).where(eq(employees.id, approverEmployeeId)).limit(1);

    if (!approver?.email) {
      console.log('Approver email not found for employee ID:', approverEmployeeId);
      return;
    }

    const levelLabel = roleLabel || (level === 1 ? 'Section Head (Diperiksa Oleh)' : 'Department Head (Disetujui Oleh)');
    const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/approval`;

    await sendWorkflowEmail({
      to: approver.email,
      templateCode: 'apd_summary_pending_approval',
      templateName: 'Summary Pending Approval',
      variables: {
        summaryNumber: summary.summaryNumber,
        sectionName: summary.sectionName,
        departmentName: summary.departmentName,
        generatedByName: summary.generatedByName,
        approverName: approver.name,
        approvalLevel: levelLabel,
        approvalUrl,
      },
      fallbackSubject: `[HERO] Review ${summary.summaryNumber} - ${summary.sectionName}`,
      fallbackText: `Summary ${summary.summaryNumber} - ${summary.sectionName} menunggu persetujuan Anda (${levelLabel}). Silakan login HERO untuk review.`,
    }).catch(console.error);

    console.log(`Summary pending approval email sent to ${approver.name} (${approver.email})`);
  } catch (error) {
    console.error('Error sending summary pending approval email:', error);
  }
}
