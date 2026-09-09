import { NextRequest, NextResponse } from 'next/server'
import { getPublicDailyActivityEvidenceData } from '@/lib/daily-activity-documents'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params
    const cleanSessionId = typeof sessionId === 'string' ? sessionId.replace(/^daily-activity-/, '') : sessionId
    const sessionIdNum = Number(cleanSessionId)

    if (Number.isNaN(sessionIdNum) || sessionIdNum <= 0) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
    }

    const data = await getPublicDailyActivityEvidenceData(sessionIdNum)

    if (!data) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching activity evidence data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
