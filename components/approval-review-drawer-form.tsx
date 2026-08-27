'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SignaturePad } from '@/components/signature-pad'
import { FormWoDocumentPreviewDialog } from '@/components/form-wo-document-preview-dialog'
import { ApprovalRequestDetails } from '@/components/approval-request-details'
import { reviewApprovalAction } from '@/app/dashboard/admin-actions'
import { FileText, PenLine, CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { getApprovalCenterData } from '@/lib/approval-workspace'

type ApprovalInboxItem = Awaited<
  ReturnType<typeof getApprovalCenterData>
>['inboxGroups'][number]['items'][number]

type ApprovalGroup = Awaited<
  ReturnType<typeof getApprovalCenterData>
>['inboxGroups'][number]

interface ApprovalReviewDrawerFormProps {
  item: ApprovalInboxItem
  group: ApprovalGroup
}

export function ApprovalReviewDrawerForm({ item, group }: ApprovalReviewDrawerFormProps) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [liveSignatureUrl, setLiveSignatureUrl] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isFormWo = Boolean(
    item.repairFormWo ||
      item.activityType === 'Work Order' ||
      item.requestKindLabel?.toLowerCase().includes('work order') ||
      item.title?.toLowerCase().includes('wo')
  )

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
            ? 'Pengajuan berhasil disetujui.'
            : decision === 'needs_correction'
              ? 'Pengajuan berhasil di-Revert.'
              : 'Pengajuan telah di-Reject.'
        )
        router.refresh()
      } catch (err: any) {
        toast.error(err?.message || 'Gagal memproses approval.')
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Tombol Quick Preview Dokumen Resmi Form WO */}
      {isFormWo && (
        <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-3.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-800">
                  Dokumen Resmi Form WO
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  {item.repairFormWo?.noPengajuan || item.requestNumber || item.title}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
              className="border-sky-300 bg-white font-semibold text-sky-700 hover:bg-sky-100 hover:text-sky-900"
            >
              <FileText className="mr-1.5 h-4 w-4" />
              Lihat Preview Dokumen
            </Button>
          </div>
        </div>
      )}

      {/* Detail Konten Approval */}
      <ApprovalRequestDetails item={item} />

      {/* Catatan Terakhir */}
      <div className="rounded-xl bg-slate-50 p-3.5 text-sm border border-slate-200">
        <p className="font-semibold text-slate-700">Catatan terakhir</p>
        <p className="mt-1 text-slate-500">
          {item.lastNote ? item.lastNote.message : 'Belum ada komentar approval sebelumnya.'}
        </p>
      </div>

      {/* Input Catatan Keputusan */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700">Catatan Approval</label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          disabled={isPending}
          placeholder="Tambahkan catatan jika diperlukan..."
          className="resize-none"
        />
      </div>

      {/* Area Tanda Tangan Digital */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <PenLine className="h-4 w-4 text-sky-600" />
            <span>Tanda Tangan Digital Approver</span>
          </div>
          {signatureFile && (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Tanda tangan tersimpan
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Bubuhkan tanda tangan Anda di canvas bawah ini sebelum menekan tombol <strong>Setujui</strong>.
        </p>
        <div className="bg-white rounded-lg overflow-hidden border border-slate-200 shadow-inner">
          <SignaturePad
            onSignatureChange={setSignatureFile}
            onDataUrlChange={setLiveSignatureUrl}
          />
        </div>
      </div>

      {/* Tombol Aksi Decision */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button
          type="button"
          onClick={() => handleDecision('approved')}
          disabled={isPending}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          size="sm"
        >
          {isPending ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
          )}
          Setujui
        </Button>
        <Button
          type="button"
          onClick={() => handleDecision('needs_correction')}
          disabled={isPending}
          variant="outline"
          size="sm"
          className="border-amber-400 text-amber-800 hover:bg-amber-50 font-semibold"
        >
          <AlertCircle className="mr-1.5 h-4 w-4 text-amber-600" />
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
          <XCircle className="mr-1.5 h-4 w-4 text-rose-600" />
          REJECT
        </Button>
      </div>

      {/* Dialog Preview Dokumen Resmi Form WO */}
      {isFormWo && (
        <FormWoDocumentPreviewDialog
          open={isPreviewOpen}
          onOpenChange={setIsPreviewOpen}
          doc={item.repairFormWo ?? null}
          liveSignatureUrl={liveSignatureUrl}
          currentLevel={item.level}
        />
      )}
    </div>
  )
}
