import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { LmsDashboardWidgets } from '@/components/lms/lms-dashboard-widgets'
import { LmsDashboardCharts } from '@/components/lms/lms-dashboard-charts'
import { LmsCourseCard } from '@/components/lms/lms-course-card'
import { getInternalLmsWorkspaceData, buildInternalLmsLearnerCourses } from '@/lib/chitralearning-lms'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, FileText } from 'lucide-react'

export default async function LmsDashboardPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { buildInternalLmsLearnerCourses, isLmsAdmin } = await import('@/lib/chitralearning-lms')

  const isAdmin = await isLmsAdmin(session)

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

  // Example stats (these should eventually come from a dedicated helper)
  const totalCourses = workspaceData.courses.length
  const totalEnrollments = workspaceData.enrollments.length
  const activeCampaigns = workspaceData.campaigns.filter(c => c.status === 'published').length
  
  // Example dummy value for avg completion rate
  const avgCompletionRate = 85

  // Generate chart data based on workspace data
  const enrollmentStats = workspaceData.courses.map(course => {
    const courseEnrollments = workspaceData.enrollments.filter(e => e.courseId === course.id)
    return {
      name: course.title,
      total: courseEnrollments.length
    }
  }).slice(0, 5) // top 5

  const completionStats = [
    { name: 'Selesai', value: workspaceData.enrollments.filter(e => e.progress >= 100).length },
    { name: 'Sedang Berjalan', value: workspaceData.enrollments.filter(e => e.progress > 0 && e.progress < 100).length },
    { name: 'Belum Dimulai', value: workspaceData.enrollments.filter(e => e.progress === 0).length }
  ]

  return (
    <div className="space-y-8 pb-12">
      {/* Header Section */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-slate-900">
          Selamat Datang, {currentEmployee?.name || session.user.name}
        </h1>
        <p className="text-slate-500 mt-2">
          Lanjutkan pembelajaran Anda atau jelajahi katalog kursus baru.
        </p>
      </div>

      {isAdmin && (
        <>
          <LmsDashboardWidgets
            totalCourses={totalCourses}
            totalEnrollments={totalEnrollments}
            avgCompletionRate={avgCompletionRate}
            activeCampaigns={activeCampaigns}
          />
          <LmsDashboardCharts 
            enrollmentStats={enrollmentStats} 
            completionStats={completionStats} 
          />
        </>
      )}

      {/* Continue Learning Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold font-heading">Lanjutkan Pembelajaran</h2>
          <Button variant="ghost" className="text-primary" asChild>
            <Link href="/dashboard/chitralearning-lms/my-learning">
              Lihat Semua <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        
        {inProgressCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {inProgressCourses.slice(0, 4).map(course => (
              <LmsCourseCard
                key={course.id}
                course={course}
                enrollment={{
                  progress: course.enrollment?.progress || 0,
                  status: 'in-progress'
                }}
                href={`/dashboard/chitralearning-lms/courses/${course.slug}/learn`}
              />
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-100">
            <p className="text-slate-500 mb-4">Anda belum mulai belajar kursus apapun.</p>
            <Button asChild>
              <Link href="/dashboard/chitralearning-lms/catalog">
                Jelajahi Katalog
              </Link>
            </Button>
          </div>
        )}
      </section>

      {/* Enrolled Courses / Assigned */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold font-heading">Kursus Baru Untuk Anda</h2>
          <Button variant="ghost" className="text-primary" asChild>
            <Link href="/dashboard/chitralearning-lms/catalog">
              Katalog <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {notStartedCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {notStartedCourses.slice(0, 4).map(course => (
              <LmsCourseCard
                key={course.id}
                course={course}
                href={`/dashboard/chitralearning-lms/courses/${course.slug}`}
              />
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-xl p-8 text-center border border-slate-100">
            <p className="text-slate-500">Tidak ada kursus baru yang ditugaskan kepada Anda.</p>
          </div>
        )}
      </section>

      {/* Recent Certificates */}
      {completedCourses.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold font-heading">Sertifikat Terbaru</h2>
            <Button variant="ghost" className="text-primary" asChild>
              <Link href="/dashboard/chitralearning-lms/certificates">
                Semua Sertifikat <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {completedCourses.slice(0, 4).map(course => (
              <div key={course.id} className="bg-white p-4 rounded-xl border border-slate-100 flex items-start gap-4">
                <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm line-clamp-2 leading-tight">{course.title}</h4>
                  <p className="text-xs text-slate-500 mt-1">Selesai</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
