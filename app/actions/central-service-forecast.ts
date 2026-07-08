"use server";

import { db } from "@/db";
import {
  centralServiceForecastPeriods,
  centralServiceForecastItems,
  centralServiceForecastActuals,
  centralServiceForecastHistories,
} from "@/db/schema/central-service";
import { eq, desc, and, sql, ilike, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getForecastPeriods() {
  return await db.select()
    .from(centralServiceForecastPeriods)
    .orderBy(desc(centralServiceForecastPeriods.monthYear));
}

export async function getSalesEmployees() {
  const { employees } = await import("@/db/schema/hero");
  return await db.select({
    id: employees.id,
    name: employees.name,
    department: employees.department
  })
  .from(employees)
  .where(ilike(employees.department, "%Sales%"))
  .orderBy(employees.name);
}

export async function createForecastPeriod(data: { monthYear: string; exchangeRateIdrToUsd: string }) {
  await db.insert(centralServiceForecastPeriods).values({
    monthYear: data.monthYear,
    exchangeRateIdrToUsd: data.exchangeRateIdrToUsd,
    status: "Draft",
  });
  revalidatePath("/dashboard/central-service/forecast");
  revalidatePath("/dashboard/central-service/forecast/monthly");
}

export async function updateForecastPeriodStatus(id: number, status: string) {
  await db
    .update(centralServiceForecastPeriods)
    .set({ status, updatedAt: new Date() })
    .where(eq(centralServiceForecastPeriods.id, id));
  revalidatePath("/dashboard/central-service/forecast");
  revalidatePath("/dashboard/central-service/forecast/monthly");
}

export async function updatePeriodExchangeRate(id: number, rate: string) {
  await db
    .update(centralServiceForecastPeriods)
    .set({ exchangeRateIdrToUsd: rate, updatedAt: new Date() })
    .where(eq(centralServiceForecastPeriods.id, id));
  revalidatePath("/dashboard/central-service/forecast");
  revalidatePath("/dashboard/central-service/forecast/monthly");
  revalidatePath("/dashboard/central-service/forecast/daily");
}

export async function getRealtimeExchangeRate() {
  try {
    const response = await fetch("https://v6.exchangerate-api.com/v6/06e9b7015f4acef21c8bad94/latest/USD", {
      next: { revalidate: 3600 },
    });
    const data = await response.json();
    const rate = data?.conversion_rates?.IDR;

    if (data?.result === "success" && Number.isFinite(rate)) {
      return { success: true, rate };
    }

    return { success: false, error: "Failed to fetch exchange rate" };
  } catch (error) {
    console.error("Exchange rate error:", error);
    return { success: false, error: "Failed to fetch exchange rate" };
  }
}

export async function deleteForecastPeriod(id: number) {
  await db.delete(centralServiceForecastPeriods).where(eq(centralServiceForecastPeriods.id, id));
  revalidatePath("/dashboard/central-service/forecast/monthly");
}

export async function getForecastItems(periodId: number) {
  return await db.select()
    .from(centralServiceForecastItems)
    .where(eq(centralServiceForecastItems.periodId, periodId))
    .orderBy(desc(centralServiceForecastItems.createdAt));
}

export async function getWaitingForecastItems() {
  // For daily admin - get all items that are 'Waiting'
  return await db.select()
    .from(centralServiceForecastItems)
    .where(eq(centralServiceForecastItems.status, "Waiting"));
}

export async function getDailyForecastItems() {
  const items = await db
    .select({
      item: centralServiceForecastItems,
      period: centralServiceForecastPeriods,
    })
    .from(centralServiceForecastItems)
    .innerJoin(
      centralServiceForecastPeriods,
      eq(centralServiceForecastItems.periodId, centralServiceForecastPeriods.id)
    )
    .orderBy(desc(centralServiceForecastPeriods.monthYear));

  if (items.length === 0) return [];

  const itemIds = items.map(i => i.item.id);
  const actuals = await db.select()
    .from(centralServiceForecastActuals)
    .where(inArray(centralServiceForecastActuals.forecastItemId, itemIds))
    .orderBy(desc(centralServiceForecastActuals.updateDate));

  return items.map(i => ({
    ...i,
    actuals: actuals.filter(a => a.forecastItemId === i.item.id)
  }));
}

export async function upsertForecastItem(data: any) {
  if (data.id) {
    await db
      .update(centralServiceForecastItems)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(centralServiceForecastItems.id, data.id));
  } else {
    await db.insert(centralServiceForecastItems).values(data);
  }
  revalidatePath("/dashboard/central-service/forecast/monthly");
  revalidatePath("/dashboard/central-service/forecast/daily");
}

