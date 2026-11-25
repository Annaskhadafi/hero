'use client'

import { isRoadChitraModelDownloaded, ROADCHITRA_MODEL_CONFIG } from './model-storage'

export interface ClientHazardDetection {
  box: [number, number, number, number]
  class_name: 'Potholes' | 'Corragation' | 'Ruts' | string
  hazard_type: 'Potholes' | 'Corragation' | 'Ruts' | string
  confidence: number
}

export interface ClientHazardInferenceResult {
  success: boolean
  mode: 'offline'
  executionProvider?: 'webgpu' | 'webgl' | 'wasm'
  modelName: string
  modelVersion: string
  detections: ClientHazardDetection[]
  detectionCount: number
  topConfidence: number
  latencyMs: number
  potholesCount: number
  corrugationCount: number
  rutsCount: number
  error?: string
}

const MODEL_INPUT_SIZE = 640
const PLANE_SIZE = MODEL_INPUT_SIZE * MODEL_INPUT_SIZE
const INV_255 = 1 / 255

let ortModule: any = null
let clientSession: any = null
let activeExecutionProvider: 'webgpu' | 'webgl' | 'wasm' | null = null
let isInitializing = false
let initError: string | null = null
let isModelVerifiedInCache = false

// Reusable preprocessing buffers (allocated once, zero per-frame GC churn — mirrors flutter-Yolo ObjectDetector)
let prepCanvas: HTMLCanvasElement | null = null
let prepCtx: CanvasRenderingContext2D | null = null
let reusableFloatInput: Float32Array | null = null

function ensurePreprocessingBuffers() {
  if (!prepCanvas || !prepCtx) {
    const c = document.createElement('canvas')
    c.width = MODEL_INPUT_SIZE
    c.height = MODEL_INPUT_SIZE
    prepCanvas = c
    prepCtx = prepCanvas.getContext('2d', {
      willReadFrequently: true,
    })
    if (!prepCtx) {
      throw new Error('Canvas 2D context not available')
    }
  }

  if (!reusableFloatInput) {
    reusableFloatInput = new Float32Array(3 * PLANE_SIZE)
  }

  return {
    ctx: prepCtx,
    floatArr: reusableFloatInput,
  }
}

export function isClientHazardModelLoading(): boolean {
  return isInitializing
}

async function getOrtWeb(): Promise<any> {
  if (typeof window === 'undefined') {
    throw new Error('Client inference engine must run in browser environment.')
  }

  if (!ortModule) {
    try {
      ortModule = await import('onnxruntime-web')
      // Configure local WASM paths so browser works 100% offline without internet
      if (ortModule.env?.wasm) {
        ortModule.env.wasm.wasmPaths = '/onnxruntime-web/'
        ortModule.env.wasm.simd = true
        ortModule.env.wasm.proxy = false
        // Multi-threaded WASM when Cross-Origin Isolated (SharedArrayBuffer available), else 1 thread
        const canThread = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated
        const hwCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2
        ortModule.env.wasm.numThreads = canThread ? Math.min(4, Math.max(1, hwCores)) : 1
      }
    } catch (err) {
      console.warn('[client-hazard-ai] Failed importing onnxruntime-web:', err)
      throw new Error('Modul onnxruntime-web tidak dapat dimuat di browser ini.')
    }
  }

  return ortModule
}

/**
 * Initializes and warms up the offline AI model in the client's browser memory.
 * Caches model instance so subsequent frames run with sub-50ms latency.
 */
