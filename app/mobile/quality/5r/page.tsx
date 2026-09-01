import { redirect } from 'next/navigation'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { getFiveRReportsAction } from '@/app/dashboard/quality/5r/actions'
import { MobileFiveRClient } from '@/components/mobile/mobile-five-r-client'
import { getServerSession } from '@/lib/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobileFiveRPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const res = await getFiveRReportsAction({ pageSize: 50 })

  let currentEmpId = 0
  if (session?.user?.email) {
    const [emp] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.email, session.user.email))
      .limit(1)
    if (emp) {
      currentEmpId = emp.id
    }
  }

  const currentUser = {
    id: currentEmpId,
    name: session?.user?.name ?? 'User',
    email: session?.user?.email ?? '',
  }

  return (
    <MobileFiveRClient
      initialReports={(res.data as any) || []}
      currentUser={currentUser}
    />
  )
}
