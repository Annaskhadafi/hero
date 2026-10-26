'use server'

import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  employees,
  masterDepartments,
  masterSections,
  notificationDeliveries,
  notificationEvents,
  overtimeApprovals,
  overtimeCommandLetters,
  overtimeCommandLetterItems,
  overtimeCommandLetterParticipants,
  overtimeSummaries,
  overtimeSummaryApprovals,
  sites,
  user,
} from '@/db/schema/hero'
import { timesheetSchedulingConfigs } from '@/db/schema/timesheet'
import { ensureSchedulingTimesheetTables } from '@/lib/timesheet/scheduling-infrastructure'
import {
  isEmployeePjo,
  resolvePjoLeader,
  resolveSummarySplSignatories,
} from '@/lib/timesheet/summary-spl-signatures'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { randomUUID } from 'crypto'

export type OvertimeSummaryApprovalStep = {
  id: number
  summaryId: number
  stepOrder: number
  stepLabel: string
  approvalToken: string
  approverEmployeeId: number | null
  approverName: string
  approverEmail: string
  approverRole: string
  status: 'pending' | 'approved' | 'rejected'
  signatureDataUrl: string | null
  remarks: string
  signedAt: Date | null
  createdAt: Date
}

export type OvertimeSummaryDetail = {
  id: number
  summaryNumber: string
  employeeId: number
  siteId: number
  periodMonth: string
  totalSplCount: number
  totalHours: number
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  currentStepOrder: number
  maxStepOrder: number
  notes: string | null
  generatedAutomatically: boolean
  submittedAt: Date | null
  approvedAt: Date | null
  rejectedAt: Date | null
  rejectionReason: string | null
  approvals: OvertimeSummaryApprovalStep[]
}

export type SummarySplApprovedItem = {
  id: number
  splNumber: string
  workDate: string
  dayName: string
  plannedStartAt: string
  plannedEndAt: string
  durationHours: number
  description: string
  status: string
}

function calculateDurationHours(startAt?: string | null, endAt?: string | null): number {
  if (!startAt || !endAt) return 0
  try {
    const s = new Date(startAt).getTime()
    const e = new Date(endAt).getTime()
    if (isNaN(s) || isNaN(e) || e <= s) return 0
    const diffHours = (e - s) / (1000 * 60 * 60)
    return Math.round(diffHours * 10) / 10
  } catch {
    return 0
  }
}

const INDONESIAN_DAY_NAMES: Record<number, string> = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
}

function getIndonesianDayName(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return INDONESIAN_DAY_NAMES[d.getDay()] || ''
  } catch {
    return ''
  }
}

/**
 * Fetch workspace data for Summary SPL for a specific employee & period (YYYY-MM).
 */
