import { and, eq, isNotNull } from 'drizzle-orm'

import { db } from '@/db'
import { account, session } from '@/db/schema/auth'
import { employees } from '@/db/schema/hero'
import { normalizeAuthEmail, upsertCredentialAccount } from '@/lib/auth-credentials'

async function main() {
  const rows = await db
    .select({
      id: employees.id,
      authUserId: employees.authUserId,
      email: employees.email,
      employeeSn: employees.employeeSn,
      isActive: employees.isActive,
    })
    .from(employees)
    .where(and(eq(employees.isActive, true), isNotNull(employees.authUserId)))

  let updated = 0
  let skipped = 0

  for (const employee of rows) {
    const authUserId = employee.authUserId
    const email = normalizeAuthEmail(employee.email || '')
    const employeeSn = employee.employeeSn?.trim() || ''

    if (!authUserId || !email || !employeeSn) {
      skipped++
      continue
    }

    await upsertCredentialAccount({
      authUserId,
      email,
      password: `Chitra#${employeeSn.replace(/^emp[-\s]*/i, '')}`,
    })
    await db.delete(session).where(eq(session.userId, authUserId))
    updated++
  }

  const credentialRows = await db
    .select({ userId: account.userId })
    .from(account)
    .where(eq(account.providerId, 'credential'))

  console.log(
    JSON.stringify({
      activeEmployees: rows.length,
      updated,
      skipped,
      credentialRows: credentialRows.length,
    })
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
