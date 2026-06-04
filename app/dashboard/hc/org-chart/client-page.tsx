"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Building2, GitBranch, Search, UserRound, Users, Edit, Trash2, Plus, GripVertical, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, DragOverlay } from "@dnd-kit/core";

import { AdminPageShell } from "@/components/admin-page-shell";
import { HcWorkspaceBanner } from "@/components/hc/hc-workspace-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EnterpriseScorecards } from "@/components/ui/enterprise-table-kit";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Import actions (using relative path to ensure resolution)
import { updateOrgNodeParent, updateOrgNode, createOrgNode, deleteOrgNode, updateOrgChartEmployeeAssignment, updateOrgChartEmployeeProfile } from "@/app/actions/org-chart";

type OrgNode = {
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
  departmentId?: number | null;
  sectionId?: number | null;
  siteId?: number | null;
  employeeCount: number;
  employees: Array<{
    id: number;
    employeeId: string;
    fullName: string;
    orgNodeId: number | null;
    positionName: string | null;
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

type OrgTreeNode = OrgNode & {
  children: OrgTreeNode[];
  isVirtual?: boolean;
  virtualParentNodeId?: number;
  virtualWorkLocationId?: number | null;
};

type Stats = { totalNodes: number; totalEmployeesAssigned: number; departments: number; rootNodes: number };

type ReferenceData = {
  departments: Array<{ id: number; name: string }>;
  sections: Array<{ id: number; name: string; departmentId: number | null }>;
  sites: Array<{ id: number; name: string }>;
  workLocations: Array<{ id: number; name: string }>;
  positions: Array<{ id: number; rankName: string; levelName: string }>;
};

type OrgEmployee = OrgNode["employees"][number];

// Helper to build tree
function getNodeOrder(node: OrgNode) {
  const normalized = node.nodeType.toLowerCase().replace(/[\s_-]+/g, "_");
  if (normalized.includes("company") || normalized.includes("bod") || normalized.includes("executive")) return 0;
  if (normalized.includes("department")) return 1;
  if (normalized.includes("section")) return 2;
  if (normalized.includes("work_location") || normalized.includes("worklocation") || normalized.includes("site")) return 3;
  return 4;
}

function sortOrgNodes(nodes: OrgTreeNode[]) {
  for (const node of nodes) sortOrgNodes(node.children);
  nodes.sort(
    (a, b) =>
      getNodeOrder(a) - getNodeOrder(b) ||
      a.hierarchyLevel - b.hierarchyLevel ||
      a.name.localeCompare(b.name, "id-ID"),
  );
}

function normalizeOrgLabel(value: string) {
  return value.trim().toLocaleLowerCase("id-ID").replace(/[\s_-]+/g, " ");
}

function getDepartmentFilterLabel(name: string) {
  return normalizeOrgLabel(name) === "bi & marketing" ? "Finance Business Partner" : name;
}

function isLocationNode(node: OrgNode) {
  const normalized = node.nodeType.toLowerCase().replace(/[\s_-]+/g, "_");
  return normalized.includes("work_location") || normalized.includes("worklocation") || normalized.includes("site");
}

function isDepartmentNode(node: OrgNode) {
  const normalized = node.nodeType.toLowerCase().replace(/[\s_-]+/g, "_");
  return normalized.includes("department");
}

function getEmployeeWorkLocationLabel(employee: OrgEmployee) {
  return employee.workLocationName || employee.siteName || "Lokasi Belum Diisi";
}

function getVirtualLocationNodeId(parentNodeId: number, locationKey: string) {
  let hash = 0;
  for (const char of locationKey) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return -Math.abs(parentNodeId * 100000 + (hash % 99999));
}

function extractEmployeesDeep(node: OrgTreeNode): OrgNode["employees"] {
  let all = [...node.employees];
  for (const child of node.children) {
    all = all.concat(extractEmployeesDeep(child));
  }
  return all;
}

function absorbLocationNodes(nodes: OrgTreeNode[]): OrgTreeNode[] {
  return nodes.map((node) => {
    const children = absorbLocationNodes(node.children);

    const locationChildren = children.filter(isLocationNode);
    const nonLocationChildren = children.filter(c => !isLocationNode(c));

    if (locationChildren.length > 0) {
      let absorbedEmployees = [...node.employees];
      for (const child of locationChildren) {
        absorbedEmployees = absorbedEmployees.concat(extractEmployeesDeep(child));
      }

      // Deduplicate employees by ID just in case
      const uniqueEmployeesMap = new Map();
      for (const emp of absorbedEmployees) {
        uniqueEmployeesMap.set(emp.id, emp);
      }
      const uniqueEmployees = Array.from(uniqueEmployeesMap.values());

      return {
        ...node,
        children: nonLocationChildren,
        employees: uniqueEmployees,
        employeeCount: uniqueEmployees.length,
      };
    }

    return { ...node, children };
  });
}

function isManagerEmployee(employee: OrgNode["employees"][number]) {
  return normalizeOrgLabel(employee.positionName ?? "").includes("manager");
}

function hoistManagersToDepartment(node: OrgTreeNode): OrgTreeNode {
  // Flag apakah node ini adalah target Department/Managerial
  const isDepartmentNode =
    node.nodeType.toLowerCase().includes("department") ||
    node.nodeType.toLowerCase().includes("manager");

  // Jika node ini BUKAN department (misal root company atau section),
  // cukup jalankan proses ke anak-anaknya saja.
  if (!isDepartmentNode) {
    return {
      ...node,
      children: node.children.map(hoistManagersToDepartment)
    };
  }

  // Jika INI adalah node Department, tarik semua manager dari anak-anaknya.
  // Tapi jangan tarik manager dari department lain di bawahnya (kalau ada).
  const extractedManagers = new Map<number, OrgNode["employees"][number]>();

  function processAndExtractChildren(child: OrgTreeNode): OrgTreeNode {
    // Stop ekstrak jika ketemu department lain di bawah
    const isChildDept = child.nodeType.toLowerCase().includes("department") ||
                        child.nodeType.toLowerCase().includes("manager");

    if (isChildDept) {
      // Jalankan fungsi utama untuk department tersebut
      return hoistManagersToDepartment(child);
    }

    // Ekstrak manager di node ini
    const localEmployees = [];
    for (const emp of child.employees) {
      if (isManagerEmployee(emp)) extractedManagers.set(emp.id, emp);
      else localEmployees.push(emp);
    }

    // Rekursif ke bawah
    return {
      ...child,
      employees: localEmployees,
      employeeCount: localEmployees.length,
      children: child.children.map(processAndExtractChildren)
    };
  }

  const newChildren = node.children.map(processAndExtractChildren);

  // Gabungkan manager yang diekstrak dengan employee asli node Department ini
  const rootEmployeesById = new Map(node.employees.map((emp) => [emp.id, emp]));
  for (const manager of extractedManagers.values()) {
    rootEmployeesById.set(manager.id, manager);
  }

  const rootEmployees = Array.from(rootEmployeesById.values()).sort((a, b) => {
    const managerDiff = Number(isManagerEmployee(b)) - Number(isManagerEmployee(a));
    return managerDiff || a.fullName.localeCompare(b.fullName, "id-ID");
  });

  return {
    ...node,
    children: newChildren,
    employees: rootEmployees,
    employeeCount: rootEmployees.length,
  };
}

function groupOrgUnitEmployeesByWorkLocation(node: OrgTreeNode): OrgTreeNode {
  const children = node.children.map(groupOrgUnitEmployeesByWorkLocation);

  if (!isDepartmentNode(node) && getNodeOrder(node) !== 2) {
    return { ...node, children };
  }

  const departmentEmployees: OrgEmployee[] = [];
  const groupedEmployees = new Map<string, OrgEmployee[]>();

  for (const employee of node.employees) {
    if (getEmployeeRoleGroup(employee).order < 3) {
      departmentEmployees.push(employee);
      continue;
    }

    const locationLabel = getEmployeeWorkLocationLabel(employee);
    const locationKey = normalizeOrgLabel(locationLabel);
    groupedEmployees.set(locationKey, [...(groupedEmployees.get(locationKey) ?? []), employee]);
  }

  const virtualLocationNodes: OrgTreeNode[] = Array.from(groupedEmployees.entries()).map(([locationKey, employees]) => ({
    id: getVirtualLocationNodeId(node.id, locationKey),
    code: `AUTO_LOC_${node.id}_${locationKey.replace(/[^a-z0-9]+/g, "_")}`,
    parentNodeId: node.id,
    nodeType: "work_location_virtual",
    name: employees[0] ? getEmployeeWorkLocationLabel(employees[0]) : "Lokasi Belum Diisi",
    hierarchyLevel: node.hierarchyLevel + 1,
    departmentName: node.departmentName,
    sectionName: node.sectionName,
    siteName: employees[0]?.siteName ?? null,
    workLocationName: employees[0]?.workLocationName ?? null,
    departmentId: node.departmentId,
    sectionId: node.sectionId,
    siteId: node.siteId,
    employeeCount: employees.length,
    employees,
    children: [],
    isVirtual: true,
    virtualParentNodeId: node.id,
    virtualWorkLocationId: employees[0]?.workLocationId ?? null,
  }));

  return {
    ...node,
    employees: departmentEmployees,
    employeeCount: departmentEmployees.length,
    children: [...children, ...virtualLocationNodes],
  };
}


function isExecutiveEmployee(employee: OrgEmployee) {
  const searchable = normalizeOrgLabel(`${employee.fullName} ${employee.positionName ?? ""} ${employee.departmentName ?? ""} ${employee.sectionName ?? ""}`);
  return (
    searchable.includes("management") ||
    searchable.includes("director") ||
    searchable.includes("general manager") ||
    searchable.includes("board secretary") ||
    searchable.includes("bod") ||
    searchable.includes("executive")
  );
}

function addBodExecutiveRoot(nodes: OrgTreeNode[]): OrgTreeNode[] {
  const allEmployees = new Map<number, OrgEmployee>();
  const removeExecutiveEmployees = (node: OrgTreeNode): OrgTreeNode => {
    const employees: OrgEmployee[] = [];
    for (const employee of node.employees) {
      if (isExecutiveEmployee(employee)) allEmployees.set(employee.id, employee);
      else employees.push(employee);
    }
    const children = node.children.map(removeExecutiveEmployees);
    return { ...node, employees, employeeCount: employees.length, children };
  };

  const cleanedNodes = nodes.map(removeExecutiveEmployees);
  const virtualExecutives: OrgEmployee[] = [
    {
      id: -900001,
      employeeId: "BOD-DIRECTOR",
      fullName: "Hidayat Rahman",
      orgNodeId: null,
      positionName: "Director",
      email: null,
      departmentName: "Management",
      sectionName: "Management",
      departmentId: null,
      sectionId: null,
      siteId: null,
      workLocationId: null,
      positionId: null,
      siteName: null,
      workLocationName: null,
      isVirtual: true,
    },
    {
      id: -900002,
      employeeId: "BOD-GM",
      fullName: "Person Sihaloho",
      orgNodeId: null,
      positionName: "General Manager",
      email: null,
      departmentName: "Management",
      sectionName: "Management",
      departmentId: null,
      sectionId: null,
      siteId: null,
      workLocationId: null,
      positionId: null,
      siteName: null,
      workLocationName: null,
      isVirtual: true,
    },
  ];

  const executivesByName = new Map<string, OrgEmployee>();
  for (const employee of virtualExecutives) executivesByName.set(normalizeOrgLabel(employee.fullName), employee);
  for (const employee of allEmployees.values()) executivesByName.set(normalizeOrgLabel(employee.fullName), employee);

  const executives = Array.from(executivesByName.values()).sort((a, b) => {
    const positionA = normalizeOrgLabel(a.positionName ?? "");
    const positionB = normalizeOrgLabel(b.positionName ?? "");
    const order = (position: string) => position.includes("director") ? 0 : position.includes("secretary") ? 1 : position.includes("general manager") ? 2 : 3;
    return order(positionA) - order(positionB) || a.fullName.localeCompare(b.fullName, "id-ID");
  });

  const existingBodIndex = cleanedNodes.findIndex((node) => getNodeOrder(node) === 0);
  if (existingBodIndex >= 0) {
    return cleanedNodes.map((node, index) =>
      index === existingBodIndex
        ? {
            ...node,
            employees: executives,
            employeeCount: executives.length,
          }
        : node,
    );
  }

  const bodNode: OrgTreeNode = {
    id: -500000,
    code: "BOD_EXECUTIVE",
    parentNodeId: null,
    nodeType: "bod_executive_virtual",
    name: "BOD / Executive",
    hierarchyLevel: 0,
    departmentName: "Management",
    sectionName: "Management",
    siteName: null,
    workLocationName: null,
    departmentId: executives[0]?.departmentId ?? null,
    sectionId: executives[0]?.sectionId ?? null,
    siteId: executives[0]?.siteId ?? null,
    employeeCount: executives.length,
    employees: executives,
    children: cleanedNodes,
    isVirtual: true,
  };

  return [bodNode];
}

function pruneEmptyLeaves(nodes: OrgTreeNode[]): OrgTreeNode[] {
  return nodes
    .map((node) => {
      // Rekursif ke bawah dulu
      const children = pruneEmptyLeaves(node.children);
      return { ...node, children };
    })
    .filter((node) => {
      // Pertahankan node JIKA dia punya employee ATAU punya child (yang tidak kosong)
      return node.employeeCount > 0 || node.children.length > 0;
    });
}

function buildTree(nodes: OrgNode[]): OrgTreeNode[] {
  const map = new Map<number, OrgTreeNode>();
  for (const node of nodes) map.set(node.id, { ...node, children: [] });
  const roots: OrgTreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentNodeId && map.has(node.parentNodeId)) map.get(node.parentNodeId)!.children.push(node);
    else roots.push(node);
  }
  let processedRoots = absorbLocationNodes(roots);

  // Clean up any stray location nodes at root level by absorbing them into the first non-location root
  const nonLocRoots = processedRoots.filter(n => !isLocationNode(n));
  const locRoots = processedRoots.filter(n => isLocationNode(n));
  if (nonLocRoots.length > 0 && locRoots.length > 0) {
    const target = nonLocRoots[0];
    let absorbed = [...target.employees];
    for (const lr of locRoots) absorbed = absorbed.concat(extractEmployeesDeep(lr));
    target.employees = absorbed;
    target.employeeCount = absorbed.length;
    processedRoots = nonLocRoots;
  }

  processedRoots = processedRoots.map(hoistManagersToDepartment).map(groupOrgUnitEmployeesByWorkLocation);

  // Prune "dead leaves" (kotak tanpa orang dan tanpa child)
  processedRoots = pruneEmptyLeaves(processedRoots);

  sortOrgNodes(processedRoots);
  return processedRoots;
}

