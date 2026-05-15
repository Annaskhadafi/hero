export type AttendanceCellStatus = "present" | "empty" | "sick" | "leave" | "absent";

export type AttendanceCell = {
  status: AttendanceCellStatus;
  clockIn: string;
  clockOut: string;
  note: string;
  source?: "attendance" | "manual" | "excel";
};

export function normalizeAttendanceStatus(value?: string | null): AttendanceCellStatus {
  const normalized = (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
  if (!normalized) return "empty";
  if (normalized.includes("sakit") || normalized.includes("sick")) return "sick";
  if (normalized.includes("izin") || normalized.includes("leave") || normalized.includes("cuti")) return "leave";
  if (normalized.includes("alpha") || normalized.includes("alpa") || normalized.includes("absent")) return "absent";
  return "present";
}

export function attendanceStatusLabel(status: AttendanceCellStatus) {
  if (status === "present") return "Masuk";
  if (status === "sick") return "Sakit";
  if (status === "leave") return "Izin";
  if (status === "absent") return "Alpha";
  return "-";
}

export function minutesFromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

export function attendanceHours(cell: AttendanceCell) {
  if (cell.status !== "present") return 0;
  const clockIn = minutesFromTime(cell.clockIn);
  const clockOut = minutesFromTime(cell.clockOut);
  if (clockIn === null || clockOut === null) return 0;
  const duration = clockOut >= clockIn ? clockOut - clockIn : clockOut + 24 * 60 - clockIn;
  return Math.max(0, Math.round((duration / 60) * 100) / 100);
}

export function calculateAttendanceOvertime(cells: AttendanceCell[], baseHours: number) {
  const totalHours = cells.reduce((sum, cell) => sum + attendanceHours(cell), 0);
  const rawOvertime = Math.max(0, totalHours - baseHours);
  // Rounding rules:
  // decimal >= 0.8 -> round up to next whole number
  // decimal >= 0.5 -> round to x.5
  // decimal < 0.5  -> round down to whole number
  const whole = Math.floor(rawOvertime)
  const decimal = rawOvertime - whole
  const overtime = decimal >= 0.8 ? whole + 1 : decimal >= 0.5 ? whole + 0.5 : whole
  return { totalHours, baseHours, overtime };
}
