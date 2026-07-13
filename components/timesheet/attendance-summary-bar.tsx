'use client'

import { FileSpreadsheet, Pencil, ScanFace } from 'lucide-react'

export interface AttendanceSummaryBarProps {
  faceDays: number
  excelDays: number
  manualDays: number
  totalFilledDays: number
  facePercentage: number // 0-100, 1 decimal
}

export function AttendanceSummaryBar({
  faceDays,
  excelDays,
  manualDays,
  totalFilledDays,
  facePercentage,
}: AttendanceSummaryBarProps) {
  return (
    <div className="border-border/60 grid grid-cols-2 overflow-hidden rounded-xl border bg-white text-xs sm:grid-cols-4">
      {[
        {
          label: 'Face',
          value: faceDays,
          detail: `${facePercentage.toFixed(1)}%`,
          Icon: ScanFace,
          tone: 'text-sky-700 bg-sky-50',
        },
        {
          label: 'Excel',
          value: excelDays,
          Icon: FileSpreadsheet,
          tone: 'text-emerald-700 bg-emerald-50',
        },
        { label: 'Manual', value: manualDays, Icon: Pencil, tone: 'text-amber-700 bg-amber-50' },
        { label: 'Total terisi', value: totalFilledDays, tone: 'text-slate-700 bg-slate-100' },
      ].map(({ label, value, detail, Icon, tone }) => (
        <div
          key={label}
          className="border-border/60 flex items-center gap-2 px-3 py-2.5 sm:border-r sm:last:border-r-0"
        >
          {Icon ? (
            <span className={`grid size-7 place-items-center rounded-lg ${tone}`}>
              <Icon className="size-3.5" />
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.1em] uppercase">
              {label}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-foreground font-semibold tabular-nums">{value}</span>
              {detail ? <span className="text-muted-foreground text-[11px]">{detail}</span> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
