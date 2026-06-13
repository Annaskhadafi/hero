import { redirect } from 'next/navigation'
import { getIncidentRecords } from '@/app/dashboard/hse/incident-report/actions'
import { MobileIncidentClient } from '@/components/mobile/mobile-hse-modules-client'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'

export default async function MobileIncidentReportPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')
  const [result, access] = await Promise.all([getIncidentRecords(), getCurrentMenuPermission('hse_incident_report')])
  return <MobileIncidentClient records={result.success ? (result.data ?? []) : []} access={access} />
}
