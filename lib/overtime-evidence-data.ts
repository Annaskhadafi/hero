import { and, asc, desc, eq, gte, inArray, lte, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  attendanceRecords,
  employees,
  masterDepartments,
  masterSections,
  overtimeApprovals,
  overtimeCommandLetterItems,
  overtimeCommandLetterParticipants,
  overtimeCommandLetters,
  sites,
} from '@/db/schema/hero'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'

export type OvertimeEvidenceItem = {
  id: number
  itemIndex: number
  lineLabel: string
  code?: string
  name?: string
  unitNumber?: string | null
  tireCount?: number | null
  materialUsed?: string | null
  startTime?: string | null
  endTime?: string | null
  duration?: string | null
  targetUnit?: string | null
  estimatedMinutes?: number
  plannedPoints?: number
  remark?: string | null
  photoUrl?: string | null
  photos?: string[]
}

export type OvertimeEvidenceData = {
  header: {
    id: number
    splNumber: string
    title: string
    workDate: Date | string
    plannedStartAt: Date | string | null
    plannedEndAt: Date | string | null
    status: string
    requestNotes?: string | null
    executionNotes?: string | null
    requesterId: number
    requesterName: string
    requesterSn?: string | null
    requesterDepartment?: string | null
    requesterSection?: string | null
    requesterJobTitle?: string | null
    siteId: number
    siteName: string
    customerName?: string | null
    workerCount: number
    createdAt: Date | string
  }
  participants: Array<{
    id: number
    employeeId: number
    employeeName: string
    employeeSn?: string | null
    department?: string | null
    category: string
    shiftCode: string
    rosterType: string
  }>
  lineItems: OvertimeEvidenceItem[]
  evidencePhotos: Array<{
    id: string | number
    photoUrl: string
    title: string
    subtitle?: string
    unitNumber?: string | null
    tireCount?: number | null
    materialUsed?: string | null
    timeRange?: string | null
    remark?: string | null
    source: 'line_item' | 'header'
  }>
  approvals: Array<{
    id: number
    stepOrder: number
    stepLabel: string
    status: string
    approverName: string
    approverRole?: string | null
    signatureDataUrl?: string | null
    signedAt: Date | string | null
    remarks?: string | null
  }>
}

