'use server'

import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'
import { z } from 'zod'

import { db } from '@/db'
import {
  employees,
  masterDepartments,
  masterSections,
  masterPositions,
  overtimeApprovals,
  overtimeCommandLetterItems,
  overtimeCommandLetterParticipants,
  overtimeCommandLetters,
  dailyActivitySessions,
  hrPositions,
  sites,
  hcContractReviewSettings,
  emailTemplates,
} from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { auth } from '@/lib/auth'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getPublicAppUrl } from '@/lib/auth-config'
import { sendWorkflowEmail } from '@/lib/workflow-email'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { headers } from 'next/headers'
import {
  sendOvertimeStepApprovalEmail,
  sendOvertimeCompletedEmail,
  sendOvertimeRejectedEmail,
  sendOvertimeRevertedEmail,
} from '@/lib/activity-overtime-workflow-email'
import {
  type OvertimeWorkflowSettings,
  DEFAULT_OVERTIME_SETTINGS,
} from '@/lib/workflow-settings-defaults'

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Ignore when executed in test runner / background contexts
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

type ApprovalStep = {
  id: number
  stepOrder: number
  stepLabel: string
  approverName: string
  approverRole: string
  status: string
  signatureDataUrl: string | null
  remarks: string
  signedAt: Date | string | null
}

type Participant = {
  id: number
  employeeId: number
  employeeName: string
  category: string
  shiftCode: string
  rosterType: string
}

type LineItem = {
  id: number
  lineLabel: string
  lineDescription: string
  targetUnit: string
  estimatedMinutes: number
  plannedPoints: number
  sortOrder: number
}

type OvertimeApprovalData = {
  documentId: number
  splNumber: string
  title: string
  workDate: Date | string
  plannedStartAt: Date | string | null
  plannedEndAt: Date | string | null
  status: string
  requestNotes: string
  executionNotes: string
  origin: string
  requestedByEmployeeId?: number | null
  requesterName: string
  requesterDepartment: string
  requesterJobTitle: string
  participants: Participant[]
  lineItems: LineItem[]
  approvals: ApprovalStep[]
  permissions: {
    canApprove: boolean
    canEdit: boolean
    isRequester: boolean
  }
}

// ── Ensure Approval Steps Exist ────────────────────────────────────────────

async function ensureOvertimeApprovalsExist(documentId: number) {
  const existingSteps = await db
    .select()
    .from(overtimeApprovals)
    .where(eq(overtimeApprovals.overtimeCommandLetterId, documentId))
    .orderBy(asc(overtimeApprovals.stepOrder))

  if (existingSteps.length >= 3) {
    return
  }

  if (existingSteps.length > 0) {
    await db.delete(overtimeApprovals).where(eq(overtimeApprovals.overtimeCommandLetterId, documentId))
  }

  const [document] = await db
    .select({
      id: overtimeCommandLetters.id,
      splNumber: overtimeCommandLetters.splNumber,
      workDate: overtimeCommandLetters.workDate,
      requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
    })
    .from(overtimeCommandLetters)
    .where(eq(overtimeCommandLetters.id, documentId))
    .limit(1)

  if (!document) return

  const [requester] = document.requestedByEmployeeId
    ? await db
        .select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
          directManagerId: employees.directManagerId,
          departmentId: employees.departmentId,
          sectionId: employees.sectionId,
          siteId: employees.siteId,
          department: employees.department,
          section: employees.section,
        })
        .from(employees)
        .where(eq(employees.id, document.requestedByEmployeeId))
        .limit(1)
    : []

  // 1. Fetch dynamic workflow settings
  const settings = await getOvertimeWorkflowSettings()

  const [directManager] = requester?.directManagerId
    ? await db
        .select({ id: employees.id, name: employees.name, email: employees.email })
        .from(employees)
        .where(eq(employees.id, requester.directManagerId))
        .limit(1)
    : []

  // Resolve section name from masterSections or requester.section
  let sectionName = requester?.section || ''
  if (!sectionName && requester?.sectionId) {
    const [secRow] = await db
      .select({ name: masterSections.name })
      .from(masterSections)
      .where(eq(masterSections.id, requester.sectionId))
      .limit(1)
    if (secRow?.name) sectionName = secRow.name
  }

  // Check if settings.approvalMatrix has a matching section head
  let sectionHeadName = ''
  let sectionHeadEmail = ''
  let sectionHeadEmployeeId: number | null = null

  if (sectionName && settings.approvalMatrix?.sectionHeads) {
    const secList = Array.isArray(settings.approvalMatrix.sectionHeads)
      ? settings.approvalMatrix.sectionHeads
      : Object.values(settings.approvalMatrix.sectionHeads)

    const matched: any = secList.find((sh: any) =>
      sh.section && (
        sectionName.toLowerCase().includes(sh.section.toLowerCase()) ||
        sh.section.toLowerCase().includes(sectionName.toLowerCase())
      )
    )

    if (matched && matched.email) {
      sectionHeadName = matched.name
      sectionHeadEmail = matched.email
      const [empMatch] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email })
        .from(employees)
        .where(sql`LOWER(TRIM(${employees.email})) = ${String(matched.email).trim().toLowerCase()}`)
        .limit(1)
      if (empMatch) {
        sectionHeadEmployeeId = empMatch.id
        sectionHeadName = empMatch.name || sectionHeadName
      }
    }
  }

  // Fallback to database masterSections headEmployeeId if not matched in workflow settings
  if (!sectionHeadName && (requester?.sectionId || requester?.section)) {
    const [sectionRow] = requester.sectionId
      ? await db
          .select({ headEmployeeId: masterSections.headEmployeeId })
          .from(masterSections)
          .where(eq(masterSections.id, requester.sectionId))
          .limit(1)
      : await db
          .select({ headEmployeeId: masterSections.headEmployeeId })
          .from(masterSections)
          .where(sql`LOWER(TRIM(${masterSections.name})) = ${(requester.section || '').trim().toLowerCase()}`)
          .limit(1)

    if (sectionRow?.headEmployeeId) {
      const [secEmp] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email })
        .from(employees)
        .where(eq(employees.id, sectionRow.headEmployeeId))
        .limit(1)
      if (secEmp) {
        sectionHeadEmployeeId = secEmp.id
        sectionHeadName = secEmp.name
        sectionHeadEmail = secEmp.email || ''
      }
    }
  }

  // Fallback to masterDepartments headEmployeeId if still empty
  if (!sectionHeadName && (requester?.departmentId || requester?.department)) {
    const [deptRow] = requester.departmentId
      ? await db
          .select({ headEmployeeId: masterDepartments.headEmployeeId })
          .from(masterDepartments)
          .where(eq(masterDepartments.id, requester.departmentId))
          .limit(1)
      : await db
          .select({ headEmployeeId: masterDepartments.headEmployeeId })
          .from(masterDepartments)
          .where(sql`LOWER(TRIM(${masterDepartments.name})) = ${(requester.department || '').trim().toLowerCase()}`)
          .limit(1)

    if (deptRow?.headEmployeeId) {
      const [deptEmp] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email })
        .from(employees)
        .where(eq(employees.id, deptRow.headEmployeeId))
        .limit(1)
      if (deptEmp) {
        sectionHeadEmployeeId = deptEmp.id
        sectionHeadName = deptEmp.name
        sectionHeadEmail = deptEmp.email || ''
      }
    }
  }

  // Fallback to Site Head / PJO if still empty
  if (!sectionHeadName && requester?.siteId) {
    const [siteRow] = await db
      .select({ headEmployeeId: sites.headEmployeeId })
      .from(sites)
      .where(eq(sites.id, requester.siteId))
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

  // Resolve leader approver
  let leaderEmployeeId = directManager?.id ?? null
  let leaderName = directManager?.name ?? settings.approvalMatrix?.fieldPicName ?? ''
  let leaderEmail = directManager?.email || settings.approvalMatrix?.fieldPicEmail || ''

  if (!leaderEmployeeId && sectionHeadEmployeeId) {
    leaderEmployeeId = sectionHeadEmployeeId
    leaderName = sectionHeadName
    leaderEmail = sectionHeadEmail
  }

  // If section head still empty, fallback to settings.approvalMatrix.managerName or Section Head default
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

  const steps = [
    { stepOrder: 1, stepLabel: 'Karyawan Sign', approverRole: 'employee', employeeId: requester?.id ?? null, name: requester?.name ?? 'Karyawan', email: requester?.email || '', token: step1Token },
    { stepOrder: 2, stepLabel: 'Leader / Pengawas', approverRole: 'leader', employeeId: leaderEmployeeId, name: leaderName, email: leaderEmail, token: step2Token },
    { stepOrder: 3, stepLabel: 'Section Head', approverRole: 'section_head', employeeId: sectionHeadEmployeeId, name: sectionHeadName, email: sectionHeadEmail, token: step3Token },
  ]

  for (const step of steps) {
    const isStep1 = step.stepOrder === 1
    await db
      .insert(overtimeApprovals)
      .values({
        overtimeCommandLetterId: documentId,
        stepOrder: step.stepOrder,
        stepLabel: step.stepLabel,
        approvalToken: step.token,
        approverEmployeeId: step.employeeId,
        approverName: step.name,
        approverEmail: step.email,
        approverRole: step.approverRole,
        status: isStep1 ? 'pending' : 'waiting',
        signedAt: null,
        createdAt: new Date(),
      })
      .onConflictDoNothing({
        target: [overtimeApprovals.overtimeCommandLetterId, overtimeApprovals.stepOrder],
      })
  }

  // Send initial step 1 email
  if (requester?.email) {
    await sendOvertimeStepApprovalEmail({
      documentId: document.id,
      splNumber: document.splNumber || `SPL-${document.id}`,
      workDate: document.workDate,
      employeeName: requester.name || 'Karyawan',
      requesterName: requester.name || 'Karyawan',
      approverName: requester.name || 'Karyawan',
      approverEmail: requester.email,
      approvalStep: 'Karyawan Sign',
      approvalToken: step1Token,
    })
  }
}

// ── Get Overtime Approval Data ─────────────────────────────────────────────

