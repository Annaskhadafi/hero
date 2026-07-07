import { getForecastPeriods, getForecastItems, getDailyForecastItems } from "@/app/actions/central-service-forecast";
import { ReportClientPage } from "./client-page";

export default async function DailyReportPage() {
  const [periods, dailyItems] = await Promise.all([
    getForecastPeriods(),
    getDailyForecastItems(),
  ]);

  return <ReportClientPage periods={periods} dailyItems={dailyItems} />;
}
