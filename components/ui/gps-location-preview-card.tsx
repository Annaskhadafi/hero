"use client";

import { useState } from "react";
import { Navigation, MapPin, ExternalLink, RefreshCw, AlertCircle, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type GpsLocationPreviewCardProps = {
  needsGps: boolean;
  latitude?: string;
  longitude?: string;
  accuracy?: string;
  message?: string;
  locationName?: string;
  manualLocation?: string;
  onManualLocationChange?: (val: string) => void;
  onRefreshGps?: () => void;
  boundaryStatus?: string;
  boundaryMessage?: string;
  gpsValid?: boolean;
  siteName?: string | null;
  className?: string;
};

export function GpsLocationPreviewCard({
  needsGps,
  latitude,
  longitude,
  accuracy,
  message,
  locationName,
  manualLocation,
  onManualLocationChange,
  onRefreshGps,
  boundaryStatus,
  boundaryMessage,
  gpsValid,
  siteName,
  className = "",
}: GpsLocationPreviewCardProps) {
  const [showIframeError, setShowIframeError] = useState(false);

  // CRITICAL RULE: If no selected activity requires GPS, DO NOT RENDER THE CARD!
  if (!needsGps) {
    return null;
  }

  const hasCoords = Boolean(latitude && longitude && Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)));
  const latNum = hasCoords ? Number(latitude) : 0;
  const lngNum = hasCoords ? Number(longitude) : 0;

  // OpenStreetMap embed URL
  const bboxPadding = 0.004;
  const osmEmbedUrl = hasCoords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${lngNum - bboxPadding}%2C${latNum - bboxPadding}%2C${lngNum + bboxPadding}%2C${latNum + bboxPadding}&layer=mapnik&marker=${latNum}%2C${lngNum}`
    : "";

  const googleMapsUrl = hasCoords ? `https://www.google.com/maps?q=${latNum},${lngNum}` : "#";

  return (
    <section className={`space-y-4 rounded-[1.25rem] bg-white p-4 shadow-[0_16px_34px_rgba(8,32,51,0.08)] border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase">
            <Navigation className="size-3.5 text-[#003f78] animate-pulse" />
            GPS Auto-Capture & Map Preview
          </p>
          <p className="mt-1 text-xs leading-5 font-semibold text-[#486275]">
            {boundaryMessage || (hasCoords ? "Lokasi terdeteksi untuk validasi aktivitas GPS." : "GPS dicoba otomatis. Izinkan akses lokasi di HP Anda.")}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={
              gpsValid
                ? "rounded-full bg-[#dff4e8] px-3 py-1 text-[10px] font-black text-[#14532d] uppercase flex items-center gap-1"
                : "rounded-full bg-[#fff1cf] px-3 py-1 text-[10px] font-black text-[#8a5a00] uppercase flex items-center gap-1"
            }
          >
            {gpsValid ? <ShieldCheck className="size-3" /> : <AlertCircle className="size-3" />}
            {boundaryStatus || (hasCoords ? "GPS Active" : "Waiting GPS")}
          </span>
        </div>
      </div>

      {/* Visual Map Preview */}
      {hasCoords ? (
        <div className="relative overflow-hidden rounded-[1.1rem] border border-gray-200 bg-[#eaf4fb] h-48 shadow-inner group">
          {!showIframeError ? (
            <iframe
              title="GPS Location Map Preview"
              src={osmEmbedUrl}
              className="h-full w-full border-0 pointer-events-auto"
              onError={() => setShowIframeError(true)}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center bg-[#f0f7fc]">
              <MapPin className="size-8 text-[#003f78] mb-1 animate-bounce" />
              <p className="text-xs font-bold text-[#082033]">{locationName || siteName || "Koordinat Lokasi"}</p>
              <p className="text-[11px] font-mono text-[#486275] mt-0.5">{latitude}, {longitude}</p>
            </div>
          )}

          {/* Floating Badge Top-Right */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-md px-3 py-1 text-[10px] font-black tracking-wider text-[#082033] shadow-md border border-white/50">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono">{latitude?.slice(0, 8)}, {longitude?.slice(0, 8)}</span>
          </div>

          {/* Floating Action Button Bottom-Right */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5 rounded-xl bg-[#003f78] px-3 py-1.5 text-[11px] font-bold text-white shadow-lg hover:bg-[#002f5a] active:scale-95 transition"
          >
            <ExternalLink className="size-3.5" />
            <span>Buka Google Maps</span>
          </a>
        </div>
      ) : (
        /* Waiting / Skeleton Radar Map Container */
        <div className="flex h-36 w-full flex-col items-center justify-center rounded-[1.1rem] border border-dashed border-sky-200 bg-[#f6fbff] p-4 text-center">
          <div className="relative flex items-center justify-center mb-2">
            <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-sky-300 opacity-40"></span>
            <div className="size-10 rounded-full bg-[#003f78] flex items-center justify-center text-white shadow-md">
              <Navigation className="size-5 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>
          <p className="text-xs font-bold text-[#082033]">Mencari Sinyal GPS...</p>
          <p className="text-[11px] text-[#486275] mt-0.5">Pastikan fitur GPS / Lokasi aktif di browser & HP Anda.</p>
          {onRefreshGps ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefreshGps}
              className="mt-2.5 h-8 rounded-full border-sky-200 bg-white text-[11px] font-bold text-[#003f78] shadow-xs hover:bg-sky-50"
            >
              <RefreshCw className="mr-1.5 size-3" /> Refresh GPS
            </Button>
          ) : null}
        </div>
      )}

      {/* Grid Coordinates & Details */}
      <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-[#486275]">
        <div className="rounded-[1rem] bg-[#f6fbff] px-4 py-3">
          <p className="text-[10px] font-black tracking-[0.14em] text-[#486275] uppercase">
            Coordinates
          </p>
          <p className="mt-1 text-xs font-bold text-[#082033] font-mono truncate">
            {hasCoords ? `${latitude}, ${longitude}` : "Waiting GPS"}
          </p>
        </div>
        <div className="rounded-[1rem] bg-[#f6fbff] px-4 py-3">
          <p className="text-[10px] font-black tracking-[0.14em] text-[#486275] uppercase">
            Accuracy & Status
          </p>
          <p className="mt-1 text-xs font-bold text-[#082033] truncate">
            {accuracy ? `± ${accuracy}` : message || "Sedang memuat..."}
          </p>
        </div>
      </div>

      {/* Manual Location Fallback (if provided) */}
      {onManualLocationChange ? (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-black tracking-[0.16em] text-[#486275] uppercase block">
            Lokasi Manual (Opsional jika GPS gagal)
          </span>
          <Input
            value={manualLocation || ""}
            onChange={(e) => onManualLocationChange(e.target.value)}
            placeholder="Ketik nama area/lokasi jika GPS tidak terbaca..."
            className="h-11 rounded-2xl border-0 bg-[#f6fbff] px-4 text-xs font-semibold text-[#082033]"
          />
        </div>
      ) : null}
    </section>
  );
}
