"use server";

import { db } from "@/db";
import {
  employees,
  hrDepartments,
  hrOrgNodes,
  hrPositions,
  hrSections,
  hrSites,
  hrWorkLocations,
  masterDepartments,
  masterSections,
  masterLevelStaff,
  sites,
} from "@/db/schema/hero";
import { asc, eq, sql, inArray } from "drizzle-orm";

export type OrgChartV2Node = {
  id: number;
  code: string;
  parentNodeId: number | null;
  nodeType: string;
  name: string;
  hierarchyLevel: number;
  departmentName: string | null;
  sectionName: string | null;
  siteName: string | null;
  workLocationName: string | null;
  departmentId: number | null;
  sectionId: number | null;
  siteId: number | null;
  workLocationId: number | null;
  employeeCount: number;
  employees: Array<{
    id: number;
    employeeId: string;
    fullName: string;
    orgNodeId: number | null;
    positionName: string | null;
    levelName: string | null;
    email: string | null;
    departmentName: string | null;
    sectionName: string | null;
    departmentId: number | null;
    sectionId: number | null;
    siteId: number | null;
    workLocationId: number | null;
    positionId: number | null;
    siteName: string | null;
    workLocationName: string | null;
    isVirtual?: boolean;
  }>;
};

export type MasterDataHead = {
  departmentId: number;
  departmentName: string;
  departmentHeadId: number | null;
  departmentHeadName: string | null;
  sectionId: number;
  sectionName: string;
  sectionHeadId: number | null;
  sectionHeadName: string | null;
};

export type OrgChartV2Stats = {
  totalNodes: number;
  totalEmployeesAssigned: number;
  departments: number;
  sections: number;
  rootNodes: number;
};

export type OrgChartV2ReferenceData = {
  departments: Array<{ id: number; name: string; headEmployeeId: number | null; headEmployeeName: string | null }>;
  sections: Array<{ id: number; name: string; departmentId: number | null; parentId: number | null; headEmployeeId: number | null; headEmployeeName: string | null }>;
  sites: Array<{ id: number; name: string }>;
  workLocations: Array<{ id: number; name: string }>;
  positions: Array<{ id: number; rankName: string; levelName: string }>;
  levelStaffs: Array<{ name: string; sortOrder: number }>;
};

async function resolveHeadName(headEmployeeId: number | null): Promise<string | null> {
  if (!headEmployeeId) return null;
  const [row] = await db
    .select({ name: employees.name })
    .from(employees)
    .where(eq(employees.id, headEmployeeId))
    .limit(1);
  return row?.name ?? null;
}

