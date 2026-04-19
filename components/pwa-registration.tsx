"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    const cleanupPwa = async () => {
      try {
        const sessionMarker = "hero:pwa-cleanup-session-v2";
        if (window.sessionStorage.getItem(sessionMarker) === "done") {
          return;
        }

        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
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

        window.sessionStorage.setItem(sessionMarker, "done");
      } catch (error) {
        console.error("Gagal membersihkan PWA/offline cache HERO.", error);
      }
    };

    const runCleanup = () => {
      void cleanupPwa();
    };

    const requestIdle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback.bind(window)
        : null;

    if (requestIdle) {
      const idleId = requestIdle(runCleanup, { timeout: 3000 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timeoutId = globalThis.setTimeout(runCleanup, 1000);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  return null;
}
