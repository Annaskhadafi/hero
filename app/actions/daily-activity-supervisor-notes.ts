'use server'

import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { dailyActivitySupervisorNotes } from '@/db/schema/daily-activity-supervisor-notes'
import { dailyActivitySessionItems, dailyActivitySessions, employees, hrPositions, navbarMenuItems, roleMenuPermissions, securityRoles } from '@/db/schema/hero'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getMenuPermissionForRole, isSuperAdminRole } from '@/lib/hero-access'
import { resolveSupervisorNoteAccess } from '@/lib/daily-activity-supervisor-note-access'
import { createNotificationEventForEmployee } from '@/lib/push-notifications'

async function accessForItems(itemIds: number[]) {
  const employee = await getCurrentEmployee()
  if (!employee?.isActive || !employee.accessRole) return null
  const role = employee.accessRole
  const activities = await db.select({
    sessionId: dailyActivitySessions.id,
    itemId: dailyActivitySessionItems.id,
    ownerId: dailyActivitySessions.employeeId,
    siteId: dailyActivitySessions.siteId,
  }).from(dailyActivitySessions)
    .innerJoin(dailyActivitySessionItems, eq(dailyActivitySessionItems.sessionId, dailyActivitySessions.id))
    .where(and(inArray(dailyActivitySessionItems.id, itemIds), isNull(dailyActivitySessions.deletedAt)))
  if (!activities.length) return null
  // The monitoring helper grants legacy global access; notes use the stored matrix.
  const [permissions, positions, myDay] = await Promise.all([
    isSuperAdminRole(role) ? [{ canView: true, canEdit: true, dataScope: 'global' }] : db.select({
      canView: roleMenuPermissions.canView,
      canEdit: roleMenuPermissions.canEdit,
      dataScope: roleMenuPermissions.dataScope,
    }).from(roleMenuPermissions)
      .innerJoin(securityRoles, eq(roleMenuPermissions.roleId, securityRoles.id))
      .innerJoin(navbarMenuItems, eq(roleMenuPermissions.menuItemId, navbarMenuItems.id))
      .where(and(sql`lower(${securityRoles.name}) = lower(${role})`, eq(navbarMenuItems.resource, 'daily_activity')))
      .limit(1),
    employee.positionId == null ? [] : db.select({ isActive: hrPositions.isActive, levelName: hrPositions.levelName, isManagerial: hrPositions.isManagerial })
      .from(hrPositions).where(eq(hrPositions.id, employee.positionId)).limit(1),
    activities.some((activity) => activity.ownerId === employee.id) ? getMenuPermissionForRole(role, 'tire_service') : null,
  ])
  const permission = permissions[0]
  return activities.map((activity) => ({ employee, activity, ...resolveSupervisorNoteAccess({
      employeeId: employee.id, employeeSiteId: employee.siteId, ownerId: activity.ownerId,
      activitySiteId: activity.siteId, myDayCanView: myDay?.canView === true,
      dashboardPermission: permission?.dataScope ? { ...permission, dataScope: permission.dataScope } : null,
      position: positions[0] ?? null,
    }) }))
}

async function access(sessionId: number, itemId: number) {
  const contexts = await accessForItems([itemId])
  return contexts?.find(({ activity }) => activity.sessionId === sessionId)
}

export async function getDailyActivitySupervisorNoteSummaries(itemIds: number[]) {
  if (!Array.isArray(itemIds) || !itemIds.length || itemIds.length > 250 ||
      itemIds.some((id) => !Number.isSafeInteger(id) || id <= 0 || id > 2147483647)) return []
  const contexts = (await accessForItems(itemIds))?.filter((context) => context.canRead) ?? []
  if (!contexts.length) return []
  const notes = await db.selectDistinctOn([dailyActivitySupervisorNotes.itemId], {
    itemId: dailyActivitySupervisorNotes.itemId,
    latest: dailyActivitySupervisorNotes.note,
    count: sql<number>`count(*) over (partition by ${dailyActivitySupervisorNotes.itemId})`.mapWith(Number),
  }).from(dailyActivitySupervisorNotes)
    .where(inArray(dailyActivitySupervisorNotes.itemId, contexts.map(({ activity }) => activity.itemId)))
    .orderBy(dailyActivitySupervisorNotes.itemId, desc(dailyActivitySupervisorNotes.createdAt), desc(dailyActivitySupervisorNotes.id))
  const byItem = new Map(notes.map((note) => [note.itemId, note]))
  return contexts.map(({ activity, canWrite }) => ({
    itemId: activity.itemId, sessionId: activity.sessionId, canWrite,
    latest: byItem.get(activity.itemId)?.latest ?? null,
    count: byItem.get(activity.itemId)?.count ?? 0,
  }))
}

export async function addDailyActivitySupervisorNote(sessionId: number, itemId: number, rawNote: string) {
  const note = typeof rawNote === 'string' ? rawNote.trim() : ''
  if (!Number.isSafeInteger(sessionId) || !Number.isSafeInteger(itemId) || !note || note.length > 1000) return { ok: false as const }
  const context = await access(sessionId, itemId)
  if (!context?.canWrite) return { ok: false as const }
  const [created] = await db.insert(dailyActivitySupervisorNotes).values({ sessionId, itemId, authorEmployeeId: context.employee.id, note }).returning({ id: dailyActivitySupervisorNotes.id, createdAt: dailyActivitySupervisorNotes.createdAt })
  try {
    await createNotificationEventForEmployee({ employeeId: context.activity.ownerId, eventType: 'daily_activity_supervisor_note', category: 'info', title: 'Catatan Atasan Baru', body: 'Atasan menambahkan catatan pada aktivitas Anda.', url: `/dashboard/activity-hub/my-day?noteSessionId=${sessionId}&noteItemId=${itemId}` })
  } catch (error) { console.error('Daily Activity note notification failed', error) }
  return { ok: true as const, note: { ...created, authorName: context.employee.name, note } }
}

export async function getDailyActivitySupervisorNotes(sessionId: number, itemId: number) {
  if (!Number.isSafeInteger(sessionId) || !Number.isSafeInteger(itemId)) return { ok: false as const, notes: [] }
  const context = await access(sessionId, itemId)
  if (!context?.canRead) return { ok: false as const, notes: [] }
  const notes = await db.select({ id: dailyActivitySupervisorNotes.id, note: dailyActivitySupervisorNotes.note, createdAt: dailyActivitySupervisorNotes.createdAt, authorName: employees.name })
    .from(dailyActivitySupervisorNotes).innerJoin(employees, eq(employees.id, dailyActivitySupervisorNotes.authorEmployeeId))
    .where(and(eq(dailyActivitySupervisorNotes.sessionId, sessionId), eq(dailyActivitySupervisorNotes.itemId, itemId)))
    .orderBy(asc(dailyActivitySupervisorNotes.createdAt))
  return { ok: true as const, notes, canWrite: context.canWrite }
}
