import { db } from '@/db';
import { approvals as heroApprovals, apdRequests, apdRequestItems, employees, sites, masterSections, masterDepartments, approvalMatrices, approvalMatrixSteps, orgChartNodes, employeeAssets } from '@/db/schema/hero';
import { apdSummaries, apdSummaryItems, apdSummaryApprovals } from '@/db/schema/apd-summary';
import { eq, and, asc, desc, sql, inArray, ilike } from 'drizzle-orm';
import { sendWorkflowEmail, getAppUrl } from '@/lib/workflow-email';
import { createNotificationEventForEmployee } from '@/lib/push-notifications';
import { sendSummaryPendingApprovalEmail } from '@/lib/summary-email';
import { resolveHseSafetyRecipients, parseEmailList } from '@/lib/hse-safety-email';
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center';
import { getApdSummaryNotificationConfigData } from '@/lib/hero-admin';
import {
  SAFETY_SHOES_COL,
  QTY_ONLY_COLUMNS,
  APD_ITEM_COLUMNS,
  APD_COLUMNS,
  type PendingSummaryRequestItem,
  type PendingSummaryRequest,
} from '@/lib/summary-constants';

export {
  SAFETY_SHOES_COL,
  QTY_ONLY_COLUMNS,
  APD_ITEM_COLUMNS,
  APD_COLUMNS,
  type PendingSummaryRequestItem,
  type PendingSummaryRequest,
};

let summarySchemaChecked = false;
export async function ensureSummarySchema() {
  if (summarySchemaChecked) return;
  try {
    await db.execute(sql`
      ALTER TABLE hero_apd_summary_items
      ADD COLUMN IF NOT EXISTS remarks text NOT NULL DEFAULT ''
    `);
    summarySchemaChecked = true;
  } catch (err) {
    console.warn('[summary-engine] ensureSummarySchema warning:', err);
  }
}

// Map any item name from form/DB to canonical summary column name
const ITEM_NAME_MAP: Record<string, string> = {
  // Helmet variants
  'Helmet': 'Helmet Kuning',
  'Helmet Kuning': 'Helmet Kuning',
  'Helmet Putih': 'Helmet Putih',
  'Hard Helmet': 'Helmet Putih',
  'Dalaman Helm': 'Dalaman Helm',
  'Face Shield Helmet': 'Face Shield Helmet',
  'Sunbrim Helmet': 'Sunbrim Helmet',
  'Chin Strap': 'Chin Strap',
  // Glasses & Goggles
  'Safety Glasses': 'Safety Glasses',
  'Safety Goggles': 'Safety Goggles',
  'Kacamata': 'Safety Glasses',
  'Tali Kacamata': 'Tali Kacamata',
  // Masker & Respiration
  'Masker': 'Masker',
  'Masker Kain': 'Masker',
  'Masker Respirator': 'Masker',
  'Respirator Fullset': 'Masker',
  '3M Cartridge': 'Masker',
  // Ear protection
  'Ear Plug': 'Ear Plug',
  'Earplug': 'Ear Plug',
  // Gloves
  'Sarung Tangan Ansel': 'Sarung Tangan Ansel',
  'Kaos Tangan Ansel': 'Sarung Tangan Ansel',
  'Hand Glove (Kabel)': 'Sarung Tangan Ansel',
  'Hand Glove (Cable)': 'Sarung Tangan Ansel',
  'Kaos Tangan Dotting': 'Kaos Tangan Dotting',
  'Hand Glove (Knit)': 'Kaos Tangan Dotting',
  'Hand Glove (Cotton)': 'Kaos Tangan Dotting',
  // Lockout / Tagout & Tools
  'Padlock Merah': 'Padlock Merah',
  'Padlock Kuning': 'Padlock Kuning',
  'Sisor': 'Sisor',
  'Tool Box': 'Sisor',
  // Body protection
  'Apron': 'Apron',
  'Neck Guard': 'Sunbrim Helmet',
  'Head Gear': 'Dalaman Helm',
  // Shoes & Boots
  'Safety Shoes': 'Safety Shoes',
  'Sepatu Safety': 'Safety Shoes',
  'Safety Boot Petrova': 'Safety Boot Petrova',
};

/** Normalize any item name to its canonical summary column name. Returns null if unmapped. */
export function mapItemToColumn(itemName: string): string | null {
  if (APD_ITEM_COLUMNS.includes(itemName)) return itemName;
  if (ITEM_NAME_MAP[itemName]) return ITEM_NAME_MAP[itemName];
  // Try case-insensitive match
  const lower = itemName.trim().toLowerCase();
  for (const col of APD_ITEM_COLUMNS) {
    if (col.toLowerCase() === lower) return col;
  }
  for (const [key, val] of Object.entries(ITEM_NAME_MAP)) {
    if (key.toLowerCase() === lower) return val;
  }
  return itemName;
}

