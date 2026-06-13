import { redirect } from 'next/navigation'
import { MobileHiradcClient } from '@/components/mobile/mobile-hse-modules-client'
import { getServerSession } from '@/lib/auth-session'
import { getHiradcData } from '@/lib/hiradc/queries'

export default async function MobileHiradcPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')
  const data = await getHiradcData()
  return <MobileHiradcClient entries={data.entries} />
}
