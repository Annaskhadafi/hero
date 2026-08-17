"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  Building,
  UserCheck,
  Calendar,
  Eye,
  X,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  MessageSquare,
  Info,
  Loader2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentPreviewModal } from "@/components/hero-genius/document-preview-modal";

interface MobileSopWinViewProps {
  initialDocuments: Array<{
    id: number;
    documentNumber: string;
    title: string;
    documentType: string;
    departmentCode: string;
    currentRevision: string;
    status: string;
    pdfFileUrl: string | null;
    docxFileUrl: string | null;
    summary: string | null;
    effectiveDate: string | null;
    ownerName: string | null;
    ownerEmployeeSn: string | null;
    createdAt: string;
  }>;
  departments: Array<{
    code: string;
    name: string;
    docCount?: number;
  }>;
}

export function MobileSopWinView({
  initialDocuments,
  departments,
}: MobileSopWinViewProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedDept, setSelectedDept] = useState<string>("ALL");

  // Document Detail & Preview Modal State
  const [detailDoc, setDetailDoc] = useState<any | null>(null);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<{
    filename: string;
    url: string;
  } | null>(null);

  // Type Counts
  const counts = useMemo(() => {
    let sop = 0;
    let win = 0;
    let pol = 0;
    initialDocuments.forEach((doc) => {
      const t = (doc.documentType || "").toUpperCase();
      if (t === "SOP") sop++;
      else if (t === "WIN") win++;
      else if (t === "POL") pol++;
    });
    return { all: initialDocuments.length, sop, win, pol };
  }, [initialDocuments]);

  // Active Departments: ONLY show departments that have at least 1 document
  const activeDepartments = useMemo(() => {
    const docCountsMap: Record<string, number> = {};
    initialDocuments.forEach((doc) => {
      const c = (doc.departmentCode || "").toUpperCase();
      docCountsMap[c] = (docCountsMap[c] || 0) + 1;
    });

    const deptMap = new Map<string, { code: string; name: string; docCount: number }>();

    // 1. Add from departments prop
    departments.forEach((d) => {
      const codeUpper = (d.code || "").toUpperCase();
      const count = docCountsMap[codeUpper] || 0;
      if (count > 0) {
        deptMap.set(codeUpper, {
          code: d.code,
          name: d.name,
          docCount: count,
        });
      }
    });

    // 2. Also check if any documents have department codes not in departments list
    Object.entries(docCountsMap).forEach(([code, count]) => {
      if (count > 0 && !deptMap.has(code)) {
        deptMap.set(code, {
          code,
          name: code,
          docCount: count,
        });
      }
    });

    return Array.from(deptMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [departments, initialDocuments]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return initialDocuments.filter((doc) => {
      // Type Filter
      if (selectedType !== "ALL" && (doc.documentType || "").toUpperCase() !== selectedType) {
        return false;
      }

      // Department Filter
      if (selectedDept !== "ALL" && (doc.departmentCode || "").toUpperCase() !== selectedDept.toUpperCase()) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = (doc.documentNumber || "").toLowerCase().includes(q);
        const matchTitle = (doc.title || "").toLowerCase().includes(q);
        const matchSummary = (doc.summary || "").toLowerCase().includes(q);
        const matchOwner = (doc.ownerName || "").toLowerCase().includes(q);
        const matchDept = (doc.departmentCode || "").toLowerCase().includes(q);
        if (!matchNum && !matchTitle && !matchSummary && !matchOwner && !matchDept) {
          return false;
        }
      }

      return true;
    });
  }, [initialDocuments, selectedType, selectedDept, searchQuery]);

  const handleOpenDetail = (doc: any) => {
    setDetailDoc(doc);
  };

  const handleOpenPdf = (doc: any) => {
    if (doc.pdfFileUrl) {
      setPreviewPdfUrl({
        filename: `${doc.documentNumber} - ${doc.title}.pdf`,
        url: doc.pdfFileUrl,
      });
    }
  };

  const handleNavigateChat = (doc: any, customQuestion?: string) => {
    const question =
      customQuestion ||
      `Halo Hero Genius, tolong jelaskan isi dan poin-poin penting dari dokumen ${doc.documentNumber} (${doc.title})!`;
    const url = `/mobile/hero-genius?q=${encodeURIComponent(question)}&doc=${encodeURIComponent(
      doc.documentNumber
    )}`;
    router.push(url);
  };

  const renderRagStatusBadge = (doc: any) => {
    const status = (doc as any).ragStatus || (doc.ragDocumentId ? "ready" : "pending");

    if (status === "ready") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300">
          <Sparkles className="size-2.5 text-emerald-600" />
          AI Ready
        </span>
      );
    }
    if (status === "processing") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950 dark:text-amber-300">
          <Loader2 className="size-2.5 animate-spin text-amber-600" />
          OCR & AI...
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300">
          <Clock className="size-2.5 text-blue-600" />
          Antrian AI
        </span>
      );
    }
    if (status === "failed") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300">
          <AlertCircle className="size-2.5 text-rose-600" />
          Gagal AI
        </span>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] w-full pb-20">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-[#003461] via-[#004b8d] to-indigo-800 text-white rounded-3xl p-4 sm:p-5 shadow-sm mb-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md text-white shadow-inner">
              <FileText className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">SOP & WIN Mobile</h1>
              <p className="text-[11px] text-blue-100/80">
                Pusat Dokumen & Tanya Hero Genius
              </p>
            </div>
          </div>
          <Badge className="bg-white/20 hover:bg-white/30 text-white text-[10px] font-mono border-none">
            {initialDocuments.length} Dokumen
          </Badge>
        </div>

        {/* Search Bar */}
        <div className="relative mt-3.5">
          <Search className="absolute left-3 top-2.5 size-4 text-blue-200" />
          <Input
            placeholder="Cari nomor dokumen, judul, atau PIC..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9.5 rounded-2xl pl-9.5 pr-8 text-xs bg-white/10 border-white/20 text-white placeholder:text-blue-200/70 focus-visible:ring-white/30 focus-visible:bg-white/15"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-blue-200 hover:text-white"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Type Filter Pills */}
        <div className="grid grid-cols-4 gap-1.5 mt-3 pt-2 border-t border-white/10 text-center">
          <button
            type="button"
            onClick={() => setSelectedType("ALL")}
            className={`py-1 px-1.5 rounded-xl text-[11px] font-bold transition-all ${
              selectedType === "ALL"
                ? "bg-white text-[#003461] shadow-sm"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            Semua ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setSelectedType("SOP")}
            className={`py-1 px-1.5 rounded-xl text-[11px] font-bold transition-all ${
              selectedType === "SOP"
                ? "bg-white text-indigo-800 shadow-sm"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            SOP ({counts.sop})
          </button>
          <button
            type="button"
            onClick={() => setSelectedType("WIN")}
            className={`py-1 px-1.5 rounded-xl text-[11px] font-bold transition-all ${
              selectedType === "WIN"
                ? "bg-white text-sky-800 shadow-sm"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            WIN ({counts.win})
          </button>
          <button
            type="button"
            onClick={() => setSelectedType("POL")}
            className={`py-1 px-1.5 rounded-xl text-[11px] font-bold transition-all ${
              selectedType === "POL"
                ? "bg-white text-emerald-800 shadow-sm"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
          >
            POL ({counts.pol})
          </button>
        </div>
      </div>

      {/* Department Filter Carousel (Hanya yang memiliki dokumen) */}
      {activeDepartments.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setSelectedDept("ALL")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                selectedDept === "ALL"
                  ? "bg-[#003461] text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              Semua Dept
            </button>
            {activeDepartments.map((dept) => {
              const isSelected = selectedDept.toUpperCase() === dept.code.toUpperCase();
              return (
                <button
                  key={dept.code}
                  type="button"
                  onClick={() => setSelectedDept(dept.code)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                    isSelected
                      ? "bg-[#003461] text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  }`}
                >
                  {dept.code}
                  <span
                    className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected ? "bg-white/20 text-white" : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    }`}
                  >
                    {dept.docCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between px-1 mb-2 text-xs text-slate-500">
        <span>Menampilkan {filteredDocuments.length} dokumen</span>
        {(selectedType !== "ALL" || selectedDept !== "ALL" || searchQuery) && (
          <button
            type="button"
            onClick={() => {
              setSelectedType("ALL");
              setSelectedDept("ALL");
              setSearchQuery("");
            }}
            className="text-[11px] font-semibold text-blue-600 hover:underline"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Documents List */}
      <div className="space-y-2.5">
        {filteredDocuments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-950">
            <FileText className="size-10 mx-auto text-slate-300 mb-2" />
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Dokumen Tidak Ditemukan
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Coba gunakan kata kunci lain atau ubah filter tipe dan departemen.
            </p>
          </div>
        ) : (
          filteredDocuments.map((doc) => {
            const isSop = doc.documentType === "SOP";
            const isWin = doc.documentType === "WIN";

            return (
              <div
                key={doc.id}
                className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-950 space-y-2.5 transition-all hover:border-slate-300"
              >
                {/* Top Badges Row */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      className={`text-[10px] font-black border-none px-2 py-0.5 ${
                        isSop
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                          : isWin
                          ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {doc.documentType}
                    </Badge>
                    <Badge variant="outline" className="font-mono text-[10px] font-bold px-1.5 py-0.5">
                      Rev {doc.currentRevision || "00"}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-mono font-semibold px-1.5 py-0.5">
                      {doc.departmentCode}
                    </Badge>
                    {renderRagStatusBadge(doc)}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenDetail(doc)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-semibold"
                  >
                    <Info className="size-3" />
                    Detail
                  </button>
                </div>

                {/* Document Number & Title */}
                <div>
                  <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                    {doc.documentNumber}
                  </div>
                  <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-0.5 line-clamp-2">
                    {doc.title}
                  </h2>
                </div>

                {/* Summary (if available) */}
                {doc.summary && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 bg-slate-50 p-2 rounded-xl border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800">
                    {doc.summary}
                  </p>
                )}

                {/* Meta info: PIC & Effective Date */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1 truncate max-w-[55%]">
                    <UserCheck className="size-3 shrink-0 text-slate-400" />
                    <span className="truncate">{doc.ownerName || "PIC Departemen"}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Calendar className="size-3 text-slate-400" />
                    <span>
                      {doc.effectiveDate
                        ? new Date(doc.effectiveDate).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "Tgl Berlaku: -"}
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Chat & Buka PDF */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleNavigateChat(doc)}
                    className="flex-1 h-8 rounded-xl text-xs gap-1.5 font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-700 text-white shadow-xs"
                  >
                    <Sparkles className="size-3.5 text-amber-300" />
                    Chat Dokumen
                  </Button>

                  {doc.pdfFileUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPdf(doc)}
                      className="flex-1 h-8 rounded-xl text-xs font-bold gap-1 text-[#003461] border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100"
                    >
                      <Eye className="size-3.5" />
                      Buka PDF
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      disabled
                      className="flex-1 h-8 rounded-xl text-xs font-medium text-slate-400 bg-slate-100"
                    >
                      PDF Belum Ada
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Dialog with Direct Chat Prompting */}
      <Dialog open={!!detailDoc} onOpenChange={(open) => !open && setDetailDoc(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl p-5 sm:p-6">
          {detailDoc && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge
                    className={`text-[10px] font-black border-none px-2 py-0.5 ${
                      detailDoc.documentType === "SOP"
                        ? "bg-indigo-100 text-indigo-800"
                        : detailDoc.documentType === "WIN"
                        ? "bg-sky-100 text-sky-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {detailDoc.documentType}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[10px] font-bold">
                    Rev {detailDoc.currentRevision || "00"}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-mono font-semibold">
                    {detailDoc.departmentCode}
                  </Badge>
                </div>
                <DialogTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {detailDoc.documentNumber}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {detailDoc.title}
                </DialogDescription>
              </DialogHeader>

              {/* Information Grid */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 space-y-2 text-xs dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Departemen:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {detailDoc.departmentCode}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">PIC Penanggung Jawab:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {detailDoc.ownerName || "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Tanggal Efektif:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {detailDoc.effectiveDate
                      ? new Date(detailDoc.effectiveDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "-"}
                  </span>
                </div>
              </div>

              {/* Ringkasan Dokumen */}
              {detailDoc.summary && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Ringkasan Prosedur:
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-white p-3 rounded-2xl border border-slate-100 dark:bg-slate-950 dark:border-slate-800 leading-relaxed">
                    {detailDoc.summary}
                  </p>
                </div>
              )}

              {/* Chat dengan Dokumen (Hero Genius) */}
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-blue-50/40 to-slate-50 p-3.5 space-y-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold text-xs">
                  <Sparkles className="size-4 text-indigo-600 animate-pulse" />
                  <span>Chat dengan Dokumen Ini</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Tanyakan prosedur, langkah kerja, atau aturan teknis langsung ke <strong>Hero Genius</strong>.
                </p>

                {/* Quick Prompts */}
                <div className="space-y-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const doc = detailDoc;
                      setDetailDoc(null);
                      handleNavigateChat(
                        doc,
                        `Jelaskan ringkasan poin utama dan langkah kerja di dokumen ${doc.documentNumber} (${doc.title})!`
                      );
                    }}
                    className="w-full text-left text-[11px] font-medium bg-white p-2 rounded-xl border border-indigo-100 hover:border-indigo-300 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 transition-all flex items-center justify-between shadow-2xs"
                  >
                    <span>💬 "Ringkas poin utama & langkah kerja"</span>
                    <ChevronRight className="size-3 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const doc = detailDoc;
                      setDetailDoc(null);
                      handleNavigateChat(
                        doc,
                        `Siapa penanggung jawab dan apa saja ketentuan yang wajib dipatuhi di dokumen ${doc.documentNumber} (${doc.title})?`
                      );
                    }}
                    className="w-full text-left text-[11px] font-medium bg-white p-2 rounded-xl border border-indigo-100 hover:border-indigo-300 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 transition-all flex items-center justify-between shadow-2xs"
                  >
                    <span>💬 "Siapa PIC & ketentuan yang wajib dipatuhi?"</span>
                    <ChevronRight className="size-3 text-slate-400" />
                  </button>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    const doc = detailDoc;
                    setDetailDoc(null);
                    handleNavigateChat(doc);
                  }}
                  className="w-full h-8.5 rounded-xl bg-gradient-to-r from-[#003461] to-indigo-700 hover:from-blue-900 hover:to-indigo-800 text-white font-bold text-xs gap-1.5 shadow-sm mt-1"
                >
                  <Sparkles className="size-3.5 text-amber-300" />
                  Mulai Chat dengan Hero Genius
                </Button>
              </div>

              {/* PDF Preview Trigger in Detail Modal */}
              {detailDoc.pdfFileUrl && (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const d = detailDoc;
                      setDetailDoc(null);
                      handleOpenPdf(d);
                    }}
                    className="w-full h-8.5 rounded-2xl border-slate-200 font-bold text-xs gap-1.5 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
                  >
                    <Eye className="size-4" />
                    Lihat Dokumen Lengkap (PDF)
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen Read-Only PDF Viewer */}
      {previewPdfUrl && (
        <DocumentPreviewModal
          isOpen={!!previewPdfUrl}
          onClose={() => setPreviewPdfUrl(null)}
          filename={previewPdfUrl.filename}
          url={previewPdfUrl.url}
        />
      )}
    </div>
  );
}
