'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { PlayCircle, FileText, CheckCircle2, LockKeyhole, FileQuestion, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export type LessonType = 'video' | 'resource' | 'article' | 'quiz' | 'pretest' | 'posttest'

export interface CurriculumLesson {
  id: number
  title: string
  type: LessonType
  durationMinutes: number
  isCompleted: boolean
  isLocked: boolean
}

export interface CurriculumSection {
  title: string
  lessons: CurriculumLesson[]
}

interface LmsCurriculumAccordionProps {
  sections: CurriculumSection[]
  defaultExpanded?: boolean
  courseSlug?: string
}

function lessonIcon(type: LessonType) {
  switch (type) {
    case 'video': return <PlayCircle className="h-4 w-4" />
    case 'quiz':
    case 'pretest':
    case 'posttest': return <FileQuestion className="h-4 w-4" />
    case 'resource':
    case 'article': return <FileText className="h-4 w-4" />
    default: return <PlayCircle className="h-4 w-4" />
  }
}

function lessonLabel(type: LessonType) {
  if (type === 'pretest') return 'Pre-test'
  if (type === 'posttest') return 'Post-test'
  if (type === 'article') return 'Artikel'
  if (type === 'quiz') return 'Quiz'
  return 'Video'
}

function lessonColor(type: LessonType) {
  switch (type) {
    case 'video': return 'bg-blue-100 text-blue-600'
    case 'quiz': return 'bg-amber-100 text-amber-600'
    case 'pretest': return 'bg-violet-100 text-violet-600'
    case 'posttest': return 'bg-rose-100 text-rose-600'
    default: return 'bg-slate-100 text-slate-600'
  }
}

export function LmsCurriculumAccordion({ sections, defaultExpanded = true, courseSlug }: LmsCurriculumAccordionProps) {
  const defaultValues = defaultExpanded ? sections.map((_, i) => `section-${i}`) : []

  const totalLessons = sections.reduce((acc, s) => acc + s.lessons.length, 0)
  const completedLessons = sections.reduce((acc, s) => acc + s.lessons.filter(l => l.isCompleted).length, 0)

  return (
    <div className="space-y-4">
      {/* Progress Summary */}
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">Progress Kurikulum</span>
          <span className="text-sm font-semibold text-slate-900">{completedLessons}/{totalLessons} Materi</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div 
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      <Accordion type="multiple" defaultValue={defaultValues} className="w-full space-y-3">
        {sections.map((section, index) => {
          const sectionCompleted = section.lessons.filter(l => l.isCompleted).length
          return (
            <AccordionItem 
              key={index} 
              value={`section-${index}`}
              className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm"
            >
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-slate-50 transition-colors">
                <div className="flex flex-col items-start text-left flex-1">
                  <div className="flex items-center gap-3 w-full">
                    <span className="font-heading font-semibold text-slate-900">
                      {section.title || 'Materi Pembelajaran'}
                    </span>
                    {sectionCompleted === section.lessons.length && section.lessons.length > 0 && (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-500">
                      {sectionCompleted}/{section.lessons.length} materi
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">
                      {section.lessons.reduce((acc, l) => acc + l.durationMinutes, 0)} menit
                    </span>
                  </div>
                </div>
              </AccordionTrigger>
              
              <AccordionContent className="pt-0 pb-2 px-2">
                <div className="flex flex-col gap-1 mt-2">
                  {section.lessons.map((lesson) => {
                    const lessonContent = (
                      <div 
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-all",
                          lesson.isLocked 
                            ? "opacity-60 cursor-not-allowed bg-slate-50 border-transparent" 
                            : lesson.isCompleted
                              ? "bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50 cursor-pointer"
                              : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm cursor-pointer"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "flex-shrink-0 p-2 rounded-lg",
                            lesson.isCompleted ? "bg-emerald-100 text-emerald-600" : lessonColor(lesson.type)
                          )}>
                            {lesson.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : lessonIcon(lesson.type)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "font-medium text-sm truncate",
                                lesson.isLocked ? "text-slate-500" : "text-slate-700"
                              )}>
                                {lesson.title}
                              </span>
                              <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                lessonColor(lesson.type)
                              )}>
                                {lessonLabel(lesson.type)}
                              </span>
                            </div>
                            {lesson.durationMinutes > 0 && (
                              <span className="text-xs text-slate-400">{lesson.durationMinutes} menit</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {lesson.isLocked ? (
                            <LockKeyhole className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ExternalLink className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </div>
                    )

                    if (!lesson.isLocked && courseSlug) {
                      return (
                        <Link 
                          key={lesson.id} 
                          href={`/dashboard/chitralearning-lms/courses/${courseSlug}/learn?lessonId=${lesson.id}`}
                          className="block"
                        >
                          {lessonContent}
                        </Link>
                      )
                    }

                    return (
                      <div key={lesson.id} className="group">
                        {lessonContent}
                      </div>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
