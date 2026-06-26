'use server'

import { eq, desc, and, or, ilike } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { hseIncidentRecords } from '@/db/schema/hero'
import {
  getCurrentEmployeeAccessContext,
  getCurrentMenuPermission,
  hasGlobalDataAccess,
} from '@/lib/hero-access'
import { buildHseSafetyEmail, sendHseSafetyEmail } from '@/lib/hse-safety-email'

async function requireIncidentPermission(action: 'view' | 'edit' | 'delete') {
  const [permission, context] = await Promise.all([
    getCurrentMenuPermission('hse_incident_report'),
    getCurrentEmployeeAccessContext(),
  ])
  const allowed =
    action === 'view'
      ? permission.canView
      : action === 'delete'
        ? permission.canDelete
        : permission.canEdit
  if (!allowed) throw new Error('Role Anda tidak punya akses Incident Report.')
  return {
    permission,
    context,
    hasGlobalScope: hasGlobalDataAccess(permission),
  }
}

type IncidentAccess = Awaited<ReturnType<typeof requireIncidentPermission>>

function getScopedIncidentEmployeeId(access: IncidentAccess) {
  const employeeId = access.context?.employeeId ?? null
  if (!access.hasGlobalScope && !employeeId) {
    throw new Error('Role Anda hanya bisa mengakses incident report sendiri.')
  }
  return employeeId
}

function assertIncidentRecordScope(
  access: IncidentAccess,
  record: { picEmployeeId: number | null } | undefined
) {
  if (!record) throw new Error('Incident report tidak ditemukan.')
  if (!access.hasGlobalScope && record.picEmployeeId !== access.context?.employeeId) {
    throw new Error('Role Anda hanya bisa mengakses incident report sendiri.')
  }
}

export async function getIncidentRecords(params?: {
  search?: string
  category?: string
  severity?: string
  status?: string
}) {
  try {
    const access = await requireIncidentPermission('view')
    const conditions = []
    if (!access.hasGlobalScope) {
      conditions.push(eq(hseIncidentRecords.picEmployeeId, access.context?.employeeId ?? -1))
    }

    if (params?.search) {
      conditions.push(
        or(
          ilike(hseIncidentRecords.title, `%${params.search}%`),
          ilike(hseIncidentRecords.picName, `%${params.search}%`)
        )
      )
    }

    if (params?.category && params.category !== 'all') {
      conditions.push(eq(hseIncidentRecords.category, params.category))
    }

    if (params?.severity && params.severity !== 'all') {
      conditions.push(eq(hseIncidentRecords.severity, params.severity))
    }

    if (params?.status && params.status !== 'all') {
      conditions.push(eq(hseIncidentRecords.investigationStatus, params.status))
    }

    const records = await db
      .select()
      .from(hseIncidentRecords)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(hseIncidentRecords.createdAt))

    return { success: true, data: records }
  } catch (error: any) {
    console.error('Error fetching incident records:', error)
    return { success: false, error: error.message || 'Gagal mengambil data' }
  }
}

export async function createIncidentRecord(payload: {
  title: string
  category: string
  severity: string
  description: string
  siteId?: number
  investigationStatus: string
  incidentDate: Date
  picEmployeeId?: number
  picName: string
  rootCauseAnalysis: string
  immediateCorrectiveAction: string
  documentationUrl: string
}) {
  try {
    const access = await requireIncidentPermission('edit')
    const scopedPicEmployeeId = access.hasGlobalScope
      ? payload.picEmployeeId || null
      : getScopedIncidentEmployeeId(access)
    const [inserted] = await db
      .insert(hseIncidentRecords)
      .values({
        title: payload.title,
        category: payload.category,
        severity: payload.severity,
        description: payload.description,
        siteId: payload.siteId || null,
        investigationStatus: payload.investigationStatus,
        incidentDate: payload.incidentDate,
        picEmployeeId: scopedPicEmployeeId,
        picName: payload.picName,
        rootCauseAnalysis: payload.rootCauseAnalysis,
        immediateCorrectiveAction: payload.immediateCorrectiveAction,
        documentationUrl: payload.documentationUrl,
      })
      .returning()

    const emailContent = buildHseSafetyEmail({
      title: 'Incident report baru',
      intro: 'Incident report HSE baru telah dicatat di HERO.',
      details: [
        `Judul: ${inserted.title}`,
        `Kategori: ${inserted.category}`,
        `Severity: ${inserted.severity}`,
        `PIC: ${inserted.picName}`,
        `Status investigasi: ${inserted.investigationStatus}`,
      ],
    })

    await sendHseSafetyEmail({
      templateCode: 'hse_incident_record_created',
      templateName: 'HSE Incident Record Created',
      variables: {
        title: inserted.title,
        category: inserted.category,
        severity: inserted.severity,
        picName: inserted.picName,
        investigationStatus: inserted.investigationStatus,
      },
      fallbackSubject: `Incident report baru: ${inserted.title}`,
      fallbackHtml: emailContent.html,
      fallbackText: emailContent.text,
    })

    revalidatePath('/dashboard/hse/incident-report')
    revalidatePath('/mobile/hse/observasi-emergency')
    return { success: true, data: inserted }
  } catch (error: any) {
    console.error('Error creating incident record:', error)
    return { success: false, error: error.message || 'Gagal menyimpan data' }
  }
}

