'use server'

import { db } from '@/db'
import {
  centralServiceForecastPeriods,
  centralServiceForecastItems,
  centralServiceForecastActuals,
  centralServiceForecastHistories,
} from '@/db/schema/central-service'
import { eq, desc, and, sql, ilike, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

import { parseMonthYearToYearMonth } from '@/lib/cs-forecast-daily-report'

export async function syncAllCarryOverItems() {
  try {
    const carryOverItems = await db
      .select()
      .from(centralServiceForecastItems)
      .where(sql`LOWER(TRIM(${centralServiceForecastItems.status})) = 'carry over'`)

    for (const item of carryOverItems) {
      await handleCarryOverPropagation(db, item)
    }
  } catch (err) {
    console.error('Error syncing carry over items:', err)
  }
}

export async function getForecastPeriods() {
  try {
    await syncAllCarryOverItems()
    const rawPeriods = await db
      .select()
      .from(centralServiceForecastPeriods)

    // ponytail: sort chronologically desc (year * 12 + month)
    const allPeriods = [...rawPeriods].sort((a, b) => {
      const parsedA = parseMonthYearToYearMonth(a.monthYear)
      const parsedB = parseMonthYearToYearMonth(b.monthYear)
      const keyA = parsedA ? parsedA.year * 12 + parsedA.month : 0
      const keyB = parsedB ? parsedB.year * 12 + parsedB.month : 0
      if (keyA !== keyB) return keyB - keyA
      return b.id - a.id
    })

    const uniquePeriods: typeof allPeriods = []
    const seen = new Set<string>()
    for (const p of allPeriods) {
      const key = (p.monthYear || '').trim().toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        uniquePeriods.push(p)
      }
    }
    return uniquePeriods
  } catch (err) {
    console.error('Error in getForecastPeriods:', err)
    return []
  }
}

export async function getSalesEmployees() {
  const { employees } = await import('@/db/schema/hero')
  return await db
    .select({
      id: employees.id,
      name: employees.name,
      department: employees.department,
    })
    .from(employees)
    .where(ilike(employees.department, '%Sales%'))
    .orderBy(employees.name)
}

export async function createForecastPeriod(data: {
  monthYear: string
  exchangeRateIdrToUsd: string
}) {
  await db.insert(centralServiceForecastPeriods).values({
    monthYear: data.monthYear,
    exchangeRateIdrToUsd: data.exchangeRateIdrToUsd,
    status: 'Draft',
  })
  revalidatePath('/dashboard/central-service/forecast')
  revalidatePath('/dashboard/central-service/forecast/monthly')
}

export async function updateForecastPeriodStatus(id: number, status: string) {
  await db
    .update(centralServiceForecastPeriods)
    .set({ status, updatedAt: new Date() })
    .where(eq(centralServiceForecastPeriods.id, id))
  revalidatePath('/dashboard/central-service/forecast')
  revalidatePath('/dashboard/central-service/forecast/monthly')
}

export async function updatePeriodExchangeRate(id: number, rate: string) {
  await db
    .update(centralServiceForecastPeriods)
    .set({ exchangeRateIdrToUsd: rate, updatedAt: new Date() })
    .where(eq(centralServiceForecastPeriods.id, id))
  revalidatePath('/dashboard/central-service/forecast')
  revalidatePath('/dashboard/central-service/forecast/monthly')
  revalidatePath('/dashboard/central-service/forecast/daily')
}

export async function getRealtimeExchangeRate() {
  try {
    const response = await fetch(
      'https://v6.exchangerate-api.com/v6/06e9b7015f4acef21c8bad94/latest/USD',
      {
        next: { revalidate: 3600 },
      }
    )
    const data = await response.json()
    const rate = data?.conversion_rates?.IDR

    if (data?.result === 'success' && Number.isFinite(rate)) {
      return { success: true, rate }
    }

    return { success: false, error: 'Failed to fetch exchange rate' }
  } catch (error) {
    console.error('Exchange rate error:', error)
    return { success: false, error: 'Failed to fetch exchange rate' }
  }
}

