import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { attendanceRecords, employees } from '@/db/schema/hero'
import { eq, desc } from 'drizzle-orm'
import { authenticateMobileRequest } from '@/lib/mobile-auth'
import { rarayVerifyFace, rarayCheckAntiSpoofUniFaceV2 } from '@/lib/raray-vision/client'
import { syncFaceAttendanceToTimesheet } from '@/lib/timesheet/face-attendance-sync'
import { resolveSiteAttendancePunctuality } from '@/lib/timesheet/site-attendance-punctuality'
import { uploadAttendancePhotoToS3, isS3UploadConfigured } from '@/lib/s3-storage'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'


// --- Constants ---
const CONFIDENCE_THRESHOLD = 0.45
const ALLOWED_EVENT_TYPES = ['checked-in', 'checked-out', 'auto'] as const
type EventType = (typeof ALLOWED_EVENT_TYPES)[number]

// --- Error response helper ---
function errorResponse(status: number, code: string, message: string, field?: string) {
  return NextResponse.json(
    { success: false, error: { code, message, ...(field ? { field } : {}) } },
    { status }
  )
}

/** Save attendance photo — prefer S3, fallback to local */
async function saveAttendancePhoto(
  imageBuffer: Buffer,
  mimeType: string,
  clientRequestId: string
): Promise<string> {
  const ext = mimeType.includes('png') ? 'png' : 'jpg'
  const filename = `${clientRequestId}-v2.${ext}`

  if (isS3UploadConfigured()) {
    const file = new File([imageBuffer], filename, { type: mimeType })
    const result = await uploadAttendancePhotoToS3(file)
    return result.key
  }

  // Local fallback
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'face-attendance-v2')
  await mkdir(uploadDir, { recursive: true })
  const filepath = path.join(uploadDir, filename)
  await writeFile(filepath, imageBuffer)
  return `/uploads/face-attendance-v2/${filename}`
}

