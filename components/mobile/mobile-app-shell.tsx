'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import {
  BarChart3,
  Bell,
  CheckCircle2,
  ClipboardList,
  Dumbbell,
  FileText,
  FileSignature,
  Grid3X3,
  Home,
  Menu,
  Package,
  ScanFace,
  ShieldAlert,
  ShieldCheck,
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
import { cn } from '@/lib/utils'

type NotificationCountResponse = {
  count: number
}

const bottomNavItems = [
  { label: 'Dashboard', href: '/mobile/dashboard', icon: Home },
  { label: 'Activity', href: '/mobile/activity', icon: ClipboardList },
  { label: 'Approval', href: '/mobile/approval', icon: CheckCircle2 },
  { label: 'Profile', href: '/mobile/profile', icon: UserRound },
]

const drawerItems = [
  { label: 'Dashboard', href: '/mobile/dashboard', icon: Home },
  { label: 'Daily Activity', href: '/mobile/activity', icon: ClipboardList },
  { label: 'Absensi Wajah', href: '/mobile/attendance/face', icon: ScanFace },
  { label: 'Approval', href: '/mobile/approval', icon: CheckCircle2 },
  { label: 'Overtime', href: '/mobile/overtime', icon: FileSignature },
  { label: 'Input Aktivitas', href: '/mobile/activity/input', icon: Grid3X3 },
  { label: 'HSE Report', href: '/mobile/hse', icon: ShieldCheck },
  { label: 'Daily Report', href: '/mobile/reports', icon: FileText },
  { label: 'Timesheet', href: '/mobile/timesheet', icon: Timer },
  { label: 'Training', href: '/mobile/training', icon: ShieldAlert },
  { label: 'Wellness', href: '/mobile/wellness', icon: Dumbbell },
  { label: 'Gamification', href: '/mobile/gamification', icon: Trophy },
  { label: 'Executive', href: '/mobile/executive', icon: BarChart3 },
  { label: 'Cargo Manifest', href: '/mobile/cargo-manifest', icon: Package },
  { label: 'Profile', href: '/mobile/profile', icon: UserRound },
]

export function MobileAppShell({
  children,
  userName,
  notificationCount = 0,
}: {
  children: ReactNode
  userName: string
  notificationCount?: number
}) {
  const pathname = usePathname()
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [liveNotificationCount, setLiveNotificationCount] = useState(notificationCount)

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

  return (
    <div className="mobile-light-scope min-h-dvh bg-[#dfe8ef] text-[#082033]">
      <div className="mx-auto min-h-dvh max-w-[430px] bg-[#f6fbff] shadow-[0_24px_80px_rgba(8,32,51,0.18)]">
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
                <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
                  {drawerItems.map((item) => {
                    const Icon = item.icon
                    const itemPath = item.href.split('?')[0]
                    const isActive = pathname === itemPath || pathname.startsWith(`${itemPath}/`)

                    return (
                      <SheetClose asChild key={item.href}>
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
                <div className="px-4 pb-5">
                  <LogoutButton
                    variant="default"
                    label="Logout"
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

            <Link
              prefetch={false}
              href="/mobile/notifications"
              aria-label="Open notifications"
              onClick={() => beginNavigation('/mobile/notifications')}
              className="relative flex size-11 items-center justify-center rounded-lg text-[#004b87] transition active:scale-[0.96] active:bg-[#e6f2fb]"
            >
              <Bell className="size-5" />
              {liveNotificationCount > 0 ? (
                <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-[#5a2200] px-1 text-[9px] leading-4 font-black text-white shadow-[0_6px_14px_rgba(90,34,0,0.24)]">
                  {liveNotificationCount > 9 ? '9+' : liveNotificationCount}
                </span>
              ) : null}
            </Link>
          </div>
        </header>

        <main aria-busy={pendingHref ? 'true' : undefined} className="px-4 pt-4 pb-28">
          {pendingHref ? (
            <div className="mb-3 rounded-lg bg-[#e9f6fd] px-3 py-2 text-[10px] font-black tracking-[0.14em] text-[#003f78] uppercase shadow-[inset_0_0_0_1px_rgba(0,52,97,0.04)]">
              Memuat halaman
            </div>
          ) : null}
          {children}
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] bg-white/94 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-18px_36px_rgba(8,32,51,0.08)] backdrop-blur-xl">
          <div className="grid grid-cols-4 gap-2">
            {bottomNavItems.map((item) => {
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
      </div>
    </div>
  )
}
