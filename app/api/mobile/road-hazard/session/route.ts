import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { roadHazardSessions, roadHazardEvents } from '@/db/schema/road-hazard'
import { ensureRoadHazardTables } from '@/lib/road-hazard/db-helper'
import { desc, eq } from 'drizzle-orm'
import { randomBytes } from 'crypto'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Sesi berakhir, silakan login kembali.' }, { status: 401 })
    }

    await ensureRoadHazardTables()

    const body = await request.json()
    const {
      siteId,
      siteName,
      customerName,
      roadSection,
      startTime,
      endTime,
      durationSeconds,
      totalDistanceMeters,
      totalHazards,
      potholesCount,
      corrugationCount,
      rutsCount,
      severityLevel,
      summaryNotes,
      metadata,
      events = [],
    } = body

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = randomBytes(2).toString('hex').toUpperCase()
    const sessionCode = `RH-${todayStr}-${randomSuffix}`

    const [newSession] = await db
      .insert(roadHazardSessions)
      .values({
        sessionCode,
        siteId: siteId ? Number(siteId) : null,
        siteName: siteName || 'Site Operasional',
        customerName: customerName || '',
        inspectorId: session.user.id ? Number(session.user.id) : null,
        inspectorName: session.user.name || session.user.email || 'Petugas HSE',
        roadSection: roadSection || 'Hauling Road',
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : new Date(),
        durationSeconds: Number(durationSeconds ?? 0),
        totalDistanceMeters: Number(totalDistanceMeters ?? 0),
        totalHazards: Number(totalHazards ?? events.length),
        potholesCount: Number(potholesCount ?? 0),
        corrugationCount: Number(corrugationCount ?? 0),
        rutsCount: Number(rutsCount ?? 0),
        severityLevel: severityLevel || 'LOW',
        status: 'COMPLETED',
        summaryNotes: summaryNotes || '',
        metadata: metadata || null,
      })
      .returning({ id: roadHazardSessions.id })

    if (newSession?.id && Array.isArray(events) && events.length > 0) {
      const eventRows = events.map((ev: any) => ({
        sessionId: newSession.id,
        hazardType: ev.hazardType || ev.hazard_type || 'Potholes',
        confidence: String(ev.confidence ?? '0.000'),
        latitude: ev.latitude != null ? String(ev.latitude) : null,
        longitude: ev.longitude != null ? String(ev.longitude) : null,
        speedKmh: ev.speedKmh != null ? String(ev.speedKmh) : '0.00',
        photoUrl: ev.photoUrl || ev.photo_url || '',
        annotatedPhotoUrl: ev.annotatedPhotoUrl || ev.annotated_photo_url || null,
        detectionBoxes: ev.detectionBoxes || ev.detection_boxes || null,
        qualityInfo: ev.qualityInfo || ev.quality_info || null,
        notes: ev.notes || '',
        isManualSnap: Boolean(ev.isManualSnap ?? ev.is_manual_snap ?? false),
      }))

      await db.insert(roadHazardEvents).values(eventRows)
    }

    return NextResponse.json({
      success: true,
      sessionId: newSession?.id,
      sessionCode,
    })
  } catch (error) {
    console.error('[road-hazard-session-post] Error saving session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal menyimpan sesi road hazard.' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureRoadHazardTables()

    const url = new URL(request.url)
    const siteIdParam = url.searchParams.get('siteId')

    let query = db.select().from(roadHazardSessions).orderBy(desc(roadHazardSessions.createdAt)).limit(30)
    if (siteIdParam) {
      query = db
        .select()
        .from(roadHazardSessions)
        .where(eq(roadHazardSessions.siteId, Number(siteIdParam)))
        .orderBy(desc(roadHazardSessions.createdAt))
        .limit(30) as any
    }

    const rows = await query
    return NextResponse.json({ success: true, sessions: rows })
  } catch (error) {
    console.error('[road-hazard-session-get] Error fetching sessions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Gagal memuat riwayat sesi.' },
      { status: 500 }
    )
  }
}
