import { redirect } from 'next/navigation'
import { CheckCheck, Clock3, History, PlusCircle } from 'lucide-react'

import { db } from '@/db'
import { employees, masterDepartments, masterSections, sites } from '@/db/schema/hero'
import { asc, eq } from 'drizzle-orm'
import { MobileApprovalCenter } from '@/components/mobile/mobile-approval-center'
import { MobileOvertimeRequestForm } from '@/components/mobile/mobile-overtime-request-form'
import { MobileSplHistory, type MobileSplHistoryRow } from '@/components/mobile/mobile-spl-history'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getOvertimeApprovalData } from '@/app/dashboard/overtime-requests/actions'
import { getApprovalCenterData } from '@/lib/approval-workspace'
import { getServerSession } from '@/lib/auth-session'
import { getOvertimeRequestWorkspaceData } from '@/lib/overtime-request-data'

async function withDbRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 300): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (err: any) {
      attempt++
      const errStr = String(err?.message || err?.cause?.message || err || '').toLowerCase()
      const isNetworkError =
        err?.code === 'ECONNRESET' ||
        err?.code === '53300' ||
        errStr.includes('econnreset') ||
        errStr.includes('connection terminated') ||
        errStr.includes('timeout exceeded') ||
        errStr.includes('trying to connect') ||
        errStr.includes('too many clients') ||
        errStr.includes('sorry, too many clients') ||
        errStr.includes('connection reset') ||
        errStr.includes('remaining connection slots are reserved')
      if (attempt <= retries && isNetworkError) {
        await new Promise((res) => setTimeout(res, delayMs * attempt))
        continue
      }
      throw err
    }
  }
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await withDbRetry(fn)
  } catch (err) {
    console.warn(`[MobileOvertimePage] Warning in ${label}:`, (err as any)?.message || err)
    return fallback
  }
}

