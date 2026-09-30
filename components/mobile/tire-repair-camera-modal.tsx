'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  RefreshCw,
  X,
  AlertTriangle,
  Sparkles,
  Smartphone,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TireRepairCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
  areaTitle?: string;
  onFallbackNative?: () => void;
}

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
  const [isDeviceLandscape, setIsDeviceLandscape] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Detect Device Orientation
  useEffect(() => {
    function checkOrientation() {
      if (typeof window !== 'undefined') {
        const isLandscape = window.innerWidth > window.innerHeight;
        setIsDeviceLandscape(isLandscape);
      }
    }

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

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
            width: { ideal: 1920, min: 640 },
            height: { ideal: 1080, min: 480 },
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
      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;

      // Determine final rotation to enforce landscape (width >= height)
      let effectiveAngle = rotationAngle;
      const isSensorPortrait = vw < vh;

      // If phone is held portrait & sensor is portrait, auto-rotate 90 deg so output is landscape
      if (!isDeviceLandscape && isSensorPortrait && effectiveAngle === 0) {
        effectiveAngle = 90;
      }

      const canvas = document.createElement('canvas');

      if (effectiveAngle === 90 || effectiveAngle === 270) {
        canvas.width = vh;
        canvas.height = vw;
      } else {
        canvas.width = vw;
        canvas.height = vh;
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((effectiveAngle * Math.PI) / 180);
        ctx.drawImage(video, -vw / 2, -vh / 2, vw, vh);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(dataUrl);
        onClose();
      }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 text-white bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold leading-none text-slate-100">Kamera Inspeksi (Landscape)</h3>
              <p className="text-[10px] text-emerald-400 mt-0.5 font-medium">{areaTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center transition-colors active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder Video Area */}
        <div className="relative bg-black w-full aspect-16/9 min-h-[220px] flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-xs text-slate-300 max-w-xs">{error}</p>
              {onFallbackNative && (
                <Button
                  type="button"
                  onClick={() => {
                    onClose();
                    onFallbackNative();
                  }}
                  size="sm"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  Gunakan Kamera Bawaan HP
                </Button>
              )}
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  transform: `rotate(${rotationAngle}deg)`,
                  transition: 'transform 0.2s ease',
                }}
                className="h-full w-full object-cover"
              />

              {/* Landscape Guide Frame Overlay */}
              <div className="pointer-events-none absolute inset-3 sm:inset-4 rounded-xl border-2 border-dashed border-emerald-400/60 flex flex-col justify-between p-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold bg-emerald-600/90 text-white px-2 py-0.5 rounded-md shadow-sm">
                    MODE LANDSCAPE
                  </span>
                  {rotationAngle !== 0 && (
                    <span className="text-[9px] font-bold bg-amber-600/90 text-white px-2 py-0.5 rounded-md shadow-sm">
                      Rotasi: {rotationAngle}°
                    </span>
                  )}
                </div>

                <div className="self-center bg-black/60 backdrop-blur-xs px-3 py-1 rounded-full text-[10px] text-white/95 flex items-center gap-1.5 shadow-md">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>
                    {isDeviceLandscape
                      ? 'Posisi HP sudah Landscape ✓'
                      : 'Posisikan foto secara mendatar (Landscape)'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bottom Controls Bar */}
        <div className="flex items-center justify-between bg-slate-950 px-4 py-3.5 border-t border-slate-800">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleFacingMode}
              disabled={Boolean(error)}
              className="text-slate-300 hover:bg-slate-800 hover:text-white text-xs h-9 px-2.5 rounded-xl flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kamera</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cycleRotation}
              disabled={Boolean(error)}
              className="text-slate-300 hover:bg-slate-800 hover:text-white text-xs h-9 px-2.5 rounded-xl flex items-center gap-1"
              title="Putar Orientasi Kamera"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="text-[10px]">Putar 90°</span>
            </Button>
          </div>

          {/* Shutter Button */}
          <button
            type="button"
            onClick={capturePhoto}
            disabled={Boolean(error) || isCapturing}
            className="w-14 h-14 rounded-full border-4 border-white/90 bg-emerald-500 hover:bg-emerald-400 active:scale-90 flex items-center justify-center shadow-lg transition-transform disabled:opacity-50 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
              <Camera className="w-5 h-5 text-emerald-600" />
            </div>
          </button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs h-9 rounded-xl"
          >
            Batal
          </Button>
        </div>
      </div>
    </div>
  );
}
