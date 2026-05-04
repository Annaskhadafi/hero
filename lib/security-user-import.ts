export const USER_IMPORT_FIELDS = [
  { key: "employeeSn", label: "SN", required: true, aliases: ["sn", "employee sn", "employee_sn", "nik", "nrp"] },
  { key: "joinYear", label: "Tahun Masuk", required: true, aliases: ["tahun masuk", "join year", "tahun_masuk", "year joined"] },
  { key: "fullName", label: "Nama Lengkap", required: true, aliases: ["nama lengkap", "nama", "full name", "full_name"] },
  { key: "ttl", label: "TTL", required: true, aliases: ["ttl", "tempat tanggal lahir", "tempat_tanggal_lahir", "birth"] },
  { key: "domicile", label: "Domisili", required: true, aliases: ["domisili", "alamat", "domicile"] },
  { key: "directManager", label: "Atasan Langsung", required: false, aliases: ["atasan langsung", "manager", "direct manager", "supervisor"] },
  { key: "section", label: "Section", required: true, aliases: ["section", "seksi"] },
  { key: "department", label: "Departement", required: true, aliases: ["departement", "department", "dept"] },
  { key: "jobTitle", label: "Jabatan", required: true, aliases: ["jabatan", "position", "title", "role"] },
  { key: "workLocation", label: "Lokasi Kerja", required: true, aliases: ["lokasi kerja", "work location", "site", "lokasi"] },
  { key: "phoneNumber", label: "Nomor Telp", required: true, aliases: ["nomor telp", "phone", "no hp", "nomor hp", "telephone"] },
  { key: "email", label: "Email", required: true, aliases: ["email", "email address", "mail"] },
  { key: "status", label: "Status", required: true, aliases: ["status", "employment status", "employee status"] },
  { key: "employeeStatusType", label: "Tipe Status Karyawan", required: true, aliases: ["tipe status", "employee status type", "employee_status_type", "tipe status karyawan"] },
] as const;

export type UserImportFieldKey = (typeof USER_IMPORT_FIELDS)[number]["key"];

export type UserImportMapping = Partial<Record<UserImportFieldKey, string>>;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

function countDelimiterOccurrences(line: string, delimiter: string) {
  let count = 0;
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === delimiter && !inQuotes) {
      count += 1;
    }
  }

  return count;
}

function detectCsvDelimiter(raw: string) {
  const candidates = [",", ";", "\t", "|"] as const;
  const lines = raw
    .replace(/^\uFEFF/, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (lines.length === 0) {
    return ",";
  }

  let selectedDelimiter = ",";
  let selectedScore = 0;

  for (const delimiter of candidates) {
    const score = lines.reduce(
      (total, line) => total + countDelimiterOccurrences(line, delimiter),
      0,
    );

    if (score > selectedScore) {
      selectedDelimiter = delimiter;
      selectedScore = score;
    }
  }

  return selectedDelimiter;
}

export function parseCsv(raw: string) {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  const normalized = raw.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const delimiter = detectCsvDelimiter(normalized);

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const nextChar = normalized[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }

      continue;
    }

    if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      currentRow.push(currentCell.trim());

      if (currentRow.some((value) => value.length > 0)) {
        rows.push(currentRow);
      }

      currentCell = "";
      currentRow = [];
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell.trim());

  if (currentRow.some((value) => value.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

export function parseCsvToRecords(raw: string): {
  headers: string[];
  records: Record<string, string>[];
} {
  const rows = parseCsv(raw);
  
  if (rows.length === 0) {
    return {
      headers: [],
      records: [],
    };
  }

  const [headerRow, ...valueRows] = rows;
  const headers = headerRow.map((header, index) => header || `Column ${index + 1}`);
  const records = valueRows
    .filter((row) => row.some((value) => value.length > 0))
    .map((row) =>
      Object.fromEntries(
        headers.map((header, index) => [header, row[index]?.trim() ?? ""]),
      ),
    );

  return { headers, records };
}

export function autoMapHeaders(headers: string[]): UserImportMapping {
  const normalizedHeaderMap = new Map(
    headers.map((header) => [normalizeHeader(header), header]),
  );

  return Object.fromEntries(
    USER_IMPORT_FIELDS.map((field) => {
      const directMatch =
        normalizedHeaderMap.get(normalizeHeader(field.label)) ??
        field.aliases
          .map((alias) => normalizedHeaderMap.get(normalizeHeader(alias)))
          .find(Boolean);

      return [field.key, directMatch ?? ""];
    }),
  ) as UserImportMapping;
}

export function getMappedValue(
  row: string[] | Record<string, string>,
  headers: string[],
  mapping: UserImportMapping,
  key: UserImportFieldKey,
): string {
  const header = mapping[key];

  if (!header) {
    return "";
  }

  if (Array.isArray(row)) {
    const index = headers.indexOf(header);
    return index >= 0 ? (row[index] ?? "").trim() : "";
  }

  return (row[header] ?? "").trim();
}