function getNodeContext(node: OrgTreeNode) {
  const nodeName = node.name.trim().toLocaleLowerCase("id-ID");
  const context = [node.departmentName, node.sectionName]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim())
    .filter((value) => value.toLocaleLowerCase("id-ID") !== nodeName);

  return Array.from(new Set(context)).join(" • ");
}

// Draggable + Droppable Tree Node Component
function getNodeTone(nodeType: string, hierarchyLevel: number) {
  const normalized = nodeType.toLowerCase();
  if (normalized.includes("bod") || normalized.includes("executive") || normalized === "company") {
    return {
      label: "BOD / EXECUTIVE",
      card: "border-slate-400 bg-slate-900 text-white shadow-slate-300/60",
      badge: "bg-white/15 text-white ring-white/20",
      text: "text-slate-200",
      connector: "bg-slate-400",
    };
  }
  if (normalized.includes("work_location") || normalized.includes("worklocation") || normalized.includes("site")) {
    return {
      label: "WORK LOCATION / SITE",
      card: "border-violet-200 bg-violet-50 text-slate-950 shadow-violet-100/80",
      badge: "bg-violet-100 text-violet-800 ring-violet-200",
      text: "text-slate-600",
      connector: "bg-violet-300",
    };
  }
  if (normalized.includes("manager") || normalized === "department" || hierarchyLevel <= 1) {
    return {
      label: normalized === "department" ? "DEPARTMENT" : "MANAGERIAL",
      card: "border-sky-200 bg-sky-50 text-slate-950 shadow-sky-100/80",
      badge: "bg-sky-100 text-sky-800 ring-sky-200",
      text: "text-slate-600",
      connector: "bg-sky-300",
    };
  }
  if (normalized.includes("supervisor") || normalized === "section") {
    return {
      label: normalized === "section" ? "SECTION" : "SUPERVISORY",
      card: "border-emerald-200 bg-emerald-50 text-slate-950 shadow-emerald-100/80",
      badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
      text: "text-slate-600",
      connector: "bg-emerald-300",
    };
  }
  return {
    label: "PEOPLE / UNIT",
    card: "border-amber-200 bg-amber-50 text-slate-950 shadow-amber-100/80",
    badge: "bg-amber-100 text-amber-800 ring-amber-200",
    text: "text-slate-600",
    connector: "bg-amber-300",
  };
}


