import { parseCsvToRecords } from "@/lib/security-user-import";

export const ACTIVITY_LIBRARY_IMPORT_FIELDS = [
  { key: "activityCode", label: "activityCode", required: true, aliases: ["activity code", "activity_code", "kode", "kode aktivitas"] },
  { key: "activityName", label: "activityName", required: true, aliases: ["activity name", "activity_name", "nama aktivitas"] },
  { key: "category", label: "category", required: false, aliases: ["kategori"] },
  { key: "site", label: "site", required: false, aliases: ["lokasi kerja", "work location", "siteName", "site_name", "lokasi"] },
  { key: "department", label: "department", required: false, aliases: ["departement", "dept", "departmentName", "department_name"] },
  { key: "section", label: "section", required: false, aliases: ["sectionName", "section_name", "seksi"] },
  { key: "basePoints", label: "basePoints", required: false, aliases: ["base points", "base_points", "points", "poin"] },
  { key: "complexityLevel", label: "complexityLevel", required: false, aliases: ["complexity", "complexity_level", "level"] },
  { key: "maxDailyCount", label: "maxDailyCount", required: false, aliases: ["max daily count", "max_daily_count"] },
  { key: "maxPointsPerDay", label: "maxPointsPerDay", required: false, aliases: ["max points per day", "max_points_per_day"] },
  { key: "slaHours", label: "slaHours", required: false, aliases: ["sla", "sla_hours", "sla jam"] },
  { key: "requiresPhoto", label: "requiresPhoto", required: false, aliases: ["requires_photo", "wajib foto", "photo"] },
  { key: "requiresEquipmentNo", label: "requiresEquipmentNo", required: false, aliases: ["requires_equipment_no", "wajib equipment", "equipment"] },
  { key: "requiresDuration", label: "requiresDuration", required: false, aliases: ["requires_duration", "wajib durasi", "duration"] },
  { key: "requiresLocationGps", label: "requiresLocationGps", required: false, aliases: ["requires_location_gps", "wajib gps", "gps"] },
  { key: "requiresMaterialUsed", label: "requiresMaterialUsed", required: false, aliases: ["requires_material_used", "wajib material", "material"] },
  { key: "isAssignable", label: "isAssignable", required: false, aliases: ["is_assignable", "assignable", "bisa assign"] },
  { key: "isSelfInput", label: "isSelfInput", required: false, aliases: ["is_self_input", "self input", "bisa self input"] },
  { key: "approvalRequired", label: "approvalRequired", required: false, aliases: ["approval_required", "butuh approval", "approval"] },
  { key: "autoApproveIfGpsValid", label: "autoApproveIfGpsValid", required: false, aliases: ["auto_approve_if_gps_valid", "auto approve", "auto approve gps"] },
  { key: "isActive", label: "isActive", required: false, aliases: ["is_active", "aktif", "status"] },
] as const;

export type ActivityLibraryImportFieldKey = (typeof ACTIVITY_LIBRARY_IMPORT_FIELDS)[number]["key"];

export type ActivityLibraryImportState = {
  status: "idle" | "success" | "error";
  message: string;
  importedCount?: number;
  updatedCount?: number;
  skippedCount?: number;
};

export const INITIAL_ACTIVITY_LIBRARY_IMPORT_STATE: ActivityLibraryImportState = {
  status: "idle",
  message: "",
};

export const ACTIVITY_LIBRARY_EXAMPLE_CSV = buildActivityLibraryCsv([
  {
    activityCode: "TS-003",
    activityName: "Inspect hydraulic hose condition",
    category: "Technical",
    site: "Bengalon Pit North",
    department: "Plant",
    section: "Maintenance",
    basePoints: 12,
    complexityLevel: 2,
    maxDailyCount: 3,
    maxPointsPerDay: 60,
    slaHours: 24,
    requiresPhoto: true,
    requiresEquipmentNo: true,
    requiresDuration: true,
    requiresLocationGps: true,
    requiresMaterialUsed: false,
    isAssignable: true,
    isSelfInput: true,
    approvalRequired: true,
    autoApproveIfGpsValid: false,
    isActive: true,
  },
  {
    activityCode: "HSE-004",
    activityName: "Daily safety observation",
    category: "HSE",
    site: "Bengalon Pit North",
    department: "HSE",
    section: "Safety",
    basePoints: 10,
    complexityLevel: 1,
    maxDailyCount: 2,
    maxPointsPerDay: 30,
    slaHours: 12,
    requiresPhoto: true,
    requiresEquipmentNo: false,
    requiresDuration: true,
    requiresLocationGps: true,
    requiresMaterialUsed: false,
    isAssignable: true,
    isSelfInput: true,
    approvalRequired: false,
    autoApproveIfGpsValid: true,
    isActive: true,
  },
]);

export type ActivityLibraryCsvRow = Partial<
  Record<ActivityLibraryImportFieldKey, string | number | boolean | null | undefined>
>;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

function escapeCsvCell(value: string | number | boolean | null | undefined) {
  const text = `${value ?? ""}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildActivityLibraryCsv(rows: ActivityLibraryCsvRow[]) {
  const columns = ACTIVITY_LIBRARY_IMPORT_FIELDS.map((field) => field.label);

  return [
    columns.join(","),
    ...rows.map((row) =>
      ACTIVITY_LIBRARY_IMPORT_FIELDS.map((field) => escapeCsvCell(row[field.key])).join(","),
    ),
  ].join("\n");
}

export function parseActivityLibraryCsv(raw: string) {
  return parseCsvToRecords(raw);
}

export function getActivityLibraryImportValue(
  row: Record<string, string>,
  key: ActivityLibraryImportFieldKey,
) {
  const field = ACTIVITY_LIBRARY_IMPORT_FIELDS.find((item) => item.key === key);
  if (!field) return "";

  const normalizedHeaders = new Map(
    Object.keys(row).map((header) => [normalizeHeader(header), header]),
  );
  const header =
    normalizedHeaders.get(normalizeHeader(field.label)) ??
    normalizedHeaders.get(normalizeHeader(field.key)) ??
    field.aliases
      .map((alias) => normalizedHeaders.get(normalizeHeader(alias)))
      .find(Boolean);

  return header ? row[header]?.trim() ?? "" : "";
}

export function parseActivityLibraryBoolean(value: string, defaultValue: boolean) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (["1", "true", "yes", "y", "ya", "aktif", "active", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "tidak", "nonaktif", "inactive", "off"].includes(normalized)) return false;
  return defaultValue;
}

export function parseActivityLibraryInteger(
  value: string,
  defaultValue: number,
  min: number,
  max: number,
) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return defaultValue;
  return Math.min(max, Math.max(min, Math.round(numericValue)));
}
