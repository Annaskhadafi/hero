'use server'

import { and, asc, desc, eq, gt, gte, ilike, inArray, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { db } from '@/db'
import {
  approvals,
  employees,
  hcFlightRouteChangeApprovals,
  hcFlightRouteChangeItems,
  hcFlightRouteChangeRequests,
  masterDepartments,
  masterSections,
  sites,
} from '@/db/schema/hero'
import { auth } from '@/lib/auth'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path)
  } catch {
    // Graceful fallback outside Next.js request context (e.g. CLI/tests/workers)
  }
}

export type FlightRouteItemInput = {
  flightDate: string
  flightRoute: string
  remark?: string
}

export type FlightRouteApproverStepInput = {
  stepOrder: number
  stepKey: string
  roleLabel: string
  approverTitle: string
  approverName: string
  approverEmployeeId?: number | null
  approverEmail?: string
}

export type CreateFlightRouteChangeInput = {
  requestId?: number
  isDraft?: boolean
  employeeId?: number
  employeeSn?: string
  requestorName?: string
  jobTitle?: string
  sectionName?: string
  departmentName?: string
  siteId?: number
  siteName?: string
  requestDate?: string
  originLocation?: string
  pohLocation?: string
  clauseAccepted?: boolean
  notes?: string
  signatureDataUrl?: string
  items: FlightRouteItemInput[]
  approverSteps?: FlightRouteApproverStepInput[]
  approverSelection?: {
    pjoEmployeeId?: number
    supervisorEmployeeId?: number
    hrGaLeaderEmployeeId?: number
    managerEmployeeId?: number
  }
}

export async function getFlightRouteEmployeesListAction() {
  try {
    const rows = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        jobTitle: employees.jobTitle,
        siteId: employees.siteId,
        siteName: sites.name,
        sectionId: employees.sectionId,
        sectionName: masterSections.name,
        departmentId: employees.departmentId,
        departmentName: masterDepartments.name,
        email: employees.email,
        directManagerId: employees.directManagerId,
      })
      .from(employees)
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .where(sql`lower(coalesce(${employees.employmentStatus}, 'active')) != 'inactive'`)
      .orderBy(asc(employees.name))

    const actor = await getActorEmployee()

    return {
      ok: true,
      data: rows,
      actorEmployeeId: actor?.id || null,
    }
  } catch (error) {
    console.error('[getFlightRouteEmployeesListAction] Error:', error)
    return { ok: false, error: 'Gagal memuat daftar karyawan.' }
  }
}

async function getActorEmployee() {
  try {
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null)
    const actorEmail = session?.user?.email
    if (!actorEmail) return null
    const [emp] = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        jobTitle: employees.jobTitle,
        email: employees.email,
        role: employees.role,
        siteId: employees.siteId,
        sectionId: employees.sectionId,
        departmentId: employees.departmentId,
        directManagerId: employees.directManagerId,
        signatureDataUrl: employees.signatureDataUrl,
      })
      .from(employees)
      .where(eq(employees.email, actorEmail))
      .limit(1)
    return emp || null
  } catch (err) {
    return null
  }
}

export async function generateFlightRouteRequestNumber() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const prefix = `FRC-${year}${month}-`

  const [last] = await db
    .select({ requestNumber: hcFlightRouteChangeRequests.requestNumber })
    .from(hcFlightRouteChangeRequests)
    .where(ilike(hcFlightRouteChangeRequests.requestNumber, `${prefix}%`))
    .orderBy(desc(hcFlightRouteChangeRequests.id))
    .limit(1)

  let nextSeq = 1
  if (last?.requestNumber) {
    const parts = last.requestNumber.split('-')
    const seqStr = parts[parts.length - 1]
    const parsed = parseInt(seqStr, 10)
    if (!isNaN(parsed)) nextSeq = parsed + 1
  }

  return `${prefix}${String(nextSeq).padStart(3, '0')}`
}

async function syncFlightRouteToHeroApprovals(
  requestId: number,
  approvalSteps: any[],
  requestNumber: string,
  requestorName: string,
  createdBy: number
) {
  try {
    await db.delete(approvals).where(eq(approvals.flightRouteRequestId, requestId))

    const heroApprovalRows = approvalSteps.map((step) => ({
      flightRouteRequestId: requestId,
      activityType: 'flight_route_change',
      requestNumber,
      activityTitle: `Permohonan Perubahan Rute: ${requestNumber} - ${requestorName}`,
      formName: 'Permohonan Perubahan Rute Penerbangan',
      createdBy,
      level: step.stepOrder,
      approverName: step.approverName || 'Approver',
      approverEmployeeId: step.approverEmployeeId || null,
      approverEmail: step.approverEmail || null,
      status: step.status,
      submittedAt: new Date(),
      reviewedAt: step.status === 'approved' ? (step.signedAt || new Date()) : null,
      signatureUrl: step.signatureDataUrl || null,
      decisionNote: step.remarks || '',
      resolutionSource: 'direct_matrix',
    }))

    await db.insert(approvals).values(heroApprovalRows)
  } catch (err) {
    console.error('[syncFlightRouteToHeroApprovals] Error syncing to hero_approvals:', err)
  }
}

