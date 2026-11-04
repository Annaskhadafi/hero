'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Camera,
  Play,
  Square,
  Sparkles,
  Zap,
  ZapOff,
  SwitchCamera,
  Volume2,
  VolumeX,
  Gauge,
  MapPin,
  Clock,
  AlertTriangle,
  Settings2,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Map as MapIcon,
  Columns,
  Maximize2,
  X,
  ExternalLink,
  Navigation,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { HeroConfirmDialog } from '@/components/templates'
import { RoadHazardLiveMap } from './road-hazard-live-map'
import { resolveClientUploadUrl } from '@/lib/client-upload-url'

export interface DetectedHazardEvent {
  id: string
  hazardType: 'Potholes' | 'Corragation' | 'Ruts' | 'Other'
  confidence: number
  latitude: number | null
  longitude: number | null
  speedKmh: number | null
  photoUrl: string
  annotatedPhotoUrl?: string | null
  detectionBoxes?: any
  timestamp: string
  isManualSnap: boolean
  notes?: string
}

type ViewMode = 'split' | 'pip' | 'cam' | 'map'

interface RoadHazardCameraViewProps {
  siteId: string | number
  siteName: string
  roadSection: string
  onCompleteTrip: (sessionData: {
    durationSeconds: number
    totalDistanceMeters: number
    events: DetectedHazardEvent[]
  }) => void
}

