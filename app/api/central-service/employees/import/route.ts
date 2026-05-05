import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { centralServiceEmployees, centralServiceEmployeeImports } from "@/db/schema/central-service";
import * as XLSX from "xlsx";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const batchId = `import_${Date.now()}`;

    // Save file
    const uploadDir = join(process.cwd(), "uploads", "central-service", "employees");
    await mkdir(uploadDir, { recursive: true });
    const filename = `${batchId}_${file.name}`;
    const filePath = join(uploadDir, filename);
    await writeFile(filePath, buffer);

    // Parse Excel
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(sheet);

    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const errors: string[] = [];

    // Create import record
    const [importRecord] = await db
      .insert(centralServiceEmployeeImports)
      .values({
        batchId,
        originalFilename: file.name,
        fileStoragePath: filePath,
        totalRows: rows.length,
        status: "processing",
        uploadedByUserId: userId,
      })
      .returning();

    // Process rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Map Excel columns to database fields
        const employeeData = {
          employeeSn: String(row["SN"] || row["Employee SN"] || row["NIK"] || "").trim(),
          fullName: String(row["Name"] || row["Full Name"] || row["Nama"] || "").trim(),
          nickname: String(row["Nickname"] || row["Nama Panggilan"] || "").trim() || null,
          email: String(row["Email"] || "").trim() || null,
          phoneNumber: String(row["Phone"] || row["Phone Number"] || row["No HP"] || "").trim() || null,
          siteName: String(row["Site"] || row["Site Name"] || row["Lokasi"] || "").trim(),
          section: String(row["Section"] || row["Seksi"] || "").trim(),
          department: String(row["Department"] || row["Departemen"] || "").trim(),
          position: String(row["Position"] || row["Jabatan"] || "").trim(),
          employmentStatus: String(row["Status"] || row["Employment Status"] || "active").toLowerCase(),
          employmentType: String(row["Type"] || row["Employment Type"] || "permanent").toLowerCase(),
          idCardNumber: String(row["ID Card"] || row["KTP"] || "").trim() || null,
          birthDate: row["Birth Date"] || row["Tanggal Lahir"] || null,
          birthPlace: String(row["Birth Place"] || row["Tempat Lahir"] || "").trim() || null,
          address: String(row["Address"] || row["Alamat"] || "").trim() || null,
          joinDate: row["Join Date"] || row["Tanggal Masuk"] || null,
          importBatchId: batchId,
          importedAt: new Date(),
        };

        if (!employeeData.employeeSn || !employeeData.fullName) {
          errors.push(`Row ${i + 1}: Missing required fields (SN or Name)`);
          errorCount++;
          continue;
        }

        // Check for duplicate SN
        const [existing] = await db
          .select()
          .from(centralServiceEmployees)
          .where(eq(centralServiceEmployees.employeeSn, employeeData.employeeSn))
          .limit(1);

        if (existing) {
          duplicateCount++;
          continue;
        }

        // Insert employee
        await db.insert(centralServiceEmployees).values(employeeData);
        successCount++;
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`);
        errorCount++;
      }
    }

    // Update import record
    await db
      .update(centralServiceEmployeeImports)
      .set({
        successCount,
        errorCount,
        duplicateCount,
        status: errorCount > 0 ? "completed" : "completed",
        errorLog: errors.length > 0 ? errors.join("\n") : null,
        processedAt: new Date(),
      })
      .where(eq(centralServiceEmployeeImports.id, importRecord.id));

    return NextResponse.json({
      success: true,
      importId: importRecord.id,
      batchId,
      totalRows: rows.length,
      successCount,
      errorCount,
      duplicateCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
