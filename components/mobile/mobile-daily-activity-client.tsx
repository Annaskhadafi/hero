'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import QRCode from 'qrcode'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileCheck,
  FileSignature,
  FileText,
  HeartPulse,
  History,
  ListChecks,
  Loader2,
  MapPin,
  PenTool,
  PlusCircle,
  RotateCcw,
  Sparkles,
  Stethoscope,
  User,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminStatusBadge } from '@/components/admin-status-badge'
import { DailyActivityEvidenceModal } from '@/components/daily-activity-evidence-modal'
import { MissingSignatureDialog } from '@/components/missing-signature-dialog'
import { MobileDailyActivityForm } from '@/components/mobile/mobile-daily-activity-form'
import { MobileActivityLog } from '@/components/mobile/mobile-activity-log'
import { MobileDailyActivityHistory } from '@/components/mobile/mobile-daily-activity-history'
import { MobileApprovalCenter } from '@/components/mobile/mobile-approval-center'
import { MobileSignaturePadDialog } from '@/components/mobile/mobile-signature-pad-dialog'
import {
  getDailyActivityApprovalData,
  singleApproveDailyActivityAction,
  singleRevertDailyActivityAction,
  singleRejectDailyActivityAction,
} from '@/app/dashboard/activity-hub/actions'
import { getUserSignatureAction } from '@/app/actions/user-signature'
import { downloadElementAsPdf } from '@/lib/pdf-download'
import { cn } from '@/lib/utils'

