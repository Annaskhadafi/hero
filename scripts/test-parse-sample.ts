/**
 * Test parser with sample SUMMARY LEMBURAN.xlsx
 * Extract data to understand structure before creating mock input files
 */

import { readFile } from "fs/promises";
import * as XLSX from "xlsx";

async function analyzeSampleFile() {
  console.log("Analyzing SUMMARY LEMBURAN.xlsx...\n");

  const buffer = await readFile("SUMMARY LEMBURAN.xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  console.log(`Total sheets: ${workbook.SheetNames.length}\n`);

  // Analyze VALE sheet in detail
  const valeSheet = workbook.Sheets["VALE"];
  if (valeSheet) {
    console.log("=== VALE Sheet Analysis ===");
    const rows = XLSX.utils.sheet_to_json<any>(valeSheet, { header: 1, defval: null });
    
    console.log(`Total rows: ${rows.length}\n`);
    
    // Find all section headers
    console.log("Section headers:");
    rows.forEach((row, idx) => {
      if (row[0] && typeof row[0] === "string" && row[0].includes("SUMMARY")) {
        console.log(`  Row ${idx + 1}: ${row[0]}`);
      }
    });

    // Sample employee from OT section (around row 5-10)
    console.log("\nSample OT records (rows 5-10):");
    for (let i = 4; i < 10; i++) {
      const row = rows[i];
      if (row) {
        console.log(`  Row ${i + 1}: No=${row[0]}, Name=${row[1]}, SN=${row[2]}, Day1=${row[4]}, Day2=${row[5]}, Day3=${row[6]}`);
      }
    }

    // Sample employee from MSA section (around row 58-63)
    console.log("\nSample MSA records (rows 58-63):");
    for (let i = 57; i < 63; i++) {
      const row = rows[i];
      if (row) {
        console.log(`  Row ${i + 1}: No=${row[0]}, Name=${row[1]}, SN=${row[2]}, Day1=${row[4]}, Day2=${row[5]}, Day3=${row[6]}`);
      }
    }
  }

  console.log("\n=== All Sheet Names ===");
  workbook.SheetNames.forEach((name, idx) => {
    console.log(`${idx + 1}. ${name}`);
  });
}

analyzeSampleFile()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
