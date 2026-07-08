import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { chitraLearningCourses, chitraLearningLessons, employees } from '@/db/schema/hero'
import { eq, asc } from 'drizzle-orm'
import { LmsCourseHero } from '@/components/lms/lms-course-hero'
import { LmsEnrollmentSidebar } from '@/components/lms/lms-enrollment-sidebar'
import { LmsCurriculumAccordion, type CurriculumSection, type LessonType } from '@/components/lms/lms-curriculum-accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getInternalLmsWorkspaceData, buildInternalLmsLearnerCourses } from '@/lib/chitralearning-lms'
import { Clock, BookOpen, BarChart3, Award } from 'lucide-react'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const courseRows = await db
    .select({ title: chitraLearningCourses.title })
    .from(chitraLearningCourses)
    .where(eq(chitraLearningCourses.slug, slug))
    .limit(1)

  return {
    title: courseRows[0] ? `${courseRows[0].title} | ChitraLearning LMS` : 'Course Not Found',
  }
}

export default async function LmsCourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { isLmsAdmin } = await import('@/lib/chitralearning-lms')
  const isAdmin = await isLmsAdmin(session)

  // Fetch course details
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

  // Check enrollment
  const workspaceData = await getInternalLmsWorkspaceData()
  const currentEmployeeRows = await db
    .select()
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1)
  
  const currentEmployee = currentEmployeeRows[0] || null
  const learnerCourses = buildInternalLmsLearnerCourses(workspaceData, currentEmployee)
  
  const inProgressCourses = learnerCourses.filter(c => c.enrollment && !c.certificate && c.enrollment.progress < 100)
  const completedCourses = learnerCourses.filter(c => c.certificate || (c.enrollment && c.enrollment.progress >= 100))
  
  const inProgress = inProgressCourses.find(c => c.id === course.id)
  const completed = completedCourses.find(c => c.id === course.id)
  
  const isEnrolled = !!(inProgress || completed)
  const progress = completed ? 100 : (inProgress?.enrollment?.progress || 0)
  const enrollmentRecord = inProgress?.enrollment || completed?.enrollment

  // Group lessons by section
  const sectionsMap = new Map<string, CurriculumSection>()
  let currentSectionTitle = 'Materi Pembelajaran'

  lessons.forEach((lesson, i) => {
    const sectionTitle = (lesson as any).sectionTitle || currentSectionTitle
    if (!sectionsMap.has(sectionTitle)) {
      sectionsMap.set(sectionTitle, { title: sectionTitle, lessons: [] })
    }
    
    const isCompleted = progress === 100 || (progress > 0 && i < (lessons.length * progress / 100))
    const isLocked = !isEnrolled && i > 0

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

  const totalLessons = lessons.length
  const totalDuration = lessons.reduce((acc, curr) => acc + curr.durationMinutes, 0)
  const quizCount = lessons.filter(l => l.lessonType === 'quiz' || l.lessonType === 'pretest' || l.lessonType === 'posttest').length
  const videoCount = lessons.filter(l => l.lessonType === 'video').length
  
  // Format objectives
  let objectives: string[] = []
  try {
    const rawObjectives = (course as any).objectives
    if (typeof rawObjectives === 'string') {
      objectives = JSON.parse(rawObjectives)
    } else if (Array.isArray(rawObjectives)) {
      objectives = rawObjectives
    }
  } catch (e) {
    // Ignore
  }

  // Calculate deadline
  const enrollmentDate = enrollmentRecord?.createdAt ? new Date(enrollmentRecord.createdAt) : null
  const dueDays = course.dueDays || 30
  const deadline = enrollmentDate ? new Date(enrollmentDate.getTime() + dueDays * 24 * 60 * 60 * 1000) : null

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Section */}
      <LmsCourseHero 
        title={course.title}
        category={course.category}
        level={(course as any).level || 'beginner'}
        coverImageUrl={course.coverImageUrl}
        videoPreviewUrl={(course as any).videoPreviewUrl}
        progress={progress}
        isEnrolled={isEnrolled}
        dueDays={dueDays}
        enrollmentDate={enrollmentRecord?.createdAt}
      />

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Durasi</p>
            <p className="font-semibold text-slate-900">{Math.round(totalDuration / 60)}j {totalDuration % 60}m</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <BookOpen className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Materi</p>
            <p className="font-semibold text-slate-900">{totalLessons} Lesson</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="p-2 bg-amber-50 rounded-lg">
            <BarChart3 className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Level</p>
            <p className="font-semibold text-slate-900 capitalize">{(course as any).level || 'Beginner'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
          <div className="p-2 bg-violet-50 rounded-lg">
            <Award className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Sertifikat</p>
            <p className="font-semibold text-slate-900">{course.certificateEnabled ? 'Ya' : 'Tidak'}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Main Content */}
        <div className="flex-1 w-full min-w-0 space-y-8">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start bg-white border border-slate-200 rounded-xl h-auto p-1 space-x-1">
              <TabsTrigger 
                value="overview"
                className="rounded-lg px-6 py-2.5 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none font-medium"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="curriculum"
                className="rounded-lg px-6 py-2.5 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none font-medium"
              >
                Curriculum ({totalLessons})
              </TabsTrigger>
              <TabsTrigger 
                value="details"
                className="rounded-lg px-6 py-2.5 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none font-medium"
              >
                Details
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="pt-6 space-y-8">
              <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
                <h3 className="font-heading text-xl font-bold mb-4 text-slate-900">Tentang Kursus Ini</h3>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
                  {course.description || 'Deskripsi tidak tersedia.'}
                </p>
              </div>

              {objectives && objectives.length > 0 && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-100">
                  <h3 className="font-heading text-lg font-bold mb-4 text-emerald-900">Yang Akan Anda Pelajari</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                        <div className="mt-0.5 text-emerald-500">✓</div>
                        <span>{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Course Content Preview */}
              <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
                <h3 className="font-heading text-lg font-bold mb-4 text-slate-900">Konten Kursus</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <BookOpen className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{videoCount}</p>
                      <p className="text-xs text-slate-500">Video</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <BarChart3 className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{quizCount}</p>
                      <p className="text-xs text-slate-500">Quiz</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Clock className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{Math.round(totalDuration / 60)}j</p>
                      <p className="text-xs text-slate-500">Total Durasi</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="curriculum" className="pt-6">
              <LmsCurriculumAccordion sections={curriculumSections} courseSlug={course.slug} />
            </TabsContent>

            <TabsContent value="details" className="pt-6">
              <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-4 font-medium text-slate-900 bg-slate-50 w-1/3">Status</th>
                      <td className="px-6 py-4 text-slate-700 capitalize">{course.status}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-4 font-medium text-slate-900 bg-slate-50">Tingkat</th>
                      <td className="px-6 py-4 text-slate-700 capitalize">{(course as any).level || 'Beginner'}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-4 font-medium text-slate-900 bg-slate-50">Kategori</th>
                      <td className="px-6 py-4 text-slate-700">{course.category}</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-4 font-medium text-slate-900 bg-slate-50">Total Materi</th>
                      <td className="px-6 py-4 text-slate-700">{totalLessons} Lesson(s)</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-4 font-medium text-slate-900 bg-slate-50">Total Durasi</th>
                      <td className="px-6 py-4 text-slate-700">{Math.round(totalDuration / 60)}j {totalDuration % 60}m</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-4 font-medium text-slate-900 bg-slate-50">Batas Waktu</th>
                      <td className="px-6 py-4 text-slate-700">{course.dueDays} Hari</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-4 font-medium text-slate-900 bg-slate-50">Nilai Kelulusan</th>
                      <td className="px-6 py-4 text-slate-700">{course.passingScore}%</td>
                    </tr>
                    <tr>
                      <th className="px-6 py-4 font-medium text-slate-900 bg-slate-50">Sertifikat</th>
                      <td className="px-6 py-4 text-slate-700">{course.certificateEnabled ? 'Ya' : 'Tidak'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <aside className="w-full lg:w-[320px] xl:w-[360px] shrink-0">
          <LmsEnrollmentSidebar 
            courseId={course.id}
            courseSlug={course.slug}
            isAdmin={isAdmin}
            isEnrolled={isEnrolled}
            approvalStatus={enrollmentRecord?.approvalStatus}
            progress={progress}
            estimatedMinutes={course.estimatedMinutes > 0 ? course.estimatedMinutes : totalDuration}
            lessonCount={totalLessons}
            passingScore={course.passingScore}
            certificateEnabled={course.certificateEnabled}
            dueDays={course.dueDays}
            enrollmentDate={enrollmentRecord?.createdAt}
          />
        </aside>
      </div>
    </div>
  )
}