function dateTimeLocalValue(reference: Date) {
  const local = new Date(reference.getTime() - reference.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatTime(value?: Date | null) {
  if (!value) return '--:--'
  return value.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' })
}

function formatTimestamp(value: Date | string | null | undefined) {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function statusBadgeClass(status: string) {
  const n = (status || '').toLowerCase()
  if (n.includes('approved') || n.includes('disetujui')) return 'bg-emerald-50 text-emerald-700'
  if (n.includes('pending') || n.includes('menunggu') || n.includes('submitted')) return 'bg-amber-50 text-amber-700'
  if (n.includes('reject') || n.includes('tolak')) return 'bg-rose-50 text-rose-700'
  if (n.includes('revert') || n.includes('revisi')) return 'bg-amber-100 text-amber-800'
  return 'bg-blue-50 text-blue-700'
}

export function MobileDailyActivityClient({
  data,
  rawEmployees,
  rawSections,
  rawDepartments,
  rawSites,
  hierarchy,
  teamMembers,
  latestMcu,
  productivityPercent,
  splToUpdate,
  submitted,
  submittedSpl,
  tabQuery,
  editSessionData,
  approvals,
}: {
  data: any
  rawEmployees: any[]
  rawSections: any[]
  rawDepartments: any[]
  rawSites: any[]
  hierarchy: any
  teamMembers: any[]
  latestMcu: any
  productivityPercent: number
  splToUpdate: any
  submitted?: boolean
  submittedSpl?: boolean
  tabQuery?: string
  editSessionData?: any
  approvals?: any
}) {
  const router = useRouter()
  const [selectedReviewDoc, setSelectedReviewDoc] = useState<any | null>(null)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isLoadingReview, setIsLoadingReview] = useState(false)
  const [approvalRemarks, setApprovalRemarks] = useState('')
  const [isActionRunning, setIsActionRunning] = useState(false)
  const [isSigModalOpen, setIsSigModalOpen] = useState(false)
  const [isMissingSigDialogOpen, setIsMissingSigDialogOpen] = useState(false)
  const [userSignature, setUserSignature] = useState<string | null>(data?.employee?.signatureDataUrl || null)
  const [previewZoom, setPreviewZoom] = useState(1.0)
  const pdfRef = useRef<HTMLDivElement | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return
    setIsDragging(true)
    setDragStart({
      x: e.pageX - scrollContainerRef.current.offsetLeft,
      y: e.pageY - scrollContainerRef.current.offsetTop,
      scrollLeft: scrollContainerRef.current.scrollLeft,
      scrollTop: scrollContainerRef.current.scrollTop,
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const y = e.pageY - scrollContainerRef.current.offsetTop
    const walkX = (x - dragStart.x) * 1.3
    const walkY = (y - dragStart.y) * 1.3
    scrollContainerRef.current.scrollLeft = dragStart.scrollLeft - walkX
    scrollContainerRef.current.scrollTop = dragStart.scrollTop - walkY
  }

  const handleMouseUpOrLeave = () => {
    setIsDragging(false)
  }

  const activeCount = data.summary.jobsAssigned || data.assignments.length || 0

  const safeApprovals = approvals ?? {
    currentUserName: data.employee?.name || data.employee?.email || '',
    inboxMetrics: {
      pendingGroups: 0,
      pendingActivities: 0,
      dueSoon: 0,
      overdue: 0,
      dailyActivityCount: 0,
      overtimeCount: 0,
      ptwCount: 0,
      sopWinRequestCount: 0,
      contractReviewCount: 0,
      generalActivityCount: 0,
    },
    historyMetrics: {
      total: 0,
      approved: 0,
      rejected: 0,
      needsRevision: 0,
      inReview: 0,
    },
    contractReviewInboxItems: [],
    dailyActivityInboxItems: [],
    overtimeInboxItems: [],
    ptwInboxItems: [],
    sopWinRequestInboxItems: [],
    inboxGroups: [],
    historyGroups: [],
  }

  const pendingDailyApprovalCount =
    (safeApprovals.dailyActivityInboxItems || []).length +
    (safeApprovals.inboxGroups || []).reduce(
      (sum: number, g: any) => sum + (g.activityCount || g.items?.length || 0),
      0
    )
  const pendingApprovalCount = pendingDailyApprovalCount > 0
    ? pendingDailyApprovalCount
    : data.activities.filter((a: any) =>
        ['pending', 'submitted'].includes((a.status || '').toLowerCase())
      ).length

  const handleOpenReview = async (act: any) => {
    const sId = typeof act === 'number' ? act : (act?.sessionId || act?.id)
    if (!sId) {
      toast.error('ID sesi aktivitas tidak valid.')
      return
    }
    setIsLoadingReview(true)
    setIsReviewOpen(true)
    setApprovalRemarks('')
    try {
      const docData = await getDailyActivityApprovalData(sId)
      setSelectedReviewDoc(docData)
      try {
        const sigRes = await getUserSignatureAction()
        if (sigRes.success && sigRes.signatureDataUrl) {
          setUserSignature(sigRes.signatureDataUrl)
        }
      } catch {}
    } catch (err: any) {
      console.error('Error fetching doc:', err)
      toast.error('Gagal memuat dokumen approval.')
      setIsReviewOpen(false)
    } finally {
      setIsLoadingReview(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedReviewDoc) return
    if (!userSignature) {
      setIsMissingSigDialogOpen(true)
      return
    }
    setIsActionRunning(true)
    try {
      const res = await singleApproveDailyActivityAction(
        selectedReviewDoc.sessionId,
        approvalRemarks,
        userSignature || undefined
      )
      if (res.success) {
        toast.success('Dokumen Daily Activity berhasil disetujui!')
        setIsReviewOpen(false)
        router.refresh()
      } else if ((res as any).needsSignatureRegistration) {
        setIsMissingSigDialogOpen(true)
      } else {
        toast.error((res as any).error || 'Gagal menyetujui dokumen')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan saat approval')
    } finally {
      setIsActionRunning(false)
    }
  }

  const handleRevert = async () => {
    if (!selectedReviewDoc) return
    const remarks = approvalRemarks.trim() || 'Dokumen dikembalikan untuk revisi.'
    setIsActionRunning(true)
    try {
      const res = await singleRevertDailyActivityAction(selectedReviewDoc.sessionId, remarks)
      if (res.success) {
        toast.success('Permintaan revisi berhasil dikirim!')
        setIsReviewOpen(false)
        router.refresh()
      } else {
        toast.error((res as any).error || 'Gagal mengirim revisi')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan saat mengirim revisi')
    } finally {
      setIsActionRunning(false)
    }
  }

  const handleReject = async () => {
    if (!selectedReviewDoc) return
    const remarks = approvalRemarks.trim() || 'Dokumen ditolak oleh reviewer.'
    setIsActionRunning(true)
    try {
      const res = await singleRejectDailyActivityAction(selectedReviewDoc.sessionId, remarks)
      if (res.success) {
        toast.success('Dokumen Daily Activity telah ditolak.')
        setIsReviewOpen(false)
        router.refresh()
      } else {
        toast.error((res as any).error || 'Gagal menolak dokumen')
      }
    } catch (err: any) {
      toast.error(err?.message || 'Terjadi kesalahan saat menolak dokumen')
    } finally {
      setIsActionRunning(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!pdfRef.current || !selectedReviewDoc) return
    try {
      await downloadElementAsPdf(pdfRef.current, `DAR-${selectedReviewDoc.sessionCode || selectedReviewDoc.sessionId}.pdf`)
      toast.success('PDF berhasil diunduh!')
    } catch (err) {
      toast.error('Gagal mengunduh PDF.')
    }
  }

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (tabQuery === 'approval') return 'approval'
    if (tabQuery === 'active') return 'active'
    if (tabQuery === 'history') return 'history'
    return 'apply'
  })

  useEffect(() => {
    if (tabQuery && ['apply', 'approval', 'active', 'history'].includes(tabQuery)) {
      setActiveTab(tabQuery)
    }
  }, [tabQuery])

  const handleTabChange = (val: string) => {
    setActiveTab(val)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', val)
      window.history.replaceState({}, '', url.toString())
    }
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Header section persis SPL Mobile */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.24em] text-[#486275] uppercase">
              Aktivitas Harian
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">
              Daily Activity Mobile
            </h1>
          </div>
          <Badge className="border-0 bg-[#eaf4fb] text-[#003f78] font-bold text-xs">
            {data.activities.length} DAR
          </Badge>
        </div>
        <p className="text-sm leading-6 font-semibold text-[#486275]">
          Ajukan, approve, pantau aktivitas harian aktif, dan kelola riwayat DAR tanpa membuka desktop.
        </p>
      </section>

      {/* Sub-Navbar Tabs Bar persis SPL Mobile */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full space-y-4"
      >
        <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-2xl bg-white p-1 shadow-[0_12px_30px_rgba(8,32,51,0.08)]">
          <TabsTrigger
            value="apply"
            className="min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold text-slate-600 transition-all data-[state=active]:bg-[#003461] data-[state=active]:text-white data-[state=active]:shadow-xs cursor-pointer select-none touch-manipulation"
          >
            <PlusCircle className="size-4 shrink-0 pointer-events-none" />
            <span className="pointer-events-none">Ajukan</span>
          </TabsTrigger>

          <TabsTrigger
            value="approval"
            className="min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold text-slate-600 transition-all data-[state=active]:bg-[#003461] data-[state=active]:text-white data-[state=active]:shadow-xs relative cursor-pointer select-none touch-manipulation"
          >
            <div className="relative flex items-center pointer-events-none">
              <CheckCheck className="size-4 shrink-0 pointer-events-none" />
              {pendingApprovalCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-white animate-pulse pointer-events-none">
                  {pendingApprovalCount}
                </span>
              )}
            </div>
            <span className="pointer-events-none">Approval</span>
          </TabsTrigger>

          <TabsTrigger
            value="active"
            className="min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold text-slate-600 transition-all data-[state=active]:bg-[#003461] data-[state=active]:text-white data-[state=active]:shadow-xs relative cursor-pointer select-none touch-manipulation"
          >
            <div className="relative flex items-center pointer-events-none">
              <Clock3 className="size-4 shrink-0 pointer-events-none" />
              {activeCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white ring-2 ring-white pointer-events-none">
                  {activeCount}
                </span>
              )}
            </div>
            <span className="pointer-events-none">DAR Aktif</span>
          </TabsTrigger>

          <TabsTrigger
            value="history"
            className="min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold text-slate-600 transition-all data-[state=active]:bg-[#003461] data-[state=active]:text-white data-[state=active]:shadow-xs cursor-pointer select-none touch-manipulation"
          >
            <History className="size-4 shrink-0 pointer-events-none" />
            <span className="pointer-events-none">Riwayat</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apply">
          <MobileDailyActivityForm
            key={editSessionData?.sessionId || editSessionData?.id || (editSessionData?.session ? (editSessionData.session.sessionId || editSessionData.session.id) : 'new-form')}
            employeeId={data.employee.id}
            employee={data.employee}
            hierarchy={hierarchy}
            assignments={data.assignments || []}
            availableLibrary={data.availableLibrary || []}
            defaultStartTime={dateTimeLocalValue(new Date())}
            defaultEndTime={dateTimeLocalValue(new Date(Date.now() + 3600000))}
            routeChecklist={data.routeChecklist}
            availableRouteFolders={data.availableRouteFolders || []}
            standaloneOvertimeChecklist={data.standaloneOvertimeChecklist}
            site={data.site}
            teamMembers={teamMembers}
            revisionSessionId={editSessionData?.sessionId || editSessionData?.id || editSessionData?.data?.sessionId || editSessionData?.data?.id || editSessionData?.session?.sessionId || editSessionData?.session?.id || undefined}
            initialSessionData={editSessionData?.data || editSessionData?.session || editSessionData}
          />
        </TabsContent>

        <TabsContent value="approval" className="mt-4 space-y-4">
          <div className="rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)] border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <div>
                <p className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                  Pusat Persetujuan Mobile
                </p>
                <h2 className="mt-0.5 text-base font-extrabold text-[#003461]">
                  Persetujuan Daily Activity (DAR)
                </h2>
              </div>
              {pendingApprovalCount > 0 ? (
                <Badge className="border-0 bg-rose-100 text-rose-900 font-bold text-[10px]">
                  {pendingApprovalCount} Perlu Ditinjau
                </Badge>
              ) : (
                <Badge className="border-0 bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                  Semua Bersih
                </Badge>
              )}
            </div>
            <MobileApprovalCenter
              data={safeApprovals}
              categoryFilter="DAILY_ACTIVITY"
              hideHeader
              hideScorecards
              hideTabs
            />
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {/* Productivity Stats Card */}
          <section className="rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 p-4 text-white shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[10px] font-medium text-blue-100">
                  <Sparkles className="size-3" /> Productivity
                </span>
                <p className="mt-3 text-3xl font-bold leading-none">{productivityPercent}%</p>
                <p className="mt-2 text-sm text-blue-200">
                  {data.summary.jobsCompleted}/{data.summary.jobsAssigned} job selesai hari ini
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-white/10 px-3 py-2 text-center">
                <p className="text-[10px] font-medium text-blue-200">Points</p>
                <p className="mt-0.5 text-base font-bold">{data.summary.pointsToday}</p>
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-2 text-center">
                <p className="text-[10px] font-medium text-blue-200">Streak</p>
                <p className="mt-0.5 text-base font-bold">{data.summary.streakDays}d</p>
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-2 text-center">
                <p className="text-[10px] font-medium text-blue-200">Queue</p>
                <p className="mt-0.5 text-base font-bold">{data.summary.jobsAssigned}</p>
              </div>
            </div>
          </section>

          {/* MCU Wellness Shortcut */}
          {latestMcu && (
            <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-blue-50/60 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-sky-700 shadow-sm ring-1 ring-sky-200">
                    <Stethoscope className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                        Medical Check Up
                      </p>
                      <Badge
                        className={cn(
                          'text-[10px] px-1.5 py-0 border-0',
                          latestMcu.status === 'fit'
                            ? 'bg-emerald-100 text-emerald-800'
                            : latestMcu.status === 'unfit'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                        )}
                      >
                        {latestMcu.aiKategori || latestMcu.status?.toUpperCase() || 'SELESAI'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-800">
                      {latestMcu.mcuDate
                        ? `Hasil MCU: ${new Date(latestMcu.mcuDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}`
                        : 'Pemeriksaan MCU'}
                    </p>
                    {latestMcu.aiKesimpulan && (
                      <p className="mt-1 text-xs text-slate-600 line-clamp-1">
                        {latestMcu.aiKesimpulan}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-sky-200/60 pt-2.5">
                <span className="text-[11px] text-sky-800 font-medium flex items-center gap-1">
                  <HeartPulse className="size-3.5 text-rose-500" /> Fit to Work
                </span>
                <Link
                  href="/mobile/wellness"
                  prefetch={false}
                  className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:text-sky-900"
                >
                  Lihat History MCU & PDF <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </section>
          )}

          {/* Urgent Overtime Alert */}
          {splToUpdate && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                  <AlertTriangle className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Aktivitas lembur perlu diupdate
                  </p>
                  <p className="mt-1 text-sm font-bold text-amber-950">
                    {splToUpdate.splNumber} · {splToUpdate.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    {splToUpdate.status === 'submitted'
                      ? 'SPL masih menunggu approval, tetapi pekerjaan urgent dan evidence sudah boleh diisi.'
                      : 'SPL sudah approved. Lengkapi aktivitas dan foto evidence sebelum closing.'}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* Job List Aktual */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Job List Aktual Hari Ini
              </h2>
              <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                {data.assignments.length} item
              </span>
            </div>

            {data.assignments.length > 0 ? (
              <div className="space-y-2">
                {data.assignments.map((assignment: any) => (
                  <article
                    key={assignment.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {assignment.activityCode ?? 'Custom Job'}
                        </p>
                        <h2 className="mt-0.5 text-xs font-extrabold leading-tight text-slate-900">
                          {assignment.customJobName || assignment.activityName || 'Pekerjaan Aktual'}
                        </h2>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {assignment.assignedByName} &bull; {assignment.durationLabel}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'rounded-md px-2 py-0.5 text-[10px] font-bold shrink-0',
                          statusBadgeClass(assignment.statusLabel)
                        )}
                      >
                        {assignment.statusLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                        <p className="text-[10px] font-medium text-slate-500">Deadline</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-900">
                          {formatTime(assignment.deadline)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                        <p className="text-[10px] font-medium text-slate-500">Priority</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-900">{assignment.priority}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs font-semibold text-slate-500">
                Belum ada assignment hari ini.
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <MobileDailyActivityHistory
            activities={data.activities}
            onOpenReview={handleOpenReview}
          />
        </TabsContent>
      </Tabs>

      {/* ── FLOATING REVIEW & DIGITAL SIGNATURE MODAL (PERSIS INBOX APPROVAL) ── */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-w-[430px] w-full sm:max-w-[430px] mx-auto h-[92dvh] sm:h-[86dvh] max-h-[92dvh] flex flex-col p-0 overflow-hidden bg-slate-100 border border-slate-200 shadow-2xl rounded-t-2xl sm:rounded-2xl z-50"
        >
          {/* Mobile Header Bar */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-slate-200 text-slate-900 shrink-0 select-none">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="size-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
                <FileText className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs text-slate-900 truncate">
                  Review & Approval Dokumen • <span className="text-[#003461]">{selectedReviewDoc?.sessionCode || 'DAR'}</span>
                </p>
                <p className="text-[10px] text-slate-500 truncate">
                  {selectedReviewDoc?.employee?.name} • {formatDate(selectedReviewDoc?.workDate)} • Shift {selectedReviewDoc?.shiftCode || 'ALL'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Stepper */}
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                <span className="text-[10px] font-mono font-bold text-slate-700 px-1.5 py-0.5">
                  1/1
                </span>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[10px] font-semibold gap-1 rounded-lg bg-[#e2e8f0] border-slate-200 text-slate-800"
                onClick={handleDownloadPdf}
              >
                <Download className="size-3" /> UNDUH PDF
              </Button>

              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>

          {/* Mobile Body Content - PDF Preview + Form & TTD Stacked Vertically */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 bg-slate-100 space-y-3 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300">
            {isLoadingReview ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="size-8 animate-spin text-[#003461]" />
                <p className="font-semibold text-xs">Memuat dokumen surat...</p>
              </div>
            ) : !selectedReviewDoc ? (
              <div className="py-20 text-center text-slate-500 text-xs">
                Data dokumen tidak ditemukan.
              </div>
            ) : (
              <>
                {/* Zoom Action Bar */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-white/90 backdrop-blur-xs rounded-xl border border-slate-200 shadow-2xs max-w-lg mx-auto">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                    <FileText className="size-3.5 text-[#003461]" /> Preview Dokumen Surat / PDF
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
                      className="h-7 w-7 p-0 text-xs font-extrabold text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title="Zoom Out"
                    >
                      -
                    </Button>
                    <span className="text-[11px] font-mono font-bold text-slate-600 px-1 min-w-10 text-center">
                      {Math.round(previewZoom * 100)}%
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewZoom((z) => Math.min(3.0, Number((z + 0.15).toFixed(2))))}
                      className="h-7 w-7 p-0 text-xs font-extrabold text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title="Zoom In"
                    >
                      +
                    </Button>
                    {previewZoom !== 2.2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewZoom(2.2)}
                        className="h-7 px-2 text-[10px] font-bold text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>

                {/* 1. PDF Letterhead Document Preview Container with Drag-to-Pan */}
                <div
                  ref={scrollContainerRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                  className={cn(
                    "flex justify-center items-start overflow-x-auto overflow-y-hidden p-2 sm:p-4 w-full max-w-full rounded-xl select-none touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                    isDragging ? "cursor-grabbing" : "cursor-grab"
                  )}
                >
                  <div
                    ref={pdfRef}
                    id="mobile-dar-preview-sheet"
                    className="relative mx-auto shrink-0 bg-white shadow-lg border border-slate-200 rounded-sm origin-top transition-transform duration-100 w-[210mm] min-h-[297mm]"
                    style={{
                      backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
                      backgroundSize: '100% 100%',
                      transform: `scale(${0.44 * previewZoom})`,
                      transformOrigin: 'top center',
                      marginBottom: `${Math.max(0, (previewZoom - 1.0) * 160)}mm`,
                    }}
                  >
                    <div
                      className="relative z-10 outline-none text-[8.5pt] font-sans leading-tight text-black"
                      style={{
                        paddingTop: '38mm',
                        paddingBottom: '35mm',
                        paddingLeft: '20mm',
                        paddingRight: '20mm',
                        minHeight: '297mm',
                      }}
                    >
                      <div className="text-center mb-3">
                        <h1 className="font-bold text-[11pt] uppercase text-black leading-tight">
                          {selectedReviewDoc.spl ? 'SURAT PERINTAH LEMBUR (SPL)' : 'LAPORAN AKTIVITAS HARIAN (DAR)'}
                        </h1>
                        <p className="font-semibold text-[8pt] text-slate-700 uppercase tracking-wide">
                          {selectedReviewDoc.spl ? 'PT CHITRA PARATAMA • HUMAN CAPITAL' : 'PT CHITRA PARATAMA • OPERATION & SERVICES'}
                        </p>
                      </div>

                      {/* 4-column Details & Request Profile */}
                      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]">
                        <tbody>
                          <tr>
                            <td colSpan={4} className="font-bold bg-slate-50 text-black py-0.5">Details &amp; Request Profile</td>
                          </tr>
                          <tr>
                            <td className="w-1/4 font-bold bg-slate-50 text-black">Kode Sesi / Dokumen</td>
                            <td className="w-1/4 font-mono font-semibold text-black">{selectedReviewDoc.sessionCode || 'DAR'}</td>
                            <td className="w-1/4 font-bold bg-slate-50 text-black">Tanggal Kerja</td>
                            <td className="w-1/4 font-semibold text-black">{formatDate(selectedReviewDoc.workDate)}</td>
                          </tr>
                          <tr>
                            <td className="font-bold bg-slate-50 text-black">Status / Shift</td>
                            <td className="capitalize font-semibold text-black">{selectedReviewDoc.status || 'Submitted'} • Shift {selectedReviewDoc.shiftCode || 'ALL'}</td>
                            <td className="font-bold bg-slate-50 text-black">Customer / Site</td>
                            <td className="text-black font-semibold">{selectedReviewDoc.customerName || selectedReviewDoc.site?.customerName || 'Default Customer'} ({selectedReviewDoc.site?.name || selectedReviewDoc.siteName || 'Balikpapan'})</td>
                          </tr>
                          <tr>
                            <td className="font-bold bg-slate-50 text-black">Nama Pemohon</td>
                            <td className="text-black font-semibold">{selectedReviewDoc.employee?.name || '—'} (SN: {selectedReviewDoc.employee?.employeeSn || selectedReviewDoc.employee?.sn || '—'})</td>
                            <td className="font-bold bg-slate-50 text-black">Dept / Section</td>
                            <td className="text-black">{[selectedReviewDoc.employee?.department, selectedReviewDoc.employee?.section].filter(Boolean).join(' / ') || 'Central Services'}</td>
                          </tr>
                          {selectedReviewDoc.teamMembersSummary ? (
                            <tr>
                              <td className="font-bold bg-slate-50 text-black">Anggota Tim</td>
                              <td colSpan={3} className="text-black font-normal">{selectedReviewDoc.teamMembersSummary}</td>
                            </tr>
                          ) : null}
                          {selectedReviewDoc.notes || selectedReviewDoc.summaryRemark ? (
                            <tr>
                              <td className="font-bold bg-slate-50 text-black">Catatan Aktivitas</td>
                              <td colSpan={3} className="text-black">{selectedReviewDoc.notes || selectedReviewDoc.summaryRemark}</td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>

                      {/* A. Daily Activity Items */}
                      {(() => {
                        const items = selectedReviewDoc.items || selectedReviewDoc.sessionItems || []
                        return (
                          <>
                            <div className="font-bold mb-1 text-[8.5pt]">
                              A. Daily Activity Items (Total: {items.length} item)
                            </div>
                            <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]">
                              <thead>
                                <tr className="bg-gray-100 font-bold text-center">
                                  <th className="w-[5%]">#</th>
                                  <th className="text-left w-[46%]">Aktivitas</th>
                                  <th className="w-[14%]">Durasi</th>
                                  <th className="w-[12%]">Poin</th>
                                  <th className="text-left w-[23%]">Remark</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.length > 0 ? (
                                  items.map((it: any, idx: number) => {
                                    return (
                                      <tr key={it.id || idx}>
                                        <td className="text-center align-middle">{idx + 1}</td>
                                        <td className="align-middle">{it.label || it.snapshotLabel || 'Aktivitas'}</td>
                                        <td className="text-center align-middle">{it.duration || '-'}</td>
                                        <td className="text-center font-bold align-middle">{it.points || it.actualPoints || 0}</td>
                                        <td className="text-left text-[7.5pt] align-middle">{it.remark || it.remarks || '-'}</td>
                                      </tr>
                                    )
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={5} className="text-center text-slate-400 py-3">Belum ada item aktivitas.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </>
                        )
                      })()}

                      {/* B. Approval Steps Table & Signatories */}
                      {(() => {
                        const rawApprovals = selectedReviewDoc.approvals || []
                        const approvals = rawApprovals.filter(
                          (s: any) =>
                            Number(s.stepOrder) <= 2 &&
                            s.approverRole !== 'section_head' &&
                            s.approverRole !== 'section_head_confirmation' &&
                            s.approverRole !== 'manager'
                        )
                        const step1 = approvals.find((s: any) => s.stepOrder === 1)
                        const step2 = approvals.find((s: any) => s.stepOrder === 2)
                        const isSigned1 = step1?.status === 'approved' || step1?.status === 'signed' || step1?.status === 'completed'
                        const isApproved2 = step2?.status === 'approved'
                        const isReverted1 = step1?.status === 'reverted'
                        const isReverted2 = step2?.status === 'reverted'
                        const currentSig = isSigned1 ? (step1?.signatureUrl || step1?.signatureDataUrl || null) : null
                        const sig2 = isApproved2 ? (step2?.signatureUrl || step2?.signatureDataUrl || null) : null

                        return (
                          <>
                            {/* B. Approval Steps */}
                            <div className="font-bold mb-1 text-[8.5pt]">
                              B. Approval Steps
                            </div>
                            <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-center text-[8pt]" style={{ tableLayout: 'fixed' }}>
                              <thead>
                                <tr className="bg-gray-100 font-bold">
                                  <th style={{ width: '6%' }}>#</th>
                                  <th className="text-left" style={{ width: '22%' }}>Tahap</th>
                                  <th className="text-left" style={{ width: '22%' }}>Approver</th>
                                  <th style={{ width: '14%' }}>Status</th>
                                  <th style={{ width: '16%' }}>Waktu</th>
                                  <th className="text-left" style={{ width: '20%' }}>Catatan</th>
                                </tr>
                              </thead>
                              <tbody>
                                {approvals.length > 0 ? (
                                  approvals.map((step: any) => {
                                    const isCurrentActiveStep = step.status === 'pending'
                                    const liveRemark = isCurrentActiveStep && approvalRemarks
                                      ? approvalRemarks
                                      : step.remarks || '—'
                                    const isApproved = step.status === 'approved' || step.status === 'signed'
                                    return (
                                      <tr key={step.stepOrder || step.id}>
                                        <td>{step.stepOrder}</td>
                                        <td className="text-left">{step.stepLabel}</td>
                                        <td className="text-left font-semibold">{step.approverName || '-'}</td>
                                        <td className={cn("capitalize font-semibold", isApproved ? "text-emerald-700 font-bold" : "")}>
                                          {step.stepOrder === 1 && isApproved
                                            ? 'Approved'
                                            : step.status}
                                        </td>
                                        <td className="text-[7pt] font-mono">{formatTimestamp(step.signedAt)}</td>
                                        <td className="text-left italic text-slate-600 text-[7.5pt] break-words whitespace-normal leading-tight" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                          {liveRemark}
                                        </td>
                                      </tr>
                                    )
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={6} className="text-center text-slate-400 py-2">Belum ada riwayat persetujuan.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>

                            <div className="font-bold mb-2 text-[8.5pt]">Signatories</div>
                            <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-3">
                              {/* Karyawan */}
                              <div>
                                <div className="text-[7pt] text-slate-500 mb-1">Employee Signature</div>
                                <div className="h-14 flex items-end">
                                  {currentSig ? (
                                    <img src={currentSig} alt="TTD" className="h-10 object-contain" />
                                  ) : isSigned1 ? (
                                    <span className="text-emerald-700 font-serif italic font-bold text-[9pt]">{selectedReviewDoc.employee?.name}</span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[7.5pt]"></span>
                                  )}
                                </div>
                                <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
                                  {selectedReviewDoc.employee?.name}
                                </div>
                                <div className="text-[7pt] text-slate-600 font-medium">{selectedReviewDoc.employee?.jobTitle || 'Serviceman'}</div>
                                {isSigned1 && step1?.signedAt && (
                                  <div className="text-[6.5pt] text-slate-500 mt-0.5">
                                    {isReverted1 ? 'Waktu Revert: ' : 'Waktu TTD: '}
                                    {formatTimestamp(step1.signedAt)}
                                  </div>
                                )}
                              </div>

                              {/* Leader / PJO */}
                              <div>
                                <div className="text-[7pt] text-slate-500 mb-1">Leader / PJO Signature</div>
                                <div className="h-14 flex items-end">
                                  {sig2 ? (
                                    <img src={sig2} alt="TTD" className="h-10 object-contain" />
                                  ) : isApproved2 ? (
                                    <div className="flex flex-col items-center justify-center text-center">
                                      <span className="text-[6.5pt] font-bold text-emerald-600">✓ Approved ({formatTimestamp(step2?.signedAt)})</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[7.5pt]"></span>
                                  )}
                                </div>
                                <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
                                  {step2?.approverName || selectedReviewDoc.employee?.name}
                                </div>
                                <div className="text-[7pt] text-slate-600 font-medium">Leader / PJO</div>
                                {step2?.signedAt && (
                                  <div className="text-[6.5pt] text-slate-500 mt-0.5">
                                    {isReverted2 ? 'Waktu Revert: ' : 'Waktu TTD: '}
                                    {formatTimestamp(step2.signedAt)}
                                  </div>
                                )}
                              </div>

                              {/* Customer */}
                              <div>
                                <div className="text-[7pt] text-slate-500 mb-1">Customer Signature</div>
                                <div className="h-14 flex items-end">
                                  <span className="text-slate-400 italic text-[7.5pt]"></span>
                                </div>
                                <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
                                  &nbsp;
                                </div>
                                <div className="text-[7pt] text-slate-600 font-medium">Customer</div>
                              </div>
                            </div>

                            {/* Evidence QR in Bottom Right Corner */}
                            <div className="absolute right-[20mm] bottom-[18mm]">
                              <EvidenceQrBox sessionId={selectedReviewDoc?.sessionId || selectedReviewDoc?.id} />
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                {/* 2. Mobile Action Form & Signature - Positioned directly UNDER PDF Preview */}
                <div className="space-y-3 max-w-lg mx-auto bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  {/* Informasi Dokumen Box */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900 text-xs">Informasi Dokumen</span>
                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px] px-2 py-0.5 rounded-md uppercase">
                        {selectedReviewDoc?.status || 'Submitted'}
                      </Badge>
                    </div>
                    <p><span className="text-slate-400">Karyawan:</span> <span className="font-bold text-slate-900">{selectedReviewDoc?.employee?.name}</span></p>
                    <p><span className="text-slate-400">Kode Sesi:</span> <span className="font-bold text-indigo-700">{selectedReviewDoc?.sessionCode}</span></p>
                    <p><span className="text-slate-400">Tanggal:</span> <span className="font-semibold text-slate-800">{formatDate(selectedReviewDoc?.workDate)}</span></p>
                    <p><span className="text-slate-400">Shift:</span> <span className="font-semibold text-slate-800">{selectedReviewDoc?.shiftCode || 'ALL'}</span></p>
                  </div>

                  {/* TTD Approver Status & Quick Register / Edit */}
                  <div className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <PenTool className="size-3.5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-800">Tanda Tangan Approver</p>
                        <p className="text-[10px] text-slate-400">
                          {userSignature ? 'TTD Digital Aktif' : 'Belum Terdaftar'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsSigModalOpen(true)}
                      className={cn(
                        "h-7 text-[10px] font-bold rounded-lg px-2 gap-1 active:scale-95 cursor-pointer",
                        userSignature
                          ? "border-slate-200 text-slate-700 hover:bg-slate-50"
                          : "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                      )}
                    >
                      {userSignature ? 'UBAH TTD' : '+ Buat TTD'}
                    </Button>
                  </div>

                  {/* Catatan Approval Input */}
                  <div className="rounded-xl border border-slate-200 p-3 bg-white space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-800 block">
                      Catatan Approval
                    </label>
                    <Textarea
                      value={approvalRemarks}
                      onChange={(e) => setApprovalRemarks(e.target.value)}
                      placeholder="Tulis catatan / feedback approval di sini (opsional)..."
                      className="text-xs h-16 min-h-16 resize-none rounded-lg"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      AKSI DOKUMEN INI (1 / 1)
                    </p>
                    <Button
                      type="button"
                      disabled={isActionRunning}
                      onClick={handleApprove}
                      className="w-full bg-[#003461] hover:bg-[#002647] text-white font-bold text-xs h-9 rounded-lg shadow-xs cursor-pointer gap-1.5"
                    >
                      {isActionRunning ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                      APPROVE
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isActionRunning}
                        onClick={handleRevert}
                        className="font-bold text-xs h-8 text-slate-700 border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer gap-1"
                      >
                        <RotateCcw className="size-3" /> REVERT
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isActionRunning}
                        onClick={handleReject}
                        className="font-bold text-xs h-8 text-rose-600 border-slate-200 hover:bg-rose-50 rounded-lg cursor-pointer gap-1"
                      >
                        <X className="size-3" /> REJECT
                      </Button>
                    </div>
                  </div>

                  {/* Tutup Reviewer Button */}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsReviewOpen(false)}
                    className="w-full text-xs font-bold h-9 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer mt-2"
                  >
                    TUTUP REVIEWER
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Signature Pad Modal */}
      <MobileSignaturePadDialog
        isOpen={isSigModalOpen}
        onClose={() => setIsSigModalOpen(false)}
        onSignatureSaved={(sigUrl) => {
          setUserSignature(sigUrl)
          setIsSigModalOpen(false)
          toast.success('Tanda tangan digital berhasil disimpan!')
        }}
        onSignatureDeleted={() => {
          setUserSignature(null)
          setIsSigModalOpen(false)
          toast.success('Tanda tangan digital telah dihapus.')
        }}
      />

      {/* Floating Missing Signature Warning Dialog */}
      <MissingSignatureDialog
        isOpen={isMissingSigDialogOpen}
        onClose={() => setIsMissingSigDialogOpen(false)}
        onSignatureRegistered={(sigUrl) => {
          setUserSignature(sigUrl)
          setIsMissingSigDialogOpen(false)
          toast.success('Tanda tangan digital berhasil didaftarkan! Silakan tekan tombol APPROVE.')
        }}
      />
    </div>
  )
}

function EvidenceQrBox({ sessionId }: { sessionId?: number | string | null }) {
  const [qrUrl, setQrUrl] = useState<string>('')
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false)
  const cleanSessionId = typeof sessionId === 'string' ? sessionId.replace(/^daily-activity-/, '') : sessionId

  useEffect(() => {
    if (!cleanSessionId) return
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    QRCode.toDataURL(`${origin}/activity-evidence/${cleanSessionId}`, { margin: 1, width: 140, errorCorrectionLevel: 'M' })
      .then(setQrUrl)
      .catch((e) => console.error('Failed to generate evidence QR in mobile client:', e))
  }, [cleanSessionId])

  return (
    <>
      <div
        onClick={() => setIsEvidenceModalOpen(true)}
        className="flex flex-col items-center justify-start text-center border-l border-slate-200 pl-2 cursor-pointer group select-none transition-transform hover:scale-105 active:scale-95"
        title="Klik untuk membuka galeri foto bukti pekerjaan"
      >
        <div className="h-14 flex items-center justify-center">
          {qrUrl ? (
            <img src={qrUrl} alt="QR Evidence" className="h-12 w-12 object-contain rounded border border-slate-200 p-0.5 bg-white shadow-xs group-hover:border-indigo-500 group-hover:shadow-md transition-all" />
          ) : (
            <div className="h-12 w-12 rounded border border-dashed border-slate-300 flex items-center justify-center text-[6pt] text-slate-400">
              QR Code
            </div>
          )}
        </div>
        <div className="font-bold text-[7.5pt] text-slate-800 mt-0.5 group-hover:text-indigo-600 transition-colors">
          Scan / Klik Bukti Kerja
        </div>
        <div className="text-[6.5pt] text-slate-500 leading-tight">
          Validasi Dokumen Digital
        </div>
      </div>

      <DailyActivityEvidenceModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        sessionId={sessionId}
      />
    </>
  )
}
