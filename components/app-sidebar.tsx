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
  IconDisc,
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

import { useSidebarLayoutMode, buildModernSidebarGroups } from "@/lib/sidebar-mode"
import { IconX } from "@tabler/icons-react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
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
  SidebarMenuButton,
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
  disc: IconDisc,
  tire: IconDisc,
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
  "Quality & CPI",
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
  "ChitraLearning LMS": IconBook,
  Attendance: IconClockHour4,
  HSE: IconShieldHalfFilled,
  "Quality & CPI": IconSparkles,
  "Central Service": IconDatabase,
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
  Quality: "Quality & CPI",
  "Quality & CPI": "Quality & CPI",
  GOBPI: "Quality & CPI",
  Report: "Laporan",
  Setting: "Pengaturan",
}

export function AppSidebar({
  user,
  navMain,
  navSecondary,
  documents,
  groupLabelColor = "#6B7280",
  initialMode,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: SidebarUser
  navMain: readonly SidebarMenuItem[]
  navSecondary: readonly SidebarMenuItem[]
  documents: readonly SidebarDocumentItem[]
  groupLabelColor?: string
  initialMode?: "classic" | "modern"
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { state, setOpen } = useSidebar()
  const [sidebarMode] = useSidebarLayoutMode(initialMode)
  const [searchQuery, setSearchQuery] = React.useState("")
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const itemRefs = React.useRef<(HTMLAnchorElement | null)[]>([])

  React.useEffect(() => {
    setSelectedIndex(0)
  }, [searchQuery])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(true)
        searchInputRef.current?.focus()
      } else if (e.key === "Escape" && searchQuery) {
        setSearchQuery("")
        searchInputRef.current?.blur()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [searchQuery])

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

  const desktopItems = [...navMain, ...navSecondary].map((item) => {
    const rawSection = sectionLabelMap[item.section ?? "Menu"] ?? item.section ?? "Menu"
    return {
      id: item.id,
      section: rawSection,
      title: item.title,
      url: item.url,
      sortOrder: item.sortOrder ?? 999,
      icon: iconMap[item.iconName as keyof typeof iconMap] ?? IconChecklist,
      groupLabel: item.groupLabel ?? null,
      openInNewTab: item.openInNewTab ?? false,
      parentId: item.parentId ?? null,
      isIframe: item.isIframe ?? false,
    }
  })

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

  const filteredItems = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return []
    const menuMatches = desktopItems
      .filter((it) => {
        const matchTitle = it.title.toLowerCase().includes(q)
        const matchSection = it.section.toLowerCase().includes(q)
        const matchGroup = it.groupLabel ? it.groupLabel.toLowerCase().includes(q) : false
        return matchTitle || matchSection || matchGroup
      })
      .map((it) => ({
        url: it.url,
        title: it.title,
        section: it.section,
        groupLabel: it.groupLabel,
        icon: it.icon,
        openInNewTab: it.openInNewTab,
      }))

    const docMatches = documentItems
      .filter((doc) => doc.name.toLowerCase().includes(q) || doc.section.toLowerCase().includes(q))
      .map((doc) => ({
        url: doc.url,
        title: doc.name,
        section: doc.section,
        groupLabel: null,
        icon: doc.icon,
        openInNewTab: true,
      }))

    const seen = new Set<string>()
    return [...menuMatches, ...docMatches].filter((it) => {
      const key = `${it.section}|${it.title}|${it.url}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [searchQuery, desktopItems, documentItems])

  const groupedFilteredItems = React.useMemo(() => {
    const groups: {
      section: string
      items: {
        url: string
        title: string
        section: string
        groupLabel?: string | null
        icon: any
        openInNewTab?: boolean
        globalIndex: number
      }[]
    }[] = []
    const groupMap = new Map<string, (typeof groups)[number]>()

    filteredItems.forEach((item, globalIndex) => {
      const sectionName = item.section || "Menu"
      let group = groupMap.get(sectionName)
      if (!group) {
        group = { section: sectionName, items: [] }
        groupMap.set(sectionName, group)
        groups.push(group)
      }
      group.items.push({ ...item, globalIndex })
    })

    return groups
  }, [filteredItems])

  React.useEffect(() => {
    if (filteredItems.length > 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex, filteredItems.length])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!filteredItems.length) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      const target = filteredItems[selectedIndex] ?? filteredItems[0]
      if (target) {
        setSearchQuery("")
        searchInputRef.current?.blur()
        if (target.openInNewTab) {
          window.open(target.url, "_blank", "noopener,noreferrer")
        } else {
          router.push(target.url)
        }
      }
    }
  }

  const desktopGroups = React.useMemo(() => {
    if (sidebarMode === "modern") {
      return buildModernSidebarGroups(desktopItems)
    }

    const baseOrder = customSectionOrder && customSectionOrder.length > 0 ? customSectionOrder : DESKTOP_MENU_ORDER

    const extraSections = Array.from(
      new Set(
        desktopItems
          .map((item) => item.section)
          .filter((section) => !baseOrder.includes(section as any))
      )
    )

    const orderedSections = [...baseOrder, ...extraSections]

    return orderedSections
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
          rawTitle: section,
          title: section,
          icon: desktopMenuIconMap[section as keyof typeof desktopMenuIconMap] ?? IconHelp,
          items: rootItems.sort((left, right) => left.sortOrder - right.sortOrder),
        }
      })
      .filter((group) => group.items.length > 0)
  }, [sidebarMode, desktopItems, customSectionOrder])

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
          <Link href="/dashboard/analytics" aria-label="HERO" className="flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center">
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
        <div className="relative mt-2.5 w-full group-data-[collapsible=icon]:hidden">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Cari menu... (Ctrl+K)"
            className="h-10 w-full rounded-xl border border-sidebar-border/80 bg-slate-100/90 dark:bg-slate-800/80 pl-9 pr-9 text-[13px] text-foreground placeholder:text-muted-foreground/70 shadow-2xs focus:bg-background focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-150"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
              aria-label="Hapus pencarian"
            >
              <IconX className="size-3.5" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden md:inline-flex h-5 select-none items-center gap-0.5 rounded border border-sidebar-border/80 bg-background/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              Ctrl K
            </kbd>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-1 px-2">
        {searchQuery.trim() ? (
          <div className="flex flex-col gap-1 px-1 py-1">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>Hasil Pencarian ({filteredItems.length})</span>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Tutup
              </button>
            </div>
            {filteredItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
                <IconSearch className="mx-auto mb-2 size-6 text-muted-foreground/50" />
                <p>Tidak ada menu yang sesuai dengan</p>
                <p className="font-semibold text-foreground mt-0.5">&ldquo;{searchQuery}&rdquo;</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {groupedFilteredItems.map((group) => (
                  <div key={group.section} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between px-2 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                      <span>{group.section}</span>
                      <span className="text-[9px] font-medium text-slate-400/80">({group.items.length})</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {group.items.map(({ url, title, section, groupLabel, icon: IconComponent, openInNewTab, globalIndex }) => {
                        const isSelected = globalIndex === selectedIndex
                        const isActive = pathname === url
                        return (
                          <SidebarMenuButton
                            key={`${section}-${title}-${url}-${globalIndex}`}
                            asChild
                            isActive={isActive || isSelected}
                            className={cn(
                              "min-h-9 rounded-xl px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150",
                              isSelected
                                ? "bg-blue-600 text-white shadow-xs font-semibold hover:bg-blue-600 hover:text-white"
                                : isActive
                                ? "bg-blue-50 text-blue-700 font-semibold dark:bg-blue-950/60 dark:text-blue-300"
                                : "hover:bg-sidebar-accent text-foreground"
                            )}
                          >
                            <Link
                              ref={(el) => {
                                itemRefs.current[globalIndex] = el
                              }}
                              href={url}
                              title={groupLabel ? `${title} (${groupLabel} • ${section})` : `${title} (${section})`}
                              onClick={() => setSearchQuery("")}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                              target={openInNewTab ? "_blank" : undefined}
                              rel={openInNewTab ? "noopener noreferrer" : undefined}
                              className="flex items-center justify-between gap-2 w-full min-w-0"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <IconComponent className={cn("size-4 shrink-0", isSelected ? "text-white" : "text-slate-500 dark:text-slate-400")} />
                                <span className="truncate text-[13px]">{title}</span>
                              </div>
                              {isSelected && (
                                <span className="shrink-0 text-[10px] font-mono opacity-90 px-1.5 py-0.5 rounded bg-white/20 font-medium">
                                  ↵ Enter
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <NavMain groups={desktopGroups as any} showQuickCreate groupLabelColor={groupLabelColor} />
        )}
        {!searchQuery.trim() && documentItems.length > 0 ? (
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
