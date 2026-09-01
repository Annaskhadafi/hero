'use client'

import React from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileSignature,
  HeartPulse,
  History,
  ListChecks,
  PlusCircle,
  Sparkles,
  Stethoscope,
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MobileDailyActivityForm } from '@/components/mobile/mobile-daily-activity-form'
import { MobileActivityLog } from '@/components/mobile/mobile-activity-log'
import { cn } from '@/lib/utils'

function dateTimeLocalValue(reference: Date) {
  const local = new Date(reference.getTime() - reference.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function formatTime(value?: Date | null) {
  if (!value) return '--:--'
  return value.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function statusBadgeClass(status: string) {
  const n = status.toLowerCase()
  if (n.includes('approved')) return 'bg-emerald-50 text-emerald-700'
  if (n.includes('pending')) return 'bg-amber-50 text-amber-700'
  if (n.includes('reject')) return 'bg-rose-50 text-rose-700'
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
}) {
  const activeCount = data.summary.jobsAssigned || data.assignments.length || 0
  const pendingApprovalCount = data.activities.filter((a: any) =>
    ['pending', 'submitted'].includes((a.status || '').toLowerCase())
  ).length

  return (
    <div className="space-y-4 pb-6">
      {submitted ? (
        <section className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-sm font-bold">
              {submittedSpl ? 'Submitted, waiting approval' : 'Daily Activity berhasil disubmit'}
            </p>
            <p className="mt-1 text-xs text-emerald-700">
              {submittedSpl
                ? 'SPL dan Activity sudah disubmit. Menunggu keputusan approver.'
                : 'Data pekerjaan dan evidence sudah tersimpan.'}
            </p>
          </div>
        </section>
      ) : null}

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
              <div className="space-y-2.5">
                {data.activities.map((act: any) => {
                  const statusLower = (act.status || '').toLowerCase()
                  const isReverted = ['reverted', 'returned', 'needs_revision'].some((s) => statusLower.includes(s))
                  const isRejected = statusLower.includes('reject') || statusLower.includes('tolak')

                  return (
                    <div
                      key={act.id || act.sessionId}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-bold font-mono text-[11px] text-slate-500">
                            {act.activityCode || 'DAR-ACT'}
                          </span>
                          <p className="font-bold text-slate-800 mt-0.5">{act.label}</p>
                          <p className="text-[10.5px] text-slate-500">{act.unitNumber ? `Unit: ${act.unitNumber}` : 'General Activity'}</p>
                        </div>
                        <span
                          className={cn(
                            'rounded-md px-2 py-0.5 text-[10.5px] font-bold',
                            isRejected
                              ? 'bg-rose-100 text-rose-800'
                              : isReverted
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                          )}
                        >
                          {isRejected ? 'Ditolak' : isReverted ? 'Revisi Dokumen' : 'Menunggu Approval'}
                        </span>
                      </div>

                      <Button
                        asChild
                        className={cn(
                          'flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition active:scale-98',
                          isRejected
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : isReverted
                              ? 'bg-amber-600 hover:bg-amber-700'
                              : 'bg-[#003461] hover:bg-[#00274a]'
                        )}
                      >
                        <Link href={`/mobile/activity/document/${act.sessionId || act.id}/approval`}>
                          {isRejected ? 'DITOLAK' : isReverted ? 'REVISI DOKUMEN ↗' : 'BUKA TTD ↗'}
                          <ExternalLink className="size-3.5" />
                        </Link>
                      </Button>
                    </div>
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
    </div>
  )
}
