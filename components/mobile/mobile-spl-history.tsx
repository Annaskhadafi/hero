'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileCheck2,
  PlusCircle,
  RotateCcw,
  Search,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export type MobileSplHistoryRow = {
  id: number
  splNumber: string
  title: string
  workDate: string
  status: string
  origin: string
  pendingApproverName: string | null
  workerNames: string[]
  progressPercent: number
  lineCount: number
}

function badgeClass(status: string) {
  if (['approved', 'closed'].includes(status)) return 'border-0 bg-emerald-100 text-emerald-900 font-bold'
  if (['rejected', 'returned'].includes(status)) return 'border-0 bg-rose-100 text-rose-900 font-bold'
  return 'border-0 bg-amber-100 text-amber-900 font-bold'
}

function statusLabel(row: MobileSplHistoryRow) {
  if (row.status === 'submitted') {
    return row.progressPercent > 0 ? 'Sedang Berjalan (Submitted)' : 'Menunggu Approval'
  }
  if (row.status === 'approved') return 'Approved (Aktif)'
  if (row.status === 'returned') return 'Dikembalikan (Revisi)'
  if (row.status === 'rejected') return 'Ditolak'
  if (row.status === 'closed') return 'Selesai (Closed)'
  if (row.status === 'draft') return 'Draft'
  return row.status
}

