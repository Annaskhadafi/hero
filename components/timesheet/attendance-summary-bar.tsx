'use client'

import { FileSpreadsheet, Pencil, ScanFace, CheckCircle2 } from 'lucide-react'

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
    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
      {[
        {
          label: 'Face Attendance',
          value: faceDays,
          detail: `${facePercentage.toFixed(1)}%`,
          Icon: ScanFace,
          tone: 'text-sky-700 bg-sky-50 border-sky-100',
        },
        {
          label: 'Excel Import',
          value: excelDays,
          Icon: FileSpreadsheet,
          tone: 'text-emerald-700 bg-emerald-50 border-emerald-100',
        },
        {
          label: 'Input Manual',
          value: manualDays,
          Icon: Pencil,
          tone: 'text-amber-700 bg-amber-50 border-amber-100',
        },
        {
          label: 'Total Data Terisi',
          value: totalFilledDays,
          Icon: CheckCircle2,
          tone: 'text-slate-700 bg-slate-100 border-slate-200',
        },
      ].map(({ label, value, detail, Icon, tone }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-xl border border-border/50 bg-white p-3 shadow-xs transition-all hover:border-border"
        >
          <span className={`grid size-9 shrink-0 place-items-center rounded-lg border ${tone}`}>
            <Icon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
              {label}
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="font-display text-base font-bold text-foreground tabular-nums">{value}</span>
              {detail ? (
                <span className="inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700 ring-1 ring-sky-200/60 ring-inset">
                  {detail}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

