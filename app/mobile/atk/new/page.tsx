import React from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getMasterAtkList } from '@/app/actions/atk'
import { MobileAtkNewForm } from './mobile-atk-new-form'

export const metadata = {
  title: 'Buat Pengajuan ATK Mobile | HERO',
  description: 'Formulir permohonan alat tulis kantor',
}

export default async function MobileAtkNewPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) redirect('/mobile')

  const masterItems = await getMasterAtkList({ activeOnly: true })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <MobileAtkNewForm
        masterItems={masterItems}
        currentEmployee={{
          id: currentEmployee.id,
          name: currentEmployee.name,
          employeeSn: currentEmployee.employeeSn,
          siteId: currentEmployee.siteId,
          departmentId: currentEmployee.departmentId,
        }}
      />
    </div>
  )
}
