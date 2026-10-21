'use client'

import * as React from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { JsaDocumentSheet, type JsaDocumentData } from './jsa-document-sheet'

interface JsaPrintPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: JsaDocumentData | null | undefined
}

export function JsaPrintPreview({ open, onOpenChange, data }: JsaPrintPreviewProps) {
  const printRef = React.useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (data?.id) {
      window.open(`/print/jsa/${data.id}`, '_blank')
    }
  }

  if (!data) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[92vh] flex flex-col gap-0 p-0 overflow-hidden bg-slate-100">
        <DialogHeader className="px-6 py-3.5 border-b bg-white flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-base font-bold text-slate-900">Preview Dokumen JSA</DialogTitle>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{data.jsaNumber || 'Dokumen JSA'}</p>
          </div>
          <Button onClick={handlePrint} className="gap-2 h-9">
            <Printer className="w-4 h-4" />
            Cetak PDF
          </Button>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-100">
          <div id="jsa-print-section" ref={printRef}>
            <JsaDocumentSheet data={data} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