export async function deleteForecastPeriod(id: number) {
  await db.delete(centralServiceForecastPeriods).where(eq(centralServiceForecastPeriods.id, id))
  revalidatePath('/dashboard/central-service/forecast/monthly')
}

export async function getForecastItems(periodId: number) {
  return await db
    .select()
    .from(centralServiceForecastItems)
    .where(eq(centralServiceForecastItems.periodId, periodId))
    .orderBy(desc(centralServiceForecastItems.createdAt))
}

export async function getWaitingForecastItems() {
  // For daily admin - get all items that are 'Waiting'
  return await db
    .select()
    .from(centralServiceForecastItems)
    .where(eq(centralServiceForecastItems.status, 'Waiting'))
}

export async function getDailyForecastItems() {
  try {
    await syncAllCarryOverItems()
    const [items, allActuals, periods] = await Promise.all([
      db
        .select({
          item: centralServiceForecastItems,
          period: centralServiceForecastPeriods,
        })
        .from(centralServiceForecastItems)
        .innerJoin(
          centralServiceForecastPeriods,
          eq(centralServiceForecastItems.periodId, centralServiceForecastPeriods.id)
        )
        .orderBy(desc(centralServiceForecastPeriods.monthYear)),
      db
        .select()
        .from(centralServiceForecastActuals)
        .orderBy(desc(centralServiceForecastActuals.updateDate)),
      db.select().from(centralServiceForecastPeriods),
    ])

    const periodMap = new Map(periods.map((p) => [p.id, p]))

    const actualsByItemId = new Map<number, typeof allActuals>()
    const unplannedActuals: typeof allActuals = []

    allActuals.forEach((a) => {
      if (a.forecastItemId) {
        const list = actualsByItemId.get(a.forecastItemId) || []
        list.push(a)
        actualsByItemId.set(a.forecastItemId, list)
      } else {
        unplannedActuals.push(a)
      }
    })

    const result: any[] = items.map((i) => ({
      ...i,
      actuals: actualsByItemId.get(i.item.id) || [],
    }))

    const unplannedGrouped = new Map<string, typeof allActuals>()
    unplannedActuals.forEach((a) => {
      const key = `${a.customer || 'Unknown'}_${a.periodId || 0}`
      const list = unplannedGrouped.get(key) || []
      list.push(a)
      unplannedGrouped.set(key, list)
    })

    let syntheticIdCounter = -1
    unplannedGrouped.forEach((actualList, _key) => {
      const first = actualList[0]
      const period = periodMap.get(first.periodId || 0) || {
        id: first.periodId || 0,
        monthYear: 'Unknown',
      }
      result.push({
        item: {
          id: syntheticIdCounter--,
          periodId: first.periodId,
          customer: first.customer || 'Unplanned Customer',
          picSales: 'Unplanned',
          isProductAccessories: false,
          accessoriesAmountIdr: '0',
          osInvoicePrevMonth: '0',
          repairForecast: '0',
          retreadForecast: '0',
          serviceForecast: '0',
          status: 'Unplanned SAP',
          remark: 'Unplanned Actual',
          isUnplanned: true,
        },
        period,
        actuals: actualList,
      })
    })

    return result
  } catch (err) {
    console.error('Error in getDailyForecastItems:', err)
    return []
  }
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const SHORT_MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

export async function getNextMonthYear(monthYearStr: string): Promise<string> {
  if (!monthYearStr) return 'Next Month'
  const trimmed = monthYearStr.trim()

  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    const [yearStr, monthStr] = trimmed.split('-')
    let year = parseInt(yearStr, 10)
    let month = parseInt(monthStr, 10)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
    return `${year}-${String(month).padStart(2, '0')}`
  }

  const parts = trimmed.split(/\s+/)
  if (parts.length === 2) {
    const mStr = parts[0].toLowerCase()
    let monthIndex = MONTH_NAMES.findIndex((m) => m.toLowerCase() === mStr)
    let isShort = false
    if (monthIndex === -1) {
      monthIndex = SHORT_MONTH_NAMES.findIndex((m) => m.toLowerCase() === mStr)
      if (monthIndex !== -1) isShort = true
    }

    if (monthIndex !== -1) {
      let year = parseInt(parts[1], 10)
      if (!isNaN(year)) {
        let nextIndex = monthIndex + 1
        if (nextIndex >= 12) {
          nextIndex = 0
          year += 1
        }
        const nameList = isShort ? SHORT_MONTH_NAMES : MONTH_NAMES
        return `${nameList[nextIndex]} ${year}`
      }
    }
  }

  return `${trimmed} (Next)`
}

