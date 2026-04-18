import { AdminMetricGrid } from "@/components/admin-metric-grid";
import { AdminPageShell } from "@/components/admin-page-shell";
import { AdminStatusBadge } from "@/components/admin-status-badge";
import { AdminTableCard } from "@/components/admin-table-card";
import {
  TimesheetCrudForm,
  TimesheetRowActions,
} from "@/components/operational-crud-panels";
import { getOperationalCrudOptions, getTimesheetPageData } from "@/lib/hero-admin";

export default async function TimesheetPage() {
  const [rows, options] = await Promise.all([
    getTimesheetPageData(),
    getOperationalCrudOptions(),
  ]);

  return (
    <AdminPageShell
      eyebrow="M3 • Timesheet & Payroll Support"
      title="Timesheet Administration"
      description="Ringkasan jam reguler, lembur, dan status payroll support dalam format web admin yang siap ditindaklanjuti HC."
    >
      <AdminMetricGrid
        items={[
          { label: "Entries", value: `${rows.length}`, meta: "Timesheet period aktif" },
          {
            label: "Ready payroll",
            value: `${rows.filter((row) => row.status === "ready_for_payroll").length}`,
            meta: "Siap diexport ke payroll",
          },
          {
            label: "Need correction",
            value: `${rows.filter((row) => row.status === "needs_correction").length}`,
            meta: "Butuh perbaikan sebelum final",
          },
        ]}
      />

      <TimesheetCrudForm employees={options.employees} sites={options.sites} />

      <AdminTableCard
        title="Timesheet Entries"
        description="Data lembur dan jam kerja yang terhubung ke approval dan siap dipakai untuk payroll support."
        columns={["Employee", "Role", "Period", "Regular", "Overtime", "Amount", "Status", "Action"]}
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
          />,
        ])}
      />
    </AdminPageShell>
  );
}
