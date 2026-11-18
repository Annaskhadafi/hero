'use client'

import * as React from 'react'
import {
  HeroFormDialog,
  HeroFormField,
  HeroTextarea,
} from '@/components/templates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Camera, CheckCheck, CheckCircle2, AlertTriangle, Wrench, Box, UserCheck } from 'lucide-react'
import { confirmAssetBorrowReturn } from '../actions'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface AssetBorrowConfirmReturnDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  borrow: {
    id: number
    borrowNumber: string
    assetName: string
    borrowerName: string
    returnNotes?: string | null
    returnPhotoUrls?: string | null
  } | null
  onSuccess: () => void
}

export function AssetBorrowConfirmReturnDialog({
  open,
  onOpenChange,
  borrow,
  onSuccess,
}: AssetBorrowConfirmReturnDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [notes, setNotes] = React.useState('')
  const [assetCondition, setAssetCondition] = React.useState<'ACTIVE' | 'DAMAGED' | 'NEEDS_REPAIR'>('ACTIVE')
  const [previewPhoto, setPreviewPhoto] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setNotes('Fisik aset telah diperiksa, kelengkapan sesuai, dan diterima dalam kondisi baik.')
      setAssetCondition('ACTIVE')
      setPreviewPhoto(null)
    }
  }, [open])

  if (!borrow) return null

  // Parse return photos
  let photos: string[] = []
  if (borrow.returnPhotoUrls) {
    try {
      photos = JSON.parse(borrow.returnPhotoUrls)
    } catch {
      photos = [borrow.returnPhotoUrls]
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!notes.trim() || notes.trim().length < 3) {
      toast.error('Catatan hasil pemeriksaan fisik wajib diisi minimal 3 karakter.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await confirmAssetBorrowReturn({
        id: borrow.id,
        returnConditionNotes: notes.trim(),
        assetCondition,
      })

      if (res.success) {
        toast.success(res.message || 'Penerimaan aset kembali berhasil dikonfirmasi.')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.message || 'Gagal mengonfirmasi pengembalian.')
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Terjadi kesalahan sistem saat memproses konfirmasi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <HeroFormDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Konfirmasi Penerimaan Aset Kembali (Langkah 2)"
        description={`Pemeriksaan fisik dan konfirmasi penerimaan kembali untuk ${borrow.assetName} dari peminjam (${borrow.borrowerName}).`}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Konfirmasi Penerimaan Aset"
        cancelLabel="Batal"
        maxWidth="2xl"
      >
        <div className="space-y-4 py-1">
          {/* Summary Box */}
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Box className="size-3.5 text-primary" />
                No. Peminjaman: <strong className="text-foreground">{borrow.borrowNumber}</strong>
              </span>
              <Badge variant="outline" className="border-purple-300 bg-purple-50 text-[10px] text-purple-700">
                Pemeriksaan Fisik
              </Badge>
            </div>
            <div className="text-xs space-y-1">
              <div>
                <span className="text-muted-foreground">Peminjam:</span>{' '}
                <span className="font-semibold text-foreground">{borrow.borrowerName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Nama Aset:</span>{' '}
                <span className="font-semibold text-foreground">{borrow.assetName}</span>
              </div>
              {borrow.returnNotes && (
                <div className="rounded-md bg-background/80 border border-border/50 p-2 text-slate-700 mt-1">
                  <span className="text-[11px] font-semibold block text-muted-foreground">
                    Catatan Penyerahan dari Peminjam:
                  </span>
                  <p className="text-xs italic mt-0.5">"{borrow.returnNotes}"</p>
                </div>
              )}
            </div>

            {/* Photos from borrower */}
            {photos.length > 0 && (
              <div className="pt-1.5 space-y-1 border-t border-border/40">
                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                  <Camera className="size-3" /> Foto Kondisi Fisik yang Diunggah:
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {photos.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPreviewPhoto(p)}
                      className="group relative rounded-md overflow-hidden border border-border hover:border-primary transition-all"
                    >
                      <img
                        src={resolveUploadUrl(p)}
                        alt={`Foto Bukti ${idx + 1}`}
                        className="size-16 object-cover group-hover:scale-105 transition-transform"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Condition Selector */}
          <HeroFormField
            label="Kondisi Akhir Fisik Aset *"
            required
            helperText="Pilih kondisi aset setelah Anda periksa secara langsung"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <Button
                type="button"
                variant={assetCondition === 'ACTIVE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAssetCondition('ACTIVE')}
                className={`h-9 text-xs gap-1.5 justify-center ${
                  assetCondition === 'ACTIVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'border-border/80'
                }`}
              >
                <CheckCircle2 className="size-3.5" /> Normal / Baik
              </Button>
              <Button
                type="button"
                variant={assetCondition === 'DAMAGED' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAssetCondition('DAMAGED')}
                className={`h-9 text-xs gap-1.5 justify-center ${
                  assetCondition === 'DAMAGED'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'border-rose-300 text-rose-700 hover:bg-rose-50'
                }`}
              >
                <AlertTriangle className="size-3.5" /> Rusak (Damaged)
              </Button>
              <Button
                type="button"
                variant={assetCondition === 'NEEDS_REPAIR' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAssetCondition('NEEDS_REPAIR')}
                className={`h-9 text-xs gap-1.5 justify-center ${
                  assetCondition === 'NEEDS_REPAIR'
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'border-amber-300 text-amber-800 hover:bg-amber-50'
                }`}
              >
                <Wrench className="size-3.5" /> Perlu Servis
              </Button>
            </div>
          </HeroFormField>

          {/* Inspection Notes */}
          <HeroFormField
            label="Catatan Hasil Pemeriksaan Fisik *"
            required
            helperText="Tuliskan catatan kelengkapan, fungsi, atau fisik aset yang Anda terima"
          >
            <HeroTextarea
              placeholder="Contoh: Unit dan charger telah diperiksa, fungsi operasional normal, fisik mulus..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={300}
              showCount
              required
            />
          </HeroFormField>
        </div>
      </HeroFormDialog>

      {/* Lightbox Photo Preview */}
      <Dialog open={Boolean(previewPhoto)} onOpenChange={() => setPreviewPhoto(null)}>
        <DialogContent className="max-w-2xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Camera className="size-4 text-primary" /> Foto Bukti Fisik
            </DialogTitle>
          </DialogHeader>
          {previewPhoto && (
            <div className="mt-2 rounded-lg overflow-hidden border border-border bg-black/5 flex items-center justify-center max-h-[75vh]">
              <img
                src={resolveUploadUrl(previewPhoto)}
                alt="Foto Bukti"
                className="max-h-[70vh] w-auto object-contain rounded-md"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
