'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { LmsCurriculumAccordion, type CurriculumSection } from '@/components/lms/lms-curriculum-accordion'

interface LmsPlayerSidebarProps {
  courseTitle: string
  sections: CurriculumSection[]
  className?: string
}

export function LmsPlayerSidebar({ courseTitle, sections, className }: LmsPlayerSidebarProps) {
  return (
    <div className={`flex flex-col h-full bg-white border-l border-slate-100 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-100 shrink-0">
        <h2 className="font-heading font-bold text-slate-900 line-clamp-2 mb-4 text-sm">
          {courseTitle}
        </h2>
      </div>

      {/* Curriculum */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <LmsCurriculumAccordion sections={sections} defaultExpanded={true} />
        </div>
      </ScrollArea>
    </div>
  )
}
