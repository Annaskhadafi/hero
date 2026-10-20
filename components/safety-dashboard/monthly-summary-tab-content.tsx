'use client'

import * as React from 'react'
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  HeartPulse,
  MapPin,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SiteMapData } from './site-safety-map'
import {
  SiteOshePerformanceDialog,
  type SiteMonthlySummaryItem,
  type IncidentReportItem,
} from './site-oshe-performance-dialog'
import { LaggingK3Dialog } from './lagging-k3-dialog'
import { LaggingHealthDialog } from './lagging-health-dialog'
import { ManageSiteCoordinatesDialog } from './manage-site-coordinates-dialog'
import { deleteSiteMonthlySummaryAction } from '@/app/dashboard/safety/data/monthly-summary-actions'
import type { getSafetyDashboardData } from '@/lib/safety-dashboard/queries'

type SafetyData = Awaited<ReturnType<typeof getSafetyDashboardData>>

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

export function MonthlySummaryTabContent({ data }: { data: SafetyData }) {
  const router = useRouter()

  // Default month: bulan ini (e.g. 2026-09 atau 2026-10)
  const [selectedMonth, setSelectedMonth] = React.useState<string>(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  })

  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedSiteForDetail, setSelectedSiteForDetail] = React.useState<SiteMapData | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)

  // Dialog Form states
  const [isK3DialogOpen, setIsK3DialogOpen] = React.useState(false)
  const [isHealthDialogOpen, setIsHealthDialogOpen] = React.useState(false)
  const [isCoordinatesDialogOpen, setIsCoordinatesDialogOpen] = React.useState(false)
  const [selectedSummaryForEdit, setSelectedSummaryForEdit] = React.useState<SiteMonthlySummaryItem | null>(null)
  const [deletingId, setDeletingId] = React.useState<number | null>(null)

  const masterSites = data.masterSites || []
  const siteSummaries = (data.siteMonthlySummaries || []) as SiteMonthlySummaryItem[]
  const incidentReports = (data.incidentReports || []) as IncidentReportItem[]

  // Hitung label bulan yang dipilih
  const selectedMonthLabel = React.useMemo(() => {
    const [y, m] = selectedMonth.split('-')
    const mIdx = parseInt(m, 10) - 1
    return `${MONTH_NAMES[mIdx] || m} ${y}`
  }, [selectedMonth])

  // Gabungkan master sites dengan data summary bulan yang dipilih
  const combinedSiteData = React.useMemo(() => {
    return masterSites.map((site) => {
      const summary = siteSummaries.find((s) => {
        if (s.siteId !== site.id) return false
        const sMonth = s.month ? s.month.substring(0, 7) : ''
        return sMonth === selectedMonth
      })

      // Jika belum ada di hero_safety_site_monthly_summary, cari dari safetyMonthlyManHours
      const manHoursFallback = data.monthlyManHours.find((mh) => {
        const mhMonth = mh.month ? String(mh.month).substring(0, 7) : ''
        return mh.workLocation === site.name && mhMonth === selectedMonth
      })

      const rawSummary = summary || {
        id: 0,
        siteId: site.id,
        siteName: site.name,
        month: `${selectedMonth}-01`,
        nearmiss: 0,
        propertyDamage: 0,
        firstAid: 0,
        medicalTreatment: 0,
        environmental: 0,
        majorInjury: 0,
        fatality: 0,
        safetyManHours: manHoursFallback ? Number(manHoursFallback.safetyManHours) : 0,
        totalManpower: manHoursFallback ? manHoursFallback.employeeCount : 0,
        sickEmployeesCount: 0,
        lostDaysCount: 0,
        sickLettersCount: 0,
        occupationalDiseasesCount: 0,
        incidentNotes: 'Nihil',
      }

      const mapSite: SiteMapData = {
        id: site.id,
        name: site.name,
        location: site.location,
        geoLatitude: site.geoLatitude,
        geoLongitude: site.geoLongitude,
        summary: rawSummary,
      }

      return {
        ...mapSite,
        summaryRecord: summary || null,
      }
    })
  }, [masterSites, siteSummaries, selectedMonth, data.monthlyManHours])

  // Filter pencarian
  const filteredSites = React.useMemo(() => {
    if (!searchQuery.trim()) return combinedSiteData
    const q = searchQuery.toLowerCase()
    return combinedSiteData.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.location && s.location.toLowerCase().includes(q))
    )
  }, [combinedSiteData, searchQuery])

  // KPI Ringkasan
  const kpiStats = React.useMemo(() => {
    let totalSafeHours = 0
    let totalManpower = 0
    let zeroCount = 0
    let incidentCount = 0
    let totalIncidents = 0

    for (const s of combinedSiteData) {
      const sum = s.summary
      const hours = Number(sum?.safetyManHours || 0)
      totalSafeHours += hours
      totalManpower += sum?.totalManpower || 0

      const incs =
        (sum?.nearmiss || 0) +
        (sum?.propertyDamage || 0) +
        (sum?.firstAid || 0) +
        (sum?.medicalTreatment || 0) +
        (sum?.environmental || 0) +
        (sum?.majorInjury || 0) +
        (sum?.fatality || 0)

      totalIncidents += incs
      if (incs === 0) {
        zeroCount++
      } else {
        incidentCount++
      }
    }

    return {
      totalSafeHours,
      totalManpower,
      zeroCount,
      incidentCount,
      totalIncidents,
      totalSites: combinedSiteData.length,
    }
  }, [combinedSiteData])

  // Chart Data: Top Sites by Incidents / Safe Hours
  const chartData = React.useMemo(() => {
    return combinedSiteData.slice(0, 15).map((s) => {
      const sum = s.summary
      return {
        name: s.name.length > 12 ? `${s.name.substring(0, 10)}..` : s.name,
        fullName: s.name,
        Nearmiss: sum?.nearmiss || 0,
        PropertyDamage: sum?.propertyDamage || 0,
        MinorInjury: (sum?.firstAid || 0) + (sum?.medicalTreatment || 0),
        MajorFatality: (sum?.majorInjury || 0) + (sum?.fatality || 0),
        ManHours: Math.round(Number(sum?.safetyManHours || 0) / 1000), // in k hours
      }
    })
  }, [combinedSiteData])

  const handleOpenDetail = (site: SiteMapData) => {
    setSelectedSiteForDetail(site)
    setIsDetailOpen(true)
  }

  const handleOpenK3Form = (summary?: SiteMonthlySummaryItem | null) => {
    setSelectedSummaryForEdit(summary || null)
    setIsK3DialogOpen(true)
  }

  const handleOpenHealthForm = (summary?: SiteMonthlySummaryItem | null) => {
    setSelectedSummaryForEdit(summary || null)
    setIsHealthDialogOpen(true)
  }

  const handleDeleteSummary = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data rekapitulasi site ini?')) {
      return
    }
    setDeletingId(id)
    try {
      const res = await deleteSiteMonthlySummaryAction(id)
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Filter Bar & Action Buttons */}
      <Card className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-[#1e40af]/10 text-[#1e40af]">
                <MapPin className="size-4" />
              </span>
              <h2 className="font-display text-lg font-bold text-foreground">
                Monitoring OSHE Site & Monthly Lagging Indicators
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Pemetaan visual seluruh site kerja HERO, integrasi Lagging K3 & Health, dan kalender insiden harian.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {/* Month Filter Picker */}
            <div className="flex items-center gap-1.5 rounded-xl border border-border bg-slate-50/80 px-3 py-1.5 shadow-xs">
              <Calendar className="size-4 text-muted-foreground" />
              <label htmlFor="month-picker" className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                Periode:
              </label>
              <Input
                id="month-picker"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-7 w-36 border-0 bg-transparent p-0 text-xs font-bold text-slate-900 focus-visible:ring-0"
              />
            </div>

            {/* Action Buttons */}
            {data.access.canEdit && (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCoordinatesDialogOpen(true)}
                  className="h-9 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border-border gap-1.5 shadow-xs"
                >
                  <MapPin className="size-3.5 text-primary" />
                  Setting Koordinat Site
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleOpenK3Form(null)}
                  className="h-9 text-xs font-semibold bg-[#1e40af] hover:bg-[#1e40af]/90 text-white gap-1.5 shadow-xs"
                >
                  <Plus className="size-3.5" />
                  Form Input Lagging K3
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleOpenHealthForm(null)}
                  className="h-9 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 shadow-xs"
                >
                  <HeartPulse className="size-3.5" />
                  Form Input Lagging Health
                </Button>
              </>
            )}
          </div>
        </div>

        {/* KPI Scorecards Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/60">
          <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Safe Man Hours</span>
            <p className="font-extrabold text-lg sm:text-xl text-[#1e40af] tabular-nums mt-0.5">
              {kpiStats.totalSafeHours.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-muted-foreground">Jam</span>
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200/70 p-3">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Manpower Aktif</span>
            <p className="font-extrabold text-lg sm:text-xl text-slate-900 tabular-nums mt-0.5">
              {kpiStats.totalManpower.toLocaleString('id-ID')}{' '}
              <span className="text-xs font-normal text-muted-foreground">Orang</span>
            </p>
          </div>

          <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/70 p-3">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">Site Zero Accident</span>
            <p className="font-extrabold text-lg sm:text-xl text-emerald-700 tabular-nums mt-0.5">
              {kpiStats.zeroCount}{' '}
              <span className="text-xs font-normal text-emerald-600">/ {kpiStats.totalSites} Site</span>
            </p>
          </div>

          <div className="rounded-xl bg-amber-50/70 border border-amber-200/70 p-3">
            <span className="text-[10px] uppercase font-bold text-amber-800 block">Total Insiden Bulan Ini</span>
            <p className="font-extrabold text-lg sm:text-xl text-amber-700 tabular-nums mt-0.5">
              {kpiStats.totalIncidents}{' '}
              <span className="text-xs font-normal text-amber-600">Kasus</span>
            </p>
          </div>
        </div>
      </Card>

      {/* 3. Analytics Charts: Comparison by Site */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-12 rounded-2xl border border-border/80 bg-white p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Distribusi & Perbandingan Insiden Antar-Site ({selectedMonthLabel})
              </CardTitle>
              <CardDescription className="text-xs">
                Perbandingan kuantitas Nearmiss, Property Damage, Minor Injury, dan Major/Fatality per lokasi site.
              </CardDescription>
            </div>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload
                      return (
                        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1">
                          <p className="font-bold text-slate-900">{item.fullName}</p>
                          <p className="text-amber-600">Nearmiss: {item.Nearmiss}</p>
                          <p className="text-rose-600">Property Damage: {item.PropertyDamage}</p>
                          <p className="text-fuchsia-600">Minor Injury: {item.MinorInjury}</p>
                          <p className="text-slate-900 font-semibold">Major/Fatality: {item.MajorFatality}</p>
                          <p className="text-blue-600 pt-1 border-t">Man Hours: {item.ManHours}k Jam</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                <Bar dataKey="Nearmiss" fill="#facc15" radius={[4, 4, 0, 0]} />
                <Bar dataKey="PropertyDamage" fill="#f87171" radius={[4, 4, 0, 0]} />
                <Bar dataKey="MinorInjury" fill="#c084fc" radius={[4, 4, 0, 0]} />
                <Bar dataKey="MajorFatality" fill="#1e293b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 4. Rekapitulasi Tabel Seluruh Site */}
      <Card className="rounded-2xl border border-border/80 bg-white overflow-hidden shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/80 px-5 py-4 border-b">
          <div className="space-y-0.5">
            <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wide">
              Tabel Rekapitulasi Lagging K3 & Health per Site
            </h3>
            <p className="text-xs text-muted-foreground">
              Periode {selectedMonthLabel} &bull; Total {filteredSites.length} Lokasi Site
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari nama site..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px] font-bold uppercase tracking-wider">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead>Nama Lokasi Site</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Safe Man Hours</TableHead>
                <TableHead className="text-center">Manpower</TableHead>
                <TableHead className="text-center">Nearmiss</TableHead>
                <TableHead className="text-center">PD</TableHead>
                <TableHead className="text-center">Minor (FAI/MTI)</TableHead>
                <TableHead className="text-center">Major/FTL</TableHead>
                <TableHead className="text-center">Pekerja Sakit</TableHead>
                <TableHead className="text-center">Hari Hilang</TableHead>
                <TableHead className="text-right pr-4">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ditemukan site yang cocok dengan kata kunci pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSites.map((siteRow, idx) => {
                  const sum = siteRow.summary
                  const totalIncs =
                    (sum?.nearmiss || 0) +
                    (sum?.propertyDamage || 0) +
                    (sum?.firstAid || 0) +
                    (sum?.medicalTreatment || 0) +
                    (sum?.environmental || 0) +
                    (sum?.majorInjury || 0) +
                    (sum?.fatality || 0)

                  const isZero = totalIncs === 0
                  const isSavedSummary = Boolean(siteRow.summaryRecord?.id)

                  return (
                    <TableRow key={siteRow.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center font-medium text-muted-foreground py-2.5">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span>{siteRow.name}</span>
                          {isSavedSummary && (
                            <Badge variant="outline" className="text-[9px] px-1 py-0 bg-blue-50 text-blue-700 border-blue-200">
                              Tersimpan
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-2.5">
                        {isZero ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold">
                            Zero Accident
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] font-semibold">
                            {totalIncs} Kasus
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700 tabular-nums py-2.5">
                        {Number(sum?.safetyManHours || 0).toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-center tabular-nums py-2.5">
                        {sum?.totalManpower || 0}
                      </TableCell>
                      <TableCell className="text-center tabular-nums py-2.5 font-medium">
                        {sum?.nearmiss || 0}
                      </TableCell>
                      <TableCell className="text-center tabular-nums py-2.5 font-medium text-amber-600">
                        {sum?.propertyDamage || 0}
                      </TableCell>
                      <TableCell className="text-center tabular-nums py-2.5 font-medium">
                        {(sum?.firstAid || 0) + (sum?.medicalTreatment || 0)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums py-2.5 font-bold text-rose-600">
                        {(sum?.majorInjury || 0) + (sum?.fatality || 0)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums py-2.5">
                        {sum?.sickEmployeesCount || 0}
                      </TableCell>
                      <TableCell className="text-center tabular-nums py-2.5 text-amber-700">
                        {sum?.lostDaysCount || 0}
                      </TableCell>
                      <TableCell className="text-right py-2.5 pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDetail(siteRow)}
                            className="h-7 text-xs px-2 bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100 gap-1 font-semibold"
                            title="Buka Popup OSHE Performance"
                          >
                            <ExternalLink className="size-3" />
                            OSHE
                          </Button>

                          {data.access.canEdit && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenK3Form(siteRow.summaryRecord)}
                                className="h-7 px-1.5 text-slate-600 hover:text-primary"
                                title="Edit Lagging K3"
                              >
                                <ShieldAlert className="size-3.5" />
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenHealthForm(siteRow.summaryRecord)}
                                className="h-7 px-1.5 text-slate-600 hover:text-emerald-700"
                                title="Edit Lagging Health"
                              >
                                <HeartPulse className="size-3.5" />
                              </Button>
                            </>
                          )}

                          {data.access.canDelete && isSavedSummary && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={deletingId === siteRow.summaryRecord?.id}
                              onClick={() => siteRow.summaryRecord?.id && handleDeleteSummary(siteRow.summaryRecord.id)}
                              className="h-7 px-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Hapus data summary"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 5. Modals & Dialogs */}
      <SiteOshePerformanceDialog
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedSiteForDetail(null)
        }}
        site={selectedSiteForDetail}
        selectedMonth={selectedMonth}
        allSiteSummaries={siteSummaries}
        incidentReports={incidentReports}
      />

      <LaggingK3Dialog
        isOpen={isK3DialogOpen}
        onClose={() => {
          setIsK3DialogOpen(false)
          setSelectedSummaryForEdit(null)
        }}
        masterSites={masterSites}
        defaultMonth={selectedMonth}
        initialData={selectedSummaryForEdit}
      />

      <LaggingHealthDialog
        isOpen={isHealthDialogOpen}
        onClose={() => {
          setIsHealthDialogOpen(false)
          setSelectedSummaryForEdit(null)
        }}
        masterSites={masterSites}
        defaultMonth={selectedMonth}
        initialData={selectedSummaryForEdit}
      />

      <ManageSiteCoordinatesDialog
        isOpen={isCoordinatesDialogOpen}
        onClose={() => setIsCoordinatesDialogOpen(false)}
        sites={masterSites}
      />
    </div>
  )
}
