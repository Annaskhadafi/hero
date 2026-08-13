'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ScanFace,
  RefreshCw,
  Zap,
} from 'lucide-react'

type RegState = 'idle' | 'camera' | 'processing' | 'success' | 'error'

function FaceV2RegisterForm() {
  const searchParams = useSearchParams()
  const employeeId = Number(searchParams.get('employeeId') || '0')
  const siteId = Number(searchParams.get('siteId') || '1')
  const isReregister = searchParams.get('reregister') === 'true'

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [state, setState] = useState<RegState>('idle')
  const [error, setError] = useState('')
  const [statusMsg, setStatusMsg] = useState('')
  const [registeredAt, setRegisteredAt] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    setState('camera')
    setError('')
    setStatusMsg('Mengaktifkan kamera...')
    setCameraReady(false)

    try {
      stopCamera()
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraReady(true)
      setStatusMsg('Kamera siap. Posisikan wajah di dalam oval, lalu tekan tombol daftarkan.')
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
  }, [stopCamera])

  const captureAndRegister = useCallback(async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !cameraReady) {
      setError('Kamera belum siap.')
      return
    }

    setState('processing')
    setStatusMsg('Mengambil gambar wajah...')

    // Capture frame from video
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setError('Gagal mengakses canvas.')
      setState('camera')
      return
    }
    ctx.drawImage(video, 0, 0)
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9)

    if (imageDataUrl === 'data:,') {
      setError('Gagal capture gambar. Pastikan kamera sudah aktif.')
      setState('camera')
      return
    }

    setStatusMsg('Mendaftarkan wajah ke sistem...')

    try {
      const response = await fetch('/api/mobile/v2/face-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          imageDataUrl,
          force: isReregister,
        }),
      })

      const data = await response.json()

      if (response.status === 409) {
        // Already registered — force overwrite
        setStatusMsg('Wajah sudah terdaftar. Memperbarui registrasi...')
        const forceResponse = await fetch('/api/mobile/v2/face-registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId,
            imageDataUrl,
            force: true,
          }),
        })
        const forceData = await forceResponse.json()
        if (!forceResponse.ok) {
          setError(forceData?.error?.message || 'Gagal memperbarui registrasi.')
          setState('camera')
          return
        }
        stopCamera()
        setRegisteredAt(forceData.registeredAt)
        setState('success')
        return
      }

      if (!response.ok) {
        setError(data?.error?.message || 'Gagal mendaftarkan wajah.')
        setState('camera')
        return
      }

      stopCamera()
      setRegisteredAt(data.registeredAt)
      setState('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal terhubung ke server.')
      setState('camera')
    }
  }, [employeeId, isReregister, cameraReady, stopCamera])

  useEffect(() => {
    if (state === 'camera' && videoRef.current && streamRef.current) {
      const video = videoRef.current
      const stream = streamRef.current
      if (video.srcObject !== stream) {
        video.srcObject = stream
      }
      if (video.paused) {
        video.play().catch(() => {})
      }
    }
  }, [state])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  // --- IDLE STATE ---
  if (state === 'idle') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-6 bg-slate-50">
        <div className="w-full max-w-sm">
          <Link href="/mobile/attendance" className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <ArrowLeft className="size-3.5" /> Kembali
          </Link>

          <div className="flex flex-col items-center gap-4 text-center">
            <div className="size-24 rounded-full bg-violet-100 flex items-center justify-center">
              <ScanFace className="size-12 text-violet-600" />
            </div>

            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center justify-center gap-1.5">
                <Zap className="size-4 text-violet-600" />
                {isReregister ? 'Registrasi Ulang Wajah V2' : 'Registrasi Wajah V2'}
              </h1>
              <p className="text-xs font-medium text-slate-400 mt-1">
                Didukung Face Recog by Afi
              </p>
            </div>

            <div className="w-full rounded-2xl bg-white border border-slate-100 p-4 text-left space-y-2">
              <p className="text-xs font-bold text-slate-700">Tips untuk hasil terbaik:</p>
              <ul className="text-[11px] text-slate-500 space-y-1 font-medium">
                <li>• Pastikan pencahayaan cukup (tidak gelap/silau)</li>
                <li>• Posisikan wajah di tengah oval</li>
                <li>• Jangan menggunakan masker atau kacamata gelap</li>
                <li>• Ambil foto di kondisi normal (tidak tertunduk)</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={startCamera}
              className="w-full min-h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-sm font-black text-white uppercase shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Camera className="size-5" /> Mulai Registrasi
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- ERROR STATE ---
  if (state === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-6 bg-slate-50">
        <div className="size-20 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle className="size-10 text-red-600" />
        </div>
        <div className="text-center">
          <p className="text-base font-black text-red-700">Gagal Membuka Kamera</p>
          <p className="text-xs font-medium text-slate-500 mt-1">{error}</p>
        </div>
        <button
          type="button"
          onClick={startCamera}
          className="min-h-12 w-full max-w-xs rounded-xl bg-violet-600 text-xs font-black text-white uppercase flex items-center justify-center gap-2"
        >
          <RefreshCw className="size-4" /> Coba Lagi
        </button>
        <Link href="/mobile/attendance" className="text-xs font-bold text-slate-400">
          ← Kembali
        </Link>
      </div>
    )
  }

  // --- SUCCESS STATE ---
  if (state === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 py-6 bg-slate-50">
        <div className="relative">
          <div className="size-24 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="size-12 text-green-600" />
          </div>
          <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-violet-600 flex items-center justify-center">
            <Zap className="size-4 text-white" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-xl font-black text-green-700">
            {isReregister ? 'Wajah Berhasil Diperbarui!' : 'Wajah Berhasil Terdaftar!'}
          </p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            Face Recog by Afi
          </p>
          {registeredAt && (
            <p className="text-sm font-bold text-slate-600 mt-2">
              {new Date(registeredAt).toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          )}
          <p className="text-xs font-medium text-slate-400 mt-1">
            Anda sekarang dapat menggunakan Absensi V2.
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full max-w-xs">
          <Link
            href="/mobile/attendance"
            className="flex items-center justify-center gap-2 min-h-12 rounded-2xl bg-slate-900 text-xs font-black text-white uppercase"
          >
            <Zap className="size-4" /> Mulai Absensi V2
          </Link>
          <Link
            href="/mobile/attendance"
            className="flex items-center justify-center min-h-10 rounded-xl bg-slate-100 text-xs font-bold text-slate-600"
          >
            Ke Halaman Absensi
          </Link>
        </div>
      </div>
    )
  }

  // --- CAMERA + PROCESSING STATE ---
  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 px-4 py-4">
      <div className="w-full max-w-sm">
        <Link href="/mobile/attendance" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <ArrowLeft className="size-3.5" /> Kembali
        </Link>
        <h1 className="text-lg font-black text-slate-900 flex items-center gap-1.5 mb-1">
          <Zap className="size-4 text-violet-600" />
          {isReregister ? 'Registrasi Ulang Wajah V2' : 'Registrasi Wajah V2'}
        </h1>
        <p className="text-[11px] text-slate-400 font-medium mb-4">
          {statusMsg}
        </p>
      </div>

      {/* Camera preview */}
      <div className="relative w-full max-w-sm aspect-[3/4] overflow-hidden rounded-3xl bg-black shadow-xl">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Oval face guide */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[65%] w-[55%] rounded-[50%] border-[3px] border-white/70" />
        </div>

        {/* Processing overlay */}
        {state === 'processing' && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-10 text-violet-400 animate-spin" />
            <p className="text-white text-xs font-bold">{statusMsg}</p>
          </div>
        )}
      </div>

      {/* Hidden canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {error && (
        <p className="mt-3 text-center text-xs font-bold text-red-600 max-w-sm">{error}</p>
      )}

      {/* Capture button */}
      <div className="mt-4 w-full max-w-sm flex flex-col gap-2">
        <button
          type="button"
          onClick={captureAndRegister}
          disabled={!cameraReady || state === 'processing'}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 text-sm font-black text-white uppercase shadow-lg disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {state === 'processing' ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Mendaftarkan...
            </>
          ) : (
            <>
              <ScanFace className="size-5" />
              Daftarkan Wajah
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            stopCamera()
            setState('idle')
          }}
          className="flex min-h-10 w-full items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600"
        >
          Batal
        </button>
      </div>
    </div>
  )
}

export default function FaceV2RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="size-8 text-violet-600 animate-spin" />
      </div>
    }>
      <FaceV2RegisterForm />
    </Suspense>
  )
}