export async function getOvertimeApprovalData(documentId: number): Promise<OvertimeApprovalData | null> {
  await ensureOvertimeApprovalsExist(documentId)

  const [document] = await db
    .select()
    .from(overtimeCommandLetters)
    .where(eq(overtimeCommandLetters.id, documentId))
    .limit(1)

  if (!document) return null

  const [requester] = await db
    .select({
      name: employees.name,
      department: masterDepartments.name,
      jobTitle: employees.jobTitle,
    })
    .from(employees)
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .where(eq(employees.id, document.requestedByEmployeeId))
    .limit(1)

  const participantRows = await db
    .select({
      id: overtimeCommandLetterParticipants.id,
      employeeId: overtimeCommandLetterParticipants.employeeId,
      category: overtimeCommandLetterParticipants.category,
      shiftCode: overtimeCommandLetterParticipants.shiftCode,
      rosterType: overtimeCommandLetterParticipants.rosterType,
      name: employees.name,
    })
    .from(overtimeCommandLetterParticipants)
    .leftJoin(employees, eq(overtimeCommandLetterParticipants.employeeId, employees.id))
    .where(eq(overtimeCommandLetterParticipants.overtimeCommandLetterId, documentId))

  const lineItemRows = await db
    .select()
    .from(overtimeCommandLetterItems)
    .where(eq(overtimeCommandLetterItems.overtimeCommandLetterId, documentId))
    .orderBy(asc(overtimeCommandLetterItems.sortOrder), asc(overtimeCommandLetterItems.id))

  const approvalRows = await db
    .select()
    .from(overtimeApprovals)
    .where(eq(overtimeApprovals.overtimeCommandLetterId, documentId))
    .orderBy(asc(overtimeApprovals.stepOrder))

  // Check permissions
  const session = await getServerSession()
  const [currentEmployee] = session?.user?.email
    ? await db
        .select({ id: employees.id, accessRole: employees.accessRole })
        .from(employees)
        .where(sql`lower(${employees.email}) = ${session.user.email.trim().toLowerCase()}`)
        .limit(1)
    : []

  const canApprove = Boolean(currentEmployee) && approvalRows.some(
    (a) => a.status === 'pending' && (a.approverEmployeeId === currentEmployee?.id || ['Super Admin', 'Site Admin', 'HC Manager'].includes(currentEmployee?.accessRole ?? ''))
  )

  return {
    documentId: document.id,
    splNumber: document.splNumber,
    title: document.title,
    workDate: document.workDate,
    plannedStartAt: document.plannedStartAt,
    plannedEndAt: document.plannedEndAt,
    status: document.status,
    requestNotes: document.requestNotes,
    executionNotes: document.executionNotes,
    origin: document.origin,
    requestedByEmployeeId: document.requestedByEmployeeId,
    requesterName: requester?.name ?? '',
    requesterDepartment: requester?.department ?? '',
    requesterJobTitle: requester?.jobTitle ?? '',
    participants: participantRows.map((p) => ({
      id: p.id,
      employeeId: p.employeeId,
      employeeName: p.name ?? '',
      category: p.category,
      shiftCode: p.shiftCode,
      rosterType: p.rosterType,
    })),
    lineItems: lineItemRows.map((l) => ({
      id: l.id,
      lineLabel: l.lineLabel,
      lineDescription: l.lineDescription,
      targetUnit: l.targetUnit,
      estimatedMinutes: l.estimatedMinutes,
      plannedPoints: l.plannedPoints,
      sortOrder: l.sortOrder,
    })),
    approvals: approvalRows.map((a) => ({
      id: a.id,
      stepOrder: a.stepOrder,
      stepLabel: a.stepLabel,
      approverName: a.approverName,
      approverRole: a.approverRole,
      approverEmployeeId: a.approverEmployeeId,
      approverEmail: a.approverEmail,
      status: a.status,
      signatureDataUrl: a.signatureDataUrl,
      remarks: a.remarks,
      signedAt: a.signedAt,
    })),
    permissions: {
      canApprove,
      canEdit: document.status === 'draft' || document.status === 'returned' || document.status === 'reverted',
      isRequester: currentEmployee?.id === document.requestedByEmployeeId,
      currentEmployeeId: currentEmployee?.id ?? null,
      currentEmployeeEmail: session?.user?.email ?? null,
      currentEmployeeName: session?.user?.name ?? null,
      accessRole: currentEmployee?.accessRole ?? 'Staff',
    } as any,
  }
}

// ── Save Overtime Approval Form ────────────────────────────────────────────

const saveOvertimeApprovalFormSchema = z.object({
  documentId: z.coerce.number().int().positive(),
  itemRemarks: z.record(z.string(), z.string()).optional().default({}),
  leaderName: z.string().optional().default(''),
  leaderTitle: z.string().optional().default(''),
  superiorName: z.string().optional().default(''),
  superiorTitle: z.string().optional().default(''),
})

export async function saveOvertimeApprovalForm(params: {
  documentId: number
  requestedByEmployeeId?: number | null
  title?: string
  workDate?: string | Date
  plannedStartAt?: string | Date | null
  plannedEndAt?: string | Date | null
  requestNotes?: string
  status?: string
  participants?: Array<{
    id?: number
    employeeId: number
    employeeName?: string
    shiftCode: string
    rosterType: string
    category: string
  }>
  lineItems?: Array<{
    id?: number
    lineLabel: string
    targetUnit?: string
    estimatedMinutes?: number
    plannedPoints?: number
    lineDescription?: string
  }>
  itemRemarks?: Record<number, string>
  leaderName?: string
  leaderTitle?: string
  superiorName?: string
  superiorTitle?: string
  managerName?: string
  managerTitle?: string
  signatures?: Record<number, string>
  stepRemarks?: Record<number, string>
  signatories?: Array<{
    id?: number
    stepOrder?: number
    name?: string
    email?: string
    employeeId?: number
    signatureDataUrl?: string
  }>
}) {
  try {
    const updateData: Record<string, any> = { updatedAt: new Date() }
    if (params.requestedByEmployeeId) updateData.requestedByEmployeeId = params.requestedByEmployeeId
    if (params.title !== undefined) updateData.title = params.title
    if (params.workDate && !isNaN(new Date(params.workDate).getTime())) updateData.workDate = new Date(params.workDate)
    if (params.plannedStartAt && !isNaN(new Date(params.plannedStartAt).getTime())) updateData.plannedStartAt = new Date(params.plannedStartAt)
    if (params.plannedEndAt && !isNaN(new Date(params.plannedEndAt).getTime())) updateData.plannedEndAt = new Date(params.plannedEndAt)
    if (params.requestNotes !== undefined) updateData.requestNotes = params.requestNotes
    if (params.status) updateData.status = params.status

    const [existingDoc] = await db
      .select({
        id: overtimeCommandLetters.id,
        status: overtimeCommandLetters.status,
        splNumber: overtimeCommandLetters.splNumber,
        title: overtimeCommandLetters.title,
        workDate: overtimeCommandLetters.workDate,
        requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
      })
      .from(overtimeCommandLetters)
      .where(eq(overtimeCommandLetters.id, params.documentId))
      .limit(1)

    if (existingDoc && (existingDoc.status || '').toLowerCase() === 'rejected') {
      return {
        success: false as const,
        error: 'Aksi ditolak: Dokumen yang sudah ditolak (rejected) tidak dapat diedit atau diajukan ulang. Silakan buat dokumen baru.',
      }
    }

    const isCurrentlyReverted = (existingDoc?.status || '').toLowerCase() === 'reverted' || params.status === 'Submitted' || params.status === 'resubmit'

    if (isCurrentlyReverted) {
      updateData.status = 'Submitted'
      
      // Smart Resume: Find the specific reverted step and restore ONLY that step to pending
      const revertedSteps = await db
        .select()
        .from(overtimeApprovals)
        .where(
          and(
            eq(overtimeApprovals.overtimeCommandLetterId, params.documentId),
            eq(overtimeApprovals.status, 'reverted')
          )
        )
        .orderBy(asc(overtimeApprovals.stepOrder))

      if (revertedSteps.length > 0) {
        const targetStep = revertedSteps[0]
        await db
          .update(overtimeApprovals)
          .set({
            status: 'pending',
            signatureDataUrl: null,
            signedAt: null,
          })
          .where(eq(overtimeApprovals.id, targetStep.id))

        const [requester] = existingDoc?.requestedByEmployeeId
          ? await db.select({ name: employees.name }).from(employees).where(eq(employees.id, existingDoc.requestedByEmployeeId)).limit(1)
          : []

        try {
          await sendOvertimeStepApprovalEmail({
            documentId: params.documentId,
            splNumber: existingDoc?.splNumber || `SPL-${params.documentId}`,
            title: existingDoc?.title || 'Penugasan Lembur Operasional',
            workDate: existingDoc?.workDate,
            employeeName: requester?.name || 'Pemohon',
            requesterName: requester?.name || 'Pemohon',
            approverName: targetStep.approverName || 'Approver',
            approverEmail: targetStep.approverEmail || '',
            approvalStep: targetStep.stepLabel,
            approvalToken: targetStep.approvalToken,
          })
        } catch (mailErr) {
          console.error('Error sending smart resume overtime email:', mailErr)
        }
      }
    }

    await db
      .update(overtimeCommandLetters)
      .set(updateData)
      .where(eq(overtimeCommandLetters.id, params.documentId))

    // If participants provided, sync participants
    if (params.participants && Array.isArray(params.participants)) {
      await db
        .delete(overtimeCommandLetterParticipants)
        .where(eq(overtimeCommandLetterParticipants.overtimeCommandLetterId, params.documentId))

      for (const p of params.participants) {
        if (p.employeeId) {
          await db.insert(overtimeCommandLetterParticipants).values({
            overtimeCommandLetterId: params.documentId,
            employeeId: p.employeeId,
            category: p.category || 'after_mandatory_ot',
            shiftCode: p.shiftCode || 'DS',
            rosterType: p.rosterType || '5:2',
          })
        }
      }
    }

    // If line items provided, sync line items
    if (params.lineItems && Array.isArray(params.lineItems)) {
      await db
        .delete(overtimeCommandLetterItems)
        .where(eq(overtimeCommandLetterItems.overtimeCommandLetterId, params.documentId))

      for (let idx = 0; idx < params.lineItems.length; idx++) {
        const item = params.lineItems[idx]
        if (item && item.lineLabel) {
          await db.insert(overtimeCommandLetterItems).values({
            overtimeCommandLetterId: params.documentId,
            lineLabel: item.lineLabel,
            lineDescription: item.lineDescription || '',
            targetUnit: item.targetUnit || '',
            estimatedMinutes: Number(item.estimatedMinutes) || 60,
            plannedPoints: Number(item.plannedPoints) || 10,
            sortOrder: idx + 1,
          })
        }
      }
    }

    // If signatories provided, sync approver names and employee IDs in overtimeApprovals
    if (params.signatories && Array.isArray(params.signatories)) {
      for (const sig of params.signatories) {
        if (!sig) continue
        const updateSig: Record<string, any> = {}
        if (sig.name) updateSig.approverName = sig.name
        if (sig.email) updateSig.approverEmail = sig.email
        if (sig.employeeId) {
          updateSig.approverEmployeeId = sig.employeeId
          const [emp] = await db
            .select({ id: employees.id, name: employees.name, email: employees.email })
            .from(employees)
            .where(eq(employees.id, sig.employeeId))
            .limit(1)
          if (emp) {
            if (!sig.email && emp.email) updateSig.approverEmail = emp.email
            if (!sig.name && emp.name) updateSig.approverName = emp.name
          }
        }
        if (sig.signatureDataUrl) {
          updateSig.signatureDataUrl = sig.signatureDataUrl
          updateSig.signedAt = new Date()
        }
        if (Object.keys(updateSig).length > 0) {
          if (sig.id) {
            await db.update(overtimeApprovals).set(updateSig).where(eq(overtimeApprovals.id, sig.id))
          } else if (sig.stepOrder) {
            await db
              .update(overtimeApprovals)
              .set(updateSig)
              .where(
                and(
                  eq(overtimeApprovals.overtimeCommandLetterId, params.documentId),
                  eq(overtimeApprovals.stepOrder, sig.stepOrder)
                )
              )
          }
        }
      }
    }

    // Direct role updates if passed
    if (params.leaderName || params.superiorName || params.managerName) {
      if (params.leaderName) {
        await db
          .update(overtimeApprovals)
          .set({ approverName: params.leaderName })
          .where(
            and(
              eq(overtimeApprovals.overtimeCommandLetterId, params.documentId),
              sql`LOWER(${overtimeApprovals.approverRole}) IN ('leader', 'pjo_or_te_initial')`
            )
          )
      }
      if (params.superiorName) {
        await db
          .update(overtimeApprovals)
          .set({ approverName: params.superiorName })
          .where(
            and(
              eq(overtimeApprovals.overtimeCommandLetterId, params.documentId),
              sql`LOWER(${overtimeApprovals.approverRole}) IN ('section_head', 'section_head_confirmation')`
            )
          )
      }
      if (params.managerName) {
        await db
          .update(overtimeApprovals)
          .set({ approverName: params.managerName })
          .where(
            and(
              eq(overtimeApprovals.overtimeCommandLetterId, params.documentId),
              sql`LOWER(${overtimeApprovals.approverRole}) IN ('manager', 'department_head')`
            )
          )
      }
    }

    // If stepRemarks provided alone, save remarks to step approvals
    if (params.stepRemarks && typeof params.stepRemarks === 'object') {
      for (const [stepIdStr, remark] of Object.entries(params.stepRemarks)) {
        const stepId = Number(stepIdStr)
        if (stepId && remark !== undefined) {
          await db
            .update(overtimeApprovals)
            .set({ remarks: remark })
            .where(eq(overtimeApprovals.id, stepId))
        }
      }
    }

    if (params.signatures && typeof params.signatures === 'object') {
      for (const [stepIdStr, sigUrl] of Object.entries(params.signatures || {})) {
        const stepId = Number(stepIdStr)
        if (stepId && sigUrl) {
          const [currentStep] = await db
            .select()
            .from(overtimeApprovals)
            .where(eq(overtimeApprovals.id, stepId))
            .limit(1)

          if (currentStep && currentStep.status !== 'approved') {
            await db
              .update(overtimeApprovals)
              .set({
                signatureDataUrl: sigUrl,
                signedAt: new Date(),
                status: 'approved',
                remarks: params.stepRemarks?.[stepId] ?? undefined,
              })
              .where(eq(overtimeApprovals.id, stepId))

            // Unlock next step
            const [nextStep] = await db
              .select()
              .from(overtimeApprovals)
              .where(
                and(
                  eq(overtimeApprovals.overtimeCommandLetterId, params.documentId),
                  sql`${overtimeApprovals.stepOrder} > ${currentStep.stepOrder}`
                )
              )
              .orderBy(asc(overtimeApprovals.stepOrder))
              .limit(1)

            const [doc] = await db
              .select()
              .from(overtimeCommandLetters)
              .where(eq(overtimeCommandLetters.id, params.documentId))
              .limit(1)

            if (nextStep) {
              if (nextStep.status !== 'approved') {
                await db
                  .update(overtimeApprovals)
                  .set({ status: 'pending' })
                  .where(eq(overtimeApprovals.id, nextStep.id))

                if (nextStep.approverEmail) {
                  await sendOvertimeStepApprovalEmail({
                    documentId: params.documentId,
                    splNumber: doc?.splNumber || `SPL-${params.documentId}`,
                    title: doc?.title || 'Penugasan Lembur Operasional',
                    workDate: doc?.workDate,
                    employeeName: currentStep.approverName || 'Pemohon',
                    requesterName: currentStep.approverName || 'Pemohon',
                    approverName: nextStep.approverName || 'Approver',
                    approverEmail: nextStep.approverEmail,
                    approvalStep: nextStep.stepLabel,
                    approvalToken: nextStep.approvalToken,
                  })
                }
              }
            } else {
              await db
                .update(overtimeCommandLetters)
                .set({ status: 'approved', updatedAt: new Date() })
                .where(eq(overtimeCommandLetters.id, params.documentId))

              if (currentStep.approverEmail) {
                await sendOvertimeCompletedEmail({
                  documentId: params.documentId,
                  splNumber: doc?.splNumber || `SPL-${params.documentId}`,
                  title: doc?.title || 'Penugasan Lembur Operasional',
                  requesterName: currentStep.approverName || 'Pemohon',
                  requesterEmail: currentStep.approverEmail,
                })
              }
            }
          }
        }
      }
    }

    safeRevalidatePath('/dashboard/overtime-requests')
    safeRevalidatePath(`/dashboard/overtime-requests/${params.documentId}`)
    safeRevalidatePath(`/dashboard/overtime-requests/${params.documentId}/approval`)
    safeRevalidatePath('/mobile/overtime')
    safeRevalidatePath('/dashboard/approval')
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Terjadi kesalahan' }
  }
}

