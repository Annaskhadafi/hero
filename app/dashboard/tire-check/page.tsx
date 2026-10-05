import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { TireCheckClientPage } from './client-page'
import { getTireCheckMockData } from './mock-data'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tire Check Monitoring | HERO',
  description:
    'Monitoring harian tekanan ban (Tire Check), kepatuhan target low pressure, dan tren harian operasional per site.',
}

export default async function HeroTireCheckPage() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    redirect('/sign-in')
  }

  // Pre-load initial mock data
  const initialData = getTireCheckMockData('CK-BIB GH', '2026-02')

  return (
    <div className="flex-1 bg-[#f3f7fa]">
      <TireCheckClientPage initialData={initialData} />
    </div>
  )
}
