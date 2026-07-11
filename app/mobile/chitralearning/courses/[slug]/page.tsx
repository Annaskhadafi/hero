import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import {
  chitraLearningCourses,
  chitraLearningLessons,
  employees,
} from '@/db/schema/hero'
import { eq, asc } from 'drizzle-orm'
import { getInternalLmsWorkspaceData } from '@/lib/chitralearning-lms'
import {
  ArrowLeft,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  HelpCircle,
  Layers,
  Play,
  Video,
} from 'lucide-react'
import { MobileEnrollButton } from '@/components/mobile/mobile-chitralearning-enroll-button'
import { MobileCourseCover } from '@/components/mobile/mobile-course-cover'

function formatDuration(minutes: number) {
  if (!minutes) return '0m'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}j` : `${h}j ${m}m`
}

function lessonIcon(type: string) {
  if (type === 'video') return <Video className="size-3.5 text-blue-500" />
  if (['quiz', 'pretest', 'posttest'].includes(type)) return <HelpCircle className="size-3.5 text-amber-500" />
  if (type === 'google_slide') return <Layers className="size-3.5 text-purple-500" />
  return <FileText className="size-3.5 text-emerald-500" />
}

function lessonTypeLabel(type: string) {
  if (type === 'video') return 'Video'
  if (type === 'pretest') return 'Pre-test'
  if (type === 'posttest') return 'Post-test'
  if (type === 'quiz') return 'Quiz'
  if (type === 'google_slide') return 'Slide'
  return 'Materi'
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const rows = await db.select({ title: chitraLearningCourses.title })
    .from(chitraLearningCourses)
    .where(eq(chitraLearningCourses.slug, slug))
    .limit(1)
  return { title: rows[0]?.title ? `${rows[0].title} | ChitraLearning` : 'Course Detail' }
}

export default async function MobileCourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const [courseRows, workspaceData, employeeRows] = await Promise.all([
    db.select().from(chitraLearningCourses).where(eq(chitraLearningCourses.slug, slug)).limit(1),
    getInternalLmsWorkspaceData(),
    db.select().from(employees).where(eq(employees.email, session.user.email)).limit(1),
  ])

  const course = courseRows[0]
  if (!course) redirect('/mobile/chitralearning/courses')

  const currentEmployee = employeeRows[0] ?? null

  const lessons = await db
    .select()
    .from(chitraLearningLessons)
    .where(eq(chitraLearningLessons.courseId, course.id))
    .orderBy(asc(chitraLearningLessons.sectionOrder), asc(chitraLearningLessons.sortOrder))

  const enrollment = workspaceData.enrollments.find(
    e => e.courseId === course.id && e.employeeId === currentEmployee?.id
  )
  const certificate = workspaceData.certificates.find(
    c => c.courseId === course.id && c.employeeId === currentEmployee?.id
  )

  const isEnrolled = !!enrollment
  const isApproved = enrollment?.approvalStatus === 'approved'
  const isPending = enrollment?.approvalStatus === 'pending'
  const isRejected = enrollment?.approvalStatus === 'rejected'
  const isCompleted = !!certificate || (enrollment?.status === 'passed')
  const progress = isCompleted ? 100 : (enrollment?.progress ?? 0)

  const totalLessons = lessons.length
  const totalDuration = lessons.reduce((s, l) => s + l.durationMinutes, 0)
  const videoCount = lessons.filter(l => l.lessonType === 'video').length
  const quizCount = lessons.filter(l => ['quiz', 'pretest', 'posttest'].includes(l.lessonType)).length

  // Group sections
  const sectionsMap = new Map<string, typeof lessons>()
  for (const lesson of lessons) {
    const key = (lesson as any).sectionTitle || 'Materi Pembelajaran'
    if (!sectionsMap.has(key)) sectionsMap.set(key, [])
    sectionsMap.get(key)!.push(lesson)
  }

  // First lesson for continue
  const firstLesson = lessons[0]
  const continueHref = firstLesson
    ? `/mobile/chitralearning/learn/${course.slug}?lessonId=${firstLesson.id}`
    : null

  return (
    <div className="pb-32">
      {/* Back */}
      <div className="-mx-4 -mt-4 mb-0">
        <Link
          href="/mobile/chitralearning/courses"
          className="flex h-12 items-center gap-2 px-4 text-sm font-black text-[#003461]"
        >
          <ArrowLeft className="size-4" />
          Kembali
        </Link>
      </div>

      {/* Hero Cover */}
      <div className="-mx-4 relative h-52 bg-gradient-to-br from-[#003461] via-[#005a9e] to-[#0ea5b0] overflow-hidden">
        {course.coverImageUrl && (
          <MobileCourseCover
            src={course.coverImageUrl}
            alt={course.title}
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#082033]/80 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {course.category && (
              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-sm">
                {course.category}
              </span>
            )}
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-sm capitalize">
              {(course as any).level || 'Dasar'}
            </span>
            {course.certificateEnabled && (
              <span className="rounded-full bg-amber-400/80 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-900">
                ✦ Bersertifikat
              </span>
            )}
          </div>
          <h1 className="text-lg font-black text-white leading-tight">{course.title}</h1>
        </div>
      </div>

      {/* Progress (if enrolled & approved) */}
      {isApproved && progress > 0 && (
        <div className="mt-4 rounded-[1.2rem] bg-white p-4 shadow-[0_8px_24px_rgba(8,32,51,0.07)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#486275]">Progress Belajar</span>
            <span className="text-sm font-black text-[#003461]">{progress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-[#e9f6fd]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#003461] to-[#0ea5b0] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {isCompleted && (
            <p className="mt-2 text-[10px] font-black text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> Kursus selesai!
            </p>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <div className="rounded-[1.1rem] bg-white p-3 text-center shadow-[0_4px_16px_rgba(8,32,51,0.06)]">
          <Clock className="size-4 text-[#003461] mx-auto" />
          <p className="mt-1.5 text-sm font-black text-[#082033]">{formatDuration(totalDuration)}</p>
          <p className="text-[9px] font-bold text-[#486275] uppercase tracking-wider">Durasi</p>
        </div>
        <div className="rounded-[1.1rem] bg-white p-3 text-center shadow-[0_4px_16px_rgba(8,32,51,0.06)]">
          <BookOpen className="size-4 text-[#003461] mx-auto" />
          <p className="mt-1.5 text-sm font-black text-[#082033]">{totalLessons}</p>
          <p className="text-[9px] font-bold text-[#486275] uppercase tracking-wider">Materi</p>
        </div>
        <div className="rounded-[1.1rem] bg-white p-3 text-center shadow-[0_4px_16px_rgba(8,32,51,0.06)]">
          <BarChart3 className="size-4 text-[#003461] mx-auto" />
          <p className="mt-1.5 text-sm font-black text-[#082033]">{course.passingScore}%</p>
          <p className="text-[9px] font-bold text-[#486275] uppercase tracking-wider">Nilai Lulus</p>
        </div>
      </div>

      {/* Description */}
      {course.description && (
        <div className="mt-4 rounded-[1.25rem] bg-white p-4 shadow-[0_8px_24px_rgba(8,32,51,0.07)]">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#486275] mb-2">Tentang Kursus</p>
          <p className="text-sm font-semibold text-[#486275] leading-relaxed line-clamp-4 whitespace-pre-wrap">
            {course.description}
          </p>
        </div>
      )}

      {/* Curriculum */}
      {totalLessons > 0 && (
        <div className="mt-4 space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#486275]">Kurikulum · {totalLessons} materi</p>
          {Array.from(sectionsMap.entries()).map(([sectionTitle, sectionLessons]) => (
            <div key={sectionTitle} className="overflow-hidden rounded-[1.25rem] bg-white shadow-[0_8px_24px_rgba(8,32,51,0.07)]">
              <div className="flex items-center justify-between px-4 py-3 bg-[#f6fbff] border-b border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#082033]">{sectionTitle}</p>
                <span className="rounded-full bg-[#e9f6fd] px-2 py-0.5 text-[9px] font-black text-[#003461]">
                  {sectionLessons.length}
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {sectionLessons.map((lesson, idx) => (
                  <div key={lesson.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#e9f6fd] text-[10px] font-black text-[#003461]">
                      {idx + 1}
                    </span>
                    {lessonIcon(lesson.lessonType)}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-[#082033] line-clamp-1">{lesson.title}</p>
                      <p className="text-[9px] font-bold text-[#486275]">{lessonTypeLabel(lesson.lessonType)} · {lesson.durationMinutes}m</p>
                    </div>
                    {(!isEnrolled || !isApproved) && idx > 0 && (
                      <div className="shrink-0 text-[#486275]/40">
                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom CTA — Fixed */}
      <div className="fixed bottom-16 left-0 right-0 z-30 px-4 pb-4 bg-gradient-to-t from-[#f6fbff] via-[#f6fbff]/90 to-transparent pt-6 max-w-[430px] mx-auto">
        {!isEnrolled && (
          <MobileEnrollButton courseId={course.id} slug={course.slug} />
        )}
        {isEnrolled && isPending && (
          <div className="flex h-14 w-full items-center justify-center gap-2 rounded-[1rem] bg-amber-50 border border-amber-200 text-sm font-black text-amber-700">
            ⏳ Menunggu persetujuan HR
          </div>
        )}
        {isEnrolled && isRejected && (
          <div className="flex h-14 w-full items-center justify-center gap-2 rounded-[1rem] bg-rose-50 border border-rose-200 text-sm font-black text-rose-700">
            ✕ Pengajuan ditolak
          </div>
        )}
        {isEnrolled && isApproved && continueHref && !isCompleted && (
          <Link
            href={continueHref}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[1rem] bg-[#003461] text-sm font-black text-white shadow-[0_8px_24px_rgba(0,52,97,0.25)] active:scale-[0.98] transition-transform"
          >
            <Play className="size-4 fill-white" />
            {progress > 0 ? 'Lanjutkan Belajar' : 'Mulai Belajar'}
          </Link>
        )}
        {isCompleted && (
          <Link
            href="/mobile/chitralearning/certificates"
            className="flex h-14 w-full items-center justify-center gap-2 rounded-[1rem] bg-gradient-to-r from-amber-500 to-amber-600 text-sm font-black text-white shadow-[0_8px_24px_rgba(245,158,11,0.3)] active:scale-[0.98] transition-transform"
          >
            <Award className="size-4" />
            Lihat Sertifikat
          </Link>
        )}
      </div>
    </div>
  )
}
