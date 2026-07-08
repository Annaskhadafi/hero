'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Clock, BookOpen, Award, CheckCircle2, Share2, PenSquare, Timer, Play, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface LmsEnrollmentSidebarProps {
  courseSlug: string
  isAdmin: boolean
  isEnrolled: boolean
  progress: number
  estimatedMinutes: number
  lessonCount: number
  passingScore: number
  certificateEnabled: boolean
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
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-red-600 font-medium">
          <Timer className="h-5 w-5" />
          <span>Batas waktu telah habis</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`border rounded-xl p-4 ${isUrgent ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Timer className={`h-4 w-4 ${isUrgent ? 'text-red-500' : 'text-slate-500'}`} />
        <span className={`text-sm font-medium ${isUrgent ? 'text-red-600' : 'text-slate-600'}`}>Sisa Waktu</span>
      </div>
      <div className="flex items-center gap-2">
        {timeLeft.days > 0 && (
          <div className="text-center">
            <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-xl font-bold text-slate-900">
              {timeLeft.days}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">Hari</span>
          </div>
        )}
        <div className="text-center">
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-xl font-bold text-slate-900">
            {String(timeLeft.hours).padStart(2, '0')}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Jam</span>
        </div>
        <span className="text-xl font-bold text-slate-400">:</span>
        <div className="text-center">
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-xl font-bold text-slate-900">
            {String(timeLeft.minutes).padStart(2, '0')}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Menit</span>
        </div>
        <span className="text-xl font-bold text-slate-400">:</span>
        <div className="text-center">
          <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 font-mono text-xl font-bold text-slate-900">
            {String(timeLeft.seconds).padStart(2, '0')}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Detik</span>
        </div>
      </div>
    </div>
  )
}

export function LmsEnrollmentSidebar({
  courseSlug,
  isAdmin,
  isEnrolled,
  progress,
  estimatedMinutes,
  lessonCount,
  passingScore,
  certificateEnabled,
  dueDays = 30,
  enrollmentDate,
}: LmsEnrollmentSidebarProps) {
  const isCompleted = progress >= 100

  return (
    <div className="sticky top-6 flex flex-col gap-4">
      {/* Main CTA Card */}
      <Card className="border-slate-100 shadow-[0_2px_20px_-3px_rgba(6,81,237,0.1)] rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          
          {/* Action Button */}
          <div className="mb-6">
            {isEnrolled ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-slate-600">Progress</span>
                    <span className="text-slate-900">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2.5 bg-slate-100" />
                </div>
                
                <Button asChild className="w-full h-12 text-base font-semibold shadow-sm" variant={isCompleted ? "outline" : "default"}>
                  <Link href={`/dashboard/chitralearning-lms/courses/${courseSlug}/learn`}>
                    {isCompleted ? (
                      <>
                        <RotateCcw className="mr-2 h-5 w-5" />
                        Ulangi Kursus
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5" />
                        {progress > 0 ? "Lanjutkan Belajar" : "Mulai Belajar"}
                      </>
                    )}
                  </Link>
                </Button>
              </div>
            ) : (
              <Button asChild className="w-full h-12 text-base font-semibold shadow-sm">
                <Link href={`/dashboard/chitralearning-lms/courses/${courseSlug}/learn`}>
                  <Play className="mr-2 h-5 w-5" />
                  Mulai Kursus Sekarang
                </Link>
              </Button>
            )}
          </div>

          {/* Countdown Timer */}
          {isEnrolled && enrollmentDate && (
            <div className="mb-6">
              <CountdownTimer enrollmentDate={enrollmentDate} dueDays={dueDays} />
            </div>
          )}

          {/* Meta Info */}
          <div className="space-y-4 text-sm text-slate-600 border-t border-slate-100 pt-6">
            <h4 className="font-semibold text-slate-900 mb-3 font-heading uppercase tracking-wider text-xs">Detail Kursus</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-slate-400" />
                <span>Durasi</span>
              </div>
              <span className="font-medium text-slate-900">{Math.round(estimatedMinutes / 60)}j {estimatedMinutes % 60}m</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-slate-400" />
                <span>Total Materi</span>
              </div>
              <span className="font-medium text-slate-900">{lessonCount} Lesson</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-slate-400" />
                <span>Nilai Lulus</span>
              </div>
              <span className="font-medium text-slate-900">{passingScore}%</span>
            </div>
            
            {certificateEnabled && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Award className="h-4 w-4 text-emerald-500" />
                  <span className="text-emerald-700">Sertifikat</span>
                </div>
                <span className="font-medium text-emerald-700">Ya</span>
              </div>
            )}
          </div>

        </CardContent>
      </Card>

      {/* Admin Actions */}
      {isAdmin && (
        <Button asChild variant="outline" className="w-full border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100">
          <Link href={`/dashboard/chitralearning-lms/courses/${courseSlug}/edit`}>
            <PenSquare className="mr-2 h-4 w-4" />
            Edit Kursus (Admin)
          </Link>
        </Button>
      )}

      {/* Share Actions */}
      <Button variant="ghost" className="w-full text-slate-500 hover:text-slate-900" onClick={() => {
        navigator.clipboard.writeText(window.location.href)
      }}>
        <Share2 className="mr-2 h-4 w-4" />
        Salin Link Kursus
      </Button>
    </div>
  )
}
