"use server";

import { db } from "@/db";
import {
  hcOnboardingTemplates,
  hcOnboardingTemplateTasks,
  hcOnboardingRecords,
  hcOnboardingTasks,
  hrEmployees,
  hrDepartments,
  hrPositions,
} from "@/db/schema/hero";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── Get Onboarding Records ─────────────────────────────────────────────────

export async function getOnboardingRecords(filters?: { status?: string }) {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(hcOnboardingRecords.status, filters.status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: hcOnboardingRecords.id,
      employeeId: hcOnboardingRecords.employeeId,
      employeeCode: hrEmployees.employeeId,
      employeeName: hrEmployees.fullName,
      departmentName: hrDepartments.name,
      positionName: hrPositions.rankName,
      startDate: hcOnboardingRecords.startDate,
      probationEndDate: hcOnboardingRecords.probationEndDate,
      status: hcOnboardingRecords.status,
      overallProgress: hcOnboardingRecords.overallProgress,
      notes: hcOnboardingRecords.notes,
    })
    .from(hcOnboardingRecords)
    .leftJoin(hrEmployees, eq(hcOnboardingRecords.employeeId, hrEmployees.id))
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
    .where(where)
    .orderBy(desc(hcOnboardingRecords.createdAt));

  return rows;
}

// ─── Get Onboarding Record by ID ────────────────────────────────────────────

export async function getOnboardingRecordById(id: number) {
  const [record] = await db
    .select({
      id: hcOnboardingRecords.id,
      employeeId: hcOnboardingRecords.employeeId,
      employeeCode: hrEmployees.employeeId,
      employeeName: hrEmployees.fullName,
      departmentName: hrDepartments.name,
      positionName: hrPositions.rankName,
      startDate: hcOnboardingRecords.startDate,
      probationEndDate: hcOnboardingRecords.probationEndDate,
      templateId: hcOnboardingRecords.templateId,
      status: hcOnboardingRecords.status,
      overallProgress: hcOnboardingRecords.overallProgress,
      notes: hcOnboardingRecords.notes,
    })
    .from(hcOnboardingRecords)
    .leftJoin(hrEmployees, eq(hcOnboardingRecords.employeeId, hrEmployees.id))
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
    .where(eq(hcOnboardingRecords.id, id));

  if (!record) return null;

  const tasks = await db
    .select()
    .from(hcOnboardingTasks)
    .where(eq(hcOnboardingTasks.recordId, id))
    .orderBy(hcOnboardingTasks.sortOrder);

  return { ...record, tasks };
}

// ─── Get Onboarding Templates ───────────────────────────────────────────────

export async function getOnboardingTemplates() {
  const templates = await db
    .select({
      id: hcOnboardingTemplates.id,
      name: hcOnboardingTemplates.name,
      description: hcOnboardingTemplates.description,
      departmentName: hrDepartments.name,
      departmentId: hcOnboardingTemplates.departmentId,
    })
    .from(hcOnboardingTemplates)
    .leftJoin(hrDepartments, eq(hcOnboardingTemplates.departmentId, hrDepartments.id))
    .where(eq(hcOnboardingTemplates.isActive, true))
    .orderBy(hcOnboardingTemplates.name);

  const result = await Promise.all(
    templates.map(async (t) => {
      const [{ cnt }] = await db
        .select({ cnt: count() })
        .from(hcOnboardingTemplateTasks)
        .where(eq(hcOnboardingTemplateTasks.templateId, t.id));
      return { ...t, taskCount: Number(cnt) };
    })
  );

  return result;
}

// ─── Get Onboarding Template by ID ──────────────────────────────────────────

export async function getOnboardingTemplateById(id: number) {
  const [template] = await db
    .select({
      id: hcOnboardingTemplates.id,
      name: hcOnboardingTemplates.name,
      description: hcOnboardingTemplates.description,
      departmentId: hcOnboardingTemplates.departmentId,
      departmentName: hrDepartments.name,
    })
    .from(hcOnboardingTemplates)
    .leftJoin(hrDepartments, eq(hcOnboardingTemplates.departmentId, hrDepartments.id))
    .where(eq(hcOnboardingTemplates.id, id));

  if (!template) return null;

  const tasks = await db
    .select()
    .from(hcOnboardingTemplateTasks)
    .where(eq(hcOnboardingTemplateTasks.templateId, id))
    .orderBy(hcOnboardingTemplateTasks.sortOrder);

  return { ...template, tasks };
}

