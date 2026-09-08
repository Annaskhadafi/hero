'use server'

import { db } from '@/db'
import { attendanceRecords, employees, masterAttendanceShifts, sites } from '@/db/schema/hero'
import {
  attendancePermissionRequests,
  timesheetAttendanceRealOverrides,
} from '@/db/schema/timesheet'
import { uploadFile } from '@/app/actions/upload'
import { auth } from '@/lib/auth'
import { getActiveAttendanceShiftOptions } from '@/lib/master-data'
import { getS3ObjectReadUrl } from '@/lib/s3-storage'
import { ensureSchedulingTimesheetTables } from '@/lib/timesheet/scheduling-infrastructure'
import {
  checkEmployeeOffDayStatus,
  normalizeSiteAttendanceClockConfig,
  resolveConfiguredShiftClockIn,
} from '@/lib/timesheet/attendance-punctuality'
import {
  getSiteAttendanceClockConfig,
  resolveSiteAttendancePunctuality,
} from '@/lib/timesheet/site-attendance-punctuality'
import { syncFaceAttendanceToTimesheet } from '@/lib/timesheet/face-attendance-sync'
import { getCurrentMenuPermission, hasGlobalDataAccess } from '@/lib/hero-access'
import {
  buildWorkflowEmailContent,
  getAttendancePermissionRecipientEmails,
  resolveAttendancePermissionApprover,
  ATTENDANCE_PERMISSION_HC_CC_EMAILS,
  getEmployeeContactById,
  getAppUrl,
  sendWorkflowEmail,
} from '@/lib/workflow-email'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import {
  cancelLegacyApprovalSubmission,
  createLegacyApprovalRequest,
} from '@/lib/legacy-approval-engine'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { eq, and, gte, lte, desc, sql, asc, inArray, not } from 'drizzle-orm'
import { endOfDay, startOfDay, subHours } from 'date-fns'

async function ensureEmployeeSite<
  T extends {
    id: number
    siteId: number
    siteName: string | null
    workLocation: string | null
  },
>(employee: T): Promise<T & { siteId: number; siteName: string; workLocation: string }> {
  if (employee.siteName) {
    return {
      ...employee,
      siteName: employee.siteName,
      workLocation: employee.workLocation?.trim() || employee.siteName,
    }
  }

  const [existingSite] = await db
    .select({ id: sites.id, name: sites.name })
    .from(sites)
    .where(eq(sites.id, employee.siteId))
    .limit(1)

  const site =
    existingSite ??
    (
      await db
        .insert(sites)
        .values({
          name: employee.workLocation?.trim() || 'Default Site',
          location: employee.workLocation?.trim() || 'Default Site',
          customerName: 'PT Chitra Paratama',
          contractNumber: 'ATTENDANCE-DEFAULT',
          isActive: true,
        })
        .returning({ id: sites.id, name: sites.name })
    )[0]

  await db
    .update(employees)
    .set({
      siteId: site.id,
      workLocation: employee.workLocation?.trim() || site.name,
    })
    .where(eq(employees.id, employee.id))

  return {
    ...employee,
    siteId: site.id,
    siteName: site.name,
    workLocation: employee.workLocation?.trim() || site.name,
  }
}

async function getCurrentEmployee() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    return null
  }

  const [employee] = await db
    .select({
      id: employees.id,
      authUserId: employees.authUserId,
      name: employees.name,
      email: employees.email,
      role: employees.role,
      jobTitle: employees.jobTitle,
      workLocation: employees.workLocation,
      siteId: employees.siteId,
      siteName: sites.name,
      employeeSn: employees.employeeSn,
      faceRegisteredAt: employees.faceRegisteredAt,
      faceRarayId: employees.faceRarayId,
      faceRarayRegisteredAt: employees.faceRarayRegisteredAt,
    })
    .from(employees)
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .where(
      and(
        eq(employees.isActive, true),
        session.user.id
          ? eq(employees.authUserId, session.user.id)
          : eq(employees.email, session.user.email)
      )
    )
    .limit(1)

  if (employee) {
    return ensureEmployeeSite(employee)
  }

  const [employeeByEmail] = await db
    .select({
      id: employees.id,
      authUserId: employees.authUserId,
      name: employees.name,
      email: employees.email,
      role: employees.role,
      jobTitle: employees.jobTitle,
      workLocation: employees.workLocation,
      siteId: employees.siteId,
      siteName: sites.name,
      employeeSn: employees.employeeSn,
      faceRegisteredAt: employees.faceRegisteredAt,
      faceRarayId: employees.faceRarayId,
      faceRarayRegisteredAt: employees.faceRarayRegisteredAt,
    })
    .from(employees)
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .where(
      and(
        eq(employees.isActive, true),
        sql`lower(${employees.email}) = ${session.user.email.toLowerCase()}`
      )
    )
    .limit(1)

  if (employeeByEmail) {
    if (!employeeByEmail.authUserId && session.user.id) {
      await db
        .update(employees)
        .set({ authUserId: session.user.id })
        .where(eq(employees.id, employeeByEmail.id))
    }

    return ensureEmployeeSite(employeeByEmail)
  }

  const [existingDefaultSite] = await db
    .select({
      id: sites.id,
      name: sites.name,
    })
    .from(sites)
    .limit(1)

  const defaultSite =
    existingDefaultSite ??
    (
      await db
        .insert(sites)
        .values({
          name: 'Default Site',
          location: 'Default Site',
          customerName: 'PT Chitra Paratama',
          contractNumber: 'ATTENDANCE-DEFAULT',
          isActive: true,
        })
        .returning({ id: sites.id, name: sites.name })
    )[0]

  const [createdEmployee] = await db
    .insert(employees)
    .values({
      authUserId: session.user.id,
      siteId: defaultSite.id,
      name: session.user.name?.trim() || session.user.email.split('@')[0],
      email: session.user.email,
      role: 'Site Team',
      department: 'Operations',
      jobTitle: 'Site Team',
      workLocation: defaultSite.name,
      accessRole: 'Site Admin',
      employmentStatus: 'active',
      isActive: true,
    })
    .returning({
      id: employees.id,
      authUserId: employees.authUserId,
      name: employees.name,
      email: employees.email,
      jobTitle: employees.jobTitle,
      workLocation: employees.workLocation,
      siteId: employees.siteId,
      faceRegisteredAt: employees.faceRegisteredAt,
    })

  return createdEmployee
    ? {
        ...createdEmployee,
        siteName: defaultSite.name,
      }
    : null
}

