"use server";

import { db } from "@/db";
import { employees, hrDepartments, hrEmployees, hrOrgNodes, hrPositions, hrSections, hrSites, hrWorkLocations, sites } from "@/db/schema/hero";
import { user } from "@/db/schema/auth";
import { asc, eq, inArray, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type OrgChartNode = Awaited<ReturnType<typeof getOrgChartData>>[number];

export async function getOrgChartData() {
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
    })
    .from(hrOrgNodes)
    .leftJoin(hrDepartments, eq(hrOrgNodes.departmentId, hrDepartments.id))
    .leftJoin(hrSections, eq(hrOrgNodes.sectionId, hrSections.id))
    .leftJoin(hrSites, eq(hrOrgNodes.siteId, hrSites.id))
    .leftJoin(hrWorkLocations, eq(hrOrgNodes.workLocationId, hrWorkLocations.id))
    .where(eq(hrOrgNodes.isActive, true))
    .orderBy(asc(hrOrgNodes.hierarchyLevel), asc(hrOrgNodes.name));

  const orgNodeIds = new Set(nodes.map((n) => n.id));

  const employeeRows = await db
    .select({
      id: hrEmployees.id,
      employeeId: hrEmployees.employeeId,
      fullName: hrEmployees.fullName,
      orgNodeId: hrEmployees.orgNodeId,
      positionName: hrPositions.rankName,
      levelName: sql<string>`coalesce(${hrPositions.levelName}, ${employees.levelName}, 'Staff')`.as('level_name'),
      email: hrEmployees.email,
      departmentName: hrDepartments.name,
      sectionName: hrSections.name,
      departmentId: hrEmployees.departmentId,
      sectionId: hrEmployees.sectionId,
      siteId: hrEmployees.siteId,
      workLocationId: hrEmployees.workLocationId,
      positionId: hrEmployees.positionId,
      siteName: hrSites.name,
      workLocationName: hrWorkLocations.name,
    })
    .from(hrEmployees)
    .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .leftJoin(hrSections, eq(hrEmployees.sectionId, hrSections.id))
    .leftJoin(hrSites, eq(hrEmployees.siteId, hrSites.id))
    .leftJoin(hrWorkLocations, eq(hrEmployees.workLocationId, hrWorkLocations.id))
    .leftJoin(employees, or(eq(employees.authUserId, hrEmployees.authUserId), eq(employees.employeeSn, hrEmployees.employeeId)))
    .where(eq(hrEmployees.isActive, true));

  // Build virtual department+section nodes for employees not assigned to any org node
  const unassigned = employeeRows.filter((e) => !e.orgNodeId || !orgNodeIds.has(e.orgNodeId));
  const deptGroup = new Map<string, typeof employeeRows>();
  for (const emp of unassigned) {
    const key = `${emp.departmentId ?? 0}_${emp.sectionId ?? 0}`;
    if (!deptGroup.has(key)) deptGroup.set(key, []);
    deptGroup.get(key)!.push(emp);
  }

  // Get all unique departments/sections that have unassigned employees
  const deptIds = [...new Set(unassigned.map((e) => e.departmentId).filter(Boolean))];
  const sectIds = [...new Set(unassigned.map((e) => e.sectionId).filter(Boolean))];
  const [allDepts, allSects] = await Promise.all([
    deptIds.length ? db.select().from(hrDepartments).where(inArray(hrDepartments.id, deptIds as number[])) : [],
    sectIds.length ? db.select().from(hrSections).where(inArray(hrSections.id, sectIds as number[])) : [],
  ]);
  const deptMap = new Map(allDepts.map((d) => [d.id, d]));
  const sectMap = new Map(allSects.map((s) => [s.id, s]));

  // Build virtual nodes per department
  const virtualNodes: typeof nodes = [];
  const virtualEmployees = new Map<number, typeof employeeRows>();
  let virtualId = -1000000000;
  for (const [key, emps] of deptGroup) {
    const first = emps[0];
    const dept = first.departmentId ? deptMap.get(first.departmentId) : null;
    const sect = first.sectionId ? sectMap.get(first.sectionId) : null;
    virtualId--;

    const parentDeptNode = nodes.find((n) => n.departmentId === first.departmentId && n.nodeType?.toLowerCase().includes('department'));
    let parentId = parentDeptNode?.id ?? null;

    // If department node doesn't exist, create virtual department
    if (!parentDeptNode && dept) {
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
      });
      parentId = deptVirtualId;
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
    });
    virtualEmployees.set(virtualId, emps as any);
  }

  const allNodes = [...nodes, ...virtualNodes];

  const employeesByNode = new Map<number, typeof employeeRows>();
  for (const employee of employeeRows) {
    const nodeId = employee.orgNodeId && orgNodeIds.has(employee.orgNodeId) ? employee.orgNodeId : null;
    if (nodeId) {
      if (!employeesByNode.has(nodeId)) employeesByNode.set(nodeId, []);
      employeesByNode.get(nodeId)!.push(employee);
    }
  }
  // Also add virtual node assignments
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

