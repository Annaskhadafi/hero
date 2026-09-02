'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, PenTool } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SignatureFloatingWidget } from '@/components/signature-floating-widget'

interface MissingSignatureDialogProps {
  isOpen: boolean
  onClose: () => void
  onSignatureRegistered?: (sigUrl: string) => void
}

export function MissingSignatureDialog({
  isOpen,
  onClose,
  onSignatureRegistered,
}: MissingSignatureDialogProps) {
  const [showCanvasWidget, setShowCanvasWidget] = useState(false)

  const handleRegisterNow = () => {
    onClose()
    setShowCanvasWidget(true)
  }

  const handleSignatureSaved = (sigUrl: string) => {
    setShowCanvasWidget(false)
    if (onSignatureRegistered) {
      onSignatureRegistered(sigUrl)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 bg-white p-6 shadow-2xl">
          <DialogHeader className="items-center text-center sm:text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-inner">
              <PenTool className="h-7 w-7 text-amber-700" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Tanda Tangan Belum Terdaftar
            </DialogTitle>
            <DialogDescription className="mt-2 text-xs leading-relaxed text-slate-600">
              Anda belum mendaftarkan tanda tangan digital. Daftarkan tanda tangan Anda sekarang agar dapat menyetujui dokumen ini?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="w-full sm:w-auto text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Nanti Saja
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleRegisterNow}
              className="w-full sm:w-auto bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm gap-1.5"
            >
              <PenTool className="h-3.5 w-3.5" /> Ya, Daftarkan Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showCanvasWidget && (
        <SignatureFloatingWidget
          openModalDirectly
          onCloseDirectModal={() => setShowCanvasWidget(false)}
          onSignatureUpdated={handleSignatureSaved}
        />
      )}
    </>
  )
}
