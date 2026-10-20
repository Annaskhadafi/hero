'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  RefreshCw,
  X,
  AlertTriangle,
  RotateCw,
  Maximize2,
  Crop,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export type AspectRatioOption = 'Full' | '1:1' | '4:5' | '3:4' | '9:16' | '4:3' | '16:9';

interface TireRepairCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  areaTitle?: string;
  onFallbackNative?: () => void;
}

const ASPECT_RATIO_OPTIONS: { id: AspectRatioOption; label: string }[] = [
  { id: 'Full', label: 'Bebas / Full' },
  { id: '1:1', label: '1:1 (Persegi)' },
  { id: '4:5', label: '4:5 (Potret)' },
  { id: '3:4', label: '3:4 (Potret)' },
  { id: '9:16', label: '9:16 (Layar HP)' },
  { id: '4:3', label: '4:3 (Lanskap)' },
  { id: '16:9', label: '16:9 (Lanskap)' },
];

const ASPECT_RATIO_NUMERIC: Record<Exclude<AspectRatioOption, 'Full'>, number> = {
  '1:1': 1.0,
  '4:5': 4 / 5,
  '3:4': 3 / 4,
  '9:16': 9 / 16,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
};

export function TireRepairCameraModal({
  isOpen,
  onClose,
  onCapture,
  areaTitle = 'Foto Ban',
  onFallbackNative,
}: TireRepairCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [rotationAngle, setRotationAngle] = useState<0 | 90 | 180 | 270>(0);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioOption>('16:9');
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      return;
    }

    let activeStream: MediaStream | null = null;

    async function startCamera() {
      setError(null);
      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error('Perangkat / browser tidak mendukung akses langsung kamera.');
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
          },
          audio: false,
        });

        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err: any) {
        console.warn('Camera stream error:', err);
        setError(
          err?.message || 'Gagal mengakses kamera. Izinkan akses kamera browser atau gunakan kamera sistem.'
        );
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  function capturePhoto() {
    if (!videoRef.current || isCapturing) return;
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const vw = video.videoWidth || 1920;
      const vh = video.videoHeight || 1080;

      // 1. Compute dimensions after rotation
      let rotW = vw;
      let rotH = vh;
      if (rotationAngle === 90 || rotationAngle === 270) {
        rotW = vh;
        rotH = vw;
      }

      // Render full rotated frame onto offscreen canvas
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = rotW;
      rotCanvas.height = rotH;
      const rotCtx = rotCanvas.getContext('2d');
      if (!rotCtx) return;

      rotCtx.translate(rotW / 2, rotH / 2);
      rotCtx.rotate((rotationAngle * Math.PI) / 180);
      rotCtx.drawImage(video, -vw / 2, -vh / 2, vw, vh);

      // 2. Compute crop box according to selected ratio
      let cropX = 0;
      let cropY = 0;
      let cropW = rotW;
      let cropH = rotH;

      if (selectedRatio !== 'Full') {
        const targetRatio = ASPECT_RATIO_NUMERIC[selectedRatio];
        const currentRatio = rotW / rotH;

        if (currentRatio > targetRatio) {
          // Feed is wider than target ratio
          cropH = rotH;
          cropW = Math.round(rotH * targetRatio);
        } else {
          // Feed is taller than target ratio
          cropW = rotW;
          cropH = Math.round(rotW / targetRatio);
        }

        cropX = Math.round((rotW - cropW) / 2);
        cropY = Math.round((rotH - cropH) / 2);
      }

      // 3. Draw cropped section to final canvas
      const outCanvas = document.createElement('canvas');
      outCanvas.width = cropW;
      outCanvas.height = cropH;
      const outCtx = outCanvas.getContext('2d');
      if (!outCtx) return;

      outCtx.drawImage(rotCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const dataUrl = outCanvas.toDataURL('image/jpeg', 0.95);
      onCapture(dataUrl);
      onClose();
    } catch (e) {
      console.error('Capture error:', e);
    } finally {
      setIsCapturing(false);
    }
  }

  function toggleFacingMode() {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }

  function cycleRotation() {
    setRotationAngle((prev) => {
      if (prev === 0) return 90;
      if (prev === 90) return 180;
      if (prev === 180) return 270;
      return 0;
    });
  }

  // Get CSS Aspect Ratio class for crop overlay
  function getCropOverlayStyle() {
    switch (selectedRatio) {
      case '1:1':
        return 'w-[85vw] max-w-[420px] aspect-square';
      case '4:5':
        return 'w-[80vw] max-w-[380px] aspect-[4/5]';
      case '3:4':
        return 'w-[80vw] max-w-[380px] aspect-[3/4]';
      case '9:16':
        return 'h-[68vh] max-h-[520px] aspect-[9/16]';
      case '4:3':
        return 'w-[90vw] max-w-[480px] aspect-[4/3]';
      case '16:9':
        return 'w-[94vw] max-w-[540px] aspect-[16/9]';
      case 'Full':
      default:
        return 'w-[95%] h-[95%]';
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white flex flex-col h-[100dvh] w-screen overflow-hidden select-none">
      {/* Top Header Toolbar */}
      <div className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shrink-0 flex items-center justify-between z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 leading-tight">Kamera Inspeksi HD</h3>
            <p className="text-xs text-emerald-400 font-semibold">{areaTitle}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Aspect Ratio Selector Bar */}
      <div className="bg-slate-950/80 border-b border-slate-800/80 px-3 py-2 shrink-0 overflow-x-auto no-scrollbar z-20 flex items-center gap-1.5">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 flex items-center gap-1 shrink-0">
          <Crop className="w-3.5 h-3.5 text-emerald-400" />
          <span>Rasio:</span>
        </div>

        {ASPECT_RATIO_OPTIONS.map((option) => {
          const isActive = selectedRatio === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedRatio(option.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 scale-105'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {isActive && <Check className="w-3 h-3 stroke-[3]" />}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      {/* Center Camera Viewfinder (Fullscreen) */}
      <div className="relative flex-1 w-full h-full bg-black flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="p-6 text-center space-y-4 max-w-sm">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto" />
            <p className="text-sm text-slate-300 leading-relaxed">{error}</p>
            {onFallbackNative && (
              <Button
                type="button"
                onClick={() => {
                  onClose();
                  onFallbackNative();
                }}
                size="lg"
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-lg"
              >
                Gunakan Kamera Bawaan HP
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Live Video Stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                transform: `rotate(${rotationAngle}deg)`,
                transition: 'transform 0.2s ease',
              }}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Dynamic Aspect Ratio Crop Frame with Dimmed Outer Mask */}
            <div
              className={`relative z-10 transition-all duration-200 border-2 border-emerald-400 rounded-lg flex flex-col justify-between p-2 pointer-events-none ${getCropOverlayStyle()}`}
              style={{
                boxShadow: selectedRatio === 'Full' ? 'none' : '0 0 0 9999px rgba(0, 0, 0, 0.65)',
              }}
            >
              {/* Corner Bracket Accents */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-sm" />

              {/* Top Indicator Badge */}
              <div className="flex justify-between items-center w-full">
                <span className="text-[10px] font-extrabold bg-emerald-500 text-slate-950 px-2 py-0.5 rounded shadow-md uppercase tracking-wide">
                  UKURAN: {selectedRatio}
                </span>

                {rotationAngle !== 0 && (
                  <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded shadow-md">
                    ROTASI: {rotationAngle}°
                  </span>
                )}
              </div>

              {/* Center Guidance Text */}
              <div className="self-center bg-slate-950/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-emerald-300 font-semibold border border-emerald-500/40 shadow-lg flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Foto akan dipotong otomatis sesuai rasio ({selectedRatio})</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Shutter & Controls Panel */}
      <div className="bg-slate-950/95 border-t border-slate-800/80 px-6 py-4 shrink-0 flex items-center justify-between z-20">
        {/* Rotation & Flip Controls */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleFacingMode}
            disabled={Boolean(error)}
            className="text-slate-200 hover:bg-slate-800 hover:text-white text-xs h-10 px-3 rounded-xl flex items-center gap-1.5 bg-slate-900 border border-slate-800"
            title="Ganti Kamera Depan/Belakang"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline font-semibold">Ganti Kamera</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cycleRotation}
            disabled={Boolean(error)}
            className="text-slate-200 hover:bg-slate-800 hover:text-white text-xs h-10 px-3 rounded-xl flex items-center gap-1.5 bg-slate-900 border border-slate-800"
            title="Putar Orientasi Hasil Foto"
          >
            <RotateCw className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline font-semibold">Putar 90°</span>
          </Button>
        </div>

        {/* Big Shutter Button */}
        <button
          type="button"
          onClick={capturePhoto}
          disabled={Boolean(error) || isCapturing}
          className="w-16 h-16 rounded-full border-4 border-white bg-emerald-500 hover:bg-emerald-400 active:scale-90 flex items-center justify-center shadow-xl shadow-emerald-500/30 transition-all disabled:opacity-50 cursor-pointer"
          title="Ambil Foto HD"
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
            <Camera className="w-6 h-6 text-emerald-600" />
          </div>
        </button>

        {/* Batal Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-slate-300 hover:bg-slate-800 hover:text-white text-xs h-10 px-4 rounded-xl font-semibold bg-slate-900 border border-slate-800"
        >
          Batal
        </Button>
      </div>
    </div>
  );
}
