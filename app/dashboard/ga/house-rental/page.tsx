import { redirect } from 'next/navigation'
import {
  getEmployeesForHouseRental,
  getHouseRentalMetrics,
  getHouseRentalsList,
  getSitesForHouseRental,
} from '@/app/actions/house-rental'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getCurrentMenuPermission, isSuperAdminRole } from '@/lib/hero-access'
import { HouseRentalClient } from './house-rental-client'

export const metadata = {
  title: 'House Rental | HERO GA',
  description: 'Manajemen sewa rumah, mess karyawan, kontrak akomodasi & fasilitas tempat tinggal operasional HERO',
}

export const dynamic = 'force-dynamic'

export default async function HouseRentalPage() {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) redirect('/sign-in')

  const permission = await getCurrentMenuPermission('ga_house_rental')
  const isSuper = isSuperAdminRole(currentEmployee.accessRole)

  const [rentalsRes, metricsRes, sitesRes, employeesRes] = await Promise.all([
    getHouseRentalsList().catch(() => ({ success: false, data: [] })),
    getHouseRentalMetrics().catch(() => ({
      success: false,
      data: {
        totalUnits: 0,
        activeUnits: 0,
        expiringSoonUnits: 0,
        terminatedUnits: 0,
        totalCostRent: 0,
      },
    })),
    getSitesForHouseRental().catch(() => []),
    getEmployeesForHouseRental().catch(() => []),
  ])

  const canManage = permission.canEdit || permission.canDelete || isSuper

  return (
    <div className="flex-1 p-4 md:p-6 w-full space-y-6">
      <HouseRentalClient
        initialRentals={rentalsRes?.data || []}
        initialMetrics={
          metricsRes?.data || {
            totalUnits: 0,
            activeUnits: 0,
            expiringSoonUnits: 0,
            terminatedUnits: 0,
            totalCostRent: 0,
          }
        }
        sitesList={sitesRes || []}
        employeesList={employeesRes || []}
        canManage={canManage}
        userRole={currentEmployee.accessRole || 'User'}
      />
    </div>
  )
}
