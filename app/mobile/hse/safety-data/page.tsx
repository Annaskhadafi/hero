import { redirect } from 'next/navigation'
import { getSafetyDashboardData } from '@/lib/safety-dashboard/queries'
import { getServerSession } from '@/lib/auth-session'
import { MobileSafetyDataClient } from '@/components/mobile/mobile-safety-data-client'

export const dynamic = 'force-dynamic'

export default async function MobileSafetyDataPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const data = await getSafetyDashboardData()
  if (!data) return null

  return <MobileSafetyDataClient data={data} />
}
