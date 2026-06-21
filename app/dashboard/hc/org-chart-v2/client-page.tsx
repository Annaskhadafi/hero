"use client";

import { useMemo, useRef, useState } from "react";
import {
  Building2,
  Crown,
  GitBranch,
  Search,
  UserRound,
  Users,
  ChevronDown,
  ChevronRight,
  Shield,
} from "lucide-react";

import { AdminPageShell } from "@/components/admin-page-shell";
import { HcWorkspaceBanner } from "@/components/hc/hc-workspace-banner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EnterpriseScorecards } from "@/components/ui/enterprise-table-kit";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

type Stats = {
  totalNodes: number;
  totalEmployeesAssigned: number;
  departments: number;
  sections: number;
  rootNodes: number;
};

type ReferenceData = {
  departments: Array<{
    id: number;
    name: string;
    headEmployeeId: number | null;
    headEmployeeName: string | null;
  }>;
  sections: Array<{
    id: number;
    name: string;
    departmentId: number | null;
    parentId: number | null;
    headEmployeeId: number | null;
    headEmployeeName: string | null;
  }>;
  sites: Array<{ id: number; name: string }>;
  workLocations: Array<{ id: number; name: string }>;
  positions: Array<{ id: number; rankName: string; levelName: string }>;
  levelStaffs: Array<{ name: string; sortOrder: number }>;
};

type OrgEmployee = OrgNode["employees"][number];

type SectionNode = {
  id: number;
  name: string;
  headEmployee: OrgEmployee | null;
  members: OrgEmployee[];
  children: SectionNode[];
  _departmentId: number | null;
  _parentId: number | null;
  locationGroups?: { name: string; employees: OrgEmployee[] }[];
};

type DepartmentCard = {
  id: number;
  name: string;
  headEmployee: OrgEmployee | null;
  sections: SectionNode[];
  unsectioned: OrgEmployee[];
};

type ExecutiveNode = {
  id: string;
  title: string;
  employee: OrgEmployee | null;
  children: ExecutiveNode[];
};

// Executive hierarchy: Director > Board Secretary + General Manager
// Employee matching by ID from hrEmployees
const EXECUTIVE_HIERARCHY = {
  director: { title: "DIRECTOR", employeeId: 1 },       // Hidayat Rahman
  boardSecretary: { title: "BOARD SECRETARY", employeeId: 37 }, // Freshya Ochtovita
  generalManager: { title: "GENERAL MANAGER", employeeId: 2 },  // Person Sihaloho
};

// Departments that report to GM (exclude BoD/Executive and test departments)
const DEPT_EXCLUDE_CODES = new Set(["1", "TES", "26"]);
// Central Services department ID - special handling: grouped by location
const CENTRAL_SERVICES_DEPT_ID = 2;
// Map departmentId -> display order (matching the org chart image)
const DEPT_ORDER: Record<number, number> = {
  4: 0,  // Finance Business Partners
  5: 1,  // Human Capital
  6: 2,  // Legal & ERM
  9: 3,  // Supply Chain Management
  8: 4,  // Sales Operation
  3: 5,  // Continuous Process Improvement & IA Reps
  10: 6, // Support Facilities Management
  2: 7,  // Central Services
};

// --- Helpers ---

function normalizeLabel(value: string) {
  return value.trim().toLocaleLowerCase("id-ID").replace(/[\s_-]+/g, " ");
}

// --- Role Groups ---

const LEVEL_ORDER: Record<string, number> = {
  "bod/executive": 0, bod: 0, executive: 0,
  manager: 1, supervisor: 2, coordinator: 3,
  leader: 4, "sub leader": 5, staff: 6, "non staff": 7,
};

function getLevelOrder(levelName: string | null | undefined): number {
  const key = (levelName ?? "").toLowerCase().trim().replace(/[\s_-]+/g, " ");
  for (const [pattern, order] of Object.entries(LEVEL_ORDER)) {
    if (key.includes(pattern)) return order;
  }
  return 8;
}

type RoleGroup = { key: string; label: string; order: number; className: string };

