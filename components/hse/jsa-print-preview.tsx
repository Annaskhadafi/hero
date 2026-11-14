'use client'

import * as React from 'react'
import { PenTool, Printer, RectangleHorizontal, RectangleVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { JsaDocumentSheet, type JsaDocumentData } from './jsa-document-sheet'
import { JsaApprovalDialog } from './jsa-approval-dialog'

interface JsaPrintPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: JsaDocumentData | null | undefined
  onApproved?: () => void
}

export function JsaPrintPreview({ open, onOpenChange, data, onApproved }: JsaPrintPreviewProps) {
  const [orientation, setOrientation] = React.useState<'portrait' | 'landscape'>('portrait')
  const [approvalOpen, setApprovalOpen] = React.useState(false)
  const printRef = React.useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (data?.id) {
      window.open(`/print/jsa/${data.id}?orientation=${orientation}`, '_blank')
    }
  }

  if (!data) return null

  const isPendingApproval = !data.signatures?.verifierUrl || data.status === 'pending'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`flex flex-col gap-0 p-0 overflow-hidden bg-slate-100 transition-all duration-200 ${
          orientation === 'landscape'
            ? 'max-w-[96vw] w-[1320px] h-[94vh]'
            : 'max-w-5xl h-[92vh]'
        }`}
      >
        <DialogHeader className="px-6 py-3.5 border-b bg-white flex flex-row items-center justify-between gap-4">
          <div>
            <DialogTitle className="text-base font-bold text-slate-900">Preview Dokumen JSA</DialogTitle>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{data.jsaNumber || 'Dokumen JSA'}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Orientation Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setOrientation('portrait')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Format Tegak (Portrait A4)"
              >
                <RectangleVertical className="w-3.5 h-3.5" />
                <span>Portrait</span>
              </button>
              <button
                type="button"
                onClick={() => setOrientation('landscape')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Format Mendatar (Landscape A4)"
              >
                <RectangleHorizontal className="w-3.5 h-3.5" />
                <span>Landscape</span>
              </button>
            </div>

            {isPendingApproval && (
              <Button
                type="button"
                onClick={() => setApprovalOpen(true)}
                className="gap-2 h-9 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                <PenTool className="w-4 h-4" />
                Verifikasi & TTD Online
              </Button>
            )}

            <Button onClick={handlePrint} className="gap-2 h-9 cursor-pointer">
              <Printer className="w-4 h-4" />
              Cetak PDF
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-100">
          <div id="jsa-print-section" ref={printRef}>
            <JsaDocumentSheet data={data} orientation={orientation} />
          </div>
        </div>
      </DialogContent>

      <JsaApprovalDialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        jsa={data}
        onSuccess={() => {
          onApproved?.()
          onOpenChange(false)
        }}
      />
    </Dialog>
  )
}
