import { redirect } from 'next/navigation'
import { MobileCorrectiveActionClient } from '@/components/mobile/mobile-hse-modules-client'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { getMobileCorrectiveActions } from './actions'

export default async function MobileCorrectiveActionPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')
  const [records, access] = await Promise.all([getMobileCorrectiveActions(), getCurrentMenuPermission('hse_incident_report')])
  return <MobileCorrectiveActionClient records={records} access={access} />
}
