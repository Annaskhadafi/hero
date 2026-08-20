"use client"

import * as React from "react"
import { useRef, useState } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { reviewApprovalAction } from "@/app/dashboard/admin-actions"
import { toast } from "sonner"

export function ApdApprovalDialog({ item, group }: { item: any; group: any }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [note, setNote] = useState('')
  const sigCanvas = useRef<SignatureCanvas>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  const clearSignature = () => {
    sigCanvas.current?.clear()
    
    // Also clear from preview
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'previewSignature', dataUrl: '' }, '*')
    }
  }

  const previewSignature = () => {
    if (sigCanvas.current?.isEmpty()) {
      toast.error("Kanvas masih kosong, silakan tanda tangan terlebih dahulu.")
      return
    }
    const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png')
    if (iframeRef.current && iframeRef.current.contentWindow && dataUrl) {
      iframeRef.current.contentWindow.postMessage({ type: 'previewSignature', dataUrl }, '*')
      toast.success("Tanda tangan berhasil dipratinjau di dokumen!")
    }
  }

  const handleDecision = async (selectedDecision: string) => {
    setIsSubmitting(true)
    
    try {
      const formData = new FormData()
      formData.append('approvalId', item.approvalId.toString())
      formData.append('decision', selectedDecision)
      
      formData.append('note', note || '')

      // If approved, require signature
      if (selectedDecision === 'approved') {
        if (sigCanvas.current?.isEmpty()) {
          toast.error("Silakan tanda tangan sebelum menyetujui.")
          setIsSubmitting(false)
          return
        }
        
        // Convert canvas to blob and append to FormData
        const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png')
        if (dataUrl) {
          const res = await fetch(dataUrl)
          const blob = await res.blob()
          formData.append('signatureFile', blob, 'approver_signature.png')
        }
      }

      await reviewApprovalAction(formData)
      toast.success("Review approval berhasil disimpan.")
      setOpen(false)
      window.location.reload() // Force reload to show updated data immediately
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan saat memproses approval.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="dense">
          Review APD
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-7xl w-[95vw] h-[92vh] flex flex-col p-4 gap-4 bg-surface-container-lowest">
        <DialogHeader className="pb-2 border-b">
          <DialogTitle className="text-lg">Review Permintaan APD - {item.title}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 min-h-0">
          
          {/* Document Preview (Left) */}
          <div className="rounded-lg border bg-card overflow-hidden shadow-sm flex flex-col h-full">
            <div className="bg-surface-container-low px-3 py-1.5 border-b font-medium text-xs text-muted-foreground flex justify-between">
              <span>Preview Dokumen</span>
              <span>{new Date().toLocaleString('id-ID')}</span>
            </div>
            <iframe 
              ref={iframeRef}
              src={`/print/apd/${item.activityId}`}
              className="w-full flex-1 bg-white border-0"
              title="Preview Dokumen"
            />
          </div>

          {/* Form & Signature (Right) */}
          <div className="flex flex-col gap-3 overflow-y-auto pr-1">
            
            <div className="rounded-lg bg-surface-container-low p-3 text-sm text-foreground space-y-1.5 border">
              <p className="font-semibold text-primary text-xs uppercase tracking-wide">Informasi Request</p>
              <div className="grid grid-cols-[80px_1fr] gap-0.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Pemohon:</span> <span>{group.requesterName}</span>
                <span className="font-medium text-foreground">Site:</span> <span>{group.siteName}</span>
                <span className="font-medium text-foreground">Status:</span> <span>{item.currentStepLabel}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 flex-1">
              <div className="flex-1 min-h-[180px] rounded-lg border border-outline-ghost overflow-hidden bg-white shadow-sm flex flex-col">
                <div className="bg-surface-container-low px-3 py-1.5 text-xs font-semibold border-b flex justify-between items-center">
                  Tanda Tangan Digital
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={previewSignature} className="h-6 text-[10px] px-2 text-primary">
                      Pratinjau
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={clearSignature} className="h-6 text-[10px] px-2 text-destructive">
                      Hapus
                    </Button>
                  </div>
                </div>
                <div className="flex-1 relative cursor-crosshair">
                  <SignatureCanvas 
                    ref={sigCanvas}
                    canvasProps={{ className: "absolute inset-0 w-full h-full" }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-semibold">Komentar / Catatan</p>
                <Textarea
                  id={`note-${item.approvalId}`}
                  name="note"
                  rows={2}
                  className="resize-none text-xs"
                  placeholder="Isi komentar bila reject atau revisi. Approve boleh kosong."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t mt-auto">
                <Button type="button" onClick={() => handleDecision("approved")} disabled={isSubmitting} className="flex-1">
                  Setujui
                </Button>
                <Button type="button" onClick={() => handleDecision("needs_correction")} variant="outline" disabled={isSubmitting}>
                  Revisi
                </Button>
                <Button type="button" onClick={() => handleDecision("rejected")} variant="destructive" disabled={isSubmitting}>
                  Tolak
                </Button>
              </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}