function buildLocationNote(
  locationName: string | null,
  latitude: string | null,
  longitude: string | null,
  fallbackLocation: string
) {
  const resolvedLocationName = locationName?.trim()

  if (resolvedLocationName && resolvedLocationName !== 'Lokasi GPS') {
    return resolvedLocationName
  }

  if (latitude && longitude) {
    return `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`
  }

  return locationName?.trim() || fallbackLocation || 'Lokasi GPS'
}

function formatOvertimeLabel(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return null
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`
  }

  if (hours > 0) {
    return `${hours}h`
  }

  return `${remainingMinutes}m`
}

function getTrimmedFormValue(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function buildAttendanceNote(input: {
  locationNote: string
  shiftLabel: string
  shiftWindow: string
  workMode: string
  attendanceContext: string
  overtimeMinutes: number
  operationalNote: string
  punctualityNote?: string | null
}) {
  const details = [
    input.shiftLabel
      ? `Shift: ${input.shiftLabel}${input.shiftWindow ? ` (${input.shiftWindow})` : ''}`
      : null,
    input.workMode ? `Mode: ${input.workMode}` : null,
    input.attendanceContext ? `Condition: ${input.attendanceContext}` : null,
    formatOvertimeLabel(input.overtimeMinutes)
      ? `Overtime: ${formatOvertimeLabel(input.overtimeMinutes)}`
      : null,
    input.operationalNote ? `Note: ${input.operationalNote}` : null,
    input.punctualityNote || null,
  ].filter(Boolean)

  return [input.locationNote, ...details].join(' | ')
}

function getAttendanceQueryWindow(targetDate?: Date) {
  const now = targetDate || new Date()

  return {
    start: subHours(startOfDay(now), 8),
    end: endOfDay(now),
  }
}

function periodFromDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.slice(0, 7) : null
}

function dayNumberFromDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? Number(value.slice(-2)) : null
}

function dateRangeDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return []

  const days: string[] = []
  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    days.push(cursor.toISOString().slice(0, 10))
  }
  return days
}

function formatAttendancePermissionType(permissionType: string) {
  return permissionType === 'late' ? 'Izin Terlambat' : 'Izin Sakit'
}

function formatAttendancePermissionRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return new Date(`${startDate}T00:00:00`).toLocaleDateString('id-ID', { dateStyle: 'medium' })
  }

  return `${new Date(`${startDate}T00:00:00`).toLocaleDateString('id-ID', { dateStyle: 'medium' })} s/d ${new Date(`${endDate}T00:00:00`).toLocaleDateString('id-ID', { dateStyle: 'medium' })}`
}

async function notifyAttendancePermissionSubmitted(input: {
  employeeId?: number | null
  employeeName: string
  employeeEmail: string
  siteId?: number | null
  siteName?: string | null
  sectionId?: number | null
  sectionName?: string | null
  jobTitle?: string | null
  permissionType: string
  startDate: string
  endDate: string
  reason: string
  actorEmail?: string
}) {
  const approver = await resolveAttendancePermissionApprover({
    employeeId: input.employeeId,
    siteId: input.siteId,
    siteName: input.siteName,
    sectionId: input.sectionId,
    sectionName: input.sectionName,
    jobTitle: input.jobTitle,
  })

  if (!approver?.approverEmail) {
    return
  }

  const permissionLabel = formatAttendancePermissionType(input.permissionType)
  const requestDate = formatAttendancePermissionRange(input.startDate, input.endDate)
  const emailContent = buildWorkflowEmailContent({
    title: `Pengajuan ${permissionLabel} baru`,
    greeting: `Halo ${approver.approverName},`,
    intro: `${input.employeeName} mengirim pengajuan ${permissionLabel.toLowerCase()} dan menunggu persetujuan Anda (${approver.approverTitle || approver.category}).`,
    details: [
      `Karyawan: ${input.employeeName}`,
      `Jenis Izin: ${permissionLabel}`,
      `Tanggal: ${requestDate}`,
      input.reason ? `Alasan: ${input.reason}` : null,
      `Approver (${approver.category}): ${approver.approverName} (${approver.approverTitle})`,
    ],
    ctaLabel: 'Buka Dashboard Izin',
    ctaUrl: getAppUrl('/dashboard/hc/permission'),
  })

  await sendWorkflowEmail({
    to: approver.approverEmail,
    cc: ATTENDANCE_PERMISSION_HC_CC_EMAILS,
    actorEmail: input.actorEmail,
    templateCode: 'attendance_permission_reminder',
    templateName: 'Attendance Permission Reminder',
    variables: {
      employeeName: input.employeeName,
      permissionType: permissionLabel,
      requestDate,
      reason: input.reason || '-',
      approverName: approver.approverName,
      approverRole: approver.approverTitle || approver.category,
    },
    fallbackSubject: `Pengajuan ${permissionLabel} baru - ${input.employeeName}`,
    fallbackHtml: emailContent.html,
    fallbackText: emailContent.text,
  })
}

async function notifyAttendancePermissionDecision(input: {
  employeeName: string
  employeeEmail: string
  permissionType: string
  startDate: string
  endDate: string
  approved: boolean
  approverNote: string
}) {
  if (!input.employeeEmail) {
    return
  }

  const permissionLabel = formatAttendancePermissionType(input.permissionType)
  const decisionLabel = input.approved ? 'disetujui' : 'ditolak'
  const requestDate = formatAttendancePermissionRange(input.startDate, input.endDate)
  const emailContent = buildWorkflowEmailContent({
    title: `${permissionLabel} ${decisionLabel}`,
    greeting: `Halo ${input.employeeName},`,
    intro: `Pengajuan ${permissionLabel.toLowerCase()} Anda telah ${decisionLabel}.`,
    details: [
      `Tanggal: ${requestDate}`,
      input.approverNote ? `Catatan approver: ${input.approverNote}` : null,
    ],
    ctaLabel: 'Buka Riwayat Izin',
    ctaUrl: getAppUrl('/mobile/attendance/permission'),
  })

  await sendWorkflowEmail({
    to: input.employeeEmail,
    templateCode: 'attendance_permission_decision',
    templateName: 'Attendance Permission Decision',
    variables: {
      employeeName: input.employeeName,
      permissionType: permissionLabel,
      decisionLabel,
      requestDate,
      approverNote: input.approverNote ? `Catatan approver: ${input.approverNote}` : '',
    },
    fallbackSubject: `${permissionLabel} ${decisionLabel}`,
    fallbackHtml: emailContent.html,
    fallbackText: emailContent.text,
  })
}

async function notifyAttendancePermissionBell(input: {
  recipientEmails: string[]
  eventType: string
  title: string
  body: string
  url: string
  metadata?: Record<string, unknown>
}) {
  await notifyWorkflowBellRecipients({
    recipientEmails: input.recipientEmails,
    eventType: input.eventType,
    category: 'approval_requests',
    title: input.title,
    body: input.body,
    url: input.url,
    tagPrefix: 'attendance-permission',
    metadata: input.metadata,
  })
}

async function getMobileAttendanceShiftOptions(siteId?: number) {
  const [shifts, siteClocks] = await Promise.all([
    db
      .select({
        code: masterAttendanceShifts.code,
        label: masterAttendanceShifts.label,
        startTime: masterAttendanceShifts.startTime,
        endTime: masterAttendanceShifts.endTime,
        windowLabel: masterAttendanceShifts.windowLabel,
        helper: masterAttendanceShifts.helper,
      })
      .from(masterAttendanceShifts)
      .where(eq(masterAttendanceShifts.isActive, true))
      .orderBy(asc(masterAttendanceShifts.sortOrder), asc(masterAttendanceShifts.label)),
    siteId
      ? getSiteAttendanceClockConfig(siteId)
      : Promise.resolve(normalizeSiteAttendanceClockConfig(null)),
  ])

  if (shifts.length === 0) {
    return [
      {
        value: 'day',
        label: 'Morning Shift',
        window: `Jam masuk ${siteClocks.dayShiftClockIn}`,
        helper: 'Regular morning site operations.',
      },
    ]
  }

  return shifts.map((shift) => {
    const configuredStartTime = resolveConfiguredShiftClockIn(shift.code, siteClocks)
    return {
      value: shift.code,
      label: shift.label,
      window: configuredStartTime
        ? `Jam masuk ${configuredStartTime}`
        : shift.windowLabel.trim() ||
          (shift.startTime && shift.endTime
            ? `${shift.startTime} - ${shift.endTime}`
            : 'As per assignment'),
      helper: shift.helper,
    }
  })
}

export async function getAttendancePageData() {
  const employee = await getCurrentEmployee()
  const shiftOptions = await getMobileAttendanceShiftOptions(employee?.siteId)

  if (!employee) {
    return {
      success: false,
      employee: null,
      logs: [],
      shiftOptions,
    }
  }

  const attendanceWindow = getAttendanceQueryWindow()

  const logs = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employee.id),
        gte(attendanceRecords.eventTime, attendanceWindow.start),
        lte(attendanceRecords.eventTime, attendanceWindow.end)
      )
    )
    .orderBy(desc(attendanceRecords.eventTime))

  return {
    success: true,
    employee,
    logs,
    shiftOptions,
  }
}

export async function submitAttendance(formData: FormData) {
  try {
    const employee = await getCurrentEmployee()

    if (!employee) {
      return { success: false, error: 'Unauthorized' }
    }

    const clientRequestId = getTrimmedFormValue(formData, 'clientRequestId')
    if (clientRequestId) {
      const [existingRecord] = await db
        .select()
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeId, employee.id),
            eq(attendanceRecords.clientRequestId, clientRequestId)
          )
        )
        .limit(1)

      if (existingRecord) {
        return { success: true, record: existingRecord }
      }
    }

    const photoUrlResult = await uploadFile(formData)
    if (!photoUrlResult.success || !photoUrlResult.url) {
      return {
        success: false,
        error: photoUrlResult.error || 'Photo upload to Object Storage failed.',
      }
    }
    const photoUrl = photoUrlResult.url

    const eventType = formData.get('type') as string
    if (eventType !== 'checked-in' && eventType !== 'checked-out') {
      return { success: false, error: 'Attendance type is invalid.' }
    }

    const latitude = formData.get('latitude') as string | null
    const longitude = formData.get('longitude') as string | null
    const locationName = formData.get('locationName') as string | null
    const baseLocationNote = buildLocationNote(
      locationName,
      latitude,
      longitude,
      employee.workLocation
    )
    const overtimeMinutes = Math.max(
      0,
      Number(getTrimmedFormValue(formData, 'overtimeMinutes')) || 0
    )
    const shiftCode = getTrimmedFormValue(formData, 'shiftCode')
    const activeShiftOptions = await getActiveAttendanceShiftOptions().catch(() => [])
    let selectedShift = activeShiftOptions.find((shift) => shift.value === shiftCode)

    if (!selectedShift) {
      if (['ns', 'night', 'malam'].includes(shiftCode.toLowerCase())) {
        selectedShift = {
          value: shiftCode || 'night',
          label: 'Shift Malam',
          window: '18:00 - 05:00',
          helper: 'Night Shift',
        }
      } else {
        selectedShift = {
          value: shiftCode || 'day',
          label: 'Shift Pagi / Reguler',
          window: '08:00 - 17:00',
          helper: 'Day Shift',
        }
      }
    }

    const eventTime = new Date()
    const siteConfig = await getSiteAttendanceClockConfig(employee.siteId)
    const offDayCheck = checkEmployeeOffDayStatus({
      eventTime,
      role: employee.role || employee.jobTitle,
      scheduleType: siteConfig.scheduleType,
      rosterType: siteConfig.rosterType,
      timeZone: siteConfig.timezone,
    })

    if (!offDayCheck.allowAttendance && offDayCheck.reason) {
      return { success: false, error: offDayCheck.reason }
    }

    const punctuality = await resolveSiteAttendancePunctuality({
      siteId: employee.siteId,
      eventType,
      eventTime,
      shiftCode,
      employeeId: employee.id,
    })

    const rawContext = getTrimmedFormValue(formData, 'attendanceContext')
    const attendanceContext = offDayCheck.isOffDay
      ? [rawContext, 'Hari OFF / Lembur'].filter(Boolean).join(' - ')
      : rawContext

    const locationNote = buildAttendanceNote({
      locationNote: baseLocationNote,
      shiftLabel: selectedShift.label,
      shiftWindow: selectedShift.window,
      workMode: getTrimmedFormValue(formData, 'workMode'),
      attendanceContext,
      overtimeMinutes,
      operationalNote: getTrimmedFormValue(formData, 'operationalNote').slice(0, 160),
      punctualityNote: punctuality?.note,
    })

    const [record] = await db
      .insert(attendanceRecords)
      .values({
        employeeId: employee.id,
        siteId: employee.siteId,
        eventType,
        eventTime,
        status: 'pending',
        locationNote,
        photoUrl,
        latitude,
        longitude,
        clientRequestId: clientRequestId || null,
      })
      .returning()

    try {
      await syncFaceAttendanceToTimesheet(employee.id, employee.siteId, eventTime)
    } catch (syncError) {
      console.error('[submitAttendance] Timesheet sync failed:', syncError)
    }

    revalidatePath('/mobile/attendance')
    revalidatePath('/dashboard/attendance')
    revalidatePath('/dashboard/attendance/records')
    revalidatePath('/dashboard/scheduling-timesheet')
    revalidatePath('/dashboard/scheduling-timesheet/attendance')

    return { success: true, record }
  } catch (err) {
    console.error('Attendance submission error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to submit attendance',
    }
  }
}

export async function submitAttendancePermission(formData: FormData) {
  try {
    const employee = await getCurrentEmployee()
    if (!employee) return { success: false, error: 'Unauthorized' }

    const permissionType = getTrimmedFormValue(formData, 'permissionType')
    const requestDate = getTrimmedFormValue(formData, 'requestDate')
    const endDate = getTrimmedFormValue(formData, 'endDate') || requestDate
    const sickCategory = getTrimmedFormValue(formData, 'sickCategory')
    const lateReason = getTrimmedFormValue(formData, 'lateReason')
    const returnTime = getTrimmedFormValue(formData, 'returnTime')
    const reason = getTrimmedFormValue(formData, 'reason')
    const requestedDays =
      permissionType === 'sick' ? dateRangeDays(requestDate, endDate) : [requestDate]

    if (requestedDays.length === 0) return { success: false, error: 'Tanggal izin tidak valid.' }
    if (!['sick', 'late'].includes(permissionType)) {
      return { success: false, error: 'Tipe izin tidak valid.' }
    }
    if (permissionType === 'sick' && !sickCategory) {
      return { success: false, error: 'Kategori sakit wajib dipilih.' }
    }
    if (permissionType === 'late' && (!lateReason || !returnTime)) {
      return {
        success: false,
        error: 'Izin terlambat wajib isi alasan dan jam kembali/masuk kantor.',
      }
    }

    let photoUrl = ''
    const file = formData.get('file')
    if (
      permissionType === 'sick' &&
      requestedDays.length > 1 &&
      !(file instanceof File && file.size > 0)
    ) {
      return {
        success: false,
        error: 'Sakit lebih dari 1 hari wajib lampirkan surat keterangan dokter.',
      }
    }
    if (file instanceof File && file.size > 0) {
      const uploadResult = await uploadFile(formData)
      if (!uploadResult.success || !uploadResult.url) {
        return { success: false, error: uploadResult.error || 'Upload foto izin gagal.' }
      }
      photoUrl = uploadResult.url
    }

    await ensureSchedulingTimesheetTables()
    const now = new Date()
    const [record] = await db
      .insert(attendancePermissionRequests)
      .values({
        siteId: employee.siteId,
        employeeId: employee.id,
        approvalSubmissionId: null,
        permissionType,
        startDate: requestDate,
        endDate: permissionType === 'sick' ? endDate : requestDate,
        sickCategory: permissionType === 'sick' ? sickCategory : '',
        lateReason: permissionType === 'late' ? lateReason : '',
        returnTime: permissionType === 'late' ? returnTime : '',
        reason,
        attachmentUrl: photoUrl,
        status: 'pending',
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          attendancePermissionRequests.employeeId,
          attendancePermissionRequests.startDate,
          attendancePermissionRequests.permissionType,
        ],
        set: {
          endDate: permissionType === 'sick' ? endDate : requestDate,
          sickCategory: permissionType === 'sick' ? sickCategory : '',
          lateReason: permissionType === 'late' ? lateReason : '',
          returnTime: permissionType === 'late' ? returnTime : '',
          reason,
          attachmentUrl: photoUrl,
          status: 'pending',
          approverNote: '',
          approvedAt: null,
          rejectedAt: null,
          updatedAt: now,
        },
      })
      .returning()

    if (record.approvalSubmissionId) {
      await cancelLegacyApprovalSubmission(
        record.approvalSubmissionId,
        'Attendance permission resubmitted from legacy form.'
      )
    }

    const permissionLabel = formatAttendancePermissionType(permissionType)
    const formattedRequestDate = formatAttendancePermissionRange(
      requestDate,
      permissionType === 'sick' ? endDate : requestDate
    )
    const { submission } = await createLegacyApprovalRequest({
      templateKey: 'attendance-permission',
      requesterEmployeeId: employee.id,
      siteId: employee.siteId,
      activityType: 'attendance-permission',
      transactionType: 'attendance_permission',
      referenceId: record.id,
      payloadSnapshot: {
        legacyRecordId: record.id,
        permissionType,
        employeeId: employee.id,
        employeeName: employee.name,
        requestDate,
        endDate: permissionType === 'sick' ? endDate : requestDate,
        reason,
      },
      previewSnapshot: {
        title: `Attendance Permission - ${permissionLabel}`,
        summary: `${employee.name} mengajukan ${permissionLabel.toLowerCase()} untuk ${formattedRequestDate}.`,
        siteName: employee.siteName,
        workDate: requestDate,
      },
    })

    await db
      .update(attendancePermissionRequests)
      .set({
        approvalSubmissionId: submission.id,
        updatedAt: new Date(),
      })
      .where(eq(attendancePermissionRequests.id, record.id))

    revalidatePath('/mobile/attendance')
    revalidatePath('/mobile/attendance/permission')
    revalidatePath('/dashboard/scheduling-timesheet/attendance')
    revalidatePath('/dashboard/scheduling-timesheet/permission')
    revalidatePath('/dashboard/hc/permission')

    try {
      await notifyAttendancePermissionSubmitted({
        employeeId: employee.id,
        employeeName: employee.name,
        employeeEmail: employee.email,
        siteId: employee.siteId,
        siteName: employee.siteName,
        sectionId: employee.sectionId,
        sectionName: employee.section,
        jobTitle: employee.jobTitle,
        permissionType,
        startDate: requestDate,
        endDate: permissionType === 'sick' ? endDate : requestDate,
        reason,
        actorEmail: employee.email,
      })
    } catch (emailError) {
      console.error('Attendance permission submit email error:', emailError)
    }

    try {
      const approver = await resolveAttendancePermissionApprover({
        employeeId: employee.id,
        siteId: employee.siteId,
        siteName: employee.siteName,
        sectionId: employee.sectionId,
        sectionName: employee.section,
        jobTitle: employee.jobTitle,
      })

      const bellRecipients = Array.from(
        new Set(
          [approver?.approverEmail, ...ATTENDANCE_PERMISSION_HC_CC_EMAILS].filter(
            (email): email is string => Boolean(email && email.includes('@'))
          )
        )
      )
      await notifyAttendancePermissionBell({
        recipientEmails: bellRecipients,
        eventType: 'attendance_permission_submitted',
        title: `Pengajuan ${permissionLabel} baru`,
        body: `${employee.name} mengirim ${permissionLabel.toLowerCase()} untuk ${formattedRequestDate}.`,
        url: '/dashboard/hc/permission',
        metadata: {
          permissionType,
          requestDate: formattedRequestDate,
          employeeName: employee.name,
          approverName: approver?.approverName,
          approverCategory: approver?.category,
        },
      })
    } catch (notificationError) {
      console.error('Attendance permission submit bell error:', notificationError)
    }

    return { success: true, message: 'Izin terkirim. Menunggu approval HR.' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Izin gagal disimpan.',
    }
  }
}

async function getCurrentUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user?.id ?? null
}

async function applyApprovedPermissionRequest(
  requestId: number,
  approverNote: string,
  approved: boolean
) {
  await ensureSchedulingTimesheetTables()
  const [request] = await db
    .select()
    .from(attendancePermissionRequests)
    .where(eq(attendancePermissionRequests.id, requestId))
    .limit(1)

  if (!request) return { success: false, error: 'Request izin tidak ditemukan.' }

  const approverUserId = await getCurrentUserId()
  const now = new Date()

  if (!approved) {
    await db
      .update(attendancePermissionRequests)
      .set({ status: 'rejected', approverUserId, approverNote, rejectedAt: now, updatedAt: now })
      .where(eq(attendancePermissionRequests.id, requestId))
    revalidatePath('/dashboard/hc/permission')
    revalidatePath('/mobile/attendance/permission')

    const employeeContact = await getEmployeeContactById(request.employeeId)
    try {
      await notifyAttendancePermissionDecision({
        employeeName: employeeContact.name,
        employeeEmail: employeeContact.email,
        permissionType: request.permissionType,
        startDate: String(request.startDate),
        endDate: String(request.endDate),
        approved: false,
        approverNote,
      })
    } catch (emailError) {
      console.error('Attendance permission reject email error:', emailError)
    }

    try {
      const permissionLabel = formatAttendancePermissionType(request.permissionType)
      await notifyAttendancePermissionBell({
        recipientEmails: [employeeContact.email],
        eventType: 'attendance_permission_decision',
        title: `${permissionLabel} ditolak`,
        body: `Pengajuan ${permissionLabel.toLowerCase()} Anda ditolak.${approverNote ? ` Catatan: ${approverNote}` : ''}`,
        url: '/mobile/attendance/permission',
        metadata: {
          permissionType: request.permissionType,
          decision: 'rejected',
        },
      })
    } catch (notificationError) {
      console.error('Attendance permission reject bell error:', notificationError)
    }

    return { success: true, message: 'Izin ditolak.' }
  }

  const days =
    request.permissionType === 'sick'
      ? dateRangeDays(String(request.startDate), String(request.endDate))
      : [String(request.startDate)]
  const status = request.permissionType === 'sick' ? 'sick' : 'present'

  for (const requestDay of days) {
    const period = periodFromDate(requestDay)
    const day = dayNumberFromDate(requestDay)
    if (!period || !day) continue
    const note = [
      request.permissionType === 'sick' ? 'Izin Sakit' : 'Izin Terlambat',
      request.permissionType === 'sick'
        ? `Kategori Sakit: ${request.sickCategory}`
        : `Alasan Terlambat: ${request.lateReason}`,
      request.permissionType === 'late' ? `Jam Kembali/Masuk: ${request.returnTime}` : '',
      days.length > 1 ? `Rentang: ${request.startDate} s/d ${request.endDate}` : '',
      request.reason ? `Catatan: ${request.reason}` : '',
      request.attachmentUrl ? `Lampiran: ${request.attachmentUrl}` : '',
      approverNote ? `Approval Note: ${approverNote}` : '',
    ]
      .filter(Boolean)
      .join(' | ')

    await db
      .insert(timesheetAttendanceRealOverrides)
      .values({
        siteId: request.siteId,
        period,
        employeeId: request.employeeId,
        day,
        status,
        clockIn: request.permissionType === 'late' ? request.returnTime : '',
        clockOut: '',
        note,
        source: 'manual',
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          timesheetAttendanceRealOverrides.siteId,
          timesheetAttendanceRealOverrides.period,
          timesheetAttendanceRealOverrides.employeeId,
          timesheetAttendanceRealOverrides.day,
        ],
        set: {
          status,
          clockIn: request.permissionType === 'late' ? request.returnTime : '',
          clockOut: '',
          note,
          source: 'manual',
          updatedAt: now,
        },
      })
  }

  await db
    .update(attendancePermissionRequests)
    .set({ status: 'approved', approverUserId, approverNote, approvedAt: now, updatedAt: now })
    .where(eq(attendancePermissionRequests.id, requestId))

  revalidatePath('/mobile/attendance')
  revalidatePath('/mobile/attendance/permission')
  revalidatePath('/dashboard/scheduling-timesheet/attendance')
  revalidatePath('/dashboard/hc/permission')

  const employeeContact = await getEmployeeContactById(request.employeeId)
  try {
    await notifyAttendancePermissionDecision({
      employeeName: employeeContact.name,
      employeeEmail: employeeContact.email,
      permissionType: request.permissionType,
      startDate: String(request.startDate),
      endDate: String(request.endDate),
      approved: true,
      approverNote,
    })
  } catch (emailError) {
    console.error('Attendance permission approval email error:', emailError)
  }

  try {
    const permissionLabel = formatAttendancePermissionType(request.permissionType)
    await notifyAttendancePermissionBell({
      recipientEmails: [employeeContact.email],
      eventType: 'attendance_permission_decision',
      title: `${permissionLabel} disetujui`,
      body: `Pengajuan ${permissionLabel.toLowerCase()} Anda disetujui.${approverNote ? ` Catatan: ${approverNote}` : ''}`,
      url: '/mobile/attendance/permission',
      metadata: {
        permissionType: request.permissionType,
        decision: 'approved',
      },
    })
  } catch (notificationError) {
    console.error('Attendance permission approval bell error:', notificationError)
  }

  return { success: true, message: 'Izin disetujui dan masuk ke attendance.' }
}

export async function approveAttendancePermissionRequest(formData: FormData) {
  const id = Number(formData.get('id'))
  if (!Number.isFinite(id)) return { success: false, error: 'ID request tidak valid.' }
  return applyApprovedPermissionRequest(id, getTrimmedFormValue(formData, 'approverNote'), true)
}

export async function rejectAttendancePermissionRequest(formData: FormData) {
  const id = Number(formData.get('id'))
  if (!Number.isFinite(id)) return { success: false, error: 'ID request tidak valid.' }
  return applyApprovedPermissionRequest(id, getTrimmedFormValue(formData, 'approverNote'), false)
}

export async function getMyAttendancePermissionRequests() {
  const employee = await getCurrentEmployee()
  if (!employee) return []
  await ensureSchedulingTimesheetTables()
  return db
    .select({
      id: attendancePermissionRequests.id,
      permissionType: attendancePermissionRequests.permissionType,
      startDate: attendancePermissionRequests.startDate,
      endDate: attendancePermissionRequests.endDate,
      sickCategory: attendancePermissionRequests.sickCategory,
      lateReason: attendancePermissionRequests.lateReason,
      returnTime: attendancePermissionRequests.returnTime,
      reason: attendancePermissionRequests.reason,
      status: attendancePermissionRequests.status,
      approverNote: attendancePermissionRequests.approverNote,
      createdAt: attendancePermissionRequests.createdAt,
    })
    .from(attendancePermissionRequests)
    .where(eq(attendancePermissionRequests.employeeId, employee.id))
    .orderBy(desc(attendancePermissionRequests.createdAt))
}

export async function getTodayAttendanceLogs() {
  const employee = await getCurrentEmployee()

  if (!employee) {
    return { success: false, employee: null, logs: [] }
  }

  const attendanceWindow = getAttendanceQueryWindow()

  const logs = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employee.id),
        gte(attendanceRecords.eventTime, attendanceWindow.start),
        lte(attendanceRecords.eventTime, attendanceWindow.end)
      )
    )
    .orderBy(desc(attendanceRecords.eventTime))

  const logsWithPhotoPreview = await Promise.all(
    logs.map(async (log) => ({
      ...log,
      employeeName: employee.name,
      employeeEmail: employee.email,
      siteName: employee.siteName,
      workLocation: employee.workLocation,
      photoPreviewUrl: await getS3ObjectReadUrl(log.photoUrl),
    }))
  )

  return { success: true, employee, logs: logsWithPhotoPreview }
}

export async function getLiveAttendanceMapData(dateStr?: string) {
  const [employee, access] = await Promise.all([
    getCurrentEmployee(),
    getCurrentMenuPermission('attendance_live_map'),
  ])

  if (!employee || !access.canView) {
    return {
      success: false as const,
      reason: 'forbidden' as const,
      records: [],
      scope: 'own' as const,
    }
  }

  const targetDate = dateStr ? new Date(dateStr) : undefined
  const attendanceWindow = getAttendanceQueryWindow(targetDate)
  const conditions = [
    gte(attendanceRecords.eventTime, attendanceWindow.start),
    lte(attendanceRecords.eventTime, attendanceWindow.end),
  ]

  if (!hasGlobalDataAccess(access)) {
    conditions.push(
      access.dataScope === 'own'
        ? eq(attendanceRecords.employeeId, employee.id)
        : eq(attendanceRecords.siteId, employee.siteId)
    )
  }

  const records = await db
    .select({
      id: attendanceRecords.id,
      employeeId: attendanceRecords.employeeId,
      employeeName: employees.name,
      employeeJobTitle: employees.jobTitle,
      siteId: attendanceRecords.siteId,
      siteName: sites.name,
      siteLocation: sites.location,
      siteRadiusMeters: sites.geoRadiusMeters,
      siteGeoLatitude: sites.geoLatitude,
      siteGeoLongitude: sites.geoLongitude,
      eventType: attendanceRecords.eventType,
      eventTime: attendanceRecords.eventTime,
      status: attendanceRecords.status,
      locationNote: attendanceRecords.locationNote,
      latitude: attendanceRecords.latitude,
      longitude: attendanceRecords.longitude,
      gpsValid: sql<boolean>`(${attendanceRecords.latitude} is not null and ${attendanceRecords.longitude} is not null)`,
    })
    .from(attendanceRecords)
    .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
    .leftJoin(sites, eq(attendanceRecords.siteId, sites.id))
    .where(and(...conditions))
    .orderBy(desc(attendanceRecords.eventTime))
    .limit(500)

  // Ambil semua site yang sudah punya kordinat tersimpan agar selalu muncul di peta
  const siteConditions = [
    eq(sites.isActive, true),
    not(eq(sites.geoLatitude, '')),
    not(eq(sites.geoLongitude, '')),
  ]
  if (!hasGlobalDataAccess(access)) {
    if (employee.siteId) {
      siteConditions.push(eq(sites.id, employee.siteId))
    } else {
      // Jika user tidak punya siteId dan tidak punya global access, maka jangan kembalikan site apa-apa
      siteConditions.push(eq(sites.id, -1))
    }
  }
  const savedSites = await db
    .select({
      id: sites.id,
      name: sites.name,
      geoLatitude: sites.geoLatitude,
      geoLongitude: sites.geoLongitude,
      geoRadiusMeters: sites.geoRadiusMeters,
    })
    .from(sites)
    .where(and(...siteConditions))

  const allSitesMap = new Map()

  // Masukkan saved sites terlebih dahulu
  for (const s of savedSites) {
    allSitesMap.set(s.id, {
      id: s.id,
      name: s.name,
      latitude: Number(s.geoLatitude),
      longitude: Number(s.geoLongitude),
      radiusMeters: s.geoRadiusMeters ?? 500,
    })
  }

  // Tambahkan site dari records sebagai fallback jika belum ada di savedSites
  for (const r of records) {
    if (!r.siteId || allSitesMap.has(r.siteId)) continue

    let lat = Number(r.siteGeoLatitude)
    let lng = Number(r.siteGeoLongitude)

    // Jika Site belum pernah di-set kordinatnya, gunakan kordinat absen pertama sebagai titik awal
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      lat = Number(r.latitude) || -2.5
      lng = Number(r.longitude) || 118
    }

    allSitesMap.set(r.siteId, {
      id: r.siteId,
      name: r.siteName ?? `Site ${r.siteId}`,
      latitude: lat,
      longitude: lng,
      radiusMeters: r.siteRadiusMeters ?? 500,
    })
  }

  return {
    success: true as const,
    scope: hasGlobalDataAccess(access)
      ? ('global' as const)
      : access.dataScope === 'own'
        ? ('own' as const)
        : ('site' as const),
    generatedAt: new Date().toISOString(),
    records: records.map((record) => ({
      ...record,
      eventTime: record.eventTime.toISOString(),
      siteName: record.siteName ?? `Site ${record.siteId}`,
      siteLocation: record.siteLocation ?? '',
      siteRadiusMeters: record.siteRadiusMeters ?? 500,
    })),
    sites: Array.from(allSitesMap.values()),
  }
}

export async function updateSiteRadiusFromMap(
  siteId: number,
  radius: number,
  lat?: number,
  lng?: number
) {
  const [employee, access] = await Promise.all([
    getCurrentEmployee(),
    getCurrentMenuPermission('attendance_live_map'),
  ])

  if (!employee || !hasGlobalDataAccess(access)) {
    return {
      success: false,
      error: 'Anda tidak memiliki akses global untuk mengubah setting radius.',
    }
  }

  if (!radius || radius < 10) return { success: false, error: 'Radius tidak valid (minimal 10m).' }

  const payload: any = { geoRadiusMeters: radius }
  if (lat !== undefined && lng !== undefined) {
    payload.geoLatitude = lat.toString()
    payload.geoLongitude = lng.toString()
  }

  await db.update(sites).set(payload).where(eq(sites.id, siteId))

  return { success: true, message: 'Pengaturan Site berhasil disimpan.' }
}

export async function getSitesForMap() {
  const [employee, access] = await Promise.all([
    getCurrentEmployee(),
    getCurrentMenuPermission('attendance_live_map'),
  ])

  if (!employee || !access.canView) return { success: false, sites: [] }

  const conditions = [eq(sites.isActive, true)]
  if (!hasGlobalDataAccess(access)) {
    if (employee.siteId) {
      conditions.push(eq(sites.id, employee.siteId))
    } else {
      conditions.push(eq(sites.id, -1))
    }
  }

  const data = await db
    .select({
      id: sites.id,
      name: sites.name,
      geoLatitude: sites.geoLatitude,
      geoLongitude: sites.geoLongitude,
      geoRadiusMeters: sites.geoRadiusMeters,
    })
    .from(sites)
    .where(and(...conditions))
    .orderBy(sites.name)

  return { success: true, sites: data }
}

export async function bulkDeleteAttendancePermissionRequests(ids: number[]) {
  if (!ids.length) return { success: false, error: 'Tidak ada data dipilih.' }

  await ensureSchedulingTimesheetTables()

  await db.delete(attendancePermissionRequests).where(inArray(attendancePermissionRequests.id, ids))

  revalidatePath('/dashboard/hc/permission')
  return { success: true, message: `${ids.length} data izin berhasil dihapus.` }
}
