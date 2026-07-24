import { getServerSession } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq, and, or } from 'drizzle-orm'
import { getInternalLmsWorkspaceData, buildInternalLmsLearnerCourses } from '@/lib/chitralearning-lms'
import { chitraLearningEnrollments, chitraLearningCertificates, chitraLearningCourses, trainingRecords } from '@/db/schema/hero'
import { LmsCatalogClient } from '@/components/lms/lms-catalog-client'

export const metadata = {
  title: 'Katalog Kursus | ChitraLearning LMS',
}

export default async function LmsCatalogPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Find current employee
  const currentEmployeeRows = await db
    .select()
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1)
  
  const currentEmployee = currentEmployeeRows[0] || null

  if (currentEmployee) {
    // Auto-heal missing certificates
    const completedEnrollments = await db
      .select({
        id: chitraLearningEnrollments.id,
        courseId: chitraLearningEnrollments.courseId,
        courseTitle: chitraLearningCourses.title,
        certificateEnabled: chitraLearningCourses.certificateEnabled,
        completedAt: chitraLearningEnrollments.completedAt,
      })
      .from(chitraLearningEnrollments)
      .innerJoin(chitraLearningCourses, eq(chitraLearningEnrollments.courseId, chitraLearningCourses.id))
      .where(
        and(
          eq(chitraLearningEnrollments.employeeId, currentEmployee.id),
          or(
            eq(chitraLearningEnrollments.status, 'passed'),
            eq(chitraLearningEnrollments.progress, 100)
          )
        )
      )

    for (const enrollment of completedEnrollments) {
      if (!enrollment.certificateEnabled) continue;
      // Check if certificate exists
      const [existing] = await db
        .select({ id: chitraLearningCertificates.id })
        .from(chitraLearningCertificates)
        .where(
          and(
            eq(chitraLearningCertificates.courseId, enrollment.courseId),
            eq(chitraLearningCertificates.employeeId, currentEmployee.id)
          )
        )
        .limit(1)

      if (!existing) {
        // Create training record
        const [tr] = await db
          .insert(trainingRecords)
          .values({
            employeeId: currentEmployee.id,
            trainingName: enrollment.courseTitle,
            provider: "ChitraLearning LMS Internal",
            completedYear: enrollment.completedAt ? enrollment.completedAt.getFullYear() : new Date().getFullYear(),
            status: "valid",
          })
          .returning({ id: trainingRecords.id })

        // Create certificate
        await db
          .insert(chitraLearningCertificates)
          .values({
            courseId: enrollment.courseId,
            employeeId: currentEmployee.id,
            enrollmentId: enrollment.id,
            trainingRecordId: tr?.id ?? null,
            certificateNumber: `CL-${new Date().getFullYear()}-${enrollment.courseId}-${currentEmployee.id}`,
            status: "issued",
            metadata: {
              source: "chitralearning-internal",
              issuedBy: currentEmployee.id,
            },
          })
      }
    }
  }

  // Fetch base workspace data (moved after auto-heal to catch new certificates)
  const workspaceData = await getInternalLmsWorkspaceData()
  
  // Compute learner courses to get enrollment progress
  const learnerCourses = buildInternalLmsLearnerCourses(workspaceData, currentEmployee)

  // Combine all published courses, map with their enrollment status if any
  const publishedCourses = workspaceData.courses.filter(c => c.status === 'published')

  const inProgressCourses = learnerCourses.filter(c => c.enrollment && !c.certificate && c.enrollment.progress < 100)
  const completedCourses = learnerCourses.filter(c => c.certificate || (c.enrollment && c.enrollment.progress >= 100))

  // Extract unique categories from published courses
  const categories = Array.from(
    new Set(publishedCourses.map(c => c.category ?? '').filter((c): c is string => Boolean(c.trim())))
  ).sort()

  const gridItems = publishedCourses.map(course => {
    // Check if enrolled
    const inProgress = inProgressCourses.find(c => c.id === course.id)
    const completed = completedCourses.find(c => c.id === course.id)
    
    let enrollment
    if (inProgress) {
      enrollment = { progress: inProgress.enrollment?.progress || 0, status: 'in-progress' }
    } else if (completed) {
      const certNumber = completed.certificate?.certificateNumber || `CL-${new Date().getFullYear()}-${course.id}-${currentEmployee?.id}`
      enrollment = {
        progress: 100,
        status: 'completed',
        certificateNumber: certNumber,
        employeeName: currentEmployee?.name || ''
      }
    }

    return {
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
      enrollment,
      href: `/dashboard/chitralearning-lms/courses/${course.slug}`
    }
  })

  return <LmsCatalogClient items={gridItems} categories={categories} />
}

