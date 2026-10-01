'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Clock,
  Calendar,
  ShieldAlert,
  Award,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  Download,
} from 'lucide-react'
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
  const [pdfPreviewState, setPdfPreviewState] = useState<{
    url: string
    filename: string
    title: string
  } | null>(null)

  const handleClosePdfPreview = () => {
    if (pdfPreviewState?.url) {
      URL.revokeObjectURL(pdfPreviewState.url)
    }
    setPdfPreviewState(null)
  }

  const handleDownloadPdfFromPreview = () => {
    if (!pdfPreviewState) return
    const a = document.createElement('a')
    a.href = pdfPreviewState.url
    a.download = pdfPreviewState.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success('File PDF berhasil diunduh!')
  }

  const stats = (() => {
    const presentDays = rows.filter((r) => r.clockDurationMinutes > 0).length
    const totalDays = rows.length
    const totalClock = rows.reduce((sum, r) => sum + r.clockDurationMinutes, 0)
    const totalEffective = rows.reduce((sum, r) => sum + r.effectiveMinutes, 0)
    const totalOvertime = rows.reduce((sum, r) => sum + r.overtimeMinutes, 0)
    const totalIdle = rows.reduce((sum, r) => sum + r.idleMinutes, 0)
    const avgEwh = totalClock > 0 ? (totalEffective / totalClock) * 100 : 0
    return {
      presentDays,
      totalDays,
      avgEwh,
      totalClock,
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

  const handleExportPdf = async () => {
    try {
      toast.loading('Menyiapkan file PDF EWH...', { id: 'ewh-pdf' })
      const { generateEwhEmployeeDetailPdf } = await import('@/lib/timesheet/generate-ewh-pdf')

      const dayData = rows.map((r) => {
        const dateObj = new Date(r.workDate)
        const day = dateObj.getDate()
        const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(dateObj)
        const dayClass = classifyEwh(r.ewhPercent)
        const dayLabel = EWH_CLASS_CONFIG[dayClass]?.label || dayClass

        return {
          day,
          dayName,
          dateStr: dateObj.toISOString().slice(0, 10),
          clockIn: r.clockIn || '',
          clockOut: r.clockOut || '',
          durationHours: r.clockDurationMinutes / 60,
          effectiveHours: r.effectiveMinutes / 60,
          overtimeHours: r.overtimeMinutes / 60,
          ewhPercent: r.ewhPercent,
          isHoliday: false,
          status: r.clockIn ? 'present' : 'absent',
          remark: !r.clockIn ? 'Off / Absen' : dayLabel,
        }
      })

      const pdfBytes = await generateEwhEmployeeDetailPdf({
        period,
        employeeName: employee.name,
        employeeSn: employee.employeeSn,
        department: employee.department || 'Operations',
        section: employee.section || 'General',
        siteName: 'Site Operational',
        jobTitle: employee.jobTitle,
        days: dayData,
        totals: {
          presentDays: stats.presentDays,
          totalDurationHours: stats.totalClock / 60,
          totalEffectiveHours: stats.totalEffective / 60,
          totalOvertimeHours: stats.totalOvertime / 60,
          avgEwhPercent: stats.avgEwh,
        },
        signatures: {
          preparedBy: employee.name,
          pjoLeader: 'Supervisor / PJO',
          approvedBy: 'Site Manager',
          hrName: 'Human Capital',
        },
      })

      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const cleanName = employee.name.replace(/\s+/g, '_')
      const downloadFilename = `EWH_Record_${cleanName}_${period}.pdf`
      setPdfPreviewState({
        url,
        filename: downloadFilename,
        title: `EWH Record - ${employee.name}`,
      })

      toast.success('Preview PDF EWH Karyawan siap!', { id: 'ewh-pdf' })
    } catch (err) {
      console.error('[EWH PDF Error]', err)
      toast.error('Gagal men-generate PDF EWH', { id: 'ewh-pdf' })
    }
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

      {/* PDF Preview Modal Dialog */}
      <Dialog open={!!pdfPreviewState} onOpenChange={(open) => !open && handleClosePdfPreview()}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-2xl">
          <DialogHeader className="p-4 bg-slate-900 text-white shrink-0 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <FileText className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  Preview Dokumen PDF EWH Karyawan
                </DialogTitle>
                <p className="text-xs text-slate-300 font-mono">
                  {pdfPreviewState?.filename}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pr-6">
              {pdfPreviewState?.url && (
                <a
                  href={pdfPreviewState.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                  Tab Baru
                </a>
              )}
              <Button
                size="sm"
                onClick={handleDownloadPdfFromPreview}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 rounded-lg shadow-sm h-8 px-3 cursor-pointer"
              >
                <Download className="size-3.5" />
                Download PDF
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 w-full bg-slate-100 overflow-hidden relative">
            {pdfPreviewState?.url && (
              <iframe
                src={pdfPreviewState.url}
                className="w-full h-full border-0"
                title="Preview Dokumen PDF EWH Karyawan"
              />
            )}
          </div>

          <DialogFooter className="p-3 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between sm:justify-between">
            <span className="text-xs text-slate-500">
              Gunakan tombol <strong>Download PDF</strong> untuk menyimpan file ke komputer Anda.
            </span>
            <Button size="sm" variant="outline" onClick={handleClosePdfPreview} className="rounded-xl cursor-pointer">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
