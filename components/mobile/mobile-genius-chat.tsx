"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Send,
  Trash2,
  Copy,
  Check,
  BookOpen,
  RefreshCw,
  ExternalLink,
  Bot,
  FileText,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MarkdownRenderer } from "@/components/hero-genius/markdown-renderer";
import { DocumentPreviewModal } from "@/components/hero-genius/document-preview-modal";
import { resolveRagDocumentUrl, type RagSourceItem } from "@/lib/hero-genius/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: RagSourceItem[];
  latency_ms?: number;
  timestamp: Date;
}

const MOBILE_PROMPTS = [
  "Tabel spesifikasi ban Michelin Earthmover",
  "Tabel alur pengajuan Izin Kerja PTW",
  "Tabel standar SOP insiden HSE",
  "Tekanan ban loader & dump truck",
];

export function MobileGeniusChat({
  initialDocumentsCount = 0,
}: {
  initialDocumentsCount?: number;
}) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams ? searchParams.get("q") : null;
  const docParam = searchParams ? searchParams.get("doc") : null;
  const hasSentInitialRef = useRef(false);

  const [activeDocContext, setActiveDocContext] = useState<string | null>(docParam);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-mobile",
      role: "assistant",
      content: `Halo! Saya **Hero Genius**, asisten operasional Chitra Paratama.\n\nTanyakan apa saja seputar SOP, spesifikasi teknis ban, izin kerja HSE, dan dokumen operasional.`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<RagSourceItem | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ filename: string; url: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto-send query if passed from SOP/WIN or other modules
  useEffect(() => {
    if (initialQuery && !hasSentInitialRef.current) {
      hasSentInitialRef.current = true;
      handleSendMessage(initialQuery);
    }
  }, [initialQuery]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    const apiMessages = newMessages
      .filter((m) => m.id !== "welcome-mobile")
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend,
          messages: apiMessages,
          top_k: 4,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      const assistantMessage: Message = {
        id: `ast-${Date.now()}`,
        role: "assistant",
        content: data.content || "Tidak ada jawaban yang ditemukan.",
        sources: data.sources || [],
        latency_ms: data.latency_ms,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("[MobileGeniusChat] Error:", err);
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Gagal:** ${err.message || "Koneksi ke server RAG terputus."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: `Chat telah dibersihkan. Ada yang ingin Anda tanyakan lagi seputar SOP atau ban?`,
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] -mx-4 -mt-4 bg-[#f8fbfe] overflow-hidden">
      {/* Sub Header (Hero Genius Info Bar) */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2.5 shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#003461] to-indigo-600 text-white shadow-xs">
            <Sparkles className="size-3.5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-black text-[#003461]">Hero Genius</h2>
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Knowledge Base & pgvector
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-7 px-2 text-[11px] font-semibold text-slate-500 hover:text-rose-600"
        >
          <Trash2 className="size-3.5 mr-1" />
          Bersihkan
        </Button>
      </div>

      {/* Active Document Context Pill */}
      {activeDocContext && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-indigo-50 border-b border-indigo-100 text-indigo-900 dark:bg-indigo-950/80 dark:border-indigo-900/50 dark:text-indigo-200 text-[11px] shrink-0">
          <div className="flex items-center gap-1.5 truncate">
            <FileText className="size-3.5 text-indigo-600 shrink-0" />
            <span className="font-medium truncate">
              Fokus Dokumen: <strong>{activeDocContext}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveDocContext(null)}
            className="text-indigo-500 hover:text-indigo-800 shrink-0 ml-2"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#003461] text-white shadow-xs mt-0.5">
                  <Sparkles className="size-3.5 text-amber-300" />
                </div>
              )}

              <div
                className={`group max-w-[88%] rounded-2xl p-3.5 text-[13px] leading-relaxed shadow-xs ${
                  isUser
                    ? "bg-[#003461] text-white rounded-tr-xs"
                    : "bg-white border border-slate-200/80 text-slate-900 rounded-tl-xs dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                }`}
              >
                <MarkdownRenderer content={msg.content} />

                {/* Sources pill button */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <BookOpen className="size-3 text-sky-600" />
                      Sumber Dokumen:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {msg.sources.map((src, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedSource(src)}
                          className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800 active:scale-95 transition-transform"
                        >
                          <span className="max-w-[110px] truncate">{src.filename}</span>
                          <span className="text-[9px] text-sky-600 font-mono">
                            {Math.round(src.similarity_score * 100)}%
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamp, Feedback & Copy */}
                <div className="mt-2 flex items-center justify-between text-[10px] opacity-75">
                  <span className={isUser ? "text-blue-200" : "text-slate-400"} suppressHydrationWarning>
                    {msg.timestamp.toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {msg.latency_ms && (
                      <span className="ml-1.5 font-mono">⚡ {(msg.latency_ms / 1000).toFixed(2)}s</span>
                    )}
                  </span>

                  {!isUser && msg.id !== "welcome-mobile" && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await fetch("/api/v1/rag/feedback", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                query: "Mobile query",
                                answer: msg.content,
                                rating: "up",
                              }),
                            });
                            setCopiedId(`fb-${msg.id}`);
                            setTimeout(() => setCopiedId(null), 2000);
                          } catch {}
                        }}
                        className="text-slate-400 hover:text-emerald-600 p-0.5"
                        title="Bermanfaat"
                      >
                        <Check className={`size-3.5 ${copiedId === `fb-${msg.id}` ? "text-emerald-600 font-bold" : ""}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
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
            </div>
          );
        })}


        {isLoading && (
          <div className="flex items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#003461] text-white shadow-xs animate-pulse">
              <Sparkles className="size-3.5 text-amber-300" />
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3 text-xs text-slate-500 shadow-xs flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-indigo-600 animate-bounce" />
              <span className="size-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.15s]" />
              <span className="size-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.3s]" />
              <span className="text-[11px] font-medium text-slate-600 ml-1">
                Mencari referensi & merangkum...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips (Clean without OS scrollbars) */}
      {messages.length <= 2 && (
        <div className="border-t border-slate-100 bg-white px-3 py-2 shrink-0">
          <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-0.5">
            {MOBILE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 active:scale-95 transition-all text-left truncate max-w-[220px]"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Bar (Pinned inside container above bottom nav bar) */}
      <div className="border-t border-slate-200/80 bg-white p-2.5 shrink-0 shadow-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-1.5"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Tanyakan ke Hero Genius..."
            disabled={isLoading}
            className="flex-1 max-h-24 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
          />

          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="sm"
            className="size-9 p-0 rounded-2xl bg-[#003461] hover:bg-[#002647] text-white shadow-sm shrink-0 flex items-center justify-center"
          >
            {isLoading ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
      </div>

      {/* Source Detail Drawer for Mobile */}
      <Sheet open={!!selectedSource} onOpenChange={(open) => !open && setSelectedSource(null)}>
        <SheetContent side="bottom" className="rounded-t-[2rem] px-5 pb-6 pt-4 max-h-[75vh] overflow-y-auto space-y-4">
          <SheetHeader className="text-left">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-2" />
            <SheetTitle className="text-sm font-bold text-[#003461] flex items-center gap-2">
              <BookOpen className="size-4 text-sky-600" />
              Sumber Dokumen RAG
            </SheetTitle>
          </SheetHeader>

          {selectedSource && (
            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 p-3 text-xs space-y-1.5 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">File:</span>
                  <span className="font-bold text-slate-800">{selectedSource.filename}</span>
                </div>
                {selectedSource.heading && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bab / Heading:</span>
                    <span className="font-semibold text-slate-700">{selectedSource.heading}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Relevansi:</span>
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    {(selectedSource.similarity_score * 100).toFixed(1)}% Match
                  </Badge>
                </div>
                {selectedSource.s3_url && (
                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setPreviewDoc({
                          filename: selectedSource.filename,
                          url: selectedSource.s3_url!,
                        });
                      }}
                      className="w-full h-9 rounded-xl bg-[#003461] hover:bg-[#002647] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-transform"
                    >
                      <Eye className="size-3.5" />
                      Pratinjau Dokumen Asli (Full View)
                    </Button>
                  </div>
                )}
              </div>

              {selectedSource.content && (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500">Cuplikan Teks:</span>
                  <div className="max-h-48 overflow-y-auto rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 whitespace-pre-wrap border border-slate-100">
                    {selectedSource.content}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Full Document Read-Only Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          isOpen={!!previewDoc}
          onClose={() => setPreviewDoc(null)}
          filename={previewDoc.filename}
          url={previewDoc.url}
        />
      )}
    </div>
  );
}
