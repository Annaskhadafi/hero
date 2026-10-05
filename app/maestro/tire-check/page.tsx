import { redirect } from 'next/navigation'
import { getMaestroServerSession } from '@/lib/maestro-session'
import { TireCheckClientPage } from '@/app/dashboard/tire-check/client-page'
import { getTireCheckMockData } from '@/app/dashboard/tire-check/mock-data'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tire Check Monitoring - MAESTRO',
  description: 'Monitor daily tire check, low pressure trend, and operational targets across mining sites.',
}

export default async function MaestroTireCheckPage() {
  const session = await getMaestroServerSession()
  if (!session) redirect('/login')

  const initialData = getTireCheckMockData('CK-BIB GH', '2026-02')

  return (
    <div className="flex-1 bg-[#f3f7fa]">
      <TireCheckClientPage initialData={initialData} />
    </div>
  )
}
