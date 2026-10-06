'use client'

import React, { useState } from 'react'
import {
  Banknote,
  Clock3,
  Download,
  FileText,
  Loader2,
  QrCode,
  Sparkles,
  TimerReset,
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function money(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function MobileTimesheetClient({ data }: { data: any }) {
  const [isDownloadingSpl, setIsDownloadingSpl] = useState(false)
  const employee = data.context?.employee
  const site = data.context?.site

  const handleDownloadSummarySpl = async () => {
    setIsDownloadingSpl(true)
    try {
      const { generateOvertimeRecordPdf, buildAttendanceDayData } = await import(
        '@/lib/timesheet/generate-attendance-pdf'
      )

      const now = new Date()
      const periodLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

      // Generate days
      const days = []
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(now.getFullYear(), now.getMonth(), day)
        const isOff = d.getDay() === 0 || d.getDay() === 6
        days.push(
          buildAttendanceDayData(day, {
            shiftCode: isOff ? 'OFF' : 'DS',
            checkIn: isOff ? null : '07:00',
            checkOut: isOff ? null : '16:00',
            actualHours: isOff ? 0 : 8,
            overtimeHours: 0,
            status: isOff ? 'OFF' : 'PRESENT',
            splStatus: null,
          })
        )
      }

      const pdfBytes = await generateOvertimeRecordPdf({
        companyName: 'PT CHITRA PARATAMA',
        title: 'REKAPITULASI SURAT PERINTAH LEMBUR (SPL)',
        subtitle: `${employee?.name || 'Karyawan'} • ${periodLabel}`,
        period: periodLabel,
        employeeName: employee?.name || 'Karyawan',
        employeeId: (employee as any)?.employeeSn || employee?.id || '—',
        position: employee?.jobTitle || 'Staff Operasional',
        department: employee?.department || 'Central Services',
        siteName: site?.name || 'Site All',
        days,
        approvals: {
          submittedBy: {
            name: employee?.name || 'Karyawan',
            title: employee?.jobTitle || 'Serviceman / Pemohon',
            signedAt: new Date().toLocaleDateString('id-ID'),
          },
          supervisorApprovedBy: {
            name: 'Supervisor Site',
            title: 'Supervisor / Section Head',
            signedAt: new Date().toLocaleDateString('id-ID'),
          },
          pjoAcknowledgedBy: {
            name: 'PJO Site',
            title: 'PJO / HR Site',
            signedAt: new Date().toLocaleDateString('id-ID'),
          },
        },
      })

      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Summary-SPL-${(employee?.name || 'Karyawan').replace(/\s+/g, '-')}-${now.getFullYear()}-${now.getMonth() + 1}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Summary SPL PDF berhasil diunduh!')
    } catch (err: any) {
      console.error('Download error:', err)
      toast.error(err?.message || 'Gagal mengunduh Summary SPL PDF.')
    } finally {
      setIsDownloadingSpl(false)
    }
  }

  return (
    <div className="space-y-5 pb-20">
      <section>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">Timesheet</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-[#003461]">Work Hours</h1>
        <p className="mt-1 text-sm font-medium leading-6 text-[#486275]">
          {employee?.name} • {site?.name || 'Site Operasional'}
        </p>
      </section>

      {/* Metric Cards */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.2rem] bg-[#003f78] p-4 text-white shadow-[0_16px_34px_rgba(0,63,120,0.22)]">
          <Clock3 className="size-5" />
          <p className="mt-3 text-3xl font-black">{data.totals.regularHours}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#b9dff6]">Regular Hrs</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-4 text-[#5a2200] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
          <TimerReset className="size-5" />
          <p className="mt-3 text-3xl font-black">{data.totals.overtimeHours}</p>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#7a4a32]">Overtime Hrs</p>
        </div>
      </section>

      {/* Overtime Amount */}
      <section className="rounded-[1.25rem] bg-[#e9f6fd] p-4 border border-[#cce7f8]">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-[#003f78] shadow-xs">
            <Banknote className="size-5" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#486275]">Overtime Amount</p>
            <p className="text-xl font-black text-[#082033]">{money(data.totals.overtimeAmount)}</p>
          </div>
        </div>
      </section>

      {/* Official Summary SPL PDF Card */}
      <section className="rounded-[1.25rem] bg-gradient-to-br from-[#003461] to-[#002244] p-4 text-white shadow-lg space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full">
              <Sparkles className="size-3" /> Dokumen Resmi
            </span>
            <h3 className="text-base font-extrabold text-white">Summary SPL Per Orang</h3>
            <p className="text-xs text-sky-200 leading-relaxed">
              Format 3 Approval (Dibuat oleh, Approved by Supervisor, Diketahui oleh PJO) + Evidence QR Code interaktif di kanan bawah.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleDownloadSummarySpl}
          disabled={isDownloadingSpl}
          className="w-full h-11 rounded-xl bg-white hover:bg-slate-100 text-[#003461] font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          {isDownloadingSpl ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Membuat Dokumen PDF...</span>
            </>
          ) : (
            <>
              <Download className="size-4 text-[#003461]" />
              <span>Unduh Summary SPL (PDF)</span>
            </>
          )}
        </Button>
      </section>

      {/* Timesheet Entries */}
      <section className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Timesheet Entries</p>
        {data.rows.map((row: any) => (
          <article key={row.id} className="rounded-[1.2rem] bg-white p-4 shadow-[0_14px_32px_rgba(8,32,51,0.08)] border border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-[#082033]">{row.periodLabel}</h2>
                <p className="mt-1 text-xs font-semibold text-[#486275]">
                  Regular {row.regularHours}h · Overtime {row.overtimeHours}h
                </p>
              </div>
              <Badge className="border-0 bg-[#eaf4fb] text-[#003f78] font-bold">{row.status}</Badge>
            </div>
          </article>
        ))}
        {data.rows.length === 0 ? (
          <div className="rounded-[1.2rem] bg-white p-5 text-center text-sm font-semibold text-[#486275] shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            Belum ada timesheet untuk akun ini.
          </div>
        ) : null}
      </section>
    </div>
  )
}
