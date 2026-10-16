'use server'

import { db } from '@/db'
import { heroVehicles, heroVehicleServiceLogs, type HeroVehicle, type NewHeroVehicle } from '@/db/schema/vehicles'
import { employees, sites } from '@/db/schema/hero'
import { eq, desc, asc, and, or, sql, like, ilike } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getCurrentEmployee } from '@/lib/get-current-employee'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'

import {
  computeVehicleStatus,
  calculateDateDiffDays,
  type DocumentAlertStatus,
  type VehicleComputedRow,
} from '@/lib/vehicle-status'

export type { DocumentAlertStatus, VehicleComputedRow }

export async function getAllVehicles(filters?: {
  search?: string
  category?: string
  ownership?: string
  location?: string
  status?: string
  documentStatus?: 'all' | 'stnk_expired' | 'tax_expired' | 'kir_expired' | 'service_due' | 'any_expired'
}): Promise<VehicleComputedRow[]> {
  const query = db
    .select({
      vehicle: heroVehicles,
      siteName: sites.name,
    })
    .from(heroVehicles)
    .leftJoin(sites, eq(heroVehicles.siteId, sites.id))
    .orderBy(asc(heroVehicles.plateNumber))

  const conditions: any[] = []

  if (filters?.category && filters.category !== 'all') {
    conditions.push(eq(heroVehicles.category, filters.category))
  }

  if (filters?.ownership && filters.ownership !== 'all') {
    conditions.push(eq(heroVehicles.ownership, filters.ownership))
  }

  if (filters?.location && filters.location !== 'all') {
    conditions.push(
      or(
        ilike(heroVehicles.locationName, `%${filters.location}%`),
        ilike(sites.name, `%${filters.location}%`)
      )
    )
  }

  if (filters?.status && filters.status !== 'all') {
    conditions.push(eq(heroVehicles.status, filters.status))
  }

  if (filters?.search) {
    const term = `%${filters.search.trim()}%`
    conditions.push(
      or(
        ilike(heroVehicles.plateNumber, term),
        ilike(heroVehicles.vehicleType, term),
        ilike(heroVehicles.vehicleCode, term),
        ilike(heroVehicles.holderName, term),
        ilike(heroVehicles.vinNumber, term),
        ilike(heroVehicles.engineNumber, term),
        ilike(heroVehicles.locationName, term)
      )
    )
  }

  if (conditions.length > 0) {
    query.where(and(...conditions))
  }

  const rows = await query
  const computed = rows.map((r) => {
    const res = computeVehicleStatus(r.vehicle)
    if (r.siteName) res.siteNameFallback = r.siteName
    return res
  })

  if (filters?.documentStatus && filters.documentStatus !== 'all') {
    switch (filters.documentStatus) {
      case 'stnk_expired':
        return computed.filter((c) => c.stnkAlertStatus === 'expired')
      case 'tax_expired':
        return computed.filter((c) => c.taxAlertStatus === 'expired')
      case 'kir_expired':
        return computed.filter((c) => c.kirAlertStatus === 'expired')
      case 'service_due':
        return computed.filter((c) => c.serviceAlertStatus === 'due')
      case 'any_expired':
        return computed.filter(
          (c) =>
            c.stnkAlertStatus === 'expired' ||
            c.taxAlertStatus === 'expired' ||
            c.kirAlertStatus === 'expired'
        )
      default:
        return computed
    }
  }

  return computed
}

