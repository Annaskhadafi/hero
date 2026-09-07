'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Loader2, PenTool, RefreshCw, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUserSignatureAction } from '@/app/actions/user-signature';
import { toast } from 'sonner';

type Props = {
  summaryId: number;
  summaryNumber: string;
  onSubmit: (signatureUrl: string) => Promise<void>;
  onClose: () => void;
};

export function SummaryApprovalDialog({ summaryId, summaryNumber, onSubmit, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profileSig, setProfileSig] = useState<string | null>(null);
  const [isUsingProfileSig, setIsUsingProfileSig] = useState(false);
  const [loadingProfileSig, setLoadingProfileSig] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getUserSignatureAction()
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.signatureDataUrl) {
          setProfileSig(res.signatureDataUrl);
          setIsUsingProfileSig(true);
        }
      })
      .catch((err) => {
        console.warn('Failed to load profile signature:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingProfileSig(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    if ('clientX' in e) {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isUsingProfileSig) setIsUsingProfileSig(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setIsUsingProfileSig(false);
  };

  const useProfileSignature = () => {
    if (!profileSig) return;
    setIsUsingProfileSig(true);
    clearCanvas();
  };

  const handleSubmit = async () => {
    let signatureUrl = '';

    if (isUsingProfileSig && profileSig) {
      signatureUrl = profileSig;
    } else if (hasDrawn && canvasRef.current) {
      signatureUrl = canvasRef.current.toDataURL('image/png');
    }

    if (!signatureUrl) {
      toast.error('Silakan sediakan tanda tangan terlebih dahulu.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(signatureUrl);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800 border border-emerald-200/80">
                Diajukan Oleh
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">{summaryNumber}</span>
            </div>
            <h3 className="mt-1 text-base font-black text-slate-900">Tanda Tangan &amp; Submit</h3>
            <p className="text-xs text-slate-500">Tanda tangan resmi pembuat Summary APD.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Profile Signature Banner / Option */}
          {profileSig ? (
            <div className="space-y-2">
              <div
                onClick={useProfileSignature}
                className={`relative flex items-center justify-between rounded-xl border p-3.5 transition-all cursor-pointer ${
                  isUsingProfileSig
                    ? 'border-[#003461] bg-blue-50/40 ring-1 ring-[#003461]'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200 shadow-2xs">
                    <img
                      src={profileSig}
                      alt="Tanda Tangan Profil"
                      className="max-h-8 max-w-8 object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-900">Tanda Tangan Profil HERO</p>
                      <Sparkles className="size-3 text-amber-500" />
                    </div>
                    <p className="text-[11px] text-slate-500">Gunakan tanda tangan yang sudah tersimpan</p>
                  </div>
                </div>

                <div
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition ${
                    isUsingProfileSig
                      ? 'border-[#003461] bg-[#003461] text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {isUsingProfileSig && <Check className="size-3 stroke-[3]" />}
                </div>
              </div>
            </div>
          ) : loadingProfileSig ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-1">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Memeriksa tanda tangan profil...</span>
            </div>
          ) : null}

          {/* Canvas Drawing Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <PenTool className="size-3.5 text-slate-400" />
                <span>{profileSig ? 'Atau Gambar Tanda Tangan Manual:' : 'Tanda Tangan di Layar:'}</span>
              </label>
              {(hasDrawn || isUsingProfileSig) && (
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition"
                >
                  <RefreshCw className="size-3" />
                  Hapus / Reset
                </button>
              )}
            </div>

            <div
              className={`relative rounded-xl border-2 border-dashed bg-slate-50/50 p-2 transition-all ${
                !isUsingProfileSig && hasDrawn
                  ? 'border-emerald-500 bg-emerald-50/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <canvas
                ref={canvasRef}
                width={380}
                height={140}
                className="w-full touch-none cursor-crosshair rounded-lg bg-white shadow-inner"
                style={{ height: 130 }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasDrawn && !isUsingProfileSig && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-400">
                  Goreskan tanda tangan di sini (Sentuh / Mouse)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl text-xs font-bold"
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || (!isUsingProfileSig && !hasDrawn)}
            className="rounded-xl bg-[#003461] hover:bg-[#00274a] text-white text-xs font-bold shadow-xs gap-1.5 px-4"
          >
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3.5" />
                <span>Submit Summary</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
