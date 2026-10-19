'use client'

import React, { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Printer,
  RefreshCw,
  MoreVertical,
  ShieldCheck,
  Building,
  Calendar,
  DollarSign,
  Users,
  Paperclip,
  Trash2,
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
  BookOpenCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { TrainingRequestFormDialog } from '@/components/training/training-request-form-dialog'
import { TrainingRequestPdfDialog } from '@/components/training/training-request-pdf-dialog'
import { TrainingRequestApprovalDialog } from '@/components/training/training-request-approval-dialog'
import {
  syncTrainingRequestToRecords,
  deleteTrainingRequest,
} from '@/app/actions/training-requests'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface MobileClientProps {
  initialRequests: any[]
  currentEmail: string
  currentEmployeeId?: number | null
  currentEmployeeName?: string
}

function formatRupiah(num?: number | null) {
  if (!num) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num)
}

function formatDate(dateStr?: string | Date | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function MobileTrainingRequestsClient({
  initialRequests = [],
  currentEmail,
  currentEmployeeId,
  currentEmployeeName,
}: MobileClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('id')

  const [requests, setRequests] = useState(initialRequests)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'my_pending' | 'my_requests' | 'approved' | 'rejected'>('all')
  const [isSyncing, startSyncTransition] = useTransition()
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [selectedDetailRequest, setSelectedDetailRequest] = useState<any | null>(null)

  // Auto-open highlight item
  const targetHighlightItem = useMemo(() => {
    if (!highlightId) return null
    return requests.find((r) => String(r.id) === String(highlightId))
  }, [highlightId, requests])

  // Check if pending for current user
  const isMyPendingApproval = (req: any) => {
    if (req.status !== 'pending') return false
    const currentStep = req.approvals?.find((a: any) => a.stepOrder === req.currentStepOrder)
    if (!currentStep || currentStep.status !== 'pending') return false

    const emailMatch =
      currentEmail && currentStep.approverEmail?.toLowerCase() === currentEmail.toLowerCase()
    const empMatch =
      currentEmployeeId && currentStep.approverEmployeeId === currentEmployeeId
    const nameMatch =
      currentEmployeeName &&
      currentStep.approverName?.toLowerCase() === currentEmployeeName.toLowerCase()

    return emailMatch || empMatch || nameMatch
  }

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Tab filter
      if (activeTab === 'my_pending' && !isMyPendingApproval(req)) return false
      if (activeTab === 'my_requests' && req.requesterEmail?.toLowerCase() !== currentEmail.toLowerCase())
        return false
      if (activeTab === 'approved' && req.status !== 'approved') return false
      if (activeTab === 'rejected' && req.status !== 'rejected') return false

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchNum = req.requestNumber?.toLowerCase().includes(q)
        const matchTitle = req.trainingTitle?.toLowerCase().includes(q)
        const matchProv = req.providerName?.toLowerCase().includes(q)
        const matchReq = req.requesterName?.toLowerCase().includes(q)
        const matchPart = req.participantNames?.toLowerCase().includes(q)
        return matchNum || matchTitle || matchProv || matchReq || matchPart
      }

      return true
    })
  }, [requests, activeTab, search, currentEmail, currentEmployeeId, currentEmployeeName])

  // Metrics
  const metrics = useMemo(() => {
    const total = requests.length
    const myPending = requests.filter(isMyPendingApproval).length
    const approved = requests.filter((r) => r.status === 'approved').length
    const inProgress = requests.filter((r) => r.status === 'pending').length
    return { total, myPending, approved, inProgress }
  }, [requests])

  // Sync to Training Records
  const handleSyncToRecords = (requestId: number) => {
    setSyncingId(requestId)
    startSyncTransition(async () => {
      const res = await syncTrainingRequestToRecords(requestId)
      if (res.success) {
        toast.success(res.message || 'Berhasil disinkronkan ke Training Records!')
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, isSyncedToRecords: true } : r))
        )
      } else {
        toast.error(res.error || 'Gagal sinkronisasi data training.')
      }
      setSyncingId(null)
    })
  }

  // Delete Request
  const handleDelete = async (requestId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengajuan training ini?')) return
    const res = await deleteTrainingRequest(requestId)
    if (res.success) {
      toast.success('Pengajuan training berhasil dihapus.')
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
    } else {
      toast.error(res.error || 'Gagal menghapus pengajuan.')
    }
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Auto-Open Approval Dialog if URL query param ?id=... is present */}
      {targetHighlightItem && (
        <TrainingRequestApprovalDialog
          request={targetHighlightItem}
          approvals={targetHighlightItem.approvals || []}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Top Navigation Tabs */}
      <div className="flex items-center p-1 bg-slate-200/80 rounded-2xl gap-1">
        <Link
          href="/mobile/training"
          className="flex-1 py-2 text-center text-xs font-semibold rounded-xl text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1.5 transition-all"
        >
          <BookOpenCheck className="size-4 text-slate-500" />
          <span>Riwayat & Sertifikat</span>
        </Link>
        <Link
          href="/mobile/training/pengajuan"
          className="flex-1 py-2 text-center text-xs font-bold rounded-xl bg-white text-[#003461] shadow-xs flex items-center justify-center gap-1.5 transition-all"
        >
          <FileText className="size-4 text-[#003461]" />
          <span>Pengajuan Training</span>
        </Link>
      </div>

      {/* Top Header Mobile */}
      <div className="rounded-2xl bg-gradient-to-r from-[#003461] to-[#082033] text-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Link
              href="/mobile/training"
              className="p-1.5 rounded-xl bg-white/10 active:scale-95 transition-transform"
            >
              <ArrowLeft className="size-5 text-white" />
            </Link>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-wider uppercase text-sky-300">
                  HC &bull; F.HR.STD.011.00
                </span>
              </div>
              <h1 className="text-lg font-black tracking-tight text-white leading-tight">
                Pengajuan Training
              </h1>
            </div>
          </div>

          {/* Tombol Buat Pengajuan Mobile */}
          <TrainingRequestFormDialog
            onSuccess={() => router.refresh()}
            currentEmployeeId={currentEmployeeId}
            currentEmployeeName={currentEmployeeName}
            currentEmail={currentEmail}
            trigger={
              <button
                type="button"
                className="flex items-center gap-1.5 bg-gradient-to-r from-sky-500 to-blue-600 active:scale-95 transition-transform text-white font-bold text-xs px-3 py-2 rounded-xl shadow-md"
              >
                <Plus className="size-4" />
                <span>Ajukan</span>
              </button>
            }
          />
        </div>

        {/* Quick Stat Counter Bar */}
        <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2">
            <p className="text-[9px] font-medium text-slate-300">Total</p>
            <p className="text-sm font-black text-white mt-0.5">{metrics.total}</p>
          </div>
          <div className={cn(
            'rounded-xl p-2 transition-colors',
            metrics.myPending > 0 ? 'bg-amber-500/25 border border-amber-400/40' : 'bg-white/10'
          )}>
            <p className="text-[9px] font-medium text-amber-300">Review</p>
            <p className="text-sm font-black text-amber-200 mt-0.5">{metrics.myPending}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2">
            <p className="text-[9px] font-medium text-emerald-300">Disetujui</p>
            <p className="text-sm font-black text-white mt-0.5">{metrics.approved}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2">
            <p className="text-[9px] font-medium text-sky-300">Berjalan</p>
            <p className="text-sm font-black text-white mt-0.5">{metrics.inProgress}</p>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari no. pengajuan, judul, vendor..."
          className="pl-9 h-10 text-xs rounded-xl bg-white border-slate-200/90 shadow-2xs"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Tabs (Horizontal Scrollable) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all text-xs',
            activeTab === 'all'
              ? 'bg-[#003461] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          )}
        >
          Semua ({metrics.total})
        </button>

        {metrics.myPending > 0 && (
          <button
            onClick={() => setActiveTab('my_pending')}
            className={cn(
              'px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all text-xs flex items-center gap-1',
              activeTab === 'my_pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            )}
          >
            <AlertCircle className="size-3" />
            <span>Perlu Approval ({metrics.myPending})</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('my_requests')}
          className={cn(
            'px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all text-xs',
            activeTab === 'my_requests'
              ? 'bg-[#003461] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          )}
        >
          Diajukan Saya
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={cn(
            'px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all text-xs',
            activeTab === 'approved'
              ? 'bg-[#003461] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          )}
        >
          Disetujui ({metrics.approved})
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={cn(
            'px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-all text-xs',
            activeTab === 'rejected'
              ? 'bg-[#003461] text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          )}
        >
          Ditolak
        </button>
      </div>

      {/* Request Cards Feed */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-2">
            <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <FileText className="size-5" />
            </div>
            <p className="text-sm font-bold text-slate-700">Tidak ada pengajuan ditemukan</p>
            <p className="text-xs text-slate-400">
              {search ? 'Coba ubah kata kunci pencarian Anda.' : 'Belum ada data pengajuan pada filter ini.'}
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isPendingMe = isMyPendingApproval(req)
            const currentApprovalStep = req.approvals?.find((a: any) => a.stepOrder === req.currentStepOrder)

            return (
              <div
                key={req.id}
                onClick={() => setSelectedDetailRequest(req)}
                className={cn(
                  'bg-white rounded-2xl border p-4 shadow-2xs space-y-3 transition-all cursor-pointer hover:border-slate-300 active:scale-[0.99]',
                  isPendingMe
                    ? 'border-amber-300 ring-2 ring-amber-400/20 bg-amber-50/10'
                    : 'border-slate-200/90'
                )}
              >
                {/* Card Header: Nomor & Status */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        {req.requestNumber}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDate(req.requestDate || req.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge & Chevron */}
                  <div className="flex items-center gap-1.5">
                    {req.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="size-3" />
                        Disetujui
                      </span>
                    ) : req.status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="size-3" />
                        Ditolak
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="size-3" />
                        Review
                      </span>
                    )}
                    <ChevronRight className="size-4 text-slate-400" />
                  </div>
                </div>

                {/* Judul & Program */}
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-snug">
                    {req.trainingTitle}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Building className="size-3 text-slate-400 shrink-0" />
                      <span className="truncate max-w-[180px]">{req.providerName}</span>
                    </span>
                    <span>&bull;</span>
                    <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                      {req.trainingCategory}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="bg-slate-50/70 rounded-xl p-2.5 space-y-1.5 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-slate-500 flex items-center gap-1 shrink-0">
                      <Users className="size-3 text-slate-400" />
                      Peserta:
                    </span>
                    <span className="font-medium text-slate-800 text-right truncate max-w-[200px]">
                      {req.participantNames || '-'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 flex items-center gap-1 shrink-0">
                      <Calendar className="size-3 text-slate-400" />
                      Pelaksanaan:
                    </span>
                    <span className="font-medium text-slate-800">
                      {req.trainingDates || `${formatDate(req.startDate)} - ${formatDate(req.endDate)}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 flex items-center gap-1 shrink-0">
                      <DollarSign className="size-3 text-slate-400" />
                      Estimasi Biaya:
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {formatRupiah(req.costTotal)}
                    </span>
                  </div>
                </div>

                {/* Approval Stepper Progress Dots */}
                {req.approvals && req.approvals.length > 0 && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center gap-1">
                      {req.approvals.map((step: any) => {
                        const isDone = step.status === 'approved'
                        const isCurrent = step.status === 'pending' && step.stepOrder === req.currentStepOrder
                        const isStepRejected = step.status === 'rejected'

                        return (
                          <div
                            key={step.id}
                            title={`${step.roleLabel || step.stepName || 'Step ' + step.stepOrder}: ${step.approverName || '-'} (${step.status})`}
                            className={cn(
                              'size-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all',
                              isDone && 'bg-emerald-600 text-white',
                              isCurrent && 'bg-amber-500 text-white animate-pulse',
                              isStepRejected && 'bg-rose-500 text-white',
                              !isDone && !isCurrent && !isStepRejected && 'bg-slate-200 text-slate-600'
                            )}
                          >
                            {isDone ? <Check className="size-3" /> : step.stepOrder}
                          </div>
                        )
                      })}
                    </div>

                    <div className="text-[11px] text-slate-500 truncate max-w-[170px] text-right font-medium">
                      {currentApprovalStep
                        ? `Step ${currentApprovalStep.stepOrder}: ${currentApprovalStep.roleLabel || currentApprovalStep.stepName || 'Review'}`
                        : req.status === 'approved'
                        ? 'Disetujui Penuh'
                        : req.status}
                    </div>
                  </div>
                )}

                {/* Action Buttons (stop propagation so card click doesn't trigger them) */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100"
                >
                  {/* Left: View PDF Button */}
                  <TrainingRequestPdfDialog
                    request={req}
                    approvals={req.approvals || []}
                    trigger={
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-semibold px-2.5 text-slate-700 gap-1.5"
                      >
                        <FileText className="size-3.5 text-blue-600" />
                        <span>Lihat PDF</span>
                      </Button>
                    }
                  />

                  {/* Right Actions */}
                  <div className="flex items-center gap-1.5">
                    {/* Review Button for pending approver */}
                    {isPendingMe && (
                      <TrainingRequestApprovalDialog
                        request={req}
                        approvals={req.approvals || []}
                        currentApproval={currentApprovalStep}
                        onSuccess={() => router.refresh()}
                        trigger={
                          <Button
                            size="sm"
                            className="h-8 text-xs font-bold px-3 bg-amber-600 hover:bg-amber-700 text-white shadow-xs gap-1"
                          >
                            <ShieldCheck className="size-3.5" />
                            <span>Review</span>
                          </Button>
                        }
                      />
                    )}

                    {/* Sync to Records (if approved) */}
                    {req.status === 'approved' && !req.isSyncedToRecords && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-medium px-2.5 text-emerald-700 border-emerald-300 bg-emerald-50/50"
                        disabled={isSyncing && syncingId === req.id}
                        onClick={() => handleSyncToRecords(req.id)}
                      >
                        {isSyncing && syncingId === req.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <span>Sync Records</span>
                        )}
                      </Button>
                    )}

                    {/* More Menu (Delete) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive text-xs focus:text-destructive"
                          onClick={() => handleDelete(req.id)}
                        >
                          <Trash2 className="size-3.5 mr-2" />
                          Hapus Pengajuan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-20 right-4 z-40">
        <TrainingRequestFormDialog
          onSuccess={() => router.refresh()}
          currentEmployeeId={currentEmployeeId}
          currentEmployeeName={currentEmployeeName}
          currentEmail={currentEmail}
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 bg-[#003461] hover:bg-[#00284d] text-white font-bold text-xs px-4 py-3 rounded-full shadow-2xl active:scale-95 transition-all border border-white/20"
            >
              <Plus className="size-4" />
              <span>Ajukan Training</span>
            </button>
          }
        />
      </div>

      {/* Bottom Sheet Detail Drawer */}
      <Sheet open={!!selectedDetailRequest} onOpenChange={(open) => !open && setSelectedDetailRequest(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 bg-white">
          <div className="mx-auto w-12 h-1.5 rounded-full bg-slate-200 mt-3 shrink-0" />

          {selectedDetailRequest && (
            <>
              {/* Header */}
              <div className="p-4 border-b bg-slate-50/80 shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {selectedDetailRequest.requestNumber}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      F.HR.STD.011.00 (Rev. 00)
                    </span>
                  </div>

                  <div>
                    {selectedDetailRequest.status === 'approved' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="size-3" /> Disetujui
                      </span>
                    ) : selectedDetailRequest.status === 'rejected' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="size-3" /> Ditolak
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="size-3" /> Menunggu Review
                      </span>
                    )}
                  </div>
                </div>

                <SheetTitle className="text-base font-bold text-slate-900 leading-snug">
                  {selectedDetailRequest.trainingTitle}
                </SheetTitle>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {/* Rincian Training */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Rincian Pelatihan
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Penyelenggara:</span>
                      <span className="font-semibold text-slate-800">{selectedDetailRequest.providerName || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Kategori &amp; Jenis:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedDetailRequest.trainingCategory} &bull; {selectedDetailRequest.trainingType}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Jadwal Pelaksanaan:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedDetailRequest.trainingDates || `${formatDate(selectedDetailRequest.startDate)} - ${formatDate(selectedDetailRequest.endDate)}`}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Tempat / Lokasi:</span>
                      <span className="font-semibold text-slate-800">{selectedDetailRequest.trainingVenue || '-'}</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                      <span className="text-slate-500 font-medium">Estimasi Biaya:</span>
                      <span className="font-bold text-blue-700 text-sm">
                        {formatRupiah(selectedDetailRequest.costTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Peserta */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Users className="size-3.5 text-[#003461]" />
                    <span>Daftar Peserta Training</span>
                  </div>
                  <div className="text-slate-800 font-medium">
                    {selectedDetailRequest.participantNames || '-'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Departemen: {selectedDetailRequest.department || '-'} &bull; Lokasi: {selectedDetailRequest.workLocation || '-'}
                  </div>
                </div>

                {/* Alur Persetujuan Stepper */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <Clock className="size-3.5 text-[#003461]" />
                    <span>Alur Persetujuan Berjenjang</span>
                  </div>

                  <div className="space-y-3 pl-2 border-l-2 border-slate-200 ml-1">
                    {selectedDetailRequest.approvals?.map((step: any) => {
                      const isDone = step.status === 'approved'
                      const isCurr = step.status === 'pending' && step.stepOrder === selectedDetailRequest.currentStepOrder
                      const isRej = step.status === 'rejected'

                      return (
                        <div key={step.id} className="relative pl-3">
                          <div
                            className={cn(
                              'absolute -left-[17px] top-0.5 size-3.5 rounded-full border-2 bg-white',
                              isDone && 'border-emerald-600 bg-emerald-600',
                              isCurr && 'border-amber-500 bg-amber-100 animate-pulse',
                              isRej && 'border-rose-600 bg-rose-600',
                              !isDone && !isCurr && !isRej && 'border-slate-300'
                            )}
                          />
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800">
                              Step {step.stepOrder}: {step.roleLabel}
                            </span>
                            {isDone ? (
                              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                Disetujui
                              </span>
                            ) : isCurr ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                Menunggu Review
                              </span>
                            ) : isRej ? (
                              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                Ditolak
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Menunggu</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-0.5">
                            {step.approverName || '-'} ({step.approverTitle || '-'})
                          </div>
                          {step.approvedAt && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {new Date(step.approvedAt).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })} WIB
                            </div>
                          )}
                          {step.remarks && (
                            <div className="text-[10px] text-slate-600 italic mt-0.5 bg-white p-1 rounded border border-slate-200">
                              &ldquo;{step.remarks}&rdquo;
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Lampiran berkas */}
                {selectedDetailRequest.attachmentUrl && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="size-4 text-slate-400 shrink-0" />
                      <span className="truncate font-medium text-slate-700">
                        {selectedDetailRequest.attachmentName || 'Lampiran Dokumen Proposal'}
                      </span>
                    </div>
                    <a
                      href={resolveUploadUrl(selectedDetailRequest.attachmentUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 shrink-0"
                    >
                      Buka
                    </a>
                  </div>
                )}
              </div>

              {/* Bottom Sheet Actions */}
              <div className="p-3.5 bg-white border-t flex items-center gap-2 shrink-0">
                <TrainingRequestPdfDialog
                  request={selectedDetailRequest}
                  approvals={selectedDetailRequest.approvals || []}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-9 text-xs font-semibold gap-1.5"
                    >
                      <FileText className="size-3.5 text-blue-600" />
                      <span>Lihat PDF</span>
                    </Button>
                  }
                />

                {isMyPendingApproval(selectedDetailRequest) && (
                  <TrainingRequestApprovalDialog
                    request={selectedDetailRequest}
                    approvals={selectedDetailRequest.approvals || []}
                    onSuccess={() => {
                      setSelectedDetailRequest(null)
                      router.refresh()
                    }}
                    trigger={
                      <Button
                        type="button"
                        className="flex-1 h-9 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-sm"
                      >
                        <ShieldCheck className="size-3.5" />
                        <span>Review Sekarang</span>
                      </Button>
                    }
                  />
                )}

                {selectedDetailRequest.status === 'approved' && !selectedDetailRequest.isSyncedToRecords && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 text-xs font-medium text-emerald-700 border-emerald-300 bg-emerald-50/50"
                    disabled={isSyncing && syncingId === selectedDetailRequest.id}
                    onClick={() => handleSyncToRecords(selectedDetailRequest.id)}
                  >
                    {isSyncing && syncingId === selectedDetailRequest.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <span>Sync LMS</span>
                    )}
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedDetailRequest(null)}
                  className="h-9 text-xs text-slate-500 hover:text-slate-800 px-3"
                >
                  Tutup
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
