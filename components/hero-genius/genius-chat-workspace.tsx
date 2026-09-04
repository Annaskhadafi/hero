"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  Zap,
  BookOpen,
  ArrowDown,
  RefreshCw,
  Cpu,
  Layers,
  FileText,
  X,
  ThumbsUp,
  ThumbsDown,
  MessageSquarePlus,
  Lightbulb,
  PlusCircle,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { SourceCitations } from "./source-citations";
import { MarkdownRenderer } from "./markdown-renderer";
import { AttachedImagesGallery } from "./attached-images-gallery";
import type { RagSourceItem, RagAttachedImageItem } from "@/lib/hero-genius/client";
import {
  learnHeroGeniusFactAction,
  sendHeroGeniusFeedbackAction,
} from "@/app/dashboard/hero-genius/actions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: RagSourceItem[];
  attached_images?: RagAttachedImageItem[];
  latency_ms?: number;
  message_id?: string | number;
  userQuery?: string;
  feedbackRating?: "up" | "down" | null;
  feedbackGiven?: boolean;
  timestamp: Date;
}

const STARTER_PROMPTS = [
  "Buat tabel spesifikasi & rekomendasi ban Michelin Earthmover",
  "Tabel alur pengajuan Izin Kerja PTW beserta PIC & dokumen syarat",
  "Berapa batas tekanan standar untuk ban loader & dump truck?",
  "Tabel langkah-langkah investigasi insiden HSE sesuai SOP",
];

interface GeniusChatWorkspaceProps {
  engineInfo?: {
    active_llm?: string;
    model_name?: string;
    vector_dimension?: number;
    default_provider?: string;
  } | null;
  totalDocuments?: number;
  totalChunks?: number;
}

