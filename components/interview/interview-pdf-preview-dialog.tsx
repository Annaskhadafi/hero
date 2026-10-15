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
import { InterviewFormPdf } from "./interview-form-pdf";
import { IconDownload, IconPrinter, IconX, IconLoader2, IconFileText, IconCheck } from "@tabler/icons-react";
import { toast } from "sonner";

interface InterviewPdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: any;
}

export function InterviewPdfPreviewDialog({
  open,
  onOpenChange,
  session,
}: InterviewPdfPreviewDialogProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedEvalIndex, setSelectedEvalIndex] = useState<number>(-1); // -1 = Konsolidasi (Rata-rata)
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!session) return null;

  const candidateName = session.candidate?.fullName || "Kandidat";
  const evaluations: any[] = session.evaluations || [];

  // Compute consolidated evaluation if -1 is selected
  const getDisplayEvaluations = () => {
    if (selectedEvalIndex >= 0 && evaluations[selectedEvalIndex]) {
      return [evaluations[selectedEvalIndex]];
    }

    if (evaluations.length === 0) {
      return [];
    }

    if (evaluations.length === 1) {
      return evaluations;
    }

    // Average / Consolidated evaluation
    const avgScore = (key: string) => {
      const sum = evaluations.reduce((acc, curr) => acc + (curr[key] || 0), 0);
      return Math.round(sum / evaluations.length);
    };

    const combinedComments = (key: string) => {
      return evaluations
        .map((e) => (e[key] ? `${e.panelistName}: ${e[key]}` : ""))
        .filter(Boolean)
        .join(" | ");
    };

    const consolidated: any = {
      id: 999999,
      panelistName: evaluations.map((e) => e.panelistName).join(", "),
      panelistRole: "Tim Pewawancara (Konsolidasi)",
      stageName: session.stageName || "Interview 1",

      dayaTangkapScore: avgScore("dayaTangkapScore"),
      dayaTangkapComment: combinedComments("dayaTangkapComment"),
      problemSolvingScore: avgScore("problemSolvingScore"),
      problemSolvingComment: combinedComments("problemSolvingComment"),
      motivationalFitScore: avgScore("motivationalFitScore"),
      motivationalFitComment: combinedComments("motivationalFitComment"),
      adaptabilityScore: avgScore("adaptabilityScore"),
      adaptabilityComment: combinedComments("adaptabilityComment"),
      interpersonalSkillsScore: avgScore("interpersonalSkillsScore"),
      interpersonalSkillsComment: combinedComments("interpersonalSkillsComment"),
      communicationSkillScore: avgScore("communicationSkillScore"),
      communicationSkillComment: combinedComments("communicationSkillComment"),

      fundamentalUnderstandingScore: avgScore("fundamentalUnderstandingScore"),
      fundamentalUnderstandingComment: combinedComments("fundamentalUnderstandingComment"),
      experienceRelatedScore: avgScore("experienceRelatedScore"),
      experienceRelatedComment: combinedComments("experienceRelatedComment"),
      technicalSkillScore: avgScore("technicalSkillScore"),
      technicalSkillComment: combinedComments("technicalSkillComment"),

      managerialSkillsScore: avgScore("managerialSkillsScore"),
      managerialSkillsComment: combinedComments("managerialSkillsComment"),
      leadershipScore: avgScore("leadershipScore"),
      leadershipComment: combinedComments("leadershipComment"),
      teamWorkScore: avgScore("teamWorkScore"),
      teamWorkComment: combinedComments("teamWorkComment"),

      overallRecommendation: session.consensus || "RECOMMENDED",
      jobMatchComment: combinedComments("jobMatchComment"),
      recommendationOtherPosition: evaluations.map((e) => e.recommendationOtherPosition).filter(Boolean).join(" / "),
    };

    return [consolidated, ...evaluations];
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printContainerRef.current) return;
    setIsGeneratingPdf(true);
    const toastId = toast.loading("Menyiapkan dokumen PDF Wawancara...");

    try {
      const { jsPDF } = await import("jspdf");
      const html2canvasModule = await import("html2canvas-pro").catch(() => import("html2canvas"));
      const html2canvas = html2canvasModule.default;

      const pdfEl = printContainerRef.current.querySelector<HTMLElement>(".pdf-wrapper");
      if (!pdfEl) throw new Error("Elemen PDF tidak ditemukan");

      const canvas = await html2canvas(pdfEl, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");

      const cleanName = candidateName.replace(/[^a-zA-Z0-9]/g, "_");
      pdf.save(`Interview_Form_${cleanName}_F_HR_STD_010_00.pdf`);
      toast.success("Dokumen PDF Wawancara berhasil diunduh!", { id: toastId });
    } catch (err: any) {
      console.error("PDF generation error:", err);
      toast.error(err.message || "Gagal membuat dokumen PDF.", { id: toastId });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[92vh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-900 border-slate-800 text-white shadow-2xl">
        {/* Header Bar */}
        <DialogHeader className="px-6 py-3.5 border-b border-slate-800 flex-row items-center justify-between shrink-0 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <IconFileText className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                <span>INTERVIEW FORM (F.HR.STD.010.00)</span>
                <span className="text-[11px] font-normal text-slate-400">· {candidateName}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 mt-0.5">
                {session.candidate?.vacancyTitle || "Posisi Dilamar"} · Tahap: {session.stageName || "Interview"}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Multi-Panelist Tab Toggle if multiple evaluations exist */}
            {evaluations.length > 1 && (
              <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/80 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedEvalIndex(-1)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    selectedEvalIndex === -1 ? "bg-teal-600 text-white font-semibold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Konsolidasi
                </button>
                {evaluations.map((ev, idx) => (
                  <button
                    key={ev.id || idx}
                    type="button"
                    onClick={() => setSelectedEvalIndex(idx)}
                    className={`px-2 py-1 rounded-md transition-colors ${
                      selectedEvalIndex === idx ? "bg-teal-600 text-white font-semibold" : "text-slate-400 hover:text-white"
                    }`}
                    title={ev.panelistName}
                  >
                    Panelis {idx + 1}
                  </button>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs font-semibold bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
              title="Cetak via browser"
            >
              <IconPrinter className="size-3.5" />
              <span className="hidden sm:inline">Cetak</span>
            </Button>

            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="h-8 gap-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-xs"
            >
              {isGeneratingPdf ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconDownload className="size-3.5" />}
              <span>Download PDF</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/90 flex justify-center">
          <div ref={printContainerRef} className="shadow-2xl">
            <InterviewFormPdf
              candidateName={candidateName}
              age={session.candidate?.ageStr || "-"}
              education={session.candidate?.educationStr || "-"}
              positionAppliedFor={session.candidate?.vacancyTitle || "-"}
              evaluations={getDisplayEvaluations()}
              stageName={session.stageName || "Interview 1"}
            />
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-3">
            <span>Status: <strong className="text-white">{session.status}</strong></span>
            <span>· Rekomendasi: <strong className={session.consensus === "RECOMMENDED" ? "text-emerald-400" : "text-amber-400"}>{session.consensus || "PENDING"}</strong></span>
            {evaluations.length > 0 && (
              <span>· {evaluations.length} evaluasi panelis tercatat</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-7 text-xs text-slate-400 hover:text-white"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
