'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, ChevronRight, Clock, Users, Wrench, AlertTriangle } from 'lucide-react'
import { formatMinutesToHours } from '@/lib/ewh/calculate-ewh'
import { classifyUtility } from '@/lib/ewh/calculate-unit-utility'

interface OperatorSlot {
  employeeId: number
  employeeName: string
  section: string
  activityLabel: string
  sessionCode: string
  startedAt: string | null
  endedAt: string | null
  durationMinutes: number
  operationMode: 'operating' | 'standby' | 'breakdown'
}

interface UnitRow {
  id: number
  unitNumber: string
  unitId: number | null
  unitName: string | null
  unitType: string | null
  totalUsageMinutes: number
  utilityPercent: number
  operatorCount: number
  activityEntryCount: number
  breakdownMinutes: number
  standbyMinutes: number
  operatorSnapshot: OperatorSlot[] | unknown
}

interface Props {
  rows: UnitRow[]
  siteId: number
  dateStr: string
}

const UTILITY_CONFIG = {
  high: { label: 'High', color: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800' },
  medium: { label: 'Medium', color: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800' },
  low: { label: 'Low', color: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800' },
  idle: { label: 'Idle', color: 'bg-slate-300', badge: 'bg-slate-100 text-slate-500' },
  breakdown: { label: 'Breakdown', color: 'bg-red-500', badge: 'bg-red-100 text-red-800' },
}

const MODE_CONFIG = {
  operating: { label: 'Operasi', color: 'bg-emerald-100 text-emerald-800' },
  standby: { label: 'Stand-by', color: 'bg-amber-100 text-amber-800' },
  breakdown: { label: 'Breakdown', color: 'bg-red-100 text-red-800' },
}

function parseSnapshot(raw: unknown): OperatorSlot[] {
  if (!raw) return []
  try {
    const arr = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(arr) ? (arr as OperatorSlot[]) : []
  } catch {
    return []
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export function UnitUtilityClient({ rows, siteId, dateStr }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<UnitRow | null>(null)

  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter(
      (r) =>
        r.unitNumber.toLowerCase().includes(q) ||
        r.unitName?.toLowerCase().includes(q) ||
        r.unitType?.toLowerCase().includes(q)
    )
  }, [rows, search])

  const summary = useMemo(() => {
    const totalUnits = rows.length
    const avgUtility =
      rows.length > 0 ? rows.reduce((s, r) => s + r.utilityPercent, 0) / rows.length : 0
    const breakdownCount = rows.filter((r) => r.breakdownMinutes > 0).length
    const idleCount = rows.filter((r) => r.totalUsageMinutes === 0).length
    return { totalUnits, avgUtility: Math.round(avgUtility * 100) / 100, breakdownCount, idleCount }
  }, [rows])

  function handleDateChange(newDate: string) {
    router.push(`/dashboard/unit-utility?siteId=${siteId}&date=${newDate}`)
  }

  const selectedOperators = selectedUnit ? parseSnapshot(selectedUnit.operatorSnapshot) : []

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Unit Aktif</p>
              <p className="text-2xl font-bold">{summary.totalUnits}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <Clock className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Utilitas</p>
              <p className="text-2xl font-bold">{summary.avgUtility.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ada Breakdown</p>
              <p className="text-2xl font-bold text-red-600">{summary.breakdownCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Users className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unit Idle (0%)</p>
              <p className="text-2xl font-bold text-slate-500">{summary.idleCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari unit number, nama, atau tipe…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Input
          type="date"
          className="w-[160px]"
          value={dateStr}
          onChange={(e) => handleDateChange(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/dashboard/unit-utility/master?siteId=${siteId}`)}
        >
          <Wrench className="mr-2 h-4 w-4" />
          Master Unit
        </Button>
      </div>

      {/* Unit Cards Grid */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Tidak ada data unit untuk tanggal ini. Pastikan karyawan mengisi unitNumber di Daily Activity.
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((unit) => {
            const utilClass = classifyUtility(unit.utilityPercent)
            const cfg = UTILITY_CONFIG[utilClass]
            const operators = parseSnapshot(unit.operatorSnapshot)

            return (
              <Card
                key={unit.id}
                className="cursor-pointer p-4 hover:shadow-md transition-shadow"
                onClick={() => setSelectedUnit(unit)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base truncate">{unit.unitNumber}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                    {unit.unitName && (
                      <p className="text-xs text-muted-foreground truncate">{unit.unitName}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                </div>

                {/* Utility Bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Utilitas</span>
                    <span className="font-semibold">{unit.utilityPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className={`h-2 rounded-full transition-all ${cfg.color}`}
                      style={{ width: `${Math.min(unit.utilityPercent, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <p className="text-muted-foreground">Total Jam</p>
                    <p className="font-semibold">{formatMinutesToHours(unit.totalUsageMinutes)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Operator</p>
                    <p className="font-semibold">{unit.operatorCount}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Entries</p>
                    <p className="font-semibold">{unit.activityEntryCount}</p>
                  </div>
                </div>

                {/* Operator pills */}
                {operators.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {operators.slice(0, 3).map((op, i) => (
                      <span key={i} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
                        {op.employeeName.split(' ')[0]}
                      </span>
                    ))}
                    {operators.length > 3 && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        +{operators.length - 3} lainnya
                      </span>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedUnit} onOpenChange={() => setSelectedUnit(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {selectedUnit?.unitNumber}
              {selectedUnit?.unitName && (
                <span className="text-muted-foreground font-normal text-sm">
                  — {selectedUnit.unitName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedUnit && (
            <div className="flex flex-col gap-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Jam Pakai</p>
                  <p className="text-xl font-bold">{formatMinutesToHours(selectedUnit.totalUsageMinutes)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Utilisasi</p>
                  <p className="text-xl font-bold">{selectedUnit.utilityPercent.toFixed(1)}%</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Operator</p>
                  <p className="text-xl font-bold">{selectedUnit.operatorCount} orang</p>
                </div>
              </div>

              {/* Gantt-style timeline */}
              <div>
                <p className="text-sm font-semibold mb-2">Timeline 24 Jam</p>
                <div className="relative h-8 w-full rounded-full bg-muted overflow-hidden">
                  {selectedOperators.map((op, i) => {
                    if (!op.startedAt || !op.endedAt) return null
                    const start = new Date(op.startedAt)
                    const end = new Date(op.endedAt)
                    const startMin = start.getHours() * 60 + start.getMinutes()
                    const endMin = end.getHours() * 60 + end.getMinutes()
                    const left = (startMin / 1440) * 100
                    const width = ((endMin - startMin) / 1440) * 100
                    const colors = ['bg-blue-400', 'bg-emerald-400', 'bg-amber-400', 'bg-purple-400', 'bg-pink-400']
                    return (
                      <div
                        key={i}
                        className={`absolute top-0 h-full ${colors[i % colors.length]} opacity-80`}
                        style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                        title={`${op.employeeName} (${op.durationMinutes}m)`}
                      />
                    )
                  })}
                  {/* Hour markers */}
                  {[6, 12, 18].map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 h-full w-px bg-background/50"
                      style={{ left: `${(h / 24) * 100}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
                </div>
              </div>

              {/* Operator breakdown table */}
              <div>
                <p className="text-sm font-semibold mb-2">Detail Operator</p>
                <div className="rounded-md border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-xs">
                        <th className="px-3 py-2 text-left">Nama</th>
                        <th className="px-3 py-2 text-left">Aktivitas</th>
                        <th className="px-3 py-2 text-center">Mulai</th>
                        <th className="px-3 py-2 text-center">Selesai</th>
                        <th className="px-3 py-2 text-center">Durasi</th>
                        <th className="px-3 py-2 text-center">Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOperators.map((op, i) => {
                        const modeCfg = MODE_CONFIG[op.operationMode] ?? MODE_CONFIG.operating
                        return (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2">
                              <div className="font-medium">{op.employeeName}</div>
                              <div className="text-xs text-muted-foreground">{op.section}</div>
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground max-w-[150px] truncate">
                              {op.activityLabel}
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-xs">
                              {formatTime(op.startedAt)}
                            </td>
                            <td className="px-3 py-2 text-center font-mono text-xs">
                              {formatTime(op.endedAt)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {formatMinutesToHours(op.durationMinutes)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${modeCfg.color}`}>
                                {modeCfg.label}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
