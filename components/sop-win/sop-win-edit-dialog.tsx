"use client";

import { useState, useEffect } from "react";
import {
  FileEdit,
  UploadCloud,
  Sparkles,
  Building,
  UserCheck,
  Calendar,
  Layers,
  ArrowRightLeft,
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
import { updateSopWinDocumentAction } from "@/app/dashboard/sop-win/actions";
import {
  SearchableDepartmentSelect,
  SearchablePicSelect,
  type DepartmentSelectOption,
  type PicSelectOption,
} from "./sop-win-searchable-select";

interface SopWinEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: number;
    documentNumber: string;
    title: string;
    documentType: string;
    departmentCode: string;
    ownerEmployeeId?: number | null;
    summary?: string | null;
    effectiveDate?: string | null;
  } | null;
  departments: DepartmentSelectOption[];
  employees?: Array<{ id: number; name: string; employeeSn: string | null; position: string | null }>;
  picOptions: PicSelectOption[];
  onSuccess: () => void;
  onOpenManageDepartment?: () => void;
}

export function SopWinEditDialog({
  isOpen,
  onClose,
  document,
  departments,
  employees = [],
  picOptions,
  onSuccess,
  onOpenManageDepartment,
}: SopWinEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [documentNumber, setDocumentNumber] = useState("");
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState<string>("SOP");
  const [departmentCode, setDepartmentCode] = useState<string>("SERVICE");
  const [ownerEmployeeId, setOwnerEmployeeId] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [summary, setSummary] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [docxFile, setDocxFile] = useState<File | null>(null);

  useEffect(() => {
    if (document) {
      setDocumentNumber(document.documentNumber || "");
      setTitle(document.title || "");
      setDocumentType(document.documentType || "SOP");
      setDepartmentCode(document.departmentCode || "SERVICE");
      setOwnerEmployeeId(document.ownerEmployeeId ? document.ownerEmployeeId.toString() : "");
      setSummary(document.summary || "");
      setEffectiveDate(
        document.effectiveDate
          ? new Date(document.effectiveDate).toISOString().split("T")[0]
          : ""
      );
      setPdfFile(null);
      setDocxFile(null);
    }
  }, [document, isOpen]);

  if (!document) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentNumber.trim() || !title.trim()) {
      toast.error("Nomor Dokumen dan Judul Dokumen wajib diisi!");
      return;
    }

    setIsSubmitting(true);
    const formData = new FormData();
    formData.append("documentId", document.id.toString());
    formData.append("documentNumber", documentNumber.trim());
    formData.append("title", title.trim());
    formData.append("documentType", documentType);
    formData.append("departmentCode", departmentCode);
    if (ownerEmployeeId) formData.append("ownerEmployeeId", ownerEmployeeId);
    if (effectiveDate) formData.append("effectiveDate", effectiveDate);
    formData.append("summary", summary.trim());
    if (pdfFile) formData.append("pdfFile", pdfFile);
    if (docxFile) formData.append("docxFile", docxFile);

    try {
      const res = await updateSopWinDocumentAction(formData);
      if (res.success) {
        toast.success(res.message || "Dokumen berhasil diperbarui!");
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || "Gagal memperbarui dokumen.");
      }
    } catch (err: any) {
      toast.error(err.message || "Terjadi kesalahan saat memperbarui.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
              <FileEdit className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Edit Dokumen & Pindah Departemen
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Ubah informasi metadata dokumen atau pindahkan ke departemen lain.
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
            {/* Department (Move Location) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <ArrowRightLeft className="size-3.5 text-indigo-600" />
                  Lokasi Departemen <span className="text-rose-500">*</span>
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
                placeholder="Pilih lokasi departemen..."
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

          {/* Summary / Scope */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Ringkasan / Uraian Cakupan SOP
            </Label>
            <Textarea
              placeholder="Deskripsi singkat isi SOP..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              className="rounded-xl text-xs"
            />
          </div>

          {/* Replace file (Optional) */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span>Ganti File Dokumen (Opsional)</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Biarkan kosong jika tidak ingin mengubah file
              </span>
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                  File PDF Baru:
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-[#003461] file:text-white"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-[11px] font-semibold text-slate-700 block mb-1">
                  File DOCX Baru:
                </span>
                <input
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => setDocxFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-200 file:text-slate-800"
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
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Sparkles className="size-3.5 animate-spin" />
                  Menyimpan Perubahan...
                </>
              ) : (
                <>
                  <FileEdit className="size-3.5" />
                  Simpan Perubahan
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
