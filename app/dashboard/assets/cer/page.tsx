import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { getCerDashboardData } from './actions'
import { CerDashboard } from './components/cer-dashboard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Pengadaan Aset (CER) | HERO',
  description: 'Capital Expenditure Request (CER) & Berita Acara Serah Terima Aset',
}

export default async function CerPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/sign-in?callbackUrl=/dashboard/assets/cer')
  }

  // Check menu permission
  const permission = await getCurrentMenuPermission('cer_request')
  if (permission && !permission.canView) {
    redirect('/dashboard')
  }

  const resolvedParams = searchParams ? await searchParams : {}
  const tab = resolvedParams.tab

  // If someone requests old ?tab=budget, redirect to the dedicated Budget Controller page
  if (tab === 'budget') {
    redirect('/dashboard/assets/budget-controller')
  }

  // Load dashboard overview data
  const data = await getCerDashboardData()

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-6">
        <CerDashboard data={data} defaultTab={tab as any} />
      </div>
    </div>
  )
}
