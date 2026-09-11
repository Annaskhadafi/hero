'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import {
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  FileText,
  FileSignature,
  Home,
  Menu,
  Package,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Timer,
  Trophy,
  UserRound,
  X,
} from 'lucide-react'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { LogoutButton } from '@/components/logout-button'
import { LanguageToggle } from '@/components/language-toggle'
import { useLanguage } from '@/components/language-provider'
import { mobileActivityDrawerItem } from '@/lib/activity-navigation'
import { isMobileHrefAllowed, type MobileAllowedLink } from '@/lib/mobile-access'
import { useMobilePermissions } from '@/components/mobile/permission-provider'
import { cn } from '@/lib/utils'

type NotificationCountResponse = {
  count: number
}

type DrawerLinkItem = {
  type: 'link'
  label: string
  href: string
  icon: typeof Home
  resource?: string
}

type DrawerSectionItem = {
  type: 'section'
  label: string
}

type DrawerItem = DrawerLinkItem | DrawerSectionItem

export function MobileAppShell({
  children,
  userName,
  notificationCount = 0,
  allowedLinks = [],
}: {
  children: ReactNode
  userName: string
  notificationCount?: number
  allowedLinks?: MobileAllowedLink[]
}) {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [liveNotificationCount, setLiveNotificationCount] = useState(notificationCount)
  const permissions = useMobilePermissions()

  const bottomNavItems = [
    { label: t('nav.dashboard', 'Dashboard'), href: '/mobile/dashboard', icon: Home },
    { label: t('nav.activity', 'Activity'), href: '/mobile/activity', icon: ClipboardList, resource: 'tire_service' },
    { label: t('nav.approval', 'Approval'), href: '/mobile/approval', icon: CheckCircle2, resource: 'approval_inbox' },
    { label: t('nav.profile', 'Profile'), href: '/mobile/profile', icon: UserRound },
  ]

  const drawerItems: DrawerItem[] = [
    { type: 'section', label: t('nav.home', 'HOME') },
    { type: 'link', label: t('nav.dashboard', 'Dashboard'), href: '/mobile/dashboard', icon: Home },
    { type: 'link', label: t('nav.hero_genius', 'Hero Genius AI'), href: '/mobile/hero-genius', icon: Sparkles, resource: 'hero-genius' },
    { type: 'link', label: t('nav.ho_info', 'Informasi HO'), href: '/mobile/information', icon: Bell },
    { type: 'section', label: t('nav.productivity', 'Produktivitas') },
    { type: 'link', label: t('nav.activity', 'Aktivitas Harian'), href: '/mobile/activity', icon: ClipboardList, resource: 'tire_service' },
    {
      type: 'link',
      label: mobileActivityDrawerItem.label,
      href: mobileActivityDrawerItem.href,
      icon: ClipboardList,
      resource: 'tire_service',
    },
    { type: 'section', label: t('nav.leave_roster', 'IZIN & ROSTER') },
    {
      type: 'link',
      label: t('nav.sick_late_permission', 'Izin Sakit & Terlambat'),
      href: '/mobile/attendance/permission',
      icon: ShieldAlert,
      resource: 'hc_attendance_permission',
    },
    { type: 'link', label: t('nav.spl', 'SPL'), href: '/mobile/overtime', icon: FileSignature, resource: 'overtime_requests' },
    { type: 'link', label: t('nav.roster', 'Roster'), href: '/mobile/timesheet', icon: Timer, resource: 'scheduling_timesheet' },
    { type: 'link', label: t('nav.timesheet', 'Timesheet'), href: '/mobile/timesheet', icon: Timer, resource: 'scheduling_timesheet' },
    { type: 'section', label: t('nav.hse', 'Health & Safety (HSE)') },
    { type: 'link', label: t('nav.hse_report', 'HSE Report'), href: '/mobile/hse', icon: ShieldCheck, resource: 'safety_dashboard' },
    { type: 'link', label: t('nav.hse_checklist', 'HSE Checklist'), href: '/mobile/hse/checklist', icon: ShieldCheck, resource: 'safety_inspections' },
    {
      type: 'link',
      label: t('nav.tire_inspection', 'Tire Site Inspection'),
      href: '/mobile/hse/tire-inspection',
      icon: ShieldCheck,
      resource: 'hse_tire_inspection',
    },
    { type: 'link', label: t('nav.jsa', 'JSA'), href: '/mobile/hse/jsa', icon: ShieldCheck, resource: 'hse_jsa' },
    { type: 'link', label: t('nav.ptw', 'Izin Kerja PTW'), href: '/mobile/hse/ptw', icon: ShieldCheck, resource: 'hse_izin_kerja_ptw' },
    { type: 'section', label: t('nav.others', 'LAINNYA') },
    { type: 'link', label: t('nav.face_attendance', 'Absensi Wajah'), href: '/mobile/attendance', icon: ScanFace, resource: 'attendance' },
    { type: 'link', label: t('nav.approval', 'Approval'), href: '/mobile/approval', icon: CheckCircle2, resource: 'approval_inbox' },
    { type: 'link', label: t('nav.daily_report', 'Daily Report'), href: '/mobile/reports', icon: FileText, resource: 'daily_report_admin' },
    { type: 'link', label: t('nav.service_form', 'Service Form'), href: '/mobile/service-form', icon: FileSignature, resource: 'service360_service_form' },
    { type: 'link', label: t('nav.lms', 'ChitraLearning LMS'), href: '/mobile/chitralearning', icon: BookOpen, resource: 'chitralearning_lms_workspace' },
    { type: 'link', label: t('nav.training', 'Training'), href: '/mobile/training', icon: ShieldAlert, resource: 'hc_training_enhanced' },
    { type: 'link', label: t('nav.wellness', 'Wellness'), href: '/mobile/wellness', icon: Dumbbell, resource: 'hc_mcu_wellness' },
    { type: 'link', label: t('nav.leaderboard', 'Leaderboard'), href: '/mobile/gamification', icon: Trophy, resource: 'point_setting' },
    { type: 'link', label: t('nav.executive', 'Executive'), href: '/mobile/executive', icon: BarChart3, resource: 'ewh_dashboard' },
    { type: 'link', label: t('nav.cargo_manifest', 'Cargo Manifest'), href: '/mobile/cargo-manifest', icon: Package, resource: 'cargo_manifest' },
    { type: 'link', label: t('nav.profile', 'Profile'), href: '/mobile/profile', icon: UserRound },
  ]

  const checkAccess = (href: string, resource?: string) => {
    // If permissions dictionary has entries, use granular resource permission
    if (resource && permissions && Object.keys(permissions).length > 0) {
      if (permissions[resource] !== undefined) {
        return Boolean(permissions[resource]?.canView)
      }
    }
    // Fallback to allowedLinks check
    return isMobileHrefAllowed(href, allowedLinks)
  }

  const activeItem = [...drawerItems, ...bottomNavItems].find((item) => {
    if (('type' in item && (item as any).type === 'section') || !('href' in item)) return false
    return pathname === (item as any).href || pathname.startsWith(`${(item as any).href}/`)
  })

  // Check access for the current path based on the matched menu item's resource
  // If not found in the menu, fallback to the allowedLinks (old logic for dynamic detail pages if any)
  const isCurrentPathAllowed = activeItem && 'resource' in activeItem
    ? checkAccess(activeItem.href, (activeItem as DrawerLinkItem).resource)
    : isMobileHrefAllowed(pathname, allowedLinks)

  const visibleBottomNavItems = bottomNavItems.filter((item) =>
    checkAccess(item.href, item.resource)
  )

  const permittedDrawerItems = drawerItems.reduce<DrawerItem[]>((items, item) => {
    if (item.type === 'section') {
      items.push(item)
      return items
    }

    if (checkAccess(item.href, item.resource)) {
      items.push(item)
    }

    return items
  }, [])
  const visibleDrawerItems = permittedDrawerItems.filter((item, index, items) => {
    if (item.type === 'link') return true
    const nextSectionIndex = items.findIndex(
      (nextItem, nextIndex) => nextIndex > index && nextItem.type === 'section'
    )
    const sectionItems =
      nextSectionIndex === -1 ? items.slice(index + 1) : items.slice(index + 1, nextSectionIndex)
    return sectionItems.some((nextItem) => nextItem.type === 'link')
  })

  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  useEffect(() => {
    setLiveNotificationCount(notificationCount)
  }, [notificationCount])

  useEffect(() => {
    let isMounted = true

    async function loadNotificationCount() {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 5000)

      try {
        const response = await fetch('/api/notifications', {
          cache: 'no-store',
          signal: controller.signal,
        })

        if (!response.ok) {
          return
        }

        const payload = (await response.json()) as NotificationCountResponse
        if (isMounted) {
          setLiveNotificationCount(payload.count)
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
      } finally {
        window.clearTimeout(timeout)
      }
    }

    void loadNotificationCount()
    const interval = window.setInterval(() => void loadNotificationCount(), 30000)
    const handleNotificationsUpdated = () => void loadNotificationCount()
    window.addEventListener('hero:notifications-updated', handleNotificationsUpdated)

    return () => {
      isMounted = false
      window.clearInterval(interval)
      window.removeEventListener('hero:notifications-updated', handleNotificationsUpdated)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const hadLight = root.classList.contains('light')
    const hadDark = root.classList.contains('dark')
    const previousColorScheme = root.style.colorScheme

    const forceLightMode = () => {
      const needsClassUpdate = root.classList.contains('dark') || !root.classList.contains('light')
      const needsSchemeUpdate = root.style.colorScheme !== 'light'

      if (!needsClassUpdate && !needsSchemeUpdate) {
        return
      }

      root.classList.remove('dark')
      root.classList.add('light')
      root.style.colorScheme = 'light'
    }

    forceLightMode()

    const observer = new MutationObserver(forceLightMode)
    observer.observe(root, {
      attributeFilter: ['class', 'style'],
      attributes: true,
    })

    return () => {
      observer.disconnect()
      root.classList.remove('light', 'dark')
      if (hadLight) root.classList.add('light')
      if (hadDark) root.classList.add('dark')
      root.style.colorScheme = previousColorScheme
    }
  }, [])

  useEffect(() => {
    if (!pendingHref) {
      return
    }

    const timeout = window.setTimeout(() => setPendingHref(null), 8000)
    return () => window.clearTimeout(timeout)
  }, [pendingHref])

  function beginNavigation(href: string) {
    const targetPath = href.split('?')[0]
    if (pathname === targetPath) {
      return
    }

    setPendingHref(href)
  }

  const [isEmbed, setIsEmbed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.self !== window.top || window.location.search.includes('embed=1')) {
        setIsEmbed(true)
      }
    }
  }, [])

  return (
    <div className={cn("mobile-light-scope min-h-dvh text-[#082033]", isEmbed ? "bg-[#f6fbff]" : "bg-[#dfe8ef]")}>
      <div className={cn(isEmbed ? "w-full max-w-full bg-[#f6fbff]" : "mx-auto min-h-dvh max-w-[430px] bg-[#f6fbff] shadow-[0_24px_80px_rgba(8,32,51,0.18)]")}>
        {!isEmbed && (
          <header className="sticky top-0 z-40 bg-[#f6fbff]/92 px-4 py-3 shadow-[0_14px_30px_rgba(8,32,51,0.08)] backdrop-blur-xl">
            {pendingHref ? (
              <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-[#d8e8f3]">
                <span className="block h-full w-1/2 animate-pulse bg-[#003f78]" />
              </span>
            ) : null}
            <div className="flex h-11 items-center justify-between">
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label="Open mobile menu"
                    className="flex size-10 items-center justify-center rounded-lg text-[#004b87] transition active:scale-[0.96] active:bg-[#e6f2fb]"
                  >
                    <Menu className="size-5" />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  hideCloseButton
                  className="flex w-[min(320px,88vw)] flex-col border-0 bg-[#f6fbff] p-0"
                >
                  <SheetHeader className="bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(233,246,253,0.88))] px-5 py-5 text-left shadow-[0_14px_30px_rgba(8,32,51,0.08)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black tracking-[0.26em] text-[#486275] uppercase">
                          HERO Mobile
                        </p>
                        <SheetTitle className="mt-1 text-xl font-black tracking-tight text-[#082033]">
                          {userName}
                        </SheetTitle>
                      </div>
                      <SheetClose asChild>
                        <button
                          type="button"
                          aria-label="Close mobile menu"
                          className="flex size-10 items-center justify-center rounded-lg bg-[#eaf4fb] text-[#004b87] transition active:scale-[0.96]"
                        >
                          <X className="size-4" />
                        </button>
                      </SheetClose>
                    </div>
                  </SheetHeader>
                  <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
                    {visibleDrawerItems.map((item, index) => {
                      if (item.type === 'section') {
                        return (
                          <div
                            key={`section-${index}`}
                            className="flex items-center gap-2 px-3 pt-4 pb-1"
                          >
                            <span className="text-[9px] font-black tracking-[0.22em] text-[#6b8ba3] uppercase">
                              {item.label}
                            </span>
                            <div className="h-px flex-1 bg-[#d8e8f3]" />
                          </div>
                        )
                      }

                      const Icon = item.icon
                      const itemPath = item.href.split('?')[0]
                      const isActive = pathname === itemPath || pathname.startsWith(`${itemPath}/`)

                      return (
                        <SheetClose asChild key={`link-${index}`}>
                          <Link
                            prefetch={false}
                            href={item.href}
                            onClick={() => beginNavigation(item.href)}
                            className={cn(
                              'flex min-h-12 touch-manipulation items-center gap-3 rounded-lg px-3 text-sm font-bold transition active:scale-[0.96]',
                              isActive
                                ? 'bg-[#003f78] text-white shadow-[0_14px_28px_rgba(0,63,120,0.2)]'
                                : 'bg-white text-[#153249] shadow-[inset_0_0_0_1px_rgba(0,52,97,0.07)]'
                            )}
                          >
                            <Icon className="size-4" />
                            {item.label}
                          </Link>
                        </SheetClose>
                      )
                    })}
                  </nav>
                  <div className="space-y-3 px-4 pb-5">
                    <LanguageToggle variant="mobile-drawer" />
                    <LogoutButton
                      variant="default"
                      label={t('auth.logout', 'Logout')}
                      className="h-12 w-full rounded-xl border-0 bg-[#5a2200] text-white shadow-[0_14px_28px_rgba(90,34,0,0.18)] hover:bg-[#6b2a00]"
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <Link
                prefetch={false}
                href="/mobile/dashboard"
                onClick={() => beginNavigation('/mobile/dashboard')}
                className="text-sm font-black tracking-[0.12em] text-[#003f78] uppercase"
              >
                HERO
              </Link>

              <div className="flex items-center gap-1.5">
                <LanguageToggle variant="mobile-header" />

                <Link
                  prefetch={false}
                  href="/mobile/notifications"
                  aria-label="Open notifications"
                  onClick={() => beginNavigation('/mobile/notifications')}
                  className="relative flex size-10 items-center justify-center rounded-lg text-[#004b87] transition active:scale-[0.96] active:bg-[#e6f2fb]"
                >
                  <Bell className="size-5" />
                  {liveNotificationCount > 0 ? (
                    <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-[#5a2200] px-1 text-[9px] leading-4 font-black text-white shadow-[0_6px_14px_rgba(90,34,0,0.24)]">
                      {liveNotificationCount > 9 ? '9+' : liveNotificationCount}
                    </span>
                  ) : null}
                </Link>
              </div>
            </div>
          </header>
        )}

        <main aria-busy={pendingHref ? 'true' : undefined} className={cn("px-4 pt-4", isEmbed ? "pb-6" : "pb-28")}>
          {pendingHref ? (
            <div className="mb-3 rounded-lg bg-[#e9f6fd] px-3 py-2 text-[10px] font-black tracking-[0.14em] text-[#003f78] uppercase shadow-[inset_0_0_0_1px_rgba(0,52,97,0.04)]">
              {t('loading.page', 'Memuat halaman')}
            </div>
          ) : null}
          {children}
          {!isCurrentPathAllowed ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#082033]/45 px-5 backdrop-blur-sm">
              <div className="w-full max-w-[360px] rounded-[1.5rem] bg-white p-5 text-center shadow-[0_24px_80px_rgba(8,32,51,0.24)]">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#fff4e8] text-[#5a2200]">
                  <ShieldAlert className="size-6" />
                </div>
                <h2 className="mt-4 text-lg font-black tracking-tight text-[#082033]">
                  {t('access.denied_title', 'Anda tidak memiliki akses')}
                </h2>
                <p className="mt-2 text-sm leading-6 font-semibold text-[#486275]">
                  {t('access.denied_desc', 'Halaman ini dibatasi untuk role tertentu. Hubungi admin untuk membuka akses.')}
                </p>
                <Link
                  prefetch={false}
                  href="/mobile/dashboard"
                  onClick={() => beginNavigation('/mobile/dashboard')}
                  className="mt-5 flex h-12 items-center justify-center rounded-xl bg-[#003f78] text-xs font-black tracking-[0.12em] text-white uppercase active:scale-[0.98]"
                >
                  {t('access.back_to_dashboard', 'Kembali ke Dashboard')}
                </Link>
              </div>
            </div>
          ) : null}
        </main>

        {!isEmbed && !pathname.includes('/learn/') && (
          <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] bg-white/94 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-18px_36px_rgba(8,32,51,0.08)] backdrop-blur-xl">
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: `repeat(${Math.max(visibleBottomNavItems.length, 1)}, minmax(0, 1fr))`,
              }}
            >
              {visibleBottomNavItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <Link
                    prefetch={false}
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => beginNavigation(item.href)}
                    className={cn(
                      'flex min-h-12 touch-manipulation flex-col items-center justify-center gap-1 rounded-lg px-1 text-[9px] font-black tracking-[0.02em] uppercase transition active:scale-[0.96]',
                      isActive
                        ? 'bg-[#003f78] text-white shadow-[0_12px_26px_rgba(0,63,120,0.22)]'
                        : pendingHref === item.href
                          ? 'bg-[#e9f6fd] text-[#003f78]'
                          : 'text-[#486275] active:bg-[#eaf4fb]'
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="max-w-full truncate leading-none">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  )
}
