'use server'

import { db } from '@/db'
import {
  heroMasterAtk,
  heroAtkRequests,
  heroAtkRequestItems,
} from '@/db/schema/atk'
import { employees, masterDepartments, sites } from '@/db/schema/hero'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { getCurrentMenuPermission, isSuperAdminRole } from '@/lib/hero-access'
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'

// ── Master Data ATK Actions ────────────────────────────────────────────────

export async function getMasterAtkList(options?: {
  activeOnly?: boolean
  search?: string
  category?: string
}) {
  const conditions = []

  if (options?.activeOnly) {
    conditions.push(eq(heroMasterAtk.isActive, true))
  }
  if (options?.category && options.category !== 'all') {
    conditions.push(eq(heroMasterAtk.category, options.category))
  }
  if (options?.search?.trim()) {
    const term = `%${options.search.trim()}%`
    conditions.push(
      or(
        ilike(heroMasterAtk.name, term),
        ilike(heroMasterAtk.code, term),
        ilike(heroMasterAtk.description, term)
      )
    )
  }

  const items = await db
    .select()
    .from(heroMasterAtk)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(heroMasterAtk.category, heroMasterAtk.name)

  return items
}

export async function createMasterAtkItem(payload: {
  code?: string
  name: string
  category?: string
  unit?: string
  description?: string
  minStock?: number
  isActive?: boolean
}) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) throw new Error('Unauthorized')

  const permission = await getCurrentMenuPermission('ga-atk')
  const isSuper = isSuperAdminRole(currentEmployee.accessRole)
  if (!permission.canEdit && !isSuper) {
    throw new Error('Anda tidak memiliki hak akses untuk mengelola master data ATK')
  }

  let code = payload.code?.trim().toUpperCase()
  if (!code) {
    const countRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(heroMasterAtk)
    const nextNum = Number(countRes[0]?.count ?? 0) + 1
    code = `ATK-${String(nextNum).padStart(4, '0')}`
  }

  const [inserted] = await db
    .insert(heroMasterAtk)
    .values({
      code,
      name: payload.name.trim(),
      category: payload.category?.trim() || 'Umum',
      unit: payload.unit?.trim() || 'Pcs',
      description: payload.description?.trim() || '',
      minStock: payload.minStock ?? 0,
      isActive: payload.isActive ?? true,
    })
    .returning()

  revalidatePath('/dashboard/ga/atk/master')
  revalidatePath('/dashboard/ga/atk')
  revalidatePath('/mobile/atk/new')

  return { success: true, item: inserted }
}

export async function updateMasterAtkItem(
  id: number,
  payload: {
    code?: string
    name?: string
    category?: string
    unit?: string
    description?: string
    minStock?: number
    isActive?: boolean
  }
) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) throw new Error('Unauthorized')

  const permission = await getCurrentMenuPermission('ga-atk')
  const isSuper = isSuperAdminRole(currentEmployee.accessRole)
  if (!permission.canEdit && !isSuper) {
    throw new Error('Anda tidak memiliki hak akses untuk mengubah master data ATK')
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (payload.code !== undefined) updateData.code = payload.code.trim().toUpperCase()
  if (payload.name !== undefined) updateData.name = payload.name.trim()
  if (payload.category !== undefined) updateData.category = payload.category.trim()
  if (payload.unit !== undefined) updateData.unit = payload.unit.trim()
  if (payload.description !== undefined) updateData.description = payload.description.trim()
  if (payload.minStock !== undefined) updateData.minStock = payload.minStock
  if (payload.isActive !== undefined) updateData.isActive = payload.isActive

  const [updated] = await db
    .update(heroMasterAtk)
    .set(updateData)
    .where(eq(heroMasterAtk.id, id))
    .returning()

  revalidatePath('/dashboard/ga/atk/master')
  revalidatePath('/dashboard/ga/atk')
  revalidatePath('/mobile/atk/new')

  return { success: true, item: updated }
}