export async function resubmitOvertimeCommandLetterAction(params: Parameters<typeof saveOvertimeApprovalForm>[0]) {
  return saveOvertimeApprovalForm({
    ...params,
    status: 'Submitted',
  })
}

// ── Submit Overtime Approval Step ──────────────────────────────────────────

type SubmitActionState = { status: 'idle' | 'success' | 'error'; message: string }

export async function submitOvertimeApprovalStepAction(
  _state: SubmitActionState,
  formData: FormData
): Promise<SubmitActionState> {
  try {
    const documentId = Number(formData.get('sessionId'))
    const approvalId = Number(formData.get('approvalId'))
    const action = formData.get('action')
    let signatureDataUrl = (formData.get('signatureDataUrl') as string) || ''
    const remarks = (formData.get('remarks') as string) || ''

    if (!documentId || !approvalId) {
      return { status: 'error', message: 'Parameter tidak valid.' }
    }

    const [document] = await db
      .select({
        id: overtimeCommandLetters.id,
        splNumber: overtimeCommandLetters.splNumber,
        title: overtimeCommandLetters.title,
        workDate: overtimeCommandLetters.workDate,
        requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
      })
      .from(overtimeCommandLetters)
      .where(eq(overtimeCommandLetters.id, documentId))
      .limit(1)

    if (!document) {
      return { status: 'error', message: 'Dokumen SPL tidak ditemukan.' }
    }

    const [requester] = document.requestedByEmployeeId
      ? await db
          .select({ name: employees.name, email: employees.email })
          .from(employees)
          .where(eq(employees.id, document.requestedByEmployeeId))
          .limit(1)
      : []

    const [approval] = await db
      .select()
      .from(overtimeApprovals)
      .where(eq(overtimeApprovals.id, approvalId))
      .limit(1)

    if (!approval) {
      return { status: 'error', message: 'Approval step tidak ditemukan.' }
    }

    const now = new Date()

    if (action === 'revert') {
      // 1. Mark reverting step as reverted, clearing signature and timestamp
      await db
        .update(overtimeApprovals)
        .set({
          status: 'reverted',
          remarks: remarks || 'Dokumen SPL dikembalikan untuk revisi.',
          signatureDataUrl: null,
          signedAt: null,
        })
        .where(eq(overtimeApprovals.id, approval.id))

      // 2. Reset steps AFTER reverting step to waiting
      await db
        .update(overtimeApprovals)
        .set({
          status: 'waiting',
        })
        .where(
          and(
            eq(overtimeApprovals.overtimeCommandLetterId, documentId),
            sql`${overtimeApprovals.stepOrder} > ${approval.stepOrder}`
          )
        )

      // 3. Set Step 1 to pending for re-submission (PRESERVING existing signatures!)
      await db
        .update(overtimeApprovals)
        .set({
          status: 'pending',
        })
        .where(
          and(
            eq(overtimeApprovals.overtimeCommandLetterId, documentId),
            eq(overtimeApprovals.stepOrder, 1)
          )
        )

      // 4. Update master SPL status to reverted
      await db
        .update(overtimeCommandLetters)
        .set({ status: 'reverted', updatedAt: now })
        .where(eq(overtimeCommandLetters.id, documentId))

      const [step1] = await db
        .select()
        .from(overtimeApprovals)
        .where(
          and(
            eq(overtimeApprovals.overtimeCommandLetterId, documentId),
            eq(overtimeApprovals.stepOrder, 1)
          )
        )
        .limit(1)

      if (requester?.email || step1?.approverEmail) {
        await sendOvertimeRevertedEmail({
          documentId,
          splNumber: document.splNumber,
          title: document.title,
          targetApproverName: step1?.approverName || requester?.name || 'Pemohon',
          targetApproverEmail: step1?.approverEmail || requester?.email || '',
          managerName: approval.approverName || 'Department Head',
          revertReason: remarks,
        })

        await notifyWorkflowBellRecipients({
          recipientEmails: [requester?.email, step1?.approverEmail].filter(Boolean) as string[],
          eventType: 'overtime_reverted',
          category: 'approval_requests',
          title: `SPL Dikembalikan: #${document.splNumber}`,
          body: `Surat Perintah Lembur #${document.splNumber} dikembalikan untuk revisi oleh ${approval.approverName || 'Approver'}.${remarks ? ` Catatan: ${remarks}` : ''}`,
          url: `/dashboard/overtime-requests/${documentId}/approval`,
          tagPrefix: 'overtime-reverted',
          metadata: { documentId },
        }).catch((err) => console.error('Error notifying bell on revert:', err))
      }

      safeRevalidatePath('/dashboard/overtime-requests')
      safeRevalidatePath(`/dashboard/overtime-requests/${documentId}/approval`)
      return { status: 'success', message: 'Dokumen SPL berhasil dikembalikan (revert) untuk revisi.' }
    }

    if (approval.status !== 'pending') {
      return { status: 'error', message: 'Step ini belum aktif atau sudah diproses. Silakan ikuti alur berurutan (sequential).' }
    }

    // Check sequential: all previous steps must be approved
    const [prevStep] = await db
      .select({ status: overtimeApprovals.status })
      .from(overtimeApprovals)
      .where(
        and(
          eq(overtimeApprovals.overtimeCommandLetterId, documentId),
          sql`${overtimeApprovals.stepOrder} < ${approval.stepOrder}`
        )
      )
      .orderBy(desc(overtimeApprovals.stepOrder))
      .limit(1)

    if (prevStep && prevStep.status !== 'approved') {
      return {
        status: 'error',
        message: 'Step sebelumnya belum disetujui. Silakan selesaikan step sebelumnya terlebih dahulu sesuai alur urutan sequential.',
      }
    }

    if (action === 'approve') {
      let resolvedSignatureDataUrl = signatureDataUrl || ''
      if (!resolvedSignatureDataUrl) {
        if (approval.signatureDataUrl) {
          resolvedSignatureDataUrl = approval.signatureDataUrl
        } else {
          if (approval.approverEmployeeId) {
            const [empSig] = await db
              .select({ signatureDataUrl: employees.signatureDataUrl })
              .from(employees)
              .where(eq(employees.id, approval.approverEmployeeId))
              .limit(1)
            if (empSig?.signatureDataUrl) {
              resolvedSignatureDataUrl = empSig.signatureDataUrl
            }
          }
          if (!resolvedSignatureDataUrl) {
            const currentEmp = await getCurrentEmployee()
            if (currentEmp?.signatureDataUrl) {
              resolvedSignatureDataUrl = currentEmp.signatureDataUrl
            }
          }
        }
      }

      if (!resolvedSignatureDataUrl) {
        return {
          status: 'error',
          message: 'Anda belum mendaftarkan tanda tangan. Silakan daftarkan tanda tangan terlebih dahulu.',
        }
      }

      await db
        .update(overtimeApprovals)
        .set({
          status: 'approved',
          signatureDataUrl: resolvedSignatureDataUrl,
          remarks,
          signedAt: now,
        })
        .where(eq(overtimeApprovals.id, approvalId))

      // Persist signature to employees table for approver & current user
      try {
        if (approval.approverEmployeeId) {
          await db
            .update(employees)
            .set({ signatureDataUrl: resolvedSignatureDataUrl, signatureRegisteredAt: now })
            .where(eq(employees.id, approval.approverEmployeeId))
        }
        if (approval.approverEmail) {
          await db
            .update(employees)
            .set({ signatureDataUrl: resolvedSignatureDataUrl, signatureRegisteredAt: now })
            .where(sql`LOWER(TRIM(${employees.email})) = ${approval.approverEmail.trim().toLowerCase()}`)
        }
        const currentEmp = await getCurrentEmployee()
        if (currentEmp) {
          await db
            .update(employees)
            .set({ signatureDataUrl: resolvedSignatureDataUrl, signatureRegisteredAt: now })
            .where(eq(employees.id, currentEmp.id))
        }
      } catch (empErr) {
        console.error('Error persisting employee signature in submitOvertimeApprovalStepAction:', empErr)
      }

      // Unlock next step
      const [nextStep] = await db
        .select()
        .from(overtimeApprovals)
        .where(
          and(
            eq(overtimeApprovals.overtimeCommandLetterId, documentId),
            sql`${overtimeApprovals.stepOrder} > ${approval.stepOrder}`
          )
        )
        .orderBy(asc(overtimeApprovals.stepOrder))
        .limit(1)

      if (nextStep) {
        if (nextStep.status !== 'approved') {
          await db
            .update(overtimeApprovals)
            .set({ status: 'pending' })
            .where(eq(overtimeApprovals.id, nextStep.id))

          // Send sequential email notification to next approver
          if (nextStep.approverEmail) {
            await sendOvertimeStepApprovalEmail({
              documentId,
              splNumber: document.splNumber,
              title: document.title,
              workDate: document.workDate,
              employeeName: requester?.name || 'Pemohon',
              requesterName: requester?.name || 'Pemohon',
              approverName: nextStep.approverName || 'Approver',
              approverEmail: nextStep.approverEmail,
              approvalStep: nextStep.stepLabel,
              approvalToken: nextStep.approvalToken,
            })

            await notifyWorkflowBellRecipients({
              recipientEmails: [nextStep.approverEmail],
              eventType: 'overtime_approval_needed',
              category: 'approval_requests',
              title: `Approval SPL - ${nextStep.stepLabel}`,
              body: `Dokumen SPL #${document.splNumber} memerlukan approval/tanda tangan Anda pada tahap ${nextStep.stepLabel}.`,
              url: `/dashboard/overtime-requests/${documentId}/approval`,
              tagPrefix: 'overtime-approval',
              metadata: { documentId, stepOrder: nextStep.stepOrder, token: nextStep.approvalToken },
            }).catch((err) => console.error('Error notifying next approver bell:', err))
          }
        }
      } else {
        // All steps approved — update SPL status
        await db
          .update(overtimeCommandLetters)
          .set({ status: 'approved', approvedByEmployeeId: approval.approverEmployeeId, updatedAt: now })
          .where(eq(overtimeCommandLetters.id, documentId))

        if (requester?.email) {
          await sendOvertimeCompletedEmail({
            documentId,
            splNumber: document.splNumber,
            title: document.title,
            requesterName: requester.name || 'Pemohon',
            requesterEmail: requester.email,
          })

          await notifyWorkflowBellRecipients({
            recipientEmails: [requester.email],
            eventType: 'overtime_approved',
            category: 'approval_requests',
            title: `SPL Disetujui: #${document.splNumber}`,
            body: `Surat Perintah Lembur #${document.splNumber} telah disetujui lengkap oleh seluruh approver.`,
            url: `/dashboard/overtime-requests`,
            tagPrefix: 'overtime-approved',
            metadata: { documentId },
          }).catch((err) => console.error('Error notifying requester on completed:', err))
        }
      }
    } else if (action === 'reject') {
      await db
        .update(overtimeApprovals)
        .set({ status: 'rejected', remarks, signatureDataUrl: null, signedAt: null })
        .where(eq(overtimeApprovals.id, approvalId))

      await db
        .update(overtimeApprovals)
        .set({ status: 'cancelled', remarks: '' })
        .where(
          and(
            eq(overtimeApprovals.overtimeCommandLetterId, documentId),
            sql`${overtimeApprovals.stepOrder} > ${approval.stepOrder}`
          )
        )

      await db
        .update(overtimeCommandLetters)
        .set({ status: 'rejected', updatedAt: now })
        .where(eq(overtimeCommandLetters.id, documentId))

      if (requester?.email) {
        await sendOvertimeRejectedEmail({
          documentId,
          splNumber: document.splNumber,
          title: document.title,
          requesterName: requester.name,
          requesterEmail: requester.email,
          approverName: approval.approverName || 'Approver',
          remarks,
        })

        await notifyWorkflowBellRecipients({
          recipientEmails: [requester.email],
          eventType: 'overtime_rejected',
          category: 'approval_requests',
          title: `SPL Ditolak: #${document.splNumber}`,
          body: `Surat Perintah Lembur #${document.splNumber} ditolak oleh ${approval.approverName || 'Approver'}.${remarks ? ` Alasan: ${remarks}` : ''}`,
          url: `/dashboard/overtime-requests`,
          tagPrefix: 'overtime-rejected',
          metadata: { documentId },
        }).catch((err) => console.error('Error notifying requester on rejected:', err))
      }
    }

    safeRevalidatePath('/dashboard/overtime-requests')
    safeRevalidatePath(`/dashboard/overtime-requests/${documentId}/approval`)
    return { status: 'success', message: 'Approval berhasil diproses.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Terjadi kesalahan.' }
  }
}

