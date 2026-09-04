'use server'

import { and, asc, desc, eq, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { randomUUID } from 'crypto'

// HSE Izin Kerja PTW Server Actions
import { db } from '@/db'
import {
  employees,
  hsePtwPermits,
  ptwApprovals,
  hcContractReviewSettings,
} from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getPublicAppUrl } from '@/lib/auth-config'
import { sendWorkflowEmail } from '@/lib/workflow-email'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import {
  sendPtwStepApprovalEmail,
  sendPtwCompletedEmail,
  sendPtwRejectedEmail,
  sendPtwRevertedEmail,
} from '@/lib/activity-overtime-workflow-email'
import {
  type PtwWorkflowSettings,
  DEFAULT_PTW_SETTINGS,
} from '@/lib/workflow-settings-defaults'
import { normalizePermitTypes } from '@/lib/ptw-helpers'
import { withDbRetry } from '@/lib/hero-admin'

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Ignore error outside Next.js request context (e.g. test runner)
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

type PtwApprovalData = {
  permitId: number
  permitNumber: string
  projectName: string
  permitType: string
  location: string
  area: string
  startAt: Date | string | null
  endAt: Date | string | null
  applicantName: string
  fieldPicName: string
  authorizedByName: string
  status: string
  riskLevel: string
  description: string
  controlSteps: string
  ppe: string[]
  subTypes?: Record<string, string[]> | string[]
  additionalNotes?: string
  gasTestRequired: boolean
  isolationRequired: boolean
  registeredSignature?: string | null
  approvals: ApprovalStep[]
  permissions: {
    canApprove: boolean
    canEdit: boolean
  }
}

export async function syncPtwApproverNames(
  permitId: number,
  applicantName?: string,
  fieldPicName?: string,
  authorizedByName?: string
) {
  const syncStepApprover = async (stepOrder: number, rawName: string) => {
    if (!rawName) return
    const cleanName = rawName.includes(' — ') ? rawName.split(' — ')[0].trim() : rawName.trim()
    const [emp] = cleanName
      ? await db
          .select({ id: employees.id, email: employees.email, signatureDataUrl: employees.signatureDataUrl })
          .from(employees)
          .where(eq(employees.name, cleanName))
          .limit(1)
      : []

    const sigUrl = emp?.signatureDataUrl || null
    await db
      .update(ptwApprovals)
      .set({
        approverName: cleanName,
        ...(emp ? { approverEmail: emp.email, approverEmployeeId: emp.id } : {}),
        ...(sigUrl ? { signatureDataUrl: sigUrl } : {}),
      })
      .where(
        and(
          eq(ptwApprovals.ptwPermitId, permitId),
          eq(ptwApprovals.stepOrder, stepOrder)
        )
      )
  }

  // Step 1: Pemberi Kerja
  if (fieldPicName !== undefined) {
    await syncStepApprover(1, fieldPicName)
  }

  // Step 2..N: Pelaksana Kerja (Multi-Person)
  if (applicantName !== undefined) {
    const rawApplicants = applicantName.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean)
    if (rawApplicants.length > 0) {
      for (let i = 0; i < rawApplicants.length; i++) {
        await syncStepApprover(2 + i, rawApplicants[i])
      }
    } else {
      await syncStepApprover(2, applicantName)
    }
  }

  // Final Step: Safety Dept
  if (authorizedByName !== undefined) {
    const [lastStep] = await db
      .select({ stepOrder: ptwApprovals.stepOrder })
      .from(ptwApprovals)
      .where(and(eq(ptwApprovals.ptwPermitId, permitId), eq(ptwApprovals.approverRole, 'field_pic')))
      .limit(1)

    if (lastStep?.stepOrder) {
      await syncStepApprover(lastStep.stepOrder, authorizedByName)
    } else {
      const [maxStep] = await db
        .select({ maxOrder: sql<number>`max(${ptwApprovals.stepOrder})` })
        .from(ptwApprovals)
        .where(eq(ptwApprovals.ptwPermitId, permitId))
      if (maxStep?.maxOrder) {
        await syncStepApprover(maxStep.maxOrder, authorizedByName)
      }
    }
  }
}

// ── Ensure Approval Steps Exist ────────────────────────────────────────────

export async function ensurePtwApprovalsExist(permitId: number) {
  const [existing] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ptwApprovals)
    .where(eq(ptwApprovals.ptwPermitId, permitId))

  if (existing && existing.count > 0) return

  const [permit] = await db
    .select()
    .from(hsePtwPermits)
    .where(eq(hsePtwPermits.id, permitId))
    .limit(1)

  if (!permit) return

  // 1. Pemberi Kerja Employee lookup (Step 1)
  const cleanFieldPic = (permit.fieldPicName || 'Pemberi Kerja').includes(' — ')
    ? (permit.fieldPicName || '').split(' — ')[0].trim()
    : (permit.fieldPicName || '').trim()

  const [fieldPicEmp] = cleanFieldPic
    ? await db
        .select({ id: employees.id, email: employees.email, signatureDataUrl: employees.signatureDataUrl })
        .from(employees)
        .where(eq(employees.name, cleanFieldPic))
        .limit(1)
    : []

  // 2. Multi-person Applicants lookup (Step 2..N)
  const [creator] = permit.createdByEmployeeId
    ? await db
        .select({ id: employees.id, name: employees.name, email: employees.email, signatureDataUrl: employees.signatureDataUrl })
        .from(employees)
        .where(eq(employees.id, permit.createdByEmployeeId))
        .limit(1)
    : []

  const rawApplicants = (permit.applicantName || creator?.name || 'Pelaksana Kerja')
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const applicantList = rawApplicants.length > 0 ? rawApplicants : ['Pelaksana Kerja']

  const applicantEmpPromises = applicantList.map(async (name) => {
    const cleanName = name.includes(' — ') ? name.split(' — ')[0].trim() : name.trim()
    const [emp] = cleanName
      ? await db
          .select({ id: employees.id, name: employees.name, email: employees.email, signatureDataUrl: employees.signatureDataUrl })
          .from(employees)
          .where(eq(employees.name, cleanName))
          .limit(1)
      : []
    return {
      name: cleanName,
      email: emp?.email || '',
      empId: emp?.id || null,
      signatureDataUrl: emp?.signatureDataUrl || null,
    }
  })
  const applicantEmpList = await Promise.all(applicantEmpPromises)

  // 3. Safety Dept Employee lookup (Final Step)
  const cleanAuthorized = (permit.authorizedByName || 'Safety Dept').includes(' — ')
    ? (permit.authorizedByName || '').split(' — ')[0].trim()
    : (permit.authorizedByName || '').trim()

  const [authorizedEmp] = cleanAuthorized
    ? await db
        .select({ id: employees.id, email: employees.email, signatureDataUrl: employees.signatureDataUrl })
        .from(employees)
        .where(eq(employees.name, cleanAuthorized))
        .limit(1)
    : []

  // Sequence: Pemberi Kerja (Step 1) -> Pelaksana Kerja 1..N (Step 2..) -> Safety Dept (Final Step)
  const steps: Array<{
    stepOrder: number
    stepLabel: string
    approverRole: string
    name: string
    email: string
    empId: number | null
    signatureDataUrl: string | null
  }> = []

  // Step 1: Pemberi Kerja
  steps.push({
    stepOrder: 1,
    stepLabel: 'Pemberi Kerja',
    approverRole: 'safety_officer',
    name: cleanFieldPic || 'Pemberi Kerja',
    email: fieldPicEmp?.email || '',
    empId: fieldPicEmp?.id || null,
    signatureDataUrl: fieldPicEmp?.signatureDataUrl || null,
  })

  // Step 2..N: Pelaksana Kerja (Multi)
  applicantEmpList.forEach((app, idx) => {
    steps.push({
      stepOrder: 2 + idx,
      stepLabel: applicantEmpList.length > 1 ? `Pelaksana Kerja ${idx + 1}` : 'Pelaksana Kerja',
      approverRole: 'applicant',
      name: app.name,
      email: app.email,
      empId: app.empId,
      signatureDataUrl: app.signatureDataUrl,
    })
  })

  // Final Step: Safety Dept
  const safetyOrder = 2 + applicantEmpList.length
  steps.push({
    stepOrder: safetyOrder,
    stepLabel: 'Safety Dept',
    approverRole: 'field_pic',
    name: cleanAuthorized || 'Safety Dept',
    email: authorizedEmp?.email || '',
    empId: authorizedEmp?.id || null,
    signatureDataUrl: authorizedEmp?.signatureDataUrl || null,
  })

  let step1Token = ''
  let step1Name = ''
  let step1Email = ''
  const pemberiHasSig = Boolean(steps[0]?.signatureDataUrl)

  for (const step of steps) {
    const token = randomUUID()
    const hasSig = Boolean(step.signatureDataUrl)
    if (step.stepOrder === 1) {
      step1Token = token
      step1Name = step.name
      step1Email = step.email
    }
    try {
      await db.insert(ptwApprovals).values({
        ptwPermitId: permitId,
        stepOrder: step.stepOrder,
        stepLabel: step.stepLabel,
        approvalToken: token,
        approverName: step.name,
        approverEmail: step.email,
        approverEmployeeId: step.empId,
        approverRole: step.approverRole,
        status: step.stepOrder === 1
          ? (hasSig ? 'approved' : 'pending')
          : (step.stepOrder === 2 && pemberiHasSig ? 'pending' : 'waiting'),
        signatureDataUrl: (step.stepOrder === 1 && hasSig) ? step.signatureDataUrl : null,
        signedAt: (step.stepOrder === 1 && hasSig) ? new Date() : null,
        createdAt: new Date(),
      }).onConflictDoNothing()
    } catch {
      // Ignore concurrent insertion conflict
    }
  }

  if (step1Token && step1Email && !pemberiHasSig) {
    try {
      await sendPtwStepApprovalEmail({
        permitId,
        permitNumber: permit.permitNumber || '',
        projectName: permit.projectName || 'Izin Kerja PTW',
        location: permit.location,
        permitType: permit.permitType,
        applicantName: permit.applicantName || 'Pelaksana Kerja',
        approverName: step1Name || 'Pemberi Kerja',
        approverEmail: step1Email,
        approvalStep: 'Pemberi Kerja Sign',
        approvalToken: step1Token,
      })
    } catch (mailErr) {
      console.error('Error sending initial Pemberi Kerja step approval email:', mailErr)
    }
  }
}

