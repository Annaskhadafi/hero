'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { requestInternalLmsEnrollmentAction } from '@/app/dashboard/chitralearning-lms/actions'
import { Loader2 } from 'lucide-react'

export function MobileEnrollButton({ courseId, slug }: { courseId: number; slug: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleEnroll() {
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.append('courseId', String(courseId))
        const res = await requestInternalLmsEnrollmentAction(formData)
        if (res?.autoApproved) {
          toast.success('Pendaftaran berhasil! Anda dapat langsung mulai belajar.')
        } else {
          toast.success('Pengajuan enrollment berhasil! Menunggu persetujuan admin/section head.')
        }
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Gagal mengajukan enrollment.')
      }
    })
  }

  return (
    <button
      onClick={handleEnroll}
      disabled={isPending}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-[1rem] bg-[#003461] text-sm font-black text-white shadow-[0_8px_24px_rgba(0,52,97,0.25)] active:scale-[0.98] transition-transform disabled:opacity-60"
    >
      {isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          <span>Mengajukan...</span>
        </>
      ) : (
        <span>Ajukan Enrollment</span>
      )}
    </button>
  )
}
