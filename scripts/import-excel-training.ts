import * as XLSX from "xlsx";
import * as path from "path";
import { db } from "../db";
import { employees, trainingRecords } from "../db/schema/hero";
import { eq, and } from "drizzle-orm";
import Fuse from "fuse.js";

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  console.log(`=== Training Records Import ===`);
  console.log(`Mode: ${isDryRun ? "DRY RUN (No database write)" : "PRODUCTION (Writing to database)"}`);

  const filePath = path.resolve(__dirname, "..", "Training_Record_Import (1).xlsx");
  console.log("Reading file:", filePath);
  
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
  
  // Row 2 is the header
  const headers = rawRows[2] as string[];
  console.log("Headers:", headers);
  
  const dataRows = rawRows.slice(3).map((row: any) => {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] !== undefined ? row[index] : "";
    });
    return obj;
  }).filter((r: any) => r["Nama Karyawan"] || r["Training / Program"]);

  console.log(`Total rows in Excel: ${dataRows.length}`);

  // Fetch employees from DB
  const dbEmployees = await db.select().from(employees);
  console.log(`Total employees in DB: ${dbEmployees.length}`);

  // Normalize spelling and M-prefix variations
  const normalize = (str: string) => {
    let s = str.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
    const words = s.split(" ");
    if (words.length > 0) {
      const first = words[0];
      if (first === "m" || first === "muhammad" || first === "mohammad" || first === "muhamad" || first === "mochamad" || first === "moch") {
        words[0] = "m";
      }
      s = words.join(" ");
    }
    return s;
  };

  // Setup Fuse.js on normalized names
  const fuse = new Fuse(dbEmployees.map(emp => ({
    ...emp,
    normalizedName: normalize(emp.name)
  })), {
    keys: ["normalizedName"],
    threshold: 0.35,
    includeScore: true,
  });

  let matchedCount = 0;
  let unmatchedCount = 0;
  let insertedCount = 0;
  let updatedCount = 0;

  const unmatchedNames = new Set<string>();

  for (const row of dataRows) {
    const rawName = String(row["Nama Karyawan"] || "").trim();
    if (!rawName) continue;

    // 1. Exact normalized match
    const normName = normalize(rawName);
    let matchedEmp = dbEmployees.find(e => normalize(e.name) === normName);

    // 2. Fuzzy matching if no normalized match
    if (!matchedEmp) {
      const results = fuse.search(normName);
      if (results.length > 0 && (results[0].score ?? 1) <= 0.35) {
        matchedEmp = results[0].item;
      }
    }

    if (!matchedEmp) {
      unmatchedCount++;
      unmatchedNames.add(rawName);
      continue;
    }

    matchedCount++;

    const trainingName = String(row["Training / Program"] || "").trim();
    const provider = String(row["Provider / Vendor"] || "").trim() || "-";
    const completedYearVal = String(row["Tahun"] || "").trim();
    const completedYear = parseInt(completedYearVal, 10) || new Date().getFullYear();
    const expiredAtVal = row["Expired At"];
    const statusVal = String(row["Status"] || "").trim() || "active";

    if (!trainingName) {
      continue;
    }

    let expiresAt: Date | null = null;
    if (expiredAtVal) {
      if (typeof expiredAtVal === "number") {
        expiresAt = new Date((expiredAtVal - 25569) * 86400 * 1000);
      } else {
        const parsedDate = new Date(String(expiredAtVal).trim());
        if (!isNaN(parsedDate.getTime())) {
          expiresAt = parsedDate;
        }
      }
    }

    if (!isDryRun) {
      // Check if this record already exists
      const existing = await db
        .select()
        .from(trainingRecords)
        .where(
          and(
            eq(trainingRecords.employeeId, matchedEmp.id),
            eq(trainingRecords.trainingName, trainingName),
            eq(trainingRecords.completedYear, completedYear)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update
        await db
          .update(trainingRecords)
          .set({
            provider,
            expiresAt,
            status: statusVal,
          })
          .where(eq(trainingRecords.id, existing[0].id));
        updatedCount++;
      } else {
        // Insert
        await db.insert(trainingRecords).values({
          employeeId: matchedEmp.id,
          trainingName,
          provider,
          completedYear,
          expiresAt,
          status: statusVal,
        });
        insertedCount++;
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Matched Rows (exact normalized + Fuse 0.35 with M-first-word normalization): ${matchedCount}`);
  console.log(`Unmatched Rows (skipped): ${unmatchedCount}`);
  console.log(`Distinct unmatched names: ${unmatchedNames.size}`);
  if (unmatchedNames.size > 0) {
    console.log("Sample unmatched names:", Array.from(unmatchedNames).slice(0, 20));
  }
  if (!isDryRun) {
    console.log(`Inserted: ${insertedCount}`);
    console.log(`Updated: ${updatedCount}`);
  }
}

main().catch(console.error);
