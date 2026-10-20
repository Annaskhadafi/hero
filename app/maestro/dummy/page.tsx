import { redirect } from 'next/navigation'
import { getMaestroServerSession } from '@/lib/maestro-session'
import { TireScrapDashboard } from '../scrap/tire-scrap-dashboard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tire Scrap Performance',
  description: 'Monitor tire scrap performance, life achievement, and scrap reasons across mining sites.',
}

export default async function MaestroDummyPage() {
  const session = await getMaestroServerSession()
  if (!session) redirect('/login')

  return <TireScrapDashboard customerName={session.customer.name} userName={session.user.name} />
}
