'use client'

import * as React from 'react'
import {
  HeroDetailModal,
  HeroStatusBadge,
} from '@/components/templates'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  User,
  Clock,
  Building2,
  Paperclip,
  ShieldCheck,
  Trash2,
  ClipboardCheck,
} from 'lucide-react'

interface AssetDisposalDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: any | null
  onSuccess?: () => void
}

export function AssetDisposalDetailModal({
  open,
  onOpenChange,
  item,
}: AssetDisposalDetailModalProps) {
  if (!item) return null

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
      case 'completed':
        return {
          label:
            item?.disposalType === 'Penjualan'
              ? 'Selesai (Disposal & Lelang Selesai)'
              : 'Selesai (Disposal Selesai)',
          status: 'approved' as const,
        }
      case 'waiting_ba_disposal':
        return {
          label:
            item?.disposalType === 'Donasi'
              ? 'Menunggu BA Donasi (Pengaju)'
              : 'Menunggu Berita Acara (Pengaju)',
          status: 'pending' as const,
        }
      case 'waiting_auction_docs':
        return { label: 'Menunggu Lampiran Lelang', status: 'pending' as const }
      case 'waiting_finance_docs':
        return { label: 'Menunggu Dokumen Finance', status: 'pending' as const }
      case 'approved':
        return { label: 'Disetujui Penuh', status: 'approved' as const }
      case 'rejected':
        return { label: 'Ditolak', status: 'rejected' as const }
      case 'cancelled':
        return { label: 'Dibatalkan', status: 'draft' as const }
      case 'needs_revision':
        return { label: 'Perlu Revisi', status: 'pending' as const }
      case 'pending':
      default:
        return { label: 'Menunggu Persetujuan', status: 'pending' as const }
    }
  }

  const statusTone = getStatusTone(item.status)
  const approvalSteps = item.approvalSteps || []

  return (
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
              <div>
                <span className="text-muted-foreground block text-[11px]">Jenis Disposal</span>
                <div className="mt-0.5">
                  {item.disposalType === 'Penjualan' ? (
                    <span className="inline-flex items-center text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      🏷️ Penjualan
                    </span>
                  ) : item.disposalType === 'Donasi' ? (
                    <span className="inline-flex items-center text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                      🎁 Donasi
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                      🗑️ Penghapusan
                    </span>
                  )}
                </div>
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
                      <th className="px-3 py-2">Nilai Terakhir Aset</th>
                      {item.disposalType === 'Penjualan' && (
                        <th className="px-3 py-2 text-blue-900 font-extrabold">Estimasi Harga Penjualan</th>
                      )}
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
                        <td className="px-3 py-2 font-mono font-semibold text-emerald-800">
                          {it.bookValue ? `Rp ${new Intl.NumberFormat('id-ID').format(it.bookValue)}` : 'Rp 0'}
                        </td>
                        {item.disposalType === 'Penjualan' && (
                          <td className="px-3 py-2 font-mono font-bold text-blue-900">
                            {it.estimatedSalePrice ? `Rp ${new Intl.NumberFormat('id-ID').format(it.estimatedSalePrice)}` : 'Rp 0'}
                          </td>
                        )}
                        <td className="px-3 py-2 text-rose-800 text-[11px] font-medium">{it.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 bg-slate-50/90 font-bold text-slate-900">
                      <td colSpan={4} className="px-3 py-2 text-right uppercase text-[10px]">
                        {item.disposalType === 'Penjualan' ? 'Total Akumulasi:' : 'Total Nilai Terakhir Aset:'}
                      </td>
                      <td className="px-3 py-2 font-mono text-emerald-800 font-extrabold">
                        Rp {new Intl.NumberFormat('id-ID').format(
                          item.totalBookValue ||
                          (item.items || []).reduce((acc: number, it: any) => acc + (Number(it.bookValue) || 0), 0)
                        )}
                      </td>
                      {item.disposalType === 'Penjualan' && (
                        <td className="px-3 py-2 font-mono text-blue-900 font-extrabold">
                          Rp {new Intl.NumberFormat('id-ID').format(
                            item.totalEstimatedSalePrice ||
                            (item.items || []).reduce((acc: number, it: any) => acc + (Number(it.estimatedSalePrice) || 0), 0)
                          )}
                        </td>
                      )}
                      <td className="px-3 py-2 text-[10px] text-muted-foreground font-normal">
                        ({(item.items || []).length} Unit Aset)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
                  <span className="text-muted-foreground block text-[11px]">Nilai Terakhir Aset</span>
                  <span className="font-mono font-bold text-emerald-800 block">
                    {item.totalBookValue ? `Rp ${new Intl.NumberFormat('id-ID').format(item.totalBookValue)}` : 'Rp 0'}
                  </span>
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

          {/* DOKUMEN BERITA ACARA (PENGAJU) */}
          {item.baDocuments && (
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-blue-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardCheck className="size-4 text-blue-700" />
                  {item.disposalType === 'Donasi'
                    ? 'Berita Acara Serah Terima Donasi (Pengaju)'
                    : 'Berita Acara Penghapusan Aset (Pengaju)'}
                </h4>
                {item.baSubmittedAt && (
                  <span className="text-[10px] font-mono text-blue-800">
                    Disubmit: {formatDateTime(item.baSubmittedAt)}
                  </span>
                )}
              </div>
              {item.baDocuments.checklist && item.baDocuments.checklist.length > 0 && (
                <div className="mb-3 space-y-1 bg-white/80 p-2.5 rounded-lg border border-blue-200/80">
                  <span className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                    Dokumen yang Diserahkan:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.baDocuments.checklist.map((c: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center text-[10px] bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded font-medium"
                      >
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {item.baDocuments.files && item.baDocuments.files.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {item.baDocuments.files.map((f: any, idx: number) => (
                    <a
                      key={idx}
                      href={f.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="size-4 text-blue-600 shrink-0" />
                        <span className="truncate font-medium text-slate-800 text-[11px]">{f.fileName}</span>
                      </div>
                      <span className="text-[10px] text-blue-800 font-bold shrink-0">Buka</span>
                    </a>
                  ))}
                </div>
              )}
              {item.baDocuments.notes && (
                <p className="mt-2 text-[11px] text-slate-600 italic bg-white/70 p-2 rounded border border-blue-200">
                  Catatan: {item.baDocuments.notes}
                </p>
              )}
            </div>
          )}

          {/* DOKUMEN HASIL LELANG (PROCUREMENT) */}
          {item.auctionDocuments && (
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="size-4 text-amber-700" />
                  Lampiran Hasil Lelang (Procurement)
                </h4>
                {item.auctionSubmittedAt && (
                  <span className="text-[10px] font-mono text-amber-800">
                    Disubmit: {formatDateTime(item.auctionSubmittedAt)}
                  </span>
                )}
              </div>
              {item.auctionDocuments.checklist && item.auctionDocuments.checklist.length > 0 && (
                <div className="mb-3 space-y-1 bg-white/80 p-2.5 rounded-lg border border-amber-200/80">
                  <span className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                    Dokumen yang Diserahkan:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.auctionDocuments.checklist.map((c: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded font-medium"
                      >
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {item.auctionDocuments.files && item.auctionDocuments.files.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {item.auctionDocuments.files.map((f: any, idx: number) => (
                    <a
                      key={idx}
                      href={f.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="size-4 text-amber-600 shrink-0" />
                        <span className="truncate font-medium text-slate-800 text-[11px]">{f.fileName}</span>
                      </div>
                      <span className="text-[10px] text-amber-800 font-bold shrink-0">Buka</span>
                    </a>
                  ))}
                </div>
              )}
              {item.auctionDocuments.notes && (
                <p className="mt-2 text-[11px] text-slate-600 italic bg-white/70 p-2 rounded border border-amber-200">
                  Catatan: {item.auctionDocuments.notes}
                </p>
              )}
            </div>
          )}

          {/* DOKUMEN FINANCE & ACCOUNTING */}
          {item.financeDocuments && (
            <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-purple-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="size-4 text-purple-700" />
                  Dokumen Administrasi Keuangan (Finance &amp; Accounting)
                </h4>
                {item.financeSubmittedAt && (
                  <span className="text-[10px] font-mono text-purple-800">
                    Disubmit: {formatDateTime(item.financeSubmittedAt)}
                  </span>
                )}
              </div>
              {item.financeDocuments.checklist && item.financeDocuments.checklist.length > 0 && (
                <div className="mb-3 space-y-1 bg-white/80 p-2.5 rounded-lg border border-purple-200/80">
                  <span className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                    Dokumen yang Diserahkan:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.financeDocuments.checklist.map((c: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center text-[10px] bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded font-medium"
                      >
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {item.financeDocuments.files && item.financeDocuments.files.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {item.financeDocuments.files.map((f: any, idx: number) => (
                    <a
                      key={idx}
                      href={f.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="size-4 text-purple-600 shrink-0" />
                        <span className="truncate font-medium text-slate-800 text-[11px]">{f.fileName}</span>
                      </div>
                      <span className="text-[10px] text-purple-800 font-bold shrink-0">Buka</span>
                    </a>
                  ))}
                </div>
              )}
              {item.financeDocuments.notes && (
                <p className="mt-2 text-[11px] text-slate-600 italic bg-white/70 p-2 rounded border border-purple-200">
                  Catatan: {item.financeDocuments.notes}
                </p>
              )}
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
  )
}
