'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  Headphones,
  Sparkles,
} from 'lucide-react'

import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { type MaestroSessionData } from '@/lib/maestro-session'
import { cn } from '@/lib/utils'

interface MaestroSiteHeaderProps {
  session: MaestroSessionData
}

const ROUTE_INFO: Record<string, { title: string; subtitle: string; eyebrow: string }> = {
  '/activity': {
    eyebrow: 'OPERATIONAL MONITORING',
    title: 'Daily Activity & Manpower',
    subtitle: 'Presensi check-in, jadwal shift, dan log servis harian teknisi OTR site',
  },
  '/safety': {
    eyebrow: 'HSE COMPLIANCE & RISK',
    title: 'Safety & PTW Management',
    subtitle: 'Izin kerja risiko tinggi, job safety analysis, dan status zero fatality',
  },
  '/tracking': {
    eyebrow: 'SUPPLY CHAIN & LOGISTICS',
    title: 'PO & Cargo Tracking',
    subtitle: 'Pelacakan manifest kargo, surat jalan DO SAP, dan konsinyasi eVHS',
  },
  '/orders': {
    eyebrow: 'COMMERCIAL & ORDERS',
    title: 'Orders & PO Management',
    subtitle: 'Manajemen katalog pesanan ban OTR dan status penerimaan',
  },
  '/tickets': {
    eyebrow: 'CUSTOMER SUPPORT & AI',
    title: 'Helpdesk & Problem Ticketing',
    subtitle: 'Pusat pengaduan operasional dengan respon cerdas AI dan staf HERO',
  },
  '/dashboard': {
    eyebrow: 'MAESTRO WORKSPACE',
    title: 'Daily Activity & Manpower',
    subtitle: 'Portal monitoring real-time operasional PT Chitra Paratama',
  },
  '/scrap': {
    eyebrow: 'TIRE ASSET & PERFORMANCE',
    title: 'Tire Scrap Performance',
    subtitle: 'Monitor tire scrap performance, life achievement, and scrap reasons across mining sites',
  },
  '/dummy': {
    eyebrow: 'TIRE ASSET & PERFORMANCE',
    title: 'Tire Scrap Performance',
    subtitle: 'Monitor tire scrap performance, life achievement, and scrap reasons across mining sites',
  },
}

export function MaestroSiteHeader({ session }: MaestroSiteHeaderProps) {
  const pathname = usePathname() || ''
  const isPrefixed = pathname.startsWith('/maestro')

  const resolveUrl = React.useCallback(
    (target: string) => {
      const clean = target.replace(/^\/maestro/, '')
      return isPrefixed ? `/maestro${clean}` : clean || '/'
    },
    [isPrefixed],
  )

  const cleanPath = pathname.replace(/^\/maestro/, '') || '/activity'
  const matchedRoute =
    ROUTE_INFO[cleanPath] ||
    Object.entries(ROUTE_INFO).find(([key]) => key !== '/' && cleanPath.startsWith(key))?.[1] ||
    ROUTE_INFO['/activity']

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-2xs">
      <div className="flex min-h-16 items-center justify-between px-3.5 py-2 sm:px-6 lg:px-8 xl:px-10">
        {/* Left Side: Sidebar Trigger, Separator & Page Meta */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3.5">
          <SidebarTrigger
            className="size-9 min-h-9 min-w-9 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 shadow-2xs transition-colors cursor-pointer"
          />
          <Separator orientation="vertical" className="hidden h-7 lg:block bg-slate-200" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">
                {matchedRoute.eyebrow}
              </p>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-[11px] font-bold text-slate-500 hidden sm:inline truncate max-w-[200px]">
                {session.customer.name}
              </span>
            </div>
            <p className="font-display truncate text-sm font-black tracking-tight text-slate-950 sm:text-base lg:text-lg">
              {matchedRoute.title}
            </p>
          </div>
        </div>

        {/* Right Side: Badges, Status & Quick Action */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* Customer Badge */}
          <div className="hidden md:inline-flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200/80 px-3 py-1 text-xs font-bold text-blue-950">
            <Building2 className="size-3.5 text-blue-700" />
            <span className="truncate max-w-[180px]">{session.customer.name}</span>
          </div>

          {/* Operational Pulse Indicator */}
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-xs font-extrabold text-emerald-900">
            <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>SISTEM AKTIF</span>
          </div>

          {/* Helpdesk Quick Link */}
          <Link
            href={resolveUrl('/tickets')}
            className={cn(
              'inline-flex items-center gap-1.5 h-9 rounded-xl px-3 text-xs font-bold transition-all shadow-2xs cursor-pointer',
              cleanPath.startsWith('/tickets')
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 hover:text-blue-700 hover:border-blue-300',
            )}
            title="Pusat Bantuan & Pengaduan"
          >
            <Headphones className="size-3.5 text-blue-700" />
            <span className="hidden sm:inline">Bantuan</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
