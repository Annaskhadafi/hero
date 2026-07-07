import { getDailyForecastItems, getForecastPeriods } from "@/app/actions/central-service-forecast";
import { fetchSapInvoices } from "@/lib/cs-sap-db";
import { DailyClientPage } from "./client-page";

export const revalidate = 0;

export default async function DailyForecastPage() {
  const allItems = await getDailyForecastItems();
  const periods = await getForecastPeriods();

  const firstPeriod = periods[0];
  const sapInvoices = firstPeriod
    ? await fetchSapInvoices(firstPeriod.monthYear)
    : [];

  return (
    <DailyClientPage
      initialItems={allItems}
      periods={periods}
      initialSapInvoices={sapInvoices}
    />
  );
}
