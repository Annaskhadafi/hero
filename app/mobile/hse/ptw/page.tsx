import { redirect } from 'next/navigation'
import { MobilePtwClient } from '@/components/mobile/mobile-hse-modules-client'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { getHiradcData } from '@/lib/hiradc/queries'
import { getMobilePtwPermits } from './actions'
import { getApprovalCenterData } from '@/lib/approval-workspace'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq, asc } from 'drizzle-orm'

async function safeQuery<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    console.error(`[MobilePtwPage] Failed to fetch ${label}:`, error)
    return fallback
  }
}

export default async function MobilePtwPage({
  searchParams,
}: {
  searchParams?: Promise<{ extend?: string }>
}) {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  const query = searchParams ? await searchParams : {}
  const extendId = Number(query.extend ?? 0) || undefined

  const [hiradcData, access, permits, rawEmployees, approvalData] = await Promise.all([
    getHiradcData(),
    getCurrentMenuPermission('hse_izin_kerja_ptw'),
    getMobilePtwPermits(),
    db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        jobTitle: employees.jobTitle,
        employeeSn: employees.employeeSn,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name)),
    safeQuery(() => getApprovalCenterData(session.user.email), null, "getApprovalCenterData"),
  ])

  // Find the reverted PTW permit to pre-fill the form
  const extendPermit = extendId ? permits.find((p) => p.id === extendId) ?? null : null

  return (
    <MobilePtwClient
      sources={hiradcData.entries}
      access={access}
      permits={permits}
      employees={rawEmployees}
      approvalData={approvalData}
      initialExtendPermit={extendPermit as any}
    />
  )
}
