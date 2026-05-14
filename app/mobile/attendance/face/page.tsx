'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, AlertCircle, LogIn, LogOut, ArrowLeft } from 'lucide-react'

import { cn } from '@/lib/utils'
import { FaceCapture } from '@/components/mobile/face-capture'
import { PhotoFallback } from '@/components/mobile/photo-fallback'

// ─── Types ───────────────────────────────────────────────────────────────────

type FlowState =
  | 'idle'
  | 'capturing'
  | 'verifying'
  | 'success'
  | 'failed'
  | 'fallback'
  | 'not-registered'
  | 'error'

type EventType = 'checked-in' | 'checked-out'

interface AttendanceRecord {
  id: number
  eventType: string
  eventTime: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_VERIFICATION_FAILURES = 3
const DEFAULT_SITE_ID = 1

// ─── Component ───────────────────────────────────────────────────────────────

export default function FaceAttendancePage() {
  const searchParams = useSearchParams()
  const employeeId = Number(searchParams.get('employeeId') || '0')
  const siteId = Number(searchParams.get('siteId') || DEFAULT_SITE_ID)

  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [eventType, setEventType] = useState<EventType | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successRecord, setSuccessRecord] = useState<AttendanceRecord | null>(null)
  const [failureCount, setFailureCount] = useState(0)
  const [gpsStatus, setGpsStatus] = useState<'pending' | 'success' | 'failed'>('pending')
  const [disabled, setDisabled] = useState(false)

  const gpsRef = useRef<{ latitude: number; longitude: number }>({ latitude: 0, longitude: 0 })
  const clientRequestIdRef = useRef<string>('')
  const abortControllerRef = useRef<AbortController | null>(null)

  // ─── GPS capture ─────────────────────────────────────────────────────────

