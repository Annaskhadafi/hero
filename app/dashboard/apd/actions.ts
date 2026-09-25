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
import { getCurrentMenuPermission } from '@/lib/hero-access'
import { resolveApprovalRouteForActivity } from '@/lib/approval-engine'
import { sendApdRequestSubmittedEmail, sendMaterialToolsRequestSubmittedEmail } from '@/lib/apd-email'
import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm'
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
    const rawApprover1Id = formData.get('approver1Id') || formData.get('approverEmployeeId') || formData.get('approverId')
    const rawApprover2Id = formData.get('approver2Id')

    const approver1EmployeeId = rawApprover1Id ? Number(rawApprover1Id) : null
    const approver2EmployeeId = rawApprover2Id ? Number(rawApprover2Id) : null

    let route: any = null
    let firstStep: any = null

    if (
      (requestCategory === 'MATERIAL' || requestCategory === 'TOOLS') &&
      approver1EmployeeId &&
      !isNaN(approver1EmployeeId)
    ) {
      // Direct 2-level approver selection flow for Material & Tools
      const approverIds = [approver1EmployeeId, approver2EmployeeId].filter(
        (id): id is number => id != null && !isNaN(id) && id > 0
      )
      const approverRows =
        approverIds.length > 0
          ? await tx
              .select({
                id: employees.id,
                name: employees.name,
                email: employees.email,
                role: employees.role,
                jobTitle: employees.jobTitle,
              })
              .from(employees)
              .where(inArray(employees.id, approverIds))
          : []
      const approverMap = new Map(approverRows.map((r) => [r.id, r]))

      const app1 = approverMap.get(approver1EmployeeId)
      const app2 = approver2EmployeeId ? approverMap.get(approver2EmployeeId) : null

      const steps: any[] = []
      if (app1) {
        steps.push({
          stepOrder: 1,
          label: 'Atasan Langsung / Pemeriksa',
          approverName: app1.name,
          approverEmployeeId: app1.id,
          role: app1.jobTitle || app1.role || 'Atasan Langsung',
          resolutionSource: 'manual_selection',
        })
      }
      if (app2) {
        steps.push({
          stepOrder: 2,
          label: 'Section Head / Penyetuju',
          approverName: app2.name,
          approverEmployeeId: app2.id,
          role: app2.jobTitle || app2.role || 'Section Head',
          resolutionSource: 'manual_selection',
        })
      }

      route = {
        name: `Approval Permintaan ${requestCategory}`,
        activityType: 'apd-request',
        transactionType: `apd-request-${requestCategory.toLowerCase()}`,
        steps,
        warnings: [],
      }
      firstStep = steps[0]
    } else {
      // Standard dynamic matrix resolution
      route = await resolveApprovalRouteForActivity({
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
      firstStep = route?.steps?.find((s: any) => s.stepOrder === 1)
    }

    if (firstStep) {
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
              body: `${currentEmployee.name} mengajukan permintaan ${requestCategory} baru (${requestNumber}) yang membutuhkan persetujuan Anda. (CC: Muhammad Taufik Akbar)`,
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
    throw new Error('Permintaan tidak ditemukan')
  }

  const apdAccess = await getCurrentMenuPermission('apd-request')
  const isAdmin = ['admin', 'superadmin'].includes(currentEmployee.role)
  const isOwner = request.employeeId === currentEmployee.id
  const canDelete = isAdmin || apdAccess.canDelete || apdAccess.canEdit || isOwner

  if (!canDelete) {
    throw new Error('Anda tidak memiliki akses untuk menghapus permintaan ini')
  }

  await db.transaction(async (tx) => {
    // 1. Delete associated approvals
    await tx.delete(approvals).where(eq(approvals.apdRequestId, id))
    // 2. Delete associated items
    await tx.delete(apdRequestItems).where(eq(apdRequestItems.requestId, id))
    // 3. Clear any asset references to this request
    await tx
      .update(employeeAssets)
      .set({ lastRequestId: null })
      .where(eq(employeeAssets.lastRequestId, id))
    // 4. Delete the request itself
    await tx.delete(apdRequests).where(eq(apdRequests.id, id))
  })

  revalidatePath('/dashboard/apd')
  revalidatePath('/dashboard/approval')
  return { success: true }
}

export async function updateApdRequestStatus(id: number, rawStatus: string) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) {
    throw new Error('Unauthorized')
  }

  const apdAccess = await getCurrentMenuPermission('apd-request')
  const canManageStatus =
    ['admin', 'superadmin'].includes(currentEmployee.role) || apdAccess.canEdit

  if (!canManageStatus) {
    throw new Error('Anda tidak memiliki akses untuk mengubah status permintaan barang')
  }

  const status = normalizeApdRequestStatus(rawStatus)
  if (!status) throw new Error('Status tidak valid')

  const [request] = await db
    .select({
      id: apdRequests.id,
      employeeId: apdRequests.employeeId,
      requestCategory: apdRequests.requestCategory,
    })
    .from(apdRequests)
    .where(eq(apdRequests.id, id))
  if (!request) throw new Error('Permintaan tidak ditemukan')

  const completedAt = new Date()

  await db.transaction(async (tx) => {
    await tx
      .update(apdRequests)
      .set({ status, updatedAt: completedAt })
      .where(eq(apdRequests.id, id))

    if (status === 'complete') {
      const items = await tx.select().from(apdRequestItems).where(eq(apdRequestItems.requestId, id))

      for (const item of items) {
        const isSafetyShoes =
          item.itemType === 'Sepatu Safety' ||
          item.itemType === 'Safety Shoes' ||
          item.itemType.toLowerCase().includes('sepatu') ||
          item.itemType.toLowerCase().includes('safety shoes')

        if (isSafetyShoes) {
          // Check idempotency: avoid inserting duplicate entry for the same request
          const [existingForThisRequest] = await tx
            .select({ id: employeeAssets.id })
            .from(employeeAssets)
            .where(
              and(
                eq(employeeAssets.employeeId, request.employeeId),
                eq(employeeAssets.lastRequestId, id),
                or(
                  ilike(employeeAssets.itemName, '%sepatu%'),
                  ilike(employeeAssets.itemName, '%safety shoes%')
                )
              )
            )
            .limit(1)

          if (!existingForThisRequest) {
            // Find previous size if any
            const [existingShoe] = await tx
              .select({ size: employeeAssets.size })
              .from(employeeAssets)
              .where(
                and(
                  eq(employeeAssets.employeeId, request.employeeId),
                  or(
                    ilike(employeeAssets.itemName, '%sepatu%'),
                    ilike(employeeAssets.itemName, '%safety shoes%')
                  )
                )
              )
              .orderBy(desc(employeeAssets.assignedAt))
              .limit(1)

            if (item.requestType === 'pergantian') {
              await tx
                .update(employeeAssets)
                .set({ status: 'REPLACED', updatedAt: completedAt })
                .where(
                  and(
                    eq(employeeAssets.employeeId, request.employeeId),
                    or(
                      ilike(employeeAssets.itemName, '%sepatu%'),
                      ilike(employeeAssets.itemName, '%safety shoes%')
                    ),
                    eq(employeeAssets.status, 'ACTIVE')
                  )
                )
            }

            const nextReplacementDue = new Date(completedAt)
            nextReplacementDue.setMonth(nextReplacementDue.getMonth() + 8)

            for (let i = 0; i < item.quantity; i++) {
              await tx.insert(employeeAssets).values({
                employeeId: request.employeeId,
                itemCategory: 'APD',
                itemName: 'Sepatu Safety',
                size: existingShoe?.size || null,
                status: 'ACTIVE',
                assignedAt: completedAt,
                nextReplacementDue,
                lastRequestId: id,
              })
            }
          }
        } else {
          // Non-safety-shoes item (recorded for general employee asset tracking, does not affect safety shoes inventory)
          const [existingForThisRequest] = await tx
            .select({ id: employeeAssets.id })
            .from(employeeAssets)
            .where(
              and(
                eq(employeeAssets.employeeId, request.employeeId),
                eq(employeeAssets.lastRequestId, id),
                eq(employeeAssets.itemName, item.itemType)
              )
            )
            .limit(1)

          if (!existingForThisRequest) {
            if (item.requestType === 'pergantian') {
              await tx
                .update(employeeAssets)
                .set({ status: 'REPLACED', updatedAt: completedAt })
                .where(
                  and(
                    eq(employeeAssets.employeeId, request.employeeId),
                    eq(employeeAssets.itemName, item.itemType),
                    eq(employeeAssets.status, 'ACTIVE')
                  )
                )
            }

            for (let i = 0; i < item.quantity; i++) {
              await tx.insert(employeeAssets).values({
                employeeId: request.employeeId,
                itemCategory: request.requestCategory,
                itemName: item.itemType,
                status: 'ACTIVE',
                assignedAt: completedAt,
                lastRequestId: id,
              })
            }
          }
        }
      }
    }
  })

  // Auto-transition to Summary APD draft when status becomes "proses_order"
  if (status === 'proses_order') {
    try {
      const { syncApprovedApdRequestToSummary } = await import('@/lib/summary-engine')
      await syncApprovedApdRequestToSummary(id)
    } catch (syncErr) {
      console.error('[APD] Failed to auto-sync APD request to summary:', syncErr)
    }
  }

  revalidatePath('/dashboard/apd')
  revalidatePath(`/dashboard/apd/${id}`)
  revalidatePath('/dashboard/apd/inventory/safety-shoes')
  revalidatePath('/dashboard/summary')
  revalidatePath('/mobile/summary')
  revalidatePath('/dashboard/approval')
  return { success: true }
}
