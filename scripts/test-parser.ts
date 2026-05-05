import { readFile } from "fs/promises";
import { parseOTRecordExcel } from "@/lib/timesheet/parse-ot-record";

async function testParser() {
  console.log("Testing OT Record parser...");

  const buffer = await readFile("test_ot_record_vale.xlsx");
  const result = parseOTRecordExcel(buffer);

  console.log("Parsed " + result.employees.length + " employees");
  console.log("Errors: " + result.errors.length);

  for (const emp of result.employees) {
    console.log("Employee: " + emp.name + " (SN: " + emp.sn + ")");
    console.log("  Department: " + emp.department);
    console.log("  Month/Year: " + emp.month + "/" + emp.year);
    console.log("  Total OT: " + emp.totalOTHours + " hours");
    console.log("  Daily records: " + emp.dailyRecords.length);
    
    emp.dailyRecords.forEach((r, idx) => {
      if (r.date || r.status) {
        const dateStr = r.date ? r.date.toLocaleDateString() : "N/A";
        const otStr = r.totalOT || r.status || "none";
        console.log("    Day " + (idx + 1) + ": " + dateStr + " - OT: " + otStr);
      }
    });
    console.log("");
  }

  if (result.errors.length > 0) {
    console.log("Errors:");
    result.errors.forEach((err) => {
      console.log("  - " + err.sheet + ": " + err.message);
    });
  }
}

testParser().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