export function RoadHazardCameraView({
  siteId,
  siteName,
  roadSection,
  onCompleteTrip,
}: RoadHazardCameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Camera state
  const [cameraActive, setCameraActive] = useState(false)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [torchOn, setTorchOn] = useState(false)
  const [hasTorch, setHasTorch] = useState(false)

  // Layout View Mode (Split, PiP, Cam, Map)
  const [viewMode, setViewMode] = useState<ViewMode>('split')

  // Trip recording state
  const [isRecording, setIsRecording] = useState(false)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [events, setEvents] = useState<DetectedHazardEvent[]>([])
  const [confirmStopOpen, setConfirmStopOpen] = useState(false)

  // GPS state & polyline path tracking
  const [currentGps, setCurrentGps] = useState<{
    latitude: number | null
    longitude: number | null
    speedKmh: number | null
    accuracy: number | null
  }>({ latitude: null, longitude: null, speedKmh: null, accuracy: null })
  const [pathCoordinates, setPathCoordinates] = useState<[number, number][]>([])

  // AI settings
  const [scanIntervalMs, setScanIntervalMs] = useState(1800)
  const [confThreshold, setConfThreshold] = useState(0.25)
  const [autoSnapEnabled, setAutoSnapEnabled] = useState(true)
  const [autoSnapThreshold, setAutoSnapThreshold] = useState(0.60)
  const [soundAlert, setSoundAlert] = useState(true)

  // AI live detection feedback
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeAlert, setActiveAlert] = useState<{
    type: string
    conf: number
  } | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [shutterFlash, setShutterFlash] = useState(false)
  const [isSnapping, setIsSnapping] = useState(false)

  // Snapshot Preview Lightbox modal
  const [previewSnapshot, setPreviewSnapshot] = useState<DetectedHazardEvent | null>(null)

  // Audio Context for beep alert
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Screen Wake Lock API (keeps mobile screen awake when placed in vehicle unit)
  useEffect(() => {
    let wakeLockSentinel: any = null
    const requestLock = async () => {
      if (isRecording && typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        try {
          wakeLockSentinel = await (navigator as any).wakeLock.request('screen')
        } catch {
          // ignore wakeLock error
        }
      }
    }
    requestLock()
    return () => {
      if (wakeLockSentinel) wakeLockSentinel.release().catch(() => {})
    }
  }, [isRecording])

  const playAlertSound = useCallback(() => {
    if (!soundAlert) return
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') {
        ctx.resume()
      }
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.18)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
    } catch {
      // Audio playback blocked or unsupported
    }
  }, [soundAlert])

  const triggerHaptic = useCallback(() => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }
    } catch {
      // Haptic unsupported
    }
  }, [])

  // Start Camera
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Kamera tidak didukung di perangkat ini.')
      return
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraActive(true)

      const track = stream.getVideoTracks()[0]
      const capabilities: any = track?.getCapabilities?.() || {}
      setHasTorch(Boolean(capabilities.torch))
    } catch (err) {
      console.error('[road-hazard-camera] Error starting camera:', err)
      toast.error('Gagal mengakses kamera. Pastikan izin kamera aktif.')
      setCameraActive(false)
    }
  }, [facingMode])

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
    setTorchOn(false)
  }, [])

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return
    try {
      const nextTorch = !torchOn
      await (track as any).applyConstraints({
        advanced: [{ torch: nextTorch }],
      })
      setTorchOn(nextTorch)
    } catch {
      toast.error('Senter tidak didukung pada mode kamera ini.')
    }
  }

  // Watch GPS Geolocation & Record Polyline Path
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude

        setCurrentGps({
          latitude: lat,
          longitude: lng,
          speedKmh: speed >= 0 ? speed : 0,
          accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
        })

        // Append to traveled path polyline if valid
        if (lat && lng) {
          setPathCoordinates((prev) => {
            const last = prev[prev.length - 1]
            if (!last || Math.abs(last[0] - lat) > 0.00005 || Math.abs(last[1] - lng) > 0.00005) {
              return [...prev, [lat, lng]]
            }
            return prev
          })
        }
      },
      (err) => {
        console.warn('[road-hazard-gps] Geolocation error:', err.message)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Trip timer
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (isRecording) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [isRecording])

  // Mount camera on load
  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [startCamera, stopCamera])

  // Helper to draw detection boxes on overlay canvas
  const drawDetections = useCallback((detections: any[], videoWidth: number, videoHeight: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = videoWidth
    canvas.height = videoHeight
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    detections.forEach((det) => {
      const type = det.hazard_type || det.class_name
      let color = '#e11d48'
      if (type === 'Corragation') color = '#ea580c'
      if (type === 'Ruts') color = '#eab308'

      let x = 0, y = 0, w = 0, h = 0
      if (Array.isArray(det.box) && det.box.length === 4) {
        x = det.box[0]
        y = det.box[1]
        w = det.box[2] - det.box[0]
        h = det.box[3] - det.box[1]
      } else if (det.box && typeof det.box === 'object') {
        x = det.box.x || 0
        y = det.box.y || 0
        w = det.box.width || det.box.w || 100
        h = det.box.height || det.box.h || 100
      } else {
        x = videoWidth * 0.25
        y = videoHeight * 0.35
        w = videoWidth * 0.5
        h = videoHeight * 0.3
      }

      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, w, h)

      ctx.fillStyle = color
      const labelText = `${type.toUpperCase()} ${Math.round((det.confidence || 0) * 100)}%`
      ctx.font = 'bold 14px sans-serif'
      const textWidth = ctx.measureText(labelText).width
      ctx.fillRect(x, Math.max(0, y - 22), textWidth + 12, 22)

      ctx.fillStyle = '#ffffff'
      ctx.fillText(labelText, x + 6, Math.max(16, y - 6))
    })
  }, [])

  // Analyze single frame via API
  const analyzeFrame = useCallback(
    async (isManualSnap = false): Promise<any> => {
      const video = videoRef.current
      if (!video || !video.videoWidth || !video.videoHeight) return null

      const snapCanvas = document.createElement('canvas')
      snapCanvas.width = isManualSnap ? video.videoWidth : Math.min(video.videoWidth, 800)
      snapCanvas.height = isManualSnap
        ? video.videoHeight
        : Math.round((snapCanvas.width / video.videoWidth) * video.videoHeight)

      const snapCtx = snapCanvas.getContext('2d')
      if (!snapCtx) return null
      snapCtx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height)

      return new Promise((resolve) => {
        snapCanvas.toBlob(
          async (blob) => {
            if (!blob) return resolve(null)

            const formData = new FormData()
            formData.append('file', blob, `hazard-frame-${Date.now()}.jpg`)
            formData.append('conf_threshold', String(confThreshold))
            formData.append('is_snap', isManualSnap ? 'true' : 'false')
            if (currentGps.latitude) formData.append('latitude', String(currentGps.latitude))
            if (currentGps.longitude) formData.append('longitude', String(currentGps.longitude))
            if (currentGps.speedKmh) formData.append('speed', String(currentGps.speedKmh))

            try {
              const res = await fetch('/api/mobile/road-hazard/predict', {
                method: 'POST',
                body: formData,
              })
              if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.error || `HTTP ${res.status}`)
              }
              const data = await res.json()
              resolve(data)
            } catch (err) {
              console.warn('[road-hazard-analyze] Predict request error:', err)
              resolve(null)
            }
          },
          'image/jpeg',
          isManualSnap ? 0.9 : 0.72
        )
      })
    },
    [confThreshold, currentGps]
  )

  // Live Auto-Scan Loop
  useEffect(() => {
    let intervalTimer: NodeJS.Timeout | null = null

    if (cameraActive && isRecording) {
      intervalTimer = setInterval(async () => {
        if (isAnalyzing) return
        setIsAnalyzing(true)

        try {
          const res = await analyzeFrame(false)
          if (res?.success) {
            setLatencyMs(res.latencyMs || null)
            const detections = res.detections || []

            if (videoRef.current) {
              drawDetections(detections, videoRef.current.videoWidth, videoRef.current.videoHeight)
            }

            if (detections.length > 0) {
              const topDet = detections[0]
              setActiveAlert({
                type: topDet.hazard_type || topDet.class_name,
                conf: topDet.confidence,
              })
              playAlertSound()
              triggerHaptic()

              // Auto-snap condition
              if (autoSnapEnabled && topDet.confidence >= autoSnapThreshold) {
                const newEv: DetectedHazardEvent = {
                  id: `auto-${Date.now()}`,
                  hazardType: topDet.hazard_type || 'Potholes',
                  confidence: topDet.confidence,
                  latitude: currentGps.latitude,
                  longitude: currentGps.longitude,
                  speedKmh: currentGps.speedKmh,
                  photoUrl: res.photoUrl || res.annotatedPhotoUrl,
                  annotatedPhotoUrl: res.annotatedPhotoUrl,
                  detectionBoxes: detections,
                  timestamp: new Date().toLocaleTimeString('id-ID'),
                  isManualSnap: false,
                  notes: 'Auto-captured oleh AI Road Hazard',
                }
                setEvents((prev) => [newEv, ...prev])
              }

              setTimeout(() => setActiveAlert(null), 2200)
            } else {
              if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d')
                ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
              }
            }
          }
        } finally {
          setIsAnalyzing(false)
        }
      }, scanIntervalMs)
    } else {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }

    return () => {
      if (intervalTimer) clearInterval(intervalTimer)
    }
  }, [
    cameraActive,
    isRecording,
    scanIntervalMs,
    analyzeFrame,
    drawDetections,
    playAlertSound,
    triggerHaptic,
    autoSnapEnabled,
    autoSnapThreshold,
    currentGps,
    isAnalyzing,
  ])

  // Manual Snap Shoot
  const handleSnapShoot = async () => {
    if (isSnapping) return
    setIsSnapping(true)
    setShutterFlash(true)
    setTimeout(() => setShutterFlash(false), 200)
    triggerHaptic()

    try {
      const res = await analyzeFrame(true)
      if (res?.success) {
        const topDet = res.detections?.[0]
        const hazardType = topDet?.hazard_type || 'Potholes'
        const conf = topDet?.confidence || 0.85

        const newEv: DetectedHazardEvent = {
          id: `snap-${Date.now()}`,
          hazardType,
          confidence: conf,
          latitude: currentGps.latitude,
          longitude: currentGps.longitude,
          speedKmh: currentGps.speedKmh,
          photoUrl: res.photoUrl || res.annotatedPhotoUrl,
          annotatedPhotoUrl: res.annotatedPhotoUrl,
          detectionBoxes: res.detections,
          timestamp: new Date().toLocaleTimeString('id-ID'),
          isManualSnap: true,
          notes: 'Snapshot manual petugas',
        }

        setEvents((prev) => [newEv, ...prev])
        toast.success(`Snapshot #${events.length + 1} tersimpan! (${hazardType} ${Math.round(conf * 100)}%)`)
      } else {
        toast.info('Snapshot tersimpan.')
      }
    } catch {
      toast.error('Gagal mengambil snapshot.')
    } finally {
      setIsSnapping(false)
    }
  }

  // Format Timer HH:MM:SS
  const formatTimer = (sec: number) => {
    const hrs = Math.floor(sec / 3600)
    const mins = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  // Finish Trip
  const handleFinishTrip = () => {
    setIsRecording(false)
    stopCamera()

    const estimatedDistanceMeters = Math.round(
      ((currentGps.speedKmh || 20) * 1000 * elapsedSeconds) / 3600
    )

    onCompleteTrip({
      durationSeconds: elapsedSeconds,
      totalDistanceMeters: estimatedDistanceMeters,
      events,
    })
  }

  const currentLat = currentGps.latitude ?? -1.202291
  const currentLng = currentGps.longitude ?? 116.868041

  return (
    <div className="relative flex h-[calc(100dvh-135px)] w-full flex-col overflow-hidden rounded-2xl bg-slate-950 shadow-2xl">
      {/* Shutter Flash Animation */}
      {shutterFlash && <div className="absolute inset-0 z-50 bg-white transition-opacity duration-200 pointer-events-none" />}

      {/* Main Dual Area (Camera + Live Map) */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-black">
        {/* Layout Mode: Split (Camera Top, Live Map Bottom) */}
        {viewMode === 'split' && (
          <div className="flex size-full flex-col">
            {/* Top 52%: Camera Video */}
            <div className="relative h-[52%] w-full overflow-hidden bg-black border-b border-white/10">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="size-full object-cover"
              />
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute inset-0 size-full object-cover"
              />
            </div>

            {/* Bottom 48%: Live Interactive OpenStreetMap */}
            <div className="relative h-[48%] w-full overflow-hidden bg-slate-900">
              <RoadHazardLiveMap
                currentLat={currentLat}
                currentLng={currentLng}
                pathCoordinates={pathCoordinates}
                snapshots={events}
                onSelectSnapshot={setPreviewSnapshot}
                className="size-full"
              />

              {/* Floating Map Label Badge */}
              <div className="pointer-events-none absolute bottom-2 left-2 z-[400] flex items-center gap-1 rounded-md bg-slate-950/80 px-2 py-0.5 text-[9px] font-bold text-cyan-300 backdrop-blur-sm border border-cyan-500/20">
                <Navigation className="size-2.5 animate-pulse" />
                <span>Live Route Map • {events.length} Snap Pin</span>
              </div>
            </div>
          </div>
        )}

        {/* Layout Mode: PiP (Camera Fullscreen + Floating Mini Map) */}
        {viewMode === 'pip' && (
          <div className="relative size-full overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="size-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute inset-0 size-full object-cover"
            />

            {/* Floating Picture-in-Picture Mini Map Widget */}
            <div className="absolute bottom-24 right-3 z-30 h-36 w-44 overflow-hidden rounded-xl border-2 border-cyan-400/80 shadow-2xl bg-slate-900 transition-all hover:scale-105">
              <RoadHazardLiveMap
                currentLat={currentLat}
                currentLng={currentLng}
                pathCoordinates={pathCoordinates}
                snapshots={events}
                className="size-full"
              />
              <div className="pointer-events-none absolute top-1 left-1 z-[400] rounded bg-black/70 px-1 py-0.5 text-[8px] font-black text-cyan-300">
                WIDGET MAPS
              </div>
            </div>
          </div>
        )}

        {/* Layout Mode: Camera Only */}
        {viewMode === 'cam' && (
          <div className="relative size-full overflow-hidden bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="size-full object-cover"
            />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute inset-0 size-full object-cover"
            />
          </div>
        )}

        {/* Layout Mode: Full Map Only */}
        {viewMode === 'map' && (
          <div className="relative size-full overflow-hidden bg-slate-900">
            <RoadHazardLiveMap
              currentLat={currentLat}
              currentLng={currentLng}
              pathCoordinates={pathCoordinates}
              snapshots={events}
              onSelectSnapshot={setPreviewSnapshot}
              className="size-full"
            />
          </div>
        )}

        {/* Top HUD Overlay (Always Visible on Top of Video/Map) */}
        <div className="absolute left-3 right-3 top-3 z-30 flex items-start justify-between gap-2 pointer-events-none">
          {/* Site, Section & Speedometer Pill */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 rounded-full bg-slate-900/85 px-3 py-1 backdrop-blur-md border border-white/10 shadow">
              <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-black tracking-wide text-white uppercase">{siteName}</span>
              <span className="text-white/40">•</span>
              <span className="text-[11px] font-medium text-slate-300 truncate max-w-[110px]">
                {roadSection || 'Hauling Road'}
              </span>
            </div>

            {/* GPS & Speedometer */}
            <div className="flex items-center gap-2 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-sm border border-white/10">
              <div className="flex items-center gap-1 text-cyan-400 font-mono">
                <Gauge className="size-3.5" />
                <span className="text-xs font-black">{currentGps.speedKmh ?? 0}</span>
                <span className="text-[9px]">km/h</span>
              </div>
              <span className="text-white/20">|</span>
              <div className="flex items-center gap-1 text-emerald-400">
                <MapPin className="size-3.5" />
                <span>{currentGps.accuracy ? `±${currentGps.accuracy}m` : 'GPS OK'}</span>
              </div>
            </div>
          </div>

          {/* AI Status & Recording Timer */}
          <div className="flex flex-col items-end gap-1">
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-bold shadow backdrop-blur-md border ${
                isRecording
                  ? 'bg-rose-950/80 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-slate-900/80 text-slate-400 border-white/10'
              }`}
            >
              <Clock className="size-3.5" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            {isRecording && (
              <div className="flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                <Sparkles className="size-3 text-amber-400" />
                <span>AI Live {latencyMs ? `${latencyMs}ms` : 'Ready'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Hazard Alert Banner Notification */}
        {activeAlert && (
          <div className="absolute left-4 right-4 top-20 z-40 animate-in fade-in slide-in-from-top-4 duration-200">
            <div
              className={`flex items-center justify-between rounded-xl px-4 py-2.5 shadow-2xl backdrop-blur-md border ${
                activeAlert.type === 'Potholes'
                  ? 'bg-rose-600/90 text-white border-rose-400'
                  : activeAlert.type === 'Corragation'
                  ? 'bg-amber-600/90 text-white border-amber-400'
                  : 'bg-yellow-600/90 text-white border-yellow-400'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="size-5 shrink-0 animate-bounce" />
                <div>
                  <p className="text-xs font-black uppercase tracking-wider">
                    {activeAlert.type} TERDETEKSI!
                  </p>
                  <p className="text-[11px] font-semibold text-white/85">
                    Keyakinan AI: {Math.round(activeAlert.conf * 100)}%
                  </p>
                </div>
              </div>
              <ShieldAlert className="size-6 text-white/50" />
            </div>
          </div>
        )}

        {/* Floating Layout Mode Switcher (Top Right Toolbar) */}
        <div className="absolute top-16 right-3 z-30 flex items-center gap-1 rounded-xl bg-slate-950/80 p-1 backdrop-blur-md border border-white/15">
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`flex size-7 items-center justify-center rounded-lg text-white transition-all ${
              viewMode === 'split' ? 'bg-cyan-500 text-slate-950 font-bold' : 'hover:bg-white/10'
            }`}
            title="Split Mode (Kamera + Peta)"
          >
            <Columns className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('pip')}
            className={`flex size-7 items-center justify-center rounded-lg text-white transition-all ${
              viewMode === 'pip' ? 'bg-cyan-500 text-slate-950 font-bold' : 'hover:bg-white/10'
            }`}
            title="PiP Mode (Widget Peta Mengambang)"
          >
            <Maximize2 className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cam')}
            className={`flex size-7 items-center justify-center rounded-lg text-white transition-all ${
              viewMode === 'cam' ? 'bg-cyan-500 text-slate-950 font-bold' : 'hover:bg-white/10'
            }`}
            title="Kamera Penuh"
          >
            <Camera className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`flex size-7 items-center justify-center rounded-lg text-white transition-all ${
              viewMode === 'map' ? 'bg-cyan-500 text-slate-950 font-bold' : 'hover:bg-white/10'
            }`}
            title="Peta Penuh"
          >
            <MapIcon className="size-3.5" />
          </button>
        </div>

        {/* Quick Toolbar (Torch, Camera Switch, Sound, Settings) */}
        <div className="absolute top-26 right-3 z-30 flex flex-col items-center gap-1.5 pt-1">
          {hasTorch && (
            <Button
              size="icon"
              variant="outline"
              onClick={toggleTorch}
              className={`size-8 rounded-full border-white/20 bg-slate-900/80 text-white backdrop-blur-md ${
                torchOn ? 'bg-amber-500 text-slate-950 border-amber-400' : ''
              }`}
              title="Senter"
            >
              {torchOn ? <Zap className="size-3.5" /> : <ZapOff className="size-3.5" />}
            </Button>
          )}

          <Button
            size="icon"
            variant="outline"
            onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
            className="size-8 rounded-full border-white/20 bg-slate-900/80 text-white backdrop-blur-md"
            title="Ganti Kamera"
          >
            <SwitchCamera className="size-3.5" />
          </Button>

          <Button
            size="icon"
            variant="outline"
            onClick={() => setSoundAlert((prev) => !prev)}
            className="size-8 rounded-full border-white/20 bg-slate-900/80 text-white backdrop-blur-md"
            title={soundAlert ? 'Suara Aktif' : 'Suara Mati'}
          >
            {soundAlert ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          </Button>

          {/* Settings Drawer */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="size-8 rounded-full border-white/20 bg-slate-900/80 text-white backdrop-blur-md"
              >
                <Settings2 className="size-3.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl bg-slate-900 text-white border-white/10">
              <SheetHeader>
                <SheetTitle className="text-white text-base font-bold">Pengaturan AI Road Hazard</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 py-4 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-200">Auto-Snap Kendala</p>
                    <p className="text-[11px] text-slate-400">Ambil foto otomatis saat AI mendeteksi bahaya</p>
                  </div>
                  <Switch checked={autoSnapEnabled} onCheckedChange={setAutoSnapEnabled} />
                </div>

                {autoSnapEnabled && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-slate-300">
                      <span>Ambang Batas Auto-Snap</span>
                      <span className="font-bold text-cyan-400">{Math.round(autoSnapThreshold * 100)}%</span>
                    </div>
                    <Slider
                      value={[autoSnapThreshold]}
                      min={0.3}
                      max={0.9}
                      step={0.05}
                      onValueChange={(val) => setAutoSnapThreshold(val[0])}
                    />
                  </div>
                )}

                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-slate-300">
                    <span>Frekuensi Live Scan</span>
                    <span className="font-bold text-amber-400">{(scanIntervalMs / 1000).toFixed(1)}s</span>
                  </div>
                  <Slider
                    value={[scanIntervalMs]}
                    min={1000}
                    max={4000}
                    step={200}
                    onValueChange={(val) => setScanIntervalMs(val[0])}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Snapshot Filmstrip / Mini-Reel (Tanda Snapshot Hasilnya) */}
        {events.length > 0 && (
          <div className="absolute bottom-1 left-2 right-2 z-30">
            <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl bg-slate-950/85 p-1.5 backdrop-blur-md border border-white/15 scrollbar-thin">
              <div className="flex items-center gap-1 px-2 text-[10px] font-black text-cyan-300 shrink-0">
                <Camera className="size-3" />
                <span>{events.length} SNAP</span>
              </div>
              {events.slice(0, 10).map((ev) => {
                const imgUrl = resolveClientUploadUrl(ev.annotatedPhotoUrl || ev.photoUrl)
                const badgeColor =
                  ev.hazardType === 'Potholes'
                    ? 'border-rose-500'
                    : ev.hazardType === 'Corragation'
                    ? 'border-amber-500'
                    : 'border-yellow-500'

                return (
                  <div
                    key={ev.id}
                    onClick={() => setPreviewSnapshot(ev)}
                    className={`relative size-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 ${badgeColor} bg-black active:scale-95 transition-transform shadow`}
                  >
                    {imgUrl ? (
                      <img src={imgUrl} alt={ev.hazardType} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-[9px] text-white">
                        {ev.hazardType[0]}
                      </div>
                    )}
                    <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-black text-center text-white truncate">
                      {Math.round(ev.confidence * 100)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Main Controls Bar */}
      <div className="flex items-center justify-between gap-3 bg-slate-950 px-5 py-3 border-t border-white/10">
        {!isRecording ? (
          <Button
            type="button"
            onClick={() => setIsRecording(true)}
            className="h-11 flex-1 gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-sm text-white shadow-lg shadow-emerald-900/40"
          >
            <Play className="size-5 fill-white" />
            <span>Mulai Rekam Trip Unit</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirmStopOpen(true)}
            className="h-11 flex-1 gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-sm text-white shadow-lg shadow-rose-900/40"
          >
            <Square className="size-4 fill-white" />
            <span>Selesaikan ({events.length} Snap)</span>
          </Button>
        )}

        {/* Big Prominent Snap Shoot Button */}
        <button
          type="button"
          disabled={!cameraActive || isSnapping}
          onClick={handleSnapShoot}
          className="relative flex size-13 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 p-1 shadow-lg shadow-cyan-500/30 transition-transform active:scale-95 disabled:opacity-50"
          title="Ambil Foto Kendala Sekarang"
        >
          <div className="flex size-full items-center justify-center rounded-full border-2 border-white bg-slate-900">
            {isSnapping ? (
              <Loader2 className="size-6 animate-spin text-cyan-400" />
            ) : (
              <Camera className="size-6 text-white" />
            )}
          </div>
        </button>
      </div>

      {/* Snapshot Preview Lightbox Dialog */}
      {previewSnapshot && (
        <Dialog open={Boolean(previewSnapshot)} onOpenChange={() => setPreviewSnapshot(null)}>
          <DialogContent className="max-w-md rounded-2xl bg-slate-900 text-white border-white/10 p-4">
            <DialogHeader className="flex flex-row items-center justify-between">
              <div>
                <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                      previewSnapshot.hazardType === 'Potholes'
                        ? 'bg-rose-500 text-white'
                        : previewSnapshot.hazardType === 'Corragation'
                        ? 'bg-amber-500 text-white'
                        : 'bg-yellow-500 text-slate-950'
                    }`}
                  >
                    {previewSnapshot.hazardType}
                  </span>
                  <span>Akurasi AI {Math.round(previewSnapshot.confidence * 100)}%</span>
                </DialogTitle>
                <p className="text-[10px] text-slate-400 mt-1">
                  Waktu: {previewSnapshot.timestamp} •{' '}
                  {previewSnapshot.isManualSnap ? 'Manual Snap' : 'Auto Detection'}
                </p>
              </div>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <div className="overflow-hidden rounded-xl bg-black border border-white/10">
                <img
                  src={resolveClientUploadUrl(
                    previewSnapshot.annotatedPhotoUrl || previewSnapshot.photoUrl
                  )}
                  alt="Snapshot"
                  className="size-full object-cover max-h-[260px]"
                />
              </div>

              {previewSnapshot.latitude && previewSnapshot.longitude && (
                <div className="flex items-center justify-between rounded-lg bg-black/40 p-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                    <MapPin className="size-3.5 text-emerald-400" />
                    <span>
                      {Number(previewSnapshot.latitude).toFixed(5)},{' '}
                      {Number(previewSnapshot.longitude).toFixed(5)}
                    </span>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${previewSnapshot.latitude},${previewSnapshot.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:underline"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Modal to finish trip and view recap */}
      <HeroConfirmDialog
        open={confirmStopOpen}
        onOpenChange={setConfirmStopOpen}
        title="Selesaikan Sesi Rekaman Trip?"
        description={`Anda telah mencatat ${events.length} kendala jalan selama ${formatTimer(
          elapsedSeconds
        )}. Rekapitulasi lengkap akan disajikan untuk peninjauan dan ekspor PDF.`}
        confirmLabel="Ya, Lihat Rekapitulasi"
        cancelLabel="Lanjut Rekam"
        tone="primary"
        onConfirm={handleFinishTrip}
      />
    </div>
  )
}