export async function getOvertimeSummaryWorkspaceDataAction(params: {
  employeeId: number
  periodMonth: string // "YYYY-MM"
}) {
  try {
    await ensureSchedulingTimesheetTables()
    const { employeeId, periodMonth } = params

    // 1. Fetch employee details
    const [emp] = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        employeeSn: employees.employeeSn,
        position: employees.jobTitle,
        jobTitle: employees.jobTitle,
        rank: employees.role,
        role: employees.role,
        departmentId: employees.departmentId,
        sectionId: employees.sectionId,
        siteId: employees.siteId,
        directManagerId: employees.directManagerId,
        siteHeadId: sites.headEmployeeId,
        siteName: sites.name,
        departmentName: masterDepartments.name,
        sectionName: masterSections.name,
      })
      .from(employees)
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .where(eq(employees.id, employeeId))
      .limit(1)

    if (!emp) {
      return { ok: false, error: 'Karyawan tidak ditemukan.' }
    }

    // 2. Fetch site configuration (for requiresOnlineOvertimeSummary & cutoff day)
    let siteConfig = {
      requiresOnlineOvertimeSummary: false,
      overtimeSummaryCutoffDay: 25,
    }
    if (emp.siteId) {
      const [cfg] = await db
        .select({
          requiresOnlineOvertimeSummary: timesheetSchedulingConfigs.requiresOnlineOvertimeSummary,
          overtimeSummaryCutoffDay: timesheetSchedulingConfigs.overtimeSummaryCutoffDay,
        })
        .from(timesheetSchedulingConfigs)
        .where(eq(timesheetSchedulingConfigs.siteId, emp.siteId))
        .limit(1)

      if (cfg) {
        siteConfig = {
          requiresOnlineOvertimeSummary: Boolean(cfg.requiresOnlineOvertimeSummary),
          overtimeSummaryCutoffDay: cfg.overtimeSummaryCutoffDay ?? 25,
        }
      }
    }

    // 3. Find all SPLs for this employee in the month
    // Karyawan can be requester or participant
    const participantRows = await db
      .select({ splId: overtimeCommandLetterParticipants.overtimeCommandLetterId })
      .from(overtimeCommandLetterParticipants)
      .where(eq(overtimeCommandLetterParticipants.employeeId, employeeId))

    const participantSplIds = participantRows.map((r) => r.splId)

    // Base query for approved SPLs
    const splRecords = await db
      .select({
        id: overtimeCommandLetters.id,
        splNumber: overtimeCommandLetters.splNumber,
        title: overtimeCommandLetters.title,
        workDate: overtimeCommandLetters.workDate,
        plannedStartAt: overtimeCommandLetters.plannedStartAt,
        plannedEndAt: overtimeCommandLetters.plannedEndAt,
        status: overtimeCommandLetters.status,
        requestNotes: overtimeCommandLetters.requestNotes,
        requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
      })
      .from(overtimeCommandLetters)
      .where(
        and(
          eq(overtimeCommandLetters.status, 'approved'),
          sql`${overtimeCommandLetters.workDate}::text LIKE ${`${periodMonth}%`}`
        )
      )
      .orderBy(overtimeCommandLetters.workDate)

    const matchingSpls = splRecords.filter(
      (spl) => spl.requestedByEmployeeId === employeeId || participantSplIds.includes(spl.id)
    )

    // Fetch items for matching SPLs
    const matchingSplIds = matchingSpls.map((s) => s.id)
    const itemRows =
      matchingSplIds.length > 0
        ? await db
            .select({
              splId: overtimeCommandLetterItems.overtimeCommandLetterId,
              description: overtimeCommandLetterItems.description,
            })
            .from(overtimeCommandLetterItems)
            .where(inArray(overtimeCommandLetterItems.overtimeCommandLetterId, matchingSplIds))
        : []

    const itemsBySpl = new Map<number, string[]>()
    for (const it of itemRows) {
      if (!itemsBySpl.has(it.splId)) itemsBySpl.set(it.splId, [])
      if (it.description) itemsBySpl.get(it.splId)!.push(it.description)
    }

    let totalHours = 0
    const approvedItems: SummarySplApprovedItem[] = matchingSpls.map((spl) => {
      const duration = calculateDurationHours(spl.plannedStartAt, spl.plannedEndAt)
      totalHours += duration
      const descriptions = itemsBySpl.get(spl.id) || []
      return {
        id: spl.id,
        splNumber: spl.splNumber || `SPL-${spl.id}`,
        workDate: spl.workDate,
        dayName: getIndonesianDayName(spl.workDate),
        plannedStartAt: spl.plannedStartAt || '',
        plannedEndAt: spl.plannedEndAt || '',
        durationHours: duration,
        description: descriptions.join('; ') || spl.title || spl.requestNotes || '-',
        status: spl.status,
      }
    })

    totalHours = Math.round(totalHours * 10) / 10

    // 4. Check existing summary record in DB
    const [existingSummary] = await db
      .select()
      .from(overtimeSummaries)
      .where(
        and(
          eq(overtimeSummaries.employeeId, employeeId),
          eq(overtimeSummaries.periodMonth, periodMonth)
        )
      )
      .limit(1)

    let summaryDetail: OvertimeSummaryDetail | null = null
    if (existingSummary) {
      const approvalSteps = await db
        .select()
        .from(overtimeSummaryApprovals)
        .where(eq(overtimeSummaryApprovals.summaryId, existingSummary.id))
        .orderBy(overtimeSummaryApprovals.stepOrder)

      summaryDetail = {
        id: existingSummary.id,
        summaryNumber: existingSummary.summaryNumber,
        employeeId: existingSummary.employeeId,
        siteId: existingSummary.siteId,
        periodMonth: existingSummary.periodMonth,
        totalSplCount: existingSummary.totalSplCount,
        totalHours: Number(existingSummary.totalHours) || 0,
        status: existingSummary.status as any,
        currentStepOrder: existingSummary.currentStepOrder,
        maxStepOrder: existingSummary.maxStepOrder,
        notes: existingSummary.notes,
        generatedAutomatically: existingSummary.generatedAutomatically,
        submittedAt: existingSummary.submittedAt,
        approvedAt: existingSummary.approvedAt,
        rejectedAt: existingSummary.rejectedAt,
        rejectionReason: existingSummary.rejectionReason,
        approvals: approvalSteps.map((step) => ({
          id: step.id,
          summaryId: step.summaryId,
          stepOrder: step.stepOrder,
          stepLabel: step.stepLabel,
          approvalToken: step.approvalToken,
          approverEmployeeId: step.approverEmployeeId,
          approverName: step.approverName,
          approverEmail: step.approverEmail,
          approverRole: step.approverRole,
          status: step.status as any,
          signatureDataUrl: step.signatureDataUrl,
          remarks: step.remarks,
          signedAt: step.signedAt,
          createdAt: step.createdAt,
        })),
      }
    }

    // 5. Resolve signatories
    const allEmployeesList = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        jobTitle: employees.jobTitle,
        position: employees.jobTitle,
        role: employees.role,
        rank: employees.role,
        directManagerId: employees.directManagerId,
        sectionHeadId: masterSections.headEmployeeId,
        deptHeadId: masterDepartments.headEmployeeId,
        siteHeadId: sites.headEmployeeId,
      })
      .from(employees)
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .where(eq(employees.isActive, true))

    const isPjo = isEmployeePjo(emp)
    const signatories = resolveSummarySplSignatories({
      selectedEmployee: emp,
      allEmployees: allEmployeesList,
      fallbackEmployeeName: emp.name,
    })

    return {
      ok: true,
      employee: emp,
      isPjo,
      siteConfig,
      approvedItems,
      totalCount: approvedItems.length,
      totalHours,
      summary: summaryDetail,
      signatories,
    }
  } catch (error: any) {
    console.error('[getOvertimeSummaryWorkspaceDataAction] Error:', error)
    return { ok: false, error: error?.message || 'Gagal memuat data Summary SPL.' }
  }
}

