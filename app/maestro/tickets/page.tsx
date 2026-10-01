import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Headphones, Sparkles } from 'lucide-react'

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
    <div className="w-full pb-20 text-slate-800">
      {/* Page Intro Banner */}
      <div className="mx-auto w-full max-w-[1720px] px-3.5 pt-6 sm:px-6 lg:px-8 xl:px-10">
        <div className="relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 border border-blue-300 shadow-xs font-bold shrink-0">
                <Headphones className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight text-slate-950">
                    Helpdesk &amp; Problem Ticketing
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-950 border border-blue-300 px-2.5 py-0.5 text-xs font-black">
                    <Sparkles className="size-3 text-blue-700" />
                    AI-Assisted
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 font-semibold mt-0.5">
                  Sampaikan keluhan operasional, kendala teknis, dan pertanyaan ke tim Chitra Paratama.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-[1720px] px-3.5 pt-6 sm:px-6 lg:px-8 xl:px-10">
        <MaestroTicketsClient
          initialTickets={ticketsResult.data || []}
          categories={categories}
          sites={sites}
        />
      </main>
    </div>
  )
}
