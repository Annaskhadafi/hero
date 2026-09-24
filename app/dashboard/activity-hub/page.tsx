import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { canAccessDailyActivityMonitoring } from '@/lib/hero-access'

export default async function ActivityHubRootPage() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    redirect('/sign-in')
  }

  const sessionRole = (session.user as { role?: string }).role || null
  const canAccess = await canAccessDailyActivityMonitoring(
    session.user.email,
    session.user.id,
    sessionRole
  )

  if (canAccess) {
    redirect('/dashboard/daily-activity')
  } else {
    redirect('/dashboard/activity-hub/my-day')
  }
}
