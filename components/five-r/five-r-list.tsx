'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
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
  XCircle,
} from 'lucide-react'
import * as XLSX from 'xlsx'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FiveRDetailDialog } from './five-r-detail-dialog'

export type FiveRReportListItem = {
  id: number
  reportNumber: string
  masterAreaId: number | null
  picAreaName: string
  siteId: number | null
  siteName: string | null
  auditorId: number | null
  auditorName: string
  auditorEmail: string
  auditPeriod: string
  auditDate: string
  reportType: string
  scoreRapi: number
  scoreRingkas: number
  scoreResik: number
  scoreRawat: number
  scoreRajin: number
  totalScore: string
  status: string
  currentApprovalLevel: number
  createdAt: Date | null
}

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

export function FiveRList({
  initialReports,
  currentUser,
}: {
  initialReports: FiveRReportListItem[]
  currentUser: { id: number; name: string; email: string }
}) {
  const [reports, setReports] = useState<FiveRReportListItem[]>(initialReports)
  const [search, setSearch] = useState('')
  const [selectedPeriod, setSelectedPeriod] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const [printingId, setPrintingId] = useState<number | null>(null)

  const handlePrintInPlace = (id: number) => {
    setPrintingId(id)
    const existing = document.getElementById('five-r-print-iframe')
    if (existing) {
      existing.remove()
    }

    const iframe = document.createElement('iframe')
    iframe.id = 'five-r-print-iframe'
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'
    iframe.src = `/print/five-r/${id}`

    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
        } catch (err) {
          console.error('Failed to print iframe:', err)
        } finally {
          setPrintingId(null)
        }
      }, 500)
    }

    document.body.appendChild(iframe)
  }

  // Filtered reports
  const filtered = reports.filter((r) => {
    if (selectedPeriod !== 'all' && r.auditPeriod !== selectedPeriod) return false
    if (selectedType !== 'all' && r.reportType !== selectedType) return false
    if (selectedStatus !== 'all' && r.status !== selectedStatus) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const match =
        r.reportNumber.toLowerCase().includes(q) ||
        r.picAreaName.toLowerCase().includes(q) ||
        r.auditorName.toLowerCase().includes(q) ||
        (r.siteName ?? '').toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  // KPI Calculations
  const totalReports = reports.length
  const pendingCount = reports.filter((r) => r.status === 'pending_approval').length
  const approvedCount = reports.filter((r) => r.status === 'approved').length
  const avgScore =
    reports.length > 0
      ? (
          reports.reduce((acc, r) => acc + Number(r.totalScore || 0), 0) / reports.length
        ).toFixed(1)
      : '0.0'

  function exportToExcel() {
    const exportData = filtered.map((r, idx) => ({
      No: idx + 1,
      'No. Laporan': r.reportNumber,
      Periode: r.auditPeriod,
      Tanggal: r.auditDate,
      'PIC / Area 5R': r.picAreaName,
      Site: r.siteName ?? 'Global',
      Auditor: r.auditorName,
      'Tipe Report':
        r.reportType === 'ada_temuan'
          ? 'Ada Temuan'
          : r.reportType === 'after_temuan_sebelumnya'
          ? 'After'
          : 'Tidak Ada Temuan',
      'Skor Rapi': r.scoreRapi,
      'Skor Ringkas': r.scoreRingkas,
      'Skor Resik': r.scoreResik,
      'Skor Rawat': r.scoreRawat,
      'Skor Rajin': r.scoreRajin,
      'Nilai Audit': r.totalScore,
      Status: r.status,
      'Level Approval': `Level ${r.currentApprovalLevel}`,
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan 5R')
    XLSX.writeFile(workbook, `Laporan_5R_Quality_CPI_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            Daftar Laporan 5R
          </h1>
          <p className="text-xs text-slate-500">
            Monitoring audit 5R (Ringkas, Rapi, Resik, Rawat, Rajin), evaluasi skor, dan tindak lanjut temuan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Link href="/dashboard/quality/5r/master-area">Master Area 5R</Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="h-9 bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800 shadow-sm"
          >
            <Link href="/dashboard/quality/5r/create">
              <Plus className="mr-1.5 size-4" />
              + Buat Laporan 5R
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Header Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Total Audit 5R</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{totalReports}</div>
          <div className="mt-1 text-[11px] text-slate-400">Seluruh periode</div>
        </div>

        <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Rata-rata Skor</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{avgScore}</div>
          <div className="mt-1 text-[11px] text-emerald-600 font-medium">Skala 0 - 100</div>
        </div>

        <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Menunggu Approval</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{pendingCount}</div>
          <div className="mt-1 text-[11px] text-amber-700 font-medium">Dalam verifikasi</div>
        </div>

        <div className="rounded-xl border border-border/70 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Disetujui (Approved)</div>
          <div className="mt-1 text-2xl font-bold text-blue-600">{approvedCount}</div>
          <div className="mt-1 text-[11px] text-blue-700 font-medium">Level 3 Selesai</div>
        </div>
      </div>

      {/* Command Bar & Filters */}
      <div className="rounded-xl border border-border/70 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
              <Input
                placeholder="Cari no. laporan, area, auditor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs bg-slate-50/70"
              />
            </div>

            {/* Filter Periode */}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700"
            >
              <option value="all">Semua Periode</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Filter Tipe Report */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700"
            >
              <option value="all">Semua Tipe Report</option>
              <option value="ada_temuan">Ada Temuan</option>
              <option value="after_temuan_sebelumnya">After (Temuan Sebelumnya)</option>
              <option value="tidak_ada_temuan">Tidak Ada Temuan</option>
            </select>

            {/* Filter Status */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700"
            >
              <option value="all">Semua Status</option>
              <option value="pending_approval">Menunggu Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected / Revisi</option>
            </select>
          </div>

          {/* Export Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            className="h-8 border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-medium"
          >
            <FileSpreadsheet className="mr-1.5 size-3.5 text-emerald-700" />
            Excel
          </Button>
        </div>
      </div>

      {/* Table Laporan 5R */}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 text-slate-700 border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5 font-semibold">No. Laporan</th>
                <th className="py-3 px-3 font-semibold">Periode & Tanggal</th>
                <th className="py-3 px-3 font-semibold">PIC / Area 5R</th>
                <th className="py-3 px-3 font-semibold">Auditor</th>
                <th className="py-3 px-3 font-semibold">Tipe Report</th>
                <th className="py-3 px-3 font-semibold text-center">Nilai Audit</th>
                <th className="py-3 px-3 font-semibold">Status Approval</th>
                <th className="py-3 px-3.5 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    Tidak ada laporan 5R yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const typeBadge =
                    r.reportType === 'ada_temuan'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : r.reportType === 'after_temuan_sebelumnya'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'

                  const statusBadge =
                    r.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : r.status === 'rejected'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* No Laporan */}
                      <td className="py-3 px-3.5 font-semibold text-slate-900">
                        {r.reportNumber}
                      </td>

                      {/* Periode & Tanggal */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{r.auditPeriod}</div>
                        <div className="text-[11px] text-slate-400">{r.auditDate}</div>
                      </td>

                      {/* Area & Site */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{r.picAreaName}</div>
                        <div className="text-[11px] text-slate-400">{r.siteName ?? 'Global'}</div>
                      </td>

                      {/* Auditor */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800">{r.auditorName}</div>
                        <div className="text-[11px] text-slate-400">{r.auditorEmail}</div>
                      </td>

                      {/* Tipe Report */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium border ${typeBadge}`}
                        >
                          {r.reportType === 'ada_temuan'
                            ? 'Ada Temuan'
                            : r.reportType === 'after_temuan_sebelumnya'
                            ? 'After'
                            : 'Tidak Ada Temuan'}
                        </span>
                      </td>

                      {/* Nilai Audit */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-bold text-slate-900 text-sm">{r.totalScore}</span>
                      </td>

                      {/* Status Approval */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold border w-fit ${statusBadge}`}
                          >
                            {r.status === 'approved' ? (
                              <>
                                <CheckCircle2 className="size-3 text-emerald-700" /> Approved
                              </>
                            ) : r.status === 'rejected' ? (
                              <>
                                <XCircle className="size-3 text-rose-700" /> Rejected
                              </>
                            ) : (
                              <>
                                <Clock className="size-3 text-amber-700" /> Level {r.currentApprovalLevel}
                              </>
                            )}
                          </span>
                          {r.status === 'pending_approval' && (
                            <span className="text-[10px] text-slate-400">
                              {r.currentApprovalLevel === 1
                                ? 'Ria Annisa (Quality)'
                                : r.currentApprovalLevel === 2
                                ? 'PJO Site'
                                : 'Bardinia Susi (CPI)'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedReportId(r.id)}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900"
                            title="Lihat Detail & Approval"
                          >
                            <Eye className="size-3.5" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintInPlace(r.id)}
                            disabled={printingId === r.id}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-slate-900 cursor-pointer"
                            title="Cetak Dokumen / Simpan PDF Langsung"
                          >
                            <Printer className={`size-3.5 ${printingId === r.id ? 'animate-pulse text-emerald-600' : ''}`} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail & Approval Dialog */}
      {selectedReportId && (
        <FiveRDetailDialog
          reportId={selectedReportId}
          onClose={() => setSelectedReportId(null)}
          onActionComplete={() => {
            // refresh data
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
