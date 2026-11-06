import { asc, eq } from 'drizzle-orm'

import { db } from '@/db'
import {
  employees,
  masterDepartments,
  overtimeApprovals,
  overtimeCommandLetterItems,
  overtimeCommandLetterParticipants,
  overtimeCommandLetters,
} from '@/db/schema/hero'
import {
  getCurrentEmployeeAccessContext,
  getCurrentMenuPermission,
  hasGlobalDataAccess,
  type HeroMenuPermission,
} from '@/lib/hero-access'

export type SchedulingSplDocumentAccess = {
  allowed: boolean
  documentId: number
  siteId: number | null
  participantEmployeeIds: number[]
  ownEmployeeId: number | null
}

export type SchedulingSplDocumentView = SchedulingSplDocumentAccess & {
  splNumber: string
  title: string
  workDate: Date | string
  plannedStartAt: Date | string | null
  plannedEndAt: Date | string | null
  status: string
  requestNotes: string
  requesterName: string
  requesterDepartment: string
  participants: Array<{ employeeId: number; employeeName: string; category: string; shiftCode: string; rosterType: string }>
  lineItems: Array<{ label: string; description: string; estimatedMinutes: number; targetUnit: string; plannedPoints: number }>
  approvals: Array<{
    stepOrder: number
    stepLabel: string
    approverName: string
    approverRole: string
    status: string
    signatureDataUrl: string | null
    signedAt: Date | string | null
    remarks: string
  }>
}

/**
 * Entry-point guard for read-only SPL links originating from attendance.
 * Keep this separate from the approval page because that page may provision
 * missing approval rows and is intentionally not a read-only data boundary.
 */
export async function getSchedulingSplDocumentAccess(
  documentId: number | string,
): Promise<SchedulingSplDocumentAccess | null> {
  const id = typeof documentId === 'number' ? documentId : Number(documentId)
  if (!Number.isInteger(id) || id <= 0) return null

  const [permission, context] = await Promise.all([
    getCurrentMenuPermission('scheduling_timesheet_attendance'),
    getCurrentEmployeeAccessContext(),
  ])
  if (!permission.canView || !context) return null

  const [document] = await db
    .select({
      id: overtimeCommandLetters.id,
      siteId: overtimeCommandLetters.siteId,
      status: overtimeCommandLetters.status,
    })
    .from(overtimeCommandLetters)
    .where(eq(overtimeCommandLetters.id, id))
    .limit(1)

  if (!document || String(document.status).toLowerCase() !== 'approved') {
    return null
  }

  const participants = await db
    .select({ employeeId: overtimeCommandLetterParticipants.employeeId })
    .from(overtimeCommandLetterParticipants)
    .where(eq(overtimeCommandLetterParticipants.overtimeCommandLetterId, id))

  const participantEmployeeIds = participants
    .map((row) => row.employeeId)
    .filter((employeeId): employeeId is number => Number.isInteger(employeeId))

  const scopeAllowed = isSchedulingSplScopeAllowed(
    permission,
    context.employeeId,
    context.siteId,
    document.siteId,
    participantEmployeeIds,
  )

  return scopeAllowed
    ? { allowed: true, documentId: id, siteId: document.siteId, participantEmployeeIds, ownEmployeeId: permission.dataScope === 'own' ? context.employeeId : null }
    : null
}

/** Read-only document projection. It never calls the approval loader because
 * that loader can create missing approval rows as part of its legacy flow. */
