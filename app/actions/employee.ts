"use server";

import { db } from "@/db";
import {
  hrPositions,
  employees, masterDepartments, masterSections, sites, masterJobTitles,
  employeeMcu
} from "@/db/schema/hero";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { user } from "@/db/schema/auth";
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
      expMinePermit: employees.expMinePermit,
      accountStatus: employees.employmentStatus,
      genderCode: employees.gender,
      jobTitle: sql<string | null>`coalesce(${masterJobTitles.name}, ${employees.jobTitle})`.as('job_title'),
      levelName: employees.levelName,
      departmentName: sql<string | null>`coalesce(${masterDepartments.name}, ${employees.department})`.as('department_name'),
      sectionName: sql<string | null>`coalesce(${masterSections.name}, ${employees.section})`.as('section_name'),
      siteName: sites.name,
      location: sites.location,
      workLocationId: employees.siteId,
      departmentId: employees.departmentId,
      sectionId: employees.sectionId,
      positionId: employees.positionId,
      lastMcuDate: sql<string | null>`(
        SELECT CAST(mcu_date AS text)
        FROM hero_employee_mcu
        WHERE employee_id = ${employees.id}
        ORDER BY mcu_date DESC NULLS LAST
        LIMIT 1
      )`.as('last_mcu_date'),
    })
    .from(employees)
    .leftJoin(masterJobTitles, eq(employees.positionId, masterJobTitles.id))
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
  const [departments, sections, locations, positions] = await Promise.all([
    db.select({ id: masterDepartments.id, name: masterDepartments.name }).from(masterDepartments).where(eq(masterDepartments.isActive, true)),
    db.select({ id: masterSections.id, name: masterSections.name, departmentId: masterSections.departmentId }).from(masterSections).where(eq(masterSections.isActive, true)),
    db.select({ id: sites.id, name: sites.name }).from(sites).where(eq(sites.isActive, true)),
    db.select({ id: masterJobTitles.id, name: masterJobTitles.name }).from(masterJobTitles).where(eq(masterJobTitles.isActive, true)),
  ]);
  return { departments, sections, locations, positions };
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
  expMinePermit?: string | null;
  accountStatus?: string;
  lastMcuDate?: string | null;
}) {
  const setData = {
    employeeSn: data.employeeId,
    name: data.fullName,
    email: data.email,
    departmentId: data.departmentId,
    sectionId: data.sectionId,
    siteId: data.siteId,
    positionId: data.positionId,
    joinDate: data.joinDate,
    contractDurationStart: data.contractStart,
    contractDurationEnd: data.contractEnd,
    birthDate: data.birthDate,
    expMinePermit: data.expMinePermit,
    employmentStatus: data.accountStatus,
    isActive: true,
    role: 'Employee',
    department: '',
  };

  const [created] = await db
    .insert(employees)
    .values(setData)
    .returning();

  if (data.lastMcuDate && created) {
    await db.insert(employeeMcu).values({
      employeeId: created.id,
      mcuDate: data.lastMcuDate,
      paketMcu: "", // Ensure it doesn't fail default logic
    });
  }

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
  expMinePermit?: string | null;
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
  if (data.expMinePermit !== undefined) setData.expMinePermit = data.expMinePermit;
  if (data.accountStatus !== undefined) setData.employmentStatus = data.accountStatus;

  if (data.lastMcuDate !== undefined) {
    if (data.lastMcuDate) {
      // Find latest MCU to update, or insert new
      const latestMcu = await db.select().from(employeeMcu).where(eq(employeeMcu.employeeId, id)).orderBy(desc(employeeMcu.mcuDate)).limit(1);
      if (latestMcu.length > 0) {
        await db.update(employeeMcu).set({ mcuDate: data.lastMcuDate }).where(eq(employeeMcu.id, latestMcu[0].id));
      } else {
        await db.insert(employeeMcu).values({
          employeeId: id,
          mcuDate: data.lastMcuDate,
          paketMcu: "",
        });
      }
    } else {
      // If cleared, maybe we do nothing or clear the latest? Usually deleting MCU records is handled in MCU module.
      // We'll leave it as is if it's cleared.
    }
  }

  const [updated] = await db
    .update(employees)
    .set(setData)
    .where(eq(employees.id, id))
    .returning();

  if (updated.authUserId && (data.fullName !== undefined || data.email !== undefined)) {
    const userUpdate: Record<string, any> = {};
    if (data.fullName !== undefined) userUpdate.name = data.fullName;
    if (data.email !== undefined) userUpdate.email = data.email;
    
    if (Object.keys(userUpdate).length > 0) {
      await db.update(user).set(userUpdate).where(eq(user.id, updated.authUserId));
    }
  }

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

export async function bulkUpdateEmployees(ids: number[], data: Partial<import("@/app/dashboard/hc/employee/client-page").EmployeeFormData>) {
  if (ids.length === 0) return 0;
  const setData: Record<string, any> = {};
  if (data.workLocationId !== undefined && data.workLocationId !== "") setData.siteId = Number(data.workLocationId);
  if (data.positionId !== undefined && data.positionId !== "") setData.positionId = Number(data.positionId);
  if (data.expMinePermit !== undefined && data.expMinePermit !== "") setData.expMinePermit = data.expMinePermit;
  
  if (Object.keys(setData).length > 0) {
    await db.update(employees).set(setData).where(inArray(employees.id, ids));
  }

  if (data.lastMcuDate !== undefined && data.lastMcuDate !== "") {
    // For bulk MCU, it's safer to just insert a new MCU record for each selected employee
    for (const id of ids) {
      const latestMcu = await db.select().from(employeeMcu).where(eq(employeeMcu.employeeId, id)).orderBy(desc(employeeMcu.mcuDate)).limit(1);
      if (latestMcu.length > 0) {
        await db.update(employeeMcu).set({ mcuDate: data.lastMcuDate }).where(eq(employeeMcu.id, latestMcu[0].id));
      } else {
        await db.insert(employeeMcu).values({
          employeeId: id,
          mcuDate: data.lastMcuDate,
          paketMcu: "",
        });
      }
    }
  }

  revalidatePath("/dashboard/hc/employee");
  return ids.length;
}
