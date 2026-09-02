import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { eq, and } from 'drizzle-orm'

export type AuthResult =
  | { authenticated: true; type: 'api-key' }
  | { authenticated: true; type: 'session'; employeeId: number; email: string }
  | { authenticated: false; status: 401 | 403; code: string; message: string }

/**
 * Dual auth for mobile face APIs:
 * 1. Check Bearer token first (API key for kiosks/devices)
 * 2. Fall back to Better Auth session cookie (for PWA browser)
 *
 * No dev mode bypass — always requires valid credentials.
 * For session auth, validates employeeId ownership.
 */
import { timingSafeEqual } from 'crypto'

export async function authenticateMobileRequest(
  request: NextRequest,
  requestEmployeeId?: number
): Promise<AuthResult> {
  // 1. Check Bearer token
  const authHeader = request.headers.get('authorization')
  const apiKey = process.env.MOBILE_API_KEY

  if (authHeader && apiKey) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim()

    const tokenBuf = Buffer.from(token)
    const keyBuf = Buffer.from(apiKey)
    if (tokenBuf.length === keyBuf.length && timingSafeEqual(tokenBuf, keyBuf)) {
      return { authenticated: true, type: 'api-key' }
    }
  }

  // 2. Attempt Better Auth session
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    })

    if (session?.user?.id) {
      // Lookup employee by authUserId FK (not email — employees.email has corp format)
      const [employee] = await db
        .select({ id: employees.id, email: employees.email })
        .from(employees)
        .where(
          and(
            eq(employees.authUserId, session.user.id),
            eq(employees.isActive, true)
          )
        )
        .limit(1)

      if (!employee) {
        return {
          authenticated: false,
          status: 403,
          code: 'FORBIDDEN',
          message: 'No active employee record found for this account.',
        }
      }

      // Ownership check
      if (requestEmployeeId !== undefined && requestEmployeeId !== employee.id) {
        return {
          authenticated: false,
          status: 403,
          code: 'EMPLOYEE_MISMATCH',
          message: 'Cannot access another employee record.',
        }
      }

      return {
        authenticated: true,
        type: 'session',
        employeeId: employee.id,
        email: employee.email,
      }
    }
  } catch {
    // Session check failed — fall through to unauthorized
  }

  // 3. Neither auth method succeeded
  return {
    authenticated: false,
    status: 401,
    code: 'UNAUTHORIZED',
    message: 'Missing or invalid authentication credentials.',
  }
}
