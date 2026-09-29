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
    <div className="min-h-screen pb-24 text-slate-800">
      {/* Top Header: Antigravity Floating Bar */}
      <header className="sticky top-0 z-40 border-b-2 border-slate-300 bg-white shadow-xs">
        <div className="mx-auto flex h-20 w-full max-w-[1720px] items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-300 bg-slate-100 text-slate-700 transition-all hover:bg-slate-200 hover:text-slate-950 shadow-2xs"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="h-5 w-5 text-slate-700" />
            </Link>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 border border-blue-300 shadow-xs font-bold">
              <Headphones className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-display text-lg sm:text-xl font-black tracking-tight text-slate-950">
                  Helpdesk &amp; Problem Ticketing
                </span>
                <span className="rounded-full bg-blue-100 border border-blue-300 px-3 py-0.5 text-xs font-bold text-blue-950">
                  AI-Powered
                </span>
              </div>
              <p className="text-xs font-bold text-slate-700">{session.customer.name}</p>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-sm font-black text-slate-950">{session.user.name}</span>
            <p className="text-xs font-bold text-slate-600">{session.user.email}</p>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-[1720px] px-4 pt-8 sm:px-6 lg:px-8 xl:px-12">
        <MaestroTicketsClient
          initialTickets={ticketsResult.data || []}
          categories={categories}
          sites={sites}
        />
      </main>
    </div>
  )
}
