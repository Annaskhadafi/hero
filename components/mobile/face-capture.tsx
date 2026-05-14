'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useFaceModels } from '@/hooks/use-face-models'
import { useBlinkDetector } from '@/hooks/use-blink-detector'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FaceCaptureProps {
  mode: 'registration' | 'verification'
  onEmbeddingCaptured: (embedding: number[]) => void
  onError?: (error: string) => void
  onFallbackTriggered?: () => void
}

type CaptureState =
  | 'loading-models'
  | 'requesting-camera'
  | 'detecting-face'
  | 'waiting-for-blink'
  | 'captured'
  | 'error'

// ─── Constants ───────────────────────────────────────────────────────────────

const NO_FACE_TIMEOUT_MS = 15_000
const MAX_CONSECUTIVE_FAILURES = 3
const MULTIPLE_FACES_WARNING_DEBOUNCE_MS = 2000
const DETECTION_INTERVAL_MS = 100 // ~10fps

// ─── Component ───────────────────────────────────────────────────────────────

export function FaceCapture({
  mode,
  onEmbeddingCaptured,
  onError,
  onFallbackTriggered,
}: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const faceapiRef = useRef<typeof import('face-api.js') | null>(null)

  const [captureState, setCaptureState] = useState<CaptureState>('requesting-camera')
  const [statusMessage, setStatusMessage] = useState('Mengaktifkan kamera...')
  const [multipleFacesWarning, setMultipleFacesWarning] = useState(false)

  // Fallback tracking refs
  const consecutiveFailuresRef = useRef(0)
  const noFaceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const noFaceStartRef = useRef<number | null>(null)
  const capturedRef = useRef(false)
  const multipleFacesTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastDetectionRef = useRef<number>(0)

  // Hooks
  const { isLoaded, isLoading, error: modelError, progress, retry: retryModels } = useFaceModels()
  const blinkDetector = useBlinkDetector()
  const cameraRetryRef = useRef(0)
  const MAX_CAMERA_RETRIES = 3

  // ─── Camera setup ──────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    setCaptureState('requesting-camera')
    setStatusMessage('Mengaktifkan kamera...')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })

      streamRef.current = stream
      cameraRetryRef.current = 0

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setCaptureState('detecting-face')
      setStatusMessage('Posisikan wajah Anda dalam bingkai oval')
      blinkDetector.startDetection()

      // Start no-face timer for verification mode
      if (mode === 'verification') {
        noFaceStartRef.current = Date.now()
      }
    } catch (err) {
      // Auto-retry: camera might be locked by previous page
      if (cameraRetryRef.current < MAX_CAMERA_RETRIES) {
        cameraRetryRef.current += 1
        setStatusMessage(
          `Menunggu kamera tersedia... (${cameraRetryRef.current}/${MAX_CAMERA_RETRIES})`
        )
        await new Promise((r) => setTimeout(r, 1500))
        return startCamera()
      }

      let message = 'Gagal mengakses kamera.'
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          message = 'Izin kamera ditolak. Aktifkan kamera di pengaturan perangkat.'
        } else if (err.name === 'NotReadableError') {
          message = 'Kamera sedang digunakan oleh aplikasi lain.'
        } else if (err.name === 'OverconstrainedError') {
          message = 'Kamera depan tidak tersedia di perangkat ini.'
        } else if (err.name === 'NotFoundError') {
          message = 'Tidak ada kamera yang ditemukan di perangkat ini.'
        }
      }
      setCaptureState('error')
      setStatusMessage(message)
      onError?.(message)
    }
  }, [mode, onError, blinkDetector])

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (noFaceTimerRef.current) {
      clearTimeout(noFaceTimerRef.current)
      noFaceTimerRef.current = null
    }
    if (multipleFacesTimeoutRef.current) {
      clearTimeout(multipleFacesTimeoutRef.current)
      multipleFacesTimeoutRef.current = null
    }
    blinkDetector.stopDetection()
  }, [blinkDetector])

  // ─── Fallback trigger ──────────────────────────────────────────────────────

  const triggerFallback = useCallback(() => {
    if (mode === 'verification' && onFallbackTriggered) {
      stopCamera()
      onFallbackTriggered()
    }
  }, [mode, onFallbackTriggered, stopCamera])

  // ─── Face detection loop ───────────────────────────────────────────────────

  const runDetectionLoop = useCallback(async () => {
    const faceapi = faceapiRef.current
    const video = videoRef.current

    if (!faceapi || !video || video.readyState < 2 || capturedRef.current) {
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop)
      return
    }

    // Throttle to ~10fps
    const now = Date.now()
    if (now - lastDetectionRef.current < DETECTION_INTERVAL_MS) {
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop)
      return
    }
    lastDetectionRef.current = now

    try {
      // Detect all faces to check for multiple faces
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptors()

      // Multiple faces warning
      if (detections.length > 1) {
        if (!multipleFacesWarning) {
          setMultipleFacesWarning(true)
          setStatusMessage('Hanya satu wajah yang boleh terlihat')
          // Auto-clear warning after debounce
          if (multipleFacesTimeoutRef.current) clearTimeout(multipleFacesTimeoutRef.current)
          multipleFacesTimeoutRef.current = setTimeout(() => {
            setMultipleFacesWarning(false)
          }, MULTIPLE_FACES_WARNING_DEBOUNCE_MS)
        }
        animationFrameRef.current = requestAnimationFrame(runDetectionLoop)
        return
      }

      const detection = detections[0] || null

      if (!detection) {
        // No face detected
        setStatusMessage('Posisikan wajah Anda dalam bingkai oval')
        setMultipleFacesWarning(false)

        // Track no-face duration for verification fallback
        if (mode === 'verification' && noFaceStartRef.current) {
          const elapsed = Date.now() - noFaceStartRef.current
          if (elapsed >= NO_FACE_TIMEOUT_MS) {
            triggerFallback()
            return
          }
        } else if (mode === 'verification') {
          noFaceStartRef.current = Date.now()
        }

        animationFrameRef.current = requestAnimationFrame(runDetectionLoop)
        return
      }

      // Face detected — reset no-face timer
      noFaceStartRef.current = null
      setMultipleFacesWarning(false)

      // Pass landmarks to blink detector
      const landmarks = detection.landmarks.positions
      const landmarkPoints = landmarks.map((p: { x: number; y: number }) => ({
        x: p.x,
        y: p.y,
      }))
      blinkDetector.processLandmarks(landmarkPoints)

      // Update state based on blink detection
      if (!blinkDetector.isLivenessConfirmed) {
        setCaptureState('waiting-for-blink')
        if (blinkDetector.status === 'timeout') {
          setStatusMessage('Kedipkan mata Anda secara alami')
          // Restart blink detection
          blinkDetector.startDetection()
        } else {
          setStatusMessage('Kedipkan mata Anda secara alami')
        }
      }

      // If blink confirmed → extract embedding
      if (blinkDetector.isLivenessConfirmed && !capturedRef.current) {
        capturedRef.current = true
        setCaptureState('captured')
        setStatusMessage('Wajah berhasil ditangkap!')

        const embedding = Array.from(detection.descriptor)
        onEmbeddingCaptured(embedding)

        // Stop camera after successful capture
        stopCamera()
        return
      }
    } catch {
      // Silently continue on detection errors — increment failure count for verification
      if (mode === 'verification') {
        consecutiveFailuresRef.current += 1
        if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
          triggerFallback()
          return
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(runDetectionLoop)
  }, [blinkDetector, mode, multipleFacesWarning, onEmbeddingCaptured, stopCamera, triggerFallback])

  // ─── Model loading effect ──────────────────────────────────────────────────

  useEffect(() => {
    // Start camera immediately (don't wait for model)
    startCamera()
  }, [startCamera])

  useEffect(() => {
    if (isLoaded) {
      // Load faceapi reference for detection loop (camera already running)
      import('face-api.js').then((faceapi) => {
        faceapiRef.current = faceapi
      })
    }
  }, [isLoaded])

  // ─── Model error handling ──────────────────────────────────────────────────

  useEffect(() => {
    if (modelError) {
      setCaptureState('error')
      setStatusMessage(modelError)
      onError?.(modelError)
    }
  }, [modelError, onError])

  // ─── Detection loop lifecycle ──────────────────────────────────────────────

  useEffect(() => {
    if (captureState === 'detecting-face' || captureState === 'waiting-for-blink') {
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop)
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [captureState, runDetectionLoop])

  // ─── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* Model loading indicator (shown as small overlay, not blocking) */}
      {isLoading && captureState !== 'error' && (
        <div className="absolute top-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur-sm">
          Model loading... {progress}%
        </div>
      )}

      {/* Error state with retry */}
      {captureState === 'error' && (
        <div className="flex w-full max-w-[320px] flex-col items-center gap-3 py-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <svg
              className="h-6 w-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <p className="text-center text-sm font-medium text-red-700">{statusMessage}</p>
          <button
            onClick={() => {
              setCaptureState('loading-models')
              setStatusMessage('Memuat model pengenalan wajah...')
              retryModels()
            }}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Camera view — always show when not in error state */}
      {captureState !== 'error' && (
        <>
          <div className="relative aspect-[3/4] w-full max-w-[320px] overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
              autoPlay
              aria-label="Pratinjau kamera wajah"
            />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

            {/* Face alignment oval overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className={cn(
                  'h-[70%] w-[55%] rounded-[50%] border-[3px] transition-colors duration-300',
                  captureState === 'captured'
                    ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.4)]'
                    : captureState === 'waiting-for-blink'
                      ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                      : 'border-white/60'
                )}
              />
            </div>

            {/* Multiple faces warning overlay */}
            {multipleFacesWarning && (
              <div className="absolute inset-x-0 top-4 flex justify-center">
                <div className="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                  ⚠️ Hanya satu wajah yang boleh terlihat
                </div>
              </div>
            )}

            {/* Captured success overlay */}
            {captureState === 'captured' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 shadow-lg">
                  <svg
                    className="h-8 w-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Status and guidance */}
          <div className="flex w-full max-w-[320px] flex-col items-center gap-2">
            {/* Liveness check indicator */}
            {(captureState === 'detecting-face' || captureState === 'waiting-for-blink') && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold',
                  blinkDetector.isLivenessConfirmed
                    ? 'bg-green-50 text-green-700'
                    : captureState === 'waiting-for-blink'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-slate-50 text-slate-600'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-2 w-2 rounded-full',
                    blinkDetector.isLivenessConfirmed
                      ? 'bg-green-500'
                      : captureState === 'waiting-for-blink'
                        ? 'animate-pulse bg-amber-500'
                        : 'bg-slate-400'
                  )}
                />
                <span>
                  {blinkDetector.isLivenessConfirmed
                    ? 'Liveness: Terverifikasi ✓'
                    : 'Liveness: Kedipkan mata secara alami'}
                </span>
              </div>
            )}

            {/* Status message */}
            <p
              className={cn(
                'text-center text-sm font-medium',
                captureState === 'captured'
                  ? 'text-green-700'
                  : multipleFacesWarning
                    ? 'text-red-600'
                    : 'text-slate-600'
              )}
            >
              {statusMessage}
            </p>

            {/* Mode indicator */}
            <p className="text-xs text-slate-400">
              Mode: {mode === 'registration' ? 'Registrasi' : 'Verifikasi'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
