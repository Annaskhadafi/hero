import { db } from "@/db";
import { employeeAssets, employees, sites, masterDepartments } from "@/db/schema/hero";
import { eq, desc, ilike, and } from "drizzle-orm";

export type ApdInventoryHistoryItem = {
  id: number;
  status: string;
  assignedAt: Date | null;
  nextReplacementDue: Date | null;
  size: string | null;
  attachmentUrl: string | null;
  remarks: string | null;
};

export type ApdInventoryGroupedRow = {
  employeeId: number;
  employeeName: string;
  employeeSn: string;
  itemName: string;
  itemCategory: string;
  status: string;
  assignedAt: Date | null;
  nextReplacementDue: Date | null;
  history: ApdInventoryHistoryItem[];
};

export async function fetchApdInventory() {
  const assets = await db
    .select({
      id: employeeAssets.id,
      employeeId: employeeAssets.employeeId,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      itemCategory: employeeAssets.itemCategory,
      itemName: employeeAssets.itemName,
      status: employeeAssets.status,
      assignedAt: employeeAssets.assignedAt,
      nextReplacementDue: employeeAssets.nextReplacementDue,
      size: employeeAssets.size,
      attachmentUrl: employeeAssets.attachmentUrl,
      remarks: employeeAssets.remarks,
    })
    .from(employeeAssets)
    .leftJoin(employees, eq(employeeAssets.employeeId, employees.id))
    .orderBy(desc(employeeAssets.assignedAt));

  const map = new Map<string, ApdInventoryGroupedRow>();

  for (const asset of assets) {
    if (!asset.employeeId) continue;
    
    // Group by employee + item name
    const key = `${asset.employeeId}-${asset.itemName.toLowerCase()}`;
    
    if (!map.has(key)) {
      map.set(key, {
        employeeId: asset.employeeId,
        employeeName: asset.employeeName || "",
        employeeSn: asset.employeeSn || "",
        itemName: asset.itemName,
        itemCategory: asset.itemCategory,
        status: asset.status, // Since it's ordered by desc, the first one is the latest
        assignedAt: asset.assignedAt,
        nextReplacementDue: asset.nextReplacementDue,
        history: [],
      });
    }

    const row = map.get(key)!;
    row.history.push({
      id: asset.id,
      status: asset.status,
      assignedAt: asset.assignedAt,
      nextReplacementDue: asset.nextReplacementDue,
      size: asset.size,
      attachmentUrl: asset.attachmentUrl,
      remarks: asset.remarks,
    });
  }

  return Array.from(map.values());
}

export type SafetyShoesMatrixRow = {
  employeeId: number;
  employeeName: string;
  employeeSn: string;
  departmentName: string;
  siteName: string;
  size: string | null;
  attachmentUrl: string | null;
  history: Record<string, Date[]>;
  latestAssetId: number | null;
};

export async function fetchSafetyShoesMatrix() {
  // 1. Get all safety shoes assets first
  const assets = await db
    .select({
      id: employeeAssets.id,
      employeeId: employeeAssets.employeeId,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      siteName: sites.name,
      departmentName: masterDepartments.name,
      size: employeeAssets.size,
      attachmentUrl: employeeAssets.attachmentUrl,
      assignedAt: employeeAssets.assignedAt,
    })
    .from(employeeAssets)
    .leftJoin(employees, eq(employeeAssets.employeeId, employees.id))
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .where(
      and(
        ilike(employeeAssets.itemName, "%sepatu safety%"),
        ilike(masterDepartments.name, "%central service%")
      )
    )
    .orderBy(desc(employeeAssets.assignedAt));

  const currentYear = new Date().getFullYear();
  // Ensure we at least show down to 2022
  const minYear = 2022;
  
  const employeeMap = new Map<number, SafetyShoesMatrixRow>();

  // 2. Build map ONLY for employees who have at least one safety shoe asset
  for (const asset of assets) {
    if (!asset.employeeId) continue;
    
    if (!employeeMap.has(asset.employeeId)) {
      const history: Record<string, Date[]> = {};
      for (let y = currentYear; y >= minYear; y--) {
        history[y.toString()] = [];
      }
      employeeMap.set(asset.employeeId, {
        employeeId: asset.employeeId,
        employeeName: asset.employeeName || "",
        employeeSn: asset.employeeSn || "",
        departmentName: asset.departmentName || "",
        siteName: asset.siteName || "",
        size: null,
        attachmentUrl: null,
        history,
        latestAssetId: null,
      });
    }

    const row = employeeMap.get(asset.employeeId)!;
    
    // The first one we process is the latest due to orderBy desc, so we use its size & attachment
    if (row.latestAssetId === null) {
      row.latestAssetId = asset.id;
      row.size = asset.size;
      row.attachmentUrl = asset.attachmentUrl;
    }

    const assetYear = asset.assignedAt.getFullYear();
    // Add to history if not exists
    if (!row.history[assetYear.toString()]) {
       row.history[assetYear.toString()] = [];
    }
    // Only keep up to 2 records per year (latest ones, due to ordering)
    if (row.history[assetYear.toString()].length < 2) {
      row.history[assetYear.toString()].push(asset.assignedAt);
    }
  }

  // Calculate dynamic columns (all years present in the matrix)
  const allYears = new Set<number>();
  for (let y = currentYear; y >= minYear; y--) allYears.add(y);
  
  for (const row of Array.from(employeeMap.values())) {
    for (const yearStr of Object.keys(row.history)) {
      allYears.add(parseInt(yearStr, 10));
    }
  }
  
  const sortedYears = Array.from(allYears).sort((a, b) => b - a);

  return {
    rows: Array.from(employeeMap.values()),
    years: sortedYears
  };
}
