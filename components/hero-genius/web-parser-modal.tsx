"use client";

import { useState, useEffect } from "react";
import {
  Globe,
  Sparkles,
  Layers,
  FileCode,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Database,
  RefreshCw,
  Copy,
  Check,
  Hash,
  SlidersHorizontal,
  Info,
  ListTree,
  FileText,
  History,
  Edit3,
  Trash2,
  Search,
  FileEdit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  parseWebUrlPreviewAction,
  parseBatchWebUrlsAction,
  ingestWebUrlToKnowledgeBaseAction,
  cleanMarkdownWithAiAction,
  getWebCrawlHistoryAction,
  updateWebCrawlHistoryAction,
  deleteWebCrawlHistoryAction,
} from "@/app/dashboard/hero-genius/actions";
import type { ParsedWebResult, BatchParseResult } from "@/lib/hero-genius/web-parser";

interface WebParserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIngestSuccess?: (data: any) => void;
}

const PRESET_URLS = [
  {
    label: "Next.js Docs (Fast)",
    url: "https://nextjs.org/docs",
  },
  {
    label: "Wikipedia (Example)",
    url: "https://id.wikipedia.org/wiki/Kecerdasan_buatan",
  },
  {
    label: "Rust Lang Org",
    url: "https://www.rust-lang.org/learn",
  },
];