export async function deleteMasterAtkItem(id: number) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) throw new Error('Unauthorized')

  const permission = await getCurrentMenuPermission('ga-atk')
  const isSuper = isSuperAdminRole(currentEmployee.accessRole)
  if (!permission.canDelete && !isSuper) {
    throw new Error('Anda tidak memiliki hak akses untuk menghapus item ATK')
  }

  // Cek apakah item sudah digunakan di request
  const used = await db
    .select({ id: heroAtkRequestItems.id })
    .from(heroAtkRequestItems)
    .where(eq(heroAtkRequestItems.masterAtkId, id))
    .limit(1)

  if (used.length > 0) {
    // Soft-deactivate if used
    await db
      .update(heroMasterAtk)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(heroMasterAtk.id, id))
    revalidatePath('/dashboard/ga/atk/master')
    return { success: true, message: 'Item telah dinonaktifkan karena memiliki riwayat pengajuan' }
  }

  await db.delete(heroMasterAtk).where(eq(heroMasterAtk.id, id))
  revalidatePath('/dashboard/ga/atk/master')
  return { success: true, message: 'Item berhasil dihapus' }
}

export async function toggleMasterAtkStatus(id: number, isActive: boolean) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) throw new Error('Unauthorized')

  await db
    .update(heroMasterAtk)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(heroMasterAtk.id, id))

  revalidatePath('/dashboard/ga/atk/master')
  return { success: true }
}

// ── ATK Requests Actions ───────────────────────────────────────────────────

export async function getAtkRequests(filters?: {
  status?: string
  siteId?: number
  departmentId?: number
  search?: string
  startDate?: string
  endDate?: string
  ownOnly?: boolean
  limit?: number
  offset?: number
}) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) throw new Error('Unauthorized')

  const permission = await getCurrentMenuPermission('ga-atk')
  const isSuper = isSuperAdminRole(currentEmployee.accessRole)
  const isPICorAdmin = permission.canEdit || permission.canDelete || isSuper

  const conditions = []

  // Scope restriction: standard employee only sees own requests unless ownOnly is explicitly false and user is PIC
  if (filters?.ownOnly || (!isPICorAdmin && permission.dataScope === 'own')) {
    conditions.push(eq(heroAtkRequests.employeeId, currentEmployee.id))
  } else if (!isPICorAdmin && permission.dataScope === 'site' && currentEmployee.siteId) {
    conditions.push(eq(heroAtkRequests.siteId, currentEmployee.siteId))
  }

  if (filters?.status && filters.status !== 'all') {
    conditions.push(eq(heroAtkRequests.status, filters.status))
  }
  if (filters?.siteId && filters.siteId > 0) {
    conditions.push(eq(heroAtkRequests.siteId, filters.siteId))
  }
  if (filters?.departmentId && filters.departmentId > 0) {
    conditions.push(eq(heroAtkRequests.departmentId, filters.departmentId))
  }
  if (filters?.startDate) {
    conditions.push(sql`${heroAtkRequests.requestDate} >= ${filters.startDate}::timestamp`)
  }
  if (filters?.endDate) {
    conditions.push(sql`${heroAtkRequests.requestDate} <= ${filters.endDate}::timestamp + interval '1 day'`)
  }
  if (filters?.search?.trim()) {
    const term = `%${filters.search.trim()}%`
    conditions.push(
      or(
        ilike(heroAtkRequests.requestNumber, term),
        ilike(heroAtkRequests.targetRecipientName, term),
        ilike(heroAtkRequests.notes, term),
        ilike(employees.name, term),
        ilike(employees.employeeSn, term)
      )
    )
  }

  const query = db
    .select({
      id: heroAtkRequests.id,
      requestNumber: heroAtkRequests.requestNumber,
      requestType: heroAtkRequests.requestType,
      targetRecipientName: heroAtkRequests.targetRecipientName,
      requestDate: heroAtkRequests.requestDate,
      status: heroAtkRequests.status,
      notes: heroAtkRequests.notes,
      requesterSignatureUrl: heroAtkRequests.requesterSignatureUrl,
      reviewerNote: heroAtkRequests.reviewerNote,
      reviewedAt: heroAtkRequests.reviewedAt,
      recipientSignatureUrl: heroAtkRequests.recipientSignatureUrl,
      recipientName: heroAtkRequests.recipientName,
      completedAt: heroAtkRequests.completedAt,
      createdAt: heroAtkRequests.createdAt,
      employeeId: heroAtkRequests.employeeId,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      employeeEmail: employees.email,
      siteId: heroAtkRequests.siteId,
      siteName: sites.name,
      departmentId: heroAtkRequests.departmentId,
      departmentName: masterDepartments.name,
      reviewerName: sql<string>`reviewer.name`,
      totalItems: sql<number>`count(${heroAtkRequestItems.id})::int`,
    })
    .from(heroAtkRequests)
    .innerJoin(employees, eq(heroAtkRequests.employeeId, employees.id))
    .innerJoin(sites, eq(heroAtkRequests.siteId, sites.id))
    .leftJoin(masterDepartments, eq(heroAtkRequests.departmentId, masterDepartments.id))
    .leftJoin(heroAtkRequestItems, eq(heroAtkRequests.id, heroAtkRequestItems.requestId))
    .leftJoin(sql`hero_employees as reviewer`, sql`${heroAtkRequests.processedByEmployeeId} = reviewer.id`)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(
      heroAtkRequests.id,
      employees.id,
      sites.id,
      masterDepartments.id,
      sql`reviewer.name`
    )
    .orderBy(desc(heroAtkRequests.requestDate))

  if (filters?.limit) {
    query.limit(filters.limit)
  }
  if (filters?.offset) {
    query.offset(filters.offset)
  }

  const rows = await query
  return rows
}