export async function getSectionsWithApprovedRequests() {
  await ensureSummarySchema();

  const sections = await db.select({
    id: masterSections.id,
    name: masterSections.name,
    code: masterSections.code,
    departmentId: masterSections.departmentId,
    headEmployeeId: masterSections.headEmployeeId,
  }).from(masterSections)
    .where(eq(masterSections.isActive, true))
    .orderBy(asc(masterSections.name));

  // Service Operation sections (e.g. Service Operation MVC [id 33] & Service Operation Others [id 34])
  const serviceSectionIds = [33, 34];
  const serviceSections = sections.filter(s => serviceSectionIds.includes(s.id) || s.name.toLowerCase().includes('service operation'));
  const actualServiceIds = serviceSections.length > 0 ? serviceSections.map(s => s.id) : [33, 34];

  const processedSectionIds = new Set<number>();
  const results = [];

  for (const section of sections) {
    if (actualServiceIds.includes(section.id)) {
      if (processedSectionIds.has(actualServiceIds[0])) continue; // only process once as combined
      actualServiceIds.forEach(id => processedSectionIds.add(id));

      // Combined query for all service sections
      for (const targetSite of ['GABUNGAN', 'VALE'] as const) {
        const isVale = targetSite === 'VALE';
        const isValeCondition = isVale
          ? sql`(${sites.name} ILIKE '%vale%' OR ${sites.name} = 'VALE')`
          : sql`NOT (${sites.name} ILIKE '%vale%' OR ${sites.name} = 'VALE')`;

        const [countRow] = await db.select({
          count: sql<number>`count(*)::int`,
        }).from(apdRequests)
          .innerJoin(employees, eq(apdRequests.employeeId, employees.id))
          .innerJoin(sites, eq(apdRequests.siteId, sites.id))
          .where(and(
            inArray(employees.sectionId, actualServiceIds),
            inArray(apdRequests.status, ['approved', 'proses_order', 'complete', 'completed']),
            sql`(${apdRequests.requestCategory} IS NULL OR ${apdRequests.requestCategory} = 'APD' OR UPPER(${apdRequests.requestCategory}) = 'APD')`,
            sql`(${apdRequests.requestCategory} IS NULL OR UPPER(${apdRequests.requestCategory}) NOT IN ('TOOLS', 'MATERIAL'))`,
            isValeCondition
          ));

        const approvedCount = countRow?.count || 0;

        const [existingSummary] = await db.select({
          id: apdSummaries.id,
          status: apdSummaries.status,
          createdAt: apdSummaries.createdAt,
          updatedAt: apdSummaries.updatedAt,
        }).from(apdSummaries)
          .where(and(
            inArray(apdSummaries.sectionId, actualServiceIds),
            eq(apdSummaries.targetSite, targetSite)
          ))
          .orderBy(desc(apdSummaries.createdAt))
          .limit(1);

        if (approvedCount > 0 || existingSummary) {
          results.push({
            id: 33, // Primary section ID for Service Operation
            name: 'Service Operation',
            code: 'SRV-OPS',
            departmentId: section.departmentId || 2,
            headEmployeeId: section.headEmployeeId,
            targetSite,
            approvedCount,
            summaryStatus: existingSummary?.status || null,
            summaryId: existingSummary?.id || null,
            latestActivityAt: existingSummary?.updatedAt || existingSummary?.createdAt || null,
          });
        }
      }
      continue;
    }

    if (processedSectionIds.has(section.id)) continue;
    processedSectionIds.add(section.id);

    const counts = await db.select({
      isVale: sql<boolean>`${sites.name} ILIKE '%vale%' OR ${sites.name} = 'VALE'`,
      count: sql<number>`count(*)::int`,
    }).from(apdRequests)
      .innerJoin(employees, eq(apdRequests.employeeId, employees.id))
      .innerJoin(sites, eq(apdRequests.siteId, sites.id))
      .where(and(
        eq(employees.sectionId, section.id),
        inArray(apdRequests.status, ['approved', 'proses_order', 'complete', 'completed']),
        sql`(${apdRequests.requestCategory} IS NULL OR ${apdRequests.requestCategory} = 'APD' OR UPPER(${apdRequests.requestCategory}) = 'APD')`,
        sql`(${apdRequests.requestCategory} IS NULL OR UPPER(${apdRequests.requestCategory}) NOT IN ('TOOLS', 'MATERIAL'))`
      ))
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
      createdAt: apdSummaries.createdAt,
      updatedAt: apdSummaries.updatedAt,
    }).from(apdSummaries)
      .where(and(eq(apdSummaries.sectionId, section.id), eq(apdSummaries.targetSite, 'VALE')))
      .orderBy(desc(apdSummaries.createdAt))
      .limit(1);

    const [existingGabunganSummary] = await db.select({
      id: apdSummaries.id,
      status: apdSummaries.status,
      createdAt: apdSummaries.createdAt,
      updatedAt: apdSummaries.updatedAt,
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
        latestActivityAt: existingValeSummary?.updatedAt || existingValeSummary?.createdAt || null,
      });
    }
    
    if (gabunganCount > 0 || existingGabunganSummary) {
      results.push({
        ...section,
        targetSite: 'GABUNGAN',
        approvedCount: gabunganCount,
        summaryStatus: existingGabunganSummary?.status || null,
        summaryId: existingGabunganSummary?.id || null,
        latestActivityAt: existingGabunganSummary?.updatedAt || existingGabunganSummary?.createdAt || null,
      });
    }
  }

  // Sort: Newest summary activity (or highest summaryId) at the top, then sections with uncreated approved requests
  return results.sort((a, b) => {
    const aTime = a.latestActivityAt ? new Date(a.latestActivityAt).getTime() : 0;
    const bTime = b.latestActivityAt ? new Date(b.latestActivityAt).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    const aSumId = a.summaryId || 0;
    const bSumId = b.summaryId || 0;
    if (bSumId !== aSumId) return bSumId - aSumId;
    return b.approvedCount - a.approvedCount;
  });
}

