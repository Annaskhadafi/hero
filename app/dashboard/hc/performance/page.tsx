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

export default async function PerformancePage() {
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
