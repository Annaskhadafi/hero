import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { getServerSession } from "@/lib/auth-session"
import { getNavbarSettingsData, getSidebarDataForUser } from "@/lib/hero-admin"

import "@/app/dashboard/theme.css"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession()

  if (!session?.user) {
    redirect("/sign-in")
  }

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"
  const [sidebarData, navbarSettings] = await Promise.all([
    getSidebarDataForUser(session.user.email),
    getNavbarSettingsData(),
  ])

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={
        {
          "--sidebar-width": "18rem",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        user={{
          name: session.user.name || "User",
          email: session.user.email,
          avatar: session.user.image || "/logo.png",
        }}
        navMain={sidebarData.navMain}
        navSecondary={sidebarData.navSecondary}
        documents={sidebarData.documents}
      />
      <SidebarInset>
        <SiteHeader
          title="HERO Admin Console"
          subtitle="Desktop-first operations, approvals, reporting, and workforce control"
          backgroundColor={navbarSettings.theme?.headerBackgroundColor ?? "#FFFFFF"}
          textColor={navbarSettings.theme?.textColor ?? "#0F172A"}
        />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
