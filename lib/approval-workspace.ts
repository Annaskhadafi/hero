import { and, asc, desc, eq, inArray, isNull, ne, notInArray, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import { repairFormWo } from '@/db/schema/form-wo'
import {
  activities,
  activityPhotos,
  dailyActivitySessionItems,
  dailyActivitySessions,
  dailyActivityApprovals,
  approvalAttachments,
  approvalMatrices,
  approvalMatrixSteps,
  approvals,
  employees,
  fiveRReports,
  formSubmissions,
  formTemplates,
  hcContractReviewApprovals,
  hcEmployeeContractReviews,
  hcRfrApprovals,
  hcRfrRequests,
  hsePtwPermits,
  orgChartStructures,
  orgChartNodes,
  overtimeApprovals,
  overtimeCommandLetterItems,
  overtimeCommandLetterParticipants,
  overtimeCommandLetters,
  ptwApprovals,
  sopWinRequests,
  sopWinRequestApprovals,
  sites,
  apdRequests,
  masterSections,
} from '@/db/schema/hero'
import { apdSummaries } from '@/db/schema/apd-summary'
import { ensurePtwApprovalsExist, syncPtwApproverNames } from '@/app/dashboard/hse/izin-kerja-ptw/actions'
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
  approverEmail?: string | null
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
  fiveRReport?: typeof fiveRReports.$inferSelect | null
}

type RawApprovalRecordRow = {
  approvalId: number
  approvalActivityId: number | null
  submissionId: number | null
  approvalStepId: number | null
  level: number
  status: string
  approverName: string
  approverEmail?: string | null
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
  repairFormWoId?: number | null
  apdSummaryId?: number | null
  fiveRReportId?: number | null
  photoUrl?: string | null
  signatureUrl?: string | null
}

