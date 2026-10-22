'use server'

import { and, desc, eq, ilike, inArray, isNull, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { db } from '@/db'
import {
  employees,
  masterDepartments,
  masterSections,
  sites,
} from '@/db/schema/hero'
import {
  heroHseOsmFindings,
  heroHseOsmMasterClassifications,
  heroHseOsmMasterFocusItems,
  heroHseOsmSessions,
  heroHseOsmTeamMembers,
  type HseOsmFinding,
  type HseOsmSession,
  type HseOsmTeamMember,
} from '@/db/schema/hse-osm'
import { auth } from '@/lib/auth'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import type { HseOsmFindingStatus, HseOsmRiskLevel, HseOsmFindingCondition } from '@/lib/hse-osm-constants'
import { sendHseOsmFindingNotifications, resolvePicArea } from '@/lib/hse-osm-notifications'

export type OsmTeamMemberInput = {
  employeeId?: number | null
  badgeNumber: string
  name: string
  department: string
  company?: string
  isTeamLeader?: boolean
  isExternal?: boolean
}

export type OsmFindingInput = {
  id?: number
  classificationId?: number | null
  classificationName: string
  description: string
  photoUrls?: string[]
  riskLevel?: HseOsmRiskLevel
  status?: HseOsmFindingStatus
  condition?: HseOsmFindingCondition
  actionRequired?: string
  actionTaken?: string
  actionPhotoUrls?: string[]
  dueDate?: string
}

export type CreateOsmSessionInput = {
  siteId?: number | null
  inspectionDate: string
  inspectionTime: string
  locationArea: string
  locationDetail?: string
  latitude?: string
  longitude?: string
  gpsAccuracy?: string
  focusItemId?: number | null
  focusItemName: string
  leadEmployeeId?: number | null
  leadEmployeeName: string
  leadBadgeNumber: string
  leadDepartment: string
  leadCompany?: string
  leadRole?: string
  notes?: string
  teamMembers: OsmTeamMemberInput[]
  findings?: OsmFindingInput[]
}

export type OsmFilterOptions = {
  siteId?: number | null
  status?: string | null
  focusItemId?: number | null
  search?: string | null
  dateFrom?: string | null
  dateTo?: string | null
  limit?: number
  offset?: number
  reportTab?: 'all' | 'created' | 'received' | 'assigned' | null
}

async function getActorEmployee() {
  try {
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
    const actorEmail = session?.user?.email
    if (!actorEmail) return null
    const [emp] = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        jobTitle: employees.jobTitle,
        email: employees.email,
        siteId: employees.siteId,
        sectionId: employees.sectionId,
        departmentId: employees.departmentId,
      })
      .from(employees)
      .where(eq(employees.email, actorEmail))
      .limit(1)

    return {
      sessionUser: session.user,
      employee: emp || null,
    }
  } catch {
    return null
  }
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Ignore outside Next.js request context (e.g. tests)
  }
}

// Generate unique sequential session number: OSM-SES-YYYYMM-XXXX
async function generateSessionNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `OSM-SES-${yearMonth}-`

  const [lastRow] = await db
    .select({ sessionNumber: heroHseOsmSessions.sessionNumber })
    .from(heroHseOsmSessions)
    .where(ilike(heroHseOsmSessions.sessionNumber, `${prefix}%`))
    .orderBy(desc(heroHseOsmSessions.id))
    .limit(1)

  let nextSequence = 1
  if (lastRow?.sessionNumber) {
    const parts = lastRow.sessionNumber.split('-')
    const lastSeq = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(lastSeq)) nextSequence = lastSeq + 1
  }

  return `${prefix}${String(nextSequence).padStart(4, '0')}`
}

// Generate unique sequential finding number: OSM-TKT-YYYYMM-XXXX
async function generateFindingNumber(): Promise<string> {
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const prefix = `OSM-TKT-${yearMonth}-`

  const [lastRow] = await db
    .select({ findingNumber: heroHseOsmFindings.findingNumber })
    .from(heroHseOsmFindings)
    .where(ilike(heroHseOsmFindings.findingNumber, `${prefix}%`))
    .orderBy(desc(heroHseOsmFindings.id))
    .limit(1)

  let nextSequence = 1
  if (lastRow?.findingNumber) {
    const parts = lastRow.findingNumber.split('-')
    const lastSeq = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(lastSeq)) nextSequence = lastSeq + 1
  }

  return `${prefix}${String(nextSequence).padStart(4, '0')}`
}

