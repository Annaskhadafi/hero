import { randomUUID } from 'node:crypto'
import { and, eq, or, sql } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'

import { db } from '@/db'
import { account } from '@/db/schema/auth'

type CredentialAccount = {
  id: string
  userId: string
  accountId: string
  password: string | null
  updatedAt: Date
}

export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase()
}

export function normalizeEmployeeSn(employeeSn: string | null | undefined) {
  return (employeeSn ?? '').trim().replace(/^emp[-\s]*/i, '')
}

export function buildDefaultCredentialPassword(employeeSn: string | null | undefined) {
  return `Chitra#${normalizeEmployeeSn(employeeSn)}`
}

function credentialWhere(authUserId: string | null, accountIds: string[]) {
  const matches = accountIds.map(
    (accountId) => sql`lower(trim(${account.accountId})) = ${accountId}`
  )
  const ownerMatches = authUserId ? [eq(account.userId, authUserId)] : matches

  return and(eq(account.providerId, 'credential'), or(...ownerMatches))
}

function pickCanonicalCredential(rows: CredentialAccount[]) {
  return [...rows].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]
}

async function findCredentialRows(authUserId: string | null, accountIds: string[]) {
  if (!authUserId && accountIds.length === 0) return []

  return db
    .select({
      id: account.id,
      userId: account.userId,
      accountId: account.accountId,
      password: account.password,
      updatedAt: account.updatedAt,
    })
    .from(account)
    .where(credentialWhere(authUserId, accountIds))
}

export async function findCredentialAccount({
  authUserId,
  email,
}: {
  authUserId: string | null
  email: string | null | undefined
}) {
  const normalizedEmail = email ? normalizeAuthEmail(email) : ''
  const rows = await findCredentialRows(authUserId, normalizedEmail ? [normalizedEmail] : [])
  return pickCanonicalCredential(rows) ?? null
}

async function writeCanonicalCredential({
  authUserId,
  email,
  password,
  now,
  preserveExistingPassword,
}: {
  authUserId: string
  email: string
  password: string
  now: Date
  preserveExistingPassword: boolean
}) {
  const normalizedEmail = normalizeAuthEmail(email)

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${authUserId}))`)
    const rows = await tx
      .select({
        id: account.id,
        userId: account.userId,
        accountId: account.accountId,
        password: account.password,
        updatedAt: account.updatedAt,
      })
      .from(account)
      .where(credentialWhere(authUserId, [normalizedEmail]))

    const canonical = pickCanonicalCredential(rows)
    const passwordHash =
      preserveExistingPassword && canonical?.password
        ? canonical.password
        : await hashPassword(password)

    if (canonical) {
      await tx
        .update(account)
        .set({
          accountId: normalizedEmail,
          userId: authUserId,
          password: passwordHash,
          updatedAt: now,
        })
        .where(eq(account.id, canonical.id))

      const duplicateIds = rows.filter((row) => row.id !== canonical.id).map((row) => row.id)
      for (const duplicateId of duplicateIds) {
        await tx.delete(account).where(eq(account.id, duplicateId))
      }

      return {
        ...canonical,
        accountId: normalizedEmail,
        userId: authUserId,
        password: passwordHash,
      }
    }

    const created = {
      id: randomUUID(),
      userId: authUserId,
      accountId: normalizedEmail,
      password: passwordHash,
    }
    await tx.insert(account).values({
      ...created,
      providerId: 'credential',
      createdAt: now,
      updatedAt: now,
    })
    return created
  })
}

export async function ensureCredentialAccount({
  authUserId,
  email,
  employeeSn,
  now = new Date(),
}: {
  authUserId: string
  email: string
  employeeSn: string | null | undefined
  now?: Date
}) {
  return writeCanonicalCredential({
    authUserId,
    email,
    password: buildDefaultCredentialPassword(employeeSn),
    now,
    preserveExistingPassword: true,
  })
}

export async function upsertCredentialAccount({
  authUserId,
  email,
  password,
  now = new Date(),
}: {
  authUserId: string
  email: string
  password: string
  now?: Date
}) {
  return writeCanonicalCredential({
    authUserId,
    email,
    password,
    now,
    preserveExistingPassword: false,
  })
}

export async function updateCredentialEmailAccountId({
  authUserId,
  previousEmail,
  email,
  now = new Date(),
}: {
  authUserId: string
  previousEmail: string | null
  email: string
  now?: Date
}) {
  const normalizedEmail = normalizeAuthEmail(email)
  const accountIds = [previousEmail, email]
    .filter((value): value is string => Boolean(value))
    .map(normalizeAuthEmail)
    .filter((value, index, values) => values.indexOf(value) === index)

  return db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: account.id,
        userId: account.userId,
        accountId: account.accountId,
        password: account.password,
        updatedAt: account.updatedAt,
      })
      .from(account)
      .where(credentialWhere(authUserId, accountIds))

    const canonical = pickCanonicalCredential(rows)
    if (!canonical) return null

    await tx
      .update(account)
      .set({ accountId: normalizedEmail, userId: authUserId, updatedAt: now })
      .where(eq(account.id, canonical.id))

    for (const duplicate of rows.filter((row) => row.id !== canonical.id)) {
      await tx.delete(account).where(eq(account.id, duplicate.id))
    }

    return { ...canonical, accountId: normalizedEmail, userId: authUserId }
  })
}
