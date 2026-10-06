import { NextRequest, NextResponse } from 'next/server'

import { getCurrentMenuPermission } from '@/lib/hero-access'
import { getServerSession } from '@/lib/auth-session'
import { rarayPredictTireDamage } from '@/lib/raray-vision/client'

export const runtime = 'nodejs'
export const maxDuration = 120

const ALLOWED_MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/x-msvideo',
  'video/quicktime',
])
const MAX_IMAGE_SIZE = 15 * 1024 * 1024
const MAX_VIDEO_SIZE = 100 * 1024 * 1024

function validateApiUrl(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    if (url.username || url.password) return null
    const host = url.hostname.toLowerCase()
    const privateHost = host === 'localhost' || host === '::1' || host === '0.0.0.0' ||
      /^127\\./.test(host) || /^10\\./.test(host) || /^192\\.168\\./.test(host) ||
      /^172\\.(1[6-9]|2\\d|3[0-1])\\./.test(host)
    if (privateHost) return host === 'localhost' && url.protocol === 'http:' ? url.toString().replace(/\/$/, '') : null
    if (url.protocol !== 'https:') return null
    return url.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

function validateModelEndpoint(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.trim()) return 'tire-demage-onnx'
  return /^[a-zA-Z0-9._-]{1,80}$/.test(value.trim()) ? value.trim() : null
}

function threshold(value: FormDataEntryValue | null, fallback: number) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue >= 0 && numberValue <= 1
    ? numberValue
    : fallback
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [hsePerm, geniusPerm] = await Promise.all([
      getCurrentMenuPermission('hse_tire_inspection').catch(() => ({ canView: false })),
      getCurrentMenuPermission('hero-genius').catch(() => ({ canView: false })),
    ])

    const isAuthorized = hsePerm.canView || geniusPerm.canView || Boolean(session.user)
    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Akses pendeteksi kerusakan ban ditolak.' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: 'Pilih satu file gambar atau video terlebih dahulu.' },
        { status: 400 }
      )
    }
    if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Format file harus JPG, PNG, WebP, MP4, AVI, atau MOV.' },
        { status: 400 }
      )
    }

    const apiUrl = validateApiUrl(formData.get('api_url'))
    const requestedApiUrl = formData.get('api_url')
    if (requestedApiUrl && !apiUrl)
      return NextResponse.json({ error: 'URL API harus HTTPS (HTTP hanya di localhost).' }, { status: 400 })

    const modelEndpoint = validateModelEndpoint(formData.get('model_endpoint'))
    if (!modelEndpoint)
      return NextResponse.json({ error: 'Nama model tidak valid.' }, { status: 400 })

    const maxSize = file.type.startsWith('video/') ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    if (file.size > maxSize)
      return NextResponse.json({ error: 'Ukuran file melebihi batas.' }, { status: 400 })

    const { getVisionModelSettings } = await import('@/lib/vision-model-settings')
    const visionConfig = await getVisionModelSettings().catch(() => null)
    const defaultConf = visionConfig?.defaultConfidence ?? 0.25
    const defaultIou = visionConfig?.defaultIou ?? 0.45
    const primaryEndpoint = visionConfig?.primaryEndpoint || 'tire-demage-onnx'

    const confRaw = formData.get('conf_threshold')
    const iouRaw = formData.get('iou_threshold')
    const endpointValue = formData.get('endpoint')
    const endpoint = typeof endpointValue === 'string' && endpointValue.trim() ? endpointValue.trim() : primaryEndpoint

    const prediction = await rarayPredictTireDamage({
      fileBuffer: Buffer.from(await file.arrayBuffer()),
      fileName: file.name || 'tire-media',
      mimeType: file.type,
confidenceThreshold: confRaw !== null ? threshold(confRaw, defaultConf) : defaultConf,
      iouThreshold: iouRaw !== null ? threshold(iouRaw, defaultIou) : defaultIou,
      baseUrlOverride: apiUrl ?? undefined,
      endpoint,
    })

    if (prediction.status === 'error')
      return NextResponse.json({ error: prediction.message || 'Deteksi gagal.' }, { status: 502 })
    return NextResponse.json({
      success: true,
      result: prediction.result,
      activeEndpoint: endpoint,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const { getVisionModelSettings } = await import('@/lib/vision-model-settings')
    const config = await getVisionModelSettings()
    const activePreset = config.customEndpoints.find((ep) => ep.endpoint === config.primaryEndpoint)
    return NextResponse.json({
      success: true,
      primaryEndpoint: config.primaryEndpoint,
      primaryModelName: activePreset?.name || config.primaryEndpoint,
      fallbackEndpoint: config.fallbackEndpoint,
      defaultConfidence: config.defaultConfidence,
      defaultIou: config.defaultIou,
      models: config.customEndpoints,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Gagal mengambil konfigurasi model.' },
      { status: 500 }
    )
  }
}
