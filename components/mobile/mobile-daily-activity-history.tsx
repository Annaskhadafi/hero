'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ChevronDown,
  Clock3,
  FileCheck2,
  FileText,
  RotateCcw,
  Search,
  User,
  Wrench,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type MobileDarHistoryItem = {
  id: number
  sessionId?: number
  sessionCode?: string
  activityCode?: string | null
  activityType?: string | null
  title: string
  label?: string
  unitNumber?: string | null
  workDate?: string | Date
  shiftCode?: string
  status: string
  statusLabel: string
  pointsNet: number
  durationLabel: string
  itemCount?: number
  employeeName?: string | null
  isAuthor?: boolean
  isApprover?: boolean
  isTeamMember?: boolean
  items?: Array<{
    id: number
    snapshotLabel: string | null
    unitNumber: string | null
    remark: string | null
    actualPoints: number | null
    startedAt: Date | string | null
    endedAt: Date | string | null
  }>
  pendingApproverName?: string | null
  approvals?: Array<{
    id: number
    stepOrder: number
    stepLabel: string
    status: string
    approverName?: string | null
    signedAt?: Date | string | null
  }>
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return String(d)
  return date.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function badgeClass(status: string) {
  const normalized = (status || '').toLowerCase()
  if (['approved', 'completed', 'closed'].includes(normalized)) {
    return 'border-0 bg-emerald-100 text-emerald-900 font-bold'
  }
  if (['rejected', 'returned', 'reverted'].includes(normalized)) {
    return 'border-0 bg-rose-100 text-rose-900 font-bold'
  }
  return 'border-0 bg-amber-100 text-amber-900 font-bold'
}

function statusLabel(status: string) {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'submitted' || normalized === 'pending' || normalized === 'pending approval') {
    return 'Menunggu Approval'
  }
  if (normalized === 'approved' || normalized === 'completed') {
    return 'Approved (Aktif)'
  }
  if (normalized === 'returned' || normalized === 'reverted' || normalized === 'needs_revision') {
    return 'Dikembalikan (Revisi)'
  }
  if (normalized === 'rejected') {
    return 'Ditolak'
  }
  if (normalized === 'draft') {
    return 'Draft'
  }
  return status
}

