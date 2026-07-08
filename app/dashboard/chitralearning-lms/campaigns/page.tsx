import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { getInternalLmsWorkspaceData } from '@/lib/chitralearning-lms'
import { Button } from '@/components/ui/button'
import { Plus, Megaphone } from 'lucide-react'

export const metadata = {
  title: 'Campaigns | ChitraLearning LMS',
}

export default async function LmsCampaignsPage() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { isLmsAdmin } = await import('@/lib/chitralearning-lms')
  const isAdmin = await isLmsAdmin(session)
  if (!isAdmin) {
    redirect('/dashboard/chitralearning-lms')
  }

  const workspace = await getInternalLmsWorkspaceData()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Campaign Pembelajaran</h1>
          <p className="text-slate-500">Kelola penugasan massal kursus untuk karyawan.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Buat Campaign
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {workspace.campaigns.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-1">Belum ada campaign</h3>
            <p className="text-slate-500 mb-6">Buat campaign pertama Anda untuk menugaskan kursus secara massal.</p>
            <Button variant="outline">Buat Campaign Baru</Button>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Nama Campaign</th>
                <th className="px-6 py-4">Tipe Target</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workspace.campaigns.map(campaign => (
                <tr key={campaign.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">{campaign.title}</td>
                  <td className="px-6 py-4 text-slate-600 capitalize">{campaign.targetType}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      campaign.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                      campaign.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm">Detail</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
