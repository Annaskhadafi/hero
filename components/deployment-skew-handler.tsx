"use client";

import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Sparkles } from "lucide-react";

/**
 * Checks whether an error message or string is caused by Next.js Deployment Version Skew
 * (e.g. stale client calling an outdated Server Action ID).
 */
export function isServerActionSkewError(input: unknown): boolean {
  if (!input) return false;
  const str = String(
    (input as any)?.message ||
      (input as any)?.description ||
      (input as any)?.error ||
      input ||
      ""
  ).toLowerCase();

  return (
    str.includes("failed-to-find-server-action") ||
    str.includes("was not found on the server") ||
    str.includes("failed to find server action") ||
    str.includes("server reference id did not match") ||
    str.includes("older or newer deployment") ||
    (str.includes("server action") && str.includes("not found")) ||
    (str.includes("next-action") && str.includes("409"))
  );
}

export function DeploymentSkewHandler() {
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isTriggeredRef = useRef(false);

  const performReload = () => {
    try {
      sessionStorage.setItem("hero:last-skew-reload", String(Date.now()));
    } catch {}
    window.location.reload();
  };

  const triggerRecovery = () => {
    // Avoid double triggering
    if (isTriggeredRef.current) return;
    isTriggeredRef.current = true;

    // Check reload loop cooldown (prevent infinite reloads within 10 seconds)
    let isLooping = false;
    try {
      const lastReload = Number(sessionStorage.getItem("hero:last-skew-reload") || 0);
      if (Date.now() - lastReload < 10000) {
        isLooping = true;
      }
    } catch {}

    setIsOpen(true);

    if (!isLooping) {
      setCountdown(4);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            performReload();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Loop detected: do not auto-countdown, let user click reload manually
      setCountdown(0);
    }
  };

  const cancelAutoReload = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsOpen(false);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 0. Monkey-patch window.alert to intercept legacy alert dialogs
    const originalAlert = window.alert;
    window.alert = function (message?: any) {
      if (isServerActionSkewError(message)) {
        console.warn("[DeploymentSkewHandler] Intercepted server action skew error in window.alert:", message);
        triggerRecovery();
        return;
      }
      return originalAlert.call(window, message);
    };

    // 1. Monkey-patch toast.error from Sonner to suppress technical server-action skew toasts
    const originalToastError = toast.error;
    (toast as any).error = function (message: any, data?: any) {
      if (isServerActionSkewError(message) || isServerActionSkewError(data?.description)) {
        console.warn("[DeploymentSkewHandler] Intercepted server action skew error in toast.error:", message);
        triggerRecovery();
        return "skew-intercepted";
      }
      return originalToastError.call(toast, message, data);
    };

    // 2. Global unhandledrejection listener
    const handleRejection = (event: PromiseRejectionEvent) => {
      if (isServerActionSkewError(event.reason)) {
        console.warn("[DeploymentSkewHandler] Intercepted server action skew in unhandledrejection:", event.reason);
        event.preventDefault();
        triggerRecovery();
      }
    };

    // 3. Global window error listener
    const handleError = (event: ErrorEvent) => {
      if (isServerActionSkewError(event.message) || isServerActionSkewError(event.error)) {
        console.warn("[DeploymentSkewHandler] Intercepted server action skew in window.error:", event.message);
        event.preventDefault();
        triggerRecovery();
      }
    };

    // 4. Intercept fetch responses with status 409 or containing failed-to-find-server-action
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);
      // Next.js returns 409 Conflict when a Server Action ID is stale / mismatched
      if (response && response.status === 409) {
        try {
          const clone = response.clone();
          const text = await clone.text();
          if (isServerActionSkewError(text)) {
            console.warn("[DeploymentSkewHandler] Intercepted HTTP 409 Server Action mismatch in fetch");
            triggerRecovery();
          }
        } catch {}
      }
      return response;
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.alert = originalAlert;
      (toast as any).error = originalToastError;
      window.fetch = originalFetch;
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-md border-primary/20 bg-card p-6 shadow-2xl">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-primary border border-primary/20">
              <RefreshCw className="size-5 animate-spin text-primary" />
            </div>
            <div>
              <AlertDialogTitle className="text-base font-semibold text-foreground flex items-center gap-1.5">
                Pembaruan Sistem HERO
                <Sparkles className="size-4 text-amber-500 fill-amber-500" />
              </AlertDialogTitle>
              <p className="text-xs text-muted-foreground">Versi server baru telah dirilis</p>
            </div>
          </div>
          <AlertDialogDescription className="text-xs leading-relaxed text-muted-foreground pt-1">
            Server HERO baru saja diperbarui ke versi rilis terbaru. Tab peramban (browser) Anda saat ini masih menjalankan versi sebelumnya sehingga aksi formulir memerlukan sinkronisasi ulang.
          </AlertDialogDescription>
          {countdown > 0 ? (
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 text-center">
              <p className="text-xs font-medium text-primary">
                Memuat ulang halaman otomatis dalam{" "}
                <span className="font-bold text-sm text-primary underline">{countdown} detik</span>...
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-center">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Silakan muat ulang halaman untuk melanjutkan.
              </p>
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 flex flex-row items-center justify-end gap-2">
          <AlertDialogCancel
            onClick={cancelAutoReload}
            className="h-9 px-3 text-xs border-border/70 hover:bg-muted/50"
          >
            Nanti (Salin Teks)
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={performReload}
            className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-sm"
          >
            <RefreshCw className="size-3.5" />
            Muat Ulang Sekarang
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