export async function getVehicleMetrics() {
  const allVehicles = await getAllVehicles()

  const total = allVehicles.length
  const owned = allVehicles.filter((v) => v.ownership?.toLowerCase() === 'owned').length
  const rented = allVehicles.filter((v) => v.ownership?.toLowerCase() === 'rented').length

  const stnkExpired = allVehicles.filter((v) => v.stnkAlertStatus === 'expired').length
  const stnkWarning = allVehicles.filter((v) => v.stnkAlertStatus === 'warning').length

  const taxExpired = allVehicles.filter((v) => v.taxAlertStatus === 'expired').length
  const taxWarning = allVehicles.filter((v) => v.taxAlertStatus === 'warning').length

  const kirExpired = allVehicles.filter((v) => v.kirAlertStatus === 'expired').length
  const kirWarning = allVehicles.filter((v) => v.kirAlertStatus === 'warning').length

  const serviceDue = allVehicles.filter((v) => v.serviceAlertStatus === 'due').length
  const serviceWarning = 0

  return {
    total,
    totalUnits: total,
    owned,
    ownedUnits: owned,
    rented,
    rentedUnits: rented,
    stnkExpired,
    stnkWarning,
    taxExpired,
    taxWarning,
    kirExpired,
    kirWarning,
    serviceDue,
    serviceWarning: serviceWarning || 0,
    activeCount: allVehicles.filter((v) => v.status?.toLowerCase() === 'active').length,
    maintenanceCount: allVehicles.filter((v) => v.status?.toLowerCase() === 'maintenance').length,
  }
}

export async function getVehicleById(id: number) {
  const [vehicle] = await db
    .select({
      vehicle: heroVehicles,
      siteName: sites.name,
    })
    .from(heroVehicles)
    .leftJoin(sites, eq(heroVehicles.siteId, sites.id))
    .where(eq(heroVehicles.id, id))
    .limit(1)

  if (!vehicle) return null

  const serviceLogs = await db
    .select()
    .from(heroVehicleServiceLogs)
    .where(eq(heroVehicleServiceLogs.vehicleId, id))
    .orderBy(desc(heroVehicleServiceLogs.serviceDate))

  const computed = computeVehicleStatus(vehicle.vehicle)
  if (vehicle.siteName) computed.siteNameFallback = vehicle.siteName

  return {
    ...computed,
    serviceLogs,
  }
}

export async function createVehicle(payload: {
  vehicleType: string
  category: string
  plateNumber: string
  manufactureYear: number
  vinNumber?: string
  engineNumber?: string
  color?: string
  ownership: 'owned' | 'rented'
  rentalVendor?: string
  rentalCostMonthly?: string
  rentalStartDate?: string
  rentalEndDate?: string
  stnkExpiryDate?: string
  taxExpiryDate?: string
  kirExpiryDate?: string
  lastServiceDate?: string
  lastServiceOdometer?: number
  nextServiceDate?: string
  nextServiceOdometer?: number
  holderName?: string
  locationName?: string
  status?: string
  notes?: string
  photoUrl?: string
  stnkDocumentUrl?: string
  taxDocumentUrl?: string
  kirDocumentUrl?: string
}) {
  const current = await getCurrentEmployee()
  if (!current) throw new Error('Unauthorized')

  const cleanPlate = payload.plateNumber.trim().toUpperCase()

  // Generate code
  const countRes = await db.select({ count: sql<number>`count(*)` }).from(heroVehicles)
  const nextNum = (countRes[0]?.count || 0) + 1
  const categoryCode = payload.category.substring(0, 3).toUpperCase()
  const vehicleCode = `VEH-${categoryCode}-${String(nextNum).padStart(3, '0')}`

  const [created] = await db
    .insert(heroVehicles)
    .values({
      vehicleCode,
      vehicleType: payload.vehicleType.trim(),
      category: payload.category,
      plateNumber: cleanPlate,
      manufactureYear: Number(payload.manufactureYear),
      vinNumber: payload.vinNumber?.trim() || '',
      engineNumber: payload.engineNumber?.trim() || '',
      color: payload.color?.trim() || 'Putih',
      ownership: payload.ownership,
      rentalVendor: payload.rentalVendor?.trim() || null,
      rentalCostMonthly: payload.rentalCostMonthly ? payload.rentalCostMonthly : null,
      rentalStartDate: payload.rentalStartDate ? payload.rentalStartDate : null,
      rentalEndDate: payload.rentalEndDate ? payload.rentalEndDate : null,
      stnkExpiryDate: payload.stnkExpiryDate ? payload.stnkExpiryDate : null,
      taxExpiryDate: payload.taxExpiryDate ? payload.taxExpiryDate : null,
      kirExpiryDate: payload.kirExpiryDate ? payload.kirExpiryDate : null,
      lastServiceDate: payload.lastServiceDate ? payload.lastServiceDate : null,
      lastServiceOdometer: payload.lastServiceOdometer || 0,
      nextServiceDate: payload.nextServiceDate ? payload.nextServiceDate : null,
      nextServiceOdometer: payload.nextServiceOdometer || 0,
      holderName: payload.holderName?.trim() || '',
      locationName: payload.locationName?.trim() || 'Balikpapan',
      status: payload.status || 'active',
      notes: payload.notes?.trim() || null,
      photoUrl: payload.photoUrl || null,
      stnkDocumentUrl: payload.stnkDocumentUrl || null,
      taxDocumentUrl: payload.taxDocumentUrl || null,
      kirDocumentUrl: payload.kirDocumentUrl || null,
    })
    .returning()

  revalidatePath('/dashboard/ga/vehicles')
  revalidatePath('/mobile/ga/vehicles')
  return created
}