// ── Get PTW Approval Data ─────────────────────────────────────────────────

export async function getPtwApprovalData(permitId: number): Promise<PtwApprovalData | null> {
  await ensurePtwApprovalsExist(permitId)

  const [permit] = await withDbRetry(() =>
    db
      .select()
      .from(hsePtwPermits)
      .where(eq(hsePtwPermits.id, permitId))
      .limit(1)
  )

  if (!permit) return null

  const approvalRows = await withDbRetry(() =>
    db
      .select()
      .from(ptwApprovals)
      .where(eq(ptwApprovals.ptwPermitId, permitId))
      .orderBy(asc(ptwApprovals.stepOrder))
  )

  // Check permissions & current employee signature
  const session = await getServerSession()
  const userEmail = session?.user?.email?.trim().toLowerCase() || ''
  const [currentEmployee] = await withDbRetry(() =>
    db
      .select({ id: employees.id, accessRole: employees.accessRole, signatureDataUrl: employees.signatureDataUrl })
      .from(employees)
      .where(sql`LOWER(TRIM(${employees.email})) = ${userEmail}`)
      .limit(1)
  )

  let registeredSignature: string | null = currentEmployee?.signatureDataUrl || null

  // Pre-fetch all employee signatures to populate any missing approval step signatureDataUrl
  const allEmpSignatures = await withDbRetry(() =>
    db
      .select({ id: employees.id, email: employees.email, name: employees.name, signatureDataUrl: employees.signatureDataUrl })
      .from(employees)
      .where(sql`${employees.signatureDataUrl} IS NOT NULL`)
  )

  const empSigMapByEmail = new Map<string, string>()
  const empSigMapById = new Map<number, string>()
  const empSigMapByName = new Map<string, string>()
  for (const empSig of allEmpSignatures) {
    if (empSig.signatureDataUrl) {
      if (empSig.email) empSigMapByEmail.set(empSig.email.trim().toLowerCase(), empSig.signatureDataUrl)
      if (empSig.id) empSigMapById.set(empSig.id, empSig.signatureDataUrl)
      if (empSig.name) empSigMapByName.set(empSig.name.trim().toLowerCase(), empSig.signatureDataUrl)
    }
  }

  const mappedApprovals = approvalRows.map((a) => {
    const isSignedStep = a.status === 'approved' || a.status === 'signed' || a.status === 'completed' || Boolean(a.signedAt)
    let sig = a.signatureDataUrl || null
    if (!sig && isSignedStep) {
      if (a.approverEmployeeId && empSigMapById.has(a.approverEmployeeId)) {
        sig = empSigMapById.get(a.approverEmployeeId)!
      } else if (a.approverEmail && empSigMapByEmail.has(a.approverEmail.trim().toLowerCase())) {
        sig = empSigMapByEmail.get(a.approverEmail.trim().toLowerCase())!
      } else if (a.approverName && empSigMapByName.has(a.approverName.trim().toLowerCase())) {
        sig = empSigMapByName.get(a.approverName.trim().toLowerCase())!
      }
    }
    return {
      id: a.id,
      stepOrder: a.stepOrder,
      stepLabel: a.stepLabel || (
        a.stepOrder === 1 || a.approverRole === 'safety_officer' || a.approverRole === 'pemberi_kerja'
          ? 'Pemberi Kerja'
          : a.approverRole === 'applicant'
          ? 'Pelaksana Kerja'
          : 'Safety Dept'
      ),
      approverName: a.approverName,
      approverRole: a.approverRole,
      status: a.status,
      signatureDataUrl: isSignedStep ? sig : null,
      remarks: a.remarks,
      signedAt: a.signedAt,
    }
  })

  const canApprove = Boolean(currentEmployee) && approvalRows.some(
    (a) => a.status === 'pending' && (a.approverEmployeeId === currentEmployee?.id || ['Super Admin', 'Site Admin', 'HC Manager'].includes(currentEmployee?.accessRole ?? ''))
  )

  return {
    permitId: permit.id,
    permitNumber: permit.permitNumber,
    projectName: permit.projectName,
    permitType: permit.permitType,
    location: permit.location,
    area: permit.area,
    startAt: permit.startAt,
    endAt: permit.endAt,
    applicantName: permit.applicantName,
    fieldPicName: permit.fieldPicName,
    authorizedByName: permit.authorizedByName,
    status: permit.status,
    riskLevel: permit.riskLevel,
    description: permit.description,
    controlSteps: permit.controlSteps,
    ppe: (permit.ppe as string[]) || [],
    subTypes: (permit.subTypes as Record<string, string[]> | string[]) || [],
    additionalNotes: permit.additionalNotes || '',
    gasTestRequired: permit.gasTestRequired,
    isolationRequired: permit.isolationRequired,
    registeredSignature,
    approvals: mappedApprovals,
    permissions: {
      canApprove,
      canEdit: permit.status === 'Draft' || permit.status === 'Returned',
    },
  }
}

// ── Save PTW Approval Form ────────────────────────────────────────────────

export async function savePtwApprovalForm(params: {
  permitId: number
  projectName?: string
  permitType?: string
  location?: string
  area?: string
  startAt?: Date | string
  endAt?: Date | string
  applicantName?: string
  fieldPicName?: string
  authorizedByName?: string
  status?: string
  riskLevel?: string
  description?: string
  controlSteps?: string
  ppe?: string[]
  subTypes?: Record<string, string[]> | string[]
  additionalNotes?: string
  checkedEquipment?: string[]
  signatures?: Record<number, string>
  stepRemarks?: Record<number, string>
  remarks?: string
}) {
  try {
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (params.projectName !== undefined) updates.projectName = params.projectName
    if (params.permitType !== undefined) updates.permitType = normalizePermitTypes(params.permitType)
    if (params.location !== undefined) updates.location = params.location
    if (params.area !== undefined) updates.area = params.area
    if (params.startAt !== undefined && !isNaN(new Date(params.startAt).getTime())) updates.startAt = new Date(params.startAt)
    if (params.endAt !== undefined && !isNaN(new Date(params.endAt).getTime())) updates.endAt = new Date(params.endAt)
    if (params.applicantName !== undefined) updates.applicantName = params.applicantName
    if (params.fieldPicName !== undefined) updates.fieldPicName = params.fieldPicName
    if (params.authorizedByName !== undefined) updates.authorizedByName = params.authorizedByName
    if (params.status !== undefined) updates.status = params.status
    if (params.riskLevel !== undefined) updates.riskLevel = params.riskLevel
    if (params.description !== undefined) updates.description = params.description
    if (params.controlSteps !== undefined) updates.controlSteps = params.controlSteps
    if (params.additionalNotes !== undefined) updates.additionalNotes = params.additionalNotes
    
    if (params.ppe !== undefined) updates.ppe = params.ppe
    if (params.subTypes !== undefined) updates.subTypes = params.subTypes

    await db
      .update(hsePtwPermits)
      .set(updates)
      .where(eq(hsePtwPermits.id, params.permitId))

    await syncPtwApproverNames(
      params.permitId,
      params.applicantName,
      params.fieldPicName,
      params.authorizedByName
    )

    if (params.stepRemarks && typeof params.stepRemarks === 'object') {
      for (const [stepIdStr, remark] of Object.entries(params.stepRemarks)) {
        const stepId = Number(stepIdStr)
        if (stepId && remark !== undefined) {
          await db
            .update(ptwApprovals)
            .set({ remarks: remark })
            .where(eq(ptwApprovals.id, stepId))
        }
      }
    }

    if (params.signatures && typeof params.signatures === 'object') {
      for (const [stepIdStr, sigUrl] of Object.entries(params.signatures || {})) {
        const stepId = Number(stepIdStr)
        if (stepId && sigUrl) {
          await db
            .update(ptwApprovals)
            .set({
              signatureDataUrl: sigUrl,
              signedAt: new Date(),
              status: 'approved',
              remarks: params.stepRemarks?.[stepId] ?? undefined,
            })
            .where(eq(ptwApprovals.id, stepId))
        }
      }
    }

    safeRevalidatePath('/dashboard/hse/izin-kerja-ptw')
    safeRevalidatePath(`/dashboard/hse/izin-kerja-ptw/${params.permitId}`)
    safeRevalidatePath(`/dashboard/hse/izin-kerja-ptw/${params.permitId}/approval`)
    safeRevalidatePath('/mobile/hse/ptw')
    safeRevalidatePath('/dashboard/approval')
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Terjadi kesalahan' }
  }
}

// ── Submit PTW Approval Step ──────────────────────────────────────────────

type SubmitActionState = { status: 'idle' | 'success' | 'error'; message: string }

