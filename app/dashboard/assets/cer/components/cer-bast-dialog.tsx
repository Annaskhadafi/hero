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
import { FileSignature, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { signCerBastAction } from '../actions'

export interface CerBastDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cer: {
    id: number
    cerNumber: string
    subject: string
    applicantName: string
    siteName: string
  } | null
  onSuccess?: () => void
}

export function CerBastDialog({
  open,
  onOpenChange,
  cer,
  onSuccess,
}: CerBastDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [handoverDate, setHandoverDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [gaName, setGaName] = useState<string>('Adila Tri Arizona (General Affairs)')
  const [notes, setNotes] = useState<string>(
    'Serah terima aset resmi. Fisik barang dan stiker QR code telah terpasang dengan baik.'
  )
  const [isConfirmed, setIsConfirmed] = useState<boolean>(true)

  if (!cer) return null

  const handleSubmit = () => {
    if (!handoverDate) {
      toast.error('Tanggal serah terima wajib diisi.')
      return
    }

    startTransition(async () => {
      const res = await signCerBastAction({
        cerId: cer.id,
        handoverDate,
        gaName,
        notes,
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
          <div className="flex items-center gap-2 text-blue-700">
            <FileSignature className="h-5 w-5" />
            <DialogTitle className="text-base font-bold">Terbitkan & Tanda Tangani BAST Aset</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Form Berita Acara Serah Terima Aset Digital untuk {cer.cerNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500">Pihak Pertama (GA):</span>
                <p className="font-semibold text-slate-800">{gaName}</p>
              </div>
              <div>
                <span className="text-slate-500">Pihak Kedua (Penerima):</span>
                <p className="font-semibold text-slate-800">{cer.applicantName} ({cer.siteName})</p>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-800">Tanggal Serah Terima Fisik</Label>
            <Input
              type="date"
              value={handoverDate}
              onChange={(e) => setHandoverDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-800">Nama Petugas Penyerah (GA)</Label>
            <Input
              value={gaName}
              onChange={(e) => setGaName(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-800">Catatan Serah Terima / Kondisi Fisik</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="rounded-md border border-emerald-100 bg-emerald-50/70 p-3 text-[11px] text-emerald-900">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>
                Dengan mengonfirmasi penerbitan BAST, dokumen PDF resmi bertanda tangan digital akan otomatis
                dibuat dan dikirimkan via email ke <strong>{cer.applicantName}</strong> dengan tembusan (CC) ke{' '}
                <strong>GA (Adila &amp; Bagas)</strong>.
              </span>
            </div>
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
            disabled={isPending}
            className="gap-1.5 bg-blue-700 text-xs font-bold text-white hover:bg-blue-800"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menerbitkan BAST...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Tanda Tangani &amp; Terbitkan BAST
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
