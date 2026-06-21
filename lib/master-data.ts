import { asc, eq, sql } from "drizzle-orm";
import { aliasedTable } from "drizzle-orm/alias";
import { db } from "@/db";
import {
  approvalMatrices,
  approvalMatrixSteps,
  employees,
  masterCategoryOptions,
  masterAttendanceShifts,
  masterDepartments,
  masterJobTitles,
  masterLevelStaff,
  masterPositions,
  masterSections,
  masterSubSections,
  orgChartNodes,
  orgChartStructures,
  orgNodeAssignments,
  sites,
} from "@/db/schema/hero";
import { ensureHeroGovernanceSeedData } from "./hero-admin";
import {
  ensureMasterCategoryTables,
  type MasterCategoryOption,
} from "@/lib/master-categories";

const fallbackNodes = aliasedTable(orgChartNodes, "fallback_nodes");
const fallbackStepNodes = aliasedTable(orgChartNodes, "fallback_step_nodes");
const escalationStepNodes = aliasedTable(orgChartNodes, "escalation_step_nodes");
const headEmployees = aliasedTable(employees, "head_employees");

export type MasterSection = {
  id: number;
  code: string;
  name: string;
  departmentId: number | null;
  departmentName: string | null;
  headEmployeeId: number | null;
  headEmployeeName: string | null;
  parentId: number | null;
  parentName: string | null;
  description: string;
  isActive: boolean;
  employeeCount: number;
  directEmployeeCount: number;
  childEmployeeCount: number;
  subSections: MasterSubSection[];
  createdAt: Date;
  updatedAt: Date;
};

