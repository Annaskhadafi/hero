'use client'

import React, { useState, useRef, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SignaturePad } from '@/components/signature-pad'
import { RfrDocumentPreview } from '@/components/rfr-document-preview'
import { approveRfrStep, rejectRfrStep, revertRfrStep, getRfrDetail } from '@/app/actions/rfr'
import {
  PenLine,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Download,
  FileText,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

type RfrInboxItem = {
  id: number
  rfrNumber: string
  positionTitle: string
  requestorName: string
  sectionDepartment: string
  numberOfPersons: number
  stepOrder: number
  totalSteps: number
  roleLabel: string
  dueState: string
  dueAt: Date
  url: string
  token?: string
}

interface RfrApprovalDialogProps {
  item: RfrInboxItem
  trigger?: React.ReactNode
}

function ScaledDocumentWrapper({
  rfr,
  approvals,
  currentStepOrder,
  liveSignatureUrl,
}: {
  rfr: any
  approvals: any[]
  currentStepOrder?: number
  liveSignatureUrl: string | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.48)

  useEffect(() => {
    if (!containerRef.current) return
    const updateScale = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth
        // 800px standard A4 portrait width
        const computedScale = Math.min(1.1, Math.max(0.4, (availableWidth - 24) / 800))
        setScale(computedScale)
      }
    }
    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="w-full overflow-hidden flex justify-center py-2">
      <div
        style={{
          width: '800px',
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          marginBottom: `calc((800px * 1.414 * ${scale}) - (800px * 1.414))`,
        }}
        className="shrink-0 bg-white rounded-xl shadow-md border border-slate-200"
      >
        <RfrDocumentPreview
          rfr={rfr}
          approvals={approvals}
          currentStepOrder={currentStepOrder}
          liveSignatureUrl={liveSignatureUrl}
        />
      </div>
    </div>
  )
}

