import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import {
  activityLibraries,
  dailyActivityApprovals,
  dailyActivitySessions,
  dailyActivitySessionItems,
  employees,
  masterDepartments,
  masterSections,
  sites,
} from '@/db/schema/hero'
import { asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { ApprovalListingClient, type SessionApprovalRow } from './client'
import { getDailyActivityWorkflowSettings } from '@/app/dashboard/activity-hub/actions'

export const metadata = {
  title: 'Approval Workflow - Daily Activity Hub',
}

export default async function DailyActivityApprovalListPage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/sign-in')

  try {
    const normalizedEmail = session.user.email.trim().toLowerCase()
    const [currentEmployee] = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        accessRole: employees.accessRole,
        jobTitle: employees.jobTitle,
        department: employees.department,
        section: employees.section,
        siteId: employees.siteId,
      })
      .from(employees)
      .where(sql`lower(${employees.email}) = ${normalizedEmail}`)
      .limit(1)

    const userRole = (session?.user?.role || '').toLowerCase()
    const accessRole = (currentEmployee?.accessRole || '').toLowerCase()
    const isAdmin =
      userRole === 'admin' ||
      userRole === 'superadmin' ||
      userRole === 'super admin' ||
      accessRole === 'admin' ||
      accessRole === 'super admin' ||
      accessRole === 'superadmin' ||
      accessRole === 'system administrator' ||
      accessRole === 'khusus mas rendi' ||
      accessRole === 'hc manager' ||
      accessRole === 'hr'

    const isSiteAdmin = accessRole === 'site admin'

    // Get all sessions with their approval status
    const rawSessions = await db
      .select({
        sessionId: dailyActivitySessions.id,
        sessionCode: dailyActivitySessions.sessionCode,
        workDate: dailyActivitySessions.workDate,
        shiftCode: dailyActivitySessions.shiftCode,
        sessionStatus: dailyActivitySessions.status,
        employeeId: dailyActivitySessions.employeeId,
        employeeName: employees.name,
        employeeSn: employees.employeeSn,
        department: employees.department,
        section: employees.section,
        siteName: sites.name,
        siteId: dailyActivitySessions.siteId,
      })
      .from(dailyActivitySessions)
      .leftJoin(employees, eq(dailyActivitySessions.employeeId, employees.id))
      .leftJoin(sites, eq(dailyActivitySessions.siteId, sites.id))
      .orderBy(desc(dailyActivitySessions.id))

    // Get all approvals for these sessions
    const rawSessionIds = rawSessions.map((s) => s.sessionId).filter(Boolean)
    const allApprovals =
      rawSessionIds.length > 0
        ? await db
            .select({
              sessionId: dailyActivityApprovals.sessionId,
              stepOrder: dailyActivityApprovals.stepOrder,
              stepLabel: dailyActivityApprovals.stepLabel,
              status: dailyActivityApprovals.status,
              approverName: dailyActivityApprovals.approverName,
              approverEmail: dailyActivityApprovals.approverEmail,
              approverEmployeeId: dailyActivityApprovals.approverEmployeeId,
              signatureDataUrl: dailyActivityApprovals.signatureDataUrl,
              remarks: dailyActivityApprovals.remarks,
              signedAt: dailyActivityApprovals.signedAt,
            })
            .from(dailyActivityApprovals)
            .where(inArray(dailyActivityApprovals.sessionId, rawSessionIds))
            .orderBy(asc(dailyActivityApprovals.stepOrder))
        : []

    const approvalsBySessionMap = new Map<number, typeof allApprovals>()
    for (const a of allApprovals) {
      if (!approvalsBySessionMap.has(a.sessionId)) {
        approvalsBySessionMap.set(a.sessionId, [])
      }
      approvalsBySessionMap.get(a.sessionId)!.push(a)
    }

    // Row-Level Security (RLS) Filter: Admin sees ALL, users strictly see their own / assigned sessions
    const sessions = rawSessions.filter((s) => {
      if (isAdmin) return true
      if (isSiteAdmin && currentEmployee?.siteId) return s.siteId === currentEmployee.siteId

      // Creator / Owner of this session
      if (currentEmployee?.id && s.employeeId === currentEmployee.id) return true

      // Assigned approver for any step of this session
      const sessionApps = approvalsBySessionMap.get(s.sessionId) || []
      const isAssignedApprover = sessionApps.some(
        (a) =>
          (currentEmployee?.id && a.approverEmployeeId === currentEmployee.id) ||
          (a.approverEmail && a.approverEmail.trim().toLowerCase() === normalizedEmail) ||
          (currentEmployee?.name && a.approverName && a.approverName.trim().toLowerCase() === currentEmployee.name.trim().toLowerCase())
      )
      if (isAssignedApprover) return true

      // Section Head / Leader
      const jobTitleLower = (currentEmployee?.jobTitle || '').toLowerCase()
      const isSectionHeadOrLeader = jobTitleLower.includes('section head') || jobTitleLower.includes('leader') || jobTitleLower.includes('supervisor') || jobTitleLower.includes('foreman')
      if (isSectionHeadOrLeader && currentEmployee?.section && s.section === currentEmployee.section) return true

      const isDeptHeadOrManager = jobTitleLower.includes('dept') || jobTitleLower.includes('department head') || jobTitleLower.includes('manager')
      if (isDeptHeadOrManager && currentEmployee?.department && s.department === currentEmployee.department) return true

      return false
    })

    const sessionIds = sessions.map((s) => s.sessionId).filter(Boolean)

    // Get all session items
    const allItems =
      sessionIds.length > 0
        ? await db
            .select({
              id: dailyActivitySessionItems.id,
              sessionId: dailyActivitySessionItems.sessionId,
              snapshotLabel: dailyActivitySessionItems.snapshotLabel,
              activityName: activityLibraries.activityName,
              unitNumber: dailyActivitySessionItems.unitNumber,
              remark: dailyActivitySessionItems.remark,
              actualPoints: dailyActivitySessionItems.actualPoints,
              startedAt: dailyActivitySessionItems.startedAt,
              endedAt: dailyActivitySessionItems.endedAt,
            })
            .from(dailyActivitySessionItems)
            .leftJoin(activityLibraries, eq(dailyActivitySessionItems.libraryActivityId, activityLibraries.id))
            .where(inArray(dailyActivitySessionItems.sessionId, sessionIds))
            .orderBy(asc(dailyActivitySessionItems.id))
        : []

    const itemsBySession = new Map<number, any[]>()
    for (const item of allItems || []) {
      if (item?.sessionId) {
        const list = itemsBySession.get(item.sessionId) || []
        let mins = 60
        if (item.startedAt && item.endedAt) {
          const diffMs = new Date(item.endedAt).getTime() - new Date(item.startedAt).getTime()
          if (diffMs > 0) mins = Math.round(diffMs / 60000)
        }
        const durationStr = `${Math.floor(mins / 60)}j ${mins % 60}m`
        list.push({
          id: Number(item.id),
          label: item.snapshotLabel || item.activityName || 'Aktivitas Operasional',
          unitNumber: item.unitNumber || '-',
          duration: durationStr,
          points: Number(item.actualPoints) || 0,
          remark: item.remark || '-',
        })
        itemsBySession.set(item.sessionId, list)
      }
    }

    // Get item counts per session
    const itemCounts =
      sessionIds.length > 0
        ? await db
            .select({
              sessionId: dailyActivitySessionItems.sessionId,
              count: sql<number>`count(*)`,
              totalPoints: sql<number>`coalesce(sum(${dailyActivitySessionItems.actualPoints}), 0)`,
            })
            .from(dailyActivitySessionItems)
            .where(inArray(dailyActivitySessionItems.sessionId, sessionIds))
            .groupBy(dailyActivitySessionItems.sessionId)
        : []

    const itemCountMap = new Map<number, { count: number; totalPoints: number }>()
    for (const i of itemCounts || []) {
      if (i?.sessionId) {
        itemCountMap.set(i.sessionId, {
          count: Number(i.count) || 0,
          totalPoints: Number(i.totalPoints) || 0,
        })
      }
    }

    // Map approvals by sessionId
    const approvalsBySession = new Map<number, any[]>()
    for (const a of allApprovals || []) {
      if (a?.sessionId) {
        const list = approvalsBySession.get(a.sessionId) || []
        list.push({
          stepOrder: Number(a.stepOrder) || 1,
          stepLabel: a.stepLabel || '',
          status: a.status || 'waiting',
          approverName: a.approverName || '',
          signatureDataUrl: a.signatureDataUrl || null,
          signedAt: a.signedAt ? new Date(a.signedAt).toISOString() : null,
        })
        approvalsBySession.set(a.sessionId, list)
      }
    }

    const [employeeList, siteList, libraryList, sectionList, departmentList] = await Promise.all([
      db
        .select({
          id: employees.id,
          name: employees.name,
          employeeId: employees.employeeSn,
          email: employees.email,
          jobTitle: employees.jobTitle,
          department: employees.department,
          section: employees.section,
          siteId: employees.siteId,
          directManagerId: employees.directManagerId,
          sectionId: employees.sectionId,
          departmentId: employees.departmentId,
        })
        .from(employees)
        .where(eq(employees.isActive, true)),
      db
        .select({
          id: sites.id,
          name: sites.name,
          location: sites.location,
        })
        .from(sites)
        .where(eq(sites.isActive, true)),
      db
        .select({
          id: activityLibraries.id,
          code: activityLibraries.activityCode,
          name: activityLibraries.activityName,
          basePoints: activityLibraries.basePoints,
        })
        .from(activityLibraries)
        .where(eq(activityLibraries.isActive, true))
        .limit(60),
      db.select().from(masterSections),
      db.select().from(masterDepartments),
    ])

    const sectionHeadMap: Record<string, number | null> = {}
    for (const s of sectionList || []) {
      if (s?.id) sectionHeadMap[String(s.id)] = s.headEmployeeId || null
    }

    const deptHeadMap: Record<string, number | null> = {}
    for (const d of departmentList || []) {
      if (d?.id) deptHeadMap[String(d.id)] = d.headEmployeeId || null
    }

    const rows: SessionApprovalRow[] = (sessions || []).map((s) => ({
      sessionId: Number(s.sessionId),
      sessionCode: s.sessionCode || `ACT-${s.sessionId}`,
      workDate: s.workDate ? new Date(s.workDate).toISOString() : null,
      shiftCode: s.shiftCode || 'ALL',
      sessionStatus: s.sessionStatus || 'Draft',
      employeeName: s.employeeName || 'Karyawan',
      employeeSn: s.employeeSn || '-',
      department: s.department || 'Operasional',
      section: s.section || '-',
      jobTitle: 'Serviceman',
      customerName: 'Default Customer',
      siteName: s.siteName || 'Central Site',
      totalItems: itemCountMap.get(s.sessionId)?.count ?? 0,
      totalPoints: itemCountMap.get(s.sessionId)?.totalPoints ?? 0,
      items: itemsBySession.get(s.sessionId) || [],
      approvals: approvalsBySession.get(s.sessionId) || [],
    }))

    const sanitizedEmployees = (employeeList || []).map((e) => ({
      id: Number(e.id),
      name: e.name || '',
      employeeId: e.employeeId || '',
      email: e.email || '',
      jobTitle: e.jobTitle || '',
      department: e.department || '',
      section: e.section || '',
      siteId: e.siteId ? Number(e.siteId) : null,
      directManagerId: e.directManagerId ? Number(e.directManagerId) : null,
      sectionId: e.sectionId ? Number(e.sectionId) : null,
      departmentId: e.departmentId ? Number(e.departmentId) : null,
    }))

    const sanitizedSites = (siteList || []).map((s) => ({
      id: Number(s.id),
      name: s.name || '',
      location: s.location || '',
    }))

    const sanitizedPresets = (libraryList || []).map((l) => ({
      id: Number(l.id),
      code: l.code || '',
      name: l.name || '',
      basePoints: Number(l.basePoints) || 0,
    }))

    const initialSettings = await getDailyActivityWorkflowSettings()

    return (
      <ApprovalListingClient
        rows={rows}
        employees={sanitizedEmployees}
        sites={sanitizedSites}
        activityPresets={sanitizedPresets}
        sectionHeadMap={sectionHeadMap}
        deptHeadMap={deptHeadMap}
        initialSettings={initialSettings}
      />
    )
  } catch (err) {
    console.error('[DailyActivityApprovalListPage] Exception:', err)
    return (
      <ApprovalListingClient
        rows={[]}
        employees={[]}
        sites={[]}
        activityPresets={[]}
        sectionHeadMap={{}}
        deptHeadMap={{}}
        initialSettings={{
          slaHoursLevel1: 24,
          slaHoursLevel2: 24,
          slaHoursLevel3: 24,
          autoApproveEnabled: false,
          requireSignature: true,
          notifyEmailOnSubmit: true,
          notifyEmailOnDecision: true,
        }}
      />
    )
  }
}
