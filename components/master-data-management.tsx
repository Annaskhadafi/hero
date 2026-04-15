"use client";

import { useState } from "react";
import { Layers, Building2, Users, GitBranch, Plus, Search, Pencil, Trash2, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { MasterSection, MasterDepartment, MasterPosition, OrgStructure } from "@/lib/master-data";
import {
  manageSectionAction,
  manageDepartmentAction,
  managePositionAction,
  manageOrgStructureAction,
  type MasterDataActionState,
} from "@/app/dashboard/master-data/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MasterDataManagementProps {
  sections: MasterSection[];
  departments: MasterDepartment[];
  positions: MasterPosition[];
  orgStructures: OrgStructure[];
}

const INITIAL_ACTION_STATE: MasterDataActionState = {
  status: "idle",
  message: "",
};

export function MasterDataManagement({
  sections,
  departments,
  positions,
  orgStructures,
}: MasterDataManagementProps) {
  const [activeTab, setActiveTab] = useState("sections");

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Master Data</h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Kelola data master Section, Department, Jabatan, dan Struktur Organisasi untuk Approval Engine
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-white p-1">
          <TabsTrigger value="sections" className="flex items-center gap-2">
            <Layers className="size-4" />
            <span>Section</span>
            <Badge variant="secondary" className="ml-1 bg-[#eff6ff] text-[#3b82f6]">
              {sections.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building2 className="size-4" />
            <span>Department</span>
            <Badge variant="secondary" className="ml-1 bg-[#f0fdf4] text-[#16a34a]">
              {departments.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="positions" className="flex items-center gap-2">
            <Users className="size-4" />
            <span>Jabatan</span>
            <Badge variant="secondary" className="ml-1 bg-[#fef3c7] text-[#d97706]">
              {positions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="org-structures" className="flex items-center gap-2">
            <GitBranch className="size-4" />
            <span>Struktur Organisasi</span>
            <Badge variant="secondary" className="ml-1 bg-[#f5f3ff] text-[#9333ea]">
              {orgStructures.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sections" className="space-y-4">
          <SectionManagement sections={sections} />
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <DepartmentManagement departments={departments} />
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <PositionManagement positions={positions} departments={departments} />
        </TabsContent>

        <TabsContent value="org-structures" className="space-y-4">
          <OrgStructureManagement
            orgStructures={orgStructures}
            positions={positions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// SECTION MANAGEMENT COMPONENT
function SectionManagement({ sections }: { sections: MasterSection[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<MasterSection | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredSections = sections.filter(
    (section) =>
      section.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (section?: MasterSection) => {
    if (section) {
      setEditingSection(section);
      setFormData({
        code: section.code,
        name: section.name,
        description: section.description,
        isActive: section.isActive,
      });
    } else {
      setEditingSection(null);
      setFormData({ code: "", name: "", description: "", isActive: true });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const form = new FormData();
    form.append("intent", editingSection ? "update" : "create");
    if (editingSection) form.append("id", editingSection.id.toString());
    form.append("code", formData.code);
    form.append("name", formData.name);
    form.append("description", formData.description);
    form.append("isActive", formData.isActive.toString());

    const result = await manageSectionAction(INITIAL_ACTION_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
      setIsDialogOpen(false);
      setEditingSection(null);
      setFormData({ code: "", name: "", description: "", isActive: true });
    } else {
      toast.error(result.message);
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (section: MasterSection) => {
    if (!confirm(`Are you sure you want to delete section "${section.name}"?`)) {
      return;
    }

    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", section.id.toString());

    const result = await manageSectionAction(INITIAL_ACTION_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Card className="border-[#e2e8f0]">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-[#1e293b]">Daftar Section</CardTitle>
          <CardDescription className="text-sm text-[#64748b]">
            Kelompok kerja atau bagian dalam organisasi
          </CardDescription>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-[#3b82f6] hover:bg-[#2563eb]"
        >
          <Plus className="mr-2 size-4" />
          Tambah Section
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
            <Input
              placeholder="Cari section..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-sm pl-9"
            />
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F5F7F9]">
                <TableHead className="w-[100px]">Kode</TableHead>
                <TableHead>Nama Section</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSections.length > 0 ? (
                filteredSections.map((section) => (
                  <TableRow key={section.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {section.code}
                    </TableCell>
                    <TableCell className="font-medium">{section.name}</TableCell>
                    <TableCell className="text-[#64748b]">
                      {section.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={section.isActive ? "default" : "secondary"}
                        className={
                          section.isActive
                            ? "bg-[#10b981] text-white"
                            : "bg-[#cbd5e1] text-[#64748b]"
                        }
                      >
                        {section.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(section)}
                          className="size-8 text-[#3b82f6] hover:bg-[#eff6ff]"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(section)}
                          className="size-8 text-[#ef4444] hover:bg-[#fef2f2]"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-[#64748b]">
                    Tidak ada data section
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingSection ? "Edit Section" : "Tambah Section"}</DialogTitle>
            <DialogDescription>
              {editingSection
                ? "Ubah informasi section yang sudah ada"
                : "Tambahkan section baru ke dalam sistem"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Section</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., OPS, FIN, HR"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Section</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Operations, Finance, HR"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi singkat tentang section ini"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Aktif</Label>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb]">
                {isSubmitting ? "Menyimpan..." : editingSection ? "Simpan Perubahan" : "Tambah Section"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// DEPARTMENT MANAGEMENT COMPONENT
function DepartmentManagement({
  departments,
}: {
  departments: MasterDepartment[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<MasterDepartment | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredDepartments = departments.filter(
    (dept) =>
      dept.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (department?: MasterDepartment) => {
    if (department) {
      setEditingDepartment(department);
      setFormData({
        code: department.code,
        name: department.name,
        description: department.description,
        isActive: department.isActive,
      });
    } else {
      setEditingDepartment(null);
      setFormData({ code: "", name: "", description: "", isActive: true });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const form = new FormData();
    form.append("intent", editingDepartment ? "update" : "create");
    if (editingDepartment) form.append("id", editingDepartment.id.toString());
    form.append("code", formData.code);
    form.append("name", formData.name);
    form.append("description", formData.description);
    form.append("isActive", formData.isActive.toString());

    const result = await manageDepartmentAction(INITIAL_ACTION_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
      setIsDialogOpen(false);
      setEditingDepartment(null);
      setFormData({ code: "", name: "", description: "", isActive: true });
    } else {
      toast.error(result.message);
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (department: MasterDepartment) => {
    if (!confirm(`Are you sure you want to delete department "${department.name}"?`)) {
      return;
    }

    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", department.id.toString());

    const result = await manageDepartmentAction(INITIAL_ACTION_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Card className="border-[#e2e8f0]">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-[#1e293b]">Daftar Department</CardTitle>
          <CardDescription className="text-sm text-[#64748b]">
            Unit kerja dalam organisasi
          </CardDescription>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-[#3b82f6] hover:bg-[#2563eb]"
        >
          <Plus className="mr-2 size-4" />
          Tambah Department
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
            <Input
              placeholder="Cari department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-sm pl-9"
            />
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F5F7F9]">
                <TableHead className="w-[100px]">Kode</TableHead>
                <TableHead>Nama Department</TableHead>
                <TableHead>Deskripsi</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartments.length > 0 ? (
                filteredDepartments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-mono text-sm font-medium">{dept.code}</TableCell>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-[#64748b]">
                      {dept.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={dept.isActive ? "default" : "secondary"}
                        className={
                          dept.isActive
                            ? "bg-[#10b981] text-white"
                            : "bg-[#cbd5e1] text-[#64748b]"
                        }
                      >
                        {dept.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(dept)}
                          className="size-8 text-[#3b82f6] hover:bg-[#eff6ff]"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(dept)}
                          className="size-8 text-[#ef4444] hover:bg-[#fef2f2]"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-[#64748b]">
                    Tidak ada data department
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingDepartment ? "Edit Department" : "Tambah Department"}</DialogTitle>
            <DialogDescription>
              {editingDepartment
                ? "Ubah informasi department yang sudah ada"
                : "Tambahkan department baru ke dalam sistem"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dept-code">Kode Department</Label>
              <Input
                id="dept-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., FIN-ACC, HR-GA"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-name">Nama Department</Label>
              <Input
                id="dept-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Accounting, General Affairs"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-description">Deskripsi</Label>
              <Textarea
                id="dept-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi singkat tentang department ini"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="dept-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="dept-isActive">Aktif</Label>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb]">
                {isSubmitting ? "Menyimpan..." : editingDepartment ? "Simpan Perubahan" : "Tambah Department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// POSITION (JABATAN) MANAGEMENT COMPONENT
function PositionManagement({
  positions,
  departments,
}: {
  positions: MasterPosition[];
  departments: MasterDepartment[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<MasterPosition | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    departmentId: "",
    level: 1,
    description: "",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPositions = positions.filter(
    (pos) =>
      pos.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pos.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pos.departmentName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (position?: MasterPosition) => {
    if (position) {
      setEditingPosition(position);
      setFormData({
        code: position.code,
        name: position.name,
        departmentId: position.departmentId?.toString() || "",
        level: position.level,
        description: position.description,
        isActive: position.isActive,
      });
    } else {
      setEditingPosition(null);
      setFormData({ code: "", name: "", departmentId: "", level: 1, description: "", isActive: true });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const form = new FormData();
    form.append("intent", editingPosition ? "update" : "create");
    if (editingPosition) form.append("id", editingPosition.id.toString());
    form.append("code", formData.code);
    form.append("name", formData.name);
    form.append("departmentId", formData.departmentId);
    form.append("level", formData.level.toString());
    form.append("description", formData.description);
    form.append("isActive", formData.isActive.toString());

    const result = await managePositionAction(INITIAL_ACTION_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
      setIsDialogOpen(false);
      setEditingPosition(null);
      setFormData({ code: "", name: "", departmentId: "", level: 1, description: "", isActive: true });
    } else {
      toast.error(result.message);
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (position: MasterPosition) => {
    if (!confirm(`Are you sure you want to delete position "${position.name}"?`)) {
      return;
    }

    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", position.id.toString());

    const result = await managePositionAction(INITIAL_ACTION_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Card className="border-[#e2e8f0]">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-[#1e293b]">Daftar Jabatan</CardTitle>
          <CardDescription className="text-sm text-[#64748b]">
            Posisi/jabatan dalam organisasi
          </CardDescription>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-[#3b82f6] hover:bg-[#2563eb]"
        >
          <Plus className="mr-2 size-4" />
          Tambah Jabatan
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
            <Input
              placeholder="Cari jabatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-sm pl-9"
            />
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F5F7F9]">
                <TableHead className="w-[100px]">Kode</TableHead>
                <TableHead>Nama Jabatan</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="w-[80px]">Level</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPositions.length > 0 ? (
                filteredPositions.map((pos) => (
                  <TableRow key={pos.id}>
                    <TableCell className="font-mono text-sm font-medium">{pos.code}</TableCell>
                    <TableCell className="font-medium">{pos.name}</TableCell>
                    <TableCell>
                      {pos.departmentName ? (
                        <Badge variant="outline" className="bg-[#f1f5f9]">
                          {pos.departmentName}
                        </Badge>
                      ) : (
                        <span className="text-[#94a3b8]">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-[#fef3c7] text-[#92400e]">
                        L{pos.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={pos.isActive ? "default" : "secondary"}
                        className={
                          pos.isActive
                            ? "bg-[#10b981] text-white"
                            : "bg-[#cbd5e1] text-[#64748b]"
                        }
                      >
                        {pos.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(pos)}
                          className="size-8 text-[#3b82f6] hover:bg-[#eff6ff]"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(pos)}
                          className="size-8 text-[#ef4444] hover:bg-[#fef2f2]"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-[#64748b]">
                    Tidak ada data jabatan
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingPosition ? "Edit Jabatan" : "Tambah Jabatan"}</DialogTitle>
            <DialogDescription>
              {editingPosition
                ? "Ubah informasi jabatan yang sudah ada"
                : "Tambahkan jabatan baru ke dalam sistem"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pos-code">Kode Jabatan</Label>
                <Input
                  id="pos-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., MGR, SPV"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pos-level">Level</Label>
                <Select
                  value={formData.level.toString()}
                  onValueChange={(value) => setFormData({ ...formData, level: parseInt(value) })}
                >
                  <SelectTrigger id="pos-level">
                    <SelectValue placeholder="Pilih level" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                      <SelectItem key={level} value={level.toString()}>
                        Level {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos-name">Nama Jabatan</Label>
              <Input
                id="pos-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Manager, Supervisor, Staff"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos-department">Department</Label>
              <Select
                value={formData.departmentId}
                onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
              >
                <SelectTrigger id="pos-department">
                  <SelectValue placeholder="Pilih department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">- Tidak ada -</SelectItem>
                  {departments
                    .filter((d) => d.isActive)
                    .map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name} ({dept.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos-description">Deskripsi</Label>
              <Textarea
                id="pos-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi singkat tentang jabatan ini"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="pos-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="pos-isActive">Aktif</Label>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb]">
                {isSubmitting ? "Menyimpan..." : editingPosition ? "Simpan Perubahan" : "Tambah Jabatan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ORGANIZATIONAL STRUCTURE MANAGEMENT COMPONENT
function OrgStructureManagement({
  orgStructures,
  positions,
}: {
  orgStructures: OrgStructure[];
  positions: MasterPosition[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrgStructure | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    jobType: "default",
    positionId: "",
    managerPositionId: "",
    approvalLevel: 1,
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const jobTypes = ["default", "office", "field", "contractor", "project"];

  const filteredOrgStructures = orgStructures.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.positionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.jobType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (org?: OrgStructure) => {
    if (org) {
      setEditingOrg(org);
      setFormData({
        name: org.name,
        jobType: org.jobType,
        positionId: org.positionId.toString(),
        managerPositionId: org.managerPositionId?.toString() || "",
        approvalLevel: org.approvalLevel,
        isActive: org.isActive,
      });
    } else {
      setEditingOrg(null);
      setFormData({ name: "", jobType: "default", positionId: "", managerPositionId: "", approvalLevel: 1, isActive: true });
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
    form.append("positionId", formData.positionId);
    form.append("managerPositionId", formData.managerPositionId);
    form.append("approvalLevel", formData.approvalLevel.toString());
    form.append("isActive", formData.isActive.toString());

    const result = await manageOrgStructureAction(INITIAL_ACTION_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
      setIsDialogOpen(false);
      setEditingOrg(null);
      setFormData({ name: "", jobType: "default", positionId: "", managerPositionId: "", approvalLevel: 1, isActive: true });
    } else {
      toast.error(result.message);
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (org: OrgStructure) => {
    if (!confirm(`Are you sure you want to delete organizational structure "${org.name}"?`)) {
      return;
    }

    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", org.id.toString());

    const result = await manageOrgStructureAction(INITIAL_ACTION_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Card className="border-[#e2e8f0]">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-[#1e293b]">Struktur Organisasi</CardTitle>
          <CardDescription className="text-sm text-[#64748b]">
            Konfigurasi hierarki organisasi untuk Approval Engine. Dapat dikustomisasi per jenis pekerjaan.
          </CardDescription>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-[#3b82f6] hover:bg-[#2563eb]"
        >
          <Plus className="mr-2 size-4" />
          Tambah Struktur
        </Button>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 border-[#dbeafe] bg-[#eff6ff]">
          <AlertCircle className="size-4 text-[#3b82f6]" />
          <AlertDescription className="text-[#1e40af]">
            Struktur organisasi ini menjadi acuan utama untuk Approval Engine. Setiap jenis pekerjaan dapat memiliki konfigurasi approval yang berbeda.
          </AlertDescription>
        </Alert>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
            <Input
              placeholder="Cari struktur organisasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-sm pl-9"
            />
          </div>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F5F7F9]">
                <TableHead>Nama Struktur</TableHead>
                <TableHead>Jenis Pekerjaan</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead className="w-[100px]">Level Approval</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrgStructures.length > 0 ? (
                filteredOrgStructures.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-[#f1f5f9] capitalize">
                        {org.jobType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{org.positionName}</span>
                        <span className="text-xs text-[#64748b]">{org.positionCode}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {org.managerPositionName ? (
                        <Badge variant="outline" className="bg-[#f0fdf4] text-[#16a34a]">
                          {org.managerPositionName}
                        </Badge>
                      ) : (
                        <span className="text-[#94a3b8]">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-[#f5f3ff] text-[#7c3aed]">
                        Level {org.approvalLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={org.isActive ? "default" : "secondary"}
                        className={
                          org.isActive
                            ? "bg-[#10b981] text-white"
                            : "bg-[#cbd5e1] text-[#64748b]"
                        }
                      >
                        {org.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(org)}
                          className="size-8 text-[#3b82f6] hover:bg-[#eff6ff]"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(org)}
                          className="size-8 text-[#ef4444] hover:bg-[#fef2f2]"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-[#64748b]">
                    Tidak ada data struktur organisasi
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{editingOrg ? "Edit Struktur Organisasi" : "Tambah Struktur Organisasi"}</DialogTitle>
            <DialogDescription>
              {editingOrg
                ? "Ubah konfigurasi struktur organisasi"
                : "Tambahkan konfigurasi struktur organisasi baru untuk Approval Engine"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="org-name">Nama Struktur</Label>
              <Input
                id="org-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Struktur Field Operations"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="org-jobType">Jenis Pekerjaan</Label>
                <Select
                  value={formData.jobType}
                  onValueChange={(value) => setFormData({ ...formData, jobType: value })}
                >
                  <SelectTrigger id="org-jobType">
                    <SelectValue placeholder="Pilih jenis pekerjaan" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        <span className="capitalize">{type}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[#64748b]">
                  Approval engine akan menggunakan konfigurasi sesuai jenis pekerjaan
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-approvalLevel">Level Approval</Label>
                <Select
                  value={formData.approvalLevel.toString()}
                  onValueChange={(value) => setFormData({ ...formData, approvalLevel: parseInt(value) })}
                >
                  <SelectTrigger id="org-approvalLevel">
                    <SelectValue placeholder="Pilih level" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <SelectItem key={level} value={level.toString()}>
                        Level {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-position">Jabatan</Label>
              <Select
                value={formData.positionId}
                onValueChange={(value) => setFormData({ ...formData, positionId: value })}
              >
                <SelectTrigger id="org-position">
                  <SelectValue placeholder="Pilih jabatan" />
                </SelectTrigger>
                <SelectContent>
                  {positions
                    .filter((p) => p.isActive)
                    .map((pos) => (
                      <SelectItem key={pos.id} value={pos.id.toString()}>
                        {pos.name} ({pos.code}) - Level {pos.level}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-manager">Manager Position (Opsional)</Label>
              <Select
                value={formData.managerPositionId}
                onValueChange={(value) => setFormData({ ...formData, managerPositionId: value })}
              >
                <SelectTrigger id="org-manager">
                  <SelectValue placeholder="Pilih manager position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">- Tidak ada -</SelectItem>
                  {positions
                    .filter((p) => p.isActive && p.id.toString() !== formData.positionId)
                    .map((pos) => (
                      <SelectItem key={pos.id} value={pos.id.toString()}>
                        {pos.name} ({pos.code}) - Level {pos.level}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-[#64748b]">
                Jabatan atasan langsung untuk approval workflow
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="org-isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="org-isActive">Aktif</Label>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb]">
                {isSubmitting ? "Menyimpan..." : editingOrg ? "Simpan Perubahan" : "Tambah Struktur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
