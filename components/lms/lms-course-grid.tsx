'use client'

import { LmsCourseCard, type LmsCourseCardProps } from '@/components/lms/lms-course-card'

interface LmsCourseGridProps {
  courses: Array<{
    course: LmsCourseCardProps['course']
    enrollment?: LmsCourseCardProps['enrollment']
    href: string
  }>
  emptyStateTitle?: string
  emptyStateDescription?: string
}

export function LmsCourseGrid({ 
  courses, 
  emptyStateTitle = 'Tidak Ada Kursus',
  emptyStateDescription = 'Belum ada kursus yang tersedia saat ini.'
}: LmsCourseGridProps) {
  if (courses.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
        <h3 className="text-lg font-bold font-heading text-slate-900 mb-2">{emptyStateTitle}</h3>
        <p className="text-slate-500">{emptyStateDescription}</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {courses.map((item) => (
        <LmsCourseCard
          key={item.course.id}
          course={item.course}
          enrollment={item.enrollment}
          href={item.href}
        />
      ))}
    </div>
  )
}
