import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { NewCourseForm } from './client-form'

import { db } from '@/db'
import { chitraLearningCategories, employees } from '@/db/schema/hero'

export default async function NewCoursePage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { getCurrentMenuPermission } = await import('@/lib/hero-access')
  if (!(await getCurrentMenuPermission('chitralearning_lms_builder')).canEdit) {
    redirect('/dashboard')
  }

  const [categories, allEmployees] = await Promise.all([
    db.select().from(chitraLearningCategories),
    db.select({ section: employees.section }).from(employees),
  ])

  const sections = Array.from(new Set(allEmployees.map(e => e.section).filter((s): s is string => Boolean(s)))).sort()

  return (
    <div className="w-full h-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Course Builder</h1>
        <p className="text-muted-foreground">Buat course baru untuk internal perusahaan.</p>
      </div>
      <NewCourseForm categories={categories} sections={sections} />
    </div>
  )
}
