'use server'

import { db } from '@/db'
import {
  apdRequests,
  apdRequestItems,
  approvals,
  employees,
  employeeAssets,
} from '@/db/schema/hero'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { resolveApprovalRouteForActivity } from '@/lib/approval-engine'
import { sendApdRequestSubmittedEmail, sendMaterialToolsRequestSubmittedEmail } from '@/lib/apd-email'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'
import { normalizeApdRequestCategory, normalizeApdRequestStatus } from '@/lib/apd-status'
import { ensureApdRequestSchema } from '@/lib/apd-data'

export async function submitApdRequest(formData: FormData) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) {
    throw new Error('Unauthorized')
  }
  await ensureApdRequestSchema()

  const rawItems = formData.get('items') as string
  if (!rawItems) {
    throw new Error('Items are required')
  }

  const items = JSON.parse(rawItems) as Array<{
    itemType: string
    requestType: string
    photoUrl?: string
    quantity: number
    notes: string
  }>
  const requestCategory = normalizeApdRequestCategory(String(formData.get('requestCategory') ?? ''))
  if (!requestCategory) throw new Error('Jenis request tidak valid')

  const normalizedItems = Array.isArray(items)
    ? items.map((item) => ({
        ...item,
        itemType:
          requestCategory === 'APD'
            ? String(item.itemType ?? '').trim()
            : String(item.itemType ?? '')
                .trim()
                .toUpperCase(),
      }))
    : []
  if (normalizedItems.length === 0 || normalizedItems.some((item) => !item.itemType)) {
    throw new Error('Minimal satu nama barang wajib diisi')
  }

  const notes = (formData.get('notes') as string) || ''
  const signatureUrl = formData.get('signatureUrl') as string
  const rawRequestId = formData.get('requestId') || formData.get('id')
  const existingId = rawRequestId ? Number(rawRequestId) : null

  // Use a transaction
  return await db.transaction(async (tx) => {
    if (existingId) {
      // ===== RESUBMIT EXISTING REQUEST (REVISION FLOW) =====
      const [existingRequest] = await tx
        .select()
        .from(apdRequests)
        .where(eq(apdRequests.id, existingId))
        .limit(1)

      if (!existingRequest) {
        throw new Error('Permintaan APD tidak ditemukan')
      }

      const requestNumber = existingRequest.requestNumber

      // 1. Update apdRequests
      await tx
        .update(apdRequests)
        .set({
          status: 'pending_approval',
          notes,
          ...(signatureUrl ? { signatureUrl } : {}),
          updatedAt: new Date(),
        })
        .where(eq(apdRequests.id, existingId))

      // 2. Replace items
      await tx.delete(apdRequestItems).where(eq(apdRequestItems.requestId, existingId))
      if (normalizedItems.length > 0) {
        await tx.insert(apdRequestItems).values(
          normalizedItems.map((item) => ({
            requestId: existingId,
            itemType: item.itemType,
            requestType: item.requestType,
            photoUrl: item.photoUrl,
            quantity: item.quantity,
            notes: item.notes,
          }))
        )
      }

      // 3. Find existing approvals for this request
      const existingApprovals = await tx
        .select()
        .from(approvals)
        .where(eq(approvals.apdRequestId, existingId))
        .orderBy(approvals.level)

      // Find the specific step that was reverted (needs_correction)
      const revertedStep = existingApprovals.find((a) => a.status === 'needs_correction')
      const step1Approval = existingApprovals.find((a) => a.level === 1)
      const step1Approved = step1Approval?.status === 'approved'

      // Target step is Step 2 if Step 1 is already approved, or the reverted step
      let targetStep = revertedStep
      if (!targetStep) {
        targetStep = existingApprovals.find((a) => a.status !== 'approved') || step1Approval
      }
      const targetLevel = targetStep?.level ?? 1

      // Set ONLY the target step to 'pending' (Step 1 approved signature remains intact!)
      if (targetStep) {
        await tx
          .update(approvals)
          .set({
            status: 'pending',
            submittedAt: new Date(),
            reviewedAt: null,
          })
          .where(eq(approvals.id, targetStep.id))
      }

      // Step 1 approver email (to receive CC email notification)
      let step1ApproverEmail: string | null = null
      if (step1Approved && step1Approval?.approverEmployeeId) {
        const [emp] = await tx
          .select({ email: employees.email })
          .from(employees)
          .where(eq(employees.id, step1Approval.approverEmployeeId))
          .limit(1)
        step1ApproverEmail = emp?.email || null
      }

      // Send notifications to target approver (e.g. Step 2 Section Head) with CC to Step 1 approver
      if (targetStep?.approverEmployeeId) {
        const [approverEmailRec] = await tx
          .select({ email: employees.email })
          .from(employees)
          .where(eq(employees.id, targetStep.approverEmployeeId))
          .limit(1)

        if (approverEmailRec?.email) {
          const ccEmails: string[] = []
          if (step1ApproverEmail && targetLevel > 1) {
            ccEmails.push(step1ApproverEmail)
          }

          if (requestCategory === 'MATERIAL' || requestCategory === 'TOOLS') {
            sendMaterialToolsRequestSubmittedEmail({
              employeeName: currentEmployee.name,
              requestNumber,
              approverEmail: approverEmailRec.email,
              approverName: targetStep.approverName || 'Section Head',
              requestType: requestCategory,
              ccEmails,
            }).catch(console.error)

            notifyWorkflowBellRecipients({
              recipientEmails: [approverEmailRec.email, 'muhammad.akbar@chitraparatama.co.id', ...ccEmails],
              eventType: 'material_tools_request_review',
              category: 'approval_requests',
              title: `Revisi Permintaan ${requestCategory}`,
              body: `${currentEmployee.name} telah mengirim revisi permohonan ${requestCategory} (${requestNumber}) langsung ke ${targetStep.approverName || 'Tahap ' + targetLevel}. (CC: Muhammad Taufik Akbar)`,
              url: `/dashboard/approval`,
              tagPrefix: 'apd',
            }).catch(console.error)
          } else {
            sendApdRequestSubmittedEmail({
              employeeName: currentEmployee.name,
              requestNumber,
              approverEmail: approverEmailRec.email,
              approverName: targetStep.approverName || 'Approver',
              requestType: requestCategory,
              ccEmails: ccEmails.length > 0 ? ccEmails : undefined,
            }).catch(console.error)

            notifyWorkflowBellRecipients({
              recipientEmails: [approverEmailRec.email, ...ccEmails],
              eventType: 'apd_request_review',
              category: 'approval_requests',
              title: `Revisi Permintaan ${requestCategory}`,
              body: `${currentEmployee.name} telah mengirim revisi permohonan ${requestCategory} (${requestNumber}) langsung ke ${targetStep.approverName || 'Tahap ' + targetLevel}.`,
              url: `/dashboard/approval`,
              tagPrefix: 'apd',
            }).catch(console.error)
          }
        }
      }

      revalidatePath('/dashboard/apd')
      revalidatePath('/dashboard/approval')
      return { success: true, requestId: existingId }
    }

    // ===== NEW REQUEST FLOW =====
    // Generate request number
    const countRes = await tx.$count(apdRequests)
    const requestNumber = `APD-${new Date().getFullYear()}-${String(countRes + 1).padStart(4, '0')}`

    // 1. Insert apdRequests
    const [request] = await tx
      .insert(apdRequests)
      .values({
        requestNumber,
        employeeId: currentEmployee.id,
        siteId: currentEmployee.siteId ?? 0,
        requestCategory,
        status: 'pending_approval',
        notes,
        signatureUrl,
      })
      .returning()

    // 2. Insert items
    if (normalizedItems.length > 0) {
      await tx.insert(apdRequestItems).values(
        normalizedItems.map((item) => ({
          requestId: request.id,
          itemType: item.itemType,
          requestType: item.requestType,
          photoUrl: item.photoUrl,
          quantity: item.quantity,
          notes: item.notes,
        }))
      )
    }

    // 3. Resolve approval route
    const route = await resolveApprovalRouteForActivity({
      employeeId: currentEmployee.id,
      siteId: currentEmployee.siteId ?? undefined,
      departmentId: currentEmployee.departmentId ?? undefined,
      sectionId: currentEmployee.sectionId ?? undefined,
      activityType: 'apd-request',
      priority: 'Normal',
      overtimeMinutes: 0,
      transactionType: `apd-request-${requestCategory.toLowerCase()}`,
      at: new Date(),
    })

    if (route.steps.length > 0) {
      const firstStep = route.steps.find((s) => s.stepOrder === 1)

      const payloadSnapshot = JSON.stringify({
        title: `Permintaan ${requestCategory} ${requestNumber}`,
        reason: notes,
        items: normalizedItems,
      })

      const previewSnapshot = JSON.stringify({
        title: `Permintaan ${requestCategory} ${requestNumber}`,
        summary: `Diminta oleh ${currentEmployee.name}`,
      })

      // 4. Insert approval tracking
      await tx.insert(approvals).values({
        apdRequestId: request.id,
        level: 1,
        status: 'pending',
        approverName: firstStep?.approverName ?? 'System',
        approverEmployeeId: firstStep?.approverEmployeeId,
        approvalStepId: firstStep?.approvalMatrixStepId,
        resolutionSource: firstStep?.resolutionSource ?? 'system',
        routeSnapshot: JSON.stringify(route),
        decisionNote: '',
        submittedAt: new Date(),
      })

      // 5. Send Email and Bell Notification if there is an approver
      if (firstStep?.approverEmployeeId) {
        const [approverEmailRec] = await tx
          .select({ email: employees.email })
          .from(employees)
          .where(eq(employees.id, firstStep.approverEmployeeId))
        if (approverEmailRec?.email) {
          if (requestCategory === 'MATERIAL' || requestCategory === 'TOOLS') {
            sendMaterialToolsRequestSubmittedEmail({
              employeeName: currentEmployee.name,
              requestNumber,
              approverEmail: approverEmailRec.email,
              approverName: firstStep.approverName,
              requestType: requestCategory,
            }).catch(console.error)

            notifyWorkflowBellRecipients({
              recipientEmails: [approverEmailRec.email, 'muhammad.akbar@chitraparatama.co.id'],
              eventType: 'material_tools_request_review',
              category: 'approval_requests',
              title: `Review Permintaan ${requestCategory}`,
              body: `${currentEmployee.name} mengajukan permintaan ${requestCategory} baru (${requestNumber}) yang membutuhkan persetujuan Section Head. (CC: Muhammad Taufik Akbar)`,
              url: `/dashboard/approval`,
              tagPrefix: 'apd',
            }).catch(console.error)
          } else {
            sendApdRequestSubmittedEmail({
              employeeName: currentEmployee.name,
              requestNumber,
              approverEmail: approverEmailRec.email,
              approverName: firstStep.approverName,
              requestType: requestCategory,
            }).catch(console.error)

            notifyWorkflowBellRecipients({
              recipientEmails: [approverEmailRec.email],
              eventType: 'apd_request_review',
              category: 'approval_requests',
              title: `Review Permintaan ${requestCategory}`,
              body: `${currentEmployee.name} mengajukan permintaan ${requestCategory} baru (${requestNumber}) yang membutuhkan persetujuan Anda.`,
              url: `/dashboard/approval`,
              tagPrefix: 'apd',
            }).catch(console.error)
          }
        }
      }
    }

    revalidatePath('/dashboard/apd')
    revalidatePath('/dashboard/approval')
    return { success: true, requestId: request.id }
  })
}

