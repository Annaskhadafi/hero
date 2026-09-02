"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  X,
  ShieldCheck,
  Eye,
  Download,
  ExternalLink,
  Smartphone,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PdfCanvasViewer } from "./pdf-canvas-viewer";
import { MarkdownDocViewer } from "./markdown-doc-viewer";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  url?: string | null;
  format?: string | null;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  filename,
  url,
  format,
}: DocumentPreviewModalProps) {
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileUA =
        typeof navigator !== "undefined" &&
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      const isNarrowScreen =
        typeof window !== "undefined" && window.innerWidth < 768;
      setIsMobile(isMobileUA || isNarrowScreen);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!isOpen || !url) return null;

  const isImage = /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(filename || url);
  const isMarkdown =
    format === "md" ||
    format === "markdown" ||
    format === "txt" ||
    /\.(md|markdown|txt)$/i.test(filename || url);

  // Route through our dedicated proxy to ensure streaming and bypass cors
  const streamUrl = `/api/hero-genius/document-stream?url=${encodeURIComponent(
    url
  )}&filename=${encodeURIComponent(filename)}&format=${encodeURIComponent(format || "")}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onContextMenu={(e) => e.preventDefault()}
        className="w-full max-w-[96vw] sm:max-w-4xl lg:max-w-5xl h-[94dvh] sm:h-[90vh] p-0 gap-0 overflow-hidden flex flex-col rounded-2xl sm:rounded-3xl border-slate-200 dark:border-slate-800 select-none z-[9999] bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-2xl"
      >
        {/* Top Header Bar */}
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-800 bg-[#003461] px-3 sm:px-6 py-2.5 sm:py-3 text-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white">
              <FileText className="size-4 text-sky-300" />
            </div>
            <div className="min-w-0 truncate">
              <DialogTitle className="text-xs sm:text-sm font-bold text-white truncate">
                {filename}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-blue-200 font-medium">
                  <ShieldCheck className="size-3 text-emerald-400" />
                  Pratinjau HERO Read-Only
                </span>
                {totalPages > 0 && !isImage && !isMarkdown && (
                  <Badge className="bg-sky-500/20 text-sky-200 border-none text-[9px] px-1.5 py-0 font-mono">
                    {totalPages} Halaman
                  </Badge>
                )}
                {isMarkdown && (
                  <Badge className="bg-emerald-500/20 text-emerald-200 border-none text-[9px] px-1.5 py-0 font-mono">
                    Markdown Doc
                  </Badge>
                )}
                {!isImage && !isMarkdown && (
                  <Badge className="bg-white/15 text-white border-none text-[9px] px-1.5 py-0">
                    PDF Canvas Viewer
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-8 p-0 rounded-lg text-white/80 hover:bg-white/20 hover:text-white"
              title="Tutup Pratinjau"
            >
              <X className="size-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Preview Content Area */}
        <div
          className="relative flex-1 w-full h-full bg-white dark:bg-slate-900 overflow-hidden"
          onContextMenu={(e) => e.preventDefault()}
        >
          {isImage ? (
            <div className="flex h-full w-full items-center justify-center p-4 overflow-auto bg-slate-50 dark:bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={streamUrl}
                alt={filename}
                className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
              />
            </div>
          ) : isMarkdown ? (
            <MarkdownDocViewer
              url={streamUrl}
              filename={filename}
              className="h-full w-full"
            />
          ) : (
            <PdfCanvasViewer
              url={streamUrl}
              filename={filename}
              onLoaded={(pages) => setTotalPages(pages)}
              className="h-full w-full"
            />
          )}
        </div>

        {/* Security Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0">
          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
            <Eye className="size-3 text-emerald-500" />
            {isMarkdown
              ? "Markdown Document Viewer (HERO Systems)"
              : isImage
              ? "Image Document Viewer (HERO Systems)"
              : "PDF Canvas Reader (HERO Systems)"}
          </span>
          <span className="font-semibold text-slate-400 dark:text-slate-500">HERO Systems</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

