"use client";

import React, { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApplicationFormPdfDocument } from "./application-form-pdf-document";
import { IconDownload, IconPrinter, IconX, IconLoader2, IconFileText } from "@tabler/icons-react";
import { toast } from "sonner";

interface ApplicationFormPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: any;
  testTitle?: string;
}

export function ApplicationFormPreviewDialog({
  open,
  onOpenChange,
  entry,
  testTitle,
}: ApplicationFormPreviewDialogProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const candidateName = entry?.candidate?.fullName || entry?.candidate?.name || "Kandidat";

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printContainerRef.current) return;
    setIsGeneratingPdf(true);
    const toastId = toast.loading("Menyiapkan dokumen PDF (4 halaman)...");

    try {
      // Dynamic import to avoid SSR issues
      const { jsPDF } = await import("jspdf");
      const html2canvasModule = await import("html2canvas-pro").catch(() => import("html2canvas"));
      const html2canvas = html2canvasModule.default;

      const pageElements = printContainerRef.current.querySelectorAll<HTMLElement>(".app-form-page");
      if (!pageElements.length) {
        throw new Error("Elemen halaman tidak ditemukan");
      }

      // Initialize A4 Portrait jsPDF (210mm x 297mm)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        if (i > 0) {
          pdf.addPage("a4", "portrait");
        }

        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      }

      const safeName = candidateName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      pdf.save(`Application-Form_${safeName}.pdf`);
      toast.success("Dokumen PDF berhasil diunduh!", { id: toastId });
    } catch (err: any) {
      console.error("[handleDownloadPdf] Error:", err);
      toast.error(err.message || "Gagal mengunduh PDF. Silakan gunakan opsi Cetak / Print.", { id: toastId });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl w-[96vw] max-h-[92vh] p-0 flex flex-col overflow-hidden bg-slate-900/90 backdrop-blur-md border-border/80">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400">
              <IconFileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Preview Formulir Lamaran Kerja (F.HR.STD.006.00)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-300">
                Kandidat: <span className="font-semibold text-white">{candidateName}</span> • 4 Halaman Dokumen A4 Resmi
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8.5 text-xs gap-1.5 bg-white/10 hover:bg-white/20 text-white border-white/20 shadow-xs"
            >
              <IconPrinter className="w-4 h-4 text-slate-300" /> Cetak / Print
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="h-8.5 text-xs gap-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white shadow-md shadow-teal-500/20"
            >
              {isGeneratingPdf ? (
                <>
                  <IconLoader2 className="w-4 h-4 animate-spin" /> Menyiapkan...
                </>
              ) : (
                <>
                  <IconDownload className="w-4 h-4" /> Download PDF
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8.5 w-8.5 text-white/70 hover:text-white hover:bg-white/10"
            >
              <IconX className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/60 scrollbar-thin scrollbar-thumb-white/20 flex justify-center">
          <div ref={printContainerRef} className="w-full flex justify-center">
            {entry && <ApplicationFormPdfDocument entry={entry} testTitle={testTitle} />}
          </div>
        </div>

        {/* Footer status bar */}
        <div className="px-6 py-2.5 border-t border-white/10 bg-slate-900 text-slate-400 text-xs flex items-center justify-between shrink-0">
          <span className="text-[11px]">
            * Dokumen resmi sesuai standar Chitra Paratama (Mahadasha Group). Format A4 siap print & arsip.
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-7 text-xs text-white/80 hover:text-white"
          >
            Tutup Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