export type MasterSubSection = {
  id: number;
  code: string;
  name: string;
  sectionId: number | null;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MasterJobTitle = {
  id: number;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type MasterLevelStaff = {
  id: number;
  name: string;
  code: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
};

export type MasterDepartment = {
  id: number;
  code: string;
  name: string;
  headEmployeeId: number | null;
  headEmployeeName: string | null;
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
  provinceId: string;
  provinceName: string;
  regencyId: string;
  regencyName: string;
  districtId: string;
  districtName: string;
  villageId: string;
  villageName: string;
  addressDetail: string;
  geoLatitude: string;
  geoLongitude: string;
  geoRadiusMeters: number;
  customerName: string;
  contractNumber: string;
  headEmployeeId: number | null;
  headEmployeeName: string | null;
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
  sectionId: number | null;
  sectionName: string | null;
  siteLocation: string;
  level: number;
  description: string;
  isActive: boolean;
  employeeCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MasterAttendanceShift = {
  id: number;
  code: string;
  label: string;
  startTime: string;
  endTime: string;
  windowLabel: string;
  helper: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type { MasterCategoryOption };

export type OrgStructureNodeAssignment = {
  id: number;
  nodeId: number;
  employeeId: number | null;
  employeeName: string | null;
  assignmentType: string;
  notes: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isActive: boolean;
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
  nodeCode: string;
  nodeType: string;
  approvalRole: string;
  canApprove: boolean;
  canDelegate: boolean;
  isEscalationTarget: boolean;
  slaHours: number;
  fallbackNodeId: number | null;
  fallbackNodeLabel: string | null;
  label: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  assignments: OrgStructureNodeAssignment[];
};

type OrgStructureNodeRow = Omit<OrgStructureNode, "assignments">;

export type OrgStructure = {
  id: number;
  name: string;
  scopeType: string;
  scopeValue: string;
  version: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isDefault: boolean;
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  nodes: OrgStructureNode[];
};

export type ApprovalMatrixStep = {
  id: number;
  matrixId: number;
  stepOrder: number;
  label: string;
  nodeId: number | null;
  nodeLabel: string | null;
  nodeApprovalRole: string | null;
  fallbackNodeId: number | null;
  fallbackNodeLabel: string | null;
  escalationNodeId: number | null;
  escalationNodeLabel: string | null;
  approvalMode: string;
  slaHours: number;
  canDelegate: boolean;
  isRequired: boolean;
};

export type ApprovalMatrix = {
  id: number;
  name: string;
  structureId: number | null;
  structureName: string | null;
  transactionType: string;
  siteId: number | null;
  siteName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  sectionId: number | null;
  sectionName: string | null;
  requesterPositionId: number | null;
  requesterPositionName: string | null;
  activityType: string;
  priority: string;
  minOvertimeMinutes: number;
  maxOvertimeMinutes: number | null;
  description: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  steps: ApprovalMatrixStep[];
};

export async function getMasterDataPageData() {
  await ensureHeroGovernanceSeedData();
  await ensureMasterCategoryTables();

  const [
    sections,
    jobTitles,
    departments,
    sitesData,
    positions,
    attendanceShifts,
    orgStructuresData,
    approvalMatricesData,
    categoryOptions,
    employeesData,
    levelStaff,
  ] =
    await Promise.all([
      getMasterSections(),
      getMasterJobTitles(),
      getMasterDepartments(),
      getMasterSites(),
      getMasterPositions(),
      getMasterAttendanceShifts(),
      getOrgStructures(),
      getApprovalMatrices(),
      getMasterCategoryOptionsForManagement(),
      db
        .select({
          id: employees.id,
          name: employees.name,
          employeeSn: employees.employeeSn,
          email: employees.email,
          jobTitle: employees.jobTitle,
          departmentId: employees.departmentId,
          sectionId: employees.sectionId,
          siteId: employees.siteId,
          positionId: employees.positionId,
          orgNodeId: employees.orgNodeId,
        })
        .from(employees)
        .where(eq(employees.isActive, true))
        .orderBy(asc(employees.name)),
      getMasterLevelStaff(),
    ]);

  // Deduplicate employees by SN (fallback email/id) — same person may have multiple rows
  const employeeByKey = new Map<string, typeof employeesData[number]>()
  for (const emp of employeesData) {
    const key = (emp.employeeSn || emp.email || String(emp.id)).trim().toLowerCase()
    if (!employeeByKey.has(key)) {
      employeeByKey.set(key, emp)
    }
  }
  const dedupedEmployees = Array.from(employeeByKey.values())

  return {
    sections,
    jobTitles,
    departments,
    sites: sitesData,
    positions,
    attendanceShifts,
    orgStructures: orgStructuresData,
    approvalMatrices: approvalMatricesData,
    categoryOptions,
    employees: dedupedEmployees,
    levelStaff,
  };
}

export async function getMasterCategoryOptionsForManagement(): Promise<MasterCategoryOption[]> {
  await ensureMasterCategoryTables();

  return db
    .select()
    .from(masterCategoryOptions)
    .orderBy(
      asc(masterCategoryOptions.type),
      asc(masterCategoryOptions.sortOrder),
      asc(masterCategoryOptions.label),
    );
}

export function getAttendanceShiftWindow(shift: {
  startTime: string;
  endTime: string;
  windowLabel: string;
}) {
  const explicitWindow = shift.windowLabel.trim();

  if (explicitWindow) {
    return explicitWindow;
  }

  if (shift.startTime && shift.endTime) {
    return `${shift.startTime} - ${shift.endTime}`;
  }

  return "Sesuai assignment";
}

export async function getMasterAttendanceShifts(): Promise<MasterAttendanceShift[]> {
  await ensureHeroGovernanceSeedData();

  return db
    .select({
      id: masterAttendanceShifts.id,
      code: masterAttendanceShifts.code,
      label: masterAttendanceShifts.label,
      startTime: masterAttendanceShifts.startTime,
      endTime: masterAttendanceShifts.endTime,
      windowLabel: masterAttendanceShifts.windowLabel,
      helper: masterAttendanceShifts.helper,
      sortOrder: masterAttendanceShifts.sortOrder,
      isActive: masterAttendanceShifts.isActive,
      createdAt: masterAttendanceShifts.createdAt,
      updatedAt: masterAttendanceShifts.updatedAt,
    })
    .from(masterAttendanceShifts)
    .orderBy(asc(masterAttendanceShifts.sortOrder), asc(masterAttendanceShifts.label));
}

export async function getActiveAttendanceShiftOptions() {
  const shifts = await getMasterAttendanceShifts();

  return shifts
    .filter((shift) => shift.isActive)
    .map((shift) => ({
      value: shift.code,
      label: shift.label,
      window: getAttendanceShiftWindow(shift),
      helper: shift.helper,
    }));
}

export async function getMasterSites(): Promise<MasterSite[]> {
  await ensureHeroGovernanceSeedData();

  const [siteRows, employeeCounts] = await Promise.all([
    db
      .select({
        id: sites.id,
        name: sites.name,
        location: sites.location,
        provinceId: sites.provinceId,
        provinceName: sites.provinceName,
        regencyId: sites.regencyId,
        regencyName: sites.regencyName,
        districtId: sites.districtId,
        districtName: sites.districtName,
        villageId: sites.villageId,
        villageName: sites.villageName,
        addressDetail: sites.addressDetail,
        geoLatitude: sites.geoLatitude,
        geoLongitude: sites.geoLongitude,
        geoRadiusMeters: sites.geoRadiusMeters,
        customerName: sites.customerName,
        contractNumber: sites.contractNumber,
        headEmployeeId: sites.headEmployeeId,
        headEmployeeName: headEmployees.name,
        isActive: sites.isActive,
        createdAt: sites.createdAt,
      })
      .from(sites)
      .leftJoin(headEmployees, eq(sites.headEmployeeId, headEmployees.id))
      .orderBy(asc(sites.name)),
    db
      .select({
        siteId: employees.siteId,
        count: sql<number>`count(*)::int`,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .groupBy(employees.siteId),
  ]);

  const countMap = new Map(employeeCounts.map((row) => [row.siteId, row.count]));

  return siteRows.map((site) => ({
    ...site,
    headEmployeeName: site.headEmployeeName ?? null,
    employeeCount: countMap.get(site.id) ?? 0,
  }));
}

export async function getSiteOptions(): Promise<Array<{ id: number; name: string; location: string }>> {
  await ensureHeroGovernanceSeedData();

  const siteOptions = await db
    .select({
      id: sites.id,
      name: sites.name,
      location: sites.location,
    })
    .from(sites)
    .where(eq(sites.isActive, true))
    .orderBy(asc(sites.name));

  if (siteOptions.length > 0) {
    return siteOptions;
  }

  const [createdSite] = await db
    .insert(sites)
    .values({
      name: "Default Site",
      location: "Default Site",
      customerName: "PT Chitra Paratama",
      contractNumber: "MASTER-DEFAULT",
      isActive: true,
    })
    .returning({
      id: sites.id,
      name: sites.name,
      location: sites.location,
    });

  return createdSite ? [createdSite] : [];
}

export async function getMasterDepartments(): Promise<MasterDepartment[]> {
  await ensureHeroGovernanceSeedData();

  const [departmentRows, employeeCounts] = await Promise.all([
    db
      .select({
        id: masterDepartments.id,
        code: masterDepartments.code,
        name: masterDepartments.name,
        headEmployeeId: masterDepartments.headEmployeeId,
        headEmployeeName: headEmployees.name,
        description: masterDepartments.description,
        isActive: masterDepartments.isActive,
        createdAt: masterDepartments.createdAt,
        updatedAt: masterDepartments.updatedAt,
      })
      .from(masterDepartments)
      .leftJoin(headEmployees, eq(masterDepartments.headEmployeeId, headEmployees.id))
      .orderBy(asc(masterDepartments.code)),
    db
      .select({
        departmentId: employees.departmentId,
        count: sql<number>`count(*)::int`,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .groupBy(employees.departmentId),
  ]);

  const countMap = new Map(
    employeeCounts
      .filter((row) => row.departmentId != null)
      .map((row) => [row.departmentId as number, row.count]),
  );

  return departmentRows.map((department) => ({
    ...department,
    headEmployeeName: department.headEmployeeName ?? null,
    employeeCount: countMap.get(department.id) ?? 0,
  }));
}

export async function getMasterSections(): Promise<MasterSection[]> {
  await ensureHeroGovernanceSeedData();

  const [sectionRows, employeeCounts, subSectionRows] = await Promise.all([
    db
      .select({
        id: masterSections.id,
        code: masterSections.code,
        name: masterSections.name,
        departmentId: masterSections.departmentId,
        departmentName: masterDepartments.name,
        headEmployeeId: masterSections.headEmployeeId,
        headEmployeeName: headEmployees.name,
        parentId: masterSections.parentId,
        description: masterSections.description,
        isActive: masterSections.isActive,
        createdAt: masterSections.createdAt,
        updatedAt: masterSections.updatedAt,
      })
      .from(masterSections)
      .leftJoin(masterDepartments, eq(masterSections.departmentId, masterDepartments.id))
      .leftJoin(headEmployees, eq(masterSections.headEmployeeId, headEmployees.id))
      .orderBy(asc(masterSections.code)),
    db
      .select({
        sectionId: employees.sectionId,
        count: sql<number>`count(*)::int`,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .groupBy(employees.sectionId),
    db
      .select()
      .from(masterSubSections)
      .orderBy(asc(masterSubSections.name)),
  ]);

  const countMap = new Map(
    employeeCounts
      .filter((row) => row.sectionId != null)
      .map((row) => [row.sectionId as number, row.count]),
  );

  const subSectionsBySection = new Map<number, MasterSubSection[]>();
  for (const sub of subSectionRows) {
    if (sub.sectionId == null) continue;
    const list = subSectionsBySection.get(sub.sectionId) ?? [];
    list.push(sub);
    subSectionsBySection.set(sub.sectionId, list);
  }

  const sectionNameById = new Map(sectionRows.map((row) => [row.id, row.name]));

  // Build parent→children map for recursive counting
  const childrenMap = new Map<number, number[]>();
  for (const section of sectionRows) {
    if (section.parentId == null) continue;
    const list = childrenMap.get(section.parentId) ?? [];
    list.push(section.id);
    childrenMap.set(section.parentId, list);
  }

  // Recursive helper to collect all descendant IDs
  function collectDescendantIds(parentId: number): number[] {
    const childIds = childrenMap.get(parentId) ?? [];
    const all = [...childIds];
    for (const childId of childIds) {
      all.push(...collectDescendantIds(childId));
    }
    return all;
  }

  return sectionRows.map((section) => {
    const direct = countMap.get(section.id) ?? 0;
    const descendantIds = collectDescendantIds(section.id);
    const childTotal = descendantIds.reduce((sum, id) => sum + (countMap.get(id) ?? 0), 0);
    return {
      ...section,
      departmentName: section.departmentName ?? null,
      headEmployeeName: section.headEmployeeName ?? null,
      parentName: section.parentId ? (sectionNameById.get(section.parentId) ?? null) : null,
      employeeCount: direct + childTotal,
      directEmployeeCount: direct,
      childEmployeeCount: childTotal,
      subSections: subSectionsBySection.get(section.id) ?? [],
    };
  });
}

export async function getMasterJobTitles(): Promise<MasterJobTitle[]> {
  await ensureHeroGovernanceSeedData();

  const rows = await db
    .select({
      id: masterJobTitles.id,
      code: masterJobTitles.code,
      name: masterJobTitles.name,
      description: masterJobTitles.description,
      isActive: masterJobTitles.isActive,
      createdAt: masterJobTitles.createdAt,
      updatedAt: masterJobTitles.updatedAt,
    })
    .from(masterJobTitles)
    .orderBy(asc(masterJobTitles.code));

  return rows;
}

export async function getMasterLevelStaff(): Promise<MasterLevelStaff[]> {
  await ensureHeroGovernanceSeedData();

  return db
    .select()
    .from(masterLevelStaff)
    .orderBy(asc(masterLevelStaff.sortOrder), asc(masterLevelStaff.name));
}

export async function getSectionOptions(
  departmentId?: number,
): Promise<Array<{ id: number; code: string; name: string; departmentId: number | null }>> {
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

export async function getMasterPositions(): Promise<MasterPosition[]> {
  await ensureHeroGovernanceSeedData();

  const [positionRows, employeeCounts] = await Promise.all([
    db
      .select({
        id: masterPositions.id,
        code: masterPositions.code,
        name: masterPositions.name,
        departmentId: masterPositions.departmentId,
        departmentName: masterDepartments.name,
        sectionId: masterPositions.sectionId,
        sectionName: masterSections.name,
        siteLocation: masterPositions.siteLocation,
        level: masterPositions.level,
        description: masterPositions.description,
        isActive: masterPositions.isActive,
        createdAt: masterPositions.createdAt,
        updatedAt: masterPositions.updatedAt,
      })
      .from(masterPositions)
      .leftJoin(masterDepartments, eq(masterPositions.departmentId, masterDepartments.id))
      .leftJoin(masterSections, eq(masterPositions.sectionId, masterSections.id))
      .orderBy(asc(masterPositions.code)),
    db
      .select({
        positionId: employees.positionId,
        count: sql<number>`count(*)::int`,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .groupBy(employees.positionId),
  ]);

  const countMap = new Map(
    employeeCounts
      .filter((row) => row.positionId != null)
      .map((row) => [row.positionId as number, row.count]),
  );

  return positionRows.map((position) => ({
    ...position,
    departmentName: position.departmentName ?? null,
    sectionName: position.sectionName ?? null,
    employeeCount: countMap.get(position.id) ?? 0,
  }));
}

export async function getPositionOptions(
  departmentId?: number,
): Promise<Array<{
  id: number;
  code: string;
  name: string;
  siteLocation: string;
  level: number;
  departmentId: number | null;
  sectionId: number | null;
}>> {
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
        sectionId: masterPositions.sectionId,
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
      sectionId: masterPositions.sectionId,
    })
    .from(masterPositions)
    .orderBy(asc(masterPositions.name));
}

export async function getOrgStructures(): Promise<OrgStructure[]> {
  await ensureHeroGovernanceSeedData();

  const [structures, nodes, assignments] = await Promise.all([
    db
      .select({
        id: orgChartStructures.id,
        name: orgChartStructures.name,
        scopeType: orgChartStructures.scopeType,
        scopeValue: orgChartStructures.scopeValue,
        version: orgChartStructures.version,
        effectiveFrom: orgChartStructures.effectiveFrom,
        effectiveTo: orgChartStructures.effectiveTo,
        isDefault: orgChartStructures.isDefault,
        description: orgChartStructures.description,
        isActive: orgChartStructures.isActive,
        createdAt: orgChartStructures.createdAt,
        updatedAt: orgChartStructures.updatedAt,
      })
      .from(orgChartStructures)
      .orderBy(asc(orgChartStructures.scopeType), asc(orgChartStructures.name)),
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
        nodeCode: orgChartNodes.nodeCode,
        nodeType: orgChartNodes.nodeType,
        approvalRole: orgChartNodes.approvalRole,
        canApprove: orgChartNodes.canApprove,
        canDelegate: orgChartNodes.canDelegate,
        isEscalationTarget: orgChartNodes.isEscalationTarget,
        slaHours: orgChartNodes.slaHours,
        fallbackNodeId: orgChartNodes.fallbackNodeId,
        fallbackNodeLabel: fallbackNodes.label,
        label: orgChartNodes.label,
        sortOrder: orgChartNodes.sortOrder,
        isActive: orgChartNodes.isActive,
        createdAt: orgChartNodes.createdAt,
        updatedAt: orgChartNodes.updatedAt,
      })
      .from(orgChartNodes)
      .leftJoin(masterPositions, eq(orgChartNodes.positionId, masterPositions.id))
      .leftJoin(employees, eq(orgChartNodes.employeeId, employees.id))
      .leftJoin(fallbackNodes, eq(fallbackNodes.id, orgChartNodes.fallbackNodeId))
      .orderBy(asc(orgChartNodes.structureId), asc(orgChartNodes.sortOrder), asc(orgChartNodes.id)) as Promise<
        OrgStructureNodeRow[]
      >,
    db
      .select({
        id: orgNodeAssignments.id,
        nodeId: orgNodeAssignments.nodeId,
        employeeId: orgNodeAssignments.employeeId,
        employeeName: employees.name,
        assignmentType: orgNodeAssignments.assignmentType,
        notes: orgNodeAssignments.notes,
        effectiveFrom: orgNodeAssignments.effectiveFrom,
        effectiveTo: orgNodeAssignments.effectiveTo,
        isActive: orgNodeAssignments.isActive,
      })
      .from(orgNodeAssignments)
      .leftJoin(employees, eq(orgNodeAssignments.employeeId, employees.id))
      .orderBy(
        asc(orgNodeAssignments.nodeId),
        asc(orgNodeAssignments.assignmentType),
        asc(orgNodeAssignments.effectiveFrom),
      ),
  ]);

  const assignmentsByNodeId = new Map<number, OrgStructureNodeAssignment[]>();
  for (const assignment of assignments) {
    const list = assignmentsByNodeId.get(assignment.nodeId) ?? [];
    list.push({
      ...assignment,
      employeeId: assignment.employeeId ?? null,
      employeeName: assignment.employeeName ?? null,
      effectiveTo: assignment.effectiveTo ?? null,
    });
    assignmentsByNodeId.set(assignment.nodeId, list);
  }

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
      fallbackNodeId: node.fallbackNodeId ?? null,
      fallbackNodeLabel: node.fallbackNodeLabel ?? null,
      assignments: assignmentsByNodeId.get(node.id) ?? [],
    });
    nodesByStructureId.set(node.structureId, list);
  }

  return structures.map((structure) => ({
    ...structure,
    effectiveTo: structure.effectiveTo ?? null,
    nodes: nodesByStructureId.get(structure.id) ?? [],
  }));
}

export async function getApprovalMatrices(): Promise<ApprovalMatrix[]> {
  await ensureHeroGovernanceSeedData();

  const [matrices, steps] = await Promise.all([
    db
      .select({
        id: approvalMatrices.id,
        name: approvalMatrices.name,
        structureId: approvalMatrices.structureId,
        structureName: orgChartStructures.name,
        transactionType: approvalMatrices.transactionType,
        siteId: approvalMatrices.siteId,
        siteName: sites.name,
        departmentId: approvalMatrices.departmentId,
        departmentName: masterDepartments.name,
        sectionId: approvalMatrices.sectionId,
        sectionName: masterSections.name,
        requesterPositionId: approvalMatrices.requesterPositionId,
        requesterPositionName: masterPositions.name,
        activityType: approvalMatrices.activityType,
        priority: approvalMatrices.priority,
        minOvertimeMinutes: approvalMatrices.minOvertimeMinutes,
        maxOvertimeMinutes: approvalMatrices.maxOvertimeMinutes,
        description: approvalMatrices.description,
        effectiveFrom: approvalMatrices.effectiveFrom,
        effectiveTo: approvalMatrices.effectiveTo,
        isActive: approvalMatrices.isActive,
        createdAt: approvalMatrices.createdAt,
        updatedAt: approvalMatrices.updatedAt,
      })
      .from(approvalMatrices)
      .leftJoin(orgChartStructures, eq(approvalMatrices.structureId, orgChartStructures.id))
      .leftJoin(sites, eq(approvalMatrices.siteId, sites.id))
      .leftJoin(masterDepartments, eq(approvalMatrices.departmentId, masterDepartments.id))
      .leftJoin(masterSections, eq(approvalMatrices.sectionId, masterSections.id))
      .leftJoin(masterPositions, eq(approvalMatrices.requesterPositionId, masterPositions.id))
      .orderBy(asc(approvalMatrices.name), asc(approvalMatrices.id)),
    db
      .select({
        id: approvalMatrixSteps.id,
        matrixId: approvalMatrixSteps.matrixId,
        stepOrder: approvalMatrixSteps.stepOrder,
        label: approvalMatrixSteps.label,
        nodeId: approvalMatrixSteps.nodeId,
        nodeLabel: orgChartNodes.label,
        nodeApprovalRole: orgChartNodes.approvalRole,
        fallbackNodeId: approvalMatrixSteps.fallbackNodeId,
        fallbackNodeLabel: fallbackStepNodes.label,
        escalationNodeId: approvalMatrixSteps.escalationNodeId,
        escalationNodeLabel: escalationStepNodes.label,
        approvalMode: approvalMatrixSteps.approvalMode,
        slaHours: approvalMatrixSteps.slaHours,
        canDelegate: approvalMatrixSteps.canDelegate,
        isRequired: approvalMatrixSteps.isRequired,
      })
      .from(approvalMatrixSteps)
      .leftJoin(orgChartNodes, eq(approvalMatrixSteps.nodeId, orgChartNodes.id))
      .leftJoin(fallbackStepNodes, eq(fallbackStepNodes.id, approvalMatrixSteps.fallbackNodeId))
      .leftJoin(escalationStepNodes, eq(escalationStepNodes.id, approvalMatrixSteps.escalationNodeId))
      .orderBy(asc(approvalMatrixSteps.matrixId), asc(approvalMatrixSteps.stepOrder), asc(approvalMatrixSteps.id)),
  ]);

  const stepsByMatrixId = new Map<number, ApprovalMatrixStep[]>();
  for (const step of steps) {
    const list = stepsByMatrixId.get(step.matrixId) ?? [];
    list.push({
      ...step,
      nodeId: step.nodeId ?? null,
      nodeLabel: step.nodeLabel ?? null,
      nodeApprovalRole: step.nodeApprovalRole ?? null,
      fallbackNodeId: step.fallbackNodeId ?? null,
      fallbackNodeLabel: step.fallbackNodeLabel ?? null,
      escalationNodeId: step.escalationNodeId ?? null,
      escalationNodeLabel: step.escalationNodeLabel ?? null,
    });
    stepsByMatrixId.set(step.matrixId, list);
  }

  return matrices.map((matrix) => ({
    ...matrix,
    structureId: matrix.structureId ?? null,
    structureName: matrix.structureName ?? null,
    siteId: matrix.siteId ?? null,
    siteName: matrix.siteName ?? null,
    departmentId: matrix.departmentId ?? null,
    departmentName: matrix.departmentName ?? null,
    sectionId: matrix.sectionId ?? null,
    sectionName: matrix.sectionName ?? null,
    requesterPositionId: matrix.requesterPositionId ?? null,
    requesterPositionName: matrix.requesterPositionName ?? null,
    effectiveTo: matrix.effectiveTo ?? null,
    steps: stepsByMatrixId.get(matrix.id) ?? [],
  }));
}

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
      approvalLevel: sql<number>`coalesce(count(case when ${orgChartNodes.canApprove} then 1 end), 0)::int`,
    })
    .from(orgChartStructures)
    .leftJoin(orgChartNodes, eq(orgChartStructures.id, orgChartNodes.structureId))
    .where(eq(orgChartStructures.isActive, true))
    .groupBy(orgChartStructures.id, orgChartStructures.name, orgChartStructures.scopeType)
    .orderBy(asc(orgChartStructures.name));

  return rows;
}