export async function getHseOsmDashboardData(siteId?: number | null) {
  try {
    const actor = await getActorEmployee()

    // Status counts
    const statusConditions = [isNull(heroHseOsmFindings.deletedAt)]
    if (siteId) {
      // Find findings where session belongs to site
      const sessionsInSite = db
        .select({ id: heroHseOsmSessions.id })
        .from(heroHseOsmSessions)
        .where(
          and(
            eq(heroHseOsmSessions.siteId, siteId),
            isNull(heroHseOsmSessions.deletedAt)
          )
        )
      statusConditions.push(inArray(heroHseOsmFindings.sessionId, sessionsInSite))
    }

    const [metricCounts] = await db
      .select({
        totalFindings: sql<number>`count(${heroHseOsmFindings.id})::int`,
        openTickets: sql<number>`count(case when ${heroHseOsmFindings.status} = 'OPEN' then 1 end)::int`,
        processedTickets: sql<number>`count(case when ${heroHseOsmFindings.status} = 'PROCESSED' then 1 end)::int`,
        closedTickets: sql<number>`count(case when ${heroHseOsmFindings.status} = 'CLOSED' then 1 end)::int`,
        rejectedTickets: sql<number>`count(case when ${heroHseOsmFindings.status} = 'REJECTED' then 1 end)::int`,
      })
      .from(heroHseOsmFindings)
      .where(and(...statusConditions))

    // Total active sessions
    const sessionConditions = [isNull(heroHseOsmSessions.deletedAt)]
    if (siteId) sessionConditions.push(eq(heroHseOsmSessions.siteId, siteId))

    const [sessionCountRow] = await db
      .select({
        totalSessions: sql<number>`count(${heroHseOsmSessions.id})::int`,
      })
      .from(heroHseOsmSessions)
      .where(and(...sessionConditions))

    // Master focus items & classifications
    const focusItems = await db
      .select()
      .from(heroHseOsmMasterFocusItems)
      .where(eq(heroHseOsmMasterFocusItems.isActive, true))
      .orderBy(heroHseOsmMasterFocusItems.sortOrder)

    const classifications = await db
      .select()
      .from(heroHseOsmMasterClassifications)
      .where(eq(heroHseOsmMasterClassifications.isActive, true))
      .orderBy(heroHseOsmMasterClassifications.sortOrder)

    // Master sites
    const siteList = await db
      .select({ id: sites.id, name: sites.name })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(sites.name)

    // Active employees for team selection
    const employeesList = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        jobTitle: employees.jobTitle,
        departmentName: masterDepartments.name,
        sectionName: masterSections.name,
      })
      .from(employees)
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .where(eq(employees.employmentStatus, 'active'))
      .orderBy(employees.name)
      .limit(300)

    return {
      success: true,
      metrics: {
        totalSessions: sessionCountRow?.totalSessions || 0,
        totalFindings: metricCounts?.totalFindings || 0,
        openTickets: metricCounts?.openTickets || 0,
        processedTickets: metricCounts?.processedTickets || 0,
        closedTickets: metricCounts?.closedTickets || 0,
        rejectedTickets: metricCounts?.rejectedTickets || 0,
      },
      focusItems,
      classifications,
      sites: siteList,
      employees: employeesList,
      actor,
    }
  } catch (error: any) {
    console.error('getHseOsmDashboardData error:', error)
    return { success: false, error: error?.message || 'Gagal memuat data OSM dashboard' }
  }
}