export function MobileSplHistory({
  rows,
  activeOnly = false,
}: {
  rows: MobileSplHistoryRow[]
  activeOnly?: boolean
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [visible, setVisible] = useState(8)

  const stats = useMemo(() => {
    const total = rows.length
    const approved = rows.filter((r) => ['approved', 'closed'].includes(r.status)).length
    const pending = rows.filter((r) => ['submitted', 'returned', 'reverted'].includes(r.status)).length
    const rejected = rows.filter((r) => r.status === 'rejected').length
    return { total, approved, pending, rejected }
  }, [rows])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (activeOnly && !['approved', 'submitted'].includes(row.status)) return false
      if (status !== 'all' && row.status !== status) return false
      return (
        !needle ||
        `${row.splNumber} ${row.title} ${row.workerNames.join(' ')}`.toLowerCase().includes(needle)
      )
    })
  }, [activeOnly, query, rows, status])

  return (
    <div className="space-y-4">
      {/* ── Mode Riwayat: Ringkasan Metrik ── */}
      {!activeOnly && (
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
      )}

      {/* ── Toolbar Search & Filter ── */}
      <div className="space-y-2 rounded-2xl bg-white p-3 shadow-[0_12px_30px_rgba(8,32,51,0.06)] border border-slate-100">
        <label className="relative block">
          <Search className="absolute top-3.5 left-3 size-4 text-[#486275]" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={activeOnly ? "Cari nomor SPL aktif atau nama peserta..." : "Cari nomor SPL atau nama..."}
            className="h-11 rounded-xl border-slate-200 bg-slate-50/60 pl-10 text-xs"
          />
        </label>
        {!activeOnly && (
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter status SPL"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-bold text-[#082033]"
          >
            <option value="all">Semua Status ({rows.length})</option>
            <option value="submitted">Menunggu Approval</option>
            <option value="approved">Disetujui (Approved)</option>
            <option value="returned">Dikembalikan (Revisi)</option>
            <option value="rejected">Ditolak (Rejected)</option>
            <option value="closed">Selesai (Closed)</option>
            <option value="draft">Draft</option>
          </select>
        )}
      </div>

      {/* ── Active SPL Live Notice ── */}
      {activeOnly && filtered.length > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-blue-50/80 px-3.5 py-2.5 text-xs text-blue-900 border border-blue-200/60">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex size-2.5 rounded-full bg-blue-600"></span>
            </span>
            <span className="font-bold">{filtered.length} SPL Aktif Berjalan</span>
          </div>
          <span className="text-[11px] text-blue-700 font-medium">Update evidence di Daily Activity</span>
        </div>
      )}

      {/* ── List Cards ── */}
      {filtered.slice(0, visible).map((row) => (
        <details
          key={row.id}
          className="group overflow-hidden rounded-[1.25rem] bg-white shadow-[0_14px_32px_rgba(8,32,51,0.08)] border border-slate-100/80"
        >
          <summary className="flex min-h-12 cursor-pointer list-none items-start justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-[0.14em] text-[#486275] uppercase">
                  {row.splNumber}
                </span>
                <Badge className={`text-[10px] px-2 py-0.5 ${badgeClass(row.status)}`}>
                  {statusLabel(row)}
                </Badge>
              </div>
              <p className="mt-1 truncate text-base font-black text-[#082033]">{row.title}</p>
              <p className="mt-1 text-xs font-semibold text-[#486275]">
                {new Date(row.workDate).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600">
                <Users className="size-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{row.workerNames.join(', ')}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <ChevronDown className="size-4 text-[#486275] transition group-open:rotate-180" />
              {row.progressPercent > 0 && (
                <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200">
                  {row.progressPercent}% Evidence
                </span>
              )}
            </div>
          </summary>
          <div className="space-y-3 border-t border-[#e6f0f7] bg-[#f6fbff] p-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
                <p className="text-[9px] font-black text-[#486275] uppercase">Jenis Pengajuan</p>
                <p className="mt-1 text-xs font-bold text-[#082033]">
                  {row.origin === 'employee_request' ? 'Pengajuan Karyawan' : 'Perintah Kerja Lembur'}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3 border border-slate-100 shadow-2xs">
                <p className="text-[9px] font-black text-[#486275] uppercase">Progress Evidence</p>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${row.progressPercent}%` }} />
                  </div>
                  <span className="text-xs font-bold text-[#082033]">{row.progressPercent}%</span>
                </div>
              </div>
            </div>

            <ol className="space-y-2 text-xs font-semibold text-[#486275]">
              <li className="flex items-center gap-2">
                <Clock3 className="size-4 text-slate-400 shrink-0" /> Status: {statusLabel(row)}
              </li>
              {row.status === 'submitted' ? (
                <li className="flex items-center gap-2 text-amber-700 font-bold">
                  <FileCheck2 className="size-4 shrink-0" /> Menunggu Approval:{' '}
                  {row.pendingApproverName ?? 'Menunggu penentuan approver'}
                </li>
              ) : null}
            </ol>

            <div className="grid grid-cols-2 gap-2 pt-1">
              {['returned', 'reverted', 'rejected', 'draft'].includes(row.status) ? (
                <Button asChild className="h-12 col-span-2 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs">
                  <Link href={`/mobile/overtime?tab=apply&edit=${row.id}`}>
                    <RotateCcw className="size-4 mr-1.5" /> Revisi & Ajukan Ulang SPL
                  </Link>
                </Button>
              ) : null}
              {['submitted', 'approved'].includes(row.status) ? (
                <Button asChild className="h-12 rounded-2xl bg-[#003461] hover:bg-[#00274a] text-white font-bold text-xs">
                  <Link href="/mobile/activity/input">
                    <Camera className="size-4 mr-1.5" /> Isi Evidence Activity
                  </Link>
                </Button>
              ) : null}
              {['approved', 'closed'].includes(row.status) ? (
                <Button asChild variant="outline" className="h-12 rounded-2xl border-slate-300 font-bold text-xs">
                  <Link href={`/mobile/overtime?tab=apply&extend=${row.id}`}>
                    <PlusCircle className="size-4 mr-1.5" /> Ajukan Extend
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </details>
      ))}

      {/* ── Empty State ── */}
      {filtered.length === 0 ? (
        activeOnly ? (
          <div className="rounded-[1.25rem] border border-slate-100 bg-white p-7 text-center shadow-sm space-y-3">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Clock3 className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">Belum Ada SPL Aktif</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 max-w-xs mx-auto">
                Saat ini tidak ada surat lembur yang sedang aktif atau menunggu tindakan. Anda dapat membuat pengajuan lembur baru.
              </p>
            </div>
            <Button asChild className="h-11 rounded-xl bg-[#003461] hover:bg-[#00274a] text-white font-bold text-xs px-5 shadow-xs">
              <Link href="/mobile/overtime?tab=apply">
                <PlusCircle className="size-4 mr-1.5" /> Ajukan Lembur Baru
              </Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-[1.25rem] border border-slate-100 bg-white p-6 text-center text-sm font-semibold text-[#486275] shadow-xs">
            Belum ada SPL pada filter ini.
          </div>
        )
      ) : null}

      {visible < filtered.length ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setVisible((value) => value + 8)}
          className="h-12 w-full rounded-2xl font-bold text-xs"
        >
          Muat lebih banyak ({filtered.length - visible} tersisa)
        </Button>
      ) : null}
    </div>
  )
}

