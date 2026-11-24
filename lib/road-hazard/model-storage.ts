'use client'

export const ROADCHITRA_MODEL_CONFIG = {
  fileName: 'roadchitra.tflite',
  modelUrl: '/models/roadchitra.tflite',
  sizeBytes: 2852796,
  sizeFormatted: '2.85 MB',
  cacheName: 'hero-road-hazard-v2',
  storageKey: 'hero_road_hazard_roadchitra_downloaded',
  version: '2.0-roadchitra',
}

/**
 * Checks if roadchitra.tflite is already downloaded and cached on the user's mobile device
 */
export async function isRoadChitraModelDownloaded(): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    // 1. Check Cache Storage API
    if ('caches' in window) {
      const cache = await caches.open(ROADCHITRA_MODEL_CONFIG.cacheName)
      const matched = await cache.match(ROADCHITRA_MODEL_CONFIG.modelUrl)
      if (matched && matched.ok) {
        localStorage.setItem(ROADCHITRA_MODEL_CONFIG.storageKey, 'true')
        return true
      }
    }

    // 2. Fallback check localStorage flag
    const flag = localStorage.getItem(ROADCHITRA_MODEL_CONFIG.storageKey)
    return flag === 'true'
  } catch (err) {
    console.warn('[road-hazard-storage] Error checking model cache:', err)
    return localStorage.getItem(ROADCHITRA_MODEL_CONFIG.storageKey) === 'true'
  }
}

/**
 * Downloads roadchitra.tflite with real-time stream progress and stores it in device Cache Storage
 */
export async function downloadRoadChitraModel(
  onProgress?: (progressPercent: number, loadedBytes: number, totalBytes: number) => void
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Download hanya dapat dijalankan di browser mobile/klien.' }
  }

  try {
    const response = await fetch(ROADCHITRA_MODEL_CONFIG.modelUrl, {
      cache: 'no-cache',
    })

    if (!response.ok) {
      throw new Error(`Gagal mengunduh berkas model roadchitra.tflite (HTTP ${response.status})`)
    }

    const contentLength = Number(response.headers.get('content-length')) || ROADCHITRA_MODEL_CONFIG.sizeBytes
    const reader = response.body?.getReader()

    if (!reader) {
      // Fallback if ReadableStream is not available
      const blob = await response.blob()
      if ('caches' in window) {
        const cache = await caches.open(ROADCHITRA_MODEL_CONFIG.cacheName)
        const cachedRes = new Response(blob, {
          headers: {
            'Content-Type': 'application/octet-stream',
            'Content-Length': String(blob.size),
          },
        })
        await cache.put(ROADCHITRA_MODEL_CONFIG.modelUrl, cachedRes)
      }
      localStorage.setItem(ROADCHITRA_MODEL_CONFIG.storageKey, 'true')
      onProgress?.(100, blob.size, blob.size)
      return { success: true }
    }

    // Read stream in chunks to compute live percentage
    let receivedBytes = 0
    const chunks: Uint8Array[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      if (value) {
        chunks.push(value)
        receivedBytes += value.length
        const percent = Math.min(100, Math.round((receivedBytes / contentLength) * 100))
        onProgress?.(percent, receivedBytes, contentLength)
      }
    }

    const fullBlob = new Blob(chunks as any[], { type: 'application/octet-stream' })

    // Store in browser Cache Storage for offline use
    if ('caches' in window) {
      const cache = await caches.open(ROADCHITRA_MODEL_CONFIG.cacheName)
      const cachedResponse = new Response(fullBlob, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(fullBlob.size),
        },
      })
      await cache.put(ROADCHITRA_MODEL_CONFIG.modelUrl, cachedResponse)
    }

    localStorage.setItem(ROADCHITRA_MODEL_CONFIG.storageKey, 'true')
    onProgress?.(100, fullBlob.size, fullBlob.size)

    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[road-hazard-storage] Download error:', err)
    return { success: false, error: msg }
  }
}

/**
 * Removes roadchitra.tflite from device Cache Storage and resets state
 */
export async function removeRoadChitraModel(): Promise<boolean> {
  if (typeof window === 'undefined') return true

  try {
    if ('caches' in window) {
      const cache = await caches.open(ROADCHITRA_MODEL_CONFIG.cacheName)
      await cache.delete(ROADCHITRA_MODEL_CONFIG.modelUrl)
    }
    localStorage.removeItem(ROADCHITRA_MODEL_CONFIG.storageKey)
    return true
  } catch (err) {
    console.warn('[road-hazard-storage] Error removing model cache:', err)
    localStorage.removeItem(ROADCHITRA_MODEL_CONFIG.storageKey)
    return false
  }
}
