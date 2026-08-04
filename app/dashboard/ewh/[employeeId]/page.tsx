import { redirect } from 'next/navigation'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getEwhDetailAction } from '../actions'
import { EwhEmployeeDetailClient } from './ewh-employee-detail-client'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'

interface PageProps {
  params: Promise<{ employeeId: string }>
  searchParams: Promise<{ period?: string }>
}

export const metadata = {
  title: 'Detail EWH Karyawan',
  description: 'Timeline 24 jam dan rincian jam kerja efektif karyawan.',
}

export default async function EwhEmployeeDetailPage({ params, searchParams }: PageProps) {
  const current = await getCurrentEmployee()
  if (!current) redirect('/sign-in')

  const { employeeId } = await params
  const { period } = await searchParams

  const now = new Date()
  const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const selectedPeriod = period ?? defaultPeriod

  const empId = parseInt(employeeId, 10)
  const [targetEmployee] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, empId))
    .limit(1)

  if (!targetEmployee) {
    return <div className="p-6 text-red-500">Karyawan tidak ditemukan.</div>
  }

  const result = await getEwhDetailAction(empId, selectedPeriod)

  return (
    <div className="flex flex-col gap-6 p-6">
      <EwhEmployeeDetailClient
        employee={targetEmployee}
        rows={result.rows}
        period={selectedPeriod}
      />
    </div>
  )
}