export async function deleteApdRequest(id: number) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) {
    throw new Error('Unauthorized')
  }

  const [request] = await db.select().from(apdRequests).where(eq(apdRequests.id, id))
  if (!request) {
    throw new Error('Request not found')
  }

  // Allow delete if it's their own request, or they are admin/superadmin
  // Optional: check if status is still pending. If it's already approved/completed, maybe prevent deletion?
  if (
    request.employeeId !== currentEmployee.id &&
    currentEmployee.role !== 'admin' &&
    currentEmployee.role !== 'superadmin'
  ) {
    throw new Error('Anda tidak memiliki akses untuk menghapus permintaan ini')
  }

  if (request.status !== 'pending') {
    throw new Error("Hanya permintaan berstatus 'Pending' yang dapat dihapus")
  }

  await db.delete(apdRequests).where(eq(apdRequests.id, id))

  revalidatePath('/dashboard/apd')
  revalidatePath('/dashboard/approval')
  return { success: true }
}

export async function updateApdRequestStatus(id: number, rawStatus: string) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee || !['admin', 'superadmin'].includes(currentEmployee.role)) {
    throw new Error('Anda tidak memiliki akses untuk mengubah status permintaan APD')
  }

  const status = normalizeApdRequestStatus(rawStatus)
  if (!status) throw new Error('Status APD tidak valid')

  const [request] = await db
    .select({
      id: apdRequests.id,
      employeeId: apdRequests.employeeId,
      requestCategory: apdRequests.requestCategory,
    })
    .from(apdRequests)
    .where(eq(apdRequests.id, id))
  if (!request) throw new Error('Request tidak ditemukan')

  await db.transaction(async (tx) => {
    await tx
      .update(apdRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(apdRequests.id, id))

    if (status === 'complete') {
      const items = await tx.select().from(apdRequestItems).where(eq(apdRequestItems.requestId, id))

      for (const item of items) {
        if (item.requestType === 'pergantian') {
          await tx
            .update(employeeAssets)
            .set({ status: 'REPLACED', updatedAt: new Date() })
            .where(
              and(
                eq(employeeAssets.employeeId, request.employeeId),
                eq(employeeAssets.itemName, item.itemType),
                eq(employeeAssets.status, 'ACTIVE')
              )
            )
        }

        let nextReplacementDue: Date | null = null
        if (item.itemType === 'Sepatu Safety') {
          nextReplacementDue = new Date()
          nextReplacementDue.setMonth(nextReplacementDue.getMonth() + 8)
        }

        for (let i = 0; i < item.quantity; i++) {
          await tx.insert(employeeAssets).values({
            employeeId: request.employeeId,
            itemCategory: request.requestCategory,
            itemName: item.itemType,
            status: 'ACTIVE',
            assignedAt: new Date(),
            nextReplacementDue,
            lastRequestId: id,
          })
        }
      }
    }
  })
  revalidatePath('/dashboard/apd')
  revalidatePath(`/dashboard/apd/${id}`)
  revalidatePath('/dashboard/approval')
  return { success: true }
}
