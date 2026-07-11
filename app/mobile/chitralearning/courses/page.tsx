import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { getInternalLmsWorkspaceData, buildInternalLmsLearnerCourses } from '@/lib/chitralearning-lms'
import { MobileCourseCover } from '@/components/mobile/mobile-course-cover'
import { BookOpen, ChevronRight, Clock, Layers, Search } from 'lucide-react'

function formatDuration(minutes: number) {
  if (!minutes) return '0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}j` : `${h}j ${m}m`
}

function getLevelLabel(level?: string | null) {
  if (level === 'advanced') return 'Mahir'
  if (level === 'intermediate') return 'Menengah'
  return 'Dasar'
}

function getLevelColor(level?: string | null) {
  if (level === 'advanced') return 'bg-rose-100 text-rose-700'
  if (level === 'intermediate') return 'bg-amber-100 text-amber-700'
  return 'bg-emerald-100 text-emerald-700'
}

export default async function MobileChitraLearningCatalog({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; cat?: string }>
}) {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const params = await searchParams
  const query = (params?.q ?? '').toLowerCase().trim()
  const catFilter = params?.cat ?? ''

  const [currentEmployeeRows, workspaceData] = await Promise.all([
    db.select().from(employees).where(eq(employees.email, session.user.email)).limit(1),
    getInternalLmsWorkspaceData(),
  ])

  const currentEmployee = currentEmployeeRows[0] || null
  const learnerCourses = buildInternalLmsLearnerCourses(workspaceData, currentEmployee)

  // All published courses from workspace, matching desktop catalog logic
  let courses = workspaceData.courses.filter(c => c.status === 'published')

  // Filter by query
  if (query) {
    courses = courses.filter(c =>
      c.title.toLowerCase().includes(query) ||
      (c.category ?? '').toLowerCase().includes(query)
    )
  }

  // Filter by category
  if (catFilter) {
    courses = courses.filter(c => (c.category ?? '') === catFilter)
  }

  const allCategories = Array.from(new Set(workspaceData.courses.filter(c => c.status === 'published').map(c => c.category ?? '').filter(Boolean)))

  // Maps to track user's specific state
  const enrollmentMap = new Map(
    learnerCourses.filter(c => c.enrollment).map(c => [c.id, c.enrollment])
  )
  const certificateMap = new Map(
    learnerCourses.filter(c => c.certificate).map(c => [c.id, c.certificate])
  )

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <section className="space-y-0.5">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#486275]">ChitraLearning</p>
        <h1 className="text-2xl font-black tracking-tight text-[#003461]">Jelajahi Kursus</h1>
        <p className="text-xs font-semibold text-[#486275]">{courses.length} kursus tersedia untuk Anda</p>
      </section>

      {/* Search Bar */}
      <section>
        <form method="GET" action="/mobile/chitralearning/courses">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#486275]" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Cari kursus..."
              className="h-12 w-full rounded-[1rem] bg-white pl-11 pr-4 text-sm font-semibold text-[#082033] shadow-[0_4px_16px_rgba(8,32,51,0.07)] outline-none placeholder:text-[#486275]/60 focus:ring-2 focus:ring-[#003461]/20"
            />
          </div>
          {catFilter && <input type="hidden" name="cat" value={catFilter} />}
        </form>
      </section>

      {/* Category Chips */}
      {allCategories.length > 0 && (
        <section>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Link
              href="/mobile/chitralearning/courses"
              className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${
                !catFilter ? 'bg-[#003461] text-white shadow-[0_4px_14px_rgba(0,52,97,0.22)]' : 'bg-white text-[#486275] shadow-[0_2px_8px_rgba(8,32,51,0.07)]'
              }`}
            >
              Semua
            </Link>
            {allCategories.map(cat => (
              <Link
                key={cat}
                href={`/mobile/chitralearning/courses?cat=${encodeURIComponent(cat)}`}
                className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-colors whitespace-nowrap ${
                  catFilter === cat ? 'bg-[#003461] text-white shadow-[0_4px_14px_rgba(0,52,97,0.22)]' : 'bg-white text-[#486275] shadow-[0_2px_8px_rgba(8,32,51,0.07)]'
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Course List */}
      <div className="space-y-3">
        {courses.length === 0 ? (
          <div className="rounded-[1.35rem] bg-white p-10 text-center shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
            <Search className="mx-auto mb-3 size-10 text-[#486275]/30" />
            <p className="font-black text-[#082033]">Tidak ada kursus ditemukan</p>
            <p className="mt-1 text-xs font-semibold text-[#486275]">Coba gunakan kata kunci lain.</p>
          </div>
        ) : (
          courses.map(course => {
            const enrollment = enrollmentMap.get(course.id)
            const certificate = certificateMap.get(course.id)
            
            const isCompleted = !!certificate || (enrollment?.status === 'passed')
            const isPending = enrollment?.approvalStatus === 'pending'
            const isApproved = enrollment?.approvalStatus === 'approved'
            
            const progress = isCompleted ? 100 : (enrollment?.progress ?? 0)
            const duration = workspaceData.lessons.filter(l => l.courseId === course.id).reduce((acc, curr) => acc + (curr.durationMinutes ?? 0), 0)
            const lessonCount = workspaceData.lessons.filter(l => l.courseId === course.id).length

            return (
              <Link
                key={course.id}
                href={`/mobile/chitralearning/courses/${course.slug}`}
                className="flex items-start gap-3.5 rounded-[1.25rem] bg-white p-3.5 shadow-[0_8px_24px_rgba(8,32,51,0.07)] active:scale-[0.99] transition-transform"
              >
                {/* Thumbnail */}
                <div className="relative size-[72px] shrink-0 overflow-hidden rounded-xl">
                  <MobileCourseCover
                    src={course.coverImageUrl}
                    alt={course.title}
                    className="absolute inset-0 w-full h-full"
                    fallbackClassName="absolute inset-0 w-full h-full"
                  />
                  {isCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center bg-emerald-900/60 backdrop-blur-sm">
                      <div className="rounded-full bg-white p-1">
                        <svg className="size-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-black text-[#082033] leading-snug line-clamp-2 flex-1">{course.title}</h3>
                    <ChevronRight className="size-4 shrink-0 text-[#486275] mt-0.5" />
                  </div>

                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className={`rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${getLevelColor((course as any).level)}`}>
                      {getLevelLabel((course as any).level)}
                    </span>
                    {course.category && (
                      <span className="rounded-full bg-[#e9f6fd] px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-[#003461]">
                        {course.category}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-[10px] font-semibold text-[#486275]">
                    <span className="flex items-center gap-1"><Clock className="size-3" /> {formatDuration(course.estimatedMinutes ?? 0)}</span>
                    <span>{course.lessonCount} materi</span>
                  </div>

                  {/* Status */}
                  {isPending && (
                    <div className="mt-2">
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-700">
                        ⏳ Menunggu Persetujuan
                      </span>
                    </div>
                  )}
                  {isApproved && !isCompleted && progress > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1 flex-1 rounded-full bg-[#e9f6fd]">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#003461] to-[#0ea5b0]" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[9px] font-black text-[#003461]">{progress}%</span>
                      </div>
                    </div>
                  )}
                  {isCompleted && (
                    <div className="mt-2">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                        ✓ Selesai
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}

// Force re-parse
