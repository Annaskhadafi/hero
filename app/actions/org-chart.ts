"use server";

import { db } from "@/db";
import { employees, hrDepartments, hrOrgNodes, hrPositions, hrSections, masterLevelStaff, sites, masterDepartments, masterSections } from "@/db/schema/hero";
import { user } from "@/db/schema/auth";
import { asc, eq, inArray, or, sql, and } from "drizzle-orm";
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
      siteName: sites.name,
      workLocationName: sql<string | null>`null`.as('work_location_name'),
      departmentId: hrOrgNodes.departmentId,
      sectionId: hrOrgNodes.sectionId,
      siteId: hrOrgNodes.siteId,
      workLocationId: hrOrgNodes.workLocationId,
    })
    .from(hrOrgNodes)
    .leftJoin(hrDepartments, eq(hrOrgNodes.departmentId, hrDepartments.id))
    .leftJoin(hrSections, eq(hrOrgNodes.sectionId, hrSections.id))
    .leftJoin(sites, eq(hrOrgNodes.siteId, sites.id))
    .where(eq(hrOrgNodes.isActive, true))
    .orderBy(asc(hrOrgNodes.hierarchyLevel), asc(hrOrgNodes.name));

  const orgNodeIds = new Set(nodes.map((n) => n.id));

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
      workLocationId: sql<string | null>`null`.as('work_location_id'),
      positionId: employees.positionId,
      siteName: sites.name,
      workLocationName: sql<string | null>`null`.as('work_location_name'),
    })
    .from(employees)
    .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .where(eq(employees.isActive, true));

  // Deduplicate: the OR join on `employees` table can produce multiple rows
  // for the same hrEmployee when both authUserId AND employeeSn match.
  const seenEmpIds = new Set<number>();
  const employeeRowsUnique = employeeRows.filter((e) => {
    if (seenEmpIds.has(e.id)) return false;
    seenEmpIds.add(e.id);
    return true;
  });

  // Build virtual department+section nodes for employees not assigned to any org node
  // or assigned to a department node but belong to a section that has no real section node under it
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
  const virtualEmployees = new Map<number, typeof employeeRowsUnique>();
  // Cache: departmentId → virtualDeptNode.id (so multiple sections share one parent)
  const virtualDeptIdByDeptId = new Map<number, number>();
  let virtualId = -1000000000;

  for (const [, emps] of deptGroup) {
    const first = emps[0];
    const dept = first.departmentId ? deptMap.get(first.departmentId) : null;
    const sect = first.sectionId ? sectMap.get(first.sectionId) : null;
    virtualId--;

    // Look for a real department node first, then a previously-created virtual one
    const realDeptNode = nodes.find((n) => n.departmentId === first.departmentId && n.nodeType?.toLowerCase().includes('department'));
    let parentId = realDeptNode?.id ?? null;

    if (!realDeptNode && dept) {
      if (first.departmentId && virtualDeptIdByDeptId.has(first.departmentId)) {
        // Reuse the virtual dept node already created for this department
        parentId = virtualDeptIdByDeptId.get(first.departmentId)!;
      } else {
        // Create a new virtual department node (only once per dept)
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

export async function materializeOrgVirtualNode(data: {
  name: string;
  nodeType: string;
  parentNodeId: number | null;
  departmentId?: number | null;
  sectionId?: number | null;
  siteId?: number | null;
  workLocationId?: number | null;
  employeeIds: number[];
}) {
  try {
    const safeCode = data.name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "ORG_NODE";
    const hierarchy = await calculateHierarchy(0, data.parentNodeId);

    const [newNode] = await db
      .insert(hrOrgNodes)
      .values({
        code: `ORG_${safeCode}_${Date.now()}`,
        name: data.name,
        nodeType: data.nodeType.replace(/_virtual$/i, "") || "section",
        parentNodeId: (data.parentNodeId && data.parentNodeId > 0) ? data.parentNodeId : null,
        departmentId: data.departmentId ?? null,
        sectionId: (data.nodeType.replace(/_virtual$/i, "").toLowerCase() === "department" || data.nodeType.replace(/_virtual$/i, "").toLowerCase() === "company" || data.nodeType.replace(/_virtual$/i, "").toLowerCase().includes("bod")) ? null : (data.sectionId ?? null),
        siteId: data.siteId ?? null,
        workLocationId: (data.nodeType.replace(/_virtual$/i, "").toLowerCase().includes("location") || data.nodeType.replace(/_virtual$/i, "").toLowerCase().includes("site")) ? (data.workLocationId ?? null) : null,
        hierarchyLevel: hierarchy.level,
        pathText: "",
        isActive: true,
      })
      .returning({ id: hrOrgNodes.id });

    const actualPath = data.parentNodeId
      ? (await calculateHierarchy(newNode.id, data.parentNodeId)).path
      : `/${newNode.id}/`;

    await db.update(hrOrgNodes).set({ pathText: actualPath }).where(eq(hrOrgNodes.id, newNode.id));

    const employeeIds = Array.from(new Set(data.employeeIds.filter((id) => Number.isFinite(id) && id > 0)));
    if (employeeIds.length > 0) {
      const updatedEmployees = await db
        .update(employees)
        .set({ orgNodeId: newNode.id })
        .where(inArray(employees.id, employeeIds))
        .returning({
          id: employees.id,
          authUserId: employees.authUserId,
          employeeId: employees.employeeSn,
          fullName: employees.name,
          email: employees.email,
          departmentId: employees.departmentId,
          sectionId: employees.sectionId,
          siteId: employees.siteId,
          workLocationId: sql<string | null>`null`.as('work_location_id'),
          positionId: employees.positionId,
          orgNodeId: employees.orgNodeId,
        });

      for (const employee of updatedEmployees) {
        await syncOrgChartEmployeeToOperationalEmployee(employee);
      }
    }

    revalidateOrgChartEmployeeSurfaces();
    return { success: true, message: "Node virtual berhasil dijadikan node real dan dipindahkan.", nodeId: newNode.id };
  } catch (error) {
    console.error("materializeOrgVirtualNode error:", error);
    return { success: false, message: "Gagal memindahkan node virtual." };
  }
}

type VirtualOrgNodePayload = {
  id: number;
  name: string;
  nodeType: string;
  parentNodeId: number | null;
  departmentId?: number | null;
  sectionId?: number | null;
  siteId?: number | null;
  workLocationId?: number | null;
  employeeIds: number[];
};

export async function materializeAndMoveOrgVirtualNode(data: {
  source: VirtualOrgNodePayload;
  target: VirtualOrgNodePayload | null;
  fallbackParentNodeId: number | null;
}) {
  try {
    let parentNodeId = data.fallbackParentNodeId;

    if (data.target) {
      const targetResult = await createRealOrgNodeFromVirtual(data.target, data.fallbackParentNodeId);
      if (!targetResult.success || !targetResult.nodeId) {
        return { success: false, message: "Gagal membuat target node real." };
      }
      parentNodeId = targetResult.nodeId;
    }

    const sourceResult = await createRealOrgNodeFromVirtual(data.source, parentNodeId);
    if (!sourceResult.success || !sourceResult.nodeId) {
      return { success: false, message: "Gagal membuat source node real." };
    }

    revalidateOrgChartEmployeeSurfaces();
    return { success: true, message: "Node virtual berhasil dipindahkan ke target." };
  } catch (error) {
    console.error("materializeAndMoveOrgVirtualNode error:", error);
    return { success: false, message: "Gagal memindahkan node virtual." };
  }
}

export async function materializeTargetAndMoveOrgNode(data: {
  nodeId: number;
  target: VirtualOrgNodePayload;
  fallbackParentNodeId: number | null;
}) {
  try {
    const targetResult = await createRealOrgNodeFromVirtual(data.target, data.fallbackParentNodeId);
    if (!targetResult.success || !targetResult.nodeId) {
      return { success: false, message: "Gagal membuat target node real." };
    }

    return await updateOrgNodeParent(data.nodeId, targetResult.nodeId);
  } catch (error) {
    console.error("materializeTargetAndMoveOrgNode error:", error);
    return { success: false, message: "Gagal memindahkan node ke target virtual." };
  }
}

async function createRealOrgNodeFromVirtual(node: VirtualOrgNodePayload, parentNodeId: number | null) {
  const existingNode = node.id > 0
    ? await db.select({ id: hrOrgNodes.id }).from(hrOrgNodes).where(eq(hrOrgNodes.id, node.id)).limit(1)
    : [];

  if (existingNode[0]) {
    return { success: true, nodeId: existingNode[0].id };
  }

  const safeCode = node.name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "ORG_NODE";
  const hierarchy = await calculateHierarchy(0, parentNodeId);

  const [newNode] = await db
    .insert(hrOrgNodes)
    .values({
      code: `ORG_${safeCode}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      name: node.name,
      nodeType: node.nodeType.replace(/_virtual$/i, "") || "section",
      parentNodeId: (parentNodeId && parentNodeId > 0) ? parentNodeId : null,
      departmentId: node.departmentId ?? null,
      sectionId: (node.nodeType.replace(/_virtual$/i, "").toLowerCase() === "department" || node.nodeType.replace(/_virtual$/i, "").toLowerCase() === "company" || node.nodeType.replace(/_virtual$/i, "").toLowerCase().includes("bod")) ? null : (node.sectionId ?? null),
      siteId: node.siteId ?? null,
      workLocationId: (node.nodeType.replace(/_virtual$/i, "").toLowerCase().includes("location") || node.nodeType.replace(/_virtual$/i, "").toLowerCase().includes("site")) ? (node.workLocationId ?? null) : null,
      hierarchyLevel: hierarchy.level,
      pathText: "",
      isActive: true,
    })
    .returning({ id: hrOrgNodes.id });

  const actualPath = parentNodeId ? (await calculateHierarchy(newNode.id, parentNodeId)).path : `/${newNode.id}/`;
  await db.update(hrOrgNodes).set({ pathText: actualPath }).where(eq(hrOrgNodes.id, newNode.id));

  const employeeIds = Array.from(new Set(node.employeeIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (employeeIds.length > 0) {
    const updatedEmployees = await db
      .update(employees)
      .set({ orgNodeId: newNode.id })
      .where(inArray(employees.id, employeeIds))
      .returning({
        id: employees.id,
        authUserId: employees.authUserId,
        employeeId: employees.employeeSn,
        fullName: employees.name,
        email: employees.email,
        departmentId: employees.departmentId,
        sectionId: employees.sectionId,
        siteId: employees.siteId,
        positionId: employees.positionId,
        orgNodeId: employees.orgNodeId,
      });

    for (const employee of updatedEmployees) {
      await syncOrgChartEmployeeToOperationalEmployee(employee);
    }
  }

  return { success: true, nodeId: newNode.id };
}

async function preserveMovedNodeIdentityFromEmployees(nodeIds: number[]) {
  const uniqueNodeIds = Array.from(new Set(nodeIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueNodeIds.length === 0) return;

  const nodeRows = await db
    .select({
      id: hrOrgNodes.id,
      departmentId: hrOrgNodes.departmentId,
      sectionId: hrOrgNodes.sectionId,
      siteId: hrOrgNodes.siteId,
      workLocationId: hrOrgNodes.workLocationId,
    })
    .from(hrOrgNodes)
    .where(inArray(hrOrgNodes.id, uniqueNodeIds));

  const employeeRows = await db
    .select({
      orgNodeId: employees.orgNodeId,
      departmentId: employees.departmentId,
      sectionId: employees.sectionId,
      siteId: employees.siteId,
    })
    .from(employees)
    .where(inArray(employees.orgNodeId, uniqueNodeIds));

  for (const node of nodeRows) {
    const employeesInNode = employeeRows.filter((employee) => employee.orgNodeId === node.id);
    if (employeesInNode.length === 0) continue;

    const updateData: Partial<typeof hrOrgNodes.$inferInsert> = {};
    const departmentId = getSingleValue(employeesInNode.map((employee) => employee.departmentId));
    const sectionId = getSingleValue(employeesInNode.map((employee) => employee.sectionId));
    const siteId = getSingleValue(employeesInNode.map((employee) => employee.siteId));

    if (node.departmentId == null && departmentId != null) updateData.departmentId = departmentId;
    if (node.sectionId == null && sectionId != null) updateData.sectionId = sectionId;
    if (node.siteId == null && siteId != null) updateData.siteId = siteId;

    if (Object.keys(updateData).length === 1) continue;

    await db.update(hrOrgNodes).set(updateData).where(eq(hrOrgNodes.id, node.id));
  }
}

function getSingleValue(values: Array<number | null>) {
  const uniqueValues = Array.from(new Set(values.filter((value): value is number => value != null)));
  return uniqueValues.length === 1 ? uniqueValues[0] : null;
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
  workLocationId?: number | null;
}) {
  try {
    const hierarchy = await calculateHierarchy(0, data.parentNodeId);

    let deptId = data.departmentId ?? null;
    let sectId = data.sectionId ?? null;

    // Auto-map Department by name if not provided
    if (!deptId) {
      const [matchedDept] = await db
        .select({ id: hrDepartments.id })
        .from(hrDepartments)
        .where(and(eq(hrDepartments.isActive, true), sql`lower(trim(${hrDepartments.name})) = lower(trim(${data.name}))`))
        .limit(1);
      if (matchedDept) {
        deptId = matchedDept.id;
      }
    }

    // Auto-map Section by name if not provided
    if (!sectId && (data.nodeType === "section" || data.nodeType === "unit")) {
      const [matchedSect] = await db
        .select({ id: hrSections.id, departmentId: hrSections.departmentId })
        .from(hrSections)
        .where(and(eq(hrSections.isActive, true), sql`lower(trim(${hrSections.name})) = lower(trim(${data.name}))`))
        .limit(1);
      if (matchedSect) {
        sectId = matchedSect.id;
        if (!deptId && matchedSect.departmentId) {
          deptId = matchedSect.departmentId;
        }
      }
    }

    const [newNode] = await db
      .insert(hrOrgNodes)
      .values({
        code: data.code,
        name: data.name,
        nodeType: data.nodeType,
        parentNodeId: data.parentNodeId,
        departmentId: deptId,
        sectionId: sectId,
        siteId: data.siteId ?? null,
        workLocationId: data.workLocationId ?? null,
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
    workLocationId?: number | null;
    leaderEmployeeId?: number | null;
  }
) {
  try {
    const subtreeNodeIds = await getOrgNodeSubtreeIds(id);

    const { leaderEmployeeId, ...orgNodeData } = data;

    let deptId = orgNodeData.departmentId;
    let sectId = orgNodeData.sectionId;

    const [existingNode] = await db
      .select({ name: hrOrgNodes.name, nodeType: hrOrgNodes.nodeType })
      .from(hrOrgNodes)
      .where(eq(hrOrgNodes.id, id))
      .limit(1);

    const nameToMap = orgNodeData.name ?? existingNode?.name;
    const nodeTypeToMap = orgNodeData.nodeType ?? existingNode?.nodeType;

    // Auto-map Department by name if not provided
    if (deptId === undefined && nameToMap) {
      const [matchedDept] = await db
        .select({ id: hrDepartments.id })
        .from(hrDepartments)
        .where(and(eq(hrDepartments.isActive, true), sql`lower(trim(${hrDepartments.name})) = lower(trim(${nameToMap}))`))
        .limit(1);
      if (matchedDept) {
        deptId = matchedDept.id;
      }
    }

    // Auto-map Section by name if not provided
    if (sectId === undefined && nameToMap && (nodeTypeToMap === "section" || nodeTypeToMap === "unit")) {
      const [matchedSect] = await db
        .select({ id: hrSections.id, departmentId: hrSections.departmentId })
        .from(hrSections)
        .where(and(eq(hrSections.isActive, true), sql`lower(trim(${hrSections.name})) = lower(trim(${nameToMap}))`))
        .limit(1);
      if (matchedSect) {
        sectId = matchedSect.id;
        if (deptId === undefined && matchedSect.departmentId) {
          deptId = matchedSect.departmentId;
        }
      }
    }

    await db
      .update(hrOrgNodes)
      .set({
        ...orgNodeData,
        ...(deptId !== undefined ? { departmentId: deptId } : {}),
        ...(sectId !== undefined ? { sectionId: sectId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(hrOrgNodes.id, id));

    // Handle leader selection if provided
    if (leaderEmployeeId) {
      const nodeDefaults = await getOrgNodeEmployeeDefaults(id);
      
      const rawPositions = await db
        .select({ id: hrPositions.id, rankName: hrPositions.rankName, levelName: hrPositions.levelName })
        .from(hrPositions)
        .where(eq(hrPositions.isActive, true));

      const targetNodeType = orgNodeData.nodeType ?? existingNode?.nodeType ?? "section";
      const targetNodeName = orgNodeData.name ?? existingNode?.name ?? "";
      const nodeTypeLower = targetNodeType.toLowerCase();
      const nodeNameLower = targetNodeName.toLowerCase();

      const patterns = nodeTypeLower.includes("section")
        ? ["section head", "head section", "supervisor", "spv", "coordinator", "koordinator", "leader", "foreman", "chief"]
        : nodeTypeLower.includes("department") || nodeNameLower.includes("department")
          ? ["department head", "head department", "manager", "mgr", "kepala departemen"]
          : ["head", "manager", "supervisor", "coordinator", "leader"];

      const scored = rawPositions
        .map((position) => {
          const searchable = `${position.levelName} ${position.rankName}`.toLowerCase();
          const matchIndex = patterns.findIndex((pattern) => searchable.includes(pattern));
          return { position, matchIndex };
        })
        .filter((item) => item.matchIndex >= 0)
        .sort((a, b) => a.matchIndex - b.matchIndex || a.position.rankName.localeCompare(b.position.rankName, "id-ID"));

      const headPosition = scored[0]?.position ?? null;

      const employeeUpdate = {
        orgNodeId: id,
        departmentId: nodeDefaults?.departmentId ?? null,
        sectionId: nodeDefaults?.sectionId ?? null,
        ...(nodeDefaults?.siteId !== null && nodeDefaults?.siteId !== undefined ? { siteId: nodeDefaults.siteId } : {}),
        ...(headPosition ? { positionId: headPosition.id } : {}),
      };

      const [updatedEmp] = await db
        .update(employees)
        .set(employeeUpdate)
        .where(eq(employees.id, leaderEmployeeId))
        .returning({
          id: employees.id,
          authUserId: employees.authUserId,
          employeeId: employees.employeeSn,
          fullName: employees.name,
          email: employees.email,
          departmentId: employees.departmentId,
          sectionId: employees.sectionId,
          siteId: employees.siteId,
          workLocationId: sql<string | null>`null`.as('work_location_id'),
          positionId: employees.positionId,
          orgNodeId: employees.orgNodeId,
        });

      if (updatedEmp) {
        await syncOrgChartEmployeeToOperationalEmployee(updatedEmp);
      }
    }

    await syncOrgChartEmployeesInNodesToOperational(subtreeNodeIds);

    revalidateOrgChartEmployeeSurfaces();
    return { success: true, message: "Node berhasil diupdate dan User Management disync." };
  } catch (error) {
    console.error("updateOrgNode error:", error);
    return { success: false, message: "Gagal mengupdate node." };
  }
}

async function getOrgNodeSubtreeIds(nodeId: number) {
  const [node] = await db
    .select({ pathText: hrOrgNodes.pathText })
    .from(hrOrgNodes)
    .where(eq(hrOrgNodes.id, nodeId))
    .limit(1);

  if (!node) return [nodeId];

  const rows = await db
    .select({ id: hrOrgNodes.id })
    .from(hrOrgNodes)
    .where(sql`${hrOrgNodes.pathText} LIKE ${`${node.pathText}%`}`);

  const ids = rows.map((row) => row.id);
  return ids.includes(nodeId) ? ids : [nodeId, ...ids];
}

// Delete node (soft delete)
export async function deleteOrgNode(id: number) {
  try {
    // Check if node has active children
    const children = await db
      .select({ id: hrOrgNodes.id })
      .from(hrOrgNodes)
      .where(and(eq(hrOrgNodes.parentNodeId, id), eq(hrOrgNodes.isActive, true)))
      .limit(1);

    if (children.length > 0) {
      return { success: false, message: "Node memiliki child nodes. Hapus atau pindahkan child nodes terlebih dahulu." };
    }

    // Check if node has assigned active employees
    const assignedEmployees = await db
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.orgNodeId, id), eq(employees.isActive, true)))
      .limit(1);

    if (assignedEmployees.length > 0) {
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

    const updateData = {
      orgNodeId,
      departmentId: nodeDefaults.departmentId,
      sectionId: nodeDefaults.sectionId,
      ...(nodeDefaults.siteId !== null ? { siteId: nodeDefaults.siteId } : {}),
    };

    const [updatedEmployee] = await db
      .update(employees)
      .set(updateData)
      .where(eq(employees.id, employeeId))
      .returning({
        id: employees.id,
        authUserId: employees.authUserId,
        employeeId: employees.employeeSn,
        fullName: employees.name,
        email: employees.email,
        departmentId: employees.departmentId,
        sectionId: employees.sectionId,
        siteId: employees.siteId,
        positionId: employees.positionId,
        orgNodeId: employees.orgNodeId,
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

export async function updateOrgChartEmployeeNodeHead(
  employeeId: number,
  orgNodeId: number,
  positionId?: number | null
) {
  try {
    const nodeDefaults = await getOrgNodeEmployeeDefaults(orgNodeId);

    if (!nodeDefaults) {
      return { success: false, message: "Node tujuan tidak ditemukan." };
    }

    const updateData = {
      orgNodeId,
      departmentId: nodeDefaults.departmentId,
      sectionId: nodeDefaults.sectionId,
      ...(nodeDefaults.siteId !== null ? { siteId: nodeDefaults.siteId } : {}),
      ...(positionId ? { positionId } : {}),
    };

    const [updatedEmployee] = await db
      .update(employees)
      .set(updateData)
      .where(eq(employees.id, employeeId))
      .returning({
        id: employees.id,
        authUserId: employees.authUserId,
        employeeId: employees.employeeSn,
        fullName: employees.name,
        email: employees.email,
        departmentId: employees.departmentId,
        sectionId: employees.sectionId,
        siteId: employees.siteId,
        positionId: employees.positionId,
        orgNodeId: employees.orgNodeId,
      });

    if (!updatedEmployee) {
      return { success: false, message: "Karyawan tidak ditemukan." };
    }

    await syncOrgChartEmployeeToOperationalEmployee(updatedEmployee);

    revalidateOrgChartEmployeeSurfaces();
    return { success: true, message: "Karyawan berhasil dijadikan head node dan disync ke User Management." };
  } catch (error) {
    console.error("updateOrgChartEmployeeNodeHead error:", error);
    return { success: false, message: "Gagal menjadikan karyawan sebagai head node." };
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
  positionId: number | null;
  orgNodeId: number | null;
  levelName?: string | null;
};

function normalizeSiteLabel(value?: string | null) {
  return (value ?? "")
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildSiteCandidates(...values: Array<string | null | undefined>) {
  const candidates = new Set<string>();

  for (const value of values) {
    const cleaned = (value ?? "").trim();
    if (!cleaned) continue;

    candidates.add(cleaned);

    const splitParts = cleaned
      .split(/\s+(?:-|•|\||\/)\s+|(?:-|•|\||\/)/g)
      .map((part) => part.trim())
      .filter(Boolean);
    for (const part of splitParts) candidates.add(part);
    if (splitParts.length > 0) candidates.add(splitParts[splitParts.length - 1]);
  }

  return Array.from(candidates)
    .map(normalizeSiteLabel)
    .filter((candidate) => candidate.length > 2);
}

async function resolveLegacySiteId(hrSiteName?: string | null, workLocationName?: string | null) {
  const candidates = buildSiteCandidates(hrSiteName, workLocationName);
  if (candidates.length === 0) return null;

  const siteRows = await db
    .select({ id: sites.id, name: sites.name, location: sites.location })
    .from(sites)
    .where(eq(sites.isActive, true));

  const keyedRows = siteRows.map((site) => ({
    id: site.id,
    keys: [normalizeSiteLabel(site.name), normalizeSiteLabel(site.location)].filter(Boolean),
  }));

  for (const candidate of candidates) {
    const exact = keyedRows.find((site) => site.keys.includes(candidate));
    if (exact) return exact.id;
  }

  for (const candidate of candidates) {
    const partial = keyedRows.find((site) =>
      site.keys.some((key) => key.length > 2 && (candidate.includes(key) || key.includes(candidate)))
    );
    if (partial) return partial.id;
  }

  return null;
}

async function syncOrgChartEmployeeToOperationalEmployee(employee: SyncedOrgChartEmployee) {
  const [[department], [section], [position], [site]] = await Promise.all([
    employee.departmentId
      ? db.select({ name: masterDepartments.name }).from(masterDepartments).where(eq(masterDepartments.id, employee.departmentId)).limit(1)
      : Promise.resolve([]),
    employee.sectionId
      ? db.select({ name: masterSections.name }).from(masterSections).where(eq(masterSections.id, employee.sectionId)).limit(1)
      : Promise.resolve([]),
    employee.positionId
      ? db.select({ rankName: hrPositions.rankName, levelName: hrPositions.levelName }).from(hrPositions).where(eq(hrPositions.id, employee.positionId)).limit(1)
      : Promise.resolve([]),
    employee.siteId
      ? db.select({ name: sites.name }).from(sites).where(eq(sites.id, employee.siteId)).limit(1)
      : Promise.resolve([]),
  ]);

  const legacySiteId = await resolveLegacySiteId(site?.name, null).catch(() => null);

  const roleName = position?.rankName ?? employee.levelName ?? "";
  const resolvedLevelName = (employee.levelName?.trim() || position?.levelName?.trim() || null);
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
    workLocation: site?.name ?? "",
    ...(resolvedLevelName ? { levelName: resolvedLevelName } : {}),
    ...(legacySiteId ? { siteId: legacySiteId } : {}),
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

async function syncOrgChartEmployeesInNodesToOperational(nodeIds: number[]) {
  const uniqueNodeIds = Array.from(new Set(nodeIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueNodeIds.length === 0) return;

  for (const orgNodeId of uniqueNodeIds) {
    const nodeDefaults = await getOrgNodeEmployeeDefaults(orgNodeId);
    if (!nodeDefaults) continue;

    const updatedEmployees = await db
      .update(employees)
      .set({
        orgNodeId,
        departmentId: nodeDefaults.departmentId,
        sectionId: nodeDefaults.sectionId,
        ...(nodeDefaults.siteId !== null ? { siteId: nodeDefaults.siteId } : {}),
      })
      .where(eq(employees.orgNodeId, orgNodeId))
      .returning({
        id: employees.id,
        authUserId: employees.authUserId,
        employeeId: employees.employeeSn,
        fullName: employees.name,
        email: employees.email,
        departmentId: employees.departmentId,
        sectionId: employees.sectionId,
        siteId: employees.siteId,
        positionId: employees.positionId,
        orgNodeId: employees.orgNodeId,
      });

    for (const employee of updatedEmployees) {
      await syncOrgChartEmployeeToOperationalEmployee(employee);
    }
  }
}

async function syncExistingOrgChartEmployeesToOperational(nodeIds: number[]) {
  const uniqueNodeIds = Array.from(new Set(nodeIds.filter((id) => Number.isFinite(id) && id > 0)));
  if (uniqueNodeIds.length === 0) return;

  const employeeRows = await db
    .select({
      id: employees.id,
      authUserId: employees.authUserId,
      employeeId: employees.employeeSn,
      fullName: employees.name,
      email: employees.email,
      departmentId: employees.departmentId,
      sectionId: employees.sectionId,
      siteId: employees.siteId,
      workLocationId: sql<string | null>`null`.as('work_location_id'),
      positionId: employees.positionId,
      orgNodeId: employees.orgNodeId,
    })
    .from(employees)
    .where(inArray(employees.orgNodeId, uniqueNodeIds));

  for (const employee of employeeRows) {
    await syncOrgChartEmployeeToOperationalEmployee(employee);
  }
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

export async function createOrgChartEmployee(data: {
  employeeId: string;
  fullName: string;
  email?: string | null;
  departmentId?: number | null;
  sectionId?: number | null;
  siteId?: number | null;
  workLocationId?: number | null;
  positionId?: number | null;
  orgNodeId?: number | null;
  levelName?: string | null;
}) {
  try {
    const nodeDefaults = data.orgNodeId ? await getOrgNodeEmployeeDefaults(data.orgNodeId) : null;

    const [createdEmployee] = await db
      .insert(employees)
      .values({
        employeeSn: data.employeeId.trim(),
        name: data.fullName.trim(),
        email: data.email?.trim() || '',
        departmentId: data.departmentId ?? nodeDefaults?.departmentId ?? null,
        sectionId: data.sectionId ?? nodeDefaults?.sectionId ?? null,
        siteId: data.siteId ?? nodeDefaults?.siteId ?? 1,
        positionId: data.positionId ?? null,
        orgNodeId: data.orgNodeId ?? null,
        employmentStatus: "active",
        isActive: true,
        role: 'Employee',
        department: '',
      })
      .returning({
        id: employees.id,
        authUserId: employees.authUserId,
        employeeId: employees.employeeSn,
        fullName: employees.name,
        email: employees.email,
        departmentId: employees.departmentId,
        sectionId: employees.sectionId,
        siteId: employees.siteId,
        positionId: employees.positionId,
        orgNodeId: employees.orgNodeId,
      });

    await syncOrgChartEmployeeToOperationalEmployee({
      ...createdEmployee,
      levelName: data.levelName ?? null,
    });

    revalidateOrgChartEmployeeSurfaces();
    return { success: true, message: "Orang berhasil dibuat di struktur organisasi.", employee: createdEmployee };
  } catch (error) {
    console.error("createOrgChartEmployee error:", error);
    return { success: false, message: "Gagal membuat orang. Pastikan Employee ID belum dipakai." };
  }
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
    levelName?: string | null;
  }
) {
  try {
    const { levelName: levelNameOverride, employeeId: empIdStr, fullName, email, departmentId, sectionId, siteId, positionId, orgNodeId } = data;
    const setData: Record<string, unknown> = {};
    if (empIdStr !== undefined) setData.employeeSn = empIdStr;
    if (fullName !== undefined) setData.name = fullName;
    if (email !== undefined) setData.email = email || '';
    if (departmentId !== undefined) setData.departmentId = departmentId;
    if (sectionId !== undefined) setData.sectionId = sectionId;
    if (siteId !== undefined && siteId !== null) setData.siteId = siteId;
    if (positionId !== undefined) setData.positionId = positionId;
    if (orgNodeId !== undefined) setData.orgNodeId = orgNodeId;

    const [updatedEmployee] = await db
      .update(employees)
      .set(setData)
      .where(eq(employees.id, employeeId))
      .returning({
        id: employees.id,
        authUserId: employees.authUserId,
        employeeId: employees.employeeSn,
        fullName: employees.name,
        email: employees.email,
        departmentId: employees.departmentId,
        sectionId: employees.sectionId,
        siteId: employees.siteId,
        positionId: employees.positionId,
        orgNodeId: employees.orgNodeId,
      });

    if (!updatedEmployee) {
      return { success: false, message: "Karyawan tidak ditemukan." };
    }

    await syncOrgChartEmployeeToOperationalEmployee({
      ...updatedEmployee,
      levelName: levelNameOverride ?? null,
    });
    revalidateOrgChartEmployeeSurfaces();
    return { success: true, message: "Profil karyawan berhasil diupdate dan disync ke User Management." };
  } catch (error) {
    console.error("updateOrgChartEmployeeProfile error:", error);
    return { success: false, message: "Gagal mengupdate profil karyawan." };
  }
}

// Get departments, sections, sites for dropdowns
export async function getOrgNodeReferenceData() {
  const [departments, sections, sitesData, rawPositions, levelStaffs] = await Promise.all([
    db.select({ id: hrDepartments.id, name: hrDepartments.name }).from(hrDepartments).where(eq(hrDepartments.isActive, true)).orderBy(asc(hrDepartments.name)),
    db.select({ id: hrSections.id, name: hrSections.name, departmentId: hrSections.departmentId }).from(hrSections).where(eq(hrSections.isActive, true)).orderBy(asc(hrSections.name)),
    db.select({ id: sites.id, name: sites.name }).from(sites).where(eq(sites.isActive, true)).orderBy(asc(sites.name)),
    db.select({ id: hrPositions.id, rankName: hrPositions.rankName, levelName: hrPositions.levelName }).from(hrPositions).where(eq(hrPositions.isActive, true)).orderBy(asc(hrPositions.levelName), asc(hrPositions.rankName)),
    db.select({ name: masterLevelStaff.name, sortOrder: masterLevelStaff.sortOrder }).from(masterLevelStaff).where(eq(masterLevelStaff.isActive, true)).orderBy(asc(masterLevelStaff.sortOrder)),
  ]);

  // Build level order map from masterLevelStaff: normalize levelName → sortOrder
  const levelOrderMap = new Map<string, number>();
  for (const lvl of levelStaffs) {
    levelOrderMap.set(lvl.name.trim().toLowerCase(), lvl.sortOrder);
  }

  function getLevelSortOrder(levelName: string): number {
    const key = levelName.trim().toLowerCase();
    // Exact match first
    if (levelOrderMap.has(key)) return levelOrderMap.get(key)!;
    // Partial match fallback
    for (const [mapKey, order] of levelOrderMap.entries()) {
      if (key.includes(mapKey) || mapKey.includes(key)) return order;
    }
    return 9999;
  }

  // Deduplicate positions by (levelName + rankName) combination
  const seenPositions = new Set<string>();
  const positions = rawPositions
    .filter((p) => {
      const sig = `${p.levelName.trim().toLowerCase()}|${p.rankName.trim().toLowerCase()}`;
      if (seenPositions.has(sig)) return false;
      seenPositions.add(sig);
      return true;
    })
    .sort((a, b) => {
      const orderA = getLevelSortOrder(a.levelName);
      const orderB = getLevelSortOrder(b.levelName);
      if (orderA !== orderB) return orderA - orderB;
      return a.rankName.localeCompare(b.rankName, "id-ID");
    });

  return { departments, sections, sites: sitesData, positions, levelStaffs };
}
