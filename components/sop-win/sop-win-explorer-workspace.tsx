"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Folder,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  Shield,
  Search,
  Plus,
  Eye,
  History,
  Maximize2,
  Trash2,
  Building,
  User,
  Calendar,
  Layers,
  Sparkles,
  ChevronRight,
  X,
  RefreshCw,
  Edit3,
  ArrowRightLeft,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { DocumentPreviewModal } from "@/components/hero-genius/document-preview-modal";
import { SopWinFormDialog } from "./sop-win-form-dialog";
import { SopWinEditDialog } from "./sop-win-edit-dialog";
import { SopWinRevisionDialog } from "./sop-win-revision-dialog";
import { SopWinDepartmentManageDialog } from "./sop-win-department-manage-dialog";
import {
  deleteSopWinDocumentAction,
  getSopWinDocumentDetailAction,
  getSopWinDepartmentsAction,
  getSopWinRagQueueStatusAction,
  retrySopWinRagItemAction,
  retryAllFailedSopWinRagAction,
  syncAndAutoChunkSopWinAction,
} from "@/app/dashboard/sop-win/actions";
import { STANDARD_DEPARTMENTS } from "@/lib/sop-win-constants";
import {
  type DepartmentSelectOption,
  type PicSelectOption,
} from "./sop-win-searchable-select";

interface SopWinExplorerWorkspaceProps {
  initialDocuments: any[];
  departmentCounts: Record<string, number>;
  departments?: DepartmentSelectOption[];
  employees: Array<{ id: number; name: string; employeeSn: string | null; position: string | null }>;
  picOptions?: PicSelectOption[];
  headSections?: Array<{ id: number; name: string; employeeSn?: string | null; position?: string | null; unitName?: string | null }>;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canManageDocuments?: boolean;
  onRefreshData?: () => void;
  selectedDeptInitial?: string;
}

