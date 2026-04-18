import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { AdminTableCard } from "@/components/admin-table-card";
import {
  HseCrudForms,
  HseIncidentRowActions,
  HseObservationRowActions,
} from "@/components/operational-crud-panels";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getHsePageData, getOperationalCrudOptions } from "@/lib/hero-admin";

export default async function HsePage() {
  const [{ observations, incidents }, options] = await Promise.all([
    getHsePageData(),
    getOperationalCrudOptions(),
  ]);

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

      <HseCrudForms employees={options.employees} sites={options.sites} />

      <Tabs defaultValue="observations" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="observations">Observations</TabsTrigger>
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
        </TabsList>

        <TabsContent value="observations">
          <AdminTableCard
            title="Observations"
            description="Temuan unsafe act dan unsafe condition yang masuk dari lapangan."
            columns={["Title", "Category", "Location", "Reporter", "Severity", "Status", "Action"]}
            dateFilter={false}
            rows={observations.map((row, index) => [
              row.title,
              row.category,
              row.location,
              row.reporter ?? "System",
              row.severity,
              <AdminStatusBadge key={`${index}-status`} value={row.status} />,
              <HseObservationRowActions
                key={`${row.id}-actions`}
                row={row}
                employees={options.employees}
                sites={options.sites}
              />,
            ])}
          />
        </TabsContent>

        <TabsContent value="incidents">
          <AdminTableCard
            title="Incidents"
            description="Feed incident untuk review HSE dan manajemen."
            columns={["Title", "Type", "Unit", "Impact", "Reported", "Status", "Action"]}
            dateFilter
            rows={incidents.map((row, index) => [
              row.title,
              row.type,
              row.unitNumber,
              row.impact,
              row.reportedAt.toLocaleDateString("id-ID"),
              <AdminStatusBadge key={`${index}-status`} value={row.status} />,
              <HseIncidentRowActions
                key={`${row.id}-actions`}
                row={row}
                sites={options.sites}
              />,
            ])}
          />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}
