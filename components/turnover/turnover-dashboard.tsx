'use client'

import React, { useState, useMemo } from 'react'
import {
  TurnoverMatrixSummary,
} from '@/lib/hero-turnover'
import { type HcTurnoverMovement } from '@/db/schema/hero'
import { TurnoverMatrixTable } from './turnover-matrix-table'
import { TurnoverIncomingTable } from './turnover-incoming-table'
import { TurnoverOutgoingTable } from './turnover-outgoing-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LayoutDashboard,
  UserPlus,
  UserMinus,
  TrendingUp,
  Filter,
  RotateCcw,
  Calendar,
  Building2,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Percent,
} from 'lucide-react'
import { format } from 'date-fns'

interface TurnoverDashboardProps {
  summary: TurnoverMatrixSummary
  incomingList: HcTurnoverMovement[]
  outgoingList: HcTurnoverMovement[]
  options: {
    departments: { id: number; name: string }[]
    sections: { id: number; name: string; departmentId: number | null }[]
    positions: { id: number; name: string }[]
    sites: { id: number; name: string }[]
    activeEmployees: any[]
    movementDepartments?: string[]
    movementSections?: string[]
  }
}

export function TurnoverDashboard({
  summary,
  incomingList,
  outgoingList,
  options,
}: TurnoverDashboardProps) {
  const currentYear = summary.year || 2026

  // Filter States
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [selectedSec, setSelectedSec] = useState<string>('all')
  const [datePreset, setDatePreset] = useState<string>('full_year')
  const [startDate, setStartDate] = useState<string>(`${currentYear}-01-01`)
  const [endDate, setEndDate] = useState<string>(`${currentYear}-12-31`)
  const [activeTab, setActiveTab] = useState('summary')

  // Combine departments from movements and master options
  const departmentOptions = useMemo(() => {
    const set = new Set<string>()
    if (options.movementDepartments) {
      options.movementDepartments.forEach((d) => set.add(d))
    }
    options.departments.forEach((d) => set.add(d.name))
    return Array.from(set).filter(Boolean).sort()
  }, [options.movementDepartments, options.departments])

  // Filter section options based on selected department
  const sectionOptions = useMemo(() => {
    if (selectedDept === 'all') {
      const set = new Set<string>()
      if (options.movementSections) {
        options.movementSections.forEach((s) => set.add(s))
      }
      options.sections.forEach((s) => set.add(s.name))
      return Array.from(set).filter(Boolean).sort()
    }

    // Find master department id
    const deptObj = options.departments.find((d) => d.name === selectedDept)
    const masterSecs = deptObj
      ? options.sections.filter((s) => s.departmentId === deptObj.id).map((s) => s.name)
      : []

    // Also get sections present in movements with this department
    const movementSecs = [
      ...incomingList.filter((m) => m.department === selectedDept).map((m) => m.section),
      ...outgoingList.filter((m) => m.department === selectedDept).map((m) => m.section),
    ]

    const set = new Set<string>([...masterSecs, ...movementSecs])
    return Array.from(set).filter(Boolean).sort()
  }, [selectedDept, options.movementSections, options.sections, options.departments, incomingList, outgoingList])

  // Handle Preset Changes
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset)
    switch (preset) {
      case 'full_year':
        setStartDate(`${currentYear}-01-01`)
        setEndDate(`${currentYear}-12-31`)
        break
      case 'semester_1':
        setStartDate(`${currentYear}-01-01`)
        setEndDate(`${currentYear}-06-30`)
        break
      case 'semester_2':
        setStartDate(`${currentYear}-07-01`)
        setEndDate(`${currentYear}-12-31`)
        break
      case 'q1':
        setStartDate(`${currentYear}-01-01`)
        setEndDate(`${currentYear}-03-31`)
        break
      case 'q2':
        setStartDate(`${currentYear}-04-01`)
        setEndDate(`${currentYear}-06-30`)
        break
      case 'q3':
        setStartDate(`${currentYear}-07-01`)
        setEndDate(`${currentYear}-09-30`)
        break
      case 'q4':
        setStartDate(`${currentYear}-10-01`)
        setEndDate(`${currentYear}-12-31`)
        break
      default:
        break
    }
  }

  const handleResetFilters = () => {
    setSelectedDept('all')
    setSelectedSec('all')
    setDatePreset('full_year')
    setStartDate(`${currentYear}-01-01`)
    setEndDate(`${currentYear}-12-31`)
  }

  // Filter Movements based on Department, Section, and Date Range
  const filteredIncoming = useMemo(() => {
    return incomingList.filter((item) => {
      const matchDept = selectedDept === 'all' || item.department === selectedDept
      const matchSec = selectedSec === 'all' || item.section === selectedSec

      const dStr = typeof item.movementDate === 'string'
        ? item.movementDate
        : new Date(item.movementDate).toISOString().slice(0, 10)

      const matchDate = dStr >= startDate && dStr <= endDate
      return matchDept && matchSec && matchDate
    })
  }, [incomingList, selectedDept, selectedSec, startDate, endDate])

  const filteredOutgoing = useMemo(() => {
    return outgoingList.filter((item) => {
      const matchDept = selectedDept === 'all' || item.department === selectedDept
      const matchSec = selectedSec === 'all' || item.section === selectedSec

      const dStr = typeof item.movementDate === 'string'
        ? item.movementDate
        : new Date(item.movementDate).toISOString().slice(0, 10)

      const matchDate = dStr >= startDate && dStr <= endDate
      return matchDept && matchSec && matchDate
    })
  }, [outgoingList, selectedDept, selectedSec, startDate, endDate])

  // All filtered movements (combined) for the Matrix view
  const allFilteredMovements = useMemo(() => {
    const combined = [...incomingList, ...outgoingList]
    return combined.filter((item) => {
      const matchDept = selectedDept === 'all' || item.department === selectedDept
      const matchSec = selectedSec === 'all' || item.section === selectedSec
      return matchDept && matchSec
    })
  }, [incomingList, outgoingList, selectedDept, selectedSec])

  // Dynamic Scorecard Metrics Calculation
  const metrics = useMemo(() => {
    let newHire = 0, transfer = 0, reHire = 0
    let resign = 0, contractComplete = 0, terminate = 0, pension = 0

    filteredIncoming.forEach((m) => {
      const rem = (m.remark || '').toLowerCase().trim()
      if (rem.includes('transfer')) transfer++
      else if (rem.includes('re hire') || rem.includes('rehire') || rem.includes('re-hire')) reHire++
      else newHire++
    })

    filteredOutgoing.forEach((m) => {
      const rem = (m.remark || '').toLowerCase().trim()
      if (rem.includes('contract') || rem.includes('habis kontrak')) contractComplete++
      else if (rem.includes('terminate') || rem.includes('phk') || rem.includes('dikeluarkan')) terminate++
      else if (rem.includes('pensiun') || rem.includes('pension')) pension++
      else resign++
    })

    const totalIn = filteredIncoming.length
    const totalOut = filteredOutgoing.length
    const netGrowth = totalIn - totalOut

    // Base initial headcount
    const initialH = summary.initialHeadcount
    const finalH = initialH + netGrowth
    const avgH = (initialH + finalH) / 2
    const turnoverRate = avgH > 0 ? (totalOut / avgH) * 100 : 0

    return {
      initialHeadcount: initialH,
      finalHeadcount: finalH,
      totalIn,
      totalOut,
      netGrowth,
      turnoverRate: parseFloat(turnoverRate.toFixed(2)),
      breakdownIn: { newHire, transfer, reHire },
      breakdownOut: { resign, contractComplete, terminate, pension },
    }
  }, [filteredIncoming, filteredOutgoing, summary.initialHeadcount])

  const hasActiveFilters =
    selectedDept !== 'all' ||
    selectedSec !== 'all' ||
    datePreset !== 'full_year' ||
    startDate !== `${currentYear}-01-01` ||
    endDate !== `${currentYear}-12-31`

  return (
    <div className="space-y-6 w-full">
      {/* 1. Header Banner - Clean Minimal Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-r from-card via-card to-primary/5 p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/20">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Labour Turn Over (LTO)
                </h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                  Operasional {currentYear}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Monitoring dinamika pergerakan karyawan masuk, keluar, dan rasio perputaran tenaga kerja.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-8.5 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/40 gap-1.5 font-medium transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Filter
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Filter & Parameter Bar - Minimalist Floating Panel */}
      <Card className="border-border/60 shadow-xs bg-card/60 backdrop-blur-xs w-full overflow-hidden">
        <div className="bg-muted/30 px-5 py-2.5 border-b border-border/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-primary/10 text-primary">
              <Filter className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-semibold text-foreground tracking-wide uppercase">
              Filter Parameter & Rentang Waktu
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Menyesuaikan seluruh scorecard & matriks
          </span>
        </div>

        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {/* 1. Departemen */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-sky-500" /> Departemen
              </label>
              <Select
                value={selectedDept}
                onValueChange={(val) => {
                  setSelectedDept(val)
                  setSelectedSec('all')
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-background/80 border-border/70 hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="Semua Departemen" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">Semua Departemen</SelectItem>
                  {departmentOptions.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. Seksi (Section) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-500" /> Seksi / Section
              </label>
              <Select value={selectedSec} onValueChange={setSelectedSec}>
                <SelectTrigger className="h-9 text-xs bg-background/80 border-border/70 hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="Semua Seksi" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">Semua Seksi</SelectItem>
                  {sectionOptions.map((sec) => (
                    <SelectItem key={sec} value={sec}>
                      {sec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. Preset Periode */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-500" /> Preset Periode
              </label>
              <Select value={datePreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="h-9 text-xs bg-background/80 border-border/70 hover:border-primary/50 transition-colors">
                  <SelectValue placeholder="Pilih Periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_year">Tahun Penuh ({currentYear})</SelectItem>
                  <SelectItem value="semester_1">Semester 1 (Jan - Jun)</SelectItem>
                  <SelectItem value="semester_2">Semester 2 (Jul - Des)</SelectItem>
                  <SelectItem value="q1">Kuartal 1 (Jan - Mar)</SelectItem>
                  <SelectItem value="q2">Kuartal 2 (Apr - Jun)</SelectItem>
                  <SelectItem value="q3">Kuartal 3 (Jul - Sep)</SelectItem>
                  <SelectItem value="q4">Kuartal 4 (Okt - Des)</SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 4. Dari Tanggal */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Dari Tanggal
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setDatePreset('custom')
                }}
                className="h-9 text-xs bg-background/80 border-border/70 hover:border-primary/50 transition-colors"
              />
            </div>

            {/* 5. Sampai Tanggal */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-muted-foreground">
                Sampai Tanggal
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setDatePreset('custom')
                }}
                className="h-9 text-xs bg-background/80 border-border/70 hover:border-primary/50 transition-colors"
              />
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-border/40 text-xs">
              <span className="text-[11px] font-medium text-muted-foreground mr-1">
                Filter Aktif:
              </span>
              {selectedDept !== 'all' && (
                <Badge variant="secondary" className="text-[11px] gap-1.5 bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/60">
                  Dept: {selectedDept}
                  <button
                    onClick={() => {
                      setSelectedDept('all')
                      setSelectedSec('all')
                    }}
                    className="hover:text-rose-600 font-bold ml-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {selectedSec !== 'all' && (
                <Badge variant="secondary" className="text-[11px] gap-1.5 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  Seksi: {selectedSec}
                  <button onClick={() => setSelectedSec('all')} className="hover:text-rose-600 font-bold ml-0.5">
                    ×
                  </button>
                </Badge>
              )}
              <Badge variant="secondary" className="text-[11px] gap-1.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                Periode: {format(new Date(startDate), 'dd MMM yyyy')} - {format(new Date(endDate), 'dd MMM yyyy')}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Dynamic Colorful & Professional Scorecard Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 w-full">
        {/* Card 1: Headcount Awal - Slate / Steel */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50/50 to-slate-100/40 dark:from-slate-900/80 dark:via-slate-900/40 dark:to-slate-800/40 p-4 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Headcount Awal
            </span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-xs">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 font-mono">
            {metrics.initialHeadcount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 truncate">
            Basis awal tahun {currentYear}
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-400/60 dark:bg-slate-600" />
        </div>

        {/* Card 2: Total Masuk (In) - Vibrant Emerald */}
        <div className="relative overflow-hidden rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 bg-gradient-to-br from-white via-emerald-50/40 to-emerald-100/30 dark:from-slate-900/80 dark:via-emerald-950/20 dark:to-emerald-900/20 p-4 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Total Masuk (In)
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shadow-xs">
              <UserPlus className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
            +{metrics.totalIn}
          </div>
          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-1.5 truncate font-medium">
            {metrics.breakdownIn.newHire} New Hire • {metrics.breakdownIn.transfer} Transfer
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500" />
        </div>

        {/* Card 3: Total Keluar (Out) - Vibrant Rose */}
        <div className="relative overflow-hidden rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-gradient-to-br from-white via-rose-50/40 to-rose-100/30 dark:from-slate-900/80 dark:via-rose-950/20 dark:to-rose-900/20 p-4 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Total Keluar (Out)
            </span>
            <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center text-rose-700 dark:text-rose-300 shadow-xs">
              <UserMinus className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400 font-mono">
            -{metrics.totalOut}
          </div>
          <p className="text-[10px] text-rose-700/80 dark:text-rose-300/80 mt-1.5 truncate font-medium">
            {metrics.breakdownOut.resign} Resign • {metrics.breakdownOut.contractComplete} Kontrak
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
        </div>

        {/* Card 4: Net Pertumbuhan - Indigo / Violet */}
        <div className="relative overflow-hidden rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 bg-gradient-to-br from-white via-indigo-50/40 to-indigo-100/30 dark:from-slate-900/80 dark:via-indigo-950/20 dark:to-indigo-900/20 p-4 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Net Pertumbuhan
            </span>
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shadow-xs ${
              metrics.netGrowth >= 0
                ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
            }`}>
              {metrics.netGrowth >= 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
            </div>
          </div>
          <div
            className={`text-3xl font-extrabold tracking-tight font-mono ${
              metrics.netGrowth >= 0
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {metrics.netGrowth >= 0 ? `+${metrics.netGrowth}` : metrics.netGrowth}
          </div>
          <p className="text-[11px] text-indigo-600/80 dark:text-indigo-300/80 mt-1.5 truncate font-medium">
            Selisih masuk - keluar
          </p>
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${metrics.netGrowth >= 0 ? 'bg-indigo-500' : 'bg-rose-500'}`} />
        </div>

        {/* Card 5: Hasil Akhir - Modern Cyan / Blue */}
        <div className="relative overflow-hidden rounded-xl border border-sky-200/80 dark:border-sky-900/60 bg-gradient-to-br from-white via-sky-50/40 to-sky-100/30 dark:from-slate-900/80 dark:via-sky-950/20 dark:to-sky-900/20 p-4 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
              Hasil Akhir
            </span>
            <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-900/60 flex items-center justify-center text-sky-700 dark:text-sky-300 shadow-xs">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-sky-600 dark:text-sky-400 font-mono">
            {metrics.finalHeadcount}
          </div>
          <p className="text-[11px] text-sky-600/80 dark:text-sky-300/80 mt-1.5 truncate font-medium">
            Posisi akhir headcount
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500" />
        </div>

        {/* Card 6: Turnover Rate - Warm Amber / Orange */}
        <div className="relative overflow-hidden rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-gradient-to-br from-white via-amber-50/40 to-amber-100/30 dark:from-slate-900/80 dark:via-amber-950/20 dark:to-amber-900/20 p-4 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Turn Over Rate
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-700 dark:text-amber-300 shadow-xs">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400 font-mono">
            {metrics.turnoverRate}%
          </div>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-300/80 mt-1.5 truncate font-medium">
            Rasio perputaran total
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        </div>
      </div>

      {/* 4. Modern Pill Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
        <TabsList className="bg-muted/50 p-1.5 rounded-xl border border-border/60 h-auto flex flex-wrap gap-1.5 shadow-xs">
          <TabsTrigger
            value="summary"
            className="flex items-center gap-2 text-xs font-semibold py-2 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            <LayoutDashboard className="h-4 w-4 text-sky-500" />
            Ringkasan LTO & Headcount
          </TabsTrigger>
          <TabsTrigger
            value="incoming"
            className="flex items-center gap-2 text-xs font-semibold py-2 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            <UserPlus className="h-4 w-4 text-emerald-500" />
            Karyawan Masuk (Incoming)
            <Badge
              variant="secondary"
              className="ml-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/40"
            >
              {filteredIncoming.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="outgoing"
            className="flex items-center gap-2 text-xs font-semibold py-2 px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            <UserMinus className="h-4 w-4 text-rose-500" />
            Karyawan Keluar (Outgoing)
            <Badge
              variant="secondary"
              className="ml-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300/40"
            >
              {filteredOutgoing.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6 outline-none w-full">
          <TurnoverMatrixTable
            summary={summary}
            selectedYear={currentYear}
            filteredMovements={allFilteredMovements}
            startDate={startDate}
            endDate={endDate}
            selectedDept={selectedDept}
            selectedSec={selectedSec}
          />
        </TabsContent>

        <TabsContent value="incoming" className="space-y-6 outline-none w-full">
          <TurnoverIncomingTable incomingList={filteredIncoming} options={options} />
        </TabsContent>

        <TabsContent value="outgoing" className="space-y-6 outline-none w-full">
          <TurnoverOutgoingTable outgoingList={filteredOutgoing} options={options} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
