import { redirect } from 'next/navigation'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getCurrentMenuPermission, isSuperAdminRole } from '@/lib/hero-access'
import { OlahragaClientPage } from './client-page'

export const metadata = {
  title: 'List Kegiatan Olahraga | HERO',
  description: 'Daftar kegiatan olahraga bersama, komunitas hobi, turnamen, dan jadwal olahraga karyawan PT Chitra Paratama',
}

export default async function OlahragaPage() {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) {
    redirect('/sign-in')
  }

  const roleName = currentEmployee.accessRole || ''
  const isSuper = isSuperAdminRole(roleName)
  const menuPerm = await getCurrentMenuPermission('hc_sports').catch(() => ({
    roleName,
    canView: true,
    canEdit: isSuper,
    canDelete: isSuper,
    canSelectAll: isSuper,
    dataScope: 'global' as const,
  }))

  const canManage = isSuper || menuPerm.canEdit || menuPerm.canSelectAll

  return (
    <OlahragaClientPage
      currentEmployee={{
        id: currentEmployee.id,
        name: currentEmployee.name,
        employeeSn: currentEmployee.employeeSn || '',
        jobTitle: currentEmployee.jobTitle || '',
      }}
      canManage={canManage}
    />
  )
}
