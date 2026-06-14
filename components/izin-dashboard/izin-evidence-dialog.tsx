"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ImageIcon, FileText, ExternalLink } from "lucide-react"

export function EvidenceCell({ attachment }: { attachment: string }) {
  const [open, setOpen] = useState(false)

  if (!attachment) {
    return (
      <span className="inline-flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground/40">
        <ImageIcon className="size-3.5" />
      </span>
    )
  }

  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(attachment)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary/20"
        title="Lihat bukti"
      >
        <ImageIcon className="size-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle>Bukti Izin</DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-5">
            {isImage ? (
              <img
                src={attachment}
                alt="Bukti izin"
                className="w-full rounded-xl border border-border/40 object-contain"
                style={{ maxHeight: "60vh" }}
              />
            ) : (
              <a
                href={attachment}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-border/40 bg-surface-container-low p-4 transition hover:bg-surface-container"
              >
                <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">Lampiran</p>
                  <p className="truncate text-xs text-muted-foreground">{attachment}</p>
                </div>
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