export async function getPendingRequestsForSection(sectionId: number, targetSite: string): Promise<PendingSummaryRequest[]> {
  await ensureSummarySchema();

  const isValeQuery = targetSite === 'VALE' 
    ? sql`${sites.name} ILIKE '%vale%' OR ${sites.name} = 'VALE'`
    : sql`NOT (${sites.name} ILIKE '%vale%' OR ${sites.name} = 'VALE')`;

  // Check if this is Service Operation (sections 33/34)
  const isServiceCombined = sectionId === 33 || sectionId === 34;
  const sectionFilter = isServiceCombined
    ? inArray(employees.sectionId, [33, 34])
    : eq(employees.sectionId, sectionId);

  // Get active summary items to avoid duplicates
  const activeSummaryRows = await db.select({
    apdRequestId: apdSummaryItems.apdRequestId,
  }).from(apdSummaryItems)
    .innerJoin(apdSummaries, eq(apdSummaryItems.summaryId, apdSummaries.id))
    .where(inArray(apdSummaries.status, ['draft', 'pending', 'approved']));

  const assignedRequestIds = new Set(activeSummaryRows.map(r => r.apdRequestId).filter(Boolean));

  const approvedRequests = await db.select({
    requestId: apdRequests.id,
    requestNumber: apdRequests.requestNumber,
    requestDate: apdRequests.requestDate,
    notes: apdRequests.notes,
    employeeId: employees.id,
    employeeName: employees.name,
    employeeSn: employees.employeeSn,
    siteId: sites.id,
    siteName: sites.name,
    departmentName: masterDepartments.name,
  }).from(apdRequests)
    .innerJoin(employees, eq(apdRequests.employeeId, employees.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .innerJoin(sites, eq(apdRequests.siteId, sites.id))
    .where(and(
      sectionFilter,
      inArray(apdRequests.status, ['approved', 'proses_order', 'complete', 'completed']),
      sql`(${apdRequests.requestCategory} IS NULL OR ${apdRequests.requestCategory} = 'APD' OR UPPER(${apdRequests.requestCategory}) = 'APD')`,
      sql`(${apdRequests.requestCategory} IS NULL OR UPPER(${apdRequests.requestCategory}) NOT IN ('TOOLS', 'MATERIAL'))`,
      isValeQuery
    ))
    .orderBy(asc(employees.name));

  const results: PendingSummaryRequest[] = [];

  for (const req of approvedRequests) {
    if (assignedRequestIds.has(req.requestId)) {
      continue; // Skip requests already in an active summary
    }

    const items = await db.select().from(apdRequestItems)
      .where(eq(apdRequestItems.requestId, req.requestId));

    const mappedItems: PendingSummaryRequestItem[] = [];
    let hasSafetyShoes = false;
    let shoesRequestType = 'baru';

    for (const item of items) {
      const canonical = mapItemToColumn(item.itemType) || item.itemType;
      mappedItems.push({
        id: item.id,
        itemType: item.itemType,
        canonicalName: canonical,
        requestType: item.requestType,
        quantity: item.quantity,
        notes: item.notes || '',
      });
      if (canonical === SAFETY_SHOES_COL || item.itemType.toLowerCase().includes('sepatu') || item.itemType.toLowerCase().includes('shoes')) {
        hasSafetyShoes = true;
        shoesRequestType = item.requestType;
      }
    }

    let shoeSize = '';

    if (hasSafetyShoes) {
      const [asset] = await db.select({
        size: employeeAssets.size,
        assignedAt: employeeAssets.assignedAt,
      }).from(employeeAssets)
        .where(and(
          eq(employeeAssets.employeeId, req.employeeId),
          ilike(employeeAssets.itemName, '%sepatu%')
        ))
        .orderBy(desc(employeeAssets.assignedAt))
        .limit(1);

      if (asset?.size) {
        shoeSize = asset.size;
      }
    }

    results.push({
      requestId: req.requestId,
      requestNumber: req.requestNumber,
      requestDate: req.requestDate,
      employeeId: req.employeeId,
      employeeName: req.employeeName,
      employeeSn: req.employeeSn,
      siteId: req.siteId,
      siteName: req.siteName,
      departmentName: req.departmentName,
      items: mappedItems,
      safetyShoesSize: shoeSize,
      suggestedRemarks: req.notes || '',
    });
  }

  return results;
}

export type GenerateSummaryOptions = {
  selectedRequests?: Array<{
    requestId: number;
    remarks?: string;
    safetyShoesSize?: string;
  }>;
  defaultRemarks?: string;
};

export async function generateSummary(
  sectionId: number,
  generatedByEmployeeId: number,
  targetSite: string,
  options?: GenerateSummaryOptions
) {
  await ensureSummarySchema();

  const isValeQuery = targetSite === 'VALE' 
    ? sql`${sites.name} ILIKE '%vale%' OR ${sites.name} = 'VALE'`
    : sql`NOT (${sites.name} ILIKE '%vale%' OR ${sites.name} = 'VALE')`;

  const isServiceCombined = sectionId === 33 || sectionId === 34;
  const sectionFilter = isServiceCombined
    ? inArray(employees.sectionId, [33, 34])
    : eq(employees.sectionId, sectionId);

  let approvedRequests = await db.select({
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
      sectionFilter, 
      inArray(apdRequests.status, ['approved', 'proses_order', 'complete', 'completed']),
      sql`(${apdRequests.requestCategory} IS NULL OR ${apdRequests.requestCategory} = 'APD' OR UPPER(${apdRequests.requestCategory}) = 'APD')`,
      sql`(${apdRequests.requestCategory} IS NULL OR UPPER(${apdRequests.requestCategory}) NOT IN ('TOOLS', 'MATERIAL'))`,
      isValeQuery
    ))
    .orderBy(asc(employees.name));

  if (options?.selectedRequests && options.selectedRequests.length > 0) {
    const selectedIds = new Set(options.selectedRequests.map(r => r.requestId));
    approvedRequests = approvedRequests.filter(r => selectedIds.has(r.requestId));
  }

  if (approvedRequests.length === 0) {
    return { error: 'Tidak ada pengajuan yang dipilih atau berstatus approved untuk section ini' };
  }

  const requestOptionsMap = new Map(
    (options?.selectedRequests || []).map(r => [r.requestId, r])
  );

  const summaryItems: Array<{
    apdRequestId: number;
    employeeId: number;
    employeeName: string;
    employeeSn: string;
    siteName: string;
    itemName: string;
    quantity: number;
    requestType: string;
    remarks: string;
  }> = [];

  for (const req of approvedRequests) {
    const customOpt = requestOptionsMap.get(req.requestId);
    const employeeRemarks = customOpt?.remarks?.trim() || options?.defaultRemarks?.trim() || '';

    const items = await db.select().from(apdRequestItems)
      .where(eq(apdRequestItems.requestId, req.requestId));

    let employeeHasSafetyShoes = false;
    let shoesReqType = 'baru';

    for (const item of items) {
      const canonicalName = mapItemToColumn(item.itemType) || item.itemType;
      if (canonicalName === SAFETY_SHOES_COL || item.itemType.toLowerCase().includes('sepatu')) {
        employeeHasSafetyShoes = true;
        shoesReqType = item.requestType;
      }
      summaryItems.push({
        apdRequestId: req.requestId,
        employeeId: req.employeeId,
        employeeName: req.employeeName,
        employeeSn: req.employeeSn,
        siteName: req.siteName,
        itemName: canonicalName,
        quantity: item.quantity,
        requestType: item.requestType,
        remarks: employeeRemarks,
      });
    }

    // If safety shoes requested, record Safety Shoes Size
    if (employeeHasSafetyShoes) {
      let shoeSize = customOpt?.safetyShoesSize?.trim() || '';

      if (!shoeSize) {
        const [asset] = await db.select({ size: employeeAssets.size }).from(employeeAssets)
          .where(and(
            eq(employeeAssets.employeeId, req.employeeId),
            ilike(employeeAssets.itemName, '%sepatu%')
          )).limit(1);
        if (asset?.size) shoeSize = asset.size;
      }

      if (shoeSize) {
        summaryItems.push({
          apdRequestId: req.requestId,
          employeeId: req.employeeId,
          employeeName: req.employeeName,
          employeeSn: req.employeeSn,
          siteName: req.siteName,
          itemName: 'Safety Shoes Size',
          quantity: 0,
          requestType: shoeSize,
          remarks: employeeRemarks || shoeSize,
        });
      }
    }
  }

  const [lastSummary] = await db.select({ summaryNumber: apdSummaries.summaryNumber })
    .from(apdSummaries).orderBy(desc(apdSummaries.id)).limit(1);
  const nextNumber = lastSummary ? parseInt(lastSummary.summaryNumber.replace('SUM-', '')) + 1 : 1;
  const summaryNumber = `SUM-${String(nextNumber).padStart(3, '0')}`;

  const savedSectionId = isServiceCombined ? 33 : sectionId;

  const [summary] = await db.insert(apdSummaries).values({
    summaryNumber, sectionId: savedSectionId, targetSite, status: 'draft', generatedByEmployeeId,
  }).returning();

  for (const item of summaryItems) {
    await db.insert(apdSummaryItems).values({ summaryId: summary.id, ...item });
  }

  return { summaryId: summary.id, summaryNumber, itemCount: summaryItems.length };
}

/**
 * Automatically sync a newly approved APD request into a draft summary.
 * If an active summary draft exists for the section and target site, items are appended.
 * If no summary draft exists, a new draft summary is created automatically.
 * Idempotent: avoids duplicate insertion if request is already in a summary.
 */
export async function syncApprovedApdRequestToSummary(apdRequestId: number) {
  await ensureSummarySchema();

  // 1. Fetch APD Request details
  const [req] = await db.select({
    requestId: apdRequests.id,
    requestNumber: apdRequests.requestNumber,
    requestCategory: apdRequests.requestCategory,
    notes: apdRequests.notes,
    employeeId: employees.id,
    employeeName: employees.name,
    employeeSn: employees.employeeSn,
    sectionId: employees.sectionId,
    siteId: sites.id,
    siteName: sites.name,
  }).from(apdRequests)
    .innerJoin(employees, eq(apdRequests.employeeId, employees.id))
    .innerJoin(sites, eq(apdRequests.siteId, sites.id))
    .where(eq(apdRequests.id, apdRequestId))
    .limit(1);

  if (!req) return { skipped: true, reason: 'Request not found' };

  // Only APD requests (exclude TOOLS, MATERIAL)
  const category = (req.requestCategory || 'APD').toUpperCase();
  if (category === 'TOOLS' || category === 'MATERIAL') {
    return { skipped: true, reason: 'Not an APD request' };
  }

  // 2. Check if already in an active summary (draft, pending, approved)
  const [existingItem] = await db.select({ id: apdSummaryItems.id })
    .from(apdSummaryItems)
    .innerJoin(apdSummaries, eq(apdSummaryItems.summaryId, apdSummaries.id))
    .where(and(
      eq(apdSummaryItems.apdRequestId, apdRequestId),
      inArray(apdSummaries.status, ['draft', 'pending', 'approved'])
    ))
    .limit(1);

  if (existingItem) {
    return { skipped: true, reason: 'Already present in a summary' };
  }

  // 3. Determine targetSite & canonical sectionId
  const isVale = req.siteName.toLowerCase().includes('vale') || req.siteName.toUpperCase() === 'VALE';
  const targetSite = isVale ? 'VALE' : 'GABUNGAN';
  const isServiceCombined = req.sectionId === 33 || req.sectionId === 34;
  const sectionId = isServiceCombined ? 33 : (req.sectionId || 33);

  // 4. Fetch request items
  const items = await db.select().from(apdRequestItems)
    .where(eq(apdRequestItems.requestId, apdRequestId));

  if (items.length === 0) {
    return { skipped: true, reason: 'No items in request' };
  }

  let hasSafetyShoes = false;
  const summaryRows: Array<{
    apdRequestId: number;
    employeeId: number;
    employeeName: string;
    employeeSn: string;
    siteName: string;
    itemName: string;
    quantity: number;
    requestType: string;
    remarks: string;
  }> = [];

  for (const item of items) {
    const canonicalName = mapItemToColumn(item.itemType) || item.itemType;
    if (canonicalName === SAFETY_SHOES_COL || item.itemType.toLowerCase().includes('sepatu') || item.itemType.toLowerCase().includes('shoes')) {
      hasSafetyShoes = true;
    }
    summaryRows.push({
      apdRequestId: req.requestId,
      employeeId: req.employeeId,
      employeeName: req.employeeName,
      employeeSn: req.employeeSn,
      siteName: req.siteName,
      itemName: canonicalName,
      quantity: item.quantity,
      requestType: item.requestType,
      remarks: req.notes || '',
    });
  }

  // Handle Safety Shoes Size
  if (hasSafetyShoes) {
    let shoeSize = '';
    const [asset] = await db.select({ size: employeeAssets.size }).from(employeeAssets)
      .where(and(
        eq(employeeAssets.employeeId, req.employeeId),
        ilike(employeeAssets.itemName, '%sepatu%')
      ))
      .orderBy(desc(employeeAssets.assignedAt))
      .limit(1);

    if (asset?.size) {
      shoeSize = asset.size;
    }

    if (shoeSize) {
      summaryRows.push({
        apdRequestId: req.requestId,
        employeeId: req.employeeId,
        employeeName: req.employeeName,
        employeeSn: req.employeeSn,
        siteName: req.siteName,
        itemName: 'Safety Shoes Size',
        quantity: 0,
        requestType: shoeSize,
        remarks: req.notes || shoeSize,
      });
    }
  }

  // 5. Check if there is an existing 'draft' summary for this section & targetSite
  const serviceSectionIds = [33, 34];
  const sectionCondition = isServiceCombined
    ? inArray(apdSummaries.sectionId, serviceSectionIds)
    : eq(apdSummaries.sectionId, sectionId);

  const [existingDraft] = await db.select({
    id: apdSummaries.id,
    summaryNumber: apdSummaries.summaryNumber,
  }).from(apdSummaries)
    .where(and(
      sectionCondition,
      eq(apdSummaries.targetSite, targetSite),
      eq(apdSummaries.status, 'draft')
    ))
    .orderBy(desc(apdSummaries.id))
    .limit(1);

  let targetSummaryId = existingDraft?.id;

  if (targetSummaryId) {
    // Append items to existing draft
    for (const item of summaryRows) {
      await db.insert(apdSummaryItems).values({
        summaryId: targetSummaryId,
        ...item,
      });
    }
    await db.update(apdSummaries).set({ updatedAt: new Date() }).where(eq(apdSummaries.id, targetSummaryId));
  } else {
    // Create new Draft summary
    const [lastSummary] = await db.select({ summaryNumber: apdSummaries.summaryNumber })
      .from(apdSummaries).orderBy(desc(apdSummaries.id)).limit(1);
    const nextNumber = lastSummary ? parseInt(lastSummary.summaryNumber.replace('SUM-', '')) + 1 : 1;
    const summaryNumber = `SUM-${String(nextNumber).padStart(3, '0')}`;

    const [newSummary] = await db.insert(apdSummaries).values({
      summaryNumber,
      sectionId,
      targetSite,
      status: 'draft',
      generatedByEmployeeId: req.employeeId,
    }).returning();

    targetSummaryId = newSummary.id;

    for (const item of summaryRows) {
      await db.insert(apdSummaryItems).values({
        summaryId: targetSummaryId,
        ...item,
      });
    }
  }

  return { success: true, summaryId: targetSummaryId, itemsAdded: summaryRows.length };
}

/**
 * Backfills all approved APD requests that are not yet associated with any summary.
 */
export async function backfillApprovedRequestsToSummaries() {
  await ensureSummarySchema();

  const approvedReqs = await db.select({
    id: apdRequests.id,
  }).from(apdRequests)
    .where(and(
      inArray(apdRequests.status, ['approved', 'proses_order', 'complete', 'completed']),
      sql`(${apdRequests.requestCategory} IS NULL OR ${apdRequests.requestCategory} = 'APD' OR UPPER(${apdRequests.requestCategory}) = 'APD')`,
      sql`(${apdRequests.requestCategory} IS NULL OR UPPER(${apdRequests.requestCategory}) NOT IN ('TOOLS', 'MATERIAL'))`
    ))
    .orderBy(asc(apdRequests.id));

  let syncedCount = 0;
  for (const req of approvedReqs) {
    const res = await syncApprovedApdRequestToSummary(req.id);
    if (res?.success) {
      syncedCount++;
    }
  }

  return { success: true, totalChecked: approvedReqs.length, syncedCount };
}

export async function deleteSummaryDraft(summaryId: number) {
  const [summary] = await db.select({
    id: apdSummaries.id,
    status: apdSummaries.status,
  }).from(apdSummaries).where(eq(apdSummaries.id, summaryId)).limit(1);

  if (!summary) return { error: 'Summary tidak ditemukan' };
  if (summary.status !== 'draft' && summary.status !== 'pending' && summary.status !== 'pending_approval') {
    return { error: 'Hanya summary berstatus Draft atau Pending yang dapat dihapus' };
  }

  await db.delete(apdSummaryItems).where(eq(apdSummaryItems.summaryId, summaryId));
  await db.delete(apdSummaryApprovals).where(eq(apdSummaryApprovals.summaryId, summaryId));
  await db.delete(heroApprovals).where(eq(heroApprovals.apdSummaryId, summaryId));
  await db.delete(apdSummaries).where(eq(apdSummaries.id, summaryId));

  return { success: true };
}

export async function resolveSummaryApprovers(sectionId: number) {
  const [targetSection] = await db.select({
    id: masterSections.id,
    name: masterSections.name,
    headEmployeeId: masterSections.headEmployeeId,
    departmentId: masterSections.departmentId,
  }).from(masterSections).where(eq(masterSections.id, sectionId)).limit(1);

  const isServiceCombined =
    sectionId === 33 ||
    sectionId === 34 ||
    (targetSection?.name && targetSection.name.toLowerCase().includes('service operation'));

  let level1Approvers: Array<{ id: number; name: string; email: string; jobTitle: string; sectionName: string }> = [];
  let level2Approver: { id: number; name: string; email: string; jobTitle: string; departmentName: string } | null = null;

  if (isServiceCombined) {
    // Single source of truth for Service Operation:
    // Level 1: ALWAYS TWO PARALLEL APPROVERS (Head Section MVC & Head Section Others)
    const [sec33] = await db.select({
      headEmployeeId: masterSections.headEmployeeId,
      name: masterSections.name,
    }).from(masterSections).where(eq(masterSections.id, 33)).limit(1);

    const [sec34] = await db.select({
      headEmployeeId: masterSections.headEmployeeId,
      name: masterSections.name,
    }).from(masterSections).where(eq(masterSections.id, 34)).limit(1);

    const [dept2] = await db.select({
      headEmployeeId: masterDepartments.headEmployeeId,
      name: masterDepartments.name,
    }).from(masterDepartments).where(eq(masterDepartments.id, 2)).limit(1);

    // 1. Head Section MVC (Apriyanto)
    const head33Id = sec33?.headEmployeeId || 955;
    const [emp33] = await db.select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      jobTitle: employees.jobTitle,
    }).from(employees).where(eq(employees.id, head33Id)).limit(1);

    if (emp33) {
      level1Approvers.push({
        ...emp33,
        email: emp33.email || '',
        jobTitle: 'Section Head Service MVC',
        sectionName: 'Service Operation MVC',
      });
    }

    // 2. Head Section Others (Junaidi)
    const head34Id = sec34?.headEmployeeId || 15;
    const [emp34] = await db.select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      jobTitle: employees.jobTitle,
    }).from(employees).where(eq(employees.id, head34Id)).limit(1);

    if (emp34) {
      level1Approvers.push({
        ...emp34,
        email: emp34.email || '',
        jobTitle: 'Section Head Service Others',
        sectionName: 'Service Operation Others',
      });
    }

    // 3. Dept Head Central Services (Romy Hidayat)
    const deptHeadId = dept2?.headEmployeeId || 972;
    const [empDept] = await db.select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      jobTitle: employees.jobTitle,
    }).from(employees).where(eq(employees.id, deptHeadId)).limit(1);

    if (empDept) {
      level2Approver = {
        ...empDept,
        email: empDept.email || '',
        jobTitle: empDept.jobTitle || 'Department Head',
        departmentName: dept2?.name || 'Central Services',
      };
    }
  } else {
    // For other sections: check active matrix in Workflow Studio
    const matrices = await db.select({
      id: approvalMatrices.id,
      sectionId: approvalMatrices.sectionId,
    }).from(approvalMatrices)
      .where(and(
        eq(approvalMatrices.isActive, true),
        eq(approvalMatrices.transactionType, 'apd-summary')
      ));

    const matchedMatrix = matrices.find((m) => m.sectionId === sectionId) || matrices.find((m) => !m.sectionId || m.sectionId === 0);

    if (matchedMatrix) {
      const steps = await db.select({
        stepOrder: approvalMatrixSteps.stepOrder,
        label: approvalMatrixSteps.label,
        employeeId: orgChartNodes.employeeId,
        employeeName: employees.name,
        employeeEmail: employees.email,
        jobTitle: employees.jobTitle,
      }).from(approvalMatrixSteps)
        .innerJoin(orgChartNodes, eq(approvalMatrixSteps.nodeId, orgChartNodes.id))
        .innerJoin(employees, eq(orgChartNodes.employeeId, employees.id))
        .where(eq(approvalMatrixSteps.matrixId, matchedMatrix.id))
        .orderBy(asc(approvalMatrixSteps.stepOrder), asc(approvalMatrixSteps.id));

      const s1 = steps.filter((s) => s.stepOrder === 1 && s.employeeId);
      const s2 = steps.filter((s) => s.stepOrder === 2 && s.employeeId);

      if (s1.length > 0) {
        level1Approvers = s1.map((s) => ({
          id: s.employeeId!,
          name: s.employeeName,
          email: s.employeeEmail || '',
          jobTitle: s.jobTitle || s.label,
          sectionName: s.label,
        }));
      }

      if (s2.length > 0) {
        const s2Item = s2[0];
        level2Approver = {
          id: s2Item.employeeId!,
          name: s2Item.employeeName,
          email: s2Item.employeeEmail || '',
          jobTitle: s2Item.jobTitle || s2Item.label,
          departmentName: 'Central Services',
        };
      }
    }

    // Fallback if matrix was not configured:
    if (level1Approvers.length === 0 || !level2Approver) {
      const sec = targetSection;
      const [dept] = sec?.departmentId
        ? await db.select({
            headEmployeeId: masterDepartments.headEmployeeId,
            name: masterDepartments.name,
          }).from(masterDepartments).where(eq(masterDepartments.id, sec.departmentId)).limit(1)
        : [null];

      if (level1Approvers.length === 0 && sec?.headEmployeeId) {
        const [emp] = await db.select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
          jobTitle: employees.jobTitle,
        }).from(employees).where(eq(employees.id, sec.headEmployeeId)).limit(1);
        if (emp) {
          level1Approvers.push({
            ...emp,
            email: emp.email || '',
            jobTitle: emp.jobTitle || 'Section Head',
            sectionName: sec.name,
          });
        }
      }

      if (!level2Approver && dept?.headEmployeeId) {
        const [emp] = await db.select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
          jobTitle: employees.jobTitle,
        }).from(employees).where(eq(employees.id, dept.headEmployeeId)).limit(1);
        if (emp) {
          level2Approver = {
            ...emp,
            email: emp.email || '',
            jobTitle: emp.jobTitle || 'Department Head',
            departmentName: dept.name,
          };
        }
      }
    }
  }

  return { level1Approvers, level2Approver };
}