export async function getAtkRequestById(id: number) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) throw new Error('Unauthorized')

  const [request] = await db
    .select({
      id: heroAtkRequests.id,
      requestNumber: heroAtkRequests.requestNumber,
      requestType: heroAtkRequests.requestType,
      targetRecipientName: heroAtkRequests.targetRecipientName,
      requestDate: heroAtkRequests.requestDate,
      status: heroAtkRequests.status,
      notes: heroAtkRequests.notes,
      requesterSignatureUrl: heroAtkRequests.requesterSignatureUrl,
      reviewerNote: heroAtkRequests.reviewerNote,
      reviewedAt: heroAtkRequests.reviewedAt,
      recipientSignatureUrl: heroAtkRequests.recipientSignatureUrl,
      recipientName: heroAtkRequests.recipientName,
      completedAt: heroAtkRequests.completedAt,
      createdAt: heroAtkRequests.createdAt,
      employeeId: heroAtkRequests.employeeId,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      employeeEmail: employees.email,
      employeePosition: employees.jobTitle,
      siteId: heroAtkRequests.siteId,
      siteName: sites.name,
      departmentId: heroAtkRequests.departmentId,
      departmentName: masterDepartments.name,
      processedByEmployeeId: heroAtkRequests.processedByEmployeeId,
      reviewerName: sql<string>`reviewer.name`,
    })
    .from(heroAtkRequests)
    .innerJoin(employees, eq(heroAtkRequests.employeeId, employees.id))
    .innerJoin(sites, eq(heroAtkRequests.siteId, sites.id))
    .leftJoin(masterDepartments, eq(heroAtkRequests.departmentId, masterDepartments.id))
    .leftJoin(sql`hero_employees as reviewer`, sql`${heroAtkRequests.processedByEmployeeId} = reviewer.id`)
    .where(eq(heroAtkRequests.id, id))
    .limit(1)

  if (!request) return null

  const items = await db
    .select({
      id: heroAtkRequestItems.id,
      masterAtkId: heroAtkRequestItems.masterAtkId,
      customItemName: heroAtkRequestItems.customItemName,
      quantity: heroAtkRequestItems.quantity,
      unit: heroAtkRequestItems.unit,
      notes: heroAtkRequestItems.notes,
      masterCode: heroMasterAtk.code,
      masterName: heroMasterAtk.name,
      masterCategory: heroMasterAtk.category,
      masterUnit: heroMasterAtk.unit,
    })
    .from(heroAtkRequestItems)
    .leftJoin(heroMasterAtk, eq(heroAtkRequestItems.masterAtkId, heroMasterAtk.id))
    .where(eq(heroAtkRequestItems.requestId, id))

  return {
    ...request,
    items: items.map((item) => ({
      ...item,
      displayName: item.masterName || item.customItemName || 'Item ATK',
      displayUnit: item.unit || item.masterUnit || 'Pcs',
    })),
  }
}

