"use client";

import { useState } from "react";
import {
  UploadCloud,
  FileText,
  Trash2,
  Search,
  Layers,
  Database,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Cpu,
  RefreshCw,
  Eye,
  FileUp,
  Sliders,
  Lock,
  Globe,
  Sparkles,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Expand,
  LayoutList,
  BookOpen,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  deleteHeroGeniusDocumentAction,
  getHeroGeniusDocumentChunksAction,
  ingestHeroGeniusDocumentAction,
  searchHeroGeniusKnowledgeAction,
  resyncWebDocumentAction,
  aiRestructureDocumentAction,
} from "@/app/dashboard/hero-genius/actions";
import { DocumentPreviewModal } from "./document-preview-modal";
import { WebParserModal } from "./web-parser-modal";
import { MarkdownRenderer } from "./markdown-renderer";
import {
  resolveRagDocumentUrl,
  type RagChunkItem,
  type RagDocumentItem,
  type RagSearchResultItem,
} from "@/lib/hero-genius/client";

interface GeniusKnowledgeWorkspaceProps {
  initialDocuments: RagDocumentItem[];
  engineInfo?: any;
  redisInfo?: any;
  canManageDocuments?: boolean;
  onRefresh?: () => void;
}

export function GeniusKnowledgeWorkspace({
  initialDocuments = [],
  engineInfo,
  redisInfo,
  canManageDocuments = false,
  onRefresh,
}: GeniusKnowledgeWorkspaceProps) {
  const [documents, setDocuments] = useState<RagDocumentItem[]>(initialDocuments);
  const [searchFilter, setSearchFilter] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [autoOcr, setAutoOcr] = useState(true);
  const [autoAiCleanDoc, setAutoAiCleanDoc] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [webParserOpen, setWebParserOpen] = useState(false);

  // Re-Sync Modal State
  const [resyncDialogOpen, setResyncDialogOpen] = useState(false);
  const [resyncDoc, setResyncDoc] = useState<RagDocumentItem | null>(null);
  const [resyncUrl, setResyncUrl] = useState("");
  const [isResyncing, setIsResyncing] = useState(false);

  // Chunks Modal State
  const [chunksDialogOpen, setChunksDialogOpen] = useState(false);
  const [activeDocChunks, setActiveDocChunks] = useState<RagChunkItem[]>([]);
  const [activeDocName, setActiveDocName] = useState("");
  const [activeDocId, setActiveDocId] = useState("");
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const [chunksError, setChunksError] = useState<string | null>(null);
  const [chunkSearch, setChunkSearch] = useState("");
  const [isAiRestructuring, setIsAiRestructuring] = useState(false);
  const [isFullscreenChunks, setIsFullscreenChunks] = useState(false);
  const [chunksViewMode, setChunksViewMode] = useState<"cards" | "document">("cards");
  const [chunkFormatMode, setChunkFormatMode] = useState<"formatted" | "raw">("formatted");
  const [selectedChunkForFullView, setSelectedChunkForFullView] = useState<RagChunkItem | null>(null);
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);
  const [copiedAllChunks, setCopiedAllChunks] = useState(false);

  const handleCopyChunk = (chunk: RagChunkItem) => {
    navigator.clipboard.writeText(chunk.content);
    setCopiedChunkId(chunk.id);
    toast.success(`Chunk #${chunk.chunk_index} berhasil disalin!`);
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  const handleCopyAllChunks = () => {
    const combined = activeDocChunks.map((c) => c.content).join("\n\n---\n\n");
    navigator.clipboard.writeText(combined);
    setCopiedAllChunks(true);
    toast.success("Seluruh teks chunks berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedAllChunks(false), 2000);
  };

  // Semantic Search Sandbox State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<RagSearchResultItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    filename: string;
    url: string;
    format?: string | null;
  } | null>(null);

  // Filtered documents
  const filteredDocs = documents.filter((doc) =>
    doc.filename.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Pilih file dokumen (.pdf / .docx / .xlsx / gambar) terlebih dahulu!");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("auto_ocr", autoOcr ? "true" : "false");
    formData.append("enable_ai_clean", autoAiCleanDoc ? "true" : "false");

    try {
      const res = await ingestHeroGeniusDocumentAction(formData);
      if (res.success) {
        toast.success(res.message || "Dokumen berhasil di-ingest ke pgvector!");
        setUploadDialogOpen(false);
        setSelectedFile(null);
        if (onRefresh) onRefresh();
        // Optimistic addition
        if (res.data) {
          setDocuments((prev) => [
            {
              id: res.data!.document_id,
              filename: res.data!.filename,
              format: res.data!.format || "pdf",
              s3_url: res.data!.s3_url,
              char_count: res.data!.char_count || 0,
              word_count: res.data!.word_count || 0,
              total_chunks: res.data!.total_chunks || 0,
              engine_used: "anydoc_native",
              embedding_model: "BAAI/bge-small-en-v1.5",
              created_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      } else {
        toast.error(res.error || "Gagal memproses dokumen");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, filename: string) => {
    if (!confirm(`Hapus dokumen "${filename}" beserta seluruh embedding vektornya?`)) {
      return;
    }

    try {
      const res = await deleteHeroGeniusDocumentAction(docId);
      if (res.success) {
        toast.success("Dokumen berhasil dihapus dari Knowledge Base");
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
      } else {
        toast.error(res.error || "Gagal menghapus dokumen");
      }
    } catch (err: any) {
      toast.error(err.message || "Kesalahan saat menghapus");
    }
  };

  const handleOpenResync = (doc: RagDocumentItem) => {
    setResyncDoc(doc);
    const existingUrl = doc.s3_url && doc.s3_url.startsWith("http") ? doc.s3_url : "";
    setResyncUrl(existingUrl);
    setResyncDialogOpen(true);
  };

  const handleResyncSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resyncDoc || !resyncUrl.trim()) {
      toast.error("Masukkan URL web yang valid untuk re-sync!");
      return;
    }

    setIsResyncing(true);
    try {
      const res = await resyncWebDocumentAction({
        documentId: resyncDoc.id,
        url: resyncUrl.trim(),
        customTitle: resyncDoc.filename.replace(/\.md$/, ""),
      });

      if (res.success) {
        toast.success(res.message || "Dokumen berhasil di-resync dengan konten web terbaru!");
        setResyncDialogOpen(false);
        if (onRefresh) onRefresh();
        if (res.data) {
          setDocuments((prev) =>
            prev.map((d) =>
              d.id === resyncDoc.id
                ? {
                    ...d,
                    id: res.data!.document_id,
                    char_count: res.data!.char_count || d.char_count,
                    total_chunks: res.data!.total_chunks || d.total_chunks,
                    created_at: new Date().toISOString(),
                  }
                : d
            )
          );
        }
      } else {
        toast.error(res.error || "Gagal melakukan re-sync dokumen");
      }
    } catch (err: any) {
      toast.error(err.message || "Error saat re-sync dokumen");
    } finally {
      setIsResyncing(false);
    }
  };

  const handleViewChunks = async (docId: string, filename: string) => {
    setActiveDocId(docId);
    setActiveDocName(filename);
    setActiveDocChunks([]);
    setChunksError(null);
    setChunkSearch("");
    setChunksDialogOpen(true);
    setIsLoadingChunks(true);

    try {
      const res = await getHeroGeniusDocumentChunksAction(docId);
      if (res.success && Array.isArray(res.chunks)) {
        setActiveDocChunks(res.chunks);
        if (res.chunks.length === 0) {
          setChunksError("Tidak ada potongan teks yang ditemukan untuk dokumen ini.");
        }
      } else {
        const err = res.error || "Gagal mengambil chunks dari backend RAG";
        setChunksError(err);
        toast.error(err);
      }
    } catch (err: any) {
      const errorMsg = err.message || "Gagal memuat chunks";
      setChunksError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  const handleAiRestructureDocument = async () => {
    if (!activeDocId) return;
    setIsAiRestructuring(true);
    try {
      const res = await aiRestructureDocumentAction({
        documentId: activeDocId,
        customTitle: activeDocName,
      });

      if (res.success) {
        toast.success(res.message || "Dokumen berhasil dibersihkan & direstrukturisasi dengan AI!");
        setChunksDialogOpen(false);
        if (onRefresh) onRefresh();
        if (res.data) {
          setDocuments((prev) => [
            {
              id: res.data!.document_id,
              filename: res.data!.filename || res.filename || "ai_cleaned_doc.md",
              format: "md",
              s3_url: res.data!.s3_url,
              char_count: res.data!.char_count || 0,
              word_count: res.data!.word_count || 0,
              total_chunks: res.data!.total_chunks || 0,
              engine_used: "ai_clean_structurer",
              embedding_model: "BAAI/bge-small-en-v1.5",
              created_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      } else {
        toast.error(res.error || "Gagal merestrukturisasi dokumen dengan AI");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat AI restructure");
    } finally {
      setIsAiRestructuring(false);
    }
  };

  const handleSemanticSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const res = await searchHeroGeniusKnowledgeAction(searchQuery.trim(), 4);
      if (res.success) {
        setSearchResults(res.results || []);
      } else {
        toast.error(res.error || "Pencarian gagal");
      }
    } catch (err: any) {
      toast.error(err.message || "Error saat mencari");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Engine Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Dokumen
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <FileText className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {documents.length}
            </span>
            <span className="text-xs text-slate-500">File Ingested</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Vektor Chunks
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Layers className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {documents.reduce((acc, d) => acc + (d.total_chunks || 0), 0)}
            </span>
            <span className="text-xs text-slate-500">pgvector rows</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Embedding Model
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Database className="size-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate block">
              {engineInfo?.model_name || "bge-small-en-v1.5"}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Dimensi {engineInfo?.vector_dimension || 384} (Cosine)
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Engine LLM
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <Cpu className="size-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate block">
              {engineInfo?.active_llm || "Groq LPU Qwen 27B"}
            </span>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">
              Fast Context Retrieval
            </span>
          </div>
        </div>
      </div>

      {/* Main Knowledge Base Documents Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari nama dokumen..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9 h-9 rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {canManageDocuments ? (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setWebParserOpen(true)}
                  variant="outline"
                  className="h-9 gap-1.5 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950 text-xs font-semibold shadow-sm"
                >
                  <Globe className="size-4 text-blue-600 dark:text-blue-400" />
                  Parse Web URL
                </Button>
                <Button
                  onClick={() => setUploadDialogOpen(true)}
                  className="h-9 gap-1.5 rounded-lg bg-[#003461] hover:bg-[#002647] text-white shadow-sm text-xs font-semibold"
                >
                  <FileUp className="size-4" />
                  Ingest Dokumen Baru
                </Button>
              </div>
            ) : (
              <Badge
                variant="outline"
                className="h-9 px-3 text-xs text-slate-500 bg-slate-50 gap-1.5 font-medium border-dashed dark:bg-slate-900 dark:text-slate-400"
              >
                <Lock className="size-3 text-slate-400" />
                Ingest Dokumen (Hanya Super Admin)
              </Badge>
            )}
          </div>
        </div>

        {/* Documents Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-xs uppercase font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
              <tr>
                <th className="px-5 py-3">Nama Dokumen</th>
                <th className="px-4 py-3">Format</th>
                <th className="px-4 py-3">Total Chunks</th>
                <th className="px-4 py-3">Karakter</th>
                <th className="px-4 py-3">Tanggal Ingest</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <FileText className="mx-auto size-10 stroke-1 text-slate-300 mb-2" />
                    <p className="font-medium text-sm text-slate-600 dark:text-slate-300">
                      Belum ada dokumen yang cocok
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {canManageDocuments
                        ? 'Klik "Ingest Dokumen Baru" untuk menambahkan referensi RAG'
                        : 'Hubungi Super Admin untuk menambahkan dokumen referensi RAG'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
                          <FileText className="size-4" />
                        </div>
                        <div className="min-w-0 max-w-sm truncate">
                          <span className="truncate block font-semibold">{doc.filename}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ID: {doc.id.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="outline" className="uppercase font-mono text-[10px]">
                        {doc.format || "PDF"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-none font-bold">
                        {doc.total_chunks} Chunks
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">
                      {(doc.char_count || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {new Date(doc.created_at).toLocaleDateString("id-ID", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1">
                      {resolveRagDocumentUrl(doc.s3_url || doc.local_url) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPreviewDoc({
                              filename: doc.filename,
                              url: resolveRagDocumentUrl(doc.s3_url || doc.local_url) || doc.s3_url || doc.local_url || "",
                              format: doc.format,
                            });
                          }}
                          className="h-8 px-2.5 text-xs text-slate-600 hover:text-sky-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Pratinjau Dokumen"
                        >
                          <Eye className="size-3.5 mr-1" />
                          <span className="hidden md:inline">Pratinjau</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewChunks(doc.id, doc.filename)}
                        className="h-8 px-2.5 text-xs text-slate-600 hover:text-blue-600"
                        title="Lihat Chunks Vektor"
                      >
                        <Eye className="size-3.5 mr-1" />
                        Chunks
                      </Button>
                      {canManageDocuments &&
                        (doc.filename.endsWith(".md") ||
                          doc.format === "md" ||
                          doc.engine_used === "web_parser" ||
                          doc.s3_url?.startsWith("http")) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenResync(doc)}
                            className="h-8 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                            title="Re-Sync Konten Web Terbaru"
                          >
                            <RefreshCw className="size-3.5 mr-1" />
                            Re-Sync
                          </Button>
                        )}
                      {canManageDocuments && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                          className="h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50"
                          title="Hapus Dokumen"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Semantic Vector Search Sandbox */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sliders className="size-4 text-[#003461]" />
            Semantic Vector Search Sandbox
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Uji pencarian langsung ke database pgvector menggunakan algoritma cosine similarity embedding.
          </p>
        </div>

        <form onSubmit={handleSemanticSearch} className="flex gap-2">
          <Input
            type="text"
            placeholder="Ketik kata kunci atau pertanyaan semantik (contoh: ukuran ban radial, prosedur PTW)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 rounded-xl h-10"
          />
          <Button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="h-10 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs gap-1.5"
          >
            {isSearching ? <RefreshCw className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
            Cari Vektor
          </Button>
        </form>

        {hasSearched && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 border-b pb-2">
              <span>Hasil Pencarian ({searchResults.length} Match)</span>
            </div>

            {searchResults.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                Tidak ada chunk yang memenuhi ambang batas relevansi.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {searchResults.map((res, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-2 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="size-3.5 text-sky-600 shrink-0" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {res.filename}
                        </span>
                      </div>
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold shrink-0">
                        {(res.similarity_score * 100).toFixed(1)}% Match
                      </Badge>
                    </div>
                    {res.heading && (
                      <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Heading: {res.heading}
                      </p>
                    )}
                    <div className="max-h-32 overflow-y-auto rounded bg-white p-2 text-xs leading-relaxed text-slate-600 dark:bg-slate-950 dark:text-slate-300 font-sans whitespace-pre-wrap border border-slate-100 dark:border-slate-800">
                      {res.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <UploadCloud className="size-5 text-[#003461]" />
              Ingest Dokumen ke Knowledge Base
            </DialogTitle>
            <DialogDescription className="text-xs">
              Upload file dokumen (PDF, Word, Excel, Gambar). Server akan mengekstrak teks, membuat chunks, dan menghasilkan vector embeddings ke pgvector.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Pilih File Dokumen</Label>
              <Input
                type="file"
                accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="cursor-pointer text-xs"
                required
              />
              {selectedFile && (
                <p className="text-[11px] text-slate-500">
                  Ukuran: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-indigo-100 dark:border-indigo-900/60 p-3 bg-indigo-50/50 dark:bg-indigo-950/30">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-950 dark:text-indigo-200">
                  <Sparkles className="size-3.5 text-amber-500" />
                  Auto AI Clean & Structuring
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Otomatis membersihkan teks SOP/WIN, merapikan tabel & heading sebelum chunking & embedding
                </p>
              </div>
              <Switch checked={autoAiCleanDoc} onCheckedChange={setAutoAiCleanDoc} />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">Auto OCR Processing</Label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ekstrak teks otomatis dari scan PDF dan foto dokumen
                </p>
              </div>
              <Switch checked={autoOcr} onCheckedChange={setAutoOcr} />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUploadDialogOpen(false)}
                disabled={isUploading}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isUploading || !selectedFile}
                className="bg-[#003461] hover:bg-[#002647] text-white gap-2 font-semibold"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    Sedang Meng-ingest & Embedding...
                  </>
                ) : (
                  <>
                    <UploadCloud className="size-3.5" />
                    Mulai Ingest Dokumen
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Chunks Modal */}
      <Dialog open={chunksDialogOpen} onOpenChange={setChunksDialogOpen}>
        <DialogContent
          className={`transition-all duration-200 flex flex-col p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-3xl border-slate-200 dark:border-slate-800 ${
            isFullscreenChunks
              ? "w-[98vw] max-w-[98vw] h-[95vh]"
              : "w-[95vw] sm:max-w-4xl lg:max-w-5xl h-[90vh]"
          }`}
        >
          {/* Top Header */}
          <DialogHeader className="p-4 border-b border-slate-200 dark:border-slate-800 bg-[#003461] text-white flex flex-col gap-3 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="min-w-0 pr-2">
                <DialogTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-white truncate">
                  <Layers className="size-4 text-sky-300 shrink-0" />
                  <span className="truncate">Chunks Vektor: {activeDocName}</span>
                  {activeDocChunks.length > 0 && (
                    <Badge className="bg-sky-500/20 text-sky-200 border-none text-[10px] font-mono shrink-0">
                      {activeDocChunks.length} Chunks
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-blue-200/80 mt-0.5">
                  Potongan teks terindeks di pgvector untuk pencarian semantik RAG.
                </DialogDescription>
              </div>

              {/* Header Action Controls */}
              <div className="flex items-center flex-wrap gap-1.5 shrink-0">
                {/* View Mode Toggle: Cards vs Full Document */}
                {activeDocChunks.length > 0 && (
                  <div className="flex items-center bg-white/10 p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setChunksViewMode("cards")}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                        chunksViewMode === "cards"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-white/80 hover:text-white"
                      }`}
                      title="Tampilan Kartu Per-Chunk"
                    >
                      <LayoutList className="size-3" />
                      <span>Kartu Chunks</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setChunksViewMode("document")}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                        chunksViewMode === "document"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-white/80 hover:text-white"
                      }`}
                      title="Tampilan Dokumen Utuh Tanpa Terpotong"
                    >
                      <BookOpen className="size-3" />
                      <span>Dokumen Utuh</span>
                    </button>
                  </div>
                )}

                {/* Copy All Chunks */}
                {activeDocChunks.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyAllChunks}
                    className="h-7 text-[11px] gap-1 rounded-lg text-white/90 hover:bg-white/20 hover:text-white"
                    title="Salin Seluruh Isi Chunks ke Clipboard"
                  >
                    {copiedAllChunks ? (
                      <Check className="size-3 text-emerald-300" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    <span className="hidden sm:inline">Salin Semua</span>
                  </Button>
                )}

                {/* AI Restructure Trigger */}
                {canManageDocuments && activeDocChunks.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAiRestructureDocument}
                    disabled={isAiRestructuring || isLoadingChunks}
                    className="h-7 text-[11px] font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm gap-1.5"
                    title="Bersihkan teks OCR/dokumen mentah dan rapikan menjadi tabel Markdown dengan AI"
                  >
                    {isAiRestructuring ? (
                      <>
                        <RefreshCw className="size-3 animate-spin" />
                        Restrukturisasi AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3 text-amber-200" />
                        <span>AI Clean & Restructure</span>
                      </>
                    )}
                  </Button>
                )}

                {/* Refresh Chunks */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewChunks(activeDocId, activeDocName)}
                  disabled={isLoadingChunks}
                  className="size-7 p-0 text-white/80 hover:bg-white/20 hover:text-white rounded-lg"
                  title="Muat Ulang Chunks"
                >
                  <RefreshCw className={`size-3.5 ${isLoadingChunks ? "animate-spin" : ""}`} />
                </Button>

                {/* Fullscreen / Maximize Toggle */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreenChunks(!isFullscreenChunks)}
                  className="size-7 p-0 text-white/80 hover:bg-white/20 hover:text-white rounded-lg"
                  title={isFullscreenChunks ? "Kecilkan Tampilan" : "Perbesar Penuh (Fullscreen)"}
                >
                  {isFullscreenChunks ? (
                    <Minimize2 className="size-3.5" />
                  ) : (
                    <Maximize2 className="size-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Quick Filter Search & Format Mode */}
            {activeDocChunks.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 border-t border-white/10">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-slate-400" />
                  <Input
                    placeholder="Cari atau filter isi chunks..."
                    value={chunkSearch}
                    onChange={(e) => setChunkSearch(e.target.value)}
                    className="pl-8 h-7 text-xs bg-white text-slate-900 placeholder:text-slate-400 border-none dark:bg-slate-900 dark:text-white"
                  />
                </div>

                {chunksViewMode === "cards" && (
                  <div className="flex items-center gap-1 text-[11px] text-white/80 shrink-0">
                    <span>Format Kartu:</span>
                    <button
                      type="button"
                      onClick={() => setChunkFormatMode("formatted")}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        chunkFormatMode === "formatted"
                          ? "bg-white text-slate-900 font-bold"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      Rapi (Markdown)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChunkFormatMode("raw")}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        chunkFormatMode === "raw"
                          ? "bg-white text-slate-900 font-bold"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      Mentah (Raw)
                    </button>
                  </div>
                )}
              </div>
            )}
          </DialogHeader>

          {/* Modal Content Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100/70 dark:bg-slate-950 space-y-4">
            {isLoadingChunks ? (
              <div className="py-20 text-center text-slate-400 space-y-3">
                <RefreshCw className="mx-auto size-7 animate-spin text-blue-600" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Memuat data chunks dari pgvector...
                </p>
              </div>
            ) : chunksError ? (
              <div className="py-16 text-center text-slate-400 space-y-3 max-w-md mx-auto">
                <AlertCircle className="mx-auto size-10 text-rose-500" />
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Gagal Memuat Chunks
                </p>
                <p className="text-xs text-slate-500">{chunksError}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewChunks(activeDocId, activeDocName)}
                  className="mt-2 text-xs gap-1.5 rounded-lg"
                >
                  <RefreshCw className="size-3.5" />
                  Coba Lagi
                </Button>
              </div>
            ) : activeDocChunks.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Layers className="mx-auto size-8 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                  Tidak ada chunk ditemukan.
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Dokumen mungkin belum selesai diproses atau sedang dalam antrean embedding.
                </p>
              </div>
            ) : chunksViewMode === "document" ? (
              /* FULL DOCUMENT UNIFIED VIEW */
              <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-sm space-y-6">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {activeDocName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Rekonstruksi {activeDocChunks.length} chunks menjadi dokumen utuh
                    </p>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-mono text-xs">
                    {activeDocChunks.reduce((acc, c) => acc + (c.char_count || c.content.length), 0).toLocaleString()} Karakter
                  </Badge>
                </div>

                <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm">
                  {activeDocChunks.map((chunk) => (
                    <div key={chunk.id} className="relative group my-4 pt-2">
                      <div className="flex items-center gap-2 mb-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                          § Chunk #{chunk.chunk_index}
                        </span>
                        {chunk.heading && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                            {chunk.heading}
                          </span>
                        )}
                      </div>
                      <div className="pl-3 border-l-2 border-slate-200 dark:border-slate-800 group-hover:border-blue-400 transition-colors">
                        <MarkdownRenderer content={chunk.content} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* CARDS VIEW */
              <div className="space-y-4 max-w-5xl mx-auto">
                {activeDocChunks
                  .filter((chunk) =>
                    !chunkSearch ||
                    chunk.content.toLowerCase().includes(chunkSearch.toLowerCase()) ||
                    (chunk.heading && chunk.heading.toLowerCase().includes(chunkSearch.toLowerCase()))
                  )
                  .map((chunk) => (
                    <div
                      key={chunk.id}
                      className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm p-4 sm:p-5 space-y-3 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
                    >
                      {/* Card Top Info & Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="bg-[#003461] text-white text-[10px] font-mono px-2 py-0.5">
                            Chunk #{chunk.chunk_index}
                          </Badge>
                          {chunk.heading && (
                            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                              {chunk.heading}
                            </span>
                          )}
                          <Badge variant="outline" className="text-[10px] text-slate-400 font-mono">
                            {chunk.char_count || chunk.content.length} Karakter
                          </Badge>
                          {chunk.token_count && (
                            <Badge variant="secondary" className="text-[10px] font-mono">
                              ~{chunk.token_count} Tokens
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyChunk(chunk)}
                            className="h-7 text-[11px] gap-1 px-2.5 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
                            title="Salin isi potongan ini"
                          >
                            {copiedChunkId === chunk.id ? (
                              <Check className="size-3 text-emerald-600" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                            <span>{copiedChunkId === chunk.id ? "Tersalin" : "Salin"}</span>
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedChunkForFullView(chunk)}
                            className="h-7 text-[11px] gap-1 px-2.5 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 font-semibold"
                            title="Lihat teks secara utuh dalam layar besar"
                          >
                            <Expand className="size-3" />
                            <span>Full View</span>
                          </Button>
                        </div>
                      </div>

                      {/* Card Body Content */}
                      <div className="rounded-xl bg-slate-50 dark:bg-slate-950 p-4 border border-slate-100 dark:border-slate-800 overflow-x-auto">
                        {chunkFormatMode === "formatted" ? (
                          <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed select-text">
                            <MarkdownRenderer content={chunk.content} />
                          </div>
                        ) : (
                          <pre className="font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-text">
                            {chunk.content}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Single Chunk Dedicated Full View Modal */}
      {selectedChunkForFullView && (
        <Dialog
          open={!!selectedChunkForFullView}
          onOpenChange={(open) => !open && setSelectedChunkForFullView(null)}
        >
          <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl sm:rounded-3xl border-slate-200 dark:border-slate-800 z-[10000]">
            <DialogHeader className="p-4 border-b border-slate-200 dark:border-slate-800 bg-[#003461] text-white flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
                  <Layers className="size-4 text-sky-300" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-sm font-bold text-white truncate">
                    Detail Chunk #{selectedChunkForFullView.chunk_index}: {activeDocName}
                  </DialogTitle>
                  <p className="text-[11px] text-blue-200/80">
                    {selectedChunkForFullView.char_count || selectedChunkForFullView.content.length} Karakter • {selectedChunkForFullView.heading || "General"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyChunk(selectedChunkForFullView)}
                  className="h-8 text-xs gap-1.5 rounded-lg border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  {copiedChunkId === selectedChunkForFullView.id ? (
                    <Check className="size-3.5 text-emerald-300" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  <span>Salin Teks</span>
                </Button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-950 space-y-4">
              <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 select-text">
                <MarkdownRenderer content={selectedChunkForFullView.content} />
              </div>
            </div>

            <DialogFooter className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedChunkForFullView(null)}
                className="h-8 text-xs"
              >
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Secure Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          filename={previewDoc.filename}
          url={previewDoc.url}
          format={previewDoc.format}
        />
      )}

      {/* Re-Sync Web Document Dialog */}
      <Dialog open={resyncDialogOpen} onOpenChange={setResyncDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <RefreshCw className="size-4 text-blue-600" />
              Re-Sync Dokumen Web
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tarik konten terbaru dari URL web asli dan perbarui seluruh vektor embedding di pgvector.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResyncSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nama Dokumen</Label>
              <Input
                value={resyncDoc?.filename || ""}
                disabled
                className="h-9 text-xs bg-slate-50 dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">URL Sumber Web</Label>
              <Input
                type="url"
                value={resyncUrl}
                onChange={(e) => setResyncUrl(e.target.value)}
                placeholder="https://example.com/artikel"
                required
                className="h-9 text-xs font-mono"
                disabled={isResyncing}
              />
              <p className="text-[11px] text-slate-500">
                Sistem akan mengikis ulang halaman web ini, membuat clean markdown baru, dan memperbarui database vektor.
              </p>
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResyncDialogOpen(false)}
                disabled={isResyncing}
                className="h-9 text-xs rounded-xl"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isResyncing || !resyncUrl.trim()}
                className="h-9 px-4 text-xs font-semibold rounded-xl bg-[#003461] hover:bg-[#002647] text-white gap-2 shadow-sm"
              >
                {isResyncing ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    Memperbarui Vektor...
                  </>
                ) : (
                  <>
                    <RefreshCw className="size-3.5" />
                    Mulai Re-Sync
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Web Parser & Smart Chunking Modal */}
      <WebParserModal
        open={webParserOpen}
        onOpenChange={setWebParserOpen}
        onIngestSuccess={(res) => {
          if (onRefresh) onRefresh();
          if (res?.data) {
            setDocuments((prev) => [
              {
                id: res.data.document_id || `doc-${Date.now()}`,
                filename: res.data.filename || res.filename || "web_article.md",
                format: "md",
                s3_url: res.data.s3_url,
                char_count: res.data.char_count || 0,
                word_count: res.data.word_count || 0,
                total_chunks: res.data.total_chunks || 0,
                engine_used: "web_parser",
                embedding_model: "BAAI/bge-small-en-v1.5",
                created_at: new Date().toISOString(),
              },
              ...prev,
            ]);
          }
        }}
      />
    </div>
  );
}
