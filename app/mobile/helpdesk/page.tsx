import { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getServerSession } from '@/lib/auth-session'
import { getTroubleshootDashboardData } from '@/app/actions/service-desk'
import { MobileTroubleshootClient } from '@/components/mobile/mobile-troubleshoot-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Troubleshooting & Tiket Mobile | HERO',
  description: 'Pusat lapor dan monitoring kendala operasional, telematika sensor, dan tiket sistem HERO.',
}

export default async function MobileHelpdeskPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/mobile/helpdesk')
  }

  const initialData = await getTroubleshootDashboardData()

  return <MobileTroubleshootClient initialData={initialData} />
}
