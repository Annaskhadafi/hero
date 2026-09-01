import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { getMasterAreasAction } from '@/app/dashboard/quality/5r/actions'
import { FiveRForm } from '@/components/five-r/five-r-form'
import { getServerSession } from '@/lib/auth-session'

export const dynamic = 'force-dynamic'

export default async function CreateFiveRReportPage() {
  const session = await getServerSession()
  const masterAreasRes = await getMasterAreasAction()

  let currentEmp: { id: number; siteId: number | null } | null = null
  if (session?.user?.email) {
    const [emp] = await db
      .select({ id: employees.id, siteId: employees.siteId })
      .from(employees)
      .where(eq(employees.email, session.user.email))
      .limit(1)
    if (emp) {
      currentEmp = emp
    }
  }

  const currentUser = {
    id: currentEmp?.id ?? 0,
    name: session?.user?.name ?? '',
    email: session?.user?.email ?? '',
    siteId: currentEmp?.siteId ?? (session?.user as any)?.siteId ?? null,
  }

  return (
    <div className="p-6">
      <FiveRForm masterAreas={masterAreasRes.data as any} currentUser={currentUser} />
    </div>
  )
}
