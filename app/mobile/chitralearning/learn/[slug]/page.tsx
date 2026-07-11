import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import {
  chitraLearningCourses,
  chitraLearningEnrollments,
  chitraLearningLessons,
  chitraLearningQuizQuestions,
  employees,
  chitraLearningAuditLogs,
} from '@/db/schema/hero'
import { and, eq, asc, sql } from 'drizzle-orm'
import { LmsQuizPlayer, type QuizQuestion } from '@/components/lms/lms-quiz-player'
import { MobileLessonCompleteButton } from '@/components/mobile/mobile-lesson-complete-button'
import { ChitraLearningVideoPlayer } from '@/components/chitralearning-video-player'
import { resolveUploadUrl, replaceS3UrlsInHtml, getS3ObjectReadUrl } from '@/lib/s3-storage'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  HelpCircle,
  Layers,
  Lock,
  Menu,
  Play,
  Video,
} from 'lucide-react'

function lessonIcon(type: string) {
  if (type === 'video') return <Video className="size-3.5 text-blue-400" />
  if (['quiz', 'pretest', 'posttest'].includes(type)) return <HelpCircle className="size-3.5 text-amber-400" />
  if (type === 'google_slide') return <Layers className="size-3.5 text-purple-400" />
  return <FileText className="size-3.5 text-emerald-400" />
}