// ─── Create Onboarding Record ───────────────────────────────────────────────

export async function createOnboardingRecord(data: {
  employeeId: string;
  templateId: string;
  startDate: string;
  probationEndDate: string;
}) {
  const empId = parseInt(data.employeeId, 10);
  const tplId = parseInt(data.templateId, 10);
  const startDate = new Date(data.startDate);

  const [record] = await db
    .insert(hcOnboardingRecords)
    .values({
      employeeId: empId,
      templateId: tplId,
      startDate: data.startDate,
      probationEndDate: data.probationEndDate || null,
      status: "in_progress",
      overallProgress: 0,
    })
    .returning();

  // Copy template tasks into onboarding tasks
  const templateTasks = await db
    .select()
    .from(hcOnboardingTemplateTasks)
    .where(eq(hcOnboardingTemplateTasks.templateId, tplId))
    .orderBy(hcOnboardingTemplateTasks.sortOrder);

  if (templateTasks.length > 0) {
    const tasksToInsert = templateTasks.map((task) => {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + task.dueDays);

      return {
        recordId: record.id,
        sortOrder: task.sortOrder,
        title: task.title,
        description: task.description,
        assignedToDepartment: task.assignedToDepartment,
        dueDate: dueDate.toISOString().split("T")[0],
        isCompleted: false,
        completedBy: "",
        notes: "",
      };
    });

    await db.insert(hcOnboardingTasks).values(tasksToInsert);
  }

  revalidatePath("/dashboard/hc/onboarding");
  return record;
}

// ─── Update Onboarding Task ─────────────────────────────────────────────────

export async function updateOnboardingTask(
  taskId: number,
  data: {
    isCompleted?: boolean;
    completedBy?: string;
    notes?: string;
  }
) {
  const [updated] = await db
    .update(hcOnboardingTasks)
    .set({
      ...data,
      completedAt: data.isCompleted ? new Date() : null,
    })
    .where(eq(hcOnboardingTasks.id, taskId))
    .returning();

  // Recalculate overall progress for the record
  if (updated) {
    await recalculateProgress(updated.recordId);
    revalidatePath("/dashboard/hc/onboarding");
  }

  return updated;
}

// ─── Update Onboarding Record ───────────────────────────────────────────────

export async function updateOnboardingRecord(
  id: number,
  data: {
    status?: string;
    notes?: string;
  }
) {
  const [updated] = await db
    .update(hcOnboardingRecords)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(hcOnboardingRecords.id, id))
    .returning();

  revalidatePath("/dashboard/hc/onboarding");
  return updated;
}

// ─── Delete Onboarding Record ───────────────────────────────────────────────

export async function deleteOnboardingRecord(id: number) {
  // Tasks are cascade-deleted by FK constraint
  await db
    .delete(hcOnboardingRecords)
    .where(eq(hcOnboardingRecords.id, id));

  revalidatePath("/dashboard/hc/onboarding");
  return { success: true };
}

// ─── Create Onboarding Template ─────────────────────────────────────────────

export async function createOnboardingTemplate(data: {
  name: string;
  description: string;
  departmentId?: string;
  tasks: Array<{
    title: string;
    description: string;
    assignedToDepartment: string;
    dueDays: number;
    isRequired: boolean;
  }>;
}) {
  const [template] = await db
    .insert(hcOnboardingTemplates)
    .values({
      name: data.name,
      description: data.description,
      departmentId: data.departmentId ? parseInt(data.departmentId, 10) : null,
    })
    .returning();

  if (data.tasks.length > 0) {
    const tasksToInsert = data.tasks.map((task, index) => ({
      templateId: template.id,
      sortOrder: index + 1,
      title: task.title,
      description: task.description,
      assignedToDepartment: task.assignedToDepartment,
      dueDays: task.dueDays,
      isRequired: task.isRequired,
    }));

    await db.insert(hcOnboardingTemplateTasks).values(tasksToInsert);
  }

  revalidatePath("/dashboard/hc/onboarding");
  return template;
}

// ─── Update Onboarding Template ─────────────────────────────────────────────

