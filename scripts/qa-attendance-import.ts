import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { buildAttendanceImportPreview, type AttendanceImportEmployee } from "../lib/timesheet/attendance-import";
import { parseAttendanceWorkbook } from "../lib/timesheet/attendance-template-parser";

const attendanceDir = path.join(process.cwd(), "attandance site");
const periodsByFile = new Map([
  ["absensi april 26.xlsx", "2026-04"],
  ["Absensi Finger Juli 2024.xls", "2024-07"],
  ["Absensi Wajah Juli 2024.xls", "2024-07"],
]);
const employees: AttendanceImportEmployee[] = [
  { id: 1, name: "ARI ANGGARA", employeeSn: "51097", siteId: 1 },
  { id: 2, name: "ASMUNI", employeeSn: "01", siteId: 1 },
  { id: 3, name: "Adila Tri Arizona", employeeSn: "60848", siteId: 1 },
  { id: 4, name: "Khofifah Indar P", employeeSn: "72164", siteId: 1 },
  { id: 5, name: "WAHYUDI", employeeSn: "51105", siteId: 1 },
];

function periodForFile(filename: string) {
  return periodsByFile.get(filename) ?? "2024-07";
}

function main() {
  if (!fs.existsSync(attendanceDir)) throw new Error(`Attendance sample folder not found: ${attendanceDir}`);
  const files = fs.readdirSync(attendanceDir).filter((file) => /\.xlsx?$/i.test(file));
  if (!files.length) throw new Error("No attendance Excel samples found.");

  const failures: string[] = [];
  for (const file of files) {
    try {
      const workbook = XLSX.readFile(path.join(attendanceDir, file));
      const period = periodForFile(file);
      const parsed = parseAttendanceWorkbook({ workbook, period, employees });
      const preview = buildAttendanceImportPreview({ rows: parsed.rows, employees, siteId: 1, fixedSchedule: [] });
      const summary = {
        file,
        period,
        kind: parsed.detection.kind,
        sheet: parsed.detection.sheetName,
        rows: parsed.rows.length,
        matched: preview.matchedCount,
        unmatched: preview.unmatchedCount,
        conflicts: preview.conflictCount,
        validation: preview.validationSummary,
      };
      console.log(JSON.stringify(summary));
      if (!parsed.rows.length) failures.push(`${file}: parsed zero rows`);
    } catch (error) {
      failures.push(`${file}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  if (failures.length) {
    console.error("Attendance import QA failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`Attendance import QA passed for ${files.length} files.`);
}

main();
