import { and, desc, eq, gte, inArray, lte, or, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { db } from '@/db'
import {
  employees,
  masterDepartments,
  masterSections,
  overtimeApprovals,
  overtimeCommandLetterItems,
  overtimeCommandLetterParticipants,
  overtimeCommandLetters,
  sites,
} from '@/db/schema/hero'
import { getSiteAttendanceClockConfig } from '@/lib/timesheet/site-attendance-punctuality'
import { checkEmployeeOffDayStatus } from '@/lib/timesheet/attendance-punctuality'
import { getOvertimeWorkflowSettings } from '@/app/dashboard/overtime-requests/actions'
import { sendOvertimeStepApprovalEmail } from '@/lib/activity-overtime-workflow-email'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'

/**
 * Checks whether an employee's checkout is past scheduled shift hours or on an off-day,
 * and if so, automatically generates an SPL with Step 1 auto-approved and routes it to Step 2 (Leader/PJO).
 */
export async function checkAndAutoGenerateSplOnCheckout(params: {
  employeeId: number
  siteId: number
  eventTime: Date
  shiftCode?: string
  overtimeMinutes?: number
}): Promise<{ generated: boolean; splId?: number; reason?: string }> {
  const { employeeId, siteId, eventTime, shiftCode = 'day', overtimeMinutes = 0 } = params

  try {
    const [emp] = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        jobTitle: employees.jobTitle,
        role: employees.role,
        signatureDataUrl: employees.signatureDataUrl,
        siteId: employees.siteId,
        departmentId: employees.departmentId,
        sectionId: employees.sectionId,
        positionId: employees.positionId,
        department: employees.department,
        section: employees.section,
        directManagerId: employees.directManagerId,
      })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1)

    if (!emp) {
      return { generated: false, reason: 'Employee not found' }
    }

    const effectiveSiteId = siteId || emp.siteId || 1
    const siteConfig = await getSiteAttendanceClockConfig(effectiveSiteId)

    // Check off-day status
    const offDayCheck = checkEmployeeOffDayStatus({
      eventTime,
      role: emp.role || emp.jobTitle,
      scheduleType: siteConfig.scheduleType,
      rosterType: siteConfig.rosterType,
      timeZone: siteConfig.timezone,
    })

    // Calculate shift end time
    const isNight = ['ns', 'night', 'malam', 'shift malam', '2', 's2'].includes(
      String(shiftCode).toLowerCase().trim()
    )

    // Standard shift end time
    // Day shift standard end: 17:00 (or 9 hours after clock in)
    // Night shift standard end: 05:00 / 06:00
    const checkoutHours = eventTime.getHours()
    const checkoutMinutes = eventTime.getMinutes()
    const checkoutTotalMin = checkoutHours * 60 + checkoutMinutes

    let isPastWorkingHours = false
    let plannedStartHour = 17
    let plannedStartMin = 0

    if (offDayCheck.isOffDay) {
      // Any work on off day is overtime
      isPastWorkingHours = true
      plannedStartHour = Math.max(0, checkoutHours - 4)
      plannedStartMin = 0
    } else if (isNight) {
      // Night shift ends at 05:00 or 06:00
      plannedStartHour = 5
      // If checkout is after 05:15 or overtimeMinutes > 0
      if (checkoutTotalMin > 5 * 60 + 15 && checkoutTotalMin < 12 * 60) {
        isPastWorkingHours = true
      }
    } else {
      // Day shift ends at 17:00
      plannedStartHour = 17
      // If checkout is after 17:15 or overtimeMinutes > 0
      if (checkoutTotalMin > 17 * 60 + 15 || overtimeMinutes > 0) {
        isPastWorkingHours = true
      }
    }

    if (overtimeMinutes > 0) {
      isPastWorkingHours = true
    }

    if (!isPastWorkingHours) {
      return { generated: false, reason: 'Checkout is within normal shift hours' }
    }

    // Check if an SPL already exists for this employee on this date
    const dayStart = new Date(eventTime)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(eventTime)
    dayEnd.setHours(23, 59, 59, 999)

    const existingSplRows = await db
      .select({ id: overtimeCommandLetters.id })
      .from(overtimeCommandLetters)
      .where(
        and(
          eq(overtimeCommandLetters.requestedByEmployeeId, emp.id),
          gte(overtimeCommandLetters.workDate, dayStart),
          lte(overtimeCommandLetters.workDate, dayEnd)
        )
      )
      .limit(1)

    if (existingSplRows.length > 0) {
      return { generated: false, splId: existingSplRows[0].id, reason: 'SPL already exists for this date' }
    }

    // Determine planned start & end dates
    const plannedStartAt = new Date(eventTime)
    if (offDayCheck.isOffDay) {
      plannedStartAt.setHours(plannedStartHour, 0, 0, 0)
    } else {
      plannedStartAt.setHours(plannedStartHour, plannedStartMin, 0, 0)
    }

    const plannedEndAt = new Date(eventTime)
    const totalDiffMinutes = Math.max(
      15,
      overtimeMinutes > 0 ? overtimeMinutes : Math.round((plannedEndAt.getTime() - plannedStartAt.getTime()) / 60000)
    )

    // Generate SPL Number
    const prefix = 'SPL-' + eventTime.getFullYear() + '-'
    const [last] = await db
      .select({ id: overtimeCommandLetters.id })
      .from(overtimeCommandLetters)
      .orderBy(desc(overtimeCommandLetters.id))
      .limit(1)

    const nextNumber = `${prefix}${String((last?.id || 0) + 1).padStart(4, '0')}`

    // Insert Overtime Command Letter
    const [insertedSpl] = await db
      .insert(overtimeCommandLetters)
      .values({
        splNumber: nextNumber,
        siteId: effectiveSiteId,
        departmentId: emp.departmentId,
        sectionId: emp.sectionId,
        positionId: emp.positionId,
        title: `Penugasan Lembur Otomatis Presensi (${emp.name})`,
        workDate: dayStart,
        plannedStartAt,
        plannedEndAt,
        status: 'Submitted',
        requestNotes: `Otomatis digenerate oleh sistem presensi saat karyawan check-out melewati jam kerja normal (${totalDiffMinutes} menit lembur).`,
        executionNotes: 'Presensi tercatat otomatis.',
        requestedByEmployeeId: emp.id,
        origin: 'attendance_auto',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    // Insert Participant
    await db.insert(overtimeCommandLetterParticipants).values({
      overtimeCommandLetterId: insertedSpl.id,
      employeeId: emp.id,
      shiftCode: isNight ? 'NS' : 'DS',
      rosterType: siteConfig.rosterType || '5:2',
      category: offDayCheck.isOffDay ? 'off_day' : 'after_mandatory_ot',
      createdAt: new Date(),
    })

    // Insert Line Item
    await db.insert(overtimeCommandLetterItems).values({
      overtimeCommandLetterId: insertedSpl.id,
      lineLabel: 'Pekerjaan Operasional Melewati Jam Kerja Presensi',
      lineDescription: `Pekerjaan lembur operasional lapangan tercatat saat checkout presensi (${totalDiffMinutes} menit).`,
      targetUnit: '-',
      estimatedMinutes: totalDiffMinutes,
      plannedPoints: 10,
      sortOrder: 1,
      createdAt: new Date(),
    })

    // Resolve Approval Hierarchy (Step 1 auto-approved, Step 2 pending)
    const settings = await getOvertimeWorkflowSettings()

    // Resolve direct manager / leader
    const [directManager] = emp.directManagerId
      ? await db
          .select({ id: employees.id, name: employees.name, email: employees.email })
          .from(employees)
          .where(eq(employees.id, emp.directManagerId))
          .limit(1)
      : []

    // Section Head resolution
    let sectionHeadName = ''
    let sectionHeadEmail = ''
    let sectionHeadEmployeeId: number | null = null

    if (emp.sectionId) {
      const [secRow] = await db
        .select({ headEmployeeId: masterSections.headEmployeeId })
        .from(masterSections)
        .where(eq(masterSections.id, emp.sectionId))
        .limit(1)

      if (secRow?.headEmployeeId) {
        const [secEmp] = await db
          .select({ id: employees.id, name: employees.name, email: employees.email })
          .from(employees)
          .where(eq(employees.id, secRow.headEmployeeId))
          .limit(1)
        if (secEmp) {
          sectionHeadEmployeeId = secEmp.id
          sectionHeadName = secEmp.name
          sectionHeadEmail = secEmp.email || ''
        }
      }
    }

    if (!sectionHeadName && effectiveSiteId) {
      const [siteRow] = await db
        .select({ headEmployeeId: sites.headEmployeeId })
        .from(sites)
        .where(eq(sites.id, effectiveSiteId))
        .limit(1)

      if (siteRow?.headEmployeeId) {
        const [siteEmp] = await db
          .select({ id: employees.id, name: employees.name, email: employees.email })
          .from(employees)
          .where(eq(employees.id, siteRow.headEmployeeId))
          .limit(1)
        if (siteEmp) {
          sectionHeadEmployeeId = siteEmp.id
          sectionHeadName = siteEmp.name
          sectionHeadEmail = siteEmp.email || ''
        }
      }
    }

    let leaderEmployeeId = directManager?.id ?? null
    let leaderName = directManager?.name ?? settings.approvalMatrix?.fieldPicName ?? ''
    let leaderEmail = directManager?.email || settings.approvalMatrix?.fieldPicEmail || ''

    if (!leaderEmployeeId && sectionHeadEmployeeId) {
      leaderEmployeeId = sectionHeadEmployeeId
      leaderName = sectionHeadName
      leaderEmail = sectionHeadEmail
    }

    if (!sectionHeadName) {
      sectionHeadName = settings.approvalMatrix?.managerName || 'Section Head'
      sectionHeadEmail = settings.approvalMatrix?.managerEmail || ''
    }
    if (!leaderName) {
      leaderName = 'Leader Lapangan'
    }

    const step1Token = randomUUID()
    const step2Token = randomUUID()
    const step3Token = randomUUID()
    const now = new Date()

    const steps = [
      {
        overtimeCommandLetterId: insertedSpl.id,
        stepOrder: 1,
        stepLabel: 'Karyawan Sign',
        approverRole: 'employee',
        approverEmployeeId: emp.id,
        approverName: emp.name,
        approverEmail: emp.email || '',
        status: 'approved',
        signatureDataUrl: emp.signatureDataUrl || null,
        signedAt: now,
        remarks: 'Auto-approved saat pembuatan SPL dari presensi.',
        approvalToken: step1Token,
        createdAt: now,
      },
      {
        overtimeCommandLetterId: insertedSpl.id,
        stepOrder: 2,
        stepLabel: 'Leader / Pengawas',
        approverRole: 'leader',
        approverEmployeeId: leaderEmployeeId,
        approverName: leaderName,
        approverEmail: leaderEmail,
        status: 'pending',
        signatureDataUrl: null,
        signedAt: null,
        remarks: '',
        approvalToken: step2Token,
        createdAt: now,
      },
      {
        overtimeCommandLetterId: insertedSpl.id,
        stepOrder: 3,
        stepLabel: 'Section Head',
        approverRole: 'section_head',
        approverEmployeeId: sectionHeadEmployeeId,
        approverName: sectionHeadName,
        approverEmail: sectionHeadEmail,
        status: 'waiting',
        signatureDataUrl: null,
        signedAt: null,
        remarks: '',
        approvalToken: step3Token,
        createdAt: now,
      },
    ]

    await db.insert(overtimeApprovals).values(steps)

    // Notify Step 2 Approver (Leader/PJO) immediately
    if (leaderEmail) {
      try {
        await sendOvertimeStepApprovalEmail({
          documentId: insertedSpl.id,
          splNumber: insertedSpl.splNumber || `SPL-${insertedSpl.id}`,
          title: insertedSpl.title,
          workDate: insertedSpl.workDate,
          employeeName: emp.name,
          requesterName: emp.name,
          approverName: leaderName,
          approverEmail: leaderEmail,
          approvalStep: 'Leader / Pengawas',
          approvalToken: step2Token,
        })
      } catch (emailErr) {
        console.error('[auto-spl-attendance] Email to leader error:', emailErr)
      }
    }

    try {
      const recipientEmails = [leaderEmail, emp.email].filter(Boolean) as string[]
      if (recipientEmails.length > 0) {
        await notifyWorkflowBellRecipients({
          recipientEmails,
          category: 'approval_requests',
          title: `SPL Otomatis Dibuat: ${insertedSpl.splNumber}`,
          body: `SPL untuk ${emp.name} otomatis dibuat dari presensi checkout (${totalDiffMinutes} menit lembur) dan siap di-review oleh Leader.`,
          eventType: 'overtime_request_created',
          url: '/dashboard/approval',
          metadata: {
            splNumber: insertedSpl.splNumber,
            documentId: insertedSpl.id,
            employeeName: emp.name,
          },
        })
      }
    } catch (bellErr) {
      console.warn('[auto-spl-attendance] Bell notification error:', bellErr)
    }

    return { generated: true, splId: insertedSpl.id }
  } catch (error: any) {
    console.error('[auto-spl-attendance] Error auto-generating SPL:', error)
    return { generated: false, reason: error.message || 'Error auto-generating SPL' }
  }
}
