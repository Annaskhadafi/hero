'use client'

import * as React from 'react'
import {
  HeroDetailModal,
  HeroStatusBadge,
} from '@/components/templates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Box,
  CheckCircle2,
  Clock,
  RotateCcw,
  Trash2,
  UserCheck,
  XCircle,
  Calendar,
  FileText,
  AlertCircle,
  Camera,
  History,
  Send,
  CheckCheck,
  ExternalLink,
  Eye,
} from 'lucide-react'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface AssetBorrowDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  borrow: any | null
  onSuccess?: () => void
}

export function AssetBorrowDetailModal({
  open,
  onOpenChange,
  borrow,
}: AssetBorrowDetailModalProps) {
  const [activeView, setActiveView] = React.useState<'details' | 'pdf'>('details')
  const [previewPhotoUrl, setPreviewPhotoUrl] = React.useState<string | null>(null)

  if (!borrow) return null

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

  const getStatusBadgeProps = (status: string) => {
    switch (status) {
      case 'borrowed':
        return { label: 'Sedang Dipinjam', status: 'approved' as const }
      case 'pending_return':
        return { label: 'Menunggu Pengembalian', status: 'pending' as const }
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

  const getHistoryActionInfo = (action: string) => {
    switch (action) {
      case 'submitted':
        return { label: 'Pengajuan Dibuat', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Send }
      case 'approved':
        return { label: 'Disetujui Holder', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 }
      case 'rejected':
        return { label: 'Ditolak Holder', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: XCircle }
      case 'needs_revision':
        return { label: 'Diminta Revisi', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertCircle }
      case 'resubmitted':
        return { label: 'Revisi Dikirim Ulang', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: RotateCcw }
      case 'return_requested':
        return { label: 'Pengembalian Diajukan', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Camera }
      case 'returned':
        return { label: 'Pengembalian Diterima Selesai', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCheck }
      case 'cancelled':
        return { label: 'Pengajuan Dibatalkan', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: Trash2 }
      default:
        return { label: action, color: 'bg-gray-100 text-gray-800 border-gray-200', icon: History }
    }
  }

  const badgeProps = getStatusBadgeProps(borrow.status)

  // Parse return photos if any
  let parsedPhotos: string[] = []
  if (borrow.returnPhotoUrls) {
    try {
      parsedPhotos = JSON.parse(borrow.returnPhotoUrls)
    } catch {
      parsedPhotos = [borrow.returnPhotoUrls]
    }
  }

  return (
    <>
      <HeroDetailModal
        open={open}
        onOpenChange={onOpenChange}
        title={`Detail Peminjaman: ${borrow.borrowNumber}`}
        subtitle={`Nomor Dokumen: ${borrow.borrowNumber}`}
        statusBadge={<HeroStatusBadge status={badgeProps.status} label={badgeProps.label} />}
      >
        {/* VIEW SELECTOR: RINGKASAN vs PRATINJAU DOKUMEN PDF (A4 PORTRAIT) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/70 pb-3 mb-4">
          <div className="inline-flex rounded-lg bg-muted/80 p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveView('details')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeView === 'details'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <FileText className="size-3.5 text-blue-600" />
              Ringkasan &amp; Alur Pengajuan
            </button>
            <button
              type="button"
              onClick={() => setActiveView('pdf')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeView === 'pdf'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Eye className="size-3.5 text-emerald-600" />
              Pratinjau Dokumen PDF (A4 Portrait)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 gap-1.5 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <a href={`/api/assets/borrow/${borrow.id}/pdf`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                Buka PDF di Tab Baru
              </a>
            </Button>
          </div>
        </div>

        {activeView === 'pdf' ? (
          <div className="space-y-4">
            {/* Quick Sticky Mini-Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-lg border border-border/80 bg-muted/30 p-3 text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block">Aset:</span>
                <span className="font-semibold text-foreground truncate block">{borrow.assetName}</span>
                <span className="text-[10px] text-muted-foreground">{borrow.assetNumber || '-'}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Peminjam:</span>
                <span className="font-semibold text-foreground truncate block">{borrow.borrowerName}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Holder Fisik:</span>
                <span className="font-semibold text-blue-700 truncate block">{borrow.holderName}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block">Batas Kembali:</span>
                <span className="font-semibold text-foreground truncate block">{formatDateTime(borrow.expectedReturnDate)}</span>
              </div>
            </div>

            {/* Embedded Live PDF Stream */}
            <div className="w-full overflow-hidden rounded-xl border border-border/80 shadow-xs bg-slate-100 flex flex-col items-center p-2">
              <iframe
                src={`/api/assets/borrow/${borrow.id}/pdf`}
                className="w-full h-[640px] rounded-lg border border-border/50 bg-white"
                title={`Pratinjau PDF Peminjaman Aset - ${borrow.borrowNumber}`}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* BANNER KETERLAMBATAN PENGEMBALIAN (OVERDUE) */}
            {borrow.isOverdue && (
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 space-y-1.5 text-xs text-rose-950">
                <span className="font-bold flex items-center gap-1.5 text-rose-800 text-sm">
                  <AlertCircle className="size-4 text-rose-600" />
                  Peringatan: Peminjaman Telah Melewati Batas Waktu ({borrow.overdueDays} Hari Terlambat)
                </span>
                <p className="text-rose-900 leading-relaxed">
                  Aset ini dijadwalkan kembali pada{' '}
                  <strong className="underline">{formatDateTime(borrow.expectedReturnDate)}</strong> namun belum dikembalikan ke Pemegang Aset ({borrow.holderName}).
                </p>
              </div>
            )}

            {/* SEKSI 1: IDENTITAS PEMINJAM & ASET */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card Peminjam */}
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <UserCheck className="size-4 text-blue-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Data Peminjam (Borrower)
                  </h4>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-muted-foreground">Nama Peminjam:</span>{' '}
                    <span className="font-semibold text-foreground">{borrow.borrowerName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">ID Karyawan:</span>{' '}
                    <span className="font-mono text-foreground">{borrow.borrowerEmployeeId || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Card Pemegang Aset Saat Ini (Holder Asal) */}
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <UserCheck className="size-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Pemegang Aset Saat Ini (Holder Asal)
                  </h4>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-muted-foreground">Nama Holder:</span>{' '}
                    <span className="font-semibold text-foreground">{borrow.holderName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Peran:</span>{' '}
                    <span className="font-medium text-blue-700">Approver Serah Terima Fisik</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SEKSI 2: INFORMASI ASET */}
            <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <div className="flex items-center gap-2">
                  <Box className="size-4 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Rincian Aset yang Dipinjam
                  </h4>
                </div>
                <Badge variant="outline" className="text-[11px] font-mono">
                  {borrow.assetNumber || 'Tanpa No Aset'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Deskripsi Aset</span>
                  <span className="font-semibold text-foreground">{borrow.assetName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Serial Number (SN)</span>
                  <span className="font-mono text-foreground">{borrow.serialNumber || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Nomor Dokumen</span>
                  <span className="font-mono font-semibold text-primary">{borrow.borrowNumber}</span>
                </div>
              </div>

              {borrow.equipmentNotes && (
                <div className="rounded-lg bg-muted/40 p-3 border border-border/50 text-xs mt-2">
                  <span className="font-semibold block text-[11px] text-muted-foreground">
                    Kelengkapan Fisik yang Disertakan:
                  </span>
                  <p className="text-foreground mt-0.5 leading-relaxed">{borrow.equipmentNotes}</p>
                </div>
              )}
            </div>

            {/* SEKSI 3: JADWAL & TUJUAN PEMINJAMAN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <Calendar className="size-4 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Waktu Peminjaman &amp; Pengembalian
                  </h4>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Waktu Pinjam:</span>
                    <span className="font-semibold text-foreground">{formatDateTime(borrow.borrowDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estimasi Kembali:</span>
                    <span className="font-semibold text-foreground">{formatDateTime(borrow.expectedReturnDate)}</span>
                  </div>
                  {borrow.actualReturnDate && (
                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-emerald-700">
                      <span className="font-medium">Waktu Kembali Fisik:</span>
                      <span className="font-bold">{formatDateTime(borrow.actualReturnDate)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <FileText className="size-4 text-primary" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Tujuan / Keperluan Peminjaman
                  </h4>
                </div>
                <p className="text-xs text-foreground leading-relaxed italic">
                  "{borrow.purpose}"
                </p>
                {borrow.approvalNote && (
                  <div className="rounded-lg bg-emerald-50/70 border border-emerald-200 p-2 text-xs text-emerald-900 mt-2">
                    <span className="font-semibold block text-[11px] text-emerald-700">
                      Catatan Persetujuan Holder:
                    </span>
                    <p className="mt-0.5">{borrow.approvalNote}</p>
                  </div>
                )}
              </div>
            </div>

            {/* SEKSI 4: BUKTI PENGEMBALIAN FISIK (JIKA ADA) */}
            {(borrow.returnNotes || parsedPhotos.length > 0 || borrow.returnConditionNotes) && (
              <div className="rounded-xl border border-purple-200 bg-purple-50/30 p-4 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 border-b border-purple-200 pb-2">
                  <Camera className="size-4 text-purple-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                    Pemeriksaan Fisik Pengembalian Aset
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {borrow.returnNotes && (
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-[11px] font-semibold block">
                        Catatan Pengembalian (Peminjam):
                      </span>
                      <p className="text-slate-800 bg-white/70 p-2.5 rounded-lg border border-border/50 italic">
                        "{borrow.returnNotes}"
                      </p>
                    </div>
                  )}

                  {borrow.returnConditionNotes && (
                    <div className="space-y-1">
                      <span className="text-emerald-800 text-[11px] font-semibold block">
                        Hasil Pemeriksaan Fisik (Holder):
                      </span>
                      <p className="text-emerald-950 bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200">
                        {borrow.returnConditionNotes}
                      </p>
                    </div>
                  )}
                </div>

                {parsedPhotos.length > 0 && (
                  <div className="pt-2 border-t border-purple-100 space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-700 block">
                      Foto Kondisi Fisik saat Pengembalian ({parsedPhotos.length} Foto):
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {parsedPhotos.map((photoUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewPhotoUrl(photoUrl)}
                          className="group relative rounded-lg overflow-hidden border border-border shadow-xs hover:border-primary transition-all cursor-pointer"
                        >
                          <img
                            src={resolveUploadUrl(photoUrl)}
                            alt={`Bukti Fisik ${idx + 1}`}
                            className="size-20 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-semibold">
                            Lihat Foto
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SEKSI 5: RIWAYAT PROSES PENGAJUAN (AUDIT TRAIL TIMELINE) */}
            <div className="rounded-xl border border-border/70 bg-card p-4 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <History className="size-4 text-primary" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Riwayat Alur Persetujuan &amp; Audit Trail
                </h4>
              </div>

              {borrow.histories && borrow.histories.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:bottom-0 before:left-2 before:top-2 before:w-0.5 before:bg-border/80">
                  {borrow.histories.map((hist: any, index: number) => {
                    const info = getHistoryActionInfo(hist.action)
                    const IconComp = info.icon

                    return (
                      <div key={hist.id || index} className="relative group">
                        <div className="absolute -left-6 top-0.5 flex size-4 items-center justify-center rounded-full bg-background border border-border">
                          <IconComp className="size-2.5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-medium border ${info.color}`}
                            >
                              {info.label}
                            </Badge>
                            <span className="text-xs font-semibold text-foreground">
                              {hist.actorName}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              ({hist.actorRole || 'Karyawan'})
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {formatDateTime(hist.createdAt)}
                          </span>
                        </div>
                        {hist.note && (
                          <p className="text-xs text-muted-foreground bg-muted/30 border border-border/40 rounded-md p-2 mt-1.5 leading-relaxed">
                            {hist.note}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Belum ada riwayat aktivitas tercatat.
                </p>
              )}
            </div>
          </div>
        )}
      </HeroDetailModal>

      {/* LIGHTBOX PREVIEW FOTO FISIK */}
      <Dialog open={Boolean(previewPhotoUrl)} onOpenChange={() => setPreviewPhotoUrl(null)}>
        <DialogContent className="max-w-2xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-1.5">
              <Camera className="size-4 text-primary" /> Foto Kondisi Fisik Aset
            </DialogTitle>
          </DialogHeader>
          {previewPhotoUrl && (
            <div className="mt-2 rounded-lg overflow-hidden border border-border bg-black/5 flex items-center justify-center max-h-[75vh]">
              <img
                src={resolveUploadUrl(previewPhotoUrl)}
                alt="Foto Fisik Aset"
                className="max-h-[70vh] w-auto object-contain rounded-md"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
