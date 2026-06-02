'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface SignaturePadProps {
  onSignatureChange: (file: File | null) => void
}

export function SignaturePad({ onSignatureChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const initCanvas = () => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    // Hanya ubah ukuran jika ukurannya lebih dari 0 (tidak hidden)
    if (container.offsetWidth === 0 || container.offsetHeight === 0) return

    // Simpan gambar lama sebelum resize agar tidak hilang
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let tempCanvas: HTMLCanvasElement | null = null
    if (canvas.width > 0 && canvas.height > 0) {
      tempCanvas = document.createElement('canvas')
      tempCanvas.width = canvas.width
      tempCanvas.height = canvas.height
      tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0)
    }

    canvas.width = container.offsetWidth
    canvas.height = container.offsetHeight
    
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#000000'

    // Kembalikan gambar
    if (tempCanvas) {
      ctx.drawImage(tempCanvas, 0, 0)
    }
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      initCanvas()
    })
    
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
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
      
      if (!hasSignature) setHasSignature(true)
    }
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    
    const canvas = canvasRef.current
    if (canvas && hasSignature) {
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'signature.png', { type: 'image/png' })
          onSignatureChange(file)
        }
      }, 'image/png')
    }
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onSignatureChange(null)
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
          className="w-full h-full cursor-crosshair touch-none absolute inset-0"
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
