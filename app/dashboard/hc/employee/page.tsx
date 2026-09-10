import { getEmployeesForContract, getEmployeeFilterOptions } from '@/app/actions/employee'
import { EmployeeClientPage } from './client-page'
import type { TableRbacAccess } from '@/components/ui/enterprise-table-kit'
import {
  getCurrentMenuPermission,
  getCurrentEmployeeAccessContext,
  getUserAccessibleSiteIds,
  hasGlobalDataAccess,
} from '@/lib/hero-access'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Data Karyawan - HC',
}

export default async function EmployeePage() {
  const fullAccess = await getCurrentMenuPermission('hc_employee')

  if (!fullAccess.canView) {
    redirect('/dashboard')
  }

  const [allEmployees, filterOptions, accessContext] = await Promise.all([
    getEmployeesForContract(),
    getEmployeeFilterOptions(),
    getCurrentEmployeeAccessContext(),
  ])

  // Terapkan filter default department: Central Services
  let scopedEmployees = allEmployees.filter((e) => e.departmentName === 'Central Services')

  // Integrasi Role Management / Data Scope:
  // Jika bukan global (misal 'site' atau 'own')
  let allowedLocations = filterOptions.locations
  if (!hasGlobalDataAccess(fullAccess)) {
    if (fullAccess.dataScope === 'site') {
      const userSiteIds = accessContext?.employeeId
        ? await getUserAccessibleSiteIds(accessContext.employeeId)
        : accessContext?.siteId
        ? [accessContext.siteId]
        : []

      if (userSiteIds.length > 0) {
        scopedEmployees = scopedEmployees.filter(
          (e) => e.workLocationId && userSiteIds.includes(e.workLocationId)
        )
        allowedLocations = filterOptions.locations.filter((l) => userSiteIds.includes(l.id))
      }
    } else if (fullAccess.dataScope === 'own') {
      if (accessContext?.employeeId) {
        scopedEmployees = scopedEmployees.filter((e) => e.id === accessContext.employeeId)
      }
    }
  }

  const csDeptId = filterOptions.departments.find((d) => d.name === 'Central Services')?.id

  const filteredOptions = {
    departments: csDeptId
      ? filterOptions.departments.filter((d) => d.id === csDeptId)
      : filterOptions.departments,
    sections: csDeptId
      ? filterOptions.sections.filter((s) => s.departmentId === csDeptId)
      : filterOptions.sections,
    locations: allowedLocations,
    positions: filterOptions.positions,
    leaders: filterOptions.leaders || [],
  }

  const access: TableRbacAccess = {
    canView: fullAccess.canView,
    canEdit: fullAccess.canEdit,
    canDelete: fullAccess.canDelete,
    canSelectAll: fullAccess.canSelectAll,
  }

  return (
    <EmployeeClientPage employees={scopedEmployees} filterOptions={filteredOptions} access={access} />
  )
}
