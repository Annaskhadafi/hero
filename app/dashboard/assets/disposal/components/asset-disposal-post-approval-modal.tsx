'use client'

import * as React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  UploadCloud,
  FileText,
  Trash2,
  Loader2,
  CheckCircle2,
  Paperclip,
  Building2,
  Gavel,
  Receipt,
} from 'lucide-react'
import { toast } from 'sonner'
import { uploadFile } from '@/app/actions/upload'
import {
  submitDisposalAuctionDocumentsAction,
  submitDisposalFinanceDocumentsAction,
} from '../actions'

interface UploadedFileItem {
  fileName: string
  fileUrl: string
  fileSize?: number
}

interface AssetDisposalPostApprovalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: any | null
  mode: 'auction' | 'finance'
  onSuccess?: () => void
}

const AUCTION_CHECKLIST_OPTIONS = [
  'Surat keputusan pemenang Lelang',
  'List Peserta lelang beserta harga penawaran dari calon buyer',
  'Surat Pelepasan Hak (untuk kendaraan)',
  'Berita Acara',
  'Bukti Pembayaran',
]

const FINANCE_CHECKLIST_OPTIONS = [
  'Debit Note',
  'Faktur Pajak',
  'Dokumen Disposal SAP',
]

export function AssetDisposalPostApprovalModal({
  open,
  onOpenChange,
  item,
  mode,
  onSuccess,
}: AssetDisposalPostApprovalModalProps) {
  const [selectedChecklist, setSelectedChecklist] = React.useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFileItem[]>([])
  const [notes, setNotes] = React.useState('')
  const [isUploading, setIsUploading] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const isAuction = mode === 'auction'
  const checklistOptions = isAuction ? AUCTION_CHECKLIST_OPTIONS : FINANCE_CHECKLIST_OPTIONS

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedChecklist([])
      setUploadedFiles([])
      setNotes('')
      setIsSubmitting(false)
      setIsUploading(false)
    }
  }, [open, mode])

  if (!item) return null

  const handleToggleChecklist = (opt: string) => {
    setSelectedChecklist((prev) =>
      prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
    )
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('prefix', 'asset-disposal')

        const res = await uploadFile(formData)
        if (res.success && res.url) {
          setUploadedFiles((prev) => [
            ...prev,
            {
              fileName: file.name,
              fileUrl: res.url,
              fileSize: file.size,
            },
          ])
          toast.success(`Berhasil mengunggah: ${file.name}`)
        } else {
          toast.error(res.message || `Gagal mengunggah ${file.name}`)
        }
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan unggah: ' + (err?.message || ''))
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveFile = (idx: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async () => {
    if (selectedChecklist.length === 0) {
      toast.error('Pilih minimal 1 jenis dokumen pada checklist lampiran.')
      return
    }

    setIsSubmitting(true)
    try {
      let res: any
      if (isAuction) {
        res = await submitDisposalAuctionDocumentsAction({
          disposalId: item.id,
          checklist: selectedChecklist,
          files: uploadedFiles,
          notes,
        })
      } else {
        res = await submitDisposalFinanceDocumentsAction({
          disposalId: item.id,
          checklist: selectedChecklist,
          files: uploadedFiles,
          notes,
        })
      }

      if (res.success) {
        toast.success(res.message || 'Lampiran berhasil disubmit.')
        onOpenChange(false)
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.message || 'Gagal menyimpan lampiran.')
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + (err?.message || ''))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="border-b pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg text-white ${
                isAuction ? 'bg-amber-600' : 'bg-purple-600'
              }`}
            >
              {isAuction ? <Gavel className="size-5" /> : <Receipt className="size-5" />}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {isAuction
                  ? 'Submit Lampiran Hasil Lelang (Procurement)'
                  : 'Submit Dokumen Keuangan (Finance & Accounting)'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-mono mt-0.5">
                Pengajuan: {item.disposalNumber} • {item.assetName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto py-3 text-xs pr-1">
          {/* Instruksi Banner */}
          <div
            className={`rounded-lg p-3 border text-xs leading-relaxed ${
              isAuction
                ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                : 'bg-purple-50/80 border-purple-200 text-purple-950'
            }`}
          >
            <p className="font-semibold flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="size-4 shrink-0" />
              {isAuction
                ? 'Checklist Berkas Lelang & Pemenang (Wajib Diserahkan)'
                : 'Checklist Berkas Administrasi Keuangan (Wajib Diserahkan)'}
            </p>
            <p className="text-[11px] text-slate-600">
              Centang dokumen yang Anda lampirkan dan unggah berkas fisik/digitalnya pada kolom
              di bawah. Anda dapat mengunggah lebih dari 1 file sekaligus.
            </p>
          </div>

          {/* Checklist Dokumen */}
          <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
            <span className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
              1. Pilih Jenis Lampiran yang Disertakan <span className="text-rose-500">*</span>:
            </span>
            <div className="space-y-2 pt-1">
              {checklistOptions.map((opt) => {
                const checked = selectedChecklist.includes(opt)
                return (
                  <label
                    key={opt}
                    onClick={() => handleToggleChecklist(opt)}
                    className={`flex items-center gap-3 p-2.5 rounded-md border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'bg-white border-blue-500 text-slate-900 font-semibold shadow-xs'
                        : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => handleToggleChecklist(opt)}
                    />
                    <span>{opt}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Multi-File Upload Box */}
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3.5">
            <div className="flex items-center justify-between">
              <span className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                2. Unggah Berkas Dokumen <span className="text-rose-500">*</span>:
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {uploadedFiles.length} Berkas Terunggah
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-lg p-5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20"
            >
              {isUploading ? (
                <div className="flex flex-col items-center justify-center gap-2 text-slate-600">
                  <Loader2 className="size-6 animate-spin text-blue-600" />
                  <span className="text-xs font-medium">Sedang mengunggah berkas...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5 text-slate-600">
                  <UploadCloud className="size-7 text-blue-600" />
                  <p className="text-xs font-semibold text-slate-800">
                    Klik untuk memilih berkas atau seret ke sini
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Mendukung PDF, Excel, Word, atau Gambar (Maks. 25MB per file)
                  </p>
                </div>
              )}
            </div>

            {/* List Berkas Terunggah */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-1.5 pt-2 max-h-40 overflow-y-auto">
                {uploadedFiles.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-md bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[85%]">
                      <FileText className="size-4 text-blue-600 shrink-0" />
                      <span className="truncate font-medium text-slate-800">{f.fileName}</span>
                      {f.fileSize ? (
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          ({(f.fileSize / 1024).toFixed(0)} KB)
                        </span>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFile(idx)}
                      className="size-7 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Catatan Tambahan */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Catatan Penyerahan Dokumen (Opsional):
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan keterangan atau nomor referensi berkas jika ada..."
              className="text-xs min-h-[70px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex items-center justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="h-9 text-xs"
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}
            className="h-9 text-xs bg-primary hover:bg-primary/90 text-white font-semibold gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Menyimpan...
              </>
            ) : isAuction ? (
              <>
                <CheckCircle2 className="size-3.5" />
                Simpan & Kirim ke Finance
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3.5" />
                Selesaikan Proses Disposal & Lelang
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
