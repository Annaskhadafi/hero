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
} from 'lucide-react'
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
    <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 space-y-8 text-slate-900 pb-20">
      {/* Top Header: Frosted Glass Panel */}
      <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/85 p-7 sm:p-9 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-white/90 border border-slate-300 text-slate-800 hover:bg-slate-100 text-xs sm:text-sm font-bold shadow-2xs transition"
              >
                <ArrowLeft className="h-4 w-4 text-slate-600" />
                <span>Dashboard</span>
              </Link>
              <span className="text-slate-400 font-bold">/</span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-800">Safety &amp; PTW Management</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-xs font-extrabold text-emerald-950 shadow-2xs">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                K3 &amp; Safety Live
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-4xl font-black tracking-tight text-slate-950">
              Safety Management &amp; PTW
            </h1>
            <p className="text-sm sm:text-base text-slate-700 mt-2 font-medium">
              Monitoring kepatuhan K3, izin kerja risiko tinggi, jam kerja selamat (Safe Man Hours), dan inspeksi lapangan di site {initialData.customerName}.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.refresh()}
              className="h-11 gap-2 rounded-2xl border-slate-300 bg-white/90 px-5 text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 shadow-2xs"
            >
              <RefreshCw className="h-4 w-4 text-slate-600" />
              <span>Segarkan Data</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 5 Executive Safety Metric Cards: Frosted Glass */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
        {/* 1. Incident YTD */}
        <div className="relative overflow-hidden bg-white/85 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">Incident YTD</span>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800 font-bold border border-amber-200 shadow-2xs">
              <FileWarning className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-5">
            <span className="font-display text-3xl sm:text-4xl font-black text-slate-950">
              {formatNumber(kpis.totalIncidentYtd)}
            </span>
            <p className="text-xs text-slate-600 font-semibold mt-1">Total insiden tahun berjalan</p>
          </div>
        </div>

        {/* 2. Fatality */}
        <div className="relative overflow-hidden bg-white/85 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">Fatality</span>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-800 font-bold border border-rose-200 shadow-2xs">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-5">
            <span className="font-display text-3xl sm:text-4xl font-black text-slate-950">
              {formatNumber(kpis.fatality)}
            </span>
            <p className="text-xs text-slate-600 font-semibold mt-1">Nol korban jiwa (Zero Fatality)</p>
          </div>
        </div>

        {/* 3. Safe Man Hours */}
        <div className="relative overflow-hidden bg-white/85 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">Safe Man Hours</span>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 shadow-2xs">
              <Clock className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-5">
            <span className="font-display text-3xl sm:text-4xl font-black text-emerald-700">
              {formatNumber(kpis.safeManHours)}
            </span>
            <p className="text-xs text-slate-600 font-semibold mt-1">Jam kerja selamat tercatat</p>
          </div>
        </div>

        {/* 4. Expired Cert */}
        <div className="relative overflow-hidden bg-white/85 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-md transition flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">Expired Cert.</span>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-800 font-bold border border-sky-200 shadow-2xs">
              <BadgeCheck className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-5">
            <span className="font-display text-3xl sm:text-4xl font-black text-slate-950">
              {formatNumber(kpis.certificationExpired)}
            </span>
            <p className="text-xs text-slate-600 font-semibold mt-1">Sertifikasi perlu follow-up</p>
          </div>
        </div>

        {/* 5. Near Miss */}
        <div className="relative overflow-hidden bg-white/85 backdrop-blur-xl rounded-3xl p-6 border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-md transition flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">Near Miss</span>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-800 font-bold border border-indigo-200 shadow-2xs">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-5">
            <span className="font-display text-3xl sm:text-4xl font-black text-slate-950">
              {formatNumber(kpis.nearMiss)}
            </span>
            <p className="text-xs text-slate-600 font-semibold mt-1">Near miss dilaporkan YTD</p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Tab Switcher: Frosted Glass */}
      <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xs backdrop-blur-xl space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Pill Tab Switcher */}
          <div className="inline-flex rounded-2xl bg-slate-100/90 p-1.5 shadow-2xs self-start overflow-x-auto max-w-full border border-slate-300/70">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-slate-950 text-white shadow-md shadow-slate-950/20'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Overview &amp; Statistik K3</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ptw')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap ${
                activeTab === 'ptw'
                  ? 'bg-slate-950 text-white shadow-md shadow-slate-950/20'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Izin Kerja (PTW)</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${activeTab === 'ptw' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-800'}`}>
                {initialData.ptwList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('observations')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap ${
                activeTab === 'observations'
                  ? 'bg-slate-950 text-white shadow-md shadow-slate-950/20'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <Eye className="h-4 w-4" />
              <span>Observasi Hazard</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${activeTab === 'observations' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-800'}`}>
                {initialData.observations.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('jsa')}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-extrabold transition-all whitespace-nowrap ${
                activeTab === 'jsa'
                  ? 'bg-slate-950 text-white shadow-md shadow-slate-950/20'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <HardHat className="h-4 w-4" />
              <span>Job Safety Analysis</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${activeTab === 'jsa' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-800'}`}>
                {initialData.jsaList.length}
              </span>
            </button>
          </div>

          {/* Site & Search Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[180px]">
              <select
                aria-label="Pilih Site"
                value={selectedSite}
                onChange={(e) => handleSiteChange(e.target.value)}
                className="w-full h-11 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-2xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-2xs transition"
              >
                <option value="all">Semua Site</option>
                {initialData.sitesList.map((st) => (
                  <option key={st.id} value={String(st.id)}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            {activeTab === 'ptw' && (
              <div className="min-w-[160px]">
                <select
                  aria-label="Filter Status PTW"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full h-11 text-xs sm:text-sm font-bold bg-white border border-slate-300 rounded-2xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 cursor-pointer shadow-2xs transition"
                >
                  <option value="all">Semua Status</option>
                  <option value="Approved">Approved</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            )}

            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Cari data safety..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 rounded-2xl border-slate-300 bg-white pl-10 pr-4 text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 shadow-2xs"
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
        <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-xs backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-800">
              <thead className="bg-slate-100/90 text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200">
                <tr>
                  <th className="py-4 pl-6 pr-4">No. Permit &amp; Pekerjaan</th>
                  <th className="py-4 px-4">Tipe Izin</th>
                  <th className="py-4 px-4">Site / Lokasi</th>
                  <th className="py-4 px-4">Masa Berlaku</th>
                  <th className="py-4 px-4">Tingkat Risiko</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 pl-4 pr-6 text-right">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 font-semibold text-slate-800">
                {filteredPtw.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-sm font-medium text-slate-500">
                      Tidak ada data Izin Kerja (PTW) yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredPtw.map((ptw) => {
                    const riskStyle = getRiskBadgeStyle(ptw.riskLevel)
                    const statusStyle = getPtwStatusStyle(ptw.status)

                    return (
                      <tr key={ptw.id} className="hover:bg-amber-50/40 transition-colors">
                        <td className="py-4 pl-6 pr-4">
                          <p className="font-mono text-xs sm:text-sm font-black text-slate-950">{ptw.permitNumber}</p>
                          <p className="text-xs font-semibold text-slate-600 truncate max-w-xs sm:max-w-sm mt-0.5">
                            {ptw.projectName}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-900 border border-slate-300 shadow-2xs">
                            <Flame className="h-3.5 w-3.5 text-amber-700" />
                            {ptw.permitType}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-900">
                            <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                            <span className="font-bold">{ptw.siteName}</span>
                          </div>
                          {ptw.location && (
                            <p className="text-xs text-slate-500 pl-5 font-medium">{ptw.location}</p>
                          )}
                        </td>
                        <td className="py-4 px-4 text-xs sm:text-sm text-slate-700 font-semibold">
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
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${riskStyle}`}>
                            {ptw.riskLevel || 'Normal'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${statusStyle}`}>
                            {ptw.status}
                          </span>
                        </td>
                        <td className="py-4 pl-4 pr-6 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedPtw(ptw)}
                            className="h-10 px-4 rounded-2xl border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 shadow-2xs"
                          >
                            <Eye className="h-4 w-4 mr-1 text-slate-600" />
                            Lihat Detail
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
        <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-xs backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-800">
              <thead className="bg-slate-100/90 text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200">
                <tr>
                  <th className="py-4 pl-6 pr-4">Judul &amp; Kategori</th>
                  <th className="py-4 px-4">Site / Area</th>
                  <th className="py-4 px-4">Tipe Hazard</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4">Tanggal Lapor</th>
                  <th className="py-4 pl-4 pr-6 text-right">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 font-semibold text-slate-800">
                {filteredObs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-sm font-medium text-slate-500">
                      Tidak ada data Observasi Hazard yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredObs.map((obs) => (
                    <tr key={obs.id} className="hover:bg-amber-50/40 transition-colors">
                      <td className="py-4 pl-6 pr-4">
                        <p className="font-extrabold text-slate-950 text-sm">{obs.title}</p>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">{obs.category}</p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-900">
                          <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                          <span className="font-bold">{obs.siteName}</span>
                        </div>
                        {obs.location && (
                          <p className="text-xs text-slate-500 pl-5 font-medium">{obs.location}</p>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-950 shadow-2xs">
                          {obs.severity || 'Normal'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${getPtwStatusStyle(obs.status)}`}>
                          {obs.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs sm:text-sm text-slate-700 font-semibold">
                        {obs.observedAt ? new Date(obs.observedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                      </td>
                      <td className="py-4 pl-4 pr-6 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedObs(obs)}
                          className="h-10 px-4 rounded-2xl border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 shadow-2xs"
                        >
                          <Eye className="h-4 w-4 mr-1 text-slate-600" />
                          Lihat Detail
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredJsa.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-white/80 bg-white/90 p-12 text-center text-sm font-medium text-slate-500 shadow-xs backdrop-blur-xl">
              Tidak ada data Job Safety Analysis (JSA) yang sesuai kriteria.
            </div>
          ) : (
            filteredJsa.map((jsa) => {
              const riskStyle = getRiskBadgeStyle(jsa.riskLevel)

              return (
                <div
                  key={jsa.id}
                  className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-xs backdrop-blur-xl hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-xs sm:text-sm font-black text-slate-900">{jsa.jsaNumber}</span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${riskStyle}`}>
                        {jsa.riskLevel}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-950 text-base line-clamp-2">
                      {jsa.jobDescription}
                    </h3>

                    {jsa.equipmentNumber && (
                      <p className="mt-2 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl inline-block">
                        Unit / Alat: {jsa.equipmentNumber}
                      </p>
                    )}

                    <div className="mt-4 pt-3 border-t border-slate-200/70 text-xs font-bold text-slate-700">
                      <span>{jsa.steps.length} Langkah Pengendalian Risiko</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200/70">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedJsa(jsa)}
                      className="w-full h-10 rounded-2xl border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-800 hover:bg-slate-100 shadow-2xs"
                    >
                      <HardHat className="h-4 w-4 mr-2 text-amber-600" />
                      Lihat Detail Langkah JSA
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
        <DialogContent className="max-w-2xl rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-2xl border-white/80 shadow-2xl">
          {selectedPtw && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="font-mono text-sm font-black text-slate-950">{selectedPtw.permitNumber}</span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${getPtwStatusStyle(selectedPtw.status)}`}>
                    {selectedPtw.status}
                  </span>
                </div>
                <DialogTitle className="text-xl font-black text-slate-950">
                  {selectedPtw.projectName}
                </DialogTitle>
              </DialogHeader>

              {/* General PTW info */}
              <div className="grid grid-cols-2 gap-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 p-5 text-xs sm:text-sm">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tipe Izin</span>
                  <span className="font-bold text-slate-950">{selectedPtw.permitType}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tingkat Risiko</span>
                  <span className={`font-bold ${selectedPtw.riskLevel?.toLowerCase() === 'high' ? 'text-rose-700' : 'text-slate-950'}`}>
                    {selectedPtw.riskLevel || 'Normal'}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Site / Area</span>
                  <span className="font-bold text-slate-950">{selectedPtw.siteName}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Pemohon (Applicant)</span>
                  <span className="font-bold text-slate-950">{selectedPtw.applicantName || '-'}</span>
                </div>
              </div>

              {/* Multi-tier Approval History */}
              {selectedPtw.approvals && selectedPtw.approvals.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Alur Otorisasi &amp; Tanda Tangan Digital
                  </h4>
                  <div className="space-y-2.5">
                    {selectedPtw.approvals.map((step) => {
                      const isApproved = step.status.toLowerCase() === 'approved'
                      return (
                        <div
                          key={step.id}
                          className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs text-xs sm:text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                              {isApproved ? <CheckCircle2 className="h-4 w-4" /> : step.stepOrder}
                            </div>
                            <div>
                              <p className="font-bold text-slate-950">{step.stepLabel}</p>
                              <p className="text-xs font-semibold text-slate-600">{step.approverName || 'Menunggu Otorisasi'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${getPtwStatusStyle(step.status)}`}>
                              {step.status}
                            </span>
                            {step.signedAt && (
                              <p className="text-xs text-slate-500 font-semibold mt-1">
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
        <DialogContent className="max-w-3xl rounded-3xl p-6 sm:p-8 max-h-[85vh] overflow-y-auto bg-white/95 backdrop-blur-2xl border-white/80 shadow-2xl">
          {selectedJsa && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-sm font-black text-slate-950">{selectedJsa.jsaNumber}</span>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${getRiskBadgeStyle(selectedJsa.riskLevel)}`}>
                    Risiko: {selectedJsa.riskLevel}
                  </span>
                </div>
                <DialogTitle className="text-xl font-black text-slate-950">
                  {selectedJsa.jobDescription}
                </DialogTitle>
              </DialogHeader>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100/90 text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">No</th>
                      <th className="py-3 px-4">Urutan Kerja</th>
                      <th className="py-3 px-4">Potensi Bahaya</th>
                      <th className="py-3 px-4">Langkah Pengendalian</th>
                      <th className="py-3 px-4">PIC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 font-semibold">
                    {selectedJsa.steps.map((st) => (
                      <tr key={st.id}>
                        <td className="py-3 px-4 font-black text-slate-950">{st.stepOrder}</td>
                        <td className="py-3 px-4 text-slate-900 font-bold">{st.workStep}</td>
                        <td className="py-3 px-4 text-rose-950 bg-rose-50/50 font-semibold">{st.hazard}</td>
                        <td className="py-3 px-4 text-emerald-950 bg-emerald-50/50 font-semibold">{st.control}</td>
                        <td className="py-3 px-4 text-slate-800 font-bold">{st.pic}</td>
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
      return 'bg-rose-100 text-rose-950 border border-rose-300 shadow-2xs'
    case 'medium':
    case 'sedang':
      return 'bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs'
    default:
      return 'bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs'
  }
}

function getPtwStatusStyle(status: string) {
  switch (status?.toLowerCase()) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-950 border border-emerald-300 shadow-2xs'
    case 'in progress':
      return 'bg-sky-100 text-sky-950 border border-sky-300 shadow-2xs'
    case 'completed':
      return 'bg-indigo-100 text-indigo-950 border border-indigo-300 shadow-2xs'
    default:
      return 'bg-slate-200 text-slate-900 border border-slate-300 shadow-2xs'
  }
}
