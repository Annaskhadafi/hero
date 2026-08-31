"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  ShieldCheck,
  FileText,
  Clock,
  AlertCircle,
  Eye,
  Lock,
  Download as DownloadIcon,
  ChevronRight,
  BookOpen,
  FileArchive,
  Loader2,
  Search,
  Sparkles,
  Filter,
  Send,
  Paperclip,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadFilesAsZip } from "@/lib/pdf-download";
import { publicChatSopWinDocumentAction } from "@/app/dashboard/sop-win/actions";

export type SopWinRequestAccessViewProps = {
  request: {
    id: number;
    requestNumber: string;
    requesterName: string;
    requesterDepartment: string;
    requestedDocType: string;
    procedureName: string;
    ownDepartment: string;
    requestDate: string;
    isExternal: boolean;
    externalCompany: string;
    externalName: string;
    requestReason: string;
    requestedDocCount: number;
    requestedDocTitleAndNumber: string;
    fileAttachmentUrl: string | null;
    requestType: string;
    expiryDays: number;
    accessExpiresAt: string | Date | null;
    canDownload?: boolean;
    accessToken?: string;
    status: string;
  };
  approvals: Array<{
    id: number;
    stepOrder: number;
    stepLabel: string;
    approverName: string;
    status: string;
    signatureDataUrl: string | null;
    remarks: string;
    signedAt: string | Date | null;
  }>;
  documentItems?: Array<{
    id: number;
    title: string;
    documentType: string;
    pdfUrl: string | null;
  }>;
  isExpired: boolean;
  autoDownload?: boolean;
};

