import { getServerSession } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { chitraLearningEnrollments, chitraLearningCourses, employees, chitraLearningCertificates } from '@/db/schema/hero'
import { eq, desc } from 'drizzle-orm'
import { ReportsClient } from './reports-client'

export const metadata = {
  title: 'Laporan LMS | ChitraLearning',
}

export default async function LmsReportsPage() {
  const session = await getServerSession()
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms')
  if (!session?.user || !(await isLmsAdmin(session))) {
    redirect('/dashboard/chitralearning-lms')
  }

  // Fetch all enrollments with course and employee details, and left join certificates
  const data = await db
    .select({
      id: chitraLearningEnrollments.id,
      status: chitraLearningEnrollments.status,
      progress: chitraLearningEnrollments.progress,
      pretestScore: chitraLearningEnrollments.pretestScore,
      posttestScore: chitraLearningEnrollments.posttestScore,
      finalScore: chitraLearningEnrollments.finalScore,
      isPassed: chitraLearningEnrollments.isPassed,
      completedAt: chitraLearningEnrollments.completedAt,
      courseTitle: chitraLearningCourses.title,
      courseId: chitraLearningCourses.id,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      certificateNumber: chitraLearningCertificates.certificateNumber,
      certificateIssuedAt: chitraLearningCertificates.issuedAt,
    })
    .from(chitraLearningEnrollments)
    .innerJoin(chitraLearningCourses, eq(chitraLearningEnrollments.courseId, chitraLearningCourses.id))
    .innerJoin(employees, eq(chitraLearningEnrollments.employeeId, employees.id))
    .leftJoin(chitraLearningCertificates, eq(chitraLearningEnrollments.id, chitraLearningCertificates.enrollmentId))
    .orderBy(desc(chitraLearningEnrollments.updatedAt))

  return (
    <div className="p-6 max-w-[1920px] mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Laporan Progres Karyawan</h1>
        <p className="text-slate-500 mt-1">Pantau perkembangan, nilai ujian, dan status kelulusan peserta kursus.</p>
      </div>
      
      <ReportsClient data={data} />
    </div>
  )
}
