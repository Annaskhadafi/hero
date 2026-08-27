const fs = require('fs');
const content = `import { db } from '@/db';
import { apdRequests, apdRequestItems, employees, sites, masterSections, masterDepartments } from '@/db/schema/hero';
import { apdSummaries, apdSummaryItems, apdSummaryApprovals } from '@/db/schema/apd-summary';
import { eq, and, asc, desc, sql } from 'drizzle-orm';

export const APD_ITEM_COLUMNS = [
  'Helmet', 'Safety Glasses', 'Masker Kain', 'Ear Plug', 'Safety Shoes',
  '3M Cartridge', 'Hand Glove (Cable)', 'Hand Glove (Knit)', 'Respirator Fullset',
  'Hand Glove (Cotton)', 'Tool Box', 'Neck Guard', 'Head Gear', 'Hard Helmet'
];

export async function getSectionsWithApprovedRequests() {
  const sections = await db.select({
    id: masterSections.id,
    name: masterSections.name,
    code: masterSections.code,
    departmentId: masterSections.departmentId,
    headEmployeeId: masterSections.headEmployeeId,
  }).from(masterSections)
    .where(eq(masterSections.isActive, true))
    .orderBy(asc(masterSections.name));

  const results = [];
  for (const section of sections) {
    const [countResult] = await db.select({
      count: sql<number>\`count(*)::int\`,
    }).from(apdRequests)
      .innerJoin(employees, eq(apdRequests.employeeId, employees.id))
      .where(and(eq(employees.sectionId, section.id), eq(apdRequests.status, 'approved')));

    const [existingSummary] = await db.select({
      id: apdSummaries.id,
      status: apdSummaries.status,
    }).from(apdSummaries)
      .where(eq(apdSummaries.sectionId, section.id))
      .orderBy(desc(apdSummaries.createdAt))
      .limit(1);

    results.push({
      ...section,
      approvedCount: countResult?.count || 0,
      summaryStatus: existingSummary?.status || null,
      summaryId: existingSummary?.id || null,
    });
  }
  return results;
}

export async function generateSummary(sectionId: number, generatedByEmployeeId: number) {
  const approvedRequests = await db.select({
    requestId: apdRequests.id,
    requestNumber: apdRequests.requestNumber,
    employeeId: employees.id,
    employeeName: employees.name,
    employeeSn: employees.employeeSn,
    siteId: sites.id,
    siteName: sites.name,
    requestCategory: apdRequests.requestCategory,
  }).from(apdRequests)
    .innerJoin(employees, eq(apdRequests.employeeId, employees.id))
    .innerJoin(sites, eq(apdRequests.siteId, sites.id))
    .where(and(eq(employees.sectionId, sectionId), eq(apdRequests.status, 'approved')))
    .orderBy(asc(employees.name));

  if (approvedRequests.length === 0) {
    return { error: 'Tidak ada request yang sudah approved untuk section ini' };
  }

  const summaryItems = [];
  for (const req of approvedRequests) {
    const items = await db.select().from(apdRequestItems)
      .where(eq(apdRequestItems.requestId, req.requestId));
    for (const item of items) {
      summaryItems.push({
        apdRequestId: req.requestId,
        employeeId: req.employeeId,
        employeeName: req.employeeName,
        employeeSn: req.employeeSn,
        siteName: req.siteName,
        itemName: item.itemType,
        quantity: item.quantity,
        requestType: item.requestType,
      });
    }
  }

  const [lastSummary] = await db.select({ summaryNumber: apdSummaries.summaryNumber })
    .from(apdSummaries).orderBy(desc(apdSummaries.id)).limit(1);
  const nextNumber = lastSummary ? parseInt(lastSummary.summaryNumber.replace('SUM-', '')) + 1 : 1;
  const summaryNumber = \`SUM-\${String(nextNumber).padStart(3, '0')}\`;

  const [summary] = await db.insert(apdSummaries).values({
    summaryNumber, sectionId, status: 'draft', generatedByEmployeeId,
  }).returning();

  for (const item of summaryItems) {
    await db.insert(apdSummaryItems).values({ summaryId: summary.id, ...item });
  }
  return { summaryId: summary.id, summaryNumber, itemCount: summaryItems.length };
}

export async function submitSummary(summaryId: number, signatureUrl: string) {
  const [summary] = await db.select({
    id: apdSummaries.id,
    sectionId: apdSummaries.sectionId,
    headEmployeeId: masterSections.headEmployeeId,
  }).from(apdSummaries)
    .innerJoin(masterSections, eq(apdSummaries.sectionId, masterSections.id))
    .where(eq(apdSummaries.id, summaryId));

  if (!summary) return { error: 'Summary tidak ditemukan' };

  const [section] = await db.select({ departmentId: masterSections.departmentId })
    .from(masterSections).where(eq(masterSections.id, summary.sectionId));

  const [department] = await db.select({ headEmployeeId: masterDepartments.headEmployeeId })
    .from(masterDepartments).where(eq(masterDepartments.id, section?.departmentId || 0));

  await db.update(apdSummaries)
    .set({ status: 'pending', generatedAt: new Date() })
    .where(eq(apdSummaries.id, summaryId));

  if (summary.headEmployeeId) {
    await db.insert(apdSummaryApprovals).values({
      summaryId, level: 1, approverEmployeeId: summary.headEmployeeId, status: 'pending',
    });
  }
  if (department?.headEmployeeId) {
    await db.insert(apdSummaryApprovals).values({
      summaryId, level: 2, approverEmployeeId: department.headEmployeeId, status: 'pending',
    });
  }
  return { success: true };
}

export async function approveSummaryStep(
  summaryId: number, level: number, approverEmployeeId: number,
  signatureUrl: string, decisionNote?: string
) {
  await db.update(apdSummaryApprovals)
    .set({ status: 'approved', signatureUrl, decisionNote: decisionNote || '', reviewedAt: new Date() })
    .where(and(eq(apdSummaryApprovals.summaryId, summaryId), eq(apdSummaryApprovals.level, level)));

  const [pendingApproval] = await db.select()
    .from(apdSummaryApprovals)
    .where(and(eq(apdSummaryApprovals.summaryId, summaryId), eq(apdSummaryApprovals.status, 'pending')));

  if (!pendingApproval) {
    await db.update(apdSummaries)
      .set({ status: 'approved', approvedAt: new Date() })
      .where(eq(apdSummaries.id, summaryId));
    return { allApproved: true };
  }
  return { allApproved: false };
}

export async function getSummaryDetails(summaryId: number) {
  const [summary] = await db.select({
    id: apdSummaries.id,
    summaryNumber: apdSummaries.summaryNumber,
    sectionId: apdSummaries.sectionId,
    status: apdSummaries.status,
    generatedAt: apdSummaries.generatedAt,
    approvedAt: apdSummaries.approvedAt,
    sectionName: masterSections.name,
    departmentId: masterSections.departmentId,
    generatedByName: employees.name,
  }).from(apdSummaries)
    .innerJoin(masterSections, eq(apdSummaries.sectionId, masterSections.id))
    .innerJoin(employees, eq(apdSummaries.generatedByEmployeeId, employees.id))
    .where(eq(apdSummaries.id, summaryId));

  if (!summary) return null;

  const [department] = await db.select({ name: masterDepartments.name })
    .from(masterDepartments).where(eq(masterDepartments.id, summary.departmentId || 0));

  const items = await db.select().from(apdSummaryItems)
    .where(eq(apdSummaryItems.summaryId, summaryId))
    .orderBy(asc(apdSummaryItems.employeeName));

  const approvalList = await db.select({
    level: apdSummaryApprovals.level,
    approverEmployeeId: apdSummaryApprovals.approverEmployeeId,
    status: apdSummaryApprovals.status,
    signatureUrl: apdSummaryApprovals.signatureUrl,
    reviewedAt: apdSummaryApprovals.reviewedAt,
    approverName: employees.name,
    approverJobTitle: employees.jobTitle,
  }).from(apdSummaryApprovals)
    .innerJoin(employees, eq(apdSummaryApprovals.approverEmployeeId, employees.id))
    .where(eq(apdSummaryApprovals.summaryId, summaryId))
    .orderBy(asc(apdSummaryApprovals.level));

  return {
    ...summary,
    departmentName: department?.name || '',
    items,
    approvals: approvalList,
  };
}
`;
fs.writeFileSync('lib/summary-engine.ts', content.replace(/\r\n/g, '\n'));
console.log('summary-engine.ts rewritten');
