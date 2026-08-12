import { Suspense } from "react";
import { getDailyForecastItems, getForecastPeriods } from "@/app/actions/central-service-forecast";
import { fetchSapInvoices } from "@/lib/cs-sap-db";
import { MobileDailyClientPage } from "./client-page";

export const revalidate = 0;

export default async function MobileDailyForecastPage() {
  let allItems: any[] = [];
  let periods: any[] = [];
  let sapInvoices: any[] = [];

  try {
    const [fetchedItems, fetchedPeriods] = await Promise.all([
      getDailyForecastItems().catch((err) => {
        console.error("[MobileDailyForecastPage] getDailyForecastItems error:", err);
        return [];
      }),
      getForecastPeriods().catch((err) => {
        console.error("[MobileDailyForecastPage] getForecastPeriods error:", err);
        return [];
      }),
    ]);

    allItems = fetchedItems || [];
    periods = fetchedPeriods || [];

    const firstPeriod = periods[0];
    if (firstPeriod?.monthYear) {
      sapInvoices = await fetchSapInvoices(firstPeriod.monthYear).catch((err) => {
        console.error("[MobileDailyForecastPage] fetchSapInvoices error:", err);
        return [];
      });
    }
  } catch (err) {
    console.error("[MobileDailyForecastPage] Data fetch error:", err);
  }

  return (
    <Suspense fallback={<div className="p-6 text-slate-400 text-center text-sm font-semibold">Loading CS Forecast Mobile...</div>}>
      <MobileDailyClientPage
        initialItems={allItems}
        periods={periods}
        initialSapInvoices={sapInvoices}
      />
    </Suspense>
  );
}