export function WebParserModal({
  open,
  onOpenChange,
  onIngestSuccess,
}: WebParserModalProps) {
  const [ingestMode, setIngestMode] = useState<"single" | "batch" | "history">("single");

  // Single Mode State
  const [url, setUrl] = useState("");
  const [chunkSize, setChunkSize] = useState<number>(800);
  const [chunkOverlap, setChunkOverlap] = useState<number>(120);
  const [autoAiClean, setAutoAiClean] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isAiCleaning, setIsAiCleaning] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedWebResult | null>(null);
  const [editedMarkdown, setEditedMarkdown] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"chunks" | "markdown" | "raw">("chunks");

  // Batch Mode State
  const [batchUrlsText, setBatchUrlsText] = useState("");
  const [batchResult, setBatchResult] = useState<BatchParseResult | null>(null);
  const [isBatchParsing, setIsBatchParsing] = useState(false);
  const [isBatchIngesting, setIsBatchIngesting] = useState(false);
  const [batchIngestProgress, setBatchIngestProgress] = useState<{
    current: number;
    total: number;
  }>({ current: 0, total: 0 });

  // History Mode State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMarkdown, setEditMarkdown] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await getWebCrawlHistoryAction(historySearch);
      if (res.success && res.data) {
        setHistoryList(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load history:", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (open && ingestMode === "history") {
      fetchHistory();
    }
  }, [open, ingestMode, historySearch]);

  const handleLoadHistoryToEditor = (item: any) => {
    setUrl(item.url);
    setCustomTitle(item.title);
    setEditedMarkdown(item.markdown);
    setParsedData({
      url: item.url,
      title: item.title,
      description: item.description || undefined,
      siteName: item.siteName || undefined,
      markdown: item.markdown,
      rawText: item.markdown.replace(/[#*`_\[\]()>-]/g, " ").replace(/\s+/g, " ").trim(),
      charCount: item.charCount || item.markdown.length,
      wordCount: item.wordCount || 0,
      estimatedTokens: Math.ceil((item.charCount || item.markdown.length) / 4),
      headings: (item.markdown.match(/^(#{1,4})\s+(.+)$/gm) || []).map((h: string) => h.trim()),
      chunks: [],
      scrapedAt: item.createdAt || new Date().toISOString(),
      isAiEnhanced: item.isAiEnhanced,
      modelUsed: item.modelUsed,
    });
    setIngestMode("single");
    setActiveTab("markdown");
    toast.info(`Memuat "${item.title}" ke editor`);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditMarkdown(item.markdown);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    if (!editTitle.trim() || !editMarkdown.trim()) {
      toast.error("Judul dan isi markdown tidak boleh kosong");
      return;
    }

    setIsSavingEdit(true);
    try {
      const res = await updateWebCrawlHistoryAction({
        id: editingItem.id,
        title: editTitle.trim(),
        markdown: editMarkdown.trim(),
      });

      if (res.success && res.data) {
        setHistoryList((prev) =>
          prev.map((it) => (it.id === editingItem.id ? res.data : it))
        );
        toast.success("Riwayat web parsing berhasil diperbarui!");
        setEditingItem(null);
      } else {
        toast.error(res.error || "Gagal memperbarui riwayat");
      }
    } catch (err: any) {
      toast.error(err.message || "Error saat memperbarui riwayat");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteHistory = async (id: number, title: string) => {
    setDeletingId(id);
    try {
      const res = await deleteWebCrawlHistoryAction(id);
      if (res.success) {
        setHistoryList((prev) => prev.filter((it) => it.id !== id));
        toast.success(`"${title}" berhasil dihapus dari riwayat`);
      } else {
        toast.error(res.error || "Gagal menghapus riwayat");
      }
    } catch (err: any) {
      toast.error(err.message || "Error saat menghapus riwayat");
    } finally {
      setDeletingId(null);
    }
  };

  const handleIngestFromHistory = async (item: any) => {
    try {
      toast.info(`Meng-ingest "${item.title}" ke Knowledge Base...`);
      const res = await ingestWebUrlToKnowledgeBaseAction({
        url: item.url,
        title: item.title,
        markdownContent: item.markdown,
      });

      if (res.success) {
        toast.success(`"${item.title}" berhasil masuk Knowledge Base!`);
        setHistoryList((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, ingestedToKnowledgeBase: true } : it
          )
        );
        if (onIngestSuccess) onIngestSuccess(res.data);
      } else {
        toast.error(res.error || "Gagal meng-ingest dokumen");
      }
    } catch (err: any) {
      toast.error(err.message || "Error saat meng-ingest");
    }
  };

  const handleSingleParse = async (targetUrl?: string) => {
    const rawUrl = targetUrl || url;
    if (!rawUrl.trim()) {
      toast.error("Masukkan URL web yang valid (http:// atau https://)");
      return;
    }

    setIsParsing(true);
    try {
      const res = await parseWebUrlPreviewAction(rawUrl.trim(), {
        chunkSize,
        chunkOverlap,
        enableAiClean: autoAiClean,
      });

      if (res.success && res.data) {
        setParsedData(res.data);
        setEditedMarkdown(res.data.markdown);
        setCustomTitle(res.data.title || "Web Document");
        const msg = res.data.isAiEnhanced
          ? `✨ Auto AI Clean & Structuring selesai! (${res.data.chunks.length} chunks siap RAG)`
          : `Berhasil mengekstrak ${res.data.chunks.length} chunks dari web!`;
        toast.success(msg);
      } else {
        toast.error(res.error || "Gagal mem-parsing web");
      }
    } catch (err: any) {
      toast.error(err.message || "Kesalahan saat menghubungi parser");
    } finally {
      setIsParsing(false);
    }
  };

  const handleManualAiClean = async () => {
    if (!editedMarkdown.trim()) {
      toast.error("Tidak ada konten markdown untuk dibersihkan");
      return;
    }

    setIsAiCleaning(true);
    try {
      const res = await cleanMarkdownWithAiAction(editedMarkdown, {
        docTitle: customTitle || parsedData?.title || "Dokumen",
        chunkSize,
        chunkOverlap,
      });

      if (res.success && res.data) {
        setEditedMarkdown(res.data.cleanMarkdown);
        if (parsedData) {
          setParsedData({
            ...parsedData,
            markdown: res.data.cleanMarkdown,
            chunks: res.data.chunks,
            wordCount: res.data.wordCount,
            charCount: res.data.charCount,
            estimatedTokens: res.data.estimatedTokens,
            isAiEnhanced: true,
            modelUsed: res.data.modelUsed,
          });
        }
        toast.success(`✨ Berhasil dibersihkan & direstrukturisasi dengan AI (${res.data.chunks.length} chunks)!`);
      } else {
        toast.error(res.error || "Gagal membersihkan markdown");
      }
    } catch (err: any) {
      toast.error(err.message || "Error saat membersihkan markdown");
    } finally {
      setIsAiCleaning(false);
    }
  };

  const handleSingleIngest = async () => {
    if (!parsedData || !editedMarkdown.trim()) {
      toast.error("Tidak ada konten markdown untuk di-ingest");
      return;
    }

    setIsIngesting(true);
    try {
      const res = await ingestWebUrlToKnowledgeBaseAction({
        url: parsedData.url,
        title: customTitle.trim() || parsedData.title,
        markdownContent: editedMarkdown,
      });

      if (res.success) {
        toast.success(res.message || "Berhasil di-ingest ke Knowledge Base!");
        if (onIngestSuccess) {
          onIngestSuccess(res);
        }
        onOpenChange(false);
      } else {
        toast.error(res.error || "Gagal meng-ingest dokumen");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat ingest");
    } finally {
      setIsIngesting(false);
    }
  };

  const handleBatchParse = async () => {
    const urls = batchUrlsText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.startsWith("http://") || u.startsWith("https://"));

    if (urls.length === 0) {
      toast.error("Masukkan minimal satu URL valid (diawali http:// atau https://) per baris!");
      return;
    }

    setIsBatchParsing(true);
    try {
      const res = await parseBatchWebUrlsAction(urls, { chunkSize, chunkOverlap });
      if (res.success && res.data) {
        setBatchResult(res.data);
        toast.success(
          `Selesai: ${res.data.successCount} berhasil (${res.data.totalChunks} chunks), ${res.data.failureCount} gagal.`
        );
      } else {
        toast.error(res.error || "Gagal memproses batch URL");
      }
    } catch (err: any) {
      toast.error(err.message || "Error saat batch parse");
    } finally {
      setIsBatchParsing(false);
    }
  };

  const handleBatchIngestAll = async () => {
    if (!batchResult || batchResult.successCount === 0) {
      toast.error("Tidak ada dokumen yang berhasil di-parse untuk di-ingest.");
      return;
    }

    const itemsToIngest = batchResult.items.filter((it) => it.success && it.data);
    setIsBatchIngesting(true);
    setBatchIngestProgress({ current: 0, total: itemsToIngest.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < itemsToIngest.length; i++) {
      const item = itemsToIngest[i];
      setBatchIngestProgress({ current: i + 1, total: itemsToIngest.length });

      try {
        const res = await ingestWebUrlToKnowledgeBaseAction({
          url: item.url,
          title: item.data!.title,
          markdownContent: item.data!.markdown,
        });

        if (res.success) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setIsBatchIngesting(false);
    toast.success(`Batch Ingestion selesai: ${successCount} berhasil masuk Knowledge Base!`);
    if (onIngestSuccess) {
      onIngestSuccess({ batch: true, successCount });
    }
    onOpenChange(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Tersalin ke clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <Globe className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Web Parser & Smart Chunking
                  <Badge
                    variant="secondary"
                    className="text-[10px] uppercase font-bold tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  >
                    100% Free • No API
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Ekstrak halaman web & dokumentasi langsung ke Clean Markdown & RAG Chunks.
                </DialogDescription>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl shrink-0 gap-0.5">
              <button
                type="button"
                onClick={() => setIngestMode("single")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  ingestMode === "single"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Single URL
              </button>
              <button
                type="button"
                onClick={() => setIngestMode("batch")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  ingestMode === "batch"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                Batch Multi-URLs
              </button>
              <button
                type="button"
                onClick={() => setIngestMode("history")}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  ingestMode === "history"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <History className="size-3.5" />
                <span>Riwayat Parsing</span>
                {historyList.length > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    {historyList.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* SINGLE URL MODE */}
          {ingestMode === "single" && (
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Web URL
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      type="url"
                      placeholder="https://example.com/artikel-atau-dokumentasi"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSingleParse();
                        }
                      }}
                      className="pl-9 h-10 rounded-xl"
                      disabled={isParsing || isIngesting}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleSingleParse()}
                    disabled={isParsing || !url.trim() || isIngesting}
                    className="h-10 px-5 rounded-xl bg-[#003461] hover:bg-[#002647] text-white text-xs font-semibold shadow-sm shrink-0 gap-2"
                  >
                    {isParsing ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        Memproses Web...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4 text-amber-300" />
                        Parse & Preview
                      </>
                    )}
                  </Button>
                </div>

                {/* Presets & Config Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                    <span className="text-[11px] font-medium">Preset Cepat:</span>
                    {PRESET_URLS.map((p) => (
                      <button
                        key={p.url}
                        type="button"
                        onClick={() => {
                          setUrl(p.url);
                          handleSingleParse(p.url);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <SlidersHorizontal className="size-3" />
                    {showAdvanced ? "Sembunyikan Pengaturan Chunk" : "Konfigurasi Chunking"}
                  </button>
                </div>

                {/* Advanced Settings */}
                {showAdvanced && (
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-in fade-in duration-200">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Target Ukuran Chunk (Karakter)
                      </Label>
                      <Input
                        type="number"
                        value={chunkSize}
                        onChange={(e) => setChunkSize(Number(e.target.value))}
                        min={200}
                        max={3000}
                        step={100}
                        className="h-8 text-xs bg-white dark:bg-slate-950"
                      />
                      <p className="text-[10px] text-slate-500">Ideal 500-1000 karakter (~125-250 token).</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Chunk Overlap (Karakter)
                      </Label>
                      <Input
                        type="number"
                        value={chunkOverlap}
                        onChange={(e) => setChunkOverlap(Number(e.target.value))}
                        min={0}
                        max={500}
                        step={20}
                        className="h-8 text-xs bg-white dark:bg-slate-950"
                      />
                      <p className="text-[10px] text-slate-500">Mencegah hilangnya konteks di batas potongan.</p>
                    </div>

                    <div className="sm:col-span-2 pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-semibold text-[11px] text-slate-800 dark:text-slate-200">
                          <Sparkles className="size-3.5 text-amber-500" />
                          Auto AI Clean & Structure Markdown
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Otomatis membuang teks navigasi web & menyusun spesifikasi menjadi tabel rapi sebelum di-chunk.
                        </p>
                      </div>
                      <Switch
                        checked={autoAiClean}
                        onCheckedChange={setAutoAiClean}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Single Results Area */}
              {parsedData && (
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Judul Dokumen</span>
                        {parsedData.isAiEnhanced && (
                          <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-[10px] gap-1 h-5 font-semibold">
                            <Sparkles className="size-3 text-amber-500" />
                            AI Cleaned & Structured
                          </Badge>
                        )}
                      </div>
                      <Input
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        className="h-8 text-sm font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950"
                        placeholder="Judul Dokumen..."
                      />
                      <a
                        href={parsedData.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate pt-0.5"
                      >
                        {parsedData.url}
                        <ExternalLink className="size-3 shrink-0" />
                      </a>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <div className="text-center px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <div className="text-base font-black text-blue-600 dark:text-blue-400">
                          {parsedData.chunks.length}
                        </div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                          Chunks
                        </div>
                      </div>
                      <div className="text-center px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <div className="text-base font-black text-slate-800 dark:text-slate-200">
                          {parsedData.wordCount.toLocaleString()}
                        </div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                          Kata
                        </div>
                      </div>
                      <div className="text-center px-3 py-1.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <div className="text-base font-black text-indigo-600 dark:text-indigo-400">
                          ~{parsedData.estimatedTokens.toLocaleString()}
                        </div>
                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                          Est. Token
                        </div>
                      </div>
                    </div>
                  </div>

                  <Tabs
                    value={activeTab}
                    onValueChange={(val) => setActiveTab(val as any)}
                    className="w-full"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <TabsList className="bg-slate-100 dark:bg-slate-900 h-9 p-1 rounded-xl">
                        <TabsTrigger
                          value="chunks"
                          className="h-7 text-xs font-semibold rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 gap-1.5"
                        >
                          <Layers className="size-3.5 text-indigo-500" />
                          Visualisasi Chunks ({parsedData.chunks.length})
                        </TabsTrigger>
                        <TabsTrigger
                          value="markdown"
                          className="h-7 text-xs font-semibold rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-950 gap-1.5"
                        >
                          <FileCode className="size-3.5 text-blue-500" />
                          Clean Markdown Editor
                        </TabsTrigger>
                      </TabsList>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleManualAiClean}
                          disabled={isAiCleaning || isParsing}
                          className="h-8 text-xs gap-1.5 rounded-lg border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950 font-semibold"
                        >
                          {isAiCleaning ? (
                            <>
                              <RefreshCw className="size-3.5 animate-spin" />
                              Membersihkan...
                            </>
                          ) : (
                            <>
                              <Sparkles className="size-3.5 text-amber-500" />
                              AI Re-Clean
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(editedMarkdown)}
                          className="h-8 text-xs gap-1.5 rounded-lg"
                        >
                          {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                          {copied ? "Tersalin" : "Copy Markdown"}
                        </Button>
                      </div>
                    </div>

                    <TabsContent value="chunks" className="pt-3">
                      <ScrollArea className="h-[300px] rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/30">
                        <div className="space-y-3">
                          {parsedData.chunks.map((chunk) => (
                            <div
                              key={chunk.chunkIndex}
                              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 transition-all hover:border-blue-200 dark:hover:border-blue-900"
                            >
                              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-[#003461] hover:bg-[#003461] text-white text-[10px] font-bold px-2 h-5">
                                    Chunk #{chunk.chunkIndex}
                                  </Badge>
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {chunk.heading}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                  <span>{chunk.charCount} chars</span>
                                  <span>•</span>
                                  <span>~{chunk.estimatedTokens} tokens</span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 font-mono whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                {chunk.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="markdown" className="pt-3">
                      <div className="space-y-2">
                        <Textarea
                          value={editedMarkdown}
                          onChange={(e) => setEditedMarkdown(e.target.value)}
                          rows={13}
                          className="font-mono text-xs leading-relaxed resize-none rounded-xl p-3 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                          placeholder="Markdown content..."
                        />
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Info className="size-3" />
                          Anda dapat mengedit teks markdown di atas sebelum memasukkannya ke RAG Knowledge Base.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </div>
          )}

          {/* BATCH URL MODE */}
          {ingestMode === "batch" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Daftar URL Web (1 URL per baris)</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Mendukung scraping paralel hingga puluhan link
                  </span>
                </Label>
                <Textarea
                  value={batchUrlsText}
                  onChange={(e) => setBatchUrlsText(e.target.value)}
                  placeholder={`https://domain.com/docs/page-1\nhttps://domain.com/docs/page-2\nhttps://domain.com/blog/article-3`}
                  rows={6}
                  className="font-mono text-xs rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                  disabled={isBatchParsing || isBatchIngesting}
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500">
                    {
                      batchUrlsText
                        .split("\n")
                        .map((u) => u.trim())
                        .filter((u) => u.startsWith("http")).length
                    }{" "}
                    URL valid terdeteksi
                  </span>
                  <Button
                    type="button"
                    onClick={handleBatchParse}
                    disabled={isBatchParsing || isBatchIngesting || !batchUrlsText.trim()}
                    className="h-9 px-5 rounded-xl bg-[#003461] hover:bg-[#002647] text-white text-xs font-semibold shadow-sm gap-2"
                  >
                    {isBatchParsing ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        Scraping Batch...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4 text-amber-300" />
                        Parse Semua URL
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Batch Results List */}
              {batchResult && (
                <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        Hasil Batch: {batchResult.total} URL
                      </span>
                      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200">
                        {batchResult.successCount} Sukses ({batchResult.totalChunks} Chunks)
                      </Badge>
                      {batchResult.failureCount > 0 && (
                        <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200">
                          {batchResult.failureCount} Gagal
                        </Badge>
                      )}
                    </div>
                  </div>

                  <ScrollArea className="h-[260px] rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/30">
                    <div className="space-y-2">
                      {batchResult.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs gap-3"
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="font-bold text-slate-800 dark:text-slate-200 truncate flex items-center gap-2">
                              <FileText className="size-3.5 text-blue-500 shrink-0" />
                              {item.data?.title || item.url}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">{item.url}</div>
                          </div>

                          <div className="shrink-0 flex items-center gap-2">
                            {item.success ? (
                              <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[10px]">
                                {item.data?.chunks.length} Chunks
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-[10px]">
                                Error: {item.error || "Failed"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* HISTORY MODE */}
          {ingestMode === "history" && (
            <div className="space-y-4">
              {/* Search & Stats Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    placeholder="Cari riwayat berdasarkan judul atau URL..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-9 h-8 text-xs bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchHistory}
                    disabled={isLoadingHistory}
                    className="h-8 text-xs gap-1.5 rounded-lg"
                  >
                    <RefreshCw className={`size-3.5 ${isLoadingHistory ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Badge variant="outline" className="text-xs">
                    Total: {historyList.length} Item
                  </Badge>
                </div>
              </div>

              {/* History List */}
              {isLoadingHistory ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <RefreshCw className="mx-auto size-6 animate-spin text-blue-600" />
                  <p className="text-xs font-semibold">Memuat riwayat web parsing...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <History className="mx-auto size-8 text-slate-300 dark:text-slate-700" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Belum ada riwayat web parsing
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Setiap halaman web yang Anda ekstrak melalui Single URL atau Batch akan otomatis tercatat di sini.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[480px] pr-2">
                  <div className="space-y-3">
                    {historyList.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70 shadow-sm space-y-3 hover:border-blue-300 dark:hover:border-blue-800 transition-colors"
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                {item.title}
                              </h4>
                              {item.isAiEnhanced && (
                                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-[9px] gap-1 h-4 font-semibold">
                                  <Sparkles className="size-2.5 text-amber-500" />
                                  AI Cleaned
                                </Badge>
                              )}
                              {item.ingestedToKnowledgeBase ? (
                                <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 text-[9px] gap-1 h-4 font-semibold">
                                  <CheckCircle2 className="size-2.5 text-blue-500" />
                                  Ingested ke RAG
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] text-slate-400 h-4">
                                  Draft / Belum Di-ingest
                                </Badge>
                              )}
                            </div>

                            <a
                              href={item.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                            >
                              {item.url}
                              <ExternalLink className="size-3 shrink-0" />
                            </a>

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                              <span>📅 {new Date(item.createdAt).toLocaleString("id-ID")}</span>
                              <span>📝 {item.wordCount?.toLocaleString() || 0} Kata</span>
                              <span>🧩 {item.totalChunks || 0} Chunks</span>
                            </div>
                          </div>

                          {/* Item Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleLoadHistoryToEditor(item)}
                              className="h-8 text-xs gap-1.5 rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300"
                            >
                              <FileEdit className="size-3.5" />
                              <span>Buka di Editor</span>
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditModal(item)}
                              className="h-8 text-xs gap-1.5 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300"
                            >
                              <Edit3 className="size-3.5" />
                              <span>Edit</span>
                            </Button>

                            {!item.ingestedToKnowledgeBase && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleIngestFromHistory(item)}
                                className="h-8 text-xs gap-1.5 rounded-lg bg-[#003461] hover:bg-[#002647] text-white"
                              >
                                <Database className="size-3.5 text-emerald-400" />
                                <span>Ingest</span>
                              </Button>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteHistory(item.id, item.title)}
                              disabled={deletingId === item.id}
                              className="h-8 size-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg"
                              title="Hapus dari riwayat"
                            >
                              {deletingId === item.id ? (
                                <RefreshCw className="size-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="size-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between sm:justify-between">
          <div className="text-xs text-slate-500">
            {ingestMode === "single" && parsedData && (
              <span>
                Siap di-embed dengan model <strong className="text-slate-700 dark:text-slate-300">BAAI/bge-small-en</strong>
              </span>
            )}
            {ingestMode === "batch" && batchResult && (
              <span>
                {isBatchIngesting
                  ? `Meng-ingest dokumen ${batchIngestProgress.current} dari ${batchIngestProgress.total}...`
                  : `${batchResult.successCount} dokumen siap di-ingest sekaligus`}
              </span>
            )}
            {ingestMode === "history" && (
              <span>
                Riwayat web parsing tersimpan secara persisten di database.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isIngesting || isBatchIngesting}
              className="h-9 rounded-xl text-xs"
            >
              Tutup
            </Button>

            {ingestMode === "single" ? (
              <Button
                type="button"
                onClick={handleSingleIngest}
                disabled={!parsedData || isIngesting || !editedMarkdown.trim()}
                className="h-9 px-5 rounded-xl bg-[#003461] hover:bg-[#002647] text-white text-xs font-semibold shadow-sm gap-2"
              >
                {isIngesting ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Meng-ingest...
                  </>
                ) : (
                  <>
                    <Database className="size-4 text-emerald-400" />
                    Ingest ke Knowledge Base
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </Button>
            ) : ingestMode === "batch" ? (
              <Button
                type="button"
                onClick={handleBatchIngestAll}
                disabled={!batchResult || batchResult.successCount === 0 || isBatchIngesting}
                className="h-9 px-5 rounded-xl bg-[#003461] hover:bg-[#002647] text-white text-xs font-semibold shadow-sm gap-2"
              >
                {isBatchIngesting ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Meng-ingest ({batchIngestProgress.current}/{batchIngestProgress.total})...
                  </>
                ) : (
                  <>
                    <Database className="size-4 text-emerald-400" />
                    Ingest Semua ({batchResult?.successCount || 0} Dokumen)
                    <ArrowRight className="size-3.5" />
                  </>
                )}
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Edit History Item Modal */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[88vh] flex flex-col z-[10000]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Edit3 className="size-4 text-blue-600" />
                Edit Riwayat Web Parsing
              </DialogTitle>
              <DialogDescription className="text-xs">
                Perbarui judul atau isi konten Markdown hasil parsing.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 flex-1 overflow-y-auto">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Judul Dokumen</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-semibold">Konten Markdown</Label>
                <Textarea
                  value={editMarkdown}
                  onChange={(e) => setEditMarkdown(e.target.value)}
                  className="min-h-[300px] font-mono text-xs leading-relaxed"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingItem(null)}
                disabled={isSavingEdit}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="bg-[#003461] hover:bg-[#002647] text-white gap-2 font-semibold"
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    Simpan Perubahan
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