/**
 * Submit Overtime Summary for Online Approval.
 */
export async function submitOvertimeSummaryAction(input: {
  employeeId: number
  periodMonth: string // "YYYY-MM"
  notes?: string
  isAuto?: boolean
}) {
  try {
    await ensureSchedulingTimesheetTables()
    const session = await getServerSession()
    const currentEmp = await getCurrentEmployee()
    const now = new Date()

    const { employeeId, periodMonth, notes, isAuto = false } = input

    // 1. Fetch employee details
    const [emp] = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        employeeSn: employees.employeeSn,
        position: employees.jobTitle,
        jobTitle: employees.jobTitle,
        rank: employees.role,
        role: employees.role,
        siteId: employees.siteId,
        departmentId: employees.departmentId,
        sectionId: employees.sectionId,
        directManagerId: employees.directManagerId,
        siteHeadId: sites.headEmployeeId,
        siteName: sites.name,
      })
      .from(employees)
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .where(eq(employees.id, employeeId))
      .limit(1)

    if (!emp) {
      return { ok: false, error: 'Karyawan tidak ditemukan.' }
    }

    // 2. Fetch approved SPL records for this employee in period
    const participantRows = await db
      .select({ splId: overtimeCommandLetterParticipants.overtimeCommandLetterId })
      .from(overtimeCommandLetterParticipants)
      .where(eq(overtimeCommandLetterParticipants.employeeId, employeeId))

    const participantSplIds = participantRows.map((r) => r.splId)

    const splRecords = await db
      .select({
        id: overtimeCommandLetters.id,
        splNumber: overtimeCommandLetters.splNumber,
        title: overtimeCommandLetters.title,
        workDate: overtimeCommandLetters.workDate,
        plannedStartAt: overtimeCommandLetters.plannedStartAt,
        plannedEndAt: overtimeCommandLetters.plannedEndAt,
        status: overtimeCommandLetters.status,
        requestNotes: overtimeCommandLetters.requestNotes,
        requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
      })
      .from(overtimeCommandLetters)
      .where(
        and(
          eq(overtimeCommandLetters.status, 'approved'),
          sql`${overtimeCommandLetters.workDate}::text LIKE ${`${periodMonth}%`}`
        )
      )
      .orderBy(overtimeCommandLetters.workDate)

    const matchingSpls = splRecords.filter(
      (spl) => spl.requestedByEmployeeId === employeeId || participantSplIds.includes(spl.id)
    )

    if (matchingSpls.length === 0) {
      return {
        ok: false,
        error: `Tidak ada SPL yang berstatus 'APPROVED' untuk ${emp.name} pada periode ${periodMonth}.`,
      }
    }

    // Calculate total hours
    let totalHours = 0
    const itemsSnapshot: SummarySplApprovedItem[] = matchingSpls.map((spl) => {
      const dur = calculateDurationHours(spl.plannedStartAt, spl.plannedEndAt)
      totalHours += dur
      return {
        id: spl.id,
        splNumber: spl.splNumber || `SPL-${spl.id}`,
        workDate: spl.workDate,
        dayName: getIndonesianDayName(spl.workDate),
        plannedStartAt: spl.plannedStartAt || '',
        plannedEndAt: spl.plannedEndAt || '',
        durationHours: dur,
        description: spl.title || spl.requestNotes || '-',
        status: spl.status,
      }
    })
    totalHours = Math.round(totalHours * 10) / 10

    // 3. Check existing summary
    const [existing] = await db
      .select()
      .from(overtimeSummaries)
      .where(
        and(
          eq(overtimeSummaries.employeeId, employeeId),
          eq(overtimeSummaries.periodMonth, periodMonth)
        )
      )
      .limit(1)

    if (existing && existing.status === 'approved') {
      return {
        ok: false,
        error: `Summary SPL periode ${periodMonth} sudah berstatus Disetujui (Approved).`,
      }
    }

    if (existing && existing.status === 'pending' && !isAuto) {
      return {
        ok: false,
        error: `Summary SPL periode ${periodMonth} sedang dalam proses approval.`,
      }
    }

    // 4. Resolve Approver Chain
    const allEmployeesList = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        jobTitle: employees.jobTitle,
        position: employees.jobTitle,
        role: employees.role,
        rank: employees.role,
        directManagerId: employees.directManagerId,
        sectionHeadId: masterSections.headEmployeeId,
        deptHeadId: masterDepartments.headEmployeeId,
        siteHeadId: sites.headEmployeeId,
      })
      .from(employees)
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .where(eq(employees.isActive, true))

    const isPjo = isEmployeePjo(emp)
    const signatories = resolveSummarySplSignatories({
      selectedEmployee: emp,
      allEmployees: allEmployeesList,
      fallbackEmployeeName: emp.name,
    })

    // Resolve approver employees
    const pjoApproverEmp = allEmployeesList.find(
      (e) => (e.name || '').trim().toLowerCase() === signatories.pjoName.trim().toLowerCase()
    )
    const leaderApproverEmp = allEmployeesList.find(
      (e) => (e.name || '').trim().toLowerCase() === signatories.leaderName.trim().toLowerCase()
    )

    const cleanMonth = periodMonth.replace('-', '')
    const summaryNumber = `SUM-SPL-${cleanMonth}-${String(emp.id).padStart(4, '0')}`
    const maxSteps = isPjo ? 1 : 2

    // 5. Database transaction to create or replace summary
    const summaryId = await db.transaction(async (tx) => {
      let currentSummaryId = existing?.id

      if (currentSummaryId) {
        // Delete existing approvals if re-submitting rejected/draft
        await tx
          .delete(overtimeSummaryApprovals)
          .where(eq(overtimeSummaryApprovals.summaryId, currentSummaryId))

        await tx
          .update(overtimeSummaries)
          .set({
            totalSplCount: matchingSpls.length,
            totalHours: String(totalHours) as any,
            splIdsSnapshot: matchingSpls.map((s) => s.id),
            itemsSnapshot: itemsSnapshot as any,
            status: 'pending',
            currentStepOrder: 1,
            maxStepOrder: maxSteps,
            notes: notes || null,
            generatedAutomatically: isAuto,
            submittedAt: now,
            approvedAt: null,
            rejectedAt: null,
            rejectionReason: null,
            updatedAt: now,
          })
          .where(eq(overtimeSummaries.id, currentSummaryId))
      } else {
        const [inserted] = await tx
          .insert(overtimeSummaries)
          .values({
            summaryNumber,
            employeeId,
            siteId: emp.siteId || 1,
            periodMonth,
            totalSplCount: matchingSpls.length,
            totalHours: String(totalHours) as any,
            splIdsSnapshot: matchingSpls.map((s) => s.id),
            itemsSnapshot: itemsSnapshot as any,
            status: 'pending',
            currentStepOrder: 1,
            maxStepOrder: maxSteps,
            notes: notes || null,
            generatedAutomatically: isAuto,
            submittedAt: now,
            createdByUserId: session?.user?.id || null,
            createdAt: now,
            updatedAt: now,
          })
          .returning({ id: overtimeSummaries.id })

        currentSummaryId = inserted.id
      }

      // Insert Approval Steps
      if (isPjo) {
        // PJO -> 1 Step (Leader)
        const tokenLeader = randomUUID()
        await tx.insert(overtimeSummaryApprovals).values({
          summaryId: currentSummaryId,
          stepOrder: 1,
          stepLabel: 'Approved by Leader',
          approvalToken: tokenLeader,
          approverEmployeeId: leaderApproverEmp?.id ?? null,
          approverName: signatories.leaderName,
          approverEmail: leaderApproverEmp?.email || 'leader@chitraparatama.com',
          approverRole: 'Leader / Manager',
          status: 'pending',
          createdAt: now,
        })
      } else {
        // Reguler -> 2 Steps (Step 1: PJO, Step 2: Leader)
        const tokenPjo = randomUUID()
        const tokenLeader = randomUUID()

        await tx.insert(overtimeSummaryApprovals).values([
          {
            summaryId: currentSummaryId,
            stepOrder: 1,
            stepLabel: 'Approved by PJO',
            approvalToken: tokenPjo,
            approverEmployeeId: pjoApproverEmp?.id ?? null,
            approverName: signatories.pjoName,
            approverEmail: pjoApproverEmp?.email || 'pjo@chitraparatama.com',
            approverRole: 'PJO Site',
            status: 'pending',
            createdAt: now,
          },
          {
            summaryId: currentSummaryId,
            stepOrder: 2,
            stepLabel: 'Approved by Leader',
            approvalToken: tokenLeader,
            approverEmployeeId: leaderApproverEmp?.id ?? null,
            approverName: signatories.leaderName,
            approverEmail: leaderApproverEmp?.email || 'leader@chitraparatama.com',
            approverRole: 'Leader / Manager',
            status: 'pending', // will be active when step 1 approves
            createdAt: now,
          },
        ])
      }

      return currentSummaryId
    })

    // 6. Send notification/email to Approver 1
    const firstApproverEmail = isPjo
      ? leaderApproverEmp?.email || 'leader@chitraparatama.com'
      : pjoApproverEmp?.email || 'pjo@chitraparatama.com'
    const firstApproverName = isPjo ? signatories.leaderName : signatories.pjoName

    try {
      await db.insert(notificationEvents).values({
        eventType: 'overtime_summary_approval',
        recipient: firstApproverEmail,
        payloadSnapshot: JSON.stringify({
          title: `Pengajuan Summary SPL: ${emp.name} (${periodMonth})`,
          summaryId,
          summaryNumber,
          employeeId: emp.id,
          employeeName: emp.name,
          employeeSn: emp.employeeSn,
          siteName: emp.siteName,
          periodMonth,
          totalSplCount: matchingSpls.length,
          totalHours,
          approverName: firstApproverName,
          approvalUrl: `/dashboard/approval?tab=overtime-summary&id=${summaryId}`,
        }),
      })
    } catch (notifErr) {
      console.warn('[submitOvertimeSummaryAction] Notification queue warning:', notifErr)
    }

    return {
      ok: true,
      summaryId,
      summaryNumber,
      message: `Summary SPL periode ${periodMonth} berhasil diajukan untuk approval.`,
    }
  } catch (error: any) {
    console.error('[submitOvertimeSummaryAction] Error:', error)
    return { ok: false, error: error?.message || 'Gagal mengajukan Summary SPL.' }
  }
}

