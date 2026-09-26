'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DailyActivityCreateModal,
  type ModalEmployee,
  type ModalPreset,
  type ModalSite,
} from '@/components/daily-activity-create-modal'
import type { RouteFolder } from '@/lib/daily-activity'

interface MyDayActivityCreateTriggerProps {
  employees: ModalEmployee[]
  sites: ModalSite[]
  activityPresets?: ModalPreset[]
  routeFolders?: RouteFolder[]
  sectionHeadMap?: Record<string, number | null>
  deptHeadMap?: Record<string, number | null>
  currentEmployeeId?: number
  className?: string
  label?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  children?: React.ReactNode
}

export function MyDayActivityCreateTrigger({
  employees,
  sites,
  activityPresets,
  routeFolders,
  sectionHeadMap,
  deptHeadMap,
  currentEmployeeId,
  className,
  label = 'Tambah Aktivitas',
  size = 'default',
  variant = 'default',
  children,
}: MyDayActivityCreateTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size={size}
        variant={variant}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-sm shadow-blue-500/25 transition-all duration-150 hover:bg-blue-700 active:scale-[0.98] active:bg-blue-800 disabled:opacity-50',
          className
        )}
      >
        {children ?? (
          <>
            <Plus className="size-4 shrink-0" />
            <span>{label}</span>
          </>
        )}
      </Button>

      <DailyActivityCreateModal
        open={open}
        onOpenChange={setOpen}
        employees={employees}
        sites={sites}
        activityPresets={activityPresets}
        routeFolders={routeFolders}
        sectionHeadMap={sectionHeadMap}
        deptHeadMap={deptHeadMap}
        defaultEmployeeId={currentEmployeeId}
      />
    </>
  )
}