export function MobileDailyActivityHistory({
  activities,
  onOpenReview,
}: {
  activities: MobileDarHistoryItem[]
  onOpenReview?: (sessionId: number) => void
}) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [visible, setVisible] = useState(8)

  const stats = useMemo(() => {
    const total = activities.length
    const approved = activities.filter((a) =>
      ['approved', 'completed', 'closed'].includes((a.status || '').toLowerCase())
    ).length
    const pending = activities.filter((a) =>
      ['submitted', 'pending', 'pending approval', 'returned', 'reverted', 'needs_revision'].includes(
        (a.status || '').toLowerCase()
      )
    ).length
    const rejected = activities.filter(
      (a) => (a.status || '').toLowerCase() === 'rejected'
    ).length
    return { total, approved, pending, rejected }
  }, [activities])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return activities.filter((item) => {
      const st = (item.status || '').toLowerCase()
      if (statusFilter !== 'all') {
        if (statusFilter === 'submitted' && !['submitted', 'pending', 'pending approval'].includes(st)) return false
        if (statusFilter === 'approved' && !['approved', 'completed', 'closed'].includes(st)) return false
        if (statusFilter === 'returned' && !['returned', 'reverted', 'needs_revision'].includes(st)) return false
        if (statusFilter === 'rejected' && st !== 'rejected') return false
        if (statusFilter === 'draft' && st !== 'draft') return false
      }

      if (!needle) return true

      const haystack = `${item.sessionCode ?? ''} ${item.activityCode ?? ''} ${item.title} ${item.unitNumber ?? ''} ${
        item.items?.map((i) => i.snapshotLabel ?? '').join(' ') ?? ''
      }`.toLowerCase()

      return haystack.includes(needle)
    })
  }, [activities, query, statusFilter])

  return (
    <div className="space-y-4">
      {/* ── Ringkasan Metrik (Persis SPL Mobile) ── */}
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-3 text-center shadow-xs">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Total</p>
          <p className="mt-1 text-base font-extrabold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 text-center shadow-xs">
          <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Disetujui</p>
          <p className="mt-1 text-base font-extrabold text-emerald-800">{stats.approved}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3 text-center shadow-xs">
          <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600">Pending</p>
          <p className="mt-1 text-base font-extrabold text-amber-800">{stats.pending}</p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-3 text-center shadow-xs">
          <p className="text-[9px] font-bold uppercase tracking-wider text-rose-600">Ditolak</p>
          <p className="mt-1 text-base font-extrabold text-rose-800">{stats.rejected}</p>
        </div>
      </div>

      {/* ── Toolbar Search & Filter ── */}
      <div className="space-y-2 rounded-2xl bg-white p-3 shadow-[0_12px_30px_rgba(8,32,51,0.06)] border border-slate-100">
        <label className="relative block">
          <Search className="absolute top-3.5 left-3 size-4 text-[#486275]" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nomor DAR, aktivitas, atau unit..."
            className="h-11 rounded-xl border-slate-200 bg-slate-50/60 pl-10 text-xs"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter status DAR"
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-bold text-[#082033]"
        >
          <option value="all">Semua Status ({activities.length})</option>
          <option value="submitted">Menunggu Approval</option>
          <option value="approved">Disetujui (Approved)</option>
          <option value="returned">Dikembalikan (Revisi)</option>
          <option value="rejected">Ditolak (Rejected)</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* ── List Cards (Format Persis SPL) ── */}
      {filtered.slice(0, visible).map((activity) => {
        const sessionId = activity.sessionId || activity.id
        const sessionCode = activity.sessionCode || activity.activityCode || `DAS-${activity.id}`
        const st = (activity.status || '').toLowerCase()
        const isRevisable = ['returned', 'reverted', 'needs_revision', 'draft'].includes(st)

        return (
          <details
            key={activity.id}
            className="group overflow-hidden rounded-[1.25rem] bg-white shadow-[0_14px_32px_rgba(8,32,51,0.08)] border border-slate-100/80"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-black tracking-[0.14em] text-[#486275] uppercase">
                    {sessionCode}
                  </span>
                  <Badge className={`text-[10px] px-2 py-0.5 ${badgeClass(activity.status)}`}>
                    {statusLabel(activity.status)}
                  </Badge>
                  {activity.isApprover ? (
                    <Badge className="border-0 bg-blue-100 text-blue-900 text-[9px] font-bold px-1.5 py-0.5">
                      Penandatangan
                    </Badge>
                  ) : activity.isTeamMember ? (
                    <Badge className="border-0 bg-purple-100 text-purple-900 text-[9px] font-bold px-1.5 py-0.5">
                      Anggota Tim
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-base font-black text-[#082033]">
                  {activity.title}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#486275]">
                  {fmtDate(activity.workDate)} • Shift {activity.shiftCode || '1'}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1 font-semibold text-slate-700">
                    <User className="size-3.5 text-slate-400 shrink-0" />
                    <span>{activity.employeeName || 'Staff'}</span>
                  </div>
                  <span>•</span>
                  <span>{activity.itemCount ?? activity.items?.length ?? 1} Item Pekerjaan</span>
                  <span>•</span>
                  <span className="font-bold text-emerald-700">+{activity.pointsNet ?? 0} Poin</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <ChevronDown className="size-4 text-[#486275] transition group-open:rotate-180" />
              </div>
            </summary>

            <div className="space-y-3 border-t border-[#e6f0f7] bg-[#f6fbff] p-4">
              <ol className="space-y-2 text-xs font-semibold text-[#486275]">
                <li className="flex items-center gap-2">
                  <Clock3 className="size-4 text-slate-400 shrink-0" /> Status: {statusLabel(activity.status)}
                </li>
                {['submitted', 'pending', 'pending approval'].includes(st) ? (
                  <li className="flex items-center gap-2 text-amber-700 font-bold">
                    <FileCheck2 className="size-4 shrink-0" /> Menunggu Approval:{' '}
                    {activity.pendingApproverName ?? 'Leader / Section Head'}
                  </li>
                ) : null}
              </ol>

              {/* Rincian Item Pekerjaan */}
              {activity.items && activity.items.length > 0 && (
                <div className="rounded-xl bg-white p-3 border border-slate-200/80 space-y-2 text-xs">
                  <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                    Rincian Aktivitas ({activity.items.length} Item)
                  </p>
                  <div className="space-y-1.5 divide-y divide-slate-100">
                    {activity.items.map((it, idx) => (
                      <div key={it.id || idx} className="pt-1.5 first:pt-0 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 leading-tight">
                            {it.snapshotLabel || 'Pekerjaan Harian'}
                          </p>
                          {it.unitNumber && (
                            <p className="text-[11px] text-slate-500">Unit: {it.unitNumber}</p>
                          )}
                          {it.remark && (
                            <p className="text-[10px] text-slate-400 italic truncate">{it.remark}</p>
                          )}
                        </div>
                        <span className="shrink-0 font-bold text-emerald-700 text-xs">
                          +{it.actualPoints ?? 5} Poin
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tombol Aksi (Persis SPL Mobile) */}
              <div className="pt-1">
                {isRevisable ? (
                  <div className="space-y-2">
                    <Button
                      asChild
                      className="w-full h-12 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
                    >
                      <Link href={`/mobile/activity?tab=apply&edit=${sessionId}`}>
                        <RotateCcw className="size-4 mr-1.5" /> Revisi &amp; Ajukan Ulang DAR
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenReview?.(sessionId)}
                      className="w-full h-11 rounded-2xl border-slate-300 font-bold text-xs bg-white text-slate-700 shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <FileText className="size-4" />
                      <span>Lihat &amp; Unduh Dokumen PDF</span>
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={() => onOpenReview?.(sessionId)}
                    className="w-full h-12 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FileText className="size-4" />
                    <span>LIHAT &amp; UNDUH DOKUMEN PDF</span>
                  </Button>
                )}
              </div>
            </div>
          </details>
        )
      })}

      {/* ── Empty State ── */}
      {filtered.length === 0 && (
        <div className="rounded-[1.25rem] border border-slate-100 bg-white p-7 text-center shadow-sm space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Clock3 className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800">Belum Ada Riwayat DAR</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 max-w-xs mx-auto">
              Seluruh laporan Daily Activity (DAR) yang pernah Anda ajukan akan tercatat secara rapi di sini.
            </p>
          </div>
        </div>
      )}

      {/* ── Pagination / Load More ── */}
      {filtered.length > visible && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setVisible((prev) => prev + 8)}
          className="w-full h-11 rounded-2xl border-slate-200 bg-white font-bold text-xs text-slate-700 hover:bg-slate-50"
        >
          Tampilkan Lebih Banyak ({filtered.length - visible} tersisa)
        </Button>
      )}
    </div>
  )
}
