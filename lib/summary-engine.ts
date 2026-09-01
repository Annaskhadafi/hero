import { db } from '@/db';
import { approvals as heroApprovals, apdRequests, apdRequestItems, employees, sites, masterSections, masterDepartments } from '@/db/schema/hero';
import { apdSummaries, apdSummaryItems, apdSummaryApprovals } from '@/db/schema/apd-summary';
import { eq, and, asc, desc, sql, inArray } from 'drizzle-orm';

export const APD_ITEM_COLUMNS = [
  'Helmet', 'Safety Glasses', 'Masker Kain', 'Ear Plug', 'Safety Shoes',
  '3M Cartridge', 'Hand Glove (Kabel)', 'Hand Glove (Knit)', 'Respirator Fullset',
  'Hand Glove (Cotton)', 'Tool Box', 'Neck Guard', 'Head Gear', 'Hard Helmet'
];

// Map any item name from form/DB to canonical summary column name
const ITEM_NAME_MAP: Record<string, string> = {
  // Helmet variants
  'Helmet': 'Helmet', 'Helmet Kuning': 'Helmet', 'Helmet Putih': 'Helmet',
  'Dalaman Helm': 'Helmet', 'Hard Helmet': 'Hard Helmet',
  'Face Shield Helmet': 'Helmet', 'Sunbrim Helmet': 'Helmet',
  // Glasses
  'Safety Glasses': 'Safety Glasses', 'Safety Goggles': 'Safety Glasses',
  'Kacamata': 'Safety Glasses', 'Tali Kacamata': 'Safety Glasses',
  // Masker
  'Masker Kain': 'Masker Kain', 'Masker': 'Masker Kain', 'Masker Respirator': 'Masker Kain',
  // Ear
  'Ear Plug': 'Ear Plug', 'Earplug': 'Ear Plug',
  // Safety Shoes
  'Safety Shoes': 'Safety Shoes', 'Safety Boot Petrova': 'Safety Shoes', 'Sepatu Safety': 'Safety Shoes',
  // Hand Gloves
  'Hand Glove (Kabel)': 'Hand Glove (Kabel)', 'Hand Glove (Cable)': 'Hand Glove (Kabel)',
  'Sarung Tangan Ansel': 'Hand Glove (Kabel)', 'Kaos Tangan Ansel': 'Hand Glove (Kabel)',
  'Hand Glove (Knit)': 'Hand Glove (Knit)', 'Kaos Tangan Dotting': 'Hand Glove (Knit)',
  'Hand Glove (Cotton)': 'Hand Glove (Cotton)',
  // Others
  '3M Cartridge': '3M Cartridge', 'Respirator Fullset': 'Respirator Fullset',
  'Tool Box': 'Tool Box', 'Neck Guard': 'Neck Guard', 'Head Gear': 'Head Gear',
};

/** Normalize any item name to its canonical summary column name. Returns null if unmapped. */
export function mapItemToColumn(itemName: string): string | null {
  if (ITEM_NAME_MAP[itemName]) return ITEM_NAME_MAP[itemName];
  // Try case-insensitive match
  const lower = itemName.toLowerCase();
  for (const [key, val] of Object.entries(ITEM_NAME_MAP)) {
    if (key.toLowerCase() === lower) return val;
  }
  return null; // unmapped items are skipped
}

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
    const counts = await db.select({
      isVale: sql<boolean>`${sites.name} ILIKE '%vale%' OR ${sites.name} = 'VALE'`,
      count: sql<number>`count(*)::int`,
    }).from(apdRequests)
      .innerJoin(employees, eq(apdRequests.employeeId, employees.id))
      .innerJoin(sites, eq(apdRequests.siteId, sites.id))
      .where(and(eq(employees.sectionId, section.id), inArray(apdRequests.status, ['approved', 'proses_order'])))
      .groupBy(sql`${sites.name} ILIKE '%vale%' OR ${sites.name} = 'VALE'`);

    let valeCount = 0;
    let gabunganCount = 0;
    for (const c of counts) {
      if (c.isVale) valeCount += c.count;
      else gabunganCount += c.count;
    }

    const [existingValeSummary] = await db.select({
      id: apdSummaries.id,
      status: apdSummaries.status,
    }).from(apdSummaries)
      .where(and(eq(apdSummaries.sectionId, section.id), eq(apdSummaries.targetSite, 'VALE')))
      .orderBy(desc(apdSummaries.createdAt))
      .limit(1);

    const [existingGabunganSummary] = await db.select({
      id: apdSummaries.id,
      status: apdSummaries.status,
    }).from(apdSummaries)
      .where(and(eq(apdSummaries.sectionId, section.id), eq(apdSummaries.targetSite, 'GABUNGAN')))
      .orderBy(desc(apdSummaries.createdAt))
      .limit(1);

    if (valeCount > 0 || existingValeSummary) {
      results.push({
        ...section,
        targetSite: 'VALE',
        approvedCount: valeCount,
        summaryStatus: existingValeSummary?.status || null,
        summaryId: existingValeSummary?.id || null,
      });
    }
    
    if (gabunganCount > 0 || existingGabunganSummary) {
      results.push({
        ...section,
        targetSite: 'GABUNGAN',
        approvedCount: gabunganCount,
        summaryStatus: existingGabunganSummary?.status || null,
        summaryId: existingGabunganSummary?.id || null,
      });
    }
  }
  return results;
}

