'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Camera, RefreshCw, X, Image as ImageIcon, AlertCircle, RotateCcw } from 'lucide-react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [error, setError] = useState<string | null>(null)
  const [isPermissionError, setIsPermissionError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  const stopActiveStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }, [stream])

  const startCamera = useCallback(async () => {
    setError(null)
    setIsPermissionError(false)

    // Verify browser support
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      setError('Perangkat atau browser ini tidak mendukung akses kamera langsung. Silakan pilih foto dari galeri / file.')
      setIsPermissionError(false)
      return
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })

      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err: any) {
      const errName = err?.name || ''
      const errMsg = String(err?.message || '')
      const isDismissedOrDenied =
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errMsg.toLowerCase().includes('permission') ||
        errMsg.toLowerCase().includes('dismissed') ||
        errMsg.toLowerCase().includes('denied')

      // Suppress dev overlay errors by using warn instead of standard error logger
      console.warn('[FiveRCameraModal] Camera access not granted or dismissed:', errName || errMsg)

      setIsPermissionError(isDismissedOrDenied)
      if (isDismissedOrDenied) {
        setError('Izin akses kamera ditutup atau belum diberikan pada browser. Anda dapat mengaktifkannya di pengaturan browser atau langsung memilih foto dari galeri/file.')
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setError('Kamera tidak ditemukan pada perangkat ini. Silakan gunakan opsi pilih dari galeri/file.')
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setError('Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut atau pilih foto dari file.')
      } else {
        setError('Gagal mengakses kamera. Silakan pilih foto langsung dari galeri / file perangkat Anda.')
      }
    }
  }, [facingMode])

  useEffect(() => {
    if (!isOpen) {
      stopActiveStream()
      setError(null)
      setIsPermissionError(false)
      return
    }

    startCamera()

    return () => {
      stopActiveStream()
    }
  }, [isOpen, facingMode, retryCount, startCamera, stopActiveStream])

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

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onCapture(reader.result)
        onClose()
      }
    }
    reader.readAsDataURL(file)
  }

  function triggerFilePicker() {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      {/* Hidden fallback file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-xl bg-slate-900 border border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Camera className="size-4 text-emerald-400" />
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Video / Error Viewport */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm space-y-3">
              <div className="rounded-full bg-amber-500/10 p-3 text-amber-400 border border-amber-500/20">
                <AlertCircle className="size-8" />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {error}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button
                  type="button"
                  onClick={triggerFilePicker}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs sm:text-sm h-9 px-4 gap-2 shadow-sm"
                >
                  <ImageIcon className="size-4" />
                  Pilih dari Galeri / File
                </Button>
                {isPermissionError && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRetryCount((c) => c + 1)}
                    className="border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm h-9 px-3 gap-1.5"
                  >
                    <RotateCcw className="size-3.5" />
                    Coba Lagi
                  </Button>
                )}
              </div>
            </div>
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

        {/* Action Controls */}
        <div className="flex items-center justify-between bg-slate-950 px-4 py-3 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleCamera}
              disabled={Boolean(error)}
              className="text-slate-300 hover:bg-slate-800 hover:text-white text-xs h-9"
            >
              <RefreshCw className="mr-1.5 size-3.5" />
              Ganti Kamera
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={triggerFilePicker}
              className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs h-9 gap-1.5"
            >
              <ImageIcon className="size-3.5 text-blue-400" />
              Pilih File
            </Button>
          </div>

          <Button
            type="button"
            onClick={capturePhoto}
            disabled={Boolean(error)}
            className="bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-500 text-xs sm:text-sm h-9 shadow-sm"
          >
            <Camera className="mr-1.5 size-4" />
            Ambil Foto
          </Button>
        </div>
      </div>
    </div>
  )
}
