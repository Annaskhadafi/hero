"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Pencil, Plus, Search, Trash2, ChevronDown, ChevronRight, User, ChevronUp, ArrowUpToLine, Check } from "lucide-react";
import { toast } from "sonner";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, useDraggable, useDroppable } from "@dnd-kit/core";
import type { MasterDepartment, MasterPosition, MasterSite, OrgStructure } from "@/lib/master-data";
import { manageOrgStructureAction, manageEmployeeAssignmentAction, type MasterDataActionState } from "@/app/dashboard/master-data/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const INITIAL_ACTION_STATE: MasterDataActionState = {
  status: "idle",
  message: "",
};

function formatScopeType(value: string) {
  const labels: Record<string, string> = {
    site: "Site",
    department: "Departemen",
    custom: "Khusus",
  };

  return labels[value] ?? value.replaceAll("_", " ");
}

function toDateTimeLocalValue(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const offset = parsed.getTimezoneOffset();
  return new Date(parsed.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

type Props = {
  orgStructures: OrgStructure[];
  positions: MasterPosition[];
  departments: MasterDepartment[];
  sections: any[];
  sites: MasterSite[];
  employees: any[];
  canEdit?: boolean;
  canDelete?: boolean;
};

function DraggableEmployee({ employee }: { employee: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `employee-${employee.id}`,
    data: { type: "employee", employeeId: employee.id, employeeName: employee.name },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="flex cursor-grab items-center gap-2 rounded-lg bg-surface-container-lowest px-2 py-1.5 text-[12px] hover:bg-[#eff6ff] active:cursor-grabbing"
    >
      <User className="size-3 text-[#64748b]" />
      <span className="truncate font-medium text-[#1e293b]">{employee.name}</span>
      {employee.department && (
        <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{employee.department}</span>
      )}
    </div>
  );
}

function DroppableNode({ node, children }: { node: any; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `node-${node.id}`,
    data: { type: "node", nodeId: node.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg transition-colors ${isOver ? "bg-[#dbeafe] ring-2 ring-[#3b82f6]" : ""}`}
    >
      {children}
    </div>
  );
}

export function OrgStructureBuilder({
  orgStructures,
  positions,
  departments,
  sections,
  sites,
  employees,
  canEdit = true,
  canDelete = true,
}: Props) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");
  // New: Section filter cascades from department
  const [selectedSectionId, setSelectedSectionId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"tree" | "department">("tree");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrgStructure | null>(null);
  const [selectedStructureId, setSelectedStructureId] = useState(orgStructures[0]?.id.toString() ?? "");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<number | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [collapsedNodes, setCollapsedNodes] = useState<Set<number>>(new Set());
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
  const [canvasNodes, setCanvasNodes] = useState<OrgStructure["nodes"]>(orgStructures[0]?.nodes ?? []);
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [newNodeCode, setNewNodeCode] = useState("");
  const [newNodePositionId, setNewNodePositionId] = useState("");
  const [newNodeEmployeeId, setNewNodeEmployeeId] = useState("");
  const [newNodeDelegateEmployeeId, setNewNodeDelegateEmployeeId] = useState("");
  const [newNodeType, setNewNodeType] = useState("position");
  const [newNodeApprovalRole, setNewNodeApprovalRole] = useState("");
  const [newNodeCanApprove, setNewNodeCanApprove] = useState(false);
  const [newNodeCanDelegate, setNewNodeCanDelegate] = useState(true);
  const [newNodeIsEscalationTarget, setNewNodeIsEscalationTarget] = useState(false);
  const [newNodeSlaHours, setNewNodeSlaHours] = useState(24);
  const [formData, setFormData] = useState({
    name: "",
    jobType: "custom",
    scopeValue: "",
    version: 1,
    effectiveFrom: "",
    effectiveTo: "",
    isDefault: false,
    description: "",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState<string>("");
  const [assignDepartmentId, setAssignDepartmentId] = useState<string>("");
  const [assignSectionId, setAssignSectionId] = useState<string>("");
  const [assignmentState, assignmentFormAction] = useActionState(manageEmployeeAssignmentAction, INITIAL_ACTION_STATE);

  const selectedStructure = orgStructures.find((org) => org.id.toString() === selectedStructureId) ?? null;

  useEffect(() => {
    if (!selectedStructure && orgStructures[0]) {
      setSelectedStructureId(orgStructures[0].id.toString());
      setCanvasNodes(orgStructures[0].nodes);
    }
  }, [orgStructures, selectedStructure]);

  useEffect(() => {
    if (assignmentState?.status === "success") {
      toast.success(assignmentState.message);
      setIsAssignmentDialogOpen(false);
      setAssignEmployeeId("");
      setAssignDepartmentId("");
      setAssignSectionId("");
      router.refresh();
    }
  }, [assignmentState]);

  const filteredOrgStructures = orgStructures.filter(
    (org) => org.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredEmployees = selectedDepartmentId === "all" 
    ? employees 
    : employees.filter((emp) => emp.departmentId?.toString() === selectedDepartmentId);

  // Cascading sections based on department selection
  const filteredSections = selectedDepartmentId === "all" 
    ? sections 
    : sections.filter((sec: any) => sec.departmentId?.toString() === selectedDepartmentId);

  const filteredPositions = selectedDepartmentId === "all"
    ? positions
    : positions.filter((pos) => pos.departmentId?.toString() === selectedDepartmentId);

  // Cascade: filter employees by section as well, when a section is selected
  const sectionFilteredEmployees = selectedSectionId === "all"
    ? filteredEmployees
    : filteredEmployees.filter((emp: any) => emp.sectionId?.toString() === selectedSectionId);

  const masterSections = (sections || []).filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.scopeType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.scopeValue.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const scopeTypes = ["site", "department", "custom"];
  const scopeOptions =
    formData.jobType === "site"
      ? sites.filter((site) => site.isActive).map((site) => site.name)
      : formData.jobType === "department"
        ? departments.filter((department) => department.isActive).map((department) => department.name)
        : [];

  const getNodeAssignmentEmployeeId = (
    node: OrgStructure["nodes"][number],
    assignmentType: string,
  ) => node.assignments.find((assignment) => assignment.assignmentType === assignmentType)?.employeeId?.toString() ?? "";

  const updateNodeAssignments = (
    node: OrgStructure["nodes"][number],
    assignmentType: string,
    employeeIdValue: string,
  ) => {
    const employee = employees?.find((item) => item.id.toString() === employeeIdValue);
    const remainingAssignments = node.assignments.filter(
      (assignment) => assignment.assignmentType !== assignmentType,
    );

    if (!employeeIdValue || employeeIdValue === "none" || !employee) {
      return remainingAssignments;
    }

    return [
      ...remainingAssignments,
      {
        id: Date.now(),
        nodeId: node.id,
        employeeId: employee.id,
        employeeName: employee.name,
        assignmentType,
        notes: assignmentType === "delegate" ? "Pemeriksa pengganti" : "Penanggung jawab utama",
        effectiveFrom: new Date(),
        effectiveTo: null,
        isActive: true,
      },
    ];
  };

  const handleOpenDialog = (org?: OrgStructure) => {
    if (org) {
      setEditingOrg(org);
      setFormData({
        name: org.name,
        jobType: org.scopeType,
        scopeValue: org.scopeValue,
        version: org.version,
        effectiveFrom: toDateTimeLocalValue(org.effectiveFrom),
        effectiveTo: toDateTimeLocalValue(org.effectiveTo),
        isDefault: org.isDefault,
        description: org.description,
        isActive: org.isActive,
      });
    } else {
      setEditingOrg(null);
      setFormData({
        name: "",
        jobType: "custom",
        scopeValue: "",
        version: 1,
        effectiveFrom: "",
        effectiveTo: "",
        isDefault: false,
        description: "",
        isActive: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const form = new FormData();
    form.append("intent", editingOrg ? "update" : "create");
    if (editingOrg) form.append("id", editingOrg.id.toString());
    form.append("name", formData.name);
    form.append("jobType", formData.jobType);
    form.append("scopeValue", formData.scopeValue);
    form.append("version", formData.version.toString());
    form.append("effectiveFrom", formData.effectiveFrom);
    form.append("effectiveTo", formData.effectiveTo);
    form.append("isDefault", formData.isDefault.toString());
    form.append("description", formData.description);
    form.append("isActive", formData.isActive.toString());

    const result = await manageOrgStructureAction(INITIAL_ACTION_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
      setIsDialogOpen(false);
      setEditingOrg(null);
      setFormData({
        name: "",
        jobType: "custom",
        scopeValue: "",
        version: 1,
        effectiveFrom: "",
        effectiveTo: "",
        isDefault: false,
        description: "",
        isActive: true,
      });
      router.refresh();
    } else {
      toast.error(result.message);
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (org: OrgStructure) => {
    if (!confirm(`Hapus struktur organisasi "${org.name}"?`)) {
      return;
    }

    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", org.id.toString());
    form.append("name", org.name);
    form.append("jobType", org.scopeType);
    form.append("scopeValue", org.scopeValue);
    form.append("description", org.description);
    form.append("isActive", org.isActive.toString());

    const result = await manageOrgStructureAction(INITIAL_ACTION_STATE, form);
    if (result.status === "success") {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  const handleExportPdf = async () => {
    if (!selectedStructure) {
      toast.error("Pilih struktur terlebih dahulu.");
      return;
    }
    setIsExportingPdf(true);
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const element = document.getElementById("org-chart-canvas");
      if (!element) {
        toast.error("Canvas tidak ditemukan");
        return;
      }
      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imageDataUrl = canvas.toDataURL("image/png");
      const response = await fetch(`/api/org-structure/${selectedStructure.id}/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl, structureName: selectedStructure.name }),
      });
      if (!response.ok) throw new Error("PDF generation failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedStructure.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF exported");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const selectStructure = (structureId: string) => {
    setSelectedStructureId(structureId);
    const structure = orgStructures.find((org) => org.id.toString() === structureId);
    setCanvasNodes(structure?.nodes ?? []);
    setCollapsedNodes(new Set());
  };

  const toggleCollapse = (e: React.MouseEvent, nodeId: number) => {
    e.stopPropagation();
    setCollapsedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const addNodeToCanvas = () => {
    if (!newNodeLabel.trim()) {
      toast.error("Nama posisi wajib diisi.");
      return;
    }

    const position = positions.find((item) => item.id.toString() === newNodePositionId);
    const employee = employees?.find((item) => item.id.toString() === newNodeEmployeeId);
    const delegateEmployee = employees?.find((item) => item.id.toString() === newNodeDelegateEmployeeId);
    const nextId = Math.max(0, ...canvasNodes.map((node) => node.id)) + 1;

    setCanvasNodes((current) => [
      ...current,
      {
        id: nextId,
        structureId: Number(selectedStructureId || 0),
        parentNodeId: null,
        positionId: position?.id ?? null,
        positionName: position?.name ?? null,
        positionCode: position?.code ?? null,
        employeeId: employee?.id ?? null,
        employeeName: employee?.name ?? null,
        nodeCode: newNodeCode.trim(),
        nodeType: newNodeType,
        approvalRole: newNodeApprovalRole.trim(),
        canApprove: newNodeCanApprove,
        canDelegate: newNodeCanDelegate,
        isEscalationTarget: newNodeIsEscalationTarget,
        slaHours: newNodeSlaHours,
        fallbackNodeId: null,
        fallbackNodeLabel: null,
        label: newNodeLabel.trim(),
        sortOrder: current.length,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        assignments: [
          ...(employee
            ? [
                {
                  id: nextId * 10 + 1,
                  nodeId: nextId,
                  employeeId: employee.id,
                  employeeName: employee.name,
                  assignmentType: "primary",
                  notes: "Penanggung jawab utama",
                  effectiveFrom: new Date(),
                  effectiveTo: null,
                  isActive: true,
                },
              ]
            : []),
          ...(delegateEmployee
            ? [
                {
                  id: nextId * 10 + 2,
                  nodeId: nextId,
                  employeeId: delegateEmployee.id,
                  employeeName: delegateEmployee.name,
                  assignmentType: "delegate",
                  notes: "Pemeriksa pengganti",
                  effectiveFrom: new Date(),
                  effectiveTo: null,
                  isActive: true,
                },
              ]
            : []),
        ],
      },
    ]);
    setNewNodeLabel("");
    setNewNodeCode("");
    setNewNodePositionId("");
    setNewNodeEmployeeId("");
    setNewNodeDelegateEmployeeId("");
    setNewNodeType("position");
    setNewNodeApprovalRole("");
    setNewNodeCanApprove(false);
    setNewNodeCanDelegate(true);
    setNewNodeIsEscalationTarget(false);
    setNewNodeSlaHours(24);
  };

  const updateNode = (nodeId: number, changes: Partial<OrgStructure["nodes"][number]>) => {
    setCanvasNodes((current) => current.map((node) => (node.id === nodeId ? { ...node, ...changes } : node)));
  };

  const removeNode = (nodeId: number) => {
    const toRemove = new Set<number>();
    const collect = (targetId: number) => {
      toRemove.add(targetId);
      canvasNodes.filter((node) => node.parentNodeId === targetId).forEach((node) => collect(node.id));
    };
    collect(nodeId);
    setCanvasNodes((current) => current.filter((node) => !toRemove.has(node.id)));
  };

  const saveCanvas = async () => {
    if (!selectedStructure) {
      toast.error("Pilih struktur terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);
    const form = new FormData();
    form.append("intent", "save-nodes");
    form.append("id", selectedStructure.id.toString());
    form.append("name", selectedStructure.name);
    form.append("jobType", selectedStructure.scopeType);
    form.append("scopeValue", selectedStructure.scopeValue);
    form.append("version", selectedStructure.version.toString());
    form.append("effectiveFrom", toDateTimeLocalValue(selectedStructure.effectiveFrom));
    form.append("effectiveTo", toDateTimeLocalValue(selectedStructure.effectiveTo));
    form.append("isDefault", selectedStructure.isDefault.toString());
    form.append("description", selectedStructure.description);
    form.append(
      "nodesJson",
      JSON.stringify(
        canvasNodes.map((node, index) => ({
          id: node.id,
          parentNodeId: node.parentNodeId,
          positionId: node.positionId,
          employeeId: node.employeeId,
          nodeCode: node.nodeCode,
          nodeType: node.nodeType,
          approvalRole: node.approvalRole,
          canApprove: node.canApprove,
          canDelegate: node.canDelegate,
          isEscalationTarget: node.isEscalationTarget,
          slaHours: node.slaHours,
          fallbackNodeId: node.fallbackNodeId,
          label: node.label,
          sortOrder: index,
          isActive: node.isActive,
          assignments: node.assignments.map((assignment) => ({
            employeeId: assignment.employeeId,
            assignmentType: assignment.assignmentType,
            notes: assignment.notes,
            effectiveFrom: toDateTimeLocalValue(assignment.effectiveFrom),
            effectiveTo: toDateTimeLocalValue(assignment.effectiveTo),
            isActive: assignment.isActive,
          })),
        })),
      ),
    );
    form.append("isActive", selectedStructure.isActive.toString());

    const result = await manageOrgStructureAction(INITIAL_ACTION_STATE, form);
    if (result.status === "success") {
      toast.success("Bagan struktur berhasil disimpan.");
      router.refresh();
    } else {
      toast.error(result.message);
    }
    setIsSubmitting(false);
  };

  const renderTree = (parentNodeId: number | null = null, depth = 0): React.ReactNode => {
    const children = canvasNodes
      .filter((node) => node.parentNodeId === parentNodeId)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (children.length === 0) return null;

    return children.map((node, index) => {
      const hasChildren = canvasNodes.some((n) => n.parentNodeId === node.id);
      const isCollapsed = collapsedNodes.has(node.id);
      const isLast = index === children.length - 1;
      const isEditing = editingNodeId === node.id;

      return (
        <div key={node.id} className={`relative flex flex-col items-start ${depth === 0 ? "" : "mt-4 first:mt-0"}`}>
          {depth > 0 && (
            <>
              <div className="absolute -left-[30px] top-[32px] w-[30px] h-px border-t border-dashed border-[#94a3b8]" />
              <div className={`absolute -left-[30px] top-0 w-px border-l border-dashed border-[#94a3b8] ${isLast ? "h-[32px]" : "h-[calc(100%+16px)]"}`} />
            </>
          )}

          <DroppableNode node={node}>
          <div
            draggable={!isEditing}
            onDragStart={(e) => {
              e.stopPropagation();
              setDraggedNodeId(node.id);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (draggedNodeId == null || draggedNodeId === node.id) return;
              updateNode(draggedNodeId, { parentNodeId: node.id });
              setDraggedNodeId(null);
            }}
            className={`relative z-10 w-[260px] rounded-lg border ${draggedNodeId && draggedNodeId !== node.id ? "border-[#3b82f6] shadow-md ring-2 ring-[#bfdbfe]" : "border-[#cbd5e1] shadow-sm"} bg-white flex flex-col transition-all`}
          >
            {isEditing ? (
              <div className="flex flex-col p-3 gap-2">
                <Input
                  value={node.label}
                  onChange={(e) => updateNode(node.id, { label: e.target.value })}
                  placeholder="Nama / Label"
                  className="h-8 text-[13px]"
                />
                <Input
                  value={node.nodeCode}
                  onChange={(e) => updateNode(node.id, { nodeCode: e.target.value })}
                  placeholder="Kode posisi"
                  className="h-8 text-[13px]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={node.nodeType || "position"}
                    onValueChange={(value) => updateNode(node.id, { nodeType: value })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Tipe posisi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="position">Posisi</SelectItem>
                      <SelectItem value="approver">Pemeriksa</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="worker">Worker</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={node.approvalRole}
                    onChange={(e) => updateNode(node.id, { approvalRole: e.target.value })}
                    placeholder="Peran approval"
                    className="h-8 text-[13px]"
                  />
                </div>
                <Select
                  value={node.positionId?.toString() ?? "none"}
                  onValueChange={(value) => {
                    const position = positions.find((item) => item.id.toString() === value);
                    updateNode(node.id, {
                      positionId: value === "none" ? null : position?.id ?? null,
                      positionName: value === "none" ? null : position?.name ?? null,
                      positionCode: value === "none" ? null : position?.code ?? null,
                    });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Pilih jabatan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa jabatan</SelectItem>
                    {positions.filter((p) => p.isActive).map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={getNodeAssignmentEmployeeId(node, "primary") || "none"}
                  onValueChange={(value) => {
                    const employee = employees?.find((item) => item.id.toString() === value);
                    updateNode(node.id, {
                      employeeId: value === "none" ? null : employee?.id ?? null,
                      employeeName: value === "none" ? null : employee?.name ?? null,
                      assignments: updateNodeAssignments(node, "primary", value),
                    } as any);
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Penanggung jawab utama" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa pengguna</SelectItem>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={getNodeAssignmentEmployeeId(node, "delegate") || "none"}
                  onValueChange={(value) =>
                    updateNode(node.id, {
                      assignments: updateNodeAssignments(node, "delegate", value),
                    } as any)
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Pemeriksa pengganti" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa pengganti</SelectItem>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={node.fallbackNodeId?.toString() ?? "none"}
                    onValueChange={(value) => {
                      const fallbackNode = canvasNodes.find((item) => item.id.toString() === value);
                      updateNode(node.id, {
                        fallbackNodeId: value === "none" ? null : fallbackNode?.id ?? null,
                        fallbackNodeLabel: value === "none" ? null : fallbackNode?.label ?? null,
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Pemeriksa pengganti" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa pengganti</SelectItem>
                      {canvasNodes
                        .filter((candidate) => candidate.id !== node.id)
                        .map((candidate) => (
                          <SelectItem key={candidate.id} value={candidate.id.toString()}>
                            {candidate.label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    value={node.slaHours}
                    onChange={(e) =>
                      updateNode(node.id, { slaHours: Number(e.target.value || "24") })
                    }
                    placeholder="Batas waktu (jam)"
                    className="h-8 text-[13px]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-container-low p-2">
                  <label className="flex items-center gap-2 text-xs text-[#475569]">
                    <Switch
                      checked={node.canApprove}
                      onCheckedChange={(checked) => updateNode(node.id, { canApprove: checked })}
                    />
                    Pemeriksa
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#475569]">
                    <Switch
                      checked={node.canDelegate}
                      onCheckedChange={(checked) => updateNode(node.id, { canDelegate: checked })}
                    />
                    Delegasi
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[#475569]">
                    <Switch
                      checked={node.isEscalationTarget}
                      onCheckedChange={(checked) =>
                        updateNode(node.id, { isEscalationTarget: checked })
                      }
                    />
                    Eskalasi
                  </label>
                </div>

                <div className="flex items-center justify-between mt-1">
                  {depth > 0 ? (
                    <Button type="button" variant="ghost" size="icon" onClick={() => updateNode(node.id, { parentNodeId: null })} aria-label="Jadikan Utama">
                      <ArrowUpToLine className="size-4" />
                    </Button>
                  ) : <div />}
                  <Button type="button" variant="ghost" size="icon" onClick={() => setEditingNodeId(null)} aria-label="Selesai">
                    <Check className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex p-3 gap-3 items-center group/card relative overflow-hidden rounded-lg">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-[#64748b] ring-1 ring-[#cbd5e1]">
                  <User className="size-5" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-semibold text-[#1e293b] leading-tight">
                    {node.employeeName || node.label}
                  </span>
                  {node.positionName && (
                    <span className="truncate text-[11px] text-[#64748b] mt-0.5">
                      {node.positionName}
                    </span>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {node.canApprove ? <Badge variant="outline" className="bg-[#eff6ff] text-[#1d4ed8]">Pemeriksa</Badge> : null}
                    {node.approvalRole ? <Badge variant="outline">{node.approvalRole}</Badge> : null}
                    {node.isEscalationTarget ? <Badge variant="outline" className="bg-[#fef3c7] text-[#92400e]">Eskalasi</Badge> : null}
                  </div>
                </div>

                {(canEdit || canDelete) && (
                  <div className="absolute right-1 top-1 flex flex-col gap-1 opacity-0 group-hover/card:opacity-100 bg-white/90 p-1 shadow-sm border rounded-md transition-opacity duration-200 backdrop-blur-sm">
                    {canEdit && (
                      <Button type="button" size="icon" variant="ghost" className="size-6 h-6 w-6 text-blue-600 hover:bg-blue-50" onClick={() => setEditingNodeId(node.id)}>
                        <Pencil className="size-3" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button type="button" size="icon" variant="ghost" className="size-6 h-6 w-6 text-red-600 hover:bg-red-50" onClick={() => removeNode(node.id)}>
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {hasChildren && (
              <div
                className={`absolute bottom-0 left-1/2 flex w-10 -translate-x-1/2 translate-y-[100%] items-center justify-center rounded-b-md ${isCollapsed ? 'bg-[#cbd5e1] hover:bg-[#94a3b8] text-[#334155]' : 'bg-[#1d4ed8] hover:bg-[#1e40af] text-white'} cursor-pointer shadow-sm z-20 h-4 transition-colors`}
                onClick={(e) => { e.stopPropagation(); toggleCollapse(e, node.id); }}
              >
                {isCollapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
              </div>
            )}
          </div>
          </DroppableNode>

          {hasChildren && !isCollapsed && (
            <div className="relative mt-8 w-full">
              <div className="ml-[130px] pl-[30px] relative flex flex-col">
                <div className="absolute left-0 -top-[16px] w-px h-[16px] border-l border-dashed border-[#94a3b8]" />
                {renderTree(node.id, depth + 1)}
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  const renderDepartmentView = () => {
    const deptGroups = departments.map((dept) => {
      const deptSections = filteredSections.filter((s) => s.departmentId === dept.id);
      const deptEmployees = sectionFilteredEmployees.filter((e) => e.departmentId === dept.id);
      
      return (
        <div key={dept.id} className="mb-6 rounded-2xl border border-border bg-white p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{dept.name}</h3>
              <p className="text-sm text-muted-foreground">{dept.description}</p>
            </div>
            <Badge variant="secondary" className="ml-auto">{deptEmployees.length} employees</Badge>
          </div>
          
          {deptSections.length > 0 && (
            <div className="space-y-3">
              {(() => {
                const visibleSections = selectedSectionId === "all" ? deptSections : deptSections.filter((sec: any) => sec.id?.toString() === selectedSectionId);
                return visibleSections.map((section) => {
                  const sectionEmployees = deptEmployees.filter((e) => e.sectionId === section.id);
                  return (
                    <div key={section.id} className="rounded-xl border border-border/50 bg-surface-container-low p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="font-medium text-sm">{section.name}</h4>
                        <Badge variant="outline" className="text-xs">{sectionEmployees.length}</Badge>
                      </div>
                      {sectionEmployees.length > 0 && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {sectionEmployees.map((emp) => (
                            <div key={emp.id} className="flex items-center gap-2 rounded-lg bg-white p-2 text-xs">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{emp.name}</p>
                                <p className="truncate text-muted-foreground">{emp.jobTitle || emp.role}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
          
          {deptSections.length === 0 && deptEmployees.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {deptEmployees.map((emp) => (
                <div key={emp.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-surface-container-low p-2 text-xs">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{emp.name}</p>
                    <p className="truncate text-muted-foreground">{emp.jobTitle || emp.role}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    });
    
    return <div className="space-y-4">{deptGroups}</div>;
  };

  return (
    <Card className="border-[#e2e8f0]">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-[#1e293b]">Struktur Organisasi</CardTitle>
          <CardDescription className="text-sm text-[#64748b]">
            Susun struktur organisasi untuk site, departemen, atau kebutuhan operasional lain.
          </CardDescription>
        </div>
      {canEdit && (
        <Button onClick={() => handleOpenDialog()} className="bg-[#3b82f6] hover:bg-[#2563eb]">
          <Plus className="mr-2 size-4" />
          Tambah Struktur
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPdf}
        disabled={isExportingPdf}
        className="h-8 ml-2 text-xs"
      >
        {isExportingPdf ? "Exporting..." : "Export PDF"}
      </Button>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 border-[#dbeafe] bg-[#eff6ff]">
          <AlertCircle className="size-4 text-[#3b82f6]" />
          <AlertDescription className="text-[#1e40af]">
            Setiap struktur dapat berisi posisi kerja, penanggung jawab, dan hubungan atasan-bawahan yang mudah dipindahkan.
          </AlertDescription>
        </Alert>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => setActiveDragId(event.active.id as string)}
          onDragEnd={(event) => {
            setActiveDragId(null);
            const { active, over } = event;
            if (!over || !active) return;

            const activeData = active.data.current;
            const overData = over.data.current;

            if (activeData?.type === "employee" && overData?.type === "node") {
              const employeeId = activeData.employeeId;
              const employeeName = activeData.employeeName;
              const nodeId = overData.nodeId;

              setCanvasNodes((prev) =>
                prev.map((n) =>
                  n.id === nodeId
                    ? {
                        ...n,
                        employeeId,
                        employeeName,
                        assignments: [
                          ...n.assignments,
                          {
                            id: Date.now(),
                            nodeId,
                            employeeId,
                            employeeName,
                            assignmentType: "primary" as const,
                            notes: "Penanggung jawab utama",
                            effectiveFrom: new Date(),
                            effectiveTo: null,
                            isActive: true,
                          },
                        ],
                      }
                    : n
                )
              );
              toast.success(`${employeeName} assigned to node`);
            }
          }}
          onDragCancel={() => setActiveDragId(null)}
        >
          <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
                <Input placeholder="Cari struktur organisasi..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9" />
              </div>

              <Select value={selectedDepartmentId} onValueChange={(val) => { setSelectedDepartmentId(val); setSelectedSectionId("all"); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Section filter cascades from department */}
              <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {typeof filteredSections !== 'undefined' && filteredSections.map((sec: any) => (
                    <SelectItem key={sec.id} value={sec.id.toString()}>
                      {sec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-3 rounded-[1.2rem] bg-surface-container-low p-3">
                <div className="mb-3 flex gap-2">
                  <Button
                    variant={viewMode === "tree" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("tree")}
                    className="flex-1"
                  >
                    Tree View
                  </Button>
                  <Button
                    variant={viewMode === "department" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("department")}
                    className="flex-1"
                  >
                    Department View
                  </Button>
                </div>
                {filteredOrgStructures.length > 0 ? filteredOrgStructures.map((org) => (
                  <div
                    key={org.id}
                    onClick={() => {
                      setSelectedOrgId(org.id);
                      setSelectedOrgState(org);
                    }}
                    className={`cursor-pointer rounded-[1.05rem] border p-4 transition-all duration-200 ${
                      org.id === selectedOrgId
                        ? "border-[#2563eb] bg-[#eff6ff] shadow-sm"
                        : "border-[#e2e8f0] bg-white hover:border-[#cbd5e1]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#1e293b]">{org.name}</p>
                          {org.isDefault ? (
                            <Badge className="bg-[#2563eb] text-white">Default</Badge>
                          ) : null}
                          {org.isActive ? (
                            <Badge variant="outline" className="bg-[#ecfdf5] text-[#059669]">Aktif</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-[#f1f5f9] text-[#64748b]">Nonaktif</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[#64748b]">
                          Versi {org.version} • {formatScopeType(org.scopeType)} {org.scopeValue ? `• ${org.scopeValue}` : ""}
                        </p>
                        <p className="mt-2 text-xs text-[#94a3b8]">{org.nodes.length} posisi</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {canEdit && (
                          <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenDialog(org); }} className="size-8 text-[#3b82f6] hover:bg-[#dbeafe]">
                            <Pencil className="size-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDelete(org); }} className="size-8 text-[#ef4444] hover:bg-[#fee2e2]">
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[1.05rem] bg-surface-container-lowest p-6 text-center text-sm text-muted-foreground">
                    Belum ada struktur organisasi.
                  </div>
                )}
              </div>

              <div className="space-y-2 rounded-[1.2rem] bg-surface-container-low p-3 mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Karyawan ({sectionFilteredEmployees.length})
                </p>
                <div className="max-h-[200px] space-y-1 overflow-y-auto">
                  {sectionFilteredEmployees.map((emp: any) => (
                    <DraggableEmployee key={emp.id} employee={emp} />
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[1.3rem] bg-surface-container-lowest p-4 shadow-[0_12px_24px_rgba(0,52,97,0.06)]">
            {selectedStructure ? (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-[#1e293b]">{selectedStructure.name}</h3>
                    <p className="text-sm text-[#64748b]">
                      Cakupan: {formatScopeType(selectedStructure.scopeType)}{selectedStructure.scopeValue ? ` • ${selectedStructure.scopeValue}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#64748b]">
                      <Badge variant="outline">v{selectedStructure.version}</Badge>
                      {selectedStructure.isDefault ? <Badge variant="outline" className="bg-[#ecfeff] text-[#0f766e]">Default</Badge> : null}
                      <Badge variant="outline">
                        Berlaku {toDateTimeLocalValue(selectedStructure.effectiveFrom) || "-"}
                      </Badge>
                    </div>
                  </div>
                  <Button type="button" onClick={saveCanvas} disabled={isSubmitting} className="bg-[#1d4ed8] hover:bg-[#1e40af]">
                    {isSubmitting ? "Menyimpan..." : "Simpan Struktur"}
                  </Button>
                </div>

                <div className="grid gap-3 rounded-[1.2rem] bg-surface-container-low p-4 lg:grid-cols-3">
                  <Input value={newNodeLabel} onChange={(e) => setNewNodeLabel(e.target.value)} placeholder="Nama posisi" />
                  <Input value={newNodeCode} onChange={(e) => setNewNodeCode(e.target.value)} placeholder="Kode posisi" />
                  <Input value={newNodeApprovalRole} onChange={(e) => setNewNodeApprovalRole(e.target.value)} placeholder="Peran approval" />
                  <Select value={newNodeType} onValueChange={setNewNodeType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipe posisi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="position">Posisi</SelectItem>
                      <SelectItem value="approver">Pemeriksa</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                      <SelectItem value="worker">Pelaksana</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newNodePositionId || "none"} onValueChange={(value) => setNewNodePositionId(value === "none" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jabatan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa jabatan</SelectItem>
                      {positions.filter((position) => position.isActive).map((position) => (
                        <SelectItem key={position.id} value={position.id.toString()}>
                          {position.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newNodeEmployeeId || "none"} onValueChange={(value) => setNewNodeEmployeeId(value === "none" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pengguna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa pengguna</SelectItem>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={newNodeDelegateEmployeeId || "none"} onValueChange={(value) => setNewNodeDelegateEmployeeId(value === "none" ? "" : value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pengganti" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa pengganti</SelectItem>
                      {employees?.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={1}
                    value={newNodeSlaHours}
                    onChange={(e) => setNewNodeSlaHours(Number(e.target.value || "24"))}
                    placeholder="Batas waktu (jam)"
                  />
                  <div className="col-span-full grid gap-3 md:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-[1.05rem] bg-surface-container-lowest px-4 py-4">
                      <Switch checked={newNodeCanApprove} onCheckedChange={setNewNodeCanApprove} />
                      <span className="text-sm text-[#475569]">Bisa menyetujui</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-[1.05rem] bg-surface-container-lowest px-4 py-4">
                      <Switch checked={newNodeCanDelegate} onCheckedChange={setNewNodeCanDelegate} />
                      <span className="text-sm text-[#475569]">Bisa didelegasikan</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-[1.05rem] bg-surface-container-lowest px-4 py-4">
                      <Switch checked={newNodeIsEscalationTarget} onCheckedChange={setNewNodeIsEscalationTarget} />
                      <span className="text-sm text-[#475569]">Tujuan eskalasi</span>
                    </div>
                  </div>
                  <div className="col-span-full">
                    <Button type="button" onClick={addNodeToCanvas}>Tambah Posisi</Button>
                  </div>
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedNodeId == null) return;
                    updateNode(draggedNodeId, { parentNodeId: null });
                    setDraggedNodeId(null);
                  }}
                  className="relative min-h-[440px] rounded-[28px] border border-transparent bg-[linear-gradient(180deg,#f8fbff_0%,#f1f5f9_100%)] p-6 overflow-auto"
                >
                  <div className="mb-4 flex items-center justify-between sticky left-0 top-0 z-30">
                    <p className="text-[13px] font-semibold tracking-wide text-[#334155] uppercase">Bagan Struktur</p>
                    <Badge variant="outline" className="bg-surface-container-lowest">{canvasNodes.length} posisi</Badge>
                  </div>
                  {viewMode === "department" ? (
                    <div className="pb-16 pt-4 px-4">
                      {renderDepartmentView()}
                    </div>
                  ) : canvasNodes.length > 0 ? (
                    <div className="flex flex-row items-start gap-12 min-w-max pb-16 pt-4 px-4 overflow-visible">
                      {renderTree()}
                    </div>
                  ) : (
                    <div className="flex h-[320px] items-center justify-center rounded-3xl bg-surface-container-lowest/70 text-center text-sm text-muted-foreground">
                      Tambah posisi pertama lalu pindahkan ke posisi lain untuk membentuk struktur organisasi.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[520px] items-center justify-center rounded-[28px] bg-surface-container-low p-10 text-center text-sm text-muted-foreground">
                Pilih atau buat struktur baru untuk mulai menyusun bagan organisasi.
              </div>
            )}
            </div>
          </div>
          <DragOverlay>
            {activeDragId?.startsWith("employee-") ? (
              <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-lg ring-1 ring-[#cbd5e1]">
                <User className="size-4 text-[#3b82f6]" />
                <span className="text-[13px] font-medium text-[#1e293b]">
                  {sectionFilteredEmployees.find((e: any) => `employee-${e.id}` === activeDragId)?.name ?? ""}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editingOrg ? "Edit Struktur Organisasi" : "Tambah Struktur Organisasi"}</DialogTitle>
            <DialogDescription>{editingOrg ? "Ubah informasi struktur organisasi" : "Buat struktur baru, lalu susun posisi di bagan struktur"}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Nama Struktur</Label>
              <Input id="org-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Mis. Struktur Site Operasional" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org-jobType">Cakupan Struktur</Label>
                <Select value={formData.jobType} onValueChange={(value) => setFormData({ ...formData, jobType: value, scopeValue: "" })}>
                  <SelectTrigger id="org-jobType">
                    <SelectValue placeholder="Pilih cakupan" />
                  </SelectTrigger>
                  <SelectContent>
                    {scopeTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        <span>{formatScopeType(type)}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-scope-value">Detail Cakupan</Label>
                {scopeOptions.length > 0 ? (
                  <Select value={formData.scopeValue || "none"} onValueChange={(value) => setFormData({ ...formData, scopeValue: value === "none" ? "" : value })}>
                    <SelectTrigger id="org-scope-value">
                      <SelectValue placeholder="Pilih detail cakupan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">- Pilih -</SelectItem>
                      {scopeOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input id="org-scope-value" value={formData.scopeValue} onChange={(e) => setFormData({ ...formData, scopeValue: e.target.value })} placeholder="Mis. Custom Holding Structure" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org-version">Versi Struktur</Label>
                <Input
                  id="org-version"
                  type="number"
                  min={1}
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: Number(e.target.value || "1") })}
                />
              </div>
              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="org-isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                />
                <Label htmlFor="org-isDefault">Jadikan struktur default</Label>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org-effective-from">Berlaku Mulai</Label>
                <Input
                  id="org-effective-from"
                  type="datetime-local"
                  value={formData.effectiveFrom}
                  onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-effective-to">Berlaku Sampai</Label>
                <Input
                  id="org-effective-to"
                  type="datetime-local"
                  value={formData.effectiveTo}
                  onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-description">Description</Label>
              <Textarea id="org-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Catatan singkat tentang struktur ini" rows={3} />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="org-isActive" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
              <Label htmlFor="org-isActive">Aktif</Label>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb]">
                {isSubmitting ? "Menyimpan..." : editingOrg ? "Simpan Perubahan" : "Tambah Struktur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Employee</DialogTitle>
            <DialogDescription>Assign karyawan ke department dan section.</DialogDescription>
          </DialogHeader>
          <form action={assignmentFormAction} className="grid gap-4">
            <div className="grid gap-2">
              <Label>Karyawan</Label>
              <Select name="employeeId" value={assignEmployeeId} onValueChange={setAssignEmployeeId}>
                <SelectTrigger><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
                <SelectContent>
                  {employees.map((emp: typeof employees[number]) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Department</Label>
              <Select name="departmentId" value={assignDepartmentId} onValueChange={(v) => { setAssignDepartmentId(v); setAssignSectionId(""); }}>
                <SelectTrigger><SelectValue placeholder="Pilih department" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {departments.map((dept: typeof departments[number]) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Section</Label>
              <Select name="sectionId" value={assignSectionId} onValueChange={setAssignSectionId}>
                <SelectTrigger><SelectValue placeholder="Pilih section" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
              {sections
                .filter((sec: typeof sections[number]) => (assignDepartmentId ? sec.departmentId?.toString() === assignDepartmentId : true))
                .map((sec: typeof sections[number]) => (
                      <SelectItem key={sec.id} value={sec.id.toString()}>{sec.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">Batal</Button>
              </DialogClose>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