export async function getHseOsmSessions(options: OsmFilterOptions = {}) {
  try {
    const actor = await getActorEmployee()
    const { siteId, status, focusItemId, search, dateFrom, dateTo, limit = 50, offset = 0, reportTab } = options

    const conditions = [isNull(heroHseOsmSessions.deletedAt)]

    if (siteId) conditions.push(eq(heroHseOsmSessions.siteId, siteId))
    if (status && (status === 'ACTIVE' || status === 'ARCHIVED')) {
      conditions.push(eq(heroHseOsmSessions.status, status))
    }
    if (focusItemId) conditions.push(eq(heroHseOsmSessions.focusItemId, focusItemId))
    if (dateFrom) conditions.push(sql`${heroHseOsmSessions.inspectionDate} >= ${dateFrom}`)
    if (dateTo) conditions.push(sql`${heroHseOsmSessions.inspectionDate} <= ${dateTo}`)

    if (search && search.trim()) {
      const term = `%${search.trim()}%`
      conditions.push(
        or(
          ilike(heroHseOsmSessions.sessionNumber, term),
          ilike(heroHseOsmSessions.locationArea, term),
          ilike(heroHseOsmSessions.locationDetail, term),
          ilike(heroHseOsmSessions.leadEmployeeName, term),
          ilike(heroHseOsmSessions.leadBadgeNumber, term),
          ilike(heroHseOsmSessions.leadDepartment, term),
          ilike(heroHseOsmSessions.leadCompany, term),
          ilike(heroHseOsmSessions.focusItemName, term),
          ilike(sites.name, term)
        )!
      )
    }

    const rows = await db
      .select({
        id: heroHseOsmSessions.id,
        sessionNumber: heroHseOsmSessions.sessionNumber,
        siteId: heroHseOsmSessions.siteId,
        siteName: sites.name,
        inspectionDate: heroHseOsmSessions.inspectionDate,
        inspectionTime: heroHseOsmSessions.inspectionTime,
        locationArea: heroHseOsmSessions.locationArea,
        locationDetail: heroHseOsmSessions.locationDetail,
        latitude: heroHseOsmSessions.latitude,
        longitude: heroHseOsmSessions.longitude,
        gpsAccuracy: heroHseOsmSessions.gpsAccuracy,
        focusItemId: heroHseOsmSessions.focusItemId,
        focusItemName: heroHseOsmSessions.focusItemName,
        leadEmployeeId: heroHseOsmSessions.leadEmployeeId,
        leadEmployeeName: heroHseOsmSessions.leadEmployeeName,
        leadBadgeNumber: heroHseOsmSessions.leadBadgeNumber,
        leadDepartment: heroHseOsmSessions.leadDepartment,
        leadCompany: heroHseOsmSessions.leadCompany,
        leadRole: heroHseOsmSessions.leadRole,
        notes: heroHseOsmSessions.notes,
        status: heroHseOsmSessions.status,
        createdAt: heroHseOsmSessions.createdAt,
      })
      .from(heroHseOsmSessions)
      .leftJoin(sites, eq(heroHseOsmSessions.siteId, sites.id))
      .where(and(...conditions))
      .orderBy(desc(heroHseOsmSessions.inspectionDate), desc(heroHseOsmSessions.id))
      .limit(limit)
      .offset(offset)

    if (rows.length === 0) {
      return { success: true, data: [] }
    }

    const sessionIds = rows.map((r) => r.id)

    // Fetch findings counts for each session
    const findingsRows = await db
      .select({
        sessionId: heroHseOsmFindings.sessionId,
        status: heroHseOsmFindings.status,
        count: sql<number>`count(${heroHseOsmFindings.id})::int`,
      })
      .from(heroHseOsmFindings)
      .where(
        and(
          inArray(heroHseOsmFindings.sessionId, sessionIds),
          isNull(heroHseOsmFindings.deletedAt)
        )
      )
      .groupBy(heroHseOsmFindings.sessionId, heroHseOsmFindings.status)

    // Fetch team members count for each session
    const teamCounts = await db
      .select({
        sessionId: heroHseOsmTeamMembers.sessionId,
        count: sql<number>`count(${heroHseOsmTeamMembers.id})::int`,
      })
      .from(heroHseOsmTeamMembers)
      .where(inArray(heroHseOsmTeamMembers.sessionId, sessionIds))
      .groupBy(heroHseOsmTeamMembers.sessionId)

    const sessionData = rows.map((session) => {
      const relatedFindings = findingsRows.filter((f) => f.sessionId === session.id)
      const totalFindings = relatedFindings.reduce((sum, item) => sum + item.count, 0)
      const openCount = relatedFindings.find((f) => f.status === 'OPEN')?.count || 0
      const processedCount = relatedFindings.find((f) => f.status === 'PROCESSED')?.count || 0
      const closedCount = relatedFindings.find((f) => f.status === 'CLOSED')?.count || 0
      const rejectedCount = relatedFindings.find((f) => f.status === 'REJECTED')?.count || 0
      const teamCount = teamCounts.find((t) => t.sessionId === session.id)?.count || 0

      const substandardCount = openCount + processedCount + rejectedCount
      const standardCount = closedCount

      let ticketStatus: 'OPEN' | 'IN PROGRESS' | 'CLOSED' | 'REJECTED' = 'CLOSED'
      if (openCount > 0) {
        ticketStatus = 'OPEN'
      } else if (processedCount > 0) {
        ticketStatus = 'IN PROGRESS'
      } else if (rejectedCount > 0) {
        ticketStatus = 'REJECTED'
      } else if (session.status === 'ACTIVE' && totalFindings === 0) {
        ticketStatus = 'OPEN'
      } else {
        ticketStatus = 'CLOSED'
      }

      const isLocked = session.status === 'SUBMITTED' || session.status === 'COMPLETED'
      const progressPercent = totalFindings > 0 ? Math.round((closedCount / totalFindings) * 1000) / 10 : (isLocked ? 100 : 0)

      const actorEmailNorm = (actor?.sessionUser?.email || '').toLowerCase()
      const actorBadge = actor?.employee?.employeeSn || ''
      const actorId = actor?.employee?.id
      const actorSiteId = actor?.employee?.siteId
      const picInfo = resolvePicArea(session.locationArea)

      const isCreatedByMe = Boolean(
        (session.createdBy && actorEmailNorm && session.createdBy.toLowerCase() === actorEmailNorm) ||
        (session.leadBadgeNumber && actorBadge && session.leadBadgeNumber === actorBadge) ||
        (session.leadEmployeeId && actorId && session.leadEmployeeId === actorId)
      )

      const isReceivedByArea = Boolean(
        !isCreatedByMe && (
          (session.siteId && actorSiteId && session.siteId === actorSiteId) ||
          (picInfo.picEmail.toLowerCase() === actorEmailNorm)
        )
      )

      const isAssigned = Boolean(
        (openCount > 0 || processedCount > 0) && (
          isReceivedByArea ||
          picInfo.picEmail.toLowerCase() === actorEmailNorm ||
          isCreatedByMe
        )
      )

      return {
        ...session,
        isLocked,
        progressPercent,
        isCreatedByMe,
        isReceivedByArea,
        isAssigned,
        ticketStatus,
        findingsSummary: {
          total: totalFindings,
          open: openCount,
          processed: processedCount,
          closed: closedCount,
          rejected: rejectedCount,
          substandard: substandardCount,
          standard: standardCount,
        },
        teamCount,
      }
    })

    const tabCounts = {
      created: sessionData.filter((s) => s.isCreatedByMe).length,
      received: sessionData.filter((s) => s.isReceivedByArea).length,
      assigned: sessionData.filter((s) => s.isAssigned).length,
      total: sessionData.length,
    }

    let filteredData = sessionData
    if (reportTab === 'created') {
      filteredData = sessionData.filter((s) => s.isCreatedByMe)
    } else if (reportTab === 'received') {
      filteredData = sessionData.filter((s) => s.isReceivedByArea)
    } else if (reportTab === 'assigned') {
      filteredData = sessionData.filter((s) => s.isAssigned)
    }

    if (status && status !== 'ALL') {
      const target = status.toUpperCase().replace('_', ' ')
      filteredData = filteredData.filter((s) => s.ticketStatus === target || s.status === status)
    }

    return { success: true, data: filteredData, tabCounts }
  } catch (error: any) {
    console.error('getHseOsmSessions error:', error)
    return { success: false, error: error?.message || 'Gagal mengambil data sesi OSM' }
  }
}

