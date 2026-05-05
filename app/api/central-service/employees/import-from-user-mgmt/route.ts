import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { centralServiceEmployees } from "@/db/schema/central-service";
import { employees } from "@/db/schema/hero";
import { eq } from "drizzle-orm";

/**
 * POST /api/central-service/employees/import-from-user-mgmt
 * Import existing employees from User Management to Central Service
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { department } = body;

    // Get all employees from User Management
    let query = db.select().from(employees).where(eq(employees.isActive, true));
    
    // Filter by department if provided
    if (department) {
      query = query.where(eq(employees.department, department));
    }

    const userMgmtEmployees = await query;

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const emp of userMgmtEmployees) {
      try {
        // Check if already exists in Central Service
        const [existing] = await db
          .select()
          .from(centralServiceEmployees)
          .where(eq(centralServiceEmployees.employeeSn, emp.employeeSn))
          .limit(1);

        if (existing) {
          skippedCount++;
          continue;
        }

        // Import to Central Service
        await db.insert(centralServiceEmployees).values({
          employeeSn: emp.employeeSn,
          fullName: emp.name,
          email: emp.email,
          phoneNumber: emp.phoneNumber,
          siteId: emp.siteId,
          siteName: emp.workLocation,
          department: emp.department,
          position: emp.jobTitle,
          employmentStatus: emp.employmentStatus,
          employmentType: "permanent",
          authUserId: emp.authUserId,
          isSyncedToUserManagement: true,
          syncedAt: new Date(),
        });

        importedCount++;
      } catch (error) {
        errors.push(`Employee ${emp.employeeSn}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalProcessed: userMgmtEmployees.length,
      importedCount,
      skippedCount,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Import from User Management error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
