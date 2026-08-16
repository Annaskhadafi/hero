"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  X,
  ShieldCheck,
  RefreshCw,
  Eye,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  filename: string;
  url?: string | null;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  filename,
  url,
}: DocumentPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setHasError(false);
    }
  }, [isOpen, url]);

  if (!isOpen || !url) return null;

  // Route through our dedicated proxy to ensure Content-Type: application/pdf
  const streamUrl = `/api/hero-genius/document-stream?url=${encodeURIComponent(
    url
  )}&filename=${encodeURIComponent(filename)}#toolbar=0&navpanes=0&scrollbar=1`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onContextMenu={(e) => e.preventDefault()}
        className="w-full max-w-[95vw] sm:max-w-4xl lg:max-w-5xl h-[94dvh] sm:h-[90vh] p-0 gap-0 overflow-hidden flex flex-col rounded-2xl sm:rounded-3xl border-slate-200 dark:border-slate-800 select-none z-[9999]"
      >
        {/* Top Header Bar */}
        <DialogHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-[#003461] px-4 py-3 text-white sm:px-6 shrink-0 dark:border-slate-800">
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
                  Pratinjau Dokumen HERO
                </span>
                <Badge className="bg-amber-400/20 text-amber-200 border-none text-[9px] px-1.5 py-0 font-bold">
                  Read-Only (Preview)
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-8 p-0 rounded-lg text-white/80 hover:bg-white/20 hover:text-white"
              title="Tutup Pratinjau"
            >
              <X className="size-4 sm:size-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Preview Container */}
        <div
          className="relative flex-1 w-full h-full bg-slate-100 dark:bg-slate-950 overflow-hidden select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/90 dark:bg-slate-900/90 gap-2">
              <RefreshCw className="size-6 text-indigo-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Memuat dokumen aman...
              </p>
            </div>
          )}

          {hasError ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertCircle className="size-10 text-rose-500" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Gagal memuat pratinjau dokumen
              </p>
              <p className="text-xs text-slate-400 max-w-sm">
                Format dokumen mungkin tidak didukung oleh browser Anda.
              </p>
            </div>
          ) : (
            <object
              data={streamUrl}
              type="application/pdf"
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
              className="w-full h-full border-0 select-none"
            >
              <iframe
                src={streamUrl}
                title={`Pratinjau ${filename}`}
                onLoad={() => setIsLoading(false)}
                className="w-full h-full border-0"
              />
            </object>
          )}
        </div>

        {/* Security Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[10px] sm:text-xs text-slate-500 flex items-center justify-between shrink-0 dark:border-slate-800 dark:bg-slate-900">
          <span className="flex items-center gap-1">
            <Eye className="size-3 text-slate-400" />
            Dokumen dilindungi dalam mode pratinjau internal HERO (Read-Only)
          </span>
          <span className="font-semibold text-slate-400">HERO Genius AI</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
