'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateAtkRequestStatus } from '@/app/actions/atk'
import { CheckCircle2, PackageCheck, CheckCheck, XCircle, Loader2 } from 'lucide-react'

export function AtkReviewDialog({
  open,
  onOpenChange,
  requestId,
  requestNumber,
  currentStatus,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  requestId: number
  requestNumber: string
  currentStatus: string
  onSuccess?: () => void
}) {
  const [status, setStatus] = useState<string>(
    currentStatus === 'pending_approval' ? 'approved' : currentStatus
  )
  const [reviewerNote, setReviewerNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await updateAtkRequestStatus(requestId, {
        status: status as any,
        reviewerNote,
      })

      if (res.success) {
        onOpenChange(false)
        if (onSuccess) onSuccess()
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memperbarui status pengajuan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Review Pengajuan ATK ({requestNumber})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ubah status pemenuhan dan berikan catatan konfirmasi untuk pemohon.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 text-xs">
            {error && (
              <div className="p-3 text-xs rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="status" className="text-xs font-semibold">
                Status Baru:
              </Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" className="h-9 text-xs">
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent className="text-xs">
                  <SelectItem value="approved">
                    <div className="flex items-center gap-2 text-blue-600 font-medium">
                      <CheckCircle2 className="size-4" />
                      <span>Disetujui / Sedang Disiapkan</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="ready_for_pickup">
                    <div className="flex items-center gap-2 text-purple-600 font-medium">
                      <PackageCheck className="size-4" />
                      <span>Siap Diambil di Ruang GA</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="completed">
                    <div className="flex items-center gap-2 text-emerald-600 font-medium">
                      <CheckCheck className="size-4" />
                      <span>Selesai (Sudah Diserahkan)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="rejected">
                    <div className="flex items-center gap-2 text-rose-600 font-medium">
                      <XCircle className="size-4" />
                      <span>Tolak Pengajuan</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reviewerNote" className="text-xs font-semibold">
                Catatan Review / Keterangan PIC GA:
              </Label>
              <Textarea
                id="reviewerNote"
                rows={3}
                placeholder="Contoh: Barang sudah disiapkan di lemari GA, silakan hubungi Pak Budi..."
                value={reviewerNote}
                onChange={(e) => setReviewerNote(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs"
            >
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={loading} className="text-xs gap-1.5">
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