export async function getPublicOvertimeEvidenceData(
  idOrSplNumber: number | string
): Promise<OvertimeEvidenceData | null> {
  const numericId =
    typeof idOrSplNumber === 'number'
      ? idOrSplNumber
      : Number(String(idOrSplNumber).replace(/[^0-9]/g, ''))

  const isNumeric = !isNaN(numericId) && numericId > 0

  const condition = isNumeric
    ? eq(overtimeCommandLetters.id, numericId)
    : eq(overtimeCommandLetters.splNumber, String(idOrSplNumber).trim())

  const [document] = await db
    .select({
      id: overtimeCommandLetters.id,
      splNumber: overtimeCommandLetters.splNumber,
      title: overtimeCommandLetters.title,
      workDate: overtimeCommandLetters.workDate,
      plannedStartAt: overtimeCommandLetters.plannedStartAt,
      plannedEndAt: overtimeCommandLetters.plannedEndAt,
      status: overtimeCommandLetters.status,
      requestNotes: overtimeCommandLetters.requestNotes,
      executionNotes: overtimeCommandLetters.executionNotes,
      requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
      siteId: overtimeCommandLetters.siteId,
      createdAt: overtimeCommandLetters.createdAt,
      siteName: sites.name,
      customerName: sites.customerName,
      requesterName: employees.name,
      requesterSn: employees.employeeSn,
      requesterDepartment: masterDepartments.name,
      requesterSection: masterSections.name,
      requesterJobTitle: employees.jobTitle,
    })
    .from(overtimeCommandLetters)
    .leftJoin(sites, eq(overtimeCommandLetters.siteId, sites.id))
    .leftJoin(employees, eq(overtimeCommandLetters.requestedByEmployeeId, employees.id))
    .leftJoin(masterDepartments, eq(overtimeCommandLetters.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(overtimeCommandLetters.sectionId, masterSections.id))
    .where(condition)
    .limit(1)

  if (!document) {
    const rawStr = String(idOrSplNumber).trim()
    const empMatch = rawStr.match(/^emp-([^-]+)-(\d{4}-\d{2})/i)
    if (!empMatch) {
      return null
    }

    const empKey = decodeURIComponent(empMatch[1]).trim()
    const period = empMatch[2].trim()
    const isEmpId = !isNaN(Number(empKey)) && Number(empKey) > 0

    const [emp] = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        siteId: employees.siteId,
        jobTitle: employees.jobTitle,
        departmentId: employees.departmentId,
        departmentName: masterDepartments.name,
        sectionId: employees.sectionId,
        sectionName: masterSections.name,
        siteName: sites.name,
        customerName: sites.customerName,
      })
      .from(employees)
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .where(isEmpId ? eq(employees.id, Number(empKey)) : eq(employees.employeeSn, empKey))
      .limit(1)

    if (!emp) {
      return null
    }

    const [year, month] = period.split('-').map(Number)
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59))

    // 1. Participant letters
    const participantLetters = await db
      .select({ letterId: overtimeCommandLetterParticipants.overtimeCommandLetterId })
      .from(overtimeCommandLetterParticipants)
      .where(eq(overtimeCommandLetterParticipants.employeeId, emp.id))

    const pLetterIds = participantLetters.map((p) => p.letterId).filter(Boolean)

    // 2. Query overtime letters in that period
    const splConditions = [
      gte(overtimeCommandLetters.workDate, startDate),
      lte(overtimeCommandLetters.workDate, endDate),
    ]

    const splFilter =
      pLetterIds.length > 0
        ? or(
            eq(overtimeCommandLetters.requestedByEmployeeId, emp.id),
            inArray(overtimeCommandLetters.id, pLetterIds)
          )
        : eq(overtimeCommandLetters.requestedByEmployeeId, emp.id)

    const spls = await db
      .select({
        id: overtimeCommandLetters.id,
        splNumber: overtimeCommandLetters.splNumber,
        title: overtimeCommandLetters.title,
        workDate: overtimeCommandLetters.workDate,
        status: overtimeCommandLetters.status,
        requestNotes: overtimeCommandLetters.requestNotes,
        executionNotes: overtimeCommandLetters.executionNotes,
        requestedByEmployeeId: overtimeCommandLetters.requestedByEmployeeId,
      })
      .from(overtimeCommandLetters)
      .where(and(...splConditions, splFilter))
      .orderBy(asc(overtimeCommandLetters.workDate), asc(overtimeCommandLetters.id))

    const splIds = spls.map((s) => s.id)

    const [itemRows, approvalRows, attRecords] = await Promise.all([
      splIds.length > 0
        ? db
            .select({
              id: overtimeCommandLetterItems.id,
              lineLabel: overtimeCommandLetterItems.lineLabel,
              lineDescription: overtimeCommandLetterItems.lineDescription,
              targetUnit: overtimeCommandLetterItems.targetUnit,
              estimatedMinutes: overtimeCommandLetterItems.estimatedMinutes,
              plannedPoints: overtimeCommandLetterItems.plannedPoints,
              sortOrder: overtimeCommandLetterItems.sortOrder,
            })
            .from(overtimeCommandLetterItems)
            .where(inArray(overtimeCommandLetterItems.overtimeCommandLetterId, splIds))
            .orderBy(asc(overtimeCommandLetterItems.sortOrder), asc(overtimeCommandLetterItems.id))
        : [],
      splIds.length > 0
        ? db
            .select({
              id: overtimeApprovals.id,
              stepOrder: overtimeApprovals.stepOrder,
              stepLabel: overtimeApprovals.stepLabel,
              status: overtimeApprovals.status,
              approverName: overtimeApprovals.approverName,
              approverRole: overtimeApprovals.approverRole,
              signatureDataUrl: overtimeApprovals.signatureDataUrl,
              signedAt: overtimeApprovals.signedAt,
              remarks: overtimeApprovals.remarks,
            })
            .from(overtimeApprovals)
            .where(inArray(overtimeApprovals.overtimeCommandLetterId, splIds))
            .orderBy(asc(overtimeApprovals.stepOrder))
        : [],
      db
        .select({
          id: attendanceRecords.id,
          eventType: attendanceRecords.eventType,
          eventTime: attendanceRecords.eventTime,
          status: attendanceRecords.status,
          locationNote: attendanceRecords.locationNote,
          photoUrl: attendanceRecords.photoUrl,
        })
        .from(attendanceRecords)
        .where(
          and(
            eq(attendanceRecords.employeeId, emp.id),
            gte(attendanceRecords.eventTime, startDate),
            lte(attendanceRecords.eventTime, endDate)
          )
        )
        .orderBy(asc(attendanceRecords.eventTime)),
    ])

    const cleanPhotoUrlHelper = (u: any): string | null => {
      if (!u) return null
      const str = typeof u === 'string' ? u : u?.url || u?.dataUrl || u?.preview || ''
      if (!str || typeof str !== 'string') return null
      const trimmed = str.trim()
      return trimmed.length > 0 ? resolveUploadUrl(trimmed) : null
    }

    const processedItems: OvertimeEvidenceItem[] = itemRows.map((item, index) => {
      let parsedMeta: any = {}
      try {
        if (item.lineDescription && item.lineDescription.startsWith('{')) {
          parsedMeta = JSON.parse(item.lineDescription)
        }
      } catch {
        parsedMeta = {}
      }

      const photoUrl =
        cleanPhotoUrlHelper(parsedMeta.photoUrl) ||
        cleanPhotoUrlHelper(parsedMeta.photos?.[0]) ||
        cleanPhotoUrlHelper(parsedMeta.photo) ||
        null

      return {
        id: item.id,
        itemIndex: index + 1,
        lineLabel: item.lineLabel,
        code: parsedMeta.code,
        name: parsedMeta.name || item.lineLabel,
        unitNumber: parsedMeta.unitNumber || null,
        tireCount: parsedMeta.tireCount ?? null,
        materialUsed: parsedMeta.materialUsed || null,
        startTime: parsedMeta.startTime || null,
        endTime: parsedMeta.endTime || null,
        duration: parsedMeta.duration || (item.estimatedMinutes ? `${item.estimatedMinutes}m` : null),
        targetUnit: parsedMeta.targetUnit || item.targetUnit || null,
        estimatedMinutes: item.estimatedMinutes,
        plannedPoints: item.plannedPoints,
        remark: parsedMeta.remark || (!item.lineDescription?.startsWith('{') ? item.lineDescription : null),
        photoUrl,
        photos: Array.isArray(parsedMeta.photos) ? parsedMeta.photos.map(cleanPhotoUrlHelper).filter(Boolean) : (photoUrl ? [photoUrl] : []),
      }
    })

    const evidencePhotos: OvertimeEvidenceData['evidencePhotos'] = []

    for (const item of processedItems) {
      if (item.photoUrl) {
        evidencePhotos.push({
          id: `item-${item.id}`,
          photoUrl: item.photoUrl,
          title: item.name || item.lineLabel,
          subtitle: item.code ? `Activity #${item.itemIndex} • ${item.code}` : `Activity #${item.itemIndex}`,
          unitNumber: item.unitNumber,
          tireCount: item.tireCount,
          materialUsed: item.materialUsed,
          timeRange: item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : null,
          remark: item.remark,
          source: 'line_item',
        })
      }
    }

    for (const att of attRecords) {
      const cleanAttUrl = cleanPhotoUrlHelper(att.photoUrl)
      if (cleanAttUrl) {
        const timeStr = att.eventTime ? new Date(att.eventTime).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
        evidencePhotos.push({
          id: `att-${att.id}`,
          photoUrl: cleanAttUrl,
          title: `Presensi ${att.eventType === 'clock_in' ? 'Masuk' : 'Pulang'} - ${timeStr}`,
          subtitle: `${att.locationNote || 'Lokasi Site'} • ${att.status}`,
          timeRange: timeStr,
          source: 'line_item',
        })
      }
    }

    return {
      header: {
        id: emp.id,
        splNumber: `SPL-SUMMARY-${period}`,
        title: `Summary Bukti Lembur & Presensi - ${emp.name}`,
        workDate: startDate,
        plannedStartAt: startDate,
        plannedEndAt: endDate,
        status: 'approved',
        requestNotes: `Rekapitulasi bukti pelaksanaan lembur dan presensi karyawan ${emp.name} periode ${period}.`,
        executionNotes: null,
        requesterId: emp.id,
        requesterName: emp.name,
        requesterSn: emp.employeeSn || null,
        requesterDepartment: emp.departmentName || null,
        requesterSection: emp.sectionName || null,
        requesterJobTitle: emp.jobTitle || null,
        siteId: emp.siteId || 1,
        siteName: emp.siteName || 'Site',
        customerName: emp.customerName || null,
        workerCount: 1,
        createdAt: startDate,
      },
      participants: [
        {
          id: emp.id,
          employeeId: emp.id,
          employeeName: emp.name,
          employeeSn: emp.employeeSn || null,
          department: emp.departmentName || null,
          category: 'after_mandatory_ot',
          shiftCode: 'DS',
          rosterType: '5:2',
        },
      ],
      lineItems: processedItems,
      evidencePhotos,
      approvals: approvalRows.map((a) => ({
        id: a.id,
        stepOrder: a.stepOrder,
        stepLabel: a.stepLabel,
        status: a.status,
        approverName: a.approverName || 'Approver',
        approverRole: a.approverRole,
        signatureDataUrl: a.signatureDataUrl,
        signedAt: a.signedAt,
        remarks: a.remarks,
      })),
    }
  }

  const [participantRows, itemRows, approvalRows] = await Promise.all([
    db
      .select({
        id: overtimeCommandLetterParticipants.id,
        employeeId: overtimeCommandLetterParticipants.employeeId,
        category: overtimeCommandLetterParticipants.category,
        shiftCode: overtimeCommandLetterParticipants.shiftCode,
        rosterType: overtimeCommandLetterParticipants.rosterType,
        employeeName: employees.name,
        employeeSn: employees.employeeSn,
        department: masterDepartments.name,
      })
      .from(overtimeCommandLetterParticipants)
      .leftJoin(employees, eq(overtimeCommandLetterParticipants.employeeId, employees.id))
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .where(eq(overtimeCommandLetterParticipants.overtimeCommandLetterId, document.id)),

    db
      .select({
        id: overtimeCommandLetterItems.id,
        lineLabel: overtimeCommandLetterItems.lineLabel,
        lineDescription: overtimeCommandLetterItems.lineDescription,
        targetUnit: overtimeCommandLetterItems.targetUnit,
        estimatedMinutes: overtimeCommandLetterItems.estimatedMinutes,
        plannedPoints: overtimeCommandLetterItems.plannedPoints,
        sortOrder: overtimeCommandLetterItems.sortOrder,
      })
      .from(overtimeCommandLetterItems)
      .where(eq(overtimeCommandLetterItems.overtimeCommandLetterId, document.id))
      .orderBy(asc(overtimeCommandLetterItems.sortOrder), asc(overtimeCommandLetterItems.id)),

    db
      .select({
        id: overtimeApprovals.id,
        stepOrder: overtimeApprovals.stepOrder,
        stepLabel: overtimeApprovals.stepLabel,
        status: overtimeApprovals.status,
        approverName: overtimeApprovals.approverName,
        approverRole: overtimeApprovals.approverRole,
        signatureDataUrl: overtimeApprovals.signatureDataUrl,
        signedAt: overtimeApprovals.signedAt,
        remarks: overtimeApprovals.remarks,
      })
      .from(overtimeApprovals)
      .where(eq(overtimeApprovals.overtimeCommandLetterId, document.id))
      .orderBy(asc(overtimeApprovals.stepOrder)),
  ])

  const cleanPhotoUrl = (u: any): string | null => {
    if (!u) return null
    const str = typeof u === 'string' ? u : u?.url || u?.dataUrl || u?.preview || ''
    if (!str || typeof str !== 'string') return null
    const trimmed = str.trim()
    return trimmed.length > 0 ? resolveUploadUrl(trimmed) : null
  }

  // Parse line items and descriptions
  const processedItems: OvertimeEvidenceItem[] = itemRows.map((item, index) => {
    let parsedMeta: any = {}
    try {
      if (item.lineDescription && item.lineDescription.startsWith('{')) {
        parsedMeta = JSON.parse(item.lineDescription)
      }
    } catch {
      parsedMeta = {}
    }

    const photoUrl =
      cleanPhotoUrl(parsedMeta.photoUrl) ||
      cleanPhotoUrl(parsedMeta.photos?.[0]) ||
      cleanPhotoUrl(parsedMeta.photo) ||
      null

    return {
      id: item.id,
      itemIndex: index + 1,
      lineLabel: item.lineLabel,
      code: parsedMeta.code,
      name: parsedMeta.name || item.lineLabel,
      unitNumber: parsedMeta.unitNumber || null,
      tireCount: parsedMeta.tireCount ?? null,
      materialUsed: parsedMeta.materialUsed || null,
      startTime: parsedMeta.startTime || null,
      endTime: parsedMeta.endTime || null,
      duration: parsedMeta.duration || (item.estimatedMinutes ? `${item.estimatedMinutes}m` : null),
      targetUnit: parsedMeta.targetUnit || item.targetUnit || null,
      estimatedMinutes: item.estimatedMinutes,
      plannedPoints: item.plannedPoints,
      remark: parsedMeta.remark || (!item.lineDescription?.startsWith('{') ? item.lineDescription : null),
      photoUrl,
      photos: Array.isArray(parsedMeta.photos) ? parsedMeta.photos.map(cleanPhotoUrl).filter(Boolean) : (photoUrl ? [photoUrl] : []),
    }
  })

  // Collect all photos
  const evidencePhotos: OvertimeEvidenceData['evidencePhotos'] = []

  // 1. Line item photos
  for (const item of processedItems) {
    if (item.photoUrl) {
      evidencePhotos.push({
        id: `item-${item.id}`,
        photoUrl: item.photoUrl,
        title: item.name || item.lineLabel,
        subtitle: item.code ? `Activity #${item.itemIndex} • ${item.code}` : `Activity #${item.itemIndex}`,
        unitNumber: item.unitNumber,
        tireCount: item.tireCount,
        materialUsed: item.materialUsed,
        timeRange: item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : null,
        remark: item.remark,
        source: 'line_item',
      })
    }
    if (item.photos && item.photos.length > 1) {
      item.photos.slice(1).forEach((pUrl, pIdx) => {
        evidencePhotos.push({
          id: `item-${item.id}-${pIdx + 2}`,
          photoUrl: pUrl,
          title: `${item.name || item.lineLabel} (Foto ${pIdx + 2})`,
          subtitle: item.code ? `Activity #${item.itemIndex} • ${item.code}` : `Activity #${item.itemIndex}`,
          unitNumber: item.unitNumber,
          tireCount: item.tireCount,
          materialUsed: item.materialUsed,
          timeRange: item.startTime && item.endTime ? `${item.startTime} - ${item.endTime}` : null,
          remark: item.remark,
          source: 'line_item',
        })
      })
    }
  }

  // 2. Header / general requestNotes photo
  const headerPhotoMatch = (document.requestNotes || '').match(/\[Foto Bukti SPL\]:\s*(\S+)/i)
  if (headerPhotoMatch && headerPhotoMatch[1]) {
    const rawUrl = headerPhotoMatch[1].trim()
    const resolved = cleanPhotoUrl(rawUrl)
    if (resolved && !evidencePhotos.some((p) => p.photoUrl === resolved)) {
      evidencePhotos.unshift({
        id: `header-doc-${document.id}`,
        photoUrl: resolved,
        title: 'Foto Bukti Dokumen SPL',
        subtitle: `Dokumen Utama ${document.splNumber}`,
        source: 'header',
      })
    }
  }

  return {
    header: {
      id: document.id,
      splNumber: document.splNumber,
      title: document.title,
      workDate: document.workDate,
      plannedStartAt: document.plannedStartAt,
      plannedEndAt: document.plannedEndAt,
      status: document.status,
      requestNotes: (document.requestNotes || '').replace(/\[Foto Bukti SPL\]:\s*\S+/gi, '').trim() || null,
      executionNotes: document.executionNotes || null,
      requesterId: document.requestedByEmployeeId,
      requesterName: document.requesterName || 'Pemohon',
      requesterSn: document.requesterSn || null,
      requesterDepartment: document.requesterDepartment || null,
      requesterSection: document.requesterSection || null,
      requesterJobTitle: document.requesterJobTitle || null,
      siteId: document.siteId,
      siteName: document.siteName || 'Central Site',
      customerName: document.customerName || null,
      workerCount: participantRows.length > 0 ? participantRows.length : 1,
      createdAt: document.createdAt,
    },
    participants:
      participantRows.length > 0
        ? participantRows.map((p) => ({
            id: p.id,
            employeeId: p.employeeId,
            employeeName: p.employeeName || 'Karyawan',
            employeeSn: p.employeeSn || null,
            department: p.department || null,
            category: p.category,
            shiftCode: p.shiftCode,
            rosterType: p.rosterType,
          }))
        : [
            {
              id: 1,
              employeeId: document.requestedByEmployeeId,
              employeeName: document.requesterName || 'Pemohon',
              employeeSn: document.requesterSn || null,
              department: document.requesterDepartment || null,
              category: 'after_mandatory_ot',
              shiftCode: 'DS',
              rosterType: '5:2',
            },
          ],
    lineItems: processedItems,
    evidencePhotos,
    approvals: approvalRows.map((a) => ({
      id: a.id,
      stepOrder: a.stepOrder,
      stepLabel: a.stepLabel,
      status: a.status,
      approverName: a.approverName || 'Approver',
      approverRole: a.approverRole,
      signatureDataUrl: a.signatureDataUrl,
      signedAt: a.signedAt,
      remarks: a.remarks,
    })),
  }
}
