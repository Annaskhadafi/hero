import React from 'react'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import {
  ChevronLeft,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  FileCheck,
  Building2,
  Calendar,
  Users,
  Briefcase,
  ExternalLink,
} from 'lucide-react'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getRfrDetail } from '@/app/actions/rfr'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MobileRfrDetailClient } from './mobile-detail-client'

export const revalidate = 0

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function MobileRfrDetailPage({ params }: PageProps) {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const resolvedParams = await params
  const id = parseInt(resolvedParams.id, 10)
  if (isNaN(id)) notFound()

  const detail = await getRfrDetail(id)
  if (!detail || !detail.rfr) notFound()

  const { rfr, approvals } = detail

  return (
    <div className="space-y-4 pb-12 max-w-md mx-auto">
      {/* 1. Mobile Top Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white p-3.5 rounded-2xl shadow-2xs">
        <Link
          prefetch={false}
          href="/mobile/rfr"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 py-1.5 px-2.5 rounded-xl transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Kembali</span>
        </Link>

        <span className="font-mono text-xs font-black text-sky-950 truncate">
          {rfr.rfrNumber}
        </span>

        <a
          href={`/api/hc/rfr/${rfr.id}/pdf`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 py-1.5 px-3 rounded-xl shadow-2xs transition-all"
        >
          <Download className="h-3.5 w-3.5" />
          <span>PDF</span>
        </a>
      </div>

      {/* 2. Client Detail Component */}
      <MobileRfrDetailClient rfr={rfr} approvals={approvals} />
    </div>
  )
}
