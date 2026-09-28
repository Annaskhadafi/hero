import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getMaestroServerSession } from '@/lib/maestro-session'
import { getMaestroTrackingDataAction } from '@/app/actions/maestro-tracking'
import { MaestroClientTracking } from './client-tracking'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'PO & Delivery Tracking',
  description: 'Pelacakan status Purchase Order, pengiriman ban (DO SAP), dan rekonsiliasi pengiriman unit.',
}

interface PageProps {
  searchParams: Promise<{
    status?: string
    search?: string
  }>
}

export default async function MaestroTrackingPage({ searchParams }: PageProps) {
  const session = await getMaestroServerSession()
  if (!session) {
    redirect('/login')
  }

  const resolvedParams = await searchParams
  const result = await getMaestroTrackingDataAction({
    status: resolvedParams.status,
    search: resolvedParams.search,
  })

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-6 text-center">
        <div className="rounded-3xl border border-slate-200/70 bg-white p-8 max-w-md shadow-2xs">
          <h2 className="text-base font-bold text-slate-900">Gagal Memuat Data Tracking</h2>
          <p className="mt-2 text-xs text-slate-500">{result.error || 'Terjadi kesalahan sistem.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-24 text-slate-900">
      <MaestroClientTracking
        initialData={result.data}
        customerUser={session.user}
      />
    </div>
  )
}