export async function initializeClientHazardModel(timeoutMs = 12000): Promise<boolean> {
  if (clientSession) return true

  // Check if user has downloaded the model on this device
  const isDownloaded = await isRoadChitraModelDownloaded()
  if (!isDownloaded) {
    initError = `Model offline ${ROADCHITRA_MODEL_CONFIG.fileName} belum diunduh ke perangkat. Silakan unduh model terlebih dahulu.`
    return false
  }

  if (isInitializing) {
    let elapsed = 0
    while (isInitializing && elapsed < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 150))
      elapsed += 150
    }
    return !!clientSession
  }

  isInitializing = true
  initError = null

  try {
    const ort = await getOrtWeb()
    const modelUrl = '/models/roadchitra.onnx'

    const createPromise = (async () => {
      const { floatArr } = ensurePreprocessingBuffers()
      const testAndWarmup = async (ep: 'webgpu' | 'webgl' | 'wasm') => {
        const s = await ort.InferenceSession.create(modelUrl, {
          executionProviders: [ep],
          graphOptimizationLevel: 'all',
        })
        // Warm up inside fallback path (mirrors LiteRtModel.kt): some GPU drivers compile but fail on first run
        const warmupTensor = new ort.Tensor('float32', floatArr, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE])
        const out = await s.run({ images: warmupTensor })
        if (!out?.output0?.data) {
          throw new Error(`${ep} returned invalid output tensor during warmup`)
        }
        activeExecutionProvider = ep
        return s
      }

      // Accelerator ladder (mirrors flutter-Yolo LiteRtModel): WebGPU -> WebGL -> WASM SIMD
      const hasWebGpu =
        typeof navigator !== 'undefined' &&
        'gpu' in navigator &&
        Boolean(await (navigator as any).gpu?.requestAdapter?.().catch(() => null))

      if (hasWebGpu) {
        try {
          return await testAndWarmup('webgpu')
        } catch (gpuErr) {
          console.info('[client-hazard-ai] WebGPU EP failed, trying WebGL:', gpuErr)
        }
      }

      try {
        return await testAndWarmup('webgl')
      } catch (webglErr) {
        console.info('[client-hazard-ai] WebGL EP failed, falling back to WASM CPU:', webglErr)
      }

      return await testAndWarmup('wasm')
    })()

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Waktu inisialisasi model di memori perangkat habis (timeout).')),
        timeoutMs
      )
    )

    clientSession = await Promise.race([createPromise, timeoutPromise])
    isModelVerifiedInCache = true

    console.info(
      `[client-hazard-ai] Model ready on ${activeExecutionProvider?.toUpperCase() || 'WASM'} (100% Offline Ready).`
    )
    return true
  } catch (err) {
    initError = err instanceof Error ? err.message : String(err)
    console.error('[client-hazard-ai] Model initialization error:', err)
    return false
  } finally {
    isInitializing = false
  }
}

if (typeof window !== 'undefined') {
  ;(window as any).__testHazardInit = initializeClientHazardModel
  ;(window as any).__testHazardInference = runClientDeviceHazardInference
}

export function isClientHazardModelReady(): boolean {
  return !!clientSession
}

export function getClientHazardModelError(): string | null {
  return initError
}

/**
 * Executes real-time YOLO hazard inference on a single HTMLVideoElement frame
 * 100% offline inside browser memory without sending any data over the network.
 */
