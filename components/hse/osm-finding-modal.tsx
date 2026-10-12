"use client";

import { useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, Image as ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createHseOsmFinding } from "@/app/actions/hse-osm";
import { uploadFile } from "@/app/actions/upload";
import { resolveClientUploadUrl } from "@/lib/client-upload-url";
import { HSE_OSM_DEFAULT_CLASSIFICATIONS, type HseOsmRiskLevel, type HseOsmFindingCondition } from "@/lib/hse-osm-constants";

type OsmFindingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  sessionId: number;
  sessionNumber: string;
  classifications?: Array<{ id: number; code: string; name: string }>;
  onSuccess: () => void;
};

export function OsmFindingModal({
  isOpen,
  onClose,
  sessionId,
  sessionNumber,
  classifications = [],
  onSuccess,
}: OsmFindingModalProps) {
  const categoryOptions =
    classifications.length > 0 ? classifications : HSE_OSM_DEFAULT_CLASSIFICATIONS;

  const [condition, setCondition] = useState<HseOsmFindingCondition>("SUBSTANDARD");
  const [classificationId, setClassificationId] = useState<number | undefined>(
    classifications[0]?.id
  );
  const [classificationName, setClassificationName] = useState<string>(
    categoryOptions[0]?.name || "Vehicle & Mobile Equipment Pneumatic & Hand Tools"
  );
  const [description, setDescription] = useState("");
  const [riskLevel, setRiskLevel] = useState<HseOsmRiskLevel>("MEDIUM");
  const [actionRequired, setActionRequired] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedPhotos.length + files.length > 3) {
      setError("Maksimal 3 foto temuan.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("uploadTarget", "hse-osm");

        const res = await uploadFile(formData);
        if (res.success && res.url) {
          newUrls.push(res.url);
        } else {
          throw new Error(res.error || "Gagal mengunggah foto temuan.");
        }
      }
      setUploadedPhotos((prev) => [...prev, ...newUrls]);
    } catch (err: any) {
      setError(err?.message || "Gagal mengunggah foto.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  function handleRemovePhoto(index: number) {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) {
      setError("Uraian deskripsi temuan wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const isStandard = condition === "STANDARD";

    try {
      const res = await createHseOsmFinding(sessionId, {
        classificationId,
        classificationName,
        description: description.trim(),
        photoUrls: uploadedPhotos,
        riskLevel,
        status: isStandard ? "CLOSED" : "OPEN",
        condition,
        actionRequired: isStandard
          ? (actionRequired.trim() || "Good Condition / Sesuai Standar Keselamatan")
          : actionRequired.trim(),
        actionTaken: isStandard
          ? "Kondisi telah diperiksa dan dipastikan sesuai standar keselamatan (Standard / Close)."
          : undefined,
        dueDate: isStandard ? undefined : (dueDate || undefined),
      });

      if (!res.success) {
        throw new Error(res.error || "Gagal menyimpan temuan.");
      }

      onSuccess();
      onClose();
      // Reset form
      setCondition("SUBSTANDARD");
      setDescription("");
      setUploadedPhotos([]);
      setActionRequired("");
      setDueDate("");
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat menyimpan temuan.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="size-5 text-amber-500" />
            Input Tiket Temuan Lapangan
          </DialogTitle>
          <DialogDescription>
            Menambahkan temuan baru pada sesi monitoring <strong className="text-foreground">{sessionNumber}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-sm">
          {/* 1. Pilihan Kondisi Temuan: Substandard / Open vs Standard / Close */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center justify-between">
              <span>Kondisi Temuan Lapangan <span className="text-red-500">*</span></span>
              <span className="text-[11px] text-muted-foreground font-normal">Pilih status kondisi</span>
            </Label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCondition("SUBSTANDARD")}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  condition === "SUBSTANDARD"
                    ? "bg-red-50 border-red-500 dark:bg-red-950/40 dark:border-red-600 ring-2 ring-red-500/20 shadow-xs"
                    : "bg-background border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`size-4 shrink-0 ${condition === "SUBSTANDARD" ? "text-red-600" : "text-muted-foreground"}`} />
                  <span className={`text-xs font-bold ${condition === "SUBSTANDARD" ? "text-red-700 dark:text-red-300" : "text-foreground"}`}>
                    Substandard / Open
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground leading-snug">
                  Kondisi di bawah standar / tidak aman, butuh tindakan perbaikan
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCondition("STANDARD")}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  condition === "STANDARD"
                    ? "bg-emerald-50 border-emerald-500 dark:bg-emerald-950/40 dark:border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs"
                    : "bg-background border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className={`size-4 shrink-0 ${condition === "STANDARD" ? "text-emerald-600" : "text-muted-foreground"}`} />
                  <span className={`text-xs font-bold ${condition === "STANDARD" ? "text-emerald-700 dark:text-emerald-300" : "text-foreground"}`}>
                    Standard / Close
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground leading-snug">
                  Kondisi baik & sesuai standar (Good Condition, langsung tuntas)
                </span>
              </button>
            </div>
            {condition === "STANDARD" && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                Temuan ini langsung berstatus <strong>Standard / Close</strong> tanpa perlu tindak lanjut perbaikan lapangan.
              </p>
            )}
          </div>

          {/* Classification */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Tipe Klasifikasi Temuan <span className="text-red-500">*</span>
            </Label>
            <Select
              value={classificationName}
              onValueChange={(val) => {
                setClassificationName(val);
                const found = categoryOptions.find((c) => c.name === val);
                if (found && "id" in found) {
                  setClassificationId(found.id);
                }
              }}
            >
              <SelectTrigger className="w-full text-xs">
                <SelectValue placeholder="Pilih klasifikasi temuan..." />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat, idx) => (
                  <SelectItem key={idx} value={cat.name} className="text-xs">
                    {idx + 1}. {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Risk Level & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tingkat Risiko</Label>
              <Select value={riskLevel} onValueChange={(val) => setRiskLevel(val as HseOsmRiskLevel)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low Risk</SelectItem>
                  <SelectItem value="MEDIUM">Medium Risk</SelectItem>
                  <SelectItem value="HIGH">High Risk</SelectItem>
                  <SelectItem value="CRITICAL">Critical Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {condition === "SUBSTANDARD" ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Target Selesai (Due Date)</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Status Tiket</Label>
                <div className="h-9 rounded-md border bg-muted/40 px-3 flex items-center text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Selesai (Close)
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="findingDesc" className="text-xs font-semibold">
              Uraian Teks / Deskripsi Masalah <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="findingDesc"
              rows={4}
              placeholder={
                condition === "STANDARD"
                  ? "Jelaskan kondisi baik / kesesuaian standar yang dipantau (misal: Penempatan Tools telah sesuai / Good Condition)..."
                  : "Jelaskan kondisi bahaya / tindakan tidak aman yang ditemukan di lapangan..."
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none text-xs"
              required
            />
          </div>

          {/* Action Required */}
          <div className="space-y-1.5">
            <Label htmlFor="actionReq" className="text-xs font-semibold">
              Rekomendasi Tindakan Perbaikan {condition === "STANDARD" ? "(Opsional)" : ""}
            </Label>
            <Input
              id="actionReq"
              placeholder={
                condition === "STANDARD"
                  ? "Opsional: Sesuai Standar Keselamatan"
                  : "Contoh: Pasang barricade, lengkapi whip check, ganti APD..."
              }
              value={actionRequired}
              onChange={(e) => setActionRequired(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Foto Temuan Lapangan (Maks. 3 File)</Label>
            <div className="grid grid-cols-3 gap-3">
              {uploadedPhotos.map((url, idx) => (
                <div key={idx} className="relative aspect-video rounded-md border overflow-hidden bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveClientUploadUrl(url)}
                    alt={`Temuan ${idx + 1}`}
                    className="size-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 size-6 rounded-full bg-red-600 text-white flex items-center justify-center opacity-80 hover:opacity-100 shadow transition-opacity"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}

              {uploadedPhotos.length < 3 && (
                <label className="border-2 border-dashed rounded-md aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-50/20 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Camera className="size-5 text-muted-foreground mb-1" />
                      <span className="text-[11px] text-muted-foreground font-medium">Tambah Foto</span>
                    </>
                  )}
                </label>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-2.5 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || isUploading}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Plus className="mr-1.5 size-3.5" />
                  Simpan Temuan
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
