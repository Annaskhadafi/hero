'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MapPin,
  ShieldCheck,
  Sparkles,
  MessageSquare,
  Inbox,
  CheckCircle2,
  MoreHorizontal,
  FileSignature,
  FileText,
  CalendarRange,
  Bell,
  User,
  Dumbbell,
  Trophy,
  Route,
  HardHat,
  BookOpen,
  TrendingUp,
  Package,
  ScanSearch,
  Wrench,
  Files,
  Users,
} from 'lucide-react'
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
} from '@tabler/icons-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { isMobileHrefAllowed, type MobileAllowedLink } from '@/lib/mobile-access'

const iconMap = {
  'book-open': IconBook,
  'chart-bar': IconChartBar,
  checklist: IconChecklist,
  clock: IconClockHour4,
  dashboard: IconDashboard,
  database: IconDatabase,
  'file-word': IconFileWord,
  folder: IconFolder,
  help: IconHelp,
  'list-details': IconListDetails,
  mail: IconMail,
  report: IconReport,
  settings: IconSettings,
  shield: IconShieldHalfFilled,
  'shield-alert': IconShieldHalfFilled,
  users: IconUsers,
} as const

type NavItem = {
  title: string
  url: string
  section?: string
  iconName?: string
  resource?: string
}

type DashboardServicesProps = {
  isHR: boolean
  sidebarItems: NavItem[]
  allowedLinks: MobileAllowedLink[]
}

