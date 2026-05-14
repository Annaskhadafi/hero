'use client'

import { useCallback, useRef, useState } from 'react'
import { FaceCamera } from './face-camera'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FaceRegistrationProps {
  employeeId: number
  onSuccess?: (registeredAt: string) => void
  onError?: (error: string) => void
}

type RegistrationState = 'capturing' | 'submitting' | 'success' | 'error'

// ─── Helper ──────────────────────────────────────────────────────────────────

function getAuthToken(): string {
  // Prefer env variable for mobile API key, fall back to localStorage
  if (typeof window !== 'undefined') {
    const envToken = process.env.NEXT_PUBLIC_MOBILE_API_KEY
    if (envToken) return envToken

    const stored = localStorage.getItem('mobile_api_token')
    if (stored) return stored
  }
  return ''
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FaceRegistration({ employeeId, onSuccess, onError }: FaceRegistrationProps) {
  const [state, setState] = useState<RegistrationState>('capturing')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [registeredAt, setRegisteredAt] = useState<string>('')
  const [cameraKey, setCameraKey] = useState(0)

  // Prevent double-submission
  const submittingRef = useRef(false)

  const handleEmbeddingCaptured = useCallback(
    async (embedding: number[]) => {
      if (submittingRef.current) return
      submittingRef.current = true

      setState('submitting')
      setErrorMessage('')

      try {
        const token = getAuthToken()

        const response = await fetch('/api/mobile/face-registration', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ employeeId, embedding }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          const msg = data.error?.message || 'Registrasi wajah gagal. Silakan coba lagi.'
          setState('error')
          setErrorMessage(msg)
          onError?.(msg)
          return
        }

        // Success
        setState('success')
        setRegisteredAt(data.registeredAt)
        onSuccess?.(data.registeredAt)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Koneksi gagal. Periksa jaringan Anda.'
        setState('error')
        setErrorMessage(msg)
        onError?.(msg)
      } finally {
        submittingRef.current = false
      }
    },
    [employeeId, onSuccess, onError]
  )

  const handleCameraError = useCallback(
    (error: string) => {
      setState('error')
      setErrorMessage(error)
      onError?.(error)
    },
    [onError]
  )

  const handleRetry = useCallback(() => {
    setState('capturing')
    setErrorMessage('')
    setRegisteredAt('')
    submittingRef.current = false
    // Increment key to force FaceCamera remount/reset
    setCameraKey((k) => k + 1)
  }, [])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center text-lg">Registrasi Wajah</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {/* Capturing state — show FaceCamera */}
        {state === 'capturing' && (
          <FaceCamera
            key={cameraKey}
            onEmbeddingCaptured={handleEmbeddingCaptured}
            onError={handleCameraError}
            showBlinkDetection={true}
            autoCapture={true}
          />
        )}

        {/* Submitting state */}
        {state === 'submitting' && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="text-primary h-10 w-10 animate-spin" />
            <p className="text-sm font-medium text-slate-600">Menyimpan data wajah...</p>
          </div>
        )}

        {/* Success state */}
        {state === 'success' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="text-center text-sm font-semibold text-green-700">
              Registrasi wajah berhasil!
            </p>
            {registeredAt && (
              <p className="text-center text-xs text-slate-500">
                Terdaftar pada:{' '}
                {new Date(registeredAt).toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            )}
          </div>
        )}

        {/* Error state */}
        {state === 'error' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-center text-sm font-medium text-red-700">
              {errorMessage || 'Terjadi kesalahan.'}
            </p>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Coba Lagi
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
