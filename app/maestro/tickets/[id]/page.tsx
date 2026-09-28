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
    <div className="flex h-screen flex-col bg-[#f8f9fa] overflow-hidden text-slate-900">
      {/* Top Header */}
      <header className="shrink-0 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/tickets"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 shadow-2xs"
              title="Kembali ke Daftar Tiket"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-slate-900">
                {result.ticket.ticketNumber}
              </span>
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: `${result.ticket.category.color}15`,
                  color: result.ticket.category.color,
                }}
              >
                {result.ticket.category.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-xs font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-xs">
                {result.ticket.title}
              </p>
              <p className="text-[10px] text-slate-400">{result.ticket.site.name}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Interactive Live Chat Stream */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col overflow-hidden px-2 sm:px-6 lg:px-8 py-4">
        <MaestroTicketChatClient
          ticket={result.ticket}
          initialMessages={result.messages || []}
          customerUser={session.user}
        />
      </main>
    </div>
  )
}
