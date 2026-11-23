"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MobileProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[mobile/profile] error boundary caught:", error);
  }, [error]);

  return (
    <div className="space-y-4 rounded-[1.25rem] bg-white p-5 shadow-[0_14px_32px_rgba(8,32,51,0.08)]">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-black text-[#082033]">Gagal memuat profil</h2>
          <p className="text-xs text-[#486275]">Terjadi kendala saat membaca data karyawan profil mobile.</p>
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 p-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-[#486275]">Error message</p>
        <p className="mt-1 break-all text-xs font-mono text-rose-700">{error.message}</p>
        {error.digest ? (
          <p className="mt-2 text-[10px] text-slate-400">Digest: {error.digest}</p>
        ) : null}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => reset()}
          className="flex-1 bg-[#003f78] text-white hover:bg-[#004e92]"
        >
          <RefreshCw className="mr-2 size-4" /> Coba lagi
        </Button>
        <Button
          variant="outline"
          onClick={() => window.location.href = "/mobile/dashboard"}
          className="flex-1 border-slate-200 text-slate-700"
        >
          Kembali ke Dashboard
        </Button>
      </div>
    </div>
  );
}
