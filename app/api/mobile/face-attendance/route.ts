import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { db } from '@/db'
import { attendanceRecords, employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { syncFaceAttendanceToTimesheet } from '@/lib/timesheet/face-attendance-sync'
import { resolveSiteAttendancePunctuality } from '@/lib/timesheet/site-attendance-punctuality'
import { authenticateMobileRequest } from '@/lib/mobile-auth'

// --- Photo Storage ---
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'face-attendance')

async function savePhoto(photo: File, clientRequestId: string): Promise<string> {
  await mkdir(UPLOAD_DIR, { recursive: true })
  const ext = photo.type === 'image/png' ? 'png' : 'jpg'
  const timestamp = Date.now()
  const filename = `${clientRequestId}-${timestamp}.${ext}`
  const filepath = path.join(UPLOAD_DIR, filename)
  const buffer = Buffer.from(await photo.arrayBuffer())
  await writeFile(filepath, buffer)
  return `/uploads/face-attendance/${filename}`
}

// --- Constants ---
const CONFIDENCE_THRESHOLD = 0.7
const MAX_PHOTO_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png']
const ALLOWED_EVENT_TYPES = ['checked-in', 'checked-out']
const ALLOWED_DEVICE_TYPES = ['mobile', 'kiosk']
const ALLOWED_SOURCES = ['face-recognition', 'photo-fallback']

