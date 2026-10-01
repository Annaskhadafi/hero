'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Clock, Calendar, ShieldAlert, Award, FileSpreadsheet, FileText } from 'lucide-react'
import { formatMinutesToHours, classifyEwh } from '@/lib/ewh/calculate-ewh'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'

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

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()
    const wsData: any[][] = []
    wsData.push([`LAPORAN EWH INDIVIDU - ${employee.name.toUpperCase()} (${employee.employeeSn})`])
    wsData.push([`Periode: ${period} | Jabatan: ${employee.jobTitle} | Section: ${employee.section || '-'} | Dept: ${employee.department || '-'}`])
    wsData.push([`Rata-rata EWH: ${stats.avgEwh.toFixed(1)}% | Hari Kehadiran: ${stats.presentDays}/${stats.totalDays} | Total Efektif: ${formatMinutesToHours(stats.totalEffective)} | Lembur: ${formatMinutesToHours(stats.totalOvertime)}`])
    wsData.push([])

    const headers = ['No', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Durasi Kerja', 'Break (Mnt)', 'Jam Efektif', 'Jam Lembur', 'Idle / Off', 'EWH Score (%)', 'Status']
    wsData.push(headers)

    rows.forEach((r, idx) => {
      const dateObj = new Date(r.workDate)
      const dateStr = dateObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      const dayClass = classifyEwh(r.ewhPercent)
      const dayLabel = EWH_CLASS_CONFIG[dayClass]?.label || dayClass
      wsData.push([
        idx + 1,
        dateStr,
        r.clockIn || '-',
        r.clockOut || '-',
        formatMinutesToHours(r.clockDurationMinutes),
        r.breakMinutes,
        formatMinutesToHours(r.effectiveMinutes),
        formatMinutesToHours(r.overtimeMinutes),
        formatMinutesToHours(r.idleMinutes),
        `${r.ewhPercent.toFixed(1)}%`,
        dayLabel,
      ])
    })

    const ws = XLSX.utils.aoa_to_sheet(wsData)
    ws['!cols'] = [{ wch: 6 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws, 'EWH Detail')
    XLSX.writeFile(wb, `EWH_${employee.name.replace(/\s+/g, '_')}_${period}.xlsx`)
    toast.success('File Excel EWH Karyawan berhasil diunduh!')
  }

  const handleExportPdf = () => {
    const printable = window.open('', '_blank', 'width=1100,height=850')
    if (!printable) {
      toast.error('Pop-up terblokir oleh browser. Harap izinkan pop-up untuk mencetak.')
      return
    }

    const todayStr = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date())

    printable.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>EWH Record - ${employee.name} - ${period}</title>
          <style>
            @page { size: portrait; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 12px; font-size: 11px; }
            .header-table { width: 100%; border-bottom: 2px solid #003461; padding-bottom: 8px; margin-bottom: 12px; }
            .company { font-size: 13px; font-weight: 900; color: #003461; }
            .title { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; }
            .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
            .kpi-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #f8fafc; }
            .kpi-card .lbl { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; }
            .kpi-card .val { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; }
            table.dtable { width: 100%; border-collapse: collapse; margin-top: 8px; }
            table.dtable th { background: #003461; color: #fff; font-size: 10px; font-weight: 700; padding: 6px 8px; border: 1px solid #00284d; text-align: left; }
            table.dtable td { font-size: 10px; padding: 5px 8px; border: 1px solid #cbd5e1; }
            table.dtable tr:nth-child(even) { background: #f8fafc; }
            .footer-sigs { margin-top: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; page-break-inside: avoid; }
            .sig-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px; text-align: center; }
            .sig-space { height: 45px; }
            .sig-name { font-size: 10.5px; font-weight: 700; border-top: 1px dashed #94a3b8; padding-top: 4px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="company">PT CHITRA PARATAMA</div>
                <div class="title">LAPORAN EWH INDIVIDU KARYAWAN</div>
                <div class="subtitle">Nama: <b>${employee.name}</b> (${employee.employeeSn}) | Posisi: ${employee.jobTitle} | Periode: ${period}</div>
              </td>
              <td style="text-align: right; vertical-align: bottom; font-size: 10px; color: #64748b;">
                Tanggal Cetak: ${todayStr}
              </td>
            </tr>
          </table>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="lbl">Rata-rata EWH</div>
              <div class="val" style="color: #003461;">${stats.avgEwh.toFixed(1)}%</div>
            </div>
            <div class="kpi-card">
              <div class="lbl">Hari Kehadiran</div>
              <div class="val">${stats.presentDays} / ${stats.totalDays} <span style="font-size: 10px; font-weight: 500;">Hari</span></div>
            </div>
            <div class="kpi-card">
              <div class="lbl">Total Jam Efektif</div>
              <div class="val" style="color: #059669;">${formatMinutesToHours(stats.totalEffective)}</div>
            </div>
            <div class="kpi-card">
              <div class="lbl">Total Lembur Disetujui</div>
              <div class="val" style="color: #ea580c;">${formatMinutesToHours(stats.totalOvertime)}</div>
            </div>
          </div>

          <table class="dtable">
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">No</th>
                <th>Tanggal</th>
                <th>Jam Masuk - Pulang</th>
                <th style="text-align: right;">Durasi Kerja</th>
                <th style="text-align: right;">Jam Efektif</th>
                <th style="text-align: right;">Jam Lembur</th>
                <th style="text-align: right;">Score EWH</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map((r, idx) => {
                  const dateObj = new Date(r.workDate)
                  const dateStr = dateObj.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
                  const dayClass = classifyEwh(r.ewhPercent)
                  const dayLabel = EWH_CLASS_CONFIG[dayClass]?.label || dayClass
                  return `
                    <tr>
                      <td style="text-align: center;">${idx + 1}</td>
                      <td style="font-weight: 600;">${dateStr}</td>
                      <td>${r.clockIn ? `${r.clockIn} - ${r.clockOut}` : '<span style="color:#ef4444;">Absen / Off</span>'}</td>
                      <td style="text-align: right;">${formatMinutesToHours(r.clockDurationMinutes)}</td>
                      <td style="text-align: right; font-weight: 600;">${formatMinutesToHours(r.effectiveMinutes)}</td>
                      <td style="text-align: right;">${formatMinutesToHours(r.overtimeMinutes)}</td>
                      <td style="text-align: right; font-weight: 700; color: #003461;">${r.ewhPercent.toFixed(1)}%</td>
                      <td style="text-align: center;">${dayLabel}</td>
                    </tr>
                  `
                })
                .join('')}
            </tbody>
          </table>

          <div class="footer-sigs">
            <div class="sig-box">
              <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Karyawan Bersangkutan</div>
              <div class="sig-space"></div>
              <div class="sig-name">${employee.name}</div>
            </div>
            <div class="sig-box">
              <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Diperiksa Oleh (Supervisor)</div>
              <div class="sig-space"></div>
              <div class="sig-name">Supervisor / Coordinator</div>
            </div>
            <div class="sig-box">
              <div style="font-size: 9.5px; font-weight: 700; color: #64748b; text-transform: uppercase;">Disetujui Oleh (Manager)</div>
              <div class="sig-space"></div>
              <div class="sig-name">Site Manager / Project Head</div>
            </div>
          </div>

          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `)
    printable.document.close()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Back Button & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
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

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 rounded-xl shadow-xs h-9 px-3.5 cursor-pointer"
          >
            <FileSpreadsheet className="size-3.5" />
            Export Excel
          </Button>
          <Button
            onClick={handleExportPdf}
            variant="outline"
            className="border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold gap-1.5 rounded-xl shadow-xs h-9 px-3.5 cursor-pointer bg-white"
          >
            <FileText className="size-3.5 text-rose-600" />
            Export PDF
          </Button>
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
