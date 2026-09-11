import { getForecastPeriods } from '@/app/actions/central-service-forecast'
import { db } from '@/db'
import {
  centralServiceForecastItems,
  centralServiceForecastActuals,
} from '@/db/schema/central-service'
import { DashboardClientPage } from './client-page'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { redirect } from 'next/navigation'

export const revalidate = 0

export default async function ForecastDashboardPage() {
  const access = await getCurrentMenuPermission('cs-forecast')
  if (!access.canView) redirect('/dashboard')

  const periods = await getForecastPeriods()

  const allItems = await db.select().from(centralServiceForecastItems)
  const allActuals = await db.select().from(centralServiceForecastActuals)

  return <DashboardClientPage periods={periods} allItems={allItems} allActuals={allActuals} />
}