export async function getOrgChartStats() {
  const nodes = await getOrgChartData();
  return {
    totalNodes: nodes.length,
    totalEmployeesAssigned: nodes.reduce((sum, node) => sum + node.employeeCount, 0),
    departments: new Set(nodes.map((node) => node.departmentName).filter(Boolean)).size,
    rootNodes: nodes.filter((node) => node.parentNodeId == null).length,
  };
}

// Helper: calculate hierarchy level and path
async function calculateHierarchy(nodeId: number, parentId: number | null) {
  if (!parentId) {
    return { level: 0, path: `/${nodeId}/` };
  }

  const [parent] = await db
    .select({ hierarchyLevel: hrOrgNodes.hierarchyLevel, pathText: hrOrgNodes.pathText })
    .from(hrOrgNodes)
    .where(eq(hrOrgNodes.id, parentId))
    .limit(1);

  if (!parent) {
    return { level: 0, path: `/${nodeId}/` };
  }

  return {
    level: parent.hierarchyLevel + 1,
    path: `${parent.pathText}${nodeId}/`,
  };
}

// Helper: check for circular reference
async function wouldCreateCircularRef(nodeId: number, newParentId: number | null): Promise<boolean> {
  if (!newParentId) return false;
  if (nodeId === newParentId) return true;

  const [node] = await db
    .select({ pathText: hrOrgNodes.pathText })
    .from(hrOrgNodes)
    .where(eq(hrOrgNodes.id, nodeId))
    .limit(1);

  if (!node) return false;

  const [parent] = await db
    .select({ pathText: hrOrgNodes.pathText })
    .from(hrOrgNodes)
    .where(eq(hrOrgNodes.id, newParentId))
    .limit(1);

  if (!parent) return false;

  return parent.pathText.includes(`/${nodeId}/`);
}

// Update node parent (for drag-drop reparenting)
export async function updateOrgNodeParent(nodeId: number, newParentId: number | null) {
  try {
    if (await wouldCreateCircularRef(nodeId, newParentId)) {
      return { success: false, message: "Circular reference detected. Node tidak bisa menjadi child dari descendantnya." };
    }

    const hierarchy = await calculateHierarchy(nodeId, newParentId);

    await db
      .update(hrOrgNodes)
      .set({
        parentNodeId: newParentId,
        hierarchyLevel: hierarchy.level,
        pathText: hierarchy.path,
        updatedAt: new Date(),
      })
      .where(eq(hrOrgNodes.id, nodeId));

    // Recalculate hierarchy for all descendants
    const descendants = await db
      .select({ id: hrOrgNodes.id })
      .from(hrOrgNodes)
      .where(sql`${hrOrgNodes.pathText} LIKE ${`%/${nodeId}/%`}`);

    for (const desc of descendants) {
      const [parent] = await db
        .select({ id: hrOrgNodes.id, parentNodeId: hrOrgNodes.parentNodeId })
        .from(hrOrgNodes)
        .where(eq(hrOrgNodes.id, desc.id))
        .limit(1);

      if (parent?.parentNodeId) {
        const descHierarchy = await calculateHierarchy(desc.id, parent.parentNodeId);
        await db
          .update(hrOrgNodes)
          .set({
            hierarchyLevel: descHierarchy.level,
            pathText: descHierarchy.path,
            updatedAt: new Date(),
          })
          .where(eq(hrOrgNodes.id, desc.id));
      }
    }

    revalidatePath("/dashboard/hc/org-chart");
    return { success: true, message: "Node berhasil dipindahkan." };
  } catch (error) {
    console.error("updateOrgNodeParent error:", error);
    return { success: false, message: "Gagal memindahkan node." };
  }
}

