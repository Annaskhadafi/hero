'use client'

import React, { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SignaturePad } from '@/components/signature-pad'
import { TrainingRequestFormPdf } from './training-request-form-pdf'
import {
  approveTrainingRequestStep,
  rejectTrainingRequestStep,
} from '@/app/actions/training-requests'
import {
  Check,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Loader2,
  Printer,
  ShieldCheck,
  Building,
  Calendar,
  DollarSign,
  User,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TrainingRequestApprovalDialogProps {
  request: any
  approvals: any[]
  currentApproval?: any
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function TrainingRequestApprovalDialog({
  request,
  approvals = [],
  currentApproval,
  trigger,
  onSuccess,
}: TrainingRequestApprovalDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [remarks, setRemarks] = useState('')
  const [activeTab, setActiveTab] = useState<'form' | 'details'>('form')

  const activeApproval = currentApproval || approvals.find((a) => a.stepOrder === request.currentStepOrder) || approvals[0]
  const isApproved = activeApproval?.status === 'approved'

  const handleApprove = () => {
    if (!signatureDataUrl && !activeApproval?.signatureDataUrl) {
      toast.error('Mohon bubuhkan tanda tangan digital Anda terlebih dahulu.')
      return
    }

    startTransition(async () => {
      const res = await approveTrainingRequestStep(activeApproval.approvalToken || activeApproval.id, {
        signatureDataUrl: signatureDataUrl || activeApproval.signatureDataUrl || '',
        remarks: remarks || 'Disetujui',
      })

      if (res.success) {
        toast.success(`Pengajuan Training #${request.requestNumber} pada tahap ${activeApproval.roleLabel} berhasil disetujui!`)
        setOpen(false)
        onSuccess?.()
      } else {
        toast.error(res.error || 'Gagal menyetujui pengajuan.')
      }
    })
  }

  const handleReject = () => {
    if (!remarks.trim()) {
      toast.error('Mohon masukkan alasan penolakan pada kolom catatan.')
      return
    }

    startTransition(async () => {
      const res = await rejectTrainingRequestStep(activeApproval.approvalToken || activeApproval.id, {
        remarks,
      })

      if (res.success) {
        toast.error(`Pengajuan Training #${request.requestNumber} ditolak.`)
        setOpen(false)
        onSuccess?.()
      } else {
        toast.error(res.error || 'Gagal menolak pengajuan.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="bg-[#003461] hover:bg-[#00284d] text-white text-xs gap-1.5 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Review &amp; Tanda Tangan</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-7xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-100">
        {/* Header */}
        <DialogHeader className="p-4 bg-white border-b flex flex-row items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-[#003461]" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Persetujuan Pengajuan Training</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                  {request?.requestNumber}
                </span>
                <Badge variant="outline" className="text-[11px] bg-slate-50">
                  {activeApproval?.roleLabel || `Step ${request?.currentStepOrder}`}
                </Badge>
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                {request?.trainingTitle} &bull; Pemohon: {request?.requesterName} ({request?.department})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs text-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Content Split: Left PDF Document, Right Approval Action Panel */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Document View (8 cols) */}
          <div className="lg:col-span-8 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center border-r border-slate-200">
            <div className="w-full max-w-[800px]">
              <TrainingRequestFormPdf
                request={request}
                approvals={approvals}
                liveSignatureUrl={signatureDataUrl}
                currentStepOrder={activeApproval?.stepOrder}
              />
            </div>
          </div>

          {/* Right Action Panel (4 cols) */}
          <div className="lg:col-span-4 bg-white flex flex-col overflow-y-auto p-5 space-y-5">
            {/* Progress Stepper */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#003461]" /> Alur Persetujuan
              </h4>

              <div className="space-y-2 border-l-2 border-slate-200 pl-3 ml-1.5 text-xs">
                {approvals.map((appr) => {
                  const isDone = appr.status === 'approved'
                  const isCurr = appr.stepOrder === request.currentStepOrder && request.status === 'pending'
                  const isRej = appr.status === 'rejected'

                  return (
                    <div key={appr.id} className="relative pb-2">
                      <div
                        className={cn(
                          'absolute -left-[19px] top-0.5 w-3.5 h-3.5 rounded-full border-2 bg-white',
                          isDone && 'border-emerald-600 bg-emerald-600',
                          isCurr && 'border-blue-600 bg-blue-100 animate-pulse',
                          isRej && 'border-rose-600 bg-rose-600',
                          !isDone && !isCurr && !isRej && 'border-slate-300'
                        )}
                      />
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 text-[11px]">
                          {appr.stepOrder}. {appr.roleLabel}
                        </span>
                        {isDone ? (
                          <span className="text-[10px] text-emerald-600 font-bold">Disetujui</span>
                        ) : isCurr ? (
                          <span className="text-[10px] text-blue-600 font-bold">Menunggu Anda</span>
                        ) : isRej ? (
                          <span className="text-[10px] text-rose-600 font-bold">Ditolak</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Menunggu</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {appr.approverName} ({appr.approverTitle || '-'})
                      </div>
                      {appr.approvedAt && (
                        <div className="text-[10px] text-slate-400">
                          {new Date(appr.approvedAt).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Signature Area */}
            {!isApproved && request.status === 'pending' ? (
              <div className="space-y-4 pt-3 border-t">
                <div>
                  <Label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>Tanda Tangan Digital Anda *</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Tahap: {activeApproval?.roleLabel}
                    </span>
                  </Label>
                  <p className="text-[11px] text-slate-500 mt-0.5 mb-2">
                    Bubuhkan tanda tangan Anda di canvas bawah ini:
                  </p>

                  <div className="border border-slate-300 rounded-lg p-2 bg-slate-50">
                    <SignaturePad
                      height={120}
                      onDataUrlChange={(url) => setSignatureDataUrl(url)}
                      autoUseProfileSignature={true}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Catatan / Komentar</Label>
                  <Textarea
                    placeholder="Masukkan catatan persetujuan atau alasan revisi..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={2}
                    className="text-xs mt-1"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    onClick={handleApprove}
                    disabled={isPending}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm font-semibold"
                  >
                    {isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Setujui Dokumen</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReject}
                    disabled={isPending}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50 text-xs gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Tolak</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-900">
                  {request.status === 'approved'
                    ? 'Pengajuan Ini Telah Selesai & Disetujui Penuh'
                    : 'Tahap Ini Sudah Anda Setujui'}
                </p>
                <p className="text-[11px] text-emerald-700">
                  Semua tanda tangan tersimpan secara sah dalam format ISO.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
