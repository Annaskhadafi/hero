import { redirect } from 'next/navigation'
import {
  getActiveEmployeesForMentor,
  getKerjasamaMetrics,
  getKerjasamaRsList,
  getKerjasamaSekolahList,
  getPklStudentsList,
} from '@/app/actions/hrga-kerjasama'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getCurrentMenuPermission, isSuperAdminRole } from '@/lib/hero-access'
import { KerjasamaClient } from './kerjasama-client'

export const metadata = {
  title: 'Kerjasama HRGA | HERO',
  description: 'Manajemen kemitraan Rumah Sakit & Faskes, Sekolah Mitra, serta pembinaan Siswa/Mahasiswa PKL di PT Chitra Paratama',
}

export default async function KerjasamaPage() {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) redirect('/sign-in')

  const permission = await getCurrentMenuPermission('hc_kerjasama')
  const isSuper = isSuperAdminRole(currentEmployee.accessRole)

  const [rsRes, sekolahRes, pklRes, metricsRes, employeesRes] = await Promise.all([
    getKerjasamaRsList(),
    getKerjasamaSekolahList(),
    getPklStudentsList(),
    getKerjasamaMetrics(),
    getActiveEmployeesForMentor(),
  ])

  const canManage = permission.canEdit || permission.canDelete || isSuper

  return (
    <div className="flex-1 p-4 md:p-6 w-full space-y-6">
      <KerjasamaClient
        initialRsList={rsRes.data || []}
        initialSekolahList={sekolahRes.data || []}
        initialPklList={pklRes.data || []}
        initialMetrics={{
          rsMetrics: metricsRes.rsMetrics,
          sekolahMetrics: metricsRes.sekolahMetrics,
          pklMetrics: metricsRes.pklMetrics,
          rsLocations: metricsRes.rsLocations || [],
          sekolahLocations: metricsRes.sekolahLocations || [],
          sekolahTypes: metricsRes.sekolahTypes || [],
          pklInstitutions: metricsRes.pklInstitutions || [],
        }}
        employees={employeesRes.data || []}
        canManage={canManage}
      />
    </div>
  )
}
