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
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="size-3" />
            Approved
          </span>
        )
      case 'pending_approval':
      case 'in_review':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200">
            <Clock className="size-3" />
            In Review
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200">
            <XCircle className="size-3" />
            Rejected
          </span>
        )
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
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
    <div className="space-y-4 pb-10">
      {/* Header Banner HERO Style */}
      <section className="rounded-2xl bg-gradient-to-br from-[#003461] to-[#044e85] p-5 text-white shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-200">
              QUALITY &bull; AUDIT 5R
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Audit 5R</h1>
            <p className="mt-1 text-xs text-blue-100/80 leading-relaxed">
              Penerapan Ringkas, Rapi, Resik, Rawat, dan Rajin.
            </p>
          </div>
          <Link
            href="/mobile/quality/5r/create"
            className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-[#003461] shadow-sm active:scale-95 transition-transform shrink-0"
          >
            <Plus className="size-4" />
            <span>Audit Baru</span>
          </Link>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3.5">
          <div className="rounded-xl bg-white/10 p-2.5 text-center">
            <p className="text-[10px] font-medium text-blue-200">Total Audit</p>
            <p className="mt-0.5 text-lg font-bold text-white leading-none">{totalAudits}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-2.5 text-center">
            <p className="text-[10px] font-medium text-blue-200">Menunggu</p>
            <p className="mt-0.5 text-lg font-bold text-amber-300 leading-none">{pendingAudits}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-2.5 text-center">
            <p className="text-[10px] font-medium text-blue-200">Rata-rata</p>
            <p className="mt-0.5 text-lg font-bold text-sky-200 leading-none">{avgScore}</p>
          </div>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="space-y-2.5">
        {/* Search Input, Month Dropdown, & Excel */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <Input
              placeholder="Cari area, auditor, nomor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-white border-slate-200 text-xs shadow-2xs"
            />
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 shadow-2xs focus:outline-none focus:border-[#003461] shrink-0"
            aria-label="Pilih Bulan Periode"
          >
            <option value="all">Semua Bulan</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <Button
            onClick={exportToExcel}
            variant="outline"
            size="sm"
            className="h-10 rounded-xl border-slate-200 bg-white text-xs text-slate-700 px-3 shadow-2xs shrink-0 active:scale-95"
            title="Export Excel"
          >
            <FileSpreadsheet className="size-4 text-emerald-600" />
          </Button>
        </div>

        {/* Status Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { key: 'all', label: 'Semua' },
            { key: 'approved', label: 'Approved' },
            { key: 'pending_approval', label: 'In Review' },
            { key: 'draft', label: 'Draft' },
            { key: 'rejected', label: 'Rejected' },
          ].map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => setSelectedStatus(st.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                selectedStatus === st.key
                  ? 'bg-[#003461] text-white border-[#003461] shadow-2xs'
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
        <div className="flex items-center justify-between px-0.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Daftar Laporan ({filtered.length})
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-2xs">
            <FileText className="mx-auto size-10 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">Belum ada laporan audit 5R</p>
            <p className="text-xs text-slate-400 mt-0.5">Silakan buat audit baru atau sesuaikan filter.</p>
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
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-3 transition-all hover:border-slate-200"
                >
                  {/* Card Header: Status, Date, & Score */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(r.status)}
                        <span className="text-[11px] font-mono font-medium text-slate-400">
                          {r.reportNumber}
                        </span>
                      </div>
                      <h2
                        onClick={() => setSelectedReportId(r.id)}
                        className="text-base font-bold text-slate-900 leading-snug cursor-pointer hover:text-[#003461] line-clamp-2"
                      >
                        {r.picAreaName}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Auditor: <span className="font-semibold text-slate-700">{r.auditorName}</span>
                        {r.siteName && (
                          <span> &bull; {r.siteName}</span>
                        )}
                      </p>
                    </div>

                    {/* Prominent Score Chip */}
                    <div
                      onClick={() => setSelectedReportId(r.id)}
                      className="text-right shrink-0 cursor-pointer rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-center min-w-[64px]"
                    >
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black border ${gradeInfo.bg}`}>
                        Grade {gradeInfo.grade}
                      </span>
                      <p className="text-lg font-black text-slate-900 leading-none mt-1">
                        {r.totalScore}
                      </p>
                      <span className="text-[9px] text-slate-400 font-medium">Skor 5R</span>
                    </div>
                  </div>

                  {/* Card Footer: Period and Action Buttons */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                    <div className="text-[11px] text-slate-400 font-medium">
                      {r.auditDate} &bull; <span className="text-slate-600">{r.auditPeriod}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => setSelectedReportId(r.id)}
                        variant="outline"
                        size="sm"
                        className="h-8 border-slate-200 text-xs font-semibold px-3 text-[#003461] rounded-xl active:scale-95 shadow-2xs"
                      >
                        <Eye className="mr-1.5 size-3.5" />
                        Dokumen
                      </Button>

                      <Button
                        onClick={() => handlePrintInPlace(r.id)}
                        disabled={isPrinting}
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-slate-600 hover:text-slate-900 rounded-xl active:scale-95"
                        title="Cetak PDF"
                      >
                        <Printer className="size-3.5" />
                      </Button>

                      {r.status === 'draft' && (
                        <Button
                          onClick={() => handleDelete(r.id)}
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-rose-500 hover:text-rose-700 rounded-xl active:scale-95"
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
