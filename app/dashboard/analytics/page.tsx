import { getIndividualDashboardData, getAnalyticsDashboardData } from "@/lib/analytics-dashboard-data"
import { AnalyticsRedesignClient } from "@/components/analytics-redesign-client"

export const metadata = {
  title: "Dashboard Individu • HERO Analytics",
  description: "Dashboard Analytics Individu Karyawan, Score Card, Last Daily Activity, Training, Presensi V2, dan Reminders.",
}

export default async function AnalyticsPage() {
  const getData = getIndividualDashboardData || getAnalyticsDashboardData
  const data = await getData()

  return <AnalyticsRedesignClient data={data} />
}
