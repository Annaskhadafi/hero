"use server";

import { db } from "@/db";
import {
  employees,
  employeeMcu,
  employeeMcuMetrics,
  hcMcuClinics,
  masterDepartments,
  masterSections,
} from "@/db/schema/hero";
import { eq, desc, asc, and, or, gte, lte, sql, isNotNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { uploadBufferToS3 } from "@/lib/s3-storage";
import { flattenMcuMetrics, type McuAiExtraction } from "@/lib/mcu-wellness-ai";
import { sendMcuAnnualReminderEmail, sendMcuResultEmail } from "@/lib/mcu-wellness-email";
import { addYears, format, differenceInCalendarDays } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────

export type McuListRow = {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeSn: string;
  departmentId: number | null;
  departmentName: string;
  sectionId: number | null;
  sectionName: string;
  jobTitle: string;
  clinicName: string;
  mcuDate: string | null;
  scheduledDate: string | null;
  status: string;
  resultFileUrl: string;
  resultFileName: string;
  aiKategori: string;
  aiKesimpulan: string;
  aiSaran: string;
  nextMcuDue: string | null;
  reminderSentAt: Date | null;
  examinedBy: string;
  notes: string;
};

export type McuReminderRow = {
  employeeId: number;
  employeeName: string;
  employeeSn: string;
  departmentName: string;
  sectionName: string;
  jobTitle: string;
  lastMcuDate: string | null;
  nextMcuDue: string | null;
  reminderStatus: "overdue" | "due" | "upcoming" | "none";
  daysUntilDue: number | null;
  lastMcuStatus: string | null;
};

// ─── List & Queries ──────────────────────────────────────────────────────

export async function getMcuWellnessList(filters?: {
  search?: string;
  departmentId?: number | null;
  sectionId?: number | null;
  status?: string | null;
}): Promise<McuListRow[]> {
  const conditions = [];
  if (filters?.departmentId) {
    conditions.push(eq(employees.departmentId, filters.departmentId));
  }
  if (filters?.sectionId) {
    conditions.push(eq(employees.sectionId, filters.sectionId));
  }

  // Get latest MCU per employee via subquery
  const latestMcuSubquery = db
    .select({
      employeeId: employeeMcu.employeeId,
      maxId: sql<number>`max(${employeeMcu.id})`.as("max_id"),
    })
    .from(employeeMcu)
    .groupBy(employeeMcu.employeeId)
    .as("latest_mcu");

  const rows = await db
    .select({
      id: employeeMcu.id,
      employeeId: employees.id,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      departmentId: employees.departmentId,
      departmentName: masterDepartments.name,
      sectionId: employees.sectionId,
      sectionName: masterSections.name,
      jobTitle: employees.jobTitle,
      clinicName: employeeMcu.clinicName,
      mcuDate: employeeMcu.mcuDate,
      scheduledDate: employeeMcu.scheduledDate,
      status: employeeMcu.status,
      resultFileUrl: employeeMcu.resultFileUrl,
      resultFileName: employeeMcu.resultFileName,
      aiKategori: employeeMcu.aiKategori,
      aiKesimpulan: employeeMcu.aiKesimpulan,
      aiSaran: employeeMcu.aiSaran,
      nextMcuDue: employeeMcu.nextMcuDue,
      reminderSentAt: employeeMcu.reminderSentAt,
      examinedBy: employeeMcu.examinedBy,
      notes: employeeMcu.notes,
    })
    .from(employees)
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(latestMcuSubquery, eq(latestMcuSubquery.employeeId, employees.id))
    .leftJoin(employeeMcu, eq(employeeMcu.id, latestMcuSubquery.maxId))
    .where(and(eq(employees.isActive, true), ...conditions))
    .orderBy(asc(employees.name));

  let result = rows as McuListRow[];
  if (filters?.status) {
    result = result.filter((r) => r.status === filters.status);
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(q) ||
        r.employeeSn.toLowerCase().includes(q) ||
        r.jobTitle.toLowerCase().includes(q),
    );
  }
  return result;
}

