'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
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
  Pin,
  PinOff,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  saveUserPinnedServices,
  resetUserPinnedServices,
} from '@/app/actions/user-pinned-services'
import { DEFAULT_PINNED_TITLES } from '@/lib/pinned-services'
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

const CATEGORY_TABS = [
  { id: 'Semua', label: 'Semua', icon: Layers },
  { id: 'Disematkan', label: 'Disematkan', icon: Pin },
  { id: 'Operasional', label: 'Operasional', icon: Wrench },
  { id: 'K3 & HSE', label: 'K3 & HSE', icon: ShieldCheck },
  { id: 'Izin & Roster', label: 'Izin & Roster', icon: CalendarRange },
  { id: 'Logistik & Alat', label: 'Logistik & Alat', icon: Package },
  { id: 'HC & Wellness', label: 'HC & Wellness', icon: Heart },
  { id: 'Standar & AI', label: 'Standar & AI', icon: Sparkles },
  { id: 'Umum & Lainnya', label: 'Umum', icon: Folder },
] as const

type CategoryId = (typeof CATEGORY_TABS)[number]['id']

function resolveServiceCategory(item: { section?: string; title: string }): CategoryId {
  const s = (item.section || '').toLowerCase()
  const t = (item.title || '').toLowerCase()

  if (
    t.includes('request barang') ||
    t.includes('apd') ||
    t.includes('tools') ||
    t.includes('material') ||
    t.includes('atk') ||
    t.includes('assets') ||
    s.includes('logistik')
  ) {
    return 'Logistik & Alat'
  }
  if (
    s.includes('hse') ||
    s.includes('safety') ||
    s.includes('5r') ||
    s.includes('mutu') ||
    t.includes('kerusakan ban') ||
    t.includes('kondisi jalan')
  ) {
    if (s.includes('standar mutu')) return 'Standar & AI'
    return 'K3 & HSE'
  }
  if (
    s.includes('izin') ||
    s.includes('roster') ||
    s.includes('lembur') ||
    s.includes('timesheet') ||
    t.includes('attendance history') ||
    t.includes('spl')
  ) {
    return 'Izin & Roster'
  }
  if (
    s.includes('human capital') ||
    s.includes('kesehatan') ||
    s.includes('wellness') ||
    s.includes('curhat') ||
    s.includes('administrasi') ||
    t.includes('pernikahan') ||
    t.includes('inbox hr') ||
    t.includes('mcu')
  ) {
    return 'HC & Wellness'
  }
  if (
    s.includes('ai') ||
    s.includes('standar') ||
    s.includes('pengembangan') ||
    s.includes('learning') ||
    t.includes('sop') ||
    t.includes('genius')
  ) {
    return 'Standar & AI'
  }
  if (
    s.includes('operasional') ||
    t.includes('check-in') ||
    t.includes('aktivitas') ||
    t.includes('tire repair') ||
    t.includes('rfr') ||
    t.includes('approval')
  ) {
    return 'Operasional'
  }
  return 'Umum & Lainnya'
}

