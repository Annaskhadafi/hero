import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { NewCourseForm } from './client-form'

import { db } from '@/db'
import { chitraLearningCategories } from '@/db/schema/hero'

export default async function NewCoursePage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { isLmsAdmin } = await import('@/lib/chitralearning-lms')
  const isAdmin = await isLmsAdmin(session)
  if (!isAdmin) {
    redirect('/dashboard/chitralearning-lms/catalog')
  }

  const categories = await db.select().from(chitraLearningCategories)

  return (
    <div className="w-full h-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Course Builder</h1>
        <p className="text-muted-foreground">Buat course baru untuk internal perusahaan.</p>
      </div>
      <NewCourseForm categories={categories} />
    </div>
  )
}
