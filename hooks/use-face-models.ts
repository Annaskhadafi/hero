'use client'

/**
 * Face model loader hook for face-api.js
 * Dependency: face-api.js (already installed)
 *
 * Loads the following models from /models/ path:
 * - ssd_mobilenetv1 (~5.4MB) — face detection
 * - face_landmark_68_model (~350KB) — 68-point landmark detection
 * - face_recognition_model (~6.4MB) — 128-dim embedding extraction
 */

import { useState, useEffect, useCallback, useRef } from 'react'

interface UseFaceModelsReturn {
  isLoaded: boolean
  isLoading: boolean
  error: string | null
  progress: number // 0-100
  retry: () => void
}

export function useFaceModels(): UseFaceModelsReturn {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const loadAttempted = useRef(false)

  const loadModels = useCallback(async () => {
    if (isLoaded) return
    setIsLoading(true)
    setError(null)
    setProgress(0)

    try {
      // Dynamic import to avoid SSR issues in Next.js
      const faceapi = await import('face-api.js')
      setProgress(10)

      const MODEL_URL = '/models'

      // Load models sequentially, updating progress
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
      setProgress(40)

      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL)
      setProgress(70)

      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      setProgress(100)

      setIsLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load face recognition models.')
    } finally {
      setIsLoading(false)
    }
  }, [isLoaded])

  useEffect(() => {
    if (!loadAttempted.current) {
      loadAttempted.current = true
      loadModels()
    }
  }, [loadModels])

  const retry = useCallback(() => {
    loadAttempted.current = false
    setIsLoaded(false)
    loadModels()
  }, [loadModels])

  return { isLoaded, isLoading, error, progress, retry }
}
