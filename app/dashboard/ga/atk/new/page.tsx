import { db } from '@/db'
import { masterDepartments, sites } from '@/db/schema/hero'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getMasterAtkList } from '@/app/actions/atk'
import { AtkNewForm } from './atk-new-form'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'

export const metadata = {
  title: 'Buat Pengajuan ATK Baru &bull; General Affairs | HERO',
  description: 'Formulir permohonan alat tulis kantor',
}

export default async function AtkNewPage() {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) {
    redirect('/sign-in')
  }

  const [masterItems, siteList, departmentList] = await Promise.all([
    getMasterAtkList({ activeOnly: true }),
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

  return (
    <div className="flex-1 p-4 md:p-6 max-w-5xl mx-auto w-full">
      <AtkNewForm
        masterItems={masterItems}
        sites={siteList}
        departments={departmentList}
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
