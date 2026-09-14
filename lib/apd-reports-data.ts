import { db } from "@/db";
import { apdRequests, apdRequestItems, employees, masterDepartments, masterSections, sites, approvals } from "@/db/schema/hero";
import { eq, desc, and, gte, lte, sql, inArray } from "drizzle-orm";
import { ensureApdRequestSchema } from "./apd-data";

export type ApdMonthlyReportItemDetail = {
  id: number;
  itemType: string;
  requestType: string; // 'baru' | 'pergantian'
  quantity: number;
  photoUrl: string | null;
  notes: string | null;
};

export type ApdMonthlyReportRow = {
  id: number;
  requestNumber: string;
  requestDate: Date;
  requestCategory: string; // 'APD' | 'MATERIAL' | 'TOOLS'
  status: string;
  notes: string;
  employeeId: number;
  employeeName: string;
  employeeSn: string;
  jobTitle: string | null;
  departmentName: string | null;
  sectionName: string | null;
  siteId: number;
  siteName: string;
  items: ApdMonthlyReportItemDetail[];
  totalQuantity: number;
  reviewedBy: string | null;
};

export type ApdItemSummary = {
  itemType: string;
  category: string;
  totalQuantity: number;
  requestCount: number;
  baruQuantity: number;
  pergantianQuantity: number;
};

export type ApdSiteSummary = {
  siteId: number;
  siteName: string;
  totalRequests: number;
  totalItems: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
};

export type ApdMonthlyReportData = {
  rows: ApdMonthlyReportRow[];
  itemSummaries: ApdItemSummary[];
  siteSummaries: ApdSiteSummary[];
  metrics: {
    totalRequests: number;
    totalItems: number;
    approvedRequests: number;
    pendingRequests: number;
    rejectedRequests: number;
  };
  sitesList: Array<{ id: number; name: string }>;
};

