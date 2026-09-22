import { db } from "@/db";
import { employeeAssets, employees, sites, masterDepartments, masterSections } from "@/db/schema/hero";
import { eq, desc, ilike, and, or, sql } from "drizzle-orm";

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

export type SafetyShoesRecordItem = {
  id: number;
  assignedAt: Date;
  size?: string | null;
  attachmentUrl?: string | null;
};

export type SafetyShoesMatrixRow = {
  employeeId: number;
  employeeName: string;
  employeeSn: string;
  departmentName: string;
  sectionName: string;
  siteName: string;
  size: string | null;
  attachmentUrl: string | null;
  history: Record<string, Date[]>;
  records: SafetyShoesRecordItem[];
  latestAssetId: number | null;
};

export async function fetchSafetyShoesMatrix() {
  // 1. Get all active employees from hero_employees (Single Source of Truth)
  const allEmployees = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      siteId: employees.siteId,
      siteName: sites.name,
      departmentName: sql<string | null>`coalesce(${masterDepartments.name}, ${employees.department})`.as('department_name'),
      sectionName: sql<string | null>`coalesce(${masterSections.name}, ${employees.section})`.as('section_name'),
      isActive: employees.isActive,
    })
    .from(employees)
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .where(
      and(
        eq(employees.isActive, true),
        or(
          ilike(masterDepartments.name, "%central service%"),
          ilike(employees.department, "%central service%")
        )
      )
    )
    .orderBy(employees.name);

  // 2. Get all safety shoes assets
  const assets = await db
    .select({
      id: employeeAssets.id,
      employeeId: employeeAssets.employeeId,
      size: employeeAssets.size,
      attachmentUrl: employeeAssets.attachmentUrl,
      assignedAt: employeeAssets.assignedAt,
    })
    .from(employeeAssets)
    .where(ilike(employeeAssets.itemName, "%sepatu safety%"))
    .orderBy(desc(employeeAssets.assignedAt));

  const currentYear = new Date().getFullYear();
  // Ensure we at least show down to 2022
  const minYear = 2022;
  
  const employeeMap = new Map<number, SafetyShoesMatrixRow>();

  // 3. Initialize matrix rows for all active employees
  for (const emp of allEmployees) {
    const history: Record<string, Date[]> = {};
    for (let y = currentYear; y >= minYear; y--) {
      history[y.toString()] = [];
    }
    employeeMap.set(emp.id, {
      employeeId: emp.id,
      employeeName: emp.name || "",
      employeeSn: emp.employeeSn || "",
      departmentName: emp.departmentName || "-",
      sectionName: emp.sectionName || "-",
      siteName: emp.siteName || "Unassigned",
      size: null,
      attachmentUrl: null,
      history,
      records: [],
      latestAssetId: null,
    });
  }

  // 4. Map safety shoes assets to employees
  for (const asset of assets) {
    if (!asset.employeeId) continue;
    const row = employeeMap.get(asset.employeeId);
    if (!row) continue;

    if (row.latestAssetId === null) {
      row.latestAssetId = asset.id;
      row.size = asset.size;
      row.attachmentUrl = asset.attachmentUrl;
    } else if (!row.size && asset.size) {
      row.size = asset.size;
    }

    if (asset.assignedAt) {
      const assignedDate = new Date(asset.assignedAt);
      row.records.push({
        id: asset.id,
        assignedAt: assignedDate,
        size: asset.size,
        attachmentUrl: asset.attachmentUrl,
      });

      const assetYear = assignedDate.getFullYear();
      if (!row.history[assetYear.toString()]) {
        row.history[assetYear.toString()] = [];
      }
      if (row.history[assetYear.toString()].length < 2) {
        row.history[assetYear.toString()].push(assignedDate);
      }
    }
  }

  // Calculate dynamic columns (all years present in the matrix)
  const allYears = new Set<number>();
  for (let y = currentYear; y >= minYear; y--) allYears.add(y);
  
  for (const row of Array.from(employeeMap.values())) {
    for (const yearStr of Object.keys(row.history || {})) {
      allYears.add(parseInt(yearStr, 10));
    }
  }
  
  const sortedYears = Array.from(allYears).sort((a, b) => b - a);

  return {
    rows: Array.from(employeeMap.values()),
    years: sortedYears
  };
}
