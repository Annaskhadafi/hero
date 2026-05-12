import { SchedulingTimesheetWorkspace } from "@/components/scheduling-timesheet-workspace";
import { getSchedulingTimesheetScheduleOptions } from "@/lib/hero-admin";

export default async function SchedulingTimesheetSchedulePage() {
  const options = await getSchedulingTimesheetScheduleOptions();

  return <SchedulingTimesheetWorkspace mode="schedule" employees={options.employees} sites={options.sites} savedPlans={options.savedPlans} fieldBreakPlans={options.fieldBreakPlans} schedulingConfigs={options.schedulingConfigs} schedulingStatuses={options.schedulingStatuses} />;
}
