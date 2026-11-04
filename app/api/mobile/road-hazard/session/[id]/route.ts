import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { roadHazardSessions, roadHazardEvents } from '@/db/schema/road-hazard'
import { ensureRoadHazardTables } from '@/lib/road-hazard/db-helper'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureRoadHazardTables()
    const { id } = await props.params
    const sessionId = Number(id)
    if (!sessionId) {
      return NextResponse.json({ error: 'ID sesi tidak valid.' }, { status: 400 })
    }

    const [sessionRow] = await db
      .select()
      .from(roadHazardSessions)
      .where(eq(roadHazardSessions.id, sessionId))
      .limit(1)

    if (!sessionRow) {
      return NextResponse.json({ error: 'Sesi tidak ditemukan.' }, { status: 404 })
    }

    const events = await db
      .select()
      .from(roadHazardEvents)
      .where(eq(roadHazardEvents.sessionId, sessionId))
      .orderBy(roadHazardEvents.createdAt)

    return NextResponse.json({
      success: true,
      session: sessionRow,
      events,
    })
  } catch (error) {
    console.error('[road-hazard-session-detail] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal memuat detail sesi.' },
      { status: 500 }
    )
  }
}
