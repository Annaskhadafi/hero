'use client'

import React, { useState, useTransition } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Search,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  PackageCheck,
  FileSignature,
  QrCode,
  Download,
  Loader2,
  ExternalLink,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { CerReceiveDialog } from './cer-receive-dialog'
import { CerBastDialog } from './cer-bast-dialog'
import {
  approveCerStepAction,
  revertCerStepAction,
  resubmitCerRequestAction,
} from '../actions'
import type { CerOverviewData } from '../actions'

export interface CerTableProps {
  requests: CerOverviewData['requests']
  currentEmployee: CerOverviewData['currentEmployee']
  onRefresh?: () => void
}

export function CerTable({ requests, currentEmployee, onRefresh }: CerTableProps) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals state
  const [selectedCer, setSelectedCer] = useState<CerOverviewData['requests'][number] | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isReceiveOpen, setIsReceiveOpen] = useState(false)
  const [isBastOpen, setIsBastOpen] = useState(false)

  // Approve / Revert modal state
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'revert'>('approve')
  const [reviewNote, setReviewNote] = useState('')
  const [activeApprovalId, setActiveApprovalId] = useState<number | null>(null)

  // Resubmit modal state
  const [isResubmitOpen, setIsResubmitOpen] = useState(false)
  const [resubmitPurpose, setResubmitPurpose] = useState('')

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    const matchSearch =
      !search ||
      r.cerNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.subject.toLowerCase().includes(search.toLowerCase()) ||
      r.applicantName.toLowerCase().includes(search.toLowerCase()) ||
      r.siteName.toLowerCase().includes(search.toLowerCase()) ||
      r.departmentName.toLowerCase().includes(search.toLowerCase())

    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  // Format rupiah
  const formatRupiah = (val: any) => {
    const num = Number(val) || 0
    return new Intl.NumberFormat('id-ID').format(num)
  }

  // Format date
  const formatDate = (val: any) => {
    if (!val) return '-'
    const d = new Date(val)
    if (isNaN(d.getTime())) return '-'
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // Status badge styling
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'in_review':
        return (
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 font-semibold text-[11px]">
            In Review
          </Badge>
        )
      case 'need_revision':
        return (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 font-semibold text-[11px]">
            Perlu Revisi
          </Badge>
        )
      case 'full_approved':
        return (
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold text-[11px]">
            Full Approved
          </Badge>
        )
      case 'received':
        return (
          <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 font-semibold text-[11px]">
            Barang Diterima
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="outline" className="border-green-200 bg-green-50 text-green-800 font-semibold text-[11px]">
            BAST Selesai
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="text-[11px]">
            {status}
          </Badge>
        )
    }
  }

  // Open Review Action (Approve / Revert)
  const handleOpenReview = (cer: typeof requests[number], action: 'approve' | 'revert', appStepId: number) => {
    setSelectedCer(cer)
    setReviewAction(action)
    setActiveApprovalId(appStepId)
    setReviewNote(action === 'approve' ? 'Disetujui' : '')
    setIsReviewOpen(true)
  }

  // Submit Review (Approve or Revert)
  const handleSubmitReview = () => {
    if (!activeApprovalId) return

    if (reviewAction === 'revert' && !reviewNote.trim()) {
      toast.error('Catatan revisi wajib diisi jika meminta revisi.')
      return
    }

    startTransition(async () => {
      if (reviewAction === 'approve') {
        const res = await approveCerStepAction(activeApprovalId, reviewNote)
        if (res.success) {
          toast.success(res.message)
          setIsReviewOpen(false)
          if (onRefresh) onRefresh()
        } else {
          toast.error(res.message)
        }
      } else {
        const res = await revertCerStepAction(activeApprovalId, reviewNote)
        if (res.success) {
          toast.success(res.message)
          setIsReviewOpen(false)
          if (onRefresh) onRefresh()
        } else {
          toast.error(res.message)
        }
      }
    })
  }

  // Submit Resubmit
  const handleResubmit = () => {
    if (!selectedCer) return

    startTransition(async () => {
      const res = await resubmitCerRequestAction({
        cerId: selectedCer.id,
        subject: selectedCer.subject,
        purchasePurpose: resubmitPurpose || selectedCer.purchasePurpose,
        vendorName: selectedCer.vendorName,
        items: [], // keep existing or updated
      })

      if (res.success) {
        toast.success(res.message)
        setIsResubmitOpen(false)
        if (onRefresh) onRefresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Cari No. CER, subjek, pemohon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-60 pl-8 text-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm"
          >
            <option value="all">Semua Status</option>
            <option value="in_review">In Review</option>
            <option value="need_revision">Perlu Revisi</option>
            <option value="full_approved">Full Approved</option>
            <option value="received">Barang Diterima</option>
            <option value="completed">BAST Selesai</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Menampilkan <strong>{filteredRequests.length}</strong> dari <strong>{requests.length}</strong> pengajuan
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="w-12 text-center text-xs">No</TableHead>
              <TableHead className="min-w-[150px] text-xs">No. CER &amp; Tanggal</TableHead>
              <TableHead className="min-w-[200px] text-xs">Subjek Pengadaan</TableHead>
              <TableHead className="text-xs">Pemohon / Site</TableHead>
              <TableHead className="text-xs">Kategori Aset</TableHead>
              <TableHead className="text-right text-xs">Estimasi Nilai</TableHead>
              <TableHead className="text-center text-xs">Status</TableHead>
              <TableHead className="min-w-[140px] text-xs">Posisi Approval</TableHead>
              <TableHead className="w-28 text-center text-xs">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-xs text-slate-500">
                  Tidak ada data pengajuan CER yang cocok dengan kriteria filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((r, idx) => {
                // Check if current user is the current pending approver
                const currentPendingApproval = r.approvals.find(
                  (a) =>
                    a.status === 'Pending' &&
                    currentEmployee &&
                    (a.approverName.toLowerCase().includes(currentEmployee.name.toLowerCase()) ||
                      r.currentApproverEmployeeId === currentEmployee.id)
                )

                const isApplicant = currentEmployee && r.applicantEmployeeId === currentEmployee.id

                return (
                  <TableRow key={r.id} className="hover:bg-slate-50/60">
                    <TableCell className="text-center text-xs text-slate-500">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-bold text-slate-900">{r.cerNumber}</span>
                        <span className="text-[11px] text-slate-500">{formatDate(r.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-800 line-clamp-1">{r.subject}</span>
                        <span className="text-[11px] text-slate-500">
                          Vendor: {r.vendorName || '-'} • {r.itemsCount} Item Unit
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-800">{r.applicantName}</span>
                        <span className="text-[11px] text-slate-500">
                          {r.siteName} • {r.departmentName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {r.assetCategory}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-xs text-slate-900">
                      Rp {formatRupiah(r.totalEstimatedPrice)}
                    </TableCell>
                    <TableCell className="text-center">{renderStatusBadge(r.status)}</TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-700">
                        {r.status === 'full_approved' || r.status === 'received' || r.status === 'completed'
                          ? 'Direksi (Selesai)'
                          : r.currentApproverTitle || r.currentApproverName || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* 1. Detail View */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCer(r)
                            setIsDetailOpen(true)
                          }}
                          className="h-7 w-7 p-0 text-slate-500 hover:text-blue-700"
                          title="Lihat Detail"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>

                        {/* 2. Approver Decision (If pending on current user) */}
                        {currentPendingApproval && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenReview(r, 'approve', currentPendingApproval.id)}
                            className="h-7 border-emerald-300 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                          >
                            Tinjau
                          </Button>
                        )}

                        {/* 3. Revert / Resubmit (If status = need_revision and user is applicant) */}
                        {r.status === 'need_revision' && isApplicant && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCer(r)
                              setResubmitPurpose(r.purchasePurpose)
                              setIsResubmitOpen(true)
                            }}
                            className="h-7 border-amber-300 bg-amber-50 px-2 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 gap-1"
                          >
                            <RotateCcw className="h-3 w-3" /> Resubmit
                          </Button>
                        )}

                        {/* 4. Konfirmasi Penerimaan (If status = full_approved and user is applicant) */}
                        {r.status === 'full_approved' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCer(r)
                              setIsReceiveOpen(true)
                            }}
                            className="h-7 border-purple-300 bg-purple-50 px-2 text-[11px] font-semibold text-purple-800 hover:bg-purple-100 gap-1"
                          >
                            <PackageCheck className="h-3 w-3" /> Terima
                          </Button>
                        )}

                        {/* 5. Buat BAST (If status = received) */}
                        {r.status === 'received' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCer(r)
                              setIsBastOpen(true)
                            }}
                            className="h-7 border-blue-300 bg-blue-50 px-2 text-[11px] font-semibold text-blue-800 hover:bg-blue-100 gap-1"
                          >
                            <FileSignature className="h-3 w-3" /> BAST
                          </Button>
                        )}

                        {/* 6. Download PDF (If available) */}
                        {r.pdfUrl && (
                          <a
                            href={r.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md p-0 text-slate-500 hover:bg-slate-100 hover:text-blue-700"
                            title="Unduh Dokumen PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* DETAIL DIALOG */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedCer && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-base font-bold text-slate-900">
                    {selectedCer.cerNumber}
                  </DialogTitle>
                  {renderStatusBadge(selectedCer.status)}
                </div>
                <DialogDescription className="text-xs">{selectedCer.subject}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2 text-xs">
                {/* Basic info grid */}
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                  <div>
                    <span className="text-slate-500">Pemohon:</span>
                    <p className="font-semibold text-slate-800">{selectedCer.applicantName}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Departemen / Site:</span>
                    <p className="font-semibold text-slate-800">
                      {selectedCer.departmentName} / {selectedCer.siteName}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Jenis Pembelian:</span>
                    <p className="font-semibold text-slate-800">
                      {selectedCer.purchaseType} ({selectedCer.budgetSource})
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Estimasi Total Nilai:</span>
                    <p className="font-bold text-blue-900">Rp {formatRupiah(selectedCer.totalEstimatedPrice)}</p>
                  </div>
                </div>

                {/* Revert note if present */}
                {selectedCer.lastRevertNote && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
                    <span className="font-bold">Catatan Permintaan Revisi:</span>
                    <p className="mt-0.5">{selectedCer.lastRevertNote}</p>
                  </div>
                )}

                {/* Tujuan Pembelian */}
                <div>
                  <span className="font-semibold text-slate-700">Tujuan Pembelian:</span>
                  <p className="mt-1 rounded-md bg-slate-50 p-2.5 text-slate-800">
                    {selectedCer.purchasePurpose || '-'}
                  </p>
                </div>

                {/* Approval Stepper Progress */}
                <div>
                  <span className="font-semibold text-slate-700">Rantai Persetujuan:</span>
                  <div className="mt-2 space-y-2">
                    {selectedCer.approvals.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-md border border-slate-200 p-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold">
                            {a.level}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-800">{a.approverName}</span>
                            {a.decisionNote && (
                              <span className="block text-[11px] text-slate-500">{a.decisionNote}</span>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant={
                            a.status === 'Approved'
                              ? 'default'
                              : a.status === 'Reverted'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-[10px]"
                        >
                          {a.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Link to Asset Management if received */}
                {(selectedCer.status === 'received' || selectedCer.status === 'completed') && (
                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-purple-900 flex items-center justify-between">
                    <div>
                      <span className="font-bold">Aset Terdaftar di Asset Management</span>
                      <p className="text-[11px]">Stiker QR code dapat dicetak melalui modul Asset Management.</p>
                    </div>
                    <Link
                      href="/dashboard/central-service/assets"
                      className="inline-flex items-center gap-1 rounded bg-purple-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-800"
                    >
                      <QrCode className="h-3.5 w-3.5" /> Cetak Stiker
                    </Link>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:justify-between">
                {selectedCer.pdfUrl ? (
                  <a
                    href={selectedCer.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5" /> Unduh Dokumen CER PDF
                  </a>
                ) : (
                  <div />
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => setIsDetailOpen(false)}>
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* APPROVE / REVERT ACTION DIALOG */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {reviewAction === 'approve' ? 'Persetujuan CER' : 'Permintaan Revisi CER'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedCer?.cerNumber} — {selectedCer?.subject}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                {reviewAction === 'approve' ? 'Catatan Persetujuan (Opsional)' : 'Alasan / Instruksi Revisi (Wajib)'}
              </Label>
              <Textarea
                rows={3}
                placeholder={
                  reviewAction === 'approve'
                    ? 'Disetujui untuk diteruskan...'
                    : 'Mohon lengkapi perbandingan vendor, spesifikasi teknis...'
                }
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsReviewOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            {reviewAction === 'approve' ? (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmitReview}
                disabled={isPending}
                className="bg-emerald-600 font-bold text-white hover:bg-emerald-700 text-xs"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Setujui Pengajuan'}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmitReview}
                disabled={isPending}
                className="bg-amber-600 font-bold text-white hover:bg-amber-700 text-xs"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Kembalikan untuk Revisi'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RESUBMIT DIALOG */}
      <Dialog open={isResubmitOpen} onOpenChange={setIsResubmitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Resubmit Form CER</DialogTitle>
            <DialogDescription className="text-xs">
              Kirimkan kembali form perbaikan langsung ke approver yang meminta revisi.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
              <span className="font-bold">Catatan Revisi dari Approver:</span>
              <p className="mt-1 text-[11px]">{selectedCer?.lastRevertNote || '-'}</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">Pembaruan Justifikasi / Catatan Perbaikan</Label>
              <Textarea
                rows={3}
                value={resubmitPurpose}
                onChange={(e) => setResubmitPurpose(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResubmitOpen(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleResubmit}
              disabled={isPending}
              className="bg-blue-700 font-bold text-white hover:bg-blue-800 text-xs"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Resubmit ke Approver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RECEIVE & BAST DIALOGS */}
      <CerReceiveDialog
        open={isReceiveOpen}
        onOpenChange={setIsReceiveOpen}
        cer={selectedCer}
        onSuccess={onRefresh}
      />

      <CerBastDialog
        open={isBastOpen}
        onOpenChange={setIsBastOpen}
        cer={selectedCer}
        onSuccess={onRefresh}
      />
    </div>
  )
}
