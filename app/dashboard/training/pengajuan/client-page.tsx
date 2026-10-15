'use client'

import React, { useState, useTransition, useMemo } from 'react'
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
  Download,
  Share2,
  RefreshCw,
  MoreVertical,
  ShieldCheck,
  Building,
  Calendar,
  DollarSign,
  Users,
  Paperclip,
  Trash2,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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

interface ClientPageProps {
  initialRequests: any[]
  currentEmail: string
  currentEmployeeId?: number | null
  currentEmployeeName?: string
}

export function TrainingRequestsClientPage({
  initialRequests = [],
  currentEmail,
  currentEmployeeId,
  currentEmployeeName,
}: ClientPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const highlightId = searchParams.get('id')

  const [requests, setRequests] = useState(initialRequests)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'my_pending' | 'my_requests' | 'approved' | 'rejected'>('all')
  const [isSyncing, startSyncTransition] = useTransition()
  const [syncingId, setSyncingId] = useState<number | null>(null)

  // Find target item if highlightId exists
  const targetHighlightItem = useMemo(() => {
    if (!highlightId) return null
    return requests.find((r) => String(r.id) === String(highlightId))
  }, [highlightId, requests])

  // Helper to test if a request has a pending approval for current user
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

  // Filter requests
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
    <div className="space-y-6">
      {/* Auto-Open Approval Dialog if URL query param ?id=... is present */}
      {targetHighlightItem && (
        <TrainingRequestApprovalDialog
          request={targetHighlightItem}
          approvals={targetHighlightItem.approvals || []}
          onSuccess={() => router.refresh()}
        />
      )}

      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-[#003461] text-white rounded-xl shadow-sm">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                Pengajuan Training &amp; Lokakarya
              </h1>
              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                F.HR.STD.011.00
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Formulir pendaftaran resmi pelatihan, seminar, dan sertifikasi karyawan dengan alur persetujuan multi-level.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="text-xs text-slate-600 gap-1.5 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Segarkan</span>
          </Button>

          <TrainingRequestFormDialog onSuccess={() => router.refresh()} />
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Pengajuan
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</h3>
            </div>
            <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-blue-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                Menunggu Approval Anda
              </p>
              <h3 className="text-2xl font-black text-blue-700 mt-1">{metrics.myPending}</h3>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-emerald-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                Disetujui Penuh
              </p>
              <h3 className="text-2xl font-black text-emerald-700 mt-1">{metrics.approved}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-amber-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
                Sedang Berjalan
              </p>
              <h3 className="text-2xl font-black text-amber-700 mt-1">{metrics.inProgress}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Filter and Tab Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-colors',
                activeTab === 'all'
                  ? 'bg-[#003461] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border'
              )}
            >
              Semua ({metrics.total})
            </button>
            <button
              onClick={() => setActiveTab('my_pending')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5',
                activeTab === 'my_pending'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-blue-700 hover:bg-blue-50 border border-blue-200'
              )}
            >
              <span>Approval Saya</span>
              {metrics.myPending > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px]">
                  {metrics.myPending}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('my_requests')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-colors',
                activeTab === 'my_requests'
                  ? 'bg-[#003461] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border'
              )}
            >
              Diajukan Saya
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-colors',
                activeTab === 'approved'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border'
              )}
            >
              Disetujui
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={cn(
                'px-3 py-1.5 rounded-lg font-semibold transition-colors',
                activeTab === 'rejected'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border'
              )}
            >
              Ditolak
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari no. pengajuan, judul, vendor..."
              className="text-xs pl-9 bg-white"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="p-3 w-10 text-center">No</th>
                <th className="p-3">No. Pengajuan &amp; Tanggal</th>
                <th className="p-3">Judul Program &amp; Penyelenggara</th>
                <th className="p-3">Peserta &amp; Dept</th>
                <th className="p-3">Biaya</th>
                <th className="p-3">Alur Approval</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Tidak ada data pengajuan training yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req, idx) => {
                  const isPendingForMe = isMyPendingApproval(req)
                  const currentApprovalStep = req.approvals?.find(
                    (a: any) => a.stepOrder === req.currentStepOrder
                  )

                  return (
                    <tr
                      key={req.id}
                      className={cn(
                        'hover:bg-slate-50 transition-colors',
                        isPendingForMe && 'bg-blue-50/40'
                      )}
                    >
                      <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>

                      <td className="p-3">
                        <div className="font-bold text-[#003461]">{req.requestNumber}</div>
                        <div className="text-[11px] text-slate-500">
                          {req.createdAt
                            ? new Date(req.createdAt).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '-'}
                        </div>
                        {req.attachmentUrl && (
                          <a
                            href={resolveUploadUrl(req.attachmentUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline mt-0.5"
                          >
                            <Paperclip className="w-3 h-3" /> Lampiran
                          </a>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-900 max-w-xs">{req.trainingTitle}</div>
                        <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                          {req.providerName} &bull; <span className="text-slate-500">{req.trainingVenue || 'Venue Belum Diisi'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {req.trainingDate} &bull; {req.trainingType} ({req.trainingCategory})
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-800">
                          {req.participantsType === 'attached_list' ? (
                            <span className="italic text-blue-700">List Peserta Terlampir</span>
                          ) : (
                            req.participantNames || req.requesterName || '-'
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {req.department} &bull; Level: {req.jobLevel || '-'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Diajukan: {req.requesterName}
                        </div>
                      </td>

                      <td className="p-3 font-semibold text-slate-800">
                        <div>
                          {req.costCurrency === 'USD' ? '$' : 'Rp'}{' '}
                          {req.costAmount ? Number(req.costAmount.replace(/[^0-9]/g, '') || 0).toLocaleString('id-ID') : '-'}
                        </div>
                        {req.costNotes && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {req.costNotes}
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        {/* Stepper Progress */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            {req.approvals?.map((a: any) => (
                              <span
                                key={a.id}
                                title={`${a.stepOrder}. ${a.roleLabel}: ${a.approverName} (${a.status})`}
                                className={cn(
                                  'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold',
                                  a.status === 'approved' && 'bg-emerald-600 text-white',
                                  a.status === 'rejected' && 'bg-rose-600 text-white',
                                  a.status === 'pending' &&
                                    a.stepOrder === req.currentStepOrder &&
                                    req.status === 'pending' &&
                                    'bg-blue-600 text-white animate-pulse',
                                  a.status === 'pending' &&
                                    (a.stepOrder !== req.currentStepOrder || req.status !== 'pending') &&
                                    'bg-slate-200 text-slate-600'
                                )}
                              >
                                {a.stepOrder}
                              </span>
                            ))}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {req.status === 'approved'
                              ? 'Disetujui Penuh (5/5)'
                              : req.status === 'rejected'
                              ? 'Ditolak'
                              : `Step ${req.currentStepOrder}: ${currentApprovalStep?.roleLabel || '-'}`}
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        {req.status === 'approved' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold text-[10px]">
                            Disetujui
                          </Badge>
                        ) : req.status === 'rejected' ? (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-200 font-semibold text-[10px]">
                            Ditolak
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 font-semibold text-[10px]">
                            Menunggu Approval
                          </Badge>
                        )}
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* If user is the active approver */}
                          {isPendingForMe && (
                            <TrainingRequestApprovalDialog
                              request={req}
                              approvals={req.approvals || []}
                              currentApproval={currentApprovalStep}
                              onSuccess={() => router.refresh()}
                            />
                          )}

                          {/* Preview & Print PDF */}
                          <TrainingRequestPdfDialog
                            request={req}
                            approvals={req.approvals || []}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs px-2 gap-1 text-slate-700"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Preview PDF</span>
                              </Button>
                            }
                          />

                          {/* Sync to Training Records Button if Approved */}
                          {req.status === 'approved' && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={req.isSyncedToRecords || isSyncing}
                              onClick={() => handleSyncToRecords(req.id)}
                              className={cn(
                                'h-7 text-xs px-2 gap-1 shadow-sm',
                                req.isSyncedToRecords
                                  ? 'bg-slate-100 text-slate-400 border-slate-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              )}
                            >
                              {syncingId === req.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3 h-3" />
                              )}
                              <span>{req.isSyncedToRecords ? 'Tersinkron' : 'Sync Records'}</span>
                            </Button>
                          )}

                          {/* Extra Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              {req.status !== 'approved' && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(req.id)}
                                  className="text-rose-600 focus:text-rose-600 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Hapus Pengajuan
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
