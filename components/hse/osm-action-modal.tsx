"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, UploadCloud, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitHseOsmAction, verifyHseOsmFinding } from "@/app/actions/hse-osm";
import { uploadFile } from "@/app/actions/upload";
import { resolveClientUploadUrl } from "@/lib/client-upload-url";

type OsmActionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  finding: {
    id: number;
    findingNumber: string;
    classificationName: string;
    description: string;
    status: string;
    actionTaken?: string | null;
    actionPhotoUrls?: string[] | null;
  } | null;
  mode: "submit_action" | "verify_close" | "verify_reject";
  onSuccess: () => void;
};

export function OsmActionModal({
  isOpen,
  onClose,
  finding,
  mode,
  onSuccess,
}: OsmActionModalProps) {
  const [actionTaken, setActionTaken] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!finding) return null;

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedPhotos.length + files.length > 3) {
      setError("Maksimal 3 foto bukti perbaikan.");
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
          throw new Error(res.error || "Gagal mengunggah foto.");
        }
      }
      setUploadedPhotos((prev) => [...prev, ...newUrls]);
    } catch (err: any) {
      setError(err?.message || "Gagal mengunggah foto perbaikan.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  function handleRemovePhoto(index: number) {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!finding) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (mode === "submit_action") {
        if (!actionTaken.trim()) {
          throw new Error("Uraian tindakan perbaikan wajib diisi.");
        }
        const res = await submitHseOsmAction(finding.id, {
          actionTaken: actionTaken.trim(),
          actionPhotoUrls: uploadedPhotos,
        });
        if (!res.success) throw new Error(res.error || "Gagal menyimpan perbaikan.");
      } else if (mode === "verify_close") {
        const res = await verifyHseOsmFinding(finding.id, {
          status: "CLOSED",
        });
        if (!res.success) throw new Error(res.error || "Gagal memverifikasi penutupan.");
      } else if (mode === "verify_reject") {
        if (!rejectionReason.trim()) {
          throw new Error("Alasan penolakan / revisi perbaikan wajib diisi.");
        }
        const res = await verifyHseOsmFinding(finding.id, {
          status: "REJECTED",
          rejectionReason: rejectionReason.trim(),
        });
        if (!res.success) throw new Error(res.error || "Gagal menolak perbaikan.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan saat memproses data.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            {mode === "submit_action" && (
              <>
                <UploadCloud className="size-5 text-amber-600" />
                Submit Tindakan Perbaikan
              </>
            )}
            {mode === "verify_close" && (
              <>
                <CheckCircle2 className="size-5 text-emerald-600" />
                Verifikasi Penutupan Temuan (Close)
              </>
            )}
            {mode === "verify_reject" && (
              <>
                <XCircle className="size-5 text-red-600" />
                Tolak Perbaikan Temuan (Reject)
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Tiket <strong className="text-foreground">{finding.findingNumber}</strong> — {finding.classificationName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="rounded-lg bg-muted/60 p-3 text-xs leading-relaxed">
            <span className="font-semibold text-foreground">Deskripsi Masalah:</span>
            <p className="mt-1 text-muted-foreground">{finding.description}</p>
          </div>

          {mode === "submit_action" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="actionTaken" className="text-xs font-semibold">
                  Uraian Tindakan Perbaikan yang Dilakukan <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="actionTaken"
                  rows={4}
                  placeholder="Jelaskan tindakan perbaikan/eliminasi bahaya yang telah diselesaikan di lapangan..."
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className="resize-none text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Foto Bukti Perbaikan (Maks. 3 Foto)</Label>
                <div className="grid grid-cols-3 gap-3">
                  {uploadedPhotos.map((url, idx) => (
                    <div key={idx} className="relative aspect-video rounded-md border overflow-hidden group bg-slate-950">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveClientUploadUrl(url)}
                        alt={`Bukti perbaikan ${idx + 1}`}
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
                          <ImageIcon className="size-5 text-muted-foreground mb-1" />
                          <span className="text-[11px] text-muted-foreground font-medium">Unggah Foto</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>
            </>
          )}

          {mode === "verify_close" && (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Apakah Anda yakin telah memverifikasi bahwa tindakan perbaikan di lapangan telah tuntas dan kondisi bahaya berhasil dieliminasi?
              </p>
              {finding.actionTaken && (
                <div className="rounded-lg border bg-emerald-50/50 p-3 text-xs dark:bg-emerald-950/20">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-300">Tindakan Perbaikan Lapangan:</span>
                  <p className="mt-1 text-emerald-800 dark:text-emerald-200">{finding.actionTaken}</p>
                </div>
              )}
            </div>
          )}

          {mode === "verify_reject" && (
            <div className="space-y-2">
              <Label htmlFor="rejectionReason" className="text-xs font-semibold">
                Alasan Penolakan / Catatan Perbaikan Lanjutan <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejectionReason"
                rows={3}
                placeholder="Tuliskan catatan perbaikan lanjutan atau standar yang belum terpenuhi..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="resize-none text-sm"
              />
            </div>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || isUploading}
            className={
              mode === "submit_action"
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : mode === "verify_close"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                Memproses...
              </>
            ) : mode === "submit_action" ? (
              "Kirim Perbaikan"
            ) : mode === "verify_close" ? (
              "Verifikasi & Selesai"
            ) : (
              "Tolak & Kembalikan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