export async function createFlightRouteChangeAction(input: CreateFlightRouteChangeInput) {
  try {
    const actor = await getActorEmployee()
    if (!actor && !input.employeeId) {
      return { ok: false, error: 'Karyawan tidak terautentikasi.' }
    }

    const empId = input.employeeId || actor?.id
    if (!empId) return { ok: false, error: 'Data pemohon tidak valid.' }

    const [emp] = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        jobTitle: employees.jobTitle,
        siteId: employees.siteId,
        sectionId: employees.sectionId,
        departmentId: employees.departmentId,
        directManagerId: employees.directManagerId,
        signatureUrl: employees.signatureDataUrl,
        siteName: sites.name,
        sectionName: masterSections.name,
        departmentName: masterDepartments.name,
      })
      .from(employees)
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .where(eq(employees.id, empId))
      .limit(1)

    if (!emp) return { ok: false, error: 'Data pemohon tidak ditemukan.' }

    if (!input.items || input.items.length === 0) {
      return { ok: false, error: 'Minimal 1 baris rute penerbangan wajib diisi.' }
    }

    const todayStr = new Date().toISOString().slice(0, 10)
    const requestDate = input.requestDate || todayStr

    const requestorName = input.requestorName?.trim() || emp.name
    const employeeSn = input.employeeSn?.trim() || emp.employeeSn || ''
    const jobTitle = input.jobTitle?.trim() || emp.jobTitle || 'Serviceman'
    const sectionName = input.sectionName?.trim() || emp.sectionName || 'Service Operation'
    const departmentName = input.departmentName?.trim() || emp.departmentName || 'Service Operation'
    const siteName = input.siteName?.trim() || emp.siteName || 'CK-KIM'
    const originLocation = input.originLocation?.trim() || 'Jambi'
    const pohLocation = input.pohLocation?.trim() || 'Balikpapan'
    const isDraft = Boolean(input.isDraft)

    let requestId = input.requestId
    let requestNumber = ''
    let existingApprovals: any[] = []
    let targetStepOrder = 2

    if (requestId) {
      const [existing] = await db
        .select()
        .from(hcFlightRouteChangeRequests)
        .where(eq(hcFlightRouteChangeRequests.id, requestId))
        .limit(1)

      if (existing) {
        requestNumber = existing.requestNumber
        if (!isDraft && existing.revertedFromStepOrder && existing.revertedFromStepOrder >= 2 && existing.revertedFromStepOrder <= 5) {
          targetStepOrder = existing.revertedFromStepOrder
        }

        existingApprovals = await db
          .select()
          .from(hcFlightRouteChangeApprovals)
          .where(eq(hcFlightRouteChangeApprovals.requestId, requestId))

        await db
          .update(hcFlightRouteChangeRequests)
          .set({
            employeeId: emp.id,
            employeeSn,
            requestorName,
            jobTitle,
            sectionName,
            departmentName,
            siteId: input.siteId || emp.siteId,
            siteName,
            originLocation,
            requestDate,
            pohLocation,
            clauseAccepted: input.clauseAccepted !== false,
            currentStepOrder: isDraft ? 1 : targetStepOrder,
            status: isDraft ? 'draft' : 'in_progress',
            revertedFromStepOrder: isDraft ? existing.revertedFromStepOrder : null,
            notes: input.notes || '',
            updatedAt: new Date(),
          })
          .where(eq(hcFlightRouteChangeRequests.id, requestId))

        await db.delete(hcFlightRouteChangeItems).where(eq(hcFlightRouteChangeItems.requestId, requestId))
        await db.delete(hcFlightRouteChangeApprovals).where(eq(hcFlightRouteChangeApprovals.requestId, requestId))
      }
    }

    if (!requestId) {
      requestNumber = await generateFlightRouteRequestNumber()
      const [createdReq] = await db
        .insert(hcFlightRouteChangeRequests)
        .values({
          requestNumber,
          employeeId: emp.id,
          employeeSn,
          requestorName,
          jobTitle,
          sectionName,
          departmentName,
          siteId: input.siteId || emp.siteId,
          siteName,
          originLocation,
          requestDate,
          pohLocation,
          clauseAccepted: input.clauseAccepted !== false,
          currentStepOrder: isDraft ? 1 : 2,
          status: isDraft ? 'draft' : 'in_progress',
          revertedFromStepOrder: null,
          notes: input.notes || '',
        })
        .returning({ id: hcFlightRouteChangeRequests.id })

      requestId = createdReq.id
    }

    // Insert Items
    const itemValues = input.items.map((item, idx) => ({
      requestId: requestId!,
      flightDate: item.flightDate,
      flightRoute: item.flightRoute,
      remark: item.remark || (idx === 0 ? 'Offsite/ FB' : 'Onsite'),
      sortOrder: idx + 1,
    }))
    await db.insert(hcFlightRouteChangeItems).values(itemValues)

    const now = new Date()
    const applicantSignature = input.signatureDataUrl || emp.signatureUrl || '/signatures/verified-applicant.png'
    let approvalSteps: any[] = []

    if (input.approverSteps && input.approverSteps.length > 0) {
      approvalSteps = input.approverSteps.map((step) => {
        const isApplicant = step.stepOrder === 1
        const prevApp = existingApprovals.find((a) => a.stepOrder === step.stepOrder)
        const isPriorApproved = !isDraft && step.stepOrder > 1 && step.stepOrder < targetStepOrder && prevApp?.status === 'approved'

        let stepStatus = 'waiting'
        if (isDraft) {
          stepStatus = isApplicant ? 'draft' : 'waiting'
        } else if (isApplicant) {
          stepStatus = 'approved'
        } else if (isPriorApproved) {
          stepStatus = 'approved'
        } else if (step.stepOrder === targetStepOrder) {
          stepStatus = 'pending'
        } else {
          stepStatus = 'waiting'
        }

        const stepSig = isApplicant
          ? (!isDraft ? applicantSignature : null)
          : (isPriorApproved ? prevApp?.signatureDataUrl : null)

        const stepRemarks = isApplicant
          ? (isDraft ? 'Draft disimpan.' : 'Permohonan diajukan.')
          : (isPriorApproved ? (prevApp?.remarks || 'Disetujui sebelumnya.') : '')

        const stepSignedAt = isApplicant
          ? (!isDraft ? now : null)
          : (isPriorApproved ? (prevApp?.signedAt || now) : null)

        return {
          requestId: requestId!,
          stepOrder: step.stepOrder,
          stepKey: step.stepKey || (isApplicant ? 'applicant' : step.stepOrder === 2 ? 'pjo' : step.stepOrder === 3 ? 'supervisor' : step.stepOrder === 4 ? 'hr_ga_leader' : 'manager'),
          roleLabel: step.roleLabel || (isApplicant ? 'Diajukan Oleh' : step.stepOrder === 5 ? 'Menyetujui' : 'Mengetahui'),
          approverTitle: step.approverTitle || (isApplicant ? jobTitle : 'Approver'),
          approverEmployeeId: isApplicant ? emp.id : (step.approverEmployeeId || null),
          approverName: isApplicant ? requestorName : (step.approverName || '-'),
          approverEmail: isApplicant ? (actor?.email || '') : (step.approverEmail || ''),
          status: stepStatus,
          signatureDataUrl: stepSig,
          remarks: stepRemarks,
          signedAt: stepSignedAt,
        }
      })
    } else {
      const pjoId = input.approverSelection?.pjoEmployeeId || null
      const spvId = input.approverSelection?.supervisorEmployeeId || emp.directManagerId || null
      const hrId = input.approverSelection?.hrGaLeaderEmployeeId || null
      const mgrId = input.approverSelection?.managerEmployeeId || null

      const allApproverIds = [emp.id, pjoId, spvId, hrId, mgrId].filter(
        (id): id is number => id != null
      )
      const approverRows = allApproverIds.length
        ? await db
            .select({
              id: employees.id,
              name: employees.name,
              email: employees.email,
              jobTitle: employees.jobTitle,
            })
            .from(employees)
            .where(inArray(employees.id, allApproverIds))
        : []

      const empMap = new Map(approverRows.map((r) => [r.id, r]))

      const stepDefs = [
        { order: 2, key: 'pjo', label: 'Mengetahui', id: pjoId, defTitle: 'PJO', defName: 'PJO Leader' },
        { order: 3, key: 'supervisor', label: 'Mengetahui', id: spvId, defTitle: 'Service Operation SPV', defName: 'Supervisor' },
        { order: 4, key: 'hr_ga_leader', label: 'Mengetahui', id: hrId, defTitle: 'HR GA Leader', defName: 'HR GA Leader' },
        { order: 5, key: 'manager', label: 'Menyetujui', id: mgrId, defTitle: 'Central Services Manager', defName: 'Manager' },
      ]

      approvalSteps = [
        {
          requestId: requestId!,
          stepOrder: 1,
          stepKey: 'applicant',
          roleLabel: 'Diajukan Oleh',
          approverTitle: jobTitle,
          approverEmployeeId: emp.id,
          approverName: requestorName,
          approverEmail: actor?.email || '',
          status: isDraft ? 'draft' : 'approved',
          signatureDataUrl: isDraft ? null : applicantSignature,
          remarks: isDraft ? 'Draft disimpan.' : 'Permohonan diajukan.',
          signedAt: isDraft ? null : now,
        },
        ...stepDefs.map((s) => {
          const prevApp = existingApprovals.find((a) => a.stepOrder === s.order)
          const isPriorApproved = !isDraft && s.order > 1 && s.order < targetStepOrder && prevApp?.status === 'approved'

          let st = 'waiting'
          if (isDraft) st = 'waiting'
          else if (isPriorApproved) st = 'approved'
          else if (s.order === targetStepOrder) st = 'pending'
          else st = 'waiting'

          return {
            requestId: requestId!,
            stepOrder: s.order,
            stepKey: s.key,
            roleLabel: s.label,
            approverTitle: empMap.get(s.id!)?.jobTitle || s.defTitle,
            approverEmployeeId: s.id,
            approverName: empMap.get(s.id!)?.name || s.defName,
            approverEmail: empMap.get(s.id!)?.email || '',
            status: st,
            signatureDataUrl: isPriorApproved ? prevApp?.signatureDataUrl : null,
            remarks: isPriorApproved ? (prevApp?.remarks || 'Disetujui sebelumnya.') : '',
            signedAt: isPriorApproved ? (prevApp?.signedAt || now) : null,
          }
        }),
      ]
    }

    await db.insert(hcFlightRouteChangeApprovals).values(approvalSteps)

    if (!isDraft) {
      // Sync to Central Inbox (hero_approvals) so target step immediately enters Approver's inbox
      await syncFlightRouteToHeroApprovals(requestId!, approvalSteps, requestNumber, requestorName, emp.id)

      // Notify Target Step Approver (Directly to the one who reverted or Step 2)
      const targetStepEntry = approvalSteps.find((s) => s.stepOrder === targetStepOrder)
      if (targetStepEntry?.approverEmail) {
        void notifyWorkflowBellRecipients({
          recipientEmails: [targetStepEntry.approverEmail],
          eventType: 'flight_route_change',
          category: 'approval_requests',
          title: 'Permohonan Perubahan Rute Penerbangan',
          body: `${requestorName} mengajukan perubahan rute penerbangan (${requestNumber}). Membutuhkan persetujuan Anda.`,
          url: `/dashboard/approval`,
        })
      }
    } else {
      // Clean up any stale approvals if reverted to draft
      await db.delete(approvals).where(eq(approvals.flightRouteRequestId, requestId!))
    }

    safeRevalidatePath('/dashboard/hc/flight-route-change')
    safeRevalidatePath('/mobile/hc/flight-route-change')
    safeRevalidatePath('/dashboard/approval')

    return { ok: true, id: requestId, requestNumber, isDraft }
  } catch (error) {
    console.error('[createFlightRouteChangeAction] Detailed Error:', error)
    if (error instanceof Error && error.stack) {
      console.error(error.stack)
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Gagal mengajukan permohonan.',
    }
  }
}