export async function submitPtwApprovalStepAction(
  _state: SubmitActionState,
  formData: FormData
): Promise<SubmitActionState> {
  try {
    const permitId = Number(formData.get('sessionId'))
    const approvalId = Number(formData.get('approvalId'))
    const action = formData.get('action')
    const signatureDataUrl = formData.get('signatureDataUrl') as string
    const remarks = (formData.get('remarks') as string) || ''

    if (!permitId || !approvalId) {
      return { status: 'error', message: 'Parameter tidak valid.' }
    }

    const [approval] = await db
      .select()
      .from(ptwApprovals)
      .where(eq(ptwApprovals.id, approvalId))
      .limit(1)

    if (!approval) {
      return { status: 'error', message: 'Approval step tidak ditemukan.' }
    }

    const [permit] = await db
      .select()
      .from(hsePtwPermits)
      .where(eq(hsePtwPermits.id, permitId))
      .limit(1)

    if (approval.status !== 'pending') {
      return { status: 'error', message: 'Approval step sudah diproses.' }
    }

    if (action === 'revert') {
      const now = new Date()

      // 1. Mark reverting step as reverted, saving remarks, timestamp, and signature
      await db
        .update(ptwApprovals)
        .set({
          status: 'reverted',
          remarks: remarks || 'Dokumen PTW dikembalikan untuk revisi.',
          signedAt: now,
          ...(signatureDataUrl ? { signatureDataUrl } : {}),
        })
        .where(eq(ptwApprovals.id, approval.id))

      // 2. Reset steps AFTER reverting step to waiting
      await db
        .update(ptwApprovals)
        .set({
          status: 'waiting',
        })
        .where(
          and(
            eq(ptwApprovals.ptwPermitId, permitId),
            sql`${ptwApprovals.stepOrder} > ${approval.stepOrder}`
          )
        )

      // 3. Set Step 1 to pending for re-submission (PRESERVING existing signatures!)
      await db
        .update(ptwApprovals)
        .set({
          status: 'pending',
        })
        .where(
          and(
            eq(ptwApprovals.ptwPermitId, permitId),
            eq(ptwApprovals.stepOrder, 1)
          )
        )

      // 4. Update master permit status to Reverted
      await db
        .update(hsePtwPermits)
        .set({ status: 'Reverted', updatedAt: now })
        .where(eq(hsePtwPermits.id, permitId))

      const [step1] = await db
        .select()
        .from(ptwApprovals)
        .where(
          and(
            eq(ptwApprovals.ptwPermitId, permitId),
            eq(ptwApprovals.stepOrder, 1)
          )
        )
        .limit(1)

      try {
        if (step1?.approverEmail) {
          await sendPtwRevertedEmail({
            permitId,
            permitNumber: permit?.permitNumber || '',
            projectName: permit?.projectName || 'Izin Kerja',
            targetApproverName: step1.approverName || 'Pemohon / Step 1',
            targetApproverEmail: step1.approverEmail,
            managerName: approval.approverName || 'Atasan',
            revertReason: remarks,
          })
        }
      } catch (mailErr) {
        console.error('Error sending PTW reverted email:', mailErr)
      }

      safeRevalidatePath('/dashboard/hse/izin-kerja-ptw')
      safeRevalidatePath(`/dashboard/hse/izin-kerja-ptw/${permitId}/approval`)
      return { status: 'success', message: 'Dokumen PTW berhasil dikembalikan untuk revisi.' }
    }

    if (action === 'approve') {
      if (!signatureDataUrl) {
        return { status: 'error', message: 'Tanda tangan digital wajib diisi.' }
      }

      const signedAtNow = new Date()
      await db
        .update(ptwApprovals)
        .set({
          status: 'approved',
          signatureDataUrl,
          remarks,
          signedAt: signedAtNow,
        })
        .where(eq(ptwApprovals.id, approvalId))

      // Persist signature to employees table for current employee and step approver
      try {
        if (approval.approverEmployeeId) {
          await db
            .update(employees)
            .set({ signatureDataUrl, signatureRegisteredAt: signedAtNow })
            .where(eq(employees.id, approval.approverEmployeeId))
        }
        if (approval.approverEmail) {
          await db
            .update(employees)
            .set({ signatureDataUrl, signatureRegisteredAt: signedAtNow })
            .where(sql`LOWER(TRIM(${employees.email})) = ${approval.approverEmail.trim().toLowerCase()}`)
        }
        const currentEmp = await getCurrentEmployee()
        if (currentEmp) {
          await db
            .update(employees)
            .set({ signatureDataUrl, signatureRegisteredAt: signedAtNow })
            .where(eq(employees.id, currentEmp.id))
        }
      } catch (empErr) {
        console.error('Error persisting employee signature in submitPtwApprovalStepAction:', empErr)
      }

      // Unlock next step
      const [nextStep] = await db
        .select()
        .from(ptwApprovals)
        .where(
          and(
            eq(ptwApprovals.ptwPermitId, permitId),
            eq(ptwApprovals.status, 'waiting'),
            sql`${ptwApprovals.stepOrder} > ${approval.stepOrder}`
          )
        )
        .orderBy(asc(ptwApprovals.stepOrder))
        .limit(1)

      if (nextStep) {
        await db
          .update(ptwApprovals)
          .set({ status: 'pending' })
          .where(eq(ptwApprovals.id, nextStep.id))

        await db
          .update(hsePtwPermits)
          .set({ status: 'In Progress', updatedAt: new Date() })
          .where(eq(hsePtwPermits.id, permitId))

        try {
          if (nextStep.approverEmail) {
            await sendPtwStepApprovalEmail({
              permitId,
              permitNumber: permit?.permitNumber || '',
              projectName: permit?.projectName || 'Izin Kerja PTW',
              location: permit?.location,
              permitType: permit?.permitType,
              applicantName: permit?.applicantName || 'Pemohon',
              approverName: nextStep.approverName || 'Approver',
              approverEmail: nextStep.approverEmail,
              approvalStep: nextStep.stepLabel,
              approvalToken: nextStep.approvalToken,
            })

            await notifyWorkflowBellRecipients({
              recipientEmails: [nextStep.approverEmail],
              eventType: 'hse_ptw_approval_needed',
              category: 'approval_requests',
              title: `Approval PTW - ${nextStep.stepLabel}`,
              body: `Izin Kerja PTW #${permit?.permitNumber || ''} memerlukan approval/tanda tangan Anda pada tahap ${nextStep.stepLabel}.`,
              url: `/dashboard/hse/izin-kerja-ptw/${permitId}/approval`,
              tagPrefix: 'hse-ptw-approval',
              metadata: { permitId, stepOrder: nextStep.stepOrder, token: nextStep.approvalToken },
            }).catch((err) => console.error('Error notifying next approver bell:', err))
          }
        } catch (mailErr) {
          console.error('Error sending PTW step approval email:', mailErr)
        }
      } else {
        // All steps approved — update PTW status
        await db
          .update(hsePtwPermits)
          .set({ status: 'Approved', updatedAt: new Date() })
          .where(eq(hsePtwPermits.id, permitId))

        const [step1] = await db
          .select()
          .from(ptwApprovals)
          .where(
            and(
              eq(ptwApprovals.ptwPermitId, permitId),
              eq(ptwApprovals.stepOrder, 1)
            )
          )
          .limit(1)

        try {
          if (step1?.approverEmail) {
            await sendPtwCompletedEmail({
              permitId,
              permitNumber: permit?.permitNumber || '',
              projectName: permit?.projectName || 'Izin Kerja PTW',
              applicantEmail: step1.approverEmail,
              applicantName: permit?.applicantName || step1.approverName || 'Pemohon',
            })

            await notifyWorkflowBellRecipients({
              recipientEmails: [step1.approverEmail],
              eventType: 'hse_ptw_approved',
              category: 'approval_requests',
              title: `PTW Disetujui: #${permit?.permitNumber || ''}`,
              body: `Izin Kerja Aman (PTW) #${permit?.permitNumber || ''} telah disetujui lengkap oleh seluruh approver.`,
              url: `/dashboard/hse/izin-kerja-ptw`,
              tagPrefix: 'hse-ptw-approved',
              metadata: { permitId },
            }).catch((err) => console.error('Error notifying applicant on completed:', err))
          }
        } catch (mailErr) {
          console.error('Error sending PTW completed email:', mailErr)
        }
      }
    } else if (action === 'reject') {
      await db
        .update(ptwApprovals)
        .set({ status: 'rejected', remarks, signedAt: new Date() })
        .where(eq(ptwApprovals.id, approvalId))

      await db
        .update(ptwApprovals)
        .set({ status: 'cancelled', remarks: '' })
        .where(
          and(
            eq(ptwApprovals.ptwPermitId, permitId),
            sql`${ptwApprovals.stepOrder} > ${approval.stepOrder}`
          )
        )

      await db
        .update(hsePtwPermits)
        .set({ status: 'Rejected', updatedAt: new Date() })
        .where(eq(hsePtwPermits.id, permitId))

      const [step1] = await db
        .select()
        .from(ptwApprovals)
        .where(
          and(
            eq(ptwApprovals.ptwPermitId, permitId),
            eq(ptwApprovals.stepOrder, 1)
          )
        )
        .limit(1)

      try {
        if (step1?.approverEmail) {
          await sendPtwRejectedEmail({
            permitId,
            permitNumber: permit?.permitNumber || '',
            projectName: permit?.projectName || 'Izin Kerja PTW',
            applicantEmail: step1.approverEmail,
            applicantName: permit?.applicantName || step1.approverName || 'Pemohon',
            approverName: approval.approverName || 'Approver',
            remarks,
          })

          await notifyWorkflowBellRecipients({
            recipientEmails: [step1.approverEmail],
            eventType: 'hse_ptw_rejected',
            category: 'approval_requests',
            title: `PTW Ditolak: #${permit?.permitNumber || ''}`,
            body: `Izin Kerja Aman (PTW) #${permit?.permitNumber || ''} ditolak oleh ${approval.approverName || 'Approver'}.${remarks ? ` Alasan: ${remarks}` : ''}`,
            url: `/dashboard/hse/izin-kerja-ptw`,
            tagPrefix: 'hse-ptw-rejected',
            metadata: { permitId },
          }).catch((err) => console.error('Error notifying applicant on rejected:', err))
        }
      } catch (mailErr) {
        console.error('Error sending PTW rejected email:', mailErr)
      }
    }

    safeRevalidatePath('/dashboard/hse/izin-kerja-ptw')
    safeRevalidatePath(`/dashboard/hse/izin-kerja-ptw/${permitId}/approval`)
    return { status: 'success', message: 'Approval berhasil diproses.' }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Terjadi kesalahan.' }
  }
}

// ── Delete PTW Permit Action ──────────────────────────────────────────────

