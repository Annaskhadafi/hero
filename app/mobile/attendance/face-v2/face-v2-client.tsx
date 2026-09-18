'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogIn,
  LogOut,
  ScanFace,
  RefreshCw,
  Zap,
  MapPin,
  Clock,
  Clock3,
  UserCheck,
  History,
  Upload,
  Wifi,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type FlowState =
  | 'idle'
  | 'camera-loading'
  | 'scanning'
  | 'verifying'
  | 'manual-capture'
  | 'success'
  | 'failed'
  | 'not-registered'
  | 'error'

type EventType = 'checked-in' | 'checked-out' | 'auto'

type GpsPosition = {
  latitude: number
  longitude: number
  accuracy: number
  locationName?: string
}

export interface ShiftOption {
  value: string
  label: string
  window: string
  helper?: string
}

export interface TodayLog {
  id: number
  eventType: string
  eventTime: Date | string
  status: string
  locationNote?: string | null
  punctualityNote?: string | null
}

export interface MobileRosterDay {
  date: string
  code: string
  fieldBreak: boolean
}

interface Props {
  employeeId: number
  employeeName: string
  employeeSn?: string
  siteId: number
  siteName?: string
  faceRarayId: string | null
  faceRarayRegisteredAt: string | null
  suggestedEventType: 'checked-in' | 'checked-out'
  lastEventType: string | null
  lastEventTime: string | null
  shiftOptions?: ShiftOption[]
  todayLogs?: TodayLog[]
  rosterCalendar?: { days: MobileRosterDay[]; timezone: string }
}

const MAX_AUTO_RETRY = 8
const CAPTURE_INTERVAL = 1000
const GPS_TIMEOUT = 15000

function formatClock(date: Date) {
  const h24 = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const isPm = h24 >= 12
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  const suffix = isPm ? 'PM' : 'AM'
  return `${String(h12).padStart(2, '0')}:${minutes}:${seconds} ${suffix}`
}

function formatDate(date: Date) {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getEventLabel(type: string) {
  switch (type) {
    case 'checked-in':
      return 'Check In'
    case 'checked-out':
      return 'Check Out'
    case 'overtime-in':
      return 'Lembur Masuk'
    case 'overtime-out':
      return 'Lembur Selesai'
    default:
      return type
  }
}

function playSuccessSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext
    if (!AudioContextClass) return
    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(523.25, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1)
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.2)
    gain.gain.setValueAtTime(0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch (e) {
    console.error('Audio chime error:', e)
  }
}

