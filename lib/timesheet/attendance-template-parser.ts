import Fuse from "fuse.js";
import * as XLSX from "xlsx";
import { normalizeAttendanceImportIdentity, type AttendanceImportEmployee, type AttendanceImportRawRow } from "@/lib/timesheet/attendance-import";
import { normalizeAttendanceStatus } from "@/lib/timesheet/attendance-real";

export type AttendanceTemplateKind = "matrix" | "row-log" | "fingerprint-detail";
export type AttendanceTemplateColumnMapping = Partial<Record<"employeeSn" | "employeeName" | "siteName" | "date" | "day" | "clockIn" | "clockOut" | "scanTime" | "eventType" | "status" | "absentFlag", number>>;
export type AttendanceTemplateDetection = {
  sheetName: string;
  kind: AttendanceTemplateKind;
  headerRowIndex: number;
  columnMapping: AttendanceTemplateColumnMapping;
  confidence: number;
  warnings: string[];
};
export type AttendanceTemplateParseResult = {
  rows: AttendanceImportRawRow[];
  detection: AttendanceTemplateDetection;
  warnings: string[];
};

type RawSheet = Array<Array<string>>;
type EmployeeMatcher = {
  employee: AttendanceImportEmployee;
  normalizedName: string;
  normalizedSn: string;
};

const fieldAliases: Record<keyof AttendanceTemplateColumnMapping, string[]> = {
  employeeSn: ["empno", "emp no", "sn", "pin", "noid", "no id", "nik", "userid", "user id", "badgeno", "badge no", "acno", "ac no", "id"],
  employeeName: ["nama", "name", "employee", "employee name", "karyawan", "personnel"],
  siteName: ["site", "project", "lokasi", "location", "departemen", "department"],
  date: ["tanggal", "tgl", "date", "waktuabsen", "waktu absen"],
  day: ["day", "hari"],
  clockIn: ["scanmasuk", "scan masuk", "checkin", "check in", "clockin", "clock in", "masuk", "in", "jammasuk", "jam masuk"],
  clockOut: ["scanpulang", "scan pulang", "checkout", "check out", "clockout", "clock out", "keluar", "pulang", "out", "jampulang", "jam pulang"],
  scanTime: ["jam", "time", "waktu", "scan", "datetime", "waktuabsen", "waktu absen"],
  eventType: ["inout", "event", "tipe", "type"],
  status: ["status", "normal", "catatan", "keterangan", "autoassign", "auto assign"],
  absentFlag: ["absent", "absen"],
};

const employeeSnPriority = ["sn", "noid", "nik", "pin", "userid", "badgeno", "acno", "id", "empno"];

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function normalizeCell(value: unknown) {
  return String(value ?? "").trim();
}

function readRows(workbook: XLSX.WorkBook, sheetName: string): RawSheet {
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "", raw: false }).map((row) => (row as unknown[]).map(normalizeCell));
}

function aliasField(header: string): keyof AttendanceTemplateColumnMapping | null {
  const normalized = normalizeHeader(header);
  if (!normalized) return null;

  for (const [field, aliases] of Object.entries(fieldAliases) as Array<[keyof AttendanceTemplateColumnMapping, string[]]>) {
    if (aliases.some((alias) => normalized === normalizeHeader(alias))) return field;
  }

  return null;
}

function aliasPriority(field: keyof AttendanceTemplateColumnMapping, header: string) {
  const normalized = normalizeHeader(header);
  if (field === "employeeSn") {
    const priority = employeeSnPriority.findIndex((alias) => normalized === normalizeHeader(alias));
    return priority === -1 ? employeeSnPriority.length : priority;
  }
  if ((field === "clockIn" || field === "clockOut") && normalized.startsWith("scan")) return -1;
  return 0;
}

function buildMapping(header: string[]) {
  const mapping: AttendanceTemplateColumnMapping = {};
  const priorities: Partial<Record<keyof AttendanceTemplateColumnMapping, number>> = {};
  header.forEach((cell, index) => {
    const field = aliasField(cell);
    if (!field) return;
    const priority = aliasPriority(field, cell);
    if (mapping[field] === undefined || priority < (priorities[field] ?? Number.MAX_SAFE_INTEGER)) {
      mapping[field] = index;
      priorities[field] = priority;
    }
  });
  return mapping;
}

function mappingScore(mapping: AttendanceTemplateColumnMapping) {
  let score = 0;
  if (mapping.employeeSn !== undefined) score += 3;
  if (mapping.employeeName !== undefined) score += 3;
  if (mapping.date !== undefined || mapping.day !== undefined) score += 3;
  if (mapping.clockIn !== undefined || mapping.clockOut !== undefined || mapping.scanTime !== undefined) score += 2;
  return score;
}

