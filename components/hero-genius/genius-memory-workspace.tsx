"use client";

import { useState, useEffect } from "react";
import {
  Brain,
  PlusCircle,
  Search,
  CheckCircle2,
  Trash2,
  Clock,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Tag,
  BookOpen,
  Filter,
  Check,
  X,
  History,
  Lightbulb,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  deleteHeroGeniusLearnedFactAction,
  getHeroGeniusLearnedFactsAction,
  getHeroGeniusSessionMessagesAction,
  getHeroGeniusSessionsAction,
  learnHeroGeniusFactAction,
  toggleHeroGeniusLearnedFactAction,
} from "@/app/dashboard/hero-genius/actions";
import { MarkdownRenderer } from "./markdown-renderer";

const CATEGORIES = [
  "Semua Kategori",
  "SOP & Prosedur",
  "Ban & Spesifikasi Teknis",
  "HSE & Keselamatan Kerja",
  "Operasional & Logistik",
  "Kebijakan HR & Perusahaan",
  "General",
];

export function GeniusMemoryWorkspace() {
  // State for Learned Facts
  const [facts, setFacts] = useState<any[]>([]);
  const [isLoadingFacts, setIsLoadingFacts] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");
  const [searchQuery, setSearchQuery] = useState("");

  // Form State: Ajari AI
  const [newFact, setNewFact] = useState("");
  const [newCategory, setNewCategory] = useState("SOP & Prosedur");
  const [newSource, setNewSource] = useState("Self-Growth Manual Input");
  const [newTags, setNewTags] = useState("");
  const [isSubmittingFact, setIsSubmittingFact] = useState(false);

  // State for Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [activeSessionTitle, setActiveSessionTitle] = useState("");

  useEffect(() => {
    loadFacts();
    loadSessions();
  }, []);

  const loadFacts = async () => {
    setIsLoadingFacts(true);
    try {
      const res = await getHeroGeniusLearnedFactsAction();
      if (res.success) {
        setFacts(res.facts || []);
      }
    } catch (err) {
      console.error("Failed to load facts:", err);
    } finally {
      setIsLoadingFacts(false);
    }
  };

  const loadSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const res = await getHeroGeniusSessionsAction();
      if (res.success) {
        setSessions(res.sessions || []);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleCreateFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) {
      toast.error("Silakan masukkan isi fakta atau aturan baru!");
      return;
    }

    setIsSubmittingFact(true);
    const parsedTags = newTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await learnHeroGeniusFactAction({
        fact: newFact.trim(),
        category: newCategory,
        source: newSource.trim() || "Self-Growth Manual Input",
        tags: parsedTags,
      });

      if (res.success) {
        toast.success("Fakta baru berhasil dipelajari oleh Hero Genius!");
        setNewFact("");
        setNewTags("");
        loadFacts();
      } else {
        toast.error(res.error || "Gagal menyimpan fakta");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setIsSubmittingFact(false);
    }
  };

  const handleToggleFact = async (id: number, currentActive: boolean) => {
    try {
      const res = await toggleHeroGeniusLearnedFactAction(id, !currentActive);
      if (res.success) {
        setFacts((prev) =>
          prev.map((f) => (f.id === id ? { ...f, is_active: !currentActive } : f))
        );
        toast.success(res.message);
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah status");
    }
  };

  const handleDeleteFact = async (id: number) => {
    if (!confirm("Hapus fakta ini dari memori Hero Genius?")) return;
    try {
      const res = await deleteHeroGeniusLearnedFactAction(id);
      if (res.success) {
        setFacts((prev) => prev.filter((f) => f.id !== id));
        toast.success("Fakta berhasil dihapus dari memori.");
      } else {
        toast.error(res.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus fakta");
    }
  };

  const handleViewSessionMessages = async (sessionItem: any) => {
    setActiveSessionId(sessionItem.id);
    setActiveSessionTitle(sessionItem.title || "Detail Percakapan");
    setSessionModalOpen(true);
    setIsLoadingMessages(true);

    try {
      const res = await getHeroGeniusSessionMessagesAction(sessionItem.id);
      if (res.success) {
        setSessionMessages(res.messages || []);
      } else {
        toast.error(res.error || "Gagal memuat pesan sesi");
      }
    } catch (err: any) {
      toast.error(err.message || "Error saat memuat sesi");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const filteredFacts = facts.filter((f) => {
    const matchCategory =
      categoryFilter === "Semua Kategori" || f.category === categoryFilter;
    const matchQuery =
      !searchQuery.trim() ||
      f.fact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.source && f.source.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchQuery;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-blue-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-indigo-700 dark:text-indigo-400">
              Memori & Fakta Pintar
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Brain className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {facts.length}
            </span>
            <span className="text-xs text-slate-500">
              ({facts.filter((f) => f.is_active).length} Aktif di Prompt)
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-400">
              Self-Growth Learning
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Sparkles className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              100%
            </span>
            <span className="text-xs text-slate-500">Auto-Feedback & Rules Ready</span>
          </div>
        </div>

        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/70 to-slate-50/40 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-sky-700 dark:text-sky-400">
              Riwayat Sesi Percakapan
            </span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-sky-600 text-white shadow-xs">
              <History className="size-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {sessions.length}
            </span>
            <span className="text-xs text-slate-500">Sesi Tercatat</span>
          </div>
        </div>
      </div>

      {/* Main Dual-Column Layout: Left = Sessions, Right = Smart Memory & Learn Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): Riwayat Sesi Chat */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 flex flex-col h-[740px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <History className="size-4 text-[#003461]" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Riwayat Sesi Chat
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadSessions}
              className="size-7 p-0 text-slate-400 hover:text-slate-600"
              title="Muat Ulang Sesi"
            >
              <RefreshCw className={`size-3.5 ${isLoadingSessions ? "animate-spin" : ""}`} />
            </Button>
          </div>

          <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
            Daftar percakapan yang pernah dilakukan bersama Hero Genius. Klik sesi untuk melihat histori lengkap.
          </p>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {isLoadingSessions ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw className="size-5 mx-auto animate-spin mb-2 text-blue-600" />
                Memuat riwayat sesi...
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <MessageSquare className="size-8 mx-auto stroke-1 text-slate-300 mb-1.5" />
                Belum ada sesi percakapan tercatat.
              </div>
            ) : (
              sessions.map((sess) => (
                <button
                  key={sess.id}
                  type="button"
                  onClick={() => handleViewSessionMessages(sess)}
                  className="w-full text-left rounded-xl border border-slate-100 bg-slate-50/60 p-3 hover:bg-blue-50/50 hover:border-blue-200 transition-all dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-blue-900 group"
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-blue-700 dark:text-slate-200 truncate">
                      {sess.title || "Percakapan"}
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono shrink-0">
                      {sess.message_count || 0} msg
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="truncate max-w-[140px] font-mono">
                      ID: {sess.id.substring(0, 10)}...
                    </span>
                    <span>
                      {new Date(sess.last_active_at || sess.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Column (8 cols): Self-Growth Form & Learned Facts Inspector */}
        <div className="lg:col-span-8 space-y-6">
          {/* Quick Form: Ajari AI Fakta Baru */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/40 to-white p-5 shadow-sm dark:border-blue-950 dark:bg-slate-950">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-[#003461] text-white">
                  <Lightbulb className="size-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Ajari AI Fakta & Aturan Baru (Self-Growth Input)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Input aturan, fakta operasional, atau pengetahuan baru secara langsung tanpa perlu upload file PDF.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateFact} className="space-y-3.5">
              <div>
                <textarea
                  rows={3}
                  value={newFact}
                  onChange={(e) => setNewFact(e.target.value)}
                  placeholder="Contoh: Tekanan angin standar ban loader tipe Michelin XLDD2 26.5R25 di area site Vale adalah 75 PSI."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Kategori Pengetahuan:
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="SOP & Prosedur">SOP & Prosedur</option>
                    <option value="Ban & Spesifikasi Teknis">Ban & Spesifikasi Teknis</option>
                    <option value="HSE & Keselamatan Kerja">HSE & Keselamatan Kerja</option>
                    <option value="Operasional & Logistik">Operasional & Logistik</option>
                    <option value="Kebijakan HR & Perusahaan">Kebijakan HR & Perusahaan</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Sumber / PIC Validasi:
                  </label>
                  <Input
                    type="text"
                    placeholder="Contoh: Head of Technical / Pak Budi"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Tags (pisahkan koma):
                  </label>
                  <Input
                    type="text"
                    placeholder="tekanan, loader, michelin"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  disabled={isSubmittingFact || !newFact.trim()}
                  size="sm"
                  className="bg-[#003461] hover:bg-[#002647] text-white gap-2 font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
                >
                  {isSubmittingFact ? (
                    <>
                      <RefreshCw className="size-3.5 animate-spin" />
                      Menyimpan ke Memori AI...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="size-3.5" />
                      Ajarkan ke Hero Genius
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Table / Inspector: Daftar Memori yang Sudah Dipelajari */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Brain className="size-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Daftar Memori & Fakta Terpelajar ({filteredFacts.length})
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <div className="relative w-full sm:w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Cari fakta..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs rounded-lg"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadFacts}
                  className="size-8 p-0"
                  title="Refresh"
                >
                  <RefreshCw className={`size-3.5 ${isLoadingFacts ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Facts List */}
            <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto dark:divide-slate-800/80">
              {isLoadingFacts ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <RefreshCw className="size-5 mx-auto animate-spin mb-2 text-indigo-600" />
                  Memuat memori AI...
                </div>
              ) : filteredFacts.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Brain className="size-8 mx-auto stroke-1 text-slate-300 mb-1" />
                  <p className="text-xs font-semibold text-slate-600">Belum ada memori yang cocok</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Gunakan form di atas untuk mengajari AI fakta pertama Anda!
                  </p>
                </div>
              ) : (
                filteredFacts.map((fact) => (
                  <div
                    key={fact.id}
                    className="p-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-indigo-50 text-indigo-700 border-none text-[10px] font-bold dark:bg-indigo-950 dark:text-indigo-300">
                          {fact.category}
                        </Badge>
                        {fact.source && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            Sumber: {fact.source}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-300">•</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(fact.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-slate-800 leading-relaxed dark:text-slate-200">
                        {fact.fact}
                      </p>

                      {fact.tags && fact.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {fact.tags.map((tag: string, i: number) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            >
                              <Tag className="size-2.5" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-start pt-1 sm:pt-0">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Switch
                          checked={fact.is_active}
                          onCheckedChange={() => handleToggleFact(fact.id, fact.is_active)}
                          title={fact.is_active ? "Nonaktifkan dari prompt" : "Aktifkan ke prompt"}
                        />
                        <span className="text-[11px] font-semibold">
                          {fact.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFact(fact.id)}
                        className="size-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        title="Hapus Fakta"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Session Messages Inspector Modal */}
      <Dialog open={sessionModalOpen} onOpenChange={setSessionModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <MessageSquare className="size-4 text-blue-600" />
              {activeSessionTitle}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Histori percakapan lengkap dari sesi: <code className="font-mono">{activeSessionId}</code>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
            {isLoadingMessages ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw className="size-5 mx-auto animate-spin mb-2 text-blue-600" />
                Memuat pesan sesi...
              </div>
            ) : sessionMessages.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                Tidak ada pesan ditemukan pada sesi ini.
              </p>
            ) : (
              sessionMessages.map((msg, idx) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={idx}
                    className={`rounded-xl p-3 text-xs leading-relaxed ${
                      isUser
                        ? "bg-[#003461] text-white ml-8"
                        : "bg-slate-50 border border-slate-200 text-slate-900 mr-8 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 opacity-75 text-[10px]">
                      <span className="font-bold uppercase tracking-wider">
                        {isUser ? "Pengguna" : "Hero Genius"}
                      </span>
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <MarkdownRenderer content={msg.content} />
                    {msg.feedback_rating && (
                      <div className="mt-2 pt-1 border-t border-slate-200/50 flex items-center gap-1.5 text-[10px] text-amber-700 dark:text-amber-400">
                        <span>Feedback: {msg.feedback_rating === "up" ? "👍 Positif" : "👎 Negatif"}</span>
                        {msg.feedback_correction && (
                          <span>• Koreksi: "{msg.feedback_correction}"</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
