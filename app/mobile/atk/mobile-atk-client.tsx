'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search,
  FileText,
  ChevronRight,
  Clock,
  CheckCircle2,
  PackageCheck,
  Building2,
  Calendar,
  Layers,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { AtkStatusBadge } from '@/components/atk/atk-status-badge'

type AtkCardRow = {
  id: number
  requestNumber: string
  requestType: string
  targetRecipientName: string
  requestDate: Date | string
  status: string
  notes: string
  employeeId: number
  employeeName: string
  employeeSn: string
  siteName: string
  departmentName?: string | null
  totalItems: number
}

const STATUS_TABS = [
  { id: 'all', label: 'Semua' },
  { id: 'pending_approval', label: 'Menunggu' },
  { id: 'approved', label: 'Disiapkan' },
  { id: 'ready_for_pickup', label: 'Siap Ambil' },
  { id: 'completed', label: 'Selesai' },
]

export function MobileAtkClient({
  requests,
  currentEmployeeId,
}: {
  requests: AtkCardRow[]
  currentEmployeeId: number
}) {
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      if (activeTab !== 'all' && r.status !== activeTab) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return (
          r.requestNumber.toLowerCase().includes(q) ||
          r.employeeName.toLowerCase().includes(q) ||
          r.targetRecipientName.toLowerCase().includes(q) ||
          (r.departmentName && r.departmentName.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [requests, activeTab, search])

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <Input
          placeholder="Cari no. pengajuan atau peruntukan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 text-xs rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
        />
      </div>

      {/* Horizontal Status Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {STATUS_TABS.map((tab) => {
          const isActive = activeTab === tab.id
          const count =
            tab.id === 'all'
              ? requests.length
              : requests.filter((r) => r.status === tab.id).length

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-colors active:scale-95 ${
                isActive
                  ? 'bg-[#003461] text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Request Cards List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center shadow-sm">
            <FileText className="size-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Tidak ada pengajuan ATK
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Gunakan tombol &quot;+ Ajukan&quot; di bagian atas untuk membuat permintaan baru.
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const formattedDate = new Date(req.requestDate).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })

            const isOwn = req.employeeId === currentEmployeeId

            return (
              <Link
                key={req.id}
                href={`/mobile/atk/${req.id}`}
                className="block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#003461] dark:text-sky-400">
                      {req.requestNumber}
                    </span>
                    {isOwn && (
                      <span className="text-[10px] bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-300 px-1.5 py-0.5 rounded font-semibold">
                        Milik Saya
                      </span>
                    )}
                  </div>
                  <AtkStatusBadge status={req.status} />
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-800 dark:text-slate-200">
                    <span className="font-bold">{req.employeeName}</span>
                    <span className="font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full text-[11px]">
                      {req.totalItems} Barang
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="size-3" />
                      {req.departmentName || req.siteName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formattedDate}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="truncate max-w-[240px]">
                      Peruntukan:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {req.requestType === 'department'
                          ? `Divisi (${req.targetRecipientName || 'Dept'})`
                          : 'Personal'}
                      </strong>
                    </span>
                    <ChevronRight className="size-4 text-slate-400 shrink-0" />
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
