import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { repairFormWo } from '@/db/schema/form-wo'
import {
  activities,
  activityPhotos,
  dailyActivitySessionItems,
  dailyActivitySessions,
  approvalAttachments,
  approvalMatrices,
  approvalMatrixSteps,
  approvals,
  employees,
  formSubmissions,
  formTemplates,
  hcContractReviewApprovals,
  hcEmployeeContractReviews,
  orgChartStructures,
  orgChartNodes,
  overtimeCommandLetterItems,
  overtimeCommandLetters,
  sites,
  apdRequests,
} from '@/db/schema/hero'
import type { ApprovalRouteResolution } from '@/lib/approval-engine'
import { parseApprovalNoteEntries } from '@/lib/approval-notes'
import { ensureHeroSeedData } from '@/lib/hero-admin'
import { resolveUploadUrl } from '@/lib/s3-storage'
import { user as authUser } from '@/db/schema/auth'

type ApprovalRecordRow = {
  approvalId: number
  activityId: number
  submissionId: number | null
  requestNumber: string | null
  formName: string
  approvalStepId: number | null
  level: number
  status: string
  approverName: string
  approverEmployeeId: number | null
  submittedAt: Date
  reviewedAt: Date | null
  overtimeMinutes: number
  resolutionSource: string
  routeSnapshot: string
  decisionNote: string
  activityCode: string
  activityType: string
  activityTitle: string
  unitNumber: string
  equipmentNo?: string
  tireCount?: number
  activityStatus: string
  priority: string
  remarks: string
  startTime: Date
  endTime: Date
  createdAt: Date
  requesterName: string
  requesterEmail: string
  requesterDepartment: string
  requesterSection: string
  requesterJobTitle: string
  siteName: string
  photoUrl: string | null
  requestKindLabel: string
  description: string
  dailyActivityStatus: string
  evidenceProgressPercent: number
  evidencePhotoUrls: string[]
  workItems: Array<{
    id: number
    label: string
    description: string
    unitNumber: string
    employeeName: string
    startedAt: Date | null
    endedAt: Date | null
    remark: string
    isChecked: boolean
    photoCount: number
  }>
  repairFormWo?: typeof repairFormWo.$inferSelect | null
  signatureUrl?: string | null
}

type RawApprovalRecordRow = {
  approvalId: number
  approvalActivityId: number | null
  submissionId: number | null
  approvalStepId: number | null
  level: number
  status: string
  approverName: string
  approverEmployeeId: number | null
  submittedAt: Date
  reviewedAt: Date | null
  overtimeMinutes: number
  resolutionSource: string
  routeSnapshot: string
  decisionNote: string
  activityCode: string | null
  activityType: string | null
  activityTitle: string | null
  unitNumber: string | null
  equipmentNo?: string | null
  tireCount?: number | null
  activityStatus: string | null
  priority: string | null
  remarks: string | null
  startTime: Date | null
  endTime: Date | null
  createdAt: Date | null
  activityEmployeeId: number | null
  activitySiteId: number | null
  requesterEmployeeId: number | null
  submissionSiteId: number | null
  requestNumber: string | null
  submissionStatus: string | null
  payloadSnapshot: string | null
  previewSnapshot: string | null
  submissionCreatedAt: Date | null
  submissionSubmittedAt: Date | null
  templateName: string | null
  templateKey: string | null
  apdRequestId?: number | null
  slaHours: number
  route: ApprovalRouteResolution | null
  currentStepLabel: string
  commentsCount: number
  isPending: boolean
}

type ApprovalComment = {
  id: string
  at: Date
  actor: string
  role: string
  kind: string
  message: string
}

type ApprovalTimelineItem = {
  id: string
  at: Date
  label: string
  detail: string
  tone: string
}

function parseApprovalRouteSnapshot(routeSnapshot: string) {
  const trimmedSnapshot = routeSnapshot.trim()

  if (!trimmedSnapshot) {
    return null
  }

  try {
    return JSON.parse(trimmedSnapshot) as ApprovalRouteResolution
  } catch {
    return null
  }
}

function minutesToHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)} jam`
}

function getShiftLabel(startTime: Date) {
  const hour = startTime.getHours()

  if (hour >= 6 && hour < 15) {
    return 'Shift Pagi'
  }

  if (hour >= 15 && hour < 23) {
    return 'Shift Sore'
  }

  return 'Shift Malam'
}

function getTodayWindow(reference = new Date()) {
  return {
    start: new Date(reference.getFullYear(), reference.getMonth(), reference.getDate()),
    end: new Date(reference.getFullYear(), reference.getMonth(), reference.getDate() + 1),
  }
}

function mapRequestStatus(activityStatus: string) {
  const normalized = activityStatus.trim().toLowerCase()

  if (normalized === 'approved') {
    return 'approved'
  }

  if (normalized === 'rejected') {
    return 'rejected'
  }

  if (normalized === 'needs correction') {
    return 'needs_revision'
  }

  if (normalized === 'cancelled') {
    return 'cancelled'
  }

  if (normalized.startsWith('pending')) {
    return 'in_review'
  }

  return 'submitted'
}

function parseJsonObject<T extends Record<string, unknown>>(value: string, fallback: T) {
  if (!value.trim()) {
    return fallback
  }

  try {
    const parsed = JSON.parse(value) as T
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function parseSnapshotDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function snapshotSplId(payload: Record<string, unknown>) {
  const value = payload.legacyRecordId
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

async function normalizeApprovalRows(rawRows: RawApprovalRecordRow[]) {
  const snapshots = rawRows.map((row) => ({
    approvalId: row.approvalId,
    payload: parseJsonObject<Record<string, unknown>>(row.payloadSnapshot ?? '', {}),
    preview: parseJsonObject<Record<string, unknown>>(row.previewSnapshot ?? '', {}),
  }))
  const snapshotMap = new Map(snapshots.map((item) => [item.approvalId, item]))
  const splIds = Array.from(
    new Set(
      snapshots
        .map((item) => snapshotSplId(item.payload))
        .filter((value): value is number => value != null)
    )
  )
  const activityIds = Array.from(
    new Set(
      rawRows.map((row) => row.approvalActivityId).filter((value): value is number => value != null)
    )
  )
  const repairWoIds = Array.from(
    new Set(rawRows.map((row) => row.repairFormWoId).filter((v): v is number => v != null))
  )
  const repairWoRows =
    repairWoIds.length === 0
      ? []
      : await db
          .select()
          .from(repairFormWo)
          .where(inArray(repairFormWo.id, repairWoIds))

  const woApprovalsList =
    repairWoIds.length === 0
      ? []
      : await db
          .select({
            id: approvals.id,
            repairFormWoId: approvals.repairFormWoId,
            level: approvals.level,
            approverName: approvals.approverName,
            approverEmployeeId: approvals.approverEmployeeId,
            approverNodeId: approvals.approverNodeId,
            approvalStepId: approvals.approvalStepId,
            approvalMatrixId: approvals.approvalMatrixId,
            status: approvals.status,
            decisionNote: approvals.decisionNote,
            reviewedAt: approvals.reviewedAt,
            signatureUrl: approvals.signatureUrl,
            routeSnapshot: approvals.routeSnapshot,
          })
          .from(approvals)
          .where(inArray(approvals.repairFormWoId, repairWoIds))
          .orderBy(asc(approvals.level))

  const approverEmployeeIds = Array.from(
    new Set(
      woApprovalsList
        .map((a) => a.approverEmployeeId)
        .filter((id): id is number => id != null)
    )
  )
  const nodeIds = Array.from(
    new Set(
      woApprovalsList
        .map((a) => a.approverNodeId)
        .filter((id): id is number => id != null)
    )
  )
  const stepIds = Array.from(
    new Set(
      woApprovalsList
        .map((a) => a.approvalStepId)
        .filter((id): id is number => id != null)
    )
  )

  const [approverEmployees, orgNodes, matrixSteps] = await Promise.all([
    approverEmployeeIds.length === 0
      ? []
      : db
          .select({
            id: employees.id,
            name: employees.name,
            jobTitle: employees.jobTitle,
          })
          .from(employees)
          .where(inArray(employees.id, approverEmployeeIds)),
    nodeIds.length === 0
      ? []
      : db
          .select({
            id: orgChartNodes.id,
            label: orgChartNodes.label,
            approvalRole: orgChartNodes.approvalRole,
          })
          .from(orgChartNodes)
          .where(inArray(orgChartNodes.id, nodeIds)),
    stepIds.length === 0
      ? []
      : db
          .select({
            id: approvalMatrixSteps.id,
            label: approvalMatrixSteps.label,
          })
          .from(approvalMatrixSteps)
          .where(inArray(approvalMatrixSteps.id, stepIds)),
  ])

  const approverEmpMap = new Map(approverEmployees.map((e) => [e.id, e]))
  const nodeMap = new Map(orgNodes.map((n) => [n.id, n]))
  const matrixStepMap = new Map(matrixSteps.map((s) => [s.id, s]))

  const woApprovalsMap = new Map<
    number,
    Array<{
      level: number
      approverName: string | null
      jobTitle?: string | null
      status: string
      decision?: string | null
      decisionNote?: string | null
      reviewedAt?: Date | null
      signatureUrl?: string | null
    }>
  >()

  for (const a of woApprovalsList) {
    if (a.repairFormWoId != null) {
      const emp = a.approverEmployeeId ? approverEmpMap.get(a.approverEmployeeId) : null
      const node = a.approverNodeId ? nodeMap.get(a.approverNodeId) : null
      const matrixStep = a.approvalStepId ? matrixStepMap.get(a.approvalStepId) : null

      let snapshotLabel: string | null = null
      if (a.routeSnapshot) {
        try {
          const parsed = JSON.parse(a.routeSnapshot)
          snapshotLabel = parsed.label || parsed.nodeLabel || null
        } catch {}
      }

      // Prioritas jabatan:
      // 1. Label dari Step Matrix di Approval Workflow Builder (misal: "Section Head Retread")
      // 2. Role / Label dari Org Node di Approval Workflow Builder (misal: "Section Head" / "Dept Head Central Service")
      // 3. Label snapshot jika terekam saat routing
      // 4. Job title karyawan (jika bukan generic fallback 'Staff')
      // 5. Fallback berjenjang standar
      const resolvedJobTitle =
        matrixStep?.label?.trim() ||
        node?.approvalRole?.trim() ||
        node?.label?.trim() ||
        snapshotLabel?.trim() ||
        (emp?.jobTitle && emp.jobTitle !== 'Staff' ? emp.jobTitle : null) ||
        (a.level === 1
          ? 'Admin CP Site'
          : a.level === 2
            ? 'QC / Leader'
            : a.level === 3
              ? 'Repair / Retread Operation SPV'
              : a.level === 4
                ? 'Team Billing'
                : 'Inventory & Warehouse Management SPV')

      const noteEntries = a.decisionNote
        ? parseApprovalNoteEntries(a.decisionNote, a.approverName || 'Approver')
        : []
      const cleanNote =
        noteEntries.length > 0
          ? noteEntries[noteEntries.length - 1]?.message || null
          : a.decisionNote || null

      const list = woApprovalsMap.get(a.repairFormWoId) ?? []
      list.push({
        level: a.level,
        approverName: emp?.name || a.approverName || null,
        jobTitle: resolvedJobTitle,
        status: a.status,
        decisionNote: cleanNote,
        reviewedAt: a.reviewedAt,
        signatureUrl: a.signatureUrl,
      })
      woApprovalsMap.set(a.repairFormWoId, list)
    }
  }

  const repairWoMap = new Map(
    repairWoRows.map((row) => {
      const submitterEmp = row.createdBy ? approverEmpMap.get(row.createdBy) : null
      return [
        row.id,
        {
          ...row,
          pemohon: row.pemohon || submitterEmp?.name || 'Mochamad Annas Khadafi',
          pemohonJobTitle: 'Admin CP Site',
          steps: woApprovalsMap.get(row.id) ?? [],
        },
      ]
    })
  )

    const apdIds = Array.from(
    new Set(
      rawRows.map((row) => row.apdRequestId).filter((value): value is number => value != null)
    )
  )
  const apdRows =
    apdIds.length === 0
      ? []
      : await db
          .select({
            id: apdRequests.id,
            requestNumber: apdRequests.requestNumber,
            status: apdRequests.status,
            requestDate: apdRequests.requestDate,
            employeeId: apdRequests.employeeId,
            siteId: apdRequests.siteId,
          })
          .from(apdRequests)
          .where(inArray(apdRequests.id, apdIds))
  const apdMap = new Map(apdRows.map((row) => [row.id, row]))
  const requesterIds = Array.from(
    new Set(
      rawRows
        .map(
          (row) =>
            row.activityEmployeeId ??
            row.requesterEmployeeId ??
            (row.apdRequestId == null ? null : apdMap.get(row.apdRequestId)?.employeeId)
        )
        .filter((value): value is number => value != null)
    )
  )
  const siteIds = Array.from(
    new Set(
      rawRows
        .map(
          (row) =>
            row.activitySiteId ??
            row.submissionSiteId ??
            (row.apdRequestId == null ? null : apdMap.get(row.apdRequestId)?.siteId)
        )
        .filter((value): value is number => value != null)
    )
  )

  const [
    requesters,
    siteRows,
    splRows,
    splItemRows,
    splSessionRows,
    splSessionItemRows,
    splPhotoRows,
    activityPhotoRows,
  ] = await Promise.all([
    requesterIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: employees.id,
            name: employees.name,
            email: employees.email,
            department: employees.department,
            section: employees.section,
            jobTitle: employees.jobTitle,
          })
          .from(employees)
          .where(inArray(employees.id, requesterIds)),
    siteIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: sites.id,
            name: sites.name,
          })
          .from(sites)
          .where(inArray(sites.id, siteIds)),
    splIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: overtimeCommandLetters.id,
            splNumber: overtimeCommandLetters.splNumber,
            title: overtimeCommandLetters.title,
            workDate: overtimeCommandLetters.workDate,
            plannedStartAt: overtimeCommandLetters.plannedStartAt,
            plannedEndAt: overtimeCommandLetters.plannedEndAt,
            requestNotes: overtimeCommandLetters.requestNotes,
            origin: overtimeCommandLetters.origin,
            requestKind: overtimeCommandLetters.requestKind,
          })
          .from(overtimeCommandLetters)
          .where(inArray(overtimeCommandLetters.id, splIds)),
    splIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: overtimeCommandLetterItems.id,
            overtimeCommandLetterId: overtimeCommandLetterItems.overtimeCommandLetterId,
            lineLabel: overtimeCommandLetterItems.lineLabel,
            lineDescription: overtimeCommandLetterItems.lineDescription,
            targetUnit: overtimeCommandLetterItems.targetUnit,
            employeeName: employees.name,
          })
          .from(overtimeCommandLetterItems)
          .leftJoin(employees, eq(overtimeCommandLetterItems.assignedEmployeeId, employees.id))
          .where(inArray(overtimeCommandLetterItems.overtimeCommandLetterId, splIds)),
    splIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: dailyActivitySessions.id,
            overtimeCommandLetterId: dailyActivitySessions.overtimeCommandLetterId,
            activityId: dailyActivitySessions.activityId,
            status: dailyActivitySessions.status,
            summaryRemark: dailyActivitySessions.summaryRemark,
          })
          .from(dailyActivitySessions)
          .where(inArray(dailyActivitySessions.overtimeCommandLetterId, splIds)),
    splIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            id: dailyActivitySessionItems.id,
            overtimeCommandLetterId: dailyActivitySessions.overtimeCommandLetterId,
            overtimeCommandLetterItemId: dailyActivitySessionItems.overtimeCommandLetterItemId,
            snapshotLabel: dailyActivitySessionItems.snapshotLabel,
            startedAt: dailyActivitySessionItems.startedAt,
            endedAt: dailyActivitySessionItems.endedAt,
            unitNumber: dailyActivitySessionItems.unitNumber,
            remark: dailyActivitySessionItems.remark,
            isChecked: dailyActivitySessionItems.isChecked,
            photoCount: dailyActivitySessionItems.photoCount,
          })
          .from(dailyActivitySessionItems)
          .innerJoin(
            dailyActivitySessions,
            eq(dailyActivitySessionItems.sessionId, dailyActivitySessions.id)
          )
          .where(inArray(dailyActivitySessions.overtimeCommandLetterId, splIds)),
    splIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            overtimeCommandLetterId: dailyActivitySessions.overtimeCommandLetterId,
            fileUrl: activityPhotos.fileUrl,
          })
          .from(activityPhotos)
          .innerJoin(
            dailyActivitySessions,
            eq(activityPhotos.activityId, dailyActivitySessions.activityId)
          )
          .where(inArray(dailyActivitySessions.overtimeCommandLetterId, splIds)),
    activityIds.length === 0
      ? Promise.resolve([])
      : db
          .select({
            activityId: activityPhotos.activityId,
            fileUrl: activityPhotos.fileUrl,
          })
          .from(activityPhotos)
          .where(inArray(activityPhotos.activityId, activityIds)),
  ])

  const requesterMap = new Map(requesters.map((item) => [item.id, item]))
  const siteMap = new Map(siteRows.map((item) => [item.id, item]))
  const splMap = new Map(splRows.map((item) => [item.id, item]))

  return rawRows.map((row) => {
    const snapshot = snapshotMap.get(row.approvalId)
    const payload: Record<string, unknown> = snapshot?.payload ?? {}
    const preview: Record<string, unknown> = snapshot?.preview ?? {}
    const splId = snapshotSplId(payload)
    const spl = splId == null ? null : (splMap.get(splId) ?? null)
    const apd = row.apdRequestId == null ? null : (apdMap.get(row.apdRequestId) ?? null)
    const plannedItems =
      splId == null ? [] : splItemRows.filter((item) => item.overtimeCommandLetterId === splId)
    const sessionItems =
      splId == null
        ? []
        : splSessionItemRows.filter((item) => item.overtimeCommandLetterId === splId)
    const sessions =
      splId == null ? [] : splSessionRows.filter((item) => item.overtimeCommandLetterId === splId)
    const workItems = plannedItems.map((item) => {
      const updates = sessionItems.filter(
        (update) => update.overtimeCommandLetterItemId === item.id
      )
      const latest = updates[updates.length - 1] ?? null
      return {
        id: item.id,
        label: item.lineLabel,
        description: item.lineDescription,
        unitNumber: latest?.unitNumber || item.targetUnit || '-',
        employeeName: item.employeeName ?? '-',
        startedAt: latest?.startedAt ?? null,
        endedAt: latest?.endedAt ?? null,
        remark: latest?.remark ?? '',
        isChecked: updates.some((update) => update.isChecked),
        photoCount: updates.reduce((total, update) => total + update.photoCount, 0),
      }
    })
    const photoUrls = Array.from(
      new Set(
        [
          ...activityPhotoRows
            .filter((photo) => photo.activityId === row.approvalActivityId)
            .map((photo) => resolveUploadUrl(photo.fileUrl)),
          ...(splId == null
            ? []
            : splPhotoRows
                .filter((photo) => photo.overtimeCommandLetterId === splId)
                .map((photo) => resolveUploadUrl(photo.fileUrl))),
        ].filter(Boolean)
      )
    )
    const requester =
      requesterMap.get(
        row.activityEmployeeId ?? row.requesterEmployeeId ?? apd?.employeeId ?? -1
      ) ?? null
    const site =
      siteMap.get(row.activitySiteId ?? row.submissionSiteId ?? apd?.siteId ?? -1) ?? null
    const effectiveStartTime =
      row.startTime ??
      spl?.plannedStartAt ??
      parseSnapshotDate(preview.plannedStartAt) ??
      row.submissionSubmittedAt ??
      apd?.requestDate ??
      row.submissionCreatedAt ??
      row.submittedAt
    const effectiveEndTime =
      row.endTime ??
      spl?.plannedEndAt ??
      parseSnapshotDate(preview.plannedEndAt) ??
      row.submissionSubmittedAt ??
      apd?.requestDate ??
      row.submissionCreatedAt ??
      row.submittedAt
    const effectiveCreatedAt =
      row.createdAt ??
      row.submissionCreatedAt ??
      apd?.requestDate ??
      row.submissionSubmittedAt ??
      row.submittedAt
    const requestId =
      row.approvalActivityId ?? row.submissionId ?? row.apdRequestId ?? row.approvalId
    const titleFromSnapshot =
      typeof preview.title === 'string'
        ? preview.title
        : typeof payload.title === 'string'
          ? payload.title
          : null
    const summaryFromSnapshot =
      typeof preview.summary === 'string'
        ? preview.summary
        : typeof payload.reason === 'string'
          ? payload.reason
          : null
    const priorityFromSnapshot = typeof payload.priority === 'string' ? payload.priority : null
    const unitNumberFromSnapshot =
      typeof payload.unitNumber === 'string' ? payload.unitNumber : null
    const siteNameFromSnapshot =
      typeof preview.siteName === 'string'
        ? preview.siteName
        : typeof payload.siteName === 'string'
          ? payload.siteName
          : null

    const requestStatus = row.activityStatus ?? row.submissionStatus ?? apd?.status ?? 'pending'
    const effectiveActivityType =
      row.approvalActivityId != null
        ? (row.activityType ?? 'Daily Activity')
        : row.submissionId != null
          ? (row.templateName ?? 'Workflow')
          : row.apdRequestId != null ? 'Request APD' : row.repairFormWoId != null ? 'Work Order' : 'Unknown'
    const currentRepairWo = row.repairFormWoId ? (repairWoMap.get(row.repairFormWoId) ?? null) : null

    const title =
      spl?.title ??
      (row.repairFormWoId != null ? (currentRepairWo ? `WO ${currentRepairWo.jenisPengajuan ?? 'Unknown'} - ${currentRepairWo.noPengajuan ?? 'Draft'}` : 'WO - Data Hilang') : null) ??
      titleFromSnapshot ??
      (row.apdRequestId != null
        ? `Request APD - ${apd?.requestNumber ?? row.requestNumber ?? ''}`
        : row.approvalActivityId != null
          ? `Daily Activity - ${row.activityCode ?? ''}`
          : `Workflow - ${row.templateName ?? ''}`)

    return {
      approvalId: row.approvalId,
      activityId: requestId,
      submissionId: row.submissionId,
      requestNumber: spl?.splNumber ?? row.requestNumber,
      formName:
        row.templateName ?? (row.approvalActivityId ? 'Daily Activity' : 'Workflow Request'),
      approvalStepId: row.approvalStepId,
      level: row.level,
      status: row.status,
      approverName: row.approverName,
      approverEmployeeId: row.approverEmployeeId,
      submittedAt: row.submittedAt,
      reviewedAt: row.reviewedAt,
      overtimeMinutes:
        row.overtimeMinutes ||
        Math.max(
          0,
          Math.round((effectiveEndTime.getTime() - effectiveStartTime.getTime()) / 60_000)
        ),
      resolutionSource: row.resolutionSource,
      routeSnapshot: row.routeSnapshot,
      decisionNote: row.decisionNote,
      activityCode:
        spl?.splNumber ??
        row.activityCode ??
        row.requestNumber ??
        `REQ-${String(requestId).padStart(5, '0')}`,
      activityType: effectiveActivityType,
      activityTitle: title,
      unitNumber:
        ((row.repairFormWoId != null ? (currentRepairWo?.tireSn || currentRepairWo?.idWo || '-') : null) ??
        (row.unitNumber ??
          unitNumberFromSnapshot ??
          Array.from(
            new Set(workItems.map((item) => item.unitNumber).filter((value) => value !== '-'))
          ).join(', '))) ||
        '-',
      tireCount: (row as any).tireCount ?? (typeof payload.tireCount === 'number' ? payload.tireCount : parseInt(String(payload.tireCount || 0), 10) || 0),
      activityStatus: requestStatus,
      priority: row.priority ?? priorityFromSnapshot ?? 'Normal',
      remarks: spl?.requestNotes || row.remarks || summaryFromSnapshot || '',
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      createdAt: effectiveCreatedAt,
      requesterName: (currentRepairWo?.pemohon || requester?.name) ?? 'Unknown Requester',
      requesterEmail: requester?.email ?? '',
      requesterDepartment: requester?.department ?? '',
      requesterSection: requester?.section ?? '',
      requesterJobTitle: requester?.jobTitle ?? (currentRepairWo ? 'Pemohon WO' : ''),
      siteName: (currentRepairWo?.site || site?.name) ?? siteNameFromSnapshot ?? '-',
      photoUrl: photoUrls[0] ?? null,
      requestKindLabel:
        spl?.origin === 'employee_request' ? 'Pengajuan' : spl ? 'Perintah' : effectiveActivityType,
      description: spl?.requestNotes || summaryFromSnapshot || row.remarks || '-',
      dailyActivityStatus:
        sessions.length === 0
          ? 'Belum diupdate'
          : sessions.every((session) => ['submitted', 'approved'].includes(session.status))
            ? 'Sudah disubmit'
            : 'Draft / sedang dikerjakan',
      evidenceProgressPercent:
        workItems.length === 0
          ? photoUrls.length > 0
            ? 100
            : 0
          : Math.round(
              (workItems.filter((item) => item.isChecked).length / workItems.length) * 100
            ),
      evidencePhotoUrls: photoUrls,
      workItems,
      repairFormWo: currentRepairWo,
      signatureUrl: row.signatureUrl ?? null,
    } satisfies ApprovalRecordRow
  })
}

function getSlaHours(row: ApprovalRecordRow, route: ApprovalRouteResolution | null) {
  const steps = Array.isArray(route?.steps) ? route.steps : []
  const matchedStep =
    steps.find(
      (step) =>
        step.stepOrder === row.level &&
        (row.approvalStepId == null || step.approvalMatrixStepId === row.approvalStepId)
    ) ?? null

  return matchedStep?.slaHours ?? (route as any)?.slaHours ?? 24
}

function getCurrentStepLabel(row: ApprovalRecordRow, route: ApprovalRouteResolution | null) {
  const steps = Array.isArray(route?.steps) ? route.steps : []
  const matchedStep =
    steps.find(
      (step) =>
        step.stepOrder === row.level &&
        (row.approvalStepId == null || step.approvalMatrixStepId === row.approvalStepId)
    ) ?? null

  if (matchedStep?.label) {
    return matchedStep.label
  }

  if (typeof (route as any)?.label === 'string' && (route as any).label.trim()) {
    return (route as any).label.trim()
  }

  if (typeof (route as any)?.nodeLabel === 'string' && (route as any).nodeLabel.trim()) {
    return (route as any).nodeLabel.trim()
  }

  return `Level ${row.level} Review`
}

function enrichApprovalRow(row: ApprovalRecordRow, now: Date): ApprovalQueueItem {
  const route = parseApprovalRouteSnapshot(row.routeSnapshot)
  const slaHours = getSlaHours(row, route)
  const dueAt = new Date(row.submittedAt.getTime() + slaHours * 60 * 60 * 1000)
  const isPending = row.status === 'pending'
  const timeLeft = dueAt.getTime() - now.getTime()

  let dueState: ApprovalQueueItem['dueState'] = 'closed'
  if (isPending) {
    if (timeLeft < 0) {
      dueState = 'overdue'
    } else if (timeLeft <= 6 * 60 * 60 * 1000) {
      dueState = 'due_soon'
    } else {
      dueState = 'on_track'
    }
  }

  return {
    ...row,
    dueAt,
    dueState,
    slaHours,
    route,
    currentStepLabel: getCurrentStepLabel(row, route),
    commentsCount: parseApprovalNoteEntries(row.decisionNote, row.approverName).length,
    isPending,
  }
}

function buildApprovalComments(rows: ApprovalQueueItem[]) {
  if (rows.length === 0) {
    return [] as ApprovalComment[]
  }

  const [seedRow] = rows
  const comments: ApprovalComment[] = []

  comments.push({
    id: `request-${seedRow.activityId}`,
    at: seedRow.createdAt,
    actor: seedRow.requesterName,
    role: seedRow.requesterJobTitle,
    kind: 'submitted',
    message: seedRow.remarks || `${seedRow.activityType} diajukan untuk direview.`,
  })

  for (const row of rows) {
    const notes = parseApprovalNoteEntries(row.decisionNote, row.approverName)
    for (const [index, note] of notes.entries()) {
      comments.push({
        id: `approval-${row.approvalId}-${index}`,
        at: note.at ? new Date(note.at) : (row.reviewedAt ?? row.submittedAt),
        actor: note.actor,
        role: `Step ${row.level} • ${row.currentStepLabel}`,
        kind: note.kind,
        message: note.message,
      })
    }
  }

  return comments.sort((left, right) => right.at.getTime() - left.at.getTime())
}

function buildApprovalTimeline(rows: ApprovalQueueItem[]) {
  if (rows.length === 0) {
    return [] as ApprovalTimelineItem[]
  }

  const [seedRow] = rows
  const timeline: ApprovalTimelineItem[] = [
    {
      id: `activity-created-${seedRow.activityId}`,
      at: seedRow.createdAt,
      label: 'Request dibuat',
      detail: `${seedRow.requesterName} mengirim ${seedRow.activityType} • ${seedRow.activityTitle}`,
      tone: 'submitted',
    },
  ]

  for (const row of rows) {
    timeline.push({
      id: `approval-assigned-${row.approvalId}`,
      at: row.submittedAt,
      label: `Step ${row.level} masuk inbox`,
      detail: `${row.currentStepLabel} dialokasikan ke ${row.approverName}`,
      tone: row.dueState === 'overdue' ? 'overdue' : row.status,
    })

    const notes = parseApprovalNoteEntries(row.decisionNote, row.approverName)
    for (const [index, note] of notes.entries()) {
      timeline.push({
        id: `approval-note-${row.approvalId}-${index}`,
        at: note.at ? new Date(note.at) : (row.reviewedAt ?? row.submittedAt),
        label: `${note.actor} • ${note.kind.replaceAll('_', ' ')}`,
        detail: note.message,
        tone: note.kind,
      })
    }

    if (row.reviewedAt && notes.length === 0 && row.status !== 'pending') {
      timeline.push({
        id: `approval-reviewed-${row.approvalId}`,
        at: row.reviewedAt,
        label: `Step ${row.level} ${row.status.replaceAll('_', ' ')}`,
        detail: `${row.approverName} menyelesaikan ${row.currentStepLabel}`,
        tone: row.status,
      })
    }
  }

  return timeline.sort((left, right) => right.at.getTime() - left.at.getTime())
}

function buildWorkflowPreview(rows: ApprovalQueueItem[]) {
  if (rows.length === 0) {
    return {
      matrixName: null as string | null,
      structureName: null as string | null,
      warnings: [] as string[],
      steps: [] as Array<{
        stepOrder: number
        label: string
        approverName: string
        resolutionSource: string
        slaHours: number
        fallbackLabel: string | null
        escalationLabel: string | null
        status: string
      }>,
    }
  }

  const [seedRow] = rows
  const route = seedRow.route

  if (!route || !Array.isArray(route.steps)) {
    return {
      matrixName: (route as any)?.matrixName ?? null,
      structureName: (route as any)?.structureName ?? null,
      warnings: [
        'Snapshot route tidak tersedia. Workflow ditampilkan dari approval item yang sudah tercatat.',
      ],
      steps: rows
        .slice()
        .sort((left, right) => left.level - right.level)
        .map((row) => ({
          stepOrder: row.level,
          label: row.currentStepLabel,
          approverName: row.approverName,
          resolutionSource: row.resolutionSource,
          slaHours: row.slaHours,
          fallbackLabel: null,
          escalationLabel: null,
          status: row.status,
        })),
    }
  }

  return {
    matrixName: route.matrixName,
    structureName: route.structureName,
    warnings: route.warnings,
    steps: route.steps.map((step) => {
      const matchedApproval =
        rows.find(
          (row) =>
            row.level === step.stepOrder &&
            (step.approvalMatrixStepId == null || row.approvalStepId === step.approvalMatrixStepId)
        ) ?? null

      return {
        stepOrder: step.stepOrder,
        label: step.label,
        approverName: step.approverName,
        resolutionSource: step.resolutionSource,
        slaHours: step.slaHours,
        fallbackLabel: step.fallbackLabel,
        escalationLabel: step.escalationLabel,
        status: matchedApproval?.status ?? 'waiting',
      }
    }),
  }
}

async function fetchApprovalRows() {
  const rawRows = await db
    .select({
      approvalId: approvals.id,
      approvalActivityId: approvals.activityId,
      submissionId: approvals.submissionId,
      approvalStepId: approvals.approvalStepId,
      level: approvals.level,
      status: approvals.status,
      approverName: approvals.approverName,
      approverEmployeeId: approvals.approverEmployeeId,
      submittedAt: approvals.submittedAt,
      reviewedAt: approvals.reviewedAt,
      overtimeMinutes: approvals.overtimeMinutes,
      resolutionSource: approvals.resolutionSource,
      routeSnapshot: approvals.routeSnapshot,
      decisionNote: approvals.decisionNote,
      activityCode: activities.activityCode,
      activityType: activities.activityType,
      activityTitle: activities.title,
      unitNumber: activities.unitNumber,
      equipmentNo: activities.equipmentNo,
      tireCount: activities.tireCount,
      activityStatus: activities.status,
      priority: activities.priority,
      remarks: activities.remarks,
      startTime: activities.startTime,
      endTime: activities.endTime,
      createdAt: activities.createdAt,
      activityEmployeeId: activities.employeeId,
      activitySiteId: activities.siteId,
      requesterEmployeeId: formSubmissions.requesterEmployeeId,
      submissionSiteId: formSubmissions.siteId,
      requestNumber: formSubmissions.requestNumber,
      submissionStatus: formSubmissions.requestStatus,
      payloadSnapshot: formSubmissions.payloadSnapshot,
      previewSnapshot: formSubmissions.previewSnapshot,
      submissionCreatedAt: formSubmissions.createdAt,
      submissionSubmittedAt: formSubmissions.submittedAt,
      templateName: formTemplates.name,
      templateKey: formTemplates.templateKey,
      apdRequestId: approvals.apdRequestId,
      repairFormWoId: approvals.repairFormWoId,
      signatureUrl: approvals.signatureUrl,
    })
    .from(approvals)
    .leftJoin(activities, eq(approvals.activityId, activities.id))
    .leftJoin(formSubmissions, eq(approvals.submissionId, formSubmissions.id))
    .leftJoin(formTemplates, eq(formSubmissions.templateId, formTemplates.id))
    .orderBy(desc(approvals.submittedAt), desc(approvals.id))

  return normalizeApprovalRows(rawRows)
}

async function fetchApprovalRowsForUser(
  email: string,
  currentEmployee: { id: number; name: string } | null
) {
  const normalizedEmail = normalizeMatchValue(email)
  const normalizedEmployeeName = normalizeMatchValue(currentEmployee?.name)
  const rows = await fetchApprovalRows()

  return rows
    .filter((row) => {
      if (normalizeMatchValue(row.requesterEmail) === normalizedEmail) {
        return true
      }

      if (currentEmployee?.id != null && row.approverEmployeeId === currentEmployee.id) {
        return true
      }

      if (
        normalizedEmployeeName &&
        normalizeMatchValue(row.approverName) === normalizedEmployeeName
      ) {
        return true
      }

      return false
    })
    .slice(0, 240)
}

export async function getApprovalWorkbenchData() {
  await ensureHeroSeedData()

  const now = new Date()
  const { start: startOfToday, end: endOfToday } = getTodayWindow(now)
  const approvalRows = await fetchApprovalRows()
  const queue = approvalRows
    .map((row) => enrichApprovalRow(row, now))
    .sort((left, right) => {
      if (left.isPending !== right.isPending) {
        return left.isPending ? -1 : 1
      }

      if (left.dueState !== right.dueState) {
        const rank: Record<ApprovalQueueItem['dueState'], number> = {
          overdue: 0,
          due_soon: 1,
          on_track: 2,
          closed: 3,
        }
        return rank[left.dueState] - rank[right.dueState]
      }

      return right.submittedAt.getTime() - left.submittedAt.getTime()
    })

  const distinctRequestStatuses = new Map<number, string>()
  for (const item of queue) {
    if (!distinctRequestStatuses.has(item.activityId)) {
      distinctRequestStatuses.set(item.activityId, mapRequestStatus(item.activityStatus))
    }
  }

  const focusItem = queue.find((item) => item.isPending) ?? queue[0] ?? null
  const relatedApprovals = focusItem
    ? queue
        .filter((item) => item.activityId === focusItem.activityId)
        .sort((left, right) => left.level - right.level || left.approvalId - right.approvalId)
    : []
  const [focusSubmission] =
    focusItem == null
      ? [null]
      : await db
          .select({
            id: formSubmissions.id,
            requestNumber: formSubmissions.requestNumber,
          })
          .from(formSubmissions)
          .where(
            focusItem.submissionId != null
              ? eq(formSubmissions.id, focusItem.submissionId)
              : eq(formSubmissions.legacyActivityId, focusItem.activityId)
          )
          .orderBy(desc(formSubmissions.updatedAt), desc(formSubmissions.id))
          .limit(1)
  const focusAttachments =
    focusSubmission == null
      ? []
      : await db
          .select({
            id: approvalAttachments.id,
            attachmentKind: approvalAttachments.attachmentKind,
            fileName: approvalAttachments.fileName,
            mimeType: approvalAttachments.mimeType,
            fileUrl: approvalAttachments.fileUrl,
            createdAt: approvalAttachments.createdAt,
          })
          .from(approvalAttachments)
          .where(eq(approvalAttachments.submissionId, focusSubmission.id))
          .orderBy(desc(approvalAttachments.createdAt), desc(approvalAttachments.id))

  return {
    metrics: {
      totalApprovals: queue.length,
      pendingApprovals: queue.filter((item) => item.isPending).length,
      dueSoon: queue.filter((item) => item.dueState === 'due_soon').length,
      overdue: queue.filter((item) => item.dueState === 'overdue').length,
      needsRevision: Array.from(distinctRequestStatuses.values()).filter(
        (status) => status === 'needs_revision'
      ).length,
      approvedToday: queue.filter(
        (item) =>
          item.status === 'approved' &&
          item.reviewedAt != null &&
          item.reviewedAt >= startOfToday &&
          item.reviewedAt < endOfToday
      ).length,
    },
    queue,
    focus:
      focusItem == null
        ? null
        : {
            approvalId: focusItem.approvalId,
            activityId: focusItem.activityId,
            requestNumber: focusSubmission?.requestNumber ?? null,
            title: focusItem.activityTitle,
            formName: focusItem.formName,
            activityType: focusItem.activityType,
            requesterName: focusItem.requesterName,
            requesterJobTitle: focusItem.requesterJobTitle,
            requesterDepartment: focusItem.requesterDepartment,
            requesterSection: focusItem.requesterSection,
            siteName: focusItem.siteName,
            unitNumber: focusItem.unitNumber,
            priority: focusItem.priority,
            overtimeLabel: minutesToHours(focusItem.overtimeMinutes),
            shiftLabel: getShiftLabel(focusItem.startTime),
            startTime: focusItem.startTime,
            endTime: focusItem.endTime,
            currentStepLabel: focusItem.currentStepLabel,
            currentApprover: focusItem.approverName,
            dueAt: focusItem.dueAt,
            dueState: focusItem.dueState,
            activityStatus: focusItem.activityStatus,
            previewFields: [
              { label: 'Tanggal kerja', value: focusItem.startTime.toLocaleDateString('id-ID') },
              { label: 'Shift', value: getShiftLabel(focusItem.startTime) },
              { label: 'Site', value: focusItem.siteName },
              { label: 'Department', value: focusItem.requesterDepartment || '-' },
              { label: 'Section', value: focusItem.requesterSection || '-' },
              { label: 'Unit / Area', value: focusItem.unitNumber },
              { label: 'Jenis pengajuan', value: focusItem.activityType },
              { label: 'Ringkasan', value: focusItem.activityTitle },
              { label: 'Start', value: focusItem.startTime.toLocaleString('id-ID') },
              { label: 'End', value: focusItem.endTime.toLocaleString('id-ID') },
              { label: 'Overtime', value: minutesToHours(focusItem.overtimeMinutes) },
              { label: 'Remark', value: focusItem.remarks || '-' },
            ],
            attachments: focusAttachments,
            comments: buildApprovalComments(relatedApprovals),
            timeline: buildApprovalTimeline(relatedApprovals),
            workflow: buildWorkflowPreview(relatedApprovals),
          },
  }
}

function normalizeMatchValue(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function getDateKey(value: Date) {
  return `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, '0')}-${`${value.getDate()}`.padStart(2, '0')}`
}

function formatDateLabel(value: Date) {
  return value.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatTimeRange(startTime: Date, endTime: Date) {
  return `${startTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${endTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

function formatLastDecision(notes: ApprovalComment[]) {
  const latestDecision =
    notes.find((note) => ['approved', 'rejected', 'needs_correction'].includes(note.kind)) ??
    notes[0] ??
    null

  return latestDecision?.message ?? 'Belum ada keputusan akhir.'
}

async function getEmployeeByEmail(email: string) {
  const normalized = email.trim().toLowerCase()
  if (normalized === 'andirivlni@gmail.com') {
    const [annas] = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        jobTitle: employees.jobTitle,
      })
      .from(employees)
      .where(eq(employees.id, 5))
      .limit(1)
    if (annas) return annas
  }

  const [employee] = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      jobTitle: employees.jobTitle,
    })
    .from(employees)
    .leftJoin(authUser, eq(employees.authUserId, authUser.id))
    .where(
      or(
        sql`lower(${employees.email}) = ${normalized}`,
        sql`lower(${authUser.email}) = ${normalized}`
      )
    )
    .limit(1)

  return employee ?? null
}

