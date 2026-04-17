import { eq, asc, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  masterSections,
  masterDepartments,
  masterPositions,
  orgStructures,
  employees,
} from "@/db/schema/hero";
import { ensureHeroGovernanceSeedData } from "./hero-admin";

// Types for Master Data
export type MasterSection = {
  id: number;
  code: string;
  name: string;
  departmentId: number | null;
  departmentName: string | null;
  description: string;
  isActive: boolean;
  employeeCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MasterDepartment = {
  id: number;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  employeeCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MasterPosition = {
  id: number;
  code: string;
  name: string;
  departmentId: number | null;
  departmentName: string | null;
  siteLocation: string;
  level: number;
  description: string;
  isActive: boolean;
  employeeCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type OrgStructure = {
  id: number;
  name: string;
  jobType: string;
  positionId: number;
  positionName: string;
  positionCode: string;
  managerPositionId: number | null;
  managerPositionName: string | null;
  approvalLevel: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Get all master data for the page
export async function getMasterDataPageData() {
  await ensureHeroGovernanceSeedData();

  const [sections, departments, positions, orgStructuresData] = await Promise.all([
    getMasterSections(),
    getMasterDepartments(),
    getMasterPositions(),
    getOrgStructures(),
  ]);

  return {
    sections,
    departments,
    positions,
    orgStructures: orgStructuresData,
  };
}

// Get Departments (parent entity) with employee count from User Management
export async function getMasterDepartments(): Promise<MasterDepartment[]> {
  await ensureHeroGovernanceSeedData();

  const deptRows = await db
    .select({
      id: masterDepartments.id,
      code: masterDepartments.code,
      name: masterDepartments.name,
      description: masterDepartments.description,
      isActive: masterDepartments.isActive,
      createdAt: masterDepartments.createdAt,
      updatedAt: masterDepartments.updatedAt,
    })
    .from(masterDepartments)
    .orderBy(asc(masterDepartments.code));

  // Get employee count per department from user management
  const employeeCounts = await db
    .select({
      department: employees.department,
      count: sql<number>`count(*)::int`,
    })
    .from(employees)
    .where(eq(employees.isActive, true))
    .groupBy(employees.department);

  const countMap = new Map(employeeCounts.map((r) => [r.department, r.count]));

  return deptRows.map((dept) => ({
    ...dept,
    employeeCount: countMap.get(dept.name) ?? 0,
  }));
}

// Get Sections (child of Department) with employee count
export async function getMasterSections(): Promise<MasterSection[]> {
  await ensureHeroGovernanceSeedData();

  const sectionRows = await db
    .select({
      id: masterSections.id,
      code: masterSections.code,
      name: masterSections.name,
      departmentId: masterSections.departmentId,
      departmentName: masterDepartments.name,
      description: masterSections.description,
      isActive: masterSections.isActive,
      createdAt: masterSections.createdAt,
      updatedAt: masterSections.updatedAt,
    })
    .from(masterSections)
    .leftJoin(masterDepartments, eq(masterSections.departmentId, masterDepartments.id))
    .orderBy(asc(masterSections.code));

  // Get employee count per section from user management
  const employeeCounts = await db
    .select({
      section: employees.section,
      count: sql<number>`count(*)::int`,
    })
    .from(employees)
    .where(eq(employees.isActive, true))
    .groupBy(employees.section);

  const countMap = new Map(employeeCounts.map((r) => [r.section, r.count]));

  return sectionRows.map((row) => ({
    ...row,
    departmentName: row.departmentName ?? null,
    employeeCount: countMap.get(row.name) ?? 0,
  }));
}

// Get Section Options (for dropdowns)
export async function getSectionOptions(departmentId?: number): Promise<Array<{ id: number; code: string; name: string; departmentId: number | null }>> {
  await ensureHeroGovernanceSeedData();

  if (departmentId) {
    return db
      .select({
        id: masterSections.id,
        code: masterSections.code,
        name: masterSections.name,
        departmentId: masterSections.departmentId,
      })
      .from(masterSections)
      .where(eq(masterSections.departmentId, departmentId))
      .orderBy(asc(masterSections.name));
  }

  return db
    .select({
      id: masterSections.id,
      code: masterSections.code,
      name: masterSections.name,
      departmentId: masterSections.departmentId,
    })
    .from(masterSections)
    .orderBy(asc(masterSections.name));
}

// Get Department Options (for dropdowns)
export async function getDepartmentOptions(): Promise<Array<{ id: number; code: string; name: string }>> {
  await ensureHeroGovernanceSeedData();

  return db
    .select({
      id: masterDepartments.id,
      code: masterDepartments.code,
      name: masterDepartments.name,
    })
    .from(masterDepartments)
    .where(eq(masterDepartments.isActive, true))
    .orderBy(asc(masterDepartments.name));
}

// Get Positions (Jabatan) with employee count
export async function getMasterPositions(): Promise<MasterPosition[]> {
  await ensureHeroGovernanceSeedData();

  const posRows = await db
    .select({
      id: masterPositions.id,
      code: masterPositions.code,
      name: masterPositions.name,
      departmentId: masterPositions.departmentId,
      departmentName: masterDepartments.name,
      siteLocation: masterPositions.siteLocation,
      level: masterPositions.level,
      description: masterPositions.description,
      isActive: masterPositions.isActive,
      createdAt: masterPositions.createdAt,
      updatedAt: masterPositions.updatedAt,
    })
    .from(masterPositions)
    .leftJoin(masterDepartments, eq(masterPositions.departmentId, masterDepartments.id))
    .orderBy(asc(masterPositions.code));

  // Get employee count per job title from user management
  const employeeCounts = await db
    .select({
      jobTitle: employees.jobTitle,
      count: sql<number>`count(*)::int`,
    })
    .from(employees)
    .where(eq(employees.isActive, true))
    .groupBy(employees.jobTitle);

  const countMap = new Map(employeeCounts.map((r) => [r.jobTitle, r.count]));

  return posRows.map((row) => ({
    ...row,
    departmentName: row.departmentName ?? null,
    employeeCount: countMap.get(row.name) ?? 0,
  }));
}

// Get Position Options
export async function getPositionOptions(departmentId?: number): Promise<Array<{ id: number; code: string; name: string; siteLocation: string; level: number; departmentId: number | null }>> {
  await ensureHeroGovernanceSeedData();

  if (departmentId) {
    return db
      .select({
        id: masterPositions.id,
        code: masterPositions.code,
        name: masterPositions.name,
        siteLocation: masterPositions.siteLocation,
        level: masterPositions.level,
        departmentId: masterPositions.departmentId,
      })
      .from(masterPositions)
      .where(eq(masterPositions.departmentId, departmentId))
      .orderBy(asc(masterPositions.name));
  }

  return db
    .select({
      id: masterPositions.id,
      code: masterPositions.code,
      name: masterPositions.name,
      siteLocation: masterPositions.siteLocation,
      level: masterPositions.level,
      departmentId: masterPositions.departmentId,
    })
    .from(masterPositions)
    .orderBy(asc(masterPositions.name));
}

// Get Organizational Structures
export async function getOrgStructures(): Promise<OrgStructure[]> {
  await ensureHeroGovernanceSeedData();

  const rows = await db
    .select({
      id: orgStructures.id,
      name: orgStructures.name,
      jobType: orgStructures.jobType,
      positionId: orgStructures.positionId,
      positionName: masterPositions.name,
      positionCode: masterPositions.code,
      managerPositionId: orgStructures.managerPositionId,
      managerPositionName: sql<string | null>`manager_pos.name`,
      approvalLevel: orgStructures.approvalLevel,
      isActive: orgStructures.isActive,
      createdAt: orgStructures.createdAt,
      updatedAt: orgStructures.updatedAt,
    })
    .from(orgStructures)
    .innerJoin(masterPositions, eq(orgStructures.positionId, masterPositions.id))
    .leftJoin(
      sql`${masterPositions} as manager_pos`,
      eq(orgStructures.managerPositionId, sql`manager_pos.id`)
    )
    .orderBy(asc(orgStructures.jobType), asc(orgStructures.approvalLevel));

  return rows.map((row) => ({
    ...row,
    managerPositionName: row.managerPositionName || null,
  }));
}

// Get Org Structure Options
export async function getOrgStructureOptions(): Promise<
  Array<{
    id: number;
    name: string;
    jobType: string;
    positionId: number;
    approvalLevel: number;
  }>
> {
  await ensureHeroGovernanceSeedData();

  return db
    .select({
      id: orgStructures.id,
      name: orgStructures.name,
      jobType: orgStructures.jobType,
      positionId: orgStructures.positionId,
      approvalLevel: orgStructures.approvalLevel,
    })
    .from(orgStructures)
    .where(eq(orgStructures.isActive, true))
    .orderBy(asc(orgStructures.name));
}