function getEmployeeRoleGroup(employee: OrgEmployee): RoleGroup {
  const level = (employee.levelName ?? "").toLowerCase().trim();
  const position = (employee.positionName ?? "").toLowerCase();

  if (level === "staff") return { key: "staff", label: "STAFF", order: 6, className: "bg-slate-100 text-slate-700 ring-slate-200" };
  if (level === "non staff" || level === "non_staff" || level === "nonstaff") return { key: "nonstaff", label: "NON STAFF", order: 7, className: "bg-orange-100 text-orange-800 ring-orange-200" };
  if (level === "sub leader" || level === "sub_leader") return { key: "sub_leader", label: "SUB LEADER", order: 5, className: "bg-indigo-100 text-indigo-800 ring-indigo-200" };
  if (level === "leader") return { key: "leader", label: "LEADER", order: 4, className: "bg-violet-100 text-violet-800 ring-violet-200" };
  if (level === "coordinator" || level === "koordinator") return { key: "coordinator", label: "COORDINATOR", order: 3, className: "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200" };
  if (level === "supervisor") return { key: "spv", label: "SUPERVISORY", order: 2, className: "bg-emerald-100 text-emerald-800 ring-emerald-200" };
  if (level === "manager") return { key: "manager", label: "MANAGER", order: 1, className: "bg-sky-100 text-sky-800 ring-sky-200" };
  if (level === "bod/executive" || level === "bod" || level === "executive") return { key: "bod", label: "BOD / EXECUTIVE", order: 0, className: "bg-slate-900 text-white ring-slate-700" };

  if (level.includes("bod") || level.includes("executive") || /director|general manager|gm|board secretary/i.test(position)) return { key: "bod", label: "BOD / EXECUTIVE", order: 0, className: "bg-slate-900 text-white ring-slate-700" };
  if (level.includes("manager") || /(^|\b)(manager|mgr|kepala departemen|department head)(\b|$)/i.test(position)) return { key: "manager", label: "MANAGER", order: 1, className: "bg-sky-100 text-sky-800 ring-sky-200" };
  if (level.includes("supervisor") || /(supervisor|spv|supervisi)/i.test(position)) return { key: "spv", label: "SUPERVISORY", order: 2, className: "bg-emerald-100 text-emerald-800 ring-emerald-200" };
  if (level.includes("coordinator") || level.includes("koordinator") || /(coordinator|koordinator)/i.test(position)) return { key: "coordinator", label: "COORDINATOR", order: 3, className: "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200" };
  if (level.includes("sub leader") || level.includes("sub_leader") || /(sub leader|sublead)/i.test(position)) return { key: "sub_leader", label: "SUB LEADER", order: 5, className: "bg-indigo-100 text-indigo-800 ring-indigo-200" };
  if (level.includes("leader") || /(leader|lead|head|foreman|chief)/i.test(position)) return { key: "leader", label: "LEADER", order: 4, className: "bg-violet-100 text-violet-800 ring-violet-200" };
  if (level.includes("non staff") || level.includes("non_staff") || level.includes("nonstaff") || /non.?staff|operator|helper|security|driver|office boy|ob\b/i.test(position)) return { key: "nonstaff", label: "NON STAFF", order: 7, className: "bg-orange-100 text-orange-800 ring-orange-200" };

  return { key: "staff", label: "STAFF", order: 6, className: "bg-slate-100 text-slate-700 ring-slate-200" };
}

function groupEmployeesByRole(employees: OrgEmployee[]) {
  const groups = new Map<string, { label: string; order: number; className: string; employees: OrgEmployee[] }>();
  const seen = new Set<number>();
  const unique = employees.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
  for (const employee of unique) {
    const role = getEmployeeRoleGroup(employee);
    const group = groups.get(role.key) ?? { label: role.label, order: role.order, className: role.className, employees: [] };
    group.employees.push(employee);
    groups.set(role.key, group);
  }
  return Array.from(groups.values())
    .map((g) => ({
      ...g,
      employees: g.employees.sort(
        (a, b) => getLevelOrder(a.levelName) - getLevelOrder(b.levelName) || a.fullName.localeCompare(b.fullName, "id-ID"),
      ),
    }))
    .sort((a, b) => a.order - b.order);
}

