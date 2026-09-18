"use server";

import { db } from "@/db";
import { centralServiceRefuelingLogs, type CentralServiceRefuelingLog, type NewCentralServiceRefuelingLog } from "@/db/schema/central-service";
import { and, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {}
}

export type RefuelingLogFilters = {
  siteName?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  fuelExpenditureType?: string;
  limit?: number;
  offset?: number;
};

export type RefuelingSummaryKPI = {
  totalRecords: number;
  totalLiters: number;
  avgLitersPerFill: number;
  topSite: {
    siteName: string;
    totalLiters: number;
    fillCount: number;
  } | null;
  siteBreakdown: Array<{
    siteName: string;
    totalLiters: number;
    fillCount: number;
  }>;
};

/**
 * Submit a new Re-Fueling log from HERO Form into PostgreSQL
 */
export async function submitRefuelingLog(data: {
  siteName: string;
  driverName: string;
  driverSn?: string;
  refuelDate: string;
  unitNumber: string;
  odometerKm: number;
  fuelExpenditureType?: string;
  fuelAmountLiters: string | number;
  fuelmanName: string;
  odometerPhotoUrl?: string;
  flowmeterPhotoUrl?: string;
  remarks?: string;
  createdByUserId?: string;
}) {
  try {
    const litersStr = String(data.fuelAmountLiters || "0").replace(",", ".");
    const numericLiters = isNaN(Number(litersStr)) ? "0" : Number(litersStr).toFixed(2);

    const [inserted] = await db
      .insert(centralServiceRefuelingLogs)
      .values({
        siteName: data.siteName.trim(),
        driverName: data.driverName.trim(),
        driverSn: data.driverSn?.trim() || null,
        refuelDate: data.refuelDate,
        unitNumber: data.unitNumber.trim(),
        odometerKm: Math.round(Number(data.odometerKm) || 0),
        fuelExpenditureType: data.fuelExpenditureType || "Di bebankan ke PT Chitra Paratama (Internal)",
        fuelAmountLiters: numericLiters,
        fuelmanName: data.fuelmanName.trim(),
        odometerPhotoUrl: data.odometerPhotoUrl || null,
        flowmeterPhotoUrl: data.flowmeterPhotoUrl || null,
        remarks: data.remarks?.trim() || "",
        createdByUserId: data.createdByUserId || null,
      })
      .returning();

    // Trigger Google Sheet Webhook sync if configured
    const webhookUrl = process.env.GOOGLE_SHEET_REFUELING_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timestamp: new Date().toLocaleString("en-US", { timeZone: "Asia/Makassar" }),
            siteName: data.siteName.trim(),
            driverName: data.driverName.trim(),
            refuelDate: data.refuelDate,
            unitNumber: data.unitNumber.trim(),
            odometerKm: data.odometerKm,
            fuelAmountLiters: numericLiters,
            fuelmanName: data.fuelmanName.trim(),
            odometerPhotoUrl: data.odometerPhotoUrl || "",
            flowmeterPhotoUrl: data.flowmeterPhotoUrl || "",
            fuelExpenditureType: data.fuelExpenditureType || "Di bebankan ke PT Chitra Paratama (Internal)",
            remarks: data.remarks?.trim() || "",
          }),
        }).catch((err) => console.error("[GoogleSheetSync] Error:", err));
      } catch (sheetErr) {
        console.error("[GoogleSheetSync] trigger error:", sheetErr);
      }
    }

    safeRevalidate("/dashboard/central-service/refueling");
    safeRevalidate("/dashboard/360-service/service-form");

    return {
      success: true,
      message: "Data Re-Fueling berhasil disimpan ke database pusat HERO.",
      data: inserted,
    };
  } catch (error) {
    console.error("[submitRefuelingLog] error:", error);
    return {
      success: false,
      message: "Gagal menyimpan data Re-Fueling ke database.",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export type RefuelingUserContext = {
  userId: string | null;
  employeeId: number | null;
  name: string;
  employeeSn: string;
  accessRole: string;
  isSuperAdmin: boolean;
  canEdit: boolean;
  dataScope: string;
};

export async function getCurrentRefuelingUserContext(): Promise<RefuelingUserContext> {
  if (process.env.NODE_ENV === "test") {
    return {
      userId: "test-user-id",
      employeeId: 1,
      name: "Test Admin",
      employeeSn: "ADMIN01",
      accessRole: "Super Admin",
      isSuperAdmin: true,
      canEdit: true,
      dataScope: "global",
    };
  }

  try {
    const { getServerSession } = await import("@/lib/auth-session");
    const { getCurrentEmployee } = await import("@/lib/get-current-employee");
    const { getCurrentMenuPermission, isSuperAdminRole } = await import("@/lib/hero-access");

    const session = await getServerSession();
    const employee = await getCurrentEmployee();
    const roleName = employee?.accessRole || (session?.user as any)?.role || "";
    const isSuperAdmin = isSuperAdminRole(roleName);
    const permission = await getCurrentMenuPermission("central_service_refueling");

    return {
      userId: session?.user?.id || employee?.authUserId || null,
      employeeId: employee?.id || null,
      name: employee?.name || session?.user?.name || "",
      employeeSn: employee?.employeeSn || "",
      accessRole: roleName,
      isSuperAdmin,
      canEdit: isSuperAdmin || (permission.canEdit && permission.dataScope === "global"),
      dataScope: isSuperAdmin ? "global" : permission.dataScope || "own",
    };
  } catch (err) {
    console.error("[getCurrentRefuelingUserContext] Error:", err);
    return {
      userId: null,
      employeeId: null,
      name: "",
      employeeSn: "",
      accessRole: "",
      isSuperAdmin: false,
      canEdit: false,
      dataScope: "own",
    };
  }
}

/**
 * Query Re-Fueling logs with filtering, search, and sorting with RBAC data scoping
 */
export async function getRefuelingLogs(filters: RefuelingLogFilters = {}) {
  try {
    const userCtx = await getCurrentRefuelingUserContext();
    const conditions = [];

    // RBAC: If not super admin and dataScope is not global, only show own records
    if (!userCtx.isSuperAdmin && userCtx.dataScope !== "global") {
      const ownConditions = [];
      if (userCtx.userId) {
        ownConditions.push(eq(centralServiceRefuelingLogs.createdByUserId, userCtx.userId));
      }
      if (userCtx.employeeSn) {
        ownConditions.push(eq(centralServiceRefuelingLogs.driverSn, userCtx.employeeSn));
      }
      if (userCtx.name) {
        ownConditions.push(ilike(centralServiceRefuelingLogs.driverName, userCtx.name.trim()));
      }
      if (ownConditions.length > 0) {
        conditions.push(or(...ownConditions));
      }
    }

    if (filters.siteName && filters.siteName !== "ALL") {
      conditions.push(eq(centralServiceRefuelingLogs.siteName, filters.siteName));
    }

    if (filters.fuelExpenditureType && filters.fuelExpenditureType !== "ALL") {
      conditions.push(eq(centralServiceRefuelingLogs.fuelExpenditureType, filters.fuelExpenditureType));
    }

    if (filters.startDate) {
      conditions.push(gte(centralServiceRefuelingLogs.refuelDate, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(centralServiceRefuelingLogs.refuelDate, filters.endDate));
    }

    if (filters.search && filters.search.trim()) {
      const q = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(centralServiceRefuelingLogs.driverName, q),
          ilike(centralServiceRefuelingLogs.fuelmanName, q),
          ilike(centralServiceRefuelingLogs.unitNumber, q),
          ilike(centralServiceRefuelingLogs.siteName, q),
          ilike(centralServiceRefuelingLogs.remarks, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const query = db
      .select()
      .from(centralServiceRefuelingLogs)
      .where(whereClause)
      .orderBy(desc(centralServiceRefuelingLogs.refuelDate), desc(centralServiceRefuelingLogs.id));

    if (filters.limit) {
      query.limit(filters.limit);
    }
    if (filters.offset) {
      query.offset(filters.offset);
    }

    const records = await query;

    return {
      success: true,
      data: records,
    };
  } catch (error) {
    console.error("[getRefuelingLogs] error:", error);
    return {
      success: false,
      message: "Gagal memuat log data Re-Fueling.",
      data: [] as CentralServiceRefuelingLog[],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get summary KPI metrics for Re-Fueling with RBAC data scoping
 */
export async function getRefuelingSummaryKPI(filters: { siteName?: string; fuelExpenditureType?: string; startDate?: string; endDate?: string } = {}): Promise<RefuelingSummaryKPI> {
  try {
    const userCtx = await getCurrentRefuelingUserContext();
    const conditions = [];

    // RBAC: If not super admin and dataScope is not global, only count own records
    if (!userCtx.isSuperAdmin && userCtx.dataScope !== "global") {
      const ownConditions = [];
      if (userCtx.userId) {
        ownConditions.push(eq(centralServiceRefuelingLogs.createdByUserId, userCtx.userId));
      }
      if (userCtx.employeeSn) {
        ownConditions.push(eq(centralServiceRefuelingLogs.driverSn, userCtx.employeeSn));
      }
      if (userCtx.name) {
        ownConditions.push(ilike(centralServiceRefuelingLogs.driverName, userCtx.name.trim()));
      }
      if (ownConditions.length > 0) {
        conditions.push(or(...ownConditions));
      }
    }

    if (filters.siteName && filters.siteName !== "ALL") {
      conditions.push(eq(centralServiceRefuelingLogs.siteName, filters.siteName));
    }
    if (filters.fuelExpenditureType && filters.fuelExpenditureType !== "ALL") {
      conditions.push(eq(centralServiceRefuelingLogs.fuelExpenditureType, filters.fuelExpenditureType));
    }
    if (filters.startDate) {
      conditions.push(gte(centralServiceRefuelingLogs.refuelDate, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(centralServiceRefuelingLogs.refuelDate, filters.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        siteName: centralServiceRefuelingLogs.siteName,
        fuelAmountLiters: centralServiceRefuelingLogs.fuelAmountLiters,
      })
      .from(centralServiceRefuelingLogs)
      .where(whereClause);

    let totalLiters = 0;
    const siteMap: Record<string, { totalLiters: number; fillCount: number }> = {};

    for (const r of rows) {
      const liters = Number(r.fuelAmountLiters) || 0;
      totalLiters += liters;

      const site = r.siteName || "Unknown";
      if (!siteMap[site]) {
        siteMap[site] = { totalLiters: 0, fillCount: 0 };
      }
      siteMap[site].totalLiters += liters;
      siteMap[site].fillCount += 1;
    }

    const siteBreakdown = Object.entries(siteMap).map(([siteName, val]) => ({
      siteName,
      totalLiters: Math.round(val.totalLiters * 100) / 100,
      fillCount: val.fillCount,
    })).sort((a, b) => b.totalLiters - a.totalLiters);

    const topSite = siteBreakdown.length > 0 ? siteBreakdown[0] : null;
    const totalRecords = rows.length;
    const avgLitersPerFill = totalRecords > 0 ? Math.round((totalLiters / totalRecords) * 100) / 100 : 0;

    return {
      totalRecords,
      totalLiters: Math.round(totalLiters * 100) / 100,
      avgLitersPerFill,
      topSite,
      siteBreakdown,
    };
  } catch (error) {
    console.error("[getRefuelingSummaryKPI] error:", error);
    return {
      totalRecords: 0,
      totalLiters: 0,
      avgLitersPerFill: 0,
      topSite: null,
      siteBreakdown: [],
    };
  }
}

/**
 * Update an existing Re-Fueling log record (Restricted to Super Admin / canEdit)
 */
export async function updateRefuelingLog(id: number, data: Partial<NewCentralServiceRefuelingLog>) {
  try {
    const userCtx = await getCurrentRefuelingUserContext();
    if (!userCtx.isSuperAdmin && !userCtx.canEdit) {
      return {
        success: false,
        message: "Akses ditolak: Hanya Super Admin / Pengelola yang berhak mengedit data riwayat.",
      };
    }

    const payload: Record<string, any> = {
      ...data,
      updatedAt: new Date(),
    };
    if (data.fuelAmountLiters !== undefined) {
      const litersStr = String(data.fuelAmountLiters).replace(",", ".");
      payload.fuelAmountLiters = isNaN(Number(litersStr)) ? "0" : Number(litersStr).toFixed(2);
    }
    if (data.odometerKm !== undefined) {
      payload.odometerKm = Math.round(Number(data.odometerKm) || 0);
    }

    const [updated] = await db
      .update(centralServiceRefuelingLogs)
      .set(payload)
      .where(eq(centralServiceRefuelingLogs.id, id))
      .returning();

    safeRevalidate("/dashboard/central-service/refueling");

    return {
      success: true,
      message: "Data Re-Fueling berhasil diperbarui.",
      data: updated,
    };
  } catch (error) {
    console.error("[updateRefuelingLog] error:", error);
    return {
      success: false,
      message: "Gagal memperbarui data Re-Fueling.",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Delete a Re-Fueling log record (Restricted to Super Admin / canEdit)
 */
export async function deleteRefuelingLog(id: number) {
  try {
    const userCtx = await getCurrentRefuelingUserContext();
    if (!userCtx.isSuperAdmin && !userCtx.canEdit) {
      return {
        success: false,
        message: "Akses ditolak: Hanya Super Admin / Pengelola yang berhak menghapus data riwayat.",
      };
    }

    await db
      .delete(centralServiceRefuelingLogs)
      .where(eq(centralServiceRefuelingLogs.id, id));

    safeRevalidate("/dashboard/central-service/refueling");

    return {
      success: true,
      message: "Data Re-Fueling berhasil dihapus.",
    };
  } catch (error) {
    console.error("[deleteRefuelingLog] error:", error);
    return {
      success: false,
      message: "Gagal menghapus data Re-Fueling.",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Bulk Import Re-Fueling records from Google Form Excel/CSV
 */
export async function importRefuelingGFormRecords(records: Array<{
  timestamp?: string;
  siteName: string;
  driverName: string;
  refuelDate: string;
  unitNumber: string;
  odometerKm: number | string;
  fuelExpenditureType?: string;
  fuelAmountLiters: string | number;
  fuelmanName: string;
  odometerPhotoUrl?: string;
  flowmeterPhotoUrl?: string;
  remarks?: string;
}>) {
  try {
    if (!records || records.length === 0) {
      return { success: false, message: "Tidak ada baris data untuk diimpor." };
    }

    const valuesToInsert: NewCentralServiceRefuelingLog[] = records.map((r) => {
      const litersStr = String(r.fuelAmountLiters || "0").replace(",", ".");
      const numericLiters = isNaN(Number(litersStr)) ? "0" : Number(litersStr).toFixed(2);

      let recordTimestamp: Date = new Date();
      if (r.timestamp) {
        const parsed = new Date(r.timestamp);
        if (!isNaN(parsed.getTime())) {
          recordTimestamp = parsed;
        }
      }

      return {
        timestamp: recordTimestamp,
        siteName: (r.siteName || "Unknown").trim(),
        driverName: (r.driverName || "-").trim(),
        refuelDate: r.refuelDate || new Date().toISOString().split("T")[0],
        unitNumber: (r.unitNumber || "-").trim(),
        odometerKm: Math.round(Number(String(r.odometerKm || "0").replace(/[^0-9]/g, "")) || 0),
        fuelExpenditureType: r.fuelExpenditureType || "Di bebankan ke PT Chitra Paratama (Internal)",
        fuelAmountLiters: numericLiters,
        fuelmanName: (r.fuelmanName || "-").trim(),
        odometerPhotoUrl: r.odometerPhotoUrl || null,
        flowmeterPhotoUrl: r.flowmeterPhotoUrl || null,
        remarks: (r.remarks || "").trim(),
      };
    });

    // Chunk insert in batches of 100 for optimal performance
    const chunkSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < valuesToInsert.length; i += chunkSize) {
      const chunk = valuesToInsert.slice(i, i + chunkSize);
      await db.insert(centralServiceRefuelingLogs).values(chunk);
      insertedCount += chunk.length;
    }

    safeRevalidate("/dashboard/central-service/refueling");

    return {
      success: true,
      message: `Berhasil mengimpor ${insertedCount} data pengisian bahan bakar!`,
      insertedCount,
    };
  } catch (error) {
    console.error("[importRefuelingGFormRecords] error:", error);
    return {
      success: false,
      message: "Gagal mengimpor data Google Form ke database.",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