export async function submitSummary(summaryId: number, signatureUrl: string) {
  const [summary] = await db.select().from(apdSummaries).where(eq(apdSummaries.id, summaryId));
  if (!summary) return { error: 'Summary tidak ditemukan' };

  console.log('[summary-engine] submitSummary', { summaryId, sigLen: signatureUrl?.length });
  
  // 1. Update summary header with submitter signature and timestamp
  await db.update(apdSummaries)
    .set({ status: 'pending', submitterSignatureUrl: signatureUrl, generatedAt: new Date() })
    .where(eq(apdSummaries.id, summaryId));

  // 2. Clean existing approval rows if any to prevent stale records
  await db.delete(apdSummaryApprovals).where(eq(apdSummaryApprovals.summaryId, summaryId));
  await db.delete(heroApprovals).where(eq(heroApprovals.apdSummaryId, summaryId));

  const { level1Approvers, level2Approver } = await resolveSummaryApprovers(summary.sectionId);

  // 3. Insert Level 1 approver rows into apdSummaryApprovals & heroApprovals
  for (const approver of level1Approvers) {
    await db.insert(apdSummaryApprovals).values({
      summaryId,
      level: 1,
      approverEmployeeId: approver.id,
      status: 'pending',
    });

    // Create entry in hero_approvals for Unified Approval Inbox
    await db.insert(heroApprovals).values({
      apdSummaryId: summaryId,
      level: 1,
      approverName: approver.name,
      approverEmployeeId: approver.id,
      status: 'pending',
      submittedAt: new Date(),
    });
  }

  // 4. Insert Level 2 approver row into apdSummaryApprovals (queued, heroApprovals entry created when Level 1 completes)
  if (level2Approver) {
    await db.insert(apdSummaryApprovals).values({
      summaryId,
      level: 2,
      approverEmployeeId: level2Approver.id,
      status: 'pending',
    });
  }

  // 5. Send concurrent notifications & emails to BOTH Level 1 approvers
  const summaryDetails = await getSummaryDetails(summaryId);
  if (summaryDetails) {
    for (const approver of level1Approvers) {
      // In-app bell notification
      await createNotificationEventForEmployee({
        employeeId: approver.id,
        category: 'approval_requests',
        eventType: 'summary_progress',
        title: `Pemeriksaan Summary APD ${summaryDetails.summaryNumber}`,
        body: `Summary APD ${summaryDetails.summaryNumber} untuk ${summaryDetails.sectionName} menunggu pemeriksaan Anda (${approver.jobTitle}).`,
        url: '/dashboard/approval',
      }).catch(console.error);

      // Email notification
      if (approver.email) {
        await sendSummaryPendingApprovalEmail(
          summaryDetails,
          approver.id,
          1,
          `${approver.jobTitle} (${approver.sectionName})`
        ).catch(console.error);
      }
    }
  }

  return { success: true };
}

