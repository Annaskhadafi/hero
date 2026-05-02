import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { AdminTableCard } from "@/components/admin-table-card";
import { TableFilterPresets } from "@/components/table-filter-presets";
import {
  HseCrudForms,
  HseIncidentRowActions,
  HseObservationRowActions,
} from "@/components/operational-crud-panels";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";
import { getHsePageData, getOperationalCrudOptions } from "@/lib/hero-admin";

export default async function HsePage() {
  const [{ observations, incidents }, options] = await Promise.all([
    getHsePageData(),
    getOperationalCrudOptions(),
  ]);
  const siteOptions = Array.from(new Set(options.sites.map((site) => site.name))).sort();
  const observationCategories = Array.from(new Set(observations.map((row) => row.category))).sort();
  const observationStatuses = Array.from(new Set(observations.map((row) => row.status))).sort();
  const incidentStatuses = Array.from(new Set(incidents.map((row) => row.status))).sort();
  const incidentTypes = Array.from(new Set(incidents.map((row) => row.type))).sort();

  return (
    <AdminPageShell
      eyebrow="M6 • HSE Module"
      title="HSE Operations Desk"
      description="Dashboard web admin untuk observasi, incident, dan tindak lanjut HSE lintas site."
    >
      <AdminMetricGrid
        mode="compact"
        items={[
          { label: "Observasi", value: `${observations.length}`, meta: "Temuan lapangan yang tercatat" },
          {
            label: "Item terbuka",
            value: `${observations.filter((row) => row.status === "open").length}`,
            meta: "Perlu closure action",
          },
          {
            label: "Insiden",
            value: `${incidents.length}`,
            meta: "Insiden yang perlu dipantau",
          },
        ]}
      />

      <Tabs defaultValue="observations" className="space-y-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
          <TabsTrigger value="observations">Observasi</TabsTrigger>
          <TabsTrigger value="incidents">Insiden</TabsTrigger>
        </TabsList>

        <TabsContent value="observations">
          <AdminTableCard
            title="Observasi lapangan"
            description="Temuan unsafe act dan unsafe condition yang perlu closure action atau eskalasi supervisor."
            columns={["Title", "Category", "Location", "Reporter", "Severity", "Status", "Action"]}
            dateFilter
            actions={<HseCrudForms employees={options.employees} sites={options.sites} categoryOptions={options.categoryOptions} mode="observation" />}
            presets={<TableFilterPresets presets={[{ label: "Terbuka", filters: { status: "open" } }, { label: "Ditangani", filters: { status: "action_taken" } }]} />}
            filters={
              <>
                <TableMultiFilter label="site" filterKey="site" options={siteOptions.map((option) => ({ value: option, label: option }))} />
                <TableMultiFilter label="kategori" filterKey="category" options={observationCategories.map((option) => ({ value: option, label: option }))} />
                <TableMultiFilter label="status" filterKey="status" options={observationStatuses.map((option) => ({ value: option, label: option }))} />
              </>
            }
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
                categoryOptions={options.categoryOptions}
              />,
            ])}
            rowAttributes={observations.map((row) => ({
              "data-date-value": row.observedAt?.toISOString?.() ?? "",
              "data-filter-site": options.sites.find((site) => site.id === row.siteId)?.name ?? "",
              "data-filter-category": row.category,
              "data-filter-status": row.status,
            }))}
          />
        </TabsContent>

        <TabsContent value="incidents">
          <AdminTableCard
            title="Insiden HSE"
            description="Antrian insiden untuk investigasi, update status, dan pelaporan manajemen per site."
            columns={["Title", "Type", "Unit", "Impact", "Reported", "Status", "Action"]}
            dateFilter
            actions={<HseCrudForms employees={options.employees} sites={options.sites} categoryOptions={options.categoryOptions} mode="incident" />}
            presets={<TableFilterPresets presets={[{ label: "Ditinjau", filters: { status: "investigating" } }, { label: "Selesai", filters: { status: "closed" } }]} />}
            filters={
              <>
                <TableMultiFilter label="site" filterKey="site" options={siteOptions.map((option) => ({ value: option, label: option }))} />
                <TableMultiFilter label="tipe" filterKey="type" options={incidentTypes.map((option) => ({ value: option, label: option }))} />
                <TableMultiFilter label="status" filterKey="status" options={incidentStatuses.map((option) => ({ value: option, label: option }))} />
              </>
            }
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
                categoryOptions={options.categoryOptions}
              />,
            ])}
            rowAttributes={incidents.map((row) => ({
              "data-date-value": row.reportedAt.toISOString(),
              "data-filter-site": options.sites.find((site) => site.id === row.siteId)?.name ?? "",
              "data-filter-type": row.type,
              "data-filter-status": row.status,
            }))}
          />
        </TabsContent>
      </Tabs>
    </AdminPageShell>
  );
}