// ── Delete Overtime Command Letter Action ──────────────────────────────────

export async function deleteOvertimeCommandLetterAction(documentId: number): Promise<{ success: boolean; error?: string }> {
  try {
    const emp = await getCurrentEmployee()
    if (!emp) {
      throw new Error('Sesi login tidak ditemukan.')
    }

    const [document] = await db
      .select()
      .from(overtimeCommandLetters)
      .where(eq(overtimeCommandLetters.id, documentId))
      .limit(1)

    if (!document) throw new Error('Dokumen SPL tidak ditemukan.')

    // Unlink any parent SPL references
    await db
      .update(overtimeCommandLetters)
      .set({ parentSplId: null })
      .where(eq(overtimeCommandLetters.parentSplId, documentId))

    // Unlink any daily activity session references
    await db
      .update(dailyActivitySessions)
      .set({ overtimeCommandLetterId: null })
      .where(eq(dailyActivitySessions.overtimeCommandLetterId, documentId))

    // Delete child records
    await db.delete(overtimeApprovals).where(eq(overtimeApprovals.overtimeCommandLetterId, documentId))
    await db.delete(overtimeCommandLetterItems).where(eq(overtimeCommandLetterItems.overtimeCommandLetterId, documentId))
    await db.delete(overtimeCommandLetterParticipants).where(eq(overtimeCommandLetterParticipants.overtimeCommandLetterId, documentId))
    
    // Delete main record
    await db.delete(overtimeCommandLetters).where(eq(overtimeCommandLetters.id, documentId))

    safeRevalidatePath('/dashboard/overtime-requests')
    safeRevalidatePath('/dashboard/approval')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting overtime command letter:', error)
    return { success: false, error: error.message || 'Gagal menghapus dokumen SPL.' }
  }
}

// ── Generate Test Overtime Approval ───────────────────────────────────────

