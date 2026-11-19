"use client"

import { useEffect } from "react"
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
  useEffect(() => {
    console.error("[Dashboard] Error caught by dashboard error boundary:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle className="size-7" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-black text-slate-900">Gagal Memuat Halaman Dashboard</h2>
          <p className="text-xs text-slate-500">
            Terjadi kendala saat menampilkan komponen halaman dashboard.
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
            onClick={() => reset()}
            className="w-full bg-[#003461] hover:bg-[#00284d] text-white font-bold h-9 text-xs"
          >
            <RefreshCw className="mr-2 size-3.5" />
            Coba Lagi
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
