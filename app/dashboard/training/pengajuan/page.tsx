import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { getTrainingRequests } from '@/app/actions/training-requests'
import { TrainingRequestsClientPage } from './client-page'

export const dynamic = 'force-dynamic'

export default async function TrainingRequestsPage() {
  const session = await getServerSession()
  const userEmail = session?.user?.email || ''
  const userName = session?.user?.name || ''

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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 w-full">
      <TrainingRequestsClientPage
        initialRequests={requests}
        currentEmail={userEmail}
        currentEmployeeId={currentEmployeeId}
        currentEmployeeName={currentEmployeeName}
      />
    </div>
  )
}
