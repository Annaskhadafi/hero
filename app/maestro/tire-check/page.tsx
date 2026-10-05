import { redirect } from 'next/navigation'
import { getMaestroServerSession } from '@/lib/maestro-session'
import { TireCheckClientPage } from '@/app/dashboard/tire-check/client-page'
import { getTireCheckData } from '@/app/actions/tire-check'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Tire Check Monitoring - MAESTRO',
  description: 'Monitor daily tire check, low pressure trend, and operational targets across mining sites.',
}

export default async function MaestroTireCheckPage() {
  const session = await getMaestroServerSession()
  if (!session) redirect('/login')

  const initialData = await getTireCheckData('CK-BIB GH')

  return (
    <div className="flex-1 bg-[#f3f7fa]">
      <TireCheckClientPage initialData={initialData} />
    </div>
  )
}
