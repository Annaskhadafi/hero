import { eq, asc, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  masterSections,
  masterDepartments,
  masterPositions,
  orgStructures,
  orgChartStructures,
  orgChartNodes,
  employees,
  sites,
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

export type MasterSite = {
  id: number;
  name: string;
  location: string;
  customerName: string;
  contractNumber: string;
  isActive: boolean;
  employeeCount: number;
  createdAt: Date;
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

export type OrgStructureNode = {
  id: number;
  structureId: number;
  parentNodeId: number | null;
  positionId: number | null;
  positionName: string | null;
  positionCode: string | null;
  employeeId: number | null;
  employeeName: string | null;
  label: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type OrgStructure = {
  id: number;
  name: string;
  scopeType: string;
  scopeValue: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  nodes: OrgStructureNode[];
};

// Get all master data for the page
export async function getMasterDataPageData() {
  await ensureHeroGovernanceSeedData();

  const [sections, departments, sitesData, positions, orgStructuresData, employeesData] = await Promise.all([
    getMasterSections(),
    getMasterDepartments(),
    getMasterSites(),
    getMasterPositions(),
    getOrgStructures(),
    db
      .select({ id: employees.id, name: employees.name, jobTitle: employees.jobTitle })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name)),
  ]);

  return {
    sections,
    departments,
    sites: sitesData,
    positions,
    orgStructures: orgStructuresData,
    employees: employeesData,
  };
}

export async function getMasterSites(): Promise<MasterSite[]> {
  await ensureHeroGovernanceSeedData();

  const siteRows = await db
    .select({
      id: sites.id,
      name: sites.name,
      location: sites.location,
      customerName: sites.customerName,
      contractNumber: sites.contractNumber,
      isActive: sites.isActive,
      createdAt: sites.createdAt,
    })
    .from(sites)
    .orderBy(asc(sites.name));

  const employeeCounts = await db
    .select({
      siteId: employees.siteId,
      count: sql<number>`count(*)::int`,
    })
    .from(employees)
    .where(eq(employees.isActive, true))
    .groupBy(employees.siteId);

  const countMap = new Map(employeeCounts.map((r) => [r.siteId, r.count]));

  return siteRows.map((site) => ({
    ...site,
    employeeCount: countMap.get(site.id) ?? 0,
  }));
}

export async function getSiteOptions(): Promise<Array<{ id: number; name: string; location: string }>> {
  await ensureHeroGovernanceSeedData();

  return db
    .select({
      id: sites.id,
      name: sites.name,
      location: sites.location,
    })
    .from(sites)
    .where(eq(sites.isActive, true))
    .orderBy(asc(sites.name));
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

  const [structures, nodes] = await Promise.all([
    db
      .select({
        id: orgChartStructures.id,
        name: orgChartStructures.name,
        scopeType: orgChartStructures.scopeType,
        scopeValue: orgChartStructures.scopeValue,
        description: orgChartStructures.description,
        isActive: orgChartStructures.isActive,
        createdAt: orgChartStructures.createdAt,
        updatedAt: orgChartStructures.updatedAt,
      })
      .from(orgChartStructures)
      .orderBy(asc(orgChartStructures.name)),
    db
      .select({
        id: orgChartNodes.id,
        structureId: orgChartNodes.structureId,
        parentNodeId: orgChartNodes.parentNodeId,
        positionId: orgChartNodes.positionId,
        positionName: masterPositions.name,
        positionCode: masterPositions.code,
        employeeId: orgChartNodes.employeeId,
        employeeName: employees.name,
        label: orgChartNodes.label,
        sortOrder: orgChartNodes.sortOrder,
        isActive: orgChartNodes.isActive,
        createdAt: orgChartNodes.createdAt,
        updatedAt: orgChartNodes.updatedAt,
      })
      .from(orgChartNodes)
      .leftJoin(masterPositions, eq(orgChartNodes.positionId, masterPositions.id))
      .leftJoin(employees, eq(orgChartNodes.employeeId, employees.id))
      .orderBy(asc(orgChartNodes.structureId), asc(orgChartNodes.sortOrder), asc(orgChartNodes.id)),
  ]);

  const nodesByStructureId = new Map<number, OrgStructureNode[]>();

  for (const node of nodes) {
    const list = nodesByStructureId.get(node.structureId) ?? [];
    list.push({
      ...node,
      parentNodeId: node.parentNodeId ?? null,
      positionId: node.positionId ?? null,
      positionName: node.positionName ?? null,
      positionCode: node.positionCode ?? null,
      employeeId: node.employeeId ?? null,
      employeeName: node.employeeName ?? null,
    });
    nodesByStructureId.set(node.structureId, list);
  }

  return structures.map((structure) => ({
    ...structure,
    nodes: nodesByStructureId.get(structure.id) ?? [],
  }));
}

// Legacy Get Org Structure Options
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

  const rows = await db
    .select({
      id: orgChartStructures.id,
      name: orgChartStructures.name,
      jobType: orgChartStructures.scopeType,
      positionId: sql<number>`coalesce(min(${orgChartNodes.positionId}), 0)::int`,
      approvalLevel: sql<number>`coalesce(count(${orgChartNodes.id}), 0)::int`,
    })
    .from(orgChartStructures)
    .leftJoin(orgChartNodes, eq(orgChartStructures.id, orgChartNodes.structureId))
    .where(eq(orgChartStructures.isActive, true))
    .groupBy(orgChartStructures.id, orgChartStructures.name, orgChartStructures.scopeType)
    .orderBy(asc(orgChartStructures.name));

  return rows;
}
