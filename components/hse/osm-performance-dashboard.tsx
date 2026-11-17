'use client'

import React, { useEffect, useState, useTransition } from 'react'
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  HardHat,
  Info,
  MapPin,
  RefreshCw,
  Search,
  Target,
  Users,
} from 'lucide-react'
import {
  getHseOsmPerformanceMetrics,
  type HseOsmPerformanceMetrics,
} from '@/app/actions/hse-osm'
import { Button } from '@/components/ui/button'

interface OsmPerformanceDashboardProps {
  initialYear?: number
  initialSiteId?: number | null
  className?: string
}

function getSiteShortName(name: string): string {
  if (name.includes('Sangatta KABO')) return 'SGT KABO'
  if (name.includes('Balikpapan External')) return 'BPN Ext'
  if (name.includes('Balikpapan')) return 'BPN'
  if (name.includes('BUMA Tanjung')) return 'BUMA'
  if (name.includes('Tj. Redeb')) return 'Tj.Redeb'
  if (name.includes('Tj. Adaro')) return 'Adaro'
  if (name.includes('TU Batu Hijau')) return 'Batu Hijau'
  if (name.includes('TU Gresik')) return 'Gresik'
  if (name.includes('Vale - Sorowako')) return 'Sorowako'
  if (name.includes('Petrosea SDA')) return 'Petrosea'
  if (name.includes('CDE - Bengkulu')) return 'Bengkulu'
  if (name.includes('BSI - Banyuwangi')) return 'Banyuwangi'
  if (name.includes('PKA Musi Rawas')) return 'Musi Rawas'
  if (name.includes('PT SMJ - Berau')) return 'SMJ Berau'
  if (name.includes('KPUC - Malinau')) return 'Malinau'
  if (name.includes('AMM Mifa')) return 'AMM Mifa'
  if (name.includes('AMM Tabang')) return 'AMM Tabang'
  if (name.includes('PPA TJ-Enim')) return 'PPA TJ'
  if (name.includes('PPA BIB')) return 'PPA BIB'
  if (name.includes('CK BIB')) return 'CK BIB'
  if (name.includes('CK MHU')) return 'CK MHU'
  if (name.includes('CK MIFA')) return 'CK MIFA'
  if (name.includes('CK BMB')) return 'CK BMB'
  if (name.includes('CK DBA')) return 'CK DBA'
  if (name.includes('CK KIM')) return 'CK KIM'
  if (name.includes('CK NCN')) return 'CK NCN'
  if (name.includes('Jakarta')) return 'Jakarta'
  if (name.includes('Makassar')) return 'Makassar'
  if (name.includes('Palembang')) return 'Palembang'
  if (name.includes('Pekanbaru')) return 'Pekanbaru'
  if (name.includes('Sebamban')) return 'Sebamban'
  return name.replace(/^(PT |CV )/, '').slice(0, 8)
}