export async function fetchApdMonthlyReport(params: {
  category: "APD" | "MATERIAL_TOOLS";
  year: number;
  month?: number; // 1 - 12 or undefined for whole year
  siteId?: number;
}): Promise<ApdMonthlyReportData> {
  await ensureApdRequestSchema();

  // 1. Date filter range
  const startMonth = params.month ? params.month - 1 : 0;
  const endMonth = params.month ? params.month : 12;
  const startDate = new Date(Date.UTC(params.year, startMonth, 1, 0, 0, 0));
  const endDate = params.month
    ? new Date(Date.UTC(params.year, params.month, 0, 23, 59, 59, 999))
    : new Date(Date.UTC(params.year, 11, 31, 23, 59, 59, 999));

  // 2. Category list
  const categories = params.category === "APD" ? ["APD"] : ["MATERIAL", "TOOLS"];

  // 3. Query base requests
  const conditions = [
    inArray(apdRequests.requestCategory, categories),
    gte(apdRequests.requestDate, startDate),
    lte(apdRequests.requestDate, endDate),
  ];

  if (params.siteId) {
    conditions.push(eq(apdRequests.siteId, params.siteId));
  }

  const requestsQuery = await db
    .select({
      id: apdRequests.id,
      requestNumber: apdRequests.requestNumber,
      requestDate: apdRequests.requestDate,
      requestCategory: apdRequests.requestCategory,
      status: apdRequests.status,
      notes: apdRequests.notes,
      employeeId: apdRequests.employeeId,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      jobTitle: employees.jobTitle,
      departmentName: masterDepartments.name,
      sectionName: masterSections.name,
      siteId: apdRequests.siteId,
      siteName: sites.name,
    })
    .from(apdRequests)
    .innerJoin(employees, eq(apdRequests.employeeId, employees.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .innerJoin(sites, eq(apdRequests.siteId, sites.id))
    .where(and(...conditions))
    .orderBy(desc(apdRequests.requestDate));

  // 4. Fetch items for all matched requests
  const requestIds = requestsQuery.map((r) => r.id);
  const itemsMap = new Map<number, ApdMonthlyReportItemDetail[]>();

  if (requestIds.length > 0) {
    const items = await db
      .select({
        id: apdRequestItems.id,
        requestId: apdRequestItems.requestId,
        itemType: apdRequestItems.itemType,
        requestType: apdRequestItems.requestType,
        quantity: apdRequestItems.quantity,
        photoUrl: apdRequestItems.photoUrl,
        notes: apdRequestItems.notes,
      })
      .from(apdRequestItems)
      .where(inArray(apdRequestItems.requestId, requestIds));

    for (const item of items) {
      if (!itemsMap.has(item.requestId)) {
        itemsMap.set(item.requestId, []);
      }
      itemsMap.get(item.requestId)!.push({
        id: item.id,
        itemType: item.itemType,
        requestType: item.requestType,
        quantity: item.quantity,
        photoUrl: item.photoUrl,
        notes: item.notes,
      });
    }
  }

  // 5. Combine requests + items
  const rows: ApdMonthlyReportRow[] = requestsQuery.map((req) => {
    const reqItems = itemsMap.get(req.id) || [];
    const totalQty = reqItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
    return {
      ...req,
      items: reqItems,
      totalQuantity: totalQty,
      reviewedBy: null,
    };
  });

  // 6. Calculate Metrics
  let approvedRequests = 0;
  let pendingRequests = 0;
  let rejectedRequests = 0;
  let totalItems = 0;

  for (const row of rows) {
    const st = (row.status || "").toLowerCase();
    if (st === "approved" || st === "proses_order" || st === "selesai" || st === "completed") {
      approvedRequests++;
    } else if (st === "rejected" || st === "ditolak") {
      rejectedRequests++;
    } else {
      pendingRequests++;
    }
    totalItems += row.totalQuantity;
  }

  // 7. Calculate Item Summaries
  const itemMap = new Map<string, ApdItemSummary>();
  for (const row of rows) {
    for (const item of row.items) {
      const itemKey = item.itemType.trim();
      if (!itemMap.has(itemKey)) {
        itemMap.set(itemKey, {
          itemType: itemKey,
          category: row.requestCategory,
          totalQuantity: 0,
          requestCount: 0,
          baruQuantity: 0,
          pergantianQuantity: 0,
        });
      }
      const summary = itemMap.get(itemKey)!;
      summary.totalQuantity += item.quantity || 1;
      summary.requestCount += 1;
      if (item.requestType === "baru") {
        summary.baruQuantity += item.quantity || 1;
      } else {
        summary.pergantianQuantity += item.quantity || 1;
      }
    }
  }

  const itemSummaries = Array.from(itemMap.values()).sort(
    (a, b) => b.totalQuantity - a.totalQuantity
  );

  // 8. Calculate Site Summaries
  const siteMap = new Map<number, ApdSiteSummary>();
  for (const row of rows) {
    if (!siteMap.has(row.siteId)) {
      siteMap.set(row.siteId, {
        siteId: row.siteId,
        siteName: row.siteName,
        totalRequests: 0,
        totalItems: 0,
        approvedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
      });
    }
    const siteSum = siteMap.get(row.siteId)!;
    siteSum.totalRequests++;
    siteSum.totalItems += row.totalQuantity;
    const st = (row.status || "").toLowerCase();
    if (st === "approved" || st === "proses_order" || st === "selesai" || st === "completed") {
      siteSum.approvedCount++;
    } else if (st === "rejected" || st === "ditolak") {
      siteSum.rejectedCount++;
    } else {
      siteSum.pendingCount++;
    }
  }

  const siteSummaries = Array.from(siteMap.values()).sort(
    (a, b) => b.totalRequests - a.totalRequests
  );

  // 9. All active sites for filter dropdown
  const allSites = await db
    .select({
      id: sites.id,
      name: sites.name,
    })
    .from(sites)
    .orderBy(sites.name);

  return {
    rows,
    itemSummaries,
    siteSummaries,
    metrics: {
      totalRequests: rows.length,
      totalItems,
      approvedRequests,
      pendingRequests,
      rejectedRequests,
    },
    sitesList: allSites,
  };
}
