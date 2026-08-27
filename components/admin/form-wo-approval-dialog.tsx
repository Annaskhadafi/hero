'use client'

import React, { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useReactToPrint } from 'react-to-print'
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
import { FormWoDocumentView } from '@/components/form-wo-document-preview-dialog'
import { reviewApprovalAction } from '@/app/dashboard/admin-actions'
import { Printer, PenLine, CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { getApprovalCenterData } from '@/lib/approval-workspace'

type ApprovalInboxItem = Awaited<
  ReturnType<typeof getApprovalCenterData>
>['inboxGroups'][number]['items'][number]

type ApprovalGroup = Awaited<
  ReturnType<typeof getApprovalCenterData>
>['inboxGroups'][number]

interface FormWoApprovalDialogProps {
  item: ApprovalInboxItem
  group: ApprovalGroup
}

export function FormWoApprovalDialog({ item, group }: FormWoApprovalDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [liveSignatureUrl, setLiveSignatureUrl] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const printDocRef = useRef<HTMLDivElement>(null)

  const doc = item.repairFormWo ?? {
    noPengajuan: item.requestNumber || item.title,
    jenisPengajuan: item.title?.toLowerCase().includes('service') ? 'service' : 'repair',
    customer: item.requestKindLabel || '-',
    site: item.siteName || '-',
    pemohon: item.requesterName || '-',
    totalAmount: item.overtimeLabel || '0',
    tanggalPengajuan: item.startTime,
  }

  const handleDecision = (decision: 'approved' | 'needs_correction' | 'rejected') => {
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('approvalId', String(item.approvalId))
        formData.append('decision', decision)
        formData.append('note', note.trim())
        if (signatureFile) {
          formData.append('signatureFile', signatureFile)
        }

        await reviewApprovalAction(formData)
        toast.success(
          decision === 'approved'
            ? 'Pengajuan Work Order berhasil disetujui.'
            : decision === 'needs_correction'
              ? 'Pengajuan Work Order berhasil di-Revert.'
              : 'Pengajuan Work Order telah di-Reject.'
        )
        setOpen(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Gagal memproses approval.')
      }
    })
  }

  const handlePrint = useReactToPrint({
    contentRef: printDocRef,
    documentTitle: doc?.noPengajuan || 'Form WO',
    pageStyle: `
      @page { size: A4 portrait; margin: 10mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    `
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="dense">
          Review
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[98vw] lg:max-w-[1400px] w-[98vw] h-[92vh] flex flex-col p-4 sm:p-6 gap-4 bg-slate-100 border border-slate-300 rounded-2xl shadow-2xl">
        {/* Header Modal */}
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-3">
          <div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Review Dokumen Form Work Order — {item.title}
            </DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              {group.requesterName} • {group.siteName} • {item.currentStepLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePrint()}
              className="border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="mr-1.5 h-4 w-4" />
              Cetak / Unduh PDF
            </Button>
          </div>
        </DialogHeader>

        {/* 2-Column Split View: Left = Document WYSIWYG Preview, Right = Review Action Form */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4 min-h-0 overflow-hidden">
          {/* Left Column: Official Document WYSIWYG View */}
          <div className="overflow-y-auto pr-1 h-full rounded-xl">
            <FormWoDocumentView
              doc={doc}
              containerRef={printDocRef}
              liveSignatureUrl={liveSignatureUrl}
              currentLevel={item.level || 1}
            />
          </div>

          {/* Right Column: Review Action Panel & Signature Canvas */}
          <div className="flex flex-col gap-3.5 overflow-y-auto pr-1 h-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            {/* Quick Summary Card */}
            <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-200">
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Ringkasan Pengajuan
              </p>
              <div className="grid grid-cols-[80px_1fr] gap-1 text-slate-600">
                <span className="font-semibold text-slate-700">No. WO:</span>
                <span className="font-mono text-slate-900">{doc.noPengajuan || '-'}</span>
                <span className="font-semibold text-slate-700">Customer:</span>
                <span className="text-slate-900">{doc.customer || '-'}</span>
                <span className="font-semibold text-slate-700">Site:</span>
                <span className="text-slate-900">{doc.site || item.siteName || '-'}</span>
                <span className="font-semibold text-slate-700">Pemohon:</span>
                <span className="text-slate-900">{doc.pemohon || item.requesterName || '-'}</span>
                <span className="font-semibold text-slate-700">Total:</span>
                <span className="font-bold text-emerald-700">
                  {doc.totalAmount
                    ? `Rp ${Number(doc.totalAmount).toLocaleString('id-ID')}`
                    : '-'}
                </span>
              </div>
            </div>

            {/* Catatan Terakhir */}
            <div className="rounded-xl bg-slate-50 p-3 text-xs border border-slate-200">
              <p className="font-bold text-slate-700">Catatan Terakhir Approval</p>
              <p className="mt-1 text-slate-500">
                {item.lastNote ? item.lastNote.message : 'Belum ada catatan approval sebelumnya.'}
              </p>
            </div>

            {/* Area Tanda Tangan Digital */}
            <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                  <PenLine className="h-3.5 w-3.5 text-sky-600" />
                  <span>Tanda Tangan Digital Approver</span>
                </div>
                {signatureFile && (
                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Tersimpan
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Bubuhkan tanda tangan pada area bawah ini sebelum menyetujui.
              </p>
              <div className="bg-white rounded-lg overflow-hidden border border-slate-200 shadow-inner">
                <SignaturePad
                  onSignatureChange={setSignatureFile}
                  onDataUrlChange={setLiveSignatureUrl}
                />
              </div>
            </div>

            {/* Catatan Keputusan Input */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Catatan Approval</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                disabled={isPending}
                placeholder="Tambahkan catatan jika diperlukan..."
                className="resize-none text-xs"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2 mt-auto border-t border-slate-200">
              <Button
                type="button"
                onClick={() => handleDecision('approved')}
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold w-full"
                size="sm"
              >
                {isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                )}
                Setujui Pengajuan
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  onClick={() => handleDecision('needs_correction')}
                  disabled={isPending}
                  variant="outline"
                  size="sm"
                  className="border-amber-400 text-amber-800 hover:bg-amber-50 font-semibold"
                >
                  <AlertCircle className="mr-1 h-3.5 w-3.5 text-amber-600" />
                  REVERT
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDecision('rejected')}
                  disabled={isPending}
                  variant="secondary"
                  size="sm"
                  className="bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold border border-rose-200"
                >
                  <XCircle className="mr-1 h-3.5 w-3.5 text-rose-600" />
                  REJECT
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