export async function createAtkRequest(payload: {
  requestType: 'personal' | 'department'
  targetRecipientName?: string
  siteId?: number
  departmentId?: number
  notes?: string
  requesterSignatureUrl?: string
  items: Array<{
    masterAtkId?: number | null
    customItemName?: string
    quantity: number
    unit?: string
    notes?: string
  }>
}) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) throw new Error('Unauthorized')

  if (!payload.items || payload.items.length === 0) {
    throw new Error('Minimal harus menambahkan satu item ATK')
  }

  const siteId = payload.siteId || currentEmployee.siteId
  if (!siteId) throw new Error('Site ID wajib dipilih')

  // Generate Request Number: ATK-YYYYMM-XXXX
  const now = new Date()
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const randSuffix = Math.floor(1000 + Math.random() * 9000)
  const requestNumber = `ATK-${yearMonth}-${randSuffix}`

  const [newRequest] = await db
    .insert(heroAtkRequests)
    .values({
      requestNumber,
      employeeId: currentEmployee.id,
      siteId,
      departmentId: payload.departmentId || currentEmployee.departmentId,
      requestType: payload.requestType,
      targetRecipientName: payload.targetRecipientName?.trim() || '',
      requestDate: now,
      status: 'pending_approval',
      notes: payload.notes?.trim() || '',
      requesterSignatureUrl: payload.requesterSignatureUrl || null,
    })
    .returning()

  // Insert items
  const itemsToInsert = payload.items.map((item) => ({
    requestId: newRequest.id,
    masterAtkId: item.masterAtkId || null,
    customItemName: item.customItemName?.trim() || '',
    quantity: Math.max(1, Number(item.quantity) || 1),
    unit: item.unit?.trim() || 'Pcs',
    notes: item.notes?.trim() || '',
  }))

  await db.insert(heroAtkRequestItems).values(itemsToInsert)

  // Notify GA Admin / PIC if email exists
  try {
    const gaAdmins = await db
      .select({ email: employees.email })
      .from(employees)
      .where(
        or(
          ilike(employees.accessRole, '%GA%'),
          ilike(employees.accessRole, '%Admin%'),
          ilike(employees.accessRole, '%Super Admin%')
        )
      )
      .limit(10)

    const recipientEmails = gaAdmins.map((g) => g.email).filter(Boolean)
    if (recipientEmails.length > 0) {
      await notifyWorkflowBellRecipients({
        recipientEmails,
        eventType: 'atk_request_submitted',
        category: 'workflow',
        title: 'Pengajuan ATK Baru',
        body: `${currentEmployee.name} mengajukan ${itemsToInsert.length} item ATK (${requestNumber}).`,
        url: `/dashboard/ga/atk?highlight=${newRequest.id}`,
      })
    }
  } catch (err) {
    console.error('Failed to send GA notification bell:', err)
  }

  revalidatePath('/dashboard/ga/atk')
  revalidatePath('/mobile/atk')

  return { success: true, requestId: newRequest.id, requestNumber }
}

