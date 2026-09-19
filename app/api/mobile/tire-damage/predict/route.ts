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

    const permission = await getCurrentMenuPermission('hse_tire_inspection')
    if (!permission.canView)
      return NextResponse.json(
        { error: 'Akses pendeteksi kerusakan ban ditolak.' },
        { status: 403 }
      )

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

    const maxSize = file.type.startsWith('video/') ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    if (file.size > maxSize)
      return NextResponse.json({ error: 'Ukuran file melebihi batas.' }, { status: 400 })

    const prediction = await rarayPredictTireDamage({
      fileBuffer: Buffer.from(await file.arrayBuffer()),
      fileName: file.name || 'tire-media',
      mimeType: file.type,
      confidenceThreshold: threshold(formData.get('conf_threshold'), 0.25),
      iouThreshold: threshold(formData.get('iou_threshold'), 0.45),
    })

    if (prediction.status === 'error')
      return NextResponse.json({ error: prediction.message || 'Deteksi gagal.' }, { status: 502 })
    return NextResponse.json({ success: true, result: prediction.result })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Terjadi kesalahan server.' },
      { status: 500 }
    )
  }
}
