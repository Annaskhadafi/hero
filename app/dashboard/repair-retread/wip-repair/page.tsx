import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminTableCard } from "@/components/admin-table-card";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { TableFilterPresets } from "@/components/table-filter-presets";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";

const WIP_REPAIR_ENDPOINT = "https://one.chitraparatama.com/api/wip-repair";
const WIP_REPAIR_API_KEY = "59de03bd6ab886bf2fce9623e648f478c10b77ff12857a028fa83221310aa00b";

const PREFERRED_COLUMNS = [
  "sn",
  "serialNumber",
  "serial_number",
  "barcode",
  "woNumber",
  "wo_number",
  "workOrder",
  "customer",
  "customerName",
  "size",
  "pattern",
  "brand",
  "status",
  "process",
  "currentProcess",
  "location",
  "site",
  "receivedDate",
  "received_at",
  "updatedAt",
  "updated_at",
];

type WipRepairRow = Record<string, unknown>;

type WipRepairResult = {
  rows: WipRepairRow[];
  error?: string;
  status?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractRows(payload: unknown): WipRepairRow[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const candidateKeys = ["data", "rows", "items", "result", "results", "wipRepair", "wip_repair"];
  for (const key of candidateKeys) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  return [payload];
}

async function getWipRepairRows(): Promise<WipRepairResult> {
  try {
    const response = await fetch(WIP_REPAIR_ENDPOINT, {
      headers: {
        "x-api-key": WIP_REPAIR_API_KEY,
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        rows: [],
        status: response.status,
        error: `API WIP Repair gagal: HTTP ${response.status}`,
      };
    }

    const payload = (await response.json()) as unknown;
    return { rows: extractRows(payload) };
  } catch (error) {
    return {
      rows: [],
      error: error instanceof Error ? error.message : "API WIP Repair gagal dibaca",
    };
  }
}

function humanizeKey(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (character) => character.toUpperCase());
}

function getStringValue(row: WipRepairRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value != null && `${value}`.trim()) {
      return `${value}`.trim();
    }
  }

  return "";
}

function formatValue(value: unknown) {
  if (value == null || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Ya" : "Tidak";
  }

  if (typeof value === "number") {
    return value.toLocaleString("id-ID");
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    const parsedDate = Date.parse(normalized);
    if (/^\d{4}-\d{2}-\d{2}/.test(normalized) && Number.isFinite(parsedDate)) {
      return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: normalized.includes("T") ? "short" : undefined,
      }).format(new Date(parsedDate));
    }

    return normalized || "-";
  }

  return JSON.stringify(value);
}

function getColumns(rows: WipRepairRow[]) {
  const keys = new Set(rows.flatMap((row) => Object.keys(row)));
  const preferred = PREFERRED_COLUMNS.filter((key) => keys.has(key));
  const remaining = [...keys].filter((key) => !preferred.includes(key)).sort();
  return [...preferred, ...remaining].slice(0, 12);
}

function getUniqueOptions(rows: WipRepairRow[], keys: string[]) {
  return Array.from(new Set(rows.map((row) => getStringValue(row, keys)).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, "id"))
    .slice(0, 40);
}

export default async function WipRepairPage() {
  const result = await getWipRepairRows();
  const rows = result.rows;
  const columns = getColumns(rows);
  const statusOptions = getUniqueOptions(rows, ["status", "process", "currentProcess"]);
  const siteOptions = getUniqueOptions(rows, ["site", "location", "warehouse", "branch"]);
  const customerOptions = getUniqueOptions(rows, ["customer", "customerName", "customer_name"]);
  const openCount = rows.filter((row) => {
    const status = getStringValue(row, ["status", "process", "currentProcess"]).toLowerCase();
    return status && !["done", "complete", "completed", "closed", "finish", "finished"].includes(status);
  }).length;
  const updatedCount = rows.filter((row) => getStringValue(row, ["updatedAt", "updated_at", "modifiedAt", "modified_at"])).length;

  return (
    <AdminPageShell
      eyebrow="Repair & Retread Operation › WIP Repair"
      title="WIP Repair"
      description="Monitoring work-in-progress repair dari integrasi One Chitra. Data dibaca langsung dari API WIP Repair."
    >
      <AdminMetricGrid
        items={[
          { label: "Total WIP", value: `${rows.length}`, meta: "Data dari One Chitra" },
          { label: "Masih proses", value: `${openCount}`, meta: "Status belum selesai" },
          { label: "Status unik", value: `${statusOptions.length}`, meta: "Kategori proses/status" },
          { label: "Ada update", value: `${updatedCount}`, meta: "Baris dengan tanggal update" },
        ]}
      />

      {result.error ? (
        <div className="surface-module-card rounded-[1.2rem] border-0 bg-surface-container-lowest p-5 text-sm text-muted-foreground shadow-sm">
          <div className="mb-2 font-display text-base font-semibold text-foreground">API belum mengembalikan data</div>
          <p>{result.error}</p>
          <p className="mt-2">Endpoint: {WIP_REPAIR_ENDPOINT}</p>
        </div>
      ) : null}

      <AdminTableCard
        title="WIP Repair"
        description="Daftar ban/unit repair yang sedang berjalan. Search, filter, sort, dan Excel tersedia di toolbar tabel."
        columns={columns.length > 0 ? columns.map(humanizeKey) : ["Data"]}
        dateFilter={columns.some((column) => /date|at/i.test(column)) ? "auto" : false}
        showImport={false}
        presets={
          statusOptions.length > 0 ? (
            <TableFilterPresets presets={statusOptions.slice(0, 3).map((status) => ({ label: status, filters: { status } }))} />
          ) : undefined
        }
        filters={
          <>
            {statusOptions.length > 0 ? (
              <TableMultiFilter label="status" filterKey="status" options={statusOptions.map((status) => ({ value: status, label: status }))} />
            ) : null}
            {siteOptions.length > 0 ? (
              <TableMultiFilter label="lokasi" filterKey="site" options={siteOptions.map((site) => ({ value: site, label: site }))} />
            ) : null}
            {customerOptions.length > 0 ? (
              <TableMultiFilter label="customer" filterKey="customer" options={customerOptions.map((customer) => ({ value: customer, label: customer }))} />
            ) : null}
          </>
        }
        rows={
          rows.length > 0
            ? rows.map((row, rowIndex) =>
                columns.map((column) => {
                  const value = formatValue(row[column]);
                  if (/status|process/i.test(column)) {
                    return <AdminStatusBadge key={`${rowIndex}-${column}`} value={value} />;
                  }

                  return value;
                }),
              )
            : [[result.error ? "Data tidak tersedia karena API gagal." : "Belum ada data WIP Repair."]]
        }
        rowAttributes={rows.map((row) => ({
          "data-filter-status": getStringValue(row, ["status", "process", "currentProcess"]),
          "data-filter-site": getStringValue(row, ["site", "location", "warehouse", "branch"]),
          "data-filter-customer": getStringValue(row, ["customer", "customerName", "customer_name"]),
          "data-date-value": getStringValue(row, ["updatedAt", "updated_at", "receivedDate", "received_at", "createdAt", "created_at"]),
        }))}
      />
    </AdminPageShell>
  );
}