function getContractReviewDueState(contractEndDate: Date, now: Date) {
  const diffMs = contractEndDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 7) return 'due_soon'
  return 'open'
}

async function getContractReviewInboxItems(
  email: string,
  currentEmployee: Awaited<ReturnType<typeof getEmployeeByEmail>>
) {
  const normalizedEmail = normalizeMatchValue(email)
  const normalizedEmployeeName = normalizeMatchValue(currentEmployee?.name)
  const rows = await db
    .select({
      approvalId: hcContractReviewApprovals.id,
      approvalToken: hcContractReviewApprovals.approvalToken,
      approverName: hcContractReviewApprovals.approverName,
      approverEmail: hcContractReviewApprovals.approverEmail,
      approverEmployeeId: hcContractReviewApprovals.approverEmployeeId,
      approverRole: hcContractReviewApprovals.approverRole,
      stepOrder: hcContractReviewApprovals.stepOrder,
      createdAt: hcContractReviewApprovals.createdAt,
      reviewId: hcEmployeeContractReviews.id,
      employeeName: hcEmployeeContractReviews.employeeNameStr,
      reviewType: hcEmployeeContractReviews.reviewType,
      contractEndDate: hcEmployeeContractReviews.contractEndDate,
      updatedAt: hcEmployeeContractReviews.updatedAt,
    })
    .from(hcContractReviewApprovals)
    .innerJoin(
      hcEmployeeContractReviews,
      eq(hcContractReviewApprovals.reviewId, hcEmployeeContractReviews.id)
    )
    .where(eq(hcContractReviewApprovals.status, 'pending'))
    .orderBy(desc(hcContractReviewApprovals.createdAt))

  return rows
    .filter((row) => {
      const emailMatches =
        normalizedEmail && normalizeMatchValue(row.approverEmail) === normalizedEmail
      const employeeMatches =
        currentEmployee?.id != null && row.approverEmployeeId === currentEmployee.id
      const nameMatches =
        normalizedEmployeeName && normalizeMatchValue(row.approverName) === normalizedEmployeeName
      return emailMatches || employeeMatches || nameMatches
    })
    .map((row) => {
      const contractEnd = row.contractEndDate
        ? new Date(`${row.contractEndDate}T00:00:00`)
        : row.createdAt
      return {
        id: `contract-review-${row.approvalId}`,
        approvalId: row.approvalId,
        reviewId: row.reviewId,
        title: `Contract Review - ${row.employeeName || 'Employee'}`,
        employeeName: row.employeeName || 'Employee',
        reviewType: row.reviewType || 'contract',
        approverName: row.approverName,
        approverRole: row.approverRole,
        stepLabel: `Step ${row.stepOrder}`,
        submittedAt: row.updatedAt ?? row.createdAt,
        dueAt: contractEnd,
        dueState: getContractReviewDueState(contractEnd, new Date()),
        url: `/review/${row.approvalToken}`,
      }
    })
}

