import { getForecastPeriods, getSalesEmployees } from "@/app/actions/central-service-forecast";
import { MonthlyClientPage } from "./client-page";

export default async function MonthlyForecastPage() {
  const periods = await getForecastPeriods();
  const salesEmployees = await getSalesEmployees();

  return <MonthlyClientPage initialPeriods={periods} salesEmployees={salesEmployees} />;
}