export async function updateIncidentRecord(
  id: number,
  payload: Partial<{
    title: string
    category: string
    severity: string
    description: string
    siteId: number | null
    investigationStatus: string
    incidentDate: Date
    picEmployeeId: number | null
    picName: string
    rootCauseAnalysis: string
    immediateCorrectiveAction: string
    documentationUrl: string
  }>
) {
  try {
    const access = await requireIncidentPermission('edit')
    const [previous] = await db
      .select()
      .from(hseIncidentRecords)
      .where(eq(hseIncidentRecords.id, id))
      .limit(1)
    assertIncidentRecordScope(access, previous)

    const scopedPayload = access.hasGlobalScope
      ? payload
      : {
          ...payload,
          picEmployeeId: getScopedIncidentEmployeeId(access),
        }
    const [updated] = await db
      .update(hseIncidentRecords)
      .set({
        ...scopedPayload,
        updatedAt: new Date(),
      })
      .where(eq(hseIncidentRecords.id, id))
      .returning()

    if (
      previous &&
      updated &&
      payload.investigationStatus &&
      payload.investigationStatus !== previous.investigationStatus
    ) {
      const emailContent = buildHseSafetyEmail({
        title: 'Update incident report',
        intro: 'Status incident report HSE berubah dan perlu diketahui tim safety.',
        details: [
          `Judul: ${updated.title}`,
          `Severity: ${updated.severity}`,
          `Status lama: ${previous.investigationStatus}`,
          `Status baru: ${updated.investigationStatus}`,
          `PIC: ${updated.picName}`,
        ],
      })

      await sendHseSafetyEmail({
        templateCode: 'hse_incident_record_status_update',
        templateName: 'HSE Incident Record Status Update',
        variables: {
          title: updated.title,
          severity: updated.severity,
          previousStatus: previous.investigationStatus,
          investigationStatus: updated.investigationStatus,
          picName: updated.picName,
        },
        fallbackSubject: `Update incident report: ${updated.title}`,
        fallbackHtml: emailContent.html,
        fallbackText: emailContent.text,
      })
    }

    revalidatePath('/dashboard/hse/incident-report')
    revalidatePath('/mobile/hse/observasi-emergency')
    return { success: true, data: updated }
  } catch (error: any) {
    console.error('Error updating incident record:', error)
    return { success: false, error: error.message || 'Gagal memperbarui data' }
  }
}

export async function deleteIncidentRecord(id: number) {
  try {
    const access = await requireIncidentPermission('delete')
    const [record] = await db
      .select({ picEmployeeId: hseIncidentRecords.picEmployeeId })
      .from(hseIncidentRecords)
      .where(eq(hseIncidentRecords.id, id))
      .limit(1)
    assertIncidentRecordScope(access, record)
    await db.delete(hseIncidentRecords).where(eq(hseIncidentRecords.id, id))
    revalidatePath('/dashboard/hse/incident-report')
    revalidatePath('/mobile/hse/observasi-emergency')
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting incident record:', error)
    return { success: false, error: error.message || 'Gagal menghapus data' }
  }
}
