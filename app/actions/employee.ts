"use server";

import { db } from "@/db";
import {
  hrEmployees, hrPositions, hrWorkLocations, hrDepartments, hrSections, hrSites,
  hrGenders, hrEmployeeStatuses
} from "@/db/schema/hero";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getEmployeesForContract(filters?: {
  departmentId?: number;
  sectionId?: number;
  workLocationId?: number;
  status?: string;
}) {
  const conditions = [eq(hrEmployees.isActive, true)];

  if (filters?.departmentId) {
    conditions.push(eq(hrEmployees.departmentId, filters.departmentId));
  }
  if (filters?.sectionId) {
    conditions.push(eq(hrEmployees.sectionId, filters.sectionId));
  }
  if (filters?.workLocationId) {
    conditions.push(eq(hrEmployees.workLocationId, filters.workLocationId));
  }

  return await db
    .select({
      id: hrEmployees.id,
      employeeId: hrEmployees.employeeId,
      fullName: hrEmployees.fullName,
      email: hrEmployees.email,
      joinDate: hrEmployees.joinDate,
      contractStart: hrEmployees.contractStart,
      contractEnd: hrEmployees.contractEnd,
      birthDate: hrEmployees.birthDate,
      accountStatus: hrEmployees.accountStatus,
      genderCode: hrEmployees.genderCode,
      jobTitle: hrPositions.rankName,
      levelName: hrPositions.levelName,
      departmentName: hrDepartments.name,
      sectionName: hrSections.name,
      siteName: hrSites.name,
      location: hrWorkLocations.name,
      departmentId: hrEmployees.departmentId,
      sectionId: hrEmployees.sectionId,
      workLocationId: hrEmployees.workLocationId,
      positionId: hrEmployees.positionId,
    })
    .from(hrEmployees)
    .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
    .leftJoin(hrWorkLocations, eq(hrEmployees.workLocationId, hrWorkLocations.id))
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .leftJoin(hrSections, eq(hrEmployees.sectionId, hrSections.id))
    .leftJoin(hrSites, eq(hrEmployees.siteId, hrSites.id))
    .where(and(...conditions))
    .orderBy(desc(hrEmployees.id));
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
  const [updated] = await db
    .update(hrEmployees)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(hrEmployees.id, id))
    .returning();

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