function getTotalEmployeeCount(node: OrgTreeNode): number {
  return node.employees.length + node.children.reduce((sum, child) => sum + getTotalEmployeeCount(child), 0);
}

function getSiteGroupLabel(value?: string | null) {
  const cleaned = (value ?? "").trim();
  if (!cleaned) return "Lokasi Belum Diisi";
  const parts = cleaned.split(" - ").map((part) => part.trim()).filter(Boolean);
  return parts[parts.length - 1] || cleaned;
}

function getEmployeeSiteGroupLabel(employee: OrgEmployee) {
  return getSiteGroupLabel(employee.workLocationName || employee.siteName);
}

function getSiteGroupOptions(nodes: OrgNode[]) {
  const options = new Map<string, string>();
  for (const node of nodes) {
    for (const employee of node.employees) {
      const label = getEmployeeSiteGroupLabel(employee);
      options.set(normalizeOrgLabel(label), label);
    }
  }
  return Array.from(options.entries())
    .map(([key, label]) => ({ key, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "id-ID"));
}

function getSiteEmployees(nodes: OrgNode[], siteGroupKey: string) {
  const employeeMap = new Map<number, OrgEmployee>();

  for (const node of nodes) {
    for (const employee of node.employees) {
      const departmentName = normalizeOrgLabel(employee.departmentName ?? node.departmentName ?? "");
      if (!departmentName.includes("central service")) continue;
      if (siteGroupKey !== "all" && normalizeOrgLabel(getEmployeeSiteGroupLabel(employee)) !== siteGroupKey) continue;
      employeeMap.set(employee.id, employee);
    }
  }

  return Array.from(employeeMap.values());
}

function nodeMatchesOrgFilters(node: OrgTreeNode, departmentId: string, sectionId: string) {
  const matchesDepartment = departmentId === "all" || node.departmentId?.toString() === departmentId || node.employees.some((employee) => employee.departmentId?.toString() === departmentId);
  const matchesSection = sectionId === "all" || node.sectionId?.toString() === sectionId || node.employees.some((employee) => employee.sectionId?.toString() === sectionId);
  return matchesDepartment && matchesSection;
}

function filterTreeWithAncestors(nodes: OrgTreeNode[], departmentId: string, sectionId: string): OrgTreeNode[] {
  if (departmentId === "all" && sectionId === "all") return nodes;

  return nodes
    .map((node) => {
      const filteredChildren = filterTreeWithAncestors(node.children, departmentId, sectionId);
      if (nodeMatchesOrgFilters(node, departmentId, sectionId) || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    })
    .filter((node): node is OrgTreeNode => Boolean(node));
}

function buildSiteStructureTree(nodes: OrgNode[], siteGroupKey: string): OrgTreeNode[] {
  const employees = getSiteEmployees(nodes, siteGroupKey);
  const selectedLocation = siteGroupKey === "all" ? null : employees[0] ? getEmployeeSiteGroupLabel(employees[0]) : null;

  function membersFor(sectionName: string) {
    const sectionKey = normalizeOrgLabel(sectionName);
    return employees.filter((employee) => normalizeOrgLabel(`${employee.departmentName ?? ""} ${employee.sectionName ?? ""} ${employee.positionName ?? ""}`).includes(sectionKey));
  }

  function makeSectionNode(sectionName: string, index: number, parentNodeId: number, hierarchyLevel: number): OrgTreeNode | null {
    const members = membersFor(sectionName);
    if (members.length === 0) return null;

    return {
      id: -700000 - index,
      code: `SITE_SECTION_${sectionName.toUpperCase()}`,
      parentNodeId,
      nodeType: "section_virtual",
      name: sectionName,
      hierarchyLevel,
      departmentName: "Site",
      sectionName,
      siteName: members[0]?.siteName ?? null,
      workLocationName: members[0]?.workLocationName ?? selectedLocation,
      departmentId: members[0]?.departmentId ?? null,
      sectionId: members[0]?.sectionId ?? null,
      siteId: members[0]?.siteId ?? null,
      employeeCount: members.length,
      employees: members,
      children: [],
      isVirtual: true,
      virtualParentNodeId: members[0]?.orgNodeId ?? undefined,
      virtualWorkLocationId: members[0]?.workLocationId ?? null,
    };
  }

  const technicalNode = makeSectionNode("Technical", 0, -600000, 1);
  const repairNode = makeSectionNode("Repair", 1, technicalNode ? technicalNode.id : -600000, technicalNode ? 2 : 1);
  const serviceNode = makeSectionNode("Service", 2, technicalNode ? technicalNode.id : -600000, technicalNode ? 2 : 1);
  const hseNode = makeSectionNode("HSE", 3, -600000, 1);

  if (technicalNode) {
    technicalNode.name = "Technical / PJO Site";
    technicalNode.children = [repairNode, serviceNode].filter((node): node is OrgTreeNode => Boolean(node));
  }

  const rootChildren = [technicalNode, hseNode, technicalNode ? null : repairNode, technicalNode ? null : serviceNode].filter((node): node is OrgTreeNode => Boolean(node));

  const root: OrgTreeNode = {
    id: -600000,
    code: "SITE_ROOT",
    parentNodeId: null,
    nodeType: "site_department_virtual",
    name: selectedLocation ? `Site • ${selectedLocation}` : "Site • Semua Lokasi",
    hierarchyLevel: 0,
    departmentName: "Site",
    sectionName: null,
    siteName: employees[0]?.siteName ?? null,
    workLocationName: selectedLocation,
    departmentId: employees[0]?.departmentId ?? null,
    sectionId: null,
    siteId: employees[0]?.siteId ?? null,
    employeeCount: 0,
    employees: [],
    children: rootChildren,
    isVirtual: true,
    virtualWorkLocationId: employees[0]?.workLocationId ?? null,
  };

  return pruneEmptyLeaves([root]);
}


function getRoleGroupFromPositionName(positionName?: string | null) {
  const position = (positionName ?? "").toLocaleLowerCase("id-ID");

  if (/(manager|mgr|kepala departemen|department head)/i.test(position)) {
    return { key: "manager", label: "MANAGER", order: 0, className: "bg-sky-100 text-sky-800 ring-sky-200" };
  }
  if (/(supervisor|spv|supervisi)/i.test(position)) {
    return { key: "spv", label: "SPV / SUPERVISOR", order: 1, className: "bg-emerald-100 text-emerald-800 ring-emerald-200" };
  }
  if (/(leader|lead|coordinator|koordinator|head|foreman|chief)/i.test(position)) {
    return { key: "leader", label: "LEADER / KOORDINATOR", order: 2, className: "bg-violet-100 text-violet-800 ring-violet-200" };
  }
  return { key: "staff", label: "STAFF", order: 3, className: "bg-slate-100 text-slate-700 ring-slate-200" };
}

function getEmployeeRoleGroup(employee: OrgEmployee) {
  return getRoleGroupFromPositionName(employee.positionName);
}

function groupEmployeesByRole(employees: OrgEmployee[]) {
  const groups = new Map<string, { label: string; order: number; className: string; employees: OrgEmployee[] }>();

  for (const employee of employees) {
    const role = getEmployeeRoleGroup(employee);
    const group = groups.get(role.key) ?? { label: role.label, order: role.order, className: role.className, employees: [] };
    group.employees.push(employee);
    groups.set(role.key, group);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      employees: group.employees.sort((a, b) => (a.positionName ?? "").localeCompare(b.positionName ?? "", "id-ID") || a.fullName.localeCompare(b.fullName, "id-ID")),
    }))
    .sort((a, b) => a.order - b.order);
}

