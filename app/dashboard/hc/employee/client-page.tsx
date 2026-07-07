"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AdminPageShell } from "@/components/admin-page-shell";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import {
  EnterpriseScorecards,
  EnterpriseRecordDialog,
  EnterpriseFormGrid,
  EnterpriseActionButtons,
  type EnterpriseScorecardItem,
  type TableRbacAccess,
} from "@/components/ui/enterprise-table-kit";
import { MinePermitReminderDialog } from "@/components/mine-permit-reminder-dialog";
import { TableMultiFilter } from "@/components/ui/table-multi-filter";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, UserCheck, AlertTriangle, Clock, CheckCircle2, TrendingUp, MoreHorizontal, Eye, Edit2, Trash2, Settings2 } from "lucide-react";
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  bulkUpdateEmployees,
} from "@/app/actions/employee";
import { toast } from "sonner";
import { HcWorkspaceBanner, hcPrimaryActionClassName, hcTableRowClassName } from "@/components/hc/hc-workspace-banner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/* ─── Types ─────────────────────────────────────────────────────────── */

type Employee = {
  id: number;
  employeeId: string;
  fullName: string;
  email: string | null;
  joinDate: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  birthDate: string | null;
  expMinePermit: string | null;
  accountStatus: string;
  genderCode: string | null;
  jobTitle: string | null;
  levelName: string | null;
  departmentName: string | null;
  sectionName: string | null;
  siteName: string | null;
  location: string | null;
  departmentId: number | null;
  sectionId: number | null;
  workLocationId: number | null;
  positionId: number | null;
  manpower: string | null;
  lastMcuDate: string | null;
};

type FilterOption = {
  id: number;
  name: string;
  departmentId?: number | null;
};

type FilterOptions = {
  departments: FilterOption[];
  sections: FilterOption[];
  locations: FilterOption[];
  positions: FilterOption[];
};

type ContractStatus = {
  label: string;
  type: "ACTIVE" | "EXPIRING" | "COMPLETED" | "NO_CONTRACT";
};

type EmployeeFormData = {
  employeeId: string;
  fullName: string;
  email: string;
  genderCode: string;
  departmentId: string;
  sectionId: string;
  siteId: string;
  workLocationId: string;
  positionId: string;
  joinDate: string;
  contractStart: string;
  contractEnd: string;
  birthDate: string;
  expMinePermit: string;
  lastMcuDate: string;
  manpower: string;
};

/* ─── Helpers ───────────────────────────────────────────────────────── */

