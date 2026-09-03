'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink, FileText, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface MobileReviewDialogProps {
  title: string
  categoryLabel: string
  reviewUrl: string
  triggerText?: string
  trigger?: React.ReactNode
}

export function MobileReviewDialog({
  title,
  categoryLabel,
  reviewUrl,
  triggerText = 'Review & Tanda Tangan',
  trigger,
}: MobileReviewDialogProps) {
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState(0)
  const router = useRouter()

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      router.refresh()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            type="button"
            className="w-full h-11 rounded-full bg-[#003f78] hover:bg-[#002f5a] text-white font-black text-sm transition-transform active:scale-95 shadow-sm"
          >
            {triggerText}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="w-[96vw] max-w-5xl h-[92vh] max-h-[92vh] flex flex-col p-3 sm:p-4 bg-slate-100 overflow-hidden rounded-[1.5rem] border border-slate-200 shadow-2xl z-50">
        <DialogHeader className="p-1 pb-2 border-b border-slate-200 flex flex-row items-center justify-between shrink-0 pr-8">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md">
                {categoryLabel}
              </span>
            </div>
            <DialogTitle className="text-sm sm:text-base font-black text-slate-900 mt-1 flex items-center gap-1.5 truncate">
              <FileText className="size-4 text-sky-600 shrink-0" />
              <span className="truncate">{title}</span>
            </DialogTitle>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setKey((k) => k + 1)}
              className="p-1.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors"
              title="Refresh Lembar"
            >
              <RefreshCw className="size-3.5" />
            </button>
            <a
              href={reviewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 py-1 px-2.5 rounded-lg shadow-2xs transition-all"
            >
              <ExternalLink className="size-3.5 text-sky-600" />
              <span className="hidden sm:inline">Buka Tab</span>
            </a>
          </div>
        </DialogHeader>

        <div className="flex-1 w-full h-full min-h-0 bg-white rounded-xl overflow-hidden shadow-inner border border-slate-200">
          <iframe
            key={key}
            src={reviewUrl}
            className="w-full h-full border-0"
            title={title}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
