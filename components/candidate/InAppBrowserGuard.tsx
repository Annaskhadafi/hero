"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, AlertTriangle } from "lucide-react";

export function InAppBrowserGuard() {
  const [isInApp, setIsInApp] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    const isAndroidDevice = /Android/i.test(ua);
    const isInAppBrowser =
      /Gmail|GSA|FBAN|FBAV|Instagram|LinkedInApp|Line|MicroMessenger|WhatsApp|Twitter|Snapchat/i.test(ua) ||
      (isAndroidDevice && /wv/i.test(ua));

    setIsAndroid(isAndroidDevice);
    setIsInApp(Boolean(isInAppBrowser));

    // If on Android Gmail/WebView, try auto-launching external browser via Android Intent
    if (isAndroidDevice && isInAppBrowser) {
      const targetUrl = window.location.href.replace(/^https?:\/\//, "");
      const intentUrl = `intent://${targetUrl}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;

      const redirectKey = `intent_redirect_${window.location.pathname}`;
      if (!sessionStorage.getItem(redirectKey)) {
        sessionStorage.setItem(redirectKey, "1");
        window.location.href = intentUrl;
      }
    }
  }, []);

  if (!isInApp) return null;

  const handleOpenExternal = () => {
    const currentUrl = window.location.href;
    if (isAndroid) {
      const targetUrl = currentUrl.replace(/^https?:\/\//, "");
      window.location.href = `intent://${targetUrl}#Intent;scheme=https;action=android.intent.action.VIEW;end;`;
    } else {
      // iOS / Mobile WebViews
      window.open(currentUrl, "_system");
      window.location.href = currentUrl;
    }
  };

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 p-3 px-4 text-amber-900 dark:text-amber-200">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Anda membuka tes dari dalam aplikasi (Gmail/WebView). Buka di browser utama agar tes tidak error.
          </span>
        </div>
        <Button
          size="sm"
          onClick={handleOpenExternal}
          className="bg-amber-600 text-white hover:bg-amber-700 border-amber-600 h-8 gap-1.5 shrink-0 w-full sm:w-auto text-xs font-semibold"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Buka di Browser Utama
        </Button>
      </div>
    </div>
  );
}
