import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getCurrentMenuPermission, isSuperAdminRole } from '@/lib/hero-access'
import { getMasterAtkList } from '@/app/actions/atk'
import { AtkMasterClient } from './atk-master-client'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Katalog Master ATK &bull; General Affairs | HERO',
  description: 'Kelola standarisasi katalog barang alat tulis kantor',
}

export default async function AtkMasterPage() {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) {
    redirect('/sign-in')
  }

  const permission = await getCurrentMenuPermission('ga-atk')
  const isSuper = isSuperAdminRole(currentEmployee.accessRole)

  if (!permission.canEdit && !permission.canDelete && !isSuper) {
    redirect('/dashboard/ga/atk')
  }

  const items = await getMasterAtkList()

  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
      <AtkMasterClient initialItems={items} />
    </div>
  )
}
