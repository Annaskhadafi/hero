import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { timesheetSummaryOutputs } from "@/db/schema/timesheet";
import { getServerSession } from "@/lib/auth-session";
import { eq } from "drizzle-orm";
import { readFile } from "fs/promises";

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
 * GET /api/timesheet/download/[id]
 * Download generated summary Excel file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireTimesheetAccess();
    if (access.error) return access.error;

    const { id: idStr } = await params;
    const outputId = parseInt(idStr);

    if (!outputId) {
      return NextResponse.json(
        { error: "Invalid output ID" },
        { status: 400 }
      );
    }

    // Get output record
    const [output] = await db
      .select()
      .from(timesheetSummaryOutputs)
      .where(eq(timesheetSummaryOutputs.id, outputId))
      .limit(1);

    if (!output) {
      return NextResponse.json(
        { error: "Output not found" },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = await readFile(output.fileStoragePath);

    // Return file
    return new NextResponse(fileBuffer as any, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${output.outputFilename}"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Download failed" },
      { status: 500 }
    );
  }
}
