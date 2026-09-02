'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DailyActivityCreateModal,
  type ModalEmployee,
  type ModalPreset,
  type ModalSite,
} from '@/components/daily-activity-create-modal'

interface MyDayActivityCreateTriggerProps {
  employees: ModalEmployee[]
  sites: ModalSite[]
  activityPresets?: ModalPreset[]
  sectionHeadMap?: Record<string, number | null>
  deptHeadMap?: Record<string, number | null>
  currentEmployeeId?: number
}

export function MyDayActivityCreateTrigger({
  employees,
  sites,
  activityPresets,
  sectionHeadMap,
  deptHeadMap,
  currentEmployeeId,
}: MyDayActivityCreateTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className="rounded-full">
        <Sparkles className="size-4 mr-1.5" />
        Input Aktivitas Harian
      </Button>

      <DailyActivityCreateModal
        open={open}
        onOpenChange={setOpen}
        employees={employees}
        sites={sites}
        activityPresets={activityPresets}
        sectionHeadMap={sectionHeadMap}
        deptHeadMap={deptHeadMap}
        defaultEmployeeId={currentEmployeeId}
      />
    </>
  )
}
