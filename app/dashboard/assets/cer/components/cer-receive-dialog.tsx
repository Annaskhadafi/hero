'use client'

import React, { useState, useTransition } from 'react'
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
import { Camera, UploadCloud, Loader2, CheckCircle, PackageCheck } from 'lucide-react'
import { toast } from 'sonner'
import { uploadFile } from '@/app/actions/upload'
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
  const [receiverNotes, setReceiverNotes] = useState<string>('Barang diterima lengkap, segel utuh, dan sesuai spesifikasi.')
  const [goodsPhotoUrl, setGoodsPhotoUrl] = useState<string>('')
  const [deliveryNoteUrl, setDeliveryNoteUrl] = useState<string>('')
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false)
  const [isUploadingSuratJalan, setIsUploadingSuratJalan] = useState<boolean>(false)

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

    startTransition(async () => {
      const res = await confirmAssetReceivedAction({
        cerId: cer.id,
        receivedDate,
        receiverNotes,
        goodsPhotoUrl,
        deliveryNoteUrl,
      })

      if (res.success) {
        toast.success(res.message)
        onOpenChange(false)
        if (onSuccess) onSuccess()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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

          {/* Photo uploads: Camera friendly on smartphone */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">Foto Fisik Barang (Kamera HP)</Label>
              <label className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-2 text-center hover:bg-slate-100">
                <Camera className="h-6 w-6 text-slate-500" />
                <span className="mt-1 text-[11px] font-medium text-slate-700">
                  {goodsPhotoUrl ? 'Foto Berhasil Diunggah (Klik untuk ganti)' : 'Ambil Foto / Pilih File'}
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
              <label className="flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-2 text-center hover:bg-slate-100">
                <UploadCloud className="h-6 w-6 text-slate-500" />
                <span className="mt-1 text-[11px] font-medium text-slate-700">
                  {deliveryNoteUrl ? 'Surat Jalan Diunggah' : 'Upload Dokumen / Foto Surat Jalan'}
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

          <div className="rounded-md border border-blue-100 bg-blue-50/70 p-3 text-[11px] text-blue-900">
            ℹ️ Setelah konfirmasi ini disubmit, aset akan otomatis teregistrasi ke database <strong>Asset Management</strong> sehingga nomor aset dan stiker QR code siap dicetak.
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
                <CheckCircle className="h-3.5 w-3.5" /> Konfirmasi Penerimaan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
