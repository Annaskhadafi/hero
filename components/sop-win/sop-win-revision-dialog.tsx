"use client";

import { useState } from "react";
import {
  History,
  UploadCloud,
  Sparkles,
  Calendar,
  Layers,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createSopWinRevisionAction } from "@/app/dashboard/sop-win/actions";

interface SopWinRevisionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: number;
    documentNumber: string;
    title: string;
    currentRevision: string;
  };
  onSuccess: () => void;
}

export function SopWinRevisionDialog({
  isOpen,
  onClose,
  document,
  onSuccess,
}: SopWinRevisionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextRevNum = (
    parseInt(document.currentRevision || "0", 10) + 1
  )
    .toString()
    .padStart(2, "0");
  const [revisionNumber, setRevisionNumber] = useState(nextRevNum);
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [changeDescription, setChangeDescription] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [docxFile, setDocxFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionNumber.trim() || !changeDescription.trim()) {
      toast.error("Nomor Revisi dan Uraian Perubahan wajib diisi!");
      return;
    }
    if (!pdfFile) {
      toast.error("File PDF Dokumen Versi Revisi wajib diunggah!");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("documentId", document.id.toString());
    formData.append("revisionNumber", revisionNumber.trim());
    formData.append("effectiveDate", effectiveDate);
    formData.append("changeDescription", changeDescription.trim());
    formData.append("pdfFile", pdfFile);
    if (docxFile) formData.append("docxFile", docxFile);

    try {
      const res = await createSopWinRevisionAction(formData);
      if (res.success) {
        toast.success(res.message || "Revisi baru berhasil diterbitkan!");
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Gagal menerbitkan revisi.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat memproses revisi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-lg rounded-3xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <History className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Terbitkan Revisi Baru
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">
                {document.documentNumber} • {document.title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Revisi Saat Ini:</span>
            <Badge className="bg-slate-200 text-slate-800 font-mono text-xs">
              Rev {document.currentRevision}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nomor Revisi Baru <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={revisionNumber}
                onChange={(e) => setRevisionNumber(e.target.value)}
                placeholder="Contoh: 01, 02"
                required
                className="h-9 rounded-xl font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar className="size-3.5 text-slate-400" />
                Tanggal Berlaku
              </Label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Uraian Perubahan / Changelog <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              placeholder="Jelaskan bagian mana saja yang diubah, dihapus, atau ditambahkan pada revisi ini..."
              value={changeDescription}
              onChange={(e) => setChangeDescription(e.target.value)}
              required
              rows={3}
              className="rounded-xl text-xs"
            />
          </div>

          {/* Upload Files */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
            <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>Upload Berkas Revisi Baru</span>
              <Badge variant="outline" className="text-[9px] text-indigo-700 bg-indigo-50">
                <Sparkles className="size-2.5 mr-1" />
                Auto RAG Re-Index
              </Badge>
            </Label>

            <div className="space-y-2">
              <div>
                <Label className="text-[11px] text-slate-500">File PDF Baru (Wajib Pratinjau):</Label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  required
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#003461] file:text-white hover:file:bg-[#002647] cursor-pointer mt-1"
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-500">File DOCX Baru (Opsional AI):</Label>
                <input
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setDocxFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="size-3.5 animate-spin" />
                  Menerbitkan Revisi...
                </>
              ) : (
                <>
                  <FileCheck className="size-3.5" />
                  Terbitkan Revisi
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
