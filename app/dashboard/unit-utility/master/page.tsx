import { redirect } from 'next/navigation'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getUnitMasterAction } from '../../ewh/actions'
import { UnitMasterClient } from './unit-master-client'

interface PageProps {
  searchParams: Promise<{ siteId?: string }>
}

export const metadata = {
  title: 'Master Unit — Manajemen Alat Berat',
  description: 'Kelola master data unit dan alat berat per site tambang.',
}

export default async function UnitMasterPage({ searchParams }: PageProps) {
  const employee = await getCurrentEmployee()
  if (!employee) redirect('/sign-in')

  const params = await searchParams
  const siteId = params.siteId ? parseInt(params.siteId, 10) : employee.siteId

  const result = await getUnitMasterAction(siteId)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Master Unit</h1>
        <p className="text-sm text-muted-foreground">
          Daftar unit/alat berat yang terdaftar di site ini. Unit yang terdaftar di sini akan
          digunakan untuk auto-resolve unitNumber dari Daily Activity.
        </p>
      </div>
      <UnitMasterClient units={result.units} siteId={siteId} />
    </div>
  )
}