function flattenTreeNodes(nodes: OrgTreeNode[]): OrgTreeNode[] {
  return nodes.flatMap((node) => [node, ...flattenTreeNodes(node.children)]);
}

function OrgEmployeePreview({ employee, onEditEmployee }: { employee: OrgEmployee; onEditEmployee: (employee: OrgEmployee) => void }) {
  const role = getEmployeeRoleGroup(employee);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: "employee-" + employee.id,
    data: { type: "employee", employee },
    disabled: employee.isVirtual,
  });

  return (
    <div ref={setNodeRef} className={"w-full min-w-0 overflow-hidden rounded-lg border border-slate-200/80 bg-white/90 p-2 text-left shadow-sm transition " + (isDragging ? "scale-95 opacity-40 ring-2 ring-blue-400" : "")}>
      <div className="flex min-w-0 items-start gap-2">
        <button {...listeners} {...attributes} className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-60" title={employee.isVirtual ? "Data BOD visual" : "Drag orang"} disabled={employee.isVirtual}>
          <GripVertical className="size-3" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-900">{employee.fullName}</p>
          <p className="truncate text-[10px] text-slate-500">{employee.employeeId} • {employee.positionName ?? "-"}</p>
          <p className="truncate text-[10px] text-slate-400">Lokasi: {[employee.siteName, employee.workLocationName].filter(Boolean).join(" • ") || "-"}</p>
          <span className={"mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ring-1 " + role.className}>{role.label}</span>
        </div>
        {!employee.isVirtual && (
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-slate-500 hover:bg-slate-100 hover:text-blue-700" onClick={() => onEditEmployee(employee)} title="Edit profil orang">
            <Edit className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function InteractiveTreeNode({
  node,
  onEdit,
  onDelete,
  onAddChild,
  onEditEmployee,
}: {
  node: OrgTreeNode;
  onEdit: (node: OrgTreeNode) => void;
  onDelete: (node: OrgTreeNode) => void;
  onAddChild: (parentId: number) => void;
  onEditEmployee: (employee: OrgEmployee, node: OrgTreeNode) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const tone = getNodeTone(node.nodeType, node.hierarchyLevel);
  const nodeContext = getNodeContext(node);
  const employeeGroups = groupEmployeesByRole(node.employees);
  const totalEmployeeCount = getTotalEmployeeCount(node);

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: "node-" + node.id,
    data: { type: "org-node", node },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: "node-" + node.id,
    data: { type: "org-node", node },
  });

  const setRefs = (element: HTMLElement | null) => {
    setDragRef(element);
    setDropRef(element);
  };

  return (
    <div className="flex flex-col items-center text-center">
      <div
        ref={setRefs}
        className={"group relative w-[380px] rounded-2xl border p-3 shadow-sm transition-all duration-200 " + tone.card +
          (isDragging ? " scale-95 opacity-40 ring-2 ring-primary" : "") +
          (isOver && !isDragging ? " scale-[1.02] ring-2 ring-emerald-500" : "")
        }
      >
        {!node.isVirtual && (
          <div className="absolute left-2 top-2">
            <button
              {...listeners}
              {...attributes}
              className="rounded-md p-1 text-current/45 transition hover:bg-white/40 hover:text-current active:cursor-grabbing"
              title="Drag untuk memindahkan node ini"
              type="button"
            >
              <GripVertical className="size-4" />
            </button>
          </div>
        )}

        {!node.isVirtual && (
          <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
            <Button variant="ghost" size="icon" className="h-6 w-6 bg-white/70 text-slate-600 hover:bg-white hover:text-emerald-700" onClick={() => onAddChild(node.id)} title="Tambah Child Node">
              <Plus className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 bg-white/70 text-slate-600 hover:bg-white hover:text-blue-700" onClick={() => onEdit(node)} title="Edit Node">
              <Edit className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 bg-white/70 text-slate-600 hover:bg-white hover:text-red-700" onClick={() => onDelete(node)} title="Hapus Node">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}

        <button className="mx-auto block max-w-[190px] text-balance pt-3 text-sm font-bold leading-tight hover:underline" onClick={() => setIsExpanded(!isExpanded)} type="button">
          {node.name}
        </button>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <span className={"rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 " + tone.badge}>{tone.label}</span>
          <span className={"rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 " + tone.badge}>LVL {node.hierarchyLevel}</span>
          {node.children.length > 0 && (
            <span className={"rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 " + tone.badge}>
              {isExpanded ? "−" : "+"} {node.children.length}
            </span>
          )}
        </div>

        <p className={"mx-auto mt-2 max-w-[220px] truncate text-[11px] " + tone.text}>{nodeContext || node.code}</p>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200/80">
            <UserRound className="size-3" />
            {node.employees.length} langsung
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200/80">
            <Users className="size-3" />
            Total {totalEmployeeCount} karyawan
          </span>
        </div>

        {node.employees.length > 0 && isExpanded && (
          <div className="mt-3 grid gap-2 text-left">
            {employeeGroups.map((group) => (
              <div key={group.label} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={"rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 " + group.className}>{group.label}</span>
                  <span className="text-[9px] font-semibold text-slate-400">{group.employees.length} orang</span>
                </div>
                {group.employees.map((employee) => (
                  <OrgEmployeePreview key={employee.id} employee={employee} onEditEmployee={(selectedEmployee) => onEditEmployee(selectedEmployee, node)} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {isExpanded && node.children.length > 0 && (
        <div className="flex flex-col items-center">
          <div className={"h-8 w-px " + tone.connector} />
          <div className="relative flex items-start justify-start gap-12 px-8 pt-8">
            <div className={"absolute left-4 right-4 top-0 h-px " + tone.connector} />
            {node.children.map((child) => (
              <div key={child.id} className="relative flex flex-col items-center">
                <div className={"absolute -top-8 h-8 w-px " + tone.connector} />
                <InteractiveTreeNode node={child} onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} onEditEmployee={onEditEmployee} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function OrgChartClientPage({ nodes, stats, referenceData }: { nodes: OrgNode[]; stats: Stats; referenceData: ReferenceData }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [chartTab, setChartTab] = useState<"organization" | "site">("organization");
  const [siteGroupKey, setSiteGroupKey] = useState("all");
  const [departmentFilterId, setDepartmentFilterId] = useState("all");
  const [sectionFilterId, setSectionFilterId] = useState("all");
  const [isPending, startTransition] = useTransition();
  const [activeDragNode, setActiveDragNode] = useState<OrgTreeNode | null>(null);
  const [activeDragEmployee, setActiveDragEmployee] = useState<OrgEmployee | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);

  // Dialog states
  const [editingNode, setEditingNode] = useState<OrgTreeNode | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [deletingNode, setDeletingNode] = useState<OrgTreeNode | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [creatingParentId, setCreatingParentId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const [editingEmployee, setEditingEmployee] = useState<{ employee: OrgEmployee; currentNode: OrgTreeNode } | null>(null);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [employeeFormData, setEmployeeFormData] = useState({
    employeeId: "",
    fullName: "",
    email: "",
    departmentId: "",
    sectionId: "",
    siteId: "",
    workLocationId: "",
    positionId: "",
    orgNodeId: "",
  });

  // Form states
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    nodeType: "position",
    departmentId: "" as string | null,
    sectionId: "" as string | null,
    siteId: "" as string | null,
  });

  // Derived data
  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const siteGroupOptions = useMemo(() => getSiteGroupOptions(nodes), [nodes]);
  const sectionFilterOptions = useMemo(
    () => departmentFilterId === "all" ? referenceData.sections : referenceData.sections.filter((section) => section.departmentId?.toString() === departmentFilterId),
    [referenceData.sections, departmentFilterId],
  );
  const organizationFilteredTree = useMemo(() => filterTreeWithAncestors(tree, departmentFilterId, sectionFilterId), [tree, departmentFilterId, sectionFilterId]);
  const siteTree = useMemo(() => buildSiteStructureTree(nodes, siteGroupKey), [nodes, siteGroupKey]);
  const activeTree = chartTab === "site" ? siteTree : organizationFilteredTree;
  const selectableNodes = useMemo(() => flattenTreeNodes(tree).filter((node) => !node.isVirtual), [tree]);
  const activeAllTreeNodes = useMemo(() => flattenTreeNodes(activeTree), [activeTree]);
  const selectedEmployeeTargetNode = useMemo(
    () => activeAllTreeNodes.find((node) => node.id.toString() === employeeFormData.orgNodeId) ?? editingEmployee?.currentNode ?? null,
    [activeAllTreeNodes, employeeFormData.orgNodeId, editingEmployee],
  );
  const selectedPosition = useMemo(
    () => referenceData.positions.find((position) => position.id.toString() === employeeFormData.positionId) ?? null,
    [referenceData.positions, employeeFormData.positionId],
  );
  const selectedRoleGroup = getRoleGroupFromPositionName(selectedPosition?.rankName ?? editingEmployee?.employee.positionName);
  const directSupervisor = useMemo(() => {
    if (!editingEmployee || !selectedEmployeeTargetNode) return null;
    let node: OrgTreeNode | undefined = selectedEmployeeTargetNode;
    while (node) {
      const leader = groupEmployeesByRole(node.employees)
        .flatMap((group) => group.employees)
        .find((employee) => employee.id !== editingEmployee.employee.id && getEmployeeRoleGroup(employee).order < 3);
      if (leader) return leader;
      node = activeAllTreeNodes.find((candidate) => candidate.id === node?.parentNodeId);
    }
    return null;
  }, [editingEmployee, selectedEmployeeTargetNode, activeAllTreeNodes]);

  const filteredTree = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeTree;

    return activeTree.filter(node =>
      node.name.toLowerCase().includes(q) ||
      node.code.toLowerCase().includes(q) ||
      node.children.some(c => c.name.toLowerCase().includes(q))
    );
  }, [activeTree, query]);

  // DnD Setup
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts (allows clicking buttons)
      },
    })
  );

  // Handlers
  const handleDragStart = (event: any) => {
    const { active } = event;
    const activeId = active.id.toString();

    if (activeId.startsWith("employee-")) {
      const employeeId = parseInt(activeId.replace("employee-", ""));
      const employee = nodes.flatMap((node) => node.employees).find((item) => item.id === employeeId) ?? null;
      setActiveDragEmployee(employee);
      return;
    }

    const nodeId = parseInt(activeId.replace('node-', ''));
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setActiveDragNode({ ...node, children: [] } as OrgTreeNode);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragNode(null);
    setActiveDragEmployee(null);
    const { active, over } = event;

    if (!over) return;
    if (active.id === over.id) return;

    const activeId = active.id.toString();
    const overId = over.id.toString();

    if (activeId.startsWith("employee-") && overId.startsWith("node-")) {
      const employeeId = parseInt(activeId.replace("employee-", ""));
      const targetNodeId = parseInt(overId.replace("node-", ""));
      const targetNode = activeAllTreeNodes.find((node) => node.id === targetNodeId);
      startTransition(async () => {
        const result = targetNode?.isVirtual
          ? await updateOrgChartEmployeeProfile(employeeId, {
              orgNodeId: targetNode.virtualParentNodeId ?? null,
              workLocationId: targetNode.virtualWorkLocationId ?? null,
            })
          : await updateOrgChartEmployeeAssignment(employeeId, targetNodeId);
        if (result?.success) {
          toast.success("Orang berhasil dipindahkan");
          router.refresh();
        } else {
          toast.error(result?.message || "Gagal memindahkan orang");
        }
      });
      return;
    }

    const nodeId = parseInt(activeId.replace('node-', ''));
    let newParentId: number | null = null;

    if (over.id !== 'root-dropzone') {
      newParentId = parseInt(overId.replace('node-', ''));
    }

    startTransition(async () => {
      const result = await updateOrgNodeParent(nodeId, newParentId);
      if (result?.success) {
        toast.success("Node berhasil dipindahkan");
        router.refresh();
      } else {
        toast.error(result?.message || "Gagal memindahkan node");
      }
    });
  };

  const handleEditClick = (node: OrgTreeNode) => {
    setEditingNode(node);
    setFormData({
      code: node.code,
      name: node.name,
      nodeType: node.nodeType,
      departmentId: node.departmentId?.toString() || null,
      sectionId: node.sectionId?.toString() || null,
      siteId: node.siteId?.toString() || null,
    });
    setIsEditDialogOpen(true);
  };

  const handleCreateClick = (parentId: number | null = null) => {
    setCreatingParentId(parentId);
    setFormData({
      code: `NODE-${Math.floor(Math.random() * 10000)}`,
      name: "",
      nodeType: "position",
      departmentId: null,
      sectionId: null,
      siteId: null,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDeleteClick = (node: OrgTreeNode) => {
    setDeletingNode(node);
    setIsDeleteDialogOpen(true);
  };

  const handleEmployeeEditClick = (employee: OrgEmployee, currentNode: OrgTreeNode) => {
    const dbNodeId = currentNode.isVirtual ? currentNode.virtualParentNodeId : currentNode.id;
    setEditingEmployee({ employee, currentNode });
    setEmployeeFormData({
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      email: employee.email ?? "",
      departmentId: employee.departmentId?.toString() ?? "",
      sectionId: employee.sectionId?.toString() ?? "",
      siteId: employee.siteId?.toString() ?? "",
      workLocationId: (employee.workLocationId ?? currentNode.virtualWorkLocationId)?.toString() ?? "",
      positionId: employee.positionId?.toString() ?? "",
      orgNodeId: dbNodeId?.toString() ?? "",
    });
    setIsEmployeeDialogOpen(true);
  };

  // Submit handlers
  const onSaveEdit = async () => {
    if (!editingNode) return;

    startTransition(async () => {
      const payload = {
        name: formData.name,
        nodeType: formData.nodeType,
        departmentId: formData.departmentId ? parseInt(formData.departmentId) : null,
        sectionId: formData.sectionId ? parseInt(formData.sectionId) : null,
        siteId: formData.siteId ? parseInt(formData.siteId) : null,
      };

      const result = await updateOrgNode(editingNode.id, payload);
      if (result?.success) {
        toast.success(result.message || "Node berhasil disimpan");
        setIsEditDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result?.message || "Gagal menyimpan node");
      }
    });
  };

  const onSaveCreate = async () => {
    if (!formData.name || !formData.code) {
      toast.error("Code dan Nama wajib diisi");
      return;
    }

    startTransition(async () => {
      const payload = {
        code: formData.code,
        name: formData.name,
        nodeType: formData.nodeType,
        parentNodeId: creatingParentId,
        departmentId: formData.departmentId ? parseInt(formData.departmentId) : null,
        sectionId: formData.sectionId ? parseInt(formData.sectionId) : null,
        siteId: formData.siteId ? parseInt(formData.siteId) : null,
      };

      const result = await createOrgNode(payload);
      if (result?.success) {
        toast.success(result.message || "Node berhasil dibuat");
        setIsCreateDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result?.message || "Gagal membuat node");
      }
    });
  };

  const onConfirmDelete = async () => {
    if (!deletingNode) return;

    startTransition(async () => {
      const result = await deleteOrgNode(deletingNode.id);
      if (result?.success) {
        toast.success(result.message || "Node berhasil dihapus");
        setIsDeleteDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result?.message || "Gagal menghapus node");
      }
    });
  };

  const onSaveEmployeeProfile = async () => {
    if (!editingEmployee || !employeeFormData.employeeId || !employeeFormData.fullName) return;

    startTransition(async () => {
      const result = await updateOrgChartEmployeeProfile(editingEmployee.employee.id, {
        employeeId: employeeFormData.employeeId,
        fullName: employeeFormData.fullName,
        email: employeeFormData.email || null,
        departmentId: employeeFormData.departmentId ? parseInt(employeeFormData.departmentId) : null,
        sectionId: employeeFormData.sectionId ? parseInt(employeeFormData.sectionId) : null,
        siteId: employeeFormData.siteId ? parseInt(employeeFormData.siteId) : null,
        workLocationId: employeeFormData.workLocationId ? parseInt(employeeFormData.workLocationId) : null,
        positionId: employeeFormData.positionId ? parseInt(employeeFormData.positionId) : null,
        orgNodeId: employeeFormData.orgNodeId ? parseInt(employeeFormData.orgNodeId) : null,
      });
      if (result?.success) {
        toast.success(result.message || "Profil karyawan berhasil disimpan");
        setIsEmployeeDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result?.message || "Gagal menyimpan profil karyawan");
      }
    });
  };

  // Root droppable zone setup
  const { setNodeRef: setRootDropRef, isOver: isRootOver } = useDroppable({
    id: 'root-dropzone',
  });

  const scorecards = [
    { label: "Org Nodes", value: stats.totalNodes, description: "Unit struktur aktif", tone: "info" as const, icon: <GitBranch className="size-5" /> },
    { label: "Employees", value: stats.totalEmployeesAssigned, description: "Karyawan terhubung", tone: "success" as const, icon: <Users className="size-5" /> },
    { label: "Departments", value: stats.departments, description: "Departemen dalam struktur", tone: "default" as const, icon: <Building2 className="size-5" /> },
    { label: "Root Nodes", value: stats.rootNodes, description: "Node level teratas", tone: "warning" as const, icon: <GitBranch className="size-5" /> },
  ];

  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button,input,textarea,select,[role='button'],[data-no-pan='true']")) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: canvas.scrollLeft,
      scrollTop: canvas.scrollTop,
    };
    setIsCanvasPanning(true);
    canvas.setPointerCapture(event.pointerId);
  };

  const handleCanvasPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isCanvasPanning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const deltaX = event.clientX - panStartRef.current.x;
    const deltaY = event.clientY - panStartRef.current.y;
    canvas.scrollLeft = panStartRef.current.scrollLeft - deltaX;
    canvas.scrollTop = panStartRef.current.scrollTop - deltaY;
  };

  const stopCanvasPan = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isCanvasPanning) return;
    setIsCanvasPanning(false);
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };

  return (
    <AdminPageShell eyebrow="HC • Org Chart" title="PDF-Style Organization Chart" description="Visualisasi struktur organisasi bergaya PDF, tetap editable dengan action node dan drag & drop reparenting.">
      <HcWorkspaceBanner
        title="Organization Structure Studio"
        description="Struktur organisasi dan site dibuat seperti kanvas kerja HC: filter jelas, kontrol node ringkas, dan visual tetap bersih untuk review pimpinan."
        items={[
          { label: "Node", value: stats.totalNodes, tone: "slate" },
          { label: "Departemen", value: referenceData.departments.length, tone: "sky" },
          { label: "Site", value: referenceData.sites.length, tone: "emerald" },
        ]}
      />
      <div className="space-y-6">
        <EnterpriseScorecards items={scorecards} />

        <Card className="overflow-hidden border-slate-200/60 shadow-sm">
          <CardHeader className="gap-4 border-b bg-white pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">Struktur Organisasi (PDF-Style Editable)</CardTitle>
              <CardDescription>{chartTab === "site" ? "Struktur Site: Technical/PJO membawahi Repair dan Service; HSE sebagai pendamping site." : "Root di atas, child berjajar horizontal seperti PDF. Lokasi tampil sebagai keterangan di tiap user."}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold text-slate-600">
                <button type="button" onClick={() => setChartTab("organization")} className={"rounded-lg px-3 py-1.5 transition " + (chartTab === "organization" ? "bg-white text-slate-950 shadow-sm" : "hover:text-slate-900")}>Org Structure</button>
                <button type="button" onClick={() => setChartTab("site")} className={"rounded-lg px-3 py-1.5 transition " + (chartTab === "site" ? "bg-white text-slate-950 shadow-sm" : "hover:text-slate-900")}>Struktur Site</button>
              </div>
              {chartTab === "organization" && (
                <>
                  <Select value={departmentFilterId} onValueChange={(value) => { setDepartmentFilterId(value); setSectionFilterId("all"); }}>
                    <SelectTrigger className="h-9 w-[210px] bg-white"><SelectValue placeholder="Filter department" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Department</SelectItem>
                      {referenceData.departments.map((department) => (
                        <SelectItem key={department.id} value={department.id.toString()}>{getDepartmentFilterLabel(department.name)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sectionFilterId} onValueChange={setSectionFilterId}>
                    <SelectTrigger className="h-9 w-[210px] bg-white"><SelectValue placeholder="Filter section" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Section</SelectItem>
                      {sectionFilterOptions.map((section) => (
                        <SelectItem key={section.id} value={section.id.toString()}>{section.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              {chartTab === "site" && (
                <Select value={siteGroupKey} onValueChange={setSiteGroupKey}>
                  <SelectTrigger className="h-9 w-[210px] bg-white"><SelectValue placeholder="Filter lokasi kerja" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Lokasi Kerja</SelectItem>
                    {siteGroupOptions.map((location) => (
                      <SelectItem key={location.key} value={location.key}>{location.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari node..." className="pl-9 h-9" />
              </div>
              {chartTab === "organization" && (
                <Button onClick={() => handleCreateClick(null)} size="sm" className="gap-1.5 shrink-0 shadow-sm">
                  <Plus className="size-4" /> Root Node
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div
              ref={canvasRef}
              className={"relative max-h-[72vh] min-h-[560px] overflow-auto bg-[#f8fafc] select-none " + (isCanvasPanning ? "cursor-grabbing" : "cursor-grab")}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={stopCanvasPan}
              onPointerCancel={stopCanvasPan}
              onPointerLeave={stopCanvasPan}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.08)_1px,transparent_0)] [background-size:24px_24px]" />
              <div className="relative min-w-max p-8 pl-24 pr-24">
                {isPending && (
                  <div className="sticky left-0 top-0 z-20 h-1 overflow-hidden bg-primary/20">
                    <div className="h-full w-1/3 animate-pulse bg-primary" />
                  </div>
                )}

                <div data-no-pan="true" className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-xs text-slate-600 shadow-sm backdrop-blur">
                  <span className="font-semibold text-slate-900">Legend:</span>
                  <span className="rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white">BOD / EXECUTIVE</span>
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 font-semibold text-sky-800">MANAGERIAL</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">SUPERVISORY</span>
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 font-semibold text-violet-800">WORK LOCATION / SITE</span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">PEOPLE / UNIT</span>
                  <span className="ml-auto hidden text-slate-500 lg:inline">{chartTab === "site" ? "Struktur Site: Site → Technical/PJO → Repair/Service; HSE pendamping." : "Urutan: Department → Section → Work Location/Site → Orang."}</span>
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  {filteredTree.length > 0 ? (
                    <div className="flex min-h-[420px] items-start justify-start gap-20 pb-10">
                      {filteredTree.map((node) => (
                        <InteractiveTreeNode
                          key={node.id}
                          node={node}
                          onEdit={handleEditClick}
                          onDelete={handleDeleteClick}
                          onAddChild={handleCreateClick}
                          onEditEmployee={handleEmployeeEditClick}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 shadow-sm">
                      <GitBranch className="mx-auto mb-3 size-10 text-slate-300" />
                      <p className="font-medium text-slate-700">{chartTab === "site" ? "Belum ada struktur site" : "Belum ada struktur organisasi"}</p>
                      <p className="mb-4 mt-1 text-sm">{chartTab === "site" ? "Tidak ada karyawan untuk filter lokasi ini." : "Mulai dengan membuat root node pertama Anda"}</p>
                      {chartTab === "organization" && (
                        <Button onClick={() => handleCreateClick(null)} variant="outline" className="shadow-sm">
                          <Plus className="mr-2 size-4" /> Buat Root Node
                        </Button>
                      )}
                    </div>
                  )}

                  <div
                    ref={setRootDropRef}
                    className={"mx-auto mt-6 flex h-20 max-w-xl items-center justify-center rounded-2xl border-2 border-dashed text-sm transition-all " +
                      (isRootOver ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white/70 text-slate-500") +
                      (activeDragNode ? " opacity-100" : " pointer-events-none h-0 overflow-hidden border-0 opacity-0")
                    }
                  >
                    Drop di sini untuk jadikan Root Node (Level 0)
                  </div>

                  <DragOverlay dropAnimation={{ duration: 250, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
                    {activeDragNode ? (
                      <div className="w-[380px] rotate-2 rounded-2xl border border-primary/50 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                          <GripVertical className="size-4 text-primary" />
                          <h3 className="font-semibold text-slate-900">{activeDragNode.name}</h3>
                          <Badge variant="secondary" className="ml-auto text-[10px]">{activeDragNode.nodeType}</Badge>
                        </div>
                      </div>
                    ) : activeDragEmployee ? (
                      <div className="w-[320px] rotate-2 rounded-xl border border-blue-200 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
                        <p className="truncate text-sm font-semibold text-slate-900">{activeDragEmployee.fullName}</p>
                        <p className="truncate text-xs text-slate-500">{activeDragEmployee.employeeId} • {activeDragEmployee.positionName ?? "-"}</p>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* EMPLOYEE PROFILE DIALOG */}
      <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Edit Profil Orang</DialogTitle>
            <DialogDescription>Ubah profil, jabatan, lokasi, dan kotak struktur. Atasan langsung otomatis dibaca dari struktur organisasi.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-3">
              <div>
                <Label className="text-xs text-slate-500">Atasan Langsung Otomatis</Label>
                <p className="mt-1 text-sm font-semibold text-slate-900">{directSupervisor?.fullName ?? "Belum ada di struktur"}</p>
                <p className="text-xs text-slate-500">{directSupervisor?.positionName ?? "Tambahkan Manager/SPV/Leader di parent/section terkait"}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Kotak Saat Ini</Label>
                <p className="mt-1 text-sm font-semibold text-slate-900">{editingEmployee?.currentNode.name ?? "-"}</p>
                <p className="text-xs text-slate-500">Drag kartu user ke kotak lain untuk pindah cepat.</p>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Role Terdeteksi</Label>
                <p className="mt-1 text-sm font-semibold text-slate-900">{selectedRoleGroup.label}</p>
                <p className="text-xs text-slate-500">Berdasarkan jabatan yang dipilih.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Employee ID</Label>
                <Input value={employeeFormData.employeeId} onChange={(event) => setEmployeeFormData({ ...employeeFormData, employeeId: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input value={employeeFormData.fullName} onChange={(event) => setEmployeeFormData({ ...employeeFormData, fullName: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={employeeFormData.email} onChange={(event) => setEmployeeFormData({ ...employeeFormData, email: event.target.value })} placeholder="email@company.com" />
              </div>
              <div className="space-y-2">
                <Label>Jabatan</Label>
                <Select value={employeeFormData.positionId || "none"} onValueChange={(value) => setEmployeeFormData({ ...employeeFormData, positionId: value === "none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Pilih jabatan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa jabatan</SelectItem>
                    {referenceData.positions.map((position) => (
                      <SelectItem key={position.id} value={position.id.toString()}>{position.levelName} • {position.rankName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Select value={employeeFormData.departmentId || "none"} onValueChange={(value) => setEmployeeFormData({ ...employeeFormData, departmentId: value === "none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Pilih department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa department</SelectItem>
                    {referenceData.departments.map((department) => (
                      <SelectItem key={department.id} value={department.id.toString()}>{department.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Section</Label>
                <Select value={employeeFormData.sectionId || "none"} onValueChange={(value) => setEmployeeFormData({ ...employeeFormData, sectionId: value === "none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Pilih section" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa section</SelectItem>
                    {referenceData.sections.map((section) => (
                      <SelectItem key={section.id} value={section.id.toString()}>{section.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Site</Label>
                <Select value={employeeFormData.siteId || "none"} onValueChange={(value) => setEmployeeFormData({ ...employeeFormData, siteId: value === "none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Pilih site" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa site</SelectItem>
                    {referenceData.sites.map((site) => (
                      <SelectItem key={site.id} value={site.id.toString()}>{site.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Work Location</Label>
                <Select value={employeeFormData.workLocationId || "none"} onValueChange={(value) => setEmployeeFormData({ ...employeeFormData, workLocationId: value === "none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Pilih lokasi kerja" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa lokasi kerja</SelectItem>
                    {referenceData.workLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>{location.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Kotak Struktur</Label>
                <Select value={employeeFormData.orgNodeId || "none"} onValueChange={(value) => setEmployeeFormData({ ...employeeFormData, orgNodeId: value === "none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Pilih kotak struktur" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa kotak struktur</SelectItem>
                    {selectableNodes.map((node) => (
                      <SelectItem key={node.id} value={node.id.toString()}>{"—".repeat(Math.max(0, node.hierarchyLevel))} {node.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmployeeDialogOpen(false)} disabled={isPending}>Batal</Button>
            <Button onClick={onSaveEmployeeProfile} disabled={isPending || !employeeFormData.employeeId || !employeeFormData.fullName}>
              {isPending ? "Menyimpan..." : "Simpan Profil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Org Node</DialogTitle>
            <DialogDescription>Update properties untuk node organisasi ini. Perubahan akan disimpan ke database.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={formData.code} disabled className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nama Node</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipe Node</Label>
              <Select value={formData.nodeType} onValueChange={(v) => setFormData({...formData, nodeType: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="section">Section</SelectItem>
                  <SelectItem value="unit">Unit</SelectItem>
                  <SelectItem value="position">Position</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label>Dept ID</Label>
                <Input type="number" value={formData.departmentId || ''} onChange={(e) => setFormData({...formData, departmentId: e.target.value})} placeholder="Opsional" />
              </div>
              <div className="space-y-2">
                <Label>Section ID</Label>
                <Input type="number" value={formData.sectionId || ''} onChange={(e) => setFormData({...formData, sectionId: e.target.value})} placeholder="Opsional" />
              </div>
            </div>

            <Alert className="col-span-1 bg-amber-50 text-amber-800 border-amber-200 mt-2">
              <AlertTriangle className="size-4 text-amber-600" />
              <AlertDescription className="text-xs">
                Perubahan pada Department atau Section akan diaplikasikan juga ke semua karyawan yang ditugaskan pada node ini (Cascade Update). Lokasi tetap ditampilkan sebagai keterangan karyawan.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isPending}>Batal</Button>
            <Button onClick={onSaveEdit} disabled={isPending || !formData.name}>
              {isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE DIALOG */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{creatingParentId ? "Buat Child Node" : "Buat Root Node"}</DialogTitle>
            <DialogDescription>Tambahkan node baru ke dalam struktur organisasi.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} placeholder="Misal: NODE-123" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name-new">Nama Node</Label>
                <Input id="name-new" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Nama node" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipe Node</Label>
              <Select value={formData.nodeType} onValueChange={(v) => setFormData({...formData, nodeType: v})}>
                <SelectTrigger><SelectValue placeholder="Pilih tipe" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="section">Section</SelectItem>
                  <SelectItem value="unit">Unit</SelectItem>
                  <SelectItem value="position">Position</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isPending}>Batal</Button>
            <Button onClick={onSaveCreate} disabled={isPending || !formData.name || !formData.code}>
              {isPending ? "Membuat..." : "Buat Node"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="size-5" /> Hapus Node Organisasi
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus node <strong>{deletingNode?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600 mb-4">
              Penghapusan hanya dapat dilakukan jika node ini <strong>tidak memiliki child nodes</strong> dan <strong>tidak ada karyawan</strong> yang sedang ditugaskan ke node ini.
            </p>
            {deletingNode && (deletingNode.children.length > 0 || deletingNode.employeeCount > 0) && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertDescription>
                  Node ini tidak bisa dihapus karena masih memiliki {deletingNode.children.length} child nodes dan {deletingNode.employeeCount} karyawan.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isPending}>Batal</Button>
            <Button
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={isPending || (deletingNode ? deletingNode.children.length > 0 || deletingNode.employeeCount > 0 : true)}
            >
              {isPending ? "Menghapus..." : "Ya, Hapus Node"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}

