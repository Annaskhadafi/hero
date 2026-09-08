'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import {
  approvePtwStepByToken,
  rejectPtwStepByToken,
  revertPtwStepByToken,
} from '@/app/dashboard/hse/izin-kerja-ptw/actions'
import { EQUIPMENT_CHECKLIST_PER_TYPE, getActivePermitTypeKeys, isItemChecked, getPermitSubTypes, cleanPtwDescription, extractCheckedEquipment } from '@/lib/ptw-helpers'
import { PtwChecklistTable } from '@/components/ptw-checklist-table'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  RotateCw,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  FileSpreadsheet,
  Printer,
  Eye,
  FileText,
  CheckSquare,
  Square,
  ShieldCheck,
  MapPin,
  Clock,
  HardHat,
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

export function PtwPublicApproval({
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
  const initialSig = approval?.signatureDataUrl || ''
  const [previewSignatureDataUrl, setPreviewSignatureDataUrl] = useState(initialSig)
  const [previewSignedAt, setPreviewSignedAt] = useState<string | Date | null>(
    approval?.signedAt || null
  )
  const [isPending, startTransition] = useTransition()
  const [isDownloading, setIsDownloading] = useState(false)
  const [activeView, setActiveView] = useState<'form' | 'preview'>('form')

  // States
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false)
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string } | null>(null)
  const [imageScale, setImageScale] = useState<number>(1)
  const [imageRotation, setImageRotation] = useState<number>(0)
  const [origin, setOrigin] = useState('')
  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin)
  }, [])

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
    const signatureDataUrl = drawn || previewSignatureDataUrl || ''
    if (!signatureDataUrl) {
      setError('Tanda tangan manual wajib digoreskan pada area kanvas di bawah.')
      return
    }
    const signedAt = new Date()
    setPreviewSignatureDataUrl(signatureDataUrl)
    setPreviewSignedAt(signedAt)

    startTransition(async () => {
      const result = await approvePtwStepByToken(token, {
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
        toast.success('Izin Kerja (PTW) berhasil disetujui & ditandatangani!')
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
      const result = await rejectPtwStepByToken(token, { remarks })
      if (result.success) {
        setRejected(true)
        setApprovalHistory((current: any[]) =>
          current.map((step: any) =>
            step.id === approval.id
              ? { ...step, status: 'rejected', remarks, signedAt: new Date() }
              : step
          )
        )
        toast.success('PTW ditolak.')
      } else {
        setError(result.error || 'Gagal menolak approval.')
        toast.error(result.error || 'Gagal menolak approval.')
      }
    })
  }

  function executeRevert() {
    setError('')
    startTransition(async () => {
      const result = await revertPtwStepByToken(token, {
        remarks: remarks || 'Dokumen PTW dikembalikan untuk revisi.',
      })
      if (result.success) {
        setReverted(true)
        toast.success('PTW berhasil dikembalikan untuk revisi.')
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
    const el = document.getElementById('ptw-pdf-page-1')
    if (!el) {
      toast.error('Gagal menemukan elemen preview untuk diunduh.')
      return
    }
    setIsDownloading(true)
    try {
      await downloadElementAsPdf(el, `PTW_${data?.permitNumber || 'Draft'}.pdf`, { orientation: 'landscape' })
      toast.success('PDF Landscape A4 berhasil diunduh.')
    } catch (e) {
      console.error(e)
      toast.error('Gagal mengunduh PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleExportExcel = () => {
    const headers = ['Nomor PTW', 'Proyek', 'Tipe Izin', 'Lokasi', 'Area', 'Masa Mulai', 'Masa Berakhir', 'Pemohon']
    const rows = [[
      data?.permitNumber || '-',
      data?.projectName || '-',
      data?.permitType || '-',
      data?.location || '-',
      data?.area || '-',
      formatDateTime(data?.startAt),
      formatDateTime(data?.endAt),
      data?.applicantName || '-',
    ]]
    exportToCsv(`PTW_${data?.permitNumber || 'Export'}.csv`, headers, rows)
    toast.success('Data PTW berhasil diekspor.')
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
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page { size: A4 landscape; margin: 5mm; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print, header, nav { display: none !important; }
          main { padding: 0 !important; background: white !important; min-height: auto !important; }
          .pdf-wrapper {
            width: 297mm !important;
            max-width: 297mm !important;
            min-height: 210mm !important;
            margin: 0 auto !important;
            padding: 5mm !important;
            border: 2px solid #0f172a !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
        }
      `,
        }}
      />
      <div className="mx-auto max-w-[1600px] space-y-4 sm:space-y-6">
        {/* ── Top Header & Action Bar ── */}
        <div className="no-print rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Link
                  href={data?.id ? `/dashboard/hse/izin-kerja-ptw/${data.id}/approval` : "/dashboard/approval"}
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-md border border-teal-200 transition"
                >
                  <ChevronLeft className="size-3.5" />
                  Buka Form Approval Dashboard (Inbox)
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold uppercase text-teal-800 border border-teal-200">
                  <ShieldCheck className="size-3" /> Izin Kerja Aman (PTW)
                </span>
                <span className="font-mono text-xs font-bold text-slate-600">
                  #{data?.permitNumber || 'Draft'}
                </span>
                <Badge
                  variant="outline"
                  className="rounded-full border-teal-200 bg-teal-50 text-xs font-bold text-teal-700"
                >
                  {approval?.stepLabel || 'Review & Approval'}
                </Badge>
              </div>
              <h1 className="mt-1 text-lg sm:text-xl font-bold text-slate-900">
                {data?.projectName || 'Permit to Work'}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Lokasi: <span className="font-semibold text-slate-700">{data?.location || '-'} ({data?.area || '-'})</span> • Tipe:{' '}
                <span className="font-semibold text-slate-700">{data?.permitType || '-'}</span> • Pemohon:{' '}
                <span className="font-semibold text-slate-700">{data?.applicantName || '-'}</span>
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
                <Download className="size-3.5 mr-1 text-teal-600" />
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
          {/* ── Left Column: Form, Multi-select APD, Sign & Actions ── */}
          <div
            className={cn(
              'no-print lg:col-span-5 space-y-4',
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
                    Anda telah menyetujui dan menandatangani izin kerja PTW ini.
                  </p>
                </div>
              </div>
            ) : rejected ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-xs flex items-center gap-3 shadow-xs">
                <XCircle className="size-5 shrink-0 text-rose-600" />
                <div>
                  <p className="font-bold">Approval Ditolak</p>
                  <p className="text-[11px] text-rose-700">
                    Izin kerja PTW ini telah ditolak.
                  </p>
                </div>
              </div>
            ) : reverted ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-xs flex items-center gap-3 shadow-xs">
                <RotateCcw className="size-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold">Dikembalikan untuk Revisi</p>
                  <p className="text-[11px] text-amber-700">
                    Dokumen PTW dikembalikan ke pemohon untuk revisi.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Attachment Documents Card */}
            {data?.attachments && Array.isArray(data.attachments) && data.attachments.length > 0 && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-teal-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Lampiran Dokumen Pendukung ({data.attachments.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {data.attachments.map((att: any, idx: number) => {
                    let name = 'Dokumen Lampiran'
                    let url = ''
                    if (typeof att === 'object' && att !== null) {
                      name = att.name || name
                      url = att.url || ''
                    } else if (typeof att === 'string') {
                      if (att.includes('||')) {
                        const [n, ...rest] = att.split('||')
                        name = n
                        url = rest.join('||')
                      } else {
                        try {
                          const p = JSON.parse(att)
                          name = p.name || name
                          url = p.url || ''
                        } catch {
                          name = att.split('/').pop() || att
                          url = att.startsWith('http') || att.startsWith('data:') ? att : ''
                        }
                      }
                    }
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="size-4 text-teal-600 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate">{name}</span>
                        </div>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            download={name}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition-colors shrink-0"
                          >
                            <Download className="size-3.5" />
                            Unduh / Buka
                          </a>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Approval Action Box */}
            {!done && !rejected && !reverted && (
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <PenTool className="size-4 text-teal-600" /> Tanda Tangan & Persetujuan
                </h3>

                {/* Manual Digital Signature Canvas for External Vendor / Public */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-xs font-bold text-slate-800 block">
                        Goreskan Tanda Tangan Manual
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Tanda tangani langsung di kotak kanvas menggunakan jari, mouse, atau stylus:
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-slate-600 hover:text-slate-900 border-slate-200"
                      onClick={() => {
                        signatureRef.current?.clear()
                        setPreviewSignatureDataUrl('')
                      }}
                    >
                      <RotateCcw className="size-3.5 mr-1 text-slate-400" />
                      Hapus / Ulangi
                    </Button>
                  </div>
                  <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-1 shadow-inner focus-within:border-teal-500 transition-colors">
                    <SignatureCanvas
                      ref={signatureRef}
                      onEnd={updateSignaturePreview}
                      canvasProps={{ className: 'h-40 w-full rounded-lg bg-white touch-none cursor-crosshair' }}
                      backgroundColor="rgba(255,255,255,0)"
                    />
                  </div>
                  {!previewSignatureDataUrl ? (
                    <p className="text-[10.5px] text-amber-600 mt-1.5 font-semibold flex items-center gap-1">
                      ⚠️ Tanda tangan manual wajib digoreskan pada kotak di atas sebelum dapat disetujui.
                    </p>
                  ) : (
                    <p className="text-[10.5px] text-emerald-600 mt-1.5 font-semibold flex items-center gap-1">
                      ✓ Tanda tangan tergores & preview terpasang pada lembar dokumen.
                    </p>
                  )}
                </div>

                {/* Remarks Field */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Catatan Approval PTW (Remarks)
                  </label>
                  <Textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Tuliskan catatan inspeksi atau syarat K3 khusus..."
                    rows={2}
                    className="text-xs rounded-xl border-slate-200 focus-visible:ring-teal-500"
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
                    className="rounded-xl bg-[#003461] hover:bg-[#002647] text-white font-bold text-xs h-9 px-5 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={handleSubmit}
                    disabled={isPending || !previewSignatureDataUrl}
                    title={!previewSignatureDataUrl ? 'Goreskan tanda tangan terlebih dahulu untuk menyetujui' : 'Setujui & Tanda Tangani PTW'}
                  >
                    <CheckCircle2 className="mr-1.5 size-4" />
                    {isPending ? 'Menyimpan...' : 'Setujui & Tanda Tangani'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column: Official 18-Field Landscape PTW Preview ── */}
          <div
            className={cn(
              'lg:col-span-7 rounded-2xl bg-slate-200/70 p-3 sm:p-5 shadow-inner overflow-x-auto print:p-0 print:bg-white print:border-none print:shadow-none print:overflow-visible print:col-span-12 print:w-full print:block',
              activeView === 'preview' ? 'block' : 'hidden lg:block'
            )}
          >
            <div
              id="ptw-pdf-page-1"
              className="pdf-wrapper relative mx-auto w-[1122px] min-h-[793px] shrink-0 bg-white shadow-sm border-2 border-slate-900 text-slate-900 font-sans text-[8.5pt] p-6 flex flex-col justify-between"
            >
              {/* ── HEADER TABLE ── */}
              <div className="grid grid-cols-[180px_1fr] border-b-2 border-slate-900">
                <div className="flex items-center justify-center p-2 border-r-2 border-slate-900 bg-white">
                  <img src="/cp_logo-removebg-preview.png" alt="Chitra Paratama" className="h-12 object-contain" />
                </div>
                <div className="bg-[#bfe6ff] flex items-center justify-center font-bold text-base tracking-wider uppercase py-2.5 text-slate-900">
                  IJIN KERJA BERBAHAYA ( Work Permit )
                </div>
              </div>

              {/* ── FORM META FIELDS ── */}
              <div className="grid grid-cols-12 border-b-2 border-slate-900 text-[8pt]">
                <div className="col-span-4 border-r border-slate-900 p-1.5 bg-slate-50">
                  <span className="font-bold">No. Ijin Kerja Berbahaya :</span> <span className="font-mono font-semibold">{data?.permitNumber || 'PTW-DRAFT'}</span>
                </div>
                <div className="col-span-8 p-1.5 bg-slate-50">
                  <span className="font-bold">No. Work Order :</span> <span className="font-mono font-semibold">{data?.permitNumber || 'PTW-DRAFT'}</span>
                </div>

                <div className="col-span-4 border-r border-slate-900 border-t border-slate-900 p-1.5 min-h-[44px]">
                  <span className="font-bold block text-[7.5pt] text-slate-500">Nama Pekerja :</span>
                  <span className="font-semibold text-slate-900">{data?.applicantName || '—'}</span>
                </div>
                <div className="col-span-3 border-r border-slate-900 border-t border-slate-900 p-1.5 min-h-[44px]">
                  <span className="font-bold block text-[7.5pt] text-slate-500">Lokasi :</span>
                  <span className="font-semibold text-slate-900">{data?.location || '—'} ({data?.area || '—'})</span>
                </div>
                <div className="col-span-5 border-t border-slate-900 p-1.5 min-h-[44px]">
                  <span className="font-bold block text-[7.5pt] text-slate-500">Uraian Pekerjaan :</span>
                  <span className="font-semibold text-slate-900">{data?.projectName || data?.description || '—'}</span>
                </div>

                <div className="col-span-6 border-r border-slate-900 border-t border-slate-900 p-1.5 bg-blue-50/50">
                  <span className="font-bold text-slate-800">Referensi HIRADC :</span>{' '}
                  <span className="font-semibold text-blue-900">
                    {data?.hiradcReference || (data?.description?.match(/\[Referensi HIRADC:\s*(.*?)\]/)?.[1]) || '—'}
                  </span>
                </div>
                <div className="col-span-6 border-t border-slate-900 p-1.5 bg-blue-50/50">
                  <span className="font-bold text-slate-800">Tipe Izin Kerja Terpilih :</span>{' '}
                  <span className="font-semibold uppercase text-slate-900">{data?.permitType || 'Cold Permit'}</span>
                </div>
              </div>

              {/* ── TABLE TITLE: JENIS PEKERJAAN ── */}
              <div className="bg-[#e2e8f0] text-center font-bold uppercase text-[8.5pt] py-1 border-b-2 border-slate-900">
                JENIS PEKERJAAN
              </div>

              {/* ── UNIFIED TABLE FOR PERMIT TYPES (PERFECT HORIZONTAL & BOTTOM ALIGNMENT) ── */}
              <PtwChecklistTable
                permitType={data?.permitType}
                subTypes={data?.subTypes}
                checkedEquipment={extractCheckedEquipment(data?.controlSteps, (data as any)?.checkedEquipment, data?.permitType)}
              />

              {/* ── ALAT PELINDUNG DIRI (APD) WAJIB ── */}
              <div className="p-2 border-b-2 border-slate-900 text-[8pt] bg-slate-50/80">
                <span className="font-bold block text-[7.5pt] text-slate-900">ALAT PELINDUNG DIRI (APD) WAJIB :</span>
                <div className="flex flex-wrap gap-1.5 mt-1 font-semibold text-slate-800">
                  {((Array.isArray(data?.ppe) && data.ppe.length > 0) || (Array.isArray(data?.safetyEquipments) && data.safetyEquipments.length > 0)) ? (
                    (data.ppe || data.safetyEquipments).map((apd: string) => (
                      <span key={apd} className="inline-block bg-white border border-slate-400 rounded px-2 py-0.5 text-[7.5pt] shadow-2xs">
                        ☑ {apd}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">Standard K3 APD (Helmet, Safety Shoes, Glasses)</span>
                  )}
                </div>
              </div>

              {/* ── DESKRIPSI PEKERJAAN ── */}
              <div className="p-2 border-b-2 border-slate-900 text-[8pt] bg-white">
                <span className="font-bold block text-[7.5pt] text-slate-900 uppercase tracking-wide">
                  DESKRIPSI PEKERJAAN :
                </span>
                <div className="text-[7.5pt] text-slate-700 mt-0.5 leading-relaxed whitespace-pre-wrap font-medium">
                  {cleanPtwDescription(data?.description) || data?.description || (data as any)?.additionalNotes || data?.controlSteps || <span className="text-slate-400 italic text-[7pt]">— Tidak ada deskripsi pekerjaan —</span>}
                </div>
              </div>

              {/* ── 3 KOLOM CATATAN VERIFIKASI & QR CODE ── */}
              <div className="grid grid-cols-12 border-b-2 border-slate-900 bg-slate-50/90 text-[8pt] items-stretch min-h-[75px] divide-x divide-slate-900">
                {/* 1. Catatan Pemberi Kerja */}
                {(() => {
                  const s = approvalHistoryForDisplay.find((x: any) => x.stepOrder === 1 || x.approverRole === 'field_pic' || x.approverRole === 'pemberi_kerja' || x.approverRole === 'safety_officer')
                  const isCur = approval?.stepOrder === 1
                  const rem = (isCur && remarks) || s?.remarks
                  return (
                    <div className="col-span-3 p-2 flex flex-col justify-between border-slate-900">
                      <div>
                        <span className="font-bold text-[7.5pt] text-slate-900 block uppercase tracking-wide border-b border-slate-300 pb-0.5 mb-1">
                          CATATAN PEMBERI KERJA
                        </span>
                        <div className="text-[7pt] text-slate-700 leading-snug break-words">
                          {rem || null}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* 2. Catatan Pelaksana Kerja */}
                {(() => {
                  const pelaksanaSteps = approvalHistoryForDisplay.filter(
                    (x: any) =>
                      x.approverRole === 'applicant' ||
                      x.approverRole === 'pelaksana' ||
                      x.approverRole === 'pelaksana_kerja' ||
                      (x.stepOrder > 1 &&
                        x.stepOrder < approvalHistoryForDisplay.length &&
                        !['field_pic', 'pemberi_kerja', 'safety_officer', 'safety_dept', 'authorized'].includes(
                          x.approverRole
                        ))
                  )
                  const remarksList = pelaksanaSteps
                    .map((p: any) => {
                      const isCur = approval?.id === p.id || approval?.stepOrder === p.stepOrder
                      const rem = (isCur && remarks) || p.remarks
                      return rem ? { name: p.approverName, text: rem } : null
                    })
                    .filter(Boolean) as { name: string; text: string }[]

                  return (
                    <div className="col-span-3 p-2 flex flex-col justify-between border-slate-900">
                      <div>
                        <span className="font-bold text-[7.5pt] text-slate-900 block uppercase tracking-wide border-b border-slate-300 pb-0.5 mb-1">
                          CATATAN PELAKSANA KERJA
                        </span>
                        <div className="text-[7pt] text-slate-700 leading-snug break-words space-y-1">
                          {remarksList.length > 0 ? (
                            remarksList.map((r, idx) => (
                              <div key={idx}>
                                {remarksList.length > 1 && (
                                  <span className="font-bold text-slate-900 block">{r.name}:</span>
                                )}
                                <span>{r.text}</span>
                              </div>
                            ))
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* 3. Catatan Safety Dept */}
                {(() => {
                  const s = approvalHistoryForDisplay.find(
                    (x: any) =>
                      x.approverRole === 'authorized' ||
                      x.approverRole === 'safety_dept' ||
                      (x.stepOrder === approvalHistoryForDisplay.length && approvalHistoryForDisplay.length > 2)
                  )
                  const isCur = approval?.id === s?.id || approval?.stepOrder === s?.stepOrder
                  const rem = (isCur && remarks) || s?.remarks
                  return (
                    <div className="col-span-3 p-2 flex flex-col justify-between border-slate-900">
                      <div>
                        <span className="font-bold text-[7.5pt] text-slate-900 block uppercase tracking-wide border-b border-slate-300 pb-0.5 mb-1">
                          CATATAN SAFETY DEPT
                        </span>
                        <div className="text-[7pt] text-slate-700 leading-snug break-words">
                          {rem || null}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* 4. QR Code */}
                {(() => {
                  const qrBaseUrl = origin || 'https://hero.chitraparatama.com'
                  const qrTargetUrl = `${qrBaseUrl}/review/ptw/${encodeURIComponent(data?.permitNumber || token)}`
                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.preventDefault()
                        setIsAttachmentModalOpen(true)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setIsAttachmentModalOpen(true)
                        }
                      }}
                      className="col-span-3 flex flex-col items-center justify-center p-1.5 border-slate-900 bg-white hover:bg-blue-50/70 cursor-pointer transition-colors no-underline text-slate-900 group"
                      title="Klik untuk membuka pop up lampiran dokumen pendukung PTW / Scan QR"
                      suppressHydrationWarning
                    >
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrTargetUrl)}`}
                        alt="QR Code Lampiran PTW"
                        className="size-12 object-contain border border-slate-900 p-0.5 bg-white rounded shadow-2xs group-hover:scale-105 transition-transform"
                        suppressHydrationWarning
                      />
                      <span className="text-[6pt] font-bold text-slate-900 mt-0.5 uppercase text-center underline underline-offset-1 group-hover:text-blue-700" suppressHydrationWarning>
                        Klik / Scan QR
                      </span>
                    </div>
                  )
                })()}
              </div>

              {/* ── MASA BERLAKU IKB ── */}
              <div className="border-b-2 border-slate-900 text-[8pt]">
                <div className="bg-slate-100 text-center font-bold uppercase py-0.5 border-b border-slate-900 text-[8pt]">
                  MASA BERLAKU IKB (IJIN KERJA BERBAHAYA)
                </div>
                <div className="grid grid-cols-2 divide-x divide-slate-900">
                  <div className="grid grid-cols-2 divide-x divide-slate-900 border-r border-slate-900">
                    <div className="p-1 text-center">
                      <span className="font-bold block text-[7pt] text-slate-500 uppercase">TANGGAL MULAI</span>
                      <span className="font-semibold">{formatDate(data?.startAt)}</span>
                    </div>
                    <div className="p-1 text-center">
                      <span className="font-bold block text-[7pt] text-slate-500 uppercase">WAKTU MULAI</span>
                      <span className="font-semibold">08:00</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-slate-900">
                    <div className="p-1 text-center">
                      <span className="font-bold block text-[7pt] text-slate-500 uppercase">TANGGAL BERAKHIR</span>
                      <span className="font-semibold">{formatDate(data?.endAt)}</span>
                    </div>
                    <div className="p-1 text-center">
                      <span className="font-bold block text-[7pt] text-slate-500 uppercase">WAKTU BERAKHIR</span>
                      <span className="font-semibold">17:00</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── VERIFIKASI & TANDA TANGAN (3 COLUMNS: Pemberi Kerja -> Pelaksana Kerja -> Safety Dept) ── */}
              <div className="grid grid-cols-3 divide-x-2 divide-slate-900 border-b-2 border-slate-900 text-[8pt]">
                {/* 1. Pemberi Kerja */}
                {(() => {
                  const s = approvalHistoryForDisplay.find(
                    (x: any) =>
                      x.stepOrder === 1 ||
                      x.approverRole === 'field_pic' ||
                      x.approverRole === 'pemberi_kerja' ||
                      x.approverRole === 'safety_officer'
                  )
                  const isCur = approval?.stepOrder === 1 || approval?.id === s?.id
                  const sigUrl =
                    (isCur && previewSignatureDataUrl) ||
                    s?.signatureDataUrl ||
                    (isCur ? data?.registeredSignature : null)
                  return (
                    <div className="p-1.5 text-center flex flex-col justify-between">
                      <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">
                        PEMBERI KERJA
                      </div>
                      <div className="h-14 flex items-center justify-center my-1">
                        {sigUrl ? (
                          <img src={sigUrl} alt="TTD" className="max-h-12 object-contain" />
                        ) : (
                          <span className="text-[7pt] text-slate-400 italic">Ditandatangani Digital</span>
                        )}
                      </div>
                      <div className="border-t border-slate-900 pt-1 font-bold">
                        {s?.approverName || data?.fieldPicName || 'NAMA & TANDA TANGAN'}
                      </div>
                    </div>
                  )
                })()}

                {/* 2. Pelaksana Kerja */}
                {(() => {
                  const pelaksanaSteps = approvalHistoryForDisplay.filter(
                    (x: any) =>
                      x.approverRole === 'applicant' ||
                      x.approverRole === 'pelaksana' ||
                      x.approverRole === 'pelaksana_kerja' ||
                      (x.stepOrder > 1 &&
                        x.stepOrder < approvalHistoryForDisplay.length &&
                        !['field_pic', 'pemberi_kerja', 'safety_officer', 'safety_dept', 'authorized'].includes(
                          x.approverRole
                        ))
                  )
                  const applicantNames = (data?.applicantName || '')
                    .split(/[,;\n]+/)
                    .map((s: string) => s.trim())
                    .filter(Boolean)

                  return (
                    <div className="p-1.5 text-center flex flex-col justify-between">
                      <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">
                        PELAKSANA KERJA
                      </div>
                      <div className="min-h-14 flex flex-wrap items-center justify-center gap-2 my-1">
                        {pelaksanaSteps.length > 0 ? (
                          pelaksanaSteps.map((pStep: any, pIdx: number) => {
                            const isCur =
                              approval?.id === pStep.id || approval?.stepOrder === pStep.stepOrder
                            const pSig =
                              (isCur && previewSignatureDataUrl) ||
                              pStep.signatureDataUrl ||
                              (isCur ? data?.registeredSignature : null)
                            return (
                              <div
                                key={pStep.id || pIdx}
                                className="flex flex-col items-center justify-center text-center"
                              >
                                {pStep.status === 'rejected' ? (
                                  <span className="text-[6.5pt] font-bold text-rose-600">✗ Ditolak</span>
                                ) : pStep.status === 'reverted' ? (
                                  <span className="text-[6.5pt] font-bold text-amber-600">↺ Dikembalikan</span>
                                ) : pSig ? (
                                  <img
                                    src={pSig}
                                    alt={`TTD ${pStep.approverName}`}
                                    className="max-h-10 object-contain"
                                  />
                                ) : pStep.status === 'approved' ? (
                                  <span className="text-[6.5pt] font-bold text-emerald-600">✓ Disetujui</span>
                                ) : (
                                  <span className="text-[6.5pt] text-slate-400 italic">Ditandatangani Digital</span>
                                )}
                                <span className="text-[6.5pt] text-slate-600 font-semibold mt-0.5">
                                  {pStep.approverName}
                                </span>
                              </div>
                            )
                          })
                        ) : applicantNames.length > 0 ? (
                          applicantNames.map((name: string, idx: number) => {
                            const isCur = approval?.stepOrder === 2
                            const pSig =
                              (isCur && previewSignatureDataUrl) ||
                              (isCur ? data?.registeredSignature : null)
                            return (
                              <div
                                key={idx}
                                className="flex flex-col items-center justify-center text-center"
                              >
                                {pSig ? (
                                  <img
                                    src={pSig}
                                    alt={`TTD ${name}`}
                                    className="max-h-10 object-contain"
                                  />
                                ) : (
                                  <span className="text-[6.5pt] text-slate-400 italic">Ditandatangani Digital</span>
                                )}
                                <span className="text-[6.5pt] text-slate-600 font-semibold mt-0.5">
                                  {name}
                                </span>
                              </div>
                            )
                          })
                        ) : (
                          <span className="text-[7pt] text-slate-400 italic">Ditandatangani Digital</span>
                        )}
                      </div>
                      <div
                        className="border-t border-slate-900 pt-1 font-bold text-[7.5pt] truncate"
                        title={
                          pelaksanaSteps.map((p: any) => p.approverName).join(', ') ||
                          data?.applicantName
                        }
                      >
                        {pelaksanaSteps.map((p: any) => p.approverName).join(', ') ||
                          data?.applicantName ||
                          'NAMA & TANDA TANGAN'}
                      </div>
                    </div>
                  )
                })()}

                {/* 3. Safety Dept */}
                {(() => {
                  const s = approvalHistoryForDisplay.find(
                    (x: any) =>
                      x.approverRole === 'authorized' ||
                      x.approverRole === 'safety_dept' ||
                      (x.stepOrder === approvalHistoryForDisplay.length && approvalHistoryForDisplay.length > 2)
                  )
                  const isCur = approval?.id === s?.id || approval?.stepOrder === s?.stepOrder
                  const sigUrl =
                    (isCur && previewSignatureDataUrl) ||
                    s?.signatureDataUrl ||
                    (isCur ? data?.registeredSignature : null)
                  return (
                    <div className="p-1.5 text-center flex flex-col justify-between">
                      <div className="bg-[#bfe6ff] font-bold py-0.5 border-b border-slate-900 text-[7.5pt] uppercase">
                        VERIFIKASI (SAFETY DEPT)
                      </div>
                      <div className="h-14 flex items-center justify-center my-1">
                        {sigUrl ? (
                          <img src={sigUrl} alt="TTD" className="max-h-12 object-contain" />
                        ) : (
                          <span className="text-[7pt] text-slate-400 italic">Ditandatangani Digital</span>
                        )}
                      </div>
                      <div className="border-t border-slate-900 pt-1 font-bold">
                        {s?.approverName || data?.authorizedByName || 'NAMA & TANDA TANGAN'}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* ── CATATAN FOOTER ── */}
              <div className="p-2 text-[7pt] space-y-0.5 bg-slate-50 flex items-start justify-between">
                <div>
                  <span className="font-bold block text-slate-900">CATATAN :</span>
                  <div>1. Ijin kerja ini hanya berlaku untuk satu area kerja saja.</div>
                  <div>2. Ijin kerja ini selalu berada ditempat kerja</div>
                  <div>3. Dilarang melakukan pekerjaan sebelum ada ijin kerja</div>
                </div>
                <div className="text-right text-slate-500 font-mono text-[6.5pt] pt-1 shrink-0">
                  No. Form: CP-F-SHE-026 / P-HSE-SOP-031.00
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

      {/* ── Floating Dialog Lampiran Dokumen Pendukung PTW ── */}
      <Dialog open={isAttachmentModalOpen} onOpenChange={setIsAttachmentModalOpen}>
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="size-5 text-teal-600" />
              Lampiran Dokumen Pendukung PTW
            </DialogTitle>
            <div className="text-xs text-slate-500">
              No. Izin Kerja: <span className="font-semibold text-slate-700">{data?.permitNumber || token}</span> • {data?.projectName || data?.description || 'Izin Kerja Aman'}
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Attachment list */}
            {data?.attachments && Array.isArray(data.attachments) && data.attachments.length > 0 ? (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-700">
                  File Terlampir ({data.attachments.length})
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.attachments.map((att: any, idx: number) => {
                    let name = 'Dokumen Lampiran'
                    let url = ''
                    if (typeof att === 'object' && att !== null) {
                      name = att.name || name
                      url = att.url || ''
                    } else if (typeof att === 'string') {
                      if (att.includes('||')) {
                        const [n, ...rest] = att.split('||')
                        name = n
                        url = rest.join('||')
                      } else {
                        try {
                          const p = JSON.parse(att)
                          name = p.name || name
                          url = p.url || ''
                        } catch {
                          name = att.split('/').pop() || att
                          url = att.startsWith('http') || att.startsWith('data:') ? att : ''
                        }
                      }
                    }
                    const isImg = url && (url.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif)$/i.test(name || url))
                    return (
                      <div
                        key={idx}
                        className="flex flex-col justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors gap-2"
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="p-2 rounded-lg bg-white border border-slate-200 shrink-0">
                            <FileText className="size-5 text-teal-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate" title={name}>
                              {name}
                            </p>
                            <p className="text-[10px] text-slate-500">Lampiran Dokumen #{idx + 1}</p>
                          </div>
                        </div>

                        {isImg && url ? (
                          <div
                            className="group relative rounded-lg overflow-hidden border border-slate-200 bg-white max-h-48 flex items-center justify-center p-1 cursor-pointer"
                            onClick={() => {
                              setZoomImage({ url, title: name })
                              setImageScale(1)
                              setImageRotation(0)
                            }}
                            title="Klik untuk melihat & memperbesar gambar"
                          >
                            <img
                              src={url}
                              alt={name}
                              className="max-h-44 w-full object-contain rounded transition-transform duration-200 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold backdrop-blur-[1px] rounded-lg">
                              <ZoomIn className="size-4" />
                              <span>Klik untuk Zoom</span>
                            </div>
                          </div>
                        ) : null}

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-200/60">
                          {isImg && url && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setZoomImage({ url, title: name })
                                setImageScale(1)
                                setImageRotation(0)
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200"
                            >
                              <ZoomIn className="size-3.5" /> Zoom
                            </Button>
                          )}
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              download={name}
                              className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 transition-colors"
                            >
                              <Download className="size-3.5" /> Unduh / Buka
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400 italic">File tersimpan</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center bg-slate-50/50 space-y-2">
                <FileText className="size-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">Belum ada lampiran dokumen pendukung</p>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  Dokumen pendukung seperti JSA, Sertifikat Keahlian, atau Foto Area kerja belum diunggah untuk PTW ini.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAttachmentModalOpen(false)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox / Zoom Image Preview Modal */}
      <Dialog
        open={Boolean(zoomImage)}
        onOpenChange={(v) => {
          if (!v) {
            setZoomImage(null)
            setImageScale(1)
            setImageRotation(0)
          }
        }}
      >
        <DialogContent className="max-w-4xl sm:max-w-5xl bg-slate-950/95 border-slate-800 p-4 text-white rounded-2xl shadow-2xl">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800 text-left">
            <div className="min-w-0 flex-1 pr-4">
              <DialogTitle className="text-sm font-bold text-white truncate">
                {zoomImage?.title || 'Preview Lampiran Dokumen'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Gunakan tombol di atas, scroll mouse, atau double-click untuk zoom in/out
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImageScale((s) => Math.max(0.5, Number((s - 0.25).toFixed(2))))}
                className="h-8 px-2.5 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs gap-1"
                title="Zoom Out"
              >
                <ZoomOut className="size-3.5" />
              </Button>
              <span className="text-xs font-mono text-slate-300 w-12 text-center select-none">
                {Math.round(imageScale * 100)}%
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImageScale((s) => Math.min(4, Number((s + 0.25).toFixed(2))))}
                className="h-8 px-2.5 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs gap-1"
                title="Zoom In"
              >
                <ZoomIn className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setImageRotation((r) => (r + 90) % 360)}
                className="h-8 px-2.5 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs gap-1"
                title="Putar / Rotate"
              >
                <RotateCw className="size-3.5" />
              </Button>
              {(imageScale !== 1 || imageRotation !== 0) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImageScale(1)
                    setImageRotation(0)
                  }}
                  className="h-8 px-2.5 bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs gap-1"
                  title="Reset Zoom & Rotasi"
                >
                  <RefreshCw className="size-3.5" /> Reset
                </Button>
              )}
              {zoomImage?.url && (
                <a
                  href={zoomImage.url}
                  download={zoomImage.title}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center h-8 px-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-semibold gap-1 transition"
                  title="Unduh Gambar Asli"
                >
                  <Download className="size-3.5" />
                </a>
              )}
            </div>
          </DialogHeader>
          <div
            className="flex items-center justify-center p-2 min-h-[50vh] max-h-[72vh] overflow-auto bg-slate-900/90 rounded-xl border border-slate-800/80 cursor-grab active:cursor-grabbing select-none"
            onWheel={(e) => {
              e.preventDefault()
              if (e.deltaY < 0) {
                setImageScale((s) => Math.min(4, Number((s + 0.15).toFixed(2))))
              } else {
                setImageScale((s) => Math.max(0.5, Number((s - 0.15).toFixed(2))))
              }
            }}
            onDoubleClick={() => setImageScale((s) => (s === 1 ? 2 : 1))}
          >
            {zoomImage?.url && (
              <img
                src={zoomImage.url}
                alt={zoomImage.title}
                style={{
                  transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[68vh] w-auto max-w-full rounded object-contain"
                draggable={false}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
