export const USER_IMPORT_FIELDS = [
  { key: "fullName", label: "Name", required: true, aliases: ["name", "nama", "nama lengkap", "full name", "full_name"] },
  { key: "employeeSn", label: "SN", required: true, aliases: ["sn", "employee sn", "employee_sn", "nik", "nrp"] },
  { key: "email", label: "Email", required: false, aliases: ["email", "email address", "mail"] },
  { key: "department", label: "Department", required: true, aliases: ["department", "departemen", "departement", "dept"] },
  { key: "section", label: "Section", required: true, aliases: ["section", "seksi"] },
  { key: "jobTitle", label: "Job Title", required: true, aliases: ["job title", "jabatan", "position", "title"] },
  { key: "levelName", label: "Level Staff", required: false, aliases: ["level staff", "level", "level_name", "tingkatan"] },
  { key: "workLocation", label: "Lokasi Site", required: true, aliases: ["lokasi site", "work location", "lokasi kerja", "site", "lokasi"] },
  { key: "accessRole", label: "Peran", required: false, aliases: ["peran", "access role", "access_role", "role"] },
  { key: "employeeStatusType", label: "Tipe Status", required: true, aliases: ["tipe status", "employee status type", "employee_status_type", "tipe status karyawan"] },
  { key: "gender", label: "Gender", required: false, aliases: ["gender", "jenis kelamin", "kelamin"] },
  { key: "religion", label: "Agama", required: false, aliases: ["agama", "religion"] },
  { key: "education", label: "Pendidikan", required: false, aliases: ["pendidikan", "education"] },
  { key: "maritalStatus", label: "Marital Status", required: false, aliases: ["marital status", "status pernikahan", "pernikahan"] },
  { key: "pointOfHire", label: "POH", required: false, aliases: ["poh", "point of hire"] },
  { key: "joinDate", label: "Join Date", required: false, aliases: ["join date", "tanggal masuk", "tgl bergabung", "join_date"] },
  { key: "contractDurationStart", label: "Contract Start", required: false, aliases: ["contract start", "mulai kontrak", "tanggal mulai kontrak", "contract_duration_start"] },
  { key: "contractDurationEnd", label: "Contract End", required: false, aliases: ["contract end", "selesai kontrak", "tanggal selesai kontrak", "contract_duration_end"] },
  { key: "permanentDate", label: "Permanent Date", required: false, aliases: ["permanent date", "permanent_date", "tgl permanen", "tgl tetap"] },
  { key: "birthDate", label: "Tgl Lahir", required: false, aliases: ["tgl lahir", "birth date", "birth_date", "tanggal lahir"] },
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
  const seen = new Map<string, number>();
  const headers = headerRow.map((header, index) => {
    const base = header || `Column ${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} ${count + 1}`;
  });
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