function getContractStatus(contractEnd: string | null): ContractStatus {
  if (!contractEnd) {
    return { label: "Tanpa Kontrak", type: "NO_CONTRACT" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(contractEnd);
  end.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil(
    (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 0) {
    return { label: "Selesai", type: "COMPLETED" };
  }
  if (diffDays <= 30) {
    return { label: "Akan Berakhir", type: "EXPIRING" };
  }
  return { label: "Aktif", type: "ACTIVE" };
}

function isOnProgress(employee: Employee): boolean {
  if (!employee.joinDate) return false;
  const today = new Date();
  const join = new Date(employee.joinDate);
  const diffDays = Math.ceil(
    (today.getTime() - join.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diffDays >= 0 && diffDays <= 90;
}

function isMale(genderCode: string | null): boolean {
  return genderCode === "L" || genderCode === "M";
}

function isFemale(genderCode: string | null): boolean {
  return genderCode === "P" || genderCode === "F";
}

function formatDate(value: string | null): string {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toInputDate(value: string | null): string {
  if (!value) return "";
  try {
    return new Date(value).toISOString().split("T")[0];
  } catch {
    return "";
  }
}

function statusBadgeVariant(
  type: ContractStatus["type"]
): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "ACTIVE":
      return "default";
    case "EXPIRING":
      return "secondary";
    case "COMPLETED":
      return "destructive";
    case "NO_CONTRACT":
      return "outline";
    default:
      return "outline";
  }
}

function emptyFormData(): EmployeeFormData {
  return {
    employeeId: "",
    fullName: "",
    email: "",
    genderCode: "",
    departmentId: "",
    sectionId: "",
    siteId: "",
    workLocationId: "",
    positionId: "",
    joinDate: "",
    contractStart: "",
    contractEnd: "",
    birthDate: "",
    expMinePermit: "",
    lastMcuDate: "",
    manpower: "Lokal",
  };
}

function employeeToFormData(emp: Employee): EmployeeFormData {
  return {
    employeeId: emp.employeeId,
    fullName: emp.fullName,
    email: emp.email ?? "",
    genderCode: emp.genderCode ?? "",
    departmentId: emp.departmentId?.toString() ?? "",
    sectionId: emp.sectionId?.toString() ?? "",
    siteId: "",
    workLocationId: emp.workLocationId?.toString() ?? "",
    positionId: emp.positionId?.toString() ?? "",
    joinDate: toInputDate(emp.joinDate),
    contractStart: toInputDate(emp.contractStart),
    contractEnd: toInputDate(emp.contractEnd),
    birthDate: toInputDate(emp.birthDate),
    expMinePermit: toInputDate(emp.expMinePermit),
    lastMcuDate: toInputDate(emp.lastMcuDate),
    manpower: emp.manpower || "Lokal",
  };
}

/* ─── Component ─────────────────────────────────────────────────────── */

export function EmployeeClientPage({
  employees: initialData,
  filterOptions,
  access,
}: {
  employees: Employee[];
  filterOptions: FilterOptions;
  access: TableRbacAccess;
}) {
  const router = useRouter();
  const [data, setData] = useState<Employee[]>(initialData);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>(emptyFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk edit state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkFormData, setBulkFormData] = useState({
    workLocationId: "",
    positionId: "",
    expMinePermit: "",
    lastMcuDate: "",
    manpower: "",
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(data.map((e) => e.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedIds(newSet);
  };

  const handleBulkUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const ids = Array.from(selectedIds);
      await bulkUpdateEmployees(ids, bulkFormData);
      
      toast.success(`Berhasil memperbarui ${ids.length} karyawan.`);
      setBulkEditOpen(false);
      setSelectedIds(new Set());
      
      // Refresh page data
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan saat bulk update.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ─── Computed values ──────────────────────────────────────────────── */

  const contractStatusMap = useMemo(() => {
    const map = new Map<number, ContractStatus>();
    for (const emp of data) {
      map.set(emp.id, getContractStatus(emp.contractEnd));
    }
    return map;
  }, [data]);

  const onProgressSet = useMemo(() => {
    return new Set(data.filter(isOnProgress).map((e) => e.id));
  }, [data]);

  // Scorecard counts
  const activeEmployees = useMemo(
    () =>
      data.filter(
        (e) => contractStatusMap.get(e.id)?.type === "ACTIVE"
      ),
    [data, contractStatusMap]
  );
  const expiringEmployees = useMemo(
    () =>
      data.filter(
        (e) => contractStatusMap.get(e.id)?.type === "EXPIRING"
      ),
    [data, contractStatusMap]
  );
  const onProgressEmployees = useMemo(
    () => data.filter((e) => onProgressSet.has(e.id)),
    [data, onProgressSet]
  );
  const completedEmployees = useMemo(
    () =>
      data.filter(
        (e) => contractStatusMap.get(e.id)?.type === "COMPLETED"
      ),
    [data, contractStatusMap]
  );

  // Filter options
  const genderOptions = useMemo(
    () => [
      { value: "L", label: "Laki-laki" },
      { value: "P", label: "Perempuan" },
    ],
    []
  );

  const filteredSections = useMemo(() => {
    if (!formData.departmentId) return filterOptions.sections;
    const deptId = Number(formData.departmentId);
    return filterOptions.sections.filter(
      (s) => s.departmentId == null || s.departmentId === deptId
    );
  }, [formData.departmentId, filterOptions.sections]);

  /* ─── Scorecards ───────────────────────────────────────────────────── */

  const scorecards: EnterpriseScorecardItem[] = useMemo(
    () => [
      {
        label: "Kontrak Aktif",
        value: activeEmployees.length,
        description: `${activeEmployees.filter((e) => isMale(e.genderCode)).length} L / ${activeEmployees.filter((e) => isFemale(e.genderCode)).length} P`,
        icon: <UserCheck className="size-5 text-emerald-600" />,
        tone: "success",
      },
      {
        label: "Akan Berakhir",
        value: expiringEmployees.length,
        description: `${expiringEmployees.filter((e) => isMale(e.genderCode)).length} L / ${expiringEmployees.filter((e) => isFemale(e.genderCode)).length} P`,
        icon: <AlertTriangle className="size-5 text-amber-600" />,
        tone: "warning",
      },
      {
        label: "On Progress",
        value: onProgressEmployees.length,
        description: `Karyawan baru (≤90 hari)`,
        icon: <Clock className="size-5 text-sky-600" />,
        tone: "info",
      },
      {
        label: "Kontrak Selesai",
        value: completedEmployees.length,
        description: `${completedEmployees.filter((e) => isMale(e.genderCode)).length} L / ${completedEmployees.filter((e) => isFemale(e.genderCode)).length} P`,
        icon: <CheckCircle2 className="size-5 text-rose-600" />,
        tone: "danger",
      },
    ],
    [activeEmployees, expiringEmployees, onProgressEmployees, completedEmployees]
  );

  /* ─── Handlers ─────────────────────────────────────────────────────── */

  function handleOpenAdd() {
    setEditingEmployee(null);
    setFormData(emptyFormData());
    setFormOpen(true);
  }

  function handleOpenEdit(emp: Employee) {
    setEditingEmployee(emp);
    setFormData(employeeToFormData(emp));
    setFormOpen(true);
  }

  function handleOpenView(emp: Employee) {
    setViewingEmployee(emp);
    setViewOpen(true);
  }

  function handleOpenDelete(emp: Employee) {
    setDeletingEmployee(emp);
    setDeleteOpen(true);
  }

  function updateFormField(field: keyof EmployeeFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.employeeId.trim() || !formData.fullName.trim()) {
      toast.error("NIK dan Nama wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        employeeId: formData.employeeId.trim(),
        fullName: formData.fullName.trim(),
        email: formData.email.trim() || undefined,
        genderCode: formData.genderCode || undefined,
        departmentId: formData.departmentId ? Number(formData.departmentId) : undefined,
        sectionId: formData.sectionId ? Number(formData.sectionId) : undefined,
        siteId: formData.workLocationId ? Number(formData.workLocationId) : undefined,
        workLocationId: formData.workLocationId ? Number(formData.workLocationId) : undefined,
        positionId: formData.positionId ? Number(formData.positionId) : undefined,
        joinDate: formData.joinDate || undefined,
        contractStart: formData.contractStart || undefined,
        contractEnd: formData.contractEnd || undefined,
        birthDate: formData.birthDate || undefined,
        expMinePermit: formData.expMinePermit || undefined,
        lastMcuDate: formData.lastMcuDate || undefined,
        manpower: formData.manpower || "Lokal",
      };

      if (editingEmployee) {
        const updated = await updateEmployee(editingEmployee.id, payload);
        setData((prev) =>
          prev.map((d) =>
            d.id === editingEmployee.id
              ? {
                  ...d,
                  employeeId: payload.employeeId,
                  fullName: payload.fullName,
                  email: payload.email ?? null,
                  genderCode: payload.genderCode ?? null,
                  departmentId: payload.departmentId ?? null,
                  sectionId: payload.sectionId ?? null,
                  workLocationId: payload.workLocationId ?? null,
                  positionId: payload.positionId ?? null,
                  joinDate: payload.joinDate ?? null,
                  contractStart: payload.contractStart ?? null,
                  contractEnd: payload.contractEnd ?? null,
                  birthDate: payload.birthDate ?? null,
                  expMinePermit: payload.expMinePermit ?? null,
                  lastMcuDate: payload.lastMcuDate ?? null,
                  manpower: payload.manpower ?? null,
                }
              : d
          )
        );
        toast.success(`Data ${updated.name ?? formData.fullName} berhasil diperbarui.`);
      } else {
        const created = await createEmployee(payload);
        if (created) {
          const newEmployee: Employee = {
            id: created.id,
            employeeId: created.employeeSn,
            fullName: created.name,
            email: created.email ?? null,
            joinDate: created.joinDate ?? null,
            contractStart: created.contractDurationStart ?? null,
            contractEnd: created.contractDurationEnd ?? null,
            birthDate: created.birthDate ?? null,
            expMinePermit: created.expMinePermit ?? null,
            lastMcuDate: payload.lastMcuDate ?? null,
            accountStatus: created.employmentStatus ?? "active",
            genderCode: null,
            jobTitle: null,
            levelName: null,
            departmentName: filterOptions.departments.find(
              (d) => d.id === Number(formData.departmentId)
            )?.name ?? null,
            sectionName: filterOptions.sections.find(
              (s) => s.id === Number(formData.sectionId)
            )?.name ?? null,
            siteName: null,
            location: filterOptions.locations.find(
              (l) => l.id === Number(formData.workLocationId)
            )?.name ?? null,
            departmentId: formData.departmentId ? Number(formData.departmentId) : null,
            sectionId: formData.sectionId ? Number(formData.sectionId) : null,
            workLocationId: formData.workLocationId ? Number(formData.workLocationId) : null,
            positionId: formData.positionId ? Number(formData.positionId) : null,
            manpower: formData.manpower || "Lokal",
          };
          setData((prev) => [newEmployee, ...prev]);
        }
        toast.success(`Karyawan ${formData.fullName} berhasil ditambahkan.`);
      }
      setFormOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingEmployee) return;

    setIsSubmitting(true);
    try {
      await deleteEmployee(deletingEmployee.id);
      setData((prev) => prev.filter((d) => d.id !== deletingEmployee.id));
      toast.success(`Data ${deletingEmployee.fullName} berhasil dihapus.`);
      setDeleteOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menghapus data. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  /* ─── Render ───────────────────────────────────────────────────────── */

  return (
    <AdminPageShell
      eyebrow="HC - Employee"
      title="Data Karyawan"
      description="Kelola data karyawan, kontrak, dan informasi demografi secara terpusat."
      actions={
        <div className="flex items-center gap-2">
          {access.canEdit && (
            <MinePermitReminderDialog />
          )}
          {access.canCreate && (
            <Button
              onClick={handleOpenAdd}
              className={hcPrimaryActionClassName}
            >
              <Plus className="size-4" />
              Tambah Karyawan
            </Button>
          )}
        </div>
      }
    >
      <HcWorkspaceBanner
        title="Employee Control Room"
        description="Data karyawan dibuat lebih cepat dipindai: kontrak, status akun, lokasi kerja, dan kebutuhan follow-up ada dalam satu ritme table-first."
        items={[
          { label: "Total", value: data.length, tone: "slate" },
          { label: "Aktif", value: activeEmployees.length, tone: "emerald" },
          { label: "Kontrak kritis", value: expiringEmployees.length, tone: "amber" },
        ]}
      />

      <MinimalTableShell
        label="karyawan"
        fileName="Data_Karyawan"
        searchPlaceholder="Cari nama, NIK, atau departemen..."
        scorecards={scorecards}
        access={access}
        dateFilter={false}
        filters={
          <>
            <TableMultiFilter
              label="Departemen"
              filterKey="department"
              options={Array.from(new Set(filterOptions.departments.map((d) => d.name))).map((name) => ({
                value: name,
                label: name,
              }))}
              widthClassName="w-[180px]"
            />
            <TableMultiFilter
              label="Section"
              filterKey="section"
              options={Array.from(new Set(filterOptions.sections.map((s) => s.name))).map((name) => ({
                value: name,
                label: name,
              }))}
              widthClassName="w-[180px]"
            />
            <TableMultiFilter
              label="Lokasi"
              filterKey="location"
              options={Array.from(new Set(filterOptions.locations.map((l) => l.name))).map((name) => ({
                value: name,
                label: name,
              }))}
              widthClassName="w-[180px]"
            />
            <TableMultiFilter
              label="Jenis Kelamin"
              filterKey="gender"
              options={genderOptions}
              widthClassName="w-[160px]"
            />
          </>
        }
        actions={
          selectedIds.size > 0 ? (
            <Button size="sm" variant="secondary" onClick={() => setBulkEditOpen(true)}>
              Bulk Edit ({selectedIds.size})
            </Button>
          ) : null
        }
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-center">
                <Checkbox 
                  checked={data.length > 0 && selectedIds.size === data.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-14 text-center">No</TableHead>
              <TableHead>NIK</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Manpower</TableHead>
              <TableHead>Departemen</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead className="text-center">Tgl Masuk</TableHead>
              <TableHead className="text-center">Kontrak Mulai</TableHead>
              <TableHead className="text-center">Kontrak Selesai</TableHead>
              <TableHead className="text-center">Exp Mine Permit</TableHead>
              <TableHead className="text-center">Terakhir MCU</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={14}
                  className="py-12 text-center text-muted-foreground"
                >
                  <Users className="mx-auto mb-3 size-10 opacity-20" />
                  <p className="text-sm">Belum ada data karyawan.</p>
                </TableCell>
              </TableRow>
            ) : (
              data.map((emp, index) => {
                const status = contractStatusMap.get(emp.id) ?? {
                  label: "-",
                  type: "NO_CONTRACT" as const,
                };
                const isOnProg = onProgressSet.has(emp.id);

                return (
                  <TableRow
                    key={emp.id}
                    data-filter-department={emp.departmentName ?? ""}
                    data-filter-section={emp.sectionName ?? ""}
                    data-filter-location={emp.location ?? ""}
                    data-filter-gender={emp.genderCode ?? ""}
                    className={hcTableRowClassName}
                  >
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={selectedIds.has(emp.id)}
                        onCheckedChange={(c) => handleSelectRow(emp.id, c === true)}
                        aria-label="Select row"
                      />
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-medium text-[#183d6a]">
                        {emp.employeeId}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {emp.fullName}
                      </div>
                      {emp.email && (
                        <div className="text-xs text-muted-foreground">
                          {emp.email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${emp.manpower === 'Non Lokal' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'}`}>
                        {emp.manpower || 'Lokal'}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {emp.departmentName ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {emp.sectionName ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {emp.jobTitle ?? "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {emp.siteName ?? emp.location ?? "-"}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {formatDate(emp.joinDate)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {formatDate(emp.contractStart)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {status.type === "EXPIRING" ? (
                        <Badge className="bg-yellow-400 text-black hover:bg-yellow-500 whitespace-nowrap">
                          {formatDate(emp.contractEnd)}
                        </Badge>
                      ) : status.type === "COMPLETED" ? (
                        <Badge className="bg-red-500 text-white hover:bg-red-600 whitespace-nowrap">
                          {formatDate(emp.contractEnd)}
                        </Badge>
                      ) : (
                        formatDate(emp.contractEnd)
                      )}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {formatDate(emp.expMinePermit)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {formatDate(emp.lastMcuDate)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Badge
                          variant={statusBadgeVariant(status.type)}
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                            status.type === "ACTIVE" &&
                              "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
                            status.type === "EXPIRING" &&
                              "bg-amber-100 text-amber-700 hover:bg-amber-100",
                            status.type === "COMPLETED" &&
                              "bg-rose-100 text-rose-700 hover:bg-rose-100",
                            status.type === "NO_CONTRACT" &&
                              "bg-slate-100 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          {status.label}
                        </Badge>
                        {isOnProg && (
                          <Badge
                            variant="outline"
                            className="rounded-full border-sky-200 bg-sky-50 px-2 py-0 text-[9px] font-medium text-sky-600"
                          >
                            Baru
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="denseIcon">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[160px]">
                            <DropdownMenuItem
                              onClick={() => router.push(`/dashboard/hc/employee/${emp.id}`)}
                            >
                              <TrendingUp className="mr-2 size-4 text-violet-600" />
                              <span>Produktivitas</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleOpenView(emp)} disabled={!access.canView}>
                              <Eye className="mr-2 size-4" />
                              <span>Lihat Detail</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenEdit(emp)} disabled={!access.canEdit}>
                              <Edit2 className="mr-2 size-4" />
                              <span>Edit Karyawan</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleOpenDelete(emp)} disabled={!access.canDelete} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 size-4" />
                              <span>Hapus</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </MinimalTableShell>

      {/* ─── Add / Edit Dialog ──────────────────────────────────────────── */}
      <EnterpriseRecordDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingEmployee ? "Ubah Data Karyawan" : "Tambah Karyawan Baru"}
        description={
          editingEmployee
            ? `Perbarui informasi untuk ${editingEmployee.fullName}.`
            : "Lengkapi formulir berikut untuk menambahkan karyawan baru."
        }
        mode="form"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="employee-form"
              className={hcPrimaryActionClassName}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Menyimpan..."
                : editingEmployee
                  ? "Simpan Perubahan"
                  : "Tambah Karyawan"}
            </Button>
          </div>
        }
      >
        <form id="employee-form" onSubmit={handleSubmit}>
          <EnterpriseFormGrid>
            {/* Row 1: ID & Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                NIK <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.employeeId}
                onChange={(e) => updateFormField("employeeId", e.target.value)}
                placeholder="contoh: EMP-001"
                className="flex h-9 w-full rounded-lg border border-border/70 bg-white px-3 text-sm shadow-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Nama Lengkap <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => updateFormField("fullName", e.target.value)}
                placeholder="Nama lengkap karyawan"
                className="flex h-9 w-full rounded-lg border border-border/70 bg-white px-3 text-sm shadow-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Row 2: Email & Gender */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => updateFormField("email", e.target.value)}
                placeholder="email@contoh.com"
                className="flex h-9 w-full rounded-lg border border-border/70 bg-white px-3 text-sm shadow-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Jenis Kelamin
              </label>
              <select
                value={formData.genderCode}
                onChange={(e) => updateFormField("genderCode", e.target.value)}
                className="flex h-9 w-full rounded-lg border border-border/70 bg-white px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">-- Pilih --</option>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Manpower
              </label>
              <select
                value={formData.manpower}
                onChange={(e) => updateFormField("manpower", e.target.value)}
                className="flex h-9 w-full rounded-lg border border-border/70 bg-white px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="Lokal">Lokal</option>
                <option value="Non Lokal">Non Lokal</option>
              </select>
            </div>

            {/* Row 3: Department & Section */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Departemen
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => {
                  updateFormField("departmentId", e.target.value);
                  updateFormField("sectionId", "");
                }}
                className="flex h-9 w-full rounded-lg border border-border/70 bg-white px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">-- Pilih Departemen --</option>
                {filterOptions.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Section
              </label>
              <select
                value={formData.sectionId}
                onChange={(e) => updateFormField("sectionId", e.target.value)}
                className="flex h-9 w-full rounded-lg border border-border/70 bg-white px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">-- Pilih Section --</option>
                {filteredSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 4: Site & Location */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Lokasi Kerja
              </label>
              <select
                value={formData.workLocationId}
                onChange={(e) =>
                  updateFormField("workLocationId", e.target.value)
                }
                className="flex h-9 w-full rounded-lg border border-border/70 bg-white px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">-- Pilih Lokasi --</option>
                {filterOptions.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Job Title
              </label>
              <select
                value={formData.positionId}
                onChange={(e) => updateFormField("positionId", e.target.value)}
                className="flex h-9 w-full rounded-lg border border-border/70 bg-white px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">-- Pilih Posisi --</option>
                {filterOptions.positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 5: Join Date & Birth Date */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Tanggal Masuk
              </label>
              <input
                type="date"
                value={formData.joinDate}
                onChange={(e) => updateFormField("joinDate", e.target.value)}
                className="flex h-9 w-full rounded-lg border border-border/70 bg-white px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => updateFormField("birthDate", e.target.value)}
                className="flex h-9 w-full rounded-lg border border-border/70 bg-white px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            {/* Row 6: Contract Start & End */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Kontrak Mulai
              </label>
              <input
                type="date"
                value={formData.contractStart}
                onChange={(e) =>
                  updateFormField("contractStart", e.target.value)
                }
                className="flex h-9 w-full rounded-lg border border-border/70 bg-white px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Kontrak Selesai
              </label>
              <input
                type="date"
                value={formData.contractEnd}
                onChange={(e) =>
                  updateFormField("contractEnd", e.target.value)
                }
                className="flex h-9 w-full rounded-lg border border-border/70 bg-white px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            {/* Row 7: Exp Mine Permit */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Exp Mine Permit
              </label>
              <input
                type="date"
                value={formData.expMinePermit}
                onChange={(e) =>
                  updateFormField("expMinePermit", e.target.value)
                }
                className="flex h-9 w-full rounded-lg border border-border/70 bg-white px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            {/* Row 8: Terakhir MCU */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Terakhir MCU
              </label>
              <input
                type="date"
                value={formData.lastMcuDate || ""}
                onChange={(e) =>
                  updateFormField("lastMcuDate", e.target.value)
                }
                className="flex h-9 w-full rounded-lg border border-border/70 bg-white px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </EnterpriseFormGrid>
        </form>
      </EnterpriseRecordDialog>

      {/* ─── View Dialog ────────────────────────────────────────────────── */}
      <EnterpriseRecordDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        title="Detail Karyawan"
        description={viewingEmployee?.fullName}
        mode="view"
        footer={
          <Button
            onClick={() => setViewOpen(false)}
            className={hcPrimaryActionClassName}
          >
            Tutup
          </Button>
        }
      >
        {viewingEmployee && (
          <div className="space-y-4">
            <div className="grid gap-3 rounded-[1rem] border border-border/70 bg-muted/20 p-4 sm:grid-cols-2">
              <DetailRow label="NIK" value={viewingEmployee.employeeId} />
              <DetailRow label="Nama" value={viewingEmployee.fullName} />
              <DetailRow label="Email" value={viewingEmployee.email} />
              <DetailRow
                label="Jenis Kelamin"
                value={
                  viewingEmployee.genderCode === "L"
                    ? "Laki-laki"
                    : viewingEmployee.genderCode === "P"
                      ? "Perempuan"
                      : viewingEmployee.genderCode
                }
              />
              <DetailRow
                label="Departemen"
                value={viewingEmployee.departmentName}
              />
              <DetailRow label="Section" value={viewingEmployee.sectionName} />
              <DetailRow label="Job Title" value={viewingEmployee.jobTitle} />
              <DetailRow label="Level" value={viewingEmployee.levelName} />
              <DetailRow label="Lokasi Kerja" value={viewingEmployee.location} />
              <DetailRow label="Site" value={viewingEmployee.siteName} />
              <DetailRow
                label="Tanggal Masuk"
                value={formatDate(viewingEmployee.joinDate)}
              />
              <DetailRow
                label="Tanggal Lahir"
                value={formatDate(viewingEmployee.birthDate)}
              />
              <DetailRow
                label="Kontrak Mulai"
                value={formatDate(viewingEmployee.contractStart)}
              />
              <DetailRow
                label="Kontrak Selesai"
                value={formatDate(viewingEmployee.contractEnd)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">
                Status Kontrak:
              </span>
              <Badge
                variant={statusBadgeVariant(
                  contractStatusMap.get(viewingEmployee.id)?.type ??
                    "NO_CONTRACT"
                )}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  (contractStatusMap.get(viewingEmployee.id)?.type ?? "NO_CONTRACT") ===
                    "ACTIVE" &&
                    "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
                  (contractStatusMap.get(viewingEmployee.id)?.type ?? "NO_CONTRACT") ===
                    "EXPIRING" &&
                    "bg-amber-100 text-amber-700 hover:bg-amber-100",
                  (contractStatusMap.get(viewingEmployee.id)?.type ?? "NO_CONTRACT") ===
                    "COMPLETED" &&
                    "bg-rose-100 text-rose-700 hover:bg-rose-100",
                  (contractStatusMap.get(viewingEmployee.id)?.type ?? "NO_CONTRACT") ===
                    "NO_CONTRACT" &&
                    "bg-slate-100 text-slate-600 hover:bg-slate-100"
                )}
              >
                {contractStatusMap.get(viewingEmployee.id)?.label ?? "Tanpa Kontrak"}
              </Badge>
            </div>
          </div>
        )}
      </EnterpriseRecordDialog>

      {/* ─── Delete Confirmation Dialog ─────────────────────────────────── */}
      <EnterpriseRecordDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Konfirmasi Hapus"
        description="Tindakan ini tidak dapat dibatalkan."
        mode="delete"
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </div>
        }
      >
        {deletingEmployee && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Apakah Anda yakin ingin menghapus data karyawan berikut?
            </p>
            <div className="rounded-[1rem] border border-destructive/20 bg-destructive/5 p-4">
              <div className="text-sm font-medium text-foreground">
                {deletingEmployee.fullName}
              </div>
              <div className="text-xs text-muted-foreground">
                NIK: {deletingEmployee.employeeId} &middot;{" "}
                {deletingEmployee.departmentName ?? "-"}
              </div>
            </div>
          </div>
        )}
      </EnterpriseRecordDialog>

      {/* Bulk Edit Dialog */}
      <EnterpriseRecordDialog
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        title={`Bulk Edit Karyawan (${selectedIds.size} dipilih)`}
        description="Pilih kolom yang ingin diubah. Kosongkan kolom yang tidak ingin diubah."
        footer={
          <div className="flex w-full items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkEditOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="bulk-edit-form"
              className={hcPrimaryActionClassName}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        }
      >
        <form id="bulk-edit-form" onSubmit={handleBulkUpdate}>
          <EnterpriseFormGrid>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Lokasi Kerja</label>
            <select
              value={bulkFormData.workLocationId}
              onChange={(e) => setBulkFormData({ ...bulkFormData, workLocationId: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">-- Tidak Diubah --</option>
              {filterOptions.locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Manpower</label>
            <select
              value={bulkFormData.manpower}
              onChange={(e) => setBulkFormData({ ...bulkFormData, manpower: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">-- Tidak Diubah --</option>
              <option value="Lokal">Lokal</option>
              <option value="Non Lokal">Non Lokal</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Job Title</label>
            <select
              value={bulkFormData.positionId}
              onChange={(e) => setBulkFormData({ ...bulkFormData, positionId: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">-- Tidak Diubah --</option>
              {filterOptions.positions.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Exp Mine Permit</label>
            <input
              type="date"
              value={bulkFormData.expMinePermit}
              onChange={(e) => setBulkFormData({ ...bulkFormData, expMinePermit: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Terakhir MCU</label>
            <input
              type="date"
              value={bulkFormData.lastMcuDate}
              onChange={(e) => setBulkFormData({ ...bulkFormData, lastMcuDate: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </EnterpriseFormGrid>
        </form>
      </EnterpriseRecordDialog>
    </AdminPageShell>
  );
}

/* ─── Detail Row (View Dialog) ──────────────────────────────────────── */

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">
        {value || "-"}
      </span>
    </div>
  );
}