export async function getHseOsmSessionById(id: number) {
  try {
    const [session] = await db
      .select({
        id: heroHseOsmSessions.id,
        sessionNumber: heroHseOsmSessions.sessionNumber,
        siteId: heroHseOsmSessions.siteId,
        siteName: sites.name,
        inspectionDate: heroHseOsmSessions.inspectionDate,
        inspectionTime: heroHseOsmSessions.inspectionTime,
        locationArea: heroHseOsmSessions.locationArea,
        locationDetail: heroHseOsmSessions.locationDetail,
        latitude: heroHseOsmSessions.latitude,
        longitude: heroHseOsmSessions.longitude,
        gpsAccuracy: heroHseOsmSessions.gpsAccuracy,
        focusItemId: heroHseOsmSessions.focusItemId,
        focusItemName: heroHseOsmSessions.focusItemName,
        leadEmployeeId: heroHseOsmSessions.leadEmployeeId,
        leadEmployeeName: heroHseOsmSessions.leadEmployeeName,
        leadBadgeNumber: heroHseOsmSessions.leadBadgeNumber,
        leadDepartment: heroHseOsmSessions.leadDepartment,
        leadCompany: heroHseOsmSessions.leadCompany,
        leadRole: heroHseOsmSessions.leadRole,
        notes: heroHseOsmSessions.notes,
        status: heroHseOsmSessions.status,
        createdBy: heroHseOsmSessions.createdBy,
        createdAt: heroHseOsmSessions.createdAt,
      })
      .from(heroHseOsmSessions)
      .leftJoin(sites, eq(heroHseOsmSessions.siteId, sites.id))
      .where(and(eq(heroHseOsmSessions.id, id), isNull(heroHseOsmSessions.deletedAt)))
      .limit(1)

    if (!session) {
      return { success: false, error: 'Sesi OSM tidak ditemukan' }
    }

    const teamMembers = await db
      .select()
      .from(heroHseOsmTeamMembers)
      .where(eq(heroHseOsmTeamMembers.sessionId, id))
      .orderBy(heroHseOsmTeamMembers.id)

    const findings = await db
      .select({
        id: heroHseOsmFindings.id,
        sessionId: heroHseOsmFindings.sessionId,
        findingNumber: heroHseOsmFindings.findingNumber,
        findingDate: heroHseOsmFindings.findingDate,
        findingTime: heroHseOsmFindings.findingTime,
        classificationId: heroHseOsmFindings.classificationId,
        classificationName: heroHseOsmFindings.classificationName,
        description: heroHseOsmFindings.description,
        photoUrls: heroHseOsmFindings.photoUrls,
        riskLevel: heroHseOsmFindings.riskLevel,
        status: heroHseOsmFindings.status,
        actionRequired: heroHseOsmFindings.actionRequired,
        actionTaken: heroHseOsmFindings.actionTaken,
        actionPhotoUrls: heroHseOsmFindings.actionPhotoUrls,
        actionSubmittedAt: heroHseOsmFindings.actionSubmittedAt,
        actionSubmittedBy: heroHseOsmFindings.actionSubmittedBy,
        verifiedAt: heroHseOsmFindings.verifiedAt,
        verifiedBy: heroHseOsmFindings.verifiedBy,
        rejectionReason: heroHseOsmFindings.rejectionReason,
        dueDate: heroHseOsmFindings.dueDate,
        createdAt: heroHseOsmFindings.createdAt,
      })
      .from(heroHseOsmFindings)
      .where(
        and(
          eq(heroHseOsmFindings.sessionId, id),
          isNull(heroHseOsmFindings.deletedAt)
        )
      )
      .orderBy(heroHseOsmFindings.id)

    return {
      success: true,
      data: {
        ...session,
        isLocked: session.status === 'SUBMITTED' || session.status === 'COMPLETED',
        teamMembers,
        findings,
      },
    }
  } catch (error: any) {
    console.error('getHseOsmSessionById error:', error)
    return { success: false, error: error?.message || 'Gagal memuat detail sesi OSM' }
  }
}