export function SopWinRequestAccessView({
  request,
  approvals,
  documentItems,
  isExpired,
}: SopWinRequestAccessViewProps) {
  const [mobileTab, setMobileTab] = useState<"docs" | "preview" | "approvals">("preview");
  const [isZipping, setIsZipping] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Clean document list
  const docList = useMemo(() => {
    if (documentItems && documentItems.length > 0) {
      return documentItems.map((item, idx) => ({
        id: item.id || idx + 1,
        title: item.title,
        type: item.documentType || request.requestedDocType || "SOP",
        url: item.pdfUrl || request.fileAttachmentUrl || null,
      }));
    }
    if (!request.requestedDocTitleAndNumber) return [];
    const lines = request.requestedDocTitleAndNumber
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.map((line, idx) => ({
      id: idx + 1,
      title: line,
      type: request.requestedDocType || "SOP",
      url: request.fileAttachmentUrl || null,
    }));
  }, [request, documentItems]);

  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const activeDoc = selectedIndex === 999 ? {
    id: 999,
    title: "Form Permohonan Akses & Catatan Approval",
    type: "APPROVAL",
    url: null,
  } : (docList[selectedIndex] || docList[0] || {
    id: 1,
    title: request.requestedDocTitleAndNumber,
    type: request.requestedDocType,
    url: request.fileAttachmentUrl || null,
  });

  const expiresAtFormatted = request.accessExpiresAt
    ? new Date(request.accessExpiresAt).toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "-";

  // Dynamic Watermarked PDF Viewer URL (Stamps ALLOWED (NAMA INSTANSI) directly into every page of the PDF)
  const docIndexParam = selectedIndex === 999 ? "approval" : selectedIndex;
  const pdfViewerUrl = request.accessToken
    ? `/api/sop-win/watermarked-pdf?token=${encodeURIComponent(request.accessToken)}&docIndex=${docIndexParam}&t=${Date.now()}#toolbar=0&navpanes=0&scrollbar=1`
    : null;

  const handleSelectDoc = (idx: number) => {
    setSelectedIndex(idx);
    setMobileTab("preview");
  };

  const handleChatDokumen = (doc: { title: string; type: string }) => {
    setMobileTab("preview");
    setTimeout(() => {
      const el = document.getElementById("chatbot-widget");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);
  };

  // ZIP Download helper
  const handleDownloadZip = async () => {
    if (isZipping || isExpired || request.canDownload === false || !docList || docList.length === 0) return;
    setIsZipping(true);
    try {
      const filesToZip: Array<{ name: string; blob: Blob }> = [];
      for (let i = 0; i < docList.length; i++) {
        const doc = docList[i];
        const itemUrl = doc.url;
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
            const fileName = `${i + 1}. [${doc.type}] ${cleanTitle}.pdf`;
            filesToZip.push({ name: fileName, blob });
          }
        } catch (err) {
          console.error("ZIP fetch error:", err);
        }
      }

      if (filesToZip.length > 0) {
        const zipName = `Dokumen_SOP_WIN_${request.requestNumber || "HERO"}.zip`;
        await downloadFilesAsZip(filesToZip, zipName);
      }
    } catch (err) {
      console.error("ZIP Error:", err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased p-3 sm:p-5 lg:p-6 space-y-4 max-w-7xl mx-auto">
      {/* ── Minimalist Operational Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f172a] px-4 py-3.5 sm:px-6 sm:py-4 rounded-2xl text-white shadow-xs">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-xl bg-white/10 flex items-center justify-center text-slate-200 shrink-0">
            <ShieldCheck className="size-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white">
                Dokumen SOP / WIN #{request.requestNumber}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {request.status === "approved" ? "DISETUJUI" : request.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Pemohon: <span className="font-semibold text-white">{request.requesterName}</span> ({request.requesterDepartment || "Internal HERO"})
            </p>
          </div>
        </div>

        {/* Action Buttons: Unduh PDF & Unduh ZIP */}
        {!isExpired && (
          <div className="flex items-center gap-2 shrink-0">
            {request.canDownload === false ? (
              <span className="text-[11px] px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1.5">
                <Eye className="size-3.5" /> Hanya Lihat (View Only)
              </span>
            ) : (
              <>
                {activeDoc?.url && (
                  <Button
                    type="button"
                    size="sm"
                    asChild
                    className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold gap-1.5 border border-white/10"
                  >
                    <a href={pdfViewerUrl || activeDoc.url || "#"} target="_blank" download rel="noopener noreferrer">
                      <DownloadIcon className="size-3.5" />
                      UNDUH PDF
                    </a>
                  </Button>
                )}

                {docList.length > 1 && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={isZipping}
                    onClick={handleDownloadZip}
                    className="h-8 px-3 rounded-lg bg-white text-slate-900 hover:bg-slate-100 text-xs font-bold gap-1.5 shadow-2xs"
                  >
                    {isZipping ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <FileArchive className="size-3.5 text-slate-800" />
                    )}
                    UNDUH SEMUA (ZIP)
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Access Expiry Banner */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100/80 border border-slate-200/80 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-slate-500 shrink-0" />
          <span>
            Masa berlaku link: <strong className="text-slate-800">{expiresAtFormatted}</strong>
          </span>
        </div>
        {isExpired && (
          <span className="text-rose-700 font-bold flex items-center gap-1">
            <AlertCircle className="size-3.5" /> Link Kadaluarsa
          </span>
        )}
      </div>

      {/* Mobile Navigation Tabs */}
      <div className="flex lg:hidden bg-slate-200/60 p-1 rounded-xl text-xs font-medium">
        <button
          type="button"
          onClick={() => setMobileTab("docs")}
          className={`flex-1 py-1.5 px-3 rounded-lg transition-all ${
            mobileTab === "docs" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
          }`}
        >
          Dokumen ({docList.length})
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-1.5 px-3 rounded-lg transition-all ${
            mobileTab === "preview" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
          }`}
        >
          Pratinjau PDF
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("approvals")}
          className={`flex-1 py-1.5 px-3 rounded-lg transition-all ${
            mobileTab === "approvals" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-600"
          }`}
        >
          Persetujuan ({approvals.length})
        </button>
      </div>

      {/* ── Desktop View (lg:grid) ── */}
      <div className="hidden lg:grid grid-cols-12 gap-5 items-start">
        {/* Left Column (5 Cols) */}
        <div className="col-span-5 space-y-4">
          <CardDocumentList
            docList={docList}
            selectedIndex={selectedIndex}
            onSelect={handleSelectDoc}
            onChat={handleChatDokumen}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
          />
          <CardDetails request={request} />
          <CardApprovalHistory approvals={approvals} />
        </div>

        {/* Right Column - PDF Viewer & Inline AI Chatbot (7 Cols) */}
        <div className="col-span-7 space-y-4">
          <CardPdfViewer
            activeDoc={activeDoc}
            pdfViewerUrl={pdfViewerUrl}
            isExpired={isExpired}
            request={request}
            onChat={handleChatDokumen}
          />
        </div>
      </div>

      {/* ── Mobile View (lg:hidden) ── */}
      <div className="lg:hidden space-y-4">
        {mobileTab === "docs" && (
          <div className="space-y-4">
            <CardDocumentList
              docList={docList}
              selectedIndex={selectedIndex}
              onSelect={handleSelectDoc}
              onChat={handleChatDokumen}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
            />
            <CardDetails request={request} />
          </div>
        )}

        {mobileTab === "preview" && (
          <div className="space-y-3">
            <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-800 truncate">{activeDoc?.title}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileTab("docs")}
                className="h-7 text-xs font-medium text-slate-600"
              >
                Ganti Dokumen
              </Button>
            </div>
            <CardPdfViewer
              activeDoc={activeDoc}
              pdfViewerUrl={pdfViewerUrl}
              isExpired={isExpired}
              request={request}
              onChat={handleChatDokumen}
            />
          </div>
        )}

        {mobileTab === "approvals" && (
          <div className="space-y-4">
            <CardApprovalHistory approvals={approvals} />
            <CardDetails request={request} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-component: Clean Document List with Live Search & Type Filters ──
function CardDocumentList({
  docList,
  selectedIndex,
  onSelect,
  onChat,
  searchQuery,
  setSearchQuery,
  typeFilter,
  setTypeFilter,
}: {
  docList: Array<{ id: number; title: string; type: string; url: string | null }>;
  selectedIndex: number;
  onSelect: (idx: number) => void;
  onChat: (doc: { title: string; type: string }) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  typeFilter: string;
  setTypeFilter: (t: string) => void;
}) {
  const filteredDocList = useMemo(() => {
    return docList.filter((doc) => {
      if (typeFilter !== "ALL" && (doc.type || "").toUpperCase() !== typeFilter.toUpperCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          doc.title.toLowerCase().includes(q) ||
          (doc.type || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [docList, typeFilter, searchQuery]);

  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-2xs overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-4 py-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="size-3.5 text-slate-600" />
            Daftar Dokumen ({filteredDocList.length})
          </CardTitle>
          {typeFilter !== "ALL" && (
            <Badge variant="outline" className="text-[9px] font-mono font-bold bg-white text-slate-700">
              {typeFilter}
            </Badge>
          )}
        </div>

        {/* ── Search & Filter Controls ── */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <Input
              placeholder="Cari judul atau nomor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-white border-slate-200 rounded-xl"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 w-24 text-xs bg-white border-slate-200 rounded-xl font-medium shrink-0">
              <SelectValue placeholder="Tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">Semua</SelectItem>
              <SelectItem value="SOP" className="text-xs">SOP</SelectItem>
              <SelectItem value="WIN" className="text-xs">WIN</SelectItem>
              <SelectItem value="POL" className="text-xs">POL</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-2 space-y-1.5 text-xs max-h-[380px] overflow-y-auto">
        {filteredDocList.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Tidak ada dokumen yang cocok dengan pencarian/filter.
          </div>
        ) : (
          filteredDocList.map((doc) => {
            const originalIndex = docList.findIndex((d) => d.id === doc.id);
            const isSelected = originalIndex === selectedIndex;
            return (
              <div
                key={doc.id}
                onClick={() => onSelect(originalIndex >= 0 ? originalIndex : 0)}
                className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 ${
                  isSelected
                    ? "bg-slate-100 text-slate-900 font-semibold border border-slate-300/80"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-transparent"
                }`}
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    {doc.type}
                  </span>
                  <p className="text-xs line-clamp-2">{doc.title}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(originalIndex >= 0 ? originalIndex : 0);
                      onChat(doc);
                    }}
                    className="h-6 px-1.5 text-[10px] font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-md gap-1"
                    title="Tanya AI tentang dokumen ini"
                  >
                    <Sparkles className="size-3 text-amber-600" />
                    <span>Chat</span>
                  </Button>
                  <ChevronRight className={`size-3.5 shrink-0 ${isSelected ? "text-slate-900" : "text-slate-400"}`} />
                </div>
              </div>
            );
          })
        )}

        <div
          onClick={() => onSelect(999)}
          className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200/80 ${
            selectedIndex === 999
              ? "bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200 shadow-2xs"
              : "bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/60"
          }`}
        >
          <div className="space-y-0.5 min-w-0 flex-1">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block flex items-center gap-1">
              <ShieldCheck className="size-3 text-indigo-600" />
              FORM RESMI & PERSETUJUAN
            </span>
            <p className="text-xs font-medium">Form Permohonan Akses & Catatan Approval</p>
          </div>
          <ChevronRight className={`size-3.5 shrink-0 ${selectedIndex === 999 ? "text-indigo-900" : "text-slate-400"}`} />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Sub-component: Clean Request Details ──
function CardDetails({ request }: { request: SopWinRequestAccessViewProps["request"] }) {
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-2xs overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
        <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <FileText className="size-3.5 text-slate-600" />
          Detail Permintaan
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3 text-xs">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Alasan Keperluan</span>
          <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
            "{request.requestReason}"
          </p>
        </div>

        {request.isExternal && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[11px] space-y-0.5">
            <span className="font-bold block">Keperluan Eksternal</span>
            <p>{request.externalCompany} (PIC: {request.externalName})</p>
          </div>
        )}

        {request.fileAttachmentUrl && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-[11px] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Paperclip className="size-3.5 text-slate-600 shrink-0" />
              <span className="font-semibold text-slate-800 truncate">Lampiran Penunjang</span>
            </div>
            <a
              href={
                request.fileAttachmentUrl.startsWith("/api/uploads/")
                  ? request.fileAttachmentUrl
                  : request.fileAttachmentUrl.startsWith("/uploads/")
                  ? `/api/uploads${request.fileAttachmentUrl}`
                  : request.fileAttachmentUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              download
              className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-lg shrink-0 transition-colors"
            >
              Unduh Lampiran
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Sub-component: Clean Approval History ──
function CardApprovalHistory({ approvals }: { approvals: SopWinRequestAccessViewProps["approvals"] }) {
  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-2xs overflow-hidden">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
        <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="size-3.5 text-slate-600" />
          Status Persetujuan
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2 text-xs">
        {approvals.map((app) => (
          <div key={app.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span>Step {app.stepOrder}: {app.approverName}</span>
              <span className="text-[10px] text-emerald-700 font-bold uppercase">{app.status}</span>
            </div>
            <p className="text-[10px] text-slate-500">{app.stepLabel}</p>
            {app.remarks && <p className="text-[11px] text-slate-600 italic">"{app.remarks}"</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Sub-component: Clean PDF Viewer Panel with Embedded Hero Genius AI Chatbot ──
function CardPdfViewer({
  activeDoc,
  pdfViewerUrl,
  isExpired,
  request,
  onChat,
}: {
  activeDoc: { title: string; type: string; url: string | null };
  pdfViewerUrl: string | null;
  isExpired: boolean;
  request: SopWinRequestAccessViewProps["request"];
  onChat: (doc: { title: string; type: string }) => void;
}) {
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [isAskingAi, setIsAskingAi] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const targetInstancy = request.isExternal
    ? [request.externalCompany, request.externalName ? `(PIC: ${request.externalName})` : null].filter(Boolean).join(" ").trim() || "Eksternal"
    : (request.requesterDepartment || request.requesterName || "Internal HERO").trim();

  // Reset chat or greet when activeDoc changes
  useEffect(() => {
    setChatMessages([
      {
        role: "assistant",
        content: `Halo! Saya **Hero Genius AI Assistant**. Ada yang ingin Anda tanyakan mengenai dokumen **${activeDoc?.title || "ini"}**?`,
      },
    ]);
  }, [activeDoc?.title]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isAskingAi]);

  const handleSendChat = async (queryText: string) => {
    if (!queryText.trim() || isAskingAi) return;
    const userMsg = queryText.trim();
    setInputMsg("");

    const newHistory = [...chatMessages, { role: "user" as const, content: userMsg }];
    setChatMessages(newHistory);
    setIsAskingAi(true);

    try {
      const res = await publicChatSopWinDocumentAction({
        docTitle: activeDoc?.title || "Dokumen",
        message: userMsg,
        history: newHistory,
      });

      if (res.success && res.reply) {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.reply },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Dokumen "${activeDoc?.title}" memuat panduan operasional resmi. Silakan ajukan pertanyaan lain seputar K3, prosedur, atau persyaratan dokumen ini.`,
          },
        ]);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Maaf, terjadi kendala saat memproses jawaban AI. Informasi dokumen "${activeDoc?.title}" tetap dapat Anda baca pada pratinjau PDF di atas.`,
        },
      ]);
    } finally {
      setIsAskingAi(false);
    }
  };

  return (
    <Card className="rounded-2xl border-slate-200/80 bg-white shadow-2xs flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-slate-800 bg-[#0f172a] text-white flex items-center justify-between shrink-0">
        <div className="min-w-0 pr-2">
          <h3 className="text-xs font-semibold text-slate-200 truncate">
            {activeDoc?.title || "Pratinjau Dokumen"}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {activeDoc && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChat(activeDoc)}
              className="h-7 px-2.5 text-xs text-slate-200 hover:bg-white/10 hover:text-white rounded-lg gap-1.5 font-medium border border-white/10"
              title="Ke Chatbot AI Dokumen"
            >
              <Sparkles className="size-3.5 text-amber-300" />
              <span>Tanya AI</span>
            </Button>
          )}
        </div>
      </div>

      {/* Clean Document Viewer Container (Physical PDF Page Watermarking via pdf-lib in route.ts) */}
      <div className="h-[480px] sm:h-[540px] bg-slate-900 relative overflow-hidden select-none shrink-0">
        {!isExpired && pdfViewerUrl ? (
          <iframe
            src={pdfViewerUrl}
            className="w-full h-full border-0"
            title="PDF Preview"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-900 space-y-2">
            <Lock className="size-8 text-slate-600" />
            <p className="font-bold text-slate-300 text-xs">
              {isExpired ? "Akses Kadaluarsa" : "Dokumen Belum Tersedia"}
            </p>
          </div>
        )}
      </div>

      {/* ── Inline Hero Genius AI Chatbot Widget (Public Accessible, Embedded Below PDF) ── */}
      <div id="chatbot-widget" className="border-t border-slate-200 bg-slate-50 p-3.5 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-[#0f172a] text-amber-300 flex items-center justify-center shrink-0">
              <Sparkles className="size-3.5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800">
                Hero Genius AI Assistant
              </h4>
              <p className="text-[10px] text-slate-500 line-clamp-1">
                Tanya jawab AI seputar dokumen: <strong className="text-slate-700">{activeDoc?.title}</strong>
              </p>
            </div>
          </div>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active RAG AI
          </span>
        </div>

        {/* Chat Messages List */}
        <div
          ref={chatScrollRef}
          className="max-h-44 overflow-y-auto space-y-2 p-2.5 bg-white rounded-xl border border-slate-200/80 text-xs"
        >
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="size-5 rounded bg-[#0f172a] text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="size-3" />
                </div>
              )}
              <div
                className={`p-2.5 rounded-xl max-w-[85%] text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[#0f172a] text-white"
                    : "bg-slate-100 text-slate-800 border border-slate-200/60"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isAskingAi && (
            <div className="flex items-center gap-2 text-slate-500 text-xs py-1">
              <Loader2 className="size-3.5 animate-spin text-slate-700" />
              <span>Hero Genius sedang menganalisis dokumen...</span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
          <button
            type="button"
            onClick={() => handleSendChat("📌 Ringkas isi dan poin penting dari dokumen ini")}
            disabled={isAskingAi}
            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg shrink-0 transition-colors font-medium"
          >
            📌 Ringkas dokumen ini
          </button>
          <button
            type="button"
            onClick={() => handleSendChat("❓ Apa saja tujuan utama dari prosedur ini?")}
            disabled={isAskingAi}
            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg shrink-0 transition-colors font-medium"
          >
            ❓ Apa tujuan utama prosedur ini?
          </button>
          <button
            type="button"
            onClick={() => handleSendChat("🛡️ Sebutkan standar K3 & APD yang wajib dipatuhi")}
            disabled={isAskingAi}
            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg shrink-0 transition-colors font-medium"
          >
            🛡️ Standar K3 & APD
          </button>
        </div>

        {/* Chat Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inputMsg.trim()) handleSendChat(inputMsg.trim());
          }}
          className="flex items-center gap-2"
        >
          <Input
            placeholder={`Tanyakan sesuatu tentang ${activeDoc?.title || "dokumen ini"}...`}
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            disabled={isAskingAi}
            className="h-8 text-xs bg-white border-slate-200 rounded-xl flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isAskingAi || !inputMsg.trim()}
            className="h-8 px-3 rounded-xl bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-semibold gap-1 shrink-0"
          >
            <Send className="size-3.5" />
            <span>Kirim</span>
          </Button>
        </form>
      </div>
    </Card>
  );
}