export async function deletePtwPermitAction(permitId: number): Promise<{ success: boolean; error?: string }> {
  try {
    let sessionUser: { id?: string; email?: string | null; name?: string | null } | null = null
    try {
      const session = await auth.api.getSession({ headers: await headers() })
      if (session?.user?.email) sessionUser = session.user
    } catch {
      // Fallback
    }

    if (!sessionUser) {
      const fallbackSession = await getServerSession()
      if (fallbackSession?.user?.email) sessionUser = fallbackSession.user
    }

    if (!sessionUser?.email) throw new Error('Unauthorized - sesi login tidak ditemukan.')

    const [permit] = await db
      .select()
      .from(hsePtwPermits)
      .where(eq(hsePtwPermits.id, permitId))
      .limit(1)

    if (!permit) throw new Error('Izin Kerja PTW tidak ditemukan.')

    await db.delete(ptwApprovals).where(eq(ptwApprovals.ptwPermitId, permitId))
    await db.delete(hsePtwPermits).where(eq(hsePtwPermits.id, permitId))

    safeRevalidatePath('/dashboard/hse/izin-kerja-ptw')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting PTW permit:', error)
    return { success: false, error: error.message || 'Gagal menghapus izin kerja PTW.' }
  }
}

// ── Generate Test PTW Approval ────────────────────────────────────────────

