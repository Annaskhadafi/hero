"use server";

import { db } from "@/db";
import { centralServiceEmployees, centralServiceManpowerTargets } from "@/db/schema/central-service";
import { and, eq, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ManpowerSiteComposition = {
  siteName: string;
  technicalEngineer: {
    requested: number;
    fulfillment: number;
    backupLeave: number;
  };
  serviceman: {
    requested: number;
    fulfillment: number;
    backupLeave: number;
  };
  repairman: {
    requested: number;
    fulfillment: number;
    backupLeave: number;
  };
  totalManpower: number;
  statusRemarks: string;
  employees: {
    employeeSn: string;
    fullName: string;
    position: string;
    section: string;
  }[];
};

/**
 * Get manpower composition data for Central Service.
 */
export async function getManpowerComposition(): Promise<ManpowerSiteComposition[]> {
  try {
    // 1. Fetch all active Central Service employees
    const employees = await db
      .select({
        employeeSn: centralServiceEmployees.employeeSn,
        fullName: centralServiceEmployees.fullName,
        siteName: centralServiceEmployees.siteName,
        position: centralServiceEmployees.position,
        section: centralServiceEmployees.section,
      })
      .from(centralServiceEmployees)
      .where(
        and(
          eq(centralServiceEmployees.isActive, true),
          or(
            eq(centralServiceEmployees.department, "Central Services"),
            eq(centralServiceEmployees.department, "CENTRAL SERVICES"),
            eq(centralServiceEmployees.department, "Central Service")
          )
        )
      );

    // 2. Fetch all requested targets
    const targets = await db.select().from(centralServiceManpowerTargets);

    // Create a lookup for targets: key = `${siteName}::${position}`
    const targetMap = new Map<string, number>();
    for (const t of targets) {
      const key = `${t.siteName.trim().toUpperCase()}::${t.position.trim().toUpperCase()}`;
      targetMap.set(key, t.requestedCount);
    }

    // 3. Group employees by siteName
    const siteGroups = new Map<string, {
      originalName: string;
      employees: typeof employees;
    }>();

    for (const emp of employees) {
      const rawSite = emp.siteName || "Unassigned";
      const normSite = rawSite.trim().toUpperCase();
      
      if (!siteGroups.has(normSite)) {
        siteGroups.set(normSite, {
          originalName: rawSite.trim(),
          employees: [],
        });
      }
      siteGroups.get(normSite)!.employees.push(emp);
    }

    // Ensure sites shown in targets but having 0 employees are also present if needed
    for (const t of targets) {
      const normSite = t.siteName.trim().toUpperCase();
      if (!siteGroups.has(normSite)) {
        siteGroups.set(normSite, {
          originalName: t.siteName.trim(),
          employees: [],
        });
      }
    }

    const compositionList: ManpowerSiteComposition[] = [];

    // 4. Calculate stats for each site
    for (const [normSite, group] of siteGroups.entries()) {
      const siteName = group.originalName;
      if (!siteName || siteName === "Unassigned" && group.employees.length === 0) {
        continue;
      }

      // Filter employees by role
      const teEmployees = group.employees.filter((e) =>
        e.position.trim().toLowerCase() === "technical engineer"
      );
      const svcEmployees = group.employees.filter((e) =>
        e.position.trim().toLowerCase() === "serviceman"
      );
      const repEmployees = group.employees.filter((e) =>
        e.position.trim().toLowerCase() === "repairman"
      );

      // Get target requested counts from targetMap
      const teRequested = targetMap.get(`${normSite}::TECHNICAL ENGINEER`) || 0;
      const svcRequested = targetMap.get(`${normSite}::SERVICEMAN`) || 0;
      const repRequested = targetMap.get(`${normSite}::REPAIRMAN`) || 0;

      // Fulfillment counts
      const teFulfillment = teEmployees.length;
      const svcFulfillment = svcEmployees.length;
      const repFulfillment = repEmployees.length;

      // Backup Leave: 1 backup for every 6 employees. If less than 6, it is 0.
      // Math.floor(fulfillment / 6)
      const teBackup = Math.floor(teFulfillment / 6);
      const svcBackup = Math.floor(svcFulfillment / 6);
      const repBackup = Math.floor(repFulfillment / 6);

      // Total Manpower = fulfillments + backups
      const totalManpower = 
        teFulfillment + teBackup + 
        svcFulfillment + svcBackup + 
        repFulfillment + repBackup;

      // Calculate shortfalls for remarks
      const remarksParts: string[] = [];
      
      const teShortfall = teRequested - teFulfillment;
      const svcShortfall = svcRequested - svcFulfillment;
      const repShortfall = repRequested - repFulfillment;

      if (teShortfall > 0) {
        remarksParts.push(`(-) ${teShortfall} Manpower Technical Engineer`);
      }
      if (svcShortfall > 0) {
        remarksParts.push(`(-) ${svcShortfall} Manpower Service`);
      }
      if (repShortfall > 0) {
        remarksParts.push(`(-) ${repShortfall} Manpower Repairman`);
      }

      const statusRemarks = remarksParts.length > 0 ? remarksParts.join(" + ") : "Completed";

      compositionList.push({
        siteName,
        technicalEngineer: {
          requested: teRequested,
          fulfillment: teFulfillment,
          backupLeave: teBackup,
        },
        serviceman: {
          requested: svcRequested,
          fulfillment: svcFulfillment,
          backupLeave: svcBackup,
        },
        repairman: {
          requested: repRequested,
          fulfillment: repFulfillment,
          backupLeave: repBackup,
        },
        totalManpower,
        statusRemarks,
        employees: group.employees.map((e) => ({
          employeeSn: e.employeeSn,
          fullName: e.fullName,
          position: e.position,
          section: e.section,
        })),
      });
    }

    // Sort alphabetically by siteName
    return compositionList.sort((a, b) => a.siteName.localeCompare(b.siteName));
  } catch (error) {
    console.error("Failed to get manpower composition:", error);
    return [];
  }
}

/**
 * Update the requested target count for a specific site and position.
 */
export async function updateManpowerTarget(
  siteName: string,
  position: string,
  requestedCount: number
) {
  try {
    const cleanSiteName = siteName.trim();
    const cleanPosition = position.trim();

    // Perform upsert (insert on conflict update)
    await db
      .insert(centralServiceManpowerTargets)
      .values({
        siteName: cleanSiteName,
        position: cleanPosition,
        requestedCount,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [centralServiceManpowerTargets.siteName, centralServiceManpowerTargets.position],
        set: {
          requestedCount,
          updatedAt: new Date(),
        },
      });

    revalidatePath("/dashboard/central-service");
    return { success: true };
  } catch (error) {
    console.error("Failed to update manpower target:", error);
    return { success: false, error: error instanceof Error ? error.message : "Failed to update target" };
  }
}
