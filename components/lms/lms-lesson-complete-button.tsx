'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { completeInternalLmsLessonAction } from '@/app/dashboard/chitralearning-lms/actions'
import { Button } from '@/components/ui/button'

export function LmsLessonCompleteButton({
  courseId,
  lessonId,
  nextLessonHref,
}: {
  courseId: number
  lessonId: number
  nextLessonHref?: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <Button
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await completeInternalLmsLessonAction({ courseId, lessonId })
            router.refresh()
            if (nextLessonHref) router.push(nextLessonHref)
          })
        }}
      >
        {isPending ? 'Menyimpan...' : nextLessonHref ? 'Selesai & Materi Selanjutnya' : 'Tandai Selesai'}
      </Button>
      {nextLessonHref && (
        <Button asChild variant="outline">
          <Link href={nextLessonHref}>Lewati ke Materi Selanjutnya</Link>
        </Button>
      )}
    </div>
  )
}