export async function getApprovalCenterData(email: string) {
  const now = new Date()
  const currentEmployee = await getEmployeeByEmail(email)
  const approvalRows = await fetchApprovalRowsForUser(email, currentEmployee)
  const contractReviewInboxItems = await getContractReviewInboxItems(email, currentEmployee)
  const queue = approvalRows
    .map((row) => enrichApprovalRow(row, now))
    .sort((left, right) => right.submittedAt.getTime() - left.submittedAt.getTime())

  const normalizedEmail = normalizeMatchValue(email)
  const normalizedEmployeeName = normalizeMatchValue(currentEmployee?.name)

  const inboxRows = queue.filter(
    (item) =>
      item.isPending &&
      ((currentEmployee?.id != null && item.approverEmployeeId === currentEmployee.id) ||
        (normalizedEmployeeName &&
          normalizeMatchValue(item.approverName) === normalizedEmployeeName))
  )

  const inboxGroupsMap = new Map<
    string,
    {
      id: string
      requesterName: string
      requesterJobTitle: string
      requesterEmail: string
      siteName: string
      workDate: Date
      workDateLabel: string
      activityCount: number
      dueSoonCount: number
      overdueCount: number
      totalOvertimeMinutes: number
      items: Array<{
        approvalId: number
        activityId: number
        level: number
        requestNumber: string | null
        title: string
        activityType: string
        unitNumber: string
        equipmentNo?: string
        tireCount?: number
        priority: string
        currentStepLabel: string
        remarks: string
        submittedAt: Date
        dueAt: Date
        dueState: ApprovalQueueItem['dueState']
        timeRange: string
        shiftLabel: string
        overtimeLabel: string
        requesterName: string
        requesterJobTitle: string
        siteName: string
        notes: ApprovalComment[]
        lastNote: ApprovalComment | null
        photoUrl: string | null
        requestKindLabel: string
        description: string
        startTime: Date
        endTime: Date
        dailyActivityStatus: string
        evidenceProgressPercent: number
        evidencePhotoUrls: string[]
        workItems: ApprovalRecordRow['workItems']
        repairFormWo?: typeof repairFormWo.$inferSelect | null
        signatureUrl?: string | null
      }>
    }
  >()

  for (const item of inboxRows) {
    const groupKey = `${normalizeMatchValue(item.requesterEmail)}:${getDateKey(item.startTime)}`
    const notes = buildApprovalComments([item])
    const group = inboxGroupsMap.get(groupKey) ?? {
      id: groupKey,
      requesterName: item.requesterName,
      requesterJobTitle: item.requesterJobTitle,
      requesterEmail: item.requesterEmail,
      siteName: item.siteName,
      workDate: item.startTime,
      workDateLabel: formatDateLabel(item.startTime),
      activityCount: 0,
      dueSoonCount: 0,
      overdueCount: 0,
      totalOvertimeMinutes: 0,
      items: [],
    }

    group.activityCount += 1
    group.totalOvertimeMinutes += item.overtimeMinutes
    if (item.dueState === 'due_soon') {
      group.dueSoonCount += 1
    }
    if (item.dueState === 'overdue') {
      group.overdueCount += 1
    }
    group.items.push({
      approvalId: item.approvalId,
      activityId: item.activityId,
      level: item.level,
      requestNumber: item.requestNumber,
      title: item.activityTitle,
      activityType: item.activityType,
      unitNumber: item.unitNumber,
      equipmentNo: (item as any).equipmentNo ?? item.unitNumber,
      tireCount: (item as any).tireCount ?? 0,
      priority: item.priority,
      currentStepLabel: item.currentStepLabel,
      remarks: item.remarks,
      submittedAt: item.submittedAt,
      dueAt: item.dueAt,
      dueState: item.dueState,
      timeRange: formatTimeRange(item.startTime, item.endTime),
      shiftLabel: getShiftLabel(item.startTime),
      overtimeLabel: minutesToHours(item.overtimeMinutes),
      requesterName: item.requesterName,
      requesterJobTitle: item.requesterJobTitle,
      siteName: item.siteName,
      notes,
      lastNote: notes[0] ?? null,
      photoUrl: item.photoUrl,
      requestKindLabel: item.requestKindLabel,
      description: item.description,
      startTime: item.startTime,
      endTime: item.endTime,
      dailyActivityStatus: item.dailyActivityStatus,
      evidenceProgressPercent: item.evidenceProgressPercent,
      evidencePhotoUrls: item.evidencePhotoUrls,
      workItems: item.workItems,
      repairFormWo: item.repairFormWo ?? null,
      signatureUrl: item.signatureUrl ?? null,
    })
    inboxGroupsMap.set(groupKey, group)
  }

  const inboxGroups = Array.from(inboxGroupsMap.values())
    .map((group) => ({
      ...group,
      totalOvertimeLabel: minutesToHours(group.totalOvertimeMinutes),
      items: group.items.sort(
        (left, right) => right.submittedAt.getTime() - left.submittedAt.getTime()
      ),
    }))
    .sort((left, right) => right.workDate.getTime() - left.workDate.getTime())

  const requestActivityMap = new Map<number, ApprovalQueueItem[]>()
  for (const item of queue) {
    if (normalizeMatchValue(item.requesterEmail) !== normalizedEmail) {
      continue
    }

    const current = requestActivityMap.get(item.activityId) ?? []
    current.push(item)
    requestActivityMap.set(item.activityId, current)
  }

  const historyGroupsMap = new Map<
    string,
    {
      id: string
      workDate: Date
      workDateLabel: string
      activityCount: number
      approvedCount: number
      rejectedCount: number
      revisionCount: number
      pendingCount: number
      items: Array<{
        activityId: number
        title: string
        activityType: string
        unitNumber: string
        siteName: string
        priority: string
        status: string
        statusLabel: string
        submittedAt: Date
        timeRange: string
        shiftLabel: string
        pendingWith: string
        currentStepLabel: string
        workflowLabel: string
        lastDecision: string
        notes: ApprovalComment[]
        steps: Array<{
          approvalId: number
          approverName: string
          level: number
          label: string
          status: string
          reviewedAt: Date | null
        }>
      }>
    }
  >()

  for (const relatedRows of requestActivityMap.values()) {
    const sortedRows = relatedRows
      .slice()
      .sort((left, right) => left.level - right.level || left.approvalId - right.approvalId)
    const seed = sortedRows[0]
    const currentPending = sortedRows.find((item) => item.status === 'pending') ?? null
    const latestApproval = sortedRows[sortedRows.length - 1] ?? null
    const notes = buildApprovalComments(sortedRows)
    const status = mapRequestStatus(seed.activityStatus)
    const groupKey = getDateKey(seed.startTime)
    const group = historyGroupsMap.get(groupKey) ?? {
      id: groupKey,
      workDate: seed.startTime,
      workDateLabel: formatDateLabel(seed.startTime),
      activityCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      revisionCount: 0,
      pendingCount: 0,
      items: [],
    }

    group.activityCount += 1
    if (status === 'approved') {
      group.approvedCount += 1
    } else if (status === 'rejected') {
      group.rejectedCount += 1
    } else if (status === 'needs_revision') {
      group.revisionCount += 1
    } else {
      group.pendingCount += 1
    }

    group.items.push({
      activityId: seed.activityId,
      title: seed.activityTitle,
      activityType: seed.activityType,
      unitNumber: seed.unitNumber,
      siteName: seed.siteName,
      priority: seed.priority,
      status,
      statusLabel: seed.activityStatus,
      submittedAt: seed.createdAt,
      timeRange: formatTimeRange(seed.startTime, seed.endTime),
      shiftLabel: getShiftLabel(seed.startTime),
      pendingWith: currentPending?.approverName ?? latestApproval?.approverName ?? '-',
      currentStepLabel: currentPending?.currentStepLabel ?? latestApproval?.currentStepLabel ?? '-',
      workflowLabel:
        currentPending?.route?.matrixName ??
        latestApproval?.route?.matrixName ??
        'Workflow Activity',
      lastDecision: formatLastDecision(notes),
      notes,
      steps: sortedRows.map((row) => ({
        approvalId: row.approvalId,
        approverName: row.approverName,
        level: row.level,
        label: row.currentStepLabel,
        status: row.status,
        reviewedAt: row.reviewedAt,
      })),
    })

    historyGroupsMap.set(groupKey, group)
  }

  const historyGroups = Array.from(historyGroupsMap.values())
    .map((group) => ({
      ...group,
      items: group.items.sort(
        (left, right) => right.submittedAt.getTime() - left.submittedAt.getTime()
      ),
    }))
    .sort((left, right) => right.workDate.getTime() - left.workDate.getTime())

  const historyItems = historyGroups.flatMap((group) => group.items)

  return {
    currentUserName: currentEmployee?.name ?? email,
    inboxMetrics: {
      pendingGroups: inboxGroups.length + contractReviewInboxItems.length,
      pendingActivities: inboxRows.length + contractReviewInboxItems.length,
      dueSoon:
        inboxRows.filter((item) => item.dueState === 'due_soon').length +
        contractReviewInboxItems.filter((item) => item.dueState === 'due_soon').length,
      overdue:
        inboxRows.filter((item) => item.dueState === 'overdue').length +
        contractReviewInboxItems.filter((item) => item.dueState === 'overdue').length,
    },
    historyMetrics: {
      total: historyItems.length,
      approved: historyItems.filter((item) => item.status === 'approved').length,
      rejected: historyItems.filter((item) => item.status === 'rejected').length,
      needsRevision: historyItems.filter((item) => item.status === 'needs_revision').length,
      inReview: historyItems.filter(
        (item) => item.status === 'in_review' || item.status === 'submitted'
      ).length,
    },
    contractReviewInboxItems,
    inboxGroups,
    historyGroups,
  }
}

