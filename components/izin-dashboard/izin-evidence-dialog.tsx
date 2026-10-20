"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ImageIcon, FileText, ExternalLink, Loader2, Download, AlertCircle, ZoomIn } from "lucide-react"
import { resolveUploadUrl } from "@/lib/resolve-upload-url"
import { Button } from "@/components/ui/button"

export function EvidenceCell({ attachment }: { attachment: string }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  if (!attachment) {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground/40">
        <ImageIcon className="size-4" />
      </span>
    )
  }

  const resolvedUrl = resolveUploadUrl(attachment)
  const isImage = /\.(jpe?g|png|gif|webp|bmp|heic|heif|svg)$/i.test(resolvedUrl || attachment)
  
  // High-performance thumbnail for modal preview (900px width ~70-120KB)
  const thumbnailUrl = isImage && resolvedUrl
    ? `${resolvedUrl}${resolvedUrl.includes("?") ? "&" : "?"}w=900`
    : resolvedUrl

  // Compact micro-thumbnail for table cell (80px width ~5-10KB)
  const cellThumbUrl = isImage && resolvedUrl
    ? `${resolvedUrl}${resolvedUrl.includes("?") ? "&" : "?"}w=80`
    : ""

  const handleOpenModal = () => {
    setIsLoading(true)
    setHasError(false)
    setOpen(true)
  }

  return (
    <>
      {isImage ? (
        <button
          type="button"
          onClick={handleOpenModal}
          className="group relative flex size-8 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/40 shadow-2xs transition hover:border-primary/50 hover:shadow-xs"
          title="Lihat bukti izin (Klik untuk pratinjau cepat)"
        >
          <img
            src={cellThumbUrl}
            alt="Bukti izin"
            className="size-full object-cover transition duration-200 group-hover:scale-110"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none"
              const fallback = e.currentTarget.nextElementSibling
              if (fallback) fallback.classList.remove("hidden")
            }}
          />
          <span className="hidden">
            <ImageIcon className="size-3.5 text-primary" />
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary/20"
          title="Lihat lampiran dokumen"
        >
          <FileText className="size-4" />
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden sm:max-w-3xl">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-border/40 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base font-semibold">Bukti Izin</DialogTitle>
              {isImage && (
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                  Pratinjau Cepat
                </span>
              )}
            </div>
            {isImage && (
              <div className="flex items-center gap-2 pr-6">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" title="Buka resolusi asli di tab baru">
                    <ExternalLink className="size-3.5" />
                    <span className="hidden sm:inline">Resolusi Asli</span>
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <a href={resolvedUrl} download title="Unduh berkas asli">
                    <Download className="size-3.5" />
                    <span className="hidden sm:inline">Unduh</span>
                  </a>
                </Button>
              </div>
            )}
          </DialogHeader>

          <div className="relative min-h-[260px] max-h-[75vh] overflow-auto bg-muted/20 p-4 sm:p-6 flex items-center justify-center">
            {isImage ? (
              <>
                {isLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/85 backdrop-blur-2xs z-10">
                    <Loader2 className="size-7 animate-spin text-primary" />
                    <p className="text-xs font-medium text-muted-foreground">Memuat pratinjau bukti izin...</p>
                  </div>
                )}

                {hasError ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                    <AlertCircle className="size-8 text-rose-500" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Gagal memuat pratinjau foto</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Berkas mungkin sedang tidak tersedia atau format tidak didukung.
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <a href={resolvedUrl} target="_blank" rel="noopener noreferrer">
                        Buka Gambar Asli Langsung
                      </a>
                    </Button>
                  </div>
                ) : (
                  <img
                    src={thumbnailUrl}
                    alt="Bukti izin"
                    onLoad={() => setIsLoading(false)}
                    onError={() => {
                      setHasError(true)
                      setIsLoading(false)
                    }}
                    className={`w-auto max-w-full max-h-[65vh] rounded-xl border border-border/40 object-contain shadow-2xs transition-opacity duration-300 ${
                      isLoading ? "opacity-0" : "opacity-100"
                    }`}
                  />
                )}
              </>
            ) : (
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-3 rounded-xl border border-border/40 bg-card p-4 transition hover:bg-accent/40"
              >
                <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">Lampiran Dokumen</p>
                  <p className="truncate text-xs text-muted-foreground">{attachment}</p>
                </div>
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
              </a>
            )}
          </div>

          {isImage && (
            <div className="flex items-center justify-between border-t border-border/40 bg-muted/30 px-5 py-2.5 text-xs text-muted-foreground">
              <span>Resolusi dioptimalkan agar cepat dibuka.</span>
              <a
                href={resolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                <ZoomIn className="size-3.5" />
                Perbesar / Buka Resolusi Penuh
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
