"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Building2, Users, GitBranch, GitPullRequest, Plus, Search, Pencil, Trash2, X, AlertCircle, MapPin, Clock3, Tags } from "lucide-react";
import { toast } from "sonner";
import type { ApprovalMatrix, MasterSection, MasterSubSection, MasterDepartment, MasterPosition, OrgStructure, MasterSite, MasterAttendanceShift, MasterCategoryOption } from "@/lib/master-data";
import {
  manageAttendanceShiftAction,
  manageMasterCategoryOptionAction,
  manageSectionAction,
  manageSubSectionAction,
  manageDepartmentAction,
  manageSiteAction,
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
import { OrgStructureBuilder } from "@/components/org-structure-builder";
import { ApprovalMatrixManager } from "@/components/approval-matrix-manager";
import { ApprovalRouteSimulator } from "@/components/approval-route-simulator";

interface MasterDataManagementProps {
  sections: MasterSection[];
  subSections: MasterSubSection[];
  departments: MasterDepartment[];
  sites: MasterSite[];
  positions: MasterPosition[];
  attendanceShifts: MasterAttendanceShift[];
  categoryOptions: MasterCategoryOption[];
  orgStructures: OrgStructure[];
  approvalMatrices: ApprovalMatrix[];
  employees: any[];
}

const INITIAL_ACTION_STATE: MasterDataActionState = {
  status: "idle",
  message: "",
};

const CATEGORY_TYPE_TABS = [
  { type: "activity_category", label: "Activity" },
  { type: "point_event_category", label: "Point Event" },
  { type: "hse_observation_category", label: "HSE Observation" },
  { type: "hse_incident_type", label: "HSE Incident" },
  { type: "hse_severity", label: "HSE Severity" },
  { type: "hse_observation_status", label: "Observation Status" },
  { type: "hse_incident_status", label: "Incident Status" },
  { type: "attendance_event_type", label: "Attendance Event" },
  { type: "attendance_status", label: "Attendance Status" },
  { type: "training_status", label: "Training Status" },
  { type: "wellness_metric_type", label: "Wellness Metric" },
  { type: "wellness_status", label: "Wellness Status" },
  { type: "timesheet_status", label: "Timesheet Status" },
  { type: "daily_report_status", label: "Report Status" },
] as const;

type CategoryTypeKey = (typeof CATEGORY_TYPE_TABS)[number]["type"];

type IndonesiaRegionOption = {
  id: string;
  name: string;
};

type SiteFormState = {
  name: string;
  provinceId: string;
  provinceName: string;
  regencyId: string;
  regencyName: string;
  districtId: string;
  districtName: string;
  villageId: string;
  villageName: string;
  addressDetail: string;
  customerName: string;
  contractNumber: string;
  isActive: boolean;
};

const EMPTY_SITE_FORM: SiteFormState = {
  name: "",
  provinceId: "",
  provinceName: "",
  regencyId: "",
  regencyName: "",
  districtId: "",
  districtName: "",
  villageId: "",
  villageName: "",
  addressDetail: "",
  customerName: "",
  contractNumber: "",
  isActive: true,
};

function buildSiteLocationPreview(formData: Pick<
  SiteFormState,
  "provinceName" | "regencyName" | "districtName" | "villageName" | "addressDetail"
>) {
  return [
    formData.addressDetail.trim(),
    formData.villageName.trim(),
    formData.districtName.trim(),
    formData.regencyName.trim(),
    formData.provinceName.trim(),
    "Indonesia",
  ]
    .filter(Boolean)
    .join(", ");
}

async function fetchIndonesiaRegionOptions(
  level: "provinces" | "regencies" | "districts" | "villages",
  params: Record<string, string> = {},
) {
  const searchParams = new URLSearchParams({ level, ...params });
  const response = await fetch(`/api/indonesia-regions?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Gagal mengambil data wilayah Indonesia");
  }

  const payload = await response.json() as { options?: IndonesiaRegionOption[] };
  return payload.options ?? [];
}

export function MasterDataManagement({
  sections,
  subSections,
  departments,
  sites,
  positions,
  attendanceShifts,
  categoryOptions,
  orgStructures,
  approvalMatrices,
  employees,
}: MasterDataManagementProps) {
  const [activeTab, setActiveTab] = useState("sections");

  return (
    <div className="space-y-5 p-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Master Data</h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Kelola data referensi global: site, department, section, jabatan, shift, kategori, struktur organisasi, dan
            approval matrix. Kamus pekerjaan Daily Activity tetap dikelola di menu Kamus Aktivitas.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 bg-surface-container-low p-2 md:grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="sections" className="flex items-center gap-2">
            <Layers className="size-4" />
            <span>Section</span>
            <Badge variant="secondary" className="ml-1 bg-[#eff6ff] text-[#3b82f6]">
              {sections.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="sub-sections" className="flex items-center gap-2">
            <Layers className="size-4" />
            <span>Sub Section</span>
            <Badge variant="secondary" className="ml-1 bg-[#eff6ff] text-[#3b82f6]">
              {subSections.length}
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
            <span>Position</span>
            <Badge variant="secondary" className="ml-1 bg-[#fef3c7] text-[#d97706]">
              {positions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="sites" className="flex items-center gap-2">
            <MapPin className="size-4" />
            <span>Lokasi Site</span>
            <Badge variant="secondary" className="ml-1 bg-[#fee2e2] text-[#dc2626]">
              {sites.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="attendance-shifts" className="flex items-center gap-2">
            <Clock3 className="size-4" />
            <span>Shift</span>
            <Badge variant="secondary" className="ml-1 bg-[#e0f2fe] text-[#0369a1]">
              {attendanceShifts.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tags className="size-4" />
            <span>Category</span>
            <Badge variant="secondary" className="ml-1 bg-[#eef2ff] text-[#4f46e5]">
              {categoryOptions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="org-structures" className="flex items-center gap-2">
            <GitBranch className="size-4" />
            <span>Struktur Organisasi</span>
            <Badge variant="secondary" className="ml-1 bg-[#f5f3ff] text-[#9333ea]">
              {orgStructures.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="approval-matrices" className="flex items-center gap-2">
            <GitPullRequest className="size-4" />
            <span>Approval Matrix</span>
            <Badge variant="secondary" className="ml-1 bg-[#ecfeff] text-[#0f766e]">
              {approvalMatrices.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="route-simulation" className="flex items-center gap-2">
            <Search className="size-4" />
            <span>Simulasi Route</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sections" className="space-y-4">
          <SectionManagement sections={sections} departments={departments} />
        </TabsContent>

        <TabsContent value="sub-sections" className="space-y-4">
          <SubSectionManagement subSections={subSections} sections={sections} departments={departments} />
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <DepartmentManagement departments={departments} />
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <PositionManagement positions={positions} departments={departments} sections={sections} sites={sites} />
        </TabsContent>

        <TabsContent value="sites" className="space-y-4">
          <SiteManagement sites={sites} />
        </TabsContent>

        <TabsContent value="attendance-shifts" className="space-y-4">
          <AttendanceShiftManagement attendanceShifts={attendanceShifts} />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <CategoryManagement categoryOptions={categoryOptions} />
        </TabsContent>

        <TabsContent value="org-structures" className="space-y-4">
          <OrgStructureBuilder
            orgStructures={orgStructures}
            positions={positions}
            departments={departments}
            sections={sections}
            sites={sites}
            employees={employees}
          />
        </TabsContent>

        <TabsContent value="approval-matrices" className="space-y-4">
          <ApprovalMatrixManager
            approvalMatrices={approvalMatrices}
            orgStructures={orgStructures}
            departments={departments}
            sections={sections}
            positions={positions}
            sites={sites}
            employees={employees}
          />
        </TabsContent>

        <TabsContent value="route-simulation" className="space-y-4">
          <ApprovalRouteSimulator employees={employees} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getAttendanceShiftWindowLabel(shift: Pick<MasterAttendanceShift, "startTime" | "endTime" | "windowLabel">) {
  if (shift.windowLabel.trim()) {
    return shift.windowLabel;
  }

  if (shift.startTime && shift.endTime) {
    return `${shift.startTime} - ${shift.endTime}`;
  }

  return "As per assignment";
}

function CategoryManagement({ categoryOptions }: { categoryOptions: MasterCategoryOption[] }) {
  const router = useRouter();
  const [activeType, setActiveType] = useState<CategoryTypeKey>(
    CATEGORY_TYPE_TABS[0].type,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<MasterCategoryOption | null>(null);
  const [formData, setFormData] = useState<{
    type: CategoryTypeKey;
    code: string;
    label: string;
    description: string;
    sortOrder: number;
    isActive: boolean;
  }>({
    type: CATEGORY_TYPE_TABS[0].type,
    code: "",
    label: "",
    description: "",
    sortOrder: 0,
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const optionsForType = categoryOptions.filter((option) => option.type === activeType);
  const filteredOptions = optionsForType.filter((option) => {
    const searchValue = `${option.code} ${option.label} ${option.description}`.toLowerCase();
    return searchValue.includes(searchQuery.toLowerCase());
  });

  const activeTypeMeta = CATEGORY_TYPE_TABS.find((item) => item.type === activeType) ?? CATEGORY_TYPE_TABS[0];

  const handleOpenDialog = (option?: MasterCategoryOption) => {
    if (option) {
      setEditingOption(option);
      setFormData({
        type: option.type as CategoryTypeKey,
        code: option.code,
        label: option.label,
        description: option.description,
        sortOrder: option.sortOrder,
        isActive: option.isActive,
      });
    } else {
      setEditingOption(null);
      setFormData({
        type: activeType,
        code: "",
        label: "",
        description: "",
        sortOrder: optionsForType.length + 1,
        isActive: true,
      });
    }

    setIsDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const form = new FormData();
    form.append("intent", editingOption ? "update" : "create");
    if (editingOption) form.append("id", editingOption.id.toString());
    form.append("type", formData.type);
    form.append("code", formData.code);
    form.append("label", formData.label);
    form.append("description", formData.description);
    form.append("sortOrder", formData.sortOrder.toString());
    form.append("isActive", formData.isActive.toString());

    const result = await manageMasterCategoryOptionAction(INITIAL_ACTION_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
      setIsDialogOpen(false);
      setEditingOption(null);
      router.refresh();
    } else {
      toast.error(result.message);
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (option: MasterCategoryOption) => {
    if (!confirm(`Hapus kategori "${option.label}"?`)) {
      return;
    }

    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", option.id.toString());

    const result = await manageMasterCategoryOptionAction(INITIAL_ACTION_STATE, form);
    if (result.status === "success") {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Card className="border-[#e2e8f0]">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-[#1e293b]">Master Kategori Operasional</CardTitle>
          <CardDescription className="text-sm text-[#64748b]">
            Satu pusat opsi untuk dropdown HSE, HC, timesheet, report, activity, dan point event.
          </CardDescription>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-[#3b82f6] hover:bg-[#2563eb]">
          <Plus className="mr-2 size-4" />
          Tambah Kategori
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeType} onValueChange={(value) => setActiveType(value as typeof activeType)}>
          <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
            {CATEGORY_TYPE_TABS.map((item) => (
              <TabsTrigger key={item.type} value={item.type}>
                {item.label}
                <Badge variant="secondary" className="ml-2">
                  {categoryOptions.filter((option) => option.type === item.type).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1e293b]">{activeTypeMeta.label}</p>
              <p className="text-xs text-[#64748b]">Kode dipakai sebagai nilai yang tersimpan di database.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
              <Input
                placeholder="Cari kategori..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full pl-9 sm:w-[260px]"
              />
            </div>
          </div>
          {CATEGORY_TYPE_TABS.map((item) => (
            <TabsContent key={item.type} value={item.type} className="mt-4">
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#F5F7F9]">
                      <TableHead className="w-[180px]">Kode</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[90px]">Urutan</TableHead>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead className="w-[100px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOptions.length > 0 ? (
                      filteredOptions.map((option) => (
                        <TableRow key={option.id}>
                          <TableCell className="font-mono text-sm font-medium">{option.code}</TableCell>
                          <TableCell className="font-medium">{option.label}</TableCell>
                          <TableCell className="text-[#64748b]">{option.description || "-"}</TableCell>
                          <TableCell>{option.sortOrder}</TableCell>
                          <TableCell>
                            <Badge
                              variant={option.isActive ? "default" : "secondary"}
                              className={option.isActive ? "bg-[#10b981] text-white" : "bg-[#cbd5e1] text-[#64748b]"}
                            >
                              {option.isActive ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(option)} className="size-8 text-[#3b82f6] hover:bg-[#eff6ff]">
                                <Pencil className="size-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(option)} className="size-8 text-[#ef4444] hover:bg-[#fef2f2]">
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-[#64748b]">
                          Tidak ada kategori untuk tipe ini.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingOption ? "Edit Kategori" : "Tambah Kategori"}</DialogTitle>
            <DialogDescription>
              Opsi aktif langsung muncul di dropdown halaman terkait.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-type">Jenis Kategori</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as typeof formData.type })}
              >
                <SelectTrigger id="category-type">
                  <SelectValue placeholder="Pilih jenis kategori" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_TYPE_TABS.map((item) => (
                    <SelectItem key={item.type} value={item.type}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category-code">Kode / Value</Label>
                <Input
                  id="category-code"
                  value={formData.code}
                  onChange={(event) => setFormData({ ...formData, code: event.target.value })}
                  placeholder="Manual Adjustment"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-label">Label Tampilan</Label>
                <Input
                  id="category-label"
                  value={formData.label}
                  onChange={(event) => setFormData({ ...formData, label: event.target.value })}
                  placeholder="Manual Adjustment"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category-sort">Urutan</Label>
                <Input
                  id="category-sort"
                  type="number"
                  min={0}
                  value={formData.sortOrder}
                  onChange={(event) => setFormData({ ...formData, sortOrder: Number(event.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-2 pt-7">
                <Switch
                  id="category-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="category-active">Aktif</Label>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb]">
                {isSubmitting ? "Menyimpan..." : "Simpan Kategori"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function AttendanceShiftManagement({ attendanceShifts }: { attendanceShifts: MasterAttendanceShift[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<MasterAttendanceShift | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    label: "",
    startTime: "",
    endTime: "",
    windowLabel: "",
    helper: "",
    sortOrder: 0,
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredShifts = attendanceShifts.filter((shift) => {
    const searchValue = `${shift.code} ${shift.label} ${getAttendanceShiftWindowLabel(shift)} ${shift.helper}`.toLowerCase();
    return searchValue.includes(searchQuery.toLowerCase());
  });

  const handleOpenDialog = (shift?: MasterAttendanceShift) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        code: shift.code,
        label: shift.label,
        startTime: shift.startTime,
        endTime: shift.endTime,
        windowLabel: shift.windowLabel,
        helper: shift.helper,
        sortOrder: shift.sortOrder,
        isActive: shift.isActive,
      });
    } else {
      setEditingShift(null);
      setFormData({
        code: "",
        label: "",
        startTime: "",
        endTime: "",
        windowLabel: "",
        helper: "",
        sortOrder: attendanceShifts.length + 1,
        isActive: true,
      });
    }

    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const form = new FormData();
    form.append("intent", editingShift ? "update" : "create");
    if (editingShift) form.append("id", editingShift.id.toString());
    form.append("code", formData.code);
    form.append("label", formData.label);
    form.append("startTime", formData.startTime);
    form.append("endTime", formData.endTime);
    form.append("windowLabel", formData.windowLabel);
    form.append("helper", formData.helper);
    form.append("sortOrder", formData.sortOrder.toString());
    form.append("isActive", formData.isActive.toString());

    const result = await manageAttendanceShiftAction(INITIAL_ACTION_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
      setIsDialogOpen(false);
      setEditingShift(null);
      router.refresh();
    } else {
      toast.error(result.message);
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (shift: MasterAttendanceShift) => {
    if (!confirm(`Hapus shift "${shift.label}" dari pilihan attendance?`)) {
      return;
    }

    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", shift.id.toString());

    const result = await manageAttendanceShiftAction(INITIAL_ACTION_STATE, form);
    if (result.status === "success") {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Card className="border-[#e2e8f0]">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-[#1e293b]">Pengaturan Shift Attendance</CardTitle>
          <CardDescription className="text-sm text-[#64748b]">
            Master pilihan shift / roster yang muncul di form clock in dan clock out.
          </CardDescription>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-[#3b82f6] hover:bg-[#2563eb]">
          <Plus className="mr-2 size-4" />
          Tambah Shift
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
            <Input
              placeholder="Cari shift..."
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
                <TableHead className="w-[110px]">Kode</TableHead>
                <TableHead>Nama Shift</TableHead>
                <TableHead>Jam / Window</TableHead>
                <TableHead>Helper</TableHead>
                <TableHead className="w-[90px]">Urutan</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShifts.length > 0 ? (
                filteredShifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell className="font-mono text-sm font-medium">{shift.code}</TableCell>
                    <TableCell className="font-medium">{shift.label}</TableCell>
                    <TableCell className="text-[#475569]">{getAttendanceShiftWindowLabel(shift)}</TableCell>
                    <TableCell className="max-w-md text-[#64748b]">{shift.helper || "-"}</TableCell>
                    <TableCell>{shift.sortOrder}</TableCell>
                    <TableCell>
                      <Badge
                        variant={shift.isActive ? "default" : "secondary"}
                        className={shift.isActive ? "bg-[#10b981] text-white" : "bg-[#cbd5e1] text-[#64748b]"}
                      >
                        {shift.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(shift)} className="size-8 text-[#3b82f6] hover:bg-[#eff6ff]">
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(shift)} className="size-8 text-[#ef4444] hover:bg-[#fef2f2]">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-[#64748b]">
                    Tidak ada data shift attendance
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle>{editingShift ? "Edit Shift Attendance" : "Tambah Shift Attendance"}</DialogTitle>
            <DialogDescription>
              Perubahan shift aktif langsung dipakai di dropdown Konteks Attendance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shift-code">Kode Shift</Label>
                <Input
                  id="shift-code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., day"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift-label">Nama Shift</Label>
                <Input
                  id="shift-label"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="e.g., Shift Pagi"
                  required
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="shift-start">Jam Mulai</Label>
                <Input
                  id="shift-start"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  placeholder="07:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift-end">Jam Selesai</Label>
                <Input
                  id="shift-end"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  placeholder="15:00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shift-sort">Urutan</Label>
                <Input
                  id="shift-sort"
                  type="number"
                  min={0}
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-window">Label Window</Label>
              <Input
                id="shift-window"
                value={formData.windowLabel}
                onChange={(e) => setFormData({ ...formData, windowLabel: e.target.value })}
                placeholder="Leave blank to auto-calculate from start - end time"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shift-helper">Catatan Helper</Label>
              <Textarea
                id="shift-helper"
                value={formData.helper}
                onChange={(e) => setFormData({ ...formData, helper: e.target.value })}
                placeholder="Keterangan singkat yang tampil di form attendance"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="shift-isActive" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
              <Label htmlFor="shift-isActive">Aktif di form attendance</Label>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting} className="bg-[#3b82f6] hover:bg-[#2563eb]">
                {isSubmitting ? "Menyimpan..." : editingShift ? "Simpan Perubahan" : "Tambah Shift"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SiteManagement({ sites }: { sites: MasterSite[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<MasterSite | null>(null);
  const [formData, setFormData] = useState<SiteFormState>(EMPTY_SITE_FORM);
  const [provinceOptions, setProvinceOptions] = useState<IndonesiaRegionOption[]>([]);
  const [regencyOptions, setRegencyOptions] = useState<IndonesiaRegionOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<IndonesiaRegionOption[]>([]);
  const [villageOptions, setVillageOptions] = useState<IndonesiaRegionOption[]>([]);
  const [regionError, setRegionError] = useState("");
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingRegencies, setIsLoadingRegencies] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingVillages, setIsLoadingVillages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredSites = sites.filter(
    (site) =>
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const isSiteLocationComplete = Boolean(
    formData.provinceId &&
      formData.regencyId &&
      formData.districtId &&
      formData.villageId,
  );

  useEffect(() => {
    if (!isDialogOpen || provinceOptions.length > 0) {
      return;
    }

    let isCancelled = false;

    const loadProvinces = async () => {
      setIsLoadingProvinces(true);
      setRegionError("");

      try {
        const options = await fetchIndonesiaRegionOptions("provinces");
        if (!isCancelled) {
          setProvinceOptions(options);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error(error);
          setRegionError("Daftar provinsi belum bisa dimuat.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProvinces(false);
        }
      }
    };

    void loadProvinces();

    return () => {
      isCancelled = true;
    };
  }, [isDialogOpen, provinceOptions.length]);

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    if (!formData.provinceId) {
      setRegencyOptions([]);
      return;
    }

    let isCancelled = false;

    const loadRegencies = async () => {
      setIsLoadingRegencies(true);
      setRegionError("");

      try {
        const options = await fetchIndonesiaRegionOptions("regencies", {
          provinceId: formData.provinceId,
        });

        if (!isCancelled) {
          setRegencyOptions(options);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error(error);
          setRegionError("Daftar kota/kabupaten belum bisa dimuat.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingRegencies(false);
        }
      }
    };

    void loadRegencies();

    return () => {
      isCancelled = true;
    };
  }, [formData.provinceId, isDialogOpen]);

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    if (!formData.regencyId) {
      setDistrictOptions([]);
      return;
    }

    let isCancelled = false;

    const loadDistricts = async () => {
      setIsLoadingDistricts(true);
      setRegionError("");

      try {
        const options = await fetchIndonesiaRegionOptions("districts", {
          regencyId: formData.regencyId,
        });

        if (!isCancelled) {
          setDistrictOptions(options);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error(error);
          setRegionError("Daftar wilayah/kecamatan belum bisa dimuat.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingDistricts(false);
        }
      }
    };

    void loadDistricts();

    return () => {
      isCancelled = true;
    };
  }, [formData.regencyId, isDialogOpen]);

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    if (!formData.districtId) {
      setVillageOptions([]);
      return;
    }

    let isCancelled = false;

    const loadVillages = async () => {
      setIsLoadingVillages(true);
      setRegionError("");

      try {
        const options = await fetchIndonesiaRegionOptions("villages", {
          districtId: formData.districtId,
        });

        if (!isCancelled) {
          setVillageOptions(options);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error(error);
          setRegionError("Daftar kelurahan belum bisa dimuat.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingVillages(false);
        }
      }
    };

    void loadVillages();

    return () => {
      isCancelled = true;
    };
  }, [formData.districtId, isDialogOpen]);

  const handleOpenDialog = (site?: MasterSite) => {
    if (site) {
      setEditingSite(site);
      setFormData({
        name: site.name,
        provinceId: site.provinceId,
        provinceName: site.provinceName,
        regencyId: site.regencyId,
        regencyName: site.regencyName,
        districtId: site.districtId,
        districtName: site.districtName,
        villageId: site.villageId,
        villageName: site.villageName,
        addressDetail: site.addressDetail,
        customerName: site.customerName,
        contractNumber: site.contractNumber,
        isActive: site.isActive,
      });
    } else {
      setEditingSite(null);
      setFormData(EMPTY_SITE_FORM);
    }
    setRegionError("");
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const form = new FormData();
    form.append("intent", editingSite ? "update" : "create");
    if (editingSite) form.append("id", editingSite.id.toString());
    form.append("name", formData.name);
    form.append("provinceId", formData.provinceId);
    form.append("provinceName", formData.provinceName);
    form.append("regencyId", formData.regencyId);
    form.append("regencyName", formData.regencyName);
    form.append("districtId", formData.districtId);
    form.append("districtName", formData.districtName);
    form.append("villageId", formData.villageId);
    form.append("villageName", formData.villageName);
    form.append("addressDetail", formData.addressDetail);
    form.append("customerName", formData.customerName);
    form.append("contractNumber", formData.contractNumber);
    form.append("isActive", formData.isActive.toString());

    const result = await manageSiteAction(INITIAL_ACTION_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
      setIsDialogOpen(false);
      setEditingSite(null);
      setFormData(EMPTY_SITE_FORM);
      setRegencyOptions([]);
      setDistrictOptions([]);
      setVillageOptions([]);
      router.refresh();
    } else {
      toast.error(result.message);
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (site: MasterSite) => {
    if (!confirm(`Are you sure you want to delete site "${site.name}"?`)) {
      return;
    }

    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", site.id.toString());

    const result = await manageSiteAction(INITIAL_ACTION_STATE, form);
    if (result.status === "success") {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Card className="border-[#e2e8f0]">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-[#1e293b]">Daftar Lokasi Site</CardTitle>
          <CardDescription className="text-sm text-[#64748b]">
            Master lokasi kerja / site yang dipakai lintas modul
          </CardDescription>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-[#3b82f6] hover:bg-[#2563eb]">
          <Plus className="mr-2 size-4" />
          Tambah Site
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
            <Input
              placeholder="Cari site..."
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
                <TableHead>Nama Site</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>No. Kontrak</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSites.length > 0 ? (
                filteredSites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell className="font-medium">{site.name}</TableCell>
                    <TableCell className="text-[#64748b]">{site.location}</TableCell>
                    <TableCell>{site.customerName}</TableCell>
                    <TableCell>{site.contractNumber}</TableCell>
                    <TableCell>
                      <Badge
                        variant={site.isActive ? "default" : "secondary"}
                        className={site.isActive ? "bg-[#10b981] text-white" : "bg-[#cbd5e1] text-[#64748b]"}
                      >
                        {site.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(site)} className="size-8 text-[#3b82f6] hover:bg-[#eff6ff]">
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(site)} className="size-8 text-[#ef4444] hover:bg-[#fef2f2]">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-[#64748b]">
                    Tidak ada data site
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingSite ? "Edit Site" : "Tambah Site"}</DialogTitle>
            <DialogDescription>
              {editingSite ? "Ubah informasi site yang sudah ada" : "Tambahkan master lokasi site baru"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="site-name">Nama Site</Label>
              <Input id="site-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-country">Negara</Label>
              <Input id="site-country" value="Indonesia" readOnly />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="site-province">Provinsi</Label>
                <Select
                  value={formData.provinceId || "0"}
                  onValueChange={(value) => {
                    if (value === "0") {
                      setFormData({
                        ...formData,
                        provinceId: "",
                        provinceName: "",
                        regencyId: "",
                        regencyName: "",
                        districtId: "",
                        districtName: "",
                        villageId: "",
                        villageName: "",
                      });
                      setRegencyOptions([]);
                      setDistrictOptions([]);
                      setVillageOptions([]);
                      return;
                    }

                    const selectedProvince = provinceOptions.find((option) => option.id === value);
                    setFormData({
                      ...formData,
                      provinceId: value,
                      provinceName: selectedProvince?.name ?? "",
                      regencyId: "",
                      regencyName: "",
                      districtId: "",
                      districtName: "",
                      villageId: "",
                      villageName: "",
                    });
                    setRegencyOptions([]);
                    setDistrictOptions([]);
                    setVillageOptions([]);
                  }}
                >
                  <SelectTrigger id="site-province" disabled={isLoadingProvinces}>
                    <SelectValue placeholder={isLoadingProvinces ? "Memuat provinsi..." : "Pilih provinsi"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Pilih provinsi</SelectItem>
                    {provinceOptions.map((province) => (
                      <SelectItem key={province.id} value={province.id}>
                        {province.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="site-regency">Kota / Kabupaten</Label>
                <Select
                  value={formData.regencyId || "0"}
                  onValueChange={(value) => {
                    if (value === "0") {
                      setFormData({
                        ...formData,
                        regencyId: "",
                        regencyName: "",
                        districtId: "",
                        districtName: "",
                        villageId: "",
                        villageName: "",
                      });
                      setDistrictOptions([]);
                      setVillageOptions([]);
                      return;
                    }

                    const selectedRegency = regencyOptions.find((option) => option.id === value);
                    setFormData({
                      ...formData,
                      regencyId: value,
                      regencyName: selectedRegency?.name ?? "",
                      districtId: "",
                      districtName: "",
                      villageId: "",
                      villageName: "",
                    });
                    setDistrictOptions([]);
                    setVillageOptions([]);
                  }}
                >
                  <SelectTrigger id="site-regency" disabled={!formData.provinceId || isLoadingRegencies}>
                    <SelectValue placeholder={isLoadingRegencies ? "Memuat kota/kabupaten..." : "Pilih kota/kabupaten"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Pilih kota / kabupaten</SelectItem>
                    {regencyOptions.map((regency) => (
                      <SelectItem key={regency.id} value={regency.id}>
                        {regency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="site-district">Wilayah / Kecamatan</Label>
                <Select
                  value={formData.districtId || "0"}
                  onValueChange={(value) => {
                    if (value === "0") {
                      setFormData({
                        ...formData,
                        districtId: "",
                        districtName: "",
                        villageId: "",
                        villageName: "",
                      });
                      setVillageOptions([]);
                      return;
                    }

                    const selectedDistrict = districtOptions.find((option) => option.id === value);
                    setFormData({
                      ...formData,
                      districtId: value,
                      districtName: selectedDistrict?.name ?? "",
                      villageId: "",
                      villageName: "",
                    });
                    setVillageOptions([]);
                  }}
                >
                  <SelectTrigger id="site-district" disabled={!formData.regencyId || isLoadingDistricts}>
                    <SelectValue placeholder={isLoadingDistricts ? "Memuat wilayah..." : "Pilih wilayah / kecamatan"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Pilih wilayah / kecamatan</SelectItem>
                    {districtOptions.map((district) => (
                      <SelectItem key={district.id} value={district.id}>
                        {district.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="site-village">Kelurahan / Desa</Label>
                <Select
                  value={formData.villageId || "0"}
                  onValueChange={(value) => {
                    if (value === "0") {
                      setFormData({
                        ...formData,
                        villageId: "",
                        villageName: "",
                      });
                      return;
                    }

                    const selectedVillage = villageOptions.find((option) => option.id === value);
                    setFormData({
                      ...formData,
                      villageId: value,
                      villageName: selectedVillage?.name ?? "",
                    });
                  }}
                >
                  <SelectTrigger id="site-village" disabled={!formData.districtId || isLoadingVillages}>
                    <SelectValue placeholder={isLoadingVillages ? "Memuat kelurahan..." : "Pilih kelurahan / desa"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Pilih kelurahan / desa</SelectItem>
                    {villageOptions.map((village) => (
                      <SelectItem key={village.id} value={village.id}>
                        {village.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-address-detail">Detail Alamat</Label>
              <Textarea
                id="site-address-detail"
                value={formData.addressDetail}
                onChange={(e) => setFormData({ ...formData, addressDetail: e.target.value })}
                placeholder="Contoh: Jl. Urip Sumoharjo No. 18, dekat gerbang utama"
                rows={3}
              />
            </div>
            {(regionError || formData.villageName) && (
              <Alert className={regionError ? "border-[#fca5a5] bg-[#fff1f2]" : "border-[#bfdbfe] bg-[#eff6ff]"}>
                <AlertDescription>
                  {regionError || `Lokasi tersimpan sebagai: ${buildSiteLocationPreview(formData)}`}
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="site-customer">Customer</Label>
              <Input id="site-customer" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-contract">No. Kontrak</Label>
              <Input id="site-contract" value={formData.contractNumber} onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })} required />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="site-isActive" checked={formData.isActive} onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })} />
              <Label htmlFor="site-isActive">Aktif</Label>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  isLoadingProvinces ||
                  isLoadingRegencies ||
                  isLoadingDistricts ||
                  isLoadingVillages ||
                  !isSiteLocationComplete
                }
                className="bg-[#3b82f6] hover:bg-[#2563eb]"
              >
                {isSubmitting ? "Menyimpan..." : editingSite ? "Simpan Perubahan" : "Tambah Site"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// SECTION MANAGEMENT COMPONENT
function SectionManagement({
  sections,
  departments,
}: {
  sections: MasterSection[];
  departments: MasterDepartment[];
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<MasterSection | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    departmentId: "",
    description: "",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredSections = sections.filter(
    (section) =>
      section.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      section.departmentName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenDialog = (section?: MasterSection) => {
    if (section) {
      setEditingSection(section);
      setFormData({
        code: section.code,
        name: section.name,
        departmentId: section.departmentId?.toString() ?? "",
        description: section.description,
        isActive: section.isActive,
      });
    } else {
      setEditingSection(null);
      setFormData({ code: "", name: "", departmentId: "", description: "", isActive: true });
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
    form.append("departmentId", formData.departmentId);
    form.append("description", formData.description);
    form.append("isActive", formData.isActive.toString());

    const result = await manageSectionAction(INITIAL_ACTION_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
      setIsDialogOpen(false);
      setEditingSection(null);
      setFormData({ code: "", name: "", departmentId: "", description: "", isActive: true });
      router.refresh();
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
      router.refresh();
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
                <TableHead>Department</TableHead>
                <TableHead>Description</TableHead>
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
                    <TableCell>
                      {section.departmentName ? (
                        <Badge variant="outline" className="bg-[#f1f5f9]">
                          {section.departmentName}
                        </Badge>
                      ) : (
                        <span className="text-[#94a3b8]">-</span>
                      )}
                    </TableCell>
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
                  <TableCell colSpan={6} className="h-24 text-center text-[#64748b]">
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
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase().slice(0, 3) })
                }
                placeholder="e.g., OPS, FIN, HR"
                maxLength={3}
                required
              />
              <p className="text-xs text-[#64748b]">Maksimal 3 huruf.</p>
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
              <Label htmlFor="section-department">Department</Label>
              <Select
                value={formData.departmentId || "0"}
                onValueChange={(value) =>
                  setFormData({ ...formData, departmentId: value === "0" ? "" : value })
                }
              >
                <SelectTrigger id="section-department">
                  <SelectValue placeholder="Pilih department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">- Tidak ada -</SelectItem>
                  {departments
                    .filter((department) => department.isActive)
                    .map((department) => (
                      <SelectItem key={department.id} value={department.id.toString()}>
                        {department.name} ({department.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Short description of this section"
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

// SUB SECTION MANAGEMENT COMPONENT
function SubSectionManagement({
  subSections,
  sections,
  departments,
}: {
  subSections: MasterSubSection[];
  sections: MasterSection[];
  departments: MasterDepartment[];
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubSection, setEditingSubSection] = useState<MasterSubSection | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    sectionId: "",
    description: "",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredSubSections = subSections.filter(
    (ss) =>
      ss.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ss.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ss.sectionName ?? "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleOpenDialog = (subSection?: MasterSubSection) => {
    if (subSection) {
      setEditingSubSection(subSection);
      setFormData({
        code: subSection.code,
        name: subSection.name,
        sectionId: subSection.sectionId?.toString() ?? "",
        description: subSection.description,
        isActive: subSection.isActive,
      });
    } else {
      setEditingSubSection(null);
      setFormData({ code: "", name: "", sectionId: "", description: "", isActive: true });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const form = new FormData();
    form.append("intent", editingSubSection ? "update" : "create");
    if (editingSubSection) form.append("id", editingSubSection.id.toString());
    form.append("code", formData.code);
    form.append("name", formData.name);
    form.append("sectionId", formData.sectionId);
    form.append("description", formData.description);
    form.append("isActive", formData.isActive.toString());

    const result = await manageSubSectionAction(INITIAL_ACTION_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
      setIsDialogOpen(false);
      setEditingSubSection(null);
      setFormData({ code: "", name: "", sectionId: "", description: "", isActive: true });
      router.refresh();
    } else {
      toast.error(result.message);
    }

    setIsSubmitting(false);
  };

  const handleDelete = async (subSection: MasterSubSection) => {
    if (!confirm(`Are you sure you want to delete sub section "${subSection.name}"?`)) {
      return;
    }

    const form = new FormData();
    form.append("intent", "delete");
    form.append("id", subSection.id.toString());

    const result = await manageSubSectionAction(INITIAL_ACTION_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Card className="border-[#e2e8f0]">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-lg font-semibold text-[#1e293b]">Daftar Sub Section</CardTitle>
          <CardDescription className="text-sm text-[#64748b]">
            Sub-kelompok kerja di bawah section dalam organisasi
          </CardDescription>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-[#3b82f6] hover:bg-[#2563eb]"
        >
          <Plus className="mr-2 size-4" />
          Tambah Sub Section
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#94a3b8]" />
            <Input
              placeholder="Cari sub section..."
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
                <TableHead>Nama Sub Section</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[100px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubSections.length > 0 ? (
                filteredSubSections.map((ss) => (
                  <TableRow key={ss.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {ss.code}
                    </TableCell>
                    <TableCell className="font-medium">{ss.name}</TableCell>
                    <TableCell>
                      {ss.sectionName ? (
                        <Badge variant="outline" className="bg-[#f1f5f9]">
                          {ss.sectionName}
                        </Badge>
                      ) : (
                        <span className="text-[#94a3b8]">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[#64748b]">
                      {ss.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={ss.isActive ? "default" : "secondary"}
                        className={
                          ss.isActive
                            ? "bg-[#10b981] text-white"
                            : "bg-[#cbd5e1] text-[#64748b]"
                        }
                      >
                        {ss.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(ss)}
                          className="size-8 text-[#3b82f6] hover:bg-[#eff6ff]"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(ss)}
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
                    Tidak ada data sub section
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
            <DialogTitle>{editingSubSection ? "Edit Sub Section" : "Tambah Sub Section"}</DialogTitle>
            <DialogDescription>
              {editingSubSection
                ? "Ubah informasi sub section yang sudah ada"
                : "Tambahkan sub section baru ke dalam sistem"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Sub Section</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase().slice(0, 5) })
                }
                placeholder="e.g., HSEO, OPS1"
                maxLength={5}
                required
              />
              <p className="text-xs text-[#64748b]">Maksimal 5 karakter.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nama Sub Section</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., HSE Officers, Operations Team A"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subsection-section">Section</Label>
              <Select
                value={formData.sectionId || "0"}
                onValueChange={(value) =>
                  setFormData({ ...formData, sectionId: value === "0" ? "" : value })
                }
              >
                <SelectTrigger id="subsection-section">
                  <SelectValue placeholder="Pilih section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">- Tidak ada -</SelectItem>
                  {sections
                    .filter((section) => section.isActive)
                    .map((section) => (
                      <SelectItem key={section.id} value={section.id.toString()}>
                        {section.name} {section.departmentName ? `(${section.departmentName})` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Short description of this sub section"
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
                {isSubmitting ? "Menyimpan..." : editingSubSection ? "Simpan Perubahan" : "Tambah Sub Section"}
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
  const router = useRouter();
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
      router.refresh();
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
      router.refresh();
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
                <TableHead>Description</TableHead>
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
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase().slice(0, 3) })
                }
                placeholder="e.g., FIN, HRD, OPR"
                maxLength={3}
                required
              />
              <p className="text-xs text-[#64748b]">Maksimal 3 huruf.</p>
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
              <Label htmlFor="dept-description">Description</Label>
              <Textarea
                id="dept-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Short description of this department"
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
  sections,
  sites,
}: {
  positions: MasterPosition[];
  departments: MasterDepartment[];
  sections: MasterSection[];
  sites: MasterSite[];
}) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<MasterPosition | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    departmentId: "",
    sectionId: "",
    siteLocation: "",
    level: 1,
    description: "",
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredPositions = positions.filter(
    (pos) =>
      pos.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pos.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pos.departmentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pos.sectionName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSections = formData.departmentId
    ? sections.filter(
        (section) =>
          section.departmentId?.toString() === formData.departmentId,
      )
    : sections;

  const handleOpenDialog = (position?: MasterPosition) => {
    if (position) {
      setEditingPosition(position);
      setFormData({
        code: position.code,
        name: position.name,
        departmentId: position.departmentId?.toString() || "",
        sectionId: position.sectionId?.toString() || "",
        siteLocation: position.siteLocation,
        level: position.level,
        description: position.description,
        isActive: position.isActive,
      });
    } else {
      setEditingPosition(null);
      setFormData({
        code: "",
        name: "",
        departmentId: "",
        sectionId: "",
        siteLocation: "",
        level: 1,
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
    form.append("intent", editingPosition ? "update" : "create");
    if (editingPosition) form.append("id", editingPosition.id.toString());
    form.append("code", formData.code);
    form.append("name", formData.name);
    form.append("departmentId", formData.departmentId);
    form.append("sectionId", formData.sectionId);
    form.append("siteLocation", formData.siteLocation);
    form.append("level", formData.level.toString());
    form.append("description", formData.description);
    form.append("isActive", formData.isActive.toString());

    const result = await managePositionAction(INITIAL_ACTION_STATE, form);

    if (result.status === "success") {
      toast.success(result.message);
      setIsDialogOpen(false);
      setEditingPosition(null);
      setFormData({
        code: "",
        name: "",
        departmentId: "",
        sectionId: "",
        siteLocation: "",
        level: 1,
        description: "",
        isActive: true,
      });
      router.refresh();
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
      router.refresh();
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
                <TableHead>Section</TableHead>
                <TableHead>Lokasi Site</TableHead>
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
                      {pos.sectionName ? (
                        <Badge variant="outline" className="bg-[#f8fafc]">
                          {pos.sectionName}
                        </Badge>
                      ) : (
                        <span className="text-[#94a3b8]">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[#475569]">
                      {pos.siteLocation || "-"}
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
                  <TableCell colSpan={8} className="h-24 text-center text-[#64748b]">
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
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase().slice(0, 3) })
                  }
                  placeholder="e.g., MGR, SPV"
                  maxLength={3}
                  required
                />
                <p className="text-xs text-[#64748b]">Maksimal 3 huruf.</p>
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
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    departmentId: value === "0" ? "" : value,
                    sectionId: "",
                  })
                }
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
              <Label htmlFor="pos-section">Section</Label>
              <Select
                value={formData.sectionId || "0"}
                onValueChange={(value) => {
                  if (value === "0") {
                    setFormData({ ...formData, sectionId: "" });
                    return;
                  }

                  const selectedSection = sections.find((section) => section.id.toString() === value);
                  setFormData({
                    ...formData,
                    sectionId: value,
                    departmentId: selectedSection?.departmentId?.toString() ?? formData.departmentId,
                  });
                }}
              >
                <SelectTrigger id="pos-section">
                  <SelectValue placeholder="Pilih section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">- Tidak ada -</SelectItem>
                  {filteredSections
                    .filter((section) => section.isActive)
                    .map((section) => (
                      <SelectItem key={section.id} value={section.id.toString()}>
                        {section.name} ({section.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos-site-location">Lokasi Site</Label>
              <Select
                value={formData.siteLocation || "0"}
                onValueChange={(value) => setFormData({ ...formData, siteLocation: value === "0" ? "" : value })}
              >
                <SelectTrigger id="pos-site-location">
                  <SelectValue placeholder="Pilih lokasi site" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">- Tidak ada -</SelectItem>
                  {sites.filter((site) => site.isActive).map((site) => (
                    <SelectItem key={site.id} value={site.name}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pos-description">Description</Label>
              <Textarea
                id="pos-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Short description of this position"
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
