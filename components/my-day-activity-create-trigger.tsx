'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { hcPrimaryActionClassName } from '@/components/hc/hc-workspace-banner'
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
}

export function MyDayActivityCreateTrigger({
  employees,
  sites,
  activityPresets,
  routeFolders,
  sectionHeadMap,
  deptHeadMap,
  currentEmployeeId,
}: MyDayActivityCreateTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className={hcPrimaryActionClassName}>
        <Plus className="size-4 mr-1.5" />
        TAMBAH AKTIVITAS
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