export function GeniusChatWorkspace({
  engineInfo,
  totalDocuments = 0,
  totalChunks = 0,
}: GeniusChatWorkspaceProps) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams ? searchParams.get("q") : null;
  const docParam = searchParams ? searchParams.get("doc") : null;
  const hasSentInitialRef = useRef(false);

  const [sessionId, setSessionId] = useState<string>(() => `sess-${Date.now()}`);
  const [activeDocContext, setActiveDocContext] = useState<string | null>(docParam);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Halo! Saya **Hero Genius**, asisten operasional Chitra Paratama.\n\nSaya terhubung langsung dengan **Knowledge Base & pgvector** dan dilengkapi kemampuan **Self-Growth** untuk menjawab pertanyaan seputar SOP, spesifikasi ban, izin kerja PTW, dan standar keselamatan HSE.\n\nAda yang bisa saya bantu hari ini?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Feedback & Correction Modal State
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [activeFeedbackMsg, setActiveFeedbackMsg] = useState<Message | null>(null);
  const [feedbackRatingType, setFeedbackRatingType] = useState<"up" | "down">("down");
  const [correctionText, setCorrectionText] = useState("");
  const [feedbackNote, setFeedbackNote] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Quick "Ajari AI Fakta Baru" Modal State
  const [learnModalOpen, setLearnModalOpen] = useState(false);
  const [quickFact, setQuickFact] = useState("");
  const [quickCategory, setQuickCategory] = useState("SOP & Prosedur");
  const [quickSource, setQuickSource] = useState("Chat Input");
  const [isSubmittingLearn, setIsSubmittingLearn] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialQuery && !hasSentInitialRef.current) {
      hasSentInitialRef.current = true;
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || isLoading) return;

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: queryText,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const apiMessages = newMessages
      .filter((m) => m.id !== "welcome")
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: queryText,
          messages: apiMessages,
          top_k: 4,
          session_id: sessionId,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage: Message = {
        id: `ast-${Date.now()}`,
        role: "assistant",
        content: data.content || "Maaf, tidak ada respons yang dihasilkan.",
        sources: data.sources || [],
        attached_images: data.attached_images || [],
        latency_ms: data.latency_ms,
        message_id: data.message_id,
        userQuery: queryText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("[HeroGeniusChat] Error:", err);
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Terjadi kesalahan saat memproses jawaban:** ${err.message || "Gagal menghubungi server RAG."}\n\nSilakan periksa koneksi internet atau coba kembali beberapa saat lagi.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickThumbs = async (msg: Message, rating: "up" | "down") => {
    if (msg.feedbackGiven) {
      toast.info("Anda sudah memberikan feedback untuk jawaban ini.");
      return;
    }

    if (rating === "down") {
      // Open detailed correction modal for thumbs down
      setActiveFeedbackMsg(msg);
      setFeedbackRatingType("down");
      setCorrectionText("");
      setFeedbackNote("");
      setFeedbackModalOpen(true);
      return;
    }

    // Direct submit for thumbs up
    try {
      const res = await sendHeroGeniusFeedbackAction({
        session_id: sessionId,
        message_id: String(msg.message_id || msg.id || 'msg-1'),
        query: msg.userQuery || "Pertanyaan umum",
        answer: msg.content,
        rating: 1,
      });

      if (res.success) {
        toast.success("Terima kasih atas penilaian positif Anda!");
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, feedbackRating: "up", feedbackGiven: true } : m))
        );
      }
    } catch (err) {
      toast.error("Gagal mengirim feedback");
    }
  };

  const handleOpenCorrection = (msg: Message) => {
    setActiveFeedbackMsg(msg);
    setFeedbackRatingType("down");
    setCorrectionText("");
    setFeedbackNote("");
    setFeedbackModalOpen(true);
  };

  const handleSubmitFeedbackModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFeedbackMsg) return;

    setIsSubmittingFeedback(true);
    try {
      const res = await sendHeroGeniusFeedbackAction({
        session_id: sessionId,
        message_id: String(activeFeedbackMsg.message_id || activeFeedbackMsg.id || 'msg-1'),
        query: activeFeedbackMsg.userQuery || "Pertanyaan RAG",
        answer: activeFeedbackMsg.content,
        rating: feedbackRatingType === "up" ? 1 : -1,
        feedback_notes: feedbackNote.trim() || undefined,
        correction_text: correctionText.trim() || undefined,
      });

      if (res.success) {
        toast.success("Masukan & koreksi Anda berhasil dicatat untuk self-growth AI!");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === activeFeedbackMsg.id
              ? { ...m, feedbackRating: feedbackRatingType, feedbackGiven: true }
              : m
          )
        );
        setFeedbackModalOpen(false);
      } else {
        toast.error(res.error || "Gagal menyimpan feedback");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleSubmitQuickLearn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFact.trim()) return;

    setIsSubmittingLearn(true);
    try {
      const res = await learnHeroGeniusFactAction({
        content: quickFact.trim(),
        fact: quickFact.trim(),
        category: quickCategory,
        source: quickSource.trim() || "Chat Quick Input",
      });

      if (res.success) {
        toast.success("Fakta baru berhasil dipelajari oleh Hero Genius!");
        setQuickFact("");
        setLearnModalOpen(false);
      } else {
        toast.error(res.error || "Gagal menyimpan fakta");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan");
    } finally {
      setIsSubmittingLearn(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    setSessionId(`sess-${Date.now()}`);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: `Riwayat percakapan telah dibersihkan. Silakan ajukan pertanyaan baru seputar dokumen atau operasional HERO!`,
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[580px] flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950 overflow-hidden">
      {/* Top Bar Workspace Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20">
            <Sparkles className="size-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Hero Genius
              </h2>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border-none text-[10px] font-semibold">
                Online RAG & Self-Growth
              </Badge>
            </div>
            <p className="text-xs text-slate-500">
              {engineInfo?.active_llm || "Groq Qwen 27B"} • {totalDocuments} Dokumen Terindeks ({totalChunks} Chunks)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLearnModalOpen(true)}
            className="h-8 gap-1.5 text-xs text-indigo-700 bg-indigo-50/70 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800"
          >
            <Lightbulb className="size-3.5 text-amber-500" />
            <span className="hidden sm:inline">Ajari AI Fakta Baru</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearChat}
            className="h-8 gap-1.5 text-xs text-slate-600 hover:text-rose-600 hover:border-rose-200 dark:text-slate-300"
          >
            <Trash2 className="size-3.5" />
            <span className="hidden sm:inline">Bersihkan Chat</span>
          </Button>
        </div>
      </div>

      {/* Active Document Context Pill */}
      {activeDocContext && (
        <div className="flex items-center justify-between px-5 py-2 bg-indigo-50/80 border-b border-indigo-100 text-indigo-950 dark:bg-indigo-950/60 dark:border-indigo-900/50 dark:text-indigo-200 text-xs shrink-0">
          <div className="flex items-center gap-2 truncate">
            <FileText className="size-4 text-indigo-600 shrink-0" />
            <span className="font-medium truncate">
              Fokus Diskusi Dokumen: <strong className="font-mono font-bold text-indigo-800 dark:text-indigo-300">{activeDocContext}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveDocContext(null)}
            className="text-indigo-500 hover:text-indigo-800 p-1 rounded-md hover:bg-indigo-100/50 shrink-0 ml-3"
            title="Hapus fokus dokumen"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                  <Sparkles className="size-4" />
                </div>
              )}

              <div
                className={`group relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed ${
                  isUser
                    ? "bg-[#003461] text-white shadow-sm"
                    : "border border-slate-100 bg-slate-50/80 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                }`}
              >
                {/* Content Renderer with Markdown formatting */}
                <MarkdownRenderer content={msg.content} />

                {/* Attached Images Gallery if available */}
                {msg.attached_images && msg.attached_images.length > 0 && (
                  <AttachedImagesGallery images={msg.attached_images} />
                )}

                {/* Sources & Citations if available */}
                {msg.sources && msg.sources.length > 0 && (
                  <SourceCitations sources={msg.sources} />
                )}

                {/* Footer Metadata & Self-Growth Feedback Buttons */}
                <div className="mt-2.5 pt-1.5 border-t border-slate-200/40 dark:border-slate-800 flex items-center justify-between text-[10px] opacity-80">
                  <span className={isUser ? "text-blue-200" : "text-slate-400"} suppressHydrationWarning>
                    {msg.timestamp.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {msg.latency_ms && (
                      <span className="ml-2 font-mono">
                        ⚡ {(msg.latency_ms / 1000).toFixed(2)}s
                      </span>
                    )}
                  </span>

                  {!isUser && msg.id !== "welcome" && (
                    <div className="flex items-center gap-1">
                      {/* Thumbs Up Button */}
                      <button
                        type="button"
                        onClick={() => handleQuickThumbs(msg, "up")}
                        className={`p-1 rounded transition-colors ${
                          msg.feedbackRating === "up"
                            ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 font-bold"
                            : "text-slate-400 hover:text-emerald-600 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                        }`}
                        title="Jawaban Tepat & Bermanfaat (Thumbs Up)"
                      >
                        <ThumbsUp className="size-3.5" />
                      </button>

                      {/* Thumbs Down Button */}
                      <button
                        type="button"
                        onClick={() => handleQuickThumbs(msg, "down")}
                        className={`p-1 rounded transition-colors ${
                          msg.feedbackRating === "down"
                            ? "text-rose-600 bg-rose-50 dark:bg-rose-950/60 font-bold"
                            : "text-slate-400 hover:text-rose-600 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                        }`}
                        title="Jawaban Kurang Tepat / Butuh Koreksi"
                      >
                        <ThumbsDown className="size-3.5" />
                      </button>

                      {/* Beri Masukan / Koreksi Action */}
                      <button
                        type="button"
                        onClick={() => handleOpenCorrection(msg)}
                        className="text-[10px] text-slate-500 hover:text-blue-600 px-1.5 py-0.5 rounded hover:bg-slate-200/50 transition-colors flex items-center gap-1 ml-0.5"
                        title="Beri Masukan / Koreksi Jawaban"
                      >
                        <MessageSquarePlus className="size-3" />
                        <span className="hidden md:inline">Koreksi</span>
                      </button>

                      {/* Copy Action */}
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="ml-1 p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                        title="Salin Pesan"
                      >
                        {copiedId === msg.id ? (
                          <Check className="size-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {isUser && (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <User className="size-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm animate-pulse">
              <Sparkles className="size-4" />
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]" />
                <span className="size-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]" />
                <span className="size-1.5 rounded-full bg-indigo-600 animate-bounce" />
              </div>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Hero Genius sedang membaca database RAG & memori terpelajar...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Starter Prompts */}
      {messages.length <= 2 && (
        <div className="px-5 py-2 border-t border-slate-100 bg-slate-50/40 dark:border-slate-800/80 dark:bg-slate-900/40">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-slate-400 mb-2">
            <Zap className="size-3 text-amber-500" />
            Rekomendasi Pertanyaan Cepat:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STARTER_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700 transition-all text-left dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/40"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="border-t border-slate-100 p-3 sm:p-4 bg-white dark:border-slate-800 dark:bg-slate-950">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan apa saja seputar SOP, spesifikasi ban, atau dokumen HERO... (Enter untuk kirim)"
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="h-11 px-4 rounded-xl bg-[#003461] hover:bg-[#002647] text-white shadow-sm flex items-center gap-2"
          >
            {isLoading ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            <span className="hidden sm:inline">Kirim</span>
          </Button>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-slate-400">
          Hero Genius AI terhubung dengan ribuan chunks dokumen pgvector & Smart Memory. Feedback Anda membantu sistem berkembang secara otomatis.
        </p>
      </div>

      {/* Feedback & Correction Modal */}
      <Dialog open={feedbackModalOpen} onOpenChange={setFeedbackModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <MessageSquarePlus className="size-4 text-blue-600" />
              Beri Masukan & Koreksi Jawaban AI
            </DialogTitle>
            <DialogDescription className="text-xs">
              Bantu Hero Genius belajar dari kesalahan agar memberikan jawaban yang lebih akurat di masa mendatang (Self-Growth).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitFeedbackModal} className="space-y-3.5 py-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Teks Koreksi / Jawaban yang Benar:</label>
              <textarea
                rows={3}
                value={correctionText}
                onChange={(e) => setCorrectionText(e.target.value)}
                placeholder="Tuliskan informasi atau jawaban yang benar menurut SOP / standar perusahaan..."
                className="w-full resize-none rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Catatan Tambahan (Opsional):</label>
              <Input
                type="text"
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                placeholder="Misal: Kurang detail di bagian PIC persetujuan"
                className="text-xs h-8 rounded-lg"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFeedbackModalOpen(false)}
                disabled={isSubmittingFeedback}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingFeedback}
                className="bg-[#003461] hover:bg-[#002647] text-white gap-1.5 font-bold"
              >
                {isSubmittingFeedback ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Kirim Koreksi
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick Learn Modal */}
      <Dialog open={learnModalOpen} onOpenChange={setLearnModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Lightbulb className="size-4 text-amber-500" />
              Ajari AI Fakta & Aturan Baru
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tambahkan pengetahuan baru secara langsung ke memori Hero Genius tanpa perlu upload dokumen.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitQuickLearn} className="space-y-3 py-1">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Fakta / Aturan Operasional Baru:</label>
              <textarea
                rows={3}
                value={quickFact}
                onChange={(e) => setQuickFact(e.target.value)}
                placeholder="Contoh: Form PTW wajib disetujui minimal 1 jam sebelum pekerjaan berisiko dimulai..."
                className="w-full resize-none rounded-xl border border-slate-200 p-2.5 text-xs focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Kategori:</label>
                <select
                  value={quickCategory}
                  onChange={(e) => setQuickCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                >
                  <option value="SOP & Prosedur">SOP & Prosedur</option>
                  <option value="Ban & Spesifikasi Teknis">Ban & Spesifikasi Teknis</option>
                  <option value="HSE & Keselamatan Kerja">HSE & Keselamatan Kerja</option>
                  <option value="Operasional & Logistik">Operasional & Logistik</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Sumber:</label>
                <Input
                  type="text"
                  value={quickSource}
                  onChange={(e) => setQuickSource(e.target.value)}
                  className="h-8 text-xs rounded-lg"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLearnModalOpen(false)}
                disabled={isSubmittingLearn}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingLearn || !quickFact.trim()}
                className="bg-[#003461] hover:bg-[#002647] text-white gap-1.5 font-bold"
              >
                {isSubmittingLearn ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <PlusCircle className="size-3.5" />
                )}
                Ajarkan ke AI
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
