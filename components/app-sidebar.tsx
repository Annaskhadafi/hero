"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import {
  IconBell,
  IconBook,
  IconChartBar,
  IconChecklist,
  IconClockHour4,
  IconDashboard,
  IconDatabase,
  IconFileWord,
  IconFileText,
  IconFiles,
  IconFolder,
  IconHelp,
  IconListDetails,
  IconMap2,
  IconMail,
  IconReport,
  IconSettings,
  IconShieldHalfFilled,
  IconSparkles,
  IconUsers,
  IconUser,
  IconActivity,
  IconAlertTriangle,
  IconTarget,
  IconTrendingUp,
  IconTool,
  IconTools,
  IconAddressBook,
  IconId,
  IconGitBranch,
  IconShieldExclamation,
  IconSignature,
  IconFileCheck,
  IconSearch,
  IconTruck,
  IconBuilding,
  IconBriefcase,
  IconCalendar,
  IconLock,
  IconLink,
  IconGlobe,
  IconCpu,
  IconAward,
  IconArchive,
  IconCamera,
  IconCash,
  IconCreditCard,
  IconFlame,
  IconHeart,
  IconKey,
  IconNews,
  IconPhone,
  IconPrinter,
  IconStar,
  IconTag,
  IconShoppingCart,
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
  useSidebar,
} from "@/components/ui/sidebar"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  bell: IconBell,
  book: IconBook,
  "book-open": IconBook,
  "chart-bar": IconChartBar,
  checklist: IconChecklist,
  clock: IconClockHour4,
  dashboard: IconDashboard,
  database: IconDatabase,
  "file-word": IconFileWord,
  "file-text": IconFileText,
  files: IconFileText,
  folder: IconFolder,
  help: IconHelp,
  "list-details": IconListDetails,
  "map-2": IconMap2,
  mail: IconMail,
  report: IconReport,
  settings: IconSettings,
  shield: IconShieldHalfFilled,
  "shield-alert": IconShieldExclamation,
  sparkles: IconSparkles,
  users: IconUsers,
  user: IconUser,
  activity: IconActivity,
  "alert-triangle": IconAlertTriangle,
  target: IconTarget,
  "trending-up": IconTrendingUp,
  wrench: IconTool,
  tool: IconTool,
  tools: IconTools,
  "address-card": IconAddressBook,
  id: IconId,
  "git-branch": IconGitBranch,
  "file-signature": IconSignature,
  "file-check": IconFileCheck,
  search: IconSearch,
  truck: IconTruck,
  building: IconBuilding,
  briefcase: IconBriefcase,
  calendar: IconCalendar,
  lock: IconLock,
  link: IconLink,
  globe: IconGlobe,
  cpu: IconCpu,
  award: IconAward,
  archive: IconArchive,
  camera: IconCamera,
  cash: IconCash,
  "credit-card": IconCreditCard,
  flame: IconFlame,
  heart: IconHeart,
  key: IconKey,
  news: IconNews,
  phone: IconPhone,
  printer: IconPrinter,
  star: IconStar,
  tag: IconTag,
  "shopping-cart": IconShoppingCart,
}

type SidebarMenuItem = {
  id?: number
  section?: string
  title: string
  url: string
  iconName: keyof typeof iconMap | string
  sortOrder?: number
  groupLabel?: string | null
  openInNewTab?: boolean
  parentId?: number | null
  isIframe?: boolean
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
  "ChitraLearning LMS",
  "Attendance",
  "HSE",
  "Central Service",
  "GOBPI",
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
  "ChitraLearning LMS": IconBook,
  Attendance: IconClockHour4,
  HSE: IconShieldHalfFilled,
  "Central Service": IconDatabase,
  GOBPI: IconFiles,
  Laporan: IconReport,
  "Command Center": IconBell,
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
  const { state, setOpen } = useSidebar()
  const wasHoverExpanded = React.useRef(false)

  const handleMouseEnter = React.useCallback(() => {
    if (state === "collapsed") {
      wasHoverExpanded.current = true
      setOpen(true)
    }
  }, [state, setOpen])

  const handleMouseLeave = React.useCallback(() => {
    if (wasHoverExpanded.current) {
      wasHoverExpanded.current = false
      setOpen(false)
    }
  }, [setOpen])

  const desktopItems = [...navMain, ...navSecondary].map((item) => ({
    id: item.id,
    section: sectionLabelMap[item.section ?? "Menu"] ?? item.section ?? "Menu",
    title: item.title,
    url: item.url,
    sortOrder: item.sortOrder ?? 999,
    icon: iconMap[item.iconName as keyof typeof iconMap] ?? IconChecklist,
    groupLabel: item.groupLabel ?? null,
    openInNewTab: item.openInNewTab ?? false,
    parentId: item.parentId ?? null,
    isIframe: item.isIframe ?? false,
  }))

  const documentItems = documents.map((item) => ({
    section: item.section ?? "Dokumen",
    name: item.title,
    url: item.url,
    icon: iconMap[item.iconName as keyof typeof iconMap] ?? IconFolder,
  }))

  const [customSectionOrder, setCustomSectionOrder] = React.useState<string[] | null>(null)

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("hero_sidebar_section_order")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomSectionOrder(parsed)
        }
      }
    } catch {}

    const handleOrderChange = () => {
      try {
        const saved = localStorage.getItem("hero_sidebar_section_order")
        if (saved) {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCustomSectionOrder(parsed)
          }
        }
      } catch {}
    }

    window.addEventListener("hero_sidebar_order_changed", handleOrderChange)
    return () => window.removeEventListener("hero_sidebar_order_changed", handleOrderChange)
  }, [])

  const baseOrder = customSectionOrder && customSectionOrder.length > 0 ? customSectionOrder : DESKTOP_MENU_ORDER

  const extraSections = Array.from(
    new Set(
      desktopItems
        .map((item) => item.section)
        .filter((section) => !baseOrder.includes(section as any))
    )
  )

  const orderedSections = [...baseOrder, ...extraSections]

  const desktopGroups = orderedSections
    .map((section) => {
      const sectionItems = desktopItems.filter((item) => item.section === section)
      
      const itemMap = new Map<number, any>()
      const rootItems: any[] = []
      
      sectionItems.forEach((item) => {
        if (item.id !== undefined) {
          itemMap.set(item.id, { ...item, children: [] })
        }
      })
      
      sectionItems.forEach((item) => {
        if (item.id !== undefined) {
          const mappedItem = itemMap.get(item.id)
          if (item.parentId && itemMap.has(item.parentId)) {
            itemMap.get(item.parentId).children.push(mappedItem)
          } else {
            rootItems.push(mappedItem)
          }
        }
      })

      return {
        title: section,
        icon: desktopMenuIconMap[section as keyof typeof desktopMenuIconMap] ?? IconHelp,
        items: rootItems.sort((left, right) => left.sortOrder - right.sortOrder),
      }
    })
    .filter((group) => group.items.length > 0)

  return (
    <Sidebar
      {...props}
      collapsible="icon"
      suppressHydrationWarning
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
            <NavDocuments items={documentItems as any} />
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
