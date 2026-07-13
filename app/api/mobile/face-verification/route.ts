import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { attendanceRecords, employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { cosineSimilarity } from '@/lib/face-recognition/cosine-similarity'
import { validateEmbedding } from '@/lib/face-recognition/embedding-validator'
import { extractServerFaceEmbedding } from '@/lib/face-recognition/server-face-api'
import { syncFaceAttendanceToTimesheet } from '@/lib/timesheet/face-attendance-sync'
import { authenticateMobileRequest } from '@/lib/mobile-auth'

// --- Constants ---
const SIMILARITY_THRESHOLD = 0.85
const FACE_DISTANCE_THRESHOLD = 0.55
const DETECTION_SCORE_THRESHOLD = 0.5
const ALLOWED_EVENT_TYPES = ['checked-in', 'checked-out']
const MAX_PHOTO_SIZE = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type FaceVerificationPayload = {
  employeeId?: unknown
  embedding?: unknown
  photo?: unknown
  siteId?: unknown
  eventType?: unknown
  latitude?: unknown
  longitude?: unknown
  accuracy?: unknown
  clientRequestId?: unknown
}

// --- Error response helper ---
function errorResponse(status: number, code: string, message: string, field?: string) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(field ? { field } : {}) },
    },
    { status }
  )
}

