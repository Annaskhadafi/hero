import { NextRequest, NextResponse } from 'next/server'
import { resolveSnAction } from '@/app/actions/resolve-sn-action'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    let body: { sn?: string } = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid or missing JSON payload' }, { status: 400 })
    }

    const { sn } = body
    if (!sn || typeof sn !== 'string') {
      return NextResponse.json({ error: 'SN required' }, { status: 400 })
    }

    const result = await resolveSnAction(sn)
    if (!result.success || !result.email) {
      return NextResponse.json({ error: result.error || 'SN tidak ditemukan' }, { status: 404 })
    }

    return NextResponse.json({ email: result.email, name: result.name })
  } catch (error) {
    console.error('resolve-sn error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
