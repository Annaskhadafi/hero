'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileText,
  PlusCircle,
  PackageCheck,
  CheckCircle2,
  Clock,
  Coins,
  RefreshCw,
  TrendingUp,
  Layers,
  UserCheck,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CerTable } from './cer-table'
import { CerFormDialog } from './cer-form-dialog'
import type { CerOverviewData } from '../actions'

export type CerTabKey = 'my_requests' | 'all_requests'

export interface CerDashboardProps {
  data: CerOverviewData
  defaultTab?: CerTabKey | string
}

export function CerDashboard({ data, defaultTab = 'my_requests' }: CerDashboardProps) {
  const router = useRouter()
  const initialTab = defaultTab === 'all_requests' ? 'all_requests' : 'my_requests'
  const [activeTab, setActiveTab] = useState<'my_requests' | 'all_requests'>(initialTab)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

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

  // Tab 1: Semua CER di HERO (Seluruh pengajuan lintas pemohon untuk view umum & tracking)
  const allRequests = data.requests

  // Tab 2: Daftar Pengajuan Saya (Pengajuan milik user yang login atau pending approval/co-approval pada dirinya)
  const myRequests = data.requests.filter((r) => {
    if (!data.currentEmployee) return true
    const isMine =
      r.applicantEmployeeId === data.currentEmployee.id ||
      (data.currentEmployee.email && r.applicantEmail === data.currentEmployee.email)

    const isFreshya = Boolean(
      data.currentEmployee?.id === 974 ||
      data.currentEmployee?.email?.toLowerCase().includes('freshya')
    )
    const isEvoDwi = Boolean(
      data.currentEmployee?.id === 1006 ||
      data.currentEmployee?.email?.toLowerCase().includes('evo')
    )

    const isPendingOnMe = r.approvals?.some((a) => {
      if (a.status !== 'Pending') return false
      const nameMatches =
        Boolean(data.currentEmployee?.name && a.approverName.toLowerCase().includes(data.currentEmployee.name.toLowerCase()))
      const idMatches = a.approverEmployeeId === data.currentEmployee?.id
      const freshyaCoApprove =
        isFreshya &&
        (a.approverName.toLowerCase().includes('director') ||
          a.approverName.toLowerCase().includes('hidayat') ||
          (a.decisionNote && a.decisionNote.toLowerCase().includes('director')))
      const evoDwiCoApprove =
        isEvoDwi &&
        (a.approverName.toLowerCase().includes('syamsul') ||
          (a.decisionNote && (a.decisionNote.toLowerCase().includes('tagging') || a.decisionNote.toLowerCase().includes('nomor aset'))))
      return nameMatches || idMatches || freshyaCoApprove || evoDwiCoApprove
    })
    return isMine || isPendingOnMe
  })

  return (
    <div className="space-y-6">
      {/* HEADER & METRICS */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Pengadaan Aset (CER)
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            Capital Expenditure Request, Tracking Approval, dan Berita Acara Serah Terima (BAST).
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
            onClick={() => setIsCreateOpen(true)}
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
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Pengajuan</span>
            <span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-600">
              <FileText className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 font-display text-xl font-bold tracking-tight text-slate-900">{totalRequests}</p>
          <span className="mt-0.5 text-[10px] text-slate-400">Semua riwayat pengajuan</span>
        </Card>

        <Card className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-600">Pending Review</span>
            <span className="grid size-7 place-items-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 font-display text-xl font-bold tracking-tight text-amber-600">{pendingRequests}</p>
          <span className="mt-0.5 text-[10px] text-amber-600/70">Menunggu persetujuan</span>
        </Card>

        <Card className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Full Approved</span>
            <span className="grid size-7 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-3.5" />
            </span>
          </div>
          <p className="mt-2 font-display text-xl font-bold tracking-tight text-emerald-600">{approvedRequests}</p>
          <span className="mt-0.5 text-[10px] text-emerald-600/70">Disetujui direksi</span>
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
            value="my_requests"
            className="gap-2 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
            Daftar Pengajuan Saya
            <Badge className="ml-1 rounded-full border-0 bg-emerald-100 text-[10px] text-emerald-800">
              {myRequests.length}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="all_requests"
            className="gap-2 rounded-md px-3 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            <Layers className="h-3.5 w-3.5 text-blue-600" />
            Daftar Pengajuan
            <Badge className="ml-1 rounded-full border-0 bg-blue-100 text-[10px] text-blue-800">
              {allRequests.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: MY REQUESTS (PENGAJUAN SAYA DENGAN ACTION ALUR KERJA LENGKAP & BAST) */}
        <TabsContent value="my_requests" className="space-y-4">
          <CerTable
            requests={myRequests}
            mode="my_requests"
            currentEmployee={data.currentEmployee}
            isFinanceOrAdmin={data.isFinanceOrAdmin}
            sites={data.sites}
            departments={data.departments}
            sections={data.sections}
            onRefresh={refreshData}
          />
        </TabsContent>

        {/* TAB 2: ALL REQUESTS (VIEW UNIFORM SEMUA CER HERO TANPA KOLOM AKSI) */}
        <TabsContent value="all_requests" className="space-y-4">
          <CerTable
            requests={allRequests}
            mode="all_requests"
            currentEmployee={data.currentEmployee}
            isFinanceOrAdmin={data.isFinanceOrAdmin}
            sites={data.sites}
            departments={data.departments}
            sections={data.sections}
            onRefresh={refreshData}
          />
        </TabsContent>
      </Tabs>

      {/* POP-UP MODAL FORM CER */}
      <CerFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        sites={data.sites}
        departments={data.departments}
        sections={data.sections}
        currentEmployee={data.currentEmployee}
        onSuccess={() => {
          setIsCreateOpen(false)
          refreshData()
        }}
      />
    </div>
  )
}