export async function generateTestPtwApproval() {
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

    // Find or create test PTW permit
    const [existing] = await db
      .select({ id: hsePtwPermits.id })
      .from(hsePtwPermits)
      .where(eq(hsePtwPermits.createdByEmployeeId, currentEmployee.id))
      .orderBy(desc(hsePtwPermits.id))
      .limit(1)

    let permitId = existing?.id
    if (!permitId) {
      const [newPermit] = await db
        .insert(hsePtwPermits)
        .values({
          createdByEmployeeId: currentEmployee.id,
          permitNumber: `PTW-TEST-${Date.now().toString().slice(-6)}`,
          projectName: 'Workshop Overhaul & Maintenance',
          permitType: 'Hot Work',
          location: 'Workshop Central Services',
          area: 'Area Workshop A',
          applicantName: currentEmployee.name,
          fieldPicName: 'Safety Dept',
          authorizedByName: 'Pemberi Kerja',
          riskLevel: 'Medium',
          status: 'Submitted',
          startAt: new Date(),
          endAt: new Date(Date.now() + 8 * 3600 * 1000),
          description: 'Pekerjaan pengelasan dan penggantian komponen di area workshop Central Service.',
          controlSteps: 'Gunakan APD lengkap, siapkan APAR, dan isolasi area kerja.',
          ppe: ['Helmet', 'Safety Shoes', 'Safety Glasses', 'Gloves'],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: hsePtwPermits.id })

      permitId = newPermit.id
    }

    // Reset approvals for test
    await db.delete(ptwApprovals).where(eq(ptwApprovals.ptwPermitId, permitId))

    const testEmail = currentEmployee.email || 'admin@chitraparatama.co.id'
    const baseUrl = getPublicAppUrl()

    const steps = [
      { stepOrder: 1, stepLabel: 'Pelaksana Kerja', approverRole: 'applicant', name: currentEmployee.name, email: testEmail },
      { stepOrder: 2, stepLabel: 'Pemberi Kerja', approverRole: 'safety_officer', name: 'Pemberi Kerja', email: testEmail },
      { stepOrder: 3, stepLabel: 'Safety Dept', approverRole: 'field_pic', name: 'Safety Dept', email: testEmail },
    ]

    const links: Array<{ step: number; role: string; name: string; url: string }> = []

    for (const s of steps) {
      const token = randomUUID()
      await db.insert(ptwApprovals).values({
        ptwPermitId: permitId,
        stepOrder: s.stepOrder,
        stepLabel: s.stepLabel,
        approvalToken: token,
        approverName: s.name,
        approverEmail: s.email ?? '',
        approverRole: s.approverRole,
        status: s.stepOrder === 1 ? 'pending' : 'waiting',
        createdAt: new Date(),
      })

      links.push({
        step: s.stepOrder,
        role: s.stepLabel,
        name: s.name,
        url: `${baseUrl}/dashboard/hse/izin-kerja-ptw/${permitId}/approval`,
      })
    }

    // Send test email notification for Step 1
    const firstStepUrl = links[0]?.url || `${baseUrl}/dashboard/hse/izin-kerja-ptw/${permitId}/approval`
    try {
      await sendWorkflowEmail({
        to: testEmail,
        templateCode: 'ptw_permit_test_notification',
        templateName: 'Izin Kerja PTW Test Approval Notification',
        fallbackSubject: `[TEST APPROVAL] Izin Kerja PTW - ${currentEmployee.name}`,
        fallbackHtml: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:20px">
  <div style="background:linear-gradient(135deg,#0f172a,#059669);padding:24px;border-radius:10px 10px 0 0">
    <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:700">PT CHITRA PARATAMA</h1>
    <p style="color:#a7f3d0;font-size:12px;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">HSE Safety • Test Approval Izin Kerja (PTW)</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0">
    <p style="color:#1e293b;font-size:14px;line-height:1.6;margin:0 0 16px">Halo <strong>${currentEmployee.name}</strong>,</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;margin:0 0 20px">
      Test Approval Izin Kerja Aman (PTW) telah dibuat untuk verifikasi alur multi-level approval & tanda tangan elektronik.
    </p>
    <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin-bottom:24px;border-left:4px solid #059669">
      <table cellpadding="4" cellspacing="0" width="100%" style="font-size:13px;color:#334155">
        <tr><td width="140" style="color:#64748b">No. PTW:</td><td><strong>PTW-TEST-${permitId}</strong></td></tr>
        <tr><td style="color:#64748b">Pelaksana:</td><td>${currentEmployee.name}</td></tr>
        <tr><td style="color:#64748b">Tahap Pertama:</td><td style="color:#047857;font-weight:bold">Pelaksana Kerja</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:28px 0">
      <a href="${firstStepUrl}" style="background:#059669;color:#ffffff;padding:12px 28px;text-decoration:none;font-size:14px;font-weight:600;border-radius:6px;display:inline-block">Buka Form Approval PTW</a>
    </div>
    <p style="color:#94a3b8;font-size:11px;margin:24px 0 0;line-height:1.5;border-top:1px solid #f1f5f9;padding-top:16px">
      Email ini dikirim secara otomatis oleh Sistem HERO PT Chitra Paratama untuk keperluan Test Approval.
    </p>
  </div>
</div>
        `,
        fallbackText: `Halo ${currentEmployee.name},\n\nTest Approval Izin Kerja PTW telah dibuat.\n\nSilakan buka tautan berikut untuk menyetujui dan menandatangani:\n${firstStepUrl}\n\nHormat kami,\nPT Chitra Paratama`,
        variables: {
          employeeName: currentEmployee.name,
          permitNumber: `PTW-TEST-${permitId}`,
          approvalLink: firstStepUrl,
        },
      })
    } catch (mailErr) {
      console.warn('Non-blocking test email error:', mailErr)
    }

    try {
      safeRevalidatePath('/dashboard/hse/izin-kerja-ptw')
      safeRevalidatePath(`/dashboard/hse/izin-kerja-ptw/${permitId}/approval`)
    } catch {}

    return {
      success: true as const,
      data: {
        employee: currentEmployee.name,
        permitId,
        links,
      },
    }
  } catch (error: any) {
    console.error('Error generating test PTW approval:', error)
    return { success: false as const, error: error.message || 'Gagal membuat test approval.' }
  }
}

// ── Create PTW Permit ─────────────────────────────────────────────────────

export async function createPtwPermitAction(
  rawPayload:
    | {
        permitNumber?: string
        projectName?: string
        workDescription?: string
        permitType?: string
        selectedPermitTypes?: string | string[]
        location?: string
        area?: string
        riskLevel?: string
        applicantName?: string
        fieldPicName?: string
        authorizedByName?: string
        description?: string
        controlSteps?: string
        ppe?: string[] | string
        subTypes?: Record<string, string[]> | string[] | string
        checkedEquipment?: string[]
        gasTestRequired?: boolean
        isolationRequired?: boolean
        startAt?: Date | string
        startDate?: string
        startTime?: string
        endAt?: Date | string
        endDate?: string
        endTime?: string
      }
    | FormData
) {
  try {
    let payload: Record<string, any> = {}
    if (rawPayload instanceof FormData) {
      const ppeRaw = rawPayload.get('ppe') as string
      const typesRaw = rawPayload.get('selectedPermitTypes') as string
      const subTypesRaw = rawPayload.get('subTypes') as string
      let parsedPpe: string[] = []
      let parsedTypes: string[] = []
      let parsedSubTypes: Record<string, string[]> | string[] = {}
      try {
        if (ppeRaw) parsedPpe = JSON.parse(ppeRaw)
      } catch {
        if (ppeRaw) parsedPpe = [ppeRaw]
      }
      try {
        if (typesRaw) parsedTypes = JSON.parse(typesRaw)
      } catch {
        if (typesRaw) parsedTypes = [typesRaw]
      }
      try {
        if (subTypesRaw) parsedSubTypes = JSON.parse(subTypesRaw)
      } catch {
        if (subTypesRaw) parsedSubTypes = [subTypesRaw]
      }

      const pTypeStr = parsedTypes.length > 0
        ? parsedTypes.join(', ')
        : (rawPayload.get('permitType') as string) || ''

      payload = {
        permitNumber: (rawPayload.get('permitNumber') as string) || undefined,
        projectName: (rawPayload.get('projectName') as string) || (rawPayload.get('workDescription') as string) || '',
        permitType: pTypeStr,
        location: (rawPayload.get('location') as string) || '',
        area: (rawPayload.get('area') as string) || '',
        riskLevel: (rawPayload.get('riskLevel') as string) || 'Medium',
        applicantName: (rawPayload.get('applicantName') as string) || '',
        fieldPicName: (rawPayload.get('fieldPicName') as string) || '',
        authorizedByName: (rawPayload.get('authorizedByName') as string) || '',
        description: (rawPayload.get('description') as string) || (rawPayload.get('workDescription') as string) || '',
        controlSteps: (rawPayload.get('controlSteps') as string) || '',
        additionalNotes: (rawPayload.get('additionalNotes') as string) || (rawPayload.get('additionalExplanation') as string) || '',
        ppe: parsedPpe,
        subTypes: parsedSubTypes,
        gasTestRequired: rawPayload.get('gasTestRequired') === 'true' || rawPayload.get('gasTestRequired') === '1',
        isolationRequired: rawPayload.get('isolationRequired') === 'true' || rawPayload.get('isolationRequired') === '1',
        startDate: (rawPayload.get('startDate') as string) || undefined,
        startTime: (rawPayload.get('startTime') as string) || undefined,
        endDate: (rawPayload.get('endDate') as string) || undefined,
        endTime: (rawPayload.get('endTime') as string) || undefined,
      }
    } else {
      payload = { ...rawPayload }
      if (Array.isArray(payload.selectedPermitTypes)) {
        payload.permitType = payload.selectedPermitTypes.join(', ')
      } else if (typeof payload.selectedPermitTypes === 'string' && payload.selectedPermitTypes) {
        payload.permitType = payload.selectedPermitTypes
      }
      if (typeof payload.ppe === 'string') {
        try {
          payload.ppe = JSON.parse(payload.ppe)
        } catch {
          payload.ppe = [payload.ppe]
        }
      }
      if (typeof payload.subTypes === 'string') {
        try {
          payload.subTypes = JSON.parse(payload.subTypes)
        } catch {
          payload.subTypes = [payload.subTypes]
        }
      }
      if (payload.additionalExplanation && !payload.additionalNotes) {
        payload.additionalNotes = payload.additionalExplanation
      }
    }

    const session = await getServerSession()
    const userEmail = session?.user?.email ? session.user.email.trim().toLowerCase() : ''
    let [currentEmp] = userEmail
      ? await db
          .select()
          .from(employees)
          .where(sql`lower(${employees.email}) = ${userEmail}`)
          .limit(1)
      : []

    if (!currentEmp) {
      const [firstActive] = await db.select().from(employees).where(eq(employees.isActive, true)).limit(1)
      currentEmp = firstActive
    }

    const year = new Date().getFullYear()
    const prefix = `PTW-${year}-`
    const existingPermits = await db
      .select({ permitNumber: hsePtwPermits.permitNumber })
      .from(hsePtwPermits)

    let maxSequence = 0
    for (const p of existingPermits) {
      if (p.permitNumber && p.permitNumber.startsWith(prefix)) {
        const numPart = parseInt(p.permitNumber.replace(prefix, ''), 10)
        if (!isNaN(numPart) && numPart > maxSequence) {
          maxSequence = numPart
        }
      }
    }
    const nextNumber = payload.permitNumber || `${prefix}${String(maxSequence + 1).padStart(4, '0')}`

    let parsedStartAt = new Date()
    if (payload.startAt && !isNaN(new Date(payload.startAt).getTime())) {
      parsedStartAt = new Date(payload.startAt)
    } else if (payload.startDate) {
      const timeStr = payload.startTime || '08:00'
      const d = new Date(`${payload.startDate}T${timeStr}:00`)
      if (!isNaN(d.getTime())) parsedStartAt = d
    }

    let parsedEndAt = new Date(Date.now() + 8 * 3600 * 1000)
    if (payload.endAt && !isNaN(new Date(payload.endAt).getTime())) {
      parsedEndAt = new Date(payload.endAt)
    } else if (payload.endDate) {
      const timeStr = payload.endTime || '17:00'
      const d = new Date(`${payload.endDate}T${timeStr}:00`)
      if (!isNaN(d.getTime())) parsedEndAt = d
    }

    const resolvedApplicantName =
      payload.applicantName && payload.applicantName.trim()
        ? payload.applicantName.trim()
        : currentEmp?.name || 'Pelaksana Kerja'

    const normalizedPermitTypeStr = normalizePermitTypes(payload.permitType || 'Hot Work Permit')

    const ppeList = Array.isArray(payload.checkedEquipment) && payload.checkedEquipment.length > 0
      ? payload.checkedEquipment
      : (Array.isArray(payload.ppe) ? payload.ppe : [])

    const gasTestReq = payload.gasTestRequired !== undefined
      ? Boolean(payload.gasTestRequired)
      : normalizedPermitTypeStr.toUpperCase().includes('CONFINED')

    const isolationReq = payload.isolationRequired !== undefined
      ? Boolean(payload.isolationRequired)
      : (normalizedPermitTypeStr.toUpperCase().includes('HOT') ||
         normalizedPermitTypeStr.toUpperCase().includes('CONFINED') ||
         normalizedPermitTypeStr.toUpperCase().includes('ELECTRICAL'))

    const [inserted] = await db
      .insert(hsePtwPermits)
      .values({
        permitNumber: nextNumber,
        projectName: payload.projectName || 'Pekerjaan Berisiko PTW',
        permitType: normalizedPermitTypeStr,
        location: payload.location || 'Workshop',
        area: payload.area || '',
        riskLevel: payload.riskLevel || 'Medium',
        applicantName: resolvedApplicantName,
        fieldPicName: payload.fieldPicName?.trim() || 'Pemberi Kerja',
        authorizedByName: payload.authorizedByName?.trim() || 'Safety Dept',
        description: payload.description || '',
        controlSteps: payload.controlSteps || '',
        additionalNotes: payload.additionalNotes || '',
        ppe: ppeList,
        subTypes: payload.subTypes || {},
        gasTestRequired: gasTestReq,
        isolationRequired: isolationReq,
        startAt: parsedStartAt,
        endAt: parsedEndAt,
        status: 'Submitted',
        createdByEmployeeId: currentEmp?.id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    await ensurePtwApprovalsExist(inserted.id)

    safeRevalidatePath('/dashboard/hse/izin-kerja-ptw')
    return { success: true as const, data: inserted, permitId: inserted.id }
  } catch (error: any) {
    console.error('Error creating PTW permit:', error)
    return { success: false as const, error: error.message || 'Gagal membuat Izin Kerja PTW.' }
  }
}

// ── Send Due PTW Reminders ────────────────────────────────────────────────

export async function sendDuePtwReminders(targetPermitId?: number) {
  try {
    const baseUrl = getPublicAppUrl()
    const rawPendingList = await db
      .select({
        approvalId: ptwApprovals.id,
        permitId: ptwApprovals.ptwPermitId,
        token: ptwApprovals.approvalToken,
        stepLabel: ptwApprovals.stepLabel,
        stepOrder: ptwApprovals.stepOrder,
        approverName: ptwApprovals.approverName,
        approverEmail: ptwApprovals.approverEmail,
        permitNumber: hsePtwPermits.permitNumber,
        projectName: hsePtwPermits.projectName,
        permitType: hsePtwPermits.permitType,
        location: hsePtwPermits.location,
        applicantName: hsePtwPermits.applicantName,
        createdAt: hsePtwPermits.createdAt,
      })
      .from(ptwApprovals)
      .innerJoin(hsePtwPermits, eq(ptwApprovals.ptwPermitId, hsePtwPermits.id))
      .where(
        targetPermitId
          ? and(eq(ptwApprovals.status, 'pending'), eq(ptwApprovals.ptwPermitId, targetPermitId))
          : eq(ptwApprovals.status, 'pending')
      )
      .limit(50)

    const now = new Date()
    const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const pendingList = rawPendingList.filter((item) => {
      const isTestPermit =
        item.projectName.toUpperCase().includes('TEST') ||
        item.permitNumber.toUpperCase().includes('TEST')

      // If specific permit target is passed (e.g. from E2E test runner), allow test permit
      if (targetPermitId && item.permitId === targetPermitId) return true

      // Filter out test permits for global cron runs
      if (isTestPermit) return false

      // Only send reminder if permit was created > 24 hours ago (due/overdue)
      const createdDate = item.createdAt ? new Date(item.createdAt) : now
      return createdDate <= cutoff24h
    })

    let sent = 0
    let skipped = rawPendingList.length - pendingList.length

    for (const pending of pendingList) {
      const recipientEmail = pending.approverEmail?.trim() || ''
      if (!recipientEmail) {
        skipped++
        continue
      }
      const approvalLink = `${baseUrl}/dashboard/hse/izin-kerja-ptw/${pending.permitId || (pending as any).ptwPermitId}/approval`

      await sendWorkflowEmail({
        to: recipientEmail,
        templateCode: 'hse_ptw_approval_reminder',
        variables: {
          recipientName: pending.approverName || 'Approver',
          approverName: pending.approverName || 'Approver',
          permitNumber: pending.permitNumber,
          projectName: pending.projectName,
          permitType: pending.permitType,
          location: pending.location,
          applicantName: pending.applicantName || 'Pemohon',
          stepLabel: pending.stepLabel,
          approvalLink,
        },
        fallbackSubject: `[REMINDER] Persetujuan Izin Kerja PTW #${pending.permitNumber} - ${pending.projectName}`,
        fallbackText: `Halo ${pending.approverName},\n\nIni adalah pengingat persetujuan Izin Kerja Aman (PTW) #${pending.permitNumber} - "${pending.projectName}" pada tahap ${pending.stepLabel}.\n\nSilakan review dan tanda tangani melalui tautan berikut:\n${approvalLink}\n\nTerima kasih.`,
        fallbackHtml: `
          <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
              <span style="background: #ccfbf1; color: #115e59; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 9999px; text-transform: uppercase;">PTW Approval Reminder</span>
            </div>
            <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 12px; color: #0f172a;">Pengingat Persetujuan Izin Kerja Aman (PTW)</h2>
            <p style="font-size: 14px; line-height: 1.5; color: #334155; margin-bottom: 16px;">
              Halo <strong>${pending.approverName}</strong>,<br/>
              Pengajuan Izin Kerja Aman (PTW) <strong>#${pending.permitNumber}</strong> ("${pending.projectName}") masih menunggu persetujuan Anda pada tahap <strong>${pending.stepLabel}</strong>.
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
        eventType: 'hse_ptw_reminder',
        category: 'approval_requests',
        title: `Reminder Approval PTW: #${pending.permitNumber} - ${pending.projectName}`,
        body: `Mohon segera lakukan approval untuk tahap ${pending.stepLabel}.`,
        url: approvalLink,
        tagPrefix: 'hse-ptw-reminder',
        metadata: {
          permitId: pending.permitId,
          approvalId: pending.approvalId,
          stepOrder: pending.stepOrder,
        },
      })

      sent++
    }

    try {
      safeRevalidatePath('/dashboard/hse/izin-kerja-ptw')
      safeRevalidatePath('/dashboard/approval')
    } catch {}

    return { success: true as const, sent, skipped }
  } catch (error: any) {
    console.error('Error sending PTW reminders:', error)
    return { success: false as const, error: error.message || 'Gagal mengirim reminder.' }
  }
}

