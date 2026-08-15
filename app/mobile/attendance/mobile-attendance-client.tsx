'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Clock3,
  History,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  ScanFace,
  Upload,
  UserCheck,
  Wifi,
  X,
  Zap,
} from 'lucide-react'

import { type AttendanceSyncPayload, type QueuedFilePayload } from '@/lib/offline-sync'
import { getPunctualityDetail } from '@/lib/timesheet/attendance-punctuality'
import { cn } from '@/lib/utils'

type AttendanceEmployee = {
  id: number
  name: string
  email: string
  jobTitle: string | null
  workLocation: string | null
  siteId: number
  siteName?: string | null
  employeeSn?: string | null
  faceRegisteredAt?: Date | string | null
  faceRarayId?: string | null
  faceRarayRegisteredAt?: Date | string | null
}

type AttendanceLog = {
  id: number
  eventType: string
  eventTime: Date
  status: string
  locationNote: string
  photoUrl?: string | null
  latitude?: string | null
  longitude?: string | null
}

type AttendanceShiftOption = {
  value: string
  label: string
  window: string
  helper: string
}

type AttendancePageData = {
  success: boolean
  employee: AttendanceEmployee | null
  logs: AttendanceLog[]
  shiftOptions: AttendanceShiftOption[]
}

type GeoState = {
  latitude: string
  longitude: string
  altitude: string
  accuracy: string
  locationName: string
  locationDetail: string
  ready: boolean
  message: string
}

const initialGeo: GeoState = {
  latitude: '',
  longitude: '',
  altitude: '',
  accuracy: '',
  locationName: '',
  locationDetail: '',
  ready: false,
  message: 'GPS waiting',
}

type ReverseGeocodeResult = {
  display_name?: string
  name?: string
  address?: {
    road?: string
    neighbourhood?: string
    village?: string
    town?: string
    city?: string
    county?: string
    state?: string
    province?: string
  }
}

