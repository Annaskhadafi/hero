"use client";

import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FileText,
  Eye,
  ShieldCheck,
  Calendar,
  RefreshCw,
  Paperclip,
  BookOpen,
  FileSpreadsheet,
  Download,
  CheckSquare,
  Square,
  FileArchive,
  Filter,
  CheckCheck,
  Send,
  Loader2,
  User,
  UserCheck,
  Building2,
  Settings,
  X,
  ExternalLink,
} from "lucide-react";
import { downloadElementAsPdf } from "@/lib/pdf-download";
import { MissingSignatureDialog } from "@/components/missing-signature-dialog";
import { SopWinAccessSettingsModal } from "@/components/sop-win/sop-win-access-settings-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { MultiSelectFilterDropdown } from "@/components/ui/multi-select-filter-dropdown";
import { HcWorkspaceBanner } from "@/components/hc/hc-workspace-banner";
import { MinimalTableShell } from "@/components/ui/minimal-table-shell";
import {
  reviewSopWinDocumentRequestAction,
  getSopWinDocumentRequestsAction,
  getSopWinDocumentRequestDetailAction,
  updateSopWinAccessSettingsAction,
} from "@/app/dashboard/sop-win/actions";
import { getUserSignatureAction } from "@/app/actions/user-signature";
import { downloadFilesAsZip } from "@/lib/pdf-download";
import { toast } from "sonner";

export interface SopWinRequestApprovalStep {
  id: number;
  requestId: number;
  stepOrder: number;
  stepLabel: string;
  approvalToken: string;
  approverEmployeeId: number | null;
  approverName: string;
  approverEmail: string;
  status: "pending" | "waiting" | "approved" | "reverted" | "rejected" | "cancelled";
  signatureDataUrl: string | null;
  remarks: string;
  signedAt: string | Date | null;
}

export interface SopWinRequestItem {
  id: number;
  requestNumber: string;
  requesterEmployeeId: number | null;
  requesterName: string;
  requesterDepartment: string;
  requestedDocType: "POL" | "SOP" | "WIN";
  procedureName: string;
  ownDepartment: string;
  isProcessOwner: boolean;
  requestDate: string;
  isExternal: boolean;
  externalCompany: string;
  externalName: string;
  requestReason: string;
  requestedDocCount: number;
  requestedDocTitleAndNumber: string;
  fileAttachmentUrl: string | null;
  requestType: "softcopy" | "hardcopy";
  expiryDays: number;
  accessExpiresAt: string | Date | null;
  accessToken: string;
  canDownload?: boolean;
  adminApprovedAt?: string | Date | null;
  remarks?: string | null;
  status: "pending_ria" | "pending_creator" | "pending_owner" | "pending_bardynia" | "approved" | "reverted" | "rejected";
  createdAt: string | Date;
  updatedAt: string | Date;
  approvals?: SopWinRequestApprovalStep[];
}

interface SopWinApprovalWorkspaceProps {
  initialRequests?: SopWinRequestItem[];
  initialDocuments?: any[];
  departments?: Array<{ code: string; name: string }>;
  stats?: any;
}

export interface DepartmentSignatoryStep {
  stepNumber: number;
  label: string;
  role: string;
  name: string;
}