/**
 * Approve Overtime Summary Step (PJO or Leader).
 */
export async function approveOvertimeSummaryAction(input: {
  summaryId: number
  stepOrder: number
  signatureDataUrl?: string
  remarks?: string
}) {
  try {
    await ensureSchedulingTimesheetTables()
    const session = await getServerSession()
    const currentEmp = await getCurrentEmployee()
    const now = new Date()

    const { summaryId, stepOrder, signatureDataUrl, remarks } = input

    // Fetch summary record
    const [summary] = await db
      .select()
      .from(overtimeSummaries)
      .where(eq(overtimeSummaries.id, summaryId))
      .limit(1)

    if (!summary) {
      return { ok: false, error: 'Dokumen Summary SPL tidak ditemukan.' }
    }

    if (summary.status !== 'pending') {
      return { ok: false, error: `Summary SPL berstatus '${summary.status}', tidak dapat diapprove.` }
    }

    // Fetch step
    const [step] = await db
      .select()
      .from(overtimeSummaryApprovals)
      .where(
        and(
          eq(overtimeSummaryApprovals.summaryId, summaryId),
          eq(overtimeSummaryApprovals.stepOrder, stepOrder)
        )
      )
      .limit(1)

    if (!step) {
      return { ok: false, error: `Tahap approval #${stepOrder} tidak ditemukan.` }
    }

    if (step.status === 'approved') {
      return { ok: false, error: `Tahap #${stepOrder} sudah disetujui sebelumnya.` }
    }

    // Update step to approved
    await db
      .update(overtimeSummaryApprovals)
      .set({
        status: 'approved',
        signatureDataUrl: signatureDataUrl || step.signatureDataUrl,
        remarks: remarks || step.remarks,
        signedAt: now,
      })
      .where(eq(overtimeSummaryApprovals.id, step.id))

    const isFinalStep = stepOrder >= summary.maxStepOrder

    if (isFinalStep) {
      // Complete Approval
      await db
        .update(overtimeSummaries)
        .set({
          status: 'approved',
          approvedAt: now,
          updatedAt: now,
        })
        .where(eq(overtimeSummaries.id, summaryId))

      // Notify employee
      const [emp] = await db
        .select({ email: employees.email, name: employees.name })
        .from(employees)
        .where(eq(employees.id, summary.employeeId))
        .limit(1)

      if (emp?.email) {
        try {
          await db.insert(notificationEvents).values({
            eventType: 'overtime_summary_approved',
            recipient: emp.email,
            payloadSnapshot: JSON.stringify({
              title: `Summary SPL ${summary.periodMonth} Disetujui Penuh!`,
              summaryId: summary.id,
              summaryNumber: summary.summaryNumber,
              periodMonth: summary.periodMonth,
              employeeName: emp.name,
              message: 'Seluruh tahap persetujuan Summary SPL Anda telah selesai.',
            }),
          })
        } catch (notifErr) {
          console.warn('[approveOvertimeSummaryAction] Final notif warning:', notifErr)
        }
      }
    } else {
      // Advance to Next Step
      const nextStepOrder = stepOrder + 1
      await db
        .update(overtimeSummaries)
        .set({
          currentStepOrder: nextStepOrder,
          updatedAt: now,
        })
        .where(eq(overtimeSummaries.id, summaryId))

      // Fetch next step approver and notify
      const [nextStep] = await db
        .select()
        .from(overtimeSummaryApprovals)
        .where(
          and(
            eq(overtimeSummaryApprovals.summaryId, summaryId),
            eq(overtimeSummaryApprovals.stepOrder, nextStepOrder)
          )
        )
        .limit(1)

      if (nextStep && nextStep.approverEmail) {
        try {
          await db.insert(notificationEvents).values({
            eventType: 'overtime_summary_approval',
            recipient: nextStep.approverEmail,
            payloadSnapshot: JSON.stringify({
              title: `Persetujuan Final Summary SPL: ${summary.summaryNumber}`,
              summaryId: summary.id,
              summaryNumber: summary.summaryNumber,
              periodMonth: summary.periodMonth,
              stepLabel: nextStep.stepLabel,
              approverName: nextStep.approverName,
              approvalUrl: `/dashboard/approval?tab=overtime-summary&id=${summary.id}`,
            }),
          })
        } catch (notifErr) {
          console.warn('[approveOvertimeSummaryAction] Next step notif warning:', notifErr)
        }
      }
    }

    return {
      ok: true,
      isFinalStep,
      message: isFinalStep
        ? 'Summary SPL berhasil disetujui penuh (Approved)!'
        : `Approval tahap #${stepOrder} berhasil disimpan, dilanjutkan ke tahap berikutnya.`,
    }
  } catch (error: any) {
    console.error('[approveOvertimeSummaryAction] Error:', error)
    return { ok: false, error: error?.message || 'Gagal memproses approval Summary SPL.' }
  }
}