export async function runClientDeviceHazardInference(
  video: HTMLVideoElement,
  confThreshold = 0.20
): Promise<ClientHazardInferenceResult> {
  const startTime = performance.now()

  // Skip async Cache Storage check once session is already verified in memory
  if (!clientSession && !isModelVerifiedInCache) {
    const isDownloaded = await isRoadChitraModelDownloaded()
    if (!isDownloaded) {
      return {
        success: false,
        mode: 'offline',
        modelName: `${ROADCHITRA_MODEL_CONFIG.fileName} (Device Offline)`,
        modelVersion: ROADCHITRA_MODEL_CONFIG.version,
        detections: [],
        detectionCount: 0,
        topConfidence: 0,
        latencyMs: 0,
        potholesCount: 0,
        corrugationCount: 0,
        rutsCount: 0,
        error: `Model ${ROADCHITRA_MODEL_CONFIG.fileName} belum diunduh ke memori perangkat. Silakan klik Unduh Model terlebih dahulu.`,
      }
    }
    isModelVerifiedInCache = true
  }

  if (!clientSession) {
    const ready = await initializeClientHazardModel()
    if (!ready || !clientSession) {
      return {
        success: false,
        mode: 'offline',
        modelName: `${ROADCHITRA_MODEL_CONFIG.fileName} (Device Offline)`,
        modelVersion: ROADCHITRA_MODEL_CONFIG.version,
        detections: [],
        detectionCount: 0,
        topConfidence: 0,
        latencyMs: 0,
        potholesCount: 0,
        corrugationCount: 0,
        rutsCount: 0,
        error: initError || 'Model AI offline belum siap di memori perangkat.',
      }
    }
  }

  const origW = video.videoWidth || MODEL_INPUT_SIZE
  const origH = video.videoHeight || 480

  try {
    const ort = await getOrtWeb()

    // 1. Reuse pre-allocated 640x640 canvas & Float32Array (zero GC churn)
    const { ctx, floatArr } = ensurePreprocessingBuffers()
    ctx.drawImage(video, 0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE)
    const pixels = ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE).data

    // 2. Fast planar NCHW conversion with precomputed reciprocal (mirrors ImageUtils.kt)
    let r = 0
    let g = PLANE_SIZE
    let b = PLANE_SIZE * 2
    let pIdx = 0
    for (let i = 0; i < PLANE_SIZE; i++) {
      floatArr[r++] = pixels[pIdx] * INV_255
      floatArr[g++] = pixels[pIdx + 1] * INV_255
      floatArr[b++] = pixels[pIdx + 2] * INV_255
      pIdx += 4
    }

    // Wrap reusableFloatInput in a fresh Tensor handle per run (zero copy, prevents stale GPU buffer caching)
    const inputTensor = new ort.Tensor('float32', floatArr, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE])

    // 3. Run inference
    const outputs = await clientSession.run({ images: inputTensor })
    const outputTensor = outputs.output0

    if (!outputTensor || !outputTensor.data) {
      throw new Error('Invalid output tensor from client model')
    }

    const outputData = outputTensor.data as Float32Array
    const numCandidates = 300
    const detections: ClientHazardDetection[] = []

    let potholesCount = 0
    let corrugationCount = 0
    let rutsCount = 0
    let topConfidence = 0

    // 4. Parse detection candidates [x1, y1, x2, y2, score, classId]
    for (let i = 0; i < numCandidates; i++) {
      const offset = i * 6
      const score = outputData[offset + 4]

      if (score < confThreshold) continue

      const x1_640 = outputData[offset + 0]
      const y1_640 = outputData[offset + 1]
      const x2_640 = outputData[offset + 2]
      const y2_640 = outputData[offset + 3]
      const classId = Math.round(outputData[offset + 5])

      if (score > topConfidence) {
        topConfidence = score
      }

      let hazardType: 'Potholes' | 'Corragation' | 'Ruts' = 'Potholes'
      if (classId === 0) {
        hazardType = 'Corragation'
        corrugationCount++
      } else if (classId === 1) {
        hazardType = 'Potholes'
        potholesCount++
      } else if (classId === 2) {
        hazardType = 'Ruts'
        rutsCount++
      }

      // Map scaled coordinates back to original video dimensions
      const x1 = Math.max(0, Math.min(origW, Math.round((x1_640 / 640) * origW)))
      const y1 = Math.max(0, Math.min(origH, Math.round((y1_640 / 640) * origH)))
      const x2 = Math.max(0, Math.min(origW, Math.round((x2_640 / 640) * origW)))
      const y2 = Math.max(0, Math.min(origH, Math.round((y2_640 / 640) * origH)))

      detections.push({
        box: [x1, y1, x2, y2],
        class_name: hazardType,
        hazard_type: hazardType,
        confidence: Number(score.toFixed(3)),
      })
    }

    const endTime = performance.now()
    const latencyMs = Math.round(endTime - startTime)

    return {
      success: true,
      mode: 'offline',
      executionProvider: activeExecutionProvider || 'wasm',
      modelName: `${ROADCHITRA_MODEL_CONFIG.fileName} (${(activeExecutionProvider || 'wasm').toUpperCase()})`,
      modelVersion: ROADCHITRA_MODEL_CONFIG.version,
      detections,
      detectionCount: detections.length,
      topConfidence: Number(topConfidence.toFixed(3)),
      latencyMs,
      potholesCount,
      corrugationCount,
      rutsCount,
    }
  } catch (err) {
    const endTime = performance.now()
    console.error('[client-hazard-ai] Inference execution error:', err)
    return {
      success: false,
      mode: 'offline',
      modelName: `${ROADCHITRA_MODEL_CONFIG.fileName} (Device Offline)`,
      modelVersion: ROADCHITRA_MODEL_CONFIG.version,
      detections: [],
      detectionCount: 0,
      topConfidence: 0,
      latencyMs: Math.round(endTime - startTime),
      potholesCount: 0,
      corrugationCount: 0,
      rutsCount: 0,
      error: err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses AI di perangkat.',
    }
  }
}
