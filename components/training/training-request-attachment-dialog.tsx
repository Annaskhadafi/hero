'use client'

import React, { useState, useEffect } from 'react'
import { HeroFormDialog } from '@/components/templates'
import { uploadFile } from '@/app/actions/upload'
import { updateTrainingRequestAttachment } from '@/app/actions/training-requests'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Upload,
  FileText,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react'

interface TrainingRequestAttachmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: number
  requestNumber: string
  trainingTitle: string
  providerName?: string
  currentAttachmentUrl?: string | null
  currentAttachmentName?: string | null
  onSuccess?: () => void
}

export function TrainingRequestAttachmentDialog({
  open,
  onOpenChange,
  requestId,
  requestNumber,
  trainingTitle,
  providerName,
  currentAttachmentUrl,
  currentAttachmentName,
  onSuccess,
}: TrainingRequestAttachmentDialogProps) {
  const [attachmentUrl, setAttachmentUrl] = useState<string>('')
  const [attachmentName, setAttachmentName] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setAttachmentUrl(currentAttachmentUrl || '')
      setAttachmentName(currentAttachmentName || '')
    }
  }, [open, currentAttachmentUrl, currentAttachmentName])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('uploadTarget', 'training-requests')
      formData.append('folder', 'training-requests')

      const res = await uploadFile(formData)
      if (res && res.success && res.url) {
        setAttachmentUrl(res.url)
        setAttachmentName(file.name)
        toast.success(`Berkas ${file.name} berhasil diunggah`)
      } else {
        toast.error(res?.error || 'Gagal mengunggah berkas ke server')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan saat upload berkas')
    } finally {
      setIsUploading(false)
      if (e.target) {
        e.target.value = ''
      }
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!attachmentUrl) {
      toast.error('Silakan pilih dan unggah berkas penawaran terlebih dahulu.')
      return
    }

    setIsSaving(true)
    try {
      const res = await updateTrainingRequestAttachment({
        requestId,
        attachmentUrl,
        attachmentName: attachmentName || 'Berkas Penawaran Training',
      })

      if (res.success) {
        toast.success(res.message || 'Berkas penawaran berhasil disimpan.')
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast.error(res.error || 'Gagal menyimpan berkas penawaran.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyimpan berkas penawaran.')
    } finally {
      setIsSaving(false)
    }
  }

  const isExcel = attachmentName.toLowerCase().endsWith('.xlsx') || attachmentName.toLowerCase().endsWith('.xls')

  return (
    <HeroFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Lampirkan / Ganti Berkas Penawaran"
      description="Unggah proposal penawaran, silabus biaya, atau dokumen peserta dari vendor training."
      onSubmit={handleSave}
      submitLabel="Simpan Lampiran"
      cancelLabel="Batal"
      isSubmitting={isSaving || isUploading}
      maxWidth="lg"
    >
      <div className="space-y-4 py-1">
        {/* Summary Card */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 font-medium">
            <span>Nomor Pengajuan</span>
            <span className="font-bold text-[#003461]">{requestNumber}</span>
          </div>
          <div className="flex items-center justify-between text-slate-700">
            <span>Judul Training</span>
            <span className="font-semibold text-right max-w-xs truncate">{trainingTitle}</span>
          </div>
          {providerName && (
            <div className="flex items-center justify-between text-slate-500">
              <span>Penyelenggara</span>
              <span className="text-right">{providerName}</span>
            </div>
          )}
        </div>

        {/* Existing / Uploaded File Status */}
        {attachmentUrl ? (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {isExcel ? (
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-semibold text-emerald-900 break-all">
                    {attachmentName || 'Berkas Terlampir'}
                  </div>
                  <div className="text-[11px] text-emerald-700 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Berkas siap disimpan ke sistem
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <a
                  href={resolveUploadUrl(attachmentUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-50 text-blue-700 rounded border text-[11px] font-medium shadow-2xs transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Buka
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAttachmentUrl('')
                    setAttachmentName('')
                  }}
                  className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                  title="Hapus berkas"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Pengajuan ini belum memiliki berkas penawaran terlampir.</span>
          </div>
        )}

        {/* File Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 block">
            Pilih Berkas Penawaran / Proposal Baru
          </label>
          <div className="flex items-center gap-3">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              <span className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-blue-50 hover:bg-blue-100 text-[#003461] rounded-md text-xs font-semibold border border-blue-200 transition-colors shadow-2xs">
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> Mengunggah...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 text-blue-600" />
                    {attachmentUrl ? 'Ganti Berkas File' : 'Pilih Berkas Lampiran'}
                  </>
                )}
              </span>
            </label>
          </div>
          <p className="text-[11px] text-slate-500">
            Format yang didukung: <strong>PDF, Excel (.xlsx/.xls), Word (.docx), JPG, PNG</strong> (Maksimal 15MB). Berkas tersimpan secara persisten melalui proxy sistem.
          </p>
        </div>
      </div>
    </HeroFormDialog>
  )
}
