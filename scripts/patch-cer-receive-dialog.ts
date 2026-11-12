import fs from 'fs'

const newContent = `'use client'

import React, { useState, useEffect, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Camera,
  UploadCloud,
  Loader2,
  CheckCircle,
  PackageCheck,
  PenTool,
  FileCheck2,
} from 'lucide-react'
import { toast } from 'sonner'
import { uploadFile } from '@/app/actions/upload'
import { getUserSignatureAction, saveUserSignatureAction } from '@/app/actions/user-signature'
import { ApprovalSignatureModal } from '@/components/approval-signature-modal'
import { confirmAssetReceivedAction } from '../actions'

export interface CerReceiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cer: {
    id: number
    cerNumber: string
    subject: string
    assetCategory: string
    siteName: string
  } | null
  onSuccess?: () => void
}

export function CerReceiveDialog({
  open,
  onOpenChange,
  cer,
  onSuccess,
}: CerReceiveDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [receiverNotes, setReceiverNotes] = useState<string>(
    'Barang diterima lengkap, segel utuh, dan sesuai spesifikasi.'
  )
  const [goodsPhotoUrl, setGoodsPhotoUrl] = useState<string>('')
  const [deliveryNoteUrl, setDeliveryNoteUrl] = useState<string>('')
  const [receiverSignatureUrl, setReceiverSignatureUrl] = useState<string | null>(null)
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false)
  const [saveToProfile, setSaveToProfile] = useState(true)
  const [loadingProfileSig, setLoadingProfileSig] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false)
  const [isUploadingSuratJalan, setIsUploadingSuratJalan] = useState<boolean>(false)

  // Auto-load signature from employee profile
  useEffect(() => {
    if (!open) return
    async function loadSignature() {
      setLoadingProfileSig(true)
      try {
        const res = await getUserSignatureAction()
        if (res && res.success && res.signatureDataUrl) {
          setReceiverSignatureUrl(res.signatureDataUrl)
        }
      } catch (err) {
        console.warn('[CerReceiveDialog] Failed loading profile signature:', err)
      } finally {
        setLoadingProfileSig(false)
      }
    }
    loadSignature()
  }, [open])

  if (!cer) return null

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'suratJalan') => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const isPhoto = type === 'photo'
    if (isPhoto) setIsUploadingPhoto(true)
    else setIsUploadingSuratJalan(true)

    try {
      const fd = new FormData()
      fd.append('file', files[0])
      fd.append('prefix', 'cer-attachments')

      const res = await uploadFile(fd)
      if (res && res.success && res.url) {
        if (isPhoto) {
          setGoodsPhotoUrl(res.url)
          toast.success('Foto fisik barang berhasil diunggah.')
        } else {
          setDeliveryNoteUrl(res.url)
          toast.success('Foto surat jalan berhasil diunggah.')
        }
      } else {
        toast.error('Gagal mengunggah foto.')
      }
    } catch (err) {
      console.error('Upload error:', err)
      toast.error('Terjadi kesalahan saat mengunggah.')
    } finally {
      if (isPhoto) setIsUploadingPhoto(false)
      else setIsUploadingSuratJalan(false)
      e.target.value = ''
    }
  }

  const handleSubmit = () => {
    if (!receivedDate) {
      toast.error('Tanggal penerimaan wajib diisi.')
      return
    }

    if (!receiverSignatureUrl) {
      toast.error('Tanda tangan digital penerima wajib dibubuhkan sebelum konfirmasi penerimaan.')
      setIsSignatureModalOpen(true)
      return
    }

    startTransition(async () => {
      const res = await confirmAssetReceivedAction({
        cerId: cer.id,
        receivedDate,
        receiverNotes,
        goodsPhotoUrl,
        deliveryNoteUrl,
        receiverSignatureUrl,
      })

      if (res.success) {
        toast.success(res.message || 'Penerimaan fisik aset berhasil dikonfirmasi dan BAST PDF resmi telah diterbitkan.')
        onOpenChange(false)
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.message || 'Gagal mengonfirmasi penerimaan aset.')
      }
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-emerald-700">
              <PackageCheck className="h-5 w-5" />
              <DialogTitle className="text-base font-bold">Konfirmasi Penerimaan Fisik Aset</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              {cer.cerNumber} — {cer.subject} ({cer.siteName})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">Tanggal Barang Tiba di Lokasi</Label>
              <Input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">Catatan Kondisi Fisik Barang</Label>
              <Textarea
                rows={3}
                placeholder="Contoh: Barang tiba lengkap, dicek menyala/berfungsi, kelengkapan adaptor dan kartu garansi ada..."
                value={receiverNotes}
                onChange={(e) => setReceiverNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Photo uploads */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">Foto Fisik Barang (Kamera HP)</Label>
                <label className="flex min-h-[90px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-2 text-center hover:bg-slate-100">
                  <Camera className="h-5 w-5 text-slate-500" />
                  <span className="mt-1 text-[11px] font-medium text-slate-700">
                    {goodsPhotoUrl ? 'Foto Diunggah (Klik ganti)' : 'Ambil Foto / Pilih File'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleUploadPhoto(e, 'photo')}
                    className="hidden"
                    disabled={isUploadingPhoto}
                  />
                </label>
                {isUploadingPhoto && (
                  <span className="flex items-center gap-1 text-[11px] text-blue-600">
                    <Loader2 className="h-3 w-3 animate-spin" /> Mengunggah foto...
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">Foto Surat Jalan Vendor</Label>
                <label className="flex min-h-[90px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-2 text-center hover:bg-slate-100">
                  <UploadCloud className="h-5 w-5 text-slate-500" />
                  <span className="mt-1 text-[11px] font-medium text-slate-700">
                    {deliveryNoteUrl ? 'Surat Jalan Diunggah' : 'Upload Foto Surat Jalan'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleUploadPhoto(e, 'suratJalan')}
                    className="hidden"
                    disabled={isUploadingSuratJalan}
                  />
                </label>
                {isUploadingSuratJalan && (
                  <span className="flex items-center gap-1 text-[11px] text-blue-600">
                    <Loader2 className="h-3 w-3 animate-spin" /> Mengunggah...
                  </span>
                )}
              </div>
            </div>

            {/* MANDATORY DIGITAL SIGNATURE SECTION */}
            <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800">
                  Tanda Tangan Digital Penerima Aset <span className="text-rose-500">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSignatureModalOpen(true)}
                  className="h-6 text-[10px] font-semibold gap-1 border-slate-300"
                >
                  <PenTool className="size-3" />
                  {receiverSignatureUrl ? 'Ganti Tanda Tangan' : 'Gores / Upload TTD'}
                </Button>
              </div>

              <div
                onClick={() => setIsSignatureModalOpen(true)}
                className="h-28 rounded-lg border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors p-2 relative overflow-hidden"
              >
                {receiverSignatureUrl ? (
                  <div className="flex flex-col items-center justify-center w-full h-full">
                    <img
                      src={receiverSignatureUrl}
                      alt="Tanda Tangan Penerima"
                      className="max-h-20 max-w-full object-contain"
                    />
                    <span className="text-[10px] text-emerald-700 font-semibold mt-1">
                      ✓ Tanda tangan terpasang (Klik untuk ubah)
                    </span>
                  </div>
                ) : (
                  <div className="text-center text-slate-500">
                    <PenTool className="size-5 mx-auto mb-1 text-slate-400" />
                    <p className="text-xs font-semibold">Klik di sini untuk membubuhkan tanda tangan</p>
                    <p className="text-[10px] text-slate-400">
                      Gores via mouse / touchscreen atau upload gambar PNG/JPG
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-md border border-blue-100 bg-blue-50/70 p-2.5 text-[11px] text-blue-900 leading-relaxed">
              ℹ️ Dokumen resmi <strong>Berita Acara Serah Terima (BAST) PDF</strong> ukuran A4 berlogo PT Chitra Paratama
              akan otomatis diterbitkan dan siap diunduh setelah konfirmasi ini disimpan.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={isPending || isUploadingPhoto || isUploadingSuratJalan}
              className="gap-1.5 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5" /> Konfirmasi &amp; Terbitkan BAST
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SIGNATURE MODAL */}
      <ApprovalSignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={async (dataUrl) => {
          setReceiverSignatureUrl(dataUrl)
          setIsSignatureModalOpen(false)
          if (saveToProfile && dataUrl.startsWith('data:image/')) {
            await saveUserSignatureAction(dataUrl).catch(() => {})
          }
          toast.success('Tanda tangan digital berhasil dipasang.')
        }}
      />
    </>
  )
}
`

fs.writeFileSync('app/dashboard/assets/cer/components/cer-receive-dialog.tsx', newContent, 'utf8')
console.log('Successfully updated cer-receive-dialog.tsx')
