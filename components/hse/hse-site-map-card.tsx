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

function toYearMonthString(val: unknown): string {
  if (!val) return ''
  if (val instanceof Date) {
    if (Number.isNaN(val.getTime())) return ''
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }
  const s = String(val).trim()
  if (/^\d{4}-\d{2}/.test(s)) {
    return s.substring(0, 7)
  }
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }
  return ''
}

function matchesSiteName(workLocation: string, siteName: string, siteLocation?: string | null): boolean {
  if (!workLocation || !siteName) return false
  const normW = workLocation.trim().toUpperCase().replace(/[-_]/g, ' ')
  const normS = siteName.trim().toUpperCase().replace(/[-_]/g, ' ')
  if (normW === normS) return true
  if (normW.includes(normS) || normS.includes(normW)) return true
  if (siteLocation) {
    const normL = siteLocation.trim().toUpperCase().replace(/[-_]/g, ' ')
    if (normW === normL || normW.includes(normL) || normL.includes(normW)) return true
  }
  return false
}

type MasterSiteItem = {
  id: number
  name: string
  location?: string | null
  geoLatitude?: string | null
  geoLongitude?: string | null
  totalManpower?: number
  manpowerService?: number
  manpowerRepair?: number
}

type MonthlyManHoursItem = {
  workLocation: string
  month: Date | string
  safetyManHours: string | number
  employeeCount?: number
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
  // Default month: backdate 1 bulan sebelumnya (September jika bulan berjalan Oktober)
  // karena Safe Man Hours diinput setelah tutup buku bulan bersangkutan di menu Safety Data Management.
  const [selectedMonth, setSelectedMonth] = React.useState<string>(() => {
    // 1. Cek apakah ada data di monthlyManHours dengan jam kerja > 0
    if (monthlyManHours && monthlyManHours.length > 0) {
      const monthsWithData = monthlyManHours
        .filter((m) => {
          const hours = parseFloat(String(m.safetyManHours || 0).replace(/,/g, ''))
          return hours > 0
        })
        .map((m) => toYearMonthString(m.month))
        .filter(Boolean)
        .sort()

      if (monthsWithData.length > 0) {
        return monthsWithData[monthsWithData.length - 1]
      }
    }

    // 2. Default: H-1 bulan berjalan (backdate 1 bulan sebelumnya)
    const now = new Date()
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const y = prev.getFullYear()
    const m = String(prev.getMonth() + 1).padStart(2, '0')
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
        const sMonth = toYearMonthString(s.month)
        return sMonth === selectedMonth
      })

      // Cari data Safe Man Hours dari Monthly Man Hours di menu Safety Data Management
      const matchingMhList = monthlyManHours.filter((mh) => {
        const mhMonth = toYearMonthString(mh.month)
        if (mhMonth !== selectedMonth) return false
        return matchesSiteName(mh.workLocation, site.name, site.location)
      })

      let totalMhFromMgmt = 0
      let hasMhRecord = false
      let matchedEmpCount = 0

      for (const mh of matchingMhList) {
        const val = parseFloat(String(mh.safetyManHours || 0).replace(/,/g, ''))
        if (Number.isFinite(val)) {
          totalMhFromMgmt += val
          hasMhRecord = true
        }
        if (mh.employeeCount && mh.employeeCount > matchedEmpCount) {
          matchedEmpCount = mh.employeeCount
        }
      }

      // Prioritas 1: Ambil dari Monthly Man Hours di menu Safety Data Management (sinkronisasi langsung)
      // Prioritas 2: Fallback ke siteMonthlySummaries
      const finalSafetyManHours = hasMhRecord
        ? String(totalMhFromMgmt)
        : summary?.safetyManHours != null && String(summary.safetyManHours).trim() !== '' && String(summary.safetyManHours) !== '0'
        ? String(summary.safetyManHours)
        : '0'

      const totalMp = site.totalManpower ?? summary?.totalManpower ?? (matchedEmpCount > 0 ? matchedEmpCount : 0)
      const serviceMp = site.manpowerService ?? 0
      const repairMp = site.manpowerRepair ?? 0

      // Total incidents dari safety data management (monthly summary + incident reports)
      const sumIncidents = summary
        ? (summary.fatality || 0) +
          (summary.majorInjury || 0) +
          (summary.propertyDamage || 0) +
          (summary.nearmiss || 0) +
          (summary.environmental || 0) +
          (summary.firstAid || 0) +
          (summary.medicalTreatment || 0)
        : 0

      const matchingReports = incidentReports.filter((inc) => {
        if (!inc.incidentDate) return false
        if (toYearMonthString(inc.incidentDate) !== selectedMonth) return false
        const loc = (inc.location || '').toLowerCase()
        const sName = site.name.toLowerCase()
        return loc.includes(sName) || sName.includes(loc)
      })

      const finalTotalIncidents = Math.max(sumIncidents, matchingReports.length)

      return {
        id: site.id,
        name: site.name,
        location: site.location,
        geoLatitude: site.geoLatitude,
        geoLongitude: site.geoLongitude,
        totalManpower: totalMp,
        manpowerService: serviceMp,
        manpowerRepair: repairMp,
        totalIncidents: finalTotalIncidents,
        summary: summary
          ? {
              ...summary,
              safetyManHours: finalSafetyManHours,
              totalManpower: totalMp,
              manpowerService: serviceMp,
              manpowerRepair: repairMp,
              totalIncidents: finalTotalIncidents,
            }
          : finalSafetyManHours !== '0' || totalMp > 0 || finalTotalIncidents > 0
          ? {
              nearmiss: 0,
              propertyDamage: 0,
              firstAid: 0,
              medicalTreatment: 0,
              environmental: 0,
              majorInjury: 0,
              fatality: 0,
              safetyManHours: finalSafetyManHours,
              totalManpower: totalMp,
              manpowerService: serviceMp,
              manpowerRepair: repairMp,
              totalIncidents: finalTotalIncidents,
              sickEmployeesCount: 0,
              lostDaysCount: 0,
              sickLettersCount: 0,
              occupationalDiseasesCount: 0,
              incidentNotes: 'Data presensi & K3',
            }
          : null,
      } as SiteMapData
    })
  }, [masterSites, siteMonthlySummaries, monthlyManHours, selectedMonth, incidentReports])

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
      const sTotalMp = s.totalManpower ?? sm?.totalManpower ?? 0
      totalManpower += sTotalMp

      if (!sm) {
        if ((s.totalIncidents ?? 0) > 0) {
          warning++
        } else {
          zero++
        }
        return
      }

      totalManHours += parseFloat(String(sm.safetyManHours || 0)) || 0

      if (sm.fatality > 0 || sm.majorInjury > 0) {
        danger++
      } else if (
        sm.propertyDamage > 0 ||
        sm.firstAid > 0 ||
        sm.medicalTreatment > 0 ||
        sm.nearmiss > 0 ||
        sm.environmental > 0 ||
        (s.totalIncidents ?? 0) > 0
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