function ServiceCatalogCard({
  item,
  isPinned,
  onTogglePin,
  onSelect,
}: {
  item: SearchableMenuItem
  isPinned: boolean
  onTogglePin: (title: string) => void
  onSelect: () => void
}) {
  const Icon = item.icon || Folder
  const categoryName = resolveServiceCategory(item)

  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-1.5">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-xl shadow-2xs',
            item.bg || 'bg-sky-500/10 text-sky-600'
          )}
        >
          <Icon className="size-4.5" />
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[8.5px] font-black tracking-wider text-slate-500 uppercase">
            {categoryName}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onTogglePin(item.title)
            }}
            title={isPinned ? 'Lepas pin dari Dashboard' : 'Sematkan ke Dashboard'}
            aria-label={isPinned ? `Lepas ${item.title} dari Dashboard` : `Sematkan ${item.title} ke Dashboard`}
            className={cn(
              'flex size-7 shrink-0 items-center justify-center rounded-lg border transition-all active:scale-90',
              isPinned
                ? 'border-amber-300 bg-amber-50 text-amber-600 shadow-2xs hover:bg-amber-100/80'
                : 'border-slate-200/80 bg-slate-50 text-slate-400 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-600'
            )}
          >
            <Pin
              className={cn(
                'size-3.5 transition-transform',
                isPinned ? 'fill-amber-500 text-amber-600 rotate-45' : 'text-slate-400'
              )}
            />
          </button>
        </div>
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
    </>
  )

  const commonClassName =
    'group flex flex-col justify-between rounded-2xl border border-slate-100/90 bg-white p-3.5 text-left shadow-[0_4px_16px_rgba(8,32,51,0.04)] transition-all hover:border-[#003f78]/40 hover:shadow-md active:scale-[0.98]'

  if (item.isRequestGroup) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onSelect()
          }
        }}
        className={cn(commonClassName, 'cursor-pointer')}
      >
        {cardContent}
      </div>
    )
  }

  return (
    <Link href={item.url} onClick={onSelect} className={commonClassName}>
      {cardContent}
    </Link>
  )
}

type DashboardServicesProps = {
  isHR: boolean
  sidebarItems: NavItem[]
  allowedLinks: MobileAllowedLink[]
  userEmail?: string
  initialPinnedTitles?: string[] | null
}

