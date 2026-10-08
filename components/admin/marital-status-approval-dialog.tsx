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
  Heart,
  PenTool,
  Printer,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric' });
}

export function MaritalStatusApprovalDialog({ item }: { item: any; group?: any }) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [note, setNote] = useState('');
  const [profileSig, setProfileSig] = useState<string | null>(null);
  const [isUsingProfileSig, setIsUsingProfileSig] = useState(true);
  const throttleTimer = useRef<NodeJS.Timeout | null>(null);

  const reqId =
    item.maritalStatusRequestId ||
    (item.rawGeneralGroup?.items?.find((i: any) => i.maritalStatusRequestId != null) as any)?.maritalStatusRequestId ||
    (typeof item.id === 'number' ? item.id : Number(String(item.id || '').replace(/\D/g, ''))) ||
    item.activityId ||
    item.id;

  const handleDirectPrint = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch (e) {}
    }
    window.open(`/print/central-service/marital-status/${reqId}`, '_blank');
  };

  useEffect(() => {
    if (open) {
      getUserSignatureAction().then((res) => {
        if (res.success && res.signatureDataUrl) {
          setProfileSig(res.signatureDataUrl);
          setIsUsingProfileSig(true);
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ type: 'previewSignature', dataUrl: res.signatureDataUrl }, '*');
          }
        } else {
          setIsUsingProfileSig(false);
        }
      }).catch(() => {});
    }
  }, [open]);

  const sendLiveSignature = () => {
    const dataUrl = isUsingProfileSig && profileSig
      ? profileSig
      : sigCanvas.current && !sigCanvas.current.isEmpty()
      ? sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')
      : '';

    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'previewSignature', dataUrl }, '*');
    }
  };

  const handleStroke = () => {
    if (isUsingProfileSig) setIsUsingProfileSig(false);
    if (throttleTimer.current) return;
    throttleTimer.current = setTimeout(() => {
      throttleTimer.current = null;
      sendLiveSignature();
    }, 40);
  };

  const handleEnd = () => {
    if (isUsingProfileSig) setIsUsingProfileSig(false);
    if (throttleTimer.current) {
      clearTimeout(throttleTimer.current);
      throttleTimer.current = null;
    }
    sendLiveSignature();
  };

  const clearSignature = () => {
    if (throttleTimer.current) {
      clearTimeout(throttleTimer.current);
      throttleTimer.current = null;
    }
    sigCanvas.current?.clear();
    setIsUsingProfileSig(false);

    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'previewSignature', dataUrl: '' }, '*');
    }
  };

  const useProfileSignature = () => {
    if (!profileSig) return;
    setIsUsingProfileSig(true);
    sigCanvas.current?.clear();
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'previewSignature', dataUrl: profileSig }, '*');
    }
    toast.success("Menggunakan tanda tangan profil HERO.");
  };

  const handleDecision = async (selectedDecision: string) => {
    setIsSubmitting(true);

    try {
      if ((selectedDecision === 'reverted' || selectedDecision === 'rejected') && !note.trim()) {
        toast.error(
          selectedDecision === 'reverted'
            ? "Silakan tuliskan alasan pengembalian / revisi pada Catatan Approval."
            : "Silakan tuliskan alasan penolakan pada Catatan Approval."
        );
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.append('approvalId', item.approvalId.toString());
      formData.append('decision', selectedDecision);
      formData.append('note', note || '');

      if (selectedDecision === 'approved') {
        const signatureUrlToUse = isUsingProfileSig && profileSig
          ? profileSig
          : sigCanvas.current && !sigCanvas.current.isEmpty()
          ? sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')
          : null;

        if (!signatureUrlToUse) {
          toast.error("Silakan berikan tanda tangan sebelum menyetujui.");
          setIsSubmitting(false);
          return;
        }

        const res = await fetch(signatureUrlToUse);
        const blob = await res.blob();
        formData.append('signatureFile', blob, 'approver_signature.png');
      }

      await reviewApprovalAction(formData);
      toast.success(
        selectedDecision === 'approved'
          ? "Permohonan perubahan status pernikahan telah disetujui."
          : selectedDecision === 'reverted'
          ? "Permohonan perubahan status pernikahan telah dikembalikan untuk revisi."
          : "Permohonan perubahan status pernikahan telah ditolak."
      );
      setOpen(false);
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan saat memproses persetujuan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isMobile, setIsMobile] = useState(false);
  const [showDoc, setShowDoc] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const printUrl = `/print/central-service/marital-status/${reqId}?embed=true`;
  const hasSignature = Boolean((isUsingProfileSig && profileSig) || (!sigCanvas.current?.isEmpty?.()));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs font-bold text-indigo-700 hover:bg-indigo-50 border-indigo-200 cursor-pointer shadow-xs"
        >
          Buka TTD ↗
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-7xl w-[98vw] sm:w-[95vw] h-[95vh] sm:h-[92vh] flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 bg-surface-container-lowest overflow-hidden">
        <DialogHeader className="pb-2 border-b shrink-0">
          <DialogTitle className="text-sm sm:text-lg font-bold leading-tight flex items-center gap-2 text-slate-800">
            <Heart className="w-5 h-5 text-emerald-600" />
            Persetujuan Status Pernikahan: {item.requestNumber || item.activityTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_340px] gap-3 sm:gap-4 min-h-0 overflow-hidden">
          {/* Document Preview (Left) */}
          <div className="rounded-lg border bg-card overflow-hidden shadow-xs flex flex-col min-h-0" style={{ height: isMobile ? (showDoc ? '40vh' : 'auto') : undefined }}>
            <div className="bg-muted px-3 py-1.5 border-b font-medium text-xs text-muted-foreground flex justify-between items-center shrink-0">
              <span>Dokumen Resmi F.CS.MS-01.00|1</span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDirectPrint}
                  className="h-6 text-[10px] px-2 text-gray-700 hover:bg-gray-200 cursor-pointer"
                >
                  <Printer className="w-3 h-3 mr-1" /> Cetak Dokumen PDF
                </Button>
              </div>
            </div>
            {(!isMobile || showDoc) && (
              <iframe
                ref={iframeRef}
                src={printUrl}
                onLoad={sendLiveSignature}
                className="w-full flex-1 min-h-[200px] bg-white border-0"
                title="Preview Dokumen Status Pernikahan"
              />
            )}
          </div>

          {/* Form & Signature (Right Panel - Hero Design System Style) */}
          <div className="flex flex-col gap-3 overflow-y-auto min-h-0 p-1">
            {/* Card 1: Informasi Dokumen */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 text-xs space-y-2 relative shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-800 text-xs">Informasi Dokumen</p>
                <span className="capitalize text-[10px] font-bold px-2 py-0.5 rounded-md border bg-blue-100 border-blue-300 text-blue-800">
                  {item.status || 'Submitted'}
                </span>
              </div>
              <div className="text-xs text-slate-600 space-y-1 pt-1">
                <p><span className="text-slate-400">Karyawan:</span> <span className="font-semibold text-slate-900">{item.requesterName || '—'}</span></p>
                <p><span className="text-slate-400">Kode Sesi:</span> <span className="font-mono text-indigo-700 font-semibold">{item.requestNumber || `MAR-${item.activityId || item.id}`}</span></p>
                <p><span className="text-slate-400">Tanggal:</span> <span className="font-semibold text-slate-900">{formatDate(item.workDate || item.submittedAt || item.requestDate)}</span></p>
                <p><span className="text-slate-400">Step Persetujuan:</span> <span className="font-semibold text-slate-900">Step {item.level || 1} {item.currentStepLabel ? `(${item.currentStepLabel.replace(/Level (\d+)/g, 'Step $1')})` : ''}</span></p>
              </div>
            </div>

            {/* Card 2: Tanda Tangan Approver */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                    <PenTool className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800">Tanda Tangan Approver</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {hasSignature ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="size-3 text-emerald-600" /> TTD Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Clock className="size-3 text-amber-600" /> Belum Ada TTD
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {profileSig && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={useProfileSignature}
                      className="h-8 text-xs font-bold border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/80 text-indigo-700 rounded-xl cursor-pointer gap-1"
                    >
                      <PenTool className="size-3" /> UBAH TTD
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearSignature}
                    className="h-8 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                  >
                    <RefreshCw className="size-3" />
                  </Button>
                </div>
              </div>

              {isUsingProfileSig && profileSig ? (
                <div className="relative rounded-lg border border-slate-200 bg-slate-50/70 p-2 flex items-center justify-center h-20 overflow-hidden">
                  <img
                    src={profileSig}
                    alt="Tanda Tangan Approver"
                    className="max-h-16 max-w-full object-contain filter contrast-125"
                  />
                </div>
              ) : (
                <div className="relative rounded-lg border border-slate-200 bg-white p-1 h-20 overflow-hidden">
                  <SignatureCanvas
                    ref={sigCanvas}
                    canvasProps={{ className: "w-full h-full cursor-crosshair" }}
                    onBegin={handleStroke}
                    onEnd={handleEnd}
                  />
                </div>
              )}
            </div>

            {/* Card 3: Catatan Approval */}
            <div className="rounded-xl border border-slate-200 p-3.5 bg-white space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="font-bold text-slate-800 text-xs">Catatan Approval</p>
              </div>
              <Textarea
                placeholder="Mohon cantumkan rincian revisi atau catatan approval di sini..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="text-xs min-h-[80px] resize-none rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white"
              />
            </div>

            {/* Section: Action Buttons */}
            <div className="space-y-3 pt-3 border-t border-slate-100 mt-auto shrink-0">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  AKSI DOKUMEN INI (1 / 1)
                </p>
                <Button
                  type="button"
                  onClick={() => handleDecision('approved')}
                  disabled={isSubmitting}
                  className="w-full h-11 bg-[#003461] hover:bg-[#00284d] text-white font-bold text-xs rounded-xl shadow-xs gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="size-4" /> APPROVE
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDecision('reverted')}
                    disabled={isSubmitting}
                    className="h-9 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="size-3.5 text-slate-500" /> REVERT
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDecision('rejected')}
                    disabled={isSubmitting}
                    className="h-9 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl gap-1.5 cursor-pointer"
                  >
                    <XCircle className="size-3.5 text-slate-500" /> REJECT
                  </Button>
                </div>
              </div>

              {/* TUTUP REVIEWER BUTTON */}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="w-full h-10 bg-[#e5f0ec] text-[#003461] hover:bg-[#d6e7e1] font-bold text-xs rounded-xl cursor-pointer"
              >
                TUTUP REVIEWER
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
