import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { TireScrapDashboard } from '@/app/maestro/scrap/tire-scrap-dashboard'
import { fetchTireScrapPerformance } from '@/app/actions/maestro-tire-scrap'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tire Scrap Performance | HERO',
  description: 'Monitoring performa ban scrap, pencapaian target lifetime, estimasi kerugian, dan analisa penyebab scrap di seluruh site.',
}

export default async function HeroTireScrapPage() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    redirect('/sign-in')
  }

  // Pre-fetch initial real data from CTS API with site CK-KIM (idsite: 33, id_company: 2)
  const result = await fetchTireScrapPerformance({
    site: 'CK-KIM',
    idsite: '33',
    id_company: '2',
    unit: 'HM',
    limit: 500,
  })

  return (
    <div className="flex-1 bg-[#f8fafc]">
      <TireScrapDashboard
        customerName="HERO Internal Operations"
        userName={session.user.name || session.user.email}
        initialData={result.success ? result.data : null}
        initialError={result.error}
        hideTopNav={true}
      />
    </div>
  )
}
