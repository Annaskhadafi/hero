import { NextResponse } from 'next/server'
import { warmupServerFaceApi } from '@/lib/face-recognition/server-face-api'

export const dynamic = 'force-dynamic'

let lastWarmupAt: string | null = null

export async function GET() {
  const startedAt = Date.now()

  try {
    await warmupServerFaceApi()
    lastWarmupAt = new Date().toISOString()

    return NextResponse.json({
      success: true,
      warmed: true,
      durationMs: Date.now() - startedAt,
      lastWarmupAt,
    })
  } catch (error) {
    console.error('[face-warmup] Failed:', error)
    return NextResponse.json(
      {
        success: false,
        warmed: false,
        durationMs: Date.now() - startedAt,
        lastWarmupAt,
      },
      { status: 500 }
    )
  }
}