export async function updateOnboardingTemplate(
  id: number,
  data: {
    name: string;
    description: string;
    departmentId?: string;
    tasks: Array<{
      title: string;
      description: string;
      assignedToDepartment: string;
      dueDays: number;
      isRequired: boolean;
    }>;
  }
) {
  const [updated] = await db
    .update(hcOnboardingTemplates)
    .set({
      name: data.name,
      description: data.description,
      departmentId: data.departmentId ? parseInt(data.departmentId, 10) : null,
      updatedAt: new Date(),
    })
    .where(eq(hcOnboardingTemplates.id, id))
    .returning();

  // Delete existing tasks and re-insert
  await db
    .delete(hcOnboardingTemplateTasks)
    .where(eq(hcOnboardingTemplateTasks.templateId, id));

  if (data.tasks.length > 0) {
    const tasksToInsert = data.tasks.map((task, index) => ({
      templateId: id,
      sortOrder: index + 1,
      title: task.title,
      description: task.description,
      assignedToDepartment: task.assignedToDepartment,
      dueDays: task.dueDays,
      isRequired: task.isRequired,
    }));

    await db.insert(hcOnboardingTemplateTasks).values(tasksToInsert);
  }

  revalidatePath("/dashboard/hc/onboarding");
  return updated;
}

// ─── Delete Onboarding Template ─────────────────────────────────────────────

export async function deleteOnboardingTemplate(id: number) {
  // Template tasks are cascade-deleted by FK constraint
  await db
    .delete(hcOnboardingTemplates)
    .where(eq(hcOnboardingTemplates.id, id));

  revalidatePath("/dashboard/hc/onboarding");
  return { success: true };
}

// ─── Get Onboarding Stats ───────────────────────────────────────────────────

export async function getOnboardingStats() {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [inProgress] = await db
    .select({ cnt: count() })
    .from(hcOnboardingRecords)
    .where(eq(hcOnboardingRecords.status, "in_progress"));

  const [completed] = await db
    .select({ cnt: count() })
    .from(hcOnboardingRecords)
    .where(
      and(
        eq(hcOnboardingRecords.status, "completed"),
        sql`${hcOnboardingRecords.updatedAt} >= ${monthStart}`
      )
    );

  const [overdue] = await db
    .select({ cnt: count() })
    .from(hcOnboardingTasks)
    .where(
      and(
        eq(hcOnboardingTasks.isCompleted, false),
        sql`${hcOnboardingTasks.dueDate} < ${now.toISOString().split("T")[0]}`
      )
    );

  const [total] = await db
    .select({ cnt: count() })
    .from(hcOnboardingRecords);

  return {
    inProgress: Number(inProgress.cnt),
    completed: Number(completed.cnt),
    overdue: Number(overdue.cnt),
    total: Number(total.cnt),
  };
}

// ─── Helper: Recalculate Progress ───────────────────────────────────────────

async function recalculateProgress(recordId: number) {
  const [{ total }] = await db
    .select({ total: count() })
    .from(hcOnboardingTasks)
    .where(eq(hcOnboardingTasks.recordId, recordId));

  const [{ completed }] = await db
    .select({ completed: count() })
    .from(hcOnboardingTasks)
    .where(
      and(
        eq(hcOnboardingTasks.recordId, recordId),
        eq(hcOnboardingTasks.isCompleted, true)
      )
    );

  const progress = total === 0 ? 0 : Math.round((Number(completed) / Number(total)) * 100);

  await db
    .update(hcOnboardingRecords)
    .set({ overallProgress: progress, updatedAt: new Date() })
    .where(eq(hcOnboardingRecords.id, recordId));
}

// ─── Get All Active Employees ───────────────────────────────────────────────

export async function getActiveEmployees() {
  return await db
    .select({
      id: hrEmployees.id,
      employeeId: hrEmployees.employeeId,
      fullName: hrEmployees.fullName,
      departmentId: hrEmployees.departmentId,
      departmentName: hrDepartments.name,
      positionName: hrPositions.rankName,
    })
    .from(hrEmployees)
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
    .where(eq(hrEmployees.isActive, true))
    .orderBy(hrEmployees.fullName);
}

// ─── Get All Departments ────────────────────────────────────────────────────

export async function getAllDepartments() {
  return await db
    .select({
      id: hrDepartments.id,
      name: hrDepartments.name,
    })
    .from(hrDepartments)
    .where(eq(hrDepartments.isActive, true))
    .orderBy(hrDepartments.name);
}
