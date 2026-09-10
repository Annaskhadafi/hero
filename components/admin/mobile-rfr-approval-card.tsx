'use client'

import React, { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SignaturePad } from '@/components/signature-pad'
import { RfrDocumentPreview } from '@/components/rfr-document-preview'
import { approveRfrStep, rejectRfrStep, revertRfrStep, getRfrDetail } from '@/app/actions/rfr'
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
  Download,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { AdminStatusBadge } from '@/components/admin-status-badge'
import type { getApprovalCenterData } from '@/lib/approval-workspace'

type RfrInboxItem = NonNullable<Awaited<ReturnType<typeof getApprovalCenterData>>['rfrInboxItems']>[number]

/**
 * Komponen pembungkus dokumen RFR A4 yang secara responsif mengecilkan
 * ukuran dokumen agar muat 100% di layar mobile tanpa terpotong.
 */
function ScaledRfrDocument({
  rfr,
  approvals,
  liveSignatureUrl,
  currentStepOrder,
  onOpenFullscreen,
}: {
  rfr: any
  approvals: any[]
  liveSignatureUrl?: string | null
  currentStepOrder?: number | null
  onOpenFullscreen: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)
  const [measuredHeight, setMeasuredHeight] = useState(320)
  const baseDocWidth = 800

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return
    const updateScaleAndHeight = () => {
      if (containerRef.current && contentRef.current) {
        const width = containerRef.current.clientWidth
        if (width > 0) {
          const calculatedScale = width / baseDocWidth
          setScale(calculatedScale)
          const actualHeight = contentRef.current.scrollHeight || 700
          setMeasuredHeight(Math.ceil(actualHeight * calculatedScale))
        }
      }
    }
    updateScaleAndHeight()
    const observer = new ResizeObserver(updateScaleAndHeight)
    observer.observe(containerRef.current)
    if (contentRef.current) observer.observe(contentRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-bold text-slate-800 flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-sky-600" />
          <span>Lembar Dokumen Resmi RFR</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onOpenFullscreen}
          className="h-7 px-2 text-[11px] font-bold text-sky-700 hover:text-sky-900 hover:bg-sky-100 flex items-center gap-1"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          <span>Perbesar</span>
        </Button>
      </div>

      {/* Frame Dokumen yang pas (Tinggi Otomatis Menyesuaikan Konten) */}
      <div
        ref={containerRef}
        onClick={onOpenFullscreen}
        className="w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm cursor-pointer relative group"
        style={{ height: `${measuredHeight}px` }}
        title="Klik untuk melihat lembar dokumen ukuran penuh"
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
          className="pointer-events-none select-none"
        >
          <RfrDocumentPreview
            rfr={rfr}
            approvals={approvals}
            liveSignatureUrl={liveSignatureUrl}
            currentStepOrder={currentStepOrder}
          />
        </div>

        {/* Hover hint */}
        <div className="absolute inset-0 bg-sky-900/0 hover:bg-sky-900/10 transition-colors flex items-center justify-center pointer-events-none">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow">
            Klik untuk Memperbesar
          </span>
        </div>
      </div>
    </div>
  )
}

