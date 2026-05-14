import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { validateEmbedding } from '@/lib/face-recognition/embedding-validator'
import { authenticateMobileRequest } from '@/lib/mobile-auth'

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

    // 2. Validate required fields
    if (!body || typeof body !== 'object') {
      return errorResponse(400, 'VALIDATION_ERROR', 'Request body must be a JSON object.')
    }

    const { employeeId, embedding } = body as Record<string, unknown>

    if (employeeId === undefined || employeeId === null) {
      return errorResponse(400, 'VALIDATION_ERROR', 'employeeId is required.', 'employeeId')
    }

    if (typeof employeeId !== 'number' || !Number.isInteger(employeeId) || employeeId <= 0) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'employeeId must be a positive integer.',
        'employeeId'
      )
    }

    // 3. Authentication (after parsing employeeId)
    const authResult = await authenticateMobileRequest(request, employeeId as number)
    if (!authResult.authenticated) {
      return errorResponse(authResult.status, authResult.code, authResult.message)
    }

    if (embedding === undefined || embedding === null) {
      return errorResponse(400, 'VALIDATION_ERROR', 'embedding is required.', 'embedding')
    }

    // 4. Validate embedding
    const validationResult = validateEmbedding(embedding)
    if (!validationResult.valid) {
      return errorResponse(400, 'INVALID_EMBEDDING', validationResult.error!, 'embedding')
    }

    // 5. Look up employee by ID, check isActive
    const employeeResults = await db
      .select({
        id: employees.id,
        isActive: employees.isActive,
        faceRegisteredAt: employees.faceRegisteredAt,
      })
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

    // 5b. Check existing registration — 409 if already registered without force
    const { force } = body as Record<string, unknown>
    if (employeeResults[0].faceRegisteredAt && force !== true) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ALREADY_REGISTERED',
            message: 'Face already registered. Use force=true to overwrite.',
            faceRegisteredAt: employeeResults[0].faceRegisteredAt.toISOString(),
          },
        },
        { status: 409 }
      )
    }

    // 6. Store embedding (upsert — overwrite if already exists)
    const registeredAt = new Date()

    await db
      .update(employees)
      .set({
        faceEmbedding: embedding,
        faceRegisteredAt: registeredAt,
      })
      .where(eq(employees.id, employeeId))

    revalidatePath('/mobile/attendance')
    revalidatePath('/mobile/attendance/face')

    // 7. Return success
    return NextResponse.json(
      {
        success: true,
        registeredAt: registeredAt.toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[face-registration] Internal error:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred.')
  }
}
