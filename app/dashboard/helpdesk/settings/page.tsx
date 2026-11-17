import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getServiceDeskSettingsData } from '@/app/actions/service-desk-settings'
import { ServiceDeskSettingsClient } from './client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pengaturan Routing PIC & Template Service Desk | HERO Central',
  description:
    'Pengaturan matriks penugasan teknisi otomatis (Masalah Apa ke Siapa), konfigurasi SLA, dan master template kendala.',
}

export default async function ServiceDeskSettingsPage() {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) {
    redirect('/sign-in')
  }

  const data = await getServiceDeskSettingsData()

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-slate-50/70 p-4 sm:p-6">
      <ServiceDeskSettingsClient
        initialCategories={data.categories}
        initialTemplates={data.templates}
        employees={data.employees}
        departments={data.departments}
        currentEmployee={{
          id: currentEmployee.id,
          name: currentEmployee.name,
          email: currentEmployee.email,
          role: currentEmployee.role,
        }}
        isAdmin={data.isAdmin}
      />
    </div>
  )
}