export async function generateTestOvertimeApproval() {
  try {
    let currentEmployee: { id: number; name: string; email: string; siteId: number | null } | null = null
    try {
      const session = await getServerSession()
      if (session?.user?.email) {
        const [emp] = await db
          .select({ id: employees.id, name: employees.name, email: employees.email, siteId: employees.siteId })
          .from(employees)
          .where(sql`lower(${employees.email}) = ${session.user.email.trim().toLowerCase()}`)
          .limit(1)
        currentEmployee = emp || null
      }
    } catch {
      // Fallback for background test execution
    }

    if (!currentEmployee) {
      const [fallbackEmp] = await db
        .select({ id: employees.id, name: employees.name, email: employees.email, siteId: employees.siteId })
        .from(employees)
        .where(eq(employees.isActive, true))
        .limit(1)
      if (!fallbackEmp) throw new Error('Employee record tidak ditemukan.')
      currentEmployee = fallbackEmp
    }

    // Find or create a test overtime document
    const [existing] = await db
      .select({ id: overtimeCommandLetters.id })
      .from(overtimeCommandLetters)
      .where(eq(overtimeCommandLetters.requestedByEmployeeId, currentEmployee.id))
      .orderBy(desc(overtimeCommandLetters.id))
      .limit(1)

    let docId = existing?.id
    if (!docId) {
      const [newDoc] = await db
        .insert(overtimeCommandLetters)
        .values({
          siteId: currentEmployee.siteId ?? 1,
          requestedByEmployeeId: currentEmployee.id,
          splNumber: `SPL-TEST-${Date.now().toString().slice(-6)}`,
          title: 'Test Pekerjaan Lembur Overhaul & Repair',
          workDate: new Date(),
          plannedStartAt: new Date(),
          plannedEndAt: new Date(Date.now() + 4 * 3600 * 1000),
          status: 'submitted',
          requestNotes: 'Test pengajuan lembur sistem approval.',
          executionNotes: 'Semua prosedur keselamatan kerja telah diperiksa.',
          origin: 'web_form',
          createdAt: new Date(),
        })
        .returning({ id: overtimeCommandLetters.id })

      docId = newDoc.id

      await db.insert(overtimeCommandLetterParticipants).values({
        overtimeCommandLetterId: docId,
        employeeId: currentEmployee.id,
        category: 'mechanic',
        shiftCode: 'DS',
        rosterType: '10-2',
      })

      await db.insert(overtimeCommandLetterItems).values({
        overtimeCommandLetterId: docId,
        lineLabel: 'Pemeriksaan Emergency Tire Replacement',
        lineDescription: 'Pergantian dan perbaikan ban unit heavy duty.',
        targetUnit: 'HD-785',
        estimatedMinutes: 180,
        plannedPoints: 10,
        sortOrder: 1,
      })
    }

    // Reset approvals for test
    await db.delete(overtimeApprovals).where(eq(overtimeApprovals.overtimeCommandLetterId, docId))

    const testEmail = currentEmployee.email || 'admin@chitraparatama.co.id'
    const baseUrl = getPublicAppUrl()

    const steps = [
      { stepOrder: 1, stepLabel: 'Pemohon / Requester', approverRole: 'requester', name: currentEmployee.name, email: testEmail },
      { stepOrder: 2, stepLabel: 'Leader / Supervisor', approverRole: 'leader', name: 'Leader Operasional', email: testEmail },
      { stepOrder: 3, stepLabel: 'Section Head', approverRole: 'section_head', name: 'Section Head', email: testEmail },
    ]

    const links: Array<{ step: number; role: string; name: string; url: string }> = []

    for (const s of steps) {
      const token = randomUUID()
      await db
        .insert(overtimeApprovals)
        .values({
          overtimeCommandLetterId: docId,
          stepOrder: s.stepOrder,
          stepLabel: s.stepLabel,
          approvalToken: token,
          approverName: s.name,
          approverEmail: s.email ?? '',
          approverRole: s.approverRole,
          status: s.stepOrder === 1 ? 'pending' : 'waiting',
          createdAt: new Date(),
        })
        .onConflictDoNothing({
          target: [overtimeApprovals.overtimeCommandLetterId, overtimeApprovals.stepOrder],
        })

      links.push({
        step: s.stepOrder,
        role: s.stepLabel,
        name: s.name,
        url: `${baseUrl}/review/overtime/${token}`,
      })
    }

    // Send test email notification for Step 1
    const firstStepUrl = links[0]?.url || `${baseUrl}/dashboard/overtime-requests/${docId}/approval`
    try {
      await sendWorkflowEmail({
        to: testEmail,
        templateCode: 'overtime_spl_test_notification',
        templateName: 'Overtime SPL Test Approval Notification',
        fallbackSubject: `[TEST APPROVAL] Surat Perintah Lembur (SPL) - ${currentEmployee.name}`,
        fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
  <div style="background:linear-gradient(135deg,#0f172a,#2563eb);padding:24px;border-radius:10px 10px 0 0">
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
    <p style="color:#dbeafe;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Human Capital • Test Approval SPL</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
    <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Halo <strong>${currentEmployee.name}</strong>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
      Test Approval Surat Perintah Lembur (SPL) telah dibuat untuk verifikasi alur multi-level approval & tanda tangan elektronik.
    </p>
    <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin-bottom:24px;border-left:4px solid #2563eb">
      <table cellpadding="4" cellspacing="0" width="100%" style="font-size:13px;color:#334155">
        <tr><td width="140" style="color:#64748b">No. SPL:</td><td><strong>SPL-TEST-${docId}</strong></td></tr>
        <tr><td style="color:#64748b">Pemohon:</td><td>${currentEmployee.name}</td></tr>
        <tr><td style="color:#64748b">Tahap Pertama:</td><td style="color:#1d4ed8;font-weight:bold">Pemohon / Requester</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:28px 0">
      <a href="${firstStepUrl}" style="background:#2563eb;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Buka Form Approval SPL</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;margin:24px 0 0;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:16px">
      Email ini dikirim secara otomatis oleh Sistem HERO PT Chitra Paratama untuk keperluan Test Approval.
    </p>
  </div>
</div>
        `,
        fallbackText: `Halo ${currentEmployee.name},\n\nTest Approval Surat Perintah Lembur (SPL) telah dibuat.\n\nSilakan buka tautan berikut untuk menyetujui dan menandatangani:\n${firstStepUrl}\n\nHormat kami,\nPT Chitra Paratama`,
        variables: {
          employeeName: currentEmployee.name,
          requesterName: currentEmployee.name,
          targetApproverName: currentEmployee.name,
          approverName: 'Test Approver',
          managerName: 'Test Manager',
          splNumber: `SPL-TEST-${docId}`,
          sessionCode: `SPL-TEST-${docId}`,
          permitNumber: `SPL-TEST-${docId}`,
          title: 'Test Pekerjaan Lembur Overhaul & Repair',
          approvalStep: 'Pemohon / Requester',
          approvalLink: firstStepUrl,
          viewLink: firstStepUrl,
          workDate: new Date().toLocaleDateString('id-ID'),
          siteName: 'Site Operasional Test',
          remarks: 'Test approval execution',
          revertReason: 'Test revert execution',
        },
      })
    } catch (mailErr) {
      console.warn('Non-blocking test email error:', mailErr)
    }

    try {
      safeRevalidatePath('/dashboard/overtime-requests')
      safeRevalidatePath(`/dashboard/overtime-requests/${docId}/approval`)
    } catch {}

    return {
      success: true as const,
      message: 'Test workflow executed successfully!',
      data: {
        employee: currentEmployee.name,
        documentId: docId,
        links,
      },
    }
  } catch (error: any) {
    console.error('Error generating test overtime approval:', error)
    return { success: false as const, message: error instanceof Error ? error.message : 'Unknown error occurred', error: error.message || 'Gagal membuat test approval.' }
  }
}

export async function testWorkflowEmailAction(input?: { module?: string; templateKey?: string; recipientEmail?: string }) {
  try {
    const session = await getServerSession().catch(() => null)
    const testEmail = input?.recipientEmail || session?.user?.email || 'admin@chitraparatama.co.id'
    const baseUrl = getPublicAppUrl()
    const testDocId = 999
    const testSplNumber = 'SPL-TEST-123'
    const approvalLink = `${baseUrl}/dashboard/approval?openDoc=${encodeURIComponent(testSplNumber)}`

    await sendWorkflowEmail({
      to: testEmail,
      templateCode: 'overtime_approval_notification',
      templateName: 'Overtime Request (SPL) Approval Notification',
      fallbackSubject: `[TEST SPL] Menunggu Persetujuan: ${testSplNumber} - Test Pekerjaan Overhaul (Tahap 1)`,
      fallbackHtml: `<p>Ini adalah email pengujian untuk alur lembur SPL (${testSplNumber}).</p><p><a href="${approvalLink}">Buka Form Approval</a></p>`,
      fallbackText: `Ini adalah email pengujian untuk alur lembur SPL (${testSplNumber}).\nBuka link: ${approvalLink}`,
      variables: {
        approverName: 'Test Approver',
        targetApproverName: 'Test Approver',
        managerName: 'Test Manager',
        employeeName: 'Test Karyawan',
        requesterName: 'Test Karyawan',
        applicantName: 'Test Karyawan',
        splNumber: testSplNumber,
        sessionCode: testSplNumber,
        permitNumber: testSplNumber,
        title: 'Test Pekerjaan Lembur Overhaul & Repair',
        approvalStep: 'Leader / Supervisor',
        approvalLink,
        viewLink: approvalLink,
        workDate: new Date().toLocaleDateString('id-ID'),
        siteName: 'Site Operasional Test',
        remarks: 'Catatan pengujian workflow',
        revertReason: 'Catatan pengembalian revisi pengujian',
      },
    })

    return { success: true, message: `Test workflow executed successfully!` }
  } catch (error: any) {
    console.error('Error executing test workflow email:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

// ── Create Overtime Command Letter ────────────────────────────────────────

export async function createOvertimeCommandLetterAction(payload: {
  title: string
  workDate: Date | string
  plannedStartAt?: Date | string
  plannedEndAt?: Date | string
  requestedByEmployeeId?: number | null
  requestNotes?: string
  executionNotes?: string
  workerParticipants?: Array<{
    employeeId: number
    shiftCode?: string
    rosterType?: string
    category?: string
  }>
  workerEmployeeIds?: number[]
  lineItems?: Array<{
    lineLabel: string
    targetUnit?: string
    estimatedMinutes?: number
    plannedPoints?: number
  }>
  leaderEmployeeId?: number | null
  leaderName?: string | null
  superiorEmployeeId?: number | null
  superiorName?: string | null
  managerEmployeeId?: number | null
  managerName?: string | null
}) {
  try {
    const session = await getServerSession()
    const [currentEmp] = session?.user?.email
      ? await db.select().from(employees).where(eq(employees.email, session.user.email)).limit(1)
      : []

    const requesterId = payload.requestedByEmployeeId || currentEmp?.id || null
    if (!requesterId) {
      return { success: false as const, error: 'Pilih Pemohon (Requester) terlebih dahulu.' }
    }

    const [requesterEmp] = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        signatureDataUrl: employees.signatureDataUrl,
        siteId: employees.siteId,
        departmentId: employees.departmentId,
        sectionId: employees.sectionId,
        positionId: employees.positionId,
      })
      .from(employees)
      .where(eq(employees.id, requesterId))
      .limit(1)

    let siteId = requesterEmp?.siteId || currentEmp?.siteId || null
    if (!siteId) {
      const [firstSite] = await db.select({ id: sites.id }).from(sites).limit(1)
      siteId = firstSite?.id || 1
    }

    const prefix = 'SPL-' + new Date().getFullYear() + '-'
    const [last] = await db
      .select({ id: overtimeCommandLetters.id })
      .from(overtimeCommandLetters)
      .orderBy(desc(overtimeCommandLetters.id))
      .limit(1)

    const nextNumber = `${prefix}${String((last?.id || 0) + 1).padStart(4, '0')}`

    const parseDateTime = (dateVal?: Date | string | null, timeVal?: Date | string | null): Date => {
      if (timeVal instanceof Date && !isNaN(timeVal.getTime())) return timeVal
      if (typeof timeVal === 'string' && timeVal.trim()) {
        const directDate = new Date(timeVal)
        if (!isNaN(directDate.getTime()) && timeVal.includes('-')) return directDate
        const baseDateStr = dateVal
          ? (dateVal instanceof Date ? dateVal.toISOString().split('T')[0] : String(dateVal).split('T')[0])
          : new Date().toISOString().split('T')[0]
        const cleanTime = timeVal.trim().length === 5 ? `${timeVal.trim()}:00` : timeVal.trim()
        const combined = new Date(`${baseDateStr}T${cleanTime}`)
        if (!isNaN(combined.getTime())) return combined
      }
      if (dateVal instanceof Date && !isNaN(dateVal.getTime())) return dateVal
      if (typeof dateVal === 'string' && dateVal.trim()) {
        const d = new Date(dateVal)
        if (!isNaN(d.getTime())) return d
      }
      return new Date()
    }

    const safeWorkDate = payload.workDate ? parseDateTime(payload.workDate) : new Date()
    const safePlannedStart = parseDateTime(payload.workDate, payload.plannedStartAt)
    const safePlannedEnd = payload.plannedEndAt
      ? parseDateTime(payload.workDate, payload.plannedEndAt)
      : new Date(safePlannedStart.getTime() + 4 * 3600 * 1000)

    let validDeptId: number | null = null
    if (requesterEmp?.departmentId) {
      const [dept] = await db.select({ id: masterDepartments.id }).from(masterDepartments).where(eq(masterDepartments.id, requesterEmp.departmentId)).limit(1)
      if (dept) validDeptId = dept.id
    }

    let validSecId: number | null = null
    if (requesterEmp?.sectionId) {
      const [sec] = await db.select({ id: masterSections.id }).from(masterSections).where(eq(masterSections.id, requesterEmp.sectionId)).limit(1)
      if (sec) validSecId = sec.id
    }

    let validPosId: number | null = null
    if (requesterEmp?.positionId) {
      const [pos] = await db.select({ id: masterPositions.id }).from(masterPositions).where(eq(masterPositions.id, requesterEmp.positionId)).limit(1)
      if (pos) validPosId = pos.id
    }

    const [inserted] = await db
      .insert(overtimeCommandLetters)
      .values({
        splNumber: nextNumber,
        siteId: siteId,
        departmentId: validDeptId,
        sectionId: validSecId,
        positionId: validPosId,
        title: payload.title || 'Penugasan Lembur Operasional',
        workDate: safeWorkDate,
        plannedStartAt: safePlannedStart,
        plannedEndAt: safePlannedEnd,
        status: 'Submitted',
        requestNotes: payload.requestNotes || '',
        executionNotes: payload.executionNotes || '',
        requestedByEmployeeId: requesterId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    // Insert participants
    if (payload.workerParticipants && payload.workerParticipants.length > 0) {
      for (const p of payload.workerParticipants) {
        if (!p.employeeId) continue
        await db.insert(overtimeCommandLetterParticipants).values({
          overtimeCommandLetterId: inserted.id,
          employeeId: p.employeeId,
          shiftCode: p.shiftCode || 'DS',
          rosterType: p.rosterType || '5:2',
          category: p.category || 'after_mandatory_ot',
          createdAt: new Date(),
        })
      }
    } else if (payload.workerEmployeeIds && payload.workerEmployeeIds.length > 0) {
      for (const empId of payload.workerEmployeeIds) {
        await db.insert(overtimeCommandLetterParticipants).values({
          overtimeCommandLetterId: inserted.id,
          employeeId: empId,
          createdAt: new Date(),
        })
      }
    }

    // Insert line items
    if (payload.lineItems && payload.lineItems.length > 0) {
      const itemsToInsert = payload.lineItems
        .filter((item) => item.lineLabel && item.lineLabel.trim().length > 0)
        .map((item, idx) => ({
          overtimeCommandLetterId: inserted.id,
          lineLabel: item.lineLabel.trim(),
          targetUnit: item.targetUnit?.trim() || '',
          estimatedMinutes: Number(item.estimatedMinutes) || 60,
          plannedPoints: Number(item.plannedPoints) || 0,
          sortOrder: idx + 1,
          createdAt: new Date(),
        }))

      if (itemsToInsert.length > 0) {
        await db.insert(overtimeCommandLetterItems).values(itemsToInsert)
      }
    }

    // Ensure or insert sequential approval steps (Step 1 Pending)
    if (payload.leaderEmployeeId || payload.superiorEmployeeId || payload.managerEmployeeId) {
      const [validLeader] = payload.leaderEmployeeId
        ? await db.select({ id: employees.id, name: employees.name, email: employees.email }).from(employees).where(eq(employees.id, payload.leaderEmployeeId)).limit(1)
        : []

      const [validSuperior] = payload.superiorEmployeeId
        ? await db.select({ id: employees.id, name: employees.name, email: employees.email }).from(employees).where(eq(employees.id, payload.superiorEmployeeId)).limit(1)
        : []

      const [validManager] = payload.managerEmployeeId
        ? await db.select({ id: employees.id, name: employees.name, email: employees.email }).from(employees).where(eq(employees.id, payload.managerEmployeeId)).limit(1)
        : []

      const step1Token = randomUUID()
      const step2Token = randomUUID()
      const step3Token = randomUUID()

      const steps = [
        {
          overtimeCommandLetterId: inserted.id,
          stepOrder: 1,
          stepLabel: 'Karyawan Sign',
          approverRole: 'employee',
          approverEmployeeId: requesterId,
          approverName: requesterEmp?.name || currentEmp?.name || 'Karyawan',
          approverEmail: requesterEmp?.email || currentEmp?.email || '',
          signatureDataUrl: null,
          signedAt: null,
          remarks: '',
          status: 'pending',
          approvalToken: step1Token,
          createdAt: new Date(),
        },
        {
          overtimeCommandLetterId: inserted.id,
          stepOrder: 2,
          stepLabel: 'Leader / Supervisor',
          approverRole: 'leader',
          approverEmployeeId: validLeader?.id ?? payload.leaderEmployeeId ?? null,
          approverName: payload.leaderName || validLeader?.name || 'Leader Lapangan',
          approverEmail: validLeader?.email || '',
          signatureDataUrl: null,
          signedAt: null,
          remarks: '',
          status: 'waiting',
          approvalToken: step2Token,
          createdAt: new Date(),
        },
        {
          overtimeCommandLetterId: inserted.id,
          stepOrder: 3,
          stepLabel: 'Section Head',
          approverRole: 'section_head',
          approverEmployeeId: validSuperior?.id ?? payload.superiorEmployeeId ?? null,
          approverName: payload.superiorName || validSuperior?.name || 'Section Head',
          approverEmail: validSuperior?.email || '',
          signatureDataUrl: null,
          signedAt: null,
          remarks: '',
          status: 'waiting',
          approvalToken: step3Token,
          createdAt: new Date(),
        },
      ]
      await db
        .insert(overtimeApprovals)
        .values(steps)
        .onConflictDoNothing({
          target: [overtimeApprovals.overtimeCommandLetterId, overtimeApprovals.stepOrder],
        })

      if (currentEmp?.email || requesterEmp?.email) {
        await sendOvertimeStepApprovalEmail({
          documentId: inserted.id,
          splNumber: inserted.splNumber || `SPL-${inserted.id}`,
          workDate: inserted.workDate,
          employeeName: currentEmp?.name || requesterEmp?.name || 'Karyawan',
          requesterName: currentEmp?.name || 'Karyawan',
          approverName: currentEmp?.name || 'Karyawan',
          approverEmail: currentEmp?.email || requesterEmp?.email || '',
          approvalStep: 'Karyawan Sign',
          approvalToken: step1Token,
        })
      }
    } else {
      await ensureOvertimeApprovalsExist(inserted.id)
    }

    safeRevalidatePath('/dashboard/overtime-requests')
    return { success: true as const, documentId: inserted.id, data: inserted }
  } catch (error: any) {
    console.error('Error creating overtime command letter:', error)
    return { success: false as const, error: error.message || 'Gagal membuat Surat Perintah Lembur.' }
  }
}

// ── Send Due Overtime Reminders ───────────────────────────────────────────

export async function sendDueOvertimeReminders() {
  try {
    const baseUrl = getPublicAppUrl()
    const pendingList = await db
      .select({
        approvalId: overtimeApprovals.id,
        documentId: overtimeApprovals.overtimeCommandLetterId,
        token: overtimeApprovals.approvalToken,
        stepLabel: overtimeApprovals.stepLabel,
        stepOrder: overtimeApprovals.stepOrder,
        approverName: overtimeApprovals.approverName,
        approverEmail: overtimeApprovals.approverEmail,
        splNumber: overtimeCommandLetters.splNumber,
        title: overtimeCommandLetters.title,
        workDate: overtimeCommandLetters.workDate,
      })
      .from(overtimeApprovals)
      .innerJoin(overtimeCommandLetters, eq(overtimeApprovals.overtimeCommandLetterId, overtimeCommandLetters.id))
      .where(eq(overtimeApprovals.status, 'pending'))
      .limit(50)

    let sent = 0
    let skipped = 0

    for (const pending of pendingList) {
      const recipientEmail = pending.approverEmail?.trim() || ''
      if (!recipientEmail) {
        skipped++
        continue
      }
      const approvalLink = `${baseUrl}/review/overtime/${pending.token}`

      await sendWorkflowEmail({
        to: recipientEmail,
        templateCode: 'overtime_approval_reminder',
        variables: {
          recipientName: pending.approverName || 'Approver',
          approverName: pending.approverName || 'Approver',
          splNumber: pending.splNumber,
          title: pending.title,
          stepLabel: pending.stepLabel,
          workDate: pending.workDate ? new Date(pending.workDate).toLocaleDateString('id-ID') : '-',
          approvalLink,
        },
        fallbackSubject: `[REMINDER] Persetujuan Surat Perintah Lembur #${pending.splNumber} - ${pending.title}`,
        fallbackText: `Halo ${pending.approverName},\n\nIni adalah pengingat persetujuan Surat Perintah Lembur (SPL) #${pending.splNumber} - "${pending.title}" pada tahap ${pending.stepLabel}.\n\nSilakan review dan tanda tangani melalui tautan berikut:\n${approvalLink}\n\nTerima kasih.`,
        fallbackHtml: `
          <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
              <span style="background: #fef3c7; color: #92400e; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 9999px; text-transform: uppercase;">Overtime SPL Reminder</span>
            </div>
            <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 12px; color: #0f172a;">Pengingat Persetujuan Surat Perintah Lembur</h2>
            <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-bottom: 16px;">
              Halo <strong>${pending.approverName}</strong>,<br/>
              Dokumen Surat Perintah Lembur (SPL) <strong>#${pending.splNumber}</strong> ("${pending.title}") masih menunggu persetujuan Anda pada tahap <strong>${pending.stepLabel}</strong>.
            </p>
            <div style="margin: 24px 0;">
              <a href="${approvalLink}" style="display: inline-block; background: #0f766e; color: #ffffff; padding: 12px 24px; font-size: 14px; font-weight: bold; border-radius: 8px; text-decoration: none;">
                Review & Setujui Sekarang
              </a>
            </div>
            <p style="font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
              Jika tombol di atas tidak dapat diklik, salin dan buka tautan berikut di browser Anda:<br/>
              <a href="${approvalLink}" style="color: #0f766e;">${approvalLink}</a>
            </p>
          </div>
        `,
      })

      await notifyWorkflowBellRecipients({
        recipientEmails: [recipientEmail, pending.approverEmail].filter((e): e is string => Boolean(e)),
        eventType: 'overtime_reminder',
        category: 'approval_requests',
        title: `Reminder Approval SPL: #${pending.splNumber} - ${pending.title}`,
        body: `Mohon segera lakukan approval untuk tahap ${pending.stepLabel}.`,
        url: approvalLink,
        tagPrefix: 'overtime-reminder',
        metadata: {
          documentId: pending.documentId,
          approvalId: pending.approvalId,
          stepOrder: pending.stepOrder,
        },
      })

      sent++
    }

    try {
      safeRevalidatePath('/dashboard/overtime-requests')
      safeRevalidatePath('/dashboard/approval')
    } catch {}

    return { success: true as const, sent, skipped }
  } catch (error: any) {
    console.error('Error sending overtime reminders:', error)
    return { success: false as const, error: error.message || 'Gagal mengirim reminder.' }
  }
}

