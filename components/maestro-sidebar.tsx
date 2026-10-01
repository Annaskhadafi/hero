'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  Building2,
  ChevronRight,
  Headphones,
  LogOut,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
  User,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { logoutMaestroAction } from '@/app/maestro/login/actions'
import { type MaestroSessionData } from '@/lib/maestro-session'
import { cn } from '@/lib/utils'

interface MaestroSidebarProps extends React.ComponentProps<typeof Sidebar> {
  session: MaestroSessionData
}

export function MaestroSidebar({ session, ...props }: MaestroSidebarProps) {
  const pathname = usePathname() || ''
  const { state, setOpen } = useSidebar()
  const wasHoverExpanded = React.useRef(false)

  const handleMouseEnter = React.useCallback(() => {
    if (state === 'collapsed') {
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
      if (cleanTarget === '/') return cleanCurrent === '/'
      return cleanCurrent === cleanTarget || cleanCurrent.startsWith(`${cleanTarget}/`)
    },
    [pathname],
  )

  const navigationGroups = [
    {
      label: 'OPERASIONAL',
      items: [
        {
          title: 'Daily Activity',
          url: '/activity',
          icon: Activity,
          badge: 'Live Shift',
          description: 'Aktivitas Teknisi & Log Kerja',
        },
        {
          title: 'Safety & PTW',
          url: '/safety',
          icon: ShieldCheck,
          badge: 'HSE 100%',
          description: 'Izin Kerja & Kepatuhan K3',
        },
      ],
    },
    {
      label: 'SUPPLY CHAIN & LOGISTIK',
      items: [
        {
          title: 'PO & Cargo Tracking',
          url: '/tracking',
          icon: Truck,
          badge: 'Manifest',
          description: 'Pelacakan Surat Jalan & DO',
        },
        {
          title: 'Orders & PO',
          url: '/orders',
          icon: PackageCheck,
          badge: 'Katalog',
          description: 'Manajemen Pesanan Ban',
        },
      ],
    },
    {
      label: 'LAYANAN & BANTUAN',
      items: [
        {
          title: 'Pusat Bantuan & Tiket',
          url: '/tickets',
          icon: Headphones,
          badge: 'AI Helpdesk',
          description: 'Pengaduan & Tiket Support',
        },
      ],
    },
  ]

  const userInitials = React.useMemo(() => {
    if (session.user.name?.trim()) {
      return session.user.name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    }
    return (session.user.email?.[0] || 'M').toUpperCase()
  }, [session.user.name, session.user.email])

  return (
    <Sidebar
      {...props}
      collapsible="icon"
      suppressHydrationWarning
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="border-r border-slate-200/80 bg-white"
    >
      {/* ── Sidebar Header: Brand Logo & Customer Badge ── */}
      <SidebarHeader className="px-3 pb-3 pt-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
        <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/70 p-3 shadow-2xs group-data-[collapsible=icon]:p-2 transition-all">
          <Link
            href={resolveUrl('/activity')}
            aria-label="MAESTRO Portal"
            className="flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 font-display font-black text-lg text-white shadow-xs">
              M
            </div>
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-base font-black tracking-tight text-slate-950">
                  MAESTRO<span className="text-blue-700">™</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-900 border border-blue-300">
                  <Sparkles className="size-2.5 text-blue-700" />
                  Live
                </span>
              </div>
              <p className="truncate text-xs font-bold text-slate-600">
                {session.customer.name}
              </p>
            </div>
          </Link>
        </div>
      </SidebarHeader>

      {/* ── Sidebar Content: Navigation Groups ── */}
      <SidebarContent className="gap-2 px-2.5">
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            <SidebarGroupLabel className="px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-500 group-data-[collapsible=icon]:hidden">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  const active = isItemActive(item.url)
                  const IconComponent = item.icon
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.title}
                        className={cn(
                          'h-11 rounded-xl px-3 text-xs font-bold transition-all duration-150 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center',
                          active
                            ? 'bg-blue-700 text-white shadow-sm hover:bg-blue-800 hover:text-white'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950',
                        )}
                      >
                        <Link href={resolveUrl(item.url)} className="flex items-center gap-3">
                          <IconComponent
                            className={cn(
                              'size-4.5 shrink-0 transition-transform duration-150',
                              active ? 'text-white' : 'text-slate-600',
                            )}
                          />
                          <span className="truncate group-data-[collapsible=icon]:hidden">
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* ── Sidebar Footer: User Profile & Logout ── */}
      <SidebarFooter className="p-3 border-t border-slate-200/80 group-data-[collapsible=icon]:p-2">
        <SidebarMenu className="group-data-[collapsible=icon]:items-center">
          <SidebarMenuItem className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 hover:bg-slate-100 hover:text-slate-950 group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1 cursor-pointer"
                >
                  <Avatar className="h-8 w-8 rounded-lg border border-slate-300 bg-white">
                    <AvatarImage src={session.user.image || undefined} alt={session.user.name} />
                    <AvatarFallback className="rounded-lg bg-blue-100 text-blue-800 font-extrabold text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-xs leading-tight group-data-[collapsible=icon]:hidden min-w-0">
                    <span className="truncate font-black text-slate-950">
                      {session.user.name}
                    </span>
                    <span className="truncate text-[11px] font-semibold text-slate-600">
                      {session.user.email}
                    </span>
                  </div>
                  <ChevronRight className="ml-auto size-4 text-slate-500 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-64 rounded-2xl p-2 border-2 border-slate-200 shadow-lg bg-white"
                side="top"
                align="start"
                sideOffset={8}
              >
                <DropdownMenuLabel className="p-2 font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-xs font-black text-slate-950">{session.user.name}</p>
                    <p className="text-[11px] font-semibold text-slate-600 truncate">
                      {session.user.email}
                    </p>
                    <div className="mt-1 flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-200 px-2 py-1 text-[11px] font-bold text-blue-950">
                      <Building2 className="size-3 text-blue-700" />
                      <span className="truncate">{session.customer.name}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 bg-slate-200" />
                <form action={logoutMaestroAction}>
                  <DropdownMenuItem asChild>
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 hover:text-rose-800 cursor-pointer transition-colors"
                    >
                      <LogOut className="size-4" />
                      <span>Keluar dari Portal</span>
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
