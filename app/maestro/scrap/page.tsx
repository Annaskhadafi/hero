import { redirect } from 'next/navigation'
import { getMaestroServerSession } from '@/lib/maestro-session'
import { TireScrapDashboard } from './tire-scrap-dashboard'
import { fetchTireScrapPerformance } from '@/app/actions/maestro-tire-scrap'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tire Scrap Performance - MAESTRO',
  description: 'Monitor tire scrap performance, life achievement, and scrap reasons across mining sites.',
}

export default async function MaestroScrapPage() {
  const session = await getMaestroServerSession()
  if (!session) redirect('/login')

  // Fetch initial scrap performance data from CTS API
  const result = await fetchTireScrapPerformance({
    unit: 'HM',
    year: '2026',
    limit: 100,
  })

  return (
    <TireScrapDashboard
      customerName={session.customer.name}
      userName={session.user.name}
      initialData={result.success ? result.data : null}
      initialError={result.error}
    />
  )
}
