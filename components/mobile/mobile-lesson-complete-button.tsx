'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { completeInternalLmsLessonAction } from '@/app/dashboard/chitralearning-lms/actions'
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'

export function MobileLessonCompleteButton({
  courseId,
  lessonId,
  nextLessonHref,
  courseSlug,
  isNextLocked = false,
}: {
  courseId: number
  lessonId: number
  nextLessonHref?: string | null
  courseSlug: string
  isNextLocked?: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleComplete() {
    startTransition(async () => {
      try {
        await completeInternalLmsLessonAction({ courseId, lessonId })
        toast.success(nextLessonHref ? 'Materi selesai! Lanjut ke materi berikutnya.' : 'Selamat! Kursus selesai 🎉')
        router.refresh()
        if (nextLessonHref) router.push(nextLessonHref)
        else router.push(`/mobile/chitralearning/courses/${courseSlug}`)
      } catch {
        toast.error('Gagal menyimpan progress.')
      }
    })
  }

  return (
    <div className="flex gap-2.5">
      <button
        onClick={handleComplete}
        disabled={isPending}
        className="flex flex-1 h-13 items-center justify-center gap-2 rounded-[1rem] bg-[#003461] text-sm font-black text-white shadow-[0_8px_24px_rgba(0,52,97,0.25)] active:scale-[0.98] transition-transform disabled:opacity-60"
        style={{ height: 52 }}
      >
        {isPending ? (
          <><Loader2 className="size-4 animate-spin" /> Menyimpan...</>
        ) : nextLessonHref ? (
          <><CheckCircle2 className="size-4" /> Selesai & Lanjut</>
        ) : (
          <><CheckCircle2 className="size-4" /> Tandai Selesai</>
        )}
      </button>
      {nextLessonHref && !isPending && !isNextLocked && (
        <Link
          href={nextLessonHref}
          className="flex h-13 items-center justify-center gap-1 rounded-[1rem] border border-[#003461]/20 bg-white px-4 text-xs font-black text-[#003461] active:scale-[0.98] transition-transform"
          style={{ height: 52 }}
        >
          Lewati <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  )
}
