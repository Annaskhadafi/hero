import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { getMasterAreasAction } from '@/app/dashboard/quality/5r/actions'
import { FiveRForm } from '@/components/five-r/five-r-form'
import { getServerSession } from '@/lib/auth-session'

export const dynamic = 'force-dynamic'

export default async function MobileCreateFiveRPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

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
    <div className="space-y-4 pb-8">
      {/* Mobile Top Navigation */}
      <div className="flex items-center gap-2 px-1 pt-1">
        <Link
          href="/mobile/quality/5r"
          className="flex size-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 active:scale-95 transition-transform"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Formulir Inspeksi</p>
          <h1 className="text-sm font-bold text-slate-900 leading-tight">
            Input Laporan Audit 5R
          </h1>
        </div>
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-3 shadow-xs">
        <FiveRForm
          masterAreas={(masterAreasRes.data as any) || []}
          currentUser={currentUser}
        />
      </div>
    </div>
  )
}