async function handleCarryOverPropagation(tx: any, item: any) {
  if (!item?.periodId) return

  const [period] = await tx
    .select()
    .from(centralServiceForecastPeriods)
    .where(eq(centralServiceForecastPeriods.id, Number(item.periodId)))
    .limit(1)

  if (!period) return

  const nextMonthYear = await getNextMonthYear(period.monthYear)

  let [nextPeriod] = await tx
    .select()
    .from(centralServiceForecastPeriods)
    .where(sql`LOWER(TRIM(${centralServiceForecastPeriods.monthYear})) = LOWER(TRIM(${nextMonthYear}))`)
    .limit(1)

  if (!nextPeriod) {
    try {
      const inserted = await tx
        .insert(centralServiceForecastPeriods)
        .values({ monthYear: nextMonthYear, status: 'Draft' })
        .onConflictDoNothing()
        .returning()
      nextPeriod = inserted[0]
    } catch (_e) {
      // Ignore duplicate insert error
    }
  }

  if (!nextPeriod?.id) {
    const [fetched] = await tx
      .select()
      .from(centralServiceForecastPeriods)
      .where(sql`LOWER(TRIM(${centralServiceForecastPeriods.monthYear})) = LOWER(TRIM(${nextMonthYear}))`)
      .limit(1)
    nextPeriod = fetched
  }

  if (!nextPeriod?.id) return

  const os = Number(item.osInvoicePrevMonth || 0)
  const repair = Number(item.repairForecast || 0)
  const retread = Number(item.retreadForecast || 0)
  const service = Number(item.serviceForecast || 0)
  const totalIdr = os + repair + retread + service

  const accIdr = (item.accessoriesAmountIdr || '0').toString()
  const accUsd = (item.accessoriesAmountUsd || '0').toString()
  const carryOverRemark = `Carry Over from ${period.monthYear}`

  const existingNextItems = await tx
    .select()
    .from(centralServiceForecastItems)
    .where(
      and(
        eq(centralServiceForecastItems.periodId, nextPeriod.id),
        eq(centralServiceForecastItems.customer, item.customer),
        eq(centralServiceForecastItems.isProductAccessories, Boolean(item.isProductAccessories))
      )
    )
    .limit(1)

  if (existingNextItems.length > 0) {
    // Carry over item already exists in next month; do not overwrite user edits
    return
  } else {
    await tx.insert(centralServiceForecastItems).values({
      periodId: nextPeriod.id,
      customer: item.customer,
      picSales: item.picSales || '',
      isProductAccessories: Boolean(item.isProductAccessories),
      osInvoicePrevMonth: os.toString(),
      repairForecast: repair.toString(),
      retreadForecast: retread.toString(),
      serviceForecast: service.toString(),
      totalForecastIdr: totalIdr.toString(),
      remainingRepair: repair.toString(),
      remainingRetread: retread.toString(),
      remainingService: service.toString(),
      remainingTotalIdr: totalIdr.toString(),
      accessoriesAmountIdr: accIdr,
      accessoriesAmountUsd: accUsd,
      remainingAccessoriesIdr: accIdr,
      remainingAccessoriesUsd: accUsd,
      status: 'Waiting',
      remark: carryOverRemark,
    })
  }
}

