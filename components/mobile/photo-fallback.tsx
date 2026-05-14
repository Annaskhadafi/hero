'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhotoFallbackProps {
  employeeId: number
  siteId: number
  eventType: 'checked-in' | 'checked-out'
  latitude: number
  longitude: number
  onSuccess: (record: { id: number; eventType: string; eventTime: string }) => void
  onError?: (error: string) => void
}

type FallbackState = 'camera-active' | 'capturing' | 'uploading' | 'success' | 'error'

const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5MB

// ─── Component ───────────────────────────────────────────────────────────────

export function PhotoFallback({
  employeeId,
  siteId,
  eventType,
  latitude,
  longitude,
  onSuccess,
  onError,
}: PhotoFallbackProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [state, setState] = useState<FallbackState>('camera-active')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null)
  const [showFlash, setShowFlash] = useState(false)

  // ─── Start camera ────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setState('camera-active')
    } catch (err) {
      const message =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Aktifkan kamera di pengaturan perangkat.'
          : 'Gagal mengakses kamera.'
      setErrorMessage(message)
      setState('error')
      onError?.(message)
    }
  }, [onError])

  // ─── Stop camera ─────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  // ─── Capture photo ───────────────────────────────────────────────────────

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) return

    setState('capturing')

    // Draw video frame to canvas
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setErrorMessage('Gagal mengambil foto.')
      setState('error')
      return
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Flash effect
    setShowFlash(true)
    setTimeout(() => setShowFlash(false), 150)

    // Convert to JPEG blob (quality 0.8)
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setErrorMessage('Gagal mengkonversi foto.')
          setState('error')
          return
        }

        // Validate file size (max 5MB)
        if (blob.size > MAX_PHOTO_SIZE) {
          const message = 'Ukuran foto melebihi 5MB. Coba lagi dengan pencahayaan yang lebih baik.'
          setErrorMessage(message)
          setState('error')
          onError?.(message)
          return
        }

        // Show captured preview
        const imageUrl = URL.createObjectURL(blob)
        setCapturedImageUrl(imageUrl)

        // Stop camera after capture
        stopCamera()

        // Upload
        await uploadPhoto(blob)
      },
      'image/jpeg',
      0.8
    )
  }, [stopCamera, onError])

  // ─── Upload photo ────────────────────────────────────────────────────────

  const uploadPhoto = async (blob: Blob) => {
    setState('uploading')

    try {
      const clientRequestId = crypto.randomUUID()

      const formData = new FormData()
      formData.append('employeeId', employeeId.toString())
      formData.append('siteId', siteId.toString())
      formData.append('eventType', eventType)
      formData.append('photo', blob, `fallback-${clientRequestId}.jpg`)
      formData.append('latitude', latitude.toString())
      formData.append('longitude', longitude.toString())
      formData.append('confidenceScore', '0')
      formData.append('deviceType', 'mobile')
      formData.append('clientRequestId', clientRequestId)
      formData.append('source', 'photo-fallback')

      const response = await fetch('/api/mobile/face-attendance', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_MOBILE_API_KEY || ''}`,
        },
        body: formData,
        signal: abortControllerRef.current?.signal,
      })

      const data = await response.json()

      if (!response.ok) {
        const message = data?.error?.message || 'Gagal mengunggah foto absensi.'
        setErrorMessage(message)
        setState('error')
        onError?.(message)
        return
      }

      setState('success')
      onSuccess({
        id: data.record.id,
        eventType: data.record.eventType,
        eventTime: data.record.eventTime,
      })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return // suppress on unmount
      const message = err instanceof Error ? err.message : 'Gagal mengunggah foto absensi.'
      setErrorMessage(message)
      setState('error')
      onError?.(message)
    }
  }

  // ─── Retry ───────────────────────────────────────────────────────────────

  const handleRetry = useCallback(() => {
    setErrorMessage('')
    setCapturedImageUrl(null)
    setState('camera-active')
    startCamera()
  }, [startCamera])

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  useEffect(() => {
    abortControllerRef.current = new AbortController()
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    startCamera()

    return () => {
      stopCamera()
    }
  }, [startCamera, stopCamera])

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl)
      }
    }
  }, [capturedImageUrl])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="size-5" />
          Foto Manual
        </CardTitle>
        <p className="text-muted-foreground text-sm">
          Pengenalan wajah gagal. Ambil foto sebagai bukti kehadiran.
        </p>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-4">
        {/* Camera preview / captured image */}
        {state !== 'success' && (
          <div className="relative aspect-[3/4] w-full max-w-[280px] overflow-hidden rounded-xl bg-black">
            {(state === 'camera-active' || state === 'capturing') && !capturedImageUrl && (
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
                autoPlay
                aria-label="Pratinjau kamera foto fallback"
              />
            )}

            {/* Flash effect overlay */}
            <div
              className="pointer-events-none absolute inset-0 bg-white transition-opacity duration-150"
              style={{ opacity: showFlash ? 1 : 0 }}
            />

            {capturedImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={capturedImageUrl}
                alt="Foto yang diambil"
                className="h-full w-full object-cover"
              />
            )}

            {/* Uploading overlay */}
            {state === 'uploading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="size-8 animate-spin text-white" />
                  <p className="text-xs font-medium text-white/80">Mengunggah...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Success state */}
        {state === 'success' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="size-8 text-green-600" />
            </div>
            <p className="text-center text-sm font-medium text-green-700">
              Absensi tercatat (menunggu review admin)
            </p>
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
              <AlertCircle className="size-4 shrink-0 text-red-600" />
              <p className="text-xs text-red-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex w-full flex-col gap-2">
          {state === 'camera-active' && (
            <Button onClick={capturePhoto} className="w-full">
              <Camera className="size-4" />
              Ambil Foto
            </Button>
          )}

          {state === 'error' && (
            <Button onClick={handleRetry} variant="outline" className="w-full">
              Coba Lagi
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