export async function approveSummaryStep(
  summaryId: number,
  level: number,
  approverEmployeeId: number,
  signatureUrl: string,
  decisionNote?: string
) {
  // 1. Update this specific approver's row in apdSummaryApprovals
  await db.update(apdSummaryApprovals)
    .set({
      status: 'approved',
      signatureUrl,
      decisionNote: decisionNote || '',
      reviewedAt: new Date(),
    })
    .where(and(
      eq(apdSummaryApprovals.summaryId, summaryId),
      eq(apdSummaryApprovals.level, level),
      eq(apdSummaryApprovals.approverEmployeeId, approverEmployeeId)
    ));

  // 2. Update this specific approver's row in heroApprovals (Unified Approval Inbox)
  await db.update(heroApprovals)
    .set({
      status: 'approved',
      signatureUrl,
      decisionNote: decisionNote || '',
      reviewedAt: new Date(),
    })
    .where(and(
      eq(heroApprovals.apdSummaryId, summaryId),
      eq(heroApprovals.level, level),
      eq(heroApprovals.approverEmployeeId, approverEmployeeId)
    ));

  // 3. Level 1 AND logic check
  if (level === 1) {
    const pendingLevel1 = await db.select({
      id: apdSummaryApprovals.id,
      approverEmployeeId: apdSummaryApprovals.approverEmployeeId,
    }).from(apdSummaryApprovals)
      .where(and(
        eq(apdSummaryApprovals.summaryId, summaryId),
        eq(apdSummaryApprovals.level, 1),
        eq(apdSummaryApprovals.status, 'pending')
      ));

    if (pendingLevel1.length > 0) {
      // Still waiting for the other Level 1 approver(s)
      return { allApproved: false, level1Complete: false };
    }

    // ALL Level 1 approvers have signed! Now trigger Level 2 (Department Head)
    const level2ApproverRow = await db.select({
      approverEmployeeId: apdSummaryApprovals.approverEmployeeId,
    }).from(apdSummaryApprovals)
      .where(and(
        eq(apdSummaryApprovals.summaryId, summaryId),
        eq(apdSummaryApprovals.level, 2)
      )).limit(1);

    if (level2ApproverRow.length > 0) {
      const deptHeadId = level2ApproverRow[0].approverEmployeeId;
      const [deptHeadEmp] = await db.select({
        name: employees.name,
        email: employees.email,
        jobTitle: employees.jobTitle,
      }).from(employees).where(eq(employees.id, deptHeadId)).limit(1);

      // Insert Level 2 in heroApprovals for Unified Approval Inbox
      const existingHeroL2 = await db.select({ id: heroApprovals.id })
        .from(heroApprovals)
        .where(and(
          eq(heroApprovals.apdSummaryId, summaryId),
          eq(heroApprovals.level, 2),
          eq(heroApprovals.approverEmployeeId, deptHeadId)
        )).limit(1);

      if (existingHeroL2.length === 0) {
        await db.insert(heroApprovals).values({
          apdSummaryId: summaryId,
          level: 2,
          approverName: deptHeadEmp?.name || '',
          approverEmployeeId: deptHeadId,
          status: 'pending',
          submittedAt: new Date(),
        });
      }

      // Notify Dept Head (Bell & Email)
      const summaryDetails = await getSummaryDetails(summaryId);
      if (summaryDetails) {
        await createNotificationEventForEmployee({
          employeeId: deptHeadId,
          category: 'approval_requests',
          eventType: 'summary_progress',
          title: `Persetujuan Department Head: Summary APD ${summaryDetails.summaryNumber}`,
          body: `Summary APD ${summaryDetails.summaryNumber} telah selesai diperiksa oleh kedua Section Head dan siap disetujui.`,
          url: '/dashboard/approval',
        }).catch(console.error);

        if (deptHeadEmp?.email) {
          await sendSummaryPendingApprovalEmail(
            summaryDetails,
            deptHeadId,
            2,
            `Department Head (${summaryDetails.departmentName})`
          ).catch(console.error);
        }
      }
    }

    return { allApproved: false, level1Complete: true };
  }

  // 4. Check if all levels are fully approved
  const [anyPending] = await db.select({ id: apdSummaryApprovals.id })
    .from(apdSummaryApprovals)
    .where(and(
      eq(apdSummaryApprovals.summaryId, summaryId),
      eq(apdSummaryApprovals.status, 'pending')
    )).limit(1);

  if (!anyPending) {
    await db.update(apdSummaries)
      .set({ status: 'approved', approvedAt: new Date() })
      .where(eq(apdSummaries.id, summaryId));

    try {
      const summaryDetails = await getSummaryDetails(summaryId);
      if (summaryDetails) {
        const [submitter] = summaryDetails.generatedByEmployeeId
          ? await db.select({ id: employees.id, name: employees.name, email: employees.email })
              .from(employees).where(eq(employees.id, summaryDetails.generatedByEmployeeId)).limit(1)
          : [null];

        const printUrl = `${getAppUrl(`/print/summary/${summaryId}`)}`;
        const viewUrl = `${getAppUrl(`/dashboard/summary?preview=${summaryId}`)}`;

        // 1. Resolve Summary APD Email Configuration from centralized Email Settings
        const apdSummaryConfig = await getApdSummaryNotificationConfigData();
        const primaryEmails = parseEmailList(apdSummaryConfig.recipientEmails);
        const ccEmails = parseEmailList(apdSummaryConfig.ccEmails);

        // 2. In-app Bell Notification to Submitter
        if (submitter?.id) {
          await createNotificationEventForEmployee({
            employeeId: submitter.id,
            category: 'approval_requests',
            eventType: 'apd_summary_approved',
            title: `Summary APD ${summaryDetails.summaryNumber} Disetujui`,
            body: `Summary Permintaan APD untuk section ${summaryDetails.sectionName} telah selesai disetujui oleh Department Head.`,
            url: viewUrl,
          }).catch(console.error);
        }

        // 3. HSE Bell & Email notifications
        const hseEmails = Array.from(new Set([...primaryEmails, ...ccEmails]));

        if (hseEmails.length > 0) {
          await notifyWorkflowBellRecipients({
            recipientEmails: hseEmails,
            eventType: 'apd_summary_approved',
            category: 'approval_requests',
            title: `Summary APD ${summaryDetails.summaryNumber} Selesai Disetujui`,
            body: `Summary Permintaan APD (${summaryDetails.summaryNumber}) untuk section ${summaryDetails.sectionName} (${summaryDetails.departmentName}) telah selesai disetujui penuh oleh Department Head dan siap diproses.`,
            url: viewUrl,
          }).catch(console.error);
        }

        // 4. Send Email based on centralized Email Settings config
        if (apdSummaryConfig.isActive && primaryEmails.length > 0) {
          const primaryTo = primaryEmails[0];
          const extraCc = Array.from(new Set([
            ...primaryEmails.slice(1),
            ...ccEmails,
            ...(submitter?.email ? [submitter.email] : [])
          ]));

          await sendWorkflowEmail({
            to: primaryTo,
            cc: extraCc.length > 0 ? extraCc : undefined,
            templateCode: 'apd_summary_approved',
            templateName: 'Summary Permintaan Barang Approved',
            variables: {
              summaryNumber: summaryDetails.summaryNumber,
              sectionName: summaryDetails.sectionName,
              departmentName: summaryDetails.departmentName,
              generatedByName: submitter?.name || summaryDetails.generatedByName || 'Staff',
              printUrl,
            },
            fallbackSubject: `[HERO] Summary Permintaan APD ${summaryDetails.summaryNumber} - ${summaryDetails.sectionName} Sudah Disetujui`,
            fallbackHtml: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;border:1px solid #e2e8f0;"><div style="background:#059669;padding:16px 20px;border-radius:8px 8px 0 0;"><h2 style="color:#ffffff;margin:0;font-size:18px;font-weight:700;">HERO &bull; Summary APD Disetujui</h2><p style="color:#a7f3d0;margin:4px 0 0;font-size:12px;">Persetujuan Pengadaan APD</p></div><div style="background:#ffffff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;"><p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px;">Summary Permintaan APD (<b>${summaryDetails.summaryNumber}</b>) untuk section <b>${summaryDetails.sectionName}</b> (${summaryDetails.departmentName}) telah <b>SELESAI DISETUJUI</b> oleh Department Head.</p><table style="width:100%;border-collapse:collapse;font-size:13px;color:#334155;margin-bottom:20px;"><tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;font-weight:600;width:130px;color:#64748b;">No. Summary</td><td style="padding:8px 0;font-weight:700;color:#0f172a;">${summaryDetails.summaryNumber}</td></tr><tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;font-weight:600;color:#64748b;">Section</td><td style="padding:8px 0;">${summaryDetails.sectionName}</td></tr><tr><td style="padding:8px 0;font-weight:600;color:#64748b;">Departemen</td><td style="padding:8px 0;">${summaryDetails.departmentName}</td></tr></table><div style="text-align:center;margin:28px 0 16px 0;"><a href="${printUrl}" style="background-color:#059669;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 2px 4px rgba(5,150,105,0.25);">Cetak / Lihat Dokumen Summary &rarr;</a></div></div></div>`,
            fallbackText: `Summary Permintaan APD (${summaryDetails.summaryNumber}) untuk section ${summaryDetails.sectionName} (${summaryDetails.departmentName}) sudah disetujui penuh oleh Department Head.\n\nSilakan login ke HERO untuk melihat detail dan proses pengadaan:\n${printUrl}`,
          }).catch(console.error);
        } else if (submitter?.email) {
          // If summary APD config is inactive, still notify submitter
          await sendWorkflowEmail({
            to: submitter.email,
            templateCode: 'apd_summary_approved',
            templateName: 'Summary Permintaan Barang Approved',
            variables: {
              summaryNumber: summaryDetails.summaryNumber,
              sectionName: summaryDetails.sectionName,
              departmentName: summaryDetails.departmentName,
              generatedByName: submitter.name || summaryDetails.generatedByName || 'Staff',
              printUrl,
            },
            fallbackSubject: `[HERO] Summary Permintaan APD ${summaryDetails.summaryNumber} - ${summaryDetails.sectionName} Sudah Disetujui`,
            fallbackHtml: `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;border:1px solid #e2e8f0;"><div style="background:#059669;padding:16px 20px;border-radius:8px 8px 0 0;"><h2 style="color:#ffffff;margin:0;font-size:18px;font-weight:700;">HERO &bull; Summary APD Disetujui</h2><p style="color:#a7f3d0;margin:4px 0 0;font-size:12px;">Persetujuan Pengadaan APD</p></div><div style="background:#ffffff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none;"><p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px;">Summary Permintaan APD (<b>${summaryDetails.summaryNumber}</b>) untuk section <b>${summaryDetails.sectionName}</b> (${summaryDetails.departmentName}) telah <b>SELESAI DISETUJUI</b> oleh Department Head.</p><table style="width:100%;border-collapse:collapse;font-size:13px;color:#334155;margin-bottom:20px;"><tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;font-weight:600;width:130px;color:#64748b;">No. Summary</td><td style="padding:8px 0;font-weight:700;color:#0f172a;">${summaryDetails.summaryNumber}</td></tr><tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:8px 0;font-weight:600;color:#64748b;">Section</td><td style="padding:8px 0;">${summaryDetails.sectionName}</td></tr><tr><td style="padding:8px 0;font-weight:600;color:#64748b;">Departemen</td><td style="padding:8px 0;">${summaryDetails.departmentName}</td></tr></table><div style="text-align:center;margin:28px 0 16px 0;"><a href="${printUrl}" style="background-color:#059669;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;display:inline-block;box-shadow:0 2px 4px rgba(5,150,105,0.25);">Cetak / Lihat Dokumen Summary &rarr;</a></div></div></div>`,
            fallbackText: `Summary Permintaan APD (${summaryDetails.summaryNumber}) untuk section ${summaryDetails.sectionName} (${summaryDetails.departmentName}) sudah disetujui penuh oleh Department Head.\n\nSilakan login ke HERO untuk melihat detail dan proses pengadaan:\n${printUrl}`,
          }).catch(console.error);
        }
      }
    } catch (notifyErr) {
      console.error('[summary-engine] Failed to send approval notification:', notifyErr);
    }

    return { allApproved: true };
  }
  return { allApproved: false };
}

