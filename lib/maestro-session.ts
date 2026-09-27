import { randomUUID } from 'node:crypto'
import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { and, eq, gt, sql } from 'drizzle-orm'
import { verifyPassword } from 'better-auth/crypto'

import { db } from '@/db'
import {
  maestroAuditLogs,
  maestroCustomerSessions,
  maestroCustomerUsers,
} from '@/db/schema/maestro'
import { customers } from '@/db/schema/customers'
import { getMaestroAccessContext, type MaestroAccessContext } from '@/lib/maestro-access'

export const MAESTRO_SESSION_COOKIE = 'maestro_session_token'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000

export type MaestroSessionUser = {
  id: string
  email: string
  name: string
  image: string | null
}

export type MaestroSessionCustomer = {
  id: number
  name: string
  customerCode: string | null
}

export type MaestroSessionData = {
  session: {
    id: string
    token: string
    expiresAt: Date
  }
  user: MaestroSessionUser
  customer: MaestroSessionCustomer
  access: MaestroAccessContext
}

export async function verifyMaestroCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !password) {
    return { success: false as const, error: 'Email dan password wajib diisi.' }
  }

  const [user] = await db
    .select({
      id: maestroCustomerUsers.id,
      email: maestroCustomerUsers.email,
      name: maestroCustomerUsers.name,
      passwordHash: maestroCustomerUsers.passwordHash,
      isActive: maestroCustomerUsers.isActive,
      image: maestroCustomerUsers.image,
    })
    .from(maestroCustomerUsers)
    .where(sql`lower(${maestroCustomerUsers.email}) = ${normalizedEmail}`)
    .limit(1)

  if (!user || !user.isActive || !user.passwordHash) {
    return { success: false as const, error: 'Email atau password salah.' }
  }

  const isValidPassword = await verifyPassword({
    hash: user.passwordHash,
    password,
  })

  if (!isValidPassword) {
    return { success: false as const, error: 'Email atau password salah.' }
  }

  return {
    success: true as const,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    },
  }
}

export async function createMaestroSession(
  userId: string,
  options?: {
    rememberMe?: boolean
    ipAddress?: string
    userAgent?: string
    customerId?: number
  },
) {
  const duration = options?.rememberMe ? THIRTY_DAYS_MS : ONE_DAY_MS
  const expiresAt = new Date(Date.now() + duration)
  const token = `${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`
  const sessionId = randomUUID()

  await db.insert(maestroCustomerSessions).values({
    id: sessionId,
    token,
    userId,
    expiresAt,
    ipAddress: options?.ipAddress ?? null,
    userAgent: options?.userAgent ?? null,
  })

  const cookieStore = await cookies()
  cookieStore.set(MAESTRO_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })

  // Log audit
  try {
    await db.insert(maestroAuditLogs).values({
      actorType: 'customer',
      actorUserId: userId,
      action: 'customer_user.login',
      entityType: 'maestro_session',
      entityId: sessionId,
      customerId: options?.customerId ?? null,
      metadata: {
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        rememberMe: options?.rememberMe ?? false,
      },
    })
  } catch (err) {
    console.error('[MAESTRO] Failed to write login audit log:', err)
  }

  return { sessionId, token, expiresAt }
}

export const getMaestroServerSession = cache(async function getMaestroServerSession(
  customerId?: number,
): Promise<MaestroSessionData | null> {
  try {
    let token: string | undefined
    try {
      const cookieStore = await cookies()
      token = cookieStore.get(MAESTRO_SESSION_COOKIE)?.value
    } catch {
      // Outside Next.js request context (e.g. background job/script)
      return null
    }

    if (!token) return null

    const [row] = await db
      .select({
        sessionId: maestroCustomerSessions.id,
        token: maestroCustomerSessions.token,
        expiresAt: maestroCustomerSessions.expiresAt,
        userId: maestroCustomerUsers.id,
        email: maestroCustomerUsers.email,
        name: maestroCustomerUsers.name,
        image: maestroCustomerUsers.image,
      })
      .from(maestroCustomerSessions)
      .innerJoin(maestroCustomerUsers, eq(maestroCustomerUsers.id, maestroCustomerSessions.userId))
      .where(
        and(
          eq(maestroCustomerSessions.token, token),
          gt(maestroCustomerSessions.expiresAt, new Date()),
          eq(maestroCustomerUsers.isActive, true),
        ),
      )
      .limit(1)

    if (!row) return null

    const access = await getMaestroAccessContext(row.userId, customerId)

    const [customerRow] = await db
      .select({
        id: customers.id,
        name: customers.name,
        customerCode: customers.customerCode,
      })
      .from(customers)
      .where(eq(customers.id, access.customerId))
      .limit(1)

    if (!customerRow) return null

    return {
      session: {
        id: row.sessionId,
        token: row.token,
        expiresAt: row.expiresAt,
      },
      user: {
        id: row.userId,
        email: row.email,
        name: row.name,
        image: row.image,
      },
      customer: customerRow,
      access,
    }
  } catch (err) {
    console.error('[MAESTRO] Session retrieval failed:', err)
    return null
  }
})

export async function destroyMaestroSession() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(MAESTRO_SESSION_COOKIE)?.value

    if (token) {
      const [session] = await db
        .select({ id: maestroCustomerSessions.id, userId: maestroCustomerSessions.userId })
        .from(maestroCustomerSessions)
        .where(eq(maestroCustomerSessions.token, token))
        .limit(1)

      if (session) {
        await db.delete(maestroCustomerSessions).where(eq(maestroCustomerSessions.id, session.id))

        await db.insert(maestroAuditLogs).values({
          actorType: 'customer',
          actorUserId: session.userId,
          action: 'customer_user.logout',
          entityType: 'maestro_session',
          entityId: session.id,
        })
      }
    }

    cookieStore.delete(MAESTRO_SESSION_COOKIE)
  } catch (err) {
    console.error('[MAESTRO] Logout error:', err)
  }
}
