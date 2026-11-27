'use server'

import { revalidatePath } from 'next/cache'
import { and, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  fuelTanks,
  fuelTransactions,
  fuelAuditLogs,
  FuelTank,
  FuelTransaction,
} from '@/db/schema/fuel-management'
import { heroVehicles } from '@/db/schema/vehicles'
import { employees } from '@/db/schema/hero'
import { getServerSession } from '@/lib/auth-session'
import { getCurrentEmployee } from '@/lib/get-current-employee'

export interface FuelDashboardSummary {
  currentStock: number
  fuelInToday: number
  fuelOutToday: number
  monthlyConsumption: number
  tanks: Array<{
    id: number
    code: string
    name: string
    locationName: string
    capacityLiters: number
    currentStockLiters: number
    minStockAlertLiters: number
    stockPercentage: number
    isLowStock: boolean
    fuelType: string
    status: string
  }>
  recentTransactions: Array<FuelTransaction & { tankName?: string }>
}

export async function getFuelDashboardData(): Promise<FuelDashboardSummary> {
  try {
    const tanks = await db
      .select()
      .from(fuelTanks)
      .where(eq(fuelTanks.status, 'active'))
      .orderBy(fuelTanks.code)

    const mappedTanks = tanks.map((t) => {
      const cap = Number(t.capacityLiters) || 1
      const cur = Number(t.currentStockLiters) || 0
      const minAlert = Number(t.minStockAlertLiters) || 0
      const pct = Math.min(Math.round((cur / cap) * 100), 100)
      const isLowStock = cur <= minAlert || pct <= 20

      return {
        id: t.id,
        code: t.code,
        name: t.name,
        locationName: t.locationName,
        capacityLiters: cap,
        currentStockLiters: cur,
        minStockAlertLiters: minAlert,
        stockPercentage: pct,
        isLowStock,
        fuelType: t.fuelType,
        status: t.status,
      }
    })

    const currentStock = mappedTanks.reduce((acc, t) => acc + t.currentStockLiters, 0)

    // Today boundaries
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)

    // Today's Fuel In & Out
    const todayRows = await db
      .select({
        type: fuelTransactions.transactionType,
        quantity: fuelTransactions.quantityLiters,
      })
      .from(fuelTransactions)
      .where(gte(fuelTransactions.transactionDate, startOfToday))

    let fuelInToday = 0
    let fuelOutToday = 0
    for (const r of todayRows) {
      const q = Number(r.quantity) || 0
      if (r.type === 'fuel_in') fuelInToday += q
      if (r.type === 'fuel_out') fuelOutToday += q
    }

    // Monthly consumption (Fuel Out since start of month)
    const monthRows = await db
      .select({
        quantity: fuelTransactions.quantityLiters,
      })
      .from(fuelTransactions)
      .where(
        and(
          eq(fuelTransactions.transactionType, 'fuel_out'),
          gte(fuelTransactions.transactionDate, startOfMonth)
        )
      )

    const monthlyConsumption = monthRows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0)

    // Recent 10 transactions
    const recent = await db
      .select({
        tx: fuelTransactions,
        tankName: fuelTanks.name,
      })
      .from(fuelTransactions)
      .leftJoin(fuelTanks, eq(fuelTransactions.tankId, fuelTanks.id))
      .orderBy(desc(fuelTransactions.transactionDate))
      .limit(10)

    const recentTransactions = recent.map((r) => ({
      ...r.tx,
      tankName: r.tankName || 'Tangki BBM',
    }))

    return {
      currentStock,
      fuelInToday,
      fuelOutToday,
      monthlyConsumption,
      tanks: mappedTanks,
      recentTransactions,
    }
  } catch (error) {
    console.error('[getFuelDashboardData] Error:', error)
    return {
      currentStock: 0,
      fuelInToday: 0,
      fuelOutToday: 0,
      monthlyConsumption: 0,
      tanks: [],
      recentTransactions: [],
    }
  }
}

export async function getFuelTanks() {
  return await db
    .select()
    .from(fuelTanks)
    .where(eq(fuelTanks.status, 'active'))
    .orderBy(fuelTanks.code)
}

