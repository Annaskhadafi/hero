'use client'

import { FileSpreadsheet, Pencil, ScanFace } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

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
    <Card className="flex flex-wrap items-center gap-3 p-3 text-xs">
      <div className="flex items-center gap-1.5">
        <ScanFace className="h-3.5 w-3.5 text-blue-600" />
        <span>Face:</span>
        <Badge variant="secondary" className="px-1.5 py-0 text-xs">
          {faceDays}
        </Badge>
        <span className="text-muted-foreground">({facePercentage.toFixed(1)}%)</span>
      </div>

      <span className="text-muted-foreground">|</span>

      <div className="flex items-center gap-1.5">
        <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
        <span>Excel:</span>
        <Badge variant="secondary" className="px-1.5 py-0 text-xs">
          {excelDays}
        </Badge>
      </div>

      <span className="text-muted-foreground">|</span>

      <div className="flex items-center gap-1.5">
        <Pencil className="h-3.5 w-3.5 text-orange-500" />
        <span>Manual:</span>
        <Badge variant="secondary" className="px-1.5 py-0 text-xs">
          {manualDays}
        </Badge>
      </div>

      <span className="text-muted-foreground">|</span>

      <div className="flex items-center gap-1.5">
        <span className="font-medium">Total:</span>
        <Badge variant="outline" className="px-1.5 py-0 text-xs">
          {totalFilledDays}
        </Badge>
      </div>
    </Card>
  )
}
