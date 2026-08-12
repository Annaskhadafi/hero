import { Suspense } from 'react'
import { getDailyForecastItems, getForecastPeriods } from '@/app/actions/central-service-forecast'
import { fetchSapInvoices } from '@/lib/cs-sap-db'
import { DailyClientPage } from './client-page'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function DailyForecastPage() {
  const access = await getCurrentMenuPermission('cs-forecast')
  if (!access.canView) redirect('/403')

  const allItems = await getDailyForecastItems()
  const periods = await getForecastPeriods()

  const firstPeriod = periods[0]
  const sapInvoices = firstPeriod ? await fetchSapInvoices(firstPeriod.monthYear) : []

  return (
    <Suspense fallback={<div className="text-muted-foreground p-6">Loading...</div>}>
      <DailyClientPage initialItems={allItems} periods={periods} initialSapInvoices={sapInvoices} />
    </Suspense>
  )
}
