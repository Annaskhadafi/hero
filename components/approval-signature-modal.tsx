'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Check, CheckCircle2, PenTool, RotateCcw, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { saveUserSignatureAction } from '@/app/actions/user-signature'
import { cn } from '@/lib/utils'

interface ApprovalSignatureModalProps {
  isOpen: boolean
  onClose: () => void
  currentSignatureUrl?: string | null
  onSignatureSaved: (signatureDataUrl: string) => void
}

export function ApprovalSignatureModal({
  isOpen,
  onClose,
  currentSignatureUrl,
  onSignatureSaved,
}: ApprovalSignatureModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [saveToProfile, setSaveToProfile] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'draw' | 'saved'>(
    currentSignatureUrl ? 'saved' : 'draw'
  )

  // Initialize canvas when modal opens
  useEffect(() => {
    if (!isOpen) return
    setActiveTab(currentSignatureUrl ? 'saved' : 'draw')
    setHasDrawn(false)

    const timer = setTimeout(() => {
      initCanvas()
    }, 150)

    return () => clearTimeout(timer)
  }, [isOpen, currentSignatureUrl])

  const initCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1

    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0]?.clientX || 0 : e.clientX
    const clientY = 'touches' in e ? e.touches[0]?.clientY || 0 : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsDrawing(true)
    setHasDrawn(true)
    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (PNG/JPG).')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        clearCanvas()
        const rect = canvas.getBoundingClientRect()
        const hRatio = rect.width / img.width
        const vRatio = rect.height / img.height
        const ratio = Math.min(hRatio, vRatio, 1)
        const centerShiftX = (rect.width - img.width * ratio) / 2
        const centerShiftY = (rect.height - img.height * ratio) / 2

        ctx.drawImage(
          img,
          0,
          0,
          img.width,
          img.height,
          centerShiftX,
          centerShiftY,
          img.width * ratio,
          img.height * ratio
        )
        setHasDrawn(true)
        setActiveTab('draw')
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleApplySignature = async () => {
    let finalDataUrl: string | null = null

    if (activeTab === 'saved' && currentSignatureUrl) {
      finalDataUrl = currentSignatureUrl
    } else {
      const canvas = canvasRef.current
      if (!canvas || !hasDrawn) {
        toast.error('Silakan buat tanda tangan Anda terlebih dahulu.')
        return
      }
      finalDataUrl = canvas.toDataURL('image/png')
    }

    if (!finalDataUrl) {
      toast.error('Tanda tangan tidak tersedia.')
      return
    }

    setIsSaving(true)
    try {
      if (saveToProfile && finalDataUrl !== currentSignatureUrl) {
        const res = await saveUserSignatureAction(finalDataUrl)
        if (!res.success) {
          console.warn('Gagal menyimpan tanda tangan ke profil:', res.error)
        }
      }

      onSignatureSaved(finalDataUrl)
      toast.success('Tanda tangan digital berhasil diterapkan!')
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Gagal menerapkan tanda tangan.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-lg rounded-2xl border-slate-200 bg-white p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <PenTool className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Tanda Tangan Digital Approver
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Gambar tanda tangan langsung pada area kanvas di bawah ini.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Option Tabs if user already has a saved signature */}
        {currentSignatureUrl && (
          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={cn(
                'flex-1 py-1.5 rounded-lg transition text-center cursor-pointer',
                activeTab === 'saved'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Gunakan TTD Tersimpan
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('draw')
                setTimeout(initCanvas, 50)
              }}
              className={cn(
                'flex-1 py-1.5 rounded-lg transition text-center cursor-pointer',
                activeTab === 'draw'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Gambar TTD Baru
            </button>
          </div>
        )}

        {/* Tab 1: Saved Signature View */}
        {activeTab === 'saved' && currentSignatureUrl && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Tanda Tangan Terdaftar:</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <CheckCircle2 className="h-3 w-3" /> Siap Digunakan
              </span>
            </div>
            <div className="flex h-28 items-center justify-center rounded-xl bg-white p-3 border border-slate-200 shadow-inner">
              <img
                src={currentSignatureUrl}
                alt="Tanda Tangan Tersimpan"
                className="max-h-24 max-w-full object-contain filter contrast-125"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Canvas Drawing Area */}
        {(activeTab === 'draw' || !currentSignatureUrl) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">Area Kanvas Tanda Tangan:</span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                  <Upload className="h-3 w-3" />
                  <span>Upload Gambar</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
                {hasDrawn && (
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Bersihkan</span>
                  </button>
                )}
              </div>
            </div>

            <div className="relative rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden shadow-inner group">
              <canvas
                ref={canvasRef}
                className="w-full h-44 cursor-crosshair touch-none block"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasDrawn && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-1">
                  <PenTool className="h-6 w-6 stroke-1" />
                  <span className="text-xs">Tulis tanda tangan di sini (touch atau mouse)</span>
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={saveToProfile}
                onChange={(e) => setSaveToProfile(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 size-4"
              />
              <span>Simpan sebagai tanda tangan profil saya secara permanen</span>
            </label>
          </div>
        )}

        <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
            className="w-full sm:w-auto text-xs border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl"
          >
            Batal
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApplySignature}
            disabled={isSaving || (activeTab === 'draw' && !hasDrawn && !currentSignatureUrl)}
            className="w-full sm:w-auto bg-[#003461] text-xs font-bold text-white hover:bg-[#00284d] rounded-xl shadow-xs gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Terapkan Tanda Tangan</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
