import { redirect } from 'next/navigation'

import { MobileSiaSioToolsClient } from '@/components/mobile/mobile-sia-sio-tools-client'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'

export default async function MobileSiaSioToolsPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')
  const access = await getCurrentMenuPermission('hse_sia_sio_tools_certification')
  return <MobileSiaSioToolsClient access={access} />
}