export async function getRequestCenterData(email?: string) {
  await ensureHeroSeedData()

  const activitiesRows = await db
    .select({
      id: activities.id,
      activityCode: activities.activityCode,
      activityType: activities.activityType,
      title: activities.title,
      unitNumber: activities.unitNumber,
      status: activities.status,
      priority: activities.priority,
      startTime: activities.startTime,
      endTime: activities.endTime,
      remarks: activities.remarks,
      createdAt: activities.createdAt,
      requesterId: employees.id,
      requesterName: employees.name,
      requesterEmail: employees.email,
      requesterJobTitle: employees.jobTitle,
      siteName: sites.name,
    })
    .from(activities)
    .innerJoin(employees, eq(activities.employeeId, employees.id))
    .innerJoin(sites, eq(activities.siteId, sites.id))
    .orderBy(desc(activities.createdAt), desc(activities.id))

  const approvalRows = (await fetchApprovalRows()).map((row) => enrichApprovalRow(row, new Date()))
  const filteredActivities = email
    ? activitiesRows.filter(
        (row) => row.requesterEmail.toLowerCase() === email.trim().toLowerCase()
      )
    : activitiesRows

  const activityRequests = filteredActivities.map((activity) => {
    const relatedApprovals = approvalRows
      .filter((approval) => approval.activityId === activity.id)
      .sort((left, right) => left.level - right.level || left.approvalId - right.approvalId)
    const currentPending =
      relatedApprovals.find((approval) => approval.status === 'pending') ?? null
    const latestApproval = relatedApprovals[relatedApprovals.length - 1] ?? null
    const route = currentPending?.route ?? latestApproval?.route ?? null

    return {
      activityId: activity.id,
      requestNumber: null as string | null,
      formName: 'Daily Activity',
      activityCode: activity.activityCode,
      title: activity.title,
      activityType: activity.activityType,
      unitNumber: activity.unitNumber,
      requesterName: activity.requesterName,
      requesterJobTitle: activity.requesterJobTitle,
      siteName: activity.siteName,
      priority: activity.priority,
      status: mapRequestStatus(activity.status),
      activityStatus: activity.status,
      submissionId: null as number | null,
      submittedAt: activity.createdAt,
      lastUpdatedAt:
        currentPending?.submittedAt ??
        latestApproval?.reviewedAt ??
        latestApproval?.submittedAt ??
        activity.createdAt,
      pendingWith: currentPending?.approverName ?? '-',
      currentStepLabel: currentPending?.currentStepLabel ?? latestApproval?.currentStepLabel ?? '-',
      progressLabel: Array.isArray(route?.steps) && route.steps.length > 0
        ? `${relatedApprovals.filter((item) => item.status === 'approved').length}/${route.steps.length} step`
        : `${relatedApprovals.filter((item) => item.status === 'approved').length} step`,
      workflowLabel: route?.matrixName ?? 'Legacy fallback',
      canCancel: false,
    }
  })

  const draftRows = await db
    .select({
      submissionId: formSubmissions.id,
      activityId: formSubmissions.legacyActivityId,
      requestStatus: formSubmissions.requestStatus,
      requestNumber: formSubmissions.requestNumber,
      submittedAt: formSubmissions.submittedAt,
      cancelledAt: formSubmissions.cancelledAt,
      createdAt: formSubmissions.createdAt,
      updatedAt: formSubmissions.updatedAt,
      requesterName: employees.name,
      requesterEmail: employees.email,
      requesterJobTitle: employees.jobTitle,
      siteName: sites.name,
      formName: formTemplates.name,
      payloadSnapshot: formSubmissions.payloadSnapshot,
    })
    .from(formSubmissions)
    .innerJoin(formTemplates, eq(formSubmissions.templateId, formTemplates.id))
    .innerJoin(employees, eq(formSubmissions.requesterEmployeeId, employees.id))
    .leftJoin(sites, eq(formSubmissions.siteId, sites.id))
    .where(isNull(formSubmissions.legacyActivityId))
    .orderBy(desc(formSubmissions.updatedAt), desc(formSubmissions.id))

  const filteredDraftRows = email
    ? draftRows.filter((row) => row.requesterEmail.toLowerCase() === email.trim().toLowerCase())
    : draftRows

  const draftRequests = filteredDraftRows.map((row) => {
    const payload = JSON.parse(row.payloadSnapshot || '{}') as Record<string, string>
    const requestStatus = row.requestStatus
    const pendingWithLabel =
      requestStatus === 'draft'
        ? 'Requester workspace'
        : requestStatus === 'in_review'
          ? 'Approval Inbox'
          : requestStatus === 'needs_revision'
            ? 'Requester revision'
            : '-'
    const stepLabel =
      requestStatus === 'draft'
        ? 'Draft belum disubmit'
        : requestStatus === 'cancelled'
          ? 'Request dibatalkan'
          : requestStatus === 'approved'
            ? 'Approval selesai'
            : requestStatus === 'rejected'
              ? 'Request ditolak'
              : requestStatus === 'needs_revision'
                ? 'Perlu revisi'
                : 'Sedang direview'

    return {
      activityId: row.activityId ?? row.submissionId,
      requestNumber: row.requestNumber || null,
      formName: row.formName,
      activityCode: payload.activityCode ?? '-',
      title: payload.title ?? 'Untitled Draft',
      activityType: payload.activityType ?? '-',
      unitNumber: payload.unitNumber ?? '-',
      requesterName: row.requesterName,
      requesterJobTitle: row.requesterJobTitle,
      siteName: row.siteName ?? '-',
      priority: payload.priority ?? 'Normal',
      status: requestStatus,
      activityStatus: requestStatus,
      submissionId: row.submissionId,
      submittedAt: row.submittedAt ?? row.createdAt,
      lastUpdatedAt: row.cancelledAt ?? row.updatedAt ?? row.createdAt,
      pendingWith: pendingWithLabel,
      currentStepLabel: stepLabel,
      progressLabel:
        requestStatus === 'draft'
          ? '0 step'
          : requestStatus === 'approved'
            ? 'Completed'
            : requestStatus === 'cancelled'
              ? 'Cancelled'
              : 'In workflow',
      workflowLabel: row.formName,
      canCancel: requestStatus === 'draft' || requestStatus === 'in_review',
    }
  })

  const requests = [...draftRequests, ...activityRequests].sort(
    (left, right) => right.lastUpdatedAt.getTime() - left.lastUpdatedAt.getTime()
  )

  return {
    scopeLabel: email ? 'My Request Center' : 'Request Center',
    metrics: {
      draft: requests.filter((request) => request.status === 'draft').length,
      submitted: requests.filter((request) => request.status === 'submitted').length,
      inReview: requests.filter((request) => request.status === 'in_review').length,
      needsRevision: requests.filter((request) => request.status === 'needs_revision').length,
      approved: requests.filter((request) => request.status === 'approved').length,
      rejected: requests.filter((request) => request.status === 'rejected').length,
      cancelled: requests.filter((request) => request.status === 'cancelled').length,
    },
    requests,
  }
}

