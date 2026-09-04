'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays,
  ClipboardList,
  Coffee,
  FileSpreadsheet,
  LayoutDashboard,
  Users,
} from 'lucide-react'
import { useLanguage } from '@/components/language-provider'
import { translateMenuTitle } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const tabs = [
  {
    label: 'Overview Roster',
    href: '/dashboard/scheduling-timesheet',
    icon: LayoutDashboard,
    hint: 'Status per site & periode',
  },
  {
    label: 'Konfigurasi Roster, OT dan Meals',
    href: '/dashboard/scheduling-timesheet/setup',
    icon: Users,
    hint: 'Profil & konfigurasi site',
  },
  {
    label: 'Field Break Schedule',
    href: '/dashboard/scheduling-timesheet/field-break',
    icon: Coffee,
    hint: 'Rotasi FB',
  },
  {
    label: 'Schedule V2',
    href: '/dashboard/scheduling-timesheet/schedule-v2',
    icon: CalendarDays,
    hint: 'Manual grid tanpa auto-generate',
  },
  {
    label: 'Attendance',
    href: '/dashboard/scheduling-timesheet/attendance',
    icon: ClipboardList,
    hint: 'Face/location, manual, Excel',
  },
  {
    label: 'Payroll Timesheet',
    href: '/dashboard/scheduling-timesheet/payroll',
    icon: FileSpreadsheet,
    hint: 'Rekap MSA & overtime',
  },
]

export function SchedulingTabs({ permittedHrefs }: { permittedHrefs?: string[] }) {
  const pathname = usePathname()
  const { language } = useLanguage()

  const visibleTabs = permittedHrefs
    ? tabs.filter((tab) => permittedHrefs.includes(tab.href))
    : tabs

  const isActive = (href: string) => {
    if (href === '/dashboard/scheduling-timesheet') {
      return pathname === href
    }
    return pathname?.startsWith(href)
  }

  return (
    <nav className="mt-4 flex flex-wrap gap-1.5">
      {visibleTabs.map((tab) => {
        const active = isActive(tab.href)
        const Icon = tab.icon
        const displayLabel = translateMenuTitle(tab.label, language)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'group inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-all',
              active
                ? 'bg-foreground text-background shadow-sm'
                : 'bg-surface-container-lowest text-muted-foreground hover:text-foreground hover:bg-surface-bright shadow-[inset_0_0_0_1px_rgba(66,71,80,0.08)]'
            )}
            title={tab.hint}
          >
            <Icon
              className={cn(
                'size-4',
                active ? '' : 'text-muted-foreground group-hover:text-foreground'
              )}
              aria-hidden="true"
            />
            <span>{displayLabel}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function SchedulingHeaderTitle() {
  const { isIndonesian } = useLanguage()
  return (
    <h1 className="font-display text-foreground mt-1 text-[1.75rem] leading-tight font-semibold sm:text-[2rem]">
      {isIndonesian ? 'Roster & Jadwal' : 'Roster & Schedule'}
    </h1>
  )
}
