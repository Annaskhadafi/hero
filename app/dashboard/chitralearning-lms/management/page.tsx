import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { chitraLearningCourses, chitraLearningEnrollments, employees } from '@/db/schema/hero'
import { eq, desc } from 'drizzle-orm'
import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EnrollmentApprovalClient } from './enrollment-approval-client'
import { CourseListTable } from './course-list-table'

export const metadata = {
  title: 'Manajemen Kursus | ChitraLearning LMS',
}

export default async function LmsManagementPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { isLmsAdmin } = await import('@/lib/chitralearning-lms')
  const isAdmin = await isLmsAdmin(session)
  if (!isAdmin) {
    redirect('/dashboard/chitralearning-lms')
  }

  const courses = await db
    .select()
    .from(chitraLearningCourses)
    .orderBy(desc(chitraLearningCourses.createdAt))

  const formattedCourses = courses.map(c => ({
    id: c.id,
    title: c.title,
    category: c.category,
    status: c.status,
    level: (c as any).level || 'beginner',
    lessons: 0, // Mock count
    action: `/dashboard/chitralearning-lms/courses/${c.slug}/edit`
  }))

  const approvedEnrollmentsRows = await db
    .select({
      id: chitraLearningEnrollments.id,
      courseId: chitraLearningEnrollments.courseId,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      department: employees.department,
      joinedAt: chitraLearningEnrollments.createdAt,
      completedAt: chitraLearningEnrollments.completedAt,
      progress: chitraLearningEnrollments.progress,
      finalScore: chitraLearningEnrollments.finalScore,
    })
    .from(chitraLearningEnrollments)
    .innerJoin(employees, eq(chitraLearningEnrollments.employeeId, employees.id))
    .where(eq(chitraLearningEnrollments.approvalStatus, 'approved'))
    .orderBy(desc(chitraLearningEnrollments.createdAt))

  const coursesWithEnrollments = formattedCourses.map(course => ({
    ...course,
    enrollments: approvedEnrollmentsRows.filter(e => e.courseId === course.id)
  }))

  const pendingRows = await db
    .select({
      id: chitraLearningEnrollments.id,
      courseTitle: chitraLearningCourses.title,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      department: employees.department,
      requestedAt: chitraLearningEnrollments.createdAt,
    })
    .from(chitraLearningEnrollments)
    .innerJoin(chitraLearningCourses, eq(chitraLearningEnrollments.courseId, chitraLearningCourses.id))
    .innerJoin(employees, eq(chitraLearningEnrollments.employeeId, employees.id))
    .where(eq(chitraLearningEnrollments.approvalStatus, 'pending'))
    .orderBy(desc(chitraLearningEnrollments.createdAt))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Manajemen Kursus</h1>
          <p className="text-slate-500">Kelola semua kursus di sistem.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/chitralearning-lms/courses/new">
            <Plus className="mr-2 h-4 w-4" /> Buat Kursus
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="courses" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="courses">Daftar Kursus</TabsTrigger>
          <TabsTrigger value="pending">
            Permintaan Pendaftaran
            {pendingRows.length > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-medium text-white">
                {pendingRows.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses">
          <CourseListTable courses={coursesWithEnrollments} />
        </TabsContent>

        <TabsContent value="pending">
          <EnrollmentApprovalClient pendingEnrollments={pendingRows} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