export async function getFormStudioOverviewData() {
  await ensureHeroSeedData()

  const [structures, matrices, steps] = await Promise.all([
    db.select().from(orgChartStructures),
    db.select().from(approvalMatrices),
    db.select().from(approvalMatrixSteps),
  ])

  return {
    metrics: {
      activeStructures: structures.filter((item) => item.isActive).length,
      activeMatrices: matrices.filter((item) => item.isActive).length,
      workflowSteps: steps.length,
      liveTemplates: 1,
    },
    templates: [
      {
        name: 'Daily Activity',
        category: 'Operations',
        status: 'live',
        version: 'v1 route-enabled',
        workflowMode: 'Org Template',
        fields: '12 field inti',
        remark:
          'Submit activity sudah memakai route engine, snapshot workflow, dan review approve/reject/revisi.',
      },
      {
        name: 'Overtime Request',
        category: 'Operations',
        status: 'partial',
        version: 'v0.2 blueprint',
        workflowMode: 'Org Template',
        fields: 'siap dipisah dari activity',
        remark:
          'Perhitungan overtime sudah hidup di approval outcome, tapi form template dedicated belum dipisah.',
      },
      {
        name: 'Daily Report',
        category: 'Reporting',
        status: 'partial',
        version: 'v0.1 mapped',
        workflowMode: 'Manual / Org Hybrid',
        fields: 'header + section summary',
        remark: 'Data report sudah ada, namun belum masuk builder template versioned.',
      },
      {
        name: 'HSE Observation',
        category: 'HSE',
        status: 'backlog',
        version: 'v0.0',
        workflowMode: 'Org Template',
        fields: 'backlog',
        remark: 'Masih menunggu persistence layer template, validation rule, dan attachment rule.',
      },
      {
        name: 'Procurement Request',
        category: 'Finance / SCM',
        status: 'backlog',
        version: 'v0.0',
        workflowMode: 'Manual Workflow',
        fields: 'backlog',
        remark:
          'Disiapkan untuk workflow lintas fungsi dengan approver manual dan condition logic nominal.',
      },
    ],
    capabilities: [
      {
        capability: 'Template catalog',
        status: 'live',
        detail: 'Catalog form approval sudah disiapkan sebagai surface terpisah di dashboard.',
      },
      {
        capability: 'Versioning & publish flow',
        status: 'partial',
        detail:
          'Blueprint dan surface sudah siap, persistence `formTemplateVersions` belum diaktifkan ke DB runtime.',
      },
      {
        capability: 'Field / section builder',
        status: 'backlog',
        detail: 'Masih menunggu layer entity form template agar builder tidak hardcode.',
      },
      {
        capability: 'Preview mode',
        status: 'live',
        detail: 'Preview request sudah tampil di Approval Inbox untuk Daily Activity.',
      },
      {
        capability: 'Clone template',
        status: 'backlog',
        detail: 'Belum dipasang karena template version store belum active.',
      },
    ],
  }
}

