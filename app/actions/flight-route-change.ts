'use server'

import { and, asc, desc, eq, ilike, inArray, or } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { db } from '@/db'
import {
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

export type FlightRouteItemInput = {
  flightDate: string
  flightRoute: string
  remark?: string
}

export type CreateFlightRouteChangeInput = {
  employeeId?: number
  requestDate?: string
  originLocation?: string
  pohLocation?: string
  clauseAccepted?: boolean
  notes?: string
  signatureDataUrl?: string
  items: FlightRouteItemInput[]
  approverSelection?: {
    pjoEmployeeId?: number
    supervisorEmployeeId?: number
    hrGaLeaderEmployeeId?: number
    managerEmployeeId?: number
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
        siteId: employees.siteId,
        sectionId: employees.sectionId,
        departmentId: employees.departmentId,
        directManagerId: employees.directManagerId,
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

    const requestNumber = await generateFlightRouteRequestNumber()
    const todayStr = new Date().toISOString().slice(0, 10)
    const requestDate = input.requestDate || todayStr

    const [createdReq] = await db
      .insert(hcFlightRouteChangeRequests)
      .values({
        requestNumber,
        employeeId: emp.id,
        employeeSn: emp.employeeSn || '',
        requestorName: emp.name,
        jobTitle: emp.jobTitle || 'Serviceman',
        sectionName: emp.sectionName || 'Service Operation',
        departmentName: emp.departmentName || 'Service Operation',
        siteId: emp.siteId,
        siteName: emp.siteName || 'CK-KIM',
        originLocation: input.originLocation || 'Jambi',
        requestDate,
        pohLocation: input.pohLocation || 'Balikpapan',
        clauseAccepted: input.clauseAccepted !== false,
        currentStepOrder: 2, // Step 1 is applicant, auto-signed upon submission
        status: 'in_progress',
        notes: input.notes || '',
      })
      .returning({ id: hcFlightRouteChangeRequests.id })

    const requestId = createdReq.id

    // Insert Items
    const itemValues = input.items.map((item, idx) => ({
      requestId,
      flightDate: item.flightDate,
      flightRoute: item.flightRoute,
      remark: item.remark || (idx === 0 ? 'Offsite/ FB' : 'Onsite'),
      sortOrder: idx + 1,
    }))
    await db.insert(hcFlightRouteChangeItems).values(itemValues)

    // Resolve Approvers for 5 steps
    // Step 1: Applicant (Pemohon)
    // Step 2: PJO (Mengetahui - PJO)
    // Step 3: Supervisor (Mengetahui - Service Operation / Section SPV)
    // Step 4: HR GA Leader (Mengetahui - HR GA Leader)
    // Step 5: Manager (Menyetujui - Central Services Manager)

    const pjoId = input.approverSelection?.pjoEmployeeId || null
    const spvId = input.approverSelection?.supervisorEmployeeId || emp.directManagerId || null
    const hrId = input.approverSelection?.hrGaLeaderEmployeeId || null
    const mgrId = input.approverSelection?.managerEmployeeId || null

    // Fetch approver names
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
    const now = new Date()

    const approvalSteps = [
      {
        requestId,
        stepOrder: 1,
        stepKey: 'applicant',
        roleLabel: 'Diajukan Oleh',
        approverTitle: emp.jobTitle || 'Pemohon',
        approverEmployeeId: emp.id,
        approverName: emp.name,
        approverEmail: actor?.email || '',
        status: 'approved',
        signatureDataUrl: input.signatureDataUrl || null,
        remarks: 'Permohonan diajukan.',
        signedAt: now,
      },
      {
        requestId,
        stepOrder: 2,
        stepKey: 'pjo',
        roleLabel: 'Mengetahui',
        approverTitle: empMap.get(pjoId!)?.jobTitle || 'PJO Leader',
        approverEmployeeId: pjoId,
        approverName: empMap.get(pjoId!)?.name || 'PJO Leader',
        approverEmail: empMap.get(pjoId!)?.email || '',
        status: 'pending',
        signatureDataUrl: null,
        remarks: '',
        signedAt: null,
      },
      {
        requestId,
        stepOrder: 3,
        stepKey: 'supervisor',
        roleLabel: 'Mengetahui',
        approverTitle: empMap.get(spvId!)?.jobTitle || 'Service Operation SPV',
        approverEmployeeId: spvId,
        approverName: empMap.get(spvId!)?.name || 'Supervisor',
        approverEmail: empMap.get(spvId!)?.email || '',
        status: 'waiting',
        signatureDataUrl: null,
        remarks: '',
        signedAt: null,
      },
      {
        requestId,
        stepOrder: 4,
        stepKey: 'hr_ga_leader',
        roleLabel: 'Mengetahui',
        approverTitle: empMap.get(hrId!)?.jobTitle || 'HR GA Leader',
        approverEmployeeId: hrId,
        approverName: empMap.get(hrId!)?.name || 'HR GA Leader',
        approverEmail: empMap.get(hrId!)?.email || '',
        status: 'waiting',
        signatureDataUrl: null,
        remarks: '',
        signedAt: null,
      },
      {
        requestId,
        stepOrder: 5,
        stepKey: 'manager',
        roleLabel: 'Menyetujui',
        approverTitle: empMap.get(mgrId!)?.jobTitle || 'Central Services Manager',
        approverEmployeeId: mgrId,
        approverName: empMap.get(mgrId!)?.name || 'Manager',
        approverEmail: empMap.get(mgrId!)?.email || '',
        status: 'waiting',
        signatureDataUrl: null,
        remarks: '',
        signedAt: null,
      },
    ]

    await db.insert(hcFlightRouteChangeApprovals).values(approvalSteps)

    // Notify Step 2 Approver (PJO)
    if (pjoId) {
      const pjoEmail = empMap.get(pjoId)?.email
      if (pjoEmail) {
        void notifyWorkflowBellRecipients({
          recipientEmails: [pjoEmail],
          eventType: 'flight_route_change',
          category: 'approval_requests',
          title: 'Permohonan Perubahan Rute Penerbangan',
          body: `${emp.name} mengajukan perubahan rute penerbangan (${requestNumber}). Membutuhkan persetujuan Anda.`,
          url: `/dashboard/hc/flight-route-change?id=${requestId}`,
        })
      }
    }

    revalidatePath('/dashboard/hc/flight-route-change')
    revalidatePath('/mobile/hc/flight-route-change')
    revalidatePath('/dashboard/approval')

    return { ok: true, id: requestId, requestNumber }
  } catch (error) {
    console.error('[createFlightRouteChangeAction] Error:', error)
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
    if (step.status === 'approved') return { ok: false, error: 'Langkah ini sudah disetujui.' }

    const now = new Date()

    // Update current step to approved
    await db
      .update(hcFlightRouteChangeApprovals)
      .set({
        status: 'approved',
        signatureDataUrl: input.signatureDataUrl || step.signatureDataUrl || null,
        remarks: input.remarks || step.remarks || 'Disetujui.',
        approverName: actor?.name || step.approverName,
        approverEmployeeId: actor?.id || step.approverEmployeeId,
        signedAt: now,
        updatedAt: now,
      })
      .where(eq(hcFlightRouteChangeApprovals.id, step.id))

    if (input.stepOrder < 5) {
      const nextStepOrder = input.stepOrder + 1

      // Unlock next step
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

      await db
        .update(hcFlightRouteChangeRequests)
        .set({
          currentStepOrder: nextStepOrder,
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

      if (nextStepRow?.approverEmployeeId) {
        const [nextEmp] = await db
          .select({ email: employees.email })
          .from(employees)
          .where(eq(employees.id, nextStepRow.approverEmployeeId))
          .limit(1)

        if (nextEmp?.email) {
          void notifyWorkflowBellRecipients({
            recipientEmails: [nextEmp.email],
            eventType: 'flight_route_change',
            category: 'approval_requests',
            title: 'Permohonan Perubahan Rute Penerbangan',
            body: `${req.requestorName} - ${req.requestNumber} menunggu persetujuan Anda (${nextStepRow.roleLabel}).`,
            url: `/dashboard/hc/flight-route-change?id=${input.requestId}`,
          })
        }
      }
    } else {
      // Step 5 approved -> Request fully approved!
      await db
        .update(hcFlightRouteChangeRequests)
        .set({
          status: 'approved',
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
            title: 'Permohonan Perubahan Rute Penerbangan Disetujui',
            body: `Surat permohonan Anda (${req.requestNumber}) telah disetujui penuh oleh seluruh pihak terkait.`,
            url: `/dashboard/hc/flight-route-change?id=${input.requestId}`,
          })
        }
      }
    }

    revalidatePath('/dashboard/hc/flight-route-change')
    revalidatePath('/mobile/hc/flight-route-change')
    revalidatePath('/dashboard/approval')

    return { ok: true }
  } catch (error) {
    console.error('[approveFlightRouteChangeAction] Error:', error)
    return { ok: false, error: 'Gagal memproses approval.' }
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

    await db
      .update(hcFlightRouteChangeRequests)
      .set({
        status: 'rejected',
        rejectionReason: input.remarks || 'Permohonan ditolak.',
        updatedAt: now,
      })
      .where(eq(hcFlightRouteChangeRequests.id, input.requestId))

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

    revalidatePath('/dashboard/hc/flight-route-change')
    revalidatePath('/mobile/hc/flight-route-change')
    revalidatePath('/dashboard/approval')

    return { ok: true }
  } catch (error) {
    console.error('[rejectFlightRouteChangeAction] Error:', error)
    return { ok: false, error: 'Gagal menolak permohonan.' }
  }
}

export async function deleteFlightRouteChangeAction(id: number) {
  try {
    await db.delete(hcFlightRouteChangeRequests).where(eq(hcFlightRouteChangeRequests.id, id))
    revalidatePath('/dashboard/hc/flight-route-change')
    revalidatePath('/mobile/hc/flight-route-change')
    return { ok: true }
  } catch (error) {
    console.error('[deleteFlightRouteChangeAction] Error:', error)
    return { ok: false, error: 'Gagal menghapus permohonan.' }
  }
}