export async function upsertForecastItem(data: any) {
  try {
    const payload: any = {
      customer: data.customer || data.customerName || '',
      picSales: data.picSales || data.salesmanName || '',
      poNumber: data.poNumber || '',
      prNumber: data.prNumber || '',
      description: data.description || '',
      osInvoicePrevMonth: String(data.osInvoicePrevMonth || '0'),
      repairForecast: String(data.repairForecast || '0'),
      retreadForecast: String(data.retreadForecast || '0'),
      serviceForecast: String(data.serviceForecast || '0'),
      accessoriesAmountIdr: String(data.accessoriesAmountIdr || '0'),
      accessoriesAmountUsd: String(data.accessoriesAmountUsd || '0'),
      status: data.status || 'Waiting',
      remark: data.remark || '',
      updatedAt: new Date(),
    }

    const totalFc =
      Number(payload.osInvoicePrevMonth) +
      Number(payload.repairForecast) +
      Number(payload.retreadForecast) +
      Number(payload.serviceForecast)
    payload.totalForecastIdr = totalFc.toString()

    if (data.id && Number(data.id) > 0) {
      await db
        .update(centralServiceForecastItems)
        .set(payload)
        .where(eq(centralServiceForecastItems.id, Number(data.id)))
    } else {
      payload.periodId = Number(data.periodId)
      payload.remainingRepair = payload.repairForecast
      payload.remainingRetread = payload.retreadForecast
      payload.remainingService = payload.serviceForecast
      payload.remainingTotalIdr = payload.totalForecastIdr
      await db.insert(centralServiceForecastItems).values(payload)
    }

    if (data.status?.trim().toLowerCase() === 'carry over') {
      await handleCarryOverPropagation(db, { ...data, ...payload })
    }

    revalidatePath('/dashboard/central-service/forecast/monthly')
    revalidatePath('/dashboard/central-service/forecast/daily')
    revalidatePath('/dashboard/central-service/forecast/report')
    revalidatePath('/mobile/central-service/forecast/daily')
    revalidatePath('/mobile/central-service/forecast/report')
    return { success: true }
  } catch (err: any) {
    console.error('Error in upsertForecastItem:', err)
    return { success: false, error: err.message || 'Gagal merubah item forecast' }
  }
}

export async function deleteForecastItem(id: number) {
  const [item] = await db
    .select()
    .from(centralServiceForecastItems)
    .where(eq(centralServiceForecastItems.id, id))

  if (item && item.remark && item.remark.startsWith('Carry Over from ')) {
    const previousMonthYear = item.remark.replace('Carry Over from ', '').trim()
    const [prevPeriod] = await db
      .select()
      .from(centralServiceForecastPeriods)
      .where(sql`LOWER(TRIM(${centralServiceForecastPeriods.monthYear})) = LOWER(TRIM(${previousMonthYear}))`)
      .limit(1)

    if (prevPeriod) {
      const [sourceItem] = await db
        .select()
        .from(centralServiceForecastItems)
        .where(
          and(
            eq(centralServiceForecastItems.periodId, prevPeriod.id),
            eq(centralServiceForecastItems.customer, item.customer),
            eq(centralServiceForecastItems.isProductAccessories, Boolean(item.isProductAccessories))
          )
        )
        .limit(1)

      if (sourceItem && sourceItem.status.toLowerCase() === 'carry over') {
        await db
          .update(centralServiceForecastItems)
          .set({
            status: 'Cancel',
            updatedAt: new Date(),
          })
          .where(eq(centralServiceForecastItems.id, sourceItem.id))
      }
    }
  }

  await db.delete(centralServiceForecastItems).where(eq(centralServiceForecastItems.id, id))
  revalidatePath('/dashboard/central-service/forecast/monthly')
  revalidatePath('/mobile/central-service/forecast/daily')
  revalidatePath('/mobile/central-service/forecast/report')
}