// ── Token Approval Methods ────────────────────────────────────────────────

export async function getOvertimeApprovalByToken(token: string) {
  try {
    if (!token) {
      return { success: false as const, error: 'Token approval tidak valid.' }
    }
    const cleanToken = token.trim().replace(/\s+/g, '-')

    const [approval] = await db
      .select()
      .from(overtimeApprovals)
      .where(
        or(
          eq(overtimeApprovals.approvalToken, token),
          eq(overtimeApprovals.approvalToken, cleanToken)
        )
      )
      .limit(1)

    if (!approval) {
      return { success: false as const, error: 'Approval step tidak ditemukan.' }
    }

    const data = await getOvertimeApprovalData(approval.overtimeCommandLetterId)
    if (!data) {
      return { success: false as const, error: 'Dokumen SPL tidak ditemukan.' }
    }

    let registeredSignature: string | null = approval.signatureDataUrl ?? null

    if (!registeredSignature && (approval as any).approverEmployeeId) {
      const [emp] = await db
        .select({ signatureDataUrl: employees.signatureDataUrl })
        .from(employees)
        .where(eq(employees.id, (approval as any).approverEmployeeId))
        .limit(1)
      registeredSignature = emp?.signatureDataUrl || null
    }
    if (!registeredSignature && approval.approverEmail) {
      const [emp] = await db
        .select({ signatureDataUrl: employees.signatureDataUrl })
        .from(employees)
        .where(eq(employees.email, approval.approverEmail))
        .limit(1)
      registeredSignature = emp?.signatureDataUrl || null
    }
    if (!registeredSignature && approval.approverName) {
      const [emp] = await db
        .select({ signatureDataUrl: employees.signatureDataUrl })
        .from(employees)
        .where(eq(employees.name, approval.approverName))
        .limit(1)
      registeredSignature = emp?.signatureDataUrl || null
    }
    if (!registeredSignature && (data as any)?.requesterId) {
      const [emp] = await db
        .select({ signatureDataUrl: employees.signatureDataUrl })
        .from(employees)
        .where(eq(employees.id, (data as any).requesterId))
        .limit(1)
      registeredSignature = emp?.signatureDataUrl || null
    }

    return {
      success: true as const,
      data: {
        registeredSignature,
        approval,
        ...data,
      },
    }
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal memuat data approval.' }
  }
}

export async function approveOvertimeStepByToken(
  token: string,
  payload: { signatureDataUrl: string; remarks?: string }
) {
  try {
    const [approval] = await db
      .select()
      .from(overtimeApprovals)
      .where(eq(overtimeApprovals.approvalToken, token))
      .limit(1)

    if (!approval) throw new Error('Approval token tidak valid.')
    if (approval.status === 'approved') return { success: true as const }

    // Check previous step
    const [prev] = await db
      .select()
      .from(overtimeApprovals)
      .where(
        and(
          eq(overtimeApprovals.overtimeCommandLetterId, approval.overtimeCommandLetterId),
          sql`${overtimeApprovals.stepOrder} < ${approval.stepOrder}`
        )
      )
      .orderBy(desc(overtimeApprovals.stepOrder))
      .limit(1)

    if (prev && prev.status !== 'approved') {
      throw new Error('Step sebelumnya belum di-approve.')
    }

    await db
      .update(overtimeApprovals)
      .set({
        status: 'approved',
        signatureDataUrl: payload.signatureDataUrl,
        remarks: payload.remarks || '',
        signedAt: new Date(),
      })
      .where(eq(overtimeApprovals.id, approval.id))

    // Advance next step
    const [next] = await db
      .select()
      .from(overtimeApprovals)
      .where(
        and(
          eq(overtimeApprovals.overtimeCommandLetterId, approval.overtimeCommandLetterId),
          sql`${overtimeApprovals.stepOrder} > ${approval.stepOrder}`,
          eq(overtimeApprovals.status, 'waiting')
        )
      )
      .orderBy(asc(overtimeApprovals.stepOrder))
      .limit(1)

    const [document] = await db
      .select({
        id: overtimeCommandLetters.id,
        splNumber: overtimeCommandLetters.splNumber,
        title: overtimeCommandLetters.title,
        workDate: overtimeCommandLetters.workDate,
        requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
      })
      .from(overtimeCommandLetters)
      .where(eq(overtimeCommandLetters.id, approval.overtimeCommandLetterId))
      .limit(1)

    const [requester] = document?.requestedByEmployeeId
      ? await db
          .select({ name: employees.name, email: employees.email })
          .from(employees)
          .where(eq(employees.id, document.requestedByEmployeeId))
          .limit(1)
      : []

    if (next) {
      await db
        .update(overtimeApprovals)
        .set({ status: 'pending' })
        .where(eq(overtimeApprovals.id, next.id))

      try {
        if (next.approverEmail) {
          await sendOvertimeStepApprovalEmail({
            documentId: approval.overtimeCommandLetterId,
            splNumber: document?.splNumber || '',
            title: document?.title || '',
            workDate: document?.workDate,
            employeeName: requester?.name || 'Pemohon',
            requesterName: requester?.name || 'Pemohon',
            approverName: next.approverName || 'Approver',
            approverEmail: next.approverEmail,
            approvalStep: next.stepLabel,
            approvalToken: next.approvalToken,
          })
        }
      } catch (mailErr) {
        console.error('Error sending overtime step approval email:', mailErr)
      }
    } else {
      await db
        .update(overtimeCommandLetters)
        .set({ status: 'approved', approvedByEmployeeId: approval.approverEmployeeId, updatedAt: new Date() })
        .where(eq(overtimeCommandLetters.id, approval.overtimeCommandLetterId))

      try {
        if (requester?.email) {
          await sendOvertimeCompletedEmail({
            documentId: approval.overtimeCommandLetterId,
            splNumber: document?.splNumber || '',
            title: document?.title || '',
            requesterName: requester.name || 'Pemohon',
            requesterEmail: requester.email,
          })
        }
      } catch (mailErr) {
        console.error('Error sending overtime completed email:', mailErr)
      }
    }

    safeRevalidatePath('/dashboard/overtime-requests')
    safeRevalidatePath(`/dashboard/overtime-requests/${approval.overtimeCommandLetterId}/approval`)
    safeRevalidatePath(`/review/overtime/${token}`)

    return { success: true as const }
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal memproses approval.' }
  }
}