export async function generateSummary(sectionId: number, generatedByEmployeeId: number, targetSite: string) {
  const isValeQuery = targetSite === 'VALE' 
    ? sql`${sites.name} ILIKE '%vale%' OR ${sites.name} = 'VALE'`
    : sql`NOT (${sites.name} ILIKE '%vale%' OR ${sites.name} = 'VALE')`;

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
    .where(and(
      eq(employees.sectionId, sectionId), 
      inArray(apdRequests.status, ['approved', 'proses_order']),
      isValeQuery
    ))
    .orderBy(asc(employees.name));

  if (approvedRequests.length === 0) {
    return { error: 'Tidak ada request yang sudah approved untuk section ini' };
  }

  const summaryItems = [];
  for (const req of approvedRequests) {
    const items = await db.select().from(apdRequestItems)
      .where(eq(apdRequestItems.requestId, req.requestId));
    for (const item of items) {
      const canonicalName = mapItemToColumn(item.itemType);
      if (!canonicalName) continue; // skip unmapped items
      summaryItems.push({
        apdRequestId: req.requestId,
        employeeId: req.employeeId,
        employeeName: req.employeeName,
        employeeSn: req.employeeSn,
        siteName: req.siteName,
        itemName: canonicalName,
        quantity: item.quantity,
        requestType: item.requestType,
      });
    }
  }

  const [lastSummary] = await db.select({ summaryNumber: apdSummaries.summaryNumber })
    .from(apdSummaries).orderBy(desc(apdSummaries.id)).limit(1);
  const nextNumber = lastSummary ? parseInt(lastSummary.summaryNumber.replace('SUM-', '')) + 1 : 1;
  const summaryNumber = `SUM-${String(nextNumber).padStart(3, '0')}`;

  const [summary] = await db.insert(apdSummaries).values({
    summaryNumber, sectionId, targetSite, status: 'draft', generatedByEmployeeId,
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

  console.log('[summary-engine] submitSummary', { summaryId, sigLen: signatureUrl?.length });
  await db.update(apdSummaries)
    .set({ status: 'pending', submitterSignatureUrl: signatureUrl, generatedAt: new Date() })
    .where(eq(apdSummaries.id, summaryId));

  // Get employee info for approvers
  const headEmp = summary.headEmployeeId ? await db.select({ id: employees.id, name: employees.name }).from(employees).where(eq(employees.id, summary.headEmployeeId)).limit(1) : [];
  const deptHeadEmp = department?.headEmployeeId ? await db.select({ id: employees.id, name: employees.name }).from(employees).where(eq(employees.id, department.headEmployeeId)).limit(1) : [];

  if (summary.headEmployeeId) {
    await db.insert(apdSummaryApprovals).values({
      summaryId, level: 1, approverEmployeeId: summary.headEmployeeId, status: 'pending',
    });
    // Also create entry in hero_approvals for Approval Inbox
    await db.insert(heroApprovals).values({
      apdSummaryId: summaryId,
      level: 1,
      approverName: headEmp[0]?.name || '',
      approverEmployeeId: summary.headEmployeeId,
      status: 'pending',
      submittedAt: new Date(),
    });
  }
  if (department?.headEmployeeId) {
    await db.insert(apdSummaryApprovals).values({
      summaryId, level: 2, approverEmployeeId: department.headEmployeeId, status: 'pending',
    });
    // Also create entry in hero_approvals for Approval Inbox
    await db.insert(heroApprovals).values({
      apdSummaryId: summaryId,
      level: 2,
      approverName: deptHeadEmp[0]?.name || '',
      approverEmployeeId: department.headEmployeeId,
      status: 'pending',
      submittedAt: new Date(),
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

  // Also update hero_approvals (approval inbox)
  await db.update(heroApprovals)
    .set({ status: 'approved', signatureUrl, decisionNote: decisionNote || '', reviewedAt: new Date() })
    .where(and(eq(heroApprovals.apdSummaryId, summaryId), eq(heroApprovals.level, level)));

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
    targetSite: apdSummaries.targetSite,
    status: apdSummaries.status,
    generatedAt: apdSummaries.generatedAt,
    approvedAt: apdSummaries.approvedAt,
    generatedByEmployeeId: apdSummaries.generatedByEmployeeId,
    submitterSignatureUrl: apdSummaries.submitterSignatureUrl,
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
    decisionNote: apdSummaryApprovals.decisionNote,
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
