'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FaceCameraProps {
  onEmbeddingCaptured: (embedding: number[]) => void
  onError?: (error: string) => void
  showBlinkDetection?: boolean // default true
  autoCapture?: boolean // default true — auto-capture when blink detected
}

type CameraState =
  | 'loading-models'
  | 'camera-active'
  | 'detecting-face'
  | 'waiting-for-blink'
  | 'captured'

interface Point {
  x: number
  y: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EAR_BLINK_THRESHOLD = 0.2
const BLINK_DURATION_MAX_MS = 400
const BLINK_DETECTION_WINDOW_S = 5
const MODELS_PATH = '/models'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function euclideanDistance(p1: Point, p2: Point): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2)
}

/**
 * Calculate Eye Aspect Ratio (EAR) from 6 eye landmark points.
 * EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
 * Points are indexed 0-5 corresponding to the 6 landmarks of one eye.
 */
function calculateEAR(eyePoints: Point[]): number {
  if (eyePoints.length < 6) return 1

  const p1 = eyePoints[0]
  const p2 = eyePoints[1]
  const p3 = eyePoints[2]
  const p4 = eyePoints[3]
  const p5 = eyePoints[4]
  const p6 = eyePoints[5]

  const vertical1 = euclideanDistance(p2, p6)
  const vertical2 = euclideanDistance(p3, p5)
  const horizontal = euclideanDistance(p1, p4)

  if (horizontal === 0) return 1

  return (vertical1 + vertical2) / (2 * horizontal)
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FaceCamera({
  onEmbeddingCaptured,
  onError,
  showBlinkDetection = true,
  autoCapture = true,
}: FaceCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const faceapiRef = useRef<typeof import('face-api.js') | null>(null)

  const [cameraState, setCameraState] = useState<CameraState>('loading-models')
  const [statusMessage, setStatusMessage] = useState('Memuat model pengenalan wajah...')
  const [blinkDetected, setBlinkDetected] = useState(false)
  const [blinkTimeRemaining, setBlinkTimeRemaining] = useState(BLINK_DETECTION_WINDOW_S)

  // Blink detection state refs (avoid re-renders during detection loop)
  const blinkStartTimeRef = useRef<number | null>(null)
  const eyeClosedRef = useRef(false)
  const blinkWindowStartRef = useRef<number | null>(null)
  const blinkDetectedRef = useRef(false)
  const capturedRef = useRef(false)

  // ─── Load face-api.js models ─────────────────────────────────────────────

  const loadModels = useCallback(async () => {
    try {
      const faceapi = await import('face-api.js')
      faceapiRef.current = faceapi

      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_PATH),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_PATH),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_PATH),
      ])

      setCameraState('camera-active')
      setStatusMessage('Model dimuat. Mengaktifkan kamera...')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat model face-api.js'
      setStatusMessage(message)
      onError?.(message)
    }
  }, [onError])

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

      setCameraState('detecting-face')
      setStatusMessage('Posisikan wajah Anda dalam bingkai oval')
    } catch (err) {
      const message =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Aktifkan kamera di pengaturan perangkat.'
          : 'Gagal mengakses kamera.'
      setStatusMessage(message)
      onError?.(message)
    }
  }, [onError])

  // ─── Face detection loop ─────────────────────────────────────────────────

  const runDetectionLoop = useCallback(async () => {
    const faceapi = faceapiRef.current
    const video = videoRef.current

    if (!faceapi || !video || video.readyState < 2 || capturedRef.current) {
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop)
      return
    }

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        setCameraState('detecting-face')
        setStatusMessage('Posisikan wajah Anda dalam bingkai oval')
        // Reset blink detection when face lost
        blinkWindowStartRef.current = null
        eyeClosedRef.current = false
        blinkStartTimeRef.current = null
        animationFrameRef.current = requestAnimationFrame(runDetectionLoop)
        return
      }

      // Face detected — handle blink detection if enabled
      if (showBlinkDetection && !blinkDetectedRef.current) {
        setCameraState('waiting-for-blink')

        const landmarks = detection.landmarks
        const positions = landmarks.positions

        // Left eye: landmarks 36-41, Right eye: landmarks 42-47
        const leftEye: Point[] = positions.slice(36, 42).map((p) => ({ x: p.x, y: p.y }))
        const rightEye: Point[] = positions.slice(42, 48).map((p) => ({ x: p.x, y: p.y }))

        const leftEAR = calculateEAR(leftEye)
        const rightEAR = calculateEAR(rightEye)
        const avgEAR = (leftEAR + rightEAR) / 2

        const now = Date.now()

        // Start blink detection window
        if (blinkWindowStartRef.current === null) {
          blinkWindowStartRef.current = now
        }

        // Update time remaining
        const elapsed = (now - blinkWindowStartRef.current) / 1000
        const remaining = Math.max(0, BLINK_DETECTION_WINDOW_S - elapsed)
        setBlinkTimeRemaining(Math.ceil(remaining))

        // Check if window expired
        if (elapsed >= BLINK_DETECTION_WINDOW_S) {
          setStatusMessage('Kedipkan mata Anda secara alami. Mencoba lagi...')
          blinkWindowStartRef.current = now // restart window
          eyeClosedRef.current = false
          blinkStartTimeRef.current = null
          setBlinkTimeRemaining(BLINK_DETECTION_WINDOW_S)
          animationFrameRef.current = requestAnimationFrame(runDetectionLoop)
          return
        }

        // Blink detection state machine
        if (avgEAR < EAR_BLINK_THRESHOLD && !eyeClosedRef.current) {
          // Eyes just closed
          eyeClosedRef.current = true
          blinkStartTimeRef.current = now
          setStatusMessage('Kedipan terdeteksi...')
        } else if (avgEAR >= EAR_BLINK_THRESHOLD && eyeClosedRef.current) {
          // Eyes just opened — check duration
          const blinkDuration = blinkStartTimeRef.current
            ? now - blinkStartTimeRef.current
            : Infinity

          if (blinkDuration <= BLINK_DURATION_MAX_MS) {
            // Valid blink detected!
            blinkDetectedRef.current = true
            setBlinkDetected(true)
            setStatusMessage('Kedipan terverifikasi! Mengambil data wajah...')
          }

          eyeClosedRef.current = false
          blinkStartTimeRef.current = null
        } else {
          setStatusMessage(`Kedipkan mata Anda (${Math.ceil(remaining)}s tersisa)`)
        }
      }

      // Capture embedding when blink verified (or blink detection disabled)
      if (
        (!showBlinkDetection || blinkDetectedRef.current) &&
        autoCapture &&
        !capturedRef.current
      ) {
        capturedRef.current = true
        setCameraState('captured')
        setStatusMessage('Wajah berhasil ditangkap!')

        // Convert Float32Array descriptor to number[]
        const embedding = Array.from(detection.descriptor)
        onEmbeddingCaptured(embedding)
        return // Stop the loop
      }
    } catch {
      // Silently continue on detection errors
    }

    animationFrameRef.current = requestAnimationFrame(runDetectionLoop)
  }, [showBlinkDetection, autoCapture, onEmbeddingCaptured])

  // ─── Lifecycle ───────────────────────────────────────────────────────────

  useEffect(() => {
    loadModels()

    return () => {
      // Cleanup camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      // Cancel animation frame
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [loadModels])

  useEffect(() => {
    if (cameraState === 'camera-active') {
      startCamera()
    }
  }, [cameraState, startCamera])

  useEffect(() => {
    if (cameraState === 'detecting-face' || cameraState === 'waiting-for-blink') {
      animationFrameRef.current = requestAnimationFrame(runDetectionLoop)
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [cameraState, runDetectionLoop])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="relative flex flex-col items-center gap-4">
      {/* Video container with oval guide overlay */}
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

        {/* Face alignment guide — oval frame */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={cn(
              'h-[70%] w-[55%] rounded-[50%] border-[3px] transition-colors duration-300',
              cameraState === 'captured'
                ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.4)]'
                : cameraState === 'waiting-for-blink'
                  ? 'border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                  : 'border-white/60'
            )}
          />
        </div>

        {/* Loading overlay */}
        {cameraState === 'loading-models' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-white/30 border-t-white" />
              <p className="text-xs font-medium text-white/80">Memuat model...</p>
            </div>
          </div>
        )}
      </div>

      {/* Status indicator */}
      <div className="flex w-full max-w-[320px] flex-col items-center gap-2">
        {/* Liveness check status */}
        {showBlinkDetection &&
          cameraState !== 'loading-models' &&
          cameraState !== 'camera-active' && (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold',
                blinkDetected
                  ? 'bg-green-50 text-green-700'
                  : cameraState === 'waiting-for-blink'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-slate-50 text-slate-600'
              )}
            >
              <span
                className={cn(
                  'inline-block h-2 w-2 rounded-full',
                  blinkDetected
                    ? 'bg-green-500'
                    : cameraState === 'waiting-for-blink'
                      ? 'animate-pulse bg-amber-500'
                      : 'bg-slate-400'
                )}
              />
              <span>
                {blinkDetected
                  ? 'Liveness: Terverifikasi ✓'
                  : cameraState === 'waiting-for-blink'
                    ? `Liveness: Kedipkan mata (${blinkTimeRemaining}s)`
                    : 'Liveness: Menunggu deteksi wajah'}
              </span>
            </div>
          )}

        {/* Status message */}
        <p
          className={cn(
            'text-center text-sm font-medium',
            cameraState === 'captured' ? 'text-green-700' : 'text-slate-600'
          )}
        >
          {statusMessage}
        </p>
      </div>
    </div>
  )
}