function detectRowLog(rows: RawSheet, sheetName: string): AttendanceTemplateDetection | null {
  let best: AttendanceTemplateDetection | null = null;

  rows.slice(0, 20).forEach((row, index) => {
    const mapping = buildMapping(row);
    const score = mappingScore(mapping);
    if (score < 7) return;

    const kind: AttendanceTemplateKind = mapping.clockIn !== undefined || mapping.clockOut !== undefined ? "row-log" : "row-log";
    const detection = { sheetName, kind, headerRowIndex: index, columnMapping: mapping, confidence: score, warnings: [`Detected ${kind} sheet ${sheetName}`] };
    if (!best || detection.confidence > best.confidence) best = detection;
  });

  return best;
}

function detectMatrix(rows: RawSheet, sheetName: string): AttendanceTemplateDetection | null {
  let best: AttendanceTemplateDetection | null = null;

  rows.slice(0, 20).forEach((row, index) => {
    const currentMapping = buildMapping(row);
    const nextRow = rows[index + 1] ?? [];
    const previousRow = rows[index - 1] ?? [];
    const nextMapping = buildMapping(nextRow);
    const previousMapping = buildMapping(previousRow);
    const mapping = mappingScore(currentMapping) >= mappingScore(previousMapping) ? currentMapping : previousMapping;
    const fallbackMapping = mappingScore(mapping) >= mappingScore(nextMapping) ? mapping : nextMapping;
    const dayColumns = row
      .map((cell, cellIndex) => ({ cell, cellIndex }))
      .filter(({ cell }) => /^\d{1,2}$/.test(cell));
    const nextRowDayColumns = nextRow
      .map((cell, cellIndex) => ({ cell, cellIndex }))
      .filter(({ cell }) => /^\d{1,2}$/.test(cell));
    const detectedDayColumns = dayColumns.length >= 5 ? dayColumns : nextRowDayColumns;

    if ((fallbackMapping.employeeSn === undefined && fallbackMapping.employeeName === undefined) || detectedDayColumns.length < 5) return;

    const detection = {
      sheetName,
      kind: "matrix" as const,
      headerRowIndex: dayColumns.length >= 5 ? index : index + 1,
      columnMapping: fallbackMapping,
      confidence: 8 + detectedDayColumns.length,
      warnings: [`Detected matrix sheet ${sheetName}`],
    };
    if (!best || detection.confidence > best.confidence) best = detection;
  });

  return best;
}

function detectFingerprintDetail(rows: RawSheet, sheetName: string): AttendanceTemplateDetection | null {
  const normalizedSheetName = normalizeHeader(sheetName);
  const hasDetailMarker = rows.slice(0, 8).some((row) => row.some((cell) => normalizeHeader(cell).includes("lapdetailabsensi")));
  const firstDayRow = rows.findIndex((row) => row.slice(0, 14).filter((cell, index) => cell === String(index + 1)).length >= 5);
  const hasEmployeeBlocks = rows.some((row) => normalizeHeader(row[0]) === "id" && row.some((cell) => normalizeHeader(cell) === "nama"));
  const isLogSheet = normalizedSheetName.includes("logabsen") || normalizedSheetName.includes("detaillog") || hasDetailMarker;
  if (!isLogSheet || firstDayRow === -1 || !hasEmployeeBlocks) return null;

  return {
    sheetName,
    kind: "fingerprint-detail",
    headerRowIndex: Math.max(0, firstDayRow),
    columnMapping: {},
    confidence: 100,
    warnings: [`Detected fingerprint detail sheet ${sheetName}`],
  };
}

function detectTemplate(workbook: XLSX.WorkBook): { detection: AttendanceTemplateDetection; rows: RawSheet } {
  const candidates = workbook.SheetNames.flatMap((sheetName) => {
    const rows = readRows(workbook, sheetName);
    return [detectRowLog(rows, sheetName), detectMatrix(rows, sheetName), detectFingerprintDetail(rows, sheetName)]
      .filter((detection): detection is AttendanceTemplateDetection => Boolean(detection))
      .map((detection) => ({ detection, rows }));
  });

  const best = candidates.sort((left, right) => right.detection.confidence - left.detection.confidence)[0];
  if (!best) throw new Error("Template attendance tidak dikenali. Cek header Excel atau pilih template mapping manual.");
  return best;
}

function getCell(row: string[], index?: number) {
  return index === undefined ? "" : normalizeCell(row[index]);
}

