"use client";

import { useMemo, useState, useTransition } from "react";
import { Building2, GitBranch, Search, UserRound, Users, Edit, Trash2, Plus, GripVertical, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, DragOverlay } from "@dnd-kit/core";

import { AdminPageShell } from "@/components/admin-page-shell";
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
import { updateOrgNodeParent, updateOrgNode, createOrgNode, deleteOrgNode } from "@/app/actions/org-chart";

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
    positionName: string | null;
    siteName: string | null;
    workLocationName: string | null;
  }>;
};

type OrgTreeNode = OrgNode & { children: OrgTreeNode[] };

type Stats = { totalNodes: number; totalEmployeesAssigned: number; departments: number; rootNodes: number };

// Helper to build tree
function buildTree(nodes: OrgNode[]): OrgTreeNode[] {
  const map = new Map<number, OrgTreeNode>();
  for (const node of nodes) map.set(node.id, { ...node, children: [] });
  const roots: OrgTreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentNodeId && map.has(node.parentNodeId)) map.get(node.parentNodeId)!.children.push(node);
    else roots.push(node);
  }
  return roots.sort((a, b) => a.hierarchyLevel - b.hierarchyLevel || a.name.localeCompare(b.name));
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
  if (normalized.includes("manager") || normalized === "department" || hierarchyLevel <= 1) {
    return {
      label: "MANAGERIAL",
      card: "border-sky-200 bg-sky-50 text-slate-950 shadow-sky-100/80",
      badge: "bg-sky-100 text-sky-800 ring-sky-200",
      text: "text-slate-600",
      connector: "bg-sky-300",
    };
  }
  if (normalized.includes("supervisor") || normalized === "section" || hierarchyLevel === 2) {
    return {
      label: "SUPERVISORY",
      card: "border-emerald-200 bg-emerald-50 text-slate-950 shadow-emerald-100/80",
      badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
      text: "text-slate-600",
      connector: "bg-emerald-300",
    };
  }
  return {
    label: nodeType.toUpperCase(),
    card: "border-amber-200 bg-amber-50 text-slate-950 shadow-amber-100/80",
    badge: "bg-amber-100 text-amber-800 ring-amber-200",
    text: "text-slate-600",
    connector: "bg-amber-300",
  };
}

function OrgEmployeePreview({ employee }: { employee: OrgNode["employees"][number] }) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white/80 p-2 text-left shadow-sm">
      <div className="flex items-start gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
          {employee.fullName.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-900">{employee.fullName}</p>
          <p className="truncate text-[10px] text-slate-500">{employee.employeeId} • {employee.positionName ?? "-"}</p>
          <p className="truncate text-[10px] text-slate-400">Lokasi: {[employee.siteName, employee.workLocationName].filter(Boolean).join(" • ") || "-"}</p>
        </div>
      </div>
    </div>
  );
}