export function MobileRfrApprovalCard({ item }: { item: RfrInboxItem }) {
  const router = useRouter()
  const [remarks, setRemarks] = useState('')
  const [liveSignatureUrl, setLiveSignatureUrl] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isSignPadOpen, setIsSignPadOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [detailData, setDetailData] = useState<{ rfr: any; approvals: any[] } | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(true)

  useEffect(() => {
    let isMounted = true
    const targetId = (item as any).rfrId || item.id
    setIsLoadingDetail(true)
    getRfrDetail(targetId)
      .then((res) => {
        if (isMounted && res) {
          setDetailData(res)
        }
      })
      .catch((err) => {
        console.error('Error fetching RFR detail for mobile card:', err)
      })
      .finally(() => {
        if (isMounted) setIsLoadingDetail(false)
      })
    return () => {
      isMounted = false
    }
  }, [item])

  const [pendingAction, setPendingAction] = useState<'approved' | 'reverted' | 'rejected' | null>(null)
  const currentStep = detailData?.approvals?.find((a) => a.stepOrder === item.stepOrder)
  const stepToken =
    currentStep?.approvalToken ||
    (currentStep as any)?.token ||
    (item as any).approvalToken ||
    (item as any).token ||
    item.approvalId ||
    ''

  const handleDecision = (decision: 'approved' | 'reverted' | 'rejected') => {
    if (!stepToken) {
      toast.error('Token persetujuan tidak ditemukan.')
      return
    }

    if (decision === 'approved' && !liveSignatureUrl) {
      toast.error('Mohon bubuhkan tanda tangan digital sebelum menyetujui.')
      setIsSignPadOpen(true)
      return
    }

    if ((decision === 'reverted' || decision === 'rejected') && remarks.trim().length < 3) {
      toast.error('Catatan persetujuan wajib diisi minimal 3 karakter untuk meminta revisi atau menolak.')
      return
    }

    setPendingAction(decision)
    startTransition(async () => {
      try {
        let res: any
        if (decision === 'approved') {
          res = await approveRfrStep(stepToken, liveSignatureUrl || '', remarks.trim())
        } else if (decision === 'reverted') {
          res = await revertRfrStep(stepToken, remarks.trim())
        } else {
          res = await rejectRfrStep(stepToken, remarks.trim())
        }

        if (res && res.success) {
          toast.success(
            decision === 'approved'
              ? 'Pengajuan RFR berhasil disetujui.'
              : decision === 'reverted'
              ? 'Permintaan revisi RFR berhasil dikirimkan.'
              : 'Pengajuan RFR telah ditolak.'
          )
          router.refresh()
        } else {
          toast.error(res?.error || 'Gagal memproses persetujuan RFR.')
        }
      } catch (err: any) {
        toast.error(err?.message || 'Terjadi kesalahan sistem.')
      } finally {
        setPendingAction(null)
      }
    })
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-3.5 sm:p-4 shadow-sm border border-slate-200">
      {/* Header Info Card */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black tracking-[0.18em] text-[#0284c7] uppercase">
            REQUEST FOR RECRUITMENT (RFR)
          </p>
          <p className="mt-1 text-base font-black tracking-tight text-[#082033]">
            {item.rfrNumber}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-[#486275]">
            {item.roleLabel} • Step {item.stepOrder}/{item.totalSteps}
          </p>
        </div>
        <AdminStatusBadge value={item.dueState} />
      </div>

      {/* 1. BAGIAN ATAS: LEMBAR DOKUMEN RESMI LANGSUNG TAMPIL FULL DI DALAM KARTU */}
      {isLoadingDetail ? (
        <div className="flex flex-col items-center justify-center p-8 text-slate-500 bg-slate-50 rounded-xl">
          <Loader2 className="h-6 w-6 animate-spin text-sky-600 mb-2" />
          <p className="text-xs font-semibold">Memuat lembar dokumen RFR...</p>
        </div>
      ) : detailData?.rfr ? (
        <ScaledRfrDocument
          rfr={detailData.rfr}
          approvals={detailData.approvals}
          liveSignatureUrl={liveSignatureUrl}
          currentStepOrder={item.stepOrder || detailData.rfr?.currentStepOrder}
          onOpenFullscreen={() => setIsPreviewOpen(true)}
        />
      ) : (
        <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
          Gagal memuat pratinjau dokumen.
        </div>
      )}

      {/* 2. BAGIAN BAWAH: BUTTON BUAT ISI TANDA TANGAN */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
            <PenLine className="h-4 w-4 text-sky-600 shrink-0" />
            <span>Tanda Tangan Digital Pemeriksa</span>
          </div>

          <Button
            type="button"
            variant={liveSignatureUrl ? 'outline' : 'default'}
            size="sm"
            onClick={() => setIsSignPadOpen(!isSignPadOpen)}
            className={`w-full sm:w-auto h-8 rounded-lg px-3 text-xs font-bold transition-all justify-center ${
              liveSignatureUrl
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'bg-sky-600 text-white hover:bg-sky-700'
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
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-2 text-xs text-emerald-900">
            <img
              src={liveSignatureUrl}
              alt="Tanda Tangan"
              className="h-9 max-w-[120px] object-contain rounded bg-white p-0.5 border border-emerald-200"
            />
            <span className="text-[11px] font-semibold">Tanda tangan siap disubmit ke dokumen.</span>
          </div>
        )}

        {/* Canvas Tanda Tangan Digital (Bisa di-expand/collapse) */}
        {isSignPadOpen && (
          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] text-slate-500">
              Goreskan tanda tangan Anda pada kanvas sentuh di bawah ini:
            </p>
            <div className="bg-white rounded-lg overflow-hidden border border-slate-300 shadow-inner">
              <SignaturePad
                onDataUrlChange={(url) => {
                  setLiveSignatureUrl(url)
                  if (url) {
                    // Update state
                  }
                }}
                height={140}
              />
            </div>
            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSignPadOpen(false)}
                className="h-7 px-2.5 text-[11px] font-bold"
              >
                Selesai Gores
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 3. BAGIAN BAWAH: BUTTON APPROVE, REJECT, REVERT */}
      <div className="space-y-2 pt-1 border-t border-slate-100">
        <Button
          type="button"
          onClick={() => handleDecision('approved')}
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full h-10 rounded-xl shadow-xs flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-60"
        >
          {pendingAction === 'approved' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          <span>{pendingAction === 'approved' ? 'Memproses Persetujuan...' : 'Setujui Pengajuan'}</span>
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            onClick={() => handleDecision('reverted')}
            disabled={isPending}
            variant="outline"
            className="h-9 border-amber-400 text-amber-800 hover:bg-amber-50 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-60"
          >
            {pendingAction === 'reverted' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
            ) : (
              <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
            )}
            <span>{pendingAction === 'reverted' ? 'Mengembalikan...' : 'REVERT'}</span>
          </Button>
          <Button
            type="button"
            onClick={() => handleDecision('rejected')}
            disabled={isPending}
            variant="secondary"
            className="h-9 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-xl border border-rose-200 flex items-center justify-center gap-1.5 transition-all disabled:opacity-60"
          >
            {pendingAction === 'rejected' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-rose-600" />
            )}
            <span>{pendingAction === 'rejected' ? 'Menolak...' : 'REJECT'}</span>
          </Button>
        </div>
      </div>

      {/* 4. BAGIAN PALING BAWAH: CATATAN APPROVAL */}
      <div className="space-y-1.5 pt-2 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800">
            Catatan Approval
          </label>
          <span className="text-[10px] text-slate-400 font-medium">(Opsional untuk Setujui)</span>
        </div>
        <Textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={2}
          disabled={isPending}
          placeholder="Tuliskan catatan persetujuan atau alasan jika Revert / Reject..."
          className="resize-none text-xs bg-slate-50 border-slate-200 rounded-xl focus:bg-white"
        />
        <p className="text-[10.5px] text-amber-700 font-semibold flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0 text-amber-600" />
          <span>Catatan wajib diisi sebelum menekan tombol REVERT atau REJECT.</span>
        </p>
      </div>

      {/* Fullscreen Document Preview Modal */}
      {isPreviewOpen && detailData?.rfr && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-3 sm:p-5 rounded-2xl">
            <DialogHeader className="p-2 border-b border-slate-100 flex flex-row items-center justify-between">
              <DialogTitle className="text-sm font-bold text-slate-900">
                Dokumen Resmi: {item.rfrNumber}
              </DialogTitle>
            </DialogHeader>
            <div className="p-2 bg-slate-100 flex justify-center overflow-x-auto rounded-xl">
              <RfrDocumentPreview
                rfr={detailData.rfr}
                approvals={detailData.approvals}
                liveSignatureUrl={liveSignatureUrl}
                currentStepOrder={item.stepOrder || detailData.rfr?.currentStepOrder}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
