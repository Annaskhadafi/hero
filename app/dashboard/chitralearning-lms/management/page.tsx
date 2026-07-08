import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { chitraLearningCourses } from '@/db/schema/hero'
import { MinimalTableShell } from '@/components/ui/minimal-table-shell'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

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
    .orderBy(chitraLearningCourses.id)

  const formattedCourses = courses.map(c => ({
    id: c.id,
    title: c.title,
    category: c.category,
    status: c.status,
    level: (c as any).level || 'beginner',
    lessons: 0, // Mock count
    action: `/dashboard/chitralearning-lms/courses/${c.slug}/edit`
  }))

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

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-4">Judul Kursus</th>
              <th className="px-6 py-4">Kategori</th>
              <th className="px-6 py-4">Level</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {formattedCourses.map(course => (
              <tr key={course.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 font-medium text-slate-900">{course.title}</td>
                <td className="px-6 py-4 text-slate-600">{course.category}</td>
                <td className="px-6 py-4 text-slate-600 capitalize">{course.level}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    course.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                    course.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {course.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={course.action}>Edit</Link>
                  </Button>
                </td>
              </tr>
            ))}
            {formattedCourses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  Belum ada kursus.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
