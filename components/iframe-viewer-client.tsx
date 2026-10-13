"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  Globe,
  Shield,
  ShieldAlert,
  Copy,
  Check,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { transformToEmbedUrl, getProxyIframeUrl } from "@/lib/iframe-embed-helper";

interface IframeViewerClientProps {
  title: string;
  url: string;
}

export function IframeViewerClient({ title, url }: IframeViewerClientProps) {
  // Analisis URL untuk melihat apakah bisa dioptimasi ke format embed
  const transformInfo = React.useMemo(() => transformToEmbedUrl(url), [url]);

  // Mode: "direct" (URL asli / embed optimal) atau "proxy" (lewat server proxy HERO)
  const [useProxy, setUseProxy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showHelperBanner, setShowHelperBanner] = useState(false);
  const [disableSandbox, setDisableSandbox] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Tentukan target URL yang dimuat iframe saat ini
  const activeUrl = React.useMemo(() => {
    if (useProxy) {
      return getProxyIframeUrl(url);
    }
    return transformInfo.url;
  }, [useProxy, url, transformInfo.url]);

  // Timer untuk memunculkan panduan jika loading lama (indikasi frame-blocking oleh situs luar)
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      // Jika setelah 4 detik masih loading atau jika menggunakan direct mode pada link berisiko
      if (!useProxy) {
        setShowHelperBanner(true);
      }
    }, 4500);

    return () => clearTimeout(timer);
  }, [activeUrl, useProxy, reloadKey]);

  // Handler fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch((err) => {
        console.warn("Fullscreen request error:", err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch((err) => {
        console.warn("Exit fullscreen error:", err);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReload = () => {
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        ref={containerRef}
        className="flex flex-1 flex-col w-full h-[calc(100vh-4rem)] relative bg-slate-50 dark:bg-slate-950 overflow-hidden"
      >
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10 shrink-0 shadow-xs">
          {/* Sisi Kiri: Judul dan URL */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400">
              <Globe className="size-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {title}
                </h1>

                {transformInfo.isTransformed && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 h-5 px-1.5 font-medium flex items-center gap-1"
                  >
                    <Sparkles className="size-2.5" />
                    Embed {transformInfo.platform || "Optimal"}
                  </Badge>
                )}

                {useProxy && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 h-5 px-1.5 font-medium flex items-center gap-1"
                  >
                    <Shield className="size-2.5" />
                    Bypass Proxy Aktif
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="truncate max-w-[260px] sm:max-w-[420px] font-mono">
                  {url}
                </span>
                <button
                  onClick={handleCopyUrl}
                  className="hover:text-slate-800 dark:hover:text-slate-200 p-0.5 rounded transition-colors"
                  title="Salin URL"
                >
                  {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Action Buttons & Mode Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mode Switcher: Direct vs Bypass Proxy */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setUseProxy(false)}
                className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-all ${
                  !useProxy
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Mode Langsung
              </button>
              <button
                type="button"
                onClick={() => {
                  setUseProxy(true);
                  setShowHelperBanner(false);
                }}
                className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-all flex items-center gap-1 ${
                  useProxy
                    ? "bg-blue-600 text-white shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Shield className="size-3" />
                Bypass Proxy
              </button>
            </div>

            {/* Muat Ulang */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReload}
                  className="h-8 w-8 p-0 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Muat Ulang Halaman</TooltipContent>
            </Tooltip>

            {/* Buka di Tab Baru */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8 px-2.5 rounded-lg text-slate-700 dark:text-slate-300 text-xs font-medium gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-3.5 text-blue-600" />
                    <span className="hidden sm:inline">Buka Tab Baru</span>
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Buka tautan langsung di tab browser baru</TooltipContent>
            </Tooltip>

            {/* Layar Penuh */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="h-8 w-8 p-0 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Loading Indicator Bar */}
        {isLoading && (
          <div className="w-full h-0.5 bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
            <div className="w-full h-full bg-blue-600 animate-pulse" />
          </div>
        )}

        {/* Iframe Viewport */}
        <div className="flex-1 w-full h-full relative bg-white">
          <iframe
            key={`${activeUrl}-${reloadKey}-${disableSandbox ? "nosb" : "sb"}`}
            ref={iframeRef}
            src={activeUrl}
            title={title}
            className="w-full h-full border-0 absolute inset-0 bg-white"
            onLoad={() => setIsLoading(false)}
            allow="accelerometer; autoplay; clipboard-read; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; camera; microphone; fullscreen; display-capture; geolocation"
            referrerPolicy="no-referrer-when-downgrade"
            {...(!disableSandbox
              ? {
                  sandbox:
                    "allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-downloads",
                }
              : {})}
          />
        </div>

        {/* Helper Banner Jika Terindikasi Diblokir oleh Situs Luar (X-Frame-Options) */}
        {showHelperBanner && !useProxy && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-xl w-[92%] bg-slate-900/95 text-white backdrop-blur-md p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 z-20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-2.5 text-slate-300">
              <ShieldAlert className="size-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">
                  Tautan tidak muncul atau "Menolak untuk terhubung"?
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Situs eksternal ini membatasi iframe. Aktifkan Bypass Proxy atau buka di Tab Baru.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setUseProxy(true);
                  setShowHelperBanner(false);
                }}
                className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white border-0 font-medium px-3"
              >
                <Shield className="size-3 mr-1" />
                Aktifkan Proxy
              </Button>
              <Button
                size="sm"
                variant="outline"
                asChild
                className="h-7 text-xs text-slate-200 border-slate-700 hover:bg-slate-800 px-2.5"
              >
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-3 mr-1" />
                  Tab Baru
                </a>
              </Button>
              <button
                type="button"
                onClick={() => setShowHelperBanner(false)}
                className="text-slate-400 hover:text-white text-xs px-1 py-0.5 ml-1"
                title="Tutup pesan"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
