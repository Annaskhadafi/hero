"use server";

import { db } from "@/db";
import { hrDepartments, hrEmployees, hrOrgNodes, hrPositions, hrSections, hrSites, hrWorkLocations } from "@/db/schema/hero";
import { asc, eq, sql } from "drizzle-orm";
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

  const employees = await db
    .select({
      id: hrEmployees.id,
      employeeId: hrEmployees.employeeId,
      fullName: hrEmployees.fullName,
      orgNodeId: hrEmployees.orgNodeId,
      positionName: hrPositions.rankName,
    })
    .from(hrEmployees)
    .leftJoin(hrPositions, eq(hrEmployees.positionId, hrPositions.id))
    .where(eq(hrEmployees.isActive, true));

  const employeesByNode = new Map<number, typeof employees>();
  for (const employee of employees) {
    if (!employee.orgNodeId) continue;
    employeesByNode.set(employee.orgNodeId, [...(employeesByNode.get(employee.orgNodeId) ?? []), employee]);
  }

  return nodes.map((node) => ({
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

// Get departments, sections, sites for dropdowns
export async function getOrgNodeReferenceData() {
  const [departments, sections, sites] = await Promise.all([
    db.select({ id: hrDepartments.id, name: hrDepartments.name }).from(hrDepartments).where(eq(hrDepartments.isActive, true)),
    db.select({ id: hrSections.id, name: hrSections.name, departmentId: hrSections.departmentId }).from(hrSections).where(eq(hrSections.isActive, true)),
    db.select({ id: hrSites.id, name: hrSites.name }).from(hrSites).where(eq(hrSites.isActive, true)),
  ]);

  return { departments, sections, sites };
}