// --- Build Department Cards ---

function buildOrgData(nodes: OrgNode[], referenceData: ReferenceData, allEmployees: OrgEmployee[]) {
  const usedEmpIds = new Set<number>();

  // === Build Executive Tree ===
  const execLookup = new Map<number, OrgEmployee>();
  for (const emp of allEmployees) {
    execLookup.set(emp.id, emp);
  }

  const director = execLookup.get(EXECUTIVE_HIERARCHY.director.employeeId) ?? null;
  const boardSec = execLookup.get(EXECUTIVE_HIERARCHY.boardSecretary.employeeId) ?? null;
  const gm = execLookup.get(EXECUTIVE_HIERARCHY.generalManager.employeeId) ?? null;

  if (director) usedEmpIds.add(director.id);
  if (boardSec) usedEmpIds.add(boardSec.id);
  if (gm) usedEmpIds.add(gm.id);

  const executiveTree: ExecutiveNode = {
    id: "director",
    title: EXECUTIVE_HIERARCHY.director.title,
    employee: director,
    children: [
      {
        id: "board-secretary",
        title: EXECUTIVE_HIERARCHY.boardSecretary.title,
        employee: boardSec,
        children: [],
      },
      {
        id: "general-manager",
        title: EXECUTIVE_HIERARCHY.generalManager.title,
        employee: gm,
        children: [], // departments will be rendered separately under GM
      },
    ],
  };

  // === Build Section Nodes ===
  const sectionNodes: SectionNode[] = referenceData.sections.map((masterSect) => {
    let headEmployee: OrgEmployee | null = null;
    if (masterSect.headEmployeeId) {
      const candidate = allEmployees.find((e) => e.id === masterSect.headEmployeeId) ?? null;
      if (candidate && candidate.sectionId === masterSect.id) {
        headEmployee = candidate;
        usedEmpIds.add(headEmployee.id);
      }
    }

    const members = allEmployees.filter((e) => e.sectionId === masterSect.id && e.id !== headEmployee?.id);
    const uniqueMembers: OrgEmployee[] = [];
    const memberSeen = new Set<number>();
    for (const emp of members) {
      if (!memberSeen.has(emp.id)) {
        memberSeen.add(emp.id);
        uniqueMembers.push(emp);
        usedEmpIds.add(emp.id);
      }
    }

    return {
      id: masterSect.id,
      name: masterSect.name,
      headEmployee,
      members: uniqueMembers,
      children: [] as SectionNode[],
      _departmentId: masterSect.departmentId,
      _parentId: masterSect.parentId,
    };
  });

  // Build section hierarchy
  const sectionMap = new Map(sectionNodes.map((s) => [s.id, s]));
  const rootSections: SectionNode[] = [];
  for (const section of sectionNodes) {
    if (section._parentId && sectionMap.has(section._parentId)) {
      sectionMap.get(section._parentId)!.children.push(section);
    } else {
      rootSections.push(section);
    }
  }

  // === Build Department Cards ===
  const deptMap = new Map<number, DepartmentCard>();
  for (const dept of referenceData.departments) {
    // Exclude BoD/Executive and test departments
    if (DEPT_EXCLUDE_CODES.has(dept.id.toString())) continue;
    if (DEPT_EXCLUDE_CODES.has(dept.name)) continue;

    deptMap.set(dept.id, {
      id: dept.id,
      name: dept.name,
      headEmployee: null,
      sections: [],
      unsectioned: [],
    });
  }

  // Attach root sections
  for (const section of rootSections) {
    const deptId = section._departmentId;
    if (deptId && deptMap.has(deptId)) {
      deptMap.get(deptId)!.sections.push(section);
    }
  }

  // Set department head
  for (const dept of referenceData.departments) {
    if (dept.headEmployeeId) {
      const card = deptMap.get(dept.id);
      if (card) {
        const candidate = allEmployees.find((e) => e.id === dept.headEmployeeId) ?? null;
        if (candidate && candidate.departmentId === dept.id) {
          card.headEmployee = candidate;
          usedEmpIds.add(card.headEmployee.id);
        }
      }
    }
  }

  // Unsectioned employees
  const unsectioned = allEmployees.filter((e) => !usedEmpIds.has(e.id));
  for (const emp of unsectioned) {
    const deptId = emp.departmentId;
    if (deptId && deptMap.has(deptId)) {
      deptMap.get(deptId)!.unsectioned.push(emp);
    }
  }

  // Filter and sort
  function sectionHasContent(s: SectionNode): boolean {
    return !!(s.headEmployee || s.members.length > 0) || s.children.some(sectionHasContent);
  }
  function deptHasContent(d: DepartmentCard): boolean {
    return !!(d.headEmployee || d.sections.some(sectionHasContent) || d.unsectioned.length > 0);
  }

  const departments = Array.from(deptMap.values()).filter(deptHasContent);
  departments.sort((a, b) => (DEPT_ORDER[a.id] ?? 99) - (DEPT_ORDER[b.id] ?? 99) || a.name.localeCompare(b.name, "id-ID"));

  // Build location groups for Central Services
  for (const dept of departments) {
    if (dept.id === CENTRAL_SERVICES_DEPT_ID) {
      buildLocationGroups(dept);
    }
  }

  return { executiveTree, departments };
}