// --- Error response helper ---
function errorResponse(
  status: number,
  code: string,
  message: string,
  field?: string,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(field ? { field } : {}), ...extra },
    },
    { status }
  )
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse FormData
    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return errorResponse(400, 'VALIDATION_ERROR', 'Request body must be valid FormData.')
    }

    // 3. Extract fields
    const employeeIdRaw = formData.get('employeeId')
    const siteIdRaw = formData.get('siteId')
    const eventType = formData.get('eventType') as string | null
    const shiftCode = formData.get('shiftCode') as string | null
    const photo = formData.get('photo') as File | null
    const latitudeRaw = formData.get('latitude')
    const longitudeRaw = formData.get('longitude')
    const accuracyRaw = formData.get('accuracy')
    const confidenceScoreRaw = formData.get('confidenceScore')
    const deviceType = formData.get('deviceType') as string | null
    const clientRequestId = formData.get('clientRequestId') as string | null
    const source = formData.get('source') as string | null // 'face-recognition' | 'photo-fallback'

    // 4. Required fields validation
    if (!employeeIdRaw || employeeIdRaw.toString().trim() === '') {
      return errorResponse(400, 'VALIDATION_ERROR', 'employeeId is required.', 'employeeId')
    }
    if (!siteIdRaw || siteIdRaw.toString().trim() === '') {
      return errorResponse(400, 'VALIDATION_ERROR', 'siteId is required.', 'siteId')
    }
    if (!eventType || eventType.trim() === '') {
      return errorResponse(400, 'VALIDATION_ERROR', 'eventType is required.', 'eventType')
    }
    if (!photo) {
      return errorResponse(400, 'VALIDATION_ERROR', 'photo is required.', 'photo')
    }
    if (latitudeRaw === null || latitudeRaw.toString().trim() === '') {
      return errorResponse(400, 'VALIDATION_ERROR', 'latitude is required.', 'latitude')
    }
    if (longitudeRaw === null || longitudeRaw.toString().trim() === '') {
      return errorResponse(400, 'VALIDATION_ERROR', 'longitude is required.', 'longitude')
    }
    if (confidenceScoreRaw === null || confidenceScoreRaw.toString().trim() === '') {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'confidenceScore is required.',
        'confidenceScore'
      )
    }
    if (!deviceType || deviceType.trim() === '') {
      return errorResponse(400, 'VALIDATION_ERROR', 'deviceType is required.', 'deviceType')
    }
    if (!clientRequestId || clientRequestId.trim() === '') {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'clientRequestId is required.',
        'clientRequestId'
      )
    }

    // 5. Type coercion & range validation
    const employeeId = parseInt(employeeIdRaw.toString(), 10)
    if (isNaN(employeeId) || employeeId <= 0) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'employeeId must be a positive integer.',
        'employeeId'
      )
    }

    // Authentication — after employeeId is parsed for ownership validation
    const authResult = await authenticateMobileRequest(request, employeeId)
    if (!authResult.authenticated) {
      return errorResponse(authResult.status, authResult.code, authResult.message)
    }

    const siteId = parseInt(siteIdRaw.toString(), 10)
    if (isNaN(siteId) || siteId <= 0) {
      return errorResponse(400, 'VALIDATION_ERROR', 'siteId must be a positive integer.', 'siteId')
    }

    if (!ALLOWED_EVENT_TYPES.includes(eventType.trim())) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        `eventType must be one of: ${ALLOWED_EVENT_TYPES.join(', ')}.`,
        'eventType'
      )
    }

    const latitude = parseFloat(latitudeRaw.toString())
    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'latitude must be a number between -90 and 90.',
        'latitude'
      )
    }

    const longitude = parseFloat(longitudeRaw.toString())
    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'longitude must be a number between -180 and 180.',
        'longitude'
      )
    }

    if (shiftCode && shiftCode.length > 40) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'shiftCode must be at most 40 characters.',
        'shiftCode'
      )
    }

    const accuracy =
      accuracyRaw === null || accuracyRaw.toString().trim() === ''
        ? null
        : parseFloat(accuracyRaw.toString())
    if (accuracy !== null && (isNaN(accuracy) || accuracy < 0 || accuracy > 100000)) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'accuracy must be a number between 0 and 100000 meters.',
        'accuracy'
      )
    }

    const confidenceScore = parseFloat(confidenceScoreRaw.toString())
    if (isNaN(confidenceScore) || confidenceScore < 0 || confidenceScore > 1) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'confidenceScore must be a number between 0 and 1.',
        'confidenceScore'
      )
    }

    if (!ALLOWED_DEVICE_TYPES.includes(deviceType.trim())) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        `deviceType must be one of: ${ALLOWED_DEVICE_TYPES.join(', ')}.`,
        'deviceType'
      )
    }

    if (clientRequestId.length > 255) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'clientRequestId must be at most 255 characters.',
        'clientRequestId'
      )
    }

    // 6. Photo validation
    if (!ALLOWED_MIME_TYPES.includes(photo.type)) {
      return errorResponse(400, 'INVALID_PHOTO', 'Photo must be JPEG or PNG format.', 'photo', {
        allowedFormats: ALLOWED_MIME_TYPES,
      })
    }
    if (photo.size > MAX_PHOTO_SIZE) {
      return errorResponse(400, 'INVALID_PHOTO', 'Photo must not exceed 5MB.', 'photo', {
        maxSize: '5MB',
      })
    }

    // 7. Confidence threshold check (skip for photo-fallback source)
    const isPhotoFallback = source === 'photo-fallback'
    if (!isPhotoFallback && confidenceScore < CONFIDENCE_THRESHOLD) {
      return errorResponse(
        422,
        'LOW_CONFIDENCE',
        `Confidence score ${confidenceScore} is below the minimum threshold of ${CONFIDENCE_THRESHOLD}.`,
        'confidenceScore',
        { threshold: CONFIDENCE_THRESHOLD, actual: confidenceScore }
      )
    }

    // 8. Idempotency check — return existing record if clientRequestId already exists
    const existingRecords = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.clientRequestId, clientRequestId.trim()))
      .limit(1)

    if (existingRecords.length > 0) {
      const existing = existingRecords[0]
      return NextResponse.json(
        {
          success: true,
          record: {
            id: existing.id,
            employeeId: existing.employeeId,
            siteId: existing.siteId,
            eventType: existing.eventType,
            eventTime: existing.eventTime.toISOString(),
            status: existing.status,
            locationNote: existing.locationNote,
            photoUrl: existing.photoUrl,
            confidenceScore: existing.confidenceScore ? parseFloat(existing.confidenceScore) : null,
            alreadyExisted: true,
          },
        },
        { status: 200 }
      )
    }

    // 9. Employee existence + active status check
    const employeeResults = await db
      .select({ id: employees.id, isActive: employees.isActive })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1)

    if (employeeResults.length === 0 || !employeeResults[0].isActive) {
      return errorResponse(
        404,
        'EMPLOYEE_NOT_FOUND',
        'Employee not found or is inactive.',
        'employeeId'
      )
    }

    // 10. Store record — save photo to disk
    let photoUrl: string
    try {
      photoUrl = await savePhoto(photo, clientRequestId.trim())
    } catch (err) {
      console.error('[face-attendance] Photo storage failed:', err)
      return errorResponse(500, 'STORAGE_ERROR', 'Failed to save photo file.')
    }
    const eventTime = new Date()

    // GPS flag — mark when GPS data is unavailable
    const gpsFlag = latitude === 0 && longitude === 0 ? '[gps-unavailable] ' : ''
    const accuracyNote = accuracy === null ? '' : ` | GPS ${Math.round(accuracy)}m accuracy`
    const punctuality = await resolveSiteAttendancePunctuality({
      siteId,
      eventType: eventType.trim(),
      eventTime,
      shiftCode,
      employeeId: employee.id,
    })
    const locationNote = [
      isPhotoFallback
        ? `${gpsFlag}photo-fallback${accuracyNote}`
        : `${gpsFlag}${deviceType.trim()}${accuracyNote}`,
      punctuality
        ? `Shift: ${punctuality.shiftCode.toUpperCase()} (masuk ${punctuality.scheduledClockIn})`
        : null,
      punctuality?.note,
    ]
      .filter(Boolean)
      .join(' | ')

    const [insertedRecord] = await db
      .insert(attendanceRecords)
      .values({
        employeeId,
        siteId,
        eventType: eventType.trim(),
        eventTime,
        status: isPhotoFallback ? 'needs-review' : 'verified',
        locationNote,
        photoUrl,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        confidenceScore: confidenceScore.toFixed(3),
        deviceType: deviceType.trim(),
        clientRequestId: clientRequestId.trim(),
      })
      .returning()

    // 11. Sync to timesheet inline — if it fails, log error but still return success
    try {
      await syncFaceAttendanceToTimesheet(employeeId, siteId, eventTime)
    } catch (syncError) {
      console.error('[face-attendance] Timesheet sync failed:', syncError)
    }

    // 12. Return 201 with created record
    return NextResponse.json(
      {
        success: true,
        record: {
          id: insertedRecord.id,
          employeeId: insertedRecord.employeeId,
          siteId: insertedRecord.siteId,
          eventType: insertedRecord.eventType,
          eventTime: insertedRecord.eventTime.toISOString(),
          status: insertedRecord.status,
          locationNote: insertedRecord.locationNote,
          photoUrl: insertedRecord.photoUrl,
          confidenceScore: confidenceScore,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[face-attendance] Internal error:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred.')
  }
}
