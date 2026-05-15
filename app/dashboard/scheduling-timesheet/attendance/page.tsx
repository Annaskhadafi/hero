import { SchedulingTimesheetWorkspace } from "@/components/scheduling-timesheet-workspace";
import { getSchedulingTimesheetAttendanceOptions } from "@/lib/hero-admin";

export default async function SchedulingTimesheetAttendancePage() {
  const options = await getSchedulingTimesheetAttendanceOptions();

  return <SchedulingTimesheetWorkspace mode="attendance" employees={options.employees} sites={options.sites} savedPlans={options.savedPlans} attendanceRecords={options.attendanceRecords} attendanceOverrides={options.attendanceOverrides} schedulingConfigs={options.schedulingConfigs} schedulingStatuses={options.schedulingStatuses} importPreviews={options.importPreviews} activities={options.activities} currentEmployeeSiteId={options.currentEmployeeSiteId} />;
}
