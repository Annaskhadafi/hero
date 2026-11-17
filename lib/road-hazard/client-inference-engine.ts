'use client'

export interface ClientHazardDetection {
  box: [number, number, number, number]
  class_name: 'Potholes' | 'Corragation' | 'Ruts' | string
  hazard_type: 'Potholes' | 'Corragation' | 'Ruts' | string
  confidence: number
}

export interface ClientHazardInferenceResult {
  success: boolean
  mode: 'offline'
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

let ortModule: any = null
let clientSession: any = null
let isInitializing = false
let initError: string | null = null

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
        ortModule.env.wasm.numThreads = 1
        ortModule.env.wasm.proxy = false
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
    const modelUrl = '/models/hazardyolo26n-4.onnx'

    const createPromise = (async () => {
      try {
        return await ort.InferenceSession.create(modelUrl, {
          executionProviders: ['webgl', 'wasm'],
          graphOptimizationLevel: 'all',
        })
      } catch (gpuErr) {
        console.info('[client-hazard-ai] WebGL EP failed, falling back to WASM CPU:', gpuErr)
        return await ort.InferenceSession.create(modelUrl, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all',
        })
      }
    })()

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Waktu inisialisasi model di memori perangkat habis (timeout).')),
        timeoutMs
      )
    )

    clientSession = await Promise.race([createPromise, timeoutPromise])

    // Warm-up inference with blank dummy input to prime JIT compiler
    const dummyTensor = new ort.Tensor('float32', new Float32Array(1 * 3 * 640 * 640), [1, 3, 640, 640])
    await clientSession.run({ images: dummyTensor }).catch(() => {})

    console.info('[client-hazard-ai] Model loaded successfully in device memory (100% Offline Ready).')
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

  if (!clientSession) {
    const ready = await initializeClientHazardModel()
    if (!ready || !clientSession) {
      return {
        success: false,
        mode: 'offline',
        modelName: 'hazardyolo26n-4 (Device Offline)',
        modelVersion: 'v1.0',
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

  const origW = video.videoWidth || 640
  const origH = video.videoHeight || 480

  try {
    const ort = await getOrtWeb()

    // 1. Draw frame to 640x640 offscreen canvas
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 640
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas 2D context not available')

    ctx.drawImage(video, 0, 0, 640, 640)
    const imgData = ctx.getImageData(0, 0, 640, 640)
    const pixels = imgData.data

    // 2. Preprocess to Float32Array NCHW [1, 3, 640, 640] normalized [0, 1]
    const floatArr = new Float32Array(1 * 3 * 640 * 640)
    const channelSize = 640 * 640

    for (let i = 0; i < channelSize; i++) {
      const pIdx = i * 4
      floatArr[i] = pixels[pIdx] / 255.0                  // Red
      floatArr[channelSize + i] = pixels[pIdx + 1] / 255.0  // Green
      floatArr[channelSize * 2 + i] = pixels[pIdx + 2] / 255.0 // Blue
    }

    const inputTensor = new ort.Tensor('float32', floatArr, [1, 3, 640, 640])

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
      modelName: 'hazardyolo26n-4 (Device Offline)',
      modelVersion: 'v1.0',
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
      modelName: 'hazardyolo26n-4 (Device Offline)',
      modelVersion: 'v1.0',
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
