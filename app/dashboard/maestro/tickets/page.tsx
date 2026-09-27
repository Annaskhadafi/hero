import { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getCurrentEmployee } from '@/lib/get-current-employee'
import {
  getHelpdeskCategoriesAction,
  getHelpdeskSettingsAction,
  getHeroTicketsAction,
} from '@/app/actions/helpdesk'
import { HeroHelpdeskClient } from '@/app/dashboard/helpdesk/client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'MAESTRO Customer Ticketing | HERO Central',
  description:
    'Pusat pemantauan, klaim antrean tiket keluhan customer Maestro, asistensi AI, dan respon interaktif spesialis HERO.',
}

interface PageProps {
  searchParams?: Promise<{
    ticketId?: string
    tab?: string
  }>
}

export default async function DashboardMaestroTicketsPage({ searchParams }: PageProps) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) {
    redirect('/sign-in')
  }

  const resolvedParams = searchParams ? await searchParams : {}
  const selectedTicketId = resolvedParams.ticketId ? parseInt(resolvedParams.ticketId, 10) : undefined

  const [ticketsResult, settingsResult] = await Promise.all([
    getHeroTicketsAction(),
    getHelpdeskSettingsAction(),
  ])

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-slate-50/60 p-4 sm:p-6">
      <HeroHelpdeskClient
        initialTickets={ticketsResult.data || []}
        currentEmployee={{
          id: currentEmployee.id,
          name: currentEmployee.name,
          email: currentEmployee.email,
        }}
        categories={settingsResult.categories || []}
        sites={settingsResult.sites || []}
        employees={settingsResult.activeEmployees || []}
        initialSelectedTicketId={selectedTicketId}
      />
    </div>
  )
}