function formatClock(value: Date) {
  return value.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDate(value: Date) {
  return value.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatLogTime(value: Date) {
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getEventLabel(value: string) {
  return value === 'checked-out' ? 'Check-Out' : 'Check-In'
}

function getStatusLabel(value: string) {
  if (value === 'pending') return 'Pending review'
  if (value === 'verified') return 'Verified'
  if (value === 'needs_review') return 'Needs review'
  return value
}

function firstLocationLine(value: string | null | undefined) {
  if (!value) return 'Location logged'
  return value.split('|')[0]?.trim() || 'Location logged'
}

function buildCoordinateLabel(geo: GeoState) {
  if (!geo.latitude || !geo.longitude) return 'Waiting GPS lock'

  const latitude = Number(geo.latitude)
  const longitude = Number(geo.longitude)
  const latitudeHemisphere = latitude < 0 ? 'S' : 'N'
  const longitudeHemisphere = longitude < 0 ? 'W' : 'E'

  return `${Math.abs(latitude).toFixed(4)} ${latitudeHemisphere}, ${Math.abs(longitude).toFixed(4)} ${longitudeHemisphere}`
}

function buildMapPinStyle(geo: GeoState) {
  if (!geo.latitude || !geo.longitude) {
    return { left: '52%', top: '48%' }
  }

  const lat = Math.abs(Number(geo.latitude))
  const lng = Math.abs(Number(geo.longitude))

  return {
    left: `${28 + (lng % 1) * 44}%`,
    top: `${24 + (lat % 1) * 48}%`,
  }
}

function getGeoLookupKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(4)},${longitude.toFixed(4)}`
}

function getReverseGeocodeLabel(data: ReverseGeocodeResult) {
  const address = data.address
  const primary =
    data.name ||
    address?.road ||
    address?.neighbourhood ||
    address?.village ||
    address?.town ||
    address?.city ||
    address?.county
  const secondary = address?.state || address?.province

  if (primary && secondary && primary !== secondary) {
    return `${primary}, ${secondary}`
  }

  return primary || data.display_name?.split(',').slice(0, 2).join(', ').trim() || ''
}

async function resolveLocationName(latitude: number, longitude: number) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 6000)

  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(latitude),
      lon: String(longitude),
      zoom: '18',
      addressdetails: '1',
    })
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { 'Accept-Language': 'id,en' },
      signal: controller.signal,
    })

    if (!response.ok) return ''

    const data = (await response.json()) as ReverseGeocodeResult
    return getReverseGeocodeLabel(data)
  } catch {
    return ''
  } finally {
    window.clearTimeout(timeout)
  }
}

async function fileToPayload(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('Gagal membaca file attendance.'))
    reader.readAsDataURL(file)
  })

  const payload: QueuedFilePayload = {
    name: file.name,
    type: file.type,
    size: file.size,
    dataUrl,
  }

  return payload
}

export function MobileAttendanceClient({ data }: { data: AttendancePageData }) {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const lastGeoLookupRef = useRef('')
  const [now, setNow] = useState<Date | null>(null)
  const [geo, setGeo] = useState<GeoState>(initialGeo)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [cameraPermissionOpen, setCameraPermissionOpen] = useState(false)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [capturePreview, setCapturePreview] = useState('')
  const [selectedShift, setSelectedShift] = useState(data.shiftOptions[0]?.value ?? '')
  const [workMode, setWorkMode] = useState('On Site')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [isCameraLive, setIsCameraLive] = useState(false)
  const [overrideEventType, setOverrideEventType] = useState<'checked-in' | 'checked-out' | null>(null)
  const [submitError, setSubmitError] = useState('')

  function stopCameraStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setIsCameraLive(false)
  }

  async function startCameraAndVerify(eventType?: 'checked-in' | 'checked-out') {
    if (eventType) {
      setOverrideEventType(eventType)
    }
    setIsCameraLive(true)
    await startCamera()
    window.setTimeout(() => {
      void runFaceRecognition()
    }, 500)
  }
  const [submitMessage, setSubmitMessage] = useState('')
  const [attendanceLogs, setAttendanceLogs] = useState(data.logs)
  const [isPending, startTransition] = useTransition()

  // Face recognition state
  const [faceRecMode, setFaceRecMode] = useState<
    'loading' | 'detecting' | 'fallback' | 'success' | 'verifying'
  >('detecting')
  const [faceRecMessage, setFaceRecMessage] = useState('')
  const [faceRecAttempts, setFaceRecAttempts] = useState(0)
  const faceRecLoopRef = useRef<number | null>(null)
  const faceRecStartRef = useRef<number>(Date.now())
  const MAX_FACE_REC_ATTEMPTS = 2
  const NO_FACE_TIMEOUT = 15000

  const latestLog = attendanceLogs[0]
  const autoSuggestedType = latestLog?.eventType === 'checked-in' ? 'checked-out' : 'checked-in'
  const nextType = overrideEventType ?? autoSuggestedType
  const actionLabel = nextType === 'checked-in' ? 'Confirm Check-In' : 'Confirm Check-Out'
  const requiresFaceRegistration = !data.employee?.faceRegisteredAt
  const isCameraBlocked = Boolean(cameraError) || cameraPermissionOpen
  const isCameraUnavailable = Boolean(cameraError) && !cameraReady && !capturePreview
  const selectedShiftOption =
    data.shiftOptions.find((shift) => shift.value === selectedShift) ?? data.shiftOptions[0]
  const siteName = data.employee?.siteName || data.employee?.workLocation || 'Site belum tersedia'
  const locationName = geo.locationName || (geo.ready ? siteName : 'Menunggu GPS lock')
  const employeeLabel = data.employee
    ? `${data.employee.name} | ${data.employee.jobTitle || 'Field Operator'}`
    : 'Employee context missing'
  const miniMapPinStyle = useMemo(() => buildMapPinStyle(geo), [geo])

  useEffect(() => {
    setNow(new Date())
    const timer = window.setInterval(() => setNow(new Date()), 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!data.employee?.faceRegisteredAt) return
    setFaceRecMode('detecting')
    setFaceRecMessage('Menyiapkan model di server...')

    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12000)

    void fetch('/api/mobile/face-warmup', {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(() => {
        setFaceRecMessage('Server face siap. Tekan Verify Wajah.')
      })
      .catch(() => {
        setFaceRecMessage('Server face belum warm. Verify pertama mungkin lebih lama.')
      })
      .finally(() => window.clearTimeout(timeout))

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [data.employee?.faceRegisteredAt])

  useEffect(() => {
    setAttendanceLogs(data.logs)
  }, [data.logs])

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeo((current) => ({ ...current, message: 'GPS not supported' }))
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude
        const lookupKey = getGeoLookupKey(latitude, longitude)

        setGeo((current) => ({
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
          altitude:
            typeof position.coords.altitude === 'number'
              ? `${Math.round(position.coords.altitude)}m ASL`
              : '',
          accuracy: `${Math.round(position.coords.accuracy)}m accuracy`,
          locationName: current.locationName,
          locationDetail: current.locationDetail,
          ready: true,
          message: 'GPS secure',
        }))

        if (lastGeoLookupRef.current !== lookupKey) {
          lastGeoLookupRef.current = lookupKey
          void resolveLocationName(latitude, longitude).then((name) => {
            if (!name) return
            setGeo((current) => {
              if (
                getGeoLookupKey(Number(current.latitude), Number(current.longitude)) !== lookupKey
              ) {
                return current
              }

              return {
                ...current,
                locationName: name,
                locationDetail: `${name} | ${current.accuracy}`,
              }
            })
          })
        }
      },
      (error) => {
        setGeo((current) => ({
          ...current,
          ready: false,
          message: error.message || 'GPS permission needed',
        }))
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  function handleFaceVerificationFailure(message: string) {
    setCapturedFile(null)
    setFaceRecAttempts((current) => {
      const nextAttempts = current + 1
      if (nextAttempts >= MAX_FACE_REC_ATTEMPTS) {
        setFaceRecMode('fallback')
        setFaceRecMessage('Verifikasi wajah gagal 2x. Lanjutkan dengan capture foto manual.')
      } else {
        setFaceRecMode('detecting')
        setFaceRecMessage(
          `${message} (${nextAttempts}/2). Foto gagal dibuang. Tekan Verify Wajah untuk coba lagi.`
        )
      }
      return nextAttempts
    })
  }

  async function runFaceRecognition() {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      setFaceRecMessage('Kamera belum siap. Membuka kamera ulang...')
      setFaceRecMode('loading')
      await reopenCameraForRetry({ resetAttempts: false })
      return
    }

    setFaceRecMode('verifying')
    setFaceRecMessage('⚡ Memverifikasi dengan Face Recog by Afi...')
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12000)

    try {
      const video = videoRef.current
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 640
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas context failed')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85)

      const response = await fetch('/api/mobile/v2/face-recognition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: data.employee?.id,
          siteId: data.employee?.siteId || 1,
          eventType: nextType === 'checked-in' || nextType === 'checked-out' ? nextType : 'auto',
          imageDataUrl,
          latitude: geo.latitude ? Number(geo.latitude) : 0,
          longitude: geo.longitude ? Number(geo.longitude) : 0,
          accuracy: 10,
          clientRequestId: crypto.randomUUID(),
        }),
        signal: controller.signal,
      })

      const result = await response.json().catch(() => null)
      if (!response.ok || !result) {
        handleFaceVerificationFailure(result?.error?.message || 'Server face recognition tidak merespons')
        return
      }

      if (result.verified) {
        setFaceRecMode('success')
        setFaceRecMessage(`✓ Selamat Datang, ${result.employee?.name || data.employee?.name}! Absensi berhasil.`)
        navigator.vibrate?.([100, 50, 200])
        if (result.attendanceRecord) {
          setAttendanceLogs((current) => [
            {
              ...result.attendanceRecord,
              eventTime: new Date(result.attendanceRecord.eventTime),
              photoUrl: null,
              latitude: geo.latitude,
              longitude: geo.longitude,
            },
            ...current,
          ])
        }
        startTransition(() => router.refresh())
        return
      }

      // Verification failed
      handleFaceVerificationFailure(result?.error?.message || 'Wajah tidak cocok dengan data biometrik')
    } catch (error) {
      handleFaceVerificationFailure(
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Server memproses terlalu lama. Coba lagi.'
          : 'Error server face recognition'
      )
    } finally {
      window.clearTimeout(timeout)
    }
  }

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraReady(false)
      setCameraError('Camera not supported. Upload selfie instead.')
      return
    }

    try {
      setCameraReady(false)
      setCameraError('')
      setCameraPermissionOpen(false)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      const cameraTimeout = new Promise<never>((_, reject) => {
        window.setTimeout(
          () => reject(new Error('Camera start timeout. Tap coba buka kamera lagi.')),
          8000
        )
      })
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 640 },
          },
        }),
        cameraTimeout,
      ])

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await Promise.race([
          videoRef.current.play(),
          new Promise<never>((_, reject) => {
            window.setTimeout(
              () => reject(new Error('Camera preview timeout. Tap coba buka kamera lagi.')),
              5000
            )
          }),
        ])
      }
      setCameraReady(true)
      setCameraError('')
      setCameraPermissionOpen(false)

      // Start face recognition if employee has face registered
      if (!data.employee?.faceRegisteredAt) {
        setFaceRecMode('fallback')
        setFaceRecMessage(
          'Wajah belum terdaftar di database production. Registrasi wajah dulu untuk mengaktifkan Face Recognition.'
        )
      } else {
        setFaceRecMode('detecting')
        setFaceRecMessage('Kamera siap. Model Face Recognition diproses di server.')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Camera permission needed.'
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setCameraReady(false)
      setCameraError(message)
      setCameraPermissionOpen(false)
      setFaceRecMode('fallback')
      setFaceRecMessage('Kamera belum terbuka. Coba ulang kamera atau upload selfie.')
    }
  }

  useEffect(() => {
    let cancelled = false

    void startCamera().then(() => {
      if (cancelled) {
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    })

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (faceRecLoopRef.current) cancelAnimationFrame(faceRecLoopRef.current)
    }
  }, [])

  useEffect(() => {
    if (!capturedFile) {
      setCapturePreview('')
      return
    }

    const previewUrl = URL.createObjectURL(capturedFile)
    setCapturePreview(previewUrl)

    return () => URL.revokeObjectURL(previewUrl)
  }, [capturedFile])

  async function captureFrame() {
    const video = videoRef.current
    if (!video || video.readyState < 2) {
      throw new Error('Camera belum siap. Upload/capture foto dulu.')
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 720
    canvas.height = video.videoHeight || 960

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Browser tidak bisa membuat capture canvas.')
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.88)
    })

    if (!blob) {
      throw new Error('Photo capture failed.')
    }

    const file = new File([blob], `mobile-attendance-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    })

    setCapturedFile(file)
    return file
  }

  async function reopenCameraForRetry(options: { resetAttempts?: boolean } = {}) {
    setCapturedFile(null)
    if (options.resetAttempts) setFaceRecAttempts(0)
    setFaceRecMode('loading')
    setFaceRecMessage('Membuka kamera ulang...')
    await new Promise((resolve) => window.setTimeout(resolve, 80))
    await startCamera()
  }

  async function handleCaptureClick() {
    setSubmitError('')
    setSubmitMessage('')

    try {
      if (!videoRef.current || videoRef.current.readyState < 2) {
        await reopenCameraForRetry({ resetAttempts: false })
        await new Promise((resolve) => window.setTimeout(resolve, 250))
      }
      await captureFrame()
      setSubmitMessage('Face capture ready.')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Photo capture failed.')
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (!file) return

    setCapturedFile(file)
    setSubmitError('')
    setSubmitMessage('Selfie upload ready.')
  }

  async function handleSubmit() {
    setSubmitError('')
    setSubmitMessage('')

    if (!data.employee) {
      setSubmitError('Employee belum tersedia untuk akun ini.')
      return
    }

    if (!selectedShiftOption) {
      setSubmitError('Shift attendance belum tersedia. Set Master Data dulu.')
      return
    }

    let file = capturedFile
    if (!file && cameraReady) {
      try {
        file = await captureFrame()
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'Capture foto dulu.')
        return
      }
    }

    if (!file) {
      setSubmitError('Foto wajah wajib ada. Capture atau upload selfie.')
      return
    }

    const payload: AttendanceSyncPayload = {
      type: nextType,
      latitude: geo.latitude,
      longitude: geo.longitude,
      locationName,
      shiftCode: selectedShiftOption.value,
      workMode,
      attendanceContext: 'Regular mobile attendance',
      overtimeMinutes: '0',
      operationalNote: geo.ready
        ? `${geo.message}; ${geo.accuracy}`
        : `GPS fallback: ${geo.message}`,
      photo: await fileToPayload(file),
    }
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/mobile/sync/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = (await response.json()) as {
        success: boolean
        error?: string
        message?: string
        record?: AttendanceLog
      }

      if (!response.ok || !result.success) {
        setSubmitError(result.error || result.message || 'Attendance recording failed.')
        return
      }

      setCapturedFile(null)
      const record = result.record
      if (record) {
        const normalizedRecord: AttendanceLog = {
          ...record,
          id: record.id,
          eventType: record.eventType,
          eventTime: new Date(record.eventTime),
          status: record.status,
          locationNote: record.locationNote,
          photoUrl: record.photoUrl ?? null,
          latitude: record.latitude ?? null,
          longitude: record.longitude ?? null,
        }

        setAttendanceLogs((current) => [
          normalizedRecord,
          ...current.filter((log) => log.id !== record.id),
        ])
      }
      const punctualityDetail = getPunctualityDetail(record?.locationNote)
      setSubmitMessage(
        `${getEventLabel(nextType)} recorded.${punctualityDetail ? ` ${punctualityDetail.replace('Kehadiran: ', '')}.` : ''} Website attendance record akan refresh.`
      )
      startTransition(() => router.refresh())
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Attendance recording failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!data.employee) {
    return (
      <div className="rounded-[0.75rem] bg-white p-5 shadow-[0_16px_36px_rgba(8,32,51,0.08)]">
        <p className="text-[10px] font-black text-[#486275] uppercase">Attendance blocked</p>
        <h1 className="mt-2 text-2xl font-black text-[#003461]">Employee belum tersambung</h1>
        <p className="mt-2 text-sm leading-6 font-semibold text-[#486275]">
          Akun login belum punya employee record. Hubungkan email user dengan employee di Security /
          User Management.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="space-y-1">
        <h1 className="font-display text-2xl font-black text-[#003461] uppercase">
          Identity Verification
        </h1>
        <p className="text-[11px] font-bold text-[#486275]">
          Secure entry protocol required for facility access
        </p>
      </section>

      <section className="flex items-center justify-between rounded-[0.65rem] bg-[#e6f6ff] px-4 py-2 text-[10px] font-black text-[#213f56] uppercase shadow-[inset_0_0_0_1px_rgba(0,52,97,0.04)]">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#004b87]" />
          System online
        </span>
        <span className="flex items-center gap-1.5">
          <Wifi className="size-3" />
          {geo.ready ? geo.accuracy : 'Awaiting GPS'}
        </span>
      </section>

      {/* ─── FACE RECOG BY AFI HERO CARD ─── */}
      <section className="overflow-hidden rounded-2xl bg-[#031b33] p-5 text-white shadow-xl border border-[#003461] space-y-4">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-[#005bb5] text-white shadow-md">
              <ScanFace className="size-5" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">Face Recog by Afi</h2>
              <p className="text-[10px] font-bold text-sky-300">Fast Auto-Identification</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-[10px] font-black text-emerald-300 uppercase tracking-wide">
            ● Aktif
          </span>
        </div>

        {/* User Card Info */}
        <div className="rounded-xl bg-[#002447] border border-white/10 p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-[#004280] flex items-center justify-center border border-white/20 text-sky-200">
              <UserCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs font-black text-white">{data.employee?.name}</p>
              <p className="text-[11px] font-bold text-sky-200 font-mono">
                SN: {data.employee?.employeeSn || data.employee?.id}
              </p>
            </div>
          </div>

          <div>
            {data.employee?.faceRarayRegisteredAt || data.employee?.faceRegisteredAt ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/25 border border-emerald-400/50 px-2.5 py-1 text-[10px] font-bold text-emerald-200">
                ✓ Wajah Terdaftar
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/25 border border-amber-400/50 px-2.5 py-1 text-[10px] font-bold text-amber-200">
                ⚠️ Belum Terdaftar
              </span>
            )}
          </div>
        </div>

        {/* ─── CHECK IN / CHECK OUT BUTTONS AT THE TOP ─── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => void startCameraAndVerify('checked-in')}
            className="flex items-center justify-center gap-2 min-h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-xs font-black text-white uppercase shadow-md active:scale-[0.98] transition-all hover:brightness-110"
          >
            <LogIn className="size-4" /> Check In
          </button>

          <button
            type="button"
            onClick={() => void startCameraAndVerify('checked-out')}
            className="flex items-center justify-center gap-2 min-h-12 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-xs font-black text-white uppercase shadow-md active:scale-[0.98] transition-all hover:brightness-110"
          >
            <LogOut className="size-4" /> Check Out
          </button>
        </div>

        {/* Main Verification Start Button (Camera Auto) */}
        <button
          type="button"
          onClick={() => void startCameraAndVerify()}
          className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-[#005bb5] via-[#006bd6] to-[#0077e6] px-5 text-xs font-black text-white uppercase tracking-wider shadow-lg shadow-blue-950/60 active:scale-[0.98] transition-all hover:brightness-110"
        >
          <ScanFace className="size-5 animate-pulse" />
          Mulai Verifikasi Wajah (Kamera Auto)
        </button>

        {/* Secondary Action Links with HIGH CONTRAST */}
        <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-[11px] font-black text-sky-100 hover:bg-white/20 transition-colors"
          >
            <History className="size-3.5 text-sky-300" />
            History Registrasi
          </button>

          <Link
            href={`/mobile/attendance/face-v2/register?employeeId=${data.employee?.id}&reregister=true`}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-[11px] font-black text-sky-100 hover:bg-white/20 transition-colors"
          >
            <RefreshCw className="size-3.5 text-sky-300" />
            Registrasi Wajah Ulang
          </Link>
        </div>
      </section>

      {/* ─── LARGE & CLEAR CAMERA VERIFICATION DISPLAY ─── */}
      {isCameraLive && (
        <section className="space-y-3">
          <div className="relative w-full max-w-md mx-auto aspect-[3/4] min-h-[380px] overflow-hidden rounded-3xl bg-slate-950 shadow-2xl border-2 border-[#005bb5]">
            <video
              ref={videoRef}
              className="h-full w-full object-cover scale-x-[-1]"
              playsInline
              muted
              autoPlay
            />

            {/* Large Oval Target Guide */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-[65%] w-[60%] rounded-[50%] border-4 border-dashed border-sky-400/90 shadow-[0_0_30px_rgba(0,149,255,0.4)] animate-pulse" />
            </div>

            {/* Top Status Bar Overlay */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between rounded-full bg-slate-900/80 px-4 py-2 text-xs font-black text-white backdrop-blur-md border border-white/10">
              <span className="flex items-center gap-2 text-sky-300">
                <ScanFace className="size-4 animate-spin" />
                Mode: {nextType === 'checked-in' ? 'Check In' : 'Check Out'}
              </span>
              <button
                type="button"
                onClick={stopCameraStream}
                className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold text-white hover:bg-white/30"
              >
                Tutup Kamera
              </button>
            </div>

            {/* Status Message Overlay */}
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-white/95 p-3 text-center backdrop-blur-md shadow-lg space-y-0.5">
              <p className="text-xs font-black text-[#003461]">{faceRecMessage || 'Posisikan wajah tepat di dalam oval'}</p>
            </div>
          </div>

          {/* ⚡ DIRECT VERIFICATION BUTTON PLACED DIRECTLY BELOW CAMERA FRAME (DI BAWAH MUKA) */}
          <button
            type="button"
            onClick={() => void runFaceRecognition()}
            disabled={faceRecMode === 'verifying'}
            className="flex min-h-14 w-full max-w-md mx-auto items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#005bb5] via-[#006bd6] to-[#0077e6] px-5 text-sm font-black text-white uppercase tracking-wider shadow-xl shadow-blue-900/30 active:scale-[0.98] transition-all hover:brightness-110 disabled:opacity-75"
          >
            {faceRecMode === 'verifying' ? (
              <>
                <Loader2 className="size-5 animate-spin text-white" />
                Memverifikasi Wajah...
              </>
            ) : (
              <>
                <ScanFace className="size-5 text-sky-200 animate-pulse" />
                Verifikasi Wajah Sekarang
              </>
            )}
          </button>
        </section>
      )}

      {/* History Modal Popup */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <History className="size-5 text-[#005bb5]" />
                <h3 className="text-sm font-black text-slate-900">History Registrasi Wajah</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="size-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Informasi Karyawan</p>
                <p className="font-bold text-slate-900">{data.employee?.name}</p>
                <p className="text-slate-500 font-mono">SN: {data.employee?.employeeSn || data.employee?.id}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Engine Biometrik</p>
                <p className="font-bold text-[#005bb5]">Face Recog by Afi</p>
                <p className="text-slate-500 font-mono text-[11px]">Face ID: emp-{data.employee?.employeeSn || data.employee?.id}</p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Status & Tanggal Registrasi</p>
                {data.employee?.faceRarayRegisteredAt || data.employee?.faceRegisteredAt ? (
                  <div className="flex items-center gap-1.5 font-bold text-green-700">
                    <CheckCircle2 className="size-4" />
                    <span>
                      Terdaftar pada{' '}
                      {new Date(data.employee?.faceRarayRegisteredAt || data.employee?.faceRegisteredAt || '').toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                ) : (
                  <p className="font-bold text-amber-700">Belum terdaftar di database biometrik.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Link
                href={`/mobile/attendance/face-v2/register?employeeId=${data.employee?.id}&reregister=true`}
                onClick={() => setShowHistoryModal(false)}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#005bb5] text-xs font-black text-white uppercase active:scale-[0.98]"
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

      <Link
        href="/mobile/attendance/permission"
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[0.7rem] bg-white px-4 text-xs font-black text-[#003461] uppercase shadow-[inset_0_0_0_1px_rgba(0,52,97,0.08)] active:scale-[0.98]"
      >
        <Upload className="size-4" />
        Izin / Sakit
      </Link>

      <section className="overflow-hidden rounded-[0.75rem] bg-white p-4 shadow-[0_14px_30px_rgba(8,32,51,0.08)]">
        <div className="mb-4 flex items-center justify-between">
          <p className="flex items-center gap-2 text-[10px] font-black text-[#003461] uppercase">
            <MapPin className="size-3.5" />
            Location Data
          </p>
          <span className="rounded-full bg-[#e6f6ff] px-2 py-1 text-[9px] font-black text-[#004b87] uppercase">
            {geo.ready ? 'Secure' : 'Pending'}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <span className="text-[10px] font-black text-[#486275] uppercase">Site</span>
            <span className="text-right text-sm font-black text-[#071e27]">{siteName}</span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <span className="text-[10px] font-black text-[#486275] uppercase">Nama Lokasi</span>
            <span className="max-w-[220px] text-right text-xs font-bold text-[#071e27]">
              {locationName}
            </span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <span className="text-[10px] font-black text-[#486275] uppercase">Coordinates</span>
            <span className="text-right text-xs font-bold text-[#071e27]">
              {buildCoordinateLabel(geo)}
            </span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <span className="text-[10px] font-black text-[#486275] uppercase">Shift / Roster</span>
            <span className="text-right text-xs font-bold text-[#071e27]">
              {selectedShiftOption
                ? `${selectedShiftOption.label} · ${selectedShiftOption.window}`
                : 'No active shift'}
            </span>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-[0.65rem] bg-[#60707b]">
          <div className="relative h-[74px] opacity-95">
            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(207,230,242,0.38)_0_34%,rgba(230,246,255,0.75)_34%_54%,rgba(122,163,185,0.28)_54%_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,52,97,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(0,52,97,0.08)_1px,transparent_1px)] bg-[size:18px_18px]" />
            <span
              className="absolute flex size-4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#003f78] shadow-[0_0_0_5px_rgba(0,52,97,0.2)]"
              style={miniMapPinStyle}
            >
              <span className="size-1.5 rounded-full bg-white" />
            </span>
          </div>
        </div>
      </section>

      <p className="text-center text-[10px] font-semibold text-[#486275] pt-2">
        Biometric data encrypted and stored securely per protocol.
      </p>

      <section className="space-y-3 pb-2">
        <p className="flex items-center gap-2 text-[10px] font-black text-[#486275] uppercase">
          <History className="size-3.5" />
          Today Attendance Record
        </p>
        {attendanceLogs.length > 0 ? (
          attendanceLogs.slice(0, 4).map((log) => (
            <article
              key={log.id}
              className="rounded-[0.75rem] bg-white p-3 shadow-[0_10px_24px_rgba(8,32,51,0.07)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-[#071e27]">
                    {getEventLabel(log.eventType)}
                  </p>
                  <p className="truncate text-[11px] font-semibold text-[#486275]">
                    {firstLocationLine(log.locationNote)}
                  </p>
                  {getPunctualityDetail(log.locationNote) ? (
                    <p
                      className={cn(
                        'mt-1 text-[10px] font-black',
                        getPunctualityDetail(log.locationNote)?.includes('Terlambat')
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      )}
                    >
                      {getPunctualityDetail(log.locationNote)?.replace('Kehadiran: ', '')}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-[#003461]">
                    {formatLogTime(log.eventTime)}
                  </p>
                  <p className="text-[10px] font-bold text-[#486275]">
                    {getStatusLabel(log.status)}
                  </p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[0.75rem] bg-white p-4 text-center text-xs font-bold text-[#486275] shadow-[0_10px_24px_rgba(8,32,51,0.07)]">
            Belum ada attendance record hari ini.
          </div>
        )}
      </section>

      {cameraPermissionOpen ? (
        <div className="fixed inset-0 z-50 flex items-end bg-[#071e27]/55 px-4 pb-5 backdrop-blur-sm">
          <div className="w-full rounded-[0.75rem] bg-white p-4 shadow-[0_20px_50px_rgba(8,32,51,0.25)]">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f4ddce] text-[#5a2200]">
                <AlertTriangle className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black text-[#003461] uppercase">Photo access denied</p>
                <p className="mt-1 text-xs leading-5 font-bold text-[#486275]">
                  Browser block camera. Tap icon gembok / Site settings, ubah Camera ke Allow, lalu
                  coba lagi.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={() => void startCamera()}
                className="min-h-12 rounded-[0.65rem] bg-gradient-to-br from-[#003461] to-[#004b87] px-3 text-[11px] font-black text-white uppercase"
              >
                Coba allow lagi
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCameraPermissionOpen(false)}
              className="mt-3 min-h-11 w-full rounded-[0.65rem] bg-[#f3faff] px-3 text-[11px] font-black text-[#486275] uppercase"
            >
              Tutup
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