export async function getMcuDetail(mcuId: number) {
  const [mcu] = await db
    .select()
    .from(employeeMcu)
    .where(eq(employeeMcu.id, mcuId))
    .limit(1);
  if (!mcu) return null;

  const metrics = await db
    .select()
    .from(employeeMcuMetrics)
    .where(eq(employeeMcuMetrics.mcuId, mcuId))
    .orderBy(asc(employeeMcuMetrics.category), asc(employeeMcuMetrics.metricKey));

  const [employee] = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      departmentName: masterDepartments.name,
      sectionName: masterSections.name,
      jobTitle: employees.jobTitle,
      fitStatus: employees.fitStatus,
    })
    .from(employees)
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .where(eq(employees.id, mcu.employeeId))
    .limit(1);

  return { mcu, metrics, employee };
}

export async function getEmployeeMcuHistory(employeeId: number) {
  const records = await db
    .select()
    .from(employeeMcu)
    .where(eq(employeeMcu.employeeId, employeeId))
    .orderBy(desc(employeeMcu.mcuDate));

  const result = [];
  for (const r of records) {
    const metrics = await db
      .select()
      .from(employeeMcuMetrics)
      .where(eq(employeeMcuMetrics.mcuId, r.id))
      .orderBy(asc(employeeMcuMetrics.category), asc(employeeMcuMetrics.metricKey));
    result.push({ mcu: r, metrics });
  }
  return result;
}

// ─── Reminder System ─────────────────────────────────────────────────────

export async function getMcuReminders(filters?: {
  departmentId?: number | null;
  sectionId?: number | null;
}): Promise<McuReminderRow[]> {
  const conditions = [];
  if (filters?.departmentId) {
    conditions.push(eq(employees.departmentId, filters.departmentId));
  }
  if (filters?.sectionId) {
    conditions.push(eq(employees.sectionId, filters.sectionId));
  }

  const latestMcuSubquery = db
    .select({
      employeeId: employeeMcu.employeeId,
      maxId: sql<number>`max(${employeeMcu.id})`.as("max_id"),
    })
    .from(employeeMcu)
    .groupBy(employeeMcu.employeeId)
    .as("latest_mcu_reminder");

  const rows = await db
    .select({
      employeeId: employees.id,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      departmentName: masterDepartments.name,
      sectionName: masterSections.name,
      jobTitle: employees.jobTitle,
      lastMcuDate: employeeMcu.mcuDate,
      nextMcuDue: employeeMcu.nextMcuDue,
      lastMcuStatus: employeeMcu.status,
    })
    .from(employees)
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(latestMcuSubquery, eq(latestMcuSubquery.employeeId, employees.id))
    .leftJoin(employeeMcu, eq(employeeMcu.id, latestMcuSubquery.maxId))
    .where(and(eq(employees.isActive, true), ...conditions))
    .orderBy(asc(employees.name));

  const today = new Date();
  return rows.map((r) => {
    const due = r.nextMcuDue ? new Date(r.nextMcuDue) : null;
    let reminderStatus: McuReminderRow["reminderStatus"] = "none";
    let daysUntilDue: number | null = null;
    if (due) {
      daysUntilDue = differenceInCalendarDays(due, today);
      if (daysUntilDue < 0) reminderStatus = "overdue";
      else if (daysUntilDue <= 30) reminderStatus = "due";
      else if (daysUntilDue <= 90) reminderStatus = "upcoming";
      else reminderStatus = "none";
    } else if (!r.lastMcuDate) {
      reminderStatus = "overdue";
    }
    return {
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      employeeSn: r.employeeSn,
      departmentName: r.departmentName || "",
      sectionName: r.sectionName || "",
      jobTitle: r.jobTitle,
      lastMcuDate: r.lastMcuDate ? format(r.lastMcuDate, "yyyy-MM-dd") : null,
      nextMcuDue: r.nextMcuDue ? format(r.nextMcuDue, "yyyy-MM-dd") : null,
      reminderStatus,
      daysUntilDue,
      lastMcuStatus: r.lastMcuStatus,
    } as McuReminderRow;
  });
}

