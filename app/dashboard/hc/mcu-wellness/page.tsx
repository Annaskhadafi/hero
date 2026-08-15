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
    getMcuWellnessList().catch(() => []),
    getMcuFilterOptions().catch(() => ({ departments: [], sections: [] })),
    getActiveMcuClinics().catch(() => []),
    getMcuReminders().catch(() => []),
    getMcuReminderScorecards().catch(() => ({ total: 0, overdue: 0, due: 0, upcoming: 0, noRecord: 0 })),
    getHealthDashboardData().catch(() => ({
      trends: [],
      kpi: { fit: 0, unfit: 0, pending: 0, scheduled: 0, done: 0 },
      abnormalByCategory: [],
    })),
  ]);

  // Clean serialization to avoid React Server DOM deep prototype / array nesting errors
  const serialized = JSON.parse(
    JSON.stringify({
      mcuList,
      filterOptions,
      clinics,
      reminders,
      reminderScorecards,
      dashboardData,
    })
  );

  return (
    <McuWellnessClientPage
      initialMcuList={serialized.mcuList}
      filterOptions={serialized.filterOptions}
      clinics={serialized.clinics}
      initialReminders={serialized.reminders}
      initialReminderScorecards={serialized.reminderScorecards}
      initialDashboardData={serialized.dashboardData}
    />
  );
}
