import { getDailyForecastItems, getForecastPeriods } from "@/app/actions/central-service-forecast";
import { DailyClientPage } from "./client-page";

export default async function DailyForecastPage() {
  const allItems = await getDailyForecastItems();
  const periods = await getForecastPeriods();

  return <DailyClientPage initialItems={allItems} periods={periods} />;
}
