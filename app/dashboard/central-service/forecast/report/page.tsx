import { getForecastPeriods, getDailyForecastItems } from '@/app/actions/central-service-forecast'
import { fetchSapRevenue } from '@/lib/cs-sap-db'
import { ReportClientPage } from './client-page'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function DailyReportPage() {
  const access = await getCurrentMenuPermission('cs-forecast')
  if (!access.canView) redirect('/dashboard')

  const [periods, dailyItems] = await Promise.all([getForecastPeriods(), getDailyForecastItems()])

  // Fetch SAP revenue for the first period
  const firstPeriod = periods[0]
  const sapRevenue = firstPeriod
    ? await fetchSapRevenue(firstPeriod.monthYear)
    : {
        service: { idr: 0, usd: 0 },
        repair: { idr: 0, usd: 0 },
        retread: { idr: 0, usd: 0 },
        rows: [],
      }

  return (
    <ReportClientPage
      periods={periods}
      dailyItems={dailyItems}
      initialSapRevenue={sapRevenue}
      exchangeRate={firstPeriod?.exchangeRateIdrToUsd || '15000'}
    />
  )
}