export async function updateVehicle(
  id: number,
  payload: {
    vehicleType?: string
    category?: string
    plateNumber?: string
    manufactureYear?: number
    vinNumber?: string
    engineNumber?: string
    color?: string
    ownership?: 'owned' | 'rented'
    rentalVendor?: string
    rentalCostMonthly?: string
    rentalStartDate?: string
    rentalEndDate?: string
    stnkExpiryDate?: string
    taxExpiryDate?: string
    kirExpiryDate?: string
    lastServiceDate?: string
    lastServiceOdometer?: number
    nextServiceDate?: string
    nextServiceOdometer?: number
    holderName?: string
    locationName?: string
    status?: string
    notes?: string
    photoUrl?: string
    stnkDocumentUrl?: string
    taxDocumentUrl?: string
    kirDocumentUrl?: string
  }
) {
  const current = await getCurrentEmployee()
  if (!current) throw new Error('Unauthorized')

  const updateValues: any = {
    updatedAt: new Date(),
  }

  if (payload.vehicleType !== undefined) updateValues.vehicleType = payload.vehicleType.trim()
  if (payload.category !== undefined) updateValues.category = payload.category
  if (payload.plateNumber !== undefined) updateValues.plateNumber = payload.plateNumber.trim().toUpperCase()
  if (payload.manufactureYear !== undefined) updateValues.manufactureYear = Number(payload.manufactureYear)
  if (payload.vinNumber !== undefined) updateValues.vinNumber = payload.vinNumber.trim()
  if (payload.engineNumber !== undefined) updateValues.engineNumber = payload.engineNumber.trim()
  if (payload.color !== undefined) updateValues.color = payload.color.trim()
  if (payload.ownership !== undefined) updateValues.ownership = payload.ownership
  if (payload.rentalVendor !== undefined) updateValues.rentalVendor = payload.rentalVendor?.trim() || null
  if (payload.rentalCostMonthly !== undefined) updateValues.rentalCostMonthly = payload.rentalCostMonthly || null
  if (payload.rentalStartDate !== undefined) updateValues.rentalStartDate = payload.rentalStartDate || null
  if (payload.rentalEndDate !== undefined) updateValues.rentalEndDate = payload.rentalEndDate || null
  if (payload.stnkExpiryDate !== undefined) updateValues.stnkExpiryDate = payload.stnkExpiryDate || null
  if (payload.taxExpiryDate !== undefined) updateValues.taxExpiryDate = payload.taxExpiryDate || null
  if (payload.kirExpiryDate !== undefined) updateValues.kirExpiryDate = payload.kirExpiryDate || null
  if (payload.lastServiceDate !== undefined) updateValues.lastServiceDate = payload.lastServiceDate || null
  if (payload.lastServiceOdometer !== undefined) updateValues.lastServiceOdometer = payload.lastServiceOdometer || 0
  if (payload.nextServiceDate !== undefined) updateValues.nextServiceDate = payload.nextServiceDate || null
  if (payload.nextServiceOdometer !== undefined) updateValues.nextServiceOdometer = payload.nextServiceOdometer || 0
  if (payload.holderName !== undefined) updateValues.holderName = payload.holderName?.trim() || ''
  if (payload.locationName !== undefined) updateValues.locationName = payload.locationName?.trim() || 'Balikpapan'
  if (payload.status !== undefined) updateValues.status = payload.status
  if (payload.notes !== undefined) updateValues.notes = payload.notes?.trim() || null
  if (payload.photoUrl !== undefined) updateValues.photoUrl = payload.photoUrl || null
  if (payload.stnkDocumentUrl !== undefined) updateValues.stnkDocumentUrl = payload.stnkDocumentUrl || null
  if (payload.taxDocumentUrl !== undefined) updateValues.taxDocumentUrl = payload.taxDocumentUrl || null
  if (payload.kirDocumentUrl !== undefined) updateValues.kirDocumentUrl = payload.kirDocumentUrl || null

  const [updated] = await db
    .update(heroVehicles)
    .set(updateValues)
    .where(eq(heroVehicles.id, id))
    .returning()

  revalidatePath('/dashboard/ga/vehicles')
  revalidatePath('/mobile/ga/vehicles')
  return updated
}