export async function getMcuReminderScorecards(filters?: {
  departmentId?: number | null;
  sectionId?: number | null;
}) {
  const reminders = await getMcuReminders(filters);
  const overdue = reminders.filter((r) => r.reminderStatus === "overdue").length;
  const due = reminders.filter((r) => r.reminderStatus === "due").length;
  const upcoming = reminders.filter((r) => r.reminderStatus === "upcoming").length;
  const noRecord = reminders.filter((r) => !r.lastMcuDate).length;
  return {
    total: reminders.length,
    overdue,
    due,
    upcoming,
    noRecord,
  };
}

// ─── Schedule MCU ────────────────────────────────────────────────────────

export async function scheduleEmployeeMcu(
  employeeId: number,
  data: {
    clinicId?: number | null;
    clinicName: string;
    clinicEmail?: string;
    paketMcu: string;
    scheduledDate: Date;
  },
) {
  let clinicEmail = data.clinicEmail ?? "";
  if (data.clinicId) {
    const [clinic] = await db
      .select()
      .from(hcMcuClinics)
      .where(eq(hcMcuClinics.id, data.clinicId))
      .limit(1);
    if (clinic) {
      clinicEmail = clinic.email;
    }
  }

  const [record] = await db
    .insert(employeeMcu)
    .values({
      employeeId,
      clinicId: data.clinicId ?? null,
      clinicName: data.clinicName,
      clinicEmail,
      paketMcu: data.paketMcu,
      scheduledDate: format(data.scheduledDate, "yyyy-MM-dd"),
      status: "scheduled",
    })
    .returning();

  revalidatePath("/dashboard/hc/mcu-wellness");
  return record;
}

// ─── Upload Result File ──────────────────────────────────────────────────

