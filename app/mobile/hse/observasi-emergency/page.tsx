import { redirect } from 'next/navigation'
import { getIncidentRecords } from '@/app/dashboard/hse/incident-report/actions'
import { MobileObservasiEmergencyClient } from '@/components/mobile/mobile-observasi-emergency-client'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'

export const dynamic = 'force-dynamic'

export default async function MobileObservasiEmergencyPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const [recordsResult, access] = await Promise.all([
    getIncidentRecords(),
    getCurrentMenuPermission('hse_incident_report'),
  ])

  const records = recordsResult.success ? (recordsResult.data ?? []) : []

  return <MobileObservasiEmergencyClient records={records} access={access} />
}
