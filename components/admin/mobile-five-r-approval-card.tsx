'use client'

import React, { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SpeechTextarea as Textarea } from '@/components/ui/speech-textarea'
import { SignaturePad } from '@/components/signature-pad'
import { FiveRDocumentPreview } from '@/components/five-r/five-r-document-preview'
import {
  approveFiveRReportAction,
  revertFiveRReportAction,
  rejectFiveRReportAction,
  getFiveRReportDetailAction,
} from '@/app/dashboard/quality/5r/actions'
import {
  FileText,
  PenLine,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Maximize2,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
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

/**
 * Komponen pembungkus dokumen 5R A4 yang secara responsif mengecilkan
 * ukuran dokumen A4 portrait (~800px) agar muat 100% di layar mobile tanpa terpotong.
 */
function ScaledFiveRDocument({
  report,
  findings,
  approvalLogs,
  approvalRoute,
  currentLevel,
  liveSignatureUrl,
  onOpenFullscreen,
}: {
  report: any
  findings: any[]
  approvalLogs: any[]
  approvalRoute: any[]
  currentLevel?: number
  liveSignatureUrl?: string | null
  onOpenFullscreen: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.42)
  const [measuredHeight, setMeasuredHeight] = useState(360)
  const baseDocWidth = 800

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return
    const updateScaleAndHeight = () => {
      if (containerRef.current && contentRef.current) {
        const width = containerRef.current.clientWidth
        if (width > 0) {
          const calculatedScale = width / baseDocWidth
          setScale(calculatedScale)
          const actualHeight = contentRef.current.scrollHeight || 750
          setMeasuredHeight(Math.ceil(actualHeight * calculatedScale))
        }
      }
    }
    updateScaleAndHeight()
    const observer = new ResizeObserver(updateScaleAndHeight)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [report, findings])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-bold text-slate-800 flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-emerald-600" />
          <span>Lembar Audit 5R ({report?.reportNumber || 'Doc'})</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenFullscreen}
          className="h-7 px-2 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 flex items-center gap-1"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span>Perbesar</span>
        </Button>
      </div>

      {/* Frame Dokumen yang diperkecil (Mobile Friendly) */}
      <div
        ref={containerRef}
        onClick={onOpenFullscreen}
        className="w-full overflow-hidden rounded-xl border border-slate-300 bg-slate-100 shadow-inner cursor-pointer relative group"
        title="Klik untuk melihat lembar dokumen ukuran penuh"
      >
        <div
          style={{
            height: `${measuredHeight}px`,
            position: 'relative',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <div
            ref={contentRef}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: `${baseDocWidth}px`,
              position: 'absolute',
              top: 0,
              left: 0,
            }}
            className="pointer-events-none select-none bg-white"
          >
            <FiveRDocumentPreview
              report={report}
              findings={findings}
              approvalLogs={approvalLogs}
              approvalRoute={approvalRoute}
              currentStepLevel={currentLevel}
              liveSignatureUrl={liveSignatureUrl}
            />
          </div>
        </div>

        {/* Hover hint */}
        <div className="absolute inset-0 bg-slate-900/0 hover:bg-slate-900/10 transition-colors flex items-center justify-center pointer-events-none">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow">
            Klik untuk Memperbesar
          </span>
        </div>
      </div>
    </div>
  )
}

