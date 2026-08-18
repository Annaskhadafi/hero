"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { format, startOfDay, addMonths, isBefore, isAfter } from "date-fns";
import { toast } from "sonner";
import {
  ChevronLeft,
  Package,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Edit,
  Trash2,
  Paperclip,
  History,
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  Calendar,
  Layers,
  MapPin,
  Tag,
  Hash,
  X,
  Upload,
  QrCode,
} from "lucide-react";
import {
  createAsset,
  updateAsset,
  updateAssetCondition,
  deleteAsset,
} from "@/app/dashboard/central-service/assets/actions";
import { AssetQrStickerDialog } from "@/app/dashboard/central-service/assets/components/asset-qr-sticker-dialog";
import { uploadFile } from "@/app/actions/upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface AssetAttachment {
  id?: number;
  fileName: string;
  fileUrl: string;
  previewUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
}

interface AssetHistory {
  id: number;
  action: string;
  fieldName: string;
  fieldLabel: string;
  previousValue: string | null;
  newValue: string | null;
  changeRemark: string | null;
  createdAt: Date | string;
}

interface Asset {
  id: number;
  workSection: string;
  section: string;
  location: string;
  description: string;
  assetNumber: string | null;
  serialNumber: string | null;
  purchaseDate: Date | string | null;
  deliveryToSiteDate: Date | string | null;
  lastCalibrationDate: Date | string | null;
  calibrationCycleMonths: number | null;
  calibrationDueDate: Date | string | null;
  certificateDate: Date | string | null;
  certificateCycleMonths: number | null;
  certificateDueDate: Date | string | null;
  condition: string;
  qty: number;
  remarks: string | null;
  attachments: AssetAttachment[];
  histories?: AssetHistory[];
}

interface Permissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface MobileAssetsClientPageProps {
  initialAssets: Asset[];
  masterSections: Array<{ name: string }>;
  permissions: Permissions;
}

function dueState(dueDate: Date | string | null | undefined) {
  if (!dueDate) return "none";
  const d = startOfDay(new Date(dueDate));
  if (isNaN(d.getTime())) return "none";
  const today = startOfDay(new Date());
  if (isBefore(d, today)) return "overdue";
  if (!isAfter(d, addMonths(today, 1))) return "near";
  return "ok";
}

function dueBadge(dueDate: Date | string | null | undefined, label: string) {
  if (!dueDate) return null;
  const d = startOfDay(new Date(dueDate));
  if (isNaN(d.getTime())) return null;
  const state = dueState(dueDate);

  if (state === "overdue") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-red-500/10 text-red-600 border border-red-200">
        <XCircle className="w-3 h-3 shrink-0" />
        {label}: {format(d, "dd/MM/yyyy")} (EXPIRED)
      </span>
    );
  }
  if (state === "near") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-200">
        <AlertTriangle className="w-3 h-3 shrink-0" />
        {label}: {format(d, "dd/MM/yyyy")} (SOON)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
      <Calendar className="w-3 h-3 shrink-0 text-slate-400" />
      {label}: {format(d, "dd/MM/yyyy")}
    </span>
  );
}

function conditionTag(condition: string) {
  const c = (condition || "").toUpperCase();
  if (c === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black bg-emerald-500/10 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" />
        ACTIVE
      </span>
    );
  }
  if (c === "REPAIR") {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black bg-cyan-500/10 text-cyan-700 border border-cyan-200">
        <AlertTriangle className="w-3 h-3" />
        REPAIR
      </span>
    );
  }
  if (c === "BAD") {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black bg-rose-500/10 text-rose-700 border border-rose-200">
        <XCircle className="w-3 h-3" />
        BAD
      </span>
    );
  }
  if (c === "SCRAP") {
    return (
      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-black bg-slate-500/10 text-slate-700 border border-slate-300">
        <XCircle className="w-3 h-3" />
        SCRAP
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
      <HelpCircle className="w-3 h-3" />
      {condition || "-"}
    </span>
  );
}

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "-";
  try {
    return format(new Date(d), "dd/MM/yyyy");
  } catch {
    return "-";
  }
}

