import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getMaestroServerSession } from '@/lib/maestro-session'
import { getMaestroSafetyDataAction } from '@/app/actions/maestro-safety'
import { MaestroClientSafety } from './client-safety'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Safety & PTW',
  description: 'Verifikasi kepatuhan HSE, izin kerja risiko tinggi, dan inspeksi keselamatan operasional.',
}

interface PageProps {
  searchParams: Promise<{
    siteId?: string
    status?: string
    search?: string
  }>
}

export default async function MaestroSafetyPage({ searchParams }: PageProps) {
  const session = await getMaestroServerSession()
  if (!session) {
    redirect('/login')
  }

  const resolvedParams = await searchParams
  const result = await getMaestroSafetyDataAction({
    siteId: resolvedParams.siteId,
    status: resolvedParams.status,
    search: resolvedParams.search,
  })

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 text-center">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-8 max-w-md shadow-2xs">
          <h2 className="text-base font-bold text-slate-900">Gagal Memuat Data Safety</h2>
          <p className="mt-2 text-xs text-slate-500">{result.error || 'Terjadi kesalahan sistem.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24 text-slate-800">
      <MaestroClientSafety
        initialData={result.data}
        customerUser={session.user}
        currentSiteId={resolvedParams.siteId || 'all'}
      />
    </div>
  )
}
