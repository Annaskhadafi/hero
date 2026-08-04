import { redirect } from 'next/navigation'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getUnitUtilitySummaryAction } from '../ewh/actions'
import { UnitUtilityClient } from './unit-utility-client'

interface PageProps {
  searchParams: Promise<{ siteId?: string; date?: string }>
}

export const metadata = {
  title: 'Unit Utility — Pemantauan Utilisasi Alat',
  description:
    'Pantau utilisasi setiap unit/alat berat tambang. Lihat siapa yang mengoperasikan, berapa lama, dan mode operasi dari Daily Activity.',
}

export default async function UnitUtilityPage({ searchParams }: PageProps) {
  const employee = await getCurrentEmployee()
  if (!employee) redirect('/sign-in')

  const params = await searchParams
  const siteId = params.siteId ? parseInt(params.siteId, 10) : employee.siteId
  const dateStr = params.date ?? new Date().toISOString().slice(0, 10)
  const workDate = new Date(dateStr)

  const result = await getUnitUtilitySummaryAction(siteId, workDate)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Unit Utility
          </h1>
          <p className="text-sm text-muted-foreground">
            Utilisasi alat berat & objek workshop berdasarkan laporan Daily Activity karyawan.
          </p>
        </div>
      </div>

      <UnitUtilityClient
        rows={result.rows}
        siteId={siteId}
        dateStr={dateStr}
      />
    </div>
  )
}
