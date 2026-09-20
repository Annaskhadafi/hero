import { NextRequest, NextResponse } from 'next/server'

import { getCurrentMenuPermission } from '@/lib/hero-access'
import { getServerSession } from '@/lib/auth-session'
import { raraySubmitTireDamageFeedback } from '@/lib/raray-vision/client'

export const runtime = 'nodejs'

const TIRE_DAMAGE_LABELS = [
  'cut', 'crack', 'sidewall separation', 'bulging', 'chunking', 'chipping', 'lifting',
  'damage', 'cut separation', 'iron_puncture', 'worn in to ply', 'worn out',
  'tread cut separation', 'casing ply separation', 'impact', 'patchy wear', 'burnt tire',
  'lug tiring/tread chunking', 'tread lifting', 'foreign object/puncture', 'chafer separation',
  'accidental damage', 'belt edge separation', 'sidewall damage/sodewall crack',
  'shoulder separation', 'center wear', 'tread chipping', 'radial crack', 'repair failure',
  'bead damage/cracking/leaking', 'electrical discharge', 'liner/tube/rust band failure',
  'heat separation',
] as const

type Annotation = {
  shape: 'rectangle'
  label: string
  x: number
  y: number
  width: number
  height: number
}

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ canEdit: false }, { status: 401 })
  const permission = await getCurrentMenuPermission('hse_tire_inspection')
  return NextResponse.json({ canEdit: permission.canEdit })
}

function validDimension(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100_000
}

function parseAnnotations(value: unknown, imageWidth: number, imageHeight: number) {
  if (value === undefined) return [] as Annotation[]
  if (!Array.isArray(value) || value.length > 100) throw new Error('Annotations tidak valid.')

  return value.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('Annotation tidak valid.')
    const annotation = item as Record<string, unknown>
    const label = typeof annotation.label === 'string' ? annotation.label.trim() : ''
    if (!TIRE_DAMAGE_LABELS.includes(label as (typeof TIRE_DAMAGE_LABELS)[number]))
      throw new Error('Label kerusakan tidak dikenali.')
    if (annotation.shape !== 'rectangle') throw new Error('Shape annotation harus rectangle.')
    const numbers = ['x', 'y', 'width', 'height'].map((key) => annotation[key])
    if (numbers.some((number) => typeof number !== 'number' || !Number.isFinite(number)))
      throw new Error('Koordinat annotation tidak valid.')
    const [x, y, width, height] = numbers as number[]
    if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 || y + height > 1)
      throw new Error('Koordinat rectangle harus ternormalisasi 0 sampai 1.')
    return { shape: 'rectangle', label, x, y, width, height }
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await getCurrentMenuPermission('hse_tire_inspection')).canEdit)
      return NextResponse.json({ error: 'Akses feedback ditolak.' }, { status: 403 })

    const body = await request.json()
    const predictionId = typeof body.prediction_id === 'string' ? body.prediction_id.trim() : ''
    const feedback = body.feedback === 'accurate' ? 'good' : body.feedback === 'inaccurate' ? 'bad' : null
    const imageWidth = body.image_width
    const imageHeight = body.image_height
    if (!predictionId || !feedback || !validDimension(imageWidth) || !validDimension(imageHeight))
      return NextResponse.json({ error: 'Prediction, feedback, dan dimensi gambar wajib valid.' }, { status: 400 })

    const annotations = parseAnnotations(body.annotations, imageWidth, imageHeight).map((annotation) => ({
      ...annotation,
      x: annotation.x * imageWidth,
      y: annotation.y * imageHeight,
      width: annotation.width * imageWidth,
      height: annotation.height * imageHeight,
    }))
    const result = await raraySubmitTireDamageFeedback({
      predictionId,
      feedback,
      notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) || null : null,
      modelVersion: typeof body.model_version === 'string' ? body.model_version : null,
      sourceRecordId: typeof body.source_record_id === 'string' ? body.source_record_id : null,
      actorEmail: session.user.email,
      idempotencyKey: typeof body.idempotency_key === 'string' ? body.idempotency_key : null,
      imageWidth,
      imageHeight,
      annotations,
    })
    if (result.status === 'error') return NextResponse.json({ error: result.message }, { status: 502 })
    return NextResponse.json({ success: true, result: result.result })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Feedback gagal dikirim.' },
      { status: 400 }
    )
  }
}
