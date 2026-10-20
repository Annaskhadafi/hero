"use client"

import React, { useState } from "react"
import {
  MapPin,
  Users,
  Trophy,
  TrendingUp,
  Award,
  Zap,
  Target,
  BarChart3,
  Search,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { LeaderboardRow } from "./leaderboard-client"

interface SiteAnalyticsTabProps {
  sitePerformance: Array<{
    siteId: number | null
    siteName: string
    employees: number
    totalPoints: number
    periodPoints: number
    penalties: number
    averagePoints: number
  }>
  leaderboard: (LeaderboardRow & { siteId?: number | null; siteName?: string | null })[]
  onSelectSiteFilter?: (siteName: string) => void
}

export function SiteAnalyticsTab({
  sitePerformance,
  leaderboard,
  onSelectSiteFilter,
}: SiteAnalyticsTabProps) {
  const [searchSite, setSearchSite] = useState("")

  const filteredSites = sitePerformance.filter((site) =>
    site.siteName.toLowerCase().includes(searchSite.toLowerCase().trim())
  )

  const topSite = sitePerformance[0]
  const highestAvgSite = [...sitePerformance].sort((a, b) => b.averagePoints - a.averagePoints)[0]
  const totalNationalPoints = sitePerformance.reduce((acc, s) => acc + s.totalPoints, 0)
  const totalEmployeesInSites = sitePerformance.reduce((acc, s) => acc + s.employees, 0)

  // Find top performer for each site
  const siteLeaders = new Map<string, LeaderboardRow>()
  for (const emp of leaderboard) {
    const sName = emp.siteName || "Head Office / Non-Site"
    if (!siteLeaders.has(sName)) {
      siteLeaders.set(sName, emp)
    }
  }

  return (
    <div className="space-y-6">
      {/* 4 SUMMARY STATS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Site Juara Poin
            </span>
            <Trophy className="size-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-lg font-bold text-foreground truncate">{topSite?.siteName || "-"}</h3>
            <p className="text-xs text-muted-foreground">
              Total <strong className="text-amber-600 dark:text-amber-400 font-bold">{topSite?.totalPoints.toLocaleString("id-ID") ?? 0} Pts</strong> ({topSite?.employees ?? 0} staf)
            </p>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Rata-Rata Tertinggi
            </span>
            <Zap className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-lg font-bold text-foreground truncate">{highestAvgSite?.siteName || "-"}</h3>
            <p className="text-xs text-muted-foreground">
              Rata-rata <strong className="text-emerald-600 font-bold">{highestAvgSite?.averagePoints.toLocaleString("id-ID") ?? 0} Pts/orang</strong>
            </p>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Poin Nasional
            </span>
            <BarChart3 className="size-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-lg font-bold text-foreground">
              {totalNationalPoints.toLocaleString("id-ID")}{" "}
              <span className="text-xs font-normal text-muted-foreground">Pts</span>
            </h3>
            <p className="text-xs text-muted-foreground">
              Dari {sitePerformance.length} Site & Lokasi Operasional
            </p>
          </div>
        </Card>

        <Card className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Personil
            </span>
            <Users className="size-4 text-purple-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-lg font-bold text-foreground">{totalEmployeesInSites} Orang</h3>
            <p className="text-xs text-muted-foreground">Terdaftar di seluruh site proyek</p>
          </div>
        </Card>
      </div>

      {/* SEARCH AND GRID OF SITES */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">Peta Performa Poin Seluruh Site Proyek</h3>
            <p className="text-xs text-muted-foreground">
              Bandingkan distribusi skor kinerja per site dan lihat juara dari masing-masing area.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchSite}
              onChange={(e) => setSearchSite(e.target.value)}
              placeholder="Cari nama site..."
              className="h-8.5 rounded-xl pl-8 text-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSites.map((site, index) => {
            const leader = siteLeaders.get(site.siteName)
            const percentOfTop = topSite?.totalPoints > 0 ? (site.totalPoints / topSite.totalPoints) * 100 : 0

            return (
              <Card
                key={`site-card-${site.siteName}`}
                className="overflow-hidden rounded-2xl border border-border/60 bg-card p-4 transition-all hover:border-border hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <h4 className="text-sm font-bold text-foreground">{site.siteName}</h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {site.employees} Anggota Terdaftar
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs"
                  >
                    {site.totalPoints.toLocaleString("id-ID")} Pts
                  </Badge>
                </div>

                {/* PROGRESS BAR VS TOP SITE */}
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Rata-Rata: <strong>{site.averagePoints} Pts/org</strong></span>
                    <span>Bulan Ini: <strong className="text-emerald-600">+{site.periodPoints}</strong></span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${Math.min(percentOfTop, 100)}%` }}
                    />
                  </div>
                </div>

                {/* SITE LEADER CALLOUT */}
                <div className="mt-3 flex items-center justify-between rounded-xl border border-border/40 bg-muted/30 p-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <Award className="size-4 text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Leader di Site Ini:
                      </p>
                      <p className="truncate font-bold text-foreground">
                        {leader ? leader.name : "Belum Ada"}
                      </p>
                    </div>
                  </div>
                  {leader && (
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400 shrink-0">
                      {leader.totalPoints} Pts
                    </span>
                  )}
                </div>

                {/* QUICK JUMP FILTER */}
                {onSelectSiteFilter && (
                  <button
                    type="button"
                    onClick={() => onSelectSiteFilter(site.siteName)}
                    className="mt-3 w-full rounded-xl border border-border/60 bg-background/50 py-1.5 text-center text-[11px] font-semibold text-primary transition-colors hover:bg-muted"
                  >
                    Filter Leaderboard Site Ini →
                  </button>
                )}
              </Card>
            )
          })}
        </div>

        {filteredSites.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-xs text-muted-foreground">
            Tidak ada site yang cocok dengan pencarian "{searchSite}".
          </div>
        )}
      </div>
    </div>
  )
}
