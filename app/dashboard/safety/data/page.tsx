import Link from 'next/link'
import { Database } from 'lucide-react'

import { AdminPageShell } from '@/components/admin-page-shell'
import { Button } from '@/components/ui/button'
import { SafetyDataManagement } from '@/components/safety-dashboard/safety-data-management'
import { getSafetyDashboardData } from '@/lib/safety-dashboard/queries'

function SafetyDataBanner() {
  return (
    <div className="relative flex flex-col items-center justify-center gap-3 bg-[#1e40af] px-5 py-4 text-white sm:flex-row sm:justify-center">
      <div className="text-center">
        <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-white/80 uppercase">
          K3 & Safety Management
        </p>
        <h1 className="font-display text-xl font-semibold tracking-wide">SAFETY DATA MANAGEMENT</h1>
      </div>
      <Link
        href="/dashboard/safety"
        className="focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#1e40af] shadow transition-colors hover:bg-white/90 focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 sm:absolute sm:top-1/2 sm:right-5 sm:-translate-y-1/2"
      >
        <Database className="mr-2 size-4" />
        Kembali ke Dashboard
      </Link>
    </div>
  )
}

export default async function SafetyDataPage() {
  const data = await getSafetyDashboardData()

  return (
    <AdminPageShell eyebrow="" title="" description="" header={<SafetyDataBanner />}>
      <SafetyDataManagement data={data} />
    </AdminPageShell>
  )
}
