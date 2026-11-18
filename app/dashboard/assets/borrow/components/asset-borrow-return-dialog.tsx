'use client'

import * as React from 'react'
import {
  HeroFormDialog,
  HeroFormField,
  HeroDatePicker,
  HeroTextarea,
  HeroFileUpload,
} from '@/components/templates'
import { toast } from 'sonner'
import { Camera, CheckCircle2, RotateCcw } from 'lucide-react'
import { requestAssetBorrowReturn } from '../actions'

interface AssetBorrowReturnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  borrow: {
    id: number
    borrowNumber: string
    assetName: string
    holderName: string
    equipmentNotes?: string | null
  } | null
  onSuccess: () => void
}

export function AssetBorrowReturnDialog({
  open,
  onOpenChange,
  borrow,
  onSuccess,
}: AssetBorrowReturnDialogProps) {
  const [actualReturnDate, setActualReturnDate] = React.useState<Date | undefined>(new Date())
  const [returnNotes, setReturnNotes] = React.useState('')
  const [photoUrl, setPhotoUrl] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setActualReturnDate(new Date())
      setReturnNotes('')
      setPhotoUrl('')
    }
  }, [open])

  if (!borrow) return null

  const handleSubmit = async () => {
    if (!actualReturnDate) {
      toast.error('Waktu pengembalian fisik wajib diisi.')
      return
    }

    if (!returnNotes.trim() || returnNotes.trim().length < 3) {
      toast.error('Catatan kondisi pengembalian fisik wajib diisi minimal 3 karakter.')
      return
    }

    if (!photoUrl || !photoUrl.trim()) {
      toast.error('Wajib mengunggah minimal 1 foto kondisi fisik aset sebelum diserahkan kembali.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await requestAssetBorrowReturn({
        id: borrow.id,
        actualReturnDate: actualReturnDate.toISOString(),
        returnNotes: returnNotes.trim(),
        photoUrls: [photoUrl.trim()],
      })

      if (res.success) {
        toast.success(res.message)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengajukan pengembalian aset.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <HeroFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ajukan Pengembalian Aset"
      description={`Formulir serah terima pengembalian aset ${borrow.assetName} (${borrow.borrowNumber}) kepada Holder: ${borrow.holderName}.`}
      submitLabel={isSubmitting ? 'Mengirimkan...' : 'Kirim Pengajuan Pengembalian'}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Banner Instruksi */}
        <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900 leading-relaxed">
          <p className="font-semibold text-blue-950 flex items-center gap-1.5 mb-1">
            <RotateCcw className="size-3.5 text-blue-700" />
            Langkah 1: Serah Terima Fisik dari Peminjam ke Holder
          </p>
          Silakan dokumentasikan kondisi fisik aset dan serahkan unit kepada <strong>{borrow.holderName}</strong>. Holder akan memverifikasi fisik aset sebelum mengonfirmasi status selesai.
        </div>

        {/* Tanggal Pengembalian */}
        <HeroFormField
          label="Waktu Pengembalian Fisik *"
          required
          helperText="Waktu saat aset diserahkan kembali kepada Holder Aset"
        >
          <HeroDatePicker
            value={actualReturnDate}
            onChange={setActualReturnDate}
            placeholder="Pilih tanggal pengembalian..."
          />
        </HeroFormField>

        {/* Catatan Kondisi & Kelengkapan */}
        <HeroFormField
          label="Catatan Kondisi & Kelengkapan Aset *"
          required
          helperText="Jelaskan kondisi fisik aset dan kelengkapan (misal: charger, tas, kelengkapan lain yang dipinjam)"
        >
          <HeroTextarea
            placeholder="Contoh: Unit laptop, charger ori, dan tas diserahkan dalam kondisi baik dan berfungsi normal..."
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            rows={3}
            maxLength={400}
            showCount
          />
        </HeroFormField>

        {/* Foto Fisik Aset Wajib */}
        <HeroFormField
          label="Foto Kondisi Fisik Aset (Wajib) *"
          required
          helperText="Unggah minimal 1 foto fisik aset saat dikembalikan (tersimpan persisten di S3 CloudHost)"
        >
          <HeroFileUpload
            value={photoUrl}
            onChange={setPhotoUrl}
            label="Unggah Foto Fisik Aset"
            description="Format gambar JPG/PNG (Maksimal 10MB)"
            accept="image/*"
          />
        </HeroFormField>
      </div>
    </HeroFormDialog>
  )
}
