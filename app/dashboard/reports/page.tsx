import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { AdminTableCard } from "@/components/admin-table-card";
import {
  DailyReportCrudForm,
  DailyReportRowActions,
} from "@/components/operational-crud-panels";
import { TableFilterPresets } from "@/components/table-filter-presets";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";
import { getOperationalCrudOptions, getReportsPageData } from "@/lib/hero-admin";

export default async function ReportsPage() {
  const [rows, options] = await Promise.all([
    getReportsPageData(),
    getOperationalCrudOptions(),
  ]);
  const latest = rows[0];
  const siteOptions = Array.from(new Set(rows.map((row) => row.siteName))).sort();
  const statusOptions = Array.from(new Set(rows.map((row) => row.status))).sort();
  const customerOptions = Array.from(new Set(rows.map((row) => row.customerName))).sort();

  return (
    <AdminPageShell
      eyebrow="M4 • Daily Report Generator"
      title="Daily Report Control"
      description="Kontrol backend web untuk kesiapan laporan harian customer, section readiness, dan status generate report."
      badge={latest?.siteName}
    >
      <AdminMetricGrid
        mode="compact"
        items={[
          { label: "Report harian", value: `${rows.length}`, meta: "Laporan customer yang sudah tercatat" },
          {
            label: "Kesiapan terbaru",
            value: latest ? `${latest.readySections}/${latest.totalSections}` : "0/0",
            meta: "Section siap pada laporan paling baru",
          },
          {
            label: "Manpower hadir",
            value: latest ? `${latest.manpowerPresent}` : "0",
            meta: "Masuk ke rekap laporan terbaru",
          },
        ]}
      />
      <AdminTableCard
        title="Kontrol laporan harian"
        description="Review kesiapan laporan customer, cari report yang belum lengkap, lalu tindak lanjuti dari tabel utama."
        columns={["Date", "Customer", "Sections", "Jobs", "Manpower", "HSE", "Status", "Action"]}
        actions={<DailyReportCrudForm sites={options.sites} categoryOptions={options.categoryOptions} />}
        filters={
          <>
            <TableMultiFilter label="site" filterKey="site" options={siteOptions.map((option) => ({ value: option, label: option }))} />
            <TableMultiFilter label="status" filterKey="status" options={statusOptions.map((option) => ({ value: option, label: option }))} />
            <TableMultiFilter label="customer" filterKey="customer" options={customerOptions.map((option) => ({ value: option, label: option }))} />
          </>
        }
        presets={<TableFilterPresets presets={[{ label: "Draft", filters: { status: "draft" } }, { label: "Siap kirim", filters: { status: "ready" } }]} />}
        dateFilter
        rows={rows.map((row, index) => [
          row.reportDate.toLocaleDateString("id-ID"),
          row.customerName,
          `${row.readySections}/${row.totalSections}`,
          `${row.jobsCompleted}`,
          `${row.manpowerPresent}`,
          row.hseSummary,
          <AdminStatusBadge key={`${index}-status`} value={row.status} />,
          <DailyReportRowActions
            key={`${row.id}-actions`}
            row={row}
            sites={options.sites}
            categoryOptions={options.categoryOptions}
          />,
        ])}
        rowAttributes={rows.map((row) => ({
          "data-date-value": row.reportDate.toISOString(),
          "data-filter-site": row.siteName,
          "data-filter-status": row.status,
          "data-filter-customer": row.customerName,
        }))}
      />
    </AdminPageShell>
  );
}


