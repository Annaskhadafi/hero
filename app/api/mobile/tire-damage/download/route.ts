import { NextRequest, NextResponse } from 'next/server'

import { getCurrentMenuPermission } from '@/lib/hero-access'
import { getServerSession } from '@/lib/auth-session'

export const runtime = 'nodejs'

const ALLOWED_ANNOTATION_HOSTS = new Set(['is3.cloudhost.id'])

export async function GET(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const permission = await getCurrentMenuPermission('hse_tire_inspection')
  if (!permission.canView) return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })

  try {
    const source = new URL(request.nextUrl.searchParams.get('url') || '')
    if (source.protocol !== 'https:' || !ALLOWED_ANNOTATION_HOSTS.has(source.hostname)) {
      return NextResponse.json({ error: 'URL hasil anotasi tidak valid.' }, { status: 400 })
    }

    const response = await fetch(source, { cache: 'no-store', signal: AbortSignal.timeout(30_000) })
    const contentType = response.headers.get('content-type') || ''
    if (!response.ok || !contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Gambar hasil tidak tersedia.' }, { status: 502 })
    }

    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'attachment; filename="hasil-deteksi-kerusakan-ban.jpg"',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Gagal mengunduh gambar hasil.' }, { status: 502 })
  }
}
