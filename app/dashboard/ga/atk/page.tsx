import { db } from '@/db'
import { masterDepartments, sites } from '@/db/schema/hero'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getCurrentMenuPermission, isSuperAdminRole } from '@/lib/hero-access'
import { getAtkRequests, getAtkDashboardMetrics } from '@/app/actions/atk'
import { AtkDashboardClient } from './atk-dashboard-client'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'

export const metadata = {
  title: 'GA &bull; Pengajuan & Dashboard ATK | HERO',
  description: 'Manajemen permintaan dan pemenuhan alat tulis kantor (ATK)',
}

export default async function AtkDashboardPage() {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) {
    redirect('/sign-in')
  }

  const permission = await getCurrentMenuPermission('ga-atk')
  const isSuper = isSuperAdminRole(currentEmployee.accessRole)

  // Fetch initial requests and metrics
  const [requests, metrics, siteList, departmentList] = await Promise.all([
    getAtkRequests(),
    getAtkDashboardMetrics(),
    db
      .select({ id: sites.id, name: sites.name })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(sites.name),
    db
      .select({ id: masterDepartments.id, name: masterDepartments.name })
      .from(masterDepartments)
      .orderBy(masterDepartments.name),
  ])

  const canManage = permission.canEdit || permission.canDelete || isSuper

  return (
    <div className="flex-1 p-4 md:p-6 w-full">
      <AtkDashboardClient
        initialRequests={requests}
        metrics={metrics}
        sites={siteList}
        departments={departmentList}
        canManage={canManage}
        currentEmployeeId={currentEmployee.id}
      />
    </div>
  )
}
