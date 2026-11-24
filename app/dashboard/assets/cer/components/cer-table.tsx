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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  Trash2,
  Edit,
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { CerReceiveDialog } from './cer-receive-dialog'
import { CerBastDialog } from './cer-bast-dialog'
import { CerFinanceCheckModal } from './cer-finance-check-modal'
import { CerFormDialog } from './cer-form-dialog'
import { HeroConfirmDialog } from '@/components/templates'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { isSuperAdminUser } from '../utils'
import { AssetApprovalDialog, type AssetApprovalDialogTarget } from '@/components/asset-approval-dialog'
import {
  approveCerStepAction,
  revertCerStepAction,
  resubmitCerRequestAction,
  rejectCerStepAction,
  deleteCerRequestAction,
  getCerDetailForRevisionAction,
} from '../actions'
import type { CerOverviewData } from '../actions'

export interface CerTableProps {
  requests: CerOverviewData['requests']
  mode?: string
  currentEmployee: CerOverviewData['currentEmployee']
  isFinanceOrAdmin?: boolean
  onRefresh?: () => void
  sites?: any[]
  departments?: any[]
  sections?: any[]
}

export function CerTable({
  requests,
  mode = 'requests',
  currentEmployee,
  isFinanceOrAdmin = false,
  onRefresh,
  sites = [],
  departments = [],
  sections = [],
}: CerTableProps) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  // Determine if current user is a Super Admin
  const isSuperAdmin = isSuperAdminUser(currentEmployee)

  // Modals state
  const [selectedCer, setSelectedCer] = useState<CerOverviewData['requests'][number] | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isReceiveOpen, setIsReceiveOpen] = useState(false)
  const [isBastOpen, setIsBastOpen] = useState(false)
  const [isFinanceCheckOpen, setIsFinanceCheckOpen] = useState(false)
  const [financeCheckCer, setFinanceCheckCer] = useState<CerOverviewData['requests'][number] | null>(null)

  // Asset Approval Dialog (2-Column Work Order Style Review Modal)
  const [reviewTarget, setReviewTarget] = useState<AssetApprovalDialogTarget | null>(null)
  const [isAssetApprovalOpen, setIsAssetApprovalOpen] = useState(false)
  const [isAssetSubmitting, setIsAssetSubmitting] = useState(false)

  // Full Revision modal state
  const [isRevisionOpen, setIsRevisionOpen] = useState(false)
  const [revisionInitialData, setRevisionInitialData] = useState<any>(null)
  const [isRevisionLoading, setIsRevisionLoading] = useState(false)

  // Handle start revision by fetching prefilled data and opening CerFormDialog in revision mode
  const handleStartRevision = async (cerId: number) => {
    try {
      setIsRevisionLoading(true)
      const res = await getCerDetailForRevisionAction(cerId)
      if (!res.success || !res.data) {
        toast.error((res as any)?.message || (res as any)?.error || 'Gagal memuat rincian formulir CER untuk revisi')
        return
      }
      setRevisionInitialData(res.data)
      setIsRevisionOpen(true)
    } catch (err: any) {
      toast.error('Terjadi kesalahan saat memuat data: ' + (err?.message || ''))
    } finally {
      setIsRevisionLoading(false)
    }
  }

  // Deep-link check for ?id=...&action=edit (e.g. from revision request email)
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const idParam = params.get('id')
    const actionParam = params.get('action')
    if (actionParam === 'edit' && idParam) {
      const cerId = parseInt(idParam, 10)
      if (!isNaN(cerId) && cerId > 0) {
        handleStartRevision(cerId)
      }
    }
  }, [])

  // Delete modal state
  const [cerToDelete, setCerToDelete] = useState<CerOverviewData['requests'][number] | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter requests
  const filteredRequests = requests.filter((r) => { // existing filter logic

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

  // Format approver display role / job title
  const formatApproverRoleOrJobTitle = (step: {
    label?: string | null
    jobTitle?: string | null
    level?: number | null
  }): string => {
    const lbl = (step.label || '').toLowerCase()
    const job = (step.jobTitle || '').toLowerCase()
    if (lbl.includes('bima') || lbl.includes('it validation') || job.includes('bima')) {
      return 'BIMA Supervisor'
    }
    if (lbl.includes('budget') || lbl.includes('controller') || lbl.includes('validator') || job.includes('budget')) {
      return step.jobTitle || 'Budget Controller'
    }
    if (lbl.includes('tagging') || job.includes('tagging')) {
      return 'Asset Tagging'
    }
    return step.jobTitle || step.label || '-'
  }

  // Filter real decision note (ignore system default labels and statuses)
  const isRealDecisionNote = (note?: string | null, label?: string | null, jobTitle?: string | null): boolean => {
    if (!note || !note.trim()) return false
    const cleanNote = note.trim().toLowerCase()
    const cleanLabel = (label || '').trim().toLowerCase()
    const cleanJob = (jobTitle || '').trim().toLowerCase()

    if (cleanNote === cleanLabel || cleanNote === cleanJob) return false
    if (
      [
        'pending',
        'approved',
        'draft',
        'in review',
        'in_review',
        'atasan langsung',
        'verifikator tambahan',
        'department manager',
        'general manager',
        'director',
      ].includes(cleanNote)
    ) {
      return false
    }
    if (cleanNote.startsWith('tahap ')) return false
    return true
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
      case 'pending_finance_check':
        return (
          <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700 font-semibold text-[11px]">
            Checked by Finance
          </Badge>
        )
      case 'rejected':
        return (
          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 font-semibold text-[11px]">
            Ditolak
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

  // Open Review Action (2-Column Work Order Style Review Modal)
  const handleOpenReview = (cer: typeof requests[number], appStepId: number) => {
    const pendingStep = cer.approvals.find((a) => a.id === appStepId)
    const resolvedStepLabel = formatApproverRoleOrJobTitle({
      label: pendingStep?.formName || pendingStep?.decisionNote || cer.currentApproverTitle,
      jobTitle: pendingStep?.approverJobTitle || cer.currentApproverJobTitle,
      level: pendingStep?.level,
    })

    setReviewTarget({
      approvalId: appStepId,
      targetId: cer.id,
      subType: 'CER',
      documentNumber: cer.cerNumber,
      title: cer.subject,
      employeeName: cer.applicantName,
      siteName: cer.siteName,
      totalAmount: Number(cer.totalEstimatedPrice),
      stepLabel: resolvedStepLabel || 'Persetujuan CER',
    })
    setIsAssetApprovalOpen(true)
  }

  // Handle Delete CER
  const handleDeleteCer = async () => {
    if (!cerToDelete) return
    setIsDeleting(true)
    try {
      const res = await deleteCerRequestAction(cerToDelete.id)
      if (res.success) {
        toast.success(res.message)
        setCerToDelete(null)
        if (onRefresh) onRefresh()
      } else {
        toast.error(res.message)
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal menghapus pengajuan CER')
    } finally {
      setIsDeleting(false)
    }
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
            <option value="pending_finance_check">Checked by Finance</option>
            <option value="rejected">Ditolak</option>
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
              <TableHead className="w-28 text-center text-xs">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-xs text-slate-500">
                  Tidak ada data pengajuan CER yang cocok dengan kriteria filter.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((r, idx) => {
                const isFreshya = Boolean(
                  currentEmployee?.id === 974 ||
                  currentEmployee?.email?.toLowerCase().includes('freshya')
                )
                const isEvoDwi = Boolean(
                  currentEmployee?.id === 1006 ||
                  currentEmployee?.email?.toLowerCase().includes('evo')
                )

                // Check if current user is the current pending approver or authorized co-approver
                const currentPendingApproval = r.approvals.find((a) => {
                  if (a.status !== 'Pending' || !currentEmployee) return false
                  const nameMatches = a.approverName.toLowerCase().includes(currentEmployee.name.toLowerCase())
                  const idMatches = r.currentApproverEmployeeId === currentEmployee.id || a.approverEmployeeId === currentEmployee.id
                  const freshyaCoApprove =
                    isFreshya &&
                    (a.approverName.toLowerCase().includes('director') ||
                      a.approverName.toLowerCase().includes('hidayat') ||
                      (a.decisionNote && a.decisionNote.toLowerCase().includes('director')))
                  const evoDwiCoApprove =
                    isEvoDwi &&
                    (a.approverName.toLowerCase().includes('syamsul') ||
                      (a.decisionNote && (a.decisionNote.toLowerCase().includes('tagging') || a.decisionNote.toLowerCase().includes('nomor aset'))))
                  return nameMatches || idMatches || freshyaCoApprove || evoDwiCoApprove
                })

                const isApplicant = currentEmployee && r.applicantEmployeeId === currentEmployee.id;
                const canManageLifecycle = Boolean(isApplicant) || isSuperAdmin;
                const pendingStep =
                  currentPendingApproval ||
                  (isSuperAdmin ? r.approvals.find((a) => a.status === 'Pending') : null);
                const canDeleteThisRow =
                  isSuperAdmin ||
                  (Boolean(isApplicant) && r.status !== 'completed' && r.status !== 'received');

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
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {mode === 'all_requests' ? (
                          /* Tab 1: Daftar Pengajuan (Semua CER di HERO) - Hanya View Saja, Tanpa Tombol Action Apapun */
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCer(r)
                                    setIsDetailOpen(true)
                                  }}
                                  className="h-7 w-7 p-0 text-slate-500 hover:text-blue-700 hover:bg-blue-50"
                                  title="Lihat Detail Pengajuan"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">Lihat Detail Pengajuan</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : mode === 'receiving' ? (
                          /* Tab Penerimaan & BAST */
                          <div className="flex items-center justify-center gap-1.5">
                            {r.status === 'completed' || r.status === 'received' ? (
                              /* Setelah Aset Dikonfirmasi Terima: Tombol Detail BAST & Hapus */
                              <TooltipProvider delayDuration={150}>
                                <div className="flex items-center justify-center gap-1">
                                  {/* 1. Lihat Detail BAST Modal */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedCer(r)
                                          setIsReceiveOpen(true)
                                        }}
                                        className="h-7 w-7 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                        title="Lihat Detail BAST"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p className="text-xs">Lihat Detail BAST</p>
                                    </TooltipContent>
                                  </Tooltip>

                                  {/* 2. Hapus Pengajuan (Jika Admin/Finance) */}
                                  {(canDeleteThisRow || isFinanceOrAdmin) && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setCerToDelete(r)}
                                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                          title="Hapus Pengajuan"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <p className="text-xs">Hapus Pengajuan</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </TooltipProvider>
                            ) : (
                              /* Status Belum Diterima (full_approved): Tombol Konfirmasi Terima + Hapus */
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCer(r)
                                    setIsReceiveOpen(true)
                                  }}
                                  className="h-7 border-purple-300 bg-purple-50 px-2.5 text-[11px] font-semibold text-purple-800 hover:bg-purple-100 gap-1.5"
                                  title="Konfirmasi Penerimaan Aset Fisik & Terbitkan BAST"
                                >
                                  <PackageCheck className="h-3.5 w-3.5 text-purple-600" />
                                  Konfirmasi Terima
                                </Button>
                                {(canDeleteThisRow || isFinanceOrAdmin) && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCerToDelete(r)}
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                    title="Hapus Pengajuan"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          /* Tab Daftar Pengajuan: Tombol standar alur pengajuan CER */
                          <>
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

                            {/* 2. Approver Decision (If pending on current user or user is Super Admin) */}
                            {pendingStep && (Boolean(currentPendingApproval) || isSuperAdmin) && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenReview(r, pendingStep.id)}
                                className="h-7 border-emerald-300 bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100"
                                title={isSuperAdmin && !currentPendingApproval ? 'Admin can approve' : undefined}
                              >
                                Tinjau
                              </Button>
                            )}

                            {/* 2b. Finance Check Input No. Aset */}
                            {r.status === 'pending_finance_check' && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setFinanceCheckCer(r)
                                  setIsFinanceCheckOpen(true)
                                }}
                                className="h-7 border-indigo-300 bg-indigo-50 px-2 text-[11px] font-semibold text-indigo-800 hover:bg-indigo-100 gap-1"
                              >
                                <FileSignature className="h-3 w-3" /> Input No. Aset
                              </Button>
                            )}

                            {/* 3. Revert / Resubmit (If status = need_revision and user is applicant or Admin) */}
                            {r.status === 'need_revision' && canManageLifecycle && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isRevisionLoading}
                                onClick={() => handleStartRevision(r.id)}
                                className="h-7 border-amber-300 bg-amber-50 px-2 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 gap-1"
                                title="Revisi isi formulir dan urutan persetujuan"
                              >
                                {isRevisionLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Edit className="h-3 w-3" />
                                )}
                                Revisi Pengajuan
                              </Button>
                            )}

                            {/* 4. Konfirmasi Penerimaan (HANYA Pengaju & Super Admin) */}
                            {r.status === 'full_approved' && canManageLifecycle && (
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


                            {/* 6. Hapus Pengajuan (Super Admin / Finance, atau Pemohon jika belum BAST/received) */}
                            {canDeleteThisRow && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setCerToDelete(r)}
                                className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Hapus Pengajuan"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </>
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

                {/* Kelompok Aset info if already checked by finance */}
                {selectedCer.kelompokAset && (
                  <div className="rounded-md border border-indigo-200 bg-indigo-50/70 p-3 text-indigo-950 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-700 block tracking-wider">
                        Kelompok Aset (Checked by Finance)
                      </span>
                      <span className="font-bold text-xs">{selectedCer.kelompokAset}</span>
                      {selectedCer.financeCheckNotes && (
                        <p className="mt-0.5 text-[11px] text-indigo-800">Catatan: {selectedCer.financeCheckNotes}</p>
                      )}
                    </div>
                    <Badge className="bg-indigo-600 text-white text-[10px]">Terverifikasi Asset</Badge>
                  </div>
                )}

                {/* Banner if pending finance check */}
                {selectedCer.status === 'pending_finance_check' && (
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50/80 p-3 text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="font-bold">Menunggu Input Kelompok &amp; Nomor Aset (Finance)</span>
                      <p className="text-[11px] text-indigo-800">
                        Persetujuan Direksi telah selesai. Finance (Syamsul Bahri) perlu menginput kelompok &amp; nomor aset untuk menerbitkan dokumen resmi.
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setIsDetailOpen(false)
                        setFinanceCheckCer(selectedCer)
                        setIsFinanceCheckOpen(true)
                      }}
                      className="h-8 bg-indigo-700 text-white font-semibold text-xs hover:bg-indigo-800 gap-1.5 shrink-0"
                    >
                      <FileSignature className="size-3.5" /> Input No. Aset
                    </Button>
                  </div>
                )}

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
                            <span className="font-semibold text-slate-800">
                              {(a.approverName || '').replace(/\s*\(BIMA Supervisor\)/gi, '')}
                            </span>
                            <span className="block text-[11px] text-slate-600 font-medium">
                              {formatApproverRoleOrJobTitle({
                                label: a.formName || a.decisionNote,
                                jobTitle: a.approverJobTitle,
                                level: a.level,
                              })}
                            </span>
                            {isRealDecisionNote(a.decisionNote, a.formName, a.approverJobTitle) && (
                              <span className="block text-[11px] text-slate-500 italic mt-0.5">
                                Catatan: {a.decisionNote}
                              </span>
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
                <a
                  href={selectedCer.pdfUrl ? resolveUploadUrl(selectedCer.pdfUrl) : `/api/assets/cer/${selectedCer.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Download className="h-3.5 w-3.5" /> Pratinjau / Unduh Dokumen PDF
                </a>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsDetailOpen(false)}>
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ASSET APPROVAL DIALOG (2-COLUMN WORK ORDER STYLE MODAL) */}
      <AssetApprovalDialog
        open={isAssetApprovalOpen}
        onOpenChange={setIsAssetApprovalOpen}
        item={reviewTarget}
        isSubmitting={isAssetSubmitting}
        onApprove={async ({ decisionNote, signatureUrl }) => {
          if (!reviewTarget) return
          setIsAssetSubmitting(true)
          try {
            const res = await approveCerStepAction(reviewTarget.approvalId, decisionNote, signatureUrl)
            if (res.success) {
              toast.success(res.message || 'Persetujuan CER berhasil dicatat.')
              setIsAssetApprovalOpen(false)
              if (onRefresh) onRefresh()
            } else {
              toast.error(res.message || 'Gagal menyetujui pengajuan CER.')
            }
          } catch (err: any) {
            toast.error(err?.message || 'Terjadi kesalahan sistem.')
          } finally {
            setIsAssetSubmitting(false)
          }
        }}
        onRevert={async ({ revertReason }) => {
          if (!reviewTarget) return
          setIsAssetSubmitting(true)
          try {
            const res = await revertCerStepAction(reviewTarget.approvalId, revertReason)
            if (res.success) {
              toast.success(res.message || 'Permintaan revisi berhasil dikirim ke pemohon.')
              setIsAssetApprovalOpen(false)
              if (onRefresh) onRefresh()
            } else {
              toast.error(res.message || 'Gagal merevert pengajuan CER.')
            }
          } catch (err: any) {
            toast.error(err?.message || 'Terjadi kesalahan sistem.')
          } finally {
            setIsAssetSubmitting(false)
          }
        }}
        onReject={async ({ rejectionReason }) => {
          if (!reviewTarget) return
          setIsAssetSubmitting(true)
          try {
            const res = await rejectCerStepAction(reviewTarget.approvalId, rejectionReason)
            if (res.success) {
              toast.success(res.message || 'Penolakan CER berhasil dicatat.')
              setIsAssetApprovalOpen(false)
              if (onRefresh) onRefresh()
            } else {
              toast.error(res.message || 'Gagal menolak pengajuan CER.')
            }
          } catch (err: any) {
            toast.error(err?.message || 'Terjadi kesalahan sistem.')
          } finally {
            setIsAssetSubmitting(false)
          }
        }}
      />

      {/* FULL REVISION FORM CER DIALOG */}
      <CerFormDialog
        open={isRevisionOpen}
        onOpenChange={setIsRevisionOpen}
        mode="revision"
        initialData={revisionInitialData}
        sites={sites}
        departments={departments}
        sections={sections}
        currentEmployee={currentEmployee}
        onSuccess={() => {
          setIsRevisionOpen(false)
          setRevisionInitialData(null)
          if (onRefresh) onRefresh()
        }}
      />

      {/* RECEIVE & BAST DIALOGS */}
      <CerReceiveDialog
        open={isReceiveOpen}
        onOpenChange={setIsReceiveOpen}
        cer={selectedCer}
        onSuccess={onRefresh}
      />

      <CerFinanceCheckModal
        open={isFinanceCheckOpen}
        onOpenChange={setIsFinanceCheckOpen}
        cer={financeCheckCer}
        onSuccess={onRefresh}
      />

      <CerBastDialog
        open={isBastOpen}
        onOpenChange={setIsBastOpen}
        cer={selectedCer}
        onSuccess={onRefresh}
      />

      {/* DELETE CONFIRM DIALOG */}
      <HeroConfirmDialog
        open={Boolean(cerToDelete)}
        onOpenChange={(open) => !open && setCerToDelete(null)}
        title="Hapus Pengajuan CER"
        description={
          <span>
            Apakah Anda yakin ingin menghapus permohonan CER <strong>{cerToDelete?.cerNumber}</strong> ({cerToDelete?.subject})?
            Seluruh data rincian unit dan tracking approval akan dihapus secara permanen, serta pagu anggaran yang telah teralokasi akan dikembalikan.
          </span>
        }
        confirmLabel="Ya, Hapus Pengajuan"
        cancelLabel="Batal"
        tone="destructive"
        isProcessing={isDeleting || isPending}
        onConfirm={handleDeleteCer}
      />
    </div>
  )
}