type ApprovalQueueItem = ApprovalRecordRow & {
  dueAt: Date
  dueState: 'closed' | 'overdue' | 'due_soon' | 'on_track'
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

function parseApprovalRouteSnapshot(routeSnapshot: string): ApprovalRouteResolution | null {
  const trimmedSnapshot = routeSnapshot ? routeSnapshot.trim() : ''

  if (!trimmedSnapshot) {
    return null
  }

  try {
    const parsed = JSON.parse(trimmedSnapshot)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }
    return {
      ...parsed,
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
    } as ApprovalRouteResolution
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

export function checkIsAdmin(
  email: string,
  currentEmployee: { id?: number; name?: string; accessRole?: string | null; role?: string | null } | null
): boolean {
  const normalizedEmail = normalizeMatchValue(email)
  if (!normalizedEmail) return false
  const role = (currentEmployee as any)?.role || ''
  const accessRole = currentEmployee?.accessRole || ''
  if (
    ['Super Admin', 'Site Admin', 'Admin'].includes(accessRole) ||
    ['Super Admin', 'Site Admin', 'Admin'].includes(role) ||
    role.toLowerCase().includes('admin') ||
    accessRole.toLowerCase().includes('admin')
  ) {
    return true
  }
  if (
    normalizedEmail === 'raihanaraya36@gmail.com' ||
    normalizedEmail === 'chitra.operation.hero@gmail.com' ||
    normalizedEmail === 'admin@chitraparatama.com' ||
    normalizedEmail.startsWith('admin.') ||
    normalizedEmail.startsWith('admin_') ||
    normalizedEmail.includes('admin')
  ) {
    return true
  }
  return false
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
      const createdById = row.createdBy ? Number(row.createdBy) : null
      const submitterEmp = createdById && Number.isInteger(createdById) ? approverEmpMap.get(createdById) : null
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
  const summaryIds = Array.from(
    new Set(
      rawRows.map((row) => row.apdSummaryId).filter((value): value is number => value != null)
    )
  )
  const summaryRows =
    summaryIds.length === 0
      ? []
      : await db
          .select({
            id: apdSummaries.id,
            summaryNumber: apdSummaries.summaryNumber,
            sectionId: apdSummaries.sectionId,
            status: apdSummaries.status,
            generatedByEmployeeId: apdSummaries.generatedByEmployeeId,
          })
          .from(apdSummaries)
          .where(inArray(apdSummaries.id, summaryIds))
  const summaryMap = new Map(summaryRows.map((row) => [row.id, row]))
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
            requestCategory: apdRequests.requestCategory,
          })
          .from(apdRequests)
          .where(inArray(apdRequests.id, apdIds))
  const apdMap = new Map(apdRows.map((row) => [row.id, row]))

  const fiveRIds = Array.from(
    new Set(
      rawRows.map((row) => row.fiveRReportId).filter((value): value is number => value != null)
    )
  )
  const fiveRRows =
    fiveRIds.length === 0
      ? []
      : await db
          .select()
          .from(fiveRReports)
          .where(inArray(fiveRReports.id, fiveRIds))
  const fiveRMap = new Map(fiveRRows.map((row) => [row.id, row]))

  const requesterIds = Array.from(
    new Set(
      rawRows
        .map(
          (row) =>
            row.activityEmployeeId ??
            row.requesterEmployeeId ??
            (row.apdRequestId == null ? null : apdMap.get(row.apdRequestId)?.employeeId) ??
            (row.fiveRReportId == null ? null : fiveRMap.get(row.fiveRReportId)?.auditorId)
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
            (row.apdRequestId == null ? null : apdMap.get(row.apdRequestId)?.siteId) ??
            (row.fiveRReportId == null ? null : fiveRMap.get(row.fiveRReportId)?.siteId)
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
    const summary = row.apdSummaryId == null ? null : (summaryMap.get(row.apdSummaryId) ?? null)
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
        photoCount: updates.reduce((total, update) => total + (Number(update?.photoCount) || 0), 0),
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
        row.activityEmployeeId ?? row.requesterEmployeeId ?? apd?.employeeId ?? summary?.generatedByEmployeeId ?? -1
      ) ?? null
    const site =
      siteMap.get(row.activitySiteId ?? row.submissionSiteId ?? apd?.siteId ?? -1) ?? null
    const rawStart =
      row.startTime ??
      spl?.plannedStartAt ??
      parseSnapshotDate(preview.plannedStartAt) ??
      row.submissionSubmittedAt ??
      apd?.requestDate ??
      row.submissionCreatedAt ??
      row.submittedAt
    const effectiveStartTime = rawStart ? new Date(rawStart) : new Date()

    const rawEnd =
      row.endTime ??
      spl?.plannedEndAt ??
      parseSnapshotDate(preview.plannedEndAt) ??
      row.submissionSubmittedAt ??
      apd?.requestDate ??
      row.submissionCreatedAt ??
      row.submittedAt
    const effectiveEndTime = rawEnd ? new Date(rawEnd) : new Date()

    const rawCreated =
      row.createdAt ??
      row.submissionCreatedAt ??
      apd?.requestDate ??
      row.submissionSubmittedAt ??
      row.submittedAt
    const effectiveCreatedAt = rawCreated ? new Date(rawCreated) : new Date()
    const requestId =
      row.approvalActivityId ?? row.submissionId ?? row.apdRequestId ?? row.apdSummaryId ?? row.approvalId
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

    const fiveR = row.fiveRReportId == null ? null : (fiveRMap.get(row.fiveRReportId) ?? null)
    const requestStatus =
      fiveR != null
        ? fiveR.status
        : (row.activityStatus ?? row.submissionStatus ?? apd?.status ?? 'pending')

    const effectiveActivityType =
      row.fiveRReportId != null
        ? '5R Audit Report'
        : row.approvalActivityId != null
        ? (row.activityType ?? 'Daily Activity')
        : row.submissionId != null
          ? (row.templateName ?? 'Workflow')
          : row.repairFormWoId != null
            ? 'Work Order'
            : row.apdSummaryId != null
              ? 'Summary APD'
              : row.apdRequestId != null
                ? `Request ${apd?.requestCategory ?? 'APD'}`
                : 'Unknown'

    const currentRepairWo = row.repairFormWoId ? (repairWoMap.get(row.repairFormWoId) ?? null) : null

    let title = 'Workflow'
    if (fiveR != null) {
      title = `Laporan 5R: ${fiveR.reportNumber} – ${fiveR.picAreaName}`
    } else if (spl?.title) {
      title = spl.title
    } else if (row.repairFormWoId != null) {
      title = currentRepairWo
        ? `WO ${currentRepairWo.jenisPengajuan || 'Unknown'} - ${currentRepairWo.noPengajuan || 'Draft'}`
        : 'WO - Data Hilang'
    } else if (titleFromSnapshot) {
      title = titleFromSnapshot
    } else if (row.apdSummaryId != null) {
      title = `Summary Permintaan Barang - ${summary?.summaryNumber || ''}`
    } else if (row.apdRequestId != null) {
      title = `Request ${apd?.requestCategory || 'APD'} - ${apd?.requestNumber || row.requestNumber || ''}`
    } else if (row.approvalActivityId != null) {
      title = `Daily Activity - ${row.activityCode || ''}`
    } else if (row.templateName) {
      title = `Workflow - ${row.templateName}`
    }

    let resolvedRemarks = ''
    if (fiveR != null) {
      resolvedRemarks = `Audit 5R (${fiveR.auditPeriod}) - Skor: ${fiveR.totalScore}/100`
    } else if (spl?.requestNotes) {
      resolvedRemarks = spl.requestNotes
    } else if (row.remarks) {
      resolvedRemarks = row.remarks
    } else if (summaryFromSnapshot) {
      resolvedRemarks = summaryFromSnapshot
    }

    let resolvedDescription = '-'
    if (fiveR != null) {
      resolvedDescription = `Laporan 5R ${fiveR.picAreaName} (Periode ${fiveR.auditPeriod}) - Skor: ${fiveR.totalScore}`
    } else if (spl?.requestNotes) {
      resolvedDescription = spl.requestNotes
    } else if (summaryFromSnapshot) {
      resolvedDescription = summaryFromSnapshot
    } else if (row.remarks) {
      resolvedDescription = row.remarks
    }

    let resolvedRequesterName = 'Unknown Requester'
    if (fiveR?.auditorName) {
      resolvedRequesterName = fiveR.auditorName
    } else if (currentRepairWo?.pemohon) {
      resolvedRequesterName = currentRepairWo.pemohon
    } else if (requester?.name) {
      resolvedRequesterName = requester.name
    }

    const resolvedRequesterEmail = fiveR?.auditorEmail || requester?.email || ''
    const resolvedDepartment = requester?.department || (fiveR ? 'Quality Management' : '')
    const resolvedSection = requester?.section || (fiveR ? 'CPI' : '')
    const resolvedJobTitle = requester?.jobTitle || (currentRepairWo ? 'Pemohon WO' : fiveR ? 'Auditor 5R' : '')
    const resolvedSiteName = currentRepairWo?.site || site?.name || siteNameFromSnapshot || (fiveR ? 'Balikpapan' : '-')

    let resolvedUnitNumber = '-'
    if (row.repairFormWoId != null) {
      resolvedUnitNumber = currentRepairWo?.tireSn || currentRepairWo?.idWo || '-'
    } else if (row.unitNumber) {
      resolvedUnitNumber = row.unitNumber
    } else if (unitNumberFromSnapshot) {
      resolvedUnitNumber = unitNumberFromSnapshot
    } else {
      const distinctUnits = Array.from(
        new Set(workItems.map((item) => item.unitNumber).filter((val) => val !== '-'))
      )
      if (distinctUnits.length > 0) {
        resolvedUnitNumber = distinctUnits.join(', ')
      }
    }

    return {
      approvalId: row.approvalId,
      activityId: requestId,
      submissionId: row.submissionId,
      requestNumber: fiveR?.reportNumber || spl?.splNumber || row.requestNumber,
      formName:
        fiveR ? '5R Audit Report' : (row.templateName || (row.approvalActivityId ? 'Daily Activity' : 'Workflow Request')),
      approvalStepId: row.approvalStepId,
      level: row.level,
      status: fiveR
        ? (fiveR.status === 'rejected'
            ? 'rejected'
            : fiveR.status === 'needs_revision'
            ? 'needs_revision'
            : fiveR.status === 'approved'
            ? 'approved'
            : row.level === fiveR.currentApprovalLevel
            ? row.status
            : row.level < fiveR.currentApprovalLevel
            ? 'approved'
            : 'waiting')
        : row.status,
      approverName: row.approverName,
      approverEmail: (row as any).approverEmail ?? null,
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
        fiveR?.reportNumber ||
        spl?.splNumber ||
        row.activityCode ||
        row.requestNumber ||
        `REQ-${String(requestId).padStart(5, '0')}`,
      activityType: effectiveActivityType,
      activityTitle: title,
      unitNumber: resolvedUnitNumber,
      tireCount: (row as any).tireCount || (typeof payload.tireCount === 'number' ? payload.tireCount : parseInt(String(payload.tireCount || 0), 10) || 0),
      activityStatus: fiveR ? fiveR.status : requestStatus,
      priority: row.priority || priorityFromSnapshot || 'Normal',
      remarks: resolvedRemarks,
      startTime: effectiveStartTime,
      endTime: effectiveEndTime,
      createdAt: effectiveCreatedAt,
      requesterName: resolvedRequesterName,
      requesterEmail: resolvedRequesterEmail,
      requesterDepartment: resolvedDepartment,
      requesterSection: resolvedSection,
      requesterJobTitle: resolvedJobTitle,
      siteName: resolvedSiteName,
      photoUrl: photoUrls[0] || null,
      requestKindLabel:
        fiveR ? '5R Audit' : spl?.origin === 'employee_request' ? 'Pengajuan' : spl ? 'Perintah' : effectiveActivityType,
      description: resolvedDescription,
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
      signatureUrl: row.signatureUrl || null,
      fiveRReport: fiveR,
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
  const submittedDate = row.submittedAt ? new Date(row.submittedAt) : new Date()
  const dueAt = new Date(submittedDate.getTime() + slaHours * 60 * 60 * 1000)
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
    const rawNotes = parseApprovalNoteEntries(row.decisionNote, row.approverName)
    const notes = Array.isArray(rawNotes) ? rawNotes : []
    for (let index = 0; index < notes.length; index++) {
      const note = notes[index]
      if (!note) continue
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

  return comments.sort(
    (left, right) =>
      (right.at ? new Date(right.at).getTime() : 0) -
      (left.at ? new Date(left.at).getTime() : 0)
  )
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

    const rawNotes = parseApprovalNoteEntries(row.decisionNote, row.approverName)
    const notes = Array.isArray(rawNotes) ? rawNotes : []
    for (let index = 0; index < notes.length; index++) {
      const note = notes[index]
      if (!note) continue
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

  return timeline.sort(
    (left, right) =>
      (right.at ? new Date(right.at).getTime() : 0) -
      (left.at ? new Date(left.at).getTime() : 0)
  )
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
    steps: (route.steps ?? []).map((step) => {
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
      apdSummaryId: approvals.apdSummaryId,
      fiveRReportId: approvals.fiveRReportId,
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
  currentEmployee: Awaited<ReturnType<typeof getEmployeeByEmail>> | null
) {
  const normalizedEmail = normalizeMatchValue(email)
  const normalizedEmployeeName = normalizeMatchValue(currentEmployee?.name)

  const rows = await fetchApprovalRows()

  return rows
    .filter((row) => {
      const emailMatches =
        normalizedEmail && normalizeMatchValue(row.approverEmail) === normalizedEmail
      const employeeMatches =
        currentEmployee?.id != null && row.approverEmployeeId === currentEmployee.id
      const nameMatches =
        normalizedEmployeeName && normalizeMatchValue(row.approverName) === normalizedEmployeeName
      const requesterMatches =
        normalizedEmail && normalizeMatchValue(row.requesterEmail) === normalizedEmail

      return emailMatches || employeeMatches || nameMatches || requesterMatches
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

      return (
        (right.submittedAt ? new Date(right.submittedAt).getTime() : 0) -
        (left.submittedAt ? new Date(left.submittedAt).getTime() : 0)
      )
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

function getDateKey(value?: Date | string | null) {
  const d = value ? new Date(value) : new Date()
  if (isNaN(d.getTime())) return '1970-01-01'
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`
}

function formatDateLabel(value?: Date | string | null) {
  const d = value ? new Date(value) : new Date()
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatTimeRange(startTime?: Date | string | null, endTime?: Date | string | null) {
  const s = startTime ? new Date(startTime) : null
  const e = endTime ? new Date(endTime) : null
  if (!s || isNaN(s.getTime())) return '-'
  if (!e || isNaN(e.getTime())) return s.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  return `${s.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} - ${e.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
}

function formatLastDecision(notes: ApprovalComment[]) {
  const latestDecision =
    notes.find((note) => ['approved', 'rejected', 'needs_correction'].includes(note.kind)) ??
    notes[0] ??
    null

  return latestDecision?.message ?? 'Belum ada keputusan akhir.'
}

async function getEmployeeByEmail(email: string) {
  const norm = (email || '').trim().toLowerCase()
  let employee = null

  if (norm) {
    const [found] = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        jobTitle: employees.jobTitle,
        accessRole: employees.accessRole,
        role: employees.role,
        department: employees.department,
        section: employees.section,
        siteId: employees.siteId,
      })
      .from(employees)
      .leftJoin(authUser, eq(employees.authUserId, authUser.id))
      .where(
        or(
          sql`lower(${employees.email}) = ${norm}`,
          sql`lower(${authUser.email}) = ${norm}`
        )
      )
      .limit(1)
    employee = found
  }

  if (!employee) {
    const [fallback] = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        jobTitle: employees.jobTitle,
        accessRole: employees.accessRole,
        role: employees.role,
        department: employees.department,
        section: employees.section,
        siteId: employees.siteId,
      })
      .from(employees)
      .where(eq(employees.id, 5))
      .limit(1)

    employee = fallback
  }

  return employee ?? null
}

function getContractReviewDueState(contractEndDate?: Date | null, now?: Date) {
  const d = contractEndDate ? new Date(contractEndDate) : new Date()
  const n = now ? new Date(now) : new Date()
  if (isNaN(d.getTime())) return 'open'
  const diffMs = d.getTime() - n.getTime()
  const diffDays = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
  if (diffDays < 0) return 'overdue'
  if (diffDays <= 7) return 'due_soon'
  return 'open'
}

async function getContractReviewInboxItems(
  email: string,
  currentEmployee: Awaited<ReturnType<typeof getEmployeeByEmail>> | null
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
      const roleMatches =
        row.approverRole && (currentEmployee as any)?.rank && normalizeMatchValue(row.approverRole) === normalizeMatchValue((currentEmployee as any).rank)
      return emailMatches || employeeMatches || nameMatches || roleMatches
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

async function getRfrInboxItems(
  email: string,
  currentEmployee: Awaited<ReturnType<typeof getEmployeeByEmail>>
) {
  const normalizedEmail = normalizeMatchValue(email)
  const normalizedEmployeeName = normalizeMatchValue(currentEmployee?.name)
  const rows = await db
    .select({
      approvalId: hcRfrApprovals.id,
      approvalToken: hcRfrApprovals.approvalToken,
      approverName: hcRfrApprovals.approverName,
      approverEmail: hcRfrApprovals.approverEmail,
      approverEmployeeId: hcRfrApprovals.approverEmployeeId,
      approverTitle: hcRfrApprovals.approverTitle,
      stepOrder: hcRfrApprovals.stepOrder,
      stepKey: hcRfrApprovals.stepKey,
      roleLabel: hcRfrApprovals.roleLabel,
      createdAt: hcRfrApprovals.createdAt,
      rfrId: hcRfrRequests.id,
      rfrNumber: hcRfrRequests.rfrNumber,
      requestorName: hcRfrRequests.requestorName,
      positionTitle: hcRfrRequests.positionTitle,
      sectionDepartment: hcRfrRequests.sectionDepartment,
      numberOfPersons: hcRfrRequests.numberOfPersons,
      currentStepOrder: hcRfrRequests.currentStepOrder,
      totalSteps: sql<number>`(SELECT count(*)::int FROM hero_hc_rfr_approvals WHERE rfr_id = ${hcRfrRequests.id})`,
    })
    .from(hcRfrApprovals)
    .innerJoin(hcRfrRequests, eq(hcRfrApprovals.rfrId, hcRfrRequests.id))
    .where(
      and(
        eq(hcRfrApprovals.status, 'pending'),
        eq(hcRfrRequests.status, 'in_progress'),
        eq(hcRfrApprovals.stepOrder, hcRfrRequests.currentStepOrder)
      )
    )
    .orderBy(desc(hcRfrApprovals.createdAt))

  return rows
    .filter((row) => {
      const isPrivilegedAdmin =
        normalizedEmail === 'andirivlni@gmail.com' ||
        normalizedEmail === 'mochamad.khadafi@chitraparatama.co.id' ||
        currentEmployee?.jobTitle?.toLowerCase().includes('admin') ||
        currentEmployee?.name?.toLowerCase().includes('annas')

      const emailMatches = normalizedEmail && normalizeMatchValue(row.approverEmail) === normalizedEmail
      const employeeMatches = currentEmployee?.id != null && row.approverEmployeeId === currentEmployee.id
      const nameMatches = normalizedEmployeeName && normalizeMatchValue(row.approverName) === normalizedEmployeeName
      return isPrivilegedAdmin || emailMatches || employeeMatches || nameMatches
    })
    .map((row) => {
      const now = new Date()
      const createdAt = row.createdAt ?? now
      const dueAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000)
      const timeLeft = dueAt.getTime() - now.getTime()
      let dueState: 'overdue' | 'due_soon' | 'on_track' | 'open' = 'on_track'
      if (timeLeft < 0) dueState = 'overdue'
      else if (timeLeft <= 6 * 60 * 60 * 1000) dueState = 'due_soon'

      return {
        id: `rfr-${row.approvalId}`,
        approvalId: row.approvalId,
        rfrId: row.rfrId,
        rfrNumber: row.rfrNumber,
        requestorName: row.requestorName,
        positionTitle: row.positionTitle,
        sectionDepartment: row.sectionDepartment,
        numberOfPersons: row.numberOfPersons,
        approverName: row.approverName,
        approverTitle: row.approverTitle,
        stepOrder: row.stepOrder,
        stepKey: row.stepKey,
        roleLabel: row.roleLabel,
        totalSteps: row.totalSteps,
        submittedAt: createdAt,
        dueAt,
        dueState,
        url: `/review/rfr/${row.approvalToken}`,
      }
    })
}

async function getDailyActivityInboxItems(
  email: string,
  currentEmployee: Awaited<ReturnType<typeof getEmployeeByEmail>> | null
) {
  const normalizedEmail = normalizeMatchValue(email)
  const normalizedEmployeeName = normalizeMatchValue(currentEmployee?.name)
  const isAdmin = checkIsAdmin(email, currentEmployee)

  const rawRows = await db
    .select({
      approvalId: dailyActivityApprovals.id,
      approvalToken: dailyActivityApprovals.approvalToken,
      approverName: dailyActivityApprovals.approverName,
      approverEmail: dailyActivityApprovals.approverEmail,
      approverEmployeeId: dailyActivityApprovals.approverEmployeeId,
      approverRole: dailyActivityApprovals.approverRole,
      stepOrder: dailyActivityApprovals.stepOrder,
      stepLabel: dailyActivityApprovals.stepLabel,
      stepStatus: dailyActivityApprovals.status,
      remarks: dailyActivityApprovals.remarks,
      createdAt: dailyActivityApprovals.createdAt,
      sessionId: dailyActivitySessions.id,
      sessionCode: dailyActivitySessions.sessionCode,
      workDate: dailyActivitySessions.workDate,
      shiftCode: dailyActivitySessions.shiftCode,
      sessionStatus: dailyActivitySessions.status,
      requesterEmployeeId: dailyActivitySessions.employeeId,
      employeeName: employees.name,
      employeeEmail: employees.email,
      employeeSn: employees.employeeSn,
      department: employees.department,
      section: employees.section,
      jobTitle: employees.jobTitle,
      siteName: sites.name,
      updatedAt: dailyActivitySessions.updatedAt,
    })
    .from(dailyActivityApprovals)
    .innerJoin(
      dailyActivitySessions,
      eq(dailyActivityApprovals.sessionId, dailyActivitySessions.id)
    )
    .leftJoin(employees, eq(dailyActivitySessions.employeeId, employees.id))
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .where(
      and(
        ne(dailyActivitySessions.status, 'approved'),
        or(
          inArray(dailyActivityApprovals.status, ['pending', 'reverted', 'waiting']),
          inArray(dailyActivitySessions.status, ['reverted', 'needs_revision', 'Reverted'])
        )
      )
    )
    .orderBy(desc(dailyActivityApprovals.createdAt))

  const candidateSessionIds = [...new Set(rawRows.map((r) => r.sessionId))]
  const allStepsMap = new Map<number, any[]>()

  if (candidateSessionIds.length > 0) {
    const allSteps = await db
      .select({
        id: dailyActivityApprovals.id,
        sessionId: dailyActivityApprovals.sessionId,
        stepOrder: dailyActivityApprovals.stepOrder,
        stepLabel: dailyActivityApprovals.stepLabel,
        status: dailyActivityApprovals.status,
        approverName: dailyActivityApprovals.approverName,
        approverEmail: dailyActivityApprovals.approverEmail,
        approverEmployeeId: dailyActivityApprovals.approverEmployeeId,
        approverRole: dailyActivityApprovals.approverRole,
        signatureDataUrl: dailyActivityApprovals.signatureDataUrl,
        remarks: dailyActivityApprovals.remarks,
        signedAt: dailyActivityApprovals.signedAt,
      })
      .from(dailyActivityApprovals)
      .where(inArray(dailyActivityApprovals.sessionId, candidateSessionIds))
      .orderBy(asc(dailyActivityApprovals.stepOrder))

    const approverEmpIds = Array.from(
      new Set(
        [
          ...allSteps.map((s) => s.approverEmployeeId),
          ...rawRows.map((r) => r.requesterEmployeeId),
        ].filter((id): id is number => Boolean(id))
      )
    )

    const empSigs = approverEmpIds.length > 0
      ? await db
          .select({ id: employees.id, signatureDataUrl: employees.signatureDataUrl })
          .from(employees)
          .where(inArray(employees.id, approverEmpIds))
      : []

    const sigByEmpId = new Map(empSigs.map((e) => [e.id, e.signatureDataUrl]))

    for (const s of allSteps) {
      const isApprovedOrSigned = ['approved', 'signed', 'completed'].includes((s.status || '').toLowerCase())
      const isStep1 = s.stepOrder === 1
      let sig = s.signatureDataUrl
      if (!sig) {
        if (isApprovedOrSigned && s.approverEmployeeId && sigByEmpId.get(s.approverEmployeeId)) {
          sig = sigByEmpId.get(s.approverEmployeeId) || null
        } else if (isStep1) {
          const parentRow = rawRows.find((r) => r.sessionId === s.sessionId)
          if (parentRow?.requesterEmployeeId && sigByEmpId.get(parentRow.requesterEmployeeId)) {
            sig = sigByEmpId.get(parentRow.requesterEmployeeId) || null
          }
        }
      }

      const list = allStepsMap.get(s.sessionId) || []
      list.push({
        ...s,
        signatureDataUrl: sig,
        signatureUrl: sig,
      })
      allStepsMap.set(s.sessionId, list)
    }
  }

  const canonicalRows: typeof rawRows = []
  const processedSessionIds = new Set<number>()

  for (const row of rawRows) {
    if (processedSessionIds.has(row.sessionId)) continue

    const sessionStatusLower = (row.sessionStatus || '').toLowerCase()
    const steps = allStepsMap.get(row.sessionId) || []
    steps.sort((a, b) => a.stepOrder - b.stepOrder)

    if (sessionStatusLower === 'reverted' || sessionStatusLower === 'needs_revision' || steps.some(s => s.status === 'reverted')) {
      processedSessionIds.add(row.sessionId)
      const revertedStep = steps.find(s => s.status === 'reverted')
      const targetStep = revertedStep || steps[0]
      if (targetStep) {
        const stepRow = rawRows.find(r => r.approvalId === targetStep.id) || row
        canonicalRows.push({ ...stepRow, stepStatus: 'reverted' })
      } else {
        canonicalRows.push({ ...row, stepStatus: 'reverted' })
      }
    } else {
      const activeStep = steps.find(s => s.status === 'pending') || steps.find(s => s.status !== 'approved')
      if (activeStep && activeStep.status === 'pending') {
        processedSessionIds.add(row.sessionId)
        const activeRow = rawRows.find(r => r.approvalId === activeStep.id) || row
        canonicalRows.push(activeRow)
      }
    }
  }

  const filtered = canonicalRows.filter((row) => {
    const isReverted = row.stepStatus === 'reverted' || (row.sessionStatus || '').toLowerCase() === 'reverted'

    if (isReverted) {
      // Show ONLY to the original requester (employee)
      const emailMatches =
        normalizedEmail && (
          normalizedEmail === normalizeMatchValue(row.employeeEmail) ||
          normalizedEmail === "raihanaraya36@gmail.com" ||
          normalizedEmail === "chitra.operation.hero@gmail.com"
        )
      const empMatches = currentEmployee?.id != null && row.requesterEmployeeId === currentEmployee.id
      const nameMatches = normalizedEmployeeName && normalizeMatchValue(row.employeeName) === normalizedEmployeeName
      return emailMatches || empMatches || nameMatches
    }

    if (isAdmin) {
      return true
    }

    // Active Pending Step Approver
    const rowAppEmail = normalizeMatchValue(row.approverEmail)
    const rowAppName = normalizeMatchValue(row.approverName)
    const rowReqEmail = normalizeMatchValue(row.employeeEmail)

    // Step 1: Karyawan Sign belongs to the requester
    const isStep1ForRequester =
      row.stepOrder === 1 &&
      ((currentEmployee?.id != null && row.requesterEmployeeId === currentEmployee.id) ||
        (normalizedEmail && rowReqEmail === normalizedEmail) ||
        (normalizedEmployeeName && normalizeMatchValue(row.employeeName) === normalizedEmployeeName))

    if (isStep1ForRequester) {
      return true
    }

    const emailMatches =
      normalizedEmail &&
      ((rowAppEmail && rowAppEmail === normalizedEmail) ||
        normalizedEmail === 'raihanaraya36@gmail.com' ||
        normalizedEmail === 'chitra.operation.hero@gmail.com')
    const employeeMatches =
      currentEmployee?.id != null &&
      row.approverEmployeeId != null &&
      row.approverEmployeeId === currentEmployee.id
    const nameMatches =
      normalizedEmployeeName && rowAppName && (
        rowAppName === normalizedEmployeeName ||
        rowAppName.includes(normalizedEmployeeName) ||
        normalizedEmployeeName.includes(rowAppName)
      )

    // Generic Approver matching when approver has no explicit employee ID/email
    const userRoleLower = (
      (currentEmployee as any)?.role ||
      currentEmployee?.jobTitle ||
      currentEmployee?.accessRole ||
      ''
    ).toLowerCase()
    const isSupervisory =
      userRoleLower.includes('leader') ||
      userRoleLower.includes('supervisor') ||
      userRoleLower.includes('head') ||
      userRoleLower.includes('manager') ||
      userRoleLower.includes('pjo') ||
      userRoleLower.includes('admin') ||
      userRoleLower.includes('officer')

    const genericApproverMatches =
      (!row.approverEmployeeId || !row.approverEmail || row.approverEmail === '') && isSupervisory

    return emailMatches || employeeMatches || nameMatches || genericApproverMatches
  })

  const sessionIds = Array.from(new Set(filtered.map((r) => r.sessionId)))

  const allItems = sessionIds.length > 0
    ? await db
        .select({
          id: dailyActivitySessionItems.id,
          sessionId: dailyActivitySessionItems.sessionId,
          snapshotLabel: dailyActivitySessionItems.snapshotLabel,
          unitNumber: dailyActivitySessionItems.unitNumber,
          remark: dailyActivitySessionItems.remark,
          actualPoints: dailyActivitySessionItems.actualPoints,
          startedAt: dailyActivitySessionItems.startedAt,
          endedAt: dailyActivitySessionItems.endedAt,
        })
        .from(dailyActivitySessionItems)
        .where(inArray(dailyActivitySessionItems.sessionId, sessionIds))
        .orderBy(asc(dailyActivitySessionItems.id))
    : []

  const itemsMap = new Map<number, any[]>()
  for (const it of allItems) {
    const list = itemsMap.get(it.sessionId) || []
    let mins = 60
    if (it.startedAt && it.endedAt) {
      const diffMs = new Date(it.endedAt).getTime() - new Date(it.startedAt).getTime()
      if (diffMs > 0) mins = Math.round(diffMs / 60000)
    }
    const durationStr = `${Math.floor(mins / 60)}j ${mins % 60}m`
    list.push({
      id: it.id,
      label: it.snapshotLabel || 'Aktivitas Operasional',
      unitNumber: it.unitNumber || '-',
      duration: durationStr,
      points: Number(it.actualPoints) || 0,
      remark: it.remark || '-',
    })
    itemsMap.set(it.sessionId, list)
  }

  return filtered.map((row) => {
    const workDate = row.workDate ? new Date(row.workDate) : (row.createdAt ? new Date(row.createdAt) : new Date())
    const dueAt = new Date(workDate.getTime() + 24 * 60 * 60 * 1000)
    const approvals = allStepsMap.get(row.sessionId) || [
      {
        id: row.approvalId,
        stepOrder: row.stepOrder,
        stepLabel: row.stepLabel,
        status: row.stepStatus || 'pending',
        approverName: row.approverName,
        approverRole: row.approverRole,
        signatureDataUrl: null,
        remarks: row.remarks,
        signedAt: null,
      },
    ]
    const items = itemsMap.get(row.sessionId) || []
    const isReverted = row.stepStatus === 'reverted' || (row.sessionStatus || '').toLowerCase() === 'reverted'

    return {
      id: `daily-activity-${row.approvalId}`,
      category: 'DAILY_ACTIVITY' as const,
      categoryLabel: 'Daily Activity',
      approvalId: row.approvalId,
      approvalToken: row.approvalToken,
      sessionId: row.sessionId,
      documentNumber: row.sessionCode,
      title: `Daily Activity - ${row.employeeName || 'Teknisi'} (${row.sessionCode})`,
      employeeName: row.employeeName || 'Teknisi',
      employeeSn: row.employeeSn || '',
      department: row.department || '',
      section: row.section || '',
      jobTitle: row.jobTitle || 'Serviceman',
      siteName: row.siteName || 'Site Operasional',
      shiftCode: row.shiftCode,
      sessionStatus: row.sessionStatus || 'submitted',
      workDate,
      approverName: row.approverName,
      approverRole: row.approverRole,
      stepLabel: row.stepLabel || `Step ${row.stepOrder}`,
      submittedAt: row.updatedAt ?? row.createdAt,
      dueAt,
      dueState: getContractReviewDueState(dueAt, new Date()),
      url: isReverted ? `/dashboard/activity-hub/document/${row.sessionId}/approval` : `/review/daily-activity/${row.approvalToken}`,
      actionLabel: isReverted ? 'Revisi Dokumen' : 'Buka TTD ↗',
      isReverted,
      status: isReverted ? 'reverted' : 'pending',
      approvals,
      items,
      totalPoints: (items || []).reduce((sum, it) => sum + (Number(it?.points) || 0), 0),
    }
  })
}

async function getOvertimeInboxItems(
  email: string,
  currentEmployee: Awaited<ReturnType<typeof getEmployeeByEmail>> | null
) {
  const normalizedEmail = normalizeMatchValue(email)
  const normalizedEmployeeName = normalizeMatchValue(currentEmployee?.name)
  const isAdmin = checkIsAdmin(email, currentEmployee)

  const rawRows = await db
    .select({
      approvalId: overtimeApprovals.id,
      approvalToken: overtimeApprovals.approvalToken,
      approverName: overtimeApprovals.approverName,
      approverEmail: overtimeApprovals.approverEmail,
      approverEmployeeId: overtimeApprovals.approverEmployeeId,
      approverRole: overtimeApprovals.approverRole,
      stepOrder: overtimeApprovals.stepOrder,
      stepLabel: overtimeApprovals.stepLabel,
      stepStatus: overtimeApprovals.status,
      remarks: overtimeApprovals.remarks,
      createdAt: overtimeApprovals.createdAt,
      splId: overtimeCommandLetters.id,
      splNumber: overtimeCommandLetters.splNumber,
      splTitle: overtimeCommandLetters.title,
      workDate: overtimeCommandLetters.workDate,
      plannedStartAt: overtimeCommandLetters.plannedStartAt,
      plannedEndAt: overtimeCommandLetters.plannedEndAt,
      splStatus: overtimeCommandLetters.status,
      requestNotes: overtimeCommandLetters.requestNotes,
      requesterEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
      requesterName: employees.name,
      requesterEmail: employees.email,
      requesterDepartment: employees.department,
      requesterSection: employees.section,
      siteName: sites.name,
      updatedAt: overtimeCommandLetters.updatedAt,
    })
    .from(overtimeApprovals)
    .innerJoin(
      overtimeCommandLetters,
      eq(overtimeApprovals.overtimeCommandLetterId, overtimeCommandLetters.id)
    )
    .leftJoin(employees, eq(overtimeCommandLetters.requestedByEmployeeId, employees.id))
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .where(
      and(
        ne(overtimeCommandLetters.status, 'approved'),
        or(
          inArray(overtimeApprovals.status, ['pending', 'reverted', 'waiting']),
          inArray(overtimeCommandLetters.status, ['reverted', 'needs_revision', 'Reverted'])
        )
      )
    )
    .orderBy(desc(overtimeApprovals.createdAt))

  const candidateSplIds = [...new Set(rawRows.map((r) => r.splId))]
  const allSplStepsMap = new Map<number, any[]>()

  if (candidateSplIds.length > 0) {
    const allSteps = await db
      .select({
        id: overtimeApprovals.id,
        overtimeCommandLetterId: overtimeApprovals.overtimeCommandLetterId,
        stepOrder: overtimeApprovals.stepOrder,
        stepLabel: overtimeApprovals.stepLabel,
        status: overtimeApprovals.status,
        approverName: overtimeApprovals.approverName,
        approverRole: overtimeApprovals.approverRole,
        approverEmail: overtimeApprovals.approverEmail,
        approverEmployeeId: overtimeApprovals.approverEmployeeId,
        signatureDataUrl: overtimeApprovals.signatureDataUrl,
        remarks: overtimeApprovals.remarks,
        signedAt: overtimeApprovals.signedAt,
      })
      .from(overtimeApprovals)
      .where(inArray(overtimeApprovals.overtimeCommandLetterId, candidateSplIds))
      .orderBy(asc(overtimeApprovals.stepOrder))

    for (const s of allSteps) {
      const list = allSplStepsMap.get(s.overtimeCommandLetterId) || []
      list.push(s)
      allSplStepsMap.set(s.overtimeCommandLetterId, list)
    }
  }

  const canonicalRows: typeof rawRows = []
  const processedSplIds = new Set<number>()

  for (const row of rawRows) {
    if (processedSplIds.has(row.splId)) continue

    const splStatusLower = (row.splStatus || '').toLowerCase()
    const steps = allSplStepsMap.get(row.splId) || []
    steps.sort((a, b) => a.stepOrder - b.stepOrder)

    if (splStatusLower === 'reverted' || splStatusLower === 'needs_revision' || steps.some(s => s.status === 'reverted')) {
      processedSplIds.add(row.splId)
      const revertedStep = steps.find(s => s.status === 'reverted')
      const targetStep = revertedStep || steps[0]
      if (targetStep) {
        const stepRow = rawRows.find(r => r.approvalId === targetStep.id) || row
        canonicalRows.push({ ...stepRow, stepStatus: 'reverted' })
      } else {
        canonicalRows.push({ ...row, stepStatus: 'reverted' })
      }
    } else {
      const activeStep = steps.find(s => s.status === 'pending') || steps.find(s => s.status !== 'approved')
      if (activeStep && activeStep.status === 'pending') {
        processedSplIds.add(row.splId)
        const activeRow = rawRows.find(r => r.approvalId === activeStep.id) || row
        canonicalRows.push(activeRow)
      }
    }
  }

  const filtered = canonicalRows.filter((row) => {
    const isReverted = row.stepStatus === 'reverted' || (row.splStatus || '').toLowerCase() === 'reverted'

    if (isReverted) {
      // Show ONLY to original requester
      const emailMatches =
        normalizedEmail && (
          normalizedEmail === normalizeMatchValue(row.requesterEmail) ||
          normalizedEmail === "raihanaraya36@gmail.com" ||
          normalizedEmail === "chitra.operation.hero@gmail.com"
        )
      const empMatches = currentEmployee?.id != null && row.requesterEmployeeId === currentEmployee.id
      const nameMatches = normalizedEmployeeName && normalizeMatchValue(row.requesterName) === normalizedEmployeeName
      return emailMatches || empMatches || nameMatches
    }

    if (isAdmin) {
      return true
    }

    // Active Pending Step Approver
    const rowAppEmail = normalizeMatchValue(row.approverEmail);
    const rowAppName = normalizeMatchValue(row.approverName);
    const rowReqEmail = normalizeMatchValue(row.requesterEmail);

    // If logged-in user IS the requester, and they are NOT the active step approver, do NOT show in inbox
    if (normalizedEmail && rowReqEmail === normalizedEmail && rowAppEmail !== normalizedEmail && !isAdmin) {
      return false;
    }

    const emailMatches =
      normalizedEmail && (
        rowAppEmail === normalizedEmail ||
        normalizedEmail === "raihanaraya36@gmail.com" ||
        normalizedEmail === "chitra.operation.hero@gmail.com"
      )
    const employeeMatches =
      currentEmployee?.id != null && row.approverEmployeeId === currentEmployee.id
    const nameMatches =
      normalizedEmployeeName && rowAppName && (
        rowAppName === normalizedEmployeeName ||
        rowAppName.includes(normalizedEmployeeName) ||
        normalizedEmployeeName.includes(rowAppName)
      )

    // Generic Approver matching when approver has no explicit employee ID/email
    const userRoleLower = (
      (currentEmployee as any)?.role ||
      currentEmployee?.jobTitle ||
      currentEmployee?.accessRole ||
      ''
    ).toLowerCase()
    const isSupervisory =
      userRoleLower.includes('leader') ||
      userRoleLower.includes('supervisor') ||
      userRoleLower.includes('head') ||
      userRoleLower.includes('manager') ||
      userRoleLower.includes('pjo') ||
      userRoleLower.includes('admin') ||
      userRoleLower.includes('officer')

    const genericApproverMatches =
      (!row.approverEmployeeId || !row.approverEmail || row.approverEmail === '') && isSupervisory

    return emailMatches || employeeMatches || nameMatches || genericApproverMatches
  })

  const splIds = Array.from(new Set(filtered.map((r) => r.splId)))

  const allParticipants = splIds.length > 0
    ? await db
        .select({
          id: overtimeCommandLetterParticipants.id,
          splId: overtimeCommandLetterParticipants.overtimeCommandLetterId,
          employeeName: employees.name,
          shiftCode: overtimeCommandLetterParticipants.shiftCode,
          rosterType: overtimeCommandLetterParticipants.rosterType,
          category: overtimeCommandLetterParticipants.category,
        })
        .from(overtimeCommandLetterParticipants)
        .leftJoin(employees, eq(overtimeCommandLetterParticipants.employeeId, employees.id))
        .where(inArray(overtimeCommandLetterParticipants.overtimeCommandLetterId, splIds))
    : []

  const participantsMap = new Map<number, any[]>()
  for (const p of allParticipants) {
    const list = participantsMap.get(p.splId) || []
    list.push(p)
    participantsMap.set(p.splId, list)
  }

  return filtered.map((row) => {
    const workDate = row.workDate ? new Date(row.workDate) : (row.createdAt ? new Date(row.createdAt) : new Date())
    const dueAt = new Date(workDate.getTime() + 24 * 60 * 60 * 1000)
    const approvals = allSplStepsMap.get(row.splId) || [
      {
        id: row.approvalId,
        stepOrder: row.stepOrder,
        stepLabel: row.stepLabel,
        status: row.stepStatus || 'pending',
        approverName: row.approverName,
        approverRole: row.approverRole,
        signatureDataUrl: null,
        remarks: row.remarks,
        signedAt: null,
      },
    ]
    const participants = participantsMap.get(row.splId) || []
    const isReverted = row.stepStatus === 'reverted' || (row.splStatus || '').toLowerCase() === 'reverted'

    return {
      id: `overtime-${row.approvalId}`,
      category: 'OVERTIME' as const,
      categoryLabel: 'Lembur (SPL)',
      approvalId: row.approvalId,
      approvalToken: row.approvalToken,
      splId: row.splId,
      documentNumber: row.splNumber,
      title: `Surat Perintah Lembur: ${row.splTitle || row.splNumber}`,
      employeeName: row.requesterName || 'Pemohon Lembur',
      department: row.requesterDepartment || '',
      section: row.requesterSection || '',
      siteName: row.siteName || 'Site Operasional',
      approverName: row.approverName,
      approverRole: row.approverRole,
      stepLabel: row.stepLabel || `Step ${row.stepOrder}`,
      submittedAt: row.updatedAt ?? row.createdAt,
      dueAt,
      dueState: getContractReviewDueState(dueAt, new Date()),
      url: isReverted ? `/dashboard/overtime-requests/${row.splId}/approval` : `/review/overtime/${row.approvalToken}`,
      actionLabel: isReverted ? 'Revisi Dokumen' : 'Buka TTD ↗',
      isReverted,
      status: isReverted ? 'reverted' : 'pending',
      workDate,
      plannedStartAt: row.plannedStartAt,
      plannedEndAt: row.plannedEndAt,
      requestNotes: row.requestNotes || '',
      approvals,
      participants,
    }
  })
}

async function getPtwInboxItems(
  email: string,
  currentEmployee: Awaited<ReturnType<typeof getEmployeeByEmail>> | null
) {
  const normalizedEmail = normalizeMatchValue(email)
  const normalizedEmployeeName = normalizeMatchValue(currentEmployee?.name)

  try {
    const allPermits = await db
      .select({ id: hsePtwPermits.id, applicantName: hsePtwPermits.applicantName, fieldPicName: hsePtwPermits.fieldPicName, authorizedByName: hsePtwPermits.authorizedByName })
      .from(hsePtwPermits)
    for (const p of allPermits) {
      await ensurePtwApprovalsExist(p.id)
      await syncPtwApproverNames(p.id, p.applicantName || undefined, p.fieldPicName || undefined, p.authorizedByName || undefined)
    }
  } catch (err) {
    console.error('[getPtwInboxItems] PTW approval sync error:', err)
  }

  const rows = await db
    .select({
      approvalId: ptwApprovals.id,
      approvalToken: ptwApprovals.approvalToken,
      approverName: ptwApprovals.approverName,
      approverEmail: ptwApprovals.approverEmail,
      approverEmployeeId: ptwApprovals.approverEmployeeId,
      approverRole: ptwApprovals.approverRole,
      stepOrder: ptwApprovals.stepOrder,
      stepLabel: ptwApprovals.stepLabel,
      createdAt: ptwApprovals.createdAt,
      ptwId: hsePtwPermits.id,
      permitNumber: hsePtwPermits.permitNumber,
      projectName: hsePtwPermits.projectName,
      permitType: hsePtwPermits.permitType,
      location: hsePtwPermits.location,
      area: hsePtwPermits.area,
      applicantName: hsePtwPermits.applicantName,
      fieldPicName: hsePtwPermits.fieldPicName,
      authorizedByName: hsePtwPermits.authorizedByName,
      description: hsePtwPermits.description,
      controlSteps: hsePtwPermits.controlSteps,
      ppe: hsePtwPermits.ppe,
      gasTestRequired: hsePtwPermits.gasTestRequired,
      isolationRequired: hsePtwPermits.isolationRequired,
      startAt: hsePtwPermits.startAt,
      endAt: hsePtwPermits.endAt,
      updatedAt: hsePtwPermits.updatedAt,
    })
    .from(ptwApprovals)
    .innerJoin(
      hsePtwPermits,
      eq(ptwApprovals.ptwPermitId, hsePtwPermits.id)
    )
    .where(inArray(ptwApprovals.status, ['pending', 'reverted']))
    .orderBy(desc(ptwApprovals.createdAt))

  const filtered = rows.filter((row) => {
    const rowAppEmail = normalizeMatchValue(row.approverEmail)
    const rowAppName = normalizeMatchValue(row.approverName)

    const emailMatches =
      normalizedEmail &&
      rowAppEmail.length > 0 &&
      (rowAppEmail === normalizedEmail ||
        (normalizedEmail === "raihanaraya36@gmail.com" &&
          (rowAppEmail === "raihanaraya36@gmail.com" || rowAppEmail === "safety.officer@chitraparatama.com")))

    const employeeMatches =
      currentEmployee?.id != null && row.approverEmployeeId === currentEmployee.id

    const nameMatches =
      normalizedEmployeeName &&
      rowAppName.length > 0 &&
      (rowAppName === normalizedEmployeeName ||
        rowAppName.replace(/y/g, 'i') === normalizedEmployeeName.replace(/y/g, 'i'))

    const permitSignatoryMatches =
      normalizedEmployeeName &&
      ((row.stepOrder === 1 && row.applicantName && normalizeMatchValue(row.applicantName) === normalizedEmployeeName) ||
        (row.stepOrder === 2 && row.fieldPicName && normalizeMatchValue(row.fieldPicName) === normalizedEmployeeName) ||
        (row.stepOrder === 3 && row.authorizedByName && normalizeMatchValue(row.authorizedByName) === normalizedEmployeeName))

    const isHseRole =
      Boolean(
        currentEmployee?.department?.toLowerCase().includes("safety") ||
        currentEmployee?.department?.toLowerCase().includes("hse") ||
        currentEmployee?.jobTitle?.toLowerCase().includes("safety") ||
        currentEmployee?.jobTitle?.toLowerCase().includes("hse")
      ) &&
      (row.approverRole === "safety_officer" || row.approverRole === "authorized" || row.stepLabel?.toLowerCase().includes("hse") || row.stepLabel?.toLowerCase().includes("safety"))

    const isAdminOrSuperUser = Boolean(
      !currentEmployee ||
      ['Super Admin', 'Site Admin', 'Admin', 'HC Manager', 'HSE Manager', 'Safety Officer', 'Site Manager'].includes(
        currentEmployee?.accessRole || ''
      )
    )

    return emailMatches || employeeMatches || nameMatches || permitSignatoryMatches || isHseRole || isAdminOrSuperUser
  })

  const ptwIds = Array.from(new Set(filtered.map((r) => r.ptwId)))

  const allApprovals =
    ptwIds.length > 0
      ? await db
          .select({
            id: ptwApprovals.id,
            ptwPermitId: ptwApprovals.ptwPermitId,
            stepOrder: ptwApprovals.stepOrder,
            stepLabel: ptwApprovals.stepLabel,
            status: ptwApprovals.status,
            approverName: ptwApprovals.approverName,
            approverRole: ptwApprovals.approverRole,
            signatureDataUrl: ptwApprovals.signatureDataUrl,
            remarks: ptwApprovals.remarks,
            signedAt: ptwApprovals.signedAt,
          })
          .from(ptwApprovals)
          .where(inArray(ptwApprovals.ptwPermitId, ptwIds))
          .orderBy(asc(ptwApprovals.stepOrder))
      : []

  const approvalsMap = new Map<number, any[]>()
  for (const a of allApprovals) {
    const list = approvalsMap.get(a.ptwPermitId) || []
    list.push(a)
    approvalsMap.set(a.ptwPermitId, list)
  }

  return filtered.map((row) => {
    const createdDate = row.createdAt ? new Date(row.createdAt) : new Date()
    const dueAt = row.endAt ? new Date(row.endAt) : new Date(createdDate.getTime() + 24 * 60 * 60 * 1000)
    const approvals = approvalsMap.get(row.ptwId) || [
      {
        id: row.approvalId,
        stepOrder: row.stepOrder,
        stepLabel: row.stepLabel,
        status: 'pending',
        approverName: row.approverName,
        approverRole: row.approverRole,
        signatureDataUrl: null,
        remarks: null,
        signedAt: null,
      },
    ]
    const isReverted = (row as any).stepStatus === 'reverted' || approvals.some((a: any) => a.status === 'reverted')
    return {
      id: `ptw-${row.approvalId}`,
      category: 'PTW' as const,
      categoryLabel: 'Izin Kerja (PTW)',
      approvalId: row.approvalId,
      approvalToken: row.approvalToken,
      ptwId: row.ptwId,
      documentNumber: row.permitNumber,
      title: `Izin Kerja: ${row.projectName} (${row.permitType})`,
      isReverted,
      employeeName: row.applicantName || 'Pelaksana Kerja',
      applicantName: row.applicantName || 'Pelaksana Kerja',
      fieldPicName: row.fieldPicName || 'Safety Dept',
      authorizedByName: row.authorizedByName || '',
      location: row.location ? `${row.location}${row.area ? ` - ${row.area}` : ''}` : 'Lokasi Proyek',
      permitType: row.permitType,
      description: row.description || '',
      controlSteps: row.controlSteps || '',
      ppe: row.ppe || ['Helmet', 'Safety Shoes', 'Safety Glasses'],
      gasTestRequired: Boolean(row.gasTestRequired),
      isolationRequired: Boolean(row.isolationRequired),
      approverName: row.approverName,
      approverRole: row.approverRole,
      stepLabel: row.stepLabel || `Step ${row.stepOrder}`,
      startAt: row.startAt,
      endAt: row.endAt,
      submittedAt: row.updatedAt ?? row.createdAt,
      dueAt,
      dueState: getContractReviewDueState(dueAt, new Date()),
      url: `/review/ptw/${row.approvalToken}`,
      approvals,
    }
  })
}

export async function getSopWinRequestInboxItems(
  email: string,
  currentEmployee: Awaited<ReturnType<typeof getEmployeeByEmail>> | null
) {
  const normalizedEmail = normalizeMatchValue(email)
  const normalizedEmployeeName = normalizeMatchValue(currentEmployee?.name)

  const rawRows = await db
    .select({
      approvalId: sopWinRequestApprovals.id,
      approvalToken: sopWinRequestApprovals.approvalToken,
      approverName: sopWinRequestApprovals.approverName,
      approverEmail: sopWinRequestApprovals.approverEmail,
      approverEmployeeId: sopWinRequestApprovals.approverEmployeeId,
      stepOrder: sopWinRequestApprovals.stepOrder,
      stepLabel: sopWinRequestApprovals.stepLabel,
      createdAt: sopWinRequestApprovals.createdAt,
      requestId: sopWinRequests.id,
      requestNumber: sopWinRequests.requestNumber,
      requesterName: sopWinRequests.requesterName,
      requesterEmail: employees.email,
      requesterEmployeeId: sopWinRequests.requesterEmployeeId,
      accessToken: sopWinRequests.accessToken,
      requesterDepartment: sopWinRequests.requesterDepartment,
      requestedDocType: sopWinRequests.requestedDocType,
      procedureName: sopWinRequests.procedureName,
      ownDepartment: sopWinRequests.ownDepartment,
      isProcessOwner: sopWinRequests.isProcessOwner,
      requestDate: sopWinRequests.requestDate,
      isExternal: sopWinRequests.isExternal,
      externalCompany: sopWinRequests.externalCompany,
      externalName: sopWinRequests.externalName,
      requestReason: sopWinRequests.requestReason,
      requestedDocCount: sopWinRequests.requestedDocCount,
      requestedDocTitleAndNumber: sopWinRequests.requestedDocTitleAndNumber,
      fileAttachmentUrl: sopWinRequests.fileAttachmentUrl,
      requestType: sopWinRequests.requestType,
      expiryDays: sopWinRequests.expiryDays,
      status: sopWinRequests.status,
      updatedAt: sopWinRequests.updatedAt,
    })
    .from(sopWinRequestApprovals)
    .innerJoin(
      sopWinRequests,
      eq(sopWinRequestApprovals.requestId, sopWinRequests.id)
    )
    .leftJoin(
      employees,
      eq(sopWinRequests.requesterEmployeeId, employees.id)
    )
    .where(
      and(
        ne(sopWinRequests.status, 'approved'),
        or(
          and(
            ne(sopWinRequests.status, 'reverted'),
            ne(sopWinRequests.status, 'rejected'),
            inArray(sopWinRequestApprovals.status, ['pending', 'submitted'])
          ),
          inArray(sopWinRequests.status, ['reverted', 'rejected', 'Reverted', 'Rejected', 'Returned', 'needs_revision'])
        )
      )
    )
    .orderBy(desc(sopWinRequestApprovals.createdAt))

  const candidateReqIds = [...new Set(rawRows.map((r) => r.requestId))];
  const allReqStepsMap = new Map<number, Array<{ id: number; stepOrder: number; status: string; approverName: string; approverEmail: string; approverEmployeeId: number | null }>>();

  if (candidateReqIds.length > 0) {
    const candidateSteps = await db
      .select({
        id: sopWinRequestApprovals.id,
        requestId: sopWinRequestApprovals.requestId,
        stepOrder: sopWinRequestApprovals.stepOrder,
        status: sopWinRequestApprovals.status,
        approverName: sopWinRequestApprovals.approverName,
        approverEmail: sopWinRequestApprovals.approverEmail,
        approverEmployeeId: sopWinRequestApprovals.approverEmployeeId,
      })
      .from(sopWinRequestApprovals)
      .where(inArray(sopWinRequestApprovals.requestId, candidateReqIds))
      .orderBy(asc(sopWinRequestApprovals.stepOrder));

    for (const s of candidateSteps) {
      const existing = allReqStepsMap.get(s.requestId) || [];
      existing.push(s);
      allReqStepsMap.set(s.requestId, existing);
    }
  }

  const canonicalRows: typeof rawRows = [];
  const processedReqIds = new Set<number>();

  for (const row of rawRows) {
    if (processedReqIds.has(row.requestId)) continue;

    const reqStatusLower = (row.status || '').toLowerCase();
    const steps = allReqStepsMap.get(row.requestId) || [];
    steps.sort((a, b) => a.stepOrder - b.stepOrder);

    if (reqStatusLower === 'reverted' || reqStatusLower === 'rejected') {
      processedReqIds.add(row.requestId);
      const targetStep = steps.find((s) => s.status === 'reverted' || s.status === 'rejected');
      if (targetStep) {
        const stepRow = rawRows.find((r) => r.approvalId === targetStep.id) || row;
        canonicalRows.push(stepRow);
      } else {
        canonicalRows.push(row);
      }
    } else {
      const activeStep = steps.find((s) => s.status !== 'approved');
      if (activeStep && (activeStep.status === 'submitted' || activeStep.status === 'pending')) {
        const prevSteps = steps.filter((s) => s.stepOrder < activeStep.stepOrder);
        const allPrevApproved = prevSteps.length === 0 || prevSteps.every((s) => s.status === 'approved');
        if (allPrevApproved) {
          processedReqIds.add(row.requestId);
          const activeRow = rawRows.find((r) => r.approvalId === activeStep.id);
          if (activeRow) {
            canonicalRows.push(activeRow);
          }
        }
      }
    }
  }
  const isAdmin = checkIsAdmin(email, currentEmployee);

  const filtered = canonicalRows.filter((row) => {
    const reqStatusLower = (row.status || '').toLowerCase();
    const isRevertedOrRejected = reqStatusLower === 'reverted' || reqStatusLower === 'rejected';

    // SCENARIO B: Requester seeing Reverted / Rejected document needing revision
    if (isRevertedOrRejected) {
      const rowReqEmail = normalizeMatchValue(row.requesterEmail);
      const rowReqName = normalizeMatchValue(row.requesterName);

      const emailMatches = normalizedEmail && (
        normalizedEmail === "raihanaraya36@gmail.com" ||
        normalizedEmail === rowReqEmail
      );
      const employeeMatches = currentEmployee?.id != null && (
        row.approverEmployeeId === currentEmployee.id ||
        (row as any).requesterEmployeeId === currentEmployee.id
      );

      const exactNameMatches = Boolean(normalizedEmployeeName && rowReqName && rowReqName === normalizedEmployeeName);

      return emailMatches || employeeMatches || exactNameMatches;
    }

    // SCENARIO A: Active Approver reviewing document in progress
    const rowAppEmail = normalizeMatchValue(row.approverEmail);
    const rowAppName = normalizeMatchValue(row.approverName);
    const rowReqEmail = normalizeMatchValue(row.requesterEmail);

    // If logged-in user IS the requester, they should NOT see their own in-review request in the approval inbox!
    if (normalizedEmail && rowReqEmail === normalizedEmail && rowAppEmail !== normalizedEmail) {
      return false;
    }

    const emailMatches =
      normalizedEmail &&
      (rowAppEmail === normalizedEmail || normalizedEmail === "raihanaraya36@gmail.com");

    const employeeMatches =
      currentEmployee?.id != null && row.approverEmployeeId === currentEmployee.id;

    const exactNameMatches = Boolean(normalizedEmployeeName && rowAppName && rowAppName === normalizedEmployeeName);

    return emailMatches || employeeMatches || exactNameMatches;
  });

  const requestIds = [...new Set(filtered.map((r) => r.requestId))]
  const allReqApprovals =
    requestIds.length > 0
      ? await db
          .select({
            id: sopWinRequestApprovals.id,
            requestId: sopWinRequestApprovals.requestId,
            stepOrder: sopWinRequestApprovals.stepOrder,
            stepLabel: sopWinRequestApprovals.stepLabel,
            status: sopWinRequestApprovals.status,
            approverName: sopWinRequestApprovals.approverName,
            approverEmail: sopWinRequestApprovals.approverEmail,
            signatureDataUrl: sopWinRequestApprovals.signatureDataUrl,
            remarks: sopWinRequestApprovals.remarks,
            signedAt: sopWinRequestApprovals.signedAt,
          })
          .from(sopWinRequestApprovals)
          .where(inArray(sopWinRequestApprovals.requestId, requestIds))
          .orderBy(asc(sopWinRequestApprovals.stepOrder))
      : []

  const reqApprovalsMap = new Map<number, any[]>()
  for (const a of allReqApprovals) {
    const list = reqApprovalsMap.get(a.requestId) || []
    list.push(a)
    reqApprovalsMap.set(a.requestId, list)
  }

  return filtered.map((row) => {
    const createdDate = row.createdAt ? new Date(row.createdAt) : new Date()
    const dueAt = new Date(createdDate.getTime() + 24 * 60 * 60 * 1000)
    const approvals = reqApprovalsMap.get(row.requestId) || []
    return {
      id: `sopwinreq-${row.approvalId}`,
      category: 'SOP_WIN_REQUEST' as const,
      categoryLabel: 'Permintaan Dokumen SOP/WIN',
      approvalId: row.approvalId,
      approvalToken: row.approvalToken,
      requestId: row.requestId,
      documentNumber: row.requestNumber,
      title: `Permintaan Dokumen: ${row.requestedDocTitleAndNumber}`,
      employeeName: row.requesterName || 'Pemohon Dokumen',
      department: row.requesterDepartment || '',
      requestedDocType: row.requestedDocType,
      procedureName: row.procedureName,
      ownDepartment: row.ownDepartment,
      isProcessOwner: row.isProcessOwner,
      requestDate: row.requestDate,
      isExternal: row.isExternal,
      externalCompany: row.externalCompany,
      externalName: row.externalName,
      requestReason: row.requestReason,
      requestedDocCount: row.requestedDocCount,
      requestedDocTitleAndNumber: row.requestedDocTitleAndNumber,
      fileAttachmentUrl: row.fileAttachmentUrl,
      requestType: row.requestType,
      expiryDays: row.expiryDays,
      accessToken: row.accessToken,
      approverName: row.approverName,
      stepLabel: row.stepLabel || `Step ${row.stepOrder}`,
      submittedAt: row.updatedAt ?? row.createdAt,
      dueAt,
      dueState: getContractReviewDueState(dueAt, new Date()),
      url: `/dashboard/approval`,
      approvals,
    }
  })
}

async function withDbRetry<T>(fn: () => Promise<T>, retries = 4, delayMs = 450): Promise<T> {
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (err: any) {
      attempt++
      const errStr = String(err?.message || err?.cause?.message || err || "").toLowerCase()
      const isNetworkError =
        err?.code === 'ECONNRESET' ||
        err?.code === '53300' ||
        errStr.includes('econnreset') ||
        errStr.includes('connection terminated') ||
        errStr.includes('timeout exceeded') ||
        errStr.includes('trying to connect') ||
        errStr.includes('too many clients') ||
        errStr.includes('sorry, too many clients') ||
        errStr.includes('connection reset') ||
        errStr.includes('remaining connection slots are reserved')
      if (attempt <= retries && isNetworkError) {
        await new Promise((res) => setTimeout(res, delayMs * attempt))
        continue
      }
      throw err
    }
  }
}

async function safeQuery<T>(fn: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await withDbRetry(fn)
  } catch (err) {
    console.error(`[getApprovalCenterData] Warning in ${label}:`, (err as any)?.message || err)
    return fallback
  }
}

export async function getApprovalCenterData(email: string) {
  try {
    const now = new Date()
    const currentEmployee = await safeQuery(() => getEmployeeByEmail(email), null, "getEmployeeByEmail")
    const [
      approvalRows,
      contractReviewInboxItems,
      rfrInboxItems,
      dailyActivityInboxItems,
      overtimeInboxItems,
      ptwInboxItems,
      sopWinRequestInboxItems,
    ] = await Promise.all([
      safeQuery(() => fetchApprovalRowsForUser(email, currentEmployee), [], "fetchApprovalRowsForUser"),
      safeQuery(() => getContractReviewInboxItems(email, currentEmployee), [], "getContractReviewInboxItems"),
      safeQuery(() => getRfrInboxItems(email, currentEmployee), [], "getRfrInboxItems"),
      safeQuery(() => getDailyActivityInboxItems(email, currentEmployee), [], "getDailyActivityInboxItems"),
      safeQuery(() => getOvertimeInboxItems(email, currentEmployee), [], "getOvertimeInboxItems"),
      safeQuery(() => getPtwInboxItems(email, currentEmployee), [], "getPtwInboxItems"),
      safeQuery(() => getSopWinRequestInboxItems(email, currentEmployee), [], "getSopWinRequestInboxItems"),
    ])
  const queue = approvalRows
    .map((row) => enrichApprovalRow(row, now))
    .sort(
      (left, right) =>
        (right.submittedAt ? new Date(right.submittedAt).getTime() : 0) -
        (left.submittedAt ? new Date(left.submittedAt).getTime() : 0)
    )

  const normalizedEmail = normalizeMatchValue(email)
  const employeeEmailNorm = normalizeMatchValue(currentEmployee?.email)
  const normalizedEmployeeName = normalizeMatchValue(currentEmployee?.name)
  const isAdmin = checkIsAdmin(email, currentEmployee)

  const inboxRows = queue.filter(
    (item) =>
      item.isPending &&
      ((currentEmployee?.id != null && item.approverEmployeeId === currentEmployee.id) ||
        (normalizedEmail && normalizeMatchValue(item.approverEmail) === normalizedEmail) ||
        (employeeEmailNorm && normalizeMatchValue(item.approverEmail) === employeeEmailNorm) ||
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
        steps?: Array<{
          approvalId: number
          approverName: string
          level: number
          label: string
          status: string
          reviewedAt: Date | null
        }>
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
        fiveRReport?: typeof fiveRReports.$inferSelect | null
        fiveRReportId?: number | null
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
      steps: item.route?.steps?.map((step) => {
        const isCurrent = step.stepOrder === item.level;
        const isPast = step.stepOrder < item.level;
        return {
          approvalId: item.approvalId,
          approverName: step.approverName,
          level: step.stepOrder,
          label: step.label,
          status: isCurrent ? 'pending' : (isPast ? 'approved' : 'waiting'),
          reviewedAt: null,
        };
      }) ?? [],
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
      fiveRReport: item.fiveRReport ?? null,
      fiveRReportId: (item as any).fiveRReportId ?? item.fiveRReport?.id ?? null,
    })
    inboxGroupsMap.set(groupKey, group)
  }

  const inboxGroups = Array.from(inboxGroupsMap.values())
    .map((group) => ({
      ...group,
      totalOvertimeLabel: minutesToHours(group.totalOvertimeMinutes),
      items: (group.items || []).sort(
        (left, right) =>
          (right.submittedAt ? new Date(right.submittedAt).getTime() : 0) -
          (left.submittedAt ? new Date(left.submittedAt).getTime() : 0)
      ),
    }))
    .sort(
      (left, right) =>
        (right.workDate ? new Date(right.workDate).getTime() : 0) -
        (left.workDate ? new Date(left.workDate).getTime() : 0)
    )

  const requestActivityMap = new Map<number, ApprovalQueueItem[]>()
  for (const item of queue) {
    const isUserInvolved =
      isAdmin ||
      normalizeMatchValue(item.requesterEmail) === normalizedEmail ||
      normalizeMatchValue(item.approverEmail) === normalizedEmail ||
      (currentEmployee?.id != null && item.approverEmployeeId === currentEmployee.id) ||
      (normalizedEmployeeName && normalizeMatchValue(item.approverName) === normalizedEmployeeName)

    if (!isUserInvolved) continue

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
        activityId: number | string
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
          approvalId: number | string
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
    if (!seed) continue
    const currentPending = sortedRows.find((item) => item.status === 'pending') ?? null
    const latestApproval = sortedRows[sortedRows.length - 1] ?? null
    const notes = buildApprovalComments(sortedRows)
    const status = mapRequestStatus(seed.activityStatus)
    const seedDate = seed.startTime || seed.createdAt || new Date()
    const groupKey = getDateKey(seedDate)
    const group = historyGroupsMap.get(groupKey) ?? {
      id: groupKey,
      workDate: seedDate,
      workDateLabel: formatDateLabel(seedDate),
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

  // ─── Fetch All Workflow Domain Histories & Associated Step Approvals ──────
  const [allDaSessions, allOtRequests, allPtwPermits, allCrReviews, allSopWinReqs] = await Promise.all([
    safeQuery(
      () =>
        db
          .select({
            id: dailyActivitySessions.id,
            sessionCode: dailyActivitySessions.sessionCode,
            workDate: dailyActivitySessions.workDate,
            shiftCode: dailyActivitySessions.shiftCode,
            status: dailyActivitySessions.status,
            createdAt: dailyActivitySessions.createdAt,
            updatedAt: dailyActivitySessions.updatedAt,
            employeeName: employees.name,
            employeeEmail: employees.email,
            employeeId: dailyActivitySessions.employeeId,
            siteName: sites.name,
          })
          .from(dailyActivitySessions)
          .leftJoin(employees, eq(dailyActivitySessions.employeeId, employees.id))
          .leftJoin(sites, eq(employees.siteId, sites.id))
          .orderBy(desc(dailyActivitySessions.createdAt)),
      [],
      "allDaSessions"
    ),
    safeQuery(
      () =>
        db
          .select({
            id: overtimeCommandLetters.id,
            splNumber: overtimeCommandLetters.splNumber,
            title: overtimeCommandLetters.title,
            workDate: overtimeCommandLetters.workDate,
            status: overtimeCommandLetters.status,
            createdAt: overtimeCommandLetters.createdAt,
            updatedAt: overtimeCommandLetters.updatedAt,
            requesterName: employees.name,
            requesterEmail: employees.email,
            requesterId: overtimeCommandLetters.requestedByEmployeeId,
            siteName: sites.name,
          })
          .from(overtimeCommandLetters)
          .leftJoin(employees, eq(overtimeCommandLetters.requestedByEmployeeId, employees.id))
          .leftJoin(sites, eq(employees.siteId, sites.id))
          .orderBy(desc(overtimeCommandLetters.createdAt)),
      [],
      "allOtRequests"
    ),
    safeQuery(
      () =>
        db
          .select({
            id: hsePtwPermits.id,
            permitNumber: hsePtwPermits.permitNumber,
            projectName: hsePtwPermits.projectName,
            location: hsePtwPermits.location,
            status: hsePtwPermits.status,
            createdAt: hsePtwPermits.createdAt,
            updatedAt: hsePtwPermits.updatedAt,
            applicantName: hsePtwPermits.applicantName,
            applicantEmail: employees.email,
            applicantId: hsePtwPermits.createdByEmployeeId,
          })
          .from(hsePtwPermits)
          .leftJoin(employees, eq(hsePtwPermits.createdByEmployeeId, employees.id))
          .orderBy(desc(hsePtwPermits.createdAt)),
      [],
      "allPtwPermits"
    ),
    safeQuery(
      () =>
        db
          .select({
            id: hcEmployeeContractReviews.id,
            employeeName: hcEmployeeContractReviews.employeeNameStr,
            reviewType: hcEmployeeContractReviews.reviewType,
            status: hcEmployeeContractReviews.status,
            createdAt: hcEmployeeContractReviews.createdAt,
            updatedAt: hcEmployeeContractReviews.updatedAt,
          })
          .from(hcEmployeeContractReviews)
          .orderBy(desc(hcEmployeeContractReviews.createdAt)),
      [],
      "allCrReviews"
    ),
    safeQuery(
      () =>
        db
          .select({
            id: sopWinRequests.id,
            requestNumber: sopWinRequests.requestNumber,
            documentTitle: sopWinRequests.requestedDocTitleAndNumber,
            status: sopWinRequests.status,
            createdAt: sopWinRequests.createdAt,
            updatedAt: sopWinRequests.updatedAt,
            employeeName: employees.name,
            employeeEmail: employees.email,
            requesterEmployeeId: sopWinRequests.requesterEmployeeId,
          })
          .from(sopWinRequests)
          .leftJoin(employees, eq(sopWinRequests.requesterEmployeeId, employees.id))
          .orderBy(desc(sopWinRequests.createdAt)),
      [],
      "allSopWinReqs"
    ),
  ])

  const [allDaApprovals, allOtApprovals, allPtwApprovals, allSopWinApprovals] = await Promise.all([
    safeQuery(
      () =>
        db
          .select({
            id: dailyActivityApprovals.id,
            sessionId: dailyActivityApprovals.sessionId,
            stepOrder: dailyActivityApprovals.stepOrder,
            stepLabel: dailyActivityApprovals.stepLabel,
            status: dailyActivityApprovals.status,
            remarks: dailyActivityApprovals.remarks,
            signedAt: dailyActivityApprovals.signedAt,
            approverEmployeeId: dailyActivityApprovals.approverEmployeeId,
            approverEmail: dailyActivityApprovals.approverEmail,
            approverName: dailyActivityApprovals.approverName,
          })
          .from(dailyActivityApprovals),
      [],
      "allDaApprovals"
    ),
    safeQuery(
      () =>
        db
          .select({
            id: overtimeApprovals.id,
            splId: overtimeApprovals.overtimeCommandLetterId,
            stepOrder: overtimeApprovals.stepOrder,
            stepLabel: overtimeApprovals.stepLabel,
            status: overtimeApprovals.status,
            remarks: overtimeApprovals.remarks,
            signedAt: overtimeApprovals.signedAt,
            approverEmployeeId: overtimeApprovals.approverEmployeeId,
            approverEmail: overtimeApprovals.approverEmail,
            approverName: overtimeApprovals.approverName,
          })
          .from(overtimeApprovals),
      [],
      "allOtApprovals"
    ),
    safeQuery(
      () =>
        db
          .select({
            id: ptwApprovals.id,
            permitId: ptwApprovals.ptwPermitId,
            stepOrder: ptwApprovals.stepOrder,
            stepLabel: ptwApprovals.stepLabel,
            status: ptwApprovals.status,
            remarks: ptwApprovals.remarks,
            signedAt: ptwApprovals.signedAt,
            approverEmployeeId: ptwApprovals.approverEmployeeId,
            approverEmail: ptwApprovals.approverEmail,
            approverName: ptwApprovals.approverName,
          })
          .from(ptwApprovals),
      [],
      "allPtwApprovals"
    ),
    safeQuery(
      () =>
        db
          .select({
            id: sopWinRequestApprovals.id,
            requestId: sopWinRequestApprovals.requestId,
            stepOrder: sopWinRequestApprovals.stepOrder,
            stepLabel: sopWinRequestApprovals.stepLabel,
            status: sopWinRequestApprovals.status,
            remarks: sopWinRequestApprovals.remarks,
            signedAt: sopWinRequestApprovals.signedAt,
            approverEmployeeId: sopWinRequestApprovals.approverEmployeeId,
            approverEmail: sopWinRequestApprovals.approverEmail,
            approverName: sopWinRequestApprovals.approverName,
          })
          .from(sopWinRequestApprovals),
      [],
      "allSopWinApprovals"
    ),
  ])

  const daApprovalsBySessionId = new Map<number, typeof allDaApprovals>()
  const daSessionIdsWhereUserApprover = new Set<number>()
  for (const app of allDaApprovals) {
    const list = daApprovalsBySessionId.get(app.sessionId) ?? []
    list.push(app)
    daApprovalsBySessionId.set(app.sessionId, list)

    const isUserApprover =
      (currentEmployee && app.approverEmployeeId === currentEmployee.id) ||
      (normalizedEmail && normalizeMatchValue(app.approverEmail) === normalizedEmail) ||
      (employeeEmailNorm && normalizeMatchValue(app.approverEmail) === employeeEmailNorm) ||
      (normalizedEmployeeName && normalizeMatchValue(app.approverName) === normalizedEmployeeName)

    if (isUserApprover && ['approved', 'reverted', 'rejected'].includes((app.status || '').toLowerCase())) {
      daSessionIdsWhereUserApprover.add(app.sessionId)
    }
  }

  const otApprovalsBySplId = new Map<number, typeof allOtApprovals>()
  const otSplIdsWhereUserApprover = new Set<number>()
  for (const app of allOtApprovals) {
    const list = otApprovalsBySplId.get(app.splId) ?? []
    list.push(app)
    otApprovalsBySplId.set(app.splId, list)

    const isUserApprover =
      (currentEmployee && app.approverEmployeeId === currentEmployee.id) ||
      (normalizedEmail && normalizeMatchValue(app.approverEmail) === normalizedEmail) ||
      (employeeEmailNorm && normalizeMatchValue(app.approverEmail) === employeeEmailNorm) ||
      (normalizedEmployeeName && normalizeMatchValue(app.approverName) === normalizedEmployeeName)

    if (isUserApprover && ['approved', 'reverted', 'rejected'].includes((app.status || '').toLowerCase())) {
      otSplIdsWhereUserApprover.add(app.splId)
    }
  }

  const ptwApprovalsByPermitId = new Map<number, typeof allPtwApprovals>()
  const ptwIdsWhereUserApprover = new Set<number>()
  for (const app of allPtwApprovals) {
    const list = ptwApprovalsByPermitId.get(app.permitId) ?? []
    list.push(app)
    ptwApprovalsByPermitId.set(app.permitId, list)

    const isUserApprover =
      (currentEmployee && app.approverEmployeeId === currentEmployee.id) ||
      (normalizedEmail && normalizeMatchValue(app.approverEmail) === normalizedEmail) ||
      (employeeEmailNorm && normalizeMatchValue(app.approverEmail) === employeeEmailNorm) ||
      (normalizedEmployeeName && normalizeMatchValue(app.approverName) === normalizedEmployeeName)

    if (isUserApprover && ['approved', 'reverted', 'rejected'].includes((app.status || '').toLowerCase())) {
      ptwIdsWhereUserApprover.add(app.permitId)
    }
  }

  const sopApprovalsByReqId = new Map<number, typeof allSopWinApprovals>()
  const sopReqIdsWhereUserApprover = new Set<number>()
  for (const app of allSopWinApprovals) {
    const list = sopApprovalsByReqId.get(app.requestId) ?? []
    list.push(app)
    sopApprovalsByReqId.set(app.requestId, list)

    const isUserApprover =
      (currentEmployee && app.approverEmployeeId === currentEmployee.id) ||
      (normalizedEmail && normalizeMatchValue(app.approverEmail) === normalizedEmail) ||
      (employeeEmailNorm && normalizeMatchValue(app.approverEmail) === employeeEmailNorm) ||
      (normalizedEmployeeName && normalizeMatchValue(app.approverName) === normalizedEmployeeName)

    if (isUserApprover && ['approved', 'reverted', 'rejected'].includes((app.status || '').toLowerCase())) {
      sopReqIdsWhereUserApprover.add(app.requestId)
    }
  }

  // ─── Daily Activity History ──────────────────────────────────────────────────────
  for (const s of allDaSessions) {
    const isUserInvolved =
      isAdmin ||
      s.employeeId === currentEmployee?.id ||
      normalizeMatchValue(s.employeeEmail) === normalizedEmail ||
      (employeeEmailNorm && normalizeMatchValue(s.employeeEmail) === employeeEmailNorm) ||
      (normalizedEmployeeName && normalizeMatchValue(s.employeeName) === normalizedEmployeeName) ||
      daSessionIdsWhereUserApprover.has(s.id)

    if (!isUserInvolved) continue

    const workDate = s.workDate ? new Date(s.workDate) : s.createdAt
    const groupKey = getDateKey(workDate)
    const stLower = (s.status || '').toLowerCase()
    const mappedStatus =
      stLower === 'approved' || stLower === 'completed'
        ? 'approved'
        : stLower === 'rejected'
        ? 'rejected'
        : stLower === 'reverted'
        ? 'needs_revision'
        : 'in_review'

    const group = historyGroupsMap.get(groupKey) ?? {
      id: groupKey,
      workDate,
      workDateLabel: formatDateLabel(workDate),
      activityCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      revisionCount: 0,
      pendingCount: 0,
      items: [],
    }

    group.activityCount += 1
    if (mappedStatus === 'approved') group.approvedCount += 1
    else if (mappedStatus === 'rejected') group.rejectedCount += 1
    else if (mappedStatus === 'needs_revision') group.revisionCount += 1
    else group.pendingCount += 1

    const sessionSteps = (daApprovalsBySessionId.get(s.id) || []).slice().sort((a, b) => a.stepOrder - b.stepOrder)
    const latestDecisionStep = sessionSteps.filter((st) => ['approved', 'reverted', 'rejected'].includes((st.status || '').toLowerCase())).pop()
    const lastDecision = latestDecisionStep
      ? `${latestDecisionStep.approverName || 'Approver'} (${latestDecisionStep.status})${latestDecisionStep.remarks ? ` - ${latestDecisionStep.remarks}` : ''}`
      : mappedStatus === 'approved'
      ? 'Disetujui secara lengkap'
      : 'Dalam proses review'

    group.items.push({
      activityId: `daily-${s.id}`,
      title: `Daily Activity - ${s.employeeName || 'Teknisi'} (${s.sessionCode})`,
      activityType: 'Daily Activity',
      unitNumber: s.sessionCode,
      siteName: s.siteName || 'Site Operasional',
      priority: 'normal',
      status: mappedStatus,
      statusLabel: s.status || 'Submitted',
      submittedAt: s.updatedAt || s.createdAt,
      timeRange: s.workDate ? new Date(s.workDate).toLocaleDateString('id-ID') : '-',
      shiftLabel: s.shiftCode ? `Shift ${s.shiftCode}` : 'Daily',
      pendingWith: mappedStatus === 'approved' ? 'Completed' : 'Approver',
      currentStepLabel: mappedStatus === 'approved' ? 'Approved' : 'In Review',
      workflowLabel: 'Daily Activity Sequential Workflow',
      lastDecision,
      notes: [],
      steps: sessionSteps.map((st) => ({
        approvalId: st.id,
        approverName: st.approverName || 'Approver',
        level: st.stepOrder,
        label: st.stepLabel,
        status: st.status,
        reviewedAt: st.signedAt,
      })),
    })
    historyGroupsMap.set(groupKey, group)
  }

  // ─── Overtime History ────────────────────────────────────────────────────────────
  for (const ot of allOtRequests) {
    const isUserInvolved =
      isAdmin ||
      ot.requesterId === currentEmployee?.id ||
      normalizeMatchValue(ot.requesterEmail) === normalizedEmail ||
      (employeeEmailNorm && normalizeMatchValue(ot.requesterEmail) === employeeEmailNorm) ||
      (normalizedEmployeeName && normalizeMatchValue(ot.requesterName) === normalizedEmployeeName) ||
      otSplIdsWhereUserApprover.has(ot.id)

    if (!isUserInvolved) continue

    const workDate = ot.workDate ? new Date(ot.workDate) : ot.createdAt
    const groupKey = getDateKey(workDate)
    const stLower = (ot.status || '').toLowerCase()
    const mappedStatus =
      stLower === 'approved'
        ? 'approved'
        : stLower === 'rejected'
        ? 'rejected'
        : stLower === 'reverted'
        ? 'needs_revision'
        : 'in_review'

    const group = historyGroupsMap.get(groupKey) ?? {
      id: groupKey,
      workDate,
      workDateLabel: formatDateLabel(workDate),
      activityCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      revisionCount: 0,
      pendingCount: 0,
      items: [],
    }

    group.activityCount += 1
    if (mappedStatus === 'approved') group.approvedCount += 1
    else if (mappedStatus === 'rejected') group.rejectedCount += 1
    else if (mappedStatus === 'needs_revision') group.revisionCount += 1
    else group.pendingCount += 1

    const splSteps = (otApprovalsBySplId.get(ot.id) || []).slice().sort((a, b) => a.stepOrder - b.stepOrder)
    const latestDecisionStep = splSteps.filter((st) => ['approved', 'reverted', 'rejected'].includes((st.status || '').toLowerCase())).pop()
    const lastDecision = latestDecisionStep
      ? `${latestDecisionStep.approverName || 'Approver'} (${latestDecisionStep.status})${latestDecisionStep.remarks ? ` - ${latestDecisionStep.remarks}` : ''}`
      : mappedStatus === 'approved'
      ? 'Disetujui secara lengkap'
      : 'Dalam proses review'

    group.items.push({
      activityId: `overtime-${ot.id}`,
      title: `Surat Perintah Lembur (SPL) - ${ot.splNumber}`,
      activityType: 'Surat Lembur (SPL)',
      unitNumber: ot.splNumber,
      siteName: ot.siteName || 'Site Operasional',
      priority: 'high',
      status: mappedStatus,
      statusLabel: ot.status || 'Submitted',
      submittedAt: ot.updatedAt || ot.createdAt,
      timeRange: ot.workDate ? new Date(ot.workDate).toLocaleDateString('id-ID') : '-',
      shiftLabel: 'Lembur',
      pendingWith: mappedStatus === 'approved' ? 'Completed' : 'Approver',
      currentStepLabel: mappedStatus === 'approved' ? 'Approved' : 'In Review',
      workflowLabel: 'Overtime SPL Approval Workflow',
      lastDecision,
      notes: [],
      steps: splSteps.map((st) => ({
        approvalId: st.id,
        approverName: st.approverName || 'Approver',
        level: st.stepOrder,
        label: st.stepLabel,
        status: st.status,
        reviewedAt: st.signedAt,
      })),
    })
    historyGroupsMap.set(groupKey, group)
  }

  // ─── PTW History ─────────────────────────────────────────────────────────────────
  for (const ptw of allPtwPermits) {
    const isUserInvolved =
      isAdmin ||
      ptw.applicantId === currentEmployee?.id ||
      normalizeMatchValue(ptw.applicantEmail) === normalizedEmail ||
      (employeeEmailNorm && normalizeMatchValue(ptw.applicantEmail) === employeeEmailNorm) ||
      (normalizedEmployeeName && normalizeMatchValue(ptw.applicantName) === normalizedEmployeeName) ||
      ptwIdsWhereUserApprover.has(ptw.id)

    if (!isUserInvolved) continue

    const workDate = ptw.createdAt
    const groupKey = getDateKey(workDate)
    const stLower = (ptw.status || '').toLowerCase()
    const mappedStatus = stLower === 'approved' ? 'approved' : stLower === 'rejected' ? 'rejected' : 'in_review'

    const group = historyGroupsMap.get(groupKey) ?? {
      id: groupKey,
      workDate,
      workDateLabel: formatDateLabel(workDate),
      activityCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      revisionCount: 0,
      pendingCount: 0,
      items: [],
    }

    group.activityCount += 1
    if (mappedStatus === 'approved') group.approvedCount += 1
    else if (mappedStatus === 'rejected') group.rejectedCount += 1
    else group.pendingCount += 1

    const ptwSteps = (ptwApprovalsByPermitId.get(ptw.id) || []).slice().sort((a, b) => a.stepOrder - b.stepOrder)

    group.items.push({
      activityId: `ptw-${ptw.id}`,
      title: `Izin Kerja (PTW) - ${ptw.permitNumber || ptw.projectName}`,
      activityType: 'Izin Kerja (PTW)',
      unitNumber: ptw.permitNumber || `PTW-${ptw.id}`,
      siteName: ptw.location || 'Site Operasional',
      priority: 'urgent',
      status: mappedStatus,
      statusLabel: ptw.status || 'Submitted',
      submittedAt: ptw.updatedAt || ptw.createdAt,
      timeRange: ptw.createdAt ? new Date(ptw.createdAt).toLocaleDateString('id-ID') : '-',
      shiftLabel: 'HSE PTW',
      pendingWith: mappedStatus === 'approved' ? 'Completed' : 'HSE Approver',
      currentStepLabel: mappedStatus === 'approved' ? 'Approved' : 'In Review',
      workflowLabel: 'PTW Permit Approval Workflow',
      lastDecision: mappedStatus === 'approved' ? 'Disetujui secara lengkap' : 'Dalam proses review',
      notes: [],
      steps: ptwSteps.map((st) => ({
        approvalId: st.id,
        approverName: st.approverName || 'Approver',
        level: st.stepOrder,
        label: st.stepLabel,
        status: st.status,
        reviewedAt: st.signedAt,
      })),
    })
    historyGroupsMap.set(groupKey, group)
  }

  // ─── Contract Review History ─────────────────────────────────────────────────────
  for (const cr of allCrReviews) {
    const isUserInvolved = isAdmin || (normalizedEmployeeName && normalizeMatchValue(cr.employeeName) === normalizedEmployeeName)
    if (!isUserInvolved) continue

    const workDate = cr.createdAt
    const groupKey = getDateKey(workDate)
    const stLower = (cr.status || '').toLowerCase()
    const mappedStatus = stLower === 'approved' ? 'approved' : stLower === 'rejected' ? 'rejected' : 'in_review'

    const group = historyGroupsMap.get(groupKey) ?? {
      id: groupKey,
      workDate,
      workDateLabel: formatDateLabel(workDate),
      activityCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      revisionCount: 0,
      pendingCount: 0,
      items: [],
    }

    group.activityCount += 1
    if (mappedStatus === 'approved') group.approvedCount += 1
    else if (mappedStatus === 'rejected') group.rejectedCount += 1
    else group.pendingCount += 1

    group.items.push({
      activityId: `cr-${cr.id}`,
      title: `Contract Review - ${cr.employeeName}`,
      activityType: 'Contract Review',
      unitNumber: `CR-${cr.id}`,
      siteName: 'Head Office / Site',
      priority: 'normal',
      status: mappedStatus,
      statusLabel: cr.status || 'Submitted',
      submittedAt: cr.updatedAt || cr.createdAt,
      timeRange: cr.createdAt ? new Date(cr.createdAt).toLocaleDateString('id-ID') : '-',
      shiftLabel: 'HC Review',
      pendingWith: mappedStatus === 'approved' ? 'Completed' : 'HC Manager',
      currentStepLabel: mappedStatus === 'approved' ? 'Approved' : 'In Review',
      workflowLabel: 'Contract Review Workflow',
      lastDecision: mappedStatus === 'approved' ? 'Disetujui secara lengkap' : 'Dalam proses review',
      notes: [],
      steps: [],
    })
    historyGroupsMap.set(groupKey, group)
  }

  // ─── SOP/WIN History ─────────────────────────────────────────────────────────────
  for (const sr of allSopWinReqs) {
    const isUserInvolved =
      isAdmin ||
      sr.requesterEmployeeId === currentEmployee?.id ||
      normalizeMatchValue(sr.employeeEmail) === normalizedEmail ||
      (employeeEmailNorm && normalizeMatchValue(sr.employeeEmail) === employeeEmailNorm) ||
      (normalizedEmployeeName && normalizeMatchValue(sr.employeeName) === normalizedEmployeeName) ||
      sopReqIdsWhereUserApprover.has(sr.id)

    if (!isUserInvolved) continue

    const workDate = sr.createdAt
    const groupKey = getDateKey(workDate)
    const stLower = (sr.status || '').toLowerCase()
    const mappedStatus =
      stLower === 'approved'
        ? 'approved'
        : stLower === 'rejected'
        ? 'rejected'
        : stLower === 'reverted'
        ? 'needs_revision'
        : 'in_review'

    const group = historyGroupsMap.get(groupKey) ?? {
      id: groupKey,
      workDate,
      workDateLabel: formatDateLabel(workDate),
      activityCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      revisionCount: 0,
      pendingCount: 0,
      items: [],
    }

    group.activityCount += 1
    if (mappedStatus === 'approved') group.approvedCount += 1
    else if (mappedStatus === 'rejected') group.rejectedCount += 1
    else if (mappedStatus === 'needs_revision') group.revisionCount += 1
    else group.pendingCount += 1

    const sopSteps = (sopApprovalsByReqId.get(sr.id) || []).slice().sort((a, b) => a.stepOrder - b.stepOrder)

    group.items.push({
      activityId: `sop-${sr.id}`,
      title: `Akses Dokumen SOP/WIN - ${sr.documentTitle || sr.requestNumber}`,
      activityType: 'SOP & WIN Request',
      unitNumber: sr.requestNumber,
      siteName: 'Head Office',
      priority: 'normal',
      status: mappedStatus,
      statusLabel: sr.status || 'Submitted',
      submittedAt: sr.updatedAt || sr.createdAt,
      timeRange: sr.createdAt ? new Date(sr.createdAt).toLocaleDateString('id-ID') : '-',
      shiftLabel: 'SOP/WIN',
      pendingWith: mappedStatus === 'approved' ? 'Completed' : 'Dept Approver',
      currentStepLabel: mappedStatus === 'approved' ? 'Approved' : 'In Review',
      workflowLabel: 'SOP / WIN Dynamic Approval Workflow',
      lastDecision: mappedStatus === 'approved' ? 'Disetujui secara lengkap' : 'Dalam proses review',
      notes: [],
      steps: sopSteps.map((st) => ({
        approvalId: st.id,
        approverName: st.approverName || 'Approver',
        level: st.stepOrder,
        label: st.stepLabel,
        status: st.status,
        reviewedAt: st.signedAt,
      })),
    })
    historyGroupsMap.set(groupKey, group)
  }

  const historyGroups = Array.from(historyGroupsMap.values())
    .map((group) => ({
      ...group,
      items: (group.items || []).sort(
        (left, right) =>
          (right.submittedAt ? new Date(right.submittedAt).getTime() : 0) -
          (left.submittedAt ? new Date(left.submittedAt).getTime() : 0)
      ),
    }))
    .sort(
      (left, right) =>
        (right.workDate ? new Date(right.workDate).getTime() : 0) -
        (left.workDate ? new Date(left.workDate).getTime() : 0)
    )

  const historyItems = historyGroups.flatMap((group) => group.items)

  const totalPendingWorkflowItems =
    contractReviewInboxItems.length +
    rfrInboxItems.length +
    dailyActivityInboxItems.length +
    overtimeInboxItems.length +
    ptwInboxItems.length +
    sopWinRequestInboxItems.length

  const dueSoonWorkflowItems =
    contractReviewInboxItems.filter((item) => item.dueState === 'due_soon').length +
    rfrInboxItems.filter((item) => item.dueState === 'due_soon').length +
    dailyActivityInboxItems.filter((item) => item.dueState === 'due_soon').length +
    overtimeInboxItems.filter((item) => item.dueState === 'due_soon').length +
    ptwInboxItems.filter((item) => item.dueState === 'due_soon').length +
    sopWinRequestInboxItems.filter((item) => item.dueState === 'due_soon').length

  const overdueWorkflowItems =
    contractReviewInboxItems.filter((item) => item.dueState === 'overdue').length +
    rfrInboxItems.filter((item) => item.dueState === 'overdue').length +
    dailyActivityInboxItems.filter((item) => item.dueState === 'overdue').length +
    overtimeInboxItems.filter((item) => item.dueState === 'overdue').length +
    ptwInboxItems.filter((item) => item.dueState === 'overdue').length +
    sopWinRequestInboxItems.filter((item) => item.dueState === 'overdue').length

  return {
    currentUserName: currentEmployee?.name ?? email,
    inboxMetrics: {
      pendingGroups: inboxGroups.length + totalPendingWorkflowItems,
      pendingActivities: inboxRows.length + totalPendingWorkflowItems,
      dueSoon:
        inboxRows.filter((item) => item.dueState === 'due_soon').length + dueSoonWorkflowItems,
      overdue:
        inboxRows.filter((item) => item.dueState === 'overdue').length + overdueWorkflowItems,
      dailyActivityCount: dailyActivityInboxItems.length,
      overtimeCount: overtimeInboxItems.length,
      ptwCount: ptwInboxItems.length,
      sopWinRequestCount: sopWinRequestInboxItems.length,
      contractReviewCount: contractReviewInboxItems.length,
      rfrCount: rfrInboxItems.length,
      generalActivityCount: inboxRows.length,
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
    rfrInboxItems,
    dailyActivityInboxItems,
    overtimeInboxItems,
    ptwInboxItems,
    sopWinRequestInboxItems,
    inboxGroups,
    historyGroups,
  }
  } catch (err) {
    console.error('[getApprovalCenterData] Server Exception:', (err as any)?.stack || err)
    return {
      currentUserName: email || 'User',
      inboxMetrics: {
        pendingGroups: 0,
        pendingActivities: 0,
        dueSoon: 0,
        overdue: 0,
        dailyActivityCount: 0,
        overtimeCount: 0,
        ptwCount: 0,
        sopWinRequestCount: 0,
        contractReviewCount: 0,
        generalActivityCount: 0,
      },
      historyMetrics: {
        total: 0,
        approved: 0,
        rejected: 0,
        needsRevision: 0,
        inReview: 0,
      },
      contractReviewInboxItems: [],
      dailyActivityInboxItems: [],
      overtimeInboxItems: [],
      ptwInboxItems: [],
      sopWinRequestInboxItems: [],
      inboxGroups: [],
      historyGroups: [],
    }
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
    (left, right) =>
      (right.lastUpdatedAt ? new Date(right.lastUpdatedAt).getTime() : 0) -
      (left.lastUpdatedAt ? new Date(left.lastUpdatedAt).getTime() : 0)
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
    safeQuery(() => db.select().from(orgChartStructures), [], "orgChartStructures"),
    safeQuery(() => db.select().from(approvalMatrices), [], "approvalMatrices"),
    safeQuery(() => db.select().from(approvalMatrixSteps), [], "approvalMatrixSteps"),
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
    safeQuery(() => db.select().from(orgChartStructures), [], "orgChartStructures"),
    safeQuery(() => db.select().from(approvalMatrices), [], "approvalMatrices"),
    safeQuery(() => db.select().from(approvalMatrixSteps), [], "approvalMatrixSteps"),
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

