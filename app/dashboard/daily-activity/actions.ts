'use server'

import { db } from '@/db'
import {
  activities,
  dailyActivitySessions,
  employees,
  overtimeCommandLetters,
  overtimeCommandLetterParticipants,
  overtimeCommandLetterItems,
} from '@/db/schema/hero'
import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import { getServerSession } from '@/lib/auth-session'
import { canAccessDailyActivityMonitoring, isSuperAdminRole } from '@/lib/hero-access'
import { revalidatePath } from 'next/cache'
import { ensureOvertimeApprovalsExist } from '@/app/dashboard/overtime-requests/actions'

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

export async function getEmployeeEwhAnalyticsAction(
  employeeDbId: number,
  startDate?: string,
  endDate?: string
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return { success: false, error: 'Sesi login tidak valid atau kadaluarsa.' }
    }

    const { getEmployeeEwhAnalytics } = await import('@/lib/employee-ewh-analytics')
    const data = await getEmployeeEwhAnalytics(employeeDbId, startDate, endDate)
    if (!data) {
      return { success: false, error: 'Data karyawan tidak ditemukan.' }
    }

    return { success: true, data }
  } catch (error: any) {
    console.error('[getEmployeeEwhAnalyticsAction] error:', error)
    return { success: false, error: error.message || 'Gagal memuat analitik EWH karyawan.' }
  }
}

export interface CreateSplFromDailyActivityInput {
  employeeDbId?: number | null
  employeeSn?: string | null
  workDate: string // YYYY-MM-DD
  plannedStartTime?: string // HH:mm
  plannedEndTime?: string // HH:mm
  title?: string
  requestNotes?: string
  executionNotes?: string
  siteId?: number | null
  shiftCode?: string | null
  tasks?: Array<{
    label: string
    unitNumber?: string
    startedAt?: string
    endedAt?: string
    points?: number
    remarks?: string
    photoUrl?: string | null
    photos?: string[]
  }>
}

