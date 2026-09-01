'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FiveRDetailDialog } from '@/components/five-r/five-r-detail-dialog'
import { deleteFiveRReportAction } from '@/app/dashboard/quality/5r/actions'
import type { FiveRReportListItem } from '@/components/five-r/five-r-list'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

interface MobileFiveRClientProps {
  initialReports: FiveRReportListItem[]
  currentUser: {
    id: number
    name: string
    email: string
  }
}

export function MobileFiveRClient({ initialReports, currentUser }: MobileFiveRClientProps) {
  const [reports, setReports] = useState<FiveRReportListItem[]>(initialReports)
  const [search, setSearch] = useState('')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const [printingId, setPrintingId] = useState<number | null>(null)

  const handlePrintInPlace = (reportId: number) => {
    setPrintingId(reportId)
    const existing = document.getElementById('five-r-print-iframe')
    if (existing) existing.remove()

    const iframe = document.createElement('iframe')
    iframe.id = 'five-r-print-iframe'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'
    iframe.src = `/print/5r/${reportId}`

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
        } catch (err) {
          console.error('Print failed:', err)
        } finally {
          setPrintingId(null)
        }
      }, 500)
    }

    document.body.appendChild(iframe)
  }

  async function handleDelete(reportId: number) {
    if (!confirm('Apakah Anda yakin ingin menghapus draft laporan 5R ini?')) return
    const res = await deleteFiveRReportAction(reportId)
    if (res.success) {
      toast.success(res.message)
      setReports((prev) => prev.filter((r) => r.id !== reportId))
    } else {
      toast.error(res.message)
    }
  }

  const filtered = reports.filter((r) => {
    if (selectedMonth !== 'all' && r.auditPeriod !== selectedMonth) return false
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      const matchNum = r.reportNumber?.toLowerCase().includes(q)
      const matchAuditor = r.auditorName?.toLowerCase().includes(q)
      const matchPic = r.picAreaName?.toLowerCase().includes(q)
      const matchSite = r.siteName?.toLowerCase().includes(q)
      if (!matchNum && !matchAuditor && !matchPic && !matchSite) return false
    }

    return true
  })

  // KPI Calculations
  const totalAudits = reports.length
  const approvedAudits = reports.filter((r) => r.status === 'approved').length
  const pendingAudits = reports.filter((r) => r.status === 'pending_approval' || r.status === 'in_review').length
  const avgScore =
    reports.length > 0
      ? (
          reports.reduce((sum, r) => sum + (parseFloat(r.totalScore) || 0), 0) /
          reports.length
        ).toFixed(1)
      : '0.0'

  function getGrade(score: number) {
    if (score >= 90) return { grade: 'A', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    if (score >= 80) return { grade: 'B', bg: 'bg-blue-50 text-blue-700 border-blue-200' }
    if (score >= 70) return { grade: 'C', bg: 'bg-amber-50 text-amber-700 border-amber-200' }
    return { grade: 'D', bg: 'bg-rose-50 text-rose-700 border-rose-200' }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="size-3" />
            Approved
          </span>
        )
      case 'pending_approval':
      case 'in_review':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
            <Clock className="size-3" />
            Review
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
            <XCircle className="size-3" />
            Rejected
          </span>
        )
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
            Draft
          </span>
        )
    }
  }

  const exportToExcel = () => {
    const rows = filtered.map((r, i) => ({
      No: i + 1,
      'No. Laporan': r.reportNumber,
      'Area / PIC': r.picAreaName,
      Site: r.siteName || '-',
      Auditor: r.auditorName,
      Periode: r.auditPeriod,
      Tanggal: r.auditDate,
      Rapi: r.scoreRapi,
      Ringkas: r.scoreRingkas,
      Resik: r.scoreResik,
      Rawat: r.scoreRawat,
      Rajin: r.scoreRajin,
      'Skor Total': r.totalScore,
      Status: r.status,
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Audit 5R')
    XLSX.writeFile(wb, `Audit_5R_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.success('Data 5R berhasil diexport ke Excel!')
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Header Banner */}
      <section className="rounded-xl bg-gradient-to-br from-[#003461] to-[#044e85] p-5 text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-200">QUALITY &bull; AUDIT 5R</p>
            <h1 className="mt-1 text-xl font-black tracking-tight">Audit 5R</h1>
            <p className="mt-1 text-xs text-teal-100/80 leading-relaxed">
              Ringkas, Rapi, Resik, Rawat, Rajin di seluruh area operasional.
            </p>
          </div>
          <Link
            href="/mobile/quality/5r/create"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#003461] shadow-sm active:scale-95 transition-transform"
            aria-label="Input Audit 5R"
          >
            <Plus className="size-5" />
          </Link>
        </div>

        <div className="mt-4 rounded-xl bg-white/10 p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-teal-100">
                <Sparkles className="size-3" /> Continuous Improvement
              </span>
              <p className="mt-2 text-2xl font-black">{totalAudits} Laporan</p>
              <p className="text-xs text-teal-200 mt-0.5">Rata-rata Skor: <strong className="text-white font-bold">{avgScore}</strong></p>
            </div>
            <Link
              href="/mobile/quality/5r/create"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3.5 text-xs font-bold text-[#003461] active:scale-95 transition-transform"
            >
              + Audit Baru <ArrowRight className="size-3.5" />
            </Link>
          </div>

          <div className="mt-3.5 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-white/10 p-2 text-center">
              <p className="text-[10px] font-medium text-teal-200">Approved</p>
              <p className="mt-0.5 text-sm font-bold text-emerald-300">{approvedAudits}</p>
            </div>
            <div className="rounded-lg bg-white/10 p-2 text-center">
              <p className="text-[10px] font-medium text-teal-200">Review</p>
              <p className="mt-0.5 text-sm font-bold text-amber-300">{pendingAudits}</p>
            </div>
            <div className="rounded-lg bg-white/10 p-2 text-center">
              <p className="text-[10px] font-medium text-teal-200">Avg Score</p>
              <p className="mt-0.5 text-sm font-bold text-sky-300">{avgScore}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter & Search */}
      <section className="space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              placeholder="Cari area, auditor, tiket..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-white border-slate-200 text-xs shadow-xs"
            />
          </div>
          <Button
            onClick={exportToExcel}
            variant="outline"
            size="sm"
            className="h-10 rounded-xl border-slate-200 bg-white text-xs text-slate-700 px-3 shadow-xs shrink-0 active:scale-95"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600 mr-1" />
            Excel
          </Button>
        </div>

        {/* Month Selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setSelectedMonth('all')}
            className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
              selectedMonth === 'all'
                ? 'bg-[#003461] text-white border-[#003461]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua Bulan
          </button>
          {MONTHS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedMonth(m)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                selectedMonth === m
                  ? 'bg-[#003461] text-white border-[#003461]'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Status Badges */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { key: 'all', label: 'Semua Status' },
            { key: 'approved', label: 'Approved' },
            { key: 'pending_approval', label: 'In Review' },
            { key: 'draft', label: 'Draft' },
            { key: 'rejected', label: 'Rejected' },
          ].map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => setSelectedStatus(st.key)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                selectedStatus === st.key
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </section>

      {/* Cards List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Laporan Audit ({filtered.length})
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-white p-8 text-center shadow-xs">
            <FileText className="mx-auto size-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">Belum ada laporan audit 5R</p>
            <p className="text-xs text-slate-400 mt-0.5">Silakan buat audit baru atau ubah filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => {
              const numScore = parseFloat(r.totalScore) || 0
              const gradeInfo = getGrade(numScore)
              const isPrinting = printingId === r.id

              return (
                <article
                  key={r.id}
                  className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-mono text-slate-400 font-semibold">{r.reportNumber}</p>
                      <h2 className="text-sm font-bold text-slate-900 leading-tight truncate mt-0.5">
                        {r.picAreaName}
                      </h2>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {r.siteName && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {r.siteName}
                          </span>
                        )}
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700">
                          {r.auditPeriod}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <span className={`inline-flex items-center justify-center size-6 rounded-md text-xs font-black border ${gradeInfo.bg}`}>
                          {gradeInfo.grade}
                        </span>
                        <span className="text-base font-black text-slate-900 leading-none">
                          {r.totalScore}
                        </span>
                      </div>
                      <div className="mt-1.5">
                        {getStatusBadge(r.status)}
                      </div>
                    </div>
                  </div>

                  {/* 5 Pillars Quick Pill Grid */}
                  <div className="grid grid-cols-5 gap-1 rounded-lg bg-slate-50 p-2 text-center text-[10px]">
                    <div>
                      <span className="text-slate-400 font-medium block">Rapi</span>
                      <span className="font-bold text-slate-800">{r.scoreRapi}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Ringkas</span>
                      <span className="font-bold text-slate-800">{r.scoreRingkas}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Resik</span>
                      <span className="font-bold text-slate-800">{r.scoreResik}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Rawat</span>
                      <span className="font-bold text-slate-800">{r.scoreRawat}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Rajin</span>
                      <span className="font-bold text-slate-800">{r.scoreRajin}</span>
                    </div>
                  </div>

                  {/* Card Footer Info & Actions */}
                  <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-xs text-slate-500">
                    <div className="min-w-0">
                      <p className="truncate text-[11px]">
                        Auditor: <span className="font-semibold text-slate-700">{r.auditorName}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">{r.auditDate}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        onClick={() => setSelectedReportId(r.id)}
                        variant="outline"
                        size="sm"
                        className="h-8 border-slate-200 text-xs font-semibold px-2.5 text-[#003461] active:scale-95"
                      >
                        <Eye className="mr-1 size-3.5" />
                        Detail
                      </Button>

                      <Button
                        onClick={() => handlePrintInPlace(r.id)}
                        disabled={isPrinting}
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-slate-500 hover:text-slate-900 active:scale-95"
                        title="Print / PDF"
                      >
                        <Printer className="size-3.5" />
                      </Button>

                      {r.status === 'draft' && (
                        <Button
                          onClick={() => handleDelete(r.id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-rose-500 hover:text-rose-700 active:scale-95"
                          title="Hapus Draft"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Detail Dialog */}
      {selectedReportId && (
        <FiveRDetailDialog
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onActionComplete={() => {
            setSelectedReportId(null)
          }}
        />
      )}
    </div>
  )
}