export default async function MobileOvertimePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; extend?: string }>
}) {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const query = await searchParams

  // Sequence workspace data and approval data gently with retry protection
  const data = await safeQuery(
    () => getOvertimeRequestWorkspaceData(session.user.email),
    null,
    'getOvertimeRequestWorkspaceData'
  )
  if (!data) return null

  const [approvals, activeEmployees, rawSections, rawDepartments, rawSites] = await Promise.all([
    safeQuery(
      () => getApprovalCenterData(session.user.email),
      null,
      'getApprovalCenterData'
    ),
    safeQuery(
      () =>
        db
          .select({
            id: employees.id,
            name: employees.name,
            email: employees.email,
            employeeId: employees.employeeSn,
            position: employees.jobTitle,
            department: employees.department,
            section: employees.section,
            directManagerId: employees.directManagerId,
            sectionId: employees.sectionId,
            departmentId: employees.departmentId,
            siteId: employees.siteId,
          })
          .from(employees)
          .where(eq(employees.isActive, true))
          .orderBy(asc(employees.name)),
      [],
      'getActiveEmployees'
    ),
    safeQuery(
      () =>
        db
          .select({ id: masterSections.id, name: masterSections.name, headEmployeeId: masterSections.headEmployeeId })
          .from(masterSections),
      [],
      'masterSections'
    ),
    safeQuery(
      () =>
        db
          .select({ id: masterDepartments.id, name: masterDepartments.name, headEmployeeId: masterDepartments.headEmployeeId })
          .from(masterDepartments),
      [],
      'masterDepartments'
    ),
    safeQuery(
      () =>
        db
          .select({ id: sites.id, name: sites.name, headEmployeeId: sites.headEmployeeId })
          .from(sites),
      [],
      'sites'
    ),
  ])

  const sectionHeadById = new Map(rawSections.map((s) => [s.id, s.headEmployeeId]))
  const sectionHeadByName = new Map(rawSections.map((s) => [s.name.toLowerCase().trim(), s.headEmployeeId]))
  const deptHeadById = new Map(rawDepartments.map((d) => [d.id, d.headEmployeeId]))
  const deptHeadByName = new Map(rawDepartments.map((d) => [d.name.toLowerCase().trim(), d.headEmployeeId]))
  const siteHeadById = new Map(rawSites.map((s) => [s.id, s.headEmployeeId]))

  const sanitizedEmployees = (activeEmployees || []).map((e) => ({
    id: Number(e.id),
    name: e.name || '',
    email: e.email || '',
    employeeId: e.employeeId || '',
    position: e.position || '',
    department: e.department || '',
    section: e.section || '',
    directManagerId: e.directManagerId ? Number(e.directManagerId) : null,
    sectionId: e.sectionId ? Number(e.sectionId) : null,
    departmentId: e.departmentId ? Number(e.departmentId) : null,
    siteId: e.siteId ? Number(e.siteId) : null,
    sectionHeadId: e.sectionId ? (sectionHeadById.get(e.sectionId) ?? null) : (e.section ? (sectionHeadByName.get(e.section.toLowerCase().trim()) ?? null) : null),
    deptHeadId: e.departmentId ? (deptHeadById.get(e.departmentId) ?? null) : (e.department ? (deptHeadByName.get(e.department.toLowerCase().trim()) ?? null) : null),
    siteHeadId: e.siteId ? (siteHeadById.get(e.siteId) ?? null) : null,
  }))

  const parentSplId = Number(query.extend ?? 0) || undefined
  const initialSplData = parentSplId ? await safeQuery(() => getOvertimeApprovalData(parentSplId), null, "getOvertimeApprovalData") : null
  const historyRows: MobileSplHistoryRow[] = data.splDocuments.map((document) => ({
    id: document.id,
    splNumber: document.splNumber,
    title: document.title,
    workDate: document.workDate.toISOString(),
    status: document.status.toLowerCase(),
    origin: document.origin,
    pendingApproverName: document.pendingApproverName,
    workerNames: document.workers.map((worker) => worker.employeeName),
    progressPercent: document.progressPercent,
    lineCount: document.lineCount,
  }))

  const safeApprovals = approvals ?? {
    currentUserName: session.user.name || session.user.email,
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

  const pendingSplCount = (safeApprovals.overtimeInboxItems || []).length
  const activeSplCount = (historyRows || []).filter((r) => ['approved', 'submitted'].includes(r.status)).length

  return (
    <div className="space-y-5 pb-24">
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black tracking-[0.24em] text-[#486275] uppercase">
              Surat Perintah Lembur
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">SPL Mobile</h1>
          </div>
          <Badge className="border-0 bg-[#eaf4fb] text-[#003f78] font-bold text-xs">{historyRows.length} SPL</Badge>
        </div>
        <p className="text-sm leading-6 font-semibold text-[#486275]">
          Ajukan, approve, pantau lembur aktif, dan kelola riwayat SPL tanpa membuka desktop.
        </p>
      </section>

      <Tabs
        defaultValue={
          query.tab === 'approval'
            ? 'approval'
            : query.tab === 'active'
              ? 'active'
              : query.tab === 'history'
                ? 'history'
                : 'apply'
        }
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
              {pendingSplCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex size-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white ring-2 ring-white animate-pulse">
                  {pendingSplCount}
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
              {activeSplCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-white ring-2 ring-white">
                  {activeSplCount}
                </span>
              )}
            </div>
            <span>SPL Aktif</span>
          </TabsTrigger>

          <TabsTrigger
            value="history"
            className="min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-bold text-slate-600 transition-all data-[state=active]:bg-[#003461] data-[state=active]:text-white data-[state=active]:shadow-xs"
          >
            <History className="size-4 shrink-0" />
            <span>Riwayat</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apply" className="mt-4 space-y-4">
          <section className="rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)] border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <p className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                  {parentSplId ? 'Extension & Revisi' : 'Pengajuan Lembur'}
                </p>
                <h2 className="mt-0.5 text-base font-extrabold text-[#003461]">
                  {parentSplId ? `Revisi / Perpanjangan SPL #${parentSplId}` : 'Formulir Surat Lembur (SPL)'}
                </h2>
              </div>
              <Badge className="border-0 bg-blue-50 text-blue-700 font-bold text-[10px]">
                {parentSplId ? 'Mode Extension' : 'SPL Baru'}
              </Badge>
            </div>
            <p className="mt-2 text-xs leading-5 font-medium text-[#486275]">
              Isi formulir resmi SPL, tentukan peserta lembur, uraian aktivitas, dan verifikasi persetujuan pengawas.
            </p>
            <div className="mt-4">
              <MobileOvertimeRequestForm
                employees={sanitizedEmployees}
                currentEmployee={{
                  id: data.lead.id,
                  name: data.lead.name,
                  department: data.lead.department || undefined,
                  directManagerId: (data.lead as any).directManagerId ?? null,
                }}
                parentSplId={parentSplId}
                initialSplData={initialSplData}
              />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="approval" className="mt-4 space-y-4">
          <div className="rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)] border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <div>
                <p className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                  Pusat Persetujuan Mobile
                </p>
                <h2 className="mt-0.5 text-base font-extrabold text-[#003461]">
                  Persetujuan Lembur & Aktivitas
                </h2>
              </div>
              {pendingSplCount > 0 ? (
                <Badge className="border-0 bg-rose-100 text-rose-900 font-bold text-[10px]">
                  {pendingSplCount} Perlu Ditinjau
                </Badge>
              ) : (
                <Badge className="border-0 bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                  Semua Bersih
                </Badge>
              )}
            </div>
            <MobileApprovalCenter data={safeApprovals} categoryFilter="OVERTIME" hideHeader />
          </div>
        </TabsContent>

        <TabsContent value="active" className="mt-4 space-y-4">
          <div className="rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)] border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <div>
                <p className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                  Monitoring Lembur
                </p>
                <h2 className="mt-0.5 text-base font-extrabold text-[#003461]">
                  Daftar SPL Aktif Hari Ini
                </h2>
              </div>
              <Badge className="border-0 bg-amber-50 text-amber-800 font-bold text-[10px]">
                {activeSplCount} Berjalan
              </Badge>
            </div>
            <MobileSplHistory rows={historyRows} activeOnly />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)] border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <div>
                <p className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
                  Arsip & Rekap
                </p>
                <h2 className="mt-0.5 text-base font-extrabold text-[#003461]">
                  Riwayat Seluruh SPL
                </h2>
              </div>
              <Badge className="border-0 bg-slate-100 text-slate-700 font-bold text-[10px]">
                {historyRows.length} Total
              </Badge>
            </div>
            <MobileSplHistory rows={historyRows} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
