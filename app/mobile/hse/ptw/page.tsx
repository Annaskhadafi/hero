import { redirect } from 'next/navigation'
import { MobilePtwClient } from '@/components/mobile/mobile-hse-modules-client'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { getHiradcData } from '@/lib/hiradc/queries'
import { getMobilePtwPermits } from './actions'

export default async function MobilePtwPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')
  const [hiradcData, access, permits] = await Promise.all([getHiradcData(), getCurrentMenuPermission('hse_izin_kerja_ptw'), getMobilePtwPermits()])
  return <MobilePtwClient sources={hiradcData.entries} access={access} permits={permits} />
}
