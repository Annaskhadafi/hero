import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { timesheetImports, timesheetDailyRecords, timesheetValidationIssues } from "@/db/schema/timesheet";
import { parseOTRecordExcel } from "@/lib/timesheet/parse-ot-record";
import { parseSPLRecordExcel } from "@/lib/timesheet/parse-spl-record";
import { validateOTTotal } from "@/lib/timesheet/calculation";
import { getServerSession } from "@/lib/auth-session";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { eq } from "drizzle-orm";

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

function sanitizeUploadFileName(fileName: string) {
  const sanitized = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^_+/, "")
    .slice(0, 120);

  return sanitized || "timesheet-upload.xlsx";
}

/**
 * POST /api/timesheet/upload
 * Upload and process OT Record or SPL Record Excel file
 */
export async function POST(request: NextRequest) {
  try {
    const access = await requireTimesheetAccess();
    if (access.error) return access.error;

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const siteId = parseInt(formData.get("siteId") as string);
    const importType = formData.get("importType") as "ot_record" | "spl_record";
    const periodMonth = parseInt(formData.get("periodMonth") as string);
    const periodYear = parseInt(formData.get("periodYear") as string);
    const userId = access.session.user.id;

    if (!file || !siteId || !importType || !periodMonth || !periodYear) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Save file to storage
    const uploadDir = join(process.cwd(), "uploads", "timesheet", String(periodYear), String(periodMonth));
    await mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now()}_${sanitizeUploadFileName(file.name)}`;
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Create import record
    const [importRecord] = await db
      .insert(timesheetImports)
      .values({
        siteId,
        periodMonth,
        periodYear,
        importType,
        originalFilename: file.name,
        fileStoragePath: filePath,
        status: "processing",
        uploadedByUserId: userId,
      })
      .returning();

    // Parse Excel file
    let parseResult;
    if (importType === "ot_record") {
      parseResult = parseOTRecordExcel(buffer);
    } else {
      parseResult = parseSPLRecordExcel(buffer);
    }

    // Process parsed data
    const totalSheets = parseResult.employees.length;
    let processedSheets = 0;
    let totalRecords = 0;
    const errors: Array<{ sheet: string; message: string }> = [];

    for (const employee of parseResult.employees) {
      try {
        // Insert daily records
        for (const dailyRecord of employee.dailyRecords) {
          if (!dailyRecord.date) continue;

          const recordData: any = {
            importId: importRecord.id,
            siteId,
            employeeSn: employee.sn,
            employeeName: employee.name,
            department: employee.department,
            recordDate: dailyRecord.date.toISOString().split("T")[0],
            dayOfMonth: dailyRecord.date.getDate(),
          };

          if (importType === "ot_record") {
            recordData.otHours = (dailyRecord as any).totalOT?.toString() || null;
            recordData.otStatus = dailyRecord.status;
            recordData.otRemark = dailyRecord.remark;
          } else {
            recordData.msaAmount = (dailyRecord as any).msaAmount;
            recordData.mealsAmount = (dailyRecord as any).mealsAmount;
            recordData.tlkAmount = (dailyRecord as any).tlkAmount;
            recordData.allowanceStatus = dailyRecord.status;
          }

          await db.insert(timesheetDailyRecords).values(recordData);
          totalRecords++;
        }

        // Validate OT total if OT record
        if (importType === "ot_record") {
          const validation = validateOTTotal(
            (employee as any).totalOTHours,
            employee.dailyRecords.map((r) => ({ otHours: (r as any).totalOT }))
          );

          if (!validation.valid) {
            await db.insert(timesheetValidationIssues).values({
              importId: importRecord.id,
              issueType: "warning",
              severity: "medium",
              employeeSn: employee.sn,
              employeeName: employee.name,
              message: `OT total mismatch: declared ${(employee as any).totalOTHours}, calculated ${validation.calculatedTotal}`,
              details: { difference: validation.difference },
            });
          }
        }

        processedSheets++;
      } catch (error) {
        errors.push({
          sheet: employee.sheetName,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Add parse errors
    errors.push(...parseResult.errors);

    // Update import record
    await db
      .update(timesheetImports)
      .set({
        status: errors.length > 0 ? "completed" : "completed",
        totalSheets,
        processedSheets,
        totalRecords,
        errorCount: errors.length,
        errorLog: errors.length > 0 ? errors : null,
        processedAt: new Date(),
      })
      .where(eq(timesheetImports.id, importRecord.id));

    return NextResponse.json({
      success: true,
      importId: importRecord.id,
      totalSheets,
      processedSheets,
      totalRecords,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
