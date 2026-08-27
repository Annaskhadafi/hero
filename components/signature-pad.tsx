'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface SignaturePadProps {
  onSignatureChange: (file: File | null) => void
  onDataUrlChange?: (dataUrl: string | null) => void
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

export function SignaturePad({ onSignatureChange, onDataUrlChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const ensureCanvasSize = () => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    // Jika container tersembunyi (width 0), abaikan
    if (container.offsetWidth === 0 || container.offsetHeight === 0) return

    // Jika ukuran canvas tidak sesuai dengan ukuran fisik container, sesuaikan
    if (canvas.width !== container.offsetWidth || canvas.height !== container.offsetHeight) {
      let tempCanvas: HTMLCanvasElement | null = null
      
      // Simpan gambar lama jika ada
      if (canvas.width > 0 && canvas.height > 0) {
        tempCanvas = document.createElement('canvas')
        tempCanvas.width = canvas.width
        tempCanvas.height = canvas.height
        tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0)
      }

      // Update ukuran
      canvas.width = container.offsetWidth
      canvas.height = container.offsetHeight

      // Kembalikan gambar lama
      const ctx = canvas.getContext('2d')
      if (ctx && tempCanvas) {
        ctx.drawImage(tempCanvas, 0, 0)
      }
    }
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      ensureCanvasSize()
    })
    
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const hasDrawnRef = useRef(false)

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    
    // Hitung rasio antara ukuran CSS (rect) dan ukuran internal canvas (canvas.width)
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e) {
      const touch = e.touches[0] || (e as any).changedTouches?.[0]
      if (!touch) return { x: 0, y: 0 }
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      }
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    ensureCanvasSize() // Pastikan ukuran canvas 100% benar sebelum digambar
    if (e.cancelable) {
      e.preventDefault()
    }
    
    setIsDrawing(true)
    const { x, y } = getCoordinates(e)
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#000000'
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const rafRef = useRef<number | null>(null)

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    
    // Mencegah scrolling saat sedang tanda tangan di mobile
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

      if (onDataUrlChange && !rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (canvasRef.current) {
            onDataUrlChange(canvasRef.current.toDataURL('image/png'))
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
          onSignatureChange(file)
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
    onSignatureChange(null)
    onDataUrlChange?.(null)
  }

  return (
    <div className="flex flex-col space-y-2 w-full">
      <div 
        ref={containerRef}
        className="border-2 border-slate-300 border-dashed rounded-md bg-white overflow-hidden touch-none h-40 relative"
      >
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-sm">
            Tanda Tangan Di Sini
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          className="w-full h-full cursor-crosshair touch-none absolute inset-0 bg-transparent"
          style={{ touchAction: 'none' }}
        />
      </div>
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500">
          {hasSignature ? 'Tanda tangan terisi' : 'Gunakan mouse atau sentuhan jari'}
        </span>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={clearSignature}
          disabled={!hasSignature}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Ulangi
        </Button>
      </div>
    </div>
  )
}
