"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [isReloading, setIsReloading] = useState(false)

  const isChunkError =
    error?.message?.includes("Loading chunk") ||
    error?.message?.includes("ChunkLoadError") ||
    error?.name === "ChunkLoadError" ||
    error?.message?.toLowerCase().includes("failed to fetch dynamically imported module")

  useEffect(() => {
    console.error("[Dashboard] Error caught by dashboard error boundary:", error)

    if (isChunkError && typeof window !== "undefined") {
      const lastChunkReload = sessionStorage.getItem("hero_last_chunk_reload")
      const now = Date.now()
      // Auto-reload once within 20 seconds to load new build assets cleanly
      if (!lastChunkReload || now - Number(lastChunkReload) > 20000) {
        sessionStorage.setItem("hero_last_chunk_reload", String(now))
        setIsReloading(true)
        window.location.reload()
      }
    }
  }, [error, isChunkError])

  const handleRetry = () => {
    if (isChunkError && typeof window !== "undefined") {
      setIsReloading(true)
      window.location.reload()
    } else {
      reset()
    }
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle className="size-7" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-black text-slate-900">
            {isChunkError ? "Pembaruan Versi Sistem" : "Gagal Memuat Halaman Dashboard"}
          </h2>
          <p className="text-xs text-slate-500">
            {isChunkError
              ? "Sistem sedang memuat berkas pembaruan aplikasi terbaru dari server. Silakan muat ulang halaman."
              : "Terjadi kendala saat menampilkan komponen halaman dashboard."}
          </p>
        </div>

        {error?.message && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-left">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pesan Error</p>
            <p className="mt-1 break-all text-xs font-mono text-rose-700">{error.message}</p>
            {error.digest && (
              <p className="mt-2 text-[10px] font-mono text-slate-400">Digest: {error.digest}</p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
          <Button
            type="button"
            onClick={handleRetry}
            disabled={isReloading}
            className="w-full bg-[#003461] hover:bg-[#00284d] text-white font-bold h-9 text-xs"
          >
            <RefreshCw className={`mr-2 size-3.5 ${isReloading ? "animate-spin" : ""}`} />
            {isReloading ? "Memuat Ulang..." : isChunkError ? "Muat Ulang Halaman" : "Coba Lagi"}
          </Button>

          <Button
            type="button"
            variant="outline"
            asChild
            className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 font-bold h-9 text-xs"
          >
            <Link href="/dashboard">
              <Home className="mr-2 size-3.5" />
              Ke Beranda
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
