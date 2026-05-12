import fs from "fs";
import path from "path";

const files = [
  { label: "schema", path: "db/schema/timesheet.ts", required: ["timesheetAttendanceEmployeeAliases", "importPreviewId", "validationFlags", "workMinutes", "rolledBackAt", "validationSummary"] },
  { label: "infrastructure", path: "lib/timesheet/scheduling-infrastructure.ts", required: ["hero_timesheet_attendance_employee_aliases", "import_preview_id", "validation_flags", "work_minutes", "rolled_back_at", "validation_summary"] },
  { label: "migration", path: "drizzle/0025_attendance_import_enhancements.sql", required: ["hero_timesheet_attendance_employee_aliases", "import_preview_id", "validation_flags", "work_minutes", "rolled_back_at", "validation_summary"] },
];

const missing: string[] = [];
for (const file of files) {
  const absolutePath = path.join(process.cwd(), file.path);
  if (!fs.existsSync(absolutePath)) {
    missing.push(`${file.label}: missing file ${file.path}`);
    continue;
  }
  const source = fs.readFileSync(absolutePath, "utf8");
  for (const required of file.required) {
    if (!source.includes(required)) missing.push(`${file.label}: missing ${required}`);
  }
}

if (missing.length) {
  console.error("Attendance DB drift check failed:");
  missing.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log("Attendance DB drift check passed.");
