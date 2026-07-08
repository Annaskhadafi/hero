'use client'

import { Badge } from '@/components/ui/badge'
import { Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { resolveClientUploadUrl } from '@/lib/client-url'

interface LmsCourseHeroProps {
  title: string
  category: string
  level: string
  coverImageUrl?: string
  videoPreviewUrl?: string
  progress?: number
  isEnrolled?: boolean
  dueDays?: number
  enrollmentDate?: string | Date | null
}

function CountdownTimer({ enrollmentDate, dueDays }: { enrollmentDate: string | Date | null | undefined; dueDays: number }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null)

  useEffect(() => {
    if (!enrollmentDate) return

    const enrollment = new Date(enrollmentDate)
    const deadline = new Date(enrollment.getTime() + dueDays * 24 * 60 * 60 * 1000)

    const calculateTimeLeft = () => {
      const now = new Date()
      const diff = deadline.getTime() - now.getTime()

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 }
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      }
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000)

    return () => clearInterval(timer)
  }, [enrollmentDate, dueDays])

  if (!timeLeft || !enrollmentDate) return null

  const isUrgent = timeLeft.days < 3
  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0

  if (isExpired) {
    return (
      <div className="flex items-center gap-2 bg-red-500/20 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-sm font-medium">
        <Timer className="h-4 w-4" />
        <span>Batas waktu telah habis</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 backdrop-blur-sm rounded-lg px-3 py-1.5 text-white text-sm font-medium ${isUrgent ? 'bg-red-500/20' : 'bg-white/20'}`}>
      <Timer className="h-4 w-4" />
      <span>Sisa waktu:</span>
      <div className="flex items-center gap-1 font-mono">
        {timeLeft.days > 0 && (
          <>
            <span className="bg-white/20 px-1.5 py-0.5 rounded">{timeLeft.days}</span>
            <span>h</span>
          </>
        )}
        <span className="bg-white/20 px-1.5 py-0.5 rounded">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span>:</span>
        <span className="bg-white/20 px-1.5 py-0.5 rounded">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span>:</span>
        <span className="bg-white/20 px-1.5 py-0.5 rounded">{String(timeLeft.seconds).padStart(2, '0')}</span>
      </div>
    </div>
  )
}

export function LmsCourseHero({
  title,
  category,
  level,
  coverImageUrl,
  progress = 0,
  isEnrolled = false,
  dueDays = 30,
  enrollmentDate,
}: LmsCourseHeroProps) {
  const [coverFailed, setCoverFailed] = useState(false)
  const hasCover = Boolean(coverImageUrl && !coverFailed)
  const getLevelBadgeColor = (lvl: string) => {
    switch (lvl?.toLowerCase()) {
      case 'advanced': return 'bg-rose-500 hover:bg-rose-600 text-white border-0'
      case 'intermediate': return 'bg-amber-500 hover:bg-amber-600 text-white border-0'
      case 'beginner':
      default: return 'bg-emerald-500 hover:bg-emerald-600 text-white border-0'
    }
  }

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-900 min-h-[300px] md:min-h-[400px] flex items-end">
      {/* Background Image */}
      {hasCover && (
        <div className="absolute inset-0 z-0">
          <img
            src={resolveClientUploadUrl(coverImageUrl)}
            alt={title}
            className="h-full w-full object-cover opacity-40 mix-blend-overlay"
            onError={() => setCoverFailed(true)}
          />
        </div>
      )}
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent" />

      {/* Content */}
      <div className="relative z-20 w-full p-6 md:p-10">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {category && (
            <Badge className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border-white/10 font-medium">
              {category}
            </Badge>
          )}
          <Badge className={`font-medium uppercase tracking-wider text-xs ${getLevelBadgeColor(level)}`}>
            {level || 'Beginner'}
          </Badge>
          {isEnrolled && progress > 0 && (
            <Badge className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 backdrop-blur-md border-emerald-500/30 font-medium">
              {progress}% Selesai
            </Badge>
          )}
        </div>
        
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white max-w-4xl leading-tight mb-4">
          {title}
        </h1>

        {/* Timer */}
        {isEnrolled && enrollmentDate && (
          <CountdownTimer enrollmentDate={enrollmentDate} dueDays={dueDays} />
        )}
      </div>
    </div>
  )
}
