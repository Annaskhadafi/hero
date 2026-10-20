'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  Headphones,
  PackageCheck,
  ShieldCheck,
  Truck,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { type MaestroSessionData } from '@/lib/maestro-session'

interface MaestroMobileBottomNavProps {
  session: MaestroSessionData
}

export function MaestroMobileBottomNav({ session }: MaestroMobileBottomNavProps) {
  const pathname = usePathname() || ''
  const isPrefixed = pathname.startsWith('/maestro')

  const resolveUrl = React.useCallback(
    (target: string) => {
      const clean = target.replace(/^\/maestro/, '')
      return isPrefixed ? `/maestro${clean}` : clean || '/'
    },
    [isPrefixed],
  )

  const isItemActive = React.useCallback(
    (target: string) => {
      const cleanTarget = target.replace(/^\/maestro/, '') || '/'
      const cleanCurrent = pathname.replace(/^\/maestro/, '') || '/'
      if (cleanTarget === '/') return cleanCurrent === '/' || cleanCurrent === '/activity'
      return cleanCurrent === cleanTarget || cleanCurrent.startsWith(`${cleanTarget}/`)
    },
    [pathname],
  )

  const navItems = [
    {
      title: 'Aktivitas',
      url: '/activity',
      icon: Activity,
    },
    {
      title: 'Safety',
      url: '/safety',
      icon: ShieldCheck,
    },
    {
      title: 'Tracking',
      url: '/tracking',
      icon: Truck,
    },
    {
      title: 'Bantuan',
      url: '/tickets',
      icon: Headphones,
    },
  ]

  return (
    <nav
      aria-label="Mobile Navigation"
      className="fixed bottom-0 inset-x-0 z-40 block md:hidden border-t-2 border-slate-200 bg-white/95 backdrop-blur-xl shadow-lg pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4 h-16 items-center px-1">
        {navItems.map((item) => {
          const active = isItemActive(item.url)
          const IconComponent = item.icon
          return (
            <Link
              key={item.url}
              href={resolveUrl(item.url)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 h-full py-1 text-center transition-all duration-150',
                active
                  ? 'text-blue-700 font-extrabold'
                  : 'text-slate-600 hover:text-slate-950 font-semibold',
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center size-8 rounded-xl transition-all',
                  active ? 'bg-blue-100 text-blue-700' : 'bg-transparent text-slate-600',
                )}
              >
                <IconComponent className="size-5" />
              </div>
              <span className="text-[10px] leading-none tracking-tight">
                {item.title}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
