import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { timesheetDailyRecords, timesheetSiteConfigs, timesheetSummaryOutputs } from "@/db/schema/timesheet";
import { sites } from "@/db/schema/hero";
import { generateSummaryExcel, type SummarySiteSheet, type SummaryEmployeeData } from "@/lib/timesheet/generate-summary";
import { determineDailyStatus, formatOTHours } from "@/lib/timesheet/calculation";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/timesheet/generate
 * Generate Summary Lemburan Excel for a specific period
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { periodMonth, periodYear, userId } = body;

    if (!periodMonth || !periodYear) {
      return NextResponse.json(
        { error: "Missing period month/year" },
        { status: 400 }
      );
    }

    // Get all sites with timesheet data for this period
    const allSites = await db
      .select()
      .from(sites)
      .where(eq(sites.isActive, true));

    const sheets: SummarySiteSheet[] = [];

    for (const site of allSites) {
      // Get site config
      const [siteConfig] = await db
        .select()
        .from(timesheetSiteConfigs)
        .where(eq(timesheetSiteConfigs.siteId, site.id))
        .limit(1);

      if (!siteConfig) continue;

      // Get all daily records for this site and period
      const records = await db
        .select()
        .from(timesheetDailyRecords)
        .where(
          and(
            eq(timesheetDailyRecords.siteId, site.id),
            eq(timesheetDailyRecords.dayOfMonth, periodMonth)
          )
        );

      if (records.length === 0) continue;

      // Group by employee
      const employeeMap = new Map<string, typeof records>();
      for (const record of records) {
        const key = record.employeeSn;
        if (!employeeMap.has(key)) {
          employeeMap.set(key, []);
        }
        employeeMap.get(key)!.push(record);
      }

      // Build OT Summary
      const otSummary: SummaryEmployeeData[] = [];
      const msaSummary: SummaryEmployeeData[] = [];
      const mealsSummary: SummaryEmployeeData[] = [];
      const tlkSummary: SummaryEmployeeData[] = [];

      let empNo = 1;
      for (const [sn, empRecords] of employeeMap.entries()) {
        const firstRecord = empRecords[0];
        const name = firstRecord.employeeName;
        const loc = siteConfig.siteCode;

        // Build daily arrays (31 days)
        const otDaily: Array<string | number | null> = Array(31).fill(null);
        const msaDaily: Array<string | number | null> = Array(31).fill(null);
        const mealsDaily: Array<string | number | null> = Array(31).fill(null);
        const tlkDaily: Array<string | number | null> = Array(31).fill(null);

        let otTotal = 0;
        let msaTotal = 0;
        let mealsTotal = 0;
        let tlkTotal = 0;

        for (const record of empRecords) {
          const day = record.dayOfMonth - 1; // 0-indexed

          // Determine status
          const status = determineDailyStatus(
            record.otHours ? parseFloat(record.otHours) : null,
            record.otStatus,
            record.allowanceStatus,
            record.transferredToSite
          );

          // OT display
          if (status.otDisplay !== null) {
            if (typeof status.otDisplay === "number") {
              const formatted = formatOTHours(status.otDisplay, siteConfig.otDecimalMode);
              otDaily[day] = formatted;
              if (typeof formatted === "number") {
                otTotal += formatted;
              }
            } else {
              otDaily[day] = status.otDisplay;
            }
          }

          // MSA
          if (status.msaEligible && record.msaAmount) {
            msaDaily[day] = record.msaAmount;
            msaTotal += record.msaAmount;
          } else if (record.allowanceStatus) {
            msaDaily[day] = record.allowanceStatus;
          }

          // Meals
          if (status.mealsEligible && record.mealsAmount) {
            mealsDaily[day] = record.mealsAmount;
            mealsTotal += record.mealsAmount;
          } else if (record.allowanceStatus) {
            mealsDaily[day] = record.allowanceStatus;
          }

          // TLK
          if (status.tlkEligible && record.tlkAmount) {
            tlkDaily[day] = record.tlkAmount;
            tlkTotal += record.tlkAmount;
          } else if (record.allowanceStatus) {
            tlkDaily[day] = record.allowanceStatus;
          }
        }

        otSummary.push({
          no: empNo,
          name,
          sn,
          loc,
          dailyValues: otDaily,
          total: otTotal,
          remark: "NORMAL",
        });

        if (siteConfig.hasMsaSummary) {
          msaSummary.push({
            no: empNo,
            name,
            sn,
            loc,
            dailyValues: msaDaily,
            total: msaTotal,
            remark: "NORMAL",
          });
        }

        if (siteConfig.hasMealsSummary) {
          mealsSummary.push({
            no: empNo,
            name,
            sn,
            loc,
            dailyValues: mealsDaily,
            total: mealsTotal,
            remark: "NORMAL",
          });
        }

        if (siteConfig.hasTlkSummary) {
          tlkSummary.push({
            no: empNo,
            name,
            sn,
            loc,
            dailyValues: tlkDaily,
            total: tlkTotal,
            remark: "NORMAL",
          });
        }

        empNo++;
      }

      sheets.push({
        siteCode: siteConfig.siteCode,
        siteName: siteConfig.siteName,
        month: periodMonth,
        year: periodYear,
        otSummary,
        msaSummary,
        mealsSummary: siteConfig.hasMealsSummary ? mealsSummary : undefined,
        tlkSummary: siteConfig.hasTlkSummary ? tlkSummary : undefined,
      });
    }

    // Generate Excel
    const excelBuffer = generateSummaryExcel({ sheets });

    // Save to storage
    const outputDir = join(process.cwd(), "uploads", "timesheet", "output", String(periodYear));
    await mkdir(outputDir, { recursive: true });
    const filename = `Summary_Lemburan_${periodYear}_${String(periodMonth).padStart(2, "0")}.xlsx`;
    const filePath = join(outputDir, filename);
    await writeFile(filePath, excelBuffer);

    // Create output record
    const [outputRecord] = await db
      .insert(timesheetSummaryOutputs)
      .values({
        periodMonth,
        periodYear,
        outputFilename: filename,
        fileStoragePath: filePath,
        status: "draft",
        totalSites: sheets.length,
        totalEmployees: sheets.reduce((sum, s) => sum + s.otSummary.length, 0),
        generatedByUserId: userId,
      })
      .returning();

    return NextResponse.json({
      success: true,
      outputId: outputRecord.id,
      filename,
      totalSites: sheets.length,
      downloadUrl: `/api/timesheet/download/${outputRecord.id}`,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
