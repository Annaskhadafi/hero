'use client'

import React, { useRef } from 'react'
import {
  Dialog,
  DialogContent,
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
      <DialogContent className="sm:max-w-7xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-100">
        <DialogHeader className="p-4 bg-white border-b border-slate-200 flex flex-row items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Dokumen Formulir Training</span>
                <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
                  {request?.requestNumber}
                </span>
                {request?.status === 'approved' && (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Disetujui Penuh
                  </span>
                )}
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard Form ISO &bull; F.HR.STD.011.00 (Rev. 00)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pr-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-slate-700 hover:text-slate-900 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-slate-100">
          <div ref={contentRef} className="w-full flex justify-center">
            <TrainingRequestFormPdf request={request} approvals={approvals} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
