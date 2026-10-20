'use client'

import React, { useState, useMemo } from 'react'
import { TurnoverMatrixSummary, TurnoverMonthlyData } from '@/lib/hero-turnover'
import { type HcTurnoverMovement } from '@/db/schema/hero'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Settings,
  Calendar,
  Filter,
} from 'lucide-react'
import { updateInitialHeadcountAction } from '@/app/dashboard/hc/turnover/actions'
import { toast } from 'sonner'

interface TurnoverMatrixTableProps {
  summary: TurnoverMatrixSummary
  selectedYear: number
  filteredMovements?: HcTurnoverMovement[]
  startDate?: string
  endDate?: string
  selectedDept?: string
  selectedSec?: string
  onYearChange?: (year: number) => void
}

const MONTH_NAMES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]

export function TurnoverMatrixTable({
  summary,
  selectedYear,
  filteredMovements,
  startDate,
  endDate,
  selectedDept = 'all',
  selectedSec = 'all',
}: TurnoverMatrixTableProps) {
  const [headcountInput, setHeadcountInput] = useState(String(summary.initialHeadcount))
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  const handleSaveHeadcount = async () => {
    const val = parseInt(headcountInput, 10)
    if (isNaN(val) || val < 0) {
      toast.error('Masukkan angka headcount yang valid')
      return
    }

    setIsUpdating(true)
    try {
      const res = await updateInitialHeadcountAction(selectedYear, val)
      if (res.success) {
        toast.success(`Headcount awal tahun ${selectedYear} diperbarui menjadi ${val}`)
        setIsDialogOpen(false)
      } else {
        toast.error(res.error || 'Gagal menyimpan headcount')
      }
    } finally {
      setIsUpdating(false)
    }
  }

  // Calculate dynamic monthly matrix based on filtered movements
  const { months, totals } = useMemo(() => {
    const movements = filteredMovements || []
    const startHeadcountBase = summary.initialHeadcount

    const monthlyData: (TurnoverMonthlyData & { isInsideRange: boolean })[] = []
    let runningHeadcount = startHeadcountBase

    let totalNewHire = 0
    let totalTransferIn = 0
    let totalReHire = 0
    let totalResign = 0
    let totalContractComplete = 0
    let totalTerminate = 0
    let totalPension = 0

    const rangeStart = startDate || `${selectedYear}-01-01`
    const rangeEnd = endDate || `${selectedYear}-12-31`

    for (let mIndex = 0; mIndex < 12; mIndex++) {
      const monthNumber = mIndex + 1
      const padMonth = String(monthNumber).padStart(2, '0')
      const monthPrefix = `${selectedYear}-${padMonth}`

      const monthStartStr = `${selectedYear}-${padMonth}-01`
      const lastDay = new Date(selectedYear, monthNumber, 0).getDate()
      const monthEndStr = `${selectedYear}-${padMonth}-${String(lastDay).padStart(2, '0')}`

      const isInsideRange = monthEndStr >= rangeStart && monthStartStr <= rangeEnd

      const monthMovements = movements.filter((m) => {
        const movementStr = typeof m.movementDate === 'string'
          ? m.movementDate
          : new Date(m.movementDate).toISOString().slice(0, 10)
        return movementStr.startsWith(monthPrefix)
      })

      let newHire = 0
      let transfer = 0
      let reHire = 0
      let resign = 0
      let contractComplete = 0
      let terminate = 0
      let pension = 0

      monthMovements.forEach((m) => {
        const rem = (m.remark || '').toLowerCase().trim()
        if (m.movementType === 'incoming') {
          if (rem.includes('transfer')) {
            transfer++
          } else if (rem.includes('re hire') || rem.includes('rehire') || rem.includes('re-hire')) {
            reHire++
          } else {
            newHire++
          }
        } else if (m.movementType === 'outgoing') {
          if (rem.includes('contract') || rem.includes('habis kontrak')) {
            contractComplete++
          } else if (rem.includes('terminate') || rem.includes('phk') || rem.includes('dikeluarkan')) {
            terminate++
          } else if (rem.includes('pensiun') || rem.includes('pension')) {
            pension++
          } else {
            resign++
          }
        }
      })

      const totalIncomingMonth = newHire + transfer + reHire
      const totalOutgoingMonth = resign + contractComplete + terminate + pension

      const startH = runningHeadcount
      const endH = startH + totalIncomingMonth - totalOutgoingMonth
      runningHeadcount = endH

      const avgH = (startH + endH) / 2
      const turnoverRate = avgH > 0 ? (totalOutgoingMonth / avgH) * 100 : 0

      totalNewHire += newHire
      totalTransferIn += transfer
      totalReHire += reHire
      totalResign += resign
      totalContractComplete += contractComplete
      totalTerminate += terminate
      totalPension += pension

      monthlyData.push({
        month: monthNumber,
        monthName: MONTH_NAMES[mIndex],
        startHeadcount: startH,
        incomings: {
          newHire,
          transfer,
          reHire,
          total: totalIncomingMonth,
        },
        outgoings: {
          resign,
          contractComplete,
          terminate,
          pension,
          total: totalOutgoingMonth,
        },
        endHeadcount: endH,
        turnoverRate: parseFloat(turnoverRate.toFixed(2)),
        isInsideRange,
      })
    }

    const grandTotalIncoming = totalNewHire + totalTransferIn + totalReHire
    const grandTotalOutgoing = totalResign + totalContractComplete + totalTerminate + totalPension
    const avgYearlyHeadcount = (startHeadcountBase + runningHeadcount) / 2
    const yearlyTurnoverRate =
      avgYearlyHeadcount > 0 ? (grandTotalOutgoing / avgYearlyHeadcount) * 100 : 0

    return {
      months: monthlyData,
      totals: {
        incomings: {
          newHire: totalNewHire,
          transfer: totalTransferIn,
          reHire: totalReHire,
          total: grandTotalIncoming,
        },
        outgoings: {
          resign: totalResign,
          contractComplete: totalContractComplete,
          terminate: totalTerminate,
          pension: totalPension,
          total: grandTotalOutgoing,
        },
        averageTurnoverRate: parseFloat(yearlyTurnoverRate.toFixed(2)),
        finalHeadcount: runningHeadcount,
        netGrowth: grandTotalIncoming - grandTotalOutgoing,
      },
    }
  }, [filteredMovements, summary.initialHeadcount, selectedYear, startDate, endDate])

  const hasFilter = selectedDept !== 'all' || selectedSec !== 'all' || (startDate && endDate)

  return (
    <div className="space-y-4 w-full">
      {/* Main Matrix Table Card */}
      <Card className="border-border/70 shadow-sm overflow-hidden w-full rounded-2xl">
        <CardHeader className="bg-gradient-to-r from-muted/40 via-muted/20 to-transparent border-b border-border/50 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <CardTitle className="text-base sm:text-lg font-bold tracking-tight">
                  Matriks Labour Turn Over (JAN - DEC {selectedYear})
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground mt-1">
                Kalkulasi headcount awal, mutasi masuk, mutasi keluar, hasil akhir dan turnover rate bulanan.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasFilter && (
                <Badge variant="secondary" className="text-xs px-2.5 py-0.5 font-medium bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 flex items-center gap-1">
                  <Filter className="h-3 w-3" /> Data Terfilter
                </Badge>
              )}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8.5 text-xs gap-1.5 bg-background shadow-xs hover:border-teal-500 transition-colors">
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" /> Edit Headcount Awal ({summary.initialHeadcount})
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Ubah Headcount Awal Tahun {selectedYear}</DialogTitle>
                    <DialogDescription>
                      Tetapkan jumlah headcount dasar awal per 1 Januari untuk tahun {selectedYear}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-2">
                    <label className="text-xs font-medium">Headcount Awal (Jan):</label>
                    <Input
                      type="number"
                      value={headcountInput}
                      onChange={(e) => setHeadcountInput(e.target.value)}
                      placeholder="Contoh: 471"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button onClick={handleSaveHeadcount} disabled={isUpdating}>
                      {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-gradient-to-r from-amber-100/90 via-amber-100/70 to-amber-200/80 dark:from-amber-950/60 dark:via-amber-950/40 dark:to-amber-900/50 text-foreground border-b border-amber-200/80 dark:border-amber-800/60 font-bold uppercase tracking-wider">
                <th className="py-3 px-4 w-60 sticky left-0 bg-amber-100 dark:bg-amber-950 z-10 shadow-sm border-r border-amber-200/80 dark:border-amber-800/60 text-amber-950 dark:text-amber-100">
                  Uraian / Keterangan
                </th>
                {months.map((m) => (
                  <th
                    key={m.month}
                    className={`py-3 px-2 text-center border-r border-amber-200/60 dark:border-amber-800/40 transition-colors ${
                      m.isInsideRange ? 'font-extrabold text-amber-950 dark:text-amber-100' : 'text-amber-900/40 dark:text-amber-200/40 font-normal'
                    }`}
                  >
                    {m.monthName}
                  </th>
                ))}
                <th className="py-3 px-3 text-center bg-amber-200/80 dark:bg-amber-900/70 font-black text-amber-950 dark:text-amber-100">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {/* Row 1: Jumlah Awal */}
              <tr className="bg-background font-semibold hover:bg-muted/30 transition-colors">
                <td className="py-2.5 px-4 sticky left-0 bg-background z-10 border-r border-border/60 font-bold text-foreground">
                  Jumlah Awal
                </td>
                {months.map((m) => (
                  <td
                    key={m.month}
                    className={`py-2.5 px-2 text-center border-r border-border/40 font-mono ${
                      m.isInsideRange ? 'font-bold text-foreground' : 'text-muted-foreground/40'
                    }`}
                  >
                    {m.startHeadcount}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-center font-bold font-mono bg-muted/20">
                  {summary.initialHeadcount}
                </td>
              </tr>

              {/* Group Header: MASUK */}
              <tr className="bg-emerald-500/10 dark:bg-emerald-950/20 font-bold text-emerald-800 dark:text-emerald-300">
                <td colSpan={14} className="py-1.5 px-4 text-[11px] uppercase tracking-wider">
                  Masuk (Incoming Movements)
                </td>
              </tr>
              {/* Sub-rows: New Hire */}
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-2 px-4 pl-8 sticky left-0 bg-background z-10 border-r border-border/60 text-muted-foreground">
                  New Hire
                </td>
                {months.map((m) => (
                  <td
                    key={m.month}
                    className={`py-2 px-2 text-center border-r border-border/40 font-mono ${
                      !m.isInsideRange ? 'opacity-40' : ''
                    }`}
                  >
                    {m.incomings.newHire > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {m.incomings.newHire}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">0</span>
                    )}
                  </td>
                ))}
                <td className="py-2 px-3 text-center font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-muted/10">
                  {totals.incomings.newHire}
                </td>
              </tr>
              {/* Sub-rows: Transfer */}
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-2 px-4 pl-8 sticky left-0 bg-background z-10 border-r border-border/60 text-muted-foreground">
                  Transfer
                </td>
                {months.map((m) => (
                  <td
                    key={m.month}
                    className={`py-2 px-2 text-center border-r border-border/40 font-mono ${
                      !m.isInsideRange ? 'opacity-40' : ''
                    }`}
                  >
                    {m.incomings.transfer > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {m.incomings.transfer}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">0</span>
                    )}
                  </td>
                ))}
                <td className="py-2 px-3 text-center font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-muted/10">
                  {totals.incomings.transfer}
                </td>
              </tr>
              {/* Sub-rows: Re Hire */}
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-2 px-4 pl-8 sticky left-0 bg-background z-10 border-r border-border/60 text-muted-foreground">
                  Re Hire
                </td>
                {months.map((m) => (
                  <td
                    key={m.month}
                    className={`py-2 px-2 text-center border-r border-border/40 font-mono ${
                      !m.isInsideRange ? 'opacity-40' : ''
                    }`}
                  >
                    {m.incomings.reHire > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {m.incomings.reHire}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">0</span>
                    )}
                  </td>
                ))}
                <td className="py-2 px-3 text-center font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-muted/10">
                  {totals.incomings.reHire}
                </td>
              </tr>
              {/* Subtotal Masuk */}
              <tr className="bg-emerald-50/60 dark:bg-emerald-950/30 font-bold border-b border-border/60">
                <td className="py-2.5 px-4 sticky left-0 bg-emerald-50/90 dark:bg-emerald-950/90 z-10 border-r border-border/60 text-emerald-700 dark:text-emerald-300">
                  Subtotal Masuk
                </td>
                {months.map((m) => (
                  <td
                    key={m.month}
                    className={`py-2.5 px-2 text-center border-r border-border/40 font-mono text-emerald-700 dark:text-emerald-300 ${
                      !m.isInsideRange ? 'opacity-40' : ''
                    }`}
                  >
                    {m.incomings.total}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-center font-black font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-900/30">
                  {totals.incomings.total}
                </td>
              </tr>

              {/* Group Header: KELUAR */}
              <tr className="bg-rose-500/10 dark:bg-rose-950/20 font-bold text-rose-800 dark:text-rose-300">
                <td colSpan={14} className="py-1.5 px-4 text-[11px] uppercase tracking-wider">
                  Keluar (Outgoing Movements)
                </td>
              </tr>
              {/* Sub-rows: Resign */}
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-2 px-4 pl-8 sticky left-0 bg-background z-10 border-r border-border/60 text-muted-foreground">
                  Resign
                </td>
                {months.map((m) => (
                  <td
                    key={m.month}
                    className={`py-2 px-2 text-center border-r border-border/40 font-mono ${
                      !m.isInsideRange ? 'opacity-40' : ''
                    }`}
                  >
                    {m.outgoings.resign > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        {m.outgoings.resign}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">0</span>
                    )}
                  </td>
                ))}
                <td className="py-2 px-3 text-center font-bold font-mono text-rose-600 dark:text-rose-400 bg-muted/10">
                  {totals.outgoings.resign}
                </td>
              </tr>
              {/* Sub-rows: Contract Complete */}
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-2 px-4 pl-8 sticky left-0 bg-background z-10 border-r border-border/60 text-muted-foreground">
                  Habis Kontrak
                </td>
                {months.map((m) => (
                  <td
                    key={m.month}
                    className={`py-2 px-2 text-center border-r border-border/40 font-mono ${
                      !m.isInsideRange ? 'opacity-40' : ''
                    }`}
                  >
                    {m.outgoings.contractComplete > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        {m.outgoings.contractComplete}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">0</span>
                    )}
                  </td>
                ))}
                <td className="py-2 px-3 text-center font-bold font-mono text-rose-600 dark:text-rose-400 bg-muted/10">
                  {totals.outgoings.contractComplete}
                </td>
              </tr>
              {/* Sub-rows: Terminate */}
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-2 px-4 pl-8 sticky left-0 bg-background z-10 border-r border-border/60 text-muted-foreground">
                  Terminate / PHK
                </td>
                {months.map((m) => (
                  <td
                    key={m.month}
                    className={`py-2 px-2 text-center border-r border-border/40 font-mono ${
                      !m.isInsideRange ? 'opacity-40' : ''
                    }`}
                  >
                    {m.outgoings.terminate > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        {m.outgoings.terminate}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">0</span>
                    )}
                  </td>
                ))}
                <td className="py-2 px-3 text-center font-bold font-mono text-rose-600 dark:text-rose-400 bg-muted/10">
                  {totals.outgoings.terminate}
                </td>
              </tr>
              {/* Sub-rows: Pension */}
              <tr className="hover:bg-muted/30 transition-colors">
                <td className="py-2 px-4 pl-8 sticky left-0 bg-background z-10 border-r border-border/60 text-muted-foreground">
                  Pensiun
                </td>
                {months.map((m) => (
                  <td
                    key={m.month}
                    className={`py-2 px-2 text-center border-r border-border/40 font-mono ${
                      !m.isInsideRange ? 'opacity-40' : ''
                    }`}
                  >
                    {m.outgoings.pension > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400 font-semibold">
                        {m.outgoings.pension}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">0</span>
                    )}
                  </td>
                ))}
                <td className="py-2 px-3 text-center font-bold font-mono text-rose-600 dark:text-rose-400 bg-muted/10">
                  {totals.outgoings.pension}
                </td>
              </tr>
              {/* Subtotal Keluar */}
              <tr className="bg-rose-50/60 dark:bg-rose-950/30 font-bold border-b border-border/60">
                <td className="py-2.5 px-4 sticky left-0 bg-rose-50/90 dark:bg-rose-950/90 z-10 border-r border-border/60 text-rose-700 dark:text-rose-300">
                  Subtotal Keluar
                </td>
                {months.map((m) => (
                  <td
                    key={m.month}
                    className={`py-2.5 px-2 text-center border-r border-border/40 font-mono text-rose-700 dark:text-rose-300 ${
                      !m.isInsideRange ? 'opacity-40' : ''
                    }`}
                  >
                    {m.outgoings.total}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-center font-black font-mono text-rose-700 dark:text-rose-300 bg-rose-100/50 dark:bg-rose-900/30">
                  {totals.outgoings.total}
                </td>
              </tr>

              {/* Row: Hasil Akhir */}
              <tr className="bg-primary/5 font-extrabold border-t-2 border-primary/20">
                <td className="py-3 px-4 sticky left-0 bg-background z-10 border-r border-border/60 text-primary font-bold">
                  Hasil Akhir
                </td>
                {months.map((m) => (
                  <td
                    key={m.month}
                    className={`py-3 px-2 text-center border-r border-border/40 font-mono text-foreground font-black ${
                      !m.isInsideRange ? 'opacity-40' : ''
                    }`}
                  >
                    {m.endHeadcount}
                  </td>
                ))}
                <td className="py-3 px-3 text-center font-black font-mono text-primary bg-primary/10">
                  {totals.finalHeadcount}
                </td>
              </tr>

              {/* Row: Turn Over (%) */}
              <tr className="bg-amber-500/10 dark:bg-amber-950/30 font-extrabold border-b border-border/80">
                <td className="py-3 px-4 sticky left-0 bg-amber-50/90 dark:bg-amber-950/90 z-10 border-r border-border/60 text-amber-900 dark:text-amber-200 font-bold">
                  Turn Over (%)
                </td>
                {months.map((m) => (
                  <td
                    key={m.month}
                    className={`py-3 px-2 text-center border-r border-border/40 font-mono font-black ${
                      !m.isInsideRange ? 'opacity-40' : ''
                    } ${
                      m.turnoverRate > 2
                        ? 'text-rose-600 dark:text-rose-400'
                        : m.turnoverRate > 0
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-muted-foreground/60'
                    }`}
                  >
                    {m.turnoverRate > 0 ? `${m.turnoverRate}%` : '0%'}
                  </td>
                ))}
                <td className="py-3 px-3 text-center font-black font-mono text-amber-700 dark:text-amber-300 bg-amber-200/50 dark:bg-amber-900/40">
                  {totals.averageTurnoverRate}%
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