export async function deleteVehicle(id: number) {
  const current = await getCurrentEmployee()
  if (!current) throw new Error('Unauthorized')

  await db.delete(heroVehicles).where(eq(heroVehicles.id, id))

  revalidatePath('/dashboard/ga/vehicles')
  revalidatePath('/mobile/ga/vehicles')
  return { success: true }
}

export async function addVehicleServiceLog(payload: {
  vehicleId: number
  serviceDate: string
  serviceType: string
  odometer?: number
  workshopName?: string
  cost?: string
  description: string
  invoiceUrl?: string
}) {
  const current = await getCurrentEmployee()
  if (!current) throw new Error('Unauthorized')

  const [log] = await db
    .insert(heroVehicleServiceLogs)
    .values({
      vehicleId: payload.vehicleId,
      serviceDate: payload.serviceDate,
      serviceType: payload.serviceType,
      odometer: payload.odometer || 0,
      workshopName: payload.workshopName || '',
      cost: payload.cost || '0',
      description: payload.description,
      invoiceUrl: payload.invoiceUrl || null,
      performedByEmployeeId: current.id,
    })
    .returning()

  // Update vehicle last service date and odometer
  await db
    .update(heroVehicles)
    .set({
      lastServiceDate: payload.serviceDate,
      lastServiceOdometer: payload.odometer || 0,
      updatedAt: new Date(),
    })
    .where(eq(heroVehicles.id, payload.vehicleId))

  revalidatePath('/dashboard/ga/vehicles')
  revalidatePath('/mobile/ga/vehicles')
  return log
}

export async function triggerVehicleReminderCheck() {
  const metrics = await getVehicleMetrics()
  const allVehicles = await getAllVehicles()

  const expiredOrWarning = allVehicles.filter(
    (v) =>
      v.stnkAlertStatus === 'expired' ||
      v.stnkAlertStatus === 'warning' ||
      v.taxAlertStatus === 'expired' ||
      v.taxAlertStatus === 'warning' ||
      v.kirAlertStatus === 'expired' ||
      v.kirAlertStatus === 'warning' ||
      v.serviceAlertStatus === 'due'
  )

  if (expiredOrWarning.length > 0) {
    // Notify through bell
    const adminEmployees = await db
      .select({ id: employees.id, email: employees.email })
      .from(employees)
      .where(sql`LOWER(role) LIKE '%admin%' OR LOWER(department) LIKE '%general affairs%'`)
      .limit(5)

    const recipientEmails = adminEmployees.map((e) => e.email)

    await notifyWorkflowBellRecipients({
      recipientEmails,
      eventType: 'ga_vehicle_reminder',
      category: 'info',
      title: '🚨 Reminder Surat & Servis Armada Kendaraan GA',
      body: `Terdapat ${metrics.stnkExpired + metrics.taxExpired + metrics.kirExpired} dokumen armada expired dan ${metrics.stnkWarning + metrics.taxWarning + metrics.kirWarning} unit mendekati jatuh tempo.`,
      url: '/dashboard/ga/vehicles',
    }).catch(() => {})
  }

  return {
    checkedCount: allVehicles.length,
    alertsCount: expiredOrWarning.length,
    metrics,
  }
}