export async function createHseOsmSession(input: CreateOsmSessionInput) {
  try {
    const actor = await getActorEmployee()
    const sessionNumber = await generateSessionNumber()

    const [newSession] = await db
      .insert(heroHseOsmSessions)
      .values({
        sessionNumber,
        siteId: input.siteId || actor?.employee?.siteId || null,
        inspectionDate: input.inspectionDate,
        inspectionTime: input.inspectionTime,
        locationArea: input.locationArea,
        locationDetail: input.locationDetail || '',
        latitude: input.latitude || '',
        longitude: input.longitude || '',
        gpsAccuracy: input.gpsAccuracy || '',
        focusItemId: input.focusItemId || null,
        focusItemName: input.focusItemName,
        leadEmployeeId: input.leadEmployeeId || actor?.employee?.id || null,
        leadEmployeeName: input.leadEmployeeName,
        leadBadgeNumber: input.leadBadgeNumber,
        leadDepartment: input.leadDepartment,
        leadCompany: input.leadCompany || 'PT Chitra Paratama',
        leadRole: input.leadRole || 'Inspector Lead',
        notes: input.notes || '',
        status: 'ACTIVE',
        createdBy: actor?.sessionUser?.email || null,
      })
      .returning()

    // Insert team members
    if (input.teamMembers && input.teamMembers.length > 0) {
      await db.insert(heroHseOsmTeamMembers).values(
        input.teamMembers.map((member) => ({
          sessionId: newSession.id,
          employeeId: member.employeeId || null,
          badgeNumber: member.badgeNumber,
          name: member.name,
          department: member.department,
          company: member.company || 'PT Chitra Paratama',
          isTeamLeader: !!member.isTeamLeader,
          isExternal: !!member.isExternal,
        }))
      )
    }

    // Insert initial findings if any
    if (input.findings && input.findings.length > 0) {
      for (const finding of input.findings) {
        const findingNumber = await generateFindingNumber()
        const isStandard = finding.condition === 'STANDARD' || finding.status === 'CLOSED'
        const findingStatus: HseOsmFindingStatus = isStandard ? 'CLOSED' : (finding.status || 'OPEN')
        const now = new Date()

        await db.insert(heroHseOsmFindings).values({
          sessionId: newSession.id,
          findingNumber,
          findingDate: input.inspectionDate,
          findingTime: input.inspectionTime,
          classificationId: finding.classificationId || null,
          classificationName: finding.classificationName,
          description: finding.description,
          photoUrls: finding.photoUrls || [],
          riskLevel: finding.riskLevel || 'MEDIUM',
          status: findingStatus,
          actionRequired: isStandard
            ? (finding.actionRequired || 'Good Condition / Sesuai Standar Keselamatan')
            : (finding.actionRequired || ''),
          actionTaken: isStandard
            ? (finding.actionTaken || 'Kondisi telah diperiksa dan dipastikan sesuai standar keselamatan (Standard / Close).')
            : (finding.actionTaken || ''),
          actionPhotoUrls: finding.actionPhotoUrls || [],
          actionSubmittedAt: isStandard ? now : null,
          actionSubmittedBy: isStandard
            ? (actor?.sessionUser?.name || actor?.employee?.name || input.leadEmployeeName || 'Inspector Lead')
            : null,
          verifiedAt: isStandard ? now : null,
          verifiedBy: isStandard
            ? (actor?.sessionUser?.name || actor?.employee?.name || input.leadEmployeeName || 'Inspector Lead')
            : null,
          dueDate: isStandard ? null : (finding.dueDate || null),
        })
      }
    }

    // Notify bell
    if (actor?.sessionUser?.email) {
      await notifyWorkflowBellRecipients({
        recipientEmails: [actor.sessionUser.email],
        eventType: 'HSE_OSM_SESSION_CREATED',
        category: 'hse_alerts',
        title: 'Sesi On the Spot Monitoring Dibuat',
        body: `Sesi OSM ${newSession.sessionNumber} di ${newSession.locationArea} telah berhasil dibuat.`,
        url: `/dashboard/hse/osm`,
      }).catch((e) => console.warn('Notification error:', e))
    }

    safeRevalidatePath('/dashboard/hse/osm')
    safeRevalidatePath('/mobile/hse/osm')
    safeRevalidatePath('/mobile/hse')

    return { success: true, data: newSession }
  } catch (error: any) {
    console.error('createHseOsmSession error:', error)
    return { success: false, error: error?.message || 'Gagal membuat sesi OSM' }
  }
}

