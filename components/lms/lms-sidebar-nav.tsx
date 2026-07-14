'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Library,
  BookOpen,
  GraduationCap,
  Hammer,
  Settings,
  Megaphone,
  Award,
  BarChart,
  Trophy,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const LEARNER_ITEMS = [
  {
    title: 'Dashboard',
    href: '/dashboard/chitralearning-lms',
    icon: LayoutDashboard,
    exact: true,
    color: 'blue',
  },
  {
    title: 'Katalog Kursus',
    href: '/dashboard/chitralearning-lms/catalog',
    icon: Library,
    color: 'violet',
  },
  {
    title: 'My Learning',
    href: '/dashboard/chitralearning-lms/my-learning',
    icon: BookOpen,
    color: 'emerald',
  },
  {
    title: 'Sertifikat',
    href: '/dashboard/chitralearning-lms/certificates',
    icon: GraduationCap,
    color: 'amber',
  },
  {
    title: 'Leaderboard',
    href: '/dashboard/chitralearning-lms/leaderboard',
    icon: Trophy,
    color: 'orange',
  },
]

const ADMIN_ITEMS = [
  {
    title: 'Course Builder',
    href: '/dashboard/chitralearning-lms/courses/new',
    icon: Hammer,
    color: 'rose',
  },
  {
    title: 'Management',
    href: '/dashboard/chitralearning-lms/management',
    icon: Settings,
    color: 'cyan',
  },
  {
    title: 'Reports',
    href: '/dashboard/chitralearning-lms/reports',
    icon: BarChart,
    color: 'indigo',
  },
  {
    title: 'Campaigns',
    href: '/dashboard/chitralearning-lms/campaigns',
    icon: Megaphone,
    color: 'orange',
  },
  {
    title: 'Online Assignment',
    href: '/dashboard/chitralearning-lms/online-assignments',
    icon: ClipboardList,
    color: 'violet',
  },

]

const COLOR_MAP: Record<string, { icon: string; active: string; ring: string }> = {
  blue:    { icon: 'text-blue-500',    active: 'bg-blue-500 shadow-blue-500/25',    ring: 'ring-blue-500/20' },
  violet:  { icon: 'text-violet-500',  active: 'bg-violet-500 shadow-violet-500/25',  ring: 'ring-violet-500/20' },
  emerald: { icon: 'text-emerald-500', active: 'bg-emerald-500 shadow-emerald-500/25', ring: 'ring-emerald-500/20' },
  amber:   { icon: 'text-amber-500',   active: 'bg-amber-500 shadow-amber-500/25',   ring: 'ring-amber-500/20' },
  rose:    { icon: 'text-rose-500',    active: 'bg-rose-500 shadow-rose-500/25',    ring: 'ring-rose-500/20' },
  cyan:    { icon: 'text-cyan-500',    active: 'bg-cyan-500 shadow-cyan-500/25',    ring: 'ring-cyan-500/20' },
  indigo:  { icon: 'text-indigo-500',  active: 'bg-indigo-500 shadow-indigo-500/25',  ring: 'ring-indigo-500/20' },
  orange:  { icon: 'text-orange-500',  active: 'bg-orange-500 shadow-orange-500/25',  ring: 'ring-orange-500/20' },
}

interface LmsSidebarNavProps {
  isAdmin?: boolean
}

function NavItem({ item, isActive }: { item: typeof LEARNER_ITEMS[number]; isActive: boolean }) {
  const colors = COLOR_MAP[item.color]

  return (
    <Link
      href={item.href}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
        isActive
          ? cn('text-white shadow-lg', colors.active)
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
          isActive
            ? 'bg-white/20'
            : cn('bg-slate-100', colors.icon, 'group-hover:bg-slate-200')
        )}
      >
        <item.icon className="h-4 w-4" />
      </span>
      {item.title}
      {isActive && (
        <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
      )}
    </Link>
  )
}

export function LmsSidebarNav({ isAdmin = false }: LmsSidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-6 w-full max-w-[240px] sticky top-6">
      {/* Learner Section */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-3 shadow-sm">
        <h4 className="px-2 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Learner
        </h4>
        <div className="space-y-1">
          {LEARNER_ITEMS.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname?.startsWith(item.href)
            return <NavItem key={item.href} item={item} isActive={isActive} />
          })}
        </div>
      </div>

      {/* Admin Section */}
      {isAdmin && (
        <div className="rounded-2xl border border-slate-200/60 bg-white p-3 shadow-sm">
          <h4 className="px-2 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Instructor & Admin
          </h4>
          <div className="space-y-1">
            {ADMIN_ITEMS.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname?.startsWith(item.href)
              return <NavItem key={item.href} item={item} isActive={isActive} />
            })}
          </div>
        </div>
      )}
    </nav>
  )
}
