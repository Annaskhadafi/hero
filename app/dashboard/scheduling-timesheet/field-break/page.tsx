import { SchedulingTimesheetWorkspace } from "@/components/scheduling-timesheet-workspace";
import { getSchedulingTimesheetFieldBreakOptions } from "@/lib/hero-admin";

export default async function SchedulingTimesheetFieldBreakPage() {
  const options = await getSchedulingTimesheetFieldBreakOptions();

  return <SchedulingTimesheetWorkspace mode="field-break" employees={options.employees} sites={options.sites} fieldBreakPlans={options.fieldBreakPlans} schedulingConfigs={options.schedulingConfigs} schedulingStatuses={options.schedulingStatuses} />;
}
