import { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getHelpdeskSettingsAction } from '@/app/actions/helpdesk'
import { HelpdeskSettingsClient } from './client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pengaturan Helpdesk & AI Routing | HERO Central',
  description:
    'Konfigurasi kategori keluhan, matriks penugasan staf PIC per site, dan preferensi AI First Responder.',
}

export default async function HelpdeskSettingsPage() {
  const currentEmp = await getCurrentEmployee()
  if (!currentEmp) {
    redirect('/sign-in')
  }

  const result = await getHelpdeskSettingsAction()
  if (!result.success) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
        <HelpdeskSettingsClient
          settings={result.settings}
          categories={result.categories || []}
          routingRules={result.routingRules || []}
          employees={result.activeEmployees || []}
          sites={result.sites || []}
        />
      </div>
    </div>
  )
}