function euclideanDistance(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return Number.POSITIVE_INFINITY

  let sum = 0
  for (let index = 0; index < a.length; index++) {
    const delta = a[index] - b[index]
    sum += delta * delta
  }

  return Math.sqrt(sum)
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse JSON body
    let body: FaceVerificationPayload
    try {
      body = (await request.json()) as FaceVerificationPayload
    } catch {
      return errorResponse(400, 'VALIDATION_ERROR', 'Request body must be valid JSON.')
    }

    if (!body || typeof body !== 'object') {
      return errorResponse(400, 'VALIDATION_ERROR', 'Request body must be a JSON object.')
    }

    const {
      employeeId,
      embedding,
      photo,
      siteId,
      eventType,
      latitude,
      longitude,
      accuracy,
      clientRequestId,
    } = body

    // 2. Required fields validation
    if (employeeId === undefined || employeeId === null) {
      return errorResponse(400, 'VALIDATION_ERROR', 'employeeId is required.', 'employeeId')
    }
    if ((embedding === undefined || embedding === null) && (photo === undefined || photo === null)) {
      return errorResponse(400, 'VALIDATION_ERROR', 'embedding or photo is required.', 'photo')
    }
    if (siteId === undefined || siteId === null) {
      return errorResponse(400, 'VALIDATION_ERROR', 'siteId is required.', 'siteId')
    }
    if (!eventType) {
      return errorResponse(400, 'VALIDATION_ERROR', 'eventType is required.', 'eventType')
    }
    if (latitude === undefined || latitude === null) {
      return errorResponse(400, 'VALIDATION_ERROR', 'latitude is required.', 'latitude')
    }
    if (longitude === undefined || longitude === null) {
      return errorResponse(400, 'VALIDATION_ERROR', 'longitude is required.', 'longitude')
    }
    if (!clientRequestId) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'clientRequestId is required.',
        'clientRequestId'
      )
    }

    // 3. Type & range validation
    const empId = Number(employeeId)
    if (!Number.isFinite(empId) || empId <= 0 || !Number.isInteger(empId)) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'employeeId must be a positive integer.',
        'employeeId'
      )
    }

    // 4. Authentication (after parsing employeeId for ownership validation)
    const authResult = await authenticateMobileRequest(request, empId)
    if (!authResult.authenticated) {
      return errorResponse(authResult.status, authResult.code, authResult.message)
    }

    const sId = Number(siteId)
    if (!Number.isFinite(sId) || sId <= 0 || !Number.isInteger(sId)) {
      return errorResponse(400, 'VALIDATION_ERROR', 'siteId must be a positive integer.', 'siteId')
    }

    if (typeof eventType !== 'string' || !ALLOWED_EVENT_TYPES.includes(eventType)) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        `eventType must be one of: ${ALLOWED_EVENT_TYPES.join(', ')}.`,
        'eventType'
      )
    }

    const lat = Number(latitude)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'latitude must be a number between -90 and 90.',
        'latitude'
      )
    }

    const lng = Number(longitude)
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'longitude must be a number between -180 and 180.',
        'longitude'
      )
    }

    const accuracyMeters = accuracy === undefined || accuracy === null ? null : Number(accuracy)
    if (
      accuracyMeters !== null &&
      (!Number.isFinite(accuracyMeters) || accuracyMeters < 0 || accuracyMeters > 100000)
    ) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'accuracy must be a number between 0 and 100000 meters.',
        'accuracy'
      )
    }

    if (typeof clientRequestId !== 'string' || clientRequestId.trim() === '') {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'clientRequestId must be a non-empty string.',
        'clientRequestId'
      )
    }

    // 5. Build live embedding. Prefer server-side photo extraction to avoid client model load.
    let liveEmbedding: number[]
    let detectionScore: number | null = null
    if (photo && typeof photo === 'object') {
      const photoPayload = photo as { dataUrl?: unknown; type?: unknown; size?: unknown }
      const dataUrl = typeof photoPayload.dataUrl === 'string' ? photoPayload.dataUrl : ''
      const matches = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
      if (!matches) {
        return errorResponse(400, 'INVALID_PHOTO', 'Photo payload is invalid.', 'photo')
      }

      const [, mimeType, base64] = matches
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return errorResponse(400, 'INVALID_PHOTO', 'Photo must be JPEG, PNG, or WEBP.', 'photo')
      }

      const buffer = Buffer.from(base64, 'base64')
      if (buffer.length > MAX_PHOTO_SIZE) {
        return errorResponse(400, 'INVALID_PHOTO', 'Photo must not exceed 5MB.', 'photo')
      }

      const extraction = await extractServerFaceEmbedding(buffer)
      if (!extraction) {
        return NextResponse.json(
          { verified: false, error: { code: 'NO_FACE_DETECTED', message: 'Wajah tidak terdeteksi.' } },
          { status: 200 }
        )
      }

      liveEmbedding = extraction.embedding
      detectionScore = extraction.detectionScore
      if (detectionScore < DETECTION_SCORE_THRESHOLD) {
        return NextResponse.json(
          {
            verified: false,
            similarityScore: null,
            detectionScore,
            error: { code: 'LOW_FACE_DETECTION_SCORE', message: 'Kualitas deteksi wajah terlalu rendah.' },
          },
          { status: 200 }
        )
      }
    } else {
      const embeddingValidation = validateEmbedding(embedding)
      if (!embeddingValidation.valid) {
        return errorResponse(
          400,
          'INVALID_EMBEDDING',
          embeddingValidation.error || 'Invalid embedding.'
        )
      }
      liveEmbedding = embedding as number[]
    }

    // 6. Idempotency check — return existing record if clientRequestId already exists
    const existingRecords = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.clientRequestId, clientRequestId.trim()))
      .limit(1)

    if (existingRecords.length > 0) {
      const existing = existingRecords[0]
      return NextResponse.json(
        {
          verified: true,
          similarityScore: existing.confidenceScore ? parseFloat(existing.confidenceScore) : null,
          attendanceRecord: {
            id: existing.id,
            eventType: existing.eventType,
            eventTime: existing.eventTime.toISOString(),
          },
        },
        { status: 200 }
      )
    }

    // 7. Retrieve employee and stored embedding
    const employeeResults = await db
      .select({
        id: employees.id,
        isActive: employees.isActive,
        faceEmbedding: employees.faceEmbedding,
      })
      .from(employees)
      .where(eq(employees.id, empId))
      .limit(1)

    if (employeeResults.length === 0) {
      return errorResponse(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found.', 'employeeId')
    }

    const employee = employeeResults[0]

    if (!employee.isActive) {
      return errorResponse(
        404,
        'EMPLOYEE_NOT_FOUND',
        'Employee not found or is inactive.',
        'employeeId'
      )
    }

    if (!employee.faceEmbedding) {
      return errorResponse(
        404,
        'NO_FACE_REGISTRATION',
        'Employee has no registered face embedding. Please register first.'
      )
    }

    // 8. Compute cosine similarity
    const storedEmbedding = employee.faceEmbedding as number[]
    const similarity = cosineSimilarity(liveEmbedding, storedEmbedding)
    const faceDistance = euclideanDistance(liveEmbedding, storedEmbedding)

    // 8.5 Replay detection: exact 1.0 means stored embedding was replayed
    if (similarity === 1.0 || faceDistance === 0) {
      return errorResponse(
        422,
        'REPLAY_DETECTED',
        'Exact embedding match detected. Live capture required.'
      )
    }

    // 9. Threshold check
    if (similarity < SIMILARITY_THRESHOLD || faceDistance > FACE_DISTANCE_THRESHOLD) {
      return NextResponse.json(
        {
          verified: false,
          similarityScore: similarity,
          faceDistance,
          detectionScore,
          thresholds: {
            similarity: SIMILARITY_THRESHOLD,
            faceDistance: FACE_DISTANCE_THRESHOLD,
          },
        },
        { status: 200 }
      )
    }

    // 10. Verified — create attendance record
    const eventTime = new Date()
    const gpsFlag = lat === 0 && lng === 0 ? '[gps-unavailable] ' : ''
    const accuracyNote = accuracyMeters === null ? '' : ` | GPS ${Math.round(accuracyMeters)}m accuracy`

    const [insertedRecord] = await db
      .insert(attendanceRecords)
      .values({
        employeeId: empId,
        siteId: sId,
        eventType: eventType,
        eventTime,
        status: 'verified',
        locationNote: `${gpsFlag}face-recognition${accuracyNote}`,
        confidenceScore: similarity.toFixed(3),
        deviceType: 'mobile',
        clientRequestId: clientRequestId.trim(),
        latitude: lat.toString(),
        longitude: lng.toString(),
      })
      .returning()

    // 11. Sync to timesheet — if it fails, log error but still return success
    try {
      await syncFaceAttendanceToTimesheet(empId, sId, eventTime)
    } catch (syncError) {
      console.error('[face-verification] Timesheet sync failed:', syncError)
    }

    // 12. Return success response
    return NextResponse.json(
      {
        verified: true,
        similarityScore: similarity,
        faceDistance,
        detectionScore,
        attendanceRecord: {
          id: insertedRecord.id,
          eventType: insertedRecord.eventType,
          eventTime: insertedRecord.eventTime.toISOString(),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[face-verification] Internal error:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred.')
  }
}
