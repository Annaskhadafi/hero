import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { AdminTableCard } from "@/components/admin-table-card";
import { getReportsPageData } from "@/lib/hero-admin";

export default async function ReportsPage() {
  const rows = await getReportsPageData();
  const latest = rows[0];

  return (
    <AdminPageShell
      eyebrow="M4 • Daily Report Generator"
      title="Daily Report Control"
      description="Kontrol backend web untuk kesiapan laporan harian customer, section readiness, dan status generate report."
      badge={latest?.siteName}
    >
      <AdminMetricGrid
        items={[
          { label: "Reports", value: `${rows.length}`, meta: "Daily report tersimpan" },
          {
            label: "Latest readiness",
            value: latest ? `${latest.readySections}/${latest.totalSections}` : "0/0",
            meta: "Kesiapan section report terbaru",
          },
          {
            label: "Manpower present",
            value: latest ? `${latest.manpowerPresent}` : "0",
            meta: "Masuk ke report terbaru",
          },
        ]}
      />
      <AdminTableCard
        title="Daily Reports"
        description="Report yang sudah dirakit dari aktivitas, approval, timesheet, dan HSE summary."
        columns={["Date", "Customer", "Sections", "Jobs", "Manpower", "HSE", "Status"]}
        rows={rows.map((row, index) => [
          row.reportDate.toLocaleDateString("id-ID"),
          row.customerName,
          `${row.readySections}/${row.totalSections}`,
          `${row.jobsCompleted}`,
          `${row.manpowerPresent}`,
          row.hseSummary,
          <AdminStatusBadge key={`${index}-status`} value={row.status} />,
        ])}
      />
    </AdminPageShell>
  );
}