export async function updateForecastItemStatus(
  id: number,
  newStatus: string,
  remark: string,
  userId?: string
) {
  const items = await db
    .select()
    .from(centralServiceForecastItems)
    .where(eq(centralServiceForecastItems.id, id))
    .limit(1)
  const item = items[0]

  if (!item) throw new Error('Item not found')

  await db.transaction(async (tx) => {
    // 1. Update item status
    await tx
      .update(centralServiceForecastItems)
      .set({ status: newStatus, remark, updatedAt: new Date() })
      .where(eq(centralServiceForecastItems.id, id))

    // 2. Add history log
    await tx.insert(centralServiceForecastHistories).values({
      forecastItemId: id,
      previousStatus: item.status,
      newStatus,
      actionRemark: remark,
      actionById: userId,
    })

    // 3. Automatic Carry Over to next month
    if (newStatus.trim().toLowerCase() === 'carry over') {
      await handleCarryOverPropagation(tx, { ...item, status: newStatus, remark })
    }
  })

  revalidatePath('/dashboard/central-service/forecast/daily')
  revalidatePath('/dashboard/central-service/forecast/monthly')
  revalidatePath('/dashboard/central-service/forecast/report')
  revalidatePath('/mobile/central-service/forecast/daily')
  revalidatePath('/mobile/central-service/forecast/report')
}

async function recalculateItemRemaining(tx: any, itemId: number) {
  const items = await tx
    .select()
    .from(centralServiceForecastItems)
    .where(eq(centralServiceForecastItems.id, itemId))
    .limit(1)
  const item = items[0]
  if (!item) return

  const actuals = await tx
    .select()
    .from(centralServiceForecastActuals)
    .where(eq(centralServiceForecastActuals.forecastItemId, itemId))

  let sumRepairIdr = 0,
    sumRetreadIdr = 0,
    sumServiceIdr = 0,
    sumAccIdr = 0,
    sumAccUsd = 0

  for (const a of actuals) {
    if (String(a.itemStatus || '').trim().toLowerCase() === 'cancel') continue
    const amtIdr = Number(a.amountIdr)
    const amtUsd = Number(a.amountUsd)
    if (a.category === 'Repair') sumRepairIdr += amtIdr
    else if (a.category === 'Retread') sumRetreadIdr += amtIdr
    else if (a.category === 'Service') sumServiceIdr += amtIdr
    else if (a.category === 'Accessories') {
      sumAccIdr += amtIdr
      sumAccUsd += amtUsd
    }
  }

  const remainingRepair = Math.max(0, Number(item.repairForecast) - sumRepairIdr)
  const remainingRetread = Math.max(0, Number(item.retreadForecast) - sumRetreadIdr)
  const remainingService = Math.max(0, Number(item.serviceForecast) - sumServiceIdr)
  const remainingAccIdr = Math.max(0, Number(item.accessoriesAmountIdr) - sumAccIdr)
  const remainingAccUsd = Math.max(0, Number(item.accessoriesAmountUsd) - sumAccUsd)

  const remainingTotalIdr = remainingRepair + remainingRetread + remainingService

  await tx
    .update(centralServiceForecastItems)
    .set({
      remainingRepair: remainingRepair.toString(),
      remainingRetread: remainingRetread.toString(),
      remainingService: remainingService.toString(),
      remainingTotalIdr: remainingTotalIdr.toString(),
      remainingAccessoriesIdr: remainingAccIdr.toString(),
      remainingAccessoriesUsd: remainingAccUsd.toString(),
      updatedAt: new Date(),
    })
    .where(eq(centralServiceForecastItems.id, itemId))
}

async function syncLatestActualRemark(tx: any, itemId: number) {
  const [latestActual] = await tx
    .select()
    .from(centralServiceForecastActuals)
    .where(eq(centralServiceForecastActuals.forecastItemId, itemId))
    .orderBy(
      desc(centralServiceForecastActuals.updateDate),
      desc(centralServiceForecastActuals.createdAt),
      desc(centralServiceForecastActuals.id)
    )
    .limit(1)

  await tx
    .update(centralServiceForecastItems)
    .set({ remark: latestActual?.remark ?? '', updatedAt: new Date() })
    .where(eq(centralServiceForecastItems.id, itemId))
}