export function MobileDashboardServices({
  isHR,
  sidebarItems,
  allowedLinks,
  userEmail,
  initialPinnedTitles,
}: DashboardServicesProps) {
  const [open, setOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [sheetSearch, setSheetSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<CategoryId>('Semua')
  const [isEditMode, setIsEditMode] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [pinnedTitles, setPinnedTitles] = useState<string[]>(
    initialPinnedTitles && initialPinnedTitles.length > 0 ? initialPinnedTitles : DEFAULT_PINNED_TITLES
  )

  useEffect(() => {
    if (initialPinnedTitles && initialPinnedTitles.length > 0) {
      setPinnedTitles(initialPinnedTitles)
    }
  }, [initialPinnedTitles])

  const togglePin = (title: string) => {
    const isPinned = pinnedTitles.some((t) => t.toLowerCase() === title.toLowerCase())
    const next = isPinned
      ? pinnedTitles.filter((t) => t.toLowerCase() !== title.toLowerCase())
      : [...pinnedTitles, title]

    setPinnedTitles(next)
    if (isPinned) {
      toast.success(`"${title}" dilepas dari dashboard`)
    } else {
      toast.success(`"${title}" disematkan ke dashboard`)
    }

    startTransition(async () => {
      try {
        const res = await saveUserPinnedServices(next)
        if (!res.success) {
          console.error('Gagal menyimpan pin ke database:', res.error)
        }
      } catch (err) {
        console.error('Error saving pinned services to DB:', err)
      }
    })
  }

  const resetPins = () => {
    setPinnedTitles(DEFAULT_PINNED_TITLES)
    toast.success('Susunan menu berhasil dikembalikan ke default')
    startTransition(async () => {
      try {
        await resetUserPinnedServices()
      } catch (err) {
        console.error('Error resetting pinned services:', err)
      }
    })
  }

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

  // Derive homepage shortcuts from user's pinned titles (DB-backed)
  const homepageShortcuts = useMemo(() => {
    const matched: SearchableMenuItem[] = []
    pinnedTitles.forEach((title) => {
      const found = allSearchableItems.find(
        (item) => item.title.toLowerCase() === title.toLowerCase()
      )
      if (found && !matched.some((m) => m.title.toLowerCase() === found.title.toLowerCase())) {
        matched.push(found)
      }
    })
    return matched
  }, [pinnedTitles, allSearchableItems])

  const isCustomized = useMemo(() => {
    if (pinnedTitles.length !== DEFAULT_PINNED_TITLES.length) return true
    return pinnedTitles.some((t, i) => t.toLowerCase() !== DEFAULT_PINNED_TITLES[i]?.toLowerCase())
  }, [pinnedTitles])

  // Count remaining services outside homepage
  const remainingCount = Math.max(0, allSearchableItems.length - homepageShortcuts.length)

  // Counts per category tab
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Semua: allSearchableItems.length,
      Disematkan: allSearchableItems.filter((i) =>
        pinnedTitles.some((t) => t.toLowerCase() === i.title.toLowerCase())
      ).length,
    }
    CATEGORY_TABS.forEach((tab) => {
      if (tab.id !== 'Semua' && tab.id !== 'Disematkan') {
        counts[tab.id] = 0
      }
    })
    allSearchableItems.forEach((item) => {
      const cat = resolveServiceCategory(item)
      counts[cat] = (counts[cat] || 0) + 1
    })
    return counts
  }, [allSearchableItems, pinnedTitles])

  // Grouped items for "Semua" tab overview
  const groupedAllItems = useMemo(() => {
    const groups: Array<{
      category: (typeof CATEGORY_TABS)[number]
      items: SearchableMenuItem[]
    }> = []

    CATEGORY_TABS.forEach((catTab) => {
      if (catTab.id === 'Semua' || catTab.id === 'Disematkan') return
      const itemsInCat = allSearchableItems.filter(
        (item) => resolveServiceCategory(item) === catTab.id
      )
      if (itemsInCat.length > 0) {
        groups.push({
          category: catTab,
          items: itemsInCat,
        })
      }
    })

    return groups
  }, [allSearchableItems])

  // Filter items in the "Lainnya" sheet
  const sheetFilteredItems = useMemo(() => {
    const q = sheetSearch.trim().toLowerCase()
    return allSearchableItems.filter((item) => {
      if (activeCategory === 'Disematkan') {
        if (!pinnedTitles.some((t) => t.toLowerCase() === item.title.toLowerCase())) {
          return false
        }
      } else if (activeCategory !== 'Semua') {
        const itemCat = resolveServiceCategory(item)
        if (itemCat !== activeCategory) {
          return false
        }
      }
      if (!q) return true
      const itemCat = resolveServiceCategory(item)
      return (
        item.title.toLowerCase().includes(q) ||
        (item.section && item.section.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        itemCat.toLowerCase().includes(q)
      )
    })
  }, [allSearchableItems, sheetSearch, activeCategory, pinnedTitles])

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
          {isCustomized && (
            <span className="rounded-full bg-blue-50 border border-blue-200/60 px-1.5 py-0.5 text-[8.5px] font-black text-[#003f78]">
              Kustom
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className={cn(
              'rounded-lg px-2 py-0.5 text-[11px] font-bold transition-colors',
              isEditMode
                ? 'bg-amber-100 text-amber-700'
                : 'text-slate-500 hover:text-[#003f78]'
            )}
          >
            {isEditMode ? 'Selesai' : 'Atur'}
          </button>
          {isEditMode && isCustomized && (
            <button
              type="button"
              onClick={resetPins}
              className="text-[11px] font-bold text-rose-500 hover:text-rose-700 transition-colors"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-[#003f78] hover:text-[#004e92] transition-colors"
          >
            <span>Katalog Lengkap</span>
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Curated Grid */}
      <div className="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-[0_12px_32px_rgba(8,32,51,0.06)]">
        {homepageShortcuts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Pin className="size-5" />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-700">Belum ada menu yang disematkan</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Pilih menu dari Katalog Lengkap untuk ditampilkan di sini.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="rounded-xl bg-[#003f78] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs active:scale-95 transition-transform"
              >
                Buka Katalog Lengkap
              </button>
              <button
                type="button"
                onClick={resetPins}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 active:scale-95 transition-transform"
              >
                Reset Default
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-x-2 gap-y-4">
            {homepageShortcuts.map((service, index) => {
              const Icon = service.icon || Folder
              return (
                <div key={`home-service-${index}`} className="relative group">
                  {/* Unpin button in Edit Mode */}
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        togglePin(service.title)
                      }}
                      title="Lepas dari dashboard"
                      aria-label={`Lepas ${service.title} dari dashboard`}
                      className="absolute -top-1.5 -right-1 z-10 flex size-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-xs transition-transform hover:scale-110 active:scale-90"
                    >
                      <X className="size-3 stroke-[3]" />
                    </button>
                  )}

                  {service.isRequestGroup ? (
                    <button
                      type="button"
                      onClick={() => setRequestOpen(true)}
                      className={cn(
                        'flex w-full flex-col items-center justify-start text-center transition-transform active:scale-95',
                        isEditMode && 'animate-pulse'
                      )}
                    >
                      <div
                        className={cn(
                          'flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform duration-200 group-hover:scale-105',
                          service.bg || 'bg-blue-500/10 text-blue-600'
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <span className="mt-1.5 flex h-[28px] items-center justify-center px-0.5 text-center text-[11px] font-bold leading-tight text-slate-700 transition-colors group-hover:text-[#003f78]">
                        {service.title}
                      </span>
                    </button>
                  ) : (
                    <Link
                      href={service.url}
                      className={cn(
                        'flex flex-col items-center justify-start text-center transition-transform active:scale-95',
                        isEditMode && 'animate-pulse'
                      )}
                    >
                      <div
                        className={cn(
                          'flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform duration-200 group-hover:scale-105',
                          service.bg || 'bg-sky-500/10 text-sky-600'
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <span className="mt-1.5 flex h-[28px] items-center justify-center px-0.5 text-center text-[11px] font-bold leading-tight text-slate-700 transition-colors group-hover:text-[#003f78]">
                        {service.title}
                      </span>
                    </Link>
                  )}
                </div>
              )
            })}

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
              hideCloseButton
              className="max-h-[88vh] overflow-y-auto rounded-t-[2.2rem] border-t border-slate-100 bg-[#f8fbfe] px-5 pt-3 pb-8 shadow-[0_-20px_50px_rgba(8,32,51,0.15)]"
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
              <div className="relative shrink-0">
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

              {/* Category Tab Bar with Icons and Badge Counters */}
              <div className="no-scrollbar -mx-5 flex shrink-0 items-center gap-2 overflow-x-auto px-5 py-2">
                {CATEGORY_TABS.map((tab) => {
                  const TabIcon = tab.icon
                  const count = categoryCounts[tab.id] ?? 0
                  const isActive = activeCategory === tab.id

                  if (tab.id !== 'Semua' && count === 0) return null

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveCategory(tab.id)}
                      className={cn(
                        'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold tracking-tight transition-all active:scale-95 border',
                        isActive
                          ? 'bg-[#003f78] text-white border-[#003f78] shadow-[0_4px_12px_rgba(0,63,120,0.25)]'
                          : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 shadow-2xs'
                      )}
                    >
                      <TabIcon className={cn('size-3.5', isActive ? 'text-white' : 'text-slate-400')} />
                      <span>{tab.label}</span>
                      <span
                        className={cn(
                          'ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black',
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Tab Panel Content */}
              {sheetSearch.trim() ? (
                // 1. Search Results Mode
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Hasil Pencarian ({sheetFilteredItems.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSheetSearch('')}
                      className="text-[10px] font-bold text-[#003f78] hover:underline"
                    >
                      Hapus Filter
                    </button>
                  </div>
                  {sheetFilteredItems.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      {sheetFilteredItems.map((item, idx) => (
                        <ServiceCatalogCard
                          key={`search-${idx}`}
                          item={item}
                          isPinned={pinnedTitles.some((t) => t.toLowerCase() === item.title.toLowerCase())}
                          onTogglePin={togglePin}
                          onSelect={() => {
                            setOpen(false)
                            if (item.isRequestGroup) setRequestOpen(true)
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
                      <p className="text-xs font-bold text-slate-600">Tidak ada layanan yang cocok.</p>
                      <button
                        type="button"
                        onClick={() => setSheetSearch('')}
                        className="mt-2 text-[11px] font-bold text-[#003f78] underline"
                      >
                        Reset Kata Kunci
                      </button>
                    </div>
                  )}
                </div>
              ) : activeCategory === 'Semua' ? (
                // 2. "Semua" Tab: Grouped by Category with Section Headers
                <div className="space-y-5 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {allSearchableItems.length} Layanan dalam {groupedAllItems.length} Kategori
                    </span>
                  </div>

                  {categoryCounts.Disematkan > 0 && (
                    <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 px-4 py-2.5 shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700">
                          <Pin className="size-3.5 fill-amber-500 text-amber-600" />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-amber-950">
                            {categoryCounts.Disematkan} Layanan Disematkan
                          </p>
                          <p className="text-[10px] font-medium text-amber-700/80">
                            Tampil di bagian Layanan Utama dashboard
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveCategory('Disematkan')}
                        className="rounded-lg bg-amber-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-2xs hover:bg-amber-700 active:scale-95 transition-all"
                      >
                        Kelola
                      </button>
                    </div>
                  )}

                  {groupedAllItems.map((group) => {
                    const CatIcon = group.category.icon
                    return (
                      <div key={group.category.id} className="space-y-2.5">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            <span className="flex size-6 items-center justify-center rounded-lg bg-[#003f78]/10 text-[#003f78]">
                              <CatIcon className="size-3.5" />
                            </span>
                            <span className="text-xs font-black uppercase tracking-wider text-[#082033]">
                              {group.category.label}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveCategory(group.category.id)}
                            className="text-[10px] font-bold text-[#003f78] hover:underline"
                          >
                            Lihat Semua ({group.items.length})
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          {group.items.map((item, idx) => (
                            <ServiceCatalogCard
                              key={`group-${group.category.id}-${idx}`}
                              item={item}
                              isPinned={pinnedTitles.some((t) => t.toLowerCase() === item.title.toLowerCase())}
                              onTogglePin={togglePin}
                              onSelect={() => {
                                setOpen(false)
                                if (item.isRequestGroup) setRequestOpen(true)
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                // 3. Specific Category Tab View (including 'Disematkan')
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      {activeCategory === 'Disematkan' ? 'Layanan Disematkan Anda' : `Kategori ${activeCategory}`}
                    </span>
                    <span className="text-[10px] font-bold text-[#003f78]">
                      {sheetFilteredItems.length} Layanan
                    </span>
                  </div>
                  {sheetFilteredItems.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2.5">
                      {sheetFilteredItems.map((item, idx) => (
                        <ServiceCatalogCard
                          key={`cat-${activeCategory}-${idx}`}
                          item={item}
                          isPinned={pinnedTitles.some((t) => t.toLowerCase() === item.title.toLowerCase())}
                          onTogglePin={togglePin}
                          onSelect={() => {
                            setOpen(false)
                            if (item.isRequestGroup) setRequestOpen(true)
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
                      <Pin className="mx-auto size-7 text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-700">
                        {activeCategory === 'Disematkan'
                          ? 'Belum ada layanan yang disematkan.'
                          : 'Tidak ada layanan di kategori ini.'}
                      </p>
                      {activeCategory === 'Disematkan' && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          Klik ikon pin pada kartu layanan di tab Semua atau kategori lain untuk menyematkannya ke dashboard.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => setActiveCategory('Semua')}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#003f78] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs active:scale-95 transition-transform"
                      >
                        Kembali ke Semua
                      </button>
                    </div>
                  )}
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
        )}
      </div>

      {/* Sub-dialog: Request Barang */}
      <Sheet open={requestOpen} onOpenChange={setRequestOpen}>
        <SheetContent side="bottom" hideCloseButton className="space-y-4 rounded-t-[2.2rem] border-t border-slate-100 bg-[#f8fbfe] px-5 pt-3 pb-8 shadow-[0_-20px_50px_rgba(8,32,51,0.15)]">
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
