"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  IconBook,
  IconChartBar,
  IconChecklist,
  IconClockHour4,
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
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const iconMap = {
  "book-open": IconBook,
  "chart-bar": IconChartBar,
  checklist: IconChecklist,
  clock: IconClockHour4,
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
  sortOrder?: number
  groupLabel?: string | null
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
  unreadNotifications?: number
}

const DESKTOP_MENU_ORDER = [
  "Portal Chitra",
  "Aktivitas Harian",
  "Roster & Timesheet",
  "Approval",
  "Data Induk",
  "Human Capital",
  "Attendance",
  "HSE",
  "Central Service",
  "Laporan",
  "Pengaturan",
] as const

const desktopMenuIconMap = {
  "Portal Chitra": IconDashboard,
  "Aktivitas Harian": IconChecklist,
  "Roster & Timesheet": IconClockHour4,
  Approval: IconMail,
  "Data Induk": IconDatabase,
  "Human Capital": IconUsers,
  Attendance: IconClockHour4,
  HSE: IconShieldHalfFilled,
  "Central Service": IconDatabase,
  Laporan: IconReport,
  Pengaturan: IconSettings,
} as const

const sectionLabelMap: Record<string, string> = {
  "Daily Activity": "Aktivitas Harian",
  "Central Service": "Central Service",
  Approval: "Approval",
  "Master Data": "Data Induk",
  HR: "Human Capital",
  HSE: "HSE",
  Report: "Laporan",
  Setting: "Pengaturan",
}
export function AppSidebar({
  user,
  navMain,
  navSecondary,
  documents,
  groupLabelColor = "#6B7280",
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: SidebarUser
  navMain: readonly SidebarMenuItem[]
  navSecondary: readonly SidebarMenuItem[]
  documents: readonly SidebarDocumentItem[]
  groupLabelColor?: string
}) {
  const desktopItems = [...navMain, ...navSecondary].map((item) => ({
    section: sectionLabelMap[item.section ?? "Menu"] ?? item.section ?? "Menu",
    title: item.title,
    url: item.url,
    sortOrder: item.sortOrder ?? 999,
    icon: iconMap[item.iconName as keyof typeof iconMap] ?? IconChecklist,
    groupLabel: item.groupLabel ?? null,
  }))
  const documentItems = documents.map((item) => ({
    section: item.section ?? "Dokumen",
    name: item.title,
    url: item.url,
    icon: iconMap[item.iconName as keyof typeof iconMap] ?? IconFolder,
  }))
  const extraSections = Array.from(
    new Set(
      desktopItems
        .map((item) => item.section)
        .filter((section) => !DESKTOP_MENU_ORDER.includes(section as (typeof DESKTOP_MENU_ORDER)[number]))
    )
  )
  const orderedSections = [...DESKTOP_MENU_ORDER, ...extraSections]
  const desktopGroups = orderedSections
    .map((section) => ({
      title: section,
      icon: desktopMenuIconMap[section as keyof typeof desktopMenuIconMap] ?? IconHelp,
      items: desktopItems
        .filter((item) => item.section === section)
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((item) => ({
          ...item,
          groupLabel: item.groupLabel,
        })),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <Sidebar
      {...props}
      collapsible="icon"
      suppressHydrationWarning
      style={{
        ...props.style,
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      <SidebarHeader className="px-3 pb-3 pt-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
        <div className="rounded-2xl border border-sidebar-border/80 bg-white px-3 py-3 shadow-sm group-data-[collapsible=icon]:px-2">
          <Link href="/" aria-label="HERO" className="flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <Image
              src="/logo-hero.png"
              alt="HERO"
              width={132}
              height={48}
              className="h-9 w-auto object-contain group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:w-8"
              priority
            />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">HERO</p>
              <p className="truncate text-xs text-muted-foreground">Operational workspace</p>
            </div>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-1 px-2">
        <NavMain groups={desktopGroups} showQuickCreate groupLabelColor={groupLabelColor} />
        {documentItems.length > 0 ? (
          <>
            <SidebarSeparator className="mx-2 mt-2" />
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] leading-[1.35] text-muted-foreground whitespace-normal break-words group-data-[collapsible=icon]:hidden">
              Dokumen
            </div>
            <NavDocuments items={documentItems} />
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


