import { Metadata } from 'next'
import { getServerSession } from '@/lib/auth-session'
import { redirect } from 'next/navigation'
import { listPatterns } from '@/app/actions/tire-pattern-actions'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PenTool, Plus, Calendar, Ruler, FileImage } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Library Pola — Pattern Designer | HERO',
}

export default async function PatternLibraryPage() {
  const session = await getServerSession()
  if (!session?.user) redirect('/sign-in')

  const patterns = await listPatterns()

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a] font-['Manrope',sans-serif]">Library Pola Ban</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Semua desain pola yang tersimpan</p>
        </div>
        <Link href="/dashboard/repair-retread/pattern-designer">
          <Button className="bg-[#0f172a] hover:bg-[#1e293b] text-white gap-2">
            <Plus className="w-4 h-4" />
            Buat Pola Baru
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Desain', value: patterns.length },
          { label: 'Aktif', value: patterns.filter((p) => p.status === 'active').length },
          { label: 'Bulan Ini', value: patterns.filter((p) => new Date(p.createdAt).getMonth() === new Date().getMonth()).length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-[#0f172a] font-['Manrope']">{value}</p>
            <p className="text-xs text-[#64748b] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Grid */}
      {patterns.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center shadow-sm">
          <PenTool className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-[#64748b]">Belum ada pola tersimpan</p>
          <Link href="/dashboard/repair-retread/pattern-designer" className="mt-4 inline-block">
            <Button className="bg-[#0f172a] text-white mt-3 gap-2">
              <Plus className="w-4 h-4" />
              Buat Pola Pertama
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {patterns.map((pattern) => (
            <div key={pattern.id} className="bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Thumbnail */}
              <div className="h-32 bg-[#1a1a1a] flex items-center justify-center relative overflow-hidden">
                {pattern.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pattern.thumbnailUrl} alt={pattern.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-600 text-center">
                    <FileImage className="w-8 h-8 mx-auto mb-1 opacity-30" />
                    <span className="text-xs opacity-50">{pattern.patternType?.toUpperCase()}</span>
                  </div>
                )}
                {/* Status badge */}
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-semibold ${
                  pattern.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                }`}>
                  {pattern.status === 'active' ? 'Aktif' : pattern.status}
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-[#0f172a] text-sm truncate">{pattern.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#64748b]">
                    <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{pattern.tireSize}</span>
                    <span className="capitalize">{pattern.patternType}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-gray-50 rounded-lg p-2">
                  <div>
                    <p className="text-[#64748b]">Sudut</p>
                    <p className="font-bold text-[#0f172a]">{pattern.grooveAngle}°</p>
                  </div>
                  <div>
                    <p className="text-[#64748b]">Lebar</p>
                    <p className="font-bold text-[#0f172a]">{pattern.grooveWidthMm}mm</p>
                  </div>
                  <div>
                    <p className="text-[#64748b]">Dalam</p>
                    <p className="font-bold text-[#0f172a]">{pattern.grooveDepthMm}mm</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-[#64748b]">
                    <Calendar className="w-3 h-3" />
                    {new Date(pattern.createdAt).toLocaleDateString('id-ID')}
                  </span>
                  <Link href={`/dashboard/repair-retread/pattern-designer?load=${pattern.id}`}>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      Buka
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