export function SopWinExplorerWorkspace({
  initialDocuments,
  departmentCounts,
  departments = [],
  employees,
  picOptions = [],
  headSections = [],
  canCreate: propCanCreate,
  canEdit: propCanEdit,
  canDelete: propCanDelete,
  canManageDocuments = false,
  onRefreshData,
  selectedDeptInitial = "ALL",
}: SopWinExplorerWorkspaceProps) {
  const canCreate = propCanCreate ?? canManageDocuments;
  const canEdit = propCanEdit ?? canManageDocuments;
  const canDelete = propCanDelete ?? canManageDocuments;

  const router = useRouter();
  const [selectedDepartment, setSelectedDepartment] = useState<string>(selectedDeptInitial);

  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [deptSearchQuery, setDeptSearchQuery] = useState<string>("");
  const [departmentsList, setDepartmentsList] = useState<any[]>(
    departments.length > 0 ? departments : STANDARD_DEPARTMENTS
  );

  const handleNavigateChat = (doc: any) => {
    const question = `Halo Hero Genius, tolong jelaskan isi, tujuan, dan prosedur penting dari dokumen ${doc.documentNumber} (${doc.title})!`;
    router.push(
      `/dashboard/hero-genius?q=${encodeURIComponent(question)}&doc=${encodeURIComponent(
        doc.documentNumber
      )}`
    );
  };

  const [selectedDocId, setSelectedDocId] = useState<number | null>(
    initialDocuments.length > 0 ? initialDocuments[0].id : null
  );
  const [activeDocRevisions, setActiveDocRevisions] = useState<any[]>([]);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(false);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [manageDeptDialogOpen, setManageDeptDialogOpen] = useState(false);
  const [fullscreenPreviewDoc, setFullscreenPreviewDoc] = useState<{
    filename: string;
    url: string;
  } | null>(null);

  // Update departmentsList if prop changes
  useEffect(() => {
    if (departments.length > 0) {
      setDepartmentsList(departments);
    }
  }, [departments]);

  const refreshDepartments = async () => {
    try {
      const res = await getSopWinDepartmentsAction();
      if (res.success && res.departments) {
        setDepartmentsList(res.departments);
      }
    } catch (err) {
      console.error("Failed to refresh departments:", err);
    }
    if (onRefreshData) onRefreshData();
  };

  // Filter department folders in sidebar
  const filteredDepartmentsSidebar = useMemo(() => {
    const q = deptSearchQuery.toLowerCase().trim();
    if (!q) return departmentsList;
    return departmentsList.filter(
      (d) =>
        d.code.toLowerCase().includes(q) ||
        d.name.toLowerCase().includes(q)
    );
  }, [departmentsList, deptSearchQuery]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return initialDocuments.filter((doc) => {
      const matchDept =
        selectedDepartment === "ALL" ||
        (doc.departmentCode || "").toUpperCase() === selectedDepartment.toUpperCase();

      const matchType =
        typeFilter === "ALL" || (doc.documentType || "").toUpperCase() === typeFilter.toUpperCase();

      const matchQuery =
        !searchQuery.trim() ||
        (doc.documentNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.summary || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.ownerName || "").toLowerCase().includes(searchQuery.toLowerCase());

      return matchDept && matchType && matchQuery;
    });
  }, [initialDocuments, selectedDepartment, typeFilter, searchQuery]);

  // Active document
  const activeDoc = useMemo(() => {
    return initialDocuments.find((d) => d.id === selectedDocId) || null;
  }, [initialDocuments, selectedDocId]);

  // Load document revisions in background
  useEffect(() => {
    if (!selectedDocId) {
      setActiveDocRevisions([]);
      return;
    }

    let isMounted = true;
    setIsLoadingRevisions(true);

    getSopWinDocumentDetailAction(selectedDocId)
      .then((res) => {
        if (isMounted && res.success && res.revisions) {
          setActiveDocRevisions(res.revisions);
        }
      })
      .catch((err) => {
        console.error("Failed to load revisions:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingRevisions(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDocId]);

  // Queue stats state
  const [queueStatus, setQueueStatus] = useState<{
    isWorkerRunning: boolean;
    pendingCount: number;
    processingCount: number;
    failedCount: number;
  }>({
    isWorkerRunning: false,
    pendingCount: 0,
    processingCount: 0,
    failedCount: 0,
  });
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Calculate unchunked documents count
  const unchunkedDocsCount = useMemo(() => {
    return initialDocuments.filter((d) => (d.ragChunksCount ?? 0) === 0 || d.ragStatus === "failed").length;
  }, [initialDocuments]);

  // Poll RAG Queue when active
  useEffect(() => {
    let timer: any = null;
    let isMounted = true;

    const checkQueue = async () => {
      try {
        const res = await getSopWinRagQueueStatusAction();
        if (isMounted && res.success) {
          setQueueStatus({
            isWorkerRunning: res.isWorkerRunning,
            pendingCount: res.pendingCount,
            processingCount: res.processingCount,
            failedCount: res.failedCount,
          });

          // If items are in queue, poll again in 3.5 seconds
          if (res.pendingCount > 0 || res.processingCount > 0) {
            timer = setTimeout(checkQueue, 3500);
          } else {
            // Re-fetch document list once queue is empty
            if (onRefreshData) onRefreshData();
          }
        }
      } catch (err) {
        console.error("Failed to check RAG queue:", err);
      }
    };

    checkQueue();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [initialDocuments]);

  const handleSyncAndAutoChunk = async () => {
    try {
      setIsSyncing(true);
      const res = await syncAndAutoChunkSopWinAction();
      if (res.success) {
        toast.success(res.message || "Sinkronisasi AI & Auto-Chunking berhasil dipicu!");
        const qRes = await getSopWinRagQueueStatusAction();
        if (qRes.success) setQueueStatus(qRes);
        if (onRefreshData) onRefreshData();
      } else {
        toast.error(res.error || "Gagal sinkronisasi data RAG AI.");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal sinkronisasi data RAG.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryItem = async (docId: number) => {
    try {
      setIsRetrying(true);
      const res = await retrySopWinRagItemAction(docId);
      if (res.success) {
        toast.success(res.message || "Dokumen dimasukkan ke antrian chunking AI.");
        const qRes = await getSopWinRagQueueStatusAction();
        if (qRes.success) setQueueStatus(qRes);
        if (onRefreshData) onRefreshData();
      } else {
        toast.error(res.error || "Gagal memasukkan dokumen ke antrian.");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal retry antrian RAG.");
    } finally {
      setIsRetrying(false);
    }
  };

  const handleRetryAllFailed = async () => {
    try {
      setIsRetrying(true);
      const res = await retryAllFailedSopWinRagAction();
      if (res.success) {
        toast.success(res.message || "Semua dokumen belum di-chunk dimasukkan ke antrian AI.");
        const qRes = await getSopWinRagQueueStatusAction();
        if (qRes.success) setQueueStatus(qRes);
        if (onRefreshData) onRefreshData();
      } else {
        toast.error(res.error || "Gagal retry antrian.");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal retry semua dokumen.");
    } finally {
      setIsRetrying(false);
    }
  };

  const renderRagStatusBadge = (doc: any) => {
    const chunks = doc.ragChunksCount ?? 0;
    const status = doc.ragStatus || (chunks > 0 ? "ready" : "pending");

    if (status === "ready" && chunks > 0) {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
          title={`Dokumen siap & terindeks Smart Chat (${chunks} Chunks)`}
        >
          <Sparkles className="size-2.5 text-emerald-600" />
          Smart Chat Ready ({chunks} Chunks)
        </span>
      );
    }
    if (status === "processing") {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
          title="Sedang OCR & Chunking di background"
        >
          <Loader2 className="size-2.5 animate-spin text-amber-600" />
          OCR & AI...
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800"
          title="Menunggu giliran antrian background"
        >
          <Clock className="size-2.5 text-blue-600" />
          Antrian AI
        </span>
      );
    }
    // 0 Chunks / Failed / Unchunked
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleRetryItem(doc.id);
        }}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700 transition-colors"
        title={
          doc.ragErrorMessage
            ? `0 Chunks: ${doc.ragErrorMessage} (Klik untuk Chunk Otomatis)`
            : "0 Chunks (Belum di-chunk - Klik untuk proses Chunking AI)"
        }
      >
        <AlertCircle className="size-2.5 text-amber-600" />
        0 Chunks (Belum di-chunk)
      </button>
    );
  };

  const handleDelete = async (docId: number, docNum: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus dokumen ${docNum}?`)) {
      return;
    }

    try {
      const res = await deleteSopWinDocumentAction(docId);
      if (res.success) {
        toast.success("Dokumen berhasil dihapus.");
        if (selectedDocId === docId) setSelectedDocId(null);
        if (onRefreshData) onRefreshData();
      } else {
        toast.error(res.error || "Gagal menghapus dokumen.");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus dokumen.");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full min-h-[calc(100vh-200px)] items-stretch">
      {/* 1. Left Sidebar: Department Folders Tree */}
      <div className="w-full lg:w-64 xl:w-72 shrink-0 rounded-3xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-950 flex flex-col">
        <div className="flex items-center justify-between px-2 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Building className="size-3.5 text-[#003461]" />
            Departemen
          </span>
          {canEdit && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setManageDeptDialogOpen(true)}
              className="h-6 px-2 text-[10px] font-bold text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-slate-900 rounded-lg gap-1"
            >
              <Plus className="size-3" />
              Kelola
            </Button>
          )}
        </div>


        {/* Live Search Department */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2 size-3 text-slate-400" />
          <Input
            placeholder="Cari folder departemen..."
            value={deptSearchQuery}
            onChange={(e) => setDeptSearchQuery(e.target.value)}
            className="h-7.5 rounded-xl pl-7.5 text-xs bg-slate-50/70 dark:bg-slate-900/60"
          />
          {deptSearchQuery && (
            <button
              type="button"
              onClick={() => setDeptSearchQuery("")}
              className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* All Departments Option */}
        <button
          type="button"
          onClick={() => setSelectedDepartment("ALL")}
          className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold transition-all ${
            selectedDepartment === "ALL"
              ? "bg-[#003461] text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="size-4" />
            <span>SEMUA DEPARTEMEN</span>
          </div>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
              selectedDepartment === "ALL"
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {initialDocuments.length}
          </span>
        </button>

        {/* Dynamic Department Folder Items */}
        <div className="flex-1 overflow-y-auto space-y-0.5 mt-1 pr-0.5 max-h-[600px]">
          {filteredDepartmentsSidebar.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Tidak ada departemen yang cocok.
            </div>
          ) : (
            filteredDepartmentsSidebar.map((dept: any) => {
              const isSelected = selectedDepartment.toUpperCase() === (dept.code || "").toUpperCase();
              const count =
                departmentCounts[dept.code] !== undefined
                  ? departmentCounts[dept.code]
                  : dept.docCount || 0;

              return (
                <button
                  key={dept.code}
                  type="button"
                  onClick={() => setSelectedDepartment(dept.code)}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs transition-all ${
                    isSelected
                      ? "bg-indigo-600 text-white font-bold shadow-sm"
                      : "text-slate-700 hover:bg-slate-100/70 font-medium dark:text-slate-300 dark:hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder
                      className={`size-3.5 shrink-0 ${
                        isSelected ? "text-white" : "text-slate-400"
                      }`}
                    />
                    <span className="truncate">{dept.name.toUpperCase()}</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : count > 0
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Center Area: Documents List Table */}
      <div
        className={`flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden transition-all ${
          selectedDocId ? "w-full lg:w-5/12 xl:w-5/12" : "flex-1"
        }`}
      >
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          {/* Type Tabs */}
          <Tabs value={typeFilter} onValueChange={setTypeFilter} className="w-full sm:w-auto">
            <TabsList className="bg-slate-200/80 p-0.5 h-8 dark:bg-slate-800">
              <TabsTrigger value="ALL" className="text-[11px] font-bold px-2.5 h-7">
                Semua
              </TabsTrigger>
              <TabsTrigger value="SOP" className="text-[11px] font-bold px-2.5 h-7 text-indigo-700">
                SOP
              </TabsTrigger>
              <TabsTrigger value="WIN" className="text-[11px] font-bold px-2.5 h-7 text-sky-700">
                WIN
              </TabsTrigger>
              <TabsTrigger value="POL" className="text-[11px] font-bold px-2.5 h-7 text-emerald-700">
                POL
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="relative flex-1 sm:w-44">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <Input
                placeholder="Cari dokumen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 rounded-xl text-xs bg-white dark:bg-slate-900"
              />
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isSyncing}
              onClick={handleSyncAndAutoChunk}
              className="h-8 gap-1.5 rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 dark:border-slate-800 dark:text-slate-300 text-xs font-semibold shrink-0 shadow-xs"
              title="Sinkronkan dokumen dengan Knowledge Base & Chunk otomatis dokumen yang belum memiliki chunk"
            >
              <RefreshCw className={`size-3 text-indigo-600 ${isSyncing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sinkron AI</span>
              {unchunkedDocsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  {unchunkedDocsCount} Belum
                </span>
              )}
            </Button>

            {(canCreate || canEdit) && (
              <Button
                type="button"
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className="h-8 gap-1.5 rounded-xl bg-[#003461] hover:bg-[#002647] text-white text-xs font-semibold shrink-0 shadow-xs"
              >
                <Plus className="size-3.5" />
                Tambah
              </Button>
            )}
          </div>

        </div>

        {/* Active Background Queue Notification Banner */}
        {(queueStatus.pendingCount > 0 || queueStatus.processingCount > 0 || queueStatus.failedCount > 0) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 border-b border-indigo-100 text-xs dark:from-slate-900 dark:via-blue-950/40 dark:to-slate-900 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              {queueStatus.processingCount > 0 ? (
                <Loader2 className="size-3.5 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
              ) : (
                <Clock className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <span>
                <strong>Antrian RAG AI:</strong>{" "}
                {queueStatus.processingCount > 0
                  ? "1 dokumen sedang diproses OCR & chunking"
                  : "Menunggu giliran antrian"}
                {queueStatus.pendingCount > 0 && `, ${queueStatus.pendingCount} dalam antrian`}
                {queueStatus.failedCount > 0 && (
                  <span className="text-rose-600 font-semibold ml-1">
                    ({queueStatus.failedCount} gagal sinkron)
                  </span>
                )}
              </span>
            </div>
            {queueStatus.failedCount > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isRetrying}
                onClick={handleRetryAllFailed}
                className="h-6 px-2 text-[10px] font-bold text-rose-700 bg-white border-rose-200 hover:bg-rose-50 dark:bg-slate-900 dark:text-rose-300 dark:border-rose-800 shrink-0"
              >
                <RefreshCw className={`size-2.5 mr-1 ${isRetrying ? "animate-spin" : ""}`} />
                Retry Gagal ({queueStatus.failedCount})
              </Button>
            )}
          </div>
        )}

        {/* Table Content */}
        <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[700px]">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              <tr>
                <th className="px-3.5 py-2.5">No. Dokumen</th>
                <th className="px-3 py-2.5">Judul Dokumen</th>
                <th className="px-2 py-2.5">Tipe</th>
                <th className="px-2 py-2.5">Dept</th>
                <th className="px-2 py-2.5">Rev</th>
                <th className="px-2.5 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <FileText className="mx-auto size-10 stroke-1 text-slate-300 mb-2" />
                    <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">
                      Tidak ada dokumen yang sesuai
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Pilih departemen lain atau klik "Tambah" untuk mengunggah dokumen baru.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  const isSelected = selectedDocId === doc.id;
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50/90 dark:bg-blue-950/40"
                          : "hover:bg-slate-50/60 dark:hover:bg-slate-900/40"
                      }`}
                    >
                      <td className="px-3.5 py-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isSelected && (
                            <span className="size-1.5 rounded-full bg-[#003461]" />
                          )}
                          {doc.documentNumber}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-800 dark:text-slate-200">
                        <p className="font-semibold text-xs leading-snug line-clamp-2">{doc.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-400">
                          <span>Dept: {doc.departmentCode}</span>
                          {doc.ownerName && <span>• PIC: {doc.ownerName}</span>}
                          <span>•</span>
                          {renderRagStatusBadge(doc)}
                        </div>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <Badge
                          className={`text-[9px] font-black border-none ${
                            doc.documentType === "SOP"
                              ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                              : doc.documentType === "WIN"
                              ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                              : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {doc.documentType}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {doc.departmentCode}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {doc.currentRevision}
                      </td>
                      <td className="px-2.5 py-3 text-right space-x-1 whitespace-nowrap">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateChat(doc);
                          }}
                          className="size-7 p-0 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg"
                          title="Chat dengan Dokumen (Hero Genius)"
                        >
                          <Sparkles className="size-3.5" />
                        </Button>
                        {canEdit && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingDoc(doc);
                              setEditDialogOpen(true);
                            }}
                            className="size-7 p-0 text-amber-600 hover:bg-amber-50 rounded-lg"
                            title="Edit Dokumen / Pindah Departemen"
                          >
                            <Edit3 className="size-3.5" />
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocId(doc.id);
                          }}
                          className={`size-7 p-0 rounded-lg ${
                            isSelected
                              ? "bg-[#003461] text-white hover:bg-[#002647] hover:text-white"
                              : "text-slate-500 hover:text-blue-600"
                          }`}
                          title="Buka Side Preview"
                        >
                          <ChevronRight className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Right Panel: Side-by-Side PDF Preview (Full Height & Width) */}
      {selectedDocId && activeDoc && (
        <div className="w-full lg:w-7/12 xl:w-7/12 rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 flex flex-col overflow-hidden">
          {/* Side Panel Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-[#003461] px-4 py-3 text-white dark:border-slate-800 shrink-0">
            <div className="min-w-0 pr-2">
              <div className="flex items-center gap-2">
                <Badge
                  className={`text-[9px] font-bold border-none ${
                    activeDoc.documentType === "SOP"
                      ? "bg-indigo-400 text-indigo-950"
                      : activeDoc.documentType === "WIN"
                      ? "bg-sky-300 text-sky-950"
                      : "bg-emerald-300 text-emerald-950"
                  }`}
                >
                  {activeDoc.documentType}
                </Badge>
                <span className="font-mono text-xs font-bold text-white truncate">
                  {activeDoc.documentNumber}
                </span>
                <span className="text-[10px] text-blue-200">
                  (Rev {activeDoc.currentRevision})
                </span>
                <Badge variant="outline" className="text-[9px] border-white/30 text-white">
                  Dept: {activeDoc.departmentCode}
                </Badge>
              </div>
              <h4 className="text-xs font-semibold text-blue-50 truncate mt-0.5">
                {activeDoc.title}
              </h4>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleNavigateChat(activeDoc)}
                className="h-7 px-2.5 text-xs bg-white/10 text-white hover:bg-white/20 rounded-lg gap-1.5 font-semibold"
                title="Chat dengan Dokumen Ini di Hero Genius"
              >
                <Sparkles className="size-3.5 text-amber-300" />
                <span className="hidden sm:inline">Chat Dokumen</span>
              </Button>
              {canEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingDoc(activeDoc);
                    setEditDialogOpen(true);
                  }}
                  className="h-7 px-2 text-xs text-amber-200 hover:bg-white/15 hover:text-white rounded-lg gap-1"
                  title="Edit / Pindah Departemen"
                >
                  <Edit3 className="size-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setFullscreenPreviewDoc({
                    filename: activeDoc.title,
                    url: activeDoc.pdfFileUrl,
                  })
                }
                className="size-7 p-0 text-white/80 hover:bg-white/15 hover:text-white rounded-lg"
                title="Fullscreen Preview"
              >
                <Maximize2 className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDocId(null)}
                className="size-7 p-0 text-white/80 hover:bg-white/15 hover:text-white rounded-lg"
                title="Tutup Panel"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* Full Height Side PDF Previewer */}
          <div
            className="relative flex-1 min-h-[500px] xl:min-h-[560px] w-full bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 select-none overflow-hidden"
            onContextMenu={(e) => e.preventDefault()}
          >
            <iframe
              src={`/api/hero-genius/document-stream?url=${encodeURIComponent(
                activeDoc.pdfFileUrl
              )}&filename=${encodeURIComponent(activeDoc.documentNumber)}#toolbar=0&navpanes=0&scrollbar=1`}
              title={activeDoc.title}
              className="w-full h-full border-0 bg-white dark:bg-slate-900"
            />
          </div>


          {/* Document Meta & Revision Log Tab Area */}
          <div className="p-4 space-y-3 shrink-0 max-h-56 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span>
                  <strong className="text-slate-500">Owner:</strong>{" "}
                  {activeDoc.ownerName || "-"}
                </span>
                <span>
                  <strong className="text-slate-500">Berlaku:</strong>{" "}
                  {activeDoc.effectiveDate
                    ? new Date(activeDoc.effectiveDate).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </span>
                <div className="flex items-center gap-1.5">
                  <strong className="text-slate-500">Status AI:</strong>
                  {renderRagStatusBadge(activeDoc)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleNavigateChat(activeDoc)}
                  className="h-7 px-2.5 rounded-lg bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-800 hover:to-indigo-700 text-white text-[11px] font-bold gap-1 shadow-xs"
                >
                  <Sparkles className="size-3 text-amber-300" />
                  Chat Dokumen
                </Button>
                {canEdit && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setRevisionDialogOpen(true)}
                    className="h-7 px-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold gap-1"
                  >
                    <Plus className="size-3" />
                    Terbitkan Revisi
                  </Button>
                )}
                {canDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(activeDoc.id, activeDoc.documentNumber)}
                    className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    Hapus
                  </Button>
                )}
              </div>

            </div>

            {/* Revision Changelogs */}
            {activeDocRevisions.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <History className="size-3 text-indigo-600" />
                  Riwayat Revisi ({activeDocRevisions.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeDocRevisions.map((rev: any) => (
                    <div
                      key={rev.id}
                      className="rounded-xl border border-slate-200/80 bg-white p-2 text-xs space-y-1 shadow-2xs dark:border-slate-800 dark:bg-slate-950"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="font-mono text-[9px] font-bold">
                            Rev {rev.revisionNumber}
                          </Badge>
                          {renderRagStatusBadge(rev)}
                        </div>
                        <span className="text-[9px] text-slate-400">
                          {new Date(rev.effectiveDate || rev.createdAt).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "short", year: "numeric" }
                          )}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-1">
                        {rev.changeDescription || "Rilis versi."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Document Form Dialog */}
      <SopWinFormDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        departments={departmentsList}
        employees={employees}
        picOptions={picOptions}
        defaultDepartment={selectedDepartment !== "ALL" ? selectedDepartment : "SERVICE"}
        onOpenManageDepartment={() => setManageDeptDialogOpen(true)}
        onSuccess={() => {
          refreshDepartments();
        }}
      />

      {/* Edit Document Dialog */}
      {editingDoc && (
        <SopWinEditDialog
          isOpen={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEditingDoc(null);
          }}
          document={editingDoc}
          departments={departmentsList}
          employees={employees}
          picOptions={picOptions}
          onOpenManageDepartment={() => setManageDeptDialogOpen(true)}
          onSuccess={() => {
            refreshDepartments();
          }}
        />
      )}

      {/* Manage Departments Dialog */}
      <SopWinDepartmentManageDialog
        isOpen={manageDeptDialogOpen}
        onClose={() => setManageDeptDialogOpen(false)}
        departments={departmentsList}
        employees={employees}
        headSections={headSections}
        onSuccess={() => {
          refreshDepartments();
        }}
      />

      {/* Add Revision Form Dialog */}
      {activeDoc && (
        <SopWinRevisionDialog
          isOpen={revisionDialogOpen}
          onClose={() => setRevisionDialogOpen(false)}
          document={activeDoc}
          onSuccess={() => {
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {/* Fullscreen Read-Only Preview Modal */}
      {fullscreenPreviewDoc && (
        <DocumentPreviewModal
          isOpen={!!fullscreenPreviewDoc}
          onClose={() => setFullscreenPreviewDoc(null)}
          filename={fullscreenPreviewDoc.filename}
          url={fullscreenPreviewDoc.url}
        />
      )}
    </div>
  );
}
