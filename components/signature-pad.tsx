'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  Edit3,
  Loader2,
  PenTool,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { getUserSignatureAction, saveUserSignatureAction } from '@/app/actions/user-signature'
import { cn } from '@/lib/utils'

export interface SignaturePadProps {
  onSignatureChange?: (file: File | null) => void
  onDataUrlChange?: (dataUrl: string | null) => void
  height?: number
  defaultDataUrl?: string | null
  hideProfileSignature?: boolean
  allowSaveToProfile?: boolean
  label?: string
  description?: string
  className?: string
  disabled?: boolean
}

function dataUrlToFile(dataUrl: string, filename = 'signature.png'): File | null {
  try {
    const arr = dataUrl.split(',')
    const mimeMatch = arr[0].match(/:(.*?);/)
    const mime = mimeMatch ? mimeMatch[1] : 'image/png'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    return new File([u8arr], filename, { type: mime })
  } catch {
    return null
  }
}

function getCroppedCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const { width, height } = canvas
  if (width === 0 || height === 0) return canvas

  try {
    const imgData = ctx.getImageData(0, 0, width, height)
    const data = imgData.data

    let minX = width
    let minY = height
    let maxX = 0
    let maxY = 0
    let found = false

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const alpha = data[idx + 3]
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]
        if (alpha > 15 && !(r > 245 && g > 245 && b > 245)) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
          found = true
        }
      }
    }

    if (!found || maxX < minX || maxY < minY) return canvas

    const padding = 12
    minX = Math.max(0, minX - padding)
    minY = Math.max(0, minY - padding)
    maxX = Math.min(width - 1, maxX + padding)
    maxY = Math.min(height - 1, maxY + padding)

    const cropWidth = maxX - minX + 1
    const cropHeight = maxY - minY + 1

    const cropped = document.createElement('canvas')
    cropped.width = cropWidth
    cropped.height = cropHeight
    const croppedCtx = cropped.getContext('2d')
    if (croppedCtx) {
      croppedCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
      return cropped
    }
  } catch {}
  return canvas
}