  const captureGPS = useCallback(() => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            gpsRef.current = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }
            setGpsStatus('success')
          },
          () => {
            // Fallback to 0,0 on error
            gpsRef.current = { latitude: 0, longitude: 0 }
            setGpsStatus('failed')
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
        )
      } else {
        gpsRef.current = { latitude: 0, longitude: 0 }
        setGpsStatus('failed')
      }
    } catch {
      gpsRef.current = { latitude: 0, longitude: 0 }
      setGpsStatus('failed')
    }
  }, [])

  useEffect(() => {
    captureGPS()
  }, [captureGPS])

  // ─── EmployeeId guard ────────────────────────────────────────────────────

  useEffect(() => {
    const id = searchParams.get('employeeId')
    if (!id || Number(id) === 0) {
      setErrorMessage('Employee ID tidak ditemukan. Pastikan Anda sudah login.')
      setFlowState('error')
      setDisabled(true)
    }
  }, [searchParams])

  // ─── Abort fetch on unmount ──────────────────────────────────────────────

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  // ─── Start attendance flow ───────────────────────────────────────────────

  const startFlow = useCallback(
    (type: EventType) => {
      if (!employeeId) {
        setErrorMessage('Employee ID tidak ditemukan. Pastikan Anda sudah login.')
        setFlowState('error')
        return
      }

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setErrorMessage('Tidak ada koneksi internet. Periksa jaringan Anda dan coba lagi.')
        setFlowState('error')
        return
      }

      setEventType(type)
      setFlowState('capturing')
      setFailureCount(0)
      setErrorMessage('')
      setSuccessRecord(null)
      clientRequestIdRef.current = crypto.randomUUID()
      captureGPS()
    },
    [employeeId, captureGPS]
  )

  // ─── Handle embedding captured ──────────────────────────────────────────

  const handleEmbeddingCaptured = useCallback(
    async (embedding: number[]) => {
      if (!eventType) return

      setFlowState('verifying')

      try {
        abortControllerRef.current = new AbortController()
        const response = await fetch('/api/mobile/face-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_MOBILE_API_KEY || ''}`,
          },
          body: JSON.stringify({
            employeeId,
            embedding,
            siteId,
            eventType,
            latitude: gpsRef.current.latitude,
            longitude: gpsRef.current.longitude,
            clientRequestId: clientRequestIdRef.current,
          }),
          signal: abortControllerRef.current.signal,
        })

        const data = await response.json()

        // Handle not registered error
        if (response.status === 404 && data?.error?.code === 'NO_FACE_REGISTRATION') {
          setFlowState('not-registered')
          setErrorMessage('Wajah belum terdaftar. Silakan registrasi wajah terlebih dahulu.')
          return
        }

        // Handle other errors
        if (!response.ok) {
          const msg = data?.error?.message || 'Terjadi kesalahan saat verifikasi.'
          setErrorMessage(msg)
          setFlowState('error')
          return
        }

        // Verification success
        if (data.verified) {
          setSuccessRecord(data.attendanceRecord)
          setFlowState('success')

          // Haptic feedback on success
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(200)
          }

          return
        }

        // Verification failed — increment counter
        const newCount = failureCount + 1
        setFailureCount(newCount)

        if (newCount >= MAX_VERIFICATION_FAILURES) {
          setFlowState('fallback')
        } else {
          setErrorMessage(`Verifikasi gagal (${newCount}/${MAX_VERIFICATION_FAILURES}). Coba lagi.`)
          setFlowState('failed')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal terhubung ke server.'
        setErrorMessage(msg)
        setFlowState('error')
      }
    },
    [employeeId, siteId, eventType, failureCount]
  )

  // ─── Handle fallback triggered from FaceCapture ─────────────────────────

  const handleFallbackTriggered = useCallback(() => {
    setFlowState('fallback')
  }, [])

  // ─── Handle capture error ───────────────────────────────────────────────

  const handleCaptureError = useCallback((error: string) => {
    setErrorMessage(error)
    setFlowState('error')
  }, [])

  // ─── Handle photo fallback success ──────────────────────────────────────

  const handleFallbackSuccess = useCallback(
    (record: { id: number; eventType: string; eventTime: string }) => {
      setSuccessRecord(record)
      setFlowState('success')
    },
    []
  )

  // ─── Reset flow ─────────────────────────────────────────────────────────

  const resetFlow = useCallback(() => {
    abortControllerRef.current?.abort()
    setFlowState('idle')
    setEventType(null)
    setErrorMessage('')
    setSuccessRecord(null)
    setFailureCount(0)
  }, [])

  // ─── Retry after failure ────────────────────────────────────────────────

  const retryCapture = useCallback(() => {
    clientRequestIdRef.current = crypto.randomUUID()
    setFlowState('capturing')
    setErrorMessage('')
  }, [])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/mobile/attendance"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500"
        >
          <ArrowLeft className="size-3.5" />
          Kembali
        </Link>
        <h1 className="text-xl font-black text-slate-900">Absensi Wajah</h1>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Verifikasi identitas menggunakan pengenalan wajah
        </p>
      </div>

      {/* Idle state — show check-in / check-out buttons */}
      {flowState === 'idle' && (
        <div className="flex flex-1 flex-col gap-4">
          <button
            type="button"
            onClick={() => startFlow('checked-in')}
            disabled={disabled}
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-green-600 to-green-700 text-sm font-black text-white uppercase shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            <LogIn className="size-5" />
            Check In
          </button>

          <button
            type="button"
            onClick={() => startFlow('checked-out')}
            disabled={disabled}
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-sm font-black text-white uppercase shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            <LogOut className="size-5" />
            Check Out
          </button>

          <div className="mt-4 rounded-lg bg-slate-50 p-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase">Info</p>
            <p className="mt-1 text-xs font-medium text-slate-600">
              Pastikan wajah Anda sudah terdaftar sebelum melakukan absensi.
            </p>
            <Link
              href={`/mobile/attendance/face/register?employeeId=${employeeId}&siteId=${siteId}`}
              className="mt-2 inline-block text-xs font-bold text-blue-600"
            >
              Registrasi Wajah →
            </Link>
          </div>

          {/* GPS status indicator */}
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <span
              className={cn(
                'inline-block size-2 rounded-full',
                gpsStatus === 'success'
                  ? 'bg-green-500'
                  : gpsStatus === 'failed'
                    ? 'bg-red-500'
                    : 'animate-pulse bg-amber-500'
              )}
            />
            <span className="text-xs font-medium text-slate-600">
              {gpsStatus === 'success'
                ? 'Lokasi GPS berhasil diperoleh'
                : gpsStatus === 'failed'
                  ? 'GPS gagal — lokasi tidak tersedia'
                  : 'Mendapatkan lokasi GPS...'}
            </span>
          </div>
        </div>
      )}

      {/* Capturing state — show FaceCapture */}
      {flowState === 'capturing' && (
        <div className="flex flex-1 flex-col items-center gap-4">
          <div className="rounded-lg bg-blue-50 px-3 py-2 text-center">
            <p className="text-xs font-bold text-blue-700">
              {eventType === 'checked-in' ? 'Check In' : 'Check Out'} — Verifikasi Wajah
            </p>
          </div>
          <FaceCapture
            mode="verification"
            onEmbeddingCaptured={handleEmbeddingCaptured}
            onError={handleCaptureError}
            onFallbackTriggered={handleFallbackTriggered}
          />
          <button
            type="button"
            onClick={resetFlow}
            className="mt-4 rounded-lg bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600"
          >
            Batal
          </button>
        </div>
      )}

      {/* Verifying state — loading */}
      {flowState === 'verifying' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Loader2 className="size-10 animate-spin text-blue-600" />
          <p className="text-sm font-bold text-slate-600">Memverifikasi wajah...</p>
        </div>
      )}

      {/* Success state */}
      {flowState === 'success' && successRecord && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex size-20 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 className="size-10 text-green-600" />
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-green-700">
              {successRecord.eventType === 'checked-in' ? 'Check In' : 'Check Out'} Berhasil!
            </p>
            <p className="mt-2 text-sm font-medium text-slate-600">
              {new Date(successRecord.eventTime).toLocaleString('id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={resetFlow}
            className="mt-6 min-h-12 w-full rounded-xl bg-slate-900 px-4 text-xs font-black text-white uppercase"
          >
            Selesai
          </button>
        </div>
      )}

      {/* Failed state — allow retry */}
      {flowState === 'failed' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-amber-50">
            <AlertCircle className="size-8 text-amber-600" />
          </div>
          <p className="text-center text-sm font-bold text-amber-700">{errorMessage}</p>
          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={retryCapture}
              className="min-h-12 w-full rounded-xl bg-blue-600 px-4 text-xs font-black text-white uppercase"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={resetFlow}
              className="min-h-12 w-full rounded-xl bg-slate-100 px-4 text-xs font-black text-slate-700 uppercase"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Fallback state — show PhotoFallback */}
      {flowState === 'fallback' && eventType && (
        <div className="flex flex-1 flex-col items-center gap-4">
          <PhotoFallback
            employeeId={employeeId}
            siteId={siteId}
            eventType={eventType}
            latitude={gpsRef.current.latitude}
            longitude={gpsRef.current.longitude}
            onSuccess={handleFallbackSuccess}
            onError={(err) => {
              setErrorMessage(err)
              setFlowState('error')
            }}
          />
          <button
            type="button"
            onClick={resetFlow}
            className="mt-2 rounded-lg bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600"
          >
            Batal
          </button>
        </div>
      )}

      {/* Not registered state */}
      {flowState === 'not-registered' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-orange-50">
            <AlertCircle className="size-8 text-orange-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-orange-700">{errorMessage}</p>
          </div>
          <Link
            href={`/mobile/attendance/face/register?employeeId=${employeeId}&siteId=${siteId}`}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-xs font-black text-white uppercase"
          >
            Registrasi Wajah
          </Link>
          <button
            type="button"
            onClick={resetFlow}
            className="min-h-12 w-full rounded-xl bg-slate-100 px-4 text-xs font-black text-slate-700 uppercase"
          >
            Kembali
          </button>
        </div>
      )}

      {/* Generic error state */}
      {flowState === 'error' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="size-8 text-red-600" />
          </div>
          <p className="text-center text-sm font-bold text-red-700">{errorMessage}</p>
          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={retryCapture}
              className="min-h-12 w-full rounded-xl bg-blue-600 px-4 text-xs font-black text-white uppercase"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={resetFlow}
              className="min-h-12 w-full rounded-xl bg-slate-100 px-4 text-xs font-black text-slate-700 uppercase"
            >
              Kembali
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
