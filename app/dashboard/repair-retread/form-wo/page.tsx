import { Suspense } from "react"
import { ClipboardList, FileText, Loader2, Wrench } from "lucide-react"

import { getFormWoList, getFormWoStats, getWaitingWoFromApi } from "@/app/actions/form-wo"
import { getMasterDataCaiList } from "@/app/actions/master-data-cai"
import { getCustomersAction } from "@/app/actions/customer-management"
import { getRepairMasterPriceList } from "@/app/actions/master-price-repair-retread"
import { getCurrentMenuPermission } from "@/lib/hero-access"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormWoClient } from "./_components/form-wo-client"

async function FormWoContent() {
  const [waitingWoList, formWoList, stats, masterCaiList, customerRes, masterPriceList, permission] = await Promise.all([
    getWaitingWoFromApi().catch(() => []),
    getFormWoList().catch(() => []),
    getFormWoStats().catch(() => ({ total: 0, pending: 0, diproses: 0, approved: 0, rejected: 0 })),
    getMasterDataCaiList().catch(() => []),
    getCustomersAction({ limit: 1000 }).catch(() => ({ success: false, data: [] })),
    getRepairMasterPriceList().catch(() => []),
    getCurrentMenuPermission("repair_form_wo"),
  ])

  if (!permission.canView) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }

  const customerList = customerRes && customerRes.success && Array.isArray(customerRes.data) ? customerRes.data : []

  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription>Waiting WO</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {waitingWoList.length.toLocaleString("id-ID")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Unit yang menunggu terbitnya Work Order dari One Chitra.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription>Total Pengajuan</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {stats.total.toLocaleString("id-ID")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Total Form WO yang sudah diajukan.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription>Pending / Diproses</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {stats.pending.toLocaleString("id-ID")} / {stats.diproses.toLocaleString("id-ID")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Pengajuan menunggu review dan sedang dalam proses.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription>Approved / Rejected</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {stats.approved.toLocaleString("id-ID")} / {stats.rejected.toLocaleString("id-ID")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Pengajuan yang sudah disetujui atau ditolak.
            </p>
          </CardContent>
        </Card>
      </div>

      <FormWoClient
        waitingWoList={waitingWoList}
        formWoList={formWoList}
        masterCaiList={masterCaiList}
        customerList={customerList}
        masterPriceList={masterPriceList}
        canEdit={permission.canEdit}
        canDelete={permission.canDelete}
      />
    </>
  )
}

export default function FormWoPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
          <FileText className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Repair &amp; Retread Operation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight [text-wrap:balance]">Form WO</h1>
          <p className="max-w-3xl text-sm text-muted-foreground [text-wrap:pretty]">
            Pengajuan Work Order untuk unit yang masih berstatus &ldquo;Waiting WO&rdquo; pada sistem One Chitra.
            Ajukan permintaan penerbitan WO dan pantau status pengajuannya.
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Memuat data Form WO...</span>
          </div>
        }
      >
        <FormWoContent />
      </Suspense>
    </div>
  )
}