export async function uploadMcuResultFile(
  mcuId: number,
  base64File: string,
  fileName: string,
  mimeType: string,
  uploadedBy?: string,
) {
  const buffer = Buffer.from(base64File.split(",")[1] ?? base64File, "base64");
  const key = `mcu-wellness-results/${mcuId}-${Date.now()}-${fileName}`;
  const result = await uploadBufferToS3(buffer, key, mimeType);

  await db
    .update(employeeMcu)
    .set({
      resultFileUrl: result.url,
      resultFileName: fileName,
      uploadedBy: uploadedBy ?? "",
      uploadedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(employeeMcu.id, mcuId));

  revalidatePath("/dashboard/hc/mcu-wellness");
  return result.url;
}

// ─── Save AI Analysis Result ─────────────────────────────────────────────

export async function saveMcuAiResult(
  mcuId: number,
  extraction: McuAiExtraction,
  aiModel: string,
  options?: { mcuDate?: string; examinedBy?: string; notes?: string },
) {
  const [mcu] = await db
    .select()
    .from(employeeMcu)
    .where(eq(employeeMcu.id, mcuId))
    .limit(1);
  if (!mcu) throw new Error("MCU record not found");

  const recordedAt = new Date();
  const metricRows = flattenMcuMetrics(extraction, recordedAt);

  const mcuDate = options?.mcuDate || (mcu.mcuDate ?? format(new Date(), "yyyy-MM-dd"));
  const nextDue = addYears(new Date(mcuDate), 1);
  const newStatus = extraction.kategori === "Fit" ? "fit" : extraction.kategori === "Unfit" ? "unfit" : "pending_review";

  await db
    .update(employeeMcu)
    .set({
      mcuDate,
      status: newStatus,
      aiKesimpulan: extraction.kesimpulan,
      aiSaran: extraction.saran,
      aiKategori: extraction.kategori,
      aiRawJson: extraction as unknown as Record<string, unknown>,
      aiModel,
      aiRunAt: new Date(),
      examinedBy: options?.examinedBy ?? mcu.examinedBy,
      notes: options?.notes ?? mcu.notes,
      nextMcuDue: format(nextDue, "yyyy-MM-dd"),
      resultDate: mcuDate,
      updatedAt: new Date(),
    })
    .where(eq(employeeMcu.id, mcuId));

  // Replace existing metrics
  await db.delete(employeeMcuMetrics).where(eq(employeeMcuMetrics.mcuId, mcuId));
  if (metricRows.length > 0) {
    await db.insert(employeeMcuMetrics).values(
      metricRows.map((r) => ({
        mcuId,
        category: r.category,
        metricKey: r.metricKey,
        metricValue: r.metricValue,
        metricUnit: r.metricUnit,
        flag: r.flag,
        notes: r.notes,
        recordedAt: r.recordedAt,
      })),
    );
  }

  // Update employee fit status
  const fitStatus = newStatus === "fit" ? "fit" : newStatus === "unfit" ? "unfit" : "pending_review";
  await db
    .update(employees)
    .set({ fitStatus, updatedAt: new Date() } as Record<string, unknown>)
    .where(eq(employees.id, mcu.employeeId));

  revalidatePath("/dashboard/hc/mcu-wellness");
  revalidatePath(`/dashboard/hc/employee/${mcu.employeeId}`);

  // Send result email + bell notification
  if (newStatus === "fit" || newStatus === "unfit") {
    try {
      await sendMcuResultEmail(mcu.employeeId, {
        kategori: extraction.kategori,
        kesimpulan: extraction.kesimpulan,
        saran: extraction.saran,
        mcuDate: mcuDate,
      });
    } catch (err) {
      console.error("[mcu-wellness] result email failed:", err);
    }
  }

  return { success: true };
}

export async function setMcuStatus(mcuId: number, status: string, notes?: string) {
  const [mcu] = await db
    .select()
    .from(employeeMcu)
    .where(eq(employeeMcu.id, mcuId))
    .limit(1);
  if (!mcu) throw new Error("MCU record not found");

  await db
    .update(employeeMcu)
    .set({
      status,
      notes: notes ?? mcu.notes,
      updatedAt: new Date(),
    })
    .where(eq(employeeMcu.id, mcuId));

  const fitStatus = status === "fit" ? "fit" : status === "unfit" ? "unfit" : "pending_review";
  await db
    .update(employees)
    .set({ fitStatus, updatedAt: new Date() } as Record<string, unknown>)
    .where(eq(employees.id, mcu.employeeId));

  revalidatePath("/dashboard/hc/mcu-wellness");
  revalidatePath(`/dashboard/hc/employee/${mcu.employeeId}`);

  // Send result email if status set to fit/unfit and AI data available
  if (status === "fit" || status === "unfit") {
    try {
      await sendMcuResultEmail(mcu.employeeId, {
        kategori: status === "fit" ? "Fit" : "Unfit",
        kesimpulan: mcu.aiKesimpulan || "Status diperbarui manual oleh HC.",
        saran: mcu.aiSaran || "Mohon koordinasi dengan HC untuk tindak lanjut.",
        mcuDate: mcu.mcuDate ?? format(new Date(), "yyyy-MM-dd"),
      });
    } catch (err) {
      console.error("[mcu-wellness] status email failed:", err);
    }
  }

  return { success: true };
}

// ─── Create MCU record (manual, no AI) ───────────────────────────────────

export async function createManualMcu(
  employeeId: number,
  data: {
    clinicName?: string;
    paketMcu?: string;
    mcuDate: string;
    status?: string;
    examinedBy?: string;
    notes?: string;
  },
) {
  const nextDue = addYears(new Date(data.mcuDate), 1);
  const [record] = await db
    .insert(employeeMcu)
    .values({
      employeeId,
      clinicName: data.clinicName ?? "",
      paketMcu: data.paketMcu ?? "",
      mcuDate: data.mcuDate,
      status: data.status ?? "done",
      examinedBy: data.examinedBy ?? "",
      notes: data.notes ?? "",
      nextMcuDue: format(nextDue, "yyyy-MM-dd"),
      resultDate: data.mcuDate,
    })
    .returning();

  if (data.status === "fit" || data.status === "unfit") {
    const fitStatus = data.status;
    await db
      .update(employees)
      .set({ fitStatus, updatedAt: new Date() } as Record<string, unknown>)
      .where(eq(employees.id, employeeId));
  }

  revalidatePath("/dashboard/hc/mcu-wellness");
  return record;
}

// ─── Send Reminder Email (manual trigger from Tab 2) ────────────────────

export async function sendMcuReminderNow(employeeId: number): Promise<{ status: "sent" | "skipped" | "failed"; reason?: string }> {
  const [mcu] = await db
    .select()
    .from(employeeMcu)
    .where(eq(employeeMcu.employeeId, employeeId))
    .orderBy(desc(employeeMcu.mcuDate))
    .limit(1);

  if (!mcu || !mcu.nextMcuDue) {
    return { status: "skipped", reason: "Belum ada data MCU / jatuh tempo" };
  }

  const daysUntilDue = differenceInCalendarDays(new Date(mcu.nextMcuDue), new Date());
  const result = await sendMcuAnnualReminderEmail(employeeId, mcu.nextMcuDue, daysUntilDue);

  if (result.status === "sent") {
    await db
      .update(employeeMcu)
      .set({ reminderSentAt: new Date(), updatedAt: new Date() })
      .where(eq(employeeMcu.id, mcu.id));
    revalidatePath("/dashboard/hc/mcu-wellness");
  }
  return result;
}

export async function sendBulkMcuReminders(employeeIds: number[]): Promise<{ sent: number; skipped: number; failed: number }> {
  let sent = 0, skipped = 0, failed = 0;
  for (const empId of employeeIds) {
    const r = await sendMcuReminderNow(empId);
    if (r.status === "sent") sent++;
    else if (r.status === "skipped") skipped++;
    else failed++;
  }
  revalidatePath("/dashboard/hc/mcu-wellness");
  return { sent, skipped, failed };
}

// ─── Save AI Result (find-or-create MCU record) ──────────────────────────

export async function saveAiResultForEmployee(
  employeeId: number,
  extraction: McuAiExtraction,
  aiModel: string,
  options: { mcuDate?: string; examinedBy?: string; notes?: string; resultFileUrl?: string; resultFileName?: string },
) {
  const mcuDate = options.mcuDate || format(new Date(), "yyyy-MM-dd");
  const nextDue = addYears(new Date(mcuDate), 1);

  // Find latest MCU record for employee (any status) or create new
  const existing = await db
    .select()
    .from(employeeMcu)
    .where(eq(employeeMcu.employeeId, employeeId))
    .orderBy(desc(employeeMcu.createdAt))
    .limit(1);

  let mcuId: number;
  if (existing.length > 0 && ["scheduled", "done", "pending_review"].includes(existing[0].status)) {
    mcuId = existing[0].id;
  } else {
    const [created] = await db
      .insert(employeeMcu)
      .values({
        employeeId,
        mcuDate,
        status: "pending_review",
        nextMcuDue: format(nextDue, "yyyy-MM-dd"),
        resultDate: mcuDate,
        resultFileUrl: options.resultFileUrl ?? "",
        resultFileName: options.resultFileName ?? "",
      })
      .returning();
    mcuId = created.id;
  }

  return saveMcuAiResult(mcuId, extraction, aiModel, {
    mcuDate,
    examinedBy: options.examinedBy,
    notes: options.notes,
  });
}

// ─── Health Dashboard Data ───────────────────────────────────────────────

export async function getHealthDashboardData(filters?: {
  category?: string | null;
  departmentId?: number | null;
  sectionId?: number | null;
  employeeId?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
}) {
  const conditions = [];
  if (filters?.category) {
    conditions.push(eq(employeeMcuMetrics.category, filters.category));
  }
  if (filters?.departmentId) {
    conditions.push(eq(employees.departmentId, filters.departmentId));
  }
  if (filters?.sectionId) {
    conditions.push(eq(employees.sectionId, filters.sectionId));
  }
  if (filters?.employeeId) {
    conditions.push(eq(employees.id, filters.employeeId));
  }
  if (filters?.dateFrom) {
    conditions.push(gte(employeeMcu.mcuDate, filters.dateFrom));
  }
  if (filters?.dateTo) {
    conditions.push(lte(employeeMcu.mcuDate, filters.dateTo));
  }

  // Metric trends
  const trends = await db
    .select({
      mcuId: employeeMcuMetrics.mcuId,
      employeeId: employees.id,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      departmentName: masterDepartments.name,
      category: employeeMcuMetrics.category,
      metricKey: employeeMcuMetrics.metricKey,
      metricValue: employeeMcuMetrics.metricValue,
      metricUnit: employeeMcuMetrics.metricUnit,
      flag: employeeMcuMetrics.flag,
      mcuDate: employeeMcu.mcuDate,
      recordedAt: employeeMcuMetrics.recordedAt,
    })
    .from(employeeMcuMetrics)
    .innerJoin(employeeMcu, eq(employeeMcuMetrics.mcuId, employeeMcu.id))
    .innerJoin(employees, eq(employeeMcu.employeeId, employees.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .where(and(...conditions))
    .orderBy(desc(employeeMcu.mcuDate), asc(employees.name), asc(employeeMcuMetrics.category));

  // KPI: Fit/Unfit distribution
  const kpiRows = await db
    .select({
      status: employeeMcu.status,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(employeeMcu)
    .innerJoin(employees, eq(employeeMcu.employeeId, employees.id))
    .where(and(eq(employees.isActive, true), ...conditions.filter((c) => c)))
    .groupBy(employeeMcu.status);

  const fitCount = kpiRows.find((r) => r.status === "fit")?.count ?? 0;
  const unfitCount = kpiRows.find((r) => r.status === "unfit")?.count ?? 0;
  const pendingCount = kpiRows.find((r) => r.status === "pending_review")?.count ?? 0;
  const scheduledCount = kpiRows.find((r) => r.status === "scheduled")?.count ?? 0;
  const doneCount = kpiRows.find((r) => r.status === "done")?.count ?? 0;

  // Abnormal metrics count per category
  const abnormalByCategory = await db
    .select({
      category: employeeMcuMetrics.category,
      abnormalCount: sql<number>`count(*) filter (where ${employeeMcuMetrics.flag} != 'normal')`.as("abnormal"),
      totalCount: sql<number>`count(*)`.as("total"),
    })
    .from(employeeMcuMetrics)
    .innerJoin(employeeMcu, eq(employeeMcuMetrics.mcuId, employeeMcu.id))
    .innerJoin(employees, eq(employeeMcu.employeeId, employees.id))
    .where(and(eq(employees.isActive, true), ...conditions.filter((c) => c)))
    .groupBy(employeeMcuMetrics.category);

  return {
    trends,
    kpi: {
      fit: fitCount,
      unfit: unfitCount,
      pending: pendingCount,
      scheduled: scheduledCount,
      done: doneCount,
    },
    abnormalByCategory,
  };
}

// ─── Departments & Sections for filters ─────────────────────────────────

export async function getMcuFilterOptions() {
  const [departments, sections] = await Promise.all([
    db.select().from(masterDepartments).orderBy(asc(masterDepartments.name)),
    db.select().from(masterSections).orderBy(asc(masterSections.name)),
  ]);
  return { departments, sections };
}
