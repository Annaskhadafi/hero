import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Headphones } from 'lucide-react'

import { getMaestroServerSession } from '@/lib/maestro-session'
import { getMaestroTicketDetailAction } from '@/app/actions/helpdesk'
import { MaestroTicketChatClient } from './chat-client'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params
  return {
    title: `Tiket #${resolved.id} | MAESTRO™`,
  }
}

export default async function MaestroTicketDetailPage({ params }: PageProps) {
  const session = await getMaestroServerSession()
  if (!session) {
    redirect('/login')
  }

  const resolved = await params
  const ticketId = parseInt(resolved.id, 10)
  if (isNaN(ticketId)) {
    notFound()
  }

  const result = await getMaestroTicketDetailAction(ticketId)
  if (!result.success || !result.ticket) {
    notFound()
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden text-slate-800">
      {/* Top Header */}
      <header className="shrink-0 border-b-2 border-slate-300 bg-white shadow-xs">
        <div className="mx-auto flex h-16 w-full max-w-[1720px] items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="flex items-center gap-3">
            <Link
              href="/tickets"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-300 bg-slate-100 text-slate-700 transition hover:bg-slate-200 hover:text-slate-950 shadow-2xs"
              title="Kembali ke Daftar Tiket"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-black text-slate-950 tracking-tight">
                {result.ticket.ticketNumber}
              </span>
              <span
                className="rounded-full px-3 py-0.5 text-xs font-bold shadow-2xs border border-slate-300"
                style={{
                  backgroundColor: `${result.ticket.category.color}25`,
                  color: result.ticket.category.color,
                }}
              >
                {result.ticket.category.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-xs sm:text-sm font-black text-slate-950 truncate max-w-[200px] sm:max-w-xs">
                {result.ticket.title}
              </p>
              <p className="text-xs text-slate-600 font-bold">{result.ticket.site.name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Interactive Live Chat Stream */}
      <main className="mx-auto flex w-full max-w-[1720px] flex-1 flex-col overflow-hidden px-3 sm:px-6 lg:px-8 xl:px-12 py-4 sm:py-6">
        <MaestroTicketChatClient
          ticket={result.ticket}
          initialMessages={result.messages || []}
          customerUser={session.user}
        />
      </main>
    </div>
  )
}
