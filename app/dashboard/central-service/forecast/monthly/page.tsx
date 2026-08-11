import { getMonthlyForecastItems, getSalesEmployees } from '@/app/actions/central-service-forecast'
import { MonthlyClientPage } from './client-page'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { redirect } from 'next/navigation'

export default async function MonthlyForecastPage() {
  const access = await getCurrentMenuPermission('cs-forecast')
  if (!access.canView) redirect('/403')

  const items = await getMonthlyForecastItems()
  const salesEmployees = await getSalesEmployees()

  return <MonthlyClientPage initialItems={items} salesEmployees={salesEmployees} />
}
