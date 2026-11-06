import sharp from 'sharp'
import { join } from 'path'
import { existsSync } from 'fs'

export interface LocalHazardDetection {
  box: [number, number, number, number]
  class_name: 'Potholes' | 'Corragation' | 'Ruts' | string
  hazard_type: 'Potholes' | 'Corragation' | 'Ruts' | string
  confidence: number
}

export interface LocalHazardInferenceResult {
  success: boolean
  mode: 'system'
  modelName: string
  modelVersion: string
  detections: LocalHazardDetection[]
  detectionCount: number
  topConfidence: number
  latencyMs: number
  potholesCount: number
  corrugationCount: number
  rutsCount: number
  error?: string
}

let ortModule: any = null
let sessionPromise: Promise<any> | null = null

async function getOrt(): Promise<any> {
  if (!ortModule) {
    try {
      ortModule = await import('onnxruntime-node')
    } catch (err) {
      console.warn('[road-hazard-onnx] onnxruntime-node could not be loaded dynamically:', err)
      throw new Error('Modul onnxruntime-node tidak tersedia di environment ini.')
    }
  }
  return ortModule
}

function getModelPath(): string {
  const primaryPath = join(process.cwd(), 'Weight', 'hazardyolo26n-4.onnx')
  if (existsSync(primaryPath)) return primaryPath

  const fallbackPath = 'D:\\\[01] PROJECT\\HERO\\Weight\\hazardyolo26n-4.onnx'
  if (existsSync(fallbackPath)) return fallbackPath

  throw new Error(`Berkas model ONNX tidak ditemukan di ${primaryPath} atau ${fallbackPath}`)
}

async function getInferenceSession(): Promise<any> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const ort = await getOrt()
      const modelPath = getModelPath()
      const sessionOptions = {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
        intraOpNumThreads: 2,
      }
      return await ort.InferenceSession.create(modelPath, sessionOptions)
    })()
  }
  return sessionPromise
}

export async function runLocalOnnxHazardInference(params: {
  fileBuffer: Buffer
  confidenceThreshold?: number
  iouThreshold?: number
}): Promise<LocalHazardInferenceResult> {
  const startTime = performance.now()
  const confThreshold = params.confidenceThreshold ?? 0.20

  try {
    const ort = await getOrt()
    const session = await getInferenceSession()

    // 1. Get original image dimensions using sharp
    const metadata = await sharp(params.fileBuffer).metadata()
    const origW = metadata.width || 640
    const origH = metadata.height || 640

    // 2. Pre-process image: Resize to 640x640, remove alpha, raw RGB
    const { data: rawData } = await sharp(params.fileBuffer)
      .resize(640, 640, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    // 3. Convert HWC (RGBRGB...) to NCHW (RRR... GGG... BBB...) float32 normalized [0.0, 1.0]
    const planeSize = 640 * 640
    const floatArr = new Float32Array(3 * planeSize)

    for (let i = 0; i < planeSize; i++) {
      floatArr[i] = rawData[i * 3] / 255.0                     // R
      floatArr[planeSize + i] = rawData[i * 3 + 1] / 255.0     // G
      floatArr[planeSize * 2 + i] = rawData[i * 3 + 2] / 255.0 // B
    }

    const inputTensor = new ort.Tensor('float32', floatArr, [1, 3, 640, 640])

    // 4. Run ONNX model inference
    const outputs = await session.run({ images: inputTensor })
    const outputTensor = outputs.output0

    if (!outputTensor || !outputTensor.data) {
      throw new Error('Invalid output tensor from hazardyolo26n-4.onnx')
    }

    const outputData = outputTensor.data as Float32Array
    // output0 shape: [1, 300, 6] -> 300 detection candidates
    const numCandidates = 300
    const detections: LocalHazardDetection[] = []

    let potholesCount = 0
    let corrugationCount = 0
    let rutsCount = 0
    let topConfidence = 0

    for (let i = 0; i < numCandidates; i++) {
      const offset = i * 6
      const x1_640 = outputData[offset + 0]
      const y1_640 = outputData[offset + 1]
      const x2_640 = outputData[offset + 2]
      const y2_640 = outputData[offset + 3]
      const score = outputData[offset + 4]
      const classId = Math.round(outputData[offset + 5])

      // Sensitivity filter (allows down to 0.00 as requested by user)
      if (score < confThreshold) continue

      if (score > topConfidence) {
        topConfidence = score
      }

      // Map class names based on model training metadata:
      // {0: 'Corragation', 1: 'Potholes', 2: 'Ruts'}
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

      // Scale box coordinates from 640x640 back to original image dimensions
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
      mode: 'system',
      modelName: 'hazardyolo26n-4 (Local ONNX)',
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
    console.error('[road-hazard-onnx] Inference error:', err)
    return {
      success: false,
      mode: 'system',
      modelName: 'hazardyolo26n-4 (Local ONNX)',
      modelVersion: 'v1.0',
      detections: [],
      detectionCount: 0,
      topConfidence: 0,
      latencyMs: Math.round(endTime - startTime),
      potholesCount: 0,
      corrugationCount: 0,
      rutsCount: 0,
      error: err instanceof Error ? err.message : 'Gagal memproses model ONNX lokal.',
    }
  }
}
