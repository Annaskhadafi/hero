'use client'

import * as React from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'

import { uploadFile } from '@/app/actions/upload'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { cn } from '@/lib/utils'

export interface HeroFileUploadProps {
  value?: string | null
  onChange?: (url: string | null) => void
  label?: string
  description?: string
  accept?: string
  maxSizeMb?: number
  disabled?: boolean
  className?: string
}

export function HeroFileUpload({
  value,
  onChange,
  label = 'Unggah Dokumen / Foto',
  description = 'Format JPG, PNG, PDF (Maks. 10MB)',
  accept = 'image/*,application/pdf',
  maxSizeMb = 10,
  disabled = false,
  className,
}: HeroFileUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const resolvedUrl = value ? resolveUploadUrl(value) : null
  const isPdf = value ? value.toLowerCase().endsWith('.pdf') : false

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`Ukuran file melebihi batas ${maxSizeMb}MB.`)
      return
    }

    try {
      setIsUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)

      const res = await uploadFile(formData)
      if (res && res.success && res.url) {
        onChange?.(res.url)
      } else {
        setError(res?.error || 'Gagal mengunggah berkas ke server.')
      }
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat upload berkas.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.(null)
    setError(null)
  }

  return (
    <div className={cn('flex flex-col gap-2 w-full', className)}>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
          {label}
        </span>
      )}

      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="hidden"
      />

      {/* Upload Box / Active Preview */}
      {value ? (
        <div className="flex items-center justify-between rounded-xl border border-border/80 bg-white p-3 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            {isPdf ? (
              <div className="flex size-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                <FileText className="size-5" />
              </div>
            ) : (
              <div className="relative size-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolvedUrl || ''}
                  alt="Pratinjau"
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-slate-800">
                {isPdf ? 'Dokumen Terlampir (PDF)' : 'Foto / Gambar Terlampir'}
              </p>
              <p className="truncate text-[11px] text-slate-400 font-mono">
                {value.split('/').pop()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="dense"
              onClick={() => setIsPreviewOpen(true)}
              className="h-9 gap-1.5 text-xs text-blue-600 hover:text-blue-700"
            >
              <Eye className="size-3.5" />
              <span>Lihat</span>
            </Button>

            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="dense"
                onClick={handleRemove}
                className="h-9 size-9 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-5 text-center transition-all',
            !disabled && !isUploading && 'cursor-pointer hover:border-blue-400 hover:bg-blue-50/20',
            disabled && 'opacity-60 cursor-not-allowed'
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="size-6 animate-spin text-blue-600" />
              <span className="text-xs font-medium text-slate-600">Mengunggah berkas...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex size-9 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <UploadCloud className="size-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-blue-600 hover:underline">
                  Klik untuk unggah
                </span>{' '}
                <span className="text-xs text-slate-500">atau tarik berkas ke sini</span>
              </div>
              <p className="text-[11px] text-slate-400">{description}</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-500">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Wide Dialog/Iframe Popup for Full Content Preview */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">
              Pratinjau Berkas Terlampir
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 flex max-h-[70vh] min-h-[360px] items-center justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
            {isPdf ? (
              <iframe
                src={resolvedUrl || ''}
                title="Pratinjau Dokumen PDF"
                className="h-[60vh] w-full rounded-lg border-0"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolvedUrl || ''}
                alt="Pratinjau Penuh"
                className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-md"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
