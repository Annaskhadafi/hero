import { db } from '@/db'
import { chitraLearningPaths, chitraLearningPathCourses, chitraLearningCourses } from '@/db/schema/hero'
import { desc, eq, sql } from 'drizzle-orm'
import { getServerSession } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Map, Plus, MoreVertical } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Learning Paths | ChitraLearning',
}

export default async function PathsPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { isLmsAdmin } = await import('@/lib/chitralearning-lms')
  const isAdmin = await isLmsAdmin(session)
  if (!isAdmin) {
    redirect('/dashboard/chitralearning-lms')
  }

  const paths = await db
    .select({
      id: chitraLearningPaths.id,
      title: chitraLearningPaths.title,
      description: chitraLearningPaths.description,
      status: chitraLearningPaths.status,
      createdAt: chitraLearningPaths.createdAt,
      courseCount: sql<number>`count(${chitraLearningPathCourses.id})`,
    })
    .from(chitraLearningPaths)
    .leftJoin(chitraLearningPathCourses, eq(chitraLearningPaths.id, chitraLearningPathCourses.pathId))
    .groupBy(chitraLearningPaths.id)
    .orderBy(desc(chitraLearningPaths.createdAt))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-slate-900">Learning Paths</h1>
          <p className="text-sm text-slate-500">Kelola jalur pembelajaran terstruktur untuk karyawan.</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Buat Path Baru
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Total Courses</th>
                <th className="px-6 py-4">Dibuat Pada</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paths.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <Map className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                    <p>Belum ada Learning Path yang dibuat.</p>
                  </td>
                </tr>
              ) : (
                paths.map((path) => (
                  <tr key={path.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{path.title}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full border ${
                        path.status === 'published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {path.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{path.courseCount} Courses</td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(path.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