/**
 * Reject Overtime Summary.
 */
export async function rejectOvertimeSummaryAction(input: {
  summaryId: number
  stepOrder: number
  rejectionReason: string
}) {
  try {
    await ensureSchedulingTimesheetTables()
    const { summaryId, stepOrder, rejectionReason } = input
    const now = new Date()

    if (!rejectionReason || !rejectionReason.trim()) {
      return { ok: false, error: 'Alasan penolakan wajib diisi.' }
    }

    const [summary] = await db
      .select()
      .from(overtimeSummaries)
      .where(eq(overtimeSummaries.id, summaryId))
      .limit(1)

    if (!summary) {
      return { ok: false, error: 'Dokumen Summary SPL tidak ditemukan.' }
    }

    // Update step
    await db
      .update(overtimeSummaryApprovals)
      .set({
        status: 'rejected',
        remarks: rejectionReason.trim(),
        signedAt: now,
      })
      .where(
        and(
          eq(overtimeSummaryApprovals.summaryId, summaryId),
          eq(overtimeSummaryApprovals.stepOrder, stepOrder)
        )
      )

    // Update summary
    await db
      .update(overtimeSummaries)
      .set({
        status: 'rejected',
        rejectedAt: now,
        rejectionReason: rejectionReason.trim(),
        updatedAt: now,
      })
      .where(eq(overtimeSummaries.id, summaryId))

    // Notify employee
    const [emp] = await db
      .select({ email: employees.email, name: employees.name })
      .from(employees)
      .where(eq(employees.id, summary.employeeId))
      .limit(1)

    if (emp?.email) {
      try {
        await db.insert(notificationEvents).values({
          eventType: 'overtime_summary_rejected',
          recipient: emp.email,
          payloadSnapshot: JSON.stringify({
            title: `Summary SPL ${summary.periodMonth} Ditolak`,
            summaryId: summary.id,
            summaryNumber: summary.summaryNumber,
            periodMonth: summary.periodMonth,
            employeeName: emp.name,
            reason: rejectionReason.trim(),
          }),
        })
      } catch (notifErr) {
        console.warn('[rejectOvertimeSummaryAction] Rejection notif warning:', notifErr)
      }
    }

    return {
      ok: true,
      message: 'Summary SPL berhasil ditolak (Rejected).',
    }
  } catch (error: any) {
    console.error('[rejectOvertimeSummaryAction] Error:', error)
    return { ok: false, error: error?.message || 'Gagal menolak Summary SPL.' }
  }
}

