"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Printer, ExternalLink, X } from "lucide-react";

interface ApdRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: number | null;
  isSummary?: boolean;
}

export function ApdRequestDetailModal({ isOpen, onClose, requestId, isSummary = false }: ApdRequestDetailModalProps) {
  const [iframeLoading, setIframeLoading] = useState(true);

  if (!isOpen || !requestId) return null;

  const printUrl = isSummary ? `/print/summary/${requestId}` : `/print/apd/${requestId}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-5xl w-[95vw] h-[92vh] max-h-[92vh] p-0 overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 flex flex-col shadow-2xl">
        {/* Modal Header */}
        <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              <FileText className="size-4 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-100 flex items-center gap-2">
                Dokumen Resmi Permintaan APD
              </DialogTitle>
              <DialogDescription className="text-[11px] text-slate-400">
                Formulir resmi Alat Pelindung Diri (APD) & lampiran foto bukti fisik
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="h-8 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 gap-1.5 cursor-pointer"
            >
              <a href={printUrl} target="_blank" rel="noopener noreferrer">
                <Printer className="size-3.5 text-emerald-400" />
                <span>Cetak / Buka PDF</span>
                <ExternalLink className="size-3 text-slate-400" />
              </a>
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Modal Body - Embedded Print Document */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center p-2 sm:p-4">
          {iframeLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-10 gap-2">
              <Loader2 className="size-8 animate-spin text-blue-500" />
              <p className="text-xs text-slate-300 font-medium">Memuat formulir resmi APD...</p>
            </div>
          )}
          <iframe
            key={`${requestId}-${isSummary}`}
            src={printUrl}
            className="w-full h-full rounded-xl border border-slate-800 shadow-2xl bg-white"
            onLoad={() => setIframeLoading(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