export async function createSplFromDailyActivityAction(
  input: CreateSplFromDailyActivityInput
): Promise<{ success: boolean; splId?: number; splNumber?: string; error?: string; message?: string }> {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return { success: false, error: 'Sesi login tidak valid atau kadaluarsa.' }
    }

    // 1. Operator / Creator employee
    const userConds = []
    if (session.user.id) userConds.push(eq(employees.authUserId, session.user.id))
    if (session.user.email) userConds.push(sql`lower(${employees.email}) = lower(${session.user.email})`)

    const [currentEmp] = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        jobTitle: employees.jobTitle,
        accessRole: employees.accessRole,
        siteId: employees.siteId,
        departmentId: employees.departmentId,
      })
      .from(employees)
      .where(userConds.length > 1 ? or(...userConds) : userConds[0])
      .limit(1)

    // 2. Target worker employee (the person doing the overtime work)
    const targetConds = []
    if (input.employeeDbId && Number.isFinite(input.employeeDbId) && input.employeeDbId > 0) {
      targetConds.push(eq(employees.id, input.employeeDbId))
    }
    if (input.employeeSn && input.employeeSn.trim()) {
      targetConds.push(eq(employees.employeeSn, input.employeeSn.trim()))
    }
    if (targetConds.length === 0 && currentEmp) {
      targetConds.push(eq(employees.id, currentEmp.id))
    }

    const [targetEmp] = targetConds.length > 0
      ? await db
          .select({
            id: employees.id,
            name: employees.name,
            email: employees.email,
            employeeSn: employees.employeeSn,
            jobTitle: employees.jobTitle,
            role: employees.role,
            siteId: employees.siteId,
            departmentId: employees.departmentId,
            sectionId: employees.sectionId,
            positionId: employees.positionId,
            signatureDataUrl: employees.signatureDataUrl,
            directManagerId: employees.directManagerId,
          })
          .from(employees)
          .where(targetConds.length > 1 ? or(...targetConds) : targetConds[0])
          .limit(1)
      : []

    if (!targetEmp) {
      return { success: false, error: 'Data karyawan lembur tidak ditemukan.' }
    }

    // 3. Operational Site ID
    const effectiveSiteId = input.siteId || targetEmp.siteId || currentEmp?.siteId || 1

    // 4. Parse Dates & Start/End Times
    const workDateStr = (input.workDate || '').trim().split('T')[0] || new Date().toISOString().split('T')[0]
    const parsedWorkDate = new Date(`${workDateStr}T00:00:00.000Z`)

    const startTimeStr = input.plannedStartTime || '17:00'
    const endTimeStr = input.plannedEndTime || '21:00'

    const [sH = 17, sM = 0] = startTimeStr.split(':').map((v) => parseInt(v, 10))
    const [eH = 21, eM = 0] = endTimeStr.split(':').map((v) => parseInt(v, 10))

    const plannedStartAt = new Date(`${workDateStr}T00:00:00.000Z`)
    plannedStartAt.setUTCHours(sH, sM, 0, 0)

    const plannedEndAt = new Date(`${workDateStr}T00:00:00.000Z`)
    plannedEndAt.setUTCHours(eH, eM, 0, 0)

    // Cross-midnight handling: if end time is earlier or equal to start time, add 1 day
    if (plannedEndAt <= plannedStartAt) {
      plannedEndAt.setUTCDate(plannedEndAt.getUTCDate() + 1)
    }

    // 5. Title & Notes
    const title = input.title?.trim() || `Penugasan Lembur - ${targetEmp.name} (${workDateStr})`
    const requestNotes = input.requestNotes?.trim() || `Pengajuan lembur otomatis terintegrasi dari Daily Activity Report tanggal ${workDateStr}.`
    const executionNotes = input.executionNotes?.trim() || 'Semua prosedur keselamatan kerja (JSA & SOP) telah dipatuhi.'

    // 6. Generate SPL Number
    const year = parsedWorkDate.getUTCFullYear()
    const prefix = `SPL-${year}-`
    const [last] = await db
      .select({ id: overtimeCommandLetters.id })
      .from(overtimeCommandLetters)
      .orderBy(desc(overtimeCommandLetters.id))
      .limit(1)

    const nextNumber = `${prefix}${String((last?.id || 0) + 1).padStart(4, '0')}`

    const requesterEmployeeId = currentEmp?.id || targetEmp.id

    // 7. Insert Overtime Command Letter
    const [insertedSpl] = await db
      .insert(overtimeCommandLetters)
      .values({
        splNumber: nextNumber,
        siteId: effectiveSiteId,
        departmentId: targetEmp.departmentId,
        sectionId: targetEmp.sectionId,
        positionId: targetEmp.positionId,
        title,
        workDate: parsedWorkDate,
        plannedStartAt,
        plannedEndAt,
        status: 'Submitted',
        requestNotes,
        executionNotes,
        requestedByEmployeeId: requesterEmployeeId,
        origin: 'daily_activity',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    // 8. Insert Participant
    await db.insert(overtimeCommandLetterParticipants).values({
      overtimeCommandLetterId: insertedSpl.id,
      employeeId: targetEmp.id,
      shiftCode: (input.shiftCode || 'DS').toUpperCase(),
      rosterType: '5:2',
      category: 'after_mandatory_ot',
      createdAt: new Date(),
    })

    // 9. Insert Line Items from Daily Activity
    const rawTasks = input.tasks && input.tasks.length > 0 ? input.tasks : []
    const tasksToInsert = rawTasks.length > 0
      ? rawTasks
      : [{
          label: 'Pekerjaan Lembur Operasional',
          unitNumber: '-',
          startedAt: startTimeStr,
          endedAt: endTimeStr,
          points: 10,
          remarks: 'Pekerjaan lembur operasional lapangan berdasarkan Daily Activity Report.',
        }]

    for (let i = 0; i < tasksToInsert.length; i++) {
      const t = tasksToInsert[i]
      let diffMinutes = 60
      if (t.startedAt && t.endedAt && t.startedAt !== '-' && t.endedAt !== '-') {
        const [sh, sm] = t.startedAt.split(':').map((v) => parseInt(v, 10))
        const [eh, em] = t.endedAt.split(':').map((v) => parseInt(v, 10))
        if (!isNaN(sh) && !isNaN(eh)) {
          let mins = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0))
          if (mins <= 0) mins += 24 * 60
          diffMinutes = mins
        }
      }

      await db.insert(overtimeCommandLetterItems).values({
        overtimeCommandLetterId: insertedSpl.id,
        lineLabel: t.label || 'Pekerjaan Lembur Operasional',
        lineDescription: t.remarks || `Pekerjaan lembur lapangan: ${t.label}`,
        targetUnit: t.unitNumber || '-',
        estimatedMinutes: diffMinutes,
        plannedPoints: t.points || 10,
        photoUrl: t.photoUrl || (t.photos && t.photos[0]) || null,
        sortOrder: i + 1,
        createdAt: new Date(),
      })
    }

    // 10. Multi-tier Approval Setup (Leader / PJO workflow)
    await ensureOvertimeApprovalsExist(insertedSpl.id)

    // 11. Revalidation
    revalidatePath('/dashboard/daily-activity')
    revalidatePath('/dashboard/overtime-requests')
    revalidatePath('/dashboard/activity-hub')
    revalidatePath('/dashboard/approval')

    return {
      success: true,
      splId: insertedSpl.id,
      splNumber: insertedSpl.splNumber,
      message: `Surat Perintah Lembur ${insertedSpl.splNumber} berhasil diterbitkan!`,
    }
  } catch (error: any) {
    console.error('[createSplFromDailyActivityAction] error:', error)
    return {
      success: false,
      error: error.message || 'Gagal membuat Surat Perintah Lembur dari Daily Activity.',
    }
  }
}

