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

  const now = new Date()
  const currentFull = now.toLocaleString('en-US', { month: 'long', year: 'numeric' }).trim().toLowerCase()
  const currentShort = now.toLocaleString('en-US', { month: 'short', year: 'numeric' }).trim().toLowerCase()
  const currentIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const activePeriod = periods.find((p) => {
    const val = (p.monthYear || '').trim().toLowerCase()
    return val === currentFull || val === currentShort || val === currentIso
  }) || periods[0]

  // Fetch SAP revenue for the active period
  const sapRevenue = activePeriod
    ? await fetchSapRevenue(activePeriod.monthYear)
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
      exchangeRate={activePeriod?.exchangeRateIdrToUsd || '15000'}
    />
  )
}
