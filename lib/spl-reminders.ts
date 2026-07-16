import { and, eq, inArray, like } from 'drizzle-orm'
import { db } from '@/db'
import {
  employees,
  notificationEvents,
  overtimeCommandLetterParticipants,
  overtimeCommandLetters,
} from '@/db/schema/hero'
import { createNotificationEventForEmployee, sendPushNotification } from '@/lib/push-notifications'
import { sendWorkflowEmail } from '@/lib/workflow-email'

function makassarDateKey(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

function daysAfterWorkDate(workDate: Date, referenceDate: Date) {
  const start = Date.parse(`${makassarDateKey(workDate)}T00:00:00+08:00`)
  const end = Date.parse(`${makassarDateKey(referenceDate)}T00:00:00+08:00`)
  return Math.floor((end - start) / 86_400_000)
}

export async function runSplEvidenceReminderTick(referenceDate = new Date()) {
  const rows = await db
    .select({
      participantId: overtimeCommandLetterParticipants.id,
      employeeId: overtimeCommandLetterParticipants.employeeId,
      employeeName: employees.name,
      employeeEmail: employees.email,
      splNumber: overtimeCommandLetters.splNumber,
      workDate: overtimeCommandLetters.workDate,
    })
    .from(overtimeCommandLetterParticipants)
    .innerJoin(
      overtimeCommandLetters,
      eq(overtimeCommandLetterParticipants.overtimeCommandLetterId, overtimeCommandLetters.id)
    )
    .innerJoin(employees, eq(overtimeCommandLetterParticipants.employeeId, employees.id))
    .where(
      and(
        inArray(overtimeCommandLetters.status, ['approved', 'closed']),
        eq(overtimeCommandLetterParticipants.evidenceStatus, 'pending')
      )
    )

  let remindersExecuted = 0
  for (const row of rows) {
    const age = daysAfterWorkDate(row.workDate, referenceDate)
    if (age !== 1 && age !== 2) continue

    const eventType = `spl_evidence_reminder_h${age}`
    const [existing] = await db
      .select({ id: notificationEvents.id })
      .from(notificationEvents)
      .where(
        and(
          eq(notificationEvents.eventType, eventType),
          eq(notificationEvents.recipient, row.employeeEmail),
          like(notificationEvents.payloadSnapshot, `%${row.splNumber}%`)
        )
      )
      .limit(1)
    if (existing) continue

    const title = `Evidence ${row.splNumber} belum lengkap`
    const body = `H+${age}: lengkapi clock-in/out, aktivitas selesai, dan minimal satu foto.`
    const url = '/mobile/overtime?tab=active'
    const event = await createNotificationEventForEmployee({
      employeeId: row.employeeId,
      eventType,
      category: 'shift_reminders',
      title,
      body,
      url,
      createdAt: referenceDate,
    })

    await Promise.allSettled([
      sendPushNotification({
        employeeId: row.employeeId,
        category: 'shift_reminders',
        title,
        body,
        url,
        notificationEventId: event?.id,
      }),
      sendWorkflowEmail({
        to: row.employeeEmail,
        templateCode: 'spl_evidence_reminder',
        templateName: 'SPL Evidence Reminder',
        variables: {
          splNumber: row.splNumber,
          employeeName: row.employeeName,
          deadline: 'H+2 pukul 23:59 Asia/Makassar',
        },
        fallbackSubject: title,
        fallbackText: body,
      }),
    ])
    remindersExecuted += 1
  }

  return remindersExecuted
}
