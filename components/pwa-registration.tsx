"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    const setupPwa = async () => {
      try {
        const sessionMarker = "hero:pwa-setup-session-v3";
        if (window.sessionStorage.getItem(sessionMarker) === "done") {
          return;
        }

        if ("caches" in window) {
          const keys = await window.caches.keys();
          await Promise.all(
            keys
              .filter((key) => key.startsWith("hero-pwa-"))
              .map((key) => window.caches.delete(key)),
          );
        }

        const cleanupMarker = "hero:pwa-offline-cleanup-v1";
        const shouldClearLocalData = window.localStorage.getItem(cleanupMarker) !== "done";

        if (shouldClearLocalData) {
          window.localStorage.removeItem("hero:offline-sync-queue");
          window.localStorage.removeItem("hero:cache:attendance-logs");
          window.localStorage.removeItem("hero:cache:hse-feed");

          for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
            const key = window.localStorage.key(index);
            if (key?.startsWith("hero:draft:")) {
              window.localStorage.removeItem(key);
            }
          }

          window.localStorage.setItem(cleanupMarker, "done");
        }

        if ("serviceWorker" in navigator) {
          await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        }

        window.sessionStorage.setItem(sessionMarker, "done");
      } catch (error) {
        console.error("Gagal menyiapkan PWA push HERO.", error);
      }
    };

    // Auto-recover from stale Next.js Turbopack HMR ChunkLoadErrors & missing module factory errors
    // ponytail: upgrade path -> standard service-worker skipWaiting and Cache-Control header tuning
    const handleChunkError = (event: ErrorEvent | PromiseRejectionEvent) => {
      const errorObj = (event as ErrorEvent)?.error || (event as PromiseRejectionEvent)?.reason;
      const msg = String(
        (event as ErrorEvent)?.message ||
          errorObj?.message ||
          errorObj ||
          ""
      );
      if (
        msg.includes("Failed to load chunk") ||
        msg.includes("ChunkLoadError") ||
        msg.includes("Loading chunk") ||
        msg.includes("Failed to fetch") ||
        msg.includes("module factory is not available") ||
        msg.includes("was instantiated because it was required") ||
        msg.includes("stale browser cache")
      ) {
        console.warn("[HMR Recovery] Detecting stale Turbopack chunk/module factory error. Auto-reloading fresh bundle...");
        const reloadKey = "hero:last-hmr-reload";
        const lastReload = Number(sessionStorage.getItem(reloadKey) || 0);
        if (Date.now() - lastReload > 3000) {
          sessionStorage.setItem(reloadKey, String(Date.now()));
          window.location.reload();
        }
      }
    };

    window.addEventListener("error", handleChunkError);
    window.addEventListener("unhandledrejection", handleChunkError);

    const runSetup = () => {
      void setupPwa();
    };

    const requestIdle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback.bind(window)
        : null;

    if (requestIdle) {
      const idleId = requestIdle(runSetup, { timeout: 3000 });
      return () => {
        window.removeEventListener("error", handleChunkError);
        window.removeEventListener("unhandledrejection", handleChunkError);
        window.cancelIdleCallback?.(idleId);
      };
    }

    const timeoutId = globalThis.setTimeout(runSetup, 1000);
    return () => {
      window.removeEventListener("error", handleChunkError);
      window.removeEventListener("unhandledrejection", handleChunkError);
      globalThis.clearTimeout(timeoutId);
    };
  }, []);

  return null;
}
