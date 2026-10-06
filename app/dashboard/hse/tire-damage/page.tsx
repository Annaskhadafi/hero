import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import TireDamageDesktopClient from './tire-damage-desktop-client'

export const dynamic = 'force-dynamic'

export default async function TireDamageDesktopPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const access = await getCurrentMenuPermission('hse_tire_inspection')
  if (!access.canView) redirect('/dashboard')

  return <TireDamageDesktopClient canEdit={access.canEdit} />
}
