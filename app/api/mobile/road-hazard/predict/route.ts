import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-session'
import { rarayPredictRoadHazard } from '@/lib/raray-vision/client'
import { isS3UploadConfigured, uploadBufferToS3 } from '@/lib/s3-storage'
import { resolveUploadUrl } from '@/lib/resolve-upload-url'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const maxDuration = 60

const ALLOWED_MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
])

function parseThreshold(value: FormDataEntryValue | null, fallback: number) {
  const num = Number(value)
  return Number.isFinite(num) && num >= 0 && num <= 1 ? num : fallback
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Sesi berakhir, silakan login kembali.' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: 'File gambar atau video jalan tidak ditemukan.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Format file harus JPG, PNG, WebP, atau MP4.' },
        { status: 400 }
      )
    }

    const confThreshold = parseThreshold(formData.get('conf_threshold'), 0.25)
    const iouThreshold = parseThreshold(formData.get('iou_threshold'), 0.45)
    const isSnap = formData.get('is_snap') === 'true'

    const buffer = Buffer.from(await file.arrayBuffer())

    // 1. Call Raray Vision Road Hazard endpoint
    const predictionRes = await rarayPredictRoadHazard({
      fileBuffer: buffer,
      fileName: file.name || `road-frame-${Date.now()}.jpg`,
      mimeType: file.type,
      confidenceThreshold: confThreshold,
      iouThreshold: iouThreshold,
    })

    if (predictionRes.status === 'error' || !predictionRes.result) {
      return NextResponse.json(
        { error: predictionRes.message || 'Gagal memproses analisis road hazard AI.' },
        { status: 502 }
      )
    }

    const rawResult = predictionRes.result
    const detections = Array.isArray(rawResult.detections) ? rawResult.detections : []

    // 2. Normalize hazard detections
    const normalizedDetections = detections.map((det) => {
      const rawClass = String(det.class_name || det.class || det.label || '').trim()
      let hazardType = 'Other'
      const lower = rawClass.toLowerCase()
      if (lower.includes('pothole') || lower.includes('lubang')) {
        hazardType = 'Potholes'
      } else if (lower.includes('corragation') || lower.includes('corrugation') || lower.includes('keriting') || lower.includes('gelombang')) {
        hazardType = 'Corragation'
      } else if (lower.includes('rut') || lower.includes('ambles') || lower.includes('alur')) {
        hazardType = 'Ruts'
      } else if (rawClass) {
        hazardType = rawClass
      }

      const conf = typeof det.confidence === 'number' ? det.confidence : Number(det.score ?? 0)
      return {
        ...det,
        hazard_type: hazardType,
        confidence: Number((conf > 1 ? conf / 100 : conf).toFixed(3)),
      }
    })

    // Count breakdown
    let potholesCount = 0
    let corrugationCount = 0
    let rutsCount = 0

    for (const d of normalizedDetections) {
      if (d.hazard_type === 'Potholes') potholesCount++
      else if (d.hazard_type === 'Corragation') corrugationCount++
      else if (d.hazard_type === 'Ruts') rutsCount++
    }

    // 3. Save snapshot file ONLY if requested as an explicit snap (saves heavy S3 upload on live frames)
    let savedPhotoUrl = ''
    if (isSnap) {
      const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg'
      const filename = `${randomUUID()}.${ext}`
      const s3Key = `road-hazard/${filename}`

      try {
        if (isS3UploadConfigured()) {
          await uploadBufferToS3(buffer, s3Key, file.type)
          savedPhotoUrl = `/api/uploads/${s3Key}`
        } else {
          const uploadsDir = join(process.cwd(), 'public', 'uploads', 'road-hazard')
          await mkdir(uploadsDir, { recursive: true })
          await writeFile(join(uploadsDir, filename), buffer)
          savedPhotoUrl = `/api/uploads/road-hazard/${filename}`
        }
      } catch (uploadErr) {
        console.warn('[road-hazard-upload] Failed to store snapshot persistently:', uploadErr)
      }
    }

    // Safe resolution of annotated image url if returned from Raray Vision S3
    const resolvedAnnotatedUrl = rawResult.annotated_image_url
      ? resolveUploadUrl(rawResult.annotated_image_url)
      : null

    return NextResponse.json({
      success: true,
      predictionId: rawResult.prediction_id,
      modelName: rawResult.model_name || 'Road hazard PPA BA',
      modelVersion: rawResult.model_version || 'v1',
      detections: normalizedDetections,
      detectionCount: normalizedDetections.length,
      topConfidence: rawResult.top_confidence || 0,
      latencyMs: rawResult.latency_ms || 0,
      photoUrl: savedPhotoUrl || resolvedAnnotatedUrl,
      annotatedPhotoUrl: resolvedAnnotatedUrl || savedPhotoUrl,
      potholesCount,
      corrugationCount,
      rutsCount,
      quality: rawResult.quality || null,
    })
  } catch (error) {
    console.error('[road-hazard-predict] Server error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Terjadi kesalahan internal server.' },
      { status: 500 }
    )
  }
}
