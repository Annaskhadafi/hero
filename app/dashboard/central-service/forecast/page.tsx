import { getForecastPeriods } from "@/app/actions/central-service-forecast";
import { db } from "@/db";
import { centralServiceForecastItems, centralServiceForecastActuals } from "@/db/schema/central-service";
import { DashboardClientPage } from "./client-page";

export const revalidate = 0;

export default async function ForecastDashboardPage() {
  const periods = await getForecastPeriods();
  
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
