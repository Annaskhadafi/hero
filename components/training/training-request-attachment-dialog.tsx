'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  Paperclip,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrainingRequestAttachmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: number
  requestNumber: string
  trainingTitle: string
  providerName?: string
  currentAttachmentUrl?: string | null
  currentAttachmentName?: string | null
  onSuccess?: (data: { attachmentUrl: string | null; attachmentName: string | null }) => void
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
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setAttachmentUrl(currentAttachmentUrl || '')
      setAttachmentName(currentAttachmentName || '')
      setIsDragging(false)
    }
  }, [open, currentAttachmentUrl, currentAttachmentName])

  const processFile = async (file: File) => {
    if (!file) return

    // 15MB limit
    if (file.size > 15 * 1024 * 1024) {
      toast.error('Ukuran berkas melebihi batas maksimal 15MB.')
      return
    }

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
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
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
        onSuccess?.({
          attachmentUrl: res.attachmentUrl ?? attachmentUrl,
          attachmentName: res.attachmentName ?? (attachmentName || 'Berkas Penawaran Training'),
        })
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

  const handleRemoveExisting = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus berkas penawaran dari pengajuan ini?')) return
    setIsSaving(true)
    try {
      const res = await updateTrainingRequestAttachment({
        requestId,
        attachmentUrl: null,
        attachmentName: null,
      })
      if (res.success) {
        setAttachmentUrl('')
        setAttachmentName('')
        toast.success('Berkas penawaran berhasil dihapus.')
        onSuccess?.({ attachmentUrl: null, attachmentName: null })
      } else {
        toast.error(res.error || 'Gagal menghapus berkas penawaran.')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus berkas penawaran.')
    } finally {
      setIsSaving(false)
    }
  }

  const isExcel =
    attachmentName.toLowerCase().endsWith('.xlsx') ||
    attachmentName.toLowerCase().endsWith('.xls') ||
    attachmentName.toLowerCase().endsWith('.csv')

  return (
    <HeroFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Lampirkan / Ganti Berkas Penawaran"
      description="Unggah proposal penawaran, silabus biaya, atau dokumen peserta resmi dari vendor training."
      onSubmit={handleSave}
      submitLabel="Simpan Lampiran"
      cancelLabel="Batal"
      isSubmitting={isSaving || isUploading}
      maxWidth="lg"
    >
      <div className="space-y-4 py-1">
        {/* Summary Card */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
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
              <span className="text-right font-medium text-slate-800">{providerName}</span>
            </div>
          )}
        </div>

        {/* Existing / Uploaded File Status */}
        {attachmentUrl ? (
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-lg space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                  {isExcel ? (
                    <FileSpreadsheet className="w-5 h-5" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-emerald-950 truncate max-w-xs">
                    {attachmentName || 'Berkas Penawaran Terlampir'}
                  </div>
                  <div className="text-[11px] text-emerald-700 flex items-center gap-1 mt-0.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Berkas siap disimpan &amp; diakses di sistem
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={resolveUploadUrl(attachmentUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-blue-700 rounded-md border border-slate-200 text-xs font-semibold shadow-2xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Buka
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveExisting}
                  className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  title="Hapus berkas"
                  disabled={isSaving}
                >
                  <Trash2 className="w-4 h-4" />
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

        {/* Dropzone / File Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 block">
            {attachmentUrl ? 'Ganti dengan Berkas Baru' : 'Unggah Berkas Penawaran Vendor'}
          </label>

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2',
              isDragging
                ? 'border-blue-500 bg-blue-50/70 scale-[0.99]'
                : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 bg-slate-50/50',
              isUploading && 'opacity-60 cursor-not-allowed pointer-events-none'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
            />

            {isUploading ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="text-xs font-semibold text-blue-900">
                  Mengunggah berkas ke S3 Cloud Storage...
                </span>
                <span className="text-[11px] text-slate-500">Mohon tunggu sebentar</span>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-0.5">
                  <Upload className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-slate-800">
                  <span className="text-blue-700 underline">Klik untuk memilih file</span> atau seret file ke sini
                </div>
                <p className="text-[11px] text-slate-500">
                  Mendukung berkas <strong>PDF, Excel (.xlsx/.xls), Word (.docx), JPG, PNG</strong> (Maksimal 15MB)
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </HeroFormDialog>
  )
}