export async function deleteForecastItem(id: number) {
  await db.delete(centralServiceForecastItems).where(eq(centralServiceForecastItems.id, id));
  revalidatePath("/dashboard/central-service/forecast/monthly");
}

export async function updateForecastItemStatus(id: number, newStatus: string, remark: string, userId?: string) {
  const items = await db.select()
    .from(centralServiceForecastItems)
    .where(eq(centralServiceForecastItems.id, id))
    .limit(1);
  const item = items[0];

  if (!item) throw new Error("Item not found");

  await db.transaction(async (tx) => {
    // 1. Update item status
    await tx
      .update(centralServiceForecastItems)
      .set({ status: newStatus, remark, updatedAt: new Date() })
      .where(eq(centralServiceForecastItems.id, id));

    // 2. Add history log
    await tx.insert(centralServiceForecastHistories).values({
      forecastItemId: id,
      previousStatus: item.status,
      newStatus,
      actionRemark: remark,
      actionById: userId,
    });
  });

  revalidatePath("/dashboard/central-service/forecast/daily");
  revalidatePath("/dashboard/central-service/forecast/monthly");
}

async function recalculateItemRemaining(tx: any, itemId: number) {
  const items = await tx.select().from(centralServiceForecastItems)
    .where(eq(centralServiceForecastItems.id, itemId))
    .limit(1);
  const item = items[0];
  if (!item) return;

  const actuals = await tx.select().from(centralServiceForecastActuals)
    .where(eq(centralServiceForecastActuals.forecastItemId, itemId));

  let sumRepairIdr = 0, sumRetreadIdr = 0, sumServiceIdr = 0, sumAccIdr = 0, sumAccUsd = 0;

  for (const a of actuals) {
    const amtIdr = Number(a.amountIdr);
    const amtUsd = Number(a.amountUsd);
    if (a.category === "Repair") sumRepairIdr += amtIdr;
    else if (a.category === "Retread") sumRetreadIdr += amtIdr;
    else if (a.category === "Service") sumServiceIdr += amtIdr;
    else if (a.category === "Accessories") { sumAccIdr += amtIdr; sumAccUsd += amtUsd; }
  }

  const remainingRepair = Math.max(0, Number(item.repairForecast) - sumRepairIdr);
  const remainingRetread = Math.max(0, Number(item.retreadForecast) - sumRetreadIdr);
  const remainingService = Math.max(0, Number(item.serviceForecast) - sumServiceIdr);
  const remainingAccIdr = Math.max(0, Number(item.accessoriesAmountIdr) - sumAccIdr);
  const remainingAccUsd = Math.max(0, Number(item.accessoriesAmountUsd) - sumAccUsd);
  
  const remainingTotalIdr = remainingRepair + remainingRetread + remainingService;

  await tx.update(centralServiceForecastItems).set({
    remainingRepair: remainingRepair.toString(),
    remainingRetread: remainingRetread.toString(),
    remainingService: remainingService.toString(),
    remainingTotalIdr: remainingTotalIdr.toString(),
    remainingAccessoriesIdr: remainingAccIdr.toString(),
    remainingAccessoriesUsd: remainingAccUsd.toString(),
    updatedAt: new Date(),
  }).where(eq(centralServiceForecastItems.id, itemId));
}

async function syncLatestActualRemark(tx: any, itemId: number) {
  const [latestActual] = await tx
    .select()
    .from(centralServiceForecastActuals)
    .where(eq(centralServiceForecastActuals.forecastItemId, itemId))
    .orderBy(desc(centralServiceForecastActuals.updateDate), desc(centralServiceForecastActuals.createdAt), desc(centralServiceForecastActuals.id))
    .limit(1);

  await tx
    .update(centralServiceForecastItems)
    .set({ remark: latestActual?.remark ?? "", updatedAt: new Date() })
    .where(eq(centralServiceForecastItems.id, itemId));
}

export async function addForecastActual(data: any, userId?: string) {
  await db.transaction(async (tx) => {
    const { exchangeRate: _exchangeRate, ...actualData } = data;
    const payload = {
      ...actualData,
      invoiceNumber: data.invoiceNumber || "",
      createdById: userId,
    };
    await tx.insert(centralServiceForecastActuals).values(payload);

    if (data.forecastItemId) {
      await recalculateItemRemaining(tx, data.forecastItemId);
    }
  });

  revalidatePath("/dashboard/central-service/forecast/daily");
  revalidatePath("/dashboard/central-service/forecast");
}

