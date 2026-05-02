import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { AdminTableCard } from "@/components/admin-table-card";
import {
  TimesheetCrudForm,
  TimesheetRowActions,
} from "@/components/operational-crud-panels";
import { TableFilterPresets } from "@/components/table-filter-presets";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";
import { getOperationalCrudOptions, getTimesheetPageData } from "@/lib/hero-admin";

export default async function TimesheetPage() {
  const [rows, options] = await Promise.all([
    getTimesheetPageData(),
    getOperationalCrudOptions(),
  ]);
  const siteOptions = Array.from(new Set(options.sites.map((site) => site.name))).sort();
  const statusOptions = Array.from(new Set(rows.map((row) => row.status))).sort();
  const periodOptions = Array.from(new Set(rows.map((row) => row.periodLabel))).sort();

  return (
    <AdminPageShell
      eyebrow="M3 • Timesheet & Payroll Support"
      title="Timesheet Administration"
      description="Ringkasan jam reguler, lembur, dan status payroll support dalam format web admin yang siap ditindaklanjuti HC."
    >
      <AdminMetricGrid
        mode="compact"
        items={[
          { label: "Entry timesheet", value: `${rows.length}`, meta: "Periode kerja yang sedang terdata" },
          {
            label: "Siap payroll",
            value: `${rows.filter((row) => row.status === "ready_for_payroll").length}`,
            meta: "Bisa diteruskan ke proses payroll",
          },
          {
            label: "Perlu koreksi",
            value: `${rows.filter((row) => row.status === "needs_correction").length}`,
            meta: "Masih perlu perbaikan sebelum final",
          },
        ]}
      />

      <AdminTableCard
        title="Antrian timesheet"
        description="Pantau jam reguler, lembur, dan record yang sudah siap diproses payroll dari satu workspace tabel."
        columns={["Employee", "Role", "Period", "Regular", "Overtime", "Amount", "Status", "Action"]}
        actions={<TimesheetCrudForm employees={options.employees} sites={options.sites} categoryOptions={options.categoryOptions} />}
        filters={
          <>
            <TableMultiFilter label="periode" filterKey="period" options={periodOptions.map((option) => ({ value: option, label: option }))} />
            <TableMultiFilter label="status" filterKey="status" options={statusOptions.map((option) => ({ value: option, label: option }))} />
            <TableMultiFilter label="site" filterKey="site" options={siteOptions.map((option) => ({ value: option, label: option }))} />
          </>
        }
        presets={<TableFilterPresets presets={[{ label: "Siap payroll", filters: { status: "ready_for_payroll" } }, { label: "Perlu koreksi", filters: { status: "needs_correction" } }]} />}
        rows={rows.map((row, index) => [
          row.employeeName,
          row.role,
          row.periodLabel,
          row.regularHours,
          row.overtimeHours,
          row.overtimeCost,
          <AdminStatusBadge key={`${index}-status`} value={row.status} />,
          <TimesheetRowActions
            key={`${row.id}-actions`}
            row={row}
            employees={options.employees}
            sites={options.sites}
            categoryOptions={options.categoryOptions}
          />,
        ])}
        rowAttributes={rows.map((row) => ({
          "data-filter-period": row.periodLabel,
          "data-filter-status": row.status,
          "data-filter-site": options.sites.find((site) => site.id === row.siteId)?.name ?? "",
        }))}
      />
    </AdminPageShell>
  );
}







