"use client";

import * as React from "react";
import { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviewApprovalAction } from "@/app/dashboard/admin-actions";
import { getUserSignatureAction } from "@/app/actions/user-signature";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  PenTool,
  Plane,
  Printer,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "numeric", year: "numeric" });
}

export function FlightRouteChangeApprovalDialog({ item, group }: { item: any; group?: any }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [note, setNote] = useState("");
  const [decisionChoice, setDecisionChoice] = useState<"approved" | "rejected" | "reverted">("approved");
  const [profileSig, setProfileSig] = useState<string | null>(null);
  const [isUsingProfileSig, setIsUsingProfileSig] = useState(true);

  const reqId =
    item.flightRouteRequestId ||
    (item.rawGeneralGroup?.items?.find((i: any) => i.flightRouteRequestId != null) as any)?.flightRouteRequestId ||
    (typeof item.id === "number" ? item.id : Number(String(item.id || "").replace(/\D/g, ""))) ||
    item.activityId ||
    item.id;

  const printUrl = `/api/hc/flight-route-change/${reqId}/pdf`;

  useEffect(() => {
    if (open) {
      getUserSignatureAction()
        .then((res) => {
          if (res.success && res.signatureDataUrl) {
            setProfileSig(res.signatureDataUrl);
            setIsUsingProfileSig(true);
          } else {
            setIsUsingProfileSig(false);
          }
        })
        .catch(() => {});
    }
  }, [open]);

  const clearSignature = () => {
    sigCanvas.current?.clear();
    setIsUsingProfileSig(false);
  };

  const useProfileSignature = () => {
    if (!profileSig) return;
    setIsUsingProfileSig(true);
    sigCanvas.current?.clear();
    toast.success("Menggunakan tanda tangan profil HERO.");
  };

  const handleDecision = async (selectedDecision: "approved" | "rejected" | "reverted") => {
    setIsSubmitting(true);

    try {
      if ((selectedDecision === "reverted" || selectedDecision === "rejected") && !note.trim()) {
        toast.error(
          selectedDecision === "reverted"
            ? "Silakan tuliskan alasan pengembalian / revisi pada Catatan Approval."
            : "Silakan tuliskan alasan penolakan pada Catatan Approval."
        );
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append("approvalId", (item.approvalId || item.id).toString());
      formData.append("decision", selectedDecision);
      formData.append("note", note || "");

      if (selectedDecision === "approved") {
        const signatureUrlToUse =
          isUsingProfileSig && profileSig
            ? profileSig
            : sigCanvas.current && !sigCanvas.current.isEmpty()
            ? sigCanvas.current.getTrimmedCanvas().toDataURL("image/png")
            : null;

        if (!signatureUrlToUse) {
          toast.error("Silakan berikan tanda tangan sebelum menyetujui.");
          setIsSubmitting(false);
          return;
        }

        if (signatureUrlToUse.startsWith("data:")) {
          try {
            const split = signatureUrlToUse.split(",");
            const byteString = atob(split[1]);
            const mimeString = split[0].split(":")[1].split(";")[0];
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: mimeString });
            formData.append("signatureFile", blob, "approver_signature.png");
          } catch (e) {
            formData.append("signatureUrl", signatureUrlToUse);
          }
        } else {
          formData.append("signatureUrl", signatureUrlToUse);
        }
      }

      await reviewApprovalAction(formData);
      toast.success(
        selectedDecision === "approved"
          ? "Permohonan perubahan rute penerbangan telah disetujui."
          : selectedDecision === "reverted"
          ? "Permohonan perubahan rute penerbangan telah dikembalikan untuk revisi."
          : "Permohonan perubahan rute penerbangan telah ditolak."
      );
      setOpen(false);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan saat memproses persetujuan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasSignature = Boolean((isUsingProfileSig && profileSig) || !sigCanvas.current?.isEmpty?.());

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
        >
          <Plane className="size-3.5" />
          Review & Approve
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-6xl w-[95vw] h-[92vh] max-h-[92vh] p-0 flex flex-col gap-0 overflow-hidden bg-slate-50">
        {/* Header */}
        <DialogHeader className="px-6 py-3.5 bg-white border-b border-slate-200 shrink-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700 shrink-0">
              <Plane className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Persetujuan Perubahan Rute Penerbangan</span>
                <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {item.requestNumber || `REQ-${reqId}`}
                </span>
              </DialogTitle>
              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                <span>Pemohon: <strong className="text-slate-700">{item.requesterName || item.employeeName || "Karyawan"}</strong></span>
                <span>&bull;</span>
                <span>Site: <strong className="text-slate-700">{item.siteName || "—"}</strong></span>
                <span>&bull;</span>
                <span>Tahap: <strong className="text-sky-700">Step {item.level || 2} ({item.currentStepLabel || "Mengetahui"})</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a href={printUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-slate-300">
                <ExternalLink className="size-3.5" />
                Buka Tab Baru
              </Button>
            </a>
          </div>
        </DialogHeader>

        {/* Content Split: Left (PDF Preview) | Right (Action & Signature Panel) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Document PDF Preview */}
          <div className="flex-1 bg-slate-200 p-3 overflow-hidden flex flex-col">
            <div className="flex-1 bg-white rounded-lg shadow-inner overflow-hidden border border-slate-300">
              <iframe
                ref={iframeRef}
                src={printUrl}
                className="w-full h-full border-none"
                title={`Preview ${item.requestNumber || reqId}`}
              />
            </div>
          </div>

          {/* Right: Signature & Decision Panel */}
          <div className="w-[380px] bg-white border-l border-slate-200 p-5 overflow-y-auto flex flex-col justify-between shrink-0">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 mb-1">
                  <PenTool className="size-3.5 text-sky-600" />
                  Persetujuan & Tanda Tangan Digital
                </h4>
                <p className="text-[11px] text-slate-500">
                  Langkah persetujuan ke-{item.level || 2}. Tanda tangan dan catatan Anda akan dicatat ke dokumen resmi.
                </p>
              </div>

              {/* Catatan Approval Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Catatan Approval</span>
                  <span className="text-[10px] text-slate-400">(Wajib jika menolak/kembalikan)</span>
                </label>
                <Textarea
                  placeholder="Tuliskan catatan persetujuan atau alasan revisi..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>

              {/* Signature Canvas / Profile Signature */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Tanda Tangan Approver *</label>
                  <div className="flex items-center gap-1.5">
                    {profileSig && (
                      <button
                        type="button"
                        onClick={useProfileSignature}
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded font-semibold cursor-pointer transition-colors",
                          isUsingProfileSig
                            ? "bg-sky-100 text-sky-800 border border-sky-300"
                            : "text-sky-600 hover:bg-sky-50"
                        )}
                      >
                        Pakai Profil HERO
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-[10px] text-slate-500 hover:text-slate-800 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                </div>

                <div className="border border-slate-300 rounded-lg p-2 bg-slate-50 relative flex items-center justify-center min-h-[130px]">
                  {isUsingProfileSig && profileSig ? (
                    <div className="flex flex-col items-center justify-center py-2">
                      <img src={profileSig} alt="Tanda Tangan Profil" className="max-h-24 max-w-[200px] object-contain" />
                      <span className="text-[10px] text-slate-500 font-medium mt-1">Tanda Tangan Profil HERO</span>
                    </div>
                  ) : (
                    <SignatureCanvas
                      ref={sigCanvas}
                      canvasProps={{
                        className: "w-full h-[120px] bg-white rounded border border-slate-200 cursor-crosshair",
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <Button
                onClick={() => handleDecision("approved")}
                disabled={isSubmitting || !hasSignature}
                className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <RefreshCw className="size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                Setujui Step {item.level || 2}
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDecision("reverted")}
                  disabled={isSubmitting}
                  className="h-9 text-amber-800 border-amber-300 bg-amber-50/60 hover:bg-amber-100/70 text-xs font-semibold gap-1 cursor-pointer truncate"
                  title={item.level <= 2 ? "Kembalikan ke Pemohon (Draft revisi)" : `Kembalikan ke Step ${(item.level || 2) - 1} untuk koreksi`}
                >
                  <RotateCcw className="size-3 text-amber-700 shrink-0" />
                  <span className="truncate">{item.level <= 2 ? "Ke Pemohon" : `Ke Step ${(item.level || 2) - 1}`}</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDecision("rejected")}
                  disabled={isSubmitting}
                  className="h-9 text-rose-700 border-rose-300 hover:bg-rose-50 text-xs font-semibold gap-1 cursor-pointer"
                >
                  <XCircle className="size-3 text-rose-600 shrink-0" />
                  Tolak
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
