import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { Award, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Sertifikat | ChitraLearning LMS',
}

export default async function LmsCertificatesPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  // MOCK DATA for layout
  const certificates = [
    { id: 1, title: 'Dasar-dasar Keselamatan Kerja', date: '2026-06-15', score: 90 },
    { id: 2, title: 'Pengenalan Sistem Baru', date: '2026-05-10', score: 100 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
          <Award className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-heading">Sertifikat Anda</h1>
          <p className="text-slate-500">Lihat dan unduh sertifikat dari kursus yang telah diselesaikan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {certificates.map(cert => (
          <div key={cert.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm group">
            <div className="bg-slate-50 h-32 flex items-center justify-center border-b border-slate-100">
              <Award className="h-16 w-16 text-slate-300" />
            </div>
            <div className="p-5">
              <h3 className="font-heading font-semibold text-slate-900 mb-2 line-clamp-2">{cert.title}</h3>
              <div className="flex justify-between text-sm text-slate-500 mb-6">
                <span>{cert.date}</span>
                <span>Nilai: {cert.score}%</span>
              </div>
              <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
                <Download className="mr-2 h-4 w-4" /> Unduh PDF
              </Button>
            </div>
          </div>
        ))}
        {certificates.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <Award className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">Belum ada sertifikat</h3>
            <p className="text-slate-500">Selesaikan kursus dengan fitur sertifikat untuk mendapatkannya.</p>
          </div>
        )}
      </div>
    </div>
  )
}
