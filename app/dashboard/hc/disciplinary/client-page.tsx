"use client";

import * as React from "react";
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  FolderPlus,
  Layers,
  MapPin,
  Plus,
  Printer,
  Scale,
  Search,
  ShieldAlert,
  Trash2,
  User,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import {
  createDisciplinaryAction,
  createViolationCategory,
  deleteDisciplinaryAction,
  deleteViolationCategory,
  getNextDisciplinaryLetterNumber,
  updateDisciplinaryAction,
  updateViolationCategory,
  type DisciplinaryActionInput,
  type ViolationCategoryInput,
} from "@/app/actions/disciplinary";
import { AdminPageShell } from "@/components/admin-page-shell";
import { HcWorkspaceBanner } from "@/components/hc/hc-workspace-banner";
import {
  HeroConfirmDialog,
  HeroDataTable,
  HeroDatePicker,
  HeroEmptyState,
  HeroFormDialog,
  HeroFormField,
  HeroInput,
  HeroKpiCard,
  HeroSearchableSelect,
  HeroStatusBadge,
  HeroSwitch,
  HeroTextarea,
  type HeroColumnDef,
  type HeroTableFilter,
} from "@/components/templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DisciplinaryLetterDialog } from "@/components/hc/disciplinary-letter-dialog";
import { SignaturePad } from "@/components/signature-pad";
import { getUserSignatureAction } from "@/app/actions/user-signature";

