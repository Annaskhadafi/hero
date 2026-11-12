import { NextResponse } from 'next/server'

import { getServerSession } from '@/lib/auth-session'
import { type TwibbonAspectRatio } from '@/lib/twibbon'
import { normalizeAndUploadTwibbonPng } from '@/lib/twibbon-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Silakan login terlebih dahulu.' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const ratio = ((formData.get('ratio') as string | null) || '1:1') as TwibbonAspectRatio
    const originalFormat = String(formData.get('originalFormat') || '').toLowerCase()

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Berkas PNG tidak ditemukan.' },
        { status: 400 }
      )
    }

    const uploaded = await normalizeAndUploadTwibbonPng(file, ratio, {
      allowClientNormalizedWebp: originalFormat === 'png',
    })
    return NextResponse.json(
      {
        success: true,
        ...uploaded,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('[api/twibbon/upload-template] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Gagal mengunggah frame PNG Twibbon.',
      },
      { status: 400 }
    )
  }
}