export async function getFlightRouteChangeListAction(params?: {
  status?: string
  search?: string
  siteId?: number
  limit?: number
}) {
  try {
    const conditions = []

    if (params?.status && params.status !== 'all') {
      conditions.push(eq(hcFlightRouteChangeRequests.status, params.status))
    }

    if (params?.siteId) {
      conditions.push(eq(hcFlightRouteChangeRequests.siteId, params.siteId))
    }

    if (params?.search && params.search.trim()) {
      const q = `%${params.search.trim()}%`
      conditions.push(
        or(
          ilike(hcFlightRouteChangeRequests.requestNumber, q),
          ilike(hcFlightRouteChangeRequests.requestorName, q),
          ilike(hcFlightRouteChangeRequests.employeeSn, q),
          ilike(hcFlightRouteChangeRequests.siteName, q)
        )
      )
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined
    const limit = params?.limit || 100

    const rows = await db
      .select({
        id: hcFlightRouteChangeRequests.id,
        requestNumber: hcFlightRouteChangeRequests.requestNumber,
        employeeId: hcFlightRouteChangeRequests.employeeId,
        employeeSn: hcFlightRouteChangeRequests.employeeSn,
        requestorName: hcFlightRouteChangeRequests.requestorName,
        jobTitle: hcFlightRouteChangeRequests.jobTitle,
        sectionName: hcFlightRouteChangeRequests.sectionName,
        departmentName: hcFlightRouteChangeRequests.departmentName,
        siteId: hcFlightRouteChangeRequests.siteId,
        siteName: hcFlightRouteChangeRequests.siteName,
        originLocation: hcFlightRouteChangeRequests.originLocation,
        requestDate: hcFlightRouteChangeRequests.requestDate,
        pohLocation: hcFlightRouteChangeRequests.pohLocation,
        clauseAccepted: hcFlightRouteChangeRequests.clauseAccepted,
        currentStepOrder: hcFlightRouteChangeRequests.currentStepOrder,
        status: hcFlightRouteChangeRequests.status,
        rejectionReason: hcFlightRouteChangeRequests.rejectionReason,
        createdAt: hcFlightRouteChangeRequests.createdAt,
      })
      .from(hcFlightRouteChangeRequests)
      .where(whereClause)
      .orderBy(desc(hcFlightRouteChangeRequests.id))
      .limit(limit)

    return { ok: true, data: rows }
  } catch (error) {
    console.error('[getFlightRouteChangeListAction] Error:', error)
    return { ok: false, error: 'Gagal memuat daftar permohonan.', data: [] }
  }
}

export async function getFlightRouteChangeDetailsAction(id: number) {
  try {
    const actor = await getActorEmployee()
    const [req] = await db
      .select({
        id: hcFlightRouteChangeRequests.id,
        requestNumber: hcFlightRouteChangeRequests.requestNumber,
        employeeId: hcFlightRouteChangeRequests.employeeId,
        employeeSn: hcFlightRouteChangeRequests.employeeSn,
        requestorName: hcFlightRouteChangeRequests.requestorName,
        jobTitle: hcFlightRouteChangeRequests.jobTitle,
        sectionName: hcFlightRouteChangeRequests.sectionName,
        departmentName: hcFlightRouteChangeRequests.departmentName,
        siteId: hcFlightRouteChangeRequests.siteId,
        siteName: hcFlightRouteChangeRequests.siteName,
        originLocation: hcFlightRouteChangeRequests.originLocation,
        requestDate: hcFlightRouteChangeRequests.requestDate,
        pohLocation: hcFlightRouteChangeRequests.pohLocation,
        clauseAccepted: hcFlightRouteChangeRequests.clauseAccepted,
        currentStepOrder: hcFlightRouteChangeRequests.currentStepOrder,
        status: hcFlightRouteChangeRequests.status,
        rejectionReason: hcFlightRouteChangeRequests.rejectionReason,
        revertedFromStepOrder: hcFlightRouteChangeRequests.revertedFromStepOrder,
        notes: hcFlightRouteChangeRequests.notes,
        createdAt: hcFlightRouteChangeRequests.createdAt,
      })
      .from(hcFlightRouteChangeRequests)
      .where(eq(hcFlightRouteChangeRequests.id, id))
      .limit(1)

    if (!req) return { ok: false, error: 'Dokumen permohonan tidak ditemukan.' }

    const items = await db
      .select({
        id: hcFlightRouteChangeItems.id,
        flightDate: hcFlightRouteChangeItems.flightDate,
        flightRoute: hcFlightRouteChangeItems.flightRoute,
        remark: hcFlightRouteChangeItems.remark,
        sortOrder: hcFlightRouteChangeItems.sortOrder,
      })
      .from(hcFlightRouteChangeItems)
      .where(eq(hcFlightRouteChangeItems.requestId, id))
      .orderBy(asc(hcFlightRouteChangeItems.sortOrder))

    const approvals = await db
      .select({
        id: hcFlightRouteChangeApprovals.id,
        stepOrder: hcFlightRouteChangeApprovals.stepOrder,
        stepKey: hcFlightRouteChangeApprovals.stepKey,
        roleLabel: hcFlightRouteChangeApprovals.roleLabel,
        approverTitle: hcFlightRouteChangeApprovals.approverTitle,
        approverEmployeeId: hcFlightRouteChangeApprovals.approverEmployeeId,
        approverName: hcFlightRouteChangeApprovals.approverName,
        approverEmail: hcFlightRouteChangeApprovals.approverEmail,
        status: hcFlightRouteChangeApprovals.status,
        signatureDataUrl: hcFlightRouteChangeApprovals.signatureDataUrl,
        remarks: hcFlightRouteChangeApprovals.remarks,
        signedAt: hcFlightRouteChangeApprovals.signedAt,
      })
      .from(hcFlightRouteChangeApprovals)
      .where(eq(hcFlightRouteChangeApprovals.requestId, id))
      .orderBy(asc(hcFlightRouteChangeApprovals.stepOrder))

    return {
      ok: true,
      data: {
        ...req,
        items,
        approvals,
        actor: actor
          ? {
              id: actor.id,
              email: actor.email,
              name: actor.name,
              role: actor.role,
              signatureUrl: actor.signatureDataUrl,
            }
          : null,
      },
    }
  } catch (error) {
    console.error('[getFlightRouteChangeDetailsAction] Error:', error)
    return { ok: false, error: 'Gagal mengambil detail permohonan.' }
  }
}

export async function approveFlightRouteChangeAction(input: {
  requestId: number
  stepOrder: number
  signatureDataUrl?: string
  remarks?: string
  actorEmployeeId?: number
}) {
  try {
    let actor = await getActorEmployee()
    if (!actor && input.actorEmployeeId) {
      const [customActor] = await db
        .select({
          id: employees.id,
          name: employees.name,
          employeeSn: employees.employeeSn,
          jobTitle: employees.jobTitle,
          email: employees.email,
          role: employees.role,
          siteId: employees.siteId,
          sectionId: employees.sectionId,
          departmentId: employees.departmentId,
          directManagerId: employees.directManagerId,
          signatureDataUrl: employees.signatureDataUrl,
        })
        .from(employees)
        .where(eq(employees.id, input.actorEmployeeId))
        .limit(1)
      if (customActor) actor = customActor
    }

    const [req] = await db
      .select()
      .from(hcFlightRouteChangeRequests)
      .where(eq(hcFlightRouteChangeRequests.id, input.requestId))
      .limit(1)

    if (!req) return { ok: false, error: 'Permohonan tidak ditemukan.' }

    const [step] = await db
      .select()
      .from(hcFlightRouteChangeApprovals)
      .where(
        and(
          eq(hcFlightRouteChangeApprovals.requestId, input.requestId),
          eq(hcFlightRouteChangeApprovals.stepOrder, input.stepOrder)
        )
      )
      .limit(1)

    if (!step) return { ok: false, error: 'Langkah approval tidak valid.' }
    if (step.status === 'approved') return { ok: false, error: 'Langkah ini sudah disetujui sebelumnya.' }

    // Check authority: user must match step approver or have admin role
    const isMatched =
      !step.approverEmployeeId ||
      (actor?.id && step.approverEmployeeId === actor.id) ||
      (actor?.email && step.approverEmail && actor.email.toLowerCase() === step.approverEmail.toLowerCase())

    if (!isMatched && actor?.id !== req.employeeId && actor?.role !== 'superadmin' && actor?.role !== 'admin') {
      return {
        ok: false,
        error: `Hanya ${step.approverName || 'Approver yang ditunjuk'} yang berwenang menyetujui langkah ${input.stepOrder}.`,
      }
    }

    const now = new Date()
    const signature = input.signatureDataUrl || step.signatureDataUrl || actor?.signatureDataUrl || null

    // Update current step to approved in hcFlightRouteChangeApprovals
    await db
      .update(hcFlightRouteChangeApprovals)
      .set({
        status: 'approved',
        signatureDataUrl: signature,
        remarks: input.remarks || step.remarks || 'Disetujui.',
        approverName: actor?.name || step.approverName,
        approverEmployeeId: actor?.id || step.approverEmployeeId,
        signedAt: now,
        updatedAt: now,
      })
      .where(eq(hcFlightRouteChangeApprovals.id, step.id))

    // Update current step in hero_approvals
    await db
      .update(approvals)
      .set({
        status: 'approved',
        reviewedAt: now,
        signatureUrl: signature,
        decisionNote: input.remarks || 'Disetujui.',
      })
      .where(
        and(
          eq(approvals.flightRouteRequestId, input.requestId),
          eq(approvals.level, input.stepOrder)
        )
      )

    if (input.stepOrder < 5) {
      let nextStepOrder = input.stepOrder + 1

      // If previously reverted from a higher step (e.g. Step 4 or 5), jump directly back to that step!
      if (req.revertedFromStepOrder && req.revertedFromStepOrder > input.stepOrder) {
        nextStepOrder = req.revertedFromStepOrder
      }
      if (nextStepOrder > 5) nextStepOrder = 5

      // Unlock next step in hcFlightRouteChangeApprovals
      await db
        .update(hcFlightRouteChangeApprovals)
        .set({
          status: 'pending',
          updatedAt: now,
        })
        .where(
          and(
            eq(hcFlightRouteChangeApprovals.requestId, input.requestId),
            eq(hcFlightRouteChangeApprovals.stepOrder, nextStepOrder)
          )
        )

      // Unlock next step in hero_approvals so it immediately enters Next Approver's inbox
      await db
        .update(approvals)
        .set({
          status: 'pending',
          submittedAt: now,
        })
        .where(
          and(
            eq(approvals.flightRouteRequestId, input.requestId),
            eq(approvals.level, nextStepOrder)
          )
        )

      await db
        .update(hcFlightRouteChangeRequests)
        .set({
          currentStepOrder: nextStepOrder,
          // Clear revertedFromStepOrder if we reached or exceeded the step that reverted it
          revertedFromStepOrder: nextStepOrder >= (req.revertedFromStepOrder || 0) ? null : req.revertedFromStepOrder,
          updatedAt: now,
        })
        .where(eq(hcFlightRouteChangeRequests.id, input.requestId))

      // Notify next step approver
      const [nextStepRow] = await db
        .select()
        .from(hcFlightRouteChangeApprovals)
        .where(
          and(
            eq(hcFlightRouteChangeApprovals.requestId, input.requestId),
            eq(hcFlightRouteChangeApprovals.stepOrder, nextStepOrder)
          )
        )
        .limit(1)

      if (nextStepRow?.approverEmail) {
        void notifyWorkflowBellRecipients({
          recipientEmails: [nextStepRow.approverEmail],
          eventType: 'flight_route_change',
          category: 'approval_requests',
          title: 'Permohonan Perubahan Rute Penerbangan',
          body: `${req.requestorName} - ${req.requestNumber} menunggu persetujuan Anda (${nextStepRow.roleLabel}).`,
          url: `/dashboard/approval`,
        })
      }
    } else {
      // Step 5 approved -> Request fully approved!
      await db
        .update(hcFlightRouteChangeRequests)
        .set({
          status: 'approved',
          revertedFromStepOrder: null,
          updatedAt: now,
        })
        .where(eq(hcFlightRouteChangeRequests.id, input.requestId))

      // Notify applicant
      if (req.employeeId) {
        const [reqEmp] = await db
          .select({ email: employees.email })
          .from(employees)
          .where(eq(employees.id, req.employeeId))
          .limit(1)

        if (reqEmp?.email) {
          void notifyWorkflowBellRecipients({
            recipientEmails: [reqEmp.email],
            eventType: 'flight_route_change',
            category: 'approval_requests',
            title: 'Permohonan Perubahan Rute Penerbangan Disetujui Penuh',
            body: `Surat permohonan Anda (${req.requestNumber}) telah disetujui penuh oleh seluruh pihak terkait.`,
            url: `/dashboard/hc/flight-route-change?id=${input.requestId}`,
          })
        }
      }
    }

    safeRevalidatePath('/dashboard/hc/flight-route-change')
    safeRevalidatePath('/mobile/hc/flight-route-change')
    safeRevalidatePath('/dashboard/approval')

    return { ok: true }
  } catch (error) {
    console.error('[approveFlightRouteChangeAction] Error:', error)
    return { ok: false, error: 'Gagal memproses approval.' }
  }
}

export async function revertFlightRouteChangeAction(input: {
  requestId: number
  stepOrder: number
  remarks: string
  target?: 'applicant' | 'previous_step'
  actorEmployeeId?: number
}) {
  try {
    let actor = await getActorEmployee()
    if (!actor && input.actorEmployeeId) {
      const [customActor] = await db
        .select({
          id: employees.id,
          name: employees.name,
          employeeSn: employees.employeeSn,
          jobTitle: employees.jobTitle,
          email: employees.email,
          role: employees.role,
          siteId: employees.siteId,
          sectionId: employees.sectionId,
          departmentId: employees.departmentId,
          directManagerId: employees.directManagerId,
          signatureDataUrl: employees.signatureDataUrl,
        })
        .from(employees)
        .where(eq(employees.id, input.actorEmployeeId))
        .limit(1)
      if (customActor) actor = customActor
    }

    const [req] = await db
      .select()
      .from(hcFlightRouteChangeRequests)
      .where(eq(hcFlightRouteChangeRequests.id, input.requestId))
      .limit(1)

    if (!req) return { ok: false, error: 'Permohonan tidak ditemukan.' }

    const now = new Date()

    if (input.stepOrder <= 2 || input.target === 'applicant') {
      // Revert back to applicant / draft
      await db
        .update(hcFlightRouteChangeRequests)
        .set({
          status: 'draft',
          currentStepOrder: 1,
          revertedFromStepOrder: input.stepOrder, // Remember which step reverted it
          rejectionReason: input.remarks || 'Dikembalikan untuk revisi.',
          updatedAt: now,
        })
        .where(eq(hcFlightRouteChangeRequests.id, input.requestId))

      // Reset Step 1 to draft
      await db
        .update(hcFlightRouteChangeApprovals)
        .set({
          status: 'draft',
          signatureDataUrl: null,
          signedAt: null,
          remarks: input.remarks || 'Dikembalikan untuk revisi.',
          updatedAt: now,
        })
        .where(
          and(
            eq(hcFlightRouteChangeApprovals.requestId, input.requestId),
            eq(hcFlightRouteChangeApprovals.stepOrder, 1)
          )
        )

      // Reset steps from input.stepOrder onwards to waiting
      await db
        .update(hcFlightRouteChangeApprovals)
        .set({
          status: 'waiting',
          signatureDataUrl: null,
          signedAt: null,
          remarks: '',
          updatedAt: now,
        })
        .where(
          and(
            eq(hcFlightRouteChangeApprovals.requestId, input.requestId),
            gte(hcFlightRouteChangeApprovals.stepOrder, input.stepOrder)
          )
        )

      // Update hero_approvals: mark reverting step as reverted
      await db
        .update(approvals)
        .set({
          status: 'reverted',
          decisionNote: input.remarks || 'Dikembalikan untuk revisi.',
          reviewedAt: now,
        })
        .where(
          and(
            eq(approvals.flightRouteRequestId, input.requestId),
            eq(approvals.level, input.stepOrder)
          )
        )

      await db
        .update(approvals)
        .set({
          status: 'waiting',
        })
        .where(
          and(
            eq(approvals.flightRouteRequestId, input.requestId),
            gt(approvals.level, input.stepOrder)
          )
        )

      // Notify applicant
      if (req.employeeId) {
        const [subEmp] = await db
          .select({ email: employees.email })
          .from(employees)
          .where(eq(employees.id, req.employeeId))
          .limit(1)

        if (subEmp?.email) {
          void notifyWorkflowBellRecipients({
            recipientEmails: [subEmp.email],
            eventType: 'flight_route_change',
            category: 'approval_requests',
            title: 'Permohonan Perubahan Rute Dikembalikan',
            body: `Surat permohonan Anda (${req.requestNumber}) dikembalikan untuk revisi: ${input.remarks}`,
            url: `/dashboard/hc/flight-route-change?id=${input.requestId}`,
          })
        }
      }
    } else {
      // Revert to previous step (stepOrder - 1)
      const prevStepOrder = input.stepOrder - 1

      await db
        .update(hcFlightRouteChangeRequests)
        .set({
          status: 'in_progress',
          currentStepOrder: prevStepOrder,
          revertedFromStepOrder: input.stepOrder, // Remember who reverted it
          rejectionReason: input.remarks || 'Dikembalikan ke tahap sebelumnya.',
          updatedAt: now,
        })
        .where(eq(hcFlightRouteChangeRequests.id, input.requestId))

      // Current step becomes waiting
      await db
        .update(hcFlightRouteChangeApprovals)
        .set({
          status: 'waiting',
          signatureDataUrl: null,
          signedAt: null,
          remarks: '',
          updatedAt: now,
        })
        .where(
          and(
            eq(hcFlightRouteChangeApprovals.requestId, input.requestId),
            gte(hcFlightRouteChangeApprovals.stepOrder, input.stepOrder)
          )
        )

      // Previous step becomes pending again
      await db
        .update(hcFlightRouteChangeApprovals)
        .set({
          status: 'pending',
          signatureDataUrl: null,
          signedAt: null,
          remarks: input.remarks || 'Dikembalikan dari tahap berikutnya.',
          updatedAt: now,
        })
        .where(
          and(
            eq(hcFlightRouteChangeApprovals.requestId, input.requestId),
            eq(hcFlightRouteChangeApprovals.stepOrder, prevStepOrder)
          )
        )

      // Update hero_approvals
      await db
        .update(approvals)
        .set({
          status: 'waiting',
        })
        .where(
          and(
            eq(approvals.flightRouteRequestId, input.requestId),
            gte(approvals.level, input.stepOrder)
          )
        )

      await db
        .update(approvals)
        .set({
          status: 'pending',
          submittedAt: now,
          decisionNote: input.remarks || 'Dikembalikan untuk revisi.',
          signatureUrl: null,
          reviewedAt: null,
        })
        .where(
          and(
            eq(approvals.flightRouteRequestId, input.requestId),
            eq(approvals.level, prevStepOrder)
          )
        )

      // Notify previous approver
      const [prevStepRow] = await db
        .select()
        .from(hcFlightRouteChangeApprovals)
        .where(
          and(
            eq(hcFlightRouteChangeApprovals.requestId, input.requestId),
            eq(hcFlightRouteChangeApprovals.stepOrder, prevStepOrder)
          )
        )
        .limit(1)

      if (prevStepRow?.approverEmail) {
        void notifyWorkflowBellRecipients({
          recipientEmails: [prevStepRow.approverEmail],
          eventType: 'flight_route_change',
          category: 'approval_requests',
          title: 'Permohonan Perubahan Rute Dikembalikan',
          body: `Surat permohonan (${req.requestNumber}) dikembalikan ke tahap Anda untuk revisi: ${input.remarks}`,
          url: `/dashboard/approval`,
        })
      }
    }

    safeRevalidatePath('/dashboard/hc/flight-route-change')
    safeRevalidatePath('/mobile/hc/flight-route-change')
    safeRevalidatePath('/dashboard/approval')

    return { ok: true }
  } catch (error) {
    console.error('[revertFlightRouteChangeAction] Error:', error)
    return { ok: false, error: 'Gagal mengembalikan permohonan.' }
  }
}

export async function rejectFlightRouteChangeAction(input: {
  requestId: number
  stepOrder: number
  remarks: string
}) {
  try {
    const actor = await getActorEmployee()

    const [req] = await db
      .select()
      .from(hcFlightRouteChangeRequests)
      .where(eq(hcFlightRouteChangeRequests.id, input.requestId))
      .limit(1)

    if (!req) return { ok: false, error: 'Permohonan tidak ditemukan.' }

    const [step] = await db
      .select()
      .from(hcFlightRouteChangeApprovals)
      .where(
        and(
          eq(hcFlightRouteChangeApprovals.requestId, input.requestId),
          eq(hcFlightRouteChangeApprovals.stepOrder, input.stepOrder)
        )
      )
      .limit(1)

    if (!step) return { ok: false, error: 'Langkah approval tidak valid.' }

    const now = new Date()

    await db
      .update(hcFlightRouteChangeApprovals)
      .set({
        status: 'rejected',
        remarks: input.remarks || 'Ditolak.',
        approverName: actor?.name || step.approverName,
        approverEmployeeId: actor?.id || step.approverEmployeeId,
        signedAt: now,
        updatedAt: now,
      })
      .where(eq(hcFlightRouteChangeApprovals.id, step.id))

    // Set remaining waiting steps to rejected
    await db
      .update(hcFlightRouteChangeApprovals)
      .set({
        status: 'rejected',
        updatedAt: now,
      })
      .where(
        and(
          eq(hcFlightRouteChangeApprovals.requestId, input.requestId),
          eq(hcFlightRouteChangeApprovals.status, 'waiting')
        )
      )

    await db
      .update(hcFlightRouteChangeRequests)
      .set({
        status: 'rejected',
        rejectionReason: input.remarks || 'Permohonan ditolak.',
        updatedAt: now,
      })
      .where(eq(hcFlightRouteChangeRequests.id, input.requestId))

    // Update hero_approvals
    await db
      .update(approvals)
      .set({
        status: 'rejected',
        rejectionReason: input.remarks || 'Ditolak.',
        reviewedAt: now,
      })
      .where(
        and(
          eq(approvals.flightRouteRequestId, input.requestId),
          eq(approvals.level, input.stepOrder)
        )
      )

    await db
      .update(approvals)
      .set({
        status: 'rejected',
      })
      .where(
        and(
          eq(approvals.flightRouteRequestId, input.requestId),
          inArray(approvals.level, [input.stepOrder + 1, input.stepOrder + 2, input.stepOrder + 3, input.stepOrder + 4].filter((l) => l <= 5))
        )
      )

    if (req.employeeId) {
      const [reqEmp] = await db
        .select({ email: employees.email })
        .from(employees)
        .where(eq(employees.id, req.employeeId))
        .limit(1)

      if (reqEmp?.email) {
        void notifyWorkflowBellRecipients({
          recipientEmails: [reqEmp.email],
          eventType: 'flight_route_change',
          category: 'approval_requests',
          title: 'Permohonan Perubahan Rute Penerbangan Ditolak',
          body: `Surat permohonan Anda (${req.requestNumber}) ditolak: ${input.remarks}`,
          url: `/dashboard/hc/flight-route-change?id=${input.requestId}`,
        })
      }
    }

    safeRevalidatePath('/dashboard/hc/flight-route-change')
    safeRevalidatePath('/mobile/hc/flight-route-change')
    safeRevalidatePath('/dashboard/approval')

    return { ok: true }
  } catch (error) {
    console.error('[rejectFlightRouteChangeAction] Error:', error)
    return { ok: false, error: 'Gagal menolak permohonan.' }
  }
}

export async function deleteFlightRouteChangeAction(id: number) {
  try {
    await db.delete(approvals).where(eq(approvals.flightRouteRequestId, id))
    await db.delete(hcFlightRouteChangeRequests).where(eq(hcFlightRouteChangeRequests.id, id))
    safeRevalidatePath('/dashboard/hc/flight-route-change')
    safeRevalidatePath('/mobile/hc/flight-route-change')
    safeRevalidatePath('/dashboard/approval')
    return { ok: true }
  } catch (error) {
    console.error('[deleteFlightRouteChangeAction] Error:', error)
    return { ok: false, error: 'Gagal menghapus permohonan.' }
  }
}
