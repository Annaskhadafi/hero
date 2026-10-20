import { redirect } from 'next/navigation'
import { db } from '@/db'
import { sites } from '@/db/schema/hero'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getCurrentMenuPermission, isSuperAdminRole } from '@/lib/hero-access'
import {
  getCompensationList,
  getCompensationMetrics,
  getActiveEmployeesForSelect,
  getDistinctLevelNames,
  getDistinctCompensationTypes,
} from '@/app/actions/compensation'
import { CompensationClient } from './compensation-client'
import { eq, asc } from 'drizzle-orm'

export const metadata = {
  title: 'Compensation & Benefit | HERO',
  description: 'Manajemen data kompensasi dan benefit karyawan — Leadership, Housing, dan Position Site Allowance',
}

export default async function CompensationPage() {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) redirect('/sign-in')

  const permission = await getCurrentMenuPermission('hc_compensation_benefit')
  const isSuper = isSuperAdminRole(currentEmployee.accessRole)

  const [data, metrics, employeeList, siteList, levelNames, availableTypes] = await Promise.all([
    getCompensationList(),
    getCompensationMetrics(),
    getActiveEmployeesForSelect(),
    db
      .select({ id: sites.id, name: sites.name })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(asc(sites.name)),
    getDistinctLevelNames(),
    getDistinctCompensationTypes(),
  ])

  const canManage = permission.canEdit || permission.canDelete || isSuper

  return (
    <div className="flex-1 p-4 md:p-6 w-full space-y-6">
      <CompensationClient
        initialData={data}
        metrics={metrics}
        employees={employeeList}
        sites={siteList}
        levelNames={levelNames}
        availableTypes={availableTypes}
        canManage={canManage}
      />
    </div>
  )
}
