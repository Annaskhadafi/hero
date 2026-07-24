import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { chitraLearningCourses, chitraLearningLessons, chitraLearningQuizQuestions, chitraLearningCourseAccess } from '@/db/schema/hero'
import { eq, asc } from 'drizzle-orm'
import { LmsCurriculumBuilder, type BuilderSection } from '@/components/lms/lms-curriculum-builder'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Eye, Save } from 'lucide-react'
import Link from 'next/link'
import { EditCourseInfoForm, EditCourseSettingsForm, EditCourseAccessForm } from './client-forms'
import { chitraLearningCategories, employees } from '@/db/schema/hero'
import { updateCourseSettings } from '../../../actions'

export const metadata = {
  title: 'Edit Kursus | ChitraLearning LMS',
}

export default async function LmsCourseEditPage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ tab?: string }> }) {
  const { slug } = await params
  const resolvedSearchParams = await searchParams
  const activeTab = resolvedSearchParams?.tab || "curriculum"
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { isLmsAdmin } = await import('@/lib/chitralearning-lms')
  const isAdmin = await isLmsAdmin(session)
  if (!isAdmin) {
    redirect('/dashboard/chitralearning-lms/catalog')
  }

  // Fetch course
  const courseRows = await db
    .select()
    .from(chitraLearningCourses)
    .where(eq(chitraLearningCourses.slug, slug))
    .limit(1)
  
  const course = courseRows[0]
  if (!course) {
    redirect('/dashboard/chitralearning-lms/management') // Assuming management page exists
  }

  // Fetch lessons
  const lessons = await db
    .select()
    .from(chitraLearningLessons)
    .where(eq(chitraLearningLessons.courseId, course.id))
    .orderBy(asc(chitraLearningLessons.sectionOrder), asc(chitraLearningLessons.sortOrder))

  const questions = await db
    .select()
    .from(chitraLearningQuizQuestions)
    .where(eq(chitraLearningQuizQuestions.courseId, course.id))
    .orderBy(asc(chitraLearningQuizQuestions.lessonId), asc(chitraLearningQuizQuestions.id))

  const accessRules = await db
    .select()
    .from(chitraLearningCourseAccess)
    .where(eq(chitraLearningCourseAccess.courseId, course.id))
    .orderBy(asc(chitraLearningCourseAccess.id))



  // Fetch unique departments and sections for access rules
  const allEmployees = await db.select({ department: employees.department, section: employees.section }).from(employees)
  const departments = Array.from(new Set(allEmployees.map(e => e.department).filter(Boolean))).sort()
  const sections = Array.from(new Set(allEmployees.map(e => e.section).filter(Boolean))).sort()

  // Group lessons into builder sections
  const sectionsMap = new Map<string, BuilderSection>()
  let currentSectionTitle = 'Materi Pembelajaran'

  lessons.forEach(lesson => {
    const sectionTitle = (lesson as any).sectionTitle || currentSectionTitle
    if (!sectionsMap.has(sectionTitle)) {
      sectionsMap.set(sectionTitle, { 
        id: `section-${sectionTitle}`, 
        title: sectionTitle, 
        lessons: [] 
      })
    }
    
    sectionsMap.get(sectionTitle)!.lessons.push({
      id: lesson.id.toString(),
      title: lesson.title,
      type: (lesson.lessonType as any) || 'video',
      description: lesson.description,
      videoUrl: lesson.videoUrl,
      fileUrl: lesson.fileUrl,
      durationMinutes: lesson.durationMinutes,
      quizSettings: (lesson as any).quizSettings,
    })
  })

  // If no lessons, create one default section
  if (sectionsMap.size === 0) {
    sectionsMap.set('Materi Pembelajaran', {
      id: 'section-default',
      title: 'Materi Pembelajaran',
      lessons: []
    })
  }

  const builderSections = Array.from(sectionsMap.values())

  return (
    <div className="mx-auto max-w-[1920px] overflow-hidden rounded-[10px] bg-white shadow-[0_1px_0_rgba(15,23,42,0.08)]">
      <Tabs defaultValue={activeTab} className="w-full gap-0">
        <div className="flex min-h-14 items-stretch justify-between bg-slate-900 text-white">
          <div className="flex min-w-0 items-stretch">
            <Button variant="ghost" asChild className="h-auto rounded-none border-r border-white/10 px-4 text-slate-200 hover:bg-white/10 hover:text-white">
              <Link href="/dashboard/chitralearning-lms/management">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to courses
              </Link>
            </Button>
            <div className="flex min-w-0 items-center border-r border-white/10 px-5">
              <h1 className="truncate font-heading text-sm font-semibold text-white">{course.title}</h1>
            </div>
            <TabsList className="hidden h-auto rounded-none bg-transparent p-0 shadow-none 2xl:flex">
              <TabsTrigger 
                value="curriculum"
                className="h-14 rounded-none px-5 text-slate-300 shadow-none data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-3px_0_#3b82f6]"
              >
                Curriculum
              </TabsTrigger>
              <TabsTrigger 
                value="info"
                className="h-14 rounded-none px-5 text-slate-300 shadow-none data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-3px_0_#3b82f6]"
              >
                Info
              </TabsTrigger>
              <TabsTrigger 
                value="settings"
                className="h-14 rounded-none px-5 text-slate-300 shadow-none data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-3px_0_#3b82f6]"
              >
                Pengaturan
              </TabsTrigger>
              <TabsTrigger 
                value="access"
                className="h-14 rounded-none px-5 text-slate-300 shadow-none data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-3px_0_#3b82f6]"
              >
                Akses
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="flex items-center gap-2 px-3">
            <form
              action={async () => {
                'use server'
                const formData = new FormData()
                formData.append('status', 'published')
                formData.append('passingScore', String(course.passingScore ?? 80))
                formData.append('dueDays', String(course.dueDays ?? 14))
                formData.append('certificateEnabled', course.certificateEnabled ? 'yes' : 'no')
                await updateCourseSettings(course.id, formData)
              }}
            >
              <Button type="submit" className="h-10 bg-blue-600 hover:bg-blue-700">
                Published
              </Button>
            </form>
            <Button variant="secondary" asChild className="h-10 bg-slate-700 text-white hover:bg-slate-600">
              <Link href={`/dashboard/chitralearning-lms/courses/${course.slug}`}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </Link>
            </Button>
          </div>
        </div>

        <TabsList className="grid h-12 w-full grid-cols-4 rounded-none bg-slate-100 p-1 2xl:hidden">
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="settings">Pengaturan</TabsTrigger>
          <TabsTrigger value="access">Akses</TabsTrigger>
        </TabsList>

        <TabsContent value="curriculum" className="mt-0 p-3">
          <LmsCurriculumBuilder 
            courseId={course.id}
            initialSections={builderSections} 
            initialQuestions={questions}
          />
        </TabsContent>

        <TabsContent value="info" className="mt-0 p-6">
          <div className="rounded-[10px] border border-slate-200 bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="font-heading text-lg font-semibold text-slate-950">Course settings</h2>
                <p className="text-sm text-slate-500">Informasi dasar kursus.</p>
              </div>
              <Save className="h-5 w-5 text-slate-400" />
            </div>
              <EditCourseInfoForm course={course} categories={await db.select().from(chitraLearningCategories)} />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-0 p-6">
          <div className="rounded-[10px] border border-slate-200 bg-white p-6">
            <div className="mb-6">
              <h2 className="font-heading text-lg font-semibold text-slate-950">Publishing settings</h2>
              <p className="text-sm text-slate-500">Status, passing score, deadline, dan sertifikat.</p>
            </div>
              <EditCourseSettingsForm course={course} sections={sections} />
          </div>
        </TabsContent>

            <TabsContent value="access" className="m-0 border-none p-0 outline-none">
              <div className="mx-auto max-w-4xl p-6 lg:p-8">
                <div className="mb-6">
                  <h2 className="text-base font-semibold text-slate-900">Access Rules</h2>
                  <p className="text-sm text-slate-500">Atur siapa saja yang bisa mengakses kursus ini.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <EditCourseAccessForm 
                    courseId={course.id} 
                    initialRules={accessRules} 
                    departments={departments}
                    sections={sections}
                  />
                </div>
              </div>
            </TabsContent>

      </Tabs>
    </div>
  )
}
