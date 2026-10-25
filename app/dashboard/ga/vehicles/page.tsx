import { db } from '@/db'
import { masterDepartments, sites } from '@/db/schema/hero'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getCurrentMenuPermission, isSuperAdminRole } from '@/lib/hero-access'
import { getAllVehicles, getVehicleMetrics } from '@/app/actions/vehicles'
import { VehiclesDashboardClient } from './vehicles-dashboard-client'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'

export const metadata = {
  title: 'GA • Armada Kendaraan Operasional & Reminder Surat | HERO',
  description: 'Manajemen armada kendaraan (Owned & Rented), masa berlaku STNK, Pajak, KIR, dan Jadwal Servis',
}

export default async function VehiclesDashboardPage() {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) {
    redirect('/sign-in')
  }

  const permission = await getCurrentMenuPermission('ga-vehicles')
  const isSuper = isSuperAdminRole(currentEmployee.accessRole)

  // Fetch initial vehicles, metrics, sites, and departments
  const [vehicles, metrics, siteList, departmentList] = await Promise.all([
    getAllVehicles(),
    getVehicleMetrics(),
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

  const canCreate = permission.canEdit || isSuper
  const canEdit = permission.canEdit || isSuper
  const canDelete = permission.canDelete || isSuper

  return (
    <div className="flex-1 p-4 md:p-6 w-full">
      <VehiclesDashboardClient
        initialVehicles={vehicles}
        initialMetrics={metrics}
        sites={siteList}
        departments={departmentList}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        currentEmployeeName={currentEmployee.name}
      />
    </div>
  )
}
