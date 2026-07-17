'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Camera, ChevronDown, Clock3, FileCheck2, Search } from 'lucide-react'

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
  if (['approved', 'closed'].includes(status)) return 'border-0 bg-emerald-100 text-emerald-900'
  if (['rejected', 'returned'].includes(status)) return 'border-0 bg-rose-100 text-rose-900'
  return 'border-0 bg-amber-100 text-amber-900'
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
    <div className="space-y-3">
      <div className="sticky top-0 z-10 space-y-2 rounded-2xl bg-[#f5f9fc]/95 p-2 backdrop-blur">
        <label className="relative block">
          <Search className="absolute top-3.5 left-3 size-4 text-[#486275]" aria-hidden="true" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nomor SPL atau nama"
            className="h-12 rounded-2xl border-0 bg-white pl-10"
          />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter status SPL"
          className="h-12 w-full rounded-2xl border-0 bg-white px-4 text-sm font-semibold text-[#082033]"
        >
          <option value="all">Semua status</option>
          {['draft', 'submitted', 'approved', 'returned', 'rejected', 'closed'].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      {filtered.slice(0, visible).map((row) => (
        <details
          key={row.id}
          className="group overflow-hidden rounded-[1.25rem] bg-white shadow-[0_14px_32px_rgba(8,32,51,0.08)]"
        >
          <summary className="flex min-h-12 cursor-pointer list-none items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black tracking-[0.14em] text-[#486275] uppercase">
                {row.splNumber}
              </p>
              <p className="mt-1 truncate text-base font-black text-[#082033]">{row.title}</p>
              <p className="mt-1 text-xs font-semibold text-[#486275]">
                {new Date(row.workDate).toLocaleDateString('id-ID')} · {row.workerNames.join(', ')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={badgeClass(row.status)}>{row.status}</Badge>
              <ChevronDown className="size-4 text-[#486275] transition group-open:rotate-180" />
            </div>
          </summary>
          <div className="space-y-3 border-t border-[#e6f0f7] bg-[#f6fbff] p-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white p-3">
                <p className="text-[9px] font-black text-[#486275] uppercase">Jenis</p>
                <p className="mt-1 text-xs font-bold text-[#082033]">
                  {row.origin === 'employee_request' ? 'Pengajuan' : 'Perintah'}
                </p>
              </div>
              <div className="rounded-xl bg-white p-3">
                <p className="text-[9px] font-black text-[#486275] uppercase">Evidence</p>
                <p className="mt-1 text-xs font-bold text-[#082033]">{row.progressPercent}%</p>
              </div>
            </div>
            <ol className="space-y-2 text-xs font-semibold text-[#486275]">
              <li className="flex items-center gap-2">
                <Clock3 className="size-4" /> Dibuat →{' '}
                {row.status === 'draft' ? 'menunggu submit' : 'submitted'}
              </li>
              <li className="flex items-center gap-2">
                <FileCheck2 className="size-4" /> Status saat ini: {row.status}
              </li>
              {row.status === 'submitted' ? (
                <li className="flex items-center gap-2">
                  <FileCheck2 className="size-4" /> Pending approval:{' '}
                  {row.pendingApproverName ?? 'Menunggu penentuan approver'}
                </li>
              ) : null}
            </ol>
            <div className="grid grid-cols-2 gap-2">
              {['submitted', 'approved'].includes(row.status) ? (
                <Button asChild className="h-12 rounded-2xl">
                  <Link href="/mobile/activity/input">
                    <Camera className="size-4" /> Update di Daily Activity
                  </Link>
                </Button>
              ) : null}
              {['approved', 'closed'].includes(row.status) ? (
                <Button asChild variant="outline" className="h-12 rounded-2xl">
                  <Link href={`/mobile/overtime?tab=apply&extend=${row.id}`}>Ajukan Extend</Link>
                </Button>
              ) : null}
            </div>
          </div>
        </details>
      ))}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-center text-sm font-semibold text-[#486275]">
          Belum ada SPL pada filter ini.
        </div>
      ) : null}
      {visible < filtered.length ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setVisible((value) => value + 8)}
          className="h-12 w-full rounded-2xl"
        >
          Muat lebih banyak
        </Button>
      ) : null}
    </div>
  )
}
