"use client"

import React, { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Trophy,
  Medal,
  Crown,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Filter,
  User,
  Plus,
  AlertTriangle,
  Award,
  Flame,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Layers,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileSpreadsheet,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SearchableEmployeeSelect } from "@/components/searchable-employee-select"
import {
  getEmployeeGamificationDetail,
  managePointEventAction,
  createPenaltyEvent,
  resolveDispute,
  type EmployeeGamificationDetail,
} from "./actions"
import { LevelConfigPanel, BadgeConfigPanel } from "@/components/gamification-config-panels"

export type LeaderboardRow = {
  id: number
  rank: number
  name: string
  role: string
  department: string | null
  levelName: string | null
  totalPoints: number
  periodPoints: number
  penaltyPoints: number
  trend: string
  needsReview: boolean
}

type TimelineItem = {
  id: string
  eventId: number
  employeeId?: number
  eventType: "point" | "penalty"
  employeeName: string
  type: string
  category: string
  label: string
  points: number
  createdAt: string
}

type DisputeItem = {
  id: number
  penaltyEventId: number
  employeeId: number
  employeeName: string
  reason: string
  status: string
  resolutionNotes: string | null
  createdAt: string
  penaltyCode: string
  pointsDeducted: number
}

type LevelItem = {
  id: number
  name: string
  minPoints: number
  description: string | null
  colorCode: string
  isActive: boolean
}

type BadgeItem = {
  id: number
  name: string
  description: string | null
  iconUrl: string | null
  colorCode: string
  autoAssignRule: string
  autoAssignThreshold: number
  isActive: boolean
}

type EmployeeOption = {
  id: number
  name: string
  role: string
  email: string
  siteId: number
}

interface LeaderboardClientProps {
  initialLeaderboard: LeaderboardRow[]
  analytics: {
    activeEmployees: number
    averagePoints: number
    rewardPoints: number
    adjustmentPoints: number
    penaltyPoints: number
    openDisputes: number
    employeesWithoutActivity: number
    topImprover?: LeaderboardRow
    biggestDrop?: LeaderboardRow
    departmentPerformance: Array<{
      department: string
      employees: number
      points: number
      penalties: number
    }>
    unifiedTimeline: TimelineItem[]
  }
  disputes: DisputeItem[]
  allLevels: LevelItem[]
  allBadges: BadgeItem[]
  employeeOptions: EmployeeOption[]
  canManage: boolean
}

function formatPoints(val: number) {
  if (val > 0) return `+${val.toLocaleString("id-ID")}`
  return val.toLocaleString("id-ID")
}

