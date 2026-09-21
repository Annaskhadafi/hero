import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { attendanceRecords, employees, masterSections, sites } from '@/db/schema/hero'
import { and, desc, eq, ilike, inArray } from 'drizzle-orm'
import { authenticateMobileRequest } from '@/lib/mobile-auth'
import { rarayVerifyFace, rarayCheckAntiSpoofUniFaceV2 } from '@/lib/raray-vision/client'
import { syncFaceAttendanceToTimesheet } from '@/lib/timesheet/face-attendance-sync'
import { resolveSiteAttendancePunctuality } from '@/lib/timesheet/site-attendance-punctuality'
import { validateSiteBoundary } from '@/lib/location'
import { uploadAttendancePhotoToS3, isS3UploadConfigured } from '@/lib/s3-storage'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { notifyWorkflowBellRecipients } from '@/lib/workflow-notification-center'

// --- Constants ---
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
    const file = new File([new Uint8Array(imageBuffer)], filename, { type: mimeType })
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

async function notifyHrGaLocationAlert(input: {
  employeeName: string
  siteName: string
  eventType: string
  boundaryStatus: 'outside' | 'unknown'
  distanceMeters: number | null
  radiusMeters: number | null
  explanation: string
}) {
  const sections = await db
    .select({ id: masterSections.id, headEmployeeId: masterSections.headEmployeeId })
    .from(masterSections)
    .where(and(eq(masterSections.isActive, true), ilike(masterSections.name, '%HR-GA%')))

  if (sections.length === 0) return

  const headIds = sections.map((section) => section.headEmployeeId).filter((id): id is number => id != null)
  const recipients = await db
    .select({ email: employees.email })
    .from(employees)
    .where(
      and(
        eq(employees.isActive, true),
        headIds.length > 0
          ? inArray(employees.id, headIds)
          : inArray(employees.sectionId, sections.map((section) => section.id))
      )
    )

  const distance = input.distanceMeters == null ? 'tidak tersedia' : `${input.distanceMeters} m`
  const radius = input.radiusMeters == null ? 'tidak tersedia' : `${input.radiusMeters} m`
  await notifyWorkflowBellRecipients({
    recipientEmails: recipients.map((recipient) => recipient.email),
    eventType: 'attendance_location_alert',
    category: 'info',
    title: input.boundaryStatus === 'outside' ? 'Attendance di luar lokasi' : 'GPS attendance tidak aktif',
    body: `${input.employeeName} ${input.eventType === 'checked-in' ? 'check-in' : 'check-out'} di ${input.siteName}. Jarak: ${distance}; radius: ${radius}.${input.explanation ? ` Keterangan: ${input.explanation}` : ''}`,
    url: '/dashboard/attendance/live-map',
    tagPrefix: 'attendance-location-alert',
    sendPush: false,
    metadata: {
      employeeName: input.employeeName,
      siteName: input.siteName,
      boundaryStatus: input.boundaryStatus,
      distanceMeters: input.distanceMeters,
      radiusMeters: input.radiusMeters,
    },
  })
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
      manualFallback,
      locationExplanation,
    } = body as Record<string, unknown>

    const isManualFallback = manualFallback === true

    // 2. Required field validation
    if (!employeeId)
      return errorResponse(400, 'VALIDATION_ERROR', 'employeeId is required.', 'employeeId')
    if (!siteId) return errorResponse(400, 'VALIDATION_ERROR', 'siteId is required.', 'siteId')
    if (!rawEventType)
      return errorResponse(400, 'VALIDATION_ERROR', 'eventType is required.', 'eventType')
    if (!imageDataUrl || typeof imageDataUrl !== 'string')
      return errorResponse(400, 'VALIDATION_ERROR', 'imageDataUrl is required.', 'imageDataUrl')
    if (latitude === undefined || latitude === null)
      return errorResponse(400, 'VALIDATION_ERROR', 'latitude is required.', 'latitude')
    if (longitude === undefined || longitude === null)
      return errorResponse(400, 'VALIDATION_ERROR', 'longitude is required.', 'longitude')
    if (!clientRequestId || typeof clientRequestId !== 'string')
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'clientRequestId is required.',
        'clientRequestId'
      )

    // 3. Type coercion & range validation
    const empId = Number(employeeId)
    if (!Number.isFinite(empId) || empId <= 0 || !Number.isInteger(empId))
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'employeeId must be a positive integer.',
        'employeeId'
      )

    const sId = Number(siteId)
    if (!Number.isFinite(sId) || sId <= 0 || !Number.isInteger(sId))
      return errorResponse(400, 'VALIDATION_ERROR', 'siteId must be a positive integer.', 'siteId')

    const lat = Number(latitude)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90)
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'latitude must be between -90 and 90.',
        'latitude'
      )

    const lng = Number(longitude)
    if (!Number.isFinite(lng) || lng < -180 || lng > 180)
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'longitude must be between -180 and 180.',
        'longitude'
      )

    const accuracyMeters = accuracy === undefined || accuracy === null ? null : Number(accuracy)
    const explanation = typeof locationExplanation === 'string' ? locationExplanation.trim() : ''
    if (explanation.length > 500) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Keterangan lokasi maksimal 500 karakter.', 'locationExplanation')
    }

    // 4. Auth
    const authResult = await authenticateMobileRequest(request, empId)
    if (!authResult.authenticated) {
      return errorResponse(authResult.status, authResult.code, authResult.message)
    }

    const [site] = await db
      .select({
        id: sites.id,
        name: sites.name,
        geoLatitude: sites.geoLatitude,
        geoLongitude: sites.geoLongitude,
        geoRadiusMeters: sites.geoRadiusMeters,
        allowOutsideAttendance: sites.allowOutsideAttendance,
      })
      .from(sites)
      .where(eq(sites.id, sId))
      .limit(1)

    if (!site)
      return errorResponse(404, 'SITE_NOT_FOUND', 'Site absensi tidak ditemukan.', 'siteId')

    // Keep boundary details for audit; outside GPS attendance remains allowed with a warning.
    const boundary = validateSiteBoundary(
      site,
      lat === 0 && lng === 0 ? null : lat,
      lat === 0 && lng === 0 ? null : lng
    )

    // 5. Parse image
    const matches = (imageDataUrl as string).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    if (!matches) {
      return errorResponse(
        400,
        'INVALID_IMAGE',
        'imageDataUrl must be a valid base64 image data URL.',
        'imageDataUrl'
      )
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

    if (!isManualFallback && !employee.faceRarayId && !employee.employeeSn) {
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

    const siteHasConfiguredBoundary =
      site.geoLatitude != null &&
      site.geoLongitude != null &&
      String(site.geoLatitude).trim() !== '' &&
      String(site.geoLongitude).trim() !== ''
    if (boundary.status === 'unknown' && siteHasConfiguredBoundary && !explanation) {
      return errorResponse(
        422,
        'GEOFENCE_GPS_REQUIRED',
        'GPS belum aktif. Aktifkan GPS atau isi keterangan lokasi sebelum melanjutkan.'
      )
    }

    // Manual fallback is an explicit camera photo after repeated failed attempts.
    // Keep auth, GPS and audit metadata; skip biometric verification only.
    // Execute Anti-Spoofing & Face Verification concurrently to minimize network latency
    const [antiSpoofRes, rvResult] = await Promise.all([
      isManualFallback
        ? Promise.resolve(null)
        : rarayCheckAntiSpoofUniFaceV2({
            imageBuffer,
            mimeType,
          }).catch((err) => {
            console.warn('[face-recognition-v2] Anti-Spoof check warning (non-fatal):', err)
            return null
          }),
      isManualFallback
        ? Promise.resolve(null)
        : rarayVerifyFace({
            employeeId: empId,
            employeeSn: employee.employeeSn || undefined,
            faceRarayId: employee.faceRarayId || undefined,
            imageBuffer,
            mimeType,
          }).catch((err) => {
            console.error('[face-recognition-v2] Face verify error:', err)
            return {
              status: 'error' as const,
              verified: false,
              message: err instanceof Error ? err.message : 'Error calling Vision AI',
            }
          }),
    ])

    if (
      antiSpoofRes &&
      antiSpoofRes.status === 'spoof_detected' &&
      (antiSpoofRes.confidence ?? 0) > 0.85
    ) {
      console.warn(
        '[face-recognition-v2] Anti-Spoofing detected spoof attempt:',
        antiSpoofRes.verdict,
        antiSpoofRes.confidence
      )
      return NextResponse.json(
        {
          success: false,
          verified: false,
          confidence: antiSpoofRes.confidence ?? 0,
          resolvedEventType,
          error: {
            code: 'SPOOFING_DETECTED',
            message:
              antiSpoofRes.message ||
              '🚨 Terdeteksi foto/layar HP (Anti-Spoofing Gagal). Harap gunakan wajah asli secara langsung.',
          },
        },
        { status: 200 }
      )
    }

    if (rvResult?.status === 'error') {
      console.error('[face-recognition-v2] Raray Vision error:', rvResult.message)
      return errorResponse(
        502,
        'RARAY_VISION_ERROR',
        rvResult.message || 'Face recognition service error.'
      )
    }

    if (rvResult && (rvResult.status === 'spoofing_detected' || rvResult.is_live === false)) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          confidence: rvResult.confidence ?? 0,
          resolvedEventType,
          error: {
            code: 'SPOOFING_DETECTED',
            message:
              rvResult.message ||
              'Terdeteksi foto/layar HP. Harap gunakan wajah asli secara langsung (Anti-Spoofing Gagal).',
          },
        },
        { status: 200 }
      )
    }

    if (rvResult?.status === 'not_registered') {
      return errorResponse(
        404,
        'NO_FACE_REGISTRATION_V2',
        'Face not found in recognition service. Please re-register.',
        'employeeId'
      )
    }

    const confidence = rvResult?.confidence ?? 0

    // 10. Raray Vision owns the configured identity threshold.
    if (!isManualFallback && !rvResult?.verified) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          confidence,
          threshold: rvResult?.threshold,
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
    const accuracyNote =
      accuracyMeters === null ? '' : ` | GPS ${Math.round(accuracyMeters)}m accuracy`
    const punctuality = await resolveSiteAttendancePunctuality({
      siteId: sId,
      eventType: resolvedEventType,
      eventTime,
      shiftCode: typeof shiftCode === 'string' ? shiftCode : null,
    })
    const locationNote = [
      `${gpsFlag}${isManualFallback ? 'photo-fallback' : 'face-v2-raray'}${accuracyNote}`,
      boundary.status === 'inside'
        ? `[gps-inside] ${boundary.distanceMeters}m/${boundary.radiusMeters}m`
        : boundary.status === 'outside'
          ? `[gps-outside] ${boundary.distanceMeters}m/${boundary.radiusMeters}m`
          : '[gps-unavailable]',
      explanation ? `Keterangan lokasi: ${explanation}` : null,
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
        status: isManualFallback ? 'needs-review' : 'verified',
        locationNote,
        photoUrl: null, // Will be updated asynchronously in background
        latitude: lat.toString(),
        longitude: lng.toString(),
        confidenceScore: confidence.toFixed(3),
        deviceType: 'mobile',
        clientRequestId: clientRequestId.trim(),
        source: isManualFallback ? 'photo-fallback' : 'face-v2',
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

    // Photo storage is optional / non-blocking: save in background without delaying user response
    void (async () => {
      try {
        const photoUrl = await saveAttendancePhoto(imageBuffer, mimeType, clientRequestId.trim())
        if (photoUrl) {
          await db
            .update(attendanceRecords)
            .set({ photoUrl })
            .where(eq(attendanceRecords.id, insertedRecord.id))
        }
      } catch (photoErr) {
        console.warn('[face-recognition-v2] Optional photo upload error (non-fatal):', photoErr)
      }
    })()

    // Keep Timesheet Grid projection synchronized
    try {
      await syncFaceAttendanceToTimesheet(empId, sId, eventTime)
      revalidatePath('/dashboard/scheduling-timesheet/attendance')
    } catch (syncError) {
      console.warn('[face-recognition-v2] Attendance timesheet sync warning (non-fatal):', syncError)
    }

    if (boundary.status === 'outside' || boundary.status === 'unknown') {
      void notifyHrGaLocationAlert({
        employeeName: employee.name,
        siteName: site.name,
        eventType: resolvedEventType,
        boundaryStatus: boundary.status,
        distanceMeters: boundary.distanceMeters,
        radiusMeters: boundary.radiusMeters,
        explanation,
      }).catch((notificationError) => {
        console.warn('[face-recognition-v2] HR-GA location alert warning:', notificationError)
      })
    }

    // Return only after the Grid projection is synchronized.
    return NextResponse.json(
      {
        success: true,
        verified: true,
        manualFallback: isManualFallback,
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
        boundary: {
          status: boundary.status,
          distanceMeters: boundary.distanceMeters,
          radiusMeters: boundary.radiusMeters,
          message: boundary.message,
        },
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
