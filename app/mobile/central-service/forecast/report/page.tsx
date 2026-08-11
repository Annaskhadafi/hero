import { getForecastPeriods, getDailyForecastItems } from "@/app/actions/central-service-forecast";
import { fetchSapRevenue } from "@/lib/cs-sap-db";
import { MobileReportClientPage } from "./client-page";

export const revalidate = 0;

export default async function MobileDailyReportPage() {
  let periods: any[] = [];
  let dailyItems: any[] = [];
  let sapRevenue: any = { service: { idr: 0, usd: 0 }, repair: { idr: 0, usd: 0 }, retread: { idr: 0, usd: 0 }, rows: [] };

  try {
    const [fetchedPeriods, fetchedItems] = await Promise.all([
      getForecastPeriods().catch((err) => {
        console.error("[MobileDailyReportPage] getForecastPeriods error:", err);
        return [];
      }),
      getDailyForecastItems().catch((err) => {
        console.error("[MobileDailyReportPage] getDailyForecastItems error:", err);
        return [];
      }),
    ]);

    periods = fetchedPeriods || [];
    dailyItems = fetchedItems || [];

    const firstPeriod = periods[0];
    if (firstPeriod?.monthYear) {
      sapRevenue = await fetchSapRevenue(firstPeriod.monthYear).catch((err) => {
        console.error("[MobileDailyReportPage] fetchSapRevenue error:", err);
        return { service: { idr: 0, usd: 0 }, repair: { idr: 0, usd: 0 }, retread: { idr: 0, usd: 0 }, rows: [] };
      });
    }
  } catch (err) {
    console.error("[MobileDailyReportPage] Data fetch error:", err);
  }

  const firstPeriod = periods[0];

  return (
    <MobileReportClientPage
      periods={periods}
      dailyItems={dailyItems}
      initialSapRevenue={sapRevenue}
      exchangeRate={firstPeriod?.exchangeRateIdrToUsd || "15000"}
    />
  );
}
