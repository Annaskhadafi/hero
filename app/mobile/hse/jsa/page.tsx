import { redirect } from 'next/navigation'
import { getJsaList } from '@/app/dashboard/hse/jsa/actions'
import { MobileJsaClient } from '@/components/mobile/mobile-hse-modules-client'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'

export default async function MobileJsaPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')
  const [rows, access] = await Promise.all([getJsaList(), getCurrentMenuPermission('hse_jsa')])
  return <MobileJsaClient rows={rows} access={access} />
}
