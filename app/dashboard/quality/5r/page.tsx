import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { getFiveRReportsAction } from '@/app/dashboard/quality/5r/actions'
import { FiveRList } from '@/components/five-r/five-r-list'
import { getServerSession } from '@/lib/auth-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function FiveRReportsPage() {
  const session = await getServerSession()
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
    <div className="p-6">
      <FiveRList initialReports={res.data as any} currentUser={currentUser} />
    </div>
  )
}
