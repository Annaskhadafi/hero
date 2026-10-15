import React from 'react'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'

interface VehicleStatusBadgeProps {
  status: 'valid' | 'warning' | 'expired' | 'due' | 'none'
  remainingDays?: number | null
  dateStr?: string | null
  compact?: boolean
  showDate?: boolean
}

export function VehicleStatusBadge({
  status,
  remainingDays,
  dateStr,
  compact = false,
  showDate = false,
}: VehicleStatusBadgeProps) {
  if (status === 'none') {
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-xs">
        -
      </Badge>
    )
  }

  if (status === 'expired') {
    return (
      <div className="flex flex-col gap-0.5">
        <Badge
          variant="outline"
          className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 text-xs font-semibold gap-1 inline-flex items-center w-fit"
        >
          <AlertCircle className="w-3 h-3 text-rose-600" />
          {remainingDays !== null && remainingDays !== undefined
            ? remainingDays < 0
              ? `Lewat ${Math.abs(remainingDays)} hari`
              : 'Hari ini Expired'
            : 'Expired'}
        </Badge>
        {showDate && dateStr && (
          <span className="text-[11px] text-muted-foreground font-mono">{dateStr}</span>
        )}
      </div>
    )
  }

  if (status === 'warning') {
    return (
      <div className="flex flex-col gap-0.5">
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 text-xs font-semibold gap-1 inline-flex items-center w-fit"
        >
          <AlertTriangle className="w-3 h-3 text-amber-600" />
          {remainingDays !== null && remainingDays !== undefined
            ? `H-${remainingDays}`
            : 'Mendekati'}
        </Badge>
        {showDate && dateStr && (
          <span className="text-[11px] text-muted-foreground font-mono">{dateStr}</span>
        )}
      </div>
    )
  }

  if (status === 'due') {
    return (
      <div className="flex flex-col gap-0.5">
        <Badge
          variant="outline"
          className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 text-xs font-semibold gap-1 inline-flex items-center w-fit"
        >
          <Clock className="w-3 h-3 text-rose-600" />
          Perlu Servis
        </Badge>
        {showDate && dateStr && (
          <span className="text-[11px] text-muted-foreground font-mono">{dateStr}</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <Badge
        variant="outline"
        className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-xs font-semibold gap-1 inline-flex items-center w-fit"
      >
        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
        {compact ? 'Aktif' : remainingDays !== null && remainingDays !== undefined ? `${remainingDays} hr lagi` : 'Valid'}
      </Badge>
      {showDate && dateStr && (
        <span className="text-[11px] text-muted-foreground font-mono">{dateStr}</span>
      )}
    </div>
  )
}
