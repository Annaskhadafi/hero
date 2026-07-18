'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Clock, Calendar, ShieldAlert, Award } from 'lucide-react'
import { formatMinutesToHours, classifyEwh } from '@/lib/ewh/calculate-ewh'

interface EwhSnapshot {
  id: number
  workDate: Date
  clockIn: string | null
  clockOut: string | null
  clockDurationMinutes: number
  breakMinutes: number
  effectiveMinutes: number
  idleMinutes: number
  ewhPercent: number
  overtimeMinutes: number
}

interface Employee {
  id: number
  name: string
  employeeSn: string
  role: string
  section: string | null
  department: string | null
  jobTitle: string
}

interface Props {
  employee: Employee
  rows: EwhSnapshot[]
  period: string
}

const EWH_CLASS_CONFIG = {
  excellent: { label: 'Excellent', color: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  good: { label: 'Baik', color: 'bg-blue-500', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  fair: { label: 'Cukup', color: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  low: { label: 'Rendah', color: 'bg-orange-500', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
  absent: { label: 'Tidak Hadir', color: 'bg-slate-300', text: 'text-slate-500', badge: 'bg-slate-100 text-slate-500' },
}

export function EwhEmployeeDetailClient({ employee, rows, period }: Props) {
  const router = useRouter()

  const stats = (() => {
    const presentDays = rows.filter((r) => r.clockDurationMinutes > 0).length
    const totalDays = rows.length
    const avgEwh = totalDays > 0 ? rows.reduce((sum, r) => sum + r.ewhPercent, 0) / totalDays : 0
    const totalEffective = rows.reduce((sum, r) => sum + r.effectiveMinutes, 0)
    const totalOvertime = rows.reduce((sum, r) => sum + r.overtimeMinutes, 0)
    const totalIdle = rows.reduce((sum, r) => sum + r.idleMinutes, 0)
    return {
      presentDays,
      totalDays,
      avgEwh,
      totalEffective,
      totalOvertime,
      totalIdle,
      classification: classifyEwh(avgEwh),
    }
  })()

  const cfg = EWH_CLASS_CONFIG[stats.classification]

  return (
    <div className="flex flex-col gap-6">
      {/* Header Back Button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/ewh?period=${period}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{employee.name}</h1>
          <p className="text-sm text-muted-foreground">
            {employee.employeeSn} · {employee.jobTitle} · {employee.section || 'No Section'}
          </p>
        </div>
      </div>

      {/* Monthly Metrics Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-4 flex flex-col gap-1 justify-center">
          <p className="text-xs text-muted-foreground">Rata-rata EWH Sebulan</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{stats.avgEwh.toFixed(1)}%</span>
            <Badge className={cfg.badge}>{cfg.label}</Badge>
          </div>
        </Card>
        <Card className="p-4 flex flex-col gap-1 justify-center">
          <p className="text-xs text-muted-foreground">Hari Kehadiran</p>
          <p className="text-2xl font-bold">
            {stats.presentDays} <span className="text-sm font-normal text-muted-foreground">/ {stats.totalDays} hari</span>
          </p>
        </Card>
        <Card className="p-4 flex flex-col gap-1 justify-center">
          <p className="text-xs text-muted-foreground">Total Jam Kerja Efektif</p>
          <p className="text-2xl font-bold">{formatMinutesToHours(stats.totalEffective)}</p>
        </Card>
        <Card className="p-4 flex flex-col gap-1 justify-center">
          <p className="text-xs text-muted-foreground">Total Lembur Disetujui</p>
          <p className="text-2xl font-bold text-orange-600">{formatMinutesToHours(stats.totalOvertime)}</p>
        </Card>
      </div>

      {/* Daily Snapshot History */}
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          Riwayat Harian
        </h2>

        <div className="flex flex-col gap-3">
          {rows.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              Tidak ada data riwayat EWH untuk periode {period}.
            </Card>
          )}

          {rows.map((row) => {
            const dateObj = new Date(row.workDate)
            const dateStr = dateObj.toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            })

            const hasClock = row.clockDurationMinutes > 0
            const dayEwhClass = classifyEwh(row.ewhPercent)
            const dayCfg = EWH_CLASS_CONFIG[dayEwhClass]

            // Calculate percentage segments for 24 hours (1440 mins)
            const effectivePct = (row.effectiveMinutes / 1440) * 100
            const breakPct = (row.breakMinutes / 1440) * 100
            const overtimePct = (row.overtimeMinutes / 1440) * 100
            const idlePct = (row.idleMinutes / 1440) * 100

            return (
              <Card key={row.id} className="p-4 hover:shadow-sm transition-shadow">
                <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
                  {/* Left Column: Date & Clock info */}
                  <div className="min-w-[200px]">
                    <div className="font-bold text-sm">{dateStr}</div>
                    {hasClock ? (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {row.clockIn} - {row.clockOut} ({formatMinutesToHours(row.clockDurationMinutes)})
                      </div>
                    ) : (
                      <div className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        Absen / Tidak Hadir
                      </div>
                    )}
                  </div>

                  {/* Middle Column: 24h Visual timeline */}
                  <div className="flex-1 flex flex-col gap-1.5 min-w-[250px]">
                    <div className="relative h-6 w-full rounded-md bg-muted overflow-hidden flex">
                      {/* Effective Segment (Green) */}
                      {row.effectiveMinutes > 0 && (
                        <div
                          className="h-full bg-emerald-500 text-[10px] text-emerald-950 font-bold flex items-center justify-center overflow-hidden"
                          style={{ width: `${effectivePct}%` }}
                          title={`Efektif: ${formatMinutesToHours(row.effectiveMinutes)}`}
                        >
                          {effectivePct > 10 && 'Efektif'}
                        </div>
                      )}
                      {/* Break Segment (Red/Yellowish-orange) */}
                      {hasClock && row.breakMinutes > 0 && (
                        <div
                          className="h-full bg-amber-500 text-[10px] text-amber-950 font-bold flex items-center justify-center overflow-hidden border-l border-r border-background/20"
                          style={{ width: `${breakPct}%` }}
                          title={`Break: ${row.breakMinutes}m`}
                        >
                          {breakPct > 8 && 'Break'}
                        </div>
                      )}
                      {/* Overtime Segment (Orange) */}
                      {row.overtimeMinutes > 0 && (
                        <div
                          className="h-full bg-orange-400 text-[10px] text-orange-950 font-bold flex items-center justify-center overflow-hidden border-r border-background/20"
                          style={{ width: `${overtimePct}%` }}
                          title={`Overtime SPL: ${formatMinutesToHours(row.overtimeMinutes)}`}
                        >
                          {overtimePct > 10 && 'OT'}
                        </div>
                      )}
                      {/* Idle Segment (Gray) */}
                      {row.idleMinutes > 0 && (
                        <div
                          className="h-full bg-slate-300 text-[10px] text-slate-700 font-bold flex items-center justify-center overflow-hidden"
                          style={{ width: `${idlePct}%` }}
                          title={`Idle / Off: ${formatMinutesToHours(row.idleMinutes)}`}
                        >
                          {idlePct > 15 && 'Idle'}
                        </div>
                      )}
                    </div>
                    {/* Hour labels indicator */}
                    <div className="flex justify-between text-[10px] text-muted-foreground px-1 font-mono">
                      <span>00:00</span>
                      <span>06:00</span>
                      <span>12:00</span>
                      <span>18:00</span>
                      <span>24:00</span>
                    </div>
                  </div>

                  {/* Right Column: EWH Percent score */}
                  <div className="flex items-center gap-3 justify-end md:min-w-[120px]">
                    <div className="text-right">
                      <div className="text-lg font-bold">{row.ewhPercent.toFixed(1)}%</div>
                      <div className="text-[10px] text-muted-foreground">EWH Score</div>
                    </div>
                    <Badge className={dayCfg.badge}>{dayCfg.label}</Badge>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