// ── Token Approval Methods ────────────────────────────────────────────────

export async function getPtwApprovalByToken(token: string) {
  try {
    if (!token) {
      return { success: false as const, error: 'Token approval tidak valid.' }
    }
    const cleanToken = token.trim().replace(/\s+/g, '-')

    const [approval] = await db
      .select()
      .from(ptwApprovals)
      .where(
        or(
          eq(ptwApprovals.approvalToken, token),
          eq(ptwApprovals.approvalToken, cleanToken)
        )
      )
      .limit(1)

    if (!approval) {
      return { success: false as const, error: 'Approval step tidak ditemukan.' }
    }

    const data = await getPtwApprovalData(approval.ptwPermitId)
    if (!data) {
      return { success: false as const, error: 'Dokumen PTW tidak ditemukan.' }
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
        .where(sql`LOWER(TRIM(${employees.email})) = ${approval.approverEmail.trim().toLowerCase()}`)
        .limit(1)
      registeredSignature = emp?.signatureDataUrl || null
    }
    if (!registeredSignature && approval.approverName) {
      const [emp] = await db
        .select({ signatureDataUrl: employees.signatureDataUrl })
        .from(employees)
        .where(sql`LOWER(TRIM(${employees.name})) = ${approval.approverName.trim().toLowerCase()}`)
        .limit(1)
      registeredSignature = emp?.signatureDataUrl || null
    }
    if (!registeredSignature && data?.registeredSignature) {
      registeredSignature = data.registeredSignature
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

export async function approvePtwStepByToken(
  token: string,
  payload: { signatureDataUrl: string; remarks?: string }
) {
  try {
    const [approval] = await db
      .select()
      .from(ptwApprovals)
      .where(eq(ptwApprovals.approvalToken, token))
      .limit(1)

    if (!approval) throw new Error('Approval token tidak valid.')
    if (approval.status === 'approved') return { success: true as const }

    // Check previous step
    const [prev] = await db
      .select()
      .from(ptwApprovals)
      .where(
        and(
          eq(ptwApprovals.ptwPermitId, approval.ptwPermitId),
          sql`${ptwApprovals.stepOrder} < ${approval.stepOrder}`
        )
      )
      .orderBy(desc(ptwApprovals.stepOrder))
      .limit(1)

    if (prev && prev.status !== 'approved') {
      throw new Error('Step sebelumnya belum di-approve.')
    }

    const signedAtNowToken = new Date()
    await db
      .update(ptwApprovals)
      .set({
        status: 'approved',
        signatureDataUrl: payload.signatureDataUrl,
        remarks: payload.remarks || '',
        signedAt: signedAtNowToken,
      })
      .where(eq(ptwApprovals.id, approval.id))

    // Persist signature to employees table for approver
    try {
      if (approval.approverEmployeeId) {
        await db
          .update(employees)
          .set({ signatureDataUrl: payload.signatureDataUrl, signatureRegisteredAt: signedAtNowToken })
          .where(eq(employees.id, approval.approverEmployeeId))
      }
      if (approval.approverEmail) {
        await db
          .update(employees)
          .set({ signatureDataUrl: payload.signatureDataUrl, signatureRegisteredAt: signedAtNowToken })
          .where(sql`LOWER(TRIM(${employees.email})) = ${approval.approverEmail.trim().toLowerCase()}`)
      }
    } catch (empErr) {
      console.error('Error persisting employee signature in approvePtwStepByToken:', empErr)
    }

    // Advance next step
    const [next] = await db
      .select()
      .from(ptwApprovals)
      .where(
        and(
          eq(ptwApprovals.ptwPermitId, approval.ptwPermitId),
          sql`${ptwApprovals.stepOrder} > ${approval.stepOrder}`,
          eq(ptwApprovals.status, 'waiting')
        )
      )
      .orderBy(asc(ptwApprovals.stepOrder))
      .limit(1)

    const [permit] = await db
      .select()
      .from(hsePtwPermits)
      .where(eq(hsePtwPermits.id, approval.ptwPermitId))
      .limit(1)

    if (next) {
      await db
        .update(ptwApprovals)
        .set({ status: 'pending' })
        .where(eq(ptwApprovals.id, next.id))

      await db
        .update(hsePtwPermits)
        .set({ status: 'In Progress', updatedAt: new Date() })
        .where(eq(hsePtwPermits.id, approval.ptwPermitId))

      try {
        if (next.approverEmail) {
          await sendPtwStepApprovalEmail({
            permitId: approval.ptwPermitId,
            permitNumber: permit?.permitNumber || '',
            projectName: permit?.projectName || 'Izin Kerja PTW',
            location: permit?.location,
            permitType: permit?.permitType,
            applicantName: permit?.applicantName || 'Pemohon',
            approverName: next.approverName || 'Approver',
            approverEmail: next.approverEmail,
            approvalStep: next.stepLabel,
            approvalToken: next.approvalToken,
          })

          await notifyWorkflowBellRecipients({
            recipientEmails: [next.approverEmail],
            eventType: 'hse_ptw_approval_needed',
            category: 'approval_requests',
            title: `Approval PTW - ${next.stepLabel}`,
            body: `Izin Kerja PTW #${permit?.permitNumber || ''} memerlukan approval/tanda tangan Anda pada tahap ${next.stepLabel}.`,
            url: `/dashboard/hse/izin-kerja-ptw/${approval.ptwPermitId}/approval`,
            tagPrefix: 'hse-ptw-approval',
            metadata: { permitId: approval.ptwPermitId, stepOrder: next.stepOrder, token: next.approvalToken },
          }).catch((err) => console.error('Error notifying next approver bell:', err))
        }
      } catch (mailErr) {
        console.error('Error sending PTW step approval email:', mailErr)
      }
    } else {
      await db
        .update(hsePtwPermits)
        .set({ status: 'Approved', updatedAt: new Date() })
        .where(eq(hsePtwPermits.id, approval.ptwPermitId))

      const [step1] = await db
        .select()
        .from(ptwApprovals)
        .where(
          and(
            eq(ptwApprovals.ptwPermitId, approval.ptwPermitId),
            eq(ptwApprovals.stepOrder, 1)
          )
        )
        .limit(1)

      try {
        if (step1?.approverEmail) {
          await sendPtwCompletedEmail({
            permitId: approval.ptwPermitId,
            permitNumber: permit?.permitNumber || '',
            projectName: permit?.projectName || 'Izin Kerja PTW',
            applicantEmail: step1.approverEmail,
            applicantName: permit?.applicantName || step1.approverName || 'Pemohon',
          })

          await notifyWorkflowBellRecipients({
            recipientEmails: [step1.approverEmail],
            eventType: 'hse_ptw_approved',
            category: 'approval_requests',
            title: `PTW Disetujui: #${permit?.permitNumber || ''}`,
            body: `Izin Kerja Aman (PTW) #${permit?.permitNumber || ''} telah disetujui lengkap oleh seluruh approver.`,
            url: `/dashboard/hse/izin-kerja-ptw`,
            tagPrefix: 'hse-ptw-approved',
            metadata: { permitId: approval.ptwPermitId },
          }).catch((err) => console.error('Error notifying applicant on completed:', err))
        }
      } catch (mailErr) {
        console.error('Error sending PTW completed email:', mailErr)
      }
    }

    safeRevalidatePath('/dashboard/hse/izin-kerja-ptw')
    safeRevalidatePath(`/dashboard/hse/izin-kerja-ptw/${approval.ptwPermitId}/approval`)
    safeRevalidatePath(`/review/ptw/${token}`)

    return { success: true as const }
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal memproses approval.' }
  }
}

export async function rejectPtwStepByToken(
  token: string,
  payload: { remarks?: string }
) {
  try {
    const [approval] = await db
      .select()
      .from(ptwApprovals)
      .where(eq(ptwApprovals.approvalToken, token))
      .limit(1)

    if (!approval) throw new Error('Approval token tidak valid.')

    await db
      .update(ptwApprovals)
      .set({
        status: 'rejected',
        remarks: payload.remarks || '',
        signedAt: new Date(),
      })
      .where(eq(ptwApprovals.id, approval.id))

    await db
      .update(ptwApprovals)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(ptwApprovals.ptwPermitId, approval.ptwPermitId),
          sql`${ptwApprovals.stepOrder} > ${approval.stepOrder}`
        )
      )

    await db
      .update(hsePtwPermits)
      .set({ status: 'Rejected', updatedAt: new Date() })
      .where(eq(hsePtwPermits.id, approval.ptwPermitId))

    const [permit] = await db
      .select()
      .from(hsePtwPermits)
      .where(eq(hsePtwPermits.id, approval.ptwPermitId))
      .limit(1)

    const [step1] = await db
      .select()
      .from(ptwApprovals)
      .where(
        and(
          eq(ptwApprovals.ptwPermitId, approval.ptwPermitId),
          eq(ptwApprovals.stepOrder, 1)
        )
      )
      .limit(1)

    try {
      if (step1?.approverEmail) {
        await sendPtwRejectedEmail({
          permitId: approval.ptwPermitId,
          permitNumber: permit?.permitNumber || '',
          projectName: permit?.projectName || 'Izin Kerja PTW',
          applicantEmail: step1.approverEmail,
          applicantName: permit?.applicantName || step1.approverName || 'Pemohon',
          approverName: approval.approverName || 'Approver',
          remarks: payload.remarks,
        })

        await notifyWorkflowBellRecipients({
          recipientEmails: [step1.approverEmail],
          eventType: 'hse_ptw_rejected',
          category: 'approval_requests',
          title: `PTW Ditolak: #${permit?.permitNumber || ''}`,
          body: `Izin Kerja Aman (PTW) #${permit?.permitNumber || ''} ditolak oleh ${approval.approverName || 'Approver'}.${payload.remarks ? ` Alasan: ${payload.remarks}` : ''}`,
          url: `/dashboard/hse/izin-kerja-ptw`,
          tagPrefix: 'hse-ptw-rejected',
          metadata: { permitId: approval.ptwPermitId },
        }).catch((err) => console.error('Error notifying applicant on rejected:', err))
      }
    } catch (mailErr) {
      console.error('Error sending PTW rejected email:', mailErr)
    }

    safeRevalidatePath('/dashboard/hse/izin-kerja-ptw')
    safeRevalidatePath(`/dashboard/hse/izin-kerja-ptw/${approval.ptwPermitId}/approval`)
    safeRevalidatePath(`/review/ptw/${token}`)

    return { success: true as const }
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal menolak approval.' }
  }
}

export async function revertPtwStepByToken(
  token: string,
  payload: { remarks?: string }
) {
  try {
    const [approval] = await db
      .select()
      .from(ptwApprovals)
      .where(eq(ptwApprovals.approvalToken, token))
      .limit(1)

    if (!approval) throw new Error('Approval token tidak valid.')
    if (approval.stepOrder < 2) {
      throw new Error('Hanya jabatan Leader ke atas yang dapat mengembalikan (revert) dokumen PTW.')
    }

    const now = new Date()

    // 1. Mark reverting step as reverted, saving remarks & timestamp
    await db
      .update(ptwApprovals)
      .set({
        status: 'reverted',
        remarks: payload.remarks || `Dokumen PTW dikembalikan oleh ${approval.stepLabel} untuk revisi.`,
        signedAt: now,
      })
      .where(eq(ptwApprovals.id, approval.id))

    // 2. Set steps AFTER reverting step to waiting
    await db
      .update(ptwApprovals)
      .set({
        status: 'waiting',
      })
      .where(
        and(
          eq(ptwApprovals.ptwPermitId, approval.ptwPermitId),
          sql`${ptwApprovals.stepOrder} > ${approval.stepOrder}`
        )
      )

    // 3. Set Step 1 to pending for re-submission (PRESERVING existing signatures!)
    await db
      .update(ptwApprovals)
      .set({
        status: 'pending',
      })
      .where(
        and(
          eq(ptwApprovals.ptwPermitId, approval.ptwPermitId),
          eq(ptwApprovals.stepOrder, 1)
        )
      )

    // 4. Update master permit status to Reverted
    await db
      .update(hsePtwPermits)
      .set({ status: 'Reverted', updatedAt: now })
      .where(eq(hsePtwPermits.id, approval.ptwPermitId))

    const [permit] = await db
      .select()
      .from(hsePtwPermits)
      .where(eq(hsePtwPermits.id, approval.ptwPermitId))
      .limit(1)

    const [step1] = await db
      .select()
      .from(ptwApprovals)
      .where(
        and(
          eq(ptwApprovals.ptwPermitId, approval.ptwPermitId),
          eq(ptwApprovals.stepOrder, 1)
        )
      )
      .limit(1)

    try {
      if (step1?.approverEmail) {
        await sendPtwRevertedEmail({
          permitId: approval.ptwPermitId,
          permitNumber: permit?.permitNumber || '',
          projectName: permit?.projectName || 'Izin Kerja',
          targetApproverName: step1.approverName || 'Pemohon / Step 1',
          targetApproverEmail: step1.approverEmail,
          managerName: approval.approverName || 'Atasan',
          revertReason: payload.remarks,
        })

        await notifyWorkflowBellRecipients({
          recipientEmails: [step1.approverEmail],
          eventType: 'hse_ptw_reverted',
        category: 'approval_requests',
          title: `PTW Perlu Revisi: #${permit?.permitNumber || ''}`,
          body: `Izin Kerja Aman (PTW) #${permit?.permitNumber || ''} dikembalikan oleh ${approval.approverName || 'Atasan'} untuk direvisi.${payload.remarks ? ` Alasan: ${payload.remarks}` : ''}`,
          url: `/dashboard/hse/izin-kerja-ptw`,
          tagPrefix: 'hse-ptw-reverted',
          metadata: { permitId: approval.ptwPermitId },
        }).catch((err) => console.error('Error notifying applicant on reverted:', err))
      }
    } catch (mailErr) {
      console.error('Error sending PTW reverted email:', mailErr)
    }

    safeRevalidatePath('/dashboard/hse/izin-kerja-ptw')
    safeRevalidatePath(`/dashboard/hse/izin-kerja-ptw/${approval.ptwPermitId}/approval`)
    safeRevalidatePath(`/review/ptw/${token}`)

    return { success: true as const }
  } catch (error: any) {
    return { success: false as const, error: error.message || 'Gagal mengembalikan approval.' }
  }
}

// ── Batch & Single Approval Actions (PTW Parity) ───────────────────────────

export async function batchApprovePtwPermitsAction(permitIds: number[], remarks?: string) {
  try {
    if (!permitIds || permitIds.length === 0) {
      return { success: false as const, error: 'Pilih minimal satu izin kerja PTW untuk diapprove.' }
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

    if (!empRecord?.signatureDataUrl) {
      return {
        success: false as const,
        needsSignatureRegistration: true as const,
        error: 'Anda belum mendaftarkan tanda tangan. Daftarkan tanda tangan terlebih dahulu.',
      }
    }

    const sigUrl = empRecord.signatureDataUrl
    const now = new Date()
    let approvedCount = 0

    for (const permitId of permitIds) {
      const [waitingStep] = await db
        .select()
        .from(ptwApprovals)
        .where(
          and(
            eq(ptwApprovals.ptwPermitId, permitId),
            or(eq(ptwApprovals.status, 'waiting'), eq(ptwApprovals.status, 'pending'))
          )
        )
        .orderBy(asc(ptwApprovals.stepOrder))
        .limit(1)

      if (!waitingStep) continue

      await db
        .update(ptwApprovals)
        .set({
          status: 'approved',
          signatureDataUrl: sigUrl,
          signedAt: now,
          approverName: empRecord.name || waitingStep.approverName,
          approverEmail: emp.email || waitingStep.approverEmail,
          remarks: remarks || 'Approved',
        })
        .where(eq(ptwApprovals.id, waitingStep.id))

      const [nextStep] = await db
        .select()
        .from(ptwApprovals)
        .where(
          and(
            eq(ptwApprovals.ptwPermitId, permitId),
            eq(ptwApprovals.stepOrder, waitingStep.stepOrder + 1)
          )
        )
        .limit(1)

      if (nextStep) {
        await db
          .update(ptwApprovals)
          .set({ status: 'pending' })
          .where(eq(ptwApprovals.id, nextStep.id))

        const [permit] = await db
          .select()
          .from(hsePtwPermits)
          .where(eq(hsePtwPermits.id, permitId))
          .limit(1)

        if (permit) {
          try {
            if (nextStep.approverEmail) {
              await sendPtwStepApprovalEmail({
                permitId,
                permitNumber: permit.permitNumber || '',
                projectName: permit.projectName || 'Izin Kerja PTW',
                location: permit.location,
                permitType: permit.permitType,
                applicantName: permit.applicantName || 'Pemohon',
                approverName: nextStep.approverName || 'Approver',
                approverEmail: nextStep.approverEmail,
                approvalStep: nextStep.stepLabel,
                approvalToken: nextStep.approvalToken || '',
              })

              await notifyWorkflowBellRecipients({
                recipientEmails: [nextStep.approverEmail],
                eventType: 'hse_ptw_approval_needed',
                category: 'approval_requests',
                title: `Approval PTW - ${nextStep.stepLabel}`,
                body: `Izin Kerja PTW #${permit?.permitNumber || ''} memerlukan approval/tanda tangan Anda pada tahap ${nextStep.stepLabel}.`,
                url: `/dashboard/hse/izin-kerja-ptw/${permitId}/approval`,
                tagPrefix: 'hse-ptw-approval',
                metadata: { permitId, stepOrder: nextStep.stepOrder, token: nextStep.approvalToken },
              }).catch((err) => console.error('Error notifying next approver bell:', err))
            }
          } catch (mailErr) {
            console.error('Error sending PTW next step email:', mailErr)
          }
        }
      } else {
        await db
          .update(hsePtwPermits)
          .set({ status: 'Approved', updatedAt: now })
          .where(eq(hsePtwPermits.id, permitId))

        const [permit] = await db
          .select()
          .from(hsePtwPermits)
          .where(eq(hsePtwPermits.id, permitId))
          .limit(1)

        const [step1] = await db
          .select()
          .from(ptwApprovals)
          .where(
            and(
              eq(ptwApprovals.ptwPermitId, permitId),
              eq(ptwApprovals.stepOrder, 1)
            )
          )
          .limit(1)

        try {
          if (step1?.approverEmail) {
            await sendPtwCompletedEmail({
              permitId,
              permitNumber: permit?.permitNumber || '',
              projectName: permit?.projectName || 'Izin Kerja PTW',
              applicantEmail: step1.approverEmail,
              applicantName: permit?.applicantName || step1.approverName || 'Pemohon',
            })

            await notifyWorkflowBellRecipients({
              recipientEmails: [step1.approverEmail],
              eventType: 'hse_ptw_approved',
              category: 'approval_requests',
              title: `PTW Disetujui: #${permit?.permitNumber || ''}`,
              body: `Izin Kerja Aman (PTW) #${permit?.permitNumber || ''} telah disetujui lengkap oleh seluruh approver.`,
              url: `/dashboard/hse/izin-kerja-ptw`,
              tagPrefix: 'hse-ptw-approved',
              metadata: { permitId },
            }).catch((err) => console.error('Error notifying applicant on completed:', err))
          }
        } catch (mailErr) {
          console.error('Error sending PTW completed email:', mailErr)
        }
      }

      approvedCount++
    }

    safeRevalidatePath('/dashboard/hse/izin-kerja-ptw')
    safeRevalidatePath('/dashboard/approval')

    return {
      success: true as const,
      approvedCount,
      totalSelected: permitIds.length,
    }
  } catch (error: any) {
    console.error('Error batch approving PTW permits:', error)
    return { success: false as const, error: error.message || 'Gagal menyetujui PTW secara massal.' }
  }
}

export async function batchRejectPtwPermitsAction(permitIds: number[], remarks?: string) {
  try {
    if (!permitIds || permitIds.length === 0) {
      return { success: false as const, error: 'Pilih minimal satu PTW.' }
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

    const sigUrl = empRecord?.signatureDataUrl || null
    const now = new Date()
    for (const permitId of permitIds) {
      const [pendingStep] = await db
        .select()
        .from(ptwApprovals)
        .where(
          and(
            eq(ptwApprovals.ptwPermitId, permitId),
            eq(ptwApprovals.status, 'pending')
          )
        )
        .orderBy(asc(ptwApprovals.stepOrder))
        .limit(1)

      const targetStep = pendingStep || (await db
        .select()
        .from(ptwApprovals)
        .where(eq(ptwApprovals.ptwPermitId, permitId))
        .orderBy(desc(ptwApprovals.stepOrder))
        .limit(1))[0]

      if (targetStep) {
        // Target ONLY the active step being rejected, saving signature, timestamp, and remarks
        await db
          .update(ptwApprovals)
          .set({
            status: 'rejected',
            signedAt: now,
            approverName: emp.name || targetStep.approverName,
            approverEmail: emp.email || targetStep.approverEmail,
            remarks: remarks || 'Ditolak saat review dokumen PTW.',
            ...(sigUrl ? { signatureDataUrl: sigUrl } : {}),
          })
          .where(eq(ptwApprovals.id, targetStep.id))

        // Set subsequent steps to cancelled with empty remarks so reject note isn't copied to all steps
        await db
          .update(ptwApprovals)
          .set({
            status: 'cancelled',
            remarks: '',
          })
          .where(
            and(
              eq(ptwApprovals.ptwPermitId, permitId),
              sql`${ptwApprovals.stepOrder} > ${targetStep.stepOrder}`
            )
          )
      }

      await db
        .update(hsePtwPermits)
        .set({ status: 'Rejected', updatedAt: now })
        .where(eq(hsePtwPermits.id, permitId))

      const [permit] = await db
        .select()
        .from(hsePtwPermits)
        .where(eq(hsePtwPermits.id, permitId))
        .limit(1)

      const [step1] = await db
        .select()
        .from(ptwApprovals)
        .where(
          and(
            eq(ptwApprovals.ptwPermitId, permitId),
            eq(ptwApprovals.stepOrder, 1)
          )
        )
        .limit(1)

      try {
        if (step1?.approverEmail) {
          await sendPtwRejectedEmail({
            permitId,
            permitNumber: permit?.permitNumber || '',
            projectName: permit?.projectName || 'Izin Kerja PTW',
            applicantName: step1.approverName || 'Pemohon',
            applicantEmail: step1.approverEmail,
            approverName: emp.name || 'Approver',
            remarks: remarks || 'Dokumen PTW ditolak.',
          })
        }
      } catch (mailErr) {
        console.error('Error sending PTW rejected email:', mailErr)
      }
    }

    safeRevalidatePath('/dashboard/hse/izin-kerja-ptw')
    safeRevalidatePath('/dashboard/approval')

    return { success: true as const, rejectedCount: permitIds.length }
  } catch (error: any) {
    console.error('Error batch rejecting PTW permits:', error)
    return { success: false as const, error: error.message || 'Gagal menolak dokumen PTW.' }
  }
}

export async function batchRevertPtwPermitsAction(permitIds: number[], remarks?: string) {
  try {
    if (!permitIds || permitIds.length === 0) {
      return { success: false as const, error: 'Pilih minimal satu PTW.' }
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

    const sigUrl = empRecord?.signatureDataUrl || null
    const now = new Date()
    for (const permitId of permitIds) {
      // Find current active step (pending or waiting) being reverted
      const [pendingStep] = await db
        .select()
        .from(ptwApprovals)
        .where(
          and(
            eq(ptwApprovals.ptwPermitId, permitId),
            eq(ptwApprovals.status, 'pending')
          )
        )
        .orderBy(asc(ptwApprovals.stepOrder))
        .limit(1)

      const revertStep = pendingStep || (await db
        .select()
        .from(ptwApprovals)
        .where(eq(ptwApprovals.ptwPermitId, permitId))
        .orderBy(desc(ptwApprovals.stepOrder))
        .limit(1))[0]

      if (revertStep) {
        // Mark reverting step as 'reverted', preserving its remarks, timestamp, and signature
        await db
          .update(ptwApprovals)
          .set({
            status: 'reverted',
            remarks: remarks || 'Dokumen PTW dikembalikan untuk revisi.',
            signedAt: now,
            approverName: emp.name || revertStep.approverName,
            approverEmail: emp.email || revertStep.approverEmail,
            ...(sigUrl ? { signatureDataUrl: sigUrl } : {}),
          })
          .where(eq(ptwApprovals.id, revertStep.id))

        // Reset steps AFTER reverting step to waiting
        await db
          .update(ptwApprovals)
          .set({
            status: 'waiting',
          })
          .where(
            and(
              eq(ptwApprovals.ptwPermitId, permitId),
              sql`${ptwApprovals.stepOrder} > ${revertStep.stepOrder}`
            )
          )
      }

      // Set Step 1 to pending for re-submission (CRITICAL: DO NOT WIPE STEP 1 SIGNATURE!)
      await db
        .update(ptwApprovals)
        .set({
          status: 'pending',
        })
        .where(
          and(
            eq(ptwApprovals.ptwPermitId, permitId),
            eq(ptwApprovals.stepOrder, 1)
          )
        )

      await db
        .update(hsePtwPermits)
        .set({ status: 'Reverted', updatedAt: now })
        .where(eq(hsePtwPermits.id, permitId))

      const [permit] = await db
        .select()
        .from(hsePtwPermits)
        .where(eq(hsePtwPermits.id, permitId))
        .limit(1)

      const [step1] = await db
        .select()
        .from(ptwApprovals)
        .where(
          and(
            eq(ptwApprovals.ptwPermitId, permitId),
            eq(ptwApprovals.stepOrder, 1)
          )
        )
        .limit(1)

      try {
        if (step1?.approverEmail) {
          await sendPtwRevertedEmail({
            permitId,
            permitNumber: permit?.permitNumber || '',
            projectName: permit?.projectName || 'Izin Kerja PTW',
            targetApproverName: step1.approverName || 'Pemohon',
            targetApproverEmail: step1.approverEmail,
            managerName: emp.name || 'Approver',
            revertReason: remarks || 'Dikembalikan untuk revisi.',
          })
        }
      } catch (mailErr) {
        console.error('Error sending PTW reverted email:', mailErr)
      }
    }

    safeRevalidatePath('/dashboard/hse/izin-kerja-ptw')
    safeRevalidatePath('/dashboard/approval')

    return { success: true as const, revertedCount: permitIds.length }
  } catch (error: any) {
    console.error('Error batch reverting PTW permits:', error)
    return { success: false as const, error: error.message || 'Gagal mengembalikan dokumen PTW.' }
  }
}

export async function singleApprovePtwPermitAction(permitId: number, remarks?: string) {
  return batchApprovePtwPermitsAction([permitId], remarks)
}

export async function singleRejectPtwPermitAction(permitId: number, remarks?: string) {
  return batchRejectPtwPermitsAction([permitId], remarks)
}

export async function singleRevertPtwPermitAction(permitId: number, remarks?: string) {
  return batchRevertPtwPermitsAction([permitId], remarks)
}

export async function getPtwWorkflowSettings(): Promise<PtwWorkflowSettings> {
  try {
    const [row] = await withDbRetry(() =>
      db
        .select()
        .from(hcContractReviewSettings)
        .where(eq(hcContractReviewSettings.settingKey, 'ptw_permit_workflow'))
        .limit(1)
    )

    const stored = (row?.settingValue as Partial<PtwWorkflowSettings> | undefined) ?? {}
    return {
      ...DEFAULT_PTW_SETTINGS,
      ...stored,
      approvalMatrix: {
        ...DEFAULT_PTW_SETTINGS.approvalMatrix,
        ...stored.approvalMatrix,
      },
      emailTemplates: {
        ...DEFAULT_PTW_SETTINGS.emailTemplates,
        ...stored.emailTemplates,
      },
      reminderDaysBefore:
        Array.isArray(stored.reminderDaysBefore) && stored.reminderDaysBefore.length > 0
          ? stored.reminderDaysBefore.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v >= 0)
          : DEFAULT_PTW_SETTINGS.reminderDaysBefore,
    }
  } catch (err) {
    console.error('Error fetching PTW workflow settings:', err)
    return DEFAULT_PTW_SETTINGS
  }
}

export async function savePtwWorkflowSettings(settings: PtwWorkflowSettings) {
  try {
    const [existing] = await db
      .select({ id: hcContractReviewSettings.id })
      .from(hcContractReviewSettings)
      .where(eq(hcContractReviewSettings.settingKey, 'ptw_permit_workflow'))
      .limit(1)

    if (existing) {
      await db
        .update(hcContractReviewSettings)
        .set({ settingValue: settings, updatedAt: new Date() })
        .where(eq(hcContractReviewSettings.id, existing.id))
    } else {
      await db.insert(hcContractReviewSettings).values({
        settingKey: 'ptw_permit_workflow',
        settingValue: settings,
      })
    }

    revalidatePath('/dashboard/hse/izin-kerja-ptw')
    return { success: true }
  } catch (err: any) {
    console.error('Error saving PTW workflow settings:', err)
    return { success: false, error: err.message || 'Gagal menyimpan pengaturan.' }
  }
}