export function FaceAttendanceV2Client({
  employeeId,
  employeeName,
  employeeSn = String(employeeId),
  siteId,
  siteName = 'Balikpapan Site Office',
  faceRarayId,
  faceRarayRegisteredAt,
  suggestedEventType,
  lastEventType,
  lastEventTime,
  shiftOptions = [],
  todayLogs = [],
  rosterCalendar = { days: [], timezone: 'WITA' },
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSendingRef = useRef(false)
  const clientRequestIdRef = useRef<string>('')
  const retryCountRef = useRef(0)
  const gpsRef = useRef<GpsPosition | null>(null)

  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [selectedEventType, setSelectedEventType] = useState<EventType>('auto')
  const [errorMessage, setErrorMessage] = useState('')
  const [successRecord, setSuccessRecord] = useState<TodayLog | null>(null)
  const [successEmployee, setSuccessEmployee] = useState<{
    id: number
    name: string
    employeeSn: string
  } | null>(null)
  const [successPunctuality, setSuccessPunctuality] = useState<{
    shiftCode: string
    scheduledClockIn: string
    lateMinutes: number
    isLate: boolean
    note: string
  } | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [gps, setGps] = useState<GpsPosition | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  )
  const [selectedRosterDate, setSelectedRosterDate] = useState('')
  const [resolvedEventType, setResolvedEventType] = useState<'checked-in' | 'checked-out' | null>(
    null
  )
  const [now, setNow] = useState<Date | null>(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [manualSubmitting, setManualSubmitting] = useState(false)

  // Default shift options if none provided
  const activeShifts: ShiftOption[] =
    shiftOptions.length > 0
      ? shiftOptions
      : [
          {
            value: 'day',
            label: 'Day Shift (DS)',
            window: '08:00 - 17:00 WITA (08:00 AM - 05:00 PM)',
            helper: 'Regular Day Shift (08:00 - 17:00).',
          },
          {
            value: 'night',
            label: 'Night Shift (NS)',
            window: '18:00 - 06:00 WITA (06:00 PM - 06:00 AM)',
            helper: 'Overnight Night Shift (18:00 - 06:00).',
          },
        ]

  const [selectedShift, setSelectedShift] = useState<string>(() => {
    // 1. Check if today's roster specifically specifies NS or DS
    const todayStr = new Date().toISOString().slice(0, 10)
    const todayRoster = rosterCalendar.days.find((d) => d.date === todayStr)
    if (todayRoster?.code) {
      const code = todayRoster.code.toUpperCase()
      if (code === 'NS') {
        const nightOption = activeShifts.find(
          (s) => s.value === 'night' || s.value.toLowerCase().includes('night') || s.value === 'NS'
        )
        if (nightOption) return nightOption.value
      } else if (code === 'DS') {
        const dayOption = activeShifts.find(
          (s) => s.value === 'day' || s.value.toLowerCase().includes('day') || s.value === 'DS'
        )
        if (dayOption) return dayOption.value
      }
    }

    // 2. Fallback to time of day (True night shift check-in window is 18:00 - 05:00)
    const currentHour = new Date().getHours()
    const isNight = currentHour >= 18 || currentHour < 5
    if (isNight) {
      const nightOption = activeShifts.find(
        (s) => s.value === 'night' || s.value.toLowerCase().includes('night') || s.value === 'NS'
      )
      if (nightOption) return nightOption.value
    }
    return activeShifts[0]?.value ?? 'day'
  })
  const [logs, setLogs] = useState<TodayLog[]>(todayLogs)

  const currentEventType = logs[0]?.eventType ?? lastEventType
  const currentSuggestedEventType = currentEventType === 'checked-in' ? 'checked-out' : 'checked-in'

  useEffect(() => {
    setLogs(todayLogs)
  }, [todayLogs])

  // ─── REVERSE GEOCODING FOR REAL LOCATION NAME ───
  const [locationName, setLocationName] = useState<string>('Memuat nama lokasi...')

  useEffect(() => {
    if (!gps?.latitude || !gps?.longitude) return
    let cancelled = false
    const fetchAddress = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${gps.latitude}&lon=${gps.longitude}&zoom=16&addressdetails=1`,
          { headers: { 'Accept-Language': 'id,en' } }
        )
        if (!res.ok) return
        const data = await res.json()
        if (cancelled) return
        const addr = data.address || {}
        const area =
          addr.amenity ||
          addr.building ||
          addr.suburb ||
          addr.village ||
          addr.town ||
          addr.city_district ||
          addr.road ||
          data.display_name?.split(',')[0] ||
          'Lokasi Presisi'
        const city = addr.city || addr.county || addr.state || ''
        const label = city && !area.includes(city) ? `${area}, ${city}` : area
        setLocationName(label)
      } catch {
        if (!cancelled) setLocationName(siteName)
      }
    }
    void fetchAddress()
    return () => {
      cancelled = true
    }
  }, [gps?.latitude, gps?.longitude, siteName])

  // Realtime clock timer
  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // GPS prefetch on mount
  useEffect(() => {
    if (!navigator.geolocation) return
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const position = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          locationName: `${siteName}`,
        }
        gpsRef.current = position
        setGps(position)
        setGpsLoading(false)
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: GPS_TIMEOUT, maximumAge: 10000 }
    )
  }, [siteName])

  const getCurrentGps = useCallback((): Promise<GpsPosition> => {
    return new Promise((resolve, reject) => {
      if (gps) return resolve(gps)
      if (!navigator.geolocation) return reject(new Error('GPS tidak didukung'))
      setGpsLoading(true)
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            locationName: `${siteName}`,
          }
          setGps(position)
          setGpsLoading(false)
          resolve(position)
        },
        () => {
          setGpsLoading(false)
          reject(new Error('GPS tidak tersedia'))
        },
        { enableHighAccuracy: true, timeout: GPS_TIMEOUT, maximumAge: 10000 }
      )
    })
  }, [gps, siteName])

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      clearTimeout(scanLoopRef.current)
      scanLoopRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return null

    const rawWidth = video.videoWidth || 640
    const rawHeight = video.videoHeight || 640
    const maxDimension = 512
    let targetWidth = rawWidth
    let targetHeight = rawHeight

    if (rawWidth > maxDimension || rawHeight > maxDimension) {
      if (rawWidth >= rawHeight) {
        targetWidth = maxDimension
        targetHeight = Math.round((rawHeight / rawWidth) * maxDimension)
      } else {
        targetHeight = maxDimension
        targetWidth = Math.round((rawWidth / rawHeight) * maxDimension)
      }
    }

    canvas.width = targetWidth
    canvas.height = targetHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
    return canvas.toDataURL('image/jpeg', 0.7)
  }, [])

  const motionHistoryRef = useRef<number[]>([])
  const prevFrameSampleRef = useRef<Uint8ClampedArray | null>(null)
  const [livenessStatus, setLivenessStatus] = useState<
    'analyzing' | 'live-confirmed' | 'photo-detected'
  >('analyzing')

  // Background motion sampler: measures pixel variance across video frames every 100ms
  useEffect(() => {
    if (flowState !== 'scanning' && flowState !== 'verifying') {
      motionHistoryRef.current = []
      prevFrameSampleRef.current = null
      setLivenessStatus('analyzing')
      return
    }

    const interval = setInterval(() => {
      const video = videoRef.current
      if (!video || video.readyState < 2) return

      const w = 80
      const h = 80
      const cvs = document.createElement('canvas')
      cvs.width = w
      cvs.height = h
      const ctx = cvs.getContext('2d')
      if (!ctx) return

      // Sample central face region
      ctx.drawImage(
        video,
        video.videoWidth * 0.25,
        video.videoHeight * 0.25,
        video.videoWidth * 0.5,
        video.videoHeight * 0.5,
        0,
        0,
        w,
        h
      )
      const currData = ctx.getImageData(0, 0, w, h).data

      if (!prevFrameSampleRef.current) {
        prevFrameSampleRef.current = currData
        return
      }

      const prevData = prevFrameSampleRef.current
      let totalDiff = 0
      let sampled = 0

      for (let i = 0; i < currData.length; i += 32) {
        const diff =
          Math.abs(currData[i] - prevData[i]) +
          Math.abs(currData[i + 1] - prevData[i + 1]) +
          Math.abs(currData[i + 2] - prevData[i + 2])
        totalDiff += diff / 3
        sampled++
      }

      prevFrameSampleRef.current = currData
      const delta = totalDiff / sampled

      motionHistoryRef.current.push(delta)
      if (motionHistoryRef.current.length > 8) {
        motionHistoryRef.current.shift()
      }

      const history = motionHistoryRef.current
      if (history.length >= 3) {
        const avgDelta = history.reduce((a, b) => a + b, 0) / history.length
        if (avgDelta < 0.75) {
          setLivenessStatus('photo-detected')
        } else if (avgDelta >= 1.1) {
          setLivenessStatus('live-confirmed')
        }
      }
    }, 100)

    return () => clearInterval(interval)
  }, [flowState])

  const runRecognitionLoop = useCallback(async () => {
    if (flowState !== 'scanning' || isSendingRef.current) {
      if (flowState === 'scanning') {
        scanLoopRef.current = setTimeout(runRecognitionLoop, CAPTURE_INTERVAL)
      }
      return
    }

    const history = motionHistoryRef.current

    // Wait until at least 3 motion samples have been evaluated
    if (history.length < 3) {
      scanLoopRef.current = setTimeout(runRecognitionLoop, 250)
      return
    }

    const avgDelta = history.reduce((a, b) => a + b, 0) / history.length

    // Anti-spoofing check: static photo / paper / phone screen image
    if (avgDelta < 0.2 && livenessStatus === 'photo-detected') {
      stopCamera()
      setFlowState('failed')
      setErrorMessage(
        'Terdeteksi Foto / Gambar Diam (Anti-Spoofing Gagal). Harap gunakan wajah asli secara langsung.'
      )
      return
    }

    const frame = captureFrame()
    if (!frame) {
      scanLoopRef.current = setTimeout(runRecognitionLoop, CAPTURE_INTERVAL)
      return
    }

    isSendingRef.current = true
    setFlowState('verifying')

    try {
      const position = gpsRef.current || gps || { latitude: 0, longitude: 0, accuracy: 0 }

      const response = await fetch('/api/mobile/v2/face-recognition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          siteId,
          eventType: selectedEventType,
          shiftCode: selectedShift,
          imageDataUrl: frame,
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          clientRequestId: clientRequestIdRef.current,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const code = data?.error?.code
        if (code === 'NO_FACE_REGISTRATION_V2') {
          stopCamera()
          setFlowState('not-registered')
          setErrorMessage(
            'Wajah belum terdaftar di sistem biometrik V2. Silakan registrasi terlebih dahulu.'
          )
          return
        }
        const newCount = retryCountRef.current + 1
        retryCountRef.current = newCount
        setRetryCount(newCount)
        if (newCount >= MAX_AUTO_RETRY) {
          stopCamera()
          setFlowState('failed')
          setErrorMessage(
            'Verifikasi otomatis gagal beberapa kali. Anda masih dapat mengambil foto manual.'
          )
          return
        }
        setFlowState('scanning')
        scanLoopRef.current = setTimeout(runRecognitionLoop, CAPTURE_INTERVAL)
        return
      }

      if (data.verified) {
        stopCamera()
        playSuccessSound()
        navigator.vibrate?.([100, 50, 200])
        setResolvedEventType(data.resolvedEventType)
        setSuccessRecord(data.attendanceRecord)
        setSuccessEmployee(data.employee || null)
        setSuccessPunctuality(data.punctuality || null)
        setFlowState('success')
        if (data.attendanceRecord) {
          setLogs((prev) => [data.attendanceRecord, ...prev])
        }
        return
      }

      // Check if Anti-Spoofing failed (photo / screen detected on live camera)
      if (data.error?.code === 'SPOOFING_DETECTED') {
        stopCamera()
        setFlowState('failed')
        setErrorMessage(
          data.error.message ||
            '🚨 Terdeteksi Foto / Layar (Anti-Spoofing Gagal). Harap gunakan wajah asli secara langsung.'
        )
        return
      }

      const newCount = retryCountRef.current + 1
      retryCountRef.current = newCount
      setRetryCount(newCount)

      if (newCount >= MAX_AUTO_RETRY) {
        stopCamera()
        setFlowState('failed')
        setErrorMessage(
          'Wajah tidak teridentifikasi. Anda masih dapat mengambil foto manual agar absensi tetap tercatat.'
        )
        return
      }

      setFlowState('scanning')
      scanLoopRef.current = setTimeout(runRecognitionLoop, CAPTURE_INTERVAL)
    } catch (err) {
      console.error('[FaceAttendanceV2] Verification catch error:', err)
      stopCamera()
      setFlowState('error')
      setErrorMessage(
        err instanceof Error && err.message
          ? err.message
          : 'Terjadi kesalahan jaringan atau server. Silakan coba lagi.'
      )
    } finally {
      isSendingRef.current = false
    }
  }, [
    captureFrame,
    employeeId,
    siteId,
    selectedEventType,
    selectedShift,
    flowState,
    getCurrentGps,
    stopCamera,
  ])

  // Ensure video element receives camera stream as soon as it mounts to DOM
  useEffect(() => {
    if (
      (flowState === 'scanning' || flowState === 'verifying') &&
      streamRef.current &&
      videoRef.current
    ) {
      const video = videoRef.current
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current
      }
      video.play().catch(() => {})
    }
  }, [flowState])

  useEffect(() => {
    if (flowState === 'scanning') {
      scanLoopRef.current = setTimeout(runRecognitionLoop, 400)
    }
  }, [flowState, runRecognitionLoop])

  const startFlow = async (mode: EventType) => {
    setSelectedEventType(mode)
    clientRequestIdRef.current =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    retryCountRef.current = 0
    setRetryCount(0)
    setErrorMessage('')
    setFlowState('camera-loading')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      })
      streamRef.current = stream
      setFlowState('scanning')
    } catch {
      setFlowState('error')
      setErrorMessage('Gagal membuka kamera. Pastikan izin kamera telah diberikan di browser.')
    }
  }

  const startManualCapture = async () => {
    setErrorMessage('')
    setFlowState('camera-loading')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      })
      streamRef.current = stream
      setFlowState('manual-capture')
    } catch {
      setFlowState('failed')
      setErrorMessage('Gagal membuka kamera untuk foto manual. Pastikan izin kamera diberikan.')
    }
  }

  const submitManualCapture = async () => {
    const frame = captureFrame()
    if (!frame || manualSubmitting) return

    setManualSubmitting(true)
    setErrorMessage('')
    try {
      const position = await getCurrentGps()
      const response = await fetch('/api/mobile/v2/face-recognition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          siteId,
          eventType: selectedEventType,
          shiftCode: selectedShift,
          imageDataUrl: frame,
          latitude: position.latitude,
          longitude: position.longitude,
          accuracy: position.accuracy,
          clientRequestId: clientRequestIdRef.current,
          manualFallback: true,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success || !data.attendanceRecord) {
        throw new Error(data?.error?.message || data?.error || 'Foto manual gagal disimpan.')
      }

      stopCamera()
      setResolvedEventType(data.resolvedEventType)
      setSuccessRecord(data.attendanceRecord)
      setSuccessEmployee(data.employee || null)
      setSuccessPunctuality(data.punctuality || null)
      setLogs((prev) => [data.attendanceRecord, ...prev])
      setFlowState('success')
    } catch (error) {
      setFlowState('failed')
      setErrorMessage(error instanceof Error ? error.message : 'Foto manual gagal disimpan.')
    } finally {
      setManualSubmitting(false)
    }
  }

  const resetFlow = () => {
    stopCamera()
    setFlowState('idle')
    setErrorMessage('')
    setSuccessRecord(null)
    setSuccessEmployee(null)
    setSuccessPunctuality(null)
  }

  const isRegistered = Boolean(faceRarayRegisteredAt || faceRarayId)
  const currentShiftObj = activeShifts.find((s) => s.value === selectedShift) || activeShifts[0]

  // Mini map marker positioning logic
  const mapPinLat = gps ? ((gps.latitude + 90) / 180) * 100 : 50
  const mapPinLng = gps ? ((gps.longitude + 180) / 360) * 100 : 50
  const miniMapStyle = {
    left: `${Math.max(10, Math.min(90, mapPinLng))}%`,
    top: `${Math.max(10, Math.min(90, mapPinLat))}%`,
  }
  const calendarYear = calendarMonth.getFullYear()
  const calendarMonthIndex = calendarMonth.getMonth()
  const calendarDaysInMonth = new Date(calendarYear, calendarMonthIndex + 1, 0).getDate()
  const calendarStartOffset = new Date(calendarYear, calendarMonthIndex, 1).getDay()
  const rosterByDate = new Map(rosterCalendar.days.map((day) => [day.date, day]))
  const todayKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
  const visibleRosterDate = selectedRosterDate || todayKey
  const selectedRosterDay = rosterByDate.get(visibleRosterDate)
  const calendarCells = Array.from(
    { length: Math.ceil((calendarStartOffset + calendarDaysInMonth) / 7) * 7 },
    (_, index) => {
      const dayNumber = index - calendarStartOffset + 1
      if (dayNumber < 1 || dayNumber > calendarDaysInMonth) return null
      const date = `${calendarYear}-${String(calendarMonthIndex + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
      return { dayNumber, date, roster: rosterByDate.get(date) }
    }
  )

  const rosterLabel = (code: string) => {
    if (code === 'DS') return 'DS'
    if (code === 'NS') return 'NS'
    if (code === 'ST') return 'ST'
    if (code === 'FB') return 'FB'
    if (code === 'OFF' || code === 'LIBUR') return 'Libur'
    return 'Tanpa shift'
  }

  const rosterTone = (code: string) => {
    if (code === 'DS') return 'bg-sky-100 text-sky-800'
    if (code === 'NS') return 'bg-slate-800 text-white'
    if (code === 'ST') return 'bg-violet-100 text-violet-800'
    if (code === 'FB') return 'bg-amber-100 text-amber-800'
    if (code === 'OFF' || code === 'LIBUR') return 'bg-slate-100 text-slate-500'
    return 'bg-slate-50 text-slate-400'
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50 pb-10 font-sans text-slate-900">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <Link
          href="/mobile"
          className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition-transform active:scale-95"
        >
          <ArrowLeft className="size-5" />
        </Link>

        <div className="text-center">
          <h1 className="flex items-center justify-center gap-1.5 text-sm font-bold text-slate-900">
            <ScanFace className="size-4 text-[#005bb5]" />
            Absensi
          </h1>
          <p className="text-[10px] font-medium text-slate-500">Verifikasi wajah & lokasi</p>
        </div>

        <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-600">
          <span className="size-1.5 rounded-full bg-emerald-500" /> Online
        </span>
      </header>

      <main className="flex flex-1 flex-col space-y-4 px-4 py-4">
        <section className="space-y-3 overflow-hidden rounded-2xl bg-[#031b33] p-4 text-white shadow-sm">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-[#004280] text-sky-200 shadow-md">
                <UserCheck className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">{employeeName}</p>
                <p className="font-mono text-[11px] text-sky-300">SN {employeeSn}</p>
              </div>
            </div>

            <div>
              {isRegistered ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-500/25 px-2.5 py-1 text-[10px] font-bold text-emerald-200">
                  Wajah terdaftar
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/25 px-2.5 py-1 text-[10px] font-bold text-amber-200">
                  Wajah belum terdaftar
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-sky-200">
            <span className="flex items-center gap-1.5 font-bold">
              <MapPin className="size-3.5 text-sky-400" />
              {siteName}
            </span>
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="flex items-center gap-1 text-[11px] font-black text-sky-300 underline hover:text-white"
            >
              <History className="size-3" /> Riwayat wajah
            </button>
          </div>
        </section>

        {/* ─── IDLE STATE MAIN DASHBOARD ─── */}
        {flowState === 'idle' && (
          <>
            <section className="order-2 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between border-b pb-2.5">
                <div className="flex items-center gap-2">
                  <Briefcase className="size-4 text-[#005bb5]" />
                  <span className="text-sm font-bold text-slate-800">Jadwal hari ini</span>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                  Roster aktif
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500">Shift attendance</span>
                  <select
                    value={selectedShift}
                    onChange={(e) => setSelectedShift(e.target.value)}
                    aria-label="Pilih shift attendance"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 focus:border-[#005bb5] focus:outline-none"
                  >
                    {activeShifts.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500">Status roster</span>
                  <div className="flex min-h-10 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700">
                    <span>Hari kerja</span>
                    <span className="size-2 rounded-full bg-emerald-500" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50 p-2.5 text-xs">
                <span className="font-semibold text-sky-900">
                  Jam kerja: {currentShiftObj?.window}
                </span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Lembur tersedia
                </span>
              </div>
            </section>

            <section className="order-3 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500">Waktu perangkat</p>
                  <p className="font-mono text-2xl font-bold tracking-tight text-[#003461]">
                    {now ? formatClock(now) : '--.--.--'}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    {now ? formatDate(now) : 'Sinkronisasi waktu...'}
                  </p>
                </div>

                <div className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-[#005bb5]">
                  <Clock3 className="size-6" />
                </div>
              </div>

              {/* Location Data & Coordinates */}
              <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <span className="shrink-0 font-semibold text-slate-500">Lokasi:</span>
                  <span className="text-right font-semibold text-[#003461]">
                    {locationName || siteName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Koordinat:</span>
                  <span className="font-mono text-[11px] font-semibold text-slate-800">
                    {gps
                      ? `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}`
                      : 'Memuat GPS...'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-500">Akurasi lokasi:</span>
                  <span className="font-semibold text-emerald-600">
                    {gps ? `± ${gps.accuracy} meter (Akurat)` : 'Mencari sinyal GPS...'}
                  </span>
                </div>
              </div>

              {/* ─── REAL OPENSTREETMAP MINI MAP WIDGET ─── */}
              {gps ? (
                <div className="relative h-32 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <iframe
                    title="Real OpenStreetMap Mini Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${(gps.longitude - 0.0025).toFixed(5)},${(gps.latitude - 0.0025).toFixed(5)},${(gps.longitude + 0.0025).toFixed(5)},${(gps.latitude + 0.0025).toFixed(5)}&layer=mapnik&marker=${gps.latitude.toFixed(5)},${gps.longitude.toFixed(5)}`}
                    className="h-full w-full contrast-105 filter"
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-2 rounded-lg border border-white/20 bg-slate-900/90 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg">
                    <span className="size-2 shrink-0 rounded-full bg-emerald-400" />
                    <span className="max-w-[210px] truncate">📍 {locationName || siteName}</span>
                  </div>
                </div>
              ) : (
                <div className="relative flex h-32 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-400">
                  <Loader2 className="size-6 animate-spin text-[#005bb5]" />
                  <span>Memuat Peta Lokasi GPS...</span>
                </div>
              )}
            </section>

            <section className="order-1 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-bold text-slate-900">
                  {currentEventType === 'checked-in'
                    ? 'Anda sudah check-in'
                    : 'Siap melakukan absensi'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {currentEventType === 'checked-in'
                    ? 'Gunakan Check out saat selesai bekerja.'
                    : 'Pilih Check in untuk mulai bekerja atau Auto absensi.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => startFlow('checked-in')}
                  className={cn(
                    'flex min-h-14 items-center justify-center gap-2 rounded-xl text-xs font-bold text-white shadow-sm transition-transform active:scale-[0.98]',
                    currentSuggestedEventType === 'checked-in' ? 'bg-emerald-600' : 'bg-emerald-500'
                  )}
                >
                  <LogIn className="size-4" /> Check In
                </button>

                <button
                  type="button"
                  onClick={() => startFlow('checked-out')}
                  className={cn(
                    'flex min-h-14 items-center justify-center gap-2 rounded-xl text-xs font-bold text-white shadow-sm transition-transform active:scale-[0.98]',
                    currentSuggestedEventType === 'checked-out' ? 'bg-rose-600' : 'bg-rose-500'
                  )}
                >
                  <LogOut className="size-4" /> Check Out
                </button>
              </div>

              <Link
                href="/mobile/attendance/permission"
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-[#003461] transition-transform hover:bg-slate-50 active:scale-[0.98]"
              >
                <Upload className="size-4" /> Ajukan izin atau sakit
              </Link>
            </section>

            <section className="order-4 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <History className="size-4 text-[#005bb5]" />
                  Riwayat absensi hari ini
                </p>
                <span className="text-[10px] font-bold text-slate-400">{logs.length} catatan</span>
              </div>

              {logs.length > 0 ? (
                <div className="space-y-2.5">
                  {logs.slice(0, 4).map((log) => (
                    <article
                      key={log.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-bold',
                              log.eventType === 'checked-in'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            )}
                          >
                            {getEventLabel(log.eventType)}
                          </span>
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {new Date(log.eventTime).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}{' '}
                          </span>
                        </div>
                        {log.locationNote && (
                          <p className="max-w-[200px] truncate text-[11px] font-medium text-slate-500">
                            📍 {log.locationNote}
                          </p>
                        )}
                      </div>

                      {log.punctualityNote ? (
                        <span className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">
                          {log.punctualityNote}
                        </span>
                      ) : (
                        <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                          Sesuai jadwal
                        </span>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-xs font-bold text-slate-400">
                  Belum ada catatan absensi hari ini.
                </p>
              )}
            </section>

            <section className="order-5 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <Calendar className="size-4 text-[#005bb5]" /> Jadwal roster saya
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {rosterCalendar.timezone} · pilih tanggal untuk detail
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Bulan sebelumnya"
                    onClick={() =>
                      setCalendarMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                      )
                    }
                    className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <span className="min-w-28 text-center text-xs font-bold text-slate-800 capitalize">
                    {calendarMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    aria-label="Bulan berikutnya"
                    onClick={() =>
                      setCalendarMonth(
                        (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                      )
                    }
                    className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400">
                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell, index) =>
                  cell ? (
                    <button
                      key={cell.date}
                      type="button"
                      onClick={() => setSelectedRosterDate(cell.date)}
                      className={cn(
                        'min-h-12 rounded-lg border p-1 text-left transition-transform active:scale-95',
                        cell.date === visibleRosterDate
                          ? 'border-[#005bb5] ring-1 ring-[#005bb5]'
                          : 'border-slate-100',
                        cell.date === todayKey && cell.date !== visibleRosterDate
                          ? 'bg-blue-50'
                          : 'bg-white'
                      )}
                    >
                      <span className="block text-[10px] font-bold text-slate-700">
                        {cell.dayNumber}
                      </span>
                      <span
                        className={cn(
                          'mt-1 block truncate rounded px-1 py-0.5 text-[9px] font-bold',
                          rosterTone(cell.roster?.code || '')
                        )}
                      >
                        {rosterLabel(cell.roster?.code || '')}
                      </span>
                    </button>
                  ) : (
                    <span key={`empty-${index}`} className="min-h-12" />
                  )
                )}
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-800">
                  {new Date(`${visibleRosterDate}T00:00:00`).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {selectedRosterDay?.code === 'DS'
                    ? 'Day Shift · 08:00–17:00'
                    : selectedRosterDay?.code === 'NS'
                      ? 'Night Shift · 18:00–06:00'
                      : selectedRosterDay?.code === 'ST'
                        ? 'Standby / On-call'
                        : selectedRosterDay?.code === 'FB' || selectedRosterDay?.fieldBreak
                          ? 'Field Break'
                          : selectedRosterDay?.code === 'OFF' || selectedRosterDay?.code === 'LIBUR'
                            ? 'Libur · tidak ada shift'
                            : 'Belum ada roster'}
                </p>
              </div>
            </section>
          </>
        )}

        {/* ─── CAMERA LOADING STATE ─── */}
        {flowState === 'camera-loading' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="size-10 animate-spin text-[#005bb5]" />
            <p className="text-sm font-bold text-slate-700">Membuka kamera biometrik...</p>
          </div>
        )}

        {/* ─── SCANNING / VERIFYING STATE ─── */}
        {(flowState === 'scanning' ||
          flowState === 'verifying' ||
          flowState === 'manual-capture') && (
          <div className="flex flex-1 flex-col items-center gap-4">
            {/* Mode banner */}
            <div
              className={cn(
                'w-full rounded-2xl px-4 py-2.5 text-center text-xs font-black tracking-wider uppercase shadow-sm',
                flowState === 'verifying'
                  ? 'border border-violet-200 bg-violet-100 text-violet-800'
                  : flowState === 'manual-capture'
                    ? 'border border-amber-200 bg-amber-50 text-amber-800'
                    : 'border border-blue-100 bg-blue-50 text-[#005bb5]'
              )}
            >
              {flowState === 'verifying'
                ? '⚡ Memverifikasi Wajah via Face Recog by Afi...'
                : flowState === 'manual-capture'
                  ? '📷 Foto manual · Absensi tetap tercatat dan ditandai perlu review'
                  : `🎯 Arahkan wajah ke kamera · Mode: ${selectedEventType === 'auto' ? 'Auto Absensi' : selectedEventType === 'checked-in' ? 'Check In' : 'Check Out'}`}
            </div>

            {/* Retry progress */}
            {retryCount > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                <RefreshCw className="size-3.5 animate-spin" />
                Percobaan {retryCount}/{MAX_AUTO_RETRY}...
              </div>
            )}

            {/* ─── LARGE CAMERA PREVIEW DISPLAY ─── */}
            <div className="relative aspect-[3/4] min-h-[380px] w-full max-w-md overflow-hidden rounded-3xl border-2 border-[#005bb5] bg-slate-950 shadow-2xl">
              <video
                ref={(el) => {
                  videoRef.current = el
                  if (el && streamRef.current && el.srcObject !== streamRef.current) {
                    el.srcObject = streamRef.current
                    el.play().catch(() => {})
                  }
                }}
                className="h-full w-full scale-x-[-1] object-cover"
                playsInline
                muted
                autoPlay
                onLoadedMetadata={(e) => {
                  e.currentTarget.play().catch(() => {})
                }}
              />

              {/* Anti-Spoofing & Dynamic Liveness Status Badge */}
              <div
                className={cn(
                  'absolute top-3 left-3 flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black shadow-lg backdrop-blur-md transition-colors',
                  livenessStatus === 'photo-detected'
                    ? 'border-rose-500/50 bg-rose-950/90 text-rose-300'
                    : livenessStatus === 'live-confirmed'
                      ? 'border-emerald-500/50 bg-emerald-950/90 text-emerald-300'
                      : 'border-amber-500/50 bg-amber-950/90 text-amber-300'
                )}
              >
                <ShieldCheck
                  className={cn(
                    'size-3.5',
                    livenessStatus === 'photo-detected'
                      ? 'text-rose-400'
                      : livenessStatus === 'live-confirmed'
                        ? 'animate-pulse text-emerald-400'
                        : 'animate-spin text-amber-400'
                  )}
                />
                <span>
                  {livenessStatus === 'photo-detected'
                    ? '🔴 Anti-Spoofing: Foto / Gambar Diam!'
                    : livenessStatus === 'live-confirmed'
                      ? '🟢 Liveness Terverifikasi (Wajah Hidup)'
                      : '🟡 Uji Liveness: Berkedip / Gerakkan Wajah...'}
                </span>
              </div>

              {/* Large Oval Target Guide */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  className={cn(
                    'h-[65%] w-[60%] rounded-[50%] border-4 border-dashed transition-colors duration-300',
                    flowState === 'verifying'
                      ? 'border-violet-400 shadow-[0_0_30px_rgba(139,92,246,0.6)]'
                      : 'animate-pulse border-sky-400/90 shadow-[0_0_30px_rgba(0,149,255,0.4)]'
                  )}
                />
              </div>

              {/* Verifying overlay */}
              {flowState === 'verifying' && (
                <div className="absolute inset-0 flex items-center justify-center bg-violet-900/30 backdrop-blur-[2px]">
                  <div className="flex items-center gap-3 rounded-2xl bg-white/95 px-5 py-3.5 shadow-2xl">
                    <Loader2 className="size-5 animate-spin text-[#005bb5]" />
                    <span className="text-xs font-black text-[#003461]">
                      Mencocokkan Biometrik...
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} className="hidden" />

            {/* ⚡ DIRECT VERIFICATION BUTTON PLACED DIRECTLY BELOW CAMERA PREVIEW (DI BAWAH MUKA) */}
            <button
              type="button"
              onClick={flowState === 'manual-capture' ? submitManualCapture : runRecognitionLoop}
              disabled={flowState === 'verifying' || manualSubmitting}
              className="flex min-h-14 w-full max-w-md items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#005bb5] via-[#006bd6] to-[#0077e6] px-5 text-sm font-black tracking-wider text-white uppercase shadow-xl shadow-blue-900/30 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-75"
            >
              {flowState === 'verifying' ? (
                <>
                  <Loader2 className="size-5 animate-spin text-white" />
                  Memverifikasi Wajah...
                </>
              ) : flowState === 'manual-capture' ? (
                <>
                  {manualSubmitting ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Camera className="size-5" />
                  )}
                  {manualSubmitting ? 'Menyimpan Foto...' : 'Ambil Foto Manual & Catat Absensi'}
                </>
              ) : (
                <>
                  <ScanFace className="size-5 animate-pulse text-sky-200" />
                  Verifikasi Wajah Sekarang
                </>
              )}
            </button>

            {/* Cancel button */}
            <button
              type="button"
              onClick={resetFlow}
              className="rounded-xl bg-slate-200 px-6 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-300 active:scale-95"
            >
              Batal / Kembalikan Kamera
            </button>
          </div>
        )}

        {/* ─── SUCCESS STATE ─── */}
        {flowState === 'success' && successRecord && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="relative">
              <div className="flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-lg">
                <CheckCircle2 className="size-12" />
              </div>
              <div className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full bg-[#005bb5] text-white shadow-md">
                <Zap className="size-4" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900">
                Selamat Datang, {successEmployee?.name || employeeName}!
              </h2>
              <p className="text-xs font-bold tracking-wider text-emerald-600 uppercase">
                ✓ Absensi {getEventLabel(resolvedEventType || successRecord.eventType)} Berhasil
              </p>
            </div>

            <div className="w-full max-w-sm space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-left text-xs shadow-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-slate-400">SN Karyawan</span>
                <span className="font-mono font-black text-slate-800">
                  {successEmployee?.employeeSn || employeeSn}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-slate-400">Waktu Absensi</span>
                <span className="font-mono font-black text-slate-800">
                  {new Date(successRecord.eventTime).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}{' '}
                  WITA
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-400">Status Kehadiran</span>
                <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-black text-emerald-700">
                  {successPunctuality?.note || '✓ Tepat Waktu (Sesuai Roster)'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={resetFlow}
              className="flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-[#005bb5] text-xs font-black text-white uppercase shadow-md active:scale-95"
            >
              Kembali ke Beranda Absensi
            </button>
          </div>
        )}

        {/* ─── FAILED / ERROR STATE ─── */}
        {(flowState === 'failed' || flowState === 'error' || flowState === 'not-registered') && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertCircle className="size-9" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-black text-slate-900">
                Verifikasi Wajah Belum Berhasil
              </h2>
              <p className="mx-auto max-w-xs text-xs font-medium text-slate-600">{errorMessage}</p>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-2.5">
              <button
                type="button"
                onClick={() => startFlow(selectedEventType)}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#005bb5] text-xs font-black text-white uppercase shadow-md active:scale-95"
              >
                <RefreshCw className="size-4" /> Coba Lagi
              </button>

              {flowState === 'failed' && retryCount >= MAX_AUTO_RETRY && (
                <button
                  type="button"
                  onClick={startManualCapture}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 text-xs font-black text-amber-800 uppercase active:scale-95"
                >
                  <Camera className="size-4" /> Foto Manual Setelah {MAX_AUTO_RETRY}x Gagal
                </button>
              )}

              <Link
                href={`/mobile/attendance/face-v2/register?employeeId=${employeeId}&siteId=${siteId}&reregister=true`}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-200 text-xs font-black text-slate-800 uppercase active:scale-95"
              >
                <ScanFace className="size-4" /> Registrasi Ulang Wajah
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* ─── HISTORY REGISTRASI MODAL POPUP ─── */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <History className="size-5 text-[#005bb5]" />
                <h3 className="text-sm font-black text-slate-900">History Registrasi Wajah</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="space-y-1 rounded-xl border bg-slate-50 p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Informasi Karyawan</p>
                <p className="font-bold text-slate-900">{employeeName}</p>
                <p className="font-mono text-slate-500">SN: {employeeSn}</p>
              </div>

              <div className="space-y-1 rounded-xl border bg-slate-50 p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Engine Biometrik</p>
                <p className="font-bold text-[#005bb5]">Face Recog by Afi (ArcFace V2)</p>
                <p className="font-mono text-[11px] text-slate-500">Face ID: emp-{employeeSn}</p>
              </div>

              <div className="space-y-1 rounded-xl border bg-slate-50 p-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Status & Tanggal Registrasi
                </p>
                {isRegistered ? (
                  <div className="flex items-center gap-1.5 font-bold text-emerald-700">
                    <CheckCircle2 className="size-4" />
                    <span>
                      Terdaftar pada{' '}
                      {faceRarayRegisteredAt
                        ? new Date(faceRarayRegisteredAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : 'Database Biometrik'}
                    </span>
                  </div>
                ) : (
                  <p className="font-bold text-amber-700">Belum terdaftar di database biometrik.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Link
                href={`/mobile/attendance/face-v2/register?employeeId=${employeeId}&siteId=${siteId}&reregister=true`}
                onClick={() => setShowHistoryModal(false)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#005bb5] text-xs font-black text-white uppercase active:scale-95"
              >
                <RefreshCw className="size-3.5" />
                Registrasi Ulang Wajah Sekarang
              </Link>

              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="min-h-10 rounded-xl bg-slate-100 text-xs font-bold text-slate-600"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
