import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'

export default async function DashboardPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  redirect('/dashboard/analytics')
}
