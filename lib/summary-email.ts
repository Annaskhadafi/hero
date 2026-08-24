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

export async function sendSummaryApprovedEmail(summary: SummaryDetails) {
  try {
    // Get HSE employees to send email to
    const hseRows = await db.select({
      email: employees.email,
      name: employees.name,
    }).from(employees)
      .where(eq(employees.section, 'HSE'))
      .limit(5);
    const hseEmployees = hseRows.length > 0 ? hseRows : [];

    if (hseEmployees.length === 0) {
      console.log('No HSE employees found to send summary email');
      return;
    }

    const printUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/print/summary/${summary.id}`;
    const fallbackSubject = `[HERO] Summary ${summary.summaryNumber} - ${summary.sectionName} Sudah Disetujui`;
    const fallbackText = `Summary ${summary.summaryNumber} - ${summary.sectionName} sudah disetujui. Silakan login HERO untuk melihat detail.`;

    for (const hseEmp of hseEmployees) {
      await sendWorkflowEmail({
        to: hseEmp.email,
        templateCode: 'apd_summary_approved',
        templateName: 'Summary Approved',
        variables: {
          summaryNumber: summary.summaryNumber,
          sectionName: summary.sectionName,
          departmentName: summary.departmentName,
          generatedByName: summary.generatedByName,
          printUrl,
        },
        fallbackSubject,
        fallbackText,
      }).catch(console.error);
    }

    console.log(`Summary email sent to ${hseEmployees.length} HSE employees`);
  } catch (error) {
    console.error('Error sending summary email:', error);
  }
}

export async function sendSummaryPendingApprovalEmail(
  summary: SummaryDetails,
  approverEmployeeId: number,
  level: number
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

    const levelLabel = level === 1 ? 'Section Head (Diperiksa Oleh)' : 'Department Head (Disetujui Oleh)';
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
