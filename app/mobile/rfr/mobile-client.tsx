'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Search,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  FileText,
  Download,
  Calendar,
  Building2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type RfrItem = {
  id: number
  rfrNumber: string
  requestDate: string
  joinDateEstimation: string
  requestorName: string
  sectionDepartment: string
  positionTitle: string
  numberOfPersons: number
  level: string
  status: string
  currentStepOrder: number
  createdAt: Date | string
}

function formatIndoDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-'
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  if (isNaN(d.getTime())) return String(dateStr)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getStatusBadge(status: string, currentStepOrder: number) {
  if (status === 'in_progress' && currentStepOrder === 1) {
    return (
      <Badge className="bg-amber-50 text-amber-800 border-amber-300 font-bold text-[10px] py-0.5 px-2 flex items-center gap-1 shadow-2xs">
        <Clock className="w-3 h-3 text-amber-600" />
        <span>Revisi (Step 1)</span>
      </Badge>
    )
  }
  switch (status) {
    case 'approved':
      return (
        <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[10px] py-0.5 px-2 flex items-center gap-1 shadow-2xs">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Disetujui</span>
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="bg-rose-50 text-rose-800 border-rose-300 font-bold text-[10px] py-0.5 px-2 flex items-center gap-1 shadow-2xs">
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>Ditolak</span>
        </Badge>
      )
    case 'in_progress':
      return (
        <Badge className="bg-sky-50 text-sky-800 border-sky-300 font-bold text-[10px] py-0.5 px-2 flex items-center gap-1 shadow-2xs">
          <Clock className="w-3 h-3 text-sky-600" />
          <span>Approval ({currentStepOrder}/6)</span>
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-[10px] py-0.5 px-2">
          Draft
        </Badge>
      )
  }
}

export function MobileRfrListClient({ initialItems }: { initialItems: RfrItem[] }) {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  const filteredItems = initialItems.filter((item) => {
    // 1. Text search
    const q = search.toLowerCase().trim()
    if (q) {
      const matchNumber = item.rfrNumber.toLowerCase().includes(q)
      const matchPos = item.positionTitle.toLowerCase().includes(q)
      const matchReq = item.requestorName.toLowerCase().includes(q)
      const matchDept = item.sectionDepartment.toLowerCase().includes(q)
      if (!matchNumber && !matchPos && !matchReq && !matchDept) return false
    }

    // 2. Status filter
    if (activeFilter === 'pending') {
      return item.status === 'in_progress'
    }
    if (activeFilter === 'approved') {
      return item.status === 'approved'
    }
    if (activeFilter === 'rejected') {
      return item.status === 'rejected' || (item.status === 'in_progress' && item.currentStepOrder === 1)
    }

    return true
  })

  return (
    <div className="space-y-3">
      {/* 1. Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nomor RFR, posisi, departemen..."
          className="h-10 pl-9 pr-3 text-xs rounded-xl bg-white border-slate-200 shadow-2xs focus:border-sky-500"
        />
      </div>

      {/* 2. Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`h-7 px-3 rounded-full text-xs font-bold shrink-0 transition-all ${
            activeFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Semua ({initialItems.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('pending')}
          className={`h-7 px-3 rounded-full text-xs font-bold shrink-0 transition-all ${
            activeFilter === 'pending'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Pending
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('approved')}
          className={`h-7 px-3 rounded-full text-xs font-bold shrink-0 transition-all ${
            activeFilter === 'approved'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Disetujui
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('rejected')}
          className={`h-7 px-3 rounded-full text-xs font-bold shrink-0 transition-all ${
            activeFilter === 'rejected'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
        >
          Revisi/Ditolak
        </button>
      </div>

      {/* 3. List of RFR Cards */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
          <FileText className="mx-auto h-9 w-9 text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-700">Tidak ada data RFR</p>
          <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci atau status filter.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-sky-300 transition-all space-y-3"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <span className="font-mono text-xs font-black text-sky-950">
                  {item.rfrNumber}
                </span>
                {getStatusBadge(item.status, item.currentStepOrder)}
              </div>

              {/* Position & Level */}
              <div>
                <h3 className="text-sm font-black text-slate-900 leading-tight">
                  {item.positionTitle}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-600 uppercase text-[10px] bg-slate-100 px-2 py-0.5 rounded">
                    {item.level?.replace('_', ' ')}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1 font-semibold text-slate-700">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    {item.numberOfPersons} Orang
                  </span>
                </div>
              </div>

              {/* Department & Requestor */}
              <div className="rounded-xl bg-slate-50 p-2.5 text-xs space-y-1 border border-slate-100">
                <div className="flex items-start gap-1.5 text-slate-600">
                  <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="truncate">{item.sectionDepartment}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Pemohon: <strong className="text-slate-800 font-semibold">{item.requestorName}</strong></span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    {formatIndoDate(item.requestDate)}
                  </span>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <a
                  href={`/api/hc/rfr/${item.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>PDF</span>
                </a>

                <Link
                  prefetch={false}
                  href={`/mobile/rfr/${item.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 py-1.5 px-3 rounded-lg active:scale-98 transition-all"
                >
                  <span>Lihat Dokumen & Alur</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
