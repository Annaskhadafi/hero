'use client'

import React, { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FiveRDocumentPreview } from '@/components/five-r/five-r-document-preview'
import { MobileSignaturePadDialog } from '@/components/mobile/mobile-signature-pad-dialog'
import { getUserSignatureAction } from '@/app/actions/user-signature'
import {
  approveFiveRReportAction,
  revertFiveRReportAction,
  rejectFiveRReportAction,
  getFiveRReportDetailAction,
} from '@/app/dashboard/quality/5r/actions'
import {
  FileText,
  FileCheck,
  MapPin,
  ExternalLink,
  PenTool,
  Check,
  RotateCcw,
  X,
  Loader2,
  Download,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AdminStatusBadge } from '@/components/admin-status-badge'
import { downloadElementAsPdf } from '@/lib/pdf-download'
import type { getApprovalCenterData } from '@/lib/approval-workspace'

type ApprovalInboxItem = Awaited<
  ReturnType<typeof getApprovalCenterData>
>['inboxGroups'][number]['items'][number]

type ApprovalGroup = Awaited<
  ReturnType<typeof getApprovalCenterData>
>['inboxGroups'][number]

interface MobileFiveRApprovalCardProps {
  item: ApprovalInboxItem
  group: ApprovalGroup
}

function formatDate(val: Date | string | null | undefined): string {
  if (!val) return '—'
  const d = typeof val === 'string' ? new Date(val) : val
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

export function MobileFiveRApprovalCard({ item, group }: MobileFiveRApprovalCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pdfRef = useRef<HTMLDivElement>(null)

  const [remarks, setRemarks] = useState('')
  const [userSignature, setUserSignature] = useState<string | null>(null)
  const [isSigModalOpen, setIsSigModalOpen] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [autoOpened, setAutoOpened] = useState(false)
  const [previewZoom, setPreviewZoom] = useState(1.0)
  const [isPending, startTransition] = useTransition()
  const [pendingDecision, setPendingDecision] = useState<'approved' | 'reverted' | 'rejected' | null>(null)

  const [isLoadingDetail, setIsLoadingDetail] = useState(true)
  const [detailData, setDetailData] = useState<{
    report: any
    findings: any[]
    approvalLogs: any[]
    approvalRoute: any[]
  } | null>(null)

  const matchedReportNumber = item.title?.match(/5R-[\w-]+/i)?.[0]
  const reportIdentifier =
    item.fiveRReport?.id ||
    (item as any).fiveRReportId ||
    item.requestNumber ||
    item.activityCode ||
    matchedReportNumber

  // Automatically open review dialog if matched via URL query params (?openDoc=5R-...)
  useEffect(() => {
    if (autoOpened) return
    const openDocParam =
      searchParams?.get('openDoc') ||
      searchParams?.get('doc') ||
      searchParams?.get('documentNumber') ||
      searchParams?.get('reviewId') ||
      searchParams?.get('sessionId') ||
      searchParams?.get('id')

    if (openDocParam) {
      const norm = openDocParam.trim().toLowerCase()
      const repNumNorm = (detailData?.report?.reportNumber || item.fiveRReport?.reportNumber || matchedReportNumber || '').toLowerCase()
      const idNorm = String(reportIdentifier || '').toLowerCase()
      const titleNorm = String(item.title || '').toLowerCase()
      const reqNumNorm = String(item.requestNumber || '').toLowerCase()

      if (
        (repNumNorm && (repNumNorm === norm || norm.includes(repNumNorm) || repNumNorm.includes(norm))) ||
        (idNorm && (idNorm === norm || norm.includes(idNorm) || idNorm.includes(norm))) ||
        (reqNumNorm && (reqNumNorm === norm || norm.includes(reqNumNorm) || reqNumNorm.includes(norm))) ||
        (titleNorm && titleNorm.includes(norm))
      ) {
        setAutoOpened(true)
        setIsReviewOpen(true)
      }
    }
  }, [searchParams, detailData?.report?.reportNumber, item.fiveRReport?.reportNumber, reportIdentifier, matchedReportNumber, item.title, item.requestNumber, autoOpened])

  useEffect(() => {
    let isMounted = true
    setIsLoadingDetail(true)

    // Load registered profile signature
    getUserSignatureAction().then((res) => {
      if (isMounted && res.success && res.signatureDataUrl) {
        setUserSignature(res.signatureDataUrl)
      }
    })

    if (reportIdentifier) {
      getFiveRReportDetailAction(reportIdentifier)
        .then((res) => {
          if (isMounted && res.success && res.report) {
            setDetailData({
              report: res.report,
              findings: res.findings || [],
              approvalLogs: res.approvalLogs || [],
              approvalRoute: res.approvalRoute || [],
            })
          }
        })
        .catch((err) => {
          console.error('Error fetching 5R detail for mobile approval card:', err)
        })
        .finally(() => {
          if (isMounted) setIsLoadingDetail(false)
        })
    } else {
      setIsLoadingDetail(false)
    }

    return () => {
      isMounted = false
    }
  }, [reportIdentifier])

  const report = detailData?.report || item.fiveRReport
  const findings = detailData?.findings || []
  const approvalLogs = detailData?.approvalLogs || []
  const approvalRoute = detailData?.approvalRoute || []
  const currentLevel = item.level || report?.currentApprovalLevel || 1
  const targetReportId = report?.id || (typeof reportIdentifier === 'number' ? reportIdentifier : 0)

  const isReverted = report?.status === 'reverted' || item.isReverted
  const isRejected = report?.status === 'rejected' || (item as any).status === 'rejected'

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return
    try {
      toast.info('Menyiapkan file PDF...')
      await downloadElementAsPdf(pdfRef.current, `Laporan-5R-${report?.reportNumber || 'Doc'}.pdf`, {
        orientation: 'portrait',
      })
      toast.success('PDF berhasil diunduh.')
    } catch (err: any) {
      toast.error('Gagal mengunduh PDF: ' + (err?.message || 'Error tidak diketahui'))
    }
  }

  const handleDecision = (decision: 'approved' | 'reverted' | 'rejected') => {
    if (!targetReportId) {
      toast.error('ID Laporan 5R tidak valid.')
      return
    }

    if (decision === 'approved' && !userSignature) {
      toast.error('Mohon daftarkan tanda tangan digital sebelum menyetujui.')
      setIsSigModalOpen(true)
      return
    }

    if (decision !== 'approved' && remarks.trim().length < 3) {
      toast.error('Catatan persetujuan wajib diisi minimal 3 karakter untuk meminta revisi atau menolak.')
      return
    }

    setPendingDecision(decision)
    startTransition(async () => {
      try {
        let res: any
        if (decision === 'approved') {
          res = await approveFiveRReportAction(targetReportId, remarks.trim(), userSignature || undefined)
        } else if (decision === 'reverted') {
          res = await revertFiveRReportAction(targetReportId, remarks.trim())
        } else {
          res = await rejectFiveRReportAction(targetReportId, remarks.trim())
        }

        if (res && res.success) {
          toast.success(
            decision === 'approved'
              ? 'Laporan 5R berhasil disetujui.'
              : decision === 'reverted'
              ? 'Laporan 5R dikembalikan untuk revisi.'
              : 'Laporan 5R telah ditolak.'
          )
          setRemarks('')
          setIsReviewOpen(false)
          router.refresh()
        } else {
          toast.error(res?.message || 'Gagal memproses keputusan 5R.')
        }
      } catch (err: any) {
        toast.error(err?.message || 'Terjadi kesalahan sistem saat memproses approval.')
      } finally {
        setPendingDecision(null)
      }
    })
  }

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border bg-white shadow-sm transition',
        isReverted ? 'border-amber-200 bg-amber-50/10' : 'border-indigo-100 hover:border-indigo-300'
      )}
    >
      {/* ── CARD DALAM FEED APPROVAL (100% PERSIS DAILY ACTIVITY) ── */}
      <div className="p-4 space-y-3">
        {/* Top Header: Badge Kategori & Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div>
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700 border border-indigo-200">
                <FileCheck className="h-3 w-3" />
                5R AUDIT
              </span>
              <p className="mt-0.5 font-mono text-xs font-bold text-slate-900">
                {report?.reportNumber || item.title || '5R-...'}
              </p>
            </div>
          </div>
          <AdminStatusBadge value={isRejected ? 'rejected' : isReverted ? 'reverted' : report?.status || 'submitted'} />
        </div>

        {/* Employee Name & Location */}
        <div className="space-y-1">
          <p className="text-sm font-extrabold text-slate-900">
            {report?.auditorName || group?.requesterName || item.employeeName || 'Auditor 5R'}
          </p>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="h-3 w-3 text-slate-400" />
            {report?.siteName || group?.siteName || 'Balikpapan'} • Area {report?.picAreaName || item.location || 'Area Kerja'}
          </p>
        </div>

        {/* Tahap Approval & Batas Waktu Box */}
        <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 space-y-1">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-500">Tahap Approval:</span>
            <span className="font-bold text-indigo-700 text-right">
              {item.currentStepLabel || (currentLevel === 1 ? 'PJO Site Review' : 'Head of CPI Review')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-500">Batas Waktu:</span>
            <span className="font-medium text-slate-700 text-right">
              Due {formatDate(item.dueAt || report?.createdAt || new Date())}
            </span>
          </div>
        </div>

        {/* Action Button: BUKA TTD ↗ */}
        <Button
          type="button"
          onClick={() => setIsReviewOpen(true)}
          className={cn(
            'flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition active:scale-98 cursor-pointer',
            isRejected
              ? 'bg-rose-600 hover:bg-rose-700'
              : isReverted
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-[#003461] hover:bg-[#00274a]'
          )}
        >
          {isRejected ? 'LIHAT DETAIL DOKUMEN ↗' : isReverted ? 'REVISI DOKUMEN ↗' : 'BUKA TTD ↗'}
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* ── MODAL WORKSPACE REVIEW & APPROVAL (100% PERSIS DAILY ACTIVITY) ── */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-xl w-full h-[92vh] max-h-[92vh] p-0 flex flex-col overflow-hidden bg-slate-100 border-slate-200 rounded-2xl">
          {/* Header Dialog */}
          <div className="px-3 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-slate-900 truncate">
                  Review &amp; Approval Dokumen
                </h2>
                <p className="text-[10px] text-slate-500 truncate">
                  {report?.auditorName || group?.requesterName || item.employeeName} • {formatDate(report?.createdAt || item.submittedAt)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Stepper 1/1 */}
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                <span className="text-[10px] font-mono font-bold text-slate-700 px-1.5 py-0.5">
                  1/1
                </span>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[10px] font-semibold gap-1 rounded-lg bg-[#e2e8f0] border-slate-200 text-slate-800"
                onClick={handleDownloadPdf}
              >
                <Download className="size-3" /> UNDUH PDF
              </Button>

              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Body Content: Dokumen Sheet Preview + Form Aksi Dibawahnya */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 bg-slate-100 space-y-3">
            {isLoadingDetail ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="size-8 animate-spin text-[#003461]" />
                <p className="font-semibold text-xs">Memuat dokumen 5R...</p>
              </div>
            ) : !report ? (
              <div className="py-20 text-center text-slate-500 text-xs">
                Data dokumen 5R tidak ditemukan.
              </div>
            ) : (
              <>
                {/* Zoom Action Bar */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-white/90 backdrop-blur-xs rounded-xl border border-slate-200 shadow-2xs max-w-lg mx-auto">
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
                      onClick={() => setPreviewZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                      className="h-7 w-7 p-0 text-xs font-extrabold text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title="Zoom In"
                    >
                      +
                    </Button>
                    {previewZoom !== 1.0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewZoom(1.0)}
                        className="h-7 px-2 text-[10px] font-bold text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>

                {/* 1. PDF Document Preview Container */}
                <div className="flex justify-center items-start overflow-hidden p-1 w-full max-w-full">
                  <div
                    ref={pdfRef}
                    id="mobile-5r-preview-sheet"
                    className="relative mx-auto shrink-0 bg-white shadow-md border border-slate-200 rounded-sm origin-top transition-transform duration-200 w-[210mm] min-h-[297mm]"
                    style={{
                      transform: `scale(${0.44 * previewZoom})`,
                      marginBottom: `${-160 + (previewZoom - 1.0) * 125}mm`,
                    }}
                  >
                    <FiveRDocumentPreview
                      report={report}
                      findings={findings}
                      approvalLogs={approvalLogs}
                      approvalRoute={approvalRoute}
                      currentStepLevel={currentLevel}
                      liveSignatureUrl={userSignature}
                      hideToolbar={true}
                    />
                  </div>
                </div>

                {/* 2. Mobile Action Form & Signature (Tepat di bawah PDF Preview) */}
                <div className="space-y-3 max-w-lg mx-auto bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  {/* Informasi Dokumen Box */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-xs">Informasi Dokumen</span>
                      <Badge
                        className={cn(
                          "font-bold text-[10px] px-2 py-0.5 rounded-md uppercase",
                          isReverted
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-emerald-100 text-emerald-800 border-emerald-300"
                        )}
                      >
                        {report?.status || 'SUBMITTED'}
                      </Badge>
                    </div>
                    <p>
                      <span className="text-slate-400">Auditor:</span>{' '}
                      <span className="font-bold text-slate-900">
                        {report?.auditorName || group?.requesterName || item.employeeName}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Nomor Laporan:</span>{' '}
                      <span className="font-bold text-indigo-700">
                        {report?.reportNumber || item.requestNumber || '-'}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Tanggal / Periode:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {formatDate(report?.auditDate || report?.createdAt)} • {report?.auditPeriod || '-'}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Area &amp; Site:</span>{' '}
                      <span className="font-semibold text-slate-800">
                        {report?.picAreaName || item.location || '-'} • {report?.siteName || group?.siteName || '-'}
                      </span>
                    </p>
                  </div>

                  {/* TTD Approver Status & Quick Register / Edit */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <PenTool className="size-3.5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-800">Tanda Tangan Approver</p>
                        <p className="text-[10px] text-slate-400">
                          {userSignature ? 'TTD Digital Aktif' : 'Belum Terdaftar'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsSigModalOpen(true)}
                      className={cn(
                        "h-7 text-[10px] font-bold rounded-lg px-2 gap-1 active:scale-95 cursor-pointer",
                        userSignature
                          ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                          : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                      )}
                    >
                      {userSignature ? 'UBAH TTD' : '+ Buat TTD'}
                    </Button>
                  </div>

                  {/* Catatan Approval Input */}
                  <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-800 block">
                      Catatan Approval
                    </label>
                    <Textarea
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Tulis catatan / feedback approval di sini (opsional)..."
                      className="text-xs h-16 min-h-16 resize-none rounded-lg"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      AKSI DOKUMEN INI (1 / 1)
                    </p>
                    <Button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDecision('approved')}
                      className="w-full bg-[#003461] hover:bg-[#002647] text-white font-bold text-xs h-9 rounded-lg shadow-xs cursor-pointer gap-1.5"
                    >
                      {pendingDecision === 'approved' ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      APPROVE
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleDecision('reverted')}
                        className="font-bold text-xs h-8 text-slate-700 border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer gap-1"
                      >
                        {pendingDecision === 'reverted' ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <RotateCcw className="size-3" />
                        )}
                        REVERT
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => handleDecision('rejected')}
                        className="font-bold text-xs h-8 text-rose-600 border-slate-200 hover:bg-rose-50 rounded-lg cursor-pointer gap-1"
                      >
                        {pendingDecision === 'rejected' ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <X className="size-3" />
                        )}
                        REJECT
                      </Button>
                    </div>
                  </div>

                  {/* Tutup Reviewer Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsReviewOpen(false)}
                    className="w-full text-xs font-bold h-9 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer mt-2"
                  >
                    TUTUP REVIEWER
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Pad Modal */}
      <MobileSignaturePadDialog
        isOpen={isSigModalOpen}
        onClose={() => setIsSigModalOpen(false)}
        onSignatureSaved={(sigUrl) => {
          setUserSignature(sigUrl)
          setIsSigModalOpen(false)
          toast.success('Tanda tangan digital berhasil disimpan!')
        }}
        onSignatureDeleted={() => {
          setUserSignature(null)
          setIsSigModalOpen(false)
          toast.success('Tanda tangan digital telah dihapus.')
        }}
      />
    </article>
  )
}