export async function getOrgChartV2Data(): Promise<OrgChartV2Node[]> {
  // 1. Fetch real org nodes
  const nodes = await db
    .select({
      id: hrOrgNodes.id,
      code: hrOrgNodes.code,
      parentNodeId: hrOrgNodes.parentNodeId,
      nodeType: hrOrgNodes.nodeType,
      name: hrOrgNodes.name,
      hierarchyLevel: hrOrgNodes.hierarchyLevel,
      pathText: hrOrgNodes.pathText,
      isActive: hrOrgNodes.isActive,
      departmentName: hrDepartments.name,
      sectionName: hrSections.name,
      siteName: hrSites.name,
      workLocationName: hrWorkLocations.name,
      departmentId: hrOrgNodes.departmentId,
      sectionId: hrOrgNodes.sectionId,
      siteId: hrOrgNodes.siteId,
      workLocationId: hrOrgNodes.workLocationId,
    })
    .from(hrOrgNodes)
    .leftJoin(hrDepartments, eq(hrOrgNodes.departmentId, hrDepartments.id))
    .leftJoin(hrSections, eq(hrOrgNodes.sectionId, hrSections.id))
    .leftJoin(hrSites, eq(hrOrgNodes.siteId, hrSites.id))
    .leftJoin(hrWorkLocations, eq(hrOrgNodes.workLocationId, hrWorkLocations.id))
    .where(eq(hrOrgNodes.isActive, true))
    .orderBy(asc(hrOrgNodes.hierarchyLevel), asc(hrOrgNodes.name));

  const orgNodeIds = new Set(nodes.map((n) => n.id));

  // 2. Fetch employees from User Management (hero_employees)
  const employeeRows = await db
    .select({
      id: employees.id,
      employeeId: employees.employeeSn,
      fullName: employees.name,
      orgNodeId: employees.orgNodeId,
      positionName: hrPositions.rankName,
      levelName: sql<string>`coalesce(${hrPositions.levelName}, ${employees.levelName}, 'Staff')`.as('level_name'),
      email: employees.email,
      departmentName: masterDepartments.name,
      sectionName: masterSections.name,
      departmentId: employees.departmentId,
      sectionId: employees.sectionId,
      siteId: employees.siteId,
      workLocationId: sql<number>`null::integer`.as('work_location_id'),
      positionId: employees.positionId,
      siteName: sites.name,
      workLocationName: sql<string>`null::text`.as('work_location_name'),
    })
    .from(employees)
    .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .where(eq(employees.isActive, true));

  // Deduplicate
  const seenEmpIds = new Set<number>();
  const employeeRowsUnique = employeeRows.filter((e) => {
    if (seenEmpIds.has(e.id)) return false;
    seenEmpIds.add(e.id);
    return true;
  });

  // 3. Build virtual department+section nodes for unassigned employees
  const unassigned = employeeRowsUnique.filter((e) => {
    if (!e.orgNodeId || !orgNodeIds.has(e.orgNodeId)) return true;
    const assignedNode = nodes.find((n) => n.id === e.orgNodeId);
    if (assignedNode && assignedNode.nodeType === 'department' && e.sectionId) {
      const hasRealSection = nodes.some((n) => n.parentNodeId === assignedNode.id && n.sectionId === e.sectionId);
      return !hasRealSection;
    }
    return false;
  });

  const deptGroup = new Map<string, typeof employeeRowsUnique>();
  for (const emp of unassigned) {
    const key = `${emp.departmentId ?? 0}_${emp.sectionId ?? 0}`;
    if (!deptGroup.has(key)) deptGroup.set(key, []);
    deptGroup.get(key)!.push(emp);
  }

  const deptIds = [...new Set(unassigned.map((e) => e.departmentId).filter(Boolean))];
  const sectIds = [...new Set(unassigned.map((e) => e.sectionId).filter(Boolean))];
  const [allDepts, allSects] = await Promise.all([
    deptIds.length ? db.select().from(hrDepartments).where(inArray(hrDepartments.id, deptIds as number[])) : [],
    sectIds.length ? db.select().from(hrSections).where(inArray(hrSections.id, sectIds as number[])) : [],
  ]);
  const deptMap = new Map(allDepts.map((d) => [d.id, d]));
  const sectMap = new Map(allSects.map((s) => [s.id, s]));

  const virtualNodes: typeof nodes = [];
  const virtualEmployees = new Map<number, typeof employeeRowsUnique>();
  const virtualDeptIdByDeptId = new Map<number, number>();
  let virtualId = -1000000000;

  for (const [, emps] of deptGroup) {
    const first = emps[0];
    const dept = first.departmentId ? deptMap.get(first.departmentId) : null;
    const sect = first.sectionId ? sectMap.get(first.sectionId) : null;
    virtualId--;

    const realDeptNode = nodes.find((n) => n.departmentId === first.departmentId && n.nodeType?.toLowerCase().includes('department'));
    let parentId = realDeptNode?.id ?? null;

    if (!realDeptNode && dept) {
      if (first.departmentId && virtualDeptIdByDeptId.has(first.departmentId)) {
        parentId = virtualDeptIdByDeptId.get(first.departmentId)!;
      } else {
        const deptVirtualId = virtualId--;
        virtualNodes.push({
          id: deptVirtualId,
          code: `AUTO_${dept.name.replace(/[^a-zA-Z0-9]/g, '_')}`,
          parentNodeId: null,
          nodeType: 'department',
          name: dept.name,
          hierarchyLevel: 0,
          pathText: `/${deptVirtualId}/`,
          isActive: true,
          departmentName: dept.name,
          sectionName: null,
          siteName: null,
          workLocationName: null,
          departmentId: dept.id,
          sectionId: null,
          siteId: null,
          workLocationId: null,
        });
        if (first.departmentId) virtualDeptIdByDeptId.set(first.departmentId, deptVirtualId);
        parentId = deptVirtualId;
      }
    }

    virtualNodes.push({
      id: virtualId,
      code: `AUTO_${(sect?.name ?? dept?.name ?? 'unknown').replace(/[^a-zA-Z0-9]/g, '_')}`,
      parentNodeId: parentId,
      nodeType: sect ? 'section' : 'department',
      name: sect?.name ?? dept?.name ?? 'Unknown',
      hierarchyLevel: parentId ? 1 : 0,
      pathText: parentId ? `/${parentId}/${virtualId}/` : `/${virtualId}/`,
      isActive: true,
      departmentName: dept?.name ?? null,
      sectionName: sect?.name ?? null,
      siteName: null,
      workLocationName: null,
      departmentId: first.departmentId,
      sectionId: first.sectionId,
      siteId: null,
      workLocationId: null,
    });
    virtualEmployees.set(virtualId, emps as any);
  }

  const allNodes = [...nodes, ...virtualNodes];

  const employeesByNode = new Map<number, typeof employeeRowsUnique>();
  for (const employee of employeeRowsUnique) {
    const nodeId = employee.orgNodeId && orgNodeIds.has(employee.orgNodeId) ? employee.orgNodeId : null;
    if (nodeId) {
      if (!employeesByNode.has(nodeId)) employeesByNode.set(nodeId, []);
      employeesByNode.get(nodeId)!.push(employee);
    }
  }
  for (const [vnId, vnEmps] of virtualEmployees) {
    if (vnEmps.length > 0) {
      employeesByNode.set(vnId, vnEmps);
    }
  }

  return allNodes.map((node) => ({
    ...node,
    employees: employeesByNode.get(node.id) ?? [],
    employeeCount: employeesByNode.get(node.id)?.length ?? 0,
  }));
}

