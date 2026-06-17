'use client'

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, TableProperties, Activity } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminMetricGrid } from "@/components/admin-metric-grid"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MinimalTableShell } from "@/components/ui/minimal-table-shell"
import { SioCertificationTable } from "@/components/sio-certification-table"
import { SioCreateDialog, SioEditDialog } from "@/components/sio-certification-dialogs"
import { SioDashboardSection } from "@/components/sio-certification-dashboard"
import { SioImportDialog } from "@/components/sio-certification-import"

interface EmployeeOption {
  id: number
  name: string
  employeeSn: string | null
  department: string | null
  section: string | null
}

interface SioRow {
  id: number
  employeeId: number
  employeeName: string | null
  employeeSn: string | null
  role: string | null
  department: string | null
  section: string | null
  certType: string
  certNumber: string | null
  certName: string
  issuingBody: string | null
  certDate: Date | string | null
  expiryDate: Date | string | null
  status: string
  notes: string | null
  lastSyncFrom: string | null
}

interface DashboardAgg {
  totalRecords: number
  activeCount: number
  expiringCount: number
  expiredCount: number
  certTypeDistribution: { type: string; count: number }[]
  departmentCoverage: { name: string; count: number; employees: number }[]
  expiringSoonList: { employeeName: string; certName: string; certType: string; daysLeft: number }[]
  expiredList: { employeeName: string; certName: string; certType: string; daysOverdue: number }[]
}

export function SioDatabaseTab({
  rows,
  employees,
  agg,
}: {
  rows: SioRow[]
  employees: EmployeeOption[]
  agg: DashboardAgg
}) {
  const router = useRouter()
  const [editRow, setEditRow] = useState<SioRow | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const handleRefresh = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <Tabs defaultValue="workspace" className="space-y-5">
      <TabsList className="bg-surface-container-low/50">
        <TabsTrigger value="workspace" className="flex items-center gap-1.5">
          <TableProperties className="size-4" />
          Workspace
        </TabsTrigger>
        <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
          <Activity className="size-4 text-primary" />
          Dashboard
        </TabsTrigger>
      </TabsList>

      <TabsContent value="workspace" className="space-y-5 outline-none">
        <AdminMetricGrid
          mode="compact"
          items={[
            { label: "Sertifikat SIO/POP", value: `${agg.totalRecords}`, meta: "Total seluruh sertifikat" },
            { label: "Aktif", value: `${agg.activeCount}`, meta: "Masih berlaku" },
            { label: "Segera expired", value: `${agg.expiringCount}`, meta: "≤ 30 hari" },
            { label: "Expired", value: `${agg.expiredCount}`, meta: "Habis masa berlaku" },
          ]}
        />

        <Card className="rounded-[1.2rem] border-0 bg-surface-container-lowest shadow-[0_18px_42px_rgba(8,32,51,0.08)]">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-xl text-foreground font-semibold">
              <ShieldCheck className="size-5 text-primary" />
              Database Sertifikasi SIO / POP / POM
            </CardTitle>
            <CardDescription>
              Kelola sertifikasi SIO, POP, dan POM karyawan. Import dari Excel, tambah manual, dan pantau expiry.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <MinimalTableShell
              label="sio certifications"
              fileName="sio-certifications"
              searchPlaceholder="Cari nama, sertifikat, tipe..."
              dateFilter={false}
              showImport={false}
              summaryClassName="bg-transparent px-1 py-0 shadow-none"
              actions={
                <div className="flex items-center gap-2">
                  <SioCreateDialog employees={employees} onSuccess={handleRefresh} />
                  <SioImportDialog onSuccess={handleRefresh} />
                </div>
              }
            >
              <SioCertificationTable
                rows={rows}
                onEdit={(row) => { setEditRow(row); setEditOpen(true) }}
                onDelete={(row) => { setEditRow(row); setEditOpen(true) }}
              />
            </MinimalTableShell>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="dashboard" className="space-y-5 outline-none">
        <SioDashboardSection agg={agg} />
      </TabsContent>

      <SioEditDialog
        row={editRow}
        employees={employees}
        onSuccess={handleRefresh}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </Tabs>
  )
}