export async function getFuelEquipmentList() {
  try {
    const vehicles = await db
      .select({
        id: heroVehicles.id,
        vehicleCode: heroVehicles.vehicleCode,
        plateNumber: heroVehicles.plateNumber,
        vehicleType: heroVehicles.vehicleType,
        lastServiceOdometer: heroVehicles.lastServiceOdometer,
        locationName: heroVehicles.locationName,
      })
      .from(heroVehicles)
      .where(eq(heroVehicles.status, 'active'))
      .orderBy(heroVehicles.vehicleCode)

    return vehicles
  } catch (error) {
    console.error('[getFuelEquipmentList] Error:', error)
    return []
  }
}

export interface FuelTransactionFilters {
  startDate?: string
  endDate?: string
  type?: string // 'all' | 'fuel_in' | 'fuel_out'
  tankId?: number | null
  equipment?: string
  searchQuery?: string
}

export async function getFuelTransactions(filters: FuelTransactionFilters = {}) {
  try {
    const conditions = []

    if (filters.type && filters.type !== 'all') {
      conditions.push(eq(fuelTransactions.transactionType, filters.type))
    }

    if (filters.tankId) {
      conditions.push(eq(fuelTransactions.tankId, filters.tankId))
    }

    if (filters.equipment && filters.equipment.trim() !== '') {
      conditions.push(ilike(fuelTransactions.equipmentUnitCode, `%${filters.equipment.trim()}%`))
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate)
      start.setHours(0, 0, 0, 0)
      conditions.push(gte(fuelTransactions.transactionDate, start))
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate)
      end.setHours(23, 59, 59, 999)
      conditions.push(lte(fuelTransactions.transactionDate, end))
    }

    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
      const q = `%${filters.searchQuery.trim()}%`
      conditions.push(
        or(
          ilike(fuelTransactions.transactionNumber, q),
          ilike(fuelTransactions.deliveryOrderNumber, q),
          ilike(fuelTransactions.supplierName, q),
          ilike(fuelTransactions.equipmentUnitCode, q),
          ilike(fuelTransactions.operatorName, q),
          ilike(fuelTransactions.createdByName, q),
          ilike(fuelTransactions.notes, q)
        )
      )
    }

    const rows = await db
      .select({
        tx: fuelTransactions,
        tankCode: fuelTanks.code,
        tankName: fuelTanks.name,
      })
      .from(fuelTransactions)
      .leftJoin(fuelTanks, eq(fuelTransactions.tankId, fuelTanks.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(fuelTransactions.transactionDate))
      .limit(100)

    return rows.map((r) => ({
      ...r.tx,
      tankCode: r.tankCode,
      tankName: r.tankName || 'Tangki BBM',
    }))
  } catch (error) {
    console.error('[getFuelTransactions] Error:', error)
    return []
  }
}

export interface SubmitFuelInInput {
  tankId: number
  quantityLiters: number
  supplierName: string
  deliveryOrderNumber: string
  transactionDate?: string
  attachmentUrl?: string
  notes?: string
}

