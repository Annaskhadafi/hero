import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import nextDynamic from 'next/dynamic'

import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getTroubleshootDashboardData } from '@/app/actions/service-desk'
import { ExcellenceTroubleshootWorkspace } from '@/components/service-desk/excellence-troubleshoot-workspace'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IconLifebuoy, IconTool } from '@tabler/icons-react'

// Dynamic import for secondary Maestro customer client to optimize compile memory
const HeroHelpdeskClient = nextDynamic(
  () => import('./client').then((m) => m.HeroHelpdeskClient)
)

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Troubleshooting & Ticketing System | HERO Central',
  description:
    'Pusat pemantauan real-time kendala operasional, telematika sensor, bug sistem HERO, dan tiket antar-departemen komprehensif.',
}

interface PageProps {
  searchParams?: Promise<{
    ticketId?: string
    tab?: string
  }>
}

export default async function HeroHelpdeskPage({ searchParams }: PageProps) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) {
    redirect('/sign-in')
  }

  const resolvedParams = searchParams ? await searchParams : {}
  const selectedTicketId = resolvedParams.ticketId ? parseInt(resolvedParams.ticketId, 10) : undefined
  const activeTab = resolvedParams.tab || 'troubleshoot'

  // Only load heavy maestro actions if user is actively on maestro tab
  const [troubleshootData, maestroData] = await Promise.all([
    getTroubleshootDashboardData(),
    activeTab === 'maestro'
      ? Promise.all([
          import('@/app/actions/helpdesk').then((m) => m.getHeroTicketsAction()),
          import('@/app/actions/helpdesk').then((m) => m.getHelpdeskSettingsAction()),
        ])
      : Promise.resolve([null, null]),
  ])

  const ticketsResult = maestroData[0]
  const settingsResult = maestroData[1]

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-slate-50/70">
      <Tabs defaultValue={activeTab} className="w-full">
        <div className="bg-white border-b border-slate-200 px-4 sm:px-6 pt-2 pb-0 flex items-center justify-between">
          <TabsList className="h-10 bg-slate-100 p-1">
            <TabsTrigger
              value="troubleshoot"
              className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs"
            >
              <IconTool className="size-3.5" />
              Troubleshoot &amp; Service Desk
            </TabsTrigger>
            <TabsTrigger
              value="maestro"
              className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-xs"
            >
              <IconLifebuoy className="size-3.5" />
              Tiket Customer Maestro
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="troubleshoot" className="m-0 focus-visible:outline-hidden">
          <ExcellenceTroubleshootWorkspace
            initialTickets={troubleshootData.tickets}
            initialKanban={troubleshootData.kanban}
            categoryStats={troubleshootData.categoryStats}
            siteSummary={troubleshootData.siteSummary}
            sites={troubleshootData.sites}
            categories={troubleshootData.categories}
            employees={troubleshootData.employees}
            currentEmployee={{
              id: currentEmployee.id,
              name: currentEmployee.name,
              email: currentEmployee.email,
            }}
            initialSelectedTicketId={selectedTicketId}
          />
        </TabsContent>

        <TabsContent value="maestro" className="m-0 p-4 sm:p-6 focus-visible:outline-hidden">
          {activeTab === 'maestro' && ticketsResult && settingsResult && (
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