export function SignaturePad({
  onSignatureChange,
  onDataUrlChange,
  height = 150,
  defaultDataUrl = null,
  hideProfileSignature = false,
  allowSaveToProfile = true,
  label,
  description,
  className,
  disabled = false,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(Boolean(defaultDataUrl))
  const [currentDataUrl, setCurrentDataUrl] = useState<string | null>(defaultDataUrl || null)

  // Profile Signature states
  const [profileSig, setProfileSig] = useState<string | null>(null)
  const [employeeName, setEmployeeName] = useState<string>('')
  const [loadingProfile, setLoadingProfile] = useState(!hideProfileSignature)
  const [isUsingProfileSig, setIsUsingProfileSig] = useState(false)
  const [savingToProfile, setSavingToProfile] = useState(false)
  const hasDrawnRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  // Fetch user signature from profile
  useEffect(() => {
    if (hideProfileSignature) {
      setLoadingProfile(false)
      return
    }

    let isMounted = true
    setLoadingProfile(true)

    getUserSignatureAction()
      .then((res) => {
        if (!isMounted) return
        if (res.success && res.signatureDataUrl) {
          setProfileSig(res.signatureDataUrl)
          setEmployeeName(res.employeeName || '')

          // Jika belum ada tanda tangan spesifik yang disuplai, otomatis gunakan TTD Profil
          if (!defaultDataUrl || defaultDataUrl === res.signatureDataUrl) {
            setIsUsingProfileSig(true)
            setHasSignature(true)
            setCurrentDataUrl(res.signatureDataUrl)
            onDataUrlChange?.(res.signatureDataUrl)
            const file = dataUrlToFile(res.signatureDataUrl)
            onSignatureChange?.(file)
          }
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat tanda tangan profil:', err)
      })
      .finally(() => {
        if (isMounted) setLoadingProfile(false)
      })

    return () => {
      isMounted = false
    }
  }, [hideProfileSignature, defaultDataUrl])

  const ensureCanvasSize = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    if (container.offsetWidth === 0 || container.offsetHeight === 0) return

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const targetWidth = Math.round(container.offsetWidth * dpr)
    const targetHeight = Math.round(container.offsetHeight * dpr)

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      let tempCanvas: HTMLCanvasElement | null = null

      if (canvas.width > 0 && canvas.height > 0) {
        tempCanvas = document.createElement('canvas')
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height
        tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0)
      }

      canvas.width = targetWidth
      canvas.height = targetHeight

      const ctx = canvas.getContext('2d')
      if (ctx) {
        if (tempCanvas) {
          ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, targetWidth, targetHeight)
        } else {
          ctx.lineWidth = 3 * dpr
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.strokeStyle = '#0f172a'
        }
      }
    }
  }, [])

  useEffect(() => {
    if (isUsingProfileSig) return

    const container = containerRef.current
    if (!container) return

    ensureCanvasSize()

    const observer = new ResizeObserver(() => {
      ensureCanvasSize()
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [ensureCanvasSize, isUsingProfileSig])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      const touch = e.touches[0] || (e as any).changedTouches?.[0]
      if (!touch) return { x: 0, y: 0 }
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return
    ensureCanvasSize()
    if (e.cancelable) {
      e.preventDefault()
    }

    setIsDrawing(true)
    const { x, y } = getCoordinates(e)
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (ctx && canvas) {
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
      ctx.lineWidth = 3 * dpr
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#0f172a'
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return

    if (e.cancelable) {
      e.preventDefault()
    }

    const { x, y } = getCoordinates(e)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()

      hasDrawnRef.current = true
      if (!hasSignature) setHasSignature(true)

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (canvasRef.current) {
            const tempUrl = canvasRef.current.toDataURL('image/png')
            setCurrentDataUrl(tempUrl)
            onDataUrlChange?.(tempUrl)
          }
          rafRef.current = null
        })
      }
    }
  }

  const stopDrawing = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (!isDrawing && !hasDrawnRef.current) return
    setIsDrawing(false)

    const canvas = canvasRef.current
    if (canvas && (hasSignature || hasDrawnRef.current)) {
      setHasSignature(true)
      const croppedCanvas = getCroppedCanvas(canvas)
      const dataUrl = croppedCanvas.toDataURL('image/png')
      setCurrentDataUrl(dataUrl)
      onDataUrlChange?.(dataUrl)

      croppedCanvas.toBlob((blob) => {
        if (blob) {
          let file: File
          try {
            file = new File([blob], 'signature.png', { type: 'image/png' })
          } catch {
            file = blob as any
            ;(file as any).name = 'signature.png'
          }
          onSignatureChange?.(file)
        }
      }, 'image/png')
    }
  }

  const clearSignature = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    hasDrawnRef.current = false
    setHasSignature(false)
    setCurrentDataUrl(null)
    onSignatureChange?.(null)
    onDataUrlChange?.(null)
  }

  const handleUseProfileSignature = () => {
    if (!profileSig) return
    setIsUsingProfileSig(true)
    setHasSignature(true)
    setCurrentDataUrl(profileSig)
    onDataUrlChange?.(profileSig)
    const file = dataUrlToFile(profileSig)
    onSignatureChange?.(file)
  }

  const handleSwitchToManual = () => {
    setIsUsingProfileSig(false)
    // Clear canvas when switching to manual so user can draw fresh
    setTimeout(() => {
      ensureCanvasSize()
      clearSignature()
    }, 50)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (PNG, JPG, JPEG, WEBP).')
      return
    }

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
        ensureCanvasSize()
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        const hRatio = canvas.width / img.width
        const vRatio = canvas.height / img.height
        const ratio = Math.min(hRatio, vRatio, 1)

        const centerShiftX = (canvas.width - img.width * ratio) / 2
        const centerShiftY = (canvas.height - img.height * ratio) / 2

        ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio)

        hasDrawnRef.current = true
        setHasSignature(true)

        const croppedCanvas = getCroppedCanvas(canvas)
        const croppedUrl = croppedCanvas.toDataURL('image/png')
        setCurrentDataUrl(croppedUrl)
        onDataUrlChange?.(croppedUrl)

        const fileObj = dataUrlToFile(croppedUrl)
        onSignatureChange?.(fileObj)
        toast.success('Gambar tanda tangan berhasil dimuat.')
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleSaveToProfile = async () => {
    if (!currentDataUrl) {
      toast.error('Goreskan tanda tangan terlebih dahulu sebelum menyimpan ke profil.')
      return
    }

    setSavingToProfile(true)
    try {
      const res = await saveUserSignatureAction(currentDataUrl)
      if (res.success) {
        setProfileSig(currentDataUrl)
        setIsUsingProfileSig(true)
        toast.success('Tanda tangan berhasil didaftarkan ke profil HERO Anda!')
      } else {
        toast.error(res.error || 'Gagal menyimpan tanda tangan ke profil.')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Terjadi kesalahan sistem saat menyimpan ke profil.')
    } finally {
      setSavingToProfile(false)
    }
  }

  return (
    <div className={cn('flex flex-col space-y-2 w-full', className)}>
      {/* ── Mode 1: TTD Profil HERO Aktif ── */}
      {isUsingProfileSig && profileSig ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-3 shadow-xs space-y-2.5">
          {/* Header: Status Badge */}
          <div className="flex items-center justify-between gap-2 border-b border-emerald-200/60 pb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900 whitespace-nowrap">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>TTD Profil HERO Aktif</span>
            </span>
          </div>

          {/* Content: Signature Image + Action Button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-14 w-28 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-white p-1.5 shadow-2xs">
              <img
                src={profileSig}
                alt="Tanda Tangan Profil HERO"
                className="max-h-11 max-w-full object-contain"
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSwitchToManual}
              disabled={disabled}
              className="h-8 px-3 rounded-lg border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 shrink-0 gap-1.5 shadow-2xs"
            >
              <Edit3 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span>Ubah / Gores Manual</span>
            </Button>
          </div>
        </div>
      ) : (
        /* ── Mode 2: Canvas Gambar TTD / Upload ── */
        <div className="space-y-2">
          {/* Bar Atas: Label & Tombol Aksi */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <PenTool className="h-3.5 w-3.5 text-sky-600" />
              <span>
                {label || (profileSig ? 'Goreskan Tanda Tangan Manual:' : 'Goreskan Tanda Tangan Anda:')}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {profileSig && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUseProfileSignature}
                  disabled={disabled}
                  className="h-7 px-2.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100 rounded-lg gap-1 shadow-2xs"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>Gunakan TTD Profil</span>
                </Button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={disabled}
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="h-7 px-2 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 rounded-lg gap-1 shadow-2xs"
              >
                <Upload className="h-3 w-3 text-indigo-600" />
                <span>Upload Gambar</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSignature}
                disabled={!hasSignature || disabled}
                className="h-7 px-2 text-[11px] text-slate-500 hover:text-rose-600 rounded-lg gap-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Bersihkan</span>
              </Button>
            </div>
          </div>

          {/* Kotak Kanvas Tanda Tangan */}
          <div
            ref={containerRef}
            style={{ height: `${height}px` }}
            className="border-2 border-slate-300 border-dashed rounded-xl bg-white overflow-hidden touch-none relative shadow-inner hover:border-sky-400 transition-colors"
          >
            {!hasSignature && !isDrawing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-300 space-y-1">
                <PenTool className="h-6 w-6 stroke-1 text-slate-300" />
                <span className="text-xs font-medium tracking-wide">Tanda Tangan Di Sini</span>
              </div>
            )}
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseUp={stopDrawing}
              onMouseOut={stopDrawing}
              onMouseLeave={stopDrawing}
              onMouseMove={draw}
              onTouchStart={startDrawing}
              onTouchEnd={stopDrawing}
              onTouchCancel={stopDrawing}
              onTouchMove={draw}
              className="w-full h-full cursor-crosshair touch-none absolute inset-0 bg-transparent block"
              style={{ touchAction: 'none' }}
            />
          </div>

          {/* Bar Bawah: Info & Opsi Simpan ke Profil */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <span className="text-[11px] text-slate-500">
              {hasSignature
                ? '✓ Tanda tangan terisi'
                : 'Gunakan mouse, stylus, atau sentuhan jari langsung di kanvas.'}
            </span>

            {allowSaveToProfile && hasSignature && currentDataUrl && !isUsingProfileSig && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveToProfile}
                disabled={savingToProfile || disabled}
                className="h-7 px-2.5 text-[11px] font-semibold border-sky-300 text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg gap-1 shadow-2xs"
              >
                {savingToProfile ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Menyimpan ke Profil...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 text-sky-600" />
                    <span>Simpan TTD Ini ke Profil HERO</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
