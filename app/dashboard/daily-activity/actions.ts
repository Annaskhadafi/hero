'use server'

import { db } from '@/db'
import { activities, dailyActivitySessions, employees } from '@/db/schema/hero'
import { and, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { getServerSession } from '@/lib/auth-session'
import { canAccessDailyActivityMonitoring, isSuperAdminRole } from '@/lib/hero-access'
import { revalidatePath } from 'next/cache'

export async function deleteDailyActivityRecordAction(input: {
  sessionId?: number | null
  sessionIds?: number[]
  activityIds?: number[]
  employeeDbId?: number | null
  workDate?: string | null
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return { success: false, error: 'Sesi login tidak valid atau kadaluarsa.' }
    }

    const sessionRole = (session.user as { role?: string }).role || null

    // Get current employee id and accessRole for permission and deletedByEmployeeId audit tracking
    const userConds = []
    if (session.user.id) userConds.push(eq(employees.authUserId, session.user.id))
    if (session.user.email) userConds.push(sql`lower(${employees.email}) = lower(${session.user.email})`)
    const [currentEmp] = await db
      .select({ id: employees.id, accessRole: employees.accessRole })
      .from(employees)
      .where(userConds.length > 1 ? or(...userConds) : userConds[0])
      .limit(1)

    // Rule: Hanya Super Admin yang berhak menghapus aktivitas
    const isSuperAdmin = isSuperAdminRole(sessionRole) || isSuperAdminRole(currentEmp?.accessRole)
    if (!isSuperAdmin) {
      return { success: false, error: 'Hanya Super Admin yang memiliki hak akses untuk menghapus data aktivitas.' }
    }

    const operatorEmployeeId = currentEmp?.id ?? null
    const now = new Date()

    // Collect all session IDs to delete
    const targetSessionIds = new Set<number>()
    if (input.sessionId && Number.isFinite(input.sessionId) && input.sessionId > 0) {
      targetSessionIds.add(input.sessionId)
    }
    if (Array.isArray(input.sessionIds)) {
      for (const id of input.sessionIds) {
        if (Number.isFinite(id) && id > 0) targetSessionIds.add(id)
      }
    }

    const sessionIdsList = Array.from(targetSessionIds)

    // 1. Soft-delete target sessions
    if (sessionIdsList.length > 0) {
      // Find any linked activities from sessions
      const linked = await db
        .select({ activityId: dailyActivitySessions.activityId })
        .from(dailyActivitySessions)
        .where(inArray(dailyActivitySessions.id, sessionIdsList))

      const linkedActIds = linked
        .map((r) => r.activityId)
        .filter((id): id is number => typeof id === 'number' && Number.isFinite(id) && id > 0)

      if (linkedActIds.length > 0) {
        await db
          .update(activities)
          .set({
            deletedAt: now,
            deletedByEmployeeId: operatorEmployeeId,
          })
          .where(inArray(activities.id, linkedActIds))
      }

      await db
        .update(dailyActivitySessions)
        .set({
          deletedAt: now,
          deletedByEmployeeId: operatorEmployeeId,
        })
        .where(inArray(dailyActivitySessions.id, sessionIdsList))
    }

    // 2. Soft-delete specific activity IDs if passed
    if (Array.isArray(input.activityIds) && input.activityIds.length > 0) {
      const validActIds = input.activityIds.filter((id) => Number.isFinite(id) && id > 0)
      if (validActIds.length > 0) {
        await db
          .update(activities)
          .set({
            deletedAt: now,
            deletedByEmployeeId: operatorEmployeeId,
          })
          .where(inArray(activities.id, validActIds))
      }
    }

    // 3. Also soft-delete any unlinked activities for this employee on this date if employeeDbId & workDate provided
    if (input.employeeDbId && input.workDate) {
      const parsedDate = new Date(input.workDate)
      if (!isNaN(parsedDate.getTime())) {
        const dayStart = new Date(parsedDate)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(parsedDate)
        dayEnd.setHours(23, 59, 59, 999)

        await db
          .update(activities)
          .set({
            deletedAt: now,
            deletedByEmployeeId: operatorEmployeeId,
          })
          .where(
            and(
              eq(activities.employeeId, input.employeeDbId),
              isNull(activities.deletedAt),
              or(
                and(gte(activities.startTime, dayStart), lte(activities.startTime, dayEnd)),
                and(gte(activities.submissionTime, dayStart), lte(activities.submissionTime, dayEnd))
              )
            )
          )
      }
    }

    revalidatePath('/dashboard/daily-activity')
    revalidatePath('/dashboard/activity-hub/my-day')
    revalidatePath('/dashboard/activity-hub/approval')
    revalidatePath('/dashboard/approval')

    return { success: true }
  } catch (error: any) {
    console.error('[deleteDailyActivityRecordAction] error:', error)
    return { success: false, error: error.message || 'Gagal menghapus data aktivitas.' }
  }
}
