import {
  getActiveEmployees,
  getPerformanceCycles,
  getPerformanceReviews,
  getPerformanceStats,
} from "@/app/actions/performance";
import { PerformanceClientPage } from "./client-page";

export const metadata = {
  title: "Performance Management - HC",
};

import { redirect } from "next/navigation";
import { getCurrentMenuPermission } from "@/lib/hero-access";

export default async function PerformancePage() {
  const access = await getCurrentMenuPermission("hc_performance");
  if (!access.canView) {
    redirect("/dashboard");
  }

  const [cycles, reviews, stats, employees] = await Promise.all([
    getPerformanceCycles(),
    getPerformanceReviews(),
    getPerformanceStats(),
    getActiveEmployees(),
  ]);

  return (
    <PerformanceClientPage
      cycles={cycles}
      reviews={reviews}
      stats={stats}
      employees={employees}
    />
  );
}
