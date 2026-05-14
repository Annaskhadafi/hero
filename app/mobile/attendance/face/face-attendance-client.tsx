'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  LogIn,
  LogOut,
  ArrowLeft,
  ScanFace,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { FaceCapture } from '@/components/mobile/face-capture'
import { PhotoFallback } from '@/components/mobile/photo-fallback'

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

interface Props {
  employeeId: number
  siteId: number
  employeeName: string
  faceRegisteredAt: string | null
}

const MAX_VERIFICATION_FAILURES = 3

export function FaceAttendanceClientPage({
  employeeId,
  siteId,
  employeeName,
  faceRegisteredAt,
}: Props) {
  const router = useRouter()
  const [flowState, setFlowState] = useState<FlowState>('idle')
  const [eventType, setEventType] = useState<EventType | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successRecord, setSuccessRecord] = useState<{
    id: number
    eventType: string
    eventTime: string
  } | null>(null)
  const [failureCount, setFailureCount] = useState(0)

  const gpsRef = useRef<{ latitude: number; longitude: number }>({ latitude: 0, longitude: 0 })
  const clientRequestIdRef = useRef<string>('')

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          gpsRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude }
        },
        () => {
          gpsRef.current = { latitude: 0, longitude: 0 }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    }
  }, [])

  const startFlow = useCallback(
    (type: EventType) => {
      if (!faceRegisteredAt) {
        setFlowState('not-registered')
        setErrorMessage('Wajah belum terdaftar. Silakan registrasi wajah terlebih dahulu.')
        return
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setErrorMessage('Tidak ada koneksi internet.')
        setFlowState('error')
        return
      }
      setEventType(type)
      setFlowState('capturing')
      setFailureCount(0)
      setErrorMessage('')
      setSuccessRecord(null)
      clientRequestIdRef.current = crypto.randomUUID()
    },
    [faceRegisteredAt]
  )

  const handleEmbeddingCaptured = useCallback(
    async (embedding: number[]) => {
      if (!eventType) return
      setFlowState('verifying')

      try {
        const response = await fetch('/api/mobile/face-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employeeId,
            embedding,
            siteId,
            eventType,
            latitude: gpsRef.current.latitude,
            longitude: gpsRef.current.longitude,
            clientRequestId: clientRequestIdRef.current,
          }),
        })
        const data = await response.json()

        if (response.status === 404 && data?.error?.code === 'NO_FACE_REGISTRATION') {
          setFlowState('not-registered')
          setErrorMessage('Wajah belum terdaftar.')
          return
        }
        if (!response.ok) {
          setErrorMessage(data?.error?.message || 'Terjadi kesalahan.')
          setFlowState('error')
          return
        }
        if (data.verified) {
          setSuccessRecord(data.attendanceRecord)
          setFlowState('success')
          navigator.vibrate?.(200)
          return
        }

        const newCount = failureCount + 1
        setFailureCount(newCount)
        if (newCount >= MAX_VERIFICATION_FAILURES) {
          setFlowState('fallback')
        } else {
          setErrorMessage(`Verifikasi gagal (${newCount}/3). Coba lagi.`)
          setFlowState('failed')
        }
      } catch {
        setErrorMessage('Gagal terhubung ke server.')
        setFlowState('error')
      }
    },
    [employeeId, siteId, eventType, failureCount]
  )

  const resetFlow = useCallback(() => {
    setFlowState('idle')
    setEventType(null)
    setErrorMessage('')
    setSuccessRecord(null)
    setFailureCount(0)
  }, [])

  const retryCapture = useCallback(() => {
    clientRequestIdRef.current = crypto.randomUUID()
    setFlowState('capturing')
    setErrorMessage('')
  }, [])

  return (
    <div className="flex min-h-screen flex-col px-4 py-6">
      <div className="mb-6">
        <Link
          href="/mobile/attendance"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500"
        >
          <ArrowLeft className="size-3.5" /> Kembali
        </Link>
        <h1 className="text-xl font-black text-slate-900">Absensi Wajah</h1>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Verifikasi identitas menggunakan pengenalan wajah
        </p>
      </div>

      {flowState === 'idle' && (
        <div className="flex flex-1 flex-col gap-4">
          <button
            type="button"
            onClick={() => startFlow('checked-in')}
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-green-600 to-green-700 text-sm font-black text-white uppercase shadow-lg active:scale-[0.98]"
          >
            <LogIn className="size-5" /> Check In
          </button>
          <button
            type="button"
            onClick={() => startFlow('checked-out')}
            className="flex min-h-16 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-sm font-black text-white uppercase shadow-lg active:scale-[0.98]"
          >
            <LogOut className="size-5" /> Check Out
          </button>
          {!faceRegisteredAt && (
            <Link
              href={`/mobile/attendance/face/register?employeeId=${employeeId}&siteId=${siteId}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-700"
            >
              <ScanFace className="size-4" /> Registrasi Wajah (Wajib untuk absensi)
            </Link>
          )}
        </div>
      )}

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
            onError={(e) => {
              setErrorMessage(e)
              setFlowState('error')
            }}
            onFallbackTriggered={() => setFlowState('fallback')}
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

      {flowState === 'verifying' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Loader2 className="size-10 animate-spin text-blue-600" />
          <p className="text-sm font-bold text-slate-600">Memverifikasi wajah...</p>
        </div>
      )}

      {flowState === 'success' && successRecord && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex size-20 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 className="size-10 text-green-600" />
          </div>
          <p className="text-lg font-black text-green-700">
            {successRecord.eventType === 'checked-in' ? 'Check In' : 'Check Out'} Berhasil!
          </p>
          <p className="text-sm font-medium text-slate-600">
            {new Date(successRecord.eventTime).toLocaleString('id-ID')}
          </p>
          <button
            type="button"
            onClick={resetFlow}
            className="mt-6 min-h-12 w-full rounded-xl bg-slate-900 px-4 text-xs font-black text-white uppercase"
          >
            Selesai
          </button>
        </div>
      )}

      {flowState === 'failed' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <AlertCircle className="size-8 text-amber-600" />
          <p className="text-sm font-bold text-amber-700">{errorMessage}</p>
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
      )}

      {flowState === 'fallback' && eventType && (
        <div className="flex flex-1 flex-col items-center gap-4">
          <PhotoFallback
            employeeId={employeeId}
            siteId={siteId}
            eventType={eventType}
            latitude={gpsRef.current.latitude}
            longitude={gpsRef.current.longitude}
            onSuccess={(r) => {
              setSuccessRecord(r)
              setFlowState('success')
            }}
            onError={(e) => {
              setErrorMessage(e)
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

      {flowState === 'not-registered' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <AlertCircle className="size-8 text-orange-600" />
          <p className="text-sm font-bold text-orange-700">{errorMessage}</p>
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

      {flowState === 'error' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <AlertCircle className="size-8 text-red-600" />
          <p className="text-sm font-bold text-red-700">{errorMessage}</p>
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
      )}
    </div>
  )
}
