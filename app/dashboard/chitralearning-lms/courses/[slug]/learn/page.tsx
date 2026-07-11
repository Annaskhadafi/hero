import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { chitraLearningCourses, chitraLearningEnrollments, chitraLearningLessons, chitraLearningQuizQuestions, employees, chitraLearningAuditLogs } from '@/db/schema/hero'
import { and, eq, asc, sql } from 'drizzle-orm'
import { LmsPlayerSidebar } from '@/components/lms/lms-player-sidebar'
import { ChitraLearningVideoPlayer } from '@/components/chitralearning-video-player'
import { LmsQuizPlayer, type QuizQuestion } from '@/components/lms/lms-quiz-player'
import { LmsLessonCompleteButton } from '@/components/lms/lms-lesson-complete-button'
import { type CurriculumSection, type LessonType } from '@/components/lms/lms-curriculum-accordion'
import { getInternalLmsWorkspaceData, buildInternalLmsLearnerCourses } from '@/lib/chitralearning-lms'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { resolveUploadUrl, replaceS3UrlsInHtml, getS3ObjectReadUrl } from '@/lib/s3-storage'

export const metadata = {
  title: 'Learn | ChitraLearning LMS',
}

export default async function LmsCoursePlayerPage({ 
  params, 
  searchParams 
}: { 
  params: Promise<{ slug: string }>
  searchParams: Promise<{ lessonId?: string }>
}) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Fetch course
  const courseRows = await db
    .select()
    .from(chitraLearningCourses)
    .where(eq(chitraLearningCourses.slug, slug))
    .limit(1)
  
  const course = courseRows[0]
  if (!course) {
    redirect('/dashboard/chitralearning-lms/catalog')
  }

  // Fetch lessons
  const lessons = await db
    .select()
    .from(chitraLearningLessons)
    .where(eq(chitraLearningLessons.courseId, course.id))
    .orderBy(asc(chitraLearningLessons.sectionOrder), asc(chitraLearningLessons.sortOrder))

  if (lessons.length === 0) {
    return (
      <div className="p-8 text-center">
        <h2>Belum ada materi untuk kursus ini.</h2>
        <Button asChild className="mt-4"><Link href={`/dashboard/chitralearning-lms/courses/${course.slug}`}>Kembali</Link></Button>
      </div>
    )
  }

  // Check enrollment
  const currentEmployeeRows = await db
    .select()
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1)
  
  const currentEmployee = currentEmployeeRows[0] || null
  if (currentEmployee) {
    const [existingEnrollment] = await db
      .select()
      .from(chitraLearningEnrollments)
      .where(and(eq(chitraLearningEnrollments.courseId, course.id), eq(chitraLearningEnrollments.employeeId, currentEmployee.id)))
      .limit(1)

    if (!existingEnrollment || existingEnrollment.approvalStatus !== 'approved') {
      redirect(`/dashboard/chitralearning-lms/courses/${course.slug}`)
    }

    if (existingEnrollment.status !== 'passed') {
      await db
        .update(chitraLearningEnrollments)
        .set({
          status: 'in_progress',
          progress: Math.max(existingEnrollment.progress, 10),
          startedAt: existingEnrollment.startedAt ?? new Date(),
          dueAt: existingEnrollment.dueAt ?? new Date(Date.now() + (course.dueDays || 14) * 24 * 60 * 60 * 1000),
          updatedAt: new Date(),
        })
        .where(eq(chitraLearningEnrollments.id, existingEnrollment.id))
    }
  }

  const workspaceData = await getInternalLmsWorkspaceData()
  const learnerCourses = buildInternalLmsLearnerCourses(workspaceData, currentEmployee)
  
  const inProgressCourses = learnerCourses.filter(c => c.enrollment && !c.certificate && c.enrollment.progress < 100)
  const inProgress = inProgressCourses.find(c => c.id === course.id)
  const progress = inProgress?.enrollment?.progress ?? 0
  
  // Determine active lesson
  const activeLessonId = resolvedSearchParams.lessonId ? parseInt(resolvedSearchParams.lessonId, 10) : lessons[0].id
  const activeLesson = lessons.find(l => l.id === activeLessonId) || lessons[0]
  const activeLessonIndex = lessons.findIndex((lesson) => lesson.id === activeLesson.id)
  const nextLesson = activeLessonIndex >= 0 ? lessons[activeLessonIndex + 1] : null
  const activeLessonType = activeLesson.lessonType as LessonType
  const activeTestPhase = activeLessonType === 'pretest' ? 'pretest' : 'posttest'

  // Group lessons by section for sidebar
  const sectionsMap = new Map<string, CurriculumSection>()
  let currentSectionTitle = 'Materi Pembelajaran'

  lessons.forEach((lesson, i) => {
    const sectionTitle = (lesson as any).sectionTitle || currentSectionTitle
    if (!sectionsMap.has(sectionTitle)) {
      sectionsMap.set(sectionTitle, { title: sectionTitle, lessons: [] })
    }
    
    // Simulate completion status
    const isCompleted = progress === 100 || (progress > 0 && i < (lessons.length * progress / 100))
    const isLocked = false

    sectionsMap.get(sectionTitle)!.lessons.push({
      id: lesson.id,
      title: lesson.title,
      type: lesson.lessonType as LessonType,
      durationMinutes: lesson.durationMinutes,
      isCompleted: !!isCompleted,
      isLocked,
    })
  })

  const curriculumSections = Array.from(sectionsMap.values())

  const quizRows = ['quiz', 'pretest', 'posttest'].includes(activeLessonType)
    ? await db
        .select()
        .from(chitraLearningQuizQuestions)
        .where(eq(chitraLearningQuizQuestions.lessonId, activeLesson.id))
        .orderBy(asc(chitraLearningQuizQuestions.sortOrder), asc(chitraLearningQuizQuestions.id))
    : []

  const quizQuestions: QuizQuestion[] = quizRows.map((question) => ({
    id: question.id,
    questionType: question.questionType || 'single_choice',
    question: replaceS3UrlsInHtml(question.questionText),
    questionImageUrl: resolveUploadUrl(question.questionImageUrl),
    questionMetadata: question.questionMetadata,
    options: [
      { id: 'A', text: replaceS3UrlsInHtml(question.optionA), imageUrl: resolveUploadUrl(question.optionAImageUrl) },
      { id: 'B', text: replaceS3UrlsInHtml(question.optionB), imageUrl: resolveUploadUrl(question.optionBImageUrl) },
      { id: 'C', text: replaceS3UrlsInHtml(question.optionC), imageUrl: resolveUploadUrl(question.optionCImageUrl) },
      { id: 'D', text: replaceS3UrlsInHtml(question.optionD), imageUrl: resolveUploadUrl(question.optionDImageUrl) },
    ].filter((option) => option.text),
  }))
  
  let attemptCount = 0;
  if (['quiz', 'pretest', 'posttest'].includes(activeLessonType)) {
    const auditRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(chitraLearningAuditLogs)
      .where(and(
         eq(chitraLearningAuditLogs.employeeId, currentEmployee.id),
         eq(chitraLearningAuditLogs.courseId, course.id),
         eq(chitraLearningAuditLogs.action, 'quiz_submitted'),
         sql`CAST(after_value->>'lessonId' AS INTEGER) = ${activeLesson.id}`
      ))
    attemptCount = Number(auditRows[0].count)
  }
  const nextLessonHref = nextLesson ? `/dashboard/chitralearning-lms/courses/${course.slug}/learn?lessonId=${nextLesson.id}` : null
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
  const pdfViewerUrl = isPdfResource ? `${fileUrl}${fileUrl.includes('#') ? '&' : '#'}toolbar=0&navpanes=0&scrollbar=1` : ''

  const isDocument = isPdfResource || isOfficeResource || activeLessonType === 'google_slide'
  const playerContainerClass = isDocument ? "w-full max-w-none lg:px-4" : "w-full max-w-5xl"

  return (
    <div data-lms-focus-mode className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] -mx-6 -my-6 bg-slate-50">
      <style>{`
        [data-lms-shell]:has([data-lms-focus-mode]) > aside {
          display: none;
        }
        [data-lms-shell]:has([data-lms-focus-mode]) > main {
          width: 100%;
        }
      `}</style>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        
        {/* Topbar */}
        <div className="h-14 border-b border-slate-100 flex items-center px-4 shrink-0 bg-white shadow-sm z-10">
          <Button variant="ghost" size="sm" asChild className="mr-4 text-slate-500">
            <Link href={`/dashboard/chitralearning-lms/courses/${course.slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Kursus
            </Link>
          </Button>
          <div className="flex-1 truncate">
            <h1 className="font-heading font-semibold text-slate-900 truncate text-sm">
              {activeLesson.title}
            </h1>
          </div>
        </div>

        {/* Player Area */}
        <div className="flex-1 overflow-y-auto p-2 md:p-6 flex flex-col items-center">
          <div className={playerContainerClass}>
            {activeLesson.lessonType === 'video' ? (
              <div className="w-full">
                <ChitraLearningVideoPlayer 
                  enrollmentId={inProgress?.enrollment?.id || 0}
                  courseId={course.id}
                  lessonId={activeLesson.id}
                  videoUrl={(activeLesson as any).videoUrl || course.coverImageUrl || ''} // Fallback to cover image url for testing if videoUrl is missing
                />
                <div className="mt-8 prose prose-slate max-w-none">
                  <h2 className="text-2xl font-bold font-heading">{activeLesson.title}</h2>
                  <div className="mt-4 text-slate-700" dangerouslySetInnerHTML={{ __html: activeLesson.description || 'Tidak ada deskripsi.' }} />
                </div>
              </div>
            ) : ['quiz', 'pretest', 'posttest'].includes(activeLessonType) ? (
              <div className="w-full py-8">
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold font-heading">{activeLesson.title}</h2>
                  <p className="text-slate-500 mt-2">Selesaikan kuis berikut untuk melanjutkan.</p>
                </div>
                <LmsQuizPlayer 
                  courseId={course.id}
                  lessonId={activeLesson.id}
                  testPhase={activeTestPhase}
                  questions={quizQuestions}
                  nextLessonHref={nextLessonHref}
                  courseHref={`/dashboard/chitralearning-lms/courses/${course.slug}`}
                  randomizeOptions={(activeLesson as any).quizSettings?.randomizeOptions}
                  attemptCount={attemptCount}
                  maxRetakes={course.maxRetakes ?? -1}
                />
              </div>
            ) : (
              <div className="w-full py-8 prose prose-slate max-w-none">
                <h2 className="text-2xl font-bold font-heading mb-6">{activeLesson.title}</h2>
                <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm">
                  {activeLesson.description ? (
                    <div dangerouslySetInnerHTML={{ __html: activeLesson.description }} />
                  ) : null}
                  {activeLessonType === 'google_slide' && rawFileUrl && rawFileUrl.includes('<iframe') ? (
                    <div className="mt-6 not-prose w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center [&>iframe]:w-full [&>iframe]:h-[82vh]" dangerouslySetInnerHTML={{ __html: rawFileUrl }} />
                  ) : fileUrl && activeLessonType !== 'google_slide' ? (
                    <div className="mt-6 not-prose">
                      {isPdfResource ? (
                        <iframe
                          src={pdfViewerUrl}
                          allowFullScreen
                          className="h-[82vh] w-full rounded-xl border border-slate-200"
                          title={activeLesson.title}
                        />
                      ) : officeViewerUrl ? (
                        <iframe
                          src={officeViewerUrl}
                          sandbox="allow-forms allow-scripts allow-same-origin"
                          allowFullScreen
                          className="h-[82vh] w-full rounded-xl border border-slate-200"
                          title={activeLesson.title}
                        />
                      ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                          Preview dokumen ini butuh PDF atau URL publik Office file (.doc, .docx, .ppt, .pptx).
                        </div>
                      )}
                    </div>
                  ) : null}
                  {!activeLesson.description && !rawFileUrl ? 'Konten tidak tersedia.' : null}
                </div>
                <LmsLessonCompleteButton courseId={course.id} lessonId={activeLesson.id} nextLessonHref={nextLessonHref} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar - Desktop */}
      <div className="hidden lg:block w-[320px] xl:w-[360px] shrink-0 border-l border-slate-200 bg-white">
        <LmsPlayerSidebar 
          courseTitle={course.title}
          courseSlug={course.slug}
          sections={curriculumSections}
        />
      </div>
      
    </div>
  )
}
