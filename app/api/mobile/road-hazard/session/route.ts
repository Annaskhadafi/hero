import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { roadHazardSessions, roadHazardEvents } from '@/db/schema/road-hazard'
import { employees, sites } from '@/db/schema/hero'
import { ensureRoadHazardTables } from '@/lib/road-hazard/db-helper'
import { isS3UploadConfigured, uploadBufferToS3 } from '@/lib/s3-storage'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { desc, eq } from 'drizzle-orm'
import { randomBytes, randomUUID } from 'crypto'

export const runtime = 'nodejs'

async function persistBase64Image(dataUri: string): Promise<string> {
  if (!dataUri || !dataUri.startsWith('data:image')) {
    return dataUri
  }

  try {
    const matches = dataUri.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/)
    if (!matches || matches.length !== 3) return dataUri
    const ext = matches[1].replace('jpeg', 'jpg')
    const buffer = Buffer.from(matches[2], 'base64')
    const filename = `${randomUUID()}.${ext}`
    const s3Key = `road-hazard/${filename}`

    if (isS3UploadConfigured()) {
      await uploadBufferToS3(buffer, s3Key, `image/${ext}`)
      return `/api/uploads/${s3Key}`
    } else {
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'road-hazard')
      await mkdir(uploadsDir, { recursive: true })
      await writeFile(join(uploadsDir, filename), buffer)
      return `/api/uploads/road-hazard/${filename}`
    }
  } catch (err) {
    console.warn('[road-hazard-session] Failed saving base64 image:', err)
    return dataUri
  }
}

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

    // Safe resolution of siteId (must exist in hero_sites or be null)
    let safeSiteId: number | null = null
    const parsedSiteId = siteId != null && !isNaN(Number(siteId)) ? Number(siteId) : null
    if (parsedSiteId) {
      try {
        const [validSite] = await db
          .select({ id: sites.id })
          .from(sites)
          .where(eq(sites.id, parsedSiteId))
          .limit(1)
        if (validSite) safeSiteId = validSite.id
      } catch {
        safeSiteId = null
      }
    }

    // Safe resolution of inspectorId
    let safeInspectorId: number | null = null
    try {
      const userSn = (session.user as any)?.employeeSn || (session.user as any)?.sn
      if (userSn) {
        const [emp] = await db
          .select({ id: employees.id })
          .from(employees)
          .where(eq(employees.employeeSn, String(userSn)))
          .limit(1)
        if (emp) safeInspectorId = emp.id
      }
    } catch {
      safeInspectorId = null
    }

    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const randomSuffix = randomBytes(2).toString('hex').toUpperCase()
    const sessionCode = `RH-${todayStr}-${randomSuffix}`

    const [newSession] = await db
      .insert(roadHazardSessions)
      .values({
        sessionCode,
        siteId: safeSiteId,
        siteName: siteName || 'Site Operasional',
        customerName: customerName || '',
        inspectorId: safeInspectorId,
        inspectorName: session.user.name || session.user.email || 'Petugas HSE',
        roadSection: roadSection || 'Hauling Road',
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : new Date(),
        durationSeconds: Math.max(0, Number(durationSeconds ?? 0) || 0),
        totalDistanceMeters: Math.max(0, Number(totalDistanceMeters ?? 0) || 0),
        totalHazards: Number(totalHazards ?? events.length) || 0,
        potholesCount: Number(potholesCount ?? 0) || 0,
        corrugationCount: Number(corrugationCount ?? 0) || 0,
        rutsCount: Number(rutsCount ?? 0) || 0,
        severityLevel: severityLevel || 'LOW',
        status: 'COMPLETED',
        summaryNotes: summaryNotes || '',
        metadata: metadata || null,
      })
      .returning({ id: roadHazardSessions.id })

    if (newSession?.id && Array.isArray(events) && events.length > 0) {
      const eventRows = await Promise.all(
        events.map(async (ev: any) => {
          const confNum = Number(ev.confidence ?? 0)
          const safeConf = !isNaN(confNum) ? Math.min(Math.max(confNum, 0), 1).toFixed(3) : '0.000'
          const latNum = ev.latitude != null && !isNaN(Number(ev.latitude)) ? Number(ev.latitude) : null
          const safeLat = latNum != null ? latNum.toFixed(8) : null
          const lngNum = ev.longitude != null && !isNaN(Number(ev.longitude)) ? Number(ev.longitude) : null
          const safeLng = lngNum != null ? lngNum.toFixed(8) : null
          const speedNum = ev.speedKmh != null && !isNaN(Number(ev.speedKmh)) ? Number(ev.speedKmh) : 0
          const safeSpeed = Math.max(0, speedNum).toFixed(2)

          let photo = String(ev.photoUrl || ev.photo_url || '')
          let annotated = ev.annotatedPhotoUrl ? String(ev.annotatedPhotoUrl) : null

          // Persist base64 images if received from client-side capture
          if (photo.startsWith('data:image')) {
            photo = await persistBase64Image(photo)
          }
          if (annotated && annotated.startsWith('data:image')) {
            annotated = await persistBase64Image(annotated)
          }

          return {
            sessionId: newSession.id,
            hazardType: String(ev.hazardType || ev.hazard_type || 'Potholes').trim() || 'Potholes',
            confidence: safeConf,
            latitude: safeLat,
            longitude: safeLng,
            speedKmh: safeSpeed,
            photoUrl: photo,
            annotatedPhotoUrl: annotated || photo,
            detectionBoxes: ev.detectionBoxes || ev.detection_boxes || null,
            qualityInfo: ev.qualityInfo || ev.quality_info || null,
            notes: String(ev.notes || ''),
            isManualSnap: Boolean(ev.isManualSnap ?? ev.is_manual_snap ?? false),
          }
        })
      )

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