/**
 * Auto-generate Overtime Summaries for all active employees of a site on cut-off date.
 */
export async function autoGenerateOvertimeSummariesForSiteAction(params: {
  siteId: number
  periodMonth: string // "YYYY-MM"
}) {
  try {
    await ensureSchedulingTimesheetTables()
    const { siteId, periodMonth } = params

    // Check site config
    const [cfg] = await db
      .select({
        requiresOnlineOvertimeSummary: timesheetSchedulingConfigs.requiresOnlineOvertimeSummary,
        overtimeSummaryCutoffDay: timesheetSchedulingConfigs.overtimeSummaryCutoffDay,
      })
      .from(timesheetSchedulingConfigs)
      .where(eq(timesheetSchedulingConfigs.siteId, siteId))
      .limit(1)

    if (!cfg || !cfg.requiresOnlineOvertimeSummary) {
      return { ok: true, count: 0, message: 'Site tidak mengaktifkan approval online Summary SPL.' }
    }

    // Get all active employees in site
    const siteEmps = await db
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(and(eq(employees.siteId, siteId), eq(employees.isActive, true)))

    let submittedCount = 0
    for (const emp of siteEmps) {
      const res = await submitOvertimeSummaryAction({
        employeeId: emp.id,
        periodMonth,
        isAuto: true,
        notes: `Otomatis disubmit oleh sistem pada tanggal cut-off (${cfg.overtimeSummaryCutoffDay ?? 25}).`,
      })
      if (res.ok) {
        submittedCount++
      }
    }

    return {
      ok: true,
      count: submittedCount,
      message: `${submittedCount} Summary SPL berhasil digenerate otomatis.`,
    }
  } catch (error: any) {
    console.error('[autoGenerateOvertimeSummariesForSiteAction] Error:', error)
    return { ok: false, error: error?.message || 'Gagal menjalankan auto-generate summary.' }
  }
}