export function MobileFiveRApprovalCard({ item, group }: MobileFiveRApprovalCardProps) {
  const router = useRouter()
  const [remarks, setRemarks] = useState('')
  const [liveSignatureUrl, setLiveSignatureUrl] = useState<string | null>(null)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [isSignPadOpen, setIsSignPadOpen] = useState(false)
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)
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

  useEffect(() => {
    let isMounted = true
    setIsLoadingDetail(true)

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

  const handleDecision = (decision: 'approved' | 'reverted' | 'rejected') => {
    if (!targetReportId) {
      toast.error('ID Laporan 5R tidak valid.')
      return
    }

    if (decision === 'approved' && !liveSignatureUrl) {
      toast.error('Mohon bubuhkan tanda tangan digital sebelum menyetujui.')
      setIsSignPadOpen(true)
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
          res = await approveFiveRReportAction(targetReportId, remarks.trim(), liveSignatureUrl || undefined)
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
          setLiveSignatureUrl(null)
          setSignatureFile(null)
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
    <div className="space-y-4 rounded-2xl bg-white p-3.5 sm:p-4 shadow-sm border border-slate-200">
      {/* 1. ATASNYA: LEMBAR DOKUMEN RESMI LANGSUNG DITAMPILKAN SECARA MOBILE FRIENDLY */}
      {isLoadingDetail ? (
        <div className="flex h-36 items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 gap-2">
          <Loader2 className="size-4 animate-spin text-emerald-600" />
          <span>Memuat dokumen 5R...</span>
        </div>
      ) : report ? (
        <ScaledFiveRDocument
          report={report}
          findings={findings}
          approvalLogs={approvalLogs}
          approvalRoute={approvalRoute}
          currentLevel={currentLevel}
          liveSignatureUrl={liveSignatureUrl}
          onOpenFullscreen={() => setIsFullscreenOpen(true)}
        />
      ) : (
        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 border border-slate-200">
          <p className="font-bold text-slate-900">{item.title}</p>
          <p className="text-[11px] text-slate-500 mt-1">{item.currentStepLabel}</p>
        </div>
      )}

      {/* 2. BAWAHNYA: BUTTON TANDA TANGAN DIGITAL */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
            <PenLine className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Tanda Tangan Digital Pemeriksa</span>
          </div>

          <Button
            type="button"
            variant={liveSignatureUrl ? 'outline' : 'default'}
            size="sm"
            onClick={() => setIsSignPadOpen(!isSignPadOpen)}
            className={`w-full sm:w-auto h-8 rounded-lg px-3 text-xs font-bold transition-all justify-center cursor-pointer ${
              liveSignatureUrl
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {liveSignatureUrl ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Ubah Tanda Tangan</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <PenLine className="h-3.5 w-3.5" />
                <span>Tanda Tangani</span>
              </span>
            )}
            {isSignPadOpen ? (
              <ChevronUp className="ml-1 h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="ml-1 h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Preview Tanda Tangan yang sudah dibubuhkan */}
        {liveSignatureUrl && !isSignPadOpen && (
          <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-white p-2 shadow-2xs">
            <div className="h-10 w-24 bg-slate-50 rounded border border-slate-200 flex items-center justify-center p-1 shrink-0">
              <img
                src={liveSignatureUrl}
                alt="Tanda Tangan Digital"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div className="text-xs min-w-0">
              <p className="font-bold text-emerald-800 truncate flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                Tanda tangan siap
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">
                Otomatis tertera di dokumen resmi saat disetujui.
              </p>
            </div>
          </div>
        )}

        {/* Canvas Signature Pad */}
        {isSignPadOpen && (
          <div className="space-y-2 pt-1 animate-in fade-in-50 duration-200">
            <p className="text-[11px] text-slate-500">
              Goreskan tanda tangan Anda dengan jari atau stylus di bawah ini:
            </p>
            <div className="bg-white rounded-xl overflow-hidden border-2 border-dashed border-emerald-300 shadow-inner">
              <SignaturePad
                onSignatureChange={(file) => setSignatureFile(file)}
                onDataUrlChange={(url) => setLiveSignatureUrl(url)}
              />
            </div>
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsSignPadOpen(false)}
                className="h-7 text-xs rounded-md font-semibold cursor-pointer"
              >
                Selesai & Simpan
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 3. BAWAHNYA LAGI: BUTTON APPROVE, REJECT, REVERT */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {/* APPROVE */}
        <Button
          type="button"
          onClick={() => handleDecision('approved')}
          disabled={isPending}
          className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
        >
          {pendingDecision === 'approved' ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          )}
          <span>{pendingDecision === 'approved' ? 'Menyimpan...' : 'Setujui'}</span>
        </Button>

        {/* REVERT */}
        <Button
          type="button"
          onClick={() => handleDecision('reverted')}
          disabled={isPending}
          variant="outline"
          className="h-10 rounded-xl border-amber-400 bg-amber-50/60 text-amber-800 hover:bg-amber-100 font-bold text-xs active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
        >
          {pendingDecision === 'reverted' ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin text-amber-600" />
          ) : (
            <AlertCircle className="mr-1 h-3.5 w-3.5 text-amber-600" />
          )}
          <span>{pendingDecision === 'reverted' ? 'Mengirim...' : 'Revisi'}</span>
        </Button>

        {/* REJECT */}
        <Button
          type="button"
          onClick={() => handleDecision('rejected')}
          disabled={isPending}
          variant="secondary"
          className="h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 font-bold text-xs active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
        >
          {pendingDecision === 'rejected' ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin text-rose-600" />
          ) : (
            <XCircle className="mr-1 h-3.5 w-3.5 text-rose-600" />
          )}
          <span>{pendingDecision === 'rejected' ? 'Menolak...' : 'Tolak'}</span>
        </Button>
      </div>

      {/* 4. DIBAWAHNYA LAGI: CATATAN APPROVAL */}
      <div className="space-y-1">
        <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
          <span>Catatan Persetujuan</span>
          <span className="text-[10px] font-normal text-slate-400">
            (Wajib jika revisi/tolak)
          </span>
        </label>
        <Textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={2}
          disabled={isPending}
          placeholder="Tuliskan catatan persetujuan, instruksi revisi, atau alasan penolakan..."
          className="resize-none text-xs rounded-xl bg-slate-50/60 border-slate-200 focus:bg-white transition-colors w-full"
        />
      </div>

      {/* Dialog Preview Dokumen Penuh A4 jika user klik Perbesar */}
      <Dialog open={isFullscreenOpen} onOpenChange={setIsFullscreenOpen}>
        <DialogContent className="w-[98vw] max-w-4xl h-[92vh] max-h-[92vh] flex flex-col p-3 sm:p-5 bg-white rounded-2xl shadow-2xl overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-200 shrink-0">
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="size-4 text-emerald-600" />
                <span>Dokumen Resmi 5R — {report?.reportNumber}</span>
              </DialogTitle>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {group.requesterName} • {report?.picAreaName || item.title} • {item.currentStepLabel}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreenOpen(false)}
              className="h-8 w-8 p-0 rounded-full"
            >
              <X className="size-4" />
            </Button>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-1 sm:p-3 bg-slate-50 rounded-xl">
            <FiveRDocumentPreview
              report={report}
              findings={findings}
              approvalLogs={approvalLogs}
              approvalRoute={approvalRoute}
              currentStepLevel={currentLevel}
              liveSignatureUrl={liveSignatureUrl}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
