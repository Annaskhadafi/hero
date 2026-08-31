'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Edit3, Loader2, PenTool, RefreshCw, Trash2, X } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { getUserSignatureAction, saveUserSignatureAction } from '@/app/actions/user-signature'

interface SignatureFloatingWidgetProps {
  onSignatureUpdated?: (sigUrl: string) => void
  openModalDirectly?: boolean
  isOpenDirectModal?: boolean
  onCloseDirectModal?: () => void
}

export function SignatureFloatingWidget({
  onSignatureUpdated,
  openModalDirectly,
  isOpenDirectModal,
  onCloseDirectModal,
}: SignatureFloatingWidgetProps) {
  const isDirectOpen = Boolean(openModalDirectly || isOpenDirectModal)
  const [isOpen, setIsOpen] = useState(isDirectOpen)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [currentSignatureUrl, setCurrentSignatureUrl] = useState<string | null>(null)
  const [employeeName, setEmployeeName] = useState<string>('')

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  const fetchSignature = async () => {
    setLoading(true)
    try {
      const res = await getUserSignatureAction()
      if (res.success) {
        setHasSignature(Boolean(res.hasSignature))
        setCurrentSignatureUrl(res.signatureDataUrl || null)
        setEmployeeName(res.employeeName || '')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSignature()
  }, [])

  useEffect(() => {
    if (isDirectOpen) {
      setIsOpen(true)
      setHasDrawn(false)
    }
  }, [isDirectOpen])

  const handleCloseModal = () => {
    setIsOpen(false)
    if (onCloseDirectModal) onCloseDirectModal()
  }

  // Canvas Drawing logic with precise scaling
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = 'touches' in e ? (e.touches[0]?.clientX || 0) : e.clientX
    const clientY = 'touches' in e ? (e.touches[0]?.clientY || 0) : e.clientY
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    setIsDrawing(true)
    setHasDrawn(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawn(true)
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (!dataUrl) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const hRatio = canvas.width / img.width
        const vRatio = canvas.height / img.height
        const ratio = Math.min(hRatio, vRatio, 1)
        const centerShiftX = (canvas.width - img.width * ratio) / 2
        const centerShiftY = (canvas.height - img.height * ratio) / 2
        ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio)
        setHasDrawn(true)
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const handleSaveSignature = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawn) {
      toast.error('Silakan buat tanda tangan Anda pada area kanvas atau upload gambar terlebih dahulu.')
      return
    }

    const dataUrl = canvas.toDataURL('image/png')
    setSaving(true)
    try {
      const res = await saveUserSignatureAction(dataUrl)
      if (res.success) {
        toast.success('Tanda tangan digital berhasil didaftarkan!')
        setHasSignature(true)
        setCurrentSignatureUrl(dataUrl)
        if (onSignatureUpdated) onSignatureUpdated(dataUrl)
        handleCloseModal()
      } else {
        toast.error(res.error || 'Gagal menyimpan tanda tangan.')
      }
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan sistem.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : handleCloseModal())}>
      <DialogContent className="max-w-lg rounded-2xl border-slate-200 bg-white p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <PenTool className="h-5 w-5 text-indigo-600" />
            Pendaftaran Tanda Tangan Digital
          </DialogTitle>
        </DialogHeader>

          {/* Current Saved Signature Preview */}
          {hasSignature && currentSignatureUrl && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700">Tanda Tangan Saat Ini:</span>
                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" /> Terdaftar
                </span>
              </div>
              <div className="flex h-16 items-center justify-center rounded-lg bg-white p-2 border border-slate-200/80 shadow-inner">
                <img src={currentSignatureUrl} alt="TTD Saya" className="max-h-14 object-contain" />
              </div>
            </div>
          )}

          {/* Canvas Area */}
          <div className="mt-2">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800">
                {hasSignature ? 'Gambar TTD Baru:' : 'Gambar Tanda Tangan Anda:'}
              </span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[10px] font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer">
                  <span>Upload Gambar</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
                <span className="text-slate-300">|</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearCanvas}
                  className="h-6 px-2 text-[10px] text-slate-500 hover:text-rose-600"
                >
                  <Trash2 className="mr-1 h-3 w-3" /> Bersihkan
                </Button>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white hover:border-indigo-400 transition-colors shadow-inner">
              <canvas
                ref={canvasRef}
                width={480}
                height={180}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="touch-none cursor-crosshair w-full block bg-white"
                style={{ height: '180px' }}
              />
            </div>
          </div>

          <DialogFooter className="mt-4 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCloseModal}
              disabled={saving}
              className="text-xs"
            >
              Batal
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSaveSignature}
              disabled={saving || !hasDrawn}
              className="bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Simpan Tanda Tangan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  )
}