export async function getSchedulingSplDocumentView(
  documentId: number | string,
): Promise<SchedulingSplDocumentView | null> {
  const access = await getSchedulingSplDocumentAccess(documentId)
  if (!access) return null
  const id = access.documentId

  const [document] = await db
    .select({
      splNumber: overtimeCommandLetters.splNumber,
      title: overtimeCommandLetters.title,
      workDate: overtimeCommandLetters.workDate,
      plannedStartAt: overtimeCommandLetters.plannedStartAt,
      plannedEndAt: overtimeCommandLetters.plannedEndAt,
      status: overtimeCommandLetters.status,
      requestNotes: overtimeCommandLetters.requestNotes,
      requesterName: employees.name,
      requesterDepartment: masterDepartments.name,
    })
    .from(overtimeCommandLetters)
    .leftJoin(employees, eq(employees.id, overtimeCommandLetters.requestedByEmployeeId))
    .leftJoin(masterDepartments, eq(masterDepartments.id, employees.departmentId))
    .where(eq(overtimeCommandLetters.id, id))
    .limit(1)
  if (!document) return null
  if (document.status.toLowerCase() !== 'approved') return null

  const [participants, lineItems, approvals] = await Promise.all([
    db
      .select({
        employeeId: overtimeCommandLetterParticipants.employeeId,
        employeeName: employees.name,
        category: overtimeCommandLetterParticipants.category,
        shiftCode: overtimeCommandLetterParticipants.shiftCode,
        rosterType: overtimeCommandLetterParticipants.rosterType,
      })
      .from(overtimeCommandLetterParticipants)
      .leftJoin(employees, eq(employees.id, overtimeCommandLetterParticipants.employeeId))
      .where(eq(overtimeCommandLetterParticipants.overtimeCommandLetterId, id)),
    db
      .select({
        label: overtimeCommandLetterItems.lineLabel,
        description: overtimeCommandLetterItems.lineDescription,
        estimatedMinutes: overtimeCommandLetterItems.estimatedMinutes,
        targetUnit: overtimeCommandLetterItems.targetUnit,
        plannedPoints: overtimeCommandLetterItems.plannedPoints,
        assignedEmployeeId: overtimeCommandLetterItems.assignedEmployeeId,
      })
      .from(overtimeCommandLetterItems)
      .where(eq(overtimeCommandLetterItems.overtimeCommandLetterId, id))
      .orderBy(asc(overtimeCommandLetterItems.sortOrder)),
    db
      .select({
        stepOrder: overtimeApprovals.stepOrder,
        stepLabel: overtimeApprovals.stepLabel,
        approverName: overtimeApprovals.approverName,
        approverRole: overtimeApprovals.approverRole,
        status: overtimeApprovals.status,
        signatureDataUrl: overtimeApprovals.signatureDataUrl,
        signedAt: overtimeApprovals.signedAt,
        remarks: overtimeApprovals.remarks,
      })
      .from(overtimeApprovals)
      .where(eq(overtimeApprovals.overtimeCommandLetterId, id))
      .orderBy(asc(overtimeApprovals.stepOrder)),
  ])

  return {
    ...access,
    splNumber: document.splNumber,
    title: document.title,
    workDate: document.workDate,
    plannedStartAt: document.plannedStartAt,
    plannedEndAt: document.plannedEndAt,
    status: document.status,
    requestNotes: document.requestNotes,
    requesterName: document.requesterName ?? '',
    requesterDepartment: document.requesterDepartment ?? '',
    participants: participants.filter((item) => access.ownEmployeeId == null || item.employeeId === access.ownEmployeeId).map((item) => ({
      employeeId: item.employeeId,
      employeeName: item.employeeName ?? '',
      category: item.category,
      shiftCode: item.shiftCode,
      rosterType: item.rosterType,
    })),
    lineItems: lineItems.filter((item) => access.ownEmployeeId == null || item.assignedEmployeeId == null || item.assignedEmployeeId === access.ownEmployeeId),
    approvals,
  }
}

function isSchedulingSplScopeAllowed(
  permission: Pick<HeroMenuPermission, 'dataScope' | 'canSelectAll'>,
  employeeId: number,
  employeeSiteId: number,
  documentSiteId: number | null,
  participantEmployeeIds: number[],
) {
  if (hasGlobalDataAccess(permission)) return true
  if (permission.dataScope === 'site') return documentSiteId === employeeSiteId
  return participantEmployeeIds.includes(employeeId)
}