// Build location-based grouping per Section for Central Services
function buildLocationGroups(dept: DepartmentCard): void {
  for (const section of dept.sections) {
    // Collect all employees from this section (head + members)
    const allEmps: OrgEmployee[] = [];
    if (section.headEmployee) allEmps.push(section.headEmployee);
    allEmps.push(...section.members);

    // Group by siteName
    const byLocation = new Map<string, OrgEmployee[]>();
    for (const emp of allEmps) {
      const loc = emp.siteName || "Lainnya";
      if (!byLocation.has(loc)) byLocation.set(loc, []);
      byLocation.get(loc)!.push(emp);
    }

    // Only add location groups if there are multiple locations
    if (byLocation.size > 1) {
      section.locationGroups = Array.from(byLocation.entries())
        .map(([name, employees]) => ({ name, employees }))
        .sort((a, b) => a.name.localeCompare(b.name, "id-ID"));
    }
  }
}

function getTotalDeptMembers(dept: DepartmentCard): number {
  function sectionTotal(s: SectionNode): number {
    return s.members.length + s.children.reduce((sum, c) => sum + sectionTotal(c), 0);
  }
  return (dept.headEmployee ? 1 : 0) + dept.sections.reduce((sum, s) => sum + sectionTotal(s), 0) + dept.unsectioned.length;
}

function getTotalSectionMembers(s: SectionNode): number {
  return s.members.length + s.children.reduce((sum, c) => sum + getTotalSectionMembers(c), 0);
}

// --- Components ---

function EmployeeCard({ employee }: { employee: OrgEmployee }) {
  const role = getEmployeeRoleGroup(employee);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white/90 p-2 text-left shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-900">{employee.fullName}</p>
        <p className="truncate text-[10px] text-slate-500">
          {employee.employeeId} • {employee.positionName ?? employee.levelName ?? "-"}
        </p>
        {(employee.siteName || employee.workLocationName) && (
          <p className="truncate text-[10px] text-slate-400">
            {[employee.siteName, employee.workLocationName].filter(Boolean).join(" • ")}
          </p>
        )}
        <span className={"mt-1 inline-flex rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ring-1 " + role.className}>
          {role.label}
        </span>
      </div>
    </div>
  );
}