export async function rejectOvertimeStepByToken(
  token: string,
  payload: { remarks?: string }
) {
  try {
    const [approval] = await db
      .select()
      .from(overtimeApprovals)
      .where(eq(overtimeApprovals.approvalToken, token))
      .limit(1)

    if (!approval) throw new Error('Approval token tidak valid.')

    await db
      .update(overtimeApprovals)
      .set({
        status: 'rejected',
        remarks: payload.remarks || '',
        signedAt: new Date(),
      })
      .where(eq(overtimeApprovals.id, approval.id))

    await db
      .update(overtimeApprovals)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(overtimeApprovals.overtimeCommandLetterId, approval.overtimeCommandLetterId),
          sql`${overtimeApprovals.stepOrder} > ${approval.stepOrder}`
        )
      )

    await db
      .update(overtimeCommandLetters)
      .set({ status: 'returned', updatedAt: new Date() })
      .where(eq(overtimeCommandLetters.id, approval.overtimeCommandLetterId))

    const [document] = await db
      .select({
        id: overtimeCommandLetters.id,
        splNumber: overtimeCommandLetters.splNumber,
        title: overtimeCommandLetters.title,
        requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
      })
      .from(overtimeCommandLetters)
      .where(eq(overtimeCommandLetters.id, approval.overtimeCommandLetterId))
      .limit(1)

    const [requester] = document?.requestedByEmployeeId
      ? await db
          .select({ name: employees.name, email: employees.email })
          .from(employees)
          .where(eq(employees.id, document.requestedByEmployeeId))
          .limit(1)
      : []

    try {
      if (requester?.email) {
        await sendOvertimeRejectedEmail({
          documentId: approval.overtimeCommandLetterId,
          splNumber: document?.splNumber || '',
          title: document?.title || '',
          requesterName: requester.name || 'Pemohon',
          requesterEmail: requester.email,
          approverName: approval.approverName || 'Approver',
          remarks: payload.remarks,
        })
      }
    } catch (mailErr) {
      console.error('Error sending overtime rejected email:', mailErr)
    }

    safeRevalidatePath('/dashboard/overtime-requests')
    safeRevalidatePath(`/dashboard/overtime-requests/${approval.overtimeCommandLetterId}/approval`)
    safeRevalidatePath(`/review/overtime/${token}`)

    return { success: true as const }
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal menolak approval.' }
  }
}

export async function revertOvertimeStepByToken(
  token: string,
  payload: { remarks?: string }
) {
  try {
    const [approval] = await db
      .select()
      .from(overtimeApprovals)
      .where(eq(overtimeApprovals.approvalToken, token))
      .limit(1)

    if (!approval) throw new Error('Approval token tidak valid.')
    if (approval.stepOrder < 2) {
      throw new Error('Hanya jabatan Leader ke atas yang dapat mengembalikan (revert) SPL.')
    }

    const now = new Date()

    // 1. Mark reverting step as reverted, clearing signature and timestamp
    await db
      .update(overtimeApprovals)
      .set({
        status: 'reverted',
        remarks: payload.remarks || `SPL dikembalikan oleh ${approval.stepLabel} untuk revisi.`,
        signatureDataUrl: null,
        signedAt: null,
      })
      .where(eq(overtimeApprovals.id, approval.id))

    // 2. Set steps AFTER reverting step to waiting
    await db
      .update(overtimeApprovals)
      .set({
        status: 'waiting',
        signatureDataUrl: null,
        signedAt: null,
      })
      .where(
        and(
          eq(overtimeApprovals.overtimeCommandLetterId, approval.overtimeCommandLetterId),
          sql`${overtimeApprovals.stepOrder} > ${approval.stepOrder}`
        )
      )

    // 3. Update master SPL status to reverted (sends to requester's inbox)
    await db
      .update(overtimeCommandLetters)
      .set({ status: 'reverted', updatedAt: now })
      .where(eq(overtimeCommandLetters.id, approval.overtimeCommandLetterId))

    const [document] = await db
      .select({
        id: overtimeCommandLetters.id,
        splNumber: overtimeCommandLetters.splNumber,
        title: overtimeCommandLetters.title,
      })
      .from(overtimeCommandLetters)
      .where(eq(overtimeCommandLetters.id, approval.overtimeCommandLetterId))
      .limit(1)

    const [step1] = await db
      .select()
      .from(overtimeApprovals)
      .where(
        and(
          eq(overtimeApprovals.overtimeCommandLetterId, approval.overtimeCommandLetterId),
          eq(overtimeApprovals.stepOrder, 1)
        )
      )
      .limit(1)

    try {
      if (step1?.approverEmail) {
        await sendOvertimeRevertedEmail({
          documentId: approval.overtimeCommandLetterId,
          splNumber: document?.splNumber || '',
          title: document?.title || '',
          targetApproverName: step1.approverName || 'Pemohon / Step 1',
          targetApproverEmail: step1.approverEmail,
          managerName: approval.approverName || 'Atasan',
          revertReason: payload.remarks,
        })
      }
    } catch (mailErr) {
      console.error('Error sending overtime reverted email:', mailErr)
    }

    safeRevalidatePath('/dashboard/overtime-requests')
    safeRevalidatePath(`/dashboard/overtime-requests/${approval.overtimeCommandLetterId}/approval`)
    safeRevalidatePath(`/review/overtime/${token}`)

    return { success: true as const }
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal mengembalikan approval.' }
  }
}

export async function batchApproveOvertimeRequestsAction(splIds: number[], remarks?: string) {
  try {
    if (!splIds || splIds.length === 0) {
      return { success: false as const, error: 'Pilih minimal satu SPL untuk diapprove.' }
    }

    const emp = await getCurrentEmployee()
    if (!emp) {
      return { success: false as const, error: 'Sesi login tidak ditemukan.' }
    }

    const [empRecord] = await db
      .select({
        id: employees.id,
        name: employees.name,
        signatureDataUrl: employees.signatureDataUrl,
      })
      .from(employees)
      .where(eq(employees.id, emp.id))
      .limit(1)

    let sigUrl = empRecord?.signatureDataUrl || null
    const now = new Date()
    let approvedCount = 0

    for (const splId of splIds) {
      // Find the first pending or waiting step for this SPL
      const [activeStep] = await db
        .select()
        .from(overtimeApprovals)
        .where(
          and(
            eq(overtimeApprovals.overtimeCommandLetterId, splId),
            inArray(overtimeApprovals.status, ['pending', 'waiting'])
          )
        )
        .orderBy(asc(overtimeApprovals.stepOrder))
        .limit(1)

      if (!activeStep) continue

      const finalRemark = remarks && remarks.trim() ? remarks.trim() : 'Approved'

      // Approve this step
      await db
        .update(overtimeApprovals)
        .set({
          status: 'approved',
          signatureDataUrl: sigUrl,
          signedAt: now,
          approverName: empRecord.name || activeStep.approverName,
          approverEmployeeId: empRecord.id,
          remarks: finalRemark,
        })
        .where(eq(overtimeApprovals.id, activeStep.id))

      // Check next step
      const [nextStep] = await db
        .select()
        .from(overtimeApprovals)
        .where(
          and(
            eq(overtimeApprovals.overtimeCommandLetterId, splId),
            eq(overtimeApprovals.stepOrder, activeStep.stepOrder + 1)
          )
        )
        .limit(1)

      const [splDoc] = await db
        .select({
          id: overtimeCommandLetters.id,
          splNumber: overtimeCommandLetters.splNumber,
          title: overtimeCommandLetters.title,
          requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
        })
        .from(overtimeCommandLetters)
        .where(eq(overtimeCommandLetters.id, splId))
        .limit(1)

      if (nextStep) {
        await db
          .update(overtimeApprovals)
          .set({ status: 'pending' })
          .where(eq(overtimeApprovals.id, nextStep.id))

        if (splDoc && nextStep.approverEmail) {
          const [requester] = await db
            .select({ name: employees.name })
            .from(employees)
            .where(eq(employees.id, splDoc.requestedByEmployeeId))
            .limit(1)

          try {
            await sendOvertimeStepApprovalEmail({
              documentId: splDoc.id,
              splNumber: splDoc.splNumber,
              employeeName: requester?.name || 'Karyawan',
              workDate: (splDoc as any).workDate || new Date(),
              approverName: nextStep.approverName || 'Approver',
              approverEmail: nextStep.approverEmail,
              requesterName: requester?.name || 'Pemohon',
              approvalStep: nextStep.stepLabel,
              approvalToken: (nextStep.approvalToken || '') as any,
            })
          } catch (err) {
            console.error('Error dispatching overtime next step email:', err)
          }
        }
      } else {
        // Final approval
        await db
          .update(overtimeCommandLetters)
          .set({
            status: 'approved',
            updatedAt: now,
          })
          .where(eq(overtimeCommandLetters.id, splId))
      }

      approvedCount++
    }

    safeRevalidatePath('/dashboard/overtime-requests')
    safeRevalidatePath('/dashboard/approval')

    return {
      success: true as const,
      approvedCount,
      totalSelected: splIds.length,
    }
  } catch (error: any) {
    console.error('Error batch approving overtime requests:', error)
    return { success: false as const, error: error.message || 'Gagal menyetujui lembur secara massal.' }
  }
}

