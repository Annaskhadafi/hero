'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type CameraModalProps = {
  isOpen: boolean
  onClose: () => void
  onCapture: (dataUrl: string) => void
  title?: string
}

export function FiveRCameraModal({
  isOpen,
  onClose,
  onCapture,
  title = 'Ambil Foto',
}: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
        setStream(null)
      }
      return
    }

    let activeStream: MediaStream | null = null

    async function startCamera() {
      setError(null)
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        activeStream = mediaStream
        setStream(mediaStream)
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
        }
      } catch (err: any) {
        console.error('Camera access error:', err)
        setError('Gagal mengakses kamera. Pastikan izin kamera telah diberikan di browser.')
      }
    }

    startCamera()

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop())
      }
    }
  }, [isOpen, facingMode])

  if (!isOpen) return null

  function capturePhoto() {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      onCapture(dataUrl)
      onClose()
    }
  }

  function toggleCamera() {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Camera className="size-4 text-emerald-400" />
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="relative aspect-video bg-black flex items-center justify-center">
          {error ? (
            <div className="p-6 text-center text-sm text-red-400">{error}</div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="flex items-center justify-between bg-slate-950 p-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleCamera}
            className="text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className="mr-1.5 size-4" />
            Ganti Kamera
          </Button>

          <Button
            type="button"
            onClick={capturePhoto}
            disabled={Boolean(error)}
            className="bg-emerald-600 px-6 font-semibold text-white hover:bg-emerald-500"
          >
            <Camera className="mr-1.5 size-4" />
            Ambil Foto
          </Button>
        </div>
      </div>
    </div>
  )
}
