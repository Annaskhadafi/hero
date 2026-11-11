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
import { and, desc, eq, gte, ilike, inArray, isNull, lte, or, sql } from 'drizzle-orm'
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
  employeeName?: string | null
  workDate: string // YYYY-MM-DD
  plannedStartTime?: string // HH:mm
  plannedEndTime?: string // HH:mm
  title?: string
  requestNotes?: string
  executionNotes?: string
  siteId?: number | null
  shiftCode?: string | null
  isOffDay?: boolean
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
    let targetEmp: {
      id: number
      name: string
      email: string | null
      employeeSn: string | null
      jobTitle: string | null
      role: string | null
      siteId: number | null
      departmentId: number | null
      sectionId: number | null
      positionId: number | null
      signatureDataUrl: string | null
      directManagerId: number | null
    } | null = null

    const empSelectCols = {
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
    }

    if (input.employeeDbId && Number.isFinite(input.employeeDbId) && input.employeeDbId > 0) {
      const [found] = await db
        .select(empSelectCols)
        .from(employees)
        .where(eq(employees.id, input.employeeDbId))
        .limit(1)
      if (found) targetEmp = found
    }

    if (!targetEmp && input.employeeSn && input.employeeSn.trim()) {
      const [found] = await db
        .select(empSelectCols)
        .from(employees)
        .where(eq(employees.employeeSn, input.employeeSn.trim()))
        .limit(1)
      if (found) targetEmp = found
    }

    if (!targetEmp && input.employeeName && input.employeeName.trim()) {
      const [found] = await db
        .select(empSelectCols)
        .from(employees)
        .where(ilike(employees.name, `%${input.employeeName.trim()}%`))
        .limit(1)
      if (found) targetEmp = found
    }

    if (!targetEmp && currentEmp) {
      const [found] = await db
        .select(empSelectCols)
        .from(employees)
        .where(eq(employees.id, currentEmp.id))
        .limit(1)
      if (found) targetEmp = found
    }

    if (!targetEmp) {
      return { success: false, error: 'Data karyawan lembur tidak ditemukan.' }
    }

    // 3. Operational Site ID
    const effectiveSiteId = input.siteId || targetEmp.siteId || currentEmp?.siteId || 1

    // 4. Parse Dates & Start/End Times with consistent Indonesian timezone (+07:00 / site local)
    const workDateStr = (input.workDate || '').trim().split('T')[0] || new Date().toISOString().split('T')[0]
    const parsedWorkDate = new Date(`${workDateStr}T00:00:00+07:00`)

    const startTimeStr = (input.plannedStartTime || '17:00').trim()
    const endTimeStr = (input.plannedEndTime || '21:00').trim()

    const cleanStart = startTimeStr.length === 5 ? `${startTimeStr}:00` : startTimeStr
    const cleanEnd = endTimeStr.length === 5 ? `${endTimeStr}:00` : endTimeStr

    if (cleanStart === cleanEnd) {
      return { success: false, error: 'Jam mulai dan jam selesai lembur tidak boleh sama.' }
    }

    const plannedStartAt = new Date(`${workDateStr}T${cleanStart}+07:00`)
    let plannedEndAt = new Date(`${workDateStr}T${cleanEnd}+07:00`)

    // Cross-midnight handling: if end time is strictly earlier than start time, advance by 24h
    if (plannedEndAt < plannedStartAt) {
      plannedEndAt = new Date(plannedEndAt.getTime() + 24 * 60 * 60 * 1000)
    }

    const durationMinutes = Math.max(
      30,
      Math.round((plannedEndAt.getTime() - plannedStartAt.getTime()) / (1000 * 60))
    )

    // 5. Title & Notes
    const title = input.title?.trim() || `Penugasan Lembur - ${targetEmp.name} (${workDateStr})`
    const requestNotes = input.requestNotes?.trim() || `Pengajuan lembur otomatis terintegrasi dari Daily Activity Report tanggal ${workDateStr}.`
    const executionNotes = input.executionNotes?.trim() || 'Semua prosedur keselamatan kerja (JSA & SOP) telah dipatuhi.'

    // 6. Generate Guaranteed Unique SPL Number & Insert with collision retry
    const year = parsedWorkDate.getFullYear() || new Date().getFullYear()
    const prefix = `SPL-${year}-`
    const requesterEmployeeId = targetEmp.id

    let insertedSpl: typeof overtimeCommandLetters.$inferSelect | null = null

    for (let attempt = 0; attempt < 5; attempt++) {
      const [last] = await db
        .select({ id: overtimeCommandLetters.id })
        .from(overtimeCommandLetters)
        .orderBy(desc(overtimeCommandLetters.id))
        .limit(1)

      let seq = (last?.id || 0) + 1 + attempt
      let nextNumber = `${prefix}${String(seq).padStart(4, '0')}`

      while (true) {
        const [existing] = await db
          .select({ id: overtimeCommandLetters.id })
          .from(overtimeCommandLetters)
          .where(eq(overtimeCommandLetters.splNumber, nextNumber))
          .limit(1)
        if (!existing) break
        seq++
        nextNumber = `${prefix}${String(seq).padStart(4, '0')}`
      }

      try {
        const [spl] = await db
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
        insertedSpl = spl
        break
      } catch (insertErr: any) {
        if (insertErr?.code === '23505' && attempt < 4) {
          continue
        }
        throw insertErr
      }
    }

    if (!insertedSpl) {
      return { success: false, error: 'Gagal membuat nomor SPL unik.' }
    }

    // 8. Insert Participant with exact credited overtime minutes
    const participantCategory = input.isOffDay ? 'off_day' : 'after_mandatory_ot'
    await db.insert(overtimeCommandLetterParticipants).values({
      overtimeCommandLetterId: insertedSpl.id,
      employeeId: targetEmp.id,
      shiftCode: (input.shiftCode || 'DS').toUpperCase(),
      rosterType: '5:2',
      category: participantCategory,
      overtimeCreditMinutes: durationMinutes,
      createdAt: new Date(),
    })

    // 9. Insert Line Items from Daily Activity with full metadata payload for overtime module
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
          if (mins < 0) mins += 24 * 60
          diffMinutes = mins > 0 ? mins : 30
        }
      }

      const metaPayload = {
        code: '',
        name: t.label || 'Pekerjaan Lembur Operasional',
        unitNumber: t.unitNumber || '-',
        tireCount: 1,
        materialUsed: '',
        startTime: t.startedAt && t.startedAt !== '-' ? t.startedAt : startTimeStr,
        endTime: t.endedAt && t.endedAt !== '-' ? t.endedAt : endTimeStr,
        duration: String(diffMinutes),
        remark: t.remarks || `Pekerjaan lembur lapangan: ${t.label}`,
        photos: t.photos || (t.photoUrl ? [t.photoUrl] : []),
        photoUrl: t.photoUrl || (t.photos && t.photos[0]) || null,
      }

      await db.insert(overtimeCommandLetterItems).values({
        overtimeCommandLetterId: insertedSpl.id,
        assignedEmployeeId: targetEmp.id,
        lineLabel: t.label || 'Pekerjaan Lembur Operasional',
        lineDescription: JSON.stringify(metaPayload),
        targetUnit: t.unitNumber || '-',
        estimatedMinutes: diffMinutes,
        plannedPoints: t.points || 10,
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