export async function addForecastActual(data: any, userId?: string) {
  try {
    let created: any = null
    await db.transaction(async (tx) => {
      let periodId = data.periodId
      if (!periodId && data.forecastItemId) {
        const [item] = await tx
          .select({ periodId: centralServiceForecastItems.periodId })
          .from(centralServiceForecastItems)
          .where(eq(centralServiceForecastItems.id, Number(data.forecastItemId)))
          .limit(1)
        if (item) periodId = item.periodId
      }

      const payload = {
        periodId: Number(periodId),
        forecastItemId: data.forecastItemId ? Number(data.forecastItemId) : null,
        updateDate: data.updateDate ? new Date(data.updateDate) : new Date(),
        invoiceNumber: data.invoiceNumber || data.poNumber || '',
        category: data.category || 'Repair',
        amountIdr: String(data.amountIdr ?? '0'),
        amountUsd: String(data.amountUsd ?? '0'),
        remark: data.remark || data.note || '',
        itemStatus: data.itemStatus || data.statusDoc || '-',
        createdById: userId,
      }
      const inserted = await tx.insert(centralServiceForecastActuals).values(payload).returning()
      created = inserted[0]

      if (data.forecastItemId) {
        await recalculateItemRemaining(tx, Number(data.forecastItemId))
      }
    })

    revalidatePath('/dashboard/central-service/forecast/daily')
    revalidatePath('/dashboard/central-service/forecast')
    revalidatePath('/mobile/central-service/forecast/daily')
    revalidatePath('/mobile/central-service/forecast/report')
    return { success: true, data: created }
  } catch (err: any) {
    console.error('Error in addForecastActual:', err)
    return { success: false, error: err.message || 'Gagal menambahkan actual' }
  }
}

export async function updateForecastActual(id: number, data: any) {
  try {
    await db.transaction(async (tx) => {
      const actuals = await tx
        .select()
        .from(centralServiceForecastActuals)
        .where(eq(centralServiceForecastActuals.id, id))
        .limit(1)
      const actual = actuals[0]
      if (!actual) return

      const payload: any = {
        invoiceNumber: data.invoiceNumber || data.poNumber || actual.invoiceNumber || '',
        category: data.category || actual.category || 'Repair',
        amountIdr: String(data.amountIdr ?? actual.amountIdr),
        amountUsd: String(data.amountUsd ?? actual.amountUsd),
        remark: data.remark || data.note || actual.remark || '',
        itemStatus: data.itemStatus || data.statusDoc || actual.itemStatus || '-',
      }
      if (data.updateDate) {
        payload.updateDate = new Date(data.updateDate)
      }

      await tx
        .update(centralServiceForecastActuals)
        .set(payload)
        .where(eq(centralServiceForecastActuals.id, id))

      if (actual.forecastItemId) {
        await recalculateItemRemaining(tx, actual.forecastItemId)
      }
      if (data.forecastItemId && data.forecastItemId !== actual.forecastItemId) {
        await recalculateItemRemaining(tx, Number(data.forecastItemId))
      }
    })
    revalidatePath('/dashboard/central-service/forecast/daily')
    revalidatePath('/dashboard/central-service/forecast/monthly')
    revalidatePath('/dashboard/central-service/forecast')
    revalidatePath('/mobile/central-service/forecast/daily')
    revalidatePath('/mobile/central-service/forecast/report')
    return { success: true }
  } catch (err: any) {
    console.error('Error in updateForecastActual:', err)
    return { success: false, error: err.message || 'Gagal memperbarui actual' }
  }
}

export async function deleteForecastActual(id: number) {
  await db.transaction(async (tx) => {
    const actuals = await tx
      .select()
      .from(centralServiceForecastActuals)
      .where(eq(centralServiceForecastActuals.id, id))
      .limit(1)
    const actual = actuals[0]
    if (!actual) return

    await tx.delete(centralServiceForecastActuals).where(eq(centralServiceForecastActuals.id, id))

    if (actual.forecastItemId) {
      await recalculateItemRemaining(tx, actual.forecastItemId)
    }
  })
  revalidatePath('/dashboard/central-service/forecast/daily')
  revalidatePath('/dashboard/central-service/forecast/monthly')
  revalidatePath('/dashboard/central-service/forecast')
}

