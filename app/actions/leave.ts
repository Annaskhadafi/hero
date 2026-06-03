"use server";

import { db } from "@/db";
import {
  hcLeaveTypes,
  hcLeaveBalances,
  hcLeaveRequests,
  hrEmployees,
  hrDepartments,
  hrSections,
} from "@/db/schema/hero";
import { eq, desc, and, sql, count, gte, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── Leave Types ────────────────────────────────────────────────────────

export async function getLeaveTypes() {
  return await db
    .select({
      id: hcLeaveTypes.id,
      code: hcLeaveTypes.code,
      name: hcLeaveTypes.name,
      defaultDaysPerYear: hcLeaveTypes.defaultDaysPerYear,
      isPaid: hcLeaveTypes.isPaid,
      requiresApproval: hcLeaveTypes.requiresApproval,
      isActive: hcLeaveTypes.isActive,
    })
    .from(hcLeaveTypes)
    .where(eq(hcLeaveTypes.isActive, true))
    .orderBy(hcLeaveTypes.name);
}

// ─── Leave Requests ─────────────────────────────────────────────────────

export async function getLeaveRequests(filters?: {
  status?: string;
  departmentId?: number;
}) {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(hcLeaveRequests.status, filters.status));
  }
  if (filters?.departmentId) {
    conditions.push(eq(hrEmployees.departmentId, filters.departmentId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return await db
    .select({
      id: hcLeaveRequests.id,
      employeeId: hrEmployees.employeeId,
      employeeName: hrEmployees.fullName,
      departmentName: hrDepartments.name,
      sectionName: hrSections.name,
      leaveTypeName: hcLeaveTypes.name,
      startDate: hcLeaveRequests.startDate,
      endDate: hcLeaveRequests.endDate,
      totalDays: hcLeaveRequests.totalDays,
      reason: hcLeaveRequests.reason,
      attachmentUrl: hcLeaveRequests.attachmentUrl,
      status: hcLeaveRequests.status,
      approvedBy: hcLeaveRequests.approvedBy,
      approvedAt: hcLeaveRequests.approvedAt,
      rejectionReason: hcLeaveRequests.rejectionReason,
      createdAt: hcLeaveRequests.createdAt,
    })
    .from(hcLeaveRequests)
    .innerJoin(hrEmployees, eq(hcLeaveRequests.employeeId, hrEmployees.id))
    .leftJoin(hcLeaveTypes, eq(hcLeaveRequests.leaveTypeId, hcLeaveTypes.id))
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .leftJoin(hrSections, eq(hrEmployees.sectionId, hrSections.id))
    .where(whereClause)
    .orderBy(desc(hcLeaveRequests.createdAt));
}

// ─── Leave Balances ─────────────────────────────────────────────────────

export async function getLeaveBalances(employeeId?: number) {
  const conditions = [];

  if (employeeId) {
    conditions.push(eq(hcLeaveBalances.employeeId, employeeId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return await db
    .select({
      id: hcLeaveBalances.id,
      employeeId: hcLeaveBalances.employeeId,
      employeeName: hrEmployees.fullName,
      leaveTypeId: hcLeaveBalances.leaveTypeId,
      leaveTypeName: hcLeaveTypes.name,
      year: hcLeaveBalances.year,
      totalDays: hcLeaveBalances.totalDays,
      usedDays: hcLeaveBalances.usedDays,
      carryOverDays: hcLeaveBalances.carryOverDays,
      remainingDays: sql<number>`${hcLeaveBalances.totalDays} + ${hcLeaveBalances.carryOverDays} - ${hcLeaveBalances.usedDays}`,
    })
    .from(hcLeaveBalances)
    .innerJoin(hcLeaveTypes, eq(hcLeaveBalances.leaveTypeId, hcLeaveTypes.id))
    .innerJoin(hrEmployees, eq(hcLeaveBalances.employeeId, hrEmployees.id))
    .where(whereClause)
    .orderBy(hcLeaveBalances.year, hcLeaveTypes.name);
}

// ─── Leave Stats ────────────────────────────────────────────────────────

export async function getLeaveStats() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);
  const todayStr = now.toISOString().split("T")[0];

  const [pendingResult] = await db
    .select({ value: count() })
    .from(hcLeaveRequests)
    .where(eq(hcLeaveRequests.status, "pending"));

  const [approvedThisMonthResult] = await db
    .select({ value: count() })
    .from(hcLeaveRequests)
    .where(
      and(
        eq(hcLeaveRequests.status, "approved"),
        gte(hcLeaveRequests.approvedAt, monthStart),
        lte(hcLeaveRequests.approvedAt, monthEnd),
      ),
    );

  const [rejectedResult] = await db
    .select({ value: count() })
    .from(hcLeaveRequests)
    .where(eq(hcLeaveRequests.status, "rejected"));

  const [totalResult] = await db
    .select({ value: count() })
    .from(hcLeaveRequests);

  const [onLeaveTodayResult] = await db
    .select({ value: count() })
    .from(hcLeaveRequests)
    .where(
      and(
        eq(hcLeaveRequests.status, "approved"),
        lte(hcLeaveRequests.startDate, todayStr),
        gte(hcLeaveRequests.endDate, todayStr),
      ),
    );

  return {
    pending: pendingResult?.value ?? 0,
    approvedThisMonth: approvedThisMonthResult?.value ?? 0,
    rejected: rejectedResult?.value ?? 0,
    total: totalResult?.value ?? 0,
    onLeaveToday: onLeaveTodayResult?.value ?? 0,
  };
}

// ─── Create Leave Request ───────────────────────────────────────────────

export async function createLeaveRequest(data: {
  employeeId: number;
  leaveTypeId: number;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  attachmentUrl?: string;
}) {
  const [created] = await db
    .insert(hcLeaveRequests)
    .values({
      employeeId: data.employeeId,
      leaveTypeId: data.leaveTypeId,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays: data.totalDays,
      reason: data.reason || "",
      attachmentUrl: data.attachmentUrl || "",
      status: "pending",
    })
    .returning();

  revalidatePath("/dashboard/hc/leave");
  return created;
}

// ─── Update Leave Request Status ────────────────────────────────────────

export async function updateLeaveRequestStatus(
  id: number,
  status: "approved" | "rejected",
  approvedBy?: string,
  rejectionReason?: string,
) {
  const [updated] = await db
    .update(hcLeaveRequests)
    .set({
      status,
      approvedBy: approvedBy || "",
      approvedAt: new Date(),
      rejectionReason: rejectionReason || "",
      updatedAt: new Date(),
    })
    .where(eq(hcLeaveRequests.id, id))
    .returning();

  // If approved, update the leave balance
  if (status === "approved" && updated) {
    const [balance] = await db
      .select()
      .from(hcLeaveBalances)
      .where(
        and(
          eq(hcLeaveBalances.employeeId, updated.employeeId),
          eq(hcLeaveBalances.leaveTypeId, updated.leaveTypeId),
          eq(hcLeaveBalances.year, new Date(updated.startDate).getFullYear()),
        ),
      )
      .limit(1);

    if (balance) {
      await db
        .update(hcLeaveBalances)
        .set({
          usedDays: balance.usedDays + updated.totalDays,
          updatedAt: new Date(),
        })
        .where(eq(hcLeaveBalances.id, balance.id));
    }
  }

  revalidatePath("/dashboard/hc/leave");
  return updated;
}

// ─── Delete Leave Request ───────────────────────────────────────────────

export async function deleteLeaveRequest(id: number) {
  await db.delete(hcLeaveRequests).where(eq(hcLeaveRequests.id, id));
  revalidatePath("/dashboard/hc/leave");
  return { success: true };
}

// ─── Init Leave Balances ────────────────────────────────────────────────

export async function initLeaveBalances(employeeId: number, year?: number) {
  const targetYear = year ?? new Date().getFullYear();
  const activeTypes = await db
    .select()
    .from(hcLeaveTypes)
    .where(eq(hcLeaveTypes.isActive, true));

  const results = [];

  for (const lt of activeTypes) {
    const [existing] = await db
      .select()
      .from(hcLeaveBalances)
      .where(
        and(
          eq(hcLeaveBalances.employeeId, employeeId),
          eq(hcLeaveBalances.leaveTypeId, lt.id),
          eq(hcLeaveBalances.year, targetYear),
        ),
      )
      .limit(1);

    if (!existing) {
      const [created] = await db
        .insert(hcLeaveBalances)
        .values({
          employeeId,
          leaveTypeId: lt.id,
          year: targetYear,
          totalDays: lt.defaultDaysPerYear,
          usedDays: 0,
          carryOverDays: 0,
        })
        .returning();
      results.push(created);
    }
  }

  revalidatePath("/dashboard/hc/leave");
  return results;
}

// ─── Update Leave Balance ───────────────────────────────────────────────

export async function updateLeaveBalance(
  id: number,
  data: {
    totalDays?: number;
    usedDays?: number;
    carryOverDays?: number;
  },
) {
  const [updated] = await db
    .update(hcLeaveBalances)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(hcLeaveBalances.id, id))
    .returning();

  revalidatePath("/dashboard/hc/leave");
  return updated;
}
