import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { getInternalLmsWorkspaceData, buildInternalLmsLearnerCourses } from '@/lib/chitralearning-lms'
import { LmsCourseGrid } from '@/components/lms/lms-course-grid'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen } from 'lucide-react'

export const metadata = {
  title: 'My Learning | ChitraLearning LMS',
}

export default async function LmsMyLearningPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Fetch base workspace data
  const workspaceData = await getInternalLmsWorkspaceData()
  
  // Find current employee
  const currentEmployeeRows = await db
    .select()
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1)
  
  const currentEmployee = currentEmployeeRows[0] || null

  // Compute learner courses
  const learnerCourses = buildInternalLmsLearnerCourses(workspaceData, currentEmployee)

  const inProgressCourses = learnerCourses.filter(c => c.enrollment && !c.certificate && c.enrollment.progress < 100)
  const notStartedCourses = learnerCourses.filter(c => !c.enrollment || c.enrollment.progress === 0)
  const completedCourses = learnerCourses.filter(c => c.certificate || (c.enrollment && c.enrollment.progress >= 100))

  const inProgressItems = inProgressCourses.map(course => ({
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      category: course.category,
      level: (course as any).level || 'beginner',
      coverImageUrl: course.coverImageUrl,
      estimatedMinutes: course.estimatedMinutes,
      status: course.status,
    },
    enrollment: {
      progress: course.enrollment?.progress || 0,
      status: 'in-progress'
    },
    href: `/dashboard/chitralearning-lms/courses/${course.slug}`
  }))

  const completedItems = completedCourses.map(course => ({
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      category: course.category,
      level: (course as any).level || 'beginner',
      coverImageUrl: course.coverImageUrl,
      estimatedMinutes: course.estimatedMinutes,
      status: course.status,
    },
    enrollment: {
      progress: 100,
      status: 'completed'
    },
    href: `/dashboard/chitralearning-lms/courses/${course.slug}`
  }))

  const notStartedItems = notStartedCourses.map(course => ({
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      category: course.category,
      level: (course as any).level || 'beginner',
      coverImageUrl: course.coverImageUrl,
      estimatedMinutes: course.estimatedMinutes,
      status: course.status,
    },
    href: `/dashboard/chitralearning-lms/courses/${course.slug}`
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
          <BookOpen className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading">Pembelajaran Saya</h1>
          <p className="text-slate-500">Lacak progres dan riwayat kursus Anda.</p>
        </div>
      </div>

      <Tabs defaultValue="in-progress" className="w-full mt-8">
        <TabsList className="bg-white border border-slate-200 h-auto p-1 rounded-xl mb-6 inline-flex">
          <TabsTrigger value="in-progress" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none font-medium">
            Sedang Berjalan ({inProgressItems.length})
          </TabsTrigger>
          <TabsTrigger value="not-started" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none font-medium">
            Ditugaskan ({notStartedItems.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-slate-100 data-[state=active]:shadow-none font-medium">
            Selesai ({completedItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="in-progress">
          <LmsCourseGrid 
            courses={inProgressItems} 
            emptyStateTitle="Tidak ada kursus aktif"
            emptyStateDescription="Anda belum mulai belajar kursus apapun. Jelajahi katalog untuk memulai."
          />
        </TabsContent>
        
        <TabsContent value="not-started">
          <LmsCourseGrid 
            courses={notStartedItems} 
            emptyStateTitle="Tidak ada tugas baru"
            emptyStateDescription="Anda tidak memiliki kursus baru yang ditugaskan."
          />
        </TabsContent>
        
        <TabsContent value="completed">
          <LmsCourseGrid 
            courses={completedItems} 
            emptyStateTitle="Belum ada kursus selesai"
            emptyStateDescription="Selesaikan kursus pertama Anda untuk melihat riwayat di sini."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