function InteractiveTreeNode({
  node,
  onEdit,
  onDelete,
  onAddChild,
}: {
  node: OrgTreeNode;
  onEdit: (node: OrgTreeNode) => void;
  onDelete: (node: OrgTreeNode) => void;
  onAddChild: (parentId: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const tone = getNodeTone(node.nodeType, node.hierarchyLevel);
  const nodeContext = getNodeContext(node);

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
        className={"group relative w-[260px] rounded-2xl border p-3 shadow-sm transition-all duration-200 " + tone.card +
          (isDragging ? " scale-95 opacity-40 ring-2 ring-primary" : "") +
          (isOver && !isDragging ? " scale-[1.02] ring-2 ring-emerald-500" : "")
        }
      >
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

        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200/80">
          <UserRound className="size-3" />
          {node.employeeCount} assigned
        </div>

        {node.employees.length > 0 && isExpanded && (
          <div className="mt-3 grid gap-2">
            {node.employees.slice(0, 3).map((employee) => (
              <OrgEmployeePreview key={employee.id} employee={employee} />
            ))}
            {node.employees.length > 3 && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 px-3 py-2 text-xs font-medium text-slate-500">
                + {node.employees.length - 3} lainnya
              </div>
            )}
          </div>
        )}
      </div>

      {isExpanded && node.children.length > 0 && (
        <div className="flex flex-col items-center">
          <div className={"h-8 w-px " + tone.connector} />
          <div className="relative flex items-start justify-center gap-6 px-4 pt-8">
            <div className={"absolute left-4 right-4 top-0 h-px " + tone.connector} />
            {node.children.map((child) => (
              <div key={child.id} className="relative flex flex-col items-center">
                <div className={"absolute -top-8 h-8 w-px " + tone.connector} />
                <InteractiveTreeNode node={child} onEdit={onEdit} onDelete={onDelete} onAddChild={onAddChild} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function OrgChartClientPage({ nodes, stats }: { nodes: OrgNode[]; stats: Stats }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const [activeDragNode, setActiveDragNode] = useState<OrgTreeNode | null>(null);
  
  // Dialog states
  const [editingNode, setEditingNode] = useState<OrgTreeNode | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [deletingNode, setDeletingNode] = useState<OrgTreeNode | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [creatingParentId, setCreatingParentId] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
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
  
  const filteredTree = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tree;
    
    // Simple filter for demo - real implementation might need recursive filtering
    return tree.filter(node => 
      node.name.toLowerCase().includes(q) || 
      node.code.toLowerCase().includes(q) ||
      node.children.some(c => c.name.toLowerCase().includes(q))
    );
  }, [tree, query]);

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
    const nodeId = parseInt(active.id.toString().replace('node-', ''));
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      // Cast to OrgTreeNode for active drag overlay
      setActiveDragNode({ ...node, children: [] } as OrgTreeNode);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragNode(null);
    const { active, over } = event;
    
    if (!over) return;
    if (active.id === over.id) return;
    
    const nodeId = parseInt(active.id.toString().replace('node-', ''));
    let newParentId: number | null = null;
    
    if (over.id !== 'root-dropzone') {
      newParentId = parseInt(over.id.toString().replace('node-', ''));
    }
    
    // Optimistic UI could be implemented here
    
    // Server action
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

  return (
    <AdminPageShell eyebrow="HC • Org Chart" title="PDF-Style Organization Chart" description="Visualisasi struktur organisasi bergaya PDF, tetap editable dengan action node dan drag & drop reparenting.">
      <div className="space-y-6">
        <EnterpriseScorecards items={scorecards} />
        
        <Card className="overflow-hidden border-slate-200/60 shadow-sm">
          <CardHeader className="gap-4 border-b bg-white pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-lg">Struktur Organisasi (PDF-Style Editable)</CardTitle>
              <CardDescription>Root di atas, child berjajar horizontal seperti PDF. Lokasi tampil sebagai keterangan di tiap user.</CardDescription>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari node..." className="pl-9 h-9" />
              </div>
              <Button onClick={() => handleCreateClick(null)} size="sm" className="gap-1.5 shrink-0 shadow-sm">
                <Plus className="size-4" /> Root Node
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="relative max-h-[72vh] min-h-[560px] overflow-auto bg-[#f8fafc]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.08)_1px,transparent_0)] [background-size:24px_24px]" />
              <div className="relative min-w-[1200px] p-8">
                {isPending && (
                  <div className="sticky left-0 top-0 z-20 h-1 overflow-hidden bg-primary/20">
                    <div className="h-full w-1/3 animate-pulse bg-primary" />
                  </div>
                )}

                <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-xs text-slate-600 shadow-sm backdrop-blur">
                  <span className="font-semibold text-slate-900">Legend:</span>
                  <span className="rounded-full bg-slate-900 px-2.5 py-1 font-semibold text-white">BOD / EXECUTIVE</span>
                  <span className="rounded-full bg-sky-100 px-2.5 py-1 font-semibold text-sky-800">MANAGERIAL</span>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800">SUPERVISORY</span>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800">STAFF / UNIT</span>
                  <span className="ml-auto hidden text-slate-500 lg:inline">Hover node untuk action. Drag grip untuk pindah parent.</span>
                </div>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  {filteredTree.length > 0 ? (
                    <div className="flex min-h-[420px] items-start justify-center gap-12 pb-10">
                      {filteredTree.map((node) => (
                        <InteractiveTreeNode
                          key={node.id}
                          node={node}
                          onEdit={handleEditClick}
                          onDelete={handleDeleteClick}
                          onAddChild={handleCreateClick}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 shadow-sm">
                      <GitBranch className="mx-auto mb-3 size-10 text-slate-300" />
                      <p className="font-medium text-slate-700">Belum ada struktur organisasi</p>
                      <p className="mb-4 mt-1 text-sm">Mulai dengan membuat root node pertama Anda</p>
                      <Button onClick={() => handleCreateClick(null)} variant="outline" className="shadow-sm">
                        <Plus className="mr-2 size-4" /> Buat Root Node
                      </Button>
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
                      <div className="w-[260px] rotate-2 rounded-2xl border border-primary/50 bg-white/95 p-3 shadow-xl backdrop-blur-sm">
                        <div className="flex items-center gap-2">
                          <GripVertical className="size-4 text-primary" />
                          <h3 className="font-semibold text-slate-900">{activeDragNode.name}</h3>
                          <Badge variant="secondary" className="ml-auto text-[10px]">{activeDragNode.nodeType}</Badge>
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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




