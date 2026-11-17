'use client'

import * as React from 'react'
import {
  HeroDetailModal,
  HeroStatusBadge,
  HeroConfirmDialog,
  HeroFormField,
  HeroTextarea,
  HeroFileUpload,
} from '@/components/templates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { isSuperAdminRole } from '@/lib/role-utils'
import { toast } from 'sonner'
import {
  ArrowRight,
  Ban,
  Box,
  CheckCircle2,
  Download,
  Clock,
  Eye,
  FileText,
  MapPin,
  PackageCheck,
  ShieldAlert,
  User,
  XCircle,
} from 'lucide-react'
import {
  approveAssetTransfer,
  rejectAssetTransfer,
  cancelAssetTransfer,
  resubmitAssetTransferAction,
} from '../actions'

interface AssetTransferDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transfer: any | null
  onRefresh: () => void
}

export function AssetTransferDetailModal({
  open,
  onOpenChange,
  transfer,
  onRefresh,
}: AssetTransferDetailModalProps) {
  const [isApproving, setIsApproving] = React.useState(false)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = React.useState(false)
  const [approveNote, setApproveNote] = React.useState('')
  const [receivedPhotoUrl, setReceivedPhotoUrl] = React.useState<string | null>(null)

  const [isRejectDialogOpen, setIsRejectDialogOpen] = React.useState(false)
  const [rejectReason, setRejectReason] = React.useState('')

  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false)
  const [isCancelling, setIsCancelling] = React.useState(false)

  const [isResubmitDialogOpen, setIsResubmitDialogOpen] = React.useState(false)
  const [resubmitNotes, setResubmitNotes] = React.useState('')
  const [resubmitOtherNote, setResubmitOtherNote] = React.useState('')

  const [previewPhotoUrl, setPreviewPhotoUrl] = React.useState<string | null>(null)

  if (!transfer) return null

  const photos: Array<{ fileName: string; fileUrl: string }> = Array.isArray(transfer.photos)
    ? transfer.photos
    : []

  const receivedPhotos: Array<{ fileName: string; fileUrl: string }> = Array.isArray(
    transfer.receivedPhotos
  )
    ? transfer.receivedPhotos
    : []

  const equipmentList: string[] = Array.isArray(transfer.equipmentChecklist)
    ? transfer.equipmentChecklist
    : []

  const isNewHolderStep = Boolean(
    transfer.isNewHolderStep ||
      transfer.currentStepOrder === 2 ||
      transfer.currentApproverEmployeeId === transfer.newHolderEmployeeId
  )

  const handleApprove = async () => {
    if (!approveNote.trim()) {
      toast.error(
        isNewHolderStep
          ? 'Catatan penerimaan aset wajib diisi.'
          : 'Catatan persetujuan wajib diisi.'
      )
      return
    }

    try {
      setIsApproving(true)
      const photosPayload = receivedPhotoUrl
        ? [{ fileName: 'foto-aset-diterima.jpg', fileUrl: receivedPhotoUrl }]
        : []
      const res = await approveAssetTransfer(transfer.id, approveNote.trim(), photosPayload)
      if (res.success) {
        toast.success(res.message)
        setIsApproveDialogOpen(false)
        onOpenChange(false)
        onRefresh()
      } else {
        toast.error(res.message || 'Gagal menyetujui transfer')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Terjadi kesalahan')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Alasan penolakan wajib diisi.')
      return
    }

    try {
      setIsApproving(true)
      const res = await rejectAssetTransfer(transfer.id, rejectReason.trim())
      if (res.success) {
        toast.success(res.message)
        setIsRejectDialogOpen(false)
        onOpenChange(false)
        onRefresh()
      } else {
        toast.error(res.message || 'Gagal menolak transfer')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Terjadi kesalahan')
    } finally {
      setIsApproving(false)
    }
  }

  const handleCancelTransfer = async () => {
    try {
      setIsCancelling(true)
      const res = await cancelAssetTransfer(transfer.id)
      if (res.success) {
        toast.success(res.message)
        setIsCancelDialogOpen(false)
        onOpenChange(false)
        onRefresh()
      } else {
        toast.error(res.message || 'Gagal membatalkan pengajuan transfer')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Terjadi kesalahan')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleResubmit = async () => {
    setIsApproving(true)
    try {
      const res = await resubmitAssetTransferAction({
        id: transfer.id,
        notes: resubmitNotes.trim() || undefined,
        equipmentOtherNote: resubmitOtherNote.trim() || undefined,
      })
      if (res.success) {
        toast.success(res.message)
        setIsResubmitDialogOpen(false)
        onOpenChange(false)
        onRefresh()
      } else {
        toast.error(res.message || 'Gagal mengirim ulang revisi transfer')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Terjadi kesalahan')
    } finally {
      setIsApproving(false)
    }
  }

  const canApprove = Boolean(transfer.canApprove)
  const canCancel = Boolean(transfer.canCancel)
  const canEditRevision = Boolean(transfer.canEditRevision)

  return (
    <>
      <HeroDetailModal
        open={open}
        onOpenChange={onOpenChange}
        title={`Detail Dokumen: ${transfer.transferNumber}`}
        subtitle="Informasi lengkap permohonan mutasi aset dan status persetujuan"
        statusBadge={<HeroStatusBadge status={transfer.status} />}
        actions={
          canApprove || canCancel ? (
            <div className="flex items-center gap-2">
            {(() => {
              const canDownload = transfer.canDownload !== false
              if (!canDownload) return null
              const pdfDownloadUrl = transfer.pdfUrl ? resolveUploadUrl(transfer.pdfUrl) : `/api/assets/transfer/${transfer.id}/pdf`
              return (
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="h-9 gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50 font-semibold"
                >
                  <a href={pdfDownloadUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="size-4" /> Download PDF (A4)
                  </a>
                </Button>
              )
            })()}
              {canCancel && (
                <Button
                  variant="outline"
                  className="h-9 text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950"
                  onClick={() => setIsCancelDialogOpen(true)}
                  disabled={isCancelling}
                >
                  <Ban className="size-4 mr-1.5" />
                  Batalkan Pengajuan
                </Button>
              )}

              {canEditRevision && (
                <Button
                  className="h-9 bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-xs gap-1.5"
                  onClick={() => {
                    setResubmitNotes(transfer.notes || '')
                    setResubmitOtherNote(transfer.equipmentOtherNote || '')
                    setIsResubmitDialogOpen(true)
                  }}
                  disabled={isApproving}
                >
                  <Clock className="size-4" />
                  Revisi Pengajuan
                </Button>
              )}

              {canApprove && (
                <>
                  <Button
                    variant="outline"
                    className="h-9 text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950"
                    onClick={() => {
                      setRejectReason('')
                      setIsRejectDialogOpen(true)
                    }}
                    disabled={isApproving}
                  >
                    <XCircle className="size-4 mr-1.5" />
                    Tolak
                  </Button>
                  <Button
                    className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
                    onClick={() => {
                      setApproveNote('')
                      setReceivedPhotoUrl(null)
                      setIsApproveDialogOpen(true)
                    }}
                    disabled={isApproving}
                  >
                    {isNewHolderStep ? (
                      <>
                        <PackageCheck className="size-4 mr-1.5" />
                        Diterima
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="size-4 mr-1.5" />
                        Setujui
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          ) : undefined
        }
      >
        <div className="space-y-6 text-sm">
          {/* BANNER PERMINTAAN REVISI */}
          {transfer.status === 'needs_revision' && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-1.5 text-xs text-amber-950">
              <span className="font-bold flex items-center gap-1.5 text-amber-800 text-sm">
                <ShieldAlert className="size-4 text-amber-600" />
                Permintaan Revisi / Perbaikan oleh Approver
              </span>
              <p className="text-xs leading-relaxed bg-white/80 p-2.5 rounded-lg border border-amber-200">
                {transfer.lastRevertNote || 'Mohon sesuaikan rincian transfer aset sesuai catatan yang diberikan.'}
              </p>
            </div>
          )}

          {/* HEADER SUMMARY CARD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ASET CARD */}
            <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                <Box className="size-4 text-primary" />
                Informasi Aset
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-foreground">{transfer.assetName}</h3>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <Badge variant="secondary" className="font-mono text-xs">
                    No. Aset: {transfer.assetNumber || '-'}
                  </Badge>
                  {transfer.serialNumber && (
                    <Badge variant="outline" className="font-mono text-xs">
                      SN: {transfer.serialNumber}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* STATUS & PIC CARD */}
            <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-foreground text-xs uppercase tracking-wider text-muted-foreground">
                <Clock className="size-4 text-primary" />
                Alur & Status Terkini
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status Dokumen:</span>
                  <HeroStatusBadge status={transfer.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tahap / Approver:</span>
                  <span className="font-medium text-foreground">
                    {transfer.currentApproverTitle || 'Tahap Verifikasi'} (
                    {transfer.currentApproverName || '-'})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tanggal Pengajuan:</span>
                  <span className="text-muted-foreground">
                    {transfer.createdAt
                      ? new Date(transfer.createdAt).toLocaleString('id-ID')
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PERPINDAHAN HOLDER & LOKASI */}
          <div className="rounded-lg border border-border/70 bg-muted/20 p-4 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ArrowRight className="size-3.5 text-primary" />
              Alur Mutasi Pemegang & Lokasi
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* ASAL */}
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2">
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <User className="size-3.5" />
                  Holder Saat Ini (Asal)
                </span>
                <div className="text-sm font-bold text-foreground">
                  {transfer.currentHolderName}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-3 text-amber-600" />
                  <span>Site: {transfer.currentLocationName}</span>
                </div>
              </div>

              {/* TUJUAN */}
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <User className="size-3.5" />
                  Holder Baru (Penerima)
                </span>
                <div className="text-sm font-bold text-foreground">
                  {transfer.newHolderName}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-3 text-emerald-600" />
                  <span>Site: {transfer.targetLocationName}</span>
                </div>
              </div>
            </div>
          </div>

          {/* KELENGKAPAN ASET */}
          <div className="rounded-lg border border-border/70 bg-card p-4 space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Kelengkapan Barang yang Disertakan
            </h4>
            {transfer.equipmentOtherNote ? (
              <p className="text-xs font-medium text-foreground bg-muted/40 p-3 rounded-md border border-border/60 leading-relaxed whitespace-pre-line">
                {transfer.equipmentOtherNote}
              </p>
            ) : equipmentList.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {equipmentList.map((item) => (
                  <Badge
                    key={item}
                    variant="outline"
                    className="bg-primary/5 text-primary border-primary/20 text-xs px-2.5 py-1"
                  >
                    ✓ {item}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Unit Lengkap beserta perlengkapan standar.</p>
            )}
          </div>

          {/* FOTO FISIK ASET (SEBELUM TRANSFER) */}
          {photos.length > 0 && (
            <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Foto Kondisi Fisik Aset (Sebelum Transfer)
              </h4>
              <div className="flex flex-wrap gap-3">
                {photos.map((p, idx) => (
                  <div
                    key={idx}
                    className="relative group size-28 rounded-md border overflow-hidden cursor-pointer bg-muted"
                    onClick={() => setPreviewPhotoUrl(p.fileUrl)}
                  >
                    <img
                      src={resolveUploadUrl(p.fileUrl)}
                      alt={p.fileName || 'Foto Aset'}
                      className="size-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="size-5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FOTO FISIK ASET SAAT DITERIMA (HOLDER BARU) */}
          {receivedPhotos.length > 0 && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <PackageCheck className="size-4 text-emerald-600" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  Foto Fisik Aset Saat Diterima (Holder Baru)
                </h4>
              </div>
              <div className="flex flex-wrap gap-3">
                {receivedPhotos.map((p, idx) => (
                  <div
                    key={idx}
                    className="relative group size-28 rounded-md border border-emerald-300 overflow-hidden cursor-pointer bg-muted"
                    onClick={() => setPreviewPhotoUrl(p.fileUrl)}
                  >
                    <img
                      src={resolveUploadUrl(p.fileUrl)}
                      alt={p.fileName || 'Foto Aset Diterima'}
                      className="size-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Eye className="size-5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADDITIONAL NOTES */}
          {transfer.notes && (
            <div className="rounded-lg border border-border/70 bg-card p-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Catatan Tambahan (Additional Note)
              </h4>
              <p className="text-xs text-foreground bg-muted/40 p-3 rounded-md whitespace-pre-wrap">
                {transfer.notes}
              </p>
            </div>
          )}

          {/* APPROVAL TIMELINE */}
          {Array.isArray(transfer.approvalSteps) && transfer.approvalSteps.length > 0 && (
            <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Riwayat Langkah Persetujuan
              </h4>
              <div className="space-y-2">
                {transfer.approvalSteps.map((step: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-md border border-border/50 text-xs bg-muted/20"
                  >
                    <div>
                      <span className="font-semibold text-foreground">
                        Step {step.level}: {step.decisionNote || step.approverName}
                      </span>
                      <div className="text-muted-foreground">
                        Approver: {step.approverName || 'Ditugaskan'}
                      </div>
                    </div>
                    <div>
                      <HeroStatusBadge status={step.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </HeroDetailModal>

      {/* APPROVE / RECEIVE CONFIRM DIALOG */}
      <HeroConfirmDialog
        open={isApproveDialogOpen}
        onOpenChange={setIsApproveDialogOpen}
        title={isNewHolderStep ? 'Konfirmasi Penerimaan Aset Fisik' : 'Setujui Pengajuan Transfer Aset'}
        description={
          isNewHolderStep
            ? 'Konfirmasikan bahwa aset fisik telah Anda terima dalam kondisi baik. Silakan masukkan catatan dan Anda dapat melampirkan foto aset saat diterima.'
            : 'Silakan masukkan catatan persetujuan untuk permohonan transfer aset ini.'
        }
        tone="success"
        confirmLabel={isNewHolderStep ? 'Konfirmasi Penerimaan' : 'Ya, Setujui'}
        confirmDisabled={!approveNote.trim() || isApproving}
        isProcessing={isApproving}
        onConfirm={handleApprove}
      >
        <div className="space-y-4 pt-1">
          <HeroFormField
            label={isNewHolderStep ? 'Catatan Penerimaan Aset' : 'Catatan Persetujuan'}
            required
            tooltip={
              isNewHolderStep
                ? 'Tuliskan catatan kondisi fisik aset saat diterima'
                : 'Tuliskan catatan persetujuan atau instruksi serah terima fisik aset'
            }
          >
            <HeroTextarea
              placeholder={
                isNewHolderStep
                  ? 'Contoh: Aset fisik dan kelengkapan telah diterima langsung dalam kondisi baik dan berfungsi normal...'
                  : 'Tulis catatan persetujuan... (contoh: Disetujui, serah terima fisik dan dokumen lengkap)'
              }
              value={approveNote}
              onChange={(e) => setApproveNote(e.target.value)}
              rows={3}
              maxLength={300}
              showCount
            />
          </HeroFormField>

          {isNewHolderStep && (
            <HeroFormField
              label="Foto Kondisi Fisik Saat Diterima (Opsional)"
              helperText="Unggah foto fisik aset saat serah terima selesai (JPG/PNG tersimpan persisten di S3 CloudHost)"
            >
              <HeroFileUpload
                value={receivedPhotoUrl}
                onChange={setReceivedPhotoUrl}
                label="Unggah Foto Fisik Saat Diterima"
                description="Format gambar JPG atau PNG (Maksimal 10MB)"
                accept="image/*"
              />
            </HeroFormField>
          )}
        </div>
      </HeroConfirmDialog>

      {/* REJECT CONFIRM DIALOG */}
      <HeroConfirmDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        title="Tolak Pengajuan Transfer Aset"
        description="Apakah Anda yakin ingin menolak permohonan transfer aset ini? Masukkan alasan penolakan."
        tone="destructive"
        confirmLabel="Ya, Tolak Transfer"
        confirmDisabled={!rejectReason.trim() || isApproving}
        isProcessing={isApproving}
        onConfirm={handleReject}
      >
        <div className="space-y-1.5 pt-1">
          <HeroFormField
            label="Alasan Penolakan"
            required
            tooltip="Jelaskan alasan permohonan transfer aset ini ditolak"
          >
            <HeroTextarea
              placeholder="Tulis alasan penolakan... (contoh: Unit laptop masih dibutuhkan di departemen saat ini / charger tidak ada)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              maxLength={300}
              showCount
            />
          </HeroFormField>
        </div>
      </HeroConfirmDialog>

      {/* CANCEL / HARD DELETE CONFIRM DIALOG */}
      <HeroConfirmDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        title="Batalkan dan Hapus Pengajuan?"
        description={`Apakah Anda yakin ingin membatalkan pengajuan transfer aset ${transfer.transferNumber}? Pengajuan akan langsung dihapus permanen dari sistem.`}
        tone="destructive"
        confirmLabel="Ya, Batalkan & Hapus"
        isProcessing={isCancelling}
        onConfirm={handleCancelTransfer}
      />

      {/* RESUBMIT REVISION DIALOG */}
      <HeroConfirmDialog
        open={isResubmitDialogOpen}
        onOpenChange={setIsResubmitDialogOpen}
        title="Kirim Ulang Revisi Transfer Aset"
        description={`Perbarui catatan atau rincian permohonan transfer aset ${transfer.transferNumber}. Setelah dikirim ulang, persetujuan akan langsung kembali ke meja Last Approver.`}
        tone="warning"
        confirmLabel={isApproving ? 'Mengirim...' : 'Kirim Ulang Revisi'}
        cancelLabel="Batal"
        confirmDisabled={isApproving}
        isProcessing={isApproving}
        onConfirm={handleResubmit}
      >
        <div className="space-y-3 pt-1 text-left">
          <HeroFormField
            label="Catatan Pengajuan / Keterangan Transfer"
            helperText="Perbaiki penjelasan alasan atau instruksi transfer aset"
          >
            <HeroTextarea
              placeholder="Masukkan catatan perbaikan..."
              value={resubmitNotes}
              onChange={(e) => setResubmitNotes(e.target.value)}
              rows={3}
              maxLength={300}
              showCount
            />
          </HeroFormField>
          <HeroFormField
            label="Catatan Kelengkapan Other (Opsional)"
            helperText="Sesuaikan catatan kelengkapan fisik unit"
          >
            <HeroTextarea
              placeholder="Contoh: Kabel charger dan tas laptop disertakan..."
              value={resubmitOtherNote}
              onChange={(e) => setResubmitOtherNote(e.target.value)}
              rows={2}
              maxLength={200}
              showCount
            />
          </HeroFormField>
        </div>
      </HeroConfirmDialog>

      {/* PHOTO PREVIEW LIGHTBOX DIALOG */}
      <Dialog open={!!previewPhotoUrl} onOpenChange={(o) => !o && setPreviewPhotoUrl(null)}>
        <DialogContent className="max-w-3xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">Foto Kondisi Fisik Aset</DialogTitle>
          </DialogHeader>
          {previewPhotoUrl && (
            <div className="max-h-[75vh] overflow-hidden flex items-center justify-center bg-black/5 rounded-md">
              <img
                src={resolveUploadUrl(previewPhotoUrl)}
                alt="Pratinjau Foto"
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
