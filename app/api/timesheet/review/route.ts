import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { timesheetDailyRecords, timesheetValidationIssues } from "@/db/schema/timesheet";
import { getServerSession } from "@/lib/auth-session";
import { eq, and } from "drizzle-orm";

async function requireTimesheetAccess() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const [employee] = await db
    .select({ accessRole: employees.accessRole })
    .from(employees)
    .where(eq(employees.email, session.user.email.trim().toLowerCase()))
    .limit(1);

  const allowedRoles = new Set(["Super Admin", "Admin", "HC Admin", "HR Admin", "Site Admin", "Payroll Admin"]);
  if (!employee?.accessRole || !allowedRoles.has(employee.accessRole)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session };
}

/**
 * GET /api/timesheet/review?siteId=1&periodMonth=4&periodYear=2026
 * Get timesheet data for review with validation issues
 */
export async function GET(request: NextRequest) {
  try {
    const access = await requireTimesheetAccess();
    if (access.error) return access.error;

    const { searchParams } = new URL(request.url);
    const siteId = parseInt(searchParams.get("siteId") || "");
    const periodMonth = parseInt(searchParams.get("periodMonth") || "");
    const periodYear = parseInt(searchParams.get("periodYear") || "");

    if (!siteId || !periodMonth || !periodYear) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Get all records for this site and period
    const records = await db
      .select()
      .from(timesheetDailyRecords)
      .where(
        and(
          eq(timesheetDailyRecords.siteId, siteId)
        )
      );

    // Group by employee
    const employeeMap = new Map<string, typeof records>();
    for (const record of records) {
      const key = record.employeeSn;
      if (!employeeMap.has(key)) {
        employeeMap.set(key, []);
      }
      employeeMap.get(key)!.push(record);
    }

    // Get validation issues
    const issues = await db
      .select()
      .from(timesheetValidationIssues)
      .where(eq(timesheetValidationIssues.isResolved, false));

    // Format response
    const employees = Array.from(employeeMap.entries()).map(([sn, empRecords]) => {
      const firstRecord = empRecords[0];
      return {
        sn,
        name: firstRecord.employeeName,
        department: firstRecord.department,
        recordCount: empRecords.length,
        records: empRecords.sort((a, b) => a.dayOfMonth - b.dayOfMonth),
      };
    });

    return NextResponse.json({
      success: true,
      employees,
      validationIssues: issues,
      totalEmployees: employees.length,
      totalRecords: records.length,
    });
  } catch (error) {
    console.error("Review error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Review failed" },
      { status: 500 }
    );
  }
}
