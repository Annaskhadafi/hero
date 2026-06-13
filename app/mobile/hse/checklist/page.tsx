import { redirect } from 'next/navigation'

import {
  getChecklistTemplatesWithLatestRevision,
  getChecklistAuditLogs,
  getDailyChecklistHistory,
} from '@/app/actions/hse-checklists'
import { MobileHseChecklistClient } from '@/components/mobile/mobile-hse-checklist-client'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { getServerSession } from '@/lib/auth-session'

export default async function MobileHseChecklistPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const [templates, history, auditLogs, access] = await Promise.all([
    getChecklistTemplatesWithLatestRevision(),
    getDailyChecklistHistory(),
    getChecklistAuditLogs(),
    getCurrentMenuPermission('hse_checklist_generator'),
  ])

  return (
    <MobileHseChecklistClient
      currentUserName={session.user.name ?? session.user.email ?? 'HERO User'}
      templates={templates}
      history={history}
      auditLogs={auditLogs}
      access={access}
    />
  )
}
