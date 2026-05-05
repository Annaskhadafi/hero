import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { timesheetSummaryOutputs } from "@/db/schema/timesheet";
import { eq } from "drizzle-orm";
import { readFile } from "fs/promises";

/**
 * GET /api/timesheet/download/[id]
 * Download generated summary Excel file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
