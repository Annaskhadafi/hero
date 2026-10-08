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
  preferNativeViewer?: boolean;
  hideToolbar?: boolean;
  hideDownload?: boolean;
  onLoaded?: (totalPages: number) => void;
}

export function PdfCanvasViewer({
  url,
  filename = "Dokumen",
  className = "",
  defaultViewMode = "single",
  preferNativeViewer = true,
  hideToolbar = true,
  hideDownload = true,
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
  const [isLoading, setIsLoading] = useState<boolean>(!preferNativeViewer);
  const [loadingProgress, setLoadingProgress] = useState<string>("Memuat dokumen...");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<{ [pageNum: number]: boolean }>({});
  const [visiblePages, setVisiblePages] = useState<number[]>([1]);
  const [useNativeViewer, setUseNativeViewer] = useState<boolean>(preferNativeViewer);
  const [showSlowNotice, setShowSlowNotice] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const shouldHideDownload = hideDownload ?? hideToolbar ?? true;
  const baseUrl = url.split("#")[0];
  const nativePdfUrl = `${baseUrl}#toolbar=${shouldHideDownload ? "0" : "1"}&navpanes=0&statusbar=0&scrollbar=1`;

  // Refs to canvas elements & active render tasks
  const canvasRefs = useRef<{ [pageNum: number]: HTMLCanvasElement | null }>({});
  const renderTasksRef = useRef<{ [pageNum: number]: any }>({});

  // 1. Ensure PDF.js is loaded dynamically or use native viewer
  useEffect(() => {
    if (useNativeViewer) {
      setIsLoading(false);
      setErrorMsg(null);
      return;
    }

    let isMounted = true;
    setShowSlowNotice(false);

    // Timeout alert for very large PDFs to offer fast native viewer
    const timer = setTimeout(() => {
      if (isMounted && isLoading) {
        setShowSlowNotice(true);
      }
    }, 4500);

    async function loadPdfJs() {
      try {
        setIsLoading(true);
        setErrorMsg(null);
        setLoadingProgress("Menyiapkan PDF reader...");

        if (!window.pdfjsLib) {
          await new Promise<void>((resolve, reject) => {
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
              reject(new Error("Tidak dapat terhubung ke script PDF.js"));
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
          disableAutoFetch: false,
          disableStream: false,
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
        setShowSlowNotice(false);
        if (onLoaded) onLoaded(doc.numPages);
      } catch (err: any) {
        console.error("[PdfCanvasViewer] Load error:", err);
        if (isMounted) {
          setIsLoading(false);
          // If canvas loading fails, automatically suggest switching to native browser viewer
          setErrorMsg(err.message || "Gagal memproses file PDF.");
        }
      } finally {
        clearTimeout(timer);
      }
    }

    loadPdfJs();

    return () => {
      isMounted = false;
      clearTimeout(timer);
      // Cancel any ongoing render tasks on unmount
      Object.values(renderTasksRef.current).forEach((task) => {
        try {
          task?.cancel();
        } catch (_) {}
      });
      renderTasksRef.current = {};
    };
  }, [url, onLoaded, useNativeViewer, reloadKey]);

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
      // Lazy continuous rendering: only render visible pages + neighbor buffer
      const pagesToRender = new Set<number>();
      pagesToRender.add(currentPage);
      if (currentPage > 1) pagesToRender.add(currentPage - 1);
      if (currentPage < numPages) pagesToRender.add(currentPage + 1);
      visiblePages.forEach((p) => pagesToRender.add(p));

      pagesToRender.forEach((p) => {
        if (p >= 1 && p <= numPages) {
          renderPage(p);
        }
      });
    }
  }, [pdfDoc, numPages, renderPage, scale, fitToWidth, rotation, viewMode, currentPage, visiblePages, useNativeViewer]);

  // Handle intersection observer to update current page indicator and trigger lazy render on scroll
  useEffect(() => {
    if (viewMode !== "continuous") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageAttr = entry.target.getAttribute("data-page-number");
            if (pageAttr) {
              const p = parseInt(pageAttr, 10);
              setCurrentPage(p);
              setVisiblePages((prev) => (prev.includes(p) ? prev : [...prev, p]));
            }
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.1,
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
    setVisiblePages((prev) => (prev.includes(targetPage) ? prev : [...prev, targetPage]));

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
        {/* Page Nav & Viewer Mode */}
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
            className={`h-7 px-2.5 text-[10px] font-semibold rounded-lg ml-1 gap-1.5 ${
              useNativeViewer
                ? "bg-[#003461] text-white hover:bg-[#002244] shadow-2xs font-bold dark:bg-sky-600 dark:text-white"
                : "bg-slate-200/80 text-slate-800 hover:bg-slate-300 font-bold dark:bg-slate-800 dark:text-white"
            }`}
            title={useNativeViewer ? "Sedang aktif: Mode Cepat Browser Native (Paling Ringan). Klik untuk mencoba mode Canvas." : "Beralih ke Mode Cepat Browser"}
          >
            <FileText className="size-3" />
            <span>{useNativeViewer ? "⚡ Mode Cepat (Aktif)" : "⚡ Beralih ke Mode Cepat"}</span>
          </Button>

          {useNativeViewer && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUseNativeViewer(false)}
              className="h-7 px-2 text-[10px] text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg"
              title="Beralih ke Render Canvas (Custom Zoom / Putar)"
            >
              Mode Canvas
            </Button>
          )}
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
            <span className="text-[10px] text-slate-400 font-medium hidden xs:inline pr-2">
              Viewer Browser Native
            </span>
          )}

          {/* Reload Action */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => {
              setErrorMsg(null);
              setRenderedPages({});
              setReloadKey((k) => k + 1);
            }}
            className="size-7 text-slate-600 hover:text-[#003461] hover:bg-slate-200/80 dark:text-slate-300 dark:hover:text-sky-300 dark:hover:bg-slate-800 rounded-lg"
            title="Muat Ulang Dokumen"
          >
            <RefreshCw className="size-3.5" />
          </Button>

          {/* Quick Open in New Tab Action */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => window.open(nativePdfUrl, "_blank")}
            className="size-7 text-slate-600 hover:text-[#003461] hover:bg-slate-200/80 dark:text-slate-300 dark:hover:text-sky-300 dark:hover:bg-slate-800 rounded-lg"
            title="Buka Dokumen di Tab Baru"
          >
            <ExternalLink className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Slow loading helper banner */}
      {showSlowNotice && !useNativeViewer && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 px-3 py-1.5 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200 animate-in fade-in duration-200 shrink-0">
          <span className="text-[11px] flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            File berukuran besar sedang dimuat...
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setShowSlowNotice(false);
              setUseNativeViewer(true);
            }}
            className="h-6 px-2 text-[10px] font-bold border-amber-300 bg-white text-amber-900 hover:bg-amber-100 dark:bg-amber-900 dark:text-amber-100"
          >
            ⚡ Beralih ke Mode Cepat
          </Button>
        </div>
      )}

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
            <p className="text-sm font-semibold text-slate-800 dark:text-white">Gagal Memproses Render PDF</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{errorMsg}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setErrorMsg(null);
                  setUseNativeViewer(true);
                }}
                className="text-xs bg-[#003461] hover:bg-[#00284d] text-white gap-1.5"
              >
                <FileText className="size-3.5" />
                ⚡ Buka dengan Mode Cepat
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open(url, "_blank")}
                className="text-xs border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 gap-1.5"
              >
                <ExternalLink className="size-3.5" />
                Tab Baru
              </Button>
            </div>
          </div>
        )}

        {/* Render Page(s) or Native iframe */}
        {!isLoading && !errorMsg && (
          useNativeViewer ? (
            <div className="w-full h-full flex-grow flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
              <iframe
                key={reloadKey}
                src={nativePdfUrl}
                className="w-full h-full border-0 flex-grow bg-white"
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
                    const isVisibleOrNeighbor =
                      visiblePages.includes(pageNum) ||
                      Math.abs(pageNum - currentPage) <= 1;

                    return (
                      <div
                        key={pageNum}
                        data-page-number={pageNum}
                        className="relative flex flex-col items-center group shadow-md rounded-sm bg-white overflow-hidden transition-transform duration-150 border border-slate-200/90 dark:border-slate-800 min-h-[300px] w-full max-w-3xl justify-center"
                      >
                        <canvas
                          ref={(el) => {
                            canvasRefs.current[pageNum] = el;
                          }}
                          className={`block bg-white ${!isVisibleOrNeighbor && !renderedPages[pageNum] ? "hidden" : ""}`}
                        />
                        {!isVisibleOrNeighbor && !renderedPages[pageNum] && (
                          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                            <RefreshCw className="size-5 animate-spin text-slate-300" />
                            <span className="text-[11px] font-mono">Memuat Halaman {pageNum}...</span>
                          </div>
                        )}
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