export function getDepartmentWorkflowSteps(
  departmentCodeRaw?: string | null,
  requesterNameRaw?: string | null,
  requesterDeptRaw?: string | null,
  docTitleAndNumberRaw?: string | null
): { departmentCode: string; departmentName: string; steps: DepartmentSignatoryStep[] } {
  const textToScan = `${departmentCodeRaw || ""} ${requesterDeptRaw || ""} ${docTitleAndNumberRaw || ""}`.toUpperCase();

  let deptCode = "CPI";
  if (/\b(SOP|WIN|POL)[\/._\s]?CPI[\/._\s]/i.test(textToScan) || textToScan.includes("/CPI") || textToScan.includes(".CPI.") || textToScan.includes("CONTINUOUS")) {
    deptCode = "CPI";
  } else if (/\b(SOP|WIN|POL)[\/._\s]?HSE[\/._\s]/i.test(textToScan) || textToScan.includes("/HSE.") || textToScan.includes(".HSE.") || textToScan.includes("HSE/") || textToScan.includes("SAFETY")) {
    deptCode = "HSE";
  } else if (/\b(SOP|WIN|POL)[\/._\s]?HR[\/._\s]/i.test(textToScan) || textToScan.includes("/HR.") || textToScan.includes(".HR.") || textToScan.includes("HUMAN CAPITAL")) {
    deptCode = "HR";
  } else if (/\b(SOP|WIN|POL)[\/._\s]?GA[\/._\s]/i.test(textToScan) || textToScan.includes("/GA.") || textToScan.includes(".GA.") || textToScan.includes("GENERAL AFFAIRS")) {
    deptCode = "GA";
  } else if (/\b(SOP|WIN|POL)[\/._\s]?TEC[\/._\s]/i.test(textToScan) || textToScan.includes("/TECH") || textToScan.includes(".TECH") || textToScan.includes("TECHNICAL")) {
    deptCode = "TECHNICAL";
  } else if (/\b(SOP|WIN|POL)[\/._\s]?LGL[\/._\s]/i.test(textToScan) || textToScan.includes("/LEGAL") || textToScan.includes(".LEGAL") || textToScan.includes("SOP.LGL")) {
    deptCode = "LEGAL";
  } else if (/\b(SOP|WIN|POL)[\/._\s]?ERM[\/._\s]/i.test(textToScan) || textToScan.includes("/ERM.") || textToScan.includes(".ERM.") || textToScan.includes("SOP.ERM") || textToScan.includes("SOP.DRM")) {
    deptCode = "ERM";
  } else if (/\b(SOP|WIN|POL)[\/._\s]?BIM[\/._\s]/i.test(textToScan) || textToScan.includes("BIMA") || textToScan.includes("SOP.BIM") || textToScan.includes("BIM.")) {
    deptCode = "BIMA";
  } else if (/\b(SOP|WIN|POL)[\/._\s]?FAM[\/._\s]/i.test(textToScan) || textToScan.includes("/FAM.") || textToScan.includes(".FAM.") || textToScan.includes("WIN/FAM") || textToScan.includes("FACILITY") || textToScan.includes("ASSET MANAGEMENT")) {
    deptCode = "FAM";
  } else if (/\b(SOP|WIN|POL)[\/._\s]?(TC|TRC)[\/._\s]/i.test(textToScan) || textToScan.includes("/TC.") || textToScan.includes(".TC.") || textToScan.includes("POL.TC") || textToScan.includes("SOP/TRC") || textToScan.includes("TRAINING")) {
    deptCode = "TC";
  } else {
    const raw = (departmentCodeRaw || "").trim().toUpperCase();
    if (raw.length > 0 && raw !== "INTERNAL HERO" && raw !== "DRAFTEK") {
      if (raw.includes("REPAIR")) deptCode = "REPAIR";
      else if (raw.includes("SERVICE")) deptCode = "SERVICE";
      else if (raw.includes("CPI")) deptCode = "CPI";
      else if (raw.includes("HSE")) deptCode = "HSE";
      else if (raw.includes("HR")) deptCode = "HR";
      else if (raw.includes("GA")) deptCode = "GA";
      else if (raw.includes("LEGAL")) deptCode = "LEGAL";
      else if (raw.includes("ERM")) deptCode = "ERM";
      else deptCode = raw;
    }
  }

  const workflows: Record<string, { name: string; steps: Array<{ label: string; role: string; name: string }> }> = {
    FAM: {
      name: "Facility & Asset Management",
      steps: [
        { label: "Verifikasi Draftek & SOP Admin", role: "Admin SOP", name: "Ria Annisa" },
        { label: "Penyusunan & Verifikasi Teknis", role: "Facility & Maintenance SPV", name: "Didik Wahyudi" },
        { label: "Pengesahan Manager", role: "Support Facility Management Manager", name: "Susanto" },
      ],
    },
    TC: {
      name: "Training Centre",
      steps: [
        { label: "Verifikasi Draftek & SOP Admin", role: "Admin SOP", name: "Ria Annisa" },
        { label: "Penyusunan & Verifikasi Teknis", role: "Training Centre Coordinator", name: "Ridho Akmal Sholeh" },
        { label: "Persetujuan Human Capital Manager", role: "Human Capital Manager", name: "Rendra Rachman" },
        { label: "Pengesahan Director", role: "Director", name: "Hidayat Rahman" },
      ],
    },
    HSE: {
      name: "Health Safety & Environment",
      steps: [
        { label: "Verifikasi Draftek & SOP Admin", role: "Admin SOP", name: "Ria Annisa" },
        { label: "Penyusunan & Verifikasi Teknis", role: "HSE Coordinator & Draftek", name: "Andi Safari" },
        { label: "Persetujuan Management Representative", role: "Management Representative HSE", name: "Rendra Rachman" },
        { label: "Pengesahan Director", role: "Director", name: "Hidayat Rahman" },
      ],
    },
    CPI: {
      name: "Continuous Process Improvement",
      steps: [
        { label: "Verifikasi Draftek & SOP Admin", role: "Admin SOP", name: "Ria Annisa" },
        { label: "Penyusunan & Verifikasi Teknis", role: "CPI & IA Reps. Manager", name: "Bardinia Susi E" },
        { label: "Persetujuan Management Representative", role: "General Manager", name: "Rendra Rachman" },
        { label: "Pengesahan Director", role: "Director", name: "Hidayat Rahman" },
      ],
    },
    HR: {
      name: "Human Capital",
      steps: [
        { label: "Verifikasi Draftek & SOP Admin", role: "Admin SOP", name: "Ria Annisa" },
        { label: "Penyusunan & Verifikasi Teknis", role: "HR-GA Supervisor", name: "Muhammad Iqbal" },
        { label: "Persetujuan Human Capital Manager", role: "Human Capital Manager", name: "Rendra Rachman" },
        { label: "Pengesahan Director", role: "Director", name: "Hidayat Rahman" },
      ],
    },
    GA: {
      name: "General Affairs",
      steps: [
        { label: "Verifikasi Draftek & SOP Admin", role: "Admin SOP", name: "Ria Annisa" },
        { label: "Penyusunan & Verifikasi Teknis", role: "GA Supervisor", name: "Muhammad Iqbal" },
        { label: "Persetujuan HC & GA Manager", role: "HC Manager", name: "Rendra Rachman" },
        { label: "Pengesahan Director", role: "Director", name: "Hidayat Rahman" },
      ],
    },
    TECHNICAL: {
      name: "Technical Service",
      steps: [
        { label: "Verifikasi Draftek & SOP Admin", role: "Admin SOP", name: "Ria Annisa" },
        { label: "Penyusunan & Verifikasi Teknis", role: "Technical Leader", name: "M. Abian Husain" },
        { label: "Review Central Service Manager", role: "Central Service Manager", name: "Romy Hidayat" },
        { label: "Persetujuan General Operation Manager", role: "General Operation Manager", name: "Parson Sihaloho" },
        { label: "Pengesahan Director", role: "Director", name: "Hidayat Rahman" },
      ],
    },
    LEGAL: {
      name: "Legal",
      steps: [
        { label: "Verifikasi Draftek & SOP Admin", role: "Admin SOP", name: "Ria Annisa" },
        { label: "Penyusunan & Verifikasi Teknis", role: "Legal Supervisor", name: "Septi Dian Rahmawati" },
        { label: "Persetujuan Head of Legal & ERM", role: "Legal & ERM Manager", name: "Paulus Stupa Gumilang" },
        { label: "Pengesahan Director", role: "Director", name: "Hidayat Rahman" },
      ],
    },
    ERM: {
      name: "Enterprise Risk Management",
      steps: [
        { label: "Verifikasi Draftek & SOP Admin", role: "Admin SOP", name: "Ria Annisa" },
        { label: "Penyusunan & Verifikasi Teknis", role: "Legal & ERM Manager", name: "Paulus Stupa Gumilang" },
        { label: "Pengesahan Director", role: "Director", name: "Hidayat Rahman" },
      ],
    },
    DRM: {
      name: "Disaster & Risk Management",
      steps: [
        { label: "Verifikasi Draftek & SOP Admin", role: "Admin SOP", name: "Ria Annisa" },
        { label: "Penyusunan & Verifikasi Teknis", role: "Legal & ERM Manager", name: "Paulus Stupa Gumilang" },
        { label: "Pengesahan Director", role: "Director", name: "Hidayat Rahman" },
      ],
    },
    SERVICE: {
      name: "Service Operation",
      steps: [
        { label: "Verifikasi Draftek & SOP Admin", role: "Admin SOP", name: "Ria Annisa" },
        { label: "Penyusunan & Verifikasi Teknis", role: "Service Operation SPV", name: "Apriyanto" },
        { label: "Persetujuan Central Services Manager", role: "Central Service Manager", name: "Romy Hidayat" },
      ],
    },
    REPAIR: {
      name: "Repair & Retread",
      steps: [
        { label: "Verifikasi Draftek & SOP Admin", role: "Admin SOP", name: "Ria Annisa" },
        { label: "Penyusunan & Verifikasi Teknis", role: "Leader Repair / Retread", name: "Ary Maulana" },
        { label: "Pengesahan Manager", role: "Central Service Manager", name: "Romy Hidayat" },
      ],
    },
    BIMA: {
      name: "Business Innovation & Marketing",
      steps: [
        { label: "Verifikasi Draftek & SOP Admin", role: "Admin SOP", name: "Ria Annisa" },
        { label: "Penyusunan & Verifikasi Teknis", role: "Business Innovation & Marketing SPV", name: "Arif Maulana Gahfar" },
        { label: "Pengesahan Manager", role: "Finance & Business Partner Manager", name: "Febrian Dani" },
        { label: "Pengesahan Director", role: "Director", name: "Hidayat Rahman" },
      ],
    },
  };

  const selectedWf = workflows[deptCode] || {
    name: deptCode,
    steps: [
      { label: "Verifikasi Draftek & SOP Admin", role: "Admin SOP", name: "Ria Annisa" },
      { label: "Penyusunan & Verifikasi Teknis", role: `${deptCode} Manager`, name: `Manager ${deptCode}` },
      { label: "Persetujuan General Manager", role: "General Manager", name: "Parson Sihaloho" },
      { label: "Pengesahan Director", role: "Director", name: "Hidayat Rahman" },
    ],
  };

  return {
    departmentCode: deptCode,
    departmentName: selectedWf.name,
    steps: selectedWf.steps.map((st, idx) => ({
      stepNumber: idx + 1,
      label: st.label,
      role: st.role,
      name: st.name,
    })),
  };
}

export function getDepartmentSignatories(
  departmentCodeRaw?: string | null,
  requesterNameRaw?: string | null,
  requesterDeptRaw?: string | null
) {
  const wf = getDepartmentWorkflowSteps(departmentCodeRaw, requesterNameRaw, requesterDeptRaw);
  return {
    creatorName: requesterNameRaw || "Pembuat Dokumen / PIC",
    creatorTitle: requesterDeptRaw || "Pembuat Dokumen / PIC",
    compilerName: wf.steps[0]?.name || "Ria Annisa",
    compilerTitle: wf.steps[0]?.role || "Admin SOP",
    verifierName: wf.steps[1]?.name || "Approver",
    verifierTitle: wf.steps[1]?.role || "Supervisor / Manager",
    acknowledgerName: wf.steps[2]?.name || "Approver",
    acknowledgerTitle: wf.steps[2]?.role || "Manager",
    approverName: wf.steps[3]?.name || "Director",
    approverTitle: wf.steps[3]?.role || "Director",
  };
}

