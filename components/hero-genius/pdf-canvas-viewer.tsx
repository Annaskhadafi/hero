"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
  RefreshCw,
  AlertCircle,
  FileText,
  ExternalLink,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

interface PdfCanvasViewerProps {
  url: string;
  filename?: string;
  className?: string;
  onLoaded?: (totalPages: number) => void;
}

export function PdfCanvasViewer({
  url,
  filename = "Dokumen",
  className = "",
  onLoaded,
}: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [fitToWidth, setFitToWidth] = useState<boolean>(true);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<string>("Memuat engine viewer...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<{ [pageNum: number]: boolean }>({});

  // Refs to canvas elements
  const canvasRefs = useRef<{ [pageNum: number]: HTMLCanvasElement | null }>({});

  // 1. Ensure PDF.js is loaded dynamically
  useEffect(() => {
    let isMounted = true;

    async function loadPdfJs() {
      try {
        setIsLoading(true);
        setErrorMsg(null);
        setLoadingProgress("Menyiapkan PDF reader...");

        if (!window.pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
            // Check if script already injected
            const existingScript = document.querySelector('script[data-pdfjs="true"]');
            if (existingScript) {
              existingScript.addEventListener("load", () => resolve());
              existingScript.addEventListener("error", () =>
                reject(new Error("Gagal mengunduh script PDF.js"))
              );
              return;
            }

            const script = document.createElement("script");
            script.src =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
            script.async = true;
            script.setAttribute("data-pdfjs", "true");
            script.onload = () => {
              if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
                resolve();
              } else {
                reject(new Error("PDF.js library failed to initialize"));
              }
            };
            script.onerror = () =>
              reject(new Error("Tidak dapat terhubung ke CDN PDF.js"));
            document.head.appendChild(script);
          });
        } else if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }

        if (!isMounted) return;

        setLoadingProgress("Mengunduh isi dokumen...");

        const loadingTask = window.pdfjsLib.getDocument({
          url,
          withCredentials: true,
          cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
          cMapPacked: true,
        });

        loadingTask.onProgress = (progressData: { loaded: number; total: number }) => {
          if (progressData.total > 0) {
            const percent = Math.round((progressData.loaded / progressData.total) * 100);
            if (isMounted) setLoadingProgress(`Mengunduh dokumen (${percent}%)...`);
          }
        };

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setIsLoading(false);
        if (onLoaded) onLoaded(doc.numPages);
      } catch (err: any) {
        console.error("[PdfCanvasViewer] Load error:", err);
        if (isMounted) {
          setIsLoading(false);
          setErrorMsg(err.message || "Gagal memproses file PDF.");
        }
      }
    }

    loadPdfJs();

    return () => {
      isMounted = false;
    };
  }, [url, onLoaded]);

  // 2. Render Page to Canvas
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc) return;
      const canvas = canvasRefs.current[pageNum];
      if (!canvas) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const containerWidth =
          containerRef.current?.clientWidth || window.innerWidth - 32;

        // Calculate scale to fit container width comfortably with padding
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
        let targetScale = scale;

        if (fitToWidth) {
          const padding = window.innerWidth < 640 ? 16 : 40;
          const availableWidth = Math.max(containerWidth - padding, 280);
          targetScale = (availableWidth / unscaledViewport.width) * scale;
        }

        const viewport = page.getViewport({ scale: targetScale, rotation });

        // High-DPI screen support (Retina / Smartphone)
        const outputScale = Math.min(window.devicePixelRatio || 1, 2.5);

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        setRenderedPages((prev) => ({ ...prev, [pageNum]: true }));
      } catch (err) {
        console.warn(`[PdfCanvasViewer] Error rendering page ${pageNum}:`, err);
      }
    },
    [pdfDoc, scale, fitToWidth, rotation]
  );

  // Re-render all pages when scale, rotation, or doc changes
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    for (let p = 1; p <= numPages; p++) {
      renderPage(p);
    }
  }, [pdfDoc, numPages, renderPage, scale, fitToWidth, rotation]);

  // Handle intersection observer to update current page indicator on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageAttr = entry.target.getAttribute("data-page-number");
            if (pageAttr) {
              setCurrentPage(parseInt(pageAttr, 10));
            }
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.4,
      }
    );

    const elements = Object.values(canvasRefs.current).filter(Boolean);
    elements.forEach((el) => {
      if (el?.parentElement) observer.observe(el.parentElement);
    });

    return () => {
      observer.disconnect();
    };
  }, [numPages, pdfDoc]);

  // Scroll to specific page
  const scrollToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > numPages) return;
    const canvas = canvasRefs.current[targetPage];
    if (canvas) {
      canvas.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentPage(targetPage);
    }
  };

  const handleZoomIn = () => {
    setFitToWidth(false);
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setFitToWidth(false);
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleFitWidth = () => {
    setFitToWidth(true);
    setScale(1.0);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div className={`flex flex-col h-full w-full bg-slate-900 select-none ${className}`}>
      {/* Floating / Sticky Control Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-950/90 backdrop-blur border-b border-slate-800 text-white shrink-0 z-20 gap-2">
        {/* Page Nav */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => scrollToPage(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
            className="size-7 sm:size-8 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 rounded-lg"
            title="Halaman Sebelumnya"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <div className="flex items-center gap-1 text-[11px] sm:text-xs font-mono font-medium text-slate-300">
            <span className="text-white font-bold">{currentPage}</span>
            <span className="text-slate-500">/</span>
            <span>{numPages || "-"}</span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => scrollToPage(currentPage + 1)}
            disabled={currentPage >= numPages || isLoading}
            className="size-7 sm:size-8 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 rounded-lg"
            title="Halaman Berikutnya"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleZoomOut}
            disabled={isLoading || scale <= 0.5}
            className="size-7 sm:size-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
            title="Perkecil (-)"
          >
            <ZoomOut className="size-3.5 sm:size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFitWidth}
            disabled={isLoading}
            className={`h-7 sm:h-8 px-2 text-[11px] font-medium rounded-lg ${
              fitToWidth
                ? "bg-blue-600/30 text-sky-300 border border-blue-500/40"
                : "text-slate-300 hover:bg-slate-800"
            }`}
            title="Pas Lebar Layar (Fit Width)"
          >
            <Maximize2 className="size-3 mr-1" />
            <span className="hidden xs:inline">Fit</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleZoomIn}
            disabled={isLoading || scale >= 3.0}
            className="size-7 sm:size-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
            title="Perbesar (+)"
          >
            <ZoomIn className="size-3.5 sm:size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRotate}
            disabled={isLoading}
            className="size-7 sm:size-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
            title="Putar 90°"
          >
            <RotateCw className="size-3.5 sm:size-4" />
          </Button>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div
        ref={containerRef}
        className="flex-1 w-full overflow-y-auto overflow-x-auto p-2 sm:p-4 flex flex-col items-center gap-4 bg-slate-900/95 touch-pan-y"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {isLoading && (
          <div className="flex flex-col items-center justify-center my-auto py-16 gap-3 text-center">
            <RefreshCw className="size-8 text-sky-400 animate-spin" />
            <p className="text-xs font-semibold text-slate-200">{loadingProgress}</p>
            <p className="text-[11px] text-slate-400">Merender halaman berkualitas tinggi...</p>
          </div>
        )}

        {errorMsg && (
          <div className="flex flex-col items-center justify-center my-auto py-12 gap-3 text-center max-w-sm px-4">
            <AlertCircle className="size-10 text-rose-400" />
            <p className="text-sm font-semibold text-white">Gagal Menampilkan PDF</p>
            <p className="text-xs text-slate-400">{errorMsg}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(url, "_blank")}
              className="mt-2 text-xs border-slate-700 bg-slate-800 text-white hover:bg-slate-700 gap-1.5"
            >
              <ExternalLink className="size-3.5" />
              Buka Dokumen di Tab Baru
            </Button>
          </div>
        )}

        {/* Render Each Page As Canvas */}
        {!isLoading && !errorMsg && pdfDoc && (
          <div className="flex flex-col items-center gap-4 w-full max-w-full pb-8">
            {Array.from({ length: numPages }, (_, index) => {
              const pageNum = index + 1;
              return (
                <div
                  key={pageNum}
                  data-page-number={pageNum}
                  className="relative flex flex-col items-center group shadow-2xl rounded-sm bg-white overflow-hidden transition-transform duration-150 border border-slate-700/50"
                >
                  <canvas
                    ref={(el) => {
                      canvasRefs.current[pageNum] = el;
                    }}
                    className="block bg-white"
                  />
                  {/* Subtle Page Number Watermark Badge */}
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[10px] font-mono text-white/80 pointer-events-none">
                    Hal. {pageNum}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
