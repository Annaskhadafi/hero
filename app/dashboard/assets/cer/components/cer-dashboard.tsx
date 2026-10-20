'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  PlusCircle,
  PieChart,
  PackageCheck,
  CheckCircle2,
  Clock,
  Coins,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CerTable } from './cer-table'
import { CerFormWizard } from './cer-form-wizard'
import { CerBudgetControllerPanel } from './cer-budget-controller-panel'
import type { CerOverviewData } from '../actions'

export interface CerDashboardProps {
  data: CerOverviewData
}

export function CerDashboard({ data }: CerDashboardProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'requests' | 'create' | 'budget' | 'receiving'>('requests')

  const refreshData = () => {
    router.refresh()
  }

  // Calculate metrics
  const totalRequests = data.requests.length
  const pendingRequests = data.requests.filter(
    (r) => r.status === 'in_review' || r.status === 'need_revision'
  ).length
  const approvedRequests = data.requests.filter(
    (r) => r.status === 'full_approved' || r.status === 'received' || r.status === 'completed'
  ).length
  const completedBasts = data.requests.filter((r) => r.status === 'completed').length

  const totalCapexValue = data.requests.reduce((acc, curr) => {
    const val = Number(curr.totalEstimatedPrice) || 0
    return acc + val
  }, 0)

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Filter for Receiving & BAST Tab
  const receivingRequests = data.requests.filter((r) =>
    ['full_approved', 'received', 'completed'].includes(r.status)
  )

  return (
    <div className="space-y-6">
      {/* HEADER & METRICS */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Pengadaan Aset (CER)
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Capital Expenditure Request, Budget Controller, Tracking Approval, dan Berita Acara Serah Terima (BAST).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            className="h-9 gap-1.5 border-slate-200 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setActiveTab('create')}
            className="h-9 gap-1.5 bg-slate-900 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <PlusCircle className="h-4 w-4" />
            Buat Form CER
          </Button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <Card className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total CER</span>
            <span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-600">
              <FileText className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 font-display text-xl font-bold tracking-tight text-slate-900">{totalRequests}</p>
          <span className="mt-0.5 text-[10px] text-slate-400">Semua riwayat pengajuan</span>
        </Card>

        <Card className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Perlu Review</span>
            <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 font-display text-xl font-bold tracking-tight text-amber-600">{pendingRequests}</p>
          <span className="mt-0.5 text-[10px] text-amber-600/70">In Review / Revisi</span>
        </Card>

        <Card className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Disetujui</span>
            <span className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 font-display text-xl font-bold tracking-tight text-emerald-600">{approvedRequests}</p>
          <span className="mt-0.5 text-[10px] text-emerald-600/70">Full approved / Diterima</span>
        </Card>

        <Card className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">BAST Selesai</span>
            <span className="grid size-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
              <PackageCheck className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 font-display text-xl font-bold tracking-tight text-blue-600">{completedBasts}</p>
          <span className="mt-0.5 text-[10px] text-blue-600/70">Aset diserahterimakan</span>
        </Card>

        <Card className="col-span-2 rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm sm:col-span-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-600">Nilai Pengadaan</span>
            <span className="grid size-7 place-items-center rounded-lg bg-purple-50 text-purple-600">
              <Coins className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 truncate font-display text-lg font-bold tracking-tight text-purple-700">
            {formatRupiah(totalCapexValue)}
          </p>
          <span className="mt-0.5 text-[10px] text-purple-600/70">Akumulasi estimasi capex</span>
        </Card>
      </div>

      {/* TABS NAVIGATION */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
        <TabsList className="h-10 w-full justify-start rounded-lg border border-slate-200/80 bg-slate-100/80 p-1 text-slate-600">
          <TabsTrigger
            value="requests"
            className="gap-2 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <FileText className="h-3.5 w-3.5" />
            Daftar Pengajuan
            <Badge className="ml-1 rounded-full border-0 bg-slate-200 text-[10px] text-slate-700">
              {data.requests.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="create"
            className="gap-2 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <PlusCircle className="h-3.5 w-3.5 text-blue-600" />
            Buat Form CER
          </TabsTrigger>

          <TabsTrigger
            value="budget"
            className="gap-2 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <PieChart className="h-3.5 w-3.5 text-emerald-600" />
            Budget Controller
            <Badge className="ml-1 rounded-full border-0 bg-emerald-100 text-[10px] text-emerald-800">
              {data.budgets.length} Pos
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="receiving"
            className="gap-2 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <PackageCheck className="h-3.5 w-3.5 text-purple-600" />
            Penerimaan & BAST
            <Badge className="ml-1 rounded-full border-0 bg-purple-100 text-[10px] text-purple-800">
              {receivingRequests.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ALL REQUESTS */}
        <TabsContent value="requests" className="space-y-4">
          <CerTable
            requests={data.requests}
            currentEmployee={data.currentEmployee}
            onRefresh={refreshData}
          />
        </TabsContent>

        {/* TAB 2: WIZARD FORM */}
        <TabsContent value="create" className="space-y-4">
          <CerFormWizard
            sites={data.sites}
            departments={data.departments}
            sections={data.sections}
            currentEmployee={data.currentEmployee}
            onSuccess={() => {
              setActiveTab('requests')
              refreshData()
            }}
          />
        </TabsContent>

        {/* TAB 3: BUDGET CONTROLLER */}
        <TabsContent value="budget" className="space-y-4">
          <CerBudgetControllerPanel
            budgets={data.budgets}
            sites={data.sites}
            departments={data.departments}
            onRefresh={refreshData}
          />
        </TabsContent>

        {/* TAB 4: RECEIVING & BAST FOCUSED */}
        <TabsContent value="receiving" className="space-y-4">
          <div className="rounded-xl border border-purple-200/80 bg-purple-50/60 p-4">
            <div className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-purple-600 text-white">
                <PackageCheck className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-purple-950">Workspace Penerimaan Fisik & BAST Aset</h3>
                <p className="mt-0.5 text-xs text-purple-800/80">
                  Daftar pengajuan CER yang telah Full Approved dan siap/sedang dalam tahap penerimaan fisik barang oleh
                  PIC lokasi, pendaftaran inventaris aset, pencetakan stiker QR code, dan penerbitan Berita Acara Serah Terima (BAST).
                </p>
              </div>
            </div>
          </div>

          <CerTable
            requests={receivingRequests}
            currentEmployee={data.currentEmployee}
            onRefresh={refreshData}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
