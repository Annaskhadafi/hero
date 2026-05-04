import { parseCsvToRecords } from "@/lib/security-user-import";

export const TRAINING_RECORD_IMPORT_FIELDS = [
  {
    key: "employeeSn",
    label: "SN",
    required: false,
    aliases: ["employee sn", "employee_sn", "nik", "nrp", "sn"],
  },
  {
    key: "employeeName",
    label: "Nama Karyawan",
    required: false,
    aliases: ["employee", "employee name", "employee_name", "nama", "nama karyawan"],
  },
  {
    key: "email",
    label: "Email",
    required: false,
    aliases: ["employee email", "employee_email", "mail"],
  },
  {
    key: "department",
    label: "Department",
    required: false,
    aliases: ["departement", "dept", "department name", "department_name"],
  },
  {
    key: "trainingName",
    label: "Training",
    required: true,
    aliases: ["training name", "training_name", "sertifikasi", "course", "pelatihan"],
  },
  {
    key: "provider",
    label: "Provider",
    required: false,
    aliases: ["vendor", "organizer", "penyelenggara"],
  },
  {
    key: "completedYear",
    label: "Tahun",
    required: true,
    aliases: ["year", "training year", "training_year", "completed year", "tahun training", "tahun"],
  },
  {
    key: "expiresAt",
    label: "Expired At",
    required: false,
    aliases: ["expiry", "expires_at", "expired at", "masa berlaku", "valid until", "expired"],
  },
  {
    key: "status",
    label: "Status",
    required: false,
    aliases: ["training status", "training_status"],
  },
] as const;

export type TrainingRecordImportFieldKey = (typeof TRAINING_RECORD_IMPORT_FIELDS)[number]["key"];

export type TrainingRecordImportMapping = Partial<Record<TrainingRecordImportFieldKey, string>>;

export type TrainingRecordImportState = {
  status: "idle" | "success" | "error";
  message: string;
  importedCount?: number;
  updatedCount?: number;
  skippedCount?: number;
};

export const INITIAL_TRAINING_RECORD_IMPORT_STATE: TrainingRecordImportState = {
  status: "idle",
  message: "",
};

export const TRAINING_RECORD_EXAMPLE_CSV = [
  "SN,Nama Karyawan,Department,Training,Provider,Tahun,Expired At,Status",
  '"HC-005","Budi Santoso","HC","Basic Safety","PAMA Training Center","2024","2026-12-31","active"',
  '"OPS-019","Rizal Pratama","Operation","Rigging & Slinging","Internal","2025","","active"',
].join("\n");

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

export function parseTrainingRecordCsv(raw: string) {
  return parseCsvToRecords(raw);
}

export function autoMapTrainingRecordHeaders(headers: string[]): TrainingRecordImportMapping {
  const normalizedHeaderMap = new Map(headers.map((header) => [normalizeHeader(header), header]));

  return Object.fromEntries(
    TRAINING_RECORD_IMPORT_FIELDS.map((field) => {
      const directMatch =
        normalizedHeaderMap.get(normalizeHeader(field.label)) ??
        field.aliases
          .map((alias) => normalizedHeaderMap.get(normalizeHeader(alias)))
          .find(Boolean);

      return [field.key, directMatch ?? ""];
    }),
  ) as TrainingRecordImportMapping;
}

export function getTrainingRecordImportValue(
  row: Record<string, string>,
  mapping: TrainingRecordImportMapping,
  key: TrainingRecordImportFieldKey,
) {
  const header = mapping[key];
  if (!header) {
    return "";
  }

  return (row[header] ?? "").trim();
}