export function MobileDashboardServices({
  isHR,
  sidebarItems,
  allowedLinks,
}: DashboardServicesProps) {
  const [open, setOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const allowedResources = new Set(sidebarItems.map((item) => item.resource).filter(Boolean))
  const isServiceAllowed = (service: { href: string; resource?: string }) => {
    if (service.resource === 'hero-genius' || service.resource === 'sop-win') {
      return true
    }
    if (service.resource) {
      return allowedResources.has(service.resource)
    }
    return isMobileHrefAllowed(service.href, allowedLinks)
  }

  const mainServices: Array<{
    title: string
    href: string
    resource?: string
    icon: typeof MapPin
    bg: string
    target?: string
    isRequestGroup?: boolean
  }> = [
    {
      title: 'Check-In',
      href: '/mobile/attendance',
      resource: 'attendance',
      icon: MapPin,
      bg: 'bg-sky-500/10 text-sky-600',
    },
    {
      title: 'Aktivitas Harian',
      href: '/mobile/activity',
      resource: 'tire_service',
      icon: FileText,
      bg: 'bg-blue-500/10 text-blue-600',
    },
    {
      title: 'Hero Genius',
      href: '/mobile/hero-genius',
      resource: 'hero-genius',
      icon: Sparkles,
      bg: 'bg-gradient-to-tr from-indigo-500/20 to-blue-500/20 text-indigo-600',
    },
    {
      title: 'SOP & WIN',
      href: '/mobile/sop-win',
      resource: 'sop-win',
      icon: Files,
      bg: 'bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 text-indigo-600',
    },
    {
      title: 'HSE Report',
      href: '/mobile/hse',
      resource: 'hse',
      icon: ShieldCheck,
      bg: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      title: 'Site Condition',
      href: '/mobile/reports/road-condition',
      resource: 'hse_road_condition_analysis',
      icon: Route,
      bg: 'bg-cyan-500/10 text-cyan-600',
    },
    {
      title: 'Input Progress',
      href: '/mobile/activity/input',
      resource: 'tire_service',
      icon: FileSignature,
      bg: 'bg-amber-500/10 text-amber-600',
    },
    {
      title: 'Pengajuan SPL',
      href: '/mobile/overtime?tab=apply',
      resource: 'overtime_requests',
      icon: FileSignature,
      bg: 'bg-violet-500/10 text-violet-600',
    },
    {
      title: 'Request Barang',
      href: '/mobile/tools',
      resource: 'apd-request',
      icon: Package,
      bg: 'bg-amber-500/10 text-amber-600',
      isRequestGroup: true,
    },
    {
      title: 'Deteksi Kerusakan Ban',
      href: '/mobile/hse/tire-damage',
      resource: 'hse_tire_inspection',
      icon: ScanSearch,
      bg: 'bg-rose-500/10 text-rose-600',
    },
    {
      title: 'Summary APD',
      href: '/mobile/summary',
      resource: 'hse_summary_apd',
      icon: FileText,
      bg: 'bg-teal-500/10 text-teal-600',
    },
    {
      title: 'Izin & Terlambat',
      href: '/mobile/attendance/permission',
      resource: 'hc_attendance_permission',
      icon: ShieldCheck,
      bg: 'bg-rose-500/10 text-rose-600',
    },
    {
      title: 'Chitra Learning',
      href: '/mobile/chitralearning',
      resource: 'chitralearning_lms_workspace',
      icon: BookOpen,
      bg: 'bg-[#0ea5b0]/10 text-[#003461]',
    },
    {
      title: 'CS Forecast',
      href: '/mobile/central-service/forecast',
      resource: 'cs-forecast',
      icon: TrendingUp,
      bg: 'bg-emerald-500/10 text-emerald-600',
    },
    {
      title: 'CS Assets',
      href: '/mobile/central-service/assets',
      resource: 'central-service-assets',
      icon: Package,
      bg: 'bg-indigo-500/10 text-indigo-600',
    },
    {
      title: 'Request RFR',
      href: '/mobile/rfr',
      icon: Users,
      bg: 'bg-sky-500/10 text-sky-600',
    },
    {
      title: 'Audit 5R',
      href: '/mobile/quality/5r',
      resource: 'five_r_report',
      icon: Sparkles,
      bg: 'bg-teal-500/10 text-teal-600',
    },
    {
      title: 'Pengaduan HR',
      href: '/mobile/curhat',
      resource: 'hr_counseling_user',
      icon: MessageSquare,
      bg: 'bg-pink-500/10 text-pink-600',
    },
    {
      title: 'Informasi HO',
      href: '/mobile/information',
      icon: Bell,
      bg: 'bg-amber-500/10 text-amber-600',
    },
    {
      title: 'Wellness',
      href: '/mobile/wellness',
      resource: 'hc_mcu_wellness',
      icon: Dumbbell,
      bg: 'bg-teal-500/10 text-teal-600',
    },
    {
      title: 'Roster',
      href: '/mobile/timesheet',
      resource: 'scheduling_timesheet',
      icon: CalendarRange,
      bg: 'bg-blue-500/10 text-blue-600',
    },
    {
      title: 'Leaderboard',
      href: '/mobile/gamification',
      resource: 'point_setting',
      icon: Trophy,
      bg: 'bg-yellow-500/10 text-yellow-600',
    },
    ...(isHR
      ? [
          {
            title: 'Inbox HR',
            href: '/mobile/hr-counseling',
            resource: 'hr_counseling_admin',
            icon: Inbox,
            bg: 'bg-indigo-500/10 text-indigo-600',
          },
        ]
      : []),
    {
      title: 'Approval',
      href: '/mobile/approval',
      resource: 'approval_inbox',
      icon: CheckCircle2,
      bg: 'bg-rose-500/10 text-rose-600',
    },
  ]

  const visibleServices = mainServices.filter(isServiceAllowed)

  const extraServices = [
    {
      title: 'Attendance History',
      href: '/mobile/attendance',
      resource: 'attendance',
      icon: CalendarRange,
      description: 'Riwayat absen dan keandalan bulanan',
      bg: 'bg-teal-500/10 text-teal-600',
    },
    {
      title: 'Notifikasi',
      href: '/mobile/notifications',
      icon: Bell,
      description: 'Pusat notifikasi dan pengumuman',
      bg: 'bg-yellow-500/10 text-yellow-600',
    },
    {
      title: 'Profile & Account',
      href: '/mobile/profile',
      icon: User,
      description: 'Kelola profil dan pengaturan akun',
      bg: 'bg-slate-500/10 text-slate-600',
    },
  ]
  const visibleExtraServices = extraServices.filter(isServiceAllowed)

  // Group sidebarItems by section
  const groupedSidebarItems = sidebarItems.reduce(
    (acc, item) => {
      const secName = item.section || 'Lainnya'
      if (!acc[secName]) {
        acc[secName] = []
      }
      acc[secName].push(item)
      return acc
    },
    {} as Record<string, NavItem[]>
  )

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between pl-1">
        <p className="text-[10px] font-black tracking-[0.22em] text-[#486275] uppercase">
          Layanan Chitra
        </p>
      </div>

      <div className="grid grid-cols-4 gap-x-2 gap-y-5 rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-[0_12px_32px_rgba(8,32,51,0.06)]">
        {visibleServices.map((service, index) =>
          service.isRequestGroup ? (
            <button
              key={index}
              type="button"
              onClick={() => setRequestOpen(true)}
              className="group flex flex-col items-center justify-start text-center transition-transform active:scale-95"
            >
              <div
                className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${service.bg} transition-colors duration-200`}
              >
                <service.icon className="size-5" />
              </div>
              <span className="group-hover:text-primary mt-2 text-[11px] leading-tight font-bold text-slate-700 transition-colors">
                {service.title}
              </span>
            </button>
          ) : (
            <Link
              key={index}
              href={service.href}
              target={service.target}
              className="group flex flex-col items-center justify-start text-center transition-transform active:scale-95"
            >
              <div
                className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${service.bg} transition-colors duration-200`}
              >
                <service.icon className="size-5" />
              </div>
              <span className="group-hover:text-primary mt-2 text-[11px] leading-tight font-bold text-slate-700 transition-colors">
                {service.title}
              </span>
            </Link>
          )
        )}

        {/* Lainnya Trigger Sheet */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="group flex flex-col items-center justify-center text-center transition-transform active:scale-95">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-slate-200">
                <MoreHorizontal className="size-5" />
              </div>
              <span className="mt-2 text-[11px] leading-tight font-bold text-slate-700">
                Lainnya
              </span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="max-h-[85vh] space-y-6 overflow-y-auto rounded-t-[2rem] px-6 pt-4 pb-8"
          >
            <SheetHeader className="mb-4 flex flex-col items-center justify-center text-center">
              <div className="mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
              <SheetTitle className="text-lg font-black text-[#003461]">
                Semua Layanan Chitra
              </SheetTitle>
            </SheetHeader>

            {/* Direct Core Services */}
            <div className="grid grid-cols-4 gap-4">
              {visibleServices.map((service, index) =>
                service.isRequestGroup ? (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      setRequestOpen(true)
                    }}
                    className="group flex flex-col items-center justify-center text-center"
                  >
                    <div
                      className={`flex size-12 items-center justify-center rounded-2xl ${service.bg}`}
                    >
                      <service.icon className="size-5" />
                    </div>
                    <span className="mt-2 text-[11px] leading-tight font-bold text-slate-700">
                      {service.title}
                    </span>
                  </button>
                ) : (
                  <Link
                    key={index}
                    href={service.href}
                    target={service.target}
                    onClick={() => setOpen(false)}
                    className="group flex flex-col items-center justify-center text-center"
                  >
                    <div
                      className={`flex size-12 items-center justify-center rounded-2xl ${service.bg}`}
                    >
                      <service.icon className="size-5" />
                    </div>
                    <span className="mt-2 text-[11px] leading-tight font-bold text-slate-700">
                      {service.title}
                    </span>
                  </Link>
                )
              )}
            </div>

            {/* Dynamic RBAC Sidebar Items - Grouped and Rendered as Grid of Icons */}
            {Object.keys(groupedSidebarItems || {}).map((sectionName) => {
              const items = groupedSidebarItems[sectionName]
              return (
                <div key={sectionName} className="space-y-3 border-t border-slate-100 pt-5">
                  <h3 className="pl-1 text-xs font-black tracking-wider text-slate-400 uppercase">
                    {sectionName}
                  </h3>
                  <div className="grid grid-cols-4 gap-4">
                    {items.map((item, index) => {
                      const TablerIcon =
                        iconMap[item.iconName as keyof typeof iconMap] ?? IconFolder
                      return (
                        <Link
                          key={index}
                          href={item.url}
                          onClick={() => setOpen(false)}
                          className="group flex flex-col items-center justify-center text-center transition-transform active:scale-95"
                        >
                          <div className="flex size-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 transition-colors group-hover:bg-sky-500/20">
                            <TablerIcon className="size-5" />
                          </div>
                          <span className="mt-2 line-clamp-1 w-full px-1 text-[10px] leading-tight font-bold text-slate-700">
                            {item.title}
                          </span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Extra/Utility Services */}
            <div className="space-y-3 border-t border-slate-100 pt-5">
              <h3 className="pl-1 text-xs font-black tracking-wider text-slate-400 uppercase">
                Aktivitas & Akun
              </h3>
              <div className="grid gap-3">
                {visibleExtraServices.map((service, index) => (
                  <Link
                    key={index}
                    href={service.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-4 rounded-2xl bg-slate-50/50 p-3 transition-colors hover:bg-slate-50"
                  >
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${service.bg}`}
                    >
                      <service.icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#003461]">{service.title}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {service.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Sheet open={requestOpen} onOpenChange={setRequestOpen}>
        <SheetContent side="bottom" className="space-y-4 rounded-t-[2rem] px-5 pt-4 pb-8">
          <SheetHeader className="text-left">
            <SheetTitle className="text-lg font-black text-[#003461]">Request Barang</SheetTitle>
          </SheetHeader>
          {[
            {
              title: 'Request APD',
              href: '/mobile/apd',
              icon: HardHat,
              bg: 'bg-blue-500/10 text-blue-600',
            },
            {
              title: 'Request Material',
              href: '/mobile/material',
              icon: Package,
              bg: 'bg-amber-500/10 text-amber-600',
            },
            {
              title: 'Request Tools',
              href: '/mobile/tools',
              icon: Wrench,
              bg: 'bg-emerald-500/10 text-emerald-600',
            },
          ].map((request) => (
            <Link
              key={request.href}
              href={request.href}
              onClick={() => setRequestOpen(false)}
              className="flex min-h-14 items-center gap-3 rounded-xl bg-slate-50 px-4 text-sm font-black text-[#082033]"
            >
              <span className={`flex size-10 items-center justify-center rounded-xl ${request.bg}`}>
                <request.icon className="size-5" />
              </span>
              {request.title}
            </Link>
          ))}
        </SheetContent>
      </Sheet>
    </section>
  )
}
