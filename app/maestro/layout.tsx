import { ReactNode } from 'react'
import { cookies } from 'next/headers'

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { MaestroSidebar } from '@/components/maestro-sidebar'
import { MaestroSiteHeader } from '@/components/maestro-site-header'
import { MaestroMobileBottomNav } from '@/components/maestro-mobile-bottom-nav'
import { getMaestroServerSession } from '@/lib/maestro-session'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: {
    template: '%s | MAESTRO™',
    default: 'MAESTRO™ | PT Chitra Paratama',
  },
}

export default async function MaestroRootLayout({ children }: { children: ReactNode }) {
  const session = await getMaestroServerSession()

  // If unauthenticated (e.g. login page), render clean page shell
  if (!session) {
    return (
      <div className="relative min-h-screen bg-slate-100/90 text-slate-950 antialiased font-sans selection:bg-blue-600 selection:text-white">
        {/* Subtle Top Ambient Gradient */}
        <div className="pointer-events-none fixed inset-x-0 top-0 h-48 bg-gradient-to-b from-blue-100/30 via-slate-100/10 to-transparent z-0" />
        <div className="relative z-10">{children}</div>
      </div>
    )
  }

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true'

  return (
    <div className="relative min-h-screen bg-slate-100/90 text-slate-950 antialiased font-sans selection:bg-blue-600 selection:text-white">
      {/* Subtle Top Ambient Accent */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-48 bg-gradient-to-b from-blue-100/30 via-slate-100/10 to-transparent z-0" />

      <SidebarProvider
        defaultOpen={defaultOpen}
        style={
          {
            '--sidebar-width': '16rem',
          } as React.CSSProperties
        }
      >
        <MaestroSidebar session={session} />
        <SidebarInset className="bg-slate-100/90 flex flex-col min-h-screen relative z-10 pb-20 md:pb-0">
          <MaestroSiteHeader session={session} />
          <div className="flex flex-1 flex-col">{children}</div>
        </SidebarInset>
        <MaestroMobileBottomNav session={session} />
      </SidebarProvider>
    </div>
  )
}
