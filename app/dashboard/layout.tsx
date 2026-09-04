import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { getServerSession } from '@/lib/auth-session'
import { isMobileUserAgent } from '@/lib/device'
import {
  getEmployeeDisplayDataByEmail,
  getGroupLabelStyles,
  getNavbarSettingsData,
  getSidebarDataForUser,
} from '@/lib/hero-admin'
import { getRecipientUnreadNotificationCount } from '@/lib/notification-feed'
import { FaceRegistrationReminderPopup } from '@/components/face-registration-reminder-popup'
import { FloatingGeniusChatClient } from '@/components/hero-genius/floating-genius-chat-client'

import '@/app/dashboard/theme.css'

export const dynamic = 'force-dynamic'

// Main Dashboard Layout
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const headerStore = await headers()
  if (isMobileUserAgent(headerStore.get('user-agent'))) {
    redirect('/mobile')
  }

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true'
  const [sidebarData, navbarSettings, employeeDisplay, unreadNotifications, groupLabelColor] = await Promise.all([
    getSidebarDataForUser(session.user.email),
    getNavbarSettingsData(),
    getEmployeeDisplayDataByEmail(session.user.email),
    getRecipientUnreadNotificationCount(session.user.email).catch((error) => {
      console.error('[dashboard] failed to fetch unread notification count', error)
      return 0
    }),
    getGroupLabelStyles(),
  ])

  if (employeeDisplay && (employeeDisplay.isActive === false || employeeDisplay.employmentStatus === 'inactive')) {
    try {
      cookieStore.delete('better-auth.session_token')
      cookieStore.delete('better-auth.session_data')
    } catch {}
    redirect('/sign-in?error=account_deactivated')
  }

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          '--sidebar-width': '15.5rem',
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        user={{
          name: employeeDisplay?.name || session.user.name || 'User',
          email: employeeDisplay?.email || session.user.email,
          avatar: session.user.image || '/logo.png',
          unreadNotifications,
        }}
        navMain={sidebarData.navMain}
        navSecondary={sidebarData.navSecondary}
        documents={sidebarData.documents}
        groupLabelColor={groupLabelColor}
      />
      <SidebarInset data-admin-dashboard-shell>
        <SiteHeader
          eyebrow="Chitra Hub"
          title="Employee Reporting & Operational"
          subtitle=""
          backgroundColor={navbarSettings.theme?.headerBackgroundColor ?? '#FFFFFF'}
          textColor={navbarSettings.theme?.textColor ?? '#0F172A'}
          navMain={JSON.parse(JSON.stringify(sidebarData.navMain))}
          navSecondary={JSON.parse(JSON.stringify(sidebarData.navSecondary))}
        />
        <div className="flex flex-1 flex-col">{children}</div>
        <FloatingGeniusChatClient />
      </SidebarInset>
    </SidebarProvider>
  )
}