export function MobileAssetsClientPage({
  initialAssets,
  masterSections,
  permissions,
}: MobileAssetsClientPageProps) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [searchQuery, setSearchQuery] = useState("");
  const [conditionFilter, setConditionFilter] = useState("ALL");
  const [sectionFilter, setSectionFilter] = useState("ALL");
  const [dueFilter, setDueFilter] = useState("ALL");
  const [groupBy, setGroupBy] = useState<"CATEGORY" | "SECTION" | "LOCATION" | "FLAT">("CATEGORY");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const defaultFormValues = {
    workSection: masterSections[0]?.name || "CENTRAL SERVICE",
    section: "TOOLS & EQUIPMENT",
    location: "SITE",
    description: "",
    assetNumber: "",
    serialNumber: "",
    purchaseDate: "",
    deliveryToSiteDate: "",
    lastCalibrationDate: "",
    calibrationCycleMonths: "",
    calibrationDueDate: "",
    certificateDate: "",
    certificateCycleMonths: "",
    certificateDueDate: "",
    condition: "ACTIVE",
    qty: "1",
    remarks: "",
    attachments: [] as AssetAttachment[],
  };

  const [formValues, setFormValues] = useState(defaultFormValues);

  // Modal Dialogs
  const [historyModalAsset, setHistoryModalAsset] = useState<Asset | null>(null);
  const [attachmentModalAsset, setAttachmentModalAsset] = useState<Asset | null>(null);
  const [qrModalAsset, setQrModalAsset] = useState<Asset | null>(null);
  const [deleteConfirmAsset, setDeleteConfirmAsset] = useState<Asset | null>(null);
  const [updatingConditionId, setUpdatingConditionId] = useState<number | null>(null);

  // Sync state when initialAssets prop updates
  useEffect(() => {
    setAssets(initialAssets);
  }, [initialAssets]);

  // Scorecards Calculation
  const stats = useMemo(() => {
    let totalQty = 0;
    let activeCount = 0;
    let dueAttentionCount = 0;
    let repairOrBadCount = 0;

    assets.forEach((a) => {
      totalQty += a.qty || 1;
      const c = (a.condition || "").toUpperCase();
      if (c === "ACTIVE") activeCount++;
      if (c === "REPAIR" || c === "BAD" || c === "SCRAP") repairOrBadCount++;

      const calState = dueState(a.calibrationDueDate);
      const certState = dueState(a.certificateDueDate);
      if (calState === "overdue" || calState === "near" || certState === "overdue" || certState === "near") {
        dueAttentionCount++;
      }
    });

    return {
      totalAssets: assets.length,
      totalQty,
      activeCount,
      dueAttentionCount,
      repairOrBadCount,
    };
  }, [assets]);

  // Auto-calculate calibration / certificate due dates in form
  const handleDateCycleChange = (
    dateField: "lastCalibrationDate" | "certificateDate",
    cycleField: "calibrationCycleMonths" | "certificateCycleMonths",
    targetDueField: "calibrationDueDate" | "certificateDueDate",
    dateValue: string,
    cycleValue: string
  ) => {
    setFormValues((prev) => {
      const next = { ...prev, [dateField]: dateValue, [cycleField]: cycleValue };
      const d = dateValue ? new Date(dateValue) : null;
      const cycle = parseInt(cycleValue, 10);

      if (d && !isNaN(d.getTime()) && !isNaN(cycle) && cycle > 0) {
        const dueDate = addMonths(d, cycle);
        next[targetDueField] = format(dueDate, "yyyy-MM-dd");
      }
      return next;
    });
  };

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      // Search
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const matchDesc = a.description?.toLowerCase().includes(query);
        const matchAssetNo = a.assetNumber?.toLowerCase().includes(query);
        const matchSN = a.serialNumber?.toLowerCase().includes(query);
        const matchLoc = a.location?.toLowerCase().includes(query);
        const matchSec = a.section?.toLowerCase().includes(query);
        const matchWorkSec = a.workSection?.toLowerCase().includes(query);
        const matchRemark = a.remarks?.toLowerCase().includes(query);
        if (!matchDesc && !matchAssetNo && !matchSN && !matchLoc && !matchSec && !matchWorkSec && !matchRemark) {
          return false;
        }
      }

      // Condition filter
      if (conditionFilter !== "ALL") {
        if ((a.condition || "").toUpperCase() !== conditionFilter) return false;
      }

      // Section filter
      if (sectionFilter !== "ALL") {
        if (a.section !== sectionFilter && a.workSection !== sectionFilter) return false;
      }

      // Due filter
      if (dueFilter !== "ALL") {
        const calState = dueState(a.calibrationDueDate);
        const certState = dueState(a.certificateDueDate);

        if (dueFilter === "ATTENTION") {
          if (calState !== "overdue" && calState !== "near" && certState !== "overdue" && certState !== "near") {
            return false;
          }
        } else if (dueFilter === "OVERDUE") {
          if (calState !== "overdue" && certState !== "overdue") return false;
        } else if (dueFilter === "NEAR") {
          if (calState !== "near" && certState !== "near") return false;
        }
      }

      return true;
    });
  }, [assets, searchQuery, conditionFilter, sectionFilter, dueFilter]);

  // Grouped Assets
  const groupedAssets = useMemo(() => {
    if (groupBy === "FLAT") {
      return [{ groupName: "Semua Asset", items: filteredAssets }];
    }

    const map = new Map<string, Asset[]>();

    filteredAssets.forEach((item) => {
      let key = "Lainnya";
      if (groupBy === "CATEGORY") key = item.section || "Tanpa Kategori";
      else if (groupBy === "SECTION") key = item.workSection || "Tanpa Section";
      else if (groupBy === "LOCATION") key = item.location || "Tanpa Lokasi";

      const current = map.get(key) || [];
      current.push(item);
      map.set(key, current);
    });

    return Array.from(map.entries()).map(([groupName, items]) => ({
      groupName,
      items,
    }));
  }, [filteredAssets, groupBy]);

  // Expand/Collapse Group Handler
  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupName]: prev[groupName] === undefined ? false : !prev[groupName],
    }));
  };

  const isGroupExpanded = (groupName: string) => {
    return expandedGroups[groupName] !== false; // expanded by default
  };

  // Open Form (Create or Edit)
  const handleOpenForm = (asset?: Asset) => {
    if (asset) {
      setEditingAsset(asset);
      setFormValues({
        workSection: asset.workSection || "",
        section: asset.section || "",
        location: asset.location || "",
        description: asset.description || "",
        assetNumber: asset.assetNumber || "",
        serialNumber: asset.serialNumber || "",
        purchaseDate: asset.purchaseDate ? format(new Date(asset.purchaseDate), "yyyy-MM-dd") : "",
        deliveryToSiteDate: asset.deliveryToSiteDate ? format(new Date(asset.deliveryToSiteDate), "yyyy-MM-dd") : "",
        lastCalibrationDate: asset.lastCalibrationDate ? format(new Date(asset.lastCalibrationDate), "yyyy-MM-dd") : "",
        calibrationCycleMonths: asset.calibrationCycleMonths ? String(asset.calibrationCycleMonths) : "",
        calibrationDueDate: asset.calibrationDueDate ? format(new Date(asset.calibrationDueDate), "yyyy-MM-dd") : "",
        certificateDate: asset.certificateDate ? format(new Date(asset.certificateDate), "yyyy-MM-dd") : "",
        certificateCycleMonths: asset.certificateCycleMonths ? String(asset.certificateCycleMonths) : "",
        certificateDueDate: asset.certificateDueDate ? format(new Date(asset.certificateDueDate), "yyyy-MM-dd") : "",
        condition: asset.condition || "ACTIVE",
        qty: String(asset.qty || 1),
        remarks: asset.remarks || "",
        attachments: asset.attachments || [],
      });
    } else {
      setEditingAsset(null);
      setFormValues(defaultFormValues);
    }
    setIsFormOpen(true);
  };

  // Handle File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);

        const res = await uploadFile(formData);
        if (res.success && res.url) {
          const newAtt: AssetAttachment = {
            fileName: file.name,
            fileUrl: res.url,
            previewUrl: res.readableUrl || res.url,
            mimeType: file.type,
            fileSize: file.size,
          };
          setFormValues((prev) => ({
            ...prev,
            attachments: [...prev.attachments, newAtt],
          }));
          toast.success(`File ${file.name} berhasil diupload`);
        } else {
          toast.error(res.error || `Gagal mengupload ${file.name}`);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Error saat mengupload file");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setFormValues((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  // Submit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.description.trim()) {
      toast.error("Description/Nama Alat wajib diisi");
      return;
    }
    if (!formValues.section.trim()) {
      toast.error("Kategori Alat wajib diisi");
      return;
    }
    if (!formValues.location.trim()) {
      toast.error("Lokasi Site wajib diisi");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        workSection: formValues.workSection,
        section: formValues.section,
        location: formValues.location,
        description: formValues.description,
        assetNumber: formValues.assetNumber || null,
        serialNumber: formValues.serialNumber || null,
        purchaseDate: formValues.purchaseDate || null,
        deliveryToSiteDate: formValues.deliveryToSiteDate || null,
        lastCalibrationDate: formValues.lastCalibrationDate || null,
        calibrationCycleMonths: formValues.calibrationCycleMonths ? Number(formValues.calibrationCycleMonths) : null,
        calibrationDueDate: formValues.calibrationDueDate || null,
        certificateDate: formValues.certificateDate || null,
        certificateCycleMonths: formValues.certificateCycleMonths ? Number(formValues.certificateCycleMonths) : null,
        certificateDueDate: formValues.certificateDueDate || null,
        condition: formValues.condition,
        qty: Number(formValues.qty || 1),
        remarks: formValues.remarks || null,
        attachments: formValues.attachments,
      };

      if (editingAsset) {
        const res = await updateAsset(editingAsset.id, payload);
        if (res.success && res.data) {
          toast.success("Asset berhasil diperbarui");
          setAssets((prev) => prev.map((item) => (item.id === editingAsset.id ? (res.data as Asset) : item)));
          setIsFormOpen(false);
        } else {
          toast.error(res.error || "Gagal memperbarui asset");
        }
      } else {
        const res = await createAsset(payload);
        if (res.success && res.data) {
          toast.success("Asset baru berhasil ditambahkan");
          setAssets((prev) => [res.data as Asset, ...prev]);
          setIsFormOpen(false);
        } else {
          toast.error(res.error || "Gagal membuat asset baru");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan asset");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Condition Switcher
  const handleQuickConditionChange = async (assetId: number, newCondition: string) => {
    setUpdatingConditionId(assetId);
    try {
      const res = await updateAssetCondition(assetId, newCondition);
      if (res.success) {
        toast.success(`Kondisi diubah menjadi ${newCondition}`);
        setAssets((prev) =>
          prev.map((item) => (item.id === assetId ? { ...item, condition: newCondition } : item))
        );
      } else {
        toast.error(res.error || "Gagal mengubah kondisi");
      }
    } catch (err: any) {
      toast.error(err.message || "Error mengubah kondisi");
    } finally {
      setUpdatingConditionId(null);
    }
  };

  // Delete Asset
  const handleDeleteAsset = async () => {
    if (!deleteConfirmAsset) return;
    try {
      const res = await deleteAsset(deleteConfirmAsset.id);
      if (res.success) {
        toast.success("Asset berhasil dihapus");
        setAssets((prev) => prev.filter((a) => a.id !== deleteConfirmAsset.id));
        setDeleteConfirmAsset(null);
      } else {
        toast.error(res.error || "Gagal menghapus asset");
      }
    } catch (err: any) {
      toast.error(err.message || "Error saat menghapus asset");
    }
  };

  // List of unique section names for filter
  const uniqueSections = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => {
      if (a.section) set.add(a.section);
      if (a.workSection) set.add(a.workSection);
    });
    return Array.from(set).sort();
  }, [assets]);

  return (
    <div className="space-y-4 pb-24 font-sans max-w-lg mx-auto px-1.5">
      {/* Top Mobile Header */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/mobile/dashboard"
              className="p-2 rounded-xl bg-white text-[#003461] border border-slate-200/80 shadow-sm hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <p className="text-[10px] font-black tracking-[0.24em] text-[#486275] uppercase">
                Central Service
              </p>
              <h1 className="text-xl font-black tracking-tight text-[#003461] flex items-center gap-1.5">
                <Package className="w-5 h-5 text-indigo-600" />
                Asset Management
              </h1>
            </div>
          </div>

          {(permissions.canCreate || permissions.canEdit) && (
            <button
              onClick={() => handleOpenForm()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#003461] text-white text-xs font-bold shadow-md active:scale-95 transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah</span>
            </button>
          )}
        </div>

        {/* Scorecard Summary Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Card 1: Total Assets */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(8,32,51,0.04)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Asset</span>
              <Package className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-[#003461]">{stats.totalAssets}</span>
              <span className="text-xs font-bold text-slate-500">({stats.totalQty} Pcs)</span>
            </div>
          </div>

          {/* Card 2: Active */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(8,32,51,0.04)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600">Active</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-700">{stats.activeCount}</span>
              <span className="text-xs font-semibold text-slate-400">Siap Pakai</span>
            </div>
          </div>

          {/* Card 3: Due / Attention */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(8,32,51,0.04)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Due Kalibrasi</span>
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-amber-700">{stats.dueAttentionCount}</span>
              <span className="text-xs font-semibold text-slate-400">Perhatian</span>
            </div>
          </div>

          {/* Card 4: Repair / Bad */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(8,32,51,0.04)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600">Repair / Bad</span>
              <XCircle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-rose-700">{stats.repairOrBadCount}</span>
              <span className="text-xs font-semibold text-slate-400">Butuh Aksi</span>
            </div>
          </div>
        </div>
      </section>

      {/* Controls: Search, Filters & Grouping */}
      <section className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari deskripsi, SN, asset no, lokasi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-3 bg-slate-50 border border-slate-200 text-xs font-bold text-[#003461] rounded-xl outline-none focus:ring-2 focus:ring-[#003461]/20 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Condition Filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Kondisi</label>
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="w-full h-8 px-2 bg-slate-50 border border-slate-200 text-xs font-bold text-[#003461] rounded-lg outline-none"
            >
              <option value="ALL">Semua Kondisi</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="REPAIR">REPAIR</option>
              <option value="BAD">BAD</option>
              <option value="SCRAP">SCRAP</option>
            </select>
          </div>

          {/* Section / Category Filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Kategori / Sec</label>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-full h-8 px-2 bg-slate-50 border border-slate-200 text-xs font-bold text-[#003461] rounded-lg outline-none"
            >
              <option value="ALL">Semua Kategori</option>
              {uniqueSections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>

          {/* Due Kalibrasi Filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Status Kalibrasi</label>
            <select
              value={dueFilter}
              onChange={(e) => setDueFilter(e.target.value)}
              className="w-full h-8 px-2 bg-slate-50 border border-slate-200 text-xs font-bold text-[#003461] rounded-lg outline-none"
            >
              <option value="ALL">Semua Status Due</option>
              <option value="ATTENTION">Perlu Perhatian</option>
              <option value="OVERDUE">EXPIRED (Overdue)</option>
              <option value="NEAR">SOON (&lt; 30 Hari)</option>
            </select>
          </div>

          {/* Grouping Filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Group By</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="w-full h-8 px-2 bg-slate-50 border border-slate-200 text-xs font-bold text-[#003461] rounded-lg outline-none"
            >
              <option value="CATEGORY">Group by Kategori</option>
              <option value="SECTION">Group by Section</option>
              <option value="LOCATION">Group by Lokasi</option>
              <option value="FLAT">Flat List (Semua)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Asset List View */}
      <section className="space-y-3">
        {filteredAssets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">Tidak ada asset ditemukan</p>
            <p className="text-[11px] text-slate-400">Coba ubah kata kunci pencarian atau filter yang dipilih.</p>
          </div>
        ) : (
          groupedAssets.map((group) => {
            const expanded = isGroupExpanded(group.groupName);
            return (
              <div
                key={group.groupName}
                className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(8,32,51,0.04)] overflow-hidden"
              >
                {/* Group Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.groupName)}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left border-b border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#003461]" />
                    <span className="text-xs font-black text-[#003461]">{group.groupName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#003461]/10 text-[#003461] text-[10px] font-extrabold">
                      {group.items.length} Asset
                    </span>
                  </div>
                  {expanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {/* Group Item Cards */}
                {expanded && (
                  <div className="p-3 space-y-3 divide-y divide-slate-100">
                    {group.items.map((asset) => (
                      <div key={asset.id} className="pt-3 first:pt-0 space-y-2.5">
                        {/* Top Row: Description & Condition */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 flex-1 min-w-0">
                            <h3 className="text-xs font-black text-[#003461] leading-tight break-words">
                              {asset.description}
                            </h3>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                Qty: {asset.qty || 1}
                              </span>
                              {asset.section && (
                                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                  {asset.section}
                                </span>
                              )}
                              {asset.location && (
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <MapPin className="w-2.5 h-2.5" />
                                  {asset.location}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">{conditionTag(asset.condition)}</div>
                        </div>

                        {/* Middle Row: Asset No, SN */}
                        <div className="grid grid-cols-2 gap-1.5 bg-slate-50/70 p-2 rounded-xl text-[11px]">
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 block">Nomor Asset</span>
                            <span className="font-bold text-slate-700">{asset.assetNumber || "-"}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 block">Serial Number (SN)</span>
                            <span className="font-bold text-slate-700">{asset.serialNumber || "-"}</span>
                          </div>
                        </div>

                        {/* Due Badges */}
                        <div className="flex flex-wrap gap-1.5">
                          {dueBadge(asset.calibrationDueDate, "Kalibrasi")}
                          {dueBadge(asset.certificateDueDate, "Sertifikat")}
                        </div>

                        {/* Remarks if available */}
                        {asset.remarks && (
                          <div className="text-[11px] text-slate-600 bg-amber-50/60 p-2 rounded-xl border border-amber-100">
                            <span className="font-bold text-amber-800">Remarks: </span>
                            {asset.remarks}
                          </div>
                        )}

                        {/* Bottom Action Bar */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                          {/* Left: Attachment & History Badges */}
                          <div className="flex items-center gap-2">
                            {asset.attachments && asset.attachments.length > 0 && (
                              <button
                                onClick={() => setAttachmentModalAsset(asset)}
                                className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
                              >
                                <Paperclip className="w-3 h-3" />
                                <span>{asset.attachments.length} File</span>
                              </button>
                            )}

                            <button
                              onClick={() => setHistoryModalAsset(asset)}
                              className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg hover:bg-slate-200 transition-colors"
                            >
                              <History className="w-3 h-3" />
                              <span>History</span>
                            </button>
                          </div>

                          {/* Right: Quick Condition Switch & Edit / Delete */}
                          <div className="flex items-center gap-1.5">
                            {permissions.canEdit && (
                              <select
                                value={asset.condition}
                                disabled={updatingConditionId === asset.id}
                                onChange={(e) => handleQuickConditionChange(asset.id, e.target.value)}
                                className="h-7 px-1.5 text-[10px] font-black bg-white border border-slate-200 text-[#003461] rounded-lg outline-none focus:ring-1 focus:ring-[#003461]"
                              >
                                <option value="ACTIVE">Set ACTIVE</option>
                                <option value="REPAIR">Set REPAIR</option>
                                <option value="BAD">Set BAD</option>
                                <option value="SCRAP">Set SCRAP</option>
                              </select>
                            )}

                            <button
                              onClick={() => setQrModalAsset(asset)}
                              className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 active:scale-95 transition-all"
                              title="QR Code & Stiker"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            {permissions.canEdit && (
                              <button
                                onClick={() => handleOpenForm(asset)}
                                className="p-1.5 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 active:scale-95 transition-all"
                                title="Edit Asset"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {permissions.canDelete && (
                              <button
                                onClick={() => setDeleteConfirmAsset(asset)}
                                className="p-1.5 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 active:scale-95 transition-all"
                                title="Hapus Asset"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* CREATE / EDIT FORM DIALOG */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-[#003461]">
              {editingAsset ? "Edit Asset" : "Tambah Asset Baru"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Isi informasi inventaris tools dan peralatan Central Service
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitForm} className="space-y-3.5 mt-2">
            {/* Work Section */}
            <div>
              <Label className="text-[11px] font-bold text-[#486275]">Work Section / Dep</Label>
              <select
                value={formValues.workSection}
                onChange={(e) => setFormValues({ ...formValues, workSection: e.target.value })}
                className="w-full h-9 bg-[#f8fafc] border border-slate-200 text-[#003461] text-xs font-bold mt-1 rounded-xl px-2.5 outline-none"
              >
                {masterSections.map((sec) => (
                  <option key={sec.name} value={sec.name}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Kategori Alat */}
            <div>
              <Label className="text-[11px] font-bold text-[#486275]">Kategori Alat *</Label>
              <Input
                value={formValues.section}
                onChange={(e) => setFormValues({ ...formValues, section: e.target.value })}
                placeholder="Contoh: TOOLS & EQUIPMENT, RAD, MASTER GAUGE"
                className="h-9 bg-[#f8fafc] border-slate-200 text-[#003461] text-xs font-bold mt-1 rounded-xl"
                required
              />
            </div>

            {/* Description */}
            <div>
              <Label className="text-[11px] font-bold text-[#486275]">Deskripsi / Nama Alat *</Label>
              <Textarea
                value={formValues.description}
                onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                placeholder="Contoh: TORQUE WRENCH 1000 NM"
                className="bg-[#f8fafc] border-slate-200 text-[#003461] text-xs font-bold mt-1 rounded-xl min-h-[60px]"
                required
              />
            </div>

            {/* Asset No & Serial No Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-bold text-[#486275]">Nomor Asset</Label>
                <Input
                  value={formValues.assetNumber}
                  onChange={(e) => setFormValues({ ...formValues, assetNumber: e.target.value })}
                  placeholder="AST-2026-001"
                  className="h-9 bg-[#f8fafc] border-slate-200 text-[#003461] text-xs font-bold mt-1 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-[11px] font-bold text-[#486275]">Serial Number (SN)</Label>
                <Input
                  value={formValues.serialNumber}
                  onChange={(e) => setFormValues({ ...formValues, serialNumber: e.target.value })}
                  placeholder="SN12345678"
                  className="h-9 bg-[#f8fafc] border-slate-200 text-[#003461] text-xs font-bold mt-1 rounded-xl"
                />
              </div>
            </div>

            {/* Location & Qty Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-bold text-[#486275]">Lokasi Site *</Label>
                <Input
                  value={formValues.location}
                  onChange={(e) => setFormValues({ ...formValues, location: e.target.value })}
                  placeholder="WORKSHOP BSB"
                  className="h-9 bg-[#f8fafc] border-slate-200 text-[#003461] text-xs font-bold mt-1 rounded-xl"
                  required
                />
              </div>

              <div>
                <Label className="text-[11px] font-bold text-[#486275]">Qty (Pcs) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formValues.qty}
                  onChange={(e) => setFormValues({ ...formValues, qty: e.target.value })}
                  className="h-9 bg-[#f8fafc] border-slate-200 text-[#003461] text-xs font-bold mt-1 rounded-xl"
                  required
                />
              </div>
            </div>

            {/* Condition */}
            <div>
              <Label className="text-[11px] font-bold text-[#486275]">Kondisi Asset *</Label>
              <select
                value={formValues.condition}
                onChange={(e) => setFormValues({ ...formValues, condition: e.target.value })}
                className="w-full h-9 bg-[#f8fafc] border border-slate-200 text-[#003461] text-xs font-bold mt-1 rounded-xl px-2.5 outline-none"
              >
                <option value="ACTIVE">ACTIVE (Operasional)</option>
                <option value="REPAIR">REPAIR (Dalam Perbaikan)</option>
                <option value="BAD">BAD (Rusak)</option>
                <option value="SCRAP">SCRAP (Afkir / Rusak Total)</option>
              </select>
            </div>

            {/* Purchase & Delivery Date */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-bold text-[#486275]">Tgl Pembelian</Label>
                <Input
                  type="date"
                  value={formValues.purchaseDate}
                  onChange={(e) => setFormValues({ ...formValues, purchaseDate: e.target.value })}
                  className="h-9 bg-[#f8fafc] border-slate-200 text-[#003461] text-xs font-bold mt-1 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-[11px] font-bold text-[#486275]">Delivery to Site</Label>
                <Input
                  type="date"
                  value={formValues.deliveryToSiteDate}
                  onChange={(e) => setFormValues({ ...formValues, deliveryToSiteDate: e.target.value })}
                  className="h-9 bg-[#f8fafc] border-slate-200 text-[#003461] text-xs font-bold mt-1 rounded-xl"
                />
              </div>
            </div>

            {/* Calibration Section */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">
                Pengaturan Kalibrasi
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] font-bold text-[#486275]">Tgl Kalibrasi</Label>
                  <Input
                    type="date"
                    value={formValues.lastCalibrationDate}
                    onChange={(e) =>
                      handleDateCycleChange(
                        "lastCalibrationDate",
                        "calibrationCycleMonths",
                        "calibrationDueDate",
                        e.target.value,
                        formValues.calibrationCycleMonths
                      )
                    }
                    className="h-8 bg-white border-slate-200 text-xs font-bold mt-0.5 rounded-lg px-1.5"
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold text-[#486275]">Siklus (Bulan)</Label>
                  <Input
                    type="number"
                    placeholder="12"
                    value={formValues.calibrationCycleMonths}
                    onChange={(e) =>
                      handleDateCycleChange(
                        "lastCalibrationDate",
                        "calibrationCycleMonths",
                        "calibrationDueDate",
                        formValues.lastCalibrationDate,
                        e.target.value
                      )
                    }
                    className="h-8 bg-white border-slate-200 text-xs font-bold mt-0.5 rounded-lg px-1.5"
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold text-[#486275]">Due Date</Label>
                  <Input
                    type="date"
                    value={formValues.calibrationDueDate}
                    onChange={(e) => setFormValues({ ...formValues, calibrationDueDate: e.target.value })}
                    className="h-8 bg-white border-slate-200 text-xs font-bold mt-0.5 rounded-lg px-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Certificate Section */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">
                Pengaturan Sertifikat
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] font-bold text-[#486275]">Tgl Sertifikat</Label>
                  <Input
                    type="date"
                    value={formValues.certificateDate}
                    onChange={(e) =>
                      handleDateCycleChange(
                        "certificateDate",
                        "certificateCycleMonths",
                        "certificateDueDate",
                        e.target.value,
                        formValues.certificateCycleMonths
                      )
                    }
                    className="h-8 bg-white border-slate-200 text-xs font-bold mt-0.5 rounded-lg px-1.5"
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold text-[#486275]">Siklus (Bulan)</Label>
                  <Input
                    type="number"
                    placeholder="12"
                    value={formValues.certificateCycleMonths}
                    onChange={(e) =>
                      handleDateCycleChange(
                        "certificateDate",
                        "certificateCycleMonths",
                        "certificateDueDate",
                        formValues.certificateDate,
                        e.target.value
                      )
                    }
                    className="h-8 bg-white border-slate-200 text-xs font-bold mt-0.5 rounded-lg px-1.5"
                  />
                </div>

                <div>
                  <Label className="text-[10px] font-bold text-[#486275]">Due Date</Label>
                  <Input
                    type="date"
                    value={formValues.certificateDueDate}
                    onChange={(e) => setFormValues({ ...formValues, certificateDueDate: e.target.value })}
                    className="h-8 bg-white border-slate-200 text-xs font-bold mt-0.5 rounded-lg px-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <Label className="text-[11px] font-bold text-[#486275]">Remarks / Catatan</Label>
              <Textarea
                value={formValues.remarks}
                onChange={(e) => setFormValues({ ...formValues, remarks: e.target.value })}
                placeholder="Catatan kondisi atau lokasi saat ini..."
                className="bg-[#f8fafc] border-slate-200 text-[#003461] text-xs font-bold mt-1 rounded-xl min-h-[50px]"
              />
            </div>

            {/* Attachments Section */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-[#486275]">Attachment File / Foto</Label>
                <label className="cursor-pointer text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors">
                  {isUploading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
                  <span>Upload File</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>

              {formValues.attachments.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {formValues.attachments.map((att, idx) => (
                    <div
                      key={`${att.fileUrl}-${idx}`}
                      className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    >
                      <span className="truncate font-semibold text-slate-700 max-w-[200px]">
                        {att.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="pt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 rounded-xl text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-[#003461] hover:bg-[#002547] text-white rounded-xl text-xs font-bold"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Asset"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ATTACHMENT VIEWER DIALOG */}
      <AssetAttachmentViewerModal
        asset={attachmentModalAsset}
        open={Boolean(attachmentModalAsset)}
        onOpenChange={(open) => {
          if (!open) setAttachmentModalAsset(null);
        }}
      />

      {/* QR CODE & STIKER MODAL */}
      <AssetQrStickerDialog
        open={qrModalAsset !== null}
        onOpenChange={(open) => {
          if (!open) setQrModalAsset(null);
        }}
        assets={qrModalAsset ? [qrModalAsset] : []}
      />

      {/* HISTORY AUDIT TRAIL DIALOG */}
      <Dialog open={Boolean(historyModalAsset)} onOpenChange={() => setHistoryModalAsset(null)}>
        <DialogContent className="max-w-lg rounded-3xl p-5">
          <DialogHeader>
            <DialogTitle className="text-sm font-black text-[#003461]">Riwayat Perubahan Asset</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {historyModalAsset?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 mt-2 max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
            {(!historyModalAsset?.histories || historyModalAsset.histories.length === 0) ? (
              <p className="text-xs text-slate-400 text-center py-4">Belum ada riwayat perubahan.</p>
            ) : (
              historyModalAsset.histories.map((h, i) => (
                <div key={h.id || i} className="pt-2.5 first:pt-0 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                    <span className="uppercase text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {h.action}
                    </span>
                    <span>{fmtDate(h.createdAt)}</span>
                  </div>
                  <p className="font-bold text-slate-700">Field: {h.fieldLabel || h.fieldName}</p>
                  <div className="grid grid-cols-2 gap-1 text-[11px] bg-slate-50 p-2 rounded-xl">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold">Sebelumnya</span>
                      <span className="text-rose-600 font-medium">{h.previousValue || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-bold">Menjadi</span>
                      <span className="text-emerald-600 font-medium">{h.newValue || "-"}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM DIALOG */}
      <Dialog open={Boolean(deleteConfirmAsset)} onOpenChange={() => setDeleteConfirmAsset(null)}>
        <DialogContent className="max-w-xs rounded-3xl p-5 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#003461]">Hapus Asset?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Apakah Anda yakin ingin menghapus <b>{deleteConfirmAsset?.description}</b>? Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmAsset(null)}
              className="flex-1 rounded-xl text-xs font-bold"
            >
              Batal
            </Button>
            <Button
              onClick={handleDeleteAsset}
              className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
            >
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function uploadProxyUrl(url: string | null | undefined) {
  if (!url) return "";
  const cleanPath = url.trim().split("?")[0];
  if (cleanPath.startsWith("/api/uploads/")) return cleanPath;
  const parts = cleanPath.split("/").filter(Boolean);
  const prefixIndex = parts.findIndex((part) =>
    ["upload", "uploads", "attendance-photos", "curhat", "profile-photos"].includes(decodeURIComponent(part))
  );
  if (prefixIndex >= 0) {
    return `/api/uploads/${parts.slice(prefixIndex).map((part) => encodeURIComponent(decodeURIComponent(part))).join("/")}`;
  }
  return "";
}

function attachmentUrl(attachment: AssetAttachment) {
  const proxied = uploadProxyUrl(attachment.fileUrl);
  return proxied || attachment.previewUrl || attachment.fileUrl;
}

function isPdfAttachment(attachment: AssetAttachment) {
  return attachment.mimeType === "application/pdf" || attachment.fileName.toLowerCase().endsWith(".pdf");
}

function isImageAttachment(attachment: AssetAttachment) {
  const name = attachment.fileName.toLowerCase();
  return Boolean(
    attachment.mimeType?.startsWith("image/") ||
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg") ||
      name.endsWith(".png") ||
      name.endsWith(".webp") ||
      name.endsWith(".gif")
  );
}

function AssetAttachmentViewerModal({
  asset,
  open,
  onOpenChange,
}: {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const attachments = asset?.attachments ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [asset?.id, attachments.length]);

  const selected = attachments[selectedIndex] ?? attachments[0] ?? null;
  const url = selected ? attachmentUrl(selected) : "";
  const isImg = selected ? isImageAttachment(selected) : false;
  const isPdf = selected ? isPdfAttachment(selected) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl sm:max-w-5xl w-[95vw] rounded-3xl p-4 sm:p-6 max-h-[92vh] flex flex-col space-y-3">
        <DialogHeader className="shrink-0 flex flex-row items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <DialogTitle className="text-base font-black text-[#003461]">
              Attachment Asset ({attachments.length} File)
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-500 truncate max-w-[280px] sm:max-w-lg">
              {asset?.description}
            </DialogDescription>
          </div>
        </DialogHeader>

        {attachments.length === 0 ? (
          <div className="py-12 text-center text-xs font-bold text-slate-400">
            Tidak ada attachment untuk asset ini.
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Horizontal File Selector Tabs */}
            {attachments.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 shrink-0 scrollbar-thin">
                {attachments.map((att, idx) => {
                  const active = idx === selectedIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedIndex(idx)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                        active
                          ? "bg-[#003461] text-white shadow-sm"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Paperclip className="w-3 h-3" />
                      <span className="truncate max-w-[140px]">{att.fileName}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Header for Active Selected File */}
            {selected && (
              <div className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/80 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs font-black text-[#003461] truncate">{selected.fileName}</span>
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-bold text-white bg-[#003461] hover:bg-[#002547] px-3 py-1.5 rounded-xl shadow-sm transition-all shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka / Fullscreen</span>
                </a>
              </div>
            )}

            {/* Viewer Display Container */}
            <div className="flex-1 min-h-[50vh] sm:min-h-[60vh] max-h-[68vh] rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 flex items-center justify-center relative">
              {selected && isImg ? (
                <img
                  src={url}
                  alt={selected.fileName}
                  className="w-full h-full max-h-[68vh] object-contain"
                />
              ) : selected && isPdf ? (
                <iframe
                  title={selected.fileName}
                  src={url}
                  className="w-full h-full min-h-[50vh] sm:min-h-[60vh] bg-white border-0"
                />
              ) : selected ? (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-white">
                  <Paperclip className="w-10 h-10 text-slate-400" />
                  <p className="text-xs font-bold">{selected.fileName}</p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Unduh / Buka Dokumen
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