export async function createHseOsmFinding(
  sessionId: number,
  input: {
    classificationId?: number | null
    classificationName: string
    description: string
    photoUrls?: string[]
    riskLevel?: HseOsmRiskLevel
    status?: HseOsmFindingStatus
    condition?: HseOsmFindingCondition
    actionRequired?: string
    actionTaken?: string
    dueDate?: string
  }
) {
  try {
    const actor = await getActorEmployee()
    const [session] = await db
      .select()
      .from(heroHseOsmSessions)
      .where(and(eq(heroHseOsmSessions.id, sessionId), isNull(heroHseOsmSessions.deletedAt)))
      .limit(1)

    if (!session) {
      return { success: false, error: 'Sesi OSM tidak ditemukan' }
    }

    if (session.status === 'SUBMITTED' || session.status === 'COMPLETED') {
      return { success: false, error: 'Laporan OSM telah disubmit dan terkunci. Tidak dapat menambah temuan baru.' }
    }

    const findingNumber = await generateFindingNumber()
    const now = new Date()
    const currentDate = now.toISOString().split('T')[0]
    const currentTime = now.toTimeString().slice(0, 5)

    const isStandard = input.condition === 'STANDARD' || input.status === 'CLOSED'
    const findingStatus: HseOsmFindingStatus = isStandard ? 'CLOSED' : (input.status || 'OPEN')
    const actionBy = actor?.sessionUser?.name || actor?.employee?.name || session.leadEmployeeName || 'Inspector'

    const [newFinding] = await db
      .insert(heroHseOsmFindings)
      .values({
        sessionId,
        findingNumber,
        findingDate: currentDate,
        findingTime: currentTime,
        classificationId: input.classificationId || null,
        classificationName: input.classificationName,
        description: input.description,
        photoUrls: input.photoUrls || [],
        riskLevel: input.riskLevel || 'MEDIUM',
        status: findingStatus,
        actionRequired: isStandard
          ? (input.actionRequired?.trim() || 'Good Condition / Sesuai Standar Keselamatan')
          : (input.actionRequired || ''),
        actionTaken: isStandard
          ? (input.actionTaken?.trim() || 'Kondisi telah diperiksa dan dipastikan sesuai standar keselamatan (Standard / Close).')
          : '',
        actionSubmittedAt: isStandard ? now : null,
        actionSubmittedBy: isStandard ? actionBy : null,
        verifiedAt: isStandard ? now : null,
        verifiedBy: isStandard ? actionBy : null,
        dueDate: isStandard ? null : (input.dueDate || null),
      })
      .returning()

    // Bell notification
    if (actor?.sessionUser?.email) {
      await notifyWorkflowBellRecipients({
        recipientEmails: [actor.sessionUser.email],
        eventType: 'HSE_OSM_FINDING_RECORDED',
        category: 'hse_alerts',
        title: isStandard ? 'Temuan Sesuai Standar OSM Tercatat' : 'Temuan Baru OSM Tercatat',
        body: `Tiket ${findingNumber} (${input.classificationName} - ${isStandard ? 'Standard / Close' : 'Substandard / Open'}) dicatat pada sesi ${session.sessionNumber}.`,
        url: `/dashboard/hse/osm`,
      }).catch(() => null)
    }

    safeRevalidatePath('/dashboard/hse/osm')
    safeRevalidatePath('/mobile/hse/osm')

    return { success: true, data: newFinding }
  } catch (error: any) {
    console.error('createHseOsmFinding error:', error)
    return { success: false, error: error?.message || 'Gagal membuat temuan baru' }
  }
}