function parseDateDay(value: string, period: string) {
  if (!value) return null;
  const trimmed = value.trim();
  const excelDate = Number(trimmed);
  if (Number.isFinite(excelDate) && excelDate > 20000) {
    const parsed = XLSX.SSF.parse_date_code(excelDate);
    if (parsed) return parsed.m === Number(period.slice(5, 7)) && parsed.y === Number(period.slice(0, 4)) ? parsed.d : null;
  }

  const normalized = trimmed.replace(/\./g, "/").replace(/-/g, "/");
  const parts = normalized.split("/").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const [first, second, third] = parts.map(Number);
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    const year = third < 100 ? 2000 + third : third;
    if (year === Number(period.slice(0, 4)) && month === Number(period.slice(5, 7)) && day >= 1 && day <= 31) return day;
  }

  const isoDay = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDay && `${isoDay[1]}-${isoDay[2]}` === period) return Number(isoDay[3]);

  return null;
}

function normalizeTimeValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const time = trimmed.match(/(\d{1,2})[:.](\d{2})/);
  if (!time) return "";
  const hour = Number(time[1]);
  const minute = Number(time[2]);
  if (hour > 23 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseCompressedTimes(value: string) {
  const matches = value.match(/\d{1,2}[:.]\d{2}/g) ?? [];
  if (matches.length) {
    const times = matches.map(normalizeTimeValue).filter(Boolean);
    return { clockIn: times[0] ?? "", clockOut: times[times.length - 1] ?? "" };
  }

  const compact = value.replace(/\D/g, "");
  if (compact.length < 8) return { clockIn: "", clockOut: "" };
  const chunks = compact.match(/\d{4}/g) ?? [];
  const times = chunks.map((chunk) => normalizeTimeValue(`${chunk.slice(0, 2)}:${chunk.slice(2, 4)}`)).filter(Boolean);
  return { clockIn: times[0] ?? "", clockOut: times[times.length - 1] ?? "" };
}

function buildMatcher(employees: AttendanceImportEmployee[]) {
  const matchers = employees.map((employee) => ({
    employee,
    normalizedName: normalizeAttendanceImportIdentity(employee.name),
    normalizedSn: normalizeAttendanceImportIdentity(employee.employeeSn),
  }));
  const bySn = new Map(matchers.filter((item) => item.normalizedSn).map((item) => [item.normalizedSn, item.employee]));
  const byName = new Map(matchers.filter((item) => item.normalizedName).map((item) => [item.normalizedName, item.employee]));
  const fuse = new Fuse(matchers, { keys: ["normalizedName", "normalizedSn"], threshold: 0.35, ignoreLocation: true, minMatchCharLength: 3, includeScore: true });

  return { bySn, byName, fuse };
}

function matchEmployee(input: { employeeSn: string; employeeName: string }, employees: AttendanceImportEmployee[]) {
  const { bySn, byName, fuse } = buildMatcher(employees);
  const snKey = normalizeAttendanceImportIdentity(input.employeeSn);
  if (snKey && bySn.has(snKey)) return bySn.get(snKey)!;
  const nameKey = normalizeAttendanceImportIdentity(input.employeeName);
  if (nameKey && byName.has(nameKey)) return byName.get(nameKey)!;
  const result = fuse.search([snKey, nameKey].filter(Boolean).join(" "))[0];
  return result && (result.score ?? 1) <= 0.35 ? (result.item as EmployeeMatcher).employee : null;
}

function parseRowLog(rows: RawSheet, detection: AttendanceTemplateDetection, period: string): AttendanceImportRawRow[] {
  const mapping = detection.columnMapping;
  return rows.slice(detection.headerRowIndex + 1).flatMap((row) => {
    const employeeSn = getCell(row, mapping.employeeSn);
    const employeeName = getCell(row, mapping.employeeName);
    const day = mapping.day !== undefined ? Number(getCell(row, mapping.day)) : parseDateDay(getCell(row, mapping.date), period);
    if (!day || day < 1 || day > 31 || (!employeeSn && !employeeName)) return [];

    const scanTime = normalizeTimeValue(getCell(row, mapping.scanTime));
    const clockIn = normalizeTimeValue(getCell(row, mapping.clockIn)) || scanTime;
    const clockOut = normalizeTimeValue(getCell(row, mapping.clockOut));
    const absentFlag = getCell(row, mapping.absentFlag).toLowerCase();
    const isAbsent = absentFlag === "true" || absentFlag === "1" || absentFlag === "yes";
    const statusValue = clockIn || clockOut ? "Masuk" : isAbsent ? "Absent" : getCell(row, mapping.status);

    return [{ employeeSn, employeeName, siteName: getCell(row, mapping.siteName), day, status: normalizeAttendanceStatus(statusValue), clockIn, clockOut, note: statusValue }];
  });
}

function parseMatrix(rows: RawSheet, detection: AttendanceTemplateDetection, period: string): AttendanceImportRawRow[] {
  const headerRow = rows[detection.headerRowIndex] ?? [];
  const labelRow = rows[detection.headerRowIndex - 1] ?? [];
  const nextRow = rows[detection.headerRowIndex + 1] ?? [];
  const dayColumns = headerRow
    .map((cell, index) => ({ day: Number(cell), index }))
    .filter(({ day }) => Number.isInteger(day) && day >= 1 && day <= 31);
  const detectedMapping = detection.columnMapping;
  const labelMapping = buildMapping(labelRow.length ? labelRow : headerRow);
  const nextMapping = buildMapping(nextRow);
  const mapping = mappingScore(detectedMapping) >= mappingScore(labelMapping) && mappingScore(detectedMapping) >= mappingScore(nextMapping)
    ? detectedMapping
    : mappingScore(labelMapping) >= mappingScore(nextMapping)
      ? labelMapping
      : nextMapping;
  const employeeSnIndex = mapping.employeeSn ?? labelRow.findIndex((cell) => normalizeHeader(cell) === "sn");
  const employeeNameIndex = mapping.employeeName ?? labelRow.findIndex((cell) => normalizeHeader(cell) === "nama");

  return rows.slice(detection.headerRowIndex + 1).flatMap((row) => {
    const employeeSn = getCell(row, employeeSnIndex >= 0 ? employeeSnIndex : undefined);
    const employeeName = getCell(row, employeeNameIndex >= 0 ? employeeNameIndex : undefined);
    if (!employeeSn && !employeeName) return [];

    return dayColumns.flatMap(({ day, index }) => {
      const raw = getCell(row, index);
      if (!raw) return [];
      return [{ employeeSn, employeeName, siteName: "", day, status: normalizeAttendanceStatus(raw || "Masuk"), clockIn: "", clockOut: "", note: raw }];
    });
  });
}

function parseFingerprintDetail(rows: RawSheet, detection: AttendanceTemplateDetection, period: string, employees: AttendanceImportEmployee[]): AttendanceImportRawRow[] {
  const dayRow = rows[detection.headerRowIndex] ?? [];
  const dayColumns = dayRow
    .map((cell, index) => ({ day: Number(cell), index }))
    .filter(({ day }) => Number.isInteger(day) && day >= 1 && day <= 31);
  const parsedRows: AttendanceImportRawRow[] = [];

  for (let index = detection.headerRowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (normalizeHeader(row[0]) !== "id") continue;

    const employeeSn = row.find((cell, cellIndex) => cellIndex > 0 && /^\d+$/.test(cell)) ?? "";
    const nameLabelIndex = row.findIndex((cell) => normalizeHeader(cell) === "nama");
    const employeeName = nameLabelIndex >= 0 ? getCell(row, nameLabelIndex + 2) || getCell(row, nameLabelIndex + 1) : "";
    const scans = rows[index + 1] ?? [];
    const employee = matchEmployee({ employeeSn, employeeName }, employees);

    for (const { day, index: dayIndex } of dayColumns) {
      const raw = getCell(scans, dayIndex);
      if (!raw) continue;
      const { clockIn, clockOut } = parseCompressedTimes(raw);
      if (!clockIn && !clockOut) continue;
      parsedRows.push({ employeeSn: employee?.employeeSn ?? employeeSn, employeeName: employee?.name ?? employeeName, siteName: "", day, status: "present", clockIn, clockOut, note: raw });
    }
  }

  return parsedRows.filter((row) => row.day >= 1 && row.day <= 31 && `${period}-`.length > 0);
}

export function parseAttendanceWorkbook(params: { workbook: XLSX.WorkBook; period: string; employees: AttendanceImportEmployee[] }): AttendanceTemplateParseResult {
  const { detection, rows } = detectTemplate(params.workbook);
  const parsedRows = detection.kind === "matrix"
    ? parseMatrix(rows, detection, params.period)
    : detection.kind === "fingerprint-detail"
      ? parseFingerprintDetail(rows, detection, params.period, params.employees)
      : parseRowLog(rows, detection, params.period);

  const warnings = [...detection.warnings, `Parsed ${parsedRows.length} attendance rows from ${detection.sheetName}`];
  if (parsedRows.length === 0) warnings.push("Tidak ada data attendance terbaca dari template ini.");

  return { rows: parsedRows, detection, warnings };
}