export async function POST(request: NextRequest) {
  try {
    // 1. Parse JSON body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return errorResponse(400, 'VALIDATION_ERROR', 'Request body must be valid JSON.')
    }

    if (!body || typeof body !== 'object') {
      return errorResponse(400, 'VALIDATION_ERROR', 'Request body must be a JSON object.')
    }

    const {
      employeeId,
      siteId,
      eventType: rawEventType,
      imageDataUrl,
      latitude,
      longitude,
      accuracy,
      clientRequestId,
      shiftCode,
    } = body as Record<string, unknown>

    // 2. Required field validation
    if (!employeeId) return errorResponse(400, 'VALIDATION_ERROR', 'employeeId is required.', 'employeeId')
    if (!siteId) return errorResponse(400, 'VALIDATION_ERROR', 'siteId is required.', 'siteId')
    if (!rawEventType) return errorResponse(400, 'VALIDATION_ERROR', 'eventType is required.', 'eventType')
    if (!imageDataUrl || typeof imageDataUrl !== 'string')
      return errorResponse(400, 'VALIDATION_ERROR', 'imageDataUrl is required.', 'imageDataUrl')
    if (latitude === undefined || latitude === null)
      return errorResponse(400, 'VALIDATION_ERROR', 'latitude is required.', 'latitude')
    if (longitude === undefined || longitude === null)
      return errorResponse(400, 'VALIDATION_ERROR', 'longitude is required.', 'longitude')
    if (!clientRequestId || typeof clientRequestId !== 'string')
      return errorResponse(400, 'VALIDATION_ERROR', 'clientRequestId is required.', 'clientRequestId')

    // 3. Type coercion & range validation
    const empId = Number(employeeId)
    if (!Number.isFinite(empId) || empId <= 0 || !Number.isInteger(empId))
      return errorResponse(400, 'VALIDATION_ERROR', 'employeeId must be a positive integer.', 'employeeId')

    const sId = Number(siteId)
    if (!Number.isFinite(sId) || sId <= 0 || !Number.isInteger(sId))
      return errorResponse(400, 'VALIDATION_ERROR', 'siteId must be a positive integer.', 'siteId')

    const lat = Number(latitude)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90)
      return errorResponse(400, 'VALIDATION_ERROR', 'latitude must be between -90 and 90.', 'latitude')

    const lng = Number(longitude)
    if (!Number.isFinite(lng) || lng < -180 || lng > 180)
      return errorResponse(400, 'VALIDATION_ERROR', 'longitude must be between -180 and 180.', 'longitude')

    const accuracyMeters = accuracy === undefined || accuracy === null ? null : Number(accuracy)

    // 4. Auth
    const authResult = await authenticateMobileRequest(request, empId)
    if (!authResult.authenticated) {
      return errorResponse(authResult.status, authResult.code, authResult.message)
    }

    // 5. Parse image
    const matches = (imageDataUrl as string).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    if (!matches) {
      return errorResponse(400, 'INVALID_IMAGE', 'imageDataUrl must be a valid base64 image data URL.', 'imageDataUrl')
    }
    const [, mimeType, base64Data] = matches
    const imageBuffer = Buffer.from(base64Data, 'base64')
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return errorResponse(400, 'INVALID_IMAGE', 'Image must not exceed 10MB.', 'imageDataUrl')
    }

    // 6. Idempotency check
    const existing = await db
      .select()
      .from(attendanceRecords)
      .where(eq(attendanceRecords.clientRequestId, clientRequestId.trim()))
      .limit(1)

    if (existing.length > 0) {
      const rec = existing[0]
      return NextResponse.json({
        success: true,
        verified: true,
        alreadyExisted: true,
        attendanceRecord: {
          id: rec.id,
          eventType: rec.eventType,
          eventTime: rec.eventTime.toISOString(),
          status: rec.status,
          locationNote: rec.locationNote,
        },
      })
    }

    // 7. Load employee + check face V2 registration
    const empResults = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        isActive: employees.isActive,
        faceRarayId: employees.faceRarayId,
        faceRarayRegisteredAt: employees.faceRarayRegisteredAt,
      })
      .from(employees)
      .where(eq(employees.id, empId))
      .limit(1)

    if (empResults.length === 0) {
      return errorResponse(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found.', 'employeeId')
    }

    const employee = empResults[0]
    if (!employee.isActive) {
      return errorResponse(404, 'EMPLOYEE_NOT_FOUND', 'Employee is inactive.', 'employeeId')
    }

    if (!employee.faceRarayId && !employee.employeeSn) {
      return errorResponse(
        404,
        'NO_FACE_REGISTRATION_V2',
        'Employee face not registered in V2 system. Please register first.',
        'employeeId'
      )
    }

    // 8. Resolve eventType: if "auto", determine from last attendance record
    let resolvedEventType: 'checked-in' | 'checked-out'
    if (rawEventType === 'auto') {
      const lastRecord = await db
        .select({ eventType: attendanceRecords.eventType })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.employeeId, empId))
        .orderBy(desc(attendanceRecords.eventTime))
        .limit(1)

      if (lastRecord.length === 0 || lastRecord[0].eventType === 'checked-out') {
        resolvedEventType = 'checked-in'
      } else {
        resolvedEventType = 'checked-out'
      }
    } else if (rawEventType === 'checked-in' || rawEventType === 'checked-out') {
      resolvedEventType = rawEventType
    } else {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        `eventType must be one of: ${ALLOWED_EVENT_TYPES.join(', ')}.`,
        'eventType'
      )
    }

    // 8.5 Anti-Spoofing Check via UniFace-v2 API
    const antiSpoofRes = await rarayCheckAntiSpoofUniFaceV2({
      imageBuffer,
      mimeType,
    }).catch(() => null)

    if (antiSpoofRes && antiSpoofRes.status === 'spoof_detected' && (antiSpoofRes.confidence ?? 0) > 0.85) {
      console.warn('[face-recognition-v2] Anti-Spoofing detected spoof attempt:', antiSpoofRes.verdict, antiSpoofRes.confidence)
      return NextResponse.json(
        {
          success: false,
          verified: false,
          confidence: antiSpoofRes.confidence ?? 0,
          resolvedEventType,
          error: {
            code: 'SPOOFING_DETECTED',
            message: antiSpoofRes.message || '🚨 Terdeteksi foto/layar HP (Anti-Spoofing Gagal). Harap gunakan wajah asli secara langsung.',
          },
        },
        { status: 200 }
      )
    }

    // 9. Call Raray Vision to verify face using Employee SN / faceRarayId
    const rvResult = await rarayVerifyFace({
      employeeId: empId,
      employeeSn: employee.employeeSn || undefined,
      faceRarayId: employee.faceRarayId || undefined,
      imageBuffer,
      mimeType,
    })

    if (rvResult.status === 'error') {
      console.error('[face-recognition-v2] Raray Vision error:', rvResult.message)
      return errorResponse(502, 'RARAY_VISION_ERROR', rvResult.message || 'Face recognition service error.')
    }

    if (rvResult.status === 'spoofing_detected' || rvResult.is_live === false) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          confidence: rvResult.confidence ?? 0,
          resolvedEventType,
          error: {
            code: 'SPOOFING_DETECTED',
            message: rvResult.message || 'Terdeteksi foto/layar HP. Harap gunakan wajah asli secara langsung (Anti-Spoofing Gagal).',
          },
        },
        { status: 200 }
      )
    }

    if (rvResult.status === 'not_registered') {
      return errorResponse(
        404,
        'NO_FACE_REGISTRATION_V2',
        'Face not found in recognition service. Please re-register.',
        'employeeId'
      )
    }

    const confidence = rvResult.confidence ?? 0

    // 10. Threshold check
    if (!rvResult.verified || confidence < CONFIDENCE_THRESHOLD) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          confidence,
          threshold: CONFIDENCE_THRESHOLD,
          resolvedEventType,
          error: {
            code: 'FACE_NOT_MATCHED',
            message: 'Wajah tidak cocok dengan data registrasi.',
          },
        },
        { status: 200 }
      )
    }

    // 11. Build attendance record
    const eventTime = new Date()
    const gpsFlag = lat === 0 && lng === 0 ? '[gps-unavailable] ' : ''
    const accuracyNote = accuracyMeters === null ? '' : ` | GPS ${Math.round(accuracyMeters)}m accuracy`
    const punctuality = await resolveSiteAttendancePunctuality({
      siteId: sId,
      eventType: resolvedEventType,
      eventTime,
      shiftCode: typeof shiftCode === 'string' ? shiftCode : null,
    })
    const locationNote = [
      `${gpsFlag}face-v2-raray${accuracyNote}`,
      punctuality
        ? `Shift: ${punctuality.shiftCode.toUpperCase()} (masuk ${punctuality.scheduledClockIn})`
        : null,
      punctuality?.note,
    ]
      .filter(Boolean)
      .join(' | ')

    // 12. Insert attendance record IMMEDIATELY
    const [insertedRecord] = await db
      .insert(attendanceRecords)
      .values({
        employeeId: empId,
        siteId: sId,
        eventType: resolvedEventType,
        eventTime,
        status: 'verified',
        locationNote,
        photoUrl: null, // Will be updated asynchronously in background
        latitude: lat.toString(),
        longitude: lng.toString(),
        confidenceScore: confidence.toFixed(3),
        deviceType: 'mobile',
        clientRequestId: clientRequestId.trim(),
        source: 'face-v2',
      })
      .returning()

    try {
      revalidatePath('/mobile/attendance')
      revalidatePath('/mobile/attendance/face-v2')
      revalidatePath('/dashboard/attendance')
      revalidatePath('/dashboard/attendance/records')
    } catch (e) {
      console.warn('[face-recognition-v2] Path revalidation warning:', e)
    }

    // 13. Background photo upload & timesheet sync (non-blocking for ultra-fast response)
    void (async () => {
      try {
        const photoUrl = await saveAttendancePhoto(imageBuffer, mimeType, clientRequestId.trim())
        if (photoUrl) {
          await db
            .update(attendanceRecords)
            .set({ photoUrl })
            .where(eq(attendanceRecords.id, insertedRecord.id))
        }
      } catch (err) {
        console.error('[face-recognition-v2] Background photo upload failed:', err)
      }

      try {
        await syncFaceAttendanceToTimesheet(empId, sId, eventTime)
      } catch (syncError) {
        console.error('[face-recognition-v2] Timesheet sync failed:', syncError)
      }
    })()

    // 14. Return response INSTANTLY with employee & punctuality details!
    return NextResponse.json(
      {
        success: true,
        verified: true,
        confidence,
        resolvedEventType,
        employee: {
          id: employee.id,
          name: employee.name,
          employeeSn: employee.employeeSn || employee.faceRarayId || '',
        },
        punctuality: punctuality
          ? {
              shiftCode: punctuality.shiftCode,
              scheduledClockIn: punctuality.scheduledClockIn,
              lateMinutes: punctuality.lateMinutes,
              isLate: punctuality.isLate,
              note: punctuality.note,
            }
          : null,
        attendanceRecord: {
          id: insertedRecord.id,
          eventType: insertedRecord.eventType,
          eventTime: insertedRecord.eventTime.toISOString(),
          status: insertedRecord.status,
          locationNote: insertedRecord.locationNote,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[face-recognition-v2] Internal error:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred.')
  }
}
