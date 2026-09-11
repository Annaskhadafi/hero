import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import {
  employees,
  hsePtwPermits,
  ptwApprovals,
} from '@/db/schema/hero'
import { asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { withDbRetry } from '@/lib/hero-admin'
import { PtwListingClient, type PtwListingRow } from './client'
import { getPtwWorkflowSettings } from './actions'

export const metadata = {
  title: 'Izin Kerja PTW Approval - HERO',
}

export default async function IzinKerjaPtwPage() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    redirect('/sign-in')
  }

  const normalizedEmail = session.user.email.trim().toLowerCase()
  const [currentEmployee] = await withDbRetry(() =>
    db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        accessRole: employees.accessRole,
        jobTitle: employees.jobTitle,
        department: employees.department,
        section: employees.section,
        siteId: employees.siteId,
      })
      .from(employees)
      .where(sql`lower(${employees.email}) = ${normalizedEmail}`)
      .limit(1)
  )

  const isSuperAdmin = currentEmployee?.accessRole === 'Super Admin'
  const isSiteAdmin = currentEmployee?.accessRole === 'Site Admin'
  const isHseOrAdmin = currentEmployee?.accessRole && ['HSE Manager', 'Safety Officer', 'Admin'].includes(currentEmployee.accessRole)
  const isGlobalAdmin = isSuperAdmin || isHseOrAdmin

  const [rawPtwRecords, allEmployees, initialSettings] = await Promise.all([
    withDbRetry(() =>
      db
        .select({
          id: hsePtwPermits.id,
          permitNumber: hsePtwPermits.permitNumber,
          projectName: hsePtwPermits.projectName,
          permitType: hsePtwPermits.permitType,
          location: hsePtwPermits.location,
          area: hsePtwPermits.area,
          startAt: hsePtwPermits.startAt,
          endAt: hsePtwPermits.endAt,
          status: hsePtwPermits.status,
          riskLevel: hsePtwPermits.riskLevel,
          applicantName: hsePtwPermits.applicantName,
          fieldPicName: hsePtwPermits.fieldPicName,
          authorizedByName: hsePtwPermits.authorizedByName,
          description: hsePtwPermits.description,
          controlSteps: hsePtwPermits.controlSteps,
          ppe: hsePtwPermits.ppe,
          gasTestRequired: hsePtwPermits.gasTestRequired,
          isolationRequired: hsePtwPermits.isolationRequired,
          createdByEmployeeId: hsePtwPermits.createdByEmployeeId,
        })
        .from(hsePtwPermits)
        .orderBy(desc(hsePtwPermits.id))
    ),
    withDbRetry(() =>
      db
        .select({
          id: employees.id,
          name: employees.name,
          position: employees.jobTitle,
          rank: employees.role,
        })
        .from(employees)
        .where(eq(employees.isActive, true))
    ),
    getPtwWorkflowSettings(),
  ])

  const rawPtwIds = rawPtwRecords.map((r) => r.id)

  const rawApprovalsList =
    rawPtwIds.length > 0
      ? await withDbRetry(() =>
          db
            .select({
              ptwPermitId: ptwApprovals.ptwPermitId,
              stepOrder: ptwApprovals.stepOrder,
              stepLabel: ptwApprovals.stepLabel,
              status: ptwApprovals.status,
              approverName: ptwApprovals.approverName,
              approverEmail: ptwApprovals.approverEmail,
              approverEmployeeId: ptwApprovals.approverEmployeeId,
              approverRole: ptwApprovals.approverRole,
              signatureDataUrl: ptwApprovals.signatureDataUrl,
              remarks: ptwApprovals.remarks,
              signedAt: ptwApprovals.signedAt,
            })
            .from(ptwApprovals)
            .where(inArray(ptwApprovals.ptwPermitId, rawPtwIds))
            .orderBy(asc(ptwApprovals.stepOrder))
        )
      : []

  const approvalsByPtwMap = new Map<number, typeof rawApprovalsList>()
  for (const a of rawApprovalsList) {
    if (!approvalsByPtwMap.has(a.ptwPermitId)) {
      approvalsByPtwMap.set(a.ptwPermitId, [])
    }
    approvalsByPtwMap.get(a.ptwPermitId)!.push(a)
  }

  // Role / Jabatan Access Filtering for PTW
  const ptwRecords = rawPtwRecords.filter((r) => {
    if (!currentEmployee || isGlobalAdmin) return true

    // Allow records with no explicit creator ID (e.g. system default or fallback)
    if (!r.createdByEmployeeId) return true

    // Creator employee
    if (currentEmployee?.id && r.createdByEmployeeId === currentEmployee.id) return true

    // Requester / Applicant / PIC
    if (currentEmployee?.name && r.applicantName && r.applicantName.trim().toLowerCase() === currentEmployee.name.trim().toLowerCase()) return true
    if (currentEmployee?.name && r.fieldPicName && r.fieldPicName.trim().toLowerCase() === currentEmployee.name.trim().toLowerCase()) return true

    // Assigned approver for any step of this PTW
    const ptwApps = approvalsByPtwMap.get(r.id) || []
    const isAssignedApprover = ptwApps.some(
      (a) =>
        (currentEmployee?.id && a.approverEmployeeId === currentEmployee.id) ||
        (a.approverEmail && a.approverEmail.trim().toLowerCase() === normalizedEmail) ||
        (currentEmployee?.name && a.approverName && a.approverName.trim().toLowerCase() === currentEmployee.name.trim().toLowerCase())
    )
    if (isAssignedApprover) return true

    // Default: show PTW records for active employees on site
    return true
  })

  const ptwIds = ptwRecords.map((r) => r.id)
  const approvalsList = rawApprovalsList.filter((a) => ptwIds.includes(a.ptwPermitId))

  const approvalsMap = new Map<number, PtwListingRow['approvals']>()
  for (const a of approvalsList) {
    const order = Number(a.stepOrder) || 1
    if (order > 3) continue
    const list = approvalsMap.get(a.ptwPermitId) || []
    const mappedLabel =
      order === 1 || a.approverRole === 'applicant'
        ? 'Pelaksana Kerja'
        : order === 2 || a.approverRole === 'safety_officer'
        ? 'Pemberi Kerja'
        : 'Safety Dept'

    list.push({
      stepOrder: order,
      stepLabel: mappedLabel,
      status: a.status || 'waiting',
      approverName: a.approverName || '',
      approverRole: a.approverRole || '',
      approverEmail: a.approverEmail || null,
      approverEmployeeId: a.approverEmployeeId ? Number(a.approverEmployeeId) : null,
      signatureDataUrl: a.signatureDataUrl || null,
      remarks: a.remarks || null,
      signedAt: a.signedAt ? new Date(a.signedAt).toISOString() : null,
    })
    approvalsMap.set(a.ptwPermitId, list)
  }

  const rows: PtwListingRow[] = ptwRecords.map((r) => {
    const apps = approvalsMap.get(r.id) || []
    let computedStatus = r.status || 'Pending Approval'
    if (apps.length > 0) {
      if (apps.some((a) => a.status === 'rejected')) {
        computedStatus = 'Rejected'
      } else if (apps.some((a) => a.status === 'reverted')) {
        computedStatus = 'Reverted'
      } else if (apps.every((a) => a.status === 'approved')) {
        computedStatus = 'Approved'
      } else if (apps.some((a) => a.status === 'approved')) {
        computedStatus = 'In Progress'
      }
    }

    return {
      id: Number(r.id),
      permitNumber: r.permitNumber || `PTW-${r.id}`,
      projectName: r.projectName || '',
      permitType: r.permitType || 'General PTW',
      location: r.location || '',
      area: r.area || '',
      startAt: r.startAt ? new Date(r.startAt).toISOString() : null,
      endAt: r.endAt ? new Date(r.endAt).toISOString() : null,
      status: computedStatus,
      riskLevel: r.riskLevel || 'medium',
      applicantName: r.applicantName || 'Pemohon',
      fieldPicName: r.fieldPicName || '',
      authorizedByName: r.authorizedByName || '',
      description: r.description || '',
      controlSteps: r.controlSteps || '',
      ppe: Array.isArray(r.ppe) ? r.ppe : [],
      gasTestRequired: Boolean(r.gasTestRequired),
      isolationRequired: Boolean(r.isolationRequired),
      approvals: apps,
    }
  })

  const sanitizedEmployees = (allEmployees || []).map((e) => ({
    id: Number(e.id),
    name: e.name || '',
    position: e.position || '',
    rank: e.rank || '',
  }))

  return (
    <PtwListingClient
      rows={rows}
      employees={sanitizedEmployees}
      initialSettings={initialSettings}
      currentEmployeeId={currentEmployee?.id ?? null}
      currentEmployeeEmail={normalizedEmail}
      currentEmployeeName={currentEmployee?.name || ''}
      isAdmin={isGlobalAdmin}
    />
  )
}