import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { AdminTableCard } from "@/components/admin-table-card";
import { getHsePageData } from "@/lib/hero-admin";

export default async function HsePage() {
  const { observations, incidents } = await getHsePageData();

  return (
    <AdminPageShell
      eyebrow="M6 • HSE Module"
      title="HSE Operations Desk"
      description="Dashboard web admin untuk observasi, incident, dan tindak lanjut HSE lintas site."
    >
      <AdminMetricGrid
        items={[
          { label: "Observations", value: `${observations.length}`, meta: "Temuan HSE yang tercatat" },
          {
            label: "Open items",
            value: `${observations.filter((row) => row.status === "open").length}`,
            meta: "Butuh closure action",
          },
          {
            label: "Incidents",
            value: `${incidents.length}`,
            meta: "Incident feed aktif",
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminTableCard
          title="Observations"
          description="Temuan unsafe act dan unsafe condition yang masuk dari lapangan."
          columns={["Title", "Category", "Location", "Reporter", "Severity", "Status"]}
          rows={observations.map((row, index) => [
            row.title,
            row.category,
            row.location,
            row.reporter ?? "System",
            row.severity,
            <AdminStatusBadge key={`${index}-status`} value={row.status} />,
          ])}
        />
        <AdminTableCard
          title="Incidents"
          description="Feed incident untuk review HSE dan manajemen."
          columns={["Title", "Type", "Unit", "Impact", "Reported", "Status"]}
          rows={incidents.map((row, index) => [
            row.title,
            row.type,
            row.unitNumber,
            row.impact,
            row.reportedAt.toLocaleDateString("id-ID"),
            <AdminStatusBadge key={`${index}-status`} value={row.status} />,
          ])}
        />
      </div>
    </AdminPageShell>
  );
}
