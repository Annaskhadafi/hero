import { getForecastPeriods } from "@/app/actions/central-service-forecast";
import { db } from "@/db";
import { centralServiceForecastItems, centralServiceForecastActuals } from "@/db/schema/central-service";
import { DashboardClientPage } from "./client-page";

export default async function ForecastDashboardPage() {
  const periods = await getForecastPeriods();
  
  // For a real dashboard, we'd fetch all items and actuals for the selected periods.
  // Since we don't have infinite data, let's just fetch all of them for now to power the dashboard.
  const allItems = await db.select().from(centralServiceForecastItems);
  const allActuals = await db.select().from(centralServiceForecastActuals);

  return (
    <DashboardClientPage 
      periods={periods}
      allItems={allItems}
      allActuals={allActuals}
    />
  );
}
