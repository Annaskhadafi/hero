'use client'

import React, { useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, Download, Eye, FileText, CheckCircle2 } from 'lucide-react'
import { TrainingRequestFormPdf } from './training-request-form-pdf'

interface TrainingRequestPdfDialogProps {
  request: any
  approvals: any[]
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TrainingRequestPdfDialog({
  request,
  approvals = [],
  trigger,
  open,
  onOpenChange,
}: TrainingRequestPdfDialogProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="w-full max-w-full sm:max-w-7xl h-[100dvh] sm:h-auto sm:max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-100 sm:rounded-2xl rounded-none">
        <DialogHeader className="p-3 sm:p-4 bg-white border-b border-slate-200 flex flex-row items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 bg-blue-50 text-blue-700 rounded-lg shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                <span>Dokumen Formulir Training</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium font-mono">
                  {request?.requestNumber}
                </span>
                {request?.status === 'approved' && (
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Disetujui
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                Standard Form ISO &bull; F.HR.STD.011.00 (Rev. 00)
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs text-slate-700 hover:text-slate-900 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak / Simpan PDF</span>
              <span className="sm:hidden">Cetak</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Mobile Swipe Hint */}
        <div className="sm:hidden text-center text-[10px] text-sky-800 py-1.5 px-3 bg-sky-50 border-b border-sky-200/60 flex items-center justify-center gap-1 shrink-0">
          <span>Geser dokumen ke samping untuk melihat seluruh tabel ISO</span>
        </div>

        {/* Scrollable Document Area */}
        <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-6 flex justify-start sm:justify-center bg-slate-100">
          <div ref={contentRef} className="min-w-[800px] sm:w-full flex justify-center">
            <TrainingRequestFormPdf request={request} approvals={approvals} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
