import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { authenticateMobileRequest } from '@/lib/mobile-auth'
import { rarayRegisterFace } from '@/lib/raray-vision/client'

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

    const { employeeId, imageDataUrl, force } = body as Record<string, unknown>

    let empId = Number(employeeId || 0)

    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return errorResponse(400, 'VALIDATION_ERROR', 'imageDataUrl is required (base64 data URL).', 'imageDataUrl')
    }

    // 3. Auth
    const authResult = await authenticateMobileRequest(request, empId > 0 ? empId : undefined)
    if (!authResult.authenticated) {
      return errorResponse(authResult.status, authResult.code, authResult.message)
    }

    if (empId <= 0 && authResult.type === 'session') {
      empId = authResult.employeeId
    }

    if (empId <= 0) {
      return errorResponse(400, 'VALIDATION_ERROR', 'employeeId must be a positive integer.', 'employeeId')
    }

    // 4. Parse image data URL
    const matches = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
    if (!matches) {
      return errorResponse(400, 'INVALID_IMAGE', 'imageDataUrl must be a valid base64 image data URL.', 'imageDataUrl')
    }
    const [, mimeType, base64Data] = matches
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedMimeTypes.includes(mimeType)) {
      return errorResponse(400, 'INVALID_IMAGE', 'Image must be JPEG, PNG, or WEBP.', 'imageDataUrl')
    }

    const imageBuffer = Buffer.from(base64Data, 'base64')
    if (imageBuffer.length > 10 * 1024 * 1024) {
      return errorResponse(400, 'INVALID_IMAGE', 'Image must not exceed 10MB.', 'imageDataUrl')
    }

    // 5. Look up employee
    const employeeResults = await db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        isActive: employees.isActive,
        faceRarayRegisteredAt: employees.faceRarayRegisteredAt,
      })
      .from(employees)
      .where(eq(employees.id, empId))
      .limit(1)

    if (employeeResults.length === 0 || !employeeResults[0].isActive) {
      return errorResponse(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found or is inactive.', 'employeeId')
    }

    const employee = employeeResults[0]
    const forceOverwrite = force === true

    // 6. Check if already registered (without force)
    if (employee.faceRarayRegisteredAt && !forceOverwrite) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ALREADY_REGISTERED',
            message: 'Face V2 already registered. Use force=true to overwrite.',
            registeredAt: employee.faceRarayRegisteredAt.toISOString(),
          },
        },
        { status: 409 }
      )
    }

    // 7. Call Raray Vision API to register the face using Employee SN as Face ID
    const rvResult = await rarayRegisterFace({
      employeeId: employee.id,
      employeeSn: employee.employeeSn,
      employeeName: employee.name,
      imageBuffer,
      mimeType,
      force: forceOverwrite,
    })

    if (rvResult.status === 'error') {
      console.error('[face-registration-v2] Raray Vision error:', rvResult.message)
      return errorResponse(502, 'RARAY_VISION_ERROR', rvResult.message || 'Face recognition service error.')
    }

    // 8. Update employee record with Raray Vision registration info
    const registeredAt = new Date()
    const faceRarayId = employee.employeeSn?.trim() || `emp-${employee.id}`

    await db
      .update(employees)
      .set({
        faceRarayId,
        faceRarayRegisteredAt: registeredAt,
        // Also update v1 fields for backward compat display
        faceRegisteredAt: registeredAt,
      })
      .where(eq(employees.id, employee.id))

    revalidatePath('/mobile/attendance')
    revalidatePath('/mobile/attendance/face-v2')
    revalidatePath('/mobile/attendance/face-v2/register')

    return NextResponse.json(
      {
        success: true,
        registeredAt: registeredAt.toISOString(),
        faceRarayId,
        wasUpdate: rvResult.was_update ?? false,
        livenessScore: rvResult.liveness_score,
        message: rvResult.was_update ? 'Wajah berhasil diperbarui.' : 'Wajah berhasil terdaftar.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[face-registration-v2] Internal error:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred.')
  }
}
