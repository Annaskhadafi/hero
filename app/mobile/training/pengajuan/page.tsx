import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { getTrainingRequests } from '@/app/actions/training-requests'
import { MobileTrainingRequestsClient } from './mobile-client'

export const dynamic = 'force-dynamic'

export default async function MobileTrainingRequestsPage() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    redirect('/sign-in')
  }

  const userEmail = session.user.email
  const userName = session.user.name || ''

  let currentEmployeeId: number | null = null
  let currentEmployeeName: string = userName

  if (userEmail) {
    const [emp] = await db
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(eq(employees.email, userEmail))
      .limit(1)

    if (emp) {
      currentEmployeeId = emp.id
      currentEmployeeName = emp.name
    }
  }

  const requests = await getTrainingRequests()

  return (
    <MobileTrainingRequestsClient
      initialRequests={requests}
      currentEmail={userEmail}
      currentEmployeeId={currentEmployeeId}
      currentEmployeeName={currentEmployeeName}
    />
  )
}
