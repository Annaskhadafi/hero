'use client'

import { useState, useMemo } from 'react'
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
  Heart,
  Store,
  Truck,
  Search,
  X,
  ChevronRight,
  Folder,
  Layers,
  Check,
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
import { useMobilePermissions } from '@/components/mobile/permission-provider'
import { MobileDashboardSearch, type SearchableMenuItem } from './mobile-dashboard-search'
import { cn } from '@/lib/utils'

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
  const [sheetSearch, setSheetSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('Semua')

  const permissions = useMobilePermissions()
  const allowedResources = new Set(sidebarItems.map((item) => item.resource).filter(Boolean))

  const isServiceAllowed = (service: { href: string; resource?: string }) => {
    if (service.resource === 'hero-genius' || service.resource === 'sop-win') {
      return true
    }
    if (service.resource && permissions && Object.keys(permissions).length > 0) {
      if (permissions[service.resource] !== undefined) {
        return Boolean(permissions[service.resource]?.canView)
      }
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
    section?: string
    target?: string
    description?: string
    isRequestGroup?: boolean
  }> = [
    {
      title: 'Check-In',
      href: '/mobile/attendance',
      resource: 'attendance',
      icon: MapPin,
      bg: 'bg-sky-500/10 text-sky-600',
      section: 'Operasional',
      description: 'Presensi lokasi & absensi wajah',
    },
    {
      title: 'Aktivitas Harian',
      href: '/mobile/activity',
      resource: 'tire_service',
      icon: FileText,
      bg: 'bg-blue-500/10 text-blue-600',
      section: 'Operasional',
      description: 'Catatan tugas harian & log kerja',
    },
    {
      title: 'Input Progress',
      href: '/mobile/activity/input',
      resource: 'tire_service',
      icon: FileSignature,
      bg: 'bg-amber-500/10 text-amber-600',
      section: 'Operasional',
      description: 'Submit bukti pekerjaan lapangan',
    },
    {
      title: 'Pengajuan SPL',
      href: '/mobile/overtime?tab=apply',
      resource: 'overtime_requests',
      icon: FileSignature,
      bg: 'bg-violet-500/10 text-violet-600',
      section: 'Izin & Roster',
      description: 'Surat perintah lembur mandiri',
    },
    {
      title: 'Request Barang',
      href: '/mobile/tools',
      resource: 'apd-request',
      icon: Package,
      bg: 'bg-amber-500/10 text-amber-600',
      section: 'Operasional',
      description: 'Permintaan APD, Material, Tools, ATK',
      isRequestGroup: true,
    },
    {
      title: 'HSE Report',
      href: '/mobile/hse',
      resource: 'hse',
      icon: ShieldCheck,
      bg: 'bg-emerald-500/10 text-emerald-600',
      section: 'HSE & Safety',
      description: 'Laporan insiden & observasi K3',
    },
    {
      title: 'Hero Genius',
      href: '/mobile/hero-genius',
      resource: 'hero-genius',
      icon: Sparkles,
      bg: 'bg-gradient-to-tr from-indigo-500/20 to-blue-500/20 text-indigo-600',
      section: 'AI Assistant',
      description: 'Asisten AI cerdas HERO',
    },
    {
      title: 'SOP & WIN',
      href: '/mobile/sop-win',
      resource: 'sop-win',
      icon: Files,
      bg: 'bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 text-indigo-600',
      section: 'Standar Mutu',
      description: 'Instruksi kerja & SOP resmi',
    },
    {
      title: 'Site Condition',
      href: '/mobile/reports/road-condition',
      resource: 'hse_road_condition_analysis',
      icon: Route,
      bg: 'bg-cyan-500/10 text-cyan-600',
      section: 'HSE & Safety',
      description: 'Analisis kondisi jalur & jalan site',
    },
    {
      title: 'Tire Repair Form',
      href: '/mobile/tire-repair',
      resource: 'tire_service',
      icon: Wrench,
      bg: 'bg-emerald-500/10 text-emerald-600',
      section: 'Operasional',
      description: 'Inspeksi & formulir perbaikan ban',
    },
    {
      title: 'Deteksi Kerusakan Ban',
      href: '/mobile/hse/tire-damage',
      resource: 'hse_tire_inspection',
      icon: ScanSearch,
      bg: 'bg-rose-500/10 text-rose-600',
      section: 'HSE & Safety',
      description: 'AI vision pendeteksi pola kerusakan ban',
    },
    {
      title: 'Summary APD',
      href: '/mobile/summary',
      resource: 'hse_summary_apd',
      icon: FileText,
      bg: 'bg-teal-500/10 text-teal-600',
      section: 'HSE & Safety',
      description: 'Rekap inventaris & pembagian APD',
    },
    {
      title: 'Izin & Terlambat',
      href: '/mobile/attendance/permission',
      resource: 'hc_attendance_permission',
      icon: ShieldCheck,
      bg: 'bg-rose-500/10 text-rose-600',
      section: 'Izin & Roster',
      description: 'Form dispensasi izin sakit / telat',
    },
    {
      title: 'Chitra Learning',
      href: '/mobile/chitralearning',
      resource: 'chitralearning_lms_workspace',
      icon: BookOpen,
      bg: 'bg-[#0ea5b0]/10 text-[#003461]',
      section: 'Pengembangan',
      description: 'Pelatihan & modul pembelajaran online',
    },
    {
      title: 'CS Forecast',
      href: '/mobile/central-service/forecast',
      resource: 'cs-forecast',
      icon: TrendingUp,
      bg: 'bg-emerald-500/10 text-emerald-600',
      section: 'Central Service',
      description: 'Prediksi kebutuhan part & servis',
    },
    {
      title: 'CS Assets',
      href: '/mobile/central-service/assets',
      resource: 'central-service-assets',
      icon: Package,
      bg: 'bg-indigo-500/10 text-indigo-600',
      section: 'Central Service',
      description: 'Manajemen aset unit & inventory CS',
    },
    {
      title: 'Status Pernikahan',
      href: '/mobile/central-service/marital-status',
      resource: 'central_service_marital_status',
      icon: Heart,
      bg: 'bg-rose-500/10 text-rose-600',
      section: 'Administrasi',
      description: 'Pembaruan data status keluarga',
    },
    {
      title: 'Armada GA',
      href: '/mobile/ga/vehicles',
      resource: 'ga-vehicles',
      icon: Truck,
      bg: 'bg-indigo-500/10 text-indigo-600',
      section: 'Umum & GA',
      description: 'Manajemen kendaraan operasional GA',
    },
    {
      title: 'Request RFR',
      href: '/mobile/rfr',
      icon: Users,
      bg: 'bg-sky-500/10 text-sky-600',
      section: 'Operasional',
      description: 'Pengajuan rotasi form request',
    },
    {
      title: 'Audit 5R',
      href: '/mobile/quality/5r',
      resource: 'five_r_report',
      icon: Sparkles,
      bg: 'bg-teal-500/10 text-teal-600',
      section: 'Mutu & 5R',
      description: 'Inspeksi kerapian lingkungan kerja',
    },
    {
      title: 'Pengaduan HR',
      href: '/mobile/curhat',
      resource: 'hr_counseling_user',
      icon: MessageSquare,
      bg: 'bg-pink-500/10 text-pink-600',
      section: 'Human Capital',
      description: 'Kanal curhat & konseling karyawan',
    },
    {
      title: 'Informasi HO',
      href: '/mobile/information',
      icon: Bell,
      bg: 'bg-amber-500/10 text-amber-600',
      section: 'Umum',
      description: 'Broadcast pengumuman kantor pusat',
    },
    {
      title: 'Wellness',
      href: '/mobile/wellness',
      resource: 'hc_mcu_wellness',
      icon: Dumbbell,
      bg: 'bg-teal-500/10 text-teal-600',
      section: 'Kesehatan',
      description: 'Hasil MCU, BMI, & riwayat fit to work',
    },
    {
      title: 'Roster',
      href: '/mobile/timesheet',
      resource: 'scheduling_timesheet',
      icon: CalendarRange,
      bg: 'bg-blue-500/10 text-blue-600',
      section: 'Izin & Roster',
      description: 'Jadwal kerja giliran & kalender shift',
    },
    {
      title: 'Leaderboard',
      href: '/mobile/gamification',
      resource: 'point_setting',
      icon: Trophy,
      bg: 'bg-yellow-500/10 text-yellow-600',
      section: 'Gamifikasi',
      description: 'Peringkat poin performa rekan tim',
    },
    {
      title: 'Toko Hadiah',
      href: '/mobile/reward-store',
      icon: Store,
      bg: 'bg-amber-500/10 text-amber-600',
      section: 'Gamifikasi',
      description: 'Penukaran poin HERO dengan merchandise',
    },
    ...(isHR
      ? [
          {
            title: 'Inbox HR',
            href: '/mobile/hr-counseling',
            resource: 'hr_counseling_admin',
            icon: Inbox,
            bg: 'bg-indigo-500/10 text-indigo-600',
            section: 'Human Capital',
            description: 'Pusat tindak lanjut konseling staf',
          },
        ]
      : []),
    {
      title: 'Approval',
      href: '/mobile/approval',
      resource: 'approval_inbox',
      icon: CheckCircle2,
      bg: 'bg-rose-500/10 text-rose-600',
      section: 'Operasional',
      description: 'Verifikasi & persetujuan berjenjang',
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
      section: 'Izin & Roster',
    },
    {
      title: 'Notifikasi',
      href: '/mobile/notifications',
      icon: Bell,
      description: 'Pusat notifikasi dan pengumuman',
      bg: 'bg-yellow-500/10 text-yellow-600',
      section: 'Umum',
    },
    {
      title: 'Profile & Account',
      href: '/mobile/profile',
      icon: User,
      description: 'Kelola profil dan pengaturan akun',
      bg: 'bg-slate-500/10 text-slate-600',
      section: 'Akun',
    },
  ]
  const visibleExtraServices = extraServices.filter(isServiceAllowed)

  // Filter sidebarItems by permissions if available
  const filteredSidebarItems = sidebarItems.filter((item) => {
    if (item.resource && permissions && Object.keys(permissions).length > 0) {
      if (permissions[item.resource] !== undefined) {
        return Boolean(permissions[item.resource]?.canView)
      }
    }
    return true
  })

  // Preferred top curated shortcut titles
  const preferredShortcuts = [
    'Check-In',
    'Aktivitas Harian',
    'Input Progress',
    'Pengajuan SPL',
    'Request Barang',
    'HSE Report',
    'SOP & WIN',
    'Hero Genius',
  ]

  // Curate top 7 items for homepage
  const homepageShortcuts = useMemo(() => {
    const matched: typeof visibleServices = []
    const remaining: typeof visibleServices = []

    preferredShortcuts.forEach((title) => {
      const found = visibleServices.find((s) => s.title === title)
      if (found && !matched.includes(found)) {
        matched.push(found)
      }
    })

    visibleServices.forEach((s) => {
      if (!matched.includes(s)) {
        remaining.push(s)
      }
    })

    // Take up to 7 items from matched + remaining
    const top7 = [...matched, ...remaining].slice(0, 7)
    return top7
  }, [visibleServices])

  // Count remaining services outside homepage top 7
  const remainingCount = Math.max(0, visibleServices.length - homepageShortcuts.length + filteredSidebarItems.length)

  // Build searchable items catalogue for instant search
  const allSearchableItems: SearchableMenuItem[] = useMemo(() => {
    const list: SearchableMenuItem[] = []

    visibleServices.forEach((s) => {
      list.push({
        title: s.title,
        url: s.href,
        section: s.section || 'Layanan Utama',
        icon: s.icon,
        bg: s.bg,
        description: s.description,
        isRequestGroup: s.isRequestGroup,
      })
    })

    filteredSidebarItems.forEach((item) => {
      // Don't duplicate if already in visibleServices by URL
      if (!list.some((existing) => existing.url === item.url)) {
        const TablerIcon = iconMap[item.iconName as keyof typeof iconMap] ?? IconFolder
        list.push({
          title: item.title,
          url: item.url,
          section: item.section || 'Fitur Lainnya',
          icon: TablerIcon,
          bg: 'bg-sky-500/10 text-sky-600',
          description: `Modul navigasi ${item.section || 'HERO'}`,
        })
      }
    })

    visibleExtraServices.forEach((ex) => {
      if (!list.some((existing) => existing.url === ex.href)) {
        list.push({
          title: ex.title,
          url: ex.href,
          section: ex.section || 'Akun & Sistem',
          icon: ex.icon,
          bg: ex.bg,
          description: ex.description,
        })
      }
    })

    return list
  }, [visibleServices, filteredSidebarItems, visibleExtraServices])

  // Categories in the "Lainnya" sheet
  const sheetCategories = useMemo(() => {
    const set = new Set<string>()
    allSearchableItems.forEach((item) => {
      if (item.section) set.add(item.section)
    })
    return ['Semua', ...Array.from(set)]
  }, [allSearchableItems])

  // Filter items in the "Lainnya" sheet
  const sheetFilteredItems = useMemo(() => {
    const q = sheetSearch.trim().toLowerCase()
    return allSearchableItems.filter((item) => {
      if (activeCategory !== 'Semua' && item.section !== activeCategory) {
        return false
      }
      if (!q) return true
      return (
        item.title.toLowerCase().includes(q) ||
        (item.section && item.section.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
      )
    })
  }, [allSearchableItems, sheetSearch, activeCategory])

  return (
    <section className="space-y-4">
      {/* Search Bar on Dashboard */}
      <MobileDashboardSearch
        items={allSearchableItems}
        onOpenRequests={() => setRequestOpen(true)}
        onOpenLainnya={() => setOpen(true)}
      />

      {/* Section Header */}
      <div className="flex items-center justify-between pl-1">
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#003f78]" />
          <p className="text-[10px] font-black tracking-[0.22em] text-[#486275] uppercase">
            Layanan Utama
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-[11px] font-bold text-[#003f78] hover:text-[#004e92] transition-colors"
        >
          <span>Katalog Lengkap</span>
          <ChevronRight className="size-3.5" />
        </button>
      </div>

      {/* Curated 8-Items Grid (2 rows x 4 cols) */}
      <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-[0_12px_32px_rgba(8,32,51,0.06)]">
        <div className="grid grid-cols-4 gap-x-2 gap-y-4">
          {homepageShortcuts.map((service, index) =>
            service.isRequestGroup ? (
              <button
                key={`home-service-${index}`}
                type="button"
                onClick={() => setRequestOpen(true)}
                className="group flex flex-col items-center justify-start text-center transition-transform active:scale-95"
              >
                <div
                  className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${service.bg} shadow-xs transition-transform duration-200 group-hover:scale-105`}
                >
                  <service.icon className="size-5" />
                </div>
                <span className="mt-1.5 flex h-[28px] items-center justify-center px-0.5 text-center text-[11px] font-bold leading-tight text-slate-700 transition-colors group-hover:text-[#003f78]">
                  {service.title}
                </span>
              </button>
            ) : (
              <Link
                key={`home-service-${index}`}
                href={service.href}
                target={service.target}
                className="group flex flex-col items-center justify-start text-center transition-transform active:scale-95"
              >
                <div
                  className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${service.bg} shadow-xs transition-transform duration-200 group-hover:scale-105`}
                >
                  <service.icon className="size-5" />
                </div>
                <span className="mt-1.5 flex h-[28px] items-center justify-center px-0.5 text-center text-[11px] font-bold leading-tight text-slate-700 transition-colors group-hover:text-[#003f78]">
                  {service.title}
                </span>
              </Link>
            )
          )}

          {/* 8th Button: Lainnya */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="group flex flex-col items-center justify-start text-center transition-transform active:scale-95"
              >
                <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200/60 bg-gradient-to-tr from-slate-100 to-slate-200/70 text-[#003f78] shadow-xs transition-transform duration-200 group-hover:scale-105 group-hover:bg-slate-200">
                  <MoreHorizontal className="size-5" />
                  {remainingCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-[#003f78] text-[8px] font-black text-white shadow-xs">
                      +
                    </span>
                  )}
                </div>
                <span className="mt-1.5 flex h-[28px] items-center justify-center px-0.5 text-center text-[11px] font-bold leading-tight text-[#003f78]">
                  Lainnya
                </span>
              </button>
            </SheetTrigger>

            {/* Sheet "Semua Layanan Chitra" with 2-Column Non-Truncated Cards */}
            <SheetContent
              side="bottom"
              className="max-h-[88vh] space-y-4 overflow-y-auto rounded-t-[2.2rem] border-t border-slate-100 bg-[#f8fbfe] px-5 pt-3 pb-8 shadow-[0_-20px_50px_rgba(8,32,51,0.15)]"
            >
              {/* Grabber */}
              <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />

              <SheetHeader className="text-left space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#003f78]">
                      Katalog Lengkap
                    </p>
                    <SheetTitle className="text-lg font-black tracking-tight text-[#082033]">
                      Semua Layanan Chitra
                    </SheetTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition active:scale-95"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </SheetHeader>

              {/* In-Sheet Search Bar */}
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Search className="size-4 text-[#003f78]" />
                </div>
                <input
                  type="text"
                  value={sheetSearch}
                  onChange={(e) => setSheetSearch(e.target.value)}
                  placeholder="Cari dalam katalog layanan..."
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white pr-9 pl-10 text-xs font-semibold text-[#082033] shadow-[0_2px_12px_rgba(8,32,51,0.03)] placeholder:text-slate-400 focus:border-[#003f78] focus:ring-2 focus:ring-[#003f78]/20 focus:outline-hidden"
                />
                {sheetSearch && (
                  <button
                    type="button"
                    onClick={() => setSheetSearch('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Chips */}
              <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 py-1">
                {sheetCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold tracking-tight transition-all active:scale-95',
                      activeCategory === category
                        ? 'bg-[#003f78] text-white shadow-[0_4px_12px_rgba(0,63,120,0.25)]'
                        : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* 2-Column Modern Cards Layout (NO TEXT CUT-OFF) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {sheetFilteredItems.length} Layanan Tersedia
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {sheetFilteredItems.map((item, index) => {
                    const Icon = item.icon || Folder

                    if (item.isRequestGroup) {
                      return (
                        <button
                          key={`sheet-item-${index}`}
                          type="button"
                          onClick={() => {
                            setOpen(false)
                            setRequestOpen(true)
                          }}
                          className="group flex flex-col justify-between rounded-2xl border border-slate-100/90 bg-white p-3 text-left shadow-[0_4px_16px_rgba(8,32,51,0.04)] transition-all hover:border-[#003f78]/40 hover:shadow-md active:scale-[0.98]"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div
                              className={cn(
                                'flex size-10 shrink-0 items-center justify-center rounded-xl shadow-2xs',
                                item.bg || 'bg-blue-500/10 text-blue-600'
                              )}
                            >
                              <Icon className="size-4.5" />
                            </div>
                            {item.section && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[8.5px] font-black tracking-wider text-slate-500 uppercase">
                                {item.section}
                              </span>
                            )}
                          </div>
                          <div className="mt-3">
                            <p className="text-xs font-bold leading-snug text-[#082033] break-words group-hover:text-[#003f78] transition-colors">
                              {item.title}
                            </p>
                            {item.description && (
                              <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-tight text-slate-400">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </button>
                      )
                    }

                    return (
                      <Link
                        key={`sheet-item-${index}`}
                        href={item.url}
                        onClick={() => setOpen(false)}
                        className="group flex flex-col justify-between rounded-2xl border border-slate-100/90 bg-white p-3 text-left shadow-[0_4px_16px_rgba(8,32,51,0.04)] transition-all hover:border-[#003f78]/40 hover:shadow-md active:scale-[0.98]"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div
                            className={cn(
                              'flex size-10 shrink-0 items-center justify-center rounded-xl shadow-2xs',
                              item.bg || 'bg-sky-500/10 text-sky-600'
                            )}
                          >
                            <Icon className="size-4.5" />
                          </div>
                          {item.section && (
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[8.5px] font-black tracking-wider text-slate-500 uppercase">
                              {item.section}
                            </span>
                          )}
                        </div>
                        <div className="mt-3">
                          <p className="text-xs font-bold leading-snug text-[#082033] break-words group-hover:text-[#003f78] transition-colors">
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-tight text-slate-400">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Sub-dialog: Request Barang */}
      <Sheet open={requestOpen} onOpenChange={setRequestOpen}>
        <SheetContent side="bottom" className="space-y-4 rounded-t-[2.2rem] border-t border-slate-100 bg-[#f8fbfe] px-5 pt-3 pb-8 shadow-[0_-20px_50px_rgba(8,32,51,0.15)]">
          {/* Grabber */}
          <div className="mx-auto h-1.5 w-12 rounded-full bg-slate-200" />

          <SheetHeader className="text-left space-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#003f78]">
                  Pengajuan Logistik
                </p>
                <SheetTitle className="text-lg font-black tracking-tight text-[#082033]">
                  Request Barang
                </SheetTitle>
              </div>
              <button
                type="button"
                onClick={() => setRequestOpen(false)}
                className="flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition active:scale-95"
              >
                <X className="size-4" />
              </button>
            </div>
          </SheetHeader>

          <div className="space-y-2 pt-2">
            {[
              {
                title: 'Request APD',
                href: '/mobile/apd',
                icon: HardHat,
                bg: 'bg-blue-500/10 text-blue-600',
                desc: 'Sepatu safety, helm, kacamata, sarung tangan',
              },
              {
                title: 'Request Material',
                href: '/mobile/material',
                icon: Package,
                bg: 'bg-amber-500/10 text-amber-600',
                desc: 'Patch perbaikan, valve, cairan compound ban',
              },
              {
                title: 'Request Tools',
                href: '/mobile/tools',
                icon: Wrench,
                bg: 'bg-emerald-500/10 text-emerald-600',
                desc: 'Torque wrench, buffing tool, alat ukur psi',
              },
              {
                title: 'Pengajuan ATK (Alat Tulis)',
                href: '/mobile/atk',
                icon: Files,
                bg: 'bg-indigo-500/10 text-indigo-600',
                desc: 'Form cetak, buku log, spidol ban, perlengkapan admin',
              },
            ].map((request) => (
              <Link
                key={request.href}
                href={request.href}
                onClick={() => setRequestOpen(false)}
                className="group flex min-h-16 items-center justify-between rounded-2xl border border-slate-100 bg-white p-3.5 shadow-[0_4px_14px_rgba(8,32,51,0.03)] transition-all hover:border-[#003f78]/30 hover:bg-slate-50 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3.5">
                  <span className={`flex size-11 items-center justify-center rounded-xl ${request.bg}`}>
                    <request.icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[#082033] group-hover:text-[#003f78] transition-colors">
                      {request.title}
                    </p>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                      {request.desc}
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-slate-300 group-hover:text-[#003f78] transition-colors" />
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  )
}