export async function submitHseOsmAction(
  findingId: number,
  input: {
    actionTaken: string
    actionPhotoUrls: string[]
  }
) {
  try {
    const actor = await getActorEmployee()
    const [finding] = await db
      .select()
      .from(heroHseOsmFindings)
      .where(and(eq(heroHseOsmFindings.id, findingId), isNull(heroHseOsmFindings.deletedAt)))
      .limit(1)

    if (!finding) {
      return { success: false, error: 'Temuan tidak ditemukan' }
    }

    const [sessionRow] = await db.select({ status: heroHseOsmSessions.status }).from(heroHseOsmSessions).where(eq(heroHseOsmSessions.id, finding.sessionId)).limit(1)
    if (sessionRow?.status === 'SUBMITTED' || sessionRow?.status === 'COMPLETED') {
      return { success: false, error: 'Laporan OSM telah disubmit dan terkunci. Foto temuan tidak dapat diubah lagi.' }
    }

    if (finding.status !== 'OPEN') {
      return { success: false, error: 'Tindak lanjut hanya dapat dilakukan pada temuan yang berstatus OPEN.' }
    }

    const [updatedFinding] = await db
      .update(heroHseOsmFindings)
      .set({
        actionTaken: input.actionTaken,
        actionPhotoUrls: input.actionPhotoUrls || [],
        actionSubmittedAt: new Date(),
        actionSubmittedBy: actor?.employee?.name || actor?.sessionUser?.name || 'Inspector',
        status: 'PROCESSED',
        updatedAt: new Date(),
      })
      .where(eq(heroHseOsmFindings.id, findingId))
      .returning()

    safeRevalidatePath('/dashboard/hse/osm')
    safeRevalidatePath('/mobile/hse/osm')

    return { success: true, data: updatedFinding }
  } catch (error: any) {
    console.error('submitHseOsmAction error:', error)
    return { success: false, error: error?.message || 'Gagal menyimpan aksi perbaikan' }
  }
}

export async function verifyHseOsmFinding(
  findingId: number,
  input: {
    status: 'CLOSED' | 'REJECTED'
    rejectionReason?: string
  }
) {
  try {
    const actor = await getActorEmployee()
    const [finding] = await db
      .select()
      .from(heroHseOsmFindings)
      .where(and(eq(heroHseOsmFindings.id, findingId), isNull(heroHseOsmFindings.deletedAt)))
      .limit(1)

    if (!finding) {
      return { success: false, error: 'Temuan tidak ditemukan' }
    }

    const [updatedFinding] = await db
      .update(heroHseOsmFindings)
      .set({
        status: input.status,
        rejectionReason: input.status === 'REJECTED' ? input.rejectionReason || '' : '',
        verifiedAt: new Date(),
        verifiedBy: actor?.employee?.name || actor?.sessionUser?.name || 'HSE Coordinator',
        updatedAt: new Date(),
      })
      .where(eq(heroHseOsmFindings.id, findingId))
      .returning()

    safeRevalidatePath('/dashboard/hse/osm')
    safeRevalidatePath('/mobile/hse/osm')

    return { success: true, data: updatedFinding }
  } catch (error: any) {
    console.error('verifyHseOsmFinding error:', error)
    return { success: false, error: error?.message || 'Gagal memverifikasi temuan' }
  }
}

export async function deleteHseOsmSession(id: number) {
  try {
    const now = new Date()
    await db
      .update(heroHseOsmSessions)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(heroHseOsmSessions.id, id))

    await db
      .update(heroHseOsmFindings)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(heroHseOsmFindings.sessionId, id))

    safeRevalidatePath('/dashboard/hse/osm')
    safeRevalidatePath('/mobile/hse/osm')
    safeRevalidatePath('/mobile/hse')

    return { success: true }
  } catch (error: any) {
    console.error('deleteHseOsmSession error:', error)
    return { success: false, error: error?.message || 'Gagal menghapus sesi OSM' }
  }
}

export async function deleteHseOsmFinding(id: number) {
  try {
    const now = new Date()
    await db
      .update(heroHseOsmFindings)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(heroHseOsmFindings.id, id))

    safeRevalidatePath('/dashboard/hse/osm')
    safeRevalidatePath('/mobile/hse/osm')

    return { success: true }
  } catch (error: any) {
    console.error('deleteHseOsmFinding error:', error)
    return { success: false, error: error?.message || 'Gagal menghapus temuan' }
  }
}

