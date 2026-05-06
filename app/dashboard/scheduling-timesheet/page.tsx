import { AdminPageShell } from "@/components/admin-page-shell";
import { SchedulingTimesheetWorkspace } from "@/components/scheduling-timesheet-workspace";
import { getSchedulingTimesheetOptions } from "@/lib/hero-admin";

export default async function SchedulingTimesheetPage() {
  const options = await getSchedulingTimesheetOptions();

  return (
    <AdminPageShell
      eyebrow="HC • Scheduling Timesheet"
      title="Scheduling Time Sheet"
      description="Auto-generate jadwal tim tambang per site, lalu turunkan schedule menjadi MSA, Meals, dan overtime."
    >
      <SchedulingTimesheetWorkspace employees={options.employees} sites={options.sites} />
    </AdminPageShell>
  );
}