export async function batchRejectOvertimeRequestsAction(splIds: number[], remarks?: string) {
  try {
    if (!splIds || splIds.length === 0) {
      return { success: false as const, error: 'Pilih minimal satu SPL.' }
    }

    const emp = await getCurrentEmployee()
    if (!emp) {
      return { success: false as const, error: 'Sesi login tidak ditemukan.' }
    }

    const now = new Date()
    const finalRemark = remarks && remarks.trim() ? remarks.trim() : 'Rejected'

    for (const splId of splIds) {
      const [pendingStep] = await db
        .select()
        .from(overtimeApprovals)
        .where(
          and(
            eq(overtimeApprovals.overtimeCommandLetterId, splId),
            inArray(overtimeApprovals.status, ['pending', 'waiting'])
          )
        )
        .orderBy(asc(overtimeApprovals.stepOrder))
        .limit(1)

      const targetStep = pendingStep || (await db
        .select()
        .from(overtimeApprovals)
        .where(eq(overtimeApprovals.overtimeCommandLetterId, splId))
        .orderBy(desc(overtimeApprovals.stepOrder))
        .limit(1))[0]

      if (targetStep) {
        await db
          .update(overtimeApprovals)
          .set({
            status: 'rejected',
            signedAt: now,
            approverName: emp.name,
            approverEmployeeId: emp.id,
            remarks: finalRemark,
          })
          .where(eq(overtimeApprovals.id, targetStep.id))

        await db
          .update(overtimeApprovals)
          .set({
            status: 'cancelled',
            remarks: '',
          })
          .where(
            and(
              eq(overtimeApprovals.overtimeCommandLetterId, splId),
              sql`${overtimeApprovals.stepOrder} > ${targetStep.stepOrder}`
            )
          )
      }

      await db
        .update(overtimeCommandLetters)
        .set({ status: 'rejected', updatedAt: now })
        .where(eq(overtimeCommandLetters.id, splId))

      // Dispatch rejection notification & email to original requester
      const [splDoc] = await db
        .select({
          id: overtimeCommandLetters.id,
          splNumber: overtimeCommandLetters.splNumber,
          title: overtimeCommandLetters.title,
          requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
        })
        .from(overtimeCommandLetters)
        .where(eq(overtimeCommandLetters.id, splId))
        .limit(1)

      if (splDoc?.requestedByEmployeeId) {
        const [requester] = await db
          .select({ name: employees.name, email: employees.email })
          .from(employees)
          .where(eq(employees.id, splDoc.requestedByEmployeeId))
          .limit(1)

        if (requester?.email) {
          sendOvertimeRejectedEmail({
            documentId: splDoc.id,
            splNumber: splDoc.splNumber,
            title: splDoc.title,
            requesterName: requester.name,
            requesterEmail: requester.email,
            approverName: emp.name || 'Approver',
            remarks: finalRemark,
          }).catch((err) => console.error('[batchRejectOvertimeRequestsAction] Email error:', err))

          notifyWorkflowBellRecipients({
            recipientEmails: [requester.email],
            eventType: 'overtime_rejected',
            category: 'approval_requests',
            title: `SPL Ditolak: #${splDoc.splNumber}`,
            body: `Surat Perintah Lembur #${splDoc.splNumber} ditolak oleh ${emp.name || 'Approver'}.${finalRemark ? ` Alasan: ${finalRemark}` : ''}`,
            url: `/dashboard/overtime-requests`,
            tagPrefix: 'overtime-rejected',
            metadata: { documentId: splDoc.id },
          }).catch((err) => console.error('[batchRejectOvertimeRequestsAction] Bell error:', err))
        }
      }
    }

    safeRevalidatePath('/dashboard/overtime-requests')
    safeRevalidatePath('/dashboard/approval')

    return { success: true as const, rejectedCount: splIds.length }
  } catch (error: any) {
    console.error('Error batch rejecting overtime requests:', error)
    return { success: false as const, error: error.message || 'Gagal menolak dokumen SPL.' }
  }
}

export async function batchRevertOvertimeRequestsAction(splIds: number[], remarks?: string) {
  try {
    if (!splIds || splIds.length === 0) {
      return { success: false as const, error: 'Pilih minimal satu SPL.' }
    }

    const emp = await getCurrentEmployee()
    if (!emp) {
      return { success: false as const, error: 'Sesi login tidak ditemukan.' }
    }

    const now = new Date()
    const finalRemark = remarks && remarks.trim() ? remarks.trim() : 'Reverted'

    for (const splId of splIds) {
      const [targetStep] = await db
        .select()
        .from(overtimeApprovals)
        .where(
          and(
            eq(overtimeApprovals.overtimeCommandLetterId, splId),
            inArray(overtimeApprovals.status, ['pending', 'waiting'])
          )
        )
        .orderBy(asc(overtimeApprovals.stepOrder))
        .limit(1)

      if (targetStep) {
        await db
          .update(overtimeApprovals)
          .set({
            status: 'reverted',
            signedAt: null,
            signatureDataUrl: null,
            approverName: emp.name,
            approverEmployeeId: emp.id,
            remarks: finalRemark,
          })
          .where(eq(overtimeApprovals.id, targetStep.id))
      }

      await db
        .update(overtimeCommandLetters)
        .set({ status: 'reverted', updatedAt: now })
        .where(eq(overtimeCommandLetters.id, splId))

      const [step1] = await db
        .select()
        .from(overtimeApprovals)
        .where(
          and(
            eq(overtimeApprovals.overtimeCommandLetterId, splId),
            eq(overtimeApprovals.stepOrder, 1)
          )
        )
        .limit(1)

      const [document] = await db
        .select({
          id: overtimeCommandLetters.id,
          splNumber: overtimeCommandLetters.splNumber,
          title: overtimeCommandLetters.title,
        })
        .from(overtimeCommandLetters)
        .where(eq(overtimeCommandLetters.id, splId))
        .limit(1)

      try {
        if (step1?.approverEmail) {
          await sendOvertimeRevertedEmail({
            documentId: splId,
            splNumber: document?.splNumber || '',
            title: document?.title || '',
            targetApproverName: step1.approverName || 'Pemohon',
            targetApproverEmail: step1.approverEmail,
            managerName: emp.name || 'Atasan',
            revertReason: finalRemark,
          })

          await notifyWorkflowBellRecipients({
            recipientEmails: [step1.approverEmail],
            eventType: 'overtime_reverted',
            category: 'approval_requests',
            title: `SPL Dikembalikan: #${document?.splNumber || splId}`,
            body: `Surat Perintah Lembur #${document?.splNumber || splId} dikembalikan untuk revisi oleh ${emp.name || 'Atasan'}.${finalRemark ? ` Catatan: ${finalRemark}` : ''}`,
            url: `/dashboard/overtime-requests/${splId}/approval`,
            tagPrefix: 'overtime-reverted',
            metadata: { documentId: splId },
          }).catch((bellErr) => console.error('Error notifying bell on batch revert:', bellErr))
        }
      } catch (mailErr) {
        console.error('Error sending overtime reverted email in batch revert:', mailErr)
      }
    }

    try {
      safeRevalidatePath('/dashboard/overtime-requests')
      safeRevalidatePath('/dashboard/approval')
    } catch {}

    return { success: true as const, revertedCount: splIds.length }
  } catch (error: any) {
    console.error('Error batch reverting overtime requests:', error)
    return { success: false as const, error: error.message || 'Gagal mengembalikan dokumen SPL.' }
  }
}

export async function singleApproveOvertimeRequestAction(splId: number, remarks?: string) {
  return batchApproveOvertimeRequestsAction([splId], remarks)
}

export async function singleRejectOvertimeRequestAction(splId: number, remarks?: string) {
  return batchRejectOvertimeRequestsAction([splId], remarks)
}

export async function singleRevertOvertimeRequestAction(splId: number, remarks?: string) {
  return batchRevertOvertimeRequestsAction([splId], remarks)
}

export async function getOvertimeWorkflowSettings(): Promise<OvertimeWorkflowSettings> {
  try {
    const [row] = await db
      .select()
      .from(hcContractReviewSettings)
      .where(eq(hcContractReviewSettings.settingKey, 'overtime_spl_workflow'))
      .limit(1)

    const stored = (row?.settingValue as Partial<OvertimeWorkflowSettings> | undefined) ?? {}
    return {
      ...DEFAULT_OVERTIME_SETTINGS,
      ...stored,
      approvalMatrix: {
        ...DEFAULT_OVERTIME_SETTINGS.approvalMatrix,
        ...stored.approvalMatrix,
        sectionHeads: Array.isArray(stored.approvalMatrix?.sectionHeads)
          ? stored.approvalMatrix.sectionHeads
          : DEFAULT_OVERTIME_SETTINGS.approvalMatrix.sectionHeads,
      },
      emailTemplates: {
        ...DEFAULT_OVERTIME_SETTINGS.emailTemplates,
        ...stored.emailTemplates,
      },
      reminderDaysBefore:
        Array.isArray(stored.reminderDaysBefore) && stored.reminderDaysBefore.length > 0
          ? stored.reminderDaysBefore.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v >= 0)
          : DEFAULT_OVERTIME_SETTINGS.reminderDaysBefore,
    }
  } catch (err) {
    console.error('Error fetching Overtime workflow settings:', err)
    return DEFAULT_OVERTIME_SETTINGS
  }
}

export async function saveOvertimeWorkflowSettings(settings: OvertimeWorkflowSettings) {
  try {
    const [existing] = await db
      .select({ id: hcContractReviewSettings.id })
      .from(hcContractReviewSettings)
      .where(eq(hcContractReviewSettings.settingKey, 'overtime_spl_workflow'))
      .limit(1)

    if (existing) {
      await db
        .update(hcContractReviewSettings)
        .set({ settingValue: settings, updatedAt: new Date() })
        .where(eq(hcContractReviewSettings.id, existing.id))
    } else {
      await db.insert(hcContractReviewSettings).values({
        settingKey: 'overtime_spl_workflow',
        settingValue: settings,
      })
    }

    // Sync template overrides to central emailTemplates table
    if (settings.emailTemplates) {
      const templateMap: Record<string, { code: string; name: string; desc: string }> = {
        approvalStep: {
          code: 'overtime_approval_notification',
          name: 'Overtime Request (SPL) Approval Notification',
          desc: 'Email ganti giliran / permohonan persetujuan Surat Perintah Lembur (SPL).',
        },
        approvalCompleted: {
          code: 'overtime_completed_notification',
          name: 'Overtime Request Approved Notification',
          desc: 'Email pemberitahuan Surat Perintah Lembur (SPL) telah selesai disetujui penuh.',
        },
        reverted: {
          code: 'overtime_reverted_notification',
          name: 'Overtime Request Reverted Notification',
          desc: 'Email pemberitahuan Surat Perintah Lembur (SPL) dikembalikan untuk revisi.',
        },
        rejected: {
          code: 'overtime_rejected_notification',
          name: 'Overtime Request Rejected Notification',
          desc: 'Email pemberitahuan Surat Perintah Lembur (SPL) ditolak.',
        },
        reminder: {
          code: 'overtime_reminder_notification',
          name: 'Overtime Request Reminder Notification',
          desc: 'Email pengingat (reminder) approval Surat Perintah Lembur (SPL) yang masih pending.',
        },
      }

      for (const [key, tplInfo] of Object.entries(templateMap)) {
        const customTpl = settings.emailTemplates[key]
        if (customTpl && customTpl.subject) {
          const [existTpl] = await db
            .select({ id: emailTemplates.id })
            .from(emailTemplates)
            .where(eq(emailTemplates.templateCode, tplInfo.code))
            .limit(1)

          if (existTpl) {
            await db
              .update(emailTemplates)
              .set({
                subject: customTpl.subject,
                textContent: customTpl.body,
                updatedAt: new Date(),
              })
              .where(eq(emailTemplates.id, existTpl.id))
          } else {
            await db.insert(emailTemplates).values({
              templateCode: tplInfo.code,
              name: tplInfo.name,
              category: 'overtime',
              subject: customTpl.subject,
              textContent: customTpl.body,
              description: tplInfo.desc,
              isActive: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            } as any)
          }
        }
      }
    }

    safeRevalidatePath('/dashboard/overtime-requests')
    return { success: true }
  } catch (err: any) {
    console.error('Error saving Overtime workflow settings:', err)
    return { success: false, error: err.message || 'Gagal menyimpan pengaturan.' }
  }
}

