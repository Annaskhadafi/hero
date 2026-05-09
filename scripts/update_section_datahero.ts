import { readFileSync } from "fs";
process.env.DATABASE_SSL = "false";
import { db } from "../db";
import { centralServiceEmployees } from "../db/schema/central-service";
import { eq } from "drizzle-orm";

async function main() {
  let fileContent = readFileSync("d:\\[01] PROJECT\\HERO\\datahero.csv", "utf-8");
  if (fileContent.charCodeAt(0) === 0xFEFF) {
    fileContent = fileContent.slice(1);
  }
  const lines = fileContent.split(/\r?\n/).filter((line) => line.trim() !== "");
  
  if (lines.length < 2) {
    console.log("File is empty or has only headers");
    process.exit(0);
  }

  const headers = lines[0].split(";");
  const records = lines.slice(1).map((line) => {
    const values = line.split(";");
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = values[index];
    });
    return record;
  });

  console.log(`Updating ${records.length} records in CSV`);

  let count = 0;
  for (const record of records) {
    const sn = record["Employee ID"];
    if (!sn) continue; // skip invalid rows

    const section = record["Section"]?.trim() || "";
    
    if (section) {
      await db.update(centralServiceEmployees)
        .set({ section })
        .where(eq(centralServiceEmployees.employeeSn, sn));
      count++;
    }
  }

  console.log(`Update completed for ${count} employees with section data!`);
  process.exit(0);
}

main().catch(console.error);
