'use client'

import * as React from 'react'
import {
  HeroDetailModal,
  HeroConfirmDialog,
  HeroFormField,
  HeroTextarea,
  HeroStatusBadge,
} from '@/components/templates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Box,
  CheckCircle2,
  Download,
  Clock,
  RotateCcw,
  Trash2,
  UserCheck,
  XCircle,
  Calendar,
  FileText,
  AlertCircle,
} from 'lucide-react'
import {
  approveAssetBorrow,
  rejectAssetBorrow,
  returnAssetBorrow,
  cancelAssetBorrow,
  resubmitAssetBorrowAction,
} from '../actions'

interface AssetBorrowDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  borrow: any | null
  onSuccess: () => void
}

export function AssetBorrowDetailModal({
  open,
  onOpenChange,
  borrow,
  onSuccess,
}: AssetBorrowDetailModalProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Dialog states
  const [showApproveDialog, setShowApproveDialog] = React.useState(false)
  const [showRejectDialog, setShowRejectDialog] = React.useState(false)
  const [showReturnDialog, setShowReturnDialog] = React.useState(false)
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)
  const [showResubmitDialog, setShowResubmitDialog] = React.useState(false)

  const [approveNote, setApproveNote] = React.useState('')
  const [rejectReason, setRejectReason] = React.useState('')
  const [returnNotes, setReturnNotes] = React.useState('')
  const [resubmitPurpose, setResubmitPurpose] = React.useState('')
  const [resubmitEquipmentNotes, setResubmitEquipmentNotes] = React.useState('')

  if (!borrow) return null

  const handleResubmit = async () => {
    if (!resubmitPurpose.trim()) {
      toast.error('Keperluan / tujuan peminjaman wajib diisi.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await resubmitAssetBorrowAction({
        id: borrow.id,
        purpose: resubmitPurpose.trim(),
        borrowDate: borrow.borrowDate,
        expectedReturnDate: borrow.expectedReturnDate,
        equipmentNotes: resubmitEquipmentNotes.trim(),
      })
      if (res.success) {
        toast.success(res.message)
        setShowResubmitDialog(false)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengirim ulang revisi peminjaman.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDateTime = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return '-'
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return '-'
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  }

  // Handle Approve
  const handleApprove = async () => {
    if (!approveNote.trim()) {
      toast.error('Catatan persetujuan wajib diisi.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await approveAssetBorrow(borrow.id, approveNote)
      if (res.success) {
        toast.success(res.message)
        setShowApproveDialog(false)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menyetujui peminjaman.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Reject
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Alasan penolakan wajib diisi.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await rejectAssetBorrow(borrow.id, rejectReason)
      if (res.success) {
        toast.success(res.message)
        setShowRejectDialog(false)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menolak peminjaman.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Return
  const handleReturn = async () => {
    setIsSubmitting(true)
    try {
      const res = await returnAssetBorrow(borrow.id, returnNotes)
      if (res.success) {
        toast.success(res.message)
        setShowReturnDialog(false)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengonfirmasi pengembalian.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Cancel
  const handleCancel = async () => {
    setIsSubmitting(true)
    try {
      const res = await cancelAssetBorrow(borrow.id)
      if (res.success) {
        toast.success(res.message)
        setShowCancelDialog(false)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal membatalkan pengajuan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case 'borrowed':
        return { label: 'Sedang Dipinjam', status: 'approved' as const }
      case 'returned':
        return { label: 'Selesai Dikembalikan', status: 'completed' as const }
      case 'rejected':
        return { label: 'Ditolak', status: 'rejected' as const }
      case 'cancelled':
        return { label: 'Dibatalkan', status: 'draft' as const }
      case 'pending':
      default:
        return { label: 'Menunggu Persetujuan', status: 'pending' as const }
    }
  }

  const badgeProps = getStatusBadgeProps(borrow.status)

  return (
    <>
      <HeroDetailModal
        open={open}
        onOpenChange={onOpenChange}
        title={`Detail Peminjaman: ${borrow.borrowNumber}`}
        badgeText={badgeProps.label}
        statusTone={badgeProps.status}
        documentNo={borrow.borrowNumber}
        maxWidth="2xl"
        actions={
          <div className="flex items-center gap-2">
            {(() => {
              const canDownload = borrow.canDownload !== false
              if (!canDownload || !borrow.pdfUrl) return null
              return (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="h-9 gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-semibold"
                >
                  <a href={resolveUploadUrl(borrow.pdfUrl)} target="_blank" rel="noopener noreferrer">
                    <Download className="size-4" /> Download PDF (A4)
                  </a>
                </Button>
              )
            })()}
            {borrow.canApprove && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRejectDialog(true)}
                  className="h-9 gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-50"
                >
                  <XCircle className="size-4" /> Tolak
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowApproveDialog(true)}
                  className="h-9 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold"
                >
                  <CheckCircle2 className="size-4" /> Setujui Peminjaman
                </Button>
              </>
            )}

            {borrow.canEditRevision && (
              <Button
                size="sm"
                onClick={() => {
                  setResubmitPurpose(borrow.purpose || '')
                  setResubmitEquipmentNotes(borrow.equipmentNotes || '')
                  setShowResubmitDialog(true)
                }}
                className="h-9 gap-1.5 bg-amber-600 text-white hover:bg-amber-700 font-semibold"
              >
                <RotateCcw className="size-4" /> Revisi Pengajuan
              </Button>
            )}

            {borrow.canReturn && (
              <Button
                size="sm"
                onClick={() => setShowReturnDialog(true)}
                className="h-9 gap-1.5 bg-blue-600 text-white hover:bg-blue-700 font-semibold"
              >
                <RotateCcw className="size-4" /> Kembalikan Aset
              </Button>
            )}

            {borrow.canCancel && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCancelDialog(true)}
                className="h-9 gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="size-4" /> Batalkan Pengajuan
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-6">
          {/* BANNER PERMINTAAN REVISI */}
          {borrow.status === 'needs_revision' && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-1.5 text-xs text-amber-950">
              <span className="font-bold flex items-center gap-1.5 text-amber-800 text-sm">
                <AlertCircle className="size-4 text-amber-600" />
                Permintaan Revisi / Perbaikan oleh Approver
              </span>
              <p className="text-xs leading-relaxed bg-white/80 p-2.5 rounded-lg border border-amber-200">
                {borrow.lastRevertNote || 'Mohon sesuaikan rincian peminjaman sesuai catatan yang diberikan.'}
              </p>
            </div>
          )}

          {/* CARD 1: INFORMASI ASET */}
          <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <Box className="size-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Informasi Aset yang Dipinjam</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Nama Aset:</span>
                <span className="font-bold text-sm text-foreground">{borrow.assetName}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Nomor Aset:</span>
                <span className="font-semibold text-foreground">{borrow.assetNumber || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Serial Number:</span>
                <span className="font-mono text-foreground">{borrow.serialNumber || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Holder Aset (Pemilik Fisik):</span>
                <span className="font-bold text-foreground text-blue-700">{borrow.holderName}</span>
              </div>
            </div>

            {/* Kelengkapan Aset */}
            <div className="pt-2 border-t border-border/50">
              <span className="text-muted-foreground block text-[11px] mb-1 font-medium">Kelengkapan Aset:</span>
              <div className="rounded-md bg-muted/40 p-2.5 text-xs text-foreground font-mono">
                {borrow.equipmentNotes || 'Tidak ada catatan kelengkapan khusus.'}
              </div>
            </div>
          </div>

          {/* CARD 2: DATA PEMINJAMAN & WAKTU */}
          <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <Clock className="size-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Waktu &amp; Pihak Peminjaman</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Peminjam:</span>
                <span className="font-bold text-sm text-foreground">{borrow.borrowerName}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Status Saat Ini:</span>
                <div className="mt-1">
                  <HeroStatusBadge status={badgeProps.status} label={badgeProps.label} />
                </div>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Waktu Mulai Peminjaman:</span>
                <span className="font-semibold text-foreground">{formatDateTime(borrow.borrowDate)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Estimasi Pengembalian:</span>
                <span className="font-semibold text-foreground">{formatDateTime(borrow.expectedReturnDate)}</span>
              </div>
            </div>

            {/* Waktu Aktual Kembali jika sudah returned */}
            {borrow.status === 'returned' && (
              <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-3 space-y-1 text-xs">
                <span className="font-bold text-emerald-900 block flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  Waktu Aktual Pengembalian: {formatDateTime(borrow.actualReturnDate)}
                </span>
                {borrow.returnNotes && (
                  <p className="text-emerald-800 text-[11px]">
                    Catatan Pengembalian: {borrow.returnNotes}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* CARD 3: TUJUAN PEMINJAMAN */}
          <div className="rounded-lg border border-border/70 bg-card p-4 shadow-xs space-y-2">
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <FileText className="size-4 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Tujuan Peminjaman</h4>
            </div>
            <p className="text-xs text-foreground bg-muted/30 p-2.5 rounded-md leading-relaxed">
              {borrow.purpose}
            </p>
          </div>

          {/* CATATAN APPROVAL / PENOLAKAN */}
          {borrow.approvalNote && (
            <div className={`rounded-lg border p-3.5 space-y-1 text-xs ${borrow.status === 'rejected' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
              <span className="font-bold block">
                {borrow.status === 'rejected' ? 'Alasan Penolakan:' : 'Catatan Persetujuan Holder:'}
              </span>
              <p className="text-xs leading-relaxed">{borrow.approvalNote}</p>
            </div>
          )}
        </div>
      </HeroDetailModal>

      {/* MODAL KONFIRMASI SETUJU */}
      <HeroConfirmDialog
        open={showApproveDialog}
        onOpenChange={setShowApproveDialog}
        title="Setujui Peminjaman Aset"
        description={`Anda sebagai Holder Aset akan menyetujui peminjaman ${borrow.assetName} kepada ${borrow.borrowerName}.`}
        confirmLabel={isSubmitting ? 'Memproses...' : 'Ya, Setujui Peminjaman'}
        cancelLabel="Batal"
        tone="success"
        confirmDisabled={!approveNote.trim() || isSubmitting}
        onConfirm={handleApprove}
      >
        <div className="space-y-3 pt-2">
          <HeroFormField
            label="Catatan Persetujuan *"
            required
            helperText="Wajib diisi sebelum menyetujui penyerahan fisik aset"
          >
            <HeroTextarea
              placeholder="Contoh: Disetujui peminjaman unit laptop dan charger dalam kondisi baik..."
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              rows={3}
              maxLength={300}
              showCount
            />
          </HeroFormField>
        </div>
      </HeroConfirmDialog>

      {/* MODAL KONFIRMASI TOLAK */}
      <HeroConfirmDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        title="Tolak Peminjaman Aset"
        description={`Anda akan menolak pengajuan peminjaman aset ${borrow.assetName}.`}
        confirmLabel={isSubmitting ? 'Memproses...' : 'Ya, Tolak Peminjaman'}
        cancelLabel="Batal"
        tone="destructive"
        confirmDisabled={!rejectReason.trim() || isSubmitting}
        onConfirm={handleReject}
      >
        <div className="space-y-3 pt-2">
          <HeroFormField
            label="Alasan Penolakan *"
            required
            helperText="Wajib memberikan alasan penolakan kepada peminjam"
          >
            <HeroTextarea
              placeholder="Contoh: Unit sedang aktif digunakan untuk presentasi operasional..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              maxLength={300}
              showCount
            />
          </HeroFormField>
        </div>
      </HeroConfirmDialog>

      {/* MODAL KONFIRMASI PENGEMBALIAN ASET */}
      <HeroConfirmDialog
        open={showReturnDialog}
        onOpenChange={setShowReturnDialog}
        title="Konfirmasi Pengembalian Aset"
        description={`Konfirmasikan bahwa aset ${borrow.assetName} telah dikembalikan secara fisik ke Holder Aset.`}
        confirmLabel={isSubmitting ? 'Memproses...' : 'Konfirmasi Aset Kembali'}
        cancelLabel="Batal"
        tone="primary"
        confirmDisabled={isSubmitting}
        onConfirm={handleReturn}
      >
        <div className="space-y-3 pt-2">
          <HeroFormField
            label="Catatan Kondisi Saat Pengembalian (Opsional)"
            helperText="Tuliskan kondisi kelengkapan fisik saat aset diterima kembali"
          >
            <HeroTextarea
              placeholder="Contoh: Aset dikembalikan dalam kondisi bersih, charger dan tas lengkap..."
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              rows={3}
              maxLength={300}
              showCount
            />
          </HeroFormField>
        </div>
      </HeroConfirmDialog>

      {/* MODAL KONFIRMASI PEMBATALAN PENGAJUAN */}
      <HeroConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Batalkan dan Hapus Pengajuan?"
        description={`Apakah Anda yakin ingin membatalkan pengajuan ${borrow.borrowNumber}? Pengajuan akan langsung dihapus permanen dari sistem.`}
        confirmLabel={isSubmitting ? 'Menghapus...' : 'Ya, Batalkan & Hapus'}
        cancelLabel="Batal"
        tone="destructive"
        confirmDisabled={isSubmitting}
        onConfirm={handleCancel}
      />

      {/* MODAL REVISI PENGAJUAN */}
      <HeroConfirmDialog
        open={showResubmitDialog}
        onOpenChange={setShowResubmitDialog}
        title="Kirim Ulang Revisi Peminjaman"
        description={`Perbarui rincian peminjaman aset ${borrow.borrowNumber}. Setelah dikirim ulang, persetujuan akan langsung kembali ke meja Pemegang Aset (${borrow.holderName}).`}
        confirmLabel={isSubmitting ? 'Mengirim...' : 'Kirim Ulang Revisi'}
        cancelLabel="Batal"
        tone="warning"
        confirmDisabled={!resubmitPurpose.trim() || isSubmitting}
        onConfirm={handleResubmit}
      >
        <div className="space-y-3 pt-2 text-left">
          <HeroFormField
            label="Keperluan / Tujuan Peminjaman *"
            required
            helperText="Perbaiki penjelasan alasan peminjaman aset"
          >
            <HeroTextarea
              value={resubmitPurpose}
              onChange={(e) => setResubmitPurpose(e.target.value)}
              rows={3}
              maxLength={300}
              showCount
            />
          </HeroFormField>
          <HeroFormField
            label="Catatan Kelengkapan Aset (Opsional)"
            helperText="Sesuaikan daftar kelengkapan yang dibawa"
          >
            <HeroTextarea
              value={resubmitEquipmentNotes}
              onChange={(e) => setResubmitEquipmentNotes(e.target.value)}
              rows={2}
              maxLength={200}
              showCount
            />
          </HeroFormField>
        </div>
      </HeroConfirmDialog>
    </>
  )
}