export function LeaderboardClient({
  initialLeaderboard,
  analytics,
  disputes,
  allLevels,
  allBadges,
  employeeOptions,
  canManage,
}: LeaderboardClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDept, setSelectedDept] = useState("all")
  const [selectedLevel, setSelectedLevel] = useState("all")
  const [selectedSignal, setSelectedSignal] = useState<"all" | "up" | "down" | "review">("all")
  const [sortBy, setSortBy] = useState<"rank" | "points" | "month" | "penalty">("rank")

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  // Modals
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [employeeDetail, setEmployeeDetail] = useState<EmployeeGamificationDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  const [isAwardModalOpen, setIsAwardModalOpen] = useState(false)
  const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false)
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)

  // Options for filtering
  const departments = useMemo(() => {
    const list = Array.from(
      new Set(
        initialLeaderboard
          .map((r) => r.department)
          .filter((d): d is string => Boolean(d && d.trim()))
      )
    ).sort()
    return ["all", ...list]
  }, [initialLeaderboard])

  const levelOptions = useMemo(() => {
    const list = allLevels.map((l) => l.name)
    return ["all", ...list]
  }, [allLevels])

  // Filtered & Sorted Leaderboard
  const filteredLeaderboard = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return initialLeaderboard
      .filter((row) => {
        const matchesQuery =
          !q ||
          row.name.toLowerCase().includes(q) ||
          (row.role && row.role.toLowerCase().includes(q)) ||
          (row.department && row.department.toLowerCase().includes(q))
        const matchesDept = selectedDept === "all" || row.department === selectedDept
        const matchesLvl = selectedLevel === "all" || row.levelName === selectedLevel
        let matchesSignal = true
        if (selectedSignal === "up") matchesSignal = row.trend === "Naik"
        if (selectedSignal === "down") matchesSignal = row.trend === "Turun" || row.periodPoints < 0
        if (selectedSignal === "review") matchesSignal = row.needsReview

        return matchesQuery && matchesDept && matchesLvl && matchesSignal
      })
      .sort((a, b) => {
        if (sortBy === "points") return b.totalPoints - a.totalPoints
        if (sortBy === "month") return b.periodPoints - a.periodPoints
        if (sortBy === "penalty") return b.penaltyPoints - a.penaltyPoints
        return a.rank - b.rank
      })
  }, [initialLeaderboard, searchQuery, selectedDept, selectedLevel, selectedSignal, sortBy])

  // Paginated rows
  const totalPages = Math.ceil(filteredLeaderboard.length / pageSize) || 1
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredLeaderboard.slice(start, start + pageSize)
  }, [filteredLeaderboard, currentPage, pageSize])

  // Top 3 Podium
  const top1 = initialLeaderboard[0] || null
  const top2 = initialLeaderboard[1] || null
  const top3 = initialLeaderboard[2] || null

  // Open detail modal
  const handleOpenEmployeeDetail = async (empId: number) => {
    setSelectedEmployeeId(empId)
    setIsLoadingDetail(true)
    setEmployeeDetail(null)
    try {
      const res = await getEmployeeGamificationDetail(empId)
      if (res.success && res.data) {
        setEmployeeDetail(res.data)
      } else {
        toast.error(res.error || "Gagal memuat detail karyawan")
      }
    } catch {
      toast.error("Terjadi kesalahan saat memuat detail")
    } finally {
      setIsLoadingDetail(false)
    }
  }

  // Handle Add Points
  const handleAwardPointsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmittingAction(true)
    try {
      const formData = new FormData(e.currentTarget)
      formData.set("intent", "create")
      const res = await managePointEventAction(formData)
      if (res.status === "success") {
        toast.success(res.message)
        setIsAwardModalOpen(false)
        startTransition(() => {
          router.refresh()
        })
      } else {
        toast.error(res.message)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah poin")
    } finally {
      setIsSubmittingAction(false)
    }
  }

  // Handle Add Penalty
  const handlePenaltySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmittingAction(true)
    try {
      const formData = new FormData(e.currentTarget)
      formData.set("intent", "create")
      const res = await createPenaltyEvent(formData)
      if (res.status === "success") {
        toast.success(res.message)
        setIsPenaltyModalOpen(false)
        startTransition(() => {
          router.refresh()
        })
      } else {
        toast.error(res.message)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mencatat penalti")
    } finally {
      setIsSubmittingAction(false)
    }
  }

  // Helper level color
  const getLevelColor = (lvlName: string | null) => {
    if (!lvlName) return "#64748b"
    const match = allLevels.find((l) => l.name.toLowerCase() === lvlName.toLowerCase())
    return match ? match.colorCode : "#64748b"
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
              <Trophy className="size-5" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Hall of Fame & Leaderboard
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Sistem Poin Gamifikasi, Peringkat Kinerja, dan Rekognisi Karyawan HERO
              </p>
            </div>
          </div>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setIsAwardModalOpen(true)}
              size="sm"
              className="h-9 gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <Plus className="size-3.5" /> Beri Poin
            </Button>
            <Button
              onClick={() => setIsPenaltyModalOpen(true)}
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 rounded-xl border-amber-300/50 bg-amber-50/50 px-3.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300"
            >
              <ShieldAlert className="size-3.5 text-amber-600" /> Catat Penalti
            </Button>
          </div>
        )}
      </div>

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Karyawan Aktif</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-bold text-foreground">
              {analytics.activeEmployees.toLocaleString("id-ID")}
            </span>
            <span className="text-[11px] text-muted-foreground">orang</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground/80">Memiliki poin aktif</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Rata-Rata Skor</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-bold text-foreground">
              {analytics.averagePoints.toLocaleString("id-ID")}
            </span>
            <span className="text-[11px] text-muted-foreground">poin</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground/80">Skor tim operasional</p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Top Improver
          </p>
          <div className="mt-1 truncate font-display text-lg font-bold text-foreground">
            {analytics.topImprover?.name || "-"}
          </div>
          <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="size-3" />
            {analytics.topImprover ? formatPoints(analytics.topImprover.periodPoints) : "0"} bln ini
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Potongan Penalti
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-bold text-amber-600 dark:text-amber-400">
              -{analytics.penaltyPoints.toLocaleString("id-ID")}
            </span>
            <span className="text-[11px] text-muted-foreground">poin</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground/80">Bulan berjalan</p>
        </div>

        <div className="col-span-2 rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm sm:col-span-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Dispute Terbuka</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-2xl font-bold text-foreground">
              {analytics.openDisputes}
            </span>
            <span className="text-[11px] text-muted-foreground">tiket</span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground/80">Menunggu keputusan HR</p>
        </div>
      </div>

      {/* TOP 3 PODIUM - Hall of Fame */}
      <div className="rounded-3xl border border-border/60 bg-gradient-to-b from-card via-card/90 to-background/50 p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground sm:text-lg">
              <Sparkles className="size-4 text-amber-500" />
              Podium Bintang HERO
            </h2>
            <p className="text-xs text-muted-foreground">
              Tiga peringkat teratas dengan akumulasi skor performa tertinggi
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
            Live Ranking
          </Badge>
        </div>

        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3 sm:gap-4">
          {/* Rank 2 - Silver (Left) */}
          <div
            onClick={() => top2 && handleOpenEmployeeDetail(top2.id)}
            className={`group relative cursor-pointer rounded-2xl border border-slate-200/80 bg-gradient-to-t from-slate-100/60 to-white/90 p-4 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-md dark:border-slate-800/80 dark:from-slate-900/60 dark:to-slate-800/90 ${
              !top2 ? "opacity-40" : ""
            }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-slate-300 text-xs font-bold text-slate-800 shadow ring-2 ring-white dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-900">
                2
              </span>
            </div>
            <div className="mx-auto mt-2 flex size-14 items-center justify-center rounded-full bg-slate-200/80 text-xl font-bold text-slate-700 ring-4 ring-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-800/60">
              {top2 ? top2.name.substring(0, 2).toUpperCase() : "-"}
            </div>
            <h3 className="mt-3 truncate font-display text-sm font-bold text-foreground group-hover:text-primary">
              {top2?.name || "Belum ada"}
            </h3>
            <p className="truncate text-xs text-muted-foreground">{top2?.department || "-"}</p>
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: getLevelColor(top2?.levelName || null) }}
              />
              <span className="text-[11px] font-semibold text-muted-foreground">
                {top2?.levelName || "Novice"}
              </span>
            </div>
            <div className="mt-3 rounded-xl bg-slate-200/60 py-1.5 text-xs font-bold tabular-nums text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              {top2?.totalPoints.toLocaleString("id-ID") || 0} pts
            </div>
            <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              {top2 ? formatPoints(top2.periodPoints) : "0"} bln ini
            </p>
          </div>

          {/* Rank 1 - Champion / Gold (Center - Prominent) */}
          <div
            onClick={() => top1 && handleOpenEmployeeDetail(top1.id)}
            className={`group relative order-first cursor-pointer rounded-2xl border-2 border-amber-400/80 bg-gradient-to-t from-amber-50/70 via-amber-50/30 to-white p-5 text-center shadow-md transition-all hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg dark:border-amber-500/60 dark:from-amber-950/40 dark:via-amber-950/20 dark:to-card sm:order-none sm:scale-105 ${
              !top1 ? "opacity-40" : ""
            }`}
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 text-sm font-extrabold text-amber-950 shadow-md ring-4 ring-white dark:ring-card">
                <Crown className="size-4 fill-amber-950 text-amber-950" />
              </span>
            </div>
            <div className="mx-auto mt-2 flex size-18 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400/20 to-yellow-400/30 text-2xl font-black text-amber-700 ring-4 ring-amber-400/40 dark:text-amber-300 dark:ring-amber-500/30">
              {top1 ? top1.name.substring(0, 2).toUpperCase() : "-"}
            </div>
            <h3 className="mt-3 truncate font-display text-base font-extrabold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400">
              {top1?.name || "Belum ada"}
            </h3>
            <p className="truncate text-xs font-medium text-muted-foreground">{top1?.department || "-"}</p>
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: getLevelColor(top1?.levelName || null) }}
              />
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                {top1?.levelName || "Grandmaster"}
              </span>
            </div>
            <div className="mt-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 py-2 font-display text-sm font-black tabular-nums text-amber-900 dark:text-amber-200">
              {top1?.totalPoints.toLocaleString("id-ID") || 0} pts
            </div>
            <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {top1 ? formatPoints(top1.periodPoints) : "0"} bln ini
            </p>
          </div>

          {/* Rank 3 - Bronze (Right) */}
          <div
            onClick={() => top3 && handleOpenEmployeeDetail(top3.id)}
            className={`group relative cursor-pointer rounded-2xl border border-amber-800/30 bg-gradient-to-t from-amber-100/40 to-white/90 p-4 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-amber-700/50 hover:shadow-md dark:border-amber-900/40 dark:from-amber-950/30 dark:to-card ${
              !top3 ? "opacity-40" : ""
            }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-amber-700 text-xs font-bold text-amber-100 shadow ring-2 ring-white dark:ring-slate-900">
                3
              </span>
            </div>
            <div className="mx-auto mt-2 flex size-14 items-center justify-center rounded-full bg-amber-800/10 text-xl font-bold text-amber-800 ring-4 ring-amber-800/20 dark:bg-amber-900/30 dark:text-amber-300">
              {top3 ? top3.name.substring(0, 2).toUpperCase() : "-"}
            </div>
            <h3 className="mt-3 truncate font-display text-sm font-bold text-foreground group-hover:text-primary">
              {top3?.name || "Belum ada"}
            </h3>
            <p className="truncate text-xs text-muted-foreground">{top3?.department || "-"}</p>
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: getLevelColor(top3?.levelName || null) }}
              />
              <span className="text-[11px] font-semibold text-muted-foreground">
                {top3?.levelName || "Novice"}
              </span>
            </div>
            <div className="mt-3 rounded-xl bg-amber-800/10 py-1.5 text-xs font-bold tabular-nums text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              {top3?.totalPoints.toLocaleString("id-ID") || 0} pts
            </div>
            <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              {top3 ? formatPoints(top3.periodPoints) : "0"} bln ini
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="leaderboard" className="space-y-4">
        <div className="flex flex-col gap-3 border-b border-border/60 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="h-10 bg-muted/60 p-1">
            <TabsTrigger value="leaderboard" className="gap-1.5 text-xs font-medium">
              <Trophy className="size-3.5" /> Peringkat Karyawan
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5 text-xs font-medium">
              <Clock className="size-3.5" /> Timeline Aktivitas
            </TabsTrigger>
            <TabsTrigger value="disputes" className="gap-1.5 text-xs font-medium">
              <AlertTriangle className="size-3.5" /> Dispute ({disputes.filter((d) => d.status === "pending").length})
            </TabsTrigger>
            {canManage && (
              <TabsTrigger value="settings" className="gap-1.5 text-xs font-medium">
                <Layers className="size-3.5" /> Aturan & Badge
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* TAB 1: MAIN LEADERBOARD */}
        <TabsContent value="leaderboard" className="space-y-4 pt-1">
          {/* Controls Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            {/* Search */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Cari nama, role, dept..."
                className="h-9 rounded-xl pl-9 text-xs"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">Semua Departemen</option>
                {departments
                  .filter((d) => d !== "all")
                  .map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
              </select>

              <select
                value={selectedLevel}
                onChange={(e) => {
                  setSelectedLevel(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-9 rounded-xl border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="all">Semua Level</option>
                {levelOptions
                  .filter((l) => l !== "all")
                  .map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
              </select>

              {/* Signal Filter Chips */}
              <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSignal("all")
                    setCurrentPage(1)
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    selectedSignal === "all"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSignal("up")
                    setCurrentPage(1)
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    selectedSignal === "up"
                      ? "bg-emerald-50 text-emerald-700 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Naik ↗
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSignal("down")
                    setCurrentPage(1)
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    selectedSignal === "down"
                      ? "bg-rose-50 text-rose-700 shadow-sm dark:bg-rose-950/40 dark:text-rose-300"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Turun ↘
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSignal("review")
                    setCurrentPage(1)
                  }}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    selectedSignal === "review"
                      ? "bg-amber-50 text-amber-700 shadow-sm dark:bg-amber-950/40 dark:text-amber-300"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Review ⚠️
                </button>
              </div>

              {(searchQuery || selectedDept !== "all" || selectedLevel !== "all" || selectedSignal !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("")
                    setSelectedDept("all")
                    setSelectedLevel("all")
                    setSelectedSignal("all")
                    setCurrentPage(1)
                  }}
                  className="h-9 rounded-xl px-2.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 pl-4 pr-2 font-semibold">Rank</th>
                    <th className="py-3 pr-3 font-semibold">Karyawan</th>
                    <th className="py-3 pr-3 font-semibold">Departemen</th>
                    <th className="py-3 pr-3 font-semibold">Level</th>
                    <th className="py-3 pr-3 text-right font-semibold">Total Poin</th>
                    <th className="py-3 pr-3 text-right font-semibold">Bulan Ini</th>
                    <th className="py-3 pr-3 text-right font-semibold">Penalti</th>
                    <th className="py-3 pr-3 text-center font-semibold">Status</th>
                    <th className="py-3 pr-4 text-center font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {paginatedRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                        Tidak ada data karyawan yang cocok dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => {
                      const isTop1 = row.rank === 1
                      const isTop2 = row.rank === 2
                      const isTop3 = row.rank === 3
                      return (
                        <tr
                          key={`leaderboard-row-${row.id}`}
                          className="group transition-colors hover:bg-muted/40"
                        >
                          {/* Rank */}
                          <td className="py-3 pl-4 pr-2 font-semibold">
                            {isTop1 ? (
                              <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-400 font-bold text-amber-950 shadow-sm">
                                1
                              </span>
                            ) : isTop2 ? (
                              <span className="inline-flex size-6 items-center justify-center rounded-full bg-slate-300 font-bold text-slate-800 shadow-sm dark:bg-slate-700 dark:text-slate-200">
                                2
                              </span>
                            ) : isTop3 ? (
                              <span className="inline-flex size-6 items-center justify-center rounded-full bg-amber-700 font-bold text-amber-100 shadow-sm">
                                3
                              </span>
                            ) : (
                              <span className="inline-flex size-6 items-center justify-center rounded-lg bg-muted/60 text-[11px] font-semibold text-muted-foreground">
                                #{row.rank}
                              </span>
                            )}
                          </td>

                          {/* Employee */}
                          <td className="py-3 pr-3">
                            <button
                              type="button"
                              onClick={() => handleOpenEmployeeDetail(row.id)}
                              className="flex items-center gap-2.5 text-left group-hover:underline"
                            >
                              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                {row.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-foreground">{row.name}</div>
                                <div className="truncate text-[10px] text-muted-foreground">{row.role || "-"}</div>
                              </div>
                            </button>
                          </td>

                          {/* Department */}
                          <td className="py-3 pr-3 text-muted-foreground">
                            {row.department || "-"}
                          </td>

                          {/* Level */}
                          <td className="py-3 pr-3">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-foreground">
                              <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: getLevelColor(row.levelName) }}
                              />
                              {row.levelName || "Novice"}
                            </span>
                          </td>

                          {/* Total Points */}
                          <td className="py-3 pr-3 text-right font-display font-bold tabular-nums text-foreground">
                            {row.totalPoints.toLocaleString("id-ID")}
                          </td>

                          {/* This Month Delta */}
                          <td className="py-3 pr-3 text-right font-medium tabular-nums">
                            {row.periodPoints > 0 ? (
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatPoints(row.periodPoints)}
                              </span>
                            ) : row.periodPoints < 0 ? (
                              <span className="font-semibold text-rose-600 dark:text-rose-400">
                                {formatPoints(row.periodPoints)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </td>

                          {/* Penalty Points */}
                          <td className="py-3 pr-3 text-right font-medium tabular-nums">
                            {row.penaltyPoints > 0 ? (
                              <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                                -{row.penaltyPoints}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>

                          {/* Signal */}
                          <td className="py-3 pr-3 text-center">
                            {row.needsReview ? (
                              <Badge className="rounded-full bg-amber-100 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                Review
                              </Badge>
                            ) : row.trend === "Naik" ? (
                              <Badge className="rounded-full bg-emerald-100 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                Naik
                              </Badge>
                            ) : row.trend === "Turun" ? (
                              <Badge className="rounded-full bg-rose-100 text-[10px] font-semibold text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                                Turun
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="rounded-full text-[10px] text-muted-foreground">
                                Stabil
                              </Badge>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 pr-4 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEmployeeDetail(row.id)}
                              className="h-7 rounded-lg px-2 text-[11px] font-medium"
                            >
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

            {/* Pagination Controls */}
            <div className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Menampilkan{" "}
                <span className="font-semibold text-foreground">
                  {filteredLeaderboard.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </span>{" "}
                -{" "}
                <span className="font-semibold text-foreground">
                  {Math.min(currentPage * pageSize, filteredLeaderboard.length)}
                </span>{" "}
                dari <span className="font-semibold text-foreground">{filteredLeaderboard.length}</span> karyawan
              </p>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 gap-1 rounded-xl px-2.5 text-xs"
                >
                  <ChevronLeft className="size-3.5" /> Sebelumnya
                </Button>
                <span className="px-2 text-xs font-semibold text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 gap-1 rounded-xl px-2.5 text-xs"
                >
                  Berikutnya <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: UNIFIED TIMELINE */}
        <TabsContent value="timeline" className="space-y-4 pt-1">
          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
            {/* Timeline Stream */}
            <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
              <h3 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
                <Clock className="size-4 text-primary" />
                Log Transaksi Poin & Penalti Terbaru
              </h3>
              <p className="text-xs text-muted-foreground">
                Riwayat kronologis mutasi skor kinerja karyawan dari aktivitas operasional dan HR adjustment
              </p>

              <div className="mt-4 divide-y divide-border/40">
                {analytics.unifiedTimeline.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">Belum ada riwayat aktivitas terbaru.</p>
                ) : (
                  analytics.unifiedTimeline.map((item) => (
                    <div
                      key={`timeline-item-${item.id}`}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            item.points >= 0
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}
                        >
                          {item.points >= 0 ? "+" : "-"}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground">{item.employeeName}</span>
                            <Badge
                              variant="outline"
                              className={`rounded-full px-2 py-0 text-[10px] font-medium ${
                                item.points >= 0
                                  ? "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300"
                                  : "border-rose-200 text-rose-700 dark:border-rose-900 dark:text-rose-300"
                              }`}
                            >
                              {item.type}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {item.category} • {item.label}
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span
                          className={`font-display text-sm font-bold tabular-nums ${
                            item.points >= 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {formatPoints(item.points)} pts
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(item.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Department Summary Sidebar */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
                <h3 className="font-display text-sm font-bold text-foreground">Performa per Departemen</h3>
                <p className="text-xs text-muted-foreground">Agregat poin & penalti bulan ini</p>
                <div className="mt-4 space-y-3">
                  {analytics.departmentPerformance.map((dept) => (
                    <div
                      key={`dept-summary-${dept.department}`}
                      className="rounded-xl border border-border/40 bg-muted/20 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-xs">{dept.department}</span>
                        <span className="font-display text-xs font-bold text-foreground tabular-nums">
                          {dept.points.toLocaleString("id-ID")} pts
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{dept.employees} karyawan</span>
                        {dept.penalties > 0 && (
                          <span className="text-rose-600 dark:text-rose-400">-{dept.penalties} penalty</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: DISPUTE QUEUE */}
        <TabsContent value="disputes" className="space-y-4 pt-1">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
                  <ShieldAlert className="size-4 text-amber-500" />
                  Antrean Peninjauan Dispute Poin
                </h3>
                <p className="text-xs text-muted-foreground">
                  Permohonan keberatan karyawan atas penalti yang membutuhkan verifikasi manajemen / HR
                </p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-border/40">
              {disputes.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
                  <p className="mt-2 text-sm font-medium text-foreground">Tidak ada tiket dispute pending</p>
                  <p className="text-xs text-muted-foreground">Semua potongan penalti telah terkonfirmasi.</p>
                </div>
              ) : (
                disputes.map((item) => (
                  <div
                    key={`dispute-row-${item.id}`}
                    className="flex flex-col gap-3 py-4 lg:flex-row lg:items-start lg:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{item.employeeName}</span>
                        <Badge
                          variant={item.status === "pending" ? "default" : "outline"}
                          className={`rounded-full text-[10px] ${
                            item.status === "pending"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : ""
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </Badge>
                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                          -{item.pointsDeducted} pts ({item.penaltyCode})
                        </span>
                      </div>
                      <p className="text-xs text-foreground/80">{item.reason}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Diajukan pada:{" "}
                        {new Date(item.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      {item.resolutionNotes && (
                        <p className="text-xs text-muted-foreground">
                          Catatan Solusi: <span className="italic">{item.resolutionNotes}</span>
                        </p>
                      )}
                    </div>

                    {item.status === "pending" && canManage && (
                      <form
                        action={async (formData: FormData) => {
                          const res = await resolveDispute(formData)
                          if (res.status === "success") {
                            toast.success(res.message)
                            startTransition(() => router.refresh())
                          } else {
                            toast.error(res.message)
                          }
                        }}
                        className="flex flex-col gap-2 sm:flex-row sm:items-center"
                      >
                        <input type="hidden" name="disputeId" value={item.id} />
                        <Input
                          name="resolutionNotes"
                          placeholder="Catatan persetujuan..."
                          className="h-8 w-48 text-xs"
                        />
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="submit"
                            name="status"
                            value="accepted"
                            size="sm"
                            className="h-8 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            Terima (Refund)
                          </Button>
                          <Button
                            type="submit"
                            name="status"
                            value="rejected"
                            size="sm"
                            variant="destructive"
                            className="h-8 rounded-xl px-3 text-xs font-semibold"
                          >
                            Tolak
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: SETTINGS (Level & Badge Configuration) */}
        {canManage && (
          <TabsContent value="settings" className="space-y-6 pt-1">
            <LevelConfigPanel levels={allLevels} />
            <BadgeConfigPanel badges={allBadges} />
          </TabsContent>
        )}
      </Tabs>

      {/* MODAL 1: EMPLOYEE DETAIL & POINT HISTORY */}
      <Dialog open={selectedEmployeeId !== null} onOpenChange={(open) => !open && setSelectedEmployeeId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <User className="size-5 text-primary" />
              Detail Gamifikasi & Riwayat Karyawan
            </DialogTitle>
            <DialogDescription>
              Profil kinerja, lencana pencapaian, dan jejak transaksi poin
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <div className="mx-auto mb-2 size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Memuat data lengkap karyawan...
            </div>
          ) : employeeDetail ? (
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="flex items-center gap-3 rounded-2xl bg-muted/40 p-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-base font-bold text-primary">
                  {employeeDetail.employee.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-base font-bold text-foreground">
                    {employeeDetail.employee.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {employeeDetail.employee.employeeSn || "-"} • {employeeDetail.employee.role} •{" "}
                    {employeeDetail.employee.department || "-"}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: getLevelColor(employeeDetail.employee.levelName) }}
                  >
                    <Award className="size-3.5" />
                    {employeeDetail.employee.levelName || "Novice"}
                  </span>
                  <p className="mt-1 font-display text-base font-black tabular-nums text-foreground">
                    {employeeDetail.employee.totalPoints.toLocaleString("id-ID")} pts
                  </p>
                </div>
              </div>

              {/* Badges Earned Section */}
              <div className="rounded-2xl border border-border/60 p-4">
                <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Medal className="size-3.5 text-amber-500" />
                  Lencana & Medali ({employeeDetail.badges.length})
                </h4>
                {employeeDetail.badges.length === 0 ? (
                  <p className="mt-2 text-xs italic text-muted-foreground">
                    Belum ada lencana yang diperoleh. Raih poin untuk membuka badge!
                  </p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {employeeDetail.badges.map((b) => (
                      <div
                        key={`emp-badge-${b.badgeId}`}
                        className="flex items-center gap-2 rounded-xl border border-border/50 bg-card p-2 text-xs shadow-sm"
                      >
                        <span className="text-lg">{b.iconUrl || "🏆"}</span>
                        <div>
                          <p className="font-semibold text-foreground">{b.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(b.awardedAt).toLocaleDateString("id-ID")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tabs for Point & Penalty History */}
              <Tabs defaultValue="points" className="space-y-3">
                <TabsList className="h-9 w-full justify-start bg-muted/50 p-1">
                  <TabsTrigger value="points" className="text-xs">
                    Riwayat Poin ({employeeDetail.pointHistory.length})
                  </TabsTrigger>
                  <TabsTrigger value="penalties" className="text-xs">
                    Catatan Penalti ({employeeDetail.penaltyHistory.length})
                  </TabsTrigger>
                </TabsList>

                {/* Point History */}
                <TabsContent value="points" className="max-h-60 overflow-y-auto">
                  <div className="divide-y divide-border/40 text-xs">
                    {employeeDetail.pointHistory.length === 0 ? (
                      <p className="py-6 text-center text-muted-foreground">Belum ada riwayat poin.</p>
                    ) : (
                      employeeDetail.pointHistory.map((p) => (
                        <div key={`p-hist-${p.id}`} className="flex items-center justify-between py-2.5">
                          <div>
                            <p className="font-semibold text-foreground">{p.label}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {p.category} •{" "}
                              {new Date(p.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <span
                            className={`font-display text-xs font-bold tabular-nums ${
                              p.points >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {formatPoints(p.points)} pts
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* Penalty History */}
                <TabsContent value="penalties" className="max-h-60 overflow-y-auto">
                  <div className="divide-y divide-border/40 text-xs">
                    {employeeDetail.penaltyHistory.length === 0 ? (
                      <p className="py-6 text-center text-muted-foreground">Bersih dari penalti.</p>
                    ) : (
                      employeeDetail.penaltyHistory.map((pn) => (
                        <div key={`pn-hist-${pn.id}`} className="flex items-center justify-between py-2.5">
                          <div>
                            <p className="font-semibold text-rose-600 dark:text-rose-400">
                              {pn.penaltyCode}: {pn.description || "Tanpa keterangan"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(pn.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <span className="font-display text-xs font-bold tabular-nums text-rose-600 dark:text-rose-400">
                            -{pn.pointsDeducted} pts
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="rounded-xl text-xs">
                Tutup
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: HR AWARD POINTS FORM */}
      <Dialog open={isAwardModalOpen} onOpenChange={setIsAwardModalOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Plus className="size-4 text-emerald-600" />
              Beri Poin Penghargaan / Adjustment
            </DialogTitle>
            <DialogDescription>
              Poin akan langsung ditambahkan ke total akumulasi dan histori karyawan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAwardPointsSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Pilih Karyawan</Label>
              <SearchableEmployeeSelect
                employees={employeeOptions}
                name="employeeId"
                label=""
                placeholder="Cari nama atau SN karyawan..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Kategori</Label>
              <select
                name="category"
                defaultValue="Bonus Kedisiplinan"
                className="h-9 w-full rounded-xl border border-input bg-background px-3 text-xs"
              >
                <option value="Bonus Kedisiplinan">Bonus Kedisiplinan</option>
                <option value="Penyelesaian Job Cepat">Penyelesaian Job Cepat</option>
                <option value="Safety Champion">Safety Champion</option>
                <option value="Inisiatif 5R">Inisiatif 5R</option>
                <option value="Manual Adjustment">Manual Adjustment HR</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Label / Alasan</Label>
              <Input
                name="label"
                placeholder="Contoh: Reward On-Time Attendance Minggu Ini"
                required
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Jumlah Poin (+)</Label>
              <Input
                name="points"
                type="number"
                min="1"
                max="1000"
                defaultValue="10"
                required
                className="h-9 rounded-xl text-xs font-bold"
              />
            </div>

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs">
                  Batal
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmittingAction}
                size="sm"
                className="rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                {isSubmittingAction ? "Menyimpan..." : "Kirim Poin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: HR PENALTY FORM */}
      <Dialog open={isPenaltyModalOpen} onOpenChange={setIsPenaltyModalOpen}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600 dark:text-rose-400">
              <ShieldAlert className="size-4" />
              Catat Penalti / Pelanggaran
            </DialogTitle>
            <DialogDescription>
              Penalti akan memotong akumulasi poin karyawan dan tercatat di riwayat kedisiplinan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePenaltySubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Pilih Karyawan</Label>
              <SearchableEmployeeSelect
                employees={employeeOptions}
                name="employeeId"
                label=""
                placeholder="Cari nama atau SN karyawan..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Kode Penalti</Label>
              <select
                name="penaltyCode"
                defaultValue="TELAT"
                className="h-9 w-full rounded-xl border border-input bg-background px-3 text-xs"
              >
                <option value="TELAT">TELAT - Keterlambatan Presensi</option>
                <option value="ALPA">ALPA - Mangkir Kerja</option>
                <option value="UNSAFE_ACT">UNSAFE_ACT - Pelanggaran Keselamatan</option>
                <option value="SP1">SP1 - Surat Peringatan I</option>
                <option value="SP2">SP2 - Surat Peringatan II</option>
                <option value="LAINNYA">LAINNYA - Pelanggaran Lain</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Potongan Poin</Label>
              <Input
                name="pointsDeducted"
                type="number"
                min="1"
                max="1000"
                defaultValue="25"
                required
                className="h-9 rounded-xl text-xs font-bold text-rose-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Deskripsi / Bukti Pelanggaran</Label>
              <Textarea
                name="description"
                placeholder="Rincian kronologi atau catatan HR..."
                rows={3}
                className="rounded-xl text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" size="sm" className="rounded-xl text-xs">
                  Batal
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmittingAction}
                size="sm"
                variant="destructive"
                className="rounded-xl text-xs font-semibold"
              >
                {isSubmittingAction ? "Menyimpan..." : "Terapkan Penalti"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
