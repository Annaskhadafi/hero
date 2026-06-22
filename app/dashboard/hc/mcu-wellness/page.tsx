import {
  getMcuWellnessList,
  getMcuFilterOptions,
  getMcuReminderScorecards,
  getMcuReminders,
  getHealthDashboardData,
} from "@/app/actions/mcu-wellness";
import { getActiveMcuClinics } from "@/app/actions/hc-mcu-clinics";
import { McuWellnessClientPage } from "./client-page";

export const metadata = {
  title: "MCU Wellness Advance - HC",
};

export default async function McuWellnessPage() {
  const [mcuList, filterOptions, clinics, reminders, reminderScorecards, dashboardData] = await Promise.all([
    getMcuWellnessList(),
    getMcuFilterOptions(),
    getActiveMcuClinics(),
    getMcuReminders(),
    getMcuReminderScorecards(),
    getHealthDashboardData(),
  ]);

  return (
    <McuWellnessClientPage
      initialMcuList={mcuList}
      filterOptions={filterOptions}
      clinics={clinics}
      initialReminders={reminders}
      initialReminderScorecards={reminderScorecards}
      initialDashboardData={dashboardData}
    />
  );
}