// Create new node
export async function createOrgNode(data: {
  code: string;
  name: string;
  nodeType: string;
  parentNodeId: number | null;
  departmentId?: number | null;
  sectionId?: number | null;
  siteId?: number | null;
}) {
  try {
    const hierarchy = await calculateHierarchy(0, data.parentNodeId);

    const [newNode] = await db
      .insert(hrOrgNodes)
      .values({
        code: data.code,
        name: data.name,
        nodeType: data.nodeType,
        parentNodeId: data.parentNodeId,
        departmentId: data.departmentId ?? null,
        sectionId: data.sectionId ?? null,
        siteId: data.siteId ?? null,
        hierarchyLevel: hierarchy.level,
        pathText: "", // Will update after we get ID
        isActive: true,
      })
      .returning();

    // Update pathText with actual ID
    const actualPath = data.parentNodeId
      ? (await calculateHierarchy(newNode.id, data.parentNodeId)).path
      : `/${newNode.id}/`;

    await db
      .update(hrOrgNodes)
      .set({ pathText: actualPath })
      .where(eq(hrOrgNodes.id, newNode.id));

    revalidatePath("/dashboard/hc/org-chart");
    return { success: true, message: "Node berhasil dibuat.", node: newNode };
  } catch (error) {
    console.error("createOrgNode error:", error);
    return { success: false, message: "Gagal membuat node." };
  }
}

// Update node properties
export async function updateOrgNode(
  id: number,
  data: {
    name?: string;
    nodeType?: string;
    departmentId?: number | null;
    sectionId?: number | null;
    siteId?: number | null;
  }
) {
  try {
    await db
      .update(hrOrgNodes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(hrOrgNodes.id, id));

    revalidatePath("/dashboard/hc/org-chart");
    return { success: true, message: "Node berhasil diupdate." };
  } catch (error) {
    console.error("updateOrgNode error:", error);
    return { success: false, message: "Gagal mengupdate node." };
  }
}

// Delete node (soft delete)
export async function deleteOrgNode(id: number) {
  try {
    // Check if node has children
    const children = await db
      .select({ id: hrOrgNodes.id })
      .from(hrOrgNodes)
      .where(eq(hrOrgNodes.parentNodeId, id))
      .limit(1);

    if (children.length > 0) {
      return { success: false, message: "Node memiliki child nodes. Hapus atau pindahkan child nodes terlebih dahulu." };
    }

    // Check if node has assigned employees
    const employees = await db
      .select({ id: hrEmployees.id })
      .from(hrEmployees)
      .where(eq(hrEmployees.orgNodeId, id))
      .limit(1);

    if (employees.length > 0) {
      return { success: false, message: "Node memiliki karyawan assigned. Pindahkan karyawan terlebih dahulu." };
    }

    await db
      .update(hrOrgNodes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(hrOrgNodes.id, id));

    revalidatePath("/dashboard/hc/org-chart");
    return { success: true, message: "Node berhasil dihapus." };
  } catch (error) {
    console.error("deleteOrgNode error:", error);
    return { success: false, message: "Gagal menghapus node." };
  }
}

export async function updateOrgChartEmployeeAssignment(employeeId: number, orgNodeId: number) {
  try {
    const nodeDefaults = await getOrgNodeEmployeeDefaults(orgNodeId);

    if (!nodeDefaults) {
      return { success: false, message: "Node tujuan tidak ditemukan." };
    }

    const [updatedEmployee] = await db
      .update(hrEmployees)
      .set({
        orgNodeId,
        departmentId: nodeDefaults.departmentId,
        sectionId: nodeDefaults.sectionId,
        siteId: nodeDefaults.siteId,
        workLocationId: nodeDefaults.workLocationId,
        updatedAt: new Date(),
      })
      .where(eq(hrEmployees.id, employeeId))
      .returning({
        id: hrEmployees.id,
        authUserId: hrEmployees.authUserId,
        employeeId: hrEmployees.employeeId,
        fullName: hrEmployees.fullName,
        email: hrEmployees.email,
        departmentId: hrEmployees.departmentId,
        sectionId: hrEmployees.sectionId,
        siteId: hrEmployees.siteId,
        workLocationId: hrEmployees.workLocationId,
        positionId: hrEmployees.positionId,
        orgNodeId: hrEmployees.orgNodeId,
      });

    if (!updatedEmployee) {
      return { success: false, message: "Karyawan tidak ditemukan." };
    }

    await syncOrgChartEmployeeToOperationalEmployee(updatedEmployee);

    revalidateOrgChartEmployeeSurfaces();
    return { success: true, message: "Karyawan berhasil dipindahkan dan metadata attendance disync." };
  } catch (error) {
    console.error("updateOrgChartEmployeeAssignment error:", error);
    return { success: false, message: "Gagal memindahkan karyawan." };
  }
}

