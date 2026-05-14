'use client'

import { useState, useCallback, useRef } from 'react'

interface UseBlinkDetectorReturn {
  isLivenessConfirmed: boolean
  isDetecting: boolean
  status: 'idle' | 'waiting-for-blink' | 'confirmed' | 'timeout'
  startDetection: () => void
  stopDetection: () => void
  processLandmarks: (landmarks: { x: number; y: number }[]) => void
}

// EAR calculation for one eye (6 points)
export function computeEAR(eye: { x: number; y: number }[]): number {
  // Vertical distances
  const v1 = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y)
  const v2 = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y)
  // Horizontal distance
  const h = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y)
  if (h === 0) return 0
  return (v1 + v2) / (2 * h)
}

const EAR_THRESHOLD = 0.2
const BLINK_MAX_DURATION_MS = 400
const DETECTION_WINDOW_MS = 5000

export function useBlinkDetector(): UseBlinkDetectorReturn {
  const [isLivenessConfirmed, setIsLivenessConfirmed] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'waiting-for-blink' | 'confirmed' | 'timeout'>(
    'idle'
  )

  const eyeClosedAt = useRef<number | null>(null)
  const detectionStartedAt = useRef<number | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const livenessRef = useRef(false)

  const startDetection = useCallback(() => {
    setIsDetecting(true)
    setIsLivenessConfirmed(false)
    setStatus('waiting-for-blink')
    eyeClosedAt.current = null
    detectionStartedAt.current = Date.now()
    livenessRef.current = false

    // Set timeout for 5-second window
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      if (!livenessRef.current) {
        setStatus('timeout')
        setIsDetecting(false)
      }
    }, DETECTION_WINDOW_MS)
  }, [])

  const stopDetection = useCallback(() => {
    setIsDetecting(false)
    setStatus('idle')
    eyeClosedAt.current = null
    detectionStartedAt.current = null
    livenessRef.current = false
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const processLandmarks = useCallback(
    (landmarks: { x: number; y: number }[]) => {
      if (!isDetecting || isLivenessConfirmed) return
      if (landmarks.length < 68) return

      // Extract left eye (points 36-41) and right eye (points 42-47)
      const leftEye = landmarks.slice(36, 42)
      const rightEye = landmarks.slice(42, 48)

      const leftEAR = computeEAR(leftEye)
      const rightEAR = computeEAR(rightEye)
      const avgEAR = (leftEAR + rightEAR) / 2

      const now = Date.now()

      if (avgEAR < EAR_THRESHOLD) {
        // Eye closed
        if (eyeClosedAt.current === null) {
          eyeClosedAt.current = now
        }
      } else {
        // Eye open
        if (eyeClosedAt.current !== null) {
          const closedDuration = now - eyeClosedAt.current
          if (closedDuration <= BLINK_MAX_DURATION_MS) {
            // Valid blink detected!
            livenessRef.current = true
            setIsLivenessConfirmed(true)
            setStatus('confirmed')
            setIsDetecting(false)
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
              timeoutRef.current = null
            }
          }
          eyeClosedAt.current = null
        }
      }
    },
    [isDetecting, isLivenessConfirmed]
  )

  return {
    isLivenessConfirmed,
    isDetecting,
    status,
    startDetection,
    stopDetection,
    processLandmarks,
  }
}
