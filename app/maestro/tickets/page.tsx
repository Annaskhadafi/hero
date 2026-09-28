import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Headphones, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getMaestroServerSession } from '@/lib/maestro-session'
import {
  getHelpdeskCategoriesAction,
  getMaestroCustomerSitesAction,
  getMaestroTicketsAction,
} from '@/app/actions/helpdesk'
import { MaestroTicketsClient } from './client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Helpdesk & Tiket',
  description:
    'Sampaikan keluhan operasional, kendala teknis, dan pertanyaan ke tim Chitra Paratama dengan asistensi AI interaktif.',
}

export default async function MaestroTicketsPage() {
  const session = await getMaestroServerSession()
  if (!session) {
    redirect('/login')
  }

  const [categories, sites, ticketsResult] = await Promise.all([
    getHelpdeskCategoriesAction(),
    getMaestroCustomerSitesAction(),
    getMaestroTicketsAction(),
  ])

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3.5">
            <Link
              href="/dashboard"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-2xs">
              <Headphones className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-bold tracking-tight text-slate-900">
                  Helpdesk &amp; Problem Ticketing
                </span>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                  AI-Powered
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{session.customer.name}</p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-900">{session.user.name}</span>
            <p className="text-[11px] text-slate-400">{session.user.email}</p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <MaestroTicketsClient
          initialTickets={ticketsResult.data || []}
          categories={categories}
          sites={sites}
        />
      </main>
    </div>
  )
}
