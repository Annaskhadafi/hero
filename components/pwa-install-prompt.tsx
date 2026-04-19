"use client";

import { Download, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALL_PROMPT_SEEN_KEY = "hero:pwa-install-prompt-seen";

function hasSeenInstallPrompt() {
  return window.localStorage.getItem(INSTALL_PROMPT_SEEN_KEY) === "true";
}

function rememberInstallPromptSeen() {
  window.localStorage.setItem(INSTALL_PROMPT_SEEN_KEY, "true");
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches;
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (hasSeenInstallPrompt() || isStandaloneApp()) {
      setIsDismissed(true);
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      if (hasSeenInstallPrompt() || isStandaloneApp()) {
        return;
      }

      event.preventDefault();
      rememberInstallPromptSeen();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      rememberInstallPromptSeen();
      setInstallEvent(null);
      setIsDismissed(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (installEvent == null || isDismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(92vw,24rem)] rounded-[1.4rem] border border-emerald-200/80 bg-white/95 p-4 shadow-[0_18px_60px_rgba(15,118,110,0.22)] backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-900">
          <Smartphone className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Install HERO sebagai aplikasi</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Simpan HERO ke home screen agar akses Daily Activity dan approval lebih cepat saat di
            lapangan.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="rounded-xl"
              onClick={async () => {
                await installEvent.prompt();
                const choice = await installEvent.userChoice;
                setIsDismissed(true);
                if (choice.outcome === "accepted") {
                  setInstallEvent(null);
                }
              }}
            >
              <Download className="mr-2 size-4" />
              Install
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-xl"
              onClick={() => {
                rememberInstallPromptSeen();
                setIsDismissed(true);
              }}
            >
              Nanti saja
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