export function RfrApprovalDialog({ item, trigger }: RfrApprovalDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [remarks, setRemarks] = useState('')
  const [liveSignatureUrl, setLiveSignatureUrl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [detailData, setDetailData] = useState<{ rfr: any; approvals: any[] } | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  useEffect(() => {
    if (open && item.id) {
      setIsLoadingDetail(true)
      getRfrDetail(item.id)
        .then((res) => {
          if (res) {
            setDetailData(res)
          }
        })
        .catch((err) => {
          console.error('Error fetching RFR detail:', err)
        })
        .finally(() => {
          setIsLoadingDetail(false)
        })
    }
  }, [open, item.id])

  const [pendingAction, setPendingAction] = useState<'approved' | 'reverted' | 'rejected' | null>(null)
  const currentStep = detailData?.approvals?.find((a) => a.stepOrder === item.stepOrder)
  const stepToken =
    currentStep?.approvalToken ||
    (currentStep as any)?.token ||
    (item as any).approvalToken ||
    (item as any).token ||
    (item as any).approvalId ||
    ''

  const handleDecision = (decision: 'approved' | 'reverted' | 'rejected') => {
    if (!stepToken) {
      toast.error('Token persetujuan tidak ditemukan.')
      return
    }

    if (decision === 'approved' && !liveSignatureUrl) {
      toast.error('Mohon bubuhkan tanda tangan digital sebelum menyetujui.')
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
              ? 'Pengajuan RFR berhasil disetujui!'
              : decision === 'reverted'
              ? 'Pengajuan RFR berhasil dikembalikan untuk revisi.'
              : 'Pengajuan RFR telah ditolak.'
          )
          setOpen(false)
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            type="button"
            size="dense"
            className="bg-[#003f78] hover:bg-[#002f5a] text-white font-bold text-xs rounded-xl shadow-xs"
          >
            Review & TTD
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-7xl w-[98vw] sm:w-[95vw] h-[95vh] sm:h-[93vh] flex flex-col p-3 sm:p-4 bg-slate-100 overflow-hidden rounded-2xl">
        {/* Header Dialog */}
        <DialogHeader className="p-1 pb-2 border-b border-slate-200 flex flex-row items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-sky-600" />
                <span>Approval: {item.rfrNumber}</span>
              </DialogTitle>
              <Badge className="bg-sky-50 text-sky-800 border-sky-300 font-bold text-[10px] py-0.5 px-2">
                Step {item.stepOrder}/{item.totalSteps}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {item.positionTitle} • {item.requestorName} ({item.sectionDepartment})
            </p>
          </div>

          <a
            href={`/api/hc/rfr/${item.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 py-1 px-2.5 rounded-xl shadow-2xs transition-all"
          >
            <Download className="h-3.5 w-3.5 text-sky-600" />
            <span>PDF</span>
          </a>
        </DialogHeader>

        {/* Side-by-Side Layout on Desktop (Left: Document, Right: Signature, Remarks & Action Buttons) */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-3 sm:gap-4 min-h-0 overflow-hidden">
          {/* 1. Kiri: Full Dokumen Preview */}
          <div className="rounded-2xl bg-slate-200/70 p-2 sm:p-3 flex justify-center items-start shadow-inner border border-slate-300/60 overflow-y-auto h-full">
            {isLoadingDetail ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-500">
                <Loader2 className="h-7 w-7 animate-spin text-sky-600 mb-2" />
                <p className="text-xs font-semibold">Memuat lembar dokumen RFR...</p>
              </div>
            ) : detailData?.rfr ? (
              <ScaledDocumentWrapper
                rfr={detailData.rfr}
                approvals={detailData.approvals}
                currentStepOrder={currentStep?.stepOrder || item.stepOrder || detailData.rfr.currentStepOrder}
                liveSignatureUrl={liveSignatureUrl}
              />
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Gagal memuat pratinjau dokumen.
              </div>
            )}
          </div>

          {/* 2. Kanan: Panel Tindakan Persetujuan, Papan TTD, Catatan & Tombol */}
          <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-sm flex flex-col justify-between overflow-y-auto h-full space-y-3">
            <div className="space-y-3">
              {/* Area Tanda Tangan Digital */}
              <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                    <PenLine className="h-3.5 w-3.5 text-sky-600" />
                    <span>Tanda Tangan Digital Approver *</span>
                  </div>
                  {liveSignatureUrl && (
                    <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Tersimpan
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Bubuhkan tanda tangan pada area bawah ini sebelum menyetujui.
                </p>
                <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                  <SignaturePad
                    onDataUrlChange={setLiveSignatureUrl}
                    height={140}
                  />
                </div>
              </div>

              {/* Catatan Approval Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Catatan Approval</label>
                  <span className="text-[10px] text-slate-400 font-medium">(Opsional untuk Setujui)</span>
                </div>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  disabled={isPending}
                  placeholder="Tuliskan catatan persetujuan atau alasan jika Revert / Reject..."
                  className="resize-none text-xs bg-slate-50 border-slate-200 rounded-xl focus:bg-white"
                />
                <p className="text-[10.5px] text-amber-700 font-semibold flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0 text-amber-600" />
                  <span>Catatan wajib diisi sebelum menekan tombol REVERT atau REJECT.</span>
                </p>
              </div>
            </div>

            {/* Action Decision Buttons */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                onClick={() => handleDecision('approved')}
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full h-10 rounded-xl shadow-xs flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-60 cursor-pointer"
              >
                {pendingAction === 'approved' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                <span>{pendingAction === 'approved' ? 'Memproses Persetujuan...' : 'Setujui Pengajuan (Approve)'}</span>
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={() => handleDecision('reverted')}
                  disabled={isPending}
                  variant="outline"
                  className="h-9 border-amber-400 text-amber-800 hover:bg-amber-50 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {pendingAction === 'reverted' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  )}
                  <span>{pendingAction === 'reverted' ? 'Mengembalikan...' : 'REVERT (Revisi)'}</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDecision('rejected')}
                  disabled={isPending}
                  variant="secondary"
                  className="h-9 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-xl border border-rose-200 flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {pendingAction === 'rejected' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  )}
                  <span>{pendingAction === 'rejected' ? 'Menolak...' : 'REJECT (Tolak)'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