async function getOrgNodeEmployeeDefaults(orgNodeId: number) {
  const [targetNode] = await db
    .select({ id: hrOrgNodes.id, pathText: hrOrgNodes.pathText })
    .from(hrOrgNodes)
    .where(eq(hrOrgNodes.id, orgNodeId))
    .limit(1);

  if (!targetNode) return null;

  const pathIds = targetNode.pathText
    .split("/")
    .map((part) => Number(part))
    .filter((id) => Number.isFinite(id) && id > 0);

  const scopedIds = pathIds.includes(orgNodeId) ? pathIds : [...pathIds, orgNodeId];
  const pathNodes = scopedIds.length
    ? await db
        .select({
          id: hrOrgNodes.id,
          departmentId: hrOrgNodes.departmentId,
          sectionId: hrOrgNodes.sectionId,
          siteId: hrOrgNodes.siteId,
          workLocationId: hrOrgNodes.workLocationId,
        })
        .from(hrOrgNodes)
        .where(inArray(hrOrgNodes.id, scopedIds))
    : [];

  const nodeById = new Map(pathNodes.map((node) => [node.id, node]));
  return scopedIds.reduce(
    (defaults, nodeId) => {
      const node = nodeById.get(nodeId);
      if (!node) return defaults;
      return {
        departmentId: node.departmentId ?? defaults.departmentId,
        sectionId: node.sectionId ?? defaults.sectionId,
        siteId: node.siteId ?? defaults.siteId,
        workLocationId: node.workLocationId ?? defaults.workLocationId,
      };
    },
    {
      departmentId: null as number | null,
      sectionId: null as number | null,
      siteId: null as number | null,
      workLocationId: null as number | null,
    }
  );
}

type SyncedOrgChartEmployee = {
  authUserId: string | null;
  employeeId: string;
  fullName: string;
  email: string | null;
  departmentId: number | null;
  sectionId: number | null;
  siteId: number | null;
  workLocationId?: number | null;
  positionId: number | null;
  orgNodeId: number | null;
};

async function syncOrgChartEmployeeToOperationalEmployee(employee: SyncedOrgChartEmployee) {
  const [[department], [section], [position], [hrSite], [workLocation]] = await Promise.all([
    employee.departmentId
      ? db.select({ name: hrDepartments.name }).from(hrDepartments).where(eq(hrDepartments.id, employee.departmentId)).limit(1)
      : Promise.resolve([]),
    employee.sectionId
      ? db.select({ name: hrSections.name }).from(hrSections).where(eq(hrSections.id, employee.sectionId)).limit(1)
      : Promise.resolve([]),
    employee.positionId
      ? db.select({ rankName: hrPositions.rankName, levelName: hrPositions.levelName }).from(hrPositions).where(eq(hrPositions.id, employee.positionId)).limit(1)
      : Promise.resolve([]),
    employee.siteId
      ? db.select({ name: hrSites.name }).from(hrSites).where(eq(hrSites.id, employee.siteId)).limit(1)
      : Promise.resolve([]),
    employee.workLocationId
      ? db.select({ name: hrWorkLocations.name }).from(hrWorkLocations).where(eq(hrWorkLocations.id, employee.workLocationId)).limit(1)
      : Promise.resolve([]),
  ]);

  const [legacySite] = hrSite?.name
    ? await db.select({ id: sites.id }).from(sites).where(eq(sites.name, hrSite.name)).limit(1).catch(() => [])
    : [];

  const roleName = position?.rankName ?? "";
  const legacyUpdate = {
    name: employee.fullName,
    email: employee.email ?? "",
    employeeSn: employee.employeeId,
    departmentId: employee.departmentId,
    sectionId: employee.sectionId,
    positionId: employee.positionId,
    orgNodeId: employee.orgNodeId,
    department: department?.name ?? "",
    section: section?.name ?? "",
    role: roleName,
    jobTitle: roleName,
    workLocation: workLocation?.name ?? hrSite?.name ?? "",
    ...(legacySite?.id ? { siteId: legacySite.id } : {}),
  };

  if (employee.authUserId) {
    await db
      .update(user)
      .set({ name: employee.fullName, email: employee.email ?? "", updatedAt: new Date() })
      .where(eq(user.id, employee.authUserId));

    await db
      .update(employees)
      .set(legacyUpdate)
      .where(
        employee.email
          ? or(
              eq(employees.authUserId, employee.authUserId),
              eq(employees.employeeSn, employee.employeeId),
              eq(employees.email, employee.email)
            )
          : or(eq(employees.authUserId, employee.authUserId), eq(employees.employeeSn, employee.employeeId))
      );
    return;
  }

  await db
    .update(employees)
    .set(legacyUpdate)
    .where(
      employee.email
        ? or(eq(employees.employeeSn, employee.employeeId), eq(employees.email, employee.email))
        : eq(employees.employeeSn, employee.employeeId)
    );
}

