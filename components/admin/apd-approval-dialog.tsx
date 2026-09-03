"use client"

import * as React from "react"
import { useRef, useState, useEffect } from "react"
import SignatureCanvas from "react-signature-canvas"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { reviewApprovalAction } from "@/app/dashboard/admin-actions"
import { getUserSignatureAction } from "@/app/actions/user-signature"
import { toast } from "sonner"
import { Download, ExternalLink, PenTool, CheckCircle2, RefreshCw } from "lucide-react"

export function ApdApprovalDialog({ item, group }: { item: any; group: any }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const sigCanvas = useRef<SignatureCanvas>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [note, setNote] = useState('')
  const [profileSig, setProfileSig] = useState<string | null>(null)
  const [isUsingProfileSig, setIsUsingProfileSig] = useState(true)
  const throttleTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (open) {
      getUserSignatureAction().then((res) => {
        if (res.success && res.signatureDataUrl) {
          setProfileSig(res.signatureDataUrl)
          setIsUsingProfileSig(true)
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage({ type: 'previewSignature', dataUrl: res.signatureDataUrl }, '*')
          }
        } else {
          setIsUsingProfileSig(false)
        }
      }).catch(() => {})
    }
  }, [open])

  const sendLiveSignature = () => {
    const dataUrl = isUsingProfileSig && profileSig
      ? profileSig
      : sigCanvas.current && !sigCanvas.current.isEmpty()
      ? sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')
      : ''

    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'previewSignature', dataUrl }, '*')
    }
  }

  const handleStroke = () => {
    if (isUsingProfileSig) setIsUsingProfileSig(false)
    if (throttleTimer.current) return
    throttleTimer.current = setTimeout(() => {
      throttleTimer.current = null
      sendLiveSignature()
    }, 40)
  }

  const handleEnd = () => {
    if (isUsingProfileSig) setIsUsingProfileSig(false)
    if (throttleTimer.current) {
      clearTimeout(throttleTimer.current)
      throttleTimer.current = null
    }
    sendLiveSignature()
  }

  const clearSignature = () => {
    if (throttleTimer.current) {
      clearTimeout(throttleTimer.current)
      throttleTimer.current = null
    }
    sigCanvas.current?.clear()
    setIsUsingProfileSig(false)
    
    // Also clear from preview
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'previewSignature', dataUrl: '' }, '*')
    }
  }

  const useProfileSignature = () => {
    if (!profileSig) return
    setIsUsingProfileSig(true)
    sigCanvas.current?.clear()
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'previewSignature', dataUrl: profileSig }, '*')
    }
    toast.success("Menggunakan tanda tangan profil HERO.")
  }

  const previewSignature = () => {
    sendLiveSignature()
    toast.success("Tanda tangan dipratinjau di dokumen!")
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
        const signatureUrlToUse = isUsingProfileSig && profileSig
          ? profileSig
          : sigCanvas.current && !sigCanvas.current.isEmpty()
          ? sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')
          : null

        if (!signatureUrlToUse) {
          toast.error("Silakan berikan tanda tangan sebelum menyetujui.")
          setIsSubmitting(false)
          return
        }
        
        const res = await fetch(signatureUrlToUse)
        const blob = await res.blob()
        formData.append('signatureFile', blob, 'approver_signature.png')
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

  const [isMobile, setIsMobile] = useState(false)
  const [showDoc, setShowDoc] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const printUrl = item.activityType === 'Summary APD' ? `/print/summary/${item.activityId}` : `/print/apd/${item.activityId}`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="dense">
          Review
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-7xl w-[98vw] sm:w-[95vw] h-[95vh] sm:h-[92vh] flex flex-col p-3 sm:p-4 gap-3 sm:gap-4 bg-surface-container-lowest overflow-hidden">
        <DialogHeader className="pb-2 border-b shrink-0">
          <DialogTitle className="text-sm sm:text-lg leading-tight">{item.title}</DialogTitle>
        </DialogHeader>

        {/* Mobile: stacked layout | Desktop: side-by-side */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_340px] gap-3 sm:gap-4 min-h-0 overflow-hidden">
          
          {/* Document Preview */}
          <div className="rounded-lg border bg-card overflow-hidden shadow-sm flex flex-col min-h-0" style={{ height: isMobile ? (showDoc ? '40vh' : 'auto') : undefined }}>
            <div className="bg-surface-container-low px-3 py-1.5 border-b font-medium text-xs text-muted-foreground flex justify-between items-center shrink-0">
              <span>Preview Dokumen</span>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline">{new Date().toLocaleString('id-ID')}</span>
                {isMobile ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setShowDoc(!showDoc)}
                    >
                      {showDoc ? 'Sembunyikan' : 'Lihat'}
                    </Button>
                    <a
                      href={printUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 h-6 text-[10px] px-2 text-primary"
                    >
                      <ExternalLink className="size-3" /> Buka
                    </a>
                    <a
                      href={printUrl}
                      download
                      className="inline-flex items-center gap-1 h-6 text-[10px] px-2 text-primary"
                    >
                      <Download className="size-3" /> Simpan
                    </a>
                  </>
                ) : (
                  <a href={printUrl} target="_blank" rel="noopener noreferrer">
                    <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] px-2">
                      Cetak PDF
                    </Button>
                  </a>
                )}
              </div>
            </div>
            {(!isMobile || showDoc) && (
              <iframe 
                ref={iframeRef}
                src={printUrl}
                onLoad={sendLiveSignature}
                className="w-full flex-1 min-h-[200px] bg-white border-0"
                title="Preview Dokumen"
              />
            )}
          </div>

          {/* Form & Signature (Right) */}
          <div className="flex flex-col gap-2 sm:gap-3 overflow-y-auto min-h-0">
            
            <div className="rounded-lg bg-surface-container-low p-2.5 sm:p-3 text-sm text-foreground space-y-1 border shrink-0">
              <p className="font-semibold text-primary text-[10px] sm:text-xs uppercase tracking-wide">Informasi Request</p>
              <div className="grid grid-cols-[70px_1fr] sm:grid-cols-[80px_1fr] gap-0.5 text-[11px] sm:text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Pemohon:</span> <span>{group.requesterName}</span>
                <span className="font-medium text-foreground">Site:</span> <span>{group.siteName}</span>
                <span className="font-medium text-foreground">Status:</span> <span>{item.currentStepLabel}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:gap-3 flex-1 min-h-0">
              <div className="flex-1 min-h-[120px] sm:min-h-[160px] rounded-lg border border-outline-ghost overflow-hidden bg-white shadow-sm flex flex-col">
                <div className="bg-surface-container-low px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold border-b flex justify-between items-center shrink-0">
                  <span>Tanda Tangan Digital</span>
                  <div className="flex gap-1">
                    {profileSig && !isUsingProfileSig && (
                      <Button type="button" variant="ghost" size="sm" onClick={useProfileSignature} className="h-5 sm:h-6 text-[9px] sm:text-[10px] px-1.5 sm:px-2 text-primary gap-1">
                        <RefreshCw className="size-2.5" /> Pakai Profil
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={previewSignature} className="h-5 sm:h-6 text-[9px] sm:text-[10px] px-1.5 sm:px-2 text-primary">
                      Pratinjau
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={clearSignature} className="h-5 sm:h-6 text-[9px] sm:text-[10px] px-1.5 sm:px-2 text-destructive">
                      Hapus
                    </Button>
                  </div>
                </div>

                {isUsingProfileSig && profileSig ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-2 bg-slate-50/50">
                    <img src={profileSig} alt="TTD Profil" className="max-h-[60px] object-contain mb-1" />
                    <span className="text-[9px] text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> TTD Profil HERO Aktif
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsUsingProfileSig(false)}
                      className="mt-1 h-5 text-[9px] px-2"
                    >
                      <PenTool className="size-2.5 mr-1" /> Gambar Manual
                    </Button>
                  </div>
                ) : (
                  <div 
                    className="flex-1 relative cursor-crosshair"
                    onMouseMove={handleStroke}
                    onTouchMove={handleStroke}
                    onPointerMove={handleStroke}
                  >
                    <SignatureCanvas 
                      ref={sigCanvas}
                      onEnd={handleEnd}
                      canvasProps={{ className: "absolute inset-0 w-full h-full" }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1 shrink-0">
                <p className="text-[10px] sm:text-xs font-semibold">Komentar / Catatan</p>
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

              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t mt-auto shrink-0">
                <Button type="button" onClick={() => handleDecision("approved")} disabled={isSubmitting} className="flex-1 h-10 sm:h-9">
                  SETUJUI
                </Button>
                <Button type="button" onClick={() => handleDecision("needs_correction")} variant="outline" disabled={isSubmitting} className="h-10 sm:h-9">
                  REVISI
                </Button>
                <Button type="button" onClick={() => handleDecision("rejected")} variant="destructive" disabled={isSubmitting} className="h-10 sm:h-9">
                  TOLAK
                </Button>
              </div>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ApdLiveSignatureListener() {
  useEffect(() => {
    function applySignatureToDOM(dataUrl: string) {
      let targetCell: HTMLElement | null = null
      for (let i = 1; i <= 10; i++) {
        const cell = document.getElementById('approver-cell-' + i)
        if (cell && cell.getAttribute('data-resolved') !== 'true') {
          targetCell = cell
          break
        }
      }
      if (!targetCell) {
        for (let i = 1; i <= 10; i++) {
          const cell = document.getElementById('approver-cell-' + i)
          if (cell && !cell.innerHTML.includes('APPROVED')) {
            targetCell = cell
            break
          }
        }
      }

      if (targetCell) {
        const sigSlot = targetCell.querySelector('div:first-child')
        const waitingLabel = targetCell.querySelector('.waiting-label') as HTMLElement | null
        if (dataUrl && dataUrl.length > 50) {
          if (waitingLabel) waitingLabel.style.display = 'none'
          if (sigSlot) {
            sigSlot.innerHTML = `<img src="${dataUrl}" alt="Live Preview" class="object-contain h-[44px] w-auto max-w-[80%] live-preview-img" style="max-height: 44px;" />`
          }
        } else {
          if (waitingLabel) waitingLabel.style.display = 'block'
          if (sigSlot && !sigSlot.querySelector('.approved-signature')) {
            sigSlot.innerHTML = `<div class="h-[44px]" />`
          }
        }
      }
    }

    function handleMessage(event: MessageEvent) {
      if (event.data && event.data.type === 'previewSignature') {
        applySignatureToDOM(event.data.dataUrl || '')
      }
    }

    window.addEventListener('message', handleMessage)

    // Notify parent immediately and with slight delays that iframe is ready
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'readyForSignature' }, '*')
      setTimeout(() => window.parent?.postMessage({ type: 'readyForSignature' }, '*'), 200)
      setTimeout(() => window.parent?.postMessage({ type: 'readyForSignature' }, '*'), 600)
    }

    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return null
}