export function OsmPerformanceDashboard({
  initialYear = new Date().getFullYear(),
  initialSiteId = null,
  className = '',
}: OsmPerformanceDashboardProps) {
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<HseOsmPerformanceMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Top Filter state
  const [selectedYear, setSelectedYear] = useState<number>(initialYear)
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL')
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(initialSiteId)

  // Detail table filters & pagination
  const [detailDeptFilter, setDetailDeptFilter] = useState<string>('ALL')
  const [detailSiteFilter, setDetailSiteFilter] = useState<string>('ALL')
  const [detailSearch, setDetailSearch] = useState<string>('')
  const [detailPage, setDetailPage] = useState<number>(1)
  const detailPageSize = 8

  // Leaderboard pagination
  const [leaderboardPage, setLeaderboardPage] = useState<number>(1)
  const leaderboardPageSize = 7

  const fetchMetrics = () => {
    setIsLoading(true)
    startTransition(async () => {
      const res = await getHseOsmPerformanceMetrics({
        year: selectedYear,
        department: selectedDepartment,
        siteId: selectedSiteId,
      })
      if (res.success && res.data) {
        setData(res.data)
      }
      setIsLoading(false)
    })
  }

  useEffect(() => {
    fetchMetrics()
  }, [selectedYear, selectedDepartment, selectedSiteId])

  // Filter detail rows
  const filteredDetailRows = (data?.monthlyBreakdown || []).filter((row) => {
    if (detailDeptFilter !== 'ALL' && row.department !== detailDeptFilter) return false
    if (detailSiteFilter !== 'ALL' && row.siteName !== detailSiteFilter) return false
    if (detailSearch.trim()) {
      const q = detailSearch.toLowerCase()
      const matchName = row.employeeName.toLowerCase().includes(q)
      const matchDept = row.department.toLowerCase().includes(q)
      const matchSite = row.siteName.toLowerCase().includes(q)
      if (!matchName && !matchDept && !matchSite) return false
    }
    return true
  })

  const totalDetailPages = Math.max(1, Math.ceil(filteredDetailRows.length / detailPageSize))
  const paginatedDetailRows = filteredDetailRows.slice(
    (detailPage - 1) * detailPageSize,
    detailPage * detailPageSize
  )

  // Leaderboard rows: all active sites from Master Data
  const leaderboardRows = data?.siteLeaderboard || []
  const totalLeaderboardPages = Math.max(1, Math.ceil(leaderboardRows.length / leaderboardPageSize))
  const paginatedLeaderboard = leaderboardRows.slice(
    (leaderboardPage - 1) * leaderboardPageSize,
    leaderboardPage * leaderboardPageSize
  )

  // All sites from master data for combo/stacked chart
  const chartSites = data?.siteLeaderboard || []
  const maxChartValue = Math.max(
    6,
    ...chartSites.map((s) => s.q1 + s.q2 + s.q3 + s.q4)
  )

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <div
      className={`rounded-2xl border border-sky-100 dark:border-sky-950/60 bg-gradient-to-b from-sky-50/40 via-background to-background p-4 sm:p-5 space-y-4 shadow-sm ${className}`}
    >
      {/* 1. Header Bar & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                HSE On Spot Monitoring Performance
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-full">
                Live Analytics
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Pemantauan kepatuhan inspeksi rutin lapangan (wajib minimal 2x sebulan per inisiator).
            </p>
          </div>
        </div>

        {/* Filters: Tahun, Department, Site */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tahun */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 h-9 text-xs">
            <Calendar className="size-3.5 text-muted-foreground" />
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value))
                setDetailPage(1)
              }}
              className="bg-transparent font-medium focus:outline-none cursor-pointer"
            >
              {(data?.availableYears || [2025, 2026, 2027]).map((yr) => (
                <option key={yr} value={yr}>
                  Tahun {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 h-9 text-xs">
            <Users className="size-3.5 text-muted-foreground" />
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value)
                setDetailPage(1)
              }}
              className="bg-transparent font-medium focus:outline-none max-w-[150px] truncate cursor-pointer"
            >
              <option value="ALL">Semua Dept.</option>
              {(data?.availableDepartments || []).map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Site (replaces Contractor) */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 h-9 text-xs">
            <MapPin className="size-3.5 text-muted-foreground" />
            <select
              value={selectedSiteId ?? 'ALL'}
              onChange={(e) => {
                const val = e.target.value === 'ALL' ? null : Number(e.target.value)
                setSelectedSiteId(val)
                setDetailPage(1)
              }}
              className="bg-transparent font-medium focus:outline-none max-w-[150px] truncate cursor-pointer"
            >
              <option value="ALL">Semua Site</option>
              {(data?.availableSites || []).map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={isLoading}
            className="h-9 px-2.5 text-xs gap-1.5"
            title="Refresh Performance"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 2. Top Performance Scorecards (PTQ & Q1 - Q4) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* PTQ Percentage Card (Green prominent) */}
        <div className="col-span-2 sm:col-span-1 rounded-xl bg-gradient-to-br from-emerald-600 to-green-600 text-white p-3.5 shadow-md shadow-emerald-600/15 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-100 flex items-center gap-1.5">
              <Target className="size-3.5" />
              PTQ Percentage
            </span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-medium">Annual</span>
          </div>
          <div className="my-2">
            <div className="text-3xl sm:text-4xl font-black tracking-tight">
              {data?.overallPercentage ?? 0}%
            </div>
            <p className="text-[11px] text-emerald-100 mt-0.5">
              {data?.totalSessions ?? 0} dari {data?.totalTarget ?? 0} sesi target
            </p>
          </div>
          <div className="w-full bg-emerald-950/20 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, data?.overallPercentage ?? 0)}%` }}
            />
          </div>
        </div>

        {/* Q1 Card */}
        <div className="rounded-xl border border-border/80 bg-card p-3 flex flex-col justify-between shadow-2xs hover:border-emerald-300/80 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="size-3 text-emerald-500" />
              Q1
            </span>
            <span className="text-[10px] text-muted-foreground/80">Jan - Mar</span>
          </div>
          <div className="my-1.5 text-2xl font-bold tracking-tight text-foreground">
            {data?.q1Percentage ?? 0}%
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Target Q1</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {data?.q1Percentage && data.q1Percentage >= 100 ? 'Tercapai' : 'On Track'}
            </span>
          </div>
        </div>

        {/* Q2 Card */}
        <div className="rounded-xl border border-border/80 bg-card p-3 flex flex-col justify-between shadow-2xs hover:border-sky-300/80 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="size-3 text-sky-500" />
              Q2
            </span>
            <span className="text-[10px] text-muted-foreground/80">Apr - Jun</span>
          </div>
          <div className="my-1.5 text-2xl font-bold tracking-tight text-foreground">
            {data?.q2Percentage ?? 0}%
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Target Q2</span>
            <span className="font-semibold text-sky-600 dark:text-sky-400">
              {data?.q2Percentage && data.q2Percentage >= 100 ? 'Tercapai' : 'On Track'}
            </span>
          </div>
        </div>

        {/* Q3 Card */}
        <div className="rounded-xl border border-border/80 bg-card p-3 flex flex-col justify-between shadow-2xs hover:border-pink-300/80 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="size-3 text-pink-500" />
              Q3
            </span>
            <span className="text-[10px] text-muted-foreground/80">Jul - Sep</span>
          </div>
          <div className="my-1.5 text-2xl font-bold tracking-tight text-foreground">
            {data?.q3Percentage ?? 0}%
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Target Q3</span>
            <span className="font-semibold text-pink-600 dark:text-pink-400">
              {data?.q3Percentage && data.q3Percentage >= 100 ? 'Tercapai' : 'On Track'}
            </span>
          </div>
        </div>

        {/* Q4 Card */}
        <div className="rounded-xl border border-border/80 bg-card p-3 flex flex-col justify-between shadow-2xs hover:border-amber-300/80 transition-colors">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="size-3 text-amber-500" />
              Q4
            </span>
            <span className="text-[10px] text-muted-foreground/80">Okt - Des</span>
          </div>
          <div className="my-1.5 text-2xl font-bold tracking-tight text-foreground">
            {data?.q4Percentage ?? 0}%
          </div>
          <div className="text-[10px] text-muted-foreground flex items-center justify-between">
            <span>Target Q4</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {data?.q4Percentage && data.q4Percentage >= 100 ? 'Tercapai' : 'Berjalan'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Middle Grid: Leaderboard Site + Combo/Stacked Chart + Policy Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left: Site Compliance Leaderboard (4 cols) */}
        <div className="lg:col-span-4 rounded-xl border bg-card p-3.5 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Peringkat Kepatuhan Site</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold border border-blue-200/60 dark:border-blue-800">
                  {leaderboardRows.length} Lokasi Site (Master Data)
                </span>
              </div>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                Percentage ▼
              </span>
            </div>

            {/* Table */}
            <div className="divide-y divide-border/50 text-xs mt-1">
              <div className="grid grid-cols-12 py-1.5 font-semibold text-muted-foreground text-[11px]">
                <div className="col-span-2">No.</div>
                <div className="col-span-6">Site</div>
                <div className="col-span-4 text-right">Capaian</div>
              </div>

              {paginatedLeaderboard.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Belum ada data kepatuhan Site pada tahun {selectedYear}.
                </div>
              ) : (
                paginatedLeaderboard.map((site, idx) => {
                  const globalIdx = (leaderboardPage - 1) * leaderboardPageSize + idx + 1
                  return (
                    <div
                      key={site.siteId ?? site.siteName}
                      className="grid grid-cols-12 py-2 items-center hover:bg-muted/30 transition-colors"
                    >
                      <div className="col-span-2 font-mono text-muted-foreground text-[11px]">
                        {globalIdx}.
                      </div>
                      <div className="col-span-6 font-medium text-foreground truncate pr-2">
                        {site.siteName}
                      </div>
                      <div className="col-span-4 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-bold rounded-md ${
                            site.percentage >= 100
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : site.percentage >= 70
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {site.percentage}%
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Leaderboard Pagination */}
          {totalLeaderboardPages > 1 && (
            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-border/60 text-[11px] text-muted-foreground">
              <span>
                Halaman {leaderboardPage} dari {totalLeaderboardPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setLeaderboardPage((p) => Math.max(1, p - 1))}
                  disabled={leaderboardPage === 1}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setLeaderboardPage((p) => Math.min(totalLeaderboardPages, p + 1))}
                  disabled={leaderboardPage === totalLeaderboardPages}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Center: HSE Performance - Stacked Bar Chart (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border bg-card p-3.5 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <BarChart3 className="size-4 text-blue-600" />
                <span>HSE Performance — Stacked Chart per Site</span>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-2 text-[10px]">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-xs bg-emerald-500" /> Q1
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-xs bg-sky-500" /> Q2
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-xs bg-pink-500" /> Q3
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-xs bg-amber-500" /> Q4
                </span>
              </div>
            </div>

            {/* Visual Stacked Bars (Scrollable to accommodate all 35 sites) */}
            <div className="pt-2">
              {chartSites.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Belum ada data lokasi site di Master Data.
                </div>
              ) : (
                <div className="overflow-x-auto pb-2 scrollbar-thin">
                  <div className="h-48 min-w-[950px] w-full flex items-end justify-between gap-1 sm:gap-1.5 px-2 pb-5 pt-3 border-b border-border/70 relative">
                    {/* Horizontal Grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                      <div className="border-b border-dashed border-foreground" />
                      <div className="border-b border-dashed border-foreground" />
                      <div className="border-b border-dashed border-foreground" />
                    </div>

                    {chartSites.map((site) => {
                      const total = site.q1 + site.q2 + site.q3 + site.q4
                      const barHeightPct = maxChartValue > 0 ? (total / maxChartValue) * 100 : 0
                      const q1Pct = total > 0 ? (site.q1 / total) * 100 : 0
                      const q2Pct = total > 0 ? (site.q2 / total) * 100 : 0
                      const q3Pct = total > 0 ? (site.q3 / total) * 100 : 0
                      const q4Pct = total > 0 ? (site.q4 / total) * 100 : 0
                      const shortName = getSiteShortName(site.siteName)

                      return (
                        <div
                          key={site.siteId ?? site.siteName}
                          className="flex-1 min-w-[24px] max-w-[36px] flex flex-col items-center h-full justify-end group relative cursor-pointer"
                        >
                          {/* Tooltip */}
                          <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-[10px] px-2.5 py-1.5 rounded-lg shadow-lg pointer-events-none z-30 whitespace-nowrap border border-border">
                            <div className="font-bold text-xs">{site.siteName}</div>
                            <div className="text-muted-foreground">Total: {total} sesi ({site.percentage}%)</div>
                            <div className="flex gap-2 text-[9px] mt-0.5">
                              <span className="text-emerald-600">Q1: {site.q1}</span>
                              <span className="text-sky-600">Q2: {site.q2}</span>
                              <span className="text-pink-600">Q3: {site.q3}</span>
                              <span className="text-amber-600">Q4: {site.q4}</span>
                            </div>
                          </div>

                          {/* Stacked Bar Container */}
                          <div
                            className="w-full rounded-t-sm flex flex-col-reverse overflow-hidden transition-all duration-300 shadow-2xs"
                            style={{ height: `${total > 0 ? Math.max(8, barHeightPct) : 3}%` }}
                          >
                            {total === 0 ? (
                              <div className="bg-muted-foreground/20 w-full h-full rounded-t-xs" title={`${site.siteName}: 0 sesi`} />
                            ) : (
                              <>
                                {site.q1 > 0 && (
                                  <div
                                    style={{ height: `${q1Pct}%` }}
                                    className="bg-emerald-500 hover:brightness-110"
                                    title={`Q1: ${site.q1}`}
                                  />
                                )}
                                {site.q2 > 0 && (
                                  <div
                                    style={{ height: `${q2Pct}%` }}
                                    className="bg-sky-500 hover:brightness-110"
                                    title={`Q2: ${site.q2}`}
                                  />
                                )}
                                {site.q3 > 0 && (
                                  <div
                                    style={{ height: `${q3Pct}%` }}
                                    className="bg-pink-500 hover:brightness-110"
                                    title={`Q3: ${site.q3}`}
                                  />
                                )}
                                {site.q4 > 0 && (
                                  <div
                                    style={{ height: `${q4Pct}%` }}
                                    className="bg-amber-500 hover:brightness-110"
                                    title={`Q4: ${site.q4}`}
                                  />
                                )}
                              </>
                            )}
                          </div>

                          {/* X-axis Label */}
                          <span
                            className="text-[9px] font-mono text-muted-foreground truncate w-full text-center mt-1.5 block group-hover:text-foreground group-hover:font-semibold"
                            title={site.siteName}
                          >
                            {shortName}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reference Image centered blue pill: Lokasi Site */}
          <div className="pt-2 flex flex-col items-center justify-center gap-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-xs">
              <span>▲</span>
              <span>Lokasi Site (Master Data)</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Sumbu X: 35 Lokasi Site Master Data &nbsp;•&nbsp; Sumbu Y: Total Frekuensi Sesi OSM
            </div>
          </div>
        </div>

        {/* Right: Policy Callout Card (3 cols) */}
        <div className="lg:col-span-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-gradient-to-br from-sky-50/80 via-blue-50/40 to-indigo-50/40 dark:from-sky-950/20 dark:via-blue-950/20 dark:to-indigo-950/20 p-4 flex flex-col justify-between shadow-2xs">
          <div className="space-y-3">
            <div className="size-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-600/30">
              <HardHat className="size-5" />
            </div>

            <div>
              <h3 className="text-sm font-bold text-blue-950 dark:text-blue-200 leading-snug">
                Standar Kepatuhan Inspeksi OSM
              </h3>
              <p className="text-xs text-blue-900/80 dark:text-blue-300/80 mt-1 leading-relaxed">
                Persentase pemenuhan dalam sebulan, diwajibkan minimal{' '}
                <span className="inline-block px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 font-bold text-xs shadow-2xs">
                  2 kali minimal
                </span>{' '}
                untuk melakukan on spot monitoring keselamatan di lapangan.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-blue-200/60 dark:border-blue-900/40 flex items-center justify-between text-[11px] text-blue-800 dark:text-blue-300">
            <span className="flex items-center gap-1 font-medium">
              <Info className="size-3.5" /> Target Bulanan:
            </span>
            <span className="font-bold text-xs bg-white dark:bg-blue-900 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
              2 Sesi / Bulan
            </span>
          </div>
        </div>
      </div>

      {/* 4. Bottom Detail Table: HSE Performance - Detail (per Section / Inspector) */}
      <div className="rounded-xl border bg-card p-3.5 sm:p-4 shadow-2xs space-y-3">
        {/* Table Title & Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-md bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <HardHat className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                HSE Performance — Detail (per Section & Personil)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Matriks rincian capaian inspeksi bulanan per inisiator (Januari — Desember {selectedYear}).
              </p>
            </div>
          </div>

          {/* Sub-Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative w-44 sm:w-52">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cari inisiator / site..."
                value={detailSearch}
                onChange={(e) => {
                  setDetailSearch(e.target.value)
                  setDetailPage(1)
                }}
                className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-border bg-background text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Filter Section / Dept */}
            <div className="flex items-center gap-1 bg-background border border-border rounded-lg px-2 h-8 text-xs">
              <Filter className="size-3 text-muted-foreground" />
              <select
                value={detailDeptFilter}
                onChange={(e) => {
                  setDetailDeptFilter(e.target.value)
                  setDetailPage(1)
                }}
                className="bg-transparent font-medium focus:outline-none max-w-[120px] truncate cursor-pointer text-[11px]"
              >
                <option value="ALL">Semua Section</option>
                {(data?.availableDepartments || []).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Location / Site */}
            <div className="flex items-center gap-1 bg-background border border-border rounded-lg px-2 h-8 text-xs">
              <MapPin className="size-3 text-muted-foreground" />
              <select
                value={detailSiteFilter}
                onChange={(e) => {
                  setDetailSiteFilter(e.target.value)
                  setDetailPage(1)
                }}
                className="bg-transparent font-medium focus:outline-none max-w-[120px] truncate cursor-pointer text-[11px]"
              >
                <option value="ALL">Semua Site</option>
                {(data?.availableSites || []).map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Scrollable Monthly Matrix Table */}
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/60 text-muted-foreground font-semibold border-b border-border text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">No.</th>
                <th className="py-2.5 px-3">Dept.</th>
                <th className="py-2.5 px-3">Site</th>
                <th className="py-2.5 px-3 min-w-[140px]">Nama Inisiator</th>
                <th className="py-2.5 px-2.5 text-center font-bold text-foreground bg-muted/80">Target</th>
                {monthNames.map((m) => (
                  <th key={m} className="py-2.5 px-2 text-center w-9">
                    {m}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {paginatedDetailRows.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-8 text-center text-xs text-muted-foreground">
                    Tidak ada data personil atau inspeksi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                paginatedDetailRows.map((row, idx) => {
                  const globalIdx = (detailPage - 1) * detailPageSize + idx + 1
                  const months = [
                    row.jan,
                    row.feb,
                    row.mar,
                    row.apr,
                    row.may,
                    row.jun,
                    row.jul,
                    row.aug,
                    row.sep,
                    row.oct,
                    row.nov,
                    row.dec,
                  ]

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-muted/30 transition-colors font-medium text-foreground"
                    >
                      <td className="py-2 px-3 text-center text-muted-foreground font-mono text-[11px]">
                        {globalIdx}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground truncate max-w-[120px]">
                        {row.department}
                      </td>
                      <td className="py-2 px-3 font-semibold text-foreground truncate max-w-[130px]">
                        {row.siteName}
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-foreground leading-tight truncate">
                          {row.employeeName}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          SN: {row.badgeNumber}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 text-center font-bold bg-muted/30 text-foreground">
                        {row.totalTarget}
                      </td>
                      {months.map((val, mIdx) => (
                        <td
                          key={mIdx}
                          className={`py-2 px-2 text-center font-mono ${
                            val >= 2
                              ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/40 dark:bg-emerald-950/20'
                              : val === 1
                              ? 'text-amber-600 dark:text-amber-400 font-semibold'
                              : 'text-muted-foreground/50'
                          }`}
                        >
                          {val}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-md ${
                            row.percentage >= 100
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : row.percentage >= 70
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {row.percentage}%
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        {totalDetailPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs text-muted-foreground">
            <span>
              Menampilkan {(detailPage - 1) * detailPageSize + 1} -{' '}
              {Math.min(detailPage * detailPageSize, filteredDetailRows.length)} dari{' '}
              {filteredDetailRows.length} personil inisiator
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs gap-1"
                onClick={() => setDetailPage((p) => Math.max(1, p - 1))}
                disabled={detailPage === 1}
              >
                <ChevronLeft className="size-3.5" /> Sebelumnya
              </Button>
              <span className="px-2 text-xs font-medium">
                {detailPage} / {totalDetailPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs gap-1"
                onClick={() => setDetailPage((p) => Math.min(totalDetailPages, p + 1))}
                disabled={detailPage === totalDetailPages}
              >
                Selanjutnya <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
