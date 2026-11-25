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
  ClipboardCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { uploadFile } from '@/app/actions/upload'
import {
  submitDisposalBaDocumentsAction,
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
  mode: 'berita_acara' | 'auction' | 'finance'
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
  const isBeritaAcara = mode === 'berita_acara'
  const isFinance = mode === 'finance'
  const isDonation = item?.disposalType === 'Donasi'

  const baOptions = isDonation ? ['Berita Acara Donasi'] : ['Berita Acara Aset Disposal']
  const checklistOptions = isAuction
    ? AUCTION_CHECKLIST_OPTIONS
    : isBeritaAcara
    ? baOptions
    : FINANCE_CHECKLIST_OPTIONS

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

    if ((isBeritaAcara || isFinance) && uploadedFiles.length === 0) {
      toast.error(
        isBeritaAcara
          ? `Wajib mengunggah minimal 1 berkas scan/foto ${isDonation ? 'Berita Acara Donasi' : 'Berita Acara Aset Disposal'} yang telah ditandatangani.`
          : 'Wajib mengunggah minimal 1 berkas Dokumen Disposal SAP.'
      )
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
      } else if (isBeritaAcara) {
        res = await submitDisposalBaDocumentsAction({
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

  const modalTitle = isAuction
    ? 'Submit Lampiran Hasil Lelang (Procurement)'
    : isBeritaAcara
    ? isDonation
      ? 'Submit Berita Acara Donasi (Pengaju)'
      : 'Submit Berita Acara Aset Disposal (Pengaju)'
    : 'Submit Dokumen Keuangan (Finance & Accounting)'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="border-b pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-lg text-white ${
                isAuction ? 'bg-amber-600' : isBeritaAcara ? 'bg-blue-600' : 'bg-purple-600'
              }`}
            >
              {isAuction ? (
                <Gavel className="size-5" />
              ) : isBeritaAcara ? (
                <ClipboardCheck className="size-5" />
              ) : (
                <Receipt className="size-5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {modalTitle}
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
                : isBeritaAcara
                ? 'bg-blue-50/80 border-blue-200 text-blue-950'
                : 'bg-purple-50/80 border-purple-200 text-purple-950'
            }`}
          >
            <p className="font-semibold flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="size-4 shrink-0" />
              {isAuction
                ? 'Checklist Berkas Lelang & Pemenang (Wajib Diserahkan)'
                : isBeritaAcara
                ? `Checklist Berkas ${isDonation ? 'Berita Acara Donasi' : 'Berita Acara Aset Disposal'} (Wajib Diserahkan)`
                : 'Checklist Berkas Administrasi Keuangan (Wajib Diserahkan)'}
            </p>
            <p className="text-[11px] text-slate-600">
              {isBeritaAcara
                ? `Centang checklist dan unggah berkas fisik/scan resmi ${isDonation ? 'Berita Acara Donasi' : 'Berita Acara Aset Disposal'} yang telah ditandatangani pihak terkait.`
                : isFinance
                ? 'Centang checklist dan unggah berkas Dokumen Disposal SAP dari sistem SAP ERP.'
                : 'Centang dokumen yang Anda lampirkan dan unggah berkas fisik/digitalnya pada kolom di bawah.'}
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
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <span className="flex-1">{opt}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Upload File / Lampiran */}
          <div className="space-y-2.5 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
            <div className="flex items-center justify-between">
              <span className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
                2. Unggah Berkas Dokumen Fisik / Digital {isBeritaAcara || isFinance ? <span className="text-rose-500">* (Wajib)</span> : '(Opsional)'}:
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="h-7 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <UploadCloud className="size-3.5" />
                {isUploading ? 'Mengunggah...' : 'Pilih Berkas'}
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {uploadedFiles.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer transition-all text-center"
              >
                <Paperclip className="size-5 text-slate-400 mb-1" />
                <p className="text-xs font-medium text-slate-600">
                  Klik di sini untuk mengunggah dokumen fisik / scan PDF
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Format: PDF, PNG, JPG (Maks 15 MB per berkas)
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {uploadedFiles.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <FileText className="size-4 text-blue-600 shrink-0" />
                      <span className="truncate text-xs font-medium text-slate-800" title={f.fileName}>
                        {f.fileName}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile(idx)}
                      className="size-6 text-slate-400 hover:text-rose-600"
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
            ) : isBeritaAcara ? (
              <>
                <CheckCircle2 className="size-3.5" />
                Simpan & Teruskan ke Finance
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3.5" />
                Selesaikan Proses Disposal
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
