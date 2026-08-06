"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, CheckCircle2, AlertCircle, Loader2, RefreshCw, X, ShieldCheck, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface FaceLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userData: { name: string; email?: string; employeeSn?: string }) => void;
  identifier?: string;
}

export function FaceLoginModal({ isOpen, onClose, onSuccess, identifier }: FaceLoginModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [status, setStatus] = useState<"idle" | "camera-loading" | "ready" | "scanning" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [autoScanCountdown, setAutoScanCountdown] = useState<number | null>(null);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start camera stream
  const startCamera = useCallback(async (facing: "user" | "environment") => {
    setStatus("camera-loading");
    setErrorMessage("");

    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setStatus("ready");
        };
      }
    } catch (err: any) {
      console.error("[FaceLoginModal] Camera permission error:", err);
      setStatus("error");
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Akses kamera ditolak. Berikan izin kamera di browser untuk menggunakan login biometrik.");
      } else {
        setErrorMessage("Gagal membuka kamera perangkat. Pastikan kamera tidak digunakan aplikasi lain.");
      }
    }
  }, [stream]);

  // Effect to manage camera lifecycle when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
      setStatus("idle");
      setErrorMessage("");
      setSuccessMessage("");
      setAutoScanCountdown(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Handle capture and verification POST
  const handleCaptureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current || status === "scanning") return;

    setStatus("scanning");
    setErrorMessage("");

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 640;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Gagal membuat konteks kanvas.");
      }

      // Draw frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);

      // Send to server face-login API
      const res = await fetch("/api/auth/face-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl, identifier }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setStatus("error");
        setErrorMessage(data.error || "Wajah tidak cocok atau belum terdaftar.");
        return;
      }

      // Success
      setStatus("success");
      setSuccessMessage(data.message || `Wajah Dikenali: ${data.user?.name}`);
      
      // Freeze stream and trigger callback after brief delay
      setTimeout(() => {
        stopCamera();
        onSuccess({ ...data.user, token: data.token });
      }, 1200);
    } catch (err: any) {
      console.error("[FaceLoginModal] Capture error:", err);
      setStatus("error");
      setErrorMessage(err?.message || "Terjadi kesalahan saat memproses gambar wajah.");
    }
  };

  const toggleCamera = () => {
    const nextFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-[#091b2b] border border-[#7fb6df]/20 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#003461] text-[#9ac8ec] border border-[#7fb6df]/30">
              <ScanFace className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Login Biometrik Wajah</h3>
              <p className="text-[10px] text-slate-400">Verifikasi identitas dengan kamera</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Camera View Area */}
        <div className="relative my-5 flex flex-col items-center justify-center">
          <div className="relative h-64 w-64 overflow-hidden rounded-full border-4 border-[#7fb6df]/40 bg-black shadow-[0_0_30px_rgba(0,150,255,0.2)]">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scanning Overlay Animation */}
            {status === "scanning" && (
              <div className="absolute inset-0 bg-sky-500/10 backdrop-blur-[1px]">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_15px_#38bdf8] animate-[scanLine_1.8s_ease-in-out_infinite]" />
              </div>
            )}

            {/* Oval Face Guide */}
            {status === "ready" && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-52 w-40 rounded-[50%] border-2 border-dashed border-[#9ac8ec]/70 shadow-[0_0_0_9999px_rgba(9,27,43,0.45)]" />
              </div>
            )}

            {/* Loading Indicator */}
            {status === "camera-loading" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#091b2b]/90 text-slate-300 gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-[#9ac8ec]" />
                <span className="text-xs font-medium">Membuka kamera...</span>
              </div>
            )}

            {/* Success Overlay */}
            {status === "success" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/85 text-emerald-300 gap-2 animate-in zoom-in-95">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 animate-bounce" />
                <span className="text-xs font-bold text-center px-4">Wajah Dikenali!</span>
              </div>
            )}
          </div>

          {/* Status badge text */}
          <div className="mt-3 text-center">
            {status === "ready" && (
              <p className="text-xs text-slate-300 font-medium">Posisikan wajah Anda di dalam lingkaran oval</p>
            )}
            {status === "scanning" && (
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-[#9ac8ec]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Memproses pencocokan biometrik...</span>
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <Alert className="mb-4 border-0 bg-[#5a2200]/30 text-[#ffd7c1] ring-1 ring-[#ffb288]/25 p-3">
            <AlertCircle className="h-4 w-4 text-orange-400 shrink-0" />
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mb-4 border-0 bg-emerald-950/40 text-emerald-200 ring-1 ring-emerald-500/30 p-3">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <AlertDescription className="text-xs font-medium">{successMessage}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {status === "error" ? (
            <Button
              type="button"
              onClick={() => startCamera(facingMode)}
              className="w-full h-12 rounded-xl bg-[#10283a] text-sm text-slate-200 hover:bg-[#15344c] border border-slate-700"
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Coba Lagi
            </Button>
          ) : (
            <Button
              type="button"
              disabled={status !== "ready"}
              onClick={handleCaptureAndVerify}
              className="w-full h-12 rounded-xl bg-[linear-gradient(135deg,#003461_0%,#004b87_100%)] text-sm font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]"
            >
              {status === "scanning" ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Memverifikasi...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Camera className="h-4 w-4" /> Pindai & Login
                </span>
              )}
            </Button>
          )}

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={toggleCamera}
              disabled={status === "scanning"}
              className="text-[11px] text-slate-400 hover:text-[#9ac8ec] flex items-center gap-1 transition"
            >
              <RefreshCw className="h-3 w-3" /> Ganti Kamera
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] text-slate-400 hover:text-slate-200 transition"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
