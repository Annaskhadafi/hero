'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, AlertCircle, ArrowLeft, UserPlus } from 'lucide-react'

import { FaceCapture } from '@/components/mobile/face-capture'

// ─── Types ───────────────────────────────────────────────────────────────────

type RegistrationState = 'idle' | 'capturing' | 'registering' | 'success' | 'error'

// ─── Component ───────────────────────────────────────────────────────────────

export default function FaceRegistrationPage() {
  const searchParams = useSearchParams()
  const employeeId = Number(searchParams.get('employeeId') || '0')
  const siteId = Number(searchParams.get('siteId') || '1')

  const [state, setState] = useState<RegistrationState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [registeredAt, setRegisteredAt] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState('')
  const [pendingEmbedding, setPendingEmbedding] = useState<number[] | null>(null)

  // ─── Start registration ──────────────────────────────────────────────────

  const startRegistration = useCallback(() => {
    if (!employeeId) {
      setErrorMessage('Employee ID tidak ditemukan. Pastikan Anda sudah login.')
      setState('error')
      return
    }

    setState('capturing')
    setErrorMessage('')
    setRegisteredAt(null)
  }, [employeeId])

  // ─── Handle embedding captured ──────────────────────────────────────────

  const handleEmbeddingCaptured = useCallback(
    async (embedding: number[]) => {
      setState('registering')

      try {
        const response = await fetch('/api/mobile/face-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_MOBILE_API_KEY || ''}`,
          },
          body: JSON.stringify({
            employeeId,
            embedding,
          }),
        })

        const data = await response.json()

        // Handle 409 — already registered
        if (response.status === 409 && data?.error?.code === 'ALREADY_REGISTERED') {
          const existingDate = data.error.faceRegisteredAt
            ? new Date(data.error.faceRegisteredAt).toLocaleString('id-ID', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'sebelumnya'

          setShowConfirmDialog(true)
          setConfirmMessage(
            `Wajah sudah terdaftar pada ${existingDate}. Apakah Anda ingin mendaftar ulang?`
          )
          setPendingEmbedding(embedding)
          setState('idle')
          return
        }

        if (!response.ok) {
          const msg = data?.error?.message || 'Gagal mendaftarkan wajah.'
          setErrorMessage(msg)
          setState('error')
          return
        }

        setRegisteredAt(data.registeredAt)
        setState('success')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal terhubung ke server.'
        setErrorMessage(msg)
        setState('error')
      }
    },
    [employeeId]
  )

  // ─── Handle capture error ───────────────────────────────────────────────

  const handleCaptureError = useCallback((error: string) => {
    setErrorMessage(error)
    setState('error')
  }, [])

  // ─── Handle confirm overwrite ───────────────────────────────────────────

  const handleConfirmOverwrite = useCallback(async () => {
    if (!pendingEmbedding) return
    setShowConfirmDialog(false)
    setState('registering')

    try {
      const response = await fetch('/api/mobile/face-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_MOBILE_API_KEY || ''}`,
        },
        body: JSON.stringify({ employeeId, embedding: pendingEmbedding, force: true }),
      })
      const data = await response.json()
      if (!response.ok) {
        setErrorMessage(data?.error?.message || 'Gagal mendaftarkan wajah.')
        setState('error')
        return
      }
      setRegisteredAt(data.registeredAt)
      setState('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal terhubung ke server.')
      setState('error')
    }
    setPendingEmbedding(null)
  }, [pendingEmbedding, employeeId])

  // ─── Reset ──────────────────────────────────────────────────────────────

  const resetState = useCallback(() => {
    setState('idle')
    setErrorMessage('')
    setRegisteredAt(null)
  }, [])

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/mobile/attendance/face?employeeId=${employeeId}&siteId=${siteId}`}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500"
        >
          <ArrowLeft className="size-3.5" />
          Kembali ke Absensi
        </Link>
        <h1 className="text-xl font-black text-slate-900">Registrasi Wajah</h1>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Daftarkan wajah Anda untuk absensi biometrik
        </p>
      </div>

      {/* Idle state — show start button */}
      {state === 'idle' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="flex size-20 items-center justify-center rounded-full bg-blue-50">
            <UserPlus className="size-10 text-blue-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-700">
              Registrasi wajah diperlukan untuk absensi biometrik
            </p>
            <p className="mt-2 text-xs font-medium text-slate-500">
              Pastikan pencahayaan cukup dan wajah terlihat jelas
            </p>
          </div>
          <button
            type="button"
            onClick={startRegistration}
            className="min-h-14 w-full rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 px-4 text-sm font-black text-white uppercase shadow-lg active:scale-[0.98]"
          >
            Mulai Registrasi
          </button>
        </div>
      )}

      {/* Capturing state — show FaceCapture in registration mode */}
      {state === 'capturing' && (
        <div className="flex flex-1 flex-col items-center gap-4">
          <div className="rounded-lg bg-blue-50 px-3 py-2 text-center">
            <p className="text-xs font-bold text-blue-700">Mode Registrasi — Tangkap Wajah</p>
          </div>
          <FaceCapture
            mode="registration"
            onEmbeddingCaptured={handleEmbeddingCaptured}
            onError={handleCaptureError}
          />
          <button
            type="button"
            onClick={resetState}
            className="mt-4 rounded-lg bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600"
          >
            Batal
          </button>
        </div>
      )}

      {/* Registering state — loading */}
      {state === 'registering' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Loader2 className="size-10 animate-spin text-blue-600" />
          <p className="text-sm font-bold text-slate-600">Mendaftarkan wajah...</p>
        </div>
      )}

      {/* Success state */}
      {state === 'success' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex size-20 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 className="size-10 text-green-600" />
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-green-700">Wajah Berhasil Terdaftar!</p>
            {registeredAt && (
              <p className="mt-2 text-sm font-medium text-slate-600">
                {new Date(registeredAt).toLocaleString('id-ID', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
            )}
            <p className="mt-3 text-xs font-medium text-slate-500">
              Anda sekarang dapat menggunakan absensi wajah untuk check-in dan check-out.
            </p>
          </div>
          <Link
            href={`/mobile/attendance/face?employeeId=${employeeId}&siteId=${siteId}`}
            className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-black text-white uppercase"
          >
            Ke Halaman Absensi
          </Link>
        </div>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="size-8 text-red-600" />
          </div>
          <p className="text-center text-sm font-bold text-red-700">{errorMessage}</p>
          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={startRegistration}
              className="min-h-12 w-full rounded-xl bg-blue-600 px-4 text-xs font-black text-white uppercase"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={resetState}
              className="min-h-12 w-full rounded-xl bg-slate-100 px-4 text-xs font-black text-slate-700 uppercase"
            >
              Kembali
            </button>
          </div>
        </div>
      )}

      {/* Confirmation dialog — 409 already registered */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-sm font-bold text-slate-800">{confirmMessage}</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmDialog(false)
                  setPendingEmbedding(null)
                }}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-3 text-xs font-bold text-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmOverwrite}
                className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white"
              >
                Ya, Daftar Ulang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
