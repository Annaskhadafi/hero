import { getForecastPeriods, getSalesEmployees } from '@/app/actions/central-service-forecast'
import { MonthlyClientPage } from './client-page'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function MonthlyForecastPage() {
  const access = await getCurrentMenuPermission('cs-forecast')
  if (!access.canView) redirect('/403')

  const periods = await getForecastPeriods()
  const salesEmployees = await getSalesEmployees()

  return <MonthlyClientPage initialPeriods={periods} salesEmployees={salesEmployees} />
}

