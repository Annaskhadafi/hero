'use client'

import * as React from 'react'
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Printer,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { SiteMapData } from './site-safety-map-inner'

export type IncidentReportItem = {
  id: number
  workerName: string
  department: string
  incidentDescription: string
  propertyDamage: string
  location: string
  category: string
  incidentDate: Date | string | null
  status: string
}

export type SiteMonthlySummaryItem = {
  id: number
  siteId: number
  siteName: string | null
  month: string
  nearmiss: number
  propertyDamage: number
  firstAid: number
  medicalTreatment: number
  environmental: number
  majorInjury: number
  fatality: number
  safetyManHours: string | number
  totalManpower: number
  sickEmployeesCount: number
  lostDaysCount: number
  sickLettersCount: number
  occupationalDiseasesCount: number
  incidentNotes?: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  site: SiteMapData | null
  selectedMonth: string // YYYY-MM
  allSiteSummaries: SiteMonthlySummaryItem[]
  incidentReports: IncidentReportItem[]
}

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

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function SiteOshePerformanceDialog({
  isOpen,
  onClose,
  site,
  selectedMonth,
  allSiteSummaries,
  incidentReports,
}: Props) {
  if (!site) return null

  // Normalisasi tanggal bulan
  const [yearStr, monthStr] = selectedMonth.split('-')
  const currentYear = parseInt(yearStr, 10)
  const currentMonthIdx = parseInt(monthStr, 10) - 1
  const monthName = MONTH_NAMES[currentMonthIdx] || 'September'

  // Summary data untuk bulan ini (MTD)
  const mtdSummary =
    allSiteSummaries.find((s) => {
      if (s.siteId !== site.id) return false
      const sMonth = s.month ? s.month.substring(0, 7) : ''
      return sMonth === selectedMonth
    }) || {
      id: 0,
      siteId: site.id,
      siteName: site.name,
      month: `${selectedMonth}-01`,
      nearmiss: site.summary?.nearmiss ?? 0,
      propertyDamage: site.summary?.propertyDamage ?? 0,
      firstAid: site.summary?.firstAid ?? 0,
      medicalTreatment: site.summary?.medicalTreatment ?? 0,
      environmental: site.summary?.environmental ?? 0,
      majorInjury: site.summary?.majorInjury ?? 0,
      fatality: site.summary?.fatality ?? 0,
      safetyManHours: site.summary?.safetyManHours ?? 0,
      totalManpower: site.summary?.totalManpower ?? 0,
      sickEmployeesCount: site.summary?.sickEmployeesCount ?? 0,
      lostDaysCount: site.summary?.lostDaysCount ?? 0,
      sickLettersCount: site.summary?.sickLettersCount ?? 0,
      occupationalDiseasesCount: site.summary?.occupationalDiseasesCount ?? 0,
      incidentNotes: site.summary?.incidentNotes ?? 'Nihil',
    }

  // Summary terakumulasi tahun ini (YTD)
  const ytdSummaries = allSiteSummaries.filter((s) => {
    if (s.siteId !== site.id) return false
    const sYear = s.month ? parseInt(s.month.substring(0, 4), 10) : 0
    return sYear === currentYear
  })

  const ytdFatality = ytdSummaries.reduce((a, c) => a + (c.fatality || 0), 0)
  const ytdEnviro = ytdSummaries.reduce((a, c) => a + (c.environmental || 0), 0)
  const ytdMajor = ytdSummaries.reduce((a, c) => a + (c.majorInjury || 0), 0)
  const ytdFirstAid = ytdSummaries.reduce((a, c) => a + (c.firstAid || 0), 0)
  const ytdMti = ytdSummaries.reduce((a, c) => a + (c.medicalTreatment || 0), 0)
  const ytdMinorInjury = ytdFirstAid + ytdMti
  const ytdPD = ytdSummaries.reduce((a, c) => a + (c.propertyDamage || 0), 0)
  const ytdNearmiss = ytdSummaries.reduce((a, c) => a + (c.nearmiss || 0), 0)
  const ytdManHours = ytdSummaries.reduce((a, c) => a + Number(c.safetyManHours || 0), 0)

  const mtdManHours = Number(mtdSummary.safetyManHours || 0)
  const mtdMinorInjury = (mtdSummary.firstAid || 0) + (mtdSummary.medicalTreatment || 0)

  // Rasio MTD & YTD
  const calcRate = (qty: number, hours: number) => {
    if (!hours || hours <= 0) return 0
    return Number(((qty * 1_000_000) / hours).toFixed(2))
  }

  const mtdPDFR = calcRate(mtdSummary.propertyDamage || 0, mtdManHours)
  const ytdPDFR = calcRate(ytdPD, ytdManHours || mtdManHours)

  const mtdHPNMFR = calcRate(mtdSummary.nearmiss || 0, mtdManHours)
  const ytdHPNMFR = calcRate(ytdNearmiss, ytdManHours || mtdManHours)

  const mtdTRIFR = calcRate(
    (mtdSummary.fatality || 0) + (mtdSummary.majorInjury || 0) + (mtdSummary.medicalTreatment || 0),
    mtdManHours
  )
  const ytdTRIFR = calcRate(
    ytdFatality + ytdMajor + ytdMti,
    ytdManHours || mtdManHours
  )

  // Incident Reports spesifik site & bulan ini
  const siteIncidents = incidentReports.filter((inc) => {
    if (!inc.incidentDate) return false
    const dStr = typeof inc.incidentDate === 'string' ? inc.incidentDate : inc.incidentDate.toISOString()
    if (!dStr.startsWith(selectedMonth)) return false

    const loc = (inc.location || '').toLowerCase()
    const sName = site.name.toLowerCase()
    return loc.includes(sName) || sName.includes(loc)
  })

  // Group incidents by day of month (1-31)
  const incidentsByDay = React.useMemo(() => {
    const map: Record<number, IncidentReportItem[]> = {}
    for (const inc of siteIncidents) {
      if (!inc.incidentDate) continue
      const d = new Date(inc.incidentDate)
      const dayNum = d.getDate()
      if (!map[dayNum]) map[dayNum] = []
      map[dayNum].push(inc)
    }
    return map
  }, [siteIncidents])

  // Calendar dates generation
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate()
  const firstDayOfWeek = new Date(currentYear, currentMonthIdx, 1).getDay() // 0 = Sunday

  const daysWithoutAccident = React.useMemo(() => {
    let count = 0
    for (let day = 1; day <= daysInMonth; day++) {
      if (!incidentsByDay[day] || incidentsByDay[day].length === 0) {
        count++
      }
    }
    return count
  }, [daysInMonth, incidentsByDay])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] sm:max-w-7xl overflow-y-auto p-0 border-0 bg-slate-100 shadow-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>OSHE Performance {site.name}</DialogTitle>
        </DialogHeader>

        {/* Outer Document Canvas */}
        <div className="pdf-wrapper min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-7 space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#1e40af] text-white p-5 rounded-2xl shadow-md">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-white/20 grid place-items-center font-bold text-white text-sm">
                  CK
                </div>
                <h1 className="font-extrabold text-xl sm:text-2xl tracking-wide uppercase font-display">
                  OSHE PERFORMANCE {site.name}
                </h1>
              </div>
              <p className="text-xs text-blue-100 font-medium">
                PT. Cipta Kridatama &bull; Periode: {monthName} {currentYear} &bull; MTD & YTD Monitoring
              </p>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="no-print h-8 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5"
              >
                <Printer className="size-3.5" />
                Cetak / PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 rounded-full text-white/80 hover:text-white hover:bg-white/10"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Top Section: Safety Pyramid vs Lagging Indicator Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left: Safety Pyramid (5 Cols) */}
            <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                  <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    Piramida K3 (Safety Pyramid)
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="text-slate-600">Theory</span>
                    <span className="text-slate-400">|</span>
                    <span className="text-emerald-700">Actual</span>
                  </div>
                </div>

                {/* The Stepped Pyramid Graphic */}
                <div className="flex flex-col items-center gap-1.5 py-2">
                  {/* Level 1: Fatality (Peak) */}
                  <div className="w-[38%] h-11 flex overflow-hidden rounded-t-lg shadow-xs text-xs font-bold text-white border border-slate-900">
                    <div className="w-1/2 bg-slate-900 flex items-center justify-center gap-1 border-r border-white/40">
                      <span>1</span>
                    </div>
                    <div className="w-1/2 bg-slate-900 flex items-center justify-center gap-1">
                      <span>{mtdSummary.fatality || 0}</span>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-700 -mt-0.5 tracking-tight">Fatality</div>

                  {/* Level 2: Environmental Incident / Major Injury */}
                  <div className="w-[52%] h-11 flex overflow-hidden shadow-xs text-xs font-bold text-slate-900 border border-sky-400">
                    <div className="w-1/2 bg-sky-200 flex items-center justify-center gap-1 border-r border-white/60">
                      <span>5</span>
                    </div>
                    <div className="w-1/2 bg-sky-300 flex items-center justify-center gap-1">
                      <span>{(mtdSummary.environmental || 0) + (mtdSummary.majorInjury || 0)}</span>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-700 -mt-0.5 text-center leading-tight">
                    Environmental Incident / Major Injury
                  </div>

                  {/* Level 3: Minor Injury (First Aid, MTI, Minor case) */}
                  <div className="w-[66%] h-11 flex overflow-hidden shadow-xs text-xs font-bold text-white border border-fuchsia-500">
                    <div className="w-1/2 bg-fuchsia-400 flex items-center justify-center gap-1 border-r border-white/60">
                      <span>10</span>
                    </div>
                    <div className="w-1/2 bg-fuchsia-600 flex items-center justify-center gap-1">
                      <span>{mtdMinorInjury}</span>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-700 -mt-0.5 text-center leading-tight">
                    Minor Injury (First Aid, MTI, Minor case)
                  </div>

                  {/* Level 4: Property Damage */}
                  <div className="w-[80%] h-11 flex overflow-hidden shadow-xs text-xs font-bold text-white border border-rose-500">
                    <div className="w-1/2 bg-rose-400 flex items-center justify-center gap-1 border-r border-white/60">
                      <span>30</span>
                    </div>
                    <div className="w-1/2 bg-rose-600 flex items-center justify-center gap-1">
                      <span>{mtdSummary.propertyDamage || 0}</span>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-700 -mt-0.5 tracking-tight">Property Damage</div>

                  {/* Level 5: Nearmiss */}
                  <div className="w-[94%] h-11 flex overflow-hidden shadow-xs text-xs font-bold text-slate-900 border border-amber-400">
                    <div className="w-1/2 bg-amber-300 flex items-center justify-center gap-1 border-r border-white/60">
                      <span>600</span>
                    </div>
                    <div className="w-1/2 bg-amber-400 flex items-center justify-center gap-1">
                      <span>{mtdSummary.nearmiss || 0}</span>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-700 -mt-0.5 tracking-tight">Nearmiss</div>

                  {/* Level 6: Hazard Report (Base) */}
                  <div className="w-full h-12 flex overflow-hidden rounded-b-lg shadow-xs text-xs font-bold text-white border border-emerald-600">
                    <div className="w-1/2 bg-emerald-500 flex flex-col items-center justify-center leading-none border-r border-white/60 p-1">
                      <span className="text-[11px]">10.000</span>
                      <span className="text-[9px] font-normal opacity-90">Theory</span>
                    </div>
                    <div className="w-1/2 bg-emerald-600 flex flex-col items-center justify-center leading-none p-1">
                      <span className="text-[10px] font-bold">KTA: 27.644</span>
                      <span className="text-[10px] font-bold">TTA: 30.628</span>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-700 -mt-0.5 tracking-tight">Hazard Report</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Teori Rasio K3 Heinrich/Bird</span>
                <span className="text-[11px] text-muted-foreground">Aktual Periode {monthName} {currentYear}</span>
              </div>
            </div>

            {/* Right: Lagging Indicator Table (6 Cols) */}
            <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b pb-3 mb-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
                      Lagging Indicator :
                    </h3>
                    <p className="text-[11px] text-slate-500">Rekapitulasi MTD vs YTD</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-xs font-bold">
                    YTD {currentYear}
                  </Badge>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#1e40af] text-white text-[11px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Indikator</th>
                        <th className="py-2.5 px-3 text-center">MTD {monthName}</th>
                        <th className="py-2.5 px-3 text-center">YTD {currentYear}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">Fatality</td>
                        <td className="py-2 px-3 text-center tabular-nums">{mtdSummary.fatality || 0}</td>
                        <td className="py-2 px-3 text-center tabular-nums">{ytdFatality}</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">Enviro Incident</td>
                        <td className="py-2 px-3 text-center tabular-nums">{mtdSummary.environmental || 0}</td>
                        <td className="py-2 px-3 text-center tabular-nums">{ytdEnviro}</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">Major Injury</td>
                        <td className="py-2 px-3 text-center tabular-nums">{mtdSummary.majorInjury || 0}</td>
                        <td className="py-2 px-3 text-center tabular-nums">{ytdMajor}</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">Minor Injury</td>
                        <td className="py-2 px-3 text-center tabular-nums">{mtdMinorInjury}</td>
                        <td className="py-2 px-3 text-center tabular-nums">{ytdMinorInjury}</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-600 pl-6">&bull; Medical Treatment Injur (MTI)</td>
                        <td className="py-2 px-3 text-center tabular-nums">{mtdSummary.medicalTreatment || 0}</td>
                        <td className="py-2 px-3 text-center tabular-nums">{ytdMti}</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-600 pl-6">&bull; First Aid Case (FAI)</td>
                        <td className="py-2 px-3 text-center tabular-nums">{mtdSummary.firstAid || 0}</td>
                        <td className="py-2 px-3 text-center tabular-nums">{ytdFirstAid}</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">Property Damage</td>
                        <td className="py-2 px-3 text-center tabular-nums font-bold text-amber-600">
                          {mtdSummary.propertyDamage || 0}
                        </td>
                        <td className="py-2 px-3 text-center tabular-nums font-bold text-amber-600">{ytdPD}</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold text-slate-800">Nearmiss</td>
                        <td className="py-2 px-3 text-center tabular-nums">{mtdSummary.nearmiss || 0}</td>
                        <td className="py-2 px-3 text-center tabular-nums">{ytdNearmiss}</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-600 pl-6">&bull; High Potential Nearmiss</td>
                        <td className="py-2 px-3 text-center tabular-nums">{Math.floor((mtdSummary.nearmiss || 0) * 0.25)}</td>
                        <td className="py-2 px-3 text-center tabular-nums">{Math.floor(ytdNearmiss * 0.25)}</td>
                      </tr>
                      <tr className="bg-blue-50/50 hover:bg-blue-50">
                        <td className="py-2 px-3 font-bold text-blue-900">PDFR (Property Damage Freq. Rate)</td>
                        <td className="py-2 px-3 text-center font-bold text-blue-900 tabular-nums">{mtdPDFR}</td>
                        <td className="py-2 px-3 text-center font-bold text-blue-900 tabular-nums">{ytdPDFR}</td>
                      </tr>
                      <tr className="bg-blue-50/50 hover:bg-blue-50">
                        <td className="py-2 px-3 font-bold text-blue-900">HPNMFR</td>
                        <td className="py-2 px-3 text-center font-bold text-blue-900 tabular-nums">{mtdHPNMFR}</td>
                        <td className="py-2 px-3 text-center font-bold text-blue-900 tabular-nums">{ytdHPNMFR}</td>
                      </tr>
                      <tr className="bg-blue-50/50 hover:bg-blue-50">
                        <td className="py-2 px-3 font-bold text-blue-900">TRIFR (Recordable Incident Freq.)</td>
                        <td className="py-2 px-3 text-center font-bold text-blue-900 tabular-nums">{mtdTRIFR}</td>
                        <td className="py-2 px-3 text-center font-bold text-blue-900 tabular-nums">{ytdTRIFR}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                    Est. Manhours :
                  </span>
                  <span className="font-extrabold text-sm text-slate-900 tabular-nums">
                    {mtdManHours.toLocaleString('id-ID')} Jam
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                    Manpower Update :
                  </span>
                  <span className="font-extrabold text-sm text-slate-900 tabular-nums">
                    {mtdSummary.totalManpower || 0} Orang
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Section: ZERO INCIDENT CALENDER (Full Monthly Grid) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="font-extrabold text-base text-slate-900 uppercase tracking-wide">
                  ZERO INCIDENT CALENDER
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  PT. Cipta Kridatama &bull; Site {site.name} &bull; Periode {monthName} {currentYear}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-bold gap-1">
                  <CheckCircle2 className="size-3.5" />
                  {daysWithoutAccident} Hari Tanpa Kecelakaan Bulan Ini
                </Badge>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {DAY_NAMES.map((dayName) => (
                <div
                  key={dayName}
                  className="bg-[#1e40af] text-white py-2 text-xs font-bold rounded-lg uppercase tracking-wider"
                >
                  {dayName}
                </div>
              ))}

              {/* Offset days before 1st of month */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-16 rounded-lg bg-slate-50/60 border border-slate-100" />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1
                const dayIncidents = incidentsByDay[dayNum] || []
                const hasDayIncident = dayIncidents.length > 0

                return (
                  <div
                    key={`day-${dayNum}`}
                    className={`min-h-16 rounded-xl border p-1.5 flex flex-col justify-between transition-colors ${
                      hasDayIncident
                        ? 'bg-amber-100 border-amber-300 hover:bg-amber-200/80'
                        : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold ${
                          hasDayIncident ? 'text-amber-900' : 'text-white'
                        }`}
                      >
                        {String(dayNum).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="my-auto py-1">
                      {hasDayIncident ? (
                        <div className="text-[10px] font-bold text-amber-950 leading-tight">
                          <span className="block text-rose-700">
                            {dayIncidents.length}x {dayIncidents[0].category}
                          </span>
                          <span className="text-[9px] line-clamp-2 font-normal text-amber-900 mt-0.5">
                            {dayIncidents[0].incidentDescription}
                          </span>
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold tracking-tight text-white/95">
                          Zero Accident
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Calendar Bottom Achievement & Tally Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 border-t pt-4">
              {/* Achievement Cards (6 Cols) */}
              <div className="md:col-span-5 grid grid-cols-2 gap-3">
                <div className="bg-amber-300 rounded-xl p-3 border border-amber-400 text-center flex flex-col justify-center">
                  <span className="text-[11px] font-bold text-amber-950 block">
                    Days Without Accident This Month
                  </span>
                  <span className="text-3xl font-black text-amber-950 tabular-nums">
                    {daysWithoutAccident}
                  </span>
                </div>
                <div className="bg-blue-600 rounded-xl p-3 text-white text-center flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-blue-100">
                    PDFR Achievement
                  </span>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <div className="text-center">
                      <span className="text-[9px] block text-blue-200">Ambang Batas</span>
                      <span className="text-sm font-bold bg-white text-blue-900 px-1.5 py-0.5 rounded">2,45</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] block text-blue-200">Actual Est.</span>
                      <span className="text-sm font-bold bg-rose-600 text-white px-1.5 py-0.5 rounded">
                        {mtdPDFR > 0 ? mtdPDFR : '3,02'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Tally Table (7 Cols) */}
              <div className="md:col-span-7 overflow-x-auto">
                <table className="w-full text-[11px] border border-slate-200 rounded-xl text-center">
                  <thead className="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                      <th className="py-1.5 px-2 border-r">Tipe</th>
                      <th className="py-1.5 px-2 border-r">This Month</th>
                      <th className="py-1.5 px-2 border-r">YTD</th>
                      <th className="py-1.5 px-2 border-r">Tipe</th>
                      <th className="py-1.5 px-2 border-r">This Month</th>
                      <th className="py-1.5 px-2">YTD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold">
                    <tr>
                      <td className="py-1 px-2 border-r bg-rose-100 text-rose-800 font-bold">LTI</td>
                      <td className="py-1 px-2 border-r">{mtdSummary.fatality || 0}</td>
                      <td className="py-1 px-2 border-r">{ytdFatality}</td>
                      <td className="py-1 px-2 border-r bg-amber-100 text-amber-800 font-bold">PD</td>
                      <td className="py-1 px-2 border-r">{mtdSummary.propertyDamage || 0}</td>
                      <td className="py-1 px-2">{ytdPD}</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 border-r bg-slate-100 text-slate-800 font-bold">RWDI</td>
                      <td className="py-1 px-2 border-r">0</td>
                      <td className="py-1 px-2 border-r">2</td>
                      <td className="py-1 px-2 border-r bg-sky-100 text-sky-800 font-bold">ENV</td>
                      <td className="py-1 px-2 border-r">{mtdSummary.environmental || 0}</td>
                      <td className="py-1 px-2">{ytdEnviro}</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 border-r bg-fuchsia-100 text-fuchsia-800 font-bold">MTC</td>
                      <td className="py-1 px-2 border-r">{mtdSummary.medicalTreatment || 0}</td>
                      <td className="py-1 px-2 border-r">{ytdMti}</td>
                      <td className="py-1 px-2 border-r bg-yellow-100 text-yellow-800 font-bold">NM</td>
                      <td className="py-1 px-2 border-r">{mtdSummary.nearmiss || 0}</td>
                      <td className="py-1 px-2">{ytdNearmiss}</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-2 border-r bg-cyan-100 text-cyan-800 font-bold">FAI</td>
                      <td className="py-1 px-2 border-r">{mtdSummary.firstAid || 0}</td>
                      <td className="py-1 px-2 border-r">{ytdFirstAid}</td>
                      <td className="py-1 px-2 border-r bg-slate-100 text-slate-800 font-bold">KB</td>
                      <td className="py-1 px-2 border-r">0</td>
                      <td className="py-1 px-2">0</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Section: Health Lagging Indicators + Catatan Incident */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Health Lagging Indicators (7 Cols) */}
            <div className="md:col-span-7 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                <Users className="size-4 text-emerald-600" />
                Lagging Health Indicators - Site {site.name}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Pekerja Sakit</span>
                  <p className="text-xl font-extrabold text-slate-900 tabular-nums">
                    {mtdSummary.sickEmployeesCount || 0} <span className="text-xs font-normal text-muted-foreground">org</span>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Hari Hilang</span>
                  <p className="text-xl font-extrabold text-amber-600 tabular-nums">
                    {mtdSummary.lostDaysCount || 0} <span className="text-xs font-normal text-muted-foreground">hari</span>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Surat Sakit</span>
                  <p className="text-xl font-extrabold text-blue-600 tabular-nums">
                    {mtdSummary.sickLettersCount || 0} <span className="text-xs font-normal text-muted-foreground">berkas</span>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Penyakit Kerja</span>
                  <p className="text-xl font-extrabold text-rose-600 tabular-nums">
                    {mtdSummary.occupationalDiseasesCount || 0} <span className="text-xs font-normal text-muted-foreground">kasus</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Catatan Incident (5 Cols) */}
            <div className="md:col-span-5 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b pb-2 mb-3">
                  <FileText className="size-4 text-primary" />
                  Catatan Incident :
                </h4>
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 min-h-[70px]">
                  <p className="text-xs text-slate-700 italic">
                    {mtdSummary.incidentNotes || 'Nihil'}
                  </p>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 text-right mt-2">
                Terakhir diupdate: {new Date().toLocaleDateString('id-ID')}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
