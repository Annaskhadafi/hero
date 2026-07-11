import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { getInternalLmsWorkspaceData, buildInternalLmsLearnerCourses } from '@/lib/chitralearning-lms'
import { MobileCourseCover } from '@/components/mobile/mobile-course-cover'
import { Award, BookOpen, ChevronRight, Clock } from 'lucide-react'

function formatDuration(minutes: number) {
  if (!minutes) return '0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}j` : `${h}j ${m}m`
}

export default async function MobileMyLearningPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const params = await searchParams
  const activeTab = params?.tab ?? 'ongoing'

  const [employeeRows, workspaceData] = await Promise.all([
    db.select().from(employees).where(eq(employees.email, session.user.email)).limit(1),
    getInternalLmsWorkspaceData(),
  ])

  const currentEmployee = employeeRows[0] ?? null
  const learnerCourses = buildInternalLmsLearnerCourses(workspaceData, currentEmployee)

  const ongoing = learnerCourses.filter(c => c.enrollment?.approvalStatus === 'approved' && !c.certificate && (c.enrollment.progress ?? 0) < 100)
  const completed = learnerCourses.filter(c => c.certificate || (c.enrollment?.status === 'passed'))
  const pending = learnerCourses.filter(c => c.enrollment?.approvalStatus === 'pending')
  const rejected = learnerCourses.filter(c => c.enrollment?.approvalStatus === 'rejected')

  const tabs = [
    { id: 'ongoing', label: 'Berjalan', count: ongoing.length },
    { id: 'completed', label: 'Selesai', count: completed.length },
    { id: 'pending', label: 'Pengajuan', count: pending.length + rejected.length },
  ]

  const currentCourses =
    activeTab === 'ongoing' ? ongoing :
    activeTab === 'completed' ? completed :
    [...pending, ...rejected]

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <section className="space-y-0.5">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">ChitraLearning</p>
        <h1 className="text-2xl font-black tracking-tight text-[#003461]">Kursus Saya</h1>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-2.5">
        <div className="rounded-[1.2rem] bg-[#003461] p-3.5 text-white shadow-[0_16px_34px_rgba(0,52,97,0.22)]">
          <BookOpen className="size-4" />
          <p className="mt-2.5 text-2xl font-black leading-none">{ongoing.length}</p>
          <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#b9dff6]">Aktif</p>
        </div>
        <div className="rounded-[1.2rem] bg-[#e9f6fd] p-3.5 shadow-[0_12px_28px_rgba(8,32,51,0.06)]">
          <svg className="size-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-2.5 text-2xl font-black leading-none text-[#082033]">{completed.length}</p>
          <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#486275]">Selesai</p>
        </div>
        <div className="rounded-[1.2rem] bg-white p-3.5 shadow-[0_12px_28px_rgba(8,32,51,0.07)]">
          <Clock className="size-4 text-amber-500" />
          <p className="mt-2.5 text-2xl font-black leading-none text-[#082033]">{pending.length}</p>
          <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#486275]">Pending</p>
        </div>
      </section>

      {/* Tabs */}
      <section>
        <div className="flex gap-1.5">
          {tabs.map(tab => (
            <Link
              key={tab.id}
              href={`/mobile/chitralearning/my-learning?tab=${tab.id}`}
              className={`flex-1 rounded-[1rem] px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-wider transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#003461] text-white shadow-[0_4px_14px_rgba(0,52,97,0.22)]'
                  : 'bg-white text-[#486275] shadow-[0_2px_8px_rgba(8,32,51,0.06)]'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1 rounded-full text-[8px] ${activeTab === tab.id ? 'text-white/70' : 'text-[#003461]'}`}>
                  ({tab.count})
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Course List */}
      <section className="space-y-3">
        {currentCourses.length === 0 ? (
          <div className="rounded-[1.35rem] bg-white p-10 text-center shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <BookOpen className="mx-auto mb-3 size-10 text-[#486275]/30" />
            <p className="font-black text-[#082033]">
              {activeTab === 'ongoing' ? 'Belum ada kursus aktif' :
               activeTab === 'completed' ? 'Belum ada kursus selesai' :
               'Tidak ada pengajuan'}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#486275]">
              {activeTab === 'ongoing' ? 'Mulai belajar dari katalog kursus.' : 'Informasi akan muncul di sini.'}
            </p>
            {activeTab === 'ongoing' && (
              <Link
                href="/mobile/chitralearning/courses"
                className="mt-4 inline-block rounded-[0.75rem] bg-[#003461] px-5 py-2.5 text-xs font-black text-white"
              >
                Jelajahi Kursus
              </Link>
            )}
          </div>
        ) : (
          currentCourses.map(course => {
            const progress = course.certificate ? 100 : (course.enrollment?.progress ?? 0)
            const isPending = course.enrollment?.approvalStatus === 'pending'
            const isRejected = course.enrollment?.approvalStatus === 'rejected'
            const isApproved = course.enrollment?.approvalStatus === 'approved'
            const isCompleted = !!course.certificate || course.enrollment?.status === 'passed'

            const href = isApproved && !isCompleted
              ? `/mobile/chitralearning/learn/${course.slug}`
              : `/mobile/chitralearning/courses/${course.slug}`

            return (
              <Link
                key={course.id}
                href={href}
                className="block rounded-[1.25rem] bg-white p-4 shadow-[0_8px_24px_rgba(8,32,51,0.07)] active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start gap-3.5">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                    <MobileCourseCover
                      src={course.coverImageUrl}
                      alt={course.title}
                      className="absolute inset-0 w-full h-full"
                      fallbackClassName="absolute inset-0 w-full h-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-black text-[#082033] leading-snug line-clamp-2 flex-1">{course.title}</h3>
                      <ChevronRight className="size-4 shrink-0 text-[#486275] mt-0.5" />
                    </div>
                    {course.category && (
                      <p className="mt-0.5 text-[10px] font-semibold text-[#486275]">{course.category}</p>
                    )}

                    {/* Status badge */}
                    <div className="mt-2">
                      {isPending && (
                        <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700">
                          ⏳ Menunggu Persetujuan
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-block rounded-full bg-rose-100 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-rose-700">
                          ✕ Ditolak
                        </span>
                      )}
                      {isCompleted && (
                        <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                          ✓ Selesai
                        </span>
                      )}
                      {isApproved && !isCompleted && (
                        <span className="inline-block rounded-full bg-[#e9f6fd] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#003461]">
                          ▷ Sedang Berjalan
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar for active/approved */}
                {isApproved && !isCompleted && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold text-[#486275]">Progress</span>
                      <span className="text-[9px] font-black text-[#003461]">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#e9f6fd]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#003461] to-[#0ea5b0]" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                )}

                {/* Due date */}
                {isApproved && !isCompleted && course.dueAt && (
                  <p className="mt-2 text-[9px] font-semibold text-[#486275] flex items-center gap-1">
                    <Clock className="size-3" />
                    Batas: {new Date(course.dueAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                )}

                {/* Certificate number if completed */}
                {isCompleted && course.certificate && (
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2">
                    <Award className="size-4 text-amber-600 shrink-0" />
                    <p className="text-[10px] font-black text-amber-700">Cert #{course.certificate.certificateNumber}</p>
                  </div>
                )}
              </Link>
            )
          })
        )}
      </section>
    </div>
  )
}
