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
  employees: Array<{ id: number; employeeId: string; fullName: string; positionName: string | null }>;
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

// Draggable + Droppable Tree Node Component
function InteractiveTreeNode({ 
  node, 
  onEdit, 
  onDelete, 
  onAddChild 
}: { 
  node: OrgTreeNode; 
  onEdit: (node: OrgTreeNode) => void; 
  onDelete: (node: OrgTreeNode) => void;
  onAddChild: (parentId: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Setup draggable (node as item being dragged)
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `node-${node.id}`,
    data: { type: "org-node", node },
  });
  
  // Setup droppable (node as target for dropped items)
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `node-${node.id}`,
    data: { type: "org-node", node },
  });
  
  // Combine refs (simple approach for div that is both draggable and droppable)
  const setRefs = (element: HTMLElement | null) => {
    setDragRef(element);
    setDropRef(element);
  };

  return (
    <div className="space-y-3 relative">
      <div 
        ref={setRefs}
        className={`rounded-xl border bg-white p-4 shadow-sm transition-all duration-200
          ${isDragging ? "opacity-40 ring-2 ring-primary scale-[0.98]" : ""}
          ${isOver && !isDragging ? "ring-2 ring-green-500 bg-green-50/50 scale-[1.01] shadow-md" : ""}
          hover:border-primary/30
        `} 
        style={{ marginLeft: `${Math.min(node.hierarchyLevel, 6) * 28}px` }}
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div 
              {...listeners} 
              {...attributes} 
              className="mt-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
              title="Drag untuk memindahkan node ini"
            >
              <GripVertical className="size-4" />
            </div>
            
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-slate-900 cursor-pointer hover:text-primary" onClick={() => setIsExpanded(!isExpanded)}>
                  {node.name}
                  {node.children.length > 0 && (
                    <span className="ml-2 text-xs text-slate-400 font-normal bg-slate-100 px-1.5 py-0.5 rounded">
                      {isExpanded ? '▼' : '▶'} {node.children.length}
                    </span>
                  )}
                </h3>
                <Badge variant="secondary" className="text-[10px] uppercase px-1.5 py-0">{node.nodeType}</Badge>
                <Badge variant="outline" className="text-[10px] uppercase px-1.5 py-0">Lvl {node.hierarchyLevel}</Badge>
              </div>
              <p className="text-xs text-slate-500">
                {[node.departmentName, node.sectionName, node.siteName, node.workLocationName].filter(Boolean).join(" • ") || node.code}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              <UserRound className="size-3" />
              {node.employeeCount} assigned
            </div>
            
            <div className="flex items-center gap-1 border-l pl-2 ml-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-green-600 hover:bg-green-50" onClick={() => onAddChild(node.id)} title="Tambah Child Node">
                <Plus className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => onEdit(node)} title="Edit Node">
                <Edit className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={() => onDelete(node)} title="Hapus Node">
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Employees list (collapsed by default if many) */}
        {node.employees.length > 0 && isExpanded && (
          <div className="mt-3 pl-8 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {node.employees.slice(0, 6).map((employee) => (
              <div key={employee.id} className="rounded-lg border bg-slate-50/50 p-2 text-xs flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-medium">
                  {employee.fullName.charAt(0)}
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium truncate">{employee.fullName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{employee.employeeId} • {employee.positionName ?? "-"}</p>
                </div>
              </div>
            ))}
            {node.employees.length > 6 && (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/30 p-2 text-xs flex items-center justify-center text-slate-500">
                + {node.employees.length - 6} lainnya
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Render children */}
      {isExpanded && node.children.length > 0 && (
        <div className="space-y-3 mt-3 relative before:absolute before:left-4 before:top-[-12px] before:bottom-6 before:w-px before:bg-slate-200">
          {node.children.map((child) => (
            <div key={child.id} className="relative before:absolute before:left-[-12px] before:top-8 before:w-3 before:h-px before:bg-slate-200">
              <InteractiveTreeNode 
                node={child} 
                onEdit={onEdit} 
                onDelete={onDelete} 
                onAddChild={onAddChild} 
              />
            </div>
          ))}
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
    <AdminPageShell eyebrow="HC • Org Chart" title="Interactive Org Chart" description="Visualisasi interaktif struktur organisasi. Drag & drop node untuk memindahkan posisinya (reparenting).">
      <div className="space-y-6">
        <EnterpriseScorecards items={scorecards} />
        
        <Card className="border-slate-200/60 shadow-sm overflow-hidden">
          <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between bg-slate-50/50 border-b pb-4">
            <div>
              <CardTitle className="text-lg">Struktur Organisasi (Editable Canvas)</CardTitle>
              <CardDescription>Drag icon <GripVertical className="inline size-3 mx-1" /> untuk memindahkan node. Edit properties untuk merubah departemen.</CardDescription>
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
            <div className="overflow-x-auto bg-[#f8fafc] min-h-[500px]">
              <div className="min-w-[800px] p-6 space-y-4">
                {isPending && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 overflow-hidden">
                    <div className="h-full bg-primary w-1/3 animate-pulse"></div>
                  </div>
                )}
                
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                  {filteredTree.length > 0 ? (
                    <div className="space-y-4">
                      {filteredTree.map((node) => (
                        <InteractiveTreeNode 
                          key={node.id} 
                          node={node} 
                          onEdit={handleEditClick}
                          onDelete={handleDeleteClick}
                          onAddChild={handleCreateClick}
                        />
                      ))}
                      
                      {/* Root Dropzone - visible when dragging to move node to root level */}
                      <div 
                        ref={setRootDropRef}
                        className={`h-24 rounded-xl border-2 border-dashed flex items-center justify-center text-sm transition-colors mt-8
                          ${isRootOver ? "border-green-500 bg-green-50 text-green-700 font-medium" : "border-slate-300 bg-slate-50 text-slate-500"}
                          ${activeDragNode ? "opacity-100" : "opacity-0 h-0 mt-0 overflow-hidden"}
                        `}
                      >
                        Drop di sini untuk jadikan Root Node (Level 0)
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500 shadow-sm">
                      <GitBranch className="size-10 mx-auto text-slate-300 mb-3" />
                      <p className="font-medium text-slate-700">Belum ada struktur organisasi</p>
                      <p className="text-sm mt-1 mb-4">Mulai dengan membuat root node pertama Anda</p>
                      <Button onClick={() => handleCreateClick(null)} variant="outline" className="shadow-sm">
                        <Plus className="size-4 mr-2" /> Buat Root Node
                      </Button>
                    </div>
                  )}

                  {/* Drag Overlay (Visual representation of node being dragged) */}
                  <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
                    {activeDragNode ? (
                      <div className="rounded-xl border border-primary/50 bg-white/95 p-3 shadow-xl backdrop-blur-sm scale-105 rotate-2 cursor-grabbing w-[300px]">
                        <div className="flex items-center gap-2">
                          <GripVertical className="size-4 text-primary" />
                          <h3 className="font-semibold text-slate-900">{activeDragNode.name}</h3>
                          <Badge variant="secondary" className="text-[10px] ml-auto">{activeDragNode.nodeType}</Badge>
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
            <div className="grid grid-cols-3 gap-4 pt-2 border-t">
              <div className="space-y-2">
                <Label>Dept ID</Label>
                <Input type="number" value={formData.departmentId || ''} onChange={(e) => setFormData({...formData, departmentId: e.target.value})} placeholder="Opsional" />
              </div>
              <div className="space-y-2">
                <Label>Section ID</Label>
                <Input type="number" value={formData.sectionId || ''} onChange={(e) => setFormData({...formData, sectionId: e.target.value})} placeholder="Opsional" />
              </div>
              <div className="space-y-2">
                <Label>Site ID</Label>
                <Input type="number" value={formData.siteId || ''} onChange={(e) => setFormData({...formData, siteId: e.target.value})} placeholder="Opsional" />
              </div>
            </div>
            
            <Alert className="col-span-1 bg-amber-50 text-amber-800 border-amber-200 mt-2">
              <AlertTriangle className="size-4 text-amber-600" />
              <AlertDescription className="text-xs">
                Perubahan pada Department, Section, atau Site akan diaplikasikan juga ke semua karyawan yang ditugaskan pada node ini (Cascade Update).
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




