"use server";

import { db } from "@/db";
import {
  hrEmployees, hrPositions, hrWorkLocations, hrDepartments, hrSections, hrSites,
  hrGenders, hrEmployeeStatuses, employees
} from "@/db/schema/hero";
import { eq, desc, and, inArray, sql, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { buildHumanCapitalEmail, sendHumanCapitalEmail } from "@/lib/human-capital-email";

export async function getEmployeesForContract(filters?: {
  departmentId?: number;
  sectionId?: number;
  workLocationId?: number;
  status?: string;
}) {
  const conditions = [eq(hrEmployees.isActive, true)];

  if (filters?.departmentId) {
    const cond = or(
      eq(hrEmployees.departmentId, filters.departmentId),
      eq(employees.departmentId, filters.departmentId)
    );
    if (cond) conditions.push(cond);
  }
  if (filters?.sectionId) {
    const cond = or(
      eq(hrEmployees.sectionId, filters.sectionId),
      eq(employees.sectionId, filters.sectionId)
    );
    if (cond) conditions.push(cond);
  }
  if (filters?.workLocationId) {
    conditions.push(eq(hrEmployees.workLocationId, filters.workLocationId));
  }

  const rows = await db
    .select({
      id: hrEmployees.id,
      employeeId: hrEmployees.employeeId,
      fullName: sql<string>`coalesce(${hrEmployees.fullName}, ${employees.name}, '')`.as('full_name'),
      email: sql<string | null>`coalesce(${hrEmployees.email}, ${employees.email})`.as('email'),
      joinDate: sql<string | null>`coalesce(${hrEmployees.joinDate}, ${employees.joinDate})`.as('join_date'),
      contractStart: sql<string | null>`coalesce(${hrEmployees.contractStart}, ${employees.contractDurationStart})`.as('contract_start'),
      contractEnd: sql<string | null>`coalesce(${hrEmployees.contractEnd}, ${employees.contractDurationEnd})`.as('contract_end'),
      birthDate: sql<string | null>`coalesce(${hrEmployees.birthDate}, ${employees.birthDate})`.as('birth_date'),
      accountStatus: hrEmployees.accountStatus,
      genderCode: sql<string | null>`coalesce(${hrEmployees.genderCode}, ${employees.gender})`.as('gender_code'),
      jobTitle: sql<string | null>`coalesce(${hrPositions.rankName}, ${employees.jobTitle})`.as('job_title'),
      levelName: sql<string | null>`coalesce(${hrPositions.levelName}, ${employees.levelName})`.as('level_name'),
      departmentName: sql<string | null>`coalesce(${hrDepartments.name}, ${employees.department})`.as('department_name'),
      sectionName: sql<string | null>`coalesce(${hrSections.name}, ${employees.section})`.as('section_name'),
      siteName: hrSites.name,
      location: sql<string | null>`coalesce(${hrWorkLocations.name}, ${employees.workLocation})`.as('location'),
      departmentId: sql<number | null>`coalesce(${hrEmployees.departmentId}, ${employees.departmentId})`.as('department_id'),
      sectionId: sql<number | null>`coalesce(${hrEmployees.sectionId}, ${employees.sectionId})`.as('section_id'),
      workLocationId: hrEmployees.workLocationId,
      positionId: sql<number | null>`coalesce(${hrEmployees.positionId}, ${employees.positionId})`.as('position_id'),
    })
    .from(hrEmployees)
    .leftJoin(
      employees,
      or(eq(employees.employeeSn, hrEmployees.employeeId), eq(employees.email, hrEmployees.email))
    )
    .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
    .leftJoin(hrWorkLocations, eq(hrEmployees.workLocationId, hrWorkLocations.id))
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .leftJoin(hrSections, eq(hrEmployees.sectionId, hrSections.id))
    .leftJoin(hrSites, eq(hrEmployees.siteId, hrSites.id))
    .where(and(...conditions))
    .orderBy(desc(hrEmployees.id));

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
    db.select({ id: hrDepartments.id, name: hrDepartments.name }).from(hrDepartments).where(eq(hrDepartments.isActive, true)),
    db.select({ id: hrSections.id, name: hrSections.name, departmentId: hrSections.departmentId }).from(hrSections).where(eq(hrSections.isActive, true)),
    db.select({ id: hrWorkLocations.id, name: hrWorkLocations.name }).from(hrWorkLocations).where(eq(hrWorkLocations.isActive, true)),
  ]);
  return { departments, sections, locations };
}

