'use client'

import { useRef, useState, useTransition } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import {
  approveOvertimeStepByToken,
  rejectOvertimeStepByToken,
  revertOvertimeStepByToken,
} from '@/app/dashboard/overtime-requests/actions'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import Link from 'next/link'
import {
  Download,
  CheckCircle2,
  XCircle,
  PenTool,
  RotateCcw,
  FileSpreadsheet,
  Printer,
  Eye,
  FileText,
  CheckSquare,
  Square,
  Clock,
  User,
  Users,
  MapPin,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { downloadElementAsPdf } from '@/lib/pdf-download'

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

export function OvertimePublicApproval({
  token,
  approval,
  data,
}: {
  token: string
  approval: any
  data: any
}) {
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const [remarks, setRemarks] = useState(approval?.remarks || '')
  const [error, setError] = useState('')
  const [done, setDone] = useState(approval?.status === 'approved')
  const [rejected, setRejected] = useState(approval?.status === 'rejected')
  const [reverted, setReverted] = useState(false)
  const [approvalHistory, setApprovalHistory] = useState(data?.approvals || [])
  const initialSig = approval?.signatureDataUrl || data?.registeredSignature || ''
  const [previewSignatureDataUrl, setPreviewSignatureDataUrl] = useState(initialSig)
  const [previewSignedAt, setPreviewSignedAt] = useState<string | Date | null>(
    approval?.signedAt || null
  )
  const [isManualDraw, setIsManualDraw] = useState(!initialSig)
  const [isPending, startTransition] = useTransition()
  const [isDownloading, setIsDownloading] = useState(false)
  const [activeView, setActiveView] = useState<'form' | 'preview'>('form')

  // Multi-select for participants
  const participants = data?.participants || []
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<number[]>(() =>
    participants.map((p: any, idx: number) => p.id || idx)
  )

  const isAllSelected =
    participants.length > 0 && selectedParticipantIds.length === participants.length

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedParticipantIds([])
    } else {
      setSelectedParticipantIds(participants.map((p: any, idx: number) => p.id || idx))
    }
  }

  const toggleParticipant = (id: number) => {
    setSelectedParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  function getSignatureDataUrl() {
    const signature = signatureRef.current
    if (!signature || signature.isEmpty()) return ''
    try {
      return signature.getTrimmedCanvas().toDataURL('image/png')
    } catch {
      return signature.toDataURL('image/png')
    }
  }

  function updateSignaturePreview() {
    const dataUrl = getSignatureDataUrl()
    if (!dataUrl) return
    setPreviewSignatureDataUrl(dataUrl)
    setPreviewSignedAt(new Date())
  }

  function handleSubmit() {
    setError('')
    const drawn = getSignatureDataUrl()
    const signatureDataUrl = drawn || previewSignatureDataUrl || data?.registeredSignature || ''
    if (!signatureDataUrl) {
      setError('Tanda tangan digital wajib diisi.')
      return
    }
    const signedAt = new Date()

    startTransition(async () => {
      const result = await approveOvertimeStepByToken(token, {
        signatureDataUrl,
        remarks,
      })
      if (result.success) {
        setDone(true)
        setApprovalHistory((current: any[]) =>
          current.map((step: any) =>
            step.id === approval.id
              ? {
                  ...step,
                  status: 'approved',
                  signatureDataUrl,
                  remarks,
                  signedAt,
                }
              : step
          )
        )
        toast.success('Approval SPL berhasil disetujui & ditandatangani!')
      } else {
        setError(result.error || 'Gagal menyimpan approval.')
        toast.error(result.error || 'Gagal menyimpan approval.')
      }
    })
  }

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    actionType: 'reject' | 'revert'
  } | null>(null)

  function executeReject() {
    setError('')
    startTransition(async () => {
      const result = await rejectOvertimeStepByToken(token, { remarks })
      if (result.success) {
        setRejected(true)
        setApprovalHistory((current: any[]) =>
          current.map((step: any) =>
            step.id === approval.id
              ? { ...step, status: 'rejected', remarks, signedAt: new Date() }
              : step
          )
        )
        toast.success('SPL ditolak.')
      } else {
        setError(result.error || 'Gagal menolak approval.')
        toast.error(result.error || 'Gagal menolak approval.')
      }
    })
  }

  function executeRevert() {
    setError('')
    startTransition(async () => {
      const result = await revertOvertimeStepByToken(token, {
        remarks: remarks || 'Dokumen SPL dikembalikan untuk revisi.',
      })
      if (result.success) {
        setReverted(true)
        toast.success('SPL berhasil dikembalikan untuk revisi.')
      } else {
        setError(result.error || 'Gagal mengembalikan dokumen.')
        toast.error(result.error || 'Gagal mengembalikan dokumen.')
      }
    })
  }

  function handleReject() {
    setConfirmDialog({ isOpen: true, actionType: 'reject' })
  }

  function handleRevert() {
    setConfirmDialog({ isOpen: true, actionType: 'revert' })
  }

  const handleDownloadPdf = async () => {
    const el = document.getElementById('pdf-page-1')
    if (!el) {
      toast.error('Gagal menemukan elemen preview untuk diunduh.')
      return
    }
    setIsDownloading(true)
    try {
      await downloadElementAsPdf(el, `SPL_${data?.splNumber || 'Draft'}.pdf`)
      toast.success('PDF berhasil diunduh.')
    } catch (e) {
      console.error(e)
      toast.error('Gagal mengunduh PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleExportExcel = () => {
    const headers = ['No', 'Nama Karyawan', 'Kategori', 'Shift Code', 'Roster Type']
    const rows = participants.map((p: any, idx: number) => [
      idx + 1,
      p.employeeName || '-',
      p.category || '-',
      p.shiftCode || '-',
      p.rosterType || '-',
    ])
    exportToCsv(`SPL_${data?.splNumber || 'Export'}_Workers.csv`, headers, rows)
    toast.success('Data pekerja lembur berhasil diekspor.')
  }

  const handlePrint = () => {
    window.print()
  }

  const shouldShowCurrentPreview = done || Boolean(previewSignatureDataUrl || remarks.trim())
  const approvalHistoryForDisplay = shouldShowCurrentPreview
    ? approvalHistory.map((step: any) =>
        step.id === approval?.id
          ? {
              ...step,
              status: done ? 'approved' : 'preview',
              signatureDataUrl: previewSignatureDataUrl || step.signatureDataUrl,
              remarks,
              signedAt: previewSignedAt || step.signedAt,
            }
          : step
      )
    : approvalHistory

  return (
    <main className="min-h-screen bg-slate-100 p-3 sm:p-5 md:p-8">
      <div className="mx-auto max-w-[1600px] space-y-4 sm:space-y-6">
        {/* ── Top Header & Action Bar ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/mobile/approval"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-1 transition"
              >
                <ChevronLeft className="size-3.5" />
                Inbox Approval
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold uppercase text-amber-800 border border-amber-200">
                  <Clock className="size-3" /> Lembur SPL
                </span>
                <span className="font-mono text-xs font-bold text-slate-600">
                  #{data?.splNumber || 'Draft'}
                </span>
                <Badge
                  variant="outline"
                  className="rounded-full border-teal-200 bg-teal-50 text-xs font-bold text-teal-700"
                >
                  {approval?.stepLabel || 'Review & Approval'}
                </Badge>
              </div>
              <h1 className="mt-1 text-lg sm:text-xl font-bold text-slate-900">
                {data?.title || 'Surat Perintah Lembur'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemohon: <span className="font-semibold text-slate-700">{data?.requesterName || '-'}</span> • Site:{' '}
                <span className="font-semibold text-slate-700">{data?.siteName || '-'}</span> • Tanggal:{' '}
                <span className="font-semibold text-slate-700">{formatDate(data?.workDate)}</span>
              </p>
            </div>

            {/* Actions & View Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Segmented View Switcher on Mobile/Tablet */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 lg:hidden">
                <button
                  type="button"
                  onClick={() => setActiveView('form')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition',
                    activeView === 'form'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  <FileText className="size-3.5" /> Form & Aksi
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('preview')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition',
                    activeView === 'preview'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  <Eye className="size-3.5" /> Preview Surat
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
              >
                <FileSpreadsheet className="size-3.5 mr-1 text-emerald-600" /> Excel
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50"
              >
                <Download className="size-3.5 mr-1 text-indigo-600" />
                {isDownloading ? 'Mengunduh...' : 'Unduh PDF'}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-9 rounded-xl border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hidden sm:inline-flex"
              >
                <Printer className="size-3.5 mr-1 text-slate-500" /> Print
              </Button>
            </div>
          </div>
        </div>

        {/* ── Main Content Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ── Left Column: Form, Multi-select, Sign & Actions ── */}
          <div
            className={cn(
              'lg:col-span-5 space-y-4',
              activeView === 'form' ? 'block' : 'hidden lg:block'
            )}
          >
            {/* Status Alert */}
            {done ? (
              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-teal-800 text-xs flex items-center gap-3 shadow-xs">
                <CheckCircle2 className="size-5 shrink-0 text-teal-600" />
                <div>
                  <p className="font-bold">Approval Telah Disetujui</p>
                  <p className="text-[11px] text-teal-700">
                    Anda telah menyetujui dan menandatangani dokumen lembur ini.
                  </p>
                </div>
              </div>
            ) : rejected ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-xs flex items-center gap-3 shadow-xs">
                <XCircle className="size-5 shrink-0 text-rose-600" />
                <div>
                  <p className="font-bold">Approval Ditolak</p>
                  <p className="text-[11px] text-rose-700">
                    Dokumen SPL ini telah ditolak.
                  </p>
                </div>
              </div>
            ) : reverted ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-xs flex items-center gap-3 shadow-xs">
                <RotateCcw className="size-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold">Dikembalikan untuk Revisi</p>
                  <p className="text-[11px] text-amber-700">
                    Dokumen SPL dikembalikan ke pemohon untuk revisi.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Multi-Select Workers List Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-amber-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Daftar Pekerja Lembur ({participants.length})
                  </h3>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleSelectAll}
                  className="h-7 text-xs font-semibold text-amber-700 hover:text-amber-800 hover:bg-amber-50 px-2"
                >
                  {isAllSelected ? (
                    <span className="flex items-center gap-1">
                      <CheckSquare className="size-3.5" /> Batal Pilih
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Square className="size-3.5" /> Pilih Semua
                    </span>
                  )}
                </Button>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-slate-100">
                {participants.map((p: any, idx: number) => {
                  const pId = p.id || idx
                  const isSelected = selectedParticipantIds.includes(pId)
                  return (
                    <div
                      key={pId}
                      onClick={() => toggleParticipant(pId)}
                      className={cn(
                        'flex items-center justify-between p-2 rounded-xl cursor-pointer transition text-xs',
                        isSelected ? 'bg-amber-50/60 font-semibold' : 'hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isSelected ? (
                          <CheckSquare className="size-4 text-amber-600 shrink-0" />
                        ) : (
                          <Square className="size-4 text-slate-300 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-slate-900 truncate">{p.employeeName}</p>
                          <p className="text-[10px] text-slate-500">
                            {p.category} • Shift {p.shiftCode}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase shrink-0">
                        {p.rosterType || 'Roster'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Approval Action Box */}
            {!done && !rejected && !reverted && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <PenTool className="size-4 text-teal-600" /> Tanda Tangan & Persetujuan
                </h3>

                {/* Digital Signature */}
                {previewSignatureDataUrl && !isManualDraw ? (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-24 items-center justify-center rounded-lg border border-slate-200/80 bg-white p-1.5 shadow-xs">
                        <img
                          src={previewSignatureDataUrl}
                          alt="Tanda Tangan Terdaftar"
                          className="max-h-11 max-w-full object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Tanda Tangan Digital Terdaftar
                        </p>
                        <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="size-3.5" /> Siap ditempelkan ke PDF
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsManualDraw(true)}
                      className="h-8 rounded-lg border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white shrink-0"
                    >
                      <PenTool className="size-3 mr-1 text-slate-500" /> Gambar TTD
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">
                        Gambar Tanda Tangan
                      </label>
                      <div className="flex items-center gap-2">
                        {previewSignatureDataUrl ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] text-teal-700 hover:text-teal-800 p-0"
                            onClick={() => setIsManualDraw(false)}
                          >
                            Pakai TTD Terdaftar
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px] text-slate-500 hover:text-slate-800 p-0"
                          onClick={() => {
                            signatureRef.current?.clear()
                            setPreviewSignatureDataUrl('')
                          }}
                        >
                          Bersihkan TTD
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-300 bg-white p-1 shadow-inner">
                      <SignatureCanvas
                        ref={signatureRef}
                        onEnd={updateSignaturePreview}
                        canvasProps={{ className: 'h-36 w-full rounded-lg bg-white touch-none' }}
                        backgroundColor="rgba(255,255,255,0)"
                      />
                    </div>
                  </div>
                )}

                {/* Remarks Field */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Catatan Approval (Remarks)
                  </label>
                  <Textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Tuliskan catatan atau rekomendasi..."
                    rows={2}
                    className="text-xs rounded-xl border-slate-200 focus-visible:ring-amber-500"
                  />
                </div>

                {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs h-9 px-4"
                      onClick={handleReject}
                      disabled={isPending}
                    >
                      <XCircle className="mr-1 size-3.5" /> Tolak
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 font-bold text-xs h-9 px-4"
                      onClick={handleRevert}
                      disabled={isPending}
                    >
                      <RotateCcw className="mr-1 size-3.5" /> Revisi
                    </Button>
                  </div>

                  <Button
                    type="button"
                    className="rounded-xl bg-[#003461] hover:bg-[#002647] text-white font-bold text-xs h-9 px-5 shadow-xs"
                    onClick={handleSubmit}
                    disabled={isPending}
                  >
                    <CheckCircle2 className="mr-1.5 size-4" />
                    {isPending ? 'Menyimpan...' : 'Setujui & Tanda Tangani'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column: Live A4 Letterhead Document Preview ── */}
          <div
            className={cn(
              'lg:col-span-7 rounded-2xl bg-slate-200/70 p-3 sm:p-5 shadow-inner overflow-x-auto print:p-0 print:bg-white',
              activeView === 'preview' ? 'block' : 'hidden lg:block'
            )}
          >
            <div
              id="pdf-page-1"
              className="relative mx-auto shrink-0 min-h-[297mm] w-[210mm] overflow-hidden bg-white shadow-md text-xs print:shadow-none"
              style={{
                backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
                backgroundSize: '100% 100%',
              }}
            >
              <div className="pt-28 pb-16 px-12 space-y-4">
                <div className="text-center border-b border-slate-300 pb-2">
                  <h2 className="text-sm font-black tracking-wider uppercase text-slate-900">
                    SURAT PERINTAH LEMBUR (SPL)
                  </h2>
                  <p className="text-[10px] font-mono font-bold text-slate-600">
                    Nomor: {data?.splNumber || 'SPL-DRAFT'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
                  <div>
                    <span className="text-slate-500 font-semibold">Nama Pemohon:</span>{' '}
                    <span className="font-bold text-slate-900">{data?.requesterName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold">Departemen:</span>{' '}
                    <span className="font-bold text-slate-900">
                      {data?.requesterDepartment || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold">Tanggal Lembur:</span>{' '}
                    <span className="font-bold text-slate-900">{formatDate(data?.workDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold">Waktu Mulai:</span>{' '}
                    <span className="font-bold text-slate-900">
                      {formatDateTime(data?.plannedStartAt)}
                    </span>
                  </div>
                </div>

                {data?.requestNotes ? (
                  <div className="rounded-lg bg-slate-50 p-2 border border-slate-200 text-[9.5px]">
                    <span className="font-bold text-slate-700">Uraian Pekerjaan:</span>{' '}
                    <span className="text-slate-800">{data.requestNotes}</span>
                  </div>
                ) : null}

                {/* Table of Participants */}
                <div>
                  <p className="text-[10px] font-bold text-slate-800 mb-1">Daftar Pekerja Lembur:</p>
                  <table className="w-full border-collapse border border-slate-400 text-[9px]">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-slate-800">
                        <th className="border border-slate-400 p-1 text-center w-8">No</th>
                        <th className="border border-slate-400 p-1 text-left">Nama Pekerja</th>
                        <th className="border border-slate-400 p-1 text-left">Kategori</th>
                        <th className="border border-slate-400 p-1 text-center">Shift</th>
                        <th className="border border-slate-400 p-1 text-center">Roster</th>
                      </tr>
                    </thead>
                    <tbody>
                      {participants.map((p: any, idx: number) => (
                        <tr key={p.id || idx} className="hover:bg-slate-50">
                          <td className="border border-slate-400 p-1 text-center">{idx + 1}</td>
                          <td className="border border-slate-400 p-1 font-semibold text-slate-900">
                            {p.employeeName}
                          </td>
                          <td className="border border-slate-400 p-1 capitalize text-slate-700">
                            {p.category}
                          </td>
                          <td className="border border-slate-400 p-1 text-center text-slate-700">
                            {p.shiftCode}
                          </td>
                          <td className="border border-slate-400 p-1 text-center text-slate-700">
                            {p.rosterType || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Approval Signature Boxes */}
                <div className="pt-6 grid grid-cols-3 gap-4 text-center text-[9px]">
                  {approvalHistoryForDisplay.map((s: any) => (
                    <div key={s.id} className="flex flex-col items-center">
                      <p className="text-slate-600 font-bold uppercase">{s.stepLabel}</p>
                      <div className="h-14 flex items-center justify-center my-1">
                        {s.signatureDataUrl ? (
                          <img
                            src={s.signatureDataUrl}
                            alt="TTD"
                            className="h-12 object-contain"
                          />
                        ) : (
                          <span className="text-slate-400 italic text-[8px]">(Menunggu TTD)</span>
                        )}
                      </div>
                      <p className="font-bold border-t border-slate-400 w-32 pt-0.5 text-slate-900">
                        {s.approverName || '—'}
                      </p>
                      {s.signedAt ? (
                        <p suppressHydrationWarning className="text-[7.5px] text-slate-500">{formatDateTime(s.signedAt)}</p>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="text-right text-[7pt] text-gray-400 pt-8">
                  PT Chitra Paratama • HERO Platform SPL
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Confirmation Dialog for Reject / Revert */}
      <Dialog
        open={Boolean(confirmDialog?.isOpen)}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <DialogContent className="sm:max-w-md rounded-2xl p-6 shadow-xl bg-white border border-slate-200">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex size-10 items-center justify-center rounded-xl',
                  confirmDialog?.actionType === 'reject'
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-amber-50 text-amber-600'
                )}
              >
                {confirmDialog?.actionType === 'reject' ? (
                  <XCircle className="size-5" />
                ) : (
                  <RotateCcw className="size-5" />
                )}
              </div>
              <div className="space-y-0.5">
                <DialogTitle className="text-base font-bold text-slate-900 leading-snug">
                  {confirmDialog?.actionType === 'reject'
                    ? 'Apakah Anda yakin ingin menolak approval ini?'
                    : 'Apakah Anda yakin ingin mengembalikan approval ini?'}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
            <span className="font-semibold text-slate-700">Catatan tersimpan:</span>{' '}
            {remarks ? (
              <span>{remarks}</span>
            ) : (
              <span className="italic text-slate-400">Tidak ada catatan tambahan.</span>
            )}
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="text-xs rounded-xl h-9 px-4 font-semibold text-slate-600 border-slate-200"
              onClick={() => setConfirmDialog(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              className={cn(
                'text-xs rounded-xl h-9 px-4 font-bold text-white shadow-sm',
                confirmDialog?.actionType === 'reject'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              )}
              onClick={() => {
                if (!confirmDialog) return
                const { actionType } = confirmDialog
                setConfirmDialog(null)
                if (actionType === 'reject') {
                  executeReject()
                } else {
                  executeRevert()
                }
              }}
            >
              {confirmDialog?.actionType === 'reject' ? 'Ya, Tolak' : 'Ya, Kembalikan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
