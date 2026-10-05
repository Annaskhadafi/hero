import { NextRequest, NextResponse } from 'next/server'
import { getTireCheckData } from '@/app/actions/tire-check'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const site = searchParams.get('site') || 'CK-BIB GH'
    const period = searchParams.get('period') || '2026-02'

    const result = await getTireCheckData(site, period)

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      },
    })
  } catch (error: any) {
    console.error('Error handling /api/tire-check:', error)
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal memuat data Tire Check',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}