export async function getEmployeeById(id: number) {
  const [emp] = await db
    .select()
    .from(hrEmployees)
    .where(eq(hrEmployees.id, id))
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
  workLocationId?: number;
  positionId?: number;
  joinDate?: string;
  contractStart?: string;
  contractEnd?: string;
  birthDate?: string;
  genderCode?: string;
}) {
  const [created] = await db.insert(hrEmployees).values({
    employeeId: data.employeeId,
    fullName: data.fullName,
    email: data.email || null,
    departmentId: data.departmentId || null,
    sectionId: data.sectionId || null,
    siteId: data.siteId || null,
    workLocationId: data.workLocationId || null,
    positionId: data.positionId || null,
    joinDate: data.joinDate || null,
    contractStart: data.contractStart || null,
    contractEnd: data.contractEnd || null,
    birthDate: data.birthDate || null,
    genderCode: data.genderCode || null,
    accountStatus: 'active',
    isActive: true,
  }).returning();

  const emailContent = buildHumanCapitalEmail({
    title: "Data employee HC baru",
    intro: "Master employee baru telah dibuat di modul Human Capital.",
    details: [
      `Nama: ${created.fullName}`,
      `Employee ID: ${created.employeeId}`,
      `Email: ${created.email || "-"}`,
      `Account status: ${created.accountStatus || "-"}`,
    ],
  });

  await sendHumanCapitalEmail({
    templateCode: "hc_employee_created",
    templateName: "HC Employee Created",
    variables: {
      employeeName: created.fullName,
      employeeId: created.employeeId,
      employeeEmail: created.email || "-",
      accountStatus: created.accountStatus || "-",
    },
    fallbackSubject: `Data employee baru: ${created.fullName}`,
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
  workLocationId?: number | null;
  positionId?: number | null;
  joinDate?: string | null;
  contractStart?: string | null;
  contractEnd?: string | null;
  birthDate?: string | null;
  genderCode?: string | null;
  accountStatus?: string;
}) {
  const [before] = await db
    .select()
    .from(hrEmployees)
    .where(eq(hrEmployees.id, id))
    .limit(1);

  const [updated] = await db
    .update(hrEmployees)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(hrEmployees.id, id))
    .returning();

  const emailContent = buildHumanCapitalEmail({
    title: "Update data employee HC",
    intro: "Data employee di modul Human Capital telah diperbarui.",
    details: [
      `Nama: ${updated.fullName || before?.fullName || "-"}`,
      `Employee ID: ${updated.employeeId || before?.employeeId || "-"}`,
      `Email: ${updated.email || before?.email || "-"}`,
      `Account status: ${updated.accountStatus || before?.accountStatus || "-"}`,
    ],
  });

  await sendHumanCapitalEmail({
    templateCode: "hc_employee_updated",
    templateName: "HC Employee Updated",
    variables: {
      employeeName: updated.fullName || before?.fullName || "-",
      employeeId: updated.employeeId || before?.employeeId || "-",
      employeeEmail: updated.email || before?.email || "-",
      accountStatus: updated.accountStatus || before?.accountStatus || "-",
    },
    fallbackSubject: `Update employee: ${updated.fullName || before?.fullName || "Employee"}`,
    fallbackHtml: emailContent.html,
    fallbackText: emailContent.text,
  });

  revalidatePath("/dashboard/hc/employee");
  return updated;
}

export async function deleteEmployee(id: number) {
  const [deleted] = await db
    .update(hrEmployees)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(hrEmployees.id, id))
    .returning();

  revalidatePath("/dashboard/hc/employee");
  return deleted;
}

// Keep backward-compatible alias
export const updateEmployeeContract = updateEmployee;
