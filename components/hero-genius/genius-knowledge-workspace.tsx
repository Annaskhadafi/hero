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
  const [isAiRestructuring, setIsAiRestructuring] = useState(false);

  // Semantic Search Sandbox State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<RagSearchResultItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ filename: string; url: string } | null>(null);

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
    setChunksDialogOpen(true);
    setIsLoadingChunks(true);

    try {
      const res = await getHeroGeniusDocumentChunksAction(docId);
      if (res.success) {
        setActiveDocChunks(res.chunks || []);
      } else {
        toast.error(res.error || "Gagal mengambil chunks");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal memuat chunks");
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
                              url: doc.s3_url || doc.local_url || "",
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

            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3 bg-slate-50/50">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-slate-800">Auto OCR Processing</Label>
                <p className="text-[11px] text-slate-500">
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
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-6">
              <div>
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                  <Layers className="size-4 text-indigo-600 dark:text-indigo-400" />
                  Chunks Vektor: {activeDocName}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Daftar potongan teks yang terindeks di pgvector untuk pencarian semantik.
                </DialogDescription>
              </div>

              {canManageDocuments && activeDocChunks.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAiRestructureDocument}
                  disabled={isAiRestructuring || isLoadingChunks}
                  className="h-8 text-xs font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm gap-1.5 shrink-0"
                >
                  {isAiRestructuring ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      Restrukturisasi AI...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5 text-amber-300" />
                      AI Clean & Restructure
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
            {isLoadingChunks ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="mx-auto size-6 animate-spin text-indigo-600" />
                <p className="text-xs">Memuat data chunks...</p>
              </div>
            ) : activeDocChunks.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Tidak ada chunk ditemukan.</p>
            ) : (
              activeDocChunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="font-semibold text-slate-700">
                      Chunk #{chunk.chunk_index} {chunk.heading ? `• ${chunk.heading}` : ""}
                    </span>
                    <span className="font-mono text-[10px]">
                      {chunk.char_count || chunk.content.length} Karakter
                    </span>
                  </div>
                  <div className="rounded bg-white p-2.5 text-slate-700 leading-relaxed whitespace-pre-wrap border border-slate-100 font-sans">
                    {chunk.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Secure Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          filename={previewDoc.filename}
          url={previewDoc.url}
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
