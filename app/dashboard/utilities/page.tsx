import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { employees, sites } from '@/db/schema/hero'
import { eq, or, sql } from 'drizzle-orm'
import { getServerSession } from '@/lib/auth-session'
import {
  canAccessDailyActivityMonitoring,
  getCurrentEmployeeAccessRole,
  isSuperAdminRole,
  isLeadershipOrManagerialRole,
} from '@/lib/hero-access'
import { getUtilitiesDashboardData } from '@/lib/utilities-dashboard'
import { UtilitiesClientDashboard } from './client'

export const metadata: Metadata = {
  title: 'Dashboard Utilities - Monitoring Pekerjaan Site | HERO',
  description: 'Monitoring kuantitas output fisik pekerjaan (Ban/Pcs/Tugas) dan durasi operasional per Site Lokasi',
}

interface PageProps {
  searchParams?: Promise<{
    siteId?: string
    period?: 'today' | 'yesterday' | 'weekly' | 'monthly' | 'custom'
    startDate?: string
    endDate?: string
    search?: string
    employeeName?: string
  }>
}

export default async function UtilitiesPage({ searchParams }: PageProps) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    redirect('/sign-in')
  }

  // Khusus untuk PJO, Head Section, Head Department, Manajemen Site, Super Admin
  const roleName = await getCurrentEmployeeAccessRole()
  const sessionRole = (session.user as { role?: string }).role || roleName || null

  const isSuperAdmin = isSuperAdminRole(roleName) || isSuperAdminRole(sessionRole)
  const isLeadership = isLeadershipOrManagerialRole(roleName) || isLeadershipOrManagerialRole(sessionRole)

  const canAccess =
    isSuperAdmin ||
    isLeadership ||
    (await canAccessDailyActivityMonitoring(
      session.user.email,
      session.user.id,
      sessionRole
    ))

  const resolvedParams = searchParams ? await searchParams : {}

  const userConds = []
  if (session.user.id) {
    userConds.push(eq(employees.authUserId, session.user.id))
  }
  if (session.user.email) {
    userConds.push(sql`lower(${employees.email}) = lower(${session.user.email})`)
  }

  const empRows = userConds.length > 0
    ? await db
        .select({
          id: employees.id,
          name: employees.name,
          siteId: employees.siteId,
          siteName: sites.name,
        })
        .from(employees)
        .leftJoin(sites, eq(employees.siteId, sites.id))
        .where(userConds.length > 1 ? or(...userConds) : userConds[0])
        .limit(1)
        .catch(() => [])
    : []

  const emp = empRows[0]

  // Jika user bukan superadmin/leadership dan tidak terdaftar di employee, redirect
  if (!canAccess && !emp) {
    redirect('/dashboard')
  }

  // Default siteId:
  // 1. Jika eksplisit di searchParams (misal '0' atau '3'), gunakan nilai tersebut
  // 2. Jika tidak ada di searchParams:
  //    - Jika canAccess (Super Admin / Management), utamakan site user atau '0' (Konsolidasi)
  //    - Jika user biasa, kunci ke siteId mereka
  let effectiveSiteId = resolvedParams.siteId
  if (effectiveSiteId === undefined || effectiveSiteId === null || effectiveSiteId === '') {
    if (!canAccess && emp?.siteId) {
      effectiveSiteId = String(emp.siteId)
    } else if (emp?.siteId) {
      effectiveSiteId = String(emp.siteId)
    } else {
      effectiveSiteId = '0'
    }
  }

  // Jika user biasa tidak berhak ubah site, paksa ke siteId miliknya
  if (!canAccess && emp?.siteId) {
    effectiveSiteId = String(emp.siteId)
  }

  const dashboardData = await getUtilitiesDashboardData({
    siteId: effectiveSiteId,
    period: resolvedParams.period,
    startDate: resolvedParams.startDate,
    endDate: resolvedParams.endDate,
    search: resolvedParams.search,
    employeeName: resolvedParams.employeeName,
  })

  return (
    <UtilitiesClientDashboard
      initialData={dashboardData}
      canSwitchSite={canAccess}
    />
  )
}