export async function getHseEmployeesList() {
  try {
    const list = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        jobTitle: employees.jobTitle,
        departmentName: masterDepartments.name,
        sectionName: masterSections.name,
      })
      .from(employees)
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .where(eq(employees.employmentStatus, 'active'))
      .orderBy(employees.name)
      .limit(300)

    return { success: true, data: list }
  } catch (error: any) {
    console.error('getHseEmployeesList error:', error)
    return { success: false, error: error?.message || 'Gagal memuat daftar karyawan' }
  }
}

export async function syncHseOsmOfflineBatch(batchPayloads: CreateOsmSessionInput[]) {
  try {
    const results = []
    for (const item of batchPayloads) {
      const res = await createHseOsmSession(item)
      results.push(res)
    }

    return {
      success: true,
      syncedCount: results.filter((r) => r.success).length,
      totalCount: batchPayloads.length,
      results,
    }
  } catch (error: any) {
    console.error('syncHseOsmOfflineBatch error:', error)
    return { success: false, error: error?.message || 'Gagal sinkronisasi data offline OSM' }
  }
}

export async function updateHseOsmFindingPhotos(
  findingId: number,
  photoUrls: string[]
) {
  try {
    const [finding] = await db
      .select({ id: heroHseOsmFindings.id, sessionId: heroHseOsmFindings.sessionId })
      .from(heroHseOsmFindings)
      .where(and(eq(heroHseOsmFindings.id, findingId), isNull(heroHseOsmFindings.deletedAt)))
      .limit(1)

    if (!finding) {
      return { success: false, error: 'Temuan tidak ditemukan' }
    }

    const [updated] = await db
      .update(heroHseOsmFindings)
      .set({
        photoUrls: photoUrls || [],
        updatedAt: new Date(),
      })
      .where(eq(heroHseOsmFindings.id, findingId))
      .returning()

    safeRevalidatePath('/dashboard/hse/osm')
    safeRevalidatePath('/mobile/hse/osm')
    safeRevalidatePath(`/print/hse/osm/${finding.sessionId}`)

    return { success: true, data: updated }
  } catch (error: any) {
    console.error('updateHseOsmFindingPhotos error:', error)
    return { success: false, error: error?.message || 'Gagal memperbarui foto temuan' }
  }
}


export async function submitHseOsmSession(sessionId: number) {
  try {
    const actor = await getActorEmployee()
    const [session] = await db
      .select()
      .from(heroHseOsmSessions)
      .where(and(eq(heroHseOsmSessions.id, sessionId), isNull(heroHseOsmSessions.deletedAt)))
      .limit(1)

    if (!session) {
      return { success: false, error: 'Sesi OSM tidak ditemukan.' }
    }

    if (session.status === 'SUBMITTED' || session.status === 'COMPLETED') {
      return { success: false, error: 'Sesi OSM sudah pernah disubmit dan terkunci.' }
    }

    const findings = await db
      .select()
      .from(heroHseOsmFindings)
      .where(and(eq(heroHseOsmFindings.sessionId, sessionId), isNull(heroHseOsmFindings.deletedAt)))

    if (findings.length < 3) {
      return {
        success: false,
        error: `Minimal 3 hasil inspeksi baru agar dapat di-Submit (saat ini baru ${findings.length} temuan).`,
      }
    }

    const now = new Date()
    const [updatedSession] = await db
      .update(heroHseOsmSessions)
      .set({
        status: 'SUBMITTED',
        updatedAt: now,
      })
      .where(eq(heroHseOsmSessions.id, sessionId))
      .returning()

    // Kirim notifikasi email ke PIC Area & CC sesuai tingkat risiko (Slide 7 & 8)
    const emailResult = await sendHseOsmFindingNotifications(sessionId)

    // Notify bell
    if (actor?.sessionUser?.email) {
      await notifyWorkflowBellRecipients({
        recipientEmails: [actor.sessionUser.email],
        eventType: 'HSE_OSM_SESSION_SUBMITTED',
        category: 'hse_alerts',
        title: 'Laporan OSM Berhasil Disubmit',
        body: `Laporan OSM ${session.sessionNumber} (${session.locationArea}) berhasil disubmit dan terkunci dengan ${findings.length} temuan.`,
        url: '/mobile/hse/osm',
      }).catch(() => null)
    }

    safeRevalidatePath('/dashboard/hse/osm')
    safeRevalidatePath('/mobile/hse/osm')
    safeRevalidatePath('/mobile/hse')

    return { success: true, data: updatedSession, emailNotifications: emailResult }
  } catch (error: any) {
    console.error('submitHseOsmSession error:', error)
    return { success: false, error: error?.message || 'Gagal melakukan submit laporan OSM.' }
  }
}
