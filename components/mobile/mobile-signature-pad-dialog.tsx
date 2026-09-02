'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  FileSignature,
  Image as ImageIcon,
  Loader2,
  PenTool,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  deleteUserSignatureAction,
  getUserSignatureAction,
  saveUserSignatureAction,
} from '@/app/actions/user-signature'

interface MobileSignaturePadDialogProps {
  isOpen: boolean
  onClose: () => void
  onSignatureSaved?: (sigUrl: string) => void
  onSignatureDeleted?: () => void
}

export function MobileSignaturePadDialog({
  isOpen,
  onClose,
  onSignatureSaved,
  onSignatureDeleted,
}: MobileSignaturePadDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [currentSignatureUrl, setCurrentSignatureUrl] = useState<string | null>(null)
  const [signatureRegisteredAt, setSignatureRegisteredAt] = useState<string | null>(null)
  const [employeeName, setEmployeeName] = useState<string>('')

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  const fetchSignature = async () => {
    setLoading(true)
    try {
      const res = await getUserSignatureAction()
      if (res.success) {
        setHasSignature(Boolean(res.hasSignature))
        setCurrentSignatureUrl(res.signatureDataUrl || null)
        setSignatureRegisteredAt(res.signatureRegisteredAt || null)
        setEmployeeName(res.employeeName || '')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchSignature()
      setHasDrawn(false)
      // Slight delay to ensure DOM is mounted before sizing canvas
      const timer = setTimeout(() => {
        setupCanvas()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const setupCanvas = () => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const rect = container.getBoundingClientRect()
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

    canvas.width = rect.width * dpr
    canvas.height = 180 * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = '180px'

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.lineWidth = 2.5
      ctx.strokeStyle = '#0f172a'
    }
  }

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()

    if ('touches' in e) {
      const touch = e.touches[0] || (e as any).changedTouches?.[0]
      if (!touch) return { x: 0, y: 0 }
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
    }

    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    }
  }

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (e.cancelable) {
      e.preventDefault()
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setHasDrawn(true)
  }

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return
    if (e.cancelable) {
      e.preventDefault()
    }
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
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
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
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

      const img = new Image()
      img.onload = () => {
        const cWidth = canvas.width / dpr
        const cHeight = canvas.height / dpr
        ctx.clearRect(0, 0, cWidth, cHeight)

        const hRatio = cWidth / img.width
        const vRatio = cHeight / img.height
        const ratio = Math.min(hRatio, vRatio, 1)
        const centerShiftX = (cWidth - img.width * ratio) / 2
        const centerShiftY = (cHeight - img.height * ratio) / 2

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
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const handleSaveSignature = async () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDrawn) {
      toast.warning('Silakan goreskan tanda tangan atau upload gambar terlebih dahulu.')
      return
    }

    const dataUrl = canvas.toDataURL('image/png')
    setSaving(true)
    try {
      const res = await saveUserSignatureAction(dataUrl)
      if (res.success) {
        toast.success('Tanda tangan digital berhasil disimpan!')
        setHasSignature(true)
        setCurrentSignatureUrl(dataUrl)
        setSignatureRegisteredAt(new Date().toISOString())
        if (onSignatureSaved) {
          onSignatureSaved(dataUrl)
        }
        onClose()
      } else {
        toast.error(res.error || 'Gagal menyimpan tanda tangan.')
      }
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan saat menyimpan.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSignature = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus tanda tangan digital Anda?')) {
      return
    }

    setDeleting(true)
    try {
      const res = await deleteUserSignatureAction()
      if (res.success) {
        toast.success('Tanda tangan digital berhasil dihapus.')
        setHasSignature(false)
        setCurrentSignatureUrl(null)
        setSignatureRegisteredAt(null)
        clearCanvas()
        if (onSignatureDeleted) {
          onSignatureDeleted()
        }
      } else {
        toast.error(res.error || 'Gagal menghapus tanda tangan.')
      }
    } catch (e: any) {
      toast.error(e.message || 'Terjadi kesalahan sistem.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open ? onClose() : null)}>
      <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-md rounded-2xl bg-white p-5 shadow-2xl border-slate-200 overflow-hidden">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2 text-indigo-700">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <PenTool className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Tanda Tangan Digital
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Gunakan jari/stylus di layar ponsel atau upload gambar TTD Anda.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          {/* Current Saved Signature Box */}
          {hasSignature && currentSignatureUrl && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">
                  Tanda Tangan Aktif:
                </span>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 px-2 font-semibold">
                  <CheckCircle2 className="size-3 mr-1" /> Terdaftar
                </Badge>
              </div>

              <div className="flex h-16 items-center justify-center rounded-lg bg-white p-2 border border-slate-200/90 shadow-xs">
                <img
                  src={currentSignatureUrl}
                  alt="TTD Aktif"
                  className="max-h-12 max-w-full object-contain"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                <span>
                  {signatureRegisteredAt
                    ? `Didaftarkan: ${new Date(signatureRegisteredAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}`
                    : 'Siap digunakan'}
                </span>
                <button
                  type="button"
                  onClick={handleDeleteSignature}
                  disabled={deleting}
                  className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700 active:scale-95 transition-transform"
                >
                  <Trash2 className="size-3" />
                  {deleting ? 'Menghapus...' : 'Hapus TTD'}
                </button>
              </div>
            </div>
          )}

          {/* Canvas Area */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                {hasSignature ? 'Goreskan TTD Baru:' : 'Area Goresan TTD:'}
              </span>
              <div className="flex items-center gap-1.5">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2 py-1 rounded-lg cursor-pointer active:scale-95 transition-all">
                  <Upload className="size-3" />
                  <span>Upload Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearCanvas}
                  disabled={!hasDrawn}
                  className="h-7 px-2 text-[11px] text-slate-500 hover:text-rose-600"
                >
                  <RotateCcw className="mr-1 size-3" /> Ulangi
                </Button>
              </div>
            </div>

            <div
              ref={containerRef}
              className="relative w-full overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white hover:border-indigo-400 transition-colors shadow-inner"
              style={{ minHeight: '180px' }}
            >
              {!hasDrawn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-300 text-xs gap-1 select-none">
                  <PenTool className="size-5 opacity-40" />
                  <span>Sentuh & gores tanda tangan di sini</span>
                </div>
              )}
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full block bg-transparent touch-none cursor-crosshair"
                style={{ touchAction: 'none' }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
            className="flex-1 sm:flex-initial h-10 rounded-xl text-xs font-semibold border-slate-200 text-slate-700"
          >
            Batal
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSaveSignature}
            disabled={saving || !hasDrawn}
            className="flex-1 sm:flex-initial h-10 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm gap-1.5"
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-3.5" /> Simpan TTD
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
