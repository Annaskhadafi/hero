import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { chitraLearningCourses, chitraLearningLessons, chitraLearningQuizQuestions } from '@/db/schema/hero'
import { eq, asc } from 'drizzle-orm'
import { QuizBuilderClient } from './client-page'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Kelola Soal | ChitraLearning LMS',
}

export default async function QuizBuilderPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId: lessonIdParam } = await params
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { isLmsAdmin } = await import('@/lib/chitralearning-lms')
  const isAdmin = await isLmsAdmin(session)
  if (!isAdmin) {
    redirect('/dashboard/chitralearning-lms')
  }

  const lessonId = parseInt(lessonIdParam, 10)
  if (isNaN(lessonId)) {
    redirect('/dashboard/chitralearning-lms/management')
  }

  const [lesson] = await db
    .select()
    .from(chitraLearningLessons)
    .where(eq(chitraLearningLessons.id, lessonId))
    .limit(1)

  if (!lesson) {
    redirect('/dashboard/chitralearning-lms/management')
  }

  const [course] = await db
    .select()
    .from(chitraLearningCourses)
    .where(eq(chitraLearningCourses.id, lesson.courseId))
    .limit(1)

  if (!course) {
    redirect('/dashboard/chitralearning-lms/management')
  }

  const questions = await db
    .select()
    .from(chitraLearningQuizQuestions)
    .where(eq(chitraLearningQuizQuestions.lessonId, lessonId))
    .orderBy(asc(chitraLearningQuizQuestions.id))

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/chitralearning-lms/courses/${course.slug}/edit`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">Kembali ke Course Builder</h1>
          <p className="text-slate-500 text-sm">Kursus: {course.title}</p>
        </div>
      </div>
      
      <QuizBuilderClient lesson={lesson} questions={questions} />
    </div>
  )
}
