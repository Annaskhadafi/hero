'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Loader2,
  Move,
  PlusCircle,
  RotateCcw,
  Search,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { getOvertimeApprovalData } from '@/app/dashboard/overtime-requests/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { downloadElementAsPdf } from '@/lib/pdf-download'
import { cn } from '@/lib/utils'

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

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return String(d)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function fmtDt(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return String(d)
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
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

  // ── Floating PDF Preview State ──
  const [selectedSplId, setSelectedSplId] = useState<number | null>(null)
  const [selectedSplData, setSelectedSplData] = useState<any | null>(null)
  const [isPdfOpen, setIsPdfOpen] = useState(false)
  const [isLoadingPdf, setIsLoadingPdf] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)
  const [previewZoom, setPreviewZoom] = useState<number>(1.0)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const initialPinchDistRef = useRef<number | null>(null)
  const initialZoomRef = useRef<number>(1.0)
  const pdfPreviewRef = useRef<HTMLDivElement>(null)

  function resetZoomAndPan() {
    setPreviewZoom(1.0)
    setPanOffset({ x: 0, y: 0 })
    setIsDragging(false)
  }

  useEffect(() => {
    if (!isPdfOpen) {
      resetZoomAndPan()
    }
  }, [isPdfOpen])

  async function handleOpenPdf(id: number) {
    setSelectedSplId(id)
    setIsPdfOpen(true)
    setIsLoadingPdf(true)
    setSelectedSplData(null)
    resetZoomAndPan()
    try {
      const data = await getOvertimeApprovalData(id)
      if (!data) {
        toast.error('Data dokumen SPL tidak ditemukan.')
        setIsPdfOpen(false)
        return
      }
      setSelectedSplData(data)
    } catch (err: any) {
      toast.error(err?.message || 'Gagal memuat dokumen SPL.')
      setIsPdfOpen(false)
    } finally {
      setIsLoadingPdf(false)
    }
  }

  async function handleDownloadPdf() {
    if (!pdfPreviewRef.current) return
    setIsDownloadingPdf(true)
    try {
      await downloadElementAsPdf(
        pdfPreviewRef.current,
        `${selectedSplData?.document?.splNumber || 'SPL'}-Document.pdf`
      )
      toast.success('PDF SPL berhasil diunduh.')
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengunduh PDF.')
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    }
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {}
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false)
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {}
    }
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      initialPinchDistRef.current = dist
      initialZoomRef.current = previewZoom
    } else if (e.touches.length === 1) {
      const t = e.touches[0]
      setIsDragging(true)
      dragStartRef.current = {
        x: t.clientX - panOffset.x,
        y: t.clientY - panOffset.y,
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
      const scaleFactor = dist / initialPinchDistRef.current
      const newZoom = Math.min(
        3.5,
        Math.max(0.6, Number((initialZoomRef.current * scaleFactor).toFixed(2)))
      )
      setPreviewZoom(newZoom)
    } else if (e.touches.length === 1 && isDragging) {
      const t = e.touches[0]
      setPanOffset({
        x: t.clientX - dragStartRef.current.x,
        y: t.clientY - dragStartRef.current.y,
      })
    }
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      initialPinchDistRef.current = null
    }
    if (e.touches.length === 0) {
      setIsDragging(false)
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15
      setPreviewZoom((z) => Math.min(3.5, Math.max(0.6, Number((z + zoomDelta).toFixed(2)))))
    }
  }

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

  // PDF sheet approval helper bindings
  const doc = selectedSplData
    ? {
        id: selectedSplData.documentId || selectedSplData.document?.id || selectedSplData.id,
        splNumber: selectedSplData.splNumber || selectedSplData.document?.splNumber,
        title: selectedSplData.title || selectedSplData.document?.title,
        workDate: selectedSplData.workDate || selectedSplData.document?.workDate,
        plannedStartAt: selectedSplData.plannedStartAt || selectedSplData.document?.plannedStartAt,
        plannedEndAt: selectedSplData.plannedEndAt || selectedSplData.document?.plannedEndAt,
        plannedStartDate: selectedSplData.plannedStartAt
          ? new Date(selectedSplData.plannedStartAt)
          : selectedSplData.document?.plannedStartAt
          ? new Date(selectedSplData.document.plannedStartAt)
          : null,
        plannedStartTime: selectedSplData.plannedStartAt
          ? new Date(selectedSplData.plannedStartAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : selectedSplData.document?.plannedStartTime || '17:00',
        plannedEndTime: selectedSplData.plannedEndAt
          ? new Date(selectedSplData.plannedEndAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : selectedSplData.document?.plannedEndTime || '21:00',
        status: selectedSplData.status || selectedSplData.document?.status,
        requestNotes: selectedSplData.requestNotes || selectedSplData.document?.requestNotes,
        executionNotes: selectedSplData.executionNotes || selectedSplData.document?.executionNotes,
        origin: selectedSplData.origin || selectedSplData.document?.origin,
        createdAt: selectedSplData.workDate || selectedSplData.document?.workDate,
      }
    : null

  const requester = selectedSplData
    ? {
        name: selectedSplData.requesterName || selectedSplData.requester?.name,
        department: selectedSplData.requesterDepartment || selectedSplData.requester?.department,
        jobTitle: selectedSplData.requesterJobTitle || selectedSplData.requester?.jobTitle,
      }
    : null

  const participants = selectedSplData?.participants || []
  const lineItems = selectedSplData?.lineItems || []
  const approvals = selectedSplData?.approvals || []

  const step1 = approvals.find((a: any) => a.stepOrder === 1)
  const step2 = approvals.find((a: any) => a.stepOrder === 2)
  const step3 = approvals.find((a: any) => a.stepOrder === 3)

  const isStep1Signed = step1?.status === 'approved'
  const isStep2Signed = step2?.status === 'approved'
  const isStep3Signed = step3?.status === 'approved'

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
            </div>
          </summary>
          <div className="space-y-3 border-t border-[#e6f0f7] bg-[#f6fbff] p-4">
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

            <div className="pt-1">
              {['returned', 'reverted', 'needs_revision', 'draft'].includes(row.status) ? (
                <div className="space-y-2">
                  <Button asChild className="w-full h-12 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs">
                    <Link href={`/mobile/overtime?tab=apply&edit=${row.id}`}>
                      <RotateCcw className="size-4 mr-1.5" /> Revisi &amp; Ajukan Ulang SPL
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenPdf(row.id)}
                    className="w-full h-11 rounded-2xl border-slate-300 font-bold text-xs bg-white text-slate-700 shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FileText className="size-4" />
                    <span>Lihat &amp; Unduh Dokumen PDF</span>
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={() => handleOpenPdf(row.id)}
                  className="w-full h-12 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileText className="size-4" />
                  <span>LIHAT &amp; UNDUH DOKUMEN PDF</span>
                </Button>
              )}
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

      {/* ── Official PDF Preview Modal Dialog (Parity with DAR Viewer) ── */}
      <Dialog open={isPdfOpen} onOpenChange={setIsPdfOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[430px] w-full sm:max-w-[430px] mx-auto h-[92dvh] sm:h-[86dvh] max-h-[92dvh] flex flex-col p-0 overflow-hidden bg-slate-100 border border-slate-200 shadow-2xl rounded-t-2xl sm:rounded-2xl z-50"
        >
          {/* Top Viewer Navbar */}
          <div className="bg-white px-3 sm:px-4 py-2.5 flex items-center justify-between border-b border-slate-200 shrink-0 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-lg bg-blue-50 text-[#003461] border border-blue-100 flex items-center justify-center shrink-0">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-slate-900 truncate">
                  Dokumen Surat Perintah Lembur • <span className="text-[#003461]">{doc?.splNumber || (selectedSplId ? `SPL-#${selectedSplId}` : 'SPL-DOKUMEN')}</span>
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {requester?.name || 'Karyawan'} • {doc?.workDate ? fmtDate(doc.workDate) : '—'} • {requester?.department || 'Central Services'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                <span className="text-[10px] font-mono font-bold text-slate-700 px-1.5 py-0.5">
                  1/1
                </span>
              </div>

              <Button
                size="sm"
                variant="outline"
                disabled={isDownloadingPdf || isLoadingPdf}
                className="h-7 px-2 text-[10px] font-semibold gap-1 rounded-lg bg-[#e2e8f0] border-slate-200 text-slate-800 cursor-pointer"
                onClick={handleDownloadPdf}
              >
                <Download className="size-3" />
                <span>{isDownloadingPdf ? 'Unduh...' : 'UNDUH PDF'}</span>
              </Button>

              <button
                type="button"
                onClick={() => setIsPdfOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer ml-0.5"
                aria-label="Tutup Preview"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Body Viewer */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 bg-slate-100 space-y-3 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
            {isLoadingPdf ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="size-8 animate-spin text-[#003461]" />
                <p className="font-semibold text-xs text-slate-600">Memuat dokumen surat SPL...</p>
              </div>
            ) : !doc ? (
              <div className="py-20 text-center text-slate-500 text-xs">
                Data dokumen SPL tidak ditemukan.
              </div>
            ) : (
              <>
                {/* Zoom Action Bar */}
                <div className="flex flex-col gap-1.5 px-3 py-2 bg-white/95 backdrop-blur-xs rounded-xl border border-slate-200 shadow-2xs max-w-lg mx-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <FileText className="size-3.5 text-[#003461]" /> Preview Dokumen Surat / PDF
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
                        className="h-7 w-7 p-0 text-xs font-extrabold text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                        title="Zoom Out"
                      >
                        -
                      </Button>
                      <span className="text-[11px] font-mono font-bold text-slate-600 px-1 min-w-10 text-center">
                        {Math.round(previewZoom * 100)}%
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewZoom((z) => Math.min(3.5, Number((z + 0.15).toFixed(2))))}
                        className="h-7 w-7 p-0 text-xs font-extrabold text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                        title="Zoom In"
                      >
                        +
                      </Button>
                      {(previewZoom !== 1.0 || panOffset.x !== 0 || panOffset.y !== 0) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={resetZoomAndPan}
                          className="h-7 px-2 text-[10px] font-bold text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer flex items-center gap-1"
                        >
                          <RotateCcw className="size-3" />
                          Reset
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Presets & Drag hint */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                    <div className="flex items-center gap-1">
                      {[
                        { label: "Fit", zoom: 1.0 },
                        { label: "150%", zoom: 1.5 },
                        { label: "200%", zoom: 2.0 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setPreviewZoom(preset.zoom)}
                          className={cn(
                            "px-2 py-0.5 rounded-md font-semibold text-[10px] transition-colors cursor-pointer",
                            Math.abs(previewZoom - preset.zoom) < 0.05
                              ? "bg-[#003461] text-white"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 text-[9.5px]">
                      <Move className="size-3 shrink-0" />
                      <span>Geser / drag untuk navigasi</span>
                    </div>
                  </div>
                </div>

                {/* PDF Letterhead Document Preview Container with Pan, Drag, Pinch */}
                <div
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                  onWheel={handleWheel}
                  className={cn(
                    "flex justify-center items-start overflow-hidden p-1 w-full max-w-full touch-none select-none relative",
                    isDragging ? "cursor-grabbing" : "cursor-grab"
                  )}
                >
                  <div
                    ref={pdfPreviewRef}
                    id="mobile-spl-history-preview-sheet"
                    className="relative mx-auto shrink-0 bg-white shadow-md border border-slate-200 rounded-sm origin-top transition-transform duration-100 w-[210mm] min-h-[297mm] will-change-transform"
                    style={{
                      backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
                      backgroundSize: '100% 100%',
                      transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${0.44 * previewZoom})`,
                      marginBottom: `${-160 + (previewZoom - 1.0) * 125}mm`,
                    }}
                  >
                    <div
                      className="relative z-10 text-[8pt] sm:text-[8.5pt] font-sans leading-tight text-black"
                      style={{
                        paddingTop: '38mm',
                        paddingBottom: '35mm',
                        paddingLeft: '20mm',
                        paddingRight: '20mm',
                        minHeight: '297mm',
                      }}
                    >
                      {/* Header Document */}
                      <div className="text-center mb-3">
                        <h1 className="font-bold text-[11pt] uppercase text-black leading-tight">
                          SURAT PERINTAH LEMBUR (SPL)
                        </h1>
                        <p className="font-semibold text-[8pt] text-slate-700 uppercase tracking-wide">
                          PT CHITRA PARATAMA • HUMAN CAPITAL
                        </p>
                      </div>

                      {/* Section 1: Details & Request Profile */}
                      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]">
                        <tbody>
                          <tr>
                            <td colSpan={4} className="font-bold bg-slate-50 text-black py-0.5">Details &amp; Request Profile</td>
                          </tr>
                          <tr>
                            <td className="w-1/4 font-bold bg-slate-50 text-black">SPL Number</td>
                            <td className="w-1/4 font-mono font-semibold text-black">{doc.splNumber || `SPL-#${doc.id}`}</td>
                            <td className="w-1/4 font-bold bg-slate-50 text-black">Work Date</td>
                            <td className="w-1/4 font-semibold text-black">{doc.workDate ? fmtDate(doc.workDate) : '—'}</td>
                          </tr>
                          <tr>
                            <td className="font-bold bg-slate-50 text-black">Title / Keperluan</td>
                            <td colSpan={3} className="font-semibold text-black">{doc.title || '—'}</td>
                          </tr>
                          <tr>
                            <td className="font-bold bg-slate-50 text-black">Requester Name</td>
                            <td className="text-black">{requester?.name || '—'}</td>
                            <td className="font-bold bg-slate-50 text-black">Department</td>
                            <td className="text-black">{requester?.department || 'Central Services'}</td>
                          </tr>
                          <tr>
                            <td className="font-bold bg-slate-50 text-black">Planned Schedule</td>
                            <td colSpan={3} className="text-black">
                              {doc.plannedStartDate ? fmtDate(doc.plannedStartDate) : ''} ({doc.plannedStartTime || '17:00'} s.d. {doc.plannedEndTime || '21:00'})
                            </td>
                          </tr>
                          {doc.requestNotes ? (
                            <tr>
                              <td className="font-bold bg-slate-50 text-black">Request Notes</td>
                              <td colSpan={3} className="text-black">{doc.requestNotes}</td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>

                      {/* Section 2: Workers */}
                      <div className="font-bold mb-1 text-[8pt] text-black">
                        A. Workers ({participants.length} Orang)
                      </div>
                      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-center text-[7.5pt] sm:text-[8pt]">
                        <thead>
                          <tr className="bg-slate-50 font-bold text-black">
                            <th className="w-[8%]">#</th>
                            <th className="text-left w-[42%]">Name</th>
                            <th className="w-[15%]">Shift</th>
                            <th className="w-[15%]">Roster</th>
                            <th className="w-[20%]">Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {participants.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-2 text-slate-400 italic">Belum ada peserta lembur.</td>
                            </tr>
                          ) : (
                            participants.map((w: any, idx: number) => (
                              <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td className="text-left font-semibold text-black">
                                  {w.employeeName || `#${w.employeeId}`}
                                </td>
                                <td>{w.shiftCode || 'DS'}</td>
                                <td>{w.rosterType || '5:2'}</td>
                                <td className="capitalize text-[7.5pt] text-slate-800">
                                  {(w.category || '').replace(/_/g, ' ')}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>

                      {/* Section 3: Line Items */}
                      <div className="font-bold mb-1 text-[8pt] text-black">
                        B. Line Items (Aktivitas Pekerjaan)
                      </div>
                      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[7.5pt] sm:text-[8pt]">
                        <thead>
                          <tr className="bg-slate-50 text-center font-bold text-black">
                            <th className="w-[8%]">#</th>
                            <th className="text-left w-[44%]">Line Label / Task</th>
                            <th className="w-[20%]">Target Unit</th>
                            <th className="w-[14%]">Est. Min</th>
                            <th className="w-[14%]">Points</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lineItems.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-2 text-slate-400 italic text-center">Belum ada rincian aktivitas.</td>
                            </tr>
                          ) : (
                            lineItems.map((item: any, idx: number) => (
                              <tr key={idx}>
                                <td className="text-center">{idx + 1}</td>
                                <td className="font-medium text-black">{item.lineLabel}</td>
                                <td className="text-center text-black">{item.targetUnit || '—'}</td>
                                <td className="text-center text-black">{item.estimatedMinutes || 0}m</td>
                                <td className="text-center font-bold text-black">{item.plannedPoints || 0}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>

                      {/* Section 4: Approval Steps */}
                      <div className="font-bold mb-1 text-[8pt] text-black">
                        C. Approval Steps
                      </div>
                      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-center text-[7.5pt] sm:text-[8pt]">
                        <thead>
                          <tr className="bg-slate-50 font-bold text-black">
                            <th className="w-[6%]">#</th>
                            <th className="text-left w-[20%]">Tahap</th>
                            <th className="text-left w-[22%]">Approver</th>
                            <th className="w-[14%]">Status</th>
                            <th className="w-[16%]">Waktu</th>
                            <th className="text-left w-[22%]">Catatan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {approvals.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-2 text-slate-400 italic">Belum ada jejak approval.</td>
                            </tr>
                          ) : (
                            approvals.map((ap: any, idx: number) => (
                              <tr key={idx}>
                                <td>{ap.stepOrder || idx + 1}</td>
                                <td className="text-left font-medium capitalize">{ap.stepLabel || ap.approverRole?.replace(/_/g, ' ') || 'Approver'}</td>
                                <td className="text-left font-semibold text-black">{ap.approverName || '—'}</td>
                                <td className="capitalize font-semibold text-black">{ap.status || 'Pending'}</td>
                                <td className="text-[7pt]">{fmtDt(ap.signedAt)}</td>
                                <td className="text-left text-[7pt] text-slate-600">{ap.remarks || '—'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>

                      {/* Section 5: Signatories Grid */}
                      <div className="font-bold mb-2 text-[8pt] text-black">Signatories</div>
                      <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                        {/* 1. Serviceman / Requester */}
                        <div className="flex flex-col items-center text-center">
                          <div className="text-[7pt] text-slate-500 font-semibold mb-1">Employee Signature</div>
                          <div className="h-14 w-full flex items-center justify-center my-1">
                            {step1?.signatureDataUrl ? (
                              <img src={step1.signatureDataUrl} alt="TTD Pemohon" className="max-h-12 max-w-full object-contain" />
                            ) : isStep1Signed ? (
                              <svg className="h-10 w-24 text-slate-900" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 26 C22 10, 32 32, 48 18 C62 6, 68 28, 82 14 C89 8, 92 10, 88 18 C82 24, 72 26, 68 22 C58 16, 48 18, 42 22" />
                                <path d="M22 30 C38 32, 60 28, 84 26" />
                              </svg>
                            ) : (
                              <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                            )}
                          </div>
                          <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                            {requester?.name || '—'}
                          </div>
                          <div className="text-[7pt] text-slate-600 font-medium">Serviceman / Pemohon</div>
                          <div className="text-[6.5pt] text-slate-400 mt-0.5">
                            {isStep1Signed && doc.createdAt ? `Waktu Pengajuan: ${fmtDt(doc.createdAt)}` : '—'}
                          </div>
                        </div>

                        {/* 2. Leader / Supervisor */}
                        <div className="flex flex-col items-center text-center">
                          <div className="text-[7pt] text-slate-500 font-semibold mb-1">Leader / Supervisor Signature</div>
                          <div className="h-14 w-full flex items-center justify-center my-1">
                            {step2?.signatureDataUrl ? (
                              <img src={step2.signatureDataUrl} alt="TTD Leader" className="max-h-12 max-w-full object-contain" />
                            ) : isStep2Signed ? (
                              <svg className="h-10 w-24 text-slate-900" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 26 C22 10, 32 32, 48 18 C62 6, 68 28, 82 14 C89 8, 92 10, 88 18 C82 24, 72 26, 68 22 C58 16, 48 18, 42 22" />
                                <path d="M22 30 C38 32, 60 28, 84 26" />
                              </svg>
                            ) : (
                              <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                            )}
                          </div>
                          <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                            {step2?.approverName || '—'}
                          </div>
                          <div className="text-[7pt] text-slate-600 font-medium">Leader / Supervisor</div>
                          <div className="text-[6.5pt] text-slate-400 mt-0.5">
                            {isStep2Signed && step2?.signedAt ? `Waktu TTD: ${fmtDt(step2.signedAt)}` : '—'}
                          </div>
                        </div>

                        {/* 3. Section Head / Superior */}
                        <div className="flex flex-col items-center text-center">
                          <div className="text-[7pt] text-slate-500 font-semibold mb-1">Section Head Signature</div>
                          <div className="h-14 w-full flex items-center justify-center my-1">
                            {step3?.signatureDataUrl ? (
                              <img src={step3.signatureDataUrl} alt="TTD Superior" className="max-h-12 max-w-full object-contain" />
                            ) : isStep3Signed ? (
                              <svg className="h-10 w-24 text-slate-900" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 26 C22 10, 32 32, 48 18 C62 6, 68 28, 82 14 C89 8, 92 10, 88 18 C82 24, 72 26, 68 22 C58 16, 48 18, 42 22" />
                                <path d="M22 30 C38 32, 60 28, 84 26" />
                              </svg>
                            ) : (
                              <span className="text-slate-400 italic text-[7pt]">(Belum Disetujui)</span>
                            )}
                          </div>
                          <div className="mt-1 border-b border-slate-400 pb-0.5 font-bold text-[8pt] text-slate-900 w-[80%] truncate">
                            {step3?.approverName || '—'}
                          </div>
                          <div className="text-[7pt] text-slate-600 font-medium">Section Head</div>
                          <div className="text-[6.5pt] text-slate-400 mt-0.5">
                            {isStep3Signed && step3?.signedAt ? `Waktu TTD: ${fmtDt(step3.signedAt)}` : '—'}
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-[7pt] text-slate-500 mt-2 font-mono">
                        F.HC.SPL.001.01 • PT Chitra Paratama
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

