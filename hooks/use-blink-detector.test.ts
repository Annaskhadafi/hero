import { computeEAR } from './use-blink-detector'
import { renderHook, act } from '@testing-library/react'
import { useBlinkDetector } from './use-blink-detector'

describe('computeEAR', () => {
  it('returns 0 when horizontal distance is 0 (degenerate eye)', () => {
    const eye = [
      { x: 5, y: 5 }, // p1
      { x: 5, y: 3 }, // p2
      { x: 5, y: 2 }, // p3
      { x: 5, y: 5 }, // p4 same as p1 → h=0
      { x: 5, y: 8 }, // p5
      { x: 5, y: 7 }, // p6
    ]
    expect(computeEAR(eye)).toBe(0)
  })

  it('computes correct EAR for a wide-open eye', () => {
    // Simulated open eye: large vertical, normal horizontal
    const eye = [
      { x: 0, y: 0 }, // p1 (left corner)
      { x: 1, y: -2 }, // p2 (upper-left)
      { x: 2, y: -2 }, // p3 (upper-right)
      { x: 3, y: 0 }, // p4 (right corner)
      { x: 2, y: 2 }, // p5 (lower-right)
      { x: 1, y: 2 }, // p6 (lower-left)
    ]
    // v1 = |p2 - p6| = hypot(1-1, -2-2) = hypot(0, -4) = 4
    // v2 = |p3 - p5| = hypot(2-2, -2-2) = hypot(0, -4) = 4
    // h  = |p1 - p4| = hypot(0-3, 0-0) = 3
    // EAR = (4 + 4) / (2 * 3) = 8/6 ≈ 1.333
    expect(computeEAR(eye)).toBeCloseTo(8 / 6, 5)
  })

  it('computes correct EAR for a nearly closed eye', () => {
    // Simulated closed eye: very small vertical distances
    const eye = [
      { x: 0, y: 0 }, // p1
      { x: 1, y: -0.1 }, // p2
      { x: 2, y: -0.1 }, // p3
      { x: 3, y: 0 }, // p4
      { x: 2, y: 0.1 }, // p5
      { x: 1, y: 0.1 }, // p6
    ]
    // v1 = hypot(0, -0.2) = 0.2
    // v2 = hypot(0, -0.2) = 0.2
    // h  = 3
    // EAR = (0.2 + 0.2) / (2 * 3) = 0.4/6 ≈ 0.0667
    expect(computeEAR(eye)).toBeCloseTo(0.4 / 6, 5)
  })

  it('handles asymmetric eye shapes', () => {
    const eye = [
      { x: 0, y: 0 },
      { x: 1, y: -1 },
      { x: 2, y: -0.5 },
      { x: 4, y: 0 },
      { x: 2, y: 0.5 },
      { x: 1, y: 1 },
    ]
    const v1 = Math.hypot(1 - 1, -1 - 1) // = 2
    const v2 = Math.hypot(2 - 2, -0.5 - 0.5) // = 1
    const h = Math.hypot(0 - 4, 0 - 0) // = 4
    expect(computeEAR(eye)).toBeCloseTo((v1 + v2) / (2 * h), 5)
  })
})

