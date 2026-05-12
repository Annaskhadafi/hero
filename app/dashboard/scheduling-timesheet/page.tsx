import { SchedulingTimesheetWorkspace } from "@/components/scheduling-timesheet-workspace";
import { getSchedulingTimesheetOverviewOptions } from "@/lib/hero-admin";

export default async function SchedulingTimesheetPage() {
  const options = await getSchedulingTimesheetOverviewOptions();

  return <SchedulingTimesheetWorkspace mode="overview" employees={options.employees} sites={options.sites} schedulingConfigs={options.schedulingConfigs} schedulingStatuses={options.schedulingStatuses} />;
}