export async function getOrgChartV2Stats(): Promise<OrgChartV2Stats> {
  const nodes = await getOrgChartV2Data();
  // Count unique employees across all nodes (deduplicate)
  const uniqueEmpIds = new Set<number>();
  for (const node of nodes) {
    for (const emp of node.employees) {
      uniqueEmpIds.add(emp.id);
    }
  }
  return {
    totalNodes: nodes.length,
    totalEmployeesAssigned: uniqueEmpIds.size,
    departments: new Set(nodes.map((node) => node.departmentName).filter(Boolean)).size,
    sections: new Set(nodes.map((node) => node.sectionName).filter(Boolean)).size,
    rootNodes: nodes.filter((node) => node.parentNodeId == null).length,
  };
}

// Fetch ALL active employees (independent of org nodes) for executive lookup
export async function getOrgChartV2AllEmployees() {
  return db
    .select({
      id: employees.id,
      employeeId: employees.employeeSn,
      fullName: employees.name,
      orgNodeId: employees.orgNodeId,
      positionName: hrPositions.rankName,
      levelName: sql<string>`coalesce(${hrPositions.levelName}, ${employees.levelName}, 'Staff')`.as('level_name'),
      email: employees.email,
      departmentName: masterDepartments.name,
      sectionName: masterSections.name,
      departmentId: employees.departmentId,
      sectionId: employees.sectionId,
      siteId: employees.siteId,
      workLocationId: sql<number>`null::integer`.as('work_location_id'),
      positionId: employees.positionId,
      siteName: sites.name,
      workLocationName: sql<string>`null::text`.as('work_location_name'),
    })
    .from(employees)
    .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .where(eq(employees.isActive, true));
}

export async function getOrgChartV2ReferenceData(): Promise<OrgChartV2ReferenceData> {
  const [departmentsRaw, sectionsRaw, sitesData, workLocs, positions, levelStaff] = await Promise.all([
    db.select().from(masterDepartments).where(eq(masterDepartments.isActive, true)).orderBy(asc(masterDepartments.name)),
    db.select().from(masterSections).where(eq(masterSections.isActive, true)).orderBy(asc(masterSections.name)),
    db.select().from(hrSites).where(eq(hrSites.isActive, true)).orderBy(asc(hrSites.name)),
    db.select().from(hrWorkLocations).where(eq(hrWorkLocations.isActive, true)).orderBy(asc(hrWorkLocations.name)),
    db.select().from(hrPositions).where(eq(hrPositions.isActive, true)).orderBy(asc(hrPositions.rankName)),
    db.select().from(masterLevelStaff).where(eq(masterLevelStaff.isActive, true)).orderBy(asc(masterLevelStaff.sortOrder)),
  ]);

  // Resolve head names for departments
  const departments = await Promise.all(
    departmentsRaw.map(async (d) => ({
      id: d.id,
      name: d.name,
      headEmployeeId: d.headEmployeeId,
      headEmployeeName: d.headEmployeeId ? await resolveHeadName(d.headEmployeeId) : null,
    }))
  );

  // Resolve head names for sections
  const sections = await Promise.all(
    sectionsRaw.map(async (s) => ({
      id: s.id,
      name: s.name,
      departmentId: s.departmentId,
      parentId: s.parentId,
      headEmployeeId: s.headEmployeeId,
      headEmployeeName: s.headEmployeeId ? await resolveHeadName(s.headEmployeeId) : null,
    }))
  );

  return {
    departments,
    sections,
    sites: sitesData.map((s) => ({ id: s.id, name: s.name })),
    workLocations: workLocs.map((w) => ({ id: w.id, name: w.name })),
    positions: positions.map((p) => ({ id: p.id, rankName: p.rankName, levelName: p.levelName })),
    levelStaffs: levelStaff.map((l) => ({ name: l.name, sortOrder: l.sortOrder })),
  };
}
