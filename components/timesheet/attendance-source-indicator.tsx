'use client'

import { ScanFace, FileSpreadsheet, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export type AttendanceSource = 'attendance' | 'excel' | 'manual'

export interface AttendanceSourceIndicatorProps {
  source: AttendanceSource
  confidenceScore?: number // 0-1, only relevant for 'attendance' source
  timestamp?: string // ISO 8601
}

const SOURCE_CONFIG: Record<
  AttendanceSource,
  { icon: typeof ScanFace; label: string; className: string }
> = {
  attendance: {
    icon: ScanFace,
    label: 'Face Attendance',
    className: 'text-blue-500',
  },
  excel: {
    icon: FileSpreadsheet,
    label: 'Excel Import',
    className: 'text-green-600',
  },
  manual: {
    icon: Pencil,
    label: 'Manual Entry',
    className: 'text-amber-500',
  },
}

function formatTimestamp(iso: string): string {
  try {
    return format(new Date(iso), 'yyyy-MM-dd HH:mm')
  } catch {
    return iso
  }
}

function formatConfidence(score: number): string {
  return `${Math.round(score * 100)}%`
}

export function AttendanceSourceIndicator({
  source,
  confidenceScore,
  timestamp,
}: AttendanceSourceIndicatorProps) {
  const config = SOURCE_CONFIG[source]
  const Icon = config.icon

  const tooltipLines: string[] = [config.label]

  if (timestamp) {
    tooltipLines.push(formatTimestamp(timestamp))
  }

  if (source === 'attendance' && confidenceScore != null) {
    tooltipLines.push(`Confidence: ${formatConfidence(confidenceScore)}`)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default items-center">
          <Icon className={`h-3.5 w-3.5 ${config.className}`} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <div className="flex flex-col gap-0.5 text-xs">
          {tooltipLines.map((line, i) => (
            <span key={i}>{line}</span>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
