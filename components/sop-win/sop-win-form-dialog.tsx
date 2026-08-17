"use client";

import { useState } from "react";
import {
  FileText,
  UploadCloud,
  FileCode,
  Sparkles,
  Info,
  Calendar,
  Layers,
  UserCheck,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createSopWinDocumentAction } from "@/app/dashboard/sop-win/actions";
import {
  SearchableDepartmentSelect,
  SearchablePicSelect,
  type DepartmentSelectOption,
  type PicSelectOption,
} from "./sop-win-searchable-select";

interface SopWinFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  departments: DepartmentSelectOption[];
  employees?: Array<{ id: number; name: string; employeeSn: string | null; position: string | null }>;
  picOptions: PicSelectOption[];
  onSuccess: () => void;
  defaultDepartment?: string;
  onOpenManageDepartment?: () => void;
}

export function SopWinFormDialog({
  isOpen,
  onClose,
  departments,
  employees = [],
  picOptions,
  onSuccess,
  defaultDepartment = "SERVICE",
  onOpenManageDepartment,
}: SopWinFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentNumber, setDocumentNumber] = useState("");
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState<"SOP" | "WIN" | "POL">("SOP");
  const [departmentCode, setDepartmentCode] = useState(defaultDepartment);
  const [ownerEmployeeId, setOwnerEmployeeId] = useState<string>("");
  const [revisionNumber, setRevisionNumber] = useState("00");
  const [effectiveDate, setEffectiveDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [summary, setSummary] = useState("");
  const [changeDescription, setChangeDescription] = useState("Rilis perdana dokumen.");

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [docxFile, setDocxFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentNumber.trim() || !title.trim()) {
      toast.error("Nomor Dokumen dan Judul Dokumen wajib diisi!");
      return;
    }
    if (!pdfFile) {
      toast.error("File PDF Dokumen wajib diunggah untuk pratinjau!");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("documentNumber", documentNumber.trim());
    formData.append("title", title.trim());
    formData.append("documentType", documentType);
    formData.append("departmentCode", departmentCode);
    if (ownerEmployeeId) formData.append("ownerEmployeeId", ownerEmployeeId);
    formData.append("revisionNumber", revisionNumber.trim() || "00");
    formData.append("effectiveDate", effectiveDate);
    formData.append("summary", summary.trim());
    formData.append("changeDescription", changeDescription.trim());
    formData.append("pdfFile", pdfFile);
    if (docxFile) formData.append("docxFile", docxFile);

    try {
      const res = await createSopWinDocumentAction(formData);
      if (res.success) {
        toast.success(res.message || "Dokumen berhasil disimpan!");
        onSuccess();
        onClose();
        // Reset form
        setDocumentNumber("");
        setTitle("");
        setSummary("");
        setPdfFile(null);
        setDocxFile(null);
      } else {
        toast.error(res.error || "Gagal menyimpan dokumen.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan sistem saat menyimpan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#003461] text-white shadow-sm">
              <FileText className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Tambah Dokumen SOP / WIN / POL
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Dokumen disimpan instan, proses OCR & sinkronisasi AI berjalan di background secara berurutan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Document Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nomor Dokumen <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="Contoh: WIN.SVC_.SEM-020.02"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                required
                className="h-9 rounded-xl font-mono text-xs"
              />
            </div>

            {/* Document Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tipe Dokumen <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={documentType}
                onValueChange={(val: any) => setDocumentType(val)}
              >
                <SelectTrigger className="h-9 rounded-xl text-xs font-semibold">
                  <SelectValue placeholder="Pilih Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SOP" className="font-semibold text-indigo-700">
                    SOP (Standard Operating Procedure)
                  </SelectItem>
                  <SelectItem value="WIN" className="font-semibold text-sky-700">
                    WIN (Work Instruction)
                  </SelectItem>
                  <SelectItem value="POL" className="font-semibold text-emerald-700">
                    POL (Policy / Kebijakan)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Document Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama / Judul Dokumen <span className="text-rose-500">*</span>
            </Label>
            <Input
              placeholder="Contoh: Prosedur Pengoperasian Hydraulic Jack Stand"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="h-9 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Department */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Building className="size-3.5 text-slate-400" />
                  Departemen <span className="text-rose-500">*</span>
                </span>
                {onOpenManageDepartment && (
                  <button
                    type="button"
                    onClick={onOpenManageDepartment}
                    className="text-[10px] text-blue-600 hover:underline font-bold"
                  >
                    + Kelola / Tambah
                  </button>
                )}
              </Label>
              <SearchableDepartmentSelect
                value={departmentCode}
                onChange={(val) => setDepartmentCode(val)}
                departments={departments}
                onOpenManage={onOpenManageDepartment}
                placeholder="Pilih atau cari departemen..."
              />
            </div>

            {/* Document Owner (PIC) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <UserCheck className="size-3.5 text-slate-400" />
                  PIC / Penanggung Jawab
                </span>
                <span className="text-[10px] text-slate-400">Head Dept / Section / Staff</span>
              </Label>
              <SearchablePicSelect
                value={ownerEmployeeId}
                onChange={(val) => setOwnerEmployeeId(val)}
                picOptions={picOptions}
                placeholder="Cari PIC (Head Dept, Section, Staff)..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Revision Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nomor Revisi Awal
              </Label>
              <Input
                placeholder="00"
                value={revisionNumber}
                onChange={(e) => setRevisionNumber(e.target.value)}
                className="h-9 rounded-xl font-mono text-xs"
              />
            </div>

            {/* Effective Date */}
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

          {/* Summary / Scope */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Ringkasan / Uraian Cakupan SOP
            </Label>
            <Textarea
              placeholder="Deskripsi singkat isi SOP atau instruksi kerja..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="rounded-xl text-xs"
            />
          </div>

          {/* File Upload Section */}
          <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <UploadCloud className="size-4 text-[#003461]" />
                Berkas Dokumen
              </Label>
              <Badge variant="outline" className="text-[10px] text-indigo-700 bg-indigo-50 border-indigo-200">
                <Sparkles className="size-2.5 mr-1" />
                Auto RAG AI Ingest
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* PDF File (Required for preview) */}
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 text-center dark:border-slate-700 dark:bg-slate-900">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  File PDF <span className="text-rose-500">* (Pratinjau)</span>
                </div>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  required
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#003461] file:text-white hover:file:bg-[#002647] cursor-pointer"
                />
                {pdfFile && (
                  <p className="text-[10px] text-emerald-600 font-medium mt-1 truncate">
                    ✓ {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {/* DOCX File (Optional for RAG optimization) */}
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 text-center dark:border-slate-700 dark:bg-slate-900">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  File DOCX <span className="text-slate-400">(Opsional RAG)</span>
                </div>
                <input
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setDocxFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 cursor-pointer"
                />
                {docxFile ? (
                  <p className="text-[10px] text-indigo-600 font-medium mt-1 truncate">
                    ✓ {docxFile.name} ({(docxFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Mempermudah ekstraksi AI jika tersedia
                  </p>
                )}
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
              className="rounded-xl bg-[#003461] hover:bg-[#002647] text-white text-xs font-semibold gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="size-3.5 animate-spin" />
                  Menyimpan & Mengindeks RAG...
                </>
              ) : (
                <>
                  <FileText className="size-3.5" />
                  Simpan & Rilis Dokumen
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
