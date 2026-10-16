'use client'

import * as React from 'react'
import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  Compass,
  MapPin,
  Search,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SiteSafetyMap, type SiteMapData } from '@/components/safety-dashboard/site-safety-map'
import {
  SiteOshePerformanceDialog,
  type SiteMonthlySummaryItem,
  type IncidentReportItem,
} from '@/components/safety-dashboard/site-oshe-performance-dialog'
import { ManageSiteCoordinatesDialog } from '@/components/safety-dashboard/manage-site-coordinates-dialog'

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

type MasterSiteItem = {
  id: number
  name: string
  location?: string | null
  geoLatitude?: string | null
  geoLongitude?: string | null
}

type MonthlyManHoursItem = {
  workLocation: string
  month: Date | string
  safetyManHours: string | number
}

type HseSiteMapCardProps = {
  masterSites: MasterSiteItem[]
  siteMonthlySummaries: any[]
  incidentReports: any[]
  monthlyManHours: MonthlyManHoursItem[]
  canEdit?: boolean
}

export function HseSiteMapCard({
  masterSites = [],
  siteMonthlySummaries = [],
  incidentReports = [],
  monthlyManHours = [],
  canEdit = true,
}: HseSiteMapCardProps) {
  // Default month: bulan ini (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = React.useState<string>(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  })

  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedSiteForDetail, setSelectedSiteForDetail] = React.useState<SiteMapData | null>(null)
  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [isCoordinatesDialogOpen, setIsCoordinatesDialogOpen] = React.useState(false)

  // Label bulan pilihan
  const selectedMonthLabel = React.useMemo(() => {
    const [y, m] = selectedMonth.split('-')
    const mIdx = parseInt(m, 10) - 1
    return `${MONTH_NAMES[mIdx] || m} ${y}`
  }, [selectedMonth])

  // Gabungkan master sites dengan data summary bulan yang dipilih
  const combinedSiteData = React.useMemo(() => {
    return masterSites.map((site) => {
      const summary = siteMonthlySummaries.find((s) => {
        if (s.siteId !== site.id) return false
        const sMonth = s.month ? String(s.month).substring(0, 7) : ''
        return sMonth === selectedMonth
      })

      // Jika belum ada di hero_safety_site_monthly_summary, cari dari monthlyManHours
      const manHoursFallback = monthlyManHours.find((mh) => {
        const mhMonth = mh.month ? String(mh.month).substring(0, 7) : ''
        return mh.workLocation === site.name && mhMonth === selectedMonth
      })

      const finalSafetyManHours = summary?.safetyManHours ?? manHoursFallback?.safetyManHours ?? '0'

      return {
        id: site.id,
        name: site.name,
        location: site.location,
        geoLatitude: site.geoLatitude,
        geoLongitude: site.geoLongitude,
        summary: summary
          ? {
              ...summary,
              safetyManHours: finalSafetyManHours,
            }
          : finalSafetyManHours !== '0'
          ? {
              nearmiss: 0,
              propertyDamage: 0,
              firstAid: 0,
              medicalTreatment: 0,
              environmental: 0,
              majorInjury: 0,
              fatality: 0,
              safetyManHours: finalSafetyManHours,
              totalManpower: 0,
              sickEmployeesCount: 0,
              lostDaysCount: 0,
              sickLettersCount: 0,
              occupationalDiseasesCount: 0,
              incidentNotes: 'Data estimasi presensi man hours',
            }
          : null,
      } as SiteMapData
    })
  }, [masterSites, siteMonthlySummaries, monthlyManHours, selectedMonth])

  // Filter site berdasarkan query pencarian
  const filteredSites = React.useMemo(() => {
    if (!searchQuery.trim()) return combinedSiteData
    const q = searchQuery.toLowerCase()
    return combinedSiteData.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.location && s.location.toLowerCase().includes(q))
    )
  }, [combinedSiteData, searchQuery])

  // Ringkasan status
  const stats = React.useMemo(() => {
    let zero = 0
    let warning = 0
    let danger = 0
    let totalManHours = 0
    let totalManpower = 0

    combinedSiteData.forEach((s) => {
      const sm = s.summary
      if (!sm) {
        zero++
        return
      }

      totalManHours += parseFloat(String(sm.safetyManHours || 0)) || 0
      totalManpower += sm.totalManpower || 0

      if (sm.fatality > 0 || sm.majorInjury > 0) {
        danger++
      } else if (
        sm.propertyDamage > 0 ||
        sm.firstAid > 0 ||
        sm.medicalTreatment > 0 ||
        sm.nearmiss > 0 ||
        sm.environmental > 0
      ) {
        warning++
      } else {
        zero++
      }
    })

    return { zero, warning, danger, totalManHours, totalManpower }
  }, [combinedSiteData])

  return (
    <Card className="surface-module-card overflow-hidden rounded-[1.05rem] border shadow-sm">
      <CardHeader className="bg-slate-50/50 p-4 border-b">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Compass className="size-4" />
              </span>
              <CardTitle className="text-base font-bold">Peta Sebaran Site & Status OSHE</CardTitle>
            </div>
            <CardDescription className="mt-1 text-xs">
              Distribusi geografis site operasional, status insiden K3, dan pencapaian jam kerja aman ({selectedMonthLabel})
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1 shadow-xs">
              <Calendar className="size-3.5 text-muted-foreground" />
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="h-7 w-36 border-none p-0 text-xs font-semibold focus-visible:ring-0 shadow-none cursor-pointer"
              />
            </div>

            <div className="relative w-44 sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari nama site..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-white"
              />
            </div>

            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCoordinatesDialogOpen(true)}
                className="h-8 gap-1.5 text-xs bg-white"
              >
                <Settings2 className="size-3.5 text-slate-500" />
                <span className="hidden sm:inline">Kelola Koordinat</span>
              </Button>
            )}
          </div>
        </div>

        {/* Ringkasan Indikator Status & Metrik */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-700 border-emerald-200 px-2.5 py-1 text-xs gap-1.5 font-medium"
            >
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Zero Incident: <strong>{stats.zero}</strong> site</span>
            </Badge>

            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-700 border-amber-200 px-2.5 py-1 text-xs gap-1.5 font-medium"
            >
              <span className="size-2 rounded-full bg-amber-500" />
              <span>Warning / Minor: <strong>{stats.warning}</strong> site</span>
            </Badge>

            <Badge
              variant="outline"
              className="bg-rose-50 text-rose-700 border-rose-200 px-2.5 py-1 text-xs gap-1.5 font-medium"
            >
              <span className="size-2 rounded-full bg-rose-500" />
              <span>Critical / Danger: <strong>{stats.danger}</strong> site</span>
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="size-3.5 text-slate-500" />
              Manpower: <strong className="text-foreground">{new Intl.NumberFormat('id-ID').format(stats.totalManpower)}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5 text-slate-500" />
              Total Jam Kerja Aman: <strong className="text-foreground">{new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(stats.totalManHours)} Jam</strong>
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <SiteSafetyMap
          sites={filteredSites}
          selectedMonthLabel={selectedMonthLabel}
          onOpenSiteDetail={(site) => {
            setSelectedSiteForDetail(site)
            setIsDetailOpen(true)
          }}
          onOpenManageCoordinates={canEdit ? () => setIsCoordinatesDialogOpen(true) : undefined}
        />
      </CardContent>

      {/* Modal Dialog Detail OSHE Performance */}
      <SiteOshePerformanceDialog
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        site={selectedSiteForDetail}
        selectedMonth={selectedMonth}
        allSiteSummaries={siteMonthlySummaries as SiteMonthlySummaryItem[]}
        incidentReports={incidentReports as IncidentReportItem[]}
      />

      {/* Modal Dialog Kelola Koordinat Site */}
      <ManageSiteCoordinatesDialog
        isOpen={isCoordinatesDialogOpen}
        onClose={() => setIsCoordinatesDialogOpen(false)}
        sites={masterSites}
      />
    </Card>
  )
}
