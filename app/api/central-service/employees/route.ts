import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";
import { employees as heroEmployees } from "@/db/schema/hero";
import { eq, ilike, or, desc } from "drizzle-orm";

/**
 * GET /api/central-service/employees
 * List all Central Service employees with filters.
 * Section is enriched from hero_employees (User Management) matched by email.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const syncStatus = searchParams.get("syncStatus") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = db.select().from(centralServiceEmployees);

    // Apply filters
    const conditions = [];

    // Always filter by Central Service department (with variations)
    conditions.push(
      or(
        eq(centralServiceEmployees.department, "Central Services"),
        eq(centralServiceEmployees.department, "CENTRAL SERVICES"),
        eq(centralServiceEmployees.department, "Central Service")
      )
    );

    if (search) {
      conditions.push(
        or(
          ilike(centralServiceEmployees.fullName, `%${search}%`),
          ilike(centralServiceEmployees.employeeSn, `%${search}%`),
          ilike(centralServiceEmployees.email, `%${search}%`)
        )
      );
    }

    if (status) {
      conditions.push(eq(centralServiceEmployees.employmentStatus, status));
    }

    if (syncStatus === "synced") {
      conditions.push(eq(centralServiceEmployees.isSyncedToUserManagement, true));
    } else if (syncStatus === "unsynced") {
      conditions.push(eq(centralServiceEmployees.isSyncedToUserManagement, false));
    }

    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : or(...conditions));
    }

    // Get total count
    const allResults = await query;
    const total = allResults.length;

    // Apply pagination
    const offset = (page - 1) * limit;
    const employees = await query
      .orderBy(desc(centralServiceEmployees.createdAt))
      .limit(limit)
      .offset(offset);

    // Count synced vs unsynced
    const syncedCount = employees.filter((e) => e.isSyncedToUserManagement).length;
    const unsyncedCount = employees.filter((e) => !e.isSyncedToUserManagement).length;

    // Enrich section from User Management (hero_employees) matched by employeeSn.
    // hero_employees may store SN as "EMP-51468" while centralServiceEmployees stores "51468" — try both.
    const snList = employees.map((e) => e.employeeSn).filter(Boolean);
    const sectionBySn: Record<string, string> = {};
    if (snList.length > 0) {
      const snVariants = snList.flatMap((sn) => [sn, `EMP-${sn}`, sn.replace(/^EMP-/i, "")]);
      const uniqueVariants = [...new Set(snVariants)];
      const heroRows = await db
        .select({ employeeSn: heroEmployees.employeeSn, section: heroEmployees.section })
        .from(heroEmployees)
        .where(or(...uniqueVariants.map((sn) => eq(heroEmployees.employeeSn, sn))));
      for (const row of heroRows) {
        const plainSn = row.employeeSn.replace(/^EMP-/i, "");
        sectionBySn[row.employeeSn] = row.section;
        sectionBySn[plainSn] = row.section;
      }
    }

    const enriched = employees.map((emp) => ({
      ...emp,
      section: sectionBySn[emp.employeeSn] ?? sectionBySn[`EMP-${emp.employeeSn}`] ?? "",
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        synced: syncedCount,
        unsynced: unsyncedCount,
      },
    });
  } catch (error) {
    console.error("List employees error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list employees" },
      { status: 500 }
    );
  }
}


/**
 * POST /api/central-service/employees
 * Create new employee
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const [employee] = await db
      .insert(centralServiceEmployees)
      .values({
        employeeSn: body.employeeSn,
        fullName: body.fullName,
        nickname: body.nickname,
        email: body.email,
        phoneNumber: body.phoneNumber,
        siteId: body.siteId,
        siteName: body.siteName,
        department: body.department,
        position: body.position,
        employmentStatus: body.employmentStatus || "active",
        employmentType: body.employmentType || "permanent",
        idCardNumber: body.idCardNumber,
        birthDate: body.birthDate,
        birthPlace: body.birthPlace,
        address: body.address,
        joinDate: body.joinDate,
        notes: body.notes || "",
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Create employee error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create employee" },
      { status: 500 }
    );
  }
}