export async function updateForecastActual(id: number, data: any) {
  await db.transaction(async (tx) => {
    const { exchangeRate: _exchangeRate, ...actualData } = data;
    const actuals = await tx.select().from(centralServiceForecastActuals)
      .where(eq(centralServiceForecastActuals.id, id))
      .limit(1);
    const actual = actuals[0];
    if (!actual) return;

    await tx.update(centralServiceForecastActuals).set({
      ...actualData,
      invoiceNumber: data.invoiceNumber || "",
    }).where(eq(centralServiceForecastActuals.id, id));

    if (actual.forecastItemId) {
      await recalculateItemRemaining(tx, actual.forecastItemId);
    }
    if (data.forecastItemId && data.forecastItemId !== actual.forecastItemId) {
      await recalculateItemRemaining(tx, data.forecastItemId);
    }
  });
  revalidatePath("/dashboard/central-service/forecast/daily");
  revalidatePath("/dashboard/central-service/forecast/monthly");
  revalidatePath("/dashboard/central-service/forecast");
}

export async function deleteForecastActual(id: number) {
  await db.transaction(async (tx) => {
    const actuals = await tx.select().from(centralServiceForecastActuals)
      .where(eq(centralServiceForecastActuals.id, id))
      .limit(1);
    const actual = actuals[0];
    if (!actual) return;

    await tx.delete(centralServiceForecastActuals).where(eq(centralServiceForecastActuals.id, id));

    if (actual.forecastItemId) {
      await recalculateItemRemaining(tx, actual.forecastItemId);
    }
  });
  revalidatePath("/dashboard/central-service/forecast/daily");
  revalidatePath("/dashboard/central-service/forecast/monthly");
  revalidatePath("/dashboard/central-service/forecast");
}

export async function bulkImportForecastItems(
  periodId: number, 
  items: Array<{
    customer: string;
    picSales: string;
    isProductAccessories: boolean;
    osInvoicePrevMonth: string;
    repairForecast: string;
    retreadForecast: string;
    serviceForecast: string;
    accessoriesAmountIdr: string;
    accessoriesAmountUsd: string;
    remark: string;
    repairRemark?: string;
    retreadRemark?: string;
    serviceRemark?: string;
  }>
) {
  if (items.length === 0) return;

  const recordsToInsert = items.map(item => {
    const isAcc = item.isProductAccessories;
    const repair = Number(item.repairForecast || 0);
    const retread = Number(item.retreadForecast || 0);
    const service = Number(item.serviceForecast || 0);
    const os = Number(item.osInvoicePrevMonth || 0);
    const totalIdr = os + repair + retread + service;

    return {
      periodId,
      customer: item.customer,
      picSales: item.picSales,
      isProductAccessories: isAcc,
      osInvoicePrevMonth: (item.osInvoicePrevMonth || "0").toString(),
      repairForecast: repair.toString(),
      retreadForecast: retread.toString(),
      serviceForecast: service.toString(),
      totalForecastIdr: totalIdr.toString(),
      repairRemark: item.repairRemark || "",
      retreadRemark: item.retreadRemark || "",
      serviceRemark: item.serviceRemark || "",
      accessoriesAmountIdr: (item.accessoriesAmountIdr || "0").toString(),
      accessoriesAmountUsd: (item.accessoriesAmountUsd || "0").toString(),
      remark: item.remark || "",
      status: "Waiting",
      remainingRepair: repair.toString(),
      remainingRetread: retread.toString(),
      remainingService: service.toString(),
      remainingTotalIdr: totalIdr.toString(),
      remainingAccessoriesIdr: (item.accessoriesAmountIdr || "0").toString(),
      remainingAccessoriesUsd: (item.accessoriesAmountUsd || "0").toString(),
    };
  });

  await db.insert(centralServiceForecastItems).values(recordsToInsert);
  revalidatePath("/dashboard/central-service/forecast");
}

export async function copyPreviousMonthForecast(sourcePeriodId: number, targetPeriodId: number) {
  const sourceItems = await db.select()
    .from(centralServiceForecastItems)
    .where(eq(centralServiceForecastItems.periodId, sourcePeriodId));

  if (sourceItems.length === 0) return;

  const newItems = sourceItems.map((item) => ({
    periodId: targetPeriodId,
    customer: item.customer,
    picSales: item.picSales,
    // We copy the remaining from last month to be the OS Invoice this month
    osInvoicePrevMonth: item.remainingTotalIdr, 
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
    status: "Waiting",
    remark: "",
  }));

  await db.insert(centralServiceForecastItems).values(newItems);
  revalidatePath("/dashboard/central-service/forecast/monthly");
}

export async function getSapRevenue(monthYear: string) {
  const { fetchSapRevenue } = await import("@/lib/cs-sap-db");
  return fetchSapRevenue(monthYear);
}

export async function getSapInvoices(monthYear: string) {
  const { fetchSapInvoices } = await import("@/lib/cs-sap-db");
  return fetchSapInvoices(monthYear);
}
