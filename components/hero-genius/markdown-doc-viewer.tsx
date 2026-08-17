"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Copy,
  Check,
  Download,
  Search,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Eye,
  Code2,
  BookOpen,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MarkdownRenderer } from "./markdown-renderer";
import { toast } from "sonner";

interface MarkdownDocViewerProps {
  url: string;
  filename: string;
  className?: string;
}

export function MarkdownDocViewer({
  url,
  filename,
  className = "",
}: MarkdownDocViewerProps) {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");
  const [copied, setCopied] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(14); // px
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearch, setShowSearch] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Gagal memuat konten markdown (${res.status} ${res.statusText})`);
        }
        return res.text();
      })
      .then((text) => {
        if (isMounted) {
          setContent(text);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Gagal membaca file markdown");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Konten markdown disalin ke clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!content) return;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    toast.success(`Mengunduh ${filename}...`);
  };

  const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
  const charCount = content ? content.length : 0;
  const estimatedReadingTime = Math.max(1, Math.ceil(wordCount / 200));

  if (isLoading) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center bg-slate-950 p-6 text-slate-400 ${className}`}>
        <RefreshCw className="size-8 animate-spin text-sky-400 mb-3" />
        <p className="text-sm font-semibold text-slate-200">Memuat Dokumen Markdown...</p>
        <p className="text-xs text-slate-500 mt-1">{filename}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-400 ${className}`}>
        <div className="size-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400 mb-3 border border-rose-500/20">
          <FileText className="size-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-200">Gagal Membaca Markdown</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(url, "_blank")}
          className="mt-4 gap-2 text-xs border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
        >
          <ExternalLink className="size-3.5" />
          Buka Dokumen Mentah di Tab Baru
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex h-full w-full flex-col bg-slate-950 text-slate-100 ${className}`}>
      {/* Viewer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/90 px-4 py-2 text-xs backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-lg bg-slate-800 p-0.5 border border-slate-700/60">
            <button
              type="button"
              onClick={() => setViewMode("formatted")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "formatted"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <BookOpen className="size-3.5" />
              <span>Dokumen Rapi</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("raw")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === "raw"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Code2 className="size-3.5" />
              <span>Source Markdown</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-400">
            <Badge variant="outline" className="border-slate-700 bg-slate-800/60 text-slate-300 text-[10px] font-normal">
              {wordCount.toLocaleString()} Kata
            </Badge>
            <Badge variant="outline" className="border-slate-700 bg-slate-800/60 text-slate-300 text-[10px] font-normal">
              ~{estimatedReadingTime} menit baca
            </Badge>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Font Zoom */}
          <div className="hidden md:flex items-center gap-1 bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60">
            <button
              type="button"
              onClick={() => setFontSize((prev) => Math.max(11, prev - 1))}
              className="p-1 text-slate-400 hover:text-slate-200 rounded"
              title="Perkecil Font"
            >
              <ZoomOut className="size-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1 text-slate-300 min-w-[28px] text-center">
              {fontSize}px
            </span>
            <button
              type="button"
              onClick={() => setFontSize((prev) => Math.min(22, prev + 1))}
              className="p-1 text-slate-400 hover:text-slate-200 rounded"
              title="Perbesar Font"
            >
              <ZoomIn className="size-3.5" />
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-xs gap-1 text-slate-300 hover:bg-slate-800 hover:text-white px-2.5"
          >
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
            <span>{copied ? "Tersalin" : "Copy"}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-7 text-xs gap-1 text-slate-300 hover:bg-slate-800 hover:text-white px-2.5"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Download</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950">
        <div className="mx-auto max-w-4xl">
          {viewMode === "formatted" ? (
            <div
              style={{ fontSize: `${fontSize}px` }}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10 shadow-xl backdrop-blur leading-relaxed"
            >
              <MarkdownRenderer
                content={content}
                className="text-slate-200 [&_h1]:text-white [&_h2]:text-white [&_h3]:text-sky-300 [&_strong]:text-white"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 font-mono text-xs text-slate-300 shadow-xl overflow-x-auto">
              <pre className="whitespace-pre-wrap leading-relaxed select-text font-mono" style={{ fontSize: `${fontSize}px` }}>
                {content}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
