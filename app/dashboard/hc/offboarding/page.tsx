import {
  getOffboardingRecords,
  getOffboardingStats,
  getActiveEmployees,
} from "@/app/actions/offboarding";
import { OffboardingClientPage } from "./client-page";

export const metadata = {
  title: "Offboarding Karyawan - HC",
};

export default async function OffboardingPage() {
  const [records, stats, employees] = await Promise.all([
    getOffboardingRecords(),
    getOffboardingStats(),
    getActiveEmployees(),
  ]);

  return (
    <OffboardingClientPage
      records={records}
      stats={stats}
      employees={employees}
    />
  );
}
