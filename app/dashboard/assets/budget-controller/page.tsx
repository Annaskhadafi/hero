import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import {
  getCurrentEmployeeAccessRole,
  getCurrentMenuPermission,
  isSuperAdminRole,
} from '@/lib/hero-access'
import { getBudgetControllerData } from './actions'
import { BudgetControllerView } from './components/budget-controller-view'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Budget Controller | HERO',
  description: 'Database Pagu Anggaran Capital Expenditure (CapEx) & Kontrol Penyerapan Biaya Pengadaan Aset',
}

export default async function BudgetControllerPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/dashboard/assets/budget-controller')
  }

  // Guard access: Only Super Admin and Finance
  const roleName = await getCurrentEmployeeAccessRole()
  const permission = await getCurrentMenuPermission('cer_budget_controller')
  const isSuperAdmin = isSuperAdminRole(roleName)
  const isFinance = Boolean(roleName && roleName.toLowerCase().includes('finance'))
  const canAccess = isSuperAdmin || isFinance || permission.canView

  if (!canAccess) {
    redirect('/dashboard')
  }

  const data = await getBudgetControllerData()

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <BudgetControllerView data={data} />
      </div>
    </div>
  )
}