describe('useBlinkDetector', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('starts in idle state', () => {
    const { result } = renderHook(() => useBlinkDetector())
    expect(result.current.status).toBe('idle')
    expect(result.current.isDetecting).toBe(false)
    expect(result.current.isLivenessConfirmed).toBe(false)
  })

  it('transitions to waiting-for-blink on startDetection', () => {
    const { result } = renderHook(() => useBlinkDetector())
    act(() => {
      result.current.startDetection()
    })
    expect(result.current.status).toBe('waiting-for-blink')
    expect(result.current.isDetecting).toBe(true)
  })

  it('transitions to timeout after 5 seconds without blink', () => {
    const { result } = renderHook(() => useBlinkDetector())
    act(() => {
      result.current.startDetection()
    })
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(result.current.status).toBe('timeout')
    expect(result.current.isDetecting).toBe(false)
  })

  it('stops detection and resets to idle on stopDetection', () => {
    const { result } = renderHook(() => useBlinkDetector())
    act(() => {
      result.current.startDetection()
    })
    act(() => {
      result.current.stopDetection()
    })
    expect(result.current.status).toBe('idle')
    expect(result.current.isDetecting).toBe(false)
  })

  it('ignores landmarks with fewer than 68 points', () => {
    const { result } = renderHook(() => useBlinkDetector())
    act(() => {
      result.current.startDetection()
    })
    act(() => {
      result.current.processLandmarks(Array(50).fill({ x: 0, y: 0 }))
    })
    expect(result.current.status).toBe('waiting-for-blink')
  })

  it('detects a valid blink (EAR drops below 0.2 then returns above within 400ms)', () => {
    const { result } = renderHook(() => useBlinkDetector())

    // Create 68 landmarks with open eyes (high EAR)
    const makeLandmarks = (earValue: 'open' | 'closed') => {
      const landmarks = Array(68)
        .fill({ x: 0, y: 0 })
        .map((_, i) => ({ x: i, y: 0 }))

      if (earValue === 'open') {
        // Left eye (36-41): wide open
        landmarks[36] = { x: 0, y: 0 }
        landmarks[37] = { x: 1, y: -2 }
        landmarks[38] = { x: 2, y: -2 }
        landmarks[39] = { x: 3, y: 0 }
        landmarks[40] = { x: 2, y: 2 }
        landmarks[41] = { x: 1, y: 2 }
        // Right eye (42-47): wide open
        landmarks[42] = { x: 4, y: 0 }
        landmarks[43] = { x: 5, y: -2 }
        landmarks[44] = { x: 6, y: -2 }
        landmarks[45] = { x: 7, y: 0 }
        landmarks[46] = { x: 6, y: 2 }
        landmarks[47] = { x: 5, y: 2 }
      } else {
        // Left eye (36-41): closed (very small vertical)
        landmarks[36] = { x: 0, y: 0 }
        landmarks[37] = { x: 1, y: -0.05 }
        landmarks[38] = { x: 2, y: -0.05 }
        landmarks[39] = { x: 3, y: 0 }
        landmarks[40] = { x: 2, y: 0.05 }
        landmarks[41] = { x: 1, y: 0.05 }
        // Right eye (42-47): closed
        landmarks[42] = { x: 4, y: 0 }
        landmarks[43] = { x: 5, y: -0.05 }
        landmarks[44] = { x: 6, y: -0.05 }
        landmarks[45] = { x: 7, y: 0 }
        landmarks[46] = { x: 6, y: 0.05 }
        landmarks[47] = { x: 5, y: 0.05 }
      }
      return landmarks
    }

    act(() => {
      result.current.startDetection()
    })

    // Process closed eye landmarks
    act(() => {
      result.current.processLandmarks(makeLandmarks('closed'))
    })

    // Advance 200ms (within 400ms window)
    act(() => {
      jest.advanceTimersByTime(200)
    })

    // Process open eye landmarks → blink detected
    act(() => {
      result.current.processLandmarks(makeLandmarks('open'))
    })

    expect(result.current.isLivenessConfirmed).toBe(true)
    expect(result.current.status).toBe('confirmed')
    expect(result.current.isDetecting).toBe(false)
  })

  it('does not confirm blink if eye closed for longer than 400ms', () => {
    const { result } = renderHook(() => useBlinkDetector())

    const makeLandmarks = (earValue: 'open' | 'closed') => {
      const landmarks = Array(68)
        .fill({ x: 0, y: 0 })
        .map((_, i) => ({ x: i, y: 0 }))
      if (earValue === 'closed') {
        landmarks[36] = { x: 0, y: 0 }
        landmarks[37] = { x: 1, y: -0.05 }
        landmarks[38] = { x: 2, y: -0.05 }
        landmarks[39] = { x: 3, y: 0 }
        landmarks[40] = { x: 2, y: 0.05 }
        landmarks[41] = { x: 1, y: 0.05 }
        landmarks[42] = { x: 4, y: 0 }
        landmarks[43] = { x: 5, y: -0.05 }
        landmarks[44] = { x: 6, y: -0.05 }
        landmarks[45] = { x: 7, y: 0 }
        landmarks[46] = { x: 6, y: 0.05 }
        landmarks[47] = { x: 5, y: 0.05 }
      } else {
        landmarks[36] = { x: 0, y: 0 }
        landmarks[37] = { x: 1, y: -2 }
        landmarks[38] = { x: 2, y: -2 }
        landmarks[39] = { x: 3, y: 0 }
        landmarks[40] = { x: 2, y: 2 }
        landmarks[41] = { x: 1, y: 2 }
        landmarks[42] = { x: 4, y: 0 }
        landmarks[43] = { x: 5, y: -2 }
        landmarks[44] = { x: 6, y: -2 }
        landmarks[45] = { x: 7, y: 0 }
        landmarks[46] = { x: 6, y: 2 }
        landmarks[47] = { x: 5, y: 2 }
      }
      return landmarks
    }

    act(() => {
      result.current.startDetection()
    })

    // Close eyes
    act(() => {
      result.current.processLandmarks(makeLandmarks('closed'))
    })

    // Advance 500ms (exceeds 400ms window)
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Open eyes → too slow, not a valid blink
    act(() => {
      result.current.processLandmarks(makeLandmarks('open'))
    })

    expect(result.current.isLivenessConfirmed).toBe(false)
    expect(result.current.status).toBe('waiting-for-blink')
  })
})
