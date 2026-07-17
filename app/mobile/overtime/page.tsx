import { redirect } from 'next/navigation'
import { CheckCheck, Clock3, History, PlusCircle } from 'lucide-react'

import { submitMobileOvertimeRequestAction } from '@/app/dashboard/activity-hub/actions'
import { MobileApprovalCenter } from '@/components/mobile/mobile-approval-center'
import { MobileOvertimeRequestForm } from '@/components/mobile/mobile-overtime-request-form'
import { MobileSplHistory, type MobileSplHistoryRow } from '@/components/mobile/mobile-spl-history'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getApprovalCenterData } from '@/lib/approval-workspace'
import { getServerSession } from '@/lib/auth-session'
import { getOvertimeRequestWorkspaceData } from '@/lib/overtime-request-data'

export default async function MobileOvertimePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; extend?: string }>
}) {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const [data, approvals, query] = await Promise.all([
    getOvertimeRequestWorkspaceData(session.user.email),
    getApprovalCenterData(session.user.email),
    searchParams,
  ])
  if (!data) return null

  const parentSplId = Number(query.extend ?? 0) || undefined
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
  const libraryActivities = data.splOptions.libraryActivities
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
          <Badge className="border-0 bg-[#eaf4fb] text-[#003f78]">{historyRows.length} SPL</Badge>
        </div>
        <p className="text-sm leading-6 font-semibold text-[#486275]">
          Ajukan, approve, lengkapi evidence, dan cek history tanpa membuka desktop.
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
          <TabsTrigger value="apply" className="min-h-12 rounded-xl px-1 text-[10px]">
            <PlusCircle className="size-4" />
            Ajukan
          </TabsTrigger>
          <TabsTrigger value="approval" className="min-h-12 rounded-xl px-1 text-[10px]">
            <CheckCheck className="size-4" />
            Perlu Approval
          </TabsTrigger>
          <TabsTrigger value="active" className="min-h-12 rounded-xl px-1 text-[10px]">
            <Clock3 className="size-4" />
            SPL Aktif
          </TabsTrigger>
          <TabsTrigger value="history" className="min-h-12 rounded-xl px-1 text-[10px]">
            <History className="size-4" />
            Riwayat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="apply" className="mt-4 space-y-4">
          <section className="rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)]">
            <p className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
              {parentSplId ? 'Extension' : 'Pengajuan Saya'}
            </p>
            <p className="mt-1 text-sm leading-6 font-semibold text-[#486275]">
              Isi detail SPL, lalu kirim.
            </p>
            <div className="mt-4">
              <MobileOvertimeRequestForm
                action={submitMobileOvertimeRequestAction}
                submitLabel="Ajukan SPL"
                currentEmployeeId={data.lead.id}
                parentSplId={parentSplId}
                libraryActivities={libraryActivities}
              />
            </div>
          </section>
        </TabsContent>

        <TabsContent value="approval" className="mt-4">
          <MobileApprovalCenter data={approvals} />
        </TabsContent>
        <TabsContent value="active" className="mt-4">
          <MobileSplHistory rows={historyRows} activeOnly />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <MobileSplHistory rows={historyRows} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