// Master tingkatan sanksi / SP (Mendukung Custom Level SP)
export const SP_LEVEL_OPTIONS = [
  { value: "Teguran", label: "Teguran Lisan / Tertulis", tone: "sky" },
  { value: "SP1", label: "Surat Peringatan 1 (SP I)", tone: "emerald" },
  { value: "SP2", label: "Surat Peringatan 2 (SP II)", tone: "amber" },
  { value: "SP3", label: "Surat Peringatan 3 / Terakhir (SP III)", tone: "rose" },
  { value: "Skorsing", label: "Skorsing Sementara", tone: "purple" },
  { value: "Termination", label: "Pemutusan Hubungan Kerja (PHK)", tone: "red" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Aktif" },
  { value: "expired", label: "Kedaluwarsa" },
  { value: "closed", label: "Ditutup / Selesai" },
  { value: "revoked", label: "Dicabut / Dibatalkan" },
];

const SEVERITY_OPTIONS = [
  { value: "Minor", label: "Minor (Ringan)" },
  { value: "Medium", label: "Medium (Sedang)" },
  { value: "High", label: "High (Berat)" },
  { value: "Critical", label: "Critical (Kritis / Pelanggaran Berat)" },
];

export type ActionRow = {
  id: number;
  employeeId: number | null;
  categoryId: number | null;
  spLevel: string;
  letterNumber: string;
  violationDate: Date | string;
  description: string;
  actionTaken: string;
  effectiveDate: Date | string;
  expiryDate: Date | string | null;
  issuedBy: string;
  issuerDepartment?: string | null;
  issuerSignature?: string | null;
  useLetterhead?: boolean | null;
  notes: string;
  status: string;
  attachmentUrl?: string | null;
  employeeName: string | null;
  employeeSn?: string | null;
  department: string | null;
  position: string | null;
  jobTitle?: string | null;
  siteName?: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  severity: string | null;
};

export type CategoryRow = {
  id: number;
  code: string;
  name: string;
  severity: string;
  defaultSpLevel: string | number;
  description: string;
  isActive: boolean;
};

export type EmployeeOption = {
  id: number;
  name: string;
  employeeSn: string;
  department: string | null;
  position: string | null;
  jobTitle?: string | null;
  siteName?: string | null;
};

export type DisciplinaryStats = {
  totalCases: number;
  activeSp: number;
  expired: number;
  thisMonth: number;
  byLevel: {
    Teguran?: number;
    SP1: number;
    SP2: number;
    SP3: number;
    Skorsing?: number;
    Termination: number;
  };
};

interface DisciplinaryClientPageProps {
  actions: ActionRow[];
  categories: CategoryRow[];
  stats: DisciplinaryStats;
  employees: EmployeeOption[];
}

export function DisciplinaryClientPage({
  actions,
  categories,
  stats,
  employees,
}: DisciplinaryClientPageProps) {
  const [activeTab, setActiveTab] = React.useState<"actions" | "categories" | "letters">("actions");
  const [actionRows, setActionRows] = React.useState<ActionRow[]>(actions);
  const [categoryRows, setCategoryRows] = React.useState<CategoryRow[]>(
    categories.map(normalizeCategoryRow)
  );

  // Modal States
  const [actionDialogOpen, setActionDialogOpen] = React.useState(false);
  const [editingAction, setEditingAction] = React.useState<ActionRow | null>(null);

  const [categoryDialogOpen, setCategoryDialogOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<CategoryRow | null>(null);

  const [confirmDeleteAction, setConfirmDeleteAction] = React.useState<ActionRow | null>(null);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = React.useState<CategoryRow | null>(null);

  // Formal Letter Preview Modal State
  const [letterModalOpen, setLetterModalOpen] = React.useState(false);
  const [selectedLetterDoc, setSelectedLetterDoc] = React.useState<ActionRow | null>(null);

  // Transitions
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Action Form Inputs
  const [actionForm, setActionForm] = React.useState<{
    employeeId: string;
    categoryId: string;
    spLevel: string;
    letterNumber: string;
    violationDate: string;
    description: string;
    actionTaken: string;
    effectiveDate: string;
    expiryDate: string;
    issuedBy: string;
    issuerSignature: string;
    useLetterhead: boolean;
    notes: string;
    status: string;
  }>({
    employeeId: "",
    categoryId: "",
    spLevel: "SP1",
    letterNumber: "",
    violationDate: new Date().toISOString().slice(0, 10),
    description: "",
    actionTaken: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
    expiryDate: calculateDefaultExpiry(new Date().toISOString().slice(0, 10)),
    issuedBy: "Human Capital Dept",
    issuerSignature: "",
    useLetterhead: false,
    notes: "",
    status: "active",
  });

  // Category Form Inputs
  const [categoryForm, setCategoryForm] = React.useState<{
    code: string;
    name: string;
    severity: string;
    defaultSpLevel: string;
    description: string;
    isActive: boolean;
  }>({
    code: "",
    name: "",
    severity: "Medium",
    defaultSpLevel: "SP1",
    description: "",
    isActive: true,
  });

  // Open Create/Edit Action
  const handleOpenActionDialog = (record?: ActionRow) => {
    if (record) {
      setEditingAction(record);
      setActionForm({
        employeeId: String(record.employeeId || ""),
        categoryId: String(record.categoryId || ""),
        spLevel: record.spLevel || "SP1",
        letterNumber: record.letterNumber || "",
        violationDate: dateValue(record.violationDate),
        description: record.description || "",
        actionTaken: record.actionTaken || "",
        effectiveDate: dateValue(record.effectiveDate),
        expiryDate: dateValue(record.expiryDate),
        issuedBy: record.issuedBy || "Human Capital Dept",
        issuerSignature: record.issuerSignature || "",
        useLetterhead: Boolean(record.useLetterhead),
        notes: record.notes || "",
        status: record.status || "active",
      });
      setActionDialogOpen(true);
    } else {
      setEditingAction(null);
      const today = new Date().toISOString().slice(0, 10);
      const autoLetterNo = `CP/HC-DISC/${new Date().getFullYear()}/${String(
        actionRows.length + 1
      ).padStart(4, "0")}`;

      setActionForm({
        employeeId: employees[0] ? String(employees[0].id) : "",
        categoryId: categoryRows[0] ? String(categoryRows[0].id) : "",
        spLevel: categoryRows[0] ? String(categoryRows[0].defaultSpLevel) : "SP1",
        letterNumber: autoLetterNo,
        violationDate: today,
        description: "",
        actionTaken: "Pemberian Surat Peringatan & Konseling Tatap Muka",
        effectiveDate: today,
        expiryDate: calculateDefaultExpiry(today),
        issuedBy: "Human Capital Dept",
        issuerSignature: "",
        useLetterhead: false,
        notes: "",
        status: "active",
      });
      setActionDialogOpen(true);

      // Asynchronously fetch auto letter number and default signature in background
      Promise.all([
        getNextDisciplinaryLetterNumber().catch(() => null),
        getUserSignatureAction().catch(() => null),
      ]).then(([generated, sigResult]) => {
        setActionForm((prev) => ({
          ...prev,
          letterNumber: generated || prev.letterNumber,
          issuerSignature: sigResult?.signatureDataUrl || prev.issuerSignature,
          issuedBy: sigResult?.employeeName || prev.issuedBy,
        }));
      }).catch(() => {});
    }
  };

  // Submit Action Form
  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionForm.employeeId) {
      toast.error("Pilih karyawan penerima sanksi!");
      return;
    }
    if (!actionForm.categoryId) {
      toast.error("Pilih kategori pelanggaran!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: DisciplinaryActionInput = {
        employeeId: actionForm.employeeId,
        categoryId: actionForm.categoryId,
        spLevel: actionForm.spLevel,
        letterNumber: actionForm.letterNumber,
        violationDate: actionForm.violationDate,
        description: actionForm.description,
        actionTaken: actionForm.actionTaken,
        effectiveDate: actionForm.effectiveDate,
        expiryDate: actionForm.expiryDate || null,
        issuedBy: actionForm.issuedBy,
        issuerSignature: actionForm.issuerSignature || undefined,
        useLetterhead: actionForm.useLetterhead,
        notes: actionForm.notes,
        status: actionForm.status,
      };

      if (editingAction) {
        const updated = await updateDisciplinaryAction(editingAction.id, payload);
        const enriched = enrichActionRow(
          updated,
          employees,
          categoryRows,
          editingAction
        );
        setActionRows((prev) =>
          prev.map((item) => (item.id === editingAction.id ? enriched : item))
        );
        toast.success("Data tindakan sanksi disiplin berhasil diperbarui.");
      } else {
        const created = await createDisciplinaryAction(payload);
        const enriched = enrichActionRow(created, employees, categoryRows);
        setActionRows((prev) => [enriched, ...prev]);
        toast.success("Sanksi disiplin baru berhasil diterbitkan.");
      }
      setActionDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data sanksi disiplin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Action Confirm
  const handleDeleteAction = async () => {
    if (!confirmDeleteAction) return;
    setIsSubmitting(true);
    try {
      await deleteDisciplinaryAction(confirmDeleteAction.id);
      setActionRows((prev) => prev.filter((item) => item.id !== confirmDeleteAction.id));
      toast.success("Data tindakan disiplin berhasil dihapus.");
      setConfirmDeleteAction(null);
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus data sanksi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Create/Edit Category
  const handleOpenCategoryDialog = (record?: CategoryRow) => {
    if (record) {
      setEditingCategory(record);
      setCategoryForm({
        code: record.code,
        name: record.name,
        severity: record.severity,
        defaultSpLevel: String(record.defaultSpLevel),
        description: record.description || "",
        isActive: record.isActive,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        code: `DISC-${String(categoryRows.length + 1).padStart(2, "0")}`,
        name: "",
        severity: "Medium",
        defaultSpLevel: "SP1",
        description: "",
        isActive: true,
      });
    }
    setCategoryDialogOpen(true);
  };

  // Submit Category Form
  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.code || !categoryForm.name) {
      toast.error("Kode dan nama kategori wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: ViolationCategoryInput = {
        code: categoryForm.code,
        name: categoryForm.name,
        severity: categoryForm.severity,
        defaultSpLevel: categoryForm.defaultSpLevel,
        description: categoryForm.description,
        isActive: categoryForm.isActive,
      };

      if (editingCategory) {
        const updated = await updateViolationCategory(editingCategory.id, payload);
        const norm = normalizeCategoryRow(updated as CategoryRow);
        setCategoryRows((prev) =>
          prev.map((item) => (item.id === editingCategory.id ? norm : item))
        );
        toast.success("Kategori pelanggaran berhasil diperbarui.");
      } else {
        const created = await createViolationCategory(payload);
        const norm = normalizeCategoryRow(created as CategoryRow);
        setCategoryRows((prev) => [norm, ...prev]);
        toast.success("Kategori pelanggaran baru berhasil dibuat.");
      }
      setCategoryDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan kategori.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Category Confirm
  const handleDeleteCategory = async () => {
    if (!confirmDeleteCategory) return;
    setIsSubmitting(true);
    try {
      await deleteViolationCategory(confirmDeleteCategory.id);
      setCategoryRows((prev) => prev.filter((item) => item.id !== confirmDeleteCategory.id));
      toast.success("Kategori pelanggaran berhasil dihapus.");
      setConfirmDeleteCategory(null);
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus kategori.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview Official Disciplinary Letter
  const handlePreviewLetter = (record: ActionRow) => {
    setSelectedLetterDoc(record);
    setLetterModalOpen(true);
  };

  // Columns for HeroDataTable - Action List
  const actionColumns: HeroColumnDef<ActionRow>[] = [
    {
      key: "employeeName",
      header: "Karyawan & SN",
      sortable: true,
      searchable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{row.employeeName || "-"}</span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-mono text-blue-700 bg-blue-50 px-1 py-0.5 rounded text-[11px]">
              {row.employeeSn || "-"}
            </span>
            <span>•</span>
            <span>{row.position || row.jobTitle || "-"}</span>
          </div>
        </div>
      ),
      exportValue: (row) => `${row.employeeName || "-"} (${row.employeeSn || "-"})`,
    },
    {
      key: "department",
      header: "Departemen & Site",
      sortable: true,
      render: (row) => (
        <div className="flex flex-col text-xs">
          <span className="font-medium text-slate-800">{row.department || "-"}</span>
          <span className="text-slate-500 flex items-center gap-1 mt-0.5 text-[11px]">
            <MapPin className="size-3 text-slate-400" />
            {row.siteName || "Head Office"}
          </span>
        </div>
      ),
      exportValue: (row) => `${row.department || "-"} - ${row.siteName || "-"}`,
    },
    {
      key: "spLevel",
      header: "Tingkat Sanksi / SP",
      sortable: true,
      render: (row) => <SpLevelBadge level={row.spLevel} />,
      exportValue: (row) => row.spLevel,
    },
    {
      key: "categoryName",
      header: "Kategori & Kronologi",
      render: (row) => (
        <div className="max-w-[280px] space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs text-slate-900">
              {row.categoryName || "-"}
            </span>
            {row.severity && <SeverityTag severity={row.severity} />}
          </div>
          <p className="text-[11px] text-slate-500 line-clamp-1 italic">
            &quot;{row.description || "Tanpa keterangan"}&quot;
          </p>
        </div>
      ),
      exportValue: (row) => `${row.categoryName || "-"}: ${row.description || "-"}`,
    },
    {
      key: "effectiveDate",
      header: "Masa Berlaku",
      sortable: true,
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <div className="text-slate-700 font-medium">
            Mulai: {formatDate(row.effectiveDate)}
          </div>
          <div className="text-slate-500 text-[11px]">
            Selesai: {row.expiryDate ? formatDate(row.expiryDate) : "Permanen / PHK"}
          </div>
        </div>
      ),
      exportValue: (row) =>
        `${formatDate(row.effectiveDate)} s/d ${formatDate(row.expiryDate)}`,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <HeroStatusBadge status={row.status || "active"} />,
      exportValue: (row) => row.status,
    },
  ];

  // Filters for HeroDataTable - Action List
  const actionTableFilters: HeroTableFilter[] = [
    {
      key: "spLevel",
      label: "Tingkat Sanksi",
      options: SP_LEVEL_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
    },
    {
      key: "status",
      label: "Status Kasus",
      options: STATUS_OPTIONS,
    },
    {
      key: "severity",
      label: "Tingkat Keparahan",
      options: SEVERITY_OPTIONS,
    },
  ];

  // Columns for HeroDataTable - Master Categories
  const categoryColumns: HeroColumnDef<CategoryRow>[] = [
    {
      key: "code",
      header: "Kode Kategori",
      sortable: true,
      searchable: true,
      render: (row) => (
        <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-1 rounded text-slate-800">
          {row.code}
        </span>
      ),
    },
    {
      key: "name",
      header: "Nama Pelanggaran & Deskripsi",
      sortable: true,
      searchable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 text-sm">{row.name}</span>
          <span className="text-xs text-slate-500 max-w-md line-clamp-1">
            {row.description || "Tidak ada deskripsi detail"}
          </span>
        </div>
      ),
    },
    {
      key: "severity",
      header: "Severity Level",
      sortable: true,
      render: (row) => <SeverityTag severity={row.severity} />,
    },
    {
      key: "defaultSpLevel",
      header: "Default Level SP",
      sortable: true,
      render: (row) => <SpLevelBadge level={String(row.defaultSpLevel)} />,
    },
    {
      key: "isActive",
      header: "Status",
      render: (row) => (
        <Badge
          variant="outline"
          className={
            row.isActive
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-slate-100 text-slate-600 border-slate-200"
          }
        >
          {row.isActive ? "Aktif" : "Non-Aktif"}
        </Badge>
      ),
    },
  ];

  // Employee Select Options for Searchable Select
  const employeeOptions = React.useMemo(() => {
    return employees.map((emp) => ({
      value: String(emp.id),
      label: `${emp.name} [SN: ${emp.employeeSn || "-"}]`,
      description: `${emp.position || emp.jobTitle || "-"} • ${emp.department || "-"} • ${
        emp.siteName || "Head Office"
      }`,
    }));
  }, [employees]);

  // Category Select Options for Searchable Select
  const categoryOptions = React.useMemo(() => {
    return categoryRows.map((cat) => ({
      value: String(cat.id),
      label: `[${cat.code}] ${cat.name}`,
      description: `Default: ${cat.defaultSpLevel} • Severity: ${cat.severity}`,
    }));
  }, [categoryRows]);

  // Dynamic Auto-update default SP when category changes in Action Form
  const handleCategorySelect = (catId: string) => {
    const selected = categoryRows.find((item) => String(item.id) === catId);
    setActionForm((prev) => ({
      ...prev,
      categoryId: catId,
      spLevel: selected ? String(selected.defaultSpLevel) : prev.spLevel,
    }));
  };

  // Dynamic calculation for expiry when effectiveDate changes
  const handleEffectiveDateChange = (newDate: string) => {
    setActionForm((prev) => ({
      ...prev,
      effectiveDate: newDate,
      expiryDate: calculateDefaultExpiry(newDate),
    }));
  };

  const handleSignatureChange = React.useCallback((dataUrl: string | null) => {
    setActionForm((prev) => {
      if (prev.issuerSignature === (dataUrl || "")) return prev;
      return {
        ...prev,
        issuerSignature: dataUrl || "",
      };
    });
  }, []);

  return (
    <AdminPageShell>
      {/* Workspace Banner */}
      <HcWorkspaceBanner
        badge="HC • INDUSTRIAL RELATIONS"
        title="Disciplinary Case & Sanction Desk"
        description="Kelola rekam jejak pembinaan disiplin karyawan, master kategori pelanggaran dengan kustomisasi tingkatan sanksi (Teguran, SP1, SP2, SP3, Skorsing, PHK), serta penerbitan surat sanksi resmi siap cetak."
        items={[
          { label: "Total Kasus", value: actionRows.length, tone: "slate" },
          { label: "SP Aktif", value: stats.activeSp, tone: "amber" },
          { label: "Bulan Ini", value: stats.thisMonth, tone: "sky" },
          { label: "Master Kategori", value: categoryRows.length, tone: "emerald" },
        ]}
      />

      {/* KPI Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <HeroKpiCard
          title="Total Kasus"
          value={actionRows.length}
          tone="blue"
          icon={<Scale className="size-5" />}
          description="Seluruh riwayat disiplin"
        />
        <HeroKpiCard
          title="SP Aktif"
          value={stats.activeSp}
          tone="amber"
          icon={<AlertTriangle className="size-5" />}
          description="Dalam masa evaluasi"
        />
        <HeroKpiCard
          title="Teguran / SP 1"
          value={(stats.byLevel.Teguran || 0) + (stats.byLevel.SP1 || 0)}
          tone="emerald"
          icon={<UserCheck className="size-5" />}
          description="Pembinaan tingkat awal"
        />
        <HeroKpiCard
          title="SP 2"
          value={stats.byLevel.SP2 || 0}
          tone="purple"
          icon={<Clock className="size-5" />}
          description="Peringatan tahap 2"
        />
        <HeroKpiCard
          title="SP 3 / Skorsing"
          value={(stats.byLevel.SP3 || 0) + (stats.byLevel.Skorsing || 0)}
          tone="rose"
          icon={<ShieldAlert className="size-5" />}
          description="Pelanggaran berulang"
        />
        <HeroKpiCard
          title="Kedaluwarsa"
          value={stats.expired}
          tone="slate"
          icon={<CheckCircle2 className="size-5" />}
          description="Masa sanksi tuntas"
        />
      </div>

      {/* Main Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        className="w-full space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
          <TabsList className="bg-slate-100 p-1 rounded-lg border border-slate-200">
            <TabsTrigger
              value="actions"
              className="gap-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-xs"
            >
              <Scale className="size-3.5" />
              <span>Daftar Penerima Sanksi</span>
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] ml-1">
                {actionRows.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="categories"
              className="gap-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-xs"
            >
              <Layers className="size-3.5" />
              <span>Kategori & Custom Level SP</span>
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] ml-1">
                {categoryRows.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="letters"
              className="gap-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:shadow-xs"
            >
              <FileText className="size-3.5" />
              <span>Arsip Surat Sanksi</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {activeTab === "actions" && (
              <Button
                type="button"
                data-testid="btn-open-disciplinary-dialog"
                variant="default"
                size="dense"
                onClick={() => setActionDialogOpen(true)}
                className="h-9 gap-1.5 font-semibold bg-blue-700 hover:bg-blue-800 text-white shadow-xs"
              >
                <Plus className="size-4" />
                <span>Terbitkan Sanksi Disiplin</span>
              </Button>
            )}
            {activeTab === "categories" && (
              <Button
                type="button"
                variant="outline"
                size="dense"
                onClick={() => handleOpenCategoryDialog()}
                className="h-9 gap-1.5 font-semibold text-slate-800 border-slate-300 hover:bg-slate-50"
              >
                <FolderPlus className="size-4 text-blue-600" />
                <span>Tambah Master Kategori</span>
              </Button>
            )}
          </div>
        </div>

        {/* TAB 1: LIST PENERIMA SANKSI */}
        <TabsContent value="actions" className="m-0 space-y-4">
          <HeroDataTable
            data={actionRows}
            columns={actionColumns}
            idField="id"
            title="Daftar Tindakan Disiplin & Penerima Sanksi"
            description="Pantau seluruh karyawan yang sedang atau pernah menerima surat teguran, SP 1, SP 2, SP 3, skorsing, atau terminasi."
            searchPlaceholder="Cari nama karyawan, SN, nomor surat, kategori..."
            searchKeys={["employeeName", "employeeSn", "letterNumber", "categoryName", "department"]}
            filters={actionTableFilters}
            exportFileName="data-tindakan-disiplin-hc"
            pdfTitle="LAPORAN DATA TINDAKAN DISIPLIN KARYAWAN"
            renderRowActions={(row) => (
              <div className="flex items-center justify-end gap-1">
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePreviewLetter(row)}
                        className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                      >
                        <FileText className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">
                      Lihat / Cetak Surat Sanksi Resmi
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenActionDialog(row)}
                        className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                      >
                        <Edit2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Ubah Data Sanksi</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDeleteAction(row)}
                        className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Hapus Catatan Sanksi</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          />
        </TabsContent>

        {/* TAB 2: MASTER KATEGORI & CUSTOM LEVEL SP */}
        <TabsContent value="categories" className="m-0 space-y-4">
          <HeroDataTable
            data={categoryRows}
            columns={categoryColumns}
            idField="id"
            title="Master Kategori Pelanggaran & Custom Tingkat SP"
            description="Konfigurasi klasifikasi jenis pelanggaran, tingkat severity, serta pemetaan sanksi standar (Teguran, SP1, SP2, SP3, Skorsing, PHK)."
            searchPlaceholder="Cari kode atau nama kategori pelanggaran..."
            searchKeys={["code", "name", "description"]}
            exportFileName="master-kategori-pelanggaran-hc"
            pdfTitle="MASTER KATEGORI PELANGGARAN KERJA & LEVEL SP"
            renderRowActions={(row) => (
              <div className="flex items-center justify-end gap-1">
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenCategoryDialog(row)}
                        className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                      >
                        <Edit2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Ubah Kategori</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDeleteCategory(row)}
                        className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="text-xs">Hapus Kategori</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          />
        </TabsContent>

        {/* TAB 3: ARSIP SURAT SANKSI */}
        <TabsContent value="letters" className="m-0 space-y-4">
          <div className="bg-white rounded-xl border border-border/80 p-6 shadow-xs">
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900">
                Galeri & Dokumen Surat Sanksi
              </h3>
              <p className="text-xs text-slate-500">
                Pratinjau seluruh surat peringatan, surat teguran, dan keputusan sanksi format PT Chitra Paratama siap cetak A4.
              </p>
            </div>

            {actionRows.length === 0 ? (
              <HeroEmptyState
                title="Belum ada surat sanksi"
                description="Terbitkan surat tindakan disiplin pertama untuk memuat arsip dokumen resmi."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {actionRows.map((action) => (
                  <div
                    key={action.id}
                    className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 hover:bg-white hover:border-blue-400 hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <SpLevelBadge level={action.spLevel} />
                        <span className="text-[10px] font-mono text-slate-500">
                          {action.letterNumber || `ID: #${action.id}`}
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm">
                        {action.employeeName || "-"}
                      </h4>
                      <p className="text-xs text-slate-500 mb-2">
                        SN: <span className="font-mono text-blue-700">{action.employeeSn || "-"}</span> •{" "}
                        {action.department || "-"}
                      </p>

                      <div className="bg-white p-2.5 rounded border border-slate-200 text-xs space-y-1">
                        <div className="font-semibold text-slate-800">
                          [{action.categoryCode || "DISC"}] {action.categoryName || "Pelanggaran"}
                        </div>
                        <p className="text-slate-500 text-[11px] line-clamp-2 italic">
                          &quot;{action.description || "Tanpa rincian kronologi."}&quot;
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        Mulai: {formatDate(action.effectiveDate)}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="dense"
                        onClick={() => handlePreviewLetter(action)}
                        className="h-8 px-3 gap-1.5 text-xs font-semibold text-blue-700 border-blue-200 hover:bg-blue-50"
                      >
                        <Printer className="size-3.5 text-blue-600" />
                        <span>Buka Surat</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL: FORM TERBITKAN / UBAH SANKSI DISIPLIN */}
      <HeroFormDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        title={editingAction ? "Ubah Data Tindakan Disiplin" : "Terbitkan Sanksi Disiplin"}
        description="Lengkapi identitas karyawan, kategori pelanggaran, nomor surat, dan tanda tangan digital pembuat surat (HC)."
        maxWidth="lg"
        isSubmitting={isSubmitting}
        submitLabel={editingAction ? "Simpan Perubahan" : "Terbitkan & Kirim Email"}
        onSubmit={handleSubmitAction}
      >
        <div className="space-y-4">
          {/* Opsi Letterhead Background */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3">
            <HeroSwitch
              label="Gunakan Background Letterhead PT Chitra Paratama"
              description="Jika aktif, surat cetak & PDF akan memakai background kop resmi stationery Chitra Paratama."
              checked={actionForm.useLetterhead}
              onCheckedChange={(checked) => setActionForm({ ...actionForm, useLetterhead: checked })}
            />
          </div>

          {/* Pilih Karyawan */}
          <HeroFormField label="Karyawan Penerima Sanksi" required>
            <HeroSearchableSelect
              value={actionForm.employeeId}
              onChange={(val) => setActionForm({ ...actionForm, employeeId: val })}
              options={employeeOptions}
              placeholder="Cari nama karyawan atau nomor SN..."
              className="h-9 w-full"
            />
          </HeroFormField>

          {/* Pilih Kategori & Level SP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <HeroFormField label="Kategori Pelanggaran" required>
              <HeroSearchableSelect
                value={actionForm.categoryId}
                onChange={handleCategorySelect}
                options={categoryOptions}
                placeholder="Pilih kategori pelanggaran..."
                className="h-9 w-full"
              />
            </HeroFormField>

            <HeroFormField label="Tingkatan Sanksi (Level SP)" required>
              <HeroSearchableSelect
                value={actionForm.spLevel}
                onChange={(val) => setActionForm({ ...actionForm, spLevel: val })}
                options={SP_LEVEL_OPTIONS.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
                placeholder="Pilih tingkatan SP..."
                className="h-9 w-full"
              />
            </HeroFormField>
          </div>

          {/* Nomor Surat & Tanggal Pelanggaran */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <HeroFormField
              label="Nomor Surat"
              required
              helperText="Nomor otomatis terisi dari sistem, dapat diubah bila diperlukan."
            >
              <HeroInput
                value={actionForm.letterNumber}
                onChange={(e) => setActionForm({ ...actionForm, letterNumber: e.target.value })}
                placeholder="CP/HC-DISC/YYYY/XXXX"
              />
            </HeroFormField>

            <HeroFormField label="Tanggal Kejadian Pelanggaran" required>
              <HeroInput
                type="date"
                value={actionForm.violationDate}
                onChange={(e) => setActionForm({ ...actionForm, violationDate: e.target.value })}
              />
            </HeroFormField>
          </div>

          {/* Tanggal Efektif & Tanggal Selesai/Kedaluwarsa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <HeroFormField
              label="Tanggal Efektif Berlaku"
              required
              helperText="Masa evaluasi standar 6 bulan."
            >
              <HeroInput
                type="date"
                value={actionForm.effectiveDate}
                onChange={(e) => handleEffectiveDateChange(e.target.value)}
              />
            </HeroFormField>

            <HeroFormField
              label="Tanggal Selesai / Kedaluwarsa"
              helperText="Otomatis dihitung 6 bulan ke depan."
            >
              <HeroInput
                type="date"
                value={actionForm.expiryDate}
                onChange={(e) => setActionForm({ ...actionForm, expiryDate: e.target.value })}
              />
            </HeroFormField>
          </div>

          {/* Uraian Kronologi Pelanggaran */}
          <HeroFormField
            label="Uraian Kronologi / Fakta Pelanggaran"
            required
            tooltip="Jelaskan secara objektif kejadian, pasal yang dilanggar, serta dampaknya."
          >
            <HeroTextarea
              value={actionForm.description}
              onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
              placeholder="Tuliskan kronologi fakta kejadian secara jelas..."
              rows={2}
            />
          </HeroFormField>

          {/* Tindakan Pembinaan yang Dilakukan */}
          <HeroFormField label="Tindakan Pembinaan Langsung yang Diambil">
            <HeroInput
              value={actionForm.actionTaken}
              onChange={(e) => setActionForm({ ...actionForm, actionTaken: e.target.value })}
              placeholder="Contoh: Pemanggilan tatap muka, konseling HC, teguran tertulis..."
            />
          </HeroFormField>

          {/* Diterbitkan Oleh & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <HeroFormField label="Diterbitkan Oleh (Pembuat Surat)">
              <HeroInput
                value={actionForm.issuedBy}
                onChange={(e) => setActionForm({ ...actionForm, issuedBy: e.target.value })}
                placeholder="Human Capital Dept"
              />
            </HeroFormField>

            <HeroFormField label="Status Sanksi">
              <HeroSearchableSelect
                value={actionForm.status}
                onChange={(val) => setActionForm({ ...actionForm, status: val })}
                options={STATUS_OPTIONS}
                className="h-9 w-full"
              />
            </HeroFormField>
          </div>

          {/* Tanda Tangan Digital Pembuat Surat (HC) - Tanpa Approval Berjenjang */}
          <div className="space-y-1.5 pt-1 border-t border-slate-200">
            <HeroFormField
              label="Tanda Tangan Pembuat Surat (HC)"
              helperText="Tanda tangan digital ini akan langsung disematkan pada dokumen surat dan PDF cetak."
            >
              <SignaturePad
                autoUseProfileSignature
                allowSaveToProfile
                defaultDataUrl={actionForm.issuerSignature || null}
                onDataUrlChange={handleSignatureChange}
                height={120}
              />
            </HeroFormField>
          </div>

          {/* Catatan Tambahan */}
          <HeroFormField label="Catatan Tambahan (Opsional)">
            <HeroInput
              value={actionForm.notes}
              onChange={(e) => setActionForm({ ...actionForm, notes: e.target.value })}
              placeholder="Catatan komitmen karyawan atau catatan internal..."
            />
          </HeroFormField>
        </div>
      </HeroFormDialog>

      {/* MODAL: FORM KATEGORI PELANGGARAN (CUSTOM SP LEVEL) */}
      <HeroFormDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        title={editingCategory ? "Ubah Master Kategori Pelanggaran" : "Tambah Kategori Pelanggaran Baru"}
        description="Tentukan kode, nama klasifikasi pelanggaran, bobot keparahan (severity), serta tingkatan sanksi standar."
        maxWidth="md"
        isSubmitting={isSubmitting}
        submitLabel={editingCategory ? "Simpan Perubahan" : "Simpan Kategori"}
        onSubmit={handleSubmitCategory}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <HeroFormField label="Kode Kategori" required>
              <HeroInput
                value={categoryForm.code}
                onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                placeholder="Contoh: DISC-01"
              />
            </HeroFormField>

            <HeroFormField label="Tingkat Keparahan (Severity)" required>
              <HeroSearchableSelect
                value={categoryForm.severity}
                onChange={(val) => setCategoryForm({ ...categoryForm, severity: val })}
                options={SEVERITY_OPTIONS}
                className="h-9 w-full"
              />
            </HeroFormField>
          </div>

          <HeroFormField label="Nama Kategori Pelanggaran" required>
            <HeroInput
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
              placeholder="Contoh: Keterlambatan Berulang / Mangkir Kerja"
            />
          </HeroFormField>

          <HeroFormField label="Default Level SP / Sanksi" required>
            <HeroSearchableSelect
              value={categoryForm.defaultSpLevel}
              onChange={(val) => setCategoryForm({ ...categoryForm, defaultSpLevel: val })}
              options={SP_LEVEL_OPTIONS.map((item) => ({
                value: item.value,
                label: item.label,
              }))}
              className="h-9 w-full"
            />
          </HeroFormField>

          <HeroFormField label="Deskripsi Detail Klasifikasi">
            <HeroTextarea
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              placeholder="Penjelasan batasan atau pasal dalam Peraturan Perusahaan..."
              rows={2}
            />
          </HeroFormField>

          <div className="pt-1">
            <HeroSwitch
              label="Status Kategori Aktif"
              description="Kategori ini dapat dipilih saat menerbitkan tindakan disiplin."
              checked={categoryForm.isActive}
              onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isActive: checked })}
            />
          </div>
        </div>
      </HeroFormDialog>

      {/* CONFIRM DIALOG: DELETE ACTION */}
      <HeroConfirmDialog
        open={Boolean(confirmDeleteAction)}
        onOpenChange={(open) => !open && setConfirmDeleteAction(null)}
        title="Hapus Catatan Sanksi Disiplin?"
        description={`Apakah Anda yakin ingin menghapus data sanksi untuk karyawan ${
          confirmDeleteAction?.employeeName || ""
        }? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Ya, Hapus Data"
        cancelLabel="Batal"
        tone="destructive"
        isProcessing={isSubmitting}
        onConfirm={handleDeleteAction}
      />

      {/* CONFIRM DIALOG: DELETE CATEGORY */}
      <HeroConfirmDialog
        open={Boolean(confirmDeleteCategory)}
        onOpenChange={(open) => !open && setConfirmDeleteCategory(null)}
        title="Hapus Master Kategori Pelanggaran?"
        description={`Apakah Anda yakin ingin menghapus kategori "${
          confirmDeleteCategory?.name || ""
        }" (${confirmDeleteCategory?.code || ""})?`}
        confirmLabel="Ya, Hapus Kategori"
        cancelLabel="Batal"
        tone="destructive"
        isProcessing={isSubmitting}
        onConfirm={handleDeleteCategory}
      />

      {/* MODAL: PRATINJAU SURAT RESMI SANKSI DISIPLIN */}
      <DisciplinaryLetterDialog
        open={letterModalOpen}
        onOpenChange={setLetterModalOpen}
        data={selectedLetterDoc}
      />
    </AdminPageShell>
  );
}

// Helpers
function SpLevelBadge({ level }: { level: string }) {
  const norm = level.toLowerCase();
  let toneClass = "bg-slate-100 text-slate-800 border-slate-300";

  if (norm === "teguran" || norm.includes("lisan") || norm.includes("pembinaan")) {
    toneClass = "bg-sky-50 text-sky-800 border-sky-300";
  } else if (norm === "sp1") {
    toneClass = "bg-emerald-50 text-emerald-800 border-emerald-300";
  } else if (norm === "sp2") {
    toneClass = "bg-amber-50 text-amber-800 border-amber-300";
  } else if (norm === "sp3") {
    toneClass = "bg-rose-50 text-rose-800 border-rose-300";
  } else if (norm === "skorsing") {
    toneClass = "bg-purple-50 text-purple-800 border-purple-300";
  } else if (norm === "termination" || norm === "phk") {
    toneClass = "bg-red-100 text-red-900 border-red-400 font-extrabold";
  }

  return (
    <Badge variant="outline" className={`border font-semibold px-2 py-0.5 text-xs ${toneClass}`}>
      {level}
    </Badge>
  );
}

function SeverityTag({ severity }: { severity: string }) {
  const s = severity.toLowerCase();
  const color =
    s === "critical"
      ? "bg-rose-100 text-rose-800 border-rose-300"
      : s === "high"
      ? "bg-orange-100 text-orange-800 border-orange-300"
      : s === "medium"
      ? "bg-amber-100 text-amber-800 border-amber-300"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase border ${color}`}>
      {severity}
    </span>
  );
}

function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

function dateValue(value?: Date | string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function calculateDefaultExpiry(startDateStr: string): string {
  const date = new Date(startDateStr);
  if (Number.isNaN(date.getTime())) return "";
  date.setMonth(date.getMonth() + 6);
  return date.toISOString().slice(0, 10);
}

function normalizeCategoryRow(row: CategoryRow): CategoryRow {
  return {
    ...row,
    defaultSpLevel:
      row.defaultSpLevel === 0
        ? "Teguran"
        : row.defaultSpLevel === 1
        ? "SP1"
        : row.defaultSpLevel === 2
        ? "SP2"
        : row.defaultSpLevel === 3
        ? "SP3"
        : row.defaultSpLevel === 4
        ? "Skorsing"
        : row.defaultSpLevel === 5
        ? "Termination"
        : typeof row.defaultSpLevel === "number"
        ? `SP${row.defaultSpLevel}`
        : row.defaultSpLevel,
  };
}

function enrichActionRow(
  saved: any,
  employees: EmployeeOption[],
  categories: CategoryRow[],
  existing?: ActionRow | null
): ActionRow {
  const emp = employees.find((e) => String(e.id) === String(saved.employeeId));
  const cat = categories.find((c) => String(c.id) === String(saved.violationCategoryId || saved.categoryId));

  return {
    ...saved,
    employeeName: emp?.name ?? existing?.employeeName ?? "-",
    employeeSn: emp?.employeeSn ?? existing?.employeeSn ?? "-",
    department: emp?.department ?? existing?.department ?? "-",
    position: emp?.position ?? existing?.position ?? "-",
    jobTitle: emp?.jobTitle ?? existing?.jobTitle ?? "-",
    siteName: emp?.siteName ?? existing?.siteName ?? "Head Office",
    categoryCode: cat?.code ?? existing?.categoryCode ?? "-",
    categoryName: cat?.name ?? existing?.categoryName ?? "-",
    severity: cat?.severity ?? existing?.severity ?? "Medium",
    spLevel: saved.spLevel ?? existing?.spLevel ?? "SP1",
    status: saved.status ?? existing?.status ?? "active",
    issuedBy: saved.issuedBy ?? existing?.issuedBy ?? "Human Capital Dept",
    issuerDepartment: saved.issuerDepartment ?? existing?.issuerDepartment ?? "Human Capital & Industrial Relations",
    issuerSignature: saved.issuerSignature ?? existing?.issuerSignature ?? null,
    useLetterhead: saved.useLetterhead ?? existing?.useLetterhead ?? false,
  };
}