export async function getSummaryDetails(summaryId: number) {
  await ensureSummarySchema();

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
    generatedByJobTitle: employees.jobTitle,
  }).from(apdSummaries)
    .innerJoin(masterSections, eq(apdSummaries.sectionId, masterSections.id))
    .leftJoin(employees, eq(apdSummaries.generatedByEmployeeId, employees.id))
    .where(eq(apdSummaries.id, summaryId));

  if (!summary) return null;

  const [department] = await db.select({ name: masterDepartments.name })
    .from(masterDepartments).where(eq(masterDepartments.id, summary.departmentId || 0));

  const items = await db.select().from(apdSummaryItems)
    .where(eq(apdSummaryItems.summaryId, summaryId))
    .orderBy(asc(apdSummaryItems.employeeName));

  const actualApprovals = await db.select({
    id: apdSummaryApprovals.id,
    level: apdSummaryApprovals.level,
    approverEmployeeId: apdSummaryApprovals.approverEmployeeId,
    status: apdSummaryApprovals.status,
    signatureUrl: apdSummaryApprovals.signatureUrl,
    reviewedAt: apdSummaryApprovals.reviewedAt,
    decisionNote: apdSummaryApprovals.decisionNote,
    approverName: employees.name,
    approverJobTitle: employees.jobTitle,
    approverSectionName: masterSections.name,
  }).from(apdSummaryApprovals)
    .innerJoin(employees, eq(apdSummaryApprovals.approverEmployeeId, employees.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .where(eq(apdSummaryApprovals.summaryId, summaryId))
    .orderBy(asc(apdSummaryApprovals.level), asc(apdSummaryApprovals.id));

  // Resolve expected approvers so names & job titles are always populated even if not yet reviewed
  const { level1Approvers, level2Approver } = await resolveSummaryApprovers(summary.sectionId);

  const enrichedApprovals: Array<{
    id: number;
    level: number;
    approverEmployeeId: number;
    status: string;
    signatureUrl: string | null;
    reviewedAt: Date | null;
    decisionNote: string | null;
    approverName: string;
    approverJobTitle: string;
    approverSectionName: string | null;
  }> = [];

  // 1. Level 1 approvers
  for (const l1 of level1Approvers) {
    const existing = actualApprovals.find(a => a.level === 1 && a.approverEmployeeId === l1.id);
    if (existing) {
      enrichedApprovals.push({
        ...existing,
        approverName: existing.approverName || l1.name,
        approverJobTitle: l1.jobTitle || existing.approverJobTitle,
        approverSectionName: l1.sectionName || existing.approverSectionName,
      });
    } else {
      enrichedApprovals.push({
        id: 0,
        level: 1,
        approverEmployeeId: l1.id,
        status: 'pending',
        signatureUrl: null,
        reviewedAt: null,
        decisionNote: null,
        approverName: l1.name,
        approverJobTitle: l1.jobTitle,
        approverSectionName: l1.sectionName,
      });
    }
  }

  // If actualApprovals has level 1 approvers that were not in level1Approvers
  for (const act of actualApprovals.filter(a => a.level === 1)) {
    if (!enrichedApprovals.some(e => e.level === 1 && e.approverEmployeeId === act.approverEmployeeId)) {
      enrichedApprovals.push({
        ...act,
        approverSectionName: act.approverSectionName || '',
      });
    }
  }

  // 2. Level 2 approver (Dept Head)
  if (level2Approver) {
    const existingL2 = actualApprovals.find(a => a.level === 2 && a.approverEmployeeId === level2Approver.id);
    if (existingL2) {
      enrichedApprovals.push({
        ...existingL2,
        approverName: existingL2.approverName || level2Approver.name,
        approverJobTitle: existingL2.approverJobTitle || level2Approver.jobTitle,
        approverSectionName: existingL2.approverSectionName || level2Approver.departmentName,
      });
    } else {
      enrichedApprovals.push({
        id: 0,
        level: 2,
        approverEmployeeId: level2Approver.id,
        status: 'pending',
        signatureUrl: null,
        reviewedAt: null,
        decisionNote: null,
        approverName: level2Approver.name,
        approverJobTitle: level2Approver.jobTitle,
        approverSectionName: level2Approver.departmentName,
      });
    }
  } else {
    for (const act of actualApprovals.filter(a => a.level === 2)) {
      enrichedApprovals.push({
        ...act,
        approverSectionName: act.approverSectionName || '',
      });
    }
  }

  return {
    ...summary,
    generatedByName: summary.generatedByName || 'Staff',
    generatedByJobTitle: summary.generatedByJobTitle || '',
    departmentName: department?.name || '',
    items,
    approvals: enrichedApprovals.length > 0 ? enrichedApprovals : actualApprovals,
  };
}