export async function bulkImportForecastItems(
  periodId: number,
  items: Array<{
    customer: string
    picSales: string
    isProductAccessories: boolean
    osInvoicePrevMonth: string
    osRemark?: string
    repairForecast: string
    retreadForecast: string
    serviceForecast: string
    accessoriesAmountIdr: string
    accessoriesAmountUsd: string
    remark: string
    repairRemark?: string
    retreadRemark?: string
    serviceRemark?: string
  }>
) {
  if (items.length === 0) return

  const recordsToInsert = items.map((item) => {
    const isAcc = item.isProductAccessories
    const repair = Number(item.repairForecast || 0)
    const retread = Number(item.retreadForecast || 0)
    const service = Number(item.serviceForecast || 0)
    const os = Number(item.osInvoicePrevMonth || 0)
    const totalIdr = os + repair + retread + service

    return {
      periodId,
      customer: item.customer,
      picSales: item.picSales,
      isProductAccessories: isAcc,
      osInvoicePrevMonth: (item.osInvoicePrevMonth || '0').toString(),
      osRemark: item.osRemark || '',
      repairForecast: repair.toString(),
      retreadForecast: retread.toString(),
      serviceForecast: service.toString(),
      totalForecastIdr: totalIdr.toString(),
      repairRemark: item.repairRemark || '',
      retreadRemark: item.retreadRemark || '',
      serviceRemark: item.serviceRemark || '',
      accessoriesAmountIdr: (item.accessoriesAmountIdr || '0').toString(),
      accessoriesAmountUsd: (item.accessoriesAmountUsd || '0').toString(),
      remark: item.remark || '',
      status: 'Waiting',
      remainingRepair: repair.toString(),
      remainingRetread: retread.toString(),
      remainingService: service.toString(),
      remainingTotalIdr: totalIdr.toString(),
      remainingAccessoriesIdr: (item.accessoriesAmountIdr || '0').toString(),
      remainingAccessoriesUsd: (item.accessoriesAmountUsd || '0').toString(),
    }
  })

  await db.insert(centralServiceForecastItems).values(recordsToInsert)
  revalidatePath('/dashboard/central-service/forecast')
}

export async function copyPreviousMonthForecast(sourcePeriodId: number, targetPeriodId: number) {
  const sourceItems = await db
    .select()
    .from(centralServiceForecastItems)
    .where(eq(centralServiceForecastItems.periodId, sourcePeriodId))

  if (sourceItems.length === 0) return

  const newItems = sourceItems.map((item) => ({
    periodId: targetPeriodId,
    customer: item.customer,
    picSales: item.picSales,
    // We copy the remaining from last month to be the OS Invoice this month
    osInvoicePrevMonth: item.remainingTotalIdr,
    osRemark: item.osRemark,
    repairForecast: item.repairForecast,
    retreadForecast: item.retreadForecast,
    serviceForecast: item.serviceForecast,
    totalForecastIdr: item.totalForecastIdr,
    remainingRepair: item.repairForecast,
    remainingRetread: item.retreadForecast,
    remainingService: item.serviceForecast,
    remainingTotalIdr: item.totalForecastIdr,
    isProductAccessories: item.isProductAccessories,
    accessoriesAmountIdr: item.accessoriesAmountIdr,
    accessoriesAmountUsd: item.accessoriesAmountUsd,
    remainingAccessoriesIdr: item.accessoriesAmountIdr,
    remainingAccessoriesUsd: item.accessoriesAmountUsd,
    status: 'Waiting',
    remark: '',
  }))

  await db.insert(centralServiceForecastItems).values(newItems)
  revalidatePath('/dashboard/central-service/forecast/monthly')
}

export async function getSapRevenue(monthYear: string) {
  const { fetchSapRevenue } = await import('@/lib/cs-sap-db')
  return fetchSapRevenue(monthYear)
}

export async function getSapInvoices(monthYear: string) {
  const { fetchSapInvoices } = await import('@/lib/cs-sap-db')
  return fetchSapInvoices(monthYear)
}

export async function getForecastCustomers() {
  const result = await db
    .selectDistinct({ customer: centralServiceForecastItems.customer })
    .from(centralServiceForecastItems)
    .orderBy(centralServiceForecastItems.customer)
  return result.map((r) => r.customer)
}
