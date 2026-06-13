import { redirect } from 'next/navigation'
import { getHseInventories, runHseInventoryReminderCheck, getHseUserEmails } from '@/app/actions/hse-inventaris'
import { MobileHseInventarisClient } from '@/components/mobile/mobile-hse-inventaris-client'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { getServerSession } from '@/lib/auth-session'

export const dynamic = 'force-dynamic'

export default async function MobileHseInventarisPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  await runHseInventoryReminderCheck()

  const [inventoriesResult, access, userEmailsResult] = await Promise.all([
    getHseInventories(),
    getCurrentMenuPermission('hse_inventaris'),
    getHseUserEmails(),
  ])

  const inventories = inventoriesResult.success ? (inventoriesResult.data ?? []) : []
  const userEmails = userEmailsResult.success ? (userEmailsResult.data ?? []) : []

  return (
    <MobileHseInventarisClient
      data={inventories}
      access={access}
      userEmails={userEmails}
    />
  )
}
