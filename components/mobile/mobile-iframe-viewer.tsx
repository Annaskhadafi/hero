"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Maximize2,
  Minimize2,
  ExternalLink,
  Shield,
  Sparkles,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { transformToEmbedUrl, getProxyIframeUrl } from "@/lib/iframe-embed-helper";
import { cn } from "@/lib/utils";

interface MobileIframeViewerProps {
  title: string;
  url: string;
  category?: string;
  backHref?: string;
}

export function MobileIframeViewer({
  title,
  url,
  category = "Portal Internal",
  backHref = "/mobile/dashboard",
}: MobileIframeViewerProps) {
  const transformInfo = useMemo(() => transformToEmbedUrl(url), [url]);

  const [useProxy, setUseProxy] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [disableSandbox, setDisableSandbox] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const activeUrl = useMemo(() => {
    if (useProxy) {
      return getProxyIframeUrl(url);
    }
    return transformInfo.url;
  }, [useProxy, url, transformInfo.url]);

  useEffect(() => {
    setIsLoading(true);
  }, [activeUrl, useProxy, reloadKey]);

  const handleReload = () => {
    setIsLoading(true);
    setReloadKey((prev) => prev + 1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col w-full transition-all duration-200",
        isFullscreen
          ? "fixed inset-0 z-50 bg-white h-dvh w-dvw p-0 m-0"
          : "space-y-3"
      )}
    >
      {/* Mobile Top Control Header */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs",
          isFullscreen && "rounded-none border-x-0 border-t-0 shadow-sm"
        )}
      >
        {/* Left: Back & Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href={backHref}
            className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
            aria-label="Kembali ke Dashboard"
          >
            <ArrowLeft className="size-4" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-sm font-bold text-slate-900 truncate tracking-tight">
                {title}
              </h1>
              {transformInfo.isTransformed && (
                <Badge
                  variant="secondary"
                  className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 h-4 px-1 font-semibold flex items-center gap-0.5"
                >
                  <Sparkles className="size-2" />
                  Embed
                </Badge>
              )}
              {useProxy && (
                <Badge
                  variant="secondary"
                  className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 h-4 px-1 font-semibold flex items-center gap-0.5"
                >
                  <Shield className="size-2" />
                  Proxy
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {category} • HERO Mobile
            </p>
          </div>
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Proxy Mode Toggle Button */}
          <button
            type="button"
            onClick={() => setUseProxy((prev) => !prev)}
            title={useProxy ? "Gunakan Akses Langsung" : "Gunakan Bypass Proxy"}
            className={cn(
              "flex size-8 items-center justify-center rounded-xl border text-xs font-semibold transition-all active:scale-95",
              useProxy
                ? "bg-amber-50 border-amber-300 text-amber-700"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            )}
          >
            <Shield className="size-3.5" />
          </button>

          {/* Reload Button */}
          <button
            type="button"
            onClick={handleReload}
            title="Muat Ulang Iframe"
            className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
          >
            <RefreshCw
              className={cn(
                "size-3.5",
                isLoading && "animate-spin text-blue-600"
              )}
            />
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
            className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
          >
            {isFullscreen ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
          </button>

          {/* Open Original in New Window / Browser */}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Buka di Browser / Tab Baru"
            className="flex size-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
          >
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>

      {/* Loading Progress Pulse Bar */}
      {isLoading && (
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden shrink-0">
          <div className="w-full h-full bg-blue-600 animate-pulse" />
        </div>
      )}

      {/* Iframe Viewport Container */}
      <div
        className={cn(
          "w-full relative bg-white overflow-hidden shadow-xs",
          isFullscreen
            ? "flex-1 h-full rounded-none"
            : "h-[calc(100dvh-13rem)] min-h-[520px] rounded-2xl border border-slate-200/80"
        )}
      >
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
    </div>
  );
}
