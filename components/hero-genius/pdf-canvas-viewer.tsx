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
  defaultViewMode?: "single" | "continuous";
  onLoaded?: (totalPages: number) => void;
}

export function PdfCanvasViewer({
  url,
  filename = "Dokumen",
  className = "",
  defaultViewMode = "single",
  onLoaded,
}: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"single" | "continuous">(defaultViewMode);
  const [scale, setScale] = useState<number>(1.0);
  const [fitToWidth, setFitToWidth] = useState<boolean>(true);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<string>("Memuat engine viewer...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<{ [pageNum: number]: boolean }>({});
  const [useNativeViewer, setUseNativeViewer] = useState<boolean>(false);

  // Refs to canvas elements & active render tasks
  const canvasRefs = useRef<{ [pageNum: number]: HTMLCanvasElement | null }>({});
  const renderTasksRef = useRef<{ [pageNum: number]: any }>({});

  // 1. Ensure PDF.js is loaded dynamically
  useEffect(() => {
    if (useNativeViewer) {
      setIsLoading(false);
      return;
    }

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
              if (window.pdfjsLib) {
                resolve();
              } else {
                existingScript.addEventListener("load", () => resolve());
                existingScript.addEventListener("error", () =>
                  reject(new Error("Gagal mengunduh script PDF.js"))
                );
              }
              return;
            }

            const script = document.createElement("script");
            script.src = "/pdfjs/pdf.min.js";
            script.async = true;
            script.setAttribute("data-pdfjs", "true");
            script.onload = () => {
              if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
                resolve();
              } else {
                reject(new Error("PDF.js library failed to initialize"));
              }
            };
            script.onerror = () =>
              reject(new Error("Tidak dapat terhubung ke server PDF.js lokal"));
            document.head.appendChild(script);
          });
        } else if (!window.pdfjsLib.GlobalWorkerOptions?.workerSrc) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
        }

        if (!isMounted) return;

        setLoadingProgress("Mengunduh isi dokumen...");

        const loadingTask = window.pdfjsLib.getDocument({
          url,
          withCredentials: true,
          cMapUrl: "https://unpkg.com/pdfjs-dist@3.11.174/cmaps/",
          cMapPacked: true,
          standardFontDataUrl: "https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/",
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
      // Cancel any ongoing render tasks on unmount
      Object.values(renderTasksRef.current).forEach((task) => {
        try {
          task?.cancel();
        } catch (_) {}
      });
      renderTasksRef.current = {};
    };
  }, [url, onLoaded, useNativeViewer]);

  // 2. Render Page to Canvas
  const renderPage = useCallback(
    async (pageNum: number) => {
      if (useNativeViewer) return;
      if (!pdfDoc) return;
      const canvas = canvasRefs.current[pageNum];
      if (!canvas) return;

      try {
        // Cancel existing render task on this canvas if any
        if (renderTasksRef.current[pageNum]) {
          try {
            renderTasksRef.current[pageNum].cancel();
          } catch (_) {}
          delete renderTasksRef.current[pageNum];
        }

        const page = await pdfDoc.getPage(pageNum);
        const containerWidth =
          containerRef.current?.clientWidth || window.innerWidth - 32;
        const containerHeight =
          containerRef.current?.clientHeight || window.innerHeight - 200;

        // Calculate scale to fit container comfortably with safe padding
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
        let targetScale = scale;

        if (fitToWidth) {
          const paddingX = window.innerWidth < 640 ? 12 : 24;
          const availableWidth = Math.max(containerWidth - paddingX, 240);

          if (viewMode === "single" && containerHeight > 220) {
            const paddingY = 24;
            const availableHeight = Math.max(containerHeight - paddingY, 220);
            const scaleX = availableWidth / unscaledViewport.width;
            const scaleY = availableHeight / unscaledViewport.height;
            // Fit fully within both width and height so entire page is visible without any cutoff
            targetScale = Math.min(scaleX, scaleY) * scale;
          } else {
            targetScale = (availableWidth / unscaledViewport.width) * scale;
          }
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

        const renderTask = page.render(renderContext);
        renderTasksRef.current[pageNum] = renderTask;

        await renderTask.promise;
        delete renderTasksRef.current[pageNum];
        setRenderedPages((prev) => ({ ...prev, [pageNum]: true }));
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.warn(`[PdfCanvasViewer] Error rendering page ${pageNum}:`, err);
        }
      }
    },
    [pdfDoc, scale, fitToWidth, rotation, viewMode, useNativeViewer]
  );

  // Re-render pages when scale, rotation, viewMode, or doc changes
  useEffect(() => {
    if (useNativeViewer) return;
    if (!pdfDoc || numPages === 0) return;

    if (viewMode === "single") {
      renderPage(currentPage);
    } else {
      for (let p = 1; p <= numPages; p++) {
        renderPage(p);
      }
    }
  }, [pdfDoc, numPages, renderPage, scale, fitToWidth, rotation, viewMode, currentPage, useNativeViewer]);

  // Handle intersection observer to update current page indicator on scroll (continuous mode only)
  useEffect(() => {
    if (viewMode !== "continuous") return;

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

    const elements = Object.values(canvasRefs.current || {}).filter(Boolean);
    elements.forEach((el) => {
      if (el?.parentElement) observer.observe(el.parentElement);
    });

    return () => {
      observer.disconnect();
    };
  }, [numPages, pdfDoc, viewMode]);

  // Navigate to specific page
  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > numPages) return;
    setCurrentPage(targetPage);

    if (viewMode === "continuous") {
      const canvas = canvasRefs.current[targetPage];
      if (canvas) {
        canvas.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
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
    <div className={`flex flex-col h-full w-full bg-white dark:bg-slate-900 select-none overflow-hidden ${className}`}>
      {/* Floating / Sticky Control Bar */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shrink-0 z-20 gap-2 text-xs">
        {/* Page Nav */}
        <div className="flex items-center gap-1">
          {!useNativeViewer && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                className="size-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 disabled:opacity-30 rounded-lg"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="size-3.5" />
              </Button>

              <div className="flex items-center gap-1 text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 px-1">
                <span className="font-bold text-slate-900 dark:text-white">{currentPage}</span>
                <span className="text-slate-400">/</span>
                <span>{numPages || "-"}</span>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= numPages || isLoading}
                className="size-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 disabled:opacity-30 rounded-lg"
                title="Halaman Berikutnya"
              >
                <ChevronRight className="size-3.5" />
              </Button>

              {/* Mode Toggle */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setViewMode((prev) => (prev === "single" ? "continuous" : "single"))}
                disabled={isLoading || numPages <= 1}
                className={`h-7 px-2 text-[10px] font-medium rounded-lg ml-1 gap-1 ${
                  viewMode === "single"
                    ? "bg-white text-[#003461] border border-slate-200 shadow-2xs dark:bg-slate-800 dark:text-sky-300 dark:border-slate-700 font-bold"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                }`}
                title={viewMode === "single" ? "Tampilan: 1 Halaman (Klik untuk mode scroll semua)" : "Tampilan: Scroll Semua (Klik untuk mode 1 halaman)"}
              >
                <Layers className="size-3" />
                <span className="hidden sm:inline">{viewMode === "single" ? "1 Hal" : "Scroll"}</span>
              </Button>
            </>
          )}

          {/* Toggle Native vs Canvas Viewer */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setUseNativeViewer((prev) => !prev)}
            className={`h-7 px-2 text-[10px] font-semibold rounded-lg ml-1 gap-1.5 ${
              useNativeViewer
                ? "bg-[#003461]/10 text-[#003461] border border-[#003461]/20 font-bold dark:bg-blue-600/30 dark:text-sky-300 dark:border-blue-500/40"
                : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
            }`}
            title={useNativeViewer ? "Beralih ke Render Canvas (Custom Zoom/Putar)" : "Gunakan Viewer Browser (Lebih Cepat)"}
          >
            <FileText className="size-3" />
            <span>{useNativeViewer ? "Viewer Browser (Aktif)" : "Viewer Browser"}</span>
          </Button>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1">
          {!useNativeViewer ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={isLoading || scale <= 0.5}
                className="size-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg"
                title="Perkecil (-)"
              >
                <ZoomOut className="size-3.5" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFitWidth}
                disabled={isLoading}
                className={`h-7 px-2 text-[10px] font-medium rounded-lg ${
                  fitToWidth
                    ? "bg-[#003461]/10 text-[#003461] border border-[#003461]/20 font-bold dark:bg-blue-600/30 dark:text-sky-300 dark:border-blue-500/40"
                    : "text-slate-600 hover:bg-slate-200/80 dark:text-slate-300 dark:hover:bg-slate-800"
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
                className="size-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg"
                title="Perbesar (+)"
              >
                <ZoomIn className="size-3.5" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRotate}
                disabled={isLoading}
                className="size-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200/80 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg"
                title="Putar 90°"
              >
                <RotateCw className="size-3.5" />
              </Button>
            </>
          ) : (
            <span className="text-[10px] text-slate-400 italic hidden xs:inline pr-2">
              Mode Browser Native
            </span>
          )}

          {/* Quick Open in New Tab Action */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => window.open(url, "_blank")}
            className="size-7 text-slate-600 hover:text-[#003461] hover:bg-slate-200/80 dark:text-slate-300 dark:hover:text-sky-300 dark:hover:bg-slate-800 rounded-lg"
            title="Buka Dokumen di Tab Baru"
          >
            <ExternalLink className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Canvas Scroll Area (Clean White Background) */}
      <div
        ref={containerRef}
        className={`flex-1 min-h-0 w-full overflow-y-auto overflow-x-auto flex flex-col items-center bg-white dark:bg-slate-900 touch-pan-y ${
          useNativeViewer ? "p-0" : "p-2 sm:p-4 gap-4"
        }`}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {isLoading && (
          <div className="flex flex-col items-center justify-center my-auto py-12 gap-3 text-center">
            <RefreshCw className="size-7 text-[#003461] dark:text-sky-400 animate-spin" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{loadingProgress}</p>
            <p className="text-[11px] text-slate-400">Merender halaman dokumen...</p>
          </div>
        )}

        {errorMsg && (
          <div className="flex flex-col items-center justify-center my-auto py-10 gap-3 text-center max-w-sm px-4">
            <AlertCircle className="size-9 text-rose-500" />
            <p className="text-sm font-semibold text-slate-800 dark:text-white">Gagal Menampilkan PDF</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{errorMsg}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(url, "_blank")}
              className="mt-2 text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 gap-1.5"
            >
              <ExternalLink className="size-3.5" />
              Buka Dokumen di Tab Baru
            </Button>
          </div>
        )}

        {/* Render Page(s) or Native iframe */}
        {!isLoading && !errorMsg && (
          useNativeViewer ? (
            <div className="w-full h-full flex-grow flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
              <iframe
                src={`${url}#toolbar=0&navpanes=0&statusbar=0`}
                className="w-full h-full border-0 flex-grow"
                title={filename}
              />
            </div>
          ) : (
            pdfDoc && (
              viewMode === "single" ? (
                <div className="flex flex-col items-center w-full max-w-full my-auto pb-2">
                  <div
                    data-page-number={currentPage}
                    className="relative flex flex-col items-center group shadow-md rounded-sm bg-white overflow-hidden border border-slate-200/90 dark:border-slate-800"
                  >
                    <canvas
                      ref={(el) => {
                        canvasRefs.current[currentPage] = el;
                      }}
                      className="block bg-white"
                    />
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[10px] font-mono text-white/90 pointer-events-none">
                      Hal. {currentPage} / {numPages}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 w-full max-w-full pb-8">
                  {Array.from({ length: numPages }, (_, index) => {
                    const pageNum = index + 1;
                    return (
                      <div
                        key={pageNum}
                        data-page-number={pageNum}
                        className="relative flex flex-col items-center group shadow-md rounded-sm bg-white overflow-hidden transition-transform duration-150 border border-slate-200/90 dark:border-slate-800"
                      >
                        <canvas
                          ref={(el) => {
                            canvasRefs.current[pageNum] = el;
                          }}
                          className="block bg-white"
                        />
                        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-[10px] font-mono text-white/90 pointer-events-none">
                          Hal. {pageNum}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )
          )
        )}
      </div>
    </div>
  );
}
