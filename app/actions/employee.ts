"use server";

import { db } from "@/db";
import {
  hrPositions,
  employees, masterDepartments, masterSections, sites
} from "@/db/schema/hero";
import { eq, desc, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { buildHumanCapitalEmail, sendHumanCapitalEmail } from "@/lib/human-capital-email";

export async function getEmployeesForContract(filters?: {
  departmentId?: number;
  sectionId?: number;
  status?: string;
}) {
  const conditions = [eq(employees.isActive, true)];

  if (filters?.departmentId) {
    conditions.push(eq(employees.departmentId, filters.departmentId));
  }
  if (filters?.sectionId) {
    conditions.push(eq(employees.sectionId, filters.sectionId));
  }

  const rows = await db
    .select({
      id: employees.id,
      employeeId: employees.employeeSn,
      fullName: employees.name,
      email: employees.email,
      joinDate: employees.joinDate,
      contractStart: employees.contractDurationStart,
      contractEnd: employees.contractDurationEnd,
      birthDate: employees.birthDate,
      accountStatus: employees.employmentStatus,
      genderCode: employees.gender,
      jobTitle: sql<string | null>`coalesce(${hrPositions.rankName}, ${employees.jobTitle})`.as('job_title'),
      levelName: sql<string | null>`coalesce(${hrPositions.levelName}, ${employees.levelName})`.as('level_name'),
      departmentName: sql<string | null>`coalesce(${masterDepartments.name}, ${employees.department})`.as('department_name'),
      sectionName: sql<string | null>`coalesce(${masterSections.name}, ${employees.section})`.as('section_name'),
      siteName: sites.name,
      location: sites.location,
      workLocationId: employees.siteId,
      departmentId: employees.departmentId,
      sectionId: employees.sectionId,
      positionId: employees.positionId,
    })
    .from(employees)
    .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .where(and(...conditions))
    .orderBy(desc(employees.id));

  const uniqueRowsMap = new Map<number, typeof rows[number]>();
  for (const row of rows) {
    if (!uniqueRowsMap.has(row.id)) {
      uniqueRowsMap.set(row.id, row);
    }
  }
  return Array.from(uniqueRowsMap.values());
}

export async function getEmployeeFilterOptions() {
  const [departments, sections, locations] = await Promise.all([
    db.select({ id: masterDepartments.id, name: masterDepartments.name }).from(masterDepartments).where(eq(masterDepartments.isActive, true)),
    db.select({ id: masterSections.id, name: masterSections.name, departmentId: masterSections.departmentId }).from(masterSections).where(eq(masterSections.isActive, true)),
    db.select({ id: sites.id, name: sites.location }).from(sites).where(eq(sites.isActive, true)),
  ]);
  return { departments, sections, locations };
}

export async function getEmployeeById(id: number) {
  const [emp] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, id))
    .limit(1);
  return emp;
}

export async function createEmployee(data: {
  employeeId: string;
  fullName: string;
  email?: string;
  departmentId?: number;
  sectionId?: number;
  siteId?: number;
  positionId?: number;
  joinDate?: string;
  contractStart?: string;
  contractEnd?: string;
  birthDate?: string;
}) {
  const [created] = await db.insert(employees).values({
    employeeSn: data.employeeId,
    name: data.fullName,
    email: data.email || '',
    siteId: data.siteId || 1,
    departmentId: data.departmentId || null,
    sectionId: data.sectionId || null,
    positionId: data.positionId || null,
    joinDate: data.joinDate || null,
    contractDurationStart: data.contractStart || null,
    contractDurationEnd: data.contractEnd || null,
    birthDate: data.birthDate || null,
    employmentStatus: 'active',
    isActive: true,
    role: 'Employee',
    department: '',
  }).returning();

  const emailContent = buildHumanCapitalEmail({
    title: "Data employee HC baru",
    intro: "Master employee baru telah dibuat di modul Human Capital.",
    details: [
      `Nama: ${created.name}`,
      `Employee ID: ${created.employeeSn}`,
      `Email: ${created.email || "-"}`,
      `Account status: ${created.employmentStatus || "-"}`,
    ],
  });

  await sendHumanCapitalEmail({
    templateCode: "hc_employee_created",
    templateName: "HC Employee Created",
    variables: {
      employeeName: created.name,
      employeeId: created.employeeSn,
      employeeEmail: created.email || "-",
      accountStatus: created.employmentStatus || "-",
    },
    fallbackSubject: `Data employee baru: ${created.name}`,
    fallbackHtml: emailContent.html,
    fallbackText: emailContent.text,
  });

  revalidatePath("/dashboard/hc/employee");
  return created;
}

export async function updateEmployee(id: number, data: {
  employeeId?: string;
  fullName?: string;
  email?: string;
  departmentId?: number | null;
  sectionId?: number | null;
  siteId?: number | null;
  positionId?: number | null;
  joinDate?: string | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  birthDate?: string | null;
  accountStatus?: string;
}) {
  const [before] = await db
    .select()
    .from(employees)
    .where(eq(employees.id, id))
    .limit(1);

  const setData: Record<string, any> = {};
  if (data.employeeId !== undefined) setData.employeeSn = data.employeeId;
  if (data.fullName !== undefined) setData.name = data.fullName;
  if (data.email !== undefined) setData.email = data.email;
  if (data.departmentId !== undefined) setData.departmentId = data.departmentId;
  if (data.sectionId !== undefined) setData.sectionId = data.sectionId;
  if (data.siteId !== undefined) setData.siteId = data.siteId;
  if (data.positionId !== undefined) setData.positionId = data.positionId;
  if (data.joinDate !== undefined) setData.joinDate = data.joinDate;
  if (data.contractStart !== undefined) setData.contractDurationStart = data.contractStart;
  if (data.contractEnd !== undefined) setData.contractDurationEnd = data.contractEnd;
  if (data.birthDate !== undefined) setData.birthDate = data.birthDate;
  if (data.accountStatus !== undefined) setData.employmentStatus = data.accountStatus;

  const [updated] = await db
    .update(employees)
    .set(setData)
    .where(eq(employees.id, id))
    .returning();

  const emailContent = buildHumanCapitalEmail({
    title: "Update data employee HC",
    intro: "Data employee di modul Human Capital telah diperbarui.",
    details: [
      `Nama: ${updated.name || before?.name || "-"}`,
      `Employee ID: ${updated.employeeSn || before?.employeeSn || "-"}`,
      `Email: ${updated.email || before?.email || "-"}`,
      `Account status: ${updated.employmentStatus || before?.employmentStatus || "-"}`,
    ],
  });

  await sendHumanCapitalEmail({
    templateCode: "hc_employee_updated",
    templateName: "HC Employee Updated",
    variables: {
      employeeName: updated.name || before?.name || "-",
      employeeId: updated.employeeSn || before?.employeeSn || "-",
      employeeEmail: updated.email || before?.email || "-",
      accountStatus: updated.employmentStatus || before?.employmentStatus || "-",
    },
    fallbackSubject: `Update employee: ${updated.name || before?.name || "Employee"}`,
    fallbackHtml: emailContent.html,
    fallbackText: emailContent.text,
  });

  revalidatePath("/dashboard/hc/employee");
  return updated;
}

export async function deleteEmployee(id: number) {
  const [deleted] = await db
    .update(employees)
    .set({
      isActive: false,
    })
    .where(eq(employees.id, id))
    .returning();

  revalidatePath("/dashboard/hc/employee");
  return deleted;
}

// Keep backward-compatible alias
export const updateEmployeeContract = updateEmployee;
