/**
 * Create mock OT Record Excel file for testing
 * Based on VALE data from SUMMARY LEMBURAN.xlsx
 */

import * as XLSX from "xlsx";
import { writeFile } from "fs/promises";

async function createMockOTRecord() {
  console.log("Creating mock OT Record file...\n");

  const workbook = XLSX.utils.book_new();

  // Sample employees from VALE
  const employees = [
    {
      name: "Fadel Muhammad",
      sn: "73759",
      department: "Maintenance",
      dailyRecords: [
        { date: new Date(2026, 3, 1), day: "Tuesday", totalOT: null, status: "OFF" },
        { date: new Date(2026, 3, 2), day: "Wednesday", totalOT: 5, status: null },
        { date: new Date(2026, 3, 3), day: "Thursday", totalOT: null, status: null },
        { date: new Date(2026, 3, 4), day: "Friday", totalOT: 4.5, status: null },
        { date: new Date(2026, 3, 5), day: "Saturday", totalOT: null, status: "OFF" },
      ],
      totalOT: 9.5,
    },
    {
      name: "ERWIN",
      sn: "73750",
      department: "Operations",
      dailyRecords: [
        { date: new Date(2026, 3, 1), day: "Tuesday", totalOT: null, status: null },
        { date: new Date(2026, 3, 2), day: "Wednesday", totalOT: null, status: null },
        { date: new Date(2026, 3, 3), day: "Thursday", totalOT: 8, status: null },
        { date: new Date(2026, 3, 4), day: "Friday", totalOT: null, status: "OFF" },
        { date: new Date(2026, 3, 5), day: "Saturday", totalOT: 12, status: null },
      ],
      totalOT: 20,
    },
    {
      name: "DIAN FREDY",
      sn: "73757",
      department: "Maintenance",
      dailyRecords: [
        { date: new Date(2026, 3, 1), day: "Tuesday", totalOT: null, status: "SICK" },
        { date: new Date(2026, 3, 2), day: "Wednesday", totalOT: 4.5, status: null },
        { date: new Date(2026, 3, 3), day: "Thursday", totalOT: null, status: null },
        { date: new Date(2026, 3, 4), day: "Friday", totalOT: null, status: null },
        { date: new Date(2026, 3, 5), day: "Saturday", totalOT: 8, status: null },
      ],
      totalOT: 12.5,
    },
  ];

  for (const emp of employees) {
    const sheetData: any[][] = [];

    // Header
    sheetData.push(["PT. CHITRA PARATAMA"]);
    sheetData.push(["OVER TIME RECORD"]);
    sheetData.push([]);
    sheetData.push(["MONTH", new Date(2026, 3, 1)]);
    sheetData.push(["Name", emp.name]);
    sheetData.push(["SN", emp.sn]);
    sheetData.push(["Department", emp.department]);
    sheetData.push(["Over time rate/hours", emp.totalOT]);
    sheetData.push([]);

    // Table header
    sheetData.push(["Date", "Day", "Shift From", "Shift To", "OT From", "OT To", "Total Overtime", "WD 1.5x", "H 2x", "H 3x", "H 4x", "Remarks"]);

    // Daily records
    for (const record of emp.dailyRecords) {
      sheetData.push([
        record.date,
        record.status || record.day,
        "07:00",
        "15:00",
        record.totalOT ? "15:00" : "",
        record.totalOT ? "19:00" : "",
        record.totalOT || "",
        record.totalOT && !record.status ? record.totalOT : "",
        "",
        "",
        "",
        "",
      ]);
    }

    // Footer
    sheetData.push([]);
    sheetData.push(["Prepared by:", "", "", "Approved by:"]);

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, emp.name.substring(0, 30));
  }

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  await writeFile("test_ot_record_vale.xlsx", buffer);

  console.log("✓ Created test_ot_record_vale.xlsx");
  console.log(`  - ${employees.length} employee sheets`);
  console.log(`  - Period: April 2026`);
  console.log(`  - Site: VALE\n`);
}

createMockOTRecord()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