function revalidateOrgChartEmployeeSurfaces() {
  revalidatePath("/dashboard/hc/org-chart");
  revalidatePath("/dashboard/hc/employee");
  revalidatePath("/dashboard/security/users");
  revalidatePath("/dashboard/scheduling-timesheet");
  revalidatePath("/dashboard/scheduling-timesheet/attendance");
  revalidatePath("/dashboard/scheduling-timesheet/schedule");
  revalidatePath("/dashboard/scheduling-timesheet/payroll");
}

export async function updateOrgChartEmployeeProfile(
  employeeId: number,
  data: {
    employeeId?: string;
    fullName?: string;
    email?: string | null;
    departmentId?: number | null;
    sectionId?: number | null;
    siteId?: number | null;
    workLocationId?: number | null;
    positionId?: number | null;
    orgNodeId?: number | null;
  }
) {
  try {
    const [updatedEmployee] = await db
      .update(hrEmployees)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(hrEmployees.id, employeeId))
      .returning({
        id: hrEmployees.id,
        authUserId: hrEmployees.authUserId,
        employeeId: hrEmployees.employeeId,
        fullName: hrEmployees.fullName,
        email: hrEmployees.email,
        departmentId: hrEmployees.departmentId,
        sectionId: hrEmployees.sectionId,
        siteId: hrEmployees.siteId,
        workLocationId: hrEmployees.workLocationId,
        positionId: hrEmployees.positionId,
        orgNodeId: hrEmployees.orgNodeId,
      });

    if (!updatedEmployee) {
      return { success: false, message: "Karyawan tidak ditemukan." };
    }

    await syncOrgChartEmployeeToOperationalEmployee(updatedEmployee);
    revalidateOrgChartEmployeeSurfaces();
    return { success: true, message: "Profil karyawan berhasil diupdate dan disync ke User Management." };
  } catch (error) {
    console.error("updateOrgChartEmployeeProfile error:", error);
    return { success: false, message: "Gagal mengupdate profil karyawan." };
  }
}
// Get departments, sections, sites for dropdowns
export async function getOrgNodeReferenceData() {
  const [departments, sections, sites, workLocations, positions] = await Promise.all([
    db.select({ id: hrDepartments.id, name: hrDepartments.name }).from(hrDepartments).where(eq(hrDepartments.isActive, true)).orderBy(asc(hrDepartments.name)),
    db.select({ id: hrSections.id, name: hrSections.name, departmentId: hrSections.departmentId }).from(hrSections).where(eq(hrSections.isActive, true)).orderBy(asc(hrSections.name)),
    db.select({ id: hrSites.id, name: hrSites.name }).from(hrSites).where(eq(hrSites.isActive, true)).orderBy(asc(hrSites.name)),
    db.select({ id: hrWorkLocations.id, name: hrWorkLocations.name }).from(hrWorkLocations).where(eq(hrWorkLocations.isActive, true)).orderBy(asc(hrWorkLocations.name)),
    db.select({ id: hrPositions.id, rankName: hrPositions.rankName, levelName: hrPositions.levelName }).from(hrPositions).where(eq(hrPositions.isActive, true)).orderBy(asc(hrPositions.levelName), asc(hrPositions.rankName)),
  ]);

  return { departments, sections, sites, workLocations, positions };
}