export default async function MobileLessonPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ lessonId?: string }>
}) {
  const [{ slug }, resolvedSearch] = await Promise.all([params, searchParams])
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  // Fetch course
  const courseRows = await db.select().from(chitraLearningCourses).where(eq(chitraLearningCourses.slug, slug)).limit(1)
  const course = courseRows[0]
  if (!course) redirect('/mobile/chitralearning/courses')

  // Fetch lessons ordered
  const lessons = await db
    .select()
    .from(chitraLearningLessons)
    .where(eq(chitraLearningLessons.courseId, course.id))
    .orderBy(asc(chitraLearningLessons.sectionOrder), asc(chitraLearningLessons.sortOrder))

  if (lessons.length === 0) redirect(`/mobile/chitralearning/courses/${slug}`)

  // Check enrollment
  const employeeRows = await db.select().from(employees).where(eq(employees.email, session.user.email)).limit(1)
  const currentEmployee = employeeRows[0] ?? null

  let enrollmentProgress = 10;
  if (currentEmployee) {
    const [enrollment] = await db
      .select()
      .from(chitraLearningEnrollments)
      .where(and(eq(chitraLearningEnrollments.courseId, course.id), eq(chitraLearningEnrollments.employeeId, currentEmployee.id)))
      .limit(1)

    if (!enrollment || enrollment.approvalStatus !== 'approved') {
      redirect(`/mobile/chitralearning/courses/${slug}`)
    }
    
    enrollmentProgress = Math.max(enrollment.progress, 10);

    // Update status to in_progress
    if (enrollment.status !== 'passed') {
      await db
        .update(chitraLearningEnrollments)
        .set({
          status: 'in_progress',
          progress: enrollmentProgress,
          startedAt: enrollment.startedAt ?? new Date(),
          dueAt: enrollment.dueAt ?? new Date(Date.now() + (course.dueDays || 14) * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        })
        .where(eq(chitraLearningEnrollments.id, enrollment.id))
    }
  }

  // Lock mechanism
  const maxUnlockedIndex = enrollmentProgress === 100 ? lessons.length - 1 : Math.floor((enrollmentProgress / 100) * lessons.length);

  // Active lesson
  let activeLessonId = resolvedSearch?.lessonId ? parseInt(resolvedSearch.lessonId, 10) : lessons[0].id
  let activeLesson = lessons.find(l => l.id === activeLessonId) || lessons[0]
  let activeLessonIndex = lessons.findIndex(l => l.id === activeLesson.id)

  if (activeLessonIndex > maxUnlockedIndex && maxUnlockedIndex >= 0 && maxUnlockedIndex < lessons.length) {
    activeLessonIndex = maxUnlockedIndex;
    activeLesson = lessons[activeLessonIndex];
    activeLessonId = activeLesson.id;
  }

  const prevLesson = activeLessonIndex > 0 ? lessons[activeLessonIndex - 1] : null
  const nextLesson = activeLessonIndex >= 0 && (activeLessonIndex + 1 <= maxUnlockedIndex) ? lessons[activeLessonIndex + 1] : null
  const isNextLocked = activeLessonIndex >= maxUnlockedIndex;
  
  const activeLessonType = activeLesson.lessonType

  const prevHref = prevLesson ? `/mobile/chitralearning/learn/${slug}?lessonId=${prevLesson.id}` : null
  const nextHref = (activeLessonIndex + 1 < lessons.length) ? `/mobile/chitralearning/learn/${slug}?lessonId=${lessons[activeLessonIndex + 1].id}` : null

  // Quiz questions
  const quizRows = ['quiz', 'pretest', 'posttest'].includes(activeLessonType)
    ? await db.select().from(chitraLearningQuizQuestions)
        .where(eq(chitraLearningQuizQuestions.lessonId, activeLesson.id))
        .orderBy(asc(chitraLearningQuizQuestions.sortOrder), asc(chitraLearningQuizQuestions.id))
    : []

  const quizQuestions: QuizQuestion[] = quizRows.map(q => ({
    id: q.id,
    questionType: q.questionType || 'single_choice',
    question: replaceS3UrlsInHtml(q.questionText),
    questionImageUrl: resolveUploadUrl(q.questionImageUrl),
    questionMetadata: q.questionMetadata,
    options: [
      { id: 'A', text: replaceS3UrlsInHtml(q.optionA), imageUrl: resolveUploadUrl(q.optionAImageUrl) },
      { id: 'B', text: replaceS3UrlsInHtml(q.optionB), imageUrl: resolveUploadUrl(q.optionBImageUrl) },
      { id: 'C', text: replaceS3UrlsInHtml(q.optionC), imageUrl: resolveUploadUrl(q.optionCImageUrl) },
      { id: 'D', text: replaceS3UrlsInHtml(q.optionD), imageUrl: resolveUploadUrl(q.optionDImageUrl) },
    ].filter(o => o.text),
  }))

  let attemptCount = 0
  if (['quiz', 'pretest', 'posttest'].includes(activeLessonType) && currentEmployee) {
    const auditRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(chitraLearningAuditLogs)
      .where(and(
        eq(chitraLearningAuditLogs.employeeId, currentEmployee.id),
        eq(chitraLearningAuditLogs.courseId, course.id),
        eq(chitraLearningAuditLogs.action, 'quiz_submitted'),
      ))
    attemptCount = Number(auditRows[0]?.count ?? 0)
  }

  // File URL resolution
  const rawFileUrl = activeLesson.fileUrl || ''
  const filePath = rawFileUrl.toLowerCase().split('?')[0]
  const fileExtension = filePath.match(/\.([a-z0-9]+)$/)?.[1] || ''
  const isPdfResource = fileExtension === 'pdf'
  const isOfficeResource = ['doc', 'docx', 'ppt', 'pptx'].includes(fileExtension)

  const fileUrl = isOfficeResource
    ? (await getS3ObjectReadUrl(rawFileUrl)) || ''
    : resolveUploadUrl(rawFileUrl)

  const officeViewerUrl = isOfficeResource && /^https?:\/\//i.test(fileUrl)
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
    : ''
  const pdfViewerUrl = isPdfResource
    ? `${fileUrl}${fileUrl.includes('#') ? '&' : '#'}toolbar=0&navpanes=0&scrollbar=1`
    : ''

  const isQuizType = ['quiz', 'pretest', 'posttest'].includes(activeLessonType)
  const isGoogleSlide = activeLessonType === 'google_slide'
  const isDocument = isPdfResource || isOfficeResource || isGoogleSlide

  // Section grouping for sidebar
  const sectionsMap = new Map<string, Array<{ id: number; title: string; type: string; active: boolean; index: number; isLocked: boolean }>>()
  lessons.forEach((lesson, idx) => {
    const key = (lesson as any).sectionTitle || 'Materi Pembelajaran'
    if (!sectionsMap.has(key)) sectionsMap.set(key, [])
    sectionsMap.get(key)!.push({ 
      id: lesson.id, 
      title: lesson.title, 
      type: lesson.lessonType, 
      active: lesson.id === activeLesson.id, 
      index: idx + 1,
      isLocked: idx > maxUnlockedIndex
    })
  })

  return (
    <div className="-mx-4 -mt-4 flex flex-col min-h-dvh bg-[#082033]">
      {/* Topbar */}
      <div className="flex shrink-0 items-center gap-3 px-4 h-14 border-b border-white/10 bg-[#082033]">
        <Link
          href={`/mobile/chitralearning/courses/${slug}`}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white active:scale-95 transition-transform"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1 pl-1">
          <p className="truncate text-[10px] font-black uppercase tracking-wider text-white/40">{course.title}</p>
          <p className="text-sm font-black text-white leading-tight">{activeLesson.title}</p>
        </div>
        
        <Drawer>
          <DrawerTrigger asChild>
            <button className="flex h-9 items-center gap-1.5 rounded-xl bg-white/10 px-3 text-white active:scale-95 transition-transform">
              <span className="text-[10px] font-black tracking-widest">{activeLessonIndex + 1}/{lessons.length}</span>
              <Menu className="size-4" />
            </button>
          </DrawerTrigger>
          <DrawerContent className="bg-[#082033] border-white/10">
            <DrawerHeader className="text-left pb-2">
              <DrawerTitle className="text-sm font-black text-white uppercase tracking-widest">Daftar Materi</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8 max-h-[70vh] overflow-y-auto">
              {Array.from(sectionsMap.entries()).map(([section, items]) => (
                <div key={section} className="mb-4">
                  <p className="text-[9px] font-black uppercase tracking-wider text-white/30 mb-2 px-1">{section}</p>
                  <div className="space-y-1.5">
                    {items.map(item => {
                      if (item.isLocked) {
                        return (
                          <div
                            key={item.id}
                            className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors opacity-40 cursor-not-allowed"
                          >
                            <span className="flex size-5 mt-0.5 shrink-0 items-center justify-center rounded-full bg-white/5 text-[9px] font-black"><Lock className="size-3" /></span>
                            <div className="mt-1 opacity-50">
                              {lessonIcon(item.type)}
                            </div>
                            <span className="text-xs font-bold leading-snug text-white">{item.title}</span>
                          </div>
                        )
                      }
                      
                      return (
                        <Link
                          key={item.id}
                          href={`/mobile/chitralearning/learn/${slug}?lessonId=${item.id}`}
                          className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                            item.active ? 'bg-white/15 text-white' : 'text-white/50 hover:bg-white/5'
                          }`}
                        >
                          <span className="flex size-5 mt-0.5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[9px] font-black">{item.index}</span>
                          <div className="mt-1">
                            {lessonIcon(item.type)}
                          </div>
                          <span className="text-xs font-bold leading-snug">{item.title}</span>
                          {item.active && <div className="ml-auto mt-2 size-1.5 shrink-0 rounded-full bg-[#0ea5b0]" />}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-[#003461] to-[#0ea5b0] transition-all"
          style={{ width: `${((activeLessonIndex + 1) / lessons.length) * 100}%` }}
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Video */}
        {activeLessonType === 'video' && (
          <div>
            <ChitraLearningVideoPlayer
              enrollmentId={0}
              courseId={course.id}
              lessonId={activeLesson.id}
              videoUrl={(activeLesson as any).videoUrl || ''}
            />
            <div className="p-4 bg-white">
              <h2 className="text-lg font-black text-[#082033]">{activeLesson.title}</h2>
              {activeLesson.description && (
                <div
                  className="mt-3 text-sm text-[#486275] leading-relaxed prose-sm"
                  dangerouslySetInnerHTML={{ __html: activeLesson.description }}
                />
              )}
              <div className="mt-6">
                <MobileLessonCompleteButton
                  courseId={course.id}
                  lessonId={activeLesson.id}
                  nextLessonHref={nextHref}
                  courseSlug={slug}
                  isNextLocked={isNextLocked}
                />
              </div>
            </div>
          </div>
        )}

        {/* Quiz */}
        {isQuizType && (
          <div className="bg-white min-h-full p-0 sm:p-4">
            <LmsQuizPlayer
              courseId={course.id}
              lessonId={activeLesson.id}
              testPhase={activeLessonType as 'pretest' | 'posttest'}
              questions={quizQuestions}
              nextLessonHref={nextHref}
              courseHref={`/mobile/chitralearning/courses/${slug}`}
              randomizeOptions={(activeLesson as any).quizSettings?.randomizeOptions}
              attemptCount={attemptCount}
              maxRetakes={course.maxRetakes ?? -1}
            />
          </div>
        )}

        {/* Document / Article / Google Slide */}
        {!activeLessonType.includes('video') && !isQuizType && (
          <div className="bg-white">
            {/* Article text */}
            {activeLessonType === 'article' && activeLesson.description && (
              <div className="p-4">
                <h2 className="text-lg font-black text-[#082033] mb-3">{activeLesson.title}</h2>
                <div
                  className="text-sm text-[#486275] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: activeLesson.description }}
                />
              </div>
            )}

            {/* Google Slide */}
            {isGoogleSlide && rawFileUrl && rawFileUrl.includes('<iframe') && (
              <div>
                <div
                  className="w-full overflow-hidden bg-slate-900 [&>iframe]:w-full [&>iframe]:h-[55vw] [&>iframe]:min-h-[220px]"
                  dangerouslySetInnerHTML={{ __html: rawFileUrl }}
                />
                <div className="p-4">
                  <h2 className="text-base font-black text-[#082033]">{activeLesson.title}</h2>
                  {activeLesson.description && (
                    <p className="mt-2 text-sm text-[#486275]">{activeLesson.description}</p>
                  )}
                </div>
              </div>
            )}

            {/* PDF */}
            {isPdfResource && pdfViewerUrl && (
              <div>
                <iframe
                  src={pdfViewerUrl}
                  allowFullScreen
                  className="w-full border-none"
                  style={{ height: '70vh' }}
                  title={activeLesson.title}
                />
                <div className="p-4">
                  <h2 className="text-base font-black text-[#082033]">{activeLesson.title}</h2>
                </div>
              </div>
            )}

            {/* Office viewer */}
            {isOfficeResource && officeViewerUrl && (
              <div>
                <iframe
                  src={officeViewerUrl}
                  sandbox="allow-forms allow-scripts allow-same-origin"
                  allowFullScreen
                  className="w-full border-none"
                  style={{ height: '70vh' }}
                  title={activeLesson.title}
                />
                <div className="p-4">
                  <h2 className="text-base font-black text-[#082033]">{activeLesson.title}</h2>
                </div>
              </div>
            )}

            {/* Fallback empty */}
            {!activeLesson.description && !rawFileUrl && (
              <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
                <BookOpen className="size-12 text-[#486275]/30 mb-3" />
                <p className="font-black text-[#082033]">Konten belum tersedia</p>
                <p className="mt-1 text-sm text-[#486275]">Hubungi admin untuk kelengkapan materi ini.</p>
              </div>
            )}

            {/* Complete button for non-video non-quiz */}
            {!isQuizType && (
              <div className="p-4 pt-2 border-t border-slate-100">
                <MobileLessonCompleteButton
                  courseId={course.id}
                  lessonId={activeLesson.id}
                  nextLessonHref={nextHref}
                  courseSlug={slug}
                  isNextLocked={isNextLocked}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Nav (prev/next) */}
      {!isQuizType && (
        <div className="fixed bottom-0 left-0 right-0 z-40 max-w-[430px] mx-auto flex gap-2 bg-[#082033]/95 backdrop-blur-sm px-4 py-3 border-t border-white/10">
          {prevHref ? (
            <Link
              href={prevHref}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 text-xs font-black text-white active:scale-95 transition-transform"
            >
              <ChevronLeft className="size-4" /> Sebelumnya
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {nextHref && !isNextLocked && (
            <Link
              href={nextHref}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#003461] text-xs font-black text-white shadow-[0_4px_14px_rgba(0,52,97,0.3)] active:scale-95 transition-transform"
            >
              Selanjutnya <ChevronRight className="size-4" />
            </Link>
          )}
          {(!nextHref || isNextLocked) && !isQuizType && (
            <Link
              href={`/mobile/chitralearning/courses/${slug}`}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 text-xs font-black text-white active:scale-95 transition-transform"
            >
              Selesai 🎉
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