export async function submitFuelIn(input: SubmitFuelInInput) {
  const session = await getServerSession()
  const employee = await getCurrentEmployee()
  const createdByName = employee?.name || session?.user?.name || 'Petugas Lapangan'
  const createdByUserId = session?.user?.id ? String(session.user.id) : null

  const quantity = Number(input.quantityLiters)
  if (isNaN(quantity) || quantity <= 0) {
    return { success: false, message: 'Jumlah liter BBM harus lebih besar dari 0.' }
  }

  if (!input.tankId) {
    return { success: false, message: 'Harap pilih tangki penyimpanan BBM.' }
  }

  if (!input.supplierName.trim()) {
    return { success: false, message: 'Harap isi nama supplier BBM.' }
  }

  if (!input.deliveryOrderNumber.trim()) {
    return { success: false, message: 'Harap isi nomor Delivery Order (DO).' }
  }

  try {
    const [tank] = await db.select().from(fuelTanks).where(eq(fuelTanks.id, input.tankId)).limit(1)
    if (!tank) {
      return { success: false, message: 'Tangki penyimpanan tidak ditemukan.' }
    }

    const stockBefore = Number(tank.currentStockLiters) || 0
    const stockAfter = stockBefore + quantity
    const capacity = Number(tank.capacityLiters) || 10000

    if (stockAfter > capacity * 1.05) {
      return {
        success: false,
        message: `Kapasitas tangki (${capacity.toLocaleString('id-ID')} L) terlampaui. Total stok setelah pengisian menjadi ${stockAfter.toLocaleString('id-ID')} L.`,
      }
    }

    // Auto-generate transaction number FIN-YYYYMM-XXXX
    const dateObj = input.transactionDate ? new Date(input.transactionDate) : new Date()
    const ym = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}`
    const [countRow]: any = await db.execute(
      sql`SELECT COUNT(*)::int as count FROM hero_fuel_transactions WHERE transaction_type = 'fuel_in'`
    )
    const nextSeq = String(Number(countRow?.rows?.[0]?.count || 0) + 1).padStart(4, '0')
    const transactionNumber = `FIN-${ym}-${nextSeq}`

    // Insert transaction
    const [inserted] = await db
      .insert(fuelTransactions)
      .values({
        transactionNumber,
        transactionType: 'fuel_in',
        tankId: input.tankId,
        quantityLiters: String(quantity),
        stockBeforeLiters: String(stockBefore),
        stockAfterLiters: String(stockAfter),
        supplierName: input.supplierName.trim(),
        deliveryOrderNumber: input.deliveryOrderNumber.trim(),
        attachmentUrl: input.attachmentUrl || null,
        notes: input.notes?.trim() || null,
        transactionDate: dateObj,
        createdByUserId,
        createdByName,
      })
      .returning({ id: fuelTransactions.id })

    // Update tank current stock
    await db
      .update(fuelTanks)
      .set({
        currentStockLiters: String(stockAfter),
        updatedAt: new Date(),
      })
      .where(eq(fuelTanks.id, input.tankId))

    // Insert audit log
    await db.insert(fuelAuditLogs).values({
      transactionId: inserted.id,
      action: 'create',
      notes: `Penerimaan BBM ${quantity.toLocaleString('id-ID')} L dari ${input.supplierName.trim()} (DO: ${input.deliveryOrderNumber.trim()}). Stok tangki bertambah dari ${stockBefore} L menjadi ${stockAfter} L.`,
      performedByUserId: createdByUserId,
      performedByName: createdByName,
    })

    revalidatePath('/mobile/fuel-management')
    revalidatePath('/dashboard/fuel-management')

    return {
      success: true,
      message: `Penerimaan BBM ${transactionNumber} berhasil dicatat! Stok tangki kini ${stockAfter.toLocaleString('id-ID')} L.`,
      transactionNumber,
      id: inserted.id,
    }
  } catch (error: any) {
    console.error('[submitFuelIn] Error:', error)
    return { success: false, message: error?.message || 'Gagal menyimpan penerimaan BBM.' }
  }
}

export interface SubmitFuelOutInput {
  tankId: number
  quantityLiters: number
  equipmentUnitCode: string
  equipmentId?: number | null
  currentHmKm?: number | null
  operatorName?: string
  transactionDate?: string
  notes?: string
}

export async function submitFuelOut(input: SubmitFuelOutInput) {
  const session = await getServerSession()
  const employee = await getCurrentEmployee()
  const createdByName = employee?.name || session?.user?.name || 'Petugas Lapangan'
  const createdByUserId = session?.user?.id ? String(session.user.id) : null

  const quantity = Number(input.quantityLiters)
  if (isNaN(quantity) || quantity <= 0) {
    return { success: false, message: 'Jumlah liter pengisian BBM harus lebih besar dari 0.' }
  }

  if (!input.tankId) {
    return { success: false, message: 'Harap pilih sumber tangki BBM.' }
  }

  if (!input.equipmentUnitCode.trim()) {
    return { success: false, message: 'Harap pilih atau isi kode unit kendaraan / equipment.' }
  }

  try {
    const [tank] = await db.select().from(fuelTanks).where(eq(fuelTanks.id, input.tankId)).limit(1)
    if (!tank) {
      return { success: false, message: 'Tangki penyimpanan BBM tidak ditemukan.' }
    }

    const stockBefore = Number(tank.currentStockLiters) || 0
    if (stockBefore < quantity) {
      return {
        success: false,
        message: `Stok BBM tangki tidak mencukupi! Sisa stok saat ini: ${stockBefore.toLocaleString('id-ID')} L, permintaan pengisian: ${quantity.toLocaleString('id-ID')} L. Stok tidak boleh minus.`,
      }
    }

    const stockAfter = stockBefore - quantity

    // Check last HM/KM for this equipment
    let previousHmKm: number | null = null
    const [lastTx] = await db
      .select({ currentHmKm: fuelTransactions.currentHmKm })
      .from(fuelTransactions)
      .where(
        and(
          eq(fuelTransactions.transactionType, 'fuel_out'),
          eq(fuelTransactions.equipmentUnitCode, input.equipmentUnitCode.trim())
        )
      )
      .orderBy(desc(fuelTransactions.transactionDate))
      .limit(1)

    if (lastTx && lastTx.currentHmKm) {
      previousHmKm = Number(lastTx.currentHmKm)
    }

    // HM/KM validation: current must be >= previous if previous exists
    const currentHmKm = input.currentHmKm !== undefined && input.currentHmKm !== null ? Number(input.currentHmKm) : null
    if (previousHmKm !== null && currentHmKm !== null && currentHmKm < previousHmKm) {
      return {
        success: false,
        message: `HM / Odometer (${currentHmKm}) tidak boleh lebih kecil dari transaksi sebelumnya (${previousHmKm}).`,
      }
    }

    // Auto-generate transaction number FOUT-YYYYMM-XXXX
    const dateObj = input.transactionDate ? new Date(input.transactionDate) : new Date()
    const ym = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}`
    const [countRow]: any = await db.execute(
      sql`SELECT COUNT(*)::int as count FROM hero_fuel_transactions WHERE transaction_type = 'fuel_out'`
    )
    const nextSeq = String(Number(countRow?.rows?.[0]?.count || 0) + 1).padStart(4, '0')
    const transactionNumber = `FOUT-${ym}-${nextSeq}`

    // Insert transaction
    const [inserted] = await db
      .insert(fuelTransactions)
      .values({
        transactionNumber,
        transactionType: 'fuel_out',
        tankId: input.tankId,
        quantityLiters: String(quantity),
        stockBeforeLiters: String(stockBefore),
        stockAfterLiters: String(stockAfter),
        equipmentId: input.equipmentId || null,
        equipmentUnitCode: input.equipmentUnitCode.trim().toUpperCase(),
        previousHmKm: previousHmKm !== null ? String(previousHmKm) : null,
        currentHmKm: currentHmKm !== null ? String(currentHmKm) : null,
        operatorName: input.operatorName?.trim() || null,
        notes: input.notes?.trim() || null,
        transactionDate: dateObj,
        createdByUserId,
        createdByName,
      })
      .returning({ id: fuelTransactions.id })

    // Update tank current stock
    await db
      .update(fuelTanks)
      .set({
        currentStockLiters: String(stockAfter),
        updatedAt: new Date(),
      })
      .where(eq(fuelTanks.id, input.tankId))

    // Update vehicle odometer if matched
    if (input.equipmentId && currentHmKm) {
      await db
        .update(heroVehicles)
        .set({
          lastServiceOdometer: Math.round(currentHmKm),
          updatedAt: new Date(),
        })
        .where(eq(heroVehicles.id, input.equipmentId))
    }

    // Insert audit log
    await db.insert(fuelAuditLogs).values({
      transactionId: inserted.id,
      action: 'create',
      notes: `Pengisian BBM ${quantity.toLocaleString('id-ID')} L ke unit ${input.equipmentUnitCode.trim().toUpperCase()} (HM/KM: ${currentHmKm || '-'}). Sisa stok tangki berkurang dari ${stockBefore} L menjadi ${stockAfter} L.`,
      performedByUserId: createdByUserId,
      performedByName: createdByName,
    })

    revalidatePath('/mobile/fuel-management')
    revalidatePath('/dashboard/fuel-management')

    return {
      success: true,
      message: `Pengisian BBM ${transactionNumber} berhasil! Sisa stok tangki ${stockAfter.toLocaleString('id-ID')} L.`,
      transactionNumber,
      id: inserted.id,
    }
  } catch (error: any) {
    console.error('[submitFuelOut] Error:', error)
    return { success: false, message: error?.message || 'Gagal mencatat pengisian BBM.' }
  }
}
