'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, BookOpen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { resolveClientUploadUrl } from '@/lib/client-url'
import { Progress } from '@/components/ui/progress'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface LmsCourseCardProps {
  course: {
    id: number
    title: string
    slug: string
    category: string // Master table name or text
    level: string // beginner, intermediate, advanced
    coverImageUrl?: string
    estimatedMinutes: number
    lessonCount?: number
    status?: string // draft, published
  }
  enrollment?: {
    progress: number
    status: string
  }
  href: string
}

export function LmsCourseCard({ course, enrollment, href }: LmsCourseCardProps) {
  const isDraft = course.status === 'draft'
  const isEnrolled = !!enrollment
  const [coverFailed, setCoverFailed] = useState(false)
  const hasCover = Boolean(course.coverImageUrl && !coverFailed)
  
  const getLevelBadgeColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'advanced': return 'bg-rose-100 text-rose-800 border-rose-200'
      case 'intermediate': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'beginner':
      default: return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    }
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(6,81,237,0.15)] border border-slate-100 h-full">
      {/* Thumbnail */}
      <Link href={href} className="relative block h-40 w-full overflow-hidden bg-slate-100">
        {hasCover ? (
          <img
            src={resolveClientUploadUrl(course.coverImageUrl)}
            alt={course.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-slate-300" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {course.category && (
            <Badge variant="secondary" className="bg-white/90 text-slate-700 backdrop-blur-sm border-0 font-medium">
              {course.category}
            </Badge>
          )}
          {isDraft && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
              Draft
            </Badge>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2">
          <Badge variant="outline" className={`text-[10px] font-semibold uppercase tracking-wider ${getLevelBadgeColor(course.level)}`}>
            {course.level || 'Beginner'}
          </Badge>
        </div>

        <Link href={href} className="group-hover:text-primary transition-colors">
          <h3 className="font-heading text-base font-bold text-slate-900 line-clamp-2 leading-tight mb-3">
            {course.title}
          </h3>
        </Link>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4 mt-auto">
          {course.estimatedMinutes > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{Math.round(course.estimatedMinutes / 60)}h {course.estimatedMinutes % 60}m</span>
            </div>
          )}
          {course.lessonCount !== undefined && (
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              <span>{course.lessonCount} Lessons</span>
            </div>
          )}
        </div>

        {/* Progress or CTA */}
        {isEnrolled ? (
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-slate-600">Progress</span>
              <span className="text-slate-900">{enrollment.progress}%</span>
            </div>
            <Progress value={enrollment.progress} className="h-1.5" />
            <Link
              href={href}
              className={cn(buttonVariants({ size: "sm", variant: enrollment.progress === 100 ? "outline" : "default" }), "mt-2 w-full")}
            >
              {enrollment.progress === 100 ? "View Certificate" : "Continue"}
            </Link>
          </div>
        ) : (
          <div className="mt-2">
            <Link
              href={href}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }), "w-full transition-colors group-hover:bg-primary group-hover:text-white")}
            >
              View Course
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
