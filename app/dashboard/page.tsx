import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const sp = searchParams ? await searchParams : {}
  const qs = new URLSearchParams()
  for (const [key, val] of Object.entries(sp)) {
    if (typeof val === 'string') qs.set(key, val)
  }
  const queryStr = qs.toString() ? `?${qs.toString()}` : ''
  redirect(`/dashboard/analytics${queryStr}`)
}
