'use client'

import React, { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
import { MobileDailyActivityForm } from '@/components/mobile/mobile-daily-activity-form'
import { MobileActivityLog } from '@/components/mobile/mobile-activity-log'
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
}) {
  const router = useRouter()
  const [selectedReviewDoc, setSelectedReviewDoc] = useState<any | null>(null)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isLoadingReview, setIsLoadingReview] = useState(false)
  const [approvalRemarks, setApprovalRemarks] = useState('')
  const [isActionRunning, setIsActionRunning] = useState(false)
  const [isSigModalOpen, setIsSigModalOpen] = useState(false)
  const [userSignature, setUserSignature] = useState<string | null>(null)
  const [previewZoom, setPreviewZoom] = useState(1.0)
  const pdfRef = useRef<HTMLDivElement | null>(null)

  const activeCount = data.summary.jobsAssigned || data.assignments.length || 0
  const pendingApprovalCount = data.activities.filter((a: any) =>
    ['pending', 'submitted'].includes((a.status || '').toLowerCase())
  ).length

  const handleOpenReview = async (act: any) => {
    const sId = act.sessionId || act.id
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
    setIsActionRunning(true)
    try {
      const res = await singleApproveDailyActivityAction(selectedReviewDoc.sessionId, approvalRemarks)
      if (res.success) {
        toast.success('Dokumen Daily Activity berhasil disetujui!')
        setIsReviewOpen(false)
        router.refresh()
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
    if (!approvalRemarks.trim()) {
      toast.error('Wajib mencantumkan catatan revisi!')
      return
    }
    setIsActionRunning(true)
    try {
      const res = await singleRevertDailyActivityAction(selectedReviewDoc.sessionId, approvalRemarks)
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
    if (!approvalRemarks.trim()) {
      toast.error('Wajib mencantumkan alasan penolakan!')
      return
    }
    setIsActionRunning(true)
    try {
      const res = await singleRejectDailyActivityAction(selectedReviewDoc.sessionId, approvalRemarks)
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
        defaultValue={
          tabQuery === 'approval'
            ? 'approval'
            : tabQuery === 'active'
              ? 'active'
              : tabQuery === 'history'
                ? 'history'
                : 'apply'
        }
        className="w-full space-y-4"
      >
        <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-2xl bg-white p-1 shadow-[0_12px_30px_rgba(8,32,51,0.08)]">
          <TabsTrigger
            value="apply"
            className="min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold text-slate-600 transition-all data-[state=active]:bg-[#003461] data-[state=active]:text-white data-[state=active]:shadow-xs"
          >
            <PlusCircle className="size-4 shrink-0" />
            <span>Ajukan</span>
          </TabsTrigger>

          <TabsTrigger
            value="approval"
            className="min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold text-slate-600 transition-all data-[state=active]:bg-[#003461] data-[state=active]:text-white data-[state=active]:shadow-xs relative"
          >
            <div className="relative flex items-center">
              <CheckCheck className="size-4 shrink-0" />
              {pendingApprovalCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-white animate-pulse">
                  {pendingApprovalCount}
                </span>
              )}
            </div>
            <span>Approval</span>
          </TabsTrigger>

          <TabsTrigger
            value="active"
            className="min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold text-slate-600 transition-all data-[state=active]:bg-[#003461] data-[state=active]:text-white data-[state=active]:shadow-xs relative"
          >
            <div className="relative flex items-center">
              <Clock3 className="size-4 shrink-0" />
              {activeCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white ring-2 ring-white">
                  {activeCount}
                </span>
              )}
            </div>
            <span>DAR Aktif</span>
          </TabsTrigger>

          <TabsTrigger
            value="history"
            className="min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold text-slate-600 transition-all data-[state=active]:bg-[#003461] data-[state=active]:text-white data-[state=active]:shadow-xs"
          >
            <History className="size-4 shrink-0" />
            <span>Riwayat</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apply">
          <MobileDailyActivityForm
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
            initialSessionData={editSessionData?.session || editSessionData}
          />
        </TabsContent>

        <TabsContent value="approval" className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Status & Approval DAR</h3>
                <p className="text-xs text-slate-500">Persetujuan berjenjang Leader & Section Head</p>
              </div>
              <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px] font-bold">
                {pendingApprovalCount} MENUNGGU
              </Badge>
            </div>

            <Link
              href="/mobile/approval"
              className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-indigo-900 hover:bg-indigo-100 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white shadow-xs">
                  <CheckCheck className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-bold">Buka Inbox Approval Mobile</p>
                  <p className="text-[10.5px] text-indigo-700">Verifikasi dokumen DAR & SPL karyawan</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-indigo-600" />
            </Link>

            {data.activities.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                Belum ada aktivitas yang dikirim untuk approval.
              </div>
            ) : (
              <div className="space-y-3">
                {data.activities.map((act: any) => {
                  const statusLower = (act.status || '').toLowerCase()
                  const isReverted = ['reverted', 'returned', 'needs_revision'].some((s) => statusLower.includes(s))
                  const isRejected = statusLower.includes('reject') || statusLower.includes('tolak')

                  return (
                    <article
                      key={act.id || act.sessionId}
                      className={cn(
                        'overflow-hidden rounded-2xl border bg-white shadow-sm transition',
                        isReverted ? 'border-amber-200 bg-amber-50/10' : 'border-indigo-100 hover:border-indigo-300'
                      )}
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-700 border border-indigo-200">
                                <FileCheck className="h-3 w-3" />
                                Daily Activity
                              </span>
                              <p className="mt-0.5 font-mono text-xs font-bold text-slate-900">
                                {act.activityCode || act.sessionCode || 'DAS-...'}
                              </p>
                            </div>
                          </div>
                          <AdminStatusBadge value={isRejected ? 'rejected' : isReverted ? 'reverted' : act.status || 'submitted'} />
                        </div>

                        <div className="space-y-1">
                          <p className="text-sm font-extrabold text-slate-900">{data.employee?.name || act.employeeName || act.label}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {data.site?.name || act.siteName || 'Balikpapan'} • Shift {act.shiftCode || 'ALL'}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 space-y-1">
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-500">Tahap Approval:</span>
                            <span className="font-bold text-indigo-700">Karyawan Sign / Leader Review</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-semibold text-slate-500">Batas Waktu:</span>
                            <span className="font-medium text-slate-700">Due {formatDate(act.startTime || act.submissionTime || new Date())}</span>
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={() => handleOpenReview(act)}
                          className={cn(
                            'flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-xs font-bold text-white shadow-xs transition active:scale-98 cursor-pointer',
                            isRejected
                              ? 'bg-rose-600 hover:bg-rose-700'
                              : isReverted
                                ? 'bg-amber-600 hover:bg-amber-700'
                                : 'bg-[#003461] hover:bg-[#00274a]'
                          )}
                        >
                          {isRejected ? 'LIHAT DETAIL DOKUMEN ↗' : isReverted ? 'REVISI DOKUMEN ↗' : 'BUKA TTD ↗'}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
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
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Riwayat Activity Log
              </h2>
            </div>
            <MobileActivityLog
              activities={data.activities.map((activity: any) => ({
                ...activity,
                startTime: activity.startTime.toISOString(),
                endTime: activity.endTime.toISOString(),
                submissionTime: activity.submissionTime?.toISOString() ?? null,
              }))}
            />
          </section>
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
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 bg-slate-100 space-y-3">
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
                      onClick={() => setPreviewZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                      className="h-7 w-7 p-0 text-xs font-extrabold text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
                      title="Zoom In"
                    >
                      +
                    </Button>
                    {previewZoom !== 1.0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewZoom(1.0)}
                        className="h-7 px-2 text-[10px] font-bold text-slate-500 hover:text-slate-900 rounded-lg cursor-pointer"
                      >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>

                {/* 1. PDF Letterhead Document Preview Container */}
                <div className="flex justify-center items-start overflow-hidden p-1 w-full max-w-full">
                  <div
                    ref={pdfRef}
                    id="mobile-dar-preview-sheet"
                    className="relative mx-auto shrink-0 bg-white shadow-md border border-slate-200 rounded-sm origin-top transition-transform duration-200 w-[210mm] min-h-[297mm]"
                    style={{
                      backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
                      backgroundSize: '100% 100%',
                      transform: `scale(${0.44 * previewZoom})`,
                      marginBottom: `${-160 + (previewZoom - 1.0) * 125}mm`,
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
                      <h1 className="text-center font-bold text-[11pt] text-black mb-0.5 uppercase">PT. CHITRA PARATAMA</h1>
                      <h2 className="text-center font-bold text-[12pt] text-black mb-3 uppercase">DAILY ACTIVITY APPROVAL REPORT</h2>

                      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1 text-[8.5pt]">
                        <tbody>
                          <tr><td colSpan={2} className="font-bold bg-white text-black py-0.5">Details</td></tr>
                          <tr>
                            <td className="w-1/2">Tanggal Kerja: <strong>{formatDate(selectedReviewDoc.workDate)}</strong></td>
                            <td className="w-1/2">Shift: <strong>{selectedReviewDoc.shiftCode || 'ALL'}</strong></td>
                          </tr>
                          <tr>
                            <td>Kode Sesi: <strong>{selectedReviewDoc.sessionCode}</strong></td>
                            <td>Status: <span className="capitalize font-bold text-black">{selectedReviewDoc.status || 'Submitted'}</span></td>
                          </tr>
                          <tr><td colSpan={2} className="font-bold bg-white text-black py-0.5">Employee Profile</td></tr>
                          <tr>
                            <td>Nama: <strong>{selectedReviewDoc.employee?.name}</strong></td>
                            <td>SN: <strong>{selectedReviewDoc.employee?.employeeSn || selectedReviewDoc.employee?.sn || '-'}</strong></td>
                          </tr>
                          <tr>
                            <td>Job Title: <strong>{selectedReviewDoc.employee?.jobTitle || 'Serviceman'}</strong></td>
                            <td>Dept / Section: <strong>{[selectedReviewDoc.employee?.department, selectedReviewDoc.employee?.section].filter(Boolean).join(' / ') || '—'}</strong></td>
                          </tr>
                          <tr>
                            <td>Site: <strong>{selectedReviewDoc.site?.name || 'Balikpapan'}</strong></td>
                            <td>Customer: <strong>{selectedReviewDoc.customerName || 'Default Customer'}</strong></td>
                          </tr>
                          {selectedReviewDoc.teamMembersSummary ? (
                            <tr>
                              <td colSpan={2}>
                                Anggota Tim: <strong>{selectedReviewDoc.teamMembersSummary}</strong>
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>

                      {/* A. Daily Activity Items */}
                      {(() => {
                        const items = selectedReviewDoc.items || []
                        const totalPoints = items.reduce((sum: number, it: any) => sum + (it.points || 0), 0)
                        return (
                          <>
                            <div className="font-bold mb-1 text-[8.5pt]">
                              A. Daily Activity Items (Total: {items.length} item, {totalPoints} poin)
                            </div>
                            <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]">
                              <thead>
                                <tr className="bg-white font-bold text-center">
                                  <th className="w-[6%]">#</th>
                                  <th className="text-left w-[40%]">Aktivitas</th>
                                  <th className="w-[14%]">Unit</th>
                                  <th className="w-[12%]">Durasi</th>
                                  <th className="w-[10%]">Poin</th>
                                  <th className="text-left w-[18%]">Remark</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.length > 0 ? (
                                  items.map((it: any, idx: number) => (
                                    <tr key={it.id || idx}>
                                      <td className="text-center">{idx + 1}</td>
                                      <td>{it.label}</td>
                                      <td className="text-center">{it.unitNumber || '-'}</td>
                                      <td className="text-center">{it.duration || '-'}</td>
                                      <td className="text-center font-bold">{it.points || 0}</td>
                                      <td className="text-left text-[7.5pt]">{it.remark || '-'}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={6} className="text-center text-slate-400 py-2">Belum ada item aktivitas.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </>
                        )
                      })()}

                      {/* B. Approval Steps */}
                      <div className="font-bold mb-1 text-[8.5pt]">B. Approval Steps</div>
                      <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]" style={{ tableLayout: 'fixed' }}>
                        <thead>
                          <tr className="bg-white font-bold text-center">
                            <th style={{ width: '6%' }}>#</th>
                            <th className="text-left" style={{ width: '22%' }}>Tahap</th>
                            <th className="text-left" style={{ width: '24%' }}>Approver</th>
                            <th style={{ width: '14%' }}>Status</th>
                            <th style={{ width: '18%' }}>Waktu</th>
                            <th className="text-left" style={{ width: '16%' }}>Catatan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedReviewDoc.approvals || []).map((step: any) => {
                            const isPending = step.status === 'pending'
                            const liveRemark = isPending && approvalRemarks ? approvalRemarks : step.remarks || '—'
                            return (
                              <tr key={step.stepOrder}>
                                <td className="text-center">{step.stepOrder}</td>
                                <td className="text-left font-medium">{step.stepLabel}</td>
                                <td className="text-left font-medium">{step.approverName || '-'}</td>
                                <td className="text-center capitalize font-bold">{step.status}</td>
                                <td className="text-center text-[7pt]">{formatTimestamp(step.signedAt)}</td>
                                <td className="italic text-slate-600 text-[7.5pt] break-words whitespace-normal leading-tight">{liveRemark}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>

                      {/* Signatories (3 Roles: Employee, Leader/PJO, Section Head) */}
                      {(() => {
                        const approvals = selectedReviewDoc.approvals || []
                        const step1 = approvals.find((s: any) => s.stepOrder === 1)
                        const step2 = approvals.find((s: any) => s.stepOrder === 2)
                        const step3 = approvals.find((s: any) => s.stepOrder === 3)
                        const isSigned1 = step1?.status === 'approved' || step1?.status === 'signed' || step1?.status === 'completed'
                        const isApproved2 = step2?.status === 'approved'
                        const isApproved3 = step3?.status === 'approved'
                        const currentSig = isSigned1 ? (step1?.signatureUrl || step1?.signatureDataUrl) : null
                        const sig2 = isApproved2 ? (step2?.signatureUrl || step2?.signatureDataUrl) : null
                        const sig3 = isApproved3 ? (step3?.signatureUrl || step3?.signatureDataUrl) : null

                        return (
                          <>
                            <div className="font-bold mb-3 text-[8.5pt]">Signatories</div>
                            <div className="grid grid-cols-3 gap-x-6 gap-y-4 mb-4">
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
                                  <div className="text-[6.5pt] text-slate-500 mt-0.5">Waktu TTD: {formatTimestamp(step1.signedAt)}</div>
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
                                {isApproved2 && step2?.signedAt && (
                                  <div className="text-[6.5pt] text-slate-500 mt-0.5">Waktu TTD: {formatTimestamp(step2.signedAt)}</div>
                                )}
                              </div>

                              {/* Section Head */}
                              <div>
                                <div className="text-[7pt] text-slate-500 mb-1">Section Head Signature</div>
                                <div className="h-14 flex items-end">
                                  {sig3 ? (
                                    <img src={sig3} alt="TTD" className="h-10 object-contain" />
                                  ) : isApproved3 ? (
                                    <div className="flex flex-col items-center justify-center text-center">
                                      <span className="text-[6.5pt] font-bold text-emerald-600">✓ Approved ({formatTimestamp(step3?.signedAt)})</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[7.5pt]"></span>
                                  )}
                                </div>
                                <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
                                  {step3?.approverName || selectedReviewDoc.employee?.name}
                                </div>
                                <div className="text-[7pt] text-slate-600 font-medium">Section Head</div>
                                {isApproved3 && step3?.signedAt && (
                                  <div className="text-[6.5pt] text-slate-500 mt-0.5">Waktu TTD: {formatTimestamp(step3.signedAt)}</div>
                                )}
                              </div>
                            </div>

                            <div className="text-right text-[7pt] text-slate-400 mt-4">PT Chitra Paratama • HERO Platform</div>
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
    </div>
  )
}
