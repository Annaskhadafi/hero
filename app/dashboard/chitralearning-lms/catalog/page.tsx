import { getServerSession } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { getInternalLmsWorkspaceData, buildInternalLmsLearnerCourses } from '@/lib/chitralearning-lms'
import { LmsCourseGrid } from '@/components/lms/lms-course-grid'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

export const metadata = {
  title: 'Katalog Kursus | ChitraLearning LMS',
}

export default async function LmsCatalogPage() {
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

  // Compute learner courses to get enrollment progress
  const learnerCourses = buildInternalLmsLearnerCourses(workspaceData, currentEmployee)

  // Combine all published courses, map with their enrollment status if any
  const publishedCourses = workspaceData.courses.filter(c => c.status === 'published')

  const inProgressCourses = learnerCourses.filter(c => c.enrollment && !c.certificate && c.enrollment.progress < 100)
  const completedCourses = learnerCourses.filter(c => c.certificate || (c.enrollment && c.enrollment.progress >= 100))

  const gridItems = publishedCourses.map(course => {
    // Check if enrolled
    const inProgress = inProgressCourses.find(c => c.id === course.id)
    const completed = completedCourses.find(c => c.id === course.id)
    
    let enrollment
    if (inProgress) {
      enrollment = { progress: inProgress.enrollment?.progress || 0, status: 'in-progress' }
    } else if (completed) {
      enrollment = { progress: 100, status: 'completed' }
    }

    return {
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        category: course.category, // Replace with actual relation if available
        level: (course as any).level || 'beginner', // Type cast for schema changes
        coverImageUrl: course.coverImageUrl,
        estimatedMinutes: course.estimatedMinutes,
        status: course.status,
      },
      enrollment,
      href: `/dashboard/chitralearning-lms/courses/${course.slug}`
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Katalog Kursus</h1>
          <p className="text-slate-500 mt-1">Jelajahi semua kursus yang tersedia untuk Anda.</p>
        </div>
        
        {/* Simple search bar placeholder */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari kursus..." 
            className="pl-9 bg-slate-50 border-slate-200"
          />
        </div>
      </div>

      <LmsCourseGrid courses={gridItems} />
    </div>
  )
}