export function SopWinApprovalWorkspace({
  initialRequests = [],
}: SopWinApprovalWorkspaceProps) {
  const [requests, setRequests] = useState<SopWinRequestItem[]>(initialRequests);
  const [loading, setLoading] = useState(false);
  const [downloadingReqId, setDownloadingReqId] = useState<number | null>(null);

  // Selection & Batch Action State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedRequestTypes, setSelectedRequestTypes] = useState<string[]>([]);

  // Single Review Modal State
  const [activeReviewReq, setActiveReviewReq] = useState<SopWinRequestItem | null>(null);
  const [expiryDays, setExpiryDays] = useState<number>(3);
  const [canDownload, setCanDownload] = useState<boolean>(true);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [remarks, setRemarks] = useState<string>("");
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  // Batch Review Modal State
  const [isBatchReviewOpen, setIsBatchReviewOpen] = useState(false);
  const [batchReviewIndex, setBatchReviewIndex] = useState(0);
  const [isBatchActionRunning, setIsBatchActionRunning] = useState(false);
  const [batchRemarks, setBatchRemarks] = useState<Record<number, string>>({});

  // Attachment Preview Modal State
  const [previewAttachmentUrl, setPreviewAttachmentUrl] = useState<string | null>(null);

  // Access Settings Modal State (Ria Annisa / Quality Management)
  const [settingsModalReq, setSettingsModalReq] = useState<SopWinRequestItem | null>(null);

  const formatAttachmentUrl = (rawUrl?: string | null) => {
    if (!rawUrl) return "";
    if (rawUrl.startsWith("/api/uploads/")) return rawUrl;
    if (rawUrl.startsWith("/uploads/")) return `/api/uploads${rawUrl}`;
    if (rawUrl.includes("is3.cloudhost.id/onechitra/")) {
      return `/api/uploads/${rawUrl.split("is3.cloudhost.id/onechitra/")[1]}`;
    }
    if (rawUrl.includes("vision.chitraparatama.com/api/v1/uploads/")) {
      return `/api/uploads/upload/${rawUrl.split("/").pop()}`;
    }
    return rawUrl;
  };

  const handleDownloadAttachment = async (rawUrl: string, fileName?: string) => {
    const resolvedUrl = formatAttachmentUrl(rawUrl);
    if (!resolvedUrl) {
      toast.error("File lampiran tidak valid.");
      return;
    }
    try {
      toast.info("Mengunduh lampiran penunjang...");
      const res = await fetch(resolvedUrl);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName || resolvedUrl.split("/").pop() || "Lampiran_Penunjang.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        toast.success("File lampiran penunjang berhasil diunduh.");
      } else {
        window.open(resolvedUrl, "_blank");
      }
    } catch (err) {
      window.open(resolvedUrl, "_blank");
    }
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await getSopWinDocumentRequestsAction();
      if (res.success && res.requests) {
        setRequests(res.requests as SopWinRequestItem[]);
      }
    } catch (error) {
      console.error("[SopWinApprovalWorkspace] refresh error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Department Filter Options
  const departmentFilterOptions = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.requesterDepartment) set.add(r.requesterDepartment);
      if (r.ownDepartment) set.add(r.ownDepartment);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [requests]);

  const statusFilterOptions = [
    "Step 1 (Quality Management)",
    "Step 2 (Pembuat Dokumen)",
    "Disetujui Lengkap",
    "Dikembalikan",
    "Ditolak",
  ];

  const typeFilterOptions = ["SOP", "WIN", "POL"];
  const requestTypeOptions = ["Soft Copy", "Hard Copy"];

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedDepartments.length > 0 ||
    selectedStatuses.length > 0 ||
    selectedTypes.length > 0 ||
    selectedRequestTypes.length > 0;

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDepartments([]);
    setSelectedStatuses([]);
    setSelectedTypes([]);
    setSelectedRequestTypes([]);
  };

  // Filtered Rows
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSearch =
          req.requestNumber.toLowerCase().includes(q) ||
          req.requesterName.toLowerCase().includes(q) ||
          req.requestedDocTitleAndNumber.toLowerCase().includes(q) ||
          (req.procedureName || "").toLowerCase().includes(q) ||
          (req.requesterDepartment || "").toLowerCase().includes(q) ||
          (req.ownDepartment || "").toLowerCase().includes(q);

        if (!matchSearch) return false;
      }

      if (selectedDepartments.length > 0) {
        const deptMatch =
          selectedDepartments.includes(req.requesterDepartment) ||
          selectedDepartments.includes(req.ownDepartment);
        if (!deptMatch) return false;
      }

      if (selectedStatuses.length > 0) {
        const match = selectedStatuses.some((st) => {
          if (st.includes("Step 1")) return req.status === "pending_ria";
          if (st.includes("Step 2")) return req.status === "pending_creator" || req.status === "pending_owner" || req.status === "pending_bardynia";
          if (st.includes("Disetujui")) return req.status === "approved";
          if (st.includes("Dikembalikan")) return req.status === "reverted";
          if (st.includes("Ditolak")) return req.status === "rejected";
          return true;
        });
        if (!match) return false;
      }

      if (selectedTypes.length > 0) {
        if (!selectedTypes.includes(req.requestedDocType)) return false;
      }

      if (selectedRequestTypes.length > 0) {
        const match = selectedRequestTypes.some((rt) => {
          if (rt.includes("Soft")) return req.requestType === "softcopy";
          if (rt.includes("Hard")) return req.requestType === "hardcopy";
          return true;
        });
        if (!match) return false;
      }

      return true;
    });
  }, [requests, searchQuery, selectedDepartments, selectedStatuses, selectedTypes, selectedRequestTypes]);

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRequests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRequests.map((r) => r.id));
    }
  };

  const toggleSelectRow = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Selected Batch Rows
  const selectedBatchRows = useMemo(
    () => requests.filter((r) => selectedIds.includes(r.id)),
    [requests, selectedIds]
  );
  const currentBatchDoc = selectedBatchRows[batchReviewIndex] || selectedBatchRows[0] || null;

  const [isMissingSignatureDialogOpen, setIsMissingSignatureDialogOpen] = useState(false);
  const [userSignatureUrl, setUserSignatureUrl] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hero_user_signature") || null;
    }
    return null;
  });

  useEffect(() => {
    getUserSignatureAction().then((res) => {
      if (res.success && res.signatureDataUrl) {
        setUserSignatureUrl(res.signatureDataUrl);
        if (typeof window !== "undefined") {
          localStorage.setItem("hero_user_signature", res.signatureDataUrl);
        }
      }
    });
  }, []);

  // Single Review Modal Open
  const openReviewModal = (req: SopWinRequestItem) => {
    setActiveReviewReq(req);
    setExpiryDays(req.expiryDays || 3);
    setCanDownload(req.canDownload !== false);
    setRemarks("");
  };

  const handleSaveAccessSettings = async () => {
    if (!activeReviewReq) return;
    setIsSavingSettings(true);
    try {
      const res = await updateSopWinAccessSettingsAction({
        requestId: activeReviewReq.id,
        expiryDays: expiryDays || 3,
        canDownload,
      });

      if (res.success) {
        toast.success(res.message || "Pengaturan akses dokumen berhasil disimpan.");
        setRequests((prev) =>
          prev.map((r) =>
            r.id === activeReviewReq.id
              ? { ...r, expiryDays: expiryDays || 3, canDownload }
              : r
          )
        );
        setActiveReviewReq((prev) => (prev ? { ...prev, expiryDays: expiryDays || 3, canDownload } : null));
      } else {
        toast.error(res.error || "Gagal menyimpan pengaturan akses.");
      }
    } catch (err: any) {
      toast.error("Terjadi kesalahan: " + (err.message || err));
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Single Action Handler
  const handleReviewAction = async (action: "approve" | "revert" | "reject") => {
    if (!activeReviewReq) return;

    if (action === "approve" && !userSignatureUrl) {
      setIsMissingSignatureDialogOpen(true);
      toast.warning("Anda belum mendaftarkan tanda tangan digital. Silakan daftarkan tanda tangan Anda terlebih dahulu.");
      return;
    }

    setSubmittingAction(action);
    try {
      const res = await reviewSopWinDocumentRequestAction({
        requestId: activeReviewReq.id,
        action,
        remarks: remarks.trim() || undefined,
        expiryDays: action === "approve" ? expiryDays : undefined,
      });

      if (res.success) {
        toast.success(res.message);
        setActiveReviewReq(null);
        await refreshData();
      } else {
        toast.error(res.error || "Gagal memproses tindakan.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan sistem.");
    } finally {
      setSubmittingAction(null);
    }
  };

  // Batch Review Modal Handler
  const handleOpenBatchReview = () => {
    if (selectedIds.length === 0) {
      toast.error("Pilih minimal satu permohonan untuk direview.");
      return;
    }
    setBatchReviewIndex(0);
    setIsBatchReviewOpen(true);
  };

  // Batch Single Approve Step
  const handleBatchApproveCurrent = async () => {
    if (!currentBatchDoc) return;
    setIsBatchActionRunning(true);
    try {
      const currentRemark = batchRemarks[currentBatchDoc.id] || "";
      const res = await reviewSopWinDocumentRequestAction({
        requestId: currentBatchDoc.id,
        action: "approve",
        remarks: currentRemark || "Batch Approved",
        expiryDays: currentBatchDoc.expiryDays || 3,
      });

      if (res.success) {
        toast.success(`Permohonan ${currentBatchDoc.requestNumber} berhasil disetujui.`);
        const docId = currentBatchDoc.id;
        const remainingIds = selectedIds.filter((id) => id !== docId);
        setSelectedIds(remainingIds);
        const remainingRows = selectedBatchRows.filter((r) => r.id !== docId);
        if (remainingRows.length > 0) {
          const nextIndex = Math.min(batchReviewIndex, remainingRows.length - 1);
          setBatchReviewIndex(Math.max(0, nextIndex));
          setIsBatchReviewOpen(true);
          await refreshData();
        } else {
          toast.success("Semua permohonan dalam antrian batch telah selesai direview.");
          setIsBatchReviewOpen(false);
          setSelectedIds([]);
          await refreshData();
        }
      } else {
        toast.error(res.error || "Gagal menyetujui permohonan.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan sistem.");
    } finally {
      setIsBatchActionRunning(false);
    }
  };

  // Direct Hardcopy PDF / ZIP Download Handler
  const handleDownloadHardcopy = async (req: SopWinRequestItem) => {
    if (downloadingReqId === req.id) return;
    setDownloadingReqId(req.id);
    try {
      let docItems: Array<{ id: number; title: string; documentType: string; pdfUrl: string | null }> = [];
      const detailRes = await getSopWinDocumentRequestDetailAction(req.accessToken);

      if (detailRes.success && detailRes.documentItems && detailRes.documentItems.length > 0) {
        docItems = detailRes.documentItems;
      } else {
        docItems = [
          {
            id: 1,
            title: req.procedureName || req.requestedDocTitleAndNumber,
            documentType: req.requestedDocType,
            pdfUrl: req.fileAttachmentUrl,
          },
        ];
      }

      if (docItems.length <= 1) {
        const rawPdfUrl = docItems[0]?.pdfUrl || req.fileAttachmentUrl;
        const pdfUrl = rawPdfUrl
          ? rawPdfUrl.startsWith("/api/uploads/")
            ? rawPdfUrl
            : rawPdfUrl.includes("is3.cloudhost.id/onechitra/")
            ? `/api/uploads/${rawPdfUrl.split("is3.cloudhost.id/onechitra/")[1]}`
            : rawPdfUrl.includes("vision.chitraparatama.com/api/v1/uploads/")
            ? `/api/uploads/upload/${rawPdfUrl.split("/").pop()}`
            : rawPdfUrl
          : null;

        if (pdfUrl) {
          const res = await fetch(pdfUrl);
          if (res.ok) {
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = `[${req.requestedDocType}]_${req.requestNumber}_Dokumen_Resmi.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
            toast.success("Dokumen PDF berhasil diunduh.");
          } else {
            window.open(pdfUrl, "_blank");
          }
        } else {
          toast.error("File PDF dokumen belum tersedia.");
        }
      } else {
        toast.info("Mengemas seluruh dokumen PDF ke berkas ZIP...");
        const filesToZip: Array<{ name: string; blob: Blob }> = [];

        for (let i = 0; i < docItems.length; i++) {
          const doc = docItems[i];
          const itemUrl = doc.pdfUrl || req.fileAttachmentUrl;
          const resolvedUrl = itemUrl
            ? itemUrl.startsWith("/api/uploads/")
              ? itemUrl
              : itemUrl.includes("is3.cloudhost.id/onechitra/")
              ? `/api/uploads/${itemUrl.split("is3.cloudhost.id/onechitra/")[1]}`
              : itemUrl.includes("vision.chitraparatama.com/api/v1/uploads/")
              ? `/api/uploads/upload/${itemUrl.split("/").pop()}`
              : itemUrl
            : null;

          if (!resolvedUrl) continue;
          try {
            const res = await fetch(resolvedUrl);
            if (res.ok) {
              const blob = await res.blob();
              const cleanTitle = doc.title.replace(/[\\/:*?"<>|]/g, "_");
              filesToZip.push({
                name: `${i + 1}. [${doc.documentType}] ${cleanTitle}.pdf`,
                blob,
              });
            }
          } catch (err) {
            console.error("ZIP item fetch error:", err);
          }
        }

        if (filesToZip.length > 0) {
          await downloadFilesAsZip(
            filesToZip,
            `Dokumen_Hardcopy_${req.requestNumber}.zip`
          );
          toast.success("Paket berkas ZIP berhasil diunduh.");
        } else {
          toast.error("Gagal mengunduh dokumen PDF.");
        }
      }
    } catch (err: any) {
      console.error("Hardcopy Download Error:", err);
      toast.error("Gagal mengunduh dokumen.");
    } finally {
      setDownloadingReqId(null);
    }
  };

  // Export Selected or All Rows to Excel (XLSX)
  const handleExportExcel = () => {
    const targetRows = selectedIds.length > 0 ? selectedBatchRows : filteredRequests;
    if (targetRows.length === 0) {
      toast.error("Tidak ada data untuk diexport.");
      return;
    }

    const dataToExport = targetRows.map((r, idx) => ({
      No: idx + 1,
      "No. Request": r.requestNumber,
      "Nama Pemohon": r.requesterName,
      "Departemen Pemohon": r.requesterDepartment,
      "Departemen Prosedur": r.ownDepartment || "-",
      "Judul & Nomor Dokumen": r.requestedDocTitleAndNumber,
      "Tipe Dokumen": r.requestedDocType,
      "Jenis Akses": r.requestType === "softcopy" ? "Soft Copy" : "Hard Copy",
      "Status Request": r.status,
      "Tanggal Pengajuan": r.requestDate,
      "Alasan Permintaan": r.requestReason,
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Persetujuan SOP WIN");
    XLSX.writeFile(wb, `Persetujuan_SOP_WIN_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`${targetRows.length} data permohonan berhasil di-export ke Excel.`);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending_ria":
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 font-semibold text-[10px]">Step 1 (Quality)</Badge>;
      case "pending_creator":
      case "pending_owner":
      case "pending_bardynia":
        return <Badge variant="outline" className="bg-sky-50 text-sky-800 border-sky-200 font-semibold text-[10px]">Step 2 (Pembuat Dokumen)</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold text-[10px]">Disetujui</Badge>;
      case "reverted":
        return <Badge variant="outline" className="bg-orange-50 text-orange-800 border-orange-200 font-semibold text-[10px]">Dikembalikan</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-200 font-semibold text-[10px]">Ditolak</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* ── 1. Header Banner Workspace ── */}
      <HcWorkspaceBanner
        badge="SOP / WIN APPROVAL"
        title="Workbench Approval & Verifikasi Permintaan Dokumen SOP/WIN"
        description="Sistem Otomasi Persetujuan Berjenjang (Ria Annisa Putri -> Pembuat Dokumen -> Access Activation)"
      />

      {/* ── 2. Command Toolbar & Filter Bar ── */}
      <Card className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs overflow-hidden">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Cari nomor permohonan, nama pemohon, atau judul dokumen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <MultiSelectFilterDropdown
                title="DEPARTEMEN"
                options={departmentFilterOptions}
                selectedValues={selectedDepartments}
                onSelectionChange={setSelectedDepartments}
              />

              <MultiSelectFilterDropdown
                title="STATUS"
                options={statusFilterOptions}
                selectedValues={selectedStatuses}
                onSelectionChange={setSelectedStatuses}
              />

              <MultiSelectFilterDropdown
                title="TIPE DOKUMEN"
                options={typeFilterOptions}
                selectedValues={selectedTypes}
                onSelectionChange={setSelectedTypes}
              />

              <MultiSelectFilterDropdown
                title="JENIS AKSES"
                options={requestTypeOptions}
                selectedValues={selectedRequestTypes}
                onSelectionChange={setSelectedRequestTypes}
              />

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 px-2.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg gap-1 font-medium"
                >
                  <RotateCcw className="size-3.5" />
                  Riset Filter
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={loading}
                className="h-8 px-3 text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl gap-1.5 font-medium"
              >
                <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 4. Main Minimalist Table Shell ── */}
      <MinimalTableShell
        label="Permintaan Dokumen"
        title={`Daftar Permintaan Dokumen (${filteredRequests.length})`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              className="h-8 px-3 text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl gap-1.5 font-medium"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              EXCEL
            </Button>
          </div>
        }
      >
        {/* Sticky Multi-Select Action Bar (Parity with Daily Activity Approval) */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-indigo-50/90 border border-indigo-200/80 rounded-xl px-4 py-2.5 mb-3 shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCheck className="size-4 text-indigo-600" />
              <span className="text-xs font-semibold text-indigo-900">
                {selectedIds.length} dari {filteredRequests.length} permohonan dokumen terpilih
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleOpenBatchReview}
                className="h-8 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white uppercase shadow-sm hover:bg-indigo-700 gap-1.5"
              >
                <CheckCheck className="size-3.5" />
                REVIEW / SETUJUI TERPILIH
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleExportExcel}
                className="h-8 rounded-lg border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-800 uppercase shadow-sm hover:bg-emerald-50 gap-1.5"
              >
                <FileSpreadsheet className="size-3.5 text-emerald-600" />
                EXCEL
              </Button>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds([])}
                className="h-8 text-xs font-bold text-indigo-700 uppercase hover:bg-indigo-100/70"
              >
                BATAL
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <button type="button" onClick={toggleSelectAll} className="cursor-pointer">
                    {selectedIds.length === filteredRequests.length && filteredRequests.length > 0 ? (
                      <CheckSquare className="size-4 text-slate-900" />
                    ) : (
                      <Square className="size-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3">NO. PERMOHONAN</th>
                <th className="py-3 px-3">PEMOHON & DEPARTEMEN</th>
                <th className="py-3 px-3">PROSEDUR & TIPE DOKUMEN</th>
                <th className="py-3 px-3 text-center">JENIS AKSES</th>
                <th className="py-3 px-3 text-center">STATUS APPROVAL</th>
                <th className="py-3 px-3 text-right">TINDAKAN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada data permohonan dokumen yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const isSelected = selectedIds.includes(req.id);
                  return (
                    <tr
                      key={req.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? "bg-slate-50" : ""
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => toggleSelectRow(req.id, e)}
                          className="cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="size-4 text-slate-900" />
                          ) : (
                            <Square className="size-4 text-slate-400" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-3 space-y-0.5">
                        <span className="font-bold text-slate-900 block font-mono">
                          {req.requestNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {req.requestDate || new Date(req.createdAt).toLocaleDateString("id-ID")}
                        </span>
                      </td>

                      <td className="py-3 px-3 space-y-0.5">
                        <span className="font-semibold text-slate-900 block">
                          {req.requesterName}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Dept: {req.requesterDepartment || "Internal HERO"}
                        </span>
                      </td>

                      <td className="py-3 px-3 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px] font-mono font-bold bg-slate-100 text-slate-800 border-slate-200">
                            {req.requestedDocType}
                          </Badge>
                          <span className="font-semibold text-slate-800 truncate max-w-xs block">
                            {req.procedureName || req.requestedDocTitleAndNumber}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                          {req.requestedDocTitleAndNumber}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            req.requestType === "softcopy"
                              ? "bg-slate-100 text-slate-700 border border-slate-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {req.requestType === "softcopy" ? "Soft Copy" : "Hard Copy"}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center space-y-1">
                        {renderStatusBadge(req.status)}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openReviewModal(req)}
                            className="h-7 px-2.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white text-[11px] font-semibold gap-1 shadow-2xs shrink-0"
                          >
                            <Eye className="size-3" />
                            {req.status === "approved" ? "Tinjau" : "Tinjau dan Approve"}
                          </Button>

                          {/* Gear Settings Button (Ria Annisa / Quality Management Access Settings) */}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setSettingsModalReq(req)}
                            className="h-7 w-7 p-0 rounded-lg bg-blue-50 hover:bg-blue-100 border-blue-200 text-[#003461] shrink-0"
                            title="Pengaturan Akses Dokumen (Masa Aktif & Izin Unduh)"
                          >
                            <Settings className="size-3.5" />
                          </Button>

                          {/* Hardcopy Link Icon Button */}
                          {req.requestType === "hardcopy" && req.accessToken && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={downloadingReqId === req.id}
                              onClick={() => handleDownloadHardcopy(req)}
                              className="h-7 w-7 p-0 rounded-lg bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shrink-0"
                              title="Langsung Unduh Dokumen (PDF/ZIP)"
                            >
                              <Download className={`size-3.5 ${downloadingReqId === req.id ? "animate-bounce" : ""}`} />
                            </Button>
                          )}

                          {/* Public Portal Link Icon Button */}
                          {req.accessToken && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              asChild
                              className="h-7 px-2 text-[10px] font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-900 shrink-0 gap-1"
                              title="Buka Portal Akses Dokumen (Public Link)"
                            >
                              <a href={`/sop-win/request/${req.accessToken}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="size-3 text-indigo-700" />
                                <span>PORTAL</span>
                              </a>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </MinimalTableShell>

      {/* ── 5. Single Review & Approval Modal ── */}
      {/* ── 5. Single Review & Approval Modal (Full-Screen PDF Letterhead & Workbench Layout) ── */}
      {activeReviewReq && (
        <Dialog open={!!activeReviewReq} onOpenChange={() => setActiveReviewReq(null)}>
          <DialogContent className="max-w-[95vw] w-[1400px] h-[92vh] max-h-[92vh] rounded-2xl p-0 overflow-hidden bg-slate-100 flex flex-col border border-slate-300 shadow-2xl">
            {/* Top Bar Header */}
            <div className="h-14 bg-[#003461] text-white px-5 flex items-center justify-between shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-blue-900/80 text-white border-blue-400 font-bold text-xs px-2.5 py-1">
                  Tinjau & Pengaturan Akses Dokumen • {activeReviewReq.requestNumber}
                </Badge>
                {renderStatusBadge(activeReviewReq.status)}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    const el = document.getElementById("sopwin-active-review-pdf-sheet");
                    if (el) {
                      toast.loading("Mengekspor PDF Dokumen...", { id: "pdf-export" });
                      try {
                        await downloadElementAsPdf(el, `Permintaan_Dokumen_${activeReviewReq.requestNumber}.pdf`);
                        toast.success("PDF berhasil diunduh!", { id: "pdf-export" });
                      } catch (err) {
                        console.error(err);
                        toast.error("Gagal mengunduh PDF", { id: "pdf-export" });
                      }
                    }
                  }}
                  className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5"
                >
                  <Download className="size-3.5" /> UNDUH PDF
                </Button>

                <button
                  type="button"
                  onClick={() => setActiveReviewReq(null)}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Split Body Layout */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* Left Column: Live Letterhead PDF Preview Paper Sheet */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center items-start bg-slate-200/60 border-r border-slate-200/80">
                <div
                  id="sopwin-active-review-pdf-sheet"
                  className="relative mx-auto shrink-0 overflow-hidden bg-white shadow-xl border border-slate-300 w-[210mm] min-h-[297mm] rounded-xs transition-all text-slate-900"
                  style={{
                    backgroundImage: 'url(/ChitraParatama_Stationery_Letterhead_jkt.jpg)',
                    backgroundSize: '100% 100%',
                  }}
                >
                  <div
                    className="relative z-10 text-[8.5pt] font-sans leading-tight space-y-4"
                    style={{
                      paddingTop: '36mm',
                      paddingBottom: '30mm',
                      paddingLeft: '20mm',
                      paddingRight: '20mm',
                    }}
                  >
                    {/* Header Title (Matching Daily Activity Format Exactly) */}
                    <div className="text-center mb-4">
                      <h1 className="font-bold text-[11pt] uppercase text-black mb-0.5 tracking-wide">
                        PT. CHITRA PARATAMA
                      </h1>
                      <h2 className="font-bold text-[12pt] uppercase text-black tracking-wide">
                        PERMOHONAN AKSES DOKUMEN SOP / WIN / POL
                      </h2>
                    </div>

                    {/* Table 1: Informasi Pemohon Dokumen */}
                    <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1.5 text-[8.5pt]">
                      <tbody>
                        <tr>
                          <td colSpan={2} className="font-bold bg-slate-100 text-black py-1 uppercase">
                            1. INFORMASI PEMOHON DOKUMEN ({activeReviewReq.isExternal ? "PIHAK EKSTERNAL" : "PIHAK INTERNAL"})
                          </td>
                        </tr>
                        <tr>
                          <td className="w-1/2">
                            Nama Pemohon: <strong>{activeReviewReq.requesterName || '—'}</strong>
                          </td>
                          <td className="w-1/2">
                            No. Registrasi: <strong className="font-mono text-indigo-900">{activeReviewReq.requestNumber}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            Departemen / Section: <strong>{activeReviewReq.requesterDepartment || '—'}</strong>
                          </td>
                          <td>
                            Tanggal Pengajuan: <strong>{activeReviewReq.requestDate ? new Date(activeReviewReq.requestDate).toLocaleDateString('id-ID') : "-"}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            Prosedur Yang Diminta: <strong>{activeReviewReq.procedureName || '—'}</strong>
                          </td>
                          <td>
                            Departemen Sendiri: <strong>{activeReviewReq.ownDepartment || activeReviewReq.requesterDepartment || '—'}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            Jenis Dokumen: <strong className="font-mono font-bold">[{ activeReviewReq.requestedDocType || 'SOP' }]</strong>
                          </td>
                          <td>
                            Apakah Pemilik Proses?: <strong>{activeReviewReq.isProcessOwner ? 'Ya' : 'Tidak'}</strong>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            Jenis Akses: <strong className="uppercase">{activeReviewReq.requestType === "softcopy" ? "Soft Copy (PDF Watermark)" : "Hard Copy (Cetak Fisik)"}</strong>
                          </td>
                          <td>
                            Masa Berlaku Akses: <strong>{activeReviewReq.expiryDays || 3} Hari Kerja</strong>
                          </td>
                        </tr>
                        {activeReviewReq.isExternal && (
                          <tr>
                            <td>
                              Instansi / Perusahaan: <strong>{activeReviewReq.externalCompany || '—'}</strong>
                            </td>
                            <td>
                              Nama Contact Person: <strong>{activeReviewReq.externalName || '—'}</strong>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {(() => {
                      const deptRaw = activeReviewReq.ownDepartment || activeReviewReq.requesterDepartment || "CPI";
                      const dbApprovals = (activeReviewReq as any).approvals;
                      const defaultWf = getDepartmentWorkflowSteps(
                        deptRaw,
                        activeReviewReq.requesterName,
                        activeReviewReq.requesterDepartment,
                        activeReviewReq.requestedDocTitleAndNumber
                      );

                      const wfSteps = (Array.isArray(dbApprovals) && dbApprovals.length > 0)
                        ? dbApprovals.map((a: any) => ({
                            stepNumber: a.stepOrder,
                            role: a.stepLabel,
                            name: a.approverName || "Approver",
                          }))
                        : defaultWf.steps;

                      const wf = {
                        departmentCode: defaultWf.departmentCode,
                        departmentName: defaultWf.departmentName,
                        steps: wfSteps,
                      };

                      const gridColsClass =
                        wf.steps.length === 3
                          ? "grid-cols-3"
                          : wf.steps.length === 4
                          ? "grid-cols-2"
                          : wf.steps.length === 5
                          ? "grid-cols-3"
                          : "grid-cols-2";

                      const activeStepIdx = wf.steps.findIndex((s, i) => {
                        const stepOrder = i + 1;
                        const approvalRecord = (activeReviewReq as any).approvals?.find((a: any) => a.stepOrder === stepOrder);
                        if (approvalRecord) return approvalRecord.status === "pending";
                        if (i === 0 && (activeReviewReq.status === "pending_ria" || (activeReviewReq.status as string) === "submitted")) return true;
                        if (i === 1 && (activeReviewReq.status === "pending_creator" || activeReviewReq.status === "pending_owner")) return true;
                        if (i === 2 && activeReviewReq.status === "pending_bardynia") return true;
                        return false;
                      });

                      const currentActiveIdx = activeStepIdx >= 0 ? activeStepIdx : (activeReviewReq.status === "pending_ria" || (activeReviewReq.status as string) === "submitted" ? 0 : -1);

                      return (
                        <>
                          <table className="w-full border-collapse border border-black mb-3 [&_td]:border [&_td]:border-black [&_td]:px-2 [&_td]:py-1.5 text-[8.5pt]">
                            <tbody>
                              <tr>
                                <td colSpan={2} className="font-bold bg-slate-100 text-black py-1 uppercase">
                                  2. RINCIAN DOKUMEN DAN CATATAN APPROVAL
                                </td>
                              </tr>
                              <tr>
                                <td colSpan={2}>
                                  Jumlah Prosedur Yang Diminta: <strong>{activeReviewReq.requestedDocCount || 1} Prosedur</strong>
                                </td>
                              </tr>
                              <tr>
                                <td colSpan={2} className="bg-white p-2">
                                  <span className="font-bold block mb-1">Judul & Nomor Prosedur / Dokumen:</span>
                                  <div className="font-mono text-[8.5pt] bg-amber-50/80 p-2 border border-black rounded-xs font-semibold whitespace-pre-wrap leading-relaxed">
                                    {activeReviewReq.requestedDocTitleAndNumber}
                                  </div>
                                  {activeReviewReq.requestReason && (
                                    <div className="mt-2 text-slate-800 italic">
                                      <span className="font-bold not-italic text-slate-900 block text-[7.5pt]">ALASAN PERMINTAAN:</span>
                                      "{activeReviewReq.requestReason}"
                                    </div>
                                  )}
                                </td>
                              </tr>

                              {/* Embedded Catatan Approval Table */}
                              <tr>
                                <td colSpan={2} className="bg-white p-2">
                                  <div className="font-bold mb-1.5 text-[8.5pt]">Catatan Approval (Opsional)</div>
                                  <table className="w-full border-collapse border border-black [&_td]:border [&_td]:border-black [&_td]:px-1.5 [&_td]:py-1 [&_th]:border [&_th]:border-black [&_th]:px-1.5 [&_th]:py-1 text-[8pt]" style={{ tableLayout: 'fixed' }}>
                                    <thead>
                                      <tr className="bg-white font-bold text-center">
                                        <th style={{ width: '6%' }}>#</th>
                                        <th className="text-left" style={{ width: '24%' }}>Tahap</th>
                                        <th className="text-left" style={{ width: '26%' }}>Approver</th>
                                        <th style={{ width: '14%' }}>Status</th>
                                        <th style={{ width: '15%' }}>Waktu</th>
                                        <th className="text-left" style={{ width: '15%' }}>Catatan</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {wf.steps.map((step, idx) => {
                                        const stepOrder = idx + 1;
                                        const approvalRecord = (activeReviewReq as any).approvals?.find((a: any) => a.stepOrder === stepOrder);

                                        let statusText = "Pending";
                                        let statusClass = "text-amber-700 font-bold";
                                        let signedTime = "—";

                                        if (activeReviewReq.status === "approved") {
                                          statusText = "Approved";
                                          statusClass = "text-emerald-700 font-bold";
                                          signedTime = activeReviewReq.updatedAt ? new Date(activeReviewReq.updatedAt).toLocaleDateString('id-ID') : "—";
                                        } else if (idx === 0) {
                                          const isStep1Approved = Boolean(
                                            activeReviewReq.adminApprovedAt ||
                                            approvalRecord?.status === "approved" ||
                                            activeReviewReq.status === "pending_creator" ||
                                            activeReviewReq.status === "pending_owner" ||
                                            activeReviewReq.status === "pending_bardynia" ||
                                            (activeReviewReq.status as string) === "approved_by_ria" ||
                                            (activeReviewReq.status as string) === "pending_manager" ||
                                            (activeReviewReq.status as string) === "pending_director"
                                          );
                                          if (isStep1Approved) {
                                            statusText = "Approved";
                                            statusClass = "text-emerald-700 font-bold";
                                            signedTime = activeReviewReq.adminApprovedAt ? new Date(activeReviewReq.adminApprovedAt).toLocaleDateString('id-ID') : "—";
                                          } else {
                                            statusText = "Submitted";
                                          }
                                        } else if (approvalRecord) {
                                          if (approvalRecord.status === "approved") {
                                            statusText = "Approved";
                                            statusClass = "text-emerald-700 font-bold";
                                            signedTime = (approvalRecord as any).updatedAt ? new Date((approvalRecord as any).updatedAt).toLocaleDateString('id-ID') : "—";
                                          }
                                        }

                                        const rawStepRemark = (idx === currentActiveIdx && remarks.trim())
                                          ? remarks.trim()
                                          : (approvalRecord?.remarks || (idx === 0 ? activeReviewReq.remarks : (step as any).remarks) || "");

                                        const displayStepRemark =
                                          rawStepRemark &&
                                          rawStepRemark !== "undefined" &&
                                          rawStepRemark !== "Proses approve via Inbox Approval" &&
                                          rawStepRemark.trim() !== ""
                                            ? rawStepRemark.trim()
                                            : "-";

                                        return (
                                          <tr key={idx}>
                                            <td className="text-center">{step.stepNumber}</td>
                                            <td className="text-left font-medium">{step.role}</td>
                                            <td className="text-left font-medium">{step.name}</td>
                                            <td className={`text-center capitalize ${statusClass}`}>{statusText}</td>
                                            <td className="text-center text-[7pt]">{signedTime}</td>
                                            <td className="italic text-slate-600 text-[7.5pt] break-words whitespace-normal leading-tight text-center">
                                              {displayStepRemark}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Section 3: Dynamic Department Workflow Signatories */}
                          <div>
                            <div className="font-bold mb-3 text-[8.5pt]">Signatories</div>
                            <div className={`grid ${gridColsClass} gap-x-6 gap-y-4 mb-4`}>
                              {wf.steps.map((step, idx) => {
                                const stepOrder = idx + 1;
                                const approvalRecord = (activeReviewReq as any).approvals?.find((a: any) => a.stepOrder === stepOrder);

                                let isSigned = false;
                                if (approvalRecord?.status === "approved") {
                                  isSigned = true;
                                } else if (idx === 0) {
                                  isSigned = Boolean(
                                    ((activeReviewReq as any).adminApprovedAt || ((activeReviewReq as any).status as string) === "approved_by_ria") &&
                                    approvalRecord?.status === "approved"
                                  );
                                }

                                const rawSigUrl = isSigned
                                  ? (approvalRecord?.signatureDataUrl ||
                                     (idx === 0 ? ((activeReviewReq as any).adminSignatureUrl || (activeReviewReq as any).signatureUrl) : null) ||
                                     (step as any).signatureDataUrl)
                                  : null;

                                const isValidImageSig = Boolean(
                                  rawSigUrl &&
                                  typeof rawSigUrl === "string" &&
                                  (rawSigUrl.startsWith("data:image/") || rawSigUrl.startsWith("http://") || rawSigUrl.startsWith("https://") || rawSigUrl.startsWith("/api/uploads/") || rawSigUrl.startsWith("/uploads/"))
                                );

                                return (
                                  <div key={idx}>
                                    <div className="text-[7pt] text-slate-500 font-medium mb-1">
                                      {step.role}
                                    </div>
                                    <div className="h-14 flex items-end">
                                      {isSigned ? (
                                        isValidImageSig ? (
                                          <img src={rawSigUrl} alt="TTD" className="h-10 object-contain" />
                                        ) : (
                                          <span className="text-emerald-700 font-serif italic font-bold text-[9pt]">✓ Disetujui ({step.name})</span>
                                        )
                                      ) : activeReviewReq.status === "reverted" ? (
                                        <span className="text-amber-700 font-bold text-[8pt]">↺ Diminta Revisi</span>
                                      ) : activeReviewReq.status === "rejected" ? (
                                        <span className="text-rose-700 font-bold text-[8pt]">✗ Ditolak</span>
                                      ) : (
                                        <span className="text-slate-400 italic text-[7.5pt]">(Belum Disetujui)</span>
                                      )}
                                    </div>
                                    <div className="mb-0.5 border-b border-slate-400 font-bold text-[8.5pt]" style={{ width: '80%' }}>
                                      {step.name}
                                    </div>
                                    <div className="text-[7pt] text-slate-600 font-medium">{step.role}</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Column: Reviewer Action Sidebar */}
              <div className="w-full lg:w-96 shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto text-slate-800 space-y-4">
                <div className="space-y-4">
                  {/* Card 1: Summary Info */}
                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs space-y-2">
                    <p className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-1.5">Informasi Permohonan</p>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p><span className="text-slate-400">Pemohon:</span> <span className="font-semibold text-slate-900">{activeReviewReq.requesterName}</span></p>
                      <p><span className="text-slate-400">Departemen:</span> <span className="font-semibold text-slate-900">{activeReviewReq.requesterDepartment || '—'}</span></p>
                      <p><span className="text-slate-400">No. Registrasi:</span> <span className="font-mono text-indigo-700 font-semibold">{activeReviewReq.requestNumber}</span></p>
                      <p><span className="text-slate-400">Status:</span> <span className="font-bold text-emerald-700 uppercase">{activeReviewReq.status}</span></p>
                    </div>
                  </div>

                  {/* Public Portal Access Link */}
                  {activeReviewReq.accessToken && (
                    <div className="p-3 bg-[#003461]/5 border border-[#003461]/20 rounded-xl space-y-2 text-xs">
                      <span className="font-bold text-[#003461] block flex items-center gap-1.5">
                        <ExternalLink className="size-3.5 text-[#003461]" />
                        Link Portal Akses Dokumen (Public Link)
                      </span>
                      <a
                        href={`/sop-win/request/${activeReviewReq.accessToken}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#003461] underline font-mono break-all hover:text-indigo-900 block bg-white p-2 rounded-lg border border-slate-200"
                      >
                        {typeof window !== 'undefined' ? `${window.location.origin}/sop-win/request/${activeReviewReq.accessToken}` : `/sop-win/request/${activeReviewReq.accessToken}`}
                      </a>
                      <Button
                        type="button"
                        size="sm"
                        asChild
                        className="w-full h-8.5 bg-[#003461] hover:bg-[#00284d] text-white font-bold text-xs rounded-lg gap-1.5 shadow-2xs"
                      >
                        <a href={`/sop-win/request/${activeReviewReq.accessToken}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3.5" /> BUKA PORTAL AKSES DOKUMEN
                        </a>
                      </Button>
                    </div>
                  )}

                  {/* Pengaturan Akses Dokumen (Edit Settings) */}
                  <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-[#003461] flex items-center gap-1.5">
                        <Settings className="size-3.5 text-[#003461]" />
                        Pengaturan Akses Dokumen
                      </Label>
                      <Badge variant="outline" className="text-[10px] bg-blue-100 text-[#003461] border-blue-300 font-semibold">
                        Pengaturan Modal
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-slate-700">Masa Aktif Akses:</span>
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            value={expiryDays}
                            onChange={(e) => setExpiryDays(Number(e.target.value))}
                            className="w-20 bg-white text-xs font-bold text-center h-8 border-slate-300"
                          />
                          <span className="text-[11px] text-slate-600 font-medium">Hari Kerja</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-blue-100">
                        <span className="text-[11px] font-medium text-slate-700">Izin Unduh PDF:</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setCanDownload(!canDownload)}
                          className={`h-7 px-2.5 text-[10px] font-bold rounded-lg ${
                            canDownload
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                          }`}
                        >
                          {canDownload ? "Boleh Unduh (PDF)" : "Hanya Lihat (View Only)"}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <Button
                        type="button"
                        disabled={isSavingSettings}
                        onClick={handleSaveAccessSettings}
                        className="w-full h-8.5 bg-[#003461] hover:bg-[#00284d] text-white font-bold text-xs rounded-xl shadow-xs gap-1.5"
                      >
                        {isSavingSettings ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                        {isSavingSettings ? "Menyimpan..." : "SIMPAN PENGATURAN AKSES"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setSettingsModalReq(activeReviewReq);
                        }}
                        className="w-full h-8 border-blue-200 bg-white text-[#003461] hover:bg-blue-50 text-[11px] font-bold rounded-xl gap-1.5"
                      >
                        <Settings className="size-3.5 text-[#003461]" /> Pengaturan Akses Lanjutan
                      </Button>
                    </div>
                  </div>

                  {/* Info Box: Read-Only Review & Approval Centralization Notice */}
                  <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl space-y-1.5 text-xs text-amber-900">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <ShieldCheck className="size-4 text-amber-700 shrink-0" />
                      <span>Mode Peninjauan Dokumen (Read-Only)</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Halaman ini difokuskan untuk <strong>peninjauan dokumen & pengeditan pengaturan akses</strong>. Persetujuan/Tanda Tangan resmi (Approve / Reject) dilakukan secara terpusat oleh Approver melalui <strong>Inbox Approval</strong>.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      asChild
                      className="w-full h-8 bg-white border-amber-300 text-amber-900 hover:bg-amber-100/60 font-bold text-[11px] rounded-lg gap-1.5 mt-1"
                    >
                      <a href="/dashboard/approval">
                        <ExternalLink className="size-3 text-amber-800" /> BUKA INBOX APPROVAL
                      </a>
                    </Button>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setActiveReviewReq(null)}
                  className="w-full h-10 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs rounded-xl mt-4"
                >
                  TUTUP REVIEWER
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── 6. Batch Review Modal (Sequential Review for Selected Requests) ── */}
      {isBatchReviewOpen && currentBatchDoc && (
        <Dialog open={isBatchReviewOpen} onOpenChange={setIsBatchReviewOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-5">
            <DialogHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="bg-[#0f172a] text-white border-none font-bold text-xs">
                  Review Batch: Dokumen {batchReviewIndex + 1} dari {selectedBatchRows.length}
                </Badge>
                {renderStatusBadge(currentBatchDoc.status)}
              </div>
              <DialogTitle className="text-base font-bold text-slate-900 mt-2">
                {currentBatchDoc.requestNumber} — {currentBatchDoc.procedureName || currentBatchDoc.requestedDocTitleAndNumber}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Pemohon: {currentBatchDoc.requesterName} ({currentBatchDoc.requesterDepartment || "Internal HERO"})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">TIPE DOKUMEN</span>
                    <span className="font-semibold text-slate-800">{currentBatchDoc.requestedDocType}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">JENIS AKSES</span>
                    <span className="font-semibold text-slate-800">{currentBatchDoc.requestType === "softcopy" ? "Soft Copy" : "Hard Copy"}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">ALASAN PERMINTAAN</span>
                  <p className="text-slate-700 italic">"{currentBatchDoc.requestReason}"</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">Catatan Persetujuan (Batch)</Label>
                <Textarea
                  value={batchRemarks[currentBatchDoc.id] || ""}
                  onChange={(e) =>
                    setBatchRemarks((prev) => ({
                      ...prev,
                      [currentBatchDoc.id]: e.target.value,
                    }))
                  }
                  placeholder="Tambahkan catatan persetujuan untuk dokumen ini..."
                  rows={2}
                  className="bg-slate-50 text-xs resize-none"
                />
              </div>

              <DialogFooter className="border-t pt-3 flex items-center justify-between gap-2">
                <div className="text-xs text-slate-500 font-mono">
                  {batchReviewIndex + 1} / {selectedBatchRows.length}
                </div>

                <div className="flex items-center gap-2">
                  {batchReviewIndex > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBatchReviewIndex((prev) => prev - 1)}
                      className="h-8 text-xs"
                    >
                      Sebelumnya
                    </Button>
                  )}

                  <Button
                    type="button"
                    disabled={isBatchActionRunning}
                    onClick={handleBatchApproveCurrent}
                    className="h-8 px-4 bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-bold gap-1.5 rounded-lg"
                  >
                    {isBatchActionRunning ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-3.5 text-emerald-400" />
                    )}
                    {batchReviewIndex === selectedBatchRows.length - 1
                      ? "SETUJUI & SELESAI"
                      : "SETUJUI & LANJUT"}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── 7. Attachment Preview Modal ── */}
      {previewAttachmentUrl && (
        <Dialog open={!!previewAttachmentUrl} onOpenChange={() => setPreviewAttachmentUrl(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4 rounded-2xl">
            <DialogHeader className="border-b pb-2 flex flex-row items-center justify-between">
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Paperclip className="size-4 text-slate-700" />
                Pratinjau File Lampiran Penunjang
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 min-h-[420px] h-[65vh] bg-slate-950 rounded-xl overflow-hidden relative flex flex-col justify-center items-center p-4">
              {previewAttachmentUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                <img
                  src={previewAttachmentUrl}
                  alt="Pratinjau Lampiran"
                  className="w-full h-full object-contain bg-slate-950"
                />
              ) : previewAttachmentUrl.match(/\.pdf$/i) || previewAttachmentUrl.includes("/api/uploads/") ? (
                <iframe
                  src={`${previewAttachmentUrl}${previewAttachmentUrl.includes('?') ? '&' : '?'}t=${Date.now()}#toolbar=0&navpanes=0&scrollbar=1`}
                  title="Pratinjau Lampiran Penunjang"
                  className="w-full h-full border-0 bg-white rounded-lg"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 max-w-md bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl">
                  <div className="size-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Paperclip className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-white text-sm">Dokumen / File Lampiran Penunjang</p>
                    <p className="text-xs text-slate-400 font-mono break-all px-2">
                      {previewAttachmentUrl.split("/").pop()}
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    File ini dapat diunduh atau dibuka pada jendela baru untuk ditinjau secara langsung.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => window.open(previewAttachmentUrl, "_blank")}
                      className="h-8 px-3 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg gap-1.5"
                    >
                      <Eye className="size-3.5" /> Buka Tab Baru
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleDownloadAttachment(previewAttachmentUrl)}
                      className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg gap-1.5"
                    >
                      <Download className="size-3.5" /> Unduh
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t">
              <span className="text-[11px] text-slate-500 truncate max-w-xs font-mono">
                {previewAttachmentUrl.split("/").pop()}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadAttachment(previewAttachmentUrl)}
                  className="h-8 px-3 text-xs font-semibold gap-1.5 rounded-lg border-slate-200"
                >
                  <Download className="size-3.5 text-slate-700" />
                  Unduh File
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPreviewAttachmentUrl(null)}
                  className="h-8 px-4 bg-[#0f172a] text-white text-xs font-medium rounded-lg"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {/* ── 8. Access Settings Modal (Ria Annisa / Quality Management) ── */}
      {settingsModalReq && (
        <SopWinAccessSettingsModal
          isOpen={!!settingsModalReq}
          onClose={() => setSettingsModalReq(null)}
          requestId={settingsModalReq.id}
          requestNumber={settingsModalReq.requestNumber}
          docTitle={settingsModalReq.procedureName || settingsModalReq.requestedDocTitleAndNumber}
          currentExpiryDays={settingsModalReq.expiryDays || 3}
          currentCanDownload={(settingsModalReq as any).canDownload ?? true}
          onUpdated={() => {
            refreshData();
          }}
        />
      )}

      {/* ── 9. Missing Signature Dialog ── */}
      <MissingSignatureDialog
        isOpen={isMissingSignatureDialogOpen}
        onClose={() => setIsMissingSignatureDialogOpen(false)}
        onSignatureRegistered={(sigUrl) => {
          setUserSignatureUrl(sigUrl);
          if (typeof window !== "undefined") {
            localStorage.setItem("hero_user_signature", sigUrl);
          }
          toast.success("Tanda tangan digital Anda berhasil terdaftar! Silakan klik APPROVE kembali.");
        }}
      />
    </div>
  );
}
