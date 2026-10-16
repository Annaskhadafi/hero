'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  FileText,
  FileWarning,
  Flame,
  HardHat,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { HeroSearchableSelect, HeroKpiCard, type HeroSearchableSelectOption } from '@/components/templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SafetyDashboardCharts } from '@/components/safety-dashboard/safety-dashboard-charts'
import type {
  MaestroSafetyData,
  MaestroPtwItem,
  MaestroObservationItem,
  MaestroJsaItem,
} from '@/app/actions/maestro-safety'

interface Props {
  initialData: MaestroSafetyData
  customerUser: {
    id: string
    name: string
    email: string
  }
  currentSiteId: string
}

function formatNumber(value: unknown) {
  const parsed = Number(value ?? 0)
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(
    Number.isFinite(parsed) ? parsed : 0,
  )
}

export function MaestroClientSafety({ initialData, customerUser, currentSiteId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [activeTab, setActiveTab] = useState<'overview' | 'ptw' | 'observations' | 'jsa'>('overview')
  const [selectedSite, setSelectedSite] = useState<string>(currentSiteId || 'all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Modal Detail States
  const [selectedPtw, setSelectedPtw] = useState<MaestroPtwItem | null>(null)
  const [selectedObs, setSelectedObs] = useState<MaestroObservationItem | null>(null)
  const [selectedJsa, setSelectedJsa] = useState<MaestroJsaItem | null>(null)

  // Filtered PTW
  const filteredPtw = useMemo(() => {
    return initialData.ptwList.filter((ptw) => {
      const matchSite =
        selectedSite === 'all' ||
        !selectedSite ||
        String(ptw.siteId) === selectedSite ||
        ptw.siteName.toLowerCase().includes(selectedSite.toLowerCase())

      const matchStatus =
        selectedStatus === 'all' ||
        !selectedStatus ||
        ptw.status.toLowerCase() === selectedStatus.toLowerCase()

      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        ptw.permitNumber.toLowerCase().includes(q) ||
        ptw.projectName.toLowerCase().includes(q) ||
        ptw.permitType.toLowerCase().includes(q) ||
        ptw.location.toLowerCase().includes(q) ||
        ptw.applicantName.toLowerCase().includes(q)

      return matchSite && matchStatus && matchSearch
    })
  }, [initialData.ptwList, selectedSite, selectedStatus, searchQuery])

  // Filtered Observations
  const filteredObs = useMemo(() => {
    return initialData.observations.filter((obs) => {
      const matchSite =
        selectedSite === 'all' ||
        !selectedSite ||
        String(obs.siteId) === selectedSite ||
        obs.siteName.toLowerCase().includes(selectedSite.toLowerCase())

      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        obs.title.toLowerCase().includes(q) ||
        obs.category.toLowerCase().includes(q) ||
        obs.location.toLowerCase().includes(q) ||
        obs.notes.toLowerCase().includes(q)

      return matchSite && matchSearch
    })
  }, [initialData.observations, selectedSite, searchQuery])

  // Filtered JSA
  const filteredJsa = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return initialData.jsaList
    return initialData.jsaList.filter(
      (j) =>
        j.jsaNumber.toLowerCase().includes(q) ||
        j.jobDescription.toLowerCase().includes(q) ||
        j.equipmentNumber.toLowerCase().includes(q),
    )
  }, [initialData.jsaList, searchQuery])

  // PTW Sorting
  const [ptwSortField, setPtwSortField] = useState<string>('permitNumber')
  const [ptwSortDir, setPtwSortDir] = useState<'asc' | 'desc'>('asc')

  const handlePtwSort = (field: string) => {
    if (ptwSortField === field) {
      setPtwSortDir(ptwSortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setPtwSortField(field)
      setPtwSortDir('asc')
    }
  }

  const sortedPtw = useMemo(() => {
    return [...filteredPtw].sort((a, b) => {
      let aVal: any = a[ptwSortField as keyof MaestroPtwItem]
      let bVal: any = b[ptwSortField as keyof MaestroPtwItem]
      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal || '')
        return ptwSortDir === 'asc' ? cmp : -cmp
      }
      return 0
    })
  }, [filteredPtw, ptwSortField, ptwSortDir])

  // Observation Sorting
  const [obsSortField, setObsSortField] = useState<string>('title')
  const [obsSortDir, setObsSortDir] = useState<'asc' | 'desc'>('asc')

  const handleObsSort = (field: string) => {
    if (obsSortField === field) {
      setObsSortDir(obsSortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setObsSortField(field)
      setObsSortDir('asc')
    }
  }

  const sortedObs = useMemo(() => {
    return [...filteredObs].sort((a, b) => {
      let aVal: any = a[obsSortField as keyof MaestroObservationItem]
      let bVal: any = b[obsSortField as keyof MaestroObservationItem]
      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal || '')
        return obsSortDir === 'asc' ? cmp : -cmp
      }
      return 0
    })
  }, [filteredObs, obsSortField, obsSortDir])

  // JSA Sorting
  const [jsaSortField, setJsaSortField] = useState<string>('jsaNumber')
  const [jsaSortDir, setJsaSortDir] = useState<'asc' | 'desc'>('asc')

  const handleJsaSort = (field: string) => {
    if (jsaSortField === field) {
      setJsaSortDir(jsaSortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setJsaSortField(field)
      setJsaSortDir('asc')
    }
  }

  const sortedJsa = useMemo(() => {
    return [...filteredJsa].sort((a, b) => {
      let aVal: any = a[jsaSortField as keyof MaestroJsaItem]
      let bVal: any = b[jsaSortField as keyof MaestroJsaItem]
      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal || '')
        return jsaSortDir === 'asc' ? cmp : -cmp
      }
      return 0
    })
  }, [filteredJsa, jsaSortField, jsaSortDir])

  // Options memos
  const siteOptions = useMemo<HeroSearchableSelectOption[]>(() => {
    return [
      { value: 'all', label: 'Semua Site' },
      ...initialData.sitesList.map((st) => ({
        value: String(st.id),
        label: st.name,
      })),
    ]
  }, [initialData.sitesList])

  const statusOptions: HeroSearchableSelectOption[] = [
    { value: 'all', label: 'Semua Status' },
    { value: 'Approved', label: 'Approved' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Completed', label: 'Completed' },
    { value: 'Draft', label: 'Draft' },
  ]

  function handleSiteChange(siteId: string) {
    setSelectedSite(siteId)
    const params = new URLSearchParams(searchParams.toString())
    if (siteId && siteId !== 'all') {
      params.set('siteId', siteId)
    } else {
      params.delete('siteId')
    }
    router.replace(`/safety?${params.toString()}`)
  }

  const { kpis } = initialData

  return (
    <div className="mx-auto w-full max-w-[1720px] px-4 pt-6 sm:px-6 lg:px-8 xl:px-12 space-y-6 text-slate-950 pb-20">
      {/* Top Header */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-white p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap text-xs font-bold text-slate-700">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-950 border border-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                HSE &amp; Zero Incident
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300">
                <MapPin className="h-3.5 w-3.5 text-blue-700" />
                {selectedSite === 'all' ? 'Semua Site Terpilih' : `Site #${selectedSite}`}
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
              Safety Management &amp; PTW
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-700 font-semibold">
              Pemantauan keselamatan kerja, izin kerja berisiko tinggi (PTW), hazard observations, dan JSA real-time.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.refresh()}
              className="h-10 gap-1.5 rounded-xl border-2 border-slate-300 bg-white px-4 text-xs font-bold text-slate-900 hover:bg-slate-100 shadow-2xs transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-700" />
              <span>Segarkan Data</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 5 Executive Safety Metric Cards (HeroKpiCard Standardized) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <HeroKpiCard
          title="Incident YTD"
          value={formatNumber(kpis.totalIncidentYtd)}
          unit="kejadian"
          icon={<FileWarning className="size-5" />}
          watermarkIcon={<FileWarning className="size-16" />}
          tone="amber"
          variant="colorful"
          description="Insiden tercatat tahun berjalan"
        />

        <HeroKpiCard
          title="Fatality"
          value={formatNumber(kpis.fatality)}
          unit="kasus"
          icon={<AlertTriangle className="size-5" />}
          watermarkIcon={<AlertTriangle className="size-16" />}
          tone={Number(kpis.fatality) > 0 ? 'rose' : 'emerald'}
          variant="colorful"
          badge={Number(kpis.fatality) === 0 ? 'Zero Fatality' : 'Critical'}
          description={Number(kpis.fatality) === 0 ? 'Target Zero Fatality tercapai' : 'Perlu investigasi darurat'}
        />

        <HeroKpiCard
          title="Safe Man Hours"
          value={formatNumber(kpis.safeManHours)}
          unit="jam"
          icon={<Clock className="size-5" />}
          watermarkIcon={<Clock className="size-16" />}
          tone="emerald"
          variant="colorful"
          description="Jam kerja selamat akumulatif"
        />

        <HeroKpiCard
          title="Expired Cert."
          value={formatNumber(kpis.certificationExpired)}
          unit="sertifikat"
          icon={<BadgeCheck className="size-5" />}
          watermarkIcon={<BadgeCheck className="size-16" />}
          tone={Number(kpis.certificationExpired) > 0 ? 'rose' : 'blue'}
          variant="colorful"
          badge={Number(kpis.certificationExpired) > 0 ? 'Perlu Renewal' : undefined}
          description="Sertifikasi personil aktif"
        />

        <HeroKpiCard
          title="Near Miss"
          value={formatNumber(kpis.nearMiss)}
          unit="laporan"
          icon={<ShieldCheck className="size-5" />}
          watermarkIcon={<ShieldCheck className="size-16" />}
          tone="cyan"
          variant="colorful"
          description="Laporan nearmiss terdata"
        />
      </div>

      {/* Filter Toolbar & Tab Switcher */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Pill Tab Switcher */}
          <div className="inline-flex rounded-xl bg-slate-200 p-1 self-start overflow-x-auto max-w-full border border-slate-300">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-black transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-800 hover:text-slate-950 hover:bg-slate-300'
              }`}
            >
              <BarChart3 className={`h-4 w-4 ${activeTab === 'overview' ? 'text-blue-100' : 'text-slate-600'}`} />
              <span>Overview &amp; Statistik K3</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ptw')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-black transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'ptw'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-800 hover:text-slate-950 hover:bg-slate-300'
              }`}
            >
              <FileCheck2 className={`h-4 w-4 ${activeTab === 'ptw' ? 'text-blue-100' : 'text-slate-600'}`} />
              <span>Izin Kerja (PTW)</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-black ${activeTab === 'ptw' ? 'bg-white text-blue-900' : 'bg-slate-300 text-slate-900'}`}>
                {initialData.ptwList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('observations')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-black transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'observations'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-800 hover:text-slate-950 hover:bg-slate-300'
              }`}
            >
              <Eye className={`h-4 w-4 ${activeTab === 'observations' ? 'text-blue-100' : 'text-slate-600'}`} />
              <span>Observasi Hazard</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-black ${activeTab === 'observations' ? 'bg-white text-blue-900' : 'bg-slate-300 text-slate-900'}`}>
                {initialData.observations.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('jsa')}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-black transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'jsa'
                  ? 'bg-blue-700 text-white shadow-sm'
                  : 'text-slate-800 hover:text-slate-950 hover:bg-slate-300'
              }`}
            >
              <HardHat className={`h-4 w-4 ${activeTab === 'jsa' ? 'text-blue-100' : 'text-slate-600'}`} />
              <span>Job Safety Analysis</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-black ${activeTab === 'jsa' ? 'bg-white text-blue-900' : 'bg-slate-300 text-slate-900'}`}>
                {initialData.jsaList.length}
              </span>
            </button>
          </div>

          {/* Site & Search Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="min-w-[180px]">
              <HeroSearchableSelect
                options={siteOptions}
                value={selectedSite}
                onChange={(val) => handleSiteChange(val || 'all')}
                placeholder="Pilih Site..."
                className="w-full h-9"
              />
            </div>

            {activeTab === 'ptw' && (
              <div className="min-w-[160px]">
                <HeroSearchableSelect
                  options={statusOptions}
                  value={selectedStatus}
                  onChange={(val) => setSelectedStatus(val || 'all')}
                  placeholder="Filter Status..."
                  className="w-full h-9"
                />
              </div>
            )}

            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 font-bold" />
              <Input
                placeholder="Cari data safety..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 rounded-xl bg-white border-2 border-slate-300 pl-9 pr-3 text-xs sm:text-sm font-bold text-slate-950 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 shadow-2xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tab 1: Overview & Safety Charts */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <SafetyDashboardCharts charts={initialData.charts} />
        </div>
      )}

      {/* Tab 2: PTW List */}
      {activeTab === 'ptw' && (
        <div className="rounded-2xl border-2 border-slate-300 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-900">
              <thead className="bg-slate-200/90 text-xs font-black uppercase tracking-wider text-slate-950 border-b-2 border-slate-300">
                <tr>
                  <th className="py-3.5 pl-6 pr-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-7 text-xs font-black hover:bg-transparent px-2 uppercase tracking-wider"
                      onClick={() => handlePtwSort('permitNumber')}
                    >
                      No. Permit &amp; Pekerjaan
                      {ptwSortField === 'permitNumber' ? (
                        ptwSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-3.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-7 text-xs font-black hover:bg-transparent px-2 uppercase tracking-wider"
                      onClick={() => handlePtwSort('permitType')}
                    >
                      Tipe Izin
                      {ptwSortField === 'permitType' ? (
                        ptwSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-3.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-7 text-xs font-black hover:bg-transparent px-2 uppercase tracking-wider"
                      onClick={() => handlePtwSort('siteName')}
                    >
                      Site / Lokasi
                      {ptwSortField === 'siteName' ? (
                        ptwSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-3.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-7 text-xs font-black hover:bg-transparent px-2 uppercase tracking-wider"
                      onClick={() => handlePtwSort('startAt')}
                    >
                      Masa Berlaku
                      {ptwSortField === 'startAt' ? (
                        ptwSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-3.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-7 text-xs font-black hover:bg-transparent px-2 uppercase tracking-wider"
                      onClick={() => handlePtwSort('riskLevel')}
                    >
                      Tingkat Risiko
                      {ptwSortField === 'riskLevel' ? (
                        ptwSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-3.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-7 text-xs font-black hover:bg-transparent px-2 uppercase tracking-wider"
                      onClick={() => handlePtwSort('status')}
                    >
                      Status
                      {ptwSortField === 'status' ? (
                        ptwSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-900">
                {sortedPtw.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm font-bold text-slate-700">
                      Tidak ada data Izin Kerja (PTW) yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  sortedPtw.map((ptw) => {
                    const riskStyle = getRiskBadgeStyle(ptw.riskLevel)
                    const statusStyle = getPtwStatusStyle(ptw.status)

                    return (
                      <tr key={ptw.id} className="hover:bg-blue-50/60 transition-colors">
                        <td className="py-4 pl-6 pr-4">
                          <p className="font-mono text-xs sm:text-sm font-black text-slate-950">{ptw.permitNumber}</p>
                          <p className="text-xs text-slate-700 font-semibold truncate max-w-xs sm:max-w-sm mt-0.5">
                            {ptw.projectName}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-950 border border-amber-400">
                            <Flame className="h-3.5 w-3.5 text-amber-700" />
                            {ptw.permitType}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-950">
                            <MapPin className="h-3.5 w-3.5 text-slate-700 shrink-0" />
                            <span className="font-black">{ptw.siteName}</span>
                          </div>
                          {ptw.location && (
                            <p className="text-xs text-slate-700 font-semibold pl-5">{ptw.location}</p>
                          )}
                        </td>
                        <td className="py-4 px-4 text-xs sm:text-sm text-slate-900 font-bold">
                          {ptw.startAt ? (
                            <div>
                              <span>{new Date(ptw.startAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                              {ptw.endAt && (
                                <span> - {new Date(ptw.endAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${riskStyle}`}>
                            {ptw.riskLevel || 'Normal'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${statusStyle}`}>
                            {ptw.status}
                          </span>
                        </td>
                        <td className="py-4 pl-4 pr-6 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPtw(ptw)}
                            className="h-9 px-3.5 rounded-xl border-2 border-slate-300 bg-white text-xs font-bold text-slate-900 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1 text-slate-700" />
                            Detail
                          </Button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Observation List */}
      {activeTab === 'observations' && (
        <div className="rounded-2xl border-2 border-slate-300 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-900">
              <thead className="bg-slate-200/90 text-xs font-black uppercase tracking-wider text-slate-950 border-b-2 border-slate-300">
                <tr>
                  <th className="py-3.5 pl-6 pr-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-7 text-xs font-black hover:bg-transparent px-2 uppercase tracking-wider"
                      onClick={() => handleObsSort('title')}
                    >
                      Judul &amp; Kategori
                      {obsSortField === 'title' ? (
                        obsSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-3.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-7 text-xs font-black hover:bg-transparent px-2 uppercase tracking-wider"
                      onClick={() => handleObsSort('siteName')}
                    >
                      Site / Area
                      {obsSortField === 'siteName' ? (
                        obsSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-3.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-7 text-xs font-black hover:bg-transparent px-2 uppercase tracking-wider"
                      onClick={() => handleObsSort('severity')}
                    >
                      Tipe Hazard
                      {obsSortField === 'severity' ? (
                        obsSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-3.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-7 text-xs font-black hover:bg-transparent px-2 uppercase tracking-wider"
                      onClick={() => handleObsSort('status')}
                    >
                      Status
                      {obsSortField === 'status' ? (
                        obsSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-3.5 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-7 text-xs font-black hover:bg-transparent px-2 uppercase tracking-wider"
                      onClick={() => handleObsSort('observedAt')}
                    >
                      Tanggal Lapor
                      {obsSortField === 'observedAt' ? (
                        obsSortDir === 'asc' ? <ArrowUp className="ml-1 h-3.5 w-3.5" /> : <ArrowDown className="ml-1 h-3.5 w-3.5" />
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/60" />
                      )}
                    </Button>
                  </th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-900">
                {sortedObs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm font-bold text-slate-700">
                      Tidak ada data Observasi Hazard yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  sortedObs.map((obs) => (
                    <tr key={obs.id} className="hover:bg-blue-50/60 transition-colors">
                      <td className="py-4 pl-6 pr-4">
                        <p className="font-black text-slate-950 text-sm">{obs.title}</p>
                        <p className="text-xs text-slate-700 font-semibold mt-0.5">{obs.category}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-950">
                          <MapPin className="h-3.5 w-3.5 text-slate-700 shrink-0" />
                          <span className="font-black">{obs.siteName}</span>
                        </div>
                        {obs.location && (
                          <p className="text-xs text-slate-700 font-semibold pl-5">{obs.location}</p>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-400 px-3 py-1 text-xs font-black text-amber-950">
                          {obs.severity || 'Normal'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${getPtwStatusStyle(obs.status)}`}>
                          {obs.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs sm:text-sm text-slate-900 font-bold">
                        {obs.observedAt ? new Date(obs.observedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="py-4 pl-4 pr-6 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedObs(obs)}
                          className="h-9 px-3.5 rounded-xl border-2 border-slate-300 bg-white text-xs font-bold text-slate-900 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 text-slate-700" />
                          Detail
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: JSA List */}
      {activeTab === 'jsa' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedJsa.length === 0 ? (
            <div className="col-span-full rounded-2xl border-2 border-slate-300 bg-white p-12 text-center text-sm font-bold text-slate-700 shadow-xs">
              Tidak ada data Job Safety Analysis (JSA) yang sesuai kriteria.
            </div>
          ) : (
            sortedJsa.map((jsa) => {
              const riskStyle = getRiskBadgeStyle(jsa.riskLevel)

              return (
                <div
                  key={jsa.id}
                  className="rounded-2xl border-2 border-slate-300 bg-white p-5 shadow-xs hover:border-blue-500 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <span className="font-mono text-xs sm:text-sm font-black text-slate-950">{jsa.jsaNumber}</span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${riskStyle}`}>
                        {jsa.riskLevel}
                      </span>
                    </div>

                    <h3 className="font-black text-slate-950 text-sm line-clamp-2">
                      {jsa.jobDescription}
                    </h3>

                    {jsa.equipmentNumber && (
                      <p className="mt-2 text-xs font-bold text-slate-900 bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-lg inline-block">
                        Unit / Alat: {jsa.equipmentNumber}
                      </p>
                    )}

                    <div className="mt-3.5 pt-3 border-t-2 border-slate-100 text-xs font-bold text-slate-700">
                      <span>{jsa.steps.length} Langkah Pengendalian Risiko</span>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t-2 border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedJsa(jsa)}
                      className="w-full h-9 rounded-xl border-2 border-slate-300 bg-white text-xs font-bold text-slate-900 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-400 shadow-2xs transition-colors cursor-pointer"
                    >
                      <HardHat className="h-3.5 w-3.5 mr-1.5 text-slate-700" />
                      Lihat Langkah JSA
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* PTW Detail Dialog */}
      <Dialog open={Boolean(selectedPtw)} onOpenChange={(open) => !open && setSelectedPtw(null)}>
        <DialogContent className="max-w-2xl rounded-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto bg-white border-2 border-slate-300 shadow-xl text-slate-950">
          {selectedPtw && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-mono text-xs font-black text-slate-950 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-300">{selectedPtw.permitNumber}</span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${getPtwStatusStyle(selectedPtw.status)}`}>
                    {selectedPtw.status}
                  </span>
                </div>
                <DialogTitle className="text-lg font-black text-slate-950 font-display">
                  {selectedPtw.projectName}
                </DialogTitle>
              </DialogHeader>

              {/* General PTW info */}
              <div className="grid grid-cols-2 gap-3.5 rounded-xl bg-slate-50 border-2 border-slate-300 p-4 text-xs sm:text-sm">
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Tipe Izin</span>
                  <span className="font-bold text-slate-950">{selectedPtw.permitType}</span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Tingkat Risiko</span>
                  <span className={`font-black ${selectedPtw.riskLevel?.toLowerCase() === 'high' ? 'text-rose-700' : 'text-slate-950'}`}>
                    {selectedPtw.riskLevel || 'Normal'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Site / Area</span>
                  <span className="font-bold text-slate-950">{selectedPtw.siteName}</span>
                </div>
                <div>
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">Pemohon (Applicant)</span>
                  <span className="font-bold text-slate-950">{selectedPtw.applicantName || '-'}</span>
                </div>
              </div>

              {/* Multi-tier Approval History */}
              {selectedPtw.approvals && selectedPtw.approvals.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Alur Otorisasi &amp; Tanda Tangan Digital
                  </h4>
                  <div className="space-y-2">
                    {selectedPtw.approvals.map((step) => {
                      const isApproved = step.status.toLowerCase() === 'approved'
                      return (
                        <div
                          key={step.id}
                          className="flex items-center justify-between rounded-xl border-2 border-slate-300 bg-white p-3.5 shadow-2xs text-xs sm:text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg font-black text-xs ${isApproved ? 'bg-emerald-100 text-emerald-950 border border-emerald-400' : 'bg-slate-200 text-slate-950 border border-slate-300'}`}>
                              {isApproved ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : step.stepOrder}
                            </div>
                            <div>
                              <p className="font-black text-slate-950">{step.stepLabel}</p>
                              <p className="text-xs text-slate-700 font-semibold">{step.approverName || 'Menunggu Otorisasi'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${getPtwStatusStyle(step.status)}`}>
                              {step.status}
                            </span>
                            {step.signedAt && (
                              <p className="text-xs text-slate-700 font-bold mt-0.5">
                                {new Date(step.signedAt).toLocaleDateString('id-ID')}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* JSA Detail Dialog */}
      <Dialog open={Boolean(selectedJsa)} onOpenChange={(open) => !open && setSelectedJsa(null)}>
        <DialogContent className="max-w-3xl rounded-2xl p-6 sm:p-7 max-h-[85vh] overflow-y-auto bg-white border-2 border-slate-300 shadow-xl text-slate-950">
          {selectedJsa && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-xs font-black text-slate-950 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-300">{selectedJsa.jsaNumber}</span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ${getRiskBadgeStyle(selectedJsa.riskLevel)}`}>
                    Risiko: {selectedJsa.riskLevel}
                  </span>
                </div>
                <DialogTitle className="text-lg font-black text-slate-950 font-display">
                  {selectedJsa.jobDescription}
                </DialogTitle>
              </DialogHeader>

              <div className="overflow-x-auto rounded-xl border-2 border-slate-300 bg-white">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-200/90 text-xs font-black uppercase tracking-wider text-slate-950 border-b-2 border-slate-300">
                    <tr>
                      <th className="py-2.5 px-3.5">No</th>
                      <th className="py-2.5 px-3.5">Urutan Kerja</th>
                      <th className="py-2.5 px-3.5">Potensi Bahaya</th>
                      <th className="py-2.5 px-3.5">Langkah Pengendalian</th>
                      <th className="py-2.5 px-3.5">PIC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-900">
                    {selectedJsa.steps.map((st) => (
                      <tr key={st.id} className="hover:bg-blue-50/60 transition-colors">
                        <td className="py-3 px-3.5 font-black text-slate-950">{st.stepOrder}</td>
                        <td className="py-3 px-3.5 text-slate-950 font-black">{st.workStep}</td>
                        <td className="py-3 px-3.5 text-rose-950 bg-rose-50 font-bold border-l border-r border-rose-200">{st.hazard}</td>
                        <td className="py-3 px-3.5 text-emerald-950 bg-emerald-50 font-bold border-r border-emerald-200">{st.control}</td>
                        <td className="py-3 px-3.5 text-slate-900 font-bold">{st.pic}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getRiskBadgeStyle(risk: string) {
  switch (risk?.toLowerCase()) {
    case 'high':
    case 'tinggi':
      return 'bg-rose-100 text-rose-950 border border-rose-400'
    case 'medium':
    case 'sedang':
      return 'bg-amber-100 text-amber-950 border border-amber-400'
    default:
      return 'bg-emerald-100 text-emerald-950 border border-emerald-400'
  }
}

function getPtwStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-950 border border-emerald-400'
    case 'in progress':
      return 'bg-blue-100 text-blue-950 border border-blue-400'
    case 'completed':
      return 'bg-indigo-100 text-indigo-950 border border-indigo-400'
    default:
      return 'bg-slate-200 text-slate-950 border border-slate-400'
  }
}
