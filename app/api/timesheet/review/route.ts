import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { timesheetDailyRecords, timesheetValidationIssues } from "@/db/schema/timesheet";
import { eq, and } from "drizzle-orm";

/**
 * GET /api/timesheet/review?siteId=1&periodMonth=4&periodYear=2026
 * Get timesheet data for review with validation issues
 */
export async function GET(request: NextRequest) {
  try {
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
