import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import {
  employees,
  masterDepartments,
  masterSections,
  overtimeApprovals,
  overtimeCommandLetters,
  overtimeCommandLetterItems,
  overtimeCommandLetterParticipants,
  sites,
} from '@/db/schema/hero'
import { asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { OvertimeListingClient, type OvertimeListingRow } from './client'
import { getOvertimeWorkflowSettings } from './actions'
import { getCurrentEmployee } from '@/lib/get-current-employee'

export const metadata = {
  title: 'Overtime Requests Approval - HERO',
}

// Overtime Requests Server Page
export default async function OvertimeRequestsPage() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    redirect('/sign-in')
  }

  const activeEmployee = await getCurrentEmployee()
  const userRole = ((session?.user as any)?.role || '').toLowerCase()
  const accessRole = (activeEmployee?.accessRole || '').toLowerCase()
  const isAdmin =
    userRole === 'admin' ||
    userRole === 'superadmin' ||
    userRole === 'super admin' ||
    accessRole === 'admin' ||
    accessRole === 'super admin' ||
    accessRole === 'superadmin' ||
    accessRole === 'system administrator' ||
    accessRole === 'khusus mas rendi' ||
    accessRole === 'hc manager' ||
    accessRole === 'hr'

  const isSiteAdmin = accessRole === 'site admin'

  const [rawSplRecords, allEmployees, rawSections, rawDepartments, rawSites] = await Promise.all([
    db
      .select({
        id: overtimeCommandLetters.id,
        splNumber: overtimeCommandLetters.splNumber,
        title: overtimeCommandLetters.title,
        workDate: overtimeCommandLetters.workDate,
        plannedStartAt: overtimeCommandLetters.plannedStartAt,
        plannedEndAt: overtimeCommandLetters.plannedEndAt,
        status: overtimeCommandLetters.status,
        requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
        requesterName: employees.name,
        requesterDepartment: masterDepartments.name,
        requesterSection: employees.section,
        siteId: employees.siteId,
        requestNotes: overtimeCommandLetters.requestNotes,
      })
      .from(overtimeCommandLetters)
      .leftJoin(employees, eq(overtimeCommandLetters.requestedByEmployeeId, employees.id))
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .orderBy(desc(overtimeCommandLetters.id)),
    db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        employeeId: employees.employeeSn,
        position: employees.jobTitle,
        rank: employees.role,
        department: employees.department,
        section: employees.section,
        directManagerId: employees.directManagerId,
        sectionId: employees.sectionId,
        departmentId: employees.departmentId,
        siteId: employees.siteId,
      })
      .from(employees)
      .where(eq(employees.isActive, true)),
    db.select({ id: masterSections.id, name: masterSections.name, headEmployeeId: masterSections.headEmployeeId }).from(masterSections),
    db.select({ id: masterDepartments.id, name: masterDepartments.name, headEmployeeId: masterDepartments.headEmployeeId }).from(masterDepartments),
    db.select({ id: sites.id, name: sites.name, headEmployeeId: sites.headEmployeeId }).from(sites),
  ])

  const sectionHeadById = new Map(rawSections.map((s) => [s.id, s.headEmployeeId]))
  const sectionHeadByName = new Map(rawSections.map((s) => [s.name.toLowerCase().trim(), s.headEmployeeId]))
  const deptHeadById = new Map(rawDepartments.map((d) => [d.id, d.headEmployeeId]))
  const deptHeadByName = new Map(rawDepartments.map((d) => [d.name.toLowerCase().trim(), d.headEmployeeId]))
  const siteHeadById = new Map(rawSites.map((s) => [s.id, s.headEmployeeId]))

  const enrichedEmployees = allEmployees.map((e) => ({
    ...e,
    sectionHeadId: e.sectionId ? (sectionHeadById.get(e.sectionId) ?? null) : (e.section ? (sectionHeadByName.get(e.section.toLowerCase().trim()) ?? null) : null),
    deptHeadId: e.departmentId ? (deptHeadById.get(e.departmentId) ?? null) : (e.department ? (deptHeadByName.get(e.department.toLowerCase().trim()) ?? null) : null),
    siteHeadId: e.siteId ? (siteHeadById.get(e.siteId) ?? null) : null,
  }))

  const rawSplIds = rawSplRecords.map((r) => r.id)

  const [rawApprovalsList, rawParticipantsList] = await Promise.all([
    rawSplIds.length > 0
      ? db
          .select({
            overtimeCommandLetterId: overtimeApprovals.overtimeCommandLetterId,
            stepOrder: overtimeApprovals.stepOrder,
            stepLabel: overtimeApprovals.stepLabel,
            status: overtimeApprovals.status,
            approverName: overtimeApprovals.approverName,
            approverEmail: overtimeApprovals.approverEmail,
            approverEmployeeId: overtimeApprovals.approverEmployeeId,
            signatureDataUrl: overtimeApprovals.signatureDataUrl,
            remarks: overtimeApprovals.remarks,
            signedAt: overtimeApprovals.signedAt,
          })
          .from(overtimeApprovals)
          .where(inArray(overtimeApprovals.overtimeCommandLetterId, rawSplIds))
          .orderBy(asc(overtimeApprovals.stepOrder))
      : [],
    rawSplIds.length > 0
      ? db
          .select({
            overtimeCommandLetterId: overtimeCommandLetterParticipants.overtimeCommandLetterId,
            employeeId: overtimeCommandLetterParticipants.employeeId,
            employeeName: employees.name,
            shiftCode: overtimeCommandLetterParticipants.shiftCode,
            rosterType: overtimeCommandLetterParticipants.rosterType,
            category: overtimeCommandLetterParticipants.category,
          })
          .from(overtimeCommandLetterParticipants)
          .leftJoin(employees, eq(overtimeCommandLetterParticipants.employeeId, employees.id))
          .where(inArray(overtimeCommandLetterParticipants.overtimeCommandLetterId, rawSplIds))
      : [],
  ])

  const approvalsBySplMap = new Map<number, (typeof rawApprovalsList)[number][]>()
  for (const a of rawApprovalsList) {
    if (!approvalsBySplMap.has(a.overtimeCommandLetterId)) {
      approvalsBySplMap.set(a.overtimeCommandLetterId, [])
    }
    approvalsBySplMap.get(a.overtimeCommandLetterId)!.push(a)
  }

  const participantsBySplMap = new Map<number, (typeof rawParticipantsList)[number][]>()
  for (const p of rawParticipantsList) {
    if (!participantsBySplMap.has(p.overtimeCommandLetterId)) {
      participantsBySplMap.set(p.overtimeCommandLetterId, [])
    }
    participantsBySplMap.get(p.overtimeCommandLetterId)!.push(p)
  }

  // Row-Level Security (RLS) Filter: Admin sees ALL, users strictly see their own / assigned documents
  const normalizedEmail = (session?.user?.email || activeEmployee?.email || '').trim().toLowerCase()
  const splRecords = rawSplRecords.filter((r) => {
    if (isAdmin) return true
    if (isSiteAdmin && activeEmployee?.siteId) return r.siteId === activeEmployee.siteId

    // Requester / Creator
    if (activeEmployee?.id && r.requestedByEmployeeId === activeEmployee.id) return true

    // Participant Worker in this SPL
    const splParts = participantsBySplMap.get(r.id) || []
    if (activeEmployee?.id && splParts.some((p) => p.employeeId === activeEmployee.id)) return true

    // Assigned approver for any step of this SPL
    const splApps = approvalsBySplMap.get(r.id) || []
    const isAssignedApprover = splApps.some(
      (a) =>
        (activeEmployee?.id && a.approverEmployeeId === activeEmployee.id) ||
        (a.approverEmail && a.approverEmail.trim().toLowerCase() === normalizedEmail) ||
        (activeEmployee?.name && a.approverName && a.approverName.trim().toLowerCase() === activeEmployee.name.trim().toLowerCase())
    )
    if (isAssignedApprover) return true

    // Section Head / Leader
    const jobTitleLower = (activeEmployee?.jobTitle || '').toLowerCase()
    const isSectionHeadOrLeader = jobTitleLower.includes('section head') || jobTitleLower.includes('leader') || jobTitleLower.includes('supervisor') || jobTitleLower.includes('foreman')
    if (isSectionHeadOrLeader && activeEmployee?.section && r.requesterSection === activeEmployee.section) return true

    const isDeptHeadOrManager = jobTitleLower.includes('dept') || jobTitleLower.includes('department head') || jobTitleLower.includes('manager')
    if (isDeptHeadOrManager && activeEmployee?.department && r.requesterDepartment === activeEmployee.department) return true

    return false
  })

  const splIds = splRecords.map((r) => r.id)
  const approvalsList = rawApprovalsList.filter((a) => splIds.includes(a.overtimeCommandLetterId))

  const [participantsList, itemsList] = await Promise.all([
    splIds.length > 0
      ? db
          .select({
            overtimeCommandLetterId: overtimeCommandLetterParticipants.overtimeCommandLetterId,
            employeeName: employees.name,
            shiftCode: overtimeCommandLetterParticipants.shiftCode,
            rosterType: overtimeCommandLetterParticipants.rosterType,
            category: overtimeCommandLetterParticipants.category,
          })
          .from(overtimeCommandLetterParticipants)
          .leftJoin(employees, eq(overtimeCommandLetterParticipants.employeeId, employees.id))
          .where(inArray(overtimeCommandLetterParticipants.overtimeCommandLetterId, splIds))
      : [],
    splIds.length > 0
      ? db
          .select({
            overtimeCommandLetterId: overtimeCommandLetterItems.overtimeCommandLetterId,
            lineLabel: overtimeCommandLetterItems.lineLabel,
            targetUnit: overtimeCommandLetterItems.targetUnit,
            estimatedMinutes: overtimeCommandLetterItems.estimatedMinutes,
            plannedPoints: overtimeCommandLetterItems.plannedPoints,
          })
          .from(overtimeCommandLetterItems)
          .where(inArray(overtimeCommandLetterItems.overtimeCommandLetterId, splIds))
      : [],
  ])

  const approvalsMap = new Map<number, OvertimeListingRow['approvals']>()
  for (const a of approvalsList) {
    const list = approvalsMap.get(a.overtimeCommandLetterId) || []
    list.push({
      stepOrder: Number(a.stepOrder) || 1,
      stepLabel: a.stepLabel || '',
      status: a.status || 'waiting',
      approverName: a.approverName || '',
      signatureDataUrl: a.signatureDataUrl || null,
      remarks: a.remarks || null,
      signedAt: a.signedAt ? new Date(a.signedAt).toISOString() : null,
    })
    approvalsMap.set(a.overtimeCommandLetterId, list)
  }

  const participantsMap = new Map<number, any[]>()
  for (const p of participantsList) {
    const list = participantsMap.get(p.overtimeCommandLetterId) || []
    list.push({
      employeeName: p.employeeName || 'Karyawan',
      shiftCode: p.shiftCode || 'DS',
      rosterType: p.rosterType || '5:2',
      category: p.category || 'after_mandatory_ot',
    })
    participantsMap.set(p.overtimeCommandLetterId, list)
  }

  const itemsMap = new Map<number, any[]>()
  for (const item of itemsList) {
    const list = itemsMap.get(item.overtimeCommandLetterId) || []
    list.push({
      lineLabel: item.lineLabel || 'Aktivitas Lembur',
      targetUnit: item.targetUnit || '—',
      estimatedMinutes: Number(item.estimatedMinutes) || 60,
      plannedPoints: Number(item.plannedPoints) || 0,
    })
    itemsMap.set(item.overtimeCommandLetterId, list)
  }

  const rows: OvertimeListingRow[] = splRecords.map((r) => {
    const parts = participantsMap.get(r.id) || []
    return {
      id: Number(r.id),
      splNumber: r.splNumber || `SPL-${r.id}`,
      title: r.title || 'Surat Perintah Lembur',
      workDate: r.workDate ? new Date(r.workDate).toISOString() : new Date().toISOString(),
      plannedStartAt: r.plannedStartAt ? new Date(r.plannedStartAt).toISOString() : null,
      plannedEndAt: r.plannedEndAt ? new Date(r.plannedEndAt).toISOString() : null,
      status: r.status || 'draft',
      requesterName: r.requesterName || 'Pemohon',
      requesterDepartment: r.requesterDepartment || 'Central Services',
      requestNotes: r.requestNotes || null,
      workerCount: parts.length,
      participants: parts,
      lineItems: itemsMap.get(r.id) || [],
      approvals: approvalsMap.get(r.id) || [],
    }
  }) as any

  const sanitizedEmployees = (enrichedEmployees || []).map((e) => ({
    id: Number(e.id),
    name: e.name || '',
    email: e.email || '',
    employeeId: e.employeeId || '',
    position: e.position || '',
    rank: e.rank || '',
    department: e.department || '',
    section: e.section || '',
    directManagerId: e.directManagerId ? Number(e.directManagerId) : null,
    sectionId: e.sectionId ? Number(e.sectionId) : null,
    departmentId: e.departmentId ? Number(e.departmentId) : null,
    siteId: e.siteId ? Number(e.siteId) : null,
    sectionHeadId: e.sectionHeadId ? Number(e.sectionHeadId) : null,
    deptHeadId: e.deptHeadId ? Number(e.deptHeadId) : null,
    siteHeadId: e.siteHeadId ? Number(e.siteHeadId) : null,
  }))

  const initialSettings = await getOvertimeWorkflowSettings()

  return <OvertimeListingClient rows={rows} employees={sanitizedEmployees} initialSettings={initialSettings} />
}
