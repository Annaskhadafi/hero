'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, AlertCircle, ArrowLeft, UserPlus, Camera } from 'lucide-react'

type RegState = 'idle' | 'camera' | 'processing' | 'success' | 'error'

export default function FaceRegistrationPage() {
  const searchParams = useSearchParams()
  const employeeId = Number(searchParams.get('employeeId') || '0')
  const siteId = Number(searchParams.get('siteId') || '1')

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const faceapiRef = useRef<any>(null)

  const [state, setState] = useState<RegState>('idle')
  const [error, setError] = useState('')
  const [registeredAt, setRegisteredAt] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  // Start camera directly (same approach as working attendance page)
  const startCamera = useCallback(async () => {
    setState('camera')
    setError('')
    setStatusMsg('Mengaktifkan kamera...')

    try {
      // Stop any existing stream
      streamRef.current?.getTracks().forEach((t) => t.stop())

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraReady(true)
      setStatusMsg('Kamera aktif. Memuat model...')

      // Load face-api models in background
      try {
        const faceapi = await import('face-api.js')
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models')
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models')
        faceapiRef.current = faceapi
        setModelLoaded(true)
        setStatusMsg('Siap! Tekan tombol untuk capture wajah.')
      } catch {
        setStatusMsg('Model gagal dimuat. Tekan capture untuk coba lagi.')
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Aktifkan di pengaturan browser.'
          : err instanceof Error && err.name === 'NotReadableError'
            ? 'Kamera sedang digunakan aplikasi lain.'
            : 'Gagal mengakses kamera.'
      setError(msg)
      setState('error')
    }
  }, [])

  // Capture face and extract embedding
  const captureAndRegister = useCallback(async () => {
    const video = videoRef.current
    const faceapi = faceapiRef.current

    if (!video || !faceapi) {
      setError('Model belum siap. Tunggu sebentar.')
      return
    }

    setState('processing')
    setStatusMsg('Mendeteksi wajah...')

    try {
      // Detect face and extract descriptor
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.SsdMobilenetv1Options())
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        setError('Wajah tidak terdeteksi. Pastikan wajah terlihat jelas di kamera.')
        setState('camera')
        return
      }

      const embedding = Array.from(detection.descriptor) as number[]
      setStatusMsg('Mendaftarkan wajah...')

      // Send to API
      const response = await fetch('/api/mobile/face-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, embedding }),
      })

      const data = await response.json()

      if (response.status === 409) {
        // Already registered - force overwrite
        const forceResponse = await fetch('/api/mobile/face-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, embedding, force: true }),
        })
        const forceData = await forceResponse.json()
        if (!forceResponse.ok) {
          setError(forceData?.error?.message || 'Gagal mendaftarkan wajah.')
          setState('camera')
          return
        }
        setRegisteredAt(forceData.registeredAt)
        setState('success')
        // Stop camera
        streamRef.current?.getTracks().forEach((t) => t.stop())
        return
      }

      if (!response.ok) {
        setError(data?.error?.message || 'Gagal mendaftarkan wajah.')
        setState('camera')
        return
      }

      setRegisteredAt(data.registeredAt)
      setState('success')
      // Stop camera
      streamRef.current?.getTracks().forEach((t) => t.stop())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal terhubung ke server.')
      setState('camera')
    }
  }, [employeeId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // Idle state
  if (state === 'idle') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-6">
        <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-blue-50">
          <UserPlus className="size-10 text-blue-600" />
        </div>
        <h1 className="text-xl font-black text-slate-900">Registrasi Wajah</h1>
        <p className="mt-2 text-center text-xs font-medium text-slate-500">
          Daftarkan wajah Anda untuk absensi biometrik. Pastikan pencahayaan cukup.
        </p>
        <button
          type="button"
          onClick={startCamera}
          className="mt-6 min-h-14 w-full max-w-xs rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 px-4 text-sm font-black text-white uppercase shadow-lg active:scale-[0.98]"
        >
          Mulai Registrasi
        </button>
        <Link href="/mobile/attendance" className="mt-4 text-xs font-bold text-slate-500">
          ← Kembali ke Absensi
        </Link>
      </div>
    )
  }

  // Error state
  if (state === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-6">
        <div className="flex size-16 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="size-8 text-red-600" />
        </div>
        <p className="text-center text-sm font-bold text-red-700">{error}</p>
        <button
          type="button"
          onClick={startCamera}
          className="min-h-12 w-full max-w-xs rounded-xl bg-blue-600 px-4 text-xs font-black text-white uppercase"
        >
          Coba Lagi
        </button>
        <Link href="/mobile/attendance" className="text-xs font-bold text-slate-500">
          ← Kembali
        </Link>
      </div>
    )
  }

  // Success state
  if (state === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-6">
        <div className="flex size-20 items-center justify-center rounded-full bg-green-50">
          <CheckCircle2 className="size-10 text-green-600" />
        </div>
        <p className="text-lg font-black text-green-700">Wajah Berhasil Terdaftar!</p>
        {registeredAt && (
          <p className="text-sm font-medium text-slate-600">
            {new Date(registeredAt).toLocaleString('id-ID')}
          </p>
        )}
        <p className="text-xs font-medium text-slate-500">
          Anda sekarang bisa absensi dengan face recognition.
        </p>
        <Link
          href="/mobile/attendance"
          className="mt-4 flex min-h-12 w-full max-w-xs items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-black text-white uppercase"
        >
          Ke Halaman Absensi
        </Link>
      </div>
    )
  }

  // Camera + capture state
  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-6">
      <div className="mb-4 w-full max-w-sm">
        <Link
          href="/mobile/attendance"
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500"
        >
          <ArrowLeft className="size-3.5" /> Kembali
        </Link>
        <h1 className="text-xl font-black text-slate-900">Registrasi Wajah</h1>
      </div>

      {/* Camera preview */}
      <div className="relative aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted autoPlay />
        {/* Oval guide */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[65%] w-[50%] rounded-[50%] border-[3px] border-white/60" />
        </div>
      </div>

      {/* Status */}
      <p className="mt-3 text-center text-xs font-medium text-slate-600">{statusMsg}</p>
      {error && <p className="mt-2 text-center text-xs font-bold text-red-600">{error}</p>}

      {/* Capture button */}
      <button
        type="button"
        onClick={captureAndRegister}
        disabled={!cameraReady || !modelLoaded || state === 'processing'}
        className="mt-4 flex min-h-14 w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 px-4 text-sm font-black text-white uppercase shadow-lg active:scale-[0.98] disabled:opacity-50"
      >
        {state === 'processing' ? (
          <>
            <Loader2 className="size-5 animate-spin" /> Memproses...
          </>
        ) : (
          <>
            <Camera className="size-5" /> Capture & Daftarkan Wajah
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          streamRef.current?.getTracks().forEach((t) => t.stop())
          setState('idle')
        }}
        className="mt-3 text-xs font-bold text-slate-500"
      >
        Batal
      </button>
    </div>
  )
}
