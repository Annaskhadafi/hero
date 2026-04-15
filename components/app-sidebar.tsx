"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  IconChartBar,
  IconChecklist,
  IconDashboard,
  IconDatabase,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconListDetails,
  IconMail,
  IconReport,
  IconSettings,
  IconShieldHalfFilled,
  IconUsers,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const iconMap = {
  "chart-bar": IconChartBar,
  checklist: IconChecklist,
  dashboard: IconDashboard,
  database: IconDatabase,
  "file-word": IconFileWord,
  folder: IconFolder,
  help: IconHelp,
  "list-details": IconListDetails,
  mail: IconMail,
  report: IconReport,
  settings: IconSettings,
  shield: IconShieldHalfFilled,
  users: IconUsers,
} as const

type SidebarMenuItem = {
  section?: string
  title: string
  url: string
  iconName: keyof typeof iconMap | string
}

type SidebarDocumentItem = {
  section?: string
  title: string
  url: string
  iconName: keyof typeof iconMap | string
}

type SidebarUser = {
  name: string
  email: string
  avatar: string
}

export function AppSidebar({
  user,
  navMain,
  navSecondary,
  documents,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: SidebarUser
  navMain: readonly SidebarMenuItem[]
  navSecondary: readonly SidebarMenuItem[]
  documents: readonly SidebarDocumentItem[]
}) {
  const mainItems = navMain.map((item) => ({
    section: item.section ?? "Workspace",
    title: item.title,
    url: item.url,
    icon: iconMap[item.iconName as keyof typeof iconMap] ?? IconChecklist,
  }))
  const secondaryItems = navSecondary.map((item) => ({
    section: item.section ?? "System",
    title: item.title,
    url: item.url,
    icon: iconMap[item.iconName as keyof typeof iconMap] ?? IconHelp,
  }))
  const documentItems = documents.map((item) => ({
    section: item.section ?? "Documents",
    name: item.title,
    url: item.url,
    icon: iconMap[item.iconName as keyof typeof iconMap] ?? IconFolder,
  }))
  const groupedMainItems = Object.entries(
    mainItems.reduce<Record<string, typeof mainItems>>((accumulator, item) => {
      accumulator[item.section] = accumulator[item.section] ?? []
      accumulator[item.section].push(item)
      return accumulator
    }, {})
  )

  return (
    <Sidebar
      {...props}
      collapsible="icon"
      suppressHydrationWarning
      style={{
        ...props.style,
        fontFamily: "var(--font-parkinsans), var(--font-geist-sans), sans-serif",
      }}
    >
      <SidebarHeader className="pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-2"
            >
              <Link href="/">
                <div className="flex aspect-square size-9 items-center justify-center overflow-hidden rounded-xl border border-white/50 bg-white shadow-sm">
                  <Image
                    src="/codeguide-logo.png"
                    alt="HERO"
                    width={36}
                    height={36}
                    className="rounded-lg"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-base font-semibold font-parkinsans">
                    HERO
                  </span>
                  <span className="truncate text-xs text-slate-500">
                    Workforce Control Center
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-1">
        {groupedMainItems.map(([section, items], index) => (
          <React.Fragment key={section}>
            {index > 0 ? <SidebarSeparator className="mx-2" /> : null}
            <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 group-data-[collapsible=icon]:hidden">
              {section}
            </div>
            <NavMain items={items} showQuickCreate={index === 0} />
          </React.Fragment>
        ))}
        {documentItems.length > 0 ? (
          <>
            <SidebarSeparator className="mx-2 mt-1" />
            <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 group-data-[collapsible=icon]:hidden">
              Documents
            </div>
            <NavDocuments items={documentItems} />
          </>
        ) : null}
        {secondaryItems.length > 0 ? (
          <>
            <SidebarSeparator className="mx-2 mt-auto" />
            <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 group-data-[collapsible=icon]:hidden">
              System
            </div>
            <NavSecondary items={secondaryItems} />
          </>
        ) : null}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