export async function updateAtkRequestStatus(
  id: number,
  payload: {
    status: 'pending_approval' | 'approved' | 'ready_for_pickup' | 'completed' | 'rejected'
    reviewerNote?: string
    recipientSignatureUrl?: string
    recipientName?: string
  }
) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) throw new Error('Unauthorized')

  const permission = await getCurrentMenuPermission('ga-atk')
  const isSuper = isSuperAdminRole(currentEmployee.accessRole)

  // Standard user can only sign receipt if status is ready_for_pickup to completed
  const isSignOnly =
    payload.status === 'completed' && payload.recipientSignatureUrl && !permission.canEdit && !isSuper

  if (!permission.canEdit && !permission.canDelete && !isSuper && !isSignOnly) {
    throw new Error('Anda tidak memiliki izin untuk mengubah status pengajuan ini')
  }

  const existing = await db
    .select()
    .from(heroAtkRequests)
    .where(eq(heroAtkRequests.id, id))
    .limit(1)

  if (!existing[0]) throw new Error('Pengajuan ATK tidak ditemukan')

  const now = new Date()
  const updateData: Record<string, unknown> = {
    status: payload.status,
    updatedAt: now,
  }

  if (payload.reviewerNote !== undefined) {
    updateData.reviewerNote = payload.reviewerNote.trim()
  }

  if (payload.status === 'approved' || payload.status === 'ready_for_pickup' || payload.status === 'rejected') {
    updateData.processedByEmployeeId = currentEmployee.id
    updateData.reviewedAt = now
  }

  if (payload.status === 'completed') {
    updateData.completedAt = now
    if (payload.recipientSignatureUrl) {
      updateData.recipientSignatureUrl = payload.recipientSignatureUrl
    }
    if (payload.recipientName) {
      updateData.recipientName = payload.recipientName.trim()
    } else if (!existing[0].recipientName) {
      updateData.recipientName = currentEmployee.name
    }
  }

  const [updated] = await db
    .update(heroAtkRequests)
    .set(updateData)
    .where(eq(heroAtkRequests.id, id))
    .returning()

  // Notify Requester
  try {
    const [requester] = await db
      .select({ email: employees.email, name: employees.name })
      .from(employees)
      .where(eq(employees.id, existing[0].employeeId))
      .limit(1)

    if (requester?.email) {
      const statusLabels: Record<string, string> = {
        approved: 'Disetujui / Sedang Disiapkan',
        ready_for_pickup: 'Siap Diambil di Bagian GA',
        completed: 'Telah Selesai Diserahkan',
        rejected: 'Ditolak',
      }
      const label = statusLabels[payload.status] || payload.status

      await notifyWorkflowBellRecipients({
        recipientEmails: [requester.email],
        eventType: 'atk_request_status_updated',
        category: 'workflow',
        title: `Status ATK: ${label}`,
        body: `Pengajuan ATK Anda (${existing[0].requestNumber}) kini berstatus: ${label}. ${payload.reviewerNote ? `Catatan: ${payload.reviewerNote}` : ''}`,
        url: `/mobile/atk/${id}`,
      })
    }
  } catch (err) {
    console.error('Failed to notify requester:', err)
  }

  revalidatePath('/dashboard/ga/atk')
  revalidatePath(`/dashboard/ga/atk/${id}`)
  revalidatePath('/mobile/atk')
  revalidatePath(`/mobile/atk/${id}`)

  return { success: true, item: updated }
}

export async function deleteAtkRequest(id: number) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) throw new Error('Unauthorized')

  const permission = await getCurrentMenuPermission('ga-atk')
  const isSuper = isSuperAdminRole(currentEmployee.accessRole)

  const [existing] = await db
    .select()
    .from(heroAtkRequests)
    .where(eq(heroAtkRequests.id, id))
    .limit(1)

  if (!existing) throw new Error('Pengajuan tidak ditemukan')

  // Requester can delete if still pending, admin/super can delete anytime
  const isOwner = existing.employeeId === currentEmployee.id
  const canOwnerDelete = isOwner && existing.status === 'pending_approval'

  if (!permission.canDelete && !isSuper && !canOwnerDelete) {
    throw new Error('Anda tidak memiliki hak akses untuk menghapus pengajuan ini')
  }

  await db.delete(heroAtkRequests).where(eq(heroAtkRequests.id, id))

  revalidatePath('/dashboard/ga/atk')
  revalidatePath('/mobile/atk')

  return { success: true, message: 'Pengajuan ATK berhasil dihapus' }
}

export async function getAtkDashboardMetrics(siteId?: number) {
  const currentEmployee = await getCurrentEmployee()
  if (!currentEmployee) throw new Error('Unauthorized')

  const conditions = []
  if (siteId && siteId > 0) {
    conditions.push(eq(heroAtkRequests.siteId, siteId))
  }

  const statusCounts = await db
    .select({
      status: heroAtkRequests.status,
      count: sql<number>`count(*)::int`,
    })
    .from(heroAtkRequests)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .groupBy(heroAtkRequests.status)

  let total = 0
  let pending = 0
  let approved = 0
  let readyForPickup = 0
  let completed = 0
  let rejected = 0

  statusCounts.forEach((s) => {
    total += s.count
    if (s.status === 'pending_approval') pending += s.count
    else if (s.status === 'approved') approved += s.count
    else if (s.status === 'ready_for_pickup') readyForPickup += s.count
    else if (s.status === 'completed') completed += s.count
    else if (s.status === 'rejected') rejected += s.count
  })

  // Count active master items
  const [masterCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(heroMasterAtk)
    .where(eq(heroMasterAtk.isActive, true))

  return {
    total,
    pending,
    approved,
    readyForPickup,
    completed,
    rejected,
    inProgress: approved + readyForPickup,
    activeMasterItems: masterCount?.count ?? 0,
  }
}
