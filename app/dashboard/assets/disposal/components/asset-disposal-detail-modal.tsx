'use client'

import * as React from 'react'
import {
  HeroDetailModal,
  HeroStatusBadge,
  HeroConfirmDialog,
  HeroFormField,
  HeroTextarea,
} from '@/components/templates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Download,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  Clock,
  Building2,
  Trash2,
  AlertTriangle,
  Paperclip,
  ShieldCheck,
  Ban,
} from 'lucide-react'
import {
  approveAssetDisposal,
  rejectAssetDisposal,
  cancelAssetDisposal,
  resubmitAssetDisposalAction,
} from '../actions'

interface AssetDisposalDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: any | null
  onSuccess: () => void
}

export function AssetDisposalDetailModal({
  open,
  onOpenChange,
  item,
  onSuccess,
}: AssetDisposalDetailModalProps) {
  // Confirm Dialog states
  const [isApproveOpen, setIsApproveOpen] = React.useState(false)
  const [isRejectOpen, setIsRejectOpen] = React.useState(false)
  const [isCancelOpen, setIsCancelOpen] = React.useState(false)
  const [isResubmitOpen, setIsResubmitOpen] = React.useState(false)

  const [decisionNote, setDecisionNote] = React.useState('')
  const [resubmitNotes, setResubmitNotes] = React.useState('')
  const [isProcessing, setIsProcessing] = React.useState(false)

  if (!item) return null

  const handleResubmit = async () => {
    setIsProcessing(true)
    try {
      const res = await resubmitAssetDisposalAction({
        id: item.id,
        notes: resubmitNotes.trim() || undefined,
      })
      if (res.success) {
        toast.success(res.message || 'Revisi berhasil dikirim ulang.')
        setIsResubmitOpen(false)
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.message || 'Gagal mengirim ulang revisi.')
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + (err?.message || ''))
    } finally {
      setIsProcessing(false)
    }
  }

  const formatDateTime = (val?: string | Date | null) => {
    if (!val) return '-'
    const d = new Date(val)
    if (isNaN(d.getTime())) return '-'
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Makassar',
    }).format(d)
  }

  const getStatusTone = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return { label: 'Disetujui Penuh', status: 'approved' as const }
      case 'rejected':
        return { label: 'Ditolak', status: 'rejected' as const }
      case 'cancelled':
        return { label: 'Dibatalkan', status: 'draft' as const }
      case 'pending':
      default:
        return { label: 'Menunggu Persetujuan', status: 'pending' as const }
    }
  }

  const handleDownloadPdf = () => {
    if (!item.id) return
    window.open(`/api/assets/disposal/${item.id}/pdf`, '_blank')
  }

  const handleApprove = async () => {
    if (!decisionNote.trim()) {
      toast.error('Catatan persetujuan wajib diisi.')
      return
    }

    setIsProcessing(true)
    try {
      const res = await approveAssetDisposal(item.id, decisionNote.trim())
      if (res.success) {
        toast.success(res.message || 'Persetujuan berhasil dicatat!')
        setIsApproveOpen(false)
        setDecisionNote('')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.message || 'Gagal memproses persetujuan.')
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + (err?.message || ''))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!decisionNote.trim()) {
      toast.error('Alasan penolakan wajib diisi.')
      return
    }

    setIsProcessing(true)
    try {
      const res = await rejectAssetDisposal(item.id, decisionNote.trim())
      if (res.success) {
        toast.success(res.message || 'Permohonan berhasil ditolak.')
        setIsRejectOpen(false)
        setDecisionNote('')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.message || 'Gagal menolak permohonan.')
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + (err?.message || ''))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancel = async () => {
    setIsProcessing(true)
    try {
      const res = await cancelAssetDisposal(item.id, decisionNote.trim() || undefined)
      if (res.success) {
        toast.success(res.message || 'Permohonan berhasil dibatalkan.')
        setIsCancelOpen(false)
        setDecisionNote('')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(res.message || 'Gagal membatalkan permohonan.')
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + (err?.message || ''))
    } finally {
      setIsProcessing(false)
    }
  }

  const statusTone = getStatusTone(item.status)
  const approvalSteps = item.approvalSteps || []

  return (
    <>
      <HeroDetailModal
        open={open}
        onOpenChange={onOpenChange}
        title={`Detail Penghapusan Aset: ${item.disposalNumber}`}
        subtitle={`Diajukan pada ${formatDateTime(item.submittedAt || item.createdAt)}`}
        maxWidth="4xl"
        statusBadge={
          <HeroStatusBadge
            status={statusTone.status}
            label={statusTone.label}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            {/* Download PDF Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              className="h-9 gap-1.5 text-xs text-primary border-primary/40 hover:bg-primary/5"
            >
              <Download className="size-4" />
              Download PDF (A4)
            </Button>

            {/* Resubmit Button (if needs_revision) */}
            {item.canEditRevision && (
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setResubmitNotes(item.notes || '')
                  setIsResubmitOpen(true)
                }}
                className="h-9 gap-1.5 text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                <Clock className="size-4" />
                Revisi Pengajuan
              </Button>
            )}

            {/* Cancel Button (if authorized) */}
            {item.canCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDecisionNote('')
                  setIsCancelOpen(true)
                }}
                className="h-9 gap-1.5 text-xs text-rose-600 border-rose-300 hover:bg-rose-50"
              >
                <Ban className="size-4" />
                Batalkan Pengajuan
              </Button>
            )}

            {/* Reject Button (if approver) */}
            {item.canApprove && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDecisionNote('')
                  setIsRejectOpen(true)
                }}
                className="h-9 gap-1.5 text-xs text-rose-600 border-rose-300 hover:bg-rose-50"
              >
                <XCircle className="size-4" />
                Tolak
              </Button>
            )}

            {/* Approve Button (if approver) */}
            {item.canApprove && (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  setDecisionNote('')
                  setIsApproveOpen(true)
                }}
                className="h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
              >
                <CheckCircle2 className="size-4" />
                Setujui Tahap Ini
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-6 text-xs">
          {/* BANNER PERMINTAAN REVISI */}
          {item.status === 'needs_revision' && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-1.5 text-xs text-amber-950">
              <span className="font-bold flex items-center gap-1.5 text-amber-800 text-sm">
                <AlertTriangle className="size-4 text-amber-600" />
                Permintaan Revisi / Perbaikan oleh Approver
              </span>
              <p className="text-xs leading-relaxed bg-white/80 p-2.5 rounded-lg border border-amber-200">
                {item.lastRevertNote || 'Mohon sesuaikan rincian disposal aset sesuai catatan yang diberikan.'}
              </p>
            </div>
          )}

          {/* 1. INFORMASI PEMOHON & UNIT KERJA */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-border">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User className="size-4 text-primary" />
              1. Informasi Pemohon & Unit Kerja
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-muted-foreground block text-[11px]">Dibuat Oleh</span>
                <span className="font-semibold text-foreground">{item.applicantName}</span>
                {item.applicantJobTitle && (
                  <span className="text-[10px] text-muted-foreground block">{item.applicantJobTitle}</span>
                )}
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Departemen</span>
                <span className="font-semibold text-foreground">{item.departmentName}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Section</span>
                <span className="font-semibold text-foreground">{item.sectionName || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Cabang / Site</span>
                <span className="font-semibold text-foreground">{item.siteName}</span>
              </div>
            </div>
          </div>

          {/* 2. SPESIFIKASI & RINCIAN ASET */}
          <div className="bg-card p-4 rounded-xl border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="size-4 text-primary" />
                2. Data Aset yang Dihapus (Disposal Assets)
              </h4>
              <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-800 border-slate-300">
                {item.items && Array.isArray(item.items) ? `${item.items.length} Unit Aset` : '1 Unit Aset'}
              </Badge>
            </div>

            {item.items && Array.isArray(item.items) && item.items.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-border bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-slate-50 text-[10px] font-bold text-slate-700 uppercase">
                      <th className="w-10 px-3 py-2 text-center">No</th>
                      <th className="px-3 py-2">Nama Aset</th>
                      <th className="px-3 py-2">Nomor Aset</th>
                      <th className="w-24 px-3 py-2 text-center">Tahun Beli</th>
                      <th className="px-3 py-2">Alasan Penghapusan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.items.map((it: any, idx: number) => (
                      <tr key={idx} className="border-b border-border/60 last:border-b-0 hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-center font-medium text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{it.assetName}</td>
                        <td className="px-3 py-2 font-mono text-slate-800">{it.assetNumber || '-'}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-700">{it.purchaseYear || '-'}</td>
                        <td className="px-3 py-2 text-rose-800 text-[11px] font-medium">{it.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Nama Aset</span>
                  <span className="font-bold text-foreground text-sm">{item.assetName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Nomor Aset</span>
                  <span className="font-semibold text-foreground">{item.assetNumber || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Tahun Pembelian</span>
                  <span className="font-semibold text-foreground">{item.purchaseYear || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Status Master Aset</span>
                  <Badge
                    variant="outline"
                    className={
                      item.status === 'approved'
                        ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                        : 'border-slate-300 text-slate-600'
                    }
                  >
                    {item.status === 'approved' ? 'DISPOSED' : 'PENDING DISPOSAL'}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* 3. ALASAN & JUSTIFIKASI TEKNIS */}
          <div className="bg-card p-4 rounded-xl border border-border">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Trash2 className="size-4 text-destructive" />
              3. Catatan & Alasan Penghapusan Aset
            </h4>
            <p className="text-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/60">
              {item.notes}
            </p>
          </div>

          {/* 4. BERKAS LAMPIRAN */}
          {item.attachments && item.attachments.length > 0 && (
            <div className="bg-card p-4 rounded-xl border border-border">
              <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Paperclip className="size-4 text-primary" />
                4. Berkas Lampiran Pendukung ({item.attachments.length})
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {item.attachments.map((att: any, idx: number) => (
                  <a
                    key={idx}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className="size-4 text-primary shrink-0" />
                      <span className="truncate font-medium text-foreground">{att.fileName}</span>
                    </div>
                    <span className="text-[10px] text-primary font-semibold shrink-0">Lihat Berkas</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* 5. MATRIKS TANDA TANGAN & STATUS APPROVAL */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-border">
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-emerald-600" />
              5. Matriks Persetujuan & Riwayat Otorisasi
            </h4>

            <div className="space-y-3">
              {approvalSteps.map((step: any, idx: number) => {
                const isApproved = step.status === 'Approved'
                const isRejected = step.status === 'Rejected'
                const isPending = step.status === 'Pending'

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      isApproved
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : isRejected
                        ? 'border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20'
                        : isPending
                        ? 'border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className={
                            isApproved
                              ? 'border-emerald-500 text-emerald-700 bg-emerald-100/60'
                              : isRejected
                              ? 'border-rose-500 text-rose-700 bg-rose-100/60'
                              : isPending
                              ? 'border-amber-500 text-amber-700 bg-amber-100/60'
                              : 'border-slate-300 text-slate-600'
                          }
                        >
                          Step {step.level}
                        </Badge>
                        <span className="font-bold text-foreground">
                          {step.approverName}
                        </span>
                        {step.approverRole && (
                          <span className="text-[11px] text-muted-foreground">({step.approverRole})</span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground block">
                        {step.decisionNote?.startsWith('Step') ? step.decisionNote : (step.formName || `Tahap ${step.level}`)}
                      </span>
                      {step.decisionNote && !step.decisionNote.startsWith('Step') && (
                        <div className="mt-1 text-[11px] text-foreground bg-background/80 p-1.5 rounded border border-border/60">
                          <strong>Catatan Review:</strong> {step.decisionNote}
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-bold block ${
                          isApproved
                            ? 'text-emerald-600'
                            : isRejected
                            ? 'text-rose-600'
                            : isPending
                            ? 'text-amber-600'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {step.status}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateTime(step.reviewedAt)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </HeroDetailModal>

      {/* CONFIRM DIALOG: APPROVE */}
      <HeroConfirmDialog
        open={isApproveOpen}
        onOpenChange={setIsApproveOpen}
        title="Konfirmasi Persetujuan Tahap Disposal"
        description="Apakah anda yakin menyetujui permohonan Asset Disposal ini? Berikan catatan review atau otorisasi anda."
        confirmLabel="Ya, Setujui"
        cancelLabel="Batal"
        tone="success"
        isLoading={isProcessing}
        onConfirm={handleApprove}
      >
        <div className="mt-2">
          <HeroFormField label="Catatan Persetujuan (Wajib)" required>
            <HeroTextarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="Contoh: Telah diverifikasi, unit memenuhi kriteria penghapusan aset..."
              rows={3}
            />
          </HeroFormField>
        </div>
      </HeroConfirmDialog>

      {/* CONFIRM DIALOG: REJECT */}
      <HeroConfirmDialog
        open={isRejectOpen}
        onOpenChange={setIsRejectOpen}
        title="Konfirmasi Penolakan Asset Disposal"
        description="Apakah anda yakin ingin menolak permohonan Asset Disposal ini? Permohonan yang ditolak tidak dapat diproses lebih lanjut."
        confirmLabel="Ya, Tolak Permohonan"
        cancelLabel="Batal"
        tone="destructive"
        isLoading={isProcessing}
        onConfirm={handleReject}
      >
        <div className="mt-2">
          <HeroFormField label="Alasan Penolakan (Wajib)" required>
            <HeroTextarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="Sebutkan alasan penolakan atau perbaikan yang dibutuhkan..."
              rows={3}
            />
          </HeroFormField>
        </div>
      </HeroConfirmDialog>

      {/* CONFIRM DIALOG: CANCEL */}
      <HeroConfirmDialog
        open={isCancelOpen}
        onOpenChange={setIsCancelOpen}
        title="Konfirmasi Pembatalan Pengajuan"
        description="Apakah anda yakin ingin membatalkan pengajuan Asset Disposal ini? Pengajuan akan berstatus Dibatalkan."
        confirmLabel="Ya, Batalkan Pengajuan"
        cancelLabel="Kembali"
        tone="warning"
        isLoading={isProcessing}
        onConfirm={handleCancel}
      >
        <div className="mt-2">
          <HeroFormField label="Alasan Pembatalan (Opsional)">
            <HeroTextarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="Alasan pembatalan oleh pembuat..."
              rows={2}
            />
          </HeroFormField>
        </div>
      </HeroConfirmDialog>

      {/* CONFIRM DIALOG: RESUBMIT REVISION */}
      <HeroConfirmDialog
        open={isResubmitOpen}
        onOpenChange={setIsResubmitOpen}
        title="Kirim Ulang Revisi Asset Disposal"
        description={`Perbarui catatan atau keterangan permohonan Asset Disposal ${item.disposalNumber}. Setelah dikirim ulang, persetujuan akan langsung kembali ke meja Last Approver.`}
        confirmLabel={isProcessing ? 'Mengirim...' : 'Kirim Ulang Revisi'}
        cancelLabel="Batal"
        tone="warning"
        confirmDisabled={isProcessing}
        isLoading={isProcessing}
        onConfirm={handleResubmit}
      >
        <div className="mt-2 text-left">
          <HeroFormField label="Catatan / Keterangan Penjelasan Baru">
            <HeroTextarea
              value={resubmitNotes}
              onChange={(e) => setResubmitNotes(e.target.value)}
              placeholder="Perbarui alasan atau justifikasi penghapusan aset..."
              rows={3}
            />
          </HeroFormField>
        </div>
      </HeroConfirmDialog>
    </>
  )
}