export async function getWorkflowStudioOverviewData() {
  await ensureHeroSeedData()

  const [structures, matrices, steps] = await Promise.all([
    db.select().from(orgChartStructures),
    db.select().from(approvalMatrices),
    db.select().from(approvalMatrixSteps),
  ])

  return {
    metrics: {
      orgStructures: structures.length,
      approvalMatrices: matrices.length,
      routedSteps: steps.length,
      supportedConditions: 7,
    },
    workflowModes: [
      {
        title: 'Org Template Mode',
        status: 'live',
        summary:
          'Resolver approval sudah memilih approver dari struktur organisasi + matrix + snapshot route.',
      },
      {
        title: 'Manual Workflow Mode',
        status: 'partial',
        summary:
          'Approval Matrix editor sudah memungkinkan susun step, fallback, escalation, dan SLA secara manual.',
      },
      {
        title: 'Notification & Reminder',
        status: 'partial',
        summary:
          'Email log dan due-state inbox sudah ada, namun reminder scheduler & in-app notification belum penuh.',
      },
      {
        title: 'Parallel / Multi Approval',
        status: 'backlog',
        summary: 'Schema step mode sudah ada, tetapi runtime saat ini masih sequential-first.',
      },
    ],
    conditions: [
      { field: 'Site', status: 'live', detail: 'Tersedia di approval matrix scope.' },
      { field: 'Department', status: 'live', detail: 'Tersedia di approval matrix scope.' },
      { field: 'Section', status: 'live', detail: 'Tersedia di approval matrix scope.' },
      { field: 'Requester Position', status: 'live', detail: 'Tersedia di approval matrix scope.' },
      { field: 'Request Type', status: 'live', detail: 'Tersedia di approval matrix scope.' },
      { field: 'Priority', status: 'live', detail: 'Sudah dipakai resolver route.' },
      {
        field: 'Overtime Threshold',
        status: 'live',
        detail: 'Min/max overtime sudah dipakai resolver route.',
      },
      {
        field: 'Grouped AND / OR Builder',
        status: 'backlog',
        detail: 'Belum ada visual rule builder.',
      },
    ],
  }
}

