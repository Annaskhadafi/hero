"use client";

import React, { useState, useEffect } from "react";
import { Maximize2, X, Download, ZoomIn, ZoomOut, RotateCcw, Image as ImageIcon } from "lucide-react";
import type { RagAttachedImageItem } from "@/lib/hero-genius/client";

interface AttachedImagesGalleryProps {
  images?: RagAttachedImageItem[];
  className?: string;
}

export function AttachedImagesGallery({
  images,
  className = "",
}: AttachedImagesGalleryProps) {
  const [activeImg, setActiveImg] = useState<RagAttachedImageItem | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeImg) {
        setActiveImg(null);
        setZoom(1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImg]);

  if (!images || images.length === 0) return null;

  return (
    <>
      <div className={`mt-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60 ${className}`}>
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
          <ImageIcon className="size-3.5 text-sky-600" />
          <span>Lampiran Gambar Dokumen ({images.length}):</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((img, idx) => (
            <div
              key={idx}
              onClick={() => {
                setActiveImg(img);
                setZoom(1);
              }}
              className="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs transition-all hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
              title={`${img.alt} - Klik untuk memperbesar`}
            >
              <div className="relative flex h-24 w-full items-center justify-center overflow-hidden bg-slate-950">
                <img
                  src={img.url}
                  alt={img.alt}
                  loading="lazy"
                  className="size-full object-contain transition-transform duration-200 group-hover:scale-105"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="flex items-center gap-1 rounded-md bg-slate-900/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
                    <Maximize2 className="size-2.5" /> Perbesar
                  </span>
                </div>
              </div>
              <div className="flex flex-col p-1.5">
                <span className="truncate text-[11px] font-semibold text-slate-800 dark:text-slate-200" title={img.alt}>
                  {img.alt}
                </span>
                {img.source_doc && (
                  <span className="truncate text-[9.5px] text-slate-400" title={img.source_doc}>
                    📄 {img.source_doc}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {activeImg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onClick={() => {
            setActiveImg(null);
            setZoom(1);
          }}
        >
          <div
            className="relative flex max-h-[92vh] max-w-[92vw] w-[950px] flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-2.5">
              <div className="flex flex-col min-w-0 pr-4">
                <span className="truncate text-xs font-bold text-slate-200">
                  🖼️ {activeImg.alt}
                </span>
                {activeImg.source_doc && (
                  <span className="truncate text-[10px] text-slate-400">
                    📄 Sumber: {activeImg.source_doc}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                  className="rounded bg-slate-800 p-1.5 text-xs font-bold hover:bg-slate-700"
                  title="Perkecil (-)"
                >
                  <ZoomOut className="size-3.5" />
                </button>
                <span className="w-11 text-center font-mono text-xs text-slate-300">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
                  className="rounded bg-slate-800 p-1.5 text-xs font-bold hover:bg-slate-700"
                  title="Perbesar (+)"
                >
                  <ZoomIn className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="rounded bg-slate-800 p-1.5 text-xs hover:bg-slate-700"
                  title="Reset Zoom"
                >
                  <RotateCcw className="size-3.5" />
                </button>
                <a
                  href={activeImg.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="inline-flex items-center gap-1 rounded bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-500"
                  title="Buka / Unduh Gambar"
                >
                  <Download className="size-3" />
                  <span className="hidden sm:inline">Unduh</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setActiveImg(null);
                    setZoom(1);
                  }}
                  className="rounded bg-rose-600 p-1.5 text-xs font-bold text-white hover:bg-rose-500"
                  title="Tutup (Esc)"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            <div
              className="flex flex-1 items-center justify-center overflow-auto p-4 bg-slate-950 min-h-[350px]"
              onClick={() => {
                setActiveImg(null);
                setZoom(1);
              }}
            >
              <img
                src={activeImg.url}
                alt={activeImg.alt}
                style={{ transform: `scale(${zoom})` }}
                className="max-h-[75vh] max-w-full object-contain transition-transform duration-150 rounded"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
