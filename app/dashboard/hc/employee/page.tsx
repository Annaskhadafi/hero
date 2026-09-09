import { getEmployeesForContract, getEmployeeFilterOptions } from '@/app/actions/employee'
import { EmployeeClientPage } from './client-page'
import type { TableRbacAccess } from '@/components/ui/enterprise-table-kit'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Data Karyawan - HC',
}

export default async function EmployeePage() {
  const [allEmployees, filterOptions] = await Promise.all([
    getEmployeesForContract(),
    getEmployeeFilterOptions(),
  ])

  const employees = allEmployees.filter((e) => e.departmentName === 'Central Services')
  const csDeptId = filterOptions.departments.find((d) => d.name === 'Central Services')?.id

  const filteredOptions = {
    departments: csDeptId
      ? filterOptions.departments.filter((d) => d.id === csDeptId)
      : filterOptions.departments,
    sections: csDeptId
      ? filterOptions.sections.filter((s) => s.departmentId === csDeptId)
      : filterOptions.sections,
    locations: filterOptions.locations,
    positions: filterOptions.positions,
    leaders: filterOptions.leaders || [],
  }

  const fullAccess = await getCurrentMenuPermission('hc_employee')

  if (!fullAccess.canView) {
    redirect('/403')
  }

  const access: TableRbacAccess = {
    canView: fullAccess.canView,
    canEdit: fullAccess.canEdit,
    canDelete: fullAccess.canDelete,
    canSelectAll: fullAccess.canSelectAll,
  }

  return (
    <EmployeeClientPage employees={employees} filterOptions={filteredOptions} access={access} />
  )
}