function SectionNodeComponent({
  section,
  expanded,
  onToggle,
  seenHeadIds,
  depth,
}: {
  section: SectionNode;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  seenHeadIds: Set<number>;
  depth: number;
}) {
  const isExpanded = expanded.has(section.id);
  const total = getTotalSectionMembers(section);
  const headShown = section.headEmployee ? seenHeadIds.has(section.headEmployee.id) : false;
  const showHead = section.headEmployee && !headShown;
  const currentSeen = new Set(seenHeadIds);
  if (showHead && section.headEmployee) currentSeen.add(section.headEmployee.id);
  const hasLocationGroups = !!(section.locationGroups && section.locationGroups.length > 0);
  const roleGroups = groupEmployeesByRole(section.members);
  const hasContent = !!(section.headEmployee || section.members.length > 0 || section.children.some((c) => getTotalSectionMembers(c) > 0));
  if (!hasContent) return null;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="group relative w-[340px] rounded-xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
        <button className="mx-auto block max-w-[240px] text-balance pt-1 text-sm font-bold leading-tight hover:underline" onClick={() => onToggle(section.id)} type="button">
          {section.name}
        </button>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200">
            {depth === 0 ? "SECTION" : "SUB-SECTION"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600 ring-1 ring-slate-200/80">
            <Users className="size-2.5" /> {total}
          </span>
          {hasLocationGroups && (
            <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700 ring-1 ring-violet-200">
              {isExpanded ? "\u2212" : "+"} {section.locationGroups!.length} lokasi
            </span>
          )}
          {!hasLocationGroups && section.children.length > 0 && (
            <span className="rounded-full bg-emerald-100/60 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-200">
              {isExpanded ? "\u2212" : "+"} {section.children.length}
            </span>
          )}
        </div>

        {showHead && section.headEmployee && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2">
            <Crown className="size-3.5 shrink-0 text-amber-500" />
            <div className="min-w-0 text-left">
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[7px] font-bold uppercase text-amber-700 ring-1 ring-amber-200">HEAD</span>
              <p className="truncate text-xs font-bold">{section.headEmployee.fullName}</p>
              <p className="truncate text-[9px] text-slate-500">{section.headEmployee.positionName ?? section.headEmployee.levelName ?? "-"}</p>
            </div>
          </div>
        )}

        {/* Members: location groups or flat */}
        {isExpanded && hasLocationGroups && (
          <div className="mt-2 grid gap-1.5 text-left">
            {section.locationGroups!.map((loc) => (
              <div key={loc.name} className="rounded-lg border border-violet-200 bg-white/60 p-2">
                <div className="flex items-center gap-1 mb-1">
                  <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-violet-700 ring-1 ring-violet-200">LOCATION</span>
                  <span className="text-[9px] font-semibold text-slate-600">{loc.name}</span>
                  <span className="text-[8px] text-slate-400 ml-auto">{loc.employees.length}</span>
                </div>
                {groupEmployeesByRole(loc.employees).map((group) => (
                  <div key={group.label} className="grid gap-1 ml-1">
                    <div className="flex items-center justify-between">
                      <span className={"rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase ring-1 " + group.className}>{group.label}</span>
                      <span className="text-[7px] text-slate-400">{group.employees.length}</span>
                    </div>
                    {group.employees.map((emp) => (
                      <EmployeeCard key={`${group.label}-${emp.id}`} employee={emp} />
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {isExpanded && !hasLocationGroups && roleGroups.length > 0 && (
          <div className="mt-2 grid gap-1 text-left">
            {roleGroups.map((group) => (
              <div key={group.label} className="grid gap-1">
                <div className="flex items-center justify-between">
                  <span className={"rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ring-1 " + group.className}>{group.label}</span>
                  <span className="text-[8px] text-slate-400">{group.employees.length}</span>
                </div>
                {group.employees.map((emp) => (
                  <EmployeeCard key={`${group.label}-${emp.id}`} employee={emp} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {isExpanded && section.children.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="h-6 w-px bg-emerald-300" />
          <div className="relative flex items-start justify-start gap-8 px-6 pt-6">
            <div className="absolute left-3 right-3 top-0 h-px bg-emerald-300" />
            {section.children.map((child, idx) => (
              <div key={`${child.id}-${idx}`} className="relative flex flex-col items-center">
                <div className="absolute -top-6 h-6 w-px bg-emerald-300" />
                <SectionNodeComponent section={child} expanded={expanded} onToggle={onToggle} seenHeadIds={currentSeen} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExecutiveCard({ node, isLast }: { node: ExecutiveNode; isLast?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="group relative w-[280px] rounded-2xl border-2 border-slate-400 bg-slate-900 p-3 shadow-md">
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white ring-1 ring-white/20">
          {node.title}
        </span>
        {node.employee ? (
          <div className="mt-2">
            <p className="text-sm font-bold text-white">{node.employee.fullName}</p>
            <p className="text-[10px] text-slate-300">{node.employee.positionName ?? node.employee.levelName ?? "-"}</p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-400 italic">Belum ditentukan</p>
        )}
      </div>

      {node.children.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="h-8 w-px bg-slate-400" />
          <div className="relative flex items-start justify-start gap-12 px-8 pt-8">
            <div className="absolute left-4 right-4 top-0 h-px bg-slate-400" />
            {node.children.map((child, idx) => (
              <div key={`${child.id}-${idx}`} className="relative flex flex-col items-center">
                <div className="absolute -top-8 h-8 w-px bg-slate-400" />
                <ExecutiveCard node={child} isLast={idx === node.children.length - 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DepartmentCardComponent({
  dept,
  expanded,
  onToggle,
  seenHeadIds,
}: {
  dept: DepartmentCard;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  seenHeadIds: Set<number>;
}) {
  const isExpanded = expanded.has(dept.id);
  const total = getTotalDeptMembers(dept);
  const headShown = dept.headEmployee ? seenHeadIds.has(dept.headEmployee.id) : false;
  const showHead = dept.headEmployee && !headShown;
  const currentSeen = new Set(seenHeadIds);
  if (showHead && dept.headEmployee) currentSeen.add(dept.headEmployee.id);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="group relative w-[400px] rounded-2xl border border-sky-200 bg-sky-50 p-3 shadow-sm">
        <button className="mx-auto block max-w-[260px] text-balance pt-2 text-base font-bold leading-tight hover:underline" onClick={() => onToggle(dept.id)} type="button">
          {dept.name}
        </button>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
          <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-800 ring-1 ring-sky-200">
            <Building2 className="mr-0.5 inline size-2.5" /> DEPARTMENT
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200/80">
            <Users className="size-3" /> Total {total}
          </span>
          {dept.sections.length > 0 && (
            <span className="rounded-full bg-sky-100/60 px-2 py-0.5 text-[9px] font-bold text-sky-700 ring-1 ring-sky-200">
              {isExpanded ? "\u2212" : "+"} {dept.sections.length} section
            </span>
          )}
        </div>

        {showHead && dept.headEmployee && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border-2 border-amber-300/50 bg-amber-50/60 p-2.5 shadow-md">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Crown className="size-4 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[7px] font-bold uppercase text-amber-700 ring-1 ring-amber-200">DEPT HEAD</span>
              <p className="truncate text-sm font-bold">{dept.headEmployee.fullName}</p>
              <p className="truncate text-[10px] text-slate-500">{dept.headEmployee.positionName ?? dept.headEmployee.levelName ?? "-"}</p>
            </div>
          </div>
        )}

        {/* Unsectioned employees */}
        {isExpanded && dept.unsectioned.length > 0 && (
          <div className="mt-3 text-left">
            <div className="flex items-center gap-1 mb-1">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[8px] font-semibold uppercase tracking-widest text-slate-400">Tanpa Section</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            {groupEmployeesByRole(dept.unsectioned).map((group) => (
              <div key={group.label} className="grid gap-1">
                <div className="flex items-center justify-between">
                  <span className={"rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ring-1 " + group.className}>{group.label}</span>
                  <span className="text-[8px] text-slate-400">{group.employees.length}</span>
                </div>
                {group.employees.map((emp) => (
                  <EmployeeCard key={`unsec-${group.label}-${emp.id}`} employee={emp} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sections */}
      {isExpanded && dept.sections.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="h-8 w-px bg-sky-300" />
          <div className="relative flex items-start justify-start gap-10 px-8 pt-8">
            <div className="absolute left-4 right-4 top-0 h-px bg-sky-300" />
            {dept.sections.map((section, idx) => (
              <div key={`${section.id}-${idx}`} className="relative flex flex-col items-center">
                <div className="absolute -top-8 h-8 w-px bg-sky-300" />
                <SectionNodeComponent section={section} expanded={expanded} onToggle={onToggle} seenHeadIds={currentSeen} depth={0} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main Page ---

export function OrgChartV2ClientPage({
  nodes,
  stats,
  referenceData,
  allEmployees,
}: {
  nodes: OrgNode[];
  stats: Stats;
  referenceData: ReferenceData;
  allEmployees: OrgEmployee[];
}) {
  const [query, setQuery] = useState("");
  const [departmentFilterId, setDepartmentFilterId] = useState("all");
  const [sectionFilterId, setSectionFilterId] = useState("all");
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [isCanvasPanning, setIsCanvasPanning] = useState(false);

  const orgData = useMemo(() => buildOrgData(nodes, referenceData, allEmployees), [nodes, referenceData, allEmployees]);

  const filteredDepts = useMemo(() => {
    let depts = orgData.departments;
    if (departmentFilterId !== "all") {
      depts = depts.filter((d) => d.id.toString() === departmentFilterId);
    }
    if (sectionFilterId !== "all") {
      depts = depts.map((d) => ({
        ...d,
        sections: d.sections.filter((s) => s.id.toString() === sectionFilterId),
      })).filter((d) => d.sections.length > 0 || d.headEmployee || d.unsectioned.length > 0);
    }
    return depts;
  }, [orgData.departments, departmentFilterId, sectionFilterId]);

  const searchFilteredDepts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return filteredDepts;

    function sectionMatches(s: SectionNode, query: string): boolean {
      return s.name.toLowerCase().includes(query) ||
        s.headEmployee?.fullName.toLowerCase().includes(query) ||
        s.members.some((e) => e.fullName.toLowerCase().includes(query)) ||
        s.children.some((c) => sectionMatches(c, query));
    }

    return filteredDepts.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.headEmployee?.fullName.toLowerCase().includes(q) ||
        d.unsectioned.some((e) => e.fullName.toLowerCase().includes(q)) ||
        d.sections.some((s) => sectionMatches(s, q)),
    );
  }, [filteredDepts, query]);

  const allIds = useMemo(() => {
    const ids = new Set<number>();
    function walkSections(sections: SectionNode[]) {
      for (const s of sections) { ids.add(s.id); walkSections(s.children); }
    }
    for (const d of searchFilteredDepts) { ids.add(d.id); walkSections(d.sections); }
    return ids;
  }, [searchFilteredDepts]);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const initializedRef = useRef(false);
  if (!initializedRef.current && allIds.size > 0) {
    initializedRef.current = true;
    // Default: only expand departments, sections/sub-sections collapsed
    const deptOnlyIds = new Set<number>();
    for (const d of orgData.departments) deptOnlyIds.add(d.id);
    setTimeout(() => setExpanded(deptOnlyIds), 0);
  }

  const handleToggle = (id: number) => setExpanded((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const handleExpandAll = () => setExpanded(new Set(allIds));
  const handleCollapseAll = () => setExpanded(new Set());

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest("button,input,textarea,select,[role='button']")) return;
    const c = canvasRef.current;
    if (!c) return;
    panStartRef.current = { x: e.clientX, y: e.clientY, scrollLeft: c.scrollLeft, scrollTop: c.scrollTop };
    setIsCanvasPanning(true);
    c.setPointerCapture(e.pointerId);
  };
  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isCanvasPanning) return;
    const c = canvasRef.current;
    if (!c) return;
    c.scrollLeft = panStartRef.current.scrollLeft - (e.clientX - panStartRef.current.x);
    c.scrollTop = panStartRef.current.scrollTop - (e.clientY - panStartRef.current.y);
  };
  const stopCanvasPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isCanvasPanning) return;
    setIsCanvasPanning(false);
    const c = canvasRef.current;
    if (c?.hasPointerCapture(e.pointerId)) c.releasePointerCapture(e.pointerId);
  };

  const scorecards = [
    { label: "Departemen", value: referenceData.departments.length, description: "Departemen aktif", tone: "info" as const, icon: <Building2 className="size-5" /> },
    { label: "Sections", value: referenceData.sections.length, description: "Section dari master", tone: "default" as const, icon: <Shield className="size-5" /> },
    { label: "Employees", value: stats.totalEmployeesAssigned, description: "Karyawan terhubung", tone: "success" as const, icon: <Users className="size-5" /> },
  ];

  return (
    <AdminPageShell eyebrow="HC • Org Structure" title="Organization Structure V2" description="Department > Section > Sub-Section berdasarkan relasi master data.">
      <HcWorkspaceBanner
        title="Organization Structure V2"
        description="Hierarchy: Department > Section > Sub-Section. Head dari master data. Tanpa duplikasi nama."
        items={[
          { label: "Departemen", value: referenceData.departments.length, tone: "sky" },
          { label: "Section", value: referenceData.sections.length, tone: "emerald" },
          { label: "Karyawan", value: stats.totalEmployeesAssigned, tone: "slate" },
        ]}
      />
      <div className="space-y-6">
        <EnterpriseScorecards items={scorecards} />
        <Card className="overflow-hidden border-slate-200/60 shadow-sm">
          <CardHeader className="gap-4 border-b bg-white pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">Struktur Organisasi (Dept {">"} Section {">"} Sub)</CardTitle>
              <CardDescription>Department Head dan Section Head dari master data. Yang sudah tampil di atas tidak diulang.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <Select value={departmentFilterId} onValueChange={(v) => { setDepartmentFilterId(v); setSectionFilterId("all"); }}>
                <SelectTrigger className="h-9 w-[210px] bg-white"><SelectValue placeholder="Filter department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Department</SelectItem>
                  {referenceData.departments.map((d) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sectionFilterId} onValueChange={setSectionFilterId}>
                <SelectTrigger className="h-9 w-[180px] bg-white"><SelectValue placeholder="Filter section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Section</SelectItem>
                  {referenceData.sections.filter((s) => departmentFilterId === "all" || s.departmentId?.toString() === departmentFilterId).map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Cari..." value={query} onChange={(e) => setQuery(e.target.value)} className="h-9 w-[160px] bg-white pl-8 text-xs" />
              </div>
              <button type="button" onClick={handleExpandAll} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
                <ChevronDown className="size-3" /> Expand
              </button>
              <button type="button" onClick={handleCollapseAll} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
                <ChevronRight className="size-3" /> Collapse
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div ref={canvasRef} className={"relative min-h-[600px] overflow-auto bg-slate-50/50 " + (isCanvasPanning ? "cursor-grabbing" : "cursor-grab")} onPointerDown={handleCanvasPointerDown} onPointerMove={handleCanvasPointerMove} onPointerUp={stopCanvasPan} onPointerLeave={stopCanvasPan}>
              <div className="p-6">
                <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-xs text-slate-600 shadow-sm">
                  <span className="font-semibold text-slate-900">Level:</span>
                  <span className="rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white">BOD</span>
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 font-semibold text-sky-800">DEPARTMENT</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">SECTION</span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">SUB-SECTION</span>
                  <span className="ml-auto hidden text-slate-500 lg:inline">
                    <Crown className="mr-1 inline size-3 text-amber-500" /> Head dari Master Data
                  </span>
                </div>

                {/* Executive Tree */}
                <div className="mb-10 flex justify-center">
                  <ExecutiveCard node={orgData.executiveTree} />
                </div>

                {/* Departments under GM */}
                <div className="mb-4 text-center">
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-800 ring-1 ring-sky-200">
                    <Building2 className="mr-1 inline size-3" /> Departments under General Manager
                  </span>
                </div>
                <div className="inline-flex min-w-full flex-wrap items-start justify-center gap-10 rounded-2xl p-4">
                  {searchFilteredDepts.length === 0 ? (
                    <div className="flex w-full flex-col items-center justify-center gap-3 py-24 text-slate-400">
                      <GitBranch className="size-10 opacity-30" />
                      <p className="text-sm font-medium">Tidak ada data</p>
                    </div>
                  ) : (
                    searchFilteredDepts.map((dept) => (
                      <DepartmentCardComponent key={dept.id} dept={dept} expanded={expanded} onToggle={handleToggle} seenHeadIds={new Set()} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
