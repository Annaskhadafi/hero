import { db } from "@/db";
import { employees } from "@/db/schema/hero";
import { userImportHistory } from "@/db/schema/user-management";
import { eq } from "drizzle-orm";
import { parseCsv, getMappedValue, type UserImportMapping } from "@/lib/security-user-import";

export type ImportRowError = {
  row: number;
  field?: string;
  value?: string;
  reason: string;
};

export type EnhancedImportResult = {
  status: "success" | "error" | "partial";
  message: string;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: ImportRowError[];
  historyId?: number;
};

export async function importUsersWithDetailedErrors(params: {
  csvText: string;
  mapping: UserImportMapping;
  importedByEmployeeId?: number;
  fileName?: string;
}): Promise<EnhancedImportResult> {
  const errors: ImportRowError[] = [];
  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  try {
    const rows = parseCsv(params.csvText);

    if (rows.length === 0) {
      return {
        status: "error",
        message: "CSV file is empty",
        importedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        errors: [],
      };
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    for (let i = 0; i < dataRows.length; i++) {
      const rowIndex = i + 2;
      const row = dataRows[i];

      try {
        const email = getMappedValue(row, headers, params.mapping, "email");
        const fullName = getMappedValue(row, headers, params.mapping, "fullName");

        if (!email || !email.trim()) {
          errors.push({
            row: rowIndex,
            field: "email",
            value: email,
            reason: "Email is required",
          });
          skippedCount++;
          continue;
        }

        if (!fullName || !fullName.trim()) {
          errors.push({
            row: rowIndex,
            field: "fullName",
            value: fullName,
            reason: "Full name is required",
          });
          skippedCount++;
          continue;
        }

        const [existingUser] = await db
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.email, email.toLowerCase().trim()))
          .limit(1);

        if (existingUser) {
          updatedCount++;
        } else {
          importedCount++;
        }
      } catch (error) {
        errors.push({
          row: rowIndex,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
        skippedCount++;
      }
    }

    const totalProcessed = importedCount + updatedCount;
    const status = errors.length === 0 ? "success" : totalProcessed > 0 ? "partial" : "error";

    return {
      status,
      message: errors.length === 0 ? `Successfully imported ${importedCount} and updated ${updatedCount} users` : `Processed ${totalProcessed} users with ${errors.length} errors`,
      importedCount,
      updatedCount,
      skippedCount,
      errorCount: errors.length,
      errors: errors.slice(0, 100),
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Failed to process import",
      importedCount,
      updatedCount,
      skippedCount,
      errorCount: errors.length,
      errors,
    };
  }
}

