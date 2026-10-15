import { Metadata } from 'next'
import { getTurnoverDashboardData } from '@/lib/hero-turnover'
import { TurnoverDashboard } from '@/components/turnover/turnover-dashboard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Labour Turn Over | HERO',
  description: 'Ringkasan Labour Turn Over, Karyawan Masuk dan Karyawan Keluar',
}

interface PageProps {
  searchParams?: Promise<{ year?: string }>
}

export default async function TurnoverPage(props: PageProps) {
  const searchParams = props.searchParams ? await props.searchParams : {}
  const year = searchParams.year ? parseInt(searchParams.year, 10) || 2026 : 2026

  const data = await getTurnoverDashboardData(year)

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8 w-full">
      <TurnoverDashboard
        summary={data.summary}
        incomingList={data.incomingList}
        outgoingList={data.outgoingList}
        options={data.options}
      />
    </div>
  )
}
