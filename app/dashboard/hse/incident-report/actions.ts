'use server'

import { eq, desc, and, or, ilike } from 'drizzle-orm'
import { db } from '@/db'
import { hseIncidentRecords } from '@/db/schema/hero'
import { getCurrentMenuPermission } from '@/lib/hero-access'

async function requireIncidentPermission(action: 'view' | 'edit' | 'delete') {
  const permission = await getCurrentMenuPermission('hse_incident_report')
  const allowed = action === 'view' ? permission.canView : action === 'delete' ? permission.canDelete : permission.canEdit
  if (!allowed) throw new Error('Role Anda tidak punya akses Incident Report.')
  return permission
}

export async function getIncidentRecords(params?: {
  search?: string
  category?: string
  severity?: string
  status?: string
}) {
  try {
    await requireIncidentPermission('view')
    const conditions = []

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
    await requireIncidentPermission('edit')
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
        picEmployeeId: payload.picEmployeeId || null,
        picName: payload.picName,
        rootCauseAnalysis: payload.rootCauseAnalysis,
        immediateCorrectiveAction: payload.immediateCorrectiveAction,
        documentationUrl: payload.documentationUrl,
      })
      .returning()

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
    await requireIncidentPermission('edit')
    const [updated] = await db
      .update(hseIncidentRecords)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(eq(hseIncidentRecords.id, id))
      .returning()

    return { success: true, data: updated }
  } catch (error: any) {
    console.error('Error updating incident record:', error)
    return { success: false, error: error.message || 'Gagal memperbarui data' }
  }
}

export async function deleteIncidentRecord(id: number) {
  try {
    await requireIncidentPermission('delete')
    await db.delete(hseIncidentRecords).where(eq(hseIncidentRecords.id, id))
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting incident record:', error)
    return { success: false, error: error.message || 'Gagal menghapus data' }
  }
}
