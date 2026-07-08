import { getServerSession } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { chitraLearningCourses } from '@/db/schema/hero'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Hammer } from 'lucide-react'

export const metadata = {
  title: 'Certificate Builder | ChitraLearning',
}

export default async function CertificateBuilderSelectPage() {
  const session = await getServerSession()
  const { isLmsAdmin } = await import('@/lib/chitralearning-lms')
  if (!session?.user || !(await isLmsAdmin(session))) {
    redirect('/dashboard/chitralearning-lms')
  }

  const courses = await db.select().from(chitraLearningCourses).orderBy(chitraLearningCourses.title)

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Certificate Builder</h1>
        <p className="text-slate-500 mt-1">Pilih kursus untuk mengatur template sertifikat kelulusan.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Card key={course.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">{course.title}</CardTitle>
              <CardDescription className="line-clamp-2">{course.description || 'Tidak ada deskripsi'}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-4">
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                <Link href={`/dashboard/chitralearning-lms/courses/${course.slug}/edit?tab=certificate`}>
                  <Hammer className="mr-2 h-4 w-4" />
                  Edit Template
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}

        {courses.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
            Belum ada kursus yang dibuat.
          </div>
        )}
      </div>
    </div>
  )
}
