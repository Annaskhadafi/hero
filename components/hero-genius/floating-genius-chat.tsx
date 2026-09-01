"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Send,
  X,
  Maximize2,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  EyeOff,
  Eye,
  GripHorizontal,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SourceCitations } from "./source-citations";
import { MarkdownRenderer } from "./markdown-renderer";
import type { RagSourceItem } from "@/lib/hero-genius/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: RagSourceItem[];
  latency_ms?: number;
  timestamp: Date;
}

const STARTER_PROMPTS = [
  "Spesifikasi teknis ban Michelin Earthmover?",
  "Alur pengajuan Izin Kerja PTW?",
  "Standar SOP penanganan insiden HSE?",
  "Batas standar tekanan ban loader & dump truck?",
];

export function FloatingGeniusChat() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-floating",
      role: "assistant",
      content: `Halo! Saya **Hero Genius**, AI asisten operasional Chitra Paratama.\n\nAda dokumen atau SOP yang ingin Anda tanyakan?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const dragInfoRef = useRef<{
    startX: number;
    startY: number;
    posX: number;
    posY: number;
    moved: boolean;
  } | null>(null);

  // Load saved position and hidden state on mount
  useEffect(() => {
    setMounted(true);
    try {
      const savedHidden = localStorage.getItem("hero_genius_bubble_hidden");
      if (savedHidden === "true") {
        setIsHidden(true);
      }
      const savedPos = localStorage.getItem("hero_genius_bubble_pos");
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          // Clamp to current window size
          const x = Math.min(Math.max(16, parsed.x), window.innerWidth - 200);
          const y = Math.min(Math.max(16, parsed.y), window.innerHeight - 70);
          setPosition({ x, y });
        }
      }
    } catch {}
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only primary mouse/touch button
    if (e.button !== 0) return;
    const currentX = position?.x ?? (window.innerWidth - 190);
    const currentY = position?.y ?? (window.innerHeight - 76);

    dragInfoRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: currentX,
      posY: currentY,
      moved: false,
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragInfoRef.current) return;
    const dx = e.clientX - dragInfoRef.current.startX;
    const dy = e.clientY - dragInfoRef.current.startY;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragInfoRef.current.moved = true;
      setIsDragging(true);
    }

    if (dragInfoRef.current.moved) {
      const newX = Math.min(
        Math.max(16, dragInfoRef.current.posX + dx),
        window.innerWidth - 200
      );
      const newY = Math.min(
        Math.max(16, dragInfoRef.current.posY + dy),
        window.innerHeight - 76
      );
      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragInfoRef.current) return;
    if (dragInfoRef.current.moved && position) {
      try {
        localStorage.setItem("hero_genius_bubble_pos", JSON.stringify(position));
      } catch {}
    }
    dragInfoRef.current = null;
    // Small timeout so click handler knows it was dragging
    setTimeout(() => {
      setIsDragging(false);
    }, 50);
  };

  const handleToggleOpen = () => {
    if (isDragging) return;
    setIsOpen((prev) => !prev);
  };

  const handleHideBubble = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHidden(true);
    setIsOpen(false);
    try {
      localStorage.setItem("hero_genius_bubble_hidden", "true");
    } catch {}
  };

  const handleShowBubble = () => {
    setIsHidden(false);
    try {
      localStorage.removeItem("hero_genius_bubble_hidden");
    } catch {}
  };

  // Don't show floating bubble if user is already on the dedicated /dashboard/hero-genius full page
  if (!mounted) return null;
  if (pathname === "/dashboard/hero-genius") return null;

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
      .filter((m) => m.id !== "welcome-floating")
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
      console.error("[FloatingGeniusChat] Error:", err);
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Gagal:** ${err.message || "Koneksi ke AI terputus."}`,
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
        content: `Chat dibersihkan. Silakan ajukan pertanyaan baru!`,
        timestamp: new Date(),
      },
    ]);
  };

  // If user minimized / hid the bubble, show a discreet restore pill at screen edge
  if (isHidden) {
    return (
      <div className="fixed bottom-4 right-4 z-[999] print:hidden">
        <button
          type="button"
          onClick={handleShowBubble}
          className="group flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/95 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-md backdrop-blur-md transition-all hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200"
          title="Tampilkan kembali Hero Genius AI Bubble"
        >
          <Sparkles className="size-4 text-amber-500 group-hover:rotate-12 transition-transform" />
          <span>Hero Genius</span>
          <Eye className="size-3.5 text-slate-400 group-hover:text-blue-600" />
        </button>
      </div>
    );
  }

  // Calculate container style based on position
  const containerStyle: React.CSSProperties = position
    ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        position: "fixed",
      }
    : {
        bottom: "1.5rem",
        right: "1.5rem",
        position: "fixed",
      };

  // Calculate chat panel alignment relative to bubble position
  const isTopHalf = position ? position.y < window.innerHeight / 2 : false;
  const isLeftHalf = position ? position.x < window.innerWidth / 2 : false;

  return (
    <div
      ref={bubbleRef}
      style={containerStyle}
      className="z-[999] flex flex-col items-end print:hidden select-none pointer-events-auto"
    >
      {/* Floating Chat Box Panel */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            [isTopHalf ? "top" : "bottom"]: "calc(100% + 12px)",
            [isLeftHalf ? "left" : "right"]: "0",
          }}
          className="flex h-[640px] w-[460px] sm:w-[500px] lg:w-[540px] max-w-[calc(100vw-2.5rem)] max-h-[calc(100vh-6rem)] flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_25px_60px_rgba(0,0,0,0.22)] animate-in fade-in zoom-in-95 duration-200 dark:border-slate-800 dark:bg-slate-950"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-[#003461] px-5 py-4 text-white dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-white/15 text-white shadow-inner">
                <Sparkles className="size-5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold leading-none">Hero Genius AI</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online RAG
                  </span>
                </div>
                <p className="text-xs text-blue-200 leading-tight mt-1 font-medium">
                  RAG Knowledge Base & pgvector Assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="size-8 p-0 text-white/80 hover:bg-white/15 hover:text-white rounded-lg"
                title="Bersihkan Percakapan"
              >
                <Trash2 className="size-4" />
              </Button>
              <Link
                href="/dashboard/hero-genius"
                className="flex size-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                title="Buka Workspace Penuh"
              >
                <Maximize2 className="size-4" />
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleHideBubble}
                className="size-8 p-0 text-white/80 hover:bg-white/15 hover:text-white rounded-lg"
                title="Sembunyikan Bubble Hero Genius"
              >
                <EyeOff className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="size-8 p-0 text-white/80 hover:bg-white/15 hover:text-white rounded-lg"
                title="Tutup Chat"
              >
                <X className="size-4.5" />
              </Button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-[#f8fbfe] dark:bg-slate-900/50">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs mt-0.5">
                      <Sparkles className="size-4" />
                    </div>
                  )}

                  <div
                    className={`group max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? "bg-[#003461] text-white rounded-tr-xs"
                        : "bg-white border border-slate-200/70 text-slate-900 rounded-tl-xs dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                    }`}
                  >
                    <MarkdownRenderer content={msg.content} />

                    {msg.sources && msg.sources.length > 0 && (
                      <SourceCitations sources={msg.sources} />
                    )}

                    <div className="mt-2 flex items-center justify-between text-[11px] opacity-70">
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

                      {!isUser && msg.id !== "welcome-floating" && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await fetch("/api/v1/rag/feedback", {
                                   method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    query: "Floating query",
                                    answer: msg.content,
                                    rating: "up",
                                  }),
                                });
                                setCopiedId(`fb-${msg.id}`);
                                setTimeout(() => setCopiedId(null), 2000);
                              } catch {}
                            }}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-emerald-600"
                            title="Jawaban Bermanfaat (Thumbs Up)"
                          >
                            <Check className={`size-3 ${copiedId === `fb-${msg.id}` ? "text-emerald-600 font-bold" : "text-slate-400"}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
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
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs animate-pulse">
                  <Sparkles className="size-4" />
                </div>
                <div className="rounded-2xl border border-slate-200/70 bg-white px-4 py-2.5 text-xs text-slate-500 shadow-xs dark:bg-slate-950 dark:border-slate-800 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-indigo-600 animate-bounce" />
                  <span className="size-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.15s]" />
                  <span className="size-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.3s]" />
                  <span className="text-xs font-medium text-slate-600 ml-1">Mencari referensi & merangkum...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div className="border-t border-slate-100 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-0.5">
                {STARTER_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isLoading}
                    className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50/60 hover:text-blue-700 active:scale-95 transition-all text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="border-t border-slate-100 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-950">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={textareaRef}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Tanyakan SOP, spesifikasi ban, dokumen PTW..."
                disabled={isLoading}
                className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
              />

              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="h-11 px-4 rounded-2xl bg-[#003461] hover:bg-[#002647] text-white shadow-sm shrink-0 flex items-center justify-center gap-1.5"
              >
                {isLoading ? (
                  <RefreshCw className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                <span className="hidden sm:inline text-xs font-bold">Kirim</span>
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toggle Button (Draggable Bubble with Hide Button) */}
      <div className="group relative flex items-center">
        {/* Hide bubble button (appears on hover) */}
        {!isOpen && (
          <button
            type="button"
            onClick={handleHideBubble}
            className="absolute -top-2 -left-2 z-10 hidden size-6 items-center justify-center rounded-full bg-slate-800 text-white shadow-md transition-all hover:bg-slate-950 group-hover:flex"
            title="Sembunyikan Hero Genius Bubble"
          >
            <EyeOff className="size-3.5" />
          </button>
        )}

        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={handleToggleOpen}
          className={`flex items-center gap-2.5 rounded-full px-4 sm:px-5 py-3.5 text-white shadow-[0_10px_35px_rgba(0,0,0,0.3)] transition-shadow duration-300 touch-none ${
            isDragging ? "cursor-grabbing shadow-2xl scale-105" : "cursor-grab active:cursor-grabbing hover:shadow-[0_14px_40px_rgba(37,99,235,0.5)]"
          } ${
            isOpen
              ? "bg-slate-900 hover:bg-black ring-4 ring-slate-900/20"
              : "bg-gradient-to-r from-[#003461] via-[#0284c7] to-[#4f46e5] ring-4 ring-blue-500/30"
          }`}
          title={isOpen ? "Tutup Hero Genius (Tahan & geser untuk pindah)" : "Tanya Hero Genius AI (Tahan & geser untuk pindah posisi)"}
        >
          {/* Drag grip icon */}
          <GripHorizontal className="size-3.5 text-white/50 group-hover:text-white/80 transition-colors shrink-0 -ml-1" />

          <div className="relative flex items-center justify-center">
            {isOpen ? (
              <X className="size-5 transition-transform duration-200" />
            ) : (
              <>
                <Sparkles className="size-5 text-amber-300 animate-pulse" />
                <span className="absolute -top-1 -right-1 flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-amber-400" />
                </span>
              </>
            )}
          </div>
          {!isOpen && (
            <span className="text-sm font-black tracking-wide pr-1">
              Hero Genius
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